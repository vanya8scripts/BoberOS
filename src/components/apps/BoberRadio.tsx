"use client";

import { useEffect, useRef, useState } from "react";
import { Radio, Play, Pause, SkipForward, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STATIONS = [
  { name: "Бобро FM", freq: "101.5", desc: "Хиты про бобров 24/7", color: "from-rose-500 to-pink-700", emoji: "🎵" },
  { name: "Плотина Радио", freq: "98.3", desc: "Только бобро-рок", color: "from-amber-500 to-orange-700", emoji: "🎸" },
  { name: "Речная волна", freq: "104.7", desc: "Спокойная музыка у воды", color: "from-sky-500 to-blue-700", emoji: "🌊" },
  { name: "Барсук-Станция", freq: "89.1", desc: "Анти-барсучьи разговоры", color: "from-zinc-500 to-zinc-700", emoji: "🎙️" },
  { name: "Ночной грызун", freq: "107.9", desc: "Lo-fi для ночного грызения", color: "from-indigo-500 to-purple-800", emoji: "🌙" },
];

export function BoberRadio() {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(70);
  const [bars, setBars] = useState<number[]>(Array(24).fill(20));
  const ivRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const station = STATIONS[idx];

  useEffect(() => {
    if (playing) {
      ivRef.current = setInterval(() => {
        setBars((b) => b.map(() => Math.random() * 80 + 20));
      }, 120);
    } else {
      if (ivRef.current) clearInterval(ivRef.current);
    }
    return () => { if (ivRef.current) clearInterval(ivRef.current); };
  }, [playing]);

  const next = () => setIdx((i) => (i + 1) % STATIONS.length);

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-zinc-900 to-black text-white">
      {/* visualizer */}
      <div className="flex h-32 items-end justify-center gap-0.5 bg-gradient-to-b from-black/40 to-transparent p-4">
        {bars.map((h, i) => (
          <div
            key={i}
            className="w-2 rounded-t bg-gradient-to-t from-fuchsia-600 to-pink-300 transition-[height] duration-100"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>

      {/* now playing */}
      <div className={cn("bg-gradient-to-br p-5 text-center", station.color)}>
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-white/20 text-4xl backdrop-blur">
          {station.emoji}
        </div>
        <h2 className="mt-3 text-xl font-black">{station.name}</h2>
        <p className="text-sm text-white/80">{station.freq} МГц · {station.desc}</p>
      </div>

      {/* controls */}
      <div className="flex items-center justify-center gap-4 py-4">
        <button
          onClick={() => setPlaying((p) => !p)}
          className="grid h-12 w-12 place-items-center rounded-full bg-white text-black shadow-lg hover:scale-105"
        >
          {playing ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 translate-x-0.5" />}
        </button>
        <button onClick={next} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20">
          <SkipForward className="h-5 w-5" />
        </button>
      </div>

      {/* volume */}
      <div className="flex items-center gap-2 px-6 py-2">
        <Volume2 className="h-4 w-4 text-white/60" />
        <input
          type="range"
          min={0}
          max={100}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="flex-1 accent-pink-500"
        />
        <span className="w-8 text-right text-xs font-mono text-white/60">{volume}</span>
      </div>

      {/* stations list */}
      <div className="bober-scroll flex-1 overflow-y-auto border-t border-white/10 p-2">
        {STATIONS.map((s, i) => (
          <button
            key={s.name}
            onClick={() => { setIdx(i); setPlaying(true); }}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors",
              i === idx ? "bg-white/15" : "hover:bg-white/5"
            )}
          >
            <div className={cn("grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br text-xl", s.color)}>
              {s.emoji}
            </div>
            <div className="min-w-0 flex-1">
              <p className={cn("truncate text-sm", i === idx ? "font-bold text-white" : "text-white/80")}>{s.name}</p>
              <p className="truncate text-[11px] text-white/40">{s.freq} МГц · {s.desc}</p>
            </div>
            <Radio className={cn("h-4 w-4", i === idx && playing ? "text-pink-400" : "text-white/20")} />
          </button>
        ))}
      </div>
    </div>
  );
}
