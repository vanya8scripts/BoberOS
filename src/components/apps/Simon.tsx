"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

const PADS = [
  { id: 0, color: "bg-emerald-500", active: "bg-emerald-300", freq: 329.63, name: "do" },
  { id: 1, color: "bg-sky-500", active: "bg-sky-300", freq: 392.0, name: "re" },
  { id: 2, color: "bg-amber-500", active: "bg-amber-300", freq: 440.0, name: "mi" },
  { id: 3, color: "bg-rose-500", active: "bg-rose-300", freq: 523.25, name: "fa" },
];

export function Simon() {
  const [sequence, setSequence] = useState<number[]>([]);
  const [playing, setPlaying] = useState(false);
  const [activePad, setActivePad] = useState<number | null>(null);
  const [userIdx, setUserIdx] = useState(0);
  const [phase, setPhase] = useState<"ready" | "showing" | "input" | "over">("ready");
  const [best, setBest] = useState(0);
  const audioRef = useRef<AudioContext | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const beep = (freq: number) => {
    try {
      if (!audioRef.current) audioRef.current = new AudioContext();
      const ctx = audioRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.3);
    } catch { /* noop */ }
  };

  const flash = (pad: number) => {
    setActivePad(pad);
    beep(PADS[pad].freq);
    const t = setTimeout(() => setActivePad(null), 400);
    timers.current.push(t);
  };

  const showSequence = (seq: number[]) => {
    setPhase("showing");
    seq.forEach((p, i) => {
      const t1 = setTimeout(() => flash(p), 600 * i + 500);
      timers.current.push(t1);
    });
    const t2 = setTimeout(() => { setPhase("input"); setUserIdx(0); }, 600 * seq.length + 500);
    timers.current.push(t2);
  };

  const start = () => {
    timers.current.forEach(clearTimeout); timers.current = [];
    const first = [Math.floor(Math.random() * 4)];
    setSequence(first);
    setPlaying(true);
    showSequence(first);
  };

  const press = (pad: number) => {
    if (phase !== "input") return;
    flash(pad);
    if (sequence[userIdx] === pad) {
      const next = userIdx + 1;
      if (next === sequence.length) {
        const grown = [...sequence, Math.floor(Math.random() * 4)];
        setSequence(grown);
        if (grown.length - 1 > best) setBest(grown.length - 1);
        setPhase("showing");
        const t = setTimeout(() => showSequence(grown), 700);
        timers.current.push(t);
      } else {
        setUserIdx(next);
      }
    } else {
      setPhase("over");
      setPlaying(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-zinc-900 to-fuchsia-950 text-white">
      <div className="flex items-center justify-between bg-gradient-to-r from-fuchsia-600 to-pink-700 px-4 py-3">
        <h1 className="text-lg font-bold">Симон</h1>
        <div className="flex gap-4 text-xs">
          <span>Раунд: <b className="font-mono">{sequence.length}</b></span>
          <span>Рекорд: <b className="font-mono">{best}</b></span>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
        <div className="relative grid grid-cols-2 gap-3 rounded-full bg-zinc-800 p-3">
          {PADS.map((p) => (
            <button
              key={p.id}
              onClick={() => press(p.id)}
              disabled={phase !== "input"}
              className={cn(
                "h-28 w-28 rounded-full transition-all duration-100 sm:h-32 sm:w-32",
                activePad === p.id ? p.active + " scale-95 brightness-150" : p.color,
                phase === "input" && "hover:brightness-110 cursor-pointer"
              )}
            />
          ))}
          <div className="absolute left-1/2 top-1/2 grid h-20 w-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-zinc-900 text-center">
            {phase === "ready" && <Play className="h-6 w-6 text-fuchsia-400" />}
            {phase === "showing" && <span className="text-[10px] text-white/60">Смотри...</span>}
            {phase === "input" && <span className="text-[10px] text-emerald-400">Повторяй!</span>}
            {phase === "over" && <span className="text-[10px] text-rose-400">Провал</span>}
          </div>
        </div>

        {phase === "ready" && (
          <button onClick={start} className="flex items-center gap-2 rounded-xl bg-fuchsia-500 px-6 py-2.5 text-sm font-bold hover:bg-fuchsia-600">
            <Play className="h-4 w-4" /> Начать
          </button>
        )}
        {phase === "over" && (
          <div className="text-center">
            <p className="text-xl font-black text-rose-400">Игра окончена</p>
            <p className="text-xs text-white/60">Достигнут раунд {sequence.length}</p>
            <button onClick={start} className="mt-2 rounded-xl bg-fuchsia-500 px-5 py-2 text-sm font-bold hover:bg-fuchsia-600">Ещё раз</button>
          </div>
        )}
        <p className="flex items-center gap-1 text-[11px] text-white/40"><Volume2 className="h-3 w-3" /> Включите звук</p>
      </div>
    </div>
  );
}
