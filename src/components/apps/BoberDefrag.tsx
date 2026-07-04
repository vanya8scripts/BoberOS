"use client";

import { useEffect, useRef, useState } from "react";
import { HardDrive, Play, CheckCircle2 } from "lucide-react";

export function BoberDefrag() {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [blocks, setBlocks] = useState<number[]>(() => Array.from({ length: 120 }, () => Math.floor(Math.random() * 4)));
  const ivRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (ivRef.current) clearInterval(ivRef.current); }, []);

  const start = () => {
    if (running) return;
    setRunning(true);
    setDone(false);
    setProgress(0);
    const start1 = Date.now();
    const dur = 4000;
    ivRef.current = setInterval(() => {
      const p = Math.min(100, ((Date.now() - start1) / dur) * 100);
      setProgress(p);
      setBlocks((bs) => {
        const sorted = [...bs].sort((a, b) => a - b);
        const mix = bs.map((b, i) => (Math.random() < p / 100 ? sorted[i] : b));
        return mix;
      });
      if (p >= 100) {
        if (ivRef.current) clearInterval(ivRef.current);
        ivRef.current = null;
        setBlocks((bs) => [...bs].sort((a, b) => a - b));
        setRunning(false);
        setDone(true);
      }
    }, 60);
  };

  const colors = ["bg-zinc-300", "bg-rose-400", "bg-amber-400", "bg-emerald-500"];

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-lime-50 to-white">
      <div className="flex items-center gap-3 bg-gradient-to-r from-lime-500 to-green-600 px-4 py-2.5 text-white">
        <HardDrive className="h-5 w-5" />
        <div>
          <h1 className="text-sm font-bold">Дефрагментация</h1>
          <p className="text-[10px] text-white/70">Оптимизация плотины C:</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-5">
        {/* disk visualization */}
        <div className="grid w-full max-w-md grid-cols-[repeat(20,1fr)] gap-0.5 rounded-xl border border-zinc-200 bg-white p-3">
          {blocks.map((b, i) => (
            <div key={i} className={`aspect-square rounded-[2px] transition-colors duration-150 ${colors[b]}`} />
          ))}
        </div>

        {running && (
          <>
            <div className="h-2 w-full max-w-md overflow-hidden rounded-full bg-zinc-200">
              <div className="h-full rounded-full bg-lime-500 transition-[width] duration-75" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-sm text-zinc-600">Дефрагментация... {Math.round(progress)}%</p>
          </>
        )}

        {done && !running && (
          <div className="flex flex-col items-center gap-1 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <p className="text-sm font-semibold text-zinc-800">Дефрагментация завершена!</p>
            <p className="text-xs text-zinc-500">Фрагментация: 0% · Плотина оптимизирована 🐹</p>
          </div>
        )}

        {!running && !done && (
          <div className="text-center">
            <p className="text-sm text-zinc-600">Фрагментация диска: 47%</p>
            <p className="text-xs text-zinc-400">Рекомендуется дефрагментация</p>
          </div>
        )}

        <button
          onClick={start}
          disabled={running}
          className="flex items-center gap-2 rounded-xl bg-lime-600 px-5 py-2 text-sm font-semibold text-white shadow-lg hover:bg-lime-700 disabled:opacity-50"
        >
          <Play className="h-4 w-4" />
          {running ? "Идёт дефрагментация..." : done ? "Дефрагментировать снова" : "Начать дефрагментацию"}
        </button>
      </div>
    </div>
  );
}
