"use client";

import { useState } from "react";
import { useOS } from "@/lib/os-store";

type Choice = "rock" | "scissors" | "paper";
type Result = "win" | "lose" | "draw";

const CHOICES: { id: Choice; label: string; emoji: string }[] = [
  { id: "rock", label: "Камень", emoji: "⬜" },
  { id: "scissors", label: "Ножницы", emoji: "✂️" },
  { id: "paper", label: "Бумага", emoji: "📄" },
];

const BEAVER_TAUNTS = {
  win: ["Ха-ха! Бобёр сильнее!", "Бобёр хитрее!", "Ещё разок?", "Плотина победила!"],
  lose: ["Ну ты сиён...", "Ладно, твоя взяла.", "Бобёр в шоке.", "Реванш?"],
  draw: ["Ничья! Бобёр согласен.", "Одинаково мыслим!", "Ещё!"],
};

function judge(me: Choice, b: Choice): Result {
  if (me === b) return "draw";
  if (
    (me === "rock" && b === "scissors") ||
    (me === "scissors" && b === "paper") ||
    (me === "paper" && b === "rock")
  )
    return "win";
  return "lose";
}

export function RPS() {
  const [me, setMe] = useState<Choice | null>(null);
  const [bob, setBob] = useState<Choice | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [scores, setScores] = useState({ me: 0, bob: 0, draw: 0 });
  const [taunt, setTaunt] = useState<string>("");
  const [rolling, setRolling] = useState(false);
  const addChat = useOS((s) => s.addChatMessage);

  const play = (choice: Choice) => {
    if (rolling) return;
    setMe(choice);
    setBob(null);
    setResult(null);
    setRolling(true);
    let ticks = 0;
    const iv = setInterval(() => {
      setBob(CHOICES[Math.floor(Math.random() * 3)].id);
      ticks++;
      if (ticks > 10) {
        clearInterval(iv);
        const bChoice = CHOICES[Math.floor(Math.random() * 3)].id;
        setBob(bChoice);
        const r = judge(choice, bChoice);
        setResult(r);
        setRolling(false);
        if (r === "win") setScores((s) => ({ ...s, me: s.me + 1 }));
        else if (r === "lose") setScores((s) => ({ ...s, bob: s.bob + 1 }));
        else setScores((s) => ({ ...s, draw: s.draw + 1 }));
        const list = BEAVER_TAUNTS[r];
        setTaunt(list[Math.floor(Math.random() * list.length)]);
        addChat("beaver", `Сыграл в КНБ: ${r === "win" ? "я выиграл!" : r === "lose" ? "проиграл :(" : "ничья"}`);
      }
    }, 80);
  };

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-teal-50 to-cyan-100">
      <div className="flex items-center justify-between bg-gradient-to-r from-teal-500 to-cyan-600 px-4 py-3 text-white">
        <h1 className="text-lg font-bold">Камень-Ножницы-Бумага</h1>
        <div className="flex gap-3 text-xs">
          <span>Ты: <b className="font-mono">{scores.me}</b></span>
          <span>Бобёр: <b className="font-mono">{scores.bob}</b></span>
          <span>Ничьи: <b className="font-mono">{scores.draw}</b></span>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
        {/* arena */}
        <div className="flex w-full max-w-md items-center justify-around">
          <PlayerCard label="Ты" choice={me} rolling={rolling} color="text-teal-600" />
          <div className="text-3xl font-black text-zinc-400">VS</div>
          <PlayerCard label="Бобёр" choice={bob} rolling={rolling} color="text-amber-600" />
        </div>

        {result && (
          <div
            className={`rounded-full px-5 py-1.5 text-sm font-bold ${
              result === "win"
                ? "bg-teal-500 text-white"
                : result === "lose"
                ? "bg-rose-500 text-white"
                : "bg-zinc-400 text-white"
            }`}
          >
            {result === "win" ? "Ты победил!" : result === "lose" ? "Бобёр победил!" : "Ничья!"}
          </div>
        )}
        {taunt && <p className="text-sm italic text-zinc-500">«{taunt}»</p>}

        {/* choices */}
        <div className="flex gap-3">
          {CHOICES.map((c) => (
            <button
              key={c.id}
              onClick={() => play(c.id)}
              disabled={rolling}
              className="flex flex-col items-center gap-1 rounded-2xl border-2 border-teal-200 bg-white px-5 py-3 transition-all hover:scale-105 hover:border-teal-400 disabled:opacity-50"
            >
              <span className="text-4xl">{c.emoji}</span>
              <span className="text-xs font-medium text-zinc-600">{c.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function PlayerCard({
  label,
  choice,
  rolling,
  color,
}: {
  label: string;
  choice: Choice | null;
  rolling: boolean;
  color: string;
}) {
  const c = CHOICES.find((x) => x.id === choice);
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`grid h-24 w-24 place-items-center rounded-2xl border-2 border-zinc-200 bg-white text-5xl ${
          rolling ? "animate-pulse" : ""
        }`}
      >
        {c ? c.emoji : "❓"}
      </div>
      <span className={`text-sm font-bold ${color}`}>{label}</span>
      {c && <span className="text-xs text-zinc-400">{c.label}</span>}
    </div>
  );
}
