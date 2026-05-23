// ── Beat Cop — Main Game Entry ────────────────────────────────────
import {
  TILE, COLS, ROWS, MW, MH, ITILE,
  T_BUILDING, T_PAVEMENT, T_ROAD_INT, T_ASPHALT_LOT, T_PARK,
  PRECINCT_LOT, DISTRICTS,
} from './src/constants.js';
import { clock } from './src/clock.js';
import { cam } from './src/camera.js';
import * as Input from './src/input.js';
import { player, setMapRef, drawCopFigure, drawPlayer, resetPlayer } from './src/player.js';
import { weaponFx, updateWeaponFx, drawWeaponFxLayer, getScreenShake } from './src/weapons.js';
import {
  genMap, map, dmap, bdata, entrances, roadColsList, roadRowsList,
  mapCanvas, mapCtx, mapDirty, buildMapCache,
  drawBuildings, drawDynamicTiles, drawGasForecourts, drawEntranceFacades,
  drawStreetLamps, drawVignette, drawScanlines,
} from './src/map.js';
import {
  interior, interiorMoving, buildLayout,
  enterInterior, exitInterior, updateInterior, interiorCanWalk,
  drawInteriorScene, drawDecor,
} from './src/interiors.js';
import {
  toast, tickToast, updateHUD, updateMoneyHUD,
  setupUI, openLockerMenu, openShopMenu, openNotebook, openRadio,
  useHandItem, isModalOpen, syncGearHotbar, refreshHotbarDOM,
  saveGameState, loadGameState, updateRadioUI,
  addMoney,
} from './src/ui.js';
import { initFog, drawFog } from './src/fog.js';
import { getCars, setRoadLists, buildRampPoints, initTraffic, mkCar, updateTraffic, drawTraffic } from './src/traffic.js';
import { SimManager, drawNPCs } from './src/npcs.js';
import { initMinimap, drawMinimap } from './src/minimap.js';
import {
  getActiveAssignments, getCompletedCount, resetAssignments,
  updateDispatch, acceptAssignment, completeAssignment,
} from './src/dispatch.js';
import { connect, disconnect, on, send, isConnected, getPeers, generatePeerId } from './src/networking.js';
import { startAmbient, setMasterVolume, sfxRadioBeep, sfxInteract, sfxGunshot, sfxTaser } from './src/sound.js';

// ── Canvas & Resize ────────────────────────────────────────────────
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
let W, H;

function resize() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

// ── Game mode ──────────────────────────────────────────────────────
export let gameMode = 'street';
export function setGameMode(mode) { gameMode = mode; }

// ── Init ───────────────────────────────────────────────────────────
genMap();

// Set map references for player module
setMapRef(map, dmap);

// Traffic
setRoadLists(roadColsList, roadRowsList);
buildRampPoints(entrances);
initTraffic();

// Fog
initFog();

// Minimap
initMinimap(map);

// NPCs
SimManager.init(entrances);
const simManager = SimManager;

// Input
const inputHandlers = Input.setupInput([], player.gear);

// UI
setupUI();
syncGearHotbar();
refreshHotbarDOM();

// Dispatch
resetAssignments();

// Sound
setMasterVolume(0.4);

// Networking — connect to signaling server for multiplayer/dispatch
const netBaseUrl = location.origin;
const netPeerId = generatePeerId();
connect(netBaseUrl, netPeerId, '');

// Weapon IDs for firearm detection
const firearms = ['glock', 'ar15', 'sniper', 'shotgun', 'smg'];

// Connection HUD helper
function updateConnectionHUD() {
  const dot = document.getElementById('connection-dot');
  if (dot) {
    dot.className = isConnected() ? 'connected' : 'disconnected';
    dot.title = isConnected() ? 'Dispatch network: Connected' : 'Dispatch network: Disconnected';
  }
}

// Handle incoming dispatch from peers
on('dispatch', (data) => {
  if (data.assignment) {
    toast(`DISPATCH: ${data.assignment.title} (from ${data.from})`);
    sfxRadioBeep();
  }
});

on('connected', () => {
  updateConnectionHUD();
});

on('disconnected', () => {
  updateConnectionHUD();
});

// Broadcast position periodically
let netBroadcastTimer = 0;

// Load saved game or start fresh
const saved = loadGameState();

// ── Interact handling ──────────────────────────────────────────────
function tryInteractStreet() {
  let best = null, bestD = 52;
  for (const e of entrances) {
    const d = Math.hypot(player.x - (e.c * TILE + TILE / 2), player.y - (e.r * TILE + TILE / 2));
    if (d < bestD) { bestD = d; best = e; }
  }
  if (best) {
    enterInterior(best, player, cam, toast);
    gameMode = 'interior';
  }
}

function tryInteractInterior() {
  const px = interior.playerX, py = interior.playerY;
  let best = null, bestD = 1e9;
  for (const h of interior.hotspots || []) {
    const d = Math.hypot(px - h.x, py - h.y);
    if (d < h.r && d < bestD) { bestD = d; best = h; }
  }
  if (!best) return;
  sfxInteract();

  if (best.kind === 'exit') {
    exitInterior(player);
    cam.boundW = MW;
    cam.boundH = MH;
    gameMode = 'street';
    return;
  }
  if (best.kind === 'locker' || best.kind === 'gear') { openLockerMenu(); return; }
  if (best.kind === 'elevator') {
    const gy = interior.garageY0;
    if (best.floor === 'garage' && gy >= 0) {
      interior.playerY = (gy + 2) * TILE + TILE / 2;
      toast('B1 · Subterranean Garage');
    } else {
      interior.playerY = 3 * TILE + TILE / 2;
      toast('G · Lobby');
    }
    return;
  }
  if (best.kind === 'counter') {
    const ent = entrances.find(e => e.interiorId === interior.id);
    const role = ent?.storeRole || interior.theme || 'generic';
    openShopMenu(role, interior.label);
    return;
  }
  toast(best.msg || best.kind);
}

// Key handlers
Input.onInput('keydown', (e) => {
  if (!e.repeat && (e.key === 'e' || e.key === 'E')) {
    if (isModalOpen()) return;
    if (gameMode === 'street') tryInteractStreet();
    else tryInteractInterior();
  }
  if (!e.repeat && e.key === ' ') {
    e.preventDefault();
    if (!isModalOpen()) {
      useHandItem(gameMode);
      // Trigger NPC panic on weapon fire in street mode
      const id = player.handItem;
      if (id && player.gear[id] && gameMode === 'street') {
        if (firearms.includes(id)) {
          sfxGunshot();
          const panicked = simManager.panicNearby(player.x, player.y, 200, map);
          if (panicked > 0) {
            toast(`Civilians fleeing — ${panicked} nearby`);
          }
        } else if (id === 'taser') {
          sfxTaser();
          const panicked = simManager.panicNearby(player.x, player.y, 180, map);
          if (panicked > 0) {
            toast(`Civilians alarmed — ${panicked} nearby`);
          }
        }
      }
    }
  }
  if (e.key === 'n' || e.key === 'N') {
    if (!e.repeat && !isModalOpen()) openNotebook();
  }
  if (e.key === 'r' || e.key === 'R') {
    if (!e.repeat && !isModalOpen()) openRadio();
  }
});

Input.onInput('hotbar', (idx) => {
  const item = Input.hotbarItems[idx];
  if (item) {
    player.handItem = item.gearId;
    toast(`${item.label} · equipped`);
  }
  refreshHotbarDOM();
});

// ── Game Loop ──────────────────────────────────────────────────────
let last = 0;

function loop(ts) {
  const dt = Math.min((ts - last) / 1000, 0.05);
  last = ts;
  const t = ts / 1000;

  // Update game clock (earn money)
  clock.update(dt, (acc) => { addMoney(acc); });

  tickToast(dt);
  updateWeaponFx(dt);
  simManager.update(dt, clock.gameHour, map);

  // Dispatch updates (only in street mode)
  if (gameMode === 'street') {
    updateDispatch(dt, entrances, toast, (a) => {
      updateRadioUI(getActiveAssignments(), acceptAssignment, completeAssignment);
      sfxRadioBeep();
    });
  }

  // Network broadcast (every 2s)
  netBroadcastTimer -= dt;
  if (netBroadcastTimer <= 0 && isConnected()) {
    netBroadcastTimer = 2;
    send({
      type: 'position',
      x: player.x, y: player.y,
      dir: player.dir,
      district: player.districtIdx,
    });
    // Share active assignments with peers
    const assignments = getActiveAssignments();
    if (assignments.length > 0) {
      for (const a of assignments) {
        if (a.accepted) {
          send({
            type: 'dispatch',
            assignment: {
              id: a.id,
              title: a.title,
              targetLabel: a.targetLabel,
              remaining: a.remaining,
            },
          });
        }
      }
    }
  }

  // Player update
  if (gameMode === 'interior') {
    if (!isModalOpen()) updateInterior(dt, player);
    cam.boundW = interior.wTiles * TILE;
    cam.boundH = interior.hTiles * TILE;
    cam.follow(interior.playerX, interior.playerY, W, H);
    cam.update(dt, W, H);
  } else {
    cam.boundW = MW;
    cam.boundH = MH;
    if (!isModalOpen()) player.update(dt, Input.keys);
    cam.follow(player.x, player.y, W, H);
    cam.update(dt, W, H);
    updateTraffic(dt);
  }

  // Render
  ctx.clearRect(0, 0, W, H);
  ctx.save();

  const shake = getScreenShake();
  if (shake > 0) {
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  }

  if (gameMode === 'interior') {
    drawInteriorScene(ctx, cam, interior, t, W, H, drawCopFigure);
  } else {
    drawWorld(ctx, t, W, H);
    drawPlayer(ctx, cam, t);
    drawTraffic(ctx, t, cam, clock.nightAlpha);
    drawFog(ctx, cam, player, map, W, H);
    drawMinimap(ctx, player, W, H);
  }

  ctx.restore();

  drawScanlines(ctx, clock.nightAlpha, W, H);
  drawVignette(ctx, clock.nightAlpha, W, H);
  drawWeaponFxLayer(ctx, cam);

  // Draw world-specific overlay
  if (gameMode !== 'interior') {
    drawWorldOverlay(ctx, t, W, H);
  }

  updateHUD();
  requestAnimationFrame(loop);
}

function drawWorld(ctx, t, W, H) {
  // If map is dirty or not built, rebuild
  if (!mapCanvas) buildMapCache();

  const sx = Math.max(0, Math.floor(cam.x));
  const sy = Math.max(0, Math.floor(cam.y));
  const sw = Math.min(MW - sx, W);
  const sh = Math.min(MH - sy, H);
  ctx.drawImage(mapCanvas, sx, sy, sw, sh, 0, 0, sw, sh);

  drawBuildings(ctx, cam, player.tileR, bdata, W, H);
  drawDynamicTiles(ctx, cam, t, bdata, W, H);

  // Defer to module functions
}

function drawWorldOverlay(ctx, t, W, H) {
  drawNPCs(ctx, simManager, cam, t, gameMode);
  drawGasForecourts(ctx, cam, t, entrances, W, H);
  drawEntranceFacades(ctx, cam, entrances);

  const na = clock.nightAlpha;
  if (na > 0) {
    const ng = ctx.createLinearGradient(0, 0, 0, H);
    ng.addColorStop(0, `rgba(22,36,72,${na * 0.85})`);
    ng.addColorStop(0.5, `rgba(4,8,28,${na})`);
    ng.addColorStop(1, `rgba(8,4,18,${na * 0.95})`);
    ctx.fillStyle = ng;
    ctx.fillRect(0, 0, W, H);
    drawStreetLamps(ctx, cam, na, t, W, H);
  }
}

// ── Start ──────────────────────────────────────────────────────────
toast(saved ? 'Shift continues. Welcome back, Officer.' : 'Shift begins. Walk your beat.');
startAmbient();
requestAnimationFrame(loop);
