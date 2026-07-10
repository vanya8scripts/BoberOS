"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Crosshair, Heart, Zap, Sparkles, Skull, RotateCcw, Play, Target,
} from "lucide-react";

type Phase = "ready" | "playing" | "gameover";
type EnemyType = "grunt" | "fast" | "tank";
type PowerType = "rapid" | "spread" | "heal" | "ammo";

interface Enemy {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  type: EnemyType;
  speed: number;
  radius: number;
  hitFlash: number;
  bob: number;
  color: string;
  value: number;
  damage: number;
}

interface PowerUp {
  id: number;
  x: number;
  y: number;
  type: PowerType;
  life: number;
  bob: number;
}

interface Tracer {
  angle: number;
  life: number;
  hit: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface Proj {
  sx: number;
  syFloor: number;
  depth: number;
  visible: boolean;
}

interface GameState {
  px: number;
  py: number;
  angle: number;
  health: number;
  maxHealth: number;
  ammo: number;
  maxAmmo: number;
  score: number;
  kills: number;
  wave: number;
  weaponLvl: number;
  enemies: Enemy[];
  powerups: PowerUp[];
  tracers: Tracer[];
  particles: Particle[];
  keys: Record<string, boolean>;
  mouseDown: boolean;
  touchFire: boolean;
  lastShot: number;
  rapidUntil: number;
  spreadShots: number;
  muzzle: number;
  waveState: "intro" | "active" | "cleared";
  waveTimer: number;
  toSpawn: number;
  spawnTimer: number;
  zBuffer: Float32Array;
  nextId: number;
  time: number;
  size: { w: number; h: number };
  raf: number;
  phase: Phase;
  shake: number;
  hudTimer: number;
}

const MAP = 16;
const FOV = Math.PI / 3;
const HALF_FOV = FOV / 2;
const EYE = 0.5;
const SHOOT_CD = 280;
const RAPID_CD = 110;
const MAX_DEPTH = 22;

const ENEMY_DEFS: Record<EnemyType, { hp: number; speed: number; radius: number; color: string; value: number; damage: number }> = {
  grunt: { hp: 50, speed: 1.3, radius: 0.35, color: "#ff3df0", value: 50, damage: 10 },
  fast: { hp: 30, speed: 2.1, radius: 0.28, color: "#3df5ff", value: 70, damage: 8 },
  tank: { hp: 160, speed: 0.78, radius: 0.5, color: "#ff9a3d", value: 120, damage: 22 },
};

const POWER_COLORS: Record<PowerType, string> = {
  rapid: "#ffe23d",
  spread: "#3dff8a",
  heal: "#ff3d6e",
  ammo: "#bda6ff",
};

const POWER_LABELS: Record<PowerType, string> = {
  rapid: "Скорострельность!",
  spread: "Раздвой!",
  heal: "Лечение +30",
  ammo: "Патроны +20",
};

function isWallCell(ix: number, iy: number): boolean {
  if (ix < 0 || iy < 0 || ix >= MAP || iy >= MAP) return true;
  if (ix === 0 || iy === 0 || ix === MAP - 1 || iy === MAP - 1) return true;
  return false;
}

function castRay(px: number, py: number, angle: number): { dist: number; side: number } {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let mapX = Math.floor(px);
  let mapY = Math.floor(py);
  const deltaDistX = Math.abs(dx) < 1e-6 ? 1e6 : Math.abs(1 / dx);
  const deltaDistY = Math.abs(dy) < 1e-6 ? 1e6 : Math.abs(1 / dy);
  let stepX: number, stepY: number, sideDistX: number, sideDistY: number;
  if (dx < 0) { stepX = -1; sideDistX = (px - mapX) * deltaDistX; }
  else { stepX = 1; sideDistX = (mapX + 1 - px) * deltaDistX; }
  if (dy < 0) { stepY = -1; sideDistY = (py - mapY) * deltaDistY; }
  else { stepY = 1; sideDistY = (mapY + 1 - py) * deltaDistY; }
  let side = 0;
  let hit = false;
  let guard = 0;
  while (!hit && guard < 80) {
    if (sideDistX < sideDistY) { sideDistX += deltaDistX; mapX += stepX; side = 0; }
    else { sideDistY += deltaDistY; mapY += stepY; side = 1; }
    if (isWallCell(mapX, mapY)) hit = true;
    guard++;
  }
  let dist: number;
  if (side === 0) dist = (mapX - px + (1 - stepX) / 2) / dx;
  else dist = (mapY - py + (1 - stepY) / 2) / dy;
  if (!isFinite(dist) || dist < 0.0001) dist = MAX_DEPTH;
  return { dist: Math.min(dist, MAX_DEPTH), side };
}

function lineOfSight(px: number, py: number, ex: number, ey: number): boolean {
  const d = Math.hypot(ex - px, ey - py);
  const steps = Math.max(1, Math.ceil(d * 4));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = px + (ex - px) * t;
    const y = py + (ey - py) * t;
    if (isWallCell(Math.floor(x), Math.floor(y))) return false;
  }
  return true;
}

export default function Arena3D() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const [hud, setHud] = useState({
    score: 0, health: 100, ammo: 30, wave: 1, weaponLvl: 1,
    rapid: 0, spread: 0, kills: 0,
  });
  const [banner, setBanner] = useState<string>("");
  const [finalStats, setFinalStats] = useState({ score: 0, wave: 1, kills: 0 });

  const g = useRef<GameState>({
    px: 8, py: 8, angle: 0,
    health: 100, maxHealth: 100,
    ammo: 30, maxAmmo: 30,
    score: 0, kills: 0,
    wave: 1, weaponLvl: 1,
    enemies: [], powerups: [], tracers: [], particles: [],
    keys: {}, mouseDown: false, touchFire: false,
    lastShot: 0, rapidUntil: 0, spreadShots: 0, muzzle: 0,
    waveState: "intro", waveTimer: 2.2, toSpawn: 0, spawnTimer: 0,
    zBuffer: new Float32Array(1024),
    nextId: 1, time: 0, size: { w: 800, h: 600 },
    raf: 0, phase: "ready", shake: 0, hudTimer: 0,
  });

  const startGame = useCallback(() => {
    const s = g.current;
    s.px = 8; s.py = 8; s.angle = 0;
    s.health = 100; s.maxHealth = 100;
    s.ammo = 30; s.maxAmmo = 30;
    s.score = 0; s.kills = 0;
    s.wave = 1; s.weaponLvl = 1;
    s.enemies = []; s.powerups = []; s.tracers = []; s.particles = [];
    s.keys = {}; s.mouseDown = false; s.touchFire = false;
    s.lastShot = 0; s.rapidUntil = 0; s.spreadShots = 0; s.muzzle = 0;
    s.waveState = "intro"; s.waveTimer = 2.2; s.toSpawn = 0; s.spawnTimer = 0;
    s.shake = 0; s.time = 0; s.hudTimer = 0;
    s.phase = "playing";
    setPhase("playing");
    setBanner("Волна 1");
    setHud({ score: 0, health: 100, ammo: 30, wave: 1, weaponLvl: 1, rapid: 0, spread: 0, kills: 0 });
  }, []);

  useEffect(() => {
    const bannerTimer = setTimeout(() => setBanner(""), 1600);
    return () => clearTimeout(bannerTimer);
  }, [banner]);

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
      g.current.size.w = canvas.width;
      g.current.size.h = canvas.height;
      if (g.current.zBuffer.length < canvas.width + 4) {
        g.current.zBuffer = new Float32Array(canvas.width + 4);
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const spawnEnemy = (type: EnemyType) => {
      const s = g.current;
      const side = Math.floor(Math.random() * 4);
      const lo = 1.6, hi = MAP - 1.6;
      let x = 0, y = 0;
      if (side === 0) { x = lo + Math.random() * (hi - lo); y = lo; }
      else if (side === 1) { x = hi; y = lo + Math.random() * (hi - lo); }
      else if (side === 2) { x = lo + Math.random() * (hi - lo); y = hi; }
      else { x = lo; y = lo + Math.random() * (hi - lo); }
      const def = ENEMY_DEFS[type];
      const scale = 1 + (s.wave - 1) * 0.08;
      s.enemies.push({
        id: s.nextId++, x, y,
        hp: def.hp * scale, maxHp: def.hp * scale,
        type, speed: def.speed, radius: def.radius,
        hitFlash: 0, bob: Math.random() * Math.PI * 2,
        color: def.color, value: def.value, damage: def.damage,
      });
    };

    const pickEnemyType = (): EnemyType => {
      const s = g.current;
      const r = Math.random();
      if (s.wave >= 5 && r < 0.22) return "tank";
      if (s.wave >= 3 && r < 0.5) return "fast";
      return "grunt";
    };

    const killEnemy = (e: Enemy) => {
      const s = g.current;
      const idx = s.enemies.findIndex((n) => n.id === e.id);
      if (idx >= 0) s.enemies.splice(idx, 1);
      s.score += e.value;
      s.kills++;
      s.shake = Math.min(0.5, s.shake + 0.12);
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 1 + Math.random() * 3;
        s.particles.push({
          x: e.x, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          life: 0.5 + Math.random() * 0.4, maxLife: 0.9,
          color: e.color, size: 0.06 + Math.random() * 0.06,
        });
      }
      if (Math.random() < 0.2) {
        const types: PowerType[] = ["rapid", "spread", "heal", "ammo"];
        const t = types[Math.floor(Math.random() * types.length)];
        s.powerups.push({ id: s.nextId++, x: e.x, y: e.y, type: t, life: 9, bob: 0 });
      }
    };

    const applyPowerup = (p: PowerUp) => {
      const s = g.current;
      if (p.type === "rapid") s.rapidUntil = s.time * 1000 + 7000;
      else if (p.type === "spread") s.spreadShots += 6;
      else if (p.type === "heal") s.health = Math.min(s.maxHealth, s.health + 30);
      else if (p.type === "ammo") s.ammo = Math.min(s.maxAmmo, s.ammo + 20);
      setBanner(POWER_LABELS[p.type]);
      for (let i = 0; i < 12; i++) {
        const a = Math.random() * Math.PI * 2;
        s.particles.push({
          x: p.x, y: p.y, vx: Math.cos(a) * 2, vy: Math.sin(a) * 2,
          life: 0.5, maxLife: 0.5, color: POWER_COLORS[p.type], size: 0.08,
        });
      }
    };

    const shoot = () => {
      const s = g.current;
      if (s.phase !== "playing") return;
      const now = s.time * 1000;
      const cd = now < s.rapidUntil ? RAPID_CD : SHOOT_CD;
      if (now - s.lastShot < cd) return;
      if (s.ammo <= 0) return;
      s.lastShot = now;
      s.ammo--;
      s.muzzle = 0.07;
      const offsets = s.spreadShots > 0 ? [-0.13, 0, 0.13] : [0];
      if (s.spreadShots > 0) s.spreadShots--;
      for (const off of offsets) {
        const ang = s.angle + off;
        const tr: Tracer = { angle: ang, life: 0.09, hit: false };
        s.tracers.push(tr);
        let best: Enemy | null = null;
        let bestD = Infinity;
        for (const e of s.enemies) {
          const dx = e.x - s.px, dy = e.y - s.py;
          const d = Math.hypot(dx, dy);
          if (d > 14 || d < 0.05) continue;
          const ea = Math.atan2(dy, dx);
          let da = ea - ang;
          while (da > Math.PI) da -= Math.PI * 2;
          while (da < -Math.PI) da += Math.PI * 2;
          const thr = Math.atan2(e.radius, d) + 0.03;
          if (Math.abs(da) < thr && d < bestD && lineOfSight(s.px, s.py, e.x, e.y)) {
            best = e; bestD = d;
          }
        }
        if (best) {
          const dmg = 22 * s.weaponLvl;
          best.hp -= dmg;
          best.hitFlash = 0.12;
          tr.hit = true;
          for (let i = 0; i < 5; i++) {
            const a = Math.random() * Math.PI * 2;
            s.particles.push({
              x: best.x, y: best.y, vx: Math.cos(a) * 1.5, vy: Math.sin(a) * 1.5,
              life: 0.3, maxLife: 0.3, color: "#ffffff", size: 0.05,
            });
          }
          if (best.hp <= 0) killEnemy(best);
        }
      }
    };

    const project = (wx: number, wy: number, W: number, H: number): Proj => {
      const s = g.current;
      const dx = wx - s.px, dy = wy - s.py;
      const dirX = Math.cos(s.angle), dirY = Math.sin(s.angle);
      const planeLen = Math.tan(HALF_FOV);
      const planeX = -dirY * planeLen, planeY = dirX * planeLen;
      const det = planeX * dirY - dirX * planeY;
      if (Math.abs(det) < 1e-6) return { sx: 0, syFloor: 0, depth: 0, visible: false };
      const invDet = 1 / det;
      const transformX = invDet * (dirY * dx - dirX * dy);
      const transformY = invDet * (-planeY * dx + planeX * dy);
      if (transformY <= 0.05) return { sx: 0, syFloor: 0, depth: 0, visible: false };
      const sx = (W / 2) * (1 + transformX / transformY);
      const syFloor = H / 2 + (H / 2) * (EYE / transformY);
      return { sx, syFloor, depth: transformY, visible: true };
    };

    const drawFloorGrid = (W: number, H: number) => {
      const s = g.current;
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(60,200,255,0.12)";
      for (let i = 1; i < MAP; i++) {
        ctx.beginPath();
        let first = true;
        for (let j = 0; j <= MAP; j += 0.5) {
          const pr = project(i, j, W, H);
          if (pr.visible) {
            if (first) { ctx.moveTo(pr.sx, pr.syFloor); first = false; }
            else ctx.lineTo(pr.sx, pr.syFloor);
          } else first = true;
        }
        ctx.stroke();
        ctx.beginPath();
        first = true;
        for (let j = 0; j <= MAP; j += 0.5) {
          const pr = project(j, i, W, H);
          if (pr.visible) {
            if (first) { ctx.moveTo(pr.sx, pr.syFloor); first = false; }
            else ctx.lineTo(pr.sx, pr.syFloor);
          } else first = true;
        }
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(255,60,240,0.22)";
      ctx.beginPath();
      let first = true;
      for (let j = 0; j <= MAP; j += 0.5) {
        const pr = project(j, j, W, H);
        if (pr.visible) {
          if (first) { ctx.moveTo(pr.sx, pr.syFloor); first = false; }
          else ctx.lineTo(pr.sx, pr.syFloor);
        } else first = true;
      }
      ctx.stroke();
    };

    const drawEnemy = (e: Enemy, W: number, H: number) => {
      const s = g.current;
      const pr = project(e.x, e.y, W, H);
      if (!pr.visible) return;
      const depth = pr.depth;
      const topZ = 0.85;
      const syFloor = pr.syFloor;
      const syTop = H / 2 + (H / 2) * ((EYE - topZ) / depth);
      const height = syFloor - syTop;
      if (height < 1) return;
      const width = height * 0.72;
      const cx = pr.sx;
      const cy = (syFloor + syTop) / 2;
      const halfW = width / 2;
      const startX = Math.max(0, Math.floor(cx - halfW));
      const endX = Math.min(W - 1, Math.ceil(cx + halfW));
      const flash = e.hitFlash > 0 ? Math.min(1, e.hitFlash / 0.12) : 0;
      const bobOff = Math.sin(e.bob) * height * 0.04;
      for (let x = startX; x <= endX; x++) {
        if (s.zBuffer[x] <= depth) continue;
        const o = (x - cx) / halfW;
        if (Math.abs(o) > 1) continue;
        const sliceH = height * Math.sqrt(1 - o * o);
        const top = cy - sliceH / 2 + bobOff;
        ctx.fillStyle = e.color;
        ctx.fillRect(x, top, 1, sliceH);
        if (flash > 0) {
          ctx.fillStyle = "rgba(255,255,255," + (flash * 0.8).toFixed(3) + ")";
          ctx.fillRect(x, top, 1, sliceH);
        }
      }
      const barW = Math.max(8, width);
      const barX = cx - barW / 2;
      const barY = syTop - 8 + bobOff;
      const hpFrac = Math.max(0, e.hp / e.maxHp);
      const zc = Math.floor(cx);
      if (zc >= 0 && zc < W && s.zBuffer[zc] > depth) {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(barX - 1, barY - 1, barW + 2, 5);
        ctx.fillStyle = hpFrac > 0.5 ? "#3dff8a" : hpFrac > 0.25 ? "#ffe23d" : "#ff3d6e";
        ctx.fillRect(barX, barY, barW * hpFrac, 3);
      }
    };

    const drawPower = (p: PowerUp, W: number, H: number) => {
      const s = g.current;
      const pr = project(p.x, p.y, W, H);
      if (!pr.visible) return;
      const depth = pr.depth;
      const sz = Math.max(2, (H * 0.5) / depth * 0.32);
      const cx = pr.sx;
      const cy = H / 2 + (H / 2) * ((EYE - 0.5) / depth) + Math.sin(p.bob) * sz * 0.25;
      const zc = Math.floor(cx);
      if (zc >= 0 && zc < W && s.zBuffer[zc] <= depth) return;
      const col = POWER_COLORS[p.type];
      const blink = p.life < 3 ? (Math.sin(p.life * 10) > 0 ? 1 : 0.35) : 1;
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, sz);
      grd.addColorStop(0, col);
      grd.addColorStop(0.55, col);
      grd.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = blink;
      ctx.fillStyle = grd;
      ctx.fillRect(cx - sz, cy - sz, sz * 2, sz * 2);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#0a0418";
      ctx.fillRect(cx - sz * 0.14, cy - sz * 0.4, sz * 0.28, sz * 0.8);
    };

    const drawParticle = (pt: Particle, W: number, H: number) => {
      const s = g.current;
      const pr = project(pt.x, pt.y, W, H);
      if (!pr.visible) return;
      const depth = pr.depth;
      const sz = Math.max(1, (H * 0.5) / depth * pt.size * 2);
      const cx = pr.sx;
      const cy = H / 2 + (H / 2) * ((EYE - 0.35) / depth);
      const zc = Math.floor(cx);
      if (zc >= 0 && zc < W && s.zBuffer[zc] <= depth) return;
      const a = Math.max(0, pt.life / pt.maxLife);
      ctx.globalAlpha = a;
      ctx.fillStyle = pt.color;
      ctx.fillRect(cx - sz / 2, cy - sz / 2, sz, sz);
      ctx.globalAlpha = 1;
    };

    const render = () => {
      const s = g.current;
      const W = s.size.w, H = s.size.h;
      const shakeX = s.shake > 0 ? (Math.random() - 0.5) * s.shake * 26 : 0;
      const shakeY = s.shake > 0 ? (Math.random() - 0.5) * s.shake * 26 : 0;

      ctx.save();
      ctx.translate(shakeX, shakeY);

      const cg = ctx.createLinearGradient(0, 0, 0, H / 2);
      cg.addColorStop(0, "#06030f");
      cg.addColorStop(1, "#180a36");
      ctx.fillStyle = cg;
      ctx.fillRect(-40, -40, W + 80, H / 2 + 40);

      const fg = ctx.createLinearGradient(0, H / 2, 0, H);
      fg.addColorStop(0, "#0a0420");
      fg.addColorStop(1, "#22082e");
      ctx.fillStyle = fg;
      ctx.fillRect(-40, H / 2, W + 80, H / 2 + 40);

      drawFloorGrid(W, H);

      const step = 2;
      const dirX = Math.cos(s.angle), dirY = Math.sin(s.angle);
      const planeLen = Math.tan(HALF_FOV);
      const planeX = -dirY * planeLen, planeY = dirX * planeLen;
      for (let x = 0; x < W; x += step) {
        const camX = 2 * x / W - 1;
        const rayX = dirX + planeX * camX;
        const rayY = dirY + planeY * camX;
        const ang = Math.atan2(rayY, rayX);
        const r = castRay(s.px, s.py, ang);
        const perp = r.dist * Math.cos(ang - s.angle);
        for (let k = 0; k < step && x + k < W; k++) s.zBuffer[x + k] = perp;
        const lineH = H / Math.max(0.02, perp);
        const top = H / 2 - lineH / 2;
        const base = r.side === 0 ? [86, 24, 132] : [64, 18, 108];
        const fade = Math.max(0, Math.min(1, 1 - perp / 18));
        const rr = Math.floor(base[0] * fade + 10);
        const gg = Math.floor(base[1] * fade + 6);
        const bb = Math.floor(base[2] * fade + 22);
        ctx.fillStyle = "rgb(" + rr + "," + gg + "," + bb + ")";
        ctx.fillRect(x, top, step, lineH);
        const edgeH = Math.min(8, lineH * 0.06);
        ctx.fillStyle = "rgba(120,230,255," + (0.4 * fade).toFixed(3) + ")";
        ctx.fillRect(x, top, step, edgeH);
        ctx.fillRect(x, top + lineH - edgeH, step, edgeH);
      }

      const drawables: { depth: number; draw: () => void }[] = [];
      for (const e of s.enemies) {
        const pr = project(e.x, e.y, W, H);
        if (pr.visible) drawables.push({ depth: pr.depth, draw: () => drawEnemy(e, W, H) });
      }
      for (const p of s.powerups) {
        const pr = project(p.x, p.y, W, H);
        if (pr.visible) drawables.push({ depth: pr.depth, draw: () => drawPower(p, W, H) });
      }
      for (const pt of s.particles) {
        const pr = project(pt.x, pt.y, W, H);
        if (pr.visible) drawables.push({ depth: pr.depth, draw: () => drawParticle(pt, W, H) });
      }
      drawables.sort((a, b) => b.depth - a.depth);
      for (const d of drawables) d.draw();

      for (const tr of s.tracers) {
        const ex = s.px + Math.cos(tr.angle) * 14;
        const ey = s.py + Math.sin(tr.angle) * 14;
        const a = project(s.px + Math.cos(tr.angle) * 0.4, s.py + Math.sin(tr.angle) * 0.4, W, H);
        const b = project(ex, ey, W, H);
        if (a.visible && b.visible) {
          ctx.strokeStyle = tr.hit
            ? "rgba(255,240,150," + Math.min(1, tr.life * 11).toFixed(3) + ")"
            : "rgba(180,255,255," + Math.min(1, tr.life * 11).toFixed(3) + ")";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(a.sx, a.syFloor - H * 0.06);
          ctx.lineTo(b.sx, b.syFloor - H * 0.06);
          ctx.stroke();
        }
      }

      if (s.muzzle > 0) {
        const a = s.muzzle / 0.07;
        const grd = ctx.createRadialGradient(W / 2, H * 0.72, 0, W / 2, H * 0.72, H * 0.45);
        grd.addColorStop(0, "rgba(255,240,180," + (0.55 * a).toFixed(3) + ")");
        grd.addColorStop(1, "rgba(255,240,180,0)");
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, W, H);
      }

      ctx.restore();

      const cx = W / 2, cy = H / 2;
      const rapid = s.time * 1000 < s.rapidUntil;
      const cc = rapid ? "#ffe23d" : "#3dff8a";
      ctx.strokeStyle = cc;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 16, cy); ctx.lineTo(cx - 6, cy);
      ctx.moveTo(cx + 6, cy); ctx.lineTo(cx + 16, cy);
      ctx.moveTo(cx, cy - 16); ctx.lineTo(cx, cy - 6);
      ctx.moveTo(cx, cy + 6); ctx.lineTo(cx, cy + 16);
      ctx.stroke();
      ctx.fillStyle = cc;
      ctx.fillRect(cx - 1.5, cy - 1.5, 3, 3);

      const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.78);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(0,0,0,0.55)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);
    };

    const update = (dt: number) => {
      const s = g.current;
      if (s.phase !== "playing") return;
      s.time += dt;

      const rotSpeed = 2.6;
      if (s.keys["arrowleft"] || s.keys["a"]) s.angle -= rotSpeed * dt;
      if (s.keys["arrowright"] || s.keys["d"]) s.angle += rotSpeed * dt;
      while (s.angle < 0) s.angle += Math.PI * 2;
      while (s.angle >= Math.PI * 2) s.angle -= Math.PI * 2;

      if (s.keys[" "] || s.mouseDown || s.touchFire) shoot();

      if (s.muzzle > 0) s.muzzle -= dt;
      if (s.shake > 0) s.shake = Math.max(0, s.shake - dt);

      if (s.waveState === "intro") {
        s.waveTimer -= dt;
        if (s.waveTimer <= 0) {
          s.waveState = "active";
          s.toSpawn = 4 + s.wave * 2;
          s.spawnTimer = 0;
        }
      } else if (s.waveState === "active") {
        s.spawnTimer -= dt;
        if (s.toSpawn > 0 && s.spawnTimer <= 0) {
          spawnEnemy(pickEnemyType());
          s.toSpawn--;
          s.spawnTimer = Math.max(0.35, 0.85 - s.wave * 0.03);
        }
        if (s.toSpawn === 0 && s.enemies.length === 0) {
          s.waveState = "cleared";
          s.waveTimer = 3.2;
          s.score += 100 * s.wave;
          setBanner("Волна " + s.wave + " зачищена!");
          if (s.wave % 3 === 0) s.weaponLvl++;
        }
      } else if (s.waveState === "cleared") {
        s.waveTimer -= dt;
        if (s.waveTimer <= 0) {
          s.wave++;
          s.waveState = "intro";
          s.waveTimer = 2.2;
          s.ammo = Math.min(s.maxAmmo, s.ammo + 10);
          setBanner("Волна " + s.wave);
        }
      }

      for (let i = s.enemies.length - 1; i >= 0; i--) {
        const e = s.enemies[i];
        const dx = s.px - e.x, dy = s.py - e.y;
        const d = Math.hypot(dx, dy);
        if (d < 0.6) {
          s.health -= e.damage;
          s.shake = Math.min(0.6, s.shake + 0.25);
          for (let k = 0; k < 12; k++) {
            const a = Math.random() * Math.PI * 2;
            s.particles.push({
              x: e.x, y: e.y, vx: Math.cos(a) * 2.5, vy: Math.sin(a) * 2.5,
              life: 0.5, maxLife: 0.5, color: e.color, size: 0.07,
            });
          }
          s.enemies.splice(i, 1);
          if (s.health <= 0) {
            s.health = 0;
            s.phase = "gameover";
            setFinalStats({ score: Math.floor(s.score), wave: s.wave, kills: s.kills });
            setPhase("gameover");
          }
          continue;
        }
        const mv = e.speed * dt;
        e.x += (dx / d) * mv;
        e.y += (dy / d) * mv;
        e.bob += dt * 6;
        if (e.hitFlash > 0) e.hitFlash -= dt;
      }

      for (let i = s.powerups.length - 1; i >= 0; i--) {
        const p = s.powerups[i];
        p.life -= dt;
        p.bob += dt * 4;
        const dx = s.px - p.x, dy = s.py - p.y;
        const d = Math.hypot(dx, dy);
        if (d < 0.6) {
          applyPowerup(p);
          s.powerups.splice(i, 1);
          continue;
        }
        if (d > 0.001) {
          const pull = 1.3 * dt;
          p.x += (dx / d) * pull;
          p.y += (dy / d) * pull;
        }
        if (p.life <= 0) s.powerups.splice(i, 1);
      }

      for (let i = s.tracers.length - 1; i >= 0; i--) {
        s.tracers[i].life -= dt;
        if (s.tracers[i].life <= 0) s.tracers.splice(i, 1);
      }

      for (let i = s.particles.length - 1; i >= 0; i--) {
        const pt = s.particles[i];
        pt.life -= dt;
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.vx *= 0.92; pt.vy *= 0.92;
        if (pt.life <= 0) s.particles.splice(i, 1);
      }

      s.hudTimer -= dt;
      if (s.hudTimer <= 0) {
        s.hudTimer = 0.15;
        const now = s.time * 1000;
        setHud({
          score: Math.floor(s.score),
          health: Math.max(0, Math.floor(s.health)),
          ammo: s.ammo,
          wave: s.wave,
          weaponLvl: s.weaponLvl,
          rapid: now < s.rapidUntil ? Math.ceil((s.rapidUntil - now) / 1000) : 0,
          spread: s.spreadShots,
          kills: s.kills,
        });
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

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === " " || k === "arrowleft" || k === "arrowright" || k === "arrowup" || k === "arrowdown") {
        e.preventDefault();
      }
      g.current.keys[k] = true;
      if (k === " ") g.current.keys[" "] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      g.current.keys[k] = false;
      if (k === " ") g.current.keys[" "] = false;
    };
    const onMouseDown = () => { g.current.mouseDown = true; };
    const onMouseUp = () => { g.current.mouseDown = false; };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    return () => {
      cancelAnimationFrame(g.current.raf);
      ro.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const setKey = (k: string, v: boolean) => { g.current.keys[k] = v; };
  const btnClass =
    "pointer-events-auto select-none flex items-center justify-center rounded-full bg-white/10 backdrop-blur-sm border border-cyan-300/30 text-cyan-100 font-bold active:bg-cyan-400/40 transition touch-none";

  return (
    <div ref={wrapRef} className="relative w-full h-full overflow-hidden bg-[#05030f] select-none touch-none">
      <canvas ref={canvasRef} className="block w-full h-full" />

      {phase === "playing" && (
        <>
          <div className="absolute top-0 left-0 right-0 p-3 flex items-start justify-between gap-3 pointer-events-none">
            <div className="flex flex-col gap-1 font-mono text-xs">
              <div className="text-cyan-300">СЧЁТ: <span className="text-white">{hud.score}</span></div>
              <div className="text-fuchsia-300">ВОЛНА: <span className="text-white">{hud.wave}</span></div>
            </div>
            <div className="flex flex-col items-end gap-1 font-mono text-xs">
              <div className="text-amber-300 flex items-center gap-1"><Target size={12} /> ОРУЖИЕ Mk{hud.weaponLvl}</div>
              <div className="text-cyan-300">УБИЙСТВА: <span className="text-white">{hud.kills}</span></div>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-3 flex items-end justify-between gap-3 pointer-events-none">
            <div className="flex flex-col gap-1 w-36 sm:w-44">
              <div className="flex items-center gap-1 text-rose-300 text-xs font-mono"><Heart size={12} /> {hud.health}</div>
              <div className="h-2 bg-black/60 rounded overflow-hidden border border-rose-500/40">
                <div className="h-full bg-gradient-to-r from-rose-600 to-rose-400 transition-all" style={{ width: Math.max(0, hud.health) + "%" }} />
              </div>
            </div>
            <div className="flex flex-col items-center gap-1 font-mono text-xs">
              {hud.rapid > 0 && <div className="text-amber-300 flex items-center gap-1"><Zap size={12} /> {hud.rapid}с</div>}
              {hud.spread > 0 && <div className="text-emerald-300 flex items-center gap-1"><Sparkles size={12} /> x{hud.spread}</div>}
            </div>
            <div className="flex flex-col items-end gap-1 w-36 sm:w-44">
              <div className="flex items-center gap-1 text-cyan-300 text-xs font-mono"><Crosshair size={12} /> {hud.ammo}</div>
              <div className="h-2 w-full bg-black/60 rounded overflow-hidden border border-cyan-500/40">
                <div className="h-full bg-gradient-to-r from-cyan-500 to-cyan-300 transition-all" style={{ width: Math.min(100, (hud.ammo / 30) * 100) + "%" }} />
              </div>
            </div>
          </div>

          <div className="absolute bottom-20 left-3 flex gap-2">
            <button
              className={btnClass + " w-12 h-12 text-xl"}
              onPointerDown={(e) => { e.preventDefault(); setKey("arrowleft", true); }}
              onPointerUp={() => setKey("arrowleft", false)}
              onPointerLeave={() => setKey("arrowleft", false)}
              onPointerCancel={() => setKey("arrowleft", false)}
              aria-label="Поворот влево"
            >◀</button>
            <button
              className={btnClass + " w-12 h-12 text-xl"}
              onPointerDown={(e) => { e.preventDefault(); setKey("arrowright", true); }}
              onPointerUp={() => setKey("arrowright", false)}
              onPointerLeave={() => setKey("arrowright", false)}
              onPointerCancel={() => setKey("arrowright", false)}
              aria-label="Поворот вправо"
            >▶</button>
          </div>
          <button
            className={btnClass + " absolute bottom-20 right-3 w-20 h-20 text-sm"}
            onPointerDown={(e) => { e.preventDefault(); g.current.touchFire = true; }}
            onPointerUp={() => { g.current.touchFire = false; }}
            onPointerLeave={() => { g.current.touchFire = false; }}
            onPointerCancel={() => { g.current.touchFire = false; }}
            aria-label="Огонь"
          >ОГОНЬ</button>

          {banner && (
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 pointer-events-none">
              <div className="px-6 py-2 rounded-lg bg-black/40 border border-cyan-400/40 text-cyan-100 text-2xl font-bold tracking-wide font-mono shadow-[0_0_30px_rgba(60,200,255,0.4)]">
                {banner}
              </div>
            </div>
          )}
        </>
      )}

      {phase === "ready" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="max-w-md w-full p-6 rounded-2xl border border-cyan-500/40 bg-gradient-to-b from-[#0a0420] to-[#1a0a36] shadow-[0_0_50px_rgba(60,200,255,0.25)] text-center">
            <div className="flex justify-center mb-3"><Crosshair className="text-cyan-300" size={44} /></div>
            <h2 className="text-2xl font-bold text-cyan-200 mb-1">Бобр: Арена 3D</h2>
            <p className="text-fuchsia-300/80 text-sm mb-4">Бобр-стрелок в центре неоновой арены. Отбивай бесконечные волны врагов!</p>
            <div className="text-left text-xs text-cyan-100/70 space-y-1 mb-5 font-mono">
              <div>◀ ▶ или A / D — поворот</div>
              <div>Пробел / ЛКМ — выстрел</div>
              <div>Бонусы: скорострельность, раздвой, лечение, патроны</div>
              <div>Каждые 3 волны — улучшение оружия</div>
            </div>
            <button
              onClick={startGame}
              className="w-full px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 hover:from-cyan-300 hover:to-fuchsia-400 text-black font-bold flex items-center justify-center gap-2 transition shadow-lg"
            >
              <Play size={18} /> Начать бой
            </button>
          </div>
        </div>
      )}

      {phase === "gameover" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="max-w-md w-full p-6 rounded-2xl border border-rose-500/40 bg-gradient-to-b from-[#1a0410] to-[#2a0a20] shadow-[0_0_50px_rgba(255,60,110,0.25)] text-center">
            <div className="flex justify-center mb-3"><Skull className="text-rose-400" size={44} /></div>
            <h2 className="text-2xl font-bold text-rose-200 mb-4">Поражение</h2>
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div>
                <div className="text-[10px] text-rose-300/60 font-mono">СЧЁТ</div>
                <div className="text-xl font-bold text-rose-100">{finalStats.score}</div>
              </div>
              <div>
                <div className="text-[10px] text-rose-300/60 font-mono">ВОЛНА</div>
                <div className="text-xl font-bold text-rose-100">{finalStats.wave}</div>
              </div>
              <div>
                <div className="text-[10px] text-rose-300/60 font-mono">УБИЙСТВА</div>
                <div className="text-xl font-bold text-rose-100">{finalStats.kills}</div>
              </div>
            </div>
            <button
              onClick={startGame}
              className="w-full px-5 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-amber-400 hover:from-rose-400 hover:to-amber-300 text-black font-bold flex items-center justify-center gap-2 transition shadow-lg"
            >
              <RotateCcw size={18} /> Заново
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
