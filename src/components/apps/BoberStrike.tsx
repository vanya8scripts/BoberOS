"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Heart, Shield, DollarSign, Crosshair, Skull, Flag,
  LogOut, RefreshCw, ShoppingBag, Bot, Wifi,
  Timer, Swords, LogIn, Plus, X, Trophy,
} from "lucide-react";

type Phase = "menu" | "lobby" | "playing" | "roundend" | "gameover";
type Team = "spec" | "terror";
type RoundState = "buy" | "live" | "end";
type MapTheme = "concrete" | "sand" | "wood";
type WeaponId = "pistol" | "smg" | "rifle" | "sniper" | "shotgun";

interface Weapon {
  id: WeaponId;
  name: string;
  short: string;
  price: number;
  damage: number;
  fireRate: number;
  range: number;
  auto: boolean;
  magSize: number;
  reserveMax: number;
  pellets: number;
  spread: number;
  reloadTime: number;
}

interface PlayerState {
  id: string;
  name: string;
  team: Team;
  isBot: boolean;
  isLocal: boolean;
  x: number;
  y: number;
  dirX: number;
  dirY: number;
  health: number;
  armor: number;
  alive: boolean;
  weapon: WeaponId;
  secondary: WeaponId | null;
  ammoMag: number;
  ammoReserve: number;
  pistolMag: number;
  pistolReserve: number;
  secondaryMag: number;
  secondaryReserve: number;
  lastShotAt: number;
  reloading: boolean;
  reloadEndAt: number;
  hitFlash: number;
  money: number;
  kills: number;
  deaths: number;
  lastSeenAt: number;
  botState: "wander" | "attack" | "cover";
  botTargetId: string | null;
  botWaypointX: number;
  botWaypointY: number;
  botNextThinkAt: number;
  botShootCd: number;
  remoteFromX: number;
  remoteFromY: number;
  remoteToX: number;
  remoteToY: number;
  remoteFromRot: number;
  remoteToRot: number;
  remoteUpdateAt: number;
}

interface KillFeedItem {
  key: number;
  killerName: string;
  killerTeam: Team;
  victimName: string;
  victimTeam: Team;
  weapon: WeaponId;
  at: number;
}

interface MapDef {
  id: string;
  name: string;
  theme: MapTheme;
  grid: number[][];
  width: number;
  height: number;
  spawns: { spec: Array<{ x: number; y: number }>; terror: Array<{ x: number; y: number }> };
}

type NetMsg =
  | { t: "hello"; id: string; name: string; team: Team; lobby: string; map: string }
  | { t: "bye"; id: string; lobby: string }
  | { t: "state"; id: string; name: string; team: Team; x: number; y: number; rot: number; health: number; alive: boolean; weapon: WeaponId; lobby: string; time: number }
  | { t: "shot"; id: string; ox: number; oy: number; dx: number; dy: number; weapon: WeaponId; lobby: string }
  | { t: "hit"; from: string; to: string; dmg: number; weapon: WeaponId; lobby: string }
  | { t: "death"; id: string; killer: string; weapon: WeaponId; lobby: string; deathId: number }
  | { t: "round"; host: string; state: RoundState; timeLeft: number; specScore: number; terrorScore: number; roundNum: number; winner: Team | null; lobby: string; map: string }
  | { t: "gameover"; lobby: string; specScore: number; terrorScore: number };

const WEAPONS: Record<WeaponId, Weapon> = {
  pistol: { id: "pistol", name: "Пистолет «Грызун»", short: "Грызун", price: 0, damage: 22, fireRate: 0.32, range: 14, auto: false, magSize: 12, reserveMax: 48, pellets: 1, spread: 0.014, reloadTime: 1.2 },
  smg: { id: "smg", name: "ПМ «Бобрёнок»", short: "Бобрёнок", price: 1200, damage: 13, fireRate: 0.09, range: 11, auto: true, magSize: 30, reserveMax: 90, pellets: 1, spread: 0.045, reloadTime: 1.8 },
  rifle: { id: "rifle", name: "Винтарь «Резец»", short: "Резец", price: 2700, damage: 28, fireRate: 0.11, range: 20, auto: true, magSize: 30, reserveMax: 90, pellets: 1, spread: 0.020, reloadTime: 2.2 },
  sniper: { id: "sniper", name: "СВ-98 «Грызло»", short: "Грызло", price: 4500, damage: 100, fireRate: 1.1, range: 32, auto: false, magSize: 5, reserveMax: 20, pellets: 1, spread: 0.002, reloadTime: 3.0 },
  shotgun: { id: "shotgun", name: "Дробовик «Хвост»", short: "Хвост", price: 2200, damage: 14, fireRate: 0.8, range: 7, auto: false, magSize: 7, reserveMax: 28, pellets: 8, spread: 0.13, reloadTime: 2.6 },
};
const WEAPON_LIST: Weapon[] = [WEAPONS.pistol, WEAPONS.smg, WEAPONS.rifle, WEAPONS.sniper, WEAPONS.shotgun];

const PLANT_GRID: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,1,0,0,0,0,0,1,0,0,0,1],
  [1,0,1,1,0,1,0,1,1,1,0,1,0,1,0,1],
  [1,0,1,0,0,0,0,0,0,1,0,0,0,1,0,1],
  [1,0,1,0,1,1,1,1,0,1,1,1,0,1,0,1],
  [1,0,0,0,1,0,0,0,0,0,0,1,0,0,0,1],
  [1,1,1,0,1,0,1,1,1,1,0,1,1,1,0,1],
  [1,0,0,0,0,0,1,0,0,1,0,0,0,0,0,1],
  [1,0,0,0,0,0,1,0,0,1,0,0,0,0,0,1],
  [1,1,1,0,1,0,1,1,1,1,0,1,1,1,0,1],
  [1,0,0,0,1,0,0,0,0,0,0,1,0,0,0,1],
  [1,0,1,0,1,1,1,1,0,1,1,1,0,1,0,1],
  [1,0,1,0,0,0,0,0,0,1,0,0,0,1,0,1],
  [1,0,1,1,0,1,0,1,1,1,0,1,0,1,0,1],
  [1,0,0,0,0,1,0,0,0,0,0,1,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];
const DUST_GRID: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,0,1,0,0,1,0,0,1,1,0,1],
  [1,0,1,0,0,0,0,0,0,0,0,0,0,1,0,1],
  [1,0,0,0,0,1,1,0,0,1,1,0,0,0,0,1],
  [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],
  [1,0,1,0,0,0,0,0,0,0,0,0,0,1,0,1],
  [1,0,1,0,0,0,0,0,0,0,0,0,0,1,0,1],
  [1,0,1,0,0,0,0,0,0,0,0,0,0,1,0,1],
  [1,0,1,0,0,0,0,0,0,0,0,0,0,1,0,1],
  [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],
  [1,0,0,0,0,1,1,0,0,1,1,0,0,0,0,1],
  [1,0,1,0,0,0,0,0,0,0,0,0,0,1,0,1],
  [1,0,1,1,0,0,1,0,0,1,0,0,1,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];
const DAM_GRID: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,1,0,0,0,0,0,0,1,0,0,0,1],
  [1,0,1,0,1,0,1,1,1,1,0,1,0,1,0,1],
  [1,0,1,0,0,0,0,0,0,0,0,0,0,1,0,1],
  [1,0,0,0,1,1,1,0,0,1,1,1,0,0,0,1],
  [1,1,0,1,1,0,0,0,0,0,0,1,0,1,1,1],
  [1,0,0,0,0,0,1,1,1,1,0,0,0,0,0,1],
  [1,0,1,1,0,0,0,0,0,0,0,0,1,1,0,1],
  [1,0,1,1,0,0,0,0,0,0,0,0,1,1,0,1],
  [1,0,0,0,0,0,1,1,1,1,0,0,0,0,0,1],
  [1,1,0,1,1,0,0,0,0,0,0,1,0,1,1,1],
  [1,0,0,0,1,1,1,0,0,1,1,1,0,0,0,1],
  [1,0,1,0,0,0,0,0,0,0,0,0,0,1,0,1],
  [1,0,1,0,1,0,1,1,1,1,0,1,0,1,0,1],
  [1,0,0,0,1,0,0,0,0,0,0,1,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

const MAPS: Record<string, MapDef> = {
  plant: { id: "plant", name: "Завод", theme: "concrete", grid: PLANT_GRID, width: 16, height: 16, spawns: { spec: [{x:1.5,y:1.5},{x:2.5,y:1.5},{x:1.5,y:2.5},{x:2.5,y:2.5}], terror: [{x:13.5,y:13.5},{x:14.5,y:13.5},{x:13.5,y:14.5},{x:14.5,y:14.5}] } },
  dust: { id: "dust", name: "Пыль", theme: "sand", grid: DUST_GRID, width: 16, height: 16, spawns: { spec: [{x:1.5,y:1.5},{x:2.5,y:1.5},{x:1.5,y:2.5},{x:2.5,y:2.5}], terror: [{x:13.5,y:13.5},{x:14.5,y:13.5},{x:13.5,y:14.5},{x:14.5,y:14.5}] } },
  dam: { id: "dam", name: "Дамба", theme: "wood", grid: DAM_GRID, width: 16, height: 16, spawns: { spec: [{x:1.5,y:1.5},{x:2.5,y:1.5},{x:1.5,y:2.5},{x:2.5,y:2.5}], terror: [{x:13.5,y:13.5},{x:14.5,y:13.5},{x:13.5,y:14.5},{x:14.5,y:14.5}] } },
};
const MAP_LIST: MapDef[] = [MAPS.plant, MAPS.dust, MAPS.dam];

const FOV = Math.PI / 3;
const TAN_HALF_FOV = Math.tan(FOV / 2);
const MOVE_SPEED = 3.6;
const MOUSE_SENS = 0.0022;
const MAX_HEALTH = 100;
const BUY_TIME = 8;
const LIVE_TIME = 75;
const END_TIME = 4;
const WIN_SCORE = 7;
const TEAM_SIZE = 4;
const PEER_TIMEOUT_MS = 4000;
const STATE_INTERVAL_MS = 70;
const ROUND_INTERVAL_MS = 220;
const KILL_REWARD = 300;
const ROUND_WIN_BONUS = 1000;
const ROUND_LOSS_BONUS = 500;
const START_MONEY = 800;
const BOT_REACTION = 0.35;
const BOT_AIM_ERROR = 0.06;
const BOT_WANDER_RADIUS = 6;

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function randId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function genLobbyCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function isWallAt(grid: number[][], w: number, h: number, mx: number, my: number): boolean {
  if (mx < 0 || my < 0 || mx >= w || my >= h) return true;
  return grid[my][mx] === 1;
}

function lineOfSight(grid: number[][], w: number, h: number, x0: number, y0: number, x1: number, y1: number): boolean {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.001) return true;
  const steps = Math.ceil(dist * 6);
  for (let s = 1; s < steps; s++) {
    const t = s / steps;
    if (isWallAt(grid, w, h, Math.floor(x0 + dx * t), Math.floor(y0 + dy * t))) return false;
  }
  return true;
}

function pickSpawn(mapDef: MapDef, team: Team, idx: number): { x: number; y: number } {
  const arr = team === "spec" ? mapDef.spawns.spec : mapDef.spawns.terror;
  return arr[idx % arr.length];
}

function makeBeaverSprite(team: Team): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 80;
  const g = c.getContext("2d");
  if (!g) return c;
  const accent = team === "spec" ? "#3b82f6" : "#dc2626";
  const accentDark = team === "spec" ? "#1e3a8a" : "#7f1d1d";
  g.fillStyle = "#2a1a0a";
  g.beginPath();
  g.ellipse(32, 74, 16, 5, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#5a3a20";
  g.beginPath();
  g.ellipse(32, 72, 12, 3.5, 0, 0, Math.PI * 2);
  g.fill();
  const bodyGrad = g.createLinearGradient(0, 30, 0, 70);
  bodyGrad.addColorStop(0, "#7a5230");
  bodyGrad.addColorStop(1, "#4a2f18");
  g.fillStyle = bodyGrad;
  g.beginPath();
  g.ellipse(32, 50, 20, 22, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#c8a070";
  g.beginPath();
  g.ellipse(32, 56, 11, 13, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = accent;
  g.fillRect(13, 39, 38, 5);
  g.fillStyle = accentDark;
  g.fillRect(13, 43, 38, 2);
  g.fillStyle = "#4a2f18";
  g.beginPath();
  g.ellipse(13, 50, 5, 9, -0.2, 0, Math.PI * 2);
  g.ellipse(51, 50, 5, 9, 0.2, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = bodyGrad;
  g.beginPath();
  g.ellipse(32, 24, 16, 15, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#c8a070";
  g.beginPath();
  g.ellipse(32, 30, 11, 8, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#0c0a09";
  g.beginPath();
  g.arc(26, 22, 2.4, 0, Math.PI * 2);
  g.arc(38, 22, 2.4, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#ffffff";
  g.beginPath();
  g.arc(26.7, 21.3, 0.8, 0, Math.PI * 2);
  g.arc(38.7, 21.3, 0.8, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#1a0a0a";
  g.beginPath();
  g.ellipse(32, 28, 3, 2.2, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#ffffff";
  g.fillRect(29, 32, 3, 5);
  g.fillRect(32, 32, 3, 5);
  g.fillStyle = "#3a2a1a";
  g.beginPath();
  g.ellipse(18, 13, 4, 5, -0.3, 0, Math.PI * 2);
  g.ellipse(46, 13, 4, 5, 0.3, 0, Math.PI * 2);
  g.fill();
  return c;
}

function makeDeadSprite(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 32;
  const g = c.getContext("2d");
  if (!g) return c;
  g.fillStyle = "#3a2a1a";
  g.beginPath();
  g.ellipse(32, 20, 26, 9, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#5a3a20";
  g.beginPath();
  g.ellipse(32, 18, 18, 5, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#c8a070";
  g.beginPath();
  g.ellipse(32, 17, 10, 3, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#0c0a09";
  g.beginPath();
  g.arc(26, 16, 1.4, 0, Math.PI * 2);
  g.arc(38, 16, 1.4, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#ffffff";
  g.fillRect(30, 18, 1.5, 2);
  g.fillRect(32.5, 18, 1.5, 2);
  return c;
}

function newPlayer(id: string, name: string, team: Team, isBot: boolean, isLocal: boolean): PlayerState {
  return {
    id, name, team, isBot, isLocal,
    x: 1.5, y: 1.5, dirX: 1, dirY: 0,
    health: MAX_HEALTH, armor: 0, alive: true,
    weapon: "pistol", secondary: null,
    ammoMag: WEAPONS.pistol.magSize, ammoReserve: WEAPONS.pistol.reserveMax,
    pistolMag: WEAPONS.pistol.magSize, pistolReserve: WEAPONS.pistol.reserveMax,
    secondaryMag: 0, secondaryReserve: 0,
    lastShotAt: 0, reloading: false, reloadEndAt: 0, hitFlash: 0,
    money: START_MONEY, kills: 0, deaths: 0, lastSeenAt: Date.now(),
    botState: "wander", botTargetId: null,
    botWaypointX: 1.5, botWaypointY: 1.5,
    botNextThinkAt: 0, botShootCd: 0,
    remoteFromX: 1.5, remoteFromY: 1.5, remoteToX: 1.5, remoteToY: 1.5,
    remoteFromRot: 0, remoteToRot: 0, remoteUpdateAt: 0,
  };
}

interface HudSnapshot {
  health: number;
  armor: number;
  money: number;
  weapon: WeaponId;
  weaponName: string;
  ammoMag: number;
  ammoReserve: number;
  reloading: boolean;
  reloadProgress: number;
  roundState: RoundState;
  roundTimeLeft: number;
  specScore: number;
  terrorScore: number;
  roundNum: number;
  alive: boolean;
  team: Team;
  connected: number;
  hostId: string;
  isHost: boolean;
  winner: Team | null;
  hitFlash: number;
}

export function BoberStrike() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const [phase, setPhase] = useState<Phase>("menu");
  const phaseRef = useRef<Phase>("menu");
  const [lobbyPlayers, setLobbyPlayers] = useState<{ id: string; name: string; team: Team }[]>([]);
  const [name, setName] = useState("Бобр" + Math.floor(Math.random() * 900 + 100));
  const [team, setTeam] = useState<Team>("spec");
  const [mapId, setMapId] = useState<string>("plant");
  const [lobbyInput, setLobbyInput] = useState("");
  const [lobbyCode, setLobbyCode] = useState("");
  const [paused, setPaused] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);
  const [scoreboardOpen, setScoreboardOpen] = useState(false);
  const [killFeed, setKillFeed] = useState<KillFeedItem[]>([]);
  const [hud, setHud] = useState<HudSnapshot>({
    health: MAX_HEALTH, armor: 0, money: START_MONEY, weapon: "pistol", weaponName: WEAPONS.pistol.name,
    ammoMag: WEAPONS.pistol.magSize, ammoReserve: WEAPONS.pistol.reserveMax,
    reloading: false, reloadProgress: 0, roundState: "buy", roundTimeLeft: BUY_TIME,
    specScore: 0, terrorScore: 0, roundNum: 1, alive: true, team: "spec",
    connected: 1, hostId: "", isHost: true, winner: null, hitFlash: 0,
  });

  const localIdRef = useRef<string>(randId());
  const nameRef = useRef<string>(name);
  const teamRef = useRef<Team>(team);
  const mapIdRef = useRef<string>(mapId);
  const lobbyRef = useRef<string>("");
  const channelRef = useRef<BroadcastChannel | null>(null);

  const playersRef = useRef<Map<string, PlayerState>>(new Map());
  const botsRef = useRef<PlayerState[]>([]);
  const shotsRef = useRef<Array<{ ox: number; oy: number; dx: number; dy: number; at: number; weapon: WeaponId; team: Team }>>([]);
  const deathIdsRef = useRef<Set<number>>(new Set());
  const killFeedRef = useRef<KillFeedItem[]>([]);
  const nextKillIdRef = useRef(1);

  const keysRef = useRef<Record<string, boolean>>({});
  const mouseDxRef = useRef(0);
  const mouseDownRef = useRef(false);
  const shootPendingRef = useRef(false);
  const lockedRef = useRef(false);
  const jumpZRef = useRef(0);
  const groundedRef = useRef(true);
  const bobPhaseRef = useRef(0);
  const flashRef = useRef(0);
  const damageFlashRef = useRef(0);
  const hitMarkerRef = useRef(0);
  const zbufRef = useRef<Float32Array>(new Float32Array(640));
  const lastTimeRef = useRef(0);
  const lastStateSentRef = useRef(0);
  const lastRoundSentRef = useRef(0);

  const roundStateRef = useRef<RoundState>("buy");
  const roundTimeLeftRef = useRef<number>(BUY_TIME);
  const specScoreRef = useRef(0);
  const terrorScoreRef = useRef(0);
  const roundNumRef = useRef(1);
  const winnerRef = useRef<Team | null>(null);
  const knownHostRef = useRef<string>("");
  const lastRoundNumAppliedRef = useRef(0);
  const lastHudUpdateRef = useRef(0);
  const lastRoundMsgAtRef = useRef(0);
  const joinedAtRef = useRef(0);

  const beaverSpecSpriteRef = useRef<HTMLCanvasElement | null>(null);
  const beaverTerrorSpriteRef = useRef<HTMLCanvasElement | null>(null);
  const deadSpriteRef = useRef<HTMLCanvasElement | null>(null);

  const setPhaseSync = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const pushKillFeed = useCallback((killerName: string, killerTeam: Team, victimName: string, victimTeam: Team, weapon: WeaponId) => {
    const item: KillFeedItem = { key: nextKillIdRef.current++, killerName, killerTeam, victimName, victimTeam, weapon, at: Date.now() };
    killFeedRef.current = [item, ...killFeedRef.current].slice(0, 6);
    setKillFeed(killFeedRef.current);
  }, []);

  const sendNet = useCallback((msg: NetMsg) => {
    const ch = channelRef.current;
    if (ch) {
      try { ch.postMessage(msg); } catch { void 0; }
    }
  }, []);

  const determineHost = useCallback((): string => {
    if (knownHostRef.current && Date.now() - lastRoundMsgAtRef.current < PEER_TIMEOUT_MS) {
      return knownHostRef.current;
    }
    if (Date.now() - joinedAtRef.current < 400) {
      return "";
    }
    const ids: string[] = [localIdRef.current];
    playersRef.current.forEach((p) => {
      if (!p.isBot && Date.now() - p.lastSeenAt < PEER_TIMEOUT_MS) ids.push(p.id);
    });
    ids.sort();
    return ids[0];
  }, []);

  const respawnPlayer = useCallback((p: PlayerState, spawnIdx: number) => {
    const mapDef = MAPS[mapIdRef.current] ?? MAPS.plant;
    const sp = pickSpawn(mapDef, p.team, spawnIdx);
    p.x = sp.x;
    p.y = sp.y;
    p.dirX = p.team === "spec" ? 1 : -1;
    p.dirY = 0;
    p.health = MAX_HEALTH;
    p.armor = 0;
    p.alive = true;
    p.reloading = false;
    p.reloadEndAt = 0;
    p.hitFlash = 0;
    p.weapon = "pistol";
    p.secondary = null;
    p.ammoMag = WEAPONS.pistol.magSize;
    p.ammoReserve = WEAPONS.pistol.reserveMax;
    p.pistolMag = WEAPONS.pistol.magSize;
    p.pistolReserve = WEAPONS.pistol.reserveMax;
    p.secondaryMag = 0;
    p.secondaryReserve = 0;
    p.lastShotAt = 0;
  }, []);

  const resetBots = useCallback(() => {
    const hostId = localIdRef.current;
    const realPlayers = playersRef.current;
    const specReal: number = (realPlayers.get(localIdRef.current)?.team === "spec" ? 1 : 0);
    let specRealCount = specReal;
    let terrorRealCount = (realPlayers.get(localIdRef.current)?.team === "terror" ? 1 : 0);
    realPlayers.forEach((p) => {
      if (p.isBot || p.id === localIdRef.current) return;
      if (p.team === "spec") specRealCount++;
      else terrorRealCount++;
    });
    const localTeam = teamRef.current;
    const specBotsNeeded = Math.max(0, TEAM_SIZE - specRealCount);
    const terrorBotsNeeded = Math.max(0, TEAM_SIZE - terrorRealCount);
    void localTeam;
    const botNames = ["Бобр-Грыз", "Зубр", "Хатка", "Плотник", "Плащ", "Бурунд", "Резец", "Пилка"];
    const bots: PlayerState[] = [];
    let nameIdx = 0;
    for (let i = 0; i < specBotsNeeded; i++) {
      const id = `bot-${hostId}-s${i}`;
      const b = newPlayer(id, botNames[nameIdx++ % botNames.length], "spec", true, false);
      const sp = pickSpawn(MAPS[mapIdRef.current] ?? MAPS.plant, "spec", specRealCount + i);
      b.x = sp.x; b.y = sp.y; b.dirX = 1; b.dirY = 0;
      b.weapon = "rifle";
      b.ammoMag = WEAPONS.rifle.magSize;
      b.ammoReserve = WEAPONS.rifle.reserveMax;
      bots.push(b);
    }
    for (let i = 0; i < terrorBotsNeeded; i++) {
      const id = `bot-${hostId}-t${i}`;
      const b = newPlayer(id, botNames[nameIdx++ % botNames.length], "terror", true, false);
      const sp = pickSpawn(MAPS[mapIdRef.current] ?? MAPS.plant, "terror", terrorRealCount + i);
      b.x = sp.x; b.y = sp.y; b.dirX = -1; b.dirY = 0;
      b.weapon = "rifle";
      b.ammoMag = WEAPONS.rifle.magSize;
      b.ammoReserve = WEAPONS.rifle.reserveMax;
      bots.push(b);
    }
    botsRef.current = bots;
  }, []);

  const startNewRound = useCallback(() => {
    const local = playersRef.current.get(localIdRef.current);
    if (local) respawnPlayer(local, 0);
    let specIdx = 1;
    let terrorIdx = 1;
    botsRef.current.forEach((b) => {
      if (b.team === "spec") respawnPlayer(b, specIdx++);
      else respawnPlayer(b, terrorIdx++);
      b.weapon = "rifle";
      b.ammoMag = WEAPONS.rifle.magSize;
      b.ammoReserve = WEAPONS.rifle.reserveMax;
      b.botState = "wander";
      b.botTargetId = null;
      b.botWaypointX = b.x;
      b.botWaypointY = b.y;
    });
    playersRef.current.forEach((p) => {
      if (p.id === localIdRef.current || p.isBot) return;
      p.alive = true;
      p.health = MAX_HEALTH;
      p.hitFlash = 0;
    });
    roundStateRef.current = "buy";
    roundTimeLeftRef.current = BUY_TIME;
    winnerRef.current = null;
  }, [respawnPlayer]);

  const endRound = useCallback((winner: Team) => {
    if (roundStateRef.current === "end") return;
    roundStateRef.current = "end";
    roundTimeLeftRef.current = END_TIME;
    winnerRef.current = winner;
    if (winner === "spec") specScoreRef.current++;
    else terrorScoreRef.current++;
    const local = playersRef.current.get(localIdRef.current);
    if (local) {
      if (winner === local.team) local.money += ROUND_WIN_BONUS;
      else local.money += ROUND_LOSS_BONUS;
    }
    botsRef.current.forEach((b) => {
      if (winner === b.team) b.money += ROUND_WIN_BONUS;
      else b.money += ROUND_LOSS_BONUS;
    });
  }, []);

  const checkRoundEnd = useCallback(() => {
    if (roundStateRef.current !== "live") return;
    const mapDef = MAPS[mapIdRef.current] ?? MAPS.plant;
    void mapDef;
    let specAlive = 0;
    let terrorAlive = 0;
    const local = playersRef.current.get(localIdRef.current);
    if (local && local.alive) {
      if (local.team === "spec") specAlive++;
      else terrorAlive++;
    }
    botsRef.current.forEach((b) => {
      if (!b.alive) return;
      if (b.team === "spec") specAlive++;
      else terrorAlive++;
    });
    playersRef.current.forEach((p) => {
      if (p.id === localIdRef.current || p.isBot) return;
      if (!p.alive) return;
      if (Date.now() - p.lastSeenAt > PEER_TIMEOUT_MS) return;
      if (p.team === "spec") specAlive++;
      else terrorAlive++;
    });
    if (specAlive === 0 && terrorAlive === 0) endRound("spec");
    else if (specAlive === 0) endRound("terror");
    else if (terrorAlive === 0) endRound("spec");
  }, [endRound]);

  const applyDamage = useCallback((targetId: string, dmg: number, attackerId: string, weapon: WeaponId) => {
    const target = playersRef.current.get(targetId) ?? botsRef.current.find((b) => b.id === targetId) ?? null;
    if (!target) return;
    if (!target.alive) return;
    const mapDef = MAPS[mapIdRef.current] ?? MAPS.plant;
    void mapDef;
    let remaining = dmg;
    if (target.armor > 0) {
      const absorbed = Math.min(target.armor, remaining * 0.5);
      target.armor -= absorbed;
      remaining -= absorbed;
    }
    target.health -= remaining;
    target.hitFlash = 0.18;
    if (targetId === localIdRef.current) {
      damageFlashRef.current = 0.32;
    }
    if (target.health <= 0) {
      target.health = 0;
      target.alive = false;
      target.deaths++;
      const killer = playersRef.current.get(attackerId) ?? botsRef.current.find((b) => b.id === attackerId) ?? null;
      if (killer) {
        killer.kills++;
        killer.money += KILL_REWARD;
      }
      const deathId = Date.now() * 1000 + Math.floor(Math.random() * 1000);
      if (!deathIdsRef.current.has(deathId)) {
        deathIdsRef.current.add(deathId);
        const victimName = target.name;
        const killerName = killer ? killer.name : "Окружение";
        const killerTeam = killer ? killer.team : ("spec" as Team);
        pushKillFeed(killerName, killerTeam, victimName, target.team, weapon);
        sendNet({ t: "death", id: targetId, killer: attackerId, weapon, lobby: lobbyRef.current, deathId });
      }
    }
  }, [pushKillFeed, sendNet]);

  const doLocalShoot = useCallback(() => {
    const local = playersRef.current.get(localIdRef.current);
    if (!local || !local.alive) return;
    if (roundStateRef.current !== "live") return;
    if (local.reloading) return;
    const now = performance.now() / 1000;
    const wpn = WEAPONS[local.weapon];
    if (now - local.lastShotAt < wpn.fireRate) return;
    if (local.ammoMag <= 0) return;
    local.lastShotAt = now;
    local.ammoMag--;
    flashRef.current = 0.08;
    const grid = (MAPS[mapIdRef.current] ?? MAPS.plant).grid;
    const W = (MAPS[mapIdRef.current] ?? MAPS.plant).width;
    const H = (MAPS[mapIdRef.current] ?? MAPS.plant).height;
    sendNet({ t: "shot", id: local.id, ox: local.x, oy: local.y, dx: local.dirX, dy: local.dirY, weapon: local.weapon, lobby: lobbyRef.current });
    for (let pellet = 0; pellet < wpn.pellets; pellet++) {
      const spread = (Math.random() - 0.5) * 2 * wpn.spread;
      const cos = Math.cos(spread);
      const sin = Math.sin(spread);
      const rdx = local.dirX * cos - local.dirY * sin;
      const rdy = local.dirX * sin + local.dirY * cos;
      let bestTarget: PlayerState | null = null;
      let bestDist = wpn.range;
      const allTargets: PlayerState[] = [];
      botsRef.current.forEach((b) => { if (b.id !== local.id && b.team !== local.team) allTargets.push(b); });
      playersRef.current.forEach((p) => {
        if (p.id === local.id || p.isBot) return;
        if (p.team === local.team) return;
        if (Date.now() - p.lastSeenAt > PEER_TIMEOUT_MS) return;
        allTargets.push(p);
      });
      for (const t of allTargets) {
        if (!t.alive) continue;
        const dx = t.x - local.x;
        const dy = t.y - local.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.01 || dist > bestDist) continue;
        const aimAng = Math.atan2(rdy, rdx);
        const tAng = Math.atan2(dy, dx);
        let da = tAng - aimAng;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        const aimRadius = 0.18 + 0.04 * dist;
        if (Math.abs(da) >= aimRadius) continue;
        if (!lineOfSight(grid, W, H, local.x, local.y, t.x, t.y)) continue;
        bestTarget = t;
        bestDist = dist;
      }
      if (bestTarget) {
        hitMarkerRef.current = 0.16;
        if (bestTarget.isBot) {
          applyDamage(bestTarget.id, wpn.damage, local.id, local.weapon);
        } else {
          sendNet({ t: "hit", from: local.id, to: bestTarget.id, dmg: wpn.damage, weapon: local.weapon, lobby: lobbyRef.current });
        }
      }
    }
    if (local.ammoMag <= 0 && local.ammoReserve > 0) {
      local.reloading = true;
      local.reloadEndAt = performance.now() / 1000 + WEAPONS[local.weapon].reloadTime;
    }
  }, [applyDamage, sendNet]);

  const tryReload = useCallback(() => {
    const local = playersRef.current.get(localIdRef.current);
    if (!local || !local.alive || local.reloading) return;
    const wpn = WEAPONS[local.weapon];
    if (local.ammoMag >= wpn.magSize) return;
    if (local.ammoReserve <= 0) return;
    local.reloading = true;
    local.reloadEndAt = performance.now() / 1000 + wpn.reloadTime;
  }, []);

  const buyWeapon = useCallback((wid: WeaponId) => {
    const local = playersRef.current.get(localIdRef.current);
    if (!local) return;
    const wpn = WEAPONS[wid];
    if (local.money < wpn.price) return;
    if (local.weapon === "pistol") {
      local.pistolMag = local.ammoMag;
      local.pistolReserve = local.ammoReserve;
    } else if (local.secondary) {
      local.secondaryMag = local.ammoMag;
      local.secondaryReserve = local.ammoReserve;
    }
    local.money -= wpn.price;
    local.weapon = wid;
    if (wid !== "pistol") {
      local.secondary = wid;
      local.secondaryMag = wpn.magSize;
      local.secondaryReserve = wpn.reserveMax;
      local.ammoMag = wpn.magSize;
      local.ammoReserve = wpn.reserveMax;
    } else {
      local.ammoMag = wpn.magSize;
      local.ammoReserve = wpn.reserveMax;
      local.pistolMag = wpn.magSize;
      local.pistolReserve = wpn.reserveMax;
    }
    local.reloading = false;
    local.reloadEndAt = 0;
  }, []);

  const switchSlot = useCallback((slot: 1 | 2) => {
    const local = playersRef.current.get(localIdRef.current);
    if (!local || !local.alive) return;
    if (slot === 1) {
      if (local.weapon === "pistol") return;
      if (local.secondary) {
        local.secondaryMag = local.ammoMag;
        local.secondaryReserve = local.ammoReserve;
      }
      local.weapon = "pistol";
      local.ammoMag = local.pistolMag;
      local.ammoReserve = local.pistolReserve;
      local.reloading = false;
      local.reloadEndAt = 0;
    } else {
      if (!local.secondary) return;
      if (local.weapon === local.secondary) return;
      local.pistolMag = local.ammoMag;
      local.pistolReserve = local.ammoReserve;
      local.weapon = local.secondary;
      local.ammoMag = local.secondaryMag;
      local.ammoReserve = local.secondaryReserve;
      local.reloading = false;
      local.reloadEndAt = 0;
    }
  }, []);

  const handleNet = useCallback((msg: NetMsg) => {
    if (msg.lobby !== lobbyRef.current) return;
    if (msg.t === "hello") {
      if (msg.id === localIdRef.current) return;
      const existing = playersRef.current.get(msg.id);
      if (!existing) {
        const p = newPlayer(msg.id, msg.name, msg.team, false, false);
        playersRef.current.set(msg.id, p);
      } else {
        existing.name = msg.name;
        existing.team = msg.team;
        existing.lastSeenAt = Date.now();
      }
      setLobbyPlayers((prev) => {
        if (prev.some((p) => p.id === msg.id)) return prev;
        return [...prev, { id: msg.id, name: msg.name, team: msg.team }];
      });
      if (mapIdRef.current !== msg.map && msg.id < localIdRef.current) {
        mapIdRef.current = msg.map;
        setMapId(msg.map);
      }
      sendNet({ t: "state", id: localIdRef.current, name: nameRef.current, team: teamRef.current,
        x: playersRef.current.get(localIdRef.current)?.x ?? 1.5,
        y: playersRef.current.get(localIdRef.current)?.y ?? 1.5,
        rot: Math.atan2(playersRef.current.get(localIdRef.current)?.dirY ?? 0, playersRef.current.get(localIdRef.current)?.dirX ?? 1),
        health: playersRef.current.get(localIdRef.current)?.health ?? MAX_HEALTH,
        alive: playersRef.current.get(localIdRef.current)?.alive ?? true,
        weapon: playersRef.current.get(localIdRef.current)?.weapon ?? "pistol",
        lobby: lobbyRef.current, time: Date.now() });
      return;
    }
    if (msg.t === "bye") {
      playersRef.current.delete(msg.id);
      setLobbyPlayers((prev) => prev.filter((p) => p.id !== msg.id));
      return;
    }
    if (msg.t === "state") {
      if (msg.id === localIdRef.current) return;
      let p = playersRef.current.get(msg.id);
      if (!p) {
        p = newPlayer(msg.id, msg.name, msg.team, false, false);
        playersRef.current.set(msg.id, p);
      }
      p.name = msg.name;
      p.team = msg.team;
      p.remoteFromX = p.remoteToX;
      p.remoteFromY = p.remoteToY;
      p.remoteFromRot = p.remoteToRot;
      p.remoteToX = msg.x;
      p.remoteToY = msg.y;
      p.remoteToRot = msg.rot;
      p.remoteUpdateAt = Date.now();
      p.x = msg.x;
      p.y = msg.y;
      p.dirX = Math.cos(msg.rot);
      p.dirY = Math.sin(msg.rot);
      p.health = msg.health;
      p.alive = msg.alive;
      p.weapon = msg.weapon;
      p.lastSeenAt = Date.now();
      return;
    }
    if (msg.t === "shot") {
      shotsRef.current.push({ ox: msg.ox, oy: msg.oy, dx: msg.dx, dy: msg.dy, at: Date.now(), weapon: msg.weapon, team: "spec" });
      if (shotsRef.current.length > 24) shotsRef.current.shift();
      return;
    }
    if (msg.t === "hit") {
      if (msg.to === localIdRef.current) {
        applyDamage(localIdRef.current, msg.dmg, msg.from, msg.weapon);
      } else {
        const bot = botsRef.current.find((b) => b.id === msg.to);
        if (bot) applyDamage(bot.id, msg.dmg, msg.from, msg.weapon);
      }
      return;
    }
    if (msg.t === "death") {
      if (deathIdsRef.current.has(msg.deathId)) return;
      deathIdsRef.current.add(msg.deathId);
      const victim = playersRef.current.get(msg.id) ?? botsRef.current.find((b) => b.id === msg.id) ?? null;
      const killer = playersRef.current.get(msg.killer) ?? botsRef.current.find((b) => b.id === msg.killer) ?? null;
      if (victim) {
        victim.alive = false;
        victim.health = 0;
        victim.deaths++;
      }
      if (killer) {
        killer.kills++;
        killer.money += KILL_REWARD;
      }
      pushKillFeed(killer ? killer.name : "Окружение", killer ? killer.team : "spec", victim ? victim.name : "Бобр", victim ? victim.team : "spec", msg.weapon);
      return;
    }
    if (msg.t === "round") {
      const host = determineHost();
      if (msg.host !== host) return;
      knownHostRef.current = msg.host;
      lastRoundMsgAtRef.current = Date.now();
      if (msg.map !== mapIdRef.current) {
        mapIdRef.current = msg.map;
        setMapId(msg.map);
      }
      if (msg.roundNum > lastRoundNumAppliedRef.current) {
        lastRoundNumAppliedRef.current = msg.roundNum;
        const local = playersRef.current.get(localIdRef.current);
        if (local) respawnPlayer(local, 0);
        roundNumRef.current = msg.roundNum;
      }
      roundStateRef.current = msg.state;
      roundTimeLeftRef.current = msg.timeLeft;
      specScoreRef.current = msg.specScore;
      terrorScoreRef.current = msg.terrorScore;
      roundNumRef.current = msg.roundNum;
      winnerRef.current = msg.winner;
      return;
    }
    if (msg.t === "gameover") {
      specScoreRef.current = msg.specScore;
      terrorScoreRef.current = msg.terrorScore;
      if (phaseRef.current !== "gameover") {
        setPhaseSync("gameover");
        if (document.pointerLockElement) document.exitPointerLock();
      }
      return;
    }
  }, [applyDamage, determineHost, pushKillFeed, respawnPlayer, sendNet, setPhaseSync]);

  const setupChannel = useCallback((code: string) => {
    if (channelRef.current) {
      try {
        channelRef.current.postMessage({ t: "bye", id: localIdRef.current, lobby: lobbyRef.current } as NetMsg);
        channelRef.current.close();
      } catch { void 0; }
    }
    lobbyRef.current = code;
    knownHostRef.current = "";
    lastRoundMsgAtRef.current = 0;
    joinedAtRef.current = Date.now();
    if (typeof BroadcastChannel === "undefined") {
      channelRef.current = null;
      return;
    }
    const ch = new BroadcastChannel(`boberstrike-${code}`);
    channelRef.current = ch;
    ch.onmessage = (ev: MessageEvent<NetMsg>) => handleNet(ev.data);
    sendNet({ t: "hello", id: localIdRef.current, name: nameRef.current, team: teamRef.current, lobby: code, map: mapIdRef.current });
  }, [handleNet, sendNet]);

  const joinGame = useCallback((code: string) => {
    nameRef.current = name.trim() || "Бобр" + Math.floor(Math.random() * 900 + 100);
    teamRef.current = team;
    mapIdRef.current = mapId;
    playersRef.current.clear();
    botsRef.current = [];
    deathIdsRef.current.clear();
    killFeedRef.current = [];
    setKillFeed([]);
    const local = newPlayer(localIdRef.current, nameRef.current, team, false, true);
    const sp = pickSpawn(MAPS[mapIdRef.current] ?? MAPS.plant, team, 0);
    local.x = sp.x;
    local.y = sp.y;
    local.dirX = team === "spec" ? 1 : -1;
    local.dirY = 0;
    playersRef.current.set(localIdRef.current, local);
    roundStateRef.current = "buy";
    roundTimeLeftRef.current = BUY_TIME;
    specScoreRef.current = 0;
    terrorScoreRef.current = 0;
    roundNumRef.current = 1;
    winnerRef.current = null;
    lastRoundNumAppliedRef.current = 1;
    botsRef.current = [];
    setupChannel(code);
    setLobbyCode(code);
    setPhaseSync("playing");
    setPaused(false);
    setBuyOpen(false);
    setScoreboardOpen(false);
    setTimeout(() => {
      const cv = canvasRef.current;
      if (cv && document.pointerLockElement !== cv) cv.requestPointerLock?.();
    }, 100);
  }, [name, team, mapId, setupChannel, setPhaseSync]);

  const leaveGame = useCallback(() => {
    sendNet({ t: "bye", id: localIdRef.current, lobby: lobbyRef.current });
    if (channelRef.current) {
      try { channelRef.current.close(); } catch { void 0; }
      channelRef.current = null;
    }
    if (document.pointerLockElement) document.exitPointerLock();
    playersRef.current.clear();
    botsRef.current = [];
    setLobbyCode("");
    setPaused(false);
    setBuyOpen(false);
    setScoreboardOpen(false);
    setPhaseSync("menu");
  }, [sendNet, setPhaseSync]);

  const updateBots = useCallback((dt: number) => {
    if (determineHost() !== localIdRef.current) {
      if (botsRef.current.length > 0) botsRef.current = [];
      return;
    }
    const mapDef = MAPS[mapIdRef.current] ?? MAPS.plant;
    const grid = mapDef.grid;
    const W = mapDef.width;
    const H = mapDef.height;
    const now = performance.now() / 1000;
    const local = playersRef.current.get(localIdRef.current);
    const allTargets: PlayerState[] = [];
    if (local) allTargets.push(local);
    playersRef.current.forEach((p) => {
      if (p.id === localIdRef.current || p.isBot) return;
      if (Date.now() - p.lastSeenAt > PEER_TIMEOUT_MS) return;
      allTargets.push(p);
    });
    for (const b of botsRef.current) {
      if (b.hitFlash > 0) b.hitFlash -= dt;
      if (!b.alive) continue;
      if (roundStateRef.current !== "live") {
        continue;
      }
      if (b.botShootCd > 0) b.botShootCd -= dt;
      if (now < b.botNextThinkAt) {
        const moveDx = b.botWaypointX - b.x;
        const moveDy = b.botWaypointY - b.y;
        const moveDist = Math.hypot(moveDx, moveDy);
        if (moveDist > 0.2) {
          const ux = moveDx / moveDist;
          const uy = moveDy / moveDist;
          const spd = 2.2 * dt;
          const ex = b.x + ux * spd;
          const ey = b.y + uy * spd;
          if (!isWallAt(grid, W, H, Math.floor(ex), Math.floor(b.y))) b.x = ex;
          if (!isWallAt(grid, W, H, Math.floor(b.x), Math.floor(ey))) b.y = ey;
          b.dirX = ux;
          b.dirY = uy;
        }
        continue;
      }
      b.botNextThinkAt = now + BOT_REACTION + Math.random() * 0.3;
      let nearest: PlayerState | null = null;
      let nearestDist = 18;
      for (const t of allTargets) {
        if (t.team === b.team || !t.alive) continue;
        const d = Math.hypot(t.x - b.x, t.y - b.y);
        if (d < nearestDist && lineOfSight(grid, W, H, b.x, b.y, t.x, t.y)) {
          nearest = t;
          nearestDist = d;
        }
      }
      if (nearest) {
        b.botState = b.health < 30 ? "cover" : "attack";
        b.botTargetId = nearest.id;
        const tdx = nearest.x - b.x;
        const tdy = nearest.y - b.y;
        const td = Math.hypot(tdx, tdy);
        if (td > 0.01) {
          const aimErr = (Math.random() - 0.5) * 2 * BOT_AIM_ERROR;
          b.dirX = (tdx / td) * Math.cos(aimErr) - (tdy / td) * Math.sin(aimErr);
          b.dirY = (tdx / td) * Math.sin(aimErr) + (tdy / td) * Math.cos(aimErr);
        }
        if (b.botState === "cover") {
          const fx = b.x - (nearest.x - b.x) * 0.4;
          const fy = b.y - (nearest.y - b.y) * 0.4;
          if (!isWallAt(grid, W, H, Math.floor(fx), Math.floor(b.y))) b.botWaypointX = fx;
          else b.botWaypointX = b.x + (Math.random() - 0.5) * 2;
          if (!isWallAt(grid, W, H, Math.floor(b.x), Math.floor(fy))) b.botWaypointY = fy;
          else b.botWaypointY = b.y + (Math.random() - 0.5) * 2;
        } else {
          b.botWaypointX = b.x;
          b.botWaypointY = b.y;
          if (b.botShootCd <= 0 && td < WEAPONS.rifle.range) {
            b.botShootCd = WEAPONS.rifle.fireRate * (1.2 + Math.random() * 0.6);
            shotsRef.current.push({ ox: b.x, oy: b.y, dx: b.dirX, dy: b.dirY, at: Date.now(), weapon: "rifle", team: b.team });
            if (Math.random() < 0.45) {
              const targetIsLocal = nearest.id === localIdRef.current;
              if (targetIsLocal) {
                applyDamage(localIdRef.current, WEAPONS.rifle.damage, b.id, "rifle");
              } else {
                sendNet({ t: "hit", from: b.id, to: nearest.id, dmg: WEAPONS.rifle.damage, weapon: "rifle", lobby: lobbyRef.current });
              }
            }
          }
        }
      } else {
        b.botState = "wander";
        b.botTargetId = null;
        const wd = Math.hypot(b.botWaypointX - b.x, b.botWaypointY - b.y);
        if (wd < 0.4) {
          let attempts = 0;
          while (attempts < 8) {
            const ang = Math.random() * Math.PI * 2;
            const r = 2 + Math.random() * BOT_WANDER_RADIUS;
            const wx = clamp(b.x + Math.cos(ang) * r, 1, W - 1);
            const wy = clamp(b.y + Math.sin(ang) * r, 1, H - 1);
            if (!isWallAt(grid, W, H, Math.floor(wx), Math.floor(wy))) {
              b.botWaypointX = wx;
              b.botWaypointY = wy;
              break;
            }
            attempts++;
          }
        }
        const moveDx = b.botWaypointX - b.x;
        const moveDy = b.botWaypointY - b.y;
        const moveDist = Math.hypot(moveDx, moveDy);
        if (moveDist > 0.2) {
          const ux = moveDx / moveDist;
          const uy = moveDy / moveDist;
          const spd = 2.0 * dt;
          const ex = b.x + ux * spd;
          const ey = b.y + uy * spd;
          if (!isWallAt(grid, W, H, Math.floor(ex), Math.floor(b.y))) b.x = ex;
          if (!isWallAt(grid, W, H, Math.floor(b.x), Math.floor(ey))) b.y = ey;
          b.dirX = ux;
          b.dirY = uy;
        }
      }
    }
  }, [applyDamage, determineHost, sendNet]);

  const updateLocalMovement = useCallback((dt: number) => {
    const local = playersRef.current.get(localIdRef.current);
    if (!local) return;
    const keys = keysRef.current;
    const grid = (MAPS[mapIdRef.current] ?? MAPS.plant).grid;
    const W = (MAPS[mapIdRef.current] ?? MAPS.plant).width;
    const H = (MAPS[mapIdRef.current] ?? MAPS.plant).height;
    let rot = 0;
    if (mouseDxRef.current !== 0) {
      rot += mouseDxRef.current * MOUSE_SENS;
      mouseDxRef.current = 0;
    }
    if (keys["ArrowLeft"]) rot -= dt * 2.6;
    if (keys["ArrowRight"]) rot += dt * 2.6;
    if (rot !== 0) {
      const c = Math.cos(rot);
      const s = Math.sin(rot);
      const ndx = local.dirX * c - local.dirY * s;
      const ndy = local.dirX * s + local.dirY * c;
      local.dirX = ndx;
      local.dirY = ndy;
    }
    let mx = 0;
    let my = 0;
    if (keys["KeyW"] || keys["ArrowUp"]) { mx += local.dirX; my += local.dirY; }
    if (keys["KeyS"] || keys["ArrowDown"]) { mx -= local.dirX; my -= local.dirY; }
    const strafeX = -local.dirY;
    const strafeY = local.dirX;
    if (keys["KeyA"]) { mx -= strafeX; my -= strafeY; }
    if (keys["KeyD"]) { mx += strafeX; my += strafeY; }
    const len = Math.hypot(mx, my);
    if (len > 0.001 && local.alive) {
      mx = (mx / len) * MOVE_SPEED * dt;
      my = (my / len) * MOVE_SPEED * dt;
      const pad = 0.22;
      const nx = local.x + mx;
      const ny = local.y + my;
      if (!isWallAt(grid, W, H, Math.floor(nx + Math.sign(mx) * pad), Math.floor(local.y))) local.x = nx;
      if (!isWallAt(grid, W, H, Math.floor(local.x), Math.floor(ny + Math.sign(my) * pad))) local.y = ny;
      bobPhaseRef.current += dt * 9;
    }
    if (keys["Space"] && groundedRef.current && local.alive) {
      jumpZRef.current = 0.16;
      groundedRef.current = false;
    }
    if (jumpZRef.current > 0) {
      jumpZRef.current -= dt * 0.5;
      if (jumpZRef.current <= 0) {
        jumpZRef.current = 0;
        groundedRef.current = true;
      }
    }
    if (local.reloading) {
      const now = performance.now() / 1000;
      if (now >= local.reloadEndAt) {
        const wpn = WEAPONS[local.weapon];
        const need = wpn.magSize - local.ammoMag;
        const take = Math.min(need, local.ammoReserve);
        local.ammoMag += take;
        local.ammoReserve -= take;
        local.reloading = false;
      }
    }
    if (local.hitFlash > 0) local.hitFlash -= dt;
    if (flashRef.current > 0) flashRef.current -= dt;
    if (damageFlashRef.current > 0) damageFlashRef.current -= dt;
    if (hitMarkerRef.current > 0) hitMarkerRef.current -= dt;
    if (local.alive && roundStateRef.current === "live") {
      const wpn = WEAPONS[local.weapon];
      if (mouseDownRef.current && wpn.auto) doLocalShoot();
      if (shootPendingRef.current) {
        shootPendingRef.current = false;
        doLocalShoot();
      }
    }
  }, [doLocalShoot]);

  const updateRound = useCallback((dt: number) => {
    const host = determineHost();
    const isHost = host === localIdRef.current;
    if (isHost) {
      if (botsRef.current.length === 0) resetBots();
      roundTimeLeftRef.current -= dt;
      if (roundStateRef.current === "buy" && roundTimeLeftRef.current <= 0) {
        roundStateRef.current = "live";
        roundTimeLeftRef.current = LIVE_TIME;
      } else if (roundStateRef.current === "live") {
        checkRoundEnd();
        if (roundStateRef.current === "live" && roundTimeLeftRef.current <= 0) {
          const local = playersRef.current.get(localIdRef.current);
          let specAlive = 0;
          let terrorAlive = 0;
          if (local && local.alive) {
            if (local.team === "spec") specAlive++;
            else terrorAlive++;
          }
          botsRef.current.forEach((b) => {
            if (!b.alive) return;
            if (b.team === "spec") specAlive++;
            else terrorAlive++;
          });
          playersRef.current.forEach((p) => {
            if (p.id === localIdRef.current || p.isBot) return;
            if (!p.alive) return;
            if (Date.now() - p.lastSeenAt > PEER_TIMEOUT_MS) return;
            if (p.team === "spec") specAlive++;
            else terrorAlive++;
          });
          if (specAlive > terrorAlive) endRound("spec");
          else if (terrorAlive > specAlive) endRound("terror");
          else endRound("spec");
        }
      } else if (roundStateRef.current === "end" && roundTimeLeftRef.current <= 0) {
        if (specScoreRef.current >= WIN_SCORE || terrorScoreRef.current >= WIN_SCORE) {
          setPhaseSync("gameover");
          sendNet({ t: "gameover", lobby: lobbyRef.current, specScore: specScoreRef.current, terrorScore: terrorScoreRef.current });
          if (document.pointerLockElement) document.exitPointerLock();
        } else {
          roundNumRef.current++;
          startNewRound();
        }
      }
      const nowMs = Date.now();
      if (nowMs - lastRoundSentRef.current > ROUND_INTERVAL_MS) {
        lastRoundSentRef.current = nowMs;
        sendNet({ t: "round", host, state: roundStateRef.current, timeLeft: roundTimeLeftRef.current,
          specScore: specScoreRef.current, terrorScore: terrorScoreRef.current,
          roundNum: roundNumRef.current, winner: winnerRef.current,
          lobby: lobbyRef.current, map: mapIdRef.current });
      }
    }
  }, [checkRoundEnd, determineHost, endRound, resetBots, sendNet, setPhaseSync, startNewRound]);

  const render = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const W = cv.width;
    const H = cv.height;
    const local = playersRef.current.get(localIdRef.current);
    if (!local) return;
    const mapDef = MAPS[mapIdRef.current] ?? MAPS.plant;
    const grid = mapDef.grid;
    const MW = mapDef.width;
    const MH = mapDef.height;
    const planeX = -local.dirY * TAN_HALF_FOV;
    const planeY = local.dirX * TAN_HALF_FOV;
    const bob = Math.sin(bobPhaseRef.current) * 0.012;
    const horizon = Math.floor(H / 2 + H * (bob + jumpZRef.current));
    if (zbufRef.current.length !== W) zbufRef.current = new Float32Array(W);
    const zbuf = zbufRef.current;

    const ceilTop = ctx.createLinearGradient(0, 0, 0, Math.max(1, horizon));
    const floorBot = ctx.createLinearGradient(0, horizon, 0, H);
    if (mapDef.theme === "concrete") {
      ceilTop.addColorStop(0, "#0a0d12"); ceilTop.addColorStop(1, "#2a2f38");
      floorBot.addColorStop(0, "#2a2f38"); floorBot.addColorStop(1, "#080a0e");
    } else if (mapDef.theme === "sand") {
      ceilTop.addColorStop(0, "#1a1206"); ceilTop.addColorStop(1, "#4a3a18");
      floorBot.addColorStop(0, "#4a3a18"); floorBot.addColorStop(1, "#100a04");
    } else {
      ceilTop.addColorStop(0, "#0e0806"); ceilTop.addColorStop(1, "#3a2818");
      floorBot.addColorStop(0, "#3a2818"); floorBot.addColorStop(1, "#0a0703");
    }
    ctx.fillStyle = ceilTop;
    ctx.fillRect(0, 0, W, horizon);
    ctx.fillStyle = floorBot;
    ctx.fillRect(0, horizon, W, H - horizon);

    const wallBase = mapDef.theme === "concrete" ? { r: 120, g: 124, b: 130 } :
      mapDef.theme === "sand" ? { r: 190, g: 156, b: 92 } : { r: 150, g: 100, b: 54 };

    for (let x = 0; x < W; x++) {
      const cameraX = (2 * x) / W - 1;
      const rayX = local.dirX + planeX * cameraX;
      const rayY = local.dirY + planeY * cameraX;
      let mapX = Math.floor(local.x);
      let mapY = Math.floor(local.y);
      const deltaX = rayX === 0 ? 1e30 : Math.abs(1 / rayX);
      const deltaY = rayY === 0 ? 1e30 : Math.abs(1 / rayY);
      let stepX: number, stepY: number, sideX: number, sideY: number;
      if (rayX < 0) { stepX = -1; sideX = (local.x - mapX) * deltaX; }
      else { stepX = 1; sideX = (mapX + 1 - local.x) * deltaX; }
      if (rayY < 0) { stepY = -1; sideY = (local.y - mapY) * deltaY; }
      else { stepY = 1; sideY = (mapY + 1 - local.y) * deltaY; }
      let side = 0, hit = false, guard = 0;
      while (!hit && guard < 80) {
        guard++;
        if (sideX < sideY) { sideX += deltaX; mapX += stepX; side = 0; }
        else { sideY += deltaY; mapY += stepY; side = 1; }
        if (mapX < 0 || mapY < 0 || mapX >= MW || mapY >= MH) { hit = true; break; }
        if (grid[mapY][mapX] === 1) hit = true;
      }
      let perp = side === 0 ? sideX - deltaX : sideY - deltaY;
      if (perp < 0.0001) perp = 0.0001;
      zbuf[x] = perp;
      const lineH = H / perp;
      let drawStart = -lineH / 2 + horizon;
      let drawEnd = lineH / 2 + horizon;
      let wallX = side === 0 ? local.y + perp * rayY : local.x + perp * rayX;
      wallX -= Math.floor(wallX);
      const planks = 3;
      const pf = wallX * planks;
      const pIdx = Math.floor(pf);
      const within = pf - pIdx;
      let plankShade = pIdx % 2 === 0 ? 1.0 : 0.82;
      if (within < 0.06 || within > 0.94) plankShade *= 0.55;
      const grain = 0.045 * Math.sin(wallX * 53 + pIdx * 1.7);
      const sideShade = side === 1 ? 0.72 : 1.0;
      const distFactor = clamp(1 - perp / 13, 0.1, 1);
      const total = clamp(plankShade + grain, 0.05, 1.25) * sideShade * distFactor;
      const r = Math.round(clamp(wallBase.r * total, 0, 255));
      const gC = Math.round(clamp(wallBase.g * total, 0, 255));
      const b = Math.round(clamp(wallBase.b * total, 0, 255));
      ctx.fillStyle = `rgb(${r},${gC},${b})`;
      if (drawStart < 0) drawStart = 0;
      if (drawEnd > H) drawEnd = H;
      ctx.fillRect(x, drawStart, 1, drawEnd - drawStart);
    }

    const sprites: Array<{ p: PlayerState; dist: number }> = [];
    botsRef.current.forEach((b) => {
      if (b.id === localIdRef.current) return;
      sprites.push({ p: b, dist: (b.x - local.x) ** 2 + (b.y - local.y) ** 2 });
    });
    playersRef.current.forEach((p) => {
      if (p.id === localIdRef.current || p.isBot) return;
      if (Date.now() - p.lastSeenAt > PEER_TIMEOUT_MS) return;
      sprites.push({ p, dist: (p.x - local.x) ** 2 + (p.y - local.y) ** 2 });
    });
    sprites.sort((a, b) => b.dist - a.dist);
    const det = planeX * local.dirY - local.dirX * planeY;
    if (Math.abs(det) > 1e-9) {
      const invDet = 1 / det;
      for (const { p: e } of sprites) {
        if (!e.alive) continue;
        const sx = e.x - local.x;
        const sy = e.y - local.y;
        const transformX = invDet * (local.dirY * sx - local.dirX * sy);
        const transformY = invDet * (-planeY * sx + planeX * sy);
        if (transformY <= 0.12) continue;
        const screenX = Math.floor((W / 2) * (1 + transformX / transformY));
        const sprH = Math.abs(H / transformY);
        const sprW = sprH * 0.8;
        const footY = horizon + sprH * 0.5 + sprH * 0.02;
        const drawH = sprH;
        const drawStartY = footY - drawH;
        const sprite = e.team === "spec" ? beaverSpecSpriteRef.current : beaverTerrorSpriteRef.current;
        if (!sprite) continue;
        const texW = sprite.width;
        const texH = sprite.height;
        const drawStartX = -Math.floor(sprW / 2) + screenX;
        const drawEndX = Math.floor(sprW / 2) + screenX;
        const denom = drawH || 1;
        const hitTint = e.hitFlash > 0 ? Math.min(0.6, e.hitFlash * 3) : 0;
        for (let stripe = drawStartX; stripe < drawEndX; stripe++) {
          if (stripe < 0 || stripe >= W) continue;
          if (transformY >= zbuf[stripe]) continue;
          const texX = Math.floor(((stripe - drawStartX) * texW) / (sprW || 1));
          if (texX < 0 || texX >= texW) continue;
          let sy0 = drawStartY;
          let sy1 = footY;
          if (sy0 < 0) sy0 = 0;
          if (sy1 > H) sy1 = H;
          if (sy1 <= sy0) continue;
          const srcY0 = Math.floor(((sy0 - drawStartY) * texH) / denom);
          const srcY1 = Math.floor(((sy1 - drawStartY) * texH) / denom);
          const srcH = srcY1 - srcY0;
          if (srcH <= 0) continue;
          ctx.drawImage(sprite, texX, srcY0, 1, srcH, stripe, sy0, 1, sy1 - sy0);
          if (hitTint > 0) {
            ctx.fillStyle = `rgba(255,80,60,${hitTint})`;
            ctx.fillRect(stripe, sy0, 1, sy1 - sy0);
          }
        }
        if (e.team !== local.team && transformY < 6) {
          const dotX = screenX;
          const dotY = footY - sprH - 4;
          if (dotX >= 0 && dotX < W && dotY >= 0 && dotY < H) {
            ctx.fillStyle = e.team === "spec" ? "#5a9aff" : "#ff5a5a";
            ctx.fillRect(dotX - 1, dotY - 1, 3, 3);
          }
        }
      }
      for (const { p: e } of sprites) {
        if (e.alive) continue;
        const sx = e.x - local.x;
        const sy = e.y - local.y;
        const transformX = invDet * (local.dirY * sx - local.dirX * sy);
        const transformY = invDet * (-planeY * sx + planeX * sy);
        if (transformY <= 0.12) continue;
        const screenX = Math.floor((W / 2) * (1 + transformX / transformY));
        const sprH = Math.abs(H / transformY) * 0.4;
        const sprW = sprH * 2;
        const footY = horizon + sprH * 0.5;
        const drawStartY = footY - sprH;
        const sprite = deadSpriteRef.current;
        if (!sprite) continue;
        const texW = sprite.width;
        const texH = sprite.height;
        const drawStartX = -Math.floor(sprW / 2) + screenX;
        const drawEndX = Math.floor(sprW / 2) + screenX;
        for (let stripe = drawStartX; stripe < drawEndX; stripe++) {
          if (stripe < 0 || stripe >= W) continue;
          if (transformY >= zbuf[stripe]) continue;
          const texX = Math.floor(((stripe - drawStartX) * texW) / (sprW || 1));
          if (texX < 0 || texX >= texW) continue;
          let sy0 = drawStartY;
          let sy1 = footY;
          if (sy0 < 0) sy0 = 0;
          if (sy1 > H) sy1 = H;
          if (sy1 <= sy0) continue;
          const srcY0 = Math.floor(((sy0 - drawStartY) * texH) / (sprH || 1));
          const srcY1 = Math.floor(((sy1 - drawStartY) * texH) / (sprH || 1));
          const srcH = srcY1 - srcY0;
          if (srcH <= 0) continue;
          ctx.drawImage(sprite, texX, srcY0, 1, srcH, stripe, sy0, 1, sy1 - sy0);
        }
      }
    }

    const nowMs = Date.now();
    for (let i = shotsRef.current.length - 1; i >= 0; i--) {
      const s = shotsRef.current[i];
      if (nowMs - s.at > 80) {
        shotsRef.current.splice(i, 1);
        continue;
      }
      const sx = s.ox - local.x;
      const sy = s.oy - local.y;
      const transformX = (1 / det) * (local.dirY * sx - local.dirX * sy);
      const transformY = (1 / det) * (-planeY * sx + planeX * sy);
      if (transformY <= 0.12) continue;
      const screenX = Math.floor((W / 2) * (1 + transformX / transformY));
      const trH = Math.abs(H / transformY);
      if (screenX < 0 || screenX >= W) continue;
      if (transformY >= zbuf[screenX] + 0.05) continue;
      const age = (nowMs - s.at) / 80;
      const len = trH * 0.12 * (1 - age);
      ctx.strokeStyle = `rgba(255,230,150,${0.85 * (1 - age)})`;
      ctx.lineWidth = Math.max(1, trH * 0.008);
      ctx.beginPath();
      ctx.moveTo(screenX, horizon - trH * 0.05);
      ctx.lineTo(screenX + s.dx * len * 0.3, horizon - trH * 0.05 - s.dy * len * 0.3);
      ctx.stroke();
    }

    drawGunOverlay(ctx, W, H, flashRef.current, bobPhaseRef.current, WEAPONS[local.weapon]);

    if (damageFlashRef.current > 0) {
      ctx.fillStyle = `rgba(180,20,10,${clamp(damageFlashRef.current * 1.4, 0, 0.45)})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (hitMarkerRef.current > 0) {
      const a = clamp(hitMarkerRef.current * 5, 0, 0.9);
      ctx.strokeStyle = `rgba(255,90,60,${a})`;
      ctx.lineWidth = 2;
      const ccx = W / 2;
      const ccy = H / 2;
      const m = 9;
      ctx.beginPath();
      ctx.moveTo(ccx - m, ccy - m); ctx.lineTo(ccx - m + 5, ccy - m + 5);
      ctx.moveTo(ccx + m, ccy - m); ctx.lineTo(ccx + m - 5, ccy - m + 5);
      ctx.moveTo(ccx - m, ccy + m); ctx.lineTo(ccx - m + 5, ccy + m - 5);
      ctx.moveTo(ccx + m, ccy + m); ctx.lineTo(ccx + m - 5, ccy + m - 5);
      ctx.stroke();
    }

    const mmSize = Math.min(132, W * 0.22);
    const cell = mmSize / MW;
    const mmX = W - mmSize - 10;
    const mmY = 10;
    ctx.fillStyle = "rgba(8,6,3,0.72)";
    ctx.fillRect(mmX - 4, mmY - 4, mmSize + 8, mmSize + 8);
    ctx.strokeStyle = "rgba(180,130,70,0.5)";
    ctx.lineWidth = 1;
    ctx.strokeRect(mmX - 4, mmY - 4, mmSize + 8, mmSize + 8);
    for (let y = 0; y < MH; y++) {
      for (let x = 0; x < MW; x++) {
        if (grid[y][x] === 1) {
          ctx.fillStyle = mapDef.theme === "concrete" ? "#5a6068" : mapDef.theme === "sand" ? "#a08040" : "#7a5230";
          ctx.fillRect(mmX + x * cell, mmY + y * cell, cell + 0.6, cell + 0.6);
        } else {
          ctx.fillStyle = "rgba(48,34,20,0.55)";
          ctx.fillRect(mmX + x * cell, mmY + y * cell, cell + 0.6, cell + 0.6);
        }
      }
    }
    const drawDot = (px: number, py: number, color: string, r: number) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(mmX + px * cell, mmY + py * cell, r, 0, Math.PI * 2);
      ctx.fill();
    };
    sprites.forEach(({ p: e }) => {
      if (!e.alive) return;
      drawDot(e.x, e.y, e.team === "spec" ? "#5a9aff" : "#ff5a5a", Math.max(1.6, cell * 0.32));
    });
    drawDot(local.x, local.y, local.team === "spec" ? "#5ad6ff" : "#ffad6a", Math.max(2, cell * 0.38));
    ctx.strokeStyle = local.team === "spec" ? "#5ad6ff" : "#ffad6a";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(mmX + local.x * cell, mmY + local.y * cell);
    ctx.lineTo(mmX + (local.x + local.dirX * 0.9) * cell, mmY + (local.y + local.dirY * 0.9) * cell);
    ctx.stroke();
  }, []);

  useEffect(() => {
    beaverSpecSpriteRef.current = makeBeaverSprite("spec");
    beaverTerrorSpriteRef.current = makeBeaverSprite("terror");
    deadSpriteRef.current = makeDeadSprite();
  }, []);

  useEffect(() => {
    const loop = (t: number) => {
      const last = lastTimeRef.current || t;
      let dt = (t - last) / 1000;
      lastTimeRef.current = t;
      if (dt > 0.1) dt = 0.1;
      if (dt < 0) dt = 0;
      const inGame = phaseRef.current === "playing" || phaseRef.current === "roundend";
      if (inGame) {
        updateLocalMovement(dt);
        updateBots(dt);
        updateRound(dt);
        const nowMs = Date.now();
        const hostNow = determineHost();
        if (nowMs - lastStateSentRef.current > STATE_INTERVAL_MS) {
          lastStateSentRef.current = nowMs;
          const local = playersRef.current.get(localIdRef.current);
          if (local) {
            sendNet({ t: "state", id: localIdRef.current, name: nameRef.current, team: teamRef.current,
              x: local.x, y: local.y,
              rot: Math.atan2(local.dirY, local.dirX),
              health: local.health, alive: local.alive, weapon: local.weapon,
              lobby: lobbyRef.current, time: nowMs });
          }
          if (hostNow === localIdRef.current) {
            botsRef.current.forEach((b) => {
              sendNet({ t: "state", id: b.id, name: b.name, team: b.team,
                x: b.x, y: b.y, rot: Math.atan2(b.dirY, b.dirX),
                health: b.health, alive: b.alive, weapon: b.weapon,
                lobby: lobbyRef.current, time: nowMs });
            });
          }
        }
        const stale: string[] = [];
        playersRef.current.forEach((p, id) => {
          if (id === localIdRef.current || p.isBot) return;
          if (Date.now() - p.lastSeenAt > PEER_TIMEOUT_MS) stale.push(id);
        });
        stale.forEach((id) => playersRef.current.delete(id));
        if (nowMs - lastHudUpdateRef.current > 100) {
          lastHudUpdateRef.current = nowMs;
          const local2 = playersRef.current.get(localIdRef.current);
          if (local2) {
            let connected = 1;
            playersRef.current.forEach((p) => {
              if (p.id !== localIdRef.current && !p.isBot && Date.now() - p.lastSeenAt < PEER_TIMEOUT_MS) connected++;
            });
            const wpn = WEAPONS[local2.weapon];
            const reloadProgress = local2.reloading
              ? clamp(1 - (local2.reloadEndAt - performance.now() / 1000) / wpn.reloadTime, 0, 1)
              : 0;
            setHud({
              health: Math.max(0, Math.round(local2.health)),
              armor: Math.max(0, Math.round(local2.armor)),
              money: local2.money,
              weapon: local2.weapon,
              weaponName: wpn.name,
              ammoMag: local2.ammoMag,
              ammoReserve: local2.ammoReserve,
              reloading: local2.reloading,
              reloadProgress,
              roundState: roundStateRef.current,
              roundTimeLeft: Math.max(0, Math.ceil(roundTimeLeftRef.current)),
              specScore: specScoreRef.current,
              terrorScore: terrorScoreRef.current,
              roundNum: roundNumRef.current,
              alive: local2.alive,
              team: local2.team,
              connected,
              hostId: hostNow,
              isHost: hostNow === localIdRef.current,
              winner: winnerRef.current,
              hitFlash: local2.hitFlash,
            });
          }
        }
        if (roundStateRef.current === "end" && phaseRef.current === "playing") {
          setPhaseSync("roundend");
        } else if (roundStateRef.current !== "end" && phaseRef.current === "roundend") {
          setPhaseSync("playing");
        }
      }
      render();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [determineHost, render, sendNet, setPhaseSync, updateBots, updateLocalMovement, updateRound]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const cv = canvasRef.current;
    if (!wrap || !cv) return;
    const resize = () => {
      const w = Math.max(320, Math.floor(wrap.clientWidth));
      const h = Math.max(240, Math.floor(wrap.clientHeight));
      cv.width = w;
      cv.height = h;
      cv.style.width = w + "px";
      cv.style.height = h + "px";
      zbufRef.current = new Float32Array(w);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName ?? "";
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (phaseRef.current !== "playing" && phaseRef.current !== "roundend") return;
      if (e.code === "Tab") {
        e.preventDefault();
        setScoreboardOpen(true);
        return;
      }
      if (e.code === "Escape") {
        return;
      }
      if (e.code === "KeyB") {
        e.preventDefault();
        if (buyOpen) {
          setBuyOpen(false);
          canvasRef.current?.requestPointerLock?.();
        } else {
          setBuyOpen(true);
          if (document.pointerLockElement) document.exitPointerLock();
        }
        return;
      }
      if (e.code === "Digit1") { switchSlot(1); return; }
      if (e.code === "Digit2") { switchSlot(2); return; }
      if (e.code === "KeyR") { tryReload(); return; }
      if (e.code === "Space") {
        e.preventDefault();
        keysRef.current["Space"] = true;
        return;
      }
      keysRef.current[e.code] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Tab") {
        setScoreboardOpen(false);
        return;
      }
      keysRef.current[e.code] = false;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (lockedRef.current && phaseRef.current === "playing") {
        mouseDxRef.current += e.movementX;
      }
    };
    const onMouseDown = (e: MouseEvent) => {
      if (phaseRef.current !== "playing") return;
      if (!lockedRef.current) return;
      if (e.button !== 0) return;
      mouseDownRef.current = true;
      shootPendingRef.current = true;
    };
    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) mouseDownRef.current = false;
    };
    const onLockChange = () => {
      lockedRef.current = document.pointerLockElement === canvasRef.current;
      if (!lockedRef.current && phaseRef.current === "playing" && !buyOpen) {
        setPaused(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    document.addEventListener("pointerlockchange", onLockChange);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("pointerlockchange", onLockChange);
    };
  }, [buyOpen, switchSlot, tryReload]);

  useEffect(() => {
    return () => {
      if (channelRef.current) {
        try {
          channelRef.current.postMessage({ t: "bye", id: localIdRef.current, lobby: lobbyRef.current } as NetMsg);
          channelRef.current.close();
        } catch { void 0; }
        channelRef.current = null;
      }
      if (document.pointerLockElement) document.exitPointerLock();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const resumeGame = useCallback(() => {
    setPaused(false);
    const cv = canvasRef.current;
    if (cv && document.pointerLockElement !== cv) cv.requestPointerLock?.();
  }, []);

  const closeBuyMenu = useCallback(() => {
    setBuyOpen(false);
    const cv = canvasRef.current;
    if (cv && document.pointerLockElement !== cv) cv.requestPointerLock?.();
  }, []);

  const createLobby = useCallback(() => {
    const code = genLobbyCode();
    nameRef.current = name.trim() || "Бобр" + Math.floor(Math.random() * 900 + 100);
    teamRef.current = team;
    mapIdRef.current = mapId;
    setupChannel(code);
    setLobbyCode(code);
    setLobbyPlayers([{ id: localIdRef.current, name: nameRef.current, team }]);
    setPhaseSync("lobby");
  }, [name, team, mapId, setupChannel, setPhaseSync]);

  const joinExisting = useCallback(() => {
    const code = lobbyInput.trim().toUpperCase();
    if (code.length !== 6) return;
    nameRef.current = name.trim() || "Бобр" + Math.floor(Math.random() * 900 + 100);
    teamRef.current = team;
    mapIdRef.current = mapId;
    setupChannel(code);
    setLobbyCode(code);
    setLobbyPlayers([{ id: localIdRef.current, name: nameRef.current, team }]);
    sendNet({ t: "hello", id: localIdRef.current, name: nameRef.current, team, lobby: code, map: mapId });
    setPhaseSync("lobby");
  }, [lobbyInput, name, team, mapId, setupChannel, sendNet, setPhaseSync]);

  const startFromLobby = useCallback(() => {
    joinGame(lobbyRef.current);
  }, [joinGame]);

  const playSolo = useCallback(() => {
    const code = genLobbyCode();
    joinGame(code);
  }, [joinGame]);

  const localPlayerForScore = playersRef.current.get(localIdRef.current);
  const allForScore: PlayerState[] = [];
  if (localPlayerForScore) allForScore.push(localPlayerForScore);
  botsRef.current.forEach((b) => allForScore.push(b));
  playersRef.current.forEach((p) => {
    if (p.id !== localIdRef.current && !p.isBot && Date.now() - p.lastSeenAt < PEER_TIMEOUT_MS) allForScore.push(p);
  });
  allForScore.sort((a, b) => b.kills - a.kills);

  return (
    <div ref={wrapRef} className="relative w-full h-full overflow-hidden bg-black select-none">
      <canvas
        ref={canvasRef}
        onClick={() => {
          if (!lockedRef.current && (phaseRef.current === "playing" || phaseRef.current === "roundend")) {
            canvasRef.current?.requestPointerLock?.();
          }
        }}
        className="block w-full h-full"
        style={{ cursor: (phase === "playing" && lockedRef.current) ? "none" : "default" }}
      />

      {phase === "menu" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-black via-zinc-900 to-black overflow-y-auto py-6 px-4">
          <div className="text-amber-400/70 text-[10px] tracking-[0.45em] mb-2 font-mono">BOBEROS PRESENTS</div>
          <h1 className="text-4xl sm:text-6xl font-black text-amber-200 tracking-tight drop-shadow-[0_0_22px_rgba(245,158,11,0.5)] flex items-center gap-3">
            <Swords className="w-8 h-8 sm:w-12 sm:h-12 text-amber-400" />
            БобрСтрайк
          </h1>
          <div className="mt-1 text-amber-100/70 text-xs sm:text-sm font-mono">3D-FPS · спецназ против террористов · мультиплеер по коду</div>

          <div className="mt-6 w-full max-w-md bg-zinc-900/80 border border-amber-900/40 rounded-xl p-4 sm:p-5 space-y-3">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-amber-300/70 mb-1">Позывной</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 16))}
                className="w-full bg-black/60 border border-amber-900/50 rounded px-3 py-2 text-amber-100 text-sm font-mono outline-none focus:border-amber-500"
                placeholder="Бобр..."
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-amber-300/70 mb-1">Команда</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTeam("spec")}
                  className={`px-3 py-2 rounded text-sm font-bold border transition ${team === "spec" ? "bg-blue-600 border-blue-400 text-white" : "bg-black/40 border-blue-900/50 text-blue-300/70 hover:border-blue-600"}`}
                >
                  Спецназ
                </button>
                <button
                  onClick={() => setTeam("terror")}
                  className={`px-3 py-2 rounded text-sm font-bold border transition ${team === "terror" ? "bg-red-600 border-red-400 text-white" : "bg-black/40 border-red-900/50 text-red-300/70 hover:border-red-600"}`}
                >
                  Террористы
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-amber-300/70 mb-1">Карта</label>
              <div className="grid grid-cols-3 gap-2">
                {MAP_LIST.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMapId(m.id)}
                    className={`px-2 py-2 rounded text-xs font-bold border transition ${mapId === m.id ? "bg-amber-600 border-amber-400 text-white" : "bg-black/40 border-amber-900/50 text-amber-200/70 hover:border-amber-600"}`}
                  >
                    {m.name}
                    <div className="text-[9px] font-normal opacity-70">{m.theme === "concrete" ? "бетон" : m.theme === "sand" ? "песок" : "дерево"}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={createLobby}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm transition"
              >
                <Plus className="w-4 h-4" /> Создать лобби
              </button>
              <button
                onClick={playSolo}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded bg-zinc-700 hover:bg-zinc-600 text-amber-100 font-bold text-sm transition"
              >
                <Bot className="w-4 h-4" /> С ботами
              </button>
            </div>
            <div className="pt-2 border-t border-amber-900/30">
              <label className="block text-[11px] uppercase tracking-wider text-amber-300/70 mb-1">Войти по коду</label>
              <div className="flex gap-2">
                <input
                  value={lobbyInput}
                  onChange={(e) => setLobbyInput(e.target.value.toUpperCase().slice(0, 6))}
                  className="flex-1 bg-black/60 border border-amber-900/50 rounded px-3 py-2 text-amber-100 text-sm font-mono tracking-[0.4em] outline-none focus:border-amber-500 text-center"
                  placeholder="XXXXXX"
                  maxLength={6}
                />
                <button
                  onClick={joinExisting}
                  disabled={lobbyInput.length !== 6}
                  className="flex items-center gap-1 px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition"
                >
                  <LogIn className="w-4 h-4" /> Войти
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-amber-200/70 font-mono max-w-md">
            <div className="px-2 py-1.5 rounded bg-black/40 border border-amber-900/40 text-center"><b className="text-amber-300">WASD</b> ход</div>
            <div className="px-2 py-1.5 rounded bg-black/40 border border-amber-900/40 text-center"><b className="text-amber-300">Мышь</b> обзор</div>
            <div className="px-2 py-1.5 rounded bg-black/40 border border-amber-900/40 text-center"><b className="text-amber-300">ЛКМ</b> огонь</div>
            <div className="px-2 py-1.5 rounded bg-black/40 border border-amber-900/40 text-center"><b className="text-amber-300">B</b> магазин</div>
            <div className="px-2 py-1.5 rounded bg-black/40 border border-amber-900/40 text-center"><b className="text-amber-300">R</b> перезарядка</div>
            <div className="px-2 py-1.5 rounded bg-black/40 border border-amber-900/40 text-center"><b className="text-amber-300">1/2</b> слоты</div>
            <div className="px-2 py-1.5 rounded bg-black/40 border border-amber-900/40 text-center"><b className="text-amber-300">Tab</b> таблица</div>
            <div className="px-2 py-1.5 rounded bg-black/40 border border-amber-900/40 text-center"><b className="text-amber-300">Esc</b> меню</div>
          </div>
        </div>
      )}

      {phase === "lobby" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-zinc-900 to-zinc-950 p-6 text-white">
          <div className="w-full max-w-md rounded-2xl border border-amber-700/40 bg-zinc-900/80 p-6 shadow-2xl">
            <div className="text-center">
              <p className="text-xs uppercase tracking-widest text-amber-400/70">Код лобби</p>
              <p className="mt-1 text-4xl font-black tracking-[0.4em] text-amber-300" style={{ textShadow: "0 0 20px rgba(251,191,36,0.4)" }}>{lobbyCode}</p>
              <button
                onClick={() => { navigator.clipboard?.writeText(lobbyCode); }}
                className="mt-2 text-xs text-amber-300/60 hover:text-amber-200"
              >
                скопировать код
              </button>
              <p className="mt-3 text-xs text-zinc-400">
                Открой сайт в новой вкладке и введи этот код, чтобы присоединиться.
                Или нажми «Начать» для игры с ботами.
              </p>
            </div>

            <div className="mt-5">
              <p className="mb-2 text-[11px] uppercase tracking-wide text-zinc-500">Игроки в лобби ({lobbyPlayers.length})</p>
              <div className="space-y-1.5">
                {lobbyPlayers.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 rounded-lg bg-white/5 p-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${p.team === "spec" ? "bg-sky-400" : "bg-rose-400"}`} />
                    <span className="flex-1 text-sm">{p.name}{p.id === localIdRef.current && " (ты)"}</span>
                    <span className={`text-[10px] ${p.team === "spec" ? "text-sky-400" : "text-rose-400"}`}>
                      {p.team === "spec" ? "Спецназ" : "Террористы"}
                    </span>
                  </div>
                ))}
                {lobbyPlayers.length < 2 && (
                  <div className="flex items-center gap-2 rounded-lg border border-dashed border-white/15 p-2 text-xs text-zinc-500">
                    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-zinc-600" />
                    Ожидание игроков...
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={startFromLobby}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-zinc-900 hover:bg-amber-400"
              >
                <Swords className="h-4 w-4" /> Начать игру
              </button>
              <button
                onClick={leaveGame}
                className="rounded-xl bg-white/10 px-4 py-2.5 text-sm text-white/70 hover:bg-white/20"
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      )}

      {(phase === "playing" || phase === "roundend") && (
        <>
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute top-3 left-3 flex flex-col gap-1.5 bg-black/55 backdrop-blur-sm rounded-lg px-3 py-2 text-amber-100 text-xs font-mono border border-amber-900/40">
              <div className="flex items-center gap-2">
                <Heart className={`w-4 h-4 shrink-0 ${hud.health > 50 ? "text-red-400" : "text-red-600"}`} />
                <div className="w-24 h-2 bg-black/60 rounded-full overflow-hidden border border-amber-900/60">
                  <div className="h-full transition-all duration-150" style={{ width: `${hud.health}%`, background: hud.health > 50 ? "linear-gradient(90deg,#ef4444,#f97316)" : "linear-gradient(90deg,#b91c1c,#7f1d1d)" }} />
                </div>
                <span className="tabular-nums w-7 text-right">{hud.health}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-300 shrink-0" />
                <div className="w-24 h-2 bg-black/60 rounded-full overflow-hidden border border-amber-900/60">
                  <div className="h-full bg-blue-400 transition-all duration-150" style={{ width: `${hud.armor}%` }} />
                </div>
                <span className="tabular-nums w-7 text-right">{hud.armor}</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-300 shrink-0" />
                <span className="text-emerald-200 font-bold tabular-nums">${hud.money}</span>
              </div>
            </div>

            <div className="absolute top-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 bg-black/55 backdrop-blur-sm rounded-lg px-4 py-2 border border-amber-900/40">
              <div className="flex items-center gap-3 text-sm font-mono font-bold">
                <span className="text-blue-300">{hud.specScore}</span>
                <Timer className="w-4 h-4 text-amber-300" />
                <span className="text-amber-200 tabular-nums">{hud.roundTimeLeft}s</span>
                <Flag className="w-4 h-4 text-amber-300" />
                <span className="text-red-300">{hud.terrorScore}</span>
              </div>
              <div className="text-[10px] text-amber-200/70 font-mono">
                Раунд {hud.roundNum} · до {WIN_SCORE} · {hud.roundState === "buy" ? "ЗАКУПКА" : hud.roundState === "live" ? "БОЙ" : "ФИНИШ"}
              </div>
            </div>

            <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5 bg-black/55 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-amber-900/40 text-[11px] font-mono">
              <div className="flex items-center gap-1.5 text-amber-200">
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span>{hud.connected} в лобби</span>
              </div>
              <div className="text-amber-300/80">Код: <b className="tracking-[0.3em] text-amber-200">{lobbyCode}</b></div>
              <div className="text-amber-200/50">{hud.isHost ? "хост" : `хост: ${hud.hostId.slice(0, 4)}`}</div>
            </div>

            {killFeed.length > 0 && (
              <div className="absolute top-24 right-3 flex flex-col gap-1 items-end max-w-[260px]">
                {killFeed.map((k) => (
                  <div key={k.key} className="bg-black/60 rounded px-2 py-1 text-[11px] font-mono flex items-center gap-1.5 border border-amber-900/30">
                    <span className={k.killerTeam === "spec" ? "text-blue-300 font-bold" : "text-red-300 font-bold"}>{k.killerName}</span>
                    <Skull className="w-3 h-3 text-amber-400" />
                    <span className={k.victimTeam === "spec" ? "text-blue-300/80" : "text-red-300/80"}>{k.victimName}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="absolute bottom-3 left-3 flex flex-col gap-1 bg-black/55 backdrop-blur-sm rounded-lg px-3 py-2 border border-amber-900/40 text-amber-100 text-xs font-mono">
              <div className="flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-amber-300 shrink-0" />
                <span className="text-amber-200 font-bold">{hud.weaponName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-amber-300">Патроны:</span>
                <span className="text-amber-100 font-bold tabular-nums text-base">{hud.ammoMag}</span>
                <span className="text-amber-200/60">/ {hud.ammoReserve}</span>
              </div>
              {hud.reloading && (
                <div className="w-32 h-1.5 bg-black/60 rounded overflow-hidden border border-amber-900/60">
                  <div className="h-full bg-amber-400" style={{ width: `${hud.reloadProgress * 100}%` }} />
                </div>
              )}
            </div>

            {!hud.alive && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-black/70 px-6 py-4 rounded-lg border border-red-900/50 text-center">
                  <Skull className="w-10 h-10 text-red-500 mx-auto mb-2" />
                  <div className="text-red-300 font-bold text-lg">Вы погибли</div>
                  <div className="text-amber-200/70 text-sm font-mono mt-1">ждите следующего раунда</div>
                </div>
              </div>
            )}

            {hud.roundState === "buy" && hud.alive && (
              <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-black/65 px-4 py-2 rounded-lg border border-amber-700/50 text-amber-200 text-sm font-mono animate-pulse">
                Нажмите <b className="text-amber-300">B</b> — магазин оружия
              </div>
            )}

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-7 h-7">
                <div className="absolute left-1/2 top-0 -translate-x-1/2 w-0.5 h-7 bg-amber-100/70" />
                <div className="absolute top-1/2 left-0 -translate-y-1/2 h-0.5 w-7 bg-amber-100/70" />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-amber-100" />
              </div>
            </div>

            <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)" }} />
          </div>

          {phase === "roundend" && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className={`px-8 py-5 rounded-xl border-2 ${hud.winner === "spec" ? "bg-blue-900/80 border-blue-400" : "bg-red-900/80 border-red-400"} backdrop-blur-md`}>
                <div className={`text-3xl font-black ${hud.winner === "spec" ? "text-blue-200" : "text-red-200"}`}>
                  {hud.winner === "spec" ? "Спецназ победила!" : "Террористы победили!"}
                </div>
                <div className="text-center text-amber-100/70 mt-1 font-mono text-sm">следующий раунд через {hud.roundTimeLeft}s</div>
              </div>
            </div>
          )}

          {scoreboardOpen && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
              <div className="bg-zinc-900/90 border border-amber-900/40 rounded-xl p-5 w-full max-w-lg max-h-[80%] overflow-y-auto">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-amber-200 font-bold text-lg">Таблица игроков</h3>
                  <div className="text-xs text-amber-300/70 font-mono">раунд {hud.roundNum}</div>
                </div>
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 text-[11px] font-mono text-amber-300/60 px-2 pb-1 border-b border-amber-900/30">
                  <span>Игрок</span><span className="w-8 text-right">Уб.</span><span className="w-8 text-right">См.</span><span className="w-12 text-right">Команда</span>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {allForScore.map((p) => (
                    <div key={p.id} className={`grid grid-cols-[1fr_auto_auto_auto] gap-2 text-sm px-2 py-1.5 rounded ${p.isLocal ? "bg-amber-900/30 text-amber-100" : "text-amber-200/80"}`}>
                      <span className="truncate">{p.name}{p.isLocal ? " (вы)" : ""}{p.isBot ? " 🤖" : ""}</span>
                      <span className="w-8 text-right tabular-nums">{p.kills}</span>
                      <span className="w-8 text-right tabular-nums">{p.deaths}</span>
                      <span className={`w-12 text-right text-xs font-bold ${p.team === "spec" ? "text-blue-300" : "text-red-300"}`}>{p.team === "spec" ? "СПЦ" : "ТРР"}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {buyOpen && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/75 backdrop-blur-sm">
              <div className="bg-zinc-900/95 border border-amber-700/50 rounded-xl p-5 w-full max-w-md">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-amber-200 font-bold text-lg flex items-center gap-2"><ShoppingBag className="w-5 h-5" /> Магазин</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-300 font-mono text-sm">${hud.money}</span>
                    <button onClick={closeBuyMenu} className="text-amber-200/70 hover:text-amber-100"><X className="w-5 h-5" /></button>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {WEAPON_LIST.map((w) => {
                    const canBuy = hud.money >= w.price;
                    return (
                      <button
                        key={w.id}
                        onClick={() => buyWeapon(w.id)}
                        disabled={!canBuy}
                        className={`flex items-center justify-between px-3 py-2.5 rounded border text-left transition ${canBuy ? "bg-black/50 border-amber-700/50 hover:border-amber-400 hover:bg-amber-900/20" : "bg-black/30 border-zinc-800 opacity-50 cursor-not-allowed"}`}
                      >
                        <div>
                          <div className="text-amber-100 font-bold text-sm">{w.name}</div>
                          <div className="text-[10px] text-amber-300/60 font-mono">урон {w.damage} · скор. {w.fireRate}s · дальность {w.range} {w.pellets > 1 ? `· ${w.pellets}× дробь` : ""}</div>
                        </div>
                        <div className={`font-mono text-sm font-bold ${canBuy ? "text-emerald-300" : "text-red-400"}`}>
                          {w.price === 0 ? "бесплатно" : `$${w.price}`}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 text-[11px] text-amber-300/60 font-mono text-center">закрыть: B или Esc · слот 1 = пистолет, 2 = вторичное</div>
              </div>
            </div>
          )}

          {paused && !buyOpen && !scoreboardOpen && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
              <div className="bg-zinc-900/95 border border-amber-700/50 rounded-xl p-6 w-full max-w-sm text-center">
                <h3 className="text-amber-200 font-bold text-xl mb-1">Пауза</h3>
                <div className="text-amber-300/60 text-xs font-mono mb-4">лобби: {lobbyCode}</div>
                <div className="flex flex-col gap-2">
                  <button onClick={resumeGame} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm transition">
                    <Crosshair className="w-4 h-4" /> Продолжить
                  </button>
                  <button onClick={leaveGame} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded bg-red-700 hover:bg-red-600 text-white font-bold text-sm transition">
                    <LogOut className="w-4 h-4" /> Выйти в меню
                  </button>
                </div>
                <div className="mt-3 text-[10px] text-amber-300/40 font-mono">открой новую вкладку с этим же URL и введи код {lobbyCode}, чтобы присоединились друзья</div>
              </div>
            </div>
          )}
        </>
      )}

      {phase === "gameover" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md text-center px-6">
          <Trophy className="w-16 h-16 text-amber-300 mb-4" />
          <h2 className="text-4xl sm:text-5xl font-black text-amber-200 tracking-tight">
            {hud.specScore > hud.terrorScore ? "Спецназ чемпион!" : hud.terrorScore > hud.specScore ? "Террористы чемпионы!" : "Ничья!"}
          </h2>
          <div className="mt-4 text-2xl font-mono">
            <span className="text-blue-300 font-bold">{hud.specScore}</span>
            <span className="text-amber-100/60 mx-2">:</span>
            <span className="text-red-300 font-bold">{hud.terrorScore}</span>
          </div>
          <button
            onClick={leaveGame}
            className="mt-8 flex items-center gap-2 px-6 py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold transition"
          >
            <RefreshCw className="w-4 h-4" /> В меню
          </button>
        </div>
      )}
    </div>
  );
}

function drawGunOverlay(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  flash: number,
  bobPhase: number,
  wpn: Weapon,
): void {
  const cx = W / 2;
  const bobY = Math.sin(bobPhase * 0.5) * 3;
  const baseY = H - 4 + bobY;
  const pawW = Math.min(230, W * 0.3);
  const pawH = Math.min(110, H * 0.26);
  const grad = ctx.createLinearGradient(0, baseY - pawH, 0, baseY);
  grad.addColorStop(0, "#9a6438");
  grad.addColorStop(1, "#5a3618");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(cx - pawW / 2, baseY);
  ctx.lineTo(cx - pawW / 2 + 18, baseY - pawH + 22);
  ctx.quadraticCurveTo(cx, baseY - pawH - 8, cx + pawW / 2 - 18, baseY - pawH + 22);
  ctx.lineTo(cx + pawW / 2, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#3a2410";
  for (let i = 0; i < 4; i++) {
    const fx = cx - pawW * 0.34 + i * (pawW * 0.226);
    const fy = baseY - pawH + 10;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx + 9, fy - 22);
    ctx.lineTo(fx + 18, fy);
    ctx.closePath();
    ctx.fill();
  }
  const barrelW = Math.max(8, pawW * 0.08);
  const barrelH = Math.max(20, pawH * 0.55);
  ctx.fillStyle = wpn.id === "sniper" ? "#2a2a2a" : wpn.id === "rifle" ? "#3a2a1a" : "#4a3a2a";
  ctx.fillRect(cx - barrelW / 2, baseY - pawH - barrelH + 8, barrelW, barrelH);
  if (wpn.id === "sniper") {
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(cx - barrelW / 2 - 6, baseY - pawH - barrelH + 18, 12, 4);
    ctx.fillStyle = "#5a8aff";
    ctx.fillRect(cx + barrelW / 2 - 2, baseY - pawH - barrelH + 14, 4, 4);
  }
  if (flash > 0) {
    const fy = baseY - pawH - barrelH - 4;
    const fr = 60 * (flash / 0.08) + 22;
    const fl = ctx.createRadialGradient(cx, fy, 2, cx, fy, fr);
    fl.addColorStop(0, "rgba(255,250,210,0.95)");
    fl.addColorStop(0.3, "rgba(255,180,60,0.7)");
    fl.addColorStop(1, "rgba(255,120,20,0)");
    ctx.fillStyle = fl;
    ctx.beginPath();
    ctx.arc(cx, fy, fr, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255,240,180,${clamp(flash * 4, 0, 0.18)})`;
    ctx.fillRect(0, 0, W, H);
  }
}
