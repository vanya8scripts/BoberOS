"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Pause, Play, RotateCcw } from "lucide-react";

type GameState = "ready" | "playing" | "paused" | "gameover";
type Dir = "up" | "down" | "left" | "right";
interface Cell { x: number; y: number; }

const GRID = 20;
const DIRS: Record<Dir, Cell> = {
  up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
};
const OPP: Record<Dir, Dir> = { up: "down", down: "up", left: "right", right: "left" };
const BASE_INT = 165;
const MIN_INT = 70;

const intervalFor = (score: number): number => Math.max(MIN_INT, BASE_INT - score * 4);

function makeInitialSnake(): Cell[] {
  const cy = Math.floor(GRID / 2);
  return [{ x: 6, y: cy }, { x: 5, y: cy }, { x: 4, y: cy }, { x: 3, y: cy }];
}


function drawLog(ctx: CanvasRenderingContext2D, x: number, y: number, cell: number): void {
  const cx = x + cell / 2, cy = y + cell / 2;
  const w = cell * 0.92, h = cell * 0.6, r = h / 2;
  ctx.save();
  ctx.translate(cx, cy);
  const grad = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  grad.addColorStop(0, "#a06a36"); grad.addColorStop(0.5, "#7c4a23"); grad.addColorStop(1, "#5a3517");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-w / 2 + r, -h / 2);
  ctx.arcTo(w / 2, -h / 2, w / 2, h / 2, r);
  ctx.arcTo(w / 2, h / 2, -w / 2, h / 2, r);
  ctx.arcTo(-w / 2, h / 2, -w / 2, -h / 2, r);
  ctx.arcTo(-w / 2, -h / 2, w / 2, -h / 2, r);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(40,20,8,0.45)"; ctx.lineWidth = 1;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(-w / 2 + r * 0.8, i * h * 0.22);
    ctx.lineTo(w / 2 - r * 0.8, i * h * 0.22);
    ctx.stroke();
  }
  const ex = -w / 2 + r * 0.55;
  ctx.fillStyle = "#6b4220";
  ctx.beginPath(); ctx.arc(ex, 0, r * 0.78, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "rgba(20,10,4,0.7)";
  for (let i = 1; i <= 3; i++) {
    ctx.beginPath();
    ctx.arc(ex, 0, (r * 0.78 * i) / 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBeaver(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, cell: number,
  kind: "head" | "body" | "tail",
  dir: Dir,
): void {
  const cx = x + cell / 2, cy = y + cell / 2;
  const r = cell * 0.46;
  const f = DIRS[dir];
  const fx = f.x, fy = f.y, px = -fy, py = fx;

  if (kind === "tail") {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.atan2(fy, fx) + Math.PI / 2);
    const g = ctx.createLinearGradient(0, -r, 0, r);
    g.addColorStop(0, "#4a2c12"); g.addColorStop(1, "#241406");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.65, r, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.13)"; ctx.lineWidth = 1;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(-r * 0.5, i * r * 0.3);
      ctx.lineTo(r * 0.5, i * r * 0.3);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.2, cx, cy, r);
  if (kind === "head") { g.addColorStop(0, "#9a5e2c"); g.addColorStop(1, "#6a3f1c"); }
  else { g.addColorStop(0, "#b0743c"); g.addColorStop(1, "#7c4a22"); }
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(236,206,158,0.35)";
  ctx.beginPath();
  ctx.arc(cx - fx * r * 0.18, cy - fy * r * 0.18, r * 0.45, 0, Math.PI * 2);
  ctx.fill();

  if (kind === "head") {
    ctx.fillStyle = "#5a3416";
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(cx - fx * r * 0.55 + px * r * 0.55 * s, cy - fy * r * 0.55 + py * r * 0.55 * s, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const s of [-1, 1]) {
      const ex = cx + fx * r * 0.22 + px * r * 0.4 * s;
      const ey = cy + fy * r * 0.22 + py * r * 0.4 * s;
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(ex, ey, r * 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#1a0d05";
      ctx.beginPath(); ctx.arc(ex + fx * r * 0.08, ey + fy * r * 0.08, r * 0.11, 0, Math.PI * 2); ctx.fill();
    }
    ctx.save();
    ctx.translate(cx + fx * r * 0.55, cy + fy * r * 0.55);
    ctx.rotate(Math.atan2(fy, fx));
    ctx.fillStyle = "#fff";
    ctx.fillRect(-r * 0.04, -r * 0.22, r * 0.28, r * 0.18);
    ctx.fillRect(-r * 0.04, r * 0.04, r * 0.28, r * 0.18);
    ctx.restore();
    ctx.fillStyle = "#2a1408";
    ctx.beginPath();
    ctx.arc(cx + fx * r * 0.8, cy + fy * r * 0.8, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
}

const START_KEYS = ["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", " ", "enter", "p"];

export function Snake() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sizeRef = useRef(360);

  const [screen, setScreen] = useState<GameState>("ready");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);

  const stateRef = useRef<GameState>("ready");
  const snakeRef = useRef<Cell[]>(makeInitialSnake());
  const dirRef = useRef<Dir>("right");
  const nextDirRef = useRef<Dir>("right");
  const foodRef = useRef<Cell>({ x: 14, y: 10 });
  const scoreRef = useRef(0);
  const bestRef = useRef(0);
  const growRef = useRef(0);

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

  const togglePause = useCallback(() => {
    if (stateRef.current === "playing") setGS("paused");
    else if (stateRef.current === "paused") setGS("playing");
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
    const size = sizeRef.current;
    const cell = size / GRID;

    const bg = ctx.createLinearGradient(0, 0, 0, size);
    bg.addColorStop(0, "#27502d"); bg.addColorStop(1, "#0f2415");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = "rgba(255,255,255,0.045)"; ctx.lineWidth = 1;
    for (let i = 1; i < GRID; i++) {
      ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(size, i * cell); ctx.stroke();
    }

    const f = foodRef.current;
    drawLog(ctx, f.x * cell, f.y * cell, cell);

    const snake = snakeRef.current;
    for (let i = snake.length - 1; i >= 0; i--) {
      const seg = snake[i];
      let dir: Dir = dirRef.current;
      if (i > 0) {
        const prev = snake[i - 1];
        const dx = prev.x - seg.x, dy = prev.y - seg.y;
        if (dx === 1) dir = "right";
        else if (dx === -1) dir = "left";
        else if (dy === 1) dir = "down";
        else if (dy === -1) dir = "up";
      }
      let kind: "head" | "body" | "tail" = "body";
      if (i === 0) kind = "head";
      else if (i === snake.length - 1) kind = "tail";
      drawBeaver(ctx, seg.x * cell, seg.y * cell, cell, kind, dir);
    }

    ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, size - 2, size - 2);
  }, []);

  useEffect(() => {
    const wrap = wrapRef.current, cv = canvasRef.current;
    if (!wrap || !cv) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const s = Math.max(140, Math.floor(Math.min(e.contentRect.width, e.contentRect.height)));
        sizeRef.current = s;
        const dpr = window.devicePixelRatio || 1;
        cv.width = Math.floor(s * dpr);
        cv.height = Math.floor(s * dpr);
        cv.style.width = s + "px";
        cv.style.height = s + "px";
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
      else if (k === " " || k === "p") { e.preventDefault(); togglePause(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [startGame, setDir, togglePause]);

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
      className="relative flex h-full w-full select-none items-center justify-center overflow-hidden bg-emerald-950/50 touch-none"
    >
      <canvas ref={canvasRef} className="rounded-lg shadow-2xl" />

      {/* Score corner */}
      <div className="pointer-events-none absolute left-2 top-2 flex gap-2">
        <div className="rounded-md bg-black/55 px-3 py-1 text-sm font-bold text-amber-100 backdrop-blur">
          Счёт: {score}
        </div>
        <div className="rounded-md bg-black/55 px-3 py-1 text-sm font-bold text-amber-300 backdrop-blur">
          Рекорд: {best}
        </div>
      </div>

      {/* Pause button */}
      {(screen === "playing" || screen === "paused") && (
        <button
          type="button"
          onClick={togglePause}
          aria-label={screen === "paused" ? "Продолжить" : "Пауза"}
          className="absolute right-2 top-2 rounded-md bg-black/55 p-2 text-amber-100 backdrop-blur transition-colors hover:bg-black/75"
        >
          {screen === "paused" ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
        </button>
      )}

      {/* Touch D-pad (only while playing) */}
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

      {/* Ready overlay */}
      {screen === "ready" && (
        <button
          type="button"
          onClick={startGame}
          className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center bg-black/60 px-4 text-center backdrop-blur-sm"
        >
          <h2 className="mb-2 text-3xl font-black text-amber-300 drop-shadow-lg">Змейка Бобра</h2>
          <p className="mb-1 text-sm text-amber-100/90">Нажми чтобы начать</p>
          <p className="text-xs text-amber-100/70">Стрелки или WASD · Пробел — пауза</p>
        </button>
      )}

      {/* Paused overlay */}
      {screen === "paused" && (
        <button
          type="button"
          onClick={togglePause}
          className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center bg-black/60 text-center backdrop-blur-sm"
        >
          <Pause className="mb-2 h-10 w-10 text-amber-300" />
          <p className="text-lg font-bold text-amber-100">Пауза</p>
          <p className="text-xs text-amber-100/70">Нажми чтобы продолжить</p>
        </button>
      )}

      {/* Game over overlay */}
      {screen === "gameover" && (
        <button
          type="button"
          onClick={startGame}
          className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center bg-black/70 px-4 text-center backdrop-blur-sm"
        >
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
