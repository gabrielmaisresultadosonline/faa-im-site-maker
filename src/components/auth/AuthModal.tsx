import React, { useState, useEffect } from 'react';
import { postgresClient as supabase } from '@/lib/postgres-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useNavigate } from '@tanstack/react-router';
import { setStoredLanguage } from '@/lib/language';
import { trackLeadEvent } from '@/lib/facebook-pixel.functions';
import { useServerFn } from '@tanstack/react-start';
import { checkRegistrationIP } from '@/lib/auth-ip.functions';

interface AuthModalProps {
  initialMode?: 'login' | 'signup';
  isTrial?: boolean;
  lang?: 'pt' | 'en';
  onSuccessRedirect?: {
    /** Apenas a chave do plano; preco/duracao sao resolvidos no servidor. */
    key: string | null;
  } | undefined;
}


export function AuthModal({ initialMode = 'login', isTrial = false, lang = 'pt', onSuccessRedirect }: AuthModalProps) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const navigate = useNavigate();
  const trackLead = useServerFn(trackLeadEvent);
  const checkIP = useServerFn(checkRegistrationIP);

  // Guarda o idioma da pagina de origem para o dashboard ja abrir no idioma certo
  // (e o pagamento sair na moeda certa) mesmo antes do perfil carregar.
  useEffect(() => {
    setStoredLanguage(lang);
  }, [lang]);

  useEffect(() => {
      const { data: { subscription } } = supabase.auth.onAuthStateChange();
    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Idioma do cadastro manda: o dashboard abre no idioma escolhido no signup.
      const userLang: 'pt' | 'en' = data.user?.language === 'en' ? 'en' : 'pt';
      setStoredLanguage(userLang);

      toast.success(userLang === 'pt' ? 'Login realizado com sucesso!' : 'Login successful!');
      
      if (data.session?.role === 'admin') {
        window.location.assign('/admin/dashboard');
      } else {
        window.location.assign('/dashboard');
      }
    } catch (error: any) {
      toast.error(error.message || (lang === 'pt' ? 'Erro ao fazer login' : 'Login error'));
    } finally {
      setLoading(false);
    }
  };


  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. IP Block Check
      let ipStatus: any = { blocked: false, ip: '', message: '' };
      try {
        ipStatus = await checkIP();
      } catch (ipErr) {
        console.error("IP Check failed, proceeding anyway:", ipErr);
      }

      if (ipStatus.blocked) {
        toast.error(ipStatus.message || (lang === 'pt' ? 'Acesso bloqueado por múltiplas contas.' : 'Access blocked for multiple accounts.'), {
          duration: 6000
        });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            whatsapp: whatsapp,
            is_trial: isTrial ? 'true' : 'false',
            language: lang,
            plain_password: password,
            registration_ip: ipStatus.ip
          }
        }
      });
      if (error) throw error;
      
      // Track Lead event on Facebook
      try {
        await trackLead({
          data: {
            email,
            ip: '', // Server-side will ideally handle this or we can try to pass it
            userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : ''
          }
        });
        // Also trigger client-side pixel lead event
        if (typeof (window as any).fbq === 'function') {
          (window as any).fbq('track', 'Lead');
        }
      } catch (trackError) {
        console.error("Facebook tracking failed:", trackError);
      }
      
      if (data?.session) {
        toast.success(lang === 'pt' ? 'Cadastro realizado com sucesso!' : 'Registration successful!');
        const isAdmin = (data.session.role as 'admin' | 'user') === 'admin';
        
        // Pequeno delay para garantir persistência da sessão
        setTimeout(() => {
          window.location.assign(isAdmin ? '/admin/dashboard' : '/dashboard');
        }, 500);
      } else {
        // Agora com auto_confirm_email: true, isso raramente deve acontecer se o Supabase responder com a sessão.
        // Se ainda assim cair aqui, mostramos uma mensagem de sucesso direto.
        toast.success(lang === 'pt' ? 'Cadastro realizado com sucesso!' : 'Registration successful!');
        setTimeout(() => {
          window.location.assign('/dashboard');
        }, 1000);
      }
    } catch (error: any) {
      toast.error(error.message || (lang === 'pt' ? 'Erro ao realizar cadastro' : 'Error during registration'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto bg-white border-neutral-200">
      <Tabs defaultValue={initialMode} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-neutral-100 p-1">
          <TabsTrigger value="login" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">{lang === 'pt' ? 'Login' : 'Login'}</TabsTrigger>
          <TabsTrigger value="signup" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">{lang === 'pt' ? 'Cadastro' : 'Sign Up'}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="login">
          <form onSubmit={handleLogin}>
            <CardHeader>
              <CardTitle>{lang === 'pt' ? 'Acessar LOVABLACK' : 'Access LOVABLACK'}</CardTitle>
              <CardDescription>{lang === 'pt' ? 'Entre com sua conta para acessar o painel.' : 'Log in to your account to access the dashboard.'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{lang === 'pt' ? 'Email' : 'Email'}</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{lang === 'pt' ? 'Senha' : 'Password'}</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full bg-[#1A1B1A]" disabled={loading}>
                {loading ? (lang === 'pt' ? 'Entrando...' : 'Logging in...') : (lang === 'pt' ? 'Entrar' : 'Log In')}
              </Button>
            </CardFooter>
          </form>
        </TabsContent>
 
        <TabsContent value="signup">
          <form onSubmit={handleSignup}>
            <CardHeader>
              <CardTitle>
                {isTrial 
                  ? (lang === 'pt' ? 'Iniciar Teste 20 Min' : 'Start 20 Min Trial') 
                  : (lang === 'pt' ? 'Criar Conta' : 'Create Account')}
              </CardTitle>
              <CardDescription>
                {isTrial 
                  ? (lang === 'pt' ? 'Preencha os dados para começar seu teste agora.' : 'Fill in the details to start your trial now.') 
                  : (lang === 'pt' ? 'Cadastre-se para escolher seu plano.' : 'Sign up to choose your plan.')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-name">{lang === 'pt' ? 'Nome Completo' : 'Full Name'}</Label>
                <Input id="signup-name" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">{lang === 'pt' ? 'Email' : 'Email'}</Label>
                <Input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-whatsapp">{lang === 'pt' ? 'WhatsApp' : 'WhatsApp'}</Label>
                <Input id="signup-whatsapp" type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(00) 00000-0000" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">{lang === 'pt' ? 'Senha' : 'Password'}</Label>
                <Input id="signup-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full bg-[#DC0D0D]" disabled={loading}>
                {loading ? (lang === 'pt' ? 'Cadastrando...' : 'Registering...') : (lang === 'pt' ? 'Criar Conta' : 'Create Account')}
              </Button>
            </CardFooter>
          </form>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
