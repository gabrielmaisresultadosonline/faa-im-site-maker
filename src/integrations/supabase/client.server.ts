import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Retorna uma instância do Supabase Admin configurada dinamicamente.
 * Prioriza process.env (PM2 no VPS) sobre import.meta.env (Vite).
 * 
 * CRITICAL: Esta instância ignora RLS e deve ser usada apenas em ambiente de servidor seguro
 * para operações administrativas como login de extensão, webhooks e gestão de usuários.
 */
export function getSupabaseAdmin() {
  // Coleta URL
  const url =
    process.env["SUPABASE_URL"] ||
    process.env["VITE_SUPABASE_URL"] ||
    import.meta.env["VITE_SUPABASE_URL"] ||
    "https://zjvmfmdyuxmyanuuralq.supabase.co"; // Fallback para o ID do projeto atual

  // Coleta Service Role Key (várias nomenclaturas possíveis no ambiente)
  const serviceKey =
    process.env["SUPABASE_SERVICE_ROLE_KEY"] ||
    process.env["VITE_SUPABASE_SERVICE_ROLE_KEY"] ||
    process.env["sb_secret_zjvmfmdyuxmyanuuralq"]; // Chave específica Lovable se injetada

  if (!url || !serviceKey) {
    console.error("[SupabaseAdmin] ERRO: Credenciais de administrador não encontradas no ambiente.");
  }

  return createClient<Database>(url, serviceKey || "", {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Instância exportada para compatibilidade retroativa.
 * Note: Em ambientes serverless, é melhor chamar getSupabaseAdmin() dentro do handler.
 */
export const supabaseAdmin = getSupabaseAdmin();
