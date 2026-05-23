// ── Interiors ──────────────────────────────────────────────────────
import { TILE, ITILE, COLS, ROWS, MW, MH, CAR_COLORS } from './constants.js';
import { STORE_CATALOGS } from './stores.js';

export const interior = {
  id: null, label: '', theme: 'generic', exitWorld: null,
  playerX: 0, playerY: 0, wTiles: 12, hTiles: 10,
  walls: null, hotspots: [], bankCars: [], garageY0: -1,
  dir: 2,
};
export let interiorMoving = false;

// ── Wall generation ────────────────────────────────────────────────
function genWalls(wT, hT) {
  const m = new Uint8Array(wT * hT);
  const dx0 = Math.floor(wT / 2) - 1;
  for (let y = 0; y < hT; y++)
    for (let x = 0; x < wT; x++) {
      const edge = x === 0 || y === 0 || x === wT - 1 || y === hT - 1;
      const gap = y === hT - 1 && x >= dx0 && x < dx0 + 2;
      m[y * wT + x] = (edge && !gap) ? 1 : 0;
    }
  return m;
}

function mkRetail(theme, wT, hT, label) {
  const walls = genWalls(wT, hT);
  const doorCx = Math.floor(wT / 2) * TILE + TILE / 2;
  return {
    wTiles: wT, hTiles: hT, walls, theme, label,
    spawnX: doorCx, spawnY: (hT - 3) * TILE + TILE / 2,
    hotspots: [
      { kind: 'exit', x: doorCx, y: (hT - 1) * TILE + TILE * 0.52, r: 46 },
      { kind: 'counter', x: (wT / 2) * TILE, y: 3 * TILE, r: 44, msg: `${label} — counter.` },
    ],
  };
}

// ── Precinct layout ────────────────────────────────────────────────
function createPrecinctLayout() {
  const WT = 28, HT = 22;
  const m = new Uint8Array(WT * HT);
  const sw = (x, y) => { if (x >= 0 && x < WT && y >= 0 && y < HT) m[y * WT + x] = 1; };
  const cl = (x, y) => { if (x >= 0 && x < WT && y >= 0 && y < HT) m[y * WT + x] = 0; };

  for (let x = 0; x < WT; x++) { sw(x, 0); sw(x, HT - 1); }
  for (let y = 0; y < HT; y++) { sw(0, y); sw(WT - 1, y); }
  const ds = Math.floor(WT / 2) - 1;
  cl(ds, HT - 1); cl(ds + 1, HT - 1);

  // Evidence / filing room (left)
  for (let x = 3; x <= 9; x++) { sw(x, 3); sw(x, 8); }
  for (let y = 3; y <= 8; y++) { sw(3, y); sw(9, y); }
  cl(5, 8); cl(6, 8);

  // Central corridor wall
  for (let y = 2; y <= HT - 7; y++) { if (y === 11 || y === 12) continue; sw(14, y); }

  // Holding cells (right)
  for (let x = 16; x <= 25; x++) { sw(x, 4); sw(x, 10); }
  for (let y = 4; y <= 10; y++) { sw(16, y); sw(25, y); }
  for (let y = 5; y <= 9; y++) { sw(19, y); sw(22, y); }
  cl(17, 10); cl(18, 10); cl(20, 10); cl(21, 10); cl(23, 10); cl(24, 10);

  // Desk area
  const deskY = HT - 6;
  for (let x = 5; x <= 17; x++) { if (x === 11 || x === 12) continue; sw(x, deskY); }
  for (let x = 7; x <= 15; x++) sw(x, deskY - 1);

  const doorCx = (ds + 0.5) * TILE;
  return {
    wTiles: WT, hTiles: HT, walls: m, theme: 'precinct', label: 'Precinct 9',
    spawnX: ds * TILE + TILE, spawnY: (HT - 2) * TILE + TILE / 2, deskY,
    hotspots: [
      { kind: 'exit', x: doorCx, y: (HT - 1) * TILE + TILE * 0.52, r: 48 },
      { kind: 'locker', x: 6 * TILE + TILE / 2, y: 5.5 * TILE, r: 44 },
      { kind: 'desk', x: 11 * TILE, y: (deskY - 1.35) * TILE, r: 50, msg: 'Front desk · Duty sergeant post.' },
      { kind: 'cells', x: 20.5 * TILE, y: 7 * TILE, r: 52, msg: 'Holding cells.' },
    ],
  };
}

// ── Bank layout ────────────────────────────────────────────────────
function createBankLayout() {
  const WT = 24, HT = 28;
  const m = new Uint8Array(WT * HT);
  const sw = (x, y) => { if (x >= 0 && x < WT && y >= 0 && y < HT) m[y * WT + x] = 1; };
  const cl = (x, y) => { if (x >= 0 && x < WT && y >= 0 && y < HT) m[y * WT + x] = 0; };

  for (let x = 0; x < WT; x++) { sw(x, 0); sw(x, HT - 1); }
  for (let y = 0; y < HT; y++) { sw(0, y); sw(WT - 1, y); }
  const ds = Math.floor(WT / 2) - 1;
  cl(ds, HT - 1); cl(ds + 1, HT - 1);

  // Vault room
  const splitY = 13;
  for (let x = 2; x <= WT - 3; x++) { if (x === 11 || x === 12) continue; sw(x, splitY); }
  for (let x = 8; x <= 16; x++) { sw(x, 5); sw(x, 9); }
  for (let y = 5; y <= 9; y++) { sw(8, y); sw(16, y); }
  cl(11, 9); cl(12, 9);
  for (let y = 6; y <= 8; y++) for (let x = 9; x <= 15; x++) cl(x, y);

  const bankCars = [];
  const garageY0 = splitY + 1;
  for (let i = 0; i < 6; i++) {
    bankCars.push({
      x: TILE * (4 + (i % 3) * 5) + 10,
      y: TILE * (garageY0 + 1 + Math.floor(i / 3) * 3) + 12,
      dir: i % 2 === 0 ? 'right' : 'left',
      speed: 24 + (i % 4) * 5,
      color: CAR_COLORS[i % CAR_COLORS.length],
      length: 22, width: 11, stopped: false, stopTimer: 0,
    });
  }

  return {
    wTiles: WT, hTiles: HT, walls: m, theme: 'bank', label: 'Citizens Trust',
    spawnX: ds * TILE + TILE, spawnY: (HT - 2) * TILE + TILE / 2,
    garageY0, bankCars,
    hotspots: [
      { kind: 'exit', x: ds * TILE + TILE, y: (HT - 1) * TILE + TILE * 0.52, r: 48 },
      { kind: 'atm', x: 5 * TILE, y: 10 * TILE, r: 36, msg: 'ATM vestibule.' },
      { kind: 'elevator', x: (WT - 2) * TILE, y: 3 * TILE, r: 44, floor: 'garage', label: 'Elevator to Garage (B1)' },
      { kind: 'elevator', x: (WT - 2) * TILE, y: (garageY0 + 3) * TILE, r: 44, floor: 'lobby', label: 'Elevator to Lobby (G)' },
    ],
  };
}

// ── Layout factory ─────────────────────────────────────────────────
const RETAIL_FNS = {
  int_convenience: () => mkRetail('convenience', 15, 11, 'Block 7 Mart'),
  int_bookstore: () => mkRetail('bookstore', 17, 12, 'Dog-Eared Books'),
  int_club: () => mkRetail('club', 18, 14, 'The Velvet Room'),
  int_jewelry: () => mkRetail('jewelry', 13, 10, 'Luminous Gold Co.'),
  int_gas_mart: () => mkRetail('gas_mart', 13, 11, 'Torque Fuels'),
  int_pharmacy: () => mkRetail('pharmacy', 14, 11, 'MedCap Pharmacy'),
  int_cafe: () => mkRetail('cafe', 14, 10, 'Rust Bean Café'),
  int_pawn: () => mkRetail('pawn', 13, 11, "Uncle Joe's Pawn"),
  int_electronics: () => mkRetail('electronics', 15, 11, 'Circuit Breaker'),
  int_laundry: () => mkRetail('laundry', 14, 11, 'Spin Cycle Laundry'),
  int_bank: () => createBankLayout(),
};

export function buildLayout(ent) {
  if (ent.kind === 'precinct') return createPrecinctLayout();
  if (ent.kind === 'house') return mkRetail('house', 11, 10, 'Private Residence');
  const fn = RETAIL_FNS[ent.interiorId];
  return fn ? fn() : mkRetail('generic', 12, 10, ent.label || 'Shop');
}

// ── Enter / Exit ───────────────────────────────────────────────────
export function enterInterior(ent, player, cam, onToast) {
  if (ent.locked) { onToast(`${ent.label} — locked`); return; }
  const L = buildLayout(ent);
  if (!L || !L.walls) return;

  Object.assign(interior, {
    id: ent.interiorId, label: L.label, theme: L.theme,
    wTiles: L.wTiles, hTiles: L.hTiles, walls: L.walls,
    hotspots: L.hotspots || [], bankCars: L.bankCars || [],
    garageY0: L.garageY0 ?? -1, exitWorld: { x: player.x, y: player.y },
    playerX: L.spawnX, playerY: L.spawnY, deskY: L.deskY, dir: 2,
  });
  interiorMoving = false;
  cam.boundW = L.wTiles * TILE;
  cam.boundH = L.hTiles * TILE;
  onToast(ent.label);
}

export function exitInterior(player) {
  interior.walls = null;
  interior.hotspots = [];
  interior.bankCars = [];
  interior.garageY0 = -1;
  if (interior.exitWorld) {
    player.x = interior.exitWorld.x;
    player.y = interior.exitWorld.y;
  }
  interior.exitWorld = null;
  interior.theme = 'generic';
  interior.id = null;
}

// ── Interior collision ─────────────────────────────────────────────
export function interiorCanWalk(nx, ny) {
  const WT = interior.wTiles, HT = interior.hTiles, R = 8;
  for (const [cx, cy] of [[nx - R, ny - R], [nx + R, ny - R], [nx - R, ny + R], [nx + R, ny + R]]) {
    const tx = Math.floor(cx / TILE), ty = Math.floor(cy / TILE);
    if (tx < 0 || ty < 0 || tx >= WT || ty >= HT) return false;
    if (interior.walls[ty * WT + tx]) return false;
  }
  return true;
}

// ── Bank car update ────────────────────────────────────────────────
export function updateBankCars(dt) {
  if (!interior.bankCars?.length) return;
  const maxX = interior.wTiles * TILE - TILE * 2;
  interior.bankCars.forEach(car => {
    const step = car.dir === 'right' ? 1 : -1;
    car.x += step * car.speed * dt;
    if (car.x < TILE * 2) { car.x = TILE * 2; car.dir = 'right'; }
    if (car.x > maxX) { car.x = maxX; car.dir = 'left'; }
  });
}

// ── Interior update ────────────────────────────────────────────────
export function updateInterior(dt, player) {
  let dx = 0, dy = 0;
  const k = typeof keys !== 'undefined' ? keys : {};
  if (k['ArrowUp'] || k['w'] || k['W']) dy -= 1;
  if (k['ArrowDown'] || k['s'] || k['S']) dy += 1;
  if (k['ArrowLeft'] || k['a'] || k['A']) dx -= 1;
  if (k['ArrowRight'] || k['d'] || k['D']) dx += 1;

  interiorMoving = dx !== 0 || dy !== 0;
  if (interiorMoving) {
    if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }
    if (dy < 0) interior.dir = 0;
    else if (dy > 0) interior.dir = 2;
    else if (dx < 0) interior.dir = 3;
    else interior.dir = 1;
  }

  const spd = player.speed;
  const nx = interior.playerX + dx * spd * dt;
  const ny = interior.playerY + dy * spd * dt;
  if (interiorCanWalk(nx, interior.playerY)) interior.playerX = nx;
  if (interiorCanWalk(interior.playerX, ny)) interior.playerY = ny;
  interior.playerX = Math.max(TILE / 2, Math.min(interior.wTiles * TILE - TILE / 2, interior.playerX));
  interior.playerY = Math.max(TILE / 2, Math.min(interior.hTiles * TILE - TILE / 2, interior.playerY));
  updateBankCars(dt);
}

// ── Floor style ────────────────────────────────────────────────────
export function floorStyle(theme, y, gy0) {
  if (theme === 'bank' && gy0 >= 0 && y >= gy0) return { a: '#1a1e26', b: '#141820', line: 'rgba(255,210,60,0.10)' };
  if (theme === 'club') return { a: '#1a0e28', b: '#120a1e', line: 'rgba(180,60,255,0.18)' };
  if (theme === 'jewelry') return { a: '#1e1c2a', b: '#161420', line: 'rgba(232,213,160,0.22)' };
  if (theme === 'cafe') return { a: '#2e2418', b: '#201a10', line: 'rgba(180,130,70,0.22)' };
  if (theme === 'pharmacy') return { a: '#1c2c30', b: '#142024', line: 'rgba(100,200,210,0.18)' };
  if (theme === 'precinct') return { a: '#2c3440', b: '#222832', line: 'rgba(232,213,160,0.09)' };
  if (theme === 'house') return { a: '#302820', b: '#241e18', line: 'rgba(232,213,160,0.07)' };
  if (theme === 'bookstore') return { a: '#281e14', b: '#1e160e', line: 'rgba(180,140,90,0.14)' };
  if (theme === 'convenience' || theme === 'gas_mart') return { a: '#1c2430', b: '#141c26', line: 'rgba(80,180,255,0.12)' };
  if (theme === 'pawn') return { a: '#201c14', b: '#18140e', line: 'rgba(200,160,40,0.14)' };
  if (theme === 'electronics') return { a: '#141e2c', b: '#0e1824', line: 'rgba(60,180,255,0.14)' };
  if (theme === 'laundry') return { a: '#1e2834', b: '#16202a', line: 'rgba(160,200,240,0.14)' };
  return { a: '#1e2438', b: '#161c2c', line: 'rgba(0,0,0,0.2)' };
}

// ── Interior decor drawing ─────────────────────────────────────────
export function drawDecor(ctx, t, ox, oy, WT, HT, interiorRef) {
  const th = interiorRef.theme;
  const gy = interiorRef.garageY0;

  if (th === 'precinct') drawPrecinctDecor(ctx, ox, oy, WT, HT, interiorRef, t);
  if (th === 'bank' && gy >= 0) drawBankDecor(ctx, ox, oy, WT, HT, interiorRef, t);
  if (th === 'convenience' || th === 'gas_mart') drawConvenienceDecor(ctx, ox, oy, WT, HT, t);
  if (th === 'bookstore') drawBookstoreDecor(ctx, ox, oy, WT, HT, t);
  if (th === 'club') drawClubDecor(ctx, ox, oy, WT, HT, t);
  if (th === 'jewelry') drawJewelryDecor(ctx, ox, oy, WT, HT, t);
  if (th === 'pharmacy') drawPharmacyDecor(ctx, ox, oy, WT, HT, t);
  if (th === 'cafe') drawCafeDecor(ctx, ox, oy, WT, HT, t);
  if (th === 'pawn') drawPawnDecor(ctx, ox, oy, WT, HT, t);
  if (th === 'electronics') drawElectronicsDecor(ctx, ox, oy, WT, HT, t);
  if (th === 'laundry') drawLaundryDecor(ctx, ox, oy, WT, HT, t);
  if (th === 'house') drawHouseDecor(ctx, ox, oy, WT, HT, t);
}

function drawPrecinctDecor(ctx, ox, oy, WT, HT, intRef, t) {
  // Filing cabinets
  const gx = 3 * TILE + ox, gy1 = 3 * TILE + oy;
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(gx + 10, gy1 + 20, 6 * TILE - 14, 4 * TILE - 26);
  ctx.fillStyle = '#1e2a3c'; ctx.fillRect(gx + 8, gy1 + 18, 6 * TILE - 16, 4 * TILE - 28);
  for (let i = 0; i < 7; i++) {
    const dx = gx + 14 + i * 14, dh = 4 * TILE - 40;
    ctx.fillStyle = `rgb(${50 + i * 5},${62 + i * 4},${82 + i * 5})`; ctx.fillRect(dx, gy1 + 22, 10, dh);
    for (let j = 1; j < 4; j++) { ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(dx, gy1 + 22 + j * (dh / 4)); ctx.lineTo(dx + 10, gy1 + 22 + j * (dh / 4)); ctx.stroke(); }
    ctx.fillStyle = 'rgba(232,213,160,0.35)'; ctx.fillRect(dx + 3, gy1 + 22 + dh / 2 - 3, 4, 3);
    ctx.strokeStyle = 'rgba(232,213,160,0.15)'; ctx.lineWidth = 0.5; ctx.strokeRect(dx, gy1 + 22, 10, dh);
  }

  // Desk
  const dY = (intRef.deskY || HT - 6) * TILE + oy;
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(5 * TILE + ox + 4, dY - TILE * 0.85 + 4, 9 * TILE, TILE * 0.65);
  const dg = ctx.createLinearGradient(5 * TILE + ox, dY - TILE * 0.85, 5 * TILE + ox, dY);
  dg.addColorStop(0, '#4a3e2c'); dg.addColorStop(1, '#332a1e');
  ctx.fillStyle = dg; ctx.fillRect(5 * TILE + ox, dY - TILE * 0.85, 9 * TILE, TILE * 0.65);
  ctx.strokeStyle = 'rgba(232,213,160,0.18)'; ctx.lineWidth = 1; ctx.strokeRect(5 * TILE + ox + 0.5, dY - TILE * 0.85 + 0.5, 9 * TILE - 1, TILE * 0.65 - 1);
  ctx.fillStyle = 'rgba(232,213,160,0.1)'; ctx.fillRect(5 * TILE + ox, dY - TILE * 0.85, 9 * TILE, 3);

  // Monitor
  ctx.fillStyle = '#0a0e14'; ctx.fillRect(10.2 * TILE + ox, dY - TILE * 1.12, TILE * 1.6, TILE * 0.55);
  ctx.strokeStyle = 'rgba(0,180,255,0.25)'; ctx.lineWidth = 1; ctx.strokeRect(10.2 * TILE + ox + 0.5, dY - TILE * 1.12 + 0.5, TILE * 1.6 - 1, TILE * 0.55 - 1);
  for (let i = 0; i < 4; i++) { ctx.fillStyle = `rgba(0,180,255,${0.06 + i * 0.02})`; ctx.fillRect(10.3 * TILE + ox, dY - TILE * 1.06 + i * 6, TILE * 1.4, 2); }
  ctx.fillStyle = 'rgba(240,236,220,0.7)'; ctx.fillRect(6.5 * TILE + ox, dY - TILE * 0.8, TILE * 1.2, TILE * 0.3);

  // Cells
  for (let cell = 0; cell < 3; cell++) {
    const cx = (17 + cell * 3) * TILE + ox, cy = 5 * TILE + oy;
    ctx.fillStyle = 'rgba(10,14,20,0.5)'; ctx.fillRect(cx + 2, cy + 2, 3 * TILE - 4, 5 * TILE - 4);
    ctx.strokeStyle = 'rgba(160,175,195,0.45)'; ctx.lineWidth = 2;
    for (let k = 0; k < 7; k++) { ctx.beginPath(); ctx.moveTo(cx + 4 + k * 5, cy + 6); ctx.lineTo(cx + 4 + k * 5, cy + TILE - 12); ctx.stroke(); }
  }

  // Wall clock
  const clkX = 6 * TILE + ox + TILE / 2, clkY = 2.5 * TILE + oy;
  ctx.fillStyle = '#e8e4d8'; ctx.beginPath(); ctx.arc(clkX, clkY, 12, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(clkX, clkY, 12, 0, Math.PI * 2); ctx.stroke();
  const hr = (8 / 12) * Math.PI * 2 - Math.PI / 2, mn = 0;
  ctx.strokeStyle = '#222'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(clkX, clkY); ctx.lineTo(clkX + Math.cos(hr) * 6, clkY + Math.sin(hr) * 6); ctx.stroke();
  ctx.strokeStyle = '#444'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(clkX, clkY); ctx.lineTo(clkX + Math.cos(mn) * 9, clkY + Math.sin(mn) * 9); ctx.stroke();

  // Bulletin board
  ctx.fillStyle = '#5c3e1e'; ctx.fillRect(9 * TILE + ox, TILE + oy, 3 * TILE, 2 * TILE);
  [[0.3, 0.3, '#e84040'], [0.6, 0.5, '#4080e8'], [0.8, 0.25, '#40c040'], [0.2, 0.7, '#e0a020']].forEach(([px, py, pc]) => {
    ctx.fillStyle = 'rgba(255,252,240,0.6)'; ctx.fillRect(9 * TILE + ox + 4 + px * 3 * TILE * 0.7, TILE + oy + 4 + py * 2 * TILE * 0.6, TILE * 0.8, TILE * 0.5);
    ctx.fillStyle = pc; ctx.beginPath(); ctx.arc(9 * TILE + ox + 4 + px * 3 * TILE * 0.7 + 4, TILE + oy + 4 + py * 2 * TILE * 0.6 + 4, 2.5, 0, Math.PI * 2); ctx.fill();
  });
}

function drawBankDecor(ctx, ox, oy, WT, HT, intRef, t) {
  const gy = intRef.garageY0;
  // Marble checker
  for (let ty = 1; ty < gy; ty++) for (let tx = 1; tx < WT - 1; tx++) {
    const sh = ((tx + ty) % 2) * 8;
    ctx.fillStyle = `rgba(${sh},${sh},${sh + 4},0.12)`; ctx.fillRect(tx * TILE + ox + 1, ty * TILE + oy + 1, TILE - 2, TILE - 2);
  }
  // Teller counter
  const cg = ctx.createLinearGradient(8 * TILE + ox, 6 * TILE + oy, 8 * TILE + ox, 9 * TILE + oy);
  cg.addColorStop(0, '#3a3228'); cg.addColorStop(1, '#262018');
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(8 * TILE + ox + 4, 6 * TILE + oy + 4, 9 * TILE, 3 * TILE - 8);
  ctx.fillStyle = cg; ctx.fillRect(8 * TILE + ox, 6 * TILE + oy, 9 * TILE, 3 * TILE - 8);
  ctx.fillStyle = 'rgba(232,213,160,0.15)'; ctx.fillRect(8 * TILE + ox, 6 * TILE + oy, 9 * TILE, 4);
  for (let i = 0; i < 3; i++) {
    const tx = 9 * TILE + ox + i * 3 * TILE;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(tx, 6 * TILE + oy + 4, TILE * 2, TILE - 8);
    ctx.strokeStyle = 'rgba(232,213,160,0.3)'; ctx.lineWidth = 1; ctx.strokeRect(tx, 6 * TILE + oy + 4, TILE * 2, TILE - 8);
    for (let g = 0; g < 5; g++) { ctx.fillStyle = 'rgba(232,213,160,0.1)'; ctx.fillRect(tx + 6 + g * 8, 6 * TILE + oy + 12, 2, TILE - 20); }
  }
  // Vault door
  ctx.fillStyle = '#2a2e38'; ctx.fillRect(9 * TILE + ox, TILE + oy, 6 * TILE, 4 * TILE);
  ctx.fillStyle = '#1a1e24'; ctx.fillRect(10 * TILE + ox, TILE * 1.5 + oy, 4 * TILE, 3 * TILE);
  ctx.strokeStyle = 'rgba(200,180,100,0.35)'; ctx.lineWidth = 3; ctx.strokeRect(10 * TILE + ox + 1.5, TILE * 1.5 + oy + 1.5, 4 * TILE - 3, 3 * TILE - 3);
  const vx = 12 * TILE + ox, vy = TILE * 3 + oy;
  ctx.strokeStyle = 'rgba(200,180,100,0.2)'; ctx.lineWidth = 2;
  for (let a = 0; a < 6; a++) { ctx.beginPath(); ctx.moveTo(vx, vy); ctx.lineTo(vx + Math.cos(a * Math.PI / 3) * TILE * 1.5, vy + Math.sin(a * Math.PI / 3) * TILE * 1.5); ctx.stroke(); }
  ctx.fillStyle = 'rgba(200,180,100,0.15)'; ctx.beginPath(); ctx.arc(vx, vy, 18, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(200,180,100,0.4)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(vx, vy, 18, 0, Math.PI * 2); ctx.stroke();

  // Elevators
  const elvX = (WT - 2) * TILE + ox, elvW = TILE, elvH = TILE;
  [[2 * TILE + oy, 0], [(gy + 2) * TILE + oy, 1]].forEach(([ey, fi]) => {
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(elvX + 4, ey + 4, elvW, elvH);
    ctx.fillStyle = '#2a3040'; ctx.fillRect(elvX, ey, elvW, elvH);
    ctx.strokeStyle = 'rgba(232,213,160,0.35)'; ctx.lineWidth = 1.5; ctx.strokeRect(elvX + 0.5, ey + 0.5, elvW - 1, elvH - 1);
    ctx.fillStyle = 'rgba(10,12,18,0.9)'; ctx.fillRect(elvX + elvW * 0.1, ey + elvH * 0.1, elvW * 0.8, elvH * 0.9);
    ctx.fillStyle = '#3a4a5c'; ctx.fillRect(elvX + elvW * 0.12, ey + elvH * 0.12, elvW * 0.37, elvH * 0.83); ctx.fillRect(elvX + elvW * 0.51, ey + elvH * 0.12, elvW * 0.37, elvH * 0.83);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(elvX + elvW * 0.25, ey + elvH * 0.2); ctx.lineTo(elvX + elvW * 0.25, ey + elvH * 0.8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(elvX + elvW * 0.75, ey + elvH * 0.2); ctx.lineTo(elvX + elvW * 0.75, ey + elvH * 0.8); ctx.stroke();
    const bx = elvX - elvW * 0.22, by = ey + elvH * 0.55;
    ctx.fillStyle = '#1a1e24'; ctx.fillRect(bx - 4, by - 10, 8, 20);
    const btnOn = (t * 2 % 1) > 0.2;
    const btnColor = btnOn ? 'rgba(232,213,160,0.95)' : 'rgba(80,60,40,0.8)';
    ctx.fillStyle = btnColor; ctx.beginPath(); ctx.arc(bx, by - 4, 2.5, 0, Math.PI * 2); ctx.fill();
    if (btnOn) { ctx.shadowBlur = 8; ctx.shadowColor = 'rgba(232,213,160,0.6)'; ctx.beginPath(); ctx.arc(bx, by - 4, 1.5, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; }
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.beginPath(); ctx.arc(bx, by + 4, 2.5, 0, Math.PI * 2); ctx.fill();
    const fidx = elvX + elvW / 2, fidy = ey + elvH * 0.06;
    ctx.fillStyle = '#05080a'; ctx.fillRect(fidx - 10, fidy - 2, 20, 12);
    ctx.strokeStyle = 'rgba(232,213,160,0.2)'; ctx.lineWidth = 0.5; ctx.strokeRect(fidx - 10.5, fidy - 2.5, 21, 13);
    ctx.fillStyle = 'rgba(232,213,160,0.85)'; ctx.font = 'bold 9px "Share Tech Mono",monospace'; ctx.textAlign = 'center';
    ctx.shadowBlur = 4; ctx.shadowColor = 'rgba(232,213,160,0.5)'; ctx.fillText(fi === 0 ? 'G' : 'B1', fidx, fidy + 8); ctx.shadowBlur = 0; ctx.textAlign = 'left';
  });
  // Garage lines
  for (let ty = gy; ty < HT - 1; ty++) for (let tx = 3; tx < WT - 3; tx += 4) { ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fillRect(tx * TILE + ox + 18, ty * TILE + oy + 14, 8, 28); }
}

function drawConvenienceDecor(ctx, ox, oy, WT, HT, t) {
  const pColors = ['#e84040', '#40a0e8', '#f0c040', '#40c080', '#e060c0'];
  for (let col = 0; col < 3; col++) {
    const sx = (2 + col * 3.5) * TILE + ox;
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(sx + 4, 2 * TILE + oy + 4, TILE * 1.6, (HT - 5) * TILE);
    ctx.fillStyle = '#1e2840'; ctx.fillRect(sx, 2 * TILE + oy, TILE * 1.6, (HT - 5) * TILE);
    for (let s = 0; s < 6; s++) {
      const sy = 2 * TILE + oy + s * (HT - 5) * TILE / 6;
      ctx.fillStyle = '#2a3650'; ctx.fillRect(sx, sy, TILE * 1.6, 4);
      for (let p = 0; p < 5; p++) { ctx.fillStyle = pColors[(col * 5 + s * 3 + p) % pColors.length]; ctx.fillRect(sx + 4 + p * 11, sy + 6, 9, 14); }
    }
  }
  const sp = 0.7 + 0.3 * Math.sin(t * 2);
  ctx.fillStyle = `rgba(220,55,40,${sp})`; ctx.fillRect((WT - 3.5) * TILE + ox, 2 * TILE + oy + TILE * 1.4, TILE * 1.2, TILE * 0.6);
  ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = '700 9px "Barlow Condensed",sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('OPEN 24HR', (WT - 2.9) * TILE + ox, (2 + 1.7) * TILE + oy); ctx.textAlign = 'left';
}

function drawBookstoreDecor(ctx, ox, oy, WT, HT, t) {
  const bkC = ['#8b2020', '#1a5a8a', '#2a6a2a', '#6a4a10', '#5a1a7a', '#8a6a10', '#1a4a6a'];
  for (let col = 2; col < WT - 2; col += 2) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(col * TILE + ox + 8, 2 * TILE + oy + 4, TILE - 12, (HT - 5) * TILE);
    ctx.fillStyle = '#3c2c14'; ctx.fillRect(col * TILE + ox + 6, 2 * TILE + oy, TILE - 12, (HT - 5) * TILE);
    for (let s = 0; s < 6; s++) { const sy = 2 * TILE + oy + s * (HT - 5) * TILE / 6; ctx.fillStyle = '#4a3820'; ctx.fillRect(col * TILE + ox + 6, sy, TILE - 12, 3); }
  }
  const la = 0.35 + 0.2 * Math.abs(Math.sin(t * 0.5));
  ctx.fillStyle = `rgba(255,200,100,${la})`; ctx.beginPath(); ctx.arc(3 * TILE + ox, 2.5 * TILE + oy, 20, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,220,140,0.7)'; ctx.beginPath(); ctx.arc(3 * TILE + ox, 2.5 * TILE + oy, 4, 0, Math.PI * 2); ctx.fill();
}

function drawClubDecor(ctx, ox, oy, WT, HT, t) {
  const bp = 0.35 + 0.2 * Math.sin(t * 4.2);
  for (let dx = 2; dx < WT - 2; dx++) for (let dy = 3; dy < HT - 4; dy++) {
    const d = Math.sin(dx * 0.8 + t * 3) * Math.cos(dy * 0.6 + t * 2);
    const r = 80 + d * 60 | 0, g2 = 20 + dy * 8 | 0, b2 = 120 + d * 80 | 0;
    ctx.fillStyle = `rgba(${r},${g2},${b2},0.3)`; ctx.fillRect(dx * TILE + ox + 1, dy * TILE + oy + 1, TILE - 2, TILE - 2);
  }
  [{ x: 3, col: 'rgba(255,60,180,' }, { x: WT / 2, col: 'rgba(60,120,255,' }, { x: WT - 4, col: 'rgba(255,200,60,' }].forEach((b, i) => {
    const bx = b.x * TILE + ox, by = TILE + oy, sp = 80 + 30 * Math.sin(t * 1.5 + i * 2);
    const bg = ctx.createRadialGradient(bx, by, 4, bx, by + 120, sp);
    bg.addColorStop(0, b.col + (bp * 0.8) + ')'); bg.addColorStop(1, b.col + '0)');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(bx, by + 120, sp, 0, Math.PI * 2); ctx.fill();
  });
  // DJ booth
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(3 * TILE + ox + 3, 2 * TILE + oy + 3, TILE * 4, TILE * 1.5);
  ctx.fillStyle = '#1a0e28'; ctx.fillRect(3 * TILE + ox, 2 * TILE + oy, TILE * 4, TILE * 1.5);
  ctx.strokeStyle = 'rgba(180,60,255,0.4)'; ctx.lineWidth = 1; ctx.strokeRect(3 * TILE + ox + 0.5, 2 * TILE + oy + 0.5, TILE * 4 - 1, TILE * 1.5 - 1);
  for (let k = 0; k < 6; k++) {
    ctx.fillStyle = 'rgba(50,20,80,0.9)'; ctx.beginPath(); ctx.arc(4 * TILE + ox + k * 14, 2.6 * TILE + oy, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(180,60,255,0.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(4 * TILE + ox + k * 14, 2.6 * TILE + oy); ctx.lineTo(4 * TILE + ox + k * 14 + Math.cos(t * 2 + k) * 4, 2.6 * TILE + oy + Math.sin(t * 2 + k) * 4); ctx.stroke();
  }
  // Bar
  ctx.fillStyle = '#1c0e30'; ctx.fillRect((WT - 4) * TILE + ox, 3 * TILE + oy, TILE * 2, TILE * (HT - 6));
  ctx.strokeStyle = 'rgba(180,60,255,0.2)'; ctx.lineWidth = 1; ctx.strokeRect((WT - 4) * TILE + ox + 0.5, 3 * TILE + oy + 0.5, TILE * 2 - 1, TILE * (HT - 6) - 1);
  const bkC = ['#304090', '#903030', '#309030', '#806010'];
  for (let b = 0; b < 8; b++) { const bx = (WT - 3.8) * TILE + ox + b * 12; ctx.fillStyle = bkC[b % 4]; ctx.fillRect(bx, 3.2 * TILE + oy, 7, 20); ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(bx + 1, 3.2 * TILE + oy, 2, 8); ctx.fillStyle = bkC[b % 4]; ctx.fillRect(bx + 2, 3.2 * TILE + oy - 8, 3, 10); }
}

function drawJewelryDecor(ctx, ox, oy, WT, HT, t) {
  const gemC = ['#ff4060', '#4080ff', '#40ff80', '#ffcc20', '#cc40ff'];
  for (let c2 = 0; c2 < 3; c2++) {
    const cx = (2 + c2 * 3.5) * TILE + ox, cy = 3.5 * TILE + oy;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(cx + 4, cy + 4, TILE * 2.5, TILE * 0.8);
    const jg = ctx.createLinearGradient(cx, cy, cx, cy + TILE * 0.8); jg.addColorStop(0, 'rgba(50,60,80,0.9)'); jg.addColorStop(1, 'rgba(30,36,52,0.9)');
    ctx.fillStyle = jg; ctx.fillRect(cx, cy, TILE * 2.5, TILE * 0.8);
    ctx.strokeStyle = 'rgba(232,213,160,0.35)'; ctx.lineWidth = 1; ctx.strokeRect(cx + 0.5, cy + 0.5, TILE * 2.5 - 1, TILE * 0.8 - 1);
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(cx + 2, cy + 1, TILE * 2.5 - 4, 3);
    for (let i = 0; i < 5; i++) {
      const gx = cx + 8 + i * TILE * 0.44, gy = cy + 10;
      ctx.fillStyle = 'rgba(255,255,200,0.15)'; ctx.fillRect(gx - 2, gy - 2, 14, 14);
      ctx.fillStyle = gemC[(c2 * 5 + i) % 5]; ctx.beginPath(); ctx.arc(gx + 5, gy + 5, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(gx + 3, gy + 3, 2, 2);
    }
  }
  ctx.fillStyle = '#3c1a1a'; ctx.fillRect(2 * TILE + ox, 6 * TILE + oy, TILE * (WT - 4), TILE * 0.6); ctx.strokeStyle = 'rgba(232,213,160,0.2)'; ctx.strokeRect(2 * TILE + ox + 0.5, 6 * TILE + oy + 0.5, TILE * (WT - 4) - 1, TILE * 0.6 - 1);
}

function drawPharmacyDecor(ctx, ox, oy, WT, HT, t) {
  for (let col = 1; col < WT - 2; col += 2) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect((col + 0.1) * TILE + ox + 3, 2 * TILE + oy + 4, TILE * 1.4, (HT - 5) * TILE);
    ctx.fillStyle = '#2a3a3c'; ctx.fillRect((col + 0.1) * TILE + ox, 2 * TILE + oy, TILE * 1.4, (HT - 5) * TILE);
    for (let s = 0; s < 6; s++) { ctx.fillStyle = '#384a4e'; ctx.fillRect((col + 0.1) * TILE + ox, 2 * TILE + oy + s * (HT - 5) * TILE / 6, TILE * 1.4, 3); }
  }
  ctx.fillStyle = 'rgba(0,180,160,0.7)'; ctx.fillRect((WT - 5) * TILE + ox + 8, 2.2 * TILE + oy, TILE * 2.4, TILE * 0.7);
  ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = '700 10px "Barlow Condensed",sans-serif'; ctx.textAlign = 'center'; ctx.fillText('PRESCRIPTION', (WT - 5) * TILE + ox + TILE * 1.5, 2.6 * TILE + oy); ctx.textAlign = 'left';
}

function drawCafeDecor(ctx, ox, oy, WT, HT, t) {
  const cg = ctx.createLinearGradient(2 * TILE + ox, (HT - 5) * TILE + oy, 2 * TILE + ox, (HT - 4) * TILE + oy); cg.addColorStop(0, '#4a3420'); cg.addColorStop(1, '#2e2010');
  ctx.fillStyle = cg; ctx.fillRect(2 * TILE + ox, (HT - 5) * TILE + oy, TILE * (WT - 5), TILE * 0.9);
  ctx.strokeStyle = 'rgba(180,130,70,0.3)'; ctx.lineWidth = 1; ctx.strokeRect(2 * TILE + ox + 0.5, (HT - 5) * TILE + oy + 0.5, TILE * (WT - 5) - 1, TILE * 0.9 - 1);
  [[2, 1], [4.5, 1], [7, 1], [2, 3.5], [4.5, 3.5], [7, 3.5]].forEach(([tx, ty]) => {
    const ttx = tx * TILE + ox, tty = ty * TILE + oy;
    ctx.fillStyle = '#5c3c1c'; ctx.fillRect(ttx, tty, TILE * 1.2, TILE * 0.9);
    ctx.strokeStyle = 'rgba(180,130,70,0.25)'; ctx.lineWidth = 0.5; ctx.strokeRect(ttx + 0.5, tty + 0.5, TILE * 1.2 - 1, TILE * 0.9 - 1);
  });
  ctx.fillStyle = '#1e2010'; ctx.fillRect((WT - 3) * TILE + ox, 2 * TILE + oy, TILE * 2, TILE * 2.5);
  ctx.strokeStyle = 'rgba(180,130,70,0.3)'; ctx.lineWidth = 2; ctx.strokeRect((WT - 3) * TILE + ox + 1, 2 * TILE + oy + 1, TILE * 2 - 2, TILE * 2.5 - 2);
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.font = '700 8px "Barlow Condensed",sans-serif'; ctx.textAlign = 'center'; ctx.fillText('MENU', (WT - 2) * TILE + ox, 2.4 * TILE + oy);
  ctx.textAlign = 'left';
}

function drawPawnDecor(ctx, ox, oy, WT, HT, t) {
  const pawnIt = [{ c: '#808080' }, { c: '#c0a050' }, { c: '#8050a0' }, { c: '#505090' }, { c: '#8080c0' }, { c: '#90a060' }];
  const pg = ctx.createLinearGradient(2 * TILE + ox, 3.5 * TILE + oy, 2 * TILE + ox, 4.5 * TILE + oy); pg.addColorStop(0, '#3c3420'); pg.addColorStop(1, '#282010');
  ctx.fillStyle = pg; ctx.fillRect(2 * TILE + ox, 3.5 * TILE + oy, TILE * (WT - 4), TILE * 1.0);
  ctx.strokeStyle = 'rgba(200,160,40,0.25)'; ctx.lineWidth = 1; ctx.strokeRect(2 * TILE + ox + 0.5, 3.5 * TILE + oy + 0.5, TILE * (WT - 4) - 1, TILE * 1.0 - 1);
  pawnIt.forEach((item, i) => { const ix = 3 * TILE + ox + i * TILE * 1.4, iy = 3.7 * TILE + oy; ctx.fillStyle = item.c; ctx.fillRect(ix, iy, 24, 24); ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(ix + 2, iy + 2, 6, 6); });
  const np = 0.6 + 0.4 * Math.abs(Math.sin(t * 2.5)); ctx.fillStyle = `rgba(40,180,60,${np})`; ctx.font = '700 22px "Barlow Condensed",sans-serif'; ctx.textAlign = 'center'; ctx.fillText('$$$', (WT / 2) * TILE + ox, 1.6 * TILE + oy); ctx.textAlign = 'left';
}

function drawElectronicsDecor(ctx, ox, oy, WT, HT, t) {
  const ep = 0.7 + 0.3 * Math.sin(t * 3.5);
  ctx.fillStyle = `rgba(0,180,255,${ep * 0.5})`; ctx.font = '700 13px "Barlow Condensed",sans-serif'; ctx.textAlign = 'center'; ctx.fillText('CIRCUIT BREAKER', (WT / 2) * TILE + ox, 1.4 * TILE + oy); ctx.textAlign = 'left';
  for (let row = 1; row < 5; row++) {
    ctx.fillStyle = '#0e1828'; ctx.fillRect(2 * TILE + ox, (row + 0.1) * TILE + oy, TILE * (WT - 4), TILE * 0.85);
    ctx.strokeStyle = 'rgba(60,140,255,0.15)'; ctx.lineWidth = 0.5; ctx.strokeRect(2 * TILE + ox + 0.5, (row + 0.1) * TILE + oy + 0.5, TILE * (WT - 4) - 1, TILE * 0.85 - 1);
  }
}

function drawLaundryDecor(ctx, ox, oy, WT, HT, t) {
  ctx.fillStyle = 'rgba(0,80,180,0.6)'; ctx.fillRect((WT / 2 - 2) * TILE + ox, TILE + oy, TILE * 4, TILE * 0.7);
  ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = '700 10px "Barlow Condensed",sans-serif'; ctx.textAlign = 'center'; ctx.fillText('SPIN CYCLE LAUNDRY', (WT / 2) * TILE + ox, 1.5 * TILE + oy); ctx.textAlign = 'left';
  for (let row = 0; row < 2; row++) for (let k = 0; k < 5; k++) {
    const lx = 2 * TILE + ox + k * TILE * 2, ly = (2 + row * 3.5) * TILE + oy;
    const mg = ctx.createLinearGradient(lx, ly, lx + TILE * 1.6, ly); mg.addColorStop(0, '#d8dce8'); mg.addColorStop(1, '#b8bcc8');
    ctx.fillStyle = mg; ctx.fillRect(lx, ly, TILE * 1.6, TILE * 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 0.5; ctx.strokeRect(lx + 0.5, ly + 0.5, TILE * 1.6 - 1, TILE * 2 - 1);
    const drumX = lx + TILE * 0.8, drumY = ly + TILE * 0.9, ph = (t * (0.5 + k * 0.1)) % (Math.PI * 2);
    ctx.fillStyle = '#404858'; ctx.beginPath(); ctx.arc(drumX, drumY, TILE * 0.55, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(140,180,220,0.45)'; ctx.beginPath(); ctx.arc(drumX, drumY, TILE * 0.45, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(30,34,44,0.9)'; ctx.fillRect(lx + 4, ly + TILE * 1.6, TILE * 1.4, TILE * 0.35);
    ctx.fillStyle = row === 0 && k % 2 === 0 ? 'rgba(0,200,100,0.8)' : 'rgba(100,100,100,0.5)'; ctx.beginPath(); ctx.arc(lx + TILE * 1.2, ly + TILE * 1.78, 4, 0, Math.PI * 2); ctx.fill();
  }
}

function drawHouseDecor(ctx, ox, oy, WT, HT, t) {
  ctx.fillStyle = 'rgba(120,60,40,0.35)'; ctx.fillRect(2 * TILE + ox, 2 * TILE + oy, TILE * (WT - 4), TILE * (HT - 5));
  ctx.strokeStyle = 'rgba(180,100,60,0.2)'; ctx.strokeRect(2 * TILE + ox + 4, 2 * TILE + oy + 4, TILE * (WT - 4) - 8, TILE * (HT - 5) - 8);
  ctx.fillStyle = '#5c3a2a'; ctx.fillRect(3 * TILE + ox, 3 * TILE + oy, TILE * 4, TILE * 1.5);
  ctx.fillStyle = '#101418'; ctx.fillRect(3 * TILE + ox, TILE + oy, TILE * 3, TILE * 1.5);
  ctx.fillStyle = 'rgba(40,80,140,0.6)'; ctx.fillRect(3.1 * TILE + ox, 1.1 * TILE + oy, TILE * 2.8, TILE * 1.2);
  const tvG = `rgba(40,80,160,${0.1 + 0.05 * Math.sin(t * 0.8)})`; ctx.fillStyle = tvG; ctx.beginPath(); ctx.arc(4.5 * TILE + ox, 1.7 * TILE + oy, TILE * 1.8, 0, Math.PI * 2); ctx.fill();
}

// ── Draw interior scene (at ITILE scale) ───────────────────────────
export function drawInteriorScene(ctx, cam, interiorRef, t, W, H, drawPlayerFn) {
  const WT = interiorRef.wTiles, HT = interiorRef.hTiles;
  ctx.fillStyle = '#06080c';
  ctx.fillRect(0, 0, W, H);

  const ipx = interiorRef.playerX, ipy = interiorRef.playerY;
  const iox = Math.max(0, Math.min(WT * ITILE - W, ipx - W / 2));
  const ioy = Math.max(0, Math.min(HT * ITILE - H, ipy - H / 2));
  const ox = -iox, oy = -ioy;

  for (let y = 0; y < HT; y++) {
    for (let x = 0; x < WT; x++) {
      const wx = x * ITILE + ox, wy = y * ITILE + oy;
      if (wx > W || wy > H || wx + ITILE < 0 || wy + ITILE < 0) continue;
      const solid = interiorRef.walls[y * WT + x];
      const fs = floorStyle(interiorRef.theme, y, interiorRef.garageY0);
      if (!solid) {
        const even = (x + y) % 2 === 0;
        ctx.fillStyle = even ? fs.a : fs.b;
        ctx.fillRect(wx, wy, ITILE, ITILE);
        ctx.strokeStyle = fs.line; ctx.lineWidth = 0.5; ctx.strokeRect(wx + 0.5, wy + 0.5, ITILE - 1, ITILE - 1);
        if (even) { ctx.fillStyle = 'rgba(255,255,255,0.025)'; ctx.fillRect(wx + 1, wy + 1, ITILE * 0.4, ITILE * 0.2); }
      } else {
        const wallBase = interiorRef.theme === 'precinct' ? [52, 68, 92] :
          interiorRef.theme === 'club' ? [48, 22, 72] :
          interiorRef.theme === 'cafe' ? [72, 52, 32] :
          interiorRef.theme === 'jewelry' ? [58, 52, 80] :
          interiorRef.theme === 'pharmacy' ? [32, 72, 78] :
          interiorRef.theme === 'bank' ? [48, 56, 72] : [40, 48, 68];
        const sh = ((x * 3 + y * 7) % 4) * 6;
        const [wr, wg, wb] = wallBase;
        ctx.fillStyle = `rgb(${wr + sh},${wg + sh},${wb + sh})`;
        ctx.fillRect(wx, wy, ITILE, ITILE);
        ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(wx, wy + ITILE / 2); ctx.lineTo(wx + ITILE, wy + ITILE / 2); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.09)'; ctx.fillRect(wx, wy, ITILE, 3);
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(wx, wy + ITILE - 4, ITILE, 4);
      }
    }
  }

  // Ceiling glow
  let glowC = 'rgba(40,50,70,0.15)';
  if (interiorRef.theme === 'club') glowC = 'rgba(80,20,120,0.2)';
  if (interiorRef.theme === 'cafe') glowC = 'rgba(60,40,20,0.18)';
  if (interiorRef.theme === 'jewelry') glowC = 'rgba(60,55,30,0.18)';
  const rg = ctx.createRadialGradient((WT / 2) * ITILE + ox, (HT / 3) * ITILE + oy, 0, (WT / 2) * ITILE + ox, (HT / 3) * ITILE + oy, WT * ITILE * 0.7);
  rg.addColorStop(0, glowC); rg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rg; ctx.fillRect(ox, oy, WT * ITILE, HT * ITILE);

  ctx.save();
  ctx.translate(ox, oy);
  const tScale = ITILE / TILE;
  ctx.scale(tScale, tScale);
  drawDecor(ctx, t, 0, 0, WT, HT, interiorRef);
  ctx.restore();

  // Exit glow
  const dx0 = Math.floor(WT / 2) - 1;
  const doorY = (HT - 1) * ITILE;
  for (let k = 0; k < 2; k++) {
    const wx = (dx0 + k) * ITILE + ox, wy = doorY + oy;
    const gw = 0.35 + 0.15 * Math.sin(t * 3);
    ctx.fillStyle = `rgba(40,55,85,${gw})`; ctx.fillRect(wx + 6, wy + 8, ITILE - 12, ITILE - 14);
    ctx.fillStyle = `rgba(232,213,160,${0.25 + gw * 0.2})`; ctx.fillRect(wx + 16, wy + 18, ITILE - 32, 5);
  }

  // Draw player inside
  if (drawPlayerFn) {
    drawPlayerFn(ctx, ipx - iox, ipy - ioy, t, interiorMoving, interiorRef.dir, 'class_a', ITILE / TILE);
  }

  // Interior header
  ctx.fillStyle = 'rgba(6,8,14,0.72)'; ctx.fillRect(0, 0, W, 48);
  ctx.fillStyle = 'rgba(232,213,160,0.45)'; ctx.font = '600 12px "Barlow Condensed",sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(interiorRef.label.toUpperCase(), W / 2, 18);
  ctx.font = '10px "Share Tech Mono",monospace'; ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillText('E — INTERACT / EXIT   ·   WASD — MOVE   ·   SPACE — USE ITEM', W / 2, 34);
  ctx.textAlign = 'left';
}
