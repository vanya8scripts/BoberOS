"use client";

import { useState } from "react";
import { Play, ThumbsUp, ThumbsDown, Share2, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface Video {
  id: number;
  title: string;
  channel: string;
  views: string;
  time: string;
  duration: string;
  emoji: string;
  color: string;
}

const VIDEOS: Video[] = [
  { id: 1, title: "Строю плотину за 24 часа (ШОК)", channel: "Бобёр TV", views: "1.2 млн", time: "2 дня назад", duration: "12:34", emoji: "🏗️", color: "from-amber-500 to-orange-600" },
  { id: 2, title: "ТОП-10 рек для бобра", channel: "Водный Бобр", views: "856 тыс", time: "неделю назад", duration: "08:21", emoji: "🌊", color: "from-sky-500 to-blue-600" },
  { id: 3, title: "Прошёл КиберБобер на сложности БОБЕР", channel: "ГеймБобр", views: "2.4 млн", time: "вчера", duration: "24:10", emoji: "🎮", color: "from-fuchsia-500 to-purple-600" },
  { id: 4, title: "Готовлю суп из веток", channel: "Бобро-Шеф", views: "423 тыс", time: "3 дня назад", duration: "06:55", emoji: "🍲", color: "from-rose-500 to-red-600" },
  { id: 5, title: "Почему барсук — враг бобра?", channel: "Наука Бобра", views: "987 тыс", time: "5 дней назад", duration: "15:42", emoji: "🐻", color: "from-zinc-500 to-zinc-700" },
  { id: 6, title: "Флэппи Бобёр — мировой рекорд!", channel: "Аркадный Бобр", views: "1.5 млн", time: "неделю назад", duration: "03:21", emoji: "🐦", color: "from-lime-500 to-green-600" },
  { id: 7, title: "Обзор BoberOS 1.2", channel: "ТехноБобр", views: "678 тыс", time: "вчера", duration: "18:09", emoji: "💻", color: "from-indigo-500 to-violet-600" },
  { id: 8, title: "Майню BoberCoin 1 час", channel: "КриптоБобр", views: "345 тыс", time: "4 дня назад", duration: "1:00:00", emoji: "🪙", color: "from-yellow-500 to-amber-600" },
];

export function BoberTube() {
  const [selected, setSelected] = useState<Video | null>(null);
  const [search, setSearch] = useState("");
  const [liked, setLiked] = useState<"up" | "down" | null>(null);

  const list = VIDEOS.filter((v) => !search || v.title.toLowerCase().includes(search.toLowerCase()));

  if (selected) {
    return (
      <div className="bober-scroll h-full overflow-y-auto bg-zinc-900 text-white">
        <div className={cn("flex aspect-video w-full items-center justify-center bg-gradient-to-br", selected.color)}>
          <span className="text-8xl">{selected.emoji}</span>
        </div>
        <div className="p-4">
          <h1 className="text-lg font-bold">{selected.title}</h1>
          <p className="mt-1 text-xs text-white/60">{selected.views} просмотров · {selected.time}</p>
          <div className="mt-3 flex items-center gap-2 border-y border-white/10 py-2">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-rose-500 to-red-600 text-sm font-bold">{selected.channel[0]}</div>
            <div className="flex-1">
              <p className="text-sm font-medium">{selected.channel}</p>
              <p className="text-[11px] text-white/50">1.2 млн подписчиков</p>
            </div>
            <button className="rounded-full bg-white px-4 py-1.5 text-xs font-bold text-black">Подписаться</button>
          </div>
          <div className="mt-2 flex gap-2">
            <button onClick={() => setLiked("up")} className={cn("flex items-center gap-1 rounded-full px-3 py-1.5 text-xs", liked === "up" ? "bg-emerald-500" : "bg-white/10 hover:bg-white/20")}>
              <ThumbsUp className="h-3.5 w-3.5" /> 24K
            </button>
            <button onClick={() => setLiked("down")} className={cn("flex items-center gap-1 rounded-full px-3 py-1.5 text-xs", liked === "down" ? "bg-rose-500" : "bg-white/10 hover:bg-white/20")}>
              <ThumbsDown className="h-3.5 w-3.5" />
            </button>
            <button className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs hover:bg-white/20">
              <Share2 className="h-3.5 w-3.5" /> Поделиться
            </button>
          </div>
          <p className="mt-3 text-sm text-white/80">Спасибо за просмотр! Бобёр одобряет. 🐹</p>
          <button onClick={() => setSelected(null)} className="mt-3 rounded-full bg-white/10 px-4 py-1.5 text-xs hover:bg-white/20">← Назад</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-zinc-900 text-white">
      <div className="flex items-center gap-2 border-b border-white/10 p-3">
        <span className="text-lg">🐹</span>
        <span className="font-black">Bober<span className="text-rose-500">Tube</span></span>
        <div className="mx-2 flex flex-1 items-center gap-2 rounded-full bg-white/10 px-3 py-1.5">
          <Search className="h-4 w-4 text-white/40" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск видео..." className="flex-1 bg-transparent text-sm outline-none" />
        </div>
      </div>
      <div className="bober-scroll grid flex-1 grid-cols-2 gap-3 overflow-y-auto p-3 sm:grid-cols-3">
        {list.map((v) => (
          <button key={v.id} onClick={() => { setSelected(v); setLiked(null); }} className="text-left">
            <div className={cn("relative flex aspect-video items-center justify-center rounded-xl bg-gradient-to-br", v.color)}>
              <span className="text-4xl">{v.emoji}</span>
              <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-mono">{v.duration}</span>
            </div>
            <div className="mt-1.5 flex gap-2">
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-zinc-600 to-zinc-800 text-[10px] font-bold">{v.channel[0]}</div>
              <div className="min-w-0">
                <p className="line-clamp-2 text-xs font-medium leading-tight">{v.title}</p>
                <p className="text-[10px] text-white/50">{v.channel}</p>
                <p className="text-[10px] text-white/40">{v.views} · {v.time}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
