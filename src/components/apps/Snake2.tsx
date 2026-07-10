"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  RotateCcw,
  Trophy,
  Trees,
} from "lucide-react";

type GameState = "ready" | "playing" | "gameover";
type Dir = "up" | "down" | "left" | "right";
interface Cell { x: number; y: number; }

const GRID = 12;
const DIRS: Record<Dir, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const OPP: Record<Dir, Dir> = { up: "down", down: "up", left: "right", right: "left" };
const BASE_INT = 220;
const MIN_INT = 85;
const START_KEYS = ["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", " ", "enter"];

const intervalFor = (score: number): number => Math.max(MIN_INT, BASE_INT - score * 6);

function makeInitialSnake(): Cell[] {
  const cy = Math.floor(GRID / 2);
  return [{ x: 5, y: cy }, { x: 4, y: cy }, { x: 3, y: cy }];
}

interface Iso {
  originX: number;
  originY: number;
  tileW: number;
  tileH: number;
  cubeH: number;
}

function computeIso(w: number, h: number): Iso {
  const padding = 28;
  const availW = Math.max(80, w - padding * 2);
  const availH = Math.max(80, h - padding * 2);
  let tileW = Math.floor(Math.min(availW / GRID, (availH * 2) / (GRID + 1.3)));
  tileW = Math.max(18, tileW);
  if (tileW % 2 === 1) tileW -= 1;
  const tileH = tileW / 2;
  const cubeH = tileH * 1.15;
  const originX = w / 2;
  const originY = padding + tileH / 2 + cubeH;
  return { originX, originY, tileW, tileH, cubeH };
}

function gridToScreen(x: number, y: number, iso: Iso): { sx: number; sy: number } {
  return {
    sx: iso.originX + (x - y) * iso.tileW / 2,
    sy: iso.originY + (x + y) * iso.tileH / 2,
  };
}

function drawCube(
  ctx: CanvasRenderingContext2D,
  sx: number, sy: number,
  tileW: number, tileH: number, h: number,
  topColor: string, rightColor: string, leftColor: string,
): void {
  const halfW = tileW / 2;
  const halfH = tileH / 2;
  const bE_x = sx + halfW, bE_y = sy;
  const bS_x = sx, bS_y = sy + halfH;
  const bW_x = sx - halfW, bW_y = sy;
  const tN_x = sx, tN_y = sy - halfH - h;
  const tE_x = sx + halfW, tE_y = sy - h;
  const tS_x = sx, tS_y = sy + halfH - h;
  const tW_x = sx - halfW, tW_y = sy - h;

  ctx.fillStyle = leftColor;
  ctx.beginPath();
  ctx.moveTo(tW_x, tW_y);
  ctx.lineTo(tS_x, tS_y);
  ctx.lineTo(bS_x, bS_y);
  ctx.lineTo(bW_x, bW_y);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = rightColor;
  ctx.beginPath();
  ctx.moveTo(tE_x, tE_y);
  ctx.lineTo(tS_x, tS_y);
  ctx.lineTo(bS_x, bS_y);
  ctx.lineTo(bE_x, bE_y);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = topColor;
  ctx.beginPath();
  ctx.moveTo(tN_x, tN_y);
  ctx.lineTo(tE_x, tE_y);
  ctx.lineTo(tS_x, tS_y);
  ctx.lineTo(tW_x, tW_y);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(0,0,0,0.18)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(tN_x, tN_y);
  ctx.lineTo(tE_x, tE_y);
  ctx.lineTo(tS_x, tS_y);
  ctx.lineTo(tW_x, tW_y);
  ctx.closePath();
  ctx.stroke();
}

function drawTileFloor(
  ctx: CanvasRenderingContext2D,
  sx: number, sy: number,
  tileW: number, tileH: number,
  fill: string,
): void {
  const halfW = tileW / 2;
  const halfH = tileH / 2;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(sx, sy - halfH);
  ctx.lineTo(sx + halfW, sy);
  ctx.lineTo(sx, sy + halfH);
  ctx.lineTo(sx - halfW, sy);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.18)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return [r, g, b];
}

function mix(a: string, b: string, t: number): string {
  const pa = parseHex(a);
  const pb = parseHex(b);
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

const BROWN_TOP = "#a86a3a";
const BROWN_RIGHT = "#7c4a23";
const BROWN_LEFT = "#5a3517";
const BROWN_HEAD_TOP = "#c98a4a";
const BROWN_HEAD_RIGHT = "#9c5e2c";
const BROWN_HEAD_LEFT = "#704420";
const GOLD_TOP = "#ffd95a";
const GOLD_RIGHT = "#d99a1c";
const GOLD_LEFT = "#a06b0c";

export function Snake2() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sizeRef = useRef<{ w: number; h: number }>({ w: 360, h: 360 });

  const [screen, setScreen] = useState<GameState>("ready");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);

  const stateRef = useRef<GameState>("ready");
  const snakeRef = useRef<Cell[]>(makeInitialSnake());
  const dirRef = useRef<Dir>("right");
  const nextDirRef = useRef<Dir>("right");
  const foodRef = useRef<Cell>({ x: 8, y: 6 });
  const scoreRef = useRef(0);
  const bestRef = useRef(0);
  const growRef = useRef(0);
  const pulseRef = useRef(0);

  const setGS = useCallback((s: GameState) => {
    stateRef.current = s;
    setScreen(s);
  }, []);

  const placeFood = useCallback(() => {
    const snake = snakeRef.current;
    let f: Cell;
    let tries = 0;
    do {
      f = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
      tries++;
    } while (tries < 250 && snake.some((c) => c.x === f.x && c.y === f.y));
    foodRef.current = f;
  }, []);

  const resetGame = useCallback(() => {
    snakeRef.current = makeInitialSnake();
    dirRef.current = "right";
    nextDirRef.current = "right";
    scoreRef.current = 0;
    setScore(0);
    growRef.current = 0;
    placeFood();
  }, [placeFood]);

  const startGame = useCallback(() => {
    resetGame();
    setGS("playing");
  }, [resetGame, setGS]);

  const gameOver = useCallback(() => {
    if (scoreRef.current > bestRef.current) {
      bestRef.current = scoreRef.current;
      setBest(bestRef.current);
    }
    setGS("gameover");
  }, [setGS]);

  const setDir = useCallback((d: Dir) => {
    if (stateRef.current !== "playing") return;
    if (d === OPP[dirRef.current]) return;
    nextDirRef.current = d;
  }, []);

  const step = useCallback(() => {
    const snake = snakeRef.current;
    dirRef.current = nextDirRef.current;
    const d = DIRS[dirRef.current];
    const head = snake[0];
    const nx = head.x + d.x;
    const ny = head.y + d.y;

    if (nx < 0 || ny < 0 || nx >= GRID || ny >= GRID) { gameOver(); return; }
    const willGrow = growRef.current > 0;
    const body = willGrow ? snake : snake.slice(0, -1);
    if (body.some((c) => c.x === nx && c.y === ny)) { gameOver(); return; }

    snake.unshift({ x: nx, y: ny });

    if (nx === foodRef.current.x && ny === foodRef.current.y) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
      growRef.current += 1;
      placeFood();
    }
    if (growRef.current > 0) growRef.current -= 1;
    else snake.pop();
  }, [gameOver, placeFood]);

  const draw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const { w, h } = sizeRef.current;
    const iso = computeIso(w, h);
    pulseRef.current += 0.06;

    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, "#15241a");
    bg.addColorStop(1, "#08130c");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const stars = Math.max(12, Math.floor(w * h / 14000));
    for (let i = 0; i < stars; i++) {
      const sx = (i * 97 + 13) % w;
      const sy = (i * 53 + 7) % (h * 0.5);
      const a = 0.05 + 0.08 * Math.sin(pulseRef.current + i);
      ctx.fillStyle = `rgba(255, 230, 180, ${a})`;
      ctx.fillRect(sx, sy, 1, 1);
    }

    for (let s = 0; s <= 2 * (GRID - 1); s++) {
      for (let x = 0; x <= s; x++) {
        const y = s - x;
        if (y < 0 || y >= GRID || x >= GRID) continue;
        const { sx, sy } = gridToScreen(x, y, iso);
        const light = (x + y) % 2 === 0;
        const base = light ? "#3c5e34" : "#314e29";
        const dist = Math.abs(x - GRID / 2 + 0.5) + Math.abs(y - GRID / 2 + 0.5);
        const shade = mix(base, "#1a2a16", Math.min(0.55, dist / GRID));
        drawTileFloor(ctx, sx, sy, iso.tileW, iso.tileH, shade);
      }
    }

    type Item = { x: number; y: number; kind: "snake" | "head" | "food"; idx: number };
    const items: Item[] = [];
    const snake = snakeRef.current;
    for (let i = snake.length - 1; i >= 0; i--) {
      items.push({ x: snake[i].x, y: snake[i].y, kind: i === 0 ? "head" : "snake", idx: i });
    }
    const f = foodRef.current;
    items.push({ x: f.x, y: f.y, kind: "food", idx: -1 });

    items.sort((a, b) => (a.x + a.y) - (b.x + b.y));

    for (const it of items) {
      const { sx, sy } = gridToScreen(it.x, it.y, iso);

      if (it.kind === "food") {
        const pulse = 1 + 0.08 * Math.sin(pulseRef.current * 1.6);
        const fw = iso.tileW * 0.62 * pulse;
        const fh = iso.tileH * 0.62 * pulse;
        const fhgt = iso.cubeH * 0.95 * pulse;
        drawCube(ctx, sx, sy, fw, fh, fhgt, GOLD_TOP, GOLD_RIGHT, GOLD_LEFT);
        const topY = sy - fhgt - fh / 2;
        ctx.strokeStyle = "#6b3f0a";
        ctx.lineWidth = Math.max(1.2, iso.tileW * 0.045);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(sx - iso.tileW * 0.16, topY + fh * 0.1);
        ctx.lineTo(sx + iso.tileW * 0.16, topY + fh * 0.1);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(sx, topY + fh * 0.05);
        ctx.lineTo(sx, topY + fh * 0.25);
        ctx.stroke();
        const sparkleA = 0.5 + 0.5 * Math.sin(pulseRef.current * 2);
        ctx.fillStyle = `rgba(255, 250, 200, ${sparkleA})`;
        ctx.beginPath();
        ctx.arc(sx, topY - fh * 0.15, Math.max(1, iso.tileW * 0.06), 0, Math.PI * 2);
        ctx.fill();
      } else if (it.kind === "head") {
        const hw = iso.tileW * 0.94;
        const hh = iso.tileH * 0.94;
        const hhgt = iso.cubeH * 1.15;
        drawCube(ctx, sx, sy, hw, hh, hhgt, BROWN_HEAD_TOP, BROWN_HEAD_RIGHT, BROWN_HEAD_LEFT);
        const topY = sy - hhgt;
        const earR = Math.max(2, iso.tileW * 0.08);
        ctx.fillStyle = BROWN_HEAD_TOP;
        ctx.beginPath();
        ctx.arc(sx - iso.tileW * 0.14, topY - hh * 0.05, earR, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(sx + iso.tileW * 0.14, topY - hh * 0.05, earR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#3a2010";
        ctx.beginPath();
        ctx.arc(sx - iso.tileW * 0.14, topY - hh * 0.05, earR * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(sx + iso.tileW * 0.14, topY - hh * 0.05, earR * 0.5, 0, Math.PI * 2);
        ctx.fill();
        const eyeR = Math.max(1.5, iso.tileW * 0.06);
        const eyeY = topY + hh * 0.1;
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(sx - iso.tileW * 0.12, eyeY, eyeR, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(sx + iso.tileW * 0.12, eyeY, eyeR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#1a0d05";
        ctx.beginPath();
        ctx.arc(sx - iso.tileW * 0.11, eyeY, eyeR * 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(sx + iso.tileW * 0.13, eyeY, eyeR * 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff8e0";
        const toothW = Math.max(1, iso.tileW * 0.05);
        const toothH = Math.max(1.5, iso.tileH * 0.12);
        ctx.fillRect(sx - toothW * 1.1, topY + hh * 0.28, toothW, toothH);
        ctx.fillRect(sx + toothW * 0.1, topY + hh * 0.28, toothW, toothH);
      } else {
        const t = it.idx / Math.max(1, snake.length - 1);
        const heightFactor = 1.0 - t * 0.25;
        const topShade = mix(BROWN_TOP, "#5e3a1c", t * 0.6);
        const rightShade = mix(BROWN_RIGHT, "#43280f", t * 0.6);
        const leftShade = mix(BROWN_LEFT, "#2e1a09", t * 0.6);
        const bw = iso.tileW * 0.84;
        const bh = iso.tileH * 0.84;
        const bhgt = iso.cubeH * heightFactor;
        drawCube(ctx, sx, sy, bw, bh, bhgt, topShade, rightShade, leftShade);
        if (it.idx % 2 === 0) {
          ctx.fillStyle = "rgba(255, 220, 160, 0.18)";
          const topY = sy - bhgt - bh / 2;
          ctx.beginPath();
          ctx.ellipse(sx, topY + bh * 0.15, bw * 0.22, bh * 0.18, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.strokeStyle = "rgba(255, 220, 160, 0.12)";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, w - 2, h - 2);
  }, []);

  useEffect(() => {
    const wrap = wrapRef.current;
    const cv = canvasRef.current;
    if (!wrap || !cv) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const w = Math.max(200, Math.floor(e.contentRect.width));
        const h = Math.max(200, Math.floor(e.contentRect.height));
        sizeRef.current = { w, h };
        const dpr = window.devicePixelRatio || 1;
        cv.width = Math.floor(w * dpr);
        cv.height = Math.floor(h * dpr);
        cv.style.width = w + "px";
        cv.style.height = h + "px";
        const ctx = cv.getContext("2d");
        if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const loop = (t: number) => {
      const dt = t - last;
      last = t;
      if (stateRef.current === "playing") {
        acc += dt;
        let guard = 0;
        const intv = intervalFor(scoreRef.current);
        while (acc >= intv && guard < 5) {
          acc -= intv;
          step();
          guard++;
          if (stateRef.current !== "playing") { acc = 0; break; }
        }
      } else {
        acc = 0;
      }
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [step, draw]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const s = stateRef.current;
      if (s === "ready" || s === "gameover") {
        if (START_KEYS.includes(k)) { e.preventDefault(); startGame(); }
        return;
      }
      if (k === "arrowup" || k === "w") { e.preventDefault(); setDir("up"); }
      else if (k === "arrowdown" || k === "s") { e.preventDefault(); setDir("down"); }
      else if (k === "arrowleft" || k === "a") { e.preventDefault(); setDir("left"); }
      else if (k === "arrowright" || k === "d") { e.preventDefault(); setDir("right"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [startGame, setDir]);

  const dpadBtn = "w-11 h-11 flex items-center justify-center rounded-lg bg-black/55 hover:bg-black/75 active:bg-amber-900/70 text-amber-100 backdrop-blur transition-colors";
  const dpad = (d: Dir, Icon: typeof ArrowUp, label: string) => (
    <button
      type="button"
      aria-label={label}
      onPointerDown={(e) => { e.preventDefault(); setDir(d); }}
      className={dpadBtn}
    >
      <Icon className="h-5 w-5" />
    </button>
  );

  return (
    <div
      ref={wrapRef}
      className="relative flex h-full w-full select-none items-center justify-center overflow-hidden bg-emerald-950/70 touch-none"
    >
      <canvas ref={canvasRef} className="rounded-lg shadow-2xl" role="img" aria-label="Изометрическое игровое поле" />

      <div className="pointer-events-none absolute left-2 top-2 flex gap-2">
        <div className="rounded-md bg-black/60 px-3 py-1 text-sm font-bold text-amber-100 backdrop-blur">
          Счёт: {score}
        </div>
        <div className="rounded-md bg-black/60 px-3 py-1 text-sm font-bold text-amber-300 backdrop-blur">
          Рекорд: {best}
        </div>
      </div>

      {screen === "playing" && (
        <div className="absolute bottom-3 right-3 grid grid-cols-3 grid-rows-3 gap-1 opacity-80 sm:opacity-60">
          <span />
          {dpad("up", ArrowUp, "Вверх")}
          <span />
          {dpad("left", ArrowLeft, "Влево")}
          <span />
          {dpad("right", ArrowRight, "Вправо")}
          <span />
          {dpad("down", ArrowDown, "Вниз")}
          <span />
        </div>
      )}

      {screen === "ready" && (
        <button
          type="button"
          onClick={startGame}
          className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center bg-black/60 px-4 text-center backdrop-blur-sm"
        >
          <Trees className="mb-3 h-12 w-12 text-amber-300" />
          <h2 className="mb-1 text-3xl font-black text-amber-300 drop-shadow-lg">Змейка 3D</h2>
          <p className="mb-2 text-sm text-amber-100/90">Бобёр в изометрии</p>
          <p className="text-xs text-amber-100/70">Стрелки или WASD · Нажми чтобы начать</p>
        </button>
      )}

      {screen === "gameover" && (
        <button
          type="button"
          onClick={startGame}
          className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center bg-black/70 px-4 text-center backdrop-blur-sm"
        >
          <Trophy className="mb-2 h-10 w-10 text-amber-300" />
          <p className="mb-3 text-2xl font-black text-red-400">Игра окончена!</p>
          <div className="mb-3 space-y-1 rounded-lg bg-black/40 px-5 py-3">
            <p className="text-amber-100">Счёт: <span className="font-bold text-amber-300">{score}</span></p>
            <p className="text-amber-100">Рекорд: <span className="font-bold text-amber-300">{best}</span></p>
          </div>
          <p className="flex items-center gap-1 text-sm text-amber-100/80">
            <RotateCcw className="h-4 w-4" /> Нажми для рестарта
          </p>
        </button>
      )}
    </div>
  );
}
