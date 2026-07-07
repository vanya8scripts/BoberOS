"use client";

import { useRef, type ReactNode, type PointerEvent } from "react";
import { Minus, Square, X, Copy } from "lucide-react";
import type { WindowInstance } from "@/lib/os-types";
import { APP_META } from "@/lib/app-meta";
import { useOS } from "@/lib/os-store";
import { AppIcon } from "./AppIcon";
import { cn } from "@/lib/utils";

const TASKBAR_H = 56;

interface WindowFrameProps {
  win: WindowInstance;
  children: ReactNode;
}

export function WindowFrame({ win, children }: WindowFrameProps) {
  const meta = APP_META[win.appId];
  const {
    focusWindow,
    closeWindow,
    minimizeWindow,
    toggleMaximize,
    moveWindow,
    resizeWindow,
  } = useOS();
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);
  const resizeRef = useRef<{ sx: number; sy: number; sw: number; sh: number } | null>(null);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

  const onTitlePointerDown = (e: PointerEvent) => {
    if (win.maximized || isMobile) return;
    if ((e.target as HTMLElement).closest("button")) return;
    focusWindow(win.id);
    dragRef.current = { dx: e.clientX - win.x, dy: e.clientY - win.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  const onTitlePointerMove = (e: PointerEvent) => {
    if (!dragRef.current) return;
    const x = Math.max(-win.width + 80, Math.min(window.innerWidth - 80, e.clientX - dragRef.current.dx));
    const y = Math.max(0, Math.min(window.innerHeight - TASKBAR_H - 40, e.clientY - dragRef.current.dy));
    moveWindow(win.id, x, y);
  }

  const onTitlePointerUp = (e: PointerEvent) => {
    dragRef.current = null;
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* noop */ }
  }

  const onResizePointerDown = (e: PointerEvent) => {
    e.stopPropagation();
    focusWindow(win.id);
    resizeRef.current = { sx: e.clientX, sy: e.clientY, sw: win.width, sh: win.height };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  const onResizePointerMove = (e: PointerEvent) => {
    if (!resizeRef.current) return;
    const w = Math.max(meta.minWidth ?? 320, resizeRef.current.sw + (e.clientX - resizeRef.current.sx));
    const h = Math.max(meta.minHeight ?? 240, resizeRef.current.sh + (e.clientY - resizeRef.current.sy));
    resizeWindow(win.id, w, h);
  }

  const onResizePointerUp = (e: PointerEvent) => {
    resizeRef.current = null;
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* noop */ }
  }

  if (win.minimized) return null;

  const style = win.maximized
    ? { left: 0, top: 0, width: "100vw", height: `calc(100vh - ${TASKBAR_H}px)`, zIndex: win.zIndex }
    : { left: win.x, top: win.y, width: win.width, height: win.height, zIndex: win.zIndex };

  return (
    <div
      className={cn(
        "absolute flex flex-col overflow-hidden rounded-xl border border-white/15 bg-white/95 shadow-2xl shadow-black/40 backdrop-blur-xl",
        win.maximized && "rounded-none"
      )}
      style={style}
      onPointerDown={() => focusWindow(win.id)}
    >
      {/* title bar */}
      <div
        className="flex h-9 shrink-0 items-center gap-2 border-b border-black/10 bg-gradient-to-b from-zinc-100 to-zinc-200 px-2 select-none"
        onPointerDown={onTitlePointerDown}
        onPointerMove={onTitlePointerMove}
        onPointerUp={onTitlePointerUp}
        onDoubleClick={() => meta.resizable !== false && toggleMaximize(win.id)}
        style={{ cursor: win.maximized ? "default" : "move" }}
      >
        <AppIcon appId={win.appId} size={20} />
        <span className="flex-1 truncate text-xs font-semibold text-zinc-700">
          {meta.name}
        </span>
        <button
          onClick={() => minimizeWindow(win.id)}
          className="grid h-6 w-7 place-items-center rounded text-zinc-600 hover:bg-black/10"
          title="Свернуть"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        {meta.resizable !== false && (
          <button
            onClick={() => toggleMaximize(win.id)}
            className="grid h-6 w-7 place-items-center rounded text-zinc-600 hover:bg-black/10"
            title={win.maximized ? "Восстановить" : "Развернуть"}
          >
            {win.maximized ? <Copy className="h-3 w-3" /> : <Square className="h-3 w-3" />}
          </button>
        )}
        <button
          onClick={() => closeWindow(win.id)}
          className="grid h-6 w-7 place-items-center rounded text-zinc-600 hover:bg-red-500 hover:text-white"
          title="Закрыть"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* content */}
      <div className="relative flex-1 overflow-hidden bg-white">
        {children}
      </div>

      {meta.resizable !== false && !win.maximized && !isMobile && (
        <div
          className="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize"
          onPointerDown={onResizePointerDown}
          onPointerMove={onResizePointerMove}
          onPointerUp={onResizePointerUp}
        >
          <svg viewBox="0 0 10 10" className="h-full w-full text-zinc-400">
            <path d="M9 1 L1 9 M9 5 L5 9" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </div>
      )}
    </div>
  );
}
