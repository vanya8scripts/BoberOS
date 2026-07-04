"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Heart, MousePointerClick, RotateCcw, Trophy } from "lucide-react";

type GameState = "ready" | "playing" | "gameover" | "win";

const PADDLE_W = 110;
const PADDLE_H = 20;
const BALL_R = 7;
const COLS = 10;
const SIDE_MARGIN = 16;
const BRICK_TOP = 56;
const BRICK_H = 22;
const BRICK_PAD = 4;
const MAX_LIVES = 3;
const BASE_SPEED = 4.8;
const MAX_SPEED = 9.6;
const KB_SPEED = 8.5;
const BEST_KEY = "boberos-breakout-best";

interface RowDef {
  fill: string;
  dark: string;
  glow: string;
  points: number;
  hp: number;
}

const ROWS: RowDef[] = [
  { fill: "#3a1d09", dark: "#1c0d04", glow: "#9a3412", points: 60, hp: 2 },
  { fill: "#5a2d10", dark: "#2a1408", glow: "#c2410c", points: 50, hp: 2 },
  { fill: "#7c3a14", dark: "#3a1a08", glow: "#ea580c", points: 40, hp: 1 },
  { fill: "#9a4d16", dark: "#4a240a", glow: "#f97316", points: 30, hp: 1 },
  { fill: "#b4641c", dark: "#5a2e0c", glow: "#fb923c", points: 20, hp: 1 },
];

interface Brick {
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  row: number;
}

interface BallState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
}

function loadBest(): number {
  if (typeof window === "undefined") return 0;
  try {
    const v = window.localStorage.getItem(BEST_KEY);
    if (v == null) return 0;
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? 0 : n;
  } catch {
    return 0;
  }
}

function makeBricks(w: number, level: number): Brick[] {
  const rowCount = Math.min(ROWS.length + Math.floor((level - 1) / 2), ROWS.length + 2);
  const usable = w - SIDE_MARGIN * 2;
  const bw = (usable - (COLS - 1) * BRICK_PAD) / COLS;
  const out: Brick[] = [];
  for (let r = 0; r < rowCount; r++) {
    const rowDef = ROWS[r % ROWS.length];
    for (let c = 0; c < COLS; c++) {
      out.push({
        x: SIDE_MARGIN + c * (bw + BRICK_PAD),
        y: BRICK_TOP + r * (BRICK_H + BRICK_PAD),
        w: bw,
        h: BRICK_H,
        hp: rowDef.hp,
        maxHp: rowDef.hp,
        row: r % ROWS.length,
      });
    }
  }
  return out;
}

function makeBall(paddleX: number, paddleY: number, speed: number): BallState {
  const angle = -Math.PI / 2 + (Math.random() * 0.6 - 0.3);
  return {
    x: paddleX + PADDLE_W / 2,
    y: paddleY - BALL_R - 1,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    speed,
  };
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
): void {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#0c1626");
  sky.addColorStop(0.45, "#16243a");
  sky.addColorStop(0.55, "#1d3346");
  sky.addColorStop(1, "#0a1a26");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "rgba(255, 240, 200, 0.55)";
  for (let i = 0; i < 26; i++) {
    const sx = ((i * 97) % w) + ((i * 13) % 5);
    const sy = (i * 37) % (h * 0.42);
    const tw = 0.5 + 0.5 * Math.sin(t * 0.002 + i);
    ctx.globalAlpha = 0.25 + tw * 0.45;
    ctx.fillRect(sx, sy, 1.4, 1.4);
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = "rgba(255, 246, 220, 0.85)";
  ctx.beginPath();
  ctx.arc(w - 48, 36, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(12, 22, 38, 0.85)";
  ctx.beginPath();
  ctx.arc(w - 44, 32, 9, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(8, 14, 22, 0.9)";
  const treeY = h * 0.5;
  for (let i = 0; i < 4; i++) {
    const tx = 6 + i * 10;
    ctx.beginPath();
    ctx.moveTo(tx, treeY);
    ctx.lineTo(tx - 7, treeY + 18);
    ctx.lineTo(tx + 7, treeY + 18);
    ctx.closePath();
    ctx.fill();
  }
  for (let i = 0; i < 4; i++) {
    const tx = w - 6 - i * 10;
    ctx.beginPath();
    ctx.moveTo(tx, treeY);
    ctx.lineTo(tx - 7, treeY + 18);
    ctx.lineTo(tx + 7, treeY + 18);
    ctx.closePath();
    ctx.fill();
  }

  const waterTop = h * 0.55;
  const wg = ctx.createLinearGradient(0, waterTop, 0, h);
  wg.addColorStop(0, "rgba(20, 50, 70, 0.55)");
  wg.addColorStop(1, "rgba(8, 24, 36, 0.85)");
  ctx.fillStyle = wg;
  ctx.fillRect(0, waterTop, w, h - waterTop);
  ctx.strokeStyle = "rgba(120, 200, 230, 0.12)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const ry = waterTop + 12 + i * 16;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 8) {
      const yo = Math.sin((x + t * 0.04 + i * 30) * 0.05) * 1.4;
      if (x === 0) ctx.moveTo(x, ry + yo);
      else ctx.lineTo(x, ry + yo);
    }
    ctx.stroke();
  }

  ctx.fillStyle = "#2a1608";
  ctx.fillRect(0, 0, 4, h);
  ctx.fillRect(w - 4, 0, 4, h);
}

function drawBrick(ctx: CanvasRenderingContext2D, b: Brick): void {
  const row = ROWS[b.row];
  const damaged = b.hp < b.maxHp;

  ctx.shadowColor = row.glow;
  ctx.shadowBlur = 6;

  const grad = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
  grad.addColorStop(0, row.fill);
  grad.addColorStop(1, row.dark);
  ctx.fillStyle = grad;
  roundRect(ctx, b.x, b.y, b.w, b.h, 4);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = "rgba(255, 220, 160, 0.16)";
  ctx.fillRect(b.x + 2, b.y + 2, b.w - 4, 2);

  ctx.strokeStyle = "rgba(0, 0, 0, 0.28)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(b.x + 3, b.y + b.h * 0.42);
  ctx.lineTo(b.x + b.w - 3, b.y + b.h * 0.42);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(b.x + 3, b.y + b.h * 0.7);
  ctx.lineTo(b.x + b.w - 3, b.y + b.h * 0.7);
  ctx.stroke();

  ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
  ctx.beginPath();
  ctx.arc(b.x + 3, b.y + b.h / 2, b.h * 0.28, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(b.x + b.w - 3, b.y + b.h / 2, b.h * 0.28, Math.PI / 2, -Math.PI / 2);
  ctx.stroke();

  if (damaged) {
    ctx.strokeStyle = "rgba(0, 0, 0, 0.65)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(b.x + b.w * 0.3, b.y + 2);
    ctx.lineTo(b.x + b.w * 0.42, b.y + b.h * 0.5);
    ctx.lineTo(b.x + b.w * 0.34, b.y + b.h - 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(b.x + b.w * 0.66, b.y + 2);
    ctx.lineTo(b.x + b.w * 0.58, b.y + b.h * 0.55);
    ctx.stroke();
  }
}

function drawPaddle(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const cx = x + PADDLE_W / 2;
  const cy = y + PADDLE_H / 2;

  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;

  const grad = ctx.createLinearGradient(0, y, 0, y + PADDLE_H);
  grad.addColorStop(0, "#4a3b30");
  grad.addColorStop(0.5, "#2e241c");
  grad.addColorStop(1, "#1a130d");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(cx, cy, PADDLE_W / 2, PADDLE_H / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.strokeStyle = "rgba(0,0,0,0.42)";
  ctx.lineWidth = 1;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, PADDLE_W / 2 - 1, PADDLE_H / 2 - 1, 0, 0, Math.PI * 2);
  ctx.clip();
  for (let i = -2; i < PADDLE_W / 8 + 2; i++) {
    const lx = x + i * 8;
    ctx.beginPath();
    ctx.moveTo(lx, y);
    ctx.lineTo(lx + 4, y + PADDLE_H);
    ctx.stroke();
  }
  ctx.restore();

  ctx.fillStyle = "rgba(255, 220, 180, 0.18)";
  ctx.beginPath();
  ctx.ellipse(cx, y + PADDLE_H * 0.28, PADDLE_W * 0.4, 2, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawBall(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.shadowColor = "#fbbf24";
  ctx.shadowBlur = 14;
  const g = ctx.createRadialGradient(x - 2, y - 2, 1, x, y, BALL_R);
  g.addColorStop(0, "#e8d6a8");
  g.addColorStop(0.6, "#a98554");
  g.addColorStop(1, "#5a3a1c");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, BALL_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(40, 24, 10, 0.6)";
  ctx.beginPath();
  ctx.arc(x + 1.5, y + 1.5, 1.1, 0, Math.PI * 2);
  ctx.fill();
}

export function Breakout() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const stateRef = useRef<GameState>("ready");
  const [state, setState] = useState<GameState>("ready");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [level, setLevel] = useState(1);
  const [best, setBest] = useState(() => loadBest());

  const sizeRef = useRef({ w: 600, h: 440 });
  const ballRef = useRef<BallState>({
    x: 300,
    y: 380,
    vx: 0,
    vy: 0,
    speed: BASE_SPEED,
  });
  const paddleXRef = useRef((600 - PADDLE_W) / 2);
  const paddleYRef = useRef(440 - 30);
  const bricksRef = useRef<Brick[]>([]);
  const scoreRef = useRef(0);
  const livesRef = useRef(MAX_LIVES);
  const levelRef = useRef(1);
  const bestRef = useRef(0);
  const pointerXRef = useRef<number | null>(null);
  const keysRef = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });

  const setStateBoth = useCallback((s: GameState) => {
    stateRef.current = s;
    setState(s);
  }, []);

  const regenBricks = useCallback(() => {
    bricksRef.current = makeBricks(sizeRef.current.w, levelRef.current);
  }, []);

  const resetBall = useCallback(() => {
    const speed = BASE_SPEED + (levelRef.current - 1) * 0.55;
    ballRef.current = makeBall(paddleXRef.current, paddleYRef.current, speed);
  }, []);

  const startGame = useCallback(() => {
    scoreRef.current = 0;
    livesRef.current = MAX_LIVES;
    levelRef.current = 1;
    setScore(0);
    setLives(MAX_LIVES);
    setLevel(1);
    const { w, h } = sizeRef.current;
    paddleXRef.current = (w - PADDLE_W) / 2;
    paddleYRef.current = h - 30;
    regenBricks();
    resetBall();
    setStateBoth("playing");
  }, [regenBricks, resetBall, setStateBoth]);

  const nextLevel = useCallback(() => {
    levelRef.current += 1;
    setLevel(levelRef.current);
    regenBricks();
    resetBall();
    setStateBoth("playing");
  }, [regenBricks, resetBall, setStateBoth]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const apply = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(280, wrap.clientWidth);
      const h = Math.max(220, wrap.clientHeight);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = { w, h };
      paddleYRef.current = h - 30;
      const fresh = makeBricks(w, levelRef.current);
      const old = bricksRef.current;
      if (old.length === fresh.length) {
        for (let i = 0; i < fresh.length; i++) fresh[i].hp = old[i].hp;
      }
      bricksRef.current = fresh;
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
      const ball = ballRef.current;
      const st = stateRef.current;
      const paddleY = paddleYRef.current;

      if (pointerXRef.current != null) {
        const diff = pointerXRef.current - paddleXRef.current;
        paddleXRef.current += diff * Math.min(1, 0.4 * dt);
      } else {
        if (keysRef.current.left) paddleXRef.current -= KB_SPEED * dt;
        if (keysRef.current.right) paddleXRef.current += KB_SPEED * dt;
      }
      paddleXRef.current = Math.max(0, Math.min(w - PADDLE_W, paddleXRef.current));

      if (st === "playing") {
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;

        if (ball.x - BALL_R < 0) {
          ball.x = BALL_R;
          ball.vx = Math.abs(ball.vx);
        } else if (ball.x + BALL_R > w) {
          ball.x = w - BALL_R;
          ball.vx = -Math.abs(ball.vx);
        }
        if (ball.y - BALL_R < 0) {
          ball.y = BALL_R;
          ball.vy = Math.abs(ball.vy);
        }

        if (
          ball.vy > 0 &&
          ball.y + BALL_R >= paddleY &&
          ball.y + BALL_R <= paddleY + PADDLE_H + 6 &&
          ball.x >= paddleXRef.current - BALL_R &&
          ball.x <= paddleXRef.current + PADDLE_W + BALL_R
        ) {
          const rel = (ball.x - (paddleXRef.current + PADDLE_W / 2)) / (PADDLE_W / 2);
          const clamped = Math.max(-1, Math.min(1, rel));
          const angle = clamped * ((Math.PI / 180) * 60);
          ball.speed = Math.min(MAX_SPEED, ball.speed * 1.015);
          const sp = Math.max(ball.speed, BASE_SPEED);
          ball.vx = Math.sin(angle) * sp;
          ball.vy = -Math.abs(Math.cos(angle) * sp);
          ball.y = paddleY - BALL_R - 0.5;
        }

        const bricks = bricksRef.current;
        for (let i = 0; i < bricks.length; i++) {
          const b = bricks[i];
          if (b.hp <= 0) continue;
          if (
            ball.x + BALL_R > b.x &&
            ball.x - BALL_R < b.x + b.w &&
            ball.y + BALL_R > b.y &&
            ball.y - BALL_R < b.y + b.h
          ) {
            const oL = ball.x + BALL_R - b.x;
            const oR = b.x + b.w - (ball.x - BALL_R);
            const oT = ball.y + BALL_R - b.y;
            const oB = b.y + b.h - (ball.y - BALL_R);
            const m = Math.min(oL, oR, oT, oB);
            if (m === oL || m === oR) ball.vx = -ball.vx;
            else ball.vy = -ball.vy;
            b.hp -= 1;
            if (b.hp <= 0) {
              scoreRef.current += ROWS[b.row].points;
              setScore(scoreRef.current);
            }
            break;
          }
        }

        if (ball.y - BALL_R > h) {
          livesRef.current -= 1;
          setLives(livesRef.current);
          if (livesRef.current <= 0) {
            if (scoreRef.current > bestRef.current) {
              bestRef.current = scoreRef.current;
              setBest(scoreRef.current);
              try {
                window.localStorage.setItem(BEST_KEY, String(scoreRef.current));
              } catch {
                /* ignore */
              }
            }
            setStateBoth("gameover");
          } else {
            resetBall();
          }
        }

        if (stateRef.current === "playing" && bricksRef.current.every((b) => b.hp <= 0)) {
          setStateBoth("win");
        }
      }

      drawBackground(ctx, w, h, now);
      for (const b of bricksRef.current) if (b.hp > 0) drawBrick(ctx, b);
      drawPaddle(ctx, paddleXRef.current, paddleY);
      drawBall(ctx, ball.x, ball.y);

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [resetBall, setStateBoth]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key;
      if (k === "ArrowLeft" || k === "a" || k === "A") {
        keysRef.current.left = true;
        pointerXRef.current = null;
        e.preventDefault();
      } else if (k === "ArrowRight" || k === "d" || k === "D") {
        keysRef.current.right = true;
        pointerXRef.current = null;
        e.preventDefault();
      } else if (k === " " || k === "Enter") {
        const s = stateRef.current;
        if (s === "ready" || s === "gameover") startGame();
        else if (s === "win") nextLevel();
        e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key;
      if (k === "ArrowLeft" || k === "a" || k === "A") keysRef.current.left = false;
      else if (k === "ArrowRight" || k === "d" || k === "D") keysRef.current.right = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [startGame, nextLevel]);

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    pointerXRef.current = e.clientX - rect.left - PADDLE_W / 2;
  };

  const onPointerDown = () => {
    const s = stateRef.current;
    if (s === "ready" || s === "gameover") startGame();
    else if (s === "win") nextLevel();
  };

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full select-none overflow-hidden bg-[#0a1a26]"
      onPointerDown={onPointerDown}
    >
      <canvas
        ref={canvasRef}
        className={`block h-full w-full ${state === "playing" ? "cursor-none" : "cursor-pointer"}`}
        onPointerMove={onPointerMove}
      />

      {state === "playing" && (
        <div className="pointer-events-none absolute inset-x-0 top-2 flex items-center justify-between px-3 text-xs">
          <div className="rounded-md bg-black/45 px-2 py-1 font-semibold text-amber-200">
            Счёт: <span className="font-mono">{score}</span>
          </div>
          <div className="rounded-md bg-black/45 px-2 py-1 font-semibold text-amber-200">
            Ур. {level}
          </div>
          <div className="flex items-center gap-1 rounded-md bg-black/45 px-2 py-1">
            {Array.from({ length: MAX_LIVES }).map((_, i) => (
              <Heart
                key={i}
                className={`h-3.5 w-3.5 ${i < lives ? "fill-rose-500 text-rose-500" : "text-rose-500/30"}`}
              />
            ))}
          </div>
        </div>
      )}

      {state !== "playing" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/55 px-6 text-center backdrop-blur-sm">
          {state === "ready" && (
            <>
              <h2 className="text-3xl font-extrabold text-amber-300 drop-shadow">Арканоид Бобра</h2>
              <p className="text-sm text-amber-100/85">Нажми чтобы начать</p>
              <p className="text-xs text-amber-100/60">Мышь или ← →</p>
              <div className="mt-1 flex items-center gap-1.5 text-amber-300/80">
                <MousePointerClick className="h-5 w-5" />
                <span className="text-[11px]">разбей все брёвна · {MAX_LIVES} жизни</span>
              </div>
            </>
          )}
          {state === "gameover" && (
            <>
              <h2 className="text-4xl font-extrabold text-rose-400 drop-shadow">Игра окончена</h2>
              <div className="text-sm text-amber-100/85">
                Счёт: <span className="font-mono">{score}</span>
              </div>
              <div className="text-xs text-amber-100/70">
                Рекорд: <span className="font-mono">{best}</span>
              </div>
              <p className="text-sm text-amber-100/70">Нажми для рестарта</p>
              <RotateCcw className="mt-1 h-6 w-6 text-amber-300/85" />
            </>
          )}
          {state === "win" && (
            <>
              <Trophy className="h-8 w-8 text-amber-300 drop-shadow" />
              <h2 className="text-3xl font-extrabold text-amber-300 drop-shadow">Победа!</h2>
              <p className="text-sm text-amber-100/85">Все брёвна сломаны!</p>
              <div className="text-xs text-amber-100/70">
                Счёт: <span className="font-mono">{score}</span> · Уровень {level}
              </div>
              <p className="mt-1 text-sm text-amber-100/80">Нажми для следующего уровня</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
