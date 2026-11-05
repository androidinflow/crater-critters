// ============================== AUDIO ==============================
const Sfx = {
  ac: null, out: null, nb: null, muted: false, last: {},
  init() {
    if (this.ac) { if (this.ac.state === 'suspended') this.ac.resume(); return; }
    try { this.ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    this.out = this.ac.createGain(); this.out.gain.value = 0.45;
    const comp = this.ac.createDynamicsCompressor(); this.out.connect(comp); comp.connect(this.ac.destination);
    const len = this.ac.sampleRate; this.nb = this.ac.createBuffer(1, len, len);
    const d = this.nb.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  },
  ok(key, ms) {
    if (!this.ac || this.muted) return false;
    if (key) { const n = performance.now(); if (this.last[key] && n - this.last[key] < ms) return false; this.last[key] = n; }
    return true;
  },
  tone(f, dur, type = 'square', vol = 0.15, f2 = null, delay = 0) {
    this._hit = true; if (!this.ok()) return; const t = this.ac.currentTime + delay;
    const o = this.ac.createOscillator(), gn = this.ac.createGain(); o.type = type;
    o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(gn); gn.connect(this.out); o.start(t); o.stop(t + dur + 0.05);
  },
  noise(dur, vol = 0.3, freq = 1000, f2 = null, type = 'lowpass', q = 1, delay = 0) {
    this._hit = true; if (!this.ok()) return; const t = this.ac.currentTime + delay;
    const s = this.ac.createBufferSource(); s.buffer = this.nb; s.loop = true;
    const fl = this.ac.createBiquadFilter(); fl.type = type; fl.Q.value = q;
    fl.frequency.setValueAtTime(freq, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const gn = this.ac.createGain(); gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(gn); gn.connect(this.out); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  },
  boom(R) { const s = Math.min(1, R / 75); this.noise(0.35 + s * 0.9, 0.55 + s * 0.4, 1600, 50); this.tone(95, 0.3 + s * 0.5, 'sine', 0.55, 28); },
  // critter "voice": a few quick squeaky syllables
  blip(base, n = 3) {
    if (!this.ok('blip', 60)) return;
    for (let i = 0; i < n; i++) { const f = base * rand(0.8, 1.35); this.tone(f, 0.07, i % 2 ? 'triangle' : 'square', 0.07, f * rand(0.7, 1.5), i * 0.085); }
  },
  jump(back) { if (this.ok('jump', 80)) this.tone(back ? 260 : 320, 0.18, 'square', 0.07, back ? 900 : 640); },
  thud() { if (this.ok('thud', 90)) { this.tone(120, 0.12, 'sine', 0.25, 50); this.noise(0.08, 0.15, 500); } },
  clack() { if (this.ok('clack', 70)) this.tone(rand(500, 700), 0.05, 'triangle', 0.12, 300); },
  splash() { if (this.ok('splash', 120)) { this.noise(0.7, 0.45, 2500, 300, 'bandpass', 0.8); this.tone(400, 0.25, 'sine', 0.12, 120); } },
  whoosh() { this.noise(0.25, 0.25, 600, 3000, 'bandpass', 1.5); },
  rocket() { this.noise(0.6, 0.25, 3000, 600, 'bandpass', 2); },
  shot() { this.noise(0.18, 0.6, 4000, 400); this.tone(140, 0.12, 'square', 0.15, 60); },
  kazoo() { if (!this.ok()) return; const t = this.ac.currentTime;
    const o = this.ac.createOscillator(), l = this.ac.createOscillator(), lg = this.ac.createGain(), f = this.ac.createBiquadFilter(), gn = this.ac.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(240, t); o.frequency.linearRampToValueAtTime(380, t + 0.25); o.frequency.linearRampToValueAtTime(200, t + 0.6);
    l.frequency.value = 22; lg.gain.value = 18; l.connect(lg); lg.connect(o.frequency);
    f.type = 'bandpass'; f.frequency.value = 1200; f.Q.value = 2;
    gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(0.3, t + 0.03); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.65);
    o.connect(f); f.connect(gn); gn.connect(this.out); o.start(t); l.start(t); o.stop(t + 0.7); l.stop(t + 0.7); },
  buzz() { if (this.ok('buzz', 180)) this.tone(rand(180, 220), 0.18, 'sawtooth', 0.04, 200); },
  pickup() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.12, null, i * 0.07)); },
  beep() { if (this.ok('beep', 90)) this.tone(1300, 0.05, 'square', 0.06); },
  tick() { this.tone(1800, 0.03, 'square', 0.04); },
  clank() { this.tone(220, 0.25, 'square', 0.1, 110); this.noise(0.1, 0.2, 3000, null, 'highpass'); },
  teleport() { this.tone(300, 0.4, 'sine', 0.15, 1800); this.tone(600, 0.4, 'triangle', 0.08, 2400, 0.05); },
  quack() { this.tone(500, 0.12, 'sawtooth', 0.1, 300); this.tone(480, 0.12, 'sawtooth', 0.1, 280, 0.16); },
  drill() { if (this.ok('drill', 100)) this.noise(0.12, 0.25, 300, 120); },
  sizzle() { if (this.ok('sizzle', 140)) this.noise(0.25, 0.08, 5000, 2000, 'highpass'); },
  sad() { this.tone(400, 0.25, 'triangle', 0.1, 300); this.tone(300, 0.4, 'triangle', 0.1, 180, 0.25); },
  fanfare() { [392, 523, 659, 784, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.22, 'square', 0.09, null, i * 0.14)); },
  dud() { this.noise(0.5, 0.15, 800, 200); this.tone(200, 0.3, 'triangle', 0.08, 80); },
  rumble() { if (this.ok('rumble', 200)) this.noise(0.3, 0.2, 200, 80); },
  crack() { this.noise(0.09, 0.7, 6000, 800, 'highpass'); this.tone(220, 0.2, 'square', 0.12, 40); },
  slap() { this.noise(0.08, 0.5, 1200, 300); this.tone(180, 0.15, 'triangle', 0.2, 60); this.tone(900, 0.06, 'sine', 0.1, 300, 0.03); },
  thunder() { this.noise(0.05, 0.8, 8000, 2000, 'highpass'); this.noise(1.4, 0.6, 400, 40, 'lowpass', 0.5, 0.05); this.tone(60, 1, 'sine', 0.4, 25, 0.05); },
  hiss() { if (this.ok('hiss', 300)) this.noise(0.6, 0.12, 2500, 900, 'bandpass', 0.7); },
  boing() { this.tone(180, 0.35, 'sine', 0.2, 720); this.tone(360, 0.3, 'triangle', 0.08, 1400, 0.02); },
  laser() { this.tone(1400, 0.45, 'sawtooth', 0.12, 300); this.noise(0.4, 0.15, 6000, 1500, 'bandpass', 3); },
  stomp() { this.tone(70, 0.4, 'sine', 0.6, 25); this.noise(0.3, 0.5, 400, 60); },
  hum() { if (this.ok('hum', 250)) this.tone(90, 0.3, 'sawtooth', 0.08, 60); },
  flame() { if (this.ok('flame', 200)) this.noise(0.3, 0.25, 900, 300, 'bandpass', 0.6); },
  swoosh() { if (this.ok('swoosh', 200)) this.noise(0.18, 0.12, 400, 1800, 'bandpass', 2); },
  pew() { if (this.ok('pew', 40)) { this.noise(0.06, 0.3, 3000, 500); this.tone(700, 0.05, 'square', 0.06, 200); } },
  choir() { [392, 494, 587, 784].forEach((f, i) => { this.tone(f, 1.1, 'triangle', 0.08, null, i * 0.02); this.tone(f * 1.005, 1.1, 'sine', 0.06, null, i * 0.02); }); },
  mortar() { this.tone(160, 0.15, 'square', 0.14, 60); this.noise(0.12, 0.3, 1200, 200); },
};

