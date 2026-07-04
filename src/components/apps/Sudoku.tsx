"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Eraser, Pencil, RotateCcw, Timer } from "lucide-react";

type Difficulty = "easy" | "medium" | "hard";

interface DifficultyMeta {
  id: Difficulty;
  label: string;
  clues: number;
}

const DIFFICULTIES: DifficultyMeta[] = [
  { id: "easy", label: "Лёгкий", clues: 40 },
  { id: "medium", label: "Средний", clues: 32 },
  { id: "hard", label: "Сложный", clues: 26 },
];

const BASE_SOLUTION: number[][] = [
  [1, 2, 3, 4, 5, 6, 7, 8, 9],
  [4, 5, 6, 7, 8, 9, 1, 2, 3],
  [7, 8, 9, 1, 2, 3, 4, 5, 6],
  [2, 3, 4, 5, 6, 7, 8, 9, 1],
  [5, 6, 7, 8, 9, 1, 2, 3, 4],
  [8, 9, 1, 2, 3, 4, 5, 6, 7],
  [3, 4, 5, 6, 7, 8, 9, 1, 2],
  [6, 7, 8, 9, 1, 2, 3, 4, 5],
  [9, 1, 2, 3, 4, 5, 6, 7, 8],
];

function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

function generateSolution(): number[][] {
  const perm = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const permMap: Record<number, number> = {};
  perm.forEach((d, i) => {
    permMap[i + 1] = d;
  });
  let grid = BASE_SOLUTION.map((row) => row.map((d) => permMap[d]));
  const bandOrder = shuffle([0, 1, 2]);
  const reordered: number[][] = [];
  bandOrder.forEach((b) => {
    const rowIdxs = shuffle([0, 1, 2]).map((o) => b * 3 + o);
    rowIdxs.forEach((r) => reordered.push(grid[r]));
  });
  grid = reordered;
  if (Math.random() < 0.5) {
    const t: number[][] = Array.from({ length: 9 }, () => Array(9).fill(0));
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        t[c][r] = grid[r][c];
      }
    }
    grid = t;
  }
  return grid;
}

function generatePuzzle(difficulty: Difficulty): { puzzle: number[][]; solution: number[][] } {
  const solution = generateSolution();
  const meta = DIFFICULTIES.find((d) => d.id === difficulty) ?? DIFFICULTIES[1];
  const removeCount = 81 - meta.clues;
  const puzzle = solution.map((row) => [...row]);
  const positions = shuffle(Array.from({ length: 81 }, (_, i) => i));
  let removed = 0;
  for (const pos of positions) {
    if (removed >= removeCount) break;
    const r = Math.floor(pos / 9);
    const c = pos % 9;
    if (puzzle[r][c] !== 0) {
      puzzle[r][c] = 0;
      removed++;
    }
  }
  return { puzzle, solution };
}

function hasConflict(grid: number[][], r: number, c: number): boolean {
  const v = grid[r][c];
  if (v === 0) return false;
  for (let i = 0; i < 9; i++) {
    if (i !== c && grid[r][i] === v) return true;
    if (i !== r && grid[i][c] === v) return true;
  }
  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const rr = br + i;
      const cc = bc + j;
      if ((rr !== r || cc !== c) && grid[rr][cc] === v) return true;
    }
  }
  return false;
}

function isSolved(grid: number[][]): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] === 0) return false;
      if (hasConflict(grid, r, c)) return false;
    }
  }
  return true;
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

interface BoardState {
  solution: number[][];
  grid: number[][];
  given: boolean[][];
  notes: number[][];
}

interface CellPos {
  r: number;
  c: number;
}

function createBoard(diff: Difficulty): BoardState {
  const { puzzle, solution } = generatePuzzle(diff);
  return {
    solution,
    grid: puzzle,
    given: puzzle.map((row) => row.map((v) => v !== 0)),
    notes: Array.from({ length: 9 }, () => Array(9).fill(0)),
  };
}

export function Sudoku() {
  const [board, setBoard] = useState<BoardState>(() => createBoard("medium"));
  const [selected, setSelected] = useState<CellPos | null>(null);
  const [notesMode, setNotesMode] = useState<boolean>(false);
  const [errors, setErrors] = useState<number>(0);
  const [status, setStatus] = useState<"playing" | "won">("playing");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [elapsed, setElapsed] = useState<number>(0);
  const [checkResult, setCheckResult] = useState<null | "ok" | "bad">(null);
  const checkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startGame = useCallback((diff: Difficulty) => {
    setBoard(createBoard(diff));
    setSelected(null);
    setNotesMode(false);
    setErrors(0);
    setStatus("playing");
    setDifficulty(diff);
    setElapsed(0);
    setCheckResult(null);
    if (checkTimerRef.current) {
      clearTimeout(checkTimerRef.current);
      checkTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (status !== "playing") return;
    const id = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [status]);

  const moveSelection = useCallback((dr: number, dc: number) => {
    setSelected((prev) => {
      const r = prev ? prev.r : 4;
      const c = prev ? prev.c : 4;
      return {
        r: Math.max(0, Math.min(8, r + dr)),
        c: Math.max(0, Math.min(8, c + dc)),
      };
    });
  }, []);

  const placeDigit = useCallback(
    (digit: number) => {
      if (status !== "playing" || !selected) return;
      const { r, c } = selected;
      if (board.given[r][c]) return;
      if (notesMode) {
        setBoard((prev) => {
          const nextNotes = prev.notes.map((row) => [...row]);
          const bit = 1 << (digit - 1);
          const cur = nextNotes[r][c];
          nextNotes[r][c] = cur & bit ? cur & ~bit : cur | bit;
          return { ...prev, notes: nextNotes };
        });
        return;
      }
      if (board.grid[r][c] === digit) {
        setBoard((prev) => {
          const nextGrid = prev.grid.map((row) => [...row]);
          nextGrid[r][c] = 0;
          return { ...prev, grid: nextGrid };
        });
        return;
      }
      const nextGrid = board.grid.map((row) => [...row]);
      nextGrid[r][c] = digit;
      const nextNotes = board.notes.map((row) => [...row]);
      nextNotes[r][c] = 0;
      setBoard({ ...board, grid: nextGrid, notes: nextNotes });
      if (board.solution[r][c] !== digit) {
        setErrors((e) => e + 1);
      }
      if (isSolved(nextGrid)) {
        setStatus("won");
      }
    },
    [status, selected, notesMode, board]
  );

  const eraseCell = useCallback(() => {
    if (status !== "playing" || !selected) return;
    const { r, c } = selected;
    if (board.given[r][c]) return;
    setBoard((prev) => {
      const nextGrid = prev.grid.map((row) => [...row]);
      nextGrid[r][c] = 0;
      const nextNotes = prev.notes.map((row) => [...row]);
      nextNotes[r][c] = 0;
      return { ...prev, grid: nextGrid, notes: nextNotes };
    });
  }, [status, selected, board]);

  const handleCheck = useCallback(() => {
    if (status !== "playing") return;
    let hasWrong = false;
    for (let r = 0; r < 9 && !hasWrong; r++) {
      for (let c = 0; c < 9 && !hasWrong; c++) {
        if (!board.given[r][c] && board.grid[r][c] !== 0 && board.grid[r][c] !== board.solution[r][c]) {
          hasWrong = true;
        }
      }
    }
    setCheckResult(hasWrong ? "bad" : "ok");
    if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
    checkTimerRef.current = setTimeout(() => setCheckResult(null), 2200);
  }, [status, board]);

  useEffect(() => {
    if (status !== "playing") return;
    const handler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const key = e.key;
      if (key === "ArrowUp") {
        e.preventDefault();
        moveSelection(-1, 0);
      } else if (key === "ArrowDown") {
        e.preventDefault();
        moveSelection(1, 0);
      } else if (key === "ArrowLeft") {
        e.preventDefault();
        moveSelection(0, -1);
      } else if (key === "ArrowRight") {
        e.preventDefault();
        moveSelection(0, 1);
      } else if (key.length === 1 && key >= "1" && key <= "9") {
        placeDigit(Number(key));
      } else if (key === "0" || key === "Backspace" || key === "Delete") {
        e.preventDefault();
        eraseCell();
      } else if (key === "n" || key === "N") {
        setNotesMode((m) => !m);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [status, moveSelection, placeDigit, eraseCell]);

  const remaining: number[] = [];
  for (let d = 1; d <= 9; d++) {
    let count = 0;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board.grid[r][c] === d) count++;
      }
    }
    remaining.push(Math.max(0, 9 - count));
  }

  const selectedValue = selected ? board.grid[selected.r][selected.c] : 0;

  return (
    <div className="flex min-h-full flex-col items-center gap-3 bg-gradient-to-b from-amber-100 to-amber-200 p-3 sm:p-4">
      <header className="flex w-full max-w-md items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl" aria-hidden="true">🐹</span>
          <h2 className="text-lg font-bold text-amber-900 sm:text-xl">Судоку Бобра</h2>
        </div>
        <div className="flex items-center gap-3 text-amber-900">
          <div className="flex items-center gap-1" title="Время">
            <Timer className="h-4 w-4" />
            <span className="font-mono font-bold tabular-nums">{formatTime(elapsed)}</span>
          </div>
          <div className="whitespace-nowrap text-sm">
            Ошибки: <span className="font-bold">{errors}</span>
          </div>
        </div>
      </header>

      <div className="flex w-full max-w-md flex-wrap items-center gap-2">
        {DIFFICULTIES.map((d) => (
          <button
            key={d.id}
            onClick={() => startGame(d.id)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors",
              difficulty === d.id
                ? "border-amber-800 bg-amber-700 text-amber-50"
                : "border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100"
            )}
          >
            {d.label}
          </button>
        ))}
        <button
          onClick={() => startGame(difficulty)}
          className="ml-auto flex items-center gap-1.5 rounded-md border border-amber-800 bg-amber-700 px-3 py-1.5 text-sm font-semibold text-amber-50 transition-colors hover:bg-amber-800"
        >
          <RotateCcw className="h-4 w-4" /> Новая игра
        </button>
      </div>

      <div className="relative aspect-square w-full max-w-md">
        <div className="grid h-full w-full grid-cols-3 gap-1 rounded-md bg-amber-900 p-1 shadow-lg">
          {Array.from({ length: 9 }, (_, boxIdx) => {
            const br = Math.floor(boxIdx / 3) * 3;
            const bc = (boxIdx % 3) * 3;
            return (
              <div key={boxIdx} className="grid grid-cols-3 gap-px bg-amber-600">
                {Array.from({ length: 9 }, (_, cellIdx) => {
                  const dr = Math.floor(cellIdx / 3);
                  const dc = cellIdx % 3;
                  const r = br + dr;
                  const c = bc + dc;
                  const value = board.grid[r][c];
                  const isGiven = board.given[r][c];
                  const isSelected = selected !== null && selected.r === r && selected.c === c;
                  const isPeer =
                    selected !== null &&
                    (selected.r === r ||
                      selected.c === c ||
                      (Math.floor(selected.r / 3) === Math.floor(r / 3) &&
                        Math.floor(selected.c / 3) === Math.floor(c / 3)));
                  const isSameNumber = selectedValue !== 0 && value === selectedValue;
                  const conflict = value !== 0 && hasConflict(board.grid, r, c);

                  let bg = "bg-amber-50 hover:bg-amber-100";
                  if (isSelected) bg = "bg-amber-400";
                  else if (conflict) bg = "bg-red-200 hover:bg-red-300";
                  else if (isSameNumber) bg = "bg-amber-300 hover:bg-amber-300";
                  else if (isPeer) bg = "bg-amber-100 hover:bg-amber-200";

                  const text = conflict ? "text-red-800" : isGiven ? "text-amber-900" : "text-blue-700";
                  const weight = isGiven ? "font-bold" : "font-semibold";
                  const cellNotes = board.notes[r][c];

                  return (
                    <button
                      key={`${r}-${c}`}
                      onClick={() => setSelected({ r, c })}
                      className={cn(
                        "relative flex select-none items-center justify-center transition-colors",
                        bg,
                        text,
                        weight
                      )}
                    >
                      {value !== 0 ? (
                        <span className="text-base leading-none sm:text-2xl">{value}</span>
                      ) : cellNotes !== 0 ? (
                        <div className="grid h-full w-full grid-cols-3 grid-rows-3 p-0.5">
                          {Array.from({ length: 9 }, (_, i) => {
                            const nd = i + 1;
                            const has = (cellNotes & (1 << (nd - 1))) !== 0;
                            return (
                              <div
                                key={nd}
                                className="flex items-center justify-center text-[7px] font-medium leading-none text-amber-700 sm:text-[10px]"
                              >
                                {has ? nd : ""}
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {status === "won" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-md bg-amber-950/85 p-6 text-center backdrop-blur-sm">
            <div className="mb-2 text-5xl" aria-hidden="true">🐹</div>
            <h3 className="mb-3 text-2xl font-bold text-amber-200">Победа!</h3>
            <div className="mb-4 space-y-1 text-amber-100">
              <p>
                Время: <span className="font-mono font-bold">{formatTime(elapsed)}</span>
              </p>
              <p>
                Ошибки: <span className="font-bold">{errors}</span>
              </p>
            </div>
            <button
              onClick={() => startGame(difficulty)}
              className="flex items-center gap-1.5 rounded-md bg-amber-500 px-4 py-2 font-bold text-amber-950 transition-colors hover:bg-amber-400"
            >
              <RotateCcw className="h-4 w-4" /> Новая игра
            </button>
          </div>
        )}
      </div>

      <div className="grid w-full max-w-md grid-cols-9 gap-1">
        {Array.from({ length: 9 }, (_, i) => {
          const d = i + 1;
          const count = remaining[d - 1];
          return (
            <button
              key={d}
              onClick={() => placeDigit(d)}
              disabled={status !== "playing"}
              className={cn(
                "flex aspect-square flex-col items-center justify-center rounded-md",
                "border border-amber-400 bg-amber-100 text-amber-900 font-bold transition-colors",
                "hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50",
                notesMode && "ring-2 ring-amber-500 ring-offset-1 ring-offset-amber-200"
              )}
            >
              <span className="text-base leading-none sm:text-xl">{d}</span>
              <span className="mt-0.5 text-[9px] font-medium leading-none text-amber-700">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="flex w-full max-w-md items-center gap-2">
        <button
          onClick={eraseCell}
          disabled={status !== "playing"}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-amber-400 bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-900 transition-colors hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Eraser className="h-4 w-4" /> Стереть
        </button>
        <button
          onClick={() => setNotesMode((m) => !m)}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-semibold transition-colors",
            notesMode
              ? "border-amber-700 bg-amber-600 text-amber-50 hover:bg-amber-700"
              : "border-amber-400 bg-amber-100 text-amber-900 hover:bg-amber-200"
          )}
        >
          <Pencil className="h-4 w-4" /> Заметки
        </button>
        <button
          onClick={handleCheck}
          disabled={status !== "playing"}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-amber-400 bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-900 transition-colors hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Check className="h-4 w-4" /> Проверка
        </button>
      </div>

      {checkResult && status === "playing" && (
        <div
          className={cn(
            "w-full max-w-md rounded-md border px-4 py-2 text-center text-sm font-semibold",
            checkResult === "ok"
              ? "border-green-300 bg-green-100 text-green-800"
              : "border-red-300 bg-red-100 text-red-800"
          )}
        >
          {checkResult === "ok" ? "Пока всё верно! Бобёр доволен. 🐹" : "Есть ошибки! Бобёр хмурится. 😟"}
        </div>
      )}
    </div>
  );
}
