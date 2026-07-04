"use client";

import { useEffect, useState } from "react";
import { ChevronsLeftRight, Cpu, MemoryStick, HardDrive, AlertTriangle } from "lucide-react";

export function CS2() {
  const [phase, setPhase] = useState<"checking" | "failed">("checking");
  const [checks, setChecks] = useState<{ label: string; ok: boolean; need: string; have: string }[]>([
    { label: "Процессор", ok: false, need: "Intel Core i5-13400F", have: "Бобёр-одиночка 1 ядро" },
    { label: "Оперативная память", ok: false, need: "16 ГБ DDR5", have: "512 КБ веток" },
    { label: "Видеокарта", ok: false, need: "RTX 4060 8 ГБ", have: "Плотина-интегрированная 4 МБ" },
    { label: "Место на диске", ok: false, need: "85 ГБ SSD", have: "12 ГБ прутьев" },
  ]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    checks.forEach((_, i) => {
      timers.push(
        setTimeout(() => {
          setChecks((prev) => prev.map((c, idx) => (idx === i ? { ...c, ok: false } : c)));
          if (i === checks.length - 1) {
            setTimeout(() => setPhase("failed"), 400);
          }
        }, 600 * (i + 1))
      );
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="flex h-full flex-col bg-black text-white">
      {/* header */}
      <div className="flex items-center gap-3 bg-gradient-to-r from-orange-600 to-red-700 px-5 py-3">
        <ChevronsLeftRight className="h-6 w-6" />
        <div>
          <h1 className="text-lg font-black tracking-wide">КС2</h1>
          <p className="text-[11px] text-white/80">Counter-Strile 2 (пиратская бобро-версия)</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        {phase === "checking" && (
          <>
            <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-orange-500" />
            <p className="text-sm text-white/70">Проверяем системные требования...</p>
          </>
        )}

        {phase === "failed" && (
          <>
            <div className="grid h-20 w-20 place-items-center rounded-full bg-rose-500/20">
              <AlertTriangle className="h-12 w-12 text-rose-500" />
            </div>
            <h2 className="mt-4 text-2xl font-black text-rose-400">
              Ваш комп это не потянет
            </h2>
            <p className="mt-1 text-sm text-white/60">
              КС2 не может запуститься на BoberOS. Бобру не хватает мощности.
            </p>

            <div className="mt-5 w-full max-w-md space-y-2 text-left">
              {checks.map((c) => (
                <div
                  key={c.label}
                  className="flex items-center gap-3 rounded-lg bg-white/5 p-2.5"
                >
                  <CheckIcon ok={c.ok} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                      {iconFor(c.label)}
                      {c.label}
                    </div>
                    <p className="text-[11px] text-white/40">
                      Нужно: {c.need}
                    </p>
                    <p className="text-[11px] text-rose-400/80">
                      У вас: {c.have}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-5 max-w-sm text-xs text-white/40">
              Совет: попробуйте <b className="text-fuchsia-400">КиберБобер</b> —
              он оптимизирован под бобров и работает даже на плотине.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function CheckIcon({ ok }: { ok: boolean }) {
  return (
    <span
      className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
        ok ? "bg-emerald-500 text-white" : "bg-rose-500/30 text-rose-400"
      }`}
    >
      {ok ? "✓" : "✕"}
    </span>
  );
}

function iconFor(label: string) {
  if (label === "Процессор") return <Cpu className="h-3.5 w-3.5 text-white/50" />;
  if (label === "Оперативная память") return <MemoryStick className="h-3.5 w-3.5 text-white/50" />;
  if (label === "Место на диске") return <HardDrive className="h-3.5 w-3.5 text-white/50" />;
  return null;
}
