"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Heart, RotateCcw, Shield, Skull, Target, Trophy } from "lucide-react";

type GameState = "ready" | "playing" | "win" | "lose";
type Dir = 0 | 1 | 2 | 3;
type EnemyKind = "basic" | "fast" | "power";

interface Tank {
  x: number; y: number; dir: Dir; speed: number;
  shootCd: number; isPlayer: boolean; color: string;
  kind: "player" | EnemyKind; aiTimer: number;
  alive: boolean; spawnFlash: number;
}

interface Bullet {
  x: number; y: number; dir: Dir;
  owner: "player" | "enemy"; dead: boolean;
}

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; color: string; size: number;
}

interface HudState {
  score: number; lives: number; wave: number;
  totalWaves: number; enemiesLeft: number; baseAlive: boolean;
}

interface GameData {
  grid: number[][];
  baseX: number; baseY: number; baseAlive: boolean;
  player: Tank;
  enemies: Tank[];
  bullets: Bullet[];
  particles: Particle[];
  keys: Set<string>;
  score: number; lives: number;
  spawnedTotal: number; killedTotal: number;
  spawnTimer: number; spawnIdx: number;
  state: GameState; lastTime: number;
  flashTime: number; shakeTime: number;
}

const N = 13;
const TANK_SIZE = 0.92;
const BULLET_SIZE = 0.28;
const PLAYER_SPEED = 0.05;
const BULLET_SPEED = 0.2;
const PLAYER_SHOOT_CD = 22;
const PLAYER_LIVES = 3;
const TOTAL_WAVES = 3;
const ENEMIES_PER_WAVE = 4;
const WIN_KILLS = TOTAL_WAVES * ENEMIES_PER_WAVE;
const MAX_ON_SCREEN = 4;
const SPAWN_DELAY = 90;
const SPAWN_FLASH = 50;

const LEVEL_STR: string[] = [
  ".............",
  ".BB.B.S.B.BB.",
  ".............",
  ".BB.......BB.",
  ".B..B...B..B.",
  "...S.BBB.S...",
  ".............",
  "...S.BBB.S...",
  ".B..B...B..B.",
  ".BB.......BB.",
  ".............",
  ".....BBB.....",
  "....BBDBB....",
];

const ENEMY_SPAWNS: { x: number; y: number }[] = [
  { x: 0, y: 0 }, { x: 6, y: 0 }, { x: 12, y: 0 },
];

const PLAYER_SPAWN = { x: 1, y: 12 };

function parseLevel(): { grid: number[][]; baseX: number; baseY: number } {
  const grid: number[][] = [];
  let baseX = 6, baseY = 12;
  for (let r = 0; r < LEVEL_STR.length; r++) {
    const row: number[] = [];
    for (let c = 0; c < LEVEL_STR[r].length; c++) {
      const ch = LEVEL_STR[r][c];
      if (ch === "B") row.push(1);
      else if (ch === "S") row.push(2);
      else if (ch === "D") { row.push(4); baseX = c; baseY = r; }
      else row.push(0);
    }
    grid.push(row);
  }
  return { grid, baseX, baseY };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function canMoveTo(grid: number[][], x: number, y: number, size: number, tanks: Tank[], self: Tank): boolean {
  const c0 = Math.floor(x + 0.001);
  const c1 = Math.floor(x + size - 0.001);
  const r0 = Math.floor(y + 0.001);
  const r1 = Math.floor(y + size - 0.001);
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      if (r < 0 || r >= N || c < 0 || c >= N) return false;
      if (grid[r][c] !== 0) return false;
    }
  }
  for (const t of tanks) {
    if (t === self || !t.alive) continue;
    if (x < t.x + TANK_SIZE && x + size > t.x && y < t.y + TANK_SIZE && y + size > t.y) return false;
  }
  return true;
}

function tryMove(tank: Tank, dir: Dir, dt: number, grid: number[][], tanks: Tank[]): boolean {
  if (dir !== tank.dir) {
    if (dir === 0 || dir === 2) tank.x = Math.round(tank.x);
    else tank.y = Math.round(tank.y);
  }
  tank.dir = dir;
  let nx = tank.x, ny = tank.y;
  const step = tank.speed * dt;
  if (dir === 0) ny -= step;
  else if (dir === 1) nx += step;
  else if (dir === 2) ny += step;
  else nx -= step;
  if (canMoveTo(grid, nx, ny, TANK_SIZE, tanks, tank)) {
    tank.x = nx; tank.y = ny;
    return true;
  }
  if (dir === 0 || dir === 2) tank.y = Math.round(tank.y);
  else tank.x = Math.round(tank.x);
  return false;
}

function fireBullet(tank: Tank, bullets: Bullet[]): void {
  let bx = tank.x + TANK_SIZE / 2, by = tank.y + TANK_SIZE / 2;
  if (tank.dir === 0) by = tank.y - BULLET_SIZE;
  else if (tank.dir === 1) bx = tank.x + TANK_SIZE;
  else if (tank.dir === 2) by = tank.y + TANK_SIZE;
  else bx = tank.x - BULLET_SIZE;
  bullets.push({
    x: bx, y: by, dir: tank.dir,
    owner: tank.isPlayer ? "player" : "enemy", dead: false,
  });
}

function spawnExplosion(particles: Particle[], cx: number, cy: number, color: string, count: number): void {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 0.5 + Math.random() * 1.5;
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 300 + Math.random() * 300, maxLife: 600,
      color, size: 2 + Math.random() * 3,
    });
  }
}

function updateParticles(particles: Particle[], dtMs: number): void {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dtMs * 0.05;
    p.y += p.vy * dtMs * 0.05;
    p.vx *= 0.92; p.vy *= 0.92;
    p.life -= dtMs;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function pickEnemyDir(e: Tank, grid: number[][], tanks: Tank[], target: { x: number; y: number }): Dir {
  const dx = target.x - e.x;
  const dy = target.y - e.y;
  const pref: Dir = Math.abs(dx) > Math.abs(dy)
    ? (dx > 0 ? 1 : 3)
    : (dy > 0 ? 2 : 0);
  const order: number[] = [pref, (pref + 1) % 4, (pref + 3) % 4, (pref + 2) % 4];
  for (const d of order) {
    let nx = e.x, ny = e.y;
    const step = e.speed * 4;
    if (d === 0) ny -= step;
    else if (d === 1) nx += step;
    else if (d === 2) ny += step;
    else nx -= step;
    if (canMoveTo(grid, nx, ny, TANK_SIZE, tanks, e)) return d as Dir;
  }
  return e.dir;
}

function makePlayer(): Tank {
  return {
    x: PLAYER_SPAWN.x, y: PLAYER_SPAWN.y, dir: 0,
    speed: PLAYER_SPEED, shootCd: 0, isPlayer: true,
    color: "#c46a28", kind: "player", aiTimer: 0,
    alive: true, spawnFlash: 30,
  };
}

function makeEnemy(kind: EnemyKind, x: number, y: number): Tank {
  const speed = kind === "fast" ? 0.06 : kind === "power" ? 0.035 : 0.04;
  const color = kind === "fast" ? "#b04040" : kind === "power" ? "#a060c0" : "#808888";
  return {
    x, y, dir: 2, speed, shootCd: 60 + Math.random() * 60,
    isPlayer: false, color, kind, aiTimer: 30 + Math.random() * 60,
    alive: true, spawnFlash: SPAWN_FLASH,
  };
}

function nextEnemyKind(spawnedTotal: number): EnemyKind {
  const r = Math.random();
  if (spawnedTotal < 4) return "basic";
  if (spawnedTotal < 8) return r < 0.6 ? "basic" : "fast";
  return r < 0.4 ? "basic" : r < 0.75 ? "fast" : "power";
}

function initGame(): GameData {
  const { grid, baseX, baseY } = parseLevel();
  return {
    grid, baseX, baseY, baseAlive: true,
    player: makePlayer(),
    enemies: [], bullets: [], particles: [],
    keys: new Set<string>(),
    score: 0, lives: PLAYER_LIVES,
    spawnedTotal: 0, killedTotal: 0,
    spawnTimer: 60, spawnIdx: 0,
    state: "ready", lastTime: 0,
    flashTime: 0, shakeTime: 0,
  };
}

function updateGame(g: GameData, dt: number): void {
  if (g.state !== "playing") return;
  if (g.flashTime > 0) g.flashTime -= dt * 16.67;
  if (g.shakeTime > 0) g.shakeTime -= dt * 16.67;
  const allTanks: Tank[] = [g.player, ...g.enemies];
  const k = g.keys;
  let pdir: Dir | null = null;
  if (k.has("arrowup") || k.has("w") || k.has("ц")) pdir = 0;
  else if (k.has("arrowright") || k.has("d") || k.has("в")) pdir = 1;
  else if (k.has("arrowdown") || k.has("s") || k.has("ы")) pdir = 2;
  else if (k.has("arrowleft") || k.has("a") || k.has("ф")) pdir = 3;
  if (g.player.alive) {
    if (g.player.spawnFlash > 0) g.player.spawnFlash -= dt;
    if (pdir !== null) tryMove(g.player, pdir, dt, g.grid, allTanks);
    g.player.shootCd -= dt;
    if (k.has(" ") && g.player.shootCd <= 0 && g.player.spawnFlash <= 0) {
      fireBullet(g.player, g.bullets);
      g.player.shootCd = PLAYER_SHOOT_CD;
    }
  }
  for (const e of g.enemies) {
    if (!e.alive) continue;
    if (e.spawnFlash > 0) { e.spawnFlash -= dt; continue; }
    e.aiTimer -= dt;
    if (e.aiTimer <= 0) {
      e.aiTimer = 40 + Math.random() * 60;
      const target = Math.random() < 0.55
        ? { x: g.baseX + 0.5, y: g.baseY + 0.5 }
        : { x: g.player.x, y: g.player.y };
      const nd = pickEnemyDir(e, g.grid, allTanks, target);
      tryMove(e, nd, dt, g.grid, allTanks);
    } else {
      tryMove(e, e.dir, dt, g.grid, allTanks);
    }
    e.shootCd -= dt;
    if (e.shootCd <= 0) {
      fireBullet(e, g.bullets);
      e.shootCd = 50 + Math.random() * 80;
    }
  }
  for (const b of g.bullets) {
    if (b.dead) continue;
    const step = BULLET_SPEED * dt;
    let nx = b.x, ny = b.y;
    if (b.dir === 0) ny -= step;
    else if (b.dir === 1) nx += step;
    else if (b.dir === 2) ny += step;
    else nx -= step;
    let checkX = nx, checkY = ny;
    if (b.dir === 1) checkX = nx + BULLET_SIZE;
    if (b.dir === 2) checkY = ny + BULLET_SIZE;
    const col = Math.floor(checkX);
    const row = Math.floor(checkY);
    let hit = false;
    if (col < 0 || col >= N || row < 0 || row >= N) {
      b.dead = true; hit = true;
    } else {
      const cell = g.grid[row][col];
      if (cell === 1) {
        g.grid[row][col] = 0;
        b.dead = true; hit = true;
        spawnExplosion(g.particles, col + 0.5, row + 0.5, "#c87030", 8);
      } else if (cell === 2) {
        b.dead = true; hit = true;
        spawnExplosion(g.particles, col + 0.5, row + 0.5, "#cccccc", 5);
      } else if (cell === 4) {
        g.grid[row][col] = 0;
        g.baseAlive = false;
        b.dead = true; hit = true;
        g.flashTime = 800;
        g.shakeTime = 600;
        spawnExplosion(g.particles, col + 0.5, row + 0.5, "#ff6020", 30);
      }
    }
    if (!hit) {
      const targets: Tank[] = b.owner === "player" ? g.enemies : [g.player];
      for (const t of targets) {
        if (!t.alive || t.spawnFlash > 0) continue;
        if (nx < t.x + TANK_SIZE && nx + BULLET_SIZE > t.x && ny < t.y + TANK_SIZE && ny + BULLET_SIZE > t.y) {
          t.alive = false;
          b.dead = true; hit = true;
          spawnExplosion(g.particles, t.x + TANK_SIZE / 2, t.y + TANK_SIZE / 2, "#ff8040", 18);
          if (b.owner === "player") {
            const pts = t.kind === "basic" ? 100 : t.kind === "fast" ? 200 : 300;
            g.score += pts;
            g.killedTotal += 1;
          } else if (t.isPlayer) {
            g.lives -= 1;
            g.shakeTime = 400;
            if (g.lives <= 0) {
              g.state = "lose";
            } else {
              g.player = makePlayer();
            }
          }
          break;
        }
      }
    }
    if (!hit) { b.x = nx; b.y = ny; }
  }
  g.bullets = g.bullets.filter(b => !b.dead);
  g.enemies = g.enemies.filter(e => e.alive);
  if (g.state === "playing") {
    if (g.killedTotal >= WIN_KILLS && g.enemies.length === 0) {
      g.state = "win";
    } else if (g.spawnedTotal < WIN_KILLS && g.enemies.length < MAX_ON_SCREEN) {
      g.spawnTimer -= dt;
      if (g.spawnTimer <= 0) {
        const spawn = ENEMY_SPAWNS[g.spawnIdx % ENEMY_SPAWNS.length];
        g.spawnIdx += 1;
        const occupied = g.enemies.some(e => Math.abs(e.x - spawn.x) < 0.5 && Math.abs(e.y - spawn.y) < 0.5);
        if (!occupied && g.grid[spawn.y][spawn.x] === 0) {
          const kind = nextEnemyKind(g.spawnedTotal);
          g.enemies.push(makeEnemy(kind, spawn.x, spawn.y));
          g.spawnedTotal += 1;
          g.spawnTimer = SPAWN_DELAY;
        } else {
          g.spawnTimer = 20;
        }
      }
    }
    if (!g.baseAlive) g.state = "lose";
  }
  updateParticles(g.particles, dt * 16.67);
}

function drawBrick(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.fillStyle = "#7a3818";
  ctx.fillRect(x, y, s, s);
  ctx.fillStyle = "rgba(255,180,100,0.12)";
  ctx.fillRect(x, y, s, s * 0.25);
  ctx.strokeStyle = "#3a1808";
  ctx.lineWidth = 1;
  for (let r = 1; r < 4; r++) {
    ctx.beginPath();
    ctx.moveTo(x, y + (r * s) / 4);
    ctx.lineTo(x + s, y + (r * s) / 4);
    ctx.stroke();
  }
  for (let r = 0; r < 4; r++) {
    const offset = (r % 2) * (s / 4);
    ctx.beginPath();
    ctx.moveTo(x + offset, y + (r * s) / 4);
    ctx.lineTo(x + offset, y + ((r + 1) * s) / 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + offset + s / 2, y + (r * s) / 4);
    ctx.lineTo(x + offset + s / 2, y + ((r + 1) * s) / 4);
    ctx.stroke();
  }
}

function drawSteel(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.fillStyle = "#5a5a62";
  ctx.fillRect(x, y, s, s);
  ctx.strokeStyle = "#2a2a32";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 1, y + 1, s - 2, s - 2);
  ctx.fillStyle = "#7a7a82";
  ctx.fillRect(x + 2, y + 2, s / 2 - 3, s / 2 - 3);
  ctx.fillStyle = "#3a3a42";
  ctx.fillRect(x + s / 2 + 1, y + s / 2 + 1, s / 2 - 3, s / 2 - 3);
}

function drawBase(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, alive: boolean, time: number): void {
  if (!alive) {
    ctx.fillStyle = "#1a0a05";
    ctx.fillRect(x, y, s, s);
    ctx.fillStyle = "#3a1a08";
    ctx.fillRect(x + s * 0.2, y + s * 0.4, s * 0.3, s * 0.15);
    ctx.fillRect(x + s * 0.5, y + s * 0.6, s * 0.25, s * 0.1);
    return;
  }
  ctx.fillStyle = "#5a3010";
  ctx.fillRect(x, y, s, s);
  ctx.fillStyle = "#7a4820";
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(x + 1, y + i * (s / 3) + 1, s - 2, s / 3 - 2);
  }
  ctx.fillStyle = "#3a1808";
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 2; c++) {
      ctx.beginPath();
      ctx.arc(x + (c + 0.5) * (s / 2), y + (r + 0.5) * (s / 3), s * 0.07, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const bob = Math.sin(time / 200) * 1;
  ctx.fillStyle = "#2a1a08";
  ctx.fillRect(x + s / 2 - 1, y - s * 0.4 + bob, 2, s * 0.4);
  ctx.fillStyle = "#d85a20";
  ctx.beginPath();
  ctx.moveTo(x + s / 2 + 1, y - s * 0.4 + bob);
  ctx.lineTo(x + s / 2 + s * 0.28, y - s * 0.3 + bob);
  ctx.lineTo(x + s / 2 + 1, y - s * 0.2 + bob);
  ctx.closePath();
  ctx.fill();
}

function drawTank(ctx: CanvasRenderingContext2D, t: Tank, s: number): void {
  const cx = (t.x + TANK_SIZE / 2) * s;
  const cy = (t.y + TANK_SIZE / 2) * s;
  const sz = TANK_SIZE * s;
  const half = sz / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(t.dir * Math.PI / 2);
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(-half + 1, -half + 2, sz, sz);
  ctx.fillStyle = "#2a2520";
  ctx.fillRect(-half, -half, sz * 0.2, sz);
  ctx.fillRect(half - sz * 0.2, -half, sz * 0.2, sz);
  ctx.strokeStyle = "#0a0805";
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const yy = -half + i * (sz / 6);
    ctx.beginPath();
    ctx.moveTo(-half, yy); ctx.lineTo(-half + sz * 0.2, yy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(half - sz * 0.2, yy); ctx.lineTo(half, yy);
    ctx.stroke();
  }
  ctx.fillStyle = t.color;
  ctx.fillRect(-half + sz * 0.2, -half + sz * 0.08, sz * 0.6, sz * 0.84);
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.lineWidth = 1;
  ctx.strokeRect(-half + sz * 0.2, -half + sz * 0.08, sz * 0.6, sz * 0.84);
  ctx.fillStyle = "#5a3a18";
  ctx.beginPath();
  ctx.ellipse(0, half + sz * 0.08, sz * 0.18, sz * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#2a1808";
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(-sz * 0.14, half + sz * 0.08 + i * sz * 0.04);
    ctx.lineTo(sz * 0.14, half + sz * 0.08 + i * sz * 0.04);
    ctx.stroke();
  }
  ctx.fillStyle = "#4a3528";
  ctx.beginPath();
  ctx.arc(0, 0, sz * 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#9a6238";
  ctx.beginPath();
  ctx.arc(0, 0, sz * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#5a3a18";
  ctx.beginPath();
  ctx.arc(-sz * 0.13, 0, sz * 0.05, 0, Math.PI * 2);
  ctx.arc(sz * 0.13, 0, sz * 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1a0a05";
  ctx.beginPath();
  ctx.arc(-sz * 0.07, -sz * 0.06, sz * 0.028, 0, Math.PI * 2);
  ctx.arc(sz * 0.07, -sz * 0.06, sz * 0.028, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(-sz * 0.05, -sz * 0.13, sz * 0.1, sz * 0.04);
  ctx.fillStyle = "#1a1815";
  ctx.fillRect(-sz * 0.06, -half - sz * 0.22, sz * 0.12, sz * 0.32);
  ctx.restore();
}

function drawBullet(ctx: CanvasRenderingContext2D, b: Bullet, s: number): void {
  const cx = (b.x + BULLET_SIZE / 2) * s;
  const cy = (b.y + BULLET_SIZE / 2) * s;
  const r = BULLET_SIZE * s * 0.55;
  ctx.fillStyle = b.owner === "player" ? "#ffd840" : "#ff6040";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[], cell: number): void {
  for (const p of particles) {
    const a = clamp(p.life / p.maxLife, 0, 1);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x * cell, p.y * cell, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawScene(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, g: GameData, time: number): void {
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const W = canvas.width / dpr;
  const H = canvas.height / dpr;
  if (W < 10 || H < 10) return;
  const cell = Math.min(W, H) / N;
  const offX = (W - cell * N) / 2;
  const offY = (H - cell * N) / 2;
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, W, H);
  let sx = 0, sy = 0;
  if (g.shakeTime > 0) {
    const mag = g.shakeTime / 200;
    sx = (Math.random() - 0.5) * mag * 6;
    sy = (Math.random() - 0.5) * mag * 6;
  }
  ctx.save();
  ctx.translate(offX + sx, offY + sy);
  ctx.fillStyle = "#161616";
  ctx.fillRect(0, 0, cell * N, cell * N);
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;
  for (let i = 1; i < N; i++) {
    ctx.beginPath();
    ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, cell * N);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * cell); ctx.lineTo(cell * N, i * cell);
    ctx.stroke();
  }
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const cellType = g.grid[r][c];
      if (cellType === 0) continue;
      const x = c * cell, y = r * cell;
      if (cellType === 1) drawBrick(ctx, x, y, cell);
      else if (cellType === 2) drawSteel(ctx, x, y, cell);
      else if (cellType === 4) drawBase(ctx, x, y, cell, true, time);
    }
  }
  if (!g.baseAlive) drawBase(ctx, g.baseX * cell, g.baseY * cell, cell, false, time);
  const allTanks: Tank[] = [g.player, ...g.enemies];
  for (const t of allTanks) {
    if (!t.alive) continue;
    const blink = t.spawnFlash > 0 && Math.floor(time / 60) % 2 === 0;
    if (blink) continue;
    drawTank(ctx, t, cell);
  }
  for (const b of g.bullets) {
    if (!b.dead) drawBullet(ctx, b, cell);
  }
  drawParticles(ctx, g.particles, cell);
  if (g.flashTime > 0) {
    ctx.fillStyle = `rgba(255,80,40,${clamp(g.flashTime / 1000, 0, 0.6)})`;
    ctx.fillRect(0, 0, cell * N, cell * N);
  }
  ctx.restore();
}

export function TankBattle() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<GameData | null>(null);
  const lastHudRef = useRef(0);
  const [state, setState] = useState<GameState>("ready");
  const [hud, setHud] = useState<HudState>({
    score: 0, lives: PLAYER_LIVES, wave: 1,
    totalWaves: TOTAL_WAVES, enemiesLeft: WIN_KILLS, baseAlive: true,
  });

  const startGame = useCallback(() => {
    gameRef.current = initGame();
    gameRef.current.state = "playing";
    setState("playing");
    setHud({
      score: 0, lives: PLAYER_LIVES, wave: 1,
      totalWaves: TOTAL_WAVES, enemiesLeft: WIN_KILLS, baseAlive: true,
    });
  }, []);

  useEffect(() => {
    if (!gameRef.current) gameRef.current = initGame();
    let raf = 0;
    const loop = (now: number) => {
      const g = gameRef.current;
      const canvas = canvasRef.current;
      if (!g || !canvas) {
        raf = requestAnimationFrame(loop);
        return;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        raf = requestAnimationFrame(loop);
        return;
      }
      if (g.lastTime === 0) {
        g.lastTime = now;
      } else {
        let dt = (now - g.lastTime) / 16.67;
        g.lastTime = now;
        if (dt > 2.5) dt = 2.5;
        const prevState = g.state;
        updateGame(g, dt);
        if (g.state !== prevState) setState(g.state);
        if (now - lastHudRef.current > 100) {
          lastHudRef.current = now;
          const wave = Math.min(TOTAL_WAVES, Math.floor(g.spawnedTotal / ENEMIES_PER_WAVE) + 1);
          setHud({
            score: g.score, lives: g.lives, wave,
            totalWaves: TOTAL_WAVES,
            enemiesLeft: WIN_KILLS - g.killedTotal,
            baseAlive: g.baseAlive,
          });
        }
      }
      drawScene(ctx, canvas, g, now);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const g = gameRef.current;
      if (!g) return;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
      g.keys.add(e.key.toLowerCase());
    };
    const up = (e: KeyboardEvent) => {
      const g = gameRef.current;
      if (!g) return;
      g.keys.delete(e.key.toLowerCase());
    };
    const blur = () => {
      const g = gameRef.current;
      if (g) g.keys.clear();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ro = new ResizeObserver(() => {
      const rect = wrap.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(2, Math.floor(rect.width));
      const h = Math.max(2, Math.floor(rect.height));
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={wrapRef} className="relative w-full h-full min-h-[400px] bg-[#0a0a0a] overflow-hidden select-none">
      <canvas ref={canvasRef} className="block w-full h-full" />
      {state === "playing" && (
        <>
          <div className="absolute top-3 left-3 right-3 flex items-start justify-between pointer-events-none gap-2">
            <div className="bg-black/70 backdrop-blur rounded-lg px-3 py-2 text-white">
              <div className="text-[10px] uppercase tracking-wider opacity-70">Счёт</div>
              <div className="text-xl font-black leading-none">{hud.score}</div>
            </div>
            <div className="bg-black/70 backdrop-blur rounded-lg px-3 py-2 text-white text-center">
              <div className="text-[10px] uppercase tracking-wider opacity-70">Волна</div>
              <div className="text-xl font-black leading-none">{hud.wave}<span className="text-xs opacity-60">/{hud.totalWaves}</span></div>
            </div>
            <div className="bg-black/70 backdrop-blur rounded-lg px-3 py-2 text-white text-right">
              <div className="text-[10px] uppercase tracking-wider opacity-70">Осталось</div>
              <div className="text-xl font-black leading-none">{hud.enemiesLeft}</div>
            </div>
          </div>
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
            <div className="bg-black/70 backdrop-blur rounded-lg px-3 py-2 text-white flex items-center gap-1.5">
              {Array.from({ length: PLAYER_LIVES }).map((_, i) => (
                <Heart key={i} className={`w-4 h-4 ${i < hud.lives ? "text-red-500 fill-red-500" : "text-zinc-700"}`} />
              ))}
            </div>
            <div className={`bg-black/70 backdrop-blur rounded-lg px-3 py-2 text-white flex items-center gap-1.5 ${hud.baseAlive ? "" : "opacity-70"}`}>
              <Shield className={`w-4 h-4 ${hud.baseAlive ? "text-emerald-400" : "text-red-500"}`} />
              <span className="text-xs">{hud.baseAlive ? "Плотина цела" : "Плотина пала!"}</span>
            </div>
          </div>
        </>
      )}
      {state === "ready" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur p-4">
          <div className="bg-zinc-900/95 rounded-2xl p-6 max-w-md w-full text-center text-white shadow-2xl">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 mb-3">
              <Target className="w-9 h-9 text-emerald-400" />
            </div>
            <h2 className="text-3xl font-black mb-1">Танчики Бобра</h2>
            <p className="text-zinc-400 mb-4 text-sm">Защити плотину от вражеских танков! Уничтожь все волны.</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-zinc-200 mb-4">
              <div className="bg-zinc-800 rounded p-2"><kbd className="font-mono text-emerald-300">↑↓←→</kbd> движение</div>
              <div className="bg-zinc-800 rounded p-2"><kbd className="font-mono text-emerald-300">Пробел</kbd> огонь</div>
              <div className="bg-zinc-800 rounded p-2 col-span-2 text-zinc-300">3 волны по 4 танка. Не дай разрушить плотину!</div>
            </div>
            <button onClick={startGame} className="bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black font-bold px-6 py-3 rounded-lg transition inline-flex items-center gap-2">
              <Target className="w-4 h-4" />В бой!
            </button>
          </div>
        </div>
      )}
      {state === "win" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur p-4">
          <div className="bg-zinc-900/95 rounded-2xl p-6 max-w-md w-full text-center text-white shadow-2xl">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/20 mb-3">
              <Trophy className="w-9 h-9 text-amber-400" />
            </div>
            <h2 className="text-3xl font-black mb-1">Победа!</h2>
            <p className="text-zinc-300 mb-4 text-sm">Плотина устояла, все враги повержены.</p>
            <div className="bg-zinc-800 rounded-lg p-3 mb-4 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-zinc-400">Счёт:</span><span className="font-bold text-amber-300">{hud.score}</span></div>
              <div className="flex justify-between"><span className="text-zinc-400">Жизни:</span><span className="font-bold">{hud.lives}</span></div>
            </div>
            <button onClick={startGame} className="bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black font-bold px-6 py-3 rounded-lg transition inline-flex items-center gap-2">
              <RotateCcw className="w-4 h-4" />Играть снова
            </button>
          </div>
        </div>
      )}
      {state === "lose" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur p-4">
          <div className="bg-zinc-900/95 rounded-2xl p-6 max-w-md w-full text-center text-white shadow-2xl">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 mb-3">
              <Skull className="w-9 h-9 text-red-400" />
            </div>
            <h2 className="text-3xl font-black mb-1">Поражение</h2>
            <p className="text-zinc-300 mb-4 text-sm">{hud.baseAlive ? "Танк бобра подбит!" : "Плотина разрушена!"}</p>
            <div className="bg-zinc-800 rounded-lg p-3 mb-4 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-zinc-400">Счёт:</span><span className="font-bold text-amber-300">{hud.score}</span></div>
              <div className="flex justify-between"><span className="text-zinc-400">Уничтожено:</span><span className="font-bold">{WIN_KILLS - hud.enemiesLeft} / {WIN_KILLS}</span></div>
            </div>
            <button onClick={startGame} className="bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black font-bold px-6 py-3 rounded-lg transition inline-flex items-center gap-2">
              <RotateCcw className="w-4 h-4" />Отомстить
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
