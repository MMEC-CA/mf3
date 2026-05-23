// ── Map Generation ─────────────────────────────────────────────────
import {
  TILE, COLS, ROWS, MW, MH, ti,
  T_BUILDING, T_ROAD_H, T_ROAD_V, T_ROAD_INT, T_PARK, T_PAVEMENT, T_ASPHALT_LOT,
  PRECINCT_LOT, DISTRICTS, CAR_COLORS,
} from './constants.js';
import { STORE_ROLES } from './stores.js';

export let roadColsList = [];
export let roadRowsList = [];
export let map = new Uint8Array(COLS * ROWS);
export let dmap = new Uint8Array(COLS * ROWS);
export let bdata = [];
export let entrances = [];

// ── Map cache ──────────────────────────────────────────────────────
export let mapCanvas = null;
export let mapCtx = null;
export let mapDirty = true;

export function buildMapCache() {
  mapCanvas = document.createElement('canvas');
  mapCanvas.width = MW;
  mapCanvas.height = MH;
  mapCtx = mapCanvas.getContext('2d');
  renderStaticMap(mapCtx);
  mapDirty = false;
}

// ── Helpers ────────────────────────────────────────────────────────
function pointInPrecinct(c, r) {
  const { c0, r0, w, h } = PRECINCT_LOT;
  return c >= c0 && c < c0 + w && r >= r0 && r <= r0 + h;
}

function stampPrecinctLot() {
  const { c0, r0, w, h } = PRECINCT_LOT;
  for (let dr = 0; dr < h; dr++)
    for (let dc = 0; dc < w; dc++)
      map[ti(c0 + dc, r0 + dr)] = T_BUILDING;
  const sr = r0 + h;
  for (let dc = 0; dc < w; dc++) {
    if (c0 + dc < COLS && sr < ROWS) map[ti(c0 + dc, sr)] = T_PAVEMENT;
  }
}

export function rebuildBuildingBlocks() {
  bdata = [];
  const visited = new Uint8Array(COLS * ROWS);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (map[ti(c, r)] !== T_BUILDING || visited[ti(c, r)]) continue;
      let w = 1, h2 = 1;
      while (c + w < COLS && w < 6 && map[ti(c + w, r)] === T_BUILDING) w++;
      while (r + h2 < ROWS && h2 < 6 && map[ti(c, r + h2)] === T_BUILDING) h2++;
      const bh = 0.8 + Math.random() * 3;
      const d = dmap[ti(c, r)];
      const windows = [];
      for (let i = 0; i < w * h2 * 2; i++) {
        windows.push({
          dx: 4 + Math.floor(Math.random() * (w * TILE - 10)),
          dy: 4 + Math.floor(Math.random() * (h2 * TILE - 10)),
          on: Math.random() > 0.3,
          phase: Math.random() * Math.PI * 2,
        });
      }
      bdata[ti(c, r)] = { w, h: h2, bh, d, windows, isRoot: true };
      for (let dr = 0; dr < h2; dr++)
        for (let dc = 0; dc < w; dc++) {
          visited[ti(c + dc, r + dr)] = 1;
          if (dc > 0 || dr > 0) bdata[ti(c + dc, r + dr)] = { root: [c, r] };
        }
    }
  }
  // Mark precinct building
  const ri = ti(PRECINCT_LOT.c0, PRECINCT_LOT.r0);
  if (bdata[ri]?.isRoot) {
    bdata[ri].kind = 'precinct';
    bdata[ri].bh = 2.2;
    bdata[ri].windows = [
      { dx: 18, dy: 14, on: true, phase: 0 },
      { dx: 52, dy: 14, on: true, phase: 1 },
      { dx: 86, dy: 14, on: true, phase: 2 },
      { dx: 78, dy: 36, on: true, phase: 0.5 },
    ];
  }
}

function carveGasLot(ent) {
  ent.pumpCols = [ent.c - 2, ent.c, ent.c + 2];
  ent.pumpRow = Math.min(ent.r + 4, ROWS - 2);
  for (let dr = 1; dr <= 6; dr++)
    for (let dc = -4; dc <= 4; dc++) {
      const c = ent.c + dc, r = ent.r + dr;
      if (c >= 0 && c < COLS && r >= 0 && r < ROWS &&
        (map[ti(c, r)] === T_PAVEMENT || map[ti(c, r)] === T_PARK))
        map[ti(c, r)] = T_ASPHALT_LOT;
    }
}

export function seedEntrances() {
  entrances = [];
  const { c0, r0, w, h } = PRECINCT_LOT;
  entrances.push({
    id: 'ent_precinct', c: c0 + Math.floor(w / 2), r: r0 + h,
    kind: 'precinct', locked: false, interiorId: 'precinct_full',
    label: 'Precinct 9', facadeTag: 'PD',
  });

  const cands = [];
  for (let r = 1; r < ROWS - 1; r++) {
    for (let c = 0; c < COLS; c++) {
      if (map[ti(c, r)] !== T_PAVEMENT) continue;
      if (map[ti(c, r - 1)] !== T_BUILDING) continue;
      if (pointInPrecinct(c, r) || pointInPrecinct(c, r - 1)) continue;
      cands.push({ c, r });
    }
  }
  cands.sort((a, b) => a.r - b.r || a.c - b.c);

  const used = new Set();
  let si = 0, hi = 0;
  for (const sp of cands) {
    const key = `${sp.c},${sp.r}`;
    if (used.has(key)) continue;
    const j = ((sp.c * 17 + sp.r * 31) % 97) / 97;
    if (si < 24 && j < 0.038) {
      used.add(key);
      const role = STORE_ROLES[si % STORE_ROLES.length];
      const ent = {
        id: `ent_s${si}`, c: sp.c, r: sp.r, kind: 'store', locked: false,
        interiorId: role.interiorId, label: role.label,
        storeRole: role.role, facadeTag: role.facadeTag,
      };
      if (role.lot) carveGasLot(ent);
      entrances.push(ent);
      si++;
    } else if (hi < 14 && j > 0.91) {
      used.add(key);
      entrances.push({
        id: `ent_h${hi}`, c: sp.c, r: sp.r, kind: 'house', locked: false,
        interiorId: 'house_small', label: 'Private Residence', facadeTag: 'HOME',
      });
      hi++;
    }
  }
}

export function genMap() {
  roadColsList = [];
  roadRowsList = [];
  for (let c = 9; c < COLS - 2; c += 11) roadColsList.push(c);
  for (let r = 8; r < ROWS - 2; r += 10) roadRowsList.push(r);

  map.fill(T_BUILDING);
  roadColsList.forEach(c => {
    for (let r = 0; r < ROWS; r++) {
      map[ti(c, r)] = T_ROAD_V;
      map[ti(c + 1, r)] = T_ROAD_V;
    }
  });
  roadRowsList.forEach(r => {
    for (let c = 0; c < COLS; c++) {
      map[ti(c, r)] = T_ROAD_H;
      map[ti(c, r + 1)] = T_ROAD_H;
    }
  });
  roadColsList.forEach(c =>
    roadRowsList.forEach(r => {
      map[ti(c, r)] = T_ROAD_INT;
      map[ti(c + 1, r)] = T_ROAD_INT;
      map[ti(c, r + 1)] = T_ROAD_INT;
      map[ti(c + 1, r + 1)] = T_ROAD_INT;
    })
  );

  const isRoad = (c, r) =>
    c >= 0 && c < COLS && r >= 0 && r < ROWS &&
    (map[ti(c, r)] === T_ROAD_H || map[ti(c, r)] === T_ROAD_V || map[ti(c, r)] === T_ROAD_INT);

  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      if (map[ti(c, r)] !== T_BUILDING) continue;
      if (isRoad(c - 1, r) || isRoad(c + 1, r) || isRoad(c, r - 1) || isRoad(c, r + 1))
        map[ti(c, r)] = T_PAVEMENT;
    }

  // Parks
  [[15, 12], [50, 22], [24, 48], [60, 55], [8, 38], [44, 38]].forEach(([pc, pr]) => {
    for (let dr = 0; dr < 3; dr++)
      for (let dc = 0; dc < 3; dc++) {
        const nc = pc + dc, nr = pr + dr;
        if (nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS &&
          (map[ti(nc, nr)] === T_BUILDING || map[ti(nc, nr)] === T_PAVEMENT))
          map[ti(nc, nr)] = T_PARK;
      }
  });

  // District map
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      for (let d = 0; d < DISTRICTS.length; d++) {
        const di = DISTRICTS[d];
        if (r >= di.r && r <= di.rr && c >= di.c && c <= di.cc) {
          dmap[ti(c, r)] = d;
          break;
        }
      }
    }

  stampPrecinctLot();
  rebuildBuildingBlocks();
  seedEntrances();

  const dc2 = PRECINCT_LOT.c0 + Math.floor(PRECINCT_LOT.w / 2);
  const dr2 = PRECINCT_LOT.r0 + PRECINCT_LOT.h + 1;
  if (dr2 < ROWS && map[ti(dc2, dr2)] === T_BUILDING) map[ti(dc2, dr2)] = T_PAVEMENT;
}

// ── Static Map Rendering ───────────────────────────────────────────
export function renderStaticMap(c) {
  c.fillStyle = '#080c12';
  c.fillRect(0, 0, MW, MH);

  for (let r = 0; r < ROWS; r++) {
    for (let col = 0; col < COLS; col++) {
      const t = map[ti(col, r)];
      const x = col * TILE, y = r * TILE;
      const d = dmap[ti(col, r)];
      const dc = DISTRICTS[d].color;

      if (t === T_ROAD_H || t === T_ROAD_V || t === T_ROAD_INT) {
        const tn = 20 + ((col * 3 + r * 7) % 6);
        const g = c.createLinearGradient(x, y, x + TILE, y + TILE);
        g.addColorStop(0, `rgb(${tn + 6},${tn + 8},${tn + 14})`);
        g.addColorStop(1, `rgb(${tn - 4},${tn - 2},${tn + 2})`);
        c.fillStyle = g;
        c.fillRect(x, y, TILE, TILE);
        c.fillStyle = 'rgba(0,0,0,0.06)';
        c.fillRect(x, y, TILE / 2, TILE / 2);
        c.fillRect(x + TILE / 2, y + TILE / 2, TILE / 2, TILE / 2);
      } else if (t === T_PAVEMENT) {
        const br = 22 + dc[0] * 0.06 | 0;
        const bg = 26 + dc[1] * 0.06 | 0;
        const bb = 34 + dc[2] * 0.07 | 0;
        c.fillStyle = `rgb(${br},${bg},${bb})`;
        c.fillRect(x, y, TILE, TILE);
        c.strokeStyle = 'rgba(0,0,0,0.18)';
        c.lineWidth = 0.5;
        c.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
        c.strokeStyle = `rgba(${br + 20},${bg + 20},${bb + 20},0.2)`;
        c.lineWidth = 0.5;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + TILE, y); c.stroke();
        c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + TILE); c.stroke();
      } else if (t === T_ASPHALT_LOT) {
        const ash = 26 + ((col + r * 5) % 4);
        c.fillStyle = `rgb(${ash},${ash + 2},${ash + 4})`;
        c.fillRect(x, y, TILE, TILE);
        c.strokeStyle = 'rgba(255,220,80,0.18)';
        c.lineWidth = 1;
        c.strokeRect(x + 1, y + 1, TILE - 2, TILE - 2);
      } else if (t === T_PARK) {
        c.fillStyle = '#0a1c0e';
        c.fillRect(x, y, TILE, TILE);
        c.fillStyle = 'rgba(15,55,22,0.7)';
        c.fillRect(x, y, TILE, TILE);
        c.fillStyle = 'rgba(22,75,32,0.5)';
        c.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
        c.fillStyle = 'rgba(28,90,38,0.6)';
        for (let i = 0; i < 5; i++) {
          c.fillRect(x + 2 + i * 7, y + 3 + (i % 3) * 6, 2, 5);
          c.fillRect(x + 5 + i * 6, y + 20 + (i % 2) * 8, 3, 4);
        }
      }
    }
  }

  // Road center lines
  roadColsList.forEach(rc =>
    roadRowsList.forEach(rr => {
      const ix = rc * TILE, iy = rr * TILE;
      const iw = 2 * TILE, ih = 2 * TILE;
      c.fillStyle = 'rgba(255,255,255,0.07)';
      for (let s = 0; s < iw; s += 5) { c.fillRect(ix + s, iy - 8, 3, 7); c.fillRect(ix + s, iy + ih + 1, 3, 7); }
      for (let s = 0; s < ih; s += 5) { c.fillRect(ix - 8, iy + s, 7, 3); c.fillRect(ix + iw + 1, iy + s, 7, 3); }
    })
  );

  c.strokeStyle = 'rgba(255,255,255,0.06)';
  c.lineWidth = 1;
  c.setLineDash([8, 12]);
  roadColsList.forEach(col => {
    c.beginPath(); c.moveTo(col * TILE + TILE / 2, 0); c.lineTo(col * TILE + TILE / 2, MH); c.stroke();
    c.beginPath(); c.moveTo((col + 1) * TILE + TILE / 2, 0); c.lineTo((col + 1) * TILE + TILE / 2, MH); c.stroke();
  });
  roadRowsList.forEach(r => {
    c.beginPath(); c.moveTo(0, r * TILE + TILE / 2); c.lineTo(MW, r * TILE + TILE / 2); c.stroke();
    c.beginPath(); c.moveTo(0, (r + 1) * TILE + TILE / 2); c.lineTo(MW, (r + 1) * TILE + TILE / 2); c.stroke();
  });
  c.setLineDash([]);

  c.strokeStyle = 'rgba(60,90,120,0.35)';
  c.lineWidth = 1;
  roadColsList.forEach(col => {
    c.beginPath(); c.moveTo(col * TILE, 0); c.lineTo(col * TILE, MH); c.stroke();
    c.beginPath(); c.moveTo((col + 2) * TILE, 0); c.lineTo((col + 2) * TILE, MH); c.stroke();
  });
  roadRowsList.forEach(r => {
    c.beginPath(); c.moveTo(0, r * TILE); c.lineTo(MW, r * TILE); c.stroke();
    c.beginPath(); c.moveTo(0, (r + 2) * TILE); c.lineTo(MW, (r + 2) * TILE); c.stroke();
  });
}

// ── Dynamic rendering ──────────────────────────────────────────────
export function drawBuildings(ctx, cam, playerTileR, bdataRef, W, H) {
  if (!bdataRef) return;
  const roots = [];
  for (let r = 0; r < ROWS; r++)
    for (let col = 0; col < COLS; col++) {
      const bd = bdataRef[ti(col, r)];
      if (bd?.isRoot) roots.push({ col, r, bd });
    }
  roots.sort((a, b) => (a.r + a.bd.h) - (b.r + b.bd.h) || a.col - b.col);

  for (const { col, r, bd } of roots) {
    const { w, h: bh2, bh, d } = bd;
    const kind = bd.kind || 'generic';
    const wx = col * TILE - cam.x, wy = r * TILE - cam.y;
    const bw = w * TILE, bHH = bh2 * TILE;
    if (wx > W + 80 || wy > H + 120 || wx + bw < -80 || wy + bHH + 40 < -80) continue;

    const north = (r + bh2 - 1) < playerTileR;
    let wR, wG, wB, dc;
    if (kind === 'precinct') {
      wR = 38; wG = 52; wB = 72;
      dc = DISTRICTS[0].color;
    } else {
      dc = DISTRICTS[d].color;
      wR = 12 + (dc[0] * 0.07 | 0);
      wG = 16 + (dc[1] * 0.07 | 0);
      wB = 22 + (dc[2] * 0.09 | 0);
    }

    if (!north) {
      const rf = ctx.createLinearGradient(wx, wy, wx + bw * 0.7, wy + bHH * 0.7);
      rf.addColorStop(0, `rgb(${wR + 22},${wG + 20},${wB + 28})`);
      rf.addColorStop(1, `rgb(${wR + 4},${wG + 6},${wB + 10})`);
      ctx.fillStyle = rf;
      ctx.fillRect(wx, wy, bw, bHH);
      ctx.strokeStyle = `rgba(${dc[0] / 3 | 0},${dc[1] / 3 | 0},${dc[2] / 3 | 0},0.2)`;
      ctx.lineWidth = 1;
      ctx.strokeRect(wx + 0.5, wy + 0.5, bw - 1, bHH - 1);
      continue;
    }

    const dep = Math.min(10, 4 + bh * 2.2);
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.fillRect(wx + dep, wy + dep, bw, bHH);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(wx + dep * 0.45, wy + dep * 0.45, bw, bHH);

    const face = ctx.createLinearGradient(wx + bw, wy, wx, wy + bHH);
    face.addColorStop(0, `rgb(${wR + 28},${wG + 22},${wB + 18})`);
    face.addColorStop(0.55, `rgb(${wR},${wG},${wB})`);
    face.addColorStop(1, `rgb(${Math.max(0, wR - 8)},${Math.max(0, wG - 8)},${Math.max(0, wB - 6)})`);
    ctx.fillStyle = face;
    ctx.fillRect(wx, wy, bw, bHH);

    const ss = ctx.createLinearGradient(wx, wy + bHH - 2, wx, wy + bHH);
    ss.addColorStop(0, 'rgba(0,0,0,0)');
    ss.addColorStop(1, 'rgba(0,0,0,0.38)');
    ctx.fillStyle = ss;
    ctx.fillRect(wx, wy, bw, bHH);

    const sk = 9;
    ctx.fillStyle = `rgb(${Math.max(0, wR - 14)},${Math.max(0, wG - 12)},${Math.max(0, wB - 10)})`;
    ctx.fillRect(wx + 2, wy + bHH, bw - 4, sk);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(wx + 2, wy + bHH + sk - 3, bw - 4, 3);

    ctx.fillStyle = `rgb(${wR + 14},${wG + 12},${wB + 20})`;
    ctx.fillRect(wx, wy, bw, 5);
    ctx.fillRect(wx, wy, 4, bHH);
    ctx.fillStyle = `rgb(${wR + 8},${wG + 10},${wB + 22})`;
    ctx.fillRect(wx + 4, wy + 4, bw - 8, 5);

    ctx.strokeStyle = `rgba(${dc[0] / 2 | 0},${75 + dc[1] / 3 | 0},${105 + dc[2] / 3 | 0},0.22)`;
    ctx.lineWidth = 1;
    ctx.strokeRect(wx + 0.5, wy + 0.5, bw - 1, bHH - 1);

    if (bh > 2.5) {
      const ax = wx + bw / 2, ay = wy;
      ctx.strokeStyle = 'rgba(180,30,30,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax, ay - 10); ctx.stroke();
      ctx.fillStyle = 'rgba(255,50,50,0.7)';
      ctx.beginPath(); ctx.arc(ax, ay - 10, 2, 0, Math.PI * 2); ctx.fill();
    }

    const fl = Math.max(1, Math.floor(bHH / 14));
    for (let f = 1; f < fl; f++) {
      const fy = wy + f * (bHH / fl);
      ctx.strokeStyle = 'rgba(0,0,0,0.28)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(wx, fy); ctx.lineTo(wx + bw, fy); ctx.stroke();
    }
  }
}

export function drawDynamicTiles(ctx, cam, t, bdataRef, W, H) {
  if (!bdataRef) return;
  const c0 = Math.max(0, Math.floor(cam.x / TILE) - 1);
  const c1 = Math.min(COLS - 1, Math.ceil((cam.x + W) / TILE) + 1);
  const r0 = Math.max(0, Math.floor(cam.y / TILE) - 1);
  const r1 = Math.min(ROWS - 1, Math.ceil((cam.y + H) / TILE) + 1);

  for (let r = r0; r <= r1; r++)
    for (let c = c0; c <= c1; c++) {
      const bd = bdataRef[ti(c, r)];
      if (!bd?.isRoot || !bd.windows.length) continue;
      const wx = c * TILE - cam.x, wy = r * TILE - cam.y;
      bd.windows.forEach(win => {
        if (!win.on) return;
        const fl = 0.5 + 0.5 * (0.5 + 0.5 * Math.sin(t * 5 + win.phase));
        ctx.fillStyle = `rgba(255,215,100,${fl * 0.6})`;
        ctx.fillRect(wx + win.dx, wy + win.dy, 3, 3);
        ctx.fillStyle = `rgba(255,200,80,${fl * 0.12})`;
        ctx.fillRect(wx + win.dx - 2, wy + win.dy - 2, 7, 7);
      });
    }
}

export function drawGasForecourts(ctx, cam, t, entrancesRef, W, H) {
  const bl = 0.65 + 0.35 * Math.sin(t * 4);
  for (const ent of entrancesRef) {
    if (!ent.pumpCols || ent.pumpRow == null) continue;
    for (const pc of ent.pumpCols) {
      const bx = pc * TILE - cam.x, by = ent.pumpRow * TILE - cam.y;
      if (bx > W + 120 || by > H + 120 || bx + TILE < -120 || by + TILE < -120) continue;
      ctx.fillStyle = 'rgba(52,58,68,0.95)';
      ctx.fillRect(bx - 22, by - TILE * 1.05, 44, 14);
      ctx.fillStyle = '#3d4450';
      ctx.fillRect(bx - 6, by - 10, 12, TILE + 14);
      ctx.fillStyle = '#f0c040';
      ctx.fillRect(bx - 12, by + TILE - 22, 24, 10);
      ctx.fillStyle = `rgba(255,80,40,${bl})`;
      ctx.fillRect(bx - 4, by + TILE - 36, 8, 8);
    }
    // Ramp pit
    const rx = ent.c * TILE + TILE / 2 - cam.x;
    const ry = (ent.pumpRow + 2) * TILE - cam.y;
    if (rx > -80 && rx < W + 80 && ry > -80 && ry < H + 80) {
      const rw = TILE * 1.4, rh = TILE * 0.8;
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(rx - rw / 2 + 2, ry + 2, rw, rh);
      const rg = ctx.createLinearGradient(0, ry, 0, ry + rh);
      rg.addColorStop(0, 'rgba(60,70,80,0.8)');
      rg.addColorStop(1, 'rgba(8,10,14,0.95)');
      ctx.fillStyle = rg;
      ctx.fillRect(rx - rw / 2, ry, rw, rh);
      ctx.strokeStyle = 'rgba(255,220,60,0.5)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(rx - rw / 2 + 8 + i * (rw - 16) / 4, ry + 4);
        ctx.lineTo(rx - rw / 2 + 4 + i * (rw - 16) / 4, ry + rh - 6);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,220,60,0.7)';
      ctx.font = 'bold 9px "Share Tech Mono",monospace';
      ctx.textAlign = 'center';
      ctx.fillText('▼ PARK', rx, ry + rh + 12);
      ctx.textAlign = 'left';
    }
  }
}

export function drawEntranceFacades(ctx, cam, entrancesRef) {
  for (const ent of entrancesRef) {
    const x = ent.c * TILE - cam.x, y = ent.r * TILE - cam.y;
    if (x > W + 40 || y > H + 40 || x + TILE < -40 || y + TILE < -40) continue;
    let top = '#8a9cae', stripe = '#e8d5a0';
    if (ent.kind === 'precinct') { top = '#c4aa6a'; stripe = '#fff8e8'; }
    else if (ent.kind === 'store') { top = '#b84c3d'; stripe = '#ffd89c'; }
    else if (ent.kind === 'house') { top = '#4a6a8a'; stripe = '#bcd4ee'; }
    ctx.fillStyle = top;
    ctx.fillRect(x + 4, y - 12, TILE - 8, 14);
    ctx.fillStyle = stripe;
    ctx.fillRect(x + 6, y - 8, TILE - 12, 3);
    ctx.fillStyle = 'rgba(15,18,28,0.75)';
    ctx.fillRect(x + TILE / 2 - 7, y + 6, 14, 18);
    ctx.fillStyle = ent.locked ? 'rgba(232,213,160,0.25)' : 'rgba(180,210,255,0.35)';
    ctx.fillRect(x + TILE / 2 - 5, y + 16, 10, 6);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.font = '700 8px "Barlow Condensed",sans-serif';
    ctx.textAlign = 'center';
    const tag = ent.facadeTag || (ent.kind === 'precinct' ? 'PD' : ent.kind === 'store' ? 'OPEN' : '');
    if (tag) ctx.fillText(tag.slice(0, 8), x + TILE / 2, y - 16);
  }
  ctx.textAlign = 'left';
}

export function drawStreetLamps(ctx, cam, nightAlpha, t, W, H) {
  const c0 = Math.max(0, Math.floor(cam.x / TILE) - 2);
  const c1 = Math.min(COLS - 1, Math.ceil((cam.x + W) / TILE) + 2);
  const r0 = Math.max(0, Math.floor(cam.y / TILE) - 2);
  const r1 = Math.min(ROWS - 1, Math.ceil((cam.y + H) / TILE) + 2);

  for (let r = r0; r <= r1; r++)
    for (let c = c0; c <= c1; c++) {
      if (map[ti(c, r)] !== T_PAVEMENT) continue;
      const lx = c * TILE + TILE / 2 - cam.x, ly = r * TILE + TILE / 2 - cam.y;
      const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, 30 * nightAlpha + 8);
      g.addColorStop(0, `rgba(255,220,120,${0.2 * nightAlpha})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(lx, ly, 30 * nightAlpha + 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255,235,160,${0.7 * nightAlpha})`;
      ctx.beginPath();
      ctx.arc(lx, ly, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
}

export function drawVignette(ctx, nightAlpha, W, H) {
  const e = 0.38 + nightAlpha * 0.14;
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.82);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${e})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

export function drawScanlines(ctx, nightAlpha, W, H) {
  const a = nightAlpha > 0.2 ? 0.055 : 0.028;
  for (let sy = 0; sy < H; sy += 3) {
    ctx.fillStyle = `rgba(0,0,0,${a})`;
    ctx.fillRect(0, sy, W, 1);
  }
}
