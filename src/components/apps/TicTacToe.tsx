"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Cell = "X" | "O" | null;

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function winnerOf(b: Cell[]): { who: Cell; line: number[] } | null {
  for (const line of LINES) {
    const [a, c, d] = line;
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return { who: b[a], line };
  }
  return null;
}

function beaverMove(b: Cell[]): number {
  const empty = b.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
  for (const i of empty) {
    const t = [...b]; t[i] = "O";
    if (winnerOf(t)?.who === "O") return i;
  }
  for (const i of empty) {
    const t = [...b]; t[i] = "X";
    if (winnerOf(t)?.who === "X") return i;
  }
  if (b[4] === null) return 4;
  const corners = [0, 2, 6, 8].filter((i) => b[i] === null);
  if (corners.length) return corners[Math.floor(Math.random() * corners.length)];
  return empty[Math.floor(Math.random() * empty.length)];
}

export function TicTacToe() {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [turn, setTurn] = useState<"X" | "O">("X");
  const [scores, setScores] = useState({ me: 0, bob: 0, draw: 0 });
  const win = winnerOf(board);
  const full = board.every(Boolean);
  const over = !!win || full;

  const recordResult = (b: Cell[]) => {
    const w = winnerOf(b);
    const f = b.every(Boolean);
    if (w) {
      if (w.who === "X") setScores((s) => ({ ...s, me: s.me + 1 }));
      else setScores((s) => ({ ...s, bob: s.bob + 1 }));
    } else if (f) {
      setScores((s) => ({ ...s, draw: s.draw + 1 }));
    }
  };

  useEffect(() => {
    if (turn === "O" && !over) {
      const t = setTimeout(() => {
        const move = beaverMove(board);
        if (move >= 0) {
          setBoard((b) => {
            if (b[move]) return b;
            const next = [...b]; next[move] = "O";
            recordResult(next);
            return next;
          });
          setTurn("X");
        }
      }, 450);
      return () => clearTimeout(t);
    }
  }, [turn, board, over]);

  const click = (i: number) => {
    if (board[i] || over || turn !== "X") return;
    const next = [...board]; next[i] = "X";
    recordResult(next);
    setBoard(next);
    setTurn("O");
  };

  const reset = () => {
    setBoard(Array(9).fill(null));
    setTurn("X");
  };

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-violet-50 to-purple-100">
      <div className="flex items-center justify-between bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-3 text-white">
        <h1 className="text-lg font-bold">Крестики-нолики</h1>
        <div className="flex gap-3 text-xs">
          <span>Ты: <b className="font-mono">{scores.me}</b></span>
          <span>Бобёр: <b className="font-mono">{scores.bob}</b></span>
          <span>Ничьи: <b className="font-mono">{scores.draw}</b></span>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
        <p className="text-sm text-zinc-500">
          {over
            ? win?.who === "X"
              ? "Ты победил! 🎉"
              : win?.who === "O"
              ? "Бобёр победил! 🐹"
              : "Ничья!"
            : turn === "X"
            ? "Твой ход (X)"
            : "Бобёр думает..."}
        </p>

        <div className="grid grid-cols-3 gap-2">
          {board.map((cell, i) => {
            const isWin = win?.line.includes(i);
            return (
              <button
                key={i}
                onClick={() => click(i)}
                disabled={!!cell || over || turn !== "X"}
                className={cn(
                  "grid h-20 w-20 place-items-center rounded-xl border-2 text-4xl font-black transition-all",
                  isWin
                    ? "border-emerald-400 bg-emerald-100"
                    : "border-violet-200 bg-white hover:border-violet-400",
                  cell === "X" ? "text-violet-600" : "text-amber-600",
                  !cell && turn === "X" && !over && "hover:bg-violet-50"
                )}
              >
                {cell}
              </button>
            );
          })}
        </div>

        <button
          onClick={reset}
          className="rounded-xl bg-violet-500 px-5 py-2 text-sm font-medium text-white hover:bg-violet-600"
        >
          Новая игра
        </button>
      </div>
    </div>
  );
}
