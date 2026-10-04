// Mailboxes: Garrick is told a message has arrived (Rowena, another bot,
// sends it off-screen), lists his mailbox and opens it.
const { arrive } = require('../helpers');
module.exports = {
  kind: 'chat', aspect: '16:10', poster: 9.0,
  alt: 'Mailboxes in Minecraft chat: a player is told a message has arrived, runs /m list to see it from Rowena, and /m open to read "The council meets at noon." with Archive and Delete buttons. The sender was another test player, off-screen. A recreation of the chat panel; every line is the plugin\'s real output from a test server.',
  async capture(h) {
    const p = await arrive(h, 'Garrick', 56, 56);
    const sender = await arrive(h, 'Rowena', 40, 72);
    h.start(p);
    await h.sleep(800);
    h.mark('in');
    sender.chat('/m send Garrick "The council meets at noon."');
    await h.sleep(1600);
    await h.send('/m list', 2200);
    const row = h.lines().reverse().find((l) => /ID: \d+ .*S: Rowena/.test(l));
    const id = row ? row.match(/ID: (\d+)/)[1] : '0';
    await h.send(`/m open ${id}`, 3600);
    h.mark('out');
    p.quit(); sender.quit();
    await h.sleep(1500);
  },
};
