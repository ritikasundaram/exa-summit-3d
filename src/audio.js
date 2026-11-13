// Tiny synthesized sound effects (no audio assets needed).
let ac = null;
let muted = false;
try {
  muted = localStorage.getItem('exa-muted') === '1';
} catch {}

function ctx() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ac = new AC();
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}

export function isMuted() {
  return muted;
}
export function setMuted(m) {
  muted = m;
  try {
    localStorage.setItem('exa-muted', m ? '1' : '0');
  } catch {}
}
export function unlockAudio() {
  ctx();
}

function env(g, t, a, peak, d) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}

export function beep(freq = 880, dur = 0.08, type = 'sine', vol = 0.15) {
  const c = !muted && ctx();
  if (!c) return;
  const t = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  env(g, t, 0.005, vol, dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export function chime() {
  [660, 880, 1320].forEach((f, i) => setTimeout(() => beep(f, 0.18, 'triangle', 0.12), i * 90));
}

export function buzz() {
  beep(140, 0.25, 'square', 0.08);
}

export function bleat(pitch = 1) {
  const c = !muted && ctx();
  if (!c) return;
  const t = c.currentTime;
  const o = c.createOscillator();
  o.type = 'sawtooth';
  const base = (330 + Math.random() * 80) * pitch;
  o.frequency.setValueAtTime(base, t);
  o.frequency.linearRampToValueAtTime(base * 1.12, t + 0.15);
  o.frequency.linearRampToValueAtTime(base * 0.9, t + 0.7);
  const lfo = c.createOscillator();
  lfo.frequency.value = 22 + Math.random() * 6;
  const lfoG = c.createGain();
  lfoG.gain.value = base * 0.06;
  lfo.connect(lfoG).connect(o.frequency);
  const trem = c.createGain();
  const tremL = c.createGain();
  tremL.gain.value = 0.5;
  lfo.connect(tremL).connect(trem.gain);
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1200;
  bp.Q.value = 1.2;
  const g = c.createGain();
  env(g, t, 0.05, 0.22, 0.75);
  o.connect(trem).connect(bp).connect(g).connect(c.destination);
  o.start(t);
  lfo.start(t);
  o.stop(t + 0.9);
  lfo.stop(t + 0.9);
}

export function shutter() {
  const c = !muted && ctx();
  if (!c) return;
  const t = c.currentTime;
  const len = 0.12;
  const buf = c.createBuffer(1, c.sampleRate * len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
  const s = c.createBufferSource();
  s.buffer = buf;
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 1800;
  const g = c.createGain();
  g.gain.value = 0.4;
  s.connect(hp).connect(g).connect(c.destination);
  s.start(t);
  setTimeout(() => {
    const s2 = c.createBufferSource();
    s2.buffer = buf;
    s2.connect(hp);
    s2.start();
  }, 70);
}

export function pop() {
  beep(520, 0.06, 'sine', 0.12);
  setTimeout(() => beep(780, 0.06, 'sine', 0.1), 50);
}
