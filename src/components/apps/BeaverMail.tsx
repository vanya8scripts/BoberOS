"use client";

import { useState } from "react";
import { Inbox, Mail, Star, Trash2, Send, Reply } from "lucide-react";
import { cn } from "@/lib/utils";

interface Email {
  id: number;
  from: string;
  fromAvatar: string;
  subject: string;
  preview: string;
  body: string;
  time: string;
  unread: boolean;
  starred: boolean;
  folder: "inbox" | "sent";
}

const EMAILS: Email[] = [
  {
    id: 1, from: "BoberStore", fromAvatar: "🛒",
    subject: "Ваш заказ отправлен!",
    preview: "Спасибо за покупку. Ваша плотина уже в пути...",
    body: "Здравствуйте!\n\nСпасибо за покупку в BoberStore. Ваш заказ #4815 уже собирается бобрами-курьерами и скоро будет доставлен к вашей реке.\n\nОжидаемое время доставки: 2-3 часа грызения.\n\nС уважением,\nКоманда BoberStore 🐹",
    time: "10:42", unread: true, starred: false, folder: "inbox",
  },
  {
    id: 2, from: "Бобёр-админ", fromAvatar: "🐹",
    subject: "Добро пожаловать в BoberOS!",
    preview: "Привет! Рады видеть тебя в семье бобров...",
    body: "Привет, дружище!\n\nДобро пожаловать в BoberOS — операционную систему для настоящих грызунов. Если нужна помощь, открой BoberChat и спроси меня.\n\nНе забудь активировать систему!\n\nХвостом машет,\nБобёр-админ",
    time: "Вчера", unread: false, starred: true, folder: "inbox",
  },
  {
    id: 3, from: "Спим", fromAvatar: "🔧",
    subject: "Новая игра: КиберБобер!",
    preview: "Самый крутой шутер сезона уже в Спим...",
    body: "Геймер!\n\nВ Спим появилась новая игра — КиберБобер! Неоновый шутер про бобра-киборга.\n\nЦена: 3500 BoberSoft. Накликай в BoberCoin и покупай!\n\nИграй и кайфуй,\nКоманда Спим",
    time: "Вчера", unread: false, starred: false, folder: "inbox",
  },
  {
    id: 4, from: "360 Безопасность", fromAvatar: "🛡️",
    subject: "Проверка завершена: угроз нет",
    preview: "Последняя проверка системы завершена успешно...",
    body: "Отчёт антивируса 360:\n\n✓ Угроз не найдено\n✓ Все брёвна проверены\n✓ Барсуков не обнаружено\n\nКомпьютер в безопасности. Бобёр доволен.",
    time: "Пн", unread: false, starred: false, folder: "inbox",
  },
  {
    id: 5, from: "Бобро-Рассылка", fromAvatar: "📰",
    subject: "ТОП-10 плотин месяца",
    preview: "Эти плотины поразят ваше воображение...",
    body: "ТОП-10 плотин месяца по версии BoberGeo:\n\n1. Плотина в Канаде (800м)\n2. Плотина деда Бобра\n3. ...",
    time: "Сб", unread: false, starred: false, folder: "inbox",
  },
];

export function BeaverMail() {
  const [emails, setEmails] = useState(EMAILS);
  const [selected, setSelected] = useState<Email | null>(EMAILS[0]);
  const [folder, setFolder] = useState<"inbox" | "sent" | "starred">("inbox");

  const list = emails.filter((e) => {
    if (folder === "starred") return e.starred;
    return e.folder === folder;
  });

  const open = (e: Email) => {
    setSelected(e);
    setEmails((es) => es.map((x) => (x.id === e.id ? { ...x, unread: false } : x)));
  };

  const toggleStar = (id: number) => {
    setEmails((es) => es.map((x) => (x.id === id ? { ...x, starred: !x.starred } : x)));
  };

  return (
    <div className="flex h-full bg-white">
      {/* folders sidebar */}
      <div className="flex w-44 shrink-0 flex-col gap-1 border-r border-zinc-200 bg-zinc-50 p-2">
        <button className="mb-1 flex items-center gap-2 rounded-lg bg-rose-500 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-600">
          <Send className="h-3.5 w-3.5" /> Написать
        </button>
        <FolderBtn icon={<Inbox className="h-4 w-4" />} label="Входящие" count={emails.filter((e) => e.unread).length} active={folder === "inbox"} onClick={() => setFolder("inbox")} />
        <FolderBtn icon={<Send className="h-4 w-4" />} label="Отправленные" active={folder === "sent"} onClick={() => setFolder("sent")} />
        <FolderBtn icon={<Star className="h-4 w-4" />} label="Избранное" active={folder === "starred"} onClick={() => setFolder("starred")} />
      </div>

      {/* email list */}
      <div className="bober-scroll w-64 shrink-0 overflow-y-auto border-r border-zinc-200">
        {list.length === 0 && (
          <p className="p-4 text-center text-xs text-zinc-400">Пусто</p>
        )}
        {list.map((e) => (
          <button
            key={e.id}
            onClick={() => open(e)}
            className={cn(
              "flex w-full flex-col gap-1 border-b border-zinc-100 p-3 text-left transition-colors hover:bg-zinc-50",
              selected?.id === e.id && "bg-rose-50"
            )}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{e.fromAvatar}</span>
              <span className={cn("flex-1 truncate text-xs", e.unread ? "font-bold text-zinc-800" : "text-zinc-600")}>
                {e.from}
              </span>
              {e.unread && <span className="h-2 w-2 rounded-full bg-rose-500" />}
            </div>
            <p className={cn("truncate text-xs", e.unread ? "font-semibold text-zinc-700" : "text-zinc-500")}>
              {e.subject}
            </p>
            <p className="truncate text-[11px] text-zinc-400">{e.preview}</p>
            <span className="text-[10px] text-zinc-400">{e.time}</span>
          </button>
        ))}
      </div>

      {/* reading pane */}
      <div className="flex flex-1 flex-col">
        {selected ? (
          <>
            <div className="border-b border-zinc-200 p-4">
              <h2 className="text-lg font-bold text-zinc-800">{selected.subject}</h2>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-2xl">{selected.fromAvatar}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-zinc-700">{selected.from}</p>
                  <p className="text-[11px] text-zinc-400">кому: мне · {selected.time}</p>
                </div>
                <button onClick={() => toggleStar(selected.id)} className="rounded p-1.5 hover:bg-zinc-100">
                  <Star className={cn("h-4 w-4", selected.starred ? "fill-amber-400 text-amber-400" : "text-zinc-400")} />
                </button>
                <button className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100">
                  <Reply className="h-4 w-4" />
                </button>
                <button className="rounded p-1.5 text-rose-400 hover:bg-rose-50">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="bober-scroll flex-1 overflow-y-auto p-4">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-zinc-700">
                {selected.body}
              </pre>
            </div>
          </>
        ) : (
          <div className="grid flex-1 place-items-center text-zinc-400">
            <div className="text-center">
              <Mail className="mx-auto h-12 w-12 opacity-30" />
              <p className="mt-2 text-sm">Выберите письмо</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FolderBtn({
  icon, label, count, active, onClick,
}: {
  icon: React.ReactNode; label: string; count?: number; active?: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium",
        active ? "bg-rose-100 text-rose-700" : "text-zinc-600 hover:bg-zinc-200/60"
      )}
    >
      {icon}
      <span className="flex-1">{label}</span>
      {count ? <span className="rounded-full bg-rose-500 px-1.5 text-[10px] text-white">{count}</span> : null}
    </button>
  );
}
