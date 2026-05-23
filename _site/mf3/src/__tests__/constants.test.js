// ── Constants Tests ────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import {
  TILE, COLS, ROWS, MW, MH, ITILE,
  REAL_PER_GAME_HOUR, SHIFT_START_HOUR, SHIFT_END_HOUR, SHIFT_HOURS,
  T_BUILDING, T_ROAD_H, T_ROAD_V, T_ROAD_INT, T_PARK, T_PAVEMENT, T_ASPHALT_LOT,
  PRECINCT_LOT, DISTRICTS, CAR_COLORS, ti,
} from '../constants.js';

describe('constants', () => {
  it('has correct tile and grid dimensions', () => {
    expect(TILE).toBe(52);
    expect(COLS).toBe(80);
    expect(ROWS).toBe(80);
    expect(MW).toBe(COLS * TILE); // 4160
    expect(MH).toBe(ROWS * TILE); // 4160
    expect(ITILE).toBe(64);
  });

  it('has correct game clock constants', () => {
    expect(REAL_PER_GAME_HOUR).toBe(10);
    expect(SHIFT_START_HOUR).toBe(8);
    expect(SHIFT_END_HOUR).toBe(20);
    expect(SHIFT_HOURS).toBe(12);
  });

  it('has all tile type constants and they are distinct', () => {
    const types = [T_BUILDING, T_ROAD_H, T_ROAD_V, T_ROAD_INT, T_PARK, T_PAVEMENT, T_ASPHALT_LOT];
    const unique = new Set(types);
    expect(unique.size).toBe(types.length);
  });

  it('has correct precinct lot dimensions', () => {
    expect(PRECINCT_LOT).toEqual({ c0: 4, r0: 3, w: 4, h: 3 });
  });

  it('has exactly 4 districts', () => {
    expect(DISTRICTS).toHaveLength(4);
    for (const d of DISTRICTS) {
      expect(d).toHaveProperty('name');
      expect(d).toHaveProperty('r');
      expect(d).toHaveProperty('c');
      expect(d).toHaveProperty('rr');
      expect(d).toHaveProperty('cc');
      expect(d).toHaveProperty('color');
      expect(d).toHaveProperty('trust');
      expect(d.color).toHaveLength(3);
    }
  });

  it('has 10 car colors that are valid CSS hex colors', () => {
    expect(CAR_COLORS).toHaveLength(10);
    for (const color of CAR_COLORS) {
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  describe('ti() helper', () => {
    it('computes correct tile index', () => {
      expect(ti(0, 0)).toBe(0);
      expect(ti(1, 0)).toBe(1);
      expect(ti(0, 1)).toBe(COLS); // 80
      expect(ti(79, 79)).toBe(ROWS * COLS - 1); // 6399
      expect(ti(5, 10)).toBe(10 * COLS + 5); // 805
    });
  });
});
