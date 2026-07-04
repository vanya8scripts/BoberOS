"use client";

import { useState } from "react";
import { Cloud, Upload, Folder, File as FileIcon, Download, Trash2, HardDrive } from "lucide-react";
import { cn } from "@/lib/utils";

interface CloudFile { name: string; type: "folder" | "file"; size?: string; emoji?: string; }

const FILES: CloudFile[] = [
  { name: "Фото плотины", type: "folder" },
  { name: "Рецепты веток", type: "folder" },
  { name: "Сохранения игр", type: "folder" },
  { name: "бобёр_на_отдыхе.jpg", type: "file", size: "2.4 МБ", emoji: "🖼️" },
  { name: "хвост_качает.mp3", type: "file", size: "5.1 МБ", emoji: "🎵" },
  { name: "список_веток.doc", type: "file", size: "24 КБ", emoji: "📄" },
  { name: "пароли_от_плотины.txt", type: "file", size: "1 КБ", emoji: "🔐" },
  { name: "cyberbober_save.dat", type: "file", size: "16 КБ", emoji: "💾" },
  { name: "план_плотины_v2.pdf", type: "file", size: "880 КБ", emoji: "📐" },
];

export function BoberCloud() {
  const [selected, setSelected] = useState<string | null>(null);
  const used = 4.2;
  const total = 15;

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center gap-3 bg-gradient-to-r from-cyan-500 to-sky-600 px-4 py-3 text-white">
        <Cloud className="h-6 w-6" />
        <div>
          <h1 className="text-lg font-bold">BoberCloud</h1>
          <p className="text-[11px] text-white/80">Облако для грызунов</p>
        </div>
        <button className="ml-auto flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-xs font-medium hover:bg-white/30">
          <Upload className="h-3.5 w-3.5" /> Загрузить
        </button>
      </div>

      <div className="flex items-center gap-3 border-b border-zinc-200 px-4 py-2">
        <div className="flex-1">
          <div className="flex justify-between text-[11px] text-zinc-500"><span>Использовано {used} ГБ из {total} ГБ</span><span>{Math.round((used/total)*100)}%</span></div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200">
            <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-sky-500" style={{ width: `${(used/total)*100}%` }} />
          </div>
        </div>
        <HardDrive className="h-4 w-4 text-zinc-400" />
      </div>

      <div className="bober-scroll flex-1 overflow-y-auto p-3">
        <p className="mb-2 text-[11px] uppercase tracking-wide text-zinc-400">Мои файлы</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {FILES.map((f) => (
            <button
              key={f.name}
              onClick={() => setSelected(f.name)}
              className={cn("flex items-center gap-2 rounded-xl border-2 p-2.5 text-left", selected === f.name ? "border-sky-400 bg-sky-50" : "border-zinc-200 hover:border-sky-300")}
            >
              {f.type === "folder" ? <Folder className="h-8 w-8 text-amber-500" /> : <span className="text-2xl">{f.emoji}</span>}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-zinc-700">{f.name}</p>
                {f.size && <p className="text-[10px] text-zinc-400">{f.size}</p>}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-zinc-200 p-2">
        <button disabled={!selected} className="flex items-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-200 disabled:opacity-40">
          <Download className="h-3.5 w-3.5" /> Скачать
        </button>
        <button disabled={!selected} className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-100 disabled:opacity-40">
          <Trash2 className="h-3.5 w-3.5" /> Удалить
        </button>
        <span className="ml-auto text-[11px] text-zinc-400">{selected ? `Выбрано: ${selected}` : "Ничего не выбрано"}</span>
      </div>
    </div>
  );
}
