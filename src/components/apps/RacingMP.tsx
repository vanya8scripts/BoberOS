"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createHostChannel, createGuestChannel } from "@/lib/mp";
import {
  Flag, LogOut, Plus, LogIn, Bot, RefreshCw, Trophy,
  Timer, Wifi, Copy, Check, Users, Gauge,
} from "lucide-react";

type Phase = "menu" | "lobby" | "playing" | "finished";
type RaceState = "countdown" | "racing" | "waitend" | "done";

interface Vec { x: number; y: number; }

interface Racer {
  id: string;
  name: string;
  color: string;
  isLocal: boolean;
  isBot: boolean;
  x: number;
  y: number;
  angle: number;
  speed: number;
  lap: number;
  checks: number;
  finished: boolean;
  finishTime: number;
  lapStartTime: number;
  bestLapMs: number;
  lastLapMs: number;
  aiOffset: number;
  aiNoise: number;
  speedMult: number;
  lastSeenAt: number;
  toX: number;
  toY: number;
  toAngle: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

type NetMsg =
  | { t: "hello"; id: string; name: string; color: string; lobby: string }
  | { t: "bye"; id: string; lobby: string }
  | { t: "state"; id: string; name: string; color: string; isBot: boolean; x: number; y: number; angle: number; speed: number; lap: number; checks: number; finished: boolean; finishTime: number; lobby: string; time: number }
  | { t: "start"; host: string; lobby: string; startAt: number; grid: Array<{ id: string; name: string; color: string; isBot: boolean }> }
  | { t: "backtolobby"; host: string; lobby: string };

interface LobbyPlayer {
  id: string;
  name: string;
  color: string;
  isLocal: boolean;
}

interface HudState {
  lap: number;
  lapTimeMs: number;
  bestLapMs: number;
  lastLapMs: number;
  position: number;
  total: number;
  speedKmh: number;
}

interface LiveRow {
  id: string;
  name: string;
  color: string;
  position: number;
  isLocal: boolean;
  finished: boolean;
  lap: number;
}

interface ResultRow {
  name: string;
  color: string;
  position: number;
  finished: boolean;
  finishTime: number;
  bestLapMs: number;
  isLocal: boolean;
  isBot: boolean;
}

const WORLD_W = 1500;
const WORLD_H = 950;
const TRACK_HW = 72;
const GRASS_HW = 112;
const LAPS_TO_WIN = 3;
const N_WP = 96;
const N_CHECKS = 4;
const ALL_CHECK_MASK = 15;
const MAX_SPEED = 5.6;
const MAX_REVERSE = -1.8;
const ACCEL = 0.14;
const BRAKE = 0.24;
const FRICTION = 0.985;
const TURN_RATE = 0.058;
const MIN_RACERS = 4;
const PEER_TIMEOUT_MS = 4000;
const STATE_INTERVAL_MS = 70;
const COUNTDOWN_MS = 3500;
const WAIT_END_MS = 15000;
const RACER_COLORS = ["#e23b3b", "#3b8de2", "#3be27a", "#e2c23b", "#e23be2", "#3be2c2"];
const BOT_NAMES = ["Хвост", "Плотина", "Резец", "Пилочка", "Бобёрчик", "Зубр"];
const KART_RADIUS = 18;

function randId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function randLobbyCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function normalizeAngle(a: number): number {
  let x = a;
  while (x > Math.PI) x -= Math.PI * 2;
  while (x < -Math.PI) x += Math.PI * 2;
  return x;
}

function angleDiff(from: number, to: number): number {
  return normalizeAngle(to - from);
}

function makeWaypoints(): Vec[] {
  const pts: Vec[] = [];
  const cx = WORLD_W / 2;
  const cy = WORLD_H / 2;
  for (let i = 0; i < N_WP; i++) {
    const t = (i / N_WP) * Math.PI * 2;
    const r = 290 + 26 * Math.sin(t * 3) + 12 * Math.cos(t * 2);
    pts.push({ x: cx + r * Math.cos(t) * 1.55, y: cy + r * Math.sin(t) });
  }
  return pts;
}

const WAYPOINTS = makeWaypoints();

function nearestWaypointIdx(p: Vec): number {
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < WAYPOINTS.length; i++) {
    const wp = WAYPOINTS[i];
    const d = (wp.x - p.x) * (wp.x - p.x) + (wp.y - p.y) * (wp.y - p.y);
    if (d < bestDist) { bestDist = d; bestIdx = i; }
  }
  return bestIdx;
}

function distToTrack(p: Vec): number {
  let best = Infinity;
  for (let i = 0; i < WAYPOINTS.length; i++) {
    const a = WAYPOINTS[i];
    const b = WAYPOINTS[(i + 1) % WAYPOINTS.length];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy || 1;
    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
    t = clamp(t, 0, 1);
    const px = a.x + t * dx;
    const py = a.y + t * dy;
    const d = Math.hypot(p.x - px, p.y - py);
    if (d < best) best = d;
  }
  return best;
}

function fmtTime(ms: number): string {
  if (!isFinite(ms) || ms <= 0) return "—:——.——";
  const total = ms / 1000;
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60);
  const cs = Math.floor((ms % 1000) / 10);
  return `${m}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
}

function positionLabel(pos: number): string {
  return `${pos}-е`;
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function tracePath(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  for (let i = 0; i < WAYPOINTS.length; i++) {
    const wp = WAYPOINTS[i];
    if (i === 0) ctx.moveTo(wp.x, wp.y);
    else ctx.lineTo(wp.x, wp.y);
  }
  ctx.closePath();
}

function drawTrack(ctx: CanvasRenderingContext2D): void {
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  tracePath(ctx);
  ctx.strokeStyle = "#15240a";
  ctx.lineWidth = (GRASS_HW + 18) * 2;
  ctx.stroke();
  tracePath(ctx);
  ctx.strokeStyle = "#2f5a1c";
  ctx.lineWidth = GRASS_HW * 2;
  ctx.stroke();
  tracePath(ctx);
  ctx.strokeStyle = "#5a3a1a";
  ctx.lineWidth = TRACK_HW * 2;
  ctx.stroke();
  tracePath(ctx);
  ctx.strokeStyle = "rgba(220,200,140,0.35)";
  ctx.lineWidth = 2;
  ctx.setLineDash([14, 20]);
  ctx.stroke();
  ctx.setLineDash([]);
  const start = WAYPOINTS[0];
  const next = WAYPOINTS[1];
  const ang = Math.atan2(next.y - start.y, next.x - start.x);
  ctx.save();
  ctx.translate(start.x, start.y);
  ctx.rotate(ang);
  const w = TRACK_HW * 2;
  const h = 18;
  const cols = 8;
  const cellW = w / cols;
  for (let row = 0; row < 2; row++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = (row + c) % 2 === 0 ? "#f5f5f5" : "#1a1a1a";
      ctx.fillRect(-h / 2 + row * (h / 2), -w / 2 + c * cellW, h / 2, cellW);
    }
  }
  ctx.restore();
  for (let i = 1; i < N_CHECKS; i++) {
    const wp = WAYPOINTS[Math.floor((i / N_CHECKS) * N_WP)];
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.arc(wp.x, wp.y, 10, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawKart(ctx: CanvasRenderingContext2D, k: Racer, time: number): void {
  ctx.save();
  ctx.translate(k.x, k.y);
  ctx.rotate(k.angle);
  ctx.fillStyle = "rgba(0,0,0,0.32)";
  ctx.beginPath();
  ctx.ellipse(2, 3, 24, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3a2410";
  ctx.beginPath();
  ctx.ellipse(-24, 0, 11, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a0f06";
  ctx.lineWidth = 1;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(-30, i * 3);
    ctx.lineTo(-18, i * 3);
    ctx.stroke();
  }
  ctx.fillStyle = "#1a1410";
  ctx.fillRect(-13, -16, 7, 5);
  ctx.fillRect(-13, 11, 7, 5);
  ctx.fillRect(6, -16, 7, 5);
  ctx.fillRect(6, 11, 7, 5);
  roundRectPath(ctx, -18, -12, 34, 24, 6);
  ctx.fillStyle = k.color;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.45)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = "rgba(220,240,255,0.4)";
  roundRectPath(ctx, 5, -10, 9, 20, 3);
  ctx.fill();
  ctx.fillStyle = "#6b4422";
  ctx.beginPath();
  ctx.ellipse(-2, 0, 9, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#8a5a30";
  ctx.beginPath();
  ctx.arc(3, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3a2410";
  ctx.beginPath();
  ctx.arc(2, -5, 2, 0, Math.PI * 2);
  ctx.arc(2, 5, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1a0a05";
  ctx.beginPath();
  ctx.arc(6, -3, 1.3, 0, Math.PI * 2);
  ctx.arc(6, 3, 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(8, -1.6, 3, 3);
  if (k.isLocal) {
    const bob = Math.sin(time / 200) * 1.2;
    ctx.fillStyle = "#ffd23f";
    ctx.beginPath();
    ctx.moveTo(0, -22 + bob);
    ctx.lineTo(4, -18 + bob);
    ctx.lineTo(-4, -18 + bob);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = k.isLocal ? "#ffd23f" : "#e8e8e8";
  ctx.font = "bold 12px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.strokeStyle = "rgba(0,0,0,0.8)";
  ctx.lineWidth = 3;
  ctx.strokeText(k.name, k.x, k.y - 26);
  ctx.fillText(k.name, k.x, k.y - 26);
  if (k.finished) {
    ctx.fillStyle = "#ffd23f";
    ctx.font = "bold 11px system-ui, sans-serif";
    ctx.fillText("ФИНИШ", k.x, k.y - 40);
  }
}

function spawnParticle(particles: Particle[], x: number, y: number, vx: number, vy: number, life: number, size: number, color: string): void {
  if (particles.length > 240) particles.shift();
  particles.push({ x, y, vx, vy, life, maxLife: life, size, color });
}

function updateParticles(particles: Particle[], dtMs: number): void {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dtMs * 0.06;
    p.y += p.vy * dtMs * 0.06;
    p.vx *= 0.94;
    p.vy *= 0.94;
    p.life -= dtMs;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
  for (const p of particles) {
    const a = clamp(p.life / p.maxLife, 0, 1);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawScene(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, racers: Racer[], particles: Particle[], localId: string, now: number): void {
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const W = canvas.width / dpr;
  const H = canvas.height / dpr;
  if (W < 10 || H < 10) return;
  ctx.fillStyle = "#1f3812";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(255,255,255,0.025)";
  for (let x = 0; x < W; x += 48) {
    for (let y = 0; y < H; y += 48) {
      if (((x + y) / 48) % 2 === 0) ctx.fillRect(x, y, 48, 48);
    }
  }
  const local = racers.find((r) => r.id === localId);
  const focusX = local ? local.x : WORLD_W / 2;
  const focusY = local ? local.y : WORLD_H / 2;
  const zoom = Math.min(W / 900, H / 620) * 0.95;
  const camX = focusX - W / (2 * zoom);
  const camY = focusY - H / (2 * zoom);
  ctx.save();
  ctx.scale(zoom, zoom);
  ctx.translate(-camX, -camY);
  drawTrack(ctx);
  drawParticles(ctx, particles);
  const sorted = [...racers].sort((a, b) => a.y - b.y);
  for (const r of sorted) drawKart(ctx, r, now);
  ctx.restore();
}

function gridPosition(gridIndex: number): { x: number; y: number; angle: number } {
  const start = WAYPOINTS[0];
  const next = WAYPOINTS[1];
  const ang = Math.atan2(next.y - start.y, next.x - start.x);
  const perp = ang + Math.PI / 2;
  const back = ang + Math.PI;
  const cols = 2;
  const col = gridIndex % cols;
  const row = Math.floor(gridIndex / cols);
  const colOffset = (col === 0 ? -1 : 1) * 24;
  const rowOffset = row * 42 + 14;
  return {
    x: start.x + Math.cos(perp) * colOffset + Math.cos(back) * rowOffset,
    y: start.y + Math.sin(perp) * colOffset + Math.sin(back) * rowOffset,
    angle: ang,
  };
}

function newRacer(id: string, name: string, color: string, isLocal: boolean, isBot: boolean): Racer {
  return {
    id, name, color, isLocal, isBot,
    x: WORLD_W / 2, y: WORLD_H / 2, angle: 0, speed: 0,
    lap: 1, checks: 1, finished: false, finishTime: 0,
    lapStartTime: 0, bestLapMs: 0, lastLapMs: 0,
    aiOffset: 0, aiNoise: 0, speedMult: 1.0,
    lastSeenAt: Date.now(),
    toX: WORLD_W / 2, toY: WORLD_H / 2, toAngle: 0,
  };
}

function applyGridToRacer(r: Racer, gridIndex: number): void {
  const pos = gridPosition(gridIndex);
  r.x = pos.x;
  r.y = pos.y;
  r.angle = pos.angle;
  r.speed = 0;
  r.lap = 1;
  r.checks = 1;
  r.finished = false;
  r.finishTime = 0;
  r.lapStartTime = 0;
  r.bestLapMs = 0;
  r.lastLapMs = 0;
  r.aiOffset = (Math.random() - 0.5) * 30;
  r.aiNoise = 0;
  r.speedMult = r.isBot ? 0.88 + Math.random() * 0.18 : 1.0;
  r.toX = pos.x;
  r.toY = pos.y;
  r.toAngle = pos.angle;
}

function applyPhysics(k: Racer, dt: number, throttle: number, brake: number, steer: number, particles: Particle[]): void {
  const surfDist = distToTrack({ x: k.x, y: k.y });
  const onTrack = surfDist <= TRACK_HW;
  const onGrass = surfDist > TRACK_HW && surfDist < GRASS_HW;
  const maxSpeed = (onTrack ? MAX_SPEED : onGrass ? MAX_SPEED * 0.55 : 0) * k.speedMult;
  const grip = onTrack ? 1.0 : onGrass ? 0.55 : 0.3;
  let accel = ACCEL * throttle - BRAKE * brake;
  if (throttle === 0 && brake === 0) accel = -0.04;
  k.speed += accel * dt;
  k.speed *= Math.pow(FRICTION, dt);
  if (k.speed > maxSpeed) k.speed = lerp(k.speed, maxSpeed, clamp(0.18 * dt, 0, 1));
  k.speed = clamp(k.speed, MAX_REVERSE, MAX_SPEED);
  const speedFactor = clamp(Math.abs(k.speed) / MAX_SPEED, 0, 1);
  const dirSign = k.speed >= 0 ? 1 : -1;
  const turn = steer * TURN_RATE * speedFactor * grip * dirSign;
  k.angle += turn * dt;
  const oldX = k.x;
  const oldY = k.y;
  k.x += Math.cos(k.angle) * k.speed * dt;
  k.y += Math.sin(k.angle) * k.speed * dt;
  if (distToTrack({ x: k.x, y: k.y }) >= GRASS_HW) {
    k.x = oldX;
    k.y = oldY;
    k.speed *= -0.25;
  }
  k.x = clamp(k.x, 20, WORLD_W - 20);
  k.y = clamp(k.y, 20, WORLD_H - 20);
  const driftAmount = Math.abs(turn) * speedFactor;
  if (driftAmount > 0.018 && Math.abs(k.speed) > 2.4) {
    const back = k.angle + Math.PI;
    spawnParticle(particles,
      k.x + Math.cos(back) * 16 + (Math.random() - 0.5) * 6,
      k.y + Math.sin(back) * 16 + (Math.random() - 0.5) * 6,
      Math.cos(back) * 0.6 + (Math.random() - 0.5) * 0.8,
      Math.sin(back) * 0.6 + (Math.random() - 0.5) * 0.8,
      450, 4 + Math.random() * 4, "rgba(225,210,180,0.7)");
  }
  if (onGrass && Math.abs(k.speed) > 1.2) {
    const back = k.angle + Math.PI;
    spawnParticle(particles,
      k.x + Math.cos(back) * 14 + (Math.random() - 0.5) * 8,
      k.y + Math.sin(back) * 14 + (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 1.4,
      (Math.random() - 0.5) * 1.4,
      350, 5 + Math.random() * 4, "rgba(110,160,60,0.6)");
  }
}

function updateLaps(k: Racer, time: number): void {
  if (k.finished) return;
  const idx = nearestWaypointIdx({ x: k.x, y: k.y });
  const checkIdx = Math.floor((idx / N_WP) * N_CHECKS);
  k.checks = k.checks | (1 << checkIdx);
  if (k.checks === ALL_CHECK_MASK && checkIdx === 0) {
    k.checks = 1;
    const lapMs = time - k.lapStartTime;
    if (k.lap > 0 && lapMs > 0) {
      k.lastLapMs = lapMs;
      if (k.bestLapMs === 0 || lapMs < k.bestLapMs) k.bestLapMs = lapMs;
    }
    k.lapStartTime = time;
    k.lap += 1;
    if (k.lap > LAPS_TO_WIN) {
      k.finished = true;
      k.finishTime = time;
    }
  }
}

function updateLocalKart(k: Racer, dt: number, keys: Set<string>, time: number, particles: Particle[], racingActive: boolean): void {
  if (k.finished) {
    k.speed *= 0.92;
    k.x += Math.cos(k.angle) * k.speed * dt;
    k.y += Math.sin(k.angle) * k.speed * dt;
    return;
  }
  let throttle = 0;
  let brake = 0;
  let steer = 0;
  if (racingActive) {
    if (keys.has("arrowup") || keys.has("w") || keys.has("ц")) throttle = 1;
    if (keys.has("arrowdown") || keys.has("s") || keys.has("ы")) brake = 1;
    if (keys.has("arrowleft") || keys.has("a") || keys.has("ф")) steer = -1;
    if (keys.has("arrowright") || keys.has("d") || keys.has("в")) steer = 1;
  }
  applyPhysics(k, dt, throttle, brake, steer, particles);
  if (racingActive) updateLaps(k, time);
}

function updateBotKart(k: Racer, dt: number, time: number, particles: Particle[], racingActive: boolean): void {
  if (k.finished) {
    k.speed *= 0.92;
    k.x += Math.cos(k.angle) * k.speed * dt;
    k.y += Math.sin(k.angle) * k.speed * dt;
    return;
  }
  let throttle = 0;
  let steer = 0;
  if (racingActive) {
    const curIdx = nearestWaypointIdx({ x: k.x, y: k.y });
    const target = WAYPOINTS[(curIdx + 6) % N_WP];
    const perp = k.angle + Math.PI / 2;
    const tx = target.x + Math.cos(perp) * k.aiOffset;
    const ty = target.y + Math.sin(perp) * k.aiOffset;
    const desired = Math.atan2(ty - k.y, tx - k.x);
    const diff = angleDiff(k.angle, desired);
    steer = clamp(diff * 2.6, -1, 1);
    throttle = 1;
    if (Math.abs(diff) > 1.0) throttle = 0.5;
    k.aiNoise += (Math.random() - 0.5) * 0.05 * dt;
    k.aiNoise = clamp(k.aiNoise, -0.18, 0.18);
    steer = clamp(steer + k.aiNoise, -1, 1);
  }
  applyPhysics(k, dt, throttle, 0, steer, particles);
  if (racingActive) updateLaps(k, time);
}

function updateRemoteRacer(k: Racer, dt: number): void {
  k.x = lerp(k.x, k.toX, clamp(0.22 * dt, 0, 1));
  k.y = lerp(k.y, k.toY, clamp(0.22 * dt, 0, 1));
  const diff = angleDiff(k.angle, k.toAngle);
  k.angle = normalizeAngle(k.angle + diff * clamp(0.22 * dt, 0, 1));
}

function handleLocalCollisions(local: Racer, others: Racer[]): void {
  for (const other of others) {
    if (other.id === local.id) continue;
    const dx = other.x - local.x;
    const dy = other.y - local.y;
    const dist = Math.hypot(dx, dy);
    const minDist = KART_RADIUS * 2;
    if (dist < minDist && dist > 0.001) {
      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = minDist - dist;
      local.x -= nx * overlap;
      local.y -= ny * overlap;
      const dot = Math.cos(local.angle) * nx + Math.sin(local.angle) * ny;
      if (dot > 0) local.speed *= 0.55;
      else local.speed *= -0.25;
    }
  }
}

function handleBotCollisions(bots: Racer[]): void {
  for (let i = 0; i < bots.length; i++) {
    for (let j = i + 1; j < bots.length; j++) {
      const a = bots[i];
      const b = bots[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      const minDist = KART_RADIUS * 2;
      if (dist < minDist && dist > 0.001) {
        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = minDist - dist;
        a.x -= nx * overlap * 0.5;
        a.y -= ny * overlap * 0.5;
        b.x += nx * overlap * 0.5;
        b.y += ny * overlap * 0.5;
        const tmp = a.speed;
        a.speed = b.speed * 0.65;
        b.speed = tmp * 0.65;
      }
    }
  }
}

function computeProgress(k: Racer): number {
  const idx = nearestWaypointIdx({ x: k.x, y: k.y });
  return k.lap * N_WP + idx;
}

function computePositions(racers: Racer[]): Map<string, number> {
  const sorted = [...racers].sort((a, b) => {
    if (a.finished && b.finished) return a.finishTime - b.finishTime;
    if (a.finished) return -1;
    if (b.finished) return 1;
    return computeProgress(b) - computeProgress(a);
  });
  const map = new Map<string, number>();
  sorted.forEach((r, i) => map.set(r.id, i + 1));
  return map;
}

export function RacingMP() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const racersRef = useRef<Map<string, Racer>>(new Map());
  const particlesRef = useRef<Particle[]>([]);
  const keysRef = useRef<Set<string>>(new Set());
  const channelRef = useRef<{ postMessage: (m: unknown) => void; close: () => void; ready: boolean; onmessage: ((e: { data: unknown }) => void) | null; onready: (() => void) | null; onerror: ((e: string) => void) | null; onpeerjoin: ((id: string) => void) | null; onpeerleave: ((id: string) => void) | null; isHost: boolean } | null>(null);
  const lastTimeRef = useRef(0);
  const lastStateSentRef = useRef(0);
  const raceStartAtRef = useRef(0);
  const raceElapsedRef = useRef(0);
  const raceStateRef = useRef<RaceState>("countdown");
  const waitEndStartRef = useRef(0);
  const lastHudRef = useRef(0);
  const countdownShownRef = useRef(0);
  const showStartUntilRef = useRef(0);

  const localIdRef = useRef<string>(randId());
  const nameRef = useRef<string>("Бобр" + Math.floor(Math.random() * 900 + 100));
  const colorRef = useRef<string>(RACER_COLORS[Math.floor(Math.random() * RACER_COLORS.length)]);
  const lobbyRef = useRef<string>("");
  const knownHostRef = useRef<string>("");
  const lastHostMsgAtRef = useRef(0);
  const joinedAtRef = useRef(0);

  const [phase, setPhase] = useState<Phase>("menu");
  const phaseRef = useRef<Phase>("menu");
  const [name, setName] = useState(nameRef.current);
  const [color, setColor] = useState(colorRef.current);
  const [lobbyCode, setLobbyCode] = useState("");
  const [lobbyInput, setLobbyInput] = useState("");
  const [lobbyPlayers, setLobbyPlayers] = useState<LobbyPlayer[]>([]);
  const [copied, setCopied] = useState(false);
  const [hud, setHud] = useState<HudState>({
    lap: 1, lapTimeMs: 0, bestLapMs: 0, lastLapMs: 0,
    position: 1, total: MIN_RACERS, speedKmh: 0,
  });
  const [results, setResults] = useState<ResultRow[]>([]);
  const [countdown, setCountdown] = useState(0);
  const [showStart, setShowStart] = useState(false);
  const [isHost, setIsHost] = useState(true);
  const [connectedCount, setConnectedCount] = useState(1);
  const [livePositions, setLivePositions] = useState<LiveRow[]>([]);

  const setPhaseSync = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const sendNet = useCallback((msg: NetMsg) => {
    const ch = channelRef.current;
    if (ch) {
      try { ch.postMessage(msg); } catch { void 0; }
    }
  }, []);

  const determineHost = useCallback((): string => {
    if (knownHostRef.current && Date.now() - lastHostMsgAtRef.current < PEER_TIMEOUT_MS) {
      return knownHostRef.current;
    }
    if (Date.now() - joinedAtRef.current < 600) {
      return "";
    }
    const ids: string[] = [localIdRef.current];
    racersRef.current.forEach((p) => {
      if (!p.isBot && !p.isLocal && Date.now() - p.lastSeenAt < PEER_TIMEOUT_MS) ids.push(p.id);
    });
    ids.sort();
    return ids[0];
  }, []);

  const beginRace = useCallback((grid: Array<{ id: string; name: string; color: string; isBot: boolean }>, startAt: number) => {
    racersRef.current.clear();
    particlesRef.current = [];
    for (let i = 0; i < grid.length; i++) {
      const g = grid[i];
      const isLocal = g.id === localIdRef.current;
      const r = newRacer(g.id, g.name, g.color, isLocal, g.isBot);
      applyGridToRacer(r, i);
      racersRef.current.set(g.id, r);
    }
    raceStartAtRef.current = startAt;
    raceElapsedRef.current = 0;
    raceStateRef.current = "countdown";
    waitEndStartRef.current = 0;
    countdownShownRef.current = 0;
    showStartUntilRef.current = 0;
    setResults([]);
    setLivePositions([]);
    setCountdown(Math.ceil((startAt - Date.now()) / 1000));
    setShowStart(false);
    setPhaseSync("playing");
  }, [setPhaseSync]);

  const handleNet = useCallback((msg: NetMsg) => {
    if (msg.lobby !== lobbyRef.current) return;
    if (msg.t === "hello") {
      if (msg.id === localIdRef.current) return;
      const existing = racersRef.current.get(msg.id);
      if (!existing) {
        const p = newRacer(msg.id, msg.name, msg.color, false, false);
        racersRef.current.set(msg.id, p);
      } else {
        existing.name = msg.name;
        existing.color = msg.color;
        existing.lastSeenAt = Date.now();
      }
      setLobbyPlayers((prev) => {
        if (prev.some((p) => p.id === msg.id)) return prev;
        return [...prev, { id: msg.id, name: msg.name, color: msg.color, isLocal: false }];
      });
      const local = racersRef.current.get(localIdRef.current);
      sendNet({
        t: "state", id: localIdRef.current, name: nameRef.current, color: colorRef.current, isBot: false,
        x: local ? local.x : WORLD_W / 2,
        y: local ? local.y : WORLD_H / 2,
        angle: local ? local.angle : 0,
        speed: local ? local.speed : 0,
        lap: local ? local.lap : 1,
        checks: local ? local.checks : 1,
        finished: local ? local.finished : false,
        finishTime: local ? local.finishTime : 0,
        lobby: lobbyRef.current, time: Date.now(),
      });
      return;
    }
    if (msg.t === "bye") {
      racersRef.current.delete(msg.id);
      setLobbyPlayers((prev) => prev.filter((p) => p.id !== msg.id));
      return;
    }
    if (msg.t === "state") {
      if (msg.id === localIdRef.current) return;
      let p = racersRef.current.get(msg.id);
      if (!p) {
        p = newRacer(msg.id, msg.name, msg.color, false, msg.isBot);
        racersRef.current.set(msg.id, p);
      }
      p.name = msg.name;
      p.color = msg.color;
      p.toX = msg.x;
      p.toY = msg.y;
      p.toAngle = msg.angle;
      p.speed = msg.speed;
      p.lap = msg.lap;
      p.checks = msg.checks;
      p.finished = msg.finished;
      p.finishTime = msg.finishTime;
      p.lastSeenAt = Date.now();
      return;
    }
    if (msg.t === "start") {
      const host = determineHost();
      if (msg.host !== host && host !== "") return;
      knownHostRef.current = msg.host;
      lastHostMsgAtRef.current = Date.now();
      beginRace(msg.grid, msg.startAt);
      return;
    }
    if (msg.t === "backtolobby") {
      const host = determineHost();
      if (msg.host !== host && host !== "") return;
      knownHostRef.current = msg.host;
      lastHostMsgAtRef.current = Date.now();
      racersRef.current.clear();
      const local = newRacer(localIdRef.current, nameRef.current, colorRef.current, true, false);
      racersRef.current.set(localIdRef.current, local);
      setLobbyPlayers((prev) => prev.filter((p) => p.isLocal));
      setPhaseSync("lobby");
      return;
    }
  }, [beginRace, determineHost, sendNet, setPhaseSync]);

  const setupChannel = useCallback((code: string, isHost: boolean) => {
    if (channelRef.current) {
      try {
        channelRef.current.postMessage({ t: "bye", id: localIdRef.current, lobby: lobbyRef.current } as NetMsg);
        channelRef.current.close();
      } catch { void 0; }
    }
    lobbyRef.current = code;
    knownHostRef.current = "";
    lastHostMsgAtRef.current = 0;
    joinedAtRef.current = Date.now();
    const ch = isHost ? createHostChannel(code) : createGuestChannel(code);
    channelRef.current = ch;
    ch.onmessage = (ev: { data: unknown }) => handleNet(ev.data as NetMsg);
    ch.onready = () => {
      sendNet({ t: "hello", id: localIdRef.current, name: nameRef.current, color: colorRef.current, lobby: code });
    };
    ch.onpeerjoin = () => { void 0; };
    ch.onpeerleave = (id: string) => { racersRef.current.delete(id); };
    ch.onerror = () => { void 0; };
  }, [handleNet, sendNet]);

  const createLobby = useCallback(() => {
    const code = randLobbyCode();
    nameRef.current = name.trim() || "Бобр" + Math.floor(Math.random() * 900 + 100);
    racersRef.current.clear();
    const local = newRacer(localIdRef.current, nameRef.current, colorRef.current, true, false);
    racersRef.current.set(localIdRef.current, local);
    setupChannel(code, true);
    setLobbyCode(code);
    setLobbyPlayers([{ id: localIdRef.current, name: nameRef.current, color: colorRef.current, isLocal: true }]);
    setCopied(false);
    setPhaseSync("lobby");
  }, [name, setupChannel, setPhaseSync]);

  const joinLobby = useCallback(() => {
    const code = lobbyInput.trim().toUpperCase();
    if (code.length !== 6) return;
    nameRef.current = name.trim() || "Бобр" + Math.floor(Math.random() * 900 + 100);
    racersRef.current.clear();
    const local = newRacer(localIdRef.current, nameRef.current, colorRef.current, true, false);
    racersRef.current.set(localIdRef.current, local);
    setupChannel(code, false);
    setLobbyCode(code);
    setLobbyPlayers([{ id: localIdRef.current, name: nameRef.current, color: colorRef.current, isLocal: true }]);
    setPhaseSync("lobby");
  }, [lobbyInput, name, setupChannel, setPhaseSync]);

  const leaveLobby = useCallback(() => {
    sendNet({ t: "bye", id: localIdRef.current, lobby: lobbyRef.current });
    if (channelRef.current) {
      try { channelRef.current.close(); } catch { void 0; }
      channelRef.current = null;
    }
    racersRef.current.clear();
    setLobbyCode("");
    setLobbyPlayers([]);
    setPhaseSync("menu");
  }, [sendNet, setPhaseSync]);

  const startRace = useCallback(() => {
    const host = determineHost();
    if (host !== "" && host !== localIdRef.current) return;
    const humans: Array<{ id: string; name: string; color: string; isBot: boolean }> = [];
    humans.push({ id: localIdRef.current, name: nameRef.current, color: colorRef.current, isBot: false });
    racersRef.current.forEach((r) => {
      if (r.id === localIdRef.current) return;
      if (r.isBot) return;
      if (Date.now() - r.lastSeenAt > PEER_TIMEOUT_MS) return;
      humans.push({ id: r.id, name: r.name, color: r.color, isBot: false });
    });
    humans.sort((a, b) => a.id.localeCompare(b.id));
    const grid = [...humans];
    const localColorIdx = RACER_COLORS.indexOf(colorRef.current);
    let colorOffset = (localColorIdx + 1) % RACER_COLORS.length;
    let nameOffset = Math.floor(Math.random() * BOT_NAMES.length);
    while (grid.length < MIN_RACERS) {
      const botId = "bot-" + randId().slice(0, 6);
      const botName = BOT_NAMES[nameOffset % BOT_NAMES.length];
      const botColor = RACER_COLORS[colorOffset % RACER_COLORS.length];
      grid.push({ id: botId, name: botName, color: botColor, isBot: true });
      colorOffset = (colorOffset + 1) % RACER_COLORS.length;
      nameOffset = (nameOffset + 1) % BOT_NAMES.length;
    }
    const startAt = Date.now() + COUNTDOWN_MS;
    beginRace(grid, startAt);
    sendNet({ t: "start", host: localIdRef.current, lobby: lobbyRef.current, startAt, grid });
  }, [beginRace, determineHost, sendNet]);

  const playWithBots = useCallback(() => {
    const code = randLobbyCode();
    nameRef.current = name.trim() || "Бобр" + Math.floor(Math.random() * 900 + 100);
    racersRef.current.clear();
    const local = newRacer(localIdRef.current, nameRef.current, colorRef.current, true, false);
    racersRef.current.set(localIdRef.current, local);
    setupChannel(code, true);
    setLobbyCode(code);
    setLobbyPlayers([{ id: localIdRef.current, name: nameRef.current, color: colorRef.current, isLocal: true }]);
    window.setTimeout(() => startRace(), 120);
  }, [name, setupChannel, startRace]);

  const backToLobby = useCallback(() => {
    const host = determineHost();
    if (host === localIdRef.current) {
      sendNet({ t: "backtolobby", host: localIdRef.current, lobby: lobbyRef.current });
    }
    racersRef.current.clear();
    const local = newRacer(localIdRef.current, nameRef.current, colorRef.current, true, false);
    racersRef.current.set(localIdRef.current, local);
    setLobbyPlayers([{ id: localIdRef.current, name: nameRef.current, color: colorRef.current, isLocal: true }]);
    setPhaseSync("lobby");
  }, [determineHost, sendNet, setPhaseSync]);

  const finalizeRace = useCallback(() => {
    const racers = [...racersRef.current.values()];
    const positions = computePositions(racers);
    const rows: ResultRow[] = racers.map((r) => ({
      name: r.name,
      color: r.color,
      position: positions.get(r.id) ?? 99,
      finished: r.finished,
      finishTime: r.finishTime,
      bestLapMs: r.bestLapMs,
      isLocal: r.isLocal,
      isBot: r.isBot,
    })).sort((a, b) => a.position - b.position);
    setResults(rows);
    setPhaseSync("finished");
  }, [setPhaseSync]);

  const updateHud = useCallback(() => {
    const racers = [...racersRef.current.values()];
    const local = racers.find((r) => r.id === localIdRef.current);
    if (!local) return;
    const positions = computePositions(racers);
    const pos = positions.get(localIdRef.current) ?? 1;
    setHud({
      lap: Math.min(local.lap, LAPS_TO_WIN),
      lapTimeMs: Math.max(0, raceElapsedRef.current - local.lapStartTime),
      bestLapMs: local.bestLapMs,
      lastLapMs: local.lastLapMs,
      position: pos,
      total: racers.length,
      speedKmh: Math.abs(local.speed) / MAX_SPEED * 220,
    });
    setLivePositions(racers.map((r) => ({
      id: r.id,
      name: r.name,
      color: r.color,
      position: positions.get(r.id) ?? 99,
      isLocal: r.isLocal,
      finished: r.finished,
      lap: r.lap,
    })).sort((a, b) => a.position - b.position));
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
      keysRef.current.add(k);
    };
    const up = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };
    const blur = () => keysRef.current.clear();
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
    const cv = canvasRef.current;
    const wrap = wrapRef.current;
    if (!cv || !wrap) return;
    const ro = new ResizeObserver(() => {
      const rect = wrap.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(2, Math.floor(rect.width));
      const h = Math.max(2, Math.floor(rect.height));
      cv.width = Math.floor(w * dpr);
      cv.height = Math.floor(h * dpr);
      cv.style.width = w + "px";
      cv.style.height = h + "px";
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let raf = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const cv = canvasRef.current;
      if (!cv) return;
      const ctx = cv.getContext("2d");
      if (!ctx) return;
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = now;
        drawScene(ctx, cv, [...racersRef.current.values()], particlesRef.current, localIdRef.current, now);
        return;
      }
      let dt = (now - lastTimeRef.current) / 16.67;
      lastTimeRef.current = now;
      if (dt > 2.5) dt = 2.5;
      const dtMs = dt * 16.67;
      if (phaseRef.current === "playing") {
        const local = racersRef.current.get(localIdRef.current);
        const host = determineHost();
        const isHostNow = host === localIdRef.current;
        const racingActive = raceStateRef.current === "racing" || raceStateRef.current === "waitend";
        if (local) {
          updateLocalKart(local, dt, keysRef.current, raceElapsedRef.current, particlesRef.current, racingActive);
          handleLocalCollisions(local, [...racersRef.current.values()]);
        }
        if (isHostNow) {
          const bots: Racer[] = [];
          racersRef.current.forEach((r) => { if (r.isBot) bots.push(r); });
          for (const b of bots) {
            updateBotKart(b, dt, raceElapsedRef.current, particlesRef.current, racingActive);
          }
          handleBotCollisions(bots);
        }
        racersRef.current.forEach((r) => {
          if (r.id === localIdRef.current) return;
          if (r.isBot && isHostNow) return;
          updateRemoteRacer(r, dt);
        });
        updateParticles(particlesRef.current, dtMs);
        if (raceStateRef.current === "countdown") {
          raceElapsedRef.current = 0;
          const remaining = raceStartAtRef.current - Date.now();
          if (remaining <= 0) {
            raceStateRef.current = "racing";
            raceElapsedRef.current = 1;
            racersRef.current.forEach((r) => { r.lapStartTime = 0; });
            countdownShownRef.current = 0;
            showStartUntilRef.current = Date.now() + 1200;
            setCountdown(0);
            setShowStart(true);
            window.setTimeout(() => setShowStart(false), 1200);
          } else {
            const sec = Math.ceil(remaining / 1000);
            if (sec !== countdownShownRef.current) {
              countdownShownRef.current = sec;
              setCountdown(sec);
            }
          }
        } else if (raceStateRef.current === "racing" || raceStateRef.current === "waitend") {
          raceElapsedRef.current += dtMs;
          if (raceStateRef.current === "racing" && local && local.finished) {
            raceStateRef.current = "waitend";
            waitEndStartRef.current = Date.now();
          }
          if (raceStateRef.current === "waitend") {
            const allFinished = [...racersRef.current.values()].every((r) => r.finished);
            const timeout = Date.now() - waitEndStartRef.current > WAIT_END_MS;
            if (allFinished || timeout) {
              raceStateRef.current = "done";
              finalizeRace();
            }
          }
        }
        if (now - lastStateSentRef.current > STATE_INTERVAL_MS) {
          lastStateSentRef.current = now;
          if (local) {
            sendNet({
              t: "state", id: localIdRef.current, name: nameRef.current, color: colorRef.current, isBot: false,
              x: local.x, y: local.y, angle: local.angle, speed: local.speed,
              lap: local.lap, checks: local.checks, finished: local.finished, finishTime: local.finishTime,
              lobby: lobbyRef.current, time: Date.now(),
            });
          }
          if (isHostNow) {
            racersRef.current.forEach((r) => {
              if (!r.isBot) return;
              sendNet({
                t: "state", id: r.id, name: r.name, color: r.color, isBot: true,
                x: r.x, y: r.y, angle: r.angle, speed: r.speed,
                lap: r.lap, checks: r.checks, finished: r.finished, finishTime: r.finishTime,
                lobby: lobbyRef.current, time: Date.now(),
              });
            });
          }
        }
        if (now - lastHudRef.current > 90) {
          lastHudRef.current = now;
          updateHud();
        }
      }
      drawScene(ctx, cv, [...racersRef.current.values()], particlesRef.current, localIdRef.current, now);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [determineHost, finalizeRace, sendNet, updateHud]);

  useEffect(() => {
    const iv = window.setInterval(() => {
      const host = determineHost();
      const local = racersRef.current.get(localIdRef.current);
      if (!local) {
        setIsHost(true);
        setConnectedCount(1);
        return;
      }
      const realHost = host === "" ? localIdRef.current : host;
      setIsHost(realHost === localIdRef.current);
      const humans = [...racersRef.current.values()].filter((r) => !r.isBot && Date.now() - r.lastSeenAt < PEER_TIMEOUT_MS);
      setConnectedCount(humans.length);
    }, 500);
    return () => window.clearInterval(iv);
  }, [determineHost]);

  useEffect(() => {
    return () => {
      if (channelRef.current) {
        try {
          channelRef.current.postMessage({ t: "bye", id: localIdRef.current, lobby: lobbyRef.current } as NetMsg);
          channelRef.current.close();
        } catch { void 0; }
        channelRef.current = null;
      }
    };
  }, []);

  const copyCode = useCallback(() => {
    try { navigator.clipboard?.writeText(lobbyCode); } catch { void 0; }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }, [lobbyCode]);

  return (
    <div ref={wrapRef} className="relative w-full h-full min-h-[480px] bg-[#1f3812] overflow-hidden select-none">
      <canvas ref={canvasRef} className="block w-full h-full" />

      {phase === "menu" && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-emerald-950 via-emerald-900 to-zinc-950 p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl border border-amber-700/40 bg-zinc-900/85 p-6 shadow-2xl my-auto">
            <div className="text-center mb-5">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/20 mb-3">
                <Trophy className="w-9 h-9 text-amber-400" />
              </div>
              <h1 className="text-3xl font-black text-amber-300 tracking-tight">БоброГонки MP</h1>
              <p className="text-emerald-300/70 text-sm mt-1">Многопользовательские гонки бобров-картов</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-amber-300/70 mb-1">Имя гонщика</label>
                <input
                  value={name}
                  onChange={(e) => { setName(e.target.value); nameRef.current = e.target.value; }}
                  maxLength={14}
                  className="w-full bg-black/60 border border-amber-900/50 rounded-lg px-3 py-2 text-amber-100 text-sm outline-none focus:border-amber-500"
                  placeholder="Бобр123"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-amber-300/70 mb-1">Цвет карта</label>
                <div className="flex gap-2 flex-wrap">
                  {RACER_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => { setColor(c); colorRef.current = c; }}
                      className={`w-9 h-9 rounded-full border-2 transition ${color === c ? "border-white scale-110" : "border-transparent opacity-70 hover:opacity-100"}`}
                      style={{ backgroundColor: c }}
                      aria-label={c}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={createLobby}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm transition"
              >
                <Plus className="w-4 h-4" /> Создать лобби
              </button>
              <button
                onClick={playWithBots}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-amber-100 font-bold text-sm transition"
              >
                <Bot className="w-4 h-4" /> С ботами
              </button>
            </div>

            <div className="mt-3 pt-3 border-t border-amber-900/30">
              <label className="block text-[11px] uppercase tracking-wider text-amber-300/70 mb-1">Войти по коду</label>
              <div className="flex gap-2">
                <input
                  value={lobbyInput}
                  onChange={(e) => setLobbyInput(e.target.value.toUpperCase().slice(0, 6))}
                  className="flex-1 bg-black/60 border border-amber-900/50 rounded-lg px-3 py-2 text-amber-100 text-sm font-mono tracking-[0.4em] outline-none focus:border-amber-500 text-center"
                  placeholder="XXXXXX"
                  maxLength={6}
                />
                <button
                  onClick={joinLobby}
                  disabled={lobbyInput.length !== 6}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition"
                >
                  <LogIn className="w-4 h-4" /> Войти
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] text-amber-200/70 font-mono">
              <div className="px-2 py-1.5 rounded bg-black/40 border border-amber-900/40 text-center"><b className="text-amber-300">↑ / W</b> газ</div>
              <div className="px-2 py-1.5 rounded bg-black/40 border border-amber-900/40 text-center"><b className="text-amber-300">↓ / S</b> тормоз</div>
              <div className="px-2 py-1.5 rounded bg-black/40 border border-amber-900/40 text-center"><b className="text-amber-300">← / A</b> влево</div>
              <div className="px-2 py-1.5 rounded bg-black/40 border border-amber-900/40 text-center"><b className="text-amber-300">→ / D</b> вправо</div>
            </div>
          </div>
        </div>
      )}

      {phase === "lobby" && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-emerald-950 via-emerald-900 to-zinc-950 p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl border border-amber-700/40 bg-zinc-900/85 p-6 shadow-2xl my-auto">
            <div className="text-center">
              <p className="text-xs uppercase tracking-widest text-amber-400/70">Код лобби</p>
              <p className="mt-1 text-4xl font-black tracking-[0.4em] text-amber-300" style={{ textShadow: "0 0 20px rgba(251,191,36,0.4)" }}>{lobbyCode}</p>
              <button
                onClick={copyCode}
                className="mt-2 text-xs text-amber-300/60 hover:text-amber-200 inline-flex items-center gap-1"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? "скопировано" : "скопировать код"}
              </button>
              <p className="mt-3 text-xs text-zinc-400">
                Открой сайт в новой вкладке и введи этот код, чтобы присоединиться.
                Или нажми «Старт» для игры с ботами.
              </p>
            </div>

            <div className="mt-5">
              <p className="mb-2 text-[11px] uppercase tracking-wide text-zinc-500 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Игроки в лобби ({lobbyPlayers.length})
              </p>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {lobbyPlayers.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 rounded-lg bg-white/5 p-2">
                    <span className="h-3 w-3 rounded-full border border-white/30" style={{ backgroundColor: p.color }} />
                    <span className="flex-1 text-sm text-amber-100">{p.name}{p.isLocal && " (ты)"}</span>
                  </div>
                ))}
                {lobbyPlayers.length < 2 && (
                  <div className="flex items-center gap-2 rounded-lg border border-dashed border-white/15 p-2 text-xs text-zinc-500">
                    <span className="h-3 w-3 animate-pulse rounded-full bg-zinc-600" />
                    Ожидание игроков...
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={startRace}
                disabled={!isHost}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-zinc-900 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Flag className="h-4 w-4" /> {isHost ? "Старт гонки" : "Ждём хозяина"}
              </button>
              <button
                onClick={leaveLobby}
                className="rounded-xl bg-white/10 px-4 py-2.5 text-sm text-white/70 hover:bg-white/20 inline-flex items-center gap-1"
              >
                <LogOut className="w-4 h-4" /> Выйти
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === "playing" && (
        <>
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
              <div className="bg-black/70 backdrop-blur rounded-lg px-3 py-2 text-white">
                <div className="text-[10px] uppercase tracking-wider opacity-70">Круг</div>
                <div className="text-2xl font-black leading-none">{hud.lap}<span className="text-sm opacity-60">/{LAPS_TO_WIN}</span></div>
              </div>
              <div className="bg-black/70 backdrop-blur rounded-lg px-4 py-2 text-white text-center">
                <div className="text-[10px] uppercase tracking-wider opacity-70">Время круга</div>
                <div className="text-xl font-mono font-bold">{fmtTime(hud.lapTimeMs)}</div>
                <div className="text-[10px] opacity-70 mt-0.5">Лучший: {fmtTime(hud.bestLapMs)}</div>
              </div>
              <div className="bg-black/70 backdrop-blur rounded-lg px-3 py-2 text-white text-right">
                <div className="text-[10px] uppercase tracking-wider opacity-70">Позиция</div>
                <div className="text-2xl font-black leading-none">{positionLabel(hud.position)}<span className="text-sm opacity-60"> / {hud.total}</span></div>
              </div>
            </div>

            <div className="absolute top-24 left-3 bg-black/70 backdrop-blur rounded-lg px-3 py-2 text-white text-xs max-w-[180px]">
              <div className="text-[10px] uppercase tracking-wider opacity-70 mb-1 flex items-center gap-1"><Users className="w-3 h-3" /> Позиции</div>
              <div className="space-y-0.5 max-h-48 overflow-y-auto">
                {livePositions.map((p) => (
                  <div key={p.id} className="flex items-center gap-1.5">
                    <span className="font-mono font-bold w-5 text-amber-300">{p.position}</span>
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                    <span className={`truncate ${p.isLocal ? "text-amber-300 font-bold" : "text-amber-100/80"}`}>{p.name}</span>
                    {p.finished && <span className="text-emerald-400 text-[10px] shrink-0">фин</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="absolute top-24 right-3 bg-black/70 backdrop-blur rounded-lg px-3 py-2 text-[11px] font-mono text-amber-100">
              <div className="flex items-center gap-1.5 text-amber-200 mb-1">
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span>{connectedCount} в лобби</span>
              </div>
              <div className="text-amber-300/80">Код: <b className="tracking-[0.3em] text-amber-200">{lobbyCode}</b></div>
              <div className="text-amber-200/50 mt-0.5">{isHost ? "хозяин лобби" : "гость"}</div>
            </div>

            <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur rounded-lg px-3 py-2 text-white">
              <div className="text-[10px] uppercase tracking-wider opacity-70 flex items-center gap-1"><Gauge className="w-3 h-3" /> Скорость</div>
              <div className="text-xl font-bold leading-none">{Math.round(hud.speedKmh)}<span className="text-xs opacity-70"> км/ч</span></div>
              <div className="mt-1 h-1.5 w-28 bg-white/15 rounded overflow-hidden">
                <div className="h-full bg-amber-400" style={{ width: `${Math.min(100, hud.speedKmh / 2.2)}%` }} />
              </div>
            </div>

            <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur rounded-lg px-3 py-2 text-white text-xs">
              <div className="text-[10px] uppercase tracking-wider opacity-70 mb-1 flex items-center gap-1"><Timer className="w-3 h-3" /> Управление</div>
              <div className="font-mono text-amber-200/80">↑/W газ · ↓/S тормоз</div>
              <div className="font-mono text-amber-200/80">←→/AD руль</div>
            </div>
          </div>

          {countdown > 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-[10rem] font-black text-amber-300 leading-none" style={{ textShadow: "0 0 40px rgba(251,191,36,0.6)" }}>{countdown}</div>
                <div className="text-amber-200/70 text-sm font-mono mt-2">Приготовьтесь...</div>
              </div>
            </div>
          )}
          {showStart && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="text-[7rem] font-black text-emerald-300 leading-none animate-pulse" style={{ textShadow: "0 0 40px rgba(110,231,183,0.7)" }}>СТАРТ!</div>
            </div>
          )}
        </>
      )}

      {phase === "finished" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-amber-700/40 bg-zinc-900/95 p-6 shadow-2xl my-auto">
            <div className="text-center mb-5">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/20 mb-3">
                <Trophy className="w-9 h-9 text-amber-400" />
              </div>
              <h2 className="text-3xl font-black text-amber-300">Финиш!</h2>
              <p className="text-zinc-400 text-sm mt-1">Гонка завершена</p>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {results.map((r, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-3 rounded-lg p-3 ${r.isLocal ? "bg-amber-500/15 border border-amber-500/50" : "bg-white/5"}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg ${
                    r.position === 1 ? "bg-amber-400 text-black" :
                    r.position === 2 ? "bg-zinc-300 text-black" :
                    r.position === 3 ? "bg-orange-700 text-white" :
                    "bg-zinc-700 text-white"
                  }`}>
                    {r.position}
                  </div>
                  <span className="h-4 w-4 rounded-full border border-white/30 shrink-0" style={{ backgroundColor: r.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-amber-100 truncate flex items-center gap-1">
                      <span className="truncate">{r.name}{r.isLocal && " (ты)"}</span>
                      {r.isBot && <Bot className="w-3 h-3 text-zinc-400 shrink-0" />}
                    </div>
                    <div className="text-[11px] text-zinc-400 font-mono">
                      {r.finished ? `Время: ${fmtTime(r.finishTime)}` : "Не финишировал"}
                      {r.bestLapMs > 0 && ` · Лучший круг: ${fmtTime(r.bestLapMs)}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={backToLobby}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-zinc-900 hover:bg-amber-400"
              >
                <RefreshCw className="w-4 h-4" /> В лобби
              </button>
              <button
                onClick={leaveLobby}
                className="rounded-xl bg-white/10 px-4 py-2.5 text-sm text-white/70 hover:bg-white/20 inline-flex items-center gap-1"
              >
                <LogOut className="w-4 h-4" /> В меню
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
