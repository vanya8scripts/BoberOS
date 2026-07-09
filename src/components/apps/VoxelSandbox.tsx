"use client";

import { useEffect, useRef, useState } from "react";

type BlockType = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
const AIR: BlockType = 0;
const GRASS: BlockType = 1;
const DIRT: BlockType = 2;
const WOOD: BlockType = 3;
const LEAVES: BlockType = 4;
const STONE: BlockType = 5;
const SAND: BlockType = 6;
const WATER: BlockType = 7;

const BLOCK_COLORS: Record<number, string> = {
  1: "#4a7a3a", 2: "#7a5a3a", 3: "#6a4a2a", 4: "#3a6a2a", 5: "#888888", 6: "#d4b46a", 7: "#4a8aca",
};
const BLOCK_NAMES: Record<number, string> = {
  1: "Трава", 2: "Земля", 3: "Дерево", 4: "Листва", 5: "Камень", 6: "Песок", 7: "Вода",
};
const HOTBAR: BlockType[] = [GRASS, DIRT, WOOD, LEAVES, STONE, SAND, WATER];

const WORLD_W = 24;
const WORLD_D = 24;
const WORLD_H = 16;

function key(x: number, y: number, z: number): string {
  return x + "," + y + "," + z;
}

function generateWorld(): Map<string, BlockType> {
  const m = new Map<string, BlockType>();
  for (let x = 0; x < WORLD_W; x++) {
    for (let z = 0; z < WORLD_D; z++) {
      const h = Math.floor(4 + Math.sin(x * 0.4) * 1.5 + Math.cos(z * 0.4) * 1.5);
      const distC = Math.hypot(x - WORLD_W / 2, z - WORLD_D / 2);
      const water = distC < 3;
      for (let y = 0; y <= h; y++) {
        let t: BlockType = STONE;
        if (y === h) t = water ? SAND : GRASS;
        else if (y >= h - 2) t = water ? SAND : DIRT;
        else t = STONE;
        m.set(key(x, y, z), t);
      }
      if (water) {
        m.set(key(x, h + 1, z), WATER);
        m.set(key(x, h + 2, z), WATER);
      }
    }
  }
  for (let i = 0; i < 5; i++) {
    const tx = 3 + Math.floor(Math.random() * (WORLD_W - 6));
    const tz = 3 + Math.floor(Math.random() * (WORLD_D - 6));
    let groundY = 0;
    for (let y = WORLD_H; y >= 0; y--) {
      if (m.get(key(tx, y, tz)) && m.get(key(tx, y, tz)) !== WATER) { groundY = y; break; }
    }
    if (m.get(key(tx, groundY, tz)) === WATER) continue;
    for (let dy = 1; dy <= 4; dy++) m.set(key(tx, groundY + dy, tz), WOOD);
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        for (let dy = 3; dy <= 5; dy++) {
          if (Math.abs(dx) + Math.abs(dz) + Math.abs(dy - 4) <= 3) {
            const k = key(tx + dx, groundY + dy, tz + dz);
            if (!m.has(k)) m.set(k, LEAVES);
          }
        }
      }
    }
  }
  return m;
}

interface Player {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  yaw: number; pitch: number;
  onGround: boolean; flying: boolean;
}

export function VoxelSandbox() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<"ready" | "playing" | "paused">("ready");
  const [selected, setSelected] = useState(0);
  const stateRef = useRef(state);
  const selectedRef = useRef(selected);
  const worldRef = useRef<Map<string, BlockType>>(generateWorld());
  const playerRef = useRef<Player>({
    x: WORLD_W / 2, y: 12, z: WORLD_D / 2, vx: 0, vy: 0, vz: 0,
    yaw: 0, pitch: 0, onGround: false, flying: false,
  });
  const keysRef = useRef<Record<string, boolean>>({});
  const [hoverInfo, setHoverInfo] = useState("");

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { selectedRef.current = selected; }, [selected]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = wrap.clientWidth || 800;
    let h = wrap.clientHeight || 600;
    const resize = () => {
      w = Math.max(320, wrap.clientWidth || 800);
      h = Math.max(240, wrap.clientHeight || 600);
      canvas.width = w; canvas.height = h;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const isSolid = (x: number, y: number, z: number): boolean => {
      const t = worldRef.current.get(key(Math.floor(x), Math.floor(y), Math.floor(z)));
      return t !== undefined && t !== AIR && t !== WATER;
    };
    const getBlock = (x: number, y: number, z: number): BlockType | undefined => {
      return worldRef.current.get(key(Math.floor(x), Math.floor(y), Math.floor(z)));
    };

    const castRay = (origin: { x: number; y: number; z: number }, dir: { x: number; y: number; z: number }, maxDist: number) => {
      let x = Math.floor(origin.x), y = Math.floor(origin.y), z = Math.floor(origin.z);
      const stepX = Math.sign(dir.x), stepY = Math.sign(dir.y), stepZ = Math.sign(dir.z);
      const tDX = stepX !== 0 ? Math.abs(1 / dir.x) : Infinity;
      const tDY = stepY !== 0 ? Math.abs(1 / dir.y) : Infinity;
      const tDZ = stepZ !== 0 ? Math.abs(1 / dir.z) : Infinity;
      let tMX = stepX > 0 ? (x + 1 - origin.x) * tDX : (origin.x - x) * tDX;
      let tMY = stepY > 0 ? (y + 1 - origin.y) * tDY : (origin.y - y) * tDY;
      let tMZ = stepZ > 0 ? (z + 1 - origin.z) * tDZ : (origin.z - z) * tDZ;
      let face: "px" | "nx" | "py" | "ny" | "pz" | "nz" = "py";
      let dist = 0;
      for (let i = 0; i < 80 && dist < maxDist; i++) {
        const b = getBlock(x, y, z);
        if (b !== undefined && b !== AIR && b !== WATER) {
          return { x, y, z, face, dist };
        }
        if (tMX < tMY && tMX < tMZ) { x += stepX; dist = tMX; tMX += tDX; face = stepX > 0 ? "nx" : "px"; }
        else if (tMY < tMZ) { y += stepY; dist = tMY; tMY += tDY; face = stepY > 0 ? "ny" : "py"; }
        else { z += stepZ; dist = tMZ; tMZ += tDZ; face = stepZ > 0 ? "nz" : "pz"; }
      }
      return null;
    };

    const render = () => {
      const p = playerRef.current;
      const world = worldRef.current;
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#87ceeb");
      sky.addColorStop(0.6, "#b8d8e8");
      sky.addColorStop(1, "#e8e8d0");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);
      const sunX = w * 0.85, sunY = h * 0.15;
      ctx.fillStyle = "rgba(255,250,200,0.5)";
      ctx.beginPath(); ctx.arc(sunX, sunY, 40, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff8d0";
      ctx.beginPath(); ctx.arc(sunX, sunY, 22, 0, Math.PI * 2); ctx.fill();

      const fov = Math.tan(Math.PI / 4);
      const cosP = Math.cos(p.pitch), sinP = Math.sin(p.pitch);
      const cosY = Math.cos(p.yaw), sinY = Math.sin(p.yaw);
      const eyeY = p.y + 0.7;

      const target = castRay(
        { x: p.x, y: eyeY, z: p.z },
        { x: -sinY * cosP, y: sinP, z: -cosY * cosP },
        6
      );

      const colW = 2;
      for (let px = 0; px < w; px += colW) {
        const camX = (px / w - 0.5) * 2 * fov;
        const dirX = -sinY * cosP - cosY * camX;
        const dirY = sinP - 0;
        const dirZ = -cosY * cosP + sinY * camX;
        const len = Math.hypot(dirX, dirY, dirZ) || 1;
        const dx = dirX / len, dy = dirY / len, dz = dirZ / len;
        const hit = castRay({ x: p.x, y: eyeY, z: p.z }, { x: dx, y: dy, z: dz }, 40);
        const horizon = h / 2 + p.pitch * h * 0.3;
        if (hit) {
          const perp = hit.dist;
          const wallH = Math.min(h, h / perp);
          const wallTop = horizon - wallH / 2 + (eyeY - (hit.y + 0.5)) * (h / perp);
          const shade = Math.max(0.2, 1 - perp / 30);
          let baseColor = BLOCK_COLORS[world.get(key(hit.x, hit.y, hit.z)) || 0] || "#888";
          if (hit.face === "py") baseColor = baseColor;
          else if (hit.face === "ny") baseColor = shadeColor(baseColor, 0.6);
          else if (hit.face === "px" || hit.face === "nx") baseColor = shadeColor(baseColor, 0.8);
          else baseColor = shadeColor(baseColor, 0.7);
          ctx.fillStyle = shadeColor(baseColor, shade);
          ctx.fillRect(px, wallTop, colW, wallH);
          const block = world.get(key(hit.x, hit.y, hit.z));
          if (block === WOOD) {
            ctx.fillStyle = "rgba(0,0,0,0.2)";
            ctx.fillRect(px, wallTop + wallH * 0.3, colW, 1);
            ctx.fillRect(px, wallTop + wallH * 0.6, colW, 1);
          } else if (block === GRASS) {
            ctx.fillStyle = shadeColor("#5a9a4a", shade);
            ctx.fillRect(px, wallTop, colW, Math.max(2, wallH * 0.12));
          } else if (block === STONE) {
            ctx.fillStyle = "rgba(0,0,0,0.15)";
            if ((hit.x + hit.y + hit.z) % 2 === 0) ctx.fillRect(px, wallTop, colW, wallH);
          }
          if (target && target.x === hit.x && target.y === hit.y && target.z === hit.z) {
            ctx.strokeStyle = "rgba(255,255,255,0.8)";
            ctx.lineWidth = 1;
            ctx.strokeRect(px, wallTop, colW, wallH);
          }
        } else {
          ctx.fillStyle = "#87ceeb";
          ctx.fillRect(px, 0, colW, h);
        }
      }

      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(w / 2 - 6, h / 2); ctx.lineTo(w / 2 + 6, h / 2);
      ctx.moveTo(w / 2, h / 2 - 6); ctx.lineTo(w / 2, h / 2 + 6);
      ctx.stroke();

      ctx.fillStyle = "rgba(139,90,43,0.9)";
      ctx.fillRect(w / 2 - 4, h - 50, 8, 30);
      ctx.fillRect(w / 2 - 14, h - 25, 28, 8);
    };

    const update = () => {
      const p = playerRef.current;
      const keys = keysRef.current;
      const speed = 0.12;
      const cosY = Math.cos(p.yaw), sinY = Math.sin(p.yaw);
      let mx = 0, mz = 0;
      if (keys["w"] || keys["arrowup"]) { mx -= sinY * speed; mz -= cosY * speed; }
      if (keys["s"] || keys["arrowdown"]) { mx += sinY * speed; mz += cosY * speed; }
      if (keys["a"] || keys["arrowleft"]) { mx -= cosY * speed; mz += sinY * speed; }
      if (keys["d"] || keys["arrowright"]) { mx += cosY * speed; mz -= sinY * speed; }
      p.vx = mx; p.vz = mz;
      if (p.flying) {
        p.vy = 0;
        if (keys[" "]) p.vy = speed;
        if (keys["shift"]) p.vy = -speed;
      } else {
        p.vy -= 0.018;
        if (keys[" "] && p.onGround) { p.vy = 0.28; p.onGround = false; }
      }
      const oldX = p.x, oldY = p.y, oldZ = p.z;
      p.x += p.vx;
      if (isSolid(p.x, p.y + 0.1, p.z) || isSolid(p.x, p.y + 0.9, p.z)) p.x = oldX;
      p.z += p.vz;
      if (isSolid(p.x, p.y + 0.1, p.z) || isSolid(p.x, p.y + 0.9, p.z)) p.z = oldZ;
      p.y += p.vy;
      p.onGround = false;
      if (isSolid(p.x, p.y, p.z) || isSolid(p.x + 0.3, p.y, p.z) || isSolid(p.x - 0.3, p.y, p.z)) {
        if (p.vy <= 0) { p.y = Math.floor(p.y) + 1; p.vy = 0; p.onGround = true; }
        else { p.y = oldY; p.vy = 0; }
      }
      if (p.y < -10) { p.x = WORLD_W / 2; p.y = 12; p.z = WORLD_D / 2; p.vy = 0; }
    };

    let raf = 0;
    const loop = () => {
      if (stateRef.current === "playing") update();
      render();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keysRef.current[k] = true;
      if (k === "escape") {
        if (stateRef.current === "playing") { setState("paused"); document.exitPointerLock?.(); }
        else if (stateRef.current === "paused") { setState("playing"); canvas.requestPointerLock?.(); }
      }
      if (k === " " && stateRef.current === "playing") {
        const now = Date.now();
        if (now - lastSpace < 300 && !playerRef.current.flying) { playerRef.current.flying = true; playerRef.current.vy = 0; }
        lastSpace = now;
      }
      if (stateRef.current === "playing") {
        const num = parseInt(k);
        if (num >= 1 && num <= HOTBAR.length) setSelected(num - 1);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => { keysRef.current[e.key.toLowerCase()] = false; };
    let lastSpace = 0;

    const onMouseMove = (e: MouseEvent) => {
      if (stateRef.current !== "playing" || document.pointerLockElement !== canvas) return;
      const p = playerRef.current;
      p.yaw -= e.movementX * 0.0025;
      p.pitch -= e.movementY * 0.0025;
      p.pitch = Math.max(-1.4, Math.min(1.4, p.pitch));
    };

    const onMouseDown = (e: MouseEvent) => {
      if (stateRef.current !== "playing") return;
      const p = playerRef.current;
      const eyeY = p.y + 0.7;
      const cosP = Math.cos(p.pitch), sinP = Math.sin(p.pitch);
      const cosY = Math.cos(p.yaw), sinY = Math.sin(p.yaw);
      const dir = { x: -sinY * cosP, y: sinP, z: -cosY * cosP };
      const hit = castRay({ x: p.x, y: eyeY, z: p.z }, dir, 6);
      if (!hit) return;
      if (e.button === 0) {
        worldRef.current.delete(key(hit.x, hit.y, hit.z));
        setHoverInfo("Сломан: " + (BLOCK_NAMES[worldRef.current.get(key(hit.x, hit.y, hit.z)) || 0] || "блок"));
      } else if (e.button === 2) {
        const off = { px: [1, 0, 0], nx: [-1, 0, 0], py: [0, 1, 0], ny: [0, -1, 0], pz: [0, 0, 1], nz: [0, 0, -1] }[hit.face];
        const nx = hit.x + off[0], ny = hit.y + off[1], nz = hit.z + off[2];
        if (ny >= 0 && ny < WORLD_H) {
          const np = playerRef.current;
          if (Math.floor(np.x) !== nx || Math.floor(np.y) !== ny || Math.floor(np.z) !== nz) {
            worldRef.current.set(key(nx, ny, nz), HOTBAR[selectedRef.current]);
          }
        }
      }
    };

    const onContext = (e: Event) => e.preventDefault();

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    document.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("contextmenu", onContext);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("contextmenu", onContext);
    };
  }, []);

  const start = () => {
    setState("playing");
    setTimeout(() => canvasRef.current?.requestPointerLock?.(), 100);
  };
  const resume = () => {
    setState("playing");
    setTimeout(() => canvasRef.current?.requestPointerLock?.(), 100);
  };

  return (
    <div ref={wrapRef} className="relative h-full w-full overflow-hidden bg-sky-300">
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />

      {state === "ready" && (
        <button onClick={start} className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center bg-black/60 text-white">
          <h1 className="text-5xl font-black text-emerald-400" style={{ textShadow: "0 0 20px rgba(74,222,128,0.5)" }}>БобрКрафт</h1>
          <p className="mt-4 max-w-md text-center text-sm text-white/80">
            3D-песочница. Строй и ломай блоки.<br/>
            WASD — движение · Мышь — осмотр · ЛКМ — ломать · ПКМ — ставить<br/>
            1-7 — выбор блока · Space — прыжок · Space×2 — полёт · Shift — вниз/красться<br/>
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
              <div
                key={i}
                className={`grid h-10 w-10 place-items-center rounded-lg border-2 text-xs font-bold ${selected === i ? "border-white scale-110" : "border-white/20"}`}
                style={{ backgroundColor: BLOCK_COLORS[b] }}
              >
                <span className="text-white drop-shadow" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}>{i + 1}</span>
              </div>
            ))}
          </div>
          <div className="pointer-events-none absolute left-2 top-2 rounded-lg bg-black/40 px-2 py-1 text-[11px] text-white backdrop-blur">
            Блок: {BLOCK_NAMES[HOTBAR[selected]]}
          </div>
        </>
      )}
    </div>
  );
}

function shadeColor(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const nr = Math.round(r * factor);
  const ng = Math.round(g * factor);
  const nb = Math.round(b * factor);
  return "#" + [nr, ng, nb].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0")).join("");
}
