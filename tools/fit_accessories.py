"""Measure each animal's face and compute a fitted rectangle for every accessory.

Outputs:
  - fit.json: {animal: {accessoryId: [[left, top, width, height, behind], ...]}} in
    fractions of the avatar's square size (earrings have two rects).
  - contact sheets (one per accessory) for visual review.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

APP = Path(sys.argv[1])
OUT = Path(sys.argv[2])
AV = APP / 'assets' / 'avatars'
AC = APP / 'assets' / 'accessories'

ANIMALS = ['dog', 'cat', 'frog', 'bear', 'bunny', 'pig', 'lamb', 'beaver', 'seal', 'squirrel', 'owl', 'koala',
           'fawn', 'flamingo', 'chameleon', 'panda', 'fox', 'redpanda', 'pangolin', 'axolotl', 'narwhal', 'dragon']

# Manual corrections where automatic measurement is fooled by the art.
OVERRIDE = {
    'narwhal': {'top_from_eyes': 0.95},   # horn would otherwise count as the top of the head
    'dragon': {'top_from_eyes': 0.95},    # horns
    'squirrel': {'top_from_eyes': 0.85},  # tail behind the head
    'bunny': {'top_from_eyes': 0.80},     # long ears
    'fawn': {'top_from_eyes': 0.80},
    'axolotl': {'top_from_eyes': 0.75},
    'flamingo': {'top_from_eyes': 0.85},
}


def measure(name):
    im = np.asarray(Image.open(AV / f'{name}-neutral.png').convert('RGBA')).astype(np.int32)
    S = im.shape[0]
    alpha = im[..., 3] > 128
    lum = im[..., :3].mean(-1)
    # pupils: very dark pixels inside the drawing
    dark = alpha & (lum < 60)
    dark = ndimage.binary_opening(dark, iterations=1)
    lab, n = ndimage.label(dark)
    blobs = []
    for i in range(1, n + 1):
        ys, xs = np.where(lab == i)
        if len(ys) < 25:
            continue
        blobs.append((len(ys), ys.mean(), xs.mean()))
    blobs.sort(reverse=True)
    best = None
    for i in range(min(6, len(blobs))):
        for j in range(i + 1, min(6, len(blobs))):
            a, b = blobs[i], blobs[j]
            dy, dx = abs(a[1] - b[1]), abs(a[2] - b[2])
            if dy < 0.06 * S and 0.18 * S < dx < 0.6 * S:
                score = a[0] + b[0]
                if best is None or score > best[0]:
                    best = (score, a, b)
    if best is None:
        raise SystemExit(f'no eyes found for {name}')
    _, a, b = best
    left, right = (a, b) if a[2] < b[2] else (b, a)
    eye_y = (left[1] + right[1]) / 2
    cx = (left[2] + right[2]) / 2
    spacing = right[2] - left[2]
    # head top: topmost drawn pixel in a narrow band around the face centre
    band = alpha[:, int(cx - 0.06 * S):int(cx + 0.06 * S)]
    rows = np.where(band.any(1))[0]
    top = rows.min()
    bottom = rows.max()
    o = OVERRIDE.get(name, {})
    if 'top_from_eyes' in o:
        top = eye_y - o['top_from_eyes'] * spacing
    # face edges at a row a little below the eyes (cheeks)
    cheek_y = int(min(S - 1, eye_y + 0.45 * spacing))
    cols = np.where(alpha[cheek_y])[0]
    face_l, face_r = cols.min(), cols.max()
    return dict(name=name, S=S, cx=cx, eye_y=eye_y, spacing=spacing, top=top, bottom=bottom,
                face_l=face_l, face_r=face_r, cheek_y=cheek_y,
                eyeL=(left[2], left[1]), eyeR=(right[2], right[1]))


def content_box(acc_id):
    a = np.asarray(Image.open(AC / f'{acc_id}.png').convert('RGBA'))[..., 3] > 40
    ys, xs = np.where(a)
    S = a.shape[0]
    return xs.min() / S, ys.min() / S, (xs.max() + 1) / S, (ys.max() + 1) / S  # fractions of the accessory canvas


# How each accessory is placed. width is relative to `ref` ('spacing' = eye distance, 'face' = cheek width).
# anchor:
#   eyes   – content centre on the eye line (lensY = where lenses sit inside the content, 0..1)
#   crown  – content bottom sits `sink` (fraction of content height) below the head top
#   halo   – content bottom floats `gap` above the head top
#   wrap   – headphones/wig: content top at head top minus `lift`, drawn behind the face
#   mouth  – content centre at eye_y + dy*spacing
#   neck   – content top at chin minus `tuck` * content height, drawn behind the face
#   ears   – two halves, top at eye_y + dy*spacing, centred on the face edges
# How far above the pupils the eyes/brows reach (in eye-spacings). Frogs' eyes bulge upward.
BROW = {'frog': 0.5, 'chameleon': 0.5, 'owl': 0.5, 'flamingo': 0.5}

RULES = {
    # head
    'beanie': dict(anchor='crown', ref='face', w=0.95, sink=0.38),
    'partyhat': dict(anchor='crown', ref='spacing', w=1.1, sink=0.18),
    'redbow': dict(anchor='crown', ref='spacing', w=0.95, sink=0.35, dx=0.35),
    'bunnyears': dict(anchor='crown', ref='face', w=0.85, sink=0.22),
    'butterflyclip': dict(anchor='crown', ref='spacing', w=0.7, sink=0.4, dx=0.45),
    'tophat': dict(anchor='crown', ref='face', w=0.8, sink=0.2),
    'piratehat': dict(anchor='crown', ref='face', w=1.0, sink=0.32),
    'flowercrown': dict(anchor='crown', ref='face', w=0.95, sink=0.45),
    'headphones': dict(anchor='phones', ref='face', w=1.36),
    'chefhat': dict(anchor='crown', ref='face', w=0.82, sink=0.2),
    'wizardhat': dict(anchor='crown', ref='face', w=0.95, sink=0.15),
    'devilhorns': dict(anchor='crown', ref='face', w=0.8, sink=0.45),
    'halo': dict(anchor='halo', ref='face', w=0.75, gap=0.02),
    'laurel': dict(anchor='crown', ref='face', w=0.92, sink=0.5),
    'mohawk': dict(anchor='crown', ref='face', w=0.62, sink=0.3),
    'rainbowwig': dict(anchor='wrap', ref='face', w=1.3, lift=0.16, behind=True),
    'crown': dict(anchor='crown', ref='face', w=0.72, sink=0.25),
    'tiara': dict(anchor='crown', ref='face', w=0.72, sink=0.35),
    'pokervisor': dict(anchor='crown', ref='face', w=0.92, sink=0.45),
    'martiniband': dict(anchor='crown', ref='face', w=0.82, sink=0.4),
    'rosetophat': dict(anchor='crown', ref='face', w=0.82, sink=0.2),
    'beerhelmet': dict(anchor='crown', ref='face', w=1.12, sink=0.4),
    # eyes
    'roundglasses': dict(anchor='eyes', ref='spacing', w=2.0, lensY=0.5),
    'starglasses': dict(anchor='eyes', ref='spacing', w=2.05, lensY=0.5),
    'heartglasses': dict(anchor='eyes', ref='spacing', w=2.05, lensY=0.5),
    'heromask': dict(anchor='eyes', ref='spacing', w=2.2, lensY=0.5),
    'monocle': dict(anchor='monocle', ref='spacing', w=0.62),
    'cybervisor': dict(anchor='eyes', ref='spacing', w=2.35, lensY=0.5),
    'masquerade': dict(anchor='eyes', ref='spacing', w=2.0, lensY=0.66),
    'lacemask': dict(anchor='eyes', ref='spacing', w=2.2, lensY=0.55),
    'cateyeglasses': dict(anchor='eyes', ref='spacing', w=2.1, lensY=0.5),
    # mouth / nose
    'mustache': dict(anchor='mouth', ref='spacing', w=1.15, dy=0.62),
    'beard': dict(anchor='mouth', ref='face', w=0.74, dy=1.12),
    'nosering': dict(anchor='mouth', ref='spacing', w=0.3, dy=0.52),
    # neck
    'bowtie': dict(anchor='neck', ref='spacing', w=1.0, tuck=0.35),
    'tie': dict(anchor='neck', ref='spacing', w=0.55, tuck=0.15),
    'scarf': dict(anchor='neck', ref='face', w=0.95, tuck=0.3),
    'pearls': dict(anchor='neck', ref='face', w=0.75, tuck=0.45),
    'shellnecklace': dict(anchor='neck', ref='face', w=0.72, tuck=0.4),
    'gemcollar': dict(anchor='neck', ref='face', w=0.72, tuck=0.22),
    'goldchain': dict(anchor='neck', ref='face', w=0.75, tuck=0.35),
    'spikedcollar': dict(anchor='neck', ref='face', w=0.75, tuck=0.2),
    'boa': dict(anchor='neck', ref='face', w=1.05, tuck=0.32),
    # ears
    'hoops': dict(anchor='ears', ref='spacing', w=0.36, dy=0.45),
    'moonearrings': dict(anchor='ears', ref='spacing', w=0.36, dy=0.4),
    'diamondstuds': dict(anchor='ears', ref='spacing', w=0.32, dy=0.45),
    'diceearrings': dict(anchor='ears', ref='spacing', w=0.36, dy=0.4),
}


def place(m, acc_id):
    r = RULES[acc_id]
    S = m['S']
    bx0, by0, bx1, by1 = content_box(acc_id)
    cw_frac, ch_frac = bx1 - bx0, by1 - by0  # content size as fraction of the canvas
    face_w = m['face_r'] - m['face_l']
    ref = m['spacing'] if r['ref'] == 'spacing' else face_w
    content_w = r['w'] * ref           # desired content width in px
    canvas = content_w / cw_frac       # px size of the whole (square) accessory canvas
    content_h = ch_frac * canvas
    cx = m['cx'] + r.get('dx', 0) * m['spacing']
    behind = bool(r.get('behind'))

    def rect(content_left, content_top):
        # convert content box position → canvas rect (fractions of avatar size)
        left = content_left - bx0 * canvas
        top = content_top - by0 * canvas
        return [left / S, top / S, canvas / S, canvas / S, behind]

    a = r['anchor']
    if a == 'eyes':
        top = m['eye_y'] - r['lensY'] * content_h
        return [rect(cx - content_w / 2, top)]
    if a == 'monocle':
        ex, ey = m['eyeR']
        # lens is the upper ~55% of the content
        return [rect(ex - content_w * 0.45, ey - content_h * 0.28)]
    if a == 'crown':
        bottom = m['top'] + r['sink'] * content_h
        # never let a hat slide down over the eyes: cap it at the brow line
        brow = m['eye_y'] - BROW.get(m['name'], 0.42) * m['spacing']
        bottom = min(bottom, brow)
        return [rect(cx - content_w / 2, bottom - content_h)]
    if a == 'phones':
        # band just above the head, ear cups centred a little below the eye line,
        # stretched to the animal's own head shape; drawn behind the face.
        top = m['top'] - 0.1 * m['spacing']
        cup_y = m['eye_y'] + 0.25 * m['spacing']
        h_content = (cup_y - top) / 0.78
        h_canvas = h_content / ch_frac
        w_canvas = canvas
        if h_canvas < 0.72 * w_canvas:  # don't squash flat-headed animals (frog) too much
            h_canvas = 0.72 * w_canvas
            top = cup_y - 0.78 * h_canvas * ch_frac
        left = cx - content_w / 2 - bx0 * w_canvas
        # The yellow ear cups occupy x 0.016–0.198 / 0.797–0.979, y 0.52–0.90 of the art.
        cut = 0.51
        box = [left / S, (top - by0 * h_canvas) / S, w_canvas / S, h_canvas / S]
        lx, rx = 0.205, 0.79
        # whole set behind the head, then only the two ear cups in front, straddling the face edges
        return [box + [True], box + [False, [cut, 1, 0, lx]], box + [False, [cut, 1, rx, 1]]]
    if a == 'halo':
        bottom = m['top'] - r['gap'] * S
        return [rect(cx - content_w / 2, bottom - content_h)]
    if a == 'wrap':
        top = m['top'] - r['lift'] * content_h
        return [rect(cx - content_w / 2, top)]
    if a == 'mouth':
        cy = m['eye_y'] + r['dy'] * m['spacing']
        return [rect(cx - content_w / 2, cy - content_h / 2)]
    if a == 'neck':
        # hangs from behind the chin so it can never cover the mouth
        behind = True
        top = m['bottom'] - r['tuck'] * content_h
        return [rect(cx - content_w / 2, top)]
    if a == 'ears':
        # each half of the art is one earring
        half_w = content_w
        canvas_h = half_w / (cw_frac / 2)
        y = m['eye_y'] + r['dy'] * m['spacing']
        out = []
        for side, x in ((-1, m['face_l']), (1, m['face_r'])):
            left = x - half_w / 2 - (bx0 * canvas_h if side < 0 else (bx0 + cw_frac / 2) * canvas_h)
            top = y - by0 * canvas_h
            out.append([left / S, top / S, canvas_h / S, canvas_h / S, False, [0, 1, 0, 0.5] if side < 0 else [0, 1, 0.5, 1]])
        return out
    raise ValueError(a)


def render(animal, acc_id, rects, size=160, mood='neutral'):
    base = Image.open(AV / f'{animal}-{mood}.png').convert('RGBA').resize((size, size))
    pad = size // 2
    canvas = Image.new('RGBA', (size + 2 * pad, size + 2 * pad), (42, 10, 80, 255))
    acc = Image.open(AC / f'{acc_id}.png').convert('RGBA')
    behind = [r for r in rects if r[4]]
    front = [r for r in rects if not r[4]]

    def paste(r):
        left, top, w, h = (v * size for v in r[:4])
        w, h = max(1, int(w)), max(1, int(h))  # may be non-square (stretched headphones)
        img = acc.resize((w, h))
        if len(r) > 5:  # cropped part: [y0, y1, x0, x1]
            y0, y1, x0, x1 = r[5]
            img = img.crop((int(x0 * img.width), int(y0 * img.height), int(x1 * img.width), int(y1 * img.height)))
            left = left + x0 * w
            top = top + y0 * h
        canvas.alpha_composite(img, (int(left) + pad, int(top) + pad)) if left + pad >= 0 and top + pad >= 0 else canvas.paste(img, (int(left) + pad, int(top) + pad), img)

    for r in behind:
        paste(r)
    canvas.alpha_composite(base, (pad, pad))
    for r in front:
        paste(r)
    return canvas


def main():
    geo = {a: measure(a) for a in ANIMALS}
    fit = {a: {} for a in ANIMALS}
    for acc_id in RULES:
        for a in ANIMALS:
            fit[a][acc_id] = [[round(v, 4) if isinstance(v, float) else v for v in r] for r in place(geo[a], acc_id)]
    (OUT / 'fit.json').write_text(json.dumps(fit, separators=(',', ':')))
    only = sys.argv[3:] or list(RULES)
    sheets = OUT / 'sheets'
    sheets.mkdir(exist_ok=True)
    for acc_id in only:
        tiles = [render(a, acc_id, fit[a][acc_id]) for a in ANIMALS]
        tw, th = tiles[0].size
        cols = 11
        sheet = Image.new('RGBA', (cols * tw, 2 * th + 30), (30, 6, 60, 255))
        for i, t in enumerate(tiles):
            sheet.alpha_composite(t, ((i % cols) * tw, (i // cols) * th + 30))
        ImageDraw.Draw(sheet).text((8, 6), acc_id, fill=(255, 255, 255, 255))
        sheet.resize((sheet.width // 2, sheet.height // 2)).save(sheets / f'{acc_id}.png')
    print('ok', len(RULES), 'accessories')


if __name__ == '__main__':
    main()
