// Medieval Economy: a new player checks their coinpurse, deposits the gold
// coins they started with, and checks it again.
const { arrive } = require('../helpers');
module.exports = {
  kind: 'chat', aspect: '16:10', poster: 8.4,
  alt: 'Medieval Economy in Minecraft chat: a new player runs /balance (0 coins in the coinpurse), /deposit 10 to move ten of their starting gold coins into it, and /balance again. A recreation of the chat panel; every line is the plugin\'s real output from a test server.',
  async capture(h) {
    const p = await arrive(h, 'Odo', -150, 90);
    h.start(p);
    await h.sleep(1200);
    h.mark('in');
    await h.send('/balance', 1800);
    await h.send('/deposit 10', 1900);
    await h.send('/balance', 2600);
    await h.send('/withdraw 4', 2600);
    h.mark('out');
    p.quit();
    await h.sleep(1500);
  },
};
