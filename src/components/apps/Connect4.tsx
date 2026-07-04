"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, Trophy } from "lucide-react";

const ROWS = 6;
const COLS = 7;

type Cell = 0 | 1 | 2;
type Board = Cell[];

const CENTER_ORDER = [3, 2, 4, 1, 5, 0, 6];

function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

function buildLines(): number[][] {
  const lines: number[][] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      lines.push([
        r * COLS + c,
        r * COLS + c + 1,
        r * COLS + c + 2,
        r * COLS + c + 3,
      ]);
    }
  }
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r <= ROWS - 4; r++) {
      lines.push([
        r * COLS + c,
        (r + 1) * COLS + c,
        (r + 2) * COLS + c,
        (r + 3) * COLS + c,
      ]);
    }
  }
  for (let r = 3; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      lines.push([
        r * COLS + c,
        (r - 1) * COLS + c + 1,
        (r - 2) * COLS + c + 2,
        (r - 3) * COLS + c + 3,
      ]);
    }
  }
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      lines.push([
        r * COLS + c,
        (r + 1) * COLS + c + 1,
        (r + 2) * COLS + c + 2,
        (r + 3) * COLS + c + 3,
      ]);
    }
  }
  return lines;
}

const LINES = buildLines();

function findWin(board: Board): { who: Cell; line: number[] } | null {
  for (const line of LINES) {
    const [a, b, c, d] = line;
    if (
      board[a] !== 0 &&
      board[a] === board[b] &&
      board[a] === board[c] &&
      board[a] === board[d]
    ) {
      return { who: board[a], line };
    }
  }
  return null;
}

function dropDisc(board: Board, col: number, who: Cell): Board | null {
  for (let r = ROWS - 1; r >= 0; r--) {
    const idx = r * COLS + col;
    if (board[idx] === 0) {
      const next = board.slice() as Board;
      next[idx] = who;
      return next;
    }
  }
  return null;
}

function validCols(board: Board): number[] {
  const cols: number[] = [];
  for (let c = 0; c < COLS; c++) {
    if (board[c] === 0) cols.push(c);
  }
  return cols;
}

function beaverAI(board: Board): number {
  const valid = validCols(board);
  if (valid.length === 0) return -1;
  for (const c of CENTER_ORDER) {
    if (!valid.includes(c)) continue;
    const t = dropDisc(board, c, 2);
    if (t && findWin(t)?.who === 2) return c;
  }
  for (const c of CENTER_ORDER) {
    if (!valid.includes(c)) continue;
    const t = dropDisc(board, c, 1);
    if (t && findWin(t)?.who === 1) return c;
  }
  const scored: { col: number; score: number }[] = [];
  for (const c of CENTER_ORDER) {
    if (!valid.includes(c)) continue;
    const t = dropDisc(board, c, 2);
    if (!t) continue;
    let score = 4 - Math.abs(c - 3);
    const opp = dropDisc(t, c, 1);
    if (opp && findWin(opp)?.who === 1) score -= 12;
    let threats = 0;
    for (const c2 of valid) {
      if (c2 === c) continue;
      const opp2 = dropDisc(t, c2, 1);
      if (opp2 && findWin(opp2)?.who === 1) threats += 1;
    }
    score -= threats * 3;
    score += Math.random() * 0.6;
    scored.push({ col: c, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.col ?? valid[0];
}

export function Connect4() {
  const empty = useMemo<Board>(() => Array(ROWS * COLS).fill(0) as Board, []);
  const [board, setBoard] = useState<Board>(empty);
  const [turn, setTurn] = useState<1 | 2>(1);
  const [hoverCol, setHoverCol] = useState<number | null>(null);
  const [score, setScore] = useState({ badger: 0, beaver: 0, draws: 0 });
  const aiTimer = useRef<number | null>(null);

  const win = findWin(board);
  const isFull = board.every((c) => c !== 0);
  const over = win !== null || isFull;
  const thinking = turn === 2 && !over;

  const applyOutcome = useCallback((next: Board) => {
    const w = findWin(next);
    if (w) {
      setScore((s) =>
        w.who === 1
          ? { ...s, badger: s.badger + 1 }
          : { ...s, beaver: s.beaver + 1 }
      );
    } else if (next.every((c) => c !== 0)) {
      setScore((s) => ({ ...s, draws: s.draws + 1 }));
    }
  }, []);

  const playerMove = useCallback(
    (col: number) => {
      if (over || turn !== 1) return;
      setBoard((prev) => {
        if (findWin(prev) !== null) return prev;
        if (prev[col] !== 0) return prev;
        const next = dropDisc(prev, col, 1);
        if (next === null) return prev;
        applyOutcome(next);
        setTurn(2);
        return next;
      });
    },
    [over, turn, applyOutcome]
  );

  useEffect(() => {
    if (turn !== 2 || over) return;
    aiTimer.current = window.setTimeout(() => {
      setBoard((prev) => {
        if (findWin(prev) !== null) {
          setTurn(1);
          return prev;
        }
        const col = beaverAI(prev);
        if (col < 0) {
          setTurn(1);
          return prev;
        }
        const next = dropDisc(prev, col, 2);
        if (next === null) {
          setTurn(1);
          return prev;
        }
        applyOutcome(next);
        setTurn(1);
        return next;
      });
    }, 600);
    return () => {
      if (aiTimer.current !== null) window.clearTimeout(aiTimer.current);
    };
  }, [turn, over, applyOutcome]);

  useEffect(() => {
    return () => {
      if (aiTimer.current !== null) window.clearTimeout(aiTimer.current);
    };
  }, []);

  const reset = useCallback(() => {
    if (aiTimer.current !== null) window.clearTimeout(aiTimer.current);
    setBoard(empty);
    setTurn(1);
    setHoverCol(null);
  }, [empty]);

  const winSet = useMemo(() => new Set(win?.line ?? []), [win]);

  const status = win
    ? win.who === 1
      ? "Барсук одержал верх! 🐻"
      : "Бобёр построил плотину! 🐹"
    : isFull
    ? "Ничья! Плотина переполнена"
    : thinking
    ? "Бобёр грызёт брёвна..."
    : turn === 1
    ? "Ход Барсука — выбери колонку"
    : "Ход Бобра";

  return (
    <div className="flex h-full min-h-[540px] flex-col bg-gradient-to-b from-emerald-50 to-teal-100">
      <div className="flex items-center justify-between bg-gradient-to-r from-emerald-700 to-teal-800 px-4 py-2.5 text-white">
        <h1 className="flex items-center gap-2 text-sm font-bold">
          <span className="text-base">🐹</span>
          Четыре в ряд Бобра
        </h1>
        <div className="flex gap-2 text-[11px]">
          <span className="rounded bg-zinc-900/50 px-2 py-0.5 font-semibold">
            🐻 {score.badger}
          </span>
          <span className="rounded bg-amber-900/50 px-2 py-0.5 font-semibold">
            🐹 {score.beaver}
          </span>
          <span className="rounded bg-white/20 px-2 py-0.5 font-semibold">
            = {score.draws}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-3">
        <p
          className={cn(
            "text-center text-sm font-semibold",
            win
              ? win.who === 1
                ? "text-zinc-800"
                : "text-amber-700"
              : "text-emerald-900"
          )}
        >
          {status}
        </p>

        <div className="rounded-2xl bg-gradient-to-b from-emerald-600 to-emerald-800 p-2 shadow-xl ring-1 ring-emerald-900/40">
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: COLS }).map((_, col) => {
              const disabled = over || turn !== 1 || board[col] !== 0;
              return (
                <button
                  key={`drop-${col}`}
                  onClick={() => playerMove(col)}
                  onMouseEnter={() => setHoverCol(col)}
                  onMouseLeave={() =>
                    setHoverCol((c) => (c === col ? null : c))
                  }
                  disabled={disabled}
                  aria-label={`Сбросить фишку в колонку ${col + 1}`}
                  className={cn(
                    "grid h-7 w-9 place-items-center rounded text-base transition sm:h-8 sm:w-11",
                    disabled
                      ? "opacity-25"
                      : "cursor-pointer hover:bg-emerald-500/50"
                  )}
                >
                  {hoverCol === col && !disabled ? "🐻" : "▼"}
                </button>
              );
            })}
            {board.map((cell, i) => {
              const col = i % COLS;
              const isWinCell = winSet.has(i);
              const isHoverCol = hoverCol === col && !over && turn === 1;
              return (
                <button
                  key={i}
                  onClick={() => playerMove(col)}
                  onMouseEnter={() => setHoverCol(col)}
                  onMouseLeave={() =>
                    setHoverCol((c) => (c === col ? null : c))
                  }
                  disabled={over || turn !== 1}
                  aria-label={`Колонка ${col + 1}`}
                  className={cn(
                    "grid h-9 w-9 place-items-center rounded-full text-lg transition-all duration-150 sm:h-11 sm:w-11",
                    isWinCell &&
                      "ring-2 ring-white ring-offset-1 ring-offset-emerald-700",
                    cell === 0 &&
                      "bg-emerald-900/60 hover:bg-emerald-900/40",
                    cell === 1 &&
                      "bg-gradient-to-br from-zinc-600 to-zinc-900 shadow-inner",
                    cell === 2 &&
                      "bg-gradient-to-br from-amber-300 to-amber-500 shadow-inner",
                    isHoverCol && cell === 0 && "bg-emerald-900/30"
                  )}
                >
                  {cell === 1 ? "🐻" : cell === 2 ? "🐹" : ""}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={reset}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 active:scale-95"
          >
            <RotateCcw className="h-4 w-4" />
            Новая игра
          </button>
          {over && win && (
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold text-white shadow",
                win.who === 1 ? "bg-zinc-800" : "bg-amber-500"
              )}
            >
              <Trophy className="h-4 w-4" />
              {win.who === 1 ? "Победил Барсук!" : "Победил Бобёр!"}
            </div>
          )}
          {over && !win && (
            <div className="flex items-center gap-1.5 rounded-xl bg-zinc-500 px-3 py-2 text-sm font-bold text-white shadow">
              Ничья!
            </div>
          )}
        </div>

        <p className="max-w-xs text-center text-[11px] text-emerald-900/60">
          Барсук 🐻 против Бобра 🐹. Собери 4 фишки в ряд — по горизонтали,
          вертикали или диагонали.
        </p>
      </div>
    </div>
  );
}
