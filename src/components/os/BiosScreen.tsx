"use client";

import { useEffect, useState, useRef } from "react";
import { useOS } from "@/lib/os-store";

const CHECKS = [
  { label: "BoberBIOS v2.1", delay: 200 },
  { label: "CPU: Бобёр-одиночка 1 ядро @ 2.4 ГГц", delay: 250 },
  { label: "Memory Test: 512 КБ веток ........ OK", delay: 300 },
  { label: "Detecting IDE drives ...", delay: 200 },
  { label: "  Primary Master: Плотина SSD 60 ГБ", delay: 200 },
  { label: "  Primary Slave: None", delay: 150 },
  { label: "  Secondary Master: Резцы DVD-ROM", delay: 200 },
  { label: "Detecting USB devices ...", delay: 200 },
  { label: "  Хвост-порт 1: BeaverMouse", delay: 180 },
  { label: "  Хвост-порт 2: BranchKeyboard", delay: 180 },
  { label: "Initializing video ... 1024x768 24bit", delay: 220 },
  { label: "Loading BoberOS kernel from C:\\BoberOS\\kernel.bober", delay: 350 },
  { label: "BoberOS boot loader ready.", delay: 200 },
];

const KEYS_HINT = "Press DEL to enter Setup, F12 for Boot Menu";

export function BiosScreen() {
  const finishBios = useOS((s) => s.finishBios);
  const [lines, setLines] = useState<string[]>([]);
  const [hint, setHint] = useState(false);
  const [progress, setProgress] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let acc = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    CHECKS.forEach((c, i) => {
      acc += c.delay;
      const t = setTimeout(() => {
        setLines((prev) => [...prev, c.label]);
        setProgress(Math.round(((i + 1) / CHECKS.length) * 100));
      }, acc);
      timers.push(t);
    });
    const tHint = setTimeout(() => setHint(true), 600);
    timers.push(tHint);
    const tDone = setTimeout(() => finishBios(), acc + 500);
    timers.push(tDone);
    return () => timers.forEach(clearTimeout);
  }, [finishBios]);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-black px-6 py-5 font-mono text-sm text-zinc-200" style={{ fontFamily: "monospace" }}>
      <div className="border-b border-zinc-700 pb-2">
        <div className="flex items-center justify-between">
          <span className="text-zinc-100 font-bold">BoberBIOS v2.1</span>
          <span className="text-zinc-500">© 2026 Бобёр Инк.</span>
        </div>
        <div className="mt-0.5 text-zinc-500 text-xs">An energy-aware beaver firmware</div>
      </div>

      <div className="mt-3 flex-1 space-y-0.5 overflow-hidden">
        {lines.map((l, i) => (
          <div key={i} className="leading-relaxed">
            <span className="text-zinc-300">{l}</span>
          </div>
        ))}
        {lines.length < CHECKS.length && (
          <div className="inline-block h-3.5 w-2 animate-pulse bg-zinc-300 align-middle" />
        )}
      </div>

      <div className="mt-2 flex items-center justify-between border-t border-zinc-700 pt-2 text-xs text-zinc-500">
        <span>{hint ? KEYS_HINT : ""}</span>
        <span className="text-zinc-400">{progress}%</span>
      </div>
    </div>
  );
}
