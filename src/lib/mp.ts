"use client";

const BASE = "https://ntfy.sh";
const PREFIX = "boberos-mp-";

export interface UnifiedChannel {
  postMessage: (msg: unknown) => void;
  onmessage: ((e: { data: unknown }) => void) | null;
  onpeerjoin: ((id: string) => void) | null;
  onpeerleave: ((id: string) => void) | null;
  onready: (() => void) | null;
  onerror: ((err: string) => void) | null;
  close: () => void;
  readonly isHost: boolean;
  readonly ready: boolean;
}

const seenMsgs = new Map<string, number>();
function isDuplicate(id: string): boolean {
  const now = Date.now();
  const last = seenMsgs.get(id);
  if (last !== undefined && now - last < 10000) return true;
  seenMsgs.set(id, now);
  if (seenMsgs.size > 500) {
    const arr = Array.from(seenMsgs.entries());
    seenMsgs.clear();
    arr.slice(-200).forEach(([k, v]) => seenMsgs.set(k, v));
  }
  return false;
}

function pollTopic(topic: string, onMsg: (data: unknown) => void, onErr: () => void): () => void {
  let stopped = false;
  let since = "all";
  const poll = async () => {
    if (stopped) return;
    try {
      const url = `${BASE}/${topic}/json?since=${since}&poll=1`;
      const res = await fetch(url);
      if (!res.ok) { onErr(); return; }
      const text = await res.text();
      const lines = text.trim().split("\n").filter(Boolean);
      for (const line of lines) {
        try {
          const obj = JSON.parse(line);
          if (obj.event === "message" && obj.message) {
            since = obj.id;
            try {
              const data = JSON.parse(obj.message);
              if (data._msgId && isDuplicate(data._msgId)) continue;
              onMsg(data);
            } catch { void 0; }
          }
        } catch { void 0; }
      }
    } catch { onErr(); }
  };
  poll();
  const iv = setInterval(poll, 1500);
  return () => { stopped = true; clearInterval(iv); };
}

function sendToTopic(topic: string, msg: unknown): void {
  const enriched = { ...(msg as Record<string, unknown>), _msgId: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}` };
  fetch(`${BASE}/${topic}`, { method: "POST", body: JSON.stringify(enriched) }).catch(() => void 0);
}

export function createHostChannel(code: string): UnifiedChannel {
  const topic = PREFIX + code;
  let ready = false;
  let stopPoll: (() => void) | null = null;
  const knownPeers = new Set<string>();

  const ch: UnifiedChannel = {
    isHost: true, ready: false,
    onmessage: null, onpeerjoin: null, onpeerleave: null, onready: null, onerror: null,
    postMessage: (msg) => { sendToTopic(topic, msg); },
    close: () => { if (stopPoll) stopPoll(); },
  };

  setTimeout(() => {
    ready = true;
    (ch as { ready: boolean }).ready = true;
    ch.onready?.();
  }, 100);

  stopPoll = pollTopic(topic, (data) => {
    const msg = data as Record<string, unknown>;
    if (msg.t === "hello" && typeof msg.id === "string") {
      if (!knownPeers.has(msg.id)) {
        knownPeers.add(msg.id);
        ch.onpeerjoin?.(msg.id);
      }
    }
    if (msg.t === "bye" && typeof msg.id === "string") {
      if (knownPeers.has(msg.id)) {
        knownPeers.delete(msg.id);
        ch.onpeerleave?.(msg.id);
      }
    }
    ch.onmessage?.({ data: msg });
  }, () => void 0);

  return ch;
}

export function createGuestChannel(code: string): UnifiedChannel {
  const topic = PREFIX + code;
  let stopPoll: (() => void) | null = null;
  let ready = false;
  let foundHost = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const ch: UnifiedChannel = {
    isHost: false, ready: false,
    onmessage: null, onpeerjoin: null, onpeerleave: null, onready: null, onerror: null,
    postMessage: (msg) => { sendToTopic(topic, msg); },
    close: () => { if (stopPoll) stopPoll(); if (timeoutId) clearTimeout(timeoutId); },
  };

  stopPoll = pollTopic(topic, (data) => {
    const msg = data as Record<string, unknown>;
    if (!foundHost && msg.t === "hello" && msg._isHost) {
      foundHost = true;
      ready = true;
      (ch as { ready: boolean }).ready = true;
      if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
      ch.onready?.();
    }
    ch.onmessage?.({ data: msg });
  }, () => void 0);

  timeoutId = setTimeout(() => {
    if (!foundHost) {
      ch.onerror?.("Лобби не найдено. Проверь код.");
    }
  }, 8000);

  return ch;
}

export function genLobbyCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let c = "";
  for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c;
}
