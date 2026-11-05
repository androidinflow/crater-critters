// ============================== ARSENAL ENTITIES ==============================
// Entities added with the big arsenal update: gun volleys, the steerable Super Squirrel, animal herds,
// the sentry turret, the stink pump, the orbital beam and the kamikaze flight.

// Poison: lose 5 HP at the start of each of your team's turns for `turns` turns (the virus also spreads)
function poisonCritter(c, turns, quiet = false) {
  if (!c.alive || c.frozen > 0 && !quiet) return;
  const was = c.poison; c.poison = Math.max(c.poison, turns);
  if (!quiet && c.poison > was) { addText(c.x, c.y - 30, 'poisoned!', '#8ac926', 16); c.face = 4; c.faceT = 1; Sfx.hiss(); }
}
// Put out fire and gas around a point (water weapons)
function douse(x, y, R) {
  let n = 0;
  for (const e of g.ents) if (!e.dead && (e instanceof Lava || e instanceof GasPuff) && Math.hypot(e.x - x, e.y - y) < R) { e.dead = true; n++; }
  for (const e of g.ents) if (!e.dead && e instanceof Barrel && e.fuseT >= 0 && Math.hypot(e.x - x, e.y - y) < R) { e.fuseT = -1; e.hp = 15; }
  for (const c of g.critters) if (c.alive && Math.hypot(c.x - x, c.y - y) < R && c.face === 3) { c.face = 0; c.faceT = 0; }
  if (n) for (let i = 0; i < Math.min(12, n); i++) P({ kind: 'smoke', x: x + rand(-R, R) * 0.6, y: y + rand(-R, R) * 0.4, vx: rand(-20, 20), vy: -50, g: 0, drag: 0.95, size: 4, life: 0.8, col: '#ddd' });
  return n;
}
function makeCrate(x, y) {
  const sc = g.scheme || SCHEMES.Classic, r = Math.random(), type = r < sc.trap ? 'trap' : r < 0.42 ? 'health' : 'weapon';
  return new Crate(x, y, type, pick(sc.pool));
}

// Guns: n rounds along the critter's *current* aim, one every `rate` seconds, with a little spread
class Volley {
  constructor(c, n, dmg, spread, rate, kick) { Object.assign(this, { c, x: c.x, y: c.y, n, dmg, spread, rate, kick, t: 0, fired: 0, dead: false, hint: 'Space: stop firing' }); }
  busy() { return true; }
  update(dt) {
    this.t += dt; const c = this.c; if (!c.alive) { this.dead = true; return; }
    this.x = c.x; this.y = c.y;
    while (this.fired < this.n && this.t >= this.fired * this.rate) { this.fired++; fireRound(c, this.dmg, this.kick, this.spread); }
    if (this.fired >= this.n && this.t > this.n * this.rate + 0.15) this.dead = true;
  }
  boom() { this.dead = true; }
}

// Super Squirrel: a flying bomb you steer with ←→; fire detonates it, so does anything it touches
class Flyer {
  constructor(c, ang) { Object.assign(this, { owner: c, x: c.x + Math.cos(ang) * 16, y: c.y + Math.sin(ang) * 16 - 4, ang, turn: 0, t: 0, r: 6, vx: 0, vy: 0, dead: false, important: true, hint: '←→ steer · Space: BOOM' }); Sfx.whoosh(); }
  busy() { return true; }
  update(dt) {
    this.t += dt; this.ang += this.turn * 3.4 * dt;
    const sp = 250; this.vx = Math.cos(this.ang) * sp; this.vy = Math.sin(this.ang) * sp;
    for (let i = 0; i < 3; i++) { this.x += this.vx * dt / 3; this.y += this.vy * dt / 3; if (circleHits(this.x, this.y, this.r)) return this.boom(); }
    for (const c of g.critters) if (c.alive && (c !== this.owner || this.t > 0.6) && Math.hypot(c.x - this.x, c.y - this.y) < c.r + this.r) return this.boom();
    for (const e of g.ents) if (e !== this && !e.dead && e.onBlast && !(e instanceof Critter) && e.r && Math.hypot(e.x - this.x, e.y - this.y) < e.r + this.r) return this.boom();
    if (Math.random() < 0.8) P({ kind: 'smoke', x: this.x - this.vx * 0.03, y: this.y - this.vy * 0.03, vx: rand(-10, 10), vy: rand(-10, 10), g: -10, drag: 0.96, size: rand(2, 4), life: 0.6 });
    if (Sfx.ok('flyer', 160)) Sfx.tone(rand(500, 700), 0.12, 'square', 0.04, 900);
    if (this.t > 12 || this.y > g.waterY || this.x < -100 || this.x > CFG.W + 100 || this.y < -700) return this.boom();
  }
  boom() { this.dead = true; if (this.y < g.waterY && this.x > -50 && this.x < CFG.W + 50 && this.y > -300) explode(this.x, this.y, 65, 70); else splashFx(clamp(this.x, 0, CFG.W), g.waterY, 1); }
}

// A herd: releases n animals of one kind, half a second apart
class Herd {
  constructor(c, kind, n) { Object.assign(this, { c, x: c.x, y: c.y, kind, n, i: 0, t: 0, dead: false }); }
  busy() { return true; }
  update(dt) {
    this.t += dt;
    if (this.t >= this.i * 0.5) {
      const r = spawn(new Robot(this.c.x + this.c.facing * 14, this.c.y - 2, this.c.facing, this.kind)); r.owner = this.c; if (!this.i) g.focus = r; this.i++;
      Sfx.tone(this.kind === 'cow' ? 180 : 700, 0.2, this.kind === 'cow' ? 'sawtooth' : 'square', 0.08, this.kind === 'cow' ? 120 : 1100);
    }
    if (this.i >= this.n) this.dead = true;
  }
}

// Sentry Turret: watches its surroundings; an enemy who moves into range on their turn takes a shot (which ends their move)
class Sentry extends Body {
  constructor(x, y, team) { super(x, y, 8); Object.assign(this, { ti: team.idx, hp: 30, shots: 10, cd: 1, ang: -Math.PI / 2, bounce: 0.1, friction: 0.6 }); }
  busy() { return !this.rest; }
  update(dt) {
    this.physics(dt); this.checkBounds();
    const a = g.active, ok = g.state === 'turn' && a && a.alive && a.team.idx !== this.ti && a.frozen <= 0 && this.shots > 0;
    const tgt = ok && Math.hypot(a.x - this.x, a.y - this.y) < 340 && lineClear(this.x, this.y - 6, a.x, a.y) ? a : null;
    if (tgt) { const want = Math.atan2(tgt.y - (this.y - 6), tgt.x - this.x); let da = want - this.ang; da = Math.atan2(Math.sin(da), Math.cos(da)); this.ang += da * Math.min(1, 6 * dt); }
    this.cd -= dt;
    if (this.cd > 0 || !tgt) return;
    this.cd = 0.8; this.shots--;
    const d = { x: Math.cos(this.ang), y: Math.sin(this.ang) }; let x = this.x + d.x * 10, y = this.y - 6 + d.y * 10; const x0 = x, y0 = y;
    Sfx.pew(); P({ kind: 'flash', x: x0, y: y0, r: 6, life: 0.06 });
    for (let i = 0; i < 200; i++) {
      x += d.x * 2; y += d.y * 2;
      if ((tgt.x - x) ** 2 + (tgt.y - y) ** 2 < (tgt.r + 2) ** 2) { hurt(tgt, 8); tgt.vx += d.x * 120; tgt.vy += d.y * 120 - 90; tgt.knocked(); break; }
      if (Terrain.solid(x, y)) { Terrain.carve(x, y, 3, false); break; }
    }
    addTracer(x0, y0, x, y);
    if (this.shots <= 0) addText(this.x, this.y - 16, 'empty!', '#ccc', 12, 1);
  }
  onBlast(f, nx, ny, dmg) { this.push(f, nx, ny, 200); this.hp -= (dmg || 10) * f; if (this.hp <= 0) { this.dead = true; explode(this.x, this.y, 30, 20); } }
}

// Stink Pump: sits there pumping out poison gas for seven seconds
class Pump extends Body {
  constructor(x, y) { super(x, y, 7); Object.assign(this, { t: 0, acc: 0, bounce: 0.1, friction: 0.6 }); }
  busy() { return !this.rest || this.t < 7; }
  update(dt) {
    this.physics(dt); this.checkBounds(); this.t += dt;
    if (this.t < 7) { this.acc += dt; if (this.acc > 0.22) { this.acc = 0; spawn(new GasPuff(this.x, this.y - 8, rand(-40, 40), rand(-70, -30))); if (Math.random() < 0.3) Sfx.hiss(); } }
    else if (this.t > 30) this.dead = true;
  }
  onBlast(f, nx, ny) { this.push(f, nx, ny); }
}

// Orbital Sunbeam: one second of charging, then a column of light down to the water
class Ion {
  constructor(x) { Object.assign(this, { x, y: 0, t: 0, fired: false, dead: false, important: true }); Sfx.rumble(); }
  busy() { return true; }
  update(dt) { this.t += dt; if (!this.fired && this.t > 1) { this.fired = true; this.fire(); } if (this.t > 2.4) this.dead = true; }
  fire() {
    const x = this.x; Sfx.laser(); Sfx.thunder(); shake(14);
    P({ kind: 'beam', x, y: -400, x2: x, y2: g.waterY, life: 0.9, col: '#fff' });
    for (let y = Terrain.cavern ? 12 : 0; y < g.waterY; y += 10) if (Terrain.solid(x, y) || Terrain.solid(x - 8, y) || Terrain.solid(x + 8, y)) Terrain.carve(x, y, 11, true);
    for (const c of g.critters) if (c.alive && Math.abs(c.x - x) < c.r + 10) { hurt(c, 45); c.vx += (Math.sign(c.x - x) || pick([-1, 1])) * 200; c.vy -= 200; c.knocked(); c.face = 3; c.faceT = 1; }
    for (const e of g.ents) if (e.onBlast && !(e instanceof Critter) && !e.dead && e.r && Math.abs(e.x - x) < e.r + 10) e.onBlast(1, Math.sign(e.x - x) || 1, -0.5, 40);
    for (let k = 0; k < 30; k++) { const y = rand(0, g.waterY); P({ kind: 'fire', x: x + rand(-8, 8), y, vx: rand(-60, 60), vy: rand(-80, 20), g: -30, drag: 0.93, size: rand(3, 7), life: 0.5 }); }
  }
}

// Kamikaze: the critter itself flies along its aim through everything, then explodes. Farewell.
class Kami {
  constructor(c, dx, dy) {
    Object.assign(this, { c, x: c.x, y: c.y, dx, dy, trav: 0, acc: 0, dead: false, important: true, hitSet: new Set() });
    c.release(); c.mode = 'kami'; c.vx = c.vy = 0; c.fallDmg = false; c.tumble = false; c.spin = 0; c.balloon = null;
  }
  busy() { return true; }
  update(dt) {
    const c = this.c; if (!c.alive) { this.dead = true; return; }
    const step = 260 * dt; c.x += this.dx * step; c.y += this.dy * step; c.vx = c.vy = 0; c.mode = 'kami'; c.spin += dt * 28 * (this.dx >= 0 ? 1 : -1); c.facing = this.dx >= 0 ? 1 : -1;
    this.x = c.x; this.y = c.y; this.trav += step; this.acc += step;
    if (this.acc >= 5) { this.acc = 0; Terrain.carve(c.x + this.dx * 6, c.y + this.dy * 6, 15, false); }
    if (Math.random() < 0.7) P({ kind: 'dirt', x: c.x, y: c.y, vx: rand(-120, 120) - this.dx * 80, vy: rand(-160, -20), g: 650, drag: 1, size: rand(1.5, 3.5), col: pick(Terrain.theme.dirt), life: 0.8 });
    Sfx.drill();
    for (const o of g.critters) if (o.alive && o !== c && !this.hitSet.has(o) && Math.hypot(o.x - c.x, o.y - c.y) < o.r + 14) { this.hitSet.add(o); hurt(o, 30); o.vx += this.dx * 260; o.vy += this.dy * 200 - 150; o.knocked(); }
    if (this.trav > 240 || c.x < 10 || c.x > CFG.W - 10 || c.y > g.waterY - 10 || c.y < -300) {
      this.dead = true; c.mode = 'air'; explode(c.x, c.y, 60, 60, { ignore: c }); hurt(c, 999); c.vx = c.vy = 0;
    }
  }
}
