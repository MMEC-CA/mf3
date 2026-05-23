// ── Game Clock ────────────────────────────────────────────────────
import { SHIFT_START_HOUR, SHIFT_END_HOUR, SHIFT_HOURS, REAL_PER_GAME_HOUR } from './constants.js';

export const HOURLY_PAY = 20;
let moneyAccum = 0;

export const clock = {
  elapsed: 0,

  get gameHour() {
    return SHIFT_START_HOUR + this.elapsed / REAL_PER_GAME_HOUR;
  },

  get display() {
    const gh = Math.min(this.gameHour, SHIFT_END_HOUR - 1e-6);
    const h = Math.floor(gh);
    const m = Math.floor((gh % 1) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  },

  get nightAlpha() {
    const h = this.gameHour;
    if (h < 17) return 0;
    if (h < 19) return ((h - 17) / 2) * 0.42;
    if (h < 20) return 0.42 + (h - 19) * 0.22;
    return 0;
  },

  update(dt, onMoneyEarned) {
    this.elapsed += dt;
    const cy = SHIFT_HOURS * REAL_PER_GAME_HOUR;
    while (this.elapsed >= cy) this.elapsed -= cy;
    moneyAccum += (HOURLY_PAY / REAL_PER_GAME_HOUR) * dt;
    if (moneyAccum >= 0.01 && onMoneyEarned) {
      onMoneyEarned(moneyAccum);
      moneyAccum = 0;
    }
  },
};

export function resetClock() {
  clock.elapsed = 0;
  moneyAccum = 0;
}
