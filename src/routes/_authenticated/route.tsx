import { createFileRoute, redirect } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ location }) => {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      console.warn("Sem sessão ativa no dashboard. Redirecionando para home.", error?.message);
      throw redirect({
        to: '/',
        search: {
          redirect: location.href,
        },
      });
    }
  },
});
