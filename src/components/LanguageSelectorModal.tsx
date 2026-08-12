import { useState, useEffect } from "react";
import { setStoredLanguage, type AppLanguage } from "@/lib/language";

/**
 * Modal obrigatorio de idioma.
 * Renderizado apenas na homepage em portugues ("/"): sempre que alguem acessa
 * a raiz do site, precisa escolher o idioma antes de ver o conteudo.
 * - Portugues -> permanece em "/" (pagamentos em BRL via InfinitePay)
 * - English   -> vai para "/ingles" (pagamentos em USD via Stripe)
 * Nao existe botao de fechar: a escolha e obrigatoria.
 */
export function LanguageSelectorModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Sempre pergunta ao acessar a homepage diretamente.
    setIsOpen(true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const selectLanguage = (lang: AppLanguage) => {
    setStoredLanguage(lang);
    document.body.style.overflow = "";
    if (lang === "en") {
      window.location.href = "/ingles";
      return;
    }
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="language-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-300"
    >
      <div className="bg-[#F7F1EB] rounded-[2.5rem] p-8 md:p-12 max-w-2xl w-full border border-[#D8D0C8] shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <h2 id="language-modal-title" className="text-3xl md:text-5xl font-black text-[#1A1B1A] leading-tight">
              Deseja essa página em que idioma?
            </h2>
            <p className="text-xl text-neutral-600 font-medium">
              Choose your preferred language to continue.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              type="button"
              onClick={() => selectLanguage("pt")}
              className="group relative flex flex-col items-center gap-4 p-8 rounded-3xl bg-white border-2 border-[#D8D0C8] hover:border-[#DC0D0D] focus-visible:border-[#DC0D0D] focus-visible:outline-none transition-all hover:scale-105"
            >
              <span className="text-6xl md:text-7xl group-hover:scale-110 transition-transform">🇧🇷</span>
              <div className="space-y-1">
                <span className="text-2xl font-bold text-[#1A1B1A]">Português</span>
                <p className="text-sm text-neutral-500">Continuar em Português (R$)</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => selectLanguage("en")}
              className="group relative flex flex-col items-center gap-4 p-8 rounded-3xl bg-white border-2 border-[#D8D0C8] hover:border-[#DC0D0D] focus-visible:border-[#DC0D0D] focus-visible:outline-none transition-all hover:scale-105"
            >
              <span className="text-6xl md:text-7xl group-hover:scale-110 transition-transform">🇺🇸</span>
              <div className="space-y-1">
                <span className="text-2xl font-bold text-[#1A1B1A]">English</span>
                <p className="text-sm text-neutral-500">Continue in English (US$)</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
