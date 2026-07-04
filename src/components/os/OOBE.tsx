"use client";

import { useRef, useState } from "react";
import { useOS, type OSVersion } from "@/lib/os-store";
import type { Language } from "@/lib/os-types";
import { BeaverLogo } from "./BeaverLogo";
import { cn } from "@/lib/utils";
import { Check, ChevronRight, KeyRound, User, Upload, Globe } from "lucide-react";

const AVATARS = ["🐹", "🐭", "🐻", "🐼", "🦊", "🐸", "🐧", "🦉", "🐙", "🦋", "🌺", "🍄"];
const VALID_KEY = "VANYA8-BOBEROS";

type Step = "language" | "welcome" | "profile" | "version" | "key" | "install";

const INSTALL_STEPS: Record<Language, string[]> = {
  ru: ["Копирование брёвен...", "Настройка плотины...", "Установка резцов...", "Калибровка хвоста...", "Запуск ядра BoberOS..."],
  en: ["Copying logs...", "Setting up dam...", "Installing teeth...", "Calibrating tail...", "Starting BoberOS kernel..."],
};

export function OOBE() {
  const completeSetup = useOS((s) => s.completeSetup);
  const setCustomAvatar = useOS((s) => s.setCustomAvatar);
  const [step, setStep] = useState<Step>("language");
  const [lang, setLang] = useState<Language>("ru");
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("🐹");
  const [customPhoto, setCustomPhoto] = useState<string | null>(null);
  const [version, setVersion] = useState<OSVersion>("pro");
  const [keyInput, setKeyInput] = useState("");
  const [keyError, setKeyError] = useState(false);
  const [willActivate, setWillActivate] = useState(false);
  const [installProgress, setInstallProgress] = useState(0);
  const [installIdx, setInstallIdx] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const t = (ru: string, en: string) => lang === "en" ? en : ru;

  const onPhoto = (files: FileList | null) => {
    if (!files || !files[0]) return;
    const reader = new FileReader();
    reader.onload = () => setCustomPhoto(reader.result as string);
    reader.readAsDataURL(files[0]);
  };

  const verifyKey = () => {
    if (keyInput.trim().toUpperCase() === VALID_KEY) {
      setKeyError(false);
      setWillActivate(true);
      setStep("install");
      startInstall();
    } else if (keyInput.trim() === "") {
      setKeyError(false);
      setWillActivate(false);
      setStep("install");
      startInstall();
    } else {
      setKeyError(true);
    }
  };

  const startInstall = () => {
    const start = Date.now();
    const dur = 3200;
    const steps = INSTALL_STEPS[lang];
    const iv = setInterval(() => {
      const p = Math.min(100, ((Date.now() - start) / dur) * 100);
      setInstallProgress(p);
      setInstallIdx(Math.min(steps.length - 1, Math.floor((p / 100) * steps.length)));
      if (p >= 100) {
        clearInterval(iv);
        setTimeout(() => {
          if (customPhoto) setCustomAvatar(customPhoto);
          completeSetup({ name: name.trim() || (lang === "en" ? "Beaver" : "Бобёр"), avatar, version, activated: willActivate, language: lang });
        }, 400);
      }
    }, 40);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-b from-[#0a3d5c] via-[#0e5a8a] to-[#0a3d5c] text-white">
      <div className="pointer-events-none absolute inset-0 opacity-30" style={{ background: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.4), transparent 50%)" }} />

      <a
        href="https://github.com/vanya8scripts"
        target="_blank"
        rel="noopener noreferrer"
        title="GitHub"
        className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white/70 backdrop-blur transition-all hover:scale-110 hover:border-white/50 hover:bg-white/10 hover:text-white"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
          <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
        </svg>
      </a>

      <div className="relative w-full max-w-lg px-6">

        {step === "language" && (
          <div className="flex flex-col items-center text-center">
            <Globe className="h-16 w-16 text-white/80" />
            <h1 className="mt-4 text-3xl font-black">BoberOS</h1>
            <p className="mt-1 text-sm text-white/60">{t("Выберите язык", "Choose language")}</p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => { setLang("ru"); setStep("welcome"); }} className="flex w-36 flex-col items-center gap-2 rounded-2xl border-2 border-white/20 bg-white/5 p-5 transition-all hover:border-white/50 hover:bg-white/10">
                <span className="text-4xl">🇷🇺</span>
                <span className="text-sm font-bold">Русский</span>
              </button>
              <button onClick={() => { setLang("en"); setStep("welcome"); }} className="flex w-36 flex-col items-center gap-2 rounded-2xl border-2 border-white/20 bg-white/5 p-5 transition-all hover:border-white/50 hover:bg-white/10">
                <span className="text-4xl">🇬🇧</span>
                <span className="text-sm font-bold">English</span>
              </button>
            </div>
          </div>
        )}

        {step === "welcome" && (
          <div className="flex flex-col items-center text-center">
            <BeaverLogo size={110} animate />
            <h1 className="mt-5 text-4xl font-black">BoberOS</h1>
            <p className="mt-2 text-sm text-white/70">{t("Операционная система для настоящих грызунов", "OS for real rodents")}</p>
            <p className="mt-8 max-w-sm text-sm text-white/60">{t("Давайте настроим вашу систему. Это займёт меньше минуты.", "Let's set up your system. This takes less than a minute.")}</p>
            <button onClick={() => setStep("profile")} className="mt-8 flex items-center gap-2 rounded-xl bg-white px-8 py-3 text-sm font-bold text-[#0a3d5c] shadow-xl transition-transform hover:scale-105">
              {t("Начать настройку", "Get started")} <ChevronRight className="h-4 w-4" />
            </button>
            <button onClick={() => setStep("language")} className="mt-3 text-xs text-white/50 hover:text-white/80">{t("Изменить язык", "Change language")}</button>
          </div>
        )}

        {step === "profile" && (
          <Card title={t("Кто будет пользоваться BoberOS?", "Who will use BoberOS?")} icon={<User className="h-5 w-5" />}>
            <label className="text-xs font-medium text-white/70">{t("Ваше имя", "Your name")}</label>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && setStep("version")} placeholder={t("Например, Ваня", "e.g. Vanya")} maxLength={20} className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-white placeholder:text-white/40 outline-none focus:border-white/50" />

            <label className="mt-5 block text-xs font-medium text-white/70">{t("Аватарка", "Avatar")}</label>
            <div className="mt-2 flex items-center gap-3">
              <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white/10">
                {customPhoto ? <img src={customPhoto} alt="avatar" className="h-full w-full object-cover" /> : <span className="text-3xl">{avatar}</span>}
              </div>
              <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-medium hover:bg-white/20">
                <Upload className="h-3.5 w-3.5" /> {t("Загрузить фото", "Upload photo")}
              </button>
              {customPhoto && <button onClick={() => setCustomPhoto(null)} className="text-xs text-rose-300 hover:text-rose-200">{t("Убрать", "Remove")}</button>}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPhoto(e.target.files)} />
            </div>
            <div className="mt-2 grid grid-cols-6 gap-2">
              {AVATARS.map((a) => (
                <button key={a} onClick={() => { setAvatar(a); setCustomPhoto(null); }} className={cn("grid h-10 w-full place-items-center rounded-xl text-xl transition-all", !customPhoto && avatar === a ? "bg-white text-white ring-2 ring-white scale-110" : "bg-white/10 hover:bg-white/20")}>{a}</button>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-white/5 p-3">
              {customPhoto ? <img src={customPhoto} alt="avatar" className="h-8 w-8 rounded-full object-cover" /> : <span className="text-2xl">{avatar}</span>}
              <span className="text-sm text-white/70">{t("Привет,", "Hi,")} <b className="text-white">{name.trim() || (lang === "en" ? "Beaver" : "Бобёр")}</b>!</span>
            </div>
            <NavButtons onBack={() => setStep("welcome")} onNext={() => setStep("version")} back={t("Назад", "Back")} next={t("Далее", "Next")} />
          </Card>
        )}

        {step === "version" && (
          <Card title={t("Выберите редакцию BoberOS", "Choose your edition")} icon={<BeaverLogo size={20} />}>
            <p className="mb-3 text-xs text-white/50">{t("Редакция влияет только на оформление.", "Edition only affects appearance.")}</p>
            <div className="space-y-2">
              <VersionCard active={version === "pro"} onClick={() => setVersion("pro")} name="BoberOS Pro" desc={t("Максимальная производительность", "Maximum performance")} badge="PRO" color="from-amber-400 to-orange-600" />
              <VersionCard active={version === "home"} onClick={() => setVersion("home")} name="BoberOS Home" desc={t("Идеально для дома", "Perfect for home")} badge="HOME" color="from-emerald-400 to-teal-600" />
              <VersionCard active={version === "max"} onClick={() => setVersion("max")} name="BoberOS Max VK EDITION RUSSIA" desc={t("Лимитированная версия", "Limited edition")} badge="MAX" color="from-red-500 to-rose-700" />
            </div>
            <NavButtons onBack={() => setStep("profile")} onNext={() => setStep("key")} back={t("Назад", "Back")} next={t("Далее", "Next")} />
          </Card>
        )}

        {step === "key" && (
          <Card title={t("Активация BoberOS", "Activate BoberOS")} icon={<KeyRound className="h-5 w-5" />}>
            <p className="mb-3 text-xs text-white/60">{t("Введите ключ продукта, если он у вас есть. Или пропустите — активировать можно позже.", "Enter your product key if you have one. Or skip — activate later in Settings.")}</p>
            <input autoFocus value={keyInput} onChange={(e) => { setKeyInput(e.target.value); setKeyError(false); }} onKeyDown={(e) => e.key === "Enter" && verifyKey()} placeholder="VANYA8-BOBEROS" className={cn("w-full rounded-xl border bg-white/10 px-4 py-2.5 font-mono text-white placeholder:text-white/30 outline-none", keyError ? "border-rose-400" : "border-white/20 focus:border-white/50")} />
            {keyError && <p className="mt-2 text-xs text-rose-300">{t("Неверный ключ.", "Invalid key.")}</p>}
            <div className="mt-3 rounded-lg bg-white/5 p-2.5 text-[11px] text-white/50">{t("Подсказка: ключ выглядит как", "Hint: key looks like")} <span className="font-mono text-white/70">VANYA8-BOBEROS</span></div>
            <div className="mt-5 flex items-center justify-between gap-2">
              <button onClick={() => { setWillActivate(false); setStep("install"); startInstall(); }} className="rounded-xl px-4 py-2.5 text-sm text-white/70 hover:bg-white/10">{t("Нет ключа — пропустить", "No key — skip")}</button>
              <button onClick={verifyKey} className="rounded-xl bg-white px-6 py-2.5 text-sm font-bold text-[#0a3d5c] hover:bg-white/90">{keyInput.trim() ? t("Активировать", "Activate") : t("Продолжить", "Continue")}</button>
            </div>
          </Card>
        )}

        {step === "install" && (
          <Card title={t("Идёт установка...", "Installing...")} icon={<span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />}>
            <div className="my-4">
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/15">
                <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-[width] duration-75" style={{ width: `${installProgress}%` }} />
              </div>
              <p className="mt-2 text-right text-xs font-mono text-white/70">{Math.round(installProgress)}%</p>
            </div>
            <div className="space-y-1.5">
              {INSTALL_STEPS[lang].map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  {i < installIdx ? <Check className="h-4 w-4 text-emerald-400" /> : i === installIdx ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <span className="h-4 w-4 rounded-full border border-white/20" />}
                  <span className={cn(i <= installIdx ? "text-white" : "text-white/40")}>{s}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-white">{icon}</div>
        <h2 className="text-lg font-bold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function NavButtons({ onBack, onNext, back, next, nextDisabled }: { onBack: () => void; onNext: () => void; back: string; next: string; nextDisabled?: boolean }) {
  return (
    <div className="mt-6 flex items-center justify-between">
      <button onClick={onBack} className="rounded-xl px-4 py-2.5 text-sm text-white/70 hover:bg-white/10">{back}</button>
      <button onClick={onNext} disabled={nextDisabled} className="flex items-center gap-1.5 rounded-xl bg-white px-6 py-2.5 text-sm font-bold text-[#0a3d5c] hover:bg-white/90 disabled:opacity-40">{next} <ChevronRight className="h-4 w-4" /></button>
    </div>
  );
}

function VersionCard({ active, onClick, name, desc, badge, color }: { active: boolean; onClick: () => void; name: string; desc: string; badge: string; color: string }) {
  return (
    <button onClick={onClick} className={cn("flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-all", active ? "border-white bg-white/15" : "border-white/15 hover:border-white/40")}>
      <div className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-gradient-to-br text-[10px] font-black text-white", color)}>{badge}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{name}</p>
        <p className="text-[11px] text-white/60">{desc}</p>
      </div>
      {active && <Check className="h-5 w-5 text-white" />}
    </button>
  );
}
