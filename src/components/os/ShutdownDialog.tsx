"use client";

import { useEffect, useState } from "react";
import { Power, Save, X, AlertTriangle } from "lucide-react";
import { useOS } from "@/lib/os-store";
import { cn } from "@/lib/utils";

export function ShutdownDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("bober-shutdown", handler);
    return () => window.removeEventListener("bober-shutdown", handler);
  }, []);

  const reboot = useOS((s) => s.reboot);
  const saveProgress = useOS((s) => s.saveProgress);
  const hasUnsavedChanges = useOS((s) => s.hasUnsavedChanges);
  const language = useOS((s) => s.language);
  const en = language === "en";

  if (!open) return null;

  const unsaved = hasUnsavedChanges();

  const doShutdown = (save: boolean) => {
    if (save) saveProgress();
    setOpen(false);
    reboot();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-amber-100">
            <AlertTriangle className="h-7 w-7 text-amber-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-zinc-800">{en ? "Want to exit?" : "Хотите выйти?"}</h2>
            <p className="mt-1 text-sm text-zinc-500">
              {unsaved
                ? (en ? "You have unsaved changes. You can save before exiting." : "У вас есть несохранённые изменения. Вы можете сохранить прогресс перед выходом.")
                : (en ? "All changes saved. Safe to exit." : "Все изменения уже сохранены. Можно спокойно выходить.")}
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="grid h-8 w-8 place-items-center rounded-lg text-zinc-400 hover:bg-zinc-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-2">
          {unsaved && (
            <button
              onClick={() => doShutdown(true)}
              className="flex w-full items-center gap-3 rounded-xl bg-emerald-500 px-4 py-3 text-left text-white hover:bg-emerald-600"
            >
              <Save className="h-5 w-5" />
              <div>
                <p className="text-sm font-bold">{en ? "Save and exit" : "Сохранить и выйти"}</p>
                <p className="text-[11px] text-white/80">{en ? "Progress will be saved" : "Прогресс будет сохранён"}</p>
              </div>
            </button>
          )}
          <button
            onClick={() => doShutdown(false)}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left",
              unsaved ? "bg-zinc-100 text-zinc-700 hover:bg-zinc-200" : "bg-rose-500 text-white hover:bg-rose-600"
            )}
          >
            <Power className="h-5 w-5" />
            <div>
              <p className="text-sm font-bold">{unsaved ? (en ? "Exit without saving" : "Выйти без сохранения") : (en ? "Power off" : "Выключить")}</p>
              <p className={cn("text-[11px]", unsaved ? "text-zinc-500" : "text-white/80")}>
                {unsaved ? (en ? "Unsaved apps will be lost" : "Несохранённые приложения будут потеряны") : (en ? "Restart BoberOS" : "Перезагрузка BoberOS")}
              </p>
            </div>
          </button>
          <button
            onClick={() => setOpen(false)}
            className="w-full rounded-xl px-4 py-2.5 text-center text-sm text-zinc-500 hover:bg-zinc-100"
          >
            {en ? "Cancel" : "Отмена"}
          </button>
        </div>
      </div>
    </div>
  );
}
