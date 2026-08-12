/**
 * Catalogo de planos AUTORITATIVO (server-side).
 * O cliente envia apenas a chave do plano; preco e duracao NUNCA vem do cliente.
 */
export type PlanKey = "monthly" | "semiannual" | "annual";
export type PlanCurrency = "BRL" | "USD";

export interface PlanDefinition {
  readonly name: string;
  readonly priceCents: number;
  readonly durationDays: number;
}

export const PLAN_CATALOG: Record<PlanCurrency, Record<PlanKey, PlanDefinition>> = {
  BRL: {
    monthly: { name: "Mensal", priceCents: 4700, durationDays: 30 },
    semiannual: { name: "Semestral", priceCents: 14700, durationDays: 180 },
    annual: { name: "Anual", priceCents: 39700, durationDays: 365 },
  },
  USD: {
    monthly: { name: "Monthly", priceCents: 4700, durationDays: 30 },
    semiannual: { name: "6 Months", priceCents: 14700, durationDays: 180 },
    annual: { name: "Annual", priceCents: 39700, durationDays: 365 },
  },
} as const;

export const PLAN_KEYS: PlanKey[] = ["monthly", "semiannual", "annual"];

export function getPlan(currency: PlanCurrency, planKey: PlanKey): PlanDefinition {
  const plan = PLAN_CATALOG[currency]?.[planKey];
  if (!plan) throw new Error("Invalid plan");
  return plan;
}
