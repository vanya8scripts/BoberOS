"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowBigDown,
  ArrowLeftRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
} from "lucide-react";

type Cell = number;
type Board = Cell[][];
type Matrix = number[][];
type GameState = "ready" | "playing" | "paused" | "gameover";
interface Piece {
  type: number;
  matrix: Matrix;
  x: number;
  y: number;
}

const COLS = 10;
const ROWS = 20;

const SHAPES: Matrix[] = [
  [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
  [[2, 2], [2, 2]],
  [[0, 3, 0], [3, 3, 3], [0, 0, 0]],
  [[0, 4, 4], [4, 4, 0], [0, 0, 0]],
  [[5, 5, 0], [0, 5, 5], [0, 0, 0]],
  [[6, 0, 0], [6, 6, 6], [0, 0, 0]],
  [[0, 0, 7], [7, 7, 7], [0, 0, 0]],
];

const WOOD: Record<number, { base: string; light: string; dark: string; ring: string }> = {
  1: { base: "#f59e0b", light: "#fcd34d", dark: "#92400e", ring: "#78350f" },
  2: { base: "#d97706", light: "#fbbf24", dark: "#7c2d12", ring: "#451a03" },
  3: { base: "#b45309", light: "#d97706", dark: "#78350f", ring: "#451a03" },
  4: { base: "#a16207", light: "#ca8a04", dark: "#713f12", ring: "#422006" },
  5: { base: "#9a3412", light: "#c2410c", dark: "#7c2d12", ring: "#431407" },
  6: { base: "#92400e", light: "#b45309", dark: "#451a03", ring: "#1c0701" },
  7: { base: "#c2410c", light: "#ea580c", dark: "#7c2d12", ring: "#431407" },
};

const LINE_SCORES = [0, 100, 300, 500, 800];

function createBoard(): Board {
  return Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(0));
}
function cloneMatrix(m: Matrix): Matrix {
  return m.map((r) => [...r]);
}
function randomPiece(): Piece {
  const type = Math.floor(Math.random() * 7) + 1;
  const matrix = cloneMatrix(SHAPES[type - 1]);
  return { type, matrix, x: Math.floor((COLS - matrix[0].length) / 2), y: 0 };
}
function collide(board: Board, p: Piece): boolean {
  for (let y = 0; y < p.matrix.length; y++) {
    for (let x = 0; x < p.matrix[y].length; x++) {
      if (!p.matrix[y][x]) continue;
      const bx = p.x + x, by = p.y + y;
      if (bx < 0 || bx >= COLS || by >= ROWS) return true;
      if (by >= 0 && board[by][bx]) return true;
    }
  }
  return false;
}
function mergeBoard(board: Board, p: Piece): Board {
  const nb = board.map((r) => [...r]);
  for (let y = 0; y < p.matrix.length; y++) {
    for (let x = 0; x < p.matrix[y].length; x++) {
      if (p.matrix[y][x]) {
        const by = p.y + y, bx = p.x + x;
        if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) nb[by][bx] = p.type;
      }
    }
  }
  return nb;
}
function rotateMatrix(m: Matrix, cw: boolean): Matrix {
  const n = m.length;
  const res: Matrix = Array.from({ length: n }, () => Array(n).fill(0));
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    if (cw) res[x][n - 1 - y] = m[y][x];
    else res[n - 1 - x][y] = m[y][x];
  }
  return res;
}
function clearLines(board: Board): { board: Board; cleared: number } {
  const remaining = board.filter((row) => row.some((c) => c === 0));
  const cleared = ROWS - remaining.length;
  const empty = Array.from({ length: cleared }, () => Array<Cell>(COLS).fill(0));
  return { board: [...empty, ...remaining], cleared };
}
function ghostDropY(board: Board, p: Piece): number {
  let y = p.y;
  while (!collide(board, { ...p, y: y + 1 })) y++;
  return y;
}
function trimShape(m: Matrix): Matrix {
  let minR = m.length, maxR = -1, minC = m[0].length, maxC = -1;
  for (let y = 0; y < m.length; y++) for (let x = 0; x < m[y].length; x++) {
    if (m[y][x]) { if (y < minR) minR = y; if (y > maxR) maxR = y; if (x < minC) minC = x; if (x > maxC) maxC = x; }
  }
  if (maxR < 0) return [];
  const out: Matrix = [];
  for (let y = minR; y <= maxR; y++) out.push(m[y].slice(minC, maxC + 1));
  return out;
}
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function Tetris() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);
  const dropAccRef = useRef(0);
  const sizeRef = useRef({ w: 300, h: 600, cell: 30, dpr: 1 });
  const boardRef = useRef<Board>(createBoard());
  const pieceRef = useRef<Piece | null>(null);
  const nextRef = useRef<Piece | null>(null);
  const holdRef = useRef<Piece | null>(null);
  const canHoldRef = useRef(true);
  const stateRef = useRef<GameState>("ready");
  const scoreRef = useRef(0);
  const linesRef = useRef(0);
  const levelRef = useRef(0);
  const bestRef = useRef(0);

  const [gameState, setGameState] = useState<GameState>("ready");
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(0);
  const [best, setBest] = useState(0);
  const [next, setNext] = useState<Piece | null>(null);
  const [hold, setHold] = useState<Piece | null>(null);
  const [canHold, setCanHold] = useState(true);

  const setState = useCallback((s: GameState) => {
    stateRef.current = s;
    setGameState(s);
  }, []);

  const drawCell = useCallback((ctx: CanvasRenderingContext2D, px: number, py: number, size: number, type: number, alpha = 1) => {
    const w = WOOD[type];
    if (!w) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    const pad = Math.max(1, size * 0.06);
    const x = px + pad, y = py + pad, s = size - pad * 2;
    const g = ctx.createLinearGradient(x, y, x + s, y + s);
    g.addColorStop(0, w.light);
    g.addColorStop(0.5, w.base);
    g.addColorStop(1, w.dark);
    ctx.fillStyle = g;
    roundRect(ctx, x, y, s, s, Math.max(2, size * 0.13));
    ctx.fill();
    ctx.strokeStyle = w.dark;
    ctx.lineWidth = Math.max(1, size * 0.04);
    ctx.stroke();
    ctx.strokeStyle = w.light;
    ctx.lineWidth = Math.max(1, size * 0.05);
    ctx.beginPath();
    ctx.moveTo(x + size * 0.1, y + size * 0.1);
    ctx.lineTo(x + size * 0.1, y + s - size * 0.1);
    ctx.moveTo(x + size * 0.1, y + size * 0.1);
    ctx.lineTo(x + s - size * 0.1, y + size * 0.1);
    ctx.stroke();
    const cx = x + s / 2, cy = y + s / 2;
    ctx.strokeStyle = w.ring;
    ctx.lineWidth = Math.max(0.5, size * 0.02);
    for (let i = 1; i <= 3; i++) {
      ctx.globalAlpha = alpha * Math.max(0.1, 0.5 - i * 0.1);
      ctx.beginPath();
      ctx.ellipse(cx, cy, (s / 2) * (0.2 * i), (s / 2) * (0.14 * i), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = alpha * 0.6;
    ctx.strokeStyle = w.dark;
    ctx.lineWidth = Math.max(0.5, size * 0.015);
    ctx.beginPath();
    ctx.moveTo(x + s * 0.15, cy + s * 0.05);
    ctx.bezierCurveTo(x + s * 0.4, cy - s * 0.12, x + s * 0.6, cy + s * 0.12, x + s * 0.85, cy - s * 0.05);
    ctx.stroke();
    ctx.restore();
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const { w, h, cell } = sizeRef.current;

    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, "#1c1410");
    bg.addColorStop(0.5, "#2a1d14");
    bg.addColorStop(1, "#0f0a07");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(180,120,60,0.06)";
    ctx.lineWidth = 1;
    const now = Date.now() / 60;
    for (let i = 0; i < 9; i++) {
      const ry = ((h / 9) * i + now) % h;
      ctx.beginPath();
      ctx.moveTo(0, ry);
      for (let x = 0; x <= w; x += 8) ctx.lineTo(x, ry + Math.sin(x * 0.05 + i) * 2);
      ctx.stroke();
    }

    const boardW = COLS * cell, boardH = ROWS * cell;
    const ox = (w - boardW) / 2, oy = (h - boardH) / 2;
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(ox, oy, boardW, boardH);
    ctx.strokeStyle = "rgba(245,158,11,0.07)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= COLS; i++) { ctx.moveTo(ox + i * cell + 0.5, oy); ctx.lineTo(ox + i * cell + 0.5, oy + boardH); }
    for (let i = 0; i <= ROWS; i++) { ctx.moveTo(ox, oy + i * cell + 0.5); ctx.lineTo(ox + boardW, oy + i * cell + 0.5); }
    ctx.stroke();

    const board = boardRef.current;
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      if (board[y][x]) drawCell(ctx, ox + x * cell, oy + y * cell, cell, board[y][x]);
    }

    const piece = pieceRef.current;
    const st = stateRef.current;
    if (piece && (st === "playing" || st === "paused")) {
      if (st === "playing") {
        const gy = ghostDropY(board, piece);
        for (let y = 0; y < piece.matrix.length; y++) for (let x = 0; x < piece.matrix[y].length; x++) {
          if (piece.matrix[y][x] && gy + y >= 0) drawCell(ctx, ox + (piece.x + x) * cell, oy + (gy + y) * cell, cell, piece.type, 0.22);
        }
      }
      for (let y = 0; y < piece.matrix.length; y++) for (let x = 0; x < piece.matrix[y].length; x++) {
        if (piece.matrix[y][x] && piece.y + y >= 0) drawCell(ctx, ox + (piece.x + x) * cell, oy + (piece.y + y) * cell, cell, piece.type);
      }
    }
  }, [drawCell]);

  const spawnPiece = useCallback(() => {
    const np = nextRef.current ?? randomPiece();
    nextRef.current = randomPiece();
    pieceRef.current = np;
    canHoldRef.current = true;
    setCanHold(true);
    setNext(nextRef.current);
    if (collide(boardRef.current, np)) {
      if (scoreRef.current > bestRef.current) {
        bestRef.current = scoreRef.current;
        setBest(bestRef.current);
      }
      setState("gameover");
    }
  }, [setState]);

  const lockPiece = useCallback(() => {
    const piece = pieceRef.current;
    if (!piece) return;
    let board = mergeBoard(boardRef.current, piece);
    const { board: nb, cleared } = clearLines(board);
    board = nb;
    boardRef.current = board;
    if (cleared > 0) {
      linesRef.current += cleared;
      levelRef.current = Math.floor(linesRef.current / 10);
      scoreRef.current += LINE_SCORES[cleared] * (levelRef.current + 1);
      setLines(linesRef.current);
      setLevel(levelRef.current);
      setScore(scoreRef.current);
    }
    spawnPiece();
  }, [spawnPiece]);

  const tick = useCallback(() => {
    const piece = pieceRef.current;
    if (!piece) return;
    const moved: Piece = { ...piece, y: piece.y + 1 };
    if (collide(boardRef.current, moved)) lockPiece();
    else pieceRef.current = moved;
  }, [lockPiece]);

  const move = useCallback((dx: number) => {
    if (stateRef.current !== "playing") return;
    const piece = pieceRef.current;
    if (!piece) return;
    const moved: Piece = { ...piece, x: piece.x + dx };
    if (!collide(boardRef.current, moved)) pieceRef.current = moved;
  }, []);

  const rotate = useCallback((cw: boolean) => {
    if (stateRef.current !== "playing") return;
    const piece = pieceRef.current;
    if (!piece) return;
    const newMatrix = rotateMatrix(piece.matrix, cw);
    for (const k of [0, -1, 1, -2, 2]) {
      const cand: Piece = { ...piece, matrix: newMatrix, x: piece.x + k };
      if (!collide(boardRef.current, cand)) { pieceRef.current = cand; return; }
    }
  }, []);

  const softDrop = useCallback(() => {
    if (stateRef.current !== "playing") return;
    const piece = pieceRef.current;
    if (!piece) return;
    const moved: Piece = { ...piece, y: piece.y + 1 };
    if (collide(boardRef.current, moved)) lockPiece();
    else { pieceRef.current = moved; scoreRef.current += 1; setScore(scoreRef.current); }
  }, [lockPiece]);

  const hardDrop = useCallback(() => {
    if (stateRef.current !== "playing") return;
    const piece = pieceRef.current;
    if (!piece) return;
    const gy = ghostDropY(boardRef.current, piece);
    scoreRef.current += (gy - piece.y) * 2;
    pieceRef.current = { ...piece, y: gy };
    setScore(scoreRef.current);
    lockPiece();
  }, [lockPiece]);

  const holdPiece = useCallback(() => {
    if (stateRef.current !== "playing" || !canHoldRef.current) return;
    const piece = pieceRef.current;
    if (!piece) return;
    const heldType = holdRef.current?.type ?? null;
    const newHold: Piece = { type: piece.type, matrix: cloneMatrix(SHAPES[piece.type - 1]), x: 0, y: 0 };
    if (heldType) {
      const sh = SHAPES[heldType - 1];
      pieceRef.current = { type: heldType, matrix: cloneMatrix(sh), x: Math.floor((COLS - sh[0].length) / 2), y: 0 };
    } else {
      spawnPiece();
    }
    holdRef.current = newHold;
    canHoldRef.current = false;
    setCanHold(false);
    setHold(newHold);
  }, [spawnPiece]);

  const startGame = useCallback(() => {
    boardRef.current = createBoard();
    nextRef.current = randomPiece();
    holdRef.current = null;
    canHoldRef.current = true;
    setCanHold(true);
    scoreRef.current = 0;
    linesRef.current = 0;
    levelRef.current = 0;
    dropAccRef.current = 0;
    setScore(0);
    setLines(0);
    setLevel(0);
    setHold(null);
    spawnPiece();
    setState("playing");
  }, [spawnPiece, setState]);

  const togglePause = useCallback(() => {
    if (stateRef.current === "playing") setState("paused");
    else if (stateRef.current === "paused") setState("playing");
  }, [setState]);

  const moveLeft = useCallback(() => move(-1), [move]);
  const moveRight = useCallback(() => move(1), [move]);
  const rotateCW = useCallback(() => rotate(true), [rotate]);
  const rotateCCW = useCallback(() => rotate(false), [rotate]);

  useEffect(() => {
    const loop = (time: number) => {
      const last = lastTimeRef.current || time;
      const dt = time - last;
      lastTimeRef.current = time;
      if (stateRef.current === "playing") {
        dropAccRef.current += dt;
        const interval = Math.max(80, 800 - levelRef.current * 65);
        let safety = 0;
        while (dropAccRef.current >= interval && safety < 30) {
          dropAccRef.current -= interval;
          tick();
          safety++;
        }
      }
      draw();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [tick, draw]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const cell = Math.max(8, Math.floor(Math.min(rect.width / COLS, rect.height / ROWS)));
      const w = cell * COLS, h = cell * ROWS;
      sizeRef.current = { w, h, cell, dpr };
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      switch (e.key) {
        case "ArrowLeft": e.preventDefault(); move(-1); break;
        case "ArrowRight": e.preventDefault(); move(1); break;
        case "ArrowDown": e.preventDefault(); softDrop(); break;
        case "ArrowUp":
        case "x":
        case "X": e.preventDefault(); rotate(true); break;
        case "z":
        case "Z": e.preventDefault(); rotate(false); break;
        case " ":
          e.preventDefault();
          if (stateRef.current === "ready" || stateRef.current === "gameover") startGame();
          else hardDrop();
          break;
        case "Shift": e.preventDefault(); holdPiece(); break;
        case "p":
        case "P": e.preventDefault(); togglePause(); break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [move, rotate, softDrop, hardDrop, startGame, togglePause, holdPiece]);

  const renderPreview = (p: Piece | null, label: string): ReactNode => {
    const cellPx = 13;
    if (!p) {
      return (
        <div className="rounded-lg border border-amber-900/40 bg-stone-950/60 p-2">
          <div className="mb-1 text-[10px] uppercase tracking-wider text-amber-200/70">{label}</div>
          <div className="flex h-9 items-center justify-center text-sm text-stone-600">—</div>
        </div>
      );
    }
    const trimmed = trimShape(p.matrix);
    const cols = trimmed[0]?.length ?? 1;
    return (
      <div className="rounded-lg border border-amber-900/40 bg-stone-950/60 p-2">
        <div className="mb-1 text-[10px] uppercase tracking-wider text-amber-200/70">{label}</div>
        <div className="mx-auto grid w-fit gap-[2px]" style={{ gridTemplateColumns: `repeat(${cols}, ${cellPx}px)` }}>
          {trimmed.flatMap((row, y) =>
            row.map((c, x) => (
              <div
                key={`${y}-${x}`}
                className="rounded-[3px]"
                style={{
                  width: cellPx,
                  height: cellPx,
                  background: c ? (WOOD[p.type]?.base ?? "#000") : "rgba(120,80,40,0.06)",
                  boxShadow: c ? "inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(0,0,0,0.4)" : "none",
                }}
              />
            ))
          )}
        </div>
      </div>
    );
  };

  const stat = (label: string, value: number, accent?: boolean): ReactNode => (
    <div className="rounded-lg border border-amber-900/40 bg-stone-900/70 p-2">
      <div className="text-[10px] uppercase tracking-wider text-amber-200/70">{label}</div>
      <div className={`text-lg font-bold tabular-nums ${accent ? "text-amber-300" : "text-amber-50"}`}>{value}</div>
    </div>
  );

  const btnCls =
    "flex h-11 w-11 items-center justify-center rounded-lg border border-amber-900/50 bg-amber-950/70 text-amber-100 transition hover:bg-amber-900/70 active:scale-95 disabled:opacity-40";

  const overlay: Record<GameState, ReactNode> = {
    ready: (
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="text-3xl">🐹</div>
        <div className="text-lg font-semibold text-amber-100">Нажми чтобы начать</div>
        <div className="max-w-[14rem] text-xs text-amber-200/70">← → двигать · ↓ мягко · ↑ поворот · пробел сброс · P пауза · Shift склад</div>
      </div>
    ),
    paused: (
      <div className="flex flex-col items-center gap-2 text-center">
        <Pause className="h-8 w-8 text-amber-200" />
        <div className="text-lg font-semibold text-amber-100">Пауза</div>
        <div className="text-xs text-amber-200/70">Нажми P или кликни чтобы продолжить</div>
      </div>
    ),
    gameover: (
      <div className="flex flex-col items-center gap-1.5 text-center">
        <div className="text-3xl">🌿</div>
        <div className="text-lg font-semibold text-amber-100">Игра окончена</div>
        <div className="text-sm text-amber-200/90">Счёт: {score}</div>
        <div className="text-sm text-amber-300/90">Рекорд: {best}</div>
        <div className="text-xs text-amber-200/70">Нажми для рестарта</div>
      </div>
    ),
    playing: <></>,
  };

  const onOverlayClick = () => {
    if (gameState === "ready" || gameState === "gameover") startGame();
    else if (gameState === "paused") togglePause();
  };

  return (
    <div className="flex h-full w-full flex-col gap-3 bg-stone-950 p-3 text-amber-50 md:flex-row md:p-4">
      <div className="relative flex min-h-[200px] flex-1 items-center justify-center">
        <div ref={containerRef} className="relative flex h-full w-full items-center justify-center">
          <canvas ref={canvasRef} className="rounded-md shadow-[0_0_30px_rgba(0,0,0,0.6)]" />
          {gameState !== "playing" && (
            <button
              type="button"
              onClick={onOverlayClick}
              className="absolute inset-0 flex items-center justify-center rounded-md bg-black/55 backdrop-blur-sm"
            >
              <div className="px-4">{overlay[gameState]}</div>
            </button>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-row gap-3 md:w-44 md:flex-col">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-1">
          {stat("Счёт", score)}
          {stat("Уровень", level)}
          {stat("Линии", lines)}
          {stat("Рекорд", best, true)}
        </div>
        {renderPreview(next, "Далее")}
        {renderPreview(hold, "Склад (Shift)")}
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" aria-label="Влево" onClick={moveLeft} className={btnCls}><ChevronLeft className="h-5 w-5" /></button>
          <button type="button" aria-label="Вправо" onClick={moveRight} className={btnCls}><ChevronRight className="h-5 w-5" /></button>
          <button type="button" aria-label="Поворот по часовой" onClick={rotateCW} className={btnCls}><RotateCw className="h-5 w-5" /></button>
          <button type="button" aria-label="Поворот против" onClick={rotateCCW} className={btnCls}><RotateCcw className="h-5 w-5" /></button>
          <button type="button" aria-label="Мягкий сброс" onClick={softDrop} className={btnCls}><ChevronDown className="h-5 w-5" /></button>
          <button type="button" aria-label="Жёсткий сброс" onClick={hardDrop} className={btnCls}><ArrowBigDown className="h-5 w-5" /></button>
          <button type="button" aria-label="Склад" onClick={holdPiece} disabled={!canHold} className={btnCls}><ArrowLeftRight className="h-5 w-5" /></button>
          <button type="button" aria-label="Пауза" onClick={togglePause} disabled={gameState === "ready" || gameState === "gameover"} className={btnCls}>
            {gameState === "paused" ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
