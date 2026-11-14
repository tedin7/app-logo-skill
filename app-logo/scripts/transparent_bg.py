"""Make the near-white background outside a rounded-square icon transparent.

Flood fill from the four corners over near-white pixels, then erode the edge a little and soften it,
so no white halo is left around the square. Vitrum needs this, otherwise it extrudes the white too.

Usage: python3 transparent_bg.py ICON.png OUT.png [threshold]
Requires Pillow and numpy.
"""
import sys
from collections import deque

import numpy as np
from PIL import Image, ImageFilter

DEFAULT_THRESHOLD = 238  # a pixel is background when all channels are above this value
ERODE_PX = 5
SOFTEN_RADIUS = 1.2


def background_mask(rgb: np.ndarray, threshold: int) -> np.ndarray:
    near_white = rgb.min(axis=2) > threshold
    height, width = near_white.shape
    seen = np.zeros((height, width), bool)
    queue = deque((y, x) for y, x in ((0, 0), (0, width - 1), (height - 1, 0), (height - 1, width - 1))
                  if near_white[y, x])
    for point in queue:
        seen[point] = True
    while queue:
        y, x = queue.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < height and 0 <= nx < width and not seen[ny, nx] and near_white[ny, nx]:
                seen[ny, nx] = True
                queue.append((ny, nx))
    return seen


def main() -> None:
    if len(sys.argv) < 3:
        sys.exit("usage: python3 transparent_bg.py ICON.png OUT.png [threshold]")
    src, dst = sys.argv[1], sys.argv[2]
    threshold = int(sys.argv[3]) if len(sys.argv) > 3 else DEFAULT_THRESHOLD
    image = Image.open(src).convert("RGB")
    outside = background_mask(np.array(image).astype(int), threshold)
    alpha = Image.fromarray(((~outside) * 255).astype("uint8"))
    alpha = alpha.filter(ImageFilter.MinFilter(ERODE_PX)).filter(ImageFilter.GaussianBlur(SOFTEN_RADIUS))
    result = image.convert("RGBA")
    result.putalpha(alpha)
    result.save(dst)
    print("SAVED", dst)


if __name__ == "__main__":
    main()
