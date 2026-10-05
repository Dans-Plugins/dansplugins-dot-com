// Bluemap_MedievalFactions: BlueMap's own web map of a local test server,
// with three factions' claims drawn by the plugin in each faction's colour
// and the members' live player markers. The camera eases in on one faction
// and its territory is clicked, which opens the plugin's label for it.
const { sleep } = require('../helpers');

const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

// Puts the BlueMap camera (flat view) at a centre and distance, then waits
// until the page has drawn at least two frames there.
async function camera(page, { x, z, d }) {
  await page.evaluate(({ x, z, d }) => new Promise((done) => {
    const cm = window.bluemap.mapViewer.controlsManager;
    cm.position.x = x; cm.position.z = z; cm.distance = d;
    requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => done())));
  }), { x, z, d });
}

module.exports = {
  kind: 'map',
  // BlueMap serves itself on the capture server (plugins/BlueMap/webserver.conf).
  url: process.env.BLUEMAP_URL || 'http://127.0.0.1:8199/',
  aspect: '16:10',
  // Software WebGL draws BlueMap at ~3 fps, too slow to record in real time,
  // so the camera move is rendered a frame at a time (h.frame); every frame
  // is the real page. Nothing on the map moves meanwhile: the claims are
  // fixed and the players stand still.
  capture: 'stepped',
  // Half the CSS size at twice the pixel density: the same map at the same
  // resolution, but BlueMap's labels and markers (page elements, sized in CSS
  // px) are twice as large in the frame, so they read in the home page's
  // ~286 px desktop panel (at 960x600 they were drawn about 3 px tall there).
  viewport: { width: 480, height: 300 },
  dsf: 2,
  poster: 7.5,
  alt: 'BlueMap\'s web map of a Minecraft world with three Medieval Factions territories drawn by Bluemap_MedievalFactions in their faction colours (Riverhold blue, Ashford yellow, Southmarch red) and members\' player heads; the view zooms in on Southmarch and clicking it opens the label "Faction: Southmarch".',
  async play(h) {
    const { page } = h;
    const from = { x: 8, z: 36, d: 150 };
    const to = { x: 30, z: 66, d: 105 };
    await page.goto(`${this.url}#preview:${from.x}:64:${from.z}:${from.d}:0:0:0:1:flat`);
    await page.waitForFunction(() => window.bluemap && window.bluemap.mapViewer, null, { timeout: 60000 });
    // BlueMap's own buttons are hidden for the clip; the map is untouched.
    await page.addStyleTag({ content: '#app .control-bar, #zoom-buttons { display: none !important; }' });
    await sleep(9000); // tiles, claims and player markers load
    // BlueMap's map controls ease the camera toward their own target every
    // frame, which fights a scripted move (the zoom jittered in and out), so
    // they are detached for the glide and put back for the click.
    await page.evaluate(() => {
      window.__mapControls = window.bluemap.mapViewer.controlsManager.controls;
      window.bluemap.mapViewer.controlsManager.controls = null;
    });
    await h.start();
    h.mark('in');
    await h.frame(1.2);
    const steps = 70; // 3.5 s at 20 fps
    for (let i = 1; i <= steps; i++) {
      const k = ease(i / steps);
      await camera(page, { x: from.x + (to.x - from.x) * k, z: from.z + (to.z - from.z) * k, d: from.d + (to.d - from.d) * k });
      await h.frame();
    }
    await page.evaluate(() => { window.bluemap.mapViewer.controlsManager.controls = window.__mapControls; });
    await sleep(2500); // the closer tiles load
    await h.frame(0.6);
    // Click inside Southmarch's claim (world x 40, z 85): BlueMap opens the
    // label Bluemap_MedievalFactions gave the claim.
    const at = await page.evaluate(() => {
      const cam = window.bluemap.mapViewer.camera;
      const p = new cam.position.constructor(40, 70, 85).project(cam);
      return { x: ((p.x + 1) / 2) * innerWidth, y: ((1 - p.y) / 2) * innerHeight };
    });
    await page.mouse.click(at.x, at.y);
    await page.waitForSelector('.bm-marker-labelpopup', { timeout: 5000 });
    await sleep(800);
    await h.frame(3.2);
    h.mark('out');
  },
};
