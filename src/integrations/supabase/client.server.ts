import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

export const supabaseAdmin = createClient<Database>(
  (import.meta.env['VITE_SUPABASE_URL'] as string) || 
  (process.env['VITE_SUPABASE_URL'] as string) || 
  (process.env['SUPABASE_URL'] as string) || '',
  (process.env['SUPABASE_SERVICE_ROLE_KEY'] as string) || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
