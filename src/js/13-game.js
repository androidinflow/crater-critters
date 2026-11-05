// ============================== GAME STATE MACHINE ==============================
// menu → placement → turn → resolving → (turn | gameover)
let g = null;
function makeState() {
  return { state: 'menu', time: 0, ents: [], critters: [], teams: [], parts: [], texts: [], tracers: [], wind: 0, waterY: CFG.WATER0, waterTarget: CFG.WATER0,
    shake: 0, banner: null, active: null, teamIdx: -1, turnT: 0, fired: false, retreat: false, charging: false, power: 0, weapon: 'bomb', fuse: 3, target: null,
    robot: null, shotsLeft: 0, shotCD: 0, lockWeapon: false, girderAng: 0, focus: null, ai: null, controlling: false, phase: '', phaseT: 0, quietT: 0, resolveT: 0,
    sd: false, slowmo: 0, timeScale: 1, minesLive: false, overT: -1, winner: null, turnStartT: 0, settings, nextId: 0, online: false, netFocus: null,
    gravMul: 1, walkMul: 1, dmgMul: 1, laser: false };
}
function startBackdrop() {
  g = makeState(); const seed = Math.random() * 1e9 | 0;
  Terrain.generate(resolveMap(settings.map), seed, resolveTheme(settings.theme)); bg = makeBackground(seed, Terrain.cavern);
  cam.x = CFG.W / 2; cam.y = 600; cam.tz = cam.zoom = Math.max(0.45, Math.min(view.w / CFG.W * 1.6, 0.9));
}
function surfaceSpots() {
  const spots = [];
  for (let x = 50; x < CFG.W - 50; x += 7) {
    let air = !Terrain.solid(x, 0);
    for (let y = 1; y < g.waterY - 40; y++) {
      const s = Terrain.solid(x, y);
      if (s && air) { const cy = y - CFG.CR - 1; if (cy > 30 && !circleHits(x, cy, CFG.CR) && !circleHits(x, cy - 26, CFG.CR)) spots.push({ x, y: cy }); }
      air = !s;
    }
  }
  return spots;
}
function takeSpot(spots, used, minD) {
  for (let i = 0; i < 300; i++) { const s = pick(spots); if (used.every(u => Math.hypot(u.x - s.x, u.y - s.y) > minD)) { used.push(s); return s; } }
  const s = pick(spots); used.push(s); return s;
}
// cfg (online only): { teams: [{ name, color, ai }] } overrides the menu's team list
function newGame(cfg) {
  g = makeState(); g.online = !!cfg; Net.log = []; Net.events = []; g.perTeam = settings.perTeam || 4;
  const s = settings, sc = SCHEMES[s.scheme] || SCHEMES.Classic, seed = Math.random() * 1e9 | 0;
  g.scheme = sc; g.schemeName = s.scheme; g.seed = seed; g.mapStyle = resolveMap(s.map); g.theme = resolveTheme(s.theme);
  Terrain.generate(g.mapStyle, seed, g.theme); bg = makeBackground(seed, Terrain.cavern);
  const names = NAMES.slice().sort(() => Math.random() - 0.5);
  g.teams = (cfg ? cfg.teams : settings.teams.slice(0, s.numTeams)).map((t, i) => ({ name: t.name || `Team ${i + 1}`, color: TEAM_COLORS[t.color], ai: t.ai, critters: [], ammo: { ...sc.ammo }, cIdx: -1, idx: i, fuse: 3, lastWeapon: 'bomb', dmg: 0, kills: 0, used: {} }));
  const spots = surfaceSpots(), used = [];
  for (const t of g.teams) for (let k = 0; k < g.perTeam; k++) {
    const c = new Critter(t, names.pop() || 'Critter'), sp = takeSpot(spots, used, 70);
    c.x = sp.x; c.y = sp.y - 18; c.fallDmg = false; c.id = ++g.nextId; t.critters.push(c); g.critters.push(c); g.ents.push(c);
  }
  for (let i = 0; i < sc.mines; i++) { const sp = takeSpot(spots, used, 45); spawn(new Mine(sp.x, sp.y + CFG.CR - 6, Math.random() < 0.2)); }
  for (let i = 0; i < sc.barrels; i++) { const sp = takeSpot(spots, used, 45); spawn(new Barrel(sp.x, sp.y)); }
  g.teamIdx = (Math.random() * g.teams.length | 0) - 1;
  g.state = 'placement'; g.phaseT = 0;
  cam.x = CFG.W / 2; cam.y = 600; cam.tz = 0.9;
  banner('Critters, assemble!', '#ffd23f');
}
function resolveMap(m) { if (m === 'Custom') return !g.online && MapImage.ready() ? 'Custom' : pick(MAP_STYLES); return MAP_STYLES.includes(m) ? m : pick(MAP_STYLES); }
function resolveTheme(t) { return THEMES[t] ? t : pick(THEME_NAMES); }
function teamsAlive() { return g.teams.filter(t => t.critters.some(c => c.alive)); }

function thaw(o) {
  o.frozen = 0; addText(o.x, o.y - 30, 'thawed!', '#9ad7ff', 16); Sfx.clack(); o.speak(pick(['Phew.', 'F-feeling again.']));
  for (let i = 0; i < 12; i++) P({ kind: 'spark', x: o.x + rand(-10, 10), y: o.y + rand(-12, 8), vx: rand(-120, 120), vy: rand(-160, -20), g: 400, drag: 0.96, size: 2.5, life: 0.6, col: '#cfe6ff' });
}
function hurt(c, amt) {
  if (!c.alive || amt <= 0) return;
  if (g.dmgMul && g.dmgMul !== 1) amt = Math.round(amt * g.dmgMul);   // Double Damage
  if (c.frozen > 0) amt = Math.ceil(amt / 2);
  c.pending += amt; c.hurtT = 0.9;
  if (amt >= 25 || c.hp - c.pending <= 0) { c.face = 2; c.faceT = 1.7; } else if (c.faceT <= 0 || c.face === 1) { c.face = 1; c.faceT = 0.9; }   // 2 = dizzy, 1 = ouch
  const at = g.active && g.active.team; if (at && at !== c.team) at.dmg += amt;   // credit the team whose turn it is
  if (Math.random() < 0.6 || amt > 25) c.speak(pick(QUIPS.hit)); else Sfx.blip(c.voice * 1.3, 2);
  if (c === g.active && g.state === 'turn' && g.controlling) endControl();
}
function killCritter(c, how) {
  if (!c.alive) return;
  c.alive = false; c.dead = true; c.hp = 0; c.pending = 0;
  if (c.rope) c.rope.dead = true;
  { const at = g.active && g.active.team; if (at && at !== c.team) at.kills++; }
  if (how === 'water') { splashFx(c.x, g.waterY, 1.3); Sfx.splash(); addText(c.x, g.waterY - 20, Terrain.theme.lava ? pick(['SIZZLE!', 'Toasty!', 'FSSSHH!']) : pick(['SPLOOSH!', 'Glub glub!', 'Sploosh!']), Terrain.theme.lava ? '#ffb703' : '#bde0fe', 22); }
  else if (how === 'off') addText(clamp(c.x, 40, CFG.W - 40), c.y, 'Wheeeee!', '#fff', 20);
  else { spawn(new Grave(c.x, c.y, c.team.color)); explode(c.x, c.y, 26, 12); }
  if (c === g.active && g.state === 'turn') endControl();
  if (!c.team.critters.some(o => o.alive)) banner(`${c.team.name} is out!`, c.team.color);
  if (g.state !== 'menu' && teamsAlive().length <= 1 && g.slowmo <= 0 && !g.slowmoDone) { // dramatic final kill
    g.slowmo = 1.8; g.slowmoDone = true; g.focus = { x: c.x, y: Math.min(c.y, g.waterY), dead: false, until: g.time + 1.2 };
  }
}

function startTurn() {
  const alive = teamsAlive();
  if (alive.length <= 1) return gameOver();
  let ti = g.teamIdx;
  for (let k = 0; k < g.teams.length; k++) { ti = (ti + 1) % g.teams.length; if (g.teams[ti].critters.some(c => c.alive)) break; }
  g.teamIdx = ti; const team = g.teams[ti];
  // ice lasts two of this team's turns; frozen critters are skipped in the rotation
  for (const o of team.critters) if (o.alive && o.frozen > 0) { o.frozen--; if (o.frozen > 0) addText(o.x, o.y - 30, 'still frozen', '#9ad7ff', 14); else thaw(o); }
  // poison: 5 HP at the start of each of the team's turns (never fatal); a virus also jumps to anyone standing close
  for (const o of team.critters) if (o.alive && o.poison > 0) {
    o.poison--; const d = Math.min(5, Math.max(0, o.hp - 1));
    if (d > 0) { o.hp -= d; addText(o.x, o.y - 34, `-${d} poison`, '#8ac926', 16); o.face = 4; o.faceT = 1.2; Sfx.blip(o.voice * 0.7, 2); }
    if (o.virus) { if (o.poison > 0) { for (const p of g.critters) if (p.alive && p !== o && p.poison <= 0 && Math.hypot(p.x - o.x, p.y - o.y) < 70) { poisonCritter(p, 3); p.virus = true; addText(p.x, p.y - 44, 'caught the virus!', '#8ac926', 14); } } else o.virus = false; }
  }
  let ci = team.cIdx, c = null;
  for (let k = 0; k < team.critters.length; k++) {
    ci = (ci + 1) % team.critters.length; const o = team.critters[ci];
    if (o.alive && o.frozen <= 0) { c = o; break; }
  }
  team.cIdx = ci;
  if (!c) { banner(`${team.name} is frozen solid – turn lost!`, team.color); return startTurn(); }   // every critter on ice: skip the team
  if (!g.sd && g.settings.sdMinutes > 0 && g.time > g.settings.sdMinutes * 60) {
    g.sd = true; for (const o of g.critters) if (o.alive) { o.hp = 1; o.pending = 0; }
    banner('SUDDEN DEATH! Everyone is at 1 HP!', '#ff4d6d'); shake(10); Sfx.sad();
  }
  Object.assign(g, { active: c, state: 'turn', controlling: true, turnT: g.settings.turnTime, fired: false, retreat: false, charging: false, power: 0, target: null,
    robot: null, shotsLeft: 0, shotCD: 0, lockWeapon: false, focus: null, turnStartT: g.time, gravMul: 1, walkMul: 1, dmgMul: 1, laser: false });
  g.wind = rand(-1, 1) * (Math.random() < 0.2 ? 0.2 : 1);
  g.weapon = weaponUsable(team, team.lastWeapon) ? team.lastWeapon : (WEAPONS.find(w => !w.util && weaponUsable(team, w.id)) || WEAP.skip).id;
  g.fuse = team.fuse;
  g.ai = team.ai ? new AIBrain(c) : null;
  if (g.online && Net.role === 'host' && team.idx !== Net.myTeam) {
    const peer = Net.peerOf(team.idx), R = Net.remotes[team.idx] || {};
    Net.seen = { fp: R.fp | 0, jp: R.jp | 0, bp: R.bp | 0 };
    if (!peer || peer.lost) { g.ai = new AIBrain(c); g.ai.standIn = true; banner(`${team.name} is away – the AI plays for them`, team.color); }
  }
  cam.manualT = 0;
  if (g.online) { Net.mute++; turnBanner(); Net.mute--; } else
  banner(`${team.name} — ${c.name}`, team.color);
  c.speak(pick(QUIPS.turn));
}
function endControl() {
  if (g.state !== 'turn') return;
  const c = g.active;
  g.controlling = false; g.charging = false;
  if (c && c.alive) { if (c.mode === 'rope' || c.mode === 'jet') c.release(); c.walking = false; c.jumpT = 0; c.jetX = 0; }
  if (g.robot && g.robot.remote && !g.robot.dead) g.robot.boom();   // an unfired Fizz Brick / Mega Banana goes off when the turn ends
  Object.assign(g, { state: 'resolving', phase: 'settle', phaseT: 0, quietT: 0, resolveT: 0, waterDone: false, crateDone: false, forced: false, ai: null });
  if (UI.pickerOpen) UI.togglePicker();
}
function worldBusy() { for (const e of g.ents) if (!e.dead && e.busy && e.busy()) return true; return false; }
function forceSettle() { for (const e of g.ents) { if (e instanceof Lava || e instanceof Rope) e.dead = true; if (e.rest === false && !(e instanceof Critter)) { e.vx = e.vy = 0; e.rest = true; } if (e instanceof Critter && e.alive) e.land(0); } }
function spawnCrates() {
  const sc = g.scheme; let n = 0;
  if (Math.random() > sc.crateChance) return 0;
  for (let i = 0; i < sc.crates; i++) {
    const x = rand(150, CFG.W - 150);
    let y = 0;
    if (Terrain.cavern) { while (y < g.waterY && Terrain.solid(x, y)) y += 2; y += 14; if (y > g.waterY - 60) continue; }
    let s = y; while (s < g.waterY && !Terrain.solid(x, s)) s += 4;
    y = Math.max(Terrain.cavern ? y : -20, s - 380); // start at most ~4 s of parachuting above the ground
    const r = Math.random(), type = r < sc.trap ? 'trap' : r < 0.42 ? 'health' : 'weapon';
    spawn(new Crate(x, y, type, pick(sc.pool))); n++;
  }
  if (n) banner(n > 1 ? 'Crates incoming!' : 'Crate incoming!', '#ffd23f');
  return n;
}
function applyPending() {
  let any = false;
  for (const c of g.critters) if (c.alive && c.pending >= 0.5) {
    const d = Math.round(c.pending); c.pending = 0; c.hp -= d; any = true;
    addText(c.x, c.y - 34, `-${d}`, c.team.color, 22, 1.4);
  } else if (c.alive) c.pending = 0;
  return any;
}
function updateResolving(dt) {
  g.resolveT += dt; g.phaseT += dt;
  switch (g.phase) {
    case 'settle':
      if (!worldBusy() || g.resolveT > 25) { if ((g.quietT += dt) > 0.35) { g.phase = 'damage'; g.phaseT = 0; g.dmgWait = applyPending() ? 1.3 : 0; } }
      else g.quietT = 0;
      if (g.resolveT > 20 && !g.forced) { g.forced = true; forceSettle(); }
      break;
    case 'damage':
      if (g.phaseT >= g.dmgWait) { g.phase = 'deaths'; g.phaseT = 0; g.killed = 0; }
      break;
    case 'deaths': {
      const dying = g.critters.find(c => c.alive && c.hp <= 0);
      if (dying) {
        if (dying.dyingT <= 0) { dying.dyingT = 0.9; dying.say = null; dying.speak(pick(QUIPS.death)); g.focus = dying; }
        dying.dyingT -= dt;
        if (dying.dyingT <= 0) { dying.dyingT = 0; killCritter(dying, 'hp'); g.killed++; }
      } else if (g.killed) { g.phase = 'settle'; g.phaseT = 0; g.quietT = 0; }   // deaths can cause more mayhem
      else { g.phase = 'post'; g.phaseT = 0; }
      break;
    }
    case 'post':
      if (teamsAlive().length <= 1) { gameOver(); break; }
      if (g.sd && !g.waterDone) { g.waterDone = true; g.waterTarget -= 22; g.phase = 'water'; banner('The water is rising!', '#8ecae6'); break; }
      if (Math.abs(g.waterY - g.waterTarget) > 0.5) { g.phase = 'water'; break; }   // a Flood is still rising
      if (!g.crateDone) { g.crateDone = true; if (spawnCrates()) { g.phase = 'settle'; g.quietT = 0; break; } }
      startTurn();
      break;
    case 'water':
      if (Math.abs(g.waterY - g.waterTarget) < 0.5) { g.waterY = g.waterTarget; g.phase = 'settle'; g.quietT = 0; }
      break;
  }
}
function gameOver() {
  if (g.state === 'gameover') return;
  g.state = 'gameover'; g.controlling = false; g.winner = teamsAlive()[0] || null; g.overT = 2.2;
  Sfx.fanfare();
  if (g.winner) banner(`${g.winner.name} wins!`, g.winner.color);
}

function updateTurn(dt) {
  const c = g.active;
  if (!c || !c.alive || teamsAlive().length <= 1) { endControl(); return; }
  let inp;
  if (g.ai && g.ai.standIn && !g.fired) { const peer = Net.peerOf(c.team.idx); if (peer && !peer.lost) { g.ai = null; banner(`${c.team.name} is back – your turn!`, c.team.color); } }
  if (g.ai) inp = g.ai.update(dt);
  else if (g.online && c.team.idx !== Net.myTeam) inp = Net.remoteInput(c.team.idx);
  else {
    inp = UI.blocking() ? blankInput() : humanInput();
    if (!UI.blocking()) for (let k = 1; k <= 5; k++) if (Input.pressed.has('Digit' + k) || Input.pressed.has('Numpad' + k)) { g.fuse = k; c.team.fuse = k; banner(`Fuse: ${k} second${k > 1 ? 's' : ''}`); Sfx.tick(); }
  }
  if (g.controlling) controlActive(c, inp, dt);
  if (g.state !== 'turn') return;
  if (g.robot && g.robot.dead) { g.robot = null; afterFire(); }
  if (g.shotCD > 0) g.shotCD -= dt;
  const prev = g.turnT; g.turnT -= dt;
  if (g.turnT < 5 && (prev | 0) !== (g.turnT | 0) && g.turnT > 0) Sfx.tick();
  if (g.turnT <= 0) {
    if (!g.fired && !g.robot) { c.sadT = 3.5; c.speak(pick(QUIPS.lose)); Sfx.sad(); }
    endControl();
  }
}
function controlActive(c, inp, dt) {
  const aimDir = (inp.down ? 1 : 0) - (inp.up ? 1 : 0), mv = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
  // Jump (Enter) goes off at once, in the direction being held. A second tap within 0.3 s of take-off,
  // or Backspace, turns it into a backflip. (The old quarter-second wait made a jump go the way the
  // critter *was* facing when Enter was pressed, which is where the "wrong way" jumps came from.)
  if (inp.jumpPress || inp.flip) {
    if (c.mode === 'rope' || c.mode === 'jet' || c.mode === 'chute') { const chute = c.mode === 'chute'; c.release(); if (!chute) c.vy -= 120; }
    else if (c.mode === 'ground' && !g.charging) { if (mv) c.facing = mv; c.doJump(!!inp.flip); c.jumpT = inp.flip ? 0 : 0.3; }
    else if (c.mode === 'air' && c.jumped && !c.tumble && (inp.flip || c.jumpT > 0)) { c.backflip(); c.jumpT = 0; }
  }
  if (c.jumpT > 0) c.jumpT -= dt;
  c.walking = false;
  if (g.robot && g.robot.turn !== undefined) { g.robot.turn = mv; handleFire(c, inp, dt); return; }   // ←→ steer the Super Squirrel instead of walking
  if (c.mode === 'rope') { c.swing = mv; c.ropeDL = aimDir; }
  else if (c.mode === 'jet') { c.thrust = inp.up; c.jetX = mv; }
  else if (c.mode === 'chute') c.jetX = mv;
  else {
    if (g.weapon === 'girder' && !g.retreat) g.girderAng = clamp(g.girderAng + aimDir * 1.4 * dt, -1.4, 1.4);
    else c.aim = clamp(c.aim + aimDir * 1.5 * dt, -1.52, 1.52);
    if (c.mode === 'ground' && !g.charging && mv) { c.facing = mv; c.walk(mv, dt); }
    else if (mv && c.mode === 'air' && !c.tumble) {
      c.facing = mv;
      // a little air control on your own jumps (not when you have been blown somewhere): bend the arc toward the held direction
      if (c.jumped) c.vx += (mv * CFG.JUMP[0] - c.vx) * Math.min(1, CFG.AIR_STEER * dt);
    }
  }
  handleFire(c, inp, dt);
}

function camTarget() {
  if (g.focus && g.focus.until && g.time > g.focus.until) g.focus.dead = true;
  if (g.focus && !g.focus.dead) return g.focus;
  g.focus = null;
  for (let i = g.ents.length - 1; i >= 0; i--) { const e = g.ents[i]; if (e.important && !e.dead) return (g.focus = e); }
  if (g.state === 'turn' && g.active && g.active.alive) return g.active;
  let best = null, bs = 40;
  for (const c of g.critters) if (c.alive && c.mode === 'air') { const s = Math.hypot(c.vx, c.vy); if (s > bs) { bs = s; best = c; } }
  return best;
}
function updateCamera(dt) {
  if (g.state === 'menu') { cam.x = CFG.W / 2 + Math.sin(g.time * 0.08) * CFG.W * 0.3; cam.y = 640; }
  else {
    cam.manualT -= dt;
    const t = Net.role === 'guest' ? g.netFocus : camTarget();
    if (t && cam.manualT <= 0 && !Input.drag) { const k = Math.min(1, dt * 3.5); cam.x += (t.x - cam.x) * k; cam.y += (t.y - 40 - cam.y) * k; }
  }
  cam.zoom += (cam.tz - cam.zoom) * Math.min(1, dt * 8);
  cam.x = clamp(cam.x, -100, CFG.W + 100); cam.y = clamp(cam.y, -300, CFG.H + 50);
  g.shake = Math.max(0, g.shake - dt * 30);
}

function tick(dt) {
  g.time += dt;
  if (g.state !== 'menu') {
    if (g.state === 'turn') updateTurn(dt);
    for (let i = 0; i < g.ents.length; i++) { const e = g.ents[i]; if (!e.dead) e.update(dt); }
    if (g.ents.some(e => e.dead)) g.ents = g.ents.filter(e => !e.dead);
    g.waterY += clamp(g.waterTarget - g.waterY, -20 * dt, 20 * dt);
    if (g.state === 'placement') {
      g.phaseT += dt;
      if (g.phaseT > 1.5 && !worldBusy()) { g.minesLive = true; g.time = 0; startTurn(); }
    } else if (g.state === 'resolving') updateResolving(dt);
    else if (g.state === 'gameover') {
      for (const c of g.critters) if (c.alive && c.team === g.winner && c.mode === 'ground' && Math.random() < dt * 0.8) { c.doJump(Math.random() < 0.3); if (Math.random() < 0.3) c.speak(pick(['Woohoo!', 'We did it!', 'Spiky power!'])); }
      if (Math.random() < dt * 6) { const x = cam.x + rand(-400, 400), y = cam.y - 300; for (let i = 0; i < 6; i++) P({ kind: 'spark', x, y, vx: rand(-200, 200), vy: rand(-100, 200), g: 200, drag: 0.98, size: 3, life: 1.5, col: pick(TEAM_COLORS) }); }
      if (g.overT > 0 && (g.overT -= dt) <= 0) UI.showOver();
    }
  }
  updateFx(dt);
  Input.pressed.clear(); Input.released.clear();
}
// Purely cosmetic per-frame updates (particles, floating text, tracers, banner): run by host and guest alike
function updateFx(dt) {
  const ps = g.parts;
  for (let i = ps.length - 1; i >= 0; i--) {
    const p = ps[i]; p.t += dt;
    if (p.t >= p.life) { ps[i] = ps[ps.length - 1]; ps.pop(); continue; }
    if (p.vx !== undefined) {
      p.vy += (p.g || 0) * dt; if (p.drag) { p.vx *= p.drag; p.vy *= p.drag; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.kind === 'dirt' && Terrain.solid(p.x, p.y)) { p.y -= p.vy * dt; p.vy *= -0.3; p.vx *= 0.5; }
    }
  }
  for (const t of g.texts) t.t += dt; g.texts = g.texts.filter(t => t.t < t.life);
  for (const t of g.tracers) t.t += dt; g.tracers = g.tracers.filter(t => t.t < 0.25);
  if (g.banner && (g.banner.t += dt) > 2.6) g.banner = null;
  // props whose ground was blown away tumble into the water
  const D = Terrain.decor;
  for (let i = D.length - 1; i >= 0; i--) {
    const d = D[i];
    if (!d.fall) { if (!Terrain.solid(d.x, d.y + 2) && !Terrain.solid(d.x, d.y + 5)) { d.fall = true; d.vr = rand(-4, 4); } }
    else { d.vy += CFG.G * dt; d.y += d.vy * dt; d.rot += d.vr * dt; if (d.y > g.waterY + 40) D.splice(i, 1); }
  }
}

let last = performance.now(), acc = 0;
function frame(now) {
  let real = Math.min(0.1, (now - last) / 1000); last = now;
  if (g.slowmo > 0) { g.slowmo -= real; g.timeScale = 0.25; } else g.timeScale = 1;
  if (Net.role === 'guest') { guestTick(real); updateCamera(real); }
  else if (g.online || (!UI.paused && !UI.helpOpen)) {   // an online match never pauses: your friend is still playing
    acc += real * g.timeScale; let n = 0;
    while (acc >= CFG.DT && n < 5) { tick(CFG.DT); acc -= CFG.DT; n++; }
    if (n === 5) acc = 0;
    updateCamera(real);
  }
  Net.update(real);
  render();
  const inMenu = !$('menu').classList.contains('hidden') || !$('lobby').classList.contains('hidden');
  if (Chat.available() === $('chat').classList.contains('hidden')) Chat.sync();
  if (inMenu !== UI.inMenu) { UI.inMenu = inMenu; $('touch').style.visibility = inMenu ? 'hidden' : ''; }
  if (!$('menu').classList.contains('hidden')) drawMascots(now / 1000);
  requestAnimationFrame(frame);
}


