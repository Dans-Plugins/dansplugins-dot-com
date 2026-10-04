# Plugin preview clips

The short clips on plugin pages and in the home page's desktop panels
(`utils/pluginTrailers.ts`, files in `public/trailers/`) are made here. They
are modelled on danielstephenson.dev's game trailers (`scripts/trailers/`
there), and `record.js` is that recorder adapted, encoder included.

| Clip | Kind | What it shows |
| --- | --- | --- |
| `medieval-factions` | chat | `/mf create Oakvale`, `/mf claim`, `/mf map` (the map shows the new claim among the neighbours' territory) |
| `currencies` | chat | `/currency create Ducat` (and its rename prompt), `--rename`, `mint Ducat 3`, `info Ducat` |
| `bluemap-medieval-factions` | map | BlueMap's web map with three factions' claims drawn by the plugin; zooms in on one and clicks it for its label |

## Files

- `capture.js` (chat clips): connects a mineflayer bot to a **local** test
  server, runs the clip's commands as that player, and saves every chat and
  action-bar line the server sends back, with its colour codes and arrival
  time, to `captures/<id>.json`. That file is the clip's source and is kept in
  the repo.
- `panel/chat-panel.html`: draws a capture as a Minecraft-style chat panel and
  replays it on the capture's own clock. It is a **recreation** of the chat
  window and says so in its corner ("Recreated chat panel · real server
  output"). It draws only what the capture holds; the one thing it adds is
  each command being typed into the input bar in the moments before it was
  sent (the bot sent it in one go). The `⬛`/`⬜` squares of `/mf map` are drawn
  as boxes in the line's colour, as the game's font draws them (a web font
  would draw colour-ignoring emoji).
- `record.js`: records a clip in headless Chromium and encodes
  `public/trailers/<id>.webm` (VP9), `.mp4` (H.264) and `.jpg` (the still).
  A chat clip records the panel; a map clip records the live page.
- `clips/<id>.js`: one clip: kind, aspect, still time, alt text, and either
  its `capture(h)` script (chat) or its `play(h)` script (map).
- `setup-world.js`: builds the world the clips expect on a fresh server (see
  below) and keeps its bots online for BlueMap's player markers.

## Rules

- **Local servers only.** The scripts refuse any host but localhost. Never
  point them at KFE, Oak Hollow, Viridian Gulf or any real server.
- **No usage figures.** Turn trace and bStats off before the server first
  boots plugins (below), so recordings are never counted as real use.
- **Real output only.** Chat text comes from the capture file, never typed by
  hand. Each chat clip is labelled a recreation in the clip, in its caption on
  the site and in its alt text (`__tests__/pluginTrailers.test.tsx` checks the
  last two).
- **No speed-ups** unless stated where the clip is published. The BlueMap clip
  is rendered a frame at a time (software WebGL draws BlueMap at ~3 fps): the
  camera move is scripted and eased, every frame is the real page, and nothing
  on the map moves meanwhile.
- **Small and legible.** 6–10 s; WebM under ~400 KB, MP4 under ~600 KB, still
  under 120 KB. Look at the contact sheet (`$PREVIEW_WORK/<id>/sheet.png`) and
  at the clip about 360 px wide before committing. Re-record a weak clip once;
  drop it if it is still poor.

## The test server

What the committed clips were recorded on (2026-10-04):

- Spigot 1.21.1 (`java -jar spigot-1.21.1.jar nogui` with Java 21), offline
  mode, peaceful, `server-port=25567`, `enable-rcon=true`, `rcon.port=25577`,
  `spawn-protection=0`, `level-type=minecraft:normal`, `level-seed=8675309`.
  In `spigot.yml`, `timeout-time: 900` and `restart-on-crash: false` (Medieval
  Factions saves on the server thread when a bot quits; see the mfbot notes).
- Plugins, the latest stable releases: Medieval Factions 7.0.0, Currencies
  3.0.0, Bluemap_MedievalFactions 1.0.0 (`MF_Bluemap-1.0.0.jar`), and BlueMap
  **5.16**, the newest BlueMap built for Java 21 (5.17 and later need Java 25).
- Before the first boot with plugins:
  - `plugins/trace/config.yml`: `enabled: false`, and start the server with
    `TRACE_USAGE_REPORTING=false DO_NOT_TRACK=1` (the log then says "Usage
    reporting is off (environment)"); also `usage-reporting.enabled: false`
    in `plugins/MedievalFactions/config.yml` and `plugins/Currencies/config.yml`
    once they exist.
  - `plugins/bStats/config.yml`: `enabled: false`;
    `plugins/PluginMetrics/config.yml`: `opt-out: true`.
- BlueMap, after its first start (`plugins/BlueMap/`): `accept-download: true`
  and `metrics: false` in `core.conf`, `port: 8199` in `webserver.conf`; in
  `maps/` keep only the overworld map (`preview.conf`, `name: "Overworld"`,
  `start-pos: { x: 16, z: 80 }`). Generate terrain around spawn
  (`forceload add -192 -112 223 207` in parts of at most 256 chunks, wait,
  `forceload remove all`, `save-all flush`), then `bluemap force-update preview`.
- `node scripts/previews/setup-world.js` (with `RCON_PASSWORD`), left running.

## Re-record a clip

```sh
npm i --no-save playwright mineflayer && npx playwright install chromium   # once (or NODE_PATH to existing installs)
# ffmpeg 6+ with libvpx-vp9 and libx264 on PATH (or FFMPEG=/path/to/ffmpeg)
export RCON_PASSWORD=...                           # the test server's rcon.password
node scripts/previews/capture.js medieval-factions # chat clips: capture first
node scripts/previews/record.js medieval-factions  # record + encode
node scripts/previews/record.js --encode currencies   # re-encode the last take
npm test                                           # names, sizes, labels
```

Notes from the committed takes:

- **Medieval Factions** picks a random colour for a new faction. The capture
  disbands the previous take's faction first, and a take was redone until the
  colour stood apart from the wilderness green and the neighbours on the map
  (the ninth take, `#AD27AF`).
- **Currencies** is captured as Rowena, Southmarch's founder; the capture gives
  her gold nuggets to hold first (the currency's item, and the cost of minting).
  A retake needs a new currency name, or a fresh server.
- **BlueMap Medieval Factions**: the claims were made before recording, and
  `setup-world.js` ends with `bluemap reload`: Bluemap_MedievalFactions 1.0.0
  draws a faction's claims as they stood before its newest claim (it reads them
  when Medieval Factions announces the claim, before the claim is saved), so
  claims appearing live on the map would lag one behind.

## Methods tried

- **prismarine-viewer** (mineflayer's in-browser 3D view of what a bot sees) was
  tried for Medieval Factions. 1.33.0 renders 1.21.1 correctly in headless
  Chromium with software WebGL (it supports 1.8.8 to 1.21.1 and 1.21.4; any
  other 1.21.x is drawn with 1.21.4 assets; 26.x not at all). It needs
  `canvas` installed by hand, and `bot.physicsEnabled = false` to stand still.
  It draws no chat, action bar or name tags, and Medieval Factions' claims are
  not visible in the world, so a 3D clip of MF shows a player in a forest. The
  chat clip with `/mf map` shows the claim; the 3D view suits plugins with an
  in-world visual instead.
