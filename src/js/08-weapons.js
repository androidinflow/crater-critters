// ============================== WEAPONS ==============================
function aimVec(c) { return { x: Math.cos(c.aim) * c.facing, y: Math.sin(c.aim) }; }
function hasAmmo(team, id) { const a = team.ammo[id] ?? 0; return a === -1 || a > 0; }
function useAmmo(id) { const t = g.active && g.active.team; if (!t) return; (t.used ||= {})[id] = (t.used[id] || 0) + 1; if (t.ammo[id] > 0) t.ammo[id]--; }
function weaponUsable(team, id) { return hasAmmo(team, id) && !(WEAP[id].air && Terrain.cavern); }
function spawn(e) { e.id = ++g.nextId; g.ents.push(e); return e; }

function afterFire() { g.fired = true; g.retreat = true; g.charging = false; g.turnT = Math.min(g.turnT, CFG.RETREAT); }

function handleFire(c, inp, dt) {
  if (g.robot && !g.robot.dead) { if (inp.firePress) g.robot.boom(); return; }
  if (g.retreat) return;
  if (c.mode === 'rope') { if (inp.firePress) c.release(); return; }
  if (c.mode === 'jet') { if (inp.firePress) c.release(); return; }
  if (g.ents.some(e => e instanceof Rope && e.state === 'shoot')) return;
  if (g.shotCD > 0) return;
  const W = WEAP[g.weapon], team = c.team;
  if (!weaponUsable(team, W.id)) { if (inp.firePress) banner(W.air && Terrain.cavern ? 'No air-drops in a cavern!' : 'Out of ammo!'); return; }
  switch (W.kind) {
    case 'charge':
      if (inp.firePress && !g.charging) {
        if (W.id === 'bee' && !g.target) { banner('Click the map to pick a target for the bee!'); return; }
        if (c.mode !== 'ground' && c.mode !== 'air') return;
        g.charging = true; g.power = 0;
      }
      if (g.charging) {
        if (inp.fireHeld) g.power = Math.min(1, g.power + dt / CFG.CHARGE_TIME);
        const aiDone = inp.targetPower != null && g.power >= inp.targetPower;
        if (!inp.fireHeld || g.power >= 1 || aiDone) { if (aiDone) g.power = inp.targetPower; fireCharged(c); }
      }
      break;
    case 'instant': case 'place': case 'tool':
      if (inp.firePress) fireInstant(c, W.id);
      break;
    case 'click':
      if (inp.firePress) banner(`Click on the map to use the ${W.name}`);
      break;
  }
}

function fireCharged(c) {
  const d = aimVec(c), sp = Math.max(0.06, g.power) * CFG.MAX_POWER, id = g.weapon;
  const sx = c.x + d.x * (c.r + 5), sy = c.y + d.y * (c.r + 5);
  if (id === 'mortar') { spawn(new Burst(c, d.x * sp, d.y * sp)); useAmmo(id); afterFire(); return; }
  if (id === 'cannon') {   // fire yourself: a tool, so the turn carries on after landing
    c.release(); c.mode = 'air'; c.vx = d.x * sp * 0.95; c.vy = d.y * sp * 0.95 - 40; c.fallDmg = false; c.tumble = false; c.flipV = -c.facing * 9; c.y -= 2; c.squash = -0.3;
    g.charging = false; useAmmo(id); Sfx.boom(30); shake(8); P({ kind: 'flash', x: sx, y: sy, r: 18, life: 0.12 });
    for (let i = 0; i < 10; i++) P({ kind: 'smoke', x: sx, y: sy, vx: d.x * rand(40, 160) + rand(-40, 40), vy: d.y * rand(40, 160) + rand(-40, 40), g: -20, drag: 0.93, size: rand(4, 8), life: 0.7 });
    c.speak(pick(['Wheee!', 'Fire in the hole!', 'Catapult me!'])); return;
  }
  if (id === 'spitter') {
    for (let i = -1; i <= 1; i++) { const a = Math.atan2(d.y, d.x) + i * 0.14, k = 1 + i * 0.06; const p = spawn(new Proj('seed', sx, sy, Math.cos(a) * sp * k, Math.sin(a) * sp * k, { owner: c })); if (!i) g.focus = p; }
    useAmmo(id); afterFire(); Sfx.shot(); c.speak('Ptoo ptoo ptoo!'); return;
  }
  const p = spawn(new Proj(id, sx, sy, d.x * sp, d.y * sp, { owner: c, fuse: id === 'bomb' ? g.fuse : undefined, target: g.target }));
  g.focus = p; useAmmo(id); afterFire();
  if (id === 'rocket') Sfx.rocket(); else Sfx.whoosh();
  if (id === 'boomerang') c.speak(pick(['Come back now!', 'Twirly!']));
  if (Math.random() < 0.3) c.speak(pick(QUIPS.fire));
}

function fireInstant(c, id) {
  const d = aimVec(c);
  switch (id) {
    case 'scatter':
      if (g.shotsLeft === 0) { useAmmo(id); g.shotsLeft = 2; g.lockWeapon = true; }
      shootScatter(c); g.shotsLeft--; g.shotCD = 0.55;
      if (g.shotsLeft === 0) afterFire();
      break;
    case 'kazoo': kazoo(c); useAmmo(id); afterFire(); break;
    case 'zap': chainLightning(c); useAmmo(id); afterFire(); break;
    case 'freeze': freezeRay(c); useAmmo(id); afterFire(); break;
    case 'quake':
      if (c.mode !== 'ground') return;
      spawn(new Quake(c)); useAmmo(id); afterFire(); c.speak(pick(['Rumble time!', 'Hold on to something!'])); break;
    case 'flood':
      g.waterTarget = Math.max(400, g.waterTarget - 60); useAmmo(id); afterFire(); banner('The water is rising!', '#8ecae6'); Sfx.splash(); c.speak(pick(['Glub glub!', 'Everybody out of the pool!'])); break;
    case 'karma': karmaJar(c); useAmmo(id); afterFire(); break;
    case 'slap': fishSlap(c); useAmmo(id); afterFire(); break;
    case 'rifle': shootRifle(c); useAmmo(id); afterFire(); break;
    case 'sunbeam': sunbeam(c); useAmmo(id); afterFire(); break;
    case 'chili':
      for (let i = 0; i < 12; i++) { const a = Math.atan2(d.y, d.x) + rand(-0.3, 0.3), sp = rand(90, 190); spawn(new Lava(c.x + d.x * 14, c.y + d.y * 14 - 2, Math.cos(a) * sp, Math.sin(a) * sp - 20)); }
      Sfx.flame(); c.speak(pick(['Too spicy!', 'HOT!'])); useAmmo(id); afterFire(); break;
    case 'stomp':
      if (c.mode !== 'ground') return;
      thunderStomp(c); useAmmo(id); afterFire(); break;
    case 'drill':
      if (c.mode !== 'ground') return;
      g.focus = spawn(new Drill(c, d.x, d.y)); useAmmo(id); g.shotCD = 0.9; c.speak(pick(['Dig dig dig!', 'Tunnel time!'])); break;
    case 'pogo':
      if (c.mode !== 'ground') return;
      c.vx = c.facing * 110; c.vy = -560; c.mode = 'air'; c.fallDmg = false; c.tumble = false; c.flipV = -c.facing * 4; c.y -= 1; c.squash = -0.3;
      useAmmo(id); Sfx.boing(); dustFx(c.x, c.y + c.r, 6); c.speak('BOING!'); break;
    case 'robot': {
      if (c.mode !== 'ground') return;
      const r = spawn(new Robot(c.x + c.facing * 14, c.y - 2, c.facing));
      g.robot = r; g.focus = r; g.fired = true; g.lockWeapon = true; useAmmo(id); Sfx.tone(600, 0.3, 'square', 0.08, 1200); break;
    }
    case 'volcano':
      if (c.mode !== 'ground') return;
      g.focus = spawn(new Volcano(c.x + c.facing * 13, c.y + c.r - 2)); useAmmo(id); afterFire(); c.speak('Ooh, spicy!'); break;
    case 'dynamite':
      g.focus = spawn(new Proj('dynamite', c.x + c.facing * 6, c.y, c.facing * 20, -60, { owner: c, fuse: 5 })); useAmmo(id); afterFire(); c.speak('RUN!'); break;
    case 'grapple':
      if (c.mode === 'ground' || c.mode === 'air') spawn(new Rope(c, d.x, d.y)); break;
    case 'jetpack':
      c.mode = 'jet'; c.fuel = 4; c.fallDmg = false; c.tumble = false; c.vy = Math.min(c.vy, -80); useAmmo(id); break;
    case 'skip':
      c.sadT = 3; c.speak(pick(['Nap time.', 'Pass!', 'Zzz…'])); g.fired = true; endControl(); break;
  }
}

function shootScatter(c) {
  const d = aimVec(c); let x = c.x + d.x * (c.r + 2), y = c.y + d.y * (c.r + 2); const x0 = x, y0 = y;
  Sfx.shot(); shake(4);
  let end = null;
  outer: for (let i = 0; i < 360; i++) {
    x += d.x * 2; y += d.y * 2;
    for (const o of g.critters) if (o.alive && o !== c && (o.x - x) ** 2 + (o.y - y) ** 2 < o.r * o.r) {
      hurt(o, 20); o.vx += d.x * 260; o.vy += d.y * 260 - 130; o.knocked();
      for (let k = 0; k < 8; k++) P({ kind: 'spark', x, y, vx: rand(-150, 150), vy: rand(-150, 50), g: 300, drag: 0.95, size: 2, life: 0.3 });
      end = { x, y }; break outer;
    }
    for (const e of g.ents) if (e.onBlast && !(e instanceof Critter) && !e.dead && e.r && (e.x - x) ** 2 + (e.y - y) ** 2 < e.r * e.r) { e.onBlast(1, d.x, d.y, 30); end = { x, y }; break outer; }
    if (Terrain.solid(x, y)) { explode(x, y, 16, 12, { knock: 0.5 }); end = { x, y }; break; }
    if (x < 0 || x > CFG.W || y > g.waterY) break;
  }
  if (!end) end = { x, y };
  addTracer(x0, y0, end.x, end.y);
}

// Acorn Rifle: a long hitscan ray, 38 damage, modest knockback, barely scratches the ground
function shootRifle(c) {
  const d = aimVec(c); let x = c.x + d.x * (c.r + 2), y = c.y + d.y * (c.r + 2); const x0 = x, y0 = y;
  Sfx.crack(); shake(5); P({ kind: 'flash', x: x0 + d.x * 6, y: y0 + d.y * 6, r: 9, life: 0.08 });
  let end = null;
  outer: for (let i = 0; i < 1400; i++) {
    x += d.x * 2; y += d.y * 2;
    for (const o of g.critters) if (o.alive && o !== c && (o.x - x) ** 2 + (o.y - y) ** 2 < (o.r + 1) ** 2) {
      hurt(o, 38); o.vx += d.x * 200; o.vy += d.y * 200 - 120; o.knocked();
      for (let k = 0; k < 10; k++) P({ kind: 'spark', x, y, vx: rand(-180, 180), vy: rand(-180, 60), g: 300, drag: 0.95, size: 2, life: 0.35 });
      end = { x, y }; break outer;
    }
    for (const e of g.ents) if (e.onBlast && !(e instanceof Critter) && !e.dead && e.r && (e.x - x) ** 2 + (e.y - y) ** 2 < e.r * e.r) { e.onBlast(1, d.x, d.y, 40); end = { x, y }; break outer; }
    if (Terrain.solid(x, y)) { explode(x, y, 9, 6, { knock: 0.3 }); end = { x, y }; break; }
    if (x < 0 || x > CFG.W || y > g.waterY || y < -400) break;
  }
  if (!end) end = { x, y };
  addTracer(x0, y0, end.x, end.y); addTracer(x0, y0, end.x, end.y);
}
// Sunbeam: a laser that burns a straight tunnel and cooks everyone along it
function sunbeam(c) {
  const d = aimVec(c); let x = c.x + d.x * (c.r + 4), y = c.y + d.y * (c.r + 4); const x0 = x, y0 = y, hit = new Set();
  Sfx.laser(); shake(4);
  for (let i = 0; i < 170; i++) {
    x += d.x * 2; y += d.y * 2;
    if (i % 3 === 0 && Terrain.solid(x, y)) Terrain.carve(x, y, 6, true);
    for (const o of g.critters) if (o.alive && o !== c && !hit.has(o) && (o.x - x) ** 2 + (o.y - y) ** 2 < (o.r + 3) ** 2) { hit.add(o); hurt(o, 26); o.vx += d.x * 120; o.vy += d.y * 120 - 100; o.knocked(); o.speak(pick(QUIPS.burn)); }
    for (const e of g.ents) if (e.onBlast && !(e instanceof Critter) && !e.dead && e.r && !hit.has(e) && (e.x - x) ** 2 + (e.y - y) ** 2 < e.r * e.r) { hit.add(e); e.onBlast(0.8, d.x, d.y, 30); }
    if (x < 0 || x > CFG.W || y > g.waterY || y < -300) break;
  }
  P({ kind: 'beam', x: x0, y: y0, x2: x, y2: y, life: 0.5 });
  for (let k = 0; k < 14; k++) { const t = rand(0, 1); P({ kind: 'fire', x: lerp(x0, x, t), y: lerp(y0, y, t), vx: rand(-40, 40), vy: rand(-60, 0), g: -30, drag: 0.93, size: rand(3, 6), life: 0.4 }); }
}
// Thunder Stomp: everyone near you goes flying
function thunderStomp(c) {
  Sfx.stomp(); shake(12); c.squash = 0.4; dustFx(c.x, c.y + c.r, 14);
  for (let k = 0; k < 4; k++) { const ox = rand(-60, 60); let yy = c.y; while (yy < c.y + 60 && !Terrain.solid(c.x + ox, yy)) yy += 2; if (yy < c.y + 60) Terrain.carve(c.x + ox, yy + 4, rand(5, 9), true); }
  for (const e of g.ents.slice()) {
    if (e === c || e.dead || e.x === undefined) continue;
    const dx = e.x - c.x, dy = e.y - c.y, d = Math.hypot(dx, dy); if (d > 150) continue;
    const f = 1 - d / 150, sx = Math.sign(dx) || c.facing;
    if (e instanceof Critter) { if (!e.alive) continue; hurt(e, Math.round(6 + 14 * f)); e.vx += sx * 150 * f; e.vy -= 170 + 150 * f; e.fallDmg = false; e.knocked(); }
    else if (e.onBlast) e.onBlast(f, sx, -1, 6);
  }
  P({ kind: 'ring', x: c.x, y: c.y + c.r, r: 10, r2: 160, life: 0.4, flat: true });
}
// Fish Slap: short-range wallop with a big sideways shove
function fishSlap(c) {
  const d = aimVec(c); Sfx.slap(); shake(3);
  P({ kind: 'icon', icon: 'slap', x: c.x + d.x * 14, y: c.y + d.y * 14 - 4, vx: d.x * 60 + c.facing * 30, vy: -60, g: 400, drag: 0.96, size: 22, rot: c.facing < 0 ? Math.PI : 0, vr: 14 * c.facing, life: 0.45 });
  let hit = false;
  for (const e of g.ents.slice()) {
    if (e === c || e.dead || (e instanceof Critter && !e.alive)) continue;
    const dx = e.x - c.x, dy = e.y - c.y, dd = Math.hypot(dx, dy);
    if (dd > 36 || dx * d.x + dy * d.y < dd * 0.25) continue;   // in front of us only
    if (e instanceof Critter) { hurt(e, 30); e.vx += c.facing * 540; e.vy -= 230; e.knocked(); hit = true;
      for (let k = 0; k < 8; k++) P({ kind: 'water', x: e.x, y: e.y, vx: rand(-100, 100), vy: rand(-180, -40), g: 500, size: rand(1.5, 3), life: 0.5 }); }
    else if (e.onBlast) e.onBlast(1, d.x, d.y, 20);
  }
  if (!hit) addText(c.x, c.y - 30, 'whiff!', '#fff', 14, 1);
}

// Shared hitscan: walks the aim ray and reports what it met first (critter `o`, object `e`, or solid ground)
function castRay(c, len, step = 2) {
  const d = aimVec(c); let x = c.x + d.x * (c.r + 2), y = c.y + d.y * (c.r + 2); const x0 = x, y0 = y;
  for (let i = 0; i < len / step; i++) {
    x += d.x * step; y += d.y * step;
    for (const o of g.critters) if (o.alive && o !== c && (o.x - x) ** 2 + (o.y - y) ** 2 < (o.r + 1) ** 2) return { x0, y0, x, y, o, d };
    for (const e of g.ents) if (e.onBlast && !(e instanceof Critter) && !e.dead && e.r && (e.x - x) ** 2 + (e.y - y) ** 2 < e.r * e.r) return { x0, y0, x, y, e, d };
    if (Terrain.solid(x, y)) return { x0, y0, x, y, solid: true, d };
    if (x < 0 || x > CFG.W || y > g.waterY || y < -400) break;
  }
  return { x0, y0, x, y, d };
}
function boltFx(x1, y1, x2, y2, jag = 10) {
  const pts = [], n = 7;
  for (let i = 0; i <= n; i++) { const k = i / n, j = i && i < n ? 1 : 0; pts.push([lerp(x1, x2, k) + rand(-jag, jag) * j, lerp(y1, y2, k) + rand(-jag, jag) * j]); }
  P({ kind: 'bolt', pts, x: x2, y: y2, life: 0.35 });
}
// Static Jar: lightning that jumps from the first victim to anyone standing close by
function chainLightning(c) {
  const h = castRay(c, 700); Sfx.thunder(); shake(5); boltFx(h.x0, h.y0, h.x, h.y);
  if (h.e) h.e.onBlast(1, h.d.x, h.d.y, 30);
  if (h.solid) explode(h.x, h.y, 8, 4, { knock: 0.2 });
  if (!h.o) { if (!h.e && !h.solid) addText(h.x, h.y - 10, 'fizzle', '#cfe6ff', 14, 1); return; }
  const hit = [h.o]; let cur = h.o;
  hurt(cur, 24); cur.vx += h.d.x * 120; cur.vy -= 120; cur.knocked(); cur.face = 2; cur.faceT = 1;
  for (let j = 0; j < 3; j++) {
    let next = null, nd = 120;
    for (const o of g.critters) if (o.alive && o !== c && !hit.includes(o)) { const d = Math.hypot(o.x - cur.x, o.y - cur.y); if (d < nd) { nd = d; next = o; } }
    if (!next) break;
    boltFx(cur.x, cur.y, next.x, next.y, 8); hurt(next, 16); next.vx += (Math.sign(next.x - cur.x) || 1) * 90; next.vy -= 110; next.knocked(); next.face = 2; next.faceT = 0.8;
    hit.push(next); cur = next;
  }
  if (hit.length > 1) addText(cur.x, cur.y - 30, `${hit.length}× chain!`, '#cfe6ff', 18);
}
// Freeze Ray: the first critter hit is encased in ice and skips its next turn
function freezeRay(c) {
  const h = castRay(c, 650); Sfx.laser(); shake(2);
  P({ kind: 'beam', x: h.x0, y: h.y0, x2: h.x, y2: h.y, life: 0.4, col: '#9ad7ff' });
  for (let k = 0; k < 12; k++) { const t = rand(0, 1); P({ kind: 'spark', x: lerp(h.x0, h.x, t), y: lerp(h.y0, h.y, t), vx: rand(-30, 30), vy: rand(-40, 10), g: 0, drag: 0.95, size: 2, life: 0.5, col: '#cfe6ff' }); }
  if (!h.o) { addText(h.x, h.y - 10, 'miss!', '#cfe6ff', 14, 1); return; }
  const o = h.o;
  o.frozen = 2; o.release(); o.vx = o.vy = 0; o.tumble = false; o.spin = 0; o.sadT = 0; o.face = 0; o.faceT = 0;
  if (circleHits(o.x, o.y + 2, o.r)) o.land(0);
  o.speak(pick(['B-b-brrr!', 'So c-cold!', 'Ice ice baby.'])); addText(o.x, o.y - 30, 'FROZEN!', '#9ad7ff', 20); Sfx.tone(900, 0.3, 'sine', 0.1, 300);
  for (let i = 0; i < 14; i++) P({ kind: 'spark', x: o.x, y: o.y, vx: rand(-100, 100), vy: rand(-100, 100), g: 0, drag: 0.9, size: 2, life: 0.6, col: '#fff' });
}
// Karma Jar: everyone alive gets the average HP
function karmaJar(c) {
  const alive = g.critters.filter(o => o.alive); if (!alive.length) return;
  const avg = Math.max(1, Math.round(alive.reduce((a, o) => a + Math.max(0, o.hp - o.pending), 0) / alive.length));
  for (const o of alive) {
    const diff = avg - (o.hp - o.pending); o.hp = avg; o.pending = 0;
    addText(o.x, o.y - 30, (diff >= 0 ? '+' : '') + diff, diff >= 0 ? '#7CFC9a' : '#ff6b6b', 18);
    for (let i = 0; i < 10; i++) P({ kind: 'spark', x: o.x, y: o.y, vx: rand(-90, 90), vy: rand(-140, -20), g: 200, drag: 0.95, size: 2, life: 0.7, col: '#ffe066' });
  }
  Sfx.teleport(); shake(4); banner(`Karma! Everyone is at ${avg} HP`, '#ffe066'); c.speak(pick(['Fair is fair.', 'Share and share alike!']));
}

function kazoo(c) {
  const d = aimVec(c), ang = Math.atan2(d.y, d.x);
  Sfx.kazoo();
  for (let i = 0; i < 14; i++) { const a = ang + rand(-0.6, 0.6), s = rand(120, 260);
    P({ kind: 'note', x: c.x + d.x * 12, y: c.y + d.y * 12, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: -20, drag: 0.93, size: rand(10, 16), life: 0.8, col: pick(['#ffd23f', '#ff7b39', '#fff']) }); }
  for (const e of g.ents.slice()) {
    if (e === c || e.dead || (e instanceof Critter && !e.alive)) continue;
    const dx = e.x - c.x, dy = e.y - c.y, dd = Math.hypot(dx, dy);
    if (dd > 80 || dd < 1) continue;
    let da = Math.atan2(dy, dx) - ang; da = Math.atan2(Math.sin(da), Math.cos(da));
    if (Math.abs(da) > 0.75) continue;
    const f = 1 - dd / 100;
    if (e instanceof Critter) { hurt(e, 8); e.vx += d.x * 620 * f; e.vy += d.y * 400 * f - 260; e.knocked(); }
    else if (e.onBlast) e.onBlast(f, d.x, d.y, 4);
  }
}

function validTeleport(x, y) { return x > 20 && x < CFG.W - 20 && y > (Terrain.cavern ? 10 : -200) && y < g.waterY - 30 && !circleHits(x, y, CFG.CR + 1); }
function girderOk(c, x, y) {
  if (Math.hypot(x - c.x, y - c.y) > CFG.GIRDER_RANGE) return false;
  const ca = Math.cos(g.girderAng), sa = Math.sin(g.girderAng);
  for (const o of g.critters) if (o.alive) {
    const dx = o.x - x, dy = o.y - y, u = clamp(dx * ca + dy * sa, -40, 40);
    if (Math.hypot(dx - u * ca, dy - u * sa) < o.r + 5) return false;
  }
  return true;
}
function selectWeapon(id) {
  if (Net.role === 'guest') { Net.send({ t: 'w', id, pid: Net.pid, team: Net.myTeam }); g.weapon = id; return; }
  const team = g.active.team;
  if (g.fired || g.lockWeapon || !weaponUsable(team, id) && id !== 'skip') return;
  g.weapon = id; team.lastWeapon = id; g.charging = false; if (id !== 'bee') g.target = null;
}
function doClickAction(c, id, wx, wy) {
  if (!weaponUsable(c.team, id)) { banner(WEAP[id].air && Terrain.cavern ? 'No air-drops in a cavern!' : 'Out of ammo!'); return; }
  switch (id) {
    case 'pelican': g.focus = spawn(new Pelican(wx)); g.target = { x: wx, y: wy }; useAmmo(id); afterFire(); break;
    case 'anvil': g.focus = spawn(new Anvil(wx)); g.target = { x: wx, y: wy }; useAmmo(id); afterFire(); c.speak('Look up!'); break;
    case 'thunder': g.focus = spawn(new Cloud(wx)); g.target = { x: wx, y: wy }; useAmmo(id); afterFire(); c.speak(pick(['Thunder!', 'Zap zap!'])); break;
    case 'shower': g.focus = spawn(new Shower(wx)); g.target = { x: wx, y: wy }; useAmmo(id); afterFire(); c.speak('Make a wish!'); break;
    case 'balloon': {
      let best = null, bd = 40;
      for (const o of g.critters) if (o.alive) { const d = Math.hypot(o.x - wx, o.y - wy); if (d < bd) { bd = d; best = o; } }
      if (!best) { banner('Click on a critter to tie the balloon to!'); return; }
      if (best.frozen > 0) { banner("That one's frozen to the ground!"); return; }
      g.focus = spawn(new Balloon(best)); best.speak(best === c ? pick(['Up, up and away!', 'Bye!']) : pick(['Wha–?!', 'Put me down!', 'Not again!'])); Sfx.whoosh(); useAmmo(id); afterFire(); break;
    }
    case 'swap': {
      let best = null, bd = 40;
      for (const o of g.critters) if (o.alive && o !== c) { const d = Math.hypot(o.x - wx, o.y - wy); if (d < bd) { bd = d; best = o; } }
      if (!best) { banner('Click on a critter to swap places with!'); return; }
      const fx = (x, y) => { for (let i = 0; i < 16; i++) P({ kind: 'spark', x, y, vx: rand(-120, 120), vy: rand(-120, 120), g: 0, drag: 0.9, size: 2, life: 0.6, col: '#ffd23f' }); };
      fx(c.x, c.y); fx(best.x, best.y);
      const bx = best.x, by = best.y; best.x = c.x; best.y = c.y; c.x = bx; c.y = by;
      for (const o of [c, best]) { o.release(); o.fallDmg = false; o.vx = o.vy = 0; o.mode = 'air'; }
      best.speak(pick(['Wha–?!', 'Hey!', 'Where am I?'])); c.speak('Switcheroo!'); Sfx.teleport(); useAmmo(id); afterFire(); break;
    }
    case 'teleport':
      if (!validTeleport(wx, wy)) { banner("Can't teleport there!"); return; }
      for (let i = 0; i < 20; i++) P({ kind: 'spark', x: c.x, y: c.y, vx: rand(-120, 120), vy: rand(-120, 120), g: 0, drag: 0.9, size: 2, life: 0.6, col: '#c77dff' });
      c.x = wx; c.y = wy; c.release(); c.fallDmg = false; c.vx = c.vy = 0; Sfx.teleport(); useAmmo(id);
      for (let i = 0; i < 20; i++) P({ kind: 'spark', x: wx, y: wy, vx: rand(-120, 120), vy: rand(-120, 120), g: 0, drag: 0.9, size: 2, life: 0.6, col: '#c77dff' });
      afterFire(); break;
    case 'girder':
      if (!girderOk(c, wx, wy)) { banner(Math.hypot(wx - c.x, wy - c.y) > CFG.GIRDER_RANGE ? 'Too far away!' : 'Something is in the way!'); return; }
      Terrain.girder(wx, wy, g.girderAng); useAmmo(id); Sfx.clank(); dustFx(wx, wy, 6); break;
  }
}

// ---- procedural icons (shared by HUD, picker and in-world projectiles) ----
function circ(x, cx, cy, r) { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); }
function rr(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }
function fs(x, fill) { x.fillStyle = fill; x.fill(); x.stroke(); }
function drawIcon(x, id, s) {
  x.save(); x.scale(s / 40, s / 40); x.lineJoin = 'round'; x.lineCap = 'round'; x.lineWidth = 2.5; x.strokeStyle = '#2b1d12';
  switch (id) {
    case 'bomb':
      x.beginPath(); x.ellipse(0, 3, 11, 15, 0, 0, 7); fs(x, '#9a6332');
      x.strokeStyle = '#5c3815'; x.lineWidth = 1.8;
      for (let r = -8; r <= 12; r += 5) { x.beginPath(); x.moveTo(-9, r); x.quadraticCurveTo(0, r + 5, 9, r); x.stroke(); }
      x.strokeStyle = '#2b1d12'; x.lineWidth = 2.5;
      x.beginPath(); x.moveTo(0, -12); x.lineTo(-7, -19); x.lineTo(1, -16); x.lineTo(6, -20); x.closePath(); fs(x, '#59b84a');
      x.beginPath(); x.moveTo(2, -16); x.quadraticCurveTo(10, -22, 14, -16); x.stroke();
      circ(x, 14, -16, 2.5); x.fillStyle = '#ffd23f'; x.fill(); break;
    case 'rocket':
      x.beginPath(); x.moveTo(-14, -6); x.lineTo(8, -6); x.lineTo(17, 0); x.lineTo(8, 6); x.lineTo(-14, 6); x.closePath(); fs(x, '#e63946');
      rr(x, -4, -6, 5, 12, 1); fs(x, '#fff');
      x.beginPath(); x.moveTo(-14, -6); x.lineTo(-19, -11); x.lineTo(-19, 11); x.lineTo(-14, 6); fs(x, '#ffd23f');
      x.beginPath(); x.moveTo(-19, 0); x.lineTo(-26, 0); x.stroke(); break;
    case 'bee':
      x.globalAlpha = 0.8; x.beginPath(); x.ellipse(-3, -10, 6, 9, -0.4, 0, 7); fs(x, '#e8f6ff'); x.beginPath(); x.ellipse(5, -10, 6, 9, 0.4, 0, 7); fs(x, '#e8f6ff'); x.globalAlpha = 1;
      x.beginPath(); x.ellipse(0, 2, 14, 10, 0, 0, 7); fs(x, '#ffd23f');
      x.fillStyle = '#2b1d12'; x.fillRect(-6, -7, 4, 18); x.fillRect(2, -7, 4, 18);
      circ(x, 9, 0, 2); x.fillStyle = '#fff'; x.fill(); x.beginPath(); x.moveTo(-14, 2); x.lineTo(-19, 2); x.stroke(); break;
    case 'scatter':
      x.beginPath(); x.moveTo(-18, 2); x.lineTo(-6, 0); x.lineTo(-4, 10); x.lineTo(-16, 12); x.closePath(); fs(x, '#8d5a2b');
      rr(x, -8, -6, 28, 5, 2); fs(x, '#9aa3ad'); rr(x, -8, -1, 28, 5, 2); fs(x, '#7d8691'); break;
    case 'melon':
      circ(x, 0, 0, 15); fs(x, '#3fae4a'); x.strokeStyle = '#1f6e2a';
      for (let i = -2; i <= 2; i++) { x.beginPath(); x.ellipse(0, 0, Math.abs(i) * 4 + 1, 14, 0, 0, 7); x.stroke(); }
      x.strokeStyle = '#2b1d12'; x.beginPath(); x.moveTo(4, -14); x.lineTo(15, -1); x.lineTo(4, -1); x.closePath(); fs(x, '#ff5d73'); break;
    case 'robot':
      rr(x, -11, -10, 22, 18, 4); fs(x, '#b8c1cc'); circ(x, -4, -2, 3.5); fs(x, '#fff'); circ(x, 5, -2, 3.5); fs(x, '#fff');
      x.fillStyle = '#2b1d12'; circ(x, -3, -2, 1.5); x.fill(); circ(x, 6, -2, 1.5); x.fill();
      x.beginPath(); x.moveTo(0, -10); x.lineTo(0, -16); x.stroke(); circ(x, 0, -17, 2.5); fs(x, '#ff4d6d');
      x.beginPath(); x.moveTo(-11, 0); x.lineTo(-17, 0); x.moveTo(-17, -5); x.lineTo(-17, 5); x.stroke();
      x.beginPath(); x.moveTo(-6, 8); x.lineTo(-6, 14); x.moveTo(6, 8); x.lineTo(6, 14); x.stroke(); break;
    case 'kazoo':
      x.beginPath(); x.moveTo(-16, -4); x.lineTo(10, -7); x.lineTo(14, 0); x.lineTo(10, 7); x.lineTo(-16, 4); x.closePath(); fs(x, '#ffbe0b');
      circ(x, 0, -6, 3.5); fs(x, '#ff7b39');
      x.fillStyle = '#2b1d12'; x.font = 'bold 14px sans-serif'; x.fillText('♪', 12, -10); break;
    case 'pelican':
      x.beginPath(); x.ellipse(-3, 3, 13, 9, 0, 0, 7); fs(x, '#fff'); circ(x, 7, -7, 6); fs(x, '#fff');
      x.beginPath(); x.moveTo(11, -8); x.lineTo(23, -4); x.lineTo(11, 0); x.closePath(); fs(x, '#ff9f1c');
      x.fillStyle = '#2b1d12'; circ(x, 8, -8, 1.4); x.fill();
      x.beginPath(); x.moveTo(-10, 0); x.quadraticCurveTo(-2, -14, 4, 0); x.stroke(); break;
    case 'anvil':
      x.beginPath(); x.moveTo(-16, -8); x.lineTo(14, -8); x.quadraticCurveTo(20, -8, 20, -4); x.lineTo(8, -2); x.lineTo(6, 6); x.lineTo(12, 12);
      x.lineTo(-12, 12); x.lineTo(-6, 6); x.lineTo(-8, -2); x.lineTo(-16, -3); x.closePath(); fs(x, '#565c66');
      x.strokeStyle = '#9aa3ad'; x.beginPath(); x.moveTo(-12, -6); x.lineTo(10, -6); x.stroke(); break;
    case 'volcano':
      x.beginPath(); x.moveTo(-18, 14); x.lineTo(-6, -8); x.lineTo(6, -8); x.lineTo(18, 14); x.closePath(); fs(x, '#7a5134');
      x.beginPath(); x.moveTo(-6, -8); x.quadraticCurveTo(-3, -2, 0, -6); x.quadraticCurveTo(3, -1, 6, -8); x.closePath(); fs(x, '#ff5400');
      circ(x, -3, -15, 3); fs(x, '#ff9f1c'); circ(x, 5, -19, 2.5); fs(x, '#ff5400'); break;
    case 'dynamite':
      rr(x, -6, -12, 12, 26, 3); fs(x, '#d62828'); x.fillStyle = '#fff'; x.fillRect(-5, -2, 10, 4);
      x.beginPath(); x.moveTo(0, -12); x.quadraticCurveTo(4, -18, 9, -17); x.stroke();
      circ(x, 10, -17, 3); x.fillStyle = '#ffd23f'; x.fill(); break;
    case 'sticky':
      x.beginPath(); x.moveTo(-14, 8); x.quadraticCurveTo(-14, -10, 0, -10); x.quadraticCurveTo(14, -10, 14, 8); x.closePath(); fs(x, '#80b918');
      circ(x, 0, -2, 4); fs(x, '#ff4d6d');
      x.beginPath(); x.moveTo(-10, 8); x.quadraticCurveTo(-9, 14, -7, 8); x.moveTo(6, 8); x.quadraticCurveTo(8, 15, 10, 8); x.stroke(); break;
    case 'grapple':
      x.beginPath(); x.moveTo(-16, 16); x.quadraticCurveTo(-4, 8, 2, -6); x.strokeStyle = '#a47148'; x.lineWidth = 3; x.stroke();
      x.strokeStyle = '#2b1d12'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(2, -6); x.lineTo(6, -14);
      x.moveTo(6, -14); x.quadraticCurveTo(-4, -16, -6, -8); x.moveTo(6, -14); x.quadraticCurveTo(16, -12, 14, -4); x.stroke(); break;
    case 'jetpack':
      rr(x, -12, -14, 10, 22, 4); fs(x, '#adb5bd'); rr(x, 2, -14, 10, 22, 4); fs(x, '#adb5bd');
      x.beginPath(); x.moveTo(-10, 8); x.lineTo(-7, 18); x.lineTo(-4, 8); fs(x, '#ff9f1c'); x.beginPath(); x.moveTo(4, 8); x.lineTo(7, 18); x.lineTo(10, 8); fs(x, '#ff9f1c'); break;
    case 'teleport':
      x.beginPath(); x.ellipse(0, 10, 16, 5, 0, 0, 7); fs(x, '#7b2cbf');
      x.strokeStyle = '#c77dff'; x.lineWidth = 3; x.beginPath(); for (let a = 0; a < 12; a += 0.3) { const r = a * 1.2; x.lineTo(Math.cos(a) * r, -2 + Math.sin(a) * r * 0.6); } x.stroke(); break;
    case 'girder':
      x.rotate(-0.3); rr(x, -19, -5, 38, 10, 1); fs(x, '#ec8a2c'); x.fillStyle = '#7a3a10';
      for (let i = -14; i <= 14; i += 7) { circ(x, i, 0, 1.8); x.fill(); } break;
    case 'skip':
      x.fillStyle = '#5a6b8c'; x.font = 'bold 22px sans-serif'; x.textAlign = 'center'; x.fillText('Zz', 0, 6);
      x.font = 'bold 12px sans-serif'; x.fillText('z', 13, -8); break;
    case 'rifle':
      x.beginPath(); x.moveTo(-18, 4); x.lineTo(-8, 0); x.lineTo(-4, 10); x.lineTo(-14, 14); x.closePath(); fs(x, '#8d5a2b');
      rr(x, -10, -4, 32, 5, 2); fs(x, '#5c6670'); rr(x, 14, -5, 8, 3, 1); fs(x, '#9aa3ad');
      x.beginPath(); x.moveTo(-2, -4); x.lineTo(-2, -10); x.lineTo(2, -10); x.stroke();
      x.beginPath(); x.ellipse(-4, -6, 4, 5, 0, 0, 7); fs(x, '#a0703f'); break;
    case 'skunk':
      x.beginPath(); x.ellipse(2, 4, 13, 8, 0, 0, 7); fs(x, '#2b2b33'); circ(x, 13, 0, 5); fs(x, '#2b2b33');
      x.beginPath(); x.moveTo(-10, 2); x.quadraticCurveTo(-20, -14, -6, -18); x.quadraticCurveTo(-14, -8, -4, -2); x.closePath(); fs(x, '#2b2b33');
      x.strokeStyle = '#fff'; x.lineWidth = 3; x.beginPath(); x.moveTo(-8, -1); x.quadraticCurveTo(-14, -9, -8, -15); x.moveTo(-6, 1); x.quadraticCurveTo(4, -5, 12, -3); x.stroke();
      x.strokeStyle = '#2b1d12'; x.lineWidth = 2.5; x.fillStyle = '#fff'; circ(x, 15, -1, 1.5); x.fill(); x.fillStyle = '#ff7aa2'; circ(x, 18, 1, 1.5); x.fill(); break;
    case 'slap':
      x.beginPath(); x.moveTo(-16, 0); x.quadraticCurveTo(-4, -12, 12, -4); x.quadraticCurveTo(14, 0, 12, 4); x.quadraticCurveTo(-4, 12, -16, 0); x.closePath(); fs(x, '#5fb3d9');
      x.beginPath(); x.moveTo(-14, 0); x.lineTo(-22, -8); x.lineTo(-20, 0); x.lineTo(-22, 8); x.closePath(); fs(x, '#5fb3d9');
      x.fillStyle = '#fff'; circ(x, 6, -2, 2.5); x.fill(); x.fillStyle = '#111'; circ(x, 7, -2, 1.2); x.fill();
      x.strokeStyle = '#2b6f8a'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(-6, -4); x.lineTo(-4, 4); x.moveTo(0, -6); x.lineTo(2, 5); x.stroke(); break;
    case 'thunder':
      x.fillStyle = '#9aa3ad'; circ(x, -8, -4, 8); x.fill(); x.stroke(); circ(x, 4, -8, 10); x.fill(); x.stroke(); circ(x, 12, -2, 7); x.fill(); x.stroke();
      x.beginPath(); x.ellipse(2, -1, 17, 7, 0, 0, Math.PI); fs(x, '#9aa3ad');
      x.beginPath(); x.moveTo(2, 4); x.lineTo(-4, 13); x.lineTo(1, 13); x.lineTo(-3, 22); x.lineTo(7, 10); x.lineTo(2, 10); x.lineTo(6, 4); x.closePath(); fs(x, '#ffd23f'); break;
    case 'acorn':
      x.beginPath(); x.moveTo(-13, -4); x.quadraticCurveTo(-13, 18, 0, 20); x.quadraticCurveTo(13, 18, 13, -4); x.closePath(); fs(x, '#a0703f');
      x.beginPath(); x.moveTo(-15, -4); x.quadraticCurveTo(0, -16, 15, -4); x.quadraticCurveTo(0, 0, -15, -4); x.closePath(); fs(x, '#6b4427');
      x.strokeStyle = '#4a2e18'; x.lineWidth = 1.5; for (let i = -10; i <= 10; i += 5) { x.beginPath(); x.moveTo(i, -8); x.lineTo(i + 2, -3); x.stroke(); }
      x.strokeStyle = '#2b1d12'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(0, -11); x.lineTo(2, -18); x.stroke(); break;
    case 'drill':
      x.beginPath(); x.moveTo(20, 0); x.lineTo(-2, -9); x.lineTo(-2, 9); x.closePath(); fs(x, '#9aa3ad');
      x.strokeStyle = '#5c6670'; x.lineWidth = 2; x.beginPath(); x.moveTo(2, -7); x.lineTo(8, -3); x.moveTo(-1, 0); x.lineTo(14, 1); x.moveTo(2, 7); x.lineTo(8, 3); x.stroke();
      x.strokeStyle = '#2b1d12'; x.lineWidth = 2.5; rr(x, -16, -6, 14, 12, 3); fs(x, '#ff7b39'); rr(x, -20, -2, 6, 4, 1); fs(x, '#2b1d12'); break;
    case 'pogo':
      x.beginPath(); x.moveTo(0, -20); x.lineTo(0, 6); x.lineWidth = 4; x.strokeStyle = '#2b1d12'; x.stroke(); x.lineWidth = 2.5;
      x.strokeStyle = '#9aa3ad'; x.lineWidth = 2; x.beginPath(); for (let i = 0; i < 5; i++) { x.moveTo(-6, 4 + i * 3); x.lineTo(6, 5 + i * 3); } x.stroke();
      x.strokeStyle = '#2b1d12'; x.lineWidth = 2.5; rr(x, -12, -4, 24, 5, 2); fs(x, '#e63946'); rr(x, -8, -22, 16, 4, 2); fs(x, '#e63946'); circ(x, 0, 20, 3); fs(x, '#2b1d12'); break;
    case 'bowling':
      circ(x, 0, 0, 13); fs(x, '#6b4427');
      x.fillStyle = '#3b2414'; for (let i = 0; i < 10; i++) { const a = i * 0.628; x.beginPath(); x.moveTo(Math.cos(a - 0.2) * 12, Math.sin(a - 0.2) * 12); x.lineTo(Math.cos(a) * 19, Math.sin(a) * 19); x.lineTo(Math.cos(a + 0.2) * 12, Math.sin(a + 0.2) * 12); x.fill(); }
      x.fillStyle = '#fff'; circ(x, -4, -3, 3); x.fill(); circ(x, 4, -3, 3); x.fill(); x.fillStyle = '#111'; circ(x, -3, -3, 1.4); x.fill(); circ(x, 5, -3, 1.4); x.fill(); break;
    case 'boomerang':
      x.lineWidth = 7; x.strokeStyle = '#2b1d12'; x.beginPath(); x.moveTo(-14, 10); x.quadraticCurveTo(-2, -14, 14, 8); x.stroke();
      x.lineWidth = 3.5; x.strokeStyle = '#a0703f'; x.stroke(); x.lineWidth = 2.5; x.strokeStyle = '#2b1d12';
      x.fillStyle = '#4caf50'; circ(x, -12, 9, 3); x.fill(); x.stroke(); break;
    case 'mortar':
      x.save(); x.rotate(-0.6); rr(x, -7, -18, 14, 30, 3); fs(x, '#5c6670'); rr(x, -9, -20, 18, 5, 2); fs(x, '#9aa3ad'); x.restore();
      rr(x, -14, 8, 28, 6, 2); fs(x, '#8d5a2b');
      for (const [ax, ay] of [[12, -14], [17, -6], [19, 4]]) { x.beginPath(); x.ellipse(ax, ay, 3, 4, 0, 0, 7); fs(x, '#a0703f'); } break;
    case 'sunbeam':
      circ(x, -8, 0, 9); fs(x, '#ffd23f'); x.strokeStyle = '#ff9f1c'; x.lineWidth = 2;
      for (let i = 0; i < 8; i++) { const a = i * 0.785; x.beginPath(); x.moveTo(Math.cos(a) * 11 - 8, Math.sin(a) * 11); x.lineTo(Math.cos(a) * 15 - 8, Math.sin(a) * 15); x.stroke(); }
      x.strokeStyle = '#fff'; x.lineWidth = 5; x.beginPath(); x.moveTo(2, 0); x.lineTo(22, 0); x.stroke(); x.strokeStyle = '#ffd23f'; x.lineWidth = 2; x.stroke(); x.strokeStyle = '#2b1d12'; x.lineWidth = 2.5; break;
    case 'vortex':
      circ(x, 0, 0, 14); fs(x, '#3c096c');
      x.strokeStyle = '#c77dff'; x.lineWidth = 2.5; x.beginPath(); for (let a = 0; a < 9; a += 0.25) { const r = a * 1.4; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); } x.stroke();
      x.strokeStyle = '#2b1d12'; x.beginPath(); x.moveTo(0, -14); x.lineTo(2, -20); x.stroke(); break;
    case 'chili':
      x.beginPath(); x.moveTo(-6, -14); x.quadraticCurveTo(14, -8, 10, 10); x.quadraticCurveTo(6, 20, -2, 14); x.quadraticCurveTo(-12, 2, -6, -14); x.closePath(); fs(x, '#e63946');
      x.beginPath(); x.moveTo(-6, -14); x.quadraticCurveTo(-10, -20, -4, -22); x.quadraticCurveTo(0, -17, -2, -13); x.closePath(); fs(x, '#4caf50');
      x.fillStyle = '#ff8fab'; x.beginPath(); x.ellipse(2, -6, 2, 5, 0.4, 0, 7); x.fill(); break;
    case 'stomp':
      x.beginPath(); x.moveTo(-14, 10); x.lineTo(-10, -12); x.lineTo(2, -14); x.lineTo(6, -2); x.lineTo(16, 4); x.lineTo(16, 12); x.closePath(); fs(x, '#8d5a2b');
      x.fillStyle = '#5c3a20'; x.fillRect(-14, 8, 30, 5);
      x.strokeStyle = '#ffd23f'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(-20, 0); x.lineTo(-24, -6); x.moveTo(-18, 14); x.lineTo(-25, 16); x.moveTo(22, 0); x.lineTo(26, -6); x.stroke(); x.strokeStyle = '#2b1d12'; break;
    case 'shower':
      x.fillStyle = '#ffd23f'; x.strokeStyle = '#2b1d12';
      for (const [sx, sy, r] of [[0, -2, 11], [-13, -10, 5], [13, 10, 5]]) { x.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * 0.628, rr0 = i % 2 ? r * 0.45 : r; x.lineTo(sx + Math.cos(a) * rr0, sy + Math.sin(a) * rr0); } x.closePath(); x.fill(); x.stroke(); } break;
    case 'swap':
      x.lineWidth = 3; x.strokeStyle = '#2b1d12';
      x.beginPath(); x.moveTo(-14, -6); x.lineTo(10, -6); x.moveTo(5, -11); x.lineTo(10, -6); x.lineTo(5, -1); x.stroke();
      x.beginPath(); x.moveTo(14, 7); x.lineTo(-10, 7); x.moveTo(-5, 2); x.lineTo(-10, 7); x.lineTo(-5, 12); x.stroke();
      x.strokeStyle = '#3a86ff'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(-14, -6); x.lineTo(10, -6); x.stroke(); x.strokeStyle = '#ff4d6d'; x.beginPath(); x.moveTo(14, 7); x.lineTo(-10, 7); x.stroke(); x.strokeStyle = '#2b1d12'; x.lineWidth = 2.5; break;
    case 'frog':
      x.beginPath(); x.ellipse(0, 4, 15, 10, 0, 0, 7); fs(x, '#59b84a');
      circ(x, -7, -7, 5); fs(x, '#59b84a'); circ(x, 7, -7, 5); fs(x, '#59b84a');
      x.fillStyle = '#fff'; circ(x, -7, -7, 3); x.fill(); circ(x, 7, -7, 3); x.fill(); x.fillStyle = '#111'; circ(x, -6, -7, 1.5); x.fill(); circ(x, 8, -7, 1.5); x.fill();
      x.beginPath(); x.moveTo(-8, 6); x.quadraticCurveTo(0, 12, 8, 6); x.stroke();
      x.beginPath(); x.moveTo(-14, 10); x.lineTo(-20, 16); x.moveTo(14, 10); x.lineTo(20, 16); x.stroke(); break;
    case 'zap':
      rr(x, -11, -6, 22, 22, 4); fs(x, '#bde0fe'); rr(x, -8, -14, 16, 8, 2); fs(x, '#9aa3ad');
      x.beginPath(); x.moveTo(3, -2); x.lineTo(-4, 5); x.lineTo(1, 5); x.lineTo(-3, 13); x.lineTo(5, 3); x.lineTo(0, 3); x.lineTo(4, -2); x.closePath(); fs(x, '#ffd23f'); break;
    case 'freeze':
      rr(x, -16, -4, 24, 8, 3); fs(x, '#7fc8f8'); rr(x, -10, 4, 8, 10, 2); fs(x, '#5a6b8c'); circ(x, 10, 0, 6); fs(x, '#bde0fe');
      x.strokeStyle = '#fff'; x.lineWidth = 2;
      for (let i = 0; i < 3; i++) { const a = i * 1.047; x.beginPath(); x.moveTo(19 - Math.cos(a) * 7, -Math.sin(a) * 7); x.lineTo(19 + Math.cos(a) * 7, Math.sin(a) * 7); x.stroke(); }
      x.strokeStyle = '#2b1d12'; x.lineWidth = 2.5; break;
    case 'balloon':
      x.beginPath(); x.ellipse(0, -5, 12, 14, 0, 0, 7); fs(x, '#ff5d8f'); x.fillStyle = 'rgba(255,255,255,0.5)'; x.beginPath(); x.ellipse(-4, -10, 3.5, 5, -0.4, 0, 7); x.fill();
      x.beginPath(); x.moveTo(-3, 9); x.lineTo(3, 9); x.lineTo(0, 12); x.closePath(); fs(x, '#ff5d8f');
      x.lineWidth = 1.5; x.beginPath(); x.moveTo(0, 12); x.quadraticCurveTo(6, 16, 2, 22); x.stroke(); x.lineWidth = 2.5; break;
    case 'quake':
      x.beginPath(); x.moveTo(-20, 12); x.lineTo(-10, -4); x.lineTo(-2, 6); x.lineTo(6, -8); x.lineTo(14, 2); x.lineTo(20, 12); x.closePath(); fs(x, '#8d5a2b');
      x.lineWidth = 2; x.beginPath(); x.moveTo(-6, 12); x.lineTo(-2, 2); x.lineTo(2, 8); x.lineTo(5, 0); x.stroke();
      x.strokeStyle = '#ffd23f'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(-24, -2); x.lineTo(-28, -8); x.moveTo(24, -2); x.lineTo(28, -8); x.moveTo(-26, 14); x.lineTo(-30, 16); x.stroke(); x.strokeStyle = '#2b1d12'; break;
    case 'flood':
      x.fillStyle = '#4ea8de'; x.beginPath(); x.moveTo(-20, 14); for (let i = -20; i <= 20; i += 2) x.lineTo(i, 2 + Math.sin(i * 0.4) * 3); x.lineTo(20, 14); x.closePath(); x.fill(); x.stroke();
      x.beginPath(); x.moveTo(0, -18); x.quadraticCurveTo(9, -5, 0, -2); x.quadraticCurveTo(-9, -5, 0, -18); x.closePath(); fs(x, '#4ea8de');
      x.beginPath(); x.moveTo(-14, -8); x.lineTo(-14, -16); x.moveTo(-17, -13); x.lineTo(-14, -16); x.lineTo(-11, -13); x.stroke(); break;
    case 'spitter':
      x.beginPath(); x.moveTo(-18, 4); x.lineTo(-8, 0); x.lineTo(-4, 10); x.lineTo(-14, 14); x.closePath(); fs(x, '#8d5a2b');
      rr(x, -10, -4, 26, 7, 3); fs(x, '#3b3b45'); circ(x, 18, -1, 4); fs(x, '#3b3b45');
      x.fillStyle = '#ff2a2a'; circ(x, 18, -1, 1.5); x.fill(); x.fillStyle = '#3b3b45';
      for (const [sx, sy] of [[8, -12], [14, -17], [2, -17]]) { x.beginPath(); x.ellipse(sx, sy, 3, 2.2, 0, 0, 7); x.fill(); x.stroke(); } break;
    case 'karma':
      rr(x, -11, -8, 22, 24, 5); fs(x, 'rgba(200,230,255,0.9)'); rr(x, -8, -14, 16, 7, 2); fs(x, '#a0703f');
      x.beginPath(); x.moveTo(-5, -1); x.lineTo(5, 9); x.moveTo(5, -1); x.lineTo(-5, 9); x.stroke();
      circ(x, 0, 4, 3); fs(x, '#ffd23f'); break;
    case 'cannon':
      x.save(); x.rotate(-0.5); rr(x, -6, -20, 14, 28, 4); fs(x, '#5c6670'); rr(x, -8, -22, 18, 6, 2); fs(x, '#9aa3ad'); x.restore();
      circ(x, 0, 10, 6); fs(x, '#3b3b45'); circ(x, 14, -16, 5); fs(x, '#b5814f'); x.fillStyle = '#fff'; circ(x, 13, -17, 1.8); x.fill(); circ(x, 16, -17, 1.8); x.fill();
      x.strokeStyle = '#ffd23f'; x.beginPath(); x.moveTo(20, -22); x.lineTo(26, -28); x.moveTo(22, -16); x.lineTo(28, -16); x.stroke(); x.strokeStyle = '#2b1d12'; break;
    case 'seed':
      x.beginPath(); x.ellipse(0, 0, 7, 10, 0.3, 0, 7); fs(x, '#3b3b45'); x.fillStyle = '#ff2a2a'; circ(x, 1, -2, 2); x.fill(); break;
    case 'meteor':
      circ(x, 0, 0, 11); fs(x, '#5a4a4a'); x.fillStyle = '#ff9f1c'; circ(x, -3, -3, 3); x.fill(); x.fillStyle = '#8a7a7a'; circ(x, 4, 3, 2.5); x.fill(); break;
    case 'egg':
      x.beginPath(); x.ellipse(0, 0, 10, 13, 0, 0, 7); fs(x, '#fff8e7'); x.fillStyle = '#c9b48a'; circ(x, -3, -3, 2); x.fill(); circ(x, 4, 4, 1.5); x.fill(); break;
    case 'frag':
      circ(x, 0, 0, 12); fs(x, '#ff5d73'); x.fillStyle = '#2b1d12'; circ(x, -3, -2, 1.5); x.fill(); circ(x, 3, 3, 1.5); x.fill(); break;
  }
  x.restore();
}

