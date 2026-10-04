// MiniFactions: a player founds a faction, claims a chunk, checks it and
// reads the faction's info. Captured on a second test server running
// MiniFactions alone (it uses /mf, like Medieval Factions): MC_PORT=25568
// RCON_PORT=25578. Its player commands default to operators only in 0.3.0,
// so the test player is op'd.
const { arrive } = require('../helpers');
module.exports = {
  kind: 'chat', aspect: '16:10', poster: 8.8,
  alt: 'MiniFactions in Minecraft chat: /mf create Thornwall replies Faction created., /mf claim costs a point of power and claims the chunk, /mf checkclaim confirms it is Thornwall\'s, and /mf info shows the leader, members, power and territory size. A recreation of the chat panel; every line is the plugin\'s real output from a test server.',
  async capture(h) {
    const p = await arrive(h, 'Corwin', 120, 300, ['op Corwin']);
    h.start(p);
    await h.sleep(1200);
    h.mark('in');
    await h.send('/mf create Thornwall', 1800);
    await h.send('/mf claim', 1700);
    await h.send('/mf checkclaim', 1700);
    await h.send('/mf info', 3000);
    h.mark('out');
    p.quit();
    await h.sleep(1500);
  },
};
