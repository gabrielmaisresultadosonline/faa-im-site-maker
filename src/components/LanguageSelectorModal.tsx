import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Globe } from "lucide-react";

export function LanguageSelectorModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Show only if no language has been selected in this session
    const hasSelected = sessionStorage.getItem("language_selected");
    if (!hasSelected) {
      setIsOpen(true);
    }
  }, []);

  const selectLanguage = (lang: "pt" | "en") => {
    sessionStorage.setItem("language_selected", "true");
    setIsOpen(false);
    if (lang === "en") {
      window.location.href = "/ingles";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[#F7F1EB] rounded-[2.5rem] p-8 md:p-12 max-w-2xl w-full border border-[#D8D0C8] shadow-2xl scale-in-95 animate-in zoom-in-95 duration-300">
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-3xl md:text-5xl font-black text-[#1A1B1A] leading-tight">
              Deseja essa página em que idioma?
            </h2>
            <p className="text-xl text-neutral-600 font-medium">
              Choose your preferred language to continue.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              onClick={() => selectLanguage("pt")}
              className="group relative flex flex-col items-center gap-4 p-8 rounded-3xl bg-white border-2 border-[#D8D0C8] hover:border-[#DC0D0D] transition-all hover:scale-105"
            >
              <span className="text-6xl md:text-7xl group-hover:scale-110 transition-transform">🇧🇷</span>
              <div className="space-y-1">
                <span className="text-2xl font-bold text-[#1A1B1A]">Português</span>
                <p className="text-sm text-neutral-500">Continuar em Português</p>
              </div>
            </button>

            <button
              onClick={() => selectLanguage("en")}
              className="group relative flex flex-col items-center gap-4 p-8 rounded-3xl bg-white border-2 border-[#D8D0C8] hover:border-[#DC0D0D] transition-all hover:scale-105"
            >
              <span className="text-6xl md:text-7xl group-hover:scale-110 transition-transform">🇺🇸</span>
              <div className="space-y-1">
                <span className="text-2xl font-bold text-[#1A1B1A]">English</span>
                <p className="text-sm text-neutral-500">Continue in English</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
