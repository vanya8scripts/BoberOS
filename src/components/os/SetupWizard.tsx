"use client";

import { useEffect, useRef, useState } from "react";
import { useOS } from "@/lib/os-store";
import { VERSION_LABEL, VALID_KEY } from "@/lib/app-meta";
import type { OsVersion } from "@/lib/os-types";
import { BeaverLogo } from "./BeaverLogo";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  ChevronLeft,
  Check,
  KeyRound,
  User,
  CheckCircle2,
  Loader2,
} from "lucide-react";

const AVATARS = ["🐹", "🐻", "🐰", "🦝", "🐹", "🦔", "🐯", "🐼", "🐨", "🐬"];

type Phase = "welcome" | "account" | "version" | "key" | "installing" | "vanya8";

const INSTALL_STEPS = [
  "Подготовка брёвен...",
  "Копирование системных файлов...",
  "Установка ядра BoberKernel...",
  "Настройка плотины...",
  "Регистрация бобра-администратора...",
  "Установка драйверов резцов...",
  "Финальная полировка хвоста...",
];

export function SetupWizard() {
  const completeSetup = useOS((s) => s.completeSetup);
  const [phase, setPhase] = useState<Phase>("welcome");
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("🐹");
  const [version, setVersion] = useState<OsVersion>("home");
  const [keyInput, setKeyInput] = useState("");
  const [keyError, setKeyError] = useState<string | null>(null);
  const [skipKey, setSkipKey] = useState(false);
  const [installProgress, setInstallProgress] = useState(0);
  const [installStep, setInstallStep] = useState(0);
  const [vanyaOpacity, setVanyaOpacity] = useState(1);

  useEffect(() => {
    if (phase !== "installing") return;
    const start = Date.now();
    const dur = 3500;
    const iv = setInterval(() => {
      const p = Math.min(100, ((Date.now() - start) / dur) * 100);
      setInstallProgress(p);
      setInstallStep(Math.min(INSTALL_STEPS.length - 1, Math.floor((p / 100) * INSTALL_STEPS.length)));
      if (p >= 100) {
        clearInterval(iv);
        setTimeout(() => setPhase("vanya8"), 400);
      }
    }, 40);
    return () => clearInterval(iv);
  }, [phase]);

  useEffect(() => {
    if (phase !== "vanya8") return;
    const t1 = setTimeout(() => setVanyaOpacity(0), 2200);
    const t2 = setTimeout(() => {
      completeSetup(name, avatar, version, skipKey ? false : true);
    }, 3200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [phase, name, avatar, version, skipKey, completeSetup]);

  const tryKey = () => {
    const k = keyInput.trim().toUpperCase();
    if (k === VALID_KEY) {
      setKeyError(null);
      setSkipKey(false);
      setPhase("installing");
    } else {
      setKeyError("Неверный ключ. Попробуйте ещё раз или продолжите без ключа.");
    }
  };

  const continueWithoutKey = () => {
    setSkipKey(true);
    setPhase("installing");
  };

  if (phase === "vanya8") {
    return (
      <div
        className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-black text-white transition-opacity duration-1000"
        style={{ opacity: vanyaOpacity }}
      >
        <BeaverLogo size={120} animate />
        <h1 className="mt-8 bg-gradient-to-r from-amber-300 via-orange-400 to-rose-500 bg-clip-text text-5xl font-black tracking-tight text-transparent sm:text-6xl">
          created by vanya8
        </h1>
        <p className="mt-3 text-sm text-white/40">BoberOS © 2026</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-gradient-to-br from-[#0a3d5c] via-[#0a2a4a] to-[#1a1a4a] p-4">
      <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/95 shadow-2xl backdrop-blur-xl">
        {/* Windows-like title bar */}
        <div className="flex items-center gap-2 bg-gradient-to-r from-sky-600 to-blue-700 px-5 py-3 text-white">
          <BeaverLogo size={26} />
          <div className="flex-1">
            <p className="text-sm font-bold">Установка BoberOS</p>
            <p className="text-[11px] text-white/70">Мастер установки системы</p>
          </div>
          <span className="rounded bg-white/20 px-2 py-0.5 text-[10px]">v1.2</span>
        </div>

        {/* progress dots */}
        <div className="flex items-center justify-center gap-2 border-b border-zinc-200 bg-zinc-50 px-5 py-2.5">
          {(["welcome", "account", "version", "key"] as Phase[]).map((p, i) => {
            const idx = ["welcome", "account", "version", "key"].indexOf(phase);
            const done = i < idx;
            const active = i === idx;
            return (
              <div key={p} className="flex items-center">
                <div
                  className={cn(
                    "grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold transition-colors",
                    done
                      ? "bg-emerald-500 text-white"
                      : active
                      ? "bg-sky-600 text-white"
                      : "bg-zinc-200 text-zinc-400"
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                {i < 3 && (
                  <div className={cn("h-0.5 w-8", done ? "bg-emerald-400" : "bg-zinc-200")} />
                )}
              </div>
            );
          })}
        </div>

        <div className="min-h-[340px] p-6">
          {/* WELCOME */}
          {phase === "welcome" && (
            <div className="flex flex-col items-center text-center">
              <BeaverLogo size={90} animate />
              <h2 className="mt-4 text-2xl font-black text-zinc-800">
                Добро пожаловать в BoberOS
              </h2>
              <p className="mt-2 max-w-md text-sm text-zinc-500">
                Операционная система для настоящих грызунов. Сейчас мы настроим
                вашу систему — это займёт меньше минуты.
              </p>
              <button
                onClick={() => setPhase("account")}
                className="mt-6 flex items-center gap-2 rounded-xl bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-sky-700"
              >
                Начать установку <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* ACCOUNT */}
          {phase === "account" && (
            <div>
              <h2 className="flex items-center gap-2 text-xl font-bold text-zinc-800">
                <User className="h-5 w-5 text-sky-600" /> Создание учётной записи
              </h2>
              <p className="mt-1 text-xs text-zinc-500">Как вас зовут? Выберите аватарку бобра.</p>

              <label className="mt-4 block text-xs font-medium text-zinc-600">Ваше имя</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Например: Ваня"
                maxLength={20}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
              />

              <label className="mt-4 block text-xs font-medium text-zinc-600">Аватарка</label>
              <div className="mt-1 grid grid-cols-5 gap-2 sm:grid-cols-10">
                {AVATARS.map((a) => (
                  <button
                    key={a}
                    onClick={() => setAvatar(a)}
                    className={cn(
                      "grid h-10 w-10 place-items-center rounded-xl text-2xl transition-all",
                      avatar === a
                        ? "bg-sky-100 ring-2 ring-sky-500 scale-110"
                        : "bg-zinc-100 hover:bg-zinc-200"
                    )}
                  >
                    {a}
                  </button>
                ))}
              </div>

              <div className="mt-6 flex justify-between">
                <button
                  onClick={() => setPhase("welcome")}
                  className="flex items-center gap-1 rounded-lg px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100"
                >
                  <ChevronLeft className="h-4 w-4" /> Назад
                </button>
                <button
                  onClick={() => setPhase("version")}
                  className="flex items-center gap-2 rounded-lg bg-sky-600 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-700"
                >
                  Далее <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* VERSION */}
          {phase === "version" && (
            <div>
              <h2 className="text-xl font-bold text-zinc-800">Выберите редакцию</h2>
              <p className="mt-1 text-xs text-zinc-500">
                Редакция влияет только на заставку. Все функции доступны везде. 🐹
              </p>
              <div className="mt-4 space-y-2">
                <VersionCard
                  active={version === "pro"}
                  onClick={() => setVersion("pro")}
                  title={VERSION_LABEL.pro}
                  desc="Максимальная мощность для бобров-профессионалов."
                  badge="PRO"
                  color="from-amber-400 to-orange-500"
                />
                <VersionCard
                  active={version === "home"}
                  onClick={() => setVersion("home")}
                  title={VERSION_LABEL.home}
                  desc="Идеальна для домашнего использования у плотины."
                  badge="HOME"
                  color="from-emerald-400 to-teal-500"
                />
                <VersionCard
                  active={version === "vkedition"}
                  onClick={() => setVersion("vkedition")}
                  title={VERSION_LABEL.vkedition}
                  desc="Специальная русская версия. С балалайкой и водкой (нет)."
                  badge="VK RU"
                  color="from-red-500 to-rose-700"
                />
              </div>
              <div className="mt-6 flex justify-between">
                <button
                  onClick={() => setPhase("account")}
                  className="flex items-center gap-1 rounded-lg px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100"
                >
                  <ChevronLeft className="h-4 w-4" /> Назад
                </button>
                <button
                  onClick={() => setPhase("key")}
                  className="flex items-center gap-2 rounded-lg bg-sky-600 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-700"
                >
                  Далее <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* KEY */}
          {phase === "key" && (
            <div>
              <h2 className="flex items-center gap-2 text-xl font-bold text-zinc-800">
                <KeyRound className="h-5 w-5 text-sky-600" /> Активация системы
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                Введите ключ продукта, если он есть. Или продолжите без ключа и
                активируйте позже за 500 BoberSoft в Настройках.
              </p>

              <label className="mt-4 block text-xs font-medium text-zinc-600">
                Ключ продукта
              </label>
              <input
                value={keyInput}
                onChange={(e) => {
                  setKeyInput(e.target.value);
                  setKeyError(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && tryKey()}
                placeholder="VANYA8-BOBEROS"
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm uppercase outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
              />
              {keyError && <p className="mt-1 text-xs text-rose-500">{keyError}</p>}
              <p className="mt-1 text-[11px] text-zinc-400">
                Подсказка: попробуйте <code className="rounded bg-zinc-100 px-1">VANYA8-BOBEROS</code>
              </p>

              <div className="mt-5 flex flex-col gap-2">
                <button
                  onClick={tryKey}
                  className="flex items-center justify-center gap-2 rounded-lg bg-sky-600 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
                >
                  <CheckCircle2 className="h-4 w-4" /> Активировать с ключом
                </button>
                <button
                  onClick={continueWithoutKey}
                  className="rounded-lg border border-zinc-300 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
                >
                  У меня нет ключа — продолжить (активирую позже)
                </button>
              </div>

              <div className="mt-5 flex justify-start">
                <button
                  onClick={() => setPhase("version")}
                  className="flex items-center gap-1 rounded-lg px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100"
                >
                  <ChevronLeft className="h-4 w-4" /> Назад
                </button>
              </div>
            </div>
          )}

          {/* INSTALLING */}
          {phase === "installing" && (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="relative grid h-28 w-28 place-items-center">
                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="44" fill="none" stroke="#e0f2fe" strokeWidth="8" />
                  <circle
                    cx="50" cy="50" r="44" fill="none" stroke="#0284c7" strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${(installProgress / 100) * 276} 276`}
                  />
                </svg>
                <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
              </div>
              <p className="mt-4 text-sm font-medium text-zinc-700">
                {INSTALL_STEPS[installStep]}
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                Установка... {Math.round(installProgress)}%
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function VersionCard({
  active,
  onClick,
  title,
  desc,
  badge,
  color,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  desc: string;
  badge: string;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-all",
        active ? "border-sky-500 bg-sky-50" : "border-zinc-200 hover:border-sky-300"
      )}
    >
      <div className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white", color)}>
        <BeaverLogo size={28} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-bold text-zinc-800">{title}</h3>
          <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-bold text-white bg-gradient-to-r", color)}>
            {badge}
          </span>
        </div>
        <p className="truncate text-xs text-zinc-500">{desc}</p>
      </div>
      <div
        className={cn(
          "grid h-6 w-6 place-items-center rounded-full border-2",
          active ? "border-sky-500 bg-sky-500" : "border-zinc-300"
        )}
      >
        {active && <Check className="h-3.5 w-3.5 text-white" />}
      </div>
    </button>
  );
}
