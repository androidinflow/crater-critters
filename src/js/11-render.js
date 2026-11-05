// ============================== RENDERING ==============================
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const view = { w: 0, h: 0, dpr: 1 };
const cam = { x: CFG.W / 2, y: 600, zoom: 0.8, tz: 0.8, manualT: 0 };
let bg = null;
function resize() {
  view.dpr = Math.min(window.devicePixelRatio || 1, 2);
  view.w = window.innerWidth; view.h = window.innerHeight;
  canvas.width = view.w * view.dpr; canvas.height = view.h * view.dpr;
}
window.addEventListener('resize', resize);

function makeBackground(seed, cavern) {
  const rng = mulberry32(seed ^ 0x5bd1e995), n = noise1(rng);
  const layers = [];
  const th = Terrain.theme, specs = cavern
    ? [{ p: 0.12, col: '#2a2140', amp: 160, base: 0.55, f: 180 }, { p: 0.28, col: '#3a2d55', amp: 120, base: 0.7, f: 110 }]
    : [{ p: 0.12, col: th.layers[0], amp: 220, base: 0.62, f: 260 }, { p: 0.25, col: th.layers[1], amp: 160, base: 0.72, f: 150 }, { p: 0.4, col: th.layers[2], amp: 90, base: 0.82, f: 90 }];
  specs.forEach((s, i) => { const h = new Float32Array(1024); for (let k = 0; k < 1024; k++) h[k] = (fbm(n, k * 8 / s.f + i * 100, 3) * 0.5 + 0.5) * s.amp; layers.push({ ...s, h }); });
  const clouds = Array.from({ length: 14 }, () => ({ x: rand(0, 3000), y: rand(30, 300), s: rand(0.6, 1.5), v: rand(6, 16) }));
  return { layers, clouds, cavern };
}
function drawBackground() {
  const { w, h } = view, cav = bg && bg.cavern;
  const gr = ctx.createLinearGradient(0, 0, 0, h);
  if (cav) { gr.addColorStop(0, '#120c22'); gr.addColorStop(1, '#2e2148'); }
  else if (g.sd) { gr.addColorStop(0, '#5a2a4a'); gr.addColorStop(0.6, '#e07a5f'); gr.addColorStop(1, '#f2cc8f'); }
  else { const sk = Terrain.theme.sky; gr.addColorStop(0, sk[0]); gr.addColorStop(0.65, sk[1]); gr.addColorStop(1, sk[2]); }
  ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
  if (!bg) return;
  const th = Terrain.theme;
  if (!cav) { // sun
    const sx = w * 0.8 - cam.x * 0.03, sy = h * 0.2;
    ctx.fillStyle = th.lava ? 'rgba(255,120,60,0.3)' : 'rgba(255,240,180,0.35)'; ctx.beginPath(); ctx.arc(sx, sy, 70 + Math.sin(g.time) * 4, 0, 7); ctx.fill();
    ctx.fillStyle = th.sun; ctx.beginPath(); ctx.arc(sx, sy, 42, 0, 7); ctx.fill();
  } else { // glowing crystals in the cave wall
    for (let i = 0; i < 30; i++) { const x = ((i * 397 - cam.x * 0.08) % (w + 100) + w + 100) % (w + 100) - 50, y = (i * 211) % h;
      ctx.fillStyle = `rgba(150,120,255,${0.15 + 0.1 * Math.sin(g.time * 2 + i)})`; ctx.beginPath(); ctx.arc(x, y, 3 + (i % 3), 0, 7); ctx.fill(); }
  }
  // clouds (parallax 0.3, drift with wind)
  if (!cav) for (const c of bg.clouds) {
    const span = w + 600, x = ((c.x - cam.x * 0.3) % span + span) % span - 300, y = c.y - (cam.y - 600) * 0.15;
    ctx.fillStyle = th.cloud;
    for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(x + k * 26 * c.s, y + Math.sin(k * 2) * 6 * c.s, (22 - Math.abs(k - 1.5) * 4) * c.s, 0, 7); ctx.fill(); }
  }
  // mountains / cave silhouettes
  for (const L of bg.layers) {
    ctx.fillStyle = L.col; ctx.beginPath();
    const baseY = h * L.base - (cam.y - 600) * L.p * cam.zoom;
    if (cav) { // stalactites from the top
      ctx.moveTo(0, 0);
      for (let sx = 0; sx <= w + 8; sx += 8) { const k = (((sx + cam.x * L.p) / 8) | 0) & 1023; ctx.lineTo(sx, (1 - L.base) * h * 0.4 + L.h[k] * 0.8 - (cam.y - 600) * L.p * 0.3); }
      ctx.lineTo(w, 0); ctx.closePath(); ctx.fill(); ctx.beginPath();
    }
    ctx.moveTo(0, h);
    for (let sx = 0; sx <= w + 8; sx += 8) { const k = (((sx + cam.x * L.p) / 8) | 0) & 1023; ctx.lineTo(sx, baseY - L.h[k]); }
    ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
  }
  // weather: drifting snowflakes / rising embers (screen space, purely decorative)
  if (th.flakes && !cav) { ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 60; i++) { const sp = 18 + (i % 5) * 9, x = ((i * 173 + Math.sin(g.time * 0.7 + i) * 30 + g.wind * g.time * 40 - cam.x * 0.2) % (w + 40) + w + 40) % (w + 40) - 20, y = ((i * 97 + g.time * sp) % (h + 20) + h + 20) % (h + 20) - 10;
      ctx.beginPath(); ctx.arc(x, y, 1.2 + (i % 3) * 0.7, 0, 7); ctx.fill(); } }
  if (th.embers) {
    for (let i = 0; i < 40; i++) { const sp = 25 + (i % 5) * 12, x = ((i * 211 + Math.sin(g.time * 1.3 + i) * 25 - cam.x * 0.15) % (w + 40) + w + 40) % (w + 40) - 20, y = h - ((i * 131 + g.time * sp) % (h + 40));
      ctx.fillStyle = `rgba(255,${120 + (i % 4) * 30},40,${0.35 + 0.3 * Math.sin(g.time * 6 + i)})`; ctx.beginPath(); ctx.arc(x, y, 1.5 + (i % 2), 0, 7); ctx.fill(); } }
}
// Surface decorations (drawn between terrain and critters)
function drawDecor(x, vx0, vx1) {
  for (const d of Terrain.decor) {
    if (d.x < vx0 - 60 || d.x > vx1 + 60) continue;
    x.save(); x.translate(d.x, d.y); if (d.fall) x.rotate(d.rot); x.scale(d.s * d.f, d.s); drawProp(x, d.type, g.time + d.ph); x.restore();
  }
}
function drawProp(x, type, t) {
  x.lineJoin = 'round'; x.lineCap = 'round'; x.strokeStyle = '#2b1d12'; x.lineWidth = 1.3;
  const sway = Math.sin(t * 1.3) * 0.03;
  switch (type) {
    case 'tree':
      x.fillStyle = '#7a4a28'; rr(x, -3, -20, 6, 21, 2); x.fill(); x.stroke();
      x.save(); x.translate(0, -20); x.rotate(sway); x.fillStyle = '#3f9a3a';
      circ(x, 0, -10, 14); x.fill(); x.stroke(); circ(x, -10, -3, 10); x.fill(); x.stroke(); circ(x, 10, -3, 10); x.fill(); x.stroke();
      x.fillStyle = '#5cc24e'; circ(x, -4, -12, 6); x.fill(); x.restore(); break;
    case 'bush':
      x.fillStyle = '#4caf50'; circ(x, -6, -5, 6); x.fill(); x.stroke(); circ(x, 6, -5, 6); x.fill(); x.stroke(); circ(x, 0, -8, 7); x.fill(); x.stroke(); break;
    case 'mushroom':
      x.fillStyle = '#f5e6c8'; rr(x, -2.5, -9, 5, 9, 1.5); x.fill(); x.stroke();
      x.fillStyle = '#e63946'; x.beginPath(); x.arc(0, -9, 7, Math.PI, 0); x.closePath(); x.fill(); x.stroke();
      x.fillStyle = '#fff'; circ(x, -3, -12, 1.4); x.fill(); circ(x, 3, -11, 1.1); x.fill(); break;
    case 'flower': {
      x.strokeStyle = '#3f9a3a'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(sway * 40, -6, sway * 60, -12); x.stroke();
      x.save(); x.translate(sway * 60, -12); x.fillStyle = ['#ff7aa2', '#ffd23f', '#c77dff', '#ff7b39'][(t * 0 + Math.abs(Math.sin(t * 0.01) * 4)) | 0];
      for (let i = 0; i < 5; i++) { circ(x, Math.cos(i * 1.257) * 3, Math.sin(i * 1.257) * 3, 2.2); x.fill(); } x.fillStyle = '#fff3b0'; circ(x, 0, 0, 1.8); x.fill(); x.restore(); break;
    }
    case 'rock':
      x.fillStyle = '#9a9aa5'; x.beginPath(); x.moveTo(-9, 0); x.lineTo(-7, -6); x.lineTo(-1, -9); x.lineTo(6, -7); x.lineTo(9, 0); x.closePath(); x.fill(); x.stroke();
      x.fillStyle = '#c4c4cf'; x.beginPath(); x.moveTo(-5, -5); x.lineTo(-1, -7); x.lineTo(2, -5); x.closePath(); x.fill(); break;
    case 'pine':
      x.fillStyle = '#6b4427'; x.fillRect(-2, -8, 4, 9);
      x.fillStyle = '#2e7d4f'; for (let i = 0; i < 3; i++) { const yy = -8 - i * 8, ww = 12 - i * 3; x.beginPath(); x.moveTo(-ww, yy); x.lineTo(0, yy - 11); x.lineTo(ww, yy); x.closePath(); x.fill(); x.stroke();
        x.strokeStyle = '#fff'; x.lineWidth = 2; x.beginPath(); x.moveTo(-ww * 0.5, yy - 5); x.lineTo(0, yy - 10); x.lineTo(ww * 0.5, yy - 5); x.stroke(); x.strokeStyle = '#2b1d12'; x.lineWidth = 1.3; } break;
    case 'snowman':
      x.fillStyle = '#fff'; circ(x, 0, -6, 7); x.fill(); x.stroke(); circ(x, 0, -16, 5); x.fill(); x.stroke();
      x.fillStyle = '#111'; circ(x, -2, -17, 0.8); x.fill(); circ(x, 2, -17, 0.8); x.fill(); x.fillStyle = '#ff7b39'; x.beginPath(); x.moveTo(0, -16); x.lineTo(6, -15); x.lineTo(0, -14); x.fill();
      x.strokeStyle = '#6b4427'; x.beginPath(); x.moveTo(-7, -8); x.lineTo(-13, -13); x.moveTo(7, -8); x.lineTo(13, -12); x.stroke(); break;
    case 'cactus':
      x.fillStyle = '#4caf50'; rr(x, -4, -24, 8, 25, 4); x.fill(); x.stroke(); rr(x, -12, -18, 5, 9, 2.5); x.fill(); x.stroke(); x.fillRect(-9, -11, 6, 3);
      rr(x, 7, -22, 5, 10, 2.5); x.fill(); x.stroke(); x.fillRect(3, -14, 6, 3); x.fillStyle = '#ff7aa2'; circ(x, 0, -24, 2); x.fill(); break;
    case 'skull':
      x.fillStyle = '#f2efe4'; circ(x, 0, -6, 6); x.fill(); x.stroke(); x.fillRect(-4, -3, 8, 4); x.strokeRect(-4, -3, 8, 4);
      x.fillStyle = '#2b1d12'; circ(x, -2.3, -7, 1.6); x.fill(); circ(x, 2.3, -7, 1.6); x.fill(); break;
    case 'tumble':
      x.strokeStyle = '#a0703f'; x.lineWidth = 1.2; x.save(); x.translate(0, -7); x.rotate(t * 0.5);
      for (let i = 0; i < 4; i++) { x.beginPath(); x.ellipse(0, 0, 7, 3, i * 0.785, 0, 7); x.stroke(); } x.restore(); break;
    case 'deadtree':
      x.strokeStyle = '#3a2a2a'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, 0); x.lineTo(0, -16); x.lineTo(-7, -26); x.moveTo(0, -12); x.lineTo(8, -22); x.lineTo(9, -30); x.moveTo(0, -16); x.lineTo(3, -28); x.stroke(); break;
    case 'crystal': {
      const gl = 0.6 + 0.4 * Math.sin(t * 3); x.fillStyle = `rgba(190,140,255,${gl})`; x.strokeStyle = '#6a3fb5';
      x.beginPath(); x.moveTo(-6, 0); x.lineTo(-3, -16); x.lineTo(1, 0); x.closePath(); x.fill(); x.stroke();
      x.beginPath(); x.moveTo(0, 0); x.lineTo(5, -11); x.lineTo(8, 0); x.closePath(); x.fill(); x.stroke(); break;
    }
  }
}
function waterPath(x0, x1, yb, amp, ph) {
  ctx.beginPath(); ctx.moveTo(x0, yb);
  for (let x = x0; x <= x1 + 16; x += 16) ctx.lineTo(x, g.waterY + Math.sin(x * 0.018 + g.time * 1.8 + ph) * amp + Math.sin(x * 0.047 - g.time * 2.6 + ph) * amp * 0.5);
  ctx.lineTo(x1 + 16, yb); ctx.closePath();
}
function drawWater(front, vx0, vx1, vy1) {
  const yb = Math.max(vy1, g.waterY + 40) + 40;
  if (!front) {
    waterPath(vx0, vx1, yb, 5, 1.3); ctx.fillStyle = Terrain.theme.water[0]; ctx.fill();
  } else {
    const gr = ctx.createLinearGradient(0, g.waterY, 0, g.waterY + 200), wc = Terrain.theme.water;
    gr.addColorStop(0, wc[1]); gr.addColorStop(1, wc[2]);
    waterPath(vx0, vx1, yb, 4, 0); ctx.fillStyle = gr; ctx.fill();
    ctx.strokeStyle = Terrain.theme.foam; ctx.lineWidth = 2.5; ctx.stroke();
  }
}

function drawCritter(x, c, t) {
  const r = c.r, f = c.facing, col = c.team.color;
  const wk = c.walkT || 0, ph = c.walkPh, idle = c.idleT || 0;
  const active = c === g.active && g.state === 'turn';
  // --- idle gags, all derived from the idle clock so host and guest agree ---
  const tap = idle > 5 && (idle - 5) % 6 < 1.5 ? Math.abs(Math.sin((idle - 5) % 6 * 8)) : 0;          // foot tapping
  const yawn = idle > 9 && (idle - 9) % 13 < 1.3 ? Math.sin((idle - 9) % 13 / 1.3 * Math.PI) : 0;     // big yawn
  const ruffle = idle > 3 && (idle - 3) % 8 < 0.45 ? Math.sin((idle - 3) % 8 / 0.45 * Math.PI * 4) * 0.14 : 0; // quill shake
  const blink = c.blinkT >= 0 && c.blinkT < 0.16 ? Math.sin(c.blinkT / 0.16 * Math.PI) : 0;
  x.save(); x.translate(c.x, c.y);
  if (c.dyingT > 0) x.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(t * 20));
  const br = Math.sin(t * 3 + c.seed) * 0.03, sq = c.squash + br - yawn * 0.06;
  // walk: bob up on each step, squash a little on footfall
  const bob = Math.abs(Math.sin(ph)) * 1.6 * wk;
  x.translate(0, -bob);
  // squash & stretch anchored at the feet
  x.translate(0, r); x.scale(1 + sq, 1 - sq); x.translate(0, -r);
  if (c.spin) x.rotate(c.spin);
  x.scale(f, 1);
  // lean into the walk (more when shoving against a wall), gentle sway while idle
  x.rotate(wk * (c.blocked ? 0.3 : 0.13) + (idle > 1 ? Math.sin(t * 1.4 + c.seed) * 0.025 : 0) + yawn * -0.08);
  const scared = c.dyingT <= 0 && c.faceT <= 0 && (c.tumble || (c.mode === 'air' && c.vy > 330));
  // --- penguin: dark coat, white front, two flippers, orange beak and feet ---
  const coat = '#262a3a', coatLine = '#121420', front = c.face === 4 && c.faceT > 0 ? '#d9e6bd' : '#f6f2e8';
  // flipper angle: swings with the walk, flaps when startled or airborne, waves a little when bored
  const flap = Math.sin(ph) * 0.5 * wk + (idle > 1 ? Math.sin(t * 1.7 + c.seed) * 0.05 : 0) + ruffle * 1.5 + (c.hurtT > 0 || scared ? 0.9 : 0) + (c.mode === 'air' && !c.tumble ? 0.6 : 0) + yawn * 0.4;
  // far flipper (behind the body)
  x.fillStyle = coat; x.strokeStyle = coatLine; x.lineWidth = 1.2;
  x.save(); x.translate(-r * 0.5, -r * 0.15); x.rotate(0.45 + flap * 0.6); x.beginPath(); x.ellipse(0, r * 0.5, r * 0.22, r * 0.58, 0, 0, 7); x.fill(); x.stroke(); x.restore();
  // feet: stepping cycle while walking (swing forward + lift), tapping while bored
  x.fillStyle = '#ff9f1c'; x.strokeStyle = '#a65d08'; x.lineWidth = 1.2;
  const s1 = Math.sin(ph) * wk, s2 = Math.sin(ph + Math.PI) * wk;
  x.beginPath(); x.ellipse(-3.5 + s1 * 3.2, r - 0.5 - Math.max(0, s1) * 2.4 + bob * 0.5, 4, 2.2, s1 * 0.3, 0, 7); x.fill(); x.stroke();
  x.beginPath(); x.ellipse(4 + s2 * 3.2, r - 0.5 - Math.max(0, s2) * 2.4 - tap * 2.6 + bob * 0.5, 4, 2.2, s2 * 0.3 - tap * 0.5, 0, 7); x.fill(); x.stroke();
  // body: an egg, a little taller than it is wide
  x.fillStyle = coat; x.strokeStyle = coatLine; x.lineWidth = 1.4; x.beginPath(); x.ellipse(0, -r * 0.08, r * 0.98, r * 1.12, 0, 0, 7); x.fill(); x.stroke();
  // white front and face patch
  x.fillStyle = front; x.beginPath(); x.ellipse(r * 0.18, r * 0.24, r * 0.6, r * 0.72, 0, 0, 7); x.fill();
  x.beginPath(); x.ellipse(r * 0.42, -r * 0.42, r * 0.5, r * 0.46, 0, 0, 7); x.fill();
  // soot smudges when burnt
  if (c.face === 3 && c.faceT > 0) { x.fillStyle = 'rgba(40,30,25,0.5)'; x.beginPath(); x.ellipse(r * 0.25, r * 0.4, 2.6, 1.5, 0.4, 0, 7); x.fill(); x.beginPath(); x.ellipse(r * 0.6, -r * 0.2, 2, 1.3, -0.5, 0, 7); x.fill(); }
  // near flipper
  x.fillStyle = coat; x.strokeStyle = coatLine; x.lineWidth = 1.2;
  x.save(); x.translate(r * 0.15, -r * 0.1); x.rotate(-(0.2 + flap * 0.9)); x.beginPath(); x.ellipse(0, r * 0.52, r * 0.22, r * 0.6, 0, 0, 7); x.fill(); x.stroke(); x.restore();
  // team scarf around the neck, tails fluttering behind (harder while moving)
  x.strokeStyle = col; x.lineWidth = 3.4; x.lineCap = 'round'; x.beginPath(); x.arc(0, -r * 1.0, r * 0.72, Math.PI * 0.1, Math.PI * 0.9); x.stroke(); x.lineCap = 'butt';
  x.fillStyle = col; const tw = Math.sin(t * 9 + c.seed) * (2 + wk * 3), tb = wk * 3;
  x.beginPath(); x.moveTo(-r * 0.62, -r * 0.55); x.lineTo(-r * 1.4 - tb, -r * 0.6 + tw); x.lineTo(-r * 1.25 - tb, -r * 0.15 + tw); x.closePath(); x.fill();
  // bandage once badly hurt
  const lowHp = c.alive && c.hp - c.pending <= 30 && c.hp > 0;
  if (lowHp) { x.strokeStyle = '#f4f1ea'; x.lineWidth = 2.2; x.lineCap = 'round'; x.beginPath(); x.moveTo(-r * 0.3, -r * 1.15); x.lineTo(r * 0.1, -r * 0.85); x.moveTo(r * 0.05, -r * 1.2); x.lineTo(-r * 0.25, -r * 0.85); x.stroke(); x.lineCap = 'butt'; }
  // eyes
  const eyes = [[r * 0.22, -r * 0.5, r * 0.3], [r * 0.62, -r * 0.46, r * 0.28]];
  const face = c.faceT > 0 ? c.face : 0, dying = c.dyingT > 0, sad = c.sadT > 0 && !face;
  const focus = active && g.charging && !face;
  for (let k = 0; k < 2; k++) {
    const [ex, ey, er] = eyes[k];
    x.fillStyle = '#fff'; x.strokeStyle = '#2b1d12'; x.lineWidth = 1; circ(x, ex, ey, er); x.fill(); x.stroke();
    if (dying) { // X eyes
      x.lineWidth = 1.3; x.beginPath(); x.moveTo(ex - er * 0.5, ey - er * 0.5); x.lineTo(ex + er * 0.5, ey + er * 0.5); x.moveTo(ex + er * 0.5, ey - er * 0.5); x.lineTo(ex - er * 0.5, ey + er * 0.5); x.stroke();
    } else if (face === 2) { // dizzy spirals
      x.lineWidth = 1.1; x.beginPath();
      for (let a = 0; a < 7; a += 0.3) { const rr = a / 7 * er * 0.7; x.lineTo(ex + Math.cos(a + t * 9) * rr, ey + Math.sin(a + t * 9) * rr); } x.stroke();
    } else if (face === 1) { // ouch: clenched  > <
      x.lineWidth = 1.5; x.beginPath(); const d = k === 0 ? 1 : -1;
      x.moveTo(ex - d * er * 0.45, ey - er * 0.5); x.lineTo(ex + d * er * 0.3, ey); x.lineTo(ex - d * er * 0.45, ey + er * 0.5); x.stroke();
      // tears flung from the eyes right after the hit
      if (c.hurtT > 0.5) { const q = (0.9 - c.hurtT) / 0.4; x.fillStyle = '#9ad7ff'; circ(x, ex - er - q * 6, ey - er * 0.3 + q * q * 7, 1.6 - q); x.fill(); circ(x, ex + er + q * 5, ey - er * 0.6 + q * q * 8, 1.5 - q); x.fill(); }
    } else if (face === 3) { // burnt: squint
      x.lineWidth = 1.4; x.beginPath(); x.moveTo(ex - er * 0.6, ey + er * 0.15); x.lineTo(ex + er * 0.6, ey - er * 0.05); x.stroke();
    } else if (face === 4) { // gassed: cross-eyed
      x.fillStyle = '#111'; circ(x, ex + (k === 0 ? er * 0.35 : -er * 0.35), ey + er * 0.1, er * 0.45); x.fill();
    } else if (scared) { // wide eyes, tiny pupils
      x.fillStyle = '#111'; circ(x, ex + c.px * f * er / 4, ey + c.py * er / 4, er * 0.28); x.fill();
    } else {
      x.fillStyle = '#111'; circ(x, ex + c.px * f * er / 4, ey + c.py * er / 4, er * (yawn > 0.3 ? 0.3 : 0.48)); x.fill();
      // eyelids: blink, sad droop, yawn squint, tired half-lid at low HP
      const lid = Math.max(blink, sad ? 0.55 : 0, yawn * 0.8, lowHp ? 0.25 : 0);
      if (lid > 0) { x.fillStyle = front; x.fillRect(ex - er - 0.5, ey - er - 0.5, er * 2 + 1, er * 2 * lid * 0.95); x.beginPath(); x.moveTo(ex - er, ey - er + er * 2 * lid * 0.95); x.lineTo(ex + er, ey - er + er * 2 * lid * 0.95); x.stroke(); }
      if (focus) { x.lineWidth = 1.6; x.beginPath(); x.moveTo(ex - er * 0.9, ey - er * 1.1 - (k ? 0.5 : 0)); x.lineTo(ex + er * 0.9, ey - er * 0.75 - (k ? -0.4 : 0)); x.stroke(); } // determined brows
    }
  }
  // beak: shut, chattering open when hurt/dizzy/scared, wide for a yawn, tongue out when gassed
  const open = dying || face === 1 || face === 2 || scared ? 0.55 : yawn > 0.2 ? yawn * 0.9 : face === 4 ? 0.3 : 0;
  const bx = r * 0.78, by = -r * 0.18;
  x.lineJoin = 'round'; x.lineWidth = 1.1;
  if (open > 0) { x.fillStyle = '#5a1a1a'; x.beginPath(); x.moveTo(bx, by - 1); x.lineTo(bx + r * 0.45, by + r * 0.15 * open); x.lineTo(bx, by + r * 0.3 * open + 2); x.closePath(); x.fill(); }
  x.fillStyle = '#ff9f1c'; x.strokeStyle = '#a65d08';
  x.beginPath(); x.moveTo(bx, by - r * 0.1); x.lineTo(bx + r * 0.5, by + r * 0.05 - open * r * 0.12); x.lineTo(bx, by + r * 0.12); x.closePath(); x.fill(); x.stroke();
  x.beginPath(); x.moveTo(bx, by + r * 0.1 + open * r * 0.3); x.lineTo(bx + r * 0.42, by + r * 0.12 + open * r * 0.4); x.lineTo(bx, by + r * 0.28 + open * r * 0.35); x.closePath(); x.fill(); x.stroke();
  if (face === 4 && open) { x.fillStyle = '#e06c8a'; x.beginPath(); x.ellipse(bx + r * 0.2, by + r * 0.3, 1.8, 2.4, 0.3, 0, 7); x.fill(); }
  else if (sad) { x.fillStyle = '#ff7aa2'; x.beginPath(); x.ellipse(bx - r * 0.15, by + r * 0.42, 1.6, 2.2, 0.3, 0, 7); x.fill(); }   // a blush of embarrassment
  if (focus) { x.strokeStyle = '#121420'; x.lineWidth = 1.4; x.beginPath(); x.moveTo(r * 0.05, -r * 0.85); x.lineTo(r * 0.4, -r * 0.78); x.moveTo(r * 0.5, -r * 0.8); x.lineTo(r * 0.85, -r * 0.72); x.stroke(); }   // determined brows
  // sweat drop when struggling against a wall or badly hurt
  if ((c.blocked && wk > 0.5) || (lowHp && Math.sin(t * 1.1 + c.seed) > 0.6)) { x.fillStyle = '#9ad7ff'; x.beginPath(); x.ellipse(r * 0.85, -r * 1.05 + (t * 10 % 6), 1.3, 2, 0, 0, 7); x.fill(); }
  // poisoned: a sickly green tint and the odd bubble
  if (c.poison > 0) {
    x.fillStyle = 'rgba(120,200,40,0.28)'; circ(x, 0, 0, r + 1); x.fill();
    x.fillStyle = 'rgba(190,240,90,0.7)'; for (let i = 0; i < 3; i++) { const q = (t * 0.7 + i * 0.33 + c.seed * 0.1) % 1; circ(x, -r * 0.6 + i * r * 0.6, -r * 1.3 - q * 14, 1.2 + (1 - q) * 1.2); x.fill(); }
  }
  // frozen: a block of ice around the whole critter
  if (c.frozen > 0) {
    x.globalAlpha = 0.55; x.fillStyle = '#bfe9ff'; x.strokeStyle = '#6cc3ff'; x.lineWidth = 1.5; rr(x, -r * 1.5, -r * 1.75, r * 3, r * 3.3, 3); x.fill(); x.stroke();
    x.globalAlpha = 0.9; x.strokeStyle = '#fff'; x.lineWidth = 1; x.beginPath(); x.moveTo(-r * 1.2, -r * 1.4); x.lineTo(-r * 0.5, -r * 0.5); x.moveTo(r * 0.8, r * 0.3); x.lineTo(r * 1.3, r * 1.2); x.stroke(); x.globalAlpha = 1;
  }
  // dizzy stars circling the head
  if (face === 2) {
    x.fillStyle = '#ffe066'; x.strokeStyle = '#8a6a00'; x.lineWidth = 0.6;
    for (let i = 0; i < 3; i++) { const a = t * 5 + i * 2.1, sx = Math.cos(a) * r * 1.2, sy = -r * 1.5 + Math.sin(a) * r * 0.35; star(x, sx, sy, 2.4); x.fill(); x.stroke(); }
  }
  x.restore();
  // Dandelion Chute: a seed-head canopy above the critter (drawn unrotated, in world space)
  if (c.mode === 'chute') {
    x.save(); x.translate(c.x, c.y - r - 26); x.rotate(Math.sin(t * 2 + c.seed) * 0.08 + clamp(c.vx / 300, -0.3, 0.3));
    x.strokeStyle = 'rgba(43,29,18,0.6)'; x.lineWidth = 1; x.beginPath(); for (const px of [-14, -5, 5, 14]) { x.moveTo(px, -2); x.lineTo(0, 26); } x.stroke();
    x.fillStyle = 'rgba(255,255,255,0.85)'; x.strokeStyle = '#2b1d12'; x.lineWidth = 1.5;
    x.beginPath(); x.arc(0, 0, 18, Math.PI, 0); x.quadraticCurveTo(9, 4, 0, 0); x.quadraticCurveTo(-9, 4, -18, 0); x.fill(); x.stroke();
    x.fillStyle = '#ffd23f'; for (let i = 0; i < 7; i++) { circ(x, -15 + i * 5, -8 + Math.sin(i * 1.7) * 4, 1.3); x.fill(); }
    x.restore();
  }
}
function star(x, cx, cy, s) { x.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? s * 0.45 : s; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.closePath(); }

const PROJ_SIZE = { melon: 15, frag: 8, acorn: 22, skunk: 14, bowling: 17, vortex: 13, banana: 15, nana: 10, superbanana: 18, holy: 17, glaunch: 11, molotov: 13, gascan: 12,
  waterballoon: 14, teapot: 17, shard: 7, battery: 11, starburst: 12, star: 8, fridge: 22, rug: 13, c4: 13 };
const NO_FUSE_TEXT = new Set(['melon', 'bowling', 'vortex', 'fridge', 'starburst']);
const ANIMAL_ICON = { robot: 'robot', cow: 'cows', granny: 'granny', rhino: 'rhino', ferret: 'ferret', boar: 'boar' };
function drawEntity(x, e, t) {
  if (e instanceof Critter) return; // drawn in a separate pass
  x.save(); x.translate(e.x, e.y);
  if (e instanceof Proj) {
    const ty = e.type;
    if (ty === 'rocket') { x.rotate(Math.atan2(e.vy, e.vx)); drawIcon(x, 'rocket', 16); }
    else if (ty === 'bee') { x.scale(e.vx < 0 ? -1 : 1, 1); drawIcon(x, 'bee', 14 + Math.sin(t * 40)); }
    else if (ty === 'sticky') { drawIcon(x, 'sticky', 13); if (e.armT <= 0 && (e.trigT >= 0 ? (t * 8 | 0) % 2 : (t * 2 | 0) % 2)) { x.fillStyle = '#ff2'; circ(x, 0, -1, 2); x.fill(); } }
    else if (ty === 'boomerang') { x.rotate(t * 22); drawIcon(x, 'boomerang', 14); }
    else if (ty === 'frog') { x.scale(e.vx < 0 ? -1 : 1, 1); if (e.rest) x.scale(1.15, 0.85); else x.scale(0.92, 1.12); drawIcon(x, 'frog', 15); }
    else if (ty === 'shell') { x.rotate(Math.atan2(e.vy, e.vx) + Math.PI / 2); drawIcon(x, 'acorn', 7); }
    else if (ty === 'meteor') { x.rotate(e.spin); drawIcon(x, 'meteor', 13); }
    else if (ty === 'arrow' || ty === 'parrow') { x.rotate(e.stuck ? e.spin : Math.atan2(e.vy, e.vx)); drawIcon(x, ty, 13); }
    else if (ty === 'fireball' || ty === 'magic' || ty === 'comet') { x.rotate(Math.atan2(e.vy, e.vx)); if (ty === 'comet') x.rotate(Math.PI); drawIcon(x, ty, ty === 'comet' ? 26 : ty === 'magic' ? 11 : 15); }
    else if (ty === 'molebomb') { x.rotate(e.dig ? Math.atan2(e.dig.dy, e.dig.dx) : e.spin); drawIcon(x, 'molebomb', 14); }
    else { x.rotate(e.spin); drawIcon(x, ty === 'frag' ? 'frag' : ty, PROJ_SIZE[ty] || 12); }
    if (e.fuse && !NO_FUSE_TEXT.has(ty)) { x.rotate(-e.spin); x.fillStyle = '#fff'; x.font = 'bold 10px sans-serif'; x.textAlign = 'center'; x.fillText(Math.ceil(e.fuseT), 0, -12); }
    if (e.remote && (t * 4 | 0) % 2) { x.rotate(-e.spin); x.fillStyle = '#ff2'; circ(x, 0, -e.r - 3, 2); x.fill(); }
  } else if (e instanceof Mine) {
    x.fillStyle = e.spent ? '#666' : '#3b3b45'; x.strokeStyle = '#111'; x.lineWidth = 1;
    x.beginPath(); x.ellipse(0, 1, 6, 4, 0, 0, 7); x.fill(); x.stroke();
    const on = e.trigT >= 0 ? (t * 10 | 0) % 2 : Math.sin(e.blink * 3) > 0.6;
    x.fillStyle = e.spent ? '#333' : on ? '#ff2a2a' : '#661010'; circ(x, 0, -2.5, 2); x.fill();
    if (on && !e.spent) { x.fillStyle = 'rgba(255,40,40,0.3)'; circ(x, 0, -2.5, 6); x.fill(); }
  } else if (e instanceof Barrel) {
    x.fillStyle = '#d8572a'; x.strokeStyle = '#3b1a0b'; x.lineWidth = 1.5; rr(x, -7, -9, 14, 18, 3); x.fill(); x.stroke();
    x.fillStyle = '#f7b538'; x.fillRect(-7, -4, 14, 2.5); x.fillRect(-7, 3, 14, 2.5);
    x.fillStyle = '#2b1d12'; x.font = 'bold 8px sans-serif'; x.textAlign = 'center'; x.fillText('!', 0, 2);
  } else if (e instanceof Crate) {
    if (e.chute) {
      x.save(); x.rotate(Math.sin(e.sway) * 0.15);
      x.strokeStyle = '#555'; x.lineWidth = 1; x.beginPath(); x.moveTo(-8, -8); x.lineTo(-18, -32); x.moveTo(8, -8); x.lineTo(18, -32); x.stroke();
      x.fillStyle = e.type === 'health' ? '#fff' : '#ff7b39'; x.strokeStyle = '#2b1d12'; x.lineWidth = 1.5;
      x.beginPath(); x.arc(0, -30, 21, Math.PI, 0); x.quadraticCurveTo(10, -34, 0, -30); x.quadraticCurveTo(-10, -34, -21, -30); x.fill(); x.stroke(); x.restore();
    }
    x.strokeStyle = '#2b1d12'; x.lineWidth = 1.5;
    if (e.type === 'health') { rr(x, -9, -9, 18, 18, 2); x.fillStyle = '#fafafa'; x.fill(); x.stroke(); x.fillStyle = '#e63946'; x.fillRect(-2.5, -6, 5, 12); x.fillRect(-6, -2.5, 12, 5); }
    else { rr(x, -9, -9, 18, 18, 2); x.fillStyle = e.type === 'trap' ? '#b88452' : '#b5814f'; x.fill(); x.stroke();
      x.beginPath(); x.moveTo(-9, -9); x.lineTo(9, 9); x.moveTo(9, -9); x.lineTo(-9, 9); x.stroke(); x.fillStyle = '#ffd23f'; x.font = 'bold 11px sans-serif'; x.textAlign = 'center'; x.fillText('?', 0, 4); }
    // Crate Spy: the owning team sees what is inside
    const spyTeam = g.active ? g.active.team : null;
    if (spyTeam && spyTeam.crateSpy && (!g.online || spyTeam.idx === Net.myTeam)) {
      const lab = e.type === 'trap' ? 'TRAP!' : e.type === 'health' ? '+25 HP' : (WEAP[e.content] ? WEAP[e.content].name : '?');
      x.font = 'bold 9px sans-serif'; x.textAlign = 'center'; x.lineWidth = 3; x.strokeStyle = 'rgba(43,29,18,0.9)'; x.strokeText(lab, 0, e.chute ? 22 : -14); x.fillStyle = e.type === 'trap' ? '#ff6b6b' : '#ffe066'; x.fillText(lab, 0, e.chute ? 22 : -14);
    }
  } else if (e instanceof Grave) {
    x.fillStyle = '#9aa3ad'; x.strokeStyle = '#2b1d12'; x.lineWidth = 1.2;
    x.beginPath(); x.moveTo(-6, 7); x.lineTo(-6, -3); x.arc(0, -3, 6, Math.PI, 0); x.lineTo(6, 7); x.closePath(); x.fill(); x.stroke();
    x.fillStyle = e.col; circ(x, 4, 6, 2.2); x.fill(); x.strokeStyle = '#2b1d12'; x.beginPath(); x.moveTo(-2, -4); x.lineTo(2, -4); x.moveTo(0, -6); x.lineTo(0, 1); x.stroke();
  } else if (e instanceof Lava) {
    const k = clamp(e.stuck ? e.life / 2.8 : 1, 0.2, 1);
    x.fillStyle = `rgba(255,${120 + 80 * k | 0},40,${0.35 * k})`; circ(x, 0, 0, 7); x.fill();
    x.fillStyle = k > 0.4 ? '#ffb703' : '#d00000'; circ(x, 0, 0, 3.4); x.fill();
  } else if (e instanceof Vortex) {
    const k = Math.min(1, e.t * 3), pulse = 1 + Math.sin(t * 9) * 0.08;
    x.globalAlpha = 0.25 * k; x.fillStyle = '#3c096c'; circ(x, 0, 0, 120 * pulse); x.fill(); x.globalAlpha = 1;
    x.strokeStyle = '#c77dff'; x.lineWidth = 2;
    for (let s0 = 0; s0 < 3; s0++) { x.beginPath(); for (let a = 0; a < 10; a += 0.2) { const r = (a * 3.6 + 4) * k, th = a + t * 6 + s0 * 2.09; x.lineTo(Math.cos(th) * r, Math.sin(th) * r * 0.9); } x.stroke(); }
    x.fillStyle = '#120a20'; circ(x, 0, 0, 9 * k); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 1.5; circ(x, 0, 0, 9 * k); x.stroke();
  } else if (e instanceof Shower) {
    x.restore(); x.save();
    if (e.n < 7) { const sx = e.x, sy = Math.max(cam.y - view.h / 2 / cam.zoom + 30, 40); x.fillStyle = `rgba(255,210,63,${0.5 + 0.5 * Math.sin(t * 12)})`; x.font = 'bold 22px sans-serif'; x.textAlign = 'center'; x.fillText('★ ★ ★', sx, sy); }
  } else if (e instanceof Balloon) {
    const c = e.c; x.strokeStyle = '#2b1d12'; x.lineWidth = 1;
    if (c) { x.beginPath(); x.moveTo(0, 12); x.lineTo(c.x - e.x, c.y - e.y - 6); x.stroke(); }
    x.fillStyle = '#ff5d8f'; x.lineWidth = 1.5; x.beginPath(); x.ellipse(0, 0, 10, 12, 0, 0, 7); x.fill(); x.stroke();
    x.fillStyle = 'rgba(255,255,255,0.5)'; x.beginPath(); x.ellipse(-3, -4, 3, 4, -0.4, 0, 7); x.fill();
    x.fillStyle = '#ff5d8f'; x.beginPath(); x.moveTo(-3, 11); x.lineTo(3, 11); x.lineTo(0, 14); x.closePath(); x.fill(); x.stroke();
  } else if (e instanceof Quake) {
    // the shaking camera and crumbling ground are the show
  } else if (e instanceof GasPuff) {
    const a = clamp(e.life < 1 ? e.life : 1, 0, 1) * 0.55, r = e.r || 10;
    x.fillStyle = `rgba(120,200,40,${a})`; circ(x, 0, 0, r); x.fill();
    x.fillStyle = `rgba(190,240,90,${a * 0.6})`; circ(x, -r * 0.25, -r * 0.25, r * 0.55); x.fill();
  } else if (e instanceof Cloud) {
    const charging = e.bolts < 3 && e.nextT - e.t < 0.25;
    x.fillStyle = charging ? '#d9dde6' : '#6f7682'; x.strokeStyle = '#2b1d12'; x.lineWidth = 2;
    for (const [cx, cy, r] of [[-26, 0, 16], [-6, -10, 22], [18, -4, 18], [30, 6, 12], [0, 8, 16]]) { circ(x, cx, cy + Math.sin(t * 2 + cx) * 1.5, r); x.fill(); x.stroke(); }
    if (charging && (t * 20 | 0) % 2) { x.fillStyle = '#fff6a0'; circ(x, 0, 2, 6); x.fill(); }
  } else if (e instanceof Drill) {
    x.rotate(Math.atan2(e.dy, e.dx)); x.save(); x.scale(1, Math.sin(t * 40) > 0 ? 1 : -1); drawIcon(x, 'drill', 18); x.restore();
  } else if (e instanceof Volcano) {
    drawIcon(x, 'volcano', 22);
  } else if (e instanceof Robot) {
    const kind = e.kind || 'robot';
    x.scale(e.dir, 1); x.translate(0, -2 + Math.abs(Math.sin(e.legPh)) * -1); x.rotate(Math.sin(e.legPh) * (kind === 'robot' ? 0 : 0.08));
    drawIcon(x, ANIMAL_ICON[kind] || 'robot', kind === 'boar' ? 24 : kind === 'cow' || kind === 'rhino' ? 19 : kind === 'ferret' ? 14 : 15);
    if (kind === 'robot') { x.rotate(e.t * 8); x.strokeStyle = '#2b1d12'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(-6, -3); x.lineTo(-6, 3); x.stroke(); }
  } else if (e instanceof Flyer) {
    x.rotate(e.ang); if (Math.cos(e.ang) < 0) x.scale(1, -1); drawIcon(x, 'squirrel', 20);
  } else if (e instanceof Sentry) {
    const col = g.teams[e.ti] ? g.teams[e.ti].color : '#9aa3ad';
    x.strokeStyle = '#2b1d12'; x.lineWidth = 1.5; rr(x, -9, 2, 18, 6, 2); x.fillStyle = '#5c6670'; x.fill(); x.stroke();
    circ(x, 0, -4, 7); x.fillStyle = col; x.fill(); x.stroke();
    x.save(); x.translate(0, -6); x.rotate(e.ang); rr(x, 0, -2.5, 14, 5, 1.5); x.fillStyle = '#3a3a44'; x.fill(); x.stroke(); x.restore();
    x.fillStyle = e.shots > 0 ? ((t * 2 | 0) % 2 ? '#ff2a2a' : '#661010') : '#333'; circ(x, -2, -6, 1.8); x.fill();
  } else if (e instanceof Pump) {
    drawIcon(x, 'gaspump', 18); if (e.t < 7) { x.translate(0, -8 + Math.sin(t * 14) * 1.5); x.fillStyle = '#5c6670'; x.fillRect(-5, -2, 10, 3); }
  } else if (e instanceof Ion) {
    x.restore(); x.save();
    if (!e.fired) { const k = Math.min(1, e.t); x.setLineDash([6, 8]); x.strokeStyle = `rgba(255,255,255,${0.3 + 0.6 * k})`; x.lineWidth = 1 + k * 3; x.beginPath(); x.moveTo(e.x, -400); x.lineTo(e.x, g.waterY); x.stroke(); x.setLineDash([]); }
  } else if (e instanceof Anvil) {
    if (e.kind === 'buster') drawIcon(x, 'buster', 22); else drawIcon(x, 'anvil', 30);
  } else if (e instanceof Pelican) {
    x.scale(e.dir, 1); x.rotate(Math.sin(e.flap) * 0.05);
    x.fillStyle = '#fff'; x.strokeStyle = '#2b1d12'; x.lineWidth = 1.5;
    x.beginPath(); x.ellipse(0, 0, 20, 10, 0, 0, 7); x.fill(); x.stroke();
    x.beginPath(); x.moveTo(-6, -3); x.lineTo(-18, -3 - Math.sin(e.flap) * 22); x.lineTo(8, -3); x.fill(); x.stroke();
    circ(x, 18, -9, 7); x.fill(); x.stroke();
    x.fillStyle = '#ff9f1c'; x.beginPath(); x.moveTo(23, -11); x.lineTo(42, -5); x.quadraticCurveTo(30, 6, 22, -4); x.fill(); x.stroke();
    x.fillStyle = '#111'; circ(x, 20, -11, 1.6); x.fill();
  } else if (e instanceof Rope) {
    x.restore(); x.save();
    x.strokeStyle = '#a47148'; x.lineWidth = 2; x.beginPath(); x.moveTo(e.c.x, e.c.y); x.lineTo(e.tx, e.ty); x.stroke();
    x.fillStyle = '#666'; circ(x, e.tx, e.ty, 3); x.fill();
  }
  x.restore();
}

function drawParticles(x) {
  const ps = g.parts;
  for (let pass = 0; pass < 2; pass++) {
    x.globalCompositeOperation = pass ? 'lighter' : 'source-over';
    for (const p of ps) {
      const add = p.kind === 'fire' || p.kind === 'spark' || p.kind === 'flash' || p.kind === 'bolt' || p.kind === 'beam';
      if (add !== !!pass) continue;
      const k = p.t / p.life, a = 1 - k;
      switch (p.kind) {
        case 'smoke': x.globalAlpha = a * 0.55; x.fillStyle = p.col || '#7a7a7a'; circ(x, p.x, p.y, p.size * (1 + k * 1.6)); x.fill(); break;
        case 'fire': x.globalAlpha = a; x.fillStyle = k < 0.3 ? '#fff3b0' : k < 0.6 ? '#ffb703' : '#e85d04'; circ(x, p.x, p.y, p.size * (1 - k * 0.5)); x.fill(); break;
        case 'spark': x.globalAlpha = a; x.strokeStyle = p.col || '#ffd166'; x.lineWidth = p.size; x.beginPath(); x.moveTo(p.x, p.y); x.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); x.stroke(); break;
        case 'flash': x.globalAlpha = a; x.fillStyle = '#fffbe6'; circ(x, p.x, p.y, p.r * (0.6 + k * 0.6)); x.fill(); break;
        case 'ring': x.globalAlpha = a * 0.8; x.strokeStyle = p.flat ? '#e0f4ff' : '#fff'; x.lineWidth = 3 * a + 1; x.beginPath();
          if (p.flat) x.ellipse(p.x, p.y, lerp(p.r, p.r2, k), lerp(p.r, p.r2, k) * 0.25, 0, 0, 7); else x.arc(p.x, p.y, lerp(p.r, p.r2, k), 0, 7); x.stroke(); break;
        case 'dirt': x.globalAlpha = Math.min(1, a * 2); x.fillStyle = p.col; x.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); break;
        case 'water': x.globalAlpha = a; x.fillStyle = '#cfefff'; circ(x, p.x, p.y, p.size); x.fill(); break;
        case 'note': x.globalAlpha = a; x.fillStyle = p.col; x.font = `bold ${p.size | 0}px sans-serif`; x.fillText('♪', p.x, p.y); break;
        case 'icon': x.globalAlpha = Math.min(1, a * 2); x.save(); x.translate(p.x, p.y); x.rotate((p.rot || 0) + (p.vr || 0) * p.t); drawIcon(x, p.icon, p.size); x.restore(); break;
        case 'beam': x.globalAlpha = a; x.lineCap = 'round';
          for (const [wdt, col] of (p.col ? [[14, 'rgba(150,215,255,0.35)'], [6, p.col], [2, '#fff']] : [[14, 'rgba(255,200,80,0.35)'], [6, '#ffd23f'], [2, '#fff']])) { x.strokeStyle = col; x.lineWidth = wdt * (1 - k * 0.6); x.beginPath(); x.moveTo(p.x, p.y); x.lineTo(p.x2, p.y2); x.stroke(); } break;
        case 'bolt': x.globalAlpha = a; x.lineCap = 'round'; x.lineJoin = 'round';
          for (const [wdt, col] of [[9, 'rgba(140,190,255,0.45)'], [4, '#cfe6ff'], [1.5, '#fff']]) { x.strokeStyle = col; x.lineWidth = wdt; x.beginPath(); p.pts.forEach(([px, py], i) => i ? x.lineTo(px, py) : x.moveTo(px, py)); x.stroke(); } break;
      }
    }
  }
  x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
}

function drawAimUI(x, c) {
  if (!g.controlling || g.retreat || c.mode === 'jet' || c.mode === 'kami' || c.mode === 'chute') return;
  const d = aimVec(c), W = WEAP[g.weapon];
  if (c.mode === 'rope') return;
  if (W.kind !== 'click') {
    const cx = c.x + d.x * 52, cy = c.y + d.y * 52;
    x.strokeStyle = c.team.color; x.lineWidth = 2; circ(x, cx, cy, 6); x.stroke();
    x.beginPath(); x.moveTo(cx - 9, cy); x.lineTo(cx - 3, cy); x.moveTo(cx + 3, cy); x.lineTo(cx + 9, cy); x.moveTo(cx, cy - 9); x.lineTo(cx, cy - 3); x.moveTo(cx, cy + 3); x.lineTo(cx, cy + 9); x.stroke();
    // held item
    x.save(); x.translate(c.x + d.x * 12, c.y + d.y * 12 + 2); x.rotate(Math.atan2(d.y, d.x)); if (c.facing < 0) x.scale(1, -1); drawIcon(x, g.weapon, 13); x.restore();
  }
  if ((g.weapon === 'rifle' || g.laser) && W.kind !== 'click' && myTurn() && !g.ai) { // laser sight (the rifle has one built in)
    let lx = c.x + d.x * 14, ly = c.y + d.y * 14, n = 0;
    while (n++ < 220 && !Terrain.solid(lx, ly) && lx > 0 && lx < CFG.W && ly < g.waterY) { lx += d.x * 6; ly += d.y * 6; }
    x.save(); x.setLineDash([4, 6]); x.strokeStyle = 'rgba(255,60,60,0.55)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(c.x + d.x * 14, c.y + d.y * 14); x.lineTo(lx, ly); x.stroke(); x.restore();
    x.fillStyle = 'rgba(255,60,60,0.8)'; circ(x, lx, ly, 2.5); x.fill();
  }
  if (g.charging) { // power wedge along the aim line
    const n = 14;
    for (let i = 0; i < n; i++) {
      if (i / n > g.power) break;
      const k = i / n, rr_ = 3 + k * 6, px = c.x + d.x * (16 + k * 60), py = c.y + d.y * (16 + k * 60);
      x.fillStyle = `hsl(${55 - k * 55},100%,55%)`; circ(x, px, py, rr_); x.fill();
    }
  }
}
function drawTargets(x) {
  const c = g.active; if (!c || g.state !== 'turn') return;
  if (g.target && (g.weapon === 'bee' || g.fired)) {
    const s = 10 + Math.sin(g.time * 6) * 2; x.strokeStyle = c.team.color; x.lineWidth = 3;
    x.beginPath(); x.moveTo(g.target.x - s, g.target.y - s); x.lineTo(g.target.x + s, g.target.y + s); x.moveTo(g.target.x + s, g.target.y - s); x.lineTo(g.target.x - s, g.target.y + s); x.stroke();
    circ(x, g.target.x, g.target.y, s + 6); x.stroke();
  }
  if (!g.controlling || g.retreat || g.ai || UI.blocking() || !myTurn()) return;
  const m = screenToWorld(Input.mx, Input.my), id = g.weapon;
  if (id === 'swap' || id === 'abduct' || id === 'balloon' || id === 'selectcritter') {
    let best = null, bd = 40;
    for (const o of g.critters) if (o.alive && (id === 'balloon' || id === 'abduct' || o !== c) && (id !== 'selectcritter' || o.team === c.team)) { const dd = Math.hypot(o.x - m.x, o.y - m.y); if (dd < bd) { bd = dd; best = o; } }
    if (best) { x.strokeStyle = id === 'abduct' ? '#8ef' : '#ffd23f'; x.lineWidth = 2; x.setLineDash([4, 4]); circ(x, best.x, best.y, best.r + 6); x.stroke(); if (id === 'swap') { x.beginPath(); x.moveTo(c.x, c.y); x.lineTo(best.x, best.y); x.stroke(); } x.setLineDash([]); }
  } else if (id === 'shower') {
    x.setLineDash([8, 8]); x.strokeStyle = 'rgba(255,210,63,0.6)'; x.lineWidth = 2; x.strokeRect(m.x - 230, m.y - 400, 460, 800); x.setLineDash([]);
  } else if (WEAP[id].air) {
    x.setLineDash([8, 8]); x.strokeStyle = 'rgba(255,255,255,0.7)'; x.lineWidth = 2; x.beginPath(); x.moveTo(m.x, m.y - 400); x.lineTo(m.x, m.y + 400); x.stroke(); x.setLineDash([]);
  } else if (id === 'teleport') {
    x.globalAlpha = 0.5; x.strokeStyle = validTeleport(m.x, m.y) ? '#c77dff' : '#f00'; x.lineWidth = 2; circ(x, m.x, m.y, CFG.CR); x.stroke(); x.globalAlpha = 1;
  } else if (id === 'girder') {
    x.save(); x.translate(m.x, m.y); x.rotate(g.girderAng); x.globalAlpha = 0.55;
    x.fillStyle = girderOk(c, m.x, m.y) ? '#ec8a2c' : '#f33'; x.fillRect(-40, -4, 80, 8); x.restore(); x.globalAlpha = 1;
    x.strokeStyle = 'rgba(255,255,255,0.25)'; x.lineWidth = 1; circ(x, c.x, c.y, CFG.GIRDER_RANGE); x.stroke();
  }
}

function render() {
  const { w, h, dpr } = view;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawBackground();
  const sh = g.shake, ox = rand(-sh, sh), oy = rand(-sh, sh);
  const z = cam.zoom, vx0 = cam.x - w / 2 / z, vy0 = cam.y - h / 2 / z, vx1 = cam.x + w / 2 / z, vy1 = cam.y + h / 2 / z;
  ctx.save();
  ctx.translate(w / 2 + ox, h / 2 + oy); ctx.scale(z, z); ctx.translate(-cam.x, -cam.y);
  drawWater(false, vx0, vx1, vy1);
  // terrain: blit only the visible part of the bitmap
  const sx = clamp(Math.floor(vx0), 0, CFG.W), sy = clamp(Math.floor(vy0), 0, CFG.H), ex = clamp(Math.ceil(vx1), 0, CFG.W), ey = clamp(Math.ceil(vy1), 0, CFG.H);
  if (ex > sx && ey > sy) ctx.drawImage(Terrain.cvs, sx, sy, ex - sx, ey - sy, sx, sy, ex - sx, ey - sy);
  drawDecor(ctx, vx0, vx1);
  for (const e of g.ents) drawEntity(ctx, e, g.time);
  for (const c of g.critters) if (c.alive) drawCritter(ctx, c, g.time);
  if (g.state === 'turn' && g.active && g.active.alive) drawAimUI(ctx, g.active);
  for (const tr of g.tracers) { ctx.globalAlpha = 1 - tr.t / 0.25; ctx.strokeStyle = '#fff6a0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tr.x1, tr.y1); ctx.lineTo(tr.x2, tr.y2); ctx.stroke(); }
  ctx.globalAlpha = 1;
  drawParticles(ctx);
  drawTargets(ctx);
  drawWater(true, vx0, vx1, vy1);
  ctx.restore();
  if (g.state !== 'menu') drawHUD();
}

