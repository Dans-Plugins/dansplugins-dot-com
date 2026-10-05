// Dan's Spawn System, in the world: an operator's [Spawn] sign (placed by the
// test server) names a spawn point on a stone platform down the meadow. A
// player right-clicks it: the plugin replies "Spawn set!" and takes them to
// the platform. They walk off and are killed (by the test server, /kill), and
// respawn on the platform ("Teleporting to custom spawn!"). Filmed by a spectator
// camera player and rendered in prismarine-viewer (kind 'world').
//
// prismarine-viewer draws no signs, so the sign is drawn into the page from
// its real block data on the server (world/recorder.js noteSign, page.js
// drawSigns); everything else in the picture is the viewer's own rendering.
const { arrive, sleep } = require('../helpers');
const { look } = require('../world/page');

const NAME = 'Corwin2';
const SPOT = { x: -150, z: 40 };
const PLANTS = ['short_grass', 'tall_grass', 'fern', 'large_fern', 'dandelion', 'poppy', 'azure_bluet', 'oxeye_daisy', 'cornflower'];

const ease = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
const lerp = (a, b, k) => a + (b - a) * k;

// Scene layout from the ground block g at SPOT (same each take).
const layout = (g) => ({
  sign: { x: g.x - 6, y: g.y, z: g.z },
  start: { x: g.x - 7.5, y: g.y, z: g.z + 1.5 },
  spawn: { x: g.x + 7, y: g.y, z: g.z }, // the platform's centre block
});

module.exports = {
  kind: 'world', aspect: '16:10', poster: 0.6,
  alt: 'Dan\'s Spawn System in Minecraft, rendered in 3D: a player right-clicks a [Spawn] sign whose lines give a spawn point; the plugin replies Spawn set! and the camera follows them to that point, a stone platform down the meadow. They walk off and are killed, and respawn on the platform (Teleporting to custom spawn!). The chat lines are recreated from the server\'s real output; the sign is drawn from its real text on the server, since the 3D viewer draws no signs.',
  overlay: {
    tag: 'Recreated chat · real server output',
    lines: [/^Spawn set!|custom spawn/, / was killed$/],
    keep: 2, fade: 6,
  },
  async capture(h) {
    const p = await arrive(h, NAME, SPOT.x, SPOT.z, [`clear ${NAME}`, 'time set 1000', 'weather clear', 'gamerule doImmediateRespawn true']);
    const g = p.entity.position.floored();
    const L = layout(g);
    const s = L.spawn;
    const fills = PLANTS.map((b) => `fill ${g.x - 14} ${g.y - 4} ${g.z - 14} ${g.x + 14} ${g.y + 4} ${g.z + 14} air replace ${b}`);
    await h.rcon([
      // Set dressing: a level meadow, and the spawn point as a small stone
      // platform with two lanterns on posts (the sign's coordinates).
      `fill ${g.x - 12} ${g.y} ${g.z - 4} ${g.x + 10} ${g.y + 6} ${g.z + 4} air`,
      `fill ${g.x - 12} ${g.y - 1} ${g.z - 4} ${g.x + 10} ${g.y - 1} ${g.z + 4} grass_block`,
      `fill ${s.x - 1} ${s.y - 1} ${s.z - 1} ${s.x + 1} ${s.y - 1} ${s.z + 1} stone_bricks`,
      `setblock ${s.x - 1} ${s.y} ${s.z - 2} oak_fence`, `setblock ${s.x - 1} ${s.y + 1} ${s.z - 2} lantern`,
      `setblock ${s.x + 1} ${s.y} ${s.z - 2} oak_fence`, `setblock ${s.x + 1} ${s.y + 1} ${s.z - 2} lantern`,
      ...fills,
      'kill @e[type=item]',
      // Earlier takes' pets are sent away (pets of Wild Pets cannot be hurt, so
      // /kill does not remove them): no stray sheep in the shot.
      `tp @e[type=sheep,x=${g.x},y=${g.y},z=${g.z},distance=..40] ${g.x} -200 ${g.z}`,
      `setblock ${L.sign.x} ${L.sign.y} ${L.sign.z} oak_sign[rotation=0]{front_text:{messages:['"[Spawn]"','"${s.x}"','"${s.y}"','"${s.z}"']}}`,
      `tp ${NAME} ${L.start.x} ${L.start.y} ${L.start.z} 180 0`,
    ]);
    await h.camera({ name: 'Camera', x: g.x, y: g.y + 4, z: g.z + 7 });
    await sleep(1500);
    const noted = h.sign(L.sign);
    console.log(`[dans-spawn-system] the sign as the server holds it: ${JSON.stringify(noted)}`);
    h.start(p);
    await sleep(1200);
    h.mark('in');
    const { Vec3 } = require('vec3'); // (mineflayer's; needed only to capture)
    const block = p.blockAt(new Vec3(L.sign.x, L.sign.y, L.sign.z));
    await p.lookAt(block.position.offset(0.5, 0.7, 0.5), true);
    await sleep(500);
    await p.activateBlock(block);
    await sleep(1600);
    if (!h.lines().some((l) => /Spawn set/.test(l))) throw new Error('the sign did not set the spawn');
    // Walks off, away from the platform.
    await p.lookAt(p.entity.position.offset(-10, 1.6, 2), true);
    p.setControlState('forward', true);
    await sleep(900);
    p.setControlState('forward', false);
    await sleep(500);
    h.mark('kill');
    await h.rcon([`kill ${NAME}`]);
    await sleep(3500);
    h.mark('out');
    p.quit();
    await sleep(1000);
  },
  start: (s) => s.mark('in') - 0.4,
  end: (s) => s.mark('out'),
  // A medium shot of the sign and the player, then (as the sign sends them
  // there) a pan down the meadow to the platform, which it then holds while
  // they walk off, die and respawn.
  shot(t, s) {
    const pl = s.player(NAME);
    const p0 = s.at(pl, s.mark('in'));
    const sign = { x: p0.x + 1.5, y: p0.y, z: p0.z - 1.5 }; // layout(): start is sign + (-1.5, 0, +1.5)
    const spawn = { x: sign.x + 13.5, y: sign.y, z: sign.z + 0.5 };
    const a = { x: sign.x - 0.5, y: sign.y + 0.9, z: sign.z + 0.8 };
    const b = { x: spawn.x - 1.8, y: spawn.y + 0.9, z: spawn.z };
    const k = ease((t - s.line(/^Spawn set!/) - 0.25) / 1.5);
    const target = { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k) };
    const d = lerp(3.6, 5.8, k); // closer on the sign, wider on the platform
    const eye = { x: target.x + d * 0.17, y: target.y + d * 0.28, z: target.z + d };
    return { ...eye, ...look(eye, target), fov: 55 };
  },
};
