// ============================== ARSENAL ICONS ==============================
// Icons for the newer half of the arsenal. Same 40×40 design space as drawIcon; a few shared shapes first.
function iconBall(x, r, col, hi = 'rgba(255,255,255,0.45)') { circ(x, 0, 0, r); fs(x, col); x.fillStyle = hi; circ(x, -r * 0.35, -r * 0.35, r * 0.3); x.fill(); }
function iconFuse(x, px, py) { x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + 4, py - 7, px + 9, py - 6); x.stroke(); circ(x, px + 10, py - 6, 2.5); x.fillStyle = '#ffd23f'; x.fill(); }
function iconBanana(x, s = 1, rot = 0) {
  x.save(); x.rotate(rot); x.scale(s, s); x.lineWidth = 2.5 / s;
  x.beginPath(); x.moveTo(-15, -2); x.quadraticCurveTo(-4, 14, 13, 6); x.quadraticCurveTo(16, 8, 14, 11); x.quadraticCurveTo(-8, 18, -17, 2); x.closePath(); fs(x, '#ffd23f');
  x.fillStyle = '#6b4427'; circ(x, -16, 0, 2); x.fill(); circ(x, 14, 9, 1.6); x.fill(); x.restore();
}
function iconGun(x, len, col, barrelCol = '#5c6670', big = false) {
  x.beginPath(); x.moveTo(-14, 4); x.lineTo(-5, 0); x.lineTo(-2, 10); x.lineTo(-11, 13); x.closePath(); fs(x, '#8d5a2b');
  rr(x, -8, -4, len, big ? 7 : 5, 2); fs(x, barrelCol); if (col) { rr(x, -8, -10, 8, 7, 2); fs(x, col); }
}
function iconBird(x, col, beak) {
  x.beginPath(); x.ellipse(-3, 3, 13, 9, 0, 0, 7); fs(x, col); circ(x, 7, -7, 6); fs(x, col);
  x.beginPath(); x.moveTo(11, -8); x.lineTo(23, -4); x.lineTo(11, 0); x.closePath(); fs(x, beak);
  x.fillStyle = '#2b1d12'; circ(x, 8, -8, 1.4); x.fill(); x.beginPath(); x.moveTo(-10, 0); x.quadraticCurveTo(-2, -14, 4, 0); x.stroke();
}
function iconDrop(x, dy, type) { x.save(); x.translate(0, dy); x.scale(0.55, 0.55); drawIconMore(x, type); x.restore(); }
function iconCloudBg(x) { x.fillStyle = '#9aa3ad'; circ(x, -8, -6, 7); x.fill(); x.stroke(); circ(x, 3, -10, 9); x.fill(); x.stroke(); circ(x, 11, -4, 6); x.fill(); x.stroke(); }
function iconHog(x, col) { // a small critter silhouette for the animal weapons
  x.fillStyle = '#6b4427'; x.strokeStyle = '#3b2414'; x.lineWidth = 1;
  for (let i = 0; i < 7; i++) { const a = Math.PI * 0.75 + i * 0.26; x.beginPath(); x.moveTo(Math.cos(a - 0.15) * 9, 2 + Math.sin(a - 0.15) * 9); x.lineTo(Math.cos(a) * 16, 2 + Math.sin(a) * 16); x.lineTo(Math.cos(a + 0.15) * 9, 2 + Math.sin(a + 0.15) * 9); x.fill(); x.stroke(); }
  x.strokeStyle = '#2b1d12'; x.lineWidth = 2; circ(x, 0, 2, 10); fs(x, col || '#b5814f');
  x.fillStyle = '#f2d3a8'; x.beginPath(); x.ellipse(4, 4, 6, 7, 0, 0, 7); x.fill();
  x.fillStyle = '#fff'; circ(x, 3, -1, 3); x.fill(); circ(x, 8, 0, 2.6); x.fill(); x.fillStyle = '#111'; circ(x, 4, -1, 1.4); x.fill(); circ(x, 9, 0, 1.2); x.fill(); circ(x, 11, 4, 1.5); x.fill();
  x.lineWidth = 2.5;
}
function drawIconMore(x, id) {
  switch (id) {
    // ---- thrown ----
    case 'banana': iconBanana(x, 0.8, -0.5); iconBanana(x, 0.8, 0.4); break;
    case 'nana': iconBanana(x, 1, 0.2); break;
    case 'superbanana': iconBanana(x, 1.2, -0.2); x.fillStyle = '#ff4d6d'; x.font = 'bold 12px sans-serif'; x.textAlign = 'center'; x.fillText('MEGA', 0, -10); break;
    case 'holy':
      x.beginPath(); x.moveTo(-13, -4); x.quadraticCurveTo(-13, 18, 0, 20); x.quadraticCurveTo(13, 18, 13, -4); x.closePath(); fs(x, '#f4d35e');
      x.beginPath(); x.moveTo(-15, -4); x.quadraticCurveTo(0, -16, 15, -4); x.quadraticCurveTo(0, 0, -15, -4); x.closePath(); fs(x, '#c9a227');
      x.strokeStyle = '#ffd23f'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, -24); x.lineTo(0, -12); x.moveTo(-6, -18); x.lineTo(6, -18); x.stroke();
      x.strokeStyle = '#2b1d12'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(-4, 4); x.lineTo(4, 4); x.moveTo(0, 0); x.lineTo(0, 10); x.stroke(); break;
    case 'launcher': iconGun(x, 26, '#4caf50', '#5c6670', true); x.beginPath(); x.ellipse(20, -1, 6, 8, 0, 0, 7); fs(x, '#9a6332'); break;
    case 'glaunch': x.beginPath(); x.ellipse(0, 2, 9, 12, 0, 0, 7); fs(x, '#9a6332'); x.strokeStyle = '#5c3815'; x.lineWidth = 1.5; for (let r = -6; r <= 8; r += 5) { x.beginPath(); x.moveTo(-7, r); x.quadraticCurveTo(0, r + 4, 7, r); x.stroke(); } break;
    case 'molotov':
      rr(x, -7, -6, 14, 22, 4); fs(x, '#d62828'); rr(x, -3, -16, 6, 11, 2); fs(x, '#e8e8e8'); x.fillStyle = '#ffd23f'; x.fillRect(-6, 2, 12, 6);
      x.fillStyle = '#ff9f1c'; x.beginPath(); x.moveTo(-4, -16); x.quadraticCurveTo(0, -28, 4, -16); x.fill(); x.fillStyle = '#ff5400'; x.beginPath(); x.moveTo(-2, -16); x.quadraticCurveTo(0, -23, 2, -16); x.fill(); break;
    case 'gascan':
      rr(x, -9, -12, 18, 26, 4); fs(x, '#80b918'); rr(x, -5, -17, 10, 6, 2); fs(x, '#5c6670');
      x.fillStyle = '#2b1d12'; x.font = 'bold 12px sans-serif'; x.textAlign = 'center'; x.fillText('☠', 0, 6); break;
    case 'waterballoon': x.beginPath(); x.ellipse(0, 1, 12, 14, 0, 0, 7); fs(x, '#4cc9f0'); x.fillStyle = 'rgba(255,255,255,0.5)'; x.beginPath(); x.ellipse(-4, -5, 3.5, 5, -0.4, 0, 7); x.fill(); x.beginPath(); x.moveTo(-3, 15); x.lineTo(3, 15); x.lineTo(0, 18); x.closePath(); fs(x, '#4cc9f0'); break;
    case 'battery':
      rr(x, -8, -14, 16, 28, 3); fs(x, '#3a3a44'); rr(x, -4, -18, 8, 4, 1); fs(x, '#9aa3ad');
      x.fillStyle = '#ffd23f'; x.beginPath(); x.moveTo(2, -10); x.lineTo(-5, 2); x.lineTo(0, 2); x.lineTo(-2, 11); x.lineTo(6, -2); x.lineTo(1, -2); x.closePath(); x.fill();
      x.strokeStyle = '#ff4d6d'; x.lineWidth = 2; x.beginPath(); x.moveTo(10, -16); x.lineTo(14, -22); x.moveTo(12, -10); x.lineTo(18, -10); x.stroke(); x.strokeStyle = '#2b1d12'; x.lineWidth = 2.5; break;
    case 'starburst':
      rr(x, -5, -4, 10, 22, 2); fs(x, '#e63946'); x.beginPath(); x.moveTo(-5, -4); x.lineTo(0, -14); x.lineTo(5, -4); x.closePath(); fs(x, '#ffd23f');
      x.fillStyle = '#ffd23f'; x.strokeStyle = '#b8860b'; x.lineWidth = 1; for (const [sx, sy] of [[-14, -14], [12, -18], [16, -4], [-16, 2]]) { star(x, sx, sy, 4); x.fill(); x.stroke(); } x.strokeStyle = '#2b1d12'; x.lineWidth = 2.5; break;
    case 'star': x.fillStyle = '#ffd23f'; x.strokeStyle = '#b8860b'; x.lineWidth = 1.5; star(x, 0, 0, 12); x.fill(); x.stroke(); break;
    case 'fridge': rr(x, -11, -18, 22, 36, 3); fs(x, '#e8eef2'); x.beginPath(); x.moveTo(-11, -6); x.lineTo(11, -6); x.stroke(); x.fillStyle = '#5c6670'; x.fillRect(6, -14, 2.5, 6); x.fillRect(6, -2, 2.5, 10); break;
    case 'molebomb':
      circ(x, -2, 2, 11); fs(x, '#3a3a44'); x.beginPath(); x.moveTo(6, -4); x.lineTo(22, 2); x.lineTo(6, 8); x.closePath(); fs(x, '#9aa3ad');
      x.strokeStyle = '#5c6670'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(9, -1); x.lineTo(14, 1); x.moveTo(9, 5); x.lineTo(14, 3); x.stroke(); x.strokeStyle = '#2b1d12'; x.lineWidth = 2.5;
      x.fillStyle = '#fff'; circ(x, -6, -2, 2.5); x.fill(); circ(x, 1, -2, 2.5); x.fill(); x.fillStyle = '#111'; circ(x, -5, -2, 1.2); x.fill(); circ(x, 2, -2, 1.2); x.fill(); break;
    // ---- fired ----
    case 'bow':
      x.strokeStyle = '#a0703f'; x.lineWidth = 3.5; x.beginPath(); x.moveTo(-6, -18); x.quadraticCurveTo(12, 0, -6, 18); x.stroke();
      x.strokeStyle = '#2b1d12'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(-6, -18); x.lineTo(-6, 18); x.stroke();
      x.lineWidth = 2; x.beginPath(); x.moveTo(-16, 0); x.lineTo(10, 0); x.stroke(); x.beginPath(); x.moveTo(10, 0); x.lineTo(5, -3); x.lineTo(5, 3); x.closePath(); fs(x, '#9aa3ad'); break;
    case 'poisonarrow': case 'arrow': case 'parrow': {
      const p = id !== 'arrow';
      x.strokeStyle = '#a0703f'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(-18, 6); x.lineTo(12, -4); x.stroke();
      x.strokeStyle = '#2b1d12'; x.beginPath(); x.moveTo(12, -4); x.lineTo(5, -7); x.lineTo(7, -1); x.closePath(); fs(x, p ? '#80b918' : '#9aa3ad');
      x.beginPath(); x.moveTo(-18, 6); x.lineTo(-22, 1); x.lineTo(-15, 2); x.closePath(); x.moveTo(-18, 6); x.lineTo(-20, 12); x.lineTo(-14, 7); x.closePath(); fs(x, '#ff4d6d');
      if (p) { x.fillStyle = '#80b918'; circ(x, 14, 0, 2); x.fill(); circ(x, 10, 3, 1.5); x.fill(); }
      break;
    }
    case 'handgun': iconGun(x, 20, null); rr(x, -8, -4, 6, 8, 1); fs(x, '#3a3a44'); break;
    case 'uzi': iconGun(x, 22, '#3a3a44'); rr(x, 0, 1, 5, 12, 1); fs(x, '#3a3a44'); break;
    case 'minigun': iconGun(x, 26, '#5c6670', '#5c6670', true); x.strokeStyle = '#9aa3ad'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(-6, -1); x.lineTo(18, -1); x.moveTo(-6, 3); x.lineTo(18, 3); x.stroke(); x.strokeStyle = '#2b1d12'; x.lineWidth = 2.5; circ(x, -12, -12, 6); fs(x, '#9aa3ad'); break;
    case 'railgun': iconGun(x, 28, '#2b2b33', '#4cc9f0'); x.strokeStyle = '#fff'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(-6, -1.5); x.lineTo(18, -1.5); x.stroke(); x.strokeStyle = '#2b1d12'; x.lineWidth = 2.5; x.strokeStyle = '#4cc9f0'; x.beginPath(); x.moveTo(22, -2); x.lineTo(28, -8); x.moveTo(22, 0); x.lineTo(29, 0); x.moveTo(22, 2); x.lineTo(28, 8); x.stroke(); x.strokeStyle = '#2b1d12'; break;
    case 'magic':
      x.beginPath(); x.moveTo(-10, -4); x.quadraticCurveTo(-10, 14, 0, 16); x.quadraticCurveTo(10, 14, 10, -4); x.closePath(); fs(x, '#c77dff');
      x.beginPath(); x.moveTo(-12, -4); x.quadraticCurveTo(0, -13, 12, -4); x.quadraticCurveTo(0, -1, -12, -4); x.closePath(); fs(x, '#7b2cbf');
      x.fillStyle = '#fff'; x.strokeStyle = '#7b2cbf'; x.lineWidth = 1; for (const [sx, sy] of [[-16, -12], [15, -14], [14, 10]]) { star(x, sx, sy, 3.5); x.fill(); x.stroke(); } x.strokeStyle = '#2b1d12'; x.lineWidth = 2.5; break;
    case 'virus':
      circ(x, 0, 0, 10); fs(x, '#80b918'); x.strokeStyle = '#4d7c0f'; x.lineWidth = 2.5;
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; x.beginPath(); x.moveTo(Math.cos(a) * 10, Math.sin(a) * 10); x.lineTo(Math.cos(a) * 17, Math.sin(a) * 17); x.stroke(); circ(x, Math.cos(a) * 18, Math.sin(a) * 18, 2.5); x.fillStyle = '#4d7c0f'; x.fill(); }
      x.strokeStyle = '#2b1d12'; x.fillStyle = '#2b1d12'; circ(x, -3, -2, 1.8); x.fill(); circ(x, 3, -2, 1.8); x.fill(); x.beginPath(); x.moveTo(-3, 4); x.quadraticCurveTo(0, 1, 3, 4); x.stroke(); break;
    case 'dragon': case 'fireball':
      x.beginPath(); x.moveTo(-18, 0); x.quadraticCurveTo(-6, -14, 10, -8); x.quadraticCurveTo(20, 0, 10, 8); x.quadraticCurveTo(-6, 14, -18, 0); x.closePath(); fs(x, '#ff5400');
      x.fillStyle = '#ffd23f'; x.beginPath(); x.moveTo(-8, 0); x.quadraticCurveTo(0, -7, 10, -3); x.quadraticCurveTo(14, 0, 10, 3); x.quadraticCurveTo(0, 7, -8, 0); x.fill();
      x.fillStyle = '#fff'; circ(x, 7, 0, 3); x.fill(); break;
    case 'waterpistol': iconGun(x, 22, '#4cc9f0', '#4cc9f0'); x.fillStyle = '#4cc9f0'; for (let i = 0; i < 4; i++) { circ(x, 18 + i * 3, -1 + Math.sin(i) * 2, 1.5); x.fill(); } break;
    case 'dubstep':
      x.beginPath(); x.moveTo(-16, -4); x.lineTo(6, -12); x.lineTo(6, 12); x.lineTo(-16, 4); x.closePath(); fs(x, '#7b2cbf'); rr(x, -22, -5, 8, 10, 2); fs(x, '#3a3a44');
      x.strokeStyle = '#c77dff'; x.lineWidth = 2.5; for (let i = 0; i < 3; i++) { x.beginPath(); x.arc(8, 0, 6 + i * 5, -0.9, 0.9); x.stroke(); } x.strokeStyle = '#2b1d12'; break;
    // ---- melee ----
    case 'axe':
      x.strokeStyle = '#a0703f'; x.lineWidth = 4; x.beginPath(); x.moveTo(-14, 16); x.lineTo(10, -8); x.stroke(); x.strokeStyle = '#2b1d12'; x.lineWidth = 2.5;
      x.beginPath(); x.moveTo(4, -14); x.quadraticCurveTo(18, -16, 20, -2); x.quadraticCurveTo(12, 0, 8, 8); x.quadraticCurveTo(2, -2, 4, -14); x.closePath(); fs(x, '#9aa3ad'); break;
    case 'punch':
      rr(x, -10, -6, 20, 18, 6); fs(x, '#e09a6a'); for (let i = 0; i < 4; i++) { rr(x, -9 + i * 5, -12, 4.5, 10, 2); fs(x, '#e09a6a'); }
      x.fillStyle = '#ff9f1c'; x.beginPath(); x.moveTo(-12, -14); x.quadraticCurveTo(-4, -30, 0, -16); x.quadraticCurveTo(4, -28, 12, -14); x.fill();
      x.fillStyle = '#ff5400'; x.beginPath(); x.moveTo(-6, -14); x.quadraticCurveTo(0, -24, 6, -14); x.fill(); break;
    case 'prod': x.strokeStyle = '#a0703f'; x.lineWidth = 4; x.beginPath(); x.moveTo(-18, 10); x.lineTo(12, -6); x.stroke(); x.strokeStyle = '#2b1d12'; x.lineWidth = 2.5; circ(x, 14, -7, 4); fs(x, '#ff7aa2'); x.fillStyle = '#2b1d12'; x.font = 'bold 12px sans-serif'; x.textAlign = 'center'; x.fillText('?', -4, -10); break;
    case 'chainsaw':
      rr(x, -16, -6, 16, 14, 3); fs(x, '#ff7b39'); rr(x, -2, -3, 24, 7, 3); fs(x, '#9aa3ad');
      x.fillStyle = '#2b1d12'; for (let i = 0; i < 6; i++) { x.fillRect(i * 4, -5, 2, 2); x.fillRect(2 + i * 4, 4, 2, 2); } rr(x, -20, -2, 5, 6, 1); fs(x, '#2b1d12'); break;
    case 'kamikaze': iconHog(x); x.strokeStyle = '#e63946'; x.lineWidth = 3; x.beginPath(); x.moveTo(-10, -8); x.lineTo(10, -8); x.stroke(); x.strokeStyle = '#2b1d12'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(-18, 2); x.lineTo(-26, 2); x.moveTo(-18, -2); x.lineTo(-24, -5); x.moveTo(-18, 6); x.lineTo(-24, 9); x.stroke(); break;
    case 'suicide': iconHog(x); x.save(); x.translate(10, -14); x.scale(0.45, 0.45); drawIcon(x, 'dynamite', 40); x.restore(); break;
    // ---- sky & map ----
    case 'napalm': iconBird(x, '#fff', '#ff9f1c'); iconDrop(x, 14, 'molotov'); break;
    case 'minestrike': iconBird(x, '#fff', '#ff9f1c'); x.save(); x.translate(0, 16); x.fillStyle = '#3b3b45'; x.beginPath(); x.ellipse(0, 1, 8, 5, 0, 0, 7); x.fill(); x.stroke(); x.fillStyle = '#ff2a2a'; circ(x, 0, -2, 2.5); x.fill(); x.restore(); break;
    case 'cratestrike': iconBird(x, '#fff', '#ff9f1c'); x.save(); x.translate(0, 16); x.scale(0.8, 0.8); rr(x, -9, -9, 18, 18, 2); fs(x, '#b5814f'); x.beginPath(); x.moveTo(-9, -9); x.lineTo(9, 9); x.moveTo(9, -9); x.lineTo(-9, 9); x.stroke(); x.restore(); break;
    case 'poisonstrike': iconBird(x, '#cfe7a0', '#80b918'); iconDrop(x, 15, 'gascan'); break;
    case 'waterstrike': iconBird(x, '#bde0fe', '#4cc9f0'); iconDrop(x, 15, 'waterballoon'); break;
    case 'frogstrike': iconBird(x, '#fff', '#ff9f1c'); x.save(); x.translate(0, 15); x.scale(0.45, 0.45); drawIcon(x, 'frog', 40); x.restore(); break;
    case 'homingstrike': iconBird(x, '#fff', '#ff9f1c'); x.save(); x.translate(0, 14); x.scale(0.4, 0.4); drawIcon(x, 'egg', 40); x.restore(); x.strokeStyle = '#ff4d6d'; x.lineWidth = 2; circ(x, 0, 14, 10); x.stroke(); x.beginPath(); x.moveTo(-14, 14); x.lineTo(-8, 14); x.moveTo(8, 14); x.lineTo(14, 14); x.stroke(); x.strokeStyle = '#2b1d12'; x.lineWidth = 2.5; break;
    case 'molestrike': iconBird(x, '#fff', '#ff9f1c'); iconDrop(x, 15, 'molebomb'); break;
    case 'carpet': case 'rug':
      if (id === 'carpet') { iconBird(x, '#fff', '#ff9f1c'); x.save(); x.translate(0, 15); x.scale(0.6, 0.6); }
      rr(x, -16, -7, 32, 14, 7); fs(x, '#c1121f'); x.strokeStyle = '#ffd23f'; x.lineWidth = 2; x.beginPath(); x.moveTo(-10, -7); x.lineTo(-10, 7); x.moveTo(-3, -7); x.lineTo(-3, 7); x.moveTo(4, -7); x.lineTo(4, 7); x.stroke(); x.strokeStyle = '#2b1d12'; x.lineWidth = 2.5; circ(x, 12, 0, 5); fs(x, '#8a0a16');
      if (id === 'carpet') x.restore(); break;
    case 'comet':
      x.fillStyle = 'rgba(255,159,28,0.5)'; x.beginPath(); x.moveTo(-6, -10); x.lineTo(-26, -26); x.lineTo(-10, -4); x.closePath(); x.fill();
      x.beginPath(); x.moveTo(-10, -10); x.lineTo(-24, -20); x.lineTo(-4, -6); x.closePath(); x.fillStyle = '#ffd23f'; x.fill();
      circ(x, 2, 2, 12); fs(x, '#5a4a4a'); x.fillStyle = '#ff9f1c'; circ(x, -2, -1, 3.5); x.fill(); x.fillStyle = '#8a7a7a'; circ(x, 6, 5, 3); x.fill(); break;
    case 'ion':
      x.fillStyle = 'rgba(255,255,255,0.6)'; x.fillRect(-5, -22, 10, 36); x.fillStyle = '#fff'; x.fillRect(-2, -22, 4, 36);
      rr(x, -14, -22, 28, 8, 3); fs(x, '#5c6670'); x.fillStyle = '#4cc9f0'; circ(x, -8, -18, 2); x.fill(); circ(x, 0, -18, 2); x.fill(); circ(x, 8, -18, 2); x.fill();
      x.beginPath(); x.ellipse(0, 14, 14, 4, 0, 0, 7); fs(x, '#ff9f1c'); break;
    case 'buster':
      x.save(); x.rotate(Math.PI / 2); x.beginPath(); x.moveTo(-14, -6); x.lineTo(8, -6); x.lineTo(17, 0); x.lineTo(8, 6); x.lineTo(-14, 6); x.closePath(); fs(x, '#5c6670');
      x.beginPath(); x.moveTo(-14, -6); x.lineTo(-19, -11); x.lineTo(-19, 11); x.lineTo(-14, 6); fs(x, '#ffd23f'); x.restore();
      x.strokeStyle = '#5c6670'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(-4, 10); x.lineTo(4, 13); x.moveTo(-4, 14); x.lineTo(4, 17); x.stroke(); x.strokeStyle = '#2b1d12'; x.lineWidth = 2.5; break;
    case 'nuke':
      x.beginPath(); x.ellipse(0, 4, 11, 14, 0, 0, 7); fs(x, '#9a6332'); x.strokeStyle = '#5c3815'; x.lineWidth = 1.8; for (let r = -6; r <= 12; r += 5) { x.beginPath(); x.moveTo(-9, r); x.quadraticCurveTo(0, r + 5, 9, r); x.stroke(); }
      x.strokeStyle = '#2b1d12'; x.lineWidth = 2.5; circ(x, 0, -14, 8); fs(x, '#ffd23f'); x.fillStyle = '#2b1d12';
      for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + i * 2.094; x.beginPath(); x.moveTo(0, -14); x.arc(0, -14, 7, a - 0.5, a + 0.5); x.closePath(); x.fill(); } circ(x, 0, -14, 1.8); x.fillStyle = '#ffd23f'; x.fill(); break;
    case 'abduct':
      x.beginPath(); x.ellipse(0, -8, 18, 6, 0, 0, 7); fs(x, '#9aa3ad'); x.beginPath(); x.arc(0, -10, 8, Math.PI, 0); fs(x, '#8ef');
      x.fillStyle = 'rgba(140,238,255,0.45)'; x.beginPath(); x.moveTo(-6, -4); x.lineTo(6, -4); x.lineTo(14, 18); x.lineTo(-14, 18); x.closePath(); x.fill();
      x.save(); x.translate(0, 8); x.scale(0.5, 0.5); iconHog(x); x.restore(); break;
    // ---- critters ----
    case 'squirrel':
      x.fillStyle = '#e63946'; x.beginPath(); x.moveTo(-6, -8); x.lineTo(-22, -2); x.lineTo(-20, 10); x.lineTo(-6, 4); x.closePath(); x.fill(); x.stroke();
      x.beginPath(); x.ellipse(2, 0, 13, 8, 0, 0, 7); fs(x, '#a0703f'); circ(x, 13, -4, 6); fs(x, '#a0703f');
      x.beginPath(); x.moveTo(-10, 2); x.quadraticCurveTo(-20, 16, -4, 14); x.quadraticCurveTo(-10, 10, -8, 4); x.closePath(); fs(x, '#8a5a34');
      x.fillStyle = '#fff'; circ(x, 15, -5, 2.4); x.fill(); x.fillStyle = '#111'; circ(x, 16, -5, 1.2); x.fill(); x.beginPath(); x.moveTo(10, -10); x.lineTo(12, -14); x.lineTo(14, -10); fs(x, '#a0703f'); break;
    case 'cows':
      x.beginPath(); x.ellipse(-2, 2, 15, 10, 0, 0, 7); fs(x, '#fff'); x.fillStyle = '#2b1d12'; x.beginPath(); x.ellipse(-6, 0, 5, 4, 0.4, 0, 7); x.fill(); x.beginPath(); x.ellipse(5, 5, 4, 3, -0.3, 0, 7); x.fill();
      rr(x, 8, -8, 12, 11, 4); fs(x, '#fff'); x.fillStyle = '#ff7aa2'; rr(x, 12, -3, 8, 5, 2); x.fill(); x.stroke();
      x.strokeStyle = '#2b1d12'; x.beginPath(); x.moveTo(10, -8); x.lineTo(8, -14); x.moveTo(18, -8); x.lineTo(20, -14); x.stroke(); x.fillStyle = '#111'; circ(x, 12, -5, 1.2); x.fill();
      x.beginPath(); x.moveTo(-10, 11); x.lineTo(-10, 17); x.moveTo(-2, 11); x.lineTo(-2, 17); x.moveTo(6, 11); x.lineTo(6, 17); x.stroke(); break;
    case 'granny':
      iconHog(x); x.fillStyle = '#c77dff'; x.beginPath(); x.arc(-6, -8, 7, Math.PI, 0); x.fill(); x.stroke(); x.fillStyle = '#ffd23f'; circ(x, -6, -15, 2); x.fill();
      x.strokeStyle = '#2b1d12'; x.lineWidth = 1.5; circ(x, 3, -1, 4); x.stroke(); circ(x, 8, 0, 3.6); x.stroke(); x.lineWidth = 2.5;
      rr(x, 10, 6, 10, 9, 2); fs(x, '#e63946'); x.beginPath(); x.moveTo(12, 6); x.quadraticCurveTo(15, 0, 18, 6); x.stroke(); break;
    case 'rhino':
      x.beginPath(); x.ellipse(-3, 3, 15, 10, 0, 0, 7); fs(x, '#5c6670'); circ(x, 12, -1, 7); fs(x, '#5c6670');
      x.beginPath(); x.moveTo(15, -6); x.lineTo(24, -16); x.lineTo(19, -3); x.closePath(); fs(x, '#e8eef2');
      x.beginPath(); x.moveTo(-10, 12); x.lineTo(-10, 18); x.moveTo(-2, 12); x.lineTo(-2, 18); x.moveTo(6, 11); x.lineTo(6, 18); x.stroke(); x.fillStyle = '#111'; circ(x, 11, -3, 1.4); x.fill(); break;
    case 'ferrets':
      for (let i = 0; i < 3; i++) { x.save(); x.translate(-10 + i * 10, -8 + i * 8); x.beginPath(); x.ellipse(0, 0, 11, 4.5, -0.3, 0, 7); fs(x, i % 2 ? '#d9b991' : '#8d5a2b'); circ(x, 9, -3, 3.5); fs(x, i % 2 ? '#d9b991' : '#8d5a2b'); x.fillStyle = '#111'; circ(x, 10, -4, 1); x.fill(); x.restore(); } break;
    case 'boar':
      x.beginPath(); x.ellipse(-2, 2, 16, 11, 0, 0, 7); fs(x, '#5a3a24'); circ(x, 13, 0, 8); fs(x, '#5a3a24');
      x.fillStyle = '#ff7aa2'; circ(x, 19, 2, 3); x.fill(); x.stroke(); x.fillStyle = '#e8eef2'; x.beginPath(); x.moveTo(16, 4); x.lineTo(22, 10); x.lineTo(14, 7); x.closePath(); x.fill(); x.stroke();
      x.fillStyle = '#111'; circ(x, 12, -3, 1.4); x.fill(); x.fillStyle = '#3a2414'; for (let i = -12; i < 8; i += 4) { x.beginPath(); x.moveTo(i, -8); x.lineTo(i + 2, -14); x.lineTo(i + 4, -8); x.fill(); }
      x.beginPath(); x.moveTo(-10, 12); x.lineTo(-10, 18); x.moveTo(-2, 12); x.lineTo(-2, 18); x.moveTo(6, 12); x.lineTo(6, 18); x.stroke(); break;
    // ---- placed ----
    case 'megamine':
      x.fillStyle = '#3b3b45'; x.beginPath(); x.ellipse(0, 4, 17, 11, 0, 0, 7); x.fill(); x.stroke(); x.fillStyle = '#ff2a2a'; circ(x, 0, -4, 5); x.fill(); x.stroke();
      x.fillStyle = 'rgba(255,40,40,0.3)'; circ(x, 0, -4, 10); x.fill(); x.fillStyle = '#ffd23f'; x.font = 'bold 9px sans-serif'; x.textAlign = 'center'; x.fillText('MEGA', 0, 10); break;
    case 'c4':
      rr(x, -14, -8, 28, 18, 3); fs(x, '#d9d2b0'); x.fillStyle = '#2b1d12'; x.font = 'bold 11px sans-serif'; x.textAlign = 'center'; x.fillText('FIZZ', 0, 5);
      rr(x, -4, -14, 8, 6, 1); fs(x, '#5c6670'); x.fillStyle = (Math.floor(performance.now() / 300) % 2) ? '#ff2a2a' : '#661010'; circ(x, 0, -11, 1.8); x.fill(); break;
    case 'teapot':
      x.beginPath(); x.ellipse(0, 4, 14, 10, 0, 0, 7); fs(x, '#e8eef2'); rr(x, -5, -12, 10, 5, 2); fs(x, '#e8eef2'); circ(x, 0, -14, 2.5); fs(x, '#4cc9f0');
      x.beginPath(); x.moveTo(12, 0); x.quadraticCurveTo(24, -4, 22, -12); x.stroke(); x.beginPath(); x.moveTo(-13, -2); x.quadraticCurveTo(-24, 0, -14, 10); x.stroke();
      x.strokeStyle = '#4cc9f0'; x.lineWidth = 2; x.beginPath(); x.moveTo(-8, 2); x.quadraticCurveTo(0, -2, 8, 2); x.stroke(); x.strokeStyle = '#2b1d12'; x.lineWidth = 2.5; break;
    case 'sentry':
      rr(x, -14, 6, 28, 8, 3); fs(x, '#5c6670'); circ(x, 0, 0, 9); fs(x, '#9aa3ad'); rr(x, 0, -4, 20, 7, 2); fs(x, '#3a3a44');
      x.fillStyle = '#ff2a2a'; circ(x, -2, -2, 2.5); x.fill(); x.strokeStyle = '#ff4d6d'; x.lineWidth = 1.2; x.setLineDash([2, 3]); x.beginPath(); x.moveTo(20, -1); x.lineTo(28, -3); x.stroke(); x.setLineDash([]); x.strokeStyle = '#2b1d12'; x.lineWidth = 2.5; break;
    case 'gaspump':
      rr(x, -10, -4, 20, 20, 3); fs(x, '#80b918'); rr(x, -4, -12, 8, 9, 2); fs(x, '#5c6670'); x.beginPath(); x.moveTo(10, 2); x.lineTo(18, 2); x.lineTo(18, -10); x.stroke();
      x.fillStyle = 'rgba(138,201,38,0.6)'; circ(x, 18, -14, 5); x.fill(); circ(x, 24, -20, 4); x.fill(); circ(x, 16, -22, 3); x.fill(); break;
    // ---- utilities ----
    case 'parachute':
      x.beginPath(); x.arc(0, -4, 17, Math.PI, 0); x.quadraticCurveTo(8, 0, 0, -4); x.quadraticCurveTo(-8, 0, -17, -4); fs(x, '#fff');
      x.strokeStyle = '#555'; x.lineWidth = 1; x.beginPath(); x.moveTo(-15, -4); x.lineTo(0, 14); x.moveTo(15, -4); x.lineTo(0, 14); x.moveTo(-5, -3); x.lineTo(0, 14); x.moveTo(5, -3); x.lineTo(0, 14); x.stroke();
      x.strokeStyle = '#2b1d12'; x.lineWidth = 2.5; x.fillStyle = '#ffd23f'; for (let i = 0; i < 6; i++) { circ(x, Math.cos(i) * 10, -8 + Math.sin(i * 2) * 4, 1.5); x.fill(); } break;
    case 'lowgrav':
      rr(x, -16, 2, 14, 12, 4); fs(x, '#9aa3ad'); rr(x, 2, 2, 14, 12, 4); fs(x, '#9aa3ad'); x.fillStyle = '#4cc9f0'; x.fillRect(-14, 4, 10, 3); x.fillRect(4, 4, 10, 3);
      circ(x, 0, -12, 8); fs(x, '#f4f1ea'); x.fillStyle = '#c8c4b8'; circ(x, -3, -14, 2); x.fill(); circ(x, 3, -9, 1.5); x.fill(); break;
    case 'fastwalk':
      rr(x, -16, -6, 24, 12, 4); fs(x, '#e63946'); x.beginPath(); x.moveTo(8, -6); x.lineTo(14, -14); x.lineTo(16, -4); x.closePath(); fs(x, '#e63946');
      circ(x, -10, 10, 4); fs(x, '#ffd23f'); circ(x, 2, 10, 4); fs(x, '#ffd23f'); x.strokeStyle = '#2b1d12'; x.beginPath(); x.moveTo(-24, -4); x.lineTo(-19, -4); x.moveTo(-26, 0); x.lineTo(-19, 0); x.moveTo(-24, 4); x.lineTo(-19, 4); x.stroke(); break;
    case 'laser': iconGun(x, 20, '#2b2b33'); x.strokeStyle = '#ff2a2a'; x.lineWidth = 1.5; x.setLineDash([3, 3]); x.beginPath(); x.moveTo(12, -1); x.lineTo(28, -1); x.stroke(); x.setLineDash([]); x.fillStyle = '#ff2a2a'; circ(x, 27, -1, 2.5); x.fill(); x.strokeStyle = '#2b1d12'; x.lineWidth = 2.5; break;
    case 'dbldmg': x.fillStyle = '#e63946'; x.strokeStyle = '#2b1d12'; x.lineWidth = 2; x.font = 'bold 26px sans-serif'; x.textAlign = 'center'; x.strokeText('×2', 0, 9); x.fillText('×2', 0, 9); x.lineWidth = 2.5; break;
    case 'dbltime':
      circ(x, 0, 2, 15); fs(x, '#fff'); x.beginPath(); x.moveTo(0, 2); x.lineTo(0, -8); x.moveTo(0, 2); x.lineTo(7, 5); x.stroke(); rr(x, -4, -19, 8, 4, 1); fs(x, '#e63946');
      x.fillStyle = '#e63946'; x.font = 'bold 10px sans-serif'; x.textAlign = 'center'; x.fillText('+', 18, -8); break;
    case 'cratespy':
      rr(x, -12, -12, 24, 24, 2); fs(x, '#b5814f'); x.beginPath(); x.moveTo(-12, -12); x.lineTo(12, 12); x.moveTo(12, -12); x.lineTo(-12, 12); x.stroke();
      circ(x, 10, 8, 9); fs(x, 'rgba(255,255,255,0.8)'); x.lineWidth = 3; x.beginPath(); x.moveTo(16, 14); x.lineTo(24, 22); x.stroke(); x.lineWidth = 2.5; break;
    case 'crateshower':
      for (const [dx, dy, s] of [[-12, -10, 0.5], [10, -14, 0.45], [0, 4, 0.7]]) { x.save(); x.translate(dx, dy); x.scale(s, s); x.lineWidth = 2.5 / s; rr(x, -12, -12, 24, 24, 2); fs(x, '#b5814f'); x.beginPath(); x.moveTo(-12, -12); x.lineTo(12, 12); x.moveTo(12, -12); x.lineTo(-12, 12); x.stroke(); x.restore(); } break;
    case 'selectcritter': iconHog(x); x.strokeStyle = '#ffd23f'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(0, -24); x.lineTo(-6, -18); x.lineTo(6, -18); x.closePath(); x.fillStyle = '#ffd23f'; x.fill(); x.strokeStyle = '#2b1d12'; x.stroke(); break;
    case 'hibernate':
      x.globalAlpha = 0.6; rr(x, -16, -16, 32, 32, 4); fs(x, '#bfe9ff'); x.globalAlpha = 1; x.save(); x.scale(0.75, 0.75); iconHog(x); x.restore();
      x.fillStyle = '#5a6b8c'; x.font = 'bold 12px sans-serif'; x.textAlign = 'center'; x.fillText('z', 12, -10); x.fillText('Z', 17, -17); break;
    case 'ferret':
      x.beginPath(); x.ellipse(-2, 2, 14, 6, 0, 0, 7); fs(x, '#d9b991'); circ(x, 11, -2, 5); fs(x, '#d9b991'); x.fillStyle = '#8d5a2b'; x.beginPath(); x.ellipse(-2, 2, 9, 3.5, 0, 0, 7); x.fill();
      x.fillStyle = '#111'; circ(x, 13, -3, 1.3); x.fill(); x.fillStyle = '#ff7aa2'; circ(x, 16, -1, 1.2); x.fill(); x.beginPath(); x.moveTo(-15, 2); x.quadraticCurveTo(-24, -4, -22, -12); x.stroke(); break;
    default:
      x.fillStyle = '#5a6b8c'; x.font = 'bold 20px sans-serif'; x.textAlign = 'center'; x.fillText('?', 0, 7);
  }
}
