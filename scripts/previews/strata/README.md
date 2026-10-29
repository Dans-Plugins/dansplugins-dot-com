# World renders (Strata)

The world renders on plugin pages (`PLUGIN_WORLD_RENDERS` in
`utils/pluginTrailers.ts`, files in `public/renders/`) are drawn from example
data with Strata, not recorded from a server. A plugin's renders show in list
order under its clip.

| Render | What it shows | Made with |
| --- | --- | --- |
| `medieval-factions-claims` | Three example factions' claims (Northwatch, Saltmarsh, Fernhollow) tinted and outlined over a fresh vanilla 26.3 world (seed 8675309), the sun moving from sunrise to sunset on 21 June 2026 at 40° N, 105° W | [Minecraft-USD-Exporter](https://github.com/Dans-Plugins/Minecraft-USD-Exporter) `e6fe5f3` exports the world and `examples/claims-showcase.json`; its `scripts/render_strata_preview.py --sequence 72 --size 1280 720` renders it headless with [Strata](https://github.com/Preponderous-Software/strata) 0.6.0 (`libstrata-0.6.0-linux-x64.so`, SHA-256 `3815068f…af2a`) on Mesa llvmpipe |
| `medieval-factions-archipelago` | Eight example factions as islands, each sized by its member count (area grows with members): arched bridges for alliances, rival fleets across a red line of buoys for wars, and smaller islets chained to their lieges for vassals, with the camera circling once | `archipelago.py` here renders `archipelago-demo.json` headless with [Strata](https://github.com/Preponderous-Software/strata) 0.6.0 (the same release library and SHA-256 as above) on Mesa llvmpipe |

The factions and claims are example data, so no real server's factions,
players or builds appear.

## Reproducing `medieval-factions-claims`

1. Make the exporter's showcase export, as its README's "Preview image" section
   says: a throwaway vanilla 26.3 world with seed `8675309`, then
   `mc-usd-export <world> --bbox -128 44 -128 31 120 31 --claims examples/claims-showcase.json --out out/`.
2. Install what the exporter's Strata preview needs (see its README: usd-web at
   `03f1cd5`, `strata-engine` at the `v0.6.0` tag, Pillow), plus
   `imageio-ffmpeg` for a static ffmpeg.
3. Render the frames. `mue_frames.py` runs the exporter's own
   `render_strata_preview.py` unchanged, but saves its `--sequence` frames as
   PNGs instead of a palette GIF:

   ```bash
   export LIBGL_ALWAYS_SOFTWARE=1 GALLIUM_DRIVER=llvmpipe   # without a GPU
   python mue_frames.py /path/to/Minecraft-USD-Exporter frames/ -- out/world.usda day.gif \
     --sequence 72 --size 1280 720 \
     --caption "Example factions over a vanilla 26.3 world. Rendered headless by Strata 0.6.0 via Minecraft-USD-Exporter"
   ```

4. Encode at 12 frames a second to 960 × 540 (VP9 WebM, H.264 MP4 with
   faststart, each under 300 KB) and take frame 36 (around noon) as the poster:

   ```bash
   FFMPEG=$(python -c "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())") \
     ./encode.sh frames 12 960 540 36 ../../../public/renders/medieval-factions-claims
   ```

The dawn and dusk frames are close in colour, so the six-second loop has no
visible jump.

## Reproducing `medieval-factions-archipelago`

The world is `archipelago-demo.json`: made-up factions, each in the shape
Medieval Factions posts to `POST /api/v1/factions` (`name`, `serverId`,
`memberCount`, `description`). `memberCount` sets each island's size. The API
carries no alliances, wars or vassals, and the site shows none, so the
`relations` block is invented for the demo; nothing in the render comes from
a real server.

1. Install Strata's Python binding at the `v0.6.0` tag, plus Pillow and
   `imageio-ffmpeg`:

   ```bash
   pip install "git+https://github.com/Preponderous-Software/strata.git@v0.6.0#subdirectory=bindings/python" pillow imageio-ffmpeg
   ```

2. Download `libstrata-0.6.0-linux-x64.so` from the v0.6.0 release. The script
   refuses any file whose SHA-256 is not `3815068f…af2a`.
3. Render the 72 frames of one orbit (about 20 s on llvmpipe) and encode them
   as above, with frame 18 (the fleets meeting) as the poster:

   ```bash
   export LIBGL_ALWAYS_SOFTWARE=1 GALLIUM_DRIVER=llvmpipe   # without a GPU
   python archipelago.py archipelago-demo.json frames/ --library libstrata-0.6.0-linux-x64.so
   FFMPEG=$(python -c "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())") \
     ./encode.sh frames 12 960 540 18 ../../../public/renders/medieval-factions-archipelago
   ```

The camera goes round once and the fleets sail out and back twice, so the
six-second loop has no visible jump.
