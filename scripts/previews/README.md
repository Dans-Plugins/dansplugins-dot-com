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
| `dans-plugin-manager` | chat | an operator's `/dpm search faction`, `/dpm info herald` (read-only: `/dpm get` would add to GitHub's download count, which the site shows) |
| `democracy` | chat | Southmarch's leader: `/d start`, `/d vote Elspeth`, `/d info` (Garrick and Elspeth stand and vote off-screen) |
| `medieval-roleplay-engine` | chat | `/card name`, `/me`, `/roll 1d20+5`, `/yell` |
| `fiefs` | chat | `/fi create "Ironbrook"`, `/fi claim`, `/fi list`, `/fi info Ironbrook` inside Southmarch |
| `mailboxes` | chat | a message arrives (sent off-screen by Rowena), `/m list`, `/m open <id>` |
| `simple-skills` | chat | digging with a shovel teaches the Digging skill and levels it up; `/ss info` |
| `activity-tracker` | chat | `/at info`, `/at top 5` (records start at the plugin's install on the test server) |
| `dans-essentials` | chat | an operator's `/de getpos`, `/de label "Oathkeeper"`, `/de broadcast` |
| `dans-set-home` | chat | `/sethome`, then `/home` after being moved away |
| `easy-links` | chat | an operator's `/el create "discord" "..."`, `/el list`, `/el view "discord"` (the plugin ships with no links) |
| `medieval-economy` | chat | a new player's `/balance`, `/deposit 10`, `/balance`, `/withdraw 4` |
| `nether-access-controller` | chat | an operator's `/nac list`, `/nac allow Quill`, `/nac list` (Quill's portal-lighting is refused until then) |
| `kdr-tracker` | chat | Bram defeats Cole; the kill is counted and `/kdrt info` shows it |
| `wild-pets` | world | a sheep summoned beside the player is tamed (`/wp tame`, a right-click with 8 wheat), named and told to follow; the player walks off and, as they cross into the next chunk, the sheep is teleported to their side (how Wild Pets 1.10.0 makes a pet follow) |
| `dans-spawn-system` | world | an operator's `[Spawn]` sign (placed through RCON) names a spawn point on a stone platform; a right-click on it replies "Spawn set!" and takes the player there; they walk off, are killed (`/kill` through RCON) and respawn on the platform ("Teleporting to custom spawn!") |
| `mini-factions` | chat | `/mf create Thornwall`, `/mf claim`, `/mf checkclaim`, `/mf info` (captured on a second server, see below) |

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
- `world/` (world clips, below): `recorder.js` (the spectator camera player),
  `replay.js` (serves prismarine-viewer's page and replays a scene into it),
  `page.js` (the scripted camera, the chat overlay and the sign drawing).
- `mutf8.js`: decodes Java's modified UTF-8, which the server uses for chat
  strings (they are NBT since 1.20.3); `capture.js` installs it. Without it,
  an emoji arrived as U+FFFD: Mailboxes' `📎` legend was captured as six
  replacement characters in the first take. `npm test` fails on any capture
  holding U+FFFD.

## World clips

A world clip shows the plugin in the game world, in 3D, rendered by
prismarine-viewer 1.33.0 (mineflayer's in-browser viewer) from the test
server's real state. It is made in two steps:

1. **`capture.js <id>`** runs the scene on the server, as for a chat clip,
   and also joins a spectator **camera player** (`h.camera`). Everything that
   player's client is sent about the world (chunk columns, block changes,
   every entity spawning, moving and leaving) is recorded through
   prismarine-viewer's own `WorldView`, the stream its browser page draws
   from, to `$PREVIEW_WORK/scenes/<id>.json` (~5 MB of chunks: not kept in
   the repo). The player's chat goes to `captures/<id>.json` as usual, on the
   same clock. Spectators are invisible to players and mobs and never drawn.
2. **`record.js <id>`** serves prismarine-viewer's prebuilt page with a
   socket that replays the scene (`world/replay.js`) and renders it **a frame
   at a time** (20 fps of capture time): the scene is advanced 1/20 s, the
   camera is placed, the frame is drawn and kept. No frame is dropped or late,
   and nothing is sped up or slowed down. The world is the server's own:
   nothing is added to the stream.

**The camera** is the clip's, not the bot's. `world/page.js` wraps the page's
`THREE.WebGLRenderer` as the page creates it, and before each frame is drawn
puts the camera where `window.__shot` says (eye `x y z`, `yaw` and `pitch` in
Minecraft's convention, `fov`); the page's orbit and first-person controls
never get a say (the replay sends no position events). A clip's
`shot(t, scene)` returns that shot for each moment; `scene` (from
`replay.js inspect`) gives any entity's position at any time from the same
recorded events (`player(name)`, `nearest(name, pos, t)`, `at`, `smooth`),
plus the capture's marks and chat lines (`mark`, `line`), so a camera can
track a player smoothly or ease between two framings. `start(s)`/`end(s)`
give the part to render, in capture time.

**Overlays.** A clip may draw chat lines over the world (`overlay`: which
lines, how many at once, how long each stays). They are the capture's own
lines with their colour codes, at the moments they arrived, and the clip says
"Recreated chat · real server output" in its corner, as the chat clips do.

**Signs.** prismarine-viewer draws no signs (their block model is empty and
it has no block-entity renderer), so a sign a clip needs is noted during the
capture (`h.sign(pos)`): its block, rotation and front text as the camera
player's client holds them, from the server's block entity data. `record.js`
draws it in the page at that block (`page.js drawSigns`): a post and board in
oak with the text in black. It is the only thing drawn into the world, and
the clip's caption and alt text say so.

**What the viewer does not draw:** limbs (players and mobs glide without
walking), held items, particles (no taming hearts), name tags beyond the
player's name, death animations (a killed player just vanishes), lighting
(it is always day), and signs (above). Clips are planned around that.

**Set dressing.** World clips level a strip of meadow near (-150, 40) and
clear grass and flowers around it (`fill` through RCON) before filming: tall
grass is what video compresses worst, and the players stand out. Spawn
System's spawn point is a 3×3 stone-brick platform with two lanterns. Earlier
takes' pets are moved out of the way (Wild Pets keeps pets from harm, so
`/kill` does not remove them).

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
- For the rollout clips, also the latest stable releases of Dan's Plugin
  Manager 0.6.0, Democracy 0.3.0, Medieval Roleplay Engine 1.15.1, Fiefs
  0.12.1, Mailboxes 1.4.0, SimpleSkills 2.6.0, Activity Tracker 1.5.0, Dan's
  Essentials 2.5.0, Dan's Set Home 1.4.0, Easy Links 0.5.0, Medieval Economy
  2.0.0, Nether Access Controller 2.1.0, KDR Tracker 0.2.0 and Wild Pets
  1.10.0, all on the same server. Each logs "Usage reporting is off
  (environment)" with the variables above (DPM 0.6.0 has no usage reporting).
  - **SimpleSkills is unloaded for every other capture** (move its jar out and
    restart): it announces skills learned from almost anything (fighting,
    lighting portals, falling), which would put its lines in other plugins'
    clips. It is put back for its own capture.
  - **MiniFactions** uses `/mf`, like Medieval Factions, so it is captured on a
    second server (a copy with `server-port=25568`, `rcon.port=25578`) running
    it without Medieval Factions, Currencies or Bluemap_MedievalFactions:
    `MC_PORT=25568 RCON_PORT=25578 node scripts/previews/capture.js mini-factions`.
  - Clips use fresh player names where state matters (a player who has
    already set a home, learned a skill or been allowed into the nether would
    not show the first-time replies); setup through RCON (`give`, `clear`, `op`,
    `summon`, `fill`, `spreadplayers`) is described at the top of each clip.

## Re-record a clip

```sh
npm i --no-save playwright mineflayer && npx playwright install chromium   # once (or NODE_PATH to existing installs)
npm i --no-save prismarine-viewer@1.33.0          # world clips only (never a site dependency)
# ffmpeg 6+ with libvpx-vp9 and libx264 on PATH (or FFMPEG=/path/to/ffmpeg)
export RCON_PASSWORD=...                           # the test server's rcon.password
node scripts/previews/capture.js medieval-factions # chat clips: capture first
node scripts/previews/record.js medieval-factions  # record + encode
node scripts/previews/record.js --encode currencies   # re-encode the last take
node scripts/previews/capture.js wild-pets         # world clips: capture (films the scene too)
node scripts/previews/record.js wild-pets          # render a frame at a time + encode (~2 min)
npm test                                           # names, sizes, labels
```

Notes from the committed takes:

- **Medieval Factions** picks a random colour for a new faction. The capture
  disbands the previous take's faction first, and a take was redone until the
  colour stood apart from the wilderness green and the neighbours on the map
  (the ninth take, `#AD27AF`).
- **Mailboxes**: the capture first deletes Rowena's messages from earlier
  takes (off the record), so the list shows the new one. It was re-captured
  on 2026-10-04 with modified-UTF-8 decoding, so the list's legend shows
  `📎: has attachments` as the plugin sends it (drawn by the browser's
  emoji font).
- **Wild Pets** and **Dan's Spawn System** use fresh player names per take
  (Wild Pets keeps each player's pets; Spawn System each player's spawn).
- **Currencies** is captured as Rowena, Southmarch's founder; the capture gives
  her gold nuggets to hold first (the currency's item, and the cost of minting).
  A retake needs a new currency name, or a fresh server.
- **BlueMap Medieval Factions**: the claims were made before recording, and
  `setup-world.js` ends with `bluemap reload`: Bluemap_MedievalFactions 1.0.0
  draws a faction's claims as they stood before its newest claim (it reads them
  when Medieval Factions announces the claim, before the claim is saved), so
  claims appearing live on the map would lag one behind.

## Plugins without a clip

- **Alternate Account Finder**: every test player connects from 127.0.0.1, so
  it would report all of them as each other's alternate accounts: real
  output, but contrived.
- **Conquest Recipes**, **More Recipes**: their value is crafting recipes,
  shown in the crafting screen, which neither the chat panel nor
  prismarine-viewer can show.
- **Food Spoilage**: food turning to rotten flesh over time happens in the
  inventory, with nothing in chat.
- **No More Creepers**: an absence of creepers; nothing to show.
- **Player Lore**: lore shows in an item's tooltip, which nothing here draws;
  in chat it is a one-line confirmation.

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
- A first try for **Wild Pets** used the stock mineflayer viewer: its
  third-person camera is a fixed aerial view in which the player and a fox
  are specks among trees, and its first-person camera did not follow the
  player's look (with physics off, mineflayer emits no `move` event for a
  look). The world clips replace that viewer's camera altogether (above).
  Foxes also flee from a player who is not sneaking, so the clip tames a
  sheep; the capture retries the 50% taming roll until it succeeds (up to 10
  times, 8 wheat each, given only when the last 8 are gone) and the clip
  starts just before the try that worked.
