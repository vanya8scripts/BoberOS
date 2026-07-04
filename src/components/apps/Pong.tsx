"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MousePointerClick, RotateCcw } from "lucide-react";

type GameState = "ready" | "playing" | "gameover";
type Side = "player" | "ai";

const WIN_SCORE = 7;
const PADDLE_W = 26;
const PADDLE_H = 96;
const BALL_R = 9;
const PADDLE_MARGIN = 24;
const BASE_BALL_SPEED = 5.2;
const MAX_BALL_SPEED = 11.5;
const AI_MAX_SPEED = 4.6;
const AI_REACTION_ERROR = 18;
const PLAYER_KB_SPEED = 7.4;
const SPEED_UP = 1.045;
const MAX_BOUNCE_ANGLE = (Math.PI / 180) * 56;
const TRAIL_LEN = 9;

interface BallState { x: number; y: number; vx: number; vy: number; speed: number; }
interface Pt { x: number; y: number; }

function makeBall(w: number, h: number, dir: 1 | -1): BallState {
  const a = Math.random() * 0.5 - 0.25;
  return { x: w / 2, y: h / 2, vx: Math.cos(a) * BASE_BALL_SPEED * dir, vy: Math.sin(a) * BASE_BALL_SPEED, speed: BASE_BALL_SPEED };
}

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

function bounceOffPaddle(side: Side, ball: BallState, paddleY: number, w: number): void {
  const rel = Math.max(-1, Math.min(1, (ball.y - (paddleY + PADDLE_H / 2)) / (PADDLE_H / 2)));
  const angle = rel * MAX_BOUNCE_ANGLE;
  ball.speed = Math.min(MAX_BALL_SPEED, ball.speed * SPEED_UP);
  const dir = side === "player" ? 1 : -1;
  ball.vx = Math.cos(angle) * ball.speed * dir;
  ball.vy = Math.sin(angle) * ball.speed;
  ball.x = side === "player" ? PADDLE_MARGIN + PADDLE_W + BALL_R + 0.5 : w - PADDLE_MARGIN - PADDLE_W - BALL_R - 0.5;
}

function drawBeaver(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const w = PADDLE_W, h = PADDLE_H;
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, "#6b4423"); g.addColorStop(1, "#8b5a2b");
  ctx.fillStyle = g; roundRect(ctx, x, y, w, h, 7); ctx.fill();
  ctx.fillStyle = "#5a3618";
  ctx.beginPath();
  ctx.arc(x + 7, y + 5, 4, 0, Math.PI * 2);
  ctx.arc(x + w - 7, y + 5, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#c9a36a"; roundRect(ctx, x + w - 13, y + h / 2 - 11, 13, 22, 6); ctx.fill();
  ctx.fillStyle = "#1a1208";
  ctx.beginPath();
  ctx.arc(x + w - 6, y + h / 2 - 6, 1.9, 0, Math.PI * 2);
  ctx.arc(x + w - 6, y + h / 2 - 1, 1.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2a1a0a";
  ctx.beginPath(); ctx.arc(x + w - 2, y + h / 2 + 2, 2.1, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#fdfdf5";
  ctx.fillRect(x + w - 3, y + h / 2 + 5, 4, 3);
  ctx.fillRect(x + w - 3, y + h / 2 + 9, 4, 3);
}

function drawBadger(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const w = PADDLE_W, h = PADDLE_H;
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, "#3a3a42"); g.addColorStop(1, "#23232a");
  ctx.fillStyle = g; roundRect(ctx, x, y, w, h, 7); ctx.fill();
  ctx.fillStyle = "#e8e8e0";
  ctx.fillRect(x + 4, y + 8, 4, 28);
  ctx.fillRect(x + w - 8, y + 8, 4, 28);
  ctx.fillStyle = "#c8c8be"; roundRect(ctx, x, y + h / 2 - 10, 12, 20, 6); ctx.fill();
  ctx.fillStyle = "#0c0c10";
  ctx.beginPath();
  ctx.arc(x + 6, y + h / 2 - 5, 1.9, 0, Math.PI * 2);
  ctx.arc(x + 6, y + h / 2, 1.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath(); ctx.arc(x + 1, y + h / 2 + 3, 2, 0, Math.PI * 2); ctx.fill();
}

function drawLog(ctx: CanvasRenderingContext2D, ball: BallState): void {
  ctx.save();
  ctx.translate(ball.x, ball.y);
  ctx.rotate(Math.atan2(ball.vy, ball.vx));
  ctx.fillStyle = "#a06030";
  roundRect(ctx, -BALL_R - 1, -BALL_R + 2, (BALL_R + 1) * 2, (BALL_R - 2) * 2, 4);
  ctx.fill();
  ctx.fillStyle = "#6e3d18";
  ctx.beginPath();
  ctx.arc(-BALL_R, 0, BALL_R - 3, 0, Math.PI * 2);
  ctx.arc(BALL_R, 0, BALL_R - 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#caa06a";
  ctx.beginPath();
  ctx.arc(-BALL_R, 0, BALL_R - 6, 0, Math.PI * 2);
  ctx.arc(BALL_R, 0, BALL_R - 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawScene(
  ctx: CanvasRenderingContext2D, w: number, h: number, ball: BallState,
  playerY: number, aiY: number, pscore: number, ascore: number, trail: Pt[],
): void {
  ctx.fillStyle = "#0e1a14"; ctx.fillRect(0, 0, w, h);
  const g = ctx.createRadialGradient(w / 2, h / 2, 30, w / 2, h / 2, Math.max(w, h) / 1.1);
  g.addColorStop(0, "rgba(60, 110, 70, 0.30)"); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(180, 220, 180, 0.30)"; ctx.lineWidth = 2; ctx.setLineDash([8, 12]);
  ctx.beginPath(); ctx.moveTo(w / 2, 6); ctx.lineTo(w / 2, h - 6); ctx.stroke(); ctx.setLineDash([]);
  for (let i = 0; i < trail.length; i++) {
    const p = trail[i];
    const t = (i + 1) / (trail.length + 1);
    ctx.fillStyle = `rgba(200, 150, 90, ${0.16 * t})`;
    ctx.beginPath(); ctx.arc(p.x, p.y, BALL_R * (0.5 + 0.4 * t), 0, Math.PI * 2); ctx.fill();
  }
  drawBeaver(ctx, PADDLE_MARGIN, playerY);
  drawBadger(ctx, w - PADDLE_MARGIN - PADDLE_W, aiY);
  drawLog(ctx, ball);
  ctx.font = "bold 44px ui-monospace, monospace"; ctx.textBaseline = "top";
  ctx.textAlign = "right"; ctx.fillStyle = "rgba(210, 160, 95, 0.82)";
  ctx.fillText(String(pscore), w / 2 - 24, 12);
  ctx.textAlign = "left"; ctx.fillStyle = "rgba(190, 190, 200, 0.82)";
  ctx.fillText(String(ascore), w / 2 + 24, 12);
}

export function Pong() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const stateRef = useRef<GameState>("ready");
  const [state, setState] = useState<GameState>("ready");
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [winner, setWinner] = useState<"player" | "ai" | null>(null);

  const sizeRef = useRef({ w: 640, h: 420 });
  const ballRef = useRef<BallState>(makeBall(640, 420, 1));
  const playerYRef = useRef((420 - PADDLE_H) / 2);
  const aiYRef = useRef((420 - PADDLE_H) / 2);
  const scoreRef = useRef({ player: 0, ai: 0 });
  const trailRef = useRef<Pt[]>([]);
  const mouseTargetYRef = useRef<number | null>(null);
  const keysRef = useRef<{ up: boolean; down: boolean }>({ up: false, down: false });

  const setStateBoth = useCallback((s: GameState) => {
    stateRef.current = s; setState(s);
  }, []);

  const resetBall = useCallback((dir: 1 | -1) => {
    const { w, h } = sizeRef.current;
    ballRef.current = makeBall(w, h, dir);
    trailRef.current = [];
  }, []);

  const startGame = useCallback(() => {
    const { h } = sizeRef.current;
    scoreRef.current = { player: 0, ai: 0 };
    setPlayerScore(0); setAiScore(0); setWinner(null);
    playerYRef.current = (h - PADDLE_H) / 2;
    aiYRef.current = (h - PADDLE_H) / 2;
    trailRef.current = [];
    resetBall(Math.random() < 0.5 ? 1 : -1);
    setStateBoth("playing");
  }, [resetBall, setStateBoth]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const apply = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(280, wrap.clientWidth);
      const h = Math.max(200, wrap.clientHeight);
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
      const ball = ballRef.current;
      const st = stateRef.current;

      if (mouseTargetYRef.current != null) {
        const diff = mouseTargetYRef.current - playerYRef.current;
        playerYRef.current += diff * Math.min(1, 0.32 * dt);
      } else {
        if (keysRef.current.up) playerYRef.current -= PLAYER_KB_SPEED * dt;
        if (keysRef.current.down) playerYRef.current += PLAYER_KB_SPEED * dt;
      }
      playerYRef.current = Math.max(0, Math.min(h - PADDLE_H, playerYRef.current));

      if (st === "playing") {
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;

        if (ball.y - BALL_R < 0) { ball.y = BALL_R; ball.vy = Math.abs(ball.vy); }
        else if (ball.y + BALL_R > h) { ball.y = h - BALL_R; ball.vy = -Math.abs(ball.vy); }

        const playerX = PADDLE_MARGIN;
        const aiX = w - PADDLE_MARGIN - PADDLE_W;
        if (
          ball.vx < 0 &&
          ball.x + BALL_R >= playerX && ball.x - BALL_R <= playerX + PADDLE_W &&
          ball.y + BALL_R >= playerYRef.current && ball.y - BALL_R <= playerYRef.current + PADDLE_H
        ) bounceOffPaddle("player", ball, playerYRef.current, w);
        if (
          ball.vx > 0 &&
          ball.x + BALL_R >= aiX && ball.x - BALL_R <= aiX + PADDLE_W &&
          ball.y + BALL_R >= aiYRef.current && ball.y - BALL_R <= aiYRef.current + PADDLE_H
        ) bounceOffPaddle("ai", ball, aiYRef.current, w);

        trailRef.current.push({ x: ball.x, y: ball.y });
        if (trailRef.current.length > TRAIL_LEN) trailRef.current.shift();

        if (ball.x + BALL_R < 0) {
          scoreRef.current.ai++;
          setAiScore(scoreRef.current.ai);
          if (scoreRef.current.ai >= WIN_SCORE) { setWinner("ai"); setStateBoth("gameover"); }
          else resetBall(-1);
        } else if (ball.x - BALL_R > w) {
          scoreRef.current.player++;
          setPlayerScore(scoreRef.current.player);
          if (scoreRef.current.player >= WIN_SCORE) { setWinner("player"); setStateBoth("gameover"); }
          else resetBall(1);
        }

        let aim: number;
        if (ball.vx > 0) {
          const err = Math.sin(now / 530 + 1.7) * AI_REACTION_ERROR;
          aim = ball.y - PADDLE_H / 2 + err;
        } else {
          aim = (h - PADDLE_H) / 2 + Math.sin(now / 700) * h * 0.08;
        }
        const aiDiff = aim - aiYRef.current;
        aiYRef.current += Math.sign(aiDiff) * Math.min(AI_MAX_SPEED * dt, Math.abs(aiDiff));
        aiYRef.current = Math.max(0, Math.min(h - PADDLE_H, aiYRef.current));
      }

      drawScene(
        ctx, w, h, ball, playerYRef.current, aiYRef.current,
        scoreRef.current.player, scoreRef.current.ai, trailRef.current,
      );
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [resetBall, setStateBoth]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key;
      if (k === "ArrowUp" || k === "w" || k === "W") {
        keysRef.current.up = true; mouseTargetYRef.current = null; e.preventDefault();
      } else if (k === "ArrowDown" || k === "s" || k === "S") {
        keysRef.current.down = true; mouseTargetYRef.current = null; e.preventDefault();
      } else if (k === " " || k === "Enter") {
        if (stateRef.current !== "playing") startGame();
        e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key;
      if (k === "ArrowUp" || k === "w" || k === "W") keysRef.current.up = false;
      else if (k === "ArrowDown" || k === "s" || k === "S") keysRef.current.down = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [startGame]);

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseTargetYRef.current = e.clientY - rect.top - PADDLE_H / 2;
  };
  const onPointerDown = () => { if (stateRef.current !== "playing") startGame(); };

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full select-none overflow-hidden bg-[#0e1a14]"
      onPointerDown={onPointerDown}
    >
      <canvas
        ref={canvasRef}
        className={`block h-full w-full ${state === "playing" ? "cursor-none" : "cursor-pointer"}`}
        onMouseMove={onMouseMove}
      />

      {state === "playing" && (
        <div className="pointer-events-none absolute inset-x-0 top-1.5 flex justify-between px-5 text-[11px] font-semibold uppercase tracking-wider">
          <span className="text-amber-300/80">Бобёр</span>
          <span className="text-zinc-300/80">Барсук</span>
        </div>
      )}

      {state !== "playing" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/55 px-6 text-center backdrop-blur-sm">
          {state === "ready" && (
            <>
              <h2 className="text-3xl font-extrabold text-amber-300 drop-shadow">Пинг-Понг Бобра</h2>
              <p className="text-sm text-amber-100/85">Нажми чтобы начать</p>
              <p className="text-xs text-amber-100/60">Мышь или W/S</p>
              <div className="mt-1 flex items-center gap-1.5 text-amber-300/80">
                <MousePointerClick className="h-5 w-5" />
                <span className="text-[11px]">первый до {WIN_SCORE}</span>
              </div>
            </>
          )}
          {state === "gameover" && (
            <>
              <h2
                className={`text-4xl font-extrabold drop-shadow ${winner === "player" ? "text-amber-300" : "text-zinc-400"}`}
              >
                {winner === "player" ? "Победа!" : "Поражение..."}
              </h2>
              <div className="text-sm text-amber-100/85">
                Счёт: <span className="font-mono">{playerScore} : {aiScore}</span>
              </div>
              <p className="text-sm text-amber-100/70">Нажми для рестарта</p>
              <RotateCcw className="mt-1 h-6 w-6 text-amber-300/85" />
            </>
          )}
        </div>
      )}
    </div>
  );
}
