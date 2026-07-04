"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface Card {
  id: number;
  emoji: string;
  matched: boolean;
}

const EMOJIS = ["🐹", "🌿", "🌲", "🌊", "🏞️", "😁", "🌳", "🍂"];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeDeck(): Card[] {
  return shuffle(
    [...EMOJIS, ...EMOJIS].map((emoji, i) => ({ id: i, emoji, matched: false }))
  );
}

export function Memory() {
  const [cards, setCards] = useState<Card[]>(makeDeck);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [lock, setLock] = useState(false);

  const matchedCount = cards.filter((c) => c.matched).length;
  const won = matchedCount === cards.length;

  const click = (idx: number) => {
    if (lock) return;
    if (flipped.includes(idx)) return;
    if (cards[idx].matched) return;
    const next = [...flipped, idx];
    setFlipped(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      setLock(true);
      const [a, b] = next;
      if (cards[a].emoji === cards[b].emoji) {
        setTimeout(() => {
          setCards((cs) =>
            cs.map((c, i) =>
              i === a || i === b ? { ...c, matched: true } : c
            )
          );
          setFlipped([]);
          setLock(false);
        }, 500);
      } else {
        setTimeout(() => {
          setFlipped([]);
          setLock(false);
        }, 900);
      }
    }
  };

  const reset = () => {
    setCards(makeDeck());
    setFlipped([]);
    setMoves(0);
    setLock(false);
  };

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-rose-50 to-pink-100">
      <div className="flex items-center justify-between bg-gradient-to-r from-rose-500 to-pink-600 px-4 py-3 text-white">
        <h1 className="text-lg font-bold">Память Бобра</h1>
        <div className="flex gap-4 text-xs">
          <span>Ходы: <b className="font-mono">{moves}</b></span>
          <span>Пары: <b className="font-mono">{matchedCount / 2}/{EMOJIS.length}</b></span>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
        {won && (
          <div className="rounded-2xl bg-emerald-500 px-6 py-3 text-center text-white shadow-lg">
            <p className="text-lg font-black">Победа! 🎉</p>
            <p className="text-xs">Найдено за {moves} ходов</p>
          </div>
        )}
        <div className="grid grid-cols-4 gap-2">
          {cards.map((card, idx) => {
            const isFlipped = flipped.includes(idx) || card.matched;
            return (
              <button
                key={card.id}
                onClick={() => click(idx)}
                className="relative h-20 w-20 [perspective:600px]"
                disabled={card.matched}
              >
                <div
                  className={cn(
                    "relative h-full w-full rounded-xl transition-transform duration-300 [transform-style:preserve-3d]",
                    isFlipped && "[transform:rotateY(180deg)]"
                  )}
                >
                  {/* back */}
                  <div className="absolute inset-0 grid place-items-center rounded-xl bg-gradient-to-br from-rose-400 to-pink-600 text-2xl text-white shadow [backface-visibility:hidden]">
                    🐾
                  </div>
                  {/* front */}
                  <div
                    className={cn(
                      "absolute inset-0 grid place-items-center rounded-xl border-2 bg-white text-4xl shadow [backface-visibility:hidden] [transform:rotateY(180deg)]",
                      card.matched ? "border-emerald-400 bg-emerald-50" : "border-rose-200"
                    )}
                  >
                    {card.emoji}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <button
          onClick={reset}
          className="rounded-xl bg-rose-500 px-5 py-2 text-sm font-medium text-white hover:bg-rose-600"
        >
          {won ? "Играть снова" : "Начать заново"}
        </button>
      </div>
    </div>
  );
}
