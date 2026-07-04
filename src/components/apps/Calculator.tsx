"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface CalcButtonProps {
  label: React.ReactNode;
  onClick: () => void;
  variant?: "num" | "op" | "fn" | "eq";
  wide?: boolean;
}

function CalcButton({ label, onClick, variant = "num", wide }: CalcButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-center rounded-xl text-lg font-semibold transition-colors active:scale-95",
        wide ? "col-span-2" : "",
        variant === "num" && "bg-zinc-100 text-zinc-800 hover:bg-zinc-200",
        variant === "op" && "bg-amber-100 text-amber-700 hover:bg-amber-200",
        variant === "fn" && "bg-zinc-200 text-zinc-600 hover:bg-zinc-300",
        variant === "eq" && "bg-amber-500 text-white hover:bg-amber-600"
      )}
    >
      {label}
    </button>
  );
}

export function Calculator() {
  const [display, setDisplay] = useState("0");
  const [prev, setPrev] = useState<number | null>(null);
  const [op, setOp] = useState<string | null>(null);
  const [fresh, setFresh] = useState(true);

  const inputDigit = (d: string) => {
    if (fresh) {
      setDisplay(d === "." ? "0." : d);
      setFresh(false);
    } else {
      if (d === "." && display.includes(".")) return;
      setDisplay(display === "0" && d !== "." ? d : display + d);
    }
  };

  const compute = (a: number, b: number, o: string) => {
    switch (o) {
      case "+": return a + b;
      case "−": return a - b;
      case "×": return a * b;
      case "÷": return b === 0 ? NaN : a / b;
      default: return b;
    }
  };

  const chooseOp = (o: string) => {
    const cur = parseFloat(display);
    if (prev !== null && op && !fresh) {
      const res = compute(prev, cur, op);
      setPrev(res);
      setDisplay(String(Number(res.toFixed(10))));
    } else {
      setPrev(cur);
    }
    setOp(o);
    setFresh(true);
  };

  const equals = () => {
    if (op === null || prev === null) return;
    const cur = parseFloat(display);
    const res = compute(prev, cur, op);
    setDisplay(Number.isNaN(res) ? "Ошибка" : String(Number(res.toFixed(10))));
    setPrev(null);
    setOp(null);
    setFresh(true);
  };

  const clearAll = () => {
    setDisplay("0");
    setPrev(null);
    setOp(null);
    setFresh(true);
  };

  const toggleSign = () => {
    if (display === "0" || display === "Ошибка") return;
    setDisplay(display.startsWith("-") ? display.slice(1) : "-" + display);
  };

  const percent = () => {
    setDisplay(String(parseFloat(display) / 100));
    setFresh(true);
  };

  return (
    <div className="flex h-full flex-col bg-zinc-900 p-3">
      {/* display */}
      <div className="mb-3 flex flex-1 flex-col items-end justify-end rounded-2xl bg-zinc-800 p-4">
        {prev !== null && op && (
          <span className="text-sm text-zinc-400">
            {prev} {op}
          </span>
        )}
        <span className="max-w-full overflow-x-auto text-right text-4xl font-bold text-white">
          {display}
        </span>
      </div>

      {/* buttons */}
      <div className="grid grid-cols-4 gap-2" style={{ gridAutoRows: "1fr" }}>
        <CalcButton label="AC" variant="fn" onClick={clearAll} />
        <CalcButton label="±" variant="fn" onClick={toggleSign} />
        <CalcButton label="%" variant="fn" onClick={percent} />
        <CalcButton label="÷" variant="op" onClick={() => chooseOp("÷")} />

        <CalcButton label="7" onClick={() => inputDigit("7")} />
        <CalcButton label="8" onClick={() => inputDigit("8")} />
        <CalcButton label="9" onClick={() => inputDigit("9")} />
        <CalcButton label="×" variant="op" onClick={() => chooseOp("×")} />

        <CalcButton label="4" onClick={() => inputDigit("4")} />
        <CalcButton label="5" onClick={() => inputDigit("5")} />
        <CalcButton label="6" onClick={() => inputDigit("6")} />
        <CalcButton label="−" variant="op" onClick={() => chooseOp("−")} />

        <CalcButton label="1" onClick={() => inputDigit("1")} />
        <CalcButton label="2" onClick={() => inputDigit("2")} />
        <CalcButton label="3" onClick={() => inputDigit("3")} />
        <CalcButton label="+" variant="op" onClick={() => chooseOp("+")} />

        <CalcButton label="0" wide onClick={() => inputDigit("0")} />
        <CalcButton label="." onClick={() => inputDigit(".")} />
        <CalcButton label="=" variant="eq" onClick={equals} />
      </div>
    </div>
  );
}
