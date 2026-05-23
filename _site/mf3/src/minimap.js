// ── Minimap ─────────────────────────────────────────────────────────
import { TILE, COLS, ROWS, MW, MH, DISTRICTS } from './constants.js';

let minimapCanvas, minimapCtx;
let minimapDirty = true;

export function initMinimap(map) {
  minimapCanvas = document.createElement('canvas');
  minimapCanvas.width = COLS * 2;
  minimapCanvas.height = ROWS * 2;
  minimapCtx = minimapCanvas.getContext('2d');

  // Pre-render a tiny minimap
  const mc = minimapCtx;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const t = map[r * COLS + c];
      const idx = Math.floor(r / 20) + Math.floor(c / 20) * 2;
      const dc = DISTRICTS[idx]?.color || [60, 60, 80];

      if (t <= 3) {
        mc.fillStyle = '#2a2a2a';
      } else if (t === 4) {
        mc.fillStyle = '#1a3a1a';
      } else if (t === 5) {
        mc.fillStyle = `rgb(${20 + dc[0] * 0.05 | 0},${22 + dc[1] * 0.05 | 0},${30 + dc[2] * 0.05 | 0})`;
      } else {
        mc.fillStyle = `rgb(${dc[0] * 0.5 | 0},${dc[1] * 0.5 | 0},${dc[2] * 0.5 | 0})`;
      }
      mc.fillRect(c * 2, r * 2, 2, 2);
    }
  }
}

export function drawMinimap(ctx, player, W, H) {
  const mmX = W - COLS * 2 - 12;
  const mmY = H - ROWS * 2 - 12;
  const mmW = COLS * 2;
  const mmH = ROWS * 2;

  // Background
  ctx.fillStyle = 'rgba(8,12,18,0.85)';
  ctx.fillRect(mmX - 2, mmY - 2, mmW + 4, mmH + 4);
  ctx.strokeStyle = 'rgba(232,213,160,0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(mmX - 2, mmY - 2, mmW + 4, mmH + 4);

  // Map
  ctx.drawImage(minimapCanvas, mmX, mmY);

  // Player dot
  const px = mmX + (player.x / MW) * mmW;
  const py = mmY + (player.y / MH) * mmH;
  ctx.fillStyle = '#e8d5a0';
  ctx.beginPath();
  ctx.arc(px, py, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Direction indicator
  const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const [ddx, ddy] = dirs[player.dir];
  ctx.strokeStyle = '#e8d5a0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(px + ddx * 4, py + ddy * 4);
  ctx.stroke();

  // Label
  ctx.fillStyle = 'rgba(232,213,160,0.5)';
  ctx.font = '8px "Share Tech Mono", monospace';
  ctx.textAlign = 'right';
  ctx.fillText('MAP', mmX + mmW - 2, mmY - 4);
  ctx.textAlign = 'left';
}
