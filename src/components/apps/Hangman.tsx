"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

const WORDS = ["БОБЁР", "ПЛОТИНА", "ВЕТКА", "РЕКА", "ХВОСТ", "РЕЗЕЦ", "БРЕВНО", "БАРСУК", "ЛЕС", "ВОДА", "ГРЫЗУН", "ПЕЩЕРА"];
const MAX_WRONG = 6;

function pickWord() { return WORDS[Math.floor(Math.random() * WORDS.length)]; }

export function Hangman() {
  const [word, setWord] = useState(pickWord);
  const [guessed, setGuessed] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState(0);
  const alphabet = "АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ".split("");

  const won = word.split("").every((c) => guessed.has(c));
  const lost = wrong >= MAX_WRONG;
  const over = won || lost;

  const guess = (letter: string) => {
    if (over || guessed.has(letter)) return;
    const next = new Set(guessed); next.add(letter);
    const isCorrect = word.includes(letter);
    if (!isCorrect) setWrong((w) => w + 1);
    const willWin = word.split("").every((c) => next.has(c));
    if (willWin) { alphabet.forEach((l) => next.add(l)); }
    setGuessed(next);
  };

  const reset = () => { setWord(pickWord()); setGuessed(new Set()); setWrong(0); };

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-rose-50 to-red-100">
      <div className="flex items-center justify-between bg-gradient-to-r from-rose-500 to-red-700 px-4 py-3 text-white">
        <h1 className="text-lg font-bold">Виселица</h1>
        <span className="text-xs">Ошибки: <b className="font-mono">{wrong}/{MAX_WRONG}</b></span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
        {/* gallows drawing */}
        <svg viewBox="0 0 200 200" className="h-40 w-40">
          <line x1="20" y1="190" x2="120" y2="190" stroke="#7c2d12" strokeWidth="6" strokeLinecap="round" />
          <line x1="50" y1="190" x2="50" y2="20" stroke="#7c2d12" strokeWidth="6" strokeLinecap="round" />
          <line x1="50" y1="20" x2="140" y2="20" stroke="#7c2d12" strokeWidth="6" strokeLinecap="round" />
          <line x1="140" y1="20" x2="140" y2="45" stroke="#7c2d12" strokeWidth="4" strokeLinecap="round" />
          {wrong > 0 && <circle cx="140" cy="60" r="15" stroke="#7c2d12" strokeWidth="4" fill="none" />}
          {wrong > 1 && <line x1="140" y1="75" x2="140" y2="130" stroke="#7c2d12" strokeWidth="4" strokeLinecap="round" />}
          {wrong > 2 && <line x1="140" y1="90" x2="115" y2="115" stroke="#7c2d12" strokeWidth="4" strokeLinecap="round" />}
          {wrong > 3 && <line x1="140" y1="90" x2="165" y2="115" stroke="#7c2d12" strokeWidth="4" strokeLinecap="round" />}
          {wrong > 4 && <line x1="140" y1="130" x2="115" y2="165" stroke="#7c2d12" strokeWidth="4" strokeLinecap="round" />}
          {wrong > 5 && <line x1="140" y1="130" x2="165" y2="165" stroke="#7c2d12" strokeWidth="4" strokeLinecap="round" />}
        </svg>

        {/* word */}
        <div className="flex gap-1.5">
          {word.split("").map((c, i) => (
            <div key={i} className="grid h-10 w-8 place-items-center border-b-2 border-rose-400 text-2xl font-black text-rose-800">
              {guessed.has(c) || lost ? c : ""}
            </div>
          ))}
        </div>

        {over && (
          <div className={cn("rounded-2xl px-6 py-2 text-center text-white shadow-lg", won ? "bg-emerald-500" : "bg-rose-600")}>
            <p className="text-lg font-black">{won ? "Победа! 🎉" : "Повешен... 😵"}</p>
            {!won && <p className="text-xs">Слово было: {word}</p>}
          </div>
        )}

        {/* keyboard */}
        <div className="grid grid-cols-8 gap-1">
          {alphabet.map((l) => {
            const used = guessed.has(l);
            const correct = used && word.includes(l);
            return (
              <button
                key={l}
                onClick={() => guess(l)}
                disabled={used || over}
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-lg text-sm font-bold transition-all",
                  correct ? "bg-emerald-500 text-white" : used ? "bg-zinc-400 text-zinc-700" : "bg-white text-rose-700 hover:bg-rose-100",
                  over && !used && "opacity-50"
                )}
              >
                {l}
              </button>
            );
          })}
        </div>

        <button onClick={reset} className="flex items-center gap-2 rounded-xl bg-rose-500 px-5 py-2 text-sm font-medium text-white hover:bg-rose-600">
          <RotateCcw className="h-4 w-4" /> {over ? "Новая игра" : "Заново"}
        </button>
      </div>
    </div>
  );
}
