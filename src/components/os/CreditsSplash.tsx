"use client";

import { useEffect, useState } from "react";
import { useOS } from "@/lib/os-store";

export function CreditsSplash() {
  const setBootPhase = useOS((s) => s.setBootPhase);
  const language = useOS((s) => s.language);
  const [showButton, setShowButton] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowButton(true), 3000);
    return () => clearTimeout(t);
  }, []);

  const handleContinue = () => {
    setFadingOut(true);
    setTimeout(() => setBootPhase("booting"), 500);
  };

  return (
    <div
      className="fixed inset-0 z-[9998] flex flex-col items-center justify-center bg-black text-white transition-opacity duration-500"
      style={{ opacity: fadingOut ? 0 : 1 }}
    >
      <p
        className="text-2xl font-light tracking-[0.3em] text-white/90"
        style={{ animation: "credits-glow 2.5s ease-in-out infinite" }}
      >
        created by
      </p>
      <h1
        className="mt-3 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 bg-clip-text text-6xl font-black text-transparent"
        style={{ filter: "drop-shadow(0 0 25px rgba(251,146,60,0.5))" }}
      >
        vanya8
      </h1>

      <a
        href="https://github.com/vanya8scripts"
        target="_blank"
        rel="noopener noreferrer"
        className="group mt-8 flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-sm text-white/70 backdrop-blur transition-all hover:border-white/50 hover:bg-white/10 hover:text-white"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
          <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
        </svg>
        <span>GitHub</span>
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current opacity-50 transition-transform group-hover:translate-x-0.5" aria-hidden="true">
          <path d="M14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3m-2 16H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2z"/>
        </svg>
      </a>

      <button
        onClick={handleContinue}
        className={`mt-10 flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-8 py-3 text-base font-bold text-zinc-900 shadow-lg shadow-orange-500/30 transition-all duration-500 hover:scale-105 ${
          showButton ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
        }`}
      >
        {language === "en" ? "Continue" : "Продолжить"}
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
          <path d="M4 11v2h12l-5 5 1.41 1.41L19.83 12 12.41 4.59 11 6l5 5z"/>
        </svg>
      </button>

      <p className={`absolute bottom-6 text-[11px] text-white/30 transition-opacity duration-500 ${showButton ? "opacity-0" : "opacity-100"}`}>
        BoberOS © 2026
      </p>

      <style>{`@keyframes credits-glow{0%,100%{opacity:.7}50%{opacity:1}}`}</style>
    </div>
  );
}
