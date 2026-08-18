import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export function getSupabaseAdmin() {
  const url =
    process.env["SUPABASE_URL"] ||
    process.env["VITE_SUPABASE_URL"] ||
    import.meta.env["VITE_SUPABASE_URL"] ||
    "https://zjvmfmdyuxmyanuuralq.supabase.co";

  const serviceKey =
    process.env["SUPABASE_SERVICE_ROLE_KEY"] ||
    process.env["VITE_SUPABASE_SERVICE_ROLE_KEY"] ||
    process.env["sb_secret_zjvmfmdyuxmyanuuralq"];

  // Se não houver serviceKey, usamos a anonKey como fallback para evitar crash no SDK
  const finalKey = serviceKey || "sb_publishable_MiPzB015qmvANP558ovB_A_WkWjx8T7";

  return createClient<Database>(url, finalKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export const supabaseAdmin = getSupabaseAdmin();
