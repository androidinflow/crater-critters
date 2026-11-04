// ============================== AI ==============================
// Score a hypothetical blast at (x,y): reward enemy damage, kills, and knock-outs into the
// water; penalise friendly fire (self worst); tiny bonus for near misses as a tie-breaker.
function scoreBlast(c, x, y, R, D) {
  let s = 0;
  for (const o of g.critters) {
    if (!o.alive) continue;
    const d = Math.hypot(o.x - x, o.y - y), enemy = o.team !== c.team;
    if (d >= R + o.r) { if (enemy) s += Math.max(0, 3 - d / 80); continue; }
    const f = 1 - Math.max(0, d - o.r) / R, dm = D * f, hp = o.hp - o.pending;
    const kdir = Math.sign(o.x - x) || 1, fall = willFall(o.x + kdir * (30 + 90 * f), o.y);
    if (enemy) { s += Math.min(dm, hp); if (dm >= hp) s += 30; if (fall) s += 45; }
    else s -= (o === c ? 2.5 : 1.5) * Math.min(dm, hp) + (fall ? 60 : 0) + (dm >= hp ? 40 : 0);
  }
  return s;
}
// Forward-simulate a shot with the *same* integrator the game uses (gravity, wind, bounces),
// against the current terrain. Returns the detonation point or null.
function simulateShot(c, w, facing, aim, power) {
  const P0 = PROJ[w], dx = Math.cos(aim) * facing, dy = Math.sin(aim);
  const b = { x: c.x + dx * (c.r + 5), y: c.y + dy * (c.r + 5), vx: dx * power * CFG.MAX_POWER, vy: dy * power * CFG.MAX_POWER,
    r: P0.r, bounce: P0.bounce, friction: P0.friction, windF: P0.windF, grav: 1, hit: null };
  if (circleHits(b.x, b.y, b.r)) return null;
  const maxT = P0.fuse ? 180 : 420;  // 3 s fuse, or up to 7 s of flight
  for (let t = 0; t < maxT; t++) {
    moveBody(b, CFG.DT);
    if (b.x < -60 || b.x > CFG.W + 60 || b.y > g.waterY) return null;
    if (P0.impact) {
      if (b.hit) return b;
      if (t > 3) for (const o of g.critters) if (o.alive && (o !== c || t > 18) && (o.x - b.x) ** 2 + (o.y - b.y) ** 2 < (o.r + b.r) ** 2) return b;
    }
  }
  return P0.impact ? null : b;
}
function* aiPlan(c) {
  const team = c.team, enemies = g.critters.filter(o => o.alive && o.team !== team);
  if (!enemies.length) return null;
  let best = null;
  const consider = p => { if (p && (!best || p.score > best.score)) best = p; };
  const has = id => weaponUsable(team, id);
  for (const e of enemies) {
    const dx = e.x - c.x, dy = e.y - c.y, d = Math.hypot(dx, dy), facing = Math.sign(dx) || 1, angle = Math.atan2(dy, Math.abs(dx));
    if (has('kazoo') && d < 70) consider({ w: 'kazoo', facing, angle, score: 8 + (willFall(e.x + facing * 90, e.y) ? 70 : 0), tx: e.x });
    if (has('scatter') && d < 520 && lineClear(c.x, c.y, e.x, e.y)) consider({ w: 'scatter', facing, angle, tx: e.x, score: Math.min(40, e.hp - e.pending) + (willFall(e.x + facing * 40, e.y) ? 20 : 0) - d * 0.02 });
    if (has('bee')) consider({ w: 'bee', facing, angle: -0.95, power: 0.55, tx: e.x, ty: e.y, score: scoreBlast(c, e.x, e.y, 42, 45) * 0.85 });
    if (has('anvil')) consider({ w: 'anvil', tx: e.x, ty: e.y, facing: c.facing, angle: c.aim, score: scoreBlast(c, e.x, e.y + 20, 72, 65) + 10 });
    if (has('pelican')) consider({ w: 'pelican', tx: e.x, ty: e.y, facing: c.facing, angle: c.aim, score: scoreBlast(c, e.x, e.y, 60, 40) * 0.8 });
    if (has('thunder')) consider({ w: 'thunder', tx: e.x, ty: e.y, facing: c.facing, angle: c.aim, score: scoreBlast(c, e.x, e.y, 45, 34) * 1.5 + 4 });
    if (has('slap') && d < 36) consider({ w: 'slap', facing, angle, score: 28 + (willFall(e.x + facing * 110, e.y) ? 80 : 0), tx: e.x });
    if (has('sunbeam') && d < 330) consider({ w: 'sunbeam', facing, angle, tx: e.x, score: Math.min(26, e.hp - e.pending) + 6 + (willFall(e.x + facing * 25, e.y) ? 12 : 0) });
    if (has('chili') && d < 120) consider({ w: 'chili', facing, angle, tx: e.x, score: 24 - d * 0.05 });
    if (has('stomp') && d < 140 && c.mode === 'ground') consider({ w: 'stomp', facing, angle: c.aim, tx: e.x, score: 10 + (1 - d / 150) * 14 + (willFall(e.x + facing * 60, e.y) ? 40 : 0) });
    if (has('shower')) consider({ w: 'shower', tx: e.x, ty: e.y, facing: c.facing, angle: c.aim, score: scoreBlast(c, e.x, e.y, 130, 30) * 0.9 + 6 });
    if (has('rifle') && d < 1100 && lineClear(c.x, c.y, e.x, e.y)) consider({ w: 'rifle', facing, angle, tx: e.x, score: Math.min(38, e.hp - e.pending) + (willFall(e.x + facing * 30, e.y) ? 15 : 0) + (e.hp - e.pending <= 38 ? 25 : 0) - d * 0.005 });
  }
  yield;
  // Brute-force trajectory search: sweep aim angle × launch power for each ballistic weapon,
  // simulate, and score the detonation point. Spread across frames via `yield`.
  const ballistic = ['rocket', 'bomb', 'melon', 'skunk', 'acorn', 'mortar', 'vortex'].filter(has);
  const RD = { rocket: [50, 50], bomb: [48, 48], melon: [58, 50], skunk: [60, 32], acorn: [95, 90], mortar: [40, 50], vortex: [120, 26] };
  let n = 0;
  for (const w of ballistic) for (const facing of [-1, 1]) for (let a = -1.45; a <= 0.75; a += 0.08) for (let p = 0.2; p <= 1.001; p += 0.05) {
    const imp = simulateShot(c, w, facing, a, p);
    if (imp) {
      const [R, D] = RD[w];
      let s = scoreBlast(c, imp.x, imp.y, R, D);
      if (w === 'melon') s -= 8;
      if (w === 'bomb') s -= 1;
      if (w === 'skunk') s -= 6;
      if (w === 'acorn') s += 4;
      if (w === 'mortar') s -= 3;
      if (w === 'vortex') s -= 10;
      consider({ w, facing, angle: a, power: p, score: s, tx: imp.x, ty: imp.y, fuse: 3 });
    }
    if (++n % 24 === 0) yield;
  }
  // a little human sloppiness
  if (best && best.power) { best.angle += rand(-0.03, 0.03); best.power = clamp(best.power * (1 + rand(-0.025, 0.025)), 0.1, 1); }
  return best;
}
function pickWalkDir(c) {
  let near = null, nd = 1e9;
  for (const o of g.critters) if (o.alive && o.team !== c.team) { const d = Math.abs(o.x - c.x); if (d < nd) { nd = d; near = o; } }
  let dir = near ? (Math.sign(near.x - c.x) || 1) : pick([-1, 1]);
  if (Math.random() < 0.3) dir = -dir;
  if (willFall(c.x + dir * 24, c.y)) dir = -dir;
  return dir;
}
function blankInput() { return { left: false, right: false, up: false, down: false, jumpPress: false, flip: false, firePress: false, fireHeld: false, targetPower: null, isAI: false }; }
class AIBrain {
  constructor(c) { Object.assign(this, { c, st: 'think', t: 0, gen: null, plan: null, moves: 0, walkDir: 1, walkT: 0 }); }
  update(dt) {
    const c = this.c, inp = blankInput(); inp.isAI = true; this.t += dt;
    if (!g.controlling) return inp;
    switch (this.st) {
      case 'think': {
        if (this.t < 0.6 || c.mode !== 'ground') break;
        if (!this.gen) this.gen = aiPlan(c);
        const t0 = performance.now(); let r;
        do { r = this.gen.next(); } while (!r.done && performance.now() - t0 < 5);
        if (!r.done) break;
        this.gen = null; const p = r.value;
        const wantMove = this.moves < 2 && (!p || p.score < 18 || (this.moves === 0 && Math.random() < 0.25));
        if (wantMove) { this.st = 'walk'; this.t = 0; this.walkT = rand(0.5, 1.8); this.walkDir = pickWalkDir(c); this.moves++; }
        else if (!p || p.score <= 0) { g.weapon = 'skip'; fireInstant(c, 'skip'); this.st = 'done'; }
        else { this.plan = p; this.st = 'select'; this.t = 0; }
        break;
      }
      case 'walk':
        if (this.t > this.walkT || (c.mode === 'ground' && willFall(c.x + this.walkDir * 16, c.y))) { this.st = 'think'; this.t = 0.2; break; }
        if (this.walkDir < 0) inp.left = true; else inp.right = true;
        if (c.blocked && c.mode === 'ground' && Math.random() < 0.15) inp.jumpPress = true;
        break;
      case 'select': {
        const p = this.plan; g.weapon = p.w; c.team.lastWeapon = p.w;
        if (p.w === 'bomb') g.fuse = p.fuse || 3;
        if (p.w === 'bee') g.target = { x: p.tx, y: p.ty };
        if (this.t > 0.5) { this.st = 'aim'; this.t = 0; }
        break;
      }
      case 'aim': {
        const p = this.plan;
        if (WEAP[p.w].kind === 'click') { if (this.t > 0.4) { this.st = 'fire'; this.t = 0; } break; }
        c.facing = p.facing;
        const da = p.angle - c.aim;
        if (Math.abs(da) < 0.03) { c.aim = p.angle; if (this.t > 0.25) { this.st = 'fire'; this.t = 0; } }
        else { if (da > 0) inp.down = true; else inp.up = true; this.t = 0; }
        break;
      }
      case 'fire': {
        const p = this.plan, W = WEAP[p.w];
        if (g.fired) { this.st = 'retreat'; this.t = 0; break; }
        if (W.kind === 'click') { doClickAction(c, p.w, p.tx, p.ty); if (!g.fired) { g.weapon = 'skip'; fireInstant(c, 'skip'); } }
        else if (W.kind === 'charge') { inp.fireHeld = true; inp.targetPower = p.power; if (!g.charging) inp.firePress = true; }
        else if (this.t > 0.2) { inp.firePress = true; this.t = 0; }
        break;
      }
      case 'retreat': {
        const tx = this.plan ? this.plan.tx : c.x;
        const away = Math.sign(c.x - tx) || -c.facing;
        if (this.t < 2.4 && c.mode === 'ground' && !willFall(c.x + away * 16, c.y)) {
          if (away < 0) inp.left = true; else inp.right = true;
          if (c.blocked && Math.random() < 0.1) inp.jumpPress = true;
        }
        break;
      }
    }
    return inp;
  }
}

