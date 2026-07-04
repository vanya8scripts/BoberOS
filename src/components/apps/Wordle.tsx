"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CornerDownLeft, Delete, RotateCcw, Trophy } from "lucide-react";

const WORDS = [
  "БОБЁР", "БОБРЫ", "БОБРА", "БОБРУ", "ХАТКА", "ХАТКИ",
  "ВЕТКА", "ХВОСТ", "РЕЗЕЦ", "ЛЕСОК", "ДУБОВ", "ЗАЦЕП",
  "ПЕНОК", "БОЛОТ", "КАМЫШ", "РЕЧКА", "РУЧЬЯ", "ОЗЕРА",
  "ПРУДЫ", "ПЕЩЕР", "ОВРАГ", "ПОЧВА", "СЕВЕР", "ЗАПАД",
  "БЕРЁГ", "ЗАЛИВ", "ЗЕМЛЯ", "ТРАВА", "ТРАВЫ", "КОРНИ",
  "ЦВЕТЫ", "ШИШКИ", "ОРЕХИ", "ЯГОДЫ", "ГРИБЫ", "СОСНЫ",
  "ОЛЬХА", "БЕРЁЗ", "КЕДРЫ", "СМОЛА", "ПЕСОК", "ЗВЕРЬ",
  "ВЫДРА", "ВЫДРЫ", "КРОТЫ", "НОРКА", "НОРКИ", "ХОМЯК",
  "БЕЛКА", "БУРЫЙ", "ПЛОТЬ",
];

const WORD_LEN = 5;
const MAX_GUESSES = 6;

type LetterState = "c" | "p" | "a";

const RANK: Record<LetterState, number> = { a: 0, p: 1, c: 2 };

const KEYBOARD_ROWS: string[][] = [
  "ЙЦУКЕНГШЩЗХЪ".split(""),
  "ФЫВАПРОЛДЖЭ".split(""),
  "ЯЧСМИТЬБЮ".split(""),
];

function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

function pickTarget(exclude?: string): string {
  const pool = exclude ? WORDS.filter((w) => w !== exclude) : WORDS;
  return pool[Math.floor(Math.random() * pool.length)];
}

function evaluate(guess: string, target: string): LetterState[] {
  const res: LetterState[] = Array(WORD_LEN).fill("a");
  const used = Array(WORD_LEN).fill(false);
  for (let i = 0; i < WORD_LEN; i++) {
    if (guess[i] === target[i]) {
      res[i] = "c";
      used[i] = true;
    }
  }
  for (let i = 0; i < WORD_LEN; i++) {
    if (res[i] === "c") continue;
    for (let j = 0; j < WORD_LEN; j++) {
      if (!used[j] && guess[i] === target[j]) {
        res[i] = "p";
        used[j] = true;
        break;
      }
    }
  }
  return res;
}

function upgrade(prev: LetterState | undefined, next: LetterState): LetterState {
  if (!prev) return next;
  return RANK[prev] >= RANK[next] ? prev : next;
}

export function Wordle() {
  const [target, setTarget] = useState<string>(() => pickTarget());
  const [guesses, setGuesses] = useState<string[]>([]);
  const [results, setResults] = useState<LetterState[][]>([]);
  const [current, setCurrent] = useState("");
  const [keyStates, setKeyStates] = useState<Record<string, LetterState>>({});
  const [over, setOver] = useState<null | "win" | "lose">(null);
  const [shake, setShake] = useState(false);
  const [reveal, setReveal] = useState(false);
  const shakeTimer = useRef<number | null>(null);

  const triggerShake = useCallback(() => {
    setShake(true);
    if (shakeTimer.current !== null) window.clearTimeout(shakeTimer.current);
    shakeTimer.current = window.setTimeout(() => setShake(false), 450);
  }, []);

  const submit = useCallback(() => {
    if (over) return;
    if (current.length !== WORD_LEN) {
      triggerShake();
      return;
    }
    const res = evaluate(current, target);
    const newKeys = { ...keyStates };
    for (let i = 0; i < WORD_LEN; i++) {
      const ch = current[i];
      newKeys[ch] = upgrade(newKeys[ch], res[i]);
    }
    setKeyStates(newKeys);
    setResults((r) => [...r, res]);
    setGuesses((g) => [...g, current]);
    const wasWin = current === target;
    const nextCount = guesses.length + 1;
    setCurrent("");
    if (wasWin) {
      setOver("win");
      setReveal(true);
    } else if (nextCount >= MAX_GUESSES) {
      setOver("lose");
      setReveal(true);
    }
  }, [over, current, target, keyStates, guesses.length, triggerShake]);

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (over) return;
      const k = e.key.toUpperCase();
      if (k === "BACKSPACE") {
        setCurrent((c) => c.slice(0, -1));
      } else if (k === "ENTER") {
        submit();
      } else if (/^[А-ЯЁ]$/.test(k) && current.length < WORD_LEN) {
        setCurrent((c) => c + k);
      }
    },
    [over, current.length, submit]
  );

  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);

  useEffect(() => {
    return () => {
      if (shakeTimer.current !== null) window.clearTimeout(shakeTimer.current);
    };
  }, []);

  const pressKey = useCallback(
    (ch: string) => {
      if (over) return;
      if (current.length < WORD_LEN) setCurrent((c) => c + ch);
    },
    [over, current.length]
  );

  const backspace = useCallback(() => {
    if (over) return;
    setCurrent((c) => c.slice(0, -1));
  }, [over]);

  const reset = useCallback(() => {
    setTarget((prev) => pickTarget(prev));
    setGuesses([]);
    setResults([]);
    setCurrent("");
    setKeyStates({});
    setOver(null);
    setReveal(false);
    setShake(false);
  }, []);

  const rows = useMemo(() => {
    const list: { word: string; result: LetterState[] | null }[] = [];
    for (let i = 0; i < MAX_GUESSES; i++) {
      if (i < guesses.length) {
        list.push({ word: guesses[i], result: results[i] ?? null });
      } else if (i === guesses.length) {
        list.push({ word: current, result: null });
      } else {
        list.push({ word: "", result: null });
      }
    }
    return list;
  }, [guesses, results, current]);

  return (
    <div className="flex h-full min-h-[600px] flex-col bg-gradient-to-b from-amber-50 to-orange-100">
      <style>{`
        @keyframes bobrShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-5px); }
          40% { transform: translateX(5px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        @keyframes bobrPop {
          0% { transform: scale(0.85); }
          60% { transform: scale(1.08); }
          100% { transform: scale(1); }
        }
      `}</style>
      <div className="flex items-center justify-between bg-gradient-to-r from-amber-700 to-orange-800 px-4 py-2.5 text-white">
        <h1 className="flex items-center gap-2 text-sm font-bold">
          <span className="text-base">🐹</span>
          БобрВорд
        </h1>
        <button
          onClick={reset}
          className="flex items-center gap-1 rounded-lg bg-white/20 px-2.5 py-1 text-[11px] font-semibold hover:bg-white/30"
        >
          <RotateCcw className="h-3 w-3" />
          Новая
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-between gap-2 p-3">
        <div className="flex flex-col items-center gap-3">
          <p className="text-center text-[11px] text-amber-900/70">
            Угадай слово за 6 попыток.
            <br />
            <span className="text-emerald-700">Зелёный</span> — на месте,
            <span className="text-amber-600"> жёлтый</span> — буква есть,
            <span className="text-zinc-600"> серый</span> — нет.
          </p>

          <div
            className="grid grid-rows-6 gap-1.5"
            style={shake ? { animation: "bobrShake 0.45s ease-in-out" } : undefined}
          >
            {rows.map((row, r) => (
              <div key={r} className="grid grid-cols-5 gap-1.5">
                {Array.from({ length: WORD_LEN }).map((_, c) => {
                  const ch = row.word[c] ?? "";
                  const res = row.result?.[c];
                  const isFilled = ch !== "";
                  return (
                    <div
                      key={c}
                      className={cn(
                        "grid h-12 w-12 place-items-center border-2 text-xl font-black uppercase transition-colors duration-150 sm:h-14 sm:w-14",
                        !isFilled && "border-amber-300 bg-amber-50/40",
                        isFilled && !res && "border-amber-500 bg-amber-100",
                        res === "a" && "border-zinc-600 bg-zinc-600 text-white",
                        res === "p" && "border-amber-500 bg-amber-500 text-white",
                        res === "c" && "border-emerald-600 bg-emerald-600 text-white"
                      )}
                      style={
                        res
                          ? { animation: `bobrPop 0.3s ease-out ${c * 0.08}s both` }
                          : undefined
                      }
                    >
                      {ch}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="flex min-h-[44px] items-center justify-center">
            {over && (
              <div
                className={cn(
                  "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white shadow-lg",
                  over === "win" ? "bg-emerald-600" : "bg-zinc-800"
                )}
              >
                <Trophy className="h-4 w-4" />
                {over === "win"
                  ? `Победа за ${guesses.length} ${guesses.length === 1 ? "попытку" : "попытки"}!`
                  : `Не угадал. Слово: ${target}`}
              </div>
            )}
            {reveal && over === "win" && (
              <div className="ml-2 text-2xl">🐹</div>
            )}
          </div>
        </div>

        <div className="flex w-full max-w-md flex-col gap-1">
          {KEYBOARD_ROWS.map((row, ri) => (
            <div key={ri} className="flex justify-center gap-1">
              {ri === 2 && (
                <button
                  onClick={submit}
                  disabled={current.length !== WORD_LEN || !!over}
                  aria-label="Ввод"
                  className="grid h-11 w-12 place-items-center rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <CornerDownLeft className="h-4 w-4" />
                </button>
              )}
              {row.map((ch) => {
                const st = keyStates[ch];
                return (
                  <button
                    key={ch}
                    onClick={() => pressKey(ch)}
                    disabled={!!over}
                    className={cn(
                      "grid h-11 w-8 place-items-center rounded-md text-sm font-bold transition-colors sm:w-9",
                      st === "c" && "bg-emerald-600 text-white",
                      st === "p" && "bg-amber-500 text-white",
                      st === "a" && "bg-zinc-600 text-white",
                      !st && "bg-white text-zinc-800 hover:bg-amber-100",
                      over && "opacity-60"
                    )}
                  >
                    {ch}
                  </button>
                );
              })}
              {ri === 2 && (
                <button
                  onClick={backspace}
                  disabled={!!over}
                  aria-label="Стереть"
                  className="grid h-11 w-12 place-items-center rounded-md bg-zinc-300 text-zinc-800 hover:bg-zinc-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Delete className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
