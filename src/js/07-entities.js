// ============================== ENTITIES ==============================
class Body {
  constructor(x, y, r) { Object.assign(this, { x, y, r, vx: 0, vy: 0, bounce: 0.3, friction: 0.2, windF: 0, grav: 1, rest: false, dead: false, hit: null }); }
  // passive tumble-until-rest behaviour shared by mines, barrels, crates, graves
  physics(dt) {
    if (this.rest) { if (circleHits(this.x, this.y + 1.5, this.r)) return; this.rest = false; }
    if (circleHits(this.x, this.y, this.r)) pushOut(this);
    moveBody(this, dt);
    if (this.hit) {
      if (this.hit.speed > 90) Sfx.clack();
      if (this.hit.ny < -0.45 && Math.hypot(this.vx, this.vy) < 35) { this.vx = this.vy = 0; this.rest = true; settle(this); }
    }
  }
  push(f, nx, ny, k = 380) { this.vx += nx * k * f; this.vy += ny * k * f - 140 * f; this.rest = false; }
  busy() { return !this.rest; }
  checkBounds() {
    if (this.y > g.waterY + 3) { splashFx(this.x, g.waterY, 0.6); Sfx.splash(); this.dead = true; }
    else if (this.x < -80 || this.x > CFG.W + 80) this.dead = true;
  }
  update(dt) { this.physics(dt); this.checkBounds(); }
}

class Critter extends Body {
  constructor(team, name) {
    super(0, 0, CFG.CR);
    Object.assign(this, { team, name, hp: CFG.HP, pending: 0, alive: true, facing: Math.random() < 0.5 ? 1 : -1, aim: -0.35,
      mode: 'air', tumble: false, fallDmg: false, bounce: 0.32, friction: 0.25, squash: 0, spin: 0, spinV: 0, flipV: 0,
      walkPh: 0, walking: false, walkAcc: 0, blocked: false, px: 0, py: 0, pvx: 0, pvy: 0, lvx: 0, lvy: 0,
      say: null, hurtT: 0, sadT: 0, jumpT: 0, fuel: 0, rope: null, swing: 0, ropeDL: 0, thrust: false, jetX: 0,
      voice: rand(330, 640), seed: rand(0, 10), stillT: 0, dyingT: 0, burnQuipT: 0,
      // animation state (cosmetic): walk blend, idle timer, blink countdown, look-around target, face code + timer
      walkT: 0, idleT: 0, blinkT: rand(1, 4), lookT: 0, lookX: 0, lookY: 0, face: 0, faceT: 0, frozen: 0, balloon: null, poison: 0, virus: false, jumped: false });
  }
  busy() { return this.alive && this.mode !== 'ground'; }
  knocked() {
    if (this.frozen > 0) return;   // a block of ice does not budge
    if (this.mode === 'rope' || this.mode === 'jet') this.release();
    this.mode = 'air'; this.tumble = true; this.fallDmg = true; this.spinV = rand(-18, 18); this.flipV = 0; this.jumped = false;
  }
  release() {
    if (this.rope) { this.rope.dead = true; this.rope = null; }
    this.mode = 'air'; this.fallDmg = true; this.thrust = false; this.jetX = 0;
  }
  doJump(back) {
    if (this.mode !== 'ground') return;
    if (back) { this.vx = CFG.FLIP[0] * this.facing; this.vy = CFG.FLIP[1]; this.flipV = -this.facing * 12.5; }
    else { this.vx = CFG.JUMP[0] * this.facing; this.vy = CFG.JUMP[1]; }
    this.mode = 'air'; this.fallDmg = true; this.squash = -0.25; this.y -= 1; this.jumped = true; this.tumble = false; this.spin = 0; Sfx.jump(back);
  }
  // a second tap of jump right after take-off turns the hop into a backflip
  backflip() {
    if (this.mode !== 'air' || !this.jumped) return;
    this.vx = CFG.FLIP[0] * this.facing; this.vy = CFG.FLIP[1]; this.flipV = -this.facing * 12.5; Sfx.jump(true);
  }
  speak(t) { this.say = { text: t, t: 2.4 }; Sfx.blip(this.voice, clamp(1 + (t.length / 5 | 0), 1, 5)); }
  walk(dir, dt) {
    this.walking = true; this.walkAcc += CFG.WALK * (g.walkMul || 1) * dt; this.walkPh += dt * 16 * (g.walkMul || 1);
    while (this.walkAcc >= 1) {
      this.walkAcc -= 1;
      const r = walkStep(this, dir);
      if (r === 'wall') { this.walkAcc = 0; this.blocked = true; break; }
      this.blocked = false;
      if (r === 'fall') { this.mode = 'air'; this.vx = dir * 35; this.vy = 0; this.fallDmg = true; break; }
    }
  }
  update(dt) {
    if (!this.alive) return;
    this.squash *= Math.pow(0.0005, dt); if (Math.abs(this.squash) < 0.005) this.squash = 0;
    if (this.say && (this.say.t -= dt) <= 0) this.say = null;
    this.hurtT = Math.max(0, this.hurtT - dt); this.sadT = Math.max(0, this.sadT - dt); this.burnQuipT -= dt;
    this.anim(dt);
    switch (this.mode) {
      case 'ground':
        if (circleHits(this.x, this.y, this.r)) pushOut(this);
        if (!circleHits(this.x, this.y + 2, this.r)) { this.mode = 'air'; this.fallDmg = true; }
        break;
      case 'air':
        if (circleHits(this.x, this.y, this.r)) pushOut(this);
        // a controlled jump hugs walls and ceilings instead of bouncing off them; only a tumble bounces
        this.bounce = this.tumble ? 0.32 : 0.02; this.friction = this.tumble ? 0.25 : 0.04;
        moveBody(this, dt);
        this.spin += (this.tumble ? this.spinV : this.flipV) * dt;
        if (this.hit) this.onHit(this.hit);
        // safety net: wedged in a steep crevice (jittering in place, never finding a flat floor) → just stand up
        if (Math.hypot(this.x - this.ax, this.y - this.ay) < 3) { if ((this.stillT += dt) > 0.5) this.land(0); }
        else { this.ax = this.x; this.ay = this.y; this.stillT = 0; }
        break;
      case 'rope': this.ropePhysics(dt); break;
      case 'jet': this.jetPhysics(dt); break;
      case 'float': this.floatPhysics(dt); break;
      case 'chute': this.chutePhysics(dt); break;
    }
    this.eyes(dt); localFx(this);
    if (this.y > g.waterY - 2) killCritter(this, 'water');
    else if (this.x < -40 || this.x > CFG.W + 40) killCritter(this, 'off');
  }
  onHit(h) {
    if (h.ny < -0.55 && (!this.tumble || h.speed < 170)) {
      if (this.fallDmg && h.speed > CFG.FALL_SAFE) hurt(this, Math.round((h.speed - CFG.FALL_SAFE) / CFG.FALL_DIV));
      this.land(h.speed);
    } else if (this.tumble && h.speed > 110) { this.squash = 0.18; this.spinV *= -0.6; if (h.speed > 200) { Sfx.thud(); dustFx(this.x, this.y + this.r, 3); } }
  }
  land(speed) {
    this.mode = 'ground'; this.vx = this.vy = 0; this.tumble = false; this.spin = 0; this.spinV = 0; this.flipV = 0; this.stillT = 0; this.jumped = false; this.jetX = 0;
    this.squash = Math.min(0.42, speed / 700); settle(this);
    if (speed > 160) { Sfx.thud(); dustFx(this.x, this.y + this.r, 5); }
  }
  ropePhysics(dt) {
    const R = this.rope; if (!R) { this.mode = 'air'; return; }
    R.len = clamp(R.len + this.ropeDL * 150 * dt, 18, 420);
    this.vy += CFG.G * (g.gravMul || 1) * dt;
    let dx = this.x - R.tx, dy = this.y - R.ty, d = Math.hypot(dx, dy) || 1;
    // tangent of the swing circle, oriented so +1 pumps toward screen-right
    let tx = -dy / d, ty = dx / d; if (tx < 0) { tx = -tx; ty = -ty; }
    this.vx += tx * this.swing * 400 * dt; this.vy += ty * this.swing * 400 * dt;
    if (this.swing) this.facing = this.swing;
    const steps = Math.max(1, Math.ceil(Math.hypot(this.vx, this.vy) * dt / 3));
    for (let i = 0; i < steps; i++) {
      let nx = this.x + this.vx * dt / steps, ny = this.y + this.vy * dt / steps;
      dx = nx - R.tx; dy = ny - R.ty; d = Math.hypot(dx, dy) || 1;
      if (d > R.len) { // inextensible rope: snap back onto the circle and cancel outward radial velocity
        nx = R.tx + dx / d * R.len; ny = R.ty + dy / d * R.len;
        const rx = dx / d, ry = dy / d, vr = this.vx * rx + this.vy * ry;
        if (vr > 0) { this.vx -= vr * rx; this.vy -= vr * ry; }
      }
      if (circleHits(nx, ny, this.r)) {
        const n = normalAt(nx, ny, this.r), vn = this.vx * n.x + this.vy * n.y;
        if (vn < 0) { this.vx -= 1.35 * vn * n.x; this.vy -= 1.35 * vn * n.y; }
        this.vx *= 0.9; this.vy *= 0.9; break;
      }
      this.x = nx; this.y = ny;
    }
  }
  jetPhysics(dt) {
    if (this.thrust && this.fuel > 0) {
      this.vy -= 1120 * dt; this.fuel -= dt;
      if (Sfx.ok('jet', 110)) Sfx.noise(0.12, 0.12, 900, 400);
    }
    this.vx += this.jetX * 460 * dt; this.vx *= 0.985; this.vy = Math.max(-330, this.vy);
    if (this.jetX) this.facing = this.jetX;
    if (circleHits(this.x, this.y, this.r)) pushOut(this);
    moveBody(this, dt);
    if (this.hit && this.hit.ny < -0.5) {
      this.vx *= 0.5; if (this.vy > 0) this.vy = 0; settle(this);
      if (this.fuel <= 0) this.land(0);
    }
  }
  // Party Balloon: drift up and with the wind until the balloon pops, then drop like a stone
  // Dandelion Chute: a slow, wind-blown descent you can steer a little with ←→; lands softly
  chutePhysics(dt) {
    this.vy = Math.min(this.vy + CFG.G * (g.gravMul || 1) * dt, 58); this.vx += (g.wind * 140 + this.jetX * 70 - this.vx) * Math.min(1, 2.5 * dt);
    let nx = this.x + this.vx * dt, ny = this.y + this.vy * dt;
    if (circleHits(nx, this.y, this.r)) { this.vx = 0; nx = this.x; }
    if (circleHits(nx, ny, this.r)) { this.x = nx; this.land(0); return; }
    this.x = nx; this.y = ny;
  }
  floatPhysics(dt) {
    const B = this.balloon;
    if (!B || B.dead) { this.balloon = null; this.mode = 'air'; this.fallDmg = true; this.tumble = true; this.spinV = rand(-9, 9); return; }
    this.vy += (-75 - this.vy) * Math.min(1, 3 * dt); this.vx += (g.wind * 110 - this.vx) * Math.min(1, 1.5 * dt);
    let nx = this.x + this.vx * dt, ny = this.y + this.vy * dt;
    if (circleHits(nx, this.y, this.r)) { this.vx = 0; nx = this.x; }
    if (circleHits(this.x, ny - 28, this.r + 2) || ny < -220) { this.vy = 0; ny = this.y; }   // balloon bumps the ceiling
    this.x = nx; this.y = ny;
    if (Math.abs(this.vx) > 8) this.facing = Math.sign(this.vx);
  }
  trail() { if (this.mode === 'jet' && this.thrust && this.fuel > 0 && Math.random() < 0.8) P({ kind: 'fire', x: this.x - this.facing * 6, y: this.y + 8, vx: rand(-20, 20), vy: rand(120, 220), g: 0, drag: 0.9, size: rand(3, 6), life: 0.25 }); }
  // Cosmetic timers (run on host and guest alike): walk blend, idle clock, blinks, faces.
  anim(dt) {
    this.walkT = clamp(this.walkT + (this.walking ? 9 : -6) * dt, 0, 1);
    const resting = this.mode === 'ground' && !this.walking && this.hurtT <= 0 && !(this === g.active && g.state === 'turn' && g.controlling);
    this.idleT = resting ? this.idleT + dt : 0;
    if ((this.blinkT -= dt) < -0.02) this.blinkT = rand(2, 5.5);
    if (this.faceT > 0 && (this.faceT -= dt) <= 0) this.face = 0;
    if ((this.lookT -= dt) <= 0) { this.lookT = rand(1.2, 3); this.lookX = rand(-1.6, 1.6); this.lookY = rand(-1, 1.2); }
  }
  // Googly eyes: pupils are damped springs pulled toward the look direction and
  // flung around by the body's own changes in velocity.
  eyes(dt) {
    const active = this === g.active && g.state === 'turn';
    const av = aimVec(this);
    const idle = this.idleT > 2.5 && !active;
    const lx = active ? av.x * 1.5 : idle ? this.lookX : this.facing * 0.8, ly = (active ? av.y * 1.5 : idle ? this.lookY : 0) + 0.5;
    this.pvx += (lx - this.px) * 140 * dt - (this.vx - this.lvx) * 0.07;
    this.pvy += (ly - this.py) * 140 * dt - (this.vy - this.lvy) * 0.07 + (this.walking ? Math.sin(this.walkPh) * 2 : 0);
    this.lvx = this.vx; this.lvy = this.vy;
    this.pvx *= 0.9; this.pvy *= 0.9;
    this.px += this.pvx * dt * 6; this.py += this.pvy * dt * 6;
    const l = Math.hypot(this.px, this.py); if (l > 2.4) { this.px *= 2.4 / l; this.py *= 2.4 / l; this.pvx *= -0.4; this.pvy *= -0.4; }
  }
}

class Mine extends Body {
  constructor(x, y, dud, big = false) { super(x, y, big ? 8 : 5); Object.assign(this, { dud, big, armT: big ? 3 : 0, trigT: -1, spent: false, bounce: 0.3, friction: 0.4, blink: rand(0, 2) }); }
  busy() { return !this.rest || this.trigT >= 0; }
  trigger(t = 1.4) { if (this.trigT < 0 && !this.spent && this.armT <= 0) this.trigT = t; }
  update(dt) {
    this.physics(dt); this.blink += dt;
    if (this.armT > 0) { this.armT -= dt; if (this.armT <= 0) { Sfx.beep(); addText(this.x, this.y - 14, 'armed', '#ff6b6b', 11, 0.8); } }
    if (!this.spent && this.armT <= 0) {
      if (this.trigT < 0) {
        if (g.minesLive) for (const c of g.critters) if (c.alive && Math.hypot(c.x - this.x, c.y - this.y) < (this.big ? 44 : 36)) { this.trigger(); break; }
      } else {
        this.trigT -= dt; if ((this.trigT * 8 | 0) !== ((this.trigT + dt) * 8 | 0)) Sfx.beep();
        if (this.trigT <= 0) {
          if (this.dud) { this.spent = true; this.trigT = -1; Sfx.dud(); addText(this.x, this.y - 16, 'dud!', '#ccc', 16);
            for (let i = 0; i < 6; i++) P({ kind: 'smoke', x: this.x, y: this.y - 3, vx: rand(-20, 20), vy: rand(-50, -20), g: 0, drag: 0.96, size: rand(3, 6), life: 1.2, col: '#888' }); }
          else { this.dead = true; explode(this.x, this.y, this.big ? 90 : 46, this.big ? 85 : 42); return; }
        }
      }
    }
    this.checkBounds();
  }
  onBlast(f, nx, ny) { this.push(f, nx, ny); this.trigger(0.5); }
}

class Barrel extends Body {
  constructor(x, y) { super(x, y, 9); Object.assign(this, { hp: 25, fuseT: -1, bounce: 0.2, friction: 0.4 }); }
  busy() { return !this.rest || this.fuseT >= 0; }
  update(dt) {
    this.physics(dt);
    if (this.fuseT >= 0) {
      localFx(this);
      if ((this.fuseT -= dt) <= 0) return this.boom();
    }
    this.checkBounds();
  }
  trail() { if (this.fuseT >= 0 && Math.random() < 0.5) P({ kind: 'fire', x: this.x + rand(-5, 5), y: this.y - 8, vx: 0, vy: -60, g: 0, drag: 0.95, size: rand(3, 6), life: 0.3 }); }
  onBlast(f, nx, ny, dmg) { this.push(f, nx, ny, 250); this.hp -= dmg * f + 5; if (this.hp <= 0 && this.fuseT < 0) this.fuseT = rand(0.12, 0.35); }
  boom() {
    this.dead = true; explode(this.x, this.y, 55, 40);
    for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + rand(-0.9, 0.9), s = rand(150, 320); spawn(new Lava(this.x, this.y - 6, Math.cos(a) * s, Math.sin(a) * s)); }
  }
}

class Crate extends Body {
  constructor(x, y, type, content) { super(x, y, 9); Object.assign(this, { type, content, chute: true, bounce: 0.1, friction: 0.5, fuseT: -1, sway: rand(0, 6), important: true }); }
  busy() { return !this.rest || this.chute || this.fuseT >= 0; }
  update(dt) {
    this.sway += dt * 2.2;
    if (this.chute) {
      this.vy = Math.min(this.vy + CFG.G * dt, 90); this.vx = g.wind * 45;
      this.x += this.vx * dt; this.y += this.vy * dt;
      if (circleHits(this.x, this.y + 1, this.r)) { this.chute = false; this.important = false; this.vx = this.vy = 0; pushOut(this); Sfx.thud(); }
    } else this.physics(dt);
    for (const c of g.critters) if (c.alive && Math.hypot(c.x - this.x, c.y - this.y) < this.r + c.r + 2) { this.collect(c); return; }
    if (this.fuseT >= 0 && (this.fuseT -= dt) <= 0) return this.boom();
    this.checkBounds();
  }
  collect(c) {
    this.dead = true;
    if (this.type === 'trap') { addText(this.x, this.y - 20, 'Surprise!', '#ff6', 22); c.speak('Oh no.'); explode(this.x, this.y, 42, 30); return; }
    Sfx.pickup();
    if (this.type === 'health') { c.hp += 25; addText(c.x, c.y - 30, '+25', '#7CFC9a', 22); c.speak('Yum!'); }
    else { const t = c.team; if (t.ammo[this.content] !== -1) t.ammo[this.content] = (t.ammo[this.content] || 0) + 1;
      addText(this.x, this.y - 22, WEAP[this.content].name + '!', t.color, 18); banner(`${t.name} found a ${WEAP[this.content].name}!`, t.color); }
    for (let i = 0; i < 12; i++) P({ kind: 'spark', x: this.x, y: this.y, vx: rand(-150, 150), vy: rand(-250, -50), g: 300, drag: 0.95, size: 2, life: 0.6, col: '#ffe066' });
  }
  onBlast(f, nx, ny) { this.chute = false; this.important = false; this.push(f, nx, ny, 250); if (f > 0.25 && this.fuseT < 0) this.fuseT = 0.12; }
  boom() { this.dead = true; if (this.type === 'health') { fxExplosion(this.x, this.y, 14); Sfx.boom(10); } else explode(this.x, this.y, 36, 28); }
}

class Grave extends Body {
  constructor(x, y, col) { super(x, y, 7); this.col = col; this.bounce = 0.2; this.friction = 0.5; }
  onBlast(f, nx, ny) { this.push(f, nx, ny, 300); }
}

const PROJ = {
  bomb:     { r: 4, bounce: 0.55, friction: 0.12, windF: 0,    fuse: true,   R: 48, dmg: 48 },
  rocket:   { r: 4, bounce: 0,    friction: 0,    windF: 1,    impact: true, R: 50, dmg: 50 },
  bee:      { r: 4, bounce: 0,    friction: 0,    windF: 0.3,  impact: true, R: 42, dmg: 45 },
  melon:    { r: 6, bounce: 0.45, friction: 0.15, windF: 0,    fuse: true,   R: 38, dmg: 30 },
  frag:     { r: 3, bounce: 0,    friction: 0,    windF: 0.4,  impact: true, R: 26, dmg: 22 },
  egg:      { r: 4, bounce: 0,    friction: 0,    windF: 0.5,  impact: true, R: 34, dmg: 26 },
  dynamite: { r: 4, bounce: 0.15, friction: 0.5,  windF: 0,    fuse: true,   R: 78, dmg: 75 },
  sticky:   { r: 4, bounce: 0,    friction: 0,    windF: 0,    sticky: true, R: 46, dmg: 45 },
  skunk:    { r: 5, bounce: 0.4,  friction: 0.2,  windF: 0,    fuse: true,   R: 20, dmg: 10 },
  acorn:    { r: 8, bounce: 0.5,  friction: 0.1,  windF: 0,    fuse: true,   R: 95, dmg: 90 },
  bowling:  { r: 7, bounce: 0.12, friction: 0.01, windF: 0,    fuse: true,   R: 30, dmg: 20, roll: true },
  boomerang:{ r: 5, bounce: 0,    friction: 0,    windF: 0,    impact: true, R: 36, dmg: 32, curve: true },
  shell:    { r: 3, bounce: 0,    friction: 0,    windF: 0.3,  impact: true, R: 30, dmg: 22 },
  meteor:   { r: 5, bounce: 0,    friction: 0,    windF: 0,    impact: true, R: 40, dmg: 34 },
  vortex:   { r: 6, bounce: 0.3,  friction: 0.3,  windF: 0,    fuse: true,   R: 30, dmg: 18 },
  frog:     { r: 6, bounce: 0.2,  friction: 0.5,  windF: 0,    R: 42, dmg: 40, hop: true },
  seed:     { r: 3, bounce: 0.35, friction: 0.4,  windF: 0.1,  R: 0,  dmg: 0,  plant: true },
  // --- the newer arsenal. nanas/shards/stars: fragments spawned on burst; fire/gas: lava blobs / stink puffs on burst;
  //     remote: fire again to detonate; multi: extra bangs before the last one; maxAge: burst after N s regardless
  banana:   { r: 6, bounce: 0.5,  friction: 0.15, windF: 0,    fuse: true,   R: 40, dmg: 35, nanas: 5 },
  nana:     { r: 4, bounce: 0.55, friction: 0.1,  windF: 0,    fuse: true,   R: 44, dmg: 40 },
  superbanana: { r: 7, bounce: 0.5, friction: 0.15, windF: 0,              R: 55, dmg: 55, nanas: 6, remote: true, maxAge: 10 },
  holy:     { r: 7, bounce: 0.05, friction: 0.9,  windF: 0,    fuse: true,   R: 100, dmg: 100 },
  glaunch:  { r: 4, bounce: 0.45, friction: 0.2,  windF: 0,    fuse: true,   R: 46, dmg: 44, fuseT: 2 },
  molotov:  { r: 5, bounce: 0,    friction: 0,    windF: 0.05, impact: true, R: 22, dmg: 16, fire: 10 },
  gascan:   { r: 5, bounce: 0.3,  friction: 0.3,  windF: 0,    fuse: true,   R: 18, dmg: 8,  gas: 18, fuseT: 2 },
  waterballoon: { r: 7, bounce: 0, friction: 0,   windF: 0.1,  impact: true, R: 0,  dmg: 0,  splash: true },
  teapot:   { r: 8, bounce: 0.1,  friction: 0.6,  windF: 0,    fuse: true,   R: 58, dmg: 55, shards: 7 },
  shard:    { r: 3, bounce: 0,    friction: 0,    windF: 0.2,  impact: true, R: 24, dmg: 20 },
  battery:  { r: 4, bounce: 0.5,  friction: 0.2,  windF: 0,    fuse: true,   R: 24, dmg: 16, multi: 2, fuseT: 2 },
  starburst:{ r: 5, bounce: 0,    friction: 0,    windF: 0.1,  fuse: true,   R: 20, dmg: 12, stars: 6, fuseT: 1.1 },
  star:     { r: 3, bounce: 0,    friction: 0,    windF: 0.3,  impact: true, R: 28, dmg: 24 },
  fridge:   { r: 10, bounce: 0.15, friction: 0.05, windF: 0,   fuse: true,   R: 40, dmg: 30, roll: true, heavy: true, fuseT: 7 },
  molebomb: { r: 5, bounce: 0,    friction: 0,    windF: 0,    impact: true, R: 50, dmg: 50, mole: true },
  arrow:    { r: 3, bounce: 0,    friction: 0,    windF: 0.15, impact: true, R: 0,  dmg: 15, arrow: true },
  parrow:   { r: 3, bounce: 0,    friction: 0,    windF: 0.15, impact: true, R: 0,  dmg: 10, arrow: true, poison: 3 },
  magic:    { r: 4, bounce: 0,    friction: 0,    windF: 0,    impact: true, R: 40, dmg: 50, grav: 0, ghost: true, home: true, maxAge: 6 },
  fireball: { r: 6, bounce: 0,    friction: 0,    windF: 0,    impact: true, R: 16, dmg: 30, grav: 0, maxAge: 0.4, knockMul: 3 },
  comet:    { r: 9, bounce: 0,    friction: 0,    windF: 0,    impact: true, R: 80, dmg: 70, fire: 8 },
  rug:      { r: 5, bounce: 0.6,  friction: 0.1,  windF: 0,    fuse: true,   R: 40, dmg: 36, fuseT: 2.5 },
  c4:       { r: 5, bounce: 0.1,  friction: 0.6,  windF: 0,                  R: 72, dmg: 70, remote: true, maxAge: 15 },
};
PROJ.launcher = PROJ.glaunch;   // the AI simulates by weapon id
PROJ.mortar = PROJ.shell;   // lets the AI simulate a mortar shot
class Proj extends Body {
  constructor(type, x, y, vx, vy, o = {}) {
    super(x, y, PROJ[type].r);
    Object.assign(this, PROJ[type], { type, vx, vy, age: 0, important: type !== 'frag', owner: o.owner, fuseT: o.fuse ?? (PROJ[type].fuseT ?? (type === 'dynamite' ? 5 : type === 'acorn' ? 4 : type === 'bowling' ? 6 : type === 'vortex' ? 1.5 : 3)),
      hitSet: null, home: !!(o.home || PROJ[type].home), life: 25, dig: null,
      target: o.target, stuck: false, armT: 2, trigT: -1, spin: 0 });
  }
  busy() { return !(this.type === 'sticky' && this.stuck && this.armT <= 0 && this.trigT < 0) && !(this.arrow && this.stuck); }
  update(dt) {
    this.age += dt;
    const t = this.type;
    if (this.arrow && this.stuck) { if ((this.life -= dt) <= 0 || !circleHits(this.x, this.y, this.r + 2)) this.dead = true; return; }
    if (this.dig) return this.digLogic(dt);
    if (t === 'bee' || this.home) this.steer(dt);
    if (this.curve) this.curveBack(dt);
    localFx(this);
    if (this.stuck) { // sticky mine glued to the terrain
      this.important = false;
      if (!circleHits(this.x, this.y, this.r + 2)) this.stuck = false;
      else if ((this.armT -= dt) <= 0) {
        if (this.trigT < 0) { for (const c of g.critters) if (c.alive && Math.hypot(c.x - this.x, c.y - this.y) < 38) { this.trigT = 1; break; } }
        else { if ((this.trigT * 8 | 0) !== ((this.trigT + dt) * 8 | 0)) Sfx.beep(); if ((this.trigT -= dt) <= 0) return this.boom(); }
      }
      return this.checkBounds();
    }
    if (this.ghost) { this.x += this.vx * dt; this.y += this.vy * dt; this.hit = null; }   // Magic Acorn: terrain is no obstacle
    else if (this.rest) { if (!circleHits(this.x, this.y + 1.5, this.r)) this.rest = false; }
    else { if (circleHits(this.x, this.y, this.r) && !this.impact) pushOut(this); moveBody(this, dt); }
    if (this.hit) {
      if (this.mole) { const sp = Math.hypot(this.vx, this.vy) || 1; this.dig = { dx: this.vx / sp, dy: this.vy / sp, trav: 0, acc: 0 }; this.vx = this.vy = 0; Sfx.drill(); return; }
      if (this.arrow) { this.stuck = true; this.vx = this.vy = 0; this.important = false; Sfx.clack(); return; }
      if (this.impact) return this.boom();
      if (this.sticky) { this.stuck = true; this.vx = this.vy = 0; Sfx.tone(300, 0.08, 'square', 0.1, 140); }
      else { if (this.hit.speed > 90) Sfx.clack(); if (this.hit.ny < -0.5 && Math.hypot(this.vx, this.vy) < 30) { this.rest = true; this.vx = this.vy = 0; settle(this); } }
    }
    if (this.impact && (this.age > 0.05 || this.arrow)) for (const c of g.critters)
      if (c.alive && (c !== this.owner || this.age > 0.3) && (c.x - this.x) ** 2 + (c.y - this.y) ** 2 < (c.r + this.r) ** 2) {
        if (this.curve && c === this.owner) { this.dead = true; addText(c.x, c.y - 30, 'Caught!', '#fff', 16, 1); Sfx.clack(); return; }   // boomerang comes home
        return this.boom(c);
      }
    if (this.roll) { // bowling ball: bowls over anyone it touches, keeps rolling
      const sp = Math.hypot(this.vx, this.vy);
      if (sp > 40) for (const c of g.critters) if (c.alive && c !== this.owner && !(this.hitSet && this.hitSet.has(c)) && (c.x - this.x) ** 2 + (c.y - this.y) ** 2 < (c.r + this.r + 2) ** 2) {
        (this.hitSet ||= new Set()).add(c); hurt(c, this.heavy ? Math.round(30 + Math.min(30, sp / 15)) : Math.round(14 + Math.min(16, sp / 25))); c.vx += Math.sign(this.vx || 1) * (this.heavy ? 340 : 280); c.vy -= 200; c.knocked(); this.vx *= 0.75; Sfx.thud();
      }
      if (this.rest && this.fuseT > 1) this.fuseT = 1;   // stopped: pop soon
    }
    if (this.hop) { this.hopLogic(dt); if (this.dead) return; }
    if (this.plant && this.rest) { this.dead = true; const m = spawn(new Mine(this.x, this.y - 2, false)); m.rest = true; Sfx.tick(); addText(this.x, this.y - 14, 'armed', '#ff6b6b', 11, 0.8); return; }
    if (this.fuse && (this.fuseT -= dt) <= 0) return this.boom();
    if (this.maxAge && this.age > this.maxAge) return this.boom();
    this.spin += this.vx * dt * 0.06;
    this.checkBounds();
  }
  // Mole Bomb: burrow on along the direction it hit the ground, then burst (or pop out the other side and keep flying)
  digLogic(dt) {
    const D = this.dig, step = 170 * dt; this.x += D.dx * step; this.y += D.dy * step; D.trav += step; D.acc += step;
    if (D.acc >= 5) { D.acc = 0; Terrain.carve(this.x, this.y, 9, false); }
    if (Math.random() < 0.5) P({ kind: 'dirt', x: this.x, y: this.y, vx: rand(-100, 100) - D.dx * 60, vy: rand(-150, -20), g: 650, drag: 1, size: rand(1.5, 3), col: pick(Terrain.theme.dirt), life: 0.7 });
    Sfx.drill();
    for (const c of g.critters) if (c.alive && c !== this.owner && !(this.hitSet && this.hitSet.has(c)) && Math.hypot(c.x - this.x, c.y - this.y) < c.r + 8) { (this.hitSet ||= new Set()).add(c); hurt(c, 10); c.vx += D.dx * 120; c.vy -= 100; c.knocked(); }
    if (D.trav > 120 || this.y > g.waterY || this.x < 0 || this.x > CFG.W) return this.boom();
    if (D.trav > 20 && !Terrain.solid(this.x + D.dx * 10, this.y + D.dy * 10) && !Terrain.solid(this.x, this.y)) { this.dig = null; this.vx = D.dx * 140; this.vy = D.dy * 140; }
  }
  trail() {
    const t = this.type;
    if (t === 'rocket' && Math.random() < 0.9) P({ kind: 'smoke', x: this.x, y: this.y, vx: rand(-10, 10), vy: rand(-20, 0), g: -10, drag: 0.97, size: rand(3, 5), life: 0.8 });
    if ((t === 'dynamite' || t === 'bomb' || t === 'acorn') && Math.random() < 0.5) P({ kind: 'spark', x: this.x, y: this.y - (t === 'acorn' ? 10 : 5), vx: rand(-40, 40), vy: rand(-90, -20), g: 200, drag: 0.95, size: 1.5, life: 0.3 });
    if (t === 'skunk' && Math.random() < 0.3) P({ kind: 'smoke', x: this.x, y: this.y - 4, vx: rand(-10, 10), vy: -25, g: 0, drag: 0.97, size: rand(2, 4), life: 0.6, col: '#8ac926' });
    if (t === 'meteor') P({ kind: 'fire', x: this.x + rand(-3, 3), y: this.y - 4, vx: -this.vx * 0.1, vy: -this.vy * 0.1, g: 0, drag: 0.9, size: rand(4, 7), life: 0.3 });
    if (t === 'vortex' && Math.random() < 0.5) P({ kind: 'spark', x: this.x, y: this.y, vx: rand(-60, 60), vy: rand(-60, 60), g: 0, drag: 0.9, size: 1.5, life: 0.3, col: '#c77dff' });
    if (t === 'bowling' && this.rest === false && Math.random() < 0.4) dustFx(this.x, this.y + 6, 1);
    if ((t === 'holy' || t === 'magic') && Math.random() < 0.5) P({ kind: 'spark', x: this.x + rand(-6, 6), y: this.y + rand(-6, 6), vx: rand(-20, 20), vy: rand(-40, 0), g: 0, drag: 0.95, size: 2, life: 0.5, col: t === 'holy' ? '#ffe066' : '#c77dff' });
    if ((t === 'comet' || t === 'star' || t === 'fireball') && Math.random() < 0.9) P({ kind: 'fire', x: this.x + rand(-3, 3), y: this.y, vx: -this.vx * 0.1, vy: -this.vy * 0.1, g: 0, drag: 0.9, size: t === 'comet' ? rand(6, 11) : rand(3, 6), life: 0.3 });
    if (t === 'starburst' && Math.random() < 0.8) P({ kind: 'spark', x: this.x, y: this.y, vx: -this.vx * 0.2 + rand(-30, 30), vy: -this.vy * 0.2, g: 100, drag: 0.95, size: 2, life: 0.4, col: pick(['#ffd23f', '#ff7b39', '#fff']) });
    if ((t === 'molotov' || t === 'gascan') && Math.random() < 0.3) P({ kind: 'smoke', x: this.x, y: this.y - 4, vx: rand(-10, 10), vy: -20, g: 0, drag: 0.97, size: rand(2, 4), life: 0.5, col: t === 'gascan' ? '#8ac926' : '#f55' });
    if (t === 'c4' && (g.time * 4 | 0) % 2 && Math.random() < 0.5) P({ kind: 'spark', x: this.x + rand(-4, 4), y: this.y - 4, vx: rand(-30, 30), vy: rand(-60, -20), g: 150, drag: 0.95, size: 1.5, life: 0.3, col: '#ff2' });
  }
  hopLogic(dt) {   // Hopper Frog: sits, then springs toward the nearest enemy; bursts on touch or after four hops
    if (this.age > 9) return this.boom();
    for (const c of g.critters) if (c.alive && c !== this.owner && (c.x - this.x) ** 2 + (c.y - this.y) ** 2 < (c.r + this.r + 2) ** 2) return this.boom();
    if (!this.rest) return;
    this.hopT = (this.hopT || 0) + dt; if (this.hopT < 0.55) return;
    this.hopT = 0; this.hops = (this.hops || 0) + 1;
    if (this.hops > 4) return this.boom();
    let near = null, nd = 1e9;
    for (const c of g.critters) if (c.alive && c !== this.owner) { const d = Math.hypot(c.x - this.x, c.y - this.y); if (d < nd) { nd = d; near = c; } }
    const dir = near ? (Math.sign(near.x - this.x) || 1) : pick([-1, 1]);
    this.rest = false; this.vx = dir * clamp(nd * 1.2, 90, 190); this.vy = near && near.y < this.y - 30 ? -360 : -280; this.y -= 1;
    Sfx.boing(); dustFx(this.x, this.y + this.r, 3);
  }
  curveBack(dt) {   // boomerang: after a short flight it homes back on its thrower
    const o = this.owner; if (!o || this.age < 0.45) return;
    this.grav = 0.15; const dx = o.x - this.x, dy = o.y - 4 - this.y, d = Math.hypot(dx, dy) || 1;
    // steer the velocity onto the line home, slowing down as it gets close so it doesn't orbit
    const sp = clamp(d * 3.5, 220, 520), k = Math.min(1, (this.age < 1.2 ? 2.2 : 5) * dt);
    this.vx += (dx / d * sp - this.vx) * k; this.vy += (dy / d * sp - this.vy) * k;
    if (this.age > 6) this.grav = 1;
    Sfx.swoosh();
  }
  steer(dt) {
    if (this.type === 'bee' && Sfx.ok()) Sfx.buzz();
    if (this.age < (this.ghost ? 0.1 : 0.35) || !this.target) return;
    if (this.age > 5.5 && !this.ghost) { this.grav = 1; return; }   // bee gets tired and drops
    if (this.target.alive === false) { this.target = null; return; }
    this.grav = this.ghost ? 0 : 0.12;
    const dx = this.target.x - this.x, dy = this.target.y - this.y, d = Math.hypot(dx, dy) || 1, sp = this.ghost ? Math.min(260, 80 + d * 2) : 430;
    const k = Math.min(1, (this.ghost ? 9 : 3.2) * dt); this.vx += (dx / d * sp - this.vx) * k; this.vy += (dy / d * sp - this.vy) * k;
  }
  boom(victim) {
    if (this.arrow) {   // arrows do not explode: a direct hit hurts, a miss sticks
      this.dead = true; if (!victim) return;
      hurt(victim, this.dmg); victim.vx += this.vx * 0.25; victim.vy += this.vy * 0.25 - 60; victim.knocked();
      if (this.poison) poisonCritter(victim, this.poison);
      for (let k = 0; k < 8; k++) P({ kind: 'spark', x: this.x, y: this.y, vx: rand(-120, 120), vy: rand(-120, 40), g: 300, drag: 0.95, size: 2, life: 0.3 });
      return;
    }
    if (this.multi > 0) {   // Dodgy Battery: bang, hop somewhere else, bang again…
      this.multi--; explode(this.x, this.y, this.R, this.dmg, { ignore: this });
      this.rest = false; this.vx = rand(-150, 150); this.vy = -rand(180, 280); this.fuseT = rand(0.45, 0.9); this.y -= 3; this.stuck = false; return;
    }
    this.dead = true;
    if (this.type === 'vortex') { spawn(new Vortex(this.x, this.y)); return; }
    if (this.splash) {   // Water Balloon: a big wet shove that puts fires out
      splashFx(this.x, this.y, 1.6); Sfx.splash(); douse(this.x, this.y, 90);
      explode(this.x, this.y, 70, 0, { noCarve: true, knock: 1.5 }); return;
    }
    if (this.type === 'holy') { Sfx.choir(); P({ kind: 'flash', x: this.x, y: this.y, r: 220, life: 0.35 }); }
    explode(this.x, this.y, this.R, this.dmg, this.knockMul ? { knock: this.knockMul, carveMul: 0.4 } : undefined);
    if (this.nanas) for (let i = 0; i < this.nanas; i++) {
      const a = -Math.PI / 2 + (i - (this.nanas - 1) / 2) * 0.32 + rand(-0.12, 0.12), sp = rand(200, 330);
      spawn(new Proj('nana', this.x, this.y - 6, Math.cos(a) * sp, Math.sin(a) * sp, { owner: this.owner, fuse: rand(1.3, 2.4) }));
    }
    if (this.shards) for (let i = 0; i < this.shards; i++) {
      const a = -Math.PI / 2 + (i - (this.shards - 1) / 2) * 0.3 + rand(-0.08, 0.08), sp = rand(260, 380);
      spawn(new Proj('shard', this.x, this.y - 6, Math.cos(a) * sp, Math.sin(a) * sp, { owner: this.owner }));
    }
    if (this.stars) for (let i = 0; i < this.stars; i++) {
      const a = -Math.PI / 2 + (i - (this.stars - 1) / 2) * 0.42, sp = rand(200, 300);
      spawn(new Proj('star', this.x, this.y, Math.cos(a) * sp, Math.sin(a) * sp, { owner: this.owner }));
    }
    if (this.fire) for (let i = 0; i < this.fire; i++) { const a = -Math.PI / 2 + rand(-1.1, 1.1), sp = rand(80, 260); spawn(new Lava(this.x, this.y - 4, Math.cos(a) * sp, Math.sin(a) * sp)); }
    if (this.gas) { Sfx.hiss(); for (let i = 0; i < this.gas; i++) { const a = rand(0, 6.28), sp = rand(20, 100); spawn(new GasPuff(this.x + Math.cos(a) * 6, this.y - 6 + Math.sin(a) * 6, Math.cos(a) * sp, Math.sin(a) * sp - 30)); } }
    if (this.type === 'melon') for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.38 + rand(-0.1, 0.1), s = rand(230, 330);
      spawn(new Proj('frag', this.x, this.y - 6, Math.cos(a) * s, Math.sin(a) * s));
    }
    if (this.type === 'skunk') { Sfx.hiss(); for (let i = 0; i < 14; i++) { const a = rand(0, 6.28), sp = rand(20, 90); spawn(new GasPuff(this.x + Math.cos(a) * 6, this.y - 6 + Math.sin(a) * 6, Math.cos(a) * sp, Math.sin(a) * sp - 30)); } }
  }
  checkBounds() {
    if (this.y > g.waterY) { splashFx(this.x, g.waterY, 0.5); Sfx.splash(); this.dead = true; }
    else if (this.x < -150 || this.x > CFG.W + 150 || this.y > CFG.H + 200) this.dead = true;
  }
  onBlast(f, nx, ny) { if (this.stuck) { if (f < 0.3) return; this.stuck = false; } if (!this.impact) this.push(f, nx, ny, 420); }
}

class Lava extends Body {
  constructor(x, y, vx, vy) { super(x, y, 3); Object.assign(this, { vx, vy, windF: 0.15, bounce: 0, friction: 0.6, life: 2.8, stuck: false, melts: 0, meltT: 0.35, age: 0 }); }
  busy() { return true; }
  update(dt) {
    this.age += dt;
    if (!this.stuck) { moveBody(this, dt); if (this.hit) { this.stuck = true; this.vx = this.vy = 0; } }
    else {
      this.life -= dt;
      if ((this.meltT -= dt) <= 0 && this.melts < 4) { this.meltT = 0.4; this.melts++; Terrain.carve(this.x, this.y + 2, 5, true); this.stuck = false; Sfx.sizzle(); }
      else if (!circleHits(this.x, this.y + 2, this.r + 1)) this.stuck = false;
    }
    localFx(this);
    for (const c of g.critters) if (c.alive && Math.hypot(c.x - this.x, c.y - this.y) < c.r + 5) {
      // damage over time: ~9 HP/s per blob touching you
      c.pending += 9 * dt; c.hurtT = 0.3; c.face = 3; c.faceT = 0.5;
      if (c.burnQuipT <= 0) { c.speak(pick(QUIPS.burn)); c.burnQuipT = 2.5; }
      if (c === g.active && g.state === 'turn' && g.controlling) endControl();
    }
    if (this.life <= 0 || this.age > 9) this.dead = true;
    if (this.y > g.waterY) { this.dead = true; Sfx.sizzle(); for (let i = 0; i < 4; i++) P({ kind: 'smoke', x: this.x, y: g.waterY, vx: rand(-20, 20), vy: -60, g: 0, drag: 0.95, size: 4, life: 0.8, col: '#ddd' }); }
    if (this.x < -50 || this.x > CFG.W + 50) this.dead = true;
  }
}

// Stink cloud puff: drifts on the wind, hugs the ground, poisons critters inside it (~7 HP/s, capped per critter)
class GasPuff extends Body {
  constructor(x, y, vx, vy) { super(x, y, 9); Object.assign(this, { vx, vy, life: 5.5, age: 0, ph: rand(0, 6.28), r0: rand(9, 14) }); }
  busy() { return true; }
  update(dt) {
    this.age += dt; this.life -= dt;
    this.vx += g.wind * CFG.WIND_ACC * 1.1 * dt + Math.sin(this.age * 3 + this.ph) * 25 * dt; this.vy += (-12 - this.vy) * 0.6 * dt; this.vx *= 0.985;
    const nx = this.x + this.vx * dt, ny = this.y + this.vy * dt;
    if (!Terrain.solid(nx, ny)) { this.x = nx; this.y = ny; } else { this.vx *= -0.3; this.vy = -14; }
    this.r = this.r0 * (1 + Math.min(1, this.age / 1.5)) * (this.life < 1 ? Math.max(0.2, this.life) : 1);
    for (const c of g.critters) if (c.alive && c.gasT !== g.time && Math.hypot(c.x - this.x, c.y - this.y) < c.r + this.r * 0.8) {
      c.gasT = g.time; c.pending += 7 * dt; c.hurtT = 0.3; c.face = 4; c.faceT = 0.6; if (c.poison < 2) poisonCritter(c, 2, true);
      if (c.burnQuipT <= 0) { c.speak(pick(QUIPS.gas)); c.burnQuipT = 2.5; }
      if (c === g.active && g.state === 'turn' && g.controlling) endControl();
    }
    if (this.life <= 0 || this.y > g.waterY || this.x < -80 || this.x > CFG.W + 80) this.dead = true;
  }
}
// Thundercloud: parks above the clicked spot and throws three lightning bolts at whatever is below
class Cloud {
  constructor(x) { Object.assign(this, { x, y: 130, r: 0, t: 0, bolts: 0, nextT: 1.2, dead: false, important: true }); Sfx.rumble(); }
  busy() { return true; }
  update(dt) {
    this.t += dt; this.x += g.wind * 12 * dt;
    if (this.t >= this.nextT && this.bolts < 3) { this.bolts++; this.nextT = this.t + 0.55; this.strike(); }
    if (this.bolts >= 3 && this.t > this.nextT + 1.1) this.dead = true;
  }
  strike() {
    const bx = this.x + rand(-45, 45); let y = this.y + 20;
    while (y < g.waterY && !Terrain.solid(bx, y)) {   // ray straight down until ground or a critter
      let hitC = false; for (const c of g.critters) if (c.alive && Math.abs(c.x - bx) < c.r + 3 && Math.abs(c.y - y) < c.r + 3) { hitC = true; break; }
      if (hitC) break; y += 3;
    }
    const pts = [], n = 8; for (let i = 0; i <= n; i++) { const k = i / n; pts.push([Math.round(lerp(this.x, bx, k) + (i && i < n ? rand(-18, 18) : 0)), Math.round(lerp(this.y + 10, y, k))]); }
    P({ kind: 'bolt', pts, x: bx, y, life: 0.3 }); P({ kind: 'flash', x: bx, y, r: 40, life: 0.15 });
    Sfx.thunder(); shake(8);
    explode(bx, y, 34, 34, { carveMul: 0.6 });
  }
}
// Mole drill: a boring head that eats a tunnel along the aim direction
class Drill {
  constructor(c, dx, dy) { Object.assign(this, { x: c.x + dx * (c.r + 2), y: c.y + dy * (c.r + 2), dx, dy, trav: 0, acc: 0, dead: false, important: true, owner: c, hitSet: new Set() }); }
  busy() { return true; }
  update(dt) {
    const step = 230 * dt; this.x += this.dx * step; this.y += this.dy * step; this.trav += step; this.acc += step;
    if (this.acc >= 5) { this.acc = 0; Terrain.carve(this.x, this.y, 13, false); }
    if (Math.random() < 0.6) P({ kind: 'dirt', x: this.x, y: this.y, vx: rand(-120, 120) - this.dx * 80, vy: rand(-160, -20), g: 650, drag: 1, size: rand(1.5, 3.5), col: pick(Terrain.theme.dirt), life: 0.8 });
    Sfx.drill();
    for (const c of g.critters) if (c.alive && c !== this.owner && !this.hitSet.has(c) && Math.hypot(c.x - this.x, c.y - this.y) < c.r + 10) { this.hitSet.add(c); hurt(c, 12); c.vx += this.dx * 160; c.vy -= 120; c.knocked(); }
    if (this.trav > 170 || this.x < 0 || this.x > CFG.W || this.y > g.waterY) this.dead = true;
  }
}

// Gravity Acorn: a small black hole that drags critters and objects toward it, then pops
class Vortex {
  constructor(x, y) { Object.assign(this, { x, y, r: 10, t: 0, life: 3.2, dead: false, important: true, grabbed: new Set() }); }
  busy() { return true; }
  update(dt) {
    this.t += dt; this.life -= dt; Sfx.hum(); if (Math.random() < 0.3) shake(1.5);
    for (const e of g.ents) {
      if (e.dead || e === this || e instanceof Lava || e instanceof GasPuff || e instanceof Rope || e.x === undefined) continue;
      const dx = this.x - e.x, dy = this.y - e.y, d = Math.hypot(dx, dy); if (d > 190 || d < 2) continue;
      const f = (1 - d / 190) * 820 * dt;
      if (e instanceof Critter) { if (!e.alive) continue; e.vx += dx / d * f; e.vy += dy / d * f - 60 * dt; if (!this.grabbed.has(e)) { this.grabbed.add(e); e.knocked(); if (e === g.active && g.state === 'turn' && g.controlling) endControl(); } if (e.mode === 'ground') { e.mode = 'air'; e.fallDmg = false; } }
      else if (e.vx !== undefined) { e.vx += dx / d * f * 0.6; e.vy += dy / d * f * 0.6 - 40 * dt; e.rest = false; }
    }
    if (Math.random() < 0.7) { const a = rand(0, 6.28), rr0 = rand(40, 120); P({ kind: 'spark', x: this.x + Math.cos(a) * rr0, y: this.y + Math.sin(a) * rr0, vx: -Math.cos(a) * 160, vy: -Math.sin(a) * 160, g: 0, drag: 0.98, size: 2, life: 0.6, col: pick(['#c77dff', '#9d4edd', '#fff']) }); }
    if (this.life <= 0) { this.dead = true; explode(this.x, this.y, 30, 18); }
  }
}
// Star Shower: meteors rain down around the clicked spot for a couple of seconds
class Shower {
  constructor(x) { Object.assign(this, { x, y: -20, t: 0, n: 0, dead: false, important: true }); Sfx.rumble(); }
  busy() { return true; }
  update(dt) {
    this.t += dt;
    if (this.n < 7 && this.t > 0.5 + this.n * 0.28) { this.n++; const mx = this.x + rand(-230, 230); spawn(new Proj('meteor', mx, -30, rand(-50, 50), rand(280, 380))); Sfx.whoosh(); }
    if (this.n >= 7 && this.t > 5) this.dead = true;
  }
}
// Party Balloon: tied to a critter, carries it up and sideways, pops after a few seconds (or when shot)
class Balloon {
  constructor(c) {
    Object.assign(this, { c, cId: c.id, x: c.x, y: c.y - 30, r: 11, t: 0, popT: 4.2, dead: false, important: true });
    c.release(); c.balloon = this; c.mode = 'float'; c.tumble = false; c.spin = 0; c.vy = Math.min(c.vy, 0);
  }
  busy() { return true; }
  update(dt) {
    const c = this.c; if (!c || !c.alive || c.mode !== 'float') return this.pop(false);
    this.t += dt; this.x = c.x + Math.sin(this.t * 3) * 3; this.y = c.y - 30;
    if ((this.popT -= dt) <= 0) this.pop(true);
  }
  pop(loud) {
    if (this.dead) return; this.dead = true; if (this.c && this.c.balloon === this) this.c.balloon = null;
    if (loud) { Sfx.clack(); addText(this.x, this.y - 10, 'POP!', '#ff7aa2', 16, 0.8); for (let i = 0; i < 12; i++) P({ kind: 'spark', x: this.x, y: this.y, vx: rand(-160, 160), vy: rand(-160, 160), g: 200, drag: 0.95, size: 2.5, life: 0.5, col: '#ff7aa2' }); }
  }
  onBlast(f) { if (f > 0.15) this.pop(true); }
}
// Earthquake: three seconds of shaking; everyone is bounced, loose objects roll, the surface crumbles
class Quake {
  constructor(owner) { Object.assign(this, { x: CFG.W / 2, y: 0, owner, t: 0, pulse: 0, dead: false }); Sfx.rumble(); }
  busy() { return true; }
  update(dt) {
    this.t += dt; shake(7);
    if (this.t > this.pulse * 0.2) {
      this.pulse++;
      for (const c of g.critters) if (c.alive && c.mode === 'ground' && c.frozen <= 0) { c.vx += rand(-70, 70); c.vy = -rand(60, 150); c.mode = 'air'; c.fallDmg = false; c.squash = 0.2; }
      for (const e of g.ents) if (e !== this && !e.dead && !(e instanceof Critter) && e.rest !== undefined && e.vx !== undefined) { e.rest = false; e.vx += rand(-60, 60); e.vy -= rand(30, 90); }
      if (this.pulse % 5 === 0) for (const c of g.critters) if (c.alive && c !== this.owner) hurt(c, 3);
      for (let k = 0; k < 2; k++) { const x = rand(40, CFG.W - 40); let y = Terrain.cavern ? 40 : 0; while (y < g.waterY && !Terrain.solid(x, y)) y += 4; if (y < g.waterY) { Terrain.carve(x, y + 3, rand(5, 9)); dustFx(x, y, 3); } }
      if (this.pulse % 3 === 0) Sfx.rumble();
    }
    if (this.t > 3) this.dead = true;
  }
}
// Acorn Mortar: fires a three-shell burst along the same arc
class Burst {
  constructor(c, vx, vy) { Object.assign(this, { c, x: c.x, y: c.y, vx, vy, n: 0, t: 0, dead: false }); }
  busy() { return true; }
  update(dt) {
    this.t += dt;
    if (this.t >= this.n * 0.16) {
      const d = aimVec(this.c), sx = this.c.x + d.x * (this.c.r + 5), sy = this.c.y + d.y * (this.c.r + 5), k = 1 + rand(-0.04, 0.04);
      const p = spawn(new Proj('shell', sx, sy, this.vx * k, this.vy * k, { owner: this.c })); if (!this.n) g.focus = p;
      Sfx.mortar(); P({ kind: 'flash', x: sx, y: sy, r: 10, life: 0.1 });
      if (++this.n >= 3) this.dead = true;
    }
  }
}

Lava.prototype.trail = function () { if (Math.random() < 0.12) P({ kind: 'smoke', x: this.x, y: this.y - 3, vx: rand(-8, 8), vy: -30, g: 0, drag: 0.97, size: rand(2, 4), life: 0.7, col: '#555' }); };

class Volcano {
  constructor(x, y) { Object.assign(this, { x, y, r: 8, t: 0, emitted: 0, dead: false, important: true }); }
  busy() { return true; }
  update(dt) {
    this.t += dt;
    const want = Math.min(30, Math.floor(this.t / 3 * 30));
    while (this.emitted < want) {
      this.emitted++;
      const a = -Math.PI / 2 + rand(-0.55, 0.55), s = rand(230, 460);
      spawn(new Lava(this.x, this.y - 8, Math.cos(a) * s, Math.sin(a) * s));
    }
    if (this.t < 3) { shake(2); Sfx.rumble(); }
    if (this.t > 3.6) this.dead = true;
  }
}

// Walking critters: the wind-up robot and its animal cousins. charge: burst on touching an enemy;
// ram: shove + hurt on touch and keep going; flip: bounce straight off walls; plow: dig through them; hoppy: random hops
const ANIMALS = {
  robot:  { speed: 60,  t: 8,   R: 56, dmg: 55 },
  cow:    { speed: 95,  t: 6,   R: 48, dmg: 45, charge: true },
  granny: { speed: 28,  t: 5.5, R: 85, dmg: 85, charge: true },
  rhino:  { speed: 130, t: 7,   R: 0,  dmg: 0,  ram: 35, flip: true },
  ferret: { speed: 110, t: 5,   R: 34, dmg: 28, charge: true, hoppy: true },
  boar:   { speed: 70,  t: 10,  R: 0,  dmg: 0,  ram: 40, plow: true },
};
class Robot extends Body {
  constructor(x, y, dir, kind = 'robot') { super(x, y, kind === 'boar' ? 9 : 6); const K = ANIMALS[kind]; Object.assign(this, { kind, dir, t: K.t, mode: 'air', acc: 0, blocked: 0, okRun: 0, important: true, bounce: 0.2, friction: 0.4, legPh: 0, hitSet: null, owner: null, plowAcc: 0 }); }
  busy() { return true; }
  update(dt) {
    const K = ANIMALS[this.kind];
    if ((this.t -= dt) <= 0) return this.boom();
    if (this.kind === 'robot' && (this.t * 4 | 0) !== ((this.t + dt) * 4 | 0)) Sfx.tick();
    if (K.charge || K.ram) for (const c of g.critters) if (c.alive && c !== this.owner && Math.hypot(c.x - this.x, c.y - this.y) < c.r + this.r + 2) {
      if (K.charge) return this.boom();
      if (!(this.hitSet ||= new Set()).has(c)) { this.hitSet.add(c); hurt(c, K.ram); c.vx += this.dir * 330; c.vy -= 200; c.knocked(); Sfx.thud(); shake(4); }
    }
    if (this.mode === 'air') {
      moveBody(this, dt);
      if (this.hit && this.hit.ny < -0.5) { this.mode = 'walk'; this.vx = this.vy = 0; settle(this); }
    } else if (!circleHits(this.x, this.y + 2, this.r)) this.mode = 'air';
    else {
      if (K.plow) { this.plowAcc += K.speed * dt; if (this.plowAcc > 6) { this.plowAcc = 0; Terrain.carve(this.x + this.dir * 12, this.y - 10, 13, false); /* tunnel ahead, floor left intact */ Sfx.drill(); if (Math.random() < 0.7) P({ kind: 'dirt', x: this.x + this.dir * 10, y: this.y, vx: rand(-80, 80) + this.dir * 60, vy: rand(-180, -40), g: 650, drag: 1, size: rand(1.5, 3.5), col: pick(Terrain.theme.dirt), life: 0.8 }); } }
      if (K.hoppy && Math.random() < dt * 1.4) { this.mode = 'air'; this.vy = -230; this.vx = this.dir * 90; this.y -= 1; Sfx.boing(); }
      this.acc += K.speed * dt; this.legPh += dt * 18;
      while (this.acc >= 1) {
        this.acc--;
        const r = walkStep(this, this.dir);
        if (r === 'wall') {
          if (K.plow) { Terrain.carve(this.x + this.dir * 8, this.y - 6, 16, false); this.blocked = 0; }           // the boar simply eats the wall
          else if (K.flip) { this.dir *= -1; Sfx.thud(); dustFx(this.x, this.y + this.r, 3); }                   // the rhino bounces straight off
          else if (++this.blocked >= 3) { if (K.charge) return this.boom(); this.dir *= -1; this.blocked = 0; }   // a charging animal gives up with a bang rather than turning on its owner
          else { this.mode = 'air'; this.vy = -210; this.vx = this.dir * 70; this.y -= 1; }
          this.acc = 0; break;
        }
        if (r === 'fall') { this.mode = 'air'; this.vx = this.dir * K.speed; break; }
        if (++this.okRun > 20) { this.blocked = 0; this.okRun = 0; }
      }
    }
    this.checkBounds();
  }
  boom() {
    this.dead = true; const K = ANIMALS[this.kind];
    if (K.R) explode(this.x, this.y, K.R, K.dmg);
    else { dustFx(this.x, this.y + this.r, 6); addText(this.x, this.y - 14, pick(['tired!', 'phew.', 'done.']), '#fff', 12, 1); }
  }
  onBlast(f, nx, ny) { this.push(f, nx, ny); this.mode = 'air'; }
}

class Anvil {
  constructor(x, kind = 'anvil') { Object.assign(this, { x, kind, y: Terrain.cavern ? 0 : -60, vx: 0, vy: kind === 'buster' ? 420 : 260, r: kind === 'buster' ? 7 : 12, depth: 0, hitSet: new Set(), dead: false, important: true }); Sfx.whoosh(); }
  busy() { return true; }
  update(dt) {
    this.vy += CFG.G * dt;
    const steps = Math.max(1, Math.ceil(this.vy * dt / 3));
    for (let i = 0; i < steps; i++) {
      this.y += this.vy * dt / steps;
      if (circleHits(this.x, this.y, this.r)) { // punch a shaft straight through the ground
        Terrain.carve(this.x, this.y, this.r + 4, false);
        this.depth += this.vy * dt / steps; this.vy = Math.max(240, this.vy * 0.995);
        if (Math.random() < 0.3) P({ kind: 'dirt', x: this.x + rand(-10, 10), y: this.y - 10, vx: rand(-180, 180), vy: rand(-260, -80), g: 650, drag: 1, size: rand(2, 4), col: pick(['#8a5a34', '#6b4426']), life: 1 });
        shake(3); Sfx.drill();
        if (this.depth > (this.kind === 'buster' ? 70 : 230)) return this.boom();
      }
      for (const c of g.critters) if (c.alive && !this.hitSet.has(c) && Math.hypot(c.x - this.x, c.y - this.y) < c.r + this.r) {
        this.hitSet.add(c); hurt(c, this.kind === 'buster' ? 18 : 30); c.vx += (Math.sign(c.x - this.x) || 1) * 320; c.vy = -170; c.knocked(); Sfx.clank();
      }
    }
    if (this.y > g.waterY) { this.dead = true; splashFx(this.x, g.waterY, 2); Sfx.splash(); shake(8); }
  }
  boom() { this.dead = true; if (this.kind === 'buster') explode(this.x, this.y, 55, 55); else explode(this.x, this.y, 72, 65); }
}

// What each air strike drops: [projectile or 'mine'/'crate', count, homing?]
const STRIKES = { pelican: ['egg', 5], napalm: ['molotov', 5], minestrike: ['mine', 5], cratestrike: ['crate', 3], poisonstrike: ['gascan', 4], waterstrike: ['waterballoon', 5],
  frogstrike: ['frog', 3], homingstrike: ['egg', 4, true], molestrike: ['molebomb', 3], carpet: ['rug', 4] };
class Pelican {
  constructor(tx, payload = 'pelican', target = null, owner = null) {
    this.tx = tx; this.payload = payload; this.target = target; this.owner = owner;
    this.dir = Math.random() < 0.5 ? 1 : -1; this.y = 70; this.vx = this.dir * 380; this.drops = 0; this.dead = false; this.important = true; this.flap = 0;
    // lead the drop: eggs inherit some of the bird's speed, so release early by the expected drift
    let sy = 80; while (sy < g.waterY && !Terrain.solid(tx, sy)) sy += 4;
    const tFall = Math.sqrt(2 * Math.max(50, sy - this.y) / CFG.G);
    this.release = tx - this.dir * (Math.abs(this.vx) * 0.35 * tFall + 50);
    this.x = this.release - this.dir * 650;
    Sfx.quack();
  }
  busy() { return true; }
  update(dt) {
    this.x += this.vx * dt; this.flap += dt * 10;
    const [type, n, home] = STRIKES[this.payload] || STRIKES.pelican, gap = n >= 5 ? 25 : 40;
    while (this.drops < n && (this.x - this.release) * this.dir >= this.drops * gap) {
      if (type === 'mine') { const m = spawn(new Mine(this.x, this.y + 12, false)); m.vx = this.vx * 0.35; m.vy = 30; }
      else if (type === 'crate') { const cr = spawn(makeCrate(this.x, this.y + 12)); cr.vx = this.vx * 0.35; }
      else spawn(new Proj(type, this.x, this.y + 12, this.vx * 0.35, 30, { owner: this.owner, target: home ? this.target : undefined, home }));
      this.drops++;
      if (this.drops === 1) Sfx.quack();
    }
    if (this.drops >= n && (this.x - this.release) * this.dir > 900) this.dead = true;
  }
}

class Rope {
  constructor(c, dx, dy) { Object.assign(this, { c, tx: c.x, ty: c.y, dx, dy, state: 'shoot', travel: 0, len: 0, dead: false }); Sfx.whoosh(); }
  busy() { return this.state === 'shoot'; }
  update() {
    const c = this.c;
    if (!c.alive) { this.dead = true; return; }
    if (this.state === 'shoot') {
      for (let i = 0; i < 8; i++) {
        this.tx += this.dx * 3; this.ty += this.dy * 3; this.travel += 3;
        if (Terrain.solid(this.tx, this.ty)) {
          this.state = 'attached'; this.len = Math.max(20, Math.hypot(c.x - this.tx, c.y - this.ty));
          c.mode = 'rope'; c.rope = this; c.tumble = false; c.spin = 0; useAmmo('grapple'); Sfx.clank(); return;
        }
        if (this.travel > 480) { this.dead = true; return; }
      }
    } else if (c.rope !== this || c.mode !== 'rope') this.dead = true;
    else if (!circleHits(this.tx, this.ty, 2)) c.release(); // anchor blown away
  }
}

