"use client";

import { useState } from "react";
import { Inbox, Star, Send, Trash2, Mail as MailIcon, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface Email {
  id: number;
  from: string;
  fromAvatar: string;
  subject: string;
  body: string;
  time: string;
  unread: boolean;
  starred: boolean;
  folder: "inbox" | "sent" | "trash";
}

const INITIAL: Email[] = [
  { id: 1, from: "Бобёр-Админ", fromAvatar: "🐹", subject: "Добро пожаловать в BoberMail!", body: "Привет! Спасибо, что выбрал BoberMail — почту для настоящих грызунов. Тут ты можешь писать письма, получать спам о брёвнах и общаться с другими бобрами. Хвостом помашу!\n\n— Твой Бобёр-Админ", time: "10:24", unread: true, starred: true, folder: "inbox" },
  { id: 2, from: "BoberStore", fromAvatar: "🛒", subject: "Скидки на плотины!", body: "Только сегодня! Скидка 0% на все плотины. Приходи и забери свою!", time: "09:15", unread: true, starred: false, folder: "inbox" },
  { id: 3, from: "Дядя Бобр", fromAvatar: "🧓", subject: "Re: Где мои ветки?", body: "Я их не брал! Это барсук виноват, клянусь хвостом!", time: "Вчера", unread: false, starred: false, folder: "inbox" },
  { id: 4, from: "Спим", fromAvatar: "🔧", subject: "Новые игры в магазине", body: "Залетели Тетрис, Пинг-Понг, Арканоид и Сокобан! Заходи играть!", time: "Вчера", unread: false, starred: false, folder: "inbox" },
  { id: 5, from: "Антивирус 360", fromAvatar: "🛡️", subject: "Проверка завершена", body: "Угроз не найдено. Барсуков поблизости нет. Бобёр доволен.", time: "Пн", unread: false, starred: false, folder: "inbox" },
  { id: 6, from: "Река-Банк", fromAvatar: "🏦", subject: "Выписка по счёту", body: "На вашем счету 0 BoberCoin. Пора майнить!", time: "Пн", unread: false, starred: false, folder: "inbox" },
];

export function BoberMail() {
  const [emails, setEmails] = useState(INITIAL);
  const [folder, setFolder] = useState<"inbox" | "sent" | "trash">("inbox");
  const [selectedId, setSelectedId] = useState<number | null>(1);
  const [search, setSearch] = useState("");

  const list = emails.filter((e) => e.folder === folder && (!search || e.subject.toLowerCase().includes(search.toLowerCase()) || e.from.toLowerCase().includes(search.toLowerCase())));
  const selected = emails.find((e) => e.id === selectedId);

  const open = (id: number) => {
    setSelectedId(id);
    setEmails((es) => es.map((e) => (e.id === id ? { ...e, unread: false } : e)));
  };
  const toggleStar = (id: number) => setEmails((es) => es.map((e) => (e.id === id ? { ...e, starred: !e.starred } : e)));
  const toTrash = (id: number) => {
    setEmails((es) => es.map((e) => (e.id === id ? { ...e, folder: "trash" } : e)));
    setSelectedId(null);
  };

  return (
    <div className="flex h-full bg-white">
      {/* folders */}
      <div className="w-40 shrink-0 border-r border-zinc-200 bg-zinc-50 p-2">
        <button onClick={() => { setFolder("inbox"); }} className={cn("mb-1 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium", folder === "inbox" ? "bg-sky-100 text-sky-700" : "text-zinc-600 hover:bg-zinc-200")}>
          <Inbox className="h-4 w-4" /> Входящие
          <span className="ml-auto rounded-full bg-sky-500 px-1.5 text-[10px] text-white">{emails.filter((e) => e.folder === "inbox" && e.unread).length}</span>
        </button>
        <button onClick={() => setFolder("sent")} className={cn("mb-1 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium", folder === "sent" ? "bg-sky-100 text-sky-700" : "text-zinc-600 hover:bg-zinc-200")}>
          <Send className="h-4 w-4" /> Отправленные
        </button>
        <button onClick={() => setFolder("trash")} className={cn("flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium", folder === "trash" ? "bg-sky-100 text-sky-700" : "text-zinc-600 hover:bg-zinc-200")}>
          <Trash2 className="h-4 w-4" /> Корзина
        </button>
        <button className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-sky-500 px-2 py-2 text-xs font-bold text-white hover:bg-sky-600">
          <MailIcon className="h-4 w-4" /> Написать
        </button>
      </div>

      {/* list */}
      <div className="w-64 shrink-0 border-r border-zinc-200">
        <div className="flex items-center gap-2 border-b border-zinc-200 p-2">
          <Search className="h-3.5 w-3.5 text-zinc-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск..." className="flex-1 bg-transparent text-xs outline-none" />
        </div>
        <div className="bober-scroll h-[calc(100%-41px)] overflow-y-auto">
          {list.map((e) => (
            <button
              key={e.id}
              onClick={() => open(e.id)}
              className={cn(
                "flex w-full flex-col gap-0.5 border-b border-zinc-100 p-2.5 text-left hover:bg-zinc-50",
                selectedId === e.id && "bg-sky-50"
              )}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-lg">{e.fromAvatar}</span>
                <span className={cn("flex-1 truncate text-xs", e.unread ? "font-bold text-zinc-900" : "text-zinc-600")}>{e.from}</span>
                {e.unread && <span className="h-2 w-2 rounded-full bg-sky-500" />}
                <span className="text-[10px] text-zinc-400">{e.time}</span>
              </div>
              <p className={cn("truncate text-xs", e.unread ? "font-semibold text-zinc-800" : "text-zinc-500")}>{e.subject}</p>
            </button>
          ))}
          {list.length === 0 && <p className="py-8 text-center text-xs text-zinc-400">Пусто</p>}
        </div>
      </div>

      {/* reading pane */}
      <div className="flex-1 overflow-y-auto">
        {selected ? (
          <div className="flex h-full flex-col">
            <div className="border-b border-zinc-200 p-4">
              <h2 className="text-lg font-bold text-zinc-800">{selected.subject}</h2>
              <div className="mt-2 flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-zinc-100 text-xl">{selected.fromAvatar}</span>
                <div>
                  <p className="text-sm font-medium text-zinc-700">{selected.from}</p>
                  <p className="text-[11px] text-zinc-400">кому: мне · {selected.time}</p>
                </div>
                <div className="ml-auto flex gap-1">
                  <button onClick={() => toggleStar(selected.id)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-zinc-100">
                    <Star className={cn("h-4 w-4", selected.starred ? "fill-amber-400 text-amber-400" : "text-zinc-400")} />
                  </button>
                  <button onClick={() => toTrash(selected.id)} className="grid h-8 w-8 place-items-center rounded-lg text-zinc-400 hover:bg-rose-50 hover:text-rose-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            <div className="bober-scroll flex-1 whitespace-pre-wrap p-4 text-sm leading-relaxed text-zinc-700">
              {selected.body}
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-zinc-400">
            Выберите письмо для чтения
          </div>
        )}
      </div>
    </div>
  );
}
