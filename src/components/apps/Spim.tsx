"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Check, Star, Lock, Play, Wallet, Wrench } from "lucide-react";
import { useOS } from "@/lib/os-store";
import type { AppId } from "@/lib/os-types";
import { AppIcon } from "@/components/os/AppIcon";
import { cn } from "@/lib/utils";

interface GameItem {
  appId: AppId;
  price: number;
  tagline: string;
  rating: number;
  genre: string;
  size: string;
  tag?: "NEW" | "HIT" | "ТОП";
}

const GAMES: GameItem[] = [
  { appId: "flappybober", price: 0, tagline: "Лети через брёвна, не падай. Классика жанра!", rating: 4.7, genre: "Аркада", size: "8 МБ", tag: "HIT" },
  { appId: "cs2", price: 0, tagline: "Легендарный шутер. Но потянет ли ваш комп?", rating: 4.9, genre: "Шутер", size: "85 ГБ" },
  { appId: "cyberbober", price: 3500, tagline: "Неоновый шутер про бобра-киборга. Лучший шутер сезона.", rating: 5.0, genre: "Шутер", size: "24 ГБ", tag: "ТОП" },
  { appId: "tetris", price: 0, tagline: "Тетрис с деревянными блоками. 7 фигур, hold, ghost.", rating: 4.9, genre: "Головоломка", size: "6 МБ", tag: "NEW" },
  { appId: "snake", price: 0, tagline: "Змейка из бобров собирает брёвна. Растёт и ускоряется!", rating: 4.6, genre: "Аркада", size: "6 МБ", tag: "NEW" },
  { appId: "game2048", price: 0, tagline: "Собирай бобров от Ветки до ЛЕГЕНДЫ (2048)!", rating: 4.8, genre: "Головоломка", size: "5 МБ", tag: "NEW" },
  { appId: "minesweeper", price: 0, tagline: "Сапёр: найди всех барсуков, не подорвавшись.", rating: 4.5, genre: "Головоломка", size: "4 МБ" },
  { appId: "breakout", price: 0, tagline: "Арканоид: ломай брёвна мячом хвостом-падлом.", rating: 4.6, genre: "Аркада", size: "7 МБ", tag: "NEW" },
  { appId: "pong", price: 0, tagline: "Пинг-Понг: бобёр против барсука. Первый до 7.", rating: 4.4, genre: "Спорт", size: "5 МБ", tag: "NEW" },
  { appId: "sokoban", price: 0, tagline: "Сокобан: толкай брёвна на цели. 7 уровней.", rating: 4.7, genre: "Головоломка", size: "5 МБ", tag: "NEW" },
  { appId: "fifteen", price: 0, tagline: "Пятнашки: собери 1-15 по порядку.", rating: 4.3, genre: "Головоломка", size: "3 МБ" },
  { appId: "hangman", price: 0, tagline: "Виселица: угадай бобро-слово за 6 попыток.", rating: 4.4, genre: "Слова", size: "3 МБ" },
  { appId: "simon", price: 0, tagline: "Симон: повторяй последовательность с звуком.", rating: 4.5, genre: "Память", size: "4 МБ", tag: "NEW" },
  { appId: "memory", price: 0, tagline: "Найди пары бобро-карточек. 3D переворот.", rating: 4.4, genre: "Память", size: "5 МБ" },
  { appId: "rps", price: 0, tagline: "Камень-Ножницы-Бумага против хитрого бобра.", rating: 4.3, genre: "Казуальная", size: "3 МБ" },
  { appId: "tictactoe", price: 0, tagline: "Крестики-нолики с умным бобром. Не так-то просто!", rating: 4.5, genre: "Логика", size: "3 МБ" },
  { appId: "whackamole", price: 0, tagline: "Лупи бобров по голове за 30 секунд!", rating: 4.7, genre: "Аркада", size: "6 МБ", tag: "NEW" },
  { appId: "dinorunner", price: 0, tagline: "Беги и прыгай через брёвна! День и ночь.", rating: 4.8, genre: "Аркада", size: "5 МБ", tag: "NEW" },
  { appId: "sudoku", price: 0, tagline: "Судоку 9x9. 3 уровня сложности, заметки.", rating: 4.6, genre: "Головоломка", size: "4 МБ", tag: "NEW" },
  { appId: "connect4", price: 0, tagline: "Четыре в ряд против бобра. Стратегия решает!", rating: 4.5, genre: "Логика", size: "4 МБ", tag: "NEW" },
  { appId: "wordle", price: 0, tagline: "Угадай бобро-слово за 6 попыток. Wordle!", rating: 4.7, genre: "Слова", size: "3 МБ", tag: "NEW" },
  { appId: "bober3d", price: 0, tagline: "3D-шутер! Исследуй лабиринт и стреляй барсуков.", rating: 4.9, genre: "3D / Шутер", size: "12 МБ", tag: "3D" },
  { appId: "parkour", price: 0, tagline: "Паркур: wall-jump, рывок, двойной прыжок!", rating: 4.8, genre: "Паркур", size: "8 МБ", tag: "NEW" },
  { appId: "rungun", price: 0, tagline: "Run-and-gun: волны барсуков и битва с боссом!", rating: 4.9, genre: "Шутер", size: "10 МБ", tag: "HIT" },
];

const COMING_SOON_GAMES = [
  { name: "Майнкрафт Бобра", genre: "Песочница", emoji: "⛏️" },
  { name: "БоброКарт", genre: "Гонки", emoji: "🏎️" },
  { name: "Among Beavers", genre: "Мультиплеер", emoji: "🤫" },
  { name: "Бобр: RPG", genre: "RPG", emoji: "⚔️" },
  { name: "Танчики Бобра", genre: "Аркада", emoji: "tank" },
  { name: "Шахматы Бобра", genre: "Логика", emoji: "♟️" },
];

export function Spim() {
  const installedApps = useOS((s) => s.installedApps);
  const installApp = useOS((s) => s.installApp);
  const openApp = useOS((s) => s.openApp);
  const spimBalance = useOS((s) => s.spimBalance);
  const cyberboberOwned = useOS((s) => s.cyberboberOwned);
  const buyCyberBober = useOS((s) => s.buyCyberBober);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [genre, setGenre] = useState("Все");
  const timers = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  useEffect(() => () => { Object.values(timers.current).forEach(clearInterval); }, []);

  const handleInstall = (game: GameItem) => {
    if (timers.current[game.appId]) return;
    if (installedApps.includes(game.appId)) return;
    if (game.appId === "cyberbober" && !cyberboberOwned) {
      if (spimBalance < game.price) {
        setError(`Не хватает ${game.price - spimBalance} BBC. Выведи монеты на Спим в BoberCoin!`);
        setTimeout(() => setError(null), 3500);
        return;
      }
      buyCyberBober();
    }
    setError(null);
    setProgress((p) => ({ ...p, [game.appId]: 0 }));
    const start = Date.now();
    const dur = 1500;
    timers.current[game.appId] = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - start) / dur) * 100);
      setProgress((p) => ({ ...p, [game.appId]: pct }));
      if (pct >= 100) {
        clearInterval(timers.current[game.appId]);
        delete timers.current[game.appId];
        installApp(game.appId);
        setProgress((p) => { const n = { ...p }; delete n[game.appId]; return n; });
      }
    }, 40);
  };

  const genres = ["Все", ...Array.from(new Set(GAMES.map((g) => g.genre)))];
  const filtered = genre === "Все" ? GAMES : GAMES.filter((g) => g.genre === genre);

  return (
    <div className="flex h-full flex-col bg-zinc-950 text-white">
      <div className="flex items-center gap-3 bg-gradient-to-r from-zinc-800 to-zinc-900 px-5 py-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-zinc-600 to-zinc-800"><Wrench className="h-5 w-5 text-emerald-400" /></div>
        <div>
          <h1 className="text-lg font-bold">Спим</h1>
          <p className="text-[11px] text-white/60">Магазин игр · {GAMES.length} игр</p>
        </div>
        <div className="ml-auto flex items-center gap-2 rounded-full bg-zinc-800 px-3 py-1.5 text-sm">
          <Wallet className="h-4 w-4 text-emerald-400" />
          <span className="font-mono font-semibold text-emerald-300">{spimBalance.toLocaleString("ru-RU")}</span>
          <span className="text-[11px] text-white/50">Спим</span>
        </div>
      </div>

      <div className="bober-scroll flex-1 overflow-y-auto p-4">
        <div className="mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-fuchsia-600 via-purple-700 to-indigo-900 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-fuchsia-200">Эксклюзив Спим</p>
          <h2 className="mt-1 text-2xl font-black">КиберБобер</h2>
          <p className="mt-1 text-sm text-white/80">Бобёр-киборг крошит барсуков в неоновой арене. WASD + Пробел/клик — огонь.</p>
          <p className="mt-2 text-xs text-fuchsia-200">{cyberboberOwned ? "✓ Куплено" : `Цена: 3 500 Спим · у тебя ${spimBalance} BBC`}</p>
        </div>

        {error && <div className="mb-3 rounded-xl border border-rose-500/40 bg-rose-500/20 px-4 py-2 text-sm text-rose-200">{error}</div>}

        <div className="bober-scroll mb-3 flex gap-1.5 overflow-x-auto pb-1">
          {genres.map((g) => (
            <button key={g} onClick={() => setGenre(g)} className={cn("shrink-0 rounded-full px-3 py-1 text-xs font-medium", genre === g ? "bg-emerald-500 text-white" : "bg-white/10 text-white/60 hover:bg-white/20")}>{g}</button>
          ))}
        </div>

        <div className="space-y-3">
          {filtered.map((game) => {
            const installed = installedApps.includes(game.appId);
            const pct = progress[game.appId];
            const isInstalling = pct !== undefined;
            const owned = game.appId === "cyberbober" ? cyberboberOwned : game.price === 0;
            return (
              <div key={game.appId} className="flex gap-3 rounded-2xl border border-white/10 bg-zinc-900 p-3">
                <div className="relative shrink-0">
                  <AppIcon appId={game.appId} size={60} />
                  {game.tag && <span className="absolute -right-1 -top-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold text-white shadow">{game.tag}</span>}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-semibold">{gameName(game.appId)}</h3>
                    <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/60">{game.genre}</span>
                    {game.price > 0 && !owned && <span className="flex items-center gap-0.5 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-300"><Lock className="h-2.5 w-2.5" /> {game.price}</span>}
                  </div>
                  <p className="line-clamp-2 text-xs text-white/60">{game.tagline}</p>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-white/40">
                    <span className="flex items-center gap-0.5"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{game.rating}</span>
                    <span>·</span><span>{game.size}</span>
                  </div>
                  <div className="mt-auto pt-2">
                    {installed ? (
                      <button onClick={() => openApp(game.appId)} className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-300 hover:bg-emerald-500/30"><Play className="h-3.5 w-3.5" /> Играть</button>
                    ) : isInstalling ? (
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-28 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-emerald-400 transition-[width] duration-75" style={{ width: `${pct}%` }} /></div>
                        <span className="w-9 text-[11px] font-mono text-white/50">{Math.round(pct)}%</span>
                      </div>
                    ) : (
                      <button onClick={() => handleInstall(game)} className={cn("flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium", game.price > 0 && !owned ? "bg-amber-500 text-zinc-900 hover:bg-amber-400" : "bg-emerald-500 text-white hover:bg-emerald-400")}>
                        {game.price > 0 && !owned ? (<><Lock className="h-3.5 w-3.5" /> Купить за {game.price}</>) : (<><Download className="h-3.5 w-3.5" /> Установить</>)}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-white/40">Скоро в Спим</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {COMING_SOON_GAMES.map((g) => (
            <div key={g.name} className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/5 p-4 text-center opacity-70">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/5 text-3xl">{g.emoji}</div>
              <div>
                <p className="text-sm font-semibold text-white/70">{g.name}</p>
                <p className="text-[10px] text-white/40">{g.genre}</p>
              </div>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-medium text-white/50">Скоро...</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function gameName(appId: AppId) {
  const names: Record<AppId, string> = {
    bpaint: "BPaint", boberstore: "BoberStore", mybober: "Мой бобёр", notepad: "Блокнот",
    settings: "Настройки", calculator: "Калькулятор", boberchat: "BoberChat",
    boberbrowser: "BoberBrowser", boberterminal: "Терминал", boberclock: "Часы", bobertunes: "BoberTunes",
    registryeditor: "Редактор Бобра",
    antivirus360: "360", spim: "Спим", bobercoin: "BoberCoin",
    bobermail: "BoberMail", boberweather: "BoberWeather", bobermaps: "BoberMaps", bobertube: "BoberTube",
    boberoffice: "BoberOffice", bobercalcpro: "BoberCalc Pro", bobervpn: "BoberVPN", bobercloud: "BoberCloud",
    bobertranslate: "BoberTranslate", bobermonitor: "BoberMonitor", bobercalendar: "BoberCalendar", boberstudio: "BoberStudio",
    flappybober: "Флэппи Бобёр", cs2: "КС2", cyberbober: "КиберБобер",
    snake: "Змейка Бобра", game2048: "2048 Бобра", minesweeper: "Сапёр",
    memory: "Память", rps: "Камень-Ножницы-Бумага", tictactoe: "Крестики-нолики", whackamole: "Реакция Бобра",
    tetris: "Тетрис Бобра", pong: "Пинг-Понг Бобра", breakout: "Арканоид Бобра", sokoban: "Сокобан Бобра",
    fifteen: "Пятнашки", hangman: "Виселица", simon: "Симон",
    bober3d: "Бобр3D", parkour: "БоброПаркур", rungun: "Бобр: Штурм",
    dinorunner: "БоброБег", sudoku: "Судоку Бобра", connect4: "Четыре в ряд", wordle: "БобрВорд",
  };
  return names[appId];
}
