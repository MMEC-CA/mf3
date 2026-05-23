// ── Traffic System ─────────────────────────────────────────────────
import { TILE, COLS, ROWS, MW, MH, CAR_COLORS } from './constants.js';

const cars = [];
let roadColsList = [];
let roadRowsList = [];
const rampPoints = [];

export function setRoadLists(cols, rows) {
  roadColsList = cols;
  roadRowsList = rows;
}

export function getCars() {
  return cars;
}

export function buildRampPoints(entrances) {
  rampPoints.length = 0;
  entrances.forEach(ent => {
    if (!ent.pumpCols || ent.pumpRow == null) return;
    const lotWorldY = ent.pumpRow * TILE;
    const lotWorldX = ent.c * TILE + TILE / 2;
    roadRowsList.forEach(r => {
      const ry = r * TILE + TILE / 2;
      if (Math.abs(ry - lotWorldY) < TILE * 6) {
        rampPoints.push({
          wx: lotWorldX, wy: ry,
          targetX: lotWorldX, targetY: lotWorldY + TILE * 3,
          roadRow: r, side: 'right',
        });
      }
    });
  });
}

export function mkCar(dir, x, y) {
  return {
    x, y, dir,
    speed: 22 + Math.random() * 22,
    color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)],
    length: 22, width: 12,
    stopped: false, stopTimer: 0,
    ramping: false, rampPhase: 0, rampX: 0, rampY: 0,
    rampTargetX: 0, rampTargetY: 0, rampScale: 1,
  };
}

export function initTraffic() {
  cars.length = 0;
  roadRowsList.forEach(r => {
    for (let k = 0; k < 3; k++) cars.push(mkCar('right', Math.random() * MW, r * TILE + TILE * 0.28));
    for (let k = 0; k < 2; k++) cars.push(mkCar('left', Math.random() * MW, (r + 1) * TILE + TILE * 0.28));
  });
  roadColsList.forEach(c => {
    for (let k = 0; k < 3; k++) cars.push(mkCar('down', c * TILE + TILE * 0.28, Math.random() * MH));
    for (let k = 0; k < 2; k++) cars.push(mkCar('up', (c + 1) * TILE + TILE * 0.28, Math.random() * MH));
  });
}

export function updateTraffic(dt) {
  cars.forEach(car => {
    if (car.ramping) {
      const dx = car.rampTargetX - car.rampX;
      const dy = car.rampTargetY - car.rampY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const step = car.speed * dt;
      if (dist < step + 2) {
        car.ramping = false;
        car.rampScale = 1;
        if (car.dir === 'right') car.x = -car.length;
        else if (car.dir === 'left') car.x = MW;
        else if (car.dir === 'down') car.y = -car.length;
        else car.y = MH;
      } else {
        car.rampX += (dx / dist) * step;
        car.rampY += (dy / dist) * step;
        car.rampPhase = Math.min(1, car.rampPhase + dt * 0.5);
        car.rampScale = 1 - car.rampPhase * 0.55;
      }
      return;
    }
    if (car.stopped) {
      car.stopTimer -= dt;
      if (car.stopTimer <= 0) car.stopped = false;
      return;
    }
    if (Math.random() < 0.0003) {
      car.stopped = true;
      car.stopTimer = 1 + Math.random() * 2;
      return;
    }
    if ((car.dir === 'right' || car.dir === 'left') && rampPoints.length && Math.random() < 0.0008) {
      const rp = rampPoints.find(r =>
        Math.abs(r.wy - car.y) < TILE * 0.8 &&
        car.x > r.wx - TILE * 3 &&
        car.x < r.wx + TILE
      );
      if (rp) {
        car.ramping = true;
        car.rampPhase = 0;
        car.rampScale = 1;
        car.rampX = car.x;
        car.rampY = car.y;
        car.rampTargetX = rp.targetX;
        car.rampTargetY = rp.targetY;
        return;
      }
    }
    switch (car.dir) {
      case 'right': car.x += car.speed * dt; if (car.x > MW) car.x = -car.length; break;
      case 'left':  car.x -= car.speed * dt; if (car.x < -car.length) car.x = MW; break;
      case 'down':  car.y += car.speed * dt; if (car.y > MH) car.y = -car.length; break;
      case 'up':    car.y -= car.speed * dt; if (car.y < -car.length) car.y = MH; break;
    }
  });
}

export function drawCar(ctx, car, t, cam, nightAlpha) {
  const horiz = car.dir === 'right' || car.dir === 'left';
  let sx, sy, sc = 1;
  if (car.ramping) {
    sx = car.rampX - cam.x;
    sy = car.rampY - cam.y;
    sc = car.rampScale;
  } else {
    sx = car.x - cam.x;
    sy = car.y - cam.y;
  }
  const carL = car.length * sc, carW = car.width * sc;
  if (sx < -carL - 40 || sx > W + carL + 40 || sy < -carL - 40 || sy > H + carL + 40) return;

  ctx.save();
  ctx.translate(sx + (horiz ? carL / 2 : carW / 2), sy + (horiz ? carW / 2 : carL / 2));
  if (!horiz) ctx.rotate(Math.PI / 2);
  if (car.dir === 'left' || car.dir === 'up') ctx.scale(-1, 1);
  if (car.ramping) ctx.scale(sc, sc);

  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(-car.length / 2 + 2, -car.width / 2 + 2, car.length, car.width);
  ctx.fillStyle = car.color;
  ctx.fillRect(-car.length / 2, -car.width / 2, car.length, car.width);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(-car.length / 2 + 4, -car.width / 2 + 1, car.length - 8, car.width - 2);
  ctx.fillStyle = 'rgba(180,220,255,0.45)';
  ctx.fillRect(-car.length / 2 + 2, -car.width / 2 + 1, 5, car.width - 2);
  ctx.fillRect(car.length / 2 - 7, -car.width / 2 + 1, 5, car.width - 2);
  ctx.fillStyle = 'rgba(255,240,180,0.95)';
  ctx.fillRect(-car.length / 2, -car.width / 2, 3, 3);
  ctx.fillRect(-car.length / 2, car.width / 2 - 3, 3, 3);
  ctx.fillStyle = 'rgba(255,60,60,0.9)';
  ctx.fillRect(car.length / 2 - 3, -car.width / 2, 3, 3);
  ctx.fillRect(car.length / 2 - 3, car.width / 2 - 3, 3, 3);

  if (nightAlpha > 0.1 && !car.ramping) {
    ctx.save();
    const bg = ctx.createLinearGradient(-car.length / 2, 0, -car.length / 2 - 36, 0);
    bg.addColorStop(0, `rgba(255,245,200,${nightAlpha * 0.3})`);
    bg.addColorStop(1, 'rgba(255,245,200,0)');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(-car.length / 2, -car.width / 2 - 1);
    ctx.lineTo(-car.length / 2 - 36, -car.width / 2 - 10);
    ctx.lineTo(-car.length / 2 - 36, car.width / 2 + 10);
    ctx.lineTo(-car.length / 2, car.width / 2 + 1);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

export function drawTraffic(ctx, t, cam, nightAlpha) {
  cars.forEach(car => drawCar(ctx, car, t, cam, nightAlpha));
}
