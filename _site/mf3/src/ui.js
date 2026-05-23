// ── UI / HUD / Modals ──────────────────────────────────────────────
import { clock } from './clock.js';
import { player } from './player.js';
import { GEAR_CATALOG, UNIFORM_CATALOG, STORE_CATALOGS } from './stores.js';
import { DISTRICTS } from './constants.js';
import { hotbarItems, setHotbarSelected } from './input.js';
import { weaponFx, addWeaponFx } from './weapons.js';
import { saveGame, loadGame, deleteSave } from './save.js';
import { sfxRadioBeep, sfxNotification, sfxPurchase } from './sound.js';

export let money = 0;
export let player_inventory = new Set(['class_a']);
export let equipped_uniform = 'class_a';

let toastTimer = 0;
let lastZoneIdx = -1;
let _lockerCats = 'sidearm,rifle,shotgun';
let currentShopRole = null;
let currentShopLabel = '';

// ── Modal helpers ──────────────────────────────────────────────────
function anyModalOpen() {
  return !!(
    document.querySelector('#locker-modal.show') ||
    document.querySelector('#shop-modal.show') ||
    document.querySelector('#notebook-modal.show') ||
    document.querySelector('#radio-modal.show')
  );
}

function refreshModalRoot() {
  document.getElementById('modal-root').classList.toggle('active', anyModalOpen());
}

function openModal(id) { document.getElementById(id).classList.add('show'); refreshModalRoot(); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); refreshModalRoot(); }

export function isModalOpen() { return anyModalOpen(); }

// ── Toast notifications ────────────────────────────────────────────
export function toast(msg) {
  const el = document.getElementById('notify');
  if (!el) return;
  el.textContent = msg;
  el.style.opacity = '1';
  toastTimer = 2.5;
  sfxNotification();
}

export function tickToast(dt) {
  if (toastTimer > 0) {
    toastTimer -= dt;
    if (toastTimer <= 0) {
      toastTimer = 0;
      const el = document.getElementById('notify');
      if (el) el.style.opacity = '0';
    }
  }
}

// ── Money ──────────────────────────────────────────────────────────
export function addMoney(amount) {
  money += amount;
  updateMoneyHUD();
}

export function getMoney() { return money; }

export function setMoney(v) { money = v; updateMoneyHUD(); }

export function updateMoneyHUD() {
  const el = document.getElementById('money-display');
  if (el) el.textContent = money.toFixed(2);
  const hud = document.getElementById('money-hud');
  if (hud) {
    hud.classList.remove('pulse');
    void hud.offsetWidth;
    hud.classList.add('pulse');
    setTimeout(() => hud.classList.remove('pulse'), 400);
  }
  const lk = document.getElementById('lk-money');
  if (lk) lk.textContent = money.toFixed(2);
  const sm = document.getElementById('shop-money');
  if (sm) sm.textContent = money.toFixed(2);
}

// ── Hotbar ─────────────────────────────────────────────────────────
export function refreshHotbarDOM() {
  const root = document.getElementById('hotbar');
  if (!root) return;
  root.innerHTML = '';
  const selected = 0; // TODO: wire up with input module

  for (let i = 0; i < 8; i++) {
    const s = document.createElement('div');
    s.className = 'hotbar-slot' + (hotbarItems[i] ? ' has-item' : '') + (i === selected ? ' selected' : '');
    s.innerHTML = `<kbd>${i + 1}</kbd>` + (hotbarItems[i] ? hotbarItems[i].label.slice(0, 3) : '—');
    root.appendChild(s);
  }
}

export function syncGearHotbar() {
  const ids = ['radio', 'glock', 'taser', 'cuffs', 'notebook', 'baton', 'ar15', 'shotgun'];
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const item = GEAR_CATALOG.find(g => g.id === id);
    hotbarItems[i] = (item && player.gear[id]) ? { label: item.short, gearId: id } : null;
  }
}

// ── HUD update ─────────────────────────────────────────────────────
export function updateHUD() {
  const clockEl = document.getElementById('clock');
  if (clockEl) clockEl.textContent = clock.display;

  const di = player.districtIdx;
  if (di !== lastZoneIdx && di >= 0) {
    lastZoneIdx = di;
    const dist = DISTRICTS[di];
    document.getElementById('zone-name').textContent = dist.name.toUpperCase();
    document.getElementById('zone-trust').textContent = `Trust: ${dist.trust}%`;
    toast(`Entering ${dist.name}`);
  }
}

// ── Notebook ───────────────────────────────────────────────────────
export function openNotebook() {
  try {
    document.getElementById('notebook-text').value = localStorage.getItem('bc_notes') || '';
  } catch (_) {}
  openModal('notebook-modal');
  setTimeout(() => document.getElementById('notebook-text').focus(), 60);
}

// ── Radio / Dispatch ───────────────────────────────────────────────
export function openRadio() {
  openModal('radio-modal');
}

export function updateRadioUI(assignments) {
  const el = document.getElementById('radio-dispatch');
  const assignmentsEl = document.querySelector('.radio-assignments');
  if (!el || !assignmentsEl) return;

  if (assignments && assignments.length > 0) {
    el.innerHTML = assignments.map(a =>
      `${a.accepted ? '▶' : '○'} ${a.title} — ${a.targetLabel} ${a.accepted ? `(${Math.ceil(a.remaining)}s)` : ''}`
    ).join('<br>');
    assignmentsEl.innerHTML = assignments.filter(a => a.accepted).length > 0
      ? 'Respond to active assignments.'
      : 'Press E on an assignment to accept it.';
  } else {
    el.textContent = 'PRECINCT 9 — Channel clear. Stand by for assignment routing.';
    assignmentsEl.textContent = 'No active calls at this time.';
  }
}

// ── Locker ─────────────────────────────────────────────────────────
export function openLockerMenu() {
  renderLockerItems(_lockerCats);
  openModal('locker-modal');
}

function switchLockerTab(cats) {
  _lockerCats = cats;
  document.querySelectorAll('.lk-tab').forEach((b, i) => {
    const tabCats = ['sidearm,rifle,shotgun', 'less_lethal,restraint,defense', 'comms,misc', 'uniform'];
    b.classList.toggle('active', tabCats[i] === cats);
  });
  renderLockerItems(cats);
}

function renderLockerItems(cats) {
  const isUniforms = cats === 'uniform';
  const root = document.getElementById('locker-items');
  if (!root) return;
  root.innerHTML = '';

  const catalog = isUniforms ? UNIFORM_CATALOG : GEAR_CATALOG.filter(g => cats.includes(g.cat));
  catalog.forEach(item => {
    const isOwned = isUniforms ? player_inventory.has(item.id) : player.gear[item.id];
    const isEquipped = isUniforms ? equipped_uniform === item.id : player.handItem === item.id;
    const isLocked = item.level > 0;
    const div = document.createElement('div');
    div.className = 'lk-item' + (isEquipped ? ' equipped-item' : isOwned ? ' owned' : '') + (isLocked ? ' locked-item' : '');

    let badge = isLocked ? `<span class="lk-item-badge badge-locked">LVL ${item.level}</span>` :
      isEquipped ? '<span class="lk-item-badge badge-owned">EQUIPPED</span>' :
      isOwned ? '<span class="lk-item-badge badge-owned">OWNED</span>' :
      '<span class="lk-item-badge badge-free">FREE</span>';

    div.innerHTML = `${badge}<div class="lk-item-name">${item.label}</div><div class="lk-item-desc">${item.desc}</div>`;
    if (!isLocked) {
      div.onclick = () => {
        if (isUniforms) {
          player_inventory.add(item.id);
          equipped_uniform = item.id;
          player.uniformId = item.id;
          toast(`Uniform: ${item.label}`);
          renderLockerItems(cats);
        } else {
          player.gear[item.id] = true;
          player.handItem = item.id;
          syncGearHotbar(); refreshHotbarDOM();
          toast(`${item.label} · in hand`);
          closeModal('locker-modal');
        }
      };
    }
    root.appendChild(div);
  });
  updateMoneyHUD();
}

// ── Shop ───────────────────────────────────────────────────────────
export function openShopMenu(role, label) {
  currentShopRole = role;
  currentShopLabel = label;
  document.getElementById('shop-title').textContent = label + ' · Shop';
  const catalog = STORE_CATALOGS[role] || STORE_CATALOGS.generic;
  const root = document.getElementById('shop-items');
  if (!root) return;
  root.innerHTML = '';

  if (!catalog.length) {
    root.innerHTML = '<div style="grid-column:1/-1;color:rgba(255,255,255,0.35);font-size:13px;padding:8px 0;">Nothing for sale right now.</div>';
  } else {
    catalog.forEach(item => {
      const canAfford = money >= item.price;
      const div = document.createElement('div');
      div.className = 'lk-item' + (canAfford ? '' : ' locked-item');
      const badge = item.price === 0
        ? '<span class="lk-item-badge badge-free">FREE</span>'
        : `<span class="lk-item-badge badge-price">$${item.price}</span>`;
      div.innerHTML = `${badge}<div class="lk-item-name">${item.label}</div><div class="lk-item-desc">${item.desc}</div>`;
      if (canAfford) {
        div.onclick = () => {
          if (item.price > money) { toast('Not enough money.'); return; }
          money -= item.price;
          toast(`Bought: ${item.label}${item.price > 0 ? ' (-$' + item.price.toFixed(0) + ')' : ''}`);
          sfxPurchase();
          updateMoneyHUD();
          openShopMenu(role, label);
        };
      }
      root.appendChild(div);
    });
  }
  updateMoneyHUD();
  openModal('shop-modal');
}

// ── Use hand item ──────────────────────────────────────────────────
export function useHandItem() {
  const id = player.handItem;
  if (!id || !player.gear[id]) { toast('Nothing in hand — visit the lockers.'); return; }
  const item = GEAR_CATALOG.find(g => g.id === id);
  if (!item) return;

  if (id === 'notebook') { openNotebook(); return; }
  if (id === 'radio') { openRadio(); return; }
  if (['sidearm', 'rifle', 'shotgun'].includes(item.cat)) {
    addWeaponFx('firearm', 'street', player, null);
    toast(`${item.label} discharged.`);
    return;
  }
  if (id === 'taser') {
    addWeaponFx('taser', 'street', player, null);
    toast('Taser cycle · contacts live.');
    return;
  }
  if (id === 'cuffs') toast('Cuffs ready — approach a suspect.');
  if (id === 'baton') toast('Baton drawn.');
}

// ── Setup event handlers ───────────────────────────────────────────
export function setupUI() {
  // Close buttons
  document.getElementById('locker-close').addEventListener('click', () => closeModal('locker-modal'));
  document.getElementById('shop-close').addEventListener('click', () => closeModal('shop-modal'));
  document.getElementById('notebook-close').addEventListener('click', () => {
    try { localStorage.setItem('bc_notes', document.getElementById('notebook-text').value); } catch (_) {}
    closeModal('notebook-modal');
  });
  document.getElementById('radio-close').addEventListener('click', () => closeModal('radio-modal'));

  // Locker tabs
  document.querySelectorAll('.lk-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const catMap = {
        'Weapons': 'sidearm,rifle,shotgun',
        'Less-Lethal': 'less_lethal,restraint,defense',
        'Gear': 'comms,misc',
        'Uniforms': 'uniform',
      };
      switchLockerTab(catMap[btn.textContent.trim()] || 'sidearm,rifle,shotgun');
    });
  });

  // Load notebook on start
  try {
    document.getElementById('notebook-text').value = localStorage.getItem('bc_notes') || '';
  } catch (_) {}

  refreshHotbarDOM();
}

// ── Save/Load UI ───────────────────────────────────────────────────
export function saveGameState() {
  return saveGame({
    money,
    playerX: player.x,
    playerY: player.y,
    gear: player.gear,
    handItem: player.handItem,
    uniformId: player.uniformId,
    stamina: player.stamina,
    health: player.health,
    trust: 0,
    assignmentsCompleted: 0,
  });
}

export function loadGameState() {
  const data = loadGame();
  if (!data) return false;
  if (data.money !== undefined) money = data.money;
  if (data.playerX !== undefined) { player.x = data.playerX; player.y = data.playerY; }
  if (data.gear) player.gear = data.gear;
  if (data.handItem) player.handItem = data.handItem;
  if (data.uniformId) { player.uniformId = data.uniformId; equipped_uniform = data.uniformId; }
  if (data.stamina !== undefined) player.stamina = data.stamina;
  if (data.health !== undefined) player.health = data.health;
  if (data.notes) document.getElementById('notebook-text').value = data.notes;
  syncGearHotbar();
  refreshHotbarDOM();
  updateMoneyHUD();
  return true;
}
