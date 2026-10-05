// World clips, render half: serves prismarine-viewer's own browser viewer
// (its prebuilt page in prismarine-viewer/public) and feeds it a scene saved
// by capture.js, as the viewer's socket would have, but on a clock that
// record.js advances one frame at a time. Nothing is added to the stream:
// each event is sent as recorded, once its time comes.
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');

const PUBLIC = path.join(path.dirname(require.resolve('prismarine-viewer/package.json')), 'public');

/** Starts the server for `scene` on a free local port. */
function serve(scene, { port = 0 } = {}) {
  const app = express();
  app.use('/', express.static(PUBLIC));
  const server = http.createServer(app);
  const io = new Server(server);
  const events = [...scene.events].sort((a, b) => a.t - b.t);
  let now = -Infinity;
  const sockets = new Set();
  io.on('connection', (socket) => {
    const s = { socket, sent: 0 };
    sockets.add(s);
    socket.on('disconnect', () => sockets.delete(s));
    socket.emit('version', scene.version);
    flush(s);
  });
  function flush(s) {
    while (s.sent < events.length && events[s.sent].t <= now) {
      const e = events[s.sent++];
      s.socket.emit(e.ev, e.data);
    }
  }
  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve({
      url: `http://127.0.0.1:${server.address().port}/`,
      get connected() { return sockets.size; },
      // Sends every event up to time t (seconds on the capture's clock).
      advanceTo(t) { now = t; for (const s of sockets) flush(s); },
      close() { io.close(); server.close(); },
    }));
  });
}

const load = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

// What a clip's camera script can ask of a scene: where each entity was at
// any moment (from the same recorded events the viewer draws), and the
// capture's marks. Positions are interpolated between updates.
function inspect(scene) {
  const entities = {};
  for (const e of scene.events) {
    if (e.ev !== 'entity') continue;
    const d = e.data;
    const en = entities[d.id] || (entities[d.id] = { id: d.id, samples: [] });
    if (d.name) en.name = d.name;
    if (d.username) en.username = d.username;
    if (d.delete) en.samples.push({ t: e.t, gone: true });
    else if (d.pos) en.samples.push({ t: e.t, x: d.pos.x, y: d.pos.y, z: d.pos.z });
  }
  const marks = Object.fromEntries((scene.chat || []).filter((e) => e.type === 'mark').map((e) => [e.text, e.t]));
  const at = (en, t) => {
    const s = en.samples.filter((p) => !p.gone);
    if (!s.length) return null;
    if (t <= s[0].t) return { ...s[0] };
    for (let i = 1; i < s.length; i++) {
      if (s[i].t >= t) {
        const a = s[i - 1]; const b = s[i];
        // A jump of more than 4 blocks is a teleport: no gliding through it.
        if (Math.hypot(b.x - a.x, b.z - a.z) > 4) return { ...a };
        const k = (t - a.t) / Math.max(1e-6, b.t - a.t);
        return { t, x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k };
      }
    }
    return { ...s[s.length - 1] };
  };
  return {
    marks,
    // When the first chat line matching `re` arrived (plain text).
    line(re) {
      const e = (scene.chat || []).find((c) => c.type === 'chat' && re.test(c.text));
      if (!e) throw new Error(`no chat line matching ${re} in the capture`);
      return e.t;
    },
    mark(name) { if (!(name in marks)) throw new Error(`no mark ${name} in the capture`); return marks[name]; },
    entity(test) { return Object.values(entities).find(test) || null; },
    player(username) { return Object.values(entities).find((e) => e.username === username) || null; },
    // The entity called `name` (e.g. 'fox') nearest to position `to` at time t.
    nearest(name, to, t) {
      let best = null; let bd = Infinity;
      for (const en of Object.values(entities)) {
        if (en.name !== name) continue;
        const p = at(en, t);
        const d = p ? Math.hypot(p.x - to.x, p.y - to.y, p.z - to.z) : Infinity;
        if (d < bd) { bd = d; best = en; }
      }
      return best;
    },
    at,
    // The position averaged over ±w seconds: a camera following it glides.
    smooth(en, t, w = 0.6, n = 13) {
      let x = 0; let y = 0; let z = 0; let k = 0;
      for (let i = 0; i < n; i++) {
        const p = at(en, t - w + (2 * w * i) / (n - 1));
        if (p) { x += p.x; y += p.y; z += p.z; k++; }
      }
      return k ? { x: x / k, y: y / k, z: z / k } : null;
    },
  };
}

module.exports = { serve, load, inspect };
