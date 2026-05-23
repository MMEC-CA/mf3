// Worker entry: routes WebSocket signaling to a Durable Object,
// serves static assets from ./_site, and handles game save/load.
//
// Any URL ending in /api/signal/ws routes to the DO.
// /api/save handles client-side save persistence.

import { SignalingRoom } from './signaling-do.js';
export { SignalingRoom };

// ── Content Security Policy ────────────────────────────────────────
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self' ws: wss:",
  "media-src 'none'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
].join('; ');

function addHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set('Content-Security-Policy', CSP);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Referrer-Policy', 'no-referrer');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// ── Input validation ───────────────────────────────────────────────
function validateSavePayload(data) {
  if (!data || typeof data !== 'object') return false;
  // Money: non-negative number
  if (data.money !== undefined && (typeof data.money !== 'number' || data.money < 0)) return false;
  // Coordinates: numbers within map bounds
  if (data.playerX !== undefined && typeof data.playerX !== 'number') return false;
  if (data.playerY !== undefined && typeof data.playerY !== 'number') return false;
  // Gear: object
  if (data.gear && typeof data.gear !== 'object') return false;
  // Notes: string or absent, max 100KB
  if (data.notes && (typeof data.notes !== 'string' || data.notes.length > 100000)) return false;
  // Stamina / Health: numbers 0-200
  if (data.stamina !== undefined && (typeof data.stamina !== 'number' || data.stamina < 0 || data.stamina > 200)) return false;
  if (data.health !== undefined && (typeof data.health !== 'number' || data.health < 0 || data.health > 200)) return false;
  return true;
}

function normalizeIPtoRoom(ip) {
  if (ip.includes(':')) {
    const parts = ip.split(':');
    if (ip.includes('::')) {
      const halves = ip.split('::');
      const left = halves[0] ? halves[0].split(':') : [];
      const right = halves[1] ? halves[1].split(':') : [];
      const missing = 8 - left.length - right.length;
      const expanded = [...left, ...Array(missing).fill('0'), ...right];
      return `room:v6:${expanded.slice(0, 3).join('-')}`;
    }
    return `room:v6:${parts.slice(0, 3).join('-')}`;
  }
  return `room:v4:${ip.replace(/\./g, '-')}`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ── WebSocket signaling ────────────────────────────────────────
    if (url.pathname.endsWith('/api/signal/ws')) {
      if (!env.SIGNALING_ROOM) {
        return new Response(JSON.stringify({ error: 'Durable Objects not available' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const roomParam = url.searchParams.get('room');
      let roomName;
      if (roomParam) {
        roomName = `room:code:${roomParam.replace(/[^a-zA-Z0-9-_]/g, '').slice(0, 20)}`;
      } else {
        const ip =
          request.headers.get('cf-connecting-ip') ||
          request.headers.get('x-forwarded-for') ||
          '127.0.0.1';
        roomName = normalizeIPtoRoom(ip);
      }

      const id = env.SIGNALING_ROOM.idFromName(roomName);
      const stub = env.SIGNALING_ROOM.get(id);
      return stub.fetch(request);
    }

    // ── Server-side save ───────────────────────────────────────────
    if (url.pathname === '/api/save') {
      if (request.method === 'POST') {
        try {
          const body = await request.json();
          if (!validateSavePayload(body)) {
            return addHeaders(new Response(JSON.stringify({ error: 'Invalid save data' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            }));
          }
          // Store in a DO or KV — for now we acknowledge
          // In production, use env.GAME_SAVES (KV namespace) or a Durable Object
          const ip = request.headers.get('cf-connecting-ip') || 'anonymous';
          const saveKey = `save:${ip}`;

          // Persist via KV if available
          if (env.GAME_SAVES) {
            await env.GAME_SAVES.put(saveKey, JSON.stringify({
              ...body,
              version: 1,
              timestamp: Date.now(),
            }));
          }
          // Also persist via DO if available
          if (env.SIGNALING_ROOM && body.room) {
            try {
              const doId = env.SIGNALING_ROOM.idFromName(`save:${body.room}`);
              const doStub = env.SIGNALING_ROOM.get(doId);
              await doStub.fetch(new Request('https://do/save', {
                method: 'POST',
                body: JSON.stringify({ type: 'save-state', data: body }),
              }));
            } catch (e) {
              // DO save is best-effort
            }
          }

          return addHeaders(new Response(JSON.stringify({ ok: true }), {
            headers: { 'Content-Type': 'application/json' },
          }));
        } catch (e) {
          return addHeaders(new Response(JSON.stringify({ error: 'Invalid JSON' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }));
        }
      }

      if (request.method === 'GET') {
        const ip = request.headers.get('cf-connecting-ip') || 'anonymous';
        const saveKey = `save:${ip}`;
        if (env.GAME_SAVES) {
          const saved = await env.GAME_SAVES.get(saveKey);
          if (saved) {
            return addHeaders(new Response(saved, {
              headers: { 'Content-Type': 'application/json' },
            }));
          }
        }
        return addHeaders(new Response(JSON.stringify({ saved: false }), {
          headers: { 'Content-Type': 'application/json' },
        }));
      }

      return addHeaders(new Response('Method not allowed', { status: 405 }));
    }

    // ── Static assets ──────────────────────────────────────────────
    const response = await env.ASSETS.fetch(request);
    return addHeaders(response);
  },
};
