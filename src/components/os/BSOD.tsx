"use client";

import { useEffect, useState } from "react";
import { BeaverLogo } from "./BeaverLogo";
import { useOS } from "@/lib/os-store";

export function BSOD() {
  const reboot = useOS((s) => s.reboot);
  const language = useOS((s) => s.language);
  const [count, setCount] = useState(8);
  const en = language === "en";

  useEffect(() => {
    const t = setInterval(() => {
      setCount((c) => {
        if (c <= 1) { clearInterval(t); reboot(); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [reboot]);

  return (
    <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-[#1a3a6b] px-6 text-white">
      <div className="rotate-12">
        <BeaverLogo size={120} />
      </div>
      <p className="mt-4 text-2xl font-light">:(</p>
      <p className="mt-6 max-w-xl text-center text-sm leading-relaxed">
        {en
          ? "Your PC ran into a problem and needs to restart. Looks like someone deleted the C:\\BoberOS folder. Without it the beaver has nowhere to live."
          : "На вашем компьютере возникла проблема, и его пришлось перезапустить. Похоже кто-то удалил папку C:\\BoberOS. Без неё бобру негде жить."}
      </p>
      <p className="mt-6 text-sm">
        {en ? "Collecting error info: 100% complete" : "Сборка информации об ошибках: 100% завершено"}
      </p>
      <p className="mt-4 text-xs text-white/80">
        {en ? `Restarting in ${count}... (beaver is already running to fix it)` : `Перезапуск через ${count}... (бобёр уже бежит чинить)`}
      </p>
      <button onClick={reboot} className="mt-6 rounded border border-white/50 px-4 py-1.5 text-xs hover:bg-white/10">
        {en ? "Restart now" : "Перезапустить сейчас"}
      </button>
    </div>
  );
}
