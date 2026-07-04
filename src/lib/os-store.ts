"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppId, Language, OSVersion, WallpaperId, WindowInstance } from "./os-types";
import { APP_META, PREINSTALLED } from "./app-meta";

export type { OSVersion, Language };
export type BootPhase = "oobe" | "credits" | "booting" | "desktop";

interface OSState {
  setupComplete: boolean;
  userName: string;
  userAvatar: string;
  customAvatar: string | null;
  osVersion: OSVersion;
  bootPhase: BootPhase;
  language: Language;
  darkMode: boolean;
  volume: number;
  keyboardLayout: "ru" | "en";

  windows: WindowInstance[];
  zCounter: number;
  installedApps: AppId[];
  savedApps: AppId[];

  bobersoftBalance: number;
  spimBalance: number;
  bobercoinBalance: number;
  cyberboberOwned: boolean;

  activated: boolean;

  wallpaper: WallpaperId;
  bsod: boolean;
  notepadText: string;
  antivirusResult: string | null;
  chatHistory: { from: "me" | "beaver"; text: string }[];

  setBootPhase: (p: BootPhase) => void;
  completeSetup: (data: { name: string; avatar: string; version: OSVersion; activated: boolean; language: Language }) => void;
  setLanguage: (l: Language) => void;
  toggleDarkMode: () => void;
  setDarkMode: (v: boolean) => void;
  setVolume: (v: number) => void;
  setKeyboardLayout: (l: "ru" | "en") => void;

  openApp: (appId: AppId) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
  toggleMaximize: (id: string) => void;
  moveWindow: (id: string, x: number, y: number) => void;
  resizeWindow: (id: string, width: number, height: number) => void;

  installApp: (appId: AppId) => void;
  uninstallApp: (appId: AppId) => void;
  saveProgress: () => void;
  hasUnsavedChanges: () => boolean;

  clickCoin: (amount?: number) => void;
  withdrawToBoberSoft: (amount?: number) => void;
  withdrawToSpim: (amount?: number) => void;
  buyCyberBober: () => void;
  activateOS: () => void;
  activateWithKey: () => void;

  setWallpaper: (w: WallpaperId) => void;
  setNotepadText: (t: string) => void;
  setAntivirusResult: (r: string | null) => void;
  addChatMessage: (from: "me" | "beaver", text: string) => void;
  setUserName: (n: string) => void;
  setUserAvatar: (a: string) => void;
  setCustomAvatar: (a: string | null) => void;

  triggerBSOD: () => void;
  reboot: () => void;
}

let idCounter = 1;

export const useOS = create<OSState>()(
  persist(
    (set, get) => ({
      setupComplete: false,
      userName: "Бобёр",
      userAvatar: "🐹",
      customAvatar: null,
      osVersion: "pro",
      bootPhase: "oobe",
      language: "ru",
      darkMode: false,
      volume: 70,
      keyboardLayout: "ru",

      windows: [],
      zCounter: 10,
      installedApps: [...PREINSTALLED],
      savedApps: [],

      bobersoftBalance: 0,
      spimBalance: 0,
      bobercoinBalance: 0,
      cyberboberOwned: false,
      activated: false,

      wallpaper: "default",
      bsod: false,
      notepadText:
        "Добро пожаловать в Блокнот BoberOS!\n\nЗдесь можно писать заметки.\nБобёр одобряет.",
      antivirusResult: null,
      chatHistory: [
        { from: "beaver", text: "Привет! Я Бобёр-помощник. О чём поговорим?" },
      ],

      setBootPhase: (p) => set({ bootPhase: p }),

      completeSetup: (data) =>
        set({
          setupComplete: true,
          userName: data.name || "Бобёр",
          userAvatar: data.avatar,
          osVersion: data.version,
          activated: data.activated,
          language: data.language,
          bootPhase: "credits",
        }),

      setLanguage: (l) => set({ language: l }),
      toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
      setDarkMode: (v) => set({ darkMode: v }),
      setVolume: (v) => set({ volume: Math.max(0, Math.min(100, v)) }),
      setKeyboardLayout: (l) => set({ keyboardLayout: l }),

      openApp: (appId) => {
        const state = get();
        const existing = state.windows.find((w) => w.appId === appId);
        if (existing) {
          get().restoreWindow(existing.id);
          return;
        }
        const meta = APP_META[appId];
        const z = state.zCounter + 1;
        const id = `win-${idCounter++}`;
        const offset = (state.windows.length % 6) * 28;
        const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
        const vh = typeof window !== "undefined" ? window.innerHeight : 720;
        const width = Math.min(meta.defaultWidth, vw - 40);
        const height = Math.min(meta.defaultHeight, vh - 100);
        const win: WindowInstance = {
          id,
          appId,
          x: Math.max(12, (vw - width) / 2 - 60 + offset),
          y: Math.max(12, (vh - height) / 2 - 40 + offset),
          width,
          height,
          zIndex: z,
          minimized: false,
          maximized: false,
        };
        set({ windows: [...state.windows, win], zCounter: z });
      },

      closeWindow: (id) =>
        set((s) => ({ windows: s.windows.filter((w) => w.id !== id) })),

      focusWindow: (id) =>
        set((s) => {
          const z = s.zCounter + 1;
          return {
            zCounter: z,
            windows: s.windows.map((w) =>
              w.id === id ? { ...w, zIndex: z, minimized: false } : w
            ),
          };
        }),

      minimizeWindow: (id) =>
        set((s) => ({
          windows: s.windows.map((w) =>
            w.id === id ? { ...w, minimized: true } : w
          ),
        })),

      restoreWindow: (id) =>
        set((s) => {
          const z = s.zCounter + 1;
          return {
            zCounter: z,
            windows: s.windows.map((w) =>
              w.id === id ? { ...w, minimized: false, zIndex: z } : w
            ),
          };
        }),

      toggleMaximize: (id) =>
        set((s) => ({
          windows: s.windows.map((w) =>
            w.id === id ? { ...w, maximized: !w.maximized } : w
          ),
        })),

      moveWindow: (id, x, y) =>
        set((s) => ({
          windows: s.windows.map((w) => (w.id === id ? { ...w, x, y } : w)),
        })),

      resizeWindow: (id, width, height) =>
        set((s) => ({
          windows: s.windows.map((w) =>
            w.id === id ? { ...w, width, height } : w
          ),
        })),

      installApp: (appId) =>
        set((s) =>
          s.installedApps.includes(appId)
            ? s
            : { installedApps: [...s.installedApps, appId] }
        ),

      uninstallApp: (appId) =>
        set((s) => ({
          installedApps: s.installedApps.filter((a) => a !== appId),
          windows: s.windows.filter((w) => w.appId !== appId),
        })),

      saveProgress: () =>
        set((s) => ({
          savedApps: s.installedApps.filter((a) => !PREINSTALLED.includes(a)),
        })),

      hasUnsavedChanges: () => {
        const s = get();
        const current = [...s.installedApps].filter((a) => !PREINSTALLED.includes(a)).sort();
        const saved = [...s.savedApps].sort();
        if (current.length !== saved.length) return true;
        return current.some((a, i) => a !== saved[i]);
      },

      clickCoin: (amount = 100) =>
        set((s) => ({ bobercoinBalance: s.bobercoinBalance + amount })),

      withdrawToBoberSoft: (amount) =>
        set((s) => {
          const amt = amount ?? s.bobercoinBalance;
          if (amt <= 0 || amt > s.bobercoinBalance) return s;
          return {
            bobercoinBalance: s.bobercoinBalance - amt,
            bobersoftBalance: s.bobersoftBalance + amt,
          };
        }),

      withdrawToSpim: (amount) =>
        set((s) => {
          const amt = amount ?? s.bobercoinBalance;
          if (amt <= 0 || amt > s.bobercoinBalance) return s;
          return {
            bobercoinBalance: s.bobercoinBalance - amt,
            spimBalance: s.spimBalance + amt,
          };
        }),

      buyCyberBober: () =>
        set((s) => {
          if (s.cyberboberOwned) return s;
          if (s.spimBalance < 3500) return s;
          return {
            spimBalance: s.spimBalance - 3500,
            cyberboberOwned: true,
            installedApps: s.installedApps.includes("cyberbober")
              ? s.installedApps
              : [...s.installedApps, "cyberbober"],
          };
        }),

      activateOS: () =>
        set((s) => {
          if (s.activated) return s;
          if (s.bobersoftBalance < 500) return s;
          return { bobersoftBalance: s.bobersoftBalance - 500, activated: true };
        }),

      activateWithKey: () =>
        set((s) => (s.activated ? s : { activated: true })),

      setWallpaper: (w) => set({ wallpaper: w }),
      setNotepadText: (t) => set({ notepadText: t }),
      setAntivirusResult: (r) => set({ antivirusResult: r }),
      addChatMessage: (from, text) =>
        set((s) => ({ chatHistory: [...s.chatHistory, { from, text }].slice(-80) })),
      setUserName: (n) => set({ userName: n }),
      setUserAvatar: (a) => set({ userAvatar: a }),
      setCustomAvatar: (a) => set({ customAvatar: a }),

      triggerBSOD: () => set({ bsod: true }),

      reboot: () =>
        set((s) => {
          const base = [...PREINSTALLED];
          const sessionExtras = [...s.savedApps];
          if (s.cyberboberOwned && !sessionExtras.includes("cyberbober"))
            sessionExtras.push("cyberbober");
          return {
            bsod: false,
            bootPhase: "booting",
            windows: [],
            zCounter: 10,
            installedApps: [...base, ...sessionExtras],
          };
        }),
    }),
    {
      name: "boberos-state",
      version: 3,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<OSState>;
        const merged = { ...current, ...p };
        const extras = p.savedApps ?? [];
        merged.installedApps = [...PREINSTALLED, ...extras];
        if (p.cyberboberOwned && !merged.installedApps.includes("cyberbober"))
          merged.installedApps.push("cyberbober");
        return merged;
      },
      migrate: (persisted: unknown) => {
        const p = (persisted ?? {}) as Record<string, unknown>;
        const state = (p.state ?? {}) as Record<string, unknown>;
        if (state.savedApps === undefined && Array.isArray(state.installedApps)) {
          state.savedApps = (state.installedApps as AppId[]).filter(
            (a) => !PREINSTALLED.includes(a)
          );
        }
        if (state.setupComplete === undefined) {
          state.setupComplete = true;
          state.bootPhase = "desktop";
        }
        if (state.userName === undefined) state.userName = "Бобёр";
        if (state.userAvatar === undefined) state.userAvatar = "🐹";
        if (state.customAvatar === undefined) state.customAvatar = null;
        if (state.osVersion === undefined) state.osVersion = "pro";
        if (state.bootPhase === undefined) state.bootPhase = "booting";
        if (state.language === undefined) state.language = "ru";
        if (state.darkMode === undefined) state.darkMode = false;
        if (state.volume === undefined) state.volume = 70;
        if (state.keyboardLayout === undefined) state.keyboardLayout = "ru";
        if (state.spimBalance === undefined) {
          state.spimBalance = (state.bobersoftBalance as number) ?? 0;
        }
        if (state.chatHistory === undefined) state.chatHistory = [];
        return p as typeof persisted;
      },
      partialize: (s) => ({
        setupComplete: s.setupComplete,
        userName: s.userName,
        userAvatar: s.userAvatar,
        customAvatar: s.customAvatar,
        osVersion: s.osVersion,
        language: s.language,
        darkMode: s.darkMode,
        volume: s.volume,
        keyboardLayout: s.keyboardLayout,
        savedApps: s.savedApps,
        bobersoftBalance: s.bobersoftBalance,
        spimBalance: s.spimBalance,
        bobercoinBalance: s.bobercoinBalance,
        cyberboberOwned: s.cyberboberOwned,
        activated: s.activated,
        wallpaper: s.wallpaper,
        notepadText: s.notepadText,
        chatHistory: s.chatHistory,
      }),
    }
  )
);
