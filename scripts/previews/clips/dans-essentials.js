// Dan's Essentials: an operator gets their coordinates, renames the sword in
// their hand, and broadcasts to the server.
const { arrive, hold } = require('../helpers');
module.exports = {
  kind: 'chat', aspect: '16:10', poster: 8.6,
  alt: 'Dan\'s Essentials in Minecraft chat: an operator runs /de getpos for their coordinates, /de label "Oathkeeper" to rename the sword in their hand, and /de broadcast to announce to everyone online. A recreation of the chat panel; every line is the plugin\'s real output from a test server.',
  async capture(h) {
    const p = await arrive(h, 'Warden', -150, 30, ['op Warden', 'clear Warden', 'give Warden iron_sword 1']);
    await hold(p, 'iron_sword');
    h.start(p);
    await h.sleep(1200);
    h.mark('in');
    await h.send('/de getpos', 1800);
    await h.send('/de label "Oathkeeper"', 2000);
    await h.send('/de broadcast "The gates open at dawn."', 3000);
    h.mark('out');
    p.quit();
    await h.sleep(1500);
  },
};
