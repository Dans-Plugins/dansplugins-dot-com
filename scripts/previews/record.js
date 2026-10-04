#!/usr/bin/env node
// Records a plugin's preview clip and encodes it into
// public/trailers/<id>.{webm,mp4,jpg}. See scripts/previews/README.md.
// Adapted from danielstephenson.dev's scripts/trailers/record.js (same
// encoder, including trimming before the fades).
//
//   node scripts/previews/record.js <id> [<id> ...]   record + encode
//   node scripts/previews/record.js --encode <id>     re-encode the last recording
//   node scripts/previews/record.js --list            list the clips it knows
//
// Two kinds of clip (clips/<id>.js):
//   chat  plays captures/<id>.json (made by capture.js from a real server) in
//         panel/chat-panel.html, a recreated chat window, and records that;
//   map   records a live web page, e.g. BlueMap served by the local test server.
//
// Honesty rules: every line of chat is the server's captured output and every
// map frame is the real page; `speed` (> 1) speeds a clip up and must be
// stated where the clip is published; nothing else is edited except crop,
// scale, trim and a short fade at each end so the loop does not jump.
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium, devices } = require('playwright');
const CLIPS = require('./clips');
const PANEL = path.join(__dirname, 'panel', 'chat-panel.html');
const CAPTURES = path.join(__dirname, 'captures');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'public', 'trailers');
const WORK = process.env.PREVIEW_WORK || path.join(os.tmpdir(), 'preview-work');
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 dpc-preview-monitor';
// Nothing a recorded page might send to trace (usage) leaves the browser.
const BLOCKED = /^https?:\/\/trace\.danielstephenson\.dev(\/|$)/;
// Output sizes by aspect. Budgets: WebM < ~400 KB, MP4 < ~600 KB.
const SIZES = { '1:1': [480, 480], '16:10': [640, 400] };
const FPS = 20;
const MAX_SECONDS = 10;
const BUDGET = { webm: 400 * 1024, mp4: 600 * 1024 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------------------ record

// A chat clip: the recreated panel, fed the capture, replayed on its clock.
async function playChat(id, h) {
  const file = path.join(CAPTURES, `${id}.json`);
  if (!fs.existsSync(file)) throw new Error(`${id}: no capture at ${file} (run capture.js ${id} first)`);
  const capture = JSON.parse(fs.readFileSync(file, 'utf8'));
  await h.page.addInitScript((c) => { window.CAPTURE = c; }, capture);
  await h.page.goto('file://' + PANEL);
  await h.page.evaluate(() => document.fonts.ready);
  await h.sleep(600);
  await h.start();
  h.mark('in');
  await h.page.evaluate(() => window.playClip());
  h.mark('out');
}


async function record(id, clip) {
  const dir = path.join(WORK, id);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(path.join(dir, 'frames'), { recursive: true });
  // A brand-new profile for every recording: no saves of anyone's are read,
  // and the profile is thrown away afterwards.
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), `preview-profile-${id}-`));
  const base = clip.device ? { ...devices[clip.device] } : {};
  delete base.defaultBrowserType;
  const viewport = clip.viewport || base.viewport || (clip.kind === 'chat' ? { width: 640, height: 400 } : { width: 960, height: 600 });
  const dsf = clip.dsf || base.deviceScaleFactor || 2;
  const ctx = await chromium.launchPersistentContext(profile, {
    ...base,
    viewport,
    deviceScaleFactor: dsf,
    userAgent: (base.userAgent || UA.replace(/ dpc-preview-monitor$/, '')) + ' dpc-preview-monitor',
    args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  await ctx.route(BLOCKED, (route) => route.abort());
  const page = ctx.pages()[0] || await ctx.newPage();
  page.on('pageerror', (e) => console.log(`[${id}] pageerror: ${String(e).slice(0, 200)}`));
  const cdp = await ctx.newCDPSession(page);
  const frames = [];
  let recording = false;
  let t0 = 0;
  let tEnd = 0;
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    if (recording) frames.push({ t: metadata.timestamp, data });
  });
  const marks = {};
  const mode = clip.capture || 'shots';
  let shooting = null;
  // 'stepped' mode keeps its own clock: one frame per h.frame() call, each
  // lasting the time it is given, for a page too slow to record in real time
  // (BlueMap under software WebGL draws ~3 fps). The clip moves the camera a
  // step, waits for the page to draw it, and takes the frame.
  let vt = 0;
  const now = () => (mode === 'stepped' ? vt : Date.now() / 1000);
  const area = clip.crop ? { x: clip.crop[0], y: clip.crop[1], width: clip.crop[2], height: clip.crop[3] } : undefined;
  const h = {
    page, ctx, sleep, viewport, dsf,
    touch: Boolean(base.hasTouch),
    // Starts keeping frames: call it once the clip is loaded and ready.
    async start() {
      recording = true;
      t0 = now();
      if (mode === 'stepped') return;
      if (mode === 'screencast') {
        // Fast and smooth, but at 1 CSS px per pixel (Chromium ignores the
        // device scale factor here): for canvas pages.
        await cdp.send('Page.startScreencast', {
          format: 'jpeg', quality: 92,
          maxWidth: viewport.width, maxHeight: viewport.height, everyNthFrame: 1,
        });
        await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));
      } else {
        // Sharp (device pixels) but slower: a screenshot loop, for text.
        shooting = (async () => {
          while (recording) {
            try {
              const buf = await page.screenshot({ type: 'jpeg', quality: 92, clip: area, animations: 'allow', caret: 'initial' });
              frames.push({ t: Date.now() / 1000, data: buf.toString('base64') });
            } catch (e) { await sleep(20); }
          }
        })();
      }
    },
    // 'stepped' mode: the page as it is now, shown for `seconds` of the clip.
    async frame(seconds = 1 / FPS) {
      if (mode !== 'stepped' || !recording) throw new Error('h.frame() is for stepped clips, after start()');
      const buf = await page.screenshot({ type: 'jpeg', quality: 92, clip: area });
      frames.push({ t: vt, data: buf.toString('base64') });
      vt += seconds;
    },
    async stop() {
      tEnd = now();
      recording = false;
      if (shooting) await shooting;
      await cdp.send('Page.stopScreencast').catch(() => {});
    },
    mark(name) { marks[name] = now() - t0; console.log(`[${id}] mark ${name} @ ${marks[name].toFixed(2)}s`); },
    // Types like a person: one key at a time.
    async type(locator, text, delay = 70) {
      for (const ch of text) { await locator.press(ch === ' ' ? 'Space' : ch); await sleep(delay); }
    },
    async tap(locator) { if (base.hasTouch) await locator.tap(); else await locator.click(); },
    async shot(name) { await page.screenshot({ path: path.join(dir, `${name}.png`) }); },
  };
  try {
    if (clip.kind === 'chat') await playChat(id, h); else await clip.play(h);
    if (recording) await h.stop();
  } catch (e) {
    await page.screenshot({ path: path.join(dir, 'error.png') }).catch(() => {});
    console.log(`[${id}] page text at failure: ${(await page.evaluate(() => document.body.innerText).catch(() => '')).slice(0, 600)}`);
    throw e;
  } finally {
    await ctx.close().catch(() => {});
    fs.rmSync(profile, { recursive: true, force: true });
  }
  if (!frames.length) throw new Error(`${id}: no frames were captured`);
  // The concat list: every frame shown until the next one arrived.
  const first = frames[0].t;
  const lines = [];
  frames.forEach((f, i) => {
    const name = `f${String(i).padStart(5, '0')}.jpg`;
    fs.writeFileSync(path.join(dir, 'frames', name), Buffer.from(f.data, 'base64'));
    const next = i + 1 < frames.length ? frames[i + 1].t : Math.max(tEnd, f.t + 0.05);
    lines.push(`file 'frames/${name}'`, `duration ${Math.max(0.001, next - f.t).toFixed(4)}`);
  });
  lines.push(`file 'frames/f${String(frames.length - 1).padStart(5, '0')}.jpg'`);
  fs.writeFileSync(path.join(dir, 'frames.txt'), lines.join('\n') + '\n');
  // Marks are relative to start(); the first frame may come a little later.
  const offset = first - (t0 || first);
  const rel = Object.fromEntries(Object.entries(marks).map(([k, v]) => [k, v - offset]));
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({ id, mode, viewport, dsf, crop: clip.crop, frames: frames.length, seconds: (tEnd || frames[frames.length - 1].t) - first, marks: rel }, null, 2));
  console.log(`[${id}] ${frames.length} frames, ${((tEnd || first) - first).toFixed(1)}s`);
}

// ------------------------------------------------------------------ encode

function ff(args) {
  execFileSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
}

function encode(id, clip) {
  const dir = path.join(WORK, id);
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
  const aspect = clip.aspect || '1:1';
  const [W, H] = SIZES[aspect];
  const speed = clip.speed || 1;
  // The part of the recording to keep, in seconds of real time.
  const from = clip.from !== undefined ? (typeof clip.from === 'string' ? meta.marks[clip.from] : clip.from) : (meta.marks.in ?? 0);
  const end = clip.to !== undefined ? (typeof clip.to === 'string' ? meta.marks[clip.to] : clip.to) : (meta.marks.out ?? meta.seconds);
  // Loops are 6-10 s: a longer take is cut at 10 s.
  const to = Math.min(end, from + MAX_SECONDS * speed);
  const length = (to - from) / speed;
  if (!(length > 0)) throw new Error(`${id}: empty clip (${from}..${to})`);
  // Trim first and restart the clock, so the fades below are timed from the
  // start of the kept part (an output -ss would trim after the filters, and
  // a late `in` mark would then fade the whole clip to black).
  const filters = [`trim=start=${from.toFixed(3)}:end=${to.toFixed(3)}`, 'setpts=PTS-STARTPTS'];
  // A crop worked out while recording (set on the clip in play()) is kept in
  // meta.json, so a later --encode uses the same one.
  const crop = clip.crop || meta.crop;
  if (crop && meta.mode === 'screencast') {
    // crop in CSS px of the viewport: [x, y, w, h] (a screenshot loop crops as it shoots)
    const [x, y, w, h] = crop.map((v) => Math.round(v));
    filters.push(`crop=${w}:${h}:${x}:${y}`);
  }
  filters.push(`scale=${W}:${H}:force_original_aspect_ratio=increase:flags=lanczos`, `crop=${W}:${H}`);
  if (speed !== 1) filters.push(`setpts=PTS/${speed}`);
  filters.push(`fps=${FPS}`);
  const fade = Math.min(0.3, length / 10);
  filters.push(`fade=t=in:st=0:d=${fade}`, `fade=t=out:st=${(length - fade).toFixed(3)}:d=${fade}`);
  const input = ['-f', 'concat', '-safe', '0', '-i', path.join(dir, 'frames.txt')];
  const vf = ['-vf', filters.join(',')];
  const out = (ext) => path.join(OUT, `${id}.${ext}`);
  fs.mkdirSync(OUT, { recursive: true });
  for (const crf of [36, 40, 44, 48]) {
    ff([...input, ...vf, '-an', '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', String(crf), '-row-mt', '1',
      '-deadline', 'good', '-cpu-used', '2', '-pix_fmt', 'yuv420p', '-g', String(FPS * 4), out('webm')]);
    if (fs.statSync(out('webm')).size <= BUDGET.webm) break;
  }
  for (const crf of [26, 29, 32, 35]) {
    ff([...input, ...vf, '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-profile:v', 'high',
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-g', String(FPS * 4), out('mp4')]);
    if (fs.statSync(out('mp4')).size <= BUDGET.mp4) break;
  }
  // Poster: a still from the clip (default: 60% of the way in).
  const posterAt = clip.poster !== undefined ? clip.poster : length * 0.6;
  ff(['-ss', posterAt.toFixed(3), '-i', out('mp4'), '-frames:v', '1', '-q:v', '4', out('jpg')]);
  // A contact sheet for review (not published).
  const n = 12;
  ff(['-i', out('mp4'), '-vf', `fps=${(n / length).toFixed(4)},scale=${W / 2}:-1,tile=4x3`, '-frames:v', '1', path.join(dir, 'sheet.png')]);
  const sizes = ['webm', 'mp4', 'jpg'].map((e) => `${e} ${(fs.statSync(out(e)).size / 1024).toFixed(0)} KB`).join(', ');
  console.log(`[${id}] ${aspect} ${length.toFixed(1)}s${speed !== 1 ? ` (x${speed})` : ''}: ${sizes}; sheet ${path.join(dir, 'sheet.png')}`);
}

// ------------------------------------------------------------------ main

(async () => {
  const argv = process.argv.slice(2);
  if (argv[0] === '--list') { console.log(Object.keys(CLIPS).join('\n')); return; }
  const encodeOnly = argv[0] === '--encode';
  const ids = encodeOnly ? argv.slice(1) : argv;
  if (!ids.length) { console.error('usage: record.js [--encode] <id> ...'); process.exit(2); }
  let failed = 0;
  for (const id of ids) {
    const clip = CLIPS[id];
    if (!clip) { console.error(`unknown clip ${id}`); failed++; continue; }
    try {
      if (!encodeOnly) await record(id, clip);
      encode(id, clip);
    } catch (e) {
      console.error(`[${id}] FAILED: ${e.stack || e}`);
      failed++;
    }
  }
  process.exit(failed ? 1 : 0);
})();
