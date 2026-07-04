"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Footprints, MousePointerClick, RotateCcw } from "lucide-react";

type GameState = "ready" | "playing" | "gameover";
type ObstacleType = "log_low" | "log_tall" | "log_stack";

interface Obstacle {
  x: number;
  w: number;
  h: number;
  type: ObstacleType;
}

interface Cloud {
  x: number;
  y: number;
  scale: number;
}

interface Star {
  x: number;
  y: number;
  r: number;
}

const GRAVITY = 0.62;
const JUMP_V = -12.4;
const GROUND_RATIO = 0.82;
const BEAVER_X = 84;
const BEAVER_W = 50;
const BEAVER_H = 42;
const BASE_SPEED = 6;
const MAX_SPEED = 14.5;
const SPEED_ACCEL = 0.0016;
const HITBOX_PAD = 9;
const DAY_CYCLE = 3400;

const SKY_DAY_TOP: [number, number, number] = [135, 206, 245];
const SKY_DAY_BOT: [number, number, number] = [206, 235, 220];
const SKY_NIGHT_TOP: [number, number, number] = [16, 22, 52];
const SKY_NIGHT_BOT: [number, number, number] = [54, 42, 74];

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

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function mix(c1: [number, number, number], c2: [number, number, number], t: number): string {
  const tt = Math.max(0, Math.min(1, t));
  return `rgb(${Math.round(lerp(c1[0], c2[0], tt))},${Math.round(lerp(c1[1], c2[1], tt))},${Math.round(lerp(c1[2], c2[2], tt))})`;
}

function drawBeaver(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number, airborne: boolean): void {
  ctx.save();
  ctx.fillStyle = "#5a3618";
  ctx.beginPath();
  ctx.ellipse(x + 4, y + 24, 8, 14, -0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#7a4a26";
  ctx.beginPath();
  ctx.ellipse(x + 4, y + 24, 5, 10, -0.25, 0, Math.PI * 2);
  ctx.fill();

  const g = ctx.createLinearGradient(0, y + 8, 0, y + 36);
  g.addColorStop(0, "#a86a38");
  g.addColorStop(1, "#6e4220");
  ctx.fillStyle = g;
  roundRect(ctx, x + 8, y + 10, 30, 26, 10);
  ctx.fill();

  ctx.fillStyle = "#e7b978";
  roundRect(ctx, x + 14, y + 20, 22, 14, 7);
  ctx.fill();

  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x + 34, y + 15, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#5a3618";
  ctx.beginPath();
  ctx.arc(x + 30, y + 5, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#c98a52";
  ctx.beginPath();
  ctx.arc(x + 30, y + 6, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ecd29a";
  ctx.beginPath();
  ctx.arc(x + 44, y + 18, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#1a1208";
  ctx.beginPath();
  ctx.arc(x + 38, y + 12, 2.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x + 38.7, y + 11.3, 0.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#2a1a0a";
  ctx.beginPath();
  ctx.arc(x + 47, y + 17, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#fdfdf0";
  ctx.fillRect(x + 43.5, y + 20, 3, 5);
  ctx.fillRect(x + 47, y + 20, 3, 5);

  ctx.fillStyle = "#5a3618";
  if (airborne) {
    roundRect(ctx, x + 14, y + 34, 7, 6, 3);
    ctx.fill();
    roundRect(ctx, x + 28, y + 34, 7, 6, 3);
    ctx.fill();
  } else if (frame === 0) {
    roundRect(ctx, x + 14, y + 35, 7, 7, 3);
    ctx.fill();
    roundRect(ctx, x + 28, y + 32, 7, 5, 3);
    ctx.fill();
  } else {
    roundRect(ctx, x + 14, y + 32, 7, 5, 3);
    ctx.fill();
    roundRect(ctx, x + 28, y + 35, 7, 7, 3);
    ctx.fill();
  }
  ctx.restore();
}

function drawLogBlock(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, "#b27a44");
  g.addColorStop(0.5, "#8a5530");
  g.addColorStop(1, "#5e3820");
  ctx.fillStyle = g;
  roundRect(ctx, x, y, w, h, Math.min(h / 2, 8));
  ctx.fill();

  const rc = Math.max(3, Math.min(h / 2 - 1, 7));
  ctx.fillStyle = "#caa06a";
  ctx.beginPath();
  ctx.ellipse(x + w - 3, y + h / 2, 4, rc, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#7a4a26";
  ctx.beginPath();
  ctx.ellipse(x + w - 3, y + h / 2, 2, Math.max(1.5, rc - 2), 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(50, 26, 8, 0.4)";
  ctx.lineWidth = 1;
  for (let i = 1; i < 3; i++) {
    const yy = y + (h / 3) * i;
    ctx.beginPath();
    ctx.moveTo(x + 4, yy);
    ctx.bezierCurveTo(x + w * 0.3, yy - 1.6, x + w * 0.6, yy + 1.6, x + w - 6, yy);
    ctx.stroke();
  }
}

function drawObstacle(ctx: CanvasRenderingContext2D, o: Obstacle, gy: number): void {
  if (o.type === "log_stack") {
    drawLogBlock(ctx, o.x, gy - o.h, o.w, o.h / 2);
    drawLogBlock(ctx, o.x + 5, gy - o.h / 2, o.w - 10, o.h / 2);
  } else {
    drawLogBlock(ctx, o.x, gy - o.h, o.w, o.h);
  }
}

function drawCloud(ctx: CanvasRenderingContext2D, c: Cloud, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#ffffff";
  const s = c.scale;
  ctx.beginPath();
  ctx.arc(c.x, c.y, 12 * s, 0, Math.PI * 2);
  ctx.arc(c.x + 14 * s, c.y - 4 * s, 16 * s, 0, Math.PI * 2);
  ctx.arc(c.x + 32 * s, c.y, 13 * s, 0, Math.PI * 2);
  ctx.arc(c.x + 18 * s, c.y + 6 * s, 14 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHills(ctx: CanvasRenderingContext2D, w: number, gy: number, offset: number, color: string): void {
  ctx.fillStyle = color;
  const hillW = 240;
  const start = -(offset % hillW);
  ctx.beginPath();
  ctx.moveTo(0, gy);
  for (let i = 0; i < w / hillW + 2; i++) {
    const hx = start + i * hillW;
    ctx.quadraticCurveTo(hx + hillW / 2, gy - 72, hx + hillW, gy);
  }
  ctx.lineTo(w, gy);
  ctx.closePath();
  ctx.fill();
}

function drawTrees(ctx: CanvasRenderingContext2D, w: number, gy: number, offset: number, color: string): void {
  const gap = 190;
  const start = -(offset % gap);
  for (let i = 0; i < w / gap + 2; i++) {
    const tx = start + i * gap + 50;
    ctx.fillStyle = "#5a3a1c";
    ctx.fillRect(tx - 2, gy - 18, 4, 18);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(tx, gy - 44);
    ctx.lineTo(tx - 13, gy - 18);
    ctx.lineTo(tx + 13, gy - 18);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.moveTo(tx, gy - 44);
    ctx.lineTo(tx, gy - 18);
    ctx.lineTo(tx + 13, gy - 18);
    ctx.closePath();
    ctx.fill();
  }
}

function drawGround(ctx: CanvasRenderingContext2D, w: number, h: number, gy: number, offset: number): void {
  ctx.fillStyle = "#7a4a26";
  ctx.fillRect(0, gy, w, h - gy);
  ctx.fillStyle = "#6b3f20";
  ctx.fillRect(0, gy + 8, w, h - gy - 8);

  ctx.fillStyle = "#4f8f3a";
  ctx.fillRect(0, gy - 4, w, 6);
  ctx.fillStyle = "#62ab48";
  ctx.fillRect(0, gy - 4, w, 2);

  const tuftGap = 42;
  const tStart = -(offset % tuftGap);
  ctx.fillStyle = "#3f7d3a";
  for (let i = 0; i < w / tuftGap + 2; i++) {
    const tx = tStart + i * tuftGap;
    ctx.fillRect(tx, gy - 4, 2, 4);
    ctx.fillRect(tx + 4, gy - 3, 1, 3);
  }
  ctx.fillStyle = "rgba(40, 20, 8, 0.4)";
  const sGap = 26;
  const sStart = -(offset % sGap);
  for (let i = 0; i < w / sGap + 2; i++) {
    const tx = sStart + i * sGap;
    ctx.fillRect(tx, gy + 16, 3, 2);
    ctx.fillRect(tx + 11, gy + 26, 2, 2);
  }
}

function drawSky(ctx: CanvasRenderingContext2D, w: number, gy: number, dayFactor: number): void {
  const top = mix(SKY_DAY_TOP, SKY_NIGHT_TOP, dayFactor);
  const bot = mix(SKY_DAY_BOT, SKY_NIGHT_BOT, dayFactor);
  const g = ctx.createLinearGradient(0, 0, 0, gy);
  g.addColorStop(0, top);
  g.addColorStop(1, bot);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, gy);
}

function drawStars(ctx: CanvasRenderingContext2D, stars: Star[], dayFactor: number): void {
  if (dayFactor < 0.35) return;
  const a = (dayFactor - 0.35) / 0.65;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = "#ffffff";
  for (const s of stars) {
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawCelestial(ctx: CanvasRenderingContext2D, w: number, gy: number, dayFactor: number): void {
  const cx = w * 0.8;
  const cy = gy * 0.22;
  if (dayFactor < 0.6) {
    const a = 1 - Math.min(1, dayFactor / 0.6);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = "rgba(255, 233, 138, 0.35)";
    ctx.beginPath();
    ctx.arc(cx, cy, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffe98a";
    ctx.beginPath();
    ctx.arc(cx, cy, 19, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  if (dayFactor > 0.4) {
    const a = Math.min(1, (dayFactor - 0.4) / 0.6);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = "#e8e8e0";
    ctx.beginPath();
    ctx.arc(cx, cy, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = mix(SKY_DAY_BOT, SKY_NIGHT_TOP, dayFactor);
    ctx.beginPath();
    ctx.arc(cx + 7, cy - 3, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function DinoRunner() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const stateRef = useRef<GameState>("ready");
  const [state, setState] = useState<GameState>("ready");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const bestRef = useRef(0);

  const sizeRef = useRef({ w: 640, h: 320 });
  const yRef = useRef(-1);
  const vyRef = useRef(0);
  const onGroundRef = useRef(true);
  const speedRef = useRef(BASE_SPEED);
  const distanceRef = useRef(0);
  const groundOffsetRef = useRef(0);
  const hillsOffsetRef = useRef(0);
  const treesOffsetRef = useRef(0);
  const runFrameRef = useRef(0);
  const runTickRef = useRef(0);
  const spawnDistRef = useRef(0);
  const nextSpawnRef = useRef(260);
  const lastScoreRef = useRef(0);

  const obstaclesRef = useRef<Obstacle[]>([]);
  const cloudsRef = useRef<Cloud[]>([]);
  const starsRef = useRef<Star[]>([]);

  const setStateBoth = useCallback((s: GameState) => {
    stateRef.current = s;
    setState(s);
  }, []);

  const initClouds = useCallback((w: number, h: number) => {
    const arr: Cloud[] = [];
    for (let i = 0; i < 5; i++) {
      arr.push({ x: Math.random() * w, y: 24 + Math.random() * (h * 0.42), scale: 0.6 + Math.random() * 0.7 });
    }
    cloudsRef.current = arr;
  }, []);

  const initStars = useCallback((w: number, h: number) => {
    const arr: Star[] = [];
    for (let i = 0; i < 44; i++) {
      arr.push({ x: Math.random() * w, y: Math.random() * h * 0.62, r: 0.5 + Math.random() * 1.3 });
    }
    starsRef.current = arr;
  }, []);

  const spawnObstacle = useCallback((w: number) => {
    const r = Math.random();
    let type: ObstacleType;
    let ow: number;
    let oh: number;
    if (r < 0.45) {
      type = "log_low";
      ow = 36 + Math.random() * 16;
      oh = 18;
    } else if (r < 0.8) {
      type = "log_tall";
      ow = 24;
      oh = 30 + Math.random() * 10;
    } else {
      type = "log_stack";
      ow = 42;
      oh = 38;
    }
    obstaclesRef.current = [...obstaclesRef.current, { x: w + 24, w: ow, h: oh, type }];
  }, []);

  const jump = useCallback(() => {
    if (stateRef.current !== "playing") return;
    if (!onGroundRef.current) return;
    vyRef.current = JUMP_V;
    onGroundRef.current = false;
  }, []);

  const startGame = useCallback(() => {
    const { w, h } = sizeRef.current;
    const gy = h * GROUND_RATIO;
    yRef.current = gy - BEAVER_H;
    vyRef.current = 0;
    onGroundRef.current = true;
    speedRef.current = BASE_SPEED;
    distanceRef.current = 0;
    groundOffsetRef.current = 0;
    hillsOffsetRef.current = 0;
    treesOffsetRef.current = 0;
    runFrameRef.current = 0;
    runTickRef.current = 0;
    spawnDistRef.current = 0;
    nextSpawnRef.current = 260;
    obstaclesRef.current = [];
    lastScoreRef.current = 0;
    setScore(0);
    if (cloudsRef.current.length === 0) initClouds(w, h);
    if (starsRef.current.length === 0) initStars(w, h);
    setStateBoth("playing");
  }, [initClouds, initStars, setStateBoth]);

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
      if (stateRef.current !== "playing") {
        yRef.current = h * GROUND_RATIO - BEAVER_H;
        if (cloudsRef.current.length === 0) initClouds(w, h);
        if (starsRef.current.length === 0) initStars(w, h);
      }
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [initClouds, initStars]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(2.4, (now - last) / 16.6667);
      last = now;
      const { w, h } = sizeRef.current;
      const gy = h * GROUND_RATIO;
      const st = stateRef.current;

      if (st === "playing") {
        speedRef.current = Math.min(MAX_SPEED, speedRef.current + SPEED_ACCEL * dt);
        const sp = speedRef.current;
        distanceRef.current += sp * dt;
        groundOffsetRef.current += sp * dt;
        hillsOffsetRef.current += sp * 0.25 * dt;
        treesOffsetRef.current += sp * 0.55 * dt;

        vyRef.current += GRAVITY * dt;
        yRef.current += vyRef.current * dt;
        const floor = gy - BEAVER_H;
        if (yRef.current >= floor) {
          yRef.current = floor;
          vyRef.current = 0;
          onGroundRef.current = true;
        }

        if (onGroundRef.current) {
          runTickRef.current += sp * dt;
          if (runTickRef.current > 18) {
            runTickRef.current = 0;
            runFrameRef.current = 1 - runFrameRef.current;
          }
        }

        obstaclesRef.current = obstaclesRef.current
          .map((o) => ({ ...o, x: o.x - sp * dt }))
          .filter((o) => o.x + o.w > -24);

        spawnDistRef.current += sp * dt;
        if (spawnDistRef.current >= nextSpawnRef.current) {
          spawnDistRef.current = 0;
          const base = 300 + Math.random() * 220;
          nextSpawnRef.current = base * (sp / BASE_SPEED) + 70;
          spawnObstacle(w);
        }

        cloudsRef.current = cloudsRef.current.map((c) => {
          const nx = c.x - sp * 0.3 * dt;
          if (nx < -60) {
            return { x: w + 40, y: 24 + Math.random() * (h * 0.42), scale: 0.6 + Math.random() * 0.7 };
          }
          return { ...c, x: nx };
        });

        const bx1 = BEAVER_X + HITBOX_PAD;
        const bx2 = BEAVER_X + BEAVER_W - HITBOX_PAD;
        const by1 = yRef.current + HITBOX_PAD;
        const by2 = yRef.current + BEAVER_H - 2;
        let dead = false;
        for (const o of obstaclesRef.current) {
          if (bx1 < o.x + o.w - 3 && bx2 > o.x + 3 && by1 < gy && by2 > gy - o.h) {
            dead = true;
            break;
          }
        }
        if (dead) {
          const sc = Math.floor(distanceRef.current / 8);
          if (sc > bestRef.current) {
            bestRef.current = sc;
            setBest(sc);
          }
          setStateBoth("gameover");
        }

        const sc = Math.floor(distanceRef.current / 8);
        if (sc !== lastScoreRef.current) {
          lastScoreRef.current = sc;
          setScore(sc);
        }
      } else {
        if (yRef.current < 0) yRef.current = gy - BEAVER_H;
        cloudsRef.current = cloudsRef.current.map((c) => {
          const nx = c.x - 0.45 * dt;
          if (nx < -60) {
            return { x: w + 40, y: 24 + Math.random() * (h * 0.42), scale: 0.6 + Math.random() * 0.7 };
          }
          return { ...c, x: nx };
        });
        if (st === "ready") {
          runTickRef.current += 1.3 * dt;
          if (runTickRef.current > 18) {
            runTickRef.current = 0;
            runFrameRef.current = 1 - runFrameRef.current;
          }
        }
      }

      const dayFactor = (1 - Math.cos(distanceRef.current / DAY_CYCLE)) / 2;
      drawSky(ctx, w, gy, dayFactor);
      drawStars(ctx, starsRef.current, dayFactor);
      drawCelestial(ctx, w, gy, dayFactor);
      drawHills(ctx, w, gy, hillsOffsetRef.current, mix([110, 150, 110], [38, 50, 72], dayFactor));
      for (const c of cloudsRef.current) drawCloud(ctx, c, dayFactor < 0.5 ? 0.92 : 0.5);
      drawTrees(ctx, w, gy, treesOffsetRef.current, mix([63, 125, 63], [34, 70, 60], dayFactor));
      drawGround(ctx, w, h, gy, groundOffsetRef.current);
      for (const o of obstaclesRef.current) drawObstacle(ctx, o, gy);
      drawBeaver(ctx, BEAVER_X, yRef.current, runFrameRef.current, !onGroundRef.current);

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [spawnObstacle, setStateBoth]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key;
      if (k !== " " && k !== "ArrowUp" && k !== "w" && k !== "W") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      e.preventDefault();
      if (stateRef.current === "playing") jump();
      else startGame();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [jump, startGame]);

  const onPointerDown = () => {
    if (stateRef.current === "playing") jump();
    else startGame();
  };

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full select-none overflow-hidden bg-sky-300"
      onPointerDown={onPointerDown}
    >
      <canvas ref={canvasRef} className="block h-full w-full cursor-pointer" />

      {state === "playing" && (
        <div className="pointer-events-none absolute right-4 top-3 flex flex-col items-end gap-0.5">
          <span className="font-mono text-lg font-bold text-white/95 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
            {score}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-white/70 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
            рекорд {best}
          </span>
        </div>
      )}

      {state !== "playing" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/45 px-6 text-center backdrop-blur-sm">
          {state === "ready" ? (
            <>
              <div className="flex items-center gap-2 text-3xl font-extrabold text-amber-300 drop-shadow">
                <Footprints className="h-8 w-8" />
                <span>БоброБег</span>
              </div>
              <p className="text-sm text-amber-100/90">Нажми чтобы начать</p>
              <div className="mt-1 flex items-center gap-1.5 text-amber-200/85">
                <MousePointerClick className="h-4 w-4" />
                <span className="text-xs">Пробел или клик — прыжок</span>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-4xl font-extrabold text-amber-300 drop-shadow">Бобр споткнулся!</h2>
              <div className="mt-1 text-sm text-amber-100/90">
                Счёт: <span className="font-mono text-base text-amber-200">{score}</span>
              </div>
              <div className="text-sm text-amber-100/75">
                Рекорд: <span className="font-mono text-base text-amber-200">{best}</span>
              </div>
              <p className="mt-1 text-sm text-amber-100/85">Нажми для рестарта</p>
              <RotateCcw className="mt-1 h-6 w-6 text-amber-300/85" />
            </>
          )}
        </div>
      )}
    </div>
  );
}
