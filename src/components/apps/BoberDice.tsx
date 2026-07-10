"use client";

import { useState } from "react";
import { Dices, RefreshCw } from "lucide-react";

export function BoberDice() {
  const [dice, setDice] = useState<number[]>([1, 1]);
  const [rolling, setRolling] = useState(false);
  const [count, setCount] = useState(2);
  const [sides, setSides] = useState(6);
  const [history, setHistory] = useState<string[]>([]);

  const roll = () => {
    if (rolling) return;
    setRolling(true);
    let ticks = 0;
    const iv = setInterval(() => {
      const result = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
      setDice(result);
      ticks++;
      if (ticks > 10) {
        clearInterval(iv);
        const finalResult = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
        setDice(finalResult);
        const sum = finalResult.reduce((a, b) => a + b, 0);
        setHistory((h) => [`[${finalResult.join(", ")}] = ${sum}`, ...h].slice(0, 10));
        setRolling(false);
      }
    }, 60);
  };

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-emerald-900 to-zinc-900 text-white">
      <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-700 px-4 py-3">
        <Dices className="h-5 w-5" />
        <h1 className="text-sm font-bold">BoberDice</h1>
        <span className="text-xs text-white/60">Генератор случайных чисел</span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
        <div className="flex flex-wrap justify-center gap-3">
          {dice.map((d, i) => (
            <div key={i} className={`grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 text-4xl font-black shadow-xl transition-transform ${rolling ? "animate-pulse scale-90" : "scale-100"}`}>
              {d}
            </div>
          ))}
        </div>

        <div className="text-2xl font-bold">
          Сумма: {dice.reduce((a, b) => a + b, 0)}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-xs">
            Кубиков:
            <select value={count} onChange={(e) => setCount(Number(e.target.value))} className="rounded-lg bg-white/10 px-2 py-1 text-sm outline-none">
              {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n} className="bg-zinc-800">{n}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs">
            Граней:
            <select value={sides} onChange={(e) => setSides(Number(e.target.value))} className="rounded-lg bg-white/10 px-2 py-1 text-sm outline-none">
              {[4, 6, 8, 10, 12, 20, 100].map((n) => <option key={n} value={n} className="bg-zinc-800">D{n}</option>)}
            </select>
          </label>
          <button onClick={roll} disabled={rolling} className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-bold text-zinc-900 hover:bg-amber-400 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${rolling ? "animate-spin" : ""}`} /> Бросить!
          </button>
        </div>

        {history.length > 0 && (
          <div className="w-full max-w-md">
            <p className="mb-1 text-[11px] uppercase tracking-wide text-white/40">История</p>
            <div className="space-y-1">
              {history.map((h, i) => (
                <div key={i} className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-mono text-white/70">{h}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
