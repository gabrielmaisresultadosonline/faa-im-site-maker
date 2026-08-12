import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getSubscriptionStatus, getProfile, getAppSettings } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Download, PlayCircle, Clock, AlertTriangle, CreditCard, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { createPaymentLink } from '@/lib/payments.functions';
import { toast } from 'sonner';

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: Dashboard,
});

function Dashboard() {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const navigate = useNavigate();

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

  const lang = (profile as any)?.language || 'pt';
  const isEn = lang === 'en';

  const { data: sub } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: () => getSubscriptionStatus(user!.id),
    enabled: !!user,
    refetchInterval: 5000 
  });

  const { data: settings } = useQuery({
    queryKey: ['app-settings'],
    queryFn: getAppSettings
  });

  const paymentMutation = useMutation({
    mutationFn: (data: any) => createPaymentLink({ data }),
    onSuccess: (data: any) => {
      window.open(data.url, '_blank');
      toast.success(isEn ? "Payment link generated! Finish the purchase to unlock access." : "Link de pagamento gerado! Finalize a compra para liberar seu acesso.");
    },
    onError: () => {
      toast.error(isEn ? "Error generating payment. Try again." : "Erro ao gerar pagamento. Tente novamente.");
    }
  });

  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (sub?.type === 'trial' && sub.status === 'active') {
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
  }, [sub]);

  useEffect(() => {
    const pendingPayment = sessionStorage.getItem('lovablack_pending_payment');
    if (pendingPayment && profile) {
      const plan = JSON.parse(pendingPayment);
      handlePayment(plan);
      sessionStorage.removeItem('lovablack_pending_payment');
    }
  }, [profile]);

  if (!user) return null;

  const isActive = sub && sub.status === 'active' && !sub.isExpired;

  const plans = isEn ? [
    { name: "Monthly", price: "$ 47", cents: 4700, days: 30 },
    { name: "6 Months", price: "$ 147", cents: 14700, days: 180 },
    { name: "Annual", price: "$ 397", cents: 39700, days: 365 },
  ] : [
    { name: "Mensal", price: "R$ 47", cents: 4700, days: 30 },
    { name: "Semestral", price: "R$ 147", cents: 14700, days: 180 },
    { name: "Anual", price: "R$ 397", cents: 39700, days: 365 },
  ];

  const handlePayment = (plan: any) => {
    const origin = window.location.origin;
    paymentMutation.mutate({
      planName: plan.name,
      priceCents: plan.cents,
      planDurationDays: plan.days,
      customerName: profile?.full_name || user.email || 'Cliente',
      customerEmail: user.email || '',
      customerPhone: profile?.whatsapp || '',
      redirectUrl: `${origin}/thanks`,
      webhookUrl: `${origin}/api/public/webhook-infinitepay`,
      currency: isEn ? 'USD' : 'BRL'
    });
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

        {isActive ? (
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
                    <span className="text-2xl font-black text-[#DC0D0D]">{timeLeft.replace('m', 'm').replace('s', 's')}</span>
                  </div>
                )}
                <Button 
                  className="w-full h-16 text-lg font-bold bg-[#1A1B1A] gap-3"
                  onClick={() => window.open(settings?.['download_link'] || '#', '_blank')}
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
              <CardContent className="p-0 space-y-4">
                {(settings?.['tutorials'] || []).map((tut: any, index: number) => (
                  <div key={index} className="space-y-2 p-4">
                    <h3 className="font-bold flex items-center gap-2"><PlayCircle className="w-4 h-4" /> {tut.title}</h3>
                    <div className="aspect-video bg-neutral-900 flex items-center justify-center rounded-xl overflow-hidden border">
                      {tut.url ? (
                        <iframe 
                          src={tut.url} 
                          className="w-full h-full" 
                          allowFullScreen 
                          title={tut.title}
                        />
                      ) : (
                        <PlayCircle className="w-16 h-16 text-white/20" />
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

          </div>
        ) : (
          <Card className="border-red-200 bg-red-50 p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-900">
              {isEn ? 'Your access has expired or is not active' : 'Seu acesso expirou ou não está ativo'}
            </h2>
            <p className="text-red-700 mb-6">
              {isEn ? 'Choose one of the plans below to continue using infinite credits.' : 'Escolha um dos planos abaixo para continuar usando créditos infinitos.'}
            </p>
          </Card>
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
      </div>
    </div>
  );
}
