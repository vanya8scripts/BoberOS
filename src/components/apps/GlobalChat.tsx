"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Users, Globe } from "lucide-react";
import { useOS } from "@/lib/os-store";

interface Msg { id: string; name: string; avatar: string; text: string; ts: number; }

const TOPIC = "boberos-global-chat-v2";

export function GlobalChat() {
  const userName = useOS((s) => s.userName);
  const userAvatar = useOS((s) => s.userAvatar);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const sinceRef = useRef<string>("all");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const poll = async () => {
      try {
        const url = `https://ntfy.sh/${TOPIC}/json?since=${sinceRef.current}&poll=1`;
        const res = await fetch(url);
        if (!res.ok) { setConnected(false); return; }
        setConnected(true);
        const text = await res.text();
        const lines = text.trim().split("\n").filter(Boolean);
        for (const line of lines) {
          try {
            const obj = JSON.parse(line);
            if (obj.event === "message" && obj.message) {
              sinceRef.current = obj.id;
              const msg: Msg = JSON.parse(obj.message);
              if (seenIds.current.has(msg.id)) continue;
              seenIds.current.add(msg.id);
              if (seenIds.current.size > 300) {
                const arr = Array.from(seenIds.current);
                seenIds.current = new Set(arr.slice(-150));
              }
              setMessages((prev) => [...prev.slice(-49), msg]);
            }
          } catch { void 0; }
        }
      } catch { setConnected(false); }
    };
    poll();
    pollRef.current = setInterval(poll, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    const msg: Msg = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: userName || "Аноним",
      avatar: userAvatar || "🐹",
      text: text.slice(0, 500),
      ts: Date.now(),
    };
    seenIds.current.add(msg.id);
    setMessages((prev) => [...prev.slice(-49), msg]);
    setInput("");
    fetch(`https://ntfy.sh/${TOPIC}`, {
      method: "POST",
      body: JSON.stringify(msg),
    }).catch(() => void 0);
  };

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-zinc-900 to-black">
      <div className="flex items-center gap-3 bg-gradient-to-r from-cyan-600 to-blue-700 px-4 py-3 text-white">
        <Globe className="h-5 w-5" />
        <div>
          <h1 className="text-sm font-bold">Глобальный чат BoberOS</h1>
          <p className="flex items-center gap-1 text-[11px] text-white/70">
            <span className={`h-2 w-2 rounded-full ${connected ? "bg-green-400" : "bg-rose-400"}`} />
            {connected ? "Подключено" : "Подключение..."} · между всеми устройствами мира
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs">
          <Users className="h-3.5 w-3.5" /> {Math.min(messages.length + 1, 99)}+
        </div>
      </div>

      <div ref={scrollRef} className="bober-scroll flex-1 space-y-2 overflow-y-auto p-3">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center text-white/30">
            <Globe className="h-12 w-12" />
            <p className="mt-2 text-sm">Нет сообщений. Будь первым!</p>
            <p className="text-xs">Чат работает между всеми устройствами мира</p>
          </div>
        )}
        {messages.map((m) => {
          const isMe = m.name === (userName || "Аноним");
          return (
            <div key={m.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-orange-600 text-sm">
                {m.avatar || "🐹"}
              </div>
              <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${isMe ? "rounded-tr-sm bg-cyan-500 text-white" : "rounded-tl-sm bg-white/10 text-white/90"}`}>
                {!isMe && <p className="mb-0.5 text-[10px] font-bold text-cyan-300">{m.name}</p>}
                <p className="break-words">{m.text}</p>
                <p className="mt-0.5 text-[9px] opacity-50">{new Date(m.ts).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 border-t border-white/10 bg-black/40 p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Напиши сообщение миру..."
          maxLength={500}
          className="flex-1 rounded-full bg-white/10 px-4 py-2 text-sm text-white outline-none placeholder:text-white/40"
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
