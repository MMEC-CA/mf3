// ── Input Handling ────────────────────────────────────────────────

export const keys = {};
let hotbarSelected = 0;
export let hotbarItems = [null, null, null, null, null, null, null, null];

const listeners = [];

export function onInput(event, callback) {
  listeners.push({ event, callback });
}

export function getHotbarSelected() {
  return hotbarSelected;
}

export function setHotbarSelected(n) {
  hotbarSelected = n;
}

export function setupInput(gearCatalog, playerGear) {
  // hotbar sync
  const syncGearHotbar = () => {
    const ids = ['radio', 'glock', 'taser', 'cuffs', 'notebook', 'baton', 'ar15', 'shotgun'];
    hotbarItems = ids.map(id => {
      const item = gearCatalog.find(g => g.id === id);
      return (item && playerGear[id]) ? { label: item.short, gearId: id } : null;
    });
    while (hotbarItems.length < 8) hotbarItems.push(null);
  };

  window.addEventListener('keydown', e => {
    keys[e.key] = true;
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= 8) {
      hotbarSelected = n - 1;
      for (const l of listeners) {
        if (l.event === 'hotbar') l.callback(hotbarSelected);
      }
    }
    for (const l of listeners) {
      if (l.event === 'keydown') l.callback(e);
    }
  });

  window.addEventListener('keyup', e => {
    keys[e.key] = false;
    for (const l of listeners) {
      if (l.event === 'keyup') l.callback(e);
    }
  });

  // Touch controls
  setupTouchControls();

  return { syncGearHotbar };
}

function setupTouchControls() {
  // Virtual joystick for mobile
  let touchActive = false;
  let touchId = null;
  let startX = 0;
  let startY = 0;

  const joystick = document.createElement('div');
  joystick.id = 'virtual-joystick';
  joystick.style.cssText = `
    position: fixed; bottom: 20px; left: 20px; width: 120px; height: 120px;
    background: rgba(8,12,18,0.5); border: 1px solid rgba(255,255,255,0.1);
    border-radius: 50%; display: none; z-index: 50; touch-action: none;
  `;

  const thumb = document.createElement('div');
  thumb.style.cssText = `
    position: absolute; width: 44px; height: 44px; background: rgba(232,213,160,0.3);
    border: 1px solid rgba(232,213,160,0.5); border-radius: 50%;
    top: 50%; left: 50%; transform: translate(-50%, -50%);
    pointer-events: none;
  `;
  joystick.appendChild(thumb);
  document.body.appendChild(joystick);

  // Show joystick on touch devices
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    joystick.style.display = 'block';
    document.getElementById('controls').style.display = 'none';
  }

  joystick.addEventListener('touchstart', e => {
    e.preventDefault();
    const t = e.touches[0];
    touchActive = true;
    touchId = t.identifier;
    const rect = joystick.getBoundingClientRect();
    startX = rect.left + rect.width / 2;
    startY = rect.top + rect.height / 2;
  });

  joystick.addEventListener('touchmove', e => {
    e.preventDefault();
    for (const t of e.touches) {
      if (t.identifier === touchId) {
        const dx = t.clientX - startX;
        const dy = t.clientY - startY;
        const dist = Math.min(40, Math.hypot(dx, dy));
        const angle = Math.atan2(dy, dx);
        thumb.style.transform = `translate(calc(-50% + ${Math.cos(angle) * dist}px), calc(-50% + ${Math.sin(angle) * dist}px))`;

        // Set virtual keys
        keys['w'] = dy < -15;
        keys['s'] = dy > 15;
        keys['a'] = dx < -15;
        keys['d'] = dx > 15;
      }
    }
  });

  joystick.addEventListener('touchend', () => {
    touchActive = false;
    touchId = null;
    thumb.style.transform = 'translate(-50%, -50%)';
    keys['w'] = false;
    keys['s'] = false;
    keys['a'] = false;
    keys['d'] = false;
  });

  // Interact button for mobile
  const interactBtn = document.createElement('button');
  interactBtn.textContent = 'E';
  interactBtn.style.cssText = `
    position: fixed; bottom: 40px; right: 30px; width: 60px; height: 60px;
    border-radius: 50%; background: rgba(232,213,160,0.2); border: 2px solid rgba(232,213,160,0.5);
    color: #e8d5a0; font-family: 'Share Tech Mono', monospace; font-size: 20px;
    z-index: 50; display: none;
  `;
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    interactBtn.style.display = 'block';
  }
  interactBtn.addEventListener('touchstart', e => {
    e.preventDefault();
    keys['e'] = true;
  });
  interactBtn.addEventListener('touchend', () => {
    keys['e'] = false;
  });
  document.body.appendChild(interactBtn);
}
