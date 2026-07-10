"use client";

import Peer, { DataConnection } from "peerjs";

const PEER_PREFIX = "boberos-";

export interface NetHandle {
  send: (msg: unknown) => void;
  close: () => void;
  isHost: boolean;
  peerCount: number;
}

export function createLobby(
  code: string,
  onMessage: (msg: unknown) => void,
  onPeerJoin: (id: string) => void,
  onPeerLeave: (id: string) => void,
  onReady: () => void,
  onError: (err: string) => void,
): NetHandle {
  const peer = new Peer(PEER_PREFIX + code, {
    config: {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
      ],
    },
  });
  const conns = new Map<string, DataConnection>();

  peer.on("open", () => onReady());
  peer.on("error", (err) => onError(err.message || String(err)));

  peer.on("connection", (conn) => {
    conn.on("open", () => {
      conns.set(conn.peer, conn);
      onPeerJoin(conn.peer);
    });
    conn.on("data", (data) => onMessage(data));
    conn.on("close", () => {
      conns.delete(conn.peer);
      onPeerLeave(conn.peer);
    });
    conn.on("error", () => {
      conns.delete(conn.peer);
      onPeerLeave(conn.peer);
    });
  });

  return {
    isHost: true,
    peerCount: 0,
    send: (msg) => {
      conns.forEach((c) => {
        if (c.open) {
          try { c.send(msg); } catch { void 0; }
        }
      });
    },
    close: () => {
      conns.forEach((c) => { try { c.close(); } catch { void 0; } });
      try { peer.destroy(); } catch { void 0; }
    },
  };
}

export function joinLobby(
  code: string,
  onMessage: (msg: unknown) => void,
  onHostReady: () => void,
  onError: (err: string) => void,
  onDisconnected: () => void,
): NetHandle {
  const peer = new Peer({
    config: {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
      ],
    },
  });
  let conn: DataConnection | null = null;

  peer.on("open", () => {
    conn = peer.connect(PEER_PREFIX + code, { reliable: true });
    conn.on("open", () => onHostReady());
    conn.on("data", (data) => onMessage(data));
    conn.on("close", () => onDisconnected());
    conn.on("error", (err) => onError(err.message || String(err)));
  });
  peer.on("error", (err) => onError(err.message || String(err)));

  return {
    isHost: false,
    peerCount: 1,
    send: (msg) => {
      if (conn && conn.open) {
        try { conn.send(msg); } catch { void 0; }
      }
    },
    close: () => {
      try { if (conn) conn.close(); } catch { void 0; }
      try { peer.destroy(); } catch { void 0; }
    },
  };
}

export function genLobbyCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let c = "";
  for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c;
}
