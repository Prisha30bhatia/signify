import confetti from "canvas-confetti";

const MUTE_KEY = "signify-muted";

export function isMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setMuted(value) {
  try {
    localStorage.setItem(MUTE_KEY, value ? "1" : "0");
  } catch {
    // ignore
  }
}

export function reduceMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

let ctx;

function tone(freq, start, length) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + length);
  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + length + 0.05);
}

// Two quick notes, generated in the browser. No audio file needed.
export function chime() {
  if (isMuted()) return;
  try {
    ctx = ctx || new AudioContext();
    tone(660, 0, 0.18);
    tone(880, 0.1, 0.25);
  } catch {
    // audio not available
  }
}

export function celebrate() {
  if (reduceMotion()) return;
  confetti({
    particleCount: 90,
    spread: 75,
    origin: { y: 0.6 },
    colors: ["#3D5A80", "#98C1D9", "#8DB580", "#BA9593", "#293241"],
  });
}