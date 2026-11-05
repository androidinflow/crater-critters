// ============================== UI (HUD + DOM overlays) ==============================
const HUD_FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, "Segoe UI", Roboto, system-ui, sans-serif';
// In-world text (names, damage numbers, banners): a soft dark outline keeps it legible over anything
function txt(t, x, y, size, col, align = 'center', stroke = 4) {
  ctx.font = `600 ${size}px ${HUD_FONT}`; ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = stroke * 0.7; ctx.strokeText(t, x, y); ctx.fillStyle = col; ctx.fillText(t, x, y);
}
// HUD text: no outline, just a 1px shadow so it reads on glass
function hud(t, x, y, size, col = '#f5f7fb', align = 'left', weight = 600) {
  ctx.font = `${weight} ${size}px ${HUD_FONT}`; ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillText(t, x, y + 1); ctx.fillStyle = col; ctx.fillText(t, x, y);
}
// Liquid-glass surface: tinted translucent fill, 1px light edge, a brighter highlight along the top
function panel(x, y, w, h, r = 16, fill = 'rgba(14,18,30,0.46)') {
  rr(ctx, x, y, w, h, r); ctx.fillStyle = fill; ctx.fill();
  const gl = ctx.createLinearGradient(0, y, 0, y + h); gl.addColorStop(0, 'rgba(255,255,255,0.14)'); gl.addColorStop(0.5, 'rgba(255,255,255,0.03)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gl; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, Math.min(h, r + 2)); ctx.clip(); rr(ctx, x + 1, y + 1, w - 2, h - 2, r - 1); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.stroke(); ctx.restore();
}
function glassCircle(x, y, r, fill = 'rgba(14,18,30,0.46)') {
  circ(ctx, x, y, r); ctx.fillStyle = fill; ctx.fill();
  const gl = ctx.createLinearGradient(0, y - r, 0, y + r); gl.addColorStop(0, 'rgba(255,255,255,0.16)'); gl.addColorStop(0.55, 'rgba(255,255,255,0.02)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gl; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.32)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, r - 1.5, -Math.PI * 0.85, -Math.PI * 0.15); ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.stroke();
}
// Minimap: cached shrunken copy of the terrain bitmap (refreshed when the terrain version changes)
// with critter dots and the camera window. Click/tap it to look there.
const Mini = {
  cvs: null, ver: -1, rect: null, hidden: false,
  draw(vx0, vy0, vx1, vy1) {
    this.rect = null;
    if (this.hidden) return;
    const T = UI.touch, { w, h } = view;
    if (!T && w < 720) return;
    if (!this.cvs) { this.cvs = document.createElement('canvas'); this.cvs.width = 240; this.cvs.height = 120; }
    if (this.ver !== Terrain.version) { this.ver = Terrain.version; const x = this.cvs.getContext('2d'); x.clearRect(0, 0, 240, 120); x.drawImage(Terrain.cvs, 0, 0, CFG.W, CFG.H, 0, 0, 240, 120); }
    const rows = g.teams.length, mw = T ? 140 : 192, mh = mw / 2, mx = w / 2 - mw / 2;
    // touch: top centre, or below the team bars on a narrow (portrait) phone where it would cover the weapon panel
    const my = T ? (w < 600 ? 14 + 70 * (w < 760 ? 0.8 : 1) + 22 + 46 + rows * (rows > 4 ? 12 : 18) + 10 : 12) : h - 14 - rows * (rows > 4 ? 14 : 18) - mh - 10;
    this.rect = { x: mx, y: my, w: mw, h: mh };
    ctx.save();
    panel(mx - 5, my - 5, mw + 10, mh + 10, 10); ctx.save(); rr(ctx, mx, my, mw, mh, 6); ctx.clip();
    const sk = Terrain.theme.sky; ctx.fillStyle = Terrain.cavern ? '#2a1e3d' : sk[1]; ctx.globalAlpha = 0.6; ctx.fillRect(mx, my, mw, mh); ctx.globalAlpha = 1;
    ctx.drawImage(this.cvs, mx, my, mw, mh);
    const wy = my + g.waterY / CFG.H * mh; ctx.fillStyle = Terrain.theme.water[1]; ctx.fillRect(mx, wy, mw, my + mh - wy);
    for (const c of g.critters) if (c.alive) { const px = mx + c.x / CFG.W * mw, py = my + c.y / CFG.H * mh, act = c === g.active && g.state === 'turn';
      ctx.fillStyle = c.team.color; ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1; circ(ctx, px, py, act ? 3.5 + Math.sin(g.time * 8) : 2.4); ctx.fill(); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1;
    ctx.strokeRect(mx + clamp(vx0, 0, CFG.W) / CFG.W * mw, my + clamp(vy0, 0, CFG.H) / CFG.H * mh, (clamp(vx1, 0, CFG.W) - clamp(vx0, 0, CFG.W)) / CFG.W * mw, (clamp(vy1, 0, CFG.H) - clamp(vy0, 0, CFG.H)) / CFG.H * mh);
    ctx.restore(); ctx.restore();
  },
  hit(sx, sy) {   // returns true when a click landed on the minimap (and moves the camera there)
    const r = this.rect; if (!r || sx < r.x || sx > r.x + r.w || sy < r.y || sy > r.y + r.h) return false;
    cam.x = (sx - r.x) / r.w * CFG.W; cam.y = (sy - r.y) / r.h * CFG.H; cam.manualT = 4; return true;
  },
};
function drawHUD() {
  const { w, h } = view;
  const z = cam.zoom; Mini.draw(cam.x - w / 2 / z, cam.y - h / 2 / z, cam.x + w / 2 / z, cam.y + h / 2 / z);
  // name tags, hp, speech bubbles (screen space so they stay readable at any zoom)
  for (const c of g.critters) {
    if (!c.alive) continue;
    const s = worldToScreen(c.x, c.y - c.r * 1.6); if (s.x < -60 || s.x > w + 60 || s.y < -60 || s.y > h + 60) continue;
    txt(c.name, s.x, s.y - 26, 12, shade(c.team.color, 0.25), 'center', 3);
    const hp = Math.max(0, Math.ceil(c.hp)), bw = 30;
    rr(ctx, s.x - bw / 2, s.y - 18, bw, 14, 7); ctx.fillStyle = 'rgba(14,18,30,0.6)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.font = `600 11px ${HUD_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = c.poison > 0 ? '#9be15d' : shade(c.team.color, 0.35); ctx.fillText(hp, s.x, s.y - 11);
    if (c === g.active && g.state === 'turn' && g.time - g.turnStartT < 3) {
      const by = s.y - 44 + Math.sin(g.time * 8) * 4; ctx.fillStyle = c.team.color; ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(s.x - 8, by - 10); ctx.lineTo(s.x + 8, by - 10); ctx.lineTo(s.x, by); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    if (c.say) {
      ctx.font = `500 13px ${HUD_FONT}`; const tw = ctx.measureText(c.say.text).width + 18, by = s.y - 66;
      ctx.globalAlpha = Math.min(1, c.say.t * 3);
      rr(ctx, s.x - tw / 2, by - 12, tw, 24, 12); ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s.x - 5, by + 11); ctx.lineTo(s.x, by + 18); ctx.lineTo(s.x + 5, by + 11); ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fill();
      ctx.fillStyle = '#16181f'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center'; ctx.fillText(c.say.text, s.x, by); ctx.globalAlpha = 1;
    }
  }
  for (const t of g.texts) { const s = worldToScreen(t.x, t.y); ctx.globalAlpha = clamp((t.life - t.t) * 2, 0, 1); txt(t.text, s.x, s.y - t.t * 34, t.size * (1 + Math.max(0, 0.3 - t.t)), t.col); }
  ctx.globalAlpha = 1;
  if (g.state === 'placement') { txt('Critters incoming!', w / 2, 60, 28, '#fff'); return; }
  const c = g.active, team = c && c.team;
  // Layout: desktop puts timer/wind at the bottom corners; touch moves them up out of the thumbs' way
  const T = UI.touch, ps = T && w < 760 ? 0.8 : 1;
  const L = T ? { tx: w - 46, ty: 98, ts: 0.82, wx: 14, wy: 14 + 70 * ps + 22, ww: 170, bannerY: Math.max(44, h * 0.3) }
              : { tx: 54, ty: h - 54, ts: 1, ww: 200, wx: w - 216, wy: h - 50, bannerY: 40 };
  // weapon panel
  if (team && g.state === 'turn') {
    const W = WEAP[g.weapon];
    ctx.save(); ctx.translate(14, 14); ctx.scale(ps, ps); ctx.translate(-14, -14);
    panel(14, 14, 276, 72, 18);
    rr(ctx, 24, 24, 52, 52, 14); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fill();
    ctx.save(); ctx.translate(50, 51); drawIcon(ctx, W.id, 38); ctx.restore();
    hud(W.name, 88, 33, 15);
    const a = team.ammo[W.id] ?? 0;
    hud(a === -1 ? 'Unlimited' : a === 0 ? 'No ammo' : `${a} left`, 88, 52, 12, a === 0 ? '#ff7a8a' : 'rgba(245,247,251,0.7)', 'left', 500);
    let hint = W.hint.replace('{fuse}', g.fuse).replace('{bee}', g.target ? 'Target locked! Hold Space.' : 'Click to set a target.');
    if (W.air && Terrain.cavern) hint = 'No air-drops in caverns!';
    if (g.robot) hint = g.robot.hint || 'Space: KABOOM!'; else if (g.shotsLeft === 1) hint = 'One more shot!';
    if (c.mode === 'chute') hint = '←→ drift · Space: close chute'; if (c.mode === 'kami') hint = 'BANZAI!';
    if (c.mode === 'rope') hint = '←→ swing · ↑↓ climb · Space let go'; if (c.mode === 'jet') hint = `↑ thrust · fuel ${Math.max(0, c.fuel).toFixed(1)}s`;
    if (T) hint = hint.replace('Hold Space', 'Hold FIRE').replace('Space again', 'FIRE again').replace('Space:', 'FIRE:').replace('Click', 'Tap').replace('click', 'tap').replace('keys 1–5', 'tap map').replace(' (tap map)', '');
    hud(hint, 88, 69, 11, 'rgba(245,247,251,0.6)', 'left', 500);
    ctx.restore();
  }
  // timer
  {
    ctx.save(); ctx.translate(L.tx, L.ty); ctx.scale(L.ts, L.ts);
    const tx = 0, ty = 0, col = team ? team.color : '#aaa';
    glassCircle(tx, ty, 38);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 5; ctx.lineCap = 'round'; circ(ctx, tx, ty, 31); ctx.stroke();
    if (g.state === 'turn') {
      const frac = clamp(g.turnT / (g.retreat ? CFG.RETREAT : g.settings.turnTime), 0, 1);
      ctx.strokeStyle = g.retreat ? '#ff7b39' : col; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(tx, ty, 31, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); ctx.stroke(); ctx.lineCap = 'butt';
      const v = Math.ceil(Math.max(0, g.turnT));
      hud(v, tx, ty + 1, 26, g.turnT < 5 && (g.time * 4 | 0) % 2 ? '#ff4d6d' : '#fff', 'center', 600);
      if (g.retreat) txt('Run!', tx, ty - 50, 16, '#ff7b39');
    } else { ctx.lineCap = 'butt'; hud('…', tx, ty, 24, 'rgba(245,247,251,0.6)', 'center'); }
    if (g.sd) txt('Sudden death', T ? tx : tx + 46, T ? ty + 52 : ty - 46, 13, '#ff4d6d', T ? 'center' : 'left');
    else if (g.settings.sdMinutes > 0) { const left = Math.max(0, g.settings.sdMinutes * 60 - g.time); txt(`${left / 60 | 0}:${String(left % 60 | 0).padStart(2, '0')}`, tx, ty + 52, 12, 'rgba(255,255,255,0.85)'); }
    ctx.restore();
  }
  // wind meter
  {
    const ww = L.ww, wx = L.wx, wy = L.wy;
    panel(wx, wy, ww, 36, 18);
    hud('Wind', wx + 14, wy + 18, 11, 'rgba(245,247,251,0.7)', 'left', 600);
    const bx = wx + 52, bwid = ww - 66, mid = bx + bwid / 2, len = g.wind * (bwid / 2 - 4);
    rr(ctx, bx, wy + 12, bwid, 12, 6); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fill();
    ctx.save(); rr(ctx, Math.min(mid, mid + len), wy + 12, Math.abs(len), 12, 6); ctx.clip();
    ctx.fillStyle = 'rgba(95,176,255,0.55)'; ctx.fillRect(bx, wy + 12, bwid, 12);
    const dir = Math.sign(g.wind) || 1;
    for (let i = -2; i < 22; i++) { const px = bx + ((i * 14 + g.time * 40 * dir) % (bwid + 28)); ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.45)';
      ctx.beginPath(); ctx.moveTo(px, wy + 14); ctx.lineTo(px + 5 * dir, wy + 18); ctx.lineTo(px, wy + 22); ctx.lineTo(px + 4 * dir, wy + 22); ctx.lineTo(px + 9 * dir, wy + 18); ctx.lineTo(px + 4 * dir, wy + 14); ctx.fill(); }
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(mid, wy + 9); ctx.lineTo(mid, wy + 27); ctx.stroke();
  }
  // team totals
  {
    const narrow = w < 820, rows = g.teams.length, rowH = rows > 4 ? (T ? 12 : 14) : 18;
    const bw = T ? Math.min(300, Math.max(200, w * 0.45)) : Math.min(360, w - 130), x0 = T ? 14 - 118 : w / 2 - bw / 2;
    const y0 = T ? L.wy + 46 : h - (narrow ? 64 : 14) - rows * rowH;
    if (bw > 120) for (let i = 0; i < rows; i++) {
      const t = g.teams[i], tot = t.critters.reduce((s, c) => s + (c.alive ? Math.max(0, c.hp) : 0), 0), y = y0 + i * rowH;
      const bar = clamp(tot / (CFG.HP * (g.perTeam || CFG.PER_TEAM)), 0, 1.4) * (bw - 120);
      if (T) txt(t.name, x0 + 118 + Math.max(4, bar) + 6, y + 8, 11, '#fff', 'left', 3); else txt(t.name, x0 + 112, y + 8, 12, '#fff', 'right', 3);
      const bh = rowH - 6; rr(ctx, x0 + 118, y + 2, bw - 120, bh, bh / 2); ctx.fillStyle = 'rgba(14,18,30,0.4)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1; ctx.stroke();
      rr(ctx, x0 + 119, y + 3, Math.max(bh - 2, Math.min(bar, bw - 122)), bh - 2, (bh - 2) / 2); ctx.fillStyle = t.color; ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.28)'; rr(ctx, x0 + 119, y + 3, Math.max(bh - 2, Math.min(bar, bw - 122)), (bh - 2) / 2, (bh - 2) / 2); ctx.fill();
      if (g.state === 'turn' && team === t) { ctx.fillStyle = '#fff'; circ(ctx, T ? x0 + 118 + (bw - 120) + 8 : x0 + 118 + (bw - 120) + 10, y + 8, 3); ctx.fill(); }
    }
  }
  // banner
  if (g.banner) {
    const b = g.banner, a = clamp(Math.min(b.t * 5, (2.6 - b.t) * 3), 0, 1);
    if (a > 0) { ctx.globalAlpha = a; txt(b.text, w / 2, L.bannerY + (1 - a) * -20, w < 500 ? 19 : 24, b.col, 'center', 5); ctx.globalAlpha = 1; }
  }
  if (g.online && g.state === 'turn' && team) {
    const mine = team.idx === Net.myTeam, pulse = mine ? 0.75 + 0.25 * Math.sin(g.time * 5) : 0.8;
    ctx.globalAlpha = pulse; txt(mine ? 'YOUR TURN' : `${team.name} is playing…`, w / 2, L.bannerY + (T || w >= 700 ? 30 : 76), 15, mine ? team.color : '#fff'); ctx.globalAlpha = 1;
  }
  if (Net.role === 'guest' && Net.hostLost) txt('Host disconnected…', w / 2, h * 0.5, 22, '#ff4d6d');
  if (g.online && Net.code) { // room code, so a friend can still join / rejoin mid-game
    const ry = T ? (Mini.rect ? Mini.rect.y + Mini.rect.h + 12 : 20) : 14;
    ctx.globalAlpha = 0.9; txt(`Room ${Net.code}`, w / 2, ry, T ? 12 : 13, '#fff', 'center', 3); ctx.globalAlpha = 1;
  }
  if (T && h > w * 1.15) { ctx.globalAlpha = 0.7; txt('Tip: turn your phone sideways ↻', w / 2, h - 210, 13, '#fff', 'center', 3); ctx.globalAlpha = 1; }
  if (g.state === 'turn' && g.ai) txt(g.ai.st === 'think' ? 'Thinking…' : '', w / 2, 72, 14, '#fff');
  if (!T) { ctx.globalAlpha = 0.55; txt('Tab: weapons · H: help · Esc: pause', w - 16, 16, 11, '#fff', 'right', 3); ctx.globalAlpha = 1; }
  if (g.slowmo > 0) { ctx.fillStyle = `rgba(0,0,0,${0.25 * Math.min(1, g.slowmo)})`; ctx.fillRect(0, 0, w, 50); ctx.fillRect(0, h - 50, w, 50); }
}

const $ = id => document.getElementById(id);
const DEFAULT_SETTINGS = {
  numTeams: 2, perTeam: 4, turnTime: 45, sdMinutes: 10, map: 'Island', theme: 'Meadow', scheme: 'Classic',
  teams: [{ name: 'Spiky Bunch', color: 0, ai: false }, { name: 'Quill Squad', color: 1, ai: true },
          { name: 'Bristle Brigade', color: 2, ai: true }, { name: 'Prickly Pals', color: 3, ai: true },
          { name: 'Thistle Troop', color: 4, ai: true }, { name: 'Burr Buddies', color: 5, ai: true },
          { name: 'Needle Knights', color: 6, ai: true }, { name: 'Fuzz Force', color: 7, ai: true }],
};
const SETTINGS_KEY = 'craterCritters.settings.v1';
// Custom image maps (beta): a picture from the player, fitted above the water line. Transparent
// pixels are air (in a picture with no transparency at all, white is air); everything else is
// ground painted with the picture's own colours. Kept in localStorage, local games only for now.
const MapImage = {
  KEY: 'cc_custom_map', img: null,
  ready() { return !!(this.img && this.img.complete && this.img.naturalWidth > 0); },
  init(then) { let d = null; try { d = localStorage.getItem(this.KEY); } catch (e) { } if (d) this.setSrc(d, then); },
  setSrc(src, then) { const im = new Image(); im.onload = () => { this.img = im; if (then) then(true); }; im.onerror = () => { if (then) then(false); }; im.src = src; },
  load(file) {
    const rd = new FileReader();
    rd.onload = () => this.setSrc(rd.result, ok => {
      if (!ok) { $('mapNote').textContent = 'Could not read that image.'; return; }
      const im = this.img, k = Math.min(1, 1200 / im.naturalWidth, 530 / im.naturalHeight), cv = document.createElement('canvas');   // half the playfield is plenty
      cv.width = Math.max(1, Math.round(im.naturalWidth * k)); cv.height = Math.max(1, Math.round(im.naturalHeight * k));
      cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
      const url = cv.toDataURL('image/png'); let kept = true;
      try { localStorage.setItem(this.KEY, url); } catch (e) { kept = false; }
      this.setSrc(url, () => { settings.map = 'Custom'; saveSettings(); UI.buildMenu(); startBackdrop(); $('mapNote').textContent = kept ? 'Custom map loaded. Transparent or white pixels are air.' : 'Custom map loaded (too big to remember between visits).'; });
    });
    rd.readAsDataURL(file);
  },
  // Flip the stored image (h = mirror left/right, v = upside down) and re-preview
  flip(axis) {
    if (!this.ready()) return;
    const im = this.img, cv = document.createElement('canvas'); cv.width = im.naturalWidth; cv.height = im.naturalHeight; const x = cv.getContext('2d');
    if (axis === 'h') { x.translate(cv.width, 0); x.scale(-1, 1); } else { x.translate(0, cv.height); x.scale(1, -1); }
    x.drawImage(im, 0, 0);
    const url = cv.toDataURL('image/png'); try { localStorage.setItem(this.KEY, url); } catch (e) { }
    this.setSrc(url, () => { this.thumb(); if (g.state === 'menu') startBackdrop(); });
  },
  // Turn the stored image a quarter turn (dir = 1 clockwise, -1 anticlockwise); width and height swap
  rotate(dir) {
    if (!this.ready()) return;
    const im = this.img, cv = document.createElement('canvas'); cv.width = im.naturalHeight; cv.height = im.naturalWidth; const x = cv.getContext('2d');
    x.translate(cv.width / 2, cv.height / 2); x.rotate(dir * Math.PI / 2); x.drawImage(im, -im.naturalWidth / 2, -im.naturalHeight / 2);
    const url = cv.toDataURL('image/png'); try { localStorage.setItem(this.KEY, url); } catch (e) { }
    this.setSrc(url, () => { this.thumb(); if (g.state === 'menu') startBackdrop(); });
  },
  thumb() {
    const cv = $('mapThumb'); if (!cv) return; const x = cv.getContext('2d'); x.clearRect(0, 0, cv.width, cv.height);
    if (!this.ready()) return;
    const im = this.img, k = Math.min(cv.width / im.naturalWidth, cv.height / im.naturalHeight), w = im.naturalWidth * k, h = im.naturalHeight * k;
    x.drawImage(im, (cv.width - w) / 2, (cv.height - h) / 2, w, h);
  },
  stamp(T) {
    const im = this.img, W = T.W, maxW = W - 200, maxH = CFG.WATER0 - 130;
    const k = Math.min(maxW / im.naturalWidth, maxH / im.naturalHeight), w = Math.max(1, Math.round(im.naturalWidth * k)), h = Math.max(1, Math.round(im.naturalHeight * k));
    const x0 = Math.round((W - w) / 2), y0 = Math.round(CFG.WATER0 - 70 - h);
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const x = cv.getContext('2d'); x.drawImage(im, 0, 0, w, h);
    const d = x.getImageData(0, 0, w, h).data; let clear = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] <= 127) clear++;
    const whiteIsAir = clear < d.length / 4 * 0.005;
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
      const i = (yy * w + xx) * 4;
      if (d[i + 3] <= 127 || (whiteIsAir && d[i] > 235 && d[i + 1] > 235 && d[i + 2] > 235)) continue;
      const j = (y0 + yy) * W + (x0 + xx); T.mask[j] = 1; T.buf[j] = (255 << 24) | (d[i + 2] << 16) | (d[i + 1] << 8) | d[i];
    }
  },
};
function loadSettings() {
  const d = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  try { const s = JSON.parse(localStorage.getItem(SETTINGS_KEY)); if (s) { Object.assign(d, s); d.teams = DEFAULT_SETTINGS.teams.map((t, i) => Object.assign({}, t, (s.teams || [])[i])); } } catch (e) { }
  return d;
}
function saveSettings() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) { } }
let settings = loadSettings();

const UI = {
  pickerOpen: false, paused: false, helpOpen: false, touch: false,
  showTouch(on) { if (this.touch === on) return; this.touch = on; $('touch').classList.toggle('hidden', !on); document.body.classList.toggle('touchy', on); },
  lobby(title, html, showCancel = true) { $('lobby').classList.remove('hidden'); $('lobbyTitle').textContent = title; $('lobbyBody').innerHTML = html; $('lobbyCancel').classList.toggle('hidden', !showCancel); },
  netStatus(t) { const el = $('netStatus'); if (el) el.textContent = t; if (g && g.state !== 'menu' && t) banner(t, '#8ecae6'); },
  blocking() { return this.pickerOpen || this.paused || this.helpOpen; },
  buildMenu() {
    const seg = $('numTeams'); seg.innerHTML = '';
    for (let n = 2; n <= MAX_TEAMS; n++) { const b = document.createElement('button'); b.textContent = n; b.className = settings.numTeams === n ? 'on' : '';
      b.onclick = () => { if (n > 4 && settings.numTeams <= 4 && settings.perTeam === 4) settings.perTeam = 2; settings.numTeams = n; saveSettings(); this.buildMenu(); }; seg.appendChild(b); }
    const pseg = $('perTeam'); pseg.innerHTML = '';
    for (let n = 1; n <= 4; n++) { const b = document.createElement('button'); b.textContent = n; b.className = settings.perTeam === n ? 'on' : '';
      b.onclick = () => { settings.perTeam = n; saveSettings(); this.buildMenu(); }; pseg.appendChild(b); }
    const list = $('teamList'); list.innerHTML = '';
    for (let i = 0; i < settings.numTeams; i++) {
      const t = settings.teams[i], row = document.createElement('div'); row.className = 'team';
      const sw = document.createElement('button'); sw.className = 'swatch'; sw.style.background = TEAM_COLORS[t.color]; sw.title = 'Change colour';
      sw.onclick = () => { t.color = (t.color + 1) % TEAM_COLORS.length; saveSettings(); this.buildMenu(); };
      const nm = document.createElement('input'); nm.type = 'text'; nm.value = t.name; nm.maxLength = 18;
      nm.oninput = () => { t.name = nm.value || `Team ${i + 1}`; saveSettings(); };
      const ai = document.createElement('div'); ai.className = 'seg';
      for (const [lab, v] of [['Human', false], ['AI', true]]) { const b = document.createElement('button'); b.textContent = lab; b.className = t.ai === v ? 'on' : '';
        b.onclick = () => { t.ai = v; saveSettings(); this.buildMenu(); }; ai.appendChild(b); }
      row.append(sw, nm, ai); list.appendChild(row);
    }
    const bindSel = (id, key, num, after) => { const el = $(id); el.value = String(settings[key]); if (el.value !== String(settings[key])) { settings[key] = DEFAULT_SETTINGS[key]; el.value = String(settings[key]); } el.onchange = () => { settings[key] = num ? +el.value : el.value; saveSettings(); if (after) after(); }; };
    bindSel('turnTime', 'turnTime', true); bindSel('sdMinutes', 'sdMinutes', true); bindSel('scheme', 'scheme');
    bindSel('mapStyle', 'map', false, () => { this.buildMenu(); startBackdrop(); }); bindSel('theme', 'theme', false, startBackdrop);
    $('mapFileRow').classList.toggle('hidden', settings.map !== 'Custom');
    if (settings.map === 'Custom') { $('mapNote').textContent = MapImage.ready() ? 'Transparent or white pixels are air. Custom maps work in local games only (beta).' : 'Choose an image. Transparent or white pixels are air.'; MapImage.thumb(); $('mapFlipH').disabled = $('mapFlipV').disabled = $('mapRotL').disabled = $('mapRotR').disabled = !MapImage.ready(); }
    else $('mapNote').textContent = 'The backdrop previews your map and theme.';
  },
  showMenu() { if (Net.role) { Net.send(Net.role === 'host' ? { t: 'bye', host: 1 } : { t: 'bye', pid: Net.pid }); Net.leave(); } Chat.reset(); this.hideAll(); $('menu').classList.remove('hidden'); this.buildMenu(); startBackdrop(); },
  hideAll() { ['menu', 'picker', 'pause', 'help', 'over', 'lobby', 'board'].forEach(id => $(id).classList.add('hidden')); this.pickerOpen = this.paused = this.helpOpen = false; },
  togglePicker() {
    if (this.pickerOpen) { $('picker').classList.add('hidden'); this.pickerOpen = false; return; }
    if (!(g.state === 'turn' && g.controlling && !g.ai && !g.fired && !g.lockWeapon && !this.paused && myTurn())) return;
    if (Net.role !== 'guest') g.charging = false;
    const root = $('pickGrid'); root.innerHTML = ''; const team = g.active.team, T = this.touch;
    const KIND = { charge: 'charge & throw', instant: 'fire', place: 'place', click: T ? 'tap a target' : 'click a target', tool: 'tool' };
    let peek = null; // touch: the weapon being read about (first tap reads, second tap equips)
    const showInfo = (W, b) => {
      const usable = weaponUsable(team, W.id), a = team.ammo[W.id] ?? 0;
      $('piName').textContent = W.name; $('piKind').textContent = KIND[W.kind];
      $('piStats').textContent = (a === -1 ? '∞ ammo · ' : a > 0 ? a + ' left · ' : 'no ammo · ') + W.stats;
      let d = W.desc; if (T) d = d.replace(/Click/g, 'Tap').replace(/click/g, 'tap').replace('with keys 1–5', 'by tapping the fuse');
      if (W.air && Terrain.cavern) d += ' (Not available in caverns.)';
      $('piDesc').textContent = d;
      const x = $('piIcon').getContext('2d'); x.clearRect(0, 0, 64, 64); x.save(); x.translate(32, 34); drawIcon(x, W.id, 52); x.restore();
      const eq = $('piEquip'); eq.classList.toggle('hidden', !T); eq.disabled = !usable; eq.onclick = () => equip(W);
      root.querySelectorAll('.peek').forEach(e => e.classList.remove('peek')); if (b && T) b.classList.add('peek');
    };
    const equip = W => { if (!weaponUsable(team, W.id)) return; selectWeapon(W.id); this.togglePicker(); Sfx.tone(700, 0.06, 'square', 0.06); };
    for (const [cat, title] of WCATS) {
      const list = WEAPONS.filter(W => W.cat === cat); if (!list.length) continue;
      const grp = document.createElement('div'); grp.className = 'wgroup'; const h = document.createElement('h3'); h.textContent = `${title} · ${list.filter(W => weaponUsable(team, W.id)).length}/${list.length}`;
      const grid = document.createElement('div'); grid.className = 'wgrid'; grp.append(h, grid); root.appendChild(grp);
      for (const W of list) {
        const b = document.createElement('button'); b.className = 'wbtn' + (g.weapon === W.id ? ' sel' : ''); b.title = T ? '' : W.desc;
        const cv = document.createElement('canvas'); cv.width = 96; cv.height = 96; const x = cv.getContext('2d'); x.translate(48, 50); drawIcon(x, W.id, 80);
        const a = team.ammo[W.id] ?? 0, lab = document.createElement('span'); lab.textContent = W.name;
        const am = document.createElement('span'); am.className = 'ammo'; am.textContent = a === -1 ? '∞' : a;
        b.append(cv, lab, am);
        // unusable weapons stay readable (greyed, not disabled) so you can still learn what they do
        if (!weaponUsable(team, W.id)) { b.style.opacity = 0.45; b.setAttribute('aria-disabled', 'true'); }
        b.onmouseenter = b.onfocus = () => { if (!T) showInfo(W, b); };
        b.onclick = () => {
          if (T && peek !== W.id) { peek = W.id; showInfo(W, b); Sfx.tone(520, 0.04, 'square', 0.04); return; }
          equip(W);
        };
        grid.appendChild(b);
        if (g.weapon === W.id) showInfo(W, null);
      }
    }
    $('pickTip').textContent = T ? 'Tap a weapon to read about it, tap again to equip' : 'Tab / right-click to close · hover a weapon to read about it';
    $('picker').classList.remove('hidden'); this.pickerOpen = true;
  },
  togglePause() {
    if (g.state === 'menu' || !$('over').classList.contains('hidden')) return;
    if (this.helpOpen) { this.toggleHelp(); return; }
    if (this.pickerOpen) { this.togglePicker(); return; }
    this.paused = !this.paused; $('pause').classList.toggle('hidden', !this.paused);
    $('pauseNote').classList.toggle('hidden', !g.online);
  },
  toggleHelp() { this.helpOpen = !this.helpOpen; $('help').classList.toggle('hidden', !this.helpOpen); },
  showOver() {
    const w = g.winner; $('over').classList.remove('hidden');
    $('winText').textContent = w ? `${w.name} wins!` : "It's a draw!";
    $('winText').style.color = w ? w.color : '#fff';
    $('winSub').textContent = w ? `Survivors: ${w.critters.filter(c => c.alive).map(c => c.name).join(', ')}` : 'Everybody went sploosh.';
    const st = $('winStats'); st.innerHTML = '';
    const best = g.teams.slice().sort((a, b) => b.dmg - a.dmg)[0];
    for (const t of g.teams) {
      const row = document.createElement('div'), nm = document.createElement('b'); nm.textContent = t.name; nm.style.color = t.color;
      row.append(nm, document.createTextNode(` ${Math.round(t.dmg)} damage · ${t.kills} KO${t.kills === 1 ? '' : 's'}${t === best && t.dmg > 0 ? ' · 🏆 most damage' : ''}`));
      st.appendChild(row);
    }
    Profile.report();
  },
};
$('startBtn').onclick = () => { Sfx.init(); Full.auto(); saveSettings(); UI.hideAll(); newGame(); };
$('helpBtn').onclick = () => UI.toggleHelp();
$('mapFile').onchange = e => { const f = e.target.files && e.target.files[0]; if (f) MapImage.load(f); e.target.value = ''; };
$('mapPick').onclick = () => $('mapFile').click();
$('mapFlipH').onclick = () => MapImage.flip('h');
$('mapFlipV').onclick = () => MapImage.flip('v');
$('mapRotL').onclick = () => MapImage.rotate(-1);
$('mapRotR').onclick = () => MapImage.rotate(1);
$('helpClose').onclick = () => UI.toggleHelp();
$('resumeBtn').onclick = () => UI.togglePause();
$('pauseHelpBtn').onclick = () => UI.toggleHelp();
$('quitBtn').onclick = () => UI.showMenu();
$('rematchBtn').onclick = () => {
  UI.hideAll();
  if (Net.role === 'guest') { Net.send({ t: 'rm', pid: Net.pid }); UI.lobby('Rematch!', 'Waiting for the host to start the rematch…'); }
  else if (Net.role === 'host') Net.startGame();
  else newGame();
};
$('hostBtn').onclick = () => { Sfx.init(); Full.auto(); saveSettings(); Net.host(); };
$('joinBtn').onclick = () => { Sfx.init(); Full.auto(); saveSettings(); const code = $('joinCode').value.trim().toUpperCase(); if (code.length < 4) { $('joinCode').focus(); return; } Net.join(code); };
$('joinCode').addEventListener('keydown', e => { if (e.key === 'Enter') $('joinBtn').click(); });
$('lobbyCancel').onclick = () => UI.showMenu();
$('menuBtn').onclick = () => UI.showMenu();

// little animated mascot line-up on the menu
const mascotCtx = $('mascot').getContext('2d');
const mascots = [0, 1, 2, 3].map(i => Object.assign(new Critter({ color: TEAM_COLORS[i] }, ''), { x: 70 + i * 93, y: 62, facing: i < 2 ? 1 : -1, mode: 'ground', r: 18 }));
function drawMascots(t) {
  const x = mascotCtx; x.clearRect(0, 0, 420, 96);
  mascots.forEach((m, i) => {
    m.team.color = TEAM_COLORS[(settings.teams[i] || { color: i }).color];
    const hop = Math.max(0, Math.sin(t * 3 + i * 1.3)); m.y = 62 - hop * 18; m.squash = hop < 0.1 ? 0.15 : -0.05;
    m.px = Math.sin(t * 5 + i) * 1.5; m.py = Math.cos(t * 4 + i) * 1.2 + 0.5; m.hurtT = (t + i) % 6 < 0.4 ? 1 : 0; m.blinkT = ((t * 0.9 + i * 1.7) % 3.3); m.face = m.hurtT ? 1 : 0; m.faceT = m.hurtT;
    drawCritter(x, m, t);
  });
}

