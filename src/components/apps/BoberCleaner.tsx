"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";

interface JunkItem {
  id: string;
  label: string;
  size: number;
  emoji: string;
}

const INITIAL: JunkItem[] = [
  { id: "cache", label: "Кэш бобра", size: 142, emoji: "🗑️" },
  { id: "logs", label: "Логи плотины", size: 68, emoji: "📋" },
  { id: "tmp", label: "Временные ветки", size: 215, emoji: "🌿" },
  { id: "cookies", label: "Печеньки барсуков", size: 12, emoji: "🍪" },
  { id: "recycle", label: "Корзина", size: 89, emoji: "♻️" },
  { id: "updates", label: "Старые обновления", size: 340, emoji: "📦" },
];

export function BoberCleaner() {
  const [items, setItems] = useState(INITIAL);
  const [scanning, setScanning] = useState(false);
  const [scanPct, setScanPct] = useState(0);
  const [cleaning, setCleaning] = useState(false);
  const [cleanPct, setCleanPct] = useState(0);
  const [done, setDone] = useState(false);
  const ivRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (ivRef.current) clearInterval(ivRef.current); }, []);

  const totalJunk = items.reduce((s, i) => s + i.size, 0);

  const scan = () => {
    setScanning(true);
    setScanPct(0);
    const start = Date.now();
    ivRef.current = setInterval(() => {
      const p = Math.min(100, ((Date.now() - start) / 1800) * 100);
      setScanPct(p);
      if (p >= 100) {
        if (ivRef.current) clearInterval(ivRef.current);
        ivRef.current = null;
        setScanning(false);
      }
    }, 40);
  };

  const clean = () => {
    setCleaning(true);
    setCleanPct(0);
    const start = Date.now();
    ivRef.current = setInterval(() => {
      const p = Math.min(100, ((Date.now() - start) / 2000) * 100);
      setCleanPct(p);
      if (p >= 100) {
        if (ivRef.current) clearInterval(ivRef.current);
        ivRef.current = null;
        setCleaning(false);
        setDone(true);
        setItems([]);
      }
    }, 40);
  };

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-emerald-50 to-white">
      <div className="flex items-center gap-3 bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-white">
        <Trash2 className="h-5 w-5" />
        <div>
          <h1 className="text-sm font-bold">Очистка</h1>
          <p className="text-[10px] text-white/70">Освободите плотину от мусора</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-5">
        {done ? (
          <div className="flex flex-col items-center gap-2 text-center">
            <CheckCircle2 className="h-16 w-16 text-emerald-500" />
            <h2 className="text-lg font-bold text-zinc-800">Очистка завершена!</h2>
            <p className="text-sm text-zinc-500">Освобождено: {totalJunk} МБ</p>
            <p className="text-xs text-emerald-600">🐹 Плотина сверкает чистотой!</p>
            <button
              onClick={() => { setItems(INITIAL); setDone(false); }}
              className="mt-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
            >
              Проверить снова
            </button>
          </div>
        ) : !scanning && !cleaning && items.length === 0 ? null : scanning ? (
          <div className="flex flex-col items-center gap-3">
            <div className="relative grid h-24 w-24 place-items-center">
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="44" fill="none" stroke="#d1fae5" strokeWidth="8" />
                <circle cx="50" cy="50" r="44" fill="none" stroke="#10b981" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(scanPct / 100) * 276} 276`} />
              </svg>
              <Sparkles className="h-8 w-8 animate-pulse text-emerald-500" />
            </div>
            <p className="text-sm text-zinc-600">Поиск мусора... {Math.round(scanPct)}%</p>
          </div>
        ) : cleaning ? (
          <div className="flex w-full max-w-md flex-col gap-2">
            <p className="text-center text-sm text-zinc-600">Очистка... {Math.round(cleanPct)}%</p>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${cleanPct}%` }} />
            </div>
            <p className="text-center text-xs text-zinc-400">Удаляем бобро-мусор...</p>
          </div>
        ) : (
          <div className="w-full max-w-md">
            <div className="mb-3 rounded-xl bg-amber-50 p-3 text-center">
              <p className="text-xs text-amber-600">Найдено мусора</p>
              <p className="text-2xl font-black text-amber-700">{totalJunk} МБ</p>
            </div>
            <div className="space-y-1">
              {items.map((it) => (
                <div key={it.id} className="flex items-center gap-2 rounded-lg border border-zinc-200 p-2">
                  <span className="text-xl">{it.emoji}</span>
                  <span className="flex-1 text-xs text-zinc-700">{it.label}</span>
                  <span className="text-xs font-mono text-zinc-500">{it.size} МБ</span>
                  <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                </div>
              ))}
            </div>
          </div>
        )}

        {!done && !scanning && !cleaning && items.length === 0 && (
          <button onClick={scan} className="rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-white">
            Начать проверку
          </button>
        )}
        {scanning && (
          <button disabled className="rounded-xl bg-zinc-300 px-5 py-2 text-sm text-zinc-500">
            Сканирование...
          </button>
        )}
        {!scanning && !cleaning && !done && items.length > 0 && (
          <button onClick={clean} className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-600">
            <Trash2 className="h-4 w-4" /> Очистить {totalJunk} МБ
          </button>
        )}
      </div>
    </div>
  );
}
