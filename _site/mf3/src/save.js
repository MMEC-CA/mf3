// ── Save / Load System ────────────────────────────────────────────
const SAVE_KEY = 'beatcop_save';

export function saveGame(state) {
  try {
    const data = {
      version: 1,
      timestamp: Date.now(),
      money: state.money,
      playerX: state.playerX,
      playerY: state.playerY,
      gear: state.gear,
      handItem: state.handItem,
      uniformId: state.uniformId,
      stamina: state.stamina,
      health: state.health,
      trust: state.trust,
      assignmentsCompleted: state.assignmentsCompleted,
      notes: document.getElementById('notebook-text')?.value || '',
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.warn('Failed to save game:', e);
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.version !== 1) return null;
    return data;
  } catch (e) {
    console.warn('Failed to load game:', e);
    return null;
  }
}

export function deleteSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (e) {
    // ignore
  }
}

// Remote save via Worker API (for cross-device sync)
export async function remoteSave(baseUrl, state) {
  try {
    const resp = await fetch(`${baseUrl}/api/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    });
    return resp.ok;
  } catch (e) {
    return false;
  }
}

export async function remoteLoad(baseUrl) {
  try {
    const resp = await fetch(`${baseUrl}/api/save`);
    if (!resp.ok) return null;
    return await resp.json();
  } catch (e) {
    return null;
  }
}
