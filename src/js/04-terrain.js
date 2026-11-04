// ============================== TERRAIN ==============================
// The landscape is a W×H bitmap: `mask` (1 = solid) for collision and an RGBA buffer
// (`buf`, a Uint32 view over ImageData) for drawing. Explosions edit both and push
// only the dirty rectangle to the terrain canvas.
const Terrain = {
  W: CFG.W, H: CFG.H, mask: null, buf: null, img: null, cvs: null, ctx: null, cavern: false, ceilArr: null, style: 'Island', theme: THEMES.Meadow, themeName: 'Meadow', decor: [], version: 0,
  init() {
    this.mask = new Uint8Array(this.W * this.H);
    this.cvs = document.createElement('canvas'); this.cvs.width = this.W; this.cvs.height = this.H;
    this.ctx = this.cvs.getContext('2d');
    this.img = this.ctx.createImageData(this.W, this.H);
    this.buf = new Uint32Array(this.img.data.buffer);
  },
  solid(x, y) {
    if (x < 0 || x >= this.W || y >= this.H) return false;
    if (y < 0) return this.cavern;
    return this.mask[(y | 0) * this.W + (x | 0)] === 1;
  },
  generate(style, seed, themeName) {
    const W = this.W, H = this.H, m = this.mask, rng = mulberry32(seed);
    this.style = style; this.cavern = style === 'Cavern';
    this.themeName = THEMES[themeName] ? themeName : 'Meadow'; this.theme = THEMES[this.themeName];
    m.fill(0);
    const nA = noise1(rng), nB = noise1(rng), nC = noise1(rng), n2 = noise2(rng);
    const water = CFG.WATER0;
    const top = new Float32Array(W).fill(H), bot = new Float32Array(W).fill(H), ceil = new Float32Array(W).fill(-1);
    // a smooth hump centred on c (0..1 of the map width) with half-width w
    const bump = (u, c, w) => smooth(c - w, c - w * 0.5, u) * smooth(c + w, c + w * 0.5, u);
    let islands = null;
    if (style === 'Archipelago') {
      const n = 3 + (rng() < 0.5 ? 1 : 0); islands = [];
      for (let i = 0; i < n; i++) islands.push({ c: (i + 0.5) / n + (rng() - 0.5) * 0.06, w: 0.5 / n * (0.8 + rng() * 0.3), h: 170 + rng() * 220 });
    }
    for (let x = 0; x < W; x++) {
      const u = x / W;
      switch (style) {
        case 'Island': {
          // envelope tapers the island to points at both ends
          const env = smooth(0.02, 0.16, u) * smooth(0.98, 0.84, u);
          top[x] = 820 - env * 300 - fbm(nA, x / 230, 4) * 190 * env;
          bot[x] = Math.min(water - 35, top[x] + 25 + env * 330 + fbm(nB, x / 70, 3) * 70);
          if (env < 0.04) { top[x] = H; bot[x] = H; }
          break;
        }
        case 'Archipelago': {   // several separate islands with open water between them
          let env = 0, hgt = 0;
          for (const isl of islands) { const b = bump(u, isl.c, isl.w); if (b > env) { env = b; hgt = isl.h; } }
          top[x] = 850 - env * hgt - fbm(nA, x / 150, 4) * 150 * env;
          bot[x] = Math.min(water - 35, top[x] + 25 + env * 300 + fbm(nB, x / 70, 3) * 70);
          if (env < 0.05) { top[x] = H; bot[x] = H; }
          break;
        }
        case 'Canyon': {        // flat-topped mesas split by ravines that drop to the water
          const env = smooth(0.01, 0.08, u) * smooth(0.99, 0.92, u), mesa = fbm(nC, x / 150, 2);
          if (mesa > -0.02) top[x] = 540 + fbm(nA, x / 240, 3) * 70;
          else if (mesa > -0.3) top[x] = 960 + fbm(nB, x / 60, 2) * 50;
          else top[x] = H;
          bot[x] = water - 35;
          if (env < 0.04) top[x] = H;
          break;
        }
        case 'Cavern': {
          const env = smooth(0, 0.06, u) * smooth(1, 0.94, u);
          top[x] = 760 - env * 120 - fbm(nA, x / 220, 4) * 220;
          bot[x] = water + 40;
          if (fbm(nC, x / 170, 2) > 0.33 || env < 0.05) top[x] = H; // pits straight down to the water
          const stal = Math.max(0, fbm(nB, x / 38, 2));
          ceil[x] = Math.min(250 + fbm(nC, x / 260 + 50, 3) * 110 + stal * stal * 300, (top[x] < H ? top[x] : 800) - 180);
          break;
        }
        // Skylands: no mainland at all, only floating islets (below)
      }
    }
    for (let y = 0; y < H; y++) {
      const row = y * W;
      for (let x = 0; x < W; x++) {
        let s = (y >= top[x] && y < bot[x]) || y < ceil[x];
        if (s && y > top[x] + 45 && y < bot[x] - 22) {          // tunnels & pockets inside the landmass
          if (n2(x / 90, y / 55) * 0.7 + n2(x / 30 + 9, y / 22) * 0.3 > 0.64) s = false;
        }
        if (s) m[row + x] = 1;
      }
    }
    // floating islets: flat-topped, pointy-bottomed blobs
    const islet = (cx, cy, rw, rh) => {
      for (let y = Math.floor(cy - rh); y < cy + rh * 1.7; y++) for (let x = Math.floor(cx - rw); x < cx + rw; x++) {
        if (x < 0 || x >= W || y < 0 || y >= H) continue;
        const dx = (x - cx) / rw, dy = (y - cy) / (y < cy ? rh * 0.45 : rh * 1.6);
        if (dx * dx + dy * dy < 1 + (n2(x / 18, y / 18) - 0.5) * 0.6) m[y * W + x] = 1;
      }
    };
    if (style === 'Island') for (let k = 0; k < 3; k++) { const rw = 45 + rng() * 55; islet(W * (0.22 + 0.56 * rng()), 240 + rng() * 150, rw, rw * 0.5); }
    if (style === 'Archipelago') for (let k = 0; k < 2; k++) { const rw = 40 + rng() * 40; islet(W * (0.15 + 0.7 * rng()), 300 + rng() * 150, rw, rw * 0.5); }
    if (style === 'Skylands') {
      const n = 9;
      for (let k = 0; k < n; k++) { const rw = 70 + rng() * 90; islet(W * ((k + 0.5) / n + (rng() - 0.5) * 0.05), 340 + rng() * 420, rw, rw * 0.55); }
      for (let k = 0; k < 3; k++) { const rw = 28 + rng() * 25; islet(W * (0.1 + 0.8 * rng()), 220 + rng() * 120, rw, rw * 0.5); }
    }
    this.ceilArr = ceil;
    this.decorate(rng, ceil);
    this.paintAll();
  },
  // Cosmetic props (trees, cacti, mushrooms…) on flat bits of surface. Deterministic from the
  // seed so host and guest grow the same forest; they tumble away when the ground under them goes.
  decorate(rng, ceil) {
    const W = this.W, m = this.mask, th = this.theme, types = this.cavern ? ['crystal', 'mushroom', 'rock', 'crystal'] : th.decor;
    this.decor = [];
    for (let x = 30; x < W - 30; x += 10 + (rng() * 16 | 0)) {
      if (rng() > th.density) continue;
      let y = -1;
      for (let yy = this.cavern ? (ceil[x] | 0) + 6 : 0; yy < CFG.WATER0 - 20; yy++) if (m[yy * W + x]) { y = yy; break; }
      if (y < 0) continue;
      if (!this.solid(x - 5, y + 2) || this.solid(x - 5, y - 4) || !this.solid(x + 5, y + 2) || this.solid(x + 5, y - 4)) continue;
      this.decor.push({ x, y, type: types[rng() * types.length | 0], s: 0.75 + rng() * 0.7, f: rng() < 0.5 ? 1 : -1, ph: rng() * 6.28, fall: false, vy: 0, rot: 0, vr: 0 });
    }
  },
  // Colour every solid pixel based on its vertical depth below the surface (grass → dirt strata)
  // and its height above an underside (roots / cave rock).
  paintAll() {
    const W = this.W, H = this.H, m = this.mask, buf = this.buf, up = new Uint16Array(H);
    for (let x = 0; x < W; x++) {
      let run = 0;
      for (let y = H - 1; y >= 0; y--) { if (m[y * W + x]) { run++; up[y] = run; } else run = 0; }
      let down = 0;
      for (let y = 0; y < H; y++) {
        const i = y * W + x;
        if (!m[i]) { down = 0; buf[i] = 0; continue; }
        down++; buf[i] = this.colorAt(x, y, down, up[y]);
      }
    }
    this.ctx.putImageData(this.img, 0, 0); this.version++;
  },
  colorAt(x, y, down, up) {
    const h = hash2(x, y), j = (h - 0.5) * 18, th = this.theme;
    let r, g, b;
    const isCeil = this.cavern && y < this.ceilArr[x] + 2;
    if (isCeil) {
      const band = ((y + Math.sin(x * 0.03) * 6) / 16 | 0) % 3;
      [r, g, b] = [[96, 88, 120], [84, 78, 108], [104, 96, 128]][band];
      if (up <= 4) { r = 70; g = 120; b = 80; }            // dangling moss
    } else if (down <= 3) [r, g, b] = th.tip;              // bright grass / snow / sand tips
    else if (down <= 8) [r, g, b] = th.grass;
    else if (down <= 11) [r, g, b] = th.soil;
    else {
      const band = ((y + Math.sin(x * 0.02) * 8 + Math.sin(x * 0.007) * 20) / 22 | 0) % 3;
      [r, g, b] = th.bands[band];
      if (h < 0.025) [r, g, b] = th.pebble;                // pebbles
    }
    if (!isCeil && up <= 6 && down > 11) [r, g, b] = th.root; // root-y underside
    r = clamp(r + j, 0, 255); g = clamp(g + j, 0, 255); b = clamp(b + j * 0.7, 0, 255);
    return (255 << 24) | (b << 16) | (g << 8) | r;
  },
  flush(x0, y0, x1, y1) {
    x0 = Math.max(0, x0 | 0); y0 = Math.max(0, y0 | 0); x1 = Math.min(this.W - 1, Math.ceil(x1)); y1 = Math.min(this.H - 1, Math.ceil(y1));
    if (x1 >= x0 && y1 >= y0) { this.ctx.putImageData(this.img, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1); this.version++; }
  },
  carve(cx, cy, r, char = true) {
    const W = this.W, H = this.H, m = this.mask, buf = this.buf;
    const rim = char ? 6 : 0, R = r + rim;
    const x0 = Math.max(0, Math.floor(cx - R)), x1 = Math.min(W - 1, Math.ceil(cx + R));
    const y0 = Math.max(0, Math.floor(cy - R)), y1 = Math.min(H - 1, Math.ceil(cy + R));
    if (x0 > x1 || y0 > y1) return;
    const r2 = r * r, R2 = R * R;
    for (let y = y0; y <= y1; y++) {
      const dy = y - cy;
      for (let x = x0; x <= x1; x++) {
        const dx = x - cx, d2 = dx * dx + dy * dy; if (d2 > R2) continue;
        const i = y * W + x; if (!m[i]) continue;
        if (d2 < r2) { m[i] = 0; buf[i] = 0; }
        else { // charred rim: blend toward soot, strongest at the crater edge
          const k = 0.6 * (1 - (Math.sqrt(d2) - r) / rim), c = buf[i];
          const rr = c & 255, gg = (c >> 8) & 255, bb = (c >> 16) & 255;
          buf[i] = (255 << 24) | ((bb + (22 - bb) * k) << 16) | ((gg + (20 - gg) * k) << 8) | (rr + (28 - rr) * k);
        }
      }
    }
    this.flush(x0, y0, x1, y1);
  },
  // Stamp a rotated steel plank into the bitmap
  girder(cx, cy, ang, len = 80, th = 8) {
    const W = this.W, ca = Math.cos(ang), sa = Math.sin(ang), hl = len / 2, ht = th / 2, ext = hl + ht + 2;
    for (let y = Math.floor(cy - ext); y <= cy + ext; y++) for (let x = Math.floor(cx - ext); x <= cx + ext; x++) {
      if (x < 0 || y < 0 || x >= W || y >= this.H) continue;
      const dx = x - cx, dy = y - cy, u = dx * ca + dy * sa, v = -dx * sa + dy * ca;
      if (Math.abs(u) > hl || Math.abs(v) > ht) continue;
      const i = y * W + x; this.mask[i] = 1;
      let r = 236, g = 128, b = 44;
      if (Math.abs(v) > ht - 1.6 || Math.abs(u) > hl - 1.6) { r = 150; g = 70; b = 22; }
      else if (((u + hl) % 16) > 6 && ((u + hl) % 16) < 10 && Math.abs(v) < 1.8) { r = 120; g = 52; b = 16; }
      else if (v < -1) { r = 255; g = 168; b = 80; }
      this.buf[i] = (255 << 24) | (b << 16) | (g << 8) | r;
    }
    this.flush(cx - ext, cy - ext, cx + ext, cy + ext);
  },
};

