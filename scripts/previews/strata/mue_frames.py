"""Run Minecraft-USD-Exporter's own scripts/render_strata_preview.py unchanged, but
capture its --sequence frames as lossless PNGs instead of a palette GIF, so they can
be encoded to WebM/MP4. Usage: mue_frames.py MUE_CHECKOUT FRAME_DIR -- <script args>"""
import sys, importlib.util
from pathlib import Path
mue, frame_dir = Path(sys.argv[1]), Path(sys.argv[2])
argv = sys.argv[sys.argv.index("--") + 1:]
spec = importlib.util.spec_from_file_location("rsp", mue / "scripts" / "render_strata_preview.py")
rsp = importlib.util.module_from_spec(spec); sys.modules["rsp"] = rsp; spec.loader.exec_module(rsp)
def dump(images, out, width, ms, swatches=()):
    frame_dir.mkdir(parents=True, exist_ok=True)
    for i, im in enumerate(images):
        im.convert("RGB").save(frame_dir / f"f{i:04d}.png")
rsp.write_gif = dump
sys.exit(rsp.main(argv))
