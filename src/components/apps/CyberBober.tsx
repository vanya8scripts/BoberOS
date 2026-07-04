"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* ============================================================
   КиберБобер — neon cyberpunk top-down arena shooter.
   Self-contained: pure canvas + React hooks. No externals.
   ============================================================ */

type GameState = "start" | "playing" | "gameover";

interface Player {
  x: number; y: number; vx: number; vy: number;
  health: number; maxHealth: number; fireCd: number; angle: number; invuln: number;
}
interface Bullet { x: number; y: number; vx: number; vy: number; life: number; }
interface Enemy {
  x: number; y: number; health: number; maxHealth: number;
  radius: number; speed: number; type: "small" | "big"; hitFlash: number; spin: number;
}
interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number; }

const C = {
  bg: "#0a0a14",
  grid: "rgba(217, 70, 239, 0.10)",
  beaver: "#7c4a2d",
  beaverDark: "#5a3520",
  neon: "#22d3ee",
  neonPink: "#e879f9",
  bullet: "#67e8f9",
  enemy: "#170714",
  enemyOutline: "#ff2d6f",
};

export function CyberBober() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<GameState>("start");
  const [hud, setHud] = useState({ score: 0, health: 100, maxHealth: 100, wave: 1 });

  const stateRef = useRef<GameState>("start");
  const startRef = useRef<() => void>(() => {});
  const keysRef = useRef<Record<string, boolean>>({});

  const setStateBoth = useCallback((s: GameState) => {
    stateRef.current = s;
    setState(s);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const container = containerRef.current!;
    const ctx = canvas.getContext("2d")!;
    if (!ctx) return;

    let width = container.clientWidth || 840;
    let height = container.clientHeight || 580;
    canvas.width = width;
    canvas.height = height;

    const resize = () => {
      width = Math.max(320, container.clientWidth || 840);
      height = Math.max(240, container.clientHeight || 580);
      canvas.width = width;
      canvas.height = height;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    let player: Player = makePlayer();
    let bullets: Bullet[] = [];
    let enemies: Enemy[] = [];
    let particles: Particle[] = [];
    let score = 0;
    let wave = 1;
    let timeAlive = 0;
    let spawnTimer = 0;
    let spawnInterval = 1.4;
    let shakeTime = 0;
    let shakeMag = 0;
    let clock = 0;
    let lastTs = 0;
    let rafId = 0;
    let lastHud = "";

    function makePlayer(): Player {
      return {
        x: width / 2, y: height / 2, vx: 0, vy: 0,
        health: 100, maxHealth: 100, fireCd: 0, angle: 0, invuln: 0,
      };
    }

    function reset() {
      player = makePlayer();
      bullets = [];
      enemies = [];
      particles = [];
      score = 0;
      wave = 1;
      timeAlive = 0;
      spawnTimer = 0;
      spawnInterval = 1.4;
      shakeTime = 0;
      shakeMag = 0;
      pushHud(true);
    }

    function start() {
      reset();
      setStateBoth("playing");
    }
    startRef.current = start;

    function pushHud(force?: boolean) {
      const key = `${score}|${player.health}|${wave}`;
      if (force || key !== lastHud) {
        lastHud = key;
        setHud({ score, health: Math.max(0, player.health), maxHealth: player.maxHealth, wave });
      }
    }

    function spawnEnemy() {
      const edge = (Math.random() * 4) | 0;
      const m = 40;
      let x = 0, y = 0;
      if (edge === 0) { x = Math.random() * width; y = -m; }
      else if (edge === 1) { x = width + m; y = Math.random() * height; }
      else if (edge === 2) { x = Math.random() * width; y = height + m; }
      else { x = -m; y = Math.random() * height; }
      const bigChance = Math.min(0.45, 0.15 + wave * 0.03);
      const isBig = Math.random() < bigChance;
      const radius = isBig ? 26 : 14;
      const speed = isBig ? 42 + wave * 2.2 : 84 + wave * 3.2;
      enemies.push({
        x, y, health: isBig ? 4 : 1, maxHealth: isBig ? 4 : 1,
        radius, speed, type: isBig ? "big" : "small",
        hitFlash: 0, spin: Math.random() * Math.PI * 2,
      });
    }

    function burst(x: number, y: number, color: string, count: number, speed: number) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = speed * (0.3 + Math.random() * 0.8);
        const life = 0.45 + Math.random() * 0.5;
        particles.push({
          x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          life, maxLife: life, color, size: 1.5 + Math.random() * 3,
        });
      }
    }

    function fire() {
      if (enemies.length === 0) return;
      let best: Enemy | null = null;
      let bd = Infinity;
      for (const e of enemies) {
        const d = (e.x - player.x) ** 2 + (e.y - player.y) ** 2;
        if (d < bd) { bd = d; best = e; }
      }
      if (!best) return;
      const dx = best.x - player.x;
      const dy = best.y - player.y;
      const d = Math.hypot(dx, dy) || 1;
      const sp = 560;
      const mx = player.x + Math.cos(player.angle) * 22;
      const my = player.y + Math.sin(player.angle) * 22;
      bullets.push({ x: mx, y: my, vx: (dx / d) * sp, vy: (dy / d) * sp, life: 1.4 });
      burst(mx, my, C.bullet, 2, 90);
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
      keysRef.current[k] = true;
      if (k === "r" && stateRef.current === "gameover") start();
      if (stateRef.current !== "playing" && (k === " " || k === "enter")) start();
      if (k === " " && stateRef.current === "playing") fire();
    };
    const onKeyUp = (e: KeyboardEvent) => { keysRef.current[e.key.toLowerCase()] = false; };
    const onPointerDown = (e: PointerEvent) => {
      if (stateRef.current !== "playing") { start(); return; }
      if (e.button === 0) fire();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("pointerdown", onPointerDown);

    function update(dt: number) {
      timeAlive += dt;
      const newWave = Math.floor(timeAlive / 14) + 1;
      if (newWave !== wave) { wave = newWave; }
      spawnInterval = Math.max(0.32, 1.4 - wave * 0.1);

      spawnTimer += dt;
      while (spawnTimer >= spawnInterval) {
        spawnTimer -= spawnInterval;
        spawnEnemy();
      }

      const keys = keysRef.current;
      let mx = 0, my = 0;
      if (keys["w"] || keys["arrowup"]) my -= 1;
      if (keys["s"] || keys["arrowdown"]) my += 1;
      if (keys["a"] || keys["arrowleft"]) mx -= 1;
      if (keys["d"] || keys["arrowright"]) mx += 1;
      const ml = Math.hypot(mx, my);
      if (ml > 0) { mx /= ml; my /= ml; }
      const maxSpeed = 270;
      const tvx = mx * maxSpeed, tvy = my * maxSpeed;
      const kk = Math.min(1, dt * 12);
      player.vx += (tvx - player.vx) * kk;
      player.vy += (tvy - player.vy) * kk;
      player.x += player.vx * dt;
      player.y += player.vy * dt;
      player.x = Math.max(18, Math.min(width - 18, player.x));
      player.y = Math.max(18, Math.min(height - 18, player.y));

      if (ml > 0 && Math.random() < 0.7) {
        burst(player.x - Math.cos(player.angle) * 16, player.y - Math.sin(player.angle) * 16, C.neonPink, 1, 40);
      }

      if (enemies.length > 0) {
        let best = enemies[0], bd = Infinity;
        for (const e of enemies) {
          const d = (e.x - player.x) ** 2 + (e.y - player.y) ** 2;
          if (d < bd) { bd = d; best = e; }
        }
        player.angle = Math.atan2(best.y - player.y, best.x - player.x);
      }

      player.fireCd -= dt;
      if (player.invuln > 0) player.invuln -= dt;

      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
        if (b.life <= 0 || b.x < -30 || b.x > width + 30 || b.y < -30 || b.y > height + 30) {
          bullets.splice(i, 1);
          continue;
        }
        for (let j = enemies.length - 1; j >= 0; j--) {
          const e = enemies[j];
          const dx = e.x - b.x, dy = e.y - b.y;
          if (dx * dx + dy * dy < (e.radius + 4) * (e.radius + 4)) {
            e.health -= 1;
            e.hitFlash = 0.12;
            bullets.splice(i, 1);
            burst(b.x, b.y, C.neon, 4, 130);
            if (e.health <= 0) {
              burst(e.x, e.y, C.enemyOutline, e.type === "big" ? 18 : 10, e.type === "big" ? 230 : 170);
              burst(e.x, e.y, C.neon, 6, 150);
              score += e.type === "big" ? 25 : 10;
              enemies.splice(j, 1);
              shakeTime = 0.14; shakeMag = e.type === "big" ? 7 : 3.5;
              pushHud();
            }
            break;
          }
        }
      }

      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        const dx = player.x - e.x, dy = player.y - e.y;
        const d = Math.hypot(dx, dy) || 1;
        e.x += (dx / d) * e.speed * dt;
        e.y += (dy / d) * e.speed * dt;
        e.spin += dt * (e.type === "big" ? 1.6 : 3.2);
        if (e.hitFlash > 0) e.hitFlash -= dt;

        if (d < e.radius + 15 && player.invuln <= 0) {
          const dmg = e.type === "big" ? 18 : 8;
          player.health -= dmg;
          player.invuln = 0.8;
          player.vx -= (dx / d) * 220;
          player.vy -= (dy / d) * 220;
          burst(player.x, player.y, C.enemyOutline, 12, 190);
          burst(player.x, player.y, C.neon, 6, 120);
          shakeTime = 0.28; shakeMag = 11;
          e.health -= 1;
          if (e.health <= 0) enemies.splice(i, 1);
          pushHud();
          if (player.health <= 0) {
            player.health = 0;
            pushHud(true);
            setStateBoth("gameover");
          }
        }
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vx *= 0.92; p.vy *= 0.92;
        p.life -= dt;
        if (p.life <= 0) particles.splice(i, 1);
      }

      if (shakeTime > 0) shakeTime -= dt;
    }

    function drawGrid() {
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1;
      const gap = 40;
      const off = (clock * 14) % gap;
      ctx.beginPath();
      for (let x = -off; x < width; x += gap) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
      for (let y = -off; y < height; y += gap) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
      ctx.stroke();
    }
    function drawVignette() {
      const g = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.28, width / 2, height / 2, Math.max(width, height) * 0.72);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, "rgba(0,0,0,0.65)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);
    }
    function drawBeaver(p: Player) {
      const blink = p.invuln > 0 && Math.floor(clock * 20) % 2 === 0;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.shadowBlur = 18;
      ctx.shadowColor = C.neon;
      ctx.fillStyle = C.beaverDark;
      ctx.beginPath();
      ctx.ellipse(-20, 0, 9, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = C.neon; ctx.lineWidth = 1.5; ctx.stroke();
      if (!blink) {
        ctx.fillStyle = C.beaver;
        ctx.beginPath(); ctx.ellipse(0, 0, 16, 12, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = C.neon; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.strokeStyle = C.neon; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-8, -4); ctx.lineTo(3, -4);
        ctx.moveTo(-8, 4); ctx.lineTo(3, 4);
        ctx.moveTo(-4, -7); ctx.lineTo(-4, 7);
        ctx.stroke();
        ctx.fillStyle = C.beaver;
        ctx.beginPath(); ctx.arc(14, 0, 10, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = C.neon; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = C.beaverDark;
        ctx.beginPath(); ctx.arc(11, -8, 3, 0, Math.PI * 2); ctx.arc(11, 8, 3, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#ffffff"; ctx.fillRect(21, -2.5, 4, 5);
        ctx.shadowBlur = 12; ctx.shadowColor = C.neon;
        ctx.fillStyle = C.neon;
        ctx.beginPath(); ctx.arc(18, -4, 2, 0, Math.PI * 2); ctx.arc(18, 4, 2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      ctx.shadowBlur = 0;
    }
    function drawBullets() {
      ctx.shadowBlur = 14; ctx.shadowColor = C.bullet;
      for (const b of bullets) {
        ctx.fillStyle = C.bullet;
        ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath(); ctx.arc(b.x, b.y, 1.4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.shadowBlur = 0;
    }
    function drawEnemy(e: Enemy) {
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(e.spin);
      ctx.shadowBlur = 14; ctx.shadowColor = C.enemyOutline;
      const spikes = e.type === "big" ? 10 : 7;
      const r = e.radius;
      ctx.beginPath();
      for (let i = 0; i < spikes * 2; i++) {
        const a = (i / (spikes * 2)) * Math.PI * 2;
        const rad = i % 2 === 0 ? r : r * 0.58;
        const x = Math.cos(a) * rad, y = Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = e.hitFlash > 0 ? "#ff7aa8" : C.enemy;
      ctx.fill();
      ctx.strokeStyle = C.enemyOutline; ctx.lineWidth = 2; ctx.stroke();
      ctx.shadowBlur = 8; ctx.fillStyle = C.enemyOutline;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.26, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.shadowBlur = 0;
    }
    function drawParticles() {
      for (const p of particles) {
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx.shadowBlur = 8; ctx.shadowColor = p.color; ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    }

    function render() {
      let ox = 0, oy = 0;
      if (shakeTime > 0) {
        const m = shakeMag * Math.max(0, shakeTime / 0.28);
        ox = (Math.random() - 0.5) * m;
        oy = (Math.random() - 0.5) * m;
      }
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, width, height);
      ctx.save();
      ctx.translate(ox, oy);
      drawGrid();
      drawParticles();
      for (const e of enemies) drawEnemy(e);
      drawBullets();
      if (stateRef.current === "start") player.angle = Math.sin(clock * 0.9) * 1.1;
      drawBeaver(player);
      ctx.restore();
      drawVignette();
    }

    function loop(ts: number) {
      if (!lastTs) lastTs = ts;
      let dt = (ts - lastTs) / 1000;
      lastTs = ts;
      if (dt > 0.05) dt = 0.05;
      clock += dt;
      if (stateRef.current === "playing") update(dt);
      render();
      rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("pointerdown", onPointerDown);
    };
  }, [setStateBoth]);

  const startGame = () => startRef.current();
  const healthPct = Math.max(0, (hud.health / hud.maxHealth) * 100);
  const lowHealth = healthPct < 30;

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full select-none overflow-hidden bg-[#0a0a14]"
    >
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full cursor-crosshair" />

      {/* HUD */}
      <div className="pointer-events-none absolute inset-0 p-3 font-mono text-cyan-300">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-fuchsia-400/80">Очки</div>
            <div className="text-2xl font-bold leading-none text-cyan-200" style={{ textShadow: "0 0 10px #22d3ee, 0 0 20px #22d3ee" }}>
              {hud.score}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-widest text-fuchsia-400/80">Волна</div>
            <div className="text-2xl font-bold leading-none text-fuchsia-300" style={{ textShadow: "0 0 10px #e879f9, 0 0 20px #e879f9" }}>
              {hud.wave}
            </div>
          </div>
        </div>
        <div className="mt-2 max-w-xs">
          <div className="mb-0.5 text-[10px] uppercase tracking-widest text-fuchsia-400/80">Здоровье</div>
          <div className="h-3 w-full overflow-hidden rounded-full border border-fuchsia-500/40 bg-black/60">
            <div
              className="h-full rounded-full transition-[width] duration-150"
              style={{
                width: `${healthPct}%`,
                background: lowHealth
                  ? "linear-gradient(90deg,#ff2d6f,#ff7aa8)"
                  : "linear-gradient(90deg,#e879f9,#22d3ee)",
                boxShadow: lowHealth ? "0 0 12px #ff2d6f" : "0 0 10px #22d3ee",
                animation: lowHealth ? "bober-pulse 0.6s ease-in-out infinite" : undefined,
              }}
            />
          </div>
        </div>
      </div>

      {/* Start screen */}
      {state === "start" && (
        <button
          onClick={startGame}
          className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center bg-black/55 backdrop-blur-[2px]"
        >
          <h1
            className="text-5xl font-black tracking-tight text-transparent sm:text-6xl"
            style={{
              backgroundImage: "linear-gradient(90deg,#22d3ee,#e879f9)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              filter: "drop-shadow(0 0 18px rgba(232,121,249,0.7))",
            }}
          >
            КиберБобер
          </h1>
          <p className="mt-3 font-mono text-sm text-cyan-300/90">
            WASD / стрелки — движение · клик или Пробел — огонь
          </p>
          <p className="mt-6 animate-pulse font-mono text-lg text-fuchsia-300" style={{ textShadow: "0 0 12px #e879f9" }}>
            Нажми, чтобы начать
          </p>
        </button>
      )}

      {/* Game over */}
      {state === "gameover" && (
        <button
          onClick={startGame}
          className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center bg-black/70 backdrop-blur-[2px]"
        >
          <h2 className="text-4xl font-black text-rose-400 sm:text-5xl" style={{ textShadow: "0 0 20px #ff2d6f" }}>
            Игра окончена
          </h2>
          <p className="mt-3 font-mono text-cyan-300">
            Очки: <span className="font-bold text-cyan-100">{hud.score}</span> · Волна:{" "}
            <span className="font-bold text-fuchsia-300">{hud.wave}</span>
          </p>
          <p className="mt-6 animate-pulse font-mono text-base text-fuchsia-300" style={{ textShadow: "0 0 12px #e879f9" }}>
            Нажми R или кликни для рестарта
          </p>
        </button>
      )}

      <style>{`@keyframes bober-pulse{0%,100%{opacity:1}50%{opacity:.45}}`}</style>
    </div>
  );
}
