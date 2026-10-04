// Wild Pets: a player holding sweet berries tames a wild fox (summoned beside
// them by the test server), names it and tells it to follow.
const { arrive, hold, sleep } = require('../helpers');
module.exports = {
  kind: 'chat', aspect: '16:10', poster: 9.0,
  alt: 'Wild Pets in Minecraft chat: /wp tame, then right-clicks on a fox while holding sweet berries (each try costs 8 berries and can fail) until it replies Tamed., /wp rename Ember names the pet, and /wp follow replies Ember is now following you. A recreation of the chat panel; every line is the plugin\'s real output from a test server.',
  async capture(h) {
    const p = await arrive(h, 'Fenna', -150, 0, ['clear Fenna', 'give Fenna sweet_berries 40']);
    await hold(p, 'sweet_berries');
    const pos = p.entity.position;
    await h.rcon([`summon fox ${pos.x + 1.5} ${pos.y} ${pos.z}`]);
    await sleep(800);
    h.start(p);
    await h.sleep(900);
    h.mark('in');
    await h.send('/wp tame', 1100);
    for (let i = 0; i < 5 && !h.lines().some((l) => /Tamed\./.test(l)); i++) {
      const fox = p.nearestEntity((e) => e.name === 'fox');
      if (!fox) break;
      await p.lookAt(fox.position.offset(0, 0.3, 0), true);
      await p.activateEntity(fox).catch(() => {});
      await sleep(900);
    }
    await h.sleep(900);
    await h.send('/wp rename Ember', 1700);
    await h.send('/wp follow', 2600);
    h.mark('out');
    p.quit();
    await h.sleep(1500);
  },
};
