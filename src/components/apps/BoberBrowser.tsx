"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Home,
  Lock,
  Search,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Page {
  url: string;
  title: string;
  render: () => React.ReactNode;
}

const PAGES: Record<string, Page> = {
  "bober://home": {
    url: "bober://home",
    title: "Главная BoberBrowser",
    render: () => <HomePage />,
  },
  "bober://search": {
    url: "bober://search",
    title: "БоброПоиск",
    render: () => <SearchPage />,
  },
  "bober://news": {
    url: "bober://news",
    title: "Бобро-новости",
    render: () => <NewsPage />,
  },
  "bober://shop": {
    url: "bober://shop",
    title: "Бобро-маркет",
    render: () => <ShopPage />,
  },
  "bober://wiki": {
    url: "bober://wiki",
    title: "Бобропедия",
    render: () => <WikiPage />,
  },
};

function HomePage({ go }: { go?: (u: string) => void }) {
  const tiles = [
    { url: "bober://search", label: "Поиск", emoji: "🔍", color: "from-sky-400 to-blue-500" },
    { url: "bober://news", label: "Новости", emoji: "📰", color: "from-rose-400 to-red-500" },
    { url: "bober://shop", label: "Маркет", emoji: "🛒", color: "from-emerald-400 to-teal-500" },
    { url: "bober://wiki", label: "Бобропедия", emoji: "📚", color: "from-amber-400 to-orange-500" },
  ];
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 bg-gradient-to-b from-orange-50 to-rose-50 p-6">
      <div className="text-center">
        <div className="text-6xl">🐹</div>
        <h1 className="mt-2 text-3xl font-black text-zinc-800">
          Bober<span className="text-orange-500">Browser</span>
        </h1>
        <p className="text-sm text-zinc-500">Лучший браузер для грызунов</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((t) => (
          <button
            key={t.url}
            onClick={() => go?.(t.url)}
            className={cn(
              "flex w-24 flex-col items-center gap-2 rounded-2xl bg-gradient-to-br p-3 text-white shadow-lg transition-transform hover:scale-105",
              t.color
            )}
          >
            <span className="text-3xl">{t.emoji}</span>
            <span className="text-xs font-semibold">{t.label}</span>
          </button>
        ))}
      </div>
      <p className="text-[11px] text-zinc-400">Версия 1.0 · работает только в сети BoberNet 🌊</p>
    </div>
  );
}

function SearchPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-white p-6">
      <div className="text-5xl">🔍</div>
      <h2 className="text-2xl font-black text-zinc-800">БоброПоиск</h2>
      <div className="flex w-full max-w-md items-center gap-2 rounded-full border-2 border-orange-300 bg-white px-4 py-2">
        <Search className="h-4 w-4 text-zinc-400" />
        <input placeholder="Найти брёвна, плотины, реки..." className="flex-1 bg-transparent text-sm outline-none" />
      </div>
      <div className="mt-2 w-full max-w-md space-y-2 text-sm">
        <p className="text-xs text-zinc-400">Популярные запросы:</p>
        {["как построить плотину", "почему бобёр грызёт", "топ 10 рек для бобра", "рецепт супа из веток"].map((q) => (
          <div key={q} className="rounded-lg bg-orange-50 px-3 py-1.5 text-zinc-600">{q}</div>
        ))}
      </div>
    </div>
  );
}

function NewsPage() {
  const news = [
    { t: "Бобры построили плотину длиной 800 метров", d: "Рекорд установлен в Канаде" },
    { t: "Учёные: бобры спасают климат", d: "Их плотины удерживают углерод" },
    { t: "BoberOS получила обновление 1.1", d: "Добавлены 10 новых игр и лицензирование" },
    { t: "Барсук снова проник на склад веток", d: "360 антивирус уже в пути" },
  ];
  return (
    <div className="h-full overflow-y-auto bg-zinc-50 p-5">
      <h2 className="mb-3 text-xl font-black text-zinc-800">📰 Бобро-новости</h2>
      <div className="space-y-3">
        {news.map((n, i) => (
          <div key={i} className="rounded-xl border border-zinc-200 bg-white p-3">
            <h3 className="font-semibold text-zinc-800">{n.t}</h3>
            <p className="text-xs text-zinc-500">{n.d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ShopPage() {
  const items = [
    { n: "Бревно премиум", p: "120 BBC", e: "🌿" },
    { n: "Набор резцов", p: "350 BBC", e: "😁" },
    { n: "Плотина DIY", p: "1200 BBC", e: "🏞️" },
    { n: "Хвост-тюнинг", p: "800 BBC", e: "🐻" },
  ];
  return (
    <div className="h-full overflow-y-auto bg-zinc-50 p-5">
      <h2 className="mb-3 text-xl font-black text-zinc-800">🛒 Бобро-маркет</h2>
      <div className="grid grid-cols-2 gap-3">
        {items.map((it, i) => (
          <div key={i} className="rounded-xl border border-zinc-200 bg-white p-3 text-center">
            <div className="text-4xl">{it.e}</div>
            <p className="mt-1 text-sm font-semibold text-zinc-700">{it.n}</p>
            <p className="text-xs text-amber-600">{it.p}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function WikiPage() {
  return (
    <div className="h-full overflow-y-auto bg-white p-6">
      <h2 className="text-2xl font-black text-zinc-800">📚 Бобропедия</h2>
      <p className="mt-1 text-xs text-zinc-400">Свободная энциклопедия о бобрах</p>
      <article className="mt-4 space-y-3 text-sm leading-relaxed text-zinc-700">
        <h3 className="text-lg font-bold text-zinc-900">Бобр (Castor)</h3>
        <p>
          <b>Бобр</b> — полуводный грызун, известный строительством плотин и хаток.
          Обладает мощными резцами, которые никогда не перестают расти — поэтому
          бобр постоянно их точит о древесину.
        </p>
        <p>
          Плотина бобра может достигать <b>800 метров</b> в длину. Самая большая
          известная плотина находится в Канаде и видна из космоса.
        </p>
        <p>
          Хвост бобра покрыт роговыми щитками и используется как руль при плавании,
          терморегулятор и для подачи сигнала тревоги (хлопок по воде).
        </p>
        <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
          💡 А вы знали? Бобры — вторые после человека существа, которые так сильно
          изменяют окружающую среду под себя.
        </div>
      </article>
    </div>
  );
}

export function BoberBrowser() {
  const [history, setHistory] = useState<string[]>(["bober://home"]);
  const [idx, setIdx] = useState(0);
  const [urlInput, setUrlInput] = useState("bober://home");
  const current = history[idx];
  const page = PAGES[current] || PAGES["bober://home"];

  const navigate = (url: string) => {
    const target = PAGES[url] ? url : "bober://home";
    const next = [...history.slice(0, idx + 1), target];
    setHistory(next);
    setIdx(next.length - 1);
    setUrlInput(target);
  };

  const back = () => {
    if (idx > 0) {
      setIdx(idx - 1);
      setUrlInput(history[idx - 1]);
    }
  };
  const fwd = () => {
    if (idx < history.length - 1) {
      setIdx(idx + 1);
      setUrlInput(history[idx + 1]);
    }
  };

  return (
    <div className="flex h-full flex-col bg-white">
      {/* chrome */}
      <div className="flex items-center gap-1 border-b border-zinc-200 bg-zinc-100 px-2 py-2">
        <button onClick={back} disabled={idx === 0} className="grid h-8 w-8 place-items-center rounded text-zinc-600 hover:bg-zinc-200 disabled:opacity-30">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button onClick={fwd} disabled={idx >= history.length - 1} className="grid h-8 w-8 place-items-center rounded text-zinc-600 hover:bg-zinc-200 disabled:opacity-30">
          <ArrowRight className="h-4 w-4" />
        </button>
        <button onClick={() => navigate(current)} className="grid h-8 w-8 place-items-center rounded text-zinc-600 hover:bg-zinc-200">
          <RotateCw className="h-4 w-4" />
        </button>
        <button onClick={() => navigate("bober://home")} className="grid h-8 w-8 place-items-center rounded text-zinc-600 hover:bg-zinc-200">
          <Home className="h-4 w-4" />
        </button>
        <div className="mx-1 flex flex-1 items-center gap-2 rounded-full border border-zinc-300 bg-white px-3 py-1.5">
          <Lock className="h-3.5 w-3.5 text-emerald-500" />
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && navigate(urlInput)}
            className="flex-1 bg-transparent text-xs text-zinc-700 outline-none"
          />
        </div>
        <button className="grid h-8 w-8 place-items-center rounded text-zinc-600 hover:bg-zinc-200">
          <Star className="h-4 w-4" />
        </button>
      </div>
      {/* page */}
      <div className="flex-1 overflow-hidden">
        {current === "bober://home" ? <HomePage go={navigate} /> : page.render()}
      </div>
    </div>
  );
}
