"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Crown, RotateCcw, Swords, Sparkles, Hand } from "lucide-react";

type Color = "w" | "b";
type PieceType = "k" | "q" | "r" | "b" | "n" | "p";
interface Piece { type: PieceType; color: Color; moved: boolean; }
type Square = Piece | null;
type Board = Square[][];
interface Pos { r: number; c: number; }
interface Move {
  from: Pos;
  to: Pos;
  captured?: PieceType;
  special?: "castle-k" | "castle-q" | "enpassant" | "promote";
}
type Phase = "ready" | "playing" | "check" | "gameover";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"];

const VALUE: Record<PieceType, number> = {
  p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000,
};

const KNIGHT_DELTAS: ReadonlyArray<readonly [number, number]> = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2],
  [1, -2], [1, 2], [2, -1], [2, 1],
];
const KING_DELTAS: ReadonlyArray<readonly [number, number]> = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1],
];
const DIAG_DELTAS: ReadonlyArray<readonly [number, number]> = [
  [-1, -1], [-1, 1], [1, -1], [1, 1],
];
const ORTHO_DELTAS: ReadonlyArray<readonly [number, number]> = [
  [-1, 0], [1, 0], [0, -1], [0, 1],
];

const PIECE_NAME: Record<PieceType, string> = {
  k: "Король", q: "Ферзь", r: "Ладья", b: "Слон", n: "Конь", p: "Пешка",
};

const PIECE_EMOJI_W: Record<PieceType, string> = {
  k: "🐹", q: "🦫", r: "🏰", b: "🌲", n: "🐎", p: "🐿️",
};
const PIECE_EMOJI_B: Record<PieceType, string> = {
  k: "🐻", q: "🦡", r: "🪨", b: "🍂", n: "🐺", p: "🐾",
};

const PST_PAWN: number[] = [
  0, 0, 0, 0, 0, 0, 0, 0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
  5, 5, 10, 25, 25, 10, 5, 5,
  0, 0, 0, 20, 20, 0, 0, 0,
  5, -5, -10, 0, 0, -10, -5, 5,
  10, 10, 10, -20, -20, 10, 10, 10,
  0, 0, 0, 0, 0, 0, 0, 0,
];

function initialBoard(): Board {
  const b: Board = Array.from({ length: 8 }, () => Array<Square>(8).fill(null));
  const back: PieceType[] = ["r", "n", "b", "q", "k", "b", "n", "r"];
  for (let c = 0; c < 8; c++) {
    b[0][c] = { type: back[c], color: "b", moved: false };
    b[1][c] = { type: "p", color: "b", moved: false };
    b[6][c] = { type: "p", color: "w", moved: false };
    b[7][c] = { type: back[c], color: "w", moved: false };
  }
  return b;
}

function cloneBoard(b: Board): Board {
  return b.map(row => row.map(sq => sq ? { ...sq } : null));
}

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function findKing(b: Board, color: Color): Pos | null {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const s = b[r][c];
      if (s && s.type === "k" && s.color === color) return { r, c };
    }
  }
  return null;
}

function isSquareAttacked(b: Board, pos: Pos, by: Color): boolean {
  const { r, c } = pos;
  for (const [dr, dc] of KNIGHT_DELTAS) {
    const nr = r + dr, nc = c + dc;
    if (!inBounds(nr, nc)) continue;
    const s = b[nr][nc];
    if (s && s.color === by && s.type === "n") return true;
  }
  const pdir = by === "w" ? 1 : -1;
  for (const dc of [-1, 1]) {
    const nr = r + pdir, nc = c + dc;
    if (!inBounds(nr, nc)) continue;
    const s = b[nr][nc];
    if (s && s.color === by && s.type === "p") return true;
  }
  for (const [dr, dc] of KING_DELTAS) {
    const nr = r + dr, nc = c + dc;
    if (!inBounds(nr, nc)) continue;
    const s = b[nr][nc];
    if (s && s.color === by && s.type === "k") return true;
  }
  for (const [dr, dc] of DIAG_DELTAS) {
    let nr = r + dr, nc = c + dc;
    while (inBounds(nr, nc)) {
      const s = b[nr][nc];
      if (s) {
        if (s.color === by && (s.type === "b" || s.type === "q")) return true;
        break;
      }
      nr += dr; nc += dc;
    }
  }
  for (const [dr, dc] of ORTHO_DELTAS) {
    let nr = r + dr, nc = c + dc;
    while (inBounds(nr, nc)) {
      const s = b[nr][nc];
      if (s) {
        if (s.color === by && (s.type === "r" || s.type === "q")) return true;
        break;
      }
      nr += dr; nc += dc;
    }
  }
  return false;
}

function addPawnMoves(b: Board, from: Pos, color: Color, ep: Pos | null, moves: Move[]): void {
  const { r, c } = from;
  const dir = color === "w" ? -1 : 1;
  const startRank = color === "w" ? 6 : 1;
  const promoteRank = color === "w" ? 0 : 7;
  const oneR = r + dir;
  if (inBounds(oneR, c) && !b[oneR][c]) {
    if (oneR === promoteRank) {
      moves.push({ from, to: { r: oneR, c }, special: "promote" });
    } else {
      moves.push({ from, to: { r: oneR, c } });
    }
    if (r === startRank) {
      const twoR = r + 2 * dir;
      if (inBounds(twoR, c) && !b[twoR][c]) {
        moves.push({ from, to: { r: twoR, c } });
      }
    }
  }
  for (const dc of [-1, 1]) {
    const nc = c + dc;
    if (!inBounds(oneR, nc)) continue;
    const t = b[oneR][nc];
    if (t && t.color !== color) {
      if (oneR === promoteRank) {
        moves.push({ from, to: { r: oneR, c: nc }, special: "promote", captured: t.type });
      } else {
        moves.push({ from, to: { r: oneR, c: nc }, captured: t.type });
      }
    } else if (ep && ep.r === oneR && ep.c === nc) {
      moves.push({ from, to: { r: oneR, c: nc }, special: "enpassant", captured: "p" });
    }
  }
}

function addKnightMoves(b: Board, from: Pos, color: Color, moves: Move[]): void {
  for (const [dr, dc] of KNIGHT_DELTAS) {
    const nr = from.r + dr, nc = from.c + dc;
    if (!inBounds(nr, nc)) continue;
    const t = b[nr][nc];
    if (!t) moves.push({ from, to: { r: nr, c: nc } });
    else if (t.color !== color) moves.push({ from, to: { r: nr, c: nc }, captured: t.type });
  }
}

function addSliding(
  b: Board, from: Pos, color: Color,
  deltas: ReadonlyArray<readonly [number, number]>, moves: Move[],
): void {
  for (const [dr, dc] of deltas) {
    let nr = from.r + dr, nc = from.c + dc;
    while (inBounds(nr, nc)) {
      const t = b[nr][nc];
      if (!t) {
        moves.push({ from, to: { r: nr, c: nc } });
      } else {
        if (t.color !== color) moves.push({ from, to: { r: nr, c: nc }, captured: t.type });
        break;
      }
      nr += dr; nc += dc;
    }
  }
}

function canCastleKingside(b: Board, color: Color, enemy: Color): boolean {
  const r = color === "w" ? 7 : 0;
  const king = b[r][4];
  const rook = b[r][7];
  if (!king || king.type !== "k" || king.moved) return false;
  if (!rook || rook.type !== "r" || rook.color !== color || rook.moved) return false;
  if (b[r][5] || b[r][6]) return false;
  if (isSquareAttacked(b, { r, c: 4 }, enemy)) return false;
  if (isSquareAttacked(b, { r, c: 5 }, enemy)) return false;
  if (isSquareAttacked(b, { r, c: 6 }, enemy)) return false;
  return true;
}

function canCastleQueenside(b: Board, color: Color, enemy: Color): boolean {
  const r = color === "w" ? 7 : 0;
  const king = b[r][4];
  const rook = b[r][0];
  if (!king || king.type !== "k" || king.moved) return false;
  if (!rook || rook.type !== "r" || rook.color !== color || rook.moved) return false;
  if (b[r][1] || b[r][2] || b[r][3]) return false;
  if (isSquareAttacked(b, { r, c: 4 }, enemy)) return false;
  if (isSquareAttacked(b, { r, c: 3 }, enemy)) return false;
  if (isSquareAttacked(b, { r, c: 2 }, enemy)) return false;
  return true;
}

function addKingMoves(b: Board, from: Pos, color: Color, moves: Move[]): void {
  for (const [dr, dc] of KING_DELTAS) {
    const nr = from.r + dr, nc = from.c + dc;
    if (!inBounds(nr, nc)) continue;
    const t = b[nr][nc];
    if (!t) moves.push({ from, to: { r: nr, c: nc } });
    else if (t.color !== color) moves.push({ from, to: { r: nr, c: nc }, captured: t.type });
  }
  const enemy: Color = color === "w" ? "b" : "w";
  if (canCastleKingside(b, color, enemy)) {
    moves.push({ from, to: { r: from.r, c: from.c + 2 }, special: "castle-k" });
  }
  if (canCastleQueenside(b, color, enemy)) {
    moves.push({ from, to: { r: from.r, c: from.c - 2 }, special: "castle-q" });
  }
}

function generateMoves(b: Board, color: Color, ep: Pos | null): Move[] {
  const moves: Move[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const s = b[r][c];
      if (!s || s.color !== color) continue;
      const from = { r, c };
      switch (s.type) {
        case "p": addPawnMoves(b, from, color, ep, moves); break;
        case "n": addKnightMoves(b, from, color, moves); break;
        case "b": addSliding(b, from, color, DIAG_DELTAS, moves); break;
        case "r": addSliding(b, from, color, ORTHO_DELTAS, moves); break;
        case "q": addSliding(b, from, color, [...DIAG_DELTAS, ...ORTHO_DELTAS], moves); break;
        case "k": addKingMoves(b, from, color, moves); break;
      }
    }
  }
  return moves;
}

function applyMove(b: Board, m: Move): { board: Board; ep: Pos | null } {
  const nb = cloneBoard(b);
  const piece = nb[m.from.r][m.from.c];
  if (!piece) return { board: nb, ep: null };
  const dir = piece.color === "w" ? -1 : 1;
  let newEp: Pos | null = null;
  if (piece.type === "p" && Math.abs(m.to.r - m.from.r) === 2) {
    newEp = { r: m.from.r + dir, c: m.from.c };
  }
  if (m.special === "enpassant") {
    nb[m.from.r][m.to.c] = null;
  }
  nb[m.from.r][m.from.c] = null;
  let placed: Piece = { ...piece, moved: true };
  if (m.special === "promote") {
    placed = { type: "q", color: piece.color, moved: true };
  }
  nb[m.to.r][m.to.c] = placed;
  if (m.special === "castle-k") {
    const r = m.from.r;
    const rook = nb[r][7];
    if (rook) {
      nb[r][7] = null;
      nb[r][5] = { ...rook, moved: true };
    }
  }
  if (m.special === "castle-q") {
    const r = m.from.r;
    const rook = nb[r][0];
    if (rook) {
      nb[r][0] = null;
      nb[r][3] = { ...rook, moved: true };
    }
  }
  return { board: nb, ep: newEp };
}

function legalMoves(b: Board, color: Color, ep: Pos | null): Move[] {
  const pseudo = generateMoves(b, color, ep);
  const enemy: Color = color === "w" ? "b" : "w";
  const result: Move[] = [];
  for (const m of pseudo) {
    const { board: nb } = applyMove(b, m);
    const king = findKing(nb, color);
    if (king && !isSquareAttacked(nb, king, enemy)) {
      result.push(m);
    }
  }
  return result;
}

function isInCheck(b: Board, color: Color): boolean {
  const king = findKing(b, color);
  if (!king) return false;
  const enemy: Color = color === "w" ? "b" : "w";
  return isSquareAttacked(b, king, enemy);
}

function pieceSquareBonus(s: Piece, r: number, c: number): number {
  const idx = s.color === "w" ? r * 8 + c : (7 - r) * 8 + c;
  switch (s.type) {
    case "p": return PST_PAWN[idx] || 0;
    case "n": return 30 - Math.abs(3.5 - c) - Math.abs(3.5 - r) * 2;
    case "b": return 30 - Math.abs(3.5 - c) - Math.abs(3.5 - r);
    case "r": return 0;
    case "q": return 20 - Math.abs(3.5 - c) - Math.abs(3.5 - r);
    case "k": return -10 - (s.color === "w" ? r : 7 - r) * 2;
  }
}

function evaluate(b: Board): number {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const s = b[r][c];
      if (!s) continue;
      const v = VALUE[s.type] + pieceSquareBonus(s, r, c);
      score += s.color === "b" ? v : -v;
    }
  }
  return score;
}

function minimax(
  b: Board, ep: Pos | null, depth: number,
  alpha: number, beta: number, color: Color,
): number {
  if (depth === 0) return evaluate(b);
  const moves = legalMoves(b, color, ep);
  if (moves.length === 0) {
    if (isInCheck(b, color)) return color === "b" ? -100000 - depth : 100000 + depth;
    return 0;
  }
  if (color === "b") {
    let best = -Infinity;
    for (const m of moves) {
      const { board: nb, ep: nep } = applyMove(b, m);
      const score = minimax(nb, nep, depth - 1, alpha, beta, "w");
      if (score > best) best = score;
      if (best > alpha) alpha = best;
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of moves) {
      const { board: nb, ep: nep } = applyMove(b, m);
      const score = minimax(nb, nep, depth - 1, alpha, beta, "b");
      if (score < best) best = score;
      if (best < beta) beta = best;
      if (beta <= alpha) break;
    }
    return best;
  }
}

function findBestMove(b: Board, color: Color, ep: Pos | null): Move | null {
  const moves = legalMoves(b, color, ep);
  if (moves.length === 0) return null;
  let bestScore = color === "b" ? -Infinity : Infinity;
  let bestMove: Move | null = null;
  const shuffled = [...moves].sort(() => Math.random() - 0.5);
  for (const m of shuffled) {
    const { board: nb, ep: nep } = applyMove(b, m);
    const score = minimax(nb, nep, 1, -Infinity, Infinity, color === "b" ? "w" : "b");
    if (color === "b") {
      if (score > bestScore) { bestScore = score; bestMove = m; }
    } else {
      if (score < bestScore) { bestScore = score; bestMove = m; }
    }
  }
  return bestMove;
}

function moveToAlgebraic(m: Move): string {
  if (m.special === "castle-k") return "O-O";
  if (m.special === "castle-q") return "O-O-O";
  const from = `${FILES[m.from.c]}${RANKS[m.from.r]}`;
  const to = `${FILES[m.to.c]}${RANKS[m.to.r]}`;
  const sep = m.captured ? "x" : "-";
  const promo = m.special === "promote" ? "=Q" : "";
  return `${from}${sep}${to}${promo}`;
}

function drawPiece(
  ctx: CanvasRenderingContext2D, s: Square, x: number, y: number, size: number,
): void {
  if (!s) return;
  const cx = x + size / 2;
  const cy = y + size / 2;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (s.type === "k") {
    const animal = s.color === "w" ? PIECE_EMOJI_W.k : PIECE_EMOJI_B.k;
    ctx.font = `${Math.floor(size * 0.55)}px serif`;
    ctx.fillText(animal, cx, cy + size * 0.06);
    ctx.font = `${Math.floor(size * 0.34)}px serif`;
    ctx.fillText("👑", cx, cy - size * 0.26);
    return;
  }
  const emoji = s.color === "w" ? PIECE_EMOJI_W[s.type] : PIECE_EMOJI_B[s.type];
  ctx.font = `${Math.floor(size * 0.62)}px serif`;
  ctx.fillText(emoji, cx, cy);
}

export function BoberChess() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sizeRef = useRef(420);

  const boardRef = useRef<Board>(initialBoard());
  const epRef = useRef<Pos | null>(null);
  const turnRef = useRef<Color>("w");
  const selectedRef = useRef<Pos | null>(null);
  const legalForSelRef = useRef<Move[]>([]);
  const lastMoveRef = useRef<{ from: Pos; to: Pos } | null>(null);
  const phaseRef = useRef<Phase>("ready");
  const aiThinkingRef = useRef<boolean>(false);
  const checkColorRef = useRef<Color | null>(null);
  const winnerRef = useRef<Color | null>(null);
  const historyRef = useRef<string[]>([]);

  const [phase, setPhase] = useState<Phase>("ready");
  const [turn, setTurn] = useState<Color>("w");
  const [status, setStatus] = useState<string>("Ваш ход");
  const [history, setHistory] = useState<string[]>([]);
  const [aiThinking, setAiThinking] = useState<boolean>(false);
  const [captured, setCaptured] = useState<{ w: PieceType[]; b: PieceType[] }>({ w: [], b: [] });

  const setPhaseSync = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const newGame = useCallback(() => {
    boardRef.current = initialBoard();
    epRef.current = null;
    turnRef.current = "w";
    selectedRef.current = null;
    legalForSelRef.current = [];
    lastMoveRef.current = null;
    checkColorRef.current = null;
    winnerRef.current = null;
    historyRef.current = [];
    aiThinkingRef.current = false;
    setTurn("w");
    setStatus("Ваш ход");
    setHistory([]);
    setAiThinking(false);
    setCaptured({ w: [], b: [] });
    setPhaseSync("playing");
  }, [setPhaseSync]);

  const cellAt = useCallback((px: number, py: number): Pos | null => {
    const size = sizeRef.current;
    const margin = 22;
    const boardSize = size - margin * 2;
    const cell = boardSize / 8;
    const x = px - margin;
    const y = py - margin;
    if (x < 0 || y < 0 || x > boardSize || y > boardSize) return null;
    return { r: Math.floor(y / cell), c: Math.floor(x / cell) };
  }, []);

  const finalizeAfterMove = useCallback(
    (nb: Board, nep: Pos | null, moverColor: Color) => {
      const next: Color = moverColor === "w" ? "b" : "w";
      turnRef.current = next;
      setTurn(next);
      selectedRef.current = null;
      legalForSelRef.current = [];
      const inCheck = isInCheck(nb, next);
      const moves = legalMoves(nb, next, nep);
      if (moves.length === 0) {
        if (inCheck) {
          winnerRef.current = moverColor;
          setStatus(moverColor === "w" ? "Мат! Бобры победили!" : "Мат! Барсуки победили!");
        } else {
          winnerRef.current = null;
          setStatus("Пат! Ничья.");
        }
        setPhaseSync("gameover");
        return false;
      }
      if (inCheck) {
        checkColorRef.current = next;
        setPhaseSync("check");
        setStatus(next === "w" ? "Шах! Защитите короля" : "Шах барсукам!");
      } else {
        checkColorRef.current = null;
        setPhaseSync("playing");
        setStatus(next === "w" ? "Ваш ход" : "Барсуки думают...");
      }
      return true;
    },
    [setPhaseSync],
  );

  const aiMove = useCallback(() => {
    if (phaseRef.current === "gameover" || phaseRef.current === "ready") return;
    if (turnRef.current !== "b") return;
    aiThinkingRef.current = true;
    setAiThinking(true);
    setStatus("Барсуки думают...");
    window.setTimeout(() => {
      const m = findBestMove(boardRef.current, "b", epRef.current);
      aiThinkingRef.current = false;
      setAiThinking(false);
      if (!m) {
        const inCheck = isInCheck(boardRef.current, "b");
        if (inCheck) {
          winnerRef.current = "w";
          setStatus("Мат! Бобры победили!");
        } else {
          winnerRef.current = null;
          setStatus("Пат! Ничья.");
        }
        setPhaseSync("gameover");
        return;
      }
      const board = boardRef.current;
      const capturedPiece = m.captured;
      const { board: nb, ep: nep } = applyMove(board, m);
      boardRef.current = nb;
      epRef.current = nep;
      lastMoveRef.current = { from: m.from, to: m.to };
      historyRef.current = [...historyRef.current, moveToAlgebraic(m)];
      setHistory(historyRef.current);
      if (capturedPiece) {
        setCaptured(prev => ({ ...prev, b: [...prev.b, capturedPiece] }));
      }
      finalizeAfterMove(nb, nep, "b");
    }, 280);
  }, [setPhaseSync, finalizeAfterMove]);

  const attemptMove = useCallback((to: Pos): boolean => {
    const sel = selectedRef.current;
    if (!sel) return false;
    const legal = legalForSelRef.current;
    const found = legal.find(m => m.to.r === to.r && m.to.c === to.c);
    if (!found) return false;
    const board = boardRef.current;
    const capturedPiece = found.captured;
    const piece = board[sel.r][sel.c];
    const { board: nb, ep: nep } = applyMove(board, found);
    boardRef.current = nb;
    epRef.current = nep;
    lastMoveRef.current = { from: found.from, to: found.to };
    historyRef.current = [...historyRef.current, moveToAlgebraic(found)];
    setHistory(historyRef.current);
    if (capturedPiece) {
      const capturer = piece ? piece.color : "w";
      setCaptured(prev => ({
        ...prev,
        [capturer]: [...prev[capturer], capturedPiece],
      }));
    }
    const cont = finalizeAfterMove(nb, nep, "w");
    if (cont) {
      window.setTimeout(aiMove, 320);
    }
    return true;
  }, [aiMove, finalizeAfterMove]);

  const onCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (phaseRef.current === "ready" || phaseRef.current === "gameover") return;
    if (turnRef.current !== "w") return;
    if (aiThinkingRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = cellAt(e.clientX - rect.left, e.clientY - rect.top);
    if (!pos) return;
    const board = boardRef.current;
    const sel = selectedRef.current;
    if (sel) {
      if (sel.r === pos.r && sel.c === pos.c) {
        selectedRef.current = null;
        legalForSelRef.current = [];
        return;
      }
      const moved = attemptMove(pos);
      if (moved) return;
      const s = board[pos.r][pos.c];
      if (s && s.color === "w") {
        selectedRef.current = pos;
        legalForSelRef.current = legalMoves(board, "w", epRef.current)
          .filter(m => m.from.r === pos.r && m.from.c === pos.c);
        return;
      }
      selectedRef.current = null;
      legalForSelRef.current = [];
      return;
    }
    const s = board[pos.r][pos.c];
    if (s && s.color === "w") {
      selectedRef.current = pos;
      legalForSelRef.current = legalMoves(board, "w", epRef.current)
        .filter(m => m.from.r === pos.r && m.from.c === pos.c);
    }
  }, [cellAt, attemptMove]);

  const draw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const size = sizeRef.current;
    const margin = 22;
    const boardSize = size - margin * 2;
    const cell = boardSize / 8;

    const bg = ctx.createLinearGradient(0, 0, 0, size);
    bg.addColorStop(0, "#241a10");
    bg.addColorStop(1, "#0f0a06");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);

    const board = boardRef.current;
    const sel = selectedRef.current;
    const legal = legalForSelRef.current;
    const last = lastMoveRef.current;
    const checkC = checkColorRef.current;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const x = margin + c * cell;
        const y = margin + r * cell;
        const light = (r + c) % 2 === 0;
        ctx.fillStyle = light ? "#ecd6a8" : "#7a4a26";
        ctx.fillRect(x, y, cell, cell);
        if (last && ((last.from.r === r && last.from.c === c) || (last.to.r === r && last.to.c === c))) {
          ctx.fillStyle = "rgba(255, 210, 70, 0.40)";
          ctx.fillRect(x, y, cell, cell);
        }
        if (sel && sel.r === r && sel.c === c) {
          ctx.fillStyle = "rgba(80, 200, 120, 0.45)";
          ctx.fillRect(x, y, cell, cell);
        }
        const isLegalTarget = legal.some(m => m.to.r === r && m.to.c === c);
        if (isLegalTarget) {
          const cx = x + cell / 2;
          const cy = y + cell / 2;
          const target = board[r][c];
          if (target) {
            ctx.strokeStyle = "rgba(220, 60, 60, 0.9)";
            ctx.lineWidth = Math.max(2, cell * 0.07);
            ctx.beginPath();
            ctx.arc(cx, cy, cell * 0.42, 0, Math.PI * 2);
            ctx.stroke();
          } else {
            ctx.fillStyle = "rgba(60, 180, 90, 0.55)";
            ctx.beginPath();
            ctx.arc(cx, cy, cell * 0.14, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    if (checkC) {
      const king = findKing(board, checkC);
      if (king) {
        const x = margin + king.c * cell;
        const y = margin + king.r * cell;
        ctx.strokeStyle = "rgba(220, 40, 40, 0.95)";
        ctx.lineWidth = Math.max(3, cell * 0.08);
        ctx.strokeRect(x + 2, y + 2, cell - 4, cell - 4);
        const pulse = 0.25 + 0.15 * Math.sin(performance.now() / 220);
        ctx.fillStyle = `rgba(220, 40, 40, ${pulse})`;
        ctx.fillRect(x, y, cell, cell);
      }
    }

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const s = board[r][c];
        if (!s) continue;
        const x = margin + c * cell;
        const y = margin + r * cell;
        drawPiece(ctx, s, x, y, cell);
      }
    }

    ctx.fillStyle = "#d9c7a8";
    ctx.font = `bold ${Math.floor(cell * 0.22)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let c = 0; c < 8; c++) {
      const x = margin + c * cell + cell / 2;
      ctx.fillText(FILES[c], x, margin / 2);
      ctx.fillText(FILES[c], x, size - margin / 2);
    }
    for (let r = 0; r < 8; r++) {
      const y = margin + r * cell + cell / 2;
      ctx.fillText(RANKS[r], margin / 2, y);
      ctx.fillText(RANKS[r], size - margin / 2, y);
    }

    ctx.strokeStyle = "#3a2810";
    ctx.lineWidth = 2;
    ctx.strokeRect(margin - 1, margin - 1, boardSize + 2, boardSize + 2);
  }, []);

  useEffect(() => {
    const wrap = wrapRef.current;
    const cv = canvasRef.current;
    if (!wrap || !cv) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const s = Math.max(280, Math.floor(Math.min(e.contentRect.width, e.contentRect.height)));
        sizeRef.current = s;
        const dpr = window.devicePixelRatio || 1;
        cv.width = Math.floor(s * dpr);
        cv.height = Math.floor(s * dpr);
        cv.style.width = s + "px";
        cv.style.height = s + "px";
        const ctx = cv.getContext("2d");
        if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [draw]);

  const winnerText = winnerRef.current === "w"
    ? "Бобры победили!"
    : winnerRef.current === "b"
      ? "Барсуки победили!"
      : "Ничья!";

  return (
    <div className="flex h-full w-full flex-col bg-gradient-to-b from-amber-950 to-stone-950 text-amber-50">
      <header className="flex items-center justify-between gap-2 border-b border-amber-900/40 bg-stone-900/60 px-3 py-2 sm:px-4">
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-amber-300" />
          <h1 className="text-base font-black sm:text-lg">Шахматы Бобра</h1>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span
            className={
              "rounded px-2 py-1 font-bold " +
              (turn === "w" ? "bg-amber-200 text-stone-900" : "bg-stone-700 text-amber-50")
            }
          >
            {turn === "w" ? "🐹 Бобры" : "🐻 Барсуки"}
          </span>
          <button
            type="button"
            onClick={newGame}
            className="flex items-center gap-1 rounded bg-amber-700 px-2 py-1 font-bold text-white transition-colors hover:bg-amber-600"
          >
            <RotateCcw className="h-3 w-3" /> Заново
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-2 sm:flex-row sm:p-3">
        <div ref={wrapRef} className="relative flex min-h-0 flex-1 items-center justify-center">
          <canvas
            ref={canvasRef}
            onClick={onCanvasClick}
            className="rounded-lg shadow-2xl"
            role="img"
            aria-label="Шахматная доска"
          />

          {phase === "ready" && (
            <button
              type="button"
              onClick={newGame}
              className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center rounded-lg bg-black/70 px-4 text-center backdrop-blur-sm"
            >
              <Crown className="mb-3 h-12 w-12 text-amber-300" />
              <h2 className="text-2xl font-black text-amber-300 sm:text-3xl">Шахматы Бобра</h2>
              <p className="mt-2 text-sm text-amber-100/90">Бобры 🐹 против барсуков 🐻</p>
              <p className="mt-1 text-xs text-amber-100/60">Кликните, чтобы начать партию</p>
            </button>
          )}

          {phase === "check" && (
            <div className="pointer-events-none absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-1 rounded-full bg-red-600/90 px-4 py-1 text-sm font-bold text-white shadow-lg">
              <Swords className="h-4 w-4" /> Шах!
            </div>
          )}

          {phase === "gameover" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-black/75 px-4 text-center backdrop-blur-sm">
              <Sparkles className="mb-3 h-14 w-14 text-amber-300" />
              <p className="text-2xl font-black text-amber-200 sm:text-3xl">{winnerText}</p>
              <button
                type="button"
                onClick={newGame}
                className="mt-4 flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2 font-bold text-white transition-colors hover:bg-amber-500"
              >
                <RotateCcw className="h-4 w-4" /> Новая игра
              </button>
            </div>
          )}
        </div>

        <aside className="flex w-full flex-col gap-2 sm:w-56 sm:flex-shrink-0">
          <div className="rounded-lg border border-amber-900/40 bg-stone-900/50 p-3">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-amber-400">Статус</div>
            <div className="flex items-center gap-1 text-sm text-amber-100">
              {aiThinking && <Hand className="h-4 w-4 animate-pulse text-amber-300" />}
              <span>{aiThinking ? "Барсуки думают..." : status}</span>
            </div>
          </div>

          <div className="rounded-lg border border-amber-900/40 bg-stone-900/50 p-3">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-amber-400">Взято</div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-16 text-xs text-amber-300/70">Бобрами:</span>
                <span className="text-xl leading-none">
                  {captured.w.length === 0
                    ? <span className="text-xs text-amber-100/30">—</span>
                    : captured.w.map((p, i) => <span key={i}>{PIECE_EMOJI_B[p]}</span>)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-16 text-xs text-amber-300/70">Барсуками:</span>
                <span className="text-xl leading-none">
                  {captured.b.length === 0
                    ? <span className="text-xs text-amber-100/30">—</span>
                    : captured.b.map((p, i) => <span key={i}>{PIECE_EMOJI_W[p]}</span>)}
                </span>
              </div>
            </div>
          </div>

          <div className="hidden min-h-0 flex-1 flex-col rounded-lg border border-amber-900/40 bg-stone-900/50 p-3 sm:flex">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-amber-400">Ходы</div>
            <div
              className="min-h-0 flex-1 overflow-y-auto text-xs font-mono text-amber-100 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-amber-800/50"
            >
              {history.length === 0 ? (
                <div className="text-amber-100/40">Партия не начата</div>
              ) : (
                <ol className="space-y-0.5">
                  {Array.from({ length: Math.ceil(history.length / 2) }).map((_, i) => (
                    <li key={i} className="flex gap-1">
                      <span className="w-6 text-amber-400">{i + 1}.</span>
                      <span className="w-16 truncate">{history[i * 2]}</span>
                      <span className="w-16 truncate">{history[i * 2 + 1] ?? ""}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-amber-900/40 bg-stone-900/40 p-2 text-[10px] text-amber-100/60 sm:hidden">
            {PIECE_NAME.q} = 🦫/🦡 · {PIECE_NAME.r} = 🏰/🪨 · {PIECE_NAME.b} = 🌲/🍂 · {PIECE_NAME.n} = 🐎/🐺 · {PIECE_NAME.p} = 🐿️/🐾
          </div>
        </aside>
      </div>
    </div>
  );
}
