"use client";

import { useEffect, useRef, useState } from "react";
import {
  ShieldCheck,
  Zap,
  ScanSearch,
  RotateCw,
  CheckCircle2,
} from "lucide-react";
import { useOS } from "@/lib/os-store";
import { cn } from "@/lib/utils";

type ScanType = "quick" | "deep";
type Phase = "idle" | "scanning" | "done";

const QUICK_STEPS = [
  "Проверка оперативной памяти...",
  "Проверка системных брёвен...",
  "Проверка папки BoberOS...",
  "Проверка зубов бобра...",
];
const DEEP_STEPS = [
  "Глубокая проверка оперативной памяти...",
  "Сканирование каждого бревна по отдельности...",
  "Проверка плотины на течь...",
  "Проверка хвоста на прочность...",
  "Проверка запасов веток в подвале...",
  "Поиск шпионских барсуков...",
  "Проверка папки BoberOS...",
  "Финальная проверка резцов...",
];

export function Antivirus360() {
  const setAntivirusResult = useOS((s) => s.setAntivirusResult);
  const antivirusResult = useOS((s) => s.antivirusResult);
  const [scanType, setScanType] = useState<ScanType>("quick");
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startScan = () => {
    if (phase === "scanning") return;
    const steps = scanType === "quick" ? QUICK_STEPS : DEEP_STEPS;
    setPhase("scanning");
    setProgress(0);
    setStepIdx(0);
    const duration = scanType === "quick" ? 3500 : 7000;
    const start = Date.now();
    intervalRef.current = setInterval(() => {
      const p = Math.min(100, ((Date.now() - start) / duration) * 100);
      setProgress(p);
      setStepIdx(Math.min(steps.length - 1, Math.floor((p / 100) * steps.length)));
      if (p >= 100) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        setPhase("done");
        setAntivirusResult(
          "Угроз не найдено. Компьютер в полной безопасности. Бобёр доволен."
        );
      }
    }, 40);
  };

  const reset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setPhase("idle");
    setProgress(0);
    setStepIdx(0);
    setAntivirusResult(null);
  };

  const steps = scanType === "quick" ? QUICK_STEPS : DEEP_STEPS;

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-green-50 to-white">
      {/* header */}
      <div className="flex items-center gap-3 bg-gradient-to-r from-green-600 to-emerald-700 px-5 py-3 text-white">
        <div className="relative grid h-10 w-10 place-items-center rounded-xl bg-white/20 font-black">
          360
        </div>
        <div>
          <h1 className="text-lg font-bold">360 Total Beaver Security</h1>
          <p className="text-[11px] text-white/80">
            Защита от вирусов, барсуков и плохих шуток
          </p>
        </div>
        {phase === "idle" && (
          <span className="ml-auto flex items-center gap-1 rounded-full bg-green-400/30 px-3 py-1 text-xs">
            <span className="h-2 w-2 rounded-full bg-green-300" /> Защита активна
          </span>
        )}
      </div>

      <div className="bober-scroll flex-1 overflow-y-auto p-5">
        {phase === "idle" && (
          <>
            <p className="mb-3 text-sm font-medium text-zinc-700">
              Выберите тип проверки:
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <ScanOption
                active={scanType === "quick"}
                onClick={() => setScanType("quick")}
                icon={<Zap className="h-6 w-6" />}
                title="Быстрая проверка"
                desc="Проверит ключевые брёвна за ~3 сек"
                time="≈ 3 сек"
              />
              <ScanOption
                active={scanType === "deep"}
                onClick={() => setScanType("deep")}
                icon={<ScanSearch className="h-6 w-6" />}
                title="Глубокая проверка"
                desc="Перепроверит каждый сучок и хвост за ~7 сек"
                time="≈ 7 сек"
              />
            </div>
            <button
              onClick={startScan}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3 text-sm font-semibold text-white shadow-lg shadow-green-600/30 hover:bg-green-700"
            >
              <ShieldCheck className="h-5 w-5" />
              Начать проверку
            </button>
            {antivirusResult && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-xs text-green-700">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Последняя проверка: угроз не найдено.
              </div>
            )}
          </>
        )}

        {phase === "scanning" && (
          <div className="flex flex-col items-center py-6">
            <div className="relative grid h-32 w-32 place-items-center">
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="44" fill="none" stroke="#dcfce7" strokeWidth="8" />
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  stroke="#16a34a"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(progress / 100) * 276} 276`}
                  className="transition-[stroke-dasharray] duration-75"
                />
              </svg>
              <span className="text-2xl font-black text-green-700">
                {Math.round(progress)}%
              </span>
            </div>
            <p className="mt-4 flex items-center gap-2 text-sm text-zinc-600">
              <RotateCw className="h-4 w-4 animate-spin text-green-600" />
              {steps[stepIdx]}
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              Не выключайте бобра во время проверки
            </p>
            {/* linear bar too, for clarity */}
            <div className="mt-4 h-2 w-64 overflow-hidden rounded-full bg-green-100">
              <div
                className="h-full rounded-full bg-green-500 transition-[width] duration-75"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {phase === "done" && (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="grid h-24 w-24 place-items-center rounded-full bg-green-100">
              <ShieldCheck className="h-14 w-14 text-green-600" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-zinc-800">Всё хорошо!</h2>
            <p className="mt-1 max-w-sm text-sm text-zinc-500">
              {antivirusResult}
            </p>
            <div className="mt-4 grid w-full max-w-sm grid-cols-3 gap-2 text-center">
              <Stat label="Угроз" value="0" good />
              <Stat label="Брёвен" value="ОК" good />
              <Stat label="Барсуков" value="0" good />
            </div>
            <button
              onClick={reset}
              className="mt-6 rounded-xl bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Готово
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ScanOption({
  active,
  onClick,
  icon,
  title,
  desc,
  time,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
  time: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-1 rounded-2xl border-2 p-4 text-left transition-all",
        active
          ? "border-green-500 bg-green-50 shadow-md"
          : "border-zinc-200 bg-white hover:border-green-300"
      )}
    >
      <div className="flex w-full items-center justify-between">
        <div
          className={cn(
            "grid h-10 w-10 place-items-center rounded-xl",
            active ? "bg-green-500 text-white" : "bg-zinc-100 text-zinc-500"
          )}
        >
          {icon}
        </div>
        <span className="text-[11px] font-medium text-zinc-400">{time}</span>
      </div>
      <h3 className="text-sm font-bold text-zinc-800">{title}</h3>
      <p className="text-xs text-zinc-500">{desc}</p>
    </button>
  );
}

function Stat({
  label,
  value,
  good,
}: {
  label: string;
  value: string;
  good?: boolean;
}) {
  return (
    <div className="rounded-xl bg-zinc-50 p-2">
      <p className={cn("text-lg font-black", good ? "text-green-600" : "text-rose-600")}>
        {value}
      </p>
      <p className="text-[11px] text-zinc-400">{label}</p>
    </div>
  );
}
