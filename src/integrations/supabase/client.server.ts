import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// O client admin deve ser instanciado apenas quando necessário para evitar problemas de bundle no lado do cliente
// ou erros de ambiente durante a inicialização.
const getSupabaseAdmin = () => {
  const url = (process.env['SUPABASE_URL'] as string) || 
              (process.env['VITE_SUPABASE_URL'] as string) || 
              (import.meta.env['VITE_SUPABASE_URL'] as string) || '';
              
  const serviceKey = (process.env['SUPABASE_SERVICE_ROLE_KEY'] as string) || '';


  if (!url || !serviceKey) {
    console.warn('[SupabaseAdmin] URL ou Service Role Key ausentes. Verifique o arquivo .env no VPS.');
  }

  return createClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

export const supabaseAdmin = getSupabaseAdmin();
