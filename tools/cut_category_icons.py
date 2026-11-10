"""Cut the category icons out of CategoryIcons.png (a 3×3 grid of cream cards,
each with an icon on the left and its label on the right).

Usage: python cut_category_icons.py <CategoryIcons.png> <out dir>
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

NAMES = ['geography', 'history', 'basic', 'popculture', 'sports', 'physical', 'minigame', 'kyf', 'random']
# Where the label starts, as a fraction of each card's width (measured by eye from the sheet).
SPLIT = [0.44, 0.535, 0.41, 0.54, 0.54, 0.49, 0.55, 0.53, 0.47]


def dist(a, c):
    return np.sqrt(((a.astype(np.int32) - np.array(c, dtype=np.int32)) ** 2).sum(-1))


def main(src, out):
    out = Path(out)
    out.mkdir(parents=True, exist_ok=True)
    a = np.asarray(Image.open(src).convert('RGB'))
    cream = np.median(a[180:200, 400:420].reshape(-1, 3), axis=0)  # inside the first card
    card = dist(a, cream) < 40
    card = ndimage.binary_closing(card, iterations=4)
    card = ndimage.binary_fill_holes(card)
    lab, n = ndimage.label(card)
    boxes = [sl for sl in ndimage.find_objects(lab) if (sl[0].stop - sl[0].start) > 150 and (sl[1].stop - sl[1].start) > 300]
    boxes.sort(key=lambda sl: ((sl[0].start + sl[0].stop) // 2 // 200, sl[1].start))
    assert len(boxes) == 9, len(boxes)
    for sl, name, split in zip(boxes, NAMES, SPLIT):
        y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
        pad = 10
        crop = a[y0 + pad:y1 - pad, x0 + pad:x0 + int(split * (x1 - x0))]
        # remove the cream card (connected to the crop edges)
        bg = dist(crop, cream) < 38
        labs, _ = ndimage.label(bg)
        edge = set(np.unique(np.concatenate([labs[0], labs[-1], labs[:, 0], labs[:, -1]]))) - {0}
        remove = np.isin(labs, list(edge))
        alpha = np.where(remove, 0, 255).astype(np.float32)
        ring = ndimage.binary_dilation(remove, iterations=2) & ~remove
        alpha[ring] = np.clip((dist(crop, cream)[ring] - 15) / 45, 0, 1) * 255
        # drop slivers of the card border / stray label pixels
        solid, k = ndimage.label(alpha > 0)
        if k > 1:
            sizes = ndimage.sum(np.ones_like(alpha), solid, range(1, k + 1))
            objs = ndimage.find_objects(solid)
            keep = [i + 1 for i, s in enumerate(sizes) if s > 120 and min(objs[i][0].stop - objs[i][0].start, objs[i][1].stop - objs[i][1].start) > 6]
            alpha[~np.isin(solid, keep)] = 0
        ys, xs = np.where(alpha > 0)
        rgba = np.dstack([crop, alpha.astype(np.uint8)])[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        img = Image.fromarray(rgba)
        side = max(img.size)
        canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
        canvas.paste(img, ((side - img.width) // 2, (side - img.height) // 2))
        canvas.resize((192, 192), Image.LANCZOS).save(out / f'{name}.png', optimize=True)
    print('cut', len(boxes), 'icons')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
