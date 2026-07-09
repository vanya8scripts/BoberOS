"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Flag, RotateCcw, Timer, Trophy } from "lucide-react";

type GameState = "ready" | "playing" | "win";

interface Vec { x: number; y: number; }

interface Kart {
  x: number; y: number; angle: number; speed: number;
  isPlayer: boolean; color: string; name: string;
  lap: number; checks: boolean[];
  finished: boolean; finishTime: number;
  lapStartTime: number; bestLapMs: number; lastLapMs: number;
  aiNoise: number; aiOffset: number; speedMult: number;
}

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; size: number; color: string;
}

interface HudState {
  lap: number; lapTimeMs: number; bestLapMs: number;
  position: number; total: number; speedKmh: number; lastLapMs: number;
}

interface GameData {
  karts: Kart[];
  particles: Particle[];
  keys: Set<string>;
  lastTime: number;
  elapsed: number;
  state: GameState;
}

const WORLD_W = 1500;
const WORLD_H = 950;
const TRACK_HW = 80;
const GRASS_HW = 134;
const LAPS_TO_WIN = 3;
const N_WP = 96;
const N_CHECKS = 4;
const MAX_SPEED = 5.6;
const MAX_REVERSE = -1.8;
const ACCEL = 0.14;
const BRAKE = 0.24;
const FRICTION = 0.985;
const TURN_RATE = 0.055;

function makeWaypoints(): Vec[] {
  const pts: Vec[] = [];
  const cx = WORLD_W / 2;
  const cy = WORLD_H / 2;
  for (let i = 0; i < N_WP; i++) {
    const t = (i / N_WP) * Math.PI * 2;
    const r = 290 + 70 * Math.sin(t * 3) + 22 * Math.cos(t * 2);
    pts.push({ x: cx + r * Math.cos(t) * 1.55, y: cy + r * Math.sin(t) * 1.0 });
  }
  return pts;
}

const WAYPOINTS = makeWaypoints();

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
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

function nearestWaypointIdx(p: Vec): number {
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < WAYPOINTS.length; i++) {
    const wp = WAYPOINTS[i];
    const d = (wp.x - p.x) ** 2 + (wp.y - p.y) ** 2;
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
  ctx.strokeStyle = "#241407";
  ctx.lineWidth = (GRASS_HW + 18) * 2;
  ctx.stroke();
  tracePath(ctx);
  ctx.strokeStyle = "#3f6b2a";
  ctx.lineWidth = GRASS_HW * 2;
  ctx.stroke();
  tracePath(ctx);
  ctx.strokeStyle = "#3a3a40";
  ctx.lineWidth = TRACK_HW * 2;
  ctx.stroke();
  tracePath(ctx);
  ctx.strokeStyle = "rgba(255,220,120,0.5)";
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
  const h = 22;
  const cols = 8;
  const cellW = w / cols;
  for (let row = 0; row < 2; row++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = (row + c) % 2 === 0 ? "#f5f5f5" : "#1a1a1a";
      ctx.fillRect(-h / 2 + row * (h / 2), -w / 2 + c * cellW, h / 2, cellW);
    }
  }
  ctx.restore();
}

function drawKart(ctx: CanvasRenderingContext2D, k: Kart, time: number): void {
  ctx.save();
  ctx.translate(k.x, k.y);
  ctx.rotate(k.angle);
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(2, 3, 24, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#5a3a1a";
  ctx.beginPath();
  ctx.ellipse(-26, 0, 11, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#2a1808";
  ctx.lineWidth = 1;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(-32, i * 3);
    ctx.lineTo(-22, i * 3);
    ctx.stroke();
  }
  ctx.fillStyle = "#1a1410";
  ctx.fillRect(-13, -16, 8, 6);
  ctx.fillRect(-13, 10, 8, 6);
  ctx.fillRect(6, -16, 8, 6);
  ctx.fillRect(6, 10, 8, 6);
  roundRectPath(ctx, -18, -12, 36, 24, 6);
  ctx.fillStyle = k.color;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = "rgba(200,230,255,0.45)";
  roundRectPath(ctx, 6, -10, 9, 20, 3);
  ctx.fill();
  ctx.fillStyle = "#7c5230";
  ctx.beginPath();
  ctx.ellipse(-2, 0, 9, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#9a6238";
  ctx.beginPath();
  ctx.arc(3, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#5a3a1a";
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
  ctx.fillRect(8, -1.6, 3.2, 3.2);
  ctx.strokeStyle = "#bbb";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(9.6, -1.6);
  ctx.lineTo(9.6, 1.6);
  ctx.stroke();
  ctx.fillStyle = "#2a1a0a";
  ctx.beginPath();
  ctx.arc(9, 0, 1, 0, Math.PI * 2);
  ctx.fill();
  if (k.isPlayer) {
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
  ctx.fillStyle = k.isPlayer ? "#ffd23f" : "#e8e8e8";
  ctx.font = "bold 12px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.strokeStyle = "rgba(0,0,0,0.75)";
  ctx.lineWidth = 3;
  ctx.strokeText(k.name, k.x, k.y - 28);
  ctx.fillText(k.name, k.x, k.y - 28);
}

function spawnParticle(particles: Particle[], x: number, y: number, vx: number, vy: number, life: number, size: number, color: string): void {
  particles.push({ x, y, vx, vy, life, maxLife: life, size, color });
}

function updateKart(k: Kart, dt: number, keys: Set<string>, time: number, particles: Particle[]): void {
  if (k.finished) {
    k.speed *= 0.9;
    k.x += Math.cos(k.angle) * k.speed * dt;
    k.y += Math.sin(k.angle) * k.speed * dt;
    return;
  }
  let throttle = 0;
  let brake = 0;
  let steer = 0;
  if (k.isPlayer) {
    if (keys.has("arrowup") || keys.has("w") || keys.has("ц")) throttle = 1;
    if (keys.has("arrowdown") || keys.has("s") || keys.has("ы")) brake = 1;
    if (keys.has("arrowleft") || keys.has("a") || keys.has("ф")) steer = -1;
    if (keys.has("arrowright") || keys.has("d") || keys.has("в")) steer = 1;
  } else {
    const curIdx = nearestWaypointIdx({ x: k.x, y: k.y });
    const target = WAYPOINTS[(curIdx + 6) % N_WP];
    const perp = k.angle + Math.PI / 2;
    const tx = target.x + Math.cos(perp) * k.aiOffset;
    const ty = target.y + Math.sin(perp) * k.aiOffset;
    const desired = Math.atan2(ty - k.y, tx - k.x);
    const diff = angleDiff(k.angle, desired);
    steer = clamp(diff * 2.6, -1, 1);
    throttle = 1;
    if (Math.abs(diff) > 1.0) throttle = 0.55;
    k.aiNoise += (Math.random() - 0.5) * 0.05 * dt;
    k.aiNoise = clamp(k.aiNoise, -0.18, 0.18);
    steer = clamp(steer + k.aiNoise, -1, 1);
  }
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
      450, 4 + Math.random() * 4, "rgba(225,225,225,0.7)");
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
  const idx = nearestWaypointIdx({ x: k.x, y: k.y });
  const checkIdx = Math.floor((idx / N_WP) * N_CHECKS);
  k.checks[checkIdx] = true;
  if (k.checks.every(Boolean) && checkIdx === 0) {
    k.checks = new Array(N_CHECKS).fill(false);
    k.checks[0] = true;
    const lapMs = time - k.lapStartTime;
    k.lastLapMs = lapMs;
    if (k.bestLapMs === 0 || lapMs < k.bestLapMs) k.bestLapMs = lapMs;
    k.lapStartTime = time;
    k.lap += 1;
    if (k.lap > LAPS_TO_WIN) {
      k.finished = true;
      k.finishTime = time;
    }
  }
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

function drawScene(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, g: GameData, now: number): void {
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const W = canvas.width / dpr;
  const H = canvas.height / dpr;
  if (W < 10 || H < 10) return;
  ctx.fillStyle = "#2a4a18";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(255,255,255,0.025)";
  for (let x = 0; x < W; x += 48) {
    for (let y = 0; y < H; y += 48) {
      if (((x + y) / 48) % 2 === 0) ctx.fillRect(x, y, 48, 48);
    }
  }
  const player = g.karts[0];
  const zoom = Math.min(W / 900, H / 620) * 0.95;
  const camX = player.x - W / (2 * zoom);
  const camY = player.y - H / (2 * zoom);
  ctx.save();
  ctx.scale(zoom, zoom);
  ctx.translate(-camX, -camY);
  drawTrack(ctx);
  drawParticles(ctx, g.particles);
  for (const k of g.karts) drawKart(ctx, k, now);
  ctx.restore();
}

function initGame(): GameData {
  const start = WAYPOINTS[0];
  const next = WAYPOINTS[1];
  const ang = Math.atan2(next.y - start.y, next.x - start.x);
  const perp = ang + Math.PI / 2;
  const mk = (color: string, name: string, isPlayer: boolean, offset: number, speedMult: number): Kart => ({
    x: start.x + Math.cos(perp) * offset,
    y: start.y + Math.sin(perp) * offset,
    angle: ang,
    speed: 0,
    isPlayer,
    color,
    name,
    lap: 1,
    checks: [false, false, false, false],
    finished: false,
    finishTime: 0,
    lapStartTime: 0,
    bestLapMs: 0,
    lastLapMs: 0,
    aiNoise: 0,
    aiOffset: offset,
    speedMult,
  });
  return {
    karts: [
      mk("#e23b3b", "Бобр", true, -28, 1.0),
      mk("#3b8de2", "Хвост", false, 28, 0.93),
      mk("#3be27a", "Плотина", false, -56, 0.95),
      mk("#e2c23b", "Резец", false, 56, 0.9),
    ],
    particles: [],
    keys: new Set<string>(),
    lastTime: 0,
    elapsed: 0,
    state: "ready",
  };
}

export function BoberKart() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<GameData | null>(null);
  const lastHudRef = useRef(0);
  const [state, setState] = useState<GameState>("ready");
  const [hud, setHud] = useState<HudState>({
    lap: 1, lapTimeMs: 0, bestLapMs: 0,
    position: 1, total: 4, speedKmh: 0, lastLapMs: 0,
  });

  const startGame = useCallback(() => {
    gameRef.current = initGame();
    gameRef.current.state = "playing";
    setState("playing");
    setHud({ lap: 1, lapTimeMs: 0, bestLapMs: 0, position: 1, total: 4, speedKmh: 0, lastLapMs: 0 });
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
        if (g.state === "playing") {
          g.elapsed += dt * 16.67;
          for (const k of g.karts) updateKart(k, dt, g.keys, g.elapsed, g.particles);
          updateParticles(g.particles, dt * 16.67);
          const player = g.karts[0];
          if (player.finished) {
            g.state = "win";
            setState("win");
          }
          if (now - lastHudRef.current > 90) {
            lastHudRef.current = now;
            const sorted = [...g.karts].sort((a, b) => {
              if (a.finished && b.finished) return a.finishTime - b.finishTime;
              if (a.finished) return -1;
              if (b.finished) return 1;
              const aIdx = nearestWaypointIdx({ x: a.x, y: a.y }) + a.lap * N_WP;
              const bIdx = nearestWaypointIdx({ x: b.x, y: b.y }) + b.lap * N_WP;
              return bIdx - aIdx;
            });
            const pos = sorted.indexOf(player) + 1;
            setHud({
              lap: Math.min(player.lap, LAPS_TO_WIN),
              lapTimeMs: g.elapsed - player.lapStartTime,
              bestLapMs: player.bestLapMs,
              lastLapMs: player.lastLapMs,
              position: pos,
              total: g.karts.length,
              speedKmh: Math.abs(player.speed) / MAX_SPEED * 220,
            });
          }
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
    <div ref={wrapRef} className="relative w-full h-full min-h-[400px] bg-[#2a4a18] overflow-hidden select-none">
      <canvas ref={canvasRef} className="block w-full h-full" />
      {state === "playing" && (
        <>
          <div className="absolute top-3 left-3 right-3 flex items-start justify-between pointer-events-none gap-2">
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
              <div className="text-2xl font-black leading-none">{hud.position}<span className="text-sm opacity-60">/{hud.total}</span></div>
            </div>
          </div>
          <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur rounded-lg px-3 py-2 text-white pointer-events-none">
            <div className="text-[10px] uppercase tracking-wider opacity-70">Скорость</div>
            <div className="text-xl font-bold leading-none">{Math.round(hud.speedKmh)}<span className="text-xs opacity-70"> км/ч</span></div>
            <div className="mt-1 h-1.5 w-28 bg-white/15 rounded overflow-hidden">
              <div className="h-full bg-amber-400 transition-[width] duration-100" style={{ width: `${Math.min(100, hud.speedKmh / 2.2)}%` }} />
            </div>
          </div>
        </>
      )}
      {state === "ready" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur p-4">
          <div className="bg-zinc-900/95 rounded-2xl p-6 max-w-md w-full text-center text-white shadow-2xl">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/20 mb-3">
              <Trophy className="w-9 h-9 text-amber-400" />
            </div>
            <h2 className="text-3xl font-black mb-1">БоброКарт</h2>
            <p className="text-zinc-400 mb-4 text-sm">Гонка картов с бобрами! 3 круга, 4 гонщика, одна плотина.</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-zinc-200 mb-4">
              <div className="bg-zinc-800 rounded p-2"><kbd className="font-mono text-amber-300">↑ / W</kbd> газ</div>
              <div className="bg-zinc-800 rounded p-2"><kbd className="font-mono text-amber-300">↓ / S</kbd> тормоз</div>
              <div className="bg-zinc-800 rounded p-2"><kbd className="font-mono text-amber-300">← / A</kbd> влево</div>
              <div className="bg-zinc-800 rounded p-2"><kbd className="font-mono text-amber-300">→ / D</kbd> вправо</div>
            </div>
            <button onClick={startGame} className="bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-bold px-6 py-3 rounded-lg transition inline-flex items-center gap-2">
              <Flag className="w-4 h-4" />Старт гонки
            </button>
          </div>
        </div>
      )}
      {state === "win" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/75 backdrop-blur p-4">
          <div className="bg-zinc-900/95 rounded-2xl p-6 max-w-md w-full text-center text-white shadow-2xl">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/20 mb-3">
              <Trophy className="w-9 h-9 text-amber-400" />
            </div>
            <h2 className="text-3xl font-black mb-1">Финиш!</h2>
            <p className="text-zinc-300 mb-4 text-sm">Позиция: <span className="font-bold text-amber-300">{hud.position}</span> из {hud.total}</p>
            <div className="bg-zinc-800 rounded-lg p-3 mb-4 space-y-1.5 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400 flex items-center gap-1.5"><Timer className="w-3.5 h-3.5" />Лучший круг</span>
                <span className="font-mono font-bold text-amber-300">{fmtTime(hud.bestLapMs)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Последний круг</span>
                <span className="font-mono">{fmtTime(hud.lastLapMs)}</span>
              </div>
            </div>
            <button onClick={startGame} className="bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-bold px-6 py-3 rounded-lg transition inline-flex items-center gap-2">
              <RotateCcw className="w-4 h-4" />Гонять снова
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
