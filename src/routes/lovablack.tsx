import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle } from 'lucide-react';
import { loginFromExtension } from '@/lib/auth.functions';

const searchSchema = z.object({
  email: z.string().optional(),
  password: z.string().optional(),
});

export const Route = createFileRoute('/lovablack')({
  ssr: false,
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: 'Renovar acesso — LOVABLACK' },
      { name: 'description', content: 'Acesse sua conta LOVABLACK e escolha seu plano para renovar o acesso.' },
      { name: 'robots', content: 'noindex' },
      { property: 'og:title', content: 'Renovar acesso — LOVABLACK' },
      { property: 'og:description', content: 'Acesse sua conta LOVABLACK e renove seu plano.' },
    ],
  }),
  component: ExtensionAccessPage,
});

function ExtensionAccessPage() {
  const { email, password } = Route.useSearch();
  const navigate = useNavigate();
  const doLogin = useServerFn(loginFromExtension);
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    // Limpa credenciais da URL imediatamente (não deixar em histórico).
    if (typeof window !== 'undefined' && window.location.search) {
      window.history.replaceState({}, '', '/lovablack');
    }

    (async () => {
      if (!email || !password) {
        navigate({ to: '/', search: { login: 'true' } as never }).catch(() => {
          window.location.replace('/');
        });
        return;
      }
      try {
        await doLogin({ data: { email, password } });
        window.location.replace('/dashboard');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Não foi possível entrar automaticamente.');
      }
    })();
  }, [email, password, doLogin, navigate]);

  return (
    <div className="min-h-screen bg-[#F7F1EB] flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-white border-neutral-200 shadow-xl">
        <CardContent className="p-8 text-center space-y-4">
          {error ? (
            <>
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
              <h1 className="text-2xl font-bold text-[#1A1B1A]">Não foi possível entrar</h1>
              <p className="text-neutral-600">{error}</p>
              <Button className="w-full bg-[#1A1B1A]" onClick={() => window.location.replace('/')}>
                Fazer login manualmente
              </Button>
            </>
          ) : (
            <>
              <Loader2 className="w-12 h-12 text-[#1A1B1A] mx-auto animate-spin" />
              <h1 className="text-2xl font-bold text-[#1A1B1A]">Entrando na sua conta…</h1>
              <p className="text-neutral-600">Estamos abrindo seu painel para você escolher o plano.</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
