// Shared bits for the clip scripts.
'use strict';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Joins `name`, then (setup, through RCON) puts it on the ground at x z and
// waits for the world around it, so a capture never starts mid-teleport.
async function arrive(h, name, x, z, setup = []) {
  const p = await h.bot(name);
  await sleep(1500);
  await h.rcon([`spreadplayers ${x} ${z} 0 1 false ${name}`, ...setup]);
  await sleep(2500);
  await p.waitForChunksToLoad().catch(() => {});
  return p;
}

// Holds the first inventory item called `item` in the main hand.
async function hold(p, item) {
  const it = p.inventory.items().find((i) => i.name === item);
  if (it) await p.equip(it, 'hand');
  return Boolean(it);
}

module.exports = { sleep, arrive, hold };
