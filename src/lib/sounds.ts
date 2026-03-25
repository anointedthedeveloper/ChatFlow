// AudioContext — only ever created inside a click/keydown handler, never at module load
// We store it once created and reuse it forever

let _ctx: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  // If we have one and it's usable, return it
  if (_ctx && _ctx.state !== "closed") {
    if (_ctx.state === "suspended") _ctx.resume().catch(() => {});
    return _ctx;
  }
  // Try to create — will only succeed if called from a user gesture
  try {
    _ctx = new AudioContext();
    return _ctx;
  } catch {
    return null;
  }
}

// Call this once from any button click to unlock audio for the session
export function unlockAudio() {
  getAudioContext();
}

function play(fn: (c: AudioContext, t: number) => void) {
  const c = getAudioContext();
  if (!c) return;
  const run = () => { try { fn(c, c.currentTime); } catch (e) { console.error("[Sounds] play error:", e); } };
  if (c.state === "running") { run(); }
  else { c.resume().then(run).catch((e) => console.error("[Sounds] resume error:", e)); }
}

export const Sounds = {
  message: () => play((c, t) => {
    const g = c.createGain();
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    g.connect(c.destination);
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(880, t);
    o.frequency.exponentialRampToValueAtTime(1200, t + 0.1);
    o.connect(g); o.start(t); o.stop(t + 0.25);
  }),

  callAccept: () => play((c, t) => {
    const g = c.createGain();
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    g.connect(c.destination);
    [[523, 0], [659, 0.15], [784, 0.3]].forEach(([freq, dt]) => {
      const o = c.createOscillator(); o.type = "sine"; o.frequency.value = freq;
      o.connect(g); o.start(t + dt); o.stop(t + dt + 0.15);
    });
  }),

  callDecline: () => play((c, t) => {
    const g = c.createGain();
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    g.connect(c.destination);
    [[400, 0], [300, 0.2]].forEach(([freq, dt]) => {
      const o = c.createOscillator(); o.type = "sawtooth"; o.frequency.value = freq;
      o.connect(g); o.start(t + dt); o.stop(t + dt + 0.15);
    });
  }),

  callEnd: () => play((c, t) => {
    const g = c.createGain();
    g.gain.setValueAtTime(0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    g.connect(c.destination);
    const o = c.createOscillator(); o.type = "sine";
    o.frequency.setValueAtTime(600, t);
    o.frequency.exponentialRampToValueAtTime(200, t + 0.4);
    o.connect(g); o.start(t); o.stop(t + 0.4);
  }),

  sent: () => play((c, t) => {
    const g = c.createGain();
    g.gain.setValueAtTime(0.07, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    g.connect(c.destination);
    const o = c.createOscillator(); o.type = "sine"; o.frequency.value = 1000;
    o.connect(g); o.start(t); o.stop(t + 0.12);
  }),
};
