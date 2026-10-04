// Medieval Roleplay Engine: a player names their character, then emotes,
// rolls dice and yells, each shown the way the plugin formats it.
const { arrive } = require('../helpers');
module.exports = {
  kind: 'chat', aspect: '16:10', poster: 9.0,
  alt: 'Medieval Roleplay Engine in Minecraft chat: /card name Elspeth of Southmarch names the character, /me draws her sword shows as an emote by that name, /roll 1d20+5 rolls and adds, and /yell To arms! is shouted in red. A recreation of the chat panel; every line is the plugin\'s real output from a test server.',
  async capture(h) {
    const p = await arrive(h, 'Elspeth', 56, 104);
    h.start(p);
    await h.sleep(1200);
    h.mark('in');
    await h.send('/card name Elspeth of Southmarch', 2100);
    await h.send('/me draws her sword', 1900);
    await h.send('/roll 1d20+5', 1900);
    await h.send('/yell To arms!', 2600);
    h.mark('out');
    p.quit();
    await h.sleep(1500);
  },
};
