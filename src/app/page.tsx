"use client";

import { useEffect } from "react";
import { useOS } from "@/lib/os-store";
import { OOBE } from "@/components/os/OOBE";
import { CreditsSplash } from "@/components/os/CreditsSplash";
import { BootScreen } from "@/components/os/BootScreen";
import { Desktop } from "@/components/os/Desktop";
import { Taskbar } from "@/components/os/Taskbar";
import { WindowManager } from "@/components/os/WindowManager";
import { BSOD } from "@/components/os/BSOD";
import { ShutdownDialog } from "@/components/os/ShutdownDialog";

export default function Home() {
  const bootPhase = useOS((s) => s.bootPhase);
  const setupComplete = useOS((s) => s.setupComplete);
  const bsod = useOS((s) => s.bsod);
  const darkMode = useOS((s) => s.darkMode);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [darkMode]);

  const phase = !setupComplete ? "oobe" : bootPhase;

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black font-sans select-none">
      {phase === "oobe" && <OOBE />}
      {phase === "credits" && <CreditsSplash />}
      {phase === "booting" && <BootScreen />}
      {phase === "desktop" && (
        <>
          <Desktop />
          <WindowManager />
          <Taskbar />
          <ShutdownDialog />
        </>
      )}
      {bsod && <BSOD />}
    </main>
  );
}
