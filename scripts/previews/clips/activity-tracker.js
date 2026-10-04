// Activity Tracker: a player checks their own record and the most active
// players. Its records start from when the plugin was installed on the test
// server, so the hours are small and the names are the test's players.
const { arrive } = require('../helpers');
module.exports = {
  kind: 'chat', aspect: '16:10', poster: 8.0,
  alt: 'Activity Tracker in Minecraft chat: /at info shows a player\'s logins, play time, ranking bar and first login, and /at top 5 lists the most active players with bars. A recreation of the chat panel; every line is the plugin\'s real output from a test server.',
  async capture(h) {
    const p = await arrive(h, 'Scout', -8, 120);
    h.start(p);
    await h.sleep(1200);
    h.mark('in');
    await h.send('/at info', 3300);
    await h.send('/at top 5', 3800);
    h.mark('out');
    p.quit();
    await h.sleep(1500);
  },
};
