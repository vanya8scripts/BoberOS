"use client";

import { useState } from "react";
import { ArrowLeftRight, Copy, Check } from "lucide-react";

const TRANSLATIONS: Record<string, Record<string, string>> = {
  "Привет": { "Английский": "Hello", "Китайский": "你好", "Бобрий": "Бр-привет", "Барсучий": "Фрр-привет" },
  "Я бобёр": { "Английский": "I am beaver", "Китайский": "我是海狸", "Бобрий": "Бр-я-грызун", "Барсучий": "Фрр-я-барсук" },
  "Где река": { "Английский": "Where is the river", "Китайский": "河在哪里", "Бобрий": "Бр-где-вода", "Барсучий": "Фрр-где-нора" },
  "Дай ветку": { "Английский": "Give me a branch", "Китайский": "给我树枝", "Бобрий": "Бр-дай-палка", "Барсучий": "Фрр-дай-еда" },
  "Плотина": { "Английский": "Dam", "Китайский": "水坝", "Бобрий": "Бр-плотина", "Барсучий": "Фрр-нора" },
  "Хвост": { "Английский": "Tail", "Китайский": "尾巴", "Бобрий": "Бр-хвост", "Барсучий": "Фрр-хвост" },
  "Барсук": { "Английский": "Badger", "Китайский": "獾", "Бобрий": "Бр-враг", "Барсучий": "Фрр-я" },
  "Спасибо": { "Английский": "Thank you", "Китайский": "谢谢", "Бобрий": "Бр-спс", "Барсучий": "Фрр-спс" },
};

const LANGS = ["Английский", "Китайский", "Бобрий", "Барсучий"];

export function BoberTranslate() {
  const [src, setSrc] = useState("Привет");
  const [lang, setLang] = useState(LANGS[0]);
  const [copied, setCopied] = useState(false);

  const translate = (text: string, target: string) => {
    if (TRANSLATIONS[text]?.[target]) return TRANSLATIONS[text][target];
    if (target === "Бобрий") return "Бр-" + text.toLowerCase().replace(/\s+/g, "-");
    if (target === "Барсучий") return "Фрр-" + text.toLowerCase().replace(/\s+/g, "-");
    return text;
  };

  const result = translate(src, lang);

  const copy = () => { navigator.clipboard?.writeText(result); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-violet-50 to-purple-100">
      <div className="flex items-center gap-3 bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-3 text-white">
        <ArrowLeftRight className="h-6 w-6" />
        <div>
          <h1 className="text-lg font-bold">BoberTranslate</h1>
          <p className="text-[11px] text-white/80">Переводчик для грызунов</p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 p-3">
        <span className="rounded-full bg-white px-4 py-1.5 text-xs font-medium text-zinc-600 shadow">Русский</span>
        <ArrowLeftRight className="h-4 w-4 text-violet-500" />
        <select value={lang} onChange={(e) => setLang(e.target.value)} className="rounded-full bg-white px-4 py-1.5 text-xs font-medium text-zinc-800 shadow outline-none">
          {LANGS.map((l) => <option key={l}>{l}</option>)}
        </select>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-3">
        <div className="flex-1 rounded-2xl border border-zinc-200 bg-white p-3">
          <p className="mb-1 text-[10px] uppercase tracking-wide text-zinc-400">Исходный текст</p>
          <textarea
            value={src}
            onChange={(e) => setSrc(e.target.value)}
            className="h-full w-full resize-none bg-transparent text-sm outline-none"
            placeholder="Введите текст..."
          />
        </div>
        <div className="flex-1 rounded-2xl border-2 border-violet-300 bg-violet-50 p-3">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-wide text-violet-500">Перевод ({lang})</p>
            <button onClick={copy} className="flex items-center gap-1 text-[10px] text-violet-600 hover:text-violet-800">
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} {copied ? "Скопировано" : "Копировать"}
            </button>
          </div>
          <p className="text-sm text-zinc-800">{result}</p>
        </div>
      </div>

      <div className="border-t border-zinc-200 p-3">
        <p className="mb-1 text-[10px] uppercase tracking-wide text-zinc-400">Популярные фразы</p>
        <div className="flex flex-wrap gap-1.5">
          {Object.keys(TRANSLATIONS).map((p) => (
            <button key={p} onClick={() => setSrc(p)} className="rounded-full bg-white px-3 py-1 text-xs text-zinc-600 shadow-sm hover:bg-violet-50">
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
