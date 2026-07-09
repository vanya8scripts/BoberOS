"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Coins, Gauge, RotateCcw, Sparkles, Trophy } from "lucide-react";

type GameState = "ready" | "playing" | "dead" | "win";

interface Rect { x: number; y: number; w: number; h: number; }
interface Platform extends Rect { type: "ground" | "log" | "wall"; }
type Spike = Rect;
interface Mover {
  x: number; y: number; w: number; h: number;
  baseX: number; baseY: number;
  ax: number; ay: number;
  speed: number; phase: number;
  prevX: number; prevY: number;
}
interface Coin { x: number; y: number; taken: boolean; }
interface Checkpoint { x: number; y: number; w: number; h: number; reached: boolean; }
interface Goal { x: number; y: number; w: number; h: number; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number; }
interface TrailDot { x: number; y: number; life: number; }
interface Player {
  x: number; y: number; vx: number; vy: number;
  w: number; h: number;
  onGround: boolean;
  onWall: number;
  jumpsLeft: number;
  coyote: number;
  jumpBuffer: number;
  jumpHeld: boolean;
  dashCD: number;
  dashTime: number;
  dashDir: number;
  wallLock: number;
  facing: number;
  trail: TrailDot[];
  runFrame: number;
  runTick: number;
  dead: boolean;
  deadTimer: number;
}
interface Level {
  platforms: Platform[];
  movers: Mover[];
  spikes: Spike[];
  coins: Coin[];
  checkpoints: Checkpoint[];
  goal: Goal;
  startX: number;
  startY: number;
  width: number;
  height: number;
}

const GRAVITY = 0.62;
const MOVE_ACCEL = 0.85;
const AIR_ACCEL = 0.55;
const MAX_RUN = 5.4;
const FRICTION = 0.78;
const AIR_DRAG = 0.96;
const JUMP_V = -12.6;
const DOUBLE_JUMP_V = -11.2;
const WALL_JUMP_VX = 8;
const WALL_JUMP_VY = -12.2;
const WALL_SLIDE_V = 2.6;
const DASH_SPEED = 13.5;
const DASH_TIME = 9;
const DASH_CD = 42;
const COYOTE = 6;
const JUMP_BUFFER = 7;
const PLAYER_W = 26;
const PLAYER_H = 36;
const DEATH_Y = 760;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function buildLevel(): Level {
  const platforms: Platform[] = [];
  const movers: Mover[] = [];
  const spikes: Spike[] = [];
  const coins: Coin[] = [];
  const checkpoints: Checkpoint[] = [];
  const G = 560;

  platforms.push({ x: 0, y: G, w: 540, h: 90, type: "ground" });
  coins.push({ x: 200, y: G - 60, taken: false });
  coins.push({ x: 280, y: G - 60, taken: false });
  coins.push({ x: 360, y: G - 60, taken: false });

  platforms.push({ x: 620, y: G - 40, w: 80, h: 24, type: "log" });
  coins.push({ x: 660, y: G - 80, taken: false });
  platforms.push({ x: 760, y: G - 80, w: 80, h: 24, type: "log" });
  coins.push({ x: 800, y: G - 120, taken: false });

  platforms.push({ x: 880, y: G, w: 620, h: 90, type: "ground" });
  spikes.push({ x: 1060, y: G - 18, w: 70, h: 18 });
  spikes.push({ x: 1180, y: G - 18, w: 60, h: 18 });
  coins.push({ x: 980, y: G - 60, taken: false });
  coins.push({ x: 1300, y: G - 60, taken: false });

  platforms.push({ x: 1400, y: 260, w: 36, h: 200, type: "wall" });
  platforms.push({ x: 1540, y: 260, w: 36, h: 200, type: "wall" });
  coins.push({ x: 1488, y: 420, taken: false });
  coins.push({ x: 1488, y: 360, taken: false });
  coins.push({ x: 1488, y: 300, taken: false });

  platforms.push({ x: 1576, y: 240, w: 200, h: 24, type: "log" });
  checkpoints.push({ x: 1620, y: 180, w: 20, h: 60, reached: false });
  coins.push({ x: 1720, y: 210, taken: false });

  platforms.push({ x: 2000, y: 240, w: 120, h: 24, type: "log" });
  coins.push({ x: 1850, y: 200, taken: false });
  coins.push({ x: 1910, y: 200, taken: false });

  platforms.push({ x: 2180, y: 300, w: 90, h: 24, type: "log" });
  platforms.push({ x: 2320, y: 360, w: 90, h: 24, type: "log" });
  platforms.push({ x: 2460, y: 420, w: 90, h: 24, type: "log" });
  coins.push({ x: 2225, y: 270, taken: false });
  coins.push({ x: 2365, y: 330, taken: false });
  coins.push({ x: 2505, y: 390, taken: false });

  platforms.push({ x: 2600, y: G, w: 240, h: 90, type: "ground" });
  spikes.push({ x: 2660, y: G - 18, w: 60, h: 18 });
  spikes.push({ x: 2760, y: G - 18, w: 60, h: 18 });

  movers.push({ x: 2920, y: 460, w: 100, h: 22, baseX: 2920, baseY: 460, ax: 110, ay: 0, speed: 0.022, phase: 0, prevX: 2920, prevY: 460 });
  coins.push({ x: 2970, y: 420, taken: false });
  movers.push({ x: 3160, y: 360, w: 100, h: 22, baseX: 3160, baseY: 360, ax: 0, ay: 90, speed: 0.026, phase: 1.5, prevX: 3160, prevY: 360 });
  coins.push({ x: 3210, y: 320, taken: false });

  platforms.push({ x: 3360, y: G, w: 200, h: 90, type: "ground" });
  checkpoints.push({ x: 3400, y: G - 60, w: 20, h: 60, reached: false });
  coins.push({ x: 3480, y: G - 60, taken: false });

  spikes.push({ x: 3560, y: 700, w: 380, h: 18 });
  platforms.push({ x: 3640, y: G - 40, w: 70, h: 24, type: "log" });
  platforms.push({ x: 3780, y: G - 40, w: 70, h: 24, type: "log" });
  coins.push({ x: 3675, y: G - 80, taken: false });
  coins.push({ x: 3815, y: G - 80, taken: false });

  platforms.push({ x: 3920, y: G, w: 180, h: 90, type: "ground" });

  platforms.push({ x: 4160, y: 500, w: 80, h: 24, type: "log" });
  platforms.push({ x: 4300, y: 440, w: 80, h: 24, type: "log" });
  platforms.push({ x: 4440, y: 380, w: 80, h: 24, type: "log" });
  coins.push({ x: 4200, y: 470, taken: false });
  coins.push({ x: 4340, y: 410, taken: false });
  coins.push({ x: 4480, y: 350, taken: false });

  platforms.push({ x: 4580, y: 380, w: 300, h: 24, type: "log" });
  const goal = { x: 4700, y: 300, w: 24, h: 80 };
  coins.push({ x: 4640, y: 350, taken: false });
  coins.push({ x: 4800, y: 350, taken: false });

  return { platforms, movers, spikes, coins, checkpoints, goal, startX: 60, startY: G - PLAYER_H, width: 4920, height: 740 };
}

function drawBeaver(ctx: CanvasRenderingContext2D, px: number, py: number, facing: number, frame: number, airborne: boolean, dashing: boolean): void {
  ctx.save();
  ctx.translate(px + PLAYER_W / 2, py + PLAYER_H / 2);
  if (facing < 0) ctx.scale(-1, 1);
  if (dashing) {
    ctx.shadowColor = "rgba(255,200,90,0.95)";
    ctx.shadowBlur = 16;
  }
  const bx = -PLAYER_W / 2;
  const by = -PLAYER_H / 2;
  ctx.fillStyle = "#3a200a";
  ctx.beginPath();
  ctx.ellipse(bx + 2, by + 22, 6, 9, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#5a3a1c";
  ctx.beginPath();
  ctx.ellipse(bx + 2, by + 22, 3, 6, -0.3, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createLinearGradient(0, by + 8, 0, by + 32);
  g.addColorStop(0, "#a86a38");
  g.addColorStop(1, "#6e4220");
  ctx.fillStyle = g;
  roundRect(ctx, bx + 4, by + 8, 20, 26, 9);
  ctx.fill();
  ctx.fillStyle = "#e7b978";
  roundRect(ctx, bx + 8, by + 16, 14, 14, 7);
  ctx.fill();
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(bx + 21, by + 12, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#4a2c12";
  ctx.beginPath();
  ctx.arc(bx + 17, by + 4, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#c98a52";
  ctx.beginPath();
  ctx.arc(bx + 17, by + 4, 1.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ecd29a";
  ctx.beginPath();
  ctx.arc(bx + 27, by + 15, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1a1208";
  ctx.beginPath();
  ctx.arc(bx + 23, by + 9, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(bx + 23.6, by + 8.4, 0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2a1a0a";
  ctx.beginPath();
  ctx.arc(bx + 30, by + 14, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fdfdf0";
  ctx.fillRect(bx + 27, by + 16, 2.3, 4);
  ctx.fillRect(bx + 29.6, by + 16, 2.3, 4);
  ctx.fillStyle = "#4a2c12";
  if (airborne) {
    roundRect(ctx, bx + 7, by + 31, 6, 5, 2);
    ctx.fill();
    roundRect(ctx, bx + 16, by + 31, 6, 5, 2);
    ctx.fill();
  } else if (frame === 0) {
    roundRect(ctx, bx + 6, by + 32, 6, 4, 2);
    ctx.fill();
    roundRect(ctx, bx + 16, by + 29, 6, 4, 2);
    ctx.fill();
  } else {
    roundRect(ctx, bx + 6, by + 29, 6, 4, 2);
    ctx.fill();
    roundRect(ctx, bx + 16, by + 32, 6, 4, 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawLog(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, vertical: boolean): void {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, "#b27a44");
  g.addColorStop(0.5, "#8a5530");
  g.addColorStop(1, "#5e3820");
  ctx.fillStyle = g;
  roundRect(ctx, x, y, w, h, Math.min(h / 2, w / 2, 8));
  ctx.fill();
  const rc = Math.max(3, Math.min(h / 2 - 1, w / 2 - 1, 7));
  ctx.fillStyle = "#caa06a";
  ctx.beginPath();
  if (!vertical) ctx.ellipse(x + 5, y + h / 2, 4, rc, 0, 0, Math.PI * 2);
  else ctx.ellipse(x + w / 2, y + 5, rc, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#7a4a26";
  ctx.beginPath();
  if (!vertical) ctx.ellipse(x + 5, y + h / 2, 2, Math.max(1.5, rc - 2), 0, 0, Math.PI * 2);
  else ctx.ellipse(x + w / 2, y + 5, Math.max(1.5, rc - 2), 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(50,26,8,0.32)";
  ctx.lineWidth = 1;
  if (!vertical) {
    for (let i = 1; i < 3; i++) {
      const yy = y + (h / 3) * i;
      ctx.beginPath();
      ctx.moveTo(x + 6, yy);
      ctx.bezierCurveTo(x + w * 0.3, yy - 1.5, x + w * 0.6, yy + 1.5, x + w - 6, yy);
      ctx.stroke();
    }
  } else {
    for (let i = 1; i < 5; i++) {
      const xx = x + (w / 5) * i;
      ctx.beginPath();
      ctx.moveTo(xx, y + 6);
      ctx.bezierCurveTo(xx - 1.5, y + h * 0.3, xx + 1.5, y + h * 0.6, xx, y + h - 6);
      ctx.stroke();
    }
  }
}

function drawGround(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, "#8a5530");
  g.addColorStop(1, "#4e2e18");
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#4f8f3a";
  ctx.fillRect(x, y, w, 7);
  ctx.fillStyle = "#62ab48";
  ctx.fillRect(x, y, w, 2);
  ctx.fillStyle = "#3f7d3a";
  for (let i = 4; i < w; i += 14) {
    ctx.fillRect(x + i, y - 3, 2, 5);
    ctx.fillRect(x + i + 5, y - 2, 1, 4);
  }
  ctx.fillStyle = "rgba(40,20,8,0.35)";
  for (let i = 8; i < w; i += 26) {
    ctx.fillRect(x + i, y + 16, 3, 2);
    ctx.fillRect(x + i + 11, y + 28, 2, 2);
  }
}

function drawSpikes(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  const n = Math.max(1, Math.floor(w / 14));
  const sw = w / n;
  for (let i = 0; i < n; i++) {
    const sx = x + i * sw;
    ctx.fillStyle = "#3a5a2a";
    ctx.beginPath();
    ctx.moveTo(sx, y + h);
    ctx.lineTo(sx + sw / 2, y);
    ctx.lineTo(sx + sw, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#2a4220";
    ctx.beginPath();
    ctx.moveTo(sx + sw / 2, y);
    ctx.lineTo(sx + sw, y + h);
    ctx.lineTo(sx + sw / 2, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#d4dfa0";
    ctx.beginPath();
    ctx.arc(sx + sw / 2, y + 3, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCoin(ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
  const bob = Math.sin(t * 0.08 + x * 0.05) * 3;
  const cy = y + bob;
  ctx.save();
  ctx.shadowColor = "rgba(255,200,60,0.7)";
  ctx.shadowBlur = 8;
  ctx.fillStyle = "#f5c042";
  ctx.beginPath();
  ctx.arc(x, cy, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "#ffe089";
  ctx.beginPath();
  ctx.arc(x - 2, cy - 2, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#8a5530";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x - 4, cy + 3);
  ctx.lineTo(x + 4, cy - 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 3, cy + 1);
  ctx.lineTo(x - 1, cy);
  ctx.moveTo(x + 1, cy + 4);
  ctx.lineTo(x + 3, cy + 3);
  ctx.stroke();
}

function drawFlag(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, reached: boolean, isGoal: boolean, t: number): void {
  ctx.fillStyle = "#4a2c12";
  ctx.fillRect(x + w / 2 - 2, y, 4, h);
  ctx.fillStyle = "#6a3c1e";
  ctx.fillRect(x + w / 2 - 2, y, 1, h);
  ctx.fillStyle = "#caa06a";
  ctx.beginPath();
  ctx.arc(x + w / 2, y - 2, 3, 0, Math.PI * 2);
  ctx.fill();
  const wave = Math.sin(t * 0.12) * 2.4;
  const fy = y + 4;
  const fw = 26;
  if (isGoal) {
    ctx.fillStyle = "#e84d4d";
    ctx.beginPath();
    ctx.moveTo(x + w / 2 + 2, fy);
    ctx.lineTo(x + w / 2 + fw, fy + 7 + wave);
    ctx.lineTo(x + w / 2 + 2, fy + 16);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("★", x + w / 2 + fw / 2 + 2, fy + 9 + wave / 2);
  } else {
    ctx.fillStyle = reached ? "#4fd06a" : "#d4a23a";
    ctx.beginPath();
    ctx.moveTo(x + w / 2 + 2, fy);
    ctx.lineTo(x + w / 2 + fw, fy + 7 + wave);
    ctx.lineTo(x + w / 2 + 2, fy + 16);
    ctx.closePath();
    ctx.fill();
    if (reached) {
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.beginPath();
      ctx.moveTo(x + w / 2 + 2, fy);
      ctx.lineTo(x + w / 2 + 14, fy + 5 + wave);
      ctx.lineTo(x + w / 2 + 2, fy + 8);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.fillStyle = "#4a2c12";
  ctx.fillRect(x + w / 2 - 7, y + h - 4, 14, 4);
}

function drawHillLayer(ctx: CanvasRenderingContext2D, w: number, h: number, off: number, baseY: number, amp: number, color: string): void {
  ctx.fillStyle = color;
  const hillW = 220;
  const start = -(off % hillW);
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(0, baseY);
  for (let i = 0; i < w / hillW + 2; i++) {
    const hx = start + i * hillW;
    ctx.quadraticCurveTo(hx + hillW / 2, baseY - amp, hx + hillW, baseY);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
}

function drawTreeLine(ctx: CanvasRenderingContext2D, w: number, h: number, off: number, baseY: number, color: string, gap: number): void {
  const start = -(off % gap);
  for (let i = 0; i < w / gap + 2; i++) {
    const tx = start + i * gap + 40;
    ctx.fillStyle = "#5a3a1c";
    ctx.fillRect(tx - 2, baseY - 16, 4, 16);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(tx, baseY - 44);
    ctx.lineTo(tx - 14, baseY - 16);
    ctx.lineTo(tx + 14, baseY - 16);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.moveTo(tx, baseY - 44);
    ctx.lineTo(tx, baseY - 16);
    ctx.lineTo(tx + 14, baseY - 16);
    ctx.closePath();
    ctx.fill();
  }
}

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number, camX: number, camY: number): void {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#9ed8ec");
  sky.addColorStop(0.55, "#cfe9d8");
  sky.addColorStop(1, "#e8f0d4");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  const sunX = w * 0.82 - camX * 0.03;
  const sunY = h * 0.2 - camY * 0.02;
  ctx.save();
  ctx.fillStyle = "rgba(255,244,194,0.4)";
  ctx.beginPath();
  ctx.arc(sunX, sunY, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff4c2";
  ctx.beginPath();
  ctx.arc(sunX, sunY, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  drawHillLayer(ctx, w, h, camX * 0.15, h * 0.66 - camY * 0.05, 70, "#a8c8a0");
  const riverY = h * 0.7 - camY * 0.06;
  ctx.fillStyle = "#7ec8d4";
  ctx.fillRect(0, riverY, w, 24);
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  const roff = (camX * 0.3) % 34;
  for (let i = -1; i < w / 34 + 2; i++) {
    ctx.fillRect(i * 34 - roff, riverY + 8, 16, 2);
  }
  drawTreeLine(ctx, w, h, camX * 0.25, h * 0.72 - camY * 0.07, "#7ab048", 95);
  drawTreeLine(ctx, w, h, camX * 0.45, h * 0.78 - camY * 0.1, "#5a8a3a", 70);
  drawTreeLine(ctx, w, h, camX * 0.65, h * 0.84 - camY * 0.14, "#4a7a2e", 52);
  drawTreeLine(ctx, w, h, camX * 0.8, h * 0.88 - camY * 0.18, "#3f6a2a", 46);
  drawTreeLine(ctx, w, h, camX * 1.0, h * 0.92 - camY * 0.22, "#2f5a20", 38);
}

export function Parkour() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const stateRef = useRef<GameState>("ready");
  const [state, setState] = useState<GameState>("ready");
  const [timeStr, setTimeStr] = useState("0.0");
  const [coinCount, setCoinCount] = useState(0);
  const [totalCoins, setTotalCoins] = useState(0);

  const sizeRef = useRef({ w: 640, h: 360 });
  const levelRef = useRef<Level>(buildLevel());
  const playerRef = useRef<Player>({
    x: 60, y: 524, vx: 0, vy: 0, w: PLAYER_W, h: PLAYER_H,
    onGround: true, onWall: 0, jumpsLeft: 1, coyote: COYOTE, jumpBuffer: 0,
    jumpHeld: false, dashCD: 0, dashTime: 0, dashDir: 1, wallLock: 0,
    facing: 1, trail: [], runFrame: 0, runTick: 0, dead: false, deadTimer: 0,
  });
  const camRef = useRef({ x: 0, y: 0 });
  const particlesRef = useRef<Particle[]>([]);
  const shakeRef = useRef({ time: 0, mag: 0 });
  const elapsedRef = useRef(0);
  const checkpointRef = useRef(-1);
  const inputRef = useRef({ left: false, right: false, jump: false, jumpQueued: false, dashQueued: false });
  const lastTenthsRef = useRef(-1);
  const lastCoinsRef = useRef(-1);
  const standingMoverRef = useRef<Mover | null>(null);

  const setStateBoth = useCallback((s: GameState) => {
    stateRef.current = s;
    setState(s);
  }, []);

  const resetPlayer = useCallback((x: number, y: number) => {
    const p = playerRef.current;
    p.x = x; p.y = y; p.vx = 0; p.vy = 0;
    p.onGround = false; p.onWall = 0; p.jumpsLeft = 1;
    p.coyote = 0; p.jumpBuffer = 0; p.jumpHeld = false;
    p.dashCD = 0; p.dashTime = 0; p.dashDir = 1; p.wallLock = 0;
    p.facing = 1; p.trail = []; p.runFrame = 0; p.runTick = 0;
    p.dead = false; p.deadTimer = 0;
    standingMoverRef.current = null;
  }, []);

  const startGame = useCallback(() => {
    const lvl = buildLevel();
    levelRef.current = lvl;
    setTotalCoins(lvl.coins.length);
    resetPlayer(lvl.startX, lvl.startY);
    checkpointRef.current = -1;
    elapsedRef.current = 0;
    lastTenthsRef.current = -1;
    lastCoinsRef.current = -1;
    setTimeStr("0.0");
    setCoinCount(0);
    camRef.current = { x: 0, y: 0 };
    particlesRef.current = [];
    shakeRef.current = { time: 0, mag: 0 };
    inputRef.current = { left: false, right: false, jump: false, jumpQueued: false, dashQueued: false };
    setStateBoth("playing");
  }, [resetPlayer, setStateBoth]);

  const respawn = useCallback(() => {
    const lvl = levelRef.current;
    let x = lvl.startX;
    let y = lvl.startY;
    if (checkpointRef.current >= 0) {
      const cp = lvl.checkpoints[checkpointRef.current];
      x = cp.x + cp.w / 2 - PLAYER_W / 2;
      y = cp.y + cp.h - PLAYER_H;
    }
    resetPlayer(x, y);
    playerRef.current.dead = false;
    setStateBoth("playing");
  }, [resetPlayer, setStateBoth]);

  const spawnParticles = useCallback((x: number, y: number, n: number, color: string, spd: number, life: number) => {
    const arr = particlesRef.current;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = spd * (0.4 + Math.random() * 0.6);
      arr.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - spd * 0.2,
        life, max: life, color, size: 2 + Math.random() * 2.5,
      });
    }
    if (arr.length > 240) particlesRef.current = arr.slice(arr.length - 240);
  }, []);

  useEffect(() => {
    setTotalCoins(levelRef.current.coins.length);
  }, []);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const apply = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(280, wrap.clientWidth);
      const h = Math.max(180, wrap.clientHeight);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = { w, h };
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(2.2, (now - last) / 16.6667);
      last = now;
      const { w, h } = sizeRef.current;
      const lvl = levelRef.current;
      const p = playerRef.current;
      const input = inputRef.current;
      const st = stateRef.current;
      const t = now * 0.06;

      if (st === "playing") {
        elapsedRef.current += dt * 16.6667;
      }

      for (const m of lvl.movers) {
        m.prevX = m.x; m.prevY = m.y;
        m.x = m.baseX + Math.sin(now * m.speed + m.phase) * m.ax;
        m.y = m.baseY + Math.sin(now * m.speed + m.phase) * m.ay;
      }

      if (st === "playing" && standingMoverRef.current) {
        const m = standingMoverRef.current;
        p.x += m.x - m.prevX;
        p.y += m.y - m.prevY;
      }

      const solids: Rect[] = [...lvl.platforms, ...lvl.movers];

      if (st === "dead") {
        p.deadTimer -= dt;
        if (p.deadTimer <= 0) respawn();
      } else if (st === "playing") {
        p.onWall = 0;
        if (input.jumpQueued) {
          p.jumpBuffer = JUMP_BUFFER;
          input.jumpQueued = false;
        }
        p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);
        p.jumpHeld = input.jump;

        if (input.left) p.facing = -1;
        else if (input.right) p.facing = 1;

        if (p.dashTime > 0) {
          p.dashTime -= dt;
          p.vx = p.dashDir * DASH_SPEED;
          p.vy = 0;
          p.trail.push({ x: p.x + p.w / 2, y: p.y + p.h / 2, life: 14 });
        } else {
          if (p.onGround) {
            if (input.left) p.vx = Math.max(-MAX_RUN, p.vx - MOVE_ACCEL * dt);
            else if (input.right) p.vx = Math.min(MAX_RUN, p.vx + MOVE_ACCEL * dt);
            else p.vx *= Math.pow(FRICTION, dt);
          } else {
            if (input.left) {
              if (p.vx > -MAX_RUN) p.vx = Math.max(-MAX_RUN, p.vx - AIR_ACCEL * dt);
              else p.vx *= Math.pow(AIR_DRAG, dt);
            } else if (input.right) {
              if (p.vx < MAX_RUN) p.vx = Math.min(MAX_RUN, p.vx + AIR_ACCEL * dt);
              else p.vx *= Math.pow(AIR_DRAG, dt);
            } else {
              p.vx *= Math.pow(AIR_DRAG, dt);
            }
          }
          if (input.dashQueued && p.dashCD <= 0) {
            input.dashQueued = false;
            p.dashTime = DASH_TIME;
            p.dashCD = DASH_CD;
            p.dashDir = input.left ? -1 : input.right ? 1 : p.facing;
            p.vy = 0;
            spawnParticles(p.x + p.w / 2, p.y + p.h / 2, 12, "#ffd27a", 3.5, 16);
          }
          input.dashQueued = false;
          p.dashCD = Math.max(0, p.dashCD - dt);

          const grav = (!p.jumpHeld && p.vy < 0) ? GRAVITY * 2.4 : GRAVITY;
          const towardWall = (p.onWall === 1 && input.right) || (p.onWall === -1 && input.left);
          const wallSliding = !p.onGround && p.onWall !== 0 && p.vy > 0 && towardWall && p.wallLock <= 0;
          if (wallSliding) {
            p.vy = Math.min(p.vy + grav * dt, WALL_SLIDE_V);
            if (Math.random() < 0.4) spawnParticles(p.x + (p.onWall === 1 ? p.w : 0), p.y + p.h, 1, "#caa06a", 1.2, 10);
          } else {
            p.vy += grav * dt;
          }
          if (p.vy > 18) p.vy = 18;

          if (p.jumpBuffer > 0) {
            if (p.onGround || p.coyote > 0) {
              p.vy = JUMP_V;
              p.onGround = false;
              p.coyote = 0;
              p.jumpsLeft = 1;
              p.jumpBuffer = 0;
              spawnParticles(p.x + p.w / 2, p.y + p.h, 6, "#e8d8a0", 1.8, 12);
            } else if (p.onWall !== 0) {
              p.vy = WALL_JUMP_VY;
              p.vx = -p.onWall * WALL_JUMP_VX;
              p.facing = -p.onWall;
              p.jumpsLeft = 1;
              p.jumpBuffer = 0;
              p.wallLock = 6;
              spawnParticles(p.x + (p.onWall === 1 ? p.w : 0), p.y + p.h / 2, 8, "#caa06a", 2.4, 12);
            } else if (p.jumpsLeft > 0) {
              p.vy = DOUBLE_JUMP_V;
              p.jumpsLeft -= 1;
              p.jumpBuffer = 0;
              spawnParticles(p.x + p.w / 2, p.y + p.h, 10, "#bfe0ff", 2.6, 14);
            }
          }
        }
        p.wallLock = Math.max(0, p.wallLock - dt);

        p.x += p.vx * dt;
        for (const s of solids) {
          if (p.x < s.x + s.w && p.x + p.w > s.x && p.y < s.y + s.h && p.y + p.h > s.y) {
            if (p.vx > 0) { p.x = s.x - p.w; p.onWall = 1; }
            else if (p.vx < 0) { p.x = s.x + s.w; p.onWall = -1; }
            p.vx = 0;
          }
        }
        const wasOnGround = p.onGround;
        p.onGround = false;
        let landedMover: Mover | null = null;
        p.y += p.vy * dt;
        for (const s of solids) {
          if (p.x < s.x + s.w && p.x + p.w > s.x && p.y < s.y + s.h && p.y + p.h > s.y) {
            if (p.vy > 0) {
              p.y = s.y - p.h;
              p.onGround = true;
              p.vy = 0;
              for (const m of lvl.movers) {
                if (s === m) landedMover = m;
              }
            } else if (p.vy < 0) {
              p.y = s.y + s.h;
              p.vy = 0;
            }
          }
        }
        standingMoverRef.current = landedMover;
        if (p.onGround) {
          p.coyote = COYOTE;
          p.jumpsLeft = 1;
          p.dashCD = 0;
          if (!wasOnGround) {
            spawnParticles(p.x + p.w / 2, p.y + p.h, 7, "#e8d8a0", 2.0, 12);
          }
        } else {
          p.coyote = Math.max(0, p.coyote - dt);
        }

        if (p.onGround) {
          p.runTick += Math.abs(p.vx) * dt;
          if (p.runTick > 16) { p.runTick = 0; p.runFrame = 1 - p.runFrame; }
        }

        for (const sp of lvl.spikes) {
          const pad = 4;
          if (p.x + p.w > sp.x + pad && p.x < sp.x + sp.w - pad && p.y + p.h > sp.y + pad && p.y < sp.y + sp.h) {
            p.dead = true;
          }
        }
        if (p.y > DEATH_Y) p.dead = true;

        for (const c of lvl.coins) {
          if (!c.taken) {
            const dx = p.x + p.w / 2 - c.x;
            const dy = p.y + p.h / 2 - c.y;
            if (dx * dx + dy * dy < 18 * 18) {
              c.taken = true;
              spawnParticles(c.x, c.y, 10, "#ffd870", 2.6, 16);
            }
          }
        }

        for (let i = 0; i < lvl.checkpoints.length; i++) {
          const cp = lvl.checkpoints[i];
          if (!cp.reached && p.x + p.w > cp.x && p.x < cp.x + cp.w && p.y + p.h > cp.y && p.y < cp.y + cp.h) {
            cp.reached = true;
            checkpointRef.current = i;
            spawnParticles(cp.x + cp.w / 2, cp.y + 10, 14, "#7ee87a", 2.8, 18);
          }
        }

        const gl = lvl.goal;
        if (p.x + p.w > gl.x && p.x < gl.x + gl.w && p.y + p.h > gl.y && p.y < gl.y + gl.h) {
          setStateBoth("win");
          spawnParticles(gl.x + gl.w / 2, gl.y + gl.h / 2, 40, "#ffd870", 4.5, 26);
        }

        if (p.dead) {
          p.deadTimer = 30;
          shakeRef.current = { time: 22, mag: 9 };
          spawnParticles(p.x + p.w / 2, p.y + p.h / 2, 26, "#a86a38", 4.2, 22);
          spawnParticles(p.x + p.w / 2, p.y + p.h / 2, 10, "#c83030", 3.5, 20);
          setStateBoth("dead");
        }
      }

      for (let i = p.trail.length - 1; i >= 0; i--) {
        p.trail[i].life -= dt;
        if (p.trail[i].life <= 0) p.trail.splice(i, 1);
      }
      const ps = particlesRef.current;
      for (let i = ps.length - 1; i >= 0; i--) {
        const pt = ps[i];
        pt.vy += 0.18 * dt;
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.life -= dt;
        if (pt.life <= 0) ps.splice(i, 1);
      }

      if (st === "playing" || st === "dead") {
        const targetX = p.x + p.w / 2 - w / 2 + p.vx * 12;
        const targetY = p.y + p.h / 2 - h * 0.58;
        const k = 1 - Math.pow(0.86, dt);
        camRef.current.x += (targetX - camRef.current.x) * k;
        camRef.current.y += (targetY - camRef.current.y) * k;
        camRef.current.x = Math.max(0, Math.min(lvl.width - w, camRef.current.x));
        camRef.current.y = Math.max(-60, Math.min(lvl.height - h, camRef.current.y));
      }

      const tenths = Math.floor(elapsedRef.current / 100);
      if (tenths !== lastTenthsRef.current) {
        lastTenthsRef.current = tenths;
        setTimeStr((elapsedRef.current / 1000).toFixed(1));
      }
      const cc = lvl.coins.filter((c) => c.taken).length;
      if (cc !== lastCoinsRef.current) {
        lastCoinsRef.current = cc;
        setCoinCount(cc);
      }

      let shx = 0;
      let shy = 0;
      if (shakeRef.current.time > 0) {
        const f = shakeRef.current.time / 22;
        shx = (Math.random() * 2 - 1) * shakeRef.current.mag * f;
        shy = (Math.random() * 2 - 1) * shakeRef.current.mag * f;
        shakeRef.current.time -= dt;
      }

      drawBackground(ctx, w, h, camRef.current.x, camRef.current.y);

      ctx.save();
      ctx.translate(-camRef.current.x + shx, -camRef.current.y + shy);

      for (const pf of lvl.platforms) {
        if (pf.x + pf.w < camRef.current.x - 40 || pf.x > camRef.current.x + w + 40) continue;
        if (pf.type === "ground") drawGround(ctx, pf.x, pf.y, pf.w, pf.h);
        else if (pf.type === "wall") drawLog(ctx, pf.x, pf.y, pf.w, pf.h, true);
        else drawLog(ctx, pf.x, pf.y, pf.w, pf.h, false);
      }
      for (const m of lvl.movers) {
        drawLog(ctx, m.x, m.y, m.w, m.h, false);
        ctx.fillStyle = "rgba(255,220,140,0.5)";
        ctx.fillRect(m.x + 4, m.y + 2, m.w - 8, 2);
      }
      for (const sp of lvl.spikes) drawSpikes(ctx, sp.x, sp.y, sp.w, sp.h);
      for (const c of lvl.coins) {
        if (!c.taken) drawCoin(ctx, c.x, c.y, t);
      }
      for (let i = 0; i < lvl.checkpoints.length; i++) {
        const cp = lvl.checkpoints[i];
        drawFlag(ctx, cp.x, cp.y, cp.w, cp.h, cp.reached, false, t);
      }
      drawFlag(ctx, lvl.goal.x, lvl.goal.y, lvl.goal.w, lvl.goal.h, true, true, t);

      if (p.trail.length > 0) {
        for (const tr of p.trail) {
          const a = tr.life / 14;
          ctx.fillStyle = `rgba(255,210,120,${a * 0.5})`;
          ctx.beginPath();
          ctx.arc(tr.x, tr.y, 8 * a + 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (st !== "win" || p.dead) {
        drawBeaver(ctx, p.x, p.y, p.facing, p.runFrame, !p.onGround, p.dashTime > 0);
      }

      for (const pt of ps) {
        const a = pt.life / pt.max;
        ctx.globalAlpha = Math.max(0, a);
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      ctx.restore();

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [respawn, spawnParticles, setStateBoth]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key;
      const tgt = e.target as HTMLElement | null;
      if (tgt && (tgt.tagName === "INPUT" || tgt.tagName === "TEXTAREA" || tgt.isContentEditable)) return;
      const input = inputRef.current;
      if (k === "a" || k === "A" || k === "ArrowLeft") { input.left = true; e.preventDefault(); }
      else if (k === "d" || k === "D" || k === "ArrowRight") { input.right = true; e.preventDefault(); }
      else if (k === " " || k === "w" || k === "W" || k === "ArrowUp") {
        if (!e.repeat) input.jumpQueued = true;
        input.jump = true;
        e.preventDefault();
      } else if (k === "Shift") {
        if (!e.repeat) input.dashQueued = true;
        e.preventDefault();
      }
      if (stateRef.current === "ready" && (k === " " || k === "w" || k === "W" || k === "ArrowUp" || k === "Enter")) {
        input.jumpQueued = false;
        startGame();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key;
      const input = inputRef.current;
      if (k === "a" || k === "A" || k === "ArrowLeft") input.left = false;
      else if (k === "d" || k === "D" || k === "ArrowRight") input.right = false;
      else if (k === " " || k === "w" || k === "W" || k === "ArrowUp") input.jump = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [startGame]);

  const setKey = useCallback((key: "left" | "right" | "jump", val: boolean) => {
    inputRef.current[key] = val;
  }, []);

  const queueJump = useCallback(() => {
    if (stateRef.current === "ready") { startGame(); return; }
    inputRef.current.jumpQueued = true;
    inputRef.current.jump = true;
  }, [startGame]);

  const queueDash = useCallback(() => {
    inputRef.current.dashQueued = true;
  }, []);

  const onCanvasPointer = useCallback(() => {
    if (stateRef.current === "ready") startGame();
  }, [startGame]);

  return (
    <div ref={wrapRef} className="relative h-full w-full select-none overflow-hidden bg-sky-200">
      <canvas
        ref={canvasRef}
        className="block h-full w-full touch-none"
        onPointerDown={onCanvasPointer}
      />

      {(state === "playing" || state === "dead") && (
        <>
          <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-1.5 text-amber-200 backdrop-blur-sm">
            <Coins className="h-4 w-4 text-amber-300" />
            <span className="font-mono text-sm font-bold">{coinCount}/{totalCoins}</span>
          </div>
          <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-1.5 text-amber-200 backdrop-blur-sm">
            <Gauge className="h-4 w-4 text-amber-300" />
            <span className="font-mono text-sm font-bold">{timeStr}s</span>
          </div>
          <div className="pointer-events-none absolute bottom-3 left-1/2 hidden -translate-x-1/2 items-center gap-3 rounded-full bg-black/40 px-4 py-1.5 text-[11px] text-amber-100/90 backdrop-blur-sm md:flex">
            <span><b className="text-amber-200">A/D</b> или <b className="text-amber-200">←/→</b> движение</span>
            <span className="text-amber-100/40">·</span>
            <span><b className="text-amber-200">Space</b> прыжок (двойной)</span>
            <span className="text-amber-100/40">·</span>
            <span><b className="text-amber-200">Shift</b> рывок</span>
          </div>
        </>
      )}

      {state === "dead" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-red-900/30 backdrop-blur-[1px]">
          <div className="animate-pulse text-3xl font-extrabold text-red-200 drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]">
            Бобр упал!
          </div>
        </div>
      )}

      {state === "ready" && (
        <div
          className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-4 bg-gradient-to-b from-black/30 to-black/55 px-6 text-center backdrop-blur-sm"
          onPointerDown={onCanvasPointer}
        >
          <div className="flex items-center gap-2 text-4xl font-extrabold text-amber-300 drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]">
            <Sparkles className="h-9 w-9" />
            <span>БоброПаркур</span>
          </div>
          <p className="text-base font-medium text-amber-100">Нажми чтобы начать</p>
          <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-amber-100/85">
            <div className="rounded-lg bg-black/35 px-3 py-2">
              <div className="font-bold text-amber-200">A/D ←/→</div>
              <div>бег</div>
            </div>
            <div className="rounded-lg bg-black/35 px-3 py-2">
              <div className="font-bold text-amber-200">Space / W / ↑</div>
              <div>прыжок · двойной · от стены</div>
            </div>
            <div className="rounded-lg bg-black/35 px-3 py-2">
              <div className="font-bold text-amber-200">Shift</div>
              <div>рывок</div>
            </div>
          </div>
          <p className="mt-1 max-w-md text-xs leading-relaxed text-amber-100/70">
            Прыгай по брёвнам, отталкивайся от стен, делай рывок через пропасти,
            собирай золотые веточки и доберись до финажного флага.
          </p>
        </div>
      )}

      {state === "win" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/65 px-6 text-center backdrop-blur-sm">
          <div className="flex items-center gap-2 text-5xl font-extrabold text-amber-300 drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
            <Trophy className="h-11 w-11" />
            <span>Победа!</span>
          </div>
          <div className="flex flex-col gap-1.5 text-amber-100">
            <div className="flex items-center justify-center gap-2 text-lg">
              <Gauge className="h-5 w-5 text-amber-300" />
              <span>Время: <span className="font-mono font-bold text-amber-200">{timeStr}s</span></span>
            </div>
            <div className="flex items-center justify-center gap-2 text-lg">
              <Coins className="h-5 w-5 text-amber-300" />
              <span>Монеты: <span className="font-mono font-bold text-amber-200">{coinCount}/{totalCoins}</span></span>
            </div>
          </div>
          <button
            onClick={startGame}
            className="mt-2 flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 font-bold text-amber-950 shadow-lg transition hover:bg-amber-400 active:scale-95"
          >
            <RotateCcw className="h-5 w-5" />
            Заново
          </button>
        </div>
      )}

      {(state === "playing" || state === "dead") && (
        <>
          <div className="absolute bottom-3 left-3 flex gap-2 md:hidden">
            <button
              className="flex h-14 w-14 touch-none select-none items-center justify-center rounded-full bg-black/45 text-2xl font-bold text-amber-200 backdrop-blur-sm active:bg-amber-500/60"
              onPointerDown={(e) => { e.preventDefault(); setKey("left", true); }}
              onPointerUp={(e) => { e.preventDefault(); setKey("left", false); }}
              onPointerLeave={() => setKey("left", false)}
              onPointerCancel={() => setKey("left", false)}
            >←</button>
            <button
              className="flex h-14 w-14 touch-none select-none items-center justify-center rounded-full bg-black/45 text-2xl font-bold text-amber-200 backdrop-blur-sm active:bg-amber-500/60"
              onPointerDown={(e) => { e.preventDefault(); setKey("right", true); }}
              onPointerUp={(e) => { e.preventDefault(); setKey("right", false); }}
              onPointerLeave={() => setKey("right", false)}
              onPointerCancel={() => setKey("right", false)}
            >→</button>
          </div>
          <div className="absolute bottom-3 right-3 flex gap-2 md:hidden">
            <button
              className="flex h-14 w-14 touch-none select-none items-center justify-center rounded-full bg-black/45 text-xs font-bold text-sky-200 backdrop-blur-sm active:bg-sky-500/60"
              onPointerDown={(e) => { e.preventDefault(); queueDash(); }}
              onPointerUp={(e) => { e.preventDefault(); }}
            >РЫВОК</button>
            <button
              className="flex h-16 w-16 touch-none select-none items-center justify-center rounded-full bg-black/45 text-xs font-bold text-amber-200 backdrop-blur-sm active:bg-amber-500/60"
              onPointerDown={(e) => { e.preventDefault(); queueJump(); }}
              onPointerUp={(e) => { e.preventDefault(); setKey("jump", false); }}
              onPointerLeave={() => setKey("jump", false)}
              onPointerCancel={() => setKey("jump", false)}
            >ПРЫЖОК</button>
          </div>
        </>
      )}
    </div>
  );
}
