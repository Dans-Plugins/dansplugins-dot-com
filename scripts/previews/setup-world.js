#!/usr/bin/env node
// Builds the world the clips need on a FRESH local test server, by having bot
// players run the plugins' own commands, then keeps the bots online (BlueMap
// draws them as player markers) until it is stopped with Ctrl-C.
// See scripts/previews/README.md.
//
//   RCON_PASSWORD=... node scripts/previews/setup-world.js
//
// Three factions, each a founder plus two members who joined by invitation,
// so each holds the 15 chunks its pooled power allows:
//   Southmarch (red)    founder Rowena, members Garrick, Elspeth
//   Riverhold  (blue)   founder Brenna, members Tobin, Maud
//   Ashford    (yellow) founder Osric,  members Wynn, Hilda
// Chunk coordinates suit the seed in the README (level-seed=8675309): a river
// runs east-west at chunk z 1-2, Riverhold is north of it, the others south.
//
// Setup-only RCON use: gamemode (creative while placing, so nobody takes fall
// damage and loses power), spreadplayers (puts a bot on the ground in a chunk)
// and a final `bluemap reload`. Bluemap_MedievalFactions 1.0.0 draws a
// faction's claims as they stood just before its latest claim (it reads them
// when MF announces the claim, before MF has saved it), so the reload is what
// makes the map show every claim.
'use strict';

const net = require('net');
const mineflayer = require('mineflayer');

const HOST = process.env.MC_HOST || '127.0.0.1';
const PORT = Number(process.env.MC_PORT || 25567);
const VERSION = process.env.MC_VERSION || '1.21.1';
const RCON_PORT = Number(process.env.RCON_PORT || 25577);
const RCON_PASSWORD = process.env.RCON_PASSWORD;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (!['127.0.0.1', 'localhost', '::1'].includes(HOST)) {
  console.error(`refusing to set up ${HOST}: local test servers only`);
  process.exit(2);
}
if (!RCON_PASSWORD) {
  console.error('set RCON_PASSWORD (the local server\'s rcon.password)');
  process.exit(2);
}

const FACTIONS = [
  {
    name: 'Southmarch', color: '#c0392b', founder: 'Rowena', members: ['Garrick', 'Elspeth'],
    claims: [[1, 3], [2, 3], [1, 4], [2, 4], [1, 5], [3, 3], [3, 4], [3, 5], [2, 5], [1, 6], [2, 6], [3, 6], [4, 4], [4, 5], [4, 6]],
    stand: { Rowena: [1, 4], Garrick: [3, 3], Elspeth: [3, 6] },
  },
  {
    name: 'Riverhold', color: '#2e86de', founder: 'Brenna', members: ['Tobin', 'Maud'],
    claims: [[0, -1], [1, -1], [0, 0], [1, 0], [2, 0], [2, -1], [3, -1], [3, 0], [0, -2], [1, -2], [2, -2], [3, -2], [0, -3], [1, -3], [2, -3]],
    stand: { Brenna: [1, -1], Tobin: [1, -2], Maud: [3, -1] },
  },
  {
    name: 'Ashford', color: '#f1c40f', founder: 'Osric', members: ['Wynn', 'Hilda'],
    claims: [[-4, 4], [-3, 4], [-4, 5], [-3, 5], [-2, 4], [-5, 4], [-5, 5], [-2, 5], [-4, 6], [-3, 6], [-5, 6], [-2, 6], [-4, 3], [-3, 3], [-5, 3]],
    stand: { Osric: [-4, 4], Wynn: [-2, 5], Hilda: [-5, 6] },
  },
];

function rcon(commands) {
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
        if (body.readInt32LE(0) > 1) out.push(body.subarray(8, body.length - 2).toString().replace(/§./g, ''));
        if (queue.length) send(2, queue.shift()); else { sock.end(); resolve(out); }
      }
    });
  });
}

function join(username) {
  return new Promise((resolve, reject) => {
    const bot = mineflayer.createBot({ host: HOST, port: PORT, username, version: VERSION, auth: 'offline', checkTimeoutInterval: 300000 });
    bot.replies = [];
    bot.on('messagestr', (m, pos) => { if (pos !== 'game_info') bot.replies.push(m); });
    bot.once('spawn', () => resolve(bot));
    bot.once('error', reject);
    bot.once('kicked', (r) => reject(new Error(`${username} kicked: ${JSON.stringify(r)}`)));
  });
}

// Runs a command as a bot and returns what the server said back.
async function run(bot, command, wait = 1300) {
  const from = bot.replies.length;
  bot.chat(command);
  await sleep(wait);
  return bot.replies.slice(from);
}

const centre = ([cx, cz]) => [cx * 16 + 8, cz * 16 + 8];
const place = ([x, z], who) => rcon([`spreadplayers ${x} ${z} 0 1 false ${who}`]);

(async () => {
  const bots = {};
  for (const f of FACTIONS) {
    for (const name of [f.founder, ...f.members]) {
      bots[name] = await join(name);
      await sleep(800);
    }
  }
  await sleep(2000);
  for (const f of FACTIONS) {
    const founder = bots[f.founder];
    console.log(`${f.name}:`, (await run(founder, `/mf create ${f.name}`)).join(' | '));
    await run(founder, `/mf flag set color ${f.color}`);
    for (const m of f.members) {
      await run(founder, `/mf invite ${m}`);
      console.log(`  ${m}:`, (await run(bots[m], `/mf join ${f.name}`)).join(' | '));
    }
    await rcon([`gamemode creative ${f.founder}`]);
    let claimed = 0;
    for (const chunk of f.claims) {
      await place(centre(chunk), f.founder);
      await sleep(1000);
      const said = await run(founder, '/mf claim');
      if (said.some((l) => /Claimed 1 chunks/.test(l))) claimed++;
      else console.log(`  claim ${chunk} -> ${said.join(' | ')}`);
    }
    await rcon([`gamemode survival ${f.founder}`]);
    console.log(`  claimed ${claimed}/${f.claims.length}`);
    for (const [who, chunk] of Object.entries(f.stand)) await place(centre(chunk), who);
  }
  await rcon(['save-all flush']);
  await sleep(2000);
  console.log((await rcon(['bluemap reload'])).join(' '));
  console.log('World ready; bots stay online for the BlueMap clip. Ctrl-C to disconnect them.');
  process.on('SIGINT', () => { Object.values(bots).forEach((b) => b.quit()); setTimeout(() => process.exit(0), 1500); });
})().catch((e) => { console.error(e); process.exit(1); });
