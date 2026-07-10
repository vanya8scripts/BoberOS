"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppId, Language, OSVersion, WallpaperId, WindowInstance } from "./os-types";
import { APP_META, PREINSTALLED } from "./app-meta";

export type { OSVersion, Language };
export type BootPhase = "bios" | "userSelect" | "oobe" | "credits" | "booting" | "desktop" | "logout";

export interface UserAccount {
  id: string;
  name: string;
  avatar: string;
  customAvatar: string | null;
  createdAt: number;
}

interface UserStateData {
  osVersion: OSVersion;
  language: Language;
  darkMode: boolean;
  volume: number;
  keyboardLayout: "ru" | "en";
  savedApps: AppId[];
  bobersoftBalance: number;
  spimBalance: number;
  bobercoinBalance: number;
  cyberboberOwned: boolean;
  activated: boolean;
  wallpaper: WallpaperId;
  notepadText: string;
  antivirusResult: string | null;
  chatHistory: { from: "me" | "beaver"; text: string }[];
}

const DEFAULT_USER_STATE: UserStateData = {
  osVersion: "pro",
  language: "ru",
  darkMode: false,
  volume: 70,
  keyboardLayout: "ru",
  savedApps: [],
  bobersoftBalance: 0,
  spimBalance: 0,
  bobercoinBalance: 0,
  cyberboberOwned: false,
  activated: false,
  wallpaper: "default",
  notepadText: "Добро пожаловать в Блокнот BoberOS!\n\nЗдесь можно писать заметки.\nБобёр одобряет.",
  antivirusResult: null,
  chatHistory: [{ from: "beaver", text: "Привет! Я Бобёр-помощник. О чём поговорим?" }],
};

interface OSState {
  users: UserAccount[];
  currentUserId: string | null;
  userStates: Record<string, UserStateData>;

  userName: string;
  userAvatar: string;
  customAvatar: string | null;
  bootPhase: BootPhase;
  bsod: boolean;

  windows: WindowInstance[];
  zCounter: number;
  installedApps: AppId[];

  osVersion: OSVersion;
  language: Language;
  darkMode: boolean;
  volume: number;
  keyboardLayout: "ru" | "en";
  savedApps: AppId[];
  bobersoftBalance: number;
  spimBalance: number;
  bobercoinBalance: number;
  cyberboberOwned: boolean;
  activated: boolean;
  wallpaper: WallpaperId;
  notepadText: string;
  antivirusResult: string | null;
  chatHistory: { from: "me" | "beaver"; text: string }[];

  setBootPhase: (p: BootPhase) => void;
  startBios: () => void;
  finishBios: () => void;
  loginUser: (id: string) => void;
  logoutUser: () => void;
  deleteUser: (id: string) => void;
  completeSetup: (data: { name: string; avatar: string; customPhoto: string | null; version: OSVersion; activated: boolean; language: Language }) => void;

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
  spendSpim: (amount: number) => boolean;
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
let userIdCounter = 1;

function makeUserId(): string {
  const u = `user-${userIdCounter++}-${Date.now().toString(36)}`;
  return u;
}

function activeToUserState(s: OSState): UserStateData {
  return {
    osVersion: s.osVersion,
    language: s.language,
    darkMode: s.darkMode,
    volume: s.volume,
    keyboardLayout: s.keyboardLayout,
    savedApps: s.installedApps.filter((a) => !PREINSTALLED.includes(a)),
    bobersoftBalance: s.bobersoftBalance,
    spimBalance: s.spimBalance,
    bobercoinBalance: s.bobercoinBalance,
    cyberboberOwned: s.cyberboberOwned,
    activated: s.activated,
    wallpaper: s.wallpaper,
    notepadText: s.notepadText,
    antivirusResult: s.antivirusResult,
    chatHistory: s.chatHistory,
  };
}

export const useOS = create<OSState>()(
  persist(
    (set, get) => ({
      users: [],
      currentUserId: null,
      userStates: {},

      userName: "Бобёр",
      userAvatar: "🐹",
      customAvatar: null,
      bootPhase: "bios",
      bsod: false,

      windows: [],
      zCounter: 10,
      installedApps: [...PREINSTALLED],

      ...DEFAULT_USER_STATE,
      savedApps: [],

      setBootPhase: (p) => set({ bootPhase: p }),

      startBios: () => set({ bootPhase: "bios" }),

      finishBios: () => {
        const s = get();
        if (s.users.length > 0) {
          set({ bootPhase: "userSelect" });
        } else {
          set({ bootPhase: "oobe" });
        }
      },

      loginUser: (id) => {
        const s = get();
        const user = s.users.find((u) => u.id === id);
        if (!user) return;
        const data = s.userStates[id] || DEFAULT_USER_STATE;
        const sessionExtras = [...data.savedApps];
        if (data.cyberboberOwned && !sessionExtras.includes("cyberbober")) sessionExtras.push("cyberbober");
        set({
          currentUserId: id,
          userName: user.name,
          userAvatar: user.avatar,
          customAvatar: user.customAvatar,
          windows: [],
          zCounter: 10,
          installedApps: [...PREINSTALLED, ...sessionExtras],
          bootPhase: "booting",
          osVersion: data.osVersion,
          language: data.language,
          darkMode: data.darkMode,
          volume: data.volume,
          keyboardLayout: data.keyboardLayout,
          savedApps: data.savedApps,
          bobersoftBalance: data.bobersoftBalance,
          spimBalance: data.spimBalance,
          bobercoinBalance: data.bobercoinBalance,
          cyberboberOwned: data.cyberboberOwned,
          activated: data.activated,
          wallpaper: data.wallpaper,
          notepadText: data.notepadText,
          antivirusResult: data.antivirusResult,
          chatHistory: data.chatHistory,
        });
      },

      logoutUser: () => {
        const s = get();
        if (s.currentUserId) {
          const data = activeToUserState(s);
          set((st) => ({
            userStates: { ...st.userStates, [s.currentUserId!]: data },
            currentUserId: null,
            bootPhase: "userSelect",
            windows: [],
          }));
        }
      },

      deleteUser: (id) => {
        set((s) => {
          const users = s.users.filter((u) => u.id !== id);
          const userStates = { ...s.userStates };
          delete userStates[id];
          return {
            users,
            userStates,
            currentUserId: s.currentUserId === id ? null : s.currentUserId,
            bootPhase: users.length > 0 ? "userSelect" : "oobe",
          };
        });
      },

      completeSetup: (data) => {
        const id = makeUserId();
        const user: UserAccount = {
          id,
          name: data.name || "Бобёр",
          avatar: data.avatar,
          customAvatar: data.customPhoto,
          createdAt: Date.now(),
        };
        const userData: UserStateData = {
          ...DEFAULT_USER_STATE,
          osVersion: data.version,
          language: data.language,
          activated: data.activated,
        };
        userData.savedApps = [];
        const sessionExtras = [...userData.savedApps];
        if (userData.cyberboberOwned && !sessionExtras.includes("cyberbober")) sessionExtras.push("cyberbober");
        set((s) => ({
          users: [...s.users, user],
          userStates: { ...s.userStates, [id]: userData },
          currentUserId: id,
          userName: user.name,
          userAvatar: user.avatar,
          customAvatar: user.customAvatar,
          osVersion: userData.osVersion,
          language: userData.language,
          activated: userData.activated,
          windows: [],
          zCounter: 10,
          installedApps: [...PREINSTALLED, ...sessionExtras],
          savedApps: [],
          bobersoftBalance: 0,
          spimBalance: 0,
          bobercoinBalance: 0,
          bootPhase: "credits",
        }));
      },

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
        const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
        const width = Math.min(isMobile ? vw - 8 : meta.defaultWidth, vw - 8);
        const height = Math.min(isMobile ? vh - 120 : meta.defaultHeight, vh - 100);
        const win: WindowInstance = {
          id,
          appId,
          x: isMobile ? 4 : Math.max(12, (vw - width) / 2 - 60 + offset),
          y: isMobile ? 8 : Math.max(12, (vh - height) / 2 - 40 + offset),
          width,
          height,
          zIndex: z,
          minimized: false,
          maximized: false,
        };
        set({ windows: [...state.windows, win], zCounter: z });
      },

      closeWindow: (id) => set((s) => ({ windows: s.windows.filter((w) => w.id !== id) })),

      focusWindow: (id) =>
        set((s) => {
          const z = s.zCounter + 1;
          return { zCounter: z, windows: s.windows.map((w) => (w.id === id ? { ...w, zIndex: z, minimized: false } : w)) };
        }),

      minimizeWindow: (id) =>
        set((s) => ({ windows: s.windows.map((w) => (w.id === id ? { ...w, minimized: true } : w)) })),

      restoreWindow: (id) =>
        set((s) => {
          const z = s.zCounter + 1;
          return { zCounter: z, windows: s.windows.map((w) => (w.id === id ? { ...w, minimized: false, zIndex: z } : w)) };
        }),

      toggleMaximize: (id) =>
        set((s) => ({ windows: s.windows.map((w) => (w.id === id ? { ...w, maximized: !w.maximized } : w)) })),

      moveWindow: (id, x, y) =>
        set((s) => ({ windows: s.windows.map((w) => (w.id === id ? { ...w, x, y } : w)) })),

      resizeWindow: (id, width, height) =>
        set((s) => ({ windows: s.windows.map((w) => (w.id === id ? { ...w, width, height } : w)) })),

      installApp: (appId) =>
        set((s) => (s.installedApps.includes(appId) ? s : { installedApps: [...s.installedApps, appId] })),

      uninstallApp: (appId) =>
        set((s) => ({
          installedApps: s.installedApps.filter((a) => a !== appId),
          windows: s.windows.filter((w) => w.appId !== appId),
        })),

      saveProgress: () => {
        const s = get();
        if (!s.currentUserId) return;
        const currentSavedApps = s.installedApps.filter((a) => !PREINSTALLED.includes(a));
        const data = { ...activeToUserState(s), savedApps: currentSavedApps };
        set((st) => ({
          userStates: { ...st.userStates, [s.currentUserId!]: data },
          savedApps: currentSavedApps,
        }));
      },

      hasUnsavedChanges: () => {
        const s = get();
        if (!s.currentUserId) return false;
        const current = [...s.installedApps].filter((a) => !PREINSTALLED.includes(a)).sort();
        const saved = [...s.savedApps].sort();
        if (current.length !== saved.length) return true;
        return current.some((a, i) => a !== saved[i]);
      },

      clickCoin: (amount = 100) => set((s) => ({ bobercoinBalance: s.bobercoinBalance + amount })),

      withdrawToBoberSoft: (amount) =>
        set((s) => {
          const amt = amount ?? s.bobercoinBalance;
          if (amt <= 0 || amt > s.bobercoinBalance) return s;
          return { bobercoinBalance: s.bobercoinBalance - amt, bobersoftBalance: s.bobersoftBalance + amt };
        }),

      withdrawToSpim: (amount) =>
        set((s) => {
          const amt = amount ?? s.bobercoinBalance;
          if (amt <= 0 || amt > s.bobercoinBalance) return s;
          return { bobercoinBalance: s.bobercoinBalance - amt, spimBalance: s.spimBalance + amt };
        }),

      buyCyberBober: () =>
        set((s) => {
          if (s.cyberboberOwned) return s;
          if (s.spimBalance < 3500) return s;
          return {
            spimBalance: s.spimBalance - 3500,
            cyberboberOwned: true,
            installedApps: s.installedApps.includes("cyberbober") ? s.installedApps : [...s.installedApps, "cyberbober"],
          };
        }),

      spendSpim: (amount) => {
        const s = get();
        if (s.spimBalance < amount) return false;
        set({ spimBalance: s.spimBalance - amount });
        return true;
      },

      activateOS: () =>
        set((s) => {
          if (s.activated) return s;
          if (s.bobersoftBalance < 500) return s;
          return { bobersoftBalance: s.bobersoftBalance - 500, activated: true };
        }),

      activateWithKey: () => set((s) => (s.activated ? s : { activated: true })),

      setWallpaper: (w) => set({ wallpaper: w }),
      setNotepadText: (t) => set({ notepadText: t }),
      setAntivirusResult: (r) => set({ antivirusResult: r }),
      addChatMessage: (from, text) =>
        set((s) => ({ chatHistory: [...s.chatHistory, { from, text }].slice(-80) })),
      setUserName: (n) => {
        const s = get();
        if (!s.currentUserId) { set({ userName: n }); return; }
        set((st) => ({
          userName: n,
          users: st.users.map((u) => (u.id === s.currentUserId ? { ...u, name: n } : u)),
        }));
      },
      setUserAvatar: (a) => {
        const s = get();
        if (!s.currentUserId) { set({ userAvatar: a }); return; }
        set((st) => ({
          userAvatar: a,
          users: st.users.map((u) => (u.id === s.currentUserId ? { ...u, avatar: a } : u)),
        }));
      },
      setCustomAvatar: (a) => {
        const s = get();
        if (!s.currentUserId) { set({ customAvatar: a }); return; }
        set((st) => ({
          customAvatar: a,
          users: st.users.map((u) => (u.id === s.currentUserId ? { ...u, customAvatar: a } : u)),
        }));
      },

      triggerBSOD: () => set({ bsod: true }),

      reboot: () => {
        const s = get();
        if (s.currentUserId) {
          const data = activeToUserState(s);
          set((st) => ({
            userStates: { ...st.userStates, [s.currentUserId!]: data },
            bsod: false,
            bootPhase: "bios",
            windows: [],
            zCounter: 10,
            installedApps: [...PREINSTALLED, ...data.savedApps, ...(data.cyberboberOwned && !data.savedApps.includes("cyberbober") ? ["cyberbober" as AppId] : [])],
          }));
        } else {
          set({ bsod: false, bootPhase: "bios", windows: [], zCounter: 10 });
        }
      },
    }),
    {
      name: "boberos-state",
      version: 4,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<OSState>;
        const merged = { ...current, ...p };
        if (!Array.isArray(merged.users)) merged.users = [];
        if (!merged.userStates || typeof merged.userStates !== "object") merged.userStates = {};
        if (merged.users.length > 0 && !merged.currentUserId) {
          merged.bootPhase = "userSelect";
        } else if (merged.users.length === 0) {
          merged.bootPhase = "bios";
        }
        return merged as OSState;
      },
      partialize: (s) => ({
        users: s.users,
        currentUserId: s.currentUserId,
        userStates: s.userStates,
      }),
    }
  )
);
