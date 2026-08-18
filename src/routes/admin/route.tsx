import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { isAdmin } from '@/lib/auth';
import { AuthModal } from '@/components/auth/AuthModal';
import { Button } from '@/components/ui/button';

interface AdminRouteContext {
  isAuthenticated: boolean;
  userIsAdmin: boolean;
}

export const Route = createFileRoute('/admin')({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // Tenta obter o usuário da sessão atual
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      // Se não estiver logado e tentar acessar sub-rotas, manda para o /admin principal (que tem o form)
      if (location.pathname !== '/admin' && location.pathname !== '/admin/') {
        throw redirect({ to: '/admin' });
      }
      return { isAuthenticated: false, userIsAdmin: false } satisfies AdminRouteContext;
    }

    // Verifica se é admin
    const userIsAdmin = await isAdmin(user.id);
    
    if (!userIsAdmin) {
      // Se estiver logado mas não for admin, e tentar acessar dashboard, mostra tela de erro no /admin
      if (location.pathname !== '/admin' && location.pathname !== '/admin/') {
        throw redirect({ to: '/admin' });
      }
      return { isAuthenticated: true, userIsAdmin: false } satisfies AdminRouteContext;
    }

    // SE É ADMIN e está no /admin raiz, manda pro dashboard
    if (location.pathname === '/admin' || location.pathname === '/admin/') {
      throw redirect({ to: '/admin/dashboard' });
    }

    return { isAuthenticated: true, userIsAdmin: true } satisfies AdminRouteContext;
  },
  component: AdminLayout,
});

function AdminLayout() {
  const { isAuthenticated, userIsAdmin } = Route.useRouteContext();

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
        <AuthModal initialMode="login" lang="pt" />
      </main>
    );
  }

  if (!userIsAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <section className="w-full max-w-md rounded-md border border-border bg-card p-6 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-foreground">Acesso administrativo necessário</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Sua conta está conectada, mas você não tem permissão para acessar esta área. Caso você seja o proprietário, certifique-se de estar logado com a conta correta.
          </p>
          <Button
            className="mt-6 w-full"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.assign('/admin');
            }}
          >
            Entrar com outra conta
          </Button>
        </section>
      </main>
    );
  }

  return <Outlet />;
}
