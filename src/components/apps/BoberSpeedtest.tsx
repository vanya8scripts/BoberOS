"use client";

import { useState, useEffect } from "react";
import { Gauge, Download, Upload, Activity } from "lucide-react";

export function BoberSpeedtest() {
  const [phase, setPhase] = useState<"idle" | "ping" | "download" | "upload" | "done">("idle");
  const [ping, setPing] = useState(0);
  const [down, setDown] = useState(0);
  const [up, setUp] = useState(0);
  const [progress, setProgress] = useState(0);

  const start = () => {
    if (phase !== "idle" && phase !== "done") return;
    setPhase("ping");
    setPing(0);
    setDown(0);
    setUp(0);
    setProgress(0);

    const pStart = Date.now();
    const pIv = setInterval(() => {
      const elapsed = Date.now() - pStart;
      if (elapsed > 800) {
        clearInterval(pIv);
        setPing(Math.floor(5 + Math.random() * 30));
        setPhase("download");
        runSpeed(setDown, 120, () => {
          setPhase("upload");
          runSpeed(setUp, 80, () => {
            setPhase("done");
          });
        });
      }
    }, 50);
  };

  const runSpeed = (setter: (v: number) => void, max: number, onDone: () => void) => {
    const start = Date.now();
    const dur = 2500;
    const iv = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(1, elapsed / dur);
      const speed = Math.round((Math.sin(pct * Math.PI) * max + Math.random() * 15) * pct);
      setter(speed);
      setProgress(pct * 100);
      if (pct >= 1) {
        clearInterval(iv);
        setter(Math.round(max * (0.7 + Math.random() * 0.3)));
        onDone();
      }
    }, 30);
  };

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-zinc-900 to-emerald-950 text-white">
      <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-green-700 px-4 py-3">
        <Gauge className="h-5 w-5" />
        <h1 className="text-sm font-bold">BoberSpeedtest</h1>
        <span className="text-xs text-white/60">Проверка скорости BoberNet</span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
        <button
          onClick={start}
          disabled={phase !== "idle" && phase !== "done"}
          className="relative grid h-40 w-40 place-items-center rounded-full border-8 border-emerald-500/30 transition-all hover:scale-105 disabled:opacity-70"
        >
          <div className="absolute inset-0 rounded-full border-8 border-transparent" style={{
            borderTopColor: phase !== "idle" ? "#10b981" : "transparent",
            borderRightColor: phase !== "idle" ? "#10b981" : "transparent",
            transform: `rotate(${progress * 3.6}deg)`,
          }} />
          <div className="text-center">
            <p className="text-3xl font-black text-emerald-400">
              {phase === "idle" ? "СТАРТ" : phase === "done" ? "ГОТОВО" : "..."}
            </p>
            {phase !== "idle" && phase !== "done" && (
              <p className="text-[10px] text-white/50">{phase === "ping" ? "пинг" : phase === "download" ? "загрузка" : "отдача"}</p>
            )}
          </div>
        </button>

        <div className="grid w-full max-w-md grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white/5 p-3 text-center">
            <Activity className="mx-auto mb-1 h-5 w-5 text-sky-400" />
            <p className="text-[10px] uppercase text-white/40">Пинг</p>
            <p className="text-xl font-black text-sky-300">{ping || "—"}<span className="text-xs text-white/40">мс</span></p>
          </div>
          <div className="rounded-2xl bg-white/5 p-3 text-center">
            <Download className="mx-auto mb-1 h-5 w-5 text-emerald-400" />
            <p className="text-[10px] uppercase text-white/40">Загрузка</p>
            <p className="text-xl font-black text-emerald-300">{down || "—"}<span className="text-xs text-white/40">Мбит</span></p>
          </div>
          <div className="rounded-2xl bg-white/5 p-3 text-center">
            <Upload className="mx-auto mb-1 h-5 w-5 text-amber-400" />
            <p className="text-[10px] uppercase text-white/40">Отдача</p>
            <p className="text-xl font-black text-amber-300">{up || "—"}<span className="text-xs text-white/40">Мбит</span></p>
          </div>
        </div>

        {phase === "done" && (
          <p className="text-sm text-white/60">
            BoberNet 5G · сервер: Плотинск · отличная скорость! 🦫
          </p>
        )}
      </div>
    </div>
  );
}
