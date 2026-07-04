"use client";

import { useEffect, useRef, useState } from "react";
import { useOS } from "@/lib/os-store";
import { APP_META } from "@/lib/app-meta";
import { wallpaperStyle } from "@/lib/wallpapers";
import { AppIcon } from "./AppIcon";
import { cn } from "@/lib/utils";

export function Desktop() {
  const installedApps = useOS((s) => s.installedApps);
  const openApp = useOS((s) => s.openApp);
  const wallpaper = useOS((s) => s.wallpaper);
  const activated = useOS((s) => s.activated);
  const openAppById = useOS((s) => s.openApp);
  const [selected, setSelected] = useState<string | null>(null);

  const [selBox, setSelBox] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const dragging = useRef(false);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.target !== e.currentTarget) return;
    setSelected(null);
    dragging.current = true;
    setSelBox({ x0: e.clientX, y0: e.clientY, x1: e.clientX, y1: e.clientY });
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current || !selBox) return;
    setSelBox({ ...selBox, x1: e.clientX, y1: e.clientY });
  };
  const onPointerUp = () => {
    dragging.current = false;
    setTimeout(() => setSelBox(null), 150);
  };

  useEffect(() => {
    const up = () => { dragging.current = false; setSelBox(null); };
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, []);

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={wallpaperStyle(wallpaper)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.25), transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.15), transparent 40%)",
        }}
      />

      {/* desktop icons: wrap left-to-right then down (never goes off-screen) */}
      <div className="absolute left-3 top-3 flex max-h-[calc(100vh-90px)] max-w-[calc(100vw-24px)] flex-wrap gap-1 content-start">
        {installedApps.map((appId) => {
          const meta = APP_META[appId];
          return (
            <button
              key={appId}
              onClick={(e) => {
                e.stopPropagation();
                setSelected(appId);
              }}
              onDoubleClick={() => openApp(appId)}
              onPointerDown={(e) => e.stopPropagation()}
              className={cn(
                "flex h-24 w-20 shrink-0 flex-col items-center gap-1 rounded-lg p-2 text-white transition-all",
                selected === appId
                  ? "bg-white/30 ring-2 ring-white/60 backdrop-blur-sm"
                  : "hover:bg-white/10"
              )}
            >
              <AppIcon appId={appId} size={44} />
              <span className="line-clamp-2 text-center text-[11px] font-medium leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                {meta.name}
              </span>
            </button>
          );
        })}
      </div>

      {selBox && (
        <div
          className="pointer-events-none absolute z-10 rounded-sm border border-white/60 bg-white/15"
          style={{
            left: Math.min(selBox.x0, selBox.x1),
            top: Math.min(selBox.y0, selBox.y1),
            width: Math.abs(selBox.x1 - selBox.x0),
            height: Math.abs(selBox.y1 - selBox.y0),
          }}
        />
      )}

      {!activated && (
        <button
          onClick={() => openAppById("settings")}
          className="absolute bottom-16 right-4 z-20 flex items-center gap-2 rounded-full border border-amber-300/50 bg-amber-500/20 px-4 py-2 text-xs font-semibold text-amber-100 backdrop-blur-md transition-colors hover:bg-amber-500/40"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
          </span>
          Активируйте BoberOS в настройках
        </button>
      )}
    </div>
  );
}
