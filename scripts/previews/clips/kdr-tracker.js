// KDR Tracker: Bram wins a fight with Cole (both test players; Bram is given
// a sword) and checks his record.
const { arrive, hold, sleep } = require('../helpers');
module.exports = {
  kind: 'chat', aspect: '16:10', poster: 8.5,
  alt: 'KDR Tracker in Minecraft chat: after Bram defeats Cole in a fight, the plugin counts the kill, the death message appears, and /kdrt info shows 1 kill, 0 deaths and a K/D ratio of 1.00. A recreation of the chat panel; every line is the plugin\'s real output from a test server.',
  async capture(h) {
    const a = await arrive(h, 'Bram', -200, 30, ['clear Bram', 'give Bram iron_sword 1']);
    const v = await arrive(h, 'Cole', -200, 30);
    await hold(a, 'iron_sword');
    h.start(a);
    await h.sleep(900);
    h.mark('in');
    for (let i = 0; i < 40; i++) {
      const t = a.nearestEntity((e) => e.type === 'player' && e.username === 'Cole');
      if (!t || v.health <= 0) break;
      await a.lookAt(t.position.offset(0, 1.5, 0));
      if (a.entity.position.distanceTo(t.position) > 3) a.setControlState('forward', true);
      else { a.setControlState('forward', false); a.attack(t); }
      await sleep(650);
    }
    a.setControlState('forward', false);
    await h.sleep(1200);
    await h.send('/kdrt info', 3200);
    h.mark('out');
    a.quit(); v.quit();
    await h.sleep(1500);
  },
};
