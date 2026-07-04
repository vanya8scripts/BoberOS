"use client";

import { useState } from "react";
import { Shield, Power, Globe, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const SERVERS = [
  { name: "Россия — Москва", flag: "🇷🇺", ping: 12, load: 23 },
  { name: "Бобрия — Плотинск", flag: "🐹", ping: 8, load: 15 },
  { name: "Германия — Берлин", flag: "🇩🇪", ping: 45, load: 41 },
  { name: "Япония — Токио", flag: "🇯🇵", ping: 120, load: 33 },
  { name: "США — Нью-Йорк", flag: "🇺🇸", ping: 98, load: 52 },
];

export function BoberVPN() {
  const [connected, setConnected] = useState(false);
  const [server, setServer] = useState(SERVERS[0]);
  const [connecting, setConnecting] = useState(false);

  const toggle = () => {
    if (connecting) return;
    if (connected) { setConnected(false); return; }
    setConnecting(true);
    setTimeout(() => { setConnected(true); setConnecting(false); }, 1500);
  };

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-zinc-900 to-emerald-950 text-white">
      <div className="flex items-center gap-2 p-4">
        <Shield className="h-5 w-5 text-emerald-400" />
        <h1 className="text-lg font-bold">BoberVPN</h1>
      </div>

      <div className="flex flex-col items-center gap-4 p-6">
        <button onClick={toggle} disabled={connecting} className="relative grid h-40 w-40 place-items-center rounded-full">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
            <circle
              cx="50" cy="50" r="44" fill="none" stroke={connected ? "#10b981" : "#fbbf24"} strokeWidth="6" strokeLinecap="round"
              strokeDasharray={`${connected ? 276 : (connecting ? 180 : 60)} 276`}
              className="transition-all duration-700"
              style={connecting ? { animation: "bober-vpn-spin 1.5s linear infinite" } : undefined}
            />
          </svg>
          <div className="flex flex-col items-center">
            {connecting ? (
              <Power className="h-10 w-10 animate-pulse text-amber-400" />
            ) : connected ? (
              <Check className="h-12 w-12 text-emerald-400" />
            ) : (
              <Power className="h-12 w-12 text-white/70" />
            )}
            <span className="mt-1 text-xs font-medium">
              {connecting ? "Подключение..." : connected ? "Защищено" : "Отключено"}
            </span>
          </div>
        </button>

        {connected && (
          <div className="grid w-full max-w-xs grid-cols-2 gap-2 text-center text-xs">
            <div className="rounded-xl bg-white/5 p-2"><p className="text-white/50">IP-адрес</p><p className="font-mono font-bold">192.168.🐹.1</p></div>
            <div className="rounded-xl bg-white/5 p-2"><p className="text-white/50">Пинг</p><p className="font-mono font-bold text-emerald-400">{server.ping} мс</p></div>
          </div>
        )}
      </div>

      <p className="px-4 pb-1 text-[11px] uppercase tracking-wide text-white/40">Серверы</p>
      <div className="bober-scroll flex-1 space-y-1 overflow-y-auto px-4 pb-4">
        {SERVERS.map((s) => (
          <button
            key={s.name}
            onClick={() => setServer(s)}
            className={cn("flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors", server.name === s.name ? "border-emerald-400 bg-emerald-500/10" : "border-white/10 hover:bg-white/5")}
          >
            <span className="text-2xl">{s.flag}</span>
            <div className="flex-1">
              <p className="text-sm font-medium">{s.name}</p>
              <p className="text-[11px] text-white/50">Пинг {s.ping}мс · Загрузка {s.load}%</p>
            </div>
            {server.name === s.name && connected && <Check className="h-4 w-4 text-emerald-400" />}
          </button>
        ))}
      </div>
      <style>{`@keyframes bober-vpn-spin{to{stroke-dashoffset:-276}}`}</style>
    </div>
  );
}
