"use client";

import { useEffect, useRef, useState } from "react";
import { useOS } from "@/lib/os-store";

interface Line {
  type: "in" | "out" | "err";
  text: string;
}

export function BoberTerminal() {
  const [lines, setLines] = useState<Line[]>([
    { type: "out", text: "BoberTerminal v1.0 — наберите 'help' для списка команд" },
    { type: "out", text: "" },
  ]);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const os = useOS();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lines]);

  const run = (cmd: string) => {
    const out: Line[] = [{ type: "in", text: cmd }];
    const [name, ...args] = cmd.trim().split(/\s+/);
    switch (name) {
      case "":
        break;
      case "help":
        out.push({ type: "out", text: "Команды:" });
        out.push({ type: "out", text: "  help            — эта справка" });
        out.push({ type: "out", text: "  echo <текст>    — вывести текст" });
        out.push({ type: "out", text: "  whoami          — кто ты" });
        out.push({ type: "out", text: "  date            — дата и время" });
        out.push({ type: "out", text: "  balance         — баланс BoberSoft" });
        out.push({ type: "out", text: "  apps            — список приложений" });
        out.push({ type: "out", text: "  open <appId>    — открыть приложение" });
        out.push({ type: "out", text: "  activate        — активировать BoberOS (500 BBC)" });
        out.push({ type: "out", text: "  beaver          — случайная мудрость бобра" });
        out.push({ type: "out", text: "  bark            — гавкнуть как бобёр" });
        out.push({ type: "out", text: "  clear           — очистить экран" });
        out.push({ type: "out", text: "  shutdown        — выключить (перезагрузка)" });
        break;
      case "echo":
        out.push({ type: "out", text: args.join(" ") });
        break;
      case "whoami":
        out.push({ type: "out", text: "bobr@boberos" });
        break;
      case "date":
        out.push({ type: "out", text: new Date().toLocaleString("ru-RU") });
        break;
      case "balance": {
        out.push({ type: "out", text: `BoberCoin (кошелёк): ${os.bobercoinBalance} BBC` });
        out.push({ type: "out", text: `BoberSoft (основной):  ${os.bobersoftBalance} BBC` });
        out.push({ type: "out", text: `Лицензия:             ${os.activated ? "активна ✓" : "не активирована"}` });
        break;
      }
      case "apps":
        out.push({ type: "out", text: os.installedApps.join(", ") });
        break;
      case "open": {
        const app = args[0] as Parameters<typeof os.openApp>[0];
        if (os.installedApps.includes(app)) {
          os.openApp(app);
          out.push({ type: "out", text: `Открываю ${app}...` });
        } else {
          out.push({ type: "err", text: `Приложение '${args[0]}' не найдено или не установлено` });
        }
        break;
      }
      case "activate":
        if (os.activated) {
          out.push({ type: "out", text: "BoberOS уже активирована." });
        } else if (os.bobersoftBalance >= 500) {
          os.activateOS();
          out.push({ type: "out", text: "✓ BoberOS активирована! Спасибо за покупку." });
        } else {
          out.push({ type: "err", text: `Недостаточно средств. Нужно 500, у вас ${os.bobersoftBalance}.` });
        }
        break;
      case "beaver": {
        const wisdoms = [
          "«Плотина строится не за один день. Но грызть надо каждый день.»",
          "«Хвост — это не украшение, это руль жизни.»",
          "«Бревно, которое ты не сгрыз сегодня, завтра станет твоей плотиной.»",
          "«Барсук — не враг, просто неправильно понял реку.»",
          "«Лучше маленькая хатка у ручья, чем замок в пустыне.»",
        ];
        out.push({ type: "out", text: wisdoms[Math.floor(Math.random() * wisdoms.length)] });
        break;
      }
      case "bark":
      case "bork":
        out.push({ type: "out", text: "🐹 *грызёт бревно* шшшшш-хрум-хрум!" });
        break;
      case "clear":
        setLines([]);
        setInput("");
        return;
      case "shutdown":
        out.push({ type: "out", text: "Перезагрузка BoberOS..." });
        setLines((l) => [...l, ...out]);
        setTimeout(() => os.reboot(), 600);
        setInput("");
        return;
      case "sudo":
        out.push({ type: "err", text: "Бобёр не разрешает sudo. Тут демократия грызунов." });
        break;
      default:
        out.push({ type: "err", text: `команда не найдена: ${name}. Наберите 'help'.` });
    }
    setLines((l) => [...l, ...out]);
    setInput("");
  };

  return (
    <div
      className="flex h-full flex-col bg-zinc-900 font-mono text-sm text-green-400"
      onClick={() => inputRef.current?.focus()}
    >
      <div ref={scrollRef} className="bober-scroll flex-1 overflow-y-auto p-3 leading-relaxed">
        {lines.map((l, i) => (
          <div
            key={i}
            className={
              l.type === "in"
                ? "text-cyan-400"
                : l.type === "err"
                ? "text-rose-400"
                : "text-green-400"
            }
          >
            {l.type === "in" ? (
              <span><span className="text-amber-400">bobr@boberos</span>:<span className="text-sky-400">~</span>$ {l.text}</span>
            ) : (
              <span className="whitespace-pre-wrap">{l.text}</span>
            )}
          </div>
        ))}
        <div className="flex">
          <span className="text-amber-400">bobr@boberos</span>:<span className="text-sky-400">~</span>$&nbsp;
          <input
            ref={inputRef}
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run(input)}
            className="flex-1 bg-transparent text-green-400 caret-green-400 outline-none"
          />
        </div>
      </div>
    </div>
  );
}
