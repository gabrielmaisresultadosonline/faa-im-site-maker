import { createFileRoute, redirect } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { isAdmin } from '@/lib/auth';

export const Route = createFileRoute('/admin')({
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    // Debug log para ajudar a identificar o problema no console do usuário
    console.log('[Admin Guard] Session check:', { 
      email: session?.user?.email, 
      id: session?.user?.id 
    });

    if (!session) {
      console.warn('[Admin Guard] No session found, redirecting to /');
      throw redirect({ to: '/' });
    }
    
    // Explicitly check for admin email or role
    // O email 'mro@Gmail.com' é o admin mestre
    const isMasterAdmin = session.user.email?.toLowerCase() === 'mro@gmail.com';
    const isUserAdmin = await isAdmin(session.user.id);

    console.log('[Admin Guard] Permission check:', { isMasterAdmin, isUserAdmin });

    if (!isMasterAdmin && !isUserAdmin) {
      console.warn('[Admin Guard] User is not admin, redirecting to /dashboard');
      throw redirect({ to: '/dashboard' });
    }
  },
});
