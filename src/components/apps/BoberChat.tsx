"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Bot, User } from "lucide-react";
import { useOS } from "@/lib/os-store";
import { cn } from "@/lib/utils";

const BEAVER_REPLIES: { match: RegExp; reply: string }[] = [
  { match: /привет|здаров|хай|hello|hi/i, reply: "Привет, дружище! Бобёр на связи 🐹" },
  { match: /как дела|как ты/i, reply: "Грызу брёвна, строю плотину. Всё отлично!" },
  { match: /имя|кто ты|ты кто/i, reply: "Я Бобёр-помощник BoberOS. Могу поболтать про ветки и реки." },
  { match: /спасибо|благодар|thx/i, reply: "Всегда пожалуйста! Хвостом помашу в знак уважения." },
  { match: /анекдот|шутк|пошути/i, reply: "Заходит бобёр в бар... а бар затоплен. Плотина рядом была. 🌊" },
  { match: /погода|weather/i, reply: "За окном — река. Возможно дождь. Плотина выдержит." },
  { match: /игр|поигра|флэппи|кибер|змейк|2048/i, reply: "Игры в Спим! Открой магазин Спим — там куча всего. Флэппи Бобёр мой любимый." },
  { match: /денег|монет|bobercoin|богат/i, reply: "Кликай в BoberCoin! 1 клик = 100 монет. Выведи на BoberSoft и живи красиво." },
  { match: /вирус|барсук|360|защит/i, reply: "Запусти 360 антивирус — он прогонит всех барсуков. Быстрая или глубокая проверка." },
  { match: /люблю|нравишься|женись|бобр/i, reply: "🐹💜 Спасибо! Но у меня уже есть плотина и 12 бобрят." },
  { match: /пока|bye|давай|удачи/i, reply: "Пока! Не забывай точить зубы. Бобёр ждёт." },
  { match: /помощь|help|что умеешь/i, reply: "Я могу болтать про бобров, шутить, советовать игры. Просто пиши!" },
  { match: /обои|wallpaper|фон/i, reply: "Обои меняются в Настройках. Там 5 вариантов, включая сгенерированные бобро-обои!" },
  { match: /лиценз|активир|винд|windows/i, reply: "Активируй BoberOS в Настройках за 500 BoberSoft. Без неё BoberStore закрыт!" },
];

function beaverReply(text: string): string {
  for (const r of BEAVER_REPLIES) if (r.match.test(text)) return r.reply;
  const fallbacks = [
    "Хм, интересно. Расскажи ещё про бобров!",
    "Понимаю. А ты любишь грызть брёвна?",
    "Бобёр задумался... 🤔",
    "Окей! А как насчёт сыграть во что-нибудь в Спим?",
    "Записал в свой бобро-блокнот.",
    "Хвост качает в знак согласия.",
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

export function BoberChat() {
  const history = useOS((s) => s.chatHistory);
  const addMessage = useOS((s) => s.addChatMessage);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [history, typing]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    addMessage("me", text);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      addMessage("beaver", beaverReply(text));
      setTyping(false);
    }, 600 + Math.random() * 600);
  };

  return (
    <div className="flex h-full flex-col bg-zinc-50">
      {/* header */}
      <div className="flex items-center gap-3 bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 text-white">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-white/20">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-sm font-bold">Бобёр-помощник</h1>
          <p className="flex items-center gap-1 text-[11px] text-white/80">
            <span className="h-2 w-2 rounded-full bg-green-300" /> в сети
          </p>
        </div>
      </div>

      {/* messages */}
      <div ref={scrollRef} className="bober-scroll flex-1 space-y-3 overflow-y-auto p-4">
        {history.map((m, i) => (
          <div
            key={i}
            className={cn("flex gap-2", m.from === "me" && "flex-row-reverse")}
          >
            <div
              className={cn(
                "grid h-8 w-8 shrink-0 place-items-center rounded-full text-white",
                m.from === "me" ? "bg-cyan-500" : "bg-amber-600"
              )}
            >
              {m.from === "me" ? <User className="h-4 w-4" /> : "🐹"}
            </div>
            <div
              className={cn(
                "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
                m.from === "me"
                  ? "rounded-tr-sm bg-cyan-500 text-white"
                  : "rounded-tl-sm bg-white text-zinc-800 shadow-sm"
              )}
            >
              {m.text}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-amber-600">🐹</div>
            <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-white px-3 py-3 shadow-sm">
              <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: "0ms" }} />
              <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: "150ms" }} />
              <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
      </div>

      {/* input */}
      <div className="flex items-center gap-2 border-t border-zinc-200 bg-white p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Напиши бобру..."
          className="flex-1 rounded-full bg-zinc-100 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-400"
        />
        <button
          onClick={send}
          disabled={!input.trim()}
          className="grid h-9 w-9 place-items-center rounded-full bg-cyan-500 text-white hover:bg-cyan-600 disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
