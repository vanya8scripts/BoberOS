"use client";

import { useRef, useState } from "react";
import {
  Image as ImageIcon,
  Info,
  Database,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Sparkles,
  KeyRound,
  User,
  Palette,
  Moon,
  Sun,
  Globe,
  Upload,
} from "lucide-react";
import { useOS } from "@/lib/os-store";
import type { WallpaperId, Language } from "@/lib/os-types";
import { VALID_KEY, VERSION_LABEL } from "@/lib/app-meta";
import { BeaverLogo } from "@/components/os/BeaverLogo";
import { cn } from "@/lib/utils";

type Tab = "activation" | "account" | "appearance" | "wallpaper" | "saves" | "system" | "about";

export function Settings() {
  const wallpaper = useOS((s) => s.wallpaper);
  const setWallpaper = useOS((s) => s.setWallpaper);
  const installedApps = useOS((s) => s.installedApps);
  const savedApps = useOS((s) => s.savedApps);
  const saveProgress = useOS((s) => s.saveProgress);
  const bobersoft = useOS((s) => s.bobersoftBalance);
  const spim = useOS((s) => s.spimBalance);
  const bobercoinBalance = useOS((s) => s.bobercoinBalance);
  const activated = useOS((s) => s.activated);
  const activateOS = useOS((s) => s.activateOS);
  const activateWithKey = useOS((s) => s.activateWithKey);
  const openApp = useOS((s) => s.openApp);
  const userName = useOS((s) => s.userName);
  const userAvatar = useOS((s) => s.userAvatar);
  const setUserName = useOS((s) => s.setUserName);
  const setUserAvatar = useOS((s) => s.setUserAvatar);
  const setCustomAvatar = useOS((s) => s.setCustomAvatar);
  const customAvatar = useOS((s) => s.customAvatar);
  const darkMode = useOS((s) => s.darkMode);
  const toggleDarkMode = useOS((s) => s.toggleDarkMode);
  const language = useOS((s) => s.language);
  const setLanguage = useOS((s) => s.setLanguage);
  const osVersion = useOS((s) => s.osVersion);
  const [tab, setTab] = useState<Tab>("activation");
  const [activating, setActivating] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [keyError, setKeyError] = useState<string | null>(null);
  const [nameEdit, setNameEdit] = useState(userName);
  const [justSaved, setJustSaved] = useState(false);
  const avatarFileRef = useRef<HTMLInputElement>(null);

  const onAvatarUpload = (files: FileList | null) => {
    if (!files || !files[0]) return;
    const reader = new FileReader();
    reader.onload = () => setCustomAvatar(reader.result as string);
    reader.readAsDataURL(files[0]);
  };

  const wallpapers: { id: WallpaperId; name: string; preview: string }[] = [
    { id: "default", name: "Янтарный бобёр", preview: "linear-gradient(135deg,#5b3a1a,#e8b765)" },
    { id: "forest", name: "Лесная плотина", preview: "linear-gradient(160deg,#1a3a2a,#52b788)" },
    { id: "sunset", name: "Закат над рекой", preview: "linear-gradient(160deg,#2a1a3a,#ffba08)" },
    { id: "wallpaper1", name: "Обои 1", preview: "url(/wallpaper1.png)" },
    { id: "wallpaper2", name: "Обои 2", preview: "url(/wallpaper2.png)" },
  ];

  const handleActivate = () => {
    if (activated || bobersoft < 500) return;
    setActivating(true);
    setTimeout(() => { activateOS(); setActivating(false); }, 1200);
  };

  const handleKey = () => {
    if (keyInput.trim().toUpperCase() === VALID_KEY) {
      setKeyError(null);
      activateWithKey();
    } else {
      setKeyError("Неверный ключ. Подсказка: VANYA8-BOBEROS");
    }
  };

  const handleSave = () => {
    saveProgress();
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1500);
  };

  const unsavedCount = installedApps.filter((a) => !["bpaint","boberstore","mybober","notepad","settings","calculator","boberchat","boberbrowser","boberterminal","boberclock","bobertunes","registryeditor"].includes(a)).length;
  const savedCount = savedApps.length;

  return (
    <div className="flex h-full bg-white">
      <div className="flex w-48 shrink-0 flex-col gap-1 border-r border-zinc-200 bg-zinc-50 p-2">
        <TabBtn icon={<ShieldCheck className="h-4 w-4" />} label="Активация" active={tab === "activation"} onClick={() => setTab("activation")} badge={activated ? "✓" : undefined} />
        <TabBtn icon={<User className="h-4 w-4" />} label="Учётная запись" active={tab === "account"} onClick={() => setTab("account")} />
        <TabBtn icon={<ImageIcon className="h-4 w-4" />} label="Обои" active={tab === "wallpaper"} onClick={() => setTab("wallpaper")} />
        <TabBtn icon={<Palette className="h-4 w-4" />} label="Оформление" active={tab === "appearance"} onClick={() => setTab("appearance")} />
        <TabBtn icon={<Database className="h-4 w-4" />} label="Сохранения" active={tab === "saves"} onClick={() => setTab("saves")} />
        <TabBtn icon={<Cpu className="h-4 w-4" />} label="Система" active={tab === "system"} onClick={() => setTab("system")} />
        <TabBtn icon={<Info className="h-4 w-4" />} label="О системе" active={tab === "about"} onClick={() => setTab("about")} />
      </div>

      <div className="bober-scroll flex-1 overflow-y-auto p-5">
        {tab === "activation" && (
          <div>
            <h2 className="mb-1 text-lg font-bold text-zinc-800">Активация BoberOS</h2>
            <p className="mb-4 text-xs text-zinc-500">Активируйте ключом продукта или за 500 BoberSoft.</p>

            {activated ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-6 text-center">
                <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-500">
                  <CheckCircle2 className="h-10 w-10 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-emerald-700">BoberOS активирована!</h3>
                  <p className="text-xs text-emerald-600">{VERSION_LABEL[osVersion]} · лицензия активна</p>
                </div>
                <p className="text-[11px] text-emerald-500">Ключ: {VALID_KEY}-🐹</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl border-2 border-sky-300 bg-sky-50 p-4">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-zinc-800">
                    <KeyRound className="h-4 w-4 text-sky-600" /> Активация ключом
                  </h3>
                  <p className="mb-2 text-xs text-zinc-500">Введите ключ продукта:</p>
                  <div className="flex gap-2">
                    <input
                      value={keyInput}
                      onChange={(e) => { setKeyInput(e.target.value); setKeyError(null); }}
                      onKeyDown={(e) => e.key === "Enter" && handleKey()}
                      placeholder="VANYA8-BOBEROS"
                      className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm uppercase outline-none focus:border-sky-500"
                    />
                    <button onClick={handleKey} className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700">
                      Активировать
                    </button>
                  </div>
                  {keyError && <p className="mt-1 text-xs text-rose-500">{keyError}</p>}
                </div>

                <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-zinc-800">
                    <Lock className="h-4 w-4 text-amber-600" /> Активация за монеты
                  </h3>
                  <div className="mt-2 flex items-center justify-between rounded-lg bg-white p-2.5 text-sm">
                    <span className="text-zinc-600">Стоимость</span>
                    <span className="font-black text-amber-600">500 BoberSoft</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between rounded-lg bg-white p-2.5 text-sm">
                    <span className="text-zinc-600">Ваш баланс BoberSoft</span>
                    <span className={cn("font-black", bobersoft >= 500 ? "text-emerald-600" : "text-rose-500")}>{bobersoft} BBC</span>
                  </div>
                  <button
                    onClick={handleActivate}
                    disabled={bobersoft < 500 || activating}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-white shadow-lg disabled:opacity-50"
                  >
                    {activating ? (
                      <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />Активируем...</>
                    ) : (
                      <><Sparkles className="h-4 w-4" />{bobersoft >= 500 ? "Активировать за 500 BBC" : "Недостаточно средств"}</>
                    )}
                  </button>
                  {bobersoft < 500 && (
                    <button onClick={() => openApp("bobercoin")} className="mt-2 w-full rounded-xl bg-zinc-100 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-200">
                      Открыть BoberCoin →
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "account" && (
          <div>
            <h2 className="mb-4 text-lg font-bold text-zinc-800">Учётная запись</h2>
            <div className="flex items-center gap-4 rounded-2xl border border-zinc-200 p-4">
              <div className="relative h-16 w-16 overflow-hidden rounded-full bg-gradient-to-br from-amber-400 to-orange-600">
                {customAvatar ? (
                  <img src={customAvatar} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-4xl">{userAvatar}</div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-lg font-bold text-zinc-800">{userName || "Бобёр"}</p>
                <p className="text-xs text-zinc-500">{VERSION_LABEL[osVersion]}</p>
                <p className="mt-1 text-[11px] text-zinc-400">Администратор плотины</p>
              </div>
              <button
                onClick={() => avatarFileRef.current?.click()}
                className="flex items-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-200"
              >
                <Upload className="h-3.5 w-3.5" /> Загрузить фото
              </button>
              <input ref={avatarFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onAvatarUpload(e.target.files)} />
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-zinc-500">Имя пользователя</label>
                <div className="mt-1 flex gap-2">
                  <input
                    value={nameEdit}
                    onChange={(e) => setNameEdit(e.target.value)}
                    className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-amber-500"
                  />
                  <button
                    onClick={() => setUserName(nameEdit.trim() || "Бобёр")}
                    className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
                  >
                    Сохранить
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500">Аватарка</label>
                <div className="mt-1 grid grid-cols-8 gap-1.5">
                  {["🐹","😁","🌿","🌲","🌊","🐾","🌳","🍂","🐻","🦅","🐚","⬜","🐹","🦔","🐬","😺"].map((a) => (
                    <button
                      key={a}
                      onClick={() => setUserAvatar(a)}
                      className={cn(
                        "grid h-9 w-full place-items-center rounded-lg text-xl",
                        userAvatar === a ? "bg-amber-100 ring-2 ring-amber-400" : "bg-zinc-100 hover:bg-zinc-200"
                      )}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "saves" && (
          <div>
            <h2 className="mb-1 text-lg font-bold text-zinc-800">Сохранения</h2>
            <p className="mb-4 text-xs text-zinc-500">
              Установленные приложения не сохраняются автоматически. Нажмите «Сохранить», чтобы они остались после перезагрузки.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-zinc-200 p-4">
                <p className="text-[11px] uppercase tracking-wide text-zinc-400">В этой сессии</p>
                <p className="text-3xl font-black text-amber-600">{unsavedCount}</p>
                <p className="text-xs text-zinc-500">доп. приложений установлено</p>
              </div>
              <div className="rounded-2xl border border-zinc-200 p-4">
                <p className="text-[11px] uppercase tracking-wide text-zinc-400">Сохранено</p>
                <p className="text-3xl font-black text-emerald-600">{savedCount}</p>
                <p className="text-xs text-zinc-500">приложений в сохранении</p>
              </div>
            </div>
            <button
              onClick={handleSave}
              className={cn(
                "mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white shadow-lg transition-colors",
                justSaved ? "bg-emerald-500" : "bg-amber-500 hover:bg-amber-600"
              )}
            >
              {justSaved ? "✓ Прогресс сохранён!" : "Сохранить прогресс"}
            </button>
            <p className="mt-3 text-[11px] text-zinc-400">
              При выключении вам будет предложено сохранить прогресс.
            </p>
          </div>
        )}

        {tab === "appearance" && (
          <div>
            <h2 className="mb-1 text-lg font-bold text-zinc-800">Оформление</h2>
            <p className="mb-4 text-xs text-zinc-500">Тема, язык и другие настройки внешнего вида.</p>

            <div className="space-y-3">
              <div className="rounded-2xl border border-zinc-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-800 text-white">
                    {darkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-zinc-800">Тёмная тема</p>
                    <p className="text-xs text-zinc-500">{darkMode ? "Включена" : "Выключена"}</p>
                  </div>
                  <button
                    onClick={toggleDarkMode}
                    className={cn("relative h-7 w-12 rounded-full transition-colors", darkMode ? "bg-emerald-500" : "bg-zinc-300")}
                  >
                    <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-white transition-transform", darkMode ? "translate-x-6" : "translate-x-1")} />
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-sky-500 text-white">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-zinc-800">Язык</p>
                    <p className="text-xs text-zinc-500">{language === "ru" ? "Русский" : "English"}</p>
                  </div>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as Language)}
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-sky-500"
                  >
                    <option value="ru">Русский</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "wallpaper" && (
          <div>
            <h2 className="mb-1 text-lg font-bold text-zinc-800">Обои рабочего стола</h2>
            <p className="mb-4 text-xs text-zinc-500">
              Можете загрузить свои обои как wallpaper1.png и wallpaper2.png в папку public.
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {wallpapers.map((w) => (
                <button
                  key={w.id}
                  onClick={() => setWallpaper(w.id)}
                  className={cn(
                    "group overflow-hidden rounded-xl border-2 transition-all",
                    wallpaper === w.id ? "border-amber-500 ring-2 ring-amber-200" : "border-zinc-200 hover:border-amber-300"
                  )}
                >
                  <div className="h-20 w-full bg-cover bg-center" style={{ background: w.preview, backgroundSize: "cover", backgroundPosition: "center" }} />
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <span className="text-[11px] font-medium text-zinc-700">{w.name}</span>
                    {wallpaper === w.id && <span className="text-[10px] font-bold text-amber-600">✓</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === "system" && (
          <div>
            <h2 className="mb-4 text-lg font-bold text-zinc-800">Система</h2>
            <div className="space-y-3">
              <InfoRow icon={<ShieldCheck className="h-4 w-4" />} label="Лицензия" value={activated ? "Активирована ✓" : "Не активирована"} />
              <InfoRow icon={<Database className="h-4 w-4" />} label="Установлено приложений" value={`${installedApps.length} шт.`} />
              <InfoRow icon={<ImageIcon className="h-4 w-4" />} label="Тема оформления" value="Янтарная (бобёр)" />
              <InfoRow icon={<Cpu className="h-4 w-4" />} label="Процессор" value="Бобёр-одиночка 1 ядро @ 2.4 ГГц" />
              <InfoRow icon={<Database className="h-4 w-4" />} label="Оперативная память" value="512 КБ веток" />
              <div className="rounded-xl border border-zinc-200 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Экономика бобра</p>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="rounded-lg bg-amber-50 p-2 text-center">
                    <p className="text-[11px] text-amber-600">BoberCoin</p>
                    <p className="font-bold text-amber-700">{bobercoinBalance}</p>
                  </div>
                  <div className="rounded-lg bg-zinc-100 p-2 text-center">
                    <p className="text-[11px] text-zinc-500">BoberSoft</p>
                    <p className="font-bold text-zinc-700">{bobersoft}</p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-2 text-center">
                    <p className="text-[11px] text-emerald-600">Спим</p>
                    <p className="font-bold text-emerald-700">{spim}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "about" && (
          <div className="flex flex-col items-center py-6 text-center">
            <BeaverLogo size={100} />
            <h2 className="mt-3 text-2xl font-black text-zinc-800">
              Bober<span className="text-amber-500">OS</span>
            </h2>
            <p className="text-xs text-zinc-500">{VERSION_LABEL[osVersion]} · v1.2 «Плотина»</p>
            <p className="mt-4 max-w-sm text-sm text-zinc-600">
              BoberOS — шутейная операционная система для настоящих грызунов.
              Создано vanya8 с любовью к бобрам.
            </p>
            <div className="mt-5 grid w-full max-w-sm grid-cols-2 gap-2 text-left text-xs">
              <InfoRow label="Ядро" value="BoberKernel 1.2" compact />
              <InfoRow label="Сборка" value="2026.1" compact />
              <InfoRow label="Пользователь" value={userName || "Бобёр"} compact />
              <InfoRow label="Лицензия" value={activated ? "Pro" : "Trial"} compact />
            </div>
            <p className="mt-6 text-[11px] text-zinc-400">© 2026 Бобёр Инк · created by vanya8. Все ветки защищены.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function TabBtn({ icon, label, active, onClick, badge }: { icon: React.ReactNode; label: string; active?: boolean; onClick: () => void; badge?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium",
        active ? "bg-amber-100 text-amber-800" : "text-zinc-600 hover:bg-zinc-200/60"
      )}
    >
      {icon}
      <span className="flex-1">{label}</span>
      {badge && <span className="text-[10px] font-bold text-emerald-600">{badge}</span>}
    </button>
  );
}

function InfoRow({ icon, label, value, compact }: { icon?: React.ReactNode; label: string; value: string; compact?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between rounded-lg border border-zinc-200", compact ? "px-2 py-1.5" : "p-3")}>
      <span className="flex items-center gap-1.5 text-xs text-zinc-500">{icon}{label}</span>
      <span className="text-xs font-medium text-zinc-700">{value}</span>
    </div>
  );
}
