import type { SupabaseClient } from "@supabase/supabase-js";

export type PlanType = "trial" | "monthly" | "semiannual" | "annual";

export const PLAN_DAYS: Record<PlanType, number> = {
  trial: 0,
  monthly: 30,
  semiannual: 180,
  annual: 365,
};

/**
 * Garante que o usuario autenticado possui a role de admin.
 * Usa o client do usuario (RLS) apenas para leitura da propria role.
 */
export async function assertAdmin(
  supabase: SupabaseClient<any, any, any>,
  userId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (error || !data) {
    throw new Error("Acesso negado: apenas administradores.");
  }
}

/** Calcula a data de expiracao a partir do tipo de plano. */
export function computeExpiry(plan: PlanType, customDays?: number): string {
  const days = customDays ?? PLAN_DAYS[plan];
  const base = new Date();
  if (plan === "trial" && !customDays) {
    base.setMinutes(base.getMinutes() + 20);
  } else {
    base.setDate(base.getDate() + days);
  }
  return base.toISOString();
}
