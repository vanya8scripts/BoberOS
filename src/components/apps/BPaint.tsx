"use client";

import { useEffect, useRef, useState } from "react";
import { Eraser, Trash2, Download, Undo, Brush } from "lucide-react";
import { cn } from "@/lib/utils";

const COLORS = [
  "#000000", "#ffffff", "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
  "#a16207", "#78716c",
];

export function BPaint() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const history = useRef<ImageData[]>([]);

  const [color, setColor] = useState("#000000");
  const [size, setSize] = useState(6);
  const [tool, setTool] = useState<"brush" | "eraser">("brush");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    const w = parent?.clientWidth ?? 600;
    const h = parent?.clientHeight ?? 400;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctxRef.current = ctx;
  }, []);

  const pushHistory = () => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    if (history.current.length > 20) history.current.shift();
    history.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  };

  const pos = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvasRef.current!.width,
      y: ((e.clientY - rect.top) / rect.height) * canvasRef.current!.height,
    };
  };

  const start = (e: React.PointerEvent) => {
    drawing.current = true;
    pushHistory();
    last.current = pos(e);
    draw(e);
  };

  const draw = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = ctxRef.current;
    if (!ctx || !last.current) return;
    const p = pos(e);
    ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
    ctx.lineWidth = tool === "eraser" ? size * 2.5 : size;
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };

  const end = () => {
    drawing.current = false;
    last.current = null;
  };

  const undo = () => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    const prev = history.current.pop();
    if (prev) ctx.putImageData(prev, 0, 0);
  };

  const clear = () => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    pushHistory();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const save = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "bober-art.png";
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="flex h-full flex-col bg-zinc-100">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 bg-white p-2">
        <div className="flex items-center gap-1 rounded-lg bg-zinc-100 p-1">
          <button
            onClick={() => setTool("brush")}
            className={cn(
              "grid h-8 w-8 place-items-center rounded-md",
              tool === "brush" ? "bg-amber-500 text-white" : "text-zinc-600 hover:bg-zinc-200"
            )}
            title="Кисть"
          >
            <Brush className="h-4 w-4" />
          </button>
          <button
            onClick={() => setTool("eraser")}
            className={cn(
              "grid h-8 w-8 place-items-center rounded-md",
              tool === "eraser" ? "bg-amber-500 text-white" : "text-zinc-600 hover:bg-zinc-200"
            )}
            title="Ластик"
          >
            <Eraser className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => {
                setColor(c);
                setTool("brush");
              }}
              className={cn(
                "h-6 w-6 rounded-full border-2 transition-transform",
                color === c && tool === "brush"
                  ? "scale-110 border-zinc-800"
                  : "border-white"
              )}
              style={{ backgroundColor: c }}
            />
          ))}
          <input
            type="color"
            value={color}
            onChange={(e) => {
              setColor(e.target.value);
              setTool("brush");
            }}
            className="h-6 w-6 cursor-pointer rounded border border-zinc-300"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Толщина</span>
          <input
            type="range"
            min={1}
            max={40}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="w-24"
          />
          <span className="w-6 text-xs font-mono text-zinc-600">{size}</span>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={undo}
            className="grid h-8 w-8 place-items-center rounded-md text-zinc-600 hover:bg-zinc-100"
            title="Отменить"
          >
            <Undo className="h-4 w-4" />
          </button>
          <button
            onClick={clear}
            className="grid h-8 w-8 place-items-center rounded-md text-zinc-600 hover:bg-zinc-100"
            title="Очистить"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            onClick={save}
            className="flex h-8 items-center gap-1 rounded-md bg-amber-500 px-2.5 text-xs font-medium text-white hover:bg-amber-600"
            title="Сохранить"
          >
            <Download className="h-3.5 w-3.5" /> PNG
          </button>
        </div>
      </div>

      {/* canvas */}
      <div className="relative flex-1 overflow-hidden bg-zinc-200 p-2">
        <canvas
          ref={canvasRef}
          onPointerDown={start}
          onPointerMove={draw}
          onPointerUp={end}
          onPointerLeave={end}
          className="h-full w-full cursor-crosshair touch-none rounded-md bg-white shadow-inner"
        />
      </div>
    </div>
  );
}
