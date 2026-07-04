"use client";

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try { ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)(); }
    catch { return null; }
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number) {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.frequency.value = freq;
  osc.type = type;
  gain.gain.setValueAtTime(0, c.currentTime);
  gain.gain.linearRampToValueAtTime(vol, c.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + dur);
}

export const sfx = {
  click: () => tone(880, 0.05, "sine", 0.08),
  open: () => { tone(660, 0.06, "sine", 0.1); setTimeout(() => tone(990, 0.08, "sine", 0.1), 50); },
  close: () => { tone(660, 0.06, "sine", 0.08); setTimeout(() => tone(440, 0.08, "sine", 0.08), 50); },
  error: () => { tone(220, 0.1, "sawtooth", 0.12); setTimeout(() => tone(180, 0.15, "sawtooth", 0.12), 80); },
  success: () => { tone(523, 0.08, "sine", 0.1); setTimeout(() => tone(659, 0.08, "sine", 0.1), 80); setTimeout(() => tone(784, 0.12, "sine", 0.1), 160); },
  coin: () => { tone(988, 0.06, "square", 0.08); setTimeout(() => tone(1319, 0.1, "square", 0.08), 50); },
  install: () => tone(700, 0.04, "sine", 0.06),
  boot: () => { tone(440, 0.15, "sine", 0.1); setTimeout(() => tone(554, 0.15, "sine", 0.1), 150); setTimeout(() => tone(659, 0.2, "sine", 0.1), 300); },
  notify: () => { tone(784, 0.08, "sine", 0.08); setTimeout(() => tone(1047, 0.12, "sine", 0.08), 80); },
  jump: () => tone(500, 0.1, "sine", 0.08),
  hit: () => tone(150, 0.1, "sawtooth", 0.1),
  win: () => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.12, "sine", 0.1), i * 100)); },
  lose: () => { [400, 350, 300, 250].forEach((f, i) => setTimeout(() => tone(f, 0.15, "sawtooth", 0.08), i * 120)); },
};
