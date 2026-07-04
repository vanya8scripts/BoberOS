"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function BoberCalcPro() {
  const [display, setDisplay] = useState("0");
  const [expr, setExpr] = useState("");
  const [mode, setMode] = useState<"std" | "sci">("sci");

  const press = (k: string) => {
    if (k === "C") { setDisplay("0"); setExpr(""); return; }
    if (k === "⌫") { setDisplay((d) => d.length > 1 ? d.slice(0, -1) : "0"); return; }
    if (k === "=") {
      try {
        const safe = expr.replace(/×/g, "*").replace(/÷/g, "/").replace(/π/g, "Math.PI").replace(/e/g, "Math.E").replace(/√/g, "Math.sqrt").replace(/sin/g, "Math.sin").replace(/cos/g, "Math.cos").replace(/tan/g, "Math.tan").replace(/\^/g, "**").replace(/log/g, "Math.log10");
        const r = Function(`"use strict";return (${safe || display})`)();
        setDisplay(String(Number(Number(r).toFixed(10))));
        setExpr(String(r));
      } catch { setDisplay("Ошибка"); }
      return;
    }
    if (k === "±") { setDisplay((d) => d.startsWith("-") ? d.slice(1) : "-" + d); return; }
    setExpr((e) => e + k);
    setDisplay((d) => d === "0" || "+-*/".includes(d.slice(-1)) ? k : d + k);
  };

  const sci = ["sin", "cos", "tan", "π", "√", "^", "log", "(", ")", "e", "7", "8", "9", "÷", "C", "4", "5", "6", "×", "⌫", "1", "2", "3", "-", "±", "0", ".", "=", "+", "%"];
  const std = ["C", "⌫", "%", "÷", "7", "8", "9", "×", "4", "5", "6", "-", "1", "2", "3", "+", "±", "0", ".", "="];

  const keys = mode === "sci" ? sci : std;

  return (
    <div className="flex h-full flex-col bg-zinc-900 p-3 text-white">
      <div className="mb-2 flex items-center gap-1">
        <button onClick={() => setMode("std")} className={cn("rounded-full px-3 py-1 text-[11px] font-medium", mode === "std" ? "bg-purple-500 text-white" : "bg-white/10 text-white/60")}>Стандарт</button>
        <button onClick={() => setMode("sci")} className={cn("rounded-full px-3 py-1 text-[11px] font-medium", mode === "sci" ? "bg-purple-500 text-white" : "bg-white/10 text-white/60")}>Инженерный</button>
      </div>

      <div className="mb-3 flex flex-1 flex-col items-end justify-end rounded-2xl bg-zinc-800 p-4">
        <span className="text-xs text-zinc-400">{expr || " "}</span>
        <span className="max-w-full overflow-x-auto text-right text-4xl font-bold">{display}</span>
      </div>

      <div className="grid gap-1.5" style={{ gridTemplateColumns: mode === "sci" ? "repeat(5,1fr)" : "repeat(4,1fr)" }}>
        {keys.map((k) => (
          <button
            key={k}
            onClick={() => press(k)}
            className={cn(
              "flex h-11 items-center justify-center rounded-xl text-sm font-semibold transition-colors active:scale-95",
              k === "=" && "bg-purple-500 text-white hover:bg-purple-600",
              "+-*/÷×".includes(k) && "bg-purple-900/50 text-purple-300 hover:bg-purple-800/60",
              ["C", "⌫"].includes(k) && "bg-rose-900/50 text-rose-300 hover:bg-rose-800/60",
              !["=","+","-","*","/","÷","×","C","⌫"].includes(k) && "bg-zinc-700 text-white hover:bg-zinc-600",
              (k === "0" && mode === "std") && "col-span-2"
            )}
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}
