"use client";

import { useState } from "react";
import { Download, Heart, Trash2, Image as ImageIcon, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

const PHOTOS = [
  { id: 1, emoji: "🐹", title: "Дед Бобёр", color: "from-amber-400 to-orange-600" },
  { id: 2, emoji: "🏞️", title: "Плотина", color: "from-emerald-400 to-teal-600" },
  { id: 3, emoji: "🌿", title: "Запас брёвен", color: "from-yellow-600 to-amber-800" },
  { id: 4, emoji: "🌊", title: "Река", color: "from-sky-400 to-blue-600" },
  { id: 5, emoji: "🌲", title: "Лес", color: "from-green-600 to-emerald-800" },
  { id: 6, emoji: "🌙", title: "Ночь у реки", color: "from-indigo-700 to-purple-900" },
  { id: 7, emoji: "🍂", title: "Осень", color: "from-orange-500 to-red-700" },
  { id: 8, emoji: "😁", title: "Резцы крупным планом", color: "from-zinc-300 to-zinc-500" },
  { id: 9, emoji: "🌅", title: "Закат", color: "from-rose-400 to-pink-600" },
  { id: 10, emoji: "❄️", title: "Зимняя река", color: "from-cyan-200 to-blue-400" },
  { id: 11, emoji: "🌳", title: "Старый дуб", color: "from-green-700 to-green-900" },
  { id: 12, emoji: "🐬", title: "Бобёр-сосед", color: "from-amber-600 to-yellow-800" },
];

export function BoberGallery() {
  const [selected, setSelected] = useState<typeof PHOTOS[0] | null>(null);
  const [liked, setLiked] = useState<Set<number>>(new Set());

  const toggleLike = (id: number) => {
    setLiked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  if (selected) {
    return (
      <div className="flex h-full flex-col bg-zinc-900">
        <div className="flex items-center gap-2 border-b border-white/10 bg-zinc-800 px-3 py-2 text-white">
          <button onClick={() => setSelected(null)} className="rounded px-2 py-1 text-xs hover:bg-white/10">
            ← Назад
          </button>
          <span className="flex-1 text-sm font-medium">{selected.title}</span>
          <button onClick={() => toggleLike(selected.id)} className="rounded p-1.5 hover:bg-white/10">
            <Heart className={cn("h-4 w-4", liked.has(selected.id) ? "fill-rose-500 text-rose-500" : "text-white/60")} />
          </button>
          <button className="rounded p-1.5 text-white/60 hover:bg-white/10">
            <Download className="h-4 w-4" />
          </button>
          <button className="rounded p-1.5 text-rose-400 hover:bg-white/10">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-1 items-center justify-center p-4">
          <div className={cn("grid aspect-square w-full max-w-md place-items-center rounded-2xl bg-gradient-to-br text-[10rem] shadow-2xl", selected.color)}>
            {selected.emoji}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center gap-3 border-b border-zinc-200 bg-gradient-to-r from-purple-500 to-fuchsia-600 px-4 py-2.5 text-white">
        <ImageIcon className="h-5 w-5" />
        <h1 className="text-sm font-bold">Галерея</h1>
        <span className="ml-auto text-[11px] text-white/70">{PHOTOS.length} фото · {liked.size} в избранном</span>
      </div>
      <div className="bober-scroll flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {PHOTOS.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelected(p)}
              className={cn(
                "group relative aspect-square overflow-hidden rounded-xl bg-gradient-to-br text-5xl shadow-sm transition-transform hover:scale-105",
                p.color
              )}
            >
              <span className="grid h-full w-full place-items-center">{p.emoji}</span>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 text-left">
                <p className="truncate text-[10px] font-medium text-white">{p.title}</p>
              </div>
              {liked.has(p.id) && (
                <Heart className="absolute right-1.5 top-1.5 h-3.5 w-3.5 fill-rose-500 text-rose-500" />
              )}
            </button>
          ))}
          <button className="grid aspect-square place-items-center rounded-xl border-2 border-dashed border-zinc-300 text-zinc-400 hover:border-purple-400 hover:text-purple-500">
            <div className="flex flex-col items-center gap-1">
              <Upload className="h-5 w-5" />
              <span className="text-[10px]">Загрузить</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
