"""Fibre detail for the WebGL rope, cut from the straight part of the logo tail.

The tail between y=1040..1200 (rope-logo.webp, 1024x1536) runs almost vertically. Each row is
re-centred on the rope, sampled across its width and high-passed, so only cotton fibres remain:
the large-scale light of the photo is removed and the shader lights the strands itself.
Exactly three crevice periods are kept and the seam is cross-faded, so the strip tiles along s.
The part that repeats every period (the crevices) is subtracted; the shader draws crevices itself.
PERIOD must match ROPE_LAY in src/motion/rope.ts (3 * PERIOD / 79 px rope diameter).

Output: src/assets/rope-fibre.png, grey = detail (128 = neutral), across × along = 128 × 256.
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

root = Path(__file__).resolve().parents[1]
logo = Image.open(root / 'src/assets/rope-logo.webp').convert('RGBA')
rgba = np.asarray(logo).astype(np.float32)
alpha = rgba[:, :, 3]
lum = rgba[:, :, :3] @ np.array([.299, .587, .114], np.float32)
blur = np.asarray(Image.fromarray(lum.astype(np.uint8)).filter(ImageFilter.GaussianBlur(3.5))).astype(np.float32)
detail = lum / np.maximum(blur, 8)

PERIOD = 53            # crevice spacing along the axis, best self-match of the tail
TOP, FADE = 1040, 20   # first sampled row; rows cross-faded across the tile seam
RADIUS = 37            # sample slightly inside the 39.5 px silhouette
COLS, ROWS = 128, 256


def row(y):
    xs = np.where(alpha[y, 820:] > 200)[0] + 820
    centre = (xs.min() + xs.max()) / 2
    u = centre + np.linspace(RADIUS, -RADIUS, COLS)   # +v is screen-left for a rope going down
    x0 = np.floor(u).astype(int)
    f = u - x0
    d = detail[y, x0] * (1 - f) + detail[y, x0 + 1] * f
    return np.where(alpha[y, x0] > 240, d, 1.0)


first = TOP - FADE
rows = np.stack([row(y) for y in range(first, TOP + 3 * PERIOD + 2)])


def at(y):
    """Linear interpolation between image rows."""
    i = np.floor(y - first).astype(int)
    f = (y - first - i)[:, None]
    return rows[i] * (1 - f) + rows[i + 1] * f


span = 3 * PERIOD
ys = TOP + np.arange(ROWS) * span / ROWS
tile = at(ys)
seam = ys > TOP + span - FADE
w = ((ys[seam] - (TOP + span - FADE)) / FADE)[:, None]
tile[seam] = tile[seam] * (1 - w) + at(ys[seam] - span) * w

# Remove what repeats every crevice period: shifting by a third of the tile is one period.
shift = ROWS / 3
grid = np.arange(ROWS)


def wrapped(offset):
    p = (grid + offset) % ROWS
    i = np.floor(p).astype(int)
    f = (p - i)[:, None]
    return tile[i] * (1 - f) + tile[(i + 1) % ROWS] * f


periodic = (tile + wrapped(shift) + wrapped(2 * shift)) / 3
body = tile - periodic + 1
body = body / body.mean()
# Leftover crevice lines are much darker than gaps between fibres: soft-limit the dark side.
body = np.where(body < 1, 1 - .1 * np.tanh((1 - body) / .1), body)
body = body / body.mean()
img = np.clip(128 + (body - 1) * 300, 0, 255).astype(np.uint8)
Image.fromarray(img).save(root / 'src/assets/rope-fibre.png')
print('rope-fibre.png', img.shape, img.mean(), img.std())
