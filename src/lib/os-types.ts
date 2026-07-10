export type AppId =
  | "bpaint"
  | "boberstore"
  | "mybober"
  | "notepad"
  | "settings"
  | "calculator"
  | "boberchat"
  | "boberbrowser"
  | "boberterminal"
  | "boberclock"
  | "bobertunes"
  | "registryeditor"
  | "antivirus360"
  | "spim"
  | "bobercoin"
  | "bobermail"
  | "boberweather"
  | "bobermaps"
  | "bobertube"
  | "boberoffice"
  | "bobercalcpro"
  | "bobervpn"
  | "bobercloud"
  | "bobertranslate"
  | "bobermonitor"
  | "bobercalendar"
  | "boberstudio"
  | "flappybober"
  | "cs2"
  | "cyberbober"
  | "snake"
  | "game2048"
  | "minesweeper"
  | "memory"
  | "rps"
  | "tictactoe"
  | "whackamole"
  | "tetris"
  | "pong"
  | "breakout"
  | "sokoban"
  | "fifteen"
  | "hangman"
  | "simon"
  | "dinorunner"
  | "sudoku"
  | "connect4"
  | "wordle"
  | "gallery"
  | "taskmanager"
  | "bober3d"
  | "parkour"
  | "rungun"
  | "voxelsandbox"
  | "boberstrike"
  | "boberkart"
  | "tankbattle"
  | "galtaxis"
  | "bplatformer"
  | "beaversaga"
  | "racingmp";

export type Language = "ru" | "en";

export interface WindowInstance {
  id: string;
  appId: AppId;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  minimized: boolean;
  maximized: boolean;
}

export type WallpaperId =
  | "default"
  | "forest"
  | "sunset"
  | "wallpaper1"
  | "wallpaper2";

export type OSVersion = "pro" | "home" | "max";

export interface AppMeta {
  id: AppId;
  name: string;
  color: string;
  defaultWidth: number;
  defaultHeight: number;
  minWidth?: number;
  minHeight?: number;
  source: "system" | "store" | "spim";
  resizable?: boolean;
}
