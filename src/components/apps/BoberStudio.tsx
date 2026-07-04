"use client";

import { useState } from "react";
import { Play, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

const TEMPLATE = `

function плотина(ветки) {
  if (ветки < 10) {
    return "Мало веток!";
  }
  let прочность = 0;
  for (let i = 0; i < ветки; i++) {
    прочность += i;
  }
  return "Плотина прочностью " + прочность;
}

console.log(плотина(50));`;

function highlight(code: string) {
  return code
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/(\/\/.*$)/gm, '<span class="text-zinc-500 italic">$1</span>')
    .replace(/\b(function|let|const|var|for|if|else|return|console|log)\b/g, '<span class="text-purple-400 font-semibold">$1</span>')
    .replace(/\b(\d+)\b/g, '<span class="text-amber-400">$1</span>')
    .replace(/(".*?")/g, '<span class="text-emerald-400">$1</span>')
    .replace(/([a-zA-Zа-яА-Я]+)(?=\()/g, '<span class="text-sky-400">$1</span>');
}

export function BoberStudio() {
  const [code, setCode] = useState(TEMPLATE);
  const [output, setOutput] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  const run = () => {
    setRunning(true);
    setOutput([]);
    const logs: string[] = [];
    try {
      const fakeConsole = { log: (...a: unknown[]) => logs.push(a.map(String).join(" ")) };
      const fn = new Function("console", code);
      fn(fakeConsole);
      setOutput(logs.length ? logs : ["(нет вывода)"]);
    } catch (e) {
      setOutput(["Ошибка: " + (e as Error).message]);
    }
    setTimeout(() => setRunning(false), 400);
  };

  const lines = code.split("\n");

  return (
    <div className="flex h-full flex-col bg-[#1e1e2e] text-zinc-200">
      <div className="flex items-center gap-2 border-b border-white/10 bg-[#181825] px-3 py-2">
        <span className="text-sm font-bold text-teal-400">BoberStudio</span>
        <span className="text-xs text-zinc-500">main.js</span>
        <button onClick={run} disabled={running} className="ml-auto flex items-center gap-1.5 rounded-md bg-emerald-500 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-600 disabled:opacity-50">
          <Play className="h-3.5 w-3.5" /> {running ? "Выполняю..." : "Запустить"}
        </button>
        <button onClick={() => setCode(TEMPLATE)} className="grid h-7 w-7 place-items-center rounded-md text-zinc-400 hover:bg-white/10"><RotateCcw className="h-3.5 w-3.5" /></button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* editor */}
        <div className="relative flex flex-1 overflow-auto font-mono text-sm">
          <div className="select-none bg-[#181825] px-2 py-2 text-right text-zinc-600">
            {lines.map((_, i) => <div key={i} className="leading-6">{i + 1}</div>)}
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            className="absolute inset-0 ml-12 resize-none bg-transparent p-2 font-mono text-sm leading-6 text-transparent caret-teal-400 outline-none"
          />
          <pre
            className="pointer-events-none ml-12 whitespace-pre-wrap p-2 font-mono text-sm leading-6"
            dangerouslySetInnerHTML={{ __html: highlight(code) }}
          />
        </div>

        {/* output */}
        <div className="w-1/3 shrink-0 overflow-y-auto border-l border-white/10 bg-black/40 p-3 font-mono text-xs">
          <p className="mb-1 text-[10px] uppercase tracking-wide text-zinc-500">Вывод</p>
          {output.map((o, i) => (
            <div key={i} className={cn("py-0.5", o.startsWith("Ошибка") ? "text-rose-400" : "text-emerald-400")}>→ {o}</div>
          ))}
          {output.length === 0 && <p className="text-zinc-600">Нажмите «Запустить»...</p>}
        </div>
      </div>
    </div>
  );
}
