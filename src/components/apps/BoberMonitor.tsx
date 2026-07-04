"use client";

import { useEffect, useState } from "react";
import { Cpu, MemoryStick, HardDrive, Activity, Thermometer } from "lucide-react";

function Sparkline({ data, color }: { data: number[]; color: string }) {
  return (
    <svg viewBox="0 0 100 30" className="h-12 w-full" preserveAspectRatio="none">
      <polyline fill="none" stroke={color} strokeWidth="1.5"
        points={data.map((v, i) => `${(i / (data.length - 1)) * 100},${30 - (v / 100) * 30}`).join(" ")}
      />
      <polygon fill={color} opacity="0.15"
        points={`0,30 ${data.map((v, i) => `${(i / (data.length - 1)) * 100},${30 - (v / 100) * 30}`).join(" ")} 100,30`}
      />
    </svg>
  );
}

export function BoberMonitor() {
  const [cpu, setCpu] = useState<number[]>(Array(40).fill(20));
  const [ram, setRam] = useState<number[]>(Array(40).fill(40));
  const [stats, setStats] = useState({ cpu: 20, ram: 45, disk: 12, temp: 38, processes: 24 });

  useEffect(() => {
    const iv = setInterval(() => {
      setCpu((p) => {
        const next = Math.max(5, Math.min(95, p[p.length - 1] + (Math.random() - 0.5) * 30));
        return [...p.slice(1), next];
      });
      setRam((p) => {
        const next = Math.max(30, Math.min(85, p[p.length - 1] + (Math.random() - 0.5) * 10));
        return [...p.slice(1), next];
      });
      setStats((s) => ({
        ...s,
        cpu: Math.round(Math.random() * 60 + 10),
        ram: Math.round(Math.random() * 30 + 40),
        temp: Math.round(Math.random() * 15 + 32),
        processes: Math.round(Math.random() * 10 + 20),
      }));
    }, 700);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="bober-scroll h-full overflow-y-auto bg-zinc-900 p-4 text-white">
      <div className="mb-3 flex items-center gap-2">
        <Activity className="h-5 w-5 text-emerald-400" />
        <h1 className="text-lg font-bold">Мониторинг системы</h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card icon={<Cpu className="h-4 w-4 text-sky-400" />} label="Процессор" value={`${stats.cpu}%`} sub="Бобёр-одиночка 1 ядро">
          <Sparkline data={cpu} color="#38bdf8" />
        </Card>
        <Card icon={<MemoryStick className="h-4 w-4 text-violet-400" />} label="Память" value={`${stats.ram}%`} sub="512 КБ веток">
          <Sparkline data={ram} color="#a78bfa" />
        </Card>
        <Card icon={<HardDrive className="h-4 w-4 text-emerald-400" />} label="Диск" value={`${stats.disk}/60 ГБ`} sub="Плотина SSD">
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-emerald-400" style={{ width: "20%" }} />
          </div>
        </Card>
        <Card icon={<Thermometer className="h-4 w-4 text-rose-400" />} label="Температура" value={`${stats.temp}°C`} sub="Охлаждение речной водой">
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-rose-500" style={{ width: `${(stats.temp / 80) * 100}%` }} />
          </div>
        </Card>
      </div>

      <p className="mb-2 mt-4 text-[11px] uppercase tracking-wide text-white/40">Процессы ({stats.processes})</p>
      <div className="overflow-hidden rounded-xl border border-white/10">
        <table className="w-full text-xs">
          <thead className="bg-white/5 text-white/60">
            <tr><th className="p-2 text-left font-medium">Имя</th><th className="p-2 text-left font-medium">CPU</th><th className="p-2 text-left font-medium">Память</th></tr>
          </thead>
          <tbody>
            {[
              { n: "BoberKernel.sys", c: 12, m: 64 },
              { n: "CyberBober.exe", c: 28, m: 128 },
              { n: "BoberTunes.exe", c: 4, m: 32 },
              { n: "360 Antivirus", c: 8, m: 48 },
              { n: "Плотина-сервис", c: 2, m: 16 },
              { n: "Хвост-драйвер", c: 1, m: 8 },
            ].map((p) => (
              <tr key={p.n} className="border-t border-white/5">
                <td className="p-2 font-mono text-white/80">{p.n}</td>
                <td className="p-2 text-sky-300">{p.c}%</td>
                <td className="p-2 text-violet-300">{p.m} КБ</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Card({ icon, label, value, sub, children }: { icon: React.ReactNode; label: string; value: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-medium text-white/70">{label}</span>
        <span className="ml-auto text-lg font-black">{value}</span>
      </div>
      <p className="mt-0.5 text-[10px] text-white/40">{sub}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}
