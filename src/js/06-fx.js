// ============================== FX ==============================
function P(o) { if (g.parts.length < 2200) { o.t = 0; g.parts.push(o); } }
function shake(a) { g.shake = Math.max(g.shake, a); }
function addText(x, y, text, col = '#fff', size = 20, life = 1.6) { g.texts.push({ x, y, text, col, size, t: 0, life }); }
function banner(text, col = '#fff') { g.banner = { text, col, t: 0 }; }
// Online: each browser announces the turn from its own point of view (not networked)
function turnBanner() { const c = g.active; if (c) banner(c.team.idx === Net.myTeam ? `Your turn, ${c.name}!` : `${c.team.name}'s turn…`, c.team.color); }
function addTracer(x1, y1, x2, y2) { g.tracers.push({ x1, y1, x2, y2, t: 0 }); }
// Run an entity's per-frame cosmetic emitter without networking it (the guest runs trails itself)
function localFx(e) { Net.mute++; try { e.trail(); } finally { Net.mute--; } }

function fxExplosion(x, y, R) {
  P({ kind: 'flash', x, y, r: R * 1.4, life: 0.12 });
  P({ kind: 'ring', x, y, r: R * 0.4, r2: R * 1.6, life: 0.32 });
  const nf = 10 + R / 3 | 0;
  for (let i = 0; i < nf; i++) { const a = rand(0, 6.28), s = rand(40, 260);
    P({ kind: 'fire', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, g: -80, drag: 0.92, size: rand(R / 6, R / 3), life: rand(0.25, 0.55) }); }
  for (let i = 0; i < 6 + R / 8; i++) { const a = rand(0, 6.28), s = rand(10, 80);
    P({ kind: 'smoke', x: x + Math.cos(a) * R * 0.4, y: y + Math.sin(a) * R * 0.4, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30, g: -25, drag: 0.97, size: rand(R / 5, R / 2.5), life: rand(1, 1.9) }); }
  for (let i = 0; i < 8 + R / 4; i++) { const a = rand(3.4, 6.0), s = rand(150, 420);
    P({ kind: 'dirt', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 650, drag: 0.995, size: rand(1.5, 4), col: pick(Terrain.theme.dirt), life: rand(0.8, 1.6) }); }
  for (let i = 0; i < 10; i++) { const a = rand(0, 6.28), s = rand(250, 600);
    P({ kind: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 300, drag: 0.94, size: 2, life: rand(0.2, 0.45) }); }
}
function splashFx(x, y, big = 1) {
  for (let i = 0; i < 22 * big; i++) P({ kind: 'water', x: x + rand(-8, 8), y, vx: rand(-110, 110) * big, vy: rand(-380, -120) * big, g: 700, size: rand(2, 4.5), life: rand(0.6, 1.2) });
  P({ kind: 'ring', x, y, r: 6, r2: 50 * big, life: 0.5, flat: true });
}
function dustFx(x, y, n = 6) {
  for (let i = 0; i < n; i++) P({ kind: 'smoke', x: x + rand(-6, 6), y, vx: rand(-60, 60), vy: rand(-30, -5), g: 0, drag: 0.9, size: rand(3, 6), life: rand(0.35, 0.7), col: '#d9c3a0' });
}

// Radial blast: carve crater, damage + knockback with linear distance falloff, poke objects.
function explode(x, y, R, dmg, o = {}) {
  if (!o.noCarve) Terrain.carve(x, y, R * (o.carveMul ?? 1));
  fxExplosion(x, y, R);
  shake(Math.min(24, R * 0.3));
  Sfx.boom(R);
  const knock = o.knock ?? 1;
  const list = g.ents.slice();
  for (const e of list) {
    if (e.dead || e === o.ignore) continue;
    const dx = e.x - x, dy = e.y - y, d = Math.hypot(dx, dy), er = e.r || 0;
    if (d >= R + er) continue;
    const f = clamp(1 - Math.max(0, d - er) / R, 0, 1);  // 1 at ground zero → 0 at the blast edge
    const nx = d > 0.01 ? dx / d : 0, ny = d > 0.01 ? dy / d : -1;
    if (e instanceof Critter) {
      if (dmg > 0) hurt(e, Math.max(1, Math.round(dmg * f)));
      const kv = knock * (110 + dmg * 7) * f;
      e.vx += nx * kv; e.vy += ny * kv - 150 * f * knock;
      e.knocked();
    } else if (e.onBlast) e.onBlast(f, nx, ny, dmg);
  }
}

