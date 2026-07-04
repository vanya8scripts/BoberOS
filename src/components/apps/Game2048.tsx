"use client";

import {
  type CSSProperties,
  type TouchEvent as ReactTouchEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Frown, RotateCcw, Trophy } from "lucide-react";

type Direction = "up" | "down" | "left" | "right";

interface Tile {
  id: number;
  value: number;
  row: number;
  col: number;
  isNew: boolean;
  justMerged: boolean;
}

type Grid = (Tile | null)[];

const SIZE = 4;
const WIN_VALUE = 2048;

const BEAVER_MAP: Record<number, { label: string; emoji: string }> = {
  2: { label: "Ветка", emoji: "🌿" },
  4: { label: "Бревно", emoji: "🌲" },
  8: { label: "Плотина", emoji: "🏞️" },
  16: { label: "Бобёр", emoji: "🐹" },
  32: { label: "Семья", emoji: "👨‍👩‍👧" },
  64: { label: "Река", emoji: "🌊" },
  128: { label: "Лес", emoji: "🌳" },
  256: { label: "Хвост", emoji: "🐻" },
  512: { label: "Зубы", emoji: "😁" },
  1024: { label: "Царь-бобёр", emoji: "👑" },
  2048: { label: "ЛЕГЕНДА", emoji: "🏆" },
  4096: { label: "БоброБог", emoji: "⚡" },
  8192: { label: "Бесконечность", emoji: "🌌" },
};

const TILE_STYLE: Record<number, string> = {
  2: "bg-amber-50 text-amber-900 border-amber-200",
  4: "bg-amber-100 text-amber-900 border-amber-300",
  8: "bg-amber-200 text-amber-900 border-amber-400",
  16: "bg-amber-300 text-amber-950 border-amber-500",
  32: "bg-orange-300 text-orange-950 border-orange-400",
  64: "bg-orange-400 text-white border-orange-500",
  128: "bg-orange-500 text-white border-orange-600",
  256: "bg-amber-500 text-white border-amber-600",
  512: "bg-amber-600 text-white border-amber-700",
  1024: "bg-orange-600 text-white border-orange-700",
  2048: "bg-gradient-to-br from-yellow-300 to-amber-500 text-amber-950 border-yellow-400 shadow-[0_0_22px_rgba(251,191,36,0.75)]",
  4096: "bg-stone-700 text-amber-200 border-stone-800",
  8192: "bg-stone-800 text-amber-100 border-stone-900",
};

const PAD_PCT = 3;
const GAP_PCT = 3;
const CELL_PCT = (100 - 2 * PAD_PCT - 3 * GAP_PCT) / SIZE;
const STEP_PCT = CELL_PCT + GAP_PCT;

const TILE_CSS = `
.bober-tile-2048 { transition: left 130ms ease-in-out, top 130ms ease-in-out; }
.bober-tile-2048-new { animation: bober2048-appear 200ms ease-out; }
.bober-tile-2048-merged { animation: bober2048-merge 220ms ease-out; }
@keyframes bober2048-appear { 0% { transform: scale(0); opacity: 0; } 65% { transform: scale(1.12); opacity: 1; } 100% { transform: scale(1); } }
@keyframes bober2048-merge { 0% { transform: scale(1); } 45% { transform: scale(1.22); } 100% { transform: scale(1); } }
`;

let nextId = 1;

function newTile(value: number, row: number, col: number): Tile {
  return { id: nextId++, value, row, col, isNew: true, justMerged: false };
}

function emptyGrid(): Grid {
  return Array<Tile | null>(SIZE * SIZE).fill(null);
}

function spawnTile(grid: Grid): void {
  const empties: number[] = [];
  for (let i = 0; i < grid.length; i++) if (!grid[i]) empties.push(i);
  if (empties.length === 0) return;
  const idx = empties[Math.floor(Math.random() * empties.length)];
  const value = Math.random() < 0.9 ? 2 : 4;
  grid[idx] = newTile(value, Math.floor(idx / SIZE), idx % SIZE);
}

function cloneGrid(grid: Grid): Grid {
  return grid.map((t) => (t ? { ...t } : null));
}

function vectors(d: Direction): { dr: number; dc: number } {
  switch (d) {
    case "up":
      return { dr: -1, dc: 0 };
    case "down":
      return { dr: 1, dc: 0 };
    case "left":
      return { dr: 0, dc: -1 };
    case "right":
      return { dr: 0, dc: 1 };
  }
}

function buildTraversals(d: Direction): { rows: number[]; cols: number[] } {
  const rows = [0, 1, 2, 3];
  const cols = [0, 1, 2, 3];
  if (d === "down") rows.reverse();
  if (d === "right") cols.reverse();
  return { rows, cols };
}

function findFarthest(
  grid: Grid,
  row: number,
  col: number,
  dr: number,
  dc: number,
): { farthest: { row: number; col: number }; next: Tile | null } {
  let r = row;
  let c = col;
  while (true) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) break;
    if (grid[nr * SIZE + nc]) break;
    r = nr;
    c = nc;
  }
  const nextR = r + dr;
  const nextC = c + dc;
  const next =
    nextR >= 0 && nextR < SIZE && nextC >= 0 && nextC < SIZE
      ? grid[nextR * SIZE + nextC]
      : null;
  return { farthest: { row: r, col: c }, next };
}

function move(
  grid: Grid,
  d: Direction,
): { grid: Grid; moved: boolean; gained: number; mergedValue: number | null } {
  const g = cloneGrid(grid);
  for (const t of g) if (t) { t.isNew = false; t.justMerged = false; }
  const { dr, dc } = vectors(d);
  const { rows, cols } = buildTraversals(d);
  let moved = false;
  let gained = 0;
  let mergedValue: number | null = null;

  for (const row of rows) {
    for (const col of cols) {
      const tile = g[row * SIZE + col];
      if (!tile) continue;
      const { farthest, next } = findFarthest(g, row, col, dr, dc);
      if (next && next.value === tile.value && !next.justMerged) {
        const mergedVal = tile.value * 2;
        tile.value = mergedVal;
        tile.row = next.row;
        tile.col = next.col;
        tile.justMerged = true;
        g[next.row * SIZE + next.col] = tile;
        g[row * SIZE + col] = null;
        gained += mergedVal;
        if (mergedValue === null || mergedVal > mergedValue) mergedValue = mergedVal;
        moved = true;
      } else if (farthest.row !== row || farthest.col !== col) {
        g[farthest.row * SIZE + farthest.col] = tile;
        g[row * SIZE + col] = null;
        tile.row = farthest.row;
        tile.col = farthest.col;
        moved = true;
      }
    }
  }
  return { grid: g, moved, gained, mergedValue };
}

function canMove(grid: Grid): boolean {
  for (let i = 0; i < grid.length; i++) if (!grid[i]) return true;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const t = grid[r * SIZE + c];
      if (!t) continue;
      const right = c + 1 < SIZE ? grid[r * SIZE + c + 1] : null;
      const down = r + 1 < SIZE ? grid[(r + 1) * SIZE + c] : null;
      if (right && right.value === t.value) return true;
      if (down && down.value === t.value) return true;
    }
  }
  return false;
}

function posStyle(row: number, col: number): CSSProperties {
  return {
    left: `${PAD_PCT + col * STEP_PCT}%`,
    top: `${PAD_PCT + row * STEP_PCT}%`,
    width: `${CELL_PCT}%`,
    height: `${CELL_PCT}%`,
  };
}

function getTileStyle(value: number): string {
  return TILE_STYLE[value] ?? "bg-stone-900 text-amber-100 border-black";
}

function valueTextClass(v: number): string {
  if (v < 100) return "text-xl";
  if (v < 1000) return "text-lg";
  if (v < 10000) return "text-base";
  return "text-sm";
}

export function Game2048() {
  const [grid, setGrid] = useState<Grid>(() => {
    const g = emptyGrid();
    spawnTile(g);
    spawnTile(g);
    return g;
  });
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => {
    try {
      const stored = localStorage.getItem("boberos-2048-best");
      return stored ? parseInt(stored, 10) || 0 : 0;
    } catch {
      return 0;
    }
  });
  const [won, setWon] = useState(false);
  const [continued, setContinued] = useState(false);
  const [over, setOver] = useState(false);

  const gridRef = useRef(grid);
  const scoreRef = useRef(score);
  const wonRef = useRef(won);
  const continuedRef = useRef(continued);
  const overRef = useRef(over);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    gridRef.current = grid;
    scoreRef.current = score;
    wonRef.current = won;
    continuedRef.current = continued;
    overRef.current = over;
  });

  const doMove = useCallback((d: Direction) => {
    if (overRef.current || wonRef.current) return;
    const res = move(gridRef.current, d);
    if (!res.moved) return;
    spawnTile(res.grid);
    const newScore = scoreRef.current + res.gained;
    setGrid(res.grid);
    setScore(newScore);
    setBest((b) => {
      if (newScore <= b) return b;
      try {
        localStorage.setItem("boberos-2048-best", String(newScore));
      } catch {
        /* ignore */
      }
      return newScore;
    });
    if (
      !wonRef.current &&
      !continuedRef.current &&
      res.mergedValue !== null &&
      res.mergedValue >= WIN_VALUE
    ) {
      setWon(true);
    }
    if (!canMove(res.grid)) setOver(true);
  }, []);

  const restart = useCallback(() => {
    const g = emptyGrid();
    spawnTile(g);
    spawnTile(g);
    setGrid(g);
    setScore(0);
    setWon(false);
    setContinued(false);
    setOver(false);
  }, []);

  const continueGame = useCallback(() => {
    setContinued(true);
    setWon(false);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      const k = e.key.toLowerCase();
      if (overRef.current) {
        if (k === "enter" || k === " ") {
          e.preventDefault();
          restart();
        }
        return;
      }
      let d: Direction | null = null;
      if (k === "arrowup" || k === "w") d = "up";
      else if (k === "arrowdown" || k === "s") d = "down";
      else if (k === "arrowleft" || k === "a") d = "left";
      else if (k === "arrowright" || k === "d") d = "right";
      if (d) {
        e.preventDefault();
        doMove(d);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [doMove, restart]);

  const onTouchStart = useCallback((e: ReactTouchEvent) => {
    const t = e.touches[0];
    if (t) touchStart.current = { x: t.clientX, y: t.clientY };
  }, []);

  const onTouchEnd = useCallback(
    (e: ReactTouchEvent) => {
      const start = touchStart.current;
      if (!start) return;
      touchStart.current = null;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      if (Math.max(absX, absY) < 24) return;
      if (absX > absY) doMove(dx > 0 ? "right" : "left");
      else doMove(dy > 0 ? "down" : "up");
    },
    [doMove],
  );

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-gradient-to-b from-amber-50 to-orange-100 text-amber-950">
      <style>{TILE_CSS}</style>

      {/* Header */}
      <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-amber-600 to-orange-600 px-4 py-3 text-white shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-2xl leading-none">🐹</span>
          <div className="leading-tight">
            <h1 className="text-base font-bold">2048 Бобра</h1>
            <p className="text-[10px] text-amber-100/90">
              Собери легенду бобрового мира
            </p>
          </div>
        </div>
        <div className="flex gap-1.5">
          <div className="flex min-w-[58px] flex-col items-center rounded-md bg-amber-900/30 px-2.5 py-1">
            <span className="text-[9px] font-semibold uppercase tracking-wide text-amber-100/80">
              Счёт
            </span>
            <span className="text-base font-bold leading-tight text-white">
              {score}
            </span>
          </div>
          <div className="flex min-w-[58px] flex-col items-center rounded-md bg-amber-900/30 px-2.5 py-1">
            <span className="text-[9px] font-semibold uppercase tracking-wide text-amber-100/80">
              Рекорд
            </span>
            <span className="text-base font-bold leading-tight text-white">
              {best}
            </span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <p className="text-[11px] text-amber-800/80">Стрелки / WASD / свайпы</p>
        <button
          onClick={restart}
          className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-amber-500 active:scale-95"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Новая игра
        </button>
      </div>

      {/* Board */}
      <div className="flex min-h-0 flex-1 items-center justify-center p-3">
        <div
          className="relative aspect-square w-full max-w-[380px] touch-none rounded-xl bg-amber-700/25 shadow-inner"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {/* Background cells */}
          {Array.from({ length: SIZE * SIZE }).map((_, i) => (
            <div
              key={`bg-${i}`}
              className="absolute rounded-md bg-amber-200/45"
              style={posStyle(Math.floor(i / SIZE), i % SIZE)}
            />
          ))}

          {/* Tiles */}
          {grid.map((t) => {
            if (!t) return null;
            const info = BEAVER_MAP[t.value] ?? { label: "∞", emoji: "🌌" };
            const cls = [
              "bober-tile-2048 absolute flex flex-col items-center justify-center rounded-md border-2 select-none",
              getTileStyle(t.value),
              t.isNew ? "bober-tile-2048-new" : "",
              t.justMerged ? "bober-tile-2048-merged" : "",
            ].join(" ");
            return (
              <div key={t.id} className={cls} style={posStyle(t.row, t.col)}>
                <span className="text-base leading-none">{info.emoji}</span>
                <span className={`font-bold leading-none ${valueTextClass(t.value)}`}>
                  {t.value}
                </span>
                <span className="mt-0.5 max-w-full truncate px-0.5 text-[8px] font-semibold leading-none opacity-80">
                  {info.label}
                </span>
              </div>
            );
          })}

          {/* Win overlay */}
          {won && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-xl bg-amber-950/75 p-4 text-center backdrop-blur-sm">
              <Trophy className="h-10 w-10 text-yellow-300" />
              <div className="text-lg font-bold text-white">Ты собрал 2048! 🏆</div>
              <div className="text-[11px] text-amber-100">Бобёр гордится тобой.</div>
              <div className="mt-1 flex gap-2">
                <button
                  onClick={continueGame}
                  className="rounded-md bg-amber-500 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-amber-400 active:scale-95"
                >
                  Продолжить
                </button>
                <button
                  onClick={restart}
                  className="rounded-md bg-white/15 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-white/25 active:scale-95"
                >
                  Заново
                </button>
              </div>
            </div>
          )}

          {/* Game over overlay */}
          {over && !won && (
            <button
              onClick={restart}
              className="absolute inset-0 z-20 flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl bg-stone-900/80 p-4 text-center backdrop-blur-sm"
            >
              <Frown className="h-10 w-10 text-amber-300" />
              <div className="text-lg font-bold text-white">Игра окончена</div>
              <div className="text-[11px] text-amber-100">
                Плотина переполнилась. Нажми для рестарта.
              </div>
              <div className="mt-1 text-xs font-semibold text-amber-200">
                Счёт: {score}
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
