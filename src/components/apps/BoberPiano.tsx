"use client";

import { useState, useEffect, useRef } from "react";

const NOTES: Record<string, { freq: number; label: string }> = {
  "a": { freq: 261.63, label: "C" },
  "w": { freq: 277.18, label: "C#" },
  "s": { freq: 293.66, label: "D" },
  "e": { freq: 311.13, label: "D#" },
  "d": { freq: 329.63, label: "E" },
  "f": { freq: 349.23, label: "F" },
  "t": { freq: 369.99, label: "F#" },
  "g": { freq: 392.0, label: "G" },
  "y": { freq: 415.3, label: "G#" },
  "h": { freq: 440.0, label: "A" },
  "u": { freq: 466.16, label: "A#" },
  "j": { freq: 493.88, label: "B" },
  "k": { freq: 523.25, label: "C2" },
};

const WHITE_KEYS = ["a", "s", "d", "f", "g", "h", "j", "k"];
const BLACK_KEYS: { key: string; pos: number }[] = [
  { key: "w", pos: 0 },
  { key: "e", pos: 1 },
  { key: "t", pos: 3 },
  { key: "y", pos: 4 },
  { key: "u", pos: 5 },
];

export function BoberPiano() {
  const [active, setActive] = useState<string | null>(null);
  const [recorded, setRecorded] = useState<string[]>([]);
  const [playing, setPlaying] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const activeRef = useRef<Set<string>>(new Set());

  const getCtx = (): AudioContext | null => {
    if (typeof window === "undefined") return null;
    if (!ctxRef.current) {
      try {
        ctxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      } catch { return null; }
    }
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  };

  const play = (key: string) => {
    const n = NOTES[key];
    if (!n) return;
    const ctx = getCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = n.freq;
    osc.type = "triangle";
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
    setActive(key);
    setTimeout(() => setActive((a) => (a === key ? null : a)), 200);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      if (NOTES[k]) {
        e.preventDefault();
        if (!activeRef.current.has(k)) {
          activeRef.current.add(k);
          play(k);
          setRecorded((r) => [...r, k]);
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      activeRef.current.delete(e.key.toLowerCase());
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const playRecorded = () => {
    if (playing || recorded.length === 0) return;
    setPlaying(true);
    recorded.forEach((k, i) => {
      setTimeout(() => {
        play(k);
        if (i === recorded.length - 1) setPlaying(false);
      }, i * 350);
    });
  };

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-zinc-900 to-black">
      <div className="flex items-center gap-3 bg-gradient-to-r from-fuchsia-600 to-purple-700 px-4 py-3 text-white">
        <span className="text-lg">🎹</span>
        <div>
          <h1 className="text-sm font-bold">BoberPiano</h1>
          <p className="text-[11px] text-white/70">Клавиши A S D F G H J K — белые · W E T Y U — чёрные</p>
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={() => setRecorded([])} className="rounded-lg bg-white/15 px-3 py-1 text-xs hover:bg-white/25">Очистить</button>
          <button onClick={playRecorded} disabled={playing || recorded.length === 0} className="rounded-lg bg-emerald-500 px-3 py-1 text-xs font-medium disabled:opacity-40">
            {playing ? "Играет..." : `Играть (${recorded.length})`}
          </button>
        </div>
      </div>

      <div className="flex flex-1 items-end justify-center p-4">
        <div className="relative flex">
          {WHITE_KEYS.map((k, i) => (
            <button
              key={k}
              onMouseDown={() => { play(k); setRecorded((r) => [...r, k]); }}
              onTouchStart={(e) => { e.preventDefault(); play(k); setRecorded((r) => [...r, k]); }}
              className={`relative flex h-48 w-14 items-end justify-center rounded-b-lg border border-zinc-400 pb-3 text-xs font-bold transition-colors sm:h-56 sm:w-16 ${active === k ? "bg-amber-300" : "bg-white text-zinc-800 hover:bg-amber-50"}`}
            >
              {NOTES[k]?.label}
              <span className="absolute bottom-1 text-[9px] text-zinc-400">{k.toUpperCase()}</span>
            </button>
          ))}
          {BLACK_KEYS.map(({ key: k, pos }) => (
            <button
              key={k}
              onMouseDown={() => { play(k); setRecorded((r) => [...r, k]); }}
              onTouchStart={(e) => { e.preventDefault(); play(k); setRecorded((r) => [...r, k]); }}
              className={`absolute h-28 w-8 rounded-b-lg border border-zinc-700 text-[8px] text-white transition-colors sm:h-32 sm:w-10 ${active === k ? "bg-amber-500" : "bg-zinc-900 hover:bg-zinc-700"}`}
              style={{ left: `${(pos + 1) * 56 - 16}px`, top: 0 }}
            >
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2">{k.toUpperCase()}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
