"use client";

import { useState } from "react";
import { Coins, ArrowDownToLine, Sparkles, Building2, Gamepad2 } from "lucide-react";
import { useOS } from "@/lib/os-store";
import { cn } from "@/lib/utils";

export function BoberCoin() {
  const balance = useOS((s) => s.bobercoinBalance);
  const bobersoft = useOS((s) => s.bobersoftBalance);
  const spim = useOS((s) => s.spimBalance);
  const activated = useOS((s) => s.activated);
  const clickCoin = useOS((s) => s.clickCoin);
  const withdrawToBoberSoft = useOS((s) => s.withdrawToBoberSoft);
  const withdrawToSpim = useOS((s) => s.withdrawToSpim);
  const [floats, setFloats] = useState<{ id: number; x: number; y: number }[]>([]);
  const [pulse, setPulse] = useState(false);
  const [flash, setFlash] = useState<"bobersoft" | "spim" | null>(null);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    clickCoin(100);
    const rect = e.currentTarget.getBoundingClientRect();
    const id = Date.now() + Math.random();
    setFloats((f) => [...f, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 800);
    setPulse(true);
    setTimeout(() => setPulse(false), 150);
  };

  const withdraw = (target: "bobersoft" | "spim") => {
    if (balance <= 0) return;
    if (target === "bobersoft") withdrawToBoberSoft();
    else withdrawToSpim();
    setFlash(target);
    setTimeout(() => setFlash(null), 1500);
  };

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-amber-50 to-yellow-100">
      <div className="flex items-center gap-3 bg-gradient-to-r from-amber-500 to-yellow-600 px-5 py-3 text-white">
        <Coins className="h-6 w-6" />
        <div>
          <h1 className="text-lg font-bold">BoberCoin</h1>
          <p className="text-[11px] text-white/80">Майнинг кликами. 1 клик = 100 BBC</p>
        </div>
      </div>

      <div className="bober-scroll flex flex-1 flex-col items-center justify-center gap-4 p-4">
        {/* 3 balances */}
        <div className="grid w-full max-w-md grid-cols-3 gap-2">
          <div className="rounded-2xl border border-amber-200 bg-white p-2.5 text-center shadow-sm">
            <p className="text-[10px] uppercase tracking-wide text-amber-600">Кошелёк</p>
            <p className="text-lg font-black text-amber-700">{balance}</p>
            <p className="text-[9px] text-zinc-400">BBC</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-2.5 text-center shadow-sm">
            <p className="flex items-center justify-center gap-0.5 text-[10px] uppercase tracking-wide text-zinc-500">
              <Building2 className="h-2.5 w-2.5" /> BoberSoft
            </p>
            <p className="text-lg font-black text-zinc-700">{bobersoft}</p>
            <p className="text-[9px] text-zinc-400">{activated ? "лиц." : "для актив."}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-2.5 text-center shadow-sm">
            <p className="flex items-center justify-center gap-0.5 text-[10px] uppercase tracking-wide text-zinc-500">
              <Gamepad2 className="h-2.5 w-2.5" /> Спим
            </p>
            <p className="text-lg font-black text-zinc-700">{spim}</p>
            <p className="text-[9px] text-zinc-400">для игр</p>
          </div>
        </div>

        {/* coin */}
        <button
          onClick={handleClick}
          className="relative grid h-40 w-40 place-items-center rounded-full transition-transform active:scale-95"
          style={{ transform: pulse ? "scale(0.96)" : "scale(1)" }}
        >
          <span className="absolute inset-0 rounded-full bg-amber-400/40 blur-xl" />
          <svg viewBox="0 0 100 100" className="relative h-40 w-40 drop-shadow-2xl">
            <defs>
              <radialGradient id="coin-g" cx="35%" cy="30%">
                <stop offset="0" stopColor="#fff7cc" />
                <stop offset="0.5" stopColor="#fbbf24" />
                <stop offset="1" stopColor="#b45309" />
              </radialGradient>
            </defs>
            <circle cx="50" cy="50" r="46" fill="url(#coin-g)" stroke="#92400e" strokeWidth="3" />
            <circle cx="50" cy="50" r="38" fill="none" stroke="#fde68a" strokeWidth="2" strokeDasharray="2 3" />
            <text x="50" y="62" textAnchor="middle" fontSize="38" fontWeight="900" fill="#7c2d12" fontFamily="sans-serif">B</text>
          </svg>
          {floats.map((f) => (
            <span
              key={f.id}
              className="pointer-events-none absolute text-lg font-black text-amber-600"
              style={{ left: f.x, top: f.y, animation: "coin-float 0.8s ease-out forwards" }}
            >
              +100
            </span>
          ))}
        </button>
        <p className="text-xs text-zinc-500">Нажимай на монету, чтобы майнить!</p>

        {/* TWO withdraw buttons */}
        <div className="grid w-full max-w-md grid-cols-2 gap-2">
          <button
            onClick={() => withdraw("bobersoft")}
            disabled={balance <= 0}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold text-white transition-colors disabled:opacity-40",
              flash === "bobersoft" ? "bg-emerald-500" : "bg-zinc-600 hover:bg-zinc-700"
            )}
          >
            <Building2 className="h-3.5 w-3.5" />
            {flash === "bobersoft" ? "Готово!" : "На BoberSoft"}
          </button>
          <button
            onClick={() => withdraw("spim")}
            disabled={balance <= 0}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold text-white transition-colors disabled:opacity-40",
              flash === "spim" ? "bg-emerald-500" : "bg-zinc-700 hover:bg-zinc-800"
            )}
          >
            <Gamepad2 className="h-3.5 w-3.5" />
            {flash === "spim" ? "Готово!" : "На Спим"}
          </button>
        </div>

        <div className="flex w-full max-w-md items-start gap-2 rounded-xl bg-amber-100/70 p-3 text-xs text-amber-800">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <b>BoberSoft</b> — для активации OS (500) и покупок в BoberStore.
            <b> Спим</b> — для покупки игр (КиберБобер = 3500). Накликай и выведи куда нужно!
          </p>
        </div>
      </div>

      <style>{`
        @keyframes coin-float {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-50px) scale(1.4); }
        }
      `}</style>
    </div>
  );
}
