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
  const P0 = PROJ[w], dx = Math.cos(aim) * facing, dy = Math.sin(aim), sp = power * CFG.MAX_POWER * (w === 'launcher' ? 1.3 : 1);
  const b = { x: c.x + dx * (c.r + 5), y: c.y + dy * (c.r + 5), vx: dx * sp, vy: dy * sp,
    r: P0.r, bounce: P0.bounce, friction: P0.friction, windF: P0.windF, grav: 1, hit: null };
  if (circleHits(b.x, b.y, b.r)) return null;
  const maxT = P0.fuse ? Math.round(Math.min(5, P0.fuseT ?? 3) * 60) : 420;  // the weapon's fuse, or up to 7 s of flight
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
    if (has('zap') && d < 680 && lineClear(c.x, c.y, e.x, e.y)) { let extra = 0; for (const o of g.critters) if (o.alive && o !== e && o !== c && Math.hypot(o.x - e.x, o.y - e.y) < 120) extra += o.team !== team ? 14 : -14; consider({ w: 'zap', facing, angle, tx: e.x, score: Math.min(24, e.hp - e.pending) + extra + 2 }); }
    if (has('freeze') && d < 630 && e.frozen <= 0 && lineClear(c.x, c.y, e.x, e.y)) consider({ w: 'freeze', facing, angle, tx: e.x, score: 10 + Math.min(30, e.hp - e.pending) * 0.3 });
    if (has('balloon') && e.frozen <= 0) consider({ w: 'balloon', tx: e.x, ty: e.y, facing: c.facing, angle: c.aim, score: 16 + Math.abs(g.wind) * 18 + (willFall(e.x + Math.sign(g.wind || 1) * 300, e.y) ? 30 : 0) });
    if (has('rifle') && d < 1100 && lineClear(c.x, c.y, e.x, e.y)) consider({ w: 'rifle', facing, angle, tx: e.x, score: Math.min(38, e.hp - e.pending) + (willFall(e.x + facing * 30, e.y) ? 15 : 0) + (e.hp - e.pending <= 38 ? 25 : 0) - d * 0.005 });
    // ---- the big arsenal ----
    const hp = e.hp - e.pending, los = d < 700 && lineClear(c.x, c.y, e.x, e.y), fallF = k => willFall(e.x + facing * k, e.y);
    if (has('handgun') && d < 520 && los) consider({ w: 'handgun', facing, angle, tx: e.x, score: Math.min(35, hp) - d * 0.02 });
    if (has('uzi') && d < 420 && los) consider({ w: 'uzi', facing, angle, tx: e.x, score: Math.min(40, hp) + (fallF(60) ? 25 : 0) - d * 0.03 });
    if (has('minigun') && d < 420 && los) consider({ w: 'minigun', facing, angle, tx: e.x, score: Math.min(60, hp) * 0.8 + (fallF(70) ? 30 : 0) - d * 0.03 });
    if (has('railgun') && d < 900) consider({ w: 'railgun', facing, angle, tx: e.x, score: Math.min(45, hp) + 4 + (hp <= 45 ? 20 : 0) });
    if (has('magic')) consider({ w: 'magic', facing, angle, tx: e.x, score: scoreBlast(c, e.x, e.y, 40, 50) * 0.9 + 6 });
    if (has('virus') && los && e.poison <= 0) { let n = 0; for (const o of g.critters) if (o.alive && o !== e && Math.hypot(o.x - e.x, o.y - e.y) < 70) n += o.team !== team ? 1 : -1; consider({ w: 'virus', facing, angle, tx: e.x, score: 14 + n * 6 }); }
    if (has('dragon') && d < 120 && los) consider({ w: 'dragon', facing, angle, tx: e.x, score: 24 + (fallF(120) ? 60 : 0) });
    if (has('waterpistol') && d < 85) consider({ w: 'waterpistol', facing, angle, tx: e.x, score: fallF(80) ? 55 : 2 });
    if (has('dubstep') && d < 125) consider({ w: 'dubstep', facing, angle, tx: e.x, score: 12 + (fallF(90) ? 55 : 0) });
    if (has('axe') && d < 36) consider({ w: 'axe', facing, angle, tx: e.x, score: Math.ceil(hp / 2) + 4 });
    if (has('punch') && d < 36) consider({ w: 'punch', facing, angle, tx: e.x, score: 38 });
    if (has('prod') && d < 32 && fallF(30)) consider({ w: 'prod', facing, angle, tx: e.x, score: 70 });
    if (has('chainsaw') && d < 44) consider({ w: 'chainsaw', facing, angle, tx: e.x, score: 25 + (fallF(60) ? 40 : 0) });
    if (has('kamikaze') && d < 220 && c.hp - c.pending < 30 && Math.abs(dy) < 60) consider({ w: 'kamikaze', facing, angle, tx: e.x, score: scoreBlast(c, e.x, e.y, 60, 60) + 20 - (c.hp - c.pending) });
    if (has('suicide') && d < 55 && c.hp - c.pending < 25) consider({ w: 'suicide', facing, angle, tx: e.x, score: scoreBlast(c, c.x, c.y, 60, 50) + 10 });
    for (const [w, R, D, bonus] of [['napalm', 60, 40, 4], ['poisonstrike', 70, 30, 2], ['frogstrike', 70, 40, 4], ['homingstrike', 50, 45, 8], ['molestrike', 60, 50, 2], ['carpet', 70, 36, 2], ['minestrike', 60, 35, 0]])
      if (has(w)) consider({ w, tx: e.x, ty: e.y, facing: c.facing, angle: c.aim, score: scoreBlast(c, e.x, e.y, R, D) * 0.8 + bonus });
    if (has('waterstrike')) consider({ w: 'waterstrike', tx: e.x, ty: e.y, facing: c.facing, angle: c.aim, score: willFall(e.x + 60, e.y) || willFall(e.x - 60, e.y) ? 45 : 3 });
    if (has('comet')) consider({ w: 'comet', tx: e.x, ty: e.y, facing: c.facing, angle: c.aim, score: scoreBlast(c, e.x, e.y + 10, 80, 70) + 8 });
    if (has('ion')) { let s = Math.min(45, hp) + 10; for (const o of g.critters) if (o.alive && o !== e && Math.abs(o.x - e.x) < 20) s += o.team !== team ? 30 : -45; consider({ w: 'ion', tx: e.x, ty: e.y, facing: c.facing, angle: c.aim, score: s }); }
    if (has('buster')) consider({ w: 'buster', tx: e.x, ty: e.y, facing: c.facing, angle: c.aim, score: scoreBlast(c, e.x, e.y + 30, 55, 55) + 4 });
    if (has('abduct')) consider({ w: 'abduct', tx: e.x, ty: e.y, facing: c.facing, angle: c.aim, score: 12 + (hp > 60 ? 10 : 0) });
    if (c.mode === 'ground' && Math.abs(dy) < 50 && d < 320 && d > 30)
      for (const [w, sc] of [['cows', 40], ['granny', 45], ['ferrets', 34], ['rhino', 30], ['boar', 38]]) if (has(w)) consider({ w, facing, angle: c.aim, tx: e.x, score: sc - d * 0.05 });
    if (has('sentry') && c.mode === 'ground' && d < 300 && d > 60 && los) consider({ w: 'sentry', facing, angle: c.aim, tx: c.x, score: 16 });
    if (has('gaspump') && c.mode === 'ground' && d < 90 && d > 30) consider({ w: 'gaspump', facing, angle: c.aim, tx: c.x, score: 22 });
    if (has('megamine') && c.mode === 'ground' && d < 120 && d > 50) consider({ w: 'megamine', facing, angle: c.aim, tx: c.x, score: 14 });
  }
  if (has('nuke')) { let s = -8; for (const o of g.critters) if (o.alive) { const en = o.team !== team; s += en ? 5 : -5; if (o.y > g.waterY - 60) s += en ? 60 : -80; } consider({ w: 'nuke', facing: c.facing, angle: c.aim, tx: c.x, score: s }); }
  // map-wide weapons: judged on the whole board rather than one enemy
  if (has('quake') && c.mode === 'ground') { let s = 6; for (const o of g.critters) if (o.alive && o !== c) { const edge = willFall(o.x + 30, o.y) || willFall(o.x - 30, o.y); s += o.team !== team ? 3 + (edge ? 22 : 0) : -(3 + (edge ? 30 : 0)); } consider({ w: 'quake', facing: c.facing, angle: c.aim, tx: c.x, score: s }); }
  if (has('flood')) { let s = -4; for (const o of g.critters) if (o.alive && o.y > g.waterY - 75) s += o.team !== team ? 70 : -90; consider({ w: 'flood', facing: c.facing, angle: c.aim, tx: c.x, score: s }); }
  if (has('karma')) { const alive = g.critters.filter(o => o.alive), avg = alive.reduce((a, o) => a + o.hp - o.pending, 0) / alive.length, mine = alive.filter(o => o.team === team), myAvg = mine.reduce((a, o) => a + o.hp - o.pending, 0) / mine.length; if (myAvg < avg - 12) consider({ w: 'karma', facing: c.facing, angle: c.aim, tx: c.x, score: (avg - myAvg) * mine.length * 0.7 }); }
  yield;
  // Brute-force trajectory search: sweep aim angle × launch power for each ballistic weapon,
  // simulate, and score the detonation point. Spread across frames via `yield`.
  const ballistic = ['rocket', 'bomb', 'melon', 'skunk', 'acorn', 'mortar', 'vortex', 'frog', 'banana', 'holy', 'launcher', 'molotov', 'gascan', 'battery', 'starburst', 'fridge', 'molebomb'].filter(has);
  const RD = { rocket: [50, 50], bomb: [48, 48], melon: [58, 50], skunk: [60, 32], acorn: [95, 90], mortar: [40, 50], vortex: [120, 26], frog: [75, 40],
    banana: [80, 40], holy: [100, 100], launcher: [46, 44], molotov: [40, 30], gascan: [55, 24], battery: [40, 30], starburst: [60, 30], fridge: [40, 40], molebomb: [50, 50] };
  const TWEAK = { melon: -8, bomb: -1, skunk: -6, acorn: 4, mortar: -3, vortex: -10, frog: -4, holy: 6, banana: -4, gascan: -6, molotov: -2, battery: -6, fridge: -4, molebomb: -3 };
  let n = 0;
  for (const w of ballistic) for (const facing of [-1, 1]) for (let a = -1.45; a <= 0.75; a += 0.08) for (let p = 0.2; p <= 1.001; p += 0.05) {
    const imp = simulateShot(c, w, facing, a, p);
    if (imp) {
      const [R, D] = RD[w];
      let s = scoreBlast(c, imp.x, imp.y, R, D) + (TWEAK[w] || 0);
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

