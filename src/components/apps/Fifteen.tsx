"use client";

import { useState, useCallback } from "react";
import { Shuffle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

function solved(): number[] {
  return [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,0];
}

function shuffle(): number[] {
  let arr = solved();
  for (let i = 0; i < 200; i++) {
    const zero = arr.indexOf(0);
    const moves = neighbors(zero);
    const pick = moves[Math.floor(Math.random() * moves.length)];
    [arr[zero], arr[pick]] = [arr[pick], arr[zero]];
  }
  return arr;
}

function neighbors(i: number): number[] {
  const r = Math.floor(i / 4), c = i % 4;
  const res: number[] = [];
  if (r > 0) res.push(i - 4);
  if (r < 3) res.push(i + 4);
  if (c > 0) res.push(i - 1);
  if (c < 3) res.push(i + 1);
  return res;
}

export function Fifteen() {
  const [board, setBoard] = useState(shuffle);
  const [moves, setMoves] = useState(0);
  const [best, setBest] = useState<number | null>(null);
  const won = board.every((v, i) => (i === 15 ? v === 0 : v === i + 1));

  const move = useCallback((idx: number) => {
    if (won) return;
    const zero = board.indexOf(0);
    if (neighbors(zero).includes(idx)) {
      const next = [...board];
      [next[zero], next[idx]] = [next[idx], next[zero]];
      setBoard(next);
      setMoves((m) => {
        const nm = m + 1;
        const isWin = next.every((v, i) => (i === 15 ? v === 0 : v === i + 1));
        if (isWin && nm > 0) setBest((b) => (b === null || nm < b ? nm : b));
        return nm;
      });
    }
  }, [board, won]);

  const reset = () => { setBoard(shuffle()); setMoves(0); };

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-yellow-50 to-amber-100">
      <div className="flex items-center justify-between bg-gradient-to-r from-yellow-500 to-amber-600 px-4 py-3 text-white">
        <h1 className="text-lg font-bold">Пятнашки</h1>
        <div className="flex gap-4 text-xs">
          <span>Ходы: <b className="font-mono">{moves}</b></span>
          {best !== null && <span>Рекорд: <b className="font-mono">{best}</b></span>}
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
        {won && (
          <div className="rounded-2xl bg-emerald-500 px-6 py-3 text-center text-white shadow-lg">
            <p className="text-lg font-black flex items-center gap-2"><Check className="h-5 w-5" /> Победа!</p>
            <p className="text-xs">Собрано за {moves} ходов</p>
          </div>
        )}
        <div className="grid grid-cols-4 gap-2 rounded-2xl bg-amber-800 p-2 shadow-xl">
          {board.map((v, i) => (
            <button
              key={i}
              onClick={() => move(i)}
              disabled={v === 0}
              className={cn(
                "grid h-16 w-16 place-items-center rounded-xl text-2xl font-black transition-all active:scale-95 sm:h-20 sm:w-20",
                v === 0 ? "invisible" : "bg-gradient-to-br from-amber-100 to-amber-300 text-amber-900 shadow-md hover:from-amber-200 hover:to-amber-400"
              )}
            >
              {v || ""}
            </button>
          ))}
        </div>
        <button onClick={reset} className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2 text-sm font-medium text-white hover:bg-amber-600">
          <Shuffle className="h-4 w-4" /> {won ? "Ещё раз" : "Перемешать"}
        </button>
      </div>
    </div>
  );
}
