// ── Networking ──────────────────────────────────────────────────────
// WebSocket signaling client for multiplayer/dispatch

let ws = null;
let connected = false;
let peerId = null;
let roomCode = null;
let peers = [];
let listeners = {};

export function getPeerId() { return peerId; }
export function getPeers() { return peers; }
export function isConnected() { return connected; }

export function generatePeerId() {
  return 'peer_' + Math.random().toString(36).slice(2, 10);
}

export function connect(baseUrl, pid, room) {
  if (ws && ws.readyState === WebSocket.OPEN) return;

  peerId = pid;
  roomCode = room || '';

  // Build WS URL from base URL (http -> ws, https -> wss)
  const wsBase = baseUrl.replace(/^http/, 'ws');
  let url = `${wsBase}/api/signal/ws?peerId=${encodeURIComponent(peerId)}`;
  if (roomCode) {
    url += `&room=${encodeURIComponent(roomCode)}`;
  }

  try {
    ws = new WebSocket(url);

    ws.onopen = () => {
      connected = true;
      notify('connected', {});
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        switch (data.type) {
          case 'peers':
            peers = data.peers || [];
            notify('peers', peers);
            break;
          case 'peer-joined':
            if (!peers.includes(data.peerId)) peers.push(data.peerId);
            notify('peer-joined', data.peerId);
            break;
          case 'peer-left':
            peers = peers.filter(p => p !== data.peerId);
            notify('peer-left', data.peerId);
            break;
          case 'signal':
            notify('signal', { from: data.from, signal: data.signal });
            break;
          case 'dispatch':
            notify('dispatch', data);
            break;
          default:
            notify('message', data);
        }
      } catch (e) {
        // ignore malformed
      }
    };

    ws.onclose = () => {
      connected = false;
      peers = [];
      notify('disconnected', {});
      // Auto-reconnect after 3 seconds
      setTimeout(() => {
        if (!connected && peerId) {
          connect(baseUrl, peerId, roomCode);
        }
      }, 3000);
    };

    ws.onerror = () => {
      // onclose will fire after this
    };
  } catch (e) {
    connected = false;
  }
}

export function disconnect() {
  if (ws) {
    try { ws.close(); } catch (e) { /* ignore */ }
    ws = null;
  }
  connected = false;
  peers = [];
}

export function sendSignal(targetPeerId, signalData) {
  if (!connected || !ws) return false;
  try {
    ws.send(JSON.stringify({
      type: 'signal',
      to: targetPeerId,
      signal: signalData,
    }));
    return true;
  } catch (e) {
    return false;
  }
}

export function send(message) {
  if (!connected || !ws) return false;
  try {
    ws.send(typeof message === 'string' ? message : JSON.stringify(message));
    return true;
  } catch (e) {
    return false;
  }
}

export function on(event, callback) {
  if (!listeners[event]) listeners[event] = [];
  listeners[event].push(callback);
}

export function off(event, callback) {
  if (!listeners[event]) return;
  listeners[event] = listeners[event].filter(cb => cb !== callback);
}

function notify(event, data) {
  if (listeners[event]) {
    listeners[event].forEach(cb => cb(data));
  }
}
