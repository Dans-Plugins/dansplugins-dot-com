#!/usr/bin/env node
// Captures a chat clip's source: real players (mineflayer bots) run real
// commands on a LOCAL test server, and every chat and action-bar line the
// server sends back is saved, with its colour codes and timing, to
// captures/<id>.json. The panel (panel/chat-panel.html) only draws that file.
// See scripts/previews/README.md.
//
//   node scripts/previews/capture.js <id>
//
// Environment (defaults suit the README's local server):
//   MC_HOST=127.0.0.1 MC_PORT=25567 MC_VERSION=1.21.1
//   RCON_PORT=25577 RCON_PASSWORD=...   (required: setup only, e.g. moving a bot)
//
// A world clip (kind 'world') also films the scene in 3D: its capture starts a
// spectator camera player (h.camera, world/recorder.js), and what that player
// sees is saved to $PREVIEW_WORK/scenes/<id>.json for record.js to render.
// That file is large (the world's chunks) and is not kept in the repo; the
// chat capture beside it is.
//
// Never point this at a real server: it joins with offline-mode bots and
// creates factions, currencies and claims.
'use strict';

// NBT strings (chat, since 1.20.3) are Java's modified UTF-8: decode them so
// (an emoji would otherwise be captured as U+FFFD; see mutf8.js).
require('./mutf8').install();

const fs = require('fs');
const net = require('net');
const path = require('path');
const mineflayer = require('mineflayer');
const CLIPS = require('./clips');

const HOST = process.env.MC_HOST || '127.0.0.1';
const PORT = Number(process.env.MC_PORT || 25567);
const VERSION = process.env.MC_VERSION || '1.21.1';
const RCON_PORT = Number(process.env.RCON_PORT || 25577);
const RCON_PASSWORD = process.env.RCON_PASSWORD;
const OUT = path.join(__dirname, 'captures');
const WORK = process.env.PREVIEW_WORK || path.join(require('os').tmpdir(), 'preview-work');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (!['127.0.0.1', 'localhost', '::1'].includes(HOST)) {
  console.error(`refusing to capture against ${HOST}: local test servers only`);
  process.exit(2);
}

// A minimal RCON client, for setup commands (op-free placement of a bot).
function rcon(commands) {
  if (!RCON_PASSWORD) throw new Error('set RCON_PASSWORD (the local server\'s rcon.password)');
  return new Promise((resolve, reject) => {
    const sock = net.connect(RCON_PORT, HOST);
    let id = 0;
    let buf = Buffer.alloc(0);
    const queue = [...commands];
    const out = [];
    const send = (type, body) => {
      const len = Buffer.byteLength(body);
      const p = Buffer.alloc(14 + len);
      p.writeInt32LE(10 + len, 0); p.writeInt32LE(++id, 4); p.writeInt32LE(type, 8); p.write(body, 12);
      sock.write(p);
    };
    sock.on('connect', () => send(3, RCON_PASSWORD));
    sock.on('error', reject);
    sock.on('data', (d) => {
      buf = Buffer.concat([buf, d]);
      while (buf.length >= 4) {
        const len = buf.readInt32LE(0);
        if (buf.length < 4 + len) break;
        const body = buf.subarray(4, 4 + len);
        buf = buf.subarray(4 + len);
        if (body.readInt32LE(0) === -1) { sock.end(); reject(new Error('RCON auth failed')); return; }
        if (body.readInt32LE(0) > 1) out.push(body.subarray(8, body.length - 2).toString());
        if (queue.length) send(2, queue.shift()); else { sock.end(); resolve(out); }
      }
    });
  });
}

function bot(username) {
  return new Promise((resolve, reject) => {
    const b = mineflayer.createBot({ host: HOST, port: PORT, username, version: VERSION, auth: 'offline', checkTimeoutInterval: 120000 });
    b.once('spawn', () => resolve(b));
    b.once('error', reject);
    b.once('kicked', (r) => reject(new Error(`kicked: ${JSON.stringify(r)}`)));
  });
}

async function capture(id, clip) {
  const events = [];
  let t0 = null;
  let origin = null; // t0, kept after stop() to time the camera's events
  let watched = null;
  let camera = null;
  const h = {
    sleep, rcon, bot,
    // World clips: starts the spectator camera at x y z (world/recorder.js).
    async camera(opts) {
      camera = await require('./world/recorder').startCamera(h, opts);
      return camera.bot;
    },
    // World clips: notes the sign at pos for drawing (world/recorder.js).
    sign(pos) { return camera.noteSign(pos); },
    // Starts keeping what `player` is sent (chat and the action bar).
    start(player) {
      watched = player;
      t0 = Date.now();
      origin = t0;
      player.on('message', (msg, position) => {
        if (t0 === null) return;
        const type = position === 'game_info' ? 'actionbar' : 'chat';
        events.push({ t: (Date.now() - t0) / 1000, type, motd: msg.toMotd(), text: msg.toString() });
      });
    },
    // Sends a command or chat line as the watched player, and records it.
    async send(text, after = 0) {
      events.push({ t: (Date.now() - t0) / 1000, type: 'sent', text });
      watched.chat(text);
      if (after) await sleep(after);
    },
    // What the watched player has been sent so far (plain text), newest last.
    lines() { return events.filter((e) => e.type === 'chat').map((e) => e.text); },
    mark(name) { events.push({ t: (Date.now() - t0) / 1000, type: 'mark', text: name }); },
    stop() { t0 = null; },
  };
  const plugins = (await rcon(['plugins'])).join('\n').replace(/§./g, '').trim();
  const server = (await rcon(['version'])).join('\n').replace(/§./g, '').split('\n')[0];
  await clip.capture(h);
  h.stop();
  // The action bar is re-sent every second with the same text; keep changes only.
  let lastBar = null;
  const kept = events.filter((e) => {
    if (e.type !== 'actionbar') return true;
    if (e.motd === lastBar) return false;
    lastBar = e.motd;
    return true;
  });
  const file = path.join(OUT, `${id}.json`);
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(file, JSON.stringify({
    id,
    note: 'Captured from a local test server by scripts/previews/capture.js. Every line is the server\'s own output; nothing here is written by hand.',
    capturedAt: new Date().toISOString(),
    server, plugins, minecraft: VERSION,
    player: watched.username,
    events: kept,
  }, null, 2) + '\n');
  console.log(`[${id}] ${kept.length} events -> ${path.relative(process.cwd(), file)}`);
  if (camera) {
    camera.stop();
    const scenes = path.join(WORK, 'scenes');
    fs.mkdirSync(scenes, { recursive: true });
    const sceneFile = path.join(scenes, `${id}.json`);
    // One clock for both: seconds since start(), as in the chat capture
    // (the chunks loaded before it are at negative times).
    const world = camera.events.map((e) => ({ t: (e.at - origin) / 1000, ev: e.ev, data: e.data }));
    fs.writeFileSync(sceneFile, JSON.stringify({ id, capturedAt: new Date().toISOString(), version: camera.version, server, events: world, chat: kept, signs: camera.signs }));
    console.log(`[${id}] ${world.length} world events (${(fs.statSync(sceneFile).size / 1048576).toFixed(1)} MB) -> ${sceneFile}`);
  }
  for (const e of kept) console.log(`  ${e.t.toFixed(2).padStart(6)} ${e.type.padEnd(9)} ${e.type === 'sent' || e.type === 'mark' ? e.text : e.text}`);
}

(async () => {
  const ids = process.argv.slice(2);
  if (!ids.length) { console.error('usage: capture.js <id> ...'); process.exit(2); }
  let failed = 0;
  for (const id of ids) {
    const clip = CLIPS[id];
    if (!clip || !clip.capture) { console.error(`${id}: no chat capture defined`); failed++; continue; }
    try { await capture(id, clip); } catch (e) { console.error(`[${id}] FAILED: ${e.stack || e}`); failed++; }
  }
  process.exit(failed ? 1 : 0);
})();
