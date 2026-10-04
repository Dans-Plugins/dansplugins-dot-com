// Dan's Set Home: a player sets a home, wanders off (moved by the test
// server, off-screen), and goes home.
const { arrive } = require('../helpers');
module.exports = {
  kind: 'chat', aspect: '16:10', poster: 7.5,
  alt: 'Dan\'s Set Home in Minecraft chat: /sethome replies Home set!, and later /home replies Teleporting in 3 seconds... before taking the player back. A recreation of the chat panel; every line is the plugin\'s real output from a test server.',
  async capture(h) {
    const p = await arrive(h, 'Tamsin', -150, 60);
    h.start(p);
    await h.sleep(1200);
    h.mark('in');
    await h.send('/sethome', 1600);
    await h.rcon(['spreadplayers -150 140 0 1 false Tamsin']);
    await h.sleep(1200);
    await h.send('/home', 5200);
    h.mark('out');
    p.quit();
    await h.sleep(1500);
  },
};
