// ── Camera System ─────────────────────────────────────────────────
import { MW, MH, TILE } from './constants.js';

export const cam = {
  x: 0,
  y: 0,
  targetX: 0,
  targetY: 0,
  boundW: MW,
  boundH: MH,

  follow(wx, wy, W, H) {
    this.targetX = wx - W / 2;
    this.targetY = wy - H / 2;
  },

  update(dt, W, H) {
    const s = 8;
    this.x += (this.targetX - this.x) * Math.min(1, s * dt);
    this.y += (this.targetY - this.y) * Math.min(1, s * dt);
    this.x = Math.max(0, Math.min(this.boundW - W, this.x));
    this.y = Math.max(0, Math.min(this.boundH - H, this.y));
  },

  ws(wx, wy) {
    return { x: wx - this.x, y: wy - this.y };
  },
};
