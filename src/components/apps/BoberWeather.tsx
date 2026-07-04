"use client";

import { Cloud, Sun, CloudRain, CloudSnow, Wind, Droplets, MapPin } from "lucide-react";

const CITIES = [
  { name: "Плотинск", temp: 18, cond: "Солнечно", icon: Sun, color: "text-amber-400", hum: 45, wind: 3 },
  { name: "Бобровск", temp: 12, cond: "Облачно", icon: Cloud, color: "text-zinc-400", hum: 62, wind: 5 },
  { name: "Речной", temp: 8, cond: "Дождь", icon: CloudRain, color: "text-sky-400", hum: 88, wind: 7 },
  { name: "Хвойный", temp: -3, cond: "Снег", icon: CloudSnow, color: "text-sky-300", hum: 70, wind: 4 },
];

const FORECAST = [
  { day: "Сегодня", temp: 18, icon: Sun, color: "text-amber-400" },
  { day: "Завтра", temp: 16, icon: Cloud, color: "text-zinc-400" },
  { day: "Среда", temp: 14, icon: CloudRain, color: "text-sky-400" },
  { day: "Четверг", temp: 19, icon: Sun, color: "text-amber-400" },
  { day: "Пятница", temp: 21, icon: Sun, color: "text-amber-400" },
];

export function BoberWeather() {
  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-sky-400 to-sky-600 text-white">
      <div className="flex items-center gap-2 p-4">
        <MapPin className="h-4 w-4" />
        <h1 className="text-sm font-bold">Погода Бобра</h1>
      </div>

      <div className="bober-scroll flex-1 overflow-y-auto px-4 pb-4">
        {/* current */}
        <div className="rounded-3xl bg-white/15 p-6 backdrop-blur">
          <p className="text-sm">Плотинск, Бобрия</p>
          <div className="mt-2 flex items-center gap-4">
            <Sun className="h-20 w-20 text-amber-300" />
            <div>
              <p className="text-6xl font-black">18°</p>
              <p className="text-sm text-white/80">Солнечно · ощущается 17°</p>
            </div>
          </div>
          <div className="mt-4 flex gap-4 text-xs">
            <span className="flex items-center gap-1"><Droplets className="h-3.5 w-3.5" /> Влажность 45%</span>
            <span className="flex items-center gap-1"><Wind className="h-3.5 w-3.5" /> Ветер 3 м/с</span>
          </div>
        </div>

        {/* forecast */}
        <p className="mb-2 mt-4 text-[11px] uppercase tracking-wide text-white/60">Прогноз на 5 дней</p>
        <div className="grid grid-cols-5 gap-2">
          {FORECAST.map((f) => (
            <div key={f.day} className="rounded-2xl bg-white/15 p-3 text-center backdrop-blur">
              <p className="text-[11px] text-white/70">{f.day}</p>
              <f.icon className={`mx-auto my-1.5 h-7 w-7 ${f.color}`} />
              <p className="text-lg font-bold">{f.temp}°</p>
            </div>
          ))}
        </div>

        {/* cities */}
        <p className="mb-2 mt-4 text-[11px] uppercase tracking-wide text-white/60">Другие города</p>
        <div className="space-y-2">
          {CITIES.map((c) => (
            <div key={c.name} className="flex items-center gap-3 rounded-2xl bg-white/15 p-3 backdrop-blur">
              <c.icon className={`h-8 w-8 ${c.color}`} />
              <div className="flex-1">
                <p className="text-sm font-medium">{c.name}</p>
                <p className="text-[11px] text-white/70">{c.cond}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold">{c.temp}°</p>
                <p className="text-[10px] text-white/60">{c.hum}% · {c.wind}м/с</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
