import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getSubscriptionStatus, getProfile, getAppSettings } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Download, PlayCircle, Clock, AlertTriangle, CreditCard, Check, Gift, KeyRound, Image as ImageIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { getStoredLanguage } from "@/lib/language";
import { createPaymentLink } from '@/lib/payments.functions';
import { startTrial } from '@/lib/trial.functions';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Maximize2 } from "lucide-react";
import { getSignedVideoUrl } from "@/lib/video.functions";


export const Route = createFileRoute('/_authenticated/dashboard')({
  component: Dashboard,
});

function Dashboard() {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isWaitingPayment, setIsWaitingPayment] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [playingVideo, setPlayingVideo] = useState<{ title: string; url: string; isMp4: boolean } | null>(null);
  const [signedVideoUrl, setSignedVideoUrl] = useState<string | null>(null);
  const [loadingVideo, setLoadingVideo] = useState(false);


  // Auto-login logic for extension redirection
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const params = new URLSearchParams(window.location.search);
    const email = params.get('email');
    const token = params.get('token');

    if (email && token) {
      const performAutoLogin = async () => {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password: token });
          if (!error && data.session) {
            toast.success("Acesso automático realizado!");
            // Remove params from URL
            const url = new URL(window.location.href);
            url.searchParams.delete('email');
            url.searchParams.delete('token');
            navigate({ to: url.pathname + url.search, replace: true });
          }
        } catch (err) {
          console.error("Auto-login error:", err);
        }
      };
      performAutoLogin();
    }
  }, [navigate]);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
  });

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => getProfile(user!.id),
    enabled: !!user
  });

  // Idioma vem do perfil (definido no cadastro). Enquanto carrega, usa a escolha salva no navegador.
  const lang: 'pt' | 'en' = ((profile as any)?.language as 'pt' | 'en' | undefined) ?? getStoredLanguage() ?? 'pt';
  const isEn = lang === 'en';

  const { data: sub } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: () => getSubscriptionStatus(user!.id),
    enabled: !!user,
    // O refetchInterval só deve ser agressivo se estivermos esperando pagamento,
    // caso contrário o padrão de 5s ou manual é suficiente.
    refetchInterval: isWaitingPayment ? 5000 : 30000 
  });

  const { data: settings } = useQuery({
    queryKey: ['app-settings'],
    queryFn: getAppSettings
  });

  // Ativa o teste de 20 minutos (uma unica vez por conta) e revela as credenciais.
  const trialMutation = useMutation({
    mutationFn: () => startTrial({ data: undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      toast.success(isEn ? 'Trial activated! You have 20 minutes.' : 'Teste ativado! Você tem 20 minutos.');
    },
    onError: (error: any) => {
      const alreadyUsed = String(error?.message ?? '').includes('TRIAL_ALREADY_USED');
      toast.error(
        alreadyUsed
          ? (isEn ? 'This account already used the free test.' : 'Esta conta já usou o teste gratuito.')
          : (isEn ? 'Could not activate the test. Try again.' : 'Não foi possível ativar o teste. Tente novamente.')
      );
    }
  });

  const paymentMutation = useMutation({
    mutationFn: (data: any) => createPaymentLink({ data }),
    onSuccess: (data: any) => {
      if (data?.url) {
        window.open(data.url, '_blank');
        setIsWaitingPayment(true);
        toast.success(isEn ? "Payment link opened in new tab!" : "Link de pagamento aberto em nova aba!");
      } else {

        toast.error(isEn ? "Error generating payment. Link not found." : "Erro ao gerar pagamento. Link não encontrado.");
      }
    },
    onError: (error: any) => {
      console.error("Detailed Payment Error:", {
        message: error?.message,
        stack: error?.stack,
        error
      });
      const message = error?.message || "";
      toast.error(
        isEn 
          ? `Error generating payment: ${message || "Internal Server Error"}` 
          : `Erro ao gerar pagamento: ${message || "Erro Interno no Servidor"}`
      );
    }
  });

  useEffect(() => {
    let timer: any;
    if (sub?.type === 'trial' && sub.status === 'active' && sub.expires_at) {
      timer = setInterval(() => {
        const now = new Date().getTime();
        const expiry = new Date(sub.expires_at).getTime();
        const diff = expiry - now;

        if (diff <= 0) {
          setTimeLeft('Expirado');
          if (timer) clearInterval(timer);
        } else {
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          setTimeLeft(`${minutes}m ${seconds}s`);
        }
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [sub?.type, sub?.status, sub?.expires_at]);

  useEffect(() => {
    const pendingPayment = sessionStorage.getItem('lovablack_pending_payment');
    if (pendingPayment && profile) {
      const plan = JSON.parse(pendingPayment);
      handlePayment(plan);
      sessionStorage.removeItem('lovablack_pending_payment');
    }
  }, [profile]);

  const isActive = !!(sub && sub.status === 'active' && !sub.isExpired);
  const trialNeverUsed = sub === null;
  const accessPassword = (profile as any)?.access_password as string | undefined;

  // Verificação inicial: se o usuário já é ativo ao carregar, garante que não fique preso no modal
  useEffect(() => {
    if (isActive && isWaitingPayment) {
      setIsWaitingPayment(false);
    }
  }, [isActive, isWaitingPayment]);

  // Polling para verificar se o pagamento foi confirmado via webhook
  useEffect(() => {
    let interval: any = null;

    if (isWaitingPayment && !isActive && user?.id) {
      interval = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: ['subscription', user.id] });
      }, 5000);
    }

    if (isWaitingPayment && isActive) {
      setIsWaitingPayment(false);
      setTimeout(() => {
        navigate({ to: '/thanks', replace: true });
      }, 100);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isWaitingPayment, isActive, user?.id, queryClient, navigate]);

  // IMPORTANTE: o early return fica DEPOIS de todos os hooks,
  // caso contrário o React renderiza um número diferente de hooks entre renders.
  if (!user) return null;

  const plans = isEn ? [

    { key: "monthly", name: "Monthly", price: "$ 47", days: 30 },
    { key: "semiannual", name: "6 Months", price: "$ 147", days: 180 },
    { key: "annual", name: "Annual", price: "$ 397", days: 365 },
  ] : [
    { key: "monthly", name: "Mensal", price: "R$ 47", days: 30 },
    { key: "semiannual", name: "Semestral", price: "R$ 147", days: 180 },
    { key: "annual", name: "Anual", price: "R$ 397", days: 365 },
  ];

  const handlePayment = (plan: any) => {
    const origin = window.location.origin;
    setSelectedPlan(plan);
    paymentMutation.mutate({
      planKey: plan.key,
      customerName: profile?.full_name || user.email || 'Cliente',
      customerEmail: user.email || '',
      customerPhone: profile?.whatsapp || '',
      redirectUrl: `${origin}/thanks`,
      webhookUrl: `${origin}/api/public/webhook-${isEn ? 'stripe' : 'infinitepay'}`,
      currency: isEn ? 'USD' : 'BRL'
    });
  };


  const handleVideoClick = async (tut: any) => {
    const isMp4 = tut.url && tut.url.includes('.mp4');
    setPlayingVideo({ title: tut.title, url: tut.url, isMp4 });
    
    if (isMp4) {
      setLoadingVideo(true);
      try {
        const url = new URL(tut.url);
        const path = url.pathname.split('/').pop() || ''; // Extrai apenas o nome do arquivo
        const { url: signedUrl } = await getSignedVideoUrl({ data: { path } });
        setSignedVideoUrl(signedUrl);
      } catch (err) {
        console.error("Error loading video:", err);
        toast.error(isEn ? "Error loading video player" : "Erro ao carregar o player de vídeo");
      } finally {
        setLoadingVideo(false);
      }
    } else {
      setSignedVideoUrl(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F1EB] p-4 md:p-8 pb-20">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#1A1B1A]">
              {isEn ? `Welcome, ${profile?.full_name || user.email}` : `Bem-vindo, ${profile?.full_name || user.email}`}
            </h1>
            <p className="text-neutral-500">{isEn ? 'LOVABLACK Members Area' : 'Área de Membros LOVABLACK'}</p>
          </div>
          <Button variant="outline" onClick={() => supabase.auth.signOut()}>
            {isEn ? 'Logout' : 'Sair'}
          </Button>
        </header>

        {trialNeverUsed && (
          <Card className="border-[#1A1B1A]/10 bg-white p-6 md:p-8 text-center space-y-4">
            <Gift className="w-12 h-12 text-[#DC0D0D] mx-auto" />
            <h2 className="text-2xl font-bold text-[#1A1B1A]">
              {isEn ? 'Activate your 20-minute free test' : 'Ative seu teste grátis de 20 minutos'}
            </h2>
            <p className="text-neutral-500 max-w-xl mx-auto">
              {isEn
                ? 'Click below to release your access credentials, the download and the tutorials for 20 minutes.'
                : 'Clique abaixo para liberar seus dados de acesso, o download e os tutoriais por 20 minutos.'}
            </p>
            <Button
              className="h-14 px-8 text-lg font-bold bg-[#DC0D0D] hover:bg-[#1A1B1A] transition-colors gap-2"
              onClick={() => trialMutation.mutate()}
              disabled={trialMutation.isPending}
            >
              <Clock className="w-5 h-5" />
              {trialMutation.isPending
                ? (isEn ? 'ACTIVATING...' : 'ATIVANDO...')
                : (isEn ? 'GENERATE 20-MIN TEST' : 'GERAR TESTE DE 20 MIN')}
            </Button>
          </Card>
        )}

        {isActive ? (
          <div className="space-y-8">
            <Card className="bg-white border-neutral-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-[#DC0D0D]" />
                  {isEn ? 'Access the extension with' : 'Acesse com'}
                </CardTitle>
                <CardDescription>
                  {isEn ? 'Use these credentials inside the LOVABLACK extension.' : 'Use estes dados dentro da extensão LOVABLACK.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-[#F7F1EB] rounded-2xl">
                  <p className="text-xs font-bold uppercase text-neutral-500">{isEn ? 'User' : 'E-mail'}</p>
                  <p className="font-mono font-bold text-[#1A1B1A] break-all">{user.email}</p>
                </div>
                <div className="p-4 bg-[#F7F1EB] rounded-2xl">
                  <p className="text-xs font-bold uppercase text-neutral-500">{isEn ? 'Password' : 'Senha'}</p>
                  <p className="font-mono font-bold text-[#1A1B1A] break-all">
                    {accessPassword || (isEn ? 'Use your signup password' : 'Use a sua senha de cadastro')}
                  </p>
                </div>
                <div className="p-4 bg-[#F7F1EB] rounded-2xl">
                  <p className="text-xs font-bold uppercase text-neutral-500">
                    {isEn ? 'Time available' : 'Tempo disponível'}
                  </p>
                  <p className="text-2xl font-black text-[#DC0D0D]">
                    {sub?.type === 'trial'
                      ? (timeLeft || '20m 00s')
                      : new Date(sub!.expires_at).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="bg-white border-neutral-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-[#1A1B1A] text-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-2xl font-bold">Extensão LOVABLACK</CardTitle>
                      <CardDescription className="text-neutral-400">{isEn ? 'Click below to download' : 'Clique abaixo para baixar'}</CardDescription>
                    </div>
                    <Badge className="bg-[#DC0D0D]">{isEn ? 'ACTIVE' : 'ATIVO'}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {sub?.type === 'trial' && (
                    <div className="p-4 bg-[#F7F1EB] rounded-2xl flex items-center justify-between">
                      <span className="text-sm font-bold text-[#4F4E4D]">{isEn ? 'Time Left:' : 'Tempo Restante:'}</span>
                      <span className="text-2xl font-black text-[#DC0D0D]">{timeLeft}</span>
                    </div>
                  )}
                  <Button
                    className="w-full h-16 text-lg font-bold bg-[#1A1B1A] gap-3"
                    onClick={async () => {
                      if (!settings?.['download_link']) return;
                      
                      try {
                        // Tenta baixar via signed URL se o link público falhar ou for privado
                        const url = new URL(settings['download_link']);
                        const path = url.pathname.split('/').pop() || ''; // Extrai apenas o nome do arquivo
                        
                        if (path) {
                          const { data, error } = await supabase.storage
                            .from('assets')
                            .createSignedUrl(path, 60, { download: true });
                          
                          if (data?.signedUrl) {
                            window.location.assign(data.signedUrl);
                            return;
                          }
                        }
                      } catch (e) {
                        console.error("Signed URL fail, falling back to public link", e);
                      }
                      
                      // Fallback para o link direto salvo
                      window.open(settings['download_link'], '_blank');
                    }}
                  >
                    <Download className="w-6 h-6" /> {isEn ? 'DOWNLOAD EXTENSION (.ZIP)' : 'BAIXAR EXTENSÃO (.ZIP)'}
                  </Button>
                  <p className="text-xs text-center text-neutral-400">
                    {isEn ? 'Installation via browser developer mode.' : 'Instalação via modo desenvolvedor do navegador.'}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white border-neutral-200 shadow-sm overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold">{isEn ? 'Video Tutorials' : 'Vídeos Tutoriais'}</CardTitle>
                  <CardDescription>{isEn ? 'Follow the step-by-step video' : 'Siga o passo a passo em vídeo'}</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(settings?.['tutorials'] || []).map((tut: any, index: number) => (
                      <div 
                        key={index} 
                        className="group cursor-pointer space-y-2"
                        onClick={() => handleVideoClick(tut)}
                      >
                        <div className="aspect-video bg-neutral-900 flex items-center justify-center rounded-xl overflow-hidden border relative">
                          {tut.thumbnail ? (
                            <img 
                              src={tut.thumbnail} 
                              alt={tut.title} 
                              className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                            />
                          ) : (
                            <div className="absolute inset-0 bg-neutral-100 flex items-center justify-center text-neutral-400">
                              <ImageIcon className="w-8 h-8 opacity-20" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <PlayCircle className="w-12 h-12 text-white" />
                          </div>
                          <div className="absolute bottom-2 right-2 bg-black/60 p-1 rounded-md">
                            <Maximize2 className="w-4 h-4 text-white opacity-80" />
                          </div>
                        </div>
                        <h3 className="font-bold text-sm truncate flex items-center gap-2">
                          <PlayCircle className="w-3 h-3 text-[#DC0D0D]" /> 
                          {tut.title}
                        </h3>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Dialog open={!!playingVideo} onOpenChange={(open) => !open && setPlayingVideo(null)}>
              <DialogContent className="max-w-5xl w-[95vw] p-0 bg-black overflow-hidden border-none shadow-2xl">
                <DialogHeader className="p-4 bg-white/5 backdrop-blur-md absolute top-0 w-full z-20 opacity-0 hover:opacity-100 transition-opacity">
                  <DialogTitle className="text-white text-lg font-bold">{playingVideo?.title}</DialogTitle>
                </DialogHeader>
                <div className="aspect-video w-full flex items-center justify-center bg-black">
                  {loadingVideo ? (
                    <Loader2 className="w-12 h-12 text-white animate-spin" />
                  ) : playingVideo?.url ? (
                    playingVideo.isMp4 ? (
                      <video 
                        src={signedVideoUrl || playingVideo.url} 
                        className="w-full h-full" 
                        controls 
                        autoPlay
                      />
                    ) : (
                      <iframe
                        src={playingVideo.url.includes('youtube.com') || playingVideo.url.includes('youtu.be') 
                          ? playingVideo.url.replace('watch?v=', 'embed/').split('&')[0] 
                          : playingVideo.url}
                        className="w-full h-full"
                        allowFullScreen
                        allow="autoplay; encrypted-media"
                        title={playingVideo.title}
                      />
                    )
                  ) : (
                    <div className="text-white flex flex-col items-center gap-4">
                      <AlertTriangle className="w-12 h-12 text-yellow-500" />
                      <p>{isEn ? "Video link missing" : "Link do vídeo não encontrado"}</p>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          // O aviso de expirado so aparece depois que o teste de 20 min foi usado.
          !trialNeverUsed && (
            <Card className="border-red-200 bg-red-50 p-6 text-center">
              <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-red-900">
                {isEn ? 'Your access has expired or is not active' : 'Seu acesso expirou ou não está ativo'}
              </h2>
              <p className="text-red-700 mb-6">
                {isEn ? 'Choose one of the plans below to continue using infinite credits.' : 'Escolha um dos planos abaixo para continuar usando créditos infinitos.'}
              </p>
            </Card>
          )
        )}

        {(!isActive || sub?.type !== 'annual') && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-[#1A1B1A] flex items-center gap-2">
              <CreditCard className="text-[#DC0D0D]" /> {isEn ? 'Unlock Unlimited Access' : 'Desbloquear Acesso Ilimitado'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <Card key={plan.name} className="bg-white border-neutral-200 relative overflow-hidden group hover:border-[#DC0D0D] transition-colors">
                  <CardHeader>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription>{plan.days} {isEn ? 'days of access' : 'dias de acesso'}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-black text-[#1A1B1A]">{plan.price}</div>
                    <ul className="mt-4 space-y-2">
                      <li className="flex items-center gap-2 text-sm text-neutral-600"><Check className="w-4 h-4 text-green-500" /> {isEn ? 'Infinite Credits' : 'Créditos Infinitos'}</li>
                      <li className="flex items-center gap-2 text-sm text-neutral-600"><Check className="w-4 h-4 text-green-500" /> {isEn ? 'Free Hosting' : 'Hospedagem Grátis'}</li>
                      <li className="flex items-center gap-2 text-sm text-neutral-600"><Check className="w-4 h-4 text-green-500" /> {isEn ? 'VIP Support' : 'Suporte VIP'}</li>
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className="w-full bg-[#1A1B1A] hover:bg-[#DC0D0D] transition-colors font-bold"
                      onClick={() => handlePayment(plan)}
                      disabled={paymentMutation.isPending}
                    >
                      {paymentMutation.isPending ? (isEn ? 'GENERATING...' : 'GERANDO...') : (isEn ? 'SECURE NOW' : 'GARANTIR AGORA')}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        )}

        <Dialog open={isWaitingPayment} onOpenChange={setIsWaitingPayment}>
          <DialogContent className="sm:max-w-md bg-white text-center p-8">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold flex flex-col items-center gap-4">
                <div className="relative">
                  <Loader2 className="w-20 h-20 text-[#DC0D0D] animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <CreditCard className="w-8 h-8 text-[#1A1B1A]" />
                  </div>
                </div>
                {isEn ? 'CARREGANDO...' : 'TELA CARREGANDO...'}
              </DialogTitle>
              <DialogDescription className="text-xl font-bold pt-4 text-[#1A1B1A]">
                {isEn 
                  ? 'Awaiting Payment' 
                  : 'Aguardando Pagamento'}
              </DialogDescription>
              <DialogDescription className="text-base pt-2">
                {isEn 
                  ? `We are confirming your ${selectedPlan?.name || ''} plan payment...` 
                  : `Estamos confirmando o pagamento do seu plano ${selectedPlan?.name || ''}...`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <p className="text-sm text-neutral-500">
                {isEn 
                  ? 'Payment was opened in a new tab. After completion, this page will update automatically.' 
                  : 'O pagamento foi aberto em uma nova aba. Após a conclusão, esta página será atualizada automaticamente.'}
              </p>
              <Badge variant="outline" className="px-4 py-2 border-[#DC0D0D] text-[#DC0D0D] animate-pulse">
                {isEn ? 'Real-time Verification' : 'Verificação em Tempo Real'}
              </Badge>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

