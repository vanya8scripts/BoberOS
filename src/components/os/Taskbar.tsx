"use client";

import { useEffect, useState } from "react";
import { Search, Save, Wifi, Volume2, Volume1, VolumeX, Battery, Bell, Moon, Sun, Monitor, ChevronUp } from "lucide-react";
import { useOS } from "@/lib/os-store";
import { APP_META } from "@/lib/app-meta";
import { AppIcon } from "./AppIcon";
import { StartMenu } from "./StartMenu";
import { cn } from "@/lib/utils";
import { sfx } from "@/lib/sfx";

export function Taskbar() {
  const windows = useOS((s) => s.windows);
  const openApp = useOS((s) => s.openApp);
  const focusWindow = useOS((s) => s.focusWindow);
  const restoreWindow = useOS((s) => s.restoreWindow);
  const installedApps = useOS((s) => s.installedApps);
  const saveProgress = useOS((s) => s.saveProgress);
  const hasUnsavedChanges = useOS((s) => s.hasUnsavedChanges);
  const darkMode = useOS((s) => s.darkMode);
  const toggleDarkMode = useOS((s) => s.toggleDarkMode);
  const volume = useOS((s) => s.volume);
  const setVolume = useOS((s) => s.setVolume);
  const keyboardLayout = useOS((s) => s.keyboardLayout);
  const setKeyboardLayout = useOS((s) => s.setKeyboardLayout);
  const language = useOS((s) => s.language);
  const [startOpen, setStartOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const [savedFlash, setSavedFlash] = useState(false);
  const [trayOpen, setTrayOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000 * 10);
    return () => clearInterval(t);
  }, []);

  const handleSave = () => {
    saveProgress();
    setSavedFlash(true);
    sfx.success();
    setTimeout(() => setSavedFlash(false), 1500);
  };

  const VolIcon = volume === 0 ? VolumeX : volume < 40 ? Volume1 : Volume2;
  const t = (ru: string, en: string) => language === "en" ? en : ru;

  return (
    <>
      {startOpen && (<><div className="fixed inset-0 z-[60]" onClick={() => setStartOpen(false)} /><StartMenu onClose={() => setStartOpen(false)} /></>)}
      {trayOpen && <div className="fixed inset-0 z-[60]" onClick={() => setTrayOpen(false)} />}
      {notifOpen && <div className="fixed inset-0 z-[60]" onClick={() => setNotifOpen(false)} />}

      {trayOpen && (
        <div className="fixed bottom-[52px] right-2 z-[61] w-80 rounded-2xl border border-white/15 bg-zinc-900/95 p-4 text-white shadow-2xl backdrop-blur-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-3">
            <button onClick={toggleDarkMode} className="grid h-10 w-10 place-items-center rounded-lg bg-white/10 hover:bg-white/20">
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <span className="text-xs text-white/70">{darkMode ? t("Светлая тема", "Light theme") : t("Тёмная тема", "Dark theme")}</span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <VolIcon className="h-5 w-5 text-white/70" />
            <input type="range" min={0} max={100} value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="flex-1 accent-sky-500" />
            <span className="w-8 text-right text-xs font-mono text-white/60">{volume}</span>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-white/5 p-2">
            <Wifi className="h-4 w-4 text-emerald-400" />
            <span className="text-xs text-white/70">BoberNet 5G</span>
            <span className="ml-auto text-[10px] text-emerald-400">{t("Подключено", "Connected")}</span>
          </div>
          <div className="mt-2 flex items-center gap-2 rounded-lg bg-white/5 p-2">
            <Monitor className="h-4 w-4 text-sky-400" />
            <span className="text-xs text-white/70">{t("Раскладка", "Layout")}</span>
            <button onClick={() => setKeyboardLayout(keyboardLayout === "ru" ? "en" : "ru")} className="ml-auto rounded bg-white/10 px-2 py-0.5 text-xs font-bold">
              {keyboardLayout === "ru" ? "RU" : "EN"}
            </button>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-1">
            <QuickBtn icon={<Moon className="h-4 w-4" />} label={t("Тема", "Theme")} onClick={toggleDarkMode} />
            <QuickBtn icon={<Volume2 className="h-4 w-4" />} label={t("Звук", "Sound")} onClick={() => setVolume(volume > 0 ? 0 : 70)} />
            <QuickBtn icon={<Battery className="h-4 w-4" />} label="98%" onClick={() => {}} />
          </div>
        </div>
      )}

      {notifOpen && (
        <div className="fixed bottom-[52px] right-2 z-[61] w-80 rounded-2xl border border-white/15 bg-zinc-900/95 p-4 text-white shadow-2xl backdrop-blur-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="mb-2 flex items-center gap-2">
            <Bell className="h-4 w-4 text-white/70" />
            <span className="text-xs font-semibold">{t("Уведомления", "Notifications")}</span>
          </div>
          <div className="space-y-2">
            <NotifItem icon="🐹" title={t("Бобёр", "Beaver")} text={t("Добро пожаловать в BoberOS!", "Welcome to BoberOS!")} time="now" />
            <NotifItem icon="🛒" title="BoberStore" text={t("Скачайте новые приложения!", "Download new apps!")} time="5m" />
            <NotifItem icon="🎮" title={t("Спим", "Spim")} text={t("Новые игры доступны!", "New games available!")} time="1h" />
          </div>
          <button onClick={() => { setNotifOpen(false); setTrayOpen(false); window.dispatchEvent(new Event("bober-shutdown")); }} className="mt-3 w-full rounded-lg bg-white/10 py-2 text-xs text-white/70 hover:bg-white/20">
            {t("Выключение", "Power")}
          </button>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 z-[55] flex h-12 items-center gap-1 border-t border-white/20 bg-zinc-900/85 px-2 backdrop-blur-2xl">
        <button onClick={() => { setStartOpen((v) => !v); sfx.click(); }} className={cn("flex h-9 items-center gap-2 rounded-md px-2.5 text-white transition-colors", startOpen ? "bg-white/20" : "hover:bg-white/10")} title="Start">
          <BeaverMark />
        </button>

        <button onClick={() => setStartOpen(true)} className="hidden items-center gap-2 rounded-md bg-white/10 px-3 py-1.5 text-xs text-white/60 hover:bg-white/15 sm:flex">
          <Search className="h-3.5 w-3.5" /> {t("Поиск", "Search")}
        </button>

        <div className="mx-1 h-6 w-px bg-white/15" />

        <div className="bober-scroll flex flex-1 items-center gap-0.5 overflow-x-auto">
          {installedApps.map((appId) => {
            const meta = APP_META[appId];
            const wins = windows.filter((w) => w.appId === appId);
            const active = wins.length > 0;
            return (
              <button
                key={appId}
                onClick={() => {
                  if (wins.length > 0) { const w = wins[0]; if (w.minimized) restoreWindow(w.id); else focusWindow(w.id); }
                  else { openApp(appId); sfx.open(); }
                }}
                title={meta.name}
                className={cn("relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-white/10", active && "bg-white/15")}
              >
                <AppIcon appId={appId} size={24} />
                {active && <span className="absolute -bottom-0.5 h-0.5 w-4 rounded-full bg-sky-400" />}
              </button>
            );
          })}
        </div>

        <button onClick={handleSave} title={t("Сохранить прогресс", "Save progress")} className={cn("flex h-9 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors", savedFlash ? "bg-emerald-500 text-white" : hasUnsavedChanges() ? "bg-amber-500/20 text-amber-200 hover:bg-amber-500/30" : "text-white/60 hover:bg-white/10")}>
          <Save className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{savedFlash ? t("Сохранено!", "Saved!") : hasUnsavedChanges() ? t("Сохранить*", "Save*") : t("Сохранить", "Save")}</span>
          {hasUnsavedChanges() && !savedFlash && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
        </button>

        <div className="flex items-center gap-0.5 px-1 text-white/70">
          <button onClick={() => setKeyboardLayout(keyboardLayout === "ru" ? "en" : "ru")} className="grid h-7 w-7 place-items-center rounded text-[10px] font-bold hover:bg-white/10" title={t("Раскладка", "Keyboard layout")}>
            {keyboardLayout === "ru" ? "RU" : "EN"}
          </button>
          <button onClick={() => setTrayOpen((v) => !v)} className="grid h-7 w-7 place-items-center rounded hover:bg-white/10" title={t("Сеть", "Network")}>
            <Wifi className="h-3.5 w-3.5 text-emerald-400" />
          </button>
          <button onClick={() => setTrayOpen((v) => !v)} className="grid h-7 w-7 place-items-center rounded hover:bg-white/10" title={t("Звук", "Volume")}>
            <VolIcon className="h-3.5 w-3.5" />
          </button>
          <button onClick={toggleDarkMode} className="grid h-7 w-7 place-items-center rounded hover:bg-white/10" title={t("Тема", "Theme")}>
            {darkMode ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
          </button>
          <Battery className="h-3.5 w-3.5" />
        </div>

        <button onClick={() => setNotifOpen((v) => !v)} className="flex flex-col items-end rounded-md px-2 py-1 leading-tight text-white hover:bg-white/10" title={t("Уведомления", "Notifications")}>
          <span className="text-xs font-medium">{now.toLocaleTimeString(language === "en" ? "en-US" : "ru-RU", { hour: "2-digit", minute: "2-digit" })}</span>
          <span className="text-[10px] opacity-70">{now.toLocaleDateString(language === "en" ? "en-US" : "ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" })}</span>
        </button>
        <button onClick={() => setNotifOpen((v) => !v)} className="grid h-7 w-5 place-items-center text-white/60 hover:bg-white/10">
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
      </div>
    </>
  );
}

function QuickBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 rounded-lg bg-white/5 py-2 text-[10px] text-white/70 hover:bg-white/10">
      {icon}
      <span>{label}</span>
    </button>
  );
}

function NotifItem({ icon, title, text, time }: { icon: string; title: string; text: string; time: string }) {
  return (
    <div className="flex gap-2 rounded-lg bg-white/5 p-2">
      <span className="text-xl">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white/90">{title}</span>
          <span className="text-[10px] text-white/40">{time}</span>
        </div>
        <p className="text-[11px] text-white/60">{text}</p>
      </div>
    </div>
  );
}

function BeaverMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 120 120">
      <ellipse cx="60" cy="62" rx="46" ry="42" fill="#8a5a2b" />
      <ellipse cx="60" cy="70" rx="34" ry="30" fill="#d9a96f" />
      <ellipse cx="44" cy="56" rx="6" ry="7" fill="#2a1a0a" />
      <ellipse cx="76" cy="56" rx="6" ry="7" fill="#2a1a0a" />
      <rect x="54" y="80" width="12" height="11" rx="2.5" fill="#fdfdf6" />
    </svg>
  );
}
