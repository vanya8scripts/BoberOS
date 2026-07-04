"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  RotateCcw,
  Undo2,
  ChevronRight,
  Trophy,
  Grid3x3,
  X,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  PartyPopper,
} from "lucide-react";

type CellType = "wall" | "empty" | "target";

interface Snapshot {
  player: { r: number; c: number };
  boxes: number[];
  moves: number;
  pushes: number;
}

interface GameState {
  cells: CellType[][];
  boxes: Set<number>;
  player: { r: number; c: number };
  width: number;
  height: number;
  moves: number;
  pushes: number;
  history: Snapshot[];
  won: boolean;
}

const LEVELS: string[] = [
  `#######
#     #
#  .  #
#  $  #
#  @  #
#     #
#######`,
  `#########
#       #
#  . .  #
#       #
#  $ $  #
#   @   #
#       #
#########`,
  `########
#      #
#  $   #
#      #
#  @   #
#      #
#   .  #
########`,
  `##########
#        #
#  ...   #
#  $$$   #
#        #
#  @     #
#        #
##########`,
  `##########
#        #
# .    . #
#        #
#  ####  #
#        #
# $    $ #
#   @    #
##########`,
  `##########
#        #
#  $   . #
######   #
#        #
#  @     #
#        #
##########`,
  `#########
#       #
# ...   #
#       #
# $$$   #
#    @  #
#       #
#########`,
];

const DIRS: Record<string, { dr: number; dc: number }> = {
  ArrowUp: { dr: -1, dc: 0 },
  ArrowDown: { dr: 1, dc: 0 },
  ArrowLeft: { dr: 0, dc: -1 },
  ArrowRight: { dr: 0, dc: 1 },
  w: { dr: -1, dc: 0 },
  s: { dr: 1, dc: 0 },
  a: { dr: 0, dc: -1 },
  d: { dr: 0, dc: 1 },
};

const STORAGE_KEY = "boberos-sokoban-progress";
const CELL = 42;

function parseLevel(raw: string): GameState {
  const lines = raw.split("\n");
  const height = lines.length;
  const width = Math.max(1, ...lines.map((l) => l.length));
  const cells: CellType[][] = [];
  const boxes = new Set<number>();
  let player = { r: 0, c: 0 };
  for (let r = 0; r < height; r++) {
    const row: CellType[] = [];
    const line = lines[r] ?? "";
    for (let c = 0; c < width; c++) {
      const ch = line[c] ?? " ";
      switch (ch) {
        case "#": row.push("wall"); break;
        case ".": row.push("target"); break;
        case "$": row.push("empty"); boxes.add(r * width + c); break;
        case "*": row.push("target"); boxes.add(r * width + c); break;
        case "@": row.push("empty"); player = { r, c }; break;
        case "+": row.push("target"); player = { r, c }; break;
        default: row.push("empty");
      }
    }
    cells.push(row);
  }
  return { cells, boxes, player, width, height, moves: 0, pushes: 0, history: [], won: false };
}

function checkWin(cells: CellType[][], boxes: Set<number>, width: number): boolean {
  for (const idx of boxes) {
    const r = Math.floor(idx / width);
    const c = idx % width;
    if (cells[r][c] !== "target") return false;
  }
  return true;
}

function applyMove(prev: GameState, dr: number, dc: number): GameState | null {
  if (prev.won) return null;
  const { r, c } = prev.player;
  const nr = r + dr;
  const nc = c + dc;
  if (nr < 0 || nr >= prev.height || nc < 0 || nc >= prev.width) return null;
  if (prev.cells[nr][nc] === "wall") return null;
  const boxKey = nr * prev.width + nc;
  const snapshot: Snapshot = {
    player: { r, c },
    boxes: Array.from(prev.boxes),
    moves: prev.moves,
    pushes: prev.pushes,
  };
  if (prev.boxes.has(boxKey)) {
    const br = nr + dr;
    const bc = nc + dc;
    if (br < 0 || br >= prev.height || bc < 0 || bc >= prev.width) return null;
    if (prev.cells[br][bc] === "wall") return null;
    const beyondKey = br * prev.width + bc;
    if (prev.boxes.has(beyondKey)) return null;
    const newBoxes = new Set(prev.boxes);
    newBoxes.delete(boxKey);
    newBoxes.add(beyondKey);
    return {
      ...prev,
      boxes: newBoxes,
      player: { r: nr, c: nc },
      moves: prev.moves + 1,
      pushes: prev.pushes + 1,
      history: [...prev.history, snapshot],
      won: checkWin(prev.cells, newBoxes, prev.width),
    };
  }
  return {
    ...prev,
    player: { r: nr, c: nc },
    moves: prev.moves + 1,
    history: [...prev.history, snapshot],
  };
}

function applyUndo(prev: GameState): GameState | null {
  if (prev.history.length === 0) return null;
  const last = prev.history[prev.history.length - 1];
  return {
    ...prev,
    player: last.player,
    boxes: new Set(last.boxes),
    moves: last.moves,
    pushes: last.pushes,
    history: prev.history.slice(0, -1),
    won: false,
  };
}

function loadUnlocked(): number {
  if (typeof window === "undefined") return 1;
  try {
    const v = parseInt(window.localStorage.getItem(STORAGE_KEY) ?? "", 10);
    return Number.isNaN(v) ? 1 : Math.max(1, Math.min(LEVELS.length, v));
  } catch {
    return 1;
  }
}

function saveUnlocked(v: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(v));
  } catch {
    /* ignore */
  }
}

export function Sokoban() {
  const [levelIdx, setLevelIdx] = useState(0);
  const [unlocked, setUnlocked] = useState<number>(() => loadUnlocked());
  const [game, setGame] = useState<GameState>(() => parseLevel(LEVELS[0]));
  const [showSelector, setShowSelector] = useState(false);
  const [allDone, setAllDone] = useState(false);

  const gameRef = useRef(game);
  const levelIdxRef = useRef(levelIdx);
  useEffect(() => { gameRef.current = game; }, [game]);
  useEffect(() => { levelIdxRef.current = levelIdx; }, [levelIdx]);

  const loadLevel = useCallback((idx: number) => {
    const next = parseLevel(LEVELS[idx]);
    gameRef.current = next;
    setGame(next);
    levelIdxRef.current = idx;
    setLevelIdx(idx);
    setAllDone(false);
    setShowSelector(false);
  }, []);

  const move = useCallback((dr: number, dc: number) => {
    const prev = gameRef.current;
    const next = applyMove(prev, dr, dc);
    if (next === null) return;
    gameRef.current = next;
    setGame(next);
    if (next.won && !prev.won) {
      setUnlocked((prevU) => {
        const newU = Math.max(prevU, levelIdxRef.current + 2);
        if (newU !== prevU) saveUnlocked(newU);
        return newU;
      });
      if (levelIdxRef.current >= LEVELS.length - 1) {
        setAllDone(true);
      }
    }
  }, []);

  const undo = useCallback(() => {
    const next = applyUndo(gameRef.current);
    if (next === null) return;
    gameRef.current = next;
    setGame(next);
  }, []);

  const restart = useCallback(() => {
    const next = parseLevel(LEVELS[levelIdxRef.current]);
    gameRef.current = next;
    setGame(next);
    setAllDone(false);
  }, []);

  const goNextLevel = useCallback(() => {
    loadLevel(Math.min(LEVELS.length - 1, levelIdxRef.current + 1));
  }, [loadLevel]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const k = e.key;
      if (k === "r" || k === "R") { e.preventDefault(); restart(); return; }
      if (k === "z" || k === "Z") { e.preventDefault(); undo(); return; }
      const dir = DIRS[k] ?? DIRS[k.toLowerCase()];
      if (dir) {
        e.preventDefault();
        move(dir.dr, dir.dc);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move, restart, undo]);

  const renderCell = (r: number, c: number) => {
    const idx = r * game.width + c;
    const cell = game.cells[r][c];
    const isBox = game.boxes.has(idx);
    const isPlayer = game.player.r === r && game.player.c === c;
    const isTarget = cell === "target";
    const boxOnTarget = isBox && isTarget;
    return (
      <div
        key={`${r}-${c}`}
        className="relative flex items-center justify-center"
        style={{ width: CELL, height: CELL }}
      >
        {cell === "wall" ? (
          <div className="absolute inset-[2px] rounded-[3px] bg-gradient-to-br from-amber-700 to-amber-900 border border-amber-950/60 shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)]" />
        ) : (
          <div className={`absolute inset-0 border ${isTarget ? "bg-amber-100 border-amber-200/60" : "bg-amber-50/50 border-amber-200/30"}`} />
        )}
        {isTarget && !isBox && (
          <div className="absolute w-3 h-3 rounded-full bg-rose-400/90 shadow-[0_0_10px_3px_rgba(244,63,94,0.55)] animate-pulse" />
        )}
        {isBox && (
          <div className={`absolute inset-1 flex items-center justify-center rounded-md shadow-sm transition-all ${boxOnTarget ? "bg-emerald-200/80 ring-2 ring-emerald-500" : "bg-amber-100/85 ring-1 ring-amber-700/40"}`}>
            <span className="text-2xl leading-none select-none">🌿</span>
          </div>
        )}
        {isPlayer && (
          <div className="absolute inset-0.5 flex items-center justify-center rounded-full bg-amber-300/40 shadow-[0_2px_6px_rgba(0,0,0,0.25)]">
            <span className="text-3xl leading-none select-none drop-shadow-sm">🐹</span>
          </div>
        )}
      </div>
    );
  };

  const dpadBtn = (dir: { dr: number; dc: number }, Icon: typeof ArrowUp, label: string, className: string) => (
    <button
      onPointerDown={(e) => { e.preventDefault(); move(dir.dr, dir.dc); }}
      className={`w-8 h-8 rounded-md bg-amber-700 hover:bg-amber-600 active:scale-95 transition flex items-center justify-center ${className}`}
      aria-label={label}
    >
      <Icon className="w-4 h-4" />
    </button>
  );

  return (
    <div className="relative flex flex-col h-full w-full bg-gradient-to-b from-amber-50 to-orange-100 text-amber-950 select-none overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-amber-900 text-amber-50 shadow-md shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🐹</span>
          <div>
            <div className="font-bold text-sm leading-tight">Сокобан Бобра</div>
            <div className="text-[10px] text-amber-200/80 leading-tight">Толкай брёвна на цели</div>
          </div>
        </div>
        <button
          onClick={() => setShowSelector(true)}
          className="px-2.5 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-600 active:scale-95 transition text-[11px] font-semibold flex items-center gap-1.5"
        >
          <Grid3x3 className="w-3.5 h-3.5" />
          Уровни
        </button>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between gap-2 px-4 py-1.5 bg-amber-100/80 border-b border-amber-200 text-xs shrink-0">
        <div className="font-semibold">
          Уровень <span className="text-amber-700">{levelIdx + 1}/{LEVELS.length}</span>
        </div>
        <div className="flex items-center gap-3">
          <div>Ходы: <span className="font-mono font-bold text-amber-800">{game.moves}</span></div>
          <div>Толчки: <span className="font-mono font-bold text-amber-800">{game.pushes}</span></div>
        </div>
      </div>

      {/* Game board */}
      <div className="flex-1 min-h-0 flex items-center justify-center overflow-auto p-3">
        <div
          className="relative bg-amber-200/60 rounded-lg shadow-inner p-1.5 ring-1 ring-amber-300/60"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${game.width}, ${CELL}px)`,
            gridTemplateRows: `repeat(${game.height}, ${CELL}px)`,
            gap: 0,
          }}
        >
          {game.cells.map((row, r) => row.map((_, c) => renderCell(r, c)))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-amber-900 text-amber-50 shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            onClick={undo}
            disabled={game.history.length === 0}
            className="px-2.5 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition text-[11px] font-semibold flex items-center gap-1.5"
          >
            <Undo2 className="w-3.5 h-3.5" />
            Отмена
          </button>
          <button
            onClick={restart}
            className="px-2.5 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-600 active:scale-95 transition text-[11px] font-semibold flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Заново
          </button>
        </div>
        {/* On-screen D-pad */}
        <div className="grid grid-cols-3 gap-1">
          <div />
          {dpadBtn({ dr: -1, dc: 0 }, ArrowUp, "Вверх", "")}
          <div />
          {dpadBtn({ dr: 0, dc: -1 }, ArrowLeft, "Влево", "")}
          {dpadBtn({ dr: 1, dc: 0 }, ArrowDown, "Вниз", "")}
          {dpadBtn({ dr: 0, dc: 1 }, ArrowRight, "Вправо", "")}
        </div>
      </div>

      {/* Level-complete overlay */}
      {game.won && !allDone && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-amber-950/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-5 max-w-xs w-full text-center">
            <div className="text-5xl mb-1">🏆</div>
            <div className="text-xl font-bold text-amber-900 mb-1">Уровень пройден!</div>
            <div className="text-xs text-amber-700 mb-4">
              Ходов: <span className="font-mono font-bold">{game.moves}</span> · Толчки:{" "}
              <span className="font-mono font-bold">{game.pushes}</span>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={goNextLevel}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 active:scale-95 transition text-white font-semibold text-sm flex items-center justify-center gap-1.5"
              >
                Следующий уровень
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={restart}
                className="px-4 py-2 rounded-lg bg-amber-100 hover:bg-amber-200 active:scale-95 transition text-amber-800 font-medium text-sm flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Пройти заново
              </button>
            </div>
          </div>
        </div>
      )}

      {/* All-complete overlay */}
      {allDone && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-gradient-to-b from-emerald-900/90 to-amber-950/90 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center">
            <div className="text-6xl mb-2 animate-bounce">🎉</div>
            <div className="flex items-center justify-center gap-2 text-2xl font-bold text-emerald-700 mb-1">
              <PartyPopper className="w-6 h-6" />
              Поздравляем!
            </div>
            <div className="text-base font-semibold text-amber-900 mb-2">
              Все уровни пройдены
            </div>
            <div className="text-xs text-amber-600 mb-5">
              Бобёр сложил все брёвна на плотину. Ты настоящий мастер Сокобана!
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => loadLevel(0)}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 active:scale-95 transition text-white font-semibold text-sm flex items-center justify-center gap-1.5"
              >
                <Trophy className="w-4 h-4" />
                Пройти сначала
              </button>
              <button
                onClick={() => { setAllDone(false); setShowSelector(true); }}
                className="px-4 py-2 rounded-lg bg-amber-100 hover:bg-amber-200 active:scale-95 transition text-amber-800 font-medium text-sm flex items-center justify-center gap-1.5"
              >
                <Grid3x3 className="w-4 h-4" />
                Выбор уровня
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Level selector */}
      {showSelector && !allDone && (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center bg-amber-950/70 backdrop-blur-sm p-4"
          onClick={() => setShowSelector(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-5 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="font-bold text-amber-900">Выбор уровня</div>
              <button
                onClick={() => setShowSelector(false)}
                className="text-amber-700 hover:bg-amber-100 rounded p-1"
                aria-label="Закрыть"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {LEVELS.map((_, idx) => {
                const isLocked = idx >= unlocked;
                const isCurrent = idx === levelIdx;
                return (
                  <button
                    key={idx}
                    onClick={() => !isLocked && loadLevel(idx)}
                    disabled={isLocked}
                    className={`aspect-square rounded-lg font-bold text-sm transition active:scale-95 flex items-center justify-center ${
                      isCurrent
                        ? "bg-amber-600 text-white ring-2 ring-amber-300"
                        : isLocked
                          ? "bg-amber-100 text-amber-400 cursor-not-allowed"
                          : "bg-amber-100 hover:bg-amber-200 text-amber-800"
                    }`}
                  >
                    {isLocked ? "🔒" : idx + 1}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 text-[11px] text-amber-600 text-center">
              Проходи уровни, чтобы открывать новые!
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
