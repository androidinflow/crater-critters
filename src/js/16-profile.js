// ============================== PROFILE + LEADERBOARD ==============================
// One profile per device: a random id + secret in localStorage, a display name, and
// match results pushed to Supabase through two RPCs (cc_set_name, cc_report_match).
// Results that fail to send (offline) are queued and retried on the next boot.
const Profile = {
  KEY: 'cc_profile', QKEY: 'cc_profile_queue', data: null, nameT: 0,
  load() {
    if (this.data) return this.data;
    try { this.data = JSON.parse(localStorage.getItem(this.KEY)); } catch (e) { this.data = null; }
    if (!this.data || !this.data.id || !this.data.secret) { this.data = { id: this.uuid(), secret: this.uuid() + this.uuid().slice(0, 8), name: '' }; this.save(); }
    return this.data;
  },
  save() { try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); } catch (e) { } },
  uuid() { return crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : r & 3 | 8).toString(16); }); },
  name() { const d = this.load(); return (d.name || (settings.teams[0] && settings.teams[0].name) || 'Friend').trim().slice(0, 20) || 'Friend'; },
  setName(n) {
    this.load().name = String(n).slice(0, 20); this.save();
    clearTimeout(this.nameT); this.nameT = setTimeout(() => this.rpc('cc_set_name', { p_id: this.data.id, p_secret: this.data.secret, p_name: this.name() }).catch(() => { }), 900);
  },
  async rpc(fn, body) {
    const r = await fetch(`${SUPA.url}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: SUPA.key, Authorization: `Bearer ${SUPA.key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(`${fn}: HTTP ${r.status}`);
  },
  // Which teams are "mine"? Online: the one I control. Local: every human team, but only
  // when there is an AI to beat (hot-seat between friends is not a ranked result).
  myTeams() {
    if (g.online) return Net.myTeam >= 0 && g.teams[Net.myTeam] ? [g.teams[Net.myTeam]] : [];
    return g.teams.some(t => t.ai) ? g.teams.filter(t => !t.ai) : [];
  },
  report() {
    if (g.reported) return; g.reported = true;
    const mine = this.myTeams(); if (!mine.length) { $('overProfile').textContent = ''; return; }
    const d = this.load(), won = !!g.winner && mine.includes(g.winner);
    const weapons = {}; for (const t of mine) for (const k in (t.used || {})) weapons[k] = (weapons[k] || 0) + t.used[k];
    const body = { p_id: d.id, p_secret: d.secret, p_name: this.name(), p_won: won, p_online: !!g.online,
      p_map: g.mapStyle || Terrain.style || '', p_theme: g.theme || Terrain.themeName || '', p_scheme: g.schemeName || '',
      p_teams: g.teams.length, p_kills: mine.reduce((a, t) => a + t.kills, 0), p_damage: Math.round(mine.reduce((a, t) => a + t.dmg, 0)), p_weapons: weapons };
    $('overProfile').textContent = `${won ? 'Win' : 'Loss'} recorded for ${this.name()}.`;
    this.send(body);
  },
  send(body) {
    this.rpc('cc_report_match', body).then(() => this.flush()).catch(() => this.queue(body));
  },
  queue(body) { try { const q = JSON.parse(localStorage.getItem(this.QKEY) || '[]'); q.push(body); localStorage.setItem(this.QKEY, JSON.stringify(q.slice(-20))); } catch (e) { } },
  flush() {
    let q = []; try { q = JSON.parse(localStorage.getItem(this.QKEY) || '[]'); } catch (e) { }
    if (!q.length) return;
    try { localStorage.removeItem(this.QKEY); } catch (e) { }
    for (const b of q) this.rpc('cc_report_match', b).catch(() => this.queue(b));
  },
  async openBoard() {
    const d = this.load(); $('board').classList.remove('hidden'); if (g.state === 'menu') $('menu').classList.add('hidden');
    const list = $('boardList'); list.innerHTML = '<p class="small center">Loading…</p>'; $('boardMe').textContent = '';
    try {
      const r = await fetch(`${SUPA.url}/rest/v1/cc_leaderboard?select=*&order=wins.desc,games.asc,updated_at.desc&limit=50`, { headers: { apikey: SUPA.key, Authorization: `Bearer ${SUPA.key}` } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const rows = await r.json();
      const me = rows.find(p => p.id === d.id);
      $('boardMe').textContent = me ? `You: ${me.wins} win${me.wins === 1 ? '' : 's'} in ${me.games} game${me.games === 1 ? '' : 's'} · ${me.kills} KOs · ${me.damage} damage · favourite: ${this.wname(me.fav_weapon)}` : 'Play a match against the AI or online to get on the board.';
      if (!rows.length) { list.innerHTML = '<p class="small center">Nobody yet. Be the first!</p>'; return; }
      const tbl = document.createElement('table'); const head = tbl.insertRow();
      for (const [h, num] of [['#', 1], ['Player', 0], ['Wins', 1], ['Games', 1], ['Win %', 1], ['Online', 1], ['KOs', 1], ['Damage', 1], ['Favourite', 0]]) { const th = document.createElement('th'); th.textContent = h; if (num) th.className = 'num'; head.appendChild(th); }
      rows.forEach((p, i) => {
        const tr = tbl.insertRow(); if (p.id === d.id) tr.className = 'me';
        const cells = [[i + 1, 1], [p.name, 0], [p.wins, 1], [p.games, 1], [p.games ? Math.round(p.wins / p.games * 100) + '%' : '–', 1], [`${p.online_wins}/${p.online_games}`, 1], [p.kills, 1], [p.damage, 1], [this.wname(p.fav_weapon), 0]];
        for (const [v, num] of cells) { const td = tr.insertCell(); td.textContent = v; if (num) td.className = 'num'; }
      });
      list.innerHTML = ''; list.appendChild(tbl);
    } catch (e) { list.innerHTML = '<p class="small center">Could not load the leaderboard. Check your connection and try again.</p>'; }
  },
  wname(id) { return id && WEAP[id] ? WEAP[id].name : '–'; },
};
$('boardBtn').onclick = () => { Sfx.init(); Profile.openBoard(); };
$('boardClose').onclick = () => { $('board').classList.add('hidden'); if (g.state === 'menu') $('menu').classList.remove('hidden'); };
$('overBoardBtn').onclick = () => Profile.openBoard();
$('profName').value = Profile.load().name;
$('profName').oninput = e => Profile.setName(e.target.value);
Profile.flush();

