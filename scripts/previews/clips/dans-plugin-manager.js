// Dan's Plugin Manager: a server operator searches the catalogue and looks a
// plugin up in-game. Read-only commands only: `/dpm get` would download a
// release from GitHub and add to the download count the site shows.
const { arrive } = require('../helpers');
module.exports = {
  kind: 'chat', aspect: '16:10', poster: 8.8,
  alt: 'Dan\'s Plugin Manager in Minecraft chat: a server operator runs /dpm search faction, which lists Medieval Factions, MiniFactions and BlueMap Medieval Factions, then /dpm info herald, which fetches and shows Herald\'s description, repository and latest release. A recreation of the chat panel; every line is the plugin\'s real output from a test server.',
  async capture(h) {
    const p = await arrive(h, 'Warden', -150, 30, ['op Warden']);
    h.start(p);
    await h.sleep(1200);
    h.mark('in');
    await h.send('/dpm search faction', 2700);
    await h.send('/dpm info herald', 4200);
    h.mark('out');
    p.quit();
    await h.sleep(1500);
  },
};
