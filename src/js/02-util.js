// ============================== UTIL ==============================
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.random() * arr.length | 0];
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function smooth(e0, e1, x) { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); }
function mulberry32(a) {
  return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function hash2(x, y) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
// 1D value noise in [-1, 1] with smoothstep interpolation
function noise1(rng) {
  const v = new Float32Array(1024); for (let i = 0; i < 1024; i++) v[i] = rng() * 2 - 1;
  return x => { const xi = Math.floor(x), f = x - xi, s = f * f * (3 - 2 * f);
    const a = v[xi & 1023], b = v[(xi + 1) & 1023]; return a + (b - a) * s; };
}
// 2D value noise in [0, 1]
function noise2(rng) {
  const N = 256, v = new Float32Array(N * N); for (let i = 0; i < v.length; i++) v[i] = rng();
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const x0 = xi & 255, x1 = (xi + 1) & 255, y0 = (yi & 255) * N, y1 = ((yi + 1) & 255) * N;
    const a = v[y0 + x0], b = v[y0 + x1], c = v[y1 + x0], d = v[y1 + x1];
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
}
// Fractal (layered) noise: octaves at doubling frequency, halving amplitude
function fbm(n, x, oct) { let s = 0, a = 1, f = 1, t = 0;
  for (let i = 0; i < oct; i++) { s += n(x * f + i * 31.7) * a; t += a; a *= 0.5; f *= 2.03; } return s / t; }
function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function shade(h, k) { const [r, g, b] = hexToRgb(h); const f = c => clamp(Math.round(k > 0 ? c + (255 - c) * k : c * (1 + k)), 0, 255);
  return `rgb(${f(r)},${f(g)},${f(b)})`; }

