"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, SkipBack, SkipForward, Music, Volume2, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface Track {
  title: string;
  artist: string;
  duration: number;
  color: string;
}

const TRACKS: Track[] = [
  { title: "Хвост качает", artist: "DJ Бобёр", duration: 184, color: "from-pink-500 to-rose-600" },
  { title: "Песня о плотине", artist: "Бобры Украины", duration: 221, color: "from-amber-500 to-orange-600" },
  { title: "Грызу бревно", artist: "Резцы Судьбы", duration: 156, color: "from-emerald-500 to-teal-600" },
  { title: "Речной флоу", artist: "MC Хвост", duration: 198, color: "from-sky-500 to-blue-600" },
  { title: "Полночный грызун", artist: "Lo-Fi Бобёр", duration: 243, color: "from-violet-500 to-purple-600" },
  { title: "Барсук не пройдёт", artist: "Плотина Рекордс", duration: 175, color: "from-fuchsia-500 to-pink-600" },
];

export function BoberTunes() {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [liked, setLiked] = useState<Set<number>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const track = TRACKS[idx];

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setPos((p) => {
          if (p >= track.duration) {
            setIdx((i) => (i + 1) % TRACKS.length);
            return 0;
          }
          return p + 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing, track.duration]);

  const select = (i: number) => {
    setIdx(i);
    setPos(0);
    setPlaying(true);
  };

  const next = () => {
    setIdx((i) => (i + 1) % TRACKS.length);
    setPos(0);
  };
  const prev = () => {
    setIdx((i) => (i - 1 + TRACKS.length) % TRACKS.length);
    setPos(0);
  };

  const toggleLike = (i: number) => {
    setLiked((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i); else n.add(i);
      return n;
    });
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-zinc-900 to-black text-white">
      {/* now playing */}
      <div className={cn("bg-gradient-to-br p-5", track.color)}>
        <div className="flex items-center gap-4">
          <div className={cn("grid h-24 w-24 shrink-0 place-items-center rounded-2xl bg-black/20 shadow-xl", track.color)}>
            <Music className="h-10 w-10 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-wider text-white/70">
              {playing ? "Сейчас играет" : "На паузе"}
            </p>
            <h2 className="truncate text-xl font-black">{track.title}</h2>
            <p className="truncate text-sm text-white/80">{track.artist}</p>
            <button
              onClick={() => toggleLike(idx)}
              className="mt-1 flex items-center gap-1 text-xs text-white/70 hover:text-white"
            >
              <Heart className={cn("h-3.5 w-3.5", liked.has(idx) && "fill-rose-500 text-rose-500")} />
              {liked.has(idx) ? "В избранном" : "В избранное"}
            </button>
          </div>
        </div>

        {/* progress */}
        <div className="mt-4">
          <div
            className="h-1.5 w-full cursor-pointer overflow-hidden rounded-full bg-black/30"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setPos(Math.floor(((e.clientX - rect.left) / rect.width) * track.duration));
            }}
          >
            <div
              className="h-full rounded-full bg-white"
              style={{ width: `${(pos / track.duration) * 100}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-white/70">
            <span>{fmt(pos)}</span>
            <span>{fmt(track.duration)}</span>
          </div>
        </div>

        {/* controls */}
        <div className="mt-3 flex items-center justify-center gap-5">
          <button onClick={prev} className="text-white/80 hover:text-white">
            <SkipBack className="h-6 w-6" />
          </button>
          <button
            onClick={() => setPlaying((p) => !p)}
            className="grid h-12 w-12 place-items-center rounded-full bg-white text-black shadow-lg hover:scale-105"
          >
            {playing ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 translate-x-0.5" />}
          </button>
          <button onClick={next} className="text-white/80 hover:text-white">
            <SkipForward className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* playlist */}
      <div className="bober-scroll flex-1 overflow-y-auto p-3">
        <div className="mb-2 flex items-center justify-between px-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/40">
            Плейлист «Бобро-хиты»
          </p>
          <Volume2 className="h-4 w-4 text-white/40" />
        </div>
        <div className="space-y-1">
          {TRACKS.map((t, i) => (
            <button
              key={i}
              onClick={() => select(i)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors",
                i === idx ? "bg-white/15" : "hover:bg-white/5"
              )}
            >
              <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br", t.color)}>
                {i === idx && playing ? (
                  <div className="flex h-4 items-end gap-0.5">
                    <span className="w-0.5 animate-pulse bg-white" style={{ height: "60%" }} />
                    <span className="w-0.5 animate-pulse bg-white" style={{ height: "100%", animationDelay: "0.15s" }} />
                    <span className="w-0.5 animate-pulse bg-white" style={{ height: "40%", animationDelay: "0.3s" }} />
                  </div>
                ) : (
                  <Music className="h-4 w-4 text-white" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn("truncate text-sm font-medium", i === idx ? "text-white" : "text-white/80")}>
                  {t.title}
                </p>
                <p className="truncate text-[11px] text-white/40">{t.artist}</p>
              </div>
              <span className="text-[11px] text-white/40">{fmt(t.duration)}</span>
              <Heart
                className={cn("h-3.5 w-3.5", liked.has(i) ? "fill-rose-500 text-rose-500" : "text-white/30")}
                onClick={(e) => { e.stopPropagation(); toggleLike(i); }}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
