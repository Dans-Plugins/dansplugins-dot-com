// Fiefs: Southmarch's leader creates a fief inside the faction's land, claims
// a chunk for it, and lists and inspects it.
const { arrive } = require('../helpers');
module.exports = {
  kind: 'chat', aspect: '16:10', poster: 9.0,
  alt: 'Fiefs in Minecraft chat: inside the faction Southmarch\'s land, /fi create "Ironbrook" creates a fief, /fi claim claims the chunk for it, /fi list shows its power, members and land, and /fi info Ironbrook shows its owner and demesne. A recreation of the chat panel; every line is the plugin\'s real output from a test server.',
  async capture(h) {
    const p = await arrive(h, 'Rowena', 56, 88);
    h.start(p);
    await h.sleep(1200);
    h.mark('in');
    await h.send('/fi create "Ironbrook"', 1700);
    await h.send('/fi claim', 1500);
    await h.send('/fi list', 1900);
    await h.send('/fi info Ironbrook', 3000);
    h.mark('out');
    p.quit();
    await h.sleep(1500);
  },
};
