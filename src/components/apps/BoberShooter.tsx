"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, RotateCcw, Heart, Zap, Shield, Skull, Rocket } from "lucide-react";

type GameState = "ready" | "playing" | "gameover";
type EnemyType = "grunt" | "shooter" | "zigzag" | "boss";
type PowerType = "spread" | "shield" | "rapid";

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  friendly: boolean;
  color: string;
}

interface Enemy {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  type: EnemyType;
  cooldown: number;
  t: number;
  score: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  r: number;
}

interface PowerUp {
  x: number;
  y: number;
  vy: number;
  type: PowerType;
  t: number;
}

interface Star {
  x: number;
  y: number;
  z: number;
}

interface Player {
  x: number;
  y: number;
  w: number;
  h: number;
  fireCd: number;
  spread: number;
  rapid: number;
  shield: number;
  invul: number;
}

const PLAYER_W = 36;
const PLAYER_H = 42;
const PLAYER_SPEED = 5.0;
const BASE_FIRE_CD = 13;
const RAPID_FIRE_CD = 6;
const BULLET_SPEED = 9;
const E_BULLET_SPEED = 3.4;
const POWER_DURATION = 360;

export function BoberShooter() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const sizeRef = useRef<{ w: number; h: number }>({ w: 480, h: 640 });

  const [screen, setScreen] = useState<GameState>("ready");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [wave, setWave] = useState(0);
  const [hud, setHud] = useState({ spread: 0, rapid: 0, shield: 0 });

  const stateRef = useRef<GameState>("ready");
  const playerRef = useRef<Player>({
    x: 220, y: 580, w: PLAYER_W, h: PLAYER_H,
    fireCd: 0, spread: 0, rapid: 0, shield: 0, invul: 0,
  });
  const bulletsRef = useRef<Bullet[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const powerupsRef = useRef<PowerUp[]>([]);
  const starsRef = useRef<Star[]>([]);
  const keysRef = useRef<Set<string>>(new Set());
  const waveRef = useRef(0);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const spawnRef = useRef<{ pending: Enemy[]; timer: number }>({ pending: [], timer: 0 });
  const flashRef = useRef(0);
  const shakeRef = useRef(0);
  const hudCdRef = useRef(0);
  const waveAnnounceRef = useRef(0);

  const setState = (s: GameState) => {
    stateRef.current = s;
    setScreen(s);
  };

  const initStars = useCallback(() => {
    const { w, h } = sizeRef.current;
    const stars: Star[] = [];
    for (let i = 0; i < 110; i++) {
      stars.push({ x: Math.random() * w, y: Math.random() * h, z: 0.3 + Math.random() * 1.7 });
    }
    starsRef.current = stars;
  }, []);

  const spawnExplosion = useCallback((x: number, y: number, color: string, n: number) => {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 1 + Math.random() * 4;
      particlesRef.current.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 30 + Math.random() * 20, maxLife: 50, color, r: 2 + Math.random() * 2,
      });
    }
  }, []);

  const startWave = useCallback((n: number) => {
    const { w } = sizeRef.current;
    waveRef.current = n;
    setWave(n);
    waveAnnounceRef.current = 95;
    spawnRef.current = { pending: [], timer: 0 };
    if (n % 5 === 0) {
      const bossHp = 60 + Math.floor(n / 5) * 30;
      spawnRef.current.pending.push({
        x: w / 2 - 60, y: -120, w: 120, h: 80, vx: 1.8, vy: 0.45,
        hp: bossHp, maxHp: bossHp, type: "boss", cooldown: 90, t: 0, score: 1000,
      });
      return;
    }
    const count = Math.min(6 + n, 14);
    const types: EnemyType[] = ["grunt", "shooter", "zigzag"];
    for (let i = 0; i < count; i++) {
      const type = types[i % 3];
      const ew = 34;
      const eh = 30;
      const col = i % 5;
      const row = Math.floor(i / 5);
      const ex = 30 + col * (ew + 22) + Math.random() * 8;
      const ey = -eh - row * 48;
      let hp = 2;
      let vy = 0.6 + n * 0.04;
      if (type === "shooter") { hp = 3; vy = 0.5 + n * 0.03; }
      if (type === "zigzag") { vy = 0.75 + n * 0.04; }
      spawnRef.current.pending.push({
        x: ex, y: ey, w: ew, h: eh, vx: type === "zigzag" ? 1.4 : 0, vy,
        hp, maxHp: hp, type, cooldown: 80 + Math.random() * 80, t: 0,
        score: type === "shooter" ? 60 : type === "zigzag" ? 50 : 40,
      });
    }
  }, []);

  const startGame = useCallback(() => {
    const { w, h } = sizeRef.current;
    playerRef.current = {
      x: w / 2 - PLAYER_W / 2, y: h - PLAYER_H - 26, w: PLAYER_W, h: PLAYER_H,
      fireCd: 0, spread: 0, rapid: 0, shield: 120, invul: 0,
    };
    bulletsRef.current = [];
    enemiesRef.current = [];
    particlesRef.current = [];
    powerupsRef.current = [];
    spawnRef.current = { pending: [], timer: 0 };
    waveRef.current = 0;
    scoreRef.current = 0;
    livesRef.current = 3;
    flashRef.current = 0;
    shakeRef.current = 0;
    hudCdRef.current = 0;
    waveAnnounceRef.current = 0;
    setScore(0);
    setLives(3);
    setWave(0);
    setHud({ spread: 0, rapid: 0, shield: 0 });
    setState("playing");
    startWave(1);
  }, [startWave]);

  const hitPlayer = useCallback(() => {
    const p = playerRef.current;
    if (p.shield > 0 || p.invul > 0) return;
    livesRef.current -= 1;
    setLives(livesRef.current);
    flashRef.current = 18;
    shakeRef.current = 14;
    spawnExplosion(p.x + p.w / 2, p.y + p.h / 2, "#ff7b3a", 24);
    p.spread = 0;
    p.rapid = 0;
    p.invul = 90;
    if (livesRef.current <= 0) setState("gameover");
  }, [spawnExplosion]);

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
      if (starsRef.current.length === 0) initStars();
      if (stateRef.current !== "playing") {
        playerRef.current.x = w / 2 - PLAYER_W / 2;
        playerRef.current.y = h - PLAYER_H - 26;
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [initStars]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent, down: boolean) => {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space", "KeyA", "KeyD", "KeyW", "KeyS"].includes(e.code)) {
        e.preventDefault();
      }
      if (down) keysRef.current.add(e.code);
      else keysRef.current.delete(e.code);
      if (down && (e.code === "Enter" || e.code === "Space")) {
        const s = stateRef.current;
        if (s === "ready" || s === "gameover") startGame();
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

    const fire = () => {
      const p = playerRef.current;
      const cx = p.x + p.w / 2;
      const cy = p.y - 4;
      const n = 1 + p.spread * 2;
      const spread = p.spread;
      for (let i = 0; i < n; i++) {
        const off = spread === 0 ? 0 : i - (n - 1) / 2;
        const ang = -Math.PI / 2 + off * 0.18;
        bulletsRef.current.push({
          x: cx, y: cy, vx: Math.cos(ang) * BULLET_SPEED, vy: Math.sin(ang) * BULLET_SPEED,
          r: 4, friendly: true, color: "#ffe66d",
        });
      }
      p.fireCd = p.rapid > 0 ? RAPID_FIRE_CD : BASE_FIRE_CD;
    };

    const enemyFire = (e: Enemy) => {
      const cx = e.x + e.w / 2;
      const cy = e.y + e.h;
      if (e.type === "boss") {
        const count = 5;
        for (let i = 0; i < count; i++) {
          const ang = Math.PI / 2 + (i - (count - 1) / 2) * 0.28;
          bulletsRef.current.push({
            x: cx, y: cy, vx: Math.cos(ang) * E_BULLET_SPEED, vy: Math.sin(ang) * E_BULLET_SPEED,
            r: 5, friendly: false, color: "#ff5277",
          });
        }
      } else {
        bulletsRef.current.push({
          x: cx, y: cy, vx: 0, vy: E_BULLET_SPEED, r: 4, friendly: false, color: "#ff5277",
        });
      }
    };

    const maybeDropPower = (x: number, y: number) => {
      if (Math.random() < 0.2) {
        const r = Math.random();
        const type: PowerType = r < 0.4 ? "spread" : r < 0.72 ? "rapid" : "shield";
        powerupsRef.current.push({ x, y, vy: 1.7, type, t: 0 });
      }
    };

    const aabb = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
      a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

    const update = () => {
      const { w, h } = sizeRef.current;
      const p = playerRef.current;

      for (const s of starsRef.current) {
        s.y += s.z * 1.2;
        if (s.y > h) { s.y = 0; s.x = Math.random() * w; }
      }

      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const pt = particlesRef.current[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.vx *= 0.96;
        pt.vy *= 0.96;
        pt.life -= 1;
        if (pt.life <= 0) particlesRef.current.splice(i, 1);
      }

      if (waveAnnounceRef.current > 0) waveAnnounceRef.current -= 1;
      if (flashRef.current > 0) flashRef.current -= 1;
      if (shakeRef.current > 0) shakeRef.current -= 1;

      if (stateRef.current !== "playing") return;

      const keys = keysRef.current;
      if (keys.has("ArrowLeft") || keys.has("KeyA")) p.x -= PLAYER_SPEED;
      if (keys.has("ArrowRight") || keys.has("KeyD")) p.x += PLAYER_SPEED;
      p.x = Math.max(8, Math.min(w - p.w - 8, p.x));

      if (p.fireCd > 0) p.fireCd -= 1;
      if (p.fireCd <= 0) fire();
      if (p.spread > 0) p.spread -= 1;
      if (p.rapid > 0) p.rapid -= 1;
      if (p.shield > 0) p.shield -= 1;
      if (p.invul > 0) p.invul -= 1;

      hudCdRef.current += 1;
      if (hudCdRef.current >= 12) {
        hudCdRef.current = 0;
        setHud({
          spread: Math.max(0, p.spread),
          rapid: Math.max(0, p.rapid),
          shield: Math.max(0, p.shield),
        });
      }

      const spawn = spawnRef.current;
      if (spawn.pending.length > 0) {
        spawn.timer -= 1;
        if (spawn.timer <= 0) {
          const e = spawn.pending.shift();
          if (e) { enemiesRef.current.push(e); spawn.timer = 25; }
        }
      }

      const enemies = enemiesRef.current;
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        e.t += 1;
        if (e.type === "zigzag") {
          e.x += Math.sin(e.t * 0.06) * 1.6;
          e.y += e.vy;
        } else if (e.type === "boss") {
          e.x += e.vx;
          if (e.x < 10 || e.x + e.w > w - 10) e.vx *= -1;
          if (e.y < 40) e.y += e.vy;
        } else {
          e.x += e.vx;
          if (e.x < 10 || e.x + e.w > w - 10) e.vx *= -1;
          e.y += e.vy;
        }
        e.cooldown -= 1;
        if (e.cooldown <= 0 && e.type !== "grunt") {
          enemyFire(e);
          e.cooldown = e.type === "boss" ? 55 : 90 + Math.random() * 60;
        }
        if (e.y > h + 60) enemies.splice(i, 1);
      }

      for (let i = bulletsRef.current.length - 1; i >= 0; i--) {
        const b = bulletsRef.current[i];
        b.x += b.vx;
        b.y += b.vy;
        if (b.y < -20 || b.y > h + 20 || b.x < -20 || b.x > w + 20) {
          bulletsRef.current.splice(i, 1);
          continue;
        }
        if (b.friendly) {
          for (let j = enemies.length - 1; j >= 0; j--) {
            const e = enemies[j];
            if (b.x > e.x && b.x < e.x + e.w && b.y > e.y && b.y < e.y + e.h) {
              e.hp -= 1;
              spawnExplosion(b.x, b.y, "#ffd36b", 5);
              bulletsRef.current.splice(i, 1);
              if (e.hp <= 0) {
                scoreRef.current += e.score;
                setScore(scoreRef.current);
                const isBoss = e.type === "boss";
                spawnExplosion(
                  e.x + e.w / 2, e.y + e.h / 2,
                  isBoss ? "#ff7b3a" : "#c77f3a",
                  isBoss ? 50 : 14
                );
                if (isBoss) {
                  shakeRef.current = 22;
                  maybeDropPower(e.x + e.w / 2, e.y + e.h / 2);
                  maybeDropPower(e.x + e.w / 2, e.y + e.h / 2);
                } else {
                  maybeDropPower(e.x + e.w / 2, e.y + e.h / 2);
                }
                enemies.splice(j, 1);
              }
              break;
            }
          }
        } else {
          if (p.shield <= 0 && p.invul <= 0 &&
              b.x > p.x && b.x < p.x + p.w && b.y > p.y && b.y < p.y + p.h) {
            bulletsRef.current.splice(i, 1);
            hitPlayer();
          } else if (p.shield > 0 &&
              b.x > p.x - 8 && b.x < p.x + p.w + 8 &&
              b.y > p.y - 8 && b.y < p.y + p.h + 8) {
            bulletsRef.current.splice(i, 1);
            spawnExplosion(b.x, b.y, "#7be0ff", 6);
          }
        }
      }

      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if (aabb(e, p)) {
          if (e.type !== "boss") {
            spawnExplosion(e.x + e.w / 2, e.y + e.h / 2, "#c77f3a", 14);
            enemies.splice(i, 1);
          }
          hitPlayer();
        }
      }

      for (let i = powerupsRef.current.length - 1; i >= 0; i--) {
        const pu = powerupsRef.current[i];
        pu.y += pu.vy;
        pu.t += 1;
        if (pu.y > h + 20) { powerupsRef.current.splice(i, 1); continue; }
        if (pu.x > p.x - 8 && pu.x < p.x + p.w + 8 &&
            pu.y > p.y - 8 && pu.y < p.y + p.h + 8) {
          if (pu.type === "spread") p.spread = POWER_DURATION;
          if (pu.type === "rapid") p.rapid = POWER_DURATION;
          if (pu.type === "shield") p.shield = POWER_DURATION;
          const c = pu.type === "spread" ? "#ffd36b" : pu.type === "rapid" ? "#ff7b3a" : "#7be0ff";
          spawnExplosion(pu.x, pu.y, c, 14);
          powerupsRef.current.splice(i, 1);
        }
      }

      if (enemies.length === 0 && spawn.pending.length === 0) {
        startWave(waveRef.current + 1);
      }
    };

    const drawBeaverShip = (p: Player) => {
      const blink = p.invul > 0 && Math.floor(p.invul / 5) % 2 === 0;
      if (blink) return;
      ctx.save();
      ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
      ctx.fillStyle = "#c9ccd6";
      ctx.beginPath();
      ctx.moveTo(-12, 14);
      ctx.lineTo(-7, -4);
      ctx.lineTo(7, -4);
      ctx.lineTo(12, 14);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#9aa0ad";
      ctx.fillRect(-7, -4, 14, 12);
      ctx.fillStyle = "#ff7b3a";
      const fl = 22 + Math.sin(Date.now() / 60) * 4;
      ctx.beginPath();
      ctx.moveTo(-7, 12);
      ctx.lineTo(-3, fl);
      ctx.lineTo(0, 14);
      ctx.closePath();
      ctx.fill();
      const fl2 = 22 + Math.sin(Date.now() / 60 + 1) * 4;
      ctx.beginPath();
      ctx.moveTo(7, 12);
      ctx.lineTo(3, fl2);
      ctx.lineTo(0, 14);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#a0541c";
      ctx.beginPath();
      ctx.arc(0, -10, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e8c9a0";
      ctx.beginPath();
      ctx.arc(2, -7, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1a1a1a";
      ctx.beginPath();
      ctx.arc(-4, -13, 2, 0, Math.PI * 2);
      ctx.arc(4, -13, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-3, -7, 7, 4);
      ctx.fillStyle = "#ffb24d";
      ctx.fillRect(-2.5, -6, 6, 2);
      ctx.restore();
    };

    const drawBadger = (e: Enemy) => {
      const cx = e.x + e.w / 2;
      const cy = e.y + e.h / 2;
      ctx.save();
      ctx.translate(cx, cy);
      const body = e.type === "boss" ? "#5a4a3a"
        : e.type === "shooter" ? "#7a4a3a"
        : e.type === "zigzag" ? "#4a5a4a" : "#6a5a4a";
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(0, 0, e.w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e8e0d0";
      ctx.fillRect(-e.w / 2, -4, e.w, 6);
      ctx.fillStyle = "#1a1a1a";
      ctx.beginPath();
      ctx.arc(-6, -4, 2.5, 0, Math.PI * 2);
      ctx.arc(6, -4, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-4, 3, 8, 3);
      ctx.fillStyle = "#222";
      ctx.fillRect(-3, 4, 6, 1);
      if (e.type === "boss") {
        ctx.fillStyle = "#c9302c";
        ctx.beginPath();
        ctx.arc(0, -e.h / 2 - 6, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#3a2412";
        ctx.fillRect(-e.w / 2 - 4, -2, 4, 8);
        ctx.fillRect(e.w / 2, -2, 4, 8);
      }
      ctx.restore();
    };

    const render = () => {
      const { w, h } = sizeRef.current;
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#0a0a1f");
      g.addColorStop(0.6, "#141436");
      g.addColorStop(1, "#1c1a3a");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      if (shakeRef.current > 0) {
        ctx.translate(
          (Math.random() - 0.5) * shakeRef.current,
          (Math.random() - 0.5) * shakeRef.current
        );
      }

      for (const s of starsRef.current) {
        ctx.fillStyle = `rgba(255,255,255,${0.25 + s.z * 0.4})`;
        ctx.fillRect(s.x, s.y, s.z * 1.5, s.z * 1.5);
      }

      for (const pu of powerupsRef.current) {
        const color = pu.type === "spread" ? "#ffd36b" : pu.type === "rapid" ? "#ff7b3a" : "#7be0ff";
        ctx.save();
        ctx.translate(pu.x, pu.y);
        ctx.rotate(pu.t * 0.05);
        ctx.fillStyle = color;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const r = i % 2 === 0 ? 10 : 6;
          if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#1a1a2a";
        ctx.font = "bold 10px system-ui";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const label = pu.type === "spread" ? "S" : pu.type === "rapid" ? "R" : "Щ";
        ctx.fillText(label, 0, 1);
        ctx.restore();
      }

      for (const b of bulletsRef.current) {
        ctx.fillStyle = b.color;
        if (b.friendly) {
          ctx.fillRect(b.x - 2, b.y - 8, 4, 12);
          ctx.fillStyle = "rgba(255,230,109,0.35)";
          ctx.fillRect(b.x - 3, b.y - 10, 6, 16);
        } else {
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      for (const e of enemiesRef.current) drawBadger(e);

      const p = playerRef.current;
      drawBeaverShip(p);
      if (p.shield > 0) {
        ctx.strokeStyle = `rgba(123,224,255,${0.4 + Math.sin(Date.now() / 100) * 0.2})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x + p.w / 2, p.y + p.h / 2, 28, 0, Math.PI * 2);
        ctx.stroke();
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

      const boss = enemiesRef.current.find((e) => e.type === "boss");
      if (boss) {
        const bw = w - 60;
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(30, 14, bw, 10);
        ctx.fillStyle = "#ff5277";
        ctx.fillRect(30, 14, bw * (boss.hp / boss.maxHp), 10);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 10px system-ui";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("БОСС: БОЛЬШОЙ БАРСУК", w / 2, 19);
      }

      if (waveAnnounceRef.current > 0) {
        const a = waveAnnounceRef.current > 60 ? 1 : waveAnnounceRef.current / 60;
        ctx.globalAlpha = a;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "bold 44px system-ui";
        ctx.fillStyle = "#ffd36b";
        ctx.fillText(`Волна ${waveRef.current}`, w / 2, h / 2 - 10);
        if (waveRef.current % 5 === 0) {
          ctx.font = "bold 20px system-ui";
          ctx.fillStyle = "#ff5277";
          ctx.fillText("БОСС!", w / 2, h / 2 + 28);
        }
        ctx.globalAlpha = 1;
      }

      if (flashRef.current > 0) {
        ctx.fillStyle = `rgba(255,80,40,${(flashRef.current / 18) * 0.4})`;
        ctx.fillRect(0, 0, w, h);
      }
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
  }, [startWave, hitPlayer, spawnExplosion]);

  return (
    <div
      ref={wrapRef}
      className="relative w-full h-full overflow-hidden bg-[#0a0a1f] select-none touch-none"
    >
      <canvas ref={canvasRef} className="block w-full h-full" />

      {screen === "playing" && (
        <div className="absolute top-2 left-3 right-3 flex items-start justify-between pointer-events-none">
          <div className="flex flex-col gap-1">
            <div className="px-2.5 py-1 rounded-md bg-black/45 text-amber-300 text-sm font-bold">
              Очки: {score}
            </div>
            <div className="px-2.5 py-1 rounded-md bg-black/45 text-emerald-300 text-xs font-bold">
              Волна: {wave}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-black/45 text-rose-300 text-sm font-bold">
              {Array.from({ length: Math.max(0, lives) }).map((_, i) => (
                <Heart key={i} className="w-3.5 h-3.5 fill-rose-400 text-rose-400" />
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              {hud.spread > 0 && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-200 text-[10px] font-bold">
                  <Zap className="w-3 h-3" />
                  {Math.ceil(hud.spread / 60)}
                </span>
              )}
              {hud.rapid > 0 && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-500/30 text-orange-200 text-[10px] font-bold">
                  <Rocket className="w-3 h-3" />
                  {Math.ceil(hud.rapid / 60)}
                </span>
              )}
              {hud.shield > 0 && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-500/30 text-sky-200 text-[10px] font-bold">
                  <Shield className="w-3 h-3" />
                  {Math.ceil(hud.shield / 60)}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {screen === "ready" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 bg-black/55 backdrop-blur-[1px]">
          <div className="flex items-center gap-2 text-amber-300">
            <Rocket className="w-7 h-7" />
            <span className="text-3xl font-extrabold tracking-tight">Галактика Бобра</span>
          </div>
          <p className="mt-3 text-sm text-slate-200 max-w-xs">
            Стреляй по барсукам-пришельцам, собирай бонусы и одолей босса каждую 5-ю волну!
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-[11px] text-slate-300 max-w-sm">
            <div className="px-2 py-1.5 rounded bg-white/10">
              <div className="font-bold text-amber-200">A / D</div>
              <div>движение</div>
            </div>
            <div className="px-2 py-1.5 rounded bg-white/10">
              <div className="font-bold text-amber-200">Авто</div>
              <div>огонь</div>
            </div>
            <div className="px-2 py-1.5 rounded bg-white/10">
              <div className="font-bold text-amber-200">S R Щ</div>
              <div>бонусы</div>
            </div>
          </div>
          <button
            onClick={startGame}
            className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-400 text-stone-900 font-bold hover:bg-amber-300 transition"
          >
            <Play className="w-4 h-4 fill-stone-900" />
            Старт
          </button>
          <div className="mt-2 text-[11px] text-slate-400">Пробел / Enter — начать</div>
        </div>
      )}

      {screen === "gameover" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 bg-black/65 backdrop-blur-[1px]">
          <Skull className="w-10 h-10 text-rose-400" />
          <div className="mt-2 text-3xl font-extrabold text-rose-300">Бобёр сбит!</div>
          <div className="mt-3 text-lg text-amber-200 font-bold">Очки: {score}</div>
          <div className="text-sm text-emerald-300 font-semibold">Достигнута волна: {wave}</div>
          <button
            onClick={startGame}
            className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-400 text-stone-900 font-bold hover:bg-amber-300 transition"
          >
            <RotateCcw className="w-4 h-4" />
            Заново
          </button>
        </div>
      )}
    </div>
  );
}
