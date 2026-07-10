"use client";

import { useState } from "react";
import { useOS } from "@/lib/os-store";
import { cn } from "@/lib/utils";
import { Plus, Trash2, Power } from "lucide-react";

export function UserSelect() {
  const users = useOS((s) => s.users);
  const loginUser = useOS((s) => s.loginUser);
  const deleteUser = useOS((s) => s.deleteUser);
  const setBootPhase = useOS((s) => s.setBootPhase);
  const language = useOS((s) => s.language);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const t = (ru: string, en: string) => (language === "en" ? en : ru);

  const handleNewUser = () => setBootPhase("oobe");

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-b from-[#0a3d5c] via-[#0e5a8a] to-[#0a1a3a] text-white">
      <div className="pointer-events-none absolute inset-0 opacity-20" style={{ background: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.3), transparent 60%)" }} />

      <div className="relative flex flex-col items-center">
        <h1 className="text-3xl font-light tracking-wide text-white/90">{t("Кто пользуется BoberOS?", "Who's using BoberOS?")}</h1>

        <div className="mt-8 flex flex-wrap items-start justify-center gap-4">
          {users.map((u) => (
            <div key={u.id} className="group flex flex-col items-center gap-2">
              <button
                onClick={() => loginUser(u.id)}
                className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-2xl border border-white/15 bg-white/5 backdrop-blur transition-all hover:scale-105 hover:border-white/40 hover:bg-white/10"
              >
                <div className="h-14 w-14 overflow-hidden rounded-full bg-gradient-to-br from-amber-400 to-orange-600">
                  {u.customAvatar ? (
                    <img src={u.customAvatar} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-3xl">{u.avatar}</div>
                  )}
                </div>
              </button>
              <span className="max-w-[96px] truncate text-sm font-medium text-white/90">{u.name}</span>
              <button
                onClick={() => setConfirmDelete(u.id)}
                className="text-zinc-400 opacity-0 transition-opacity hover:text-rose-400 group-hover:opacity-100"
                title={t("Удалить", "Delete")}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          <button
            onClick={handleNewUser}
            className="flex h-24 w-24 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/25 text-white/60 transition-all hover:scale-105 hover:border-white/50 hover:bg-white/5 hover:text-white/90"
          >
            <div className="grid h-14 w-14 place-items-center rounded-full bg-white/10">
              <Plus className="h-7 w-7" />
            </div>
            <span className="text-xs">{t("Добавить", "Add user")}</span>
          </button>
        </div>

        <button
          onClick={() => setBootPhase("bios")}
          className="mt-10 flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs text-white/60 backdrop-blur hover:bg-white/10 hover:text-white"
        >
          <Power className="h-3.5 w-3.5" /> {t("Перезагрузка", "Restart")}
        </button>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/60 p-4" onClick={() => setConfirmDelete(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 text-zinc-800 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold">{t("Удалить пользователя?", "Delete user?")}</h3>
            <p className="mt-1 text-xs text-zinc-500">{t("Все сохранения этого пользователя будут потеряны.", "All this user's saves will be lost.")}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="rounded-lg px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-100">{t("Отмена", "Cancel")}</button>
              <button onClick={() => { deleteUser(confirmDelete); setConfirmDelete(null); }} className="rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-600">{t("Удалить", "Delete")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
