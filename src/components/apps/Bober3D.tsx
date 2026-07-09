"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Heart, RotateCcw, Skull, Target, Trophy } from "lucide-react";

type GameState = "ready" | "playing" | "gameover" | "win";

interface Enemy {
  x: number;
  y: number;
  health: number;
  alive: boolean;
  deadTimer: number;
  hitFlash: number;
  attackCooldown: number;
  wobble: number;
}

const MAP: number[][] = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1],
  [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
  [1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1],
  [1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1],
  [1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1],
  [1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1],
  [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
  [1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];
const MAP_W = 16;
const MAP_H = 16;

const FOV = Math.PI / 3;
const MOVE_SPEED = 3.0;
const ROT_SPEED = 2.6;
const MOUSE_SENS = 0.0022;
const ENEMY_SPEED = 1.15;
const ENEMY_DAMAGE = 9;
const ATTACK_RANGE = 0.85;
const ATTACK_COOLDOWN = 0.85;
const SHOOT_DAMAGE = 60;
const SHOOT_RANGE = 14;
const MAX_HEALTH = 100;
const NUM_ENEMIES = 7;

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function isWall(mx: number, my: number): boolean {
  if (mx < 0 || my < 0 || mx >= MAP_W || my >= MAP_H) return true;
  return MAP[my][mx] === 1;
}

function makeBadgerSprite(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const g = c.getContext("2d");
  if (!g) return c;
  const body = g.createLinearGradient(0, 14, 0, 58);
  body.addColorStop(0, "#3b3733");
  body.addColorStop(1, "#1b1816");
  g.fillStyle = body;
  g.beginPath();
  g.ellipse(32, 42, 23, 20, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#2c2926";
  g.beginPath();
  g.ellipse(32, 24, 17, 15, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#f4eede";
  g.beginPath();
  g.ellipse(23, 22, 4.5, 10, -0.25, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.ellipse(41, 22, 4.5, 10, 0.25, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#e8dcc0";
  g.beginPath();
  g.ellipse(32, 30, 11, 8, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#0c0a09";
  g.beginPath();
  g.arc(26, 20, 2.2, 0, Math.PI * 2);
  g.arc(38, 20, 2.2, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.ellipse(32, 30, 3.4, 2.4, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#f4eede";
  g.beginPath();
  g.ellipse(20, 58, 5, 3, 0, 0, Math.PI * 2);
  g.ellipse(44, 58, 5, 3, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#2c2926";
  g.beginPath();
  g.ellipse(12, 46, 4, 7, -0.3, 0, Math.PI * 2);
  g.ellipse(52, 46, 4, 7, 0.3, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "#0c0a09";
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(24, 36);
  g.lineTo(20, 44);
  g.moveTo(40, 36);
  g.lineTo(44, 44);
  g.stroke();
  return c;
}

function makeDeadSprite(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 32;
  const g = c.getContext("2d");
  if (!g) return c;
  g.fillStyle = "#2c2926";
  g.beginPath();
  g.ellipse(32, 20, 27, 10, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#1b1816";
  g.beginPath();
  g.ellipse(32, 17, 16, 6, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#f4eede";
  g.beginPath();
  g.ellipse(23, 15, 3, 5, -0.2, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.ellipse(41, 15, 3, 5, 0.2, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#0c0a09";
  g.beginPath();
  g.arc(26, 14, 1.6, 0, Math.PI * 2);
  g.arc(38, 14, 1.6, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "#3b3733";
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(10, 22);
  g.lineTo(6, 26);
  g.moveTo(54, 22);
  g.lineTo(58, 26);
  g.stroke();
  return c;
}

let enemies: Enemy[] = [];

function drawGun(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  flash: number,
  bobPhase: number,
): void {
  const cx = W / 2;
  const bobY = Math.sin(bobPhase * 0.5) * 3;
  const baseY = H - 4 + bobY;
  const pawW = Math.min(230, W * 0.3);
  const pawH = Math.min(110, H * 0.26);
  const grad = ctx.createLinearGradient(0, baseY - pawH, 0, baseY);
  grad.addColorStop(0, "#9a6438");
  grad.addColorStop(1, "#5a3618");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(cx - pawW / 2, baseY);
  ctx.lineTo(cx - pawW / 2 + 18, baseY - pawH + 22);
  ctx.quadraticCurveTo(cx, baseY - pawH - 8, cx + pawW / 2 - 18, baseY - pawH + 22);
  ctx.lineTo(cx + pawW / 2, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#3a2410";
  for (let i = 0; i < 4; i++) {
    const fx = cx - pawW * 0.34 + i * (pawW * 0.226);
    const fy = baseY - pawH + 10;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx + 9, fy - 22);
    ctx.lineTo(fx + 18, fy);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = "#2a1808";
  ctx.beginPath();
  ctx.ellipse(cx, baseY - 16, 9, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  ctx.ellipse(cx - pawW * 0.22, baseY - pawH * 0.55, pawW * 0.14, pawH * 0.18, -0.2, 0, Math.PI * 2);
  ctx.fill();
  if (flash > 0) {
    const fy = baseY - pawH - 12;
    const fr = 60 * (flash / 0.09) + 22;
    const fl = ctx.createRadialGradient(cx, fy, 2, cx, fy, fr);
    fl.addColorStop(0, "rgba(255,250,210,0.95)");
    fl.addColorStop(0.3, "rgba(255,180,60,0.7)");
    fl.addColorStop(1, "rgba(255,120,20,0)");
    ctx.fillStyle = fl;
    ctx.beginPath();
    ctx.arc(cx, fy, fr, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255,240,180,${clamp(flash * 4, 0, 0.18)})`;
    ctx.fillRect(0, 0, W, H);
  }
}

export function Bober3D() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const screenRef = useRef<GameState>("ready");
  const [screen, setScreen] = useState<GameState>("ready");
  const [health, setHealth] = useState(MAX_HEALTH);
  const [score, setScore] = useState(0);
  const [enemiesLeft, setEnemiesLeft] = useState(NUM_ENEMIES);

  const playerRef = useRef({
    x: 1.5,
    y: 1.5,
    dirX: 1,
    dirY: 0,
    planeX: 0,
    planeY: Math.tan(FOV / 2),
    health: MAX_HEALTH,
    bob: 0,
  });
  const keysRef = useRef<Record<string, boolean>>({});
  const mouseDxRef = useRef(0);
  const lockedRef = useRef(false);
  const shootRef = useRef(false);
  const flashRef = useRef(0);
  const damageRef = useRef(0);
  const hitMarkerRef = useRef(0);
  const zbufRef = useRef<Float32Array>(new Float32Array(640));
  const lastTimeRef = useRef(0);
  const bobPhaseRef = useRef(0);

  const badgerSpriteRef = useRef<HTMLCanvasElement | null>(null);
  const deadSpriteRef = useRef<HTMLCanvasElement | null>(null);

  const setGameState = useCallback((s: GameState) => {
    screenRef.current = s;
    setScreen(s);
  }, []);

  const placeEnemies = useCallback(() => {
    const open: Array<{ x: number; y: number }> = [];
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        if (MAP[y][x] === 0) {
          const d = Math.hypot(x + 0.5 - 1.5, y + 0.5 - 1.5);
          if (d > 4.5) open.push({ x: x + 0.5, y: y + 0.5 });
        }
      }
    }
    open.sort(
      (a, b) =>
        Math.hypot(b.x - 1.5, b.y - 1.5) - Math.hypot(a.x - 1.5, a.y - 1.5),
    );
    const list: Enemy[] = [];
    const step = Math.max(1, Math.floor(open.length / NUM_ENEMIES));
    for (let i = 0; i < NUM_ENEMIES; i++) {
      const idx = Math.min(open.length - 1, i * step + (i % 3));
      const cell = open[idx];
      if (!cell) break;
      list.push({
        x: cell.x,
        y: cell.y,
        health: 100,
        alive: true,
        deadTimer: 0,
        hitFlash: 0,
        attackCooldown: 0.6 + i * 0.15,
        wobble: i * 0.9,
      });
    }
    enemies = list;
    setEnemiesLeft(list.length);
  }, []);

  const resetGame = useCallback(() => {
    playerRef.current = {
      x: 1.5,
      y: 1.5,
      dirX: 1,
      dirY: 0,
      planeX: 0,
      planeY: Math.tan(FOV / 2),
      health: MAX_HEALTH,
      bob: 0,
    };
    placeEnemies();
    setHealth(MAX_HEALTH);
    setScore(0);
    flashRef.current = 0;
    damageRef.current = 0;
    hitMarkerRef.current = 0;
    bobPhaseRef.current = 0;
    mouseDxRef.current = 0;
    keysRef.current = {};
  }, [placeEnemies]);

  const startGame = useCallback(() => {
    resetGame();
    setGameState("playing");
    const cv = canvasRef.current;
    if (cv && document.pointerLockElement !== cv) {
      cv.requestPointerLock?.();
    }
  }, [resetGame, setGameState]);

  const doShoot = useCallback(() => {
    if (screenRef.current !== "playing") return;
    flashRef.current = 0.09;
    const p = playerRef.current;
    let best: Enemy | null = null;
    let bestDist = SHOOT_RANGE;
    const aimAng = Math.atan2(p.dirY, p.dirX);
    for (const e of enemies) {
      if (!e.alive) continue;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist > SHOOT_RANGE || dist < 0.01) continue;
      let da = Math.atan2(dy, dx) - aimAng;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      const aimRadius = 0.16 + 0.035 * dist;
      if (Math.abs(da) >= aimRadius || dist >= bestDist) continue;
      let blocked = false;
      const steps = Math.ceil(dist * 7);
      for (let s = 1; s < steps; s++) {
        const t = s / steps;
        if (isWall(Math.floor(p.x + dx * t), Math.floor(p.y + dy * t))) {
          blocked = true;
          break;
        }
      }
      if (!blocked) {
        best = e;
        bestDist = dist;
      }
    }
    if (best) {
      best.health -= SHOOT_DAMAGE;
      best.hitFlash = 0.15;
      hitMarkerRef.current = 0.18;
      if (best.health <= 0) {
        best.alive = false;
        best.deadTimer = 1.4;
        setScore((s) => s + 1);
        const remaining = enemies.filter((en) => en.alive).length;
        setEnemiesLeft(remaining);
        if (remaining === 0) {
          setGameState("win");
          if (document.pointerLockElement) document.exitPointerLock();
        }
      }
    }
  }, [setGameState]);

  const update = useCallback(
    (dt: number) => {
      if (screenRef.current !== "playing") return;
      const p = playerRef.current;
      const keys = keysRef.current;

      let rot = 0;
      if (keys["ArrowLeft"]) rot -= ROT_SPEED * dt;
      if (keys["ArrowRight"]) rot += ROT_SPEED * dt;
      if (mouseDxRef.current !== 0) {
        rot += mouseDxRef.current * MOUSE_SENS;
        mouseDxRef.current = 0;
      }
      if (rot !== 0) {
        const c = Math.cos(rot);
        const s = Math.sin(rot);
        const ndx = p.dirX * c - p.dirY * s;
        const ndy = p.dirX * s + p.dirY * c;
        p.dirX = ndx;
        p.dirY = ndy;
        const npx = p.planeX * c - p.planeY * s;
        const npy = p.planeX * s + p.planeY * c;
        p.planeX = npx;
        p.planeY = npy;
      }

      let mx = 0;
      let my = 0;
      if (keys["KeyW"] || keys["ArrowUp"]) {
        mx += p.dirX;
        my += p.dirY;
      }
      if (keys["KeyS"] || keys["ArrowDown"]) {
        mx -= p.dirX;
        my -= p.dirY;
      }
      const strafeX = -p.dirY;
      const strafeY = p.dirX;
      if (keys["KeyA"]) {
        mx -= strafeX;
        my -= strafeY;
      }
      if (keys["KeyD"]) {
        mx += strafeX;
        my += strafeY;
      }
      const len = Math.hypot(mx, my);
      if (len > 0.001) {
        mx = (mx / len) * MOVE_SPEED * dt;
        my = (my / len) * MOVE_SPEED * dt;
        const pad = 0.22;
        const nx = p.x + mx;
        const ny = p.y + my;
        if (!isWall(Math.floor(nx + Math.sign(mx) * pad), Math.floor(p.y))) p.x = nx;
        if (!isWall(Math.floor(p.x), Math.floor(ny + Math.sign(my) * pad))) p.y = ny;
        bobPhaseRef.current += dt * 9;
        p.bob = Math.sin(bobPhaseRef.current) * 0.02;
      } else {
        p.bob *= 0.85;
      }

      if (shootRef.current) {
        shootRef.current = false;
        doShoot();
      }
      if (flashRef.current > 0) flashRef.current -= dt;
      if (damageRef.current > 0) damageRef.current -= dt;
      if (hitMarkerRef.current > 0) hitMarkerRef.current -= dt;

      for (const e of enemies) {
        e.wobble += dt * 6;
        if (e.hitFlash > 0) e.hitFlash -= dt;
        if (!e.alive) {
          if (e.deadTimer > 0) e.deadTimer -= dt;
          continue;
        }
        const dx = p.x - e.x;
        const dy = p.y - e.y;
        const d = Math.hypot(dx, dy);
        if (d > 0.001) {
          const ux = dx / d;
          const uy = dy / d;
          const spd = ENEMY_SPEED * dt;
          const ex = e.x + ux * spd;
          const ey = e.y + uy * spd;
          if (!isWall(Math.floor(ex), Math.floor(e.y))) e.x = ex;
          if (!isWall(Math.floor(e.x), Math.floor(ey))) e.y = ey;
        }
        if (e.attackCooldown > 0) e.attackCooldown -= dt;
        if (d < ATTACK_RANGE && e.attackCooldown <= 0) {
          e.attackCooldown = ATTACK_COOLDOWN;
          p.health -= ENEMY_DAMAGE;
          damageRef.current = 0.32;
          setHealth(Math.max(0, Math.round(p.health)));
          if (p.health <= 0) {
            setGameState("gameover");
            if (document.pointerLockElement) document.exitPointerLock();
          }
        }
      }
    },
    [doShoot, setGameState, setHealth],
  );

  const render = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const W = cv.width;
    const H = cv.height;
    const p = playerRef.current;
    const horizon = Math.floor(H / 2 + H * p.bob);
    if (zbufRef.current.length !== W) zbufRef.current = new Float32Array(W);
    const zbuf = zbufRef.current;

    const ceilGrad = ctx.createLinearGradient(0, 0, 0, Math.max(1, horizon));
    ceilGrad.addColorStop(0, "#0e0a06");
    ceilGrad.addColorStop(1, "#3a2818");
    ctx.fillStyle = ceilGrad;
    ctx.fillRect(0, 0, W, horizon);
    const floorGrad = ctx.createLinearGradient(0, horizon, 0, H);
    floorGrad.addColorStop(0, "#3a2818");
    floorGrad.addColorStop(1, "#0a0703");
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, horizon, W, H - horizon);

    for (let x = 0; x < W; x++) {
      const cameraX = (2 * x) / W - 1;
      const rayX = p.dirX + p.planeX * cameraX;
      const rayY = p.dirY + p.planeY * cameraX;
      let mapX = Math.floor(p.x);
      let mapY = Math.floor(p.y);
      const deltaX = rayX === 0 ? 1e30 : Math.abs(1 / rayX);
      const deltaY = rayY === 0 ? 1e30 : Math.abs(1 / rayY);
      let stepX: number;
      let stepY: number;
      let sideX: number;
      let sideY: number;
      if (rayX < 0) {
        stepX = -1;
        sideX = (p.x - mapX) * deltaX;
      } else {
        stepX = 1;
        sideX = (mapX + 1 - p.x) * deltaX;
      }
      if (rayY < 0) {
        stepY = -1;
        sideY = (p.y - mapY) * deltaY;
      } else {
        stepY = 1;
        sideY = (mapY + 1 - p.y) * deltaY;
      }
      let side = 0;
      let hit = false;
      let guard = 0;
      while (!hit && guard < 80) {
        guard++;
        if (sideX < sideY) {
          sideX += deltaX;
          mapX += stepX;
          side = 0;
        } else {
          sideY += deltaY;
          mapY += stepY;
          side = 1;
        }
        if (mapX < 0 || mapY < 0 || mapX >= MAP_W || mapY >= MAP_H) {
          hit = true;
          break;
        }
        if (MAP[mapY][mapX] === 1) hit = true;
      }
      let perp = side === 0 ? sideX - deltaX : sideY - deltaY;
      if (perp < 0.0001) perp = 0.0001;
      zbuf[x] = perp;
      const lineH = H / perp;
      let drawStart = -lineH / 2 + horizon;
      let drawEnd = lineH / 2 + horizon;

      let wallX = side === 0 ? p.y + perp * rayY : p.x + perp * rayX;
      wallX -= Math.floor(wallX);

      const planks = 3;
      const pf = wallX * planks;
      const pIdx = Math.floor(pf);
      const within = pf - pIdx;
      let plankShade = pIdx % 2 === 0 ? 1.0 : 0.82;
      if (within < 0.06 || within > 0.94) plankShade *= 0.55;
      const grain = 0.045 * Math.sin(wallX * 53 + pIdx * 1.7);
      const sideShade = side === 1 ? 0.72 : 1.0;
      const distFactor = clamp(1 - perp / 13, 0.1, 1);
      const total = clamp(plankShade + grain, 0.05, 1.25) * sideShade * distFactor;
      const r = Math.round(clamp(152 * total, 0, 255));
      const gC = Math.round(clamp(100 * total, 0, 255));
      const b = Math.round(clamp(54 * total, 0, 255));
      ctx.fillStyle = `rgb(${r},${gC},${b})`;
      if (drawStart < 0) drawStart = 0;
      if (drawEnd > H) drawEnd = H;
      ctx.fillRect(x, drawStart, 1, drawEnd - drawStart);
    }

    const ordered = enemies
      .slice()
      .sort(
        (a, b) =>
          (b.x - p.x) * (b.x - p.x) + (b.y - p.y) * (b.y - p.y) -
          ((a.x - p.x) * (a.x - p.x) + (a.y - p.y) * (a.y - p.y)),
      );
    const det = p.planeX * p.dirY - p.dirX * p.planeY;
    if (Math.abs(det) > 1e-9) {
      const invDet = 1 / det;
      for (const e of ordered) {
        if (!e.alive && e.deadTimer <= 0) continue;
        const sx = e.x - p.x;
        const sy = e.y - p.y;
        const transformX = invDet * (p.dirY * sx - p.dirX * sy);
        const transformY = invDet * (-p.planeY * sx + p.planeX * sy);
        if (transformY <= 0.12) continue;
        const screenX = Math.floor((W / 2) * (1 + transformX / transformY));
        const sprH = Math.abs(H / transformY);
        const sprW = sprH;
        const wobble = e.alive ? Math.sin(e.wobble) * sprH * 0.012 : 0;
        const footY = horizon + sprH * 0.5 + sprH * 0.02;
        const drawH = e.alive ? sprH : sprH * 0.5;
        const drawStartY = footY - drawH + wobble;
        const drawEndY = footY + wobble;
        const sprite = e.alive ? badgerSpriteRef.current : deadSpriteRef.current;
        if (!sprite) continue;
        const texW = sprite.width;
        const texH = sprite.height;
        const drawStartX = -Math.floor(sprW / 2) + screenX;
        const drawEndX = Math.floor(sprW / 2) + screenX;
        const denom = drawEndY - drawStartY || 1;
        for (let stripe = drawStartX; stripe < drawEndX; stripe++) {
          if (stripe < 0 || stripe >= W) continue;
          if (transformY >= zbuf[stripe]) continue;
          const texX = Math.floor(((stripe - drawStartX) * texW) / (sprW || 1));
          if (texX < 0 || texX >= texW) continue;
          let sy0 = drawStartY;
          let sy1 = drawEndY;
          if (sy0 < 0) sy0 = 0;
          if (sy1 > H) sy1 = H;
          if (sy1 <= sy0) continue;
          const srcY0 = Math.floor(((sy0 - drawStartY) * texH) / denom);
          const srcY1 = Math.floor(((sy1 - drawStartY) * texH) / denom);
          const srcH = srcY1 - srcY0;
          if (srcH <= 0) continue;
          ctx.drawImage(sprite, texX, srcY0, 1, srcH, stripe, sy0, 1, sy1 - sy0);
        }
      }
    }

    if (screenRef.current === "playing") {
      drawGun(ctx, W, H, flashRef.current, bobPhaseRef.current);
      if (damageRef.current > 0) {
        ctx.fillStyle = `rgba(180,20,10,${clamp(damageRef.current * 1.4, 0, 0.45)})`;
        ctx.fillRect(0, 0, W, H);
      }
      if (hitMarkerRef.current > 0) {
        const a = clamp(hitMarkerRef.current * 5, 0, 0.9);
        ctx.strokeStyle = `rgba(255,90,60,${a})`;
        ctx.lineWidth = 2;
        const ccx = W / 2;
        const ccy = H / 2;
        const m = 9;
        ctx.beginPath();
        ctx.moveTo(ccx - m, ccy - m);
        ctx.lineTo(ccx - m + 5, ccy - m + 5);
        ctx.moveTo(ccx + m, ccy - m);
        ctx.lineTo(ccx + m - 5, ccy - m + 5);
        ctx.moveTo(ccx - m, ccy + m);
        ctx.lineTo(ccx - m + 5, ccy + m - 5);
        ctx.moveTo(ccx + m, ccy + m);
        ctx.lineTo(ccx + m - 5, ccy + m - 5);
        ctx.stroke();
      }
      const mmSize = Math.min(132, W * 0.22);
      const cell = mmSize / MAP_W;
      const mmX = W - mmSize - 10;
      const mmY = 10;
      ctx.fillStyle = "rgba(8,6,3,0.72)";
      ctx.fillRect(mmX - 4, mmY - 4, mmSize + 8, mmSize + 8);
      ctx.strokeStyle = "rgba(180,130,70,0.5)";
      ctx.lineWidth = 1;
      ctx.strokeRect(mmX - 4, mmY - 4, mmSize + 8, mmSize + 8);
      for (let y = 0; y < MAP_H; y++) {
        for (let x = 0; x < MAP_W; x++) {
          if (MAP[y][x] === 1) {
            ctx.fillStyle = "#7a5230";
            ctx.fillRect(mmX + x * cell, mmY + y * cell, cell + 0.6, cell + 0.6);
          } else {
            ctx.fillStyle = "rgba(48,34,20,0.55)";
            ctx.fillRect(mmX + x * cell, mmY + y * cell, cell + 0.6, cell + 0.6);
          }
        }
      }
      for (const e of enemies) {
        if (!e.alive && e.deadTimer <= 0) continue;
        ctx.fillStyle = e.alive ? "#e0443a" : "#776655";
        ctx.beginPath();
        ctx.arc(mmX + e.x * cell, mmY + e.y * cell, Math.max(1.6, cell * 0.32), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#5ad6ff";
      ctx.beginPath();
      ctx.arc(mmX + p.x * cell, mmY + p.y * cell, Math.max(2, cell * 0.38), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#5ad6ff";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(mmX + p.x * cell, mmY + p.y * cell);
      ctx.lineTo(
        mmX + (p.x + p.dirX * 0.9) * cell,
        mmY + (p.y + p.dirY * 0.9) * cell,
      );
      ctx.stroke();
    }
  }, []);

  useEffect(() => {
    badgerSpriteRef.current = makeBadgerSprite();
    deadSpriteRef.current = makeDeadSprite();
    const loop = (t: number) => {
      const last = lastTimeRef.current || t;
      let dt = (t - last) / 1000;
      lastTimeRef.current = t;
      if (dt > 0.1) dt = 0.1;
      if (dt < 0) dt = 0;
      update(dt);
      render();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [update, render]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const cv = canvasRef.current;
    if (!wrap || !cv) return;
    const resize = () => {
      const w = Math.max(320, Math.floor(wrap.clientWidth));
      const h = Math.max(240, Math.floor(wrap.clientHeight));
      cv.width = w;
      cv.height = h;
      cv.style.width = w + "px";
      cv.style.height = h + "px";
      zbufRef.current = new Float32Array(w);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === "Space" ||
        e.code === "ControlLeft" ||
        e.code === "ControlRight"
      ) {
        e.preventDefault();
        if (screenRef.current === "playing") shootRef.current = true;
      }
      if (e.code === "Enter") {
        if (screenRef.current === "ready" || screenRef.current === "gameover" || screenRef.current === "win") {
          startGame();
        }
      }
      keysRef.current[e.code] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (lockedRef.current && screenRef.current === "playing") {
        mouseDxRef.current += e.movementX;
      }
    };
    const onLockChange = () => {
      lockedRef.current = document.pointerLockElement === canvasRef.current;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("mousemove", onMouseMove);
    document.addEventListener("pointerlockchange", onLockChange);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("pointerlockchange", onLockChange);
    };
  }, [startGame]);

  useEffect(() => {
    return () => {
      if (document.pointerLockElement) document.exitPointerLock();
    };
  }, []);

  const onCanvasClick = useCallback(() => {
    const cv = canvasRef.current;
    const s = screenRef.current;
    if (s === "ready") {
      startGame();
      return;
    }
    if (s === "gameover" || s === "win") {
      startGame();
      return;
    }
    if (s === "playing") {
      if (cv && document.pointerLockElement !== cv) {
        cv.requestPointerLock?.();
      } else {
        shootRef.current = true;
      }
    }
  }, [startGame]);

  return (
    <div
      ref={wrapRef}
      className="relative w-full h-full overflow-hidden bg-black select-none"
    >
      <canvas
        ref={canvasRef}
        onClick={onCanvasClick}
        className="block w-full h-full"
        style={{ cursor: screen === "playing" ? "crosshair" : "default" }}
      />

      {screen === "playing" && (
        <div className="pointer-events-none absolute inset-0 flex flex-col">
          <div className="flex items-start justify-between p-3 gap-3">
            <div className="flex flex-col gap-2 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2 text-amber-100 text-xs font-mono border border-amber-900/40">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-400 shrink-0" />
                <div className="w-28 h-2.5 bg-black/60 rounded-full overflow-hidden border border-amber-900/60">
                  <div
                    className="h-full transition-all duration-150"
                    style={{
                      width: `${health}%`,
                      background:
                        health > 50
                          ? "linear-gradient(90deg,#ef4444,#f97316)"
                          : "linear-gradient(90deg,#b91c1c,#7f1d1d)",
                    }}
                  />
                </div>
                <span className="tabular-nums w-8 text-right">{health}</span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-300 shrink-0" />
                <span>
                  Счёт:{" "}
                  <span className="text-amber-200 font-bold tabular-nums">{score}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Skull className="w-4 h-4 text-red-300 shrink-0" />
                <span>
                  Барсуков:{" "}
                  <span className="text-red-200 font-bold tabular-nums">{enemiesLeft}</span>
                </span>
              </div>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="relative w-7 h-7">
              <div className="absolute left-1/2 top-0 -translate-x-1/2 w-0.5 h-7 bg-amber-100/70" />
              <div className="absolute top-1/2 left-0 -translate-y-1/2 h-0.5 w-7 bg-amber-100/70" />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-amber-100" />
            </div>
          </div>
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)",
            }}
          />
        </div>
      )}

      {screen === "ready" && (
        <button
          onClick={startGame}
          className="absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-black/90 via-amber-950/75 to-black/90 backdrop-blur-md cursor-pointer text-center px-6"
        >
          <div className="text-amber-300/70 text-[10px] sm:text-xs tracking-[0.45em] mb-3 font-mono">
            BOBEROS PRESENTS
          </div>
          <h1 className="text-5xl sm:text-7xl font-black text-amber-200 tracking-tight drop-shadow-[0_0_28px_rgba(245,158,11,0.5)]">
            Бобр3D
          </h1>
          <div className="mt-3 text-amber-100/70 text-sm font-mono">
            3D-лабиринт · стреляй по барсукам
          </div>
          <div className="mt-8 px-6 py-3 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-100 font-semibold animate-pulse">
            Нажми чтобы начать
          </div>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-amber-200/75 font-mono max-w-lg">
            <div className="px-3 py-2 rounded bg-black/40 border border-amber-900/50">
              <span className="text-amber-300 font-bold">WASD</span> двигаться
            </div>
            <div className="px-3 py-2 rounded bg-black/40 border border-amber-900/50">
              <span className="text-amber-300 font-bold">Мышь</span> поворот
            </div>
            <div className="px-3 py-2 rounded bg-black/40 border border-amber-900/50">
              <span className="text-amber-300 font-bold">Клик / Пробел</span> стрелять
            </div>
          </div>
        </button>
      )}

      {screen === "gameover" && (
        <button
          onClick={startGame}
          className="absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-black/85 backdrop-blur-md cursor-pointer text-center px-6"
        >
          <Skull className="w-16 h-16 text-red-500 mb-4" />
          <h2 className="text-5xl sm:text-6xl font-black text-red-400 tracking-tight">
            Поражение
          </h2>
          <div className="mt-4 text-amber-100 text-lg font-mono">
            Счёт: <span className="text-amber-300 font-bold">{score}</span>
          </div>
          <div className="mt-8 px-6 py-3 rounded-lg bg-red-500/20 border border-red-400/40 text-red-100 font-semibold flex items-center gap-2">
            <RotateCcw className="w-4 h-4" /> Рестарт
          </div>
        </button>
      )}

      {screen === "win" && (
        <button
          onClick={startGame}
          className="absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-amber-700/80 to-black/90 backdrop-blur-md cursor-pointer text-center px-6"
        >
          <Trophy className="w-16 h-16 text-amber-300 mb-4" />
          <h2 className="text-5xl sm:text-6xl font-black text-amber-200 tracking-tight drop-shadow-[0_0_28px_rgba(245,158,11,0.6)]">
            Победа!
          </h2>
          <div className="mt-3 text-amber-100 text-base font-mono">
            Все барсуки побеждены
          </div>
          <div className="mt-4 text-amber-100 text-lg font-mono">
            Счёт: <span className="text-amber-300 font-bold">{score}</span>
          </div>
          <div className="mt-8 px-6 py-3 rounded-lg bg-amber-500/30 border border-amber-300/50 text-amber-50 font-semibold flex items-center gap-2">
            <RotateCcw className="w-4 h-4" /> Заново
          </div>
        </button>
      )}
    </div>
  );
}
