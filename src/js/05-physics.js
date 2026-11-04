// ============================== PHYSICS ==============================
const CIRC12 = Array.from({ length: 12 }, (_, i) => [Math.cos(i * Math.PI / 6), Math.sin(i * Math.PI / 6)]);
const CIRC6 = Array.from({ length: 6 }, (_, i) => [Math.cos(i * Math.PI / 3), Math.sin(i * Math.PI / 3)]);

// Approximate circle-vs-bitmap overlap: test the centre, a ring of perimeter points and
// (for bigger bodies) an inner ring so thin girders can't slip between samples.
function circleHits(x, y, r) {
  const T = Terrain;
  if (T.solid(x, y)) return true;
  const pts = r > 5 ? CIRC12 : CIRC6;
  for (let i = 0; i < pts.length; i++) if (T.solid(x + pts[i][0] * r, y + pts[i][1] * r)) return true;
  if (r > 6) for (let i = 0; i < 12; i += 2) if (T.solid(x + CIRC12[i][0] * r * 0.55, y + CIRC12[i][1] * r * 0.55)) return true;
  return false;
}

// Surface normal at a contact point. We sum the offsets of every solid pixel inside a disc
// around the point; that sum points from the point toward the "centre of mass" of nearby
// ground, so its negation points out of the ground. On a flat floor all solid pixels lie
// below → normal (0,-1); on a slope the mass shifts sideways and the normal tilts with it.
// Averaging over an area smooths out the 1-px staircase a finite-difference gradient would see.
function normalAt(x, y, r) {
  const R = r + 3, step = R > 9 ? 2 : 1, R2 = R * R;
  let sx = 0, sy = 0;
  for (let dy = -R; dy <= R; dy += step) for (let dx = -R; dx <= R; dx += step) {
    if (dx * dx + dy * dy > R2) continue;
    if (Terrain.solid(x + dx, y + dy)) { sx += dx; sy += dy; }
  }
  const l = Math.hypot(sx, sy);
  return l < 1e-6 ? { x: 0, y: -1 } : { x: -sx / l, y: -sy / l };
}

// Integrate one body for dt with gravity + wind, sub-stepping so fast objects can't tunnel.
// On contact the velocity is split into normal & tangential parts: the normal part is
// reflected and scaled by `bounce`, the tangential part damped by `friction`.
// Pure w.r.t. the world (only touches `b`), so the AI reuses it to predict shots.
function moveBody(b, dt) {
  b.vy += CFG.G * b.grav * dt;
  b.vx += g.wind * CFG.WIND_ACC * b.windF * dt;
  const dx = b.vx * dt, dy = b.vy * dt, d = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(d / Math.max(1.5, b.r * 0.5)));
  const sx = dx / steps, sy = dy / steps;
  b.hit = null;
  for (let i = 0; i < steps; i++) {
    const nx = b.x + sx, ny = b.y + sy;
    if (circleHits(nx, ny, b.r)) {
      const n = normalAt(nx, ny, b.r), vn = b.vx * n.x + b.vy * n.y;
      b.hit = { nx: n.x, ny: n.y, speed: Math.max(0, -vn), x: nx, y: ny };
      if (vn < 0) {
        const tx = b.vx - vn * n.x, ty = b.vy - vn * n.y;
        b.vx = tx * (1 - b.friction) - vn * n.x * b.bounce;
        b.vy = ty * (1 - b.friction) - vn * n.y * b.bounce;
      }
      // slide: keep the tangential part of this sub-step (plus a hair of separation along n)
      // so bodies glide down walls and slopes instead of sticking at the first contact
      const dn = sx * n.x + sy * n.y, gx = b.x + sx - dn * n.x + n.x * 0.3, gy = b.y + sy - dn * n.y + n.y * 0.3;
      if (!circleHits(gx, gy, b.r)) { b.x = gx; b.y = gy; }
      break;
    }
    b.x = nx; b.y = ny;
  }
}
function pushOut(b) {
  for (let i = 0; i < b.r * 2 && circleHits(b.x, b.y, b.r); i++) { const n = normalAt(b.x, b.y, b.r); b.x += n.x; b.y += n.y; }
  let k = 0; while (circleHits(b.x, b.y, b.r) && k++ < 80) b.y -= 1;
}
function settle(b) { for (let i = 0; i < 5 && !circleHits(b.x, b.y + 1, b.r); i++) b.y += 1; }

// Walk one pixel sideways, hugging the ground: climb up to CLIMB px for small steps,
// step down slopes, report walls and ledges.
function walkStep(b, dir) {
  const nx = b.x + dir; let ny = b.y;
  if (circleHits(nx, ny, b.r)) {
    let ok = false;
    for (let k = 1; k <= CFG.CLIMB; k++) if (!circleHits(nx, ny - k, b.r)) { ny -= k; ok = true; break; }
    if (!ok) return 'wall';
  } else {
    let k = 0; while (k <= CFG.CLIMB && !circleHits(nx, ny + 1, b.r)) { ny++; k++; }
    if (k > CFG.CLIMB) { b.x = nx; b.y = ny; return 'fall'; }
  }
  b.x = nx; b.y = ny; return 'ok';
}
// Would something at (x,y) drop straight into the water / off the map?
function willFall(x, y) {
  if (x < 0 || x >= CFG.W) return true;
  for (let yy = Math.max(0, y); yy < g.waterY; yy += 3) if (Terrain.solid(x, yy)) return false;
  return true;
}
function lineClear(x0, y0, x1, y1) {
  const d = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(d / 3);
  for (let i = 1; i < n; i++) if (Terrain.solid(lerp(x0, x1, i / n), lerp(y0, y1, i / n))) return false;
  return true;
}

