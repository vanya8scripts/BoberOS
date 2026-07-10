"use client";

import { useOS } from "@/lib/os-store";
import { WindowFrame } from "./WindowFrame";
import { BPaint } from "@/components/apps/BPaint";
import { BoberStore } from "@/components/apps/BoberStore";
import { Antivirus360 } from "@/components/apps/Antivirus360";
import { BoberCoin } from "@/components/apps/BoberCoin";
import { Spim } from "@/components/apps/Spim";
import { FlappyBober } from "@/components/apps/FlappyBober";
import { CS2 } from "@/components/apps/CS2";
import { CyberBober } from "@/components/apps/CyberBober";
import { Snake } from "@/components/apps/Snake";
import { Game2048 } from "@/components/apps/Game2048";
import { Minesweeper } from "@/components/apps/Minesweeper";
import { Memory } from "@/components/apps/Memory";
import { RPS } from "@/components/apps/RPS";
import { TicTacToe } from "@/components/apps/TicTacToe";
import { WhackAMole } from "@/components/apps/WhackAMole";
import { Tetris } from "@/components/apps/Tetris";
import { Pong } from "@/components/apps/Pong";
import { Breakout } from "@/components/apps/Breakout";
import { Sokoban } from "@/components/apps/Sokoban";
import { Fifteen } from "@/components/apps/Fifteen";
import { Hangman } from "@/components/apps/Hangman";
import { Simon } from "@/components/apps/Simon";
import { DinoRunner } from "@/components/apps/DinoRunner";
import { Sudoku } from "@/components/apps/Sudoku";
import { Connect4 } from "@/components/apps/Connect4";
import { Wordle } from "@/components/apps/Wordle";
import { Gallery } from "@/components/apps/Gallery";
import { TaskManager } from "@/components/apps/TaskManager";
import { Bober3D } from "@/components/apps/Bober3D";
import { Parkour } from "@/components/apps/Parkour";
import { RunGun } from "@/components/apps/RunGun";
import { VoxelSandbox } from "@/components/apps/VoxelSandbox";
import { BoberStrike } from "@/components/apps/BoberStrike";
import { BoberKart } from "@/components/apps/BoberKart";
import { TankBattle } from "@/components/apps/TankBattle";
import { BoberShooter } from "@/components/apps/BoberShooter";
import { BoberPlatformer } from "@/components/apps/BoberPlatformer";
import { BeaverSaga } from "@/components/apps/BeaverSaga";
import { RacingMP } from "@/components/apps/RacingMP";
import { MyBober } from "@/components/apps/MyBober";
import { Notepad } from "@/components/apps/Notepad";
import { Settings } from "@/components/apps/Settings";
import { Calculator } from "@/components/apps/Calculator";
import { BoberChat } from "@/components/apps/BoberChat";
import { BoberBrowser } from "@/components/apps/BoberBrowser";
import { BoberTerminal } from "@/components/apps/BoberTerminal";
import { BoberClock } from "@/components/apps/BoberClock";
import { BoberTunes } from "@/components/apps/BoberTunes";
import { RegistryEditor } from "@/components/apps/RegistryEditor";
import { BoberMail } from "@/components/apps/BoberMail";
import { BoberWeather } from "@/components/apps/BoberWeather";
import { BoberMaps } from "@/components/apps/BoberMaps";
import { BoberTube } from "@/components/apps/BoberTube";
import { BoberOffice } from "@/components/apps/BoberOffice";
import { BoberCalcPro } from "@/components/apps/BoberCalcPro";
import { BoberVPN } from "@/components/apps/BoberVPN";
import { BoberCloud } from "@/components/apps/BoberCloud";
import { BoberTranslate } from "@/components/apps/BoberTranslate";
import { BoberMonitor } from "@/components/apps/BoberMonitor";
import { BoberCalendar } from "@/components/apps/BoberCalendar";
import { BoberStudio } from "@/components/apps/BoberStudio";
import type { AppId } from "@/lib/os-types";

const APP_COMPONENTS: Record<AppId, React.ComponentType> = {
  bpaint: BPaint, boberstore: BoberStore, antivirus360: Antivirus360, bobercoin: BoberCoin,
  spim: Spim, flappybober: FlappyBober, cs2: CS2, cyberbober: CyberBober,
  snake: Snake, game2048: Game2048, minesweeper: Minesweeper, memory: Memory,
  rps: RPS, tictactoe: TicTacToe, whackamole: WhackAMole,
  tetris: Tetris, pong: Pong, breakout: Breakout, sokoban: Sokoban,
  fifteen: Fifteen, hangman: Hangman, simon: Simon,
  dinorunner: DinoRunner, sudoku: Sudoku, connect4: Connect4, wordle: Wordle,
  gallery: Gallery, taskmanager: TaskManager,
  bober3d: Bober3D, parkour: Parkour, rungun: RunGun,
  voxelsandbox: VoxelSandbox, boberstrike: BoberStrike,
  boberkart: BoberKart, tankbattle: TankBattle, galtaxis: BoberShooter, bplatformer: BoberPlatformer,
  beaversaga: BeaverSaga, racingmp: RacingMP,
  mybober: MyBober, notepad: Notepad, settings: Settings, calculator: Calculator,
  boberchat: BoberChat, boberbrowser: BoberBrowser, boberterminal: BoberTerminal,
  boberclock: BoberClock, bobertunes: BoberTunes, registryeditor: RegistryEditor,
  bobermail: BoberMail, boberweather: BoberWeather, bobermaps: BoberMaps, bobertube: BoberTube,
  boberoffice: BoberOffice, bobercalcpro: BoberCalcPro, bobervpn: BoberVPN, bobercloud: BoberCloud,
  bobertranslate: BoberTranslate, bobermonitor: BoberMonitor, bobercalendar: BoberCalendar,
  boberstudio: BoberStudio,
};

export function WindowManager() {
  const windows = useOS((s) => s.windows);
  return (
    <>
      {windows.map((win) => {
        const AppComponent = APP_COMPONENTS[win.appId];
        return (
          <WindowFrame key={win.id} win={win}>
            <AppComponent />
          </WindowFrame>
        );
      })}
    </>
  );
}
