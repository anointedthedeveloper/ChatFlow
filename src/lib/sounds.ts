// Lazy AudioContext — only created after a user gesture to satisfy browser autoplay policy
let _ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!_ctx || _ctx.state === "closed") {
      _ctx = new AudioContext();
    }
    if (_ctx.state === "suspended") {
      _ctx.resume().catch(() => {});
    }
    return _ctx;
  } catch {
    return null;
  }
}

// Prime the AudioContext on first user interaction so subsequent sounds work
if (typeof window !== "undefined") {
  const prime = () => { getCtx(); };
  window.addEventListener("pointerdown", prime, { once: true });
  window.addEventListener("keydown", prime, { once: true });
}

function play(fn: (c: AudioContext) => void) {
  try {
    const c = getCtx();
    if (!c) return;
    fn(c);
  } catch {}
}

export const Sounds = {
  message: () => play((c) => {
    const g = c.createGain();
    g.gain.setValueAtTime(0.12, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.25);
    g.connect(c.destination);
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(880, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(1200, c.currentTime + 0.1);
    o.connect(g); o.start(); o.stop(c.currentTime + 0.25);
  }),

  callAccept: () => play((c) => {
    const g = c.createGain();
    g.gain.setValueAtTime(0.18, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5);
    g.connect(c.destination);
    [[523, 0], [659, 0.15], [784, 0.3]].forEach(([freq, t]) => {
      const o = c.createOscillator(); o.type = "sine"; o.frequency.value = freq;
      o.connect(g); o.start(c.currentTime + t); o.stop(c.currentTime + t + 0.15);
    });
  }),

  callDecline: () => play((c) => {
    const g = c.createGain();
    g.gain.setValueAtTime(0.18, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4);
    g.connect(c.destination);
    [[400, 0], [300, 0.2]].forEach(([freq, t]) => {
      const o = c.createOscillator(); o.type = "sawtooth"; o.frequency.value = freq;
      o.connect(g); o.start(c.currentTime + t); o.stop(c.currentTime + t + 0.15);
    });
  }),

  callEnd: () => play((c) => {
    const g = c.createGain();
    g.gain.setValueAtTime(0.15, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4);
    g.connect(c.destination);
    const o = c.createOscillator(); o.type = "sine";
    o.frequency.setValueAtTime(600, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(200, c.currentTime + 0.4);
    o.connect(g); o.start(); o.stop(c.currentTime + 0.4);
  }),

  sent: () => play((c) => {
    const g = c.createGain();
    g.gain.setValueAtTime(0.07, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.12);
    g.connect(c.destination);
    const o = c.createOscillator(); o.type = "sine"; o.frequency.value = 1000;
    o.connect(g); o.start(); o.stop(c.currentTime + 0.12);
  }),
};
