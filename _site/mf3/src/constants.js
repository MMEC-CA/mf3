// ── Game Constants ────────────────────────────────────────────────
export const TILE = 52;
export const COLS = 80;
export const ROWS = 80;
export const MW = COLS * TILE;
export const MH = ROWS * TILE;
export const ITILE = 64; // interior tile size
export const REAL_PER_GAME_HOUR = 10;
export const SHIFT_START_HOUR = 8;
export const SHIFT_END_HOUR = 20;
export const SHIFT_HOURS = 12;

// Tile types
export const T_BUILDING = 0;
export const T_ROAD_H = 1;
export const T_ROAD_V = 2;
export const T_ROAD_INT = 3;
export const T_PARK = 4;
export const T_PAVEMENT = 5;
export const T_ASPHALT_LOT = 6;

export const PRECINCT_LOT = { c0: 4, r0: 3, w: 4, h: 3 };

export const DISTRICTS = [
  { name: 'Millbank Row', r: 0, c: 0, rr: 39, cc: 39, color: [40, 80, 160], trust: 65 },
  { name: 'The Docks', r: 0, c: 40, rr: 39, cc: 79, color: [160, 80, 20], trust: 40 },
  { name: 'Greenvale', r: 40, c: 0, rr: 79, cc: 39, color: [20, 120, 60], trust: 80 },
  { name: 'Irongate', r: 40, c: 40, rr: 79, cc: 79, color: [120, 30, 140], trust: 55 },
];

export const CAR_COLORS = [
  '#c0392b', '#2980b9', '#f0c040', '#27ae60', '#8e44ad',
  '#e67e22', '#bdc3c7', '#2c3e50', '#1abc9c', '#e74c3c',
];

// Tile index helper
export function ti(c, r) {
  return r * COLS + c;
}
