// World clips, in the page: takes the camera away from prismarine-viewer's
// page and gives it to the clip script, and draws the optional overlay.
//
// The viewer's prebuilt page sets `window.THREE` and renders with one
// WebGLRenderer. This init script wraps that renderer's render() so that, just
// before each frame is drawn, the camera is put exactly where the clip says
// (window.__shot = { x, y, z, yaw, pitch, fov }): eye position in world
// coordinates, yaw and pitch in radians as Minecraft and mineflayer use them
// (yaw 0 faces north, -Z; positive yaw turns west; positive pitch looks up).
// The page's own controls (an orbit camera, and a first-person camera fed by
// the bot's position) never get a say: the replay sends no position events.
'use strict';

function cameraHook() {
  // three r128 (the viewer's) defines render() on each renderer in its
  // constructor, so the page's renderer is wrapped as it is made: the page
  // makes it with `new THREE.WebGLRenderer()` on the global it has just set.
  let three;
  const wrap = (THREE) => {
    // (three's exports are getters, so the wrapper is defined, not assigned)
    const own = Object.create(THREE);
    const WebGLRenderer = function (...args) {
      const renderer = new THREE.WebGLRenderer(...args);
      const render = renderer.render;
      renderer.render = function (scene, camera) {
        window.__pv = { scene, camera };
        const c = window.__shot;
        if (c) {
          camera.position.set(c.x, c.y, c.z);
          camera.rotation.set(c.pitch, c.yaw, 0, 'ZYX');
          const fov = c.fov || 75;
          if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
        }
        window.__frames = (window.__frames || 0) + 1;
        return render.call(renderer, scene, camera);
      };
      return renderer;
    };
    Object.defineProperty(own, 'WebGLRenderer', { value: WebGLRenderer, writable: true, configurable: true });
    return own;
  };
  Object.defineProperty(window, 'THREE', {
    configurable: true, enumerable: true,
    get() { return three; },
    set(v) { three = wrap(v); },
  });
}

// How many meshes the scene holds (chunk sections and entities), to tell
// when the viewer's workers have finished building the world.
const meshCount = (page) => page.evaluate(() => {
  if (!window.__pv) return 0;
  let n = 0;
  window.__pv.scene.traverse((o) => { if (o.isMesh) n++; });
  return n;
});

// Puts the camera at `shot` and resolves once a frame has been drawn there.
const setShot = (page, shot) => page.evaluate((s) => new Promise((done) => {
  window.__shot = s;
  const f = window.__frames || 0;
  const wait = () => ((window.__frames || 0) > f + 1 ? done() : requestAnimationFrame(wait));
  requestAnimationFrame(wait);
}), shot);

// Looking from `from` at `to` ({x, y, z} each): the yaw and pitch for a shot.
function look(from, to) {
  const dx = to.x - from.x; const dy = to.y - from.y; const dz = to.z - from.z;
  return { yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) };
}

// The overlay: chat lines drawn from the capture (the server's own text and
// colour codes, at the moments they arrived), over the rendered world, with
// a tag saying it is a recreation. Nothing else is drawn over the world.
// Sized for the home page's desktop panel, which shows the 960x600 view about
// 286 px wide (0.3x): 44 px chat is drawn there at about 13 px, the tag at
// about 8 px.
const OVERLAY_CSS = `
  #pv-overlay { position: fixed; inset: 0; pointer-events: none; font-family: 'VT323', monospace; color: #fff; }
  #pv-tag { position: absolute; top: 10px; right: 10px; padding: 5px 11px; border-radius: 6px;
    font: 600 27px/1.2 system-ui, sans-serif; color: #e8efe6; background: rgba(0, 0, 0, 0.55); }
  #pv-chat { position: absolute; left: 10px; bottom: 12px; max-width: 80%; display: flex; flex-direction: column; }
  #pv-chat .line { font-size: 44px; line-height: 46px; padding: 0 9px; background: rgba(0, 0, 0, 0.5);
    white-space: pre; transition: opacity 0.4s; }
`;

function overlayScript() {
  const CODES = {
    0: '#000000', 1: '#0000AA', 2: '#00AA00', 3: '#00AAAA', 4: '#AA0000', 5: '#AA00AA', 6: '#FFAA00', 7: '#AAAAAA',
    8: '#555555', 9: '#5555FF', a: '#55FF55', b: '#55FFFF', c: '#FF5555', d: '#FF55FF', e: '#FFFF55', f: '#FFFFFF',
  };
  const shadow = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    const q = (v) => Math.floor(v / 4).toString(16).padStart(2, '0');
    return `#${q(n >> 16 & 255)}${q(n >> 8 & 255)}${q(n & 255)}`;
  };
  // One line of legacy-formatted text (mineflayer's toMotd()) to DOM nodes.
  const render = (motd) => {
    const frag = document.createDocumentFragment();
    let color = '#FFFFFF'; let bold = false; let buf = '';
    const flush = () => {
      if (!buf) return;
      const span = document.createElement('span');
      span.textContent = buf; span.style.color = color; span.style.textShadow = `2px 2px 0 ${shadow(color)}`;
      if (bold) span.style.fontWeight = '600';
      frag.appendChild(span); buf = '';
    };
    for (let i = 0; i < motd.length; i++) {
      if (motd[i] !== '§' || i + 1 >= motd.length) { buf += motd[i]; continue; }
      flush();
      const c = motd[i + 1].toLowerCase();
      if (c === '#') { color = '#' + motd.slice(i + 2, i + 8).toUpperCase(); bold = false; i += 7; continue; }
      if (CODES[c]) { color = CODES[c]; bold = false; } else if (c === 'l') bold = true; else if (c === 'r') { color = '#FFFFFF'; bold = false; }
      i += 1;
    }
    flush();
    return frag;
  };
  window.__overlay = ({ tag, lines, keep, fade }) => {
    const style = document.createElement('style');
    style.textContent = window.__overlayCss;
    document.head.appendChild(style);
    const root = document.createElement('div'); root.id = 'pv-overlay';
    const t = document.createElement('div'); t.id = 'pv-tag'; t.textContent = tag;
    const chat = document.createElement('div'); chat.id = 'pv-chat';
    root.append(t, chat); document.body.appendChild(root);
    const nodes = lines.map((l) => {
      const div = document.createElement('div'); div.className = 'line';
      div.appendChild(render(l.motd)); return { ...l, div };
    });
    // The lines that had arrived by time t, the newest `keep`, each fading
    // `fade` seconds after it arrived (as the game's chat does when closed).
    window.__overlayAt = (now) => {
      const shown = nodes.filter((n) => n.t <= now && now - n.t < fade).slice(-keep);
      chat.replaceChildren(...shown.map((n) => n.div));
    };
  };
}

// Puts the overlay on the page: `lines` are capture events ({ t, motd }).
async function installOverlay(page, { tag, lines, keep = 4, fade = 6 }) {
  await page.addStyleTag({ url: 'https://fonts.googleapis.com/css2?family=VT323&display=block' }).catch(() => {});
  await page.evaluate((css) => { window.__overlayCss = css; }, OVERLAY_CSS);
  await page.evaluate(overlayScript);
  await page.evaluate((o) => window.__overlay(o), { tag, lines, keep, fade });
  await page.evaluate(() => document.fonts.ready);
}

const overlayAt = (page, t) => page.evaluate((now) => window.__overlayAt && window.__overlayAt(now), t);

// Draws the signs a scene noted (world/recorder.js): prismarine-viewer draws
// none. Each is a standing sign at its block, turned to its rotation, with
// its front text as the server holds it, in black on oak, as the game draws
// it: post 2/16 wide and 14/16 high, board 24/16 by 12/16 by 2/16 on top.
async function drawSigns(page, signs) {
  if (!signs || !signs.length) return;
  await page.evaluate((list) => {
    const T = window.THREE;
    const { scene } = window.__pv;
    const OAK = '#B8945F';
    for (const sign of list) {
      const canvas = document.createElement('canvas');
      canvas.width = 384; canvas.height = 192;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = OAK; ctx.fillRect(0, 0, 384, 192);
      // plank grain, as on the sign texture
      ctx.fillStyle = 'rgba(80, 55, 25, 0.25)';
      for (const y of [46, 94, 142]) ctx.fillRect(0, y, 384, 3);
      ctx.fillStyle = '#000';
      ctx.font = 'bold 34px monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      sign.lines.slice(0, 4).forEach((line, i) => ctx.fillText(line, 192, 30 + i * 44));
      const tex = new T.CanvasTexture(canvas);
      tex.magFilter = T.NearestFilter;
      const wood = new T.MeshBasicMaterial({ color: 0x9c7a49 });
      const face = new T.MeshBasicMaterial({ map: tex });
      const group = new T.Group();
      const post = new T.Mesh(new T.BoxGeometry(2 / 16, 14 / 16, 2 / 16), wood);
      post.position.y = 7 / 16;
      // BoxGeometry faces: +x, -x, +y, -y, +z (front), -z
      const board = new T.Mesh(new T.BoxGeometry(24 / 16, 12 / 16, 2 / 16), [wood, wood, wood, wood, face, wood]);
      board.position.y = 14 / 16 + 6 / 16 - 2 / 16;
      group.add(post, board);
      group.position.set(sign.pos.x + 0.5, sign.pos.y, sign.pos.z + 0.5);
      // rotation 0 faces south (+Z) and each step turns 22.5° clockwise
      // seen from above (4 west, 8 north, 12 east)
      group.rotation.y = -Number(sign.rotation || 0) * Math.PI / 8;
      scene.add(group);
    }
  }, signs);
}

module.exports = { cameraHook, meshCount, setShot, look, installOverlay, overlayAt, drawSigns };
