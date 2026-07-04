"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHS = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
const DAYS = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];

const EVENTS: Record<string, string> = {
  "5": "День Бобра 🐹",
  "12": "Запасы веток +50",
  "18": "Турнир по Флэппи",
  "23": "День Плотины",
};

export function BoberCalendar() {
  const today = new Date();
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());

  const firstDay = new Date(view.year, view.month, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const prev = () => setView((v) => v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 });
  const next = () => setView((v) => v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 });

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center gap-3 bg-gradient-to-r from-rose-500 to-pink-600 px-4 py-3 text-white">
        <h1 className="text-lg font-bold">BoberCalendar</h1>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={prev} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/20"><ChevronLeft className="h-4 w-4" /></button>
          <span className="min-w-[140px] text-center text-sm font-medium">{MONTHS[view.month]} {view.year}</span>
          <button onClick={next} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/20"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50 text-center text-[11px] font-semibold text-zinc-500">
        {DAYS.map((d) => <div key={d} className="py-2">{d}</div>)}
      </div>

      <div className="grid flex-1 grid-cols-7 gap-px overflow-y-auto bg-zinc-100">
        {cells.map((day, i) => (
          <button
            key={i}
            onClick={() => day && setSelectedDay(day)}
            disabled={!day}
            className={cn(
              "flex min-h-[60px] flex-col items-start p-1.5 text-left text-xs",
              day ? "bg-white hover:bg-rose-50" : "bg-zinc-50",
              day === selectedDay && "bg-rose-100 ring-1 ring-rose-300",
              day === today.getDate() && view.month === today.getMonth() && view.year === today.getFullYear() && "font-bold"
            )}
          >
            {day && (
              <>
                <span className={cn("mb-0.5", day === today.getDate() && view.month === today.getMonth() && "grid h-5 w-5 place-items-center rounded-full bg-rose-500 text-white")}>{day}</span>
                {EVENTS[String(day)] && <span className="line-clamp-2 text-[9px] text-rose-600">{EVENTS[String(day)]}</span>}
              </>
            )}
          </button>
        ))}
      </div>

      {selectedDay && EVENTS[String(selectedDay)] && (
        <div className="border-t border-zinc-200 bg-rose-50 p-3 text-sm">
          <p className="font-bold text-rose-700">{selectedDay} {MONTHS[view.month].toLowerCase()}</p>
          <p className="text-xs text-rose-600">{EVENTS[String(selectedDay)]}</p>
        </div>
      )}
    </div>
  );
}
