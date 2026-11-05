// ============================== CHAT + FULLSCREEN ==============================
// Chat rides on the same Realtime channel as the game ({t:'chat'} messages). Text is only
// ever inserted with textContent, never as HTML.
const Chat = {
  isOpen: false, lastSend: 0,
  QUICK: ['Nice shot!', 'Oops 😅', 'Ha! Missed!', 'GG', 'Revenge time!', 'Hurry up! ⏳'],
  available() { return !!(g && g.online && Net.role && Net.started); },
  me() { const t = g.teams[Net.myTeam] || settings.teams[0]; return { n: t.name, c: t.color || TEAM_COLORS[settings.teams[0].color] }; },
  sync() { $('chat').classList.toggle('hidden', !this.available()); if (!this.available() && this.isOpen) this.close(); },
  open() {
    if (!this.available()) return;
    this.isOpen = true; $('chatForm').classList.remove('hidden'); $('chat').classList.add('open'); $('chatDot').classList.add('hidden');
    for (const k in Input.down) Input.down[k] = false;   // let go of any held game keys
    setTimeout(() => $('chatInput').focus(), 0);
  },
  close() { this.isOpen = false; $('chatForm').classList.add('hidden'); $('chat').classList.remove('open'); $('chatInput').blur(); },
  send(text) {
    text = text.trim().slice(0, 120); if (!text || !this.available()) return;
    const now = performance.now(); if (now - this.lastSend < 400) return; this.lastSend = now;
    const me = this.me(); Net.send(Net.role === 'host' ? { t: 'chat', host: 1, n: me.n, c: me.c, x: text } : { t: 'chat', pid: Net.pid, n: me.n, c: me.c, x: text }); this.add(me.n, me.c, text, true);
  },
  add(name, color, text, mine) {
    const log = $('chatLog'), d = document.createElement('div'), b = document.createElement('b');
    d.className = 'msg'; b.textContent = name + ':'; b.style.color = /^#[0-9a-f]{6}$/i.test(color || '') ? color : '#ffd23f';
    d.append(b, document.createTextNode(text)); log.appendChild(d);
    while (log.children.length > 6) log.firstChild.remove();
    if (!mine) { NET_FN['s.blip'](620, 2); if (!this.isOpen) $('chatDot').classList.remove('hidden'); }
  },
  reset() { this.close(); $('chatLog').innerHTML = ''; $('chatDot').classList.add('hidden'); $('chat').classList.add('hidden'); },
  init() {
    for (const q of this.QUICK) { const b = document.createElement('button'); b.type = 'button'; b.textContent = q; b.onclick = () => { this.send(q); this.close(); }; $('quickChat').appendChild(b); }
    $('chatBtn').onclick = () => (this.isOpen ? this.close() : this.open());
    $('chatClose').onclick = () => this.close();
    $('chatForm').onsubmit = e => { e.preventDefault(); this.send($('chatInput').value); $('chatInput').value = ''; this.close(); };
    $('chatInput').addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); this.close(); } e.stopPropagation(); });
  },
};
// Fullscreen: the Fullscreen API hides the address bar on Android/desktop; iPhone Safari has no
// element fullscreen, so there we point players to "Add to Home Screen" (the manifest opens it
// fullscreen, landscape).
const Full = {
  el: document.documentElement,
  supported() { return !!(this.el.requestFullscreen || this.el.webkitRequestFullscreen); },
  active() { return !!(document.fullscreenElement || document.webkitFullscreenElement); },
  standalone() { return navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches); },
  enter() {
    if (this.active() || !this.supported()) return;
    const p = this.el.requestFullscreen ? this.el.requestFullscreen({ navigationUI: 'hide' }) : this.el.webkitRequestFullscreen();
    if (p && p.then) p.then(() => { try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => { }); } catch (e) { } }).catch(() => { });
  },
  exit() { const f = document.exitFullscreen || document.webkitExitFullscreen; if (f && this.active()) try { f.call(document); } catch (e) { } },
  toggle() {
    if (!this.supported()) { if (!this.standalone()) banner(/iP(hone|od)/.test(navigator.userAgent) ? 'iPhone: Share → Add to Home Screen' : 'Fullscreen not supported here'); return; }
    this.active() ? this.exit() : this.enter();
  },
  auto() { if (UI.touch && !this.standalone()) this.enter(); },   // phones: go fullscreen when a match starts
  init() {
    const ios = /iP(hone|od|ad)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (ios && !this.supported() && !this.standalone()) $('iosTip').classList.remove('hidden');
    $('tFull').classList.toggle('hidden', this.standalone() || (!this.supported() && !ios));
    $('pauseFull').onclick = () => this.toggle();
    const upd = () => { $('tFull').classList.toggle('fs', this.active()); setTimeout(resize, 60); };
    document.addEventListener('fullscreenchange', upd); document.addEventListener('webkitfullscreenchange', upd);
    // home-screen icon for iOS: render the mascot to a PNG
    try {
      const cv = document.createElement('canvas'); cv.width = cv.height = 180; const x = cv.getContext('2d');
      const gr = x.createLinearGradient(0, 0, 0, 180); gr.addColorStop(0, '#5fa8e8'); gr.addColorStop(1, '#bfe3ff'); x.fillStyle = gr; x.fillRect(0, 0, 180, 180);
      x.fillStyle = '#4caf50'; x.fillRect(0, 140, 180, 40);
      const m = Object.assign(new Critter({ color: TEAM_COLORS[0] }, ''), { x: 90, y: 98, r: 40, facing: 1, mode: 'ground', px: 1, py: 0.5 });
      drawCritter(x, m, 0);
      const l = document.createElement('link'); l.rel = 'apple-touch-icon'; l.href = cv.toDataURL('image/png'); document.head.appendChild(l);
    } catch (e) { }
  },
};

