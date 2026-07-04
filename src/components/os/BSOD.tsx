"use client";

import { useEffect, useState } from "react";
import { BeaverLogo } from "./BeaverLogo";
import { useOS } from "@/lib/os-store";

export function BSOD() {
  const reboot = useOS((s) => s.reboot);
  const [count, setCount] = useState(8);

  useEffect(() => {
    const t = setInterval(() => {
      setCount((c) => {
        if (c <= 1) {
          clearInterval(t);
          reboot();
          return 0;
        }
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
        На вашем компьютере возникла проблема, и его пришлось перезапустить.
        Похоже кто-то удалил папку <b className="font-mono">C:\BoberOS</b>. Без
        неё бобру негде жить.
      </p>
      <p className="mt-6 text-sm">
        Сборка информации об ошибках: 100% завершено
      </p>
      <p className="mt-4 text-xs text-white/80">
        Перезапуск через {count}... (бобёр уже бежит чинить)
      </p>
      <button
        onClick={reboot}
        className="mt-6 rounded border border-white/50 px-4 py-1.5 text-xs hover:bg-white/10"
      >
        Перезапустить сейчас
      </button>
    </div>
  );
}
