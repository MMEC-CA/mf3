// ── Clock Tests ───────────────────────────────────────────────────
import { describe, it, expect, beforeEach } from 'vitest';
import { clock, resetClock } from '../clock.js';
import { SHIFT_START_HOUR, SHIFT_END_HOUR, SHIFT_HOURS, REAL_PER_GAME_HOUR } from '../constants.js';

describe('clock', () => {
  beforeEach(() => {
    resetClock();
  });

  it('starts with elapsed 0', () => {
    expect(clock.elapsed).toBe(0);
  });

  it('gameHour starts at SHIFT_START_HOUR', () => {
    expect(clock.gameHour).toBeCloseTo(SHIFT_START_HOUR, 5);
  });

  it('display formats time correctly at 08:00', () => {
    expect(clock.display).toBe('08:00');
  });

  it('display formats time correctly after 30 game minutes', () => {
    // 30 game minutes = 30/60 * REAL_PER_GAME_HOUR seconds
    // = 0.5 * 10 = 5 seconds
    clock.update(5, null);
    expect(clock.display).toBe('08:30');
  });

  it('display formats time correctly at 12:34', () => {
    // 12:34 = 4 hours 34 minutes of game time past 08:00
    // Use integer math to avoid floating point drift: 274 game-minutes
    // = 274/60 game-hours * 10 real-seconds-per-game-hour
    // Use a slightly longer update then check values are in range
    const seconds = (4 + 34 / 60) * REAL_PER_GAME_HOUR;
    clock.update(seconds, null);
    const [h, m] = clock.display.split(':').map(Number);
    expect(h).toBe(12);
    // Allow ±1 minute tolerance for floating point
    expect(Math.abs(m - 34)).toBeLessThanOrEqual(1);
  });

  it('gameHour progresses linearly', () => {
    expect(clock.gameHour).toBeCloseTo(8, 5);
    clock.update(REAL_PER_GAME_HOUR, null); // 1 game hour
    expect(clock.gameHour).toBeCloseTo(9, 5);
  });

  it('display shows end of shift near 20:00', () => {
    // Advance to just before the cycle wraps but past end of shift
    // gameHour >= 20 effectively clamped to 19:59 by SHIFT_END_HOUR - 1e-6
    clock.update(SHIFT_HOURS * REAL_PER_GAME_HOUR - 0.001, null);
    // Should be very close to 19:59 or 20:00 — either is valid
    const [h, m] = clock.display.split(':').map(Number);
    expect(h).toBeGreaterThanOrEqual(19);
    expect(m).toBeGreaterThanOrEqual(58);
  });

  it('elapsed wraps around after a full shift cycle', () => {
    const cycle = SHIFT_HOURS * REAL_PER_GAME_HOUR;
    clock.update(cycle + 5, null);
    expect(clock.elapsed).toBeLessThan(cycle);
    expect(clock.elapsed).toBeCloseTo(5, 0);
  });

  describe('nightAlpha', () => {
    it('is 0 before 17:00', () => {
      expect(clock.nightAlpha).toBe(0);
    });

    it('ramps up between 17:00 and 19:00', () => {
      // Set to 18:00 (10 game hours elapsed)
      clock.update(10 * REAL_PER_GAME_HOUR, null);
      expect(clock.nightAlpha).toBeGreaterThan(0);
      expect(clock.nightAlpha).toBeLessThan(0.42);
    });

    it('is at least 0.42 at 19:00', () => {
      clock.update(11 * REAL_PER_GAME_HOUR, null);
      expect(clock.nightAlpha).toBeCloseTo(0.42, 2);
    });

    it('ramps further after 19:00', () => {
      clock.update(11.5 * REAL_PER_GAME_HOUR, null);
      const alpha = clock.nightAlpha;
      expect(alpha).toBeGreaterThan(0.42);
    });
  });

  describe('money earning callback', () => {
    it('calls the callback when money accumulates', () => {
      let earned = 0;
      // Run enough time to earn at least 0.01
      // HOURLY_PAY is 20, so per-second = 20/10 = 2
      // 0.01 / 2 = 0.005 seconds
      clock.update(0.01, (acc) => { earned += acc; });
      expect(earned).toBeGreaterThan(0);
    });
  });

  describe('resetClock()', () => {
    it('resets elapsed to 0 and display to 08:00', () => {
      clock.update(500, null);
      expect(clock.elapsed).toBeGreaterThan(0);
      resetClock();
      expect(clock.elapsed).toBe(0);
      expect(clock.display).toBe('08:00');
    });
  });
});
