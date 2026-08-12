/**
 * Idioma escolhido pelo visitante.
 * A escolha é obrigatoria: a homepage sempre pergunta antes de liberar o conteudo.
 * - "pt" -> site em portugues, pagamento em BRL (InfinitePay)
 * - "en" -> site em ingles, pagamento em USD (Stripe)
 */
export type AppLanguage = "pt" | "en";

const STORAGE_KEY = "lovablack_language";

export function getStoredLanguage(): AppLanguage | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "pt" || value === "en" ? value : null;
  } catch {
    return null;
  }
}

export function setStoredLanguage(language: AppLanguage): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // localStorage indisponivel (modo privado) — a escolha vale so para a sessao atual.
  }
}

export function currencyForLanguage(language: AppLanguage): "BRL" | "USD" {
  return language === "en" ? "USD" : "BRL";
}
