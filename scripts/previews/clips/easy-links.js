// Easy Links: an operator adds the community Discord link, and players list
// and view it. The plugin ships with no links, so the clip adds one.
const { arrive } = require('../helpers');
module.exports = {
  kind: 'chat', aspect: '16:10', poster: 8.6,
  alt: 'Easy Links in Minecraft chat: an operator runs /el create "discord" with the community\'s Discord invite, then /el list shows it and /el view "discord" prints the link. A recreation of the chat panel; every line is the plugin\'s real output from a test server.',
  async capture(h) {
    const p = await arrive(h, 'Warden', -150, 30, ['op Warden']);
    h.start(p);
    await h.sleep(1200);
    h.mark('in');
    await h.send('/el create "discord" "https://discord.gg/xXtuAQ2"', 2300);
    await h.send('/el list', 1900);
    await h.send('/el view "discord"', 3000);
    h.mark('out');
    p.quit();
    await h.sleep(1500);
  },
};
