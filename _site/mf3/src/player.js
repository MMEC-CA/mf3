// ── Player ─────────────────────────────────────────────────────────
import { TILE, COLS, ROWS, MW, MH, PRECINCT_LOT, ti, T_BUILDING } from './constants.js';
import { GEAR_CATALOG } from './stores.js';

let mapRef = null;
let dmapRef = null;

export function setMapRef(map, dmap) {
  mapRef = map;
  dmapRef = dmap;
}

export const player = {
  x: (PRECINCT_LOT.c0 + Math.floor(PRECINCT_LOT.w / 2)) * TILE + TILE / 2,
  y: (PRECINCT_LOT.r0 + PRECINCT_LOT.h + 1) * TILE + TILE / 2,
  speed: 90,
  uniformId: 'class_a',
  dir: 2,
  moving: false,
  animFrame: 0,
  animTimer: 0,
  ANIM_RATE: 0.12,
  gear: { glock: true, radio: true, taser: true, cuffs: true, notebook: true, baton: true },
  handItem: 'radio',

  // Health & Stamina
  health: 100,
  maxHealth: 100,
  stamina: 100,
  maxStamina: 100,

  update(dt, keys) {
    let dx = 0, dy = 0;
    if (keys['ArrowUp'] || keys['w'] || keys['W']) dy -= 1;
    if (keys['ArrowDown'] || keys['s'] || keys['S']) dy += 1;
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) dx -= 1;
    if (keys['ArrowRight'] || keys['d'] || keys['D']) dx += 1;

    const isRunning = keys['Shift'] || keys['shift'];
    const speedMult = isRunning && this.stamina > 0 ? 1.5 : 1;
    this.moving = dx !== 0 || dy !== 0;

    if (this.moving) {
      if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }
      if (dy < 0) this.dir = 0;
      else if (dy > 0) this.dir = 2;
      else if (dx < 0) this.dir = 3;
      else this.dir = 1;

      const spd = this.speed * speedMult;
      const nx = this.x + dx * spd * dt, ny = this.y + dy * spd * dt;
      if (this.canWalk(nx, this.y)) this.x = nx;
      if (this.canWalk(this.x, ny)) this.y = ny;
      this.x = Math.max(TILE / 2, Math.min(MW - TILE / 2, this.x));
      this.y = Math.max(TILE / 2, Math.min(MH - TILE / 2, this.y));
      this.animTimer += dt;
      if (this.animTimer >= this.ANIM_RATE) { this.animTimer = 0; this.animFrame = (this.animFrame + 1) % 4; }

      // Running drains stamina
      if (isRunning) {
        this.stamina = Math.max(0, this.stamina - 10 * dt);
      }
    } else {
      this.animFrame = 0;
      this.animTimer = 0;
      // Regenerate stamina when not running
      this.stamina = Math.min(this.maxStamina, this.stamina + 15 * dt);
    }
  },

  canWalk(wx, wy) {
    const R = 8;
    for (const [cx, cy] of [[wx - R, wy - R], [wx + R, wy - R], [wx - R, wy + R], [wx + R, wy + R]]) {
      const tc = Math.floor(cx / TILE), tr = Math.floor(cy / TILE);
      if (tc < 0 || tc >= COLS || tr < 0 || tr >= ROWS) return false;
      if (mapRef && mapRef[ti(tc, tr)] === T_BUILDING) return false;
    }
    return true;
  },

  get tileC() { return Math.floor(this.x / TILE); },
  get tileR() { return Math.floor(this.y / TILE); },
  get districtIdx() { return dmapRef ? dmapRef[ti(this.tileC, this.tileR)] : 0; },
};

// Draw the cop figure
export function drawCopFigure(c, x, y, t, moving, dir, uniformId, scale = 1) {
  const S = scale;
  c.fillStyle = 'rgba(0,0,0,0.3)';
  c.beginPath();
  c.ellipse(x, y + 8 * S, 6 * S, 3 * S, 0, 0, Math.PI * 2);
  c.fill();

  const bob = moving ? Math.sin(t * 12) * 1.5 * S : 0;
  const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const [fdx, fdy] = dirs[dir];

  c.strokeStyle = '#1a3a6a';
  c.lineWidth = 3 * S;
  c.lineCap = 'round';
  if (moving) {
    const ls = Math.sin(t * 14) * 4 * S;
    c.beginPath();
    c.moveTo(x - 2 * S, y + 4 * S + bob);
    c.lineTo(x - 2 * S + ls * 0.5, y + 10 * S + bob);
    c.stroke();
    c.beginPath();
    c.moveTo(x + 2 * S, y + 4 * S + bob);
    c.lineTo(x + 2 * S - ls * 0.5, y + 10 * S + bob);
    c.stroke();
  } else {
    c.beginPath(); c.moveTo(x - 2 * S, y + 4 * S); c.lineTo(x - 2 * S, y + 10 * S); c.stroke();
    c.beginPath(); c.moveTo(x + 2 * S, y + 4 * S); c.lineTo(x + 2 * S, y + 10 * S); c.stroke();
  }

  c.fillStyle = '#1e4080';
  c.beginPath();
  c.moveTo(x - 3 * S, y - 6 * S + bob);
  c.lineTo(x + 3 * S, y - 6 * S + bob);
  c.quadraticCurveTo(x + 5 * S, y - 6 * S + bob, x + 5 * S, y - 4 * S + bob);
  c.lineTo(x + 5 * S, y + 3 * S + bob);
  c.quadraticCurveTo(x + 5 * S, y + 5 * S + bob, x + 3 * S, y + 5 * S + bob);
  c.lineTo(x - 3 * S, y + 5 * S + bob);
  c.quadraticCurveTo(x - 5 * S, y + 5 * S + bob, x - 5 * S, y + 3 * S + bob);
  c.lineTo(x - 5 * S, y - 4 * S + bob);
  c.quadraticCurveTo(x - 5 * S, y - 6 * S + bob, x - 3 * S, y - 6 * S + bob);
  c.closePath();
  c.fill();

  c.fillStyle = '#e8d5a0';
  c.beginPath();
  c.arc(x + 2 * S, y - 3 * S + bob, 1.5 * S, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#c8a882';
  c.beginPath();
  c.arc(x, y - 11 * S + bob, 5 * S, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#152e5a';
  c.fillRect(x - 6 * S, y - 17 * S + bob, 12 * S, 4 * S);
  c.fillRect(x - 4 * S, y - 21 * S + bob, 8 * S, 5 * S);
  c.fillStyle = '#e8d5a0';
  c.fillRect(x - 4 * S, y - 16 * S + bob, 8 * S, S);

  c.fillStyle = 'rgba(232,213,160,0.4)';
  c.beginPath();
  c.moveTo(x + fdx * 10 * S, y - 22 * S + bob + fdy * 10 * S);
  c.lineTo(x + fdx * 10 * S - fdy * 3 * S, y - 22 * S + bob + fdy * 10 * S + fdx * 3 * S);
  c.lineTo(x + fdx * 10 * S + fdy * 3 * S, y - 22 * S + bob + fdy * 10 * S - fdx * 3 * S);
  c.closePath();
  c.fill();
}

export function drawPlayer(ctx, cam, t) {
  const sp = cam.ws(player.x, player.y);
  drawCopFigure(ctx, sp.x, sp.y, t, player.moving, player.dir, player.uniformId, 1);
}

export function resetPlayer() {
  player.x = (PRECINCT_LOT.c0 + Math.floor(PRECINCT_LOT.w / 2)) * TILE + TILE / 2;
  player.y = (PRECINCT_LOT.r0 + PRECINCT_LOT.h + 1) * TILE + TILE / 2;
  player.dir = 2;
  player.moving = false;
  player.animFrame = 0;
  player.health = 100;
  player.stamina = 100;
}
