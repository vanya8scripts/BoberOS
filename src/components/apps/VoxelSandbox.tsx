"use client";

import { useEffect, useRef, useState } from "react";

type B = number;
const AIR: B = 0;
const GRASS: B = 1;
const DIRT: B = 2;
const WOOD: B = 3;
const LEAVES: B = 4;
const STONE: B = 5;
const SAND: B = 6;
const WATER: B = 7;

const COLORS: Record<number, [number, number, number]> = {
  1: [74, 122, 58],
  2: [122, 90, 58],
  3: [106, 74, 42],
  4: [58, 106, 42],
  5: [136, 136, 136],
  6: [212, 180, 106],
  7: [74, 138, 202],
};

const NAMES: Record<number, string> = {
  1: "Трава", 2: "Земля", 3: "Дерево", 4: "Листва", 5: "Камень", 6: "Песок", 7: "Вода",
};

const HOTBAR: B[] = [GRASS, DIRT, WOOD, LEAVES, STONE, SAND];

const WS = 16;
const WD = 16;
const WH = 12;

function keyc(x: number, y: number, z: number): string {
  return x + "," + y + "," + z;
}

function genWorld(): Map<string, B> {
  const m = new Map<string, B>();
  for (let x = 0; x < WS; x++) {
    for (let z = 0; z < WD; z++) {
      const h = Math.floor(3 + Math.sin(x * 0.5) * 1.2 + Math.cos(z * 0.5) * 1.2);
      for (let y = 0; y <= h; y++) {
        let t: B = STONE;
        if (y === h) t = GRASS;
        else if (y >= h - 2) t = DIRT;
        m.set(keyc(x, y, z), t);
      }
    }
  }
  for (let i = 0; i < 4; i++) {
    const tx = 2 + Math.floor(Math.random() * (WS - 4));
    const tz = 2 + Math.floor(Math.random() * (WD - 4));
    let gy = 0;
    for (let y = WH; y >= 0; y--) {
      if (m.has(keyc(tx, y, tz))) { gy = y; break; }
    }
    for (let dy = 1; dy <= 3; dy++) m.set(keyc(tx, gy + dy, tz), WOOD);
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        for (let dy = 2; dy <= 4; dy++) {
          if (Math.abs(dx) + Math.abs(dz) + Math.abs(dy - 3) <= 3) {
            const k = keyc(tx + dx, gy + dy, tz + dz);
            if (!m.has(k)) m.set(k, LEAVES);
          }
        }
      }
    }
  }
  return m;
}

interface P {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  yaw: number; pitch: number;
  onGround: boolean; flying: boolean;
}

export function VoxelSandbox() {
  const cv = useRef<HTMLCanvasElement | null>(null);
  const wr = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<"ready" | "playing" | "paused">("ready");
  const [sel, setSel] = useState(0);
  const stR = useRef(state);
  const selR = useRef(sel);
  const world = useRef<Map<string, B>>(genWorld());
  const pR = useRef<P>({ x: WS / 2, y: 6, z: WD / 2, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0, onGround: false, flying: false });
  const keys = useRef<Record<string, boolean>>({});

  useEffect(() => {
    const w = world.current;
    const sx = Math.floor(WS / 2), sz = Math.floor(WD / 2);
    let groundY = 1;
    for (let y = WH; y >= 0; y--) {
      if (w.has(keyc(sx, y, sz))) { groundY = y + 1; break; }
    }
    pR.current.y = groundY + 0.5;
  }, []);

  useEffect(() => { stR.current = state; }, [state]);
  useEffect(() => { selR.current = sel; }, [sel]);

  useEffect(() => {
    const canvas = cv.current;
    const wrap = wr.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let W = wrap.clientWidth || 800;
    let H = wrap.clientHeight || 600;
    const resize = () => {
      W = Math.max(320, wrap.clientWidth || 800);
      H = Math.max(240, wrap.clientHeight || 600);
      canvas.width = W;
      canvas.height = H;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const solid = (x: number, y: number, z: number): boolean => {
      const t = world.current.get(keyc(Math.floor(x), Math.floor(y), Math.floor(z)));
      return t !== undefined && t !== AIR && t !== WATER;
    };
    const getB = (x: number, y: number, z: number): B | undefined =>
      world.current.get(keyc(Math.floor(x), Math.floor(y), Math.floor(z)));

    const castRay = (ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, maxD: number) => {
      let ix = Math.floor(ox), iy = Math.floor(oy), iz = Math.floor(oz);
      const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1, sz = dz > 0 ? 1 : -1;
      const tdx = dx !== 0 ? Math.abs(1 / dx) : 1e30;
      const tdy = dy !== 0 ? Math.abs(1 / dy) : 1e30;
      const tdz = dz !== 0 ? Math.abs(1 / dz) : 1e30;
      let tmx = dx > 0 ? (ix + 1 - ox) * tdx : (ox - ix) * tdx;
      let tmy = dy > 0 ? (iy + 1 - oy) * tdy : (oy - iy) * tdy;
      let tmz = dz > 0 ? (iz + 1 - oz) * tdz : (oz - iz) * tdz;
      let face = 0;
      let d = 0;
      for (let i = 0; i < 100 && d < maxD; i++) {
        const b = getB(ix, iy, iz);
        if (b !== undefined && b !== AIR && b !== WATER) return { ix, iy, iz, face, d };
        if (tmx < tmy && tmx < tmz) { ix += sx; d = tmx; tmx += tdx; face = sx > 0 ? 0 : 1; }
        else if (tmy < tmz) { iy += sy; d = tmy; tmy += tdy; face = sy > 0 ? 2 : 3; }
        else { iz += sz; d = tmz; tmz += tdz; face = sz > 0 ? 4 : 5; }
      }
      return null;
    };

    const render = () => {
      const p = pR.current;
      const w = world.current;
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#7ec0ee");
      sky.addColorStop(0.5, "#a8d8f0");
      sky.addColorStop(1, "#d8e8d0");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "rgba(255,250,200,0.4)";
      ctx.beginPath(); ctx.arc(W * 0.85, H * 0.15, 38, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff8c8";
      ctx.beginPath(); ctx.arc(W * 0.85, H * 0.15, 20, 0, Math.PI * 2); ctx.fill();

      const fov = 1.0;
      const cp = Math.cos(p.pitch), sp = Math.sin(p.pitch);
      const cy = Math.cos(p.yaw), sy = Math.sin(p.yaw);
      const eyeY = p.y + 0.7;

      const fwd = { x: -sy * cp, y: sp, z: -cy * cp };
      const target = castRay(p.x, eyeY, p.z, fwd.x, fwd.y, fwd.z, 5);

      const right = { x: cy, y: 0, z: -sy };
      const up = { x: sy * sp, y: cp, z: cy * sp };

      const colW = 3;
      for (let px = 0; px < W; px += colW) {
        const sx = (px / W - 0.5) * 2 * fov;
        const dx = fwd.x + right.x * sx;
        const dy = fwd.y + right.y * sx;
        const dz = fwd.z + right.z * sx;
        const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
        const ndx = dx / len, ndy = dy / len, ndz = dz / len;
        const hit = castRay(p.x, eyeY, p.z, ndx, ndy, ndz, 30);
        const horizon = H / 2 - sp * H * 0.4;
        if (hit) {
          const perp = hit.d;
          const wh2 = Math.min(H * 2, H / perp);
          const top = horizon - wh2 / 2 + (eyeY - (hit.iy + 0.5)) * (H / perp);
          const baseColor = COLORS[w.get(keyc(hit.ix, hit.iy, hit.iz)) || 0] || [136, 136, 136];
          const shade = Math.max(0.15, 1 - perp / 25);
          let f = 1;
          if (hit.face === 2) f = 1.0;
          else if (hit.face === 3) f = 0.5;
          else if (hit.face === 0 || hit.face === 1) f = 0.75;
          else f = 0.85;
          const r = Math.floor(baseColor[0] * shade * f);
          const g = Math.floor(baseColor[1] * shade * f);
          const b = Math.floor(baseColor[2] * shade * f);
          ctx.fillStyle = `rgb(${r},${g},${b})`;
          ctx.fillRect(px, top, colW, wh2);
          if (target && target.ix === hit.ix && target.iy === hit.iy && target.iz === hit.iz) {
            ctx.strokeStyle = "rgba(255,255,255,0.9)";
            ctx.lineWidth = 1;
            ctx.strokeRect(px, top, colW, wh2);
          }
        }
      }

      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fillRect(W / 2 - 1, H / 2 - 6, 2, 12);
      ctx.fillRect(W / 2 - 6, H / 2 - 1, 12, 2);
    };

    const update = () => {
      const p = pR.current;
      const k = keys.current;
      const sp = 0.1;
      const cy = Math.cos(p.yaw), sy = Math.sin(p.yaw);
      let mx = 0, mz = 0;
      if (k["w"] || k["arrowup"]) { mx -= sy * sp; mz -= cy * sp; }
      if (k["s"] || k["arrowdown"]) { mx += sy * sp; mz += cy * sp; }
      if (k["a"] || k["arrowleft"]) { mx -= cy * sp; mz += sy * sp; }
      if (k["d"] || k["arrowright"]) { mx += cy * sp; mz -= sy * sp; }
      p.vx = mx;
      p.vz = mz;
      if (p.flying) {
        p.vy = 0;
        if (k[" "]) p.vy = sp;
        if (k["shift"]) p.vy = -sp;
      } else {
        p.vy -= 0.02;
        if (k[" "] && p.onGround) { p.vy = 0.3; p.onGround = false; }
      }
      const ox = p.x, oy = p.y, oz = p.z;
      p.x += p.vx;
      if (solid(p.x, p.y + 0.2, p.z) || solid(p.x, p.y + 0.8, p.z)) p.x = ox;
      p.z += p.vz;
      if (solid(p.x, p.y + 0.2, p.z) || solid(p.x, p.y + 0.8, p.z)) p.z = oz;
      p.y += p.vy;
      p.onGround = false;
      if (solid(p.x, p.y, p.z)) {
        if (p.vy <= 0) { p.y = Math.floor(p.y) + 1; p.vy = 0; p.onGround = true; }
        else { p.y = oy; p.vy = 0; }
      }
      if (p.y < -5) { p.x = WS / 2; p.y = 8; p.z = WD / 2; p.vy = 0; }
    };

    let raf = 0;
    const loop = () => {
      if (stR.current === "playing") update();
      render();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    let lastSpace = 0;
    const onKey = (e: KeyboardEvent) => {
      const c = e.key.toLowerCase();
      keys.current[c] = true;
      if (c === "escape") {
        if (stR.current === "playing") { setState("paused"); document.exitPointerLock?.(); }
        else if (stR.current === "paused") { setState("playing"); canvas.requestPointerLock?.(); }
      }
      if (c === " " && stR.current === "playing") {
        const now = Date.now();
        if (now - lastSpace < 280) { pR.current.flying = !pR.current.flying; pR.current.vy = 0; }
        lastSpace = now;
      }
      if (stR.current === "playing") {
        const n = parseInt(c);
        if (n >= 1 && n <= HOTBAR.length) setSel(n - 1);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; };
    const onMove = (e: MouseEvent) => {
      if (stR.current !== "playing" || document.pointerLockElement !== canvas) return;
      const p = pR.current;
      p.yaw -= e.movementX * 0.003;
      p.pitch -= e.movementY * 0.003;
      p.pitch = Math.max(-1.4, Math.min(1.4, p.pitch));
    };
    const onDown = (e: MouseEvent) => {
      if (stR.current !== "playing") return;
      const p = pR.current;
      const cp = Math.cos(p.pitch), sp = Math.sin(p.pitch);
      const cy = Math.cos(p.yaw), sy = Math.sin(p.yaw);
      const dx = -sy * cp, dy = sp, dz = -cy * cp;
      const hit = castRay(p.x, p.y + 0.7, p.z, dx, dy, dz, 5);
      if (!hit) return;
      if (e.button === 0) {
        world.current.delete(keyc(hit.ix, hit.iy, hit.iz));
      } else if (e.button === 2) {
        const offs = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
        const o = offs[hit.face];
        const nx = hit.ix + o[0], ny = hit.iy + o[1], nz = hit.iz + o[2];
        if (ny >= 0 && ny < WH) {
          const np = pR.current;
          if (Math.floor(np.x) !== nx || Math.floor(np.y + 0.7) !== ny || Math.floor(np.z) !== nz) {
            world.current.set(keyc(nx, ny, nz), HOTBAR[selR.current]);
          }
        }
      }
    };
    const onCtx = (e: Event) => e.preventDefault();

    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    document.addEventListener("mousemove", onMove);
    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("contextmenu", onCtx);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mousedown", onDown);
      canvas.removeEventListener("contextmenu", onCtx);
    };
  }, []);

  const start = () => { setState("playing"); setTimeout(() => cv.current?.requestPointerLock?.(), 100); };
  const resume = () => { setState("playing"); setTimeout(() => cv.current?.requestPointerLock?.(), 100); };

  return (
    <div ref={wr} className="relative h-full w-full overflow-hidden bg-sky-300">
      <canvas ref={cv} className="absolute inset-0 block h-full w-full" />

      {state === "ready" && (
        <button onClick={start} className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center bg-black/60 text-white">
          <h1 className="text-5xl font-black text-emerald-400" style={{ textShadow: "0 0 20px rgba(74,222,128,0.5)" }}>БобрКрафт</h1>
          <p className="mt-4 max-w-md text-center text-sm text-white/80">
            3D-песочница. Строй и ломай блоки.<br/>
            WASD — движение · Мышь — осмотр · ЛКМ — ломать · ПКМ — ставить<br/>
            1-6 — выбор блока · Space — прыжок · Space×2 — полёт · Shift — вниз<br/>
            Esc — пауза
          </p>
          <p className="mt-6 animate-pulse text-lg font-bold text-emerald-300">Нажми, чтобы начать</p>
        </button>
      )}

      {state === "paused" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white">
          <h2 className="text-3xl font-bold">Пауза</h2>
          <button onClick={resume} className="mt-4 rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-bold hover:bg-emerald-600">Продолжить</button>
          <button onClick={() => setState("ready")} className="mt-2 rounded-xl bg-white/10 px-6 py-2 text-sm hover:bg-white/20">Выйти в меню</button>
        </div>
      )}

      {state === "playing" && (
        <>
          <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1 rounded-xl bg-black/40 p-1.5 backdrop-blur">
            {HOTBAR.map((b, i) => (
              <div key={i} className={`grid h-10 w-10 place-items-center rounded-lg border-2 text-xs font-bold ${sel === i ? "border-white scale-110" : "border-white/20"}`} style={{ backgroundColor: `rgb(${COLORS[b][0]},${COLORS[b][1]},${COLORS[b][2]})` }}>
                <span className="text-white drop-shadow" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}>{i + 1}</span>
              </div>
            ))}
          </div>
          <div className="pointer-events-none absolute left-2 top-2 rounded-lg bg-black/40 px-2 py-1 text-[11px] text-white backdrop-blur">
            Блок: {NAMES[HOTBAR[sel]]}
          </div>
        </>
      )}
    </div>
  );
}
