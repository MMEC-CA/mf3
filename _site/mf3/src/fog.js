// ── Fog of War ──────────────────────────────────────────────────────
import { TILE, COLS, ROWS, ti, T_BUILDING } from './constants.js';

const FOV_RAYS = 360; // reduced from 720 for performance
const FOV_RANGE = 320;
export const FOG_OUT_ALPHA = 0.82;

let fogCanvas, fogCtx;
let lastFovX = -1, lastFovY = -1;
let fogDirty = true;

export function initFog() {
  fogCanvas = document.createElement('canvas');
  fogCanvas.width = FOV_RANGE * 2;
  fogCanvas.height = FOV_RANGE * 2;
  fogCtx = fogCanvas.getContext('2d');
}

function rayAABB(px, py, dx, dy, mnX, mnY, mxX, mxY) {
  let t0 = -Infinity, t1 = Infinity;
  const E = 1e-9;
  function clip(p, d, lo, hi) {
    if (Math.abs(d) < E) { if (p < lo || p > hi) return false; return true; }
    const iv = 1 / d;
    let a = (lo - p) * iv, b = (hi - p) * iv;
    if (a > b) [a, b] = [b, a];
    t0 = Math.max(t0, a);
    t1 = Math.min(t1, b);
    return t0 <= t1;
  }
  if (!clip(px, dx, mnX, mxX)) return null;
  if (!clip(py, dy, mnY, mxY)) return null;
  if (t1 < 0) return null;
  return Math.max(0, t0);
}

function castRay(px, py, angle, map) {
  const dx = Math.cos(angle), dy = Math.sin(angle);
  const step = TILE * 0.14;
  for (let dist = 0; dist <= FOV_RANGE; dist += step) {
    const wx = px + dx * dist, wy = py + dy * dist;
    const tc = Math.floor(wx / TILE), tr = Math.floor(wy / TILE);
    if (tc < 0 || tc >= COLS || tr < 0 || tr >= ROWS) return Math.min(dist, FOV_RANGE);
    if (map[ti(tc, tr)] === T_BUILDING) {
      const bx0 = tc * TILE, by0 = tr * TILE;
      const h = rayAABB(px, py, dx, dy, bx0, by0, bx0 + TILE, by0 + TILE);
      if (h != null) return Math.min(Math.max(h - 0.25, 2), FOV_RANGE);
      return Math.min(Math.max(dist - step, 2), FOV_RANGE);
    }
  }
  return FOV_RANGE;
}

function buildFogMask(px, py, map) {
  const fc = fogCtx, fw = FOV_RANGE * 2, fh = FOV_RANGE * 2;
  const cx = fw / 2, cy = fh / 2;
  fc.clearRect(0, 0, fw, fh);
  fc.fillStyle = `rgba(12,14,18,${FOG_OUT_ALPHA})`;
  fc.fillRect(0, 0, fw, fh);
  fc.save();
  fc.globalCompositeOperation = 'destination-out';
  fc.beginPath();
  for (let i = 0; i <= FOV_RAYS; i++) {
    const angle = (i / FOV_RAYS) * Math.PI * 2;
    const dist = castRay(px, py, angle, map);
    fc.lineTo(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist);
  }
  fc.closePath();
  fc.fillStyle = 'rgba(255,255,255,1)';
  fc.fill();
  fc.globalCompositeOperation = 'destination-out';
  fc.strokeStyle = 'rgba(255,255,255,0.35)';
  fc.lineWidth = 22;
  fc.lineJoin = 'round';
  fc.lineCap = 'round';
  fc.stroke();
  fc.restore();
}

export function drawFog(ctx, cam, player, map, W, H) {
  // Only rebuild when player has moved significantly
  if (Math.abs(player.x - lastFovX) > 16 || Math.abs(player.y - lastFovY) > 16) {
    lastFovX = player.x;
    lastFovY = player.y;
    buildFogMask(player.x, player.y, map);
  }

  const sp = cam.ws(player.x, player.y);
  const dx = sp.x - FOV_RANGE, dy = sp.y - FOV_RANGE;
  ctx.drawImage(fogCanvas, dx, dy);

  ctx.fillStyle = `rgba(12,14,18,${FOG_OUT_ALPHA})`;
  if (dx > 0) ctx.fillRect(0, 0, dx, H);
  if (dx + FOV_RANGE * 2 < W) ctx.fillRect(dx + FOV_RANGE * 2, 0, W - (dx + FOV_RANGE * 2), H);
  if (dy > 0) ctx.fillRect(dx, 0, FOV_RANGE * 2, dy);
  const bot = dy + FOV_RANGE * 2;
  if (bot < H) ctx.fillRect(dx, bot, FOV_RANGE * 2, H - bot);
}
