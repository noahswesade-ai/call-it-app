"""Removes stray specks and thin edge lines from the accessory artwork (left over from
cutting the sprite sheets): keeps only connected parts that are reasonably big."""
import sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

AC = Path(sys.argv[1]) / 'assets' / (sys.argv[2] if len(sys.argv) > 2 else 'accessories')
for p in sorted(AC.glob('*.png')):
    im = np.asarray(Image.open(p).convert('RGBA')).copy()
    solid = im[..., 3] > 20
    lab, n = ndimage.label(solid)
    sizes = ndimage.sum(solid, lab, range(1, n + 1))
    keep = np.zeros(n + 1, bool)
    big = sizes.max() if n else 0
    for i, s in enumerate(sizes, 1):
        ys, xs = np.where(lab == i)
        thin = (xs.max() - xs.min() < 4) or (ys.max() - ys.min() < 4)
        keep[i] = s >= max(40, 0.004 * big) and not (thin and s < 0.05 * big)
    mask = keep[lab] | (im[..., 3] <= 20)
    # Thin vertical cut lines along the left/right edge: a pixel in the outer 6 columns
    # is kept only if the drawing continues at that height 6 columns further in.
    S = im.shape[1]
    inner = im[..., 3] > 20
    for x in list(range(0, 6)) + list(range(S - 6, S)):
        ref = inner[:, 8] if x < 6 else inner[:, S - 9]
        near = ndimage.binary_dilation(ref, iterations=4)
        mask[:, x] &= near | (im[:, x, 3] <= 20)
    removed = int((~mask).sum())
    if removed:
        im[~mask] = 0
        Image.fromarray(im).save(p)
        print(f'{p.name}: removed {removed} stray pixels')
