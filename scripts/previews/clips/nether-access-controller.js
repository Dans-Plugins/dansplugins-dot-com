// Nether Access Controller, from the operator's side: /nac list, then the
// operator allows a player (who meanwhile tries to light a portal, refused
// until allowed), and lists again. The frame is built by the test server.
const { arrive, hold } = require('../helpers');
module.exports = {
  kind: 'chat', aspect: '16:10', poster: 7.6,
  alt: 'Nether Access Controller in Minecraft chat, from an operator\'s side: /nac list shows who may use the nether, /nac allow Quill lets the player Quill light portals (refused until then), and /nac list again names Quill. A recreation of the chat panel; every line is the plugin\'s real output from a test server.',
  async capture(h) {
    const { Vec3 } = require('vec3'); // mineflayer's; only needed when capturing
    const op = await arrive(h, 'Warden', -150, 30, ['op Warden']);
    const p = await arrive(h, 'Quill', -200, 260, ['clear Quill', 'give Quill flint_and_steel 1']);
    const at = p.entity.position.floored();
    const x = at.x + 3; const y = at.y; const z = at.z;
    await h.rcon([`fill ${x} ${y - 1} ${z - 1} ${x} ${y + 3} ${z + 2} obsidian`, `fill ${x} ${y} ${z} ${x} ${y + 2} ${z + 1} air`]);
    await hold(p, 'flint_and_steel');
    const base = p.blockAt(new Vec3(x, y - 1, z));
    await p.lookAt(base.position.offset(0.5, 1, 0.5));
    // Watched: the operator. The player's two tries happen meanwhile.
    h.start(op);
    await h.sleep(1000);
    h.mark('in');
    await h.send('/nac list', 1400);
    await p.activateBlock(base, new Vec3(0, 1, 0)).catch(() => {});
    await h.sleep(900);
    await h.send('/nac allow Quill', 1800);
    await p.activateBlock(base, new Vec3(0, 1, 0)).catch(() => {});
    await h.sleep(800);
    await h.send('/nac list', 3000);
    h.mark('out');
    p.quit(); op.quit();
    await h.sleep(1500);
  },
};
