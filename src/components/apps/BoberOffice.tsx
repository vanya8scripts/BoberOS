"use client";

import { useState } from "react";
import { Bold, Italic, Underline, List, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function BoberOffice() {
  const [text, setText] = useState("Добро пожаловать в BoberOffice!\n\nЗдесь можно писать документы, заметки и письма другим бобрам.\n\nБобёр одобряет этот текстовый редактор. 🐹");
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [underline, setUnderline] = useState(false);
  const [align, setAlign] = useState<"left" | "center" | "right">("left");

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-3 py-2">
        <span className="text-sm font-bold text-blue-600">BoberOffice</span>
        <span className="text-xs text-zinc-400">Документ1.bobr</span>
        <div className="ml-auto flex gap-1">
          <button onClick={() => { const blob = new Blob([text], { type: "text/plain" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "документ.bobr"; a.click(); }} className="rounded-md bg-blue-500 px-3 py-1 text-xs font-medium text-white hover:bg-blue-600">Сохранить</button>
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-zinc-200 px-2 py-1">
        <ToolBtn active={bold} onClick={() => setBold(!bold)}><Bold className="h-4 w-4" /></ToolBtn>
        <ToolBtn active={italic} onClick={() => setItalic(!italic)}><Italic className="h-4 w-4" /></ToolBtn>
        <ToolBtn active={underline} onClick={() => setUnderline(!underline)}><Underline className="h-4 w-4" /></ToolBtn>
        <div className="mx-1 h-5 w-px bg-zinc-200" />
        <ToolBtn active={align === "left"} onClick={() => setAlign("left")}><AlignLeft className="h-4 w-4" /></ToolBtn>
        <ToolBtn active={align === "center"} onClick={() => setAlign("center")}><AlignCenter className="h-4 w-4" /></ToolBtn>
        <ToolBtn active={align === "right"} onClick={() => setAlign("right")}><AlignRight className="h-4 w-4" /></ToolBtn>
        <div className="mx-1 h-5 w-px bg-zinc-200" />
        <ToolBtn onClick={() => setText(text + "\n• ")}><List className="h-4 w-4" /></ToolBtn>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="bober-scroll flex-1 resize-none bg-white p-6 text-sm leading-relaxed text-zinc-800 outline-none"
        style={{ fontWeight: bold ? "bold" : "normal", fontStyle: italic ? "italic" : "normal", textDecoration: underline ? "underline" : "none", textAlign: align }}
      />

      <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] text-zinc-400">
        <span>{text.split(/\s+/).filter(Boolean).length} слов · {text.length} символов</span>
        <span>Готов к сохранению</span>
      </div>
    </div>
  );
}

function ToolBtn({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn("grid h-7 w-7 place-items-center rounded-md", active ? "bg-blue-100 text-blue-700" : "text-zinc-600 hover:bg-zinc-200")}>
      {children}
    </button>
  );
}
