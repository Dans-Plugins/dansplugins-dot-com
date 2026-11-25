"""Draw the site's icons into public/.

The mark is a 3x3 patch of blocky land split into four faction claims, in the
colours the social card uses (green, the brand's gold and blue, terracotta), on
the dark app-bar colour. Plain squares read at 16x16 where lettering would not,
and need no font. public/icon.svg is the same mark, hand-written; keep the two in step.

Usage (from the repository root, with Pillow installed):

    python3 scripts/site-icons/make_icons.py public

Writes favicon.ico (16/32/48), apple-touch-icon.png (180, opaque: iOS rounds
the corners itself), icon-192.png and icon-512.png (rounded, for the web
manifest) and icon-maskable-512.png (full-bleed, artwork inside the maskable
safe zone).
"""
import sys

from PIL import Image, ImageDraw

BACKGROUND = (0x16, 0x1B, 0x22, 255)
GREEN, GOLD, BLUE, TERRACOTTA = (0x4C, 0xAF, 0x50), (0xF5, 0x9F, 0x00), (0x42, 0x63, 0xEB), (0xD9, 0x65, 0x3B)
# Which claim owns each block, row by row.
CLAIM_MAP = [
    [GREEN, GREEN, GOLD],
    [GREEN, BLUE, GOLD],
    [BLUE, BLUE, TERRACOTTA],
]
SUPERSAMPLE = 8


def draw(size, rounded=True, inset=0.0):
    canvas = size * SUPERSAMPLE
    img = Image.new('RGBA', (canvas, canvas), (0, 0, 0, 0))
    pen = ImageDraw.Draw(img)
    if rounded:
        pen.rounded_rectangle([0, 0, canvas - 1, canvas - 1], radius=int(canvas * 0.2), fill=BACKGROUND)
    else:
        pen.rectangle([0, 0, canvas - 1, canvas - 1], fill=BACKGROUND)
    pad = canvas * (0.15 + inset)
    gap = canvas * 0.045
    cell = (canvas - 2 * pad - 2 * gap) / 3
    for row, colours in enumerate(CLAIM_MAP):
        for column, colour in enumerate(colours):
            x = pad + column * (cell + gap)
            y = pad + row * (cell + gap)
            pen.rounded_rectangle([x, y, x + cell, y + cell], radius=int(cell * 0.1), fill=colour + (255,))
    return img.resize((size, size), Image.LANCZOS)


def main(out):
    draw(180, rounded=False).convert('RGB').save(f'{out}/apple-touch-icon.png', optimize=True)
    draw(192).save(f'{out}/icon-192.png', optimize=True)
    draw(512).save(f'{out}/icon-512.png', optimize=True)
    # Maskable icons are cropped to as little as the central 80% circle, so
    # the claims are pulled further in and the background runs to the edge.
    draw(512, rounded=False, inset=0.08).save(f'{out}/icon-maskable-512.png', optimize=True)
    draw(256).save(f'{out}/favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'public')
