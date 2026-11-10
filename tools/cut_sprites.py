"""Cut sprite sheets into individual transparent PNGs.

Each sheet is a grid of dark rounded tiles on a flat background. For every tile
we remove the background and the tile colour (only where connected to the tile
edge, so dark details inside a character survive), trim, pad to square and save.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage


def dist(img, color):
    return np.sqrt(((img.astype(np.int32) - np.array(color, dtype=np.int32)) ** 2).sum(-1))


def dominant_dark(px):
    lum = px.mean(-1)
    dark = px[lum < 90]
    q = (dark // 8).astype(np.int32)
    keys, counts = np.unique(q[:, 0] * 10000 + q[:, 1] * 100 + q[:, 2], return_counts=True)
    k = keys[counts.argmax()]
    return np.array([k // 10000, (k // 100) % 100, k % 100]) * 8 + 4


def runs(profile, thresh, min_len):
    on = profile > thresh
    out, start = [], None
    for i, v in enumerate(on):
        if v and start is None:
            start = i
        if not v and start is not None:
            if i - start >= min_len:
                out.append((start, i))
            start = None
    if start is not None and len(on) - start >= min_len:
        out.append((start, len(on)))
    return out


def components(sheet):
    a = np.asarray(sheet.convert('RGB'))
    corners = [a[5, 5], a[5, -5], a[-5, 5], a[-5, -5]]
    bg = np.median(np.array(corners), axis=0)
    flat = a.reshape(-1, 3)
    tile = dominant_dark(flat[dist(flat, bg) > 40])
    tm = dist(a, tile) < 30
    H, W = tm.shape
    boxes = []
    for r0, r1 in runs(tm.mean(1), 0.03, 120):
        band = tm[r0:r1]
        for c0, c1 in runs(band.mean(0), 0.04, 120):
            h, w = r1 - r0, c1 - c0
            m = int(0.06 * max(h, w))
            boxes.append((slice(max(0, r0 - m), min(H, r1 + m // 2)), slice(max(0, c0 - m), min(W, c1 + m))))
    return a, bg, tile, boxes


def cut(a, bg, tile, sl, size):
    y0, y1 = sl[0].start, sl[0].stop
    x0, x1 = sl[1].start, sl[1].stop
    crop = a[y0:y1, x0:x1]
    bg_tol = 95 if np.mean(bg) > 150 else 46  # light sheets have a brighter seam around tiles
    cand = (dist(crop, tile) < 34) | (dist(crop, bg) < bg_tol)
    lab2, _ = ndimage.label(cand)
    border = set(np.unique(np.concatenate([lab2[0], lab2[-1], lab2[:, 0], lab2[:, -1]]))) - {0}
    remove = np.isin(lab2, list(border))
    alpha = np.where(remove, 0, 255).astype(np.float32)
    # soften the cut edge: pixels next to removed area fade by similarity to the tile colour
    edge = ndimage.binary_dilation(remove, iterations=2) & ~remove
    d = np.minimum(dist(crop, tile), dist(crop, bg))
    alpha[edge] = np.clip((d[edge] - 25) / 45, 0, 1) * 255
    # drop tiny specks
    solid, n = ndimage.label(alpha > 0)
    if n > 1:
        sizes = ndimage.sum(np.ones_like(alpha), solid, range(1, n + 1))
        biggest = sizes.max()
        # keep the main subject (and any sizeable pieces of it); drop neighbours' overflow
        objs = ndimage.find_objects(solid)
        keep = []
        for i, s in enumerate(sizes):
            o = objs[i]
            thin = min(o[0].stop - o[0].start, o[1].stop - o[1].start) < 10
            if s > max(400, 0.12 * biggest) and not thin:
                keep.append(i + 1)
        alpha[~np.isin(solid, keep)] = 0
    ys, xs = np.where(alpha > 0)
    rgba = np.dstack([crop, alpha.astype(np.uint8)])[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    img = Image.fromarray(rgba)
    side = max(img.size)
    canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    canvas.paste(img, ((side - img.width) // 2, (side - img.height) // 2))
    return canvas.resize((size, size), Image.LANCZOS)


def main(sheet_path, out_dir, names, size):
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    a, bg, tile, boxes = components(Image.open(sheet_path))
    if len(boxes) != len(names):
        print(f'{sheet_path}: found {len(boxes)} tiles, expected {len(names)}', file=sys.stderr)
    for sl, name in zip(boxes, names):
        if name == '-':
            continue
        cut(a, bg, tile, sl, size).save(out / f'{name}.png', optimize=True)
    print(sheet_path, len(boxes), 'tiles')


if __name__ == '__main__':
    import json

    jobs = json.loads(Path(sys.argv[1]).read_text())
    for j in jobs:
        main(j['sheet'], j['out'], j['names'], j['size'])
