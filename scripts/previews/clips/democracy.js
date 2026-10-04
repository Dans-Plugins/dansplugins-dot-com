// Democracy: Southmarch's leader calls an election, casts a vote and reads
// the count. Garrick and Elspeth (other bots) stand and vote off-screen.
const { arrive } = require('../helpers');
module.exports = {
  kind: 'chat', aspect: '16:10', poster: 8.6,
  alt: 'Democracy in Minecraft chat: the leader of the faction Southmarch runs /d start to call an election, /d vote Elspeth, and /d info, which shows the count: Elspeth 2 votes, Garrick 1. The other members stood and voted off-screen (other test players). A recreation of the chat panel; every line is the plugin\'s real output from a test server.',
  async capture(h) {
    const leader = await arrive(h, 'Rowena', 40, 72);
    const garrick = await arrive(h, 'Garrick', 56, 56);
    const elspeth = await arrive(h, 'Elspeth', 56, 104);
    h.start(leader);
    await h.sleep(1200);
    h.mark('in');
    await h.send('/d start', 1200);
    garrick.chat('/d run');
    elspeth.chat('/d run');
    await h.sleep(1300);
    await h.send('/d vote Elspeth', 1000);
    garrick.chat('/d vote Elspeth');
    elspeth.chat('/d vote Garrick');
    await h.sleep(1400);
    await h.send('/d info', 3400);
    h.mark('out');
    for (const p of [leader, garrick, elspeth]) p.quit();
    await h.sleep(2000);
  },
};
