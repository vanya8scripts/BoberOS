"use client";

import { useState } from "react";
import { Search, MapPin, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";

const PLACES = [
  { name: "Плотина Бобра", x: 30, y: 35, emoji: "🏞️", desc: "Главная плотина города" },
  { name: "Река Бобровка", x: 55, y: 60, emoji: "🌊", desc: "Идеальна для плавания" },
  { name: "Лес Веток", x: 75, y: 25, emoji: "🌲", desc: "Запасы стройматериалов" },
  { name: "Бобро-Кафе", x: 45, y: 50, emoji: "🍲", desc: "Суп из веток тут лучший" },
  { name: "Школа Резцов", x: 65, y: 40, emoji: "😁", desc: "Точим зубы правильно" },
  { name: "Барсучья нора", x: 20, y: 70, emoji: "🐻", desc: "Лучше не заходить" },
];

export function BoberMaps() {
  const [selected, setSelected] = useState(PLACES[0]);

  return (
    <div className="flex h-full bg-white">
      <div className="w-56 shrink-0 border-r border-zinc-200 p-3">
        <div className="flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-2">
          <Search className="h-4 w-4 text-zinc-400" />
          <input placeholder="Поиск места..." className="flex-1 bg-transparent text-xs outline-none" />
        </div>
        <p className="mb-1 mt-3 text-[11px] uppercase tracking-wide text-zinc-400">Известные места</p>
        <div className="space-y-1">
          {PLACES.map((p) => (
            <button
              key={p.name}
              onClick={() => setSelected(p)}
              className={cn("flex w-full items-center gap-2 rounded-lg p-2 text-left text-xs", selected.name === p.name ? "bg-emerald-100 text-emerald-800" : "hover:bg-zinc-100")}
            >
              <span className="text-lg">{p.emoji}</span>
              <span className="truncate font-medium">{p.name}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="relative flex-1 overflow-hidden bg-gradient-to-br from-green-200 via-emerald-100 to-sky-200">
        {/* fake map: river + forest */}
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M0,55 Q30,50 50,60 T100,55 L100,100 L0,100 Z" fill="#52b788" opacity="0.4" />
          <path d="M10,30 Q40,40 60,28 T95,35" stroke="#3b82f6" strokeWidth="3" fill="none" opacity="0.6" />
          <circle cx="25" cy="20" r="6" fill="#16a34a" opacity="0.5" />
          <circle cx="80" cy="75" r="8" fill="#16a34a" opacity="0.5" />
        </svg>
        {PLACES.map((p) => (
          <button
            key={p.name}
            onClick={() => setSelected(p)}
            className="absolute -translate-x-1/2 -translate-y-full"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          >
            <span className={cn("text-2xl drop-shadow", selected.name === p.name && "scale-125")}>{p.emoji}</span>
            {selected.name === p.name && <MapPin className="mx-auto h-4 w-4 text-rose-500" />}
          </button>
        ))}
        {/* info card */}
        <div className="absolute bottom-3 left-3 right-3 rounded-2xl bg-white/95 p-3 shadow-lg backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{selected.emoji}</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-zinc-800">{selected.name}</p>
              <p className="text-[11px] text-zinc-500">{selected.desc}</p>
            </div>
            <button className="flex items-center gap-1 rounded-full bg-sky-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-600">
              <Navigation className="h-3.5 w-3.5" /> Маршрут
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
