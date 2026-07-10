"use client";

import Peer, { DataConnection } from "peerjs";

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

export function createHostChannel(code: string): UnifiedChannel {
  const peer = new Peer(PREFIX + code, {
    config: { iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
      { urls: "stun:stun3.l.google.com:19302" },
    ]},
  });
  const conns = new Map<string, DataConnection>();
  let isReady = false;

  const ch: UnifiedChannel = {
    isHost: true,
    ready: false,
    onmessage: null,
    onpeerjoin: null,
    onpeerleave: null,
    onready: null,
    onerror: null,
    postMessage: (msg) => {
      if (ch.onmessage) ch.onmessage({ data: msg });
      conns.forEach((c) => { if (c.open) { try { c.send(msg); } catch { void 0; } } });
    },
    close: () => {
      conns.forEach((c) => { try { c.close(); } catch { void 0; } });
      try { peer.destroy(); } catch { void 0; }
    },
  };

  peer.on("open", () => {
    isReady = true;
    (ch as { ready: boolean }).ready = true;
    ch.onready?.();
  });
  peer.on("error", (err) => ch.onerror?.(err.message || String(err)));

  peer.on("connection", (conn) => {
    conn.on("open", () => {
      conns.set(conn.peer, conn);
      ch.onpeerjoin?.(conn.peer);
    });
    conn.on("data", (data) => {
      if (ch.onmessage) ch.onmessage({ data });
      conns.forEach((c) => {
        if (c !== conn && c.open) { try { c.send(data); } catch { void 0; } }
      });
    });
    conn.on("close", () => { conns.delete(conn.peer); ch.onpeerleave?.(conn.peer); });
    conn.on("error", () => { conns.delete(conn.peer); ch.onpeerleave?.(conn.peer); });
  });

  return ch;
}

export function createGuestChannel(code: string): UnifiedChannel {
  const peer = new Peer({
    config: { iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
    ]},
  });
  let conn: DataConnection | null = null;

  const ch: UnifiedChannel = {
    isHost: false,
    ready: false,
    onmessage: null,
    onpeerjoin: null,
    onpeerleave: null,
    onready: null,
    onerror: null,
    postMessage: (msg) => {
      if (conn && conn.open) { try { conn.send(msg); } catch { void 0; } }
    },
    close: () => {
      try { if (conn) conn.close(); } catch { void 0; }
      try { peer.destroy(); } catch { void 0; }
    },
  };

  peer.on("open", () => {
    conn = peer.connect(PREFIX + code, { reliable: true });
    conn.on("open", () => {
      (ch as { ready: boolean }).ready = true;
      ch.onready?.();
    });
    conn.on("data", (data) => { if (ch.onmessage) ch.onmessage({ data }); });
    conn.on("close", () => ch.onpeerleave?.("host"));
    conn.on("error", (err) => ch.onerror?.(err.message || String(err)));
  });
  peer.on("error", (err) => ch.onerror?.(err.message || String(err)));

  return ch;
}

export function genLobbyCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let c = "";
  for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c;
}
