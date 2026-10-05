// Wild Pets, in the world: a player tames a sheep standing beside them (the
// test server summons it), names it Ember and tells it to follow, then walks
// off. Wild Pets 1.10.0 makes a following pet keep up by teleporting it to
// its owner each time the owner crosses into another chunk, so the sheep
// stays put until the player crosses the chunk border, then appears at their
// side. Filmed by a spectator camera player and
// rendered in prismarine-viewer (kind 'world'); the chat lines over it are
// the capture's, drawn as a labelled recreation.
const { arrive, hold, sleep } = require('../helpers');
const { look } = require('../world/page');

const NAME = 'Maren2';
const SPOT = { x: -150, z: 40 };
// Plants cleared around the scene before filming (set dressing): the pair
// stand out, and grass blades are what video compresses worst.
const PLANTS = ['short_grass', 'tall_grass', 'fern', 'large_fern', 'dandelion', 'poppy', 'azure_bluet', 'oxeye_daisy', 'cornflower', 'red_tulip', 'orange_tulip', 'white_tulip', 'pink_tulip', 'lily_of_the_valley'];

module.exports = {
  kind: 'world', aspect: '16:10', poster: 1.5,
  alt: 'Wild Pets in Minecraft, rendered in 3D: a player tames a sheep standing beside them and tells it to follow; they walk off, and as they cross into the next chunk the sheep appears at their side. Chat lines from the plugin (Tamed., Ember is now following you.) appear in the corner, recreated from the server\'s real output.',
  // Seen in the world: the lines are the capture's own.
  overlay: {
    tag: 'Recreated chat · real server output',
    lines: [/^\/wp (tame|follow)$/, /Tamed\.|Taming failed|following you/],
    keep: 3, fade: 6,
  },
  async capture(h) {
    const p = await arrive(h, NAME, SPOT.x, SPOT.z, [`clear ${NAME}`, 'time set 13000', 'weather clear']);
    const g = p.entity.position.floored();
    // The next chunk border east of the spot, and a start ~12 blocks short
    // of it: the sheep is left well behind before it is brought along.
    const border = Math.floor(g.x / 16) * 16 + 16;
    const start = border - 11.5;
    const fills = PLANTS.map((b) => `fill ${g.x - 14} ${g.y - 4} ${g.z - 14} ${g.x + 14} ${g.y + 4} ${g.z + 14} air replace ${b}`);
    // A level walk east for the player (set dressing: the meadow is levelled
    // where they walk, so they never stop at a step).
    const level = [
      `fill ${g.x - 12} ${g.y} ${g.z - 4} ${g.x + 10} ${g.y + 6} ${g.z + 4} air`,
      `fill ${g.x - 12} ${g.y - 1} ${g.z - 4} ${g.x + 10} ${g.y - 1} ${g.z + 4} grass_block`,
      `fill ${g.x - 12} ${g.y - 3} ${g.z - 4} ${g.x + 10} ${g.y - 2} ${g.z + 4} dirt`,
    ];
    // (earlier takes' pets are sent away: Wild Pets keeps pets from harm, so
    // /kill does not remove them)
    await h.rcon([...level, ...fills, `tp @e[type=sheep,x=${g.x},y=${g.y},z=${g.z},distance=..40] ${g.x} -200 ${g.z}`, 'kill @e[type=item]', `tp ${NAME} ${start} ${g.y} ${g.z + 0.5} -90 0`]);
    await h.camera({ name: 'Camera', x: border - 6, y: g.y + 3, z: g.z + 6 });
    await sleep(1500);
    await h.rcon([`summon sheep ${start + 2} ${g.y} ${g.z + 0.5} {Rotation:[90f,0f]}`, `give ${NAME} wheat 8`]);
    await sleep(800);
    await hold(p, 'wheat');
    h.start(p);
    await sleep(1500);
    h.mark('in');
    await h.send('/wp tame', 1000);
    for (let i = 0; i < 10 && !h.lines().some((l) => /Tamed\./.test(l)); i++) {
      // Each try costs the 8 wheat in hand (Sheep: WHEAT x8, 50%): more is
      // given only once that is gone, so none is left after (a sheep would
      // otherwise follow the wheat, as in the unmodded game).
      if (!p.inventory.items().some((it) => it.name === 'wheat')) {
        await h.rcon([`give ${NAME} wheat 8`]);
        await sleep(400);
        await hold(p, 'wheat');
      }
      const sheep = p.nearestEntity((e) => e.name === 'sheep');
      if (!sheep) throw new Error('the sheep is gone');
      await p.lookAt(sheep.position.offset(0, 0.6, 0), true);
      await sleep(150);
      await p.activateEntity(sheep).catch(() => {});
      await sleep(1100);
    }
    if (!h.lines().some((l) => /Tamed\./.test(l))) throw new Error('not tamed in 10 tries');
    h.mark('tamed');
    await sleep(700);
    await h.send('/wp rename Ember', 900);
    await h.send('/wp follow', 1000);
    h.mark('walk');
    await p.lookAt(p.entity.position.offset(20, 1.6, 0), true);
    p.setControlState('forward', true);
    // Walks until just past the border (the sheep's cue), then stops.
    for (let i = 0; i < 100 && p.entity.position.x < border + 1.2; i++) await sleep(50);
    p.setControlState('forward', false);
    await sleep(900);
    const sheep = p.nearestEntity((e) => e.name === 'sheep');
    if (sheep) await p.lookAt(sheep.position.offset(0, 0.6, 0), true);
    await sleep(1500);
    h.mark('out');
    p.quit();
    await sleep(1000);
  },
  // Render: from just before the try that tamed it to the end.
  start: (s) => s.line(/Tamed\./) - 0.9,
  end: (s) => s.mark('out'),
  // A side-on medium shot that tracks the player: the camera keeps a fixed
  // offset from their (smoothed) position, a little ahead of them.
  shot(t, s) {
    const pl = s.player(NAME);
    const c = s.smooth(pl, t, 0.9);
    const eye = { x: c.x + 0.8, y: c.y + 1.7, z: c.z + 4.6 };
    return { ...eye, ...look(eye, { x: c.x + 0.8, y: c.y + 0.8, z: c.z }), fov: 55 };
  },
};
