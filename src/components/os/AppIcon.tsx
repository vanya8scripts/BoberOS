"use client";

import {
  Palette, ShoppingCart, Monitor, FileText, Settings as SettingsIcon, Calculator,
  MessageCircle, Globe, TerminalSquare, Clock, Music, ShieldCheck, Wrench, Coins,
  Bird, ChevronsLeftRight, Crosshair, Gamepad2, Grid3x3, Bomb, Brain, Hand, Hash, Hammer,
  Mail, CloudSun, Map, Youtube, FileEdit, Shield, Cloud, Languages, Activity,
  CalendarDays, Code2, FolderTree, Blocks, LetterText, Radio, Image as ImageIcon,
  BookOpen,
  type LucideIcon,
} from "lucide-react";
import type { AppId } from "@/lib/os-types";
import { APP_META } from "@/lib/app-meta";
import { cn } from "@/lib/utils";

const ICONS: Record<AppId, LucideIcon> = {
  bpaint: Palette, boberstore: ShoppingCart, mybober: Monitor, notepad: FileText,
  settings: SettingsIcon, calculator: Calculator, boberchat: MessageCircle,
  boberbrowser: Globe, boberterminal: TerminalSquare, boberclock: Clock, bobertunes: Music,
  registryeditor: FolderTree,
  antivirus360: ShieldCheck, spim: Wrench, bobercoin: Coins,
  bobermail: Mail, boberweather: CloudSun, bobermaps: Map, bobertube: Youtube,
  boberoffice: FileEdit, bobercalcpro: Calculator, bobervpn: Shield, bobercloud: Cloud,
  bobertranslate: Languages, bobermonitor: Activity, bobercalendar: CalendarDays,
  boberstudio: Code2,
  flappybober: Bird, cs2: ChevronsLeftRight, cyberbober: Crosshair,
  snake: Gamepad2, game2048: Grid3x3, minesweeper: Bomb, memory: Brain,
  rps: Hand, tictactoe: Hash, whackamole: Hammer,
  tetris: Blocks, pong: Gamepad2, breakout: Blocks, sokoban: Blocks,
  fifteen: Grid3x3, hangman: LetterText, simon: Radio,
  dinorunner: Activity, sudoku: Grid3x3, connect4: Grid3x3, wordle: LetterText,
  gallery: ImageIcon, taskmanager: Activity,
  bober3d: Blocks, parkour: Activity, rungun: Crosshair,
  voxelsandbox: Blocks, boberstrike: Crosshair,
  boberkart: Gamepad2, tankbattle: Crosshair, galtaxis: Gamepad2, bplatformer: Activity,
  beaversaga: BookOpen, racingmp: Gamepad2,
};

interface AppIconProps {
  appId: AppId;
  size?: number;
  className?: string;
}

export function AppIcon({ appId, size = 44, className }: AppIconProps) {
  const meta = APP_META[appId];
  const Icon = ICONS[appId];
  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg shadow-black/20 ring-1 ring-white/20",
        meta.color, className
      )}
      style={{ width: size, height: size }}
    >
      <Icon className="text-white drop-shadow" style={{ width: size * 0.55, height: size * 0.55 }} strokeWidth={2.2} />
      {appId === "antivirus360" && (
        <span className="absolute inset-0 flex items-center justify-center font-black text-white" style={{ fontSize: size * 0.3 }}>360</span>
      )}
    </div>
  );
}
