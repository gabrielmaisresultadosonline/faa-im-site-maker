import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { isAdmin } from '@/lib/auth';

export const Route = createFileRoute('/admin')({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    const user = data.user;

    if (error || !user) {
      throw redirect({ to: '/' });
    }

    const userIsAdmin = await isAdmin(user.id);
    if (!userIsAdmin) {
      throw redirect({ to: '/dashboard' });
    }

    if (location.pathname === '/admin' || location.pathname === '/admin/') {
      throw redirect({ to: '/admin/dashboard' });
    }
  },
  component: () => <Outlet />,
});
