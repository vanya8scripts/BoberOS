"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type GameState = "ready" | "playing" | "gameover";

interface Pipe {
  x: number;
  gapY: number;
  gapH: number;
  passed: boolean;
}

interface Cloud {
  x: number;
  y: number;
  s: number;
}

const GRAVITY = 0.45;
const FLAP_V = -7.4;
const PIPE_W = 72;
const PIPE_GAP = 165;
const PIPE_SPACING = 225;
const PIPE_SPEED = 2.2;
const GROUND_H = 72;
const BEAVER_R = 17;

export function FlappyBober() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const sizeRef = useRef<{ w: number; h: number }>({ w: 480, h: 640 });

  const [screen, setScreen] = useState<GameState>("ready");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);

  const stateRef = useRef<GameState>("ready");
  const beaverRef = useRef({ x: 140, y: 260, v: 0, rot: 0 });
  const pipesRef = useRef<Pipe[]>([]);
  const cloudsRef = useRef<Cloud[]>([]);
  const groundOffRef = useRef(0);
  const scoreRef = useRef(0);
  const bestRef = useRef(0);
  const flapAnimRef = useRef(0);

  const setGameState = (s: GameState) => {
    stateRef.current = s;
    setScreen(s);
  };

  const resetGame = useCallback(() => {
    const { w, h } = sizeRef.current;
    beaverRef.current = { x: w * 0.28, y: h * 0.45, v: 0, rot: 0 };
    pipesRef.current = [];
    scoreRef.current = 0;
    setScore(0);
    flapAnimRef.current = 0;
  }, []);

  const startGame = useCallback(() => {
    resetGame();
    setGameState("playing");
    beaverRef.current.v = FLAP_V;
    flapAnimRef.current = 1;
  }, [resetGame]);

  const flap = useCallback(() => {
    const s = stateRef.current;
    if (s === "ready" || s === "gameover") {
      startGame();
      return;
    }
    beaverRef.current.v = FLAP_V;
    flapAnimRef.current = 1;
  }, [startGame]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const resize = () => {
      const w = Math.max(1, wrap.clientWidth);
      const h = Math.max(1, wrap.clientHeight);
      sizeRef.current = { w, h };
      canvas.width = w;
      canvas.height = h;
      if (cloudsRef.current.length === 0) {
        for (let i = 0; i < 3; i++) {
          cloudsRef.current.push({
            x: Math.random() * w,
            y: 30 + Math.random() * (h * 0.32),
            s: 0.6 + Math.random() * 0.6,
          });
        }
      }
      if (stateRef.current === "ready") {
        beaverRef.current.x = w * 0.28;
        beaverRef.current.y = h * 0.45;
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "Enter") {
        e.preventDefault();
        flap();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flap]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const spawnPipe = (x: number) => {
      const { h } = sizeRef.current;
      const minGapY = GROUND_H + PIPE_GAP / 2 + 40;
      const maxGapY = h - GROUND_H - PIPE_GAP / 2 - 40;
      const gapY = minGapY + Math.random() * Math.max(1, maxGapY - minGapY);
      pipesRef.current.push({ x, gapY, gapH: PIPE_GAP, passed: false });
    };

    const drawCloud = (x: number, y: number, s: number) => {
      ctx.save();
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.beginPath();
      ctx.arc(x, y, 18 * s, 0, Math.PI * 2);
      ctx.arc(x + 22 * s, y + 4 * s, 22 * s, 0, Math.PI * 2);
      ctx.arc(x + 46 * s, y, 16 * s, 0, Math.PI * 2);
      ctx.arc(x + 22 * s, y - 10 * s, 16 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const drawSky = () => {
      const { w, h } = sizeRef.current;
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#6fc0ff");
      g.addColorStop(0.55, "#b8e6ff");
      g.addColorStop(1, "#e9f7ff");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      for (const c of cloudsRef.current) drawCloud(c.x, c.y, c.s);
    };

    const drawPipe = (p: Pipe) => {
      const { h } = sizeRef.current;
      const topH = p.gapY - p.gapH / 2;
      const botY = p.gapY + p.gapH / 2;
      const botH = h - botY - GROUND_H;

      const grad = ctx.createLinearGradient(p.x, 0, p.x + PIPE_W, 0);
      grad.addColorStop(0, "#5e3514");
      grad.addColorStop(0.5, "#8b5a2b");
      grad.addColorStop(1, "#4a2a10");
      ctx.fillStyle = grad;
      ctx.fillRect(p.x, 0, PIPE_W, topH);
      ctx.fillRect(p.x, botY, PIPE_W, botH);

      ctx.fillStyle = "#3a2110";
      ctx.fillRect(p.x - 5, topH - 14, PIPE_W + 10, 14);
      ctx.fillRect(p.x - 5, botY, PIPE_W + 10, 14);

      ctx.strokeStyle = "rgba(60,30,10,0.55)";
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse(p.x + PIPE_W / 2, topH - 7, 7 + i * 4, 5 + i * 2, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(p.x + PIPE_W / 2, botY + 7, 7 + i * 4, 5 + i * 2, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.strokeStyle = "rgba(40,20,5,0.22)";
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        const lx = p.x + (PIPE_W / 4) * i;
        ctx.beginPath();
        ctx.moveTo(lx, 0);
        ctx.lineTo(lx, topH - 14);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(lx, botY + 14);
        ctx.lineTo(lx, h - GROUND_H);
        ctx.stroke();
      }
    };

    const drawGround = () => {
      const { w, h } = sizeRef.current;
      const gy = h - GROUND_H;
      const g = ctx.createLinearGradient(0, gy, 0, h);
      g.addColorStop(0, "#7a4a1e");
      g.addColorStop(1, "#43260f");
      ctx.fillStyle = g;
      ctx.fillRect(0, gy, w, GROUND_H);
      ctx.fillStyle = "#5a8f3a";
      ctx.fillRect(0, gy, w, 9);
      ctx.fillStyle = "#74ab48";
      ctx.fillRect(0, gy, w, 3);
      ctx.fillStyle = "rgba(30,15,5,0.28)";
      const off = groundOffRef.current % 30;
      for (let i = -1; i < w / 30 + 1; i++) {
        const sx = i * 30 - off;
        ctx.fillRect(sx, gy + 16, 14, 4);
        ctx.fillRect(sx + 8, gy + 30, 14, 4);
        ctx.fillRect(sx + 4, gy + 44, 14, 4);
      }
    };

    const drawBeaver = (x: number, y: number, rot: number, flapT: number) => {
      const r = BEAVER_R;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);

      ctx.fillStyle = "#7a4416";
      ctx.beginPath();
      ctx.ellipse(-r - 7, 3, 7, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#5a3210";
      ctx.beginPath();
      ctx.ellipse(-r - 7, 3, 4, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#a0541c";
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e8c9a0";
      ctx.beginPath();
      ctx.arc(3, 4, r * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f0d6b0";
      ctx.beginPath();
      ctx.arc(5, -2, r * 0.58, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#6e3d12";
      ctx.beginPath();
      ctx.arc(-r * 0.5, -r * 0.75, 4, 0, Math.PI * 2);
      ctx.arc(r * 0.25, -r * 0.82, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1a1a1a";
      ctx.beginPath();
      ctx.arc(r * 0.2, -r * 0.25, 2.5, 0, Math.PI * 2);
      ctx.arc(r * 0.62, -r * 0.2, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(r * 0.24, -r * 0.3, 0.9, 0, Math.PI * 2);
      ctx.arc(r * 0.66, -r * 0.25, 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#3a2412";
      ctx.beginPath();
      ctx.arc(r * 0.88, 0.5, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(r * 0.5, r * 0.2, 7, 6);
      ctx.fillStyle = "#ffb24d";
      ctx.fillRect(r * 0.54, r * 0.24, 6, 3.5);
      ctx.strokeStyle = "#cfcfcf";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(r * 0.5 + 3.5, r * 0.2);
      ctx.lineTo(r * 0.5 + 3.5, r * 0.2 + 6);
      ctx.stroke();

      const wingAngle = flapT * 1.1 - 0.45;
      ctx.fillStyle = "#6e3d12";
      ctx.save();
      ctx.translate(-1, 3);
      ctx.rotate(wingAngle);
      ctx.beginPath();
      ctx.ellipse(0, 9, 5, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.restore();
    };

    const drawScore = () => {
      const { w } = sizeRef.current;
      ctx.save();
      ctx.font = "bold 46px system-ui, -apple-system, Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.lineWidth = 5;
      ctx.strokeStyle = "rgba(40,20,5,0.7)";
      ctx.fillStyle = "#ffffff";
      const t = String(scoreRef.current);
      ctx.strokeText(t, w / 2, 22);
      ctx.fillText(t, w / 2, 22);
      ctx.restore();
    };

    const circleHitsRect = (
      bx: number,
      by: number,
      rect: { x: number; y: number; w: number; h: number }
    ) => {
      const cx = Math.max(rect.x, Math.min(bx, rect.x + rect.w));
      const cy = Math.max(rect.y, Math.min(by, rect.y + rect.h));
      const dx = bx - cx;
      const dy = by - cy;
      const rr = BEAVER_R * 0.82;
      return dx * dx + dy * dy < rr * rr;
    };

    const update = () => {
      const { w, h } = sizeRef.current;
      const b = beaverRef.current;

      if (stateRef.current === "playing") {
        b.v += GRAVITY;
        b.y += b.v;
        const targetRot = Math.max(-0.5, Math.min(1.2, b.v * 0.085));
        b.rot += (targetRot - b.rot) * 0.18;

        const pipes = pipesRef.current;
        if (pipes.length === 0 || pipes[pipes.length - 1].x < w - PIPE_SPACING) {
          const baseX = pipes.length === 0 ? w + 60 : pipes[pipes.length - 1].x + PIPE_SPACING;
          spawnPipe(baseX);
        }
        for (const p of pipes) p.x -= PIPE_SPEED;
        while (pipes.length && pipes[0].x + PIPE_W < -10) pipes.shift();

        for (const p of pipes) {
          if (!p.passed && p.x + PIPE_W < b.x) {
            p.passed = true;
            scoreRef.current += 1;
            setScore(scoreRef.current);
          }
          const topRect = { x: p.x, y: 0, w: PIPE_W, h: p.gapY - p.gapH / 2 };
          const botRect = {
            x: p.x,
            y: p.gapY + p.gapH / 2,
            w: PIPE_W,
            h: h - GROUND_H - (p.gapY + p.gapH / 2),
          };
          if (circleHitsRect(b.x, b.y, topRect) || circleHitsRect(b.x, b.y, botRect)) {
            if (scoreRef.current > bestRef.current) {
              bestRef.current = scoreRef.current;
              setBest(bestRef.current);
            }
            setGameState("gameover");
            break;
          }
        }

        if (b.y < BEAVER_R) {
          b.y = BEAVER_R;
          b.v = 0;
        }
        const groundY = h - GROUND_H - BEAVER_R;
        if (b.y >= groundY) {
          b.y = groundY;
          if (scoreRef.current > bestRef.current) {
            bestRef.current = scoreRef.current;
            setBest(bestRef.current);
          }
          setGameState("gameover");
        }

        groundOffRef.current += PIPE_SPEED;
      } else if (stateRef.current === "ready") {
        b.y = h * 0.45 + Math.sin(Date.now() / 300) * 8;
        b.rot = Math.sin(Date.now() / 300) * 0.12;
      } else if (stateRef.current === "gameover") {
        b.v += GRAVITY;
        b.y += b.v;
        b.rot = Math.min(1.5, b.rot + 0.06);
        const groundY = h - GROUND_H - BEAVER_R;
        if (b.y >= groundY) {
          b.y = groundY;
          b.v = 0;
        }
      }

      flapAnimRef.current = Math.max(0, flapAnimRef.current - 0.06);

      for (const c of cloudsRef.current) {
        c.x -= 0.3 * c.s;
        if (c.x < -90) {
          c.x = w + 90;
          c.y = 30 + Math.random() * (h * 0.32);
          c.s = 0.6 + Math.random() * 0.6;
        }
      }
    };

    const render = () => {
      const { w, h } = sizeRef.current;
      ctx.clearRect(0, 0, w, h);
      drawSky();
      for (const p of pipesRef.current) drawPipe(p);
      drawGround();
      const b = beaverRef.current;
      drawBeaver(b.x, b.y, b.rot, flapAnimRef.current);
      if (stateRef.current === "playing") drawScore();
    };

    const loop = () => {
      update();
      render();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className="relative w-full h-full overflow-hidden bg-sky-200 select-none cursor-pointer touch-none"
      onPointerDown={(e) => {
        e.preventDefault();
        flap();
      }}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />

      {screen === "ready" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-6">
          <div className="text-3xl font-extrabold text-white drop-shadow-[0_2px_0_rgba(40,20,5,0.75)]">
            Флэппи Бобёр
          </div>
          <div className="mt-3 text-lg font-bold text-white drop-shadow-[0_2px_0_rgba(40,20,5,0.7)]">
            Нажми, чтобы начать
          </div>
          <div className="mt-1.5 text-sm font-medium text-white/90 drop-shadow-[0_1px_0_rgba(40,20,5,0.7)]">
            Пробел / клик / тап — взмах
          </div>
        </div>
      )}

      {screen === "gameover" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 bg-black/35 backdrop-blur-[1px]">
          <div className="text-4xl font-extrabold text-white drop-shadow-[0_2px_0_rgba(40,20,5,0.85)]">
            Бобёр упал!
          </div>
          <div className="mt-3 text-xl font-bold text-white drop-shadow-[0_1px_0_rgba(40,20,5,0.7)]">
            Счёт: {score}
          </div>
          <div className="text-lg font-semibold text-amber-200 drop-shadow-[0_1px_0_rgba(40,20,5,0.7)]">
            Рекорд: {best}
          </div>
          <div className="mt-4 px-4 py-2 rounded-full bg-white/90 text-stone-800 font-bold text-sm shadow">
            Нажми, чтобы попробовать снова
          </div>
        </div>
      )}

      {screen === "playing" && (
        <div className="absolute top-2 right-3 text-xs font-bold text-white/85 drop-shadow-[0_1px_0_rgba(40,20,5,0.6)] pointer-events-none">
          Рекорд: {best}
        </div>
      )}
    </div>
  );
}
