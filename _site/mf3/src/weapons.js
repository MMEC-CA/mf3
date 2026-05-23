// ── Weapons & FX ──────────────────────────────────────────────────
import { GEAR_CATALOG } from './stores.js';

let screenShake = 0;
export let weaponFx = [];

export function getScreenShake() {
  return screenShake;
}

export function addWeaponFx(kind, gameMode, player, interior) {
  const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const d = gameMode === 'interior' ? interior.dir : player.dir;
  const [dx, dy] = dirs[d];
  const px = gameMode === 'interior' ? interior.playerX : player.x;
  const py = gameMode === 'interior' ? interior.playerY : player.y;
  const ox = px + dx * 14, oy = py + dy * 14;

  if (kind === 'firearm') {
    weaponFx.push({ life: 0.2, kind: 'slug', x: ox, y: oy, dx, dy, len: 160, v: 1200 });
    weaponFx.push({ life: 0.1, kind: 'flash', x: ox, y: oy, dx, dy });
    weaponFx.push({ life: 0.4, kind: 'smoke', x: ox, y: oy, dx, dy, size: 6 });
    screenShake = 6;
  } else if (kind === 'taser') {
    weaponFx.push({ life: 0.3, kind: 'taser', x: ox, y: oy, dx, dy, len: 80 });
    screenShake = 2;
  }
}

export function updateWeaponFx(dt) {
  weaponFx.forEach(f => {
    f.life -= dt;
    if (f.kind === 'slug') { f.x += f.dx * f.v * dt; f.y += f.dy * f.v * dt; f.len *= 0.9; }
    if (f.kind === 'smoke') { f.size += dt * 20; f.x += f.dx * 20 * dt; f.y += f.dy * 20 * dt; }
  });
  weaponFx = weaponFx.filter(f => f.life > 0);
  if (screenShake > 0) screenShake = Math.max(0, screenShake - dt * 30);
}

export function drawWeaponFxLayer(ctx, cam) {
  weaponFx.forEach(f => {
    const sx = f.x - cam.x, sy = f.y - cam.y;
    const a = Math.min(1, f.life * 6);

    if (f.kind === 'flash') {
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 32);
      g.addColorStop(0, `rgba(255,255,200,${a * 0.9})`);
      g.addColorStop(1, 'rgba(255,180,50,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(sx, sy, 32, 0, Math.PI * 2);
      ctx.fill();
    } else if (f.kind === 'slug') {
      ctx.strokeStyle = `rgba(255,220,100,${a * 0.8})`;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sx - f.dx * f.len, sy - f.dy * f.len);
      ctx.lineTo(sx, sy);
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (f.kind === 'taser') {
      ctx.strokeStyle = `rgba(200,240,255,${a})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      let cx = sx, cy = sy;
      for (let i = 1; i <= 6; i++) {
        const seg = f.len / 6;
        cx += f.dx * seg + (Math.random() - 0.5) * 12;
        cy += f.dy * seg + (Math.random() - 0.5) * 12;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
      if (Math.random() > 0.5) {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(cx, cy, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (f.kind === 'smoke') {
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, f.size);
      g.addColorStop(0, `rgba(180,180,180,${a * 0.4})`);
      g.addColorStop(1, 'rgba(180,180,180,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(sx, sy, f.size, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

export function useHandItem(player, onToast, openNotebook, openRadio) {
  const id = player.handItem;
  if (!id || !player.gear[id]) {
    onToast('Nothing in hand — visit the lockers.');
    return;
  }
  const item = GEAR_CATALOG.find(g => g.id === id);
  if (!item) return;

  if (id === 'notebook') { openNotebook(); return; }
  if (id === 'radio') { openRadio(); return; }
  if (['sidearm', 'rifle', 'shotgun'].includes(item.cat)) {
    // Don't add FX here — called from main loop with game mode context
    onToast(`${item.label} discharged.`);
    return;
  }
  if (id === 'taser') {
    onToast('Taser cycle · contacts live.');
    return;
  }
  if (id === 'cuffs') onToast('Cuffs ready — approach a suspect.');
  if (id === 'baton') onToast('Baton drawn.');
}
