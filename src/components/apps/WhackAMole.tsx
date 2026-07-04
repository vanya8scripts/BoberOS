"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Phase = "ready" | "playing" | "over";
const GRID = 9;
const GAME_TIME = 30;

export function WhackAMole() {
  const [phase, setPhase] = useState<Phase>("ready");
  const [active, setActive] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [miss, setMiss] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_TIME);
  const [best, setBest] = useState(0);
  const timers = useRef<ReturnType<typeof setInterval>[]>([]);

  const clearAll = () => {
    timers.current.forEach(clearInterval);
    timers.current = [];
  };

  useEffect(() => () => clearAll(), []);

  const start = () => {
    clearAll();
    setScore(0);
    setMiss(0);
    setTimeLeft(GAME_TIME);
    setPhase("playing");
    setActive(null);

    const spawn = setInterval(() => {
      setActive(Math.floor(Math.random() * GRID));
    }, 750);
    timers.current.push(spawn);

    const hide = setInterval(() => {
      setActive(null);
    }, 650);
    timers.current.push(hide);

    const cd = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearAll();
          setPhase("over");
          setActive(null);
          setBest((b) => Math.max(b, score));
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    timers.current.push(cd);
  };

  const hit = (i: number) => {
    if (phase !== "playing") return;
    if (i === active) {
      setScore((s) => {
        const ns = s + 1;
        setBest((b) => Math.max(b, ns));
        return ns;
      });
      setActive(null);
    } else {
      setMiss((m) => m + 1);
    }
  };

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-orange-50 to-amber-100">
      <div className="flex items-center justify-between bg-gradient-to-r from-orange-500 to-amber-600 px-4 py-3 text-white">
        <h1 className="text-lg font-bold">Реакция Бобра</h1>
        {phase === "playing" && (
          <div className="flex gap-4 text-xs">
            <span>Попаданий: <b className="font-mono">{score}</b></span>
            <span>Промахов: <b className="font-mono">{miss}</b></span>
            <span>⏱ <b className="font-mono">{timeLeft}</b></span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
        {phase === "ready" && (
          <div className="text-center">
            <p className="text-4xl">🐹</p>
            <h2 className="mt-2 text-xl font-black text-zinc-800">Реакция Бобра</h2>
            <p className="mt-1 max-w-xs text-sm text-zinc-500">
              Лупи бобров по голове, когда они высовываются! 30 секунд на рекорд.
            </p>
            <button
              onClick={start}
              className="mt-4 rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-orange-600"
            >
              Начать!
            </button>
            {best > 0 && <p className="mt-3 text-xs text-zinc-400">Рекорд: {best}</p>}
          </div>
        )}

        {(phase === "playing" || phase === "over") && (
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: GRID }).map((_, i) => (
              <button
                key={i}
                onMouseDown={() => hit(i)}
                className="relative h-24 w-24 overflow-hidden rounded-2xl border-4 border-amber-700 bg-gradient-to-b from-amber-800 to-amber-900 shadow-inner"
              >
                {/* hole */}
                <div className="absolute inset-x-0 bottom-0 h-10 rounded-t-[50%] bg-black/40" />
                {/* beaver pops up */}
                <div
                  className={cn(
                    "absolute inset-x-2 bottom-0 flex justify-center transition-transform duration-100",
                    active === i && phase === "playing"
                      ? "translate-y-0"
                      : "translate-y-full"
                  )}
                >
                  <span className="text-5xl drop-shadow">🐹</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {phase === "over" && (
          <div className="mt-2 text-center">
            <p className="text-2xl font-black text-zinc-800">Время вышло!</p>
            <p className="mt-1 text-sm text-zinc-600">
              Попаданий: <b>{score}</b> · Промахов: <b>{miss}</b>
            </p>
            <p className="text-xs text-amber-600">Рекорд: {Math.max(best, score)}</p>
            <button
              onClick={start}
              className="mt-3 rounded-xl bg-orange-500 px-5 py-2 text-sm font-bold text-white hover:bg-orange-600"
            >
              Ещё раз!
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
