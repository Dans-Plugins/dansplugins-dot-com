"""Render the faction archipelago: each faction an island sized by its member count,
alliances as bridges, wars as rival fleets across a red line of buoys, vassals as
islets chained to their liege. Drawn headless with Strata 0.6.0's release library.

Usage:
  archipelago.py WORLD_JSON FRAME_DIR --library libstrata-0.6.0-linux-x64.so
                 [--frames 72] [--size 1280 720]

Writes FRAME_DIR/f0000.png ... one per frame of a full camera orbit (so the last
frame leads back into the first), ready for encode.sh. The library is checked
against the v0.6.0 release's SHA-256 before it is loaded.
"""
import argparse
import ctypes
import hashlib
import json
import math
import random
import sys
from pathlib import Path

import strata
from PIL import Image

STRATA_060_LINUX_SHA256 = "3815068f90afa67b42177359a7ea918a5de321d7f7bad8706fa5275c4906af2a"
SEA_LEVEL = 0.0
SEABED = -3.0


# ------------------------------------------------------------------ colour

def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hex_linear(h):
    h = h.lstrip("#")
    return tuple(srgb_to_linear(int(h[i:i + 2], 16) / 255.0) for i in (0, 2, 4))


def mix(a, b, t):
    return tuple(x + (y - x) * t for x, y in zip(a, b))


def smoothstep(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


SAND = hex_linear("#d9c38f")
GRASS = hex_linear("#5f8f3e")
ROCK = hex_linear("#8a8a80")
SEABED_DEEP = hex_linear("#2b6a80")
SEABED_SHALLOW = hex_linear("#9fd0c0")
WOOD = hex_linear("#7a5233")
STONE = hex_linear("#b8b4a8")
IRON = hex_linear("#3a3a40")
WAR_RED = hex_linear("#e0241b")


# ------------------------------------------------------------------ meshes

def box(center, u, v, w):
    """A box as (positions, normals, indices): centre plus half-axes u, v, w
    (a right-handed basis: u x v points along w). Flat shaded, CCW outside."""
    def add(p, q, s=1.0):
        return tuple(a + s * b for a, b in zip(p, q))

    def neg(p):
        return tuple(-a for a in p)

    def unit(p):
        n = math.sqrt(sum(a * a for a in p)) or 1.0
        return tuple(a / n for a in p)

    faces = [(u, v, w), (neg(u), w, v), (v, w, u), (neg(v), u, w), (w, u, v), (neg(w), v, u)]
    pos, nor, idx = [], [], []
    for n, a, b in faces:
        c = add(center, n)
        base = len(pos) // 3
        for sa, sb in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
            p = add(add(c, a, sa), b, sb)
            pos.extend(p)
            nor.extend(unit(n))
        idx.extend([base, base + 1, base + 2, base, base + 2, base + 3])
    return pos, nor, idx


class MeshBuilder:
    def __init__(self):
        self.pos, self.nor, self.col, self.idx = [], [], [], []

    def add_box(self, center, u, v, w, color):
        p, n, i = box(center, u, v, w)
        base = len(self.pos) // 3
        self.pos.extend(p)
        self.nor.extend(n)
        self.col.extend(list(color) * (len(p) // 3))
        self.idx.extend(base + k for k in i)

    def add_aabb(self, center, half, color):
        self.add_box(center, (half[0], 0, 0), (0, half[1], 0), (0, 0, half[2]), color)

    def upload(self, engine, flags=0, alpha=1.0):
        return engine.add_mesh(self.pos, self.idx, color=(1, 1, 1, alpha), normals=self.nor, colors=self.col, flags=flags)


def model_matrix(direction, position, scale=1.0):
    """Column-major: local +X along `direction` (in the XZ plane), +Y up."""
    dx, dz = direction
    n = math.hypot(dx, dz) or 1.0
    dx, dz = dx / n, dz / n
    s = scale
    return [dx * s, 0, dz * s, 0, 0, s, 0, 0, -dz * s, 0, dx * s, 0, position[0], position[1], position[2], 1]


# ------------------------------------------------------------------ world

def lay_out(world):
    """Place islands: the free factions round a ring (in file order), each vassal
    out to sea beyond its liege. Radius grows with the square root of members,
    so an island's area follows its member count."""
    factions = {f["name"]: f for f in world["factions"]}
    vassal_of = {v["vassal"]: v["liege"] for v in world["relations"]["vassals"]}
    radius = {name: 3.2 + 1.55 * math.sqrt(f["memberCount"]) for name, f in factions.items()}
    free = [n for n in factions if n not in vassal_of]
    centre = {}
    ring = 31.0
    for k, name in enumerate(free):
        a = 2 * math.pi * k / len(free) + 0.35
        centre[name] = (ring * math.cos(a), ring * math.sin(a))
    for name, liege in vassal_of.items():
        lx, lz = centre[liege]
        a = math.atan2(lz, lx) + 0.42
        d = math.hypot(lx, lz) + radius[liege] + radius[name] + 6.5
        centre[name] = (d * math.cos(a), d * math.sin(a))
    colors = {}
    for name in factions:
        own = world["colors"].get(name)
        colors[name] = hex_linear(own) if own else mix(hex_linear(world["colors"][vassal_of[name]]), (1, 1, 1), 0.35)
    return factions, vassal_of, radius, centre, colors


def island_height(x, z, islands):
    """The tallest island's height at (x, z); islands are noisy cones with a
    soft shoulder, sitting on a flat seabed."""
    best, owner = SEABED, None
    for name, (cx, cz, r, peak, phases) in islands.items():
        dx, dz = x - cx, z - cz
        d = math.hypot(dx, dz)
        if d > r * 1.6:
            continue
        a = math.atan2(dz, dx)
        wobble = 1 + 0.12 * math.sin(3 * a + phases[0]) + 0.07 * math.sin(5 * a + phases[1]) + 0.05 * math.sin(8 * a + phases[2])
        t = d / (r * wobble)
        if t >= 1.35:
            continue
        land = peak * (1 - smoothstep(0.0, 1.0, t)) ** 0.8 if t < 1 else 0.0
        h = SEABED + (SEA_LEVEL + 0.6 - SEABED) * (1 - smoothstep(0.85, 1.35, t)) + land
        if h > best:
            best, owner = h, name
    return best, owner


def build_terrain(islands, colors, extent, samples, rng):
    cell = 2 * extent / (samples - 1)
    heights, cols = [], []
    for j in range(samples):
        z = -extent + j * cell
        for i in range(samples):
            x = -extent + i * cell
            h, owner = island_height(x, z, islands)
            h += rng.uniform(-0.06, 0.06)
            heights.append(h)
            if h < SEA_LEVEL - 0.1:
                c = mix(SEABED_DEEP, SEABED_SHALLOW, smoothstep(SEABED, SEA_LEVEL, h))
            elif h < SEA_LEVEL + 0.7:
                c = SAND
            else:
                peak = islands[owner][3]
                up = (h - SEA_LEVEL) / max(peak, 1.0)
                land = mix(GRASS, colors[owner], 0.78)
                c = mix(land, ROCK, smoothstep(0.75, 1.0, up) * 0.5)
            jitter = rng.uniform(0.94, 1.04)
            cols.extend(v * jitter for v in c)
    return heights, cols, cell


def keep(mb, cx, cz, base_y, size, color):
    """A small stone keep in the faction's colour: a tower, four turrets, a roof and a banner."""
    s = size
    mb.add_aabb((cx, base_y + s, cz), (s, s, s), STONE)
    for ox, oz in ((1, 1), (1, -1), (-1, 1), (-1, -1)):
        mb.add_aabb((cx + ox * s, base_y + 1.25 * s, cz + oz * s), (0.32 * s, 1.25 * s, 0.32 * s), STONE)
        mb.add_aabb((cx + ox * s, base_y + 2.65 * s, cz + oz * s), (0.4 * s, 0.15 * s, 0.4 * s), color)
    mb.add_aabb((cx, base_y + 2.15 * s, cz), (0.85 * s, 0.15 * s, 0.85 * s), color)
    mb.add_aabb((cx, base_y + 3.3 * s, cz), (0.06 * s, 1.1 * s, 0.06 * s), WOOD)
    mb.add_aabb((cx + 0.45 * s, base_y + 3.95 * s, cz), (0.4 * s, 0.28 * s, 0.03 * s), color)


def bridge(mb, a, b, ra, rb):
    """An arched timber bridge from shore to shore."""
    (ax, az), (bx, bz) = a, b
    dx, dz = bx - ax, bz - az
    d = math.hypot(dx, dz)
    ux, uz = dx / d, dz / d
    start, end = ra * 0.72, d - rb * 0.72
    n = 22
    for k in range(n):
        t0, t1 = k / n, (k + 1) / n
        s0, s1 = start + (end - start) * t0, start + (end - start) * t1
        y0, y1 = 0.9 + 3.2 * math.sin(math.pi * t0), 0.9 + 3.2 * math.sin(math.pi * t1)
        p0 = (ax + ux * s0, y0, az + uz * s0)
        p1 = (ax + ux * s1, y1, az + uz * s1)
        mid = tuple((p + q) / 2 for p, q in zip(p0, p1))
        seg = tuple((q - p) / 2 for p, q in zip(p0, p1))
        seg_len = math.sqrt(sum(c * c for c in seg))
        up = (-seg[0] * seg[1] / seg_len, (seg[0] ** 2 + seg[2] ** 2) / seg_len, -seg[2] * seg[1] / seg_len)
        up_len = math.sqrt(sum(c * c for c in up))
        v = tuple(c / up_len * 0.18 for c in up)
        w = (-uz * 0.95, 0.0, ux * 0.95)
        # u x v must point along w: flip the side axis if needed.
        cross = (seg[1] * v[2] - seg[2] * v[1], seg[2] * v[0] - seg[0] * v[2], seg[0] * v[1] - seg[1] * v[0])
        if sum(c * q for c, q in zip(cross, w)) < 0:
            w = tuple(-c for c in w)
        mb.add_box(mid, tuple(c * 1.04 for c in seg), v, w, WOOD)
        if k % 3 == 0:
            for side in (-1, 1):
                px, pz = mid[0] + side * w[0] * 1.0, mid[2] + side * w[2] * 1.0
                mb.add_aabb((px, mid[1] + 0.45, pz), (0.09, 0.45, 0.09), WOOD)
        if k in (5, 16):
            mb.add_aabb((mid[0], (mid[1] + SEABED) / 2, mid[2]), (0.35, (mid[1] - SEABED) / 2, 0.35), STONE)


def boat_mesh(color):
    mb = MeshBuilder()
    mb.add_aabb((0, 0.25, 0), (1.5, 0.3, 0.5), WOOD)
    mb.add_aabb((1.65, 0.35, 0), (0.25, 0.22, 0.32), WOOD)
    mb.add_aabb((0.1, 1.6, 0), (0.06, 1.15, 0.06), WOOD)
    mb.add_aabb((0.15, 1.75, 0), (0.05, 0.75, 0.8), color)
    mb.add_aabb((0.1, 2.95, 0.22), (0.02, 0.1, 0.25), WAR_RED)
    return mb


# ------------------------------------------------------------------ main

def check_library(path):
    digest = hashlib.sha256(Path(path).read_bytes()).hexdigest()
    if digest != STRATA_060_LINUX_SHA256:
        sys.exit("%s has SHA-256 %s, not the v0.6.0 release's %s" % (path, digest, STRATA_060_LINUX_SHA256))


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("world")
    ap.add_argument("frames_dir")
    ap.add_argument("--library", required=True)
    ap.add_argument("--frames", type=int, default=72)
    ap.add_argument("--size", type=int, nargs=2, default=(1280, 720))
    args = ap.parse_args(argv)

    check_library(args.library)
    world = json.loads(Path(args.world).read_text())
    factions, vassal_of, radius, centre, colors = lay_out(world)
    rng = random.Random(8675309)

    islands = {}
    for name in factions:
        r = radius[name]
        peak = 1.6 + 0.42 * r
        islands[name] = (centre[name][0], centre[name][1], r, peak, [rng.uniform(0, 6.28) for _ in range(3)])

    width, height = args.size
    out = Path(args.frames_dir)
    out.mkdir(parents=True, exist_ok=True)
    lib = strata.load(args.library)
    with strata.Engine(lib, width, height) as engine:
        print(engine.gpu_description(), file=sys.stderr)
        extent, samples = 62.0, 257
        heights, cols, cell = build_terrain(islands, colors, extent, samples, rng)
        tile = strata.TerrainTile()
        tile.origin = (-extent, 0.0, -extent)
        tile.cell_size = cell
        tile.samples_x = tile.samples_z = samples
        h_arr = (ctypes.c_float * len(heights))(*heights)
        c_arr = (ctypes.c_float * len(cols))(*cols)
        tile.heights = ctypes.cast(h_arr, ctypes.POINTER(ctypes.c_float))
        tile.colors = ctypes.cast(c_arr, ctypes.POINTER(ctypes.c_float))
        tile.color = (1, 1, 1, 1)
        engine.set_terrain(tile)

        # Water: one translucent sheet at sea level.
        big = extent * 12
        engine.add_mesh([-big, SEA_LEVEL, -big, -big, SEA_LEVEL, big, big, SEA_LEVEL, big, big, SEA_LEVEL, -big],
                        [0, 1, 2, 0, 2, 3], color=(*hex_linear("#3f9cc4"), 0.6), normals=[0, 1, 0] * 4,
                        flags=strata.MESH_TRANSLUCENT)
        # Open sea beyond the terrain tile: an opaque floor just under the seabed.
        floor = MeshBuilder()
        floor.add_aabb((0, SEABED - 0.35, 0), (extent * 12, 0.1, extent * 12), SEABED_DEEP)
        floor.upload(engine)

        # Keeps, trees and bridges in one static mesh.
        static = MeshBuilder()
        for name in factions:
            cx, cz, r, peak, _ = islands[name]
            top, _ = island_height(cx, cz, islands)
            keep(static, cx, cz, top - 0.3, 0.55 + 0.11 * r, colors[name])
            for _ in range(int(3 + r * 1.2)):
                a, d = rng.uniform(0, 6.28), rng.uniform(0.3, 0.7) * r
                tx, tz = cx + d * math.cos(a), cz + d * math.sin(a)
                ty, _ = island_height(tx, tz, islands)
                if ty < SEA_LEVEL + 0.9:
                    continue
                static.add_aabb((tx, ty + 0.5, tz), (0.12, 0.5, 0.12), WOOD)
                static.add_aabb((tx, ty + 1.3, tz), (0.55, 0.5, 0.55), hex_linear("#2f6b34"))
        for a, b in world["relations"]["alliances"]:
            bridge(static, centre[a], centre[b], radius[a], radius[b])
        # Vassal chains: iron links sagging from the liege's shore to the islet's.
        for vassal, liege in vassal_of.items():
            (ax, az), (bx, bz) = centre[liege], centre[vassal]
            d = math.hypot(bx - ax, bz - az)
            ux, uz = (bx - ax) / d, (bz - az) / d
            s0, s1 = radius[liege] * 0.85, d - radius[vassal] * 0.8
            links = int((s1 - s0) / 0.75)
            for k in range(links + 1):
                t = k / links
                s = s0 + (s1 - s0) * t
                y = 1.3 - 1.0 * math.sin(math.pi * t)
                half = (0.36, 0.17, 0.17) if k % 2 == 0 else (0.17, 0.36, 0.17)
                static.add_box((ax + ux * s, y, az + uz * s), (ux * half[0], 0, uz * half[0]), (0, half[1], 0),
                               (-uz * half[2], 0, ux * half[2]), IRON)
            for s in (s0, s1):
                static.add_aabb((ax + ux * s, 0.9, az + uz * s), (0.3, 0.9, 0.3), IRON)
        static.upload(engine)

        # Fleets: three boats from each side of every war, closing on the strait and falling back.
        fleets = []
        for a, b in world["relations"]["wars"]:
            (ax, az), (bx, bz) = centre[a], centre[b]
            d = math.hypot(bx - ax, bz - az)
            ux, uz = (bx - ax) / d, (bz - az) / d
            px, pz = -uz, ux
            for side, other, sign in ((a, b, 1), (b, a, -1)):
                mesh = boat_mesh(colors[side])
                ox, oz = centre[side]
                rr = radius[side]
                # The buoy line sits midway between the two shores; stop short of it.
                line = d / 2 + (rr - radius[other]) / 2
                for k, lateral in enumerate((-3.2, 0.0, 3.2)):
                    boat_id = mesh.upload(engine)
                    fleets.append((boat_id, (ox, oz), (ux * sign, uz * sign), (px, pz), rr, line, lateral, k))
        buoys = []
        for a, b in world["relations"]["wars"]:
            (ax, az), (bx, bz) = centre[a], centre[b]
            d = math.hypot(bx - ax, bz - az)
            ux, uz = (bx - ax) / d, (bz - az) / d
            mx, mz = (ax + bx) / 2 + ux * (radius[a] - radius[b]) / 2, (az + bz) / 2 + uz * (radius[a] - radius[b]) / 2
            for k in range(-6, 7):
                buoys.append(strata.Point((mx - uz * k * 1.1, 0.25, mz + ux * k * 1.1), 3.0, 0.7, (*WAR_RED, 1.0), 0))

        # Orbit the middle of everything drawn, not the ring's centre: vassals push it out.
        xs = [centre[n][0] for n in factions]
        zs = [centre[n][1] for n in factions]
        focus = ((min(xs) + max(xs)) / 2, (min(zs) + max(zs)) / 2)

        lighting = lib.lighting_defaults(strata.LIGHTING_SUN)
        lighting.time_of_day = 0.39
        lighting.latitude_degrees = 40.0
        lighting.cascade_count = 3
        lighting.shadow_map_size = 2048
        lighting.shadow_distance = 220.0
        lighting.fog = 1
        engine.set_lighting(lighting)
        engine.set_sun_direction((0.55, 0.62, 0.56))

        for f in range(args.frames):
            phase = f / args.frames
            angle = 2 * math.pi * phase + 0.6
            eye = (focus[0] + 104 * math.cos(angle), 62.0, focus[1] + 104 * math.sin(angle))
            engine.set_camera(lib.look_at(eye, (focus[0], -2.0, focus[1]), fov_y_degrees=40, aspect=width / height, near_plane=0.5, far_plane=1200))
            for mesh_id, (ox, oz), (ux, uz), (px, pz), rr, line, lateral, k in fleets:
                # Two sorties per loop, so the fleets meet twice as the camera goes round once.
                swing = 0.5 - 0.5 * math.cos(2 * math.pi * (2 * phase + 0.08 * k))
                s = rr + 1.5 + swing * (line - rr - 4.5)
                lag = -0.9 * abs(lateral)
                x = ox + ux * (s + lag) + px * lateral
                z = oz + uz * (s + lag) + pz * lateral
                bob = 0.08 * math.sin(2 * math.pi * (4 * phase + 0.3 * k))
                engine.set_mesh_transform(mesh_id, model_matrix((ux, uz), (x, SEA_LEVEL - 0.1 + bob, z), scale=1.5))
            engine.begin_frame(clear_color=(0.6, 0.75, 0.9, 1))
            engine.submit_points(buoys)
            engine.end_frame()
            rgba, w, h = engine.read_pixels()
            Image.frombytes("RGBA", (w, h), rgba).convert("RGB").save(out / ("f%04d.png" % f))
            print("frame %d/%d" % (f + 1, args.frames), file=sys.stderr, end="\r")
    print(file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
