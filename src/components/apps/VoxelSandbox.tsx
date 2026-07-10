"use client";

import { useEffect, useRef, useState } from "react";

type B = number;
const GRASS: B = 1, DIRT: B = 2, WOOD: B = 3, LEAVES: B = 4, STONE: B = 5, SAND: B = 6, WATER: B = 7;

const COL: Record<number, [number, number, number]> = {
  1: [86, 140, 56], 2: [134, 96, 58], 3: [110, 76, 42], 4: [62, 110, 44], 5: [140, 140, 140], 6: [218, 186, 110], 7: [64, 128, 196],
};
const NM: Record<number, string> = { 1: "Трава", 2: "Земля", 3: "Дерево", 4: "Листва", 5: "Камень", 6: "Песок", 7: "Вода" };
const HB: B[] = [GRASS, DIRT, WOOD, LEAVES, STONE, SAND];
const SZ = 20;

function kc(x: number, y: number, z: number) { return x + "," + y + "," + z; }

function gen(): Map<string, B> {
  const m = new Map<string, B>();
  for (let x = 0; x < SZ; x++)
    for (let z = 0; z < SZ; z++) {
      const h = Math.floor(4 + Math.sin(x * 0.3) * 1.5 + Math.cos(z * 0.3) * 1.5 + Math.sin((x + z) * 0.15) * 1);
      for (let y = 0; y <= h; y++) {
        let t = STONE;
        if (y === h) t = GRASS;
        else if (y >= h - 2) t = DIRT;
        m.set(kc(x, y, z), t);
      }
    }
  for (let i = 0; i < 6; i++) {
    const tx = 2 + Math.floor(Math.random() * (SZ - 4));
    const tz = 2 + Math.floor(Math.random() * (SZ - 4));
    let gy = 0;
    for (let y = 20; y >= 0; y--) { if (m.has(kc(tx, y, tz))) { gy = y; break; } }
    for (let dy = 1; dy <= 4; dy++) m.set(kc(tx, gy + dy, tz), WOOD);
    for (let dx = -2; dx <= 2; dx++)
      for (let dz = -2; dz <= 2; dz++)
        for (let dy = 3; dy <= 5; dy++)
          if (Math.abs(dx) + Math.abs(dz) + Math.abs(dy - 4) <= 3) {
            const k = kc(tx + dx, gy + dy, tz + dz);
            if (!m.has(k)) m.set(k, LEAVES);
          }
  }
  return m;
}

interface P { x: number; y: number; z: number; vx: number; vy: number; vz: number; yaw: number; pitch: number; onGround: boolean; flying: boolean; }

export function VoxelSandbox() {
  const cv = useRef<HTMLCanvasElement | null>(null);
  const wr = useRef<HTMLDivElement | null>(null);
  const [st, setSt] = useState<"ready" | "playing" | "paused">("ready");
  const [sel, setSel] = useState(0);
  const stR = useRef(st); const selR = useRef(sel);
  const world = useRef(gen());
  const pR = useRef<P>({ x: 10, y: 8, z: 10, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0, onGround: false, flying: false });
  const keys = useRef<Record<string, boolean>>({});

  useEffect(() => { stR.current = st; }, [st]);
  useEffect(() => { selR.current = sel; }, [sel]);

  useEffect(() => {
    const w = world.current;
    const sx = 10, sz = 10;
    for (let y = 20; y >= 0; y--) { if (w.has(kc(sx, y, sz))) { pR.current.y = y + 1.6; break; } }
  }, []);

  useEffect(() => {
    const canvas = cv.current!, wrap = wr.current!;
    const ctx = canvas.getContext("2d")!;
    let W = 800, H = 600;
    const rz = () => { W = Math.max(320, wrap.clientWidth); H = Math.max(240, wrap.clientHeight); canvas.width = W; canvas.height = H; };
    rz(); const ro = new ResizeObserver(rz); ro.observe(wrap);

    const solid = (x: number, y: number, z: number) => {
      const t = world.current.get(kc(Math.floor(x), Math.floor(y), Math.floor(z)));
      return t !== undefined && t !== WATER;
    };

    const castRay = (ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, maxD: number) => {
      let ix = Math.floor(ox), iy = Math.floor(oy), iz = Math.floor(oz);
      const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1, sz = dz > 0 ? 1 : -1;
      const tdx = dx !== 0 ? Math.abs(1 / dx) : 1e30;
      const tdy = dy !== 0 ? Math.abs(1 / dy) : 1e30;
      const tdz = dz !== 0 ? Math.abs(1 / dz) : 1e30;
      let tmx = dx > 0 ? (ix + 1 - ox) * tdx : (ox - ix) * tdx;
      let tmy = dy > 0 ? (iy + 1 - oy) * tdy : (oy - iy) * tdy;
      let tmz = dz > 0 ? (iz + 1 - oz) * tdz : (oz - iz) * tdz;
      let face = 2, d = 0;
      for (let i = 0; i < 128 && d < maxD; i++) {
        const b = world.current.get(kc(ix, iy, iz));
        if (b !== undefined && b !== WATER) return { ix, iy, iz, face, d, b };
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
      sky.addColorStop(0, "#5ba8e0"); sky.addColorStop(0.6, "#a0d0f0"); sky.addColorStop(1, "#d8e8d0");
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "rgba(255,250,200,0.4)"; ctx.beginPath(); ctx.arc(W * 0.82, H * 0.15, 36, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff8c8"; ctx.beginPath(); ctx.arc(W * 0.82, H * 0.15, 18, 0, Math.PI * 2); ctx.fill();

      const cp = Math.cos(p.pitch), sp = Math.sin(p.pitch);
      const cy = Math.cos(p.yaw), sy = Math.sin(p.yaw);
      const ey = p.y + 0.6;
      const horizon = H / 2 - sp * 120;

      const tgt = castRay(p.x, ey, p.z, -sy * cp, sp, -cy * cp, 5);

      const cw = 2;
      for (let px = 0; px < W; px += cw) {
        const off = (px - W / 2) / (W / 2);
        const dx = -sy * cp + cy * off;
        const dy = sp;
        const dz = -cy * cp - sy * off;
        const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const hit = castRay(p.x, ey, p.z, dx / len, dy / len, dz / len, 32);
        if (hit) {
          const perp = hit.d * Math.cos(off * 0.5);
          const wh = Math.min(H, (H * 0.8) / Math.max(0.1, perp));
          const top = horizon - wh / 2 + (ey - (hit.iy + 0.5)) * (H / Math.max(0.5, perp));
          const bc = COL[hit.b] || [140, 140, 140];
          const sh = Math.max(0.12, 1 - perp / 28);
          let f = 1;
          if (hit.face === 2) f = 1; else if (hit.face === 3) f = 0.45; else f = 0.72;
          ctx.fillStyle = `rgb(${Math.floor(bc[0] * sh * f)},${Math.floor(bc[1] * sh * f)},${Math.floor(bc[2] * sh * f)})`;
          ctx.fillRect(px, top, cw, wh);
          if (tgt && tgt.ix === hit.ix && tgt.iy === hit.iy && tgt.iz === hit.iz) {
            ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 1; ctx.strokeRect(px, top, cw, wh);
          }
        }
      }

      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fillRect(W / 2 - 1, H / 2 - 5, 2, 10);
      ctx.fillRect(W / 2 - 5, H / 2 - 1, 10, 2);
    };

    const update = () => {
      const p = pR.current, k = keys.current;
      const sp = 0.1, cy = Math.cos(p.yaw), sy = Math.sin(p.yaw);
      let mx = 0, mz = 0;
      if (k["w"] || k["arrowup"]) { mx -= sy * sp; mz -= cy * sp; }
      if (k["s"] || k["arrowdown"]) { mx += sy * sp; mz += cy * sp; }
      if (k["a"] || k["arrowleft"]) { mx -= cy * sp; mz += sy * sp; }
      if (k["d"] || k["arrowright"]) { mx += cy * sp; mz -= sy * sp; }
      p.vx = mx; p.vz = mz;
      if (p.flying) { p.vy = 0; if (k[" "]) p.vy = sp; if (k["shift"]) p.vy = -sp; }
      else { p.vy -= 0.02; if (k[" "] && p.onGround) { p.vy = 0.3; p.onGround = false; } }
      const ox = p.x, oy = p.y, oz = p.z;
      p.x += p.vx; if (solid(p.x, p.y + 0.2, p.z) || solid(p.x, p.y + 0.8, p.z)) p.x = ox;
      p.z += p.vz; if (solid(p.x, p.y + 0.2, p.z) || solid(p.x, p.y + 0.8, p.z)) p.z = oz;
      p.y += p.vy; p.onGround = false;
      if (solid(p.x, p.y, p.z)) { if (p.vy <= 0) { p.y = Math.floor(p.y) + 1; p.vy = 0; p.onGround = true; } else { p.y = oy; p.vy = 0; } }
      if (p.y < -5) { p.x = 10; p.y = 8; p.z = 10; p.vy = 0; }
    };

    let raf = 0;
    const loop = () => { if (stR.current === "playing") update(); render(); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);

    let ls = 0;
    const kd = (e: KeyboardEvent) => {
      const c = e.key.toLowerCase(); keys.current[c] = true;
      if (c === "escape") { if (stR.current === "playing") { setSt("paused"); document.exitPointerLock?.(); } else if (stR.current === "paused") { setSt("playing"); canvas.requestPointerLock?.(); } }
      if (c === " " && stR.current === "playing") { const n = Date.now(); if (n - ls < 280) { pR.current.flying = !pR.current.flying; pR.current.vy = 0; } ls = n; }
      if (stR.current === "playing") { const n = parseInt(c); if (n >= 1 && n <= HB.length) setSel(n - 1); }
    };
    const ku = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; };
    const mm = (e: MouseEvent) => { if (stR.current !== "playing" || document.pointerLockElement !== canvas) return; const p = pR.current; p.yaw -= e.movementX * 0.003; p.pitch -= e.movementY * 0.003; p.pitch = Math.max(-1.4, Math.min(1.4, p.pitch)); };
    const md = (e: MouseEvent) => {
      if (stR.current !== "playing") return;
      const p = pR.current; const cp = Math.cos(p.pitch), sp = Math.sin(p.pitch);
      const cy = Math.cos(p.yaw), sy = Math.sin(p.yaw);
      const hit = castRay(p.x, p.y + 0.6, p.z, -sy * cp, sp, -cy * cp, 5);
      if (!hit) return;
      if (e.button === 0) { world.current.delete(kc(hit.ix, hit.iy, hit.iz)); }
      else if (e.button === 2) {
        const o = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]][hit.face];
        const nx = hit.ix + o[0], ny = hit.iy + o[1], nz = hit.iz + o[2];
        if (ny >= 0 && ny < 20) { const np = pR.current; if (Math.floor(np.x) !== nx || Math.floor(np.y + 0.6) !== ny || Math.floor(np.z) !== nz) world.current.set(kc(nx, ny, nz), HB[selR.current]); }
      }
    };
    const ctx2 = (e: Event) => e.preventDefault();
    window.addEventListener("keydown", kd); window.addEventListener("keyup", ku);
    document.addEventListener("mousemove", mm); canvas.addEventListener("mousedown", md); canvas.addEventListener("contextmenu", ctx2);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); document.removeEventListener("mousemove", mm); canvas.removeEventListener("mousedown", md); canvas.removeEventListener("contextmenu", ctx2); };
  }, []);

  const start = () => { setSt("playing"); setTimeout(() => cv.current?.requestPointerLock?.(), 100); };
  const resume = () => { setSt("playing"); setTimeout(() => cv.current?.requestPointerLock?.(), 100); };

  return (
    <div ref={wr} className="relative h-full w-full overflow-hidden bg-sky-300">
      <canvas ref={cv} className="absolute inset-0 block h-full w-full" />
      {st === "ready" && (
        <button onClick={start} className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center bg-black/60 text-white">
          <h1 className="text-5xl font-black text-emerald-400" style={{ textShadow: "0 0 20px rgba(74,222,128,0.5)" }}>БобрКрафт</h1>
          <p className="mt-4 max-w-md text-center text-sm text-white/80">3D-песочница. Строй и ломай блоки.<br/>WASD — движение · Мышь — осмотр · ЛКМ — ломать · ПКМ — ставить<br/>1-6 — выбор блока · Space — прыжок · Space×2 — полёт · Shift — вниз<br/>Esc — пауза</p>
          <p className="mt-6 animate-pulse text-lg font-bold text-emerald-300">Нажми, чтобы начать</p>
        </button>
      )}
      {st === "paused" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white">
          <h2 className="text-3xl font-bold">Пауза</h2>
          <button onClick={resume} className="mt-4 rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-bold hover:bg-emerald-600">Продолжить</button>
          <button onClick={() => setSt("ready")} className="mt-2 rounded-xl bg-white/10 px-6 py-2 text-sm hover:bg-white/20">Выйти в меню</button>
        </div>
      )}
      {st === "playing" && (
        <>
          <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1 rounded-xl bg-black/40 p-1.5 backdrop-blur">
            {HB.map((b, i) => (
              <div key={i} className={`grid h-10 w-10 place-items-center rounded-lg border-2 text-xs font-bold ${sel === i ? "border-white scale-110" : "border-white/20"}`} style={{ backgroundColor: `rgb(${COL[b][0]},${COL[b][1]},${COL[b][2]})` }}>
                <span className="text-white drop-shadow" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}>{i + 1}</span>
              </div>
            ))}
          </div>
          <div className="pointer-events-none absolute left-2 top-2 rounded-lg bg-black/40 px-2 py-1 text-[11px] text-white backdrop-blur">Блок: {NM[HB[sel]]}</div>
        </>
      )}
    </div>
  );
}
