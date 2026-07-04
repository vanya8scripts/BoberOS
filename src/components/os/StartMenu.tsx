"use client";

import { useState } from "react";
import { Power, Search, Save } from "lucide-react";
import { useOS } from "@/lib/os-store";
import { APP_META, VERSION_LABEL } from "@/lib/app-meta";
import { AppIcon } from "./AppIcon";
import { cn } from "@/lib/utils";

interface StartMenuProps {
  onClose: () => void;
}

export function StartMenu({ onClose }: StartMenuProps) {
  const installedApps = useOS((s) => s.installedApps);
  const openApp = useOS((s) => s.openApp);
  const saveProgress = useOS((s) => s.saveProgress);
  const hasUnsavedChanges = useOS((s) => s.hasUnsavedChanges);
  const userName = useOS((s) => s.userName);
  const userAvatar = useOS((s) => s.userAvatar);
  const customAvatar = useOS((s) => s.customAvatar);
  const osVersion = useOS((s) => s.osVersion);
  const activated = useOS((s) => s.activated);
  const [q, setQ] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);

  const filtered = installedApps.filter((a) =>
    APP_META[a].name.toLowerCase().includes(q.toLowerCase())
  );

  const handleSave = () => {
    saveProgress();
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1200);
  };

  const handlePower = () => {
    onClose();
    window.dispatchEvent(new Event("bober-shutdown"));
  };

  return (
    <div className="fixed bottom-[60px] left-1/2 z-[61] flex h-[560px] w-[640px] max-w-[95vw] -translate-x-1/2 flex-col overflow-hidden rounded-2xl border border-white/15 bg-zinc-900/95 text-white shadow-2xl backdrop-blur-2xl">
      <div className="flex items-center gap-2 border-b border-white/10 p-4">
        <Search className="h-4 w-4 opacity-60" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Поиск приложений..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-white/40"
        />
      </div>

      <div className="bober-scroll flex-1 overflow-y-auto p-4">
        <p className="mb-2 text-[11px] uppercase tracking-wide text-white/40">Все приложения</p>
        <div className="grid grid-cols-4 gap-1 sm:grid-cols-6">
          {filtered.map((appId) => (
            <button
              key={appId}
              onClick={() => { openApp(appId); onClose(); }}
              className="flex flex-col items-center gap-1.5 rounded-xl p-3 text-center transition-colors hover:bg-white/10"
            >
              <AppIcon appId={appId} size={40} />
              <span className="line-clamp-2 text-[11px] leading-tight text-white/90">
                {APP_META[appId].name}
              </span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full py-8 text-center text-xs text-white/40">
              Ничего не найдено. Бобёр в замешательстве.
            </p>
          )}
        </div>
      </div>

      <div className="border-t border-white/10 px-4 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 overflow-hidden rounded-full bg-gradient-to-br from-amber-400 to-orange-600">
              {customAvatar ? <img src={customAvatar} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-lg">{userAvatar}</div>}
            </div>
            <div>
              <p className="text-sm font-medium">{userName || "Бобёр"}</p>
              <p className="text-[10px] text-white/50">
                {VERSION_LABEL[osVersion]} {!activated && "· не активирована"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleSave}
              title="Сохранить прогресс"
              className={cn(
                "relative grid h-8 w-8 place-items-center rounded-lg hover:bg-white/10",
                savedFlash ? "text-emerald-400" : hasUnsavedChanges() ? "text-amber-300" : "text-white/60"
              )}
            >
              <Save className="h-4 w-4" />
              {hasUnsavedChanges() && !savedFlash && (
                <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-400" />
              )}
            </button>
            <button
              onClick={handlePower}
              title="Выключение"
              className="grid h-8 w-8 place-items-center rounded-lg text-white/60 hover:bg-white/10"
            >
              <Power className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
