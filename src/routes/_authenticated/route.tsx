import { createFileRoute, redirect } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ location }) => {
    try {
      // Usamos getUser() em vez de getSession() para garantir validação no servidor Supabase
      // Isso evita carregar sessões expiradas ou inválidas do localStorage
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.warn("Autenticação necessária para acessar:", location.pathname);
        
        // Só redireciona se NÃO estivermos na home ou na versão inglês
        if (location.pathname !== '/' && location.pathname !== '/ingles') {
          throw redirect({
            to: '/',
            search: {
              redirect: location.pathname,
            },
          });
        }
        return;
      }

      // Se houver usuário, mas ele tentar acessar a raiz, redirecionamos para o dashboard correto
      if (location.pathname === '/' || location.pathname === '/ingles') {
        const isAdminEmail = user.email?.toLowerCase() === 'mro@gmail.com';
        throw redirect({
          to: isAdminEmail ? '/admin/dashboard' : '/dashboard',
        });
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('redirect')) throw err;
      console.error("Erro crítico no guarda de autenticação:", err);
    }
  },
});
