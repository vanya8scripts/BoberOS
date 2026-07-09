"use client";

import { useEffect, useState } from "react";
import { BeaverLogo } from "./BeaverLogo";
import { useOS, type OSVersion } from "@/lib/os-store";

const MESSAGES_RU = [
  "Грызём брёвна...",
  "Строим плотину...",
  "Проверяем хвост на упругость...",
  "Пробуждаем бобра-администратора...",
  "Загружаем запасы веток...",
  "Калибруем резцы...",
  "Шлифуем зубы...",
  "Запускаем ядро BoberOS...",
];

const MESSAGES_EN = [
  "Chewing logs...",
  "Building dam...",
  "Checking tail elasticity...",
  "Waking beaver admin...",
  "Loading branch reserves...",
  "Calibrating incisors...",
  "Polishing teeth...",
  "Starting BoberOS kernel...",
];

const VERSION_LABEL: Record<OSVersion, string> = {
  pro: "BoberOS Pro",
  home: "BoberOS Home",
  max: "BoberOS Max VK EDITION RUSSIA",
};

export function BootScreen() {
  const setBootPhase = useOS((s) => s.setBootPhase);
  const userName = useOS((s) => s.userName);
  const userAvatar = useOS((s) => s.userAvatar);
  const customAvatar = useOS((s) => s.customAvatar);
  const osVersion = useOS((s) => s.osVersion);
  const language = useOS((s) => s.language);
  const [progress, setProgress] = useState(0);
  const [msgIdx, setMsgIdx] = useState(0);

  const messages = language === "en" ? MESSAGES_EN : MESSAGES_RU;

  useEffect(() => {
    const start = Date.now();
    const duration = 3000;
    let raf = 0;
    const tick = () => {
      const elapsed = Date.now() - start;
      const p = Math.min(100, (elapsed / duration) * 100);
      setProgress(p);
      setMsgIdx(Math.min(messages.length - 1, Math.floor((p / 100) * messages.length)));
      if (p < 100) raf = requestAnimationFrame(tick);
      else setTimeout(() => setBootPhase("desktop"), 400);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [setBootPhase, messages.length]);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-b from-[#0078d4] via-[#1a4a8a] to-[#0a1a3a] text-white">
      <BeaverLogo size={130} animate />
      <h1 className="mt-5 text-5xl font-black tracking-tight">
        Bober<span className="text-sky-300">OS</span>
      </h1>
      <p className="mt-1 text-xs text-white/60">{VERSION_LABEL[osVersion]}</p>

      <div className="mt-5 flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm backdrop-blur">
        <span className="text-xl">
          {customAvatar ? (
            <img src={customAvatar} alt="" className="h-5 w-5 rounded-full object-cover" />
          ) : (
            userAvatar
          )}
        </span>
        <span className="font-medium">{userName || "Beaver"}</span>
      </div>

      <div className="mt-8 h-1.5 w-72 overflow-hidden rounded-full bg-white/15">
        <div className="h-full rounded-full bg-gradient-to-r from-sky-300 to-blue-400" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-3 h-5 text-xs text-white/70">{messages[msgIdx]}</p>

      <div className="absolute bottom-8 h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />

      <p className="absolute bottom-3 text-[11px] text-white/40">
        {language === "en" ? "BoberOS © 2026 Beaver Inc. All branches reserved." : "BoberOS © 2026 Бобёр Инк. Все ветки защищены."}
      </p>
    </div>
  );
}
