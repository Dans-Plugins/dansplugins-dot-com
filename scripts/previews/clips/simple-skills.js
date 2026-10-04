// SimpleSkills: a new player digs with a shovel (the test server gives them
// one); the plugin teaches them the Digging skill and levels it up, and
// /ss info shows it.
const { arrive, hold, sleep } = require('../helpers');
module.exports = {
  kind: 'chat', aspect: '16:10', poster: 9.0,
  alt: 'SimpleSkills in Minecraft chat: while a player digs dirt with a shovel, the plugin says they have learned the Digging skill, then that it has levelled up to 1 and to 2, and /ss info lists Digging at level 2 with its experience. A recreation of the chat panel; every line is the plugin\'s real output from a test server.',
  async capture(h) {
    const p = await arrive(h, 'Wren', -121, 150, ['clear Wren', 'give Wren iron_shovel 1']);
    await hold(p, 'iron_shovel');
    h.start(p);
    await h.sleep(800);
    h.mark('in');
    let dug = 0;
    for (let i = 0; i < 60 && dug < 26; i++) {
      const b = p.findBlock({ matching: (bl) => ['dirt', 'grass_block', 'sand', 'gravel'].includes(bl.name), maxDistance: 4 });
      if (!b) break;
      try { await p.dig(b, true); dug++; } catch (e) { await sleep(200); }
    }
    await h.sleep(600);
    await h.send('/ss info', 2800);
    h.mark('out');
    p.quit();
    await h.sleep(1500);
  },
};
