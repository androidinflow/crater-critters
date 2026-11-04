// ============================== NETWORK (online 2-player) ==============================
// Two browsers talk through a Supabase Realtime broadcast channel (Phoenix protocol over a
// plain WebSocket, so no client library is needed). The HOST runs the whole simulation.
// The GUEST runs no physics at all: it sends its key/tap input during its own turns and
// renders what the host streams back:
//   • snapshots (~15 Hz): game state, every critter and every entity, positions + velocities
//   • events: terrain edits (carve/girder) and cosmetic calls (explosion fx, particles,
//     sounds, floating text, banners), recorded by wrapping those functions on the host.
// Terrain edits are also kept in a log so a (re)joining guest can rebuild the map from the
// seed + log instead of downloading a 2.9 MB bitmap.
const SUPA = { url: 'https://sup.charsi.cc', key: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc5MzIzMjY2MCwiZXhwIjo0OTQ4OTA2MjYwLCJyb2xlIjoiYW5vbiJ9.QuWZFrs3ejJi2MpjmMo-QxQRijTSLPdw6R5qoAxZ3NM' };
const nr = v => typeof v === 'number' ? Math.round(v * 100) / 100 : v;
function netCopy(v) {
  if (typeof v === 'number') return nr(v);
  if (v && typeof v === 'object') { const o = Array.isArray(v) ? [] : {}; for (const k in v) o[k] = netCopy(v[k]); return o; }
  return v;
}
const Net = {
  role: null, ws: null, code: '', topic: '', ref: 1, joined: false, started: false, accepted: false,
  pid: '', myTeam: 0, peers: {}, remotes: {}, seen: { fp: 0, jp: 0 }, events: [], log: [], mute: 0,
  fp: 0, jp: 0, lastIn: '', inT: 0, snapT: 0, hbT: 0, lastHost: 0, hostLost: false, snapAt: 0, helloT: 0, roster: [],
  // ---- transport ----
  open() {
    const ws = this.ws = new WebSocket(`${SUPA.url.replace(/^http/, 'ws')}/realtime/v1/websocket?apikey=${SUPA.key}&vsn=1.0.0`);
    this.joined = false;
    ws.onopen = () => this.push('phx_join', { config: { broadcast: { self: false, ack: false }, presence: { key: '' } }, access_token: SUPA.key });
    ws.onmessage = e => {
      let m; try { m = JSON.parse(e.data); } catch (err) { return; }
      if (m.topic !== this.topic) return;
      if (m.event === 'phx_reply' && !this.joined) { if (m.payload && m.payload.status === 'ok') { this.joined = true; this.onJoined(); } else UI.netStatus('Could not join the room.'); }
      else if (m.event === 'broadcast' && m.payload) this.onMsg(m.payload.payload || {});
    };
    ws.onclose = () => {
      if (this.ws !== ws || !this.role) return;
      this.joined = false; UI.netStatus('Connection lost – reconnecting…');
      setTimeout(() => { if (this.ws === ws && this.role) this.open(); }, 1500);
    };
  },
  raw(o) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(o)); },
  push(event, payload) { this.raw({ topic: this.topic, event, payload, ref: String(this.ref++) }); },
  send(msg) { if (this.joined) this.push('broadcast', { type: 'broadcast', event: 'm', payload: msg }); },
  begin(code, role) {
    this.leave();
    Object.assign(this, { role, code, topic: 'realtime:crater-critters-' + code, started: false, accepted: false, hostLost: false, lastHost: performance.now(),
      events: [], peers: {}, remotes: {}, seen: { fp: 0, jp: 0 }, fp: 0, jp: 0, lastIn: '', myTeam: role === 'host' ? 0 : -1, roster: [],
      pid: this.pid || Math.random().toString(36).slice(2, 10) });
    // heartbeat on a timer (not the animation loop) so a backgrounded phone tab still counts as present
    this.hbTimer = setInterval(() => { if (this.joined) this.send(this.role === 'host' ? { t: 'hb', host: 1 } : { t: 'hb', pid: this.pid, team: this.myTeam }); }, 2000);
    this.open();
  },
  leave() { clearInterval(this.hbTimer); const ws = this.ws; this.ws = null; this.role = null; this.joined = false; this.started = false; if (ws) try { ws.close(); } catch (e) { } },
  peerOf(team) { for (const k in this.peers) if (this.peers[k].team === team) return this.peers[k]; return null; },
  peerList() { return Object.values(this.peers).sort((a, b) => a.team - b.team); },
  // ---- lobby ----
  host() {
    const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let code = ''; for (let i = 0; i < 5; i++) code += A[Math.random() * A.length | 0];
    this.begin(code, 'host');
    const link = `${location.origin}${location.pathname}?room=${code}`;
    UI.hideAll();
    UI.lobby('Hosting online game', `<p class="center">Send this code to your friends (up to 7 can join):</p><div class="code">${code}</div>
      <p class="center"><button id="copyBtn">Copy invite link</button></p><ul id="roster"></ul>
      <p class="center"><button id="startOnline" class="big" disabled>Start game</button></p><p class="small center" id="netStatus">Connecting…</p>`);
    $('copyBtn').onclick = () => { navigator.clipboard?.writeText(link).then(() => { $('copyBtn').textContent = 'Link copied!'; }, () => prompt('Copy this link:', link)); };
    $('startOnline').onclick = () => { if (this.peerList().length) this.startGame(); };
    this.renderRoster();
  },
  join(code) {
    this.begin(code, 'guest');
    UI.hideAll();
    UI.lobby('Joining game', `<div class="code">${code}</div><ul id="roster"></ul><p class="small center" id="netStatus">Connecting…</p>`);
  },
  onJoined() {
    if (this.role === 'host') UI.netStatus(this.started ? 'Reconnected.' : 'Waiting for friends to join…');
    else { this.accepted = false; UI.netStatus(this.started ? 'Reconnected – syncing…' : 'Looking for the host…'); this.hello(); }
  },
  hello() { const t = settings.teams[0]; this.send({ t: 'hello', pid: this.pid, name: Profile.name().slice(0, 18), color: t.color | 0 }); this.helloT = 0; },
  renderRoster() {
    const ul = $('roster'); if (!ul) return; ul.innerHTML = '';
    const list = this.role === 'host' ? [{ name: Profile.name(), color: settings.teams[0].color, host: true }, ...this.peerList()] : this.roster;
    for (const p of list) { const li = document.createElement('li'); li.textContent = (p.host ? '👑 ' : '') + p.name; li.style.color = TEAM_COLORS[p.color | 0]; if (p.lost) li.className = 'lost'; ul.appendChild(li); }
    const b = $('startOnline'); if (b) { const n = this.peerList().length; b.disabled = !n; b.textContent = n ? `Start game (${n + 1} players)` : 'Start game'; }
  },
  broadcastRoster() {
    this.roster = [{ name: Profile.name(), color: settings.teams[0].color, host: true }, ...this.peerList().map(p => ({ name: p.name, color: p.color, lost: p.lost }))];
    this.send({ t: 'roster', host: 1, list: this.roster, started: this.started });
    this.renderRoster();
  },
  startGame() {              // host: build the match for everyone in the room and hand them the world
    this.started = true;
    const me = settings.teams[0], used = new Set(), teams = [];
    const takeColor = c => { c = c | 0; for (let k = 0; k < TEAM_COLORS.length && used.has(c); k++) c = (c + 1) % TEAM_COLORS.length; used.add(c); return c; };
    teams.push({ name: me.name, color: takeColor(me.color), ai: false });
    for (const p of this.peerList()) teams.push({ name: p.name, color: takeColor(p.color), ai: false });
    UI.hideAll();
    newGame({ teams });
    this.sendInit();
  },
  sendInit(to) {
    const slots = {}; for (const k in this.peers) slots[k] = this.peers[k].team;
    this.send({ t: 'init', host: 1, to, slots, seed: g.seed, map: g.mapStyle, theme: g.theme, scheme: g.schemeName, perTeam: g.perTeam, turnTime: settings.turnTime, sdMinutes: settings.sdMinutes,
      teams: g.teams.map(t => ({ name: t.name, color: t.color })), log: this.log, snap: this.snap() });
  },
  onMsg(m) {
    const now = performance.now();
    if (this.role === 'host') {
      const peer = m.pid ? this.peers[m.pid] : null;
      if (peer) { peer.last = now; if (peer.lost && m.t !== 'bye') { peer.lost = false; banner(`${peer.name} is back!`, '#8ecae6'); this.broadcastRoster(); } }
      switch (m.t) {
        case 'hello':
          if (peer) { if (this.started && g.state !== 'menu') this.sendInit(m.pid); else this.broadcastRoster(); }
          else if (this.started || this.peerList().length >= MAX_TEAMS - 1) this.send({ t: 'full', host: 1, to: m.pid });
          else { this.peers[m.pid] = { pid: m.pid, team: this.peerList().length + 1, name: String(m.name || 'Friend').slice(0, 18), color: m.color | 0, last: now, lost: false };
            UI.netStatus(`${this.peers[m.pid].name} joined!`); Sfx.pickup(); this.broadcastRoster(); }
          break;
        case 'in': if (peer && peer.team === m.team) this.remotes[m.team] = m; break;
        case 'w': if (this.guestControls(m)) selectWeapon(m.id); break;
        case 'fz': if (this.guestControls(m) && m.k >= 1 && m.k <= 5) { g.fuse = m.k; g.active.team.fuse = m.k; banner(`Fuse: ${m.k}s`); } break;
        case 'ck': if (this.guestControls(m)) applyClick(+m.x, +m.y); break;
        case 'rm': if (peer && g.state === 'gameover') this.startGame(); break;
        case 'bye': if (peer) { peer.lost = true; banner(`${peer.name} left the game`, '#8ecae6'); this.broadcastRoster(); } break;
        case 'chat': if (peer) Chat.add(peer.name, TEAM_COLORS[peer.color], String(m.x || '').slice(0, 120), false); break;
      }
    } else {
      if (m.host) { this.lastHost = now; if (this.hostLost) { this.hostLost = false; UI.netStatus('Host is back!'); } }
      switch (m.t) {
        case 'init': if (m.to && m.to !== this.pid) return; if (m.slots[this.pid] === undefined) return; this.accepted = true; this.setupGuest(m); break;
        case 'roster': this.accepted = true; this.roster = m.list || []; this.renderRoster(); if (!this.started) UI.netStatus(`Joined! ${this.roster.length} in the room – waiting for the host to start…`); break;
        case 'full': if (m.to === this.pid) { this.accepted = true; UI.netStatus('That room is full or already playing.'); } break;
        case 's': if (this.started) { applyEvents(m.ev); applySnap(m); } break;
        case 'chat': if (m.host || m.pid !== this.pid) Chat.add(String(m.n || 'Friend').slice(0, 18), m.c, String(m.x || '').slice(0, 120), false); break;
        case 'bye': if (m.host) { this.hostLost = true; UI.netStatus('The host left the game.'); } break;
      }
    }
  },
  guestControls(m) { const peer = this.peers[m.pid]; return !!peer && g.state === 'turn' && g.controlling && g.active && g.active.team.idx === m.team && peer.team === m.team; },
  remoteInput(team) {        // host: turn that player's latest input packet into one tick of input
    const R = this.remotes[team] || {}, peer = this.peerOf(team), inp = blankInput();
    if (peer && !peer.lost) { inp.left = !!R.l; inp.right = !!R.r; inp.up = !!R.u; inp.down = !!R.d; inp.fireHeld = !!R.fh; }
    if ((R.fp | 0) > this.seen.fp) { this.seen.fp++; inp.firePress = true; }
    if ((R.jp | 0) > this.seen.jp) { this.seen.jp++; inp.jumpPress = true; }
    return inp;
  },
  ev(code, args) { if (this.role === 'host' && !this.mute) this.events.push([code, ...netCopy(args)]); },
  // ---- per-frame ----
  update(real) {
    if (!this.role || !this.joined) return;
    const now = performance.now();
    if (this.role === 'host') {
      for (const k in this.peers) { const p = this.peers[k]; if (!p.lost && now - p.last > 12000) { p.lost = true; banner(`${p.name} seems to have disconnected…`, '#8ecae6'); this.broadcastRoster(); } }
      if (this.started && g.state !== 'menu' && ((this.snapT += real) > 1 / 15 || this.events.length > 250)) { this.snapT = 0; const s = this.snap(); s.host = 1; s.ev = this.events; this.events = []; this.send(s); }
    } else {
      if (this.started && !this.hostLost && now - this.lastHost > 12000) { this.hostLost = true; UI.netStatus('Lost contact with the host…'); }
      if (!this.accepted) { if ((this.helloT += real) > 1.5) this.hello(); }
      else if (this.started) this.guestInput(real);
    }
  },
  guestInput(real) {
    const mine = myTurn() && g.controlling, d = Input.down, p = Input.pressed, blocked = UI.blocking() || !mine;
    if (!blocked) {
      if (p.has('Space')) this.fp++;
      if (p.has('Enter') || p.has('NumpadEnter')) this.jp++;
      for (let k = 1; k <= 5; k++) if (p.has('Digit' + k) || p.has('Numpad' + k)) { this.send({ t: 'fz', k, pid: this.pid, team: this.myTeam }); g.fuse = k; }
    }
    const st = blocked ? { l: 0, r: 0, u: 0, d: 0, fh: 0 } : { l: +!!(d.ArrowLeft || d.KeyA), r: +!!(d.ArrowRight || d.KeyD), u: +!!(d.ArrowUp || d.KeyW), d: +!!(d.ArrowDown || d.KeyS), fh: +!!d.Space };
    st.fp = this.fp; st.jp = this.jp; st.t = 'in'; st.pid = this.pid; st.team = this.myTeam;
    const key = JSON.stringify(st);
    if (mine && (key !== this.lastIn || (this.inT += real) > 0.3)) { this.send(st); this.lastIn = key; this.inT = 0; }
    p.clear(); Input.released.clear();
  },
  // ---- snapshots ----
  snap() {
    const t = Net.started ? camTarget() : null;
    return { t: 's', st: g.state, tt: nr(g.turnT), w: nr(g.wind), wp: g.weapon, fu: g.fuse, tg: g.target ? [nr(g.target.x), nr(g.target.y)] : 0,
      ch: g.charging, pw: nr(g.power), rt: g.retreat, fi: g.fired, lw: g.lockWeapon, ct: g.controlling, ga: nr(g.girderAng), sl: g.shotsLeft, rb: !!g.robot,
      a: g.active ? g.active.id : 0, wy: nr(g.waterY), sd: g.sd, tm: nr(g.time), ts: nr(g.turnStartT), sm: nr(g.slowmo), sh: nr(g.shake), win: g.winner ? g.winner.idx : -1,
      cf: t ? [nr(t.x), nr(t.y)] : 0, am: g.teams.map(t => t.ammo), dm: g.teams.map(t => [Math.round(t.dmg), t.kills]), us: g.teams.map(t => t.used),
      c: g.critters.map(c => [c.id, c.team.idx, c.name, ...CRIT_F.map(f => nr(c[f])), c.say ? [c.say.text, nr(c.say.t)] : 0]),
      e: g.ents.filter(e => !(e instanceof Critter) && !e.dead).map(e => { const k = NET_KIND.get(e.constructor); if (!k) return null; if (e instanceof Rope) e.cId = e.c.id;
        return [k.code, e.id, nr(e.x), nr(e.y), nr(e.vx || 0), nr(e.vy || 0), ...k.f.map(f => nr(e[f]))]; }).filter(Boolean) };
  },
  setupGuest(m) {
    UI.hideAll(); this.started = true; this.hostLost = false; this.myTeam = m.slots[this.pid];
    g = makeState(); g.online = true; g.seed = m.seed; g.schemeName = m.scheme || ''; g.perTeam = m.perTeam || 4; g.settings = { turnTime: m.turnTime, sdMinutes: m.sdMinutes };
    Terrain.generate(m.map, m.seed, m.theme); bg = makeBackground(m.seed, Terrain.cavern);
    applyEvents(m.log);
    g.teams = m.teams.map((t, i) => ({ name: t.name, color: t.color, ai: false, critters: [], ammo: {}, idx: i, fuse: 3, lastWeapon: 'bomb', dmg: 0, kills: 0, used: {} }));
    applySnap(m.snap);
    cam.x = CFG.W / 2; cam.y = 600; cam.tz = 0.9;
    banner(`Joined ${m.teams[0].name}'s game as ${m.teams[this.myTeam].name}!`, m.teams[this.myTeam].color);
  },
};
const CRIT_F = ['x', 'y', 'vx', 'vy', 'facing', 'aim', 'hp', 'pending', 'alive', 'mode', 'squash', 'spin', 'hurtT', 'sadT', 'walking', 'walkPh', 'tumble', 'dyingT', 'fuel', 'thrust', 'face', 'faceT'];
const NET_KINDS = [
  ['P', Proj, ['type', 'spin', 'fuseT', 'armT', 'trigT', 'stuck']], ['M', Mine, ['trigT', 'spent', 'blink']], ['B', Barrel, ['fuseT']],
  ['C', Crate, ['type', 'chute', 'sway']], ['G', Grave, ['col']], ['L', Lava, ['life', 'stuck']], ['V', Volcano, ['t']],
  ['R', Robot, ['dir', 'legPh', 't']], ['A', Anvil, []], ['E', Pelican, ['dir', 'flap']], ['H', Rope, ['cId', 'tx', 'ty', 'state']],
  ['Q', GasPuff, ['life', 'r']], ['T', Cloud, ['t', 'bolts', 'nextT']], ['D', Drill, ['dx', 'dy']],
  ['X', Vortex, ['t', 'life']], ['S', Shower, ['t', 'n']],
];
const NET_KIND = new Map(NET_KINDS.map(([code, cls, f]) => [cls, { code, cls, f }]));
const NET_CODE = new Map(NET_KINDS.map(([code, cls, f]) => [code, { code, cls, f }]));

// Host-side recording: wrap cosmetic + terrain functions so each top-level call becomes an event.
// Nested calls (particles spawned inside fxExplosion, tones inside Sfx.boom…) are muted.
const NET_FN = {};
function netWrap(code, fn, self) {
  NET_FN[code] = fn.bind(self);
  return function (...a) {
    if (Net.role === 'host' && !Net.mute) { Net.ev(code, a); if (code === 'c' || code === 'g') Net.log.push([code, ...netCopy(a)]); }
    Net.mute++; try { return fn.apply(self ?? this, a); } finally { Net.mute--; }
  };
}
P = netWrap('p', P); fxExplosion = netWrap('x', fxExplosion); splashFx = netWrap('w', splashFx); dustFx = netWrap('d', dustFx);
addText = netWrap('t', addText); banner = netWrap('b', banner); addTracer = netWrap('r', addTracer);
Terrain.carve = netWrap('c', Terrain.carve, Terrain); Terrain.girder = netWrap('g', Terrain.girder, Terrain);
// Sounds: only network calls that actually reached tone()/noise(), i.e. got past their own throttles
for (const k of Object.keys(Sfx)) {
  const fn = Sfx[k]; if (typeof fn !== 'function' || k === 'init' || k === 'ok') continue;
  NET_FN['s.' + k] = fn.bind(Sfx);
  Sfx[k] = function (...a) {
    if (Net.mute || Net.role !== 'host') { Net.mute++; try { return fn.apply(Sfx, a); } finally { Net.mute--; } }
    this._hit = false; Net.mute++; let r; try { r = fn.apply(Sfx, a); } finally { Net.mute--; }
    if (this._hit) Net.events.push(['s.' + k, ...netCopy(a)]);
    return r;
  };
}
function applyEvents(evs) {
  if (!evs) return;
  for (const e of evs) { const fn = NET_FN[e[0]]; if (fn) try { fn(...e.slice(1)); } catch (err) { } }
}
// Guest: merge a snapshot into local objects (reusing them by id so drawing stays smooth)
function applySnap(s) {
  const prevState = g.state;
  Object.assign(g, { state: s.st, turnT: s.tt, wind: s.w, weapon: s.wp, fuse: s.fu, target: s.tg ? { x: s.tg[0], y: s.tg[1] } : null, charging: s.ch, power: s.pw,
    retreat: s.rt, fired: s.fi, lockWeapon: s.lw, controlling: s.ct, girderAng: s.ga, shotsLeft: s.sl, robot: s.rb ? {} : null, waterY: s.wy, sd: s.sd,
    turnStartT: s.ts, slowmo: s.sm, netFocus: s.cf ? { x: s.cf[0], y: s.cf[1] } : null });
  g.shake = Math.max(g.shake, s.sh);
  if (Math.abs(g.time - s.tm) > 0.5) g.time = s.tm;
  if (s.am) s.am.forEach((a, i) => { if (g.teams[i]) g.teams[i].ammo = a; });
  if (s.dm) s.dm.forEach((d, i) => { if (g.teams[i]) { g.teams[i].dmg = d[0]; g.teams[i].kills = d[1]; } });
  if (s.us) s.us.forEach((u, i) => { if (g.teams[i]) g.teams[i].used = u; });
  const byId = new Map(g.critters.map(c => [c.id, c]));
  for (const a of s.c) {
    let c = byId.get(a[0]);
    if (!c) { c = new Critter(g.teams[a[1]], a[2]); c.id = a[0]; g.teams[a[1]].critters.push(c); g.critters.push(c); c.x = a[3]; c.y = a[4]; }
    CRIT_F.forEach((f, i) => { if (f === 'x') c._nx = a[3 + i]; else if (f === 'y') c._ny = a[3 + i]; else c[f] = a[3 + i]; });
    const say = a[3 + CRIT_F.length]; c.say = say ? { text: say[0], t: say[1] } : null;
  }
  const old = new Map(g.ents.map(e => [e.id, e])), ents = [];
  for (const a of s.e) {
    const k = NET_CODE.get(a[0]); if (!k) continue;
    let e = old.get(a[1]);
    if (!e || !(e instanceof k.cls)) { e = Object.create(k.cls.prototype); e.id = a[1]; e.x = a[2]; e.y = a[3]; e.r = 6; e.dead = false; }
    e._nx = a[2]; e._ny = a[3]; e.vx = a[4]; e.vy = a[5];
    k.f.forEach((f, i) => { e[f] = a[6 + i]; });
    if (k.cls === Proj) Object.assign(e, PROJ[e.type] ? { r: PROJ[e.type].r, fuse: PROJ[e.type].fuse } : {});
    if (k.cls === Rope) e.c = byId.get(e.cId) || g.critters.find(c => c.id === e.cId);
    ents.push(e);
  }
  g.ents = ents;
  const prevActive = g.active;
  g.active = g.critters.find(c => c.id === s.a) || null;
  if (g.state === 'turn' && (g.active !== prevActive || prevState !== 'turn')) turnBanner();
  if (s.win >= 0) g.winner = g.teams[s.win];
  if (s.st === 'gameover' && prevState !== 'gameover') g.overT = 2.2;
  if (!g.controlling && UI.pickerOpen) UI.togglePicker();
  Net.snapAt = performance.now();
}
// Guest frame: glide every object toward its (velocity-extrapolated) snapshot position
function guestTick(dt) {
  g.time += dt;
  const age = Math.min(0.12, (performance.now() - Net.snapAt) / 1000), k = 1 - Math.exp(-dt * 18);
  const glide = e => {
    if (e._nx === undefined) return;
    const tx = e._nx + (e.vx || 0) * age, ty = e._ny + (e.vy || 0) * age;
    if (Math.abs(tx - e.x) > 150 || Math.abs(ty - e.y) > 150) { e.x = tx; e.y = ty; } else { e.x += (tx - e.x) * k; e.y += (ty - e.y) * k; }
  };
  for (const c of g.critters) if (c.alive) { glide(c); c.anim(dt); c.eyes(dt); c.trail(); }
  for (const e of g.ents) { glide(e); if (e.trail && e.x !== undefined) e.trail(); }
  updateFx(dt);
  if (g.overT > 0 && (g.overT -= dt) <= 0) UI.showOver();
}


