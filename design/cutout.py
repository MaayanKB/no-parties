"""Remove a checkerboard that was painted into an illustration instead of real transparency.

Flood-fills from the image border over grey, low-saturation pixels (the checker squares), makes them
transparent, then softens the one-pixel grey fringe left around the drawing.
"""
import sys
from collections import deque

import numpy as np
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
rgb = np.asarray(Image.open(src).convert("RGB")).astype(np.int16)
h, w, _ = rgb.shape
spread = rgb.max(axis=2) - rgb.min(axis=2)
value = rgb.max(axis=2)
checker = (spread <= 22) & (value >= 95) & (value <= 222)

background = np.zeros((h, w), dtype=bool)
queue = deque()
for x in range(w):
    for y in (0, h - 1):
        if checker[y, x]:
            background[y, x] = True
            queue.append((y, x))
for y in range(h):
    for x in (0, w - 1):
        if checker[y, x] and not background[y, x]:
            background[y, x] = True
            queue.append((y, x))
while queue:
    y, x = queue.popleft()
    for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
        if 0 <= ny < h and 0 <= nx < w and checker[ny, nx] and not background[ny, nx]:
            background[ny, nx] = True
            queue.append((ny, nx))

alpha = np.where(background, 0, 255).astype(np.uint8)
# Fringe: grey-ish pixels touching the background become half transparent instead of a hard grey edge.
touching = np.zeros_like(background)
touching[1:, :] |= background[:-1, :]
touching[:-1, :] |= background[1:, :]
touching[:, 1:] |= background[:, :-1]
touching[:, :-1] |= background[:, 1:]
fringe = touching & ~background & (spread <= 40)
alpha[fringe] = 110

img = Image.fromarray(np.dstack([rgb.astype(np.uint8), alpha]), "RGBA")
img = img.crop(img.getbbox())
print("removed", int(background.sum()), "px; fringe", int(fringe.sum()), "px; cropped to", img.size)
img.save(out)
