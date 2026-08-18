import { createFileRoute, redirect } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ location }) => {
    // Tenta obter a sessão de forma mais resiliente
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      console.warn("Sem sessão ativa no dashboard. Tentando recuperar usuário...");
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error("Nenhuma sessão ou usuário encontrado. Redirecionando para home.", userError?.message);
        throw redirect({
          to: '/',
          search: {
            redirect: location.href,
          },
        });
      }
    }
  },
});
