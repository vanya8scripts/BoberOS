"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  Coins, Heart, Play, RotateCcw, Trophy, Snowflake, Bomb, Crosshair,
  ChevronUp, X, Skull, Shield,
} from "lucide-react";

type Phase = "ready" | "playing" | "wave-break" | "gameover" | "win";
type TowerType = "arrow" | "cannon" | "freeze";
type EnemyType = "grunt" | "fast" | "tank";

interface Tower {
  id: number;
  col: number;
  row: number;
  type: TowerType;
  level: number;
  cooldown: number;
  angle: number;
  flash: number;
}

interface Enemy {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  type: EnemyType;
  speed: number;
  target: number;
  slowTimer: number;
  slowFactor: number;
  reward: number;
  damage: number;
  color: string;
  radius: number;
  dead: boolean;
  wobble: number;
}

interface Projectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetId: number;
  speed: number;
  damage: number;
  splash: number;
  slow: number;
  slowTime: number;
  type: TowerType;
  life: number;
}

interface FloatText {
  x: number;
  y: number;
  text: string;
  life: number;
  color: string;
}

interface Point {
  x: number;
  y: number;
}

interface GameState {
  phase: Phase;
  money: number;
  lives: number;
  maxLives: number;
  wave: number;
  totalWaves: number;
  towers: Tower[];
  enemies: Enemy[];
  projectiles: Projectile[];
  floats: FloatText[];
  queue: { type: EnemyType; at: number }[];
  waveTime: number;
  breakTimer: number;
  nextId: number;
  buildMode: TowerType | null;
  selectedId: number;
  hoverCol: number;
  hoverRow: number;
  cell: number;
  offX: number;
  offY: number;
  time: number;
  raf: number;
  last: number;
  hudTimer: number;
  size: { w: number; h: number };
}

const COLS = 18;
const ROWS = 11;
const START_MONEY = 220;
const START_LIVES = 20;
const TOTAL_WAVES = 10;
const BREAK_TIME = 10;

const PATH: Point[] = [
  { x: -0.5, y: 1.5 },
  { x: 14.5, y: 1.5 },
  { x: 14.5, y: 4.5 },
  { x: 3.5, y: 4.5 },
  { x: 3.5, y: 7.5 },
  { x: 16.5, y: 7.5 },
  { x: 16.5, y: 9.5 },
  { x: 18.5, y: 9.5 },
];

const PATH_CELLS = new Set<string>();
for (let i = 0; i < PATH.length - 1; i++) {
  const a = PATH[i], b = PATH[i + 1];
  const steps = Math.ceil(Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) * 6);
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;
    const c = Math.floor(x), r = Math.floor(y);
    if (c >= 0 && c < COLS && r >= 0 && r < ROWS) PATH_CELLS.add(c + "," + r);
  }
}

function isBuildable(col: number, row: number, towers: Tower[]): boolean {
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return false;
  if (PATH_CELLS.has(col + "," + row)) return false;
  if (towers.some((t) => t.col === col && t.row === row)) return false;
  return true;
}

const TOWER_DEFS: Record<TowerType, { name: string; cost: number; range: number; damage: number; cooldown: number; projSpeed: number; splash: number; slow: number; slowTime: number; color: string; icon: "arrow" | "cannon" | "freeze" }> = {
  arrow: { name: "Стрелок", cost: 50, range: 3.2, damage: 9, cooldown: 0.45, projSpeed: 11, splash: 0, slow: 0, slowTime: 0, color: "#8b5a2b", icon: "arrow" },
  cannon: { name: "Пушка", cost: 120, range: 2.7, damage: 24, cooldown: 1.35, projSpeed: 7, splash: 1.1, slow: 0, slowTime: 0, color: "#3a3a44", icon: "cannon" },
  freeze: { name: "Лёд", cost: 80, range: 2.4, damage: 4, cooldown: 0.6, projSpeed: 9, splash: 0, slow: 0.5, slowTime: 1.6, color: "#5ec8ff", icon: "freeze" },
};

const ENEMY_DEFS: Record<EnemyType, { hp: number; speed: number; reward: number; damage: number; color: string; radius: number }> = {
  grunt: { hp: 60, speed: 1.3, reward: 12, damage: 1, color: "#7a5230", radius: 0.34 },
  fast: { hp: 36, speed: 2.3, reward: 15, damage: 1, color: "#c89060", radius: 0.27 },
  tank: { hp: 240, speed: 0.75, reward: 32, damage: 3, color: "#4a3220", radius: 0.44 },
};

function towerStats(type: TowerType, level: number) {
  const base = TOWER_DEFS[type];
  const dmgMul = Math.pow(1.55, level - 1);
  const rangeMul = Math.pow(1.14, level - 1);
  const cdMul = Math.pow(0.85, level - 1);
  return {
    range: base.range * rangeMul,
    damage: base.damage * dmgMul,
    cooldown: base.cooldown * cdMul,
    splash: base.splash,
    slow: base.slow,
    slowTime: base.slowTime,
    projSpeed: base.projSpeed,
  };
}

function upgradeCost(type: TowerType, level: number): number {
  return Math.floor(TOWER_DEFS[type].cost * (level === 1 ? 0.8 : 1.3));
}

function sellValue(type: TowerType, level: number): number {
  let total = TOWER_DEFS[type].cost;
  for (let l = 1; l < level; l++) total += upgradeCost(type, l);
  return Math.floor(total * 0.6);
}

function waveComposition(n: number): { type: EnemyType; count: number; delay: number }[] {
  const groups: { type: EnemyType; count: number; delay: number }[] = [];
  groups.push({ type: "grunt", count: 5 + n, delay: 0.7 });
  if (n >= 2) groups.push({ type: "fast", count: 2 + Math.floor(n * 0.8), delay: 0.45 });
  if (n >= 4) groups.push({ type: "tank", count: Math.max(1, Math.floor(n * 0.5)), delay: 1.3 });
  if (n >= 6) groups.push({ type: "grunt", count: 6 + n, delay: 0.35 });
  if (n >= 8) groups.push({ type: "fast", count: 6 + n, delay: 0.3 });
  return groups;
}

function buildQueue(n: number): { type: EnemyType; at: number }[] {
  const groups = waveComposition(n);
  const q: { type: EnemyType; at: number }[] = [];
  let t = 0;
  for (const g of groups) {
    for (let i = 0; i < g.count; i++) {
      q.push({ type: g.type, at: t });
      t += g.delay;
    }
    t += 0.5;
  }
  return q;
}

export default function TowerDefense() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const [hud, setHud] = useState({ money: START_MONEY, lives: START_LIVES, wave: 1, breakTimer: 0 });
  const [buildMode, setBuildMode] = useState<TowerType | null>(null);
  const [selected, setSelected] = useState<{
    id: number; type: TowerType; level: number; col: number; row: number;
    upCost: number; sellValue: number; canUpgrade: boolean;
  } | null>(null);
  const [finalWave, setFinalWave] = useState(1);
  const [finalTowers, setFinalTowers] = useState(0);

  const g = useRef<GameState>({
    phase: "ready", money: START_MONEY, lives: START_LIVES, maxLives: START_LIVES,
    wave: 1, totalWaves: TOTAL_WAVES,
    towers: [], enemies: [], projectiles: [], floats: [],
    queue: [], waveTime: 0, breakTimer: 0, nextId: 1,
    buildMode: null, selectedId: 0, hoverCol: -1, hoverRow: -1,
    cell: 32, offX: 0, offY: 0, time: 0, raf: 0, last: 0, hudTimer: 0,
    size: { w: 800, h: 480 },
  });

  const syncSelected = useCallback(() => {
    const s = g.current;
    if (!s.selectedId) { setSelected(null); return; }
    const t = s.towers.find((tw) => tw.id === s.selectedId);
    if (!t) { setSelected(null); return; }
    const canUp = t.level < 3;
    setSelected({
      id: t.id, type: t.type, level: t.level, col: t.col, row: t.row,
      upCost: canUp ? upgradeCost(t.type, t.level) : 0,
      sellValue: sellValue(t.type, t.level),
      canUpgrade: canUp,
    });
  }, []);

  const startGame = useCallback(() => {
    const s = g.current;
    s.phase = "wave-break";
    s.money = START_MONEY;
    s.lives = START_LIVES;
    s.maxLives = START_LIVES;
    s.wave = 1;
    s.towers = []; s.enemies = []; s.projectiles = []; s.floats = [];
    s.queue = [];
    s.waveTime = 0;
    s.breakTimer = BREAK_TIME;
    s.nextId = 1;
    s.buildMode = null;
    s.selectedId = 0;
    s.time = 0;
    setPhase("wave-break");
    setBuildMode(null);
    setSelected(null);
    setHud({ money: s.money, lives: s.lives, wave: s.wave, breakTimer: Math.ceil(s.breakTimer) });
  }, []);

  const startWave = useCallback(() => {
    const s = g.current;
    if (s.phase !== "wave-break") return;
    s.phase = "playing";
    s.queue = buildQueue(s.wave);
    s.waveTime = 0;
    s.breakTimer = 0;
    setPhase("playing");
  }, []);

  const chooseBuild = useCallback((t: TowerType | null) => {
    const s = g.current;
    s.buildMode = t;
    s.selectedId = 0;
    setSelected(null);
    setBuildMode(t);
  }, []);

  const onCanvasPointerMove = useCallback((e: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const s = g.current;
    s.hoverCol = Math.floor((mx - s.offX) / s.cell);
    s.hoverRow = Math.floor((my - s.offY) / s.cell);
  }, []);

  const onCanvasPointerDown = useCallback((e: ReactPointerEvent<HTMLCanvasElement>) => {
    const s = g.current;
    if (s.phase !== "wave-break" && s.phase !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const col = Math.floor((mx - s.offX) / s.cell);
    const row = Math.floor((my - s.offY) / s.cell);
    if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return;
    const existing = s.towers.find((t) => t.col === col && t.row === row);
    if (existing) {
      s.selectedId = existing.id;
      s.buildMode = null;
      setBuildMode(null);
      syncSelected();
      return;
    }
    if (s.buildMode) {
      if (!isBuildable(col, row, s.towers)) return;
      const cost = TOWER_DEFS[s.buildMode].cost;
      if (s.money < cost) return;
      s.money -= cost;
      const tw: Tower = {
        id: s.nextId++,
        col, row, type: s.buildMode, level: 1, cooldown: 0, angle: -Math.PI / 2, flash: 0,
      };
      s.towers.push(tw);
      setHud((h) => ({ ...h, money: s.money }));
      return;
    }
    s.selectedId = 0;
    setSelected(null);
  }, [syncSelected]);

  const upgradeSelected = useCallback(() => {
    const s = g.current;
    const t = s.towers.find((tw) => tw.id === s.selectedId);
    if (!t || t.level >= 3) return;
    const cost = upgradeCost(t.type, t.level);
    if (s.money < cost) return;
    s.money -= cost;
    t.level++;
    setHud((h) => ({ ...h, money: s.money }));
    syncSelected();
  }, [syncSelected]);

  const sellSelected = useCallback(() => {
    const s = g.current;
    const idx = s.towers.findIndex((tw) => tw.id === s.selectedId);
    if (idx < 0) return;
    const t = s.towers[idx];
    s.money += sellValue(t.type, t.level);
    s.towers.splice(idx, 1);
    s.selectedId = 0;
    setHud((h) => ({ ...h, money: s.money }));
    setSelected(null);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const r = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(320, Math.floor(r.width));
      const h = Math.max(240, Math.floor(r.height));
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.current.size.w = w;
      g.current.size.h = h;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const spawnEnemy = (type: EnemyType) => {
      const s = g.current;
      const def = ENEMY_DEFS[type];
      const scale = 1 + (s.wave - 1) * 0.13;
      const hp = def.hp * scale;
      s.enemies.push({
        id: s.nextId++, x: PATH[0].x, y: PATH[0].y,
        hp, maxHp: hp, type, speed: def.speed, target: 1,
        slowTimer: 0, slowFactor: 1, reward: def.reward, damage: def.damage,
        color: def.color, radius: def.radius, dead: false, wobble: Math.random() * Math.PI * 2,
      });
    };

    const enemyProgress = (e: Enemy): number => {
      if (e.target >= PATH.length) return PATH.length;
      const from = PATH[e.target - 1];
      const to = PATH[e.target];
      const segLen = Math.hypot(to.x - from.x, to.y - from.y);
      const covered = Math.hypot(e.x - from.x, e.y - from.y);
      return (e.target - 1) + (segLen > 0 ? covered / segLen : 0);
    };

    const killEnemy = (e: Enemy) => {
      const s = g.current;
      if (e.dead) return;
      e.dead = true;
      s.money += e.reward;
      s.floats.push({ x: e.x, y: e.y, text: "+" + e.reward, life: 1, color: "#ffe23d" });
      const idx = s.enemies.findIndex((n) => n.id === e.id);
      if (idx >= 0) s.enemies.splice(idx, 1);
    };

    const fireTower = (t: Tower) => {
      const s = g.current;
      const stats = towerStats(t.type, t.level);
      const tx = t.col + 0.5, ty = t.row + 0.5;
      let best: Enemy | null = null;
      let bestProg = -1;
      for (const e of s.enemies) {
        if (e.dead) continue;
        const d = Math.hypot(e.x - tx, e.y - ty);
        if (d > stats.range) continue;
        const p = enemyProgress(e);
        if (p > bestProg) { bestProg = p; best = e; }
      }
      if (!best) return;
      t.cooldown = stats.cooldown;
      t.angle = Math.atan2(best.y - ty, best.x - tx);
      t.flash = 0.08;
      const dx = best.x - tx, dy = best.y - ty;
      const d = Math.max(0.001, Math.hypot(dx, dy));
      s.projectiles.push({
        id: s.nextId++,
        x: tx, y: ty,
        vx: (dx / d) * stats.projSpeed,
        vy: (dy / d) * stats.projSpeed,
        targetId: best.id,
        speed: stats.projSpeed,
        damage: stats.damage,
        splash: stats.splash,
        slow: stats.slow,
        slowTime: stats.slowTime,
        type: t.type,
        life: 2.5,
      });
    };

    const update = (dt: number) => {
      const s = g.current;
      s.time += dt;

      if (s.phase === "wave-break") {
        s.breakTimer -= dt;
        if (s.breakTimer <= 0) {
          startWave();
        }
      }

      if (s.phase === "playing") {
        s.waveTime += dt;
        while (s.queue.length > 0 && s.queue[0].at <= s.waveTime) {
          const next = s.queue.shift();
          if (next) spawnEnemy(next.type);
        }
        if (s.queue.length === 0 && s.enemies.length === 0) {
          const bonus = 25 + s.wave * 6;
          s.money += bonus;
          s.floats.push({ x: COLS / 2, y: ROWS / 2, text: "+" + bonus + " за волну", life: 2, color: "#ffe23d" });
          if (s.wave >= s.totalWaves) {
            s.phase = "win";
            setFinalTowers(s.towers.length);
            setPhase("win");
          } else {
            s.wave++;
            s.phase = "wave-break";
            s.breakTimer = BREAK_TIME;
            setPhase("wave-break");
          }
        }
      }

      for (let i = s.enemies.length - 1; i >= 0; i--) {
        const e = s.enemies[i];
        if (e.slowTimer > 0) {
          e.slowTimer -= dt;
          if (e.slowTimer <= 0) e.slowFactor = 1;
        }
        e.wobble += dt * 8;
        const tgt = PATH[e.target];
        if (!tgt) {
          s.lives -= e.damage;
          s.floats.push({ x: COLS - 1, y: ROWS - 1.5, text: "−" + e.damage, life: 1.2, color: "#ff3d6e" });
          s.enemies.splice(i, 1);
          if (s.lives <= 0) {
            s.lives = 0;
            s.phase = "gameover";
            setFinalWave(s.wave);
            setPhase("gameover");
          }
          continue;
        }
        const dx = tgt.x - e.x, dy = tgt.y - e.y;
        const d = Math.hypot(dx, dy);
        const step = e.speed * e.slowFactor * dt;
        if (d <= step) {
          e.x = tgt.x; e.y = tgt.y;
          e.target++;
        } else {
          e.x += (dx / d) * step;
          e.y += (dy / d) * step;
        }
      }

      for (const t of s.towers) {
        if (t.cooldown > 0) t.cooldown -= dt;
        if (t.flash > 0) t.flash -= dt;
        if (s.phase === "playing" && t.cooldown <= 0) fireTower(t);
      }

      for (let i = s.projectiles.length - 1; i >= 0; i--) {
        const p = s.projectiles[i];
        p.life -= dt;
        const target = s.enemies.find((e) => e.id === p.targetId && !e.dead);
        if (target) {
          const dx = target.x - p.x, dy = target.y - p.y;
          const d = Math.max(0.001, Math.hypot(dx, dy));
          p.vx = (dx / d) * p.speed;
          p.vy = (dy / d) * p.speed;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          if (d < 0.35) {
            if (p.splash > 0) {
              for (const e of s.enemies) {
                if (e.dead) continue;
                const ed = Math.hypot(e.x - p.x, e.y - p.y);
                if (ed <= p.splash) {
                  e.hp -= p.damage;
                  if (e.hp <= 0) killEnemy(e);
                }
              }
              s.floats.push({ x: p.x, y: p.y, text: "boom", life: 0.4, color: "#ff9a3d" });
            } else {
              target.hp -= p.damage;
              if (p.slow > 0) {
                target.slowFactor = Math.min(target.slowFactor, p.slow);
                target.slowTimer = Math.max(target.slowTimer, p.slowTime);
              }
              if (target.hp <= 0) killEnemy(target);
            }
            s.projectiles.splice(i, 1);
            continue;
          }
        } else {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
        }
        if (p.life <= 0) s.projectiles.splice(i, 1);
      }

      for (let i = s.floats.length - 1; i >= 0; i--) {
        s.floats[i].life -= dt;
        s.floats[i].y -= dt * 0.6;
        if (s.floats[i].life <= 0) s.floats.splice(i, 1);
      }

      s.hudTimer -= dt;
      if (s.hudTimer <= 0) {
        s.hudTimer = 0.2;
        setHud({
          money: Math.floor(s.money),
          lives: s.lives,
          wave: s.wave,
          breakTimer: Math.max(0, Math.ceil(s.breakTimer)),
        });
      }
    };

    const render = () => {
      const s = g.current;
      const W = s.size.w, H = s.size.h;
      const cell = Math.min(W / COLS, H / ROWS);
      s.cell = cell;
      s.offX = (W - COLS * cell) / 2;
      s.offY = (H - ROWS * cell) / 2;
      const ox = s.offX, oy = s.offY;

      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#1b3a22");
      bg.addColorStop(1, "#0f2618");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const onPath = PATH_CELLS.has(c + "," + r);
          const x = ox + c * cell, y = oy + r * cell;
          if (onPath) {
            ctx.fillStyle = "#6b4a2a";
            ctx.fillRect(x, y, cell, cell);
            ctx.fillStyle = "rgba(0,0,0,0.12)";
            ctx.fillRect(x, y, cell, cell * 0.5);
          } else {
            const checker = (c + r) % 2 === 0;
            ctx.fillStyle = checker ? "#1f4a28" : "#1a4023";
            ctx.fillRect(x, y, cell, cell);
          }
          ctx.strokeStyle = "rgba(0,0,0,0.18)";
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 0.5, y + 0.5, cell - 1, cell - 1);
        }
      }

      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#8a6a3a";
      ctx.lineWidth = cell * 0.62;
      ctx.beginPath();
      for (let i = 0; i < PATH.length; i++) {
        const p = PATH[i];
        const px = ox + p.x * cell, py = oy + p.y * cell;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.strokeStyle = "#c8a06a";
      ctx.lineWidth = cell * 0.5;
      ctx.stroke();

      const spawn = PATH[0];
      const sx = ox + spawn.x * cell, sy = oy + spawn.y * cell;
      ctx.fillStyle = "#ff3d6e";
      ctx.beginPath();
      ctx.arc(sx + cell * 0.6, sy, cell * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffd0d8";
      ctx.font = "bold " + Math.floor(cell * 0.4) + "px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("!", sx + cell * 0.6, sy);

      const damP = PATH[PATH.length - 1];
      const dx = ox + damP.x * cell, dy = oy + damP.y * cell;
      ctx.fillStyle = "#5a3a1a";
      ctx.fillRect(dx - cell * 0.1, dy - cell * 0.5, cell * 0.7, cell);
      for (let k = 0; k < 4; k++) {
        ctx.fillStyle = k % 2 === 0 ? "#7a5022" : "#6a4520";
        ctx.fillRect(dx - cell * 0.1, dy - cell * 0.5 + k * cell * 0.25, cell * 0.7, cell * 0.22);
      }
      ctx.fillStyle = "#3dff8a";
      ctx.fillRect(dx + cell * 0.55, dy - cell * 0.7, cell * 0.06, cell * 0.7);
      ctx.fillStyle = "#3dff8a";
      ctx.beginPath();
      ctx.moveTo(dx + cell * 0.61, dy - cell * 0.7);
      ctx.lineTo(dx + cell * 0.95, dy - cell * 0.55);
      ctx.lineTo(dx + cell * 0.61, dy - cell * 0.4);
      ctx.fill();

      if (s.buildMode && s.hoverCol >= 0 && s.hoverRow >= 0) {
        const col = s.hoverCol, row = s.hoverRow;
        const x = ox + col * cell, y = oy + row * cell;
        const buildable = isBuildable(col, row, s.towers);
        const cost = TOWER_DEFS[s.buildMode].cost;
        const afford = s.money >= cost;
        ctx.fillStyle = buildable && afford ? "rgba(61,255,138,0.25)" : "rgba(255,61,110,0.25)";
        ctx.fillRect(x, y, cell, cell);
        const stats = towerStats(s.buildMode, 1);
        const cx = ox + (col + 0.5) * cell, cy = oy + (row + 0.5) * cell;
        ctx.strokeStyle = buildable && afford ? "rgba(61,255,138,0.8)" : "rgba(255,61,110,0.8)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, stats.range * cell, 0, Math.PI * 2);
        ctx.stroke();
      }

      const sel = s.towers.find((t) => t.id === s.selectedId);
      if (sel) {
        const stats = towerStats(sel.type, sel.level);
        const cx = ox + (sel.col + 0.5) * cell, cy = oy + (sel.row + 0.5) * cell;
        ctx.strokeStyle = "rgba(255,226,61,0.7)";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.arc(cx, cy, stats.range * cell, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      for (const t of s.towers) {
        const cx = ox + (t.col + 0.5) * cell, cy = oy + (t.row + 0.5) * cell;
        const def = TOWER_DEFS[t.type];
        ctx.fillStyle = "#2a1a0e";
        ctx.beginPath();
        ctx.arc(cx, cy, cell * 0.36, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = def.color;
        ctx.beginPath();
        ctx.arc(cx, cy, cell * 0.3, 0, Math.PI * 2);
        ctx.fill();
        if (t.type === "arrow") {
          ctx.strokeStyle = "#d8b070";
          ctx.lineWidth = cell * 0.08;
          ctx.beginPath();
          ctx.arc(cx, cy, cell * 0.22, t.angle - 1, t.angle + 1);
          ctx.stroke();
          ctx.strokeStyle = "#fff0c0";
          ctx.lineWidth = cell * 0.05;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(t.angle) * cell * 0.34, cy + Math.sin(t.angle) * cell * 0.34);
          ctx.stroke();
        } else if (t.type === "cannon") {
          ctx.fillStyle = "#1a1a22";
          ctx.fillRect(cx - cell * 0.06, cy - cell * 0.06, cell * 0.4, cell * 0.12);
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(t.angle);
          ctx.fillStyle = "#26262e";
          ctx.fillRect(0, -cell * 0.09, cell * 0.4, cell * 0.18);
          ctx.restore();
          if (t.flash > 0) {
            ctx.fillStyle = "rgba(255,200,80," + (t.flash / 0.08).toFixed(2) + ")";
            ctx.beginPath();
            ctx.arc(cx + Math.cos(t.angle) * cell * 0.4, cy + Math.sin(t.angle) * cell * 0.4, cell * 0.14, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          ctx.strokeStyle = "#e6faff";
          ctx.lineWidth = cell * 0.06;
          for (let k = 0; k < 3; k++) {
            const a = t.angle + k * Math.PI / 3;
            ctx.beginPath();
            ctx.moveTo(cx - Math.cos(a) * cell * 0.22, cy - Math.sin(a) * cell * 0.22);
            ctx.lineTo(cx + Math.cos(a) * cell * 0.22, cy + Math.sin(a) * cell * 0.22);
            ctx.stroke();
          }
        }
        for (let k = 0; k < t.level; k++) {
          ctx.fillStyle = "#ffe23d";
          ctx.beginPath();
          ctx.arc(cx - cell * 0.18 + k * cell * 0.18, cy + cell * 0.3, cell * 0.05, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      for (const e of s.enemies) {
        const cx = ox + e.x * cell, cy = oy + e.y * cell;
        const rad = e.radius * cell;
        const bob = Math.sin(e.wobble) * rad * 0.08;
        ctx.fillStyle = "#3a2410";
        ctx.beginPath();
        ctx.arc(cx - rad * 0.6, cy - rad * 0.7 + bob, rad * 0.4, 0, Math.PI * 2);
        ctx.arc(cx + rad * 0.6, cy - rad * 0.7 + bob, rad * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.arc(cx, cy + bob, rad, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#f0e8d8";
        ctx.beginPath();
        ctx.ellipse(cx, cy - rad * 0.25 + bob, rad * 0.5, rad * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#1a1a1a";
        ctx.beginPath();
        ctx.arc(cx - rad * 0.25, cy - rad * 0.3 + bob, rad * 0.1, 0, Math.PI * 2);
        ctx.arc(cx + rad * 0.25, cy - rad * 0.3 + bob, rad * 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#3a2410";
        ctx.beginPath();
        ctx.ellipse(cx, cy + rad * 0.1 + bob, rad * 0.18, rad * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();
        if (e.slowTimer > 0) {
          ctx.fillStyle = "rgba(94,200,255,0.35)";
          ctx.beginPath();
          ctx.arc(cx, cy + bob, rad, 0, Math.PI * 2);
          ctx.fill();
        }
        const hpFrac = Math.max(0, e.hp / e.maxHp);
        const bw = rad * 2;
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(cx - bw / 2 - 1, cy - rad - 8 + bob, bw + 2, 4);
        ctx.fillStyle = hpFrac > 0.5 ? "#3dff8a" : hpFrac > 0.25 ? "#ffe23d" : "#ff3d6e";
        ctx.fillRect(cx - bw / 2, cy - rad - 7 + bob, bw * hpFrac, 2);
      }

      for (const p of s.projectiles) {
        const cx = ox + p.x * cell, cy = oy + p.y * cell;
        if (p.type === "arrow") {
          const ang = Math.atan2(p.vy, p.vx);
          ctx.strokeStyle = "#ffe0a0";
          ctx.lineWidth = cell * 0.08;
          ctx.beginPath();
          ctx.moveTo(cx - Math.cos(ang) * cell * 0.2, cy - Math.sin(ang) * cell * 0.2);
          ctx.lineTo(cx + Math.cos(ang) * cell * 0.2, cy + Math.sin(ang) * cell * 0.2);
          ctx.stroke();
        } else if (p.type === "cannon") {
          ctx.fillStyle = "#1a1a1a";
          ctx.beginPath();
          ctx.arc(cx, cy, cell * 0.12, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "rgba(255,200,80,0.4)";
          ctx.beginPath();
          ctx.arc(cx, cy, cell * 0.18, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = "#9fe8ff";
          ctx.beginPath();
          ctx.moveTo(cx, cy - cell * 0.12);
          ctx.lineTo(cx + cell * 0.1, cy);
          ctx.lineTo(cx, cy + cell * 0.12);
          ctx.lineTo(cx - cell * 0.1, cy);
          ctx.closePath();
          ctx.fill();
        }
      }

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const f of s.floats) {
        const cx = ox + f.x * cell, cy = oy + f.y * cell;
        const a = Math.min(1, f.life);
        ctx.globalAlpha = a;
        ctx.fillStyle = f.color;
        ctx.font = "bold " + Math.floor(cell * 0.34) + "px monospace";
        ctx.fillText(f.text, cx, cy);
        ctx.globalAlpha = 1;
      }
    };

    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      update(dt);
      render();
      g.current.raf = requestAnimationFrame(loop);
    };
    g.current.raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(g.current.raf);
      ro.disconnect();
    };
  }, [startWave]);

  const renderTowerButton = (type: TowerType) => {
    const def = TOWER_DEFS[type];
    const active = buildMode === type;
    const Icon = type === "arrow" ? Crosshair : type === "cannon" ? Bomb : Snowflake;
    const afford = hud.money >= def.cost;
    return (
      <button
        key={type}
        onClick={() => chooseBuild(active ? null : type)}
        className={
          "flex flex-col items-center justify-center gap-1 p-2 rounded-lg border transition w-full " +
          (active
            ? "border-amber-300 bg-amber-300/20 text-amber-100"
            : afford
            ? "border-emerald-400/30 bg-black/30 text-emerald-100 hover:bg-black/50"
            : "border-rose-500/30 bg-black/30 text-rose-300/60")
        }
      >
        <Icon size={20} />
        <div className="text-[10px] font-bold leading-none">{def.name}</div>
        <div className={"text-[10px] font-mono flex items-center gap-0.5 " + (afford ? "text-amber-200" : "text-rose-300")}>
          <Coins size={9} /> {def.cost}
        </div>
      </button>
    );
  };

  return (
    <div ref={wrapRef} className="relative w-full h-full overflow-hidden bg-[#0f2618] select-none touch-none flex flex-col">
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-black/40 border-b border-emerald-500/20 shrink-0">
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1 text-amber-200"><Coins size={14} /> {hud.money}</div>
          <div className="flex items-center gap-1 text-rose-200"><Heart size={14} /> {hud.lives}/{START_LIVES}</div>
          <div className="flex items-center gap-1 text-cyan-200"><Shield size={14} /> Волна {hud.wave}/{TOTAL_WAVES}</div>
        </div>
        <div className="text-xs font-mono text-emerald-200">
          {phase === "playing" && <span className="text-rose-300">⚠ Атака!</span>}
          {phase === "wave-break" && <span className="text-amber-200">Подготовка: {hud.breakTimer}с</span>}
        </div>
      </div>

      <div className="relative flex-1 min-h-0">
        <canvas
          ref={canvasRef}
          className="block w-full h-full touch-none"
          onPointerMove={onCanvasPointerMove}
          onPointerDown={onCanvasPointerDown}
        />

        {phase === "wave-break" && (
          <button
            onClick={startWave}
            className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-auto px-5 py-2 rounded-lg bg-gradient-to-r from-amber-400 to-emerald-400 hover:from-amber-300 hover:to-emerald-300 text-black font-bold text-sm flex items-center gap-2 shadow-lg transition"
          >
            <Play size={16} /> Начать волну {hud.wave}
          </button>
        )}

        {phase === "ready" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <div className="max-w-md w-full p-6 rounded-2xl border border-emerald-500/40 bg-gradient-to-b from-[#0a2418] to-[#123028] shadow-[0_0_50px_rgba(60,255,138,0.2)] text-center">
              <div className="flex justify-center mb-3"><Shield className="text-emerald-300" size={44} /></div>
              <h2 className="text-2xl font-bold text-emerald-200 mb-1">Бобр: Защита Плотины</h2>
              <p className="text-emerald-300/80 text-sm mb-4">Барсуки штурмуют плотину бобра! Ставь башни-стражи и отбей все {TOTAL_WAVES} волн.</p>
              <div className="text-left text-xs text-emerald-100/70 space-y-1 mb-5 font-mono">
                <div>Стрелок — дешёвый, быстрый, по одной цели</div>
                <div>Пушка — дорогая, медленная, урон по площади</div>
                <div>Лёд — замедляет врагов</div>
                <div>Клик по башне — улучшение / продажа</div>
                <div>Не дай барсукам разрушить плотину!</div>
              </div>
              <button
                onClick={startGame}
                className="w-full px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-black font-bold flex items-center justify-center gap-2 transition shadow-lg"
              >
                <Play size={18} /> Начать игру
              </button>
            </div>
          </div>
        )}

        {phase === "gameover" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="max-w-md w-full p-6 rounded-2xl border border-rose-500/40 bg-gradient-to-b from-[#1a0410] to-[#2a0a20] shadow-[0_0_50px_rgba(255,60,110,0.25)] text-center">
              <div className="flex justify-center mb-3"><Skull className="text-rose-400" size={44} /></div>
              <h2 className="text-2xl font-bold text-rose-200 mb-2">Плотина разрушена!</h2>
              <p className="text-rose-300/70 text-sm mb-5 font-mono">Вы продержались до волны {finalWave}</p>
              <button
                onClick={startGame}
                className="w-full px-5 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-amber-400 hover:from-rose-400 hover:to-amber-300 text-black font-bold flex items-center justify-center gap-2 transition shadow-lg"
              >
                <RotateCcw size={18} /> Заново
              </button>
            </div>
          </div>
        )}

        {phase === "win" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="max-w-md w-full p-6 rounded-2xl border border-amber-400/50 bg-gradient-to-b from-[#2a2008] to-[#3a2a10] shadow-[0_0_50px_rgba(255,226,61,0.3)] text-center">
              <div className="flex justify-center mb-3"><Trophy className="text-amber-300" size={44} /></div>
              <h2 className="text-2xl font-bold text-amber-200 mb-2">Победа!</h2>
              <p className="text-amber-300/70 text-sm mb-5 font-mono">Плотина устояла! Все волны отбиты.<br />Башен выжило: {finalTowers}</p>
              <button
                onClick={startGame}
                className="w-full px-5 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-emerald-400 hover:from-amber-300 hover:to-emerald-300 text-black font-bold flex items-center justify-center gap-2 transition shadow-lg"
              >
                <RotateCcw size={18} /> Играть снова
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 bg-black/40 border-t border-emerald-500/20 p-2">
        {selected ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-2 flex-1 min-w-0">
              {selected.type === "arrow" ? <Crosshair size={18} className="text-amber-300 shrink-0" /> : selected.type === "cannon" ? <Bomb size={18} className="text-slate-300 shrink-0" /> : <Snowflake size={18} className="text-cyan-300 shrink-0" />}
              <div className="text-xs font-mono text-emerald-100 min-w-0">
                <div className="truncate">{TOWER_DEFS[selected.type].name} · ур. {selected.level}</div>
                <div className="text-emerald-300/60">[{selected.col},{selected.row}]</div>
              </div>
            </div>
            {selected.canUpgrade ? (
              <button
                onClick={upgradeSelected}
                disabled={hud.money < selected.upCost}
                className={
                  "flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition " +
                  (hud.money >= selected.upCost
                    ? "bg-amber-400 hover:bg-amber-300 text-black"
                    : "bg-white/5 text-white/30 cursor-not-allowed")
                }
              >
                <ChevronUp size={14} /> Ур.{selected.level + 1} · <Coins size={11} /> {selected.upCost}
              </button>
            ) : (
              <div className="px-3 py-2 rounded-lg bg-white/5 text-amber-200 text-xs font-bold">МАКС</div>
            )}
            <button
              onClick={sellSelected}
              className="flex items-center gap-1 px-3 py-2 rounded-lg bg-rose-500/80 hover:bg-rose-400 text-white text-xs font-bold transition"
            >
              <X size={14} /> <Coins size={11} /> {selected.sellValue}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {renderTowerButton("arrow")}
            {renderTowerButton("cannon")}
            {renderTowerButton("freeze")}
          </div>
        )}
      </div>
    </div>
  );
}
