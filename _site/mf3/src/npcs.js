// ── NPC System ─────────────────────────────────────────────────────
import { TILE, COLS, ROWS, ti, T_PAVEMENT, T_ROAD_INT, T_ASPHALT_LOT, T_PARK } from './constants.js';

const NPC_STATES = { IDLE: 0, COMMUTING: 1, WORKING: 2, PANIC: 3 };
const NPC_WALKABLE = [T_PAVEMENT, T_ROAD_INT, T_ASPHALT_LOT, T_PARK];

function findPath(map, startC, startR, endC, endR) {
  if (startC === endC && startR === endR) return [];
  // Use a ring buffer for BFS instead of array spread (reduces GC pressure)
  const visited = new Uint8Array(COLS * ROWS);
  visited[ti(startC, startR)] = 1;

  // Pre-allocated queue
  const queue = new Array(4000);
  let qHead = 0, qTail = 0;

  // Store parent for path reconstruction instead of copying arrays
  const parent = new Int16Array(COLS * ROWS * 2).fill(-1);

  queue[qTail++] = [startC, startR];
  let found = false;

  while (qHead < qTail && qTail < 4000) {
    const [c, r] = queue[qHead++];
    if (c === endC && r === endR) { found = true; break; }

    for (const [dc, dr] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const nc = c + dc, nr = r + dr;
      if (nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS && !visited[ti(nc, nr)]) {
        const t = map[ti(nc, nr)];
        if (NPC_WALKABLE.includes(t)) {
          visited[ti(nc, nr)] = 1;
          const idx = ti(nc, nr) * 2;
          parent[idx] = c;
          parent[idx + 1] = r;
          queue[qTail++] = [nc, nr];
        }
      }
    }
  }

  if (!found) return null;

  // Reconstruct path from end to start
  const path = [];
  let pc = endC, pr = endR;
  while (pc !== startC || pr !== startR) {
    path.unshift([pc, pr]);
    const idx = ti(pc, pr) * 2;
    pc = parent[idx];
    pr = parent[idx + 1];
    if (pc === -1) break;
  }
  return path;
}

class NPCAgent {
  constructor(id, homeC, homeR, workC, workR) {
    this.id = id;
    this.home = { c: homeC, r: homeR };
    this.work = { c: workC, r: workR };
    this.x = homeC * TILE + TILE / 2;
    this.y = homeR * TILE + TILE / 2;
    this.target = null;
    this.path = [];
    this.state = NPC_STATES.IDLE;
    this.speed = 35 + Math.random() * 20;
    this.color = `hsl(${Math.random() * 360}, 40%, 60%)`;
    this.pantsColor = `hsl(${Math.random() * 360}, 20%, 30%)`;
    this.dir = 2;
    this.animFrame = 0;
    this.animTimer = 0;
    this.waitTimer = 0;
    this.fleeing = false; // for panic state
  }

  update(dt, gameHour, mapRef) {
    const h = gameHour;

    // Fleeing behavior
    if (this.state === NPC_STATES.PANIC) {
      if (this.fleeing && this.path.length === 0) {
        this.state = NPC_STATES.IDLE;
        this.fleeing = false;
      }
    }

    if (this.state === NPC_STATES.IDLE) {
      if (h >= 8 && h < 9 && Math.random() < 0.01) {
        this.startCommute(mapRef, this.work.c, this.work.r, NPC_STATES.WORKING);
      } else if (h >= 17 && h < 18 && Math.random() < 0.01) {
        this.startCommute(mapRef, this.home.c, this.home.r, NPC_STATES.IDLE);
      }
    }

    if (this.state === NPC_STATES.COMMUTING && this.path.length > 0) {
      const [tc, tr] = this.path[0];
      const tx = tc * TILE + TILE / 2, ty = tr * TILE + TILE / 2;
      const dx = tx - this.x, dy = ty - this.y;
      const d = Math.hypot(dx, dy);
      if (d < 2) {
        this.path.shift();
        if (this.path.length === 0) this.state = this.nextState || NPC_STATES.IDLE;
      } else {
        const step = Math.min(d, this.speed * dt);
        this.x += (dx / d) * step;
        this.y += (dy / d) * step;
        if (Math.abs(dx) > Math.abs(dy)) this.dir = dx > 0 ? 1 : 3;
        else this.dir = dy > 0 ? 2 : 0;
        this.animTimer += dt;
        if (this.animTimer > 0.15) { this.animTimer = 0; this.animFrame = (this.animFrame + 1) % 4; }
      }
    } else {
      this.animFrame = 0;
    }
  }

  startCommute(mapRef, tc, tr, next) {
    const sc = Math.floor(this.x / TILE), sr = Math.floor(this.y / TILE);
    const p = findPath(mapRef, sc, sr, tc, tr);
    if (p) { this.path = p; this.state = NPC_STATES.COMMUTING; this.nextState = next; }
  }

  // Make NPC flee from a point
  flee(mapRef, fromX, fromY) {
    const sc = Math.floor(this.x / TILE), sr = Math.floor(this.y / TILE);
    const dx = this.x - fromX, dy = this.y - fromY;
    const dist = Math.hypot(dx, dy) || 1;
    const fc = Math.floor((this.x + (dx / dist) * 8 * TILE) / TILE);
    const fr = Math.floor((this.y + (dy / dist) * 8 * TILE) / TILE);
    const p = findPath(mapRef, sc, sr, Math.max(0, Math.min(COLS - 1, fc)), Math.max(0, Math.min(ROWS - 1, fr)));
    if (p && p.length > 0) {
      this.path = p;
      this.state = NPC_STATES.PANIC;
      this.fleeing = true;
    }
  }
}

export class SimManager {
  constructor() {
    this.npcs = [];
  }

  init(entrances) {
    this.npcs = [];
    const houses = entrances.filter(e => e.kind === 'house');
    const jobs = entrances.filter(e => e.kind === 'store' || e.kind === 'precinct');
    for (let i = 0; i < 60; i++) {
      const h = houses[Math.floor(Math.random() * houses.length)];
      const j = jobs[Math.floor(Math.random() * jobs.length)];
      if (h && j) this.npcs.push(new NPCAgent(`npc_${i}`, h.c, h.r, j.c, j.r));
    }
  }

  update(dt, gameHour, mapRef) {
    this.npcs.forEach(n => n.update(dt, gameHour, mapRef));
  }

  // Have nearby NPCs flee from a point
  panicNearby(fromX, fromY, radius, mapRef) {
    let count = 0;
    for (const n of this.npcs) {
      const dist = Math.hypot(n.x - fromX, n.y - fromY);
      if (dist < radius && n.state !== NPC_STATES.PANIC) {
        n.flee(mapRef, fromX, fromY);
        count++;
      }
    }
    return count;
  }

  // Get NPCs near a point
  getNearby(x, y, radius) {
    return this.npcs.filter(n => Math.hypot(n.x - x, n.y - y) < radius);
  }
}

export function drawNPCs(ctx, simManager, cam, t, gameMode) {
  if (gameMode === 'interior') return;
  simManager.npcs.forEach(n => {
    const sx = n.x - cam.x, sy = n.y - cam.y;
    if (sx < -20 || sx > 1920 + 20 || sy < -20 || sy > 1080 + 20) return;
    ctx.save();
    ctx.translate(sx, sy);
    const bounce = n.state === NPC_STATES.COMMUTING ? Math.abs(Math.sin(t * 10)) * 1.5 : 0;

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 5, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = n.pantsColor || '#222';
    ctx.fillRect(-3, -2 - bounce, 2.5, 4);
    ctx.fillRect(0.5, -2 - bounce, 2.5, 4);

    ctx.fillStyle = n.color;
    ctx.fillRect(-3.5, -8 - bounce, 7, 7);

    ctx.fillStyle = '#e0c0a0';
    ctx.beginPath();
    ctx.arc(0, -11 - bounce, 3.5, 0, Math.PI * 2);
    ctx.fill();

    const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    const [dx, dy] = dirs[n.dir];
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.arc(dx * 2, -11 - bounce + dy, 1, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  });
}
