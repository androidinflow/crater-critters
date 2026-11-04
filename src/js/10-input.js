// ============================== INPUT ==============================
const Input = { down: {}, pressed: new Set(), released: new Set(), mx: 0, my: 0, mdown: false, sx: 0, sy: 0, drag: false };
const GAME_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Enter', 'Tab', 'NumpadEnter']);
window.addEventListener('keydown', e => {
  Sfx.init();
  if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
  if (GAME_KEYS.has(e.code)) e.preventDefault();
  if (!e.repeat) {
    if (e.code === 'Escape' || e.code === 'KeyP') { UI.togglePause(); return; }
    if (e.code === 'KeyH' || e.code === 'F1') { e.preventDefault(); UI.toggleHelp(); return; }
    if (e.code === 'KeyT' && Chat.available()) { e.preventDefault(); Chat.open(); return; }
    if (e.code === 'KeyF') { Full.toggle(); return; }
    if (e.code === 'KeyN') { Mini.hidden = !Mini.hidden; return; }
    if (e.code === 'KeyM') { Sfx.muted = !Sfx.muted; banner(Sfx.muted ? 'Sound off' : 'Sound on'); return; }
    if (e.code === 'Tab') { UI.togglePicker(); return; }
    Input.pressed.add(e.code);
  }
  Input.down[e.code] = true;
});
window.addEventListener('keyup', e => { Input.down[e.code] = false; Input.released.add(e.code); });
window.addEventListener('blur', () => { Input.down = {}; });
function humanInput() {
  const d = Input.down, p = Input.pressed;
  return { left: !!(d.ArrowLeft || d.KeyA), right: !!(d.ArrowRight || d.KeyD), up: !!(d.ArrowUp || d.KeyW), down: !!(d.ArrowDown || d.KeyS),
    jumpPress: p.has('Enter') || p.has('NumpadEnter'), flip: false, firePress: p.has('Space'), fireHeld: !!d.Space, targetPower: null, isAI: false };
}
function screenToWorld(sx, sy) { return { x: (sx - view.w / 2) / cam.zoom + cam.x, y: (sy - view.h / 2) / cam.zoom + cam.y }; }
function worldToScreen(x, y) { return { x: (x - cam.x) * cam.zoom + view.w / 2, y: (y - cam.y) * cam.zoom + view.h / 2 }; }

// Pointer input for mouse, pen and touch: one-finger/left-drag pans, a tap/click acts on the
// world, two fingers pinch-zoom, right-click opens the weapon picker.
function bindPointer(cv) {
  const pts = new Map(); let pinch = null;
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('pointerdown', e => {
    Sfx.init();
    if (e.pointerType !== 'mouse') UI.showTouch(true);
    if (e.pointerType === 'mouse' && e.button === 2) { UI.togglePicker(); return; }
    if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 1) return;
    try { cv.setPointerCapture(e.pointerId); } catch (err) { }
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY });
    Input.mx = e.clientX; Input.my = e.clientY;
    if (pts.size === 2) { const [p1, p2] = [...pts.values()]; pinch = { d: Math.hypot(p1.x - p2.x, p1.y - p2.y) || 1, z: cam.tz }; Input.drag = true; }
    else if (pts.size === 1) Input.drag = false;
  });
  window.addEventListener('pointermove', e => {
    const p = pts.get(e.pointerId);
    if (e.pointerType === 'mouse' || p) { Input.mx = e.clientX; Input.my = e.clientY; }
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (pts.size >= 2 && pinch) {
      const [p1, p2] = [...pts.values()];
      cam.tz = cam.zoom = clamp(pinch.z * Math.hypot(p1.x - p2.x, p1.y - p2.y) / pinch.d, 0.45, 2.2);
      cam.x -= dx / 2 / cam.zoom; cam.y -= dy / 2 / cam.zoom; cam.manualT = 3;
      return;
    }
    if (!Input.drag && Math.hypot(e.clientX - p.sx, e.clientY - p.sy) > (e.pointerType === 'mouse' ? 6 : 12)) Input.drag = true;
    if (Input.drag) { cam.x -= dx / cam.zoom; cam.y -= dy / cam.zoom; cam.manualT = 3; }
  });
  const up = e => {
    const p = pts.get(e.pointerId); if (!p) return;
    if (pts.size === 1 && !Input.drag && e.type === 'pointerup' && !Mini.hit(e.clientX, e.clientY)) { const w = screenToWorld(e.clientX, e.clientY); worldClick(w.x, w.y); }
    pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (!pts.size) Input.drag = false;
  };
  window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', e => { e.preventDefault(); cam.tz = clamp(cam.tz * Math.exp(-e.deltaY * 0.0012), 0.45, 2.2); }, { passive: false });
}
// On-screen buttons feed the same key table as the keyboard
function bindTouchButtons() {
  for (const b of document.querySelectorAll('#touch [data-k]')) {
    const k = b.dataset.k;
    const on = e => { e.preventDefault(); Sfx.init(); try { b.setPointerCapture(e.pointerId); } catch (err) { } if (!Input.down[k]) Input.pressed.add(k); Input.down[k] = true; b.classList.add('on'); };
    const off = e => { e.preventDefault(); if (Input.down[k]) Input.released.add(k); Input.down[k] = false; b.classList.remove('on'); };
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('lostpointercapture', off);
    b.addEventListener('contextmenu', e => e.preventDefault());
  }
  $('tWeap').addEventListener('click', () => UI.togglePicker());
  $('tPause').addEventListener('click', () => UI.togglePause());
  $('tFull').addEventListener('click', () => Full.toggle());
}
// Is the critter being controlled right now driven by *this* browser?
function myTurn() { return g.state === 'turn' && g.active && (!g.online || g.active.team.idx === Net.myTeam); }
function worldClick(wx, wy) {
  if (g.state !== 'turn' || !g.controlling || g.ai || UI.blocking() || !myTurn()) return;
  if (Net.role === 'guest') { Net.send({ t: 'ck', x: Math.round(wx), y: Math.round(wy), pid: Net.pid, team: Net.myTeam }); if (g.weapon === 'bee' && !g.retreat) g.target = { x: wx, y: wy }; return; }
  applyClick(wx, wy);
}
function applyClick(wx, wy) {
  const c = g.active, id = g.weapon;
  if (id === 'bee' && !g.retreat && !g.charging) { g.target = { x: wx, y: wy }; Sfx.tone(900, 0.08, 'square', 0.08, 1300); return; }
  if (WEAP[id].kind !== 'click' || g.retreat) return;
  doClickAction(c, id, wx, wy);
}

