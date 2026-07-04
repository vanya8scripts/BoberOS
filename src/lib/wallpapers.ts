"use client";

import type { WallpaperId } from "@/lib/os-types";

export function wallpaperStyle(wallpaper: WallpaperId): React.CSSProperties {
  switch (wallpaper) {
    case "default":
      return {
        background:
          "linear-gradient(135deg, #5b3a1a 0%, #8a5a2b 35%, #c98a3e 70%, #e8b765 100%)",
      };
    case "forest":
      return {
        background:
          "linear-gradient(160deg, #1a3a2a 0%, #2d6a4f 45%, #52b788 100%)",
      };
    case "sunset":
      return {
        background:
          "linear-gradient(160deg, #2a1a3a 0%, #b5179e 40%, #f72585 70%, #ffba08 100%)",
      };
    case "wallpaper1":
      return {
        backgroundImage: "url(/wallpaper1.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
    case "wallpaper2":
      return {
        backgroundImage: "url(/wallpaper2.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
    case "win11":
      return {
        background:
          "linear-gradient(135deg, #0078d4 0%, #1a5fb4 30%, #2d1b69 70%, #5b2c83 100%)",
      };
    default:
      return {};
  }
}
