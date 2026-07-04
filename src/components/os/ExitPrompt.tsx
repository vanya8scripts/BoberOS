"use client";

import { useOS } from "@/lib/os-store";
import { Save, X, LogOut, RotateCcw, AlertTriangle } from "lucide-react";

export function ExitPrompt() {
  const exitAction = useOS((s) => s.exitAction);
  const confirmExit = useOS((s) => s.confirmExit);
  const cancelExit = useOS((s) => s.cancelExit);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center gap-3 bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-3 text-white">
          <AlertTriangle className="h-5 w-5" />
          <h2 className="text-sm font-bold">
            {exitAction === "shutdown" ? "Выход из системы" : "Перезагрузка"}
          </h2>
        </div>
        <div className="p-5">
          <p className="text-sm text-zinc-700">
            Хотите выйти? Вы можете сохранить прогресс (установленные приложения и игры).
          </p>
          <p className="mt-2 text-xs text-zinc-400">
            Без сохранения установленные после запуска приложения будут удалены
            при следующем входе.
          </p>

          <div className="mt-5 flex flex-col gap-2">
            <button
              onClick={() => confirmExit(true)}
              className="flex items-center justify-center gap-2 rounded-lg bg-emerald-500 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"
            >
              <Save className="h-4 w-4" />
              Сохранить и выйти
            </button>
            <button
              onClick={() => confirmExit(false)}
              className="flex items-center justify-center gap-2 rounded-lg bg-zinc-200 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-300"
            >
              {exitAction === "shutdown" ? <LogOut className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
              Выйти без сохранения
            </button>
            <button
              onClick={cancelExit}
              className="flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm text-zinc-500 hover:bg-zinc-100"
            >
              <X className="h-4 w-4" /> Отмена
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
