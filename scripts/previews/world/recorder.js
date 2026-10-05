// World clips, live half: a spectator "camera" player on the local test
// server, whose view of the world (chunk columns, block changes, every entity
// spawning, moving and leaving) is recorded with prismarine-viewer's own
// WorldView: the exact stream its browser viewer draws from. record.js later
// replays that stream into the viewer page (world/replay.js) and films it
// with a scripted camera, a frame at a time. See scripts/previews/README.md.
//
// The camera player is in spectator mode: other players and mobs do not see
// it, and it is never drawn (WorldView leaves out the bot's own entity).
'use strict';

// Loaded straight from its file: the package's index also loads the browser
// renderer, which needs `canvas`.
const { WorldView } = require('prismarine-viewer/viewer/lib/worldView');
const { Vec3 } = require('vec3');

/**
 * Joins `name` as a spectator at x y z and starts recording what it sees.
 * Returns { events, version, stop() }; each event is { at (ms), ev, data }.
 */
async function startCamera(h, { name = 'Camera', x, y, z, viewDistance = 4 }) {
  const cam = await h.bot(name);
  // A spectator floats where it is put; mineflayer's physics would drop it.
  cam.physicsEnabled = false;
  await h.rcon([`gamemode spectator ${name}`, `tp ${name} ${x} ${y} ${z}`]);
  await h.sleep(2500);
  await cam.waitForChunksToLoad().catch(() => {});
  const events = [];
  // WorldView talks to a socket; this stand-in keeps everything it says, as
  // plain data at the moment it is said (positions are live objects).
  const recorder = {
    on() {},
    emit(ev, data) { events.push({ at: Date.now(), ev, data: JSON.parse(JSON.stringify(data)) }); },
  };
  const view = new WorldView(cam.world, viewDistance, cam.entity.position, recorder);
  await view.init(cam.entity.position);
  view.listenToBot(cam);
  const signs = [];
  return {
    events,
    signs,
    version: cam.version,
    // prismarine-viewer 1.33.0 draws no signs (their block model is empty and
    // it has no block-entity renderer), so a sign the clip needs is noted
    // here as the camera player's client holds it: its block, rotation and
    // front text, read from the server's own block entity data. record.js
    // draws it in the page (world/page.js drawSigns).
    noteSign(pos) {
      const block = cam.blockAt(new Vec3(pos.x, pos.y, pos.z));
      if (!block || !/_sign$/.test(block.name)) throw new Error(`no sign at ${pos}`);
      const [front] = block.getSignText();
      signs.push({ pos: { x: pos.x, y: pos.y, z: pos.z }, name: block.name, rotation: block.getProperties().rotation, lines: front.split('\n') });
      return signs[signs.length - 1];
    },
    bot: cam,
    stop() { view.removeListenersFromBot(cam); cam.quit(); },
  };
}

module.exports = { startCamera };
