"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function BoberClock() {
  const [now, setNow] = useState(new Date());
  const [tab, setTab] = useState<"clock" | "timer" | "stopwatch">("clock");

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-indigo-600 to-violet-800 text-white">
      <div className="flex border-b border-white/10">
        {(["clock", "timer", "stopwatch"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 py-2 text-xs font-medium transition-colors",
              tab === t ? "bg-white/15 text-white" : "text-white/60 hover:text-white"
            )}
          >
            {t === "clock" ? "Часы" : t === "timer" ? "Таймер" : "Секундомер"}
          </button>
        ))}
      </div>
      <div className="flex flex-1 flex-col items-center justify-center p-4">
        {tab === "clock" && <ClockFace now={now} />}
        {tab === "timer" && <Timer />}
        {tab === "stopwatch" && <Stopwatch />}
      </div>
    </div>
  );
}

function ClockFace({ now }: { now: Date }) {
  const h = now.getHours();
  const m = now.getMinutes();
  const s = now.getSeconds();
  const hourDeg = ((h % 12) + m / 60) * 30;
  const minDeg = (m + s / 60) * 6;
  const secDeg = s * 6;
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-48 w-48 rounded-full border-4 border-white/20 bg-white/5 shadow-2xl">
        {[...Array(12)].map((_, i) => {
          const angle = (i * 30 - 90) * (Math.PI / 180);
          const r = 78;
          const x = 96 + Math.cos(angle) * r;
          const y = 96 + Math.sin(angle) * r;
          return (
            <span
              key={i}
              className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/50"
              style={{ left: x, top: y }}
            />
          );
        })}
        {/* hour */}
        <div
          className="absolute left-1/2 top-1/2 h-14 w-1.5 origin-bottom -translate-x-1/2 -translate-y-full rounded-full bg-white"
          style={{ transform: `translate(-50%, -100%) rotate(${hourDeg}deg)`, transformOrigin: "bottom center" }}
        />
        {/* minute */}
        <div
          className="absolute left-1/2 top-1/2 h-20 w-1 origin-bottom -translate-x-1/2 -translate-y-full rounded-full bg-white/80"
          style={{ transform: `translate(-50%, -100%) rotate(${minDeg}deg)`, transformOrigin: "bottom center" }}
        />
        {/* second */}
        <div
          className="absolute left-1/2 top-1/2 h-24 w-0.5 origin-bottom -translate-x-1/2 -translate-y-full rounded-full bg-amber-400"
          style={{ transform: `translate(-50%, -100%) rotate(${secDeg}deg)`, transformOrigin: "bottom center" }}
        />
        <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400" />
      </div>
      <div className="text-center">
        <p className="font-mono text-3xl font-bold tabular-nums">
          {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:
          {String(s).padStart(2, "0")}
        </p>
        <p className="text-sm text-white/70">
          {now.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>
    </div>
  );
}

function Timer() {
  const [seconds, setSeconds] = useState(60);
  const [left, setLeft] = useState(60);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          setRunning(false);
          return 0;
        }
        return l - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="font-mono text-6xl font-bold tabular-nums">{fmt(left)}</p>
      <div className="flex gap-2">
        {[30, 60, 180, 300].map((s) => (
          <button
            key={s}
            onClick={() => { setSeconds(s); setLeft(s); setRunning(false); }}
            className="rounded-lg bg-white/15 px-3 py-1 text-xs hover:bg-white/25"
          >
            {s < 60 ? `${s}с` : `${s / 60}м`}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setRunning((r) => !r)}
          disabled={left === 0}
          className="rounded-xl bg-amber-400 px-6 py-2 text-sm font-bold text-violet-900 hover:bg-amber-300 disabled:opacity-40"
        >
          {running ? "Пауза" : "Старт"}
        </button>
        <button
          onClick={() => { setLeft(seconds); setRunning(false); }}
          className="rounded-xl bg-white/15 px-4 py-2 text-sm hover:bg-white/25"
        >
          Сброс
        </button>
      </div>
    </div>
  );
}

function Stopwatch() {
  const [ms, setMs] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const start = Date.now() - ms;
    const t = setInterval(() => setMs(Date.now() - start), 31);
    return () => clearInterval(t);
  }, [running, ms]);

  const fmt = (m: number) => {
    const mins = Math.floor(m / 60000);
    const secs = Math.floor((m % 60000) / 1000);
    const cs = Math.floor((m % 1000) / 10);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="font-mono text-5xl font-bold tabular-nums">{fmt(ms)}</p>
      <div className="flex gap-2">
        <button
          onClick={() => setRunning((r) => !r)}
          className="rounded-xl bg-amber-400 px-6 py-2 text-sm font-bold text-violet-900 hover:bg-amber-300"
        >
          {running ? "Стоп" : "Старт"}
        </button>
        <button
          onClick={() => { setMs(0); setRunning(false); }}
          className="rounded-xl bg-white/15 px-4 py-2 text-sm hover:bg-white/25"
        >
          Сброс
        </button>
      </div>
    </div>
  );
}
