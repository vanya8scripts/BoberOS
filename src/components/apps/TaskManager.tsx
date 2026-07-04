"use client";

import { useState } from "react";
import { X, Cpu, MemoryStick, HardDrive, Network, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Proc { name: string; cpu: number; mem: number; type: "system" | "app" | "game"; }

const BASE_PROCS: Proc[] = [
  { name: "BoberKernel.sys", cpu: 3, mem: 64, type: "system" },
  { name: "Плотина-сервис", cpu: 1, mem: 16, type: "system" },
  { name: "Хвост-драйвер", cpu: 0.5, mem: 8, type: "system" },
  { name: "Резцы-демон", cpu: 0.3, mem: 4, type: "system" },
  { name: "BoberStore", cpu: 2, mem: 48, type: "app" },
  { name: "BoberChat", cpu: 1, mem: 32, type: "app" },
  { name: "BoberTunes", cpu: 4, mem: 56, type: "app" },
  { name: "CyberBober.exe", cpu: 28, mem: 128, type: "game" },
  { name: "360 Antivirus", cpu: 6, mem: 48, type: "app" },
  { name: "Терминал", cpu: 0.2, mem: 12, type: "app" },
];

export function TaskManager() {
  const [procs, setProcs] = useState(BASE_PROCS);
  const [tick, setTick] = useState(0);
  const [tab, setTab] = useState<"procs" | "perf">("procs");
  const [selected, setSelected] = useState<number | null>(null);

  const refresh = () => {
    setProcs((ps) => ps.map((p) => ({ ...p, cpu: Math.max(0.1, Math.round((p.cpu + (Math.random() - 0.5) * 8) * 10) / 10), mem: Math.max(4, p.mem + Math.round((Math.random() - 0.5) * 16)) })));
    setTick((t) => t + 1);
  };

  const kill = (idx: number) => {
    setProcs((ps) => ps.filter((_, i) => i !== idx));
    setSelected(null);
  };

  const totalCpu = procs.reduce((s, p) => s + p.cpu, 0);
  const totalMem = procs.reduce((s, p) => s + p.mem, 0);
  const cpuPct = Math.min(100, totalCpu);
  const memPct = Math.min(100, (totalMem / 512) * 100);

  const typeColor = { system: "text-sky-400", app: "text-emerald-400", game: "text-fuchsia-400" };
  const typeLabel = { system: "Система", app: "Приложение", game: "Игра" };

  return (
    <div className="flex h-full flex-col bg-zinc-900 text-white">
      <div className="flex items-center gap-1 border-b border-white/10 px-3 py-2">
        <button onClick={() => setTab("procs")} className={cn("rounded-md px-3 py-1 text-xs font-medium", tab === "procs" ? "bg-sky-500 text-white" : "text-white/60 hover:bg-white/10")}>Процессы</button>
        <button onClick={() => setTab("perf")} className={cn("rounded-md px-3 py-1 text-xs font-medium", tab === "perf" ? "bg-sky-500 text-white" : "text-white/60 hover:bg-white/10")}>Производительность</button>
        <button onClick={refresh} className="ml-auto flex items-center gap-1 rounded-md px-2 py-1 text-xs text-white/60 hover:bg-white/10">
          <RefreshCw className="h-3.5 w-3.5" /> Обновить
        </button>
      </div>

      {tab === "procs" && (
        <>
          <div className="grid grid-cols-[1fr_60px_80px_80px] border-b border-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/50">
            <span>Имя процесса</span>
            <span>Тип</span>
            <span className="text-right">ЦП %</span>
            <span className="text-right">Память</span>
          </div>
          <div className="bober-scroll flex-1 overflow-y-auto">
            {procs.map((p, i) => (
              <div
                key={i}
                onClick={() => setSelected(i)}
                className={cn(
                  "grid cursor-pointer grid-cols-[1fr_60px_80px_80px] border-b border-white/5 px-3 py-1.5 text-xs hover:bg-white/5",
                  selected === i && "bg-sky-500/20"
                )}
              >
                <span className="truncate font-mono text-white/90">{p.name}</span>
                <span className={cn("text-[10px]", typeColor[p.type])}>{typeLabel[p.type]}</span>
                <span className="text-right text-sky-300">{p.cpu.toFixed(1)}%</span>
                <span className="text-right text-violet-300">{p.mem} КБ</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 border-t border-white/10 p-2">
            <span className="text-[11px] text-white/50">Всего: ЦП {totalCpu.toFixed(1)}% · Память {totalMem} КБ</span>
            <button
              onClick={() => selected !== null && kill(selected)}
              disabled={selected === null || procs[selected]?.type === "system"}
              className="ml-auto flex items-center gap-1 rounded-md bg-rose-600 px-3 py-1 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-40"
            >
              <X className="h-3.5 w-3.5" /> Снять задачу
            </button>
          </div>
        </>
      )}

      {tab === "perf" && (
        <div className="bober-scroll flex-1 space-y-3 overflow-y-auto p-4">
          <PerfCard icon={<Cpu className="h-5 w-5 text-sky-400" />} label="Процессор" value={`${cpuPct.toFixed(0)}%`} sub="Бобёр-одиночка 1 ядро @ 2.4 ГГц">
            <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-500 transition-all" style={{ width: `${cpuPct}%` }} /></div>
          </PerfCard>
          <PerfCard icon={<MemoryStick className="h-5 w-5 text-violet-400" />} label="Память" value={`${memPct.toFixed(0)}%`} sub={`${totalMem} / 512 КБ веток`}>
            <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all" style={{ width: `${memPct}%` }} /></div>
          </PerfCard>
          <PerfCard icon={<HardDrive className="h-5 w-5 text-emerald-400" />} label="Диск" value="20%" sub="12 / 60 ГБ · Плотина SSD">
            <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: "20%" }} /></div>
          </PerfCard>
          <PerfCard icon={<Network className="h-5 w-5 text-amber-400" />} label="Сеть" value="42 Мбит/с" sub="BoberNet 5G · приём 12 · отдача 30">
            <div className="mt-2 flex h-8 items-end gap-0.5">
              {Array.from({ length: 30 }).map((_, i) => (
                <div key={i + tick} className="flex-1 rounded-t bg-amber-400/70" style={{ height: `${20 + Math.random() * 80}%` }} />
              ))}
            </div>
          </PerfCard>
        </div>
      )}
    </div>
  );
}

function PerfCard({ icon, label, value, sub, children }: { icon: React.ReactNode; label: string; value: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-medium text-white/80">{label}</span>
        <span className="ml-auto text-2xl font-black">{value}</span>
      </div>
      <p className="mt-0.5 text-[11px] text-white/40">{sub}</p>
      {children}
    </div>
  );
}
