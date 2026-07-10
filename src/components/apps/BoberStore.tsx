"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Check, Star, ShoppingCart, Lock, Sparkles } from "lucide-react";
import { useOS } from "@/lib/os-store";
import type { AppId } from "@/lib/os-types";
import { AppIcon } from "@/components/os/AppIcon";
import { cn } from "@/lib/utils";

interface StoreApp {
  appId: AppId;
  tagline: string;
  rating: number;
  downloads: string;
  category: string;
  badge?: string;
}

const STORE_APPS: StoreApp[] = [
  { appId: "antivirus360", tagline: "Защита от бобро-вирусов и злых барсуков", rating: 4.6, downloads: "12 млн", category: "Безопасность", badge: "ТОП" },
  { appId: "spim", tagline: "Магазин игр: 30+ игр от Флэппи до 3D-шутеров", rating: 4.8, downloads: "48 млн", category: "Игры", badge: "ХИТ" },
  { appId: "bobercoin", tagline: "Майним монеты кликами. 1 клик = 100 BBC", rating: 4.9, downloads: "99 млн", category: "Финансы", badge: "🤑" },
  { appId: "bobermail", tagline: "Почта для грызунов с фейковой папкой входящих", rating: 4.5, downloads: "8 млн", category: "Связь" },
  { appId: "boberweather", tagline: "Прогноз погоды: дождь, снег, ветки с неба", rating: 4.3, downloads: "15 млн", category: "Утилиты" },
  { appId: "bobermaps", tagline: "Карты Бобрии: плотины, реки, леса веток", rating: 4.4, downloads: "20 млн", category: "Навигация" },
  { appId: "bobertube", tagline: "Видео про бобров: стройка, игры, рецепты", rating: 4.7, downloads: "60 млн", category: "Развлечения", badge: "NEW" },
  { appId: "boberoffice", tagline: "Текстовый редактор с форматированием", rating: 4.2, downloads: "7 млн", category: "Офис" },
  { appId: "bobercalcpro", tagline: "Инженерный калькулятор: sin, cos, π, √", rating: 4.6, downloads: "9 млн", category: "Утилиты" },
  { appId: "bobervpn", tagline: "VPN: прячь IP за плотиной", rating: 4.1, downloads: "11 млн", category: "Безопасность" },
  { appId: "bobercloud", tagline: "Облачное хранилище 15 ГБ для веток", rating: 4.4, downloads: "14 млн", category: "Облако" },
  { appId: "bobertranslate", tagline: "Переводчик: русский ↔ бобрий ↔ барсучий", rating: 4.0, downloads: "6 млн", category: "Утилиты" },
  { appId: "bobermonitor", tagline: "Мониторинг CPU/RAM плотины в реальном времени", rating: 4.5, downloads: "5 млн", category: "Система", badge: "NEW" },
  { appId: "bobercalendar", tagline: "Календарь с бобро-праздниками", rating: 4.2, downloads: "7 млн", category: "Офис" },
  { appId: "boberstudio", tagline: "Редактор кода с подсветкой и запуском JS", rating: 4.8, downloads: "4 млн", category: "Разработка", badge: "NEW" },
  { appId: "boberpiano", tagline: "Пианино! Играй на клавишах, записывай мелодии", rating: 4.7, downloads: "9 млн", category: "Музыка", badge: "NEW" },
  { appId: "boberdice", tagline: "Генератор костей D4-D100. Для настолок", rating: 4.4, downloads: "3 млн", category: "Утилиты" },
  { appId: "boberspeedtest", tagline: "Проверь скорость BoberNet 5G", rating: 4.5, downloads: "6 млн", category: "Утилиты", badge: "NEW" },
];

const COMING_SOON_APPS = [
  { name: "BoberBank", category: "Финансы", emoji: "🏦" },
  { name: "BoberShop", category: "Покупки", emoji: "🛍️" },
  { name: "BoberTaxi", category: "Транспорт", emoji: "🚕" },
  { name: "BoberFood", category: "Еда", emoji: "🍽️" },
  { name: "BoberFit", category: "Спорт", emoji: "💪" },
  { name: "BoberPay", category: "Финансы", emoji: "💳" },
  { name: "BoberSocial", category: "Сети", emoji: "💬" },
  { name: "BoberRadio", category: "Музыка", emoji: "📻" },
  { name: "BoberPaint3D", category: "Графика", emoji: "🎨" },
  { name: "BoberQuiz", category: "Викторины", emoji: "❓" },
  { name: "BoberRacing", category: "Гонки", emoji: "🏁" },
  { name: "BoberChess", category: "Логика", emoji: "♟️" },
];

export function BoberStore() {
  const installedApps = useOS((s) => s.installedApps);
  const installApp = useOS((s) => s.installApp);
  const openApp = useOS((s) => s.openApp);
  const activated = useOS((s) => s.activated);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [cat, setCat] = useState<string>("Все");
  const timers = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  useEffect(() => () => { Object.values(timers.current).forEach(clearInterval); }, []);

  const handleInstall = (appId: AppId) => {
    if (timers.current[appId]) return;
    if (installedApps.includes(appId)) return;
    setProgress((p) => ({ ...p, [appId]: 0 }));
    const start = Date.now();
    const dur = 1600;
    timers.current[appId] = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - start) / dur) * 100);
      setProgress((p) => ({ ...p, [appId]: pct }));
      if (pct >= 100) {
        clearInterval(timers.current[appId]);
        delete timers.current[appId];
        installApp(appId);
        setProgress((p) => { const n = { ...p }; delete n[appId]; return n; });
      }
    }, 40);
  };

  const cats = ["Все", ...Array.from(new Set(STORE_APPS.map((a) => a.category)))];
  const filtered = cat === "Все" ? STORE_APPS : STORE_APPS.filter((a) => a.category === cat);

  if (!activated) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-5 bg-gradient-to-b from-zinc-50 to-zinc-100 p-6 text-center">
        <div className="relative">
          <div className="grid h-24 w-24 place-items-center rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-600 shadow-xl shadow-emerald-500/30">
            <Lock className="h-12 w-12 text-white" />
          </div>
          <span className="absolute -right-2 -top-2 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">ЗАБЛОКИРОВАНО</span>
        </div>
        <div>
          <h2 className="text-xl font-black text-zinc-800">BoberStore заблокирован</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500">
            Активируйте BoberOS ключом <span className="font-mono text-emerald-600">VANYA8-BOBEROS</span> или за 500 BoberSoft в Настройках.
          </p>
        </div>
        <button onClick={() => openApp("settings")} className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-600">
          <Sparkles className="h-4 w-4" /> Перейти к активации
        </button>
        <p className="text-xs text-zinc-400">Подсказка: BoberCoin доступен и без активации — накликай 500 и выведи на BoberSoft.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center gap-3 bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3 text-white">
        <ShoppingCart className="h-6 w-6" />
        <div>
          <h1 className="text-lg font-bold">BoberStore</h1>
          <p className="text-[11px] text-white/80">{STORE_APPS.length} приложений · Официальный магазин BoberOS</p>
        </div>
        <div className="ml-auto flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs">
          <span className="h-2 w-2 rounded-full bg-green-300" /> Активировано
        </div>
      </div>

      <div className="bober-scroll flex-1 overflow-y-auto p-4">
        {/* banner */}
        <div className="mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-fuchsia-600 via-purple-700 to-indigo-900 p-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-wider text-fuchsia-200">Эксклюзив</p>
          <h2 className="mt-1 text-xl font-black">КиберБобер — всего 3500 BoberSoft</h2>
          <p className="mt-1 text-sm text-white/80">Накликай монеты в BoberCoin, выведи на Спим и стань легендой стрельбы!</p>
        </div>

        {/* categories */}
        <div className="bober-scroll mb-3 flex gap-1.5 overflow-x-auto pb-1">
          {cats.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={cn("shrink-0 rounded-full px-3 py-1 text-xs font-medium", cat === c ? "bg-emerald-500 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200")}>{c}</button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((app) => {
            const installed = installedApps.includes(app.appId);
            const pct = progress[app.appId];
            const isInstalling = pct !== undefined;
            return (
              <div key={app.appId} className="flex gap-3 rounded-2xl border border-zinc-200 bg-white p-3 transition-shadow hover:shadow-md">
                <div className="relative shrink-0">
                  <AppIcon appId={app.appId} size={56} />
                  {app.badge && <span className="absolute -right-1 -top-1 rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold text-white shadow">{app.badge}</span>}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-semibold text-zinc-800">{appName(app.appId)}</h3>
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500">{app.category}</span>
                  </div>
                  <p className="line-clamp-2 text-xs text-zinc-500">{app.tagline}</p>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-400">
                    <span className="flex items-center gap-0.5"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{app.rating}</span>
                    <span>·</span><span>{app.downloads}</span>
                  </div>
                  <div className="mt-auto pt-2">
                    {installed ? (
                      <button onClick={() => openApp(app.appId)} className="flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-200"><Check className="h-3.5 w-3.5" /> Открыть</button>
                    ) : isInstalling ? (
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-28 overflow-hidden rounded-full bg-zinc-200"><div className="h-full rounded-full bg-emerald-500 transition-[width] duration-75" style={{ width: `${pct}%` }} /></div>
                        <span className="w-9 text-[11px] font-mono text-zinc-500">{Math.round(pct)}%</span>
                      </div>
                    ) : (
                      <button onClick={() => handleInstall(app.appId)} className="flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-600"><Download className="h-3.5 w-3.5" /> Установить</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function appName(appId: AppId) {
  const names: Record<AppId, string> = {
    bpaint: "BPaint", boberstore: "BoberStore", mybober: "Мой бобёр", notepad: "Блокнот",
    settings: "Настройки", calculator: "Калькулятор", boberchat: "BoberChat",
    boberbrowser: "BoberBrowser", boberterminal: "Терминал", boberclock: "Часы", bobertunes: "BoberTunes",
    registryeditor: "Редактор Бобра",
    antivirus360: "360 Антивирус", spim: "Спим", bobercoin: "BoberCoin",
    bobermail: "BoberMail", boberweather: "BoberWeather", bobermaps: "BoberMaps", bobertube: "BoberTube",
    boberoffice: "BoberOffice", bobercalcpro: "BoberCalc Pro", bobervpn: "BoberVPN", bobercloud: "BoberCloud",
    bobertranslate: "BoberTranslate", bobermonitor: "BoberMonitor", bobercalendar: "BoberCalendar", boberstudio: "BoberStudio",
    boberpiano: "BoberPiano", boberdice: "BoberDice", boberspeedtest: "BoberSpeedtest",
    flappybober: "Флэппи Бобёр", cs2: "КС2", cyberbober: "КиберБобер",
    snake: "Змейка Бобра", game2048: "2048 Бобра", minesweeper: "Сапёр",
    memory: "Память", rps: "Камень-Ножницы-Бумага", tictactoe: "Крестики-нолики", whackamole: "Реакция Бобра",
    tetris: "Тетрис Бобра", pong: "Пинг-Понг Бобра", breakout: "Арканоид Бобра", sokoban: "Сокобан Бобра",
    fifteen: "Пятнашки", hangman: "Виселица", simon: "Симон",
    dinorunner: "БоброБег", sudoku: "Судоку Бобра", connect4: "Четыре в ряд", wordle: "БобрВорд",
    gallery: "Галерея", taskmanager: "Диспетчер задач",
  };
  return names[appId];
}
