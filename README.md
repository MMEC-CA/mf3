# mf3
Owned by mmec-ca.

Cloudflare Worker + Durable Object site served at `erd.mmec.ca/mf3/`.
Built-in support for multiplayer games: static assets, WebSocket signaling,
and in-memory state via a Durable Object.

## Structure

- `_site/mf3/index.html` — static game client (inline HTML/JS/Canvas).
- `src/worker.js` — Worker entry. Routes `*/api/signal/ws` to the DO,
  serves everything else from `_site/` via `env.ASSETS`.
- `src/signaling-do.js` — `SignalingRoom` Durable Object. In-memory WebSocket
  hub with peer-join/leave notifications and signal relay (WebRTC-friendly).
- `wrangler.jsonc` — Worker config with route, DO binding, and SQLite migration.

## Deploy

Pushes to `main` auto-deploy via GitHub Actions.
Required repo secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.

Manual deploy from a local checkout:
```
npx wrangler@4 deploy
```

## Signaling endpoint

`wss://erd.mmec.ca/mf3/api/signal/ws?peerId=<id>[&room=<code>]`

- No `room` param → peers are auto-grouped by WAN IP (all devices on the same
  home router/LAN join the same room).
- `room=<code>` → explicit room code (for QR-scan joining across networks).

## Adding persistent state

The template DO uses in-memory state only (lost on hibernation). For persistent
state, use `ctx.storage.sql` (SQLite-backed — declared via `new_sqlite_classes`
in the `migrations` block of `wrangler.jsonc`).
