"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, RotateCcw, Heart, Coins, Flag, Skull, Trophy } from "lucide-react";

type GameState = "ready" | "playing" | "dead" | "win" | "gameover";

interface Rect { x: number; y: number; w: number; h: number; }
interface Platform extends Rect { ground: boolean; }
interface Enemy { x: number; y: number; w: number; h: number; vx: number; minX: number; maxX: number; alive: boolean; t: number; }
interface Coin { x: number; y: number; taken: boolean; t: number; }
interface Cloud { x: number; y: number; s: number; }
interface Hill { x: number; w: number; h: number; c: string; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; r: number; }
interface Player {
  x: number; y: number; w: number; h: number; vx: number; vy: number;
  onGround: boolean; facing: number; jumpHeld: boolean; invul: number;
}

const LEVEL_W = 3200;
const LEVEL_H = 540;
const GROUND_Y = 460;
const GROUND_H = 80;
const PLAYER_W = 30;
const PLAYER_H = 36;
const GRAVITY = 0.62;
const MOVE_ACCEL = 0.7;
const MOVE_MAX = 4.2;
const FRICTION = 0.78;
const JUMP_V = -12.4;
const JUMP_CUT = 0.45;
const MAX_FALL = 14;

function buildPlatforms(): Platform[] {
  return [
    { x: 0, y: GROUND_Y, w: 500, h: GROUND_H, ground: true },
    { x: 620, y: GROUND_Y, w: 480, h: GROUND_H, ground: true },
    { x: 1280, y: GROUND_Y, w: 520, h: GROUND_H, ground: true },
    { x: 1980, y: GROUND_Y, w: 620, h: GROUND_H, ground: true },
    { x: 2720, y: GROUND_Y, w: LEVEL_W - 2720, h: GROUND_H, ground: true },
    { x: 200, y: 380, w: 120, h: 16, ground: false },
    { x: 380, y: 300, w: 100, h: 16, ground: false },
    { x: 720, y: 380, w: 120, h: 16, ground: false },
    { x: 1000, y: 320, w: 100, h: 16, ground: false },
    { x: 1380, y: 340, w: 140, h: 16, ground: false },
    { x: 1620, y: 260, w: 100, h: 16, ground: false },
    { x: 2080, y: 360, w: 120, h: 16, ground: false },
    { x: 2280, y: 280, w: 100, h: 16, ground: false },
    { x: 2500, y: 200, w: 100, h: 16, ground: false },
    { x: 2820, y: 340, w: 140, h: 16, ground: false },
  ];
}

function buildPipes(): Rect[] {
  return [
    { x: 880, y: GROUND_Y - 60, w: 50, h: 60 },
    { x: 1480, y: GROUND_Y - 80, w: 50, h: 80 },
    { x: 2150, y: GROUND_Y - 60, w: 50, h: 60 },
  ];
}

function buildEnemies(): Enemy[] {
  return [
    { x: 300, y: GROUND_Y - 32, w: 32, h: 32, vx: -1, minX: 220, maxX: 400, alive: true, t: 0 },
    { x: 800, y: GROUND_Y - 32, w: 32, h: 32, vx: 1, minX: 700, maxX: 850, alive: true, t: 0 },
    { x: 1100, y: GROUND_Y - 32, w: 32, h: 32, vx: -1, minX: 1050, maxX: 1240, alive: true, t: 0 },
    { x: 1450, y: GROUND_Y - 32, w: 32, h: 32, vx: 1, minX: 1380, maxX: 1520, alive: true, t: 0 },
    { x: 2100, y: GROUND_Y - 32, w: 32, h: 32, vx: -1, minX: 1980, maxX: 2200, alive: true, t: 0 },
    { x: 2340, y: GROUND_Y - 32, w: 32, h: 32, vx: 1, minX: 2280, maxX: 2400, alive: true, t: 0 },
    { x: 2800, y: GROUND_Y - 32, w: 32, h: 32, vx: -1, minX: 2720, maxX: 2900, alive: true, t: 0 },
  ];
}

function buildCoins(): Coin[] {
  const positions: Array<[number, number]> = [
    [220, 340], [260, 340], [300, 340],
    [400, 260], [440, 260],
    [740, 340], [780, 340],
    [1020, 280],
    [1400, 300], [1440, 300], [1480, 300],
    [1640, 220], [1680, 220],
    [2100, 320], [2140, 320],
    [2300, 240], [2340, 240],
    [2520, 160], [2560, 160],
    [2840, 300], [2880, 300], [2920, 300],
  ];
  return positions.map(([x, y]) => ({ x, y, taken: false, t: 0 }));
}

export function BoberPlatformer() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const sizeRef = useRef<{ w: number; h: number }>({ w: 640, h: 540 });

  const [screen, setScreen] = useState<GameState>("ready");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [coinCount, setCoinCount] = useState(0);

  const stateRef = useRef<GameState>("ready");
  const playerRef = useRef<Player>({
    x: 40, y: GROUND_Y - PLAYER_H, w: PLAYER_W, h: PLAYER_H,
    vx: 0, vy: 0, onGround: false, facing: 1, jumpHeld: false, invul: 0,
  });
  const platformsRef = useRef<Platform[]>(buildPlatforms());
  const pipesRef = useRef<Rect[]>(buildPipes());
  const enemiesRef = useRef<Enemy[]>(buildEnemies());
  const coinsRef = useRef<Coin[]>(buildCoins());
  const flagRef = useRef<Rect>({ x: 3050, y: GROUND_Y - 110, w: 40, h: 110 });
  const solidsRef = useRef<Rect[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const cloudsRef = useRef<Cloud[]>([]);
  const hillsRef = useRef<Hill[]>([]);
  const keysRef = useRef<Set<string>>(new Set());
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const coinsCollectedRef = useRef(0);
  const deadTimerRef = useRef(0);
  const camXRef = useRef(0);

  const setState = (s: GameState) => {
    stateRef.current = s;
    setScreen(s);
  };

  const spawnParticles = useCallback((x: number, y: number, color: string, n: number) => {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 1 + Math.random() * 3.5;
      particlesRef.current.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.5,
        life: 30 + Math.random() * 20, maxLife: 50, color, r: 2 + Math.random() * 2,
      });
    }
  }, []);

  const resetLevel = useCallback(() => {
    platformsRef.current = buildPlatforms();
    pipesRef.current = buildPipes();
    enemiesRef.current = buildEnemies();
    coinsRef.current = buildCoins();
    flagRef.current = { x: 3050, y: GROUND_Y - 110, w: 40, h: 110 };
    solidsRef.current = [...platformsRef.current, ...pipesRef.current];
    if (cloudsRef.current.length === 0) {
      for (let i = 0; i < 6; i++) {
        cloudsRef.current.push({
          x: Math.random() * LEVEL_W, y: 40 + Math.random() * 140, s: 0.6 + Math.random() * 0.6,
        });
      }
    }
    if (hillsRef.current.length === 0) {
      const colors = ["#7caa55", "#6b9a48", "#88b866"];
      for (let i = 0; i < 18; i++) {
        hillsRef.current.push({
          x: i * 200 + Math.random() * 80,
          w: 180 + Math.random() * 100,
          h: 80 + Math.random() * 70,
          c: colors[i % colors.length],
        });
      }
    }
  }, []);

  const respawnPlayer = useCallback(() => {
    const p = playerRef.current;
    p.x = 40;
    p.y = GROUND_Y - PLAYER_H;
    p.vx = 0;
    p.vy = 0;
    p.onGround = false;
    p.facing = 1;
    p.jumpHeld = false;
    p.invul = 60;
    camXRef.current = 0;
  }, []);

  const startGame = useCallback(() => {
    resetLevel();
    respawnPlayer();
    particlesRef.current = [];
    scoreRef.current = 0;
    livesRef.current = 3;
    coinsCollectedRef.current = 0;
    deadTimerRef.current = 0;
    camXRef.current = 0;
    setScore(0);
    setLives(3);
    setCoinCount(0);
    setState("playing");
  }, [resetLevel, respawnPlayer]);

  const killPlayer = useCallback(() => {
    const p = playerRef.current;
    if (p.invul > 0) return;
    livesRef.current -= 1;
    setLives(livesRef.current);
    spawnParticles(p.x + p.w / 2, p.y + p.h / 2, "#a0541c", 18);
    deadTimerRef.current = 75;
    setState("dead");
  }, [spawnParticles]);

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
    };
    resize();
    resetLevel();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [resetLevel]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent, down: boolean) => {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space", "KeyA", "KeyD", "KeyW", "KeyS"].includes(e.code)) {
        e.preventDefault();
      }
      if (down) keysRef.current.add(e.code);
      else keysRef.current.delete(e.code);
      if (down && (e.code === "Enter" || e.code === "Space")) {
        const s = stateRef.current;
        if (s === "ready" || s === "gameover" || s === "win") startGame();
      }
    };
    const kd = (e: KeyboardEvent) => onKey(e, true);
    const ku = (e: KeyboardEvent) => onKey(e, false);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => {
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }, [startGame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const aabb = (a: Rect, b: Rect) =>
      a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

    const update = () => {
      const { w } = sizeRef.current;
      const p = playerRef.current;

      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const pt = particlesRef.current[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.vy += 0.2;
        pt.life -= 1;
        if (pt.life <= 0) particlesRef.current.splice(i, 1);
      }

      if (stateRef.current === "dead") {
        deadTimerRef.current -= 1;
        if (deadTimerRef.current <= 0) {
          if (livesRef.current <= 0) setState("gameover");
          else { respawnPlayer(); setState("playing"); }
        }
        return;
      }

      if (stateRef.current !== "playing") {
        camXRef.current = 0;
        return;
      }

      const keys = keysRef.current;
      let moveX = 0;
      if (keys.has("ArrowRight") || keys.has("KeyD")) moveX += 1;
      if (keys.has("ArrowLeft") || keys.has("KeyA")) moveX -= 1;
      if (moveX !== 0) {
        p.vx += moveX * MOVE_ACCEL;
        if (p.vx > MOVE_MAX) p.vx = MOVE_MAX;
        if (p.vx < -MOVE_MAX) p.vx = -MOVE_MAX;
        p.facing = moveX;
      } else {
        p.vx *= FRICTION;
        if (Math.abs(p.vx) < 0.1) p.vx = 0;
      }

      const jumpPressed = keys.has("Space") || keys.has("KeyW") || keys.has("ArrowUp");
      if (jumpPressed && p.onGround) {
        p.vy = JUMP_V;
        p.onGround = false;
        p.jumpHeld = true;
      }
      if (!jumpPressed && p.jumpHeld && p.vy < 0) {
        p.vy *= JUMP_CUT;
        p.jumpHeld = false;
      }

      p.vy += GRAVITY;
      if (p.vy > MAX_FALL) p.vy = MAX_FALL;

      p.x += p.vx;
      for (const s of solidsRef.current) {
        if (aabb(p, s)) {
          if (p.vx > 0) p.x = s.x - p.w;
          else if (p.vx < 0) p.x = s.x + s.w;
          p.vx = 0;
        }
      }

      p.y += p.vy;
      p.onGround = false;
      for (const s of solidsRef.current) {
        if (aabb(p, s)) {
          if (p.vy > 0) { p.y = s.y - p.h; p.vy = 0; p.onGround = true; p.jumpHeld = false; }
          else if (p.vy < 0) { p.y = s.y + s.h; p.vy = 0; }
        }
      }

      if (p.x < 0) p.x = 0;
      if (p.x + p.w > LEVEL_W) p.x = LEVEL_W - p.w;
      if (p.y > LEVEL_H + 80) { killPlayer(); return; }
      if (p.invul > 0) p.invul -= 1;

      for (const e of enemiesRef.current) {
        if (!e.alive) continue;
        e.t += 1;
        e.x += e.vx;
        if (e.x < e.minX) { e.x = e.minX; e.vx = Math.abs(e.vx); }
        if (e.x + e.w > e.maxX) { e.x = e.maxX - e.w; e.vx = -Math.abs(e.vx); }
        if (p.invul <= 0 && aabb(p, e)) {
          const prevBottom = p.y + p.h - p.vy;
          const stomp = p.vy > 0 && prevBottom <= e.y + 10;
          if (stomp) {
            e.alive = false;
            p.vy = JUMP_V * 0.62;
            scoreRef.current += 100;
            setScore(scoreRef.current);
            spawnParticles(e.x + e.w / 2, e.y + e.h / 2, "#c77f3a", 12);
          } else {
            killPlayer();
            return;
          }
        }
      }

      for (const c of coinsRef.current) {
        if (c.taken) continue;
        c.t += 1;
        const cr = 12;
        if (p.x < c.x + cr && p.x + p.w > c.x - cr &&
            p.y < c.y + cr && p.y + p.h > c.y - cr) {
          c.taken = true;
          coinsCollectedRef.current += 1;
          setCoinCount(coinsCollectedRef.current);
          scoreRef.current += 50;
          setScore(scoreRef.current);
          spawnParticles(c.x, c.y, "#ffd36b", 8);
        }
      }

      if (aabb(p, flagRef.current)) {
        scoreRef.current += 1000 + livesRef.current * 200 + coinsCollectedRef.current * 10;
        setScore(scoreRef.current);
        setState("win");
      }

      const maxCamX = Math.max(0, LEVEL_W - w);
      const targetCamX = p.x + p.w / 2 - w / 2;
      camXRef.current = Math.max(0, Math.min(maxCamX, targetCamX));
    };

    const drawCloud = (x: number, y: number, s: number) => {
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath();
      ctx.arc(x, y, 16 * s, 0, Math.PI * 2);
      ctx.arc(x + 22 * s, y + 4 * s, 20 * s, 0, Math.PI * 2);
      ctx.arc(x + 44 * s, y, 14 * s, 0, Math.PI * 2);
      ctx.arc(x + 22 * s, y - 10 * s, 14 * s, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawBeaver = (p: Player) => {
      const cx = p.x + p.w / 2;
      const cy = p.y + p.h / 2;
      ctx.save();
      ctx.translate(cx, cy);
      if (p.facing < 0) ctx.scale(-1, 1);
      ctx.fillStyle = "#6e3d12";
      ctx.beginPath();
      ctx.ellipse(-12, 6, 5, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#3a2412";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-12, 2); ctx.lineTo(-12, 10);
      ctx.moveTo(-15, 4); ctx.lineTo(-15, 8);
      ctx.moveTo(-9, 4); ctx.lineTo(-9, 8);
      ctx.stroke();
      ctx.fillStyle = "#a0541c";
      ctx.beginPath();
      ctx.ellipse(0, 4, 12, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e8c9a0";
      ctx.beginPath();
      ctx.ellipse(2, 8, 7, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#a0541c";
      ctx.beginPath();
      ctx.arc(2, -10, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#6e3d12";
      ctx.beginPath();
      ctx.arc(-3, -18, 3, 0, Math.PI * 2);
      ctx.arc(7, -18, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1a1a1a";
      ctx.beginPath();
      ctx.arc(6, -11, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(4, -5, 4, 5);
      ctx.fillStyle = "#ffb24d";
      ctx.fillRect(4.5, -4, 3, 2);
      const run = p.onGround && Math.abs(p.vx) > 0.5 ? Math.sin(Date.now() / 70) * 3 : 0;
      ctx.fillStyle = "#6e3d12";
      ctx.fillRect(-5, 15, 5, 7 + run);
      ctx.fillRect(3, 15, 5, 7 - run);
      ctx.restore();
    };

    const drawBadger = (e: Enemy) => {
      const cx = e.x + e.w / 2;
      const cy = e.y + e.h / 2;
      ctx.save();
      ctx.translate(cx, cy);
      if (e.vx > 0) ctx.scale(-1, 1);
      ctx.fillStyle = "#7a7060";
      ctx.beginPath();
      ctx.ellipse(0, 2, 14, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e8e0d0";
      ctx.fillRect(-14, -2, 28, 6);
      ctx.fillStyle = "#5a5040";
      ctx.beginPath();
      ctx.arc(10, 0, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e8e0d0";
      ctx.beginPath();
      ctx.ellipse(13, 0, 4, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1a1a1a";
      ctx.beginPath();
      ctx.arc(13, -2, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#3a3020";
      const wobble = Math.sin(e.t * 0.22) * 2;
      ctx.fillRect(-8, 12, 4, 4 + wobble);
      ctx.fillRect(4, 12, 4, 4 - wobble);
      ctx.restore();
    };

    const drawCoin = (c: Coin) => {
      const wob = Math.sin(c.t * 0.1) * 2;
      const sw = Math.abs(Math.cos(c.t * 0.08));
      ctx.save();
      ctx.translate(c.x, c.y + wob);
      ctx.fillStyle = "#b8860b";
      ctx.beginPath();
      ctx.ellipse(0, 0, 9 * sw + 1, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffd36b";
      ctx.beginPath();
      ctx.ellipse(0, 0, 7 * sw + 0.5, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff2c0";
      ctx.beginPath();
      ctx.ellipse(-2, -2, 2 * sw, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const drawPipe = (r: Rect) => {
      const grad = ctx.createLinearGradient(r.x, 0, r.x + r.w, 0);
      grad.addColorStop(0, "#3a8a2a");
      grad.addColorStop(0.3, "#6bc23e");
      grad.addColorStop(0.6, "#4ba82e");
      grad.addColorStop(1, "#2a6a1a");
      ctx.fillStyle = grad;
      ctx.fillRect(r.x, r.y + 12, r.w, r.h - 12);
      ctx.fillRect(r.x - 4, r.y, r.w + 8, 14);
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      ctx.fillRect(r.x + 4, r.y + 14, 4, r.h - 18);
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.lineWidth = 1;
      ctx.strokeRect(r.x, r.y + 12, r.w, r.h - 12);
      ctx.strokeRect(r.x - 4, r.y, r.w + 8, 14);
    };

    const drawPlatform = (pl: Platform) => {
      if (pl.ground) {
        const grad = ctx.createLinearGradient(0, pl.y, 0, pl.y + pl.h);
        grad.addColorStop(0, "#7a4a1e");
        grad.addColorStop(1, "#43260f");
        ctx.fillStyle = grad;
        ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
        ctx.fillStyle = "#5a8f3a";
        ctx.fillRect(pl.x, pl.y, pl.w, 10);
        ctx.fillStyle = "#74ab48";
        ctx.fillRect(pl.x, pl.y, pl.w, 3);
        ctx.fillStyle = "rgba(30,15,5,0.22)";
        for (let i = 0; i < pl.w; i += 24) {
          ctx.fillRect(pl.x + i + 4, pl.y + 20, 10, 4);
          ctx.fillRect(pl.x + i + 12, pl.y + 36, 10, 4);
        }
      } else {
        const grad = ctx.createLinearGradient(0, pl.y, 0, pl.y + pl.h);
        grad.addColorStop(0, "#9a6a32");
        grad.addColorStop(1, "#6a4a22");
        ctx.fillStyle = grad;
        ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
        ctx.fillStyle = "#5a8f3a";
        ctx.fillRect(pl.x, pl.y, pl.w, 4);
        ctx.strokeStyle = "rgba(0,0,0,0.25)";
        ctx.lineWidth = 1;
        ctx.strokeRect(pl.x, pl.y, pl.w, pl.h);
      }
    };

    const drawFlag = (f: Rect) => {
      ctx.fillStyle = "#9aa0ad";
      ctx.fillRect(f.x + 4, f.y, 4, f.h);
      ctx.fillStyle = "#c0c6cc";
      ctx.beginPath();
      ctx.arc(f.x + 6, f.y, 6, 0, Math.PI * 2);
      ctx.fill();
      const wave = Math.sin(Date.now() / 200) * 3;
      ctx.fillStyle = "#ff7b3a";
      ctx.beginPath();
      ctx.moveTo(f.x + 8, f.y + 4);
      ctx.lineTo(f.x + 40 + wave, f.y + 14);
      ctx.lineTo(f.x + 8, f.y + 24);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#a0541c";
      ctx.font = "bold 8px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("★", f.x + 20, f.y + 17);
    };

    const render = () => {
      const { w, h } = sizeRef.current;
      const camX = camXRef.current;
      const yOff = h - LEVEL_H;

      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#6fc0ff");
      g.addColorStop(0.55, "#b8e6ff");
      g.addColorStop(1, "#e9f7ff");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.translate(0, yOff);
      for (const c of cloudsRef.current) {
        const x = c.x - camX * 0.3;
        const wrapped = ((x % (LEVEL_W + 400)) + (LEVEL_W + 400)) % (LEVEL_W + 400) - 200;
        if (wrapped > -120 && wrapped < w + 120) drawCloud(wrapped, c.y, c.s);
      }
      for (const hill of hillsRef.current) {
        const x = hill.x - camX * 0.55;
        if (x + hill.w < -20 || x > w + 20) continue;
        ctx.fillStyle = hill.c;
        ctx.beginPath();
        ctx.moveTo(x, GROUND_Y);
        ctx.quadraticCurveTo(x + hill.w / 2, GROUND_Y - hill.h, x + hill.w, GROUND_Y);
        ctx.fill();
      }
      ctx.restore();

      ctx.save();
      ctx.translate(-camX, yOff);

      for (const pl of platformsRef.current) {
        if (pl.x + pl.w < camX - 30 || pl.x > camX + w + 30) continue;
        drawPlatform(pl);
      }
      for (const pi of pipesRef.current) {
        if (pi.x + pi.w < camX - 30 || pi.x > camX + w + 30) continue;
        drawPipe(pi);
      }
      drawFlag(flagRef.current);

      for (const c of coinsRef.current) {
        if (c.taken) continue;
        if (c.x < camX - 30 || c.x > camX + w + 30) continue;
        drawCoin(c);
      }

      for (const e of enemiesRef.current) {
        if (!e.alive) continue;
        if (e.x + e.w < camX - 30 || e.x > camX + w + 30) continue;
        drawBadger(e);
      }

      const p = playerRef.current;
      if (stateRef.current === "playing" || stateRef.current === "dead") {
        const show = p.invul === 0 || Math.floor(p.invul / 4) % 2 === 0;
        if (stateRef.current === "playing" && show) drawBeaver(p);
        if (stateRef.current === "dead" && deadTimerRef.current > 50) drawBeaver(p);
      }

      for (const pt of particlesRef.current) {
        const a = pt.life / pt.maxLife;
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = Math.max(0, a);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
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
  }, [killPlayer, respawnPlayer, spawnParticles]);

  return (
    <div
      ref={wrapRef}
      className="relative w-full h-full overflow-hidden bg-sky-300 select-none touch-none"
    >
      <canvas ref={canvasRef} className="block w-full h-full" />

      {screen === "playing" && (
        <div className="absolute top-2 left-3 right-3 flex items-start justify-between pointer-events-none">
          <div className="flex flex-col gap-1">
            <div className="px-2.5 py-1 rounded-md bg-black/40 text-amber-200 text-sm font-bold">
              Очки: {score}
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-black/40 text-yellow-200 text-xs font-bold">
              <Coins className="w-3.5 h-3.5 fill-yellow-300 text-yellow-300" />
              {coinCount}
            </div>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-black/40 text-rose-300 text-sm font-bold">
            {Array.from({ length: Math.max(0, lives) }).map((_, i) => (
              <Heart key={i} className="w-3.5 h-3.5 fill-rose-400 text-rose-400" />
            ))}
          </div>
        </div>
      )}

      {screen === "ready" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 bg-black/45 backdrop-blur-[1px]">
          <div className="flex items-center gap-2 text-amber-300">
            <Flag className="w-7 h-7" />
            <span className="text-3xl font-extrabold tracking-tight">Приключения Бобра</span>
          </div>
          <p className="mt-3 text-sm text-slate-100 max-w-xs">
            Беги вправо, прыгай по платформам, топчи барсуков и доберись до флага!
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-[11px] text-slate-200 max-w-sm">
            <div className="px-2 py-1.5 rounded bg-white/15">
              <div className="font-bold text-amber-200">A / D</div>
              <div>бег</div>
            </div>
            <div className="px-2 py-1.5 rounded bg-white/15">
              <div className="font-bold text-amber-200">W / Пробел</div>
              <div>прыжок</div>
            </div>
            <div className="px-2 py-1.5 rounded bg-white/15">
              <div className="font-bold text-amber-200">Сверху</div>
              <div>топтать</div>
            </div>
          </div>
          <button
            onClick={startGame}
            className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-400 text-stone-900 font-bold hover:bg-amber-300 transition"
          >
            <Play className="w-4 h-4 fill-stone-900" />
            Старт
          </button>
          <div className="mt-2 text-[11px] text-slate-300">Пробел / Enter — начать</div>
        </div>
      )}

      {screen === "dead" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 bg-black/40 pointer-events-none">
          <Skull className="w-9 h-9 text-rose-400" />
          <div className="mt-1 text-2xl font-extrabold text-rose-200 drop-shadow-[0_2px_0_rgba(40,20,5,0.7)]">
            Бобёр погиб!
          </div>
          <div className="text-sm text-amber-200 font-semibold">
            Жизней осталось: {Math.max(0, lives)}
          </div>
        </div>
      )}

      {screen === "gameover" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 bg-black/65 backdrop-blur-[1px]">
          <Skull className="w-10 h-10 text-rose-400" />
          <div className="mt-2 text-3xl font-extrabold text-rose-300">Игра окончена</div>
          <div className="mt-3 text-lg text-amber-200 font-bold">Очки: {score}</div>
          <div className="text-sm text-yellow-200 font-semibold">Монет: {coinCount}</div>
          <button
            onClick={startGame}
            className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-400 text-stone-900 font-bold hover:bg-amber-300 transition"
          >
            <RotateCcw className="w-4 h-4" />
            Заново
          </button>
        </div>
      )}

      {screen === "win" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 bg-emerald-900/70 backdrop-blur-[1px]">
          <Trophy className="w-12 h-12 text-amber-300" />
          <div className="mt-2 text-3xl font-extrabold text-amber-200">Победа!</div>
          <div className="mt-1 text-sm text-emerald-100">Бобёр добрался до флага!</div>
          <div className="mt-3 text-lg text-amber-200 font-bold">Очки: {score}</div>
          <div className="text-sm text-yellow-200 font-semibold">Монет: {coinCount}</div>
          <button
            onClick={startGame}
            className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-400 text-stone-900 font-bold hover:bg-amber-300 transition"
          >
            <RotateCcw className="w-4 h-4" />
            Играть снова
          </button>
        </div>
      )}
    </div>
  );
}
