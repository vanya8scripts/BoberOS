"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type GameStatus = "idle" | "playing" | "won" | "lost";

interface Cell {
  isBadger: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  adjacent: number;
  isDetonated: boolean;
}

interface Difficulty {
  id: "novice" | "beaver" | "expert";
  label: string;
  rows: number;
  cols: number;
  badgers: number;
}

const DIFFICULTIES: Difficulty[] = [
  { id: "novice", label: "Новичок", rows: 9, cols: 9, badgers: 10 },
  { id: "beaver", label: "Бобёр", rows: 12, cols: 12, badgers: 24 },
  { id: "expert", label: "Эксперт", rows: 16, cols: 16, badgers: 50 },
];

const NUMBER_COLORS: Record<number, string> = {
  1: "text-blue-700",
  2: "text-green-700",
  3: "text-red-600",
  4: "text-blue-900",
  5: "text-rose-900",
  6: "text-teal-600",
  7: "text-zinc-900",
  8: "text-zinc-500",
};

function createEmptyGrid(rows: number, cols: number): Cell[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      isBadger: false,
      isRevealed: false,
      isFlagged: false,
      adjacent: 0,
      isDetonated: false,
    }))
  );
}

function getNeighbors(r: number, c: number, rows: number, cols: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) out.push([nr, nc]);
    }
  }
  return out;
}

function placeBadgers(
  grid: Cell[][],
  rows: number,
  cols: number,
  badgers: number,
  safeR: number,
  safeC: number
): Cell[][] {
  const safe = new Set<string>();
  safe.add(`${safeR},${safeC}`);
  for (const [nr, nc] of getNeighbors(safeR, safeC, rows, cols)) safe.add(`${nr},${nc}`);

  const candidates: Array<[number, number]> = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!safe.has(`${r},${c}`)) candidates.push([r, c]);
    }
  }
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  const newGrid = grid.map((row) => row.map((cell) => ({ ...cell })));
  const count = Math.min(badgers, candidates.length);
  for (let i = 0; i < count; i++) {
    const [r, c] = candidates[i];
    newGrid[r][c].isBadger = true;
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (newGrid[r][c].isBadger) continue;
      let n = 0;
      for (const [nr, nc] of getNeighbors(r, c, rows, cols)) {
        if (newGrid[nr][nc].isBadger) n++;
      }
      newGrid[r][c].adjacent = n;
    }
  }
  return newGrid;
}

function floodReveal(
  grid: Cell[][],
  rows: number,
  cols: number,
  startR: number,
  startC: number
): { grid: Cell[][]; hitBadger: boolean } {
  const newGrid = grid.map((row) => row.map((cell) => ({ ...cell })));
  const stack: Array<[number, number]> = [[startR, startC]];
  let hitBadger = false;
  const visited = new Set<string>();
  while (stack.length > 0) {
    const [r, c] = stack.pop()!;
    const key = `${r},${c}`;
    if (visited.has(key)) continue;
    visited.add(key);
    const cell = newGrid[r][c];
    if (cell.isRevealed || cell.isFlagged) continue;
    cell.isRevealed = true;
    if (cell.isBadger) {
      hitBadger = true;
      cell.isDetonated = true;
      continue;
    }
    if (cell.adjacent === 0) {
      for (const [nr, nc] of getNeighbors(r, c, rows, cols)) {
        const ncell = newGrid[nr][nc];
        if (!ncell.isRevealed && !ncell.isFlagged) stack.push([nr, nc]);
      }
    }
  }
  return { grid: newGrid, hitBadger };
}

function revealAllBadgers(grid: Cell[][]): Cell[][] {
  return grid.map((row) =>
    row.map((cell) => (cell.isBadger ? { ...cell, isRevealed: true } : cell))
  );
}

function countFlags(grid: Cell[][]): number {
  let n = 0;
  for (const row of grid) for (const cell of row) if (cell.isFlagged) n++;
  return n;
}

function countRevealedNonBadgers(grid: Cell[][]): number {
  let n = 0;
  for (const row of grid)
    for (const cell of row) if (cell.isRevealed && !cell.isBadger) n++;
  return n;
}

export function Minesweeper() {
  const [difficulty, setDifficulty] = useState<Difficulty>(DIFFICULTIES[0]);
  const [grid, setGrid] = useState<Cell[][]>(() =>
    createEmptyGrid(DIFFICULTIES[0].rows, DIFFICULTIES[0].cols)
  );
  const [status, setStatus] = useState<GameStatus>("idle");
  const [flagsPlaced, setFlagsPlaced] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [flagMode, setFlagMode] = useState(false);

  const longPressTimer = useRef<number | null>(null);
  const longPressFired = useRef(false);
  const timerRef = useRef<number | null>(null);

  const { rows, cols, badgers } = difficulty;

  const reset = useCallback((d: Difficulty) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setGrid(createEmptyGrid(d.rows, d.cols));
    setStatus("idle");
    setFlagsPlaced(0);
    setTimeElapsed(0);
  }, []);

  const changeDifficulty = useCallback(
    (d: Difficulty) => {
      setDifficulty(d);
      reset(d);
    },
    [reset]
  );

  useEffect(() => {
    if (status !== "playing") {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    timerRef.current = window.setInterval(() => {
      setTimeElapsed((t) => (t < 999 ? t + 1 : t));
    }, 1000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [status]);

  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const badgersRemaining = badgers - flagsPlaced;

  const handleReveal = useCallback(
    (r: number, c: number) => {
      if (status === "won" || status === "lost") return;
      const cell = grid[r][c];
      if (cell.isFlagged || cell.isRevealed) return;

      let workingGrid = grid;
      let workingStatus = status;
      if (status === "idle") {
        workingGrid = placeBadgers(grid, rows, cols, badgers, r, c);
        workingStatus = "playing";
      }

      const { grid: revealedGrid, hitBadger } = floodReveal(workingGrid, rows, cols, r, c);

      if (hitBadger) {
        setGrid(revealAllBadgers(revealedGrid));
        setStatus("lost");
        return;
      }

      const totalNonBadger = rows * cols - badgers;
      if (countRevealedNonBadgers(revealedGrid) >= totalNonBadger) {
        const finalGrid = revealedGrid.map((row) =>
          row.map((cc) => (cc.isBadger && !cc.isFlagged ? { ...cc, isFlagged: true } : cc))
        );
        setGrid(finalGrid);
        setFlagsPlaced(countFlags(finalGrid));
        setStatus("won");
        return;
      }

      setGrid(revealedGrid);
      setStatus(workingStatus);
    },
    [grid, status, rows, cols, badgers]
  );

  const toggleFlag = useCallback(
    (r: number, c: number) => {
      if (status === "won" || status === "lost") return;
      const cell = grid[r][c];
      if (cell.isRevealed) return;
      const newGrid = grid.map((row, ri) =>
        row.map((cc, ci) =>
          ri === r && ci === c ? { ...cc, isFlagged: !cc.isFlagged } : cc
        )
      );
      setGrid(newGrid);
      setFlagsPlaced(countFlags(newGrid));
    },
    [grid, status]
  );

  const onCellPointerDown = (e: React.PointerEvent, r: number, c: number) => {
    if (e.button !== 0) return;
    longPressFired.current = false;
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = window.setTimeout(() => {
      longPressFired.current = true;
      toggleFlag(r, c);
    }, 450);
  };

  const onCellPointerCancel = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const onCellClick = (r: number, c: number) => {
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    if (flagMode) toggleFlag(r, c);
    else handleReveal(r, c);
  };

  const onCellContextMenu = (e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault();
    toggleFlag(r, c);
  };

  const face = status === "won" ? "😎" : status === "lost" ? "😵" : "😀";
  const hint =
    status === "won"
      ? "Победа! Все барсуки найдены 🦡✨"
      : status === "lost"
        ? "Тебя поймал барсук! Попробуй ещё раз."
        : "ЛКМ — открыть · ПКМ / долгий зажим — флажок";

  const cellSize =
    rows >= 16
      ? "h-6 w-6 text-sm"
      : rows >= 12
        ? "h-7 w-7 text-base"
        : "h-8 w-8 text-lg";

  return (
    <div className="relative flex h-full w-full flex-col bg-amber-50 text-zinc-900">
      {/* Панель сложности + режим флажка */}
      <div className="flex flex-wrap items-center gap-2 border-b border-amber-200 bg-amber-100/70 p-2">
        <span className="mr-1 text-sm font-bold text-amber-900">🦡 Сапёр</span>
        <div className="flex gap-1">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => changeDifficulty(d)}
              className={
                "rounded-md px-2 py-1 text-xs font-semibold transition-colors " +
                (d.id === difficulty.id
                  ? "bg-amber-600 text-white"
                  : "bg-amber-200 text-amber-800 hover:bg-amber-300")
              }
            >
              {d.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setFlagMode((f) => !f)}
          aria-pressed={flagMode}
          className={
            "ml-auto rounded-md px-2 py-1 text-xs font-semibold transition-colors " +
            (flagMode
              ? "bg-rose-500 text-white"
              : "bg-amber-200 text-amber-800 hover:bg-amber-300")
          }
        >
          {flagMode ? "🚩 Флажок: ВКЛ" : "🚩 Флажок: выкл"}
        </button>
      </div>

      {/* Счётчик / лицо / таймер */}
      <div className="flex items-center justify-between gap-3 bg-amber-200/60 px-4 py-2">
        <div className="flex items-center gap-1 rounded-md bg-zinc-900 px-2 py-1 font-mono text-lg font-bold tabular-nums text-rose-400 shadow-inner">
          <span>🦡</span>
          <span>
            {String(Math.max(-99, Math.min(999, badgersRemaining))).padStart(3, "0")}
          </span>
        </div>
        <button
          type="button"
          onClick={() => reset(difficulty)}
          className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-amber-700/60 bg-amber-300 text-2xl shadow-md transition-transform hover:scale-105 active:scale-95"
          aria-label="Новая игра"
          title="Новая игра"
        >
          {face}
        </button>
        <div className="flex items-center gap-1 rounded-md bg-zinc-900 px-2 py-1 font-mono text-lg font-bold tabular-nums text-rose-400 shadow-inner">
          <span>⏱</span>
          <span>{String(timeElapsed).padStart(3, "0")}</span>
        </div>
      </div>

      {/* Подсказка / статус */}
      <div className="bg-amber-100/70 px-3 py-1 text-center text-xs font-medium text-amber-800">
        {hint}
      </div>

      {/* Игровое поле (с прокруткой) */}
      <div className="flex-1 overflow-auto bg-amber-50 p-2">
        <div
          className="mx-auto w-fit select-none"
          onContextMenu={(e) => e.preventDefault()}
        >
          <div
            className="grid gap-px p-0.5"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {grid.map((row, r) =>
              row.map((cell, c) => {
                const showBadger = cell.isBadger && cell.isRevealed;
                const showNumber = cell.isRevealed && !cell.isBadger && cell.adjacent > 0;
                return (
                  <button
                    key={`${r}-${c}`}
                    type="button"
                    onClick={() => onCellClick(r, c)}
                    onContextMenu={(e) => onCellContextMenu(e, r, c)}
                    onPointerDown={(e) => onCellPointerDown(e, r, c)}
                    onPointerUp={onCellPointerCancel}
                    onPointerLeave={onCellPointerCancel}
                    className={
                      "flex items-center justify-center border-2 font-bold leading-none " +
                      cellSize +
                      " " +
                      (cell.isRevealed
                        ? showBadger
                          ? cell.isDetonated
                            ? "border-rose-700 bg-rose-500 text-white"
                            : "border-amber-300 bg-rose-200 text-rose-900"
                          : "border-amber-200 bg-amber-50 " +
                            (showNumber ? NUMBER_COLORS[cell.adjacent] : "text-zinc-800")
                        : "border-t-amber-200/80 border-l-amber-200/80 border-b-amber-700/70 border-r-amber-700/70 bg-amber-500/80 text-amber-50 hover:bg-amber-400 active:border-t-amber-700/70 active:border-l-amber-700/70 active:border-b-amber-200/80 active:border-r-amber-200/80")
                    }
                  >
                    {cell.isRevealed ? (
                      showBadger ? (
                        <span>🦡</span>
                      ) : showNumber ? (
                        <span>{cell.adjacent}</span>
                      ) : (
                        ""
                      )
                    ) : cell.isFlagged ? (
                      <span>🚩</span>
                    ) : (
                      ""
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Оверлей победы / поражения */}
      {(status === "won" || status === "lost") && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-amber-950/20 p-4">
          <div className="pointer-events-auto rounded-2xl border-2 border-amber-700/50 bg-white/95 px-6 py-5 text-center shadow-2xl">
            <div className="text-4xl">{status === "won" ? "😎" : "😵"}</div>
            <div className="mt-2 text-xl font-bold text-amber-900">
              {status === "won" ? "Победа!" : "Поражение!"}
            </div>
            <div className="mt-1 text-sm text-zinc-600">
              {status === "won"
                ? "Ты перехитрил всех барсуков!"
                : "Тебя поймал барсук."}
            </div>
            <div className="mt-2 text-xs text-zinc-500">Время: {timeElapsed} сек</div>
            <button
              type="button"
              onClick={() => reset(difficulty)}
              className="mt-3 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-amber-600"
            >
              Играть снова
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
