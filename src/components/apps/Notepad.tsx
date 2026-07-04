"use client";

import { Download, Trash2, FileText, Clock } from "lucide-react";
import { useOS } from "@/lib/os-store";

export function Notepad() {
  const text = useOS((s) => s.notepadText);
  const setText = useOS((s) => s.setNotepadText);

  const handleSave = () => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "заметки_бобра.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  const lines = text.split("\n").length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <div className="flex h-full flex-col bg-white">
      {/* menu */}
      <div className="flex items-center gap-1 border-b border-zinc-200 bg-zinc-50 px-2 py-1.5 text-xs">
        <button
          onClick={() => setText("")}
          className="flex items-center gap-1 rounded px-2 py-1 font-medium text-zinc-600 hover:bg-zinc-200"
        >
          <FileText className="h-3.5 w-3.5" /> Новый
        </button>
        <button
          onClick={handleSave}
          className="flex items-center gap-1 rounded px-2 py-1 font-medium text-zinc-600 hover:bg-zinc-200"
        >
          <Download className="h-3.5 w-3.5" /> Сохранить .txt
        </button>
        <button
          onClick={() => setText("")}
          className="flex items-center gap-1 rounded px-2 py-1 font-medium text-zinc-600 hover:bg-zinc-200"
        >
          <Trash2 className="h-3.5 w-3.5" /> Очистить
        </button>
        <span className="ml-auto flex items-center gap-1 text-[11px] text-zinc-400">
          <Clock className="h-3 w-3" /> автосохранение включено
        </span>
      </div>

      {/* editor */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
        className="flex-1 resize-none bg-white p-4 font-mono text-sm leading-relaxed text-zinc-800 outline-none"
        placeholder="Пиши здесь свои бобро-заметки..."
      />

      {/* status bar */}
      <div className="flex items-center gap-4 border-t border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] text-zinc-500">
        <span>Строк: {lines}</span>
        <span>Слов: {words}</span>
        <span>Символов: {text.length}</span>
        <span className="ml-auto">UTF-8 · Блокнот BoberOS</span>
      </div>
    </div>
  );
}
