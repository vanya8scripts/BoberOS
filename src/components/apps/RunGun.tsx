"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Heart, Play, RotateCcw, Skull, Sparkles, Zap } from "lucide-react";

type GameState = "ready" | "playing" | "gameover" | "win";
type EnemyType = "melee" | "flyer" | "boss";
type Outcome = "none" | "win" | "lose";

interface Player {
  x: number; y: number; vx: number; vy: number; w: number; h: number;
  facing: 1 | -1; onGround: boolean; health: number; invuln: number; muzzle: number;
}

interface Enemy {
  id: number; type: EnemyType; x: number; y: number; vx: number; vy: number;
  w: number; h: number; health: number; maxHealth: number; facing: 1 | -1;
  shootCd: number; chargeCd: number; charging: number; hitFlash: number; anim: number; onGround: boolean;
}

interface Bullet {
  x: number; y: number; vx: number; vy: number; from: "player" | "enemy";
  life: number; r: number; grenade: boolean;
}

interface Particle {
  x: number; y: number; vx: number; vy: number; life: number; maxLife: number;
  color: string; size: number; gravity: number;
}

interface Pickup { x: number; y: number; vy: number; type: "health" | "special"; bob: number; dead: boolean; }
interface FloatText { x: number; y: number; text: string; life: number; color: string; vy: number; size: number; }
interface SpawnItem { type: EnemyType; delay: number; }

interface GameData {
  tick: number; player: Player; enemies: Enemy[]; bullets: Bullet[];
  particles: Particle[]; pickups: Pickup[]; floats: FloatText[];
  cameraX: number; shake: number; wave: number; waveActive: boolean;
  waveStartTick: number; waveQueue: SpawnItem[]; waveSpawnedCount: number; waveDelayTimer: number;
  combo: number; comboTimer: number; score: number; grenades: number; lives: number;
  fireCd: number; keys: Set<string>; mouseDown: boolean;
  jumpHeld: boolean; grenadeHeld: boolean; grenadeQueued: boolean;
  enemyIdCounter: number; announcement: string; announcementTimer: number; announcementColor: string;
  bossPhase: number; outcome: Outcome;
}

interface Hud {
  health: number; lives: number; score: number; wave: number; combo: number; grenades: number;
  announcement: string; announcementColor: string; bossActive: boolean; enemiesLeft: number;
}

const GRAVITY = 0.7;
const JUMP_V = -13.5;
const MOVE_SPEED = 4.4;
const PLAYER_W = 44;
const PLAYER_H = 50;
const BULLET_SPEED = 11;
const FIRE_CD = 8;
const GROUND_RATIO = 0.82;
const WORLD_W = 2200;
const MAX_WAVES = 4;
const BOSS_HP = 300;
const PLAYER_MAX_HP = 100;
const START_LIVES = 3;
const START_GRENADES = 3;
const ENEMY_BULLET_SPEED = 5;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }
function clamp(v: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, v)); }
function rectOverlap(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, c: string): void {
  ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}
function blob(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, c: string): void {
  ctx.fillStyle = c; roundRect(ctx, x, y, w, h, r); ctx.fill();
}
function flipX(ctx: CanvasRenderingContext2D, e: { x: number; w: number; facing: 1 | -1 }): void {
  if (e.facing === 1) { ctx.translate(e.x + e.w / 2, 0); ctx.scale(-1, 1); ctx.translate(-(e.x + e.w / 2), 0); }
}

function drawBeaver(ctx: CanvasRenderingContext2D, p: Player, tick: number): void {
  const x = p.x, y = p.y;
  ctx.save();
  if (p.facing === -1) { ctx.translate(p.x + p.w / 2, 0); ctx.scale(-1, 1); ctx.translate(-(p.x + p.w / 2), 0); }
  if (p.invuln > 0 && Math.floor(tick / 4) % 2 === 0) ctx.globalAlpha = 0.4;
  blob(ctx, x - 4, y + 30, 12, 16, 6, "#3a2310");
  ctx.strokeStyle = "#6a3a18"; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - 2, y + 34); ctx.lineTo(x + 6, y + 34);
  ctx.moveTo(x - 2, y + 40); ctx.lineTo(x + 6, y + 40);
  ctx.stroke();
  const grad = ctx.createLinearGradient(0, y + 16, 0, y + 46);
  grad.addColorStop(0, "#9a6028"); grad.addColorStop(1, "#5e3818");
  ctx.fillStyle = grad; roundRect(ctx, x + 6, y + 18, 30, 26, 12); ctx.fill();
  blob(ctx, x + 14, y + 26, 18, 14, 7, "#d4a070");
  blob(ctx, x + 26, y + 6, 20, 22, 9, "#7a4a24");
  dot(ctx, x + 30, y + 8, 4, "#5a3216");
  dot(ctx, x + 44, y + 8, 4, "#5a3216");
  dot(ctx, x + 40, y + 14, 3, "#fff");
  dot(ctx, x + 41, y + 14, 1.6, "#000");
  dot(ctx, x + 46, y + 19, 2, "#1a0a04");
  blob(ctx, x + 43, y + 22, 4, 4, 1, "#fff");
  blob(ctx, x + 44, y + 28, 20, 6, 2, "#2a2a2a");
  blob(ctx, x + 44, y + 34, 6, 5, 1, "#444");
  if (p.muzzle > 0) {
    dot(ctx, x + 66, y + 31, 5 + p.muzzle, "#fff5b0");
    dot(ctx, x + 66, y + 31, 3 + p.muzzle * 0.5, "#ffb028");
  }
  const moving = Math.abs(p.vx) > 0.3 && p.onGround;
  const phase = moving ? Math.sin(tick * 0.35) : 0;
  if (p.onGround) {
    blob(ctx, x + 10, y + 42 + phase * 3, 8, 8, 3, "#4a2c12");
    blob(ctx, x + 24, y + 42 - phase * 3, 8, 8, 3, "#4a2c12");
  } else {
    blob(ctx, x + 12, y + 40, 8, 8, 3, "#4a2c12");
    blob(ctx, x + 24, y + 44, 8, 8, 3, "#4a2c12");
  }
  ctx.restore();
}

function drawBadger(ctx: CanvasRenderingContext2D, e: Enemy, tick: number): void {
  const x = e.x, y = e.y, flash = e.hitFlash > 0;
  ctx.save();
  flipX(ctx, e);
  const grad = ctx.createLinearGradient(0, y, 0, y + e.h);
  grad.addColorStop(0, "#3a3a3a"); grad.addColorStop(1, "#1a1a1a");
  ctx.fillStyle = flash ? "#fff" : grad;
  roundRect(ctx, x + 2, y + 14, e.w - 4, e.h - 14, 10); ctx.fill();
  blob(ctx, x + 4, y + 16, e.w - 8, 6, 3, flash ? "#fff" : "#e8e8e8");
  blob(ctx, x, y, 18, 18, 7, flash ? "#fff" : "#2a2a2a");
  blob(ctx, x + 2, y + 2, 6, 14, 3, flash ? "#fff" : "#f0f0f0");
  dot(ctx, x + 10, y + 8, 2, "#ff3030");
  blob(ctx, x + 2, y + 14, 10, 3, 1, "#fff");
  const phase = Math.sin(tick * 0.3);
  const leg = flash ? "#fff" : "#0a0a0a";
  blob(ctx, x + 6, y + e.h - 6 + phase * 2, 6, 8, 2, leg);
  blob(ctx, x + e.w - 12, y + e.h - 6 - phase * 2, 6, 8, 2, leg);
  ctx.restore();
}

function drawFlyer(ctx: CanvasRenderingContext2D, e: Enemy, tick: number): void {
  const x = e.x, y = e.y, flash = e.hitFlash > 0;
  ctx.save();
  flipX(ctx, e);
  ctx.fillStyle = "rgba(180,180,180,0.4)";
  ctx.beginPath();
  ctx.ellipse(x + e.w / 2, y - 2, e.w * 0.6, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  blob(ctx, x + 2, y + 2, e.w - 4, e.h - 4, 8, flash ? "#fff" : "#2a2a2a");
  blob(ctx, x + 4, y + 4, e.w - 8, 4, 2, flash ? "#fff" : "#e8e8e8");
  dot(ctx, x + 8, y + 10, 2.5, "#ff3030");
  ctx.fillStyle = "#444"; ctx.fillRect(x - 2, y + 12, 6, 3);
  ctx.strokeStyle = "#888"; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + e.w / 2 - 10, y); ctx.lineTo(x + e.w / 2 + 10, y);
  ctx.stroke();
  dot(ctx, x + e.w / 2, y, 2, "#666");
  void tick;
  ctx.restore();
}

function drawBoss(ctx: CanvasRenderingContext2D, e: Enemy, tick: number, phase: number): void {
  const x = e.x, y = e.y, flash = e.hitFlash > 0, rage = phase >= 3;
  ctx.save();
  flipX(ctx, e);
  const grad = ctx.createLinearGradient(0, y, 0, y + e.h);
  grad.addColorStop(0, rage ? "#5a1010" : "#2a2a2a");
  grad.addColorStop(1, rage ? "#2a0808" : "#0a0a0a");
  ctx.fillStyle = flash ? "#fff" : grad;
  roundRect(ctx, x + 10, y + 40, e.w - 20, e.h - 40, 20); ctx.fill();
  blob(ctx, x + 14, y + 50, e.w - 28, 10, 4, flash ? "#fff" : "#e8e8e8");
  blob(ctx, x + 14, y + 70, e.w - 28, 8, 4, flash ? "#fff" : "#e8e8e8");
  blob(ctx, x, y + 8, 50, 44, 16, flash ? "#fff" : (rage ? "#dc2626" : "#1a1a1a"));
  blob(ctx, x + 4, y + 12, 12, 36, 5, flash ? "#fff" : "#f0f0f0");
  ctx.fillStyle = rage ? "#ffff00" : "#ff3030";
  ctx.shadowColor = rage ? "#ffff00" : "#ff3030";
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(x + 22, y + 24, 4, 0, Math.PI * 2);
  ctx.arc(x + 36, y + 24, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  for (let i = 0; i < 4; i++) blob(ctx, x + 8 + i * 8, y + 44, 5, 6, 1, "#fff");
  ctx.fillStyle = "#8a6a20";
  ctx.beginPath();
  ctx.moveTo(x + 8, y + 8); ctx.lineTo(x + 14, y - 8); ctx.lineTo(x + 20, y + 8); ctx.closePath();
  ctx.moveTo(x + 28, y + 8); ctx.lineTo(x + 34, y - 8); ctx.lineTo(x + 40, y + 8); ctx.closePath();
  ctx.fill();
  const lp = Math.sin(tick * 0.25);
  blob(ctx, x + 20, y + e.h - 10 + lp * 4, 12, 14, 4, "#0a0a0a");
  blob(ctx, x + e.w - 32, y + e.h - 10 - lp * 4, 12, 14, 4, "#0a0a0a");
  ctx.restore();
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, baseY: number, size: number, color: string, variant: number): void {
  ctx.fillStyle = "#4a2c12";
  ctx.fillRect(x - 3, baseY - size, 6, size);
  ctx.fillStyle = color;
  if (variant === 3) { dot(ctx, x, baseY - size, size * 0.5, color); return; }
  ctx.beginPath();
  ctx.arc(x, baseY - size - size * 0.2, size * 0.6, 0, Math.PI * 2);
  ctx.arc(x - size * 0.4, baseY - size, size * 0.5, 0, Math.PI * 2);
  ctx.arc(x + size * 0.4, baseY - size, size * 0.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawTreeRow(ctx: CanvasRenderingContext2D, w: number, baseY: number, parallax: number, cameraX: number, color: string, size: number, spacing: number, variant: number, phase: number): void {
  const off = ((cameraX * parallax) % spacing + spacing) % spacing;
  for (let x = -off - spacing; x < w + spacing; x += spacing) drawTree(ctx, x + phase * 17, baseY, size, color, variant);
}

function drawDam(ctx: CanvasRenderingContext2D, w: number, baseY: number, parallax: number, cameraX: number): void {
  const spacing = 600;
  const off = ((cameraX * parallax) % spacing + spacing) % spacing;
  for (let x = -off - spacing; x < w + spacing; x += spacing) {
    for (let i = 0; i < 4; i++) blob(ctx, x - 50, baseY - 40 + i * 12, 100, 10, 5, "#5a3818");
    ctx.fillStyle = "#3a2410";
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(x - 50, baseY - 40 + i * 12 + 5, 5, 0, Math.PI * 2);
      ctx.arc(x + 50, baseY - 40 + i * 12 + 5, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawBackground(ctx: CanvasRenderingContext2D, g: GameData, w: number, h: number, groundY: number): void {
  const sky = ctx.createLinearGradient(0, 0, 0, groundY);
  sky.addColorStop(0, "#7ec0e8"); sky.addColorStop(0.6, "#a8d8f0"); sky.addColorStop(1, "#d8e8d0");
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, groundY);
  dot(ctx, w - 80, 80, 36, "rgba(255,230,160,0.8)");
  ctx.fillStyle = "#8aa890";
  const mOff = ((g.cameraX * 0.1) % 300 + 300) % 300;
  ctx.beginPath();
  ctx.moveTo(-mOff, groundY);
  for (let i = 0; i < Math.ceil(w / 300) + 2; i++) {
    const bx = -mOff + i * 300;
    ctx.lineTo(bx + 150, groundY - 120 - (i % 2) * 40);
    ctx.lineTo(bx + 300, groundY);
  }
  ctx.closePath(); ctx.fill();
  drawTreeRow(ctx, w, groundY, 0.25, g.cameraX, "#4a6a3a", 40, 180, 1, 0);
  drawTreeRow(ctx, w, groundY, 0.5, g.cameraX, "#3a5a2a", 60, 140, 2, 1);
  drawDam(ctx, w, groundY, 0.5, g.cameraX);
  drawTreeRow(ctx, w, groundY, 0.85, g.cameraX, "#2a4a1a", 30, 100, 3, 2);
  const groundGrad = ctx.createLinearGradient(0, groundY, 0, h);
  groundGrad.addColorStop(0, "#5a8a3a");
  groundGrad.addColorStop(0.15, "#4a6a2a");
  groundGrad.addColorStop(0.3, "#6a4a28");
  groundGrad.addColorStop(1, "#3a2818");
  ctx.fillStyle = groundGrad; ctx.fillRect(0, groundY, w, h - groundY);
  ctx.fillStyle = "#3a6a1a";
  const gOff = ((g.cameraX) % 24 + 24) % 24;
  for (let x = -gOff; x < w; x += 24) {
    ctx.beginPath();
    ctx.moveTo(x, groundY); ctx.lineTo(x + 3, groundY - 8); ctx.lineTo(x + 6, groundY);
    ctx.fill();
  }
}

function drawBullet(ctx: CanvasRenderingContext2D, b: Bullet): void {
  if (b.grenade) {
    dot(ctx, b.x, b.y, b.r, "#3a1a08");
    dot(ctx, b.x, b.y, b.r - 2, "#f97316");
    dot(ctx, b.x, b.y - b.r, 2, "#fde047");
    return;
  }
  const isPlayer = b.from === "player";
  ctx.shadowColor = isPlayer ? "#a3e635" : "#dc2626";
  ctx.shadowBlur = 8;
  ctx.fillStyle = isPlayer ? "#a3e635" : "#dc2626";
  if (isPlayer) {
    ctx.beginPath(); ctx.ellipse(b.x, b.y, b.r * 1.6, b.r, 0, 0, Math.PI * 2); ctx.fill();
  } else {
    dot(ctx, b.x, b.y, b.r, "#dc2626");
  }
  ctx.shadowBlur = 0;
  dot(ctx, b.x, b.y, b.r * (isPlayer ? 0.5 : 0.4), isPlayer ? "#ecfccb" : "#fecaca");
}

function drawPickup(ctx: CanvasRenderingContext2D, pk: Pickup): void {
  const bobY = Math.sin(pk.bob) * 3;
  ctx.save();
  ctx.translate(pk.x, pk.y + bobY);
  ctx.shadowBlur = 12;
  ctx.shadowColor = pk.type === "health" ? "#4ade80" : "#f97316";
  ctx.globalAlpha = 0.3;
  dot(ctx, 0, 0, 14, ctx.shadowColor);
  ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  if (pk.type === "health") {
    blob(ctx, -10, -10, 20, 20, 4, "#fff");
    ctx.strokeStyle = "#f87171"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = "#dc2626"; ctx.fillRect(-5, -2, 10, 4); ctx.fillRect(-2, -5, 4, 10);
  } else {
    blob(ctx, -8, -8, 16, 16, 4, "#3a4a20");
    ctx.fillStyle = "#65a30d"; ctx.fillRect(-3, -3, 6, 6);
    ctx.fillStyle = "#1a1a1a"; ctx.fillRect(-3, -12, 6, 4);
  }
  ctx.restore();
}

function segRatio(e: Enemy, segIndex: number): number {
  const hr = e.health / e.maxHealth;
  const segStart = (3 - segIndex) / 3;
  const segEnd = (3 - segIndex - 1) / 3;
  if (hr >= segStart) return 1;
  if (hr <= segEnd) return 0;
  return (hr - segEnd) / (segStart - segEnd);
}

function drawBossBar(ctx: CanvasRenderingContext2D, e: Enemy, phase: number, w: number): void {
  const barW = Math.min(600, w - 80);
  const barH = 18;
  const bx = (w - barW) / 2;
  const by = 60;
  blob(ctx, bx - 4, by - 4, barW + 8, barH + 8, 4, "rgba(0,0,0,0.6)");
  const segW = barW / 3;
  for (let i = 0; i < 3; i++) {
    const segX = bx + i * segW;
    const segPhase = i + 1;
    const color = segPhase === 1 ? "#dc2626" : segPhase === 2 ? "#f97316" : "#fbbf24";
    const bg = segPhase > phase ? "rgba(80,80,80,0.5)" : segPhase < phase ? "rgba(40,40,40,0.7)" : color;
    blob(ctx, segX + 1, by + 1, segW - 2, barH - 2, 2, bg);
    if (segPhase === phase) { ctx.fillStyle = color; ctx.fillRect(segX + 1, by + 1, (segW - 2) * segRatio(e, i), barH - 2); }
  }
  ctx.fillStyle = "#fff"; ctx.font = "bold 14px sans-serif"; ctx.textAlign = "center";
  ctx.fillText("БОСС: Барсук-Вождь · Фаза " + phase, w / 2, by - 12);
}

function spawnParticles(g: GameData, x: number, y: number, count: number, color: string, speed: number): void {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = Math.random() * speed;
    g.particles.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1,
      life: 20 + Math.random() * 20, maxLife: 40, color, size: 2 + Math.random() * 2, gravity: 0.2,
    });
  }
}

function addFloat(g: GameData, x: number, y: number, text: string, color: string, size: number): void {
  g.floats.push({ x, y, text, color, size, life: 60, vy: -1.2 });
}

function shake(g: GameData, amount: number): void { g.shake = Math.max(g.shake, amount); }

function spawnEnemy(g: GameData, type: EnemyType, w: number, groundY: number): void {
  const id = g.enemyIdCounter++;
  const spawnX = g.player.x + w + 60 + Math.random() * 80;
  if (type === "melee") {
    g.enemies.push({ id, type, x: spawnX, y: groundY - 40, vx: 0, vy: 0, w: 36, h: 40, health: 30, maxHealth: 30, facing: -1, shootCd: 0, chargeCd: 0, charging: 0, hitFlash: 0, anim: 0, onGround: true });
  } else if (type === "flyer") {
    g.enemies.push({ id, type, x: spawnX, y: 80 + Math.random() * 60, vx: 0, vy: 0, w: 32, h: 24, health: 16, maxHealth: 16, facing: -1, shootCd: 60, chargeCd: 0, charging: 0, hitFlash: 0, anim: 0, onGround: false });
  } else {
    g.enemies.push({ id, type, x: spawnX, y: groundY - 120, vx: 0, vy: 0, w: 110, h: 120, health: BOSS_HP, maxHealth: BOSS_HP, facing: -1, shootCd: 120, chargeCd: 200, charging: 0, hitFlash: 0, anim: 0, onGround: true });
  }
}

function buildWaveQueue(wave: number): SpawnItem[] {
  const q: SpawnItem[] = [];
  const meleeCount = 2 + wave;
  const flyerCount = Math.max(0, wave - 1);
  let t = 30;
  for (let i = 0; i < meleeCount; i++) { q.push({ type: "melee", delay: t }); t += Math.max(30, 70 - wave * 6); }
  for (let i = 0; i < flyerCount; i++) { q.push({ type: "flyer", delay: t }); t += 90; }
  return q;
}

function startWave(g: GameData, wave: number): void {
  g.wave = wave; g.waveActive = true; g.waveStartTick = g.tick; g.waveSpawnedCount = 0;
  if (wave <= MAX_WAVES) {
    g.waveQueue = buildWaveQueue(wave);
    g.announcement = "Волна " + wave + "!";
    g.announcementTimer = 120; g.announcementColor = "#fde047";
  } else {
    g.waveQueue = [{ type: "boss", delay: 80 }];
    g.announcement = "БОСС!";
    g.announcementTimer = 160; g.announcementColor = "#dc2626";
    shake(g, 18);
  }
}

function playerShoot(g: GameData): void {
  const p = g.player;
  const bx = p.facing === 1 ? p.x + p.w + 18 : p.x - 8;
  const by = p.y + 30;
  let vy = 0;
  let bestDist = 99999;
  for (const e of g.enemies) {
    if (e.health <= 0) continue;
    if (e.x + e.w < p.x - 20 && p.facing === 1) continue;
    if (e.x > p.x + p.w + 20 && p.facing === -1) continue;
    const dx = (e.x + e.w / 2) - (p.x + p.w / 2);
    const dy = (e.y + e.h / 2) - by;
    const dist = Math.abs(dx) + Math.abs(dy);
    if (dist < bestDist) { bestDist = dist; vy = dy / Math.max(1, Math.abs(dx)) * BULLET_SPEED * 0.45; }
  }
  vy = Math.max(-9, Math.min(9, vy));
  g.bullets.push({ x: bx, y: by, vx: BULLET_SPEED * p.facing, vy, from: "player", life: 80, r: 5, grenade: false });
  p.muzzle = 5; g.fireCd = FIRE_CD;
  for (let i = 0; i < 3; i++) {
    g.particles.push({ x: bx, y: by, vx: p.facing * (2 + Math.random() * 2), vy: (Math.random() - 0.5) * 2, life: 8, maxLife: 8, color: "#ffd24a", size: 2.5, gravity: 0 });
  }
}

function throwGrenade(g: GameData): void {
  if (g.grenades <= 0) return;
  g.grenades--;
  const p = g.player;
  g.bullets.push({ x: p.x + p.w / 2, y: p.y + 20, vx: p.facing * 7, vy: -8, from: "player", life: 120, r: 7, grenade: true });
  addFloat(g, p.x, p.y - 10, "Граната!", "#f97316", 14);
}

function explodeGrenade(g: GameData, x: number, y: number): void {
  for (let i = 0; i < 30; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 2 + Math.random() * 6;
    g.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 30 + Math.random() * 20, maxLife: 50, color: Math.random() < 0.5 ? "#f97316" : "#fbbf24", size: 4 + Math.random() * 4, gravity: 0.15 });
  }
  shake(g, 12);
  const R = 90;
  for (const e of g.enemies) {
    if (e.health <= 0) continue;
    const dx = (e.x + e.w / 2) - x;
    const dy = (e.y + e.h / 2) - y;
    if (dx * dx + dy * dy < R * R) damageEnemy(g, e, 60);
  }
}

function damageEnemy(g: GameData, e: Enemy, dmg: number): void {
  if (e.health <= 0) return;
  e.health -= dmg; e.hitFlash = 5;
  for (let i = 0; i < 4; i++) {
    g.particles.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4 - 1, life: 15, maxLife: 15, color: "#ff6a3a", size: 2, gravity: 0.2 });
  }
  if (e.health <= 0) killEnemy(g, e);
  else if (e.type === "boss") checkBossPhase(g, e);
}

function checkBossPhase(g: GameData, e: Enemy): void {
  const ratio = e.health / e.maxHealth;
  if (g.bossPhase === 1 && ratio <= 0.66) {
    g.bossPhase = 2; g.announcement = "БОСС: Фаза 2!"; g.announcementTimer = 100; g.announcementColor = "#f97316";
    shake(g, 15); g.score += 500; spawnParticles(g, e.x + e.w / 2, e.y + e.h / 2, 30, "#f97316", 6);
  } else if (g.bossPhase === 2 && ratio <= 0.33) {
    g.bossPhase = 3; g.announcement = "БОСС: Фаза 3!"; g.announcementTimer = 100; g.announcementColor = "#dc2626";
    shake(g, 18); g.score += 500; spawnParticles(g, e.x + e.w / 2, e.y + e.h / 2, 40, "#dc2626", 7);
  }
}

function killEnemy(g: GameData, e: Enemy): void {
  e.health = -1;
  const pts = e.type === "flyer" ? 150 : e.type === "boss" ? 5000 : 100;
  g.combo++; g.comboTimer = 180;
  const gained = pts * Math.max(1, g.combo);
  g.score += gained;
  addFloat(g, e.x + e.w / 2, e.y, "+" + gained, "#fde047", 14);
  const pcount = e.type === "boss" ? 60 : 18;
  spawnParticles(g, e.x + e.w / 2, e.y + e.h / 2, pcount, e.type === "boss" ? "#dc2626" : "#6a6a6a", e.type === "boss" ? 8 : 4);
  shake(g, e.type === "boss" ? 22 : 5);
  if (e.type !== "boss" && Math.random() < 0.22) {
    g.pickups.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, vy: -3, type: Math.random() < 0.6 ? "health" : "special", bob: 0, dead: false });
  }
  if (e.type === "boss") {
    g.outcome = "win"; g.announcement = "ПОБЕДА!"; g.announcementTimer = 200; g.announcementColor = "#fde047";
  }
}

function damagePlayer(g: GameData, dmg: number, groundY: number): void {
  const p = g.player;
  if (p.invuln > 0) return;
  p.health -= dmg; p.invuln = 60; shake(g, 8);
  p.vx = p.facing * -4; p.vy = -5; p.onGround = false;
  spawnParticles(g, p.x + p.w / 2, p.y + p.h / 2, 10, "#ef4444", 4);
  if (p.health <= 0) {
    g.lives--;
    if (g.lives <= 0) { g.outcome = "lose"; }
    else {
      p.health = PLAYER_MAX_HP; p.invuln = 120; p.x = 100; p.y = groundY - p.h; p.vx = 0; p.vy = 0;
      g.announcement = "Жизнь потеряна!"; g.announcementTimer = 80; g.announcementColor = "#ef4444";
    }
  }
}

function updateBoss(g: GameData, e: Enemy, p: Player, groundY: number): void {
  const cx = e.x + e.w / 2;
  const px = p.x + p.w / 2;
  const phase = g.bossPhase;
  e.vy += GRAVITY;
  if (e.charging > 0) {
    e.charging--; e.x += e.vx;
    if (e.charging % 3 === 0) {
      g.particles.push({ x: e.x + e.w / 2, y: e.y + e.h - 10, vx: -e.facing * 2, vy: -1, life: 20, maxLife: 20, color: "#888", size: 4, gravity: 0.2 });
    }
  } else {
    const dx = px - cx;
    const speed = phase === 1 ? 0.6 : phase === 2 ? 0.9 : 1.3;
    e.vx = Math.abs(dx) > 200 ? Math.sign(dx) * speed : 0;
    e.x += e.vx;
    e.shootCd--;
    if (e.shootCd <= 0) {
      const baseAng = Math.atan2((p.y + p.h / 2) - (e.y + e.h / 2), px - cx);
      const count = phase === 1 ? 1 : phase === 2 ? 3 : 5;
      const spread = phase === 1 ? 0 : phase === 2 ? 0.35 : 0.55;
      for (let i = 0; i < count; i++) {
        const off = count === 1 ? 0 : (i - (count - 1) / 2) * spread;
        const ang = baseAng + off;
        g.bullets.push({ x: cx, y: e.y + 30, vx: Math.cos(ang) * 6, vy: Math.sin(ang) * 6, from: "enemy", life: 140, r: 7, grenade: false });
      }
      e.shootCd = phase === 1 ? 90 : phase === 2 ? 75 : 55;
      shake(g, 4);
    }
    if (phase >= 2) {
      e.chargeCd--;
      if (e.chargeCd <= 0 && Math.abs(dx) < 500 && Math.abs(dx) > 100) {
        e.charging = 30; e.vx = Math.sign(dx) * (phase === 2 ? 8 : 12);
        e.chargeCd = phase === 2 ? 280 : 180;
        addFloat(g, e.x, e.y - 20, "ТАРАН!", "#dc2626", 16);
      }
    }
  }
  e.y += e.vy;
  if (e.y + e.h >= groundY) { e.y = groundY - e.h; e.vy = 0; }
  e.x = clamp(e.x, 0, WORLD_W - e.w);
}

function updateEnemy(g: GameData, e: Enemy, p: Player, groundY: number, w: number): void {
  e.anim++;
  if (e.hitFlash > 0) e.hitFlash--;
  const cx = e.x + e.w / 2;
  const px = p.x + p.w / 2;
  e.facing = px < cx ? -1 : 1;
  if (e.type === "melee") {
    const dx = px - cx;
    const speed = 1.4 + g.wave * 0.1;
    e.vx = Math.abs(dx) > 30 ? Math.sign(dx) * speed : 0;
    e.vy += GRAVITY; e.x += e.vx; e.y += e.vy;
    if (e.y + e.h >= groundY) { e.y = groundY - e.h; e.vy = 0; e.onGround = true; }
  } else if (e.type === "flyer") {
    const dx = px - cx;
    const targetDist = 280;
    if (Math.abs(dx) > targetDist + 40) e.vx = Math.sign(dx) * 1.2;
    else if (Math.abs(dx) < targetDist - 40) e.vx = Math.sign(dx) * -1.2;
    else e.vx = 0;
    e.y += Math.sin(e.anim * 0.05) * 0.6;
    e.x += e.vx;
    e.y = clamp(e.y, 60, groundY - 140);
    e.shootCd--;
    if (e.shootCd <= 0) {
      e.shootCd = 110;
      const ang = Math.atan2((p.y + p.h / 2) - (e.y + e.h / 2), px - cx);
      g.bullets.push({ x: cx, y: e.y + e.h / 2, vx: Math.cos(ang) * ENEMY_BULLET_SPEED, vy: Math.sin(ang) * ENEMY_BULLET_SPEED, from: "enemy", life: 120, r: 5, grenade: false });
    }
  } else if (e.type === "boss") {
    updateBoss(g, e, p, groundY);
  }
  e.x = clamp(e.x, -e.w, WORLD_W);
  void w;
}

function updateGame(g: GameData, w: number, h: number, groundY: number): void {
  g.tick++;
  const p = g.player;
  const left = g.keys.has("a") || g.keys.has("arrowleft");
  const right = g.keys.has("d") || g.keys.has("arrowright");
  if (left && !right) { p.vx = -MOVE_SPEED; p.facing = -1; }
  else if (right && !left) { p.vx = MOVE_SPEED; p.facing = 1; }
  else { p.vx *= 0.6; }
  p.vy += GRAVITY; p.x += p.vx; p.y += p.vy;
  if (p.y + p.h >= groundY) { p.y = groundY - p.h; p.vy = 0; p.onGround = true; }
  else { p.onGround = false; }
  p.x = clamp(p.x, 0, WORLD_W - p.w);
  g.fireCd--;
  if ((g.keys.has("j") || g.mouseDown) && g.fireCd <= 0) playerShoot(g);
  if (g.grenadeQueued) { throwGrenade(g); g.grenadeQueued = false; }
  if (p.invuln > 0) p.invuln--;
  if (p.muzzle > 0) p.muzzle--;
  if (g.comboTimer > 0) { g.comboTimer--; if (g.comboTimer === 0) g.combo = 0; }
  if (g.announcementTimer > 0) g.announcementTimer--;
  if (g.waveActive && g.waveSpawnedCount < g.waveQueue.length) {
    const next = g.waveQueue[g.waveSpawnedCount];
    if (g.tick - g.waveStartTick >= next.delay) { spawnEnemy(g, next.type, w, groundY); g.waveSpawnedCount++; }
  }
  for (const e of g.enemies) updateEnemy(g, e, p, groundY, w);
  for (const b of g.bullets) {
    b.x += b.vx; b.y += b.vy;
    if (b.grenade) b.vy += 0.4;
    b.life--;
    let consumed = false;
    if (b.grenade) {
      if (b.y >= groundY - 3) { explodeGrenade(g, b.x, groundY - 3); consumed = true; }
      else if (b.life <= 0) { explodeGrenade(g, b.x, b.y); consumed = true; }
      else if (b.from === "player") {
        for (const e of g.enemies) {
          if (e.health <= 0) continue;
          if (b.x > e.x && b.x < e.x + e.w && b.y > e.y && b.y < e.y + e.h) { explodeGrenade(g, b.x, b.y); consumed = true; break; }
        }
      }
    } else {
      if (b.from === "player") {
        for (const e of g.enemies) {
          if (e.health <= 0) continue;
          if (b.x > e.x && b.x < e.x + e.w && b.y > e.y && b.y < e.y + e.h) { damageEnemy(g, e, 10); consumed = true; break; }
        }
      } else {
        if (p.invuln <= 0 && b.x > p.x && b.x < p.x + p.w && b.y > p.y && b.y < p.y + p.h) { damagePlayer(g, 10, groundY); consumed = true; }
      }
      if (b.life <= 0) consumed = true;
    }
    if (consumed) b.life = 0;
  }
  for (const e of g.enemies) {
    if (e.health <= 0) continue;
    if (p.invuln <= 0 && rectOverlap({ x: p.x, y: p.y, w: p.w, h: p.h }, { x: e.x, y: e.y, w: e.w, h: e.h })) {
      damagePlayer(g, e.type === "boss" ? 25 : 15, groundY);
    }
  }
  for (const pk of g.pickups) {
    pk.vy += GRAVITY * 0.5; pk.y += pk.vy; pk.bob += 0.15;
    if (pk.y + 10 >= groundY) { pk.y = groundY - 10; pk.vy = 0; }
    if (!pk.dead && rectOverlap({ x: p.x, y: p.y, w: p.w, h: p.h }, { x: pk.x - 10, y: pk.y - 10, w: 20, h: 20 })) {
      if (pk.type === "health") { p.health = Math.min(PLAYER_MAX_HP, p.health + 30); addFloat(g, p.x, p.y - 10, "+30 HP", "#4ade80", 14); }
      else { g.grenades++; addFloat(g, p.x, p.y - 10, "+1 Граната", "#f97316", 14); }
      pk.dead = true;
      spawnParticles(g, pk.x, pk.y, 12, pk.type === "health" ? "#4ade80" : "#f97316", 3);
    }
  }
  for (const pt of g.particles) { pt.x += pt.vx; pt.y += pt.vy; pt.vy += pt.gravity; pt.life--; }
  for (const f of g.floats) { f.y += f.vy; f.life--; }
  g.enemies = g.enemies.filter(e => e.health > -1);
  g.bullets = g.bullets.filter(b => b.life > 0 && b.x > g.cameraX - 200 && b.x < g.cameraX + w + 200);
  g.pickups = g.pickups.filter(pk => !pk.dead && pk.y < groundY + 50);
  g.particles = g.particles.filter(pt => pt.life > 0);
  g.floats = g.floats.filter(f => f.life > 0);
  if (g.waveActive && g.waveSpawnedCount >= g.waveQueue.length && g.enemies.length === 0 && g.outcome === "none") {
    g.waveActive = false;
    if (g.wave < MAX_WAVES + 1) g.waveDelayTimer = 150;
  }
  if (!g.waveActive && g.waveDelayTimer > 0 && g.outcome === "none") {
    g.waveDelayTimer--;
    if (g.waveDelayTimer === 0) startWave(g, g.wave + 1);
  }
  const targetCam = clamp(p.x + p.w / 2 - w * 0.4, 0, Math.max(0, WORLD_W - w));
  g.cameraX = lerp(g.cameraX, targetCam, 0.1);
  if (g.shake > 0) { g.shake *= 0.85; if (g.shake < 0.3) g.shake = 0; }
  void h;
}

function render(ctx: CanvasRenderingContext2D, g: GameData, w: number, h: number, dpr: number, groundY: number): void {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  let sx = 0, sy = 0;
  if (g.shake > 0) { sx = (Math.random() - 0.5) * g.shake; sy = (Math.random() - 0.5) * g.shake; }
  ctx.save();
  ctx.translate(sx, sy);
  drawBackground(ctx, g, w, h, groundY);
  ctx.restore();
  ctx.save();
  ctx.translate(-g.cameraX + sx, sy);
  for (const pk of g.pickups) drawPickup(ctx, pk);
  for (const e of g.enemies) {
    if (e.type === "melee") drawBadger(ctx, e, g.tick);
    else if (e.type === "flyer") drawFlyer(ctx, e, g.tick);
    else drawBoss(ctx, e, g.tick, g.bossPhase);
    if (e.type !== "boss" && e.health > 0 && e.health < e.maxHealth) {
      ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(e.x, e.y - 8, e.w, 4);
      ctx.fillStyle = "#ef4444"; ctx.fillRect(e.x, e.y - 8, e.w * (e.health / e.maxHealth), 4);
    }
  }
  for (const b of g.bullets) drawBullet(ctx, b);
  drawBeaver(ctx, g.player, g.tick);
  for (const pt of g.particles) {
    ctx.globalAlpha = pt.life / pt.maxLife;
    ctx.fillStyle = pt.color;
    ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const f of g.floats) {
    ctx.globalAlpha = clamp(f.life / 60, 0, 1);
    ctx.fillStyle = f.color; ctx.font = "bold " + f.size + "px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  const boss = g.enemies.find(e => e.type === "boss");
  if (boss && boss.health > 0) drawBossBar(ctx, boss, g.bossPhase, w);
}

function makeGame(): GameData {
  return {
    tick: 0,
    player: { x: 100, y: -9999, vx: 0, vy: 0, w: PLAYER_W, h: PLAYER_H, facing: 1, onGround: false, health: PLAYER_MAX_HP, invuln: 0, muzzle: 0 },
    enemies: [], bullets: [], particles: [], pickups: [], floats: [],
    cameraX: 0, shake: 0, wave: 0, waveActive: false, waveStartTick: 0, waveQueue: [], waveSpawnedCount: 0, waveDelayTimer: 0,
    combo: 0, comboTimer: 0, score: 0, grenades: START_GRENADES, lives: START_LIVES, fireCd: 0,
    keys: new Set<string>(), mouseDown: false, jumpHeld: false, grenadeHeld: false, grenadeQueued: false,
    enemyIdCounter: 0, announcement: "", announcementTimer: 0, announcementColor: "#fde047", bossPhase: 1, outcome: "none",
  };
}

const INITIAL_HUD: Hud = {
  health: PLAYER_MAX_HP, lives: START_LIVES, score: 0, wave: 0, combo: 0, grenades: START_GRENADES,
  announcement: "", announcementColor: "#fde047", bossActive: false, enemiesLeft: 0,
};

export function RunGun() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const gameRef = useRef<GameData>(makeGame());
  const stateRef = useRef<GameState>("ready");
  const sizeRef = useRef<{ w: number; h: number; dpr: number }>({ w: 800, h: 500, dpr: 1 });
  const uiTick = useRef(0);
  const [uiState, setUiState] = useState<GameState>("ready");
  const [hud, setHud] = useState<Hud>(INITIAL_HUD);

  const startGame = useCallback(() => {
    const groundY = sizeRef.current.h * GROUND_RATIO;
    const g = makeGame();
    g.player.y = groundY - PLAYER_H;
    g.player.onGround = true;
    gameRef.current = g;
    startWave(g, 1);
    stateRef.current = "playing";
    setUiState("playing");
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      canvas.style.width = rect.width + "px";
      canvas.style.height = rect.height + "px";
      sizeRef.current = { w: rect.width, h: rect.height, dpr };
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    const blocked = [" ", "arrowleft", "arrowright", "arrowup", "arrowdown", "a", "d", "j", "k", "w", "s"];
    const onKeyDown = (e: KeyboardEvent) => {
      if (stateRef.current !== "playing") return;
      const g = gameRef.current;
      const k = e.key.toLowerCase();
      if (blocked.includes(k)) e.preventDefault();
      g.keys.add(k);
      if ((k === " " || k === "w" || k === "arrowup") && !g.jumpHeld) {
        if (g.player.onGround) {
          g.player.vy = JUMP_V;
          g.player.onGround = false;
          spawnParticles(g, g.player.x + g.player.w / 2, g.player.y + g.player.h, 8, "#a08060", 2.5);
        }
        g.jumpHeld = true;
      }
      if (k === "k" && !g.grenadeHeld) { g.grenadeQueued = true; g.grenadeHeld = true; }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const g = gameRef.current;
      const k = e.key.toLowerCase();
      g.keys.delete(k);
      if (k === " " || k === "w" || k === "arrowup") g.jumpHeld = false;
      if (k === "k") g.grenadeHeld = false;
    };
    const onMouseDown = () => { if (stateRef.current === "playing") gameRef.current.mouseDown = true; };
    const onMouseUp = () => { gameRef.current.mouseDown = false; };
    const onBlur = () => {
      const g = gameRef.current;
      g.keys.clear(); g.mouseDown = false; g.jumpHeld = false; g.grenadeHeld = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("blur", onBlur);
    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const { w, h, dpr } = sizeRef.current;
      const groundY = h * GROUND_RATIO;
      const g = gameRef.current;
      if (stateRef.current === "playing" && g.outcome === "none") updateGame(g, w, h, groundY);
      if (g.outcome === "win" && stateRef.current === "playing") { stateRef.current = "win"; setUiState("win"); }
      if (g.outcome === "lose" && stateRef.current === "playing") { stateRef.current = "gameover"; setUiState("gameover"); }
      render(ctx, g, w, h, dpr, groundY);
      uiTick.current++;
      if (uiTick.current % 3 === 0) {
        const boss = g.enemies.find(e => e.type === "boss");
        setHud({
          health: Math.max(0, Math.round(g.player.health)), lives: g.lives, score: g.score, wave: g.wave,
          combo: g.combo, grenades: g.grenades,
          announcement: g.announcementTimer > 0 ? g.announcement : "", announcementColor: g.announcementColor,
          bossActive: !!boss, enemiesLeft: g.enemies.length + Math.max(0, g.waveQueue.length - g.waveSpawnedCount),
        });
      }
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  return (
    <div ref={wrapRef} className="relative w-full h-full overflow-hidden bg-sky-900 select-none" style={{ minHeight: 420 }}>
      <canvas ref={canvasRef} className="block w-full h-full" />
      {uiState === "playing" && (
        <>
          <div className="absolute top-3 left-3 flex flex-col gap-2 pointer-events-none">
            <div className="flex items-center gap-1">
              {[0, 1, 2].map((i) => (
                <Heart key={i} className={"w-5 h-5 " + (i < hud.lives ? "fill-red-500 text-red-500" : "text-red-900")} />
              ))}
            </div>
            <div className="w-44 h-3 rounded-full bg-black/50 overflow-hidden border border-black/40">
              <div className="h-full rounded-full transition-all" style={{ width: hud.health + "%", background: hud.health > 30 ? "linear-gradient(90deg,#22c55e,#86efac)" : "linear-gradient(90deg,#dc2626,#f87171)" }} />
            </div>
            <div className="text-white font-bold text-sm drop-shadow">Счёт: {hud.score.toLocaleString("ru")}</div>
            {hud.combo > 1 && <div className="text-yellow-300 font-black text-lg drop-shadow">x{hud.combo} КОМБО</div>}
          </div>
          <div className="absolute top-3 right-3 flex flex-col items-end gap-2 pointer-events-none">
            <div className="px-3 py-1 rounded-full bg-black/50 text-white font-bold text-sm">Волна {hud.wave} / {MAX_WAVES + 1}</div>
            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-black/50">
              <Zap className="w-4 h-4 text-orange-400" />
              <span className="text-white font-bold text-sm">{hud.grenades}</span>
            </div>
            {!hud.bossActive && hud.wave > 0 && (
              <div className="px-3 py-1 rounded-full bg-black/40 text-amber-200 text-xs font-semibold">Врагов: {hud.enemiesLeft}</div>
            )}
          </div>
          {hud.announcement && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-5xl font-black tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]" style={{ color: hud.announcementColor }}>
                {hud.announcement}
              </div>
            </div>
          )}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-3 text-[10px] text-white/60 font-mono pointer-events-none whitespace-nowrap">
            <span>A/D — движение</span>
            <span>Space — прыжок</span>
            <span>J — огонь</span>
            <span>K — граната</span>
          </div>
        </>
      )}
      {uiState === "ready" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-sky-900/90 to-amber-950/90 backdrop-blur-sm">
          <h1 className="text-5xl font-black text-amber-300 drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] mb-2 text-center px-4">Бобр: Штурм</h1>
          <p className="text-amber-100/80 mb-8 text-center px-4">Беги. Стреляй. Победи Барсука-Вождя.</p>
          <button onClick={startGame} className="px-8 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-lg flex items-center gap-2 transition-colors shadow-lg">
            <Play className="w-5 h-5" /> Нажми чтобы начать
          </button>
          <div className="mt-10 grid grid-cols-2 gap-x-8 gap-y-2 text-amber-100/80 text-sm font-mono">
            <span className="text-amber-300 font-bold">A / D</span><span>двигаться</span>
            <span className="text-amber-300 font-bold">Space / W</span><span>прыжок</span>
            <span className="text-amber-300 font-bold">J / ЛКМ</span><span>стрелять (удерживай)</span>
            <span className="text-amber-300 font-bold">K</span><span>граната (особый)</span>
          </div>
        </div>
      )}
      {uiState === "gameover" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-red-950/95 to-black/95 backdrop-blur-sm">
          <Skull className="w-16 h-16 text-red-500 mb-4" />
          <h1 className="text-5xl font-black text-red-400 mb-6 drop-shadow">Поражение</h1>
          <div className="text-center mb-8 space-y-1">
            <p className="text-white text-xl">Счёт: <span className="font-bold text-amber-300">{hud.score.toLocaleString("ru")}</span></p>
            <p className="text-white/70">Достигнута волна: {hud.wave}</p>
          </div>
          <button onClick={startGame} className="px-8 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-lg flex items-center gap-2 transition-colors shadow-lg">
            <RotateCcw className="w-5 h-5" /> Рестарт
          </button>
        </div>
      )}
      {uiState === "win" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-amber-700/95 to-emerald-900/95 backdrop-blur-sm">
          <Sparkles className="w-16 h-16 text-yellow-200 mb-4" />
          <h1 className="text-4xl font-black text-yellow-100 mb-2 text-center drop-shadow px-4">Победа! Босс повержен</h1>
          <p className="text-amber-100/80 mb-6 text-center px-4">Барсук-Вождь повержен! Лес свободен.</p>
          <div className="text-center mb-8">
            <p className="text-white text-2xl">Счёт: <span className="font-bold text-yellow-200">{hud.score.toLocaleString("ru")}</span></p>
          </div>
          <button onClick={startGame} className="px-8 py-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-amber-950 font-bold text-lg flex items-center gap-2 transition-colors shadow-lg">
            <RotateCcw className="w-5 h-5" /> Заново
          </button>
        </div>
      )}
    </div>
  );
}
