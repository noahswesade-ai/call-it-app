"""Fit every accessory to every animal using HAND-MEASURED head landmarks.

v1 (fit_accessories.py) guessed head shape from the artwork and got fooled by ears,
whiskers, horns and fur. Here each animal's head is described by hand (in percent of
the avatar image, read off a 5% grid), and only the pupils are measured automatically.

Landmarks (percent of the square avatar image):
  top     y of the skull top at the centre (where a hat sits; ignores ears/tufts/horns)
  hl, hr  x of the skull's left/right edge just above the eyes (hat width)
  brow    lowest y a hat may reach (just above the eyebrows/lashes)
  chin    y of the bottom of the face at the centre
  jl, jr, jy  left/right face edge at jaw level, and that y (earrings, neck width)
  nose, mouth  y of the nose and of the mouth centre

Output: src/avatar/fit.json in the format AnimalAvatar.tsx reads:
  {animal: {accessory: [[left, top, width, height, behind, crop?], ...]}}
crop = [y0, y1, x0, x1] (fractions of the accessory art) shows only part of it.

Usage:  python tools/fit_accessories2.py <app dir> <sheet dir> [accessory ...]
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).parent))
from fit_accessories import measure as measure_eyes  # noqa: E402

APP = Path(sys.argv[1])
OUT = Path(sys.argv[2])
AV = APP / 'assets' / 'avatars'
AC = APP / 'assets' / 'accessories'

L = {
    #           top  hl  hr  brow chin  jl  jr  jy  nose mouth
    'dog':       (12, 22, 78, 30, 92, 17, 83, 75, 62, 78),
    'cat':       (14, 25, 75, 33, 95, 12, 88, 80, 66, 79),
    'frog':      (20, 25, 75, 22, 92, 5, 95, 75, 45, 63),
    'bear':      (8, 20, 80, 28, 97, 6, 94, 80, 62, 75),
    'bunny':     (24, 18, 82, 40, 97, 6, 94, 85, 69, 80),
    'pig':       (12, 18, 82, 33, 97, 8, 92, 85, 66, 80),
    'lamb':      (8, 12, 88, 38, 93, 8, 92, 75, 67, 74),
    'beaver':    (7, 15, 85, 27, 95, 4, 96, 75, 58, 72),
    'seal':      (7, 12, 88, 35, 96, 3, 97, 75, 62, 70),
    'squirrel':  (22, 15, 85, 46, 98, 6, 90, 85, 71, 83),
    'owl':       (12, 12, 88, 32, 95, 6, 94, 80, 58, 62),
    'koala':     (13, 15, 85, 42, 95, 9, 91, 80, 62, 76),
    'fawn':      (15, 15, 85, 41, 90, 12, 88, 75, 72, 78),
    'flamingo':  (9, 16, 84, 36, 88, 13, 87, 70, 70, 76),
    'chameleon': (6, 20, 80, 30, 95, 4, 96, 80, 65, 75),
    'panda':     (10, 15, 85, 30, 97, 5, 95, 80, 64, 77),
    'fox':       (21, 20, 80, 37, 95, 6, 94, 75, 70, 81),
    'redpanda':  (12, 15, 85, 35, 95, 5, 95, 80, 67, 79),
    'pangolin':  (6, 12, 88, 36, 95, 8, 92, 80, 70, 82),
    'axolotl':   (23, 15, 85, 40, 85, 12, 88, 70, 60, 66),
    'narwhal':   (20, 12, 88, 35, 98, 5, 95, 80, 68, 76),
    'dragon':    (27, 22, 78, 33, 97, 15, 85, 85, 70, 80),
}
ANIMALS = list(L)

# How each accessory is worn.
#  hat:    content width = w × skull width; bottom edge at top + seat × (brow − top)
#  halo:   floats `gap` (of skull width) above the head
#  wig:    behind the head; top at `lift` of its height above the skull top
#  phones: headband over the head, cups at the sides (cups drawn in front)
#  eyes:   lens line on the pupils; width = w × eye spacing
#  monocle: on the right eye
#  mouth:  centred at y = nose + t × (mouth − nose); width = w × eye spacing
#  beard:  top just under the mouth line, width = w × jaw width
#  neck:   in front of the lowest part of the face, under the mouth; width = w × jaw width;
#          anything below the image (+ a little) is cropped off
#  ears:   one earring at each jaw corner; width = w × skull width
RULES = {
    'beanie': dict(kind='hat', w=1.04, seat=0.92),
    'partyhat': dict(kind='hat', w=0.42, seat=0.30),
    'redbow': dict(kind='hat', w=0.40, seat=0.30, dx=0.24),
    'bunnyears': dict(kind='hat', w=0.95, seat=0.75),
    'butterflyclip': dict(kind='hat', w=0.42, seat=0.45, dx=0.26),
    'tophat': dict(kind='hat', w=0.80, seat=0.40),
    'piratehat': dict(kind='hat', w=1.05, seat=0.72),
    'flowercrown': dict(kind='hat', w=1.0, seat=0.62),
    'headphones': dict(kind='phones', w=1.16),
    'chefhat': dict(kind='hat', w=0.78, seat=0.55),
    'wizardhat': dict(kind='hat', w=0.98, seat=0.60),
    'devilhorns': dict(kind='hat', w=1.0, seat=0.85),
    'halo': dict(kind='halo', w=0.70, gap=0.02),
    'laurel': dict(kind='hat', w=1.12, seat=0.98),
    'mohawk': dict(kind='hat', w=0.82, seat=0.55),
    'rainbowwig': dict(kind='wig', w=1.18, lift=0.30),
    'crown': dict(kind='hat', w=0.66, seat=0.42),
    'tiara': dict(kind='hat', w=0.62, seat=0.55),
    'pokervisor': dict(kind='hat', w=0.86, seat=0.9),
    'martiniband': dict(kind='hat', w=0.92, seat=0.62),
    'rosetophat': dict(kind='hat', w=0.84, seat=0.42),
    'beerhelmet': dict(kind='hat', w=1.10, seat=0.85),
    'roundglasses': dict(kind='eyes', w=2.0, lensY=0.5),
    'starglasses': dict(kind='eyes', w=2.05, lensY=0.5),
    'heartglasses': dict(kind='eyes', w=2.05, lensY=0.5),
    'heromask': dict(kind='eyes', w=2.2, lensY=0.52),
    'monocle': dict(kind='monocle', w=0.62),
    'cybervisor': dict(kind='eyes', w=2.12, lensY=0.5),
    'masquerade': dict(kind='eyes', w=1.85, lensY=0.68),
    'lacemask': dict(kind='eyes', w=2.2, lensY=0.55),
    'cateyeglasses': dict(kind='eyes', w=2.1, lensY=0.52),
    'mustache': dict(kind='mouth', w=1.05, t=0.55),
    'nosering': dict(kind='mouth', w=0.38, t=0.28),
    'beard': dict(kind='beard', w=0.62),
    'bowtie': dict(kind='neck', w=0.36, under=0.0),
    'tie': dict(kind='neck', w=0.20, under=-0.02),
    'scarf': dict(kind='neck', w=0.80, under=0.02),
    'pearls': dict(kind='neck', w=0.44, under=0.0),
    'shellnecklace': dict(kind='neck', w=0.40, under=0.0),
    'gemcollar': dict(kind='neck', w=0.44, under=0.02),
    'goldchain': dict(kind='neck', w=0.38, under=0.0),
    'spikedcollar': dict(kind='neck', w=0.48, under=0.02),
    'boa': dict(kind='neck', w=0.90, under=0.02),
    'hoops': dict(kind='ears', w=0.17),
    'moonearrings': dict(kind='ears', w=0.15),
    'diamondstuds': dict(kind='ears', w=0.13),
    'diceearrings': dict(kind='ears', w=0.15),
}

# Per-animal tweaks where the art needs a nudge: {(animal, accessory): {param: value}}
TWEAK = {
    ('cat', 'beanie'): dict(w=1.45),
    ('dragon', 'beanie'): dict(w=1.3),
    ('frog', 'beanie'): dict(w=1.25),
    ('fox', 'beanie'): dict(w=1.2),
}


def content_box(acc_id):
    a = np.asarray(Image.open(AC / f'{acc_id}.png').convert('RGBA'))[..., 3] > 40
    ys, xs = np.where(a)
    S = a.shape[0]
    return xs.min() / S, ys.min() / S, (xs.max() + 1) / S, (ys.max() + 1) / S


def half_box(acc_id, side):
    """Content box of the left or right half of the art (one earring)."""
    a = np.asarray(Image.open(AC / f'{acc_id}.png').convert('RGBA'))[..., 3] > 40
    S = a.shape[0]
    h = a[:, : S // 2] if side < 0 else a[:, S // 2:]
    ys, xs = np.where(h)
    off = 0 if side < 0 else S // 2
    return (xs.min() + off) / S, ys.min() / S, (xs.max() + 1 + off) / S, (ys.max() + 1) / S


EYES = {}


def geo(animal):
    if animal not in EYES:
        m = measure_eyes(animal)
        S = m['S']
        EYES[animal] = dict(eyeL=(m['eyeL'][0] / S, m['eyeL'][1] / S), eyeR=(m['eyeR'][0] / S, m['eyeR'][1] / S))
    top, hl, hr, brow, chin, jl, jr, jy, nose, mouth = (v / 100 for v in L[animal])
    e = EYES[animal]
    eye_y = (e['eyeL'][1] + e['eyeR'][1]) / 2
    spacing = e['eyeR'][0] - e['eyeL'][0]
    return dict(top=top, hl=hl, hr=hr, brow=brow, chin=chin, jl=jl, jr=jr, jy=jy, nose=nose, mouth=mouth,
                eye_y=eye_y, spacing=spacing, cx=(hl + hr) / 2, ecx=(e['eyeL'][0] + e['eyeR'][0]) / 2, **e)


def place(animal, acc):
    g = geo(animal)
    r = dict(RULES[acc], **TWEAK.get((animal, acc), {}))
    bx0, by0, bx1, by1 = content_box(acc)
    cwf, chf = bx1 - bx0, by1 - by0
    W = g['hr'] - g['hl']
    jaw = g['jr'] - g['jl']
    k = r['kind']

    def sized(content_w):
        canvas = content_w / cwf
        return canvas, chf * canvas

    def rect(canvas, content_left, content_top, behind=False, crop=None):
        out = [content_left - bx0 * canvas, content_top - by0 * canvas, canvas, canvas, behind]
        if crop:
            out.append(crop)
        return [round(v, 4) if isinstance(v, float) else v for v in out]

    if k == 'hat':
        cw = r['w'] * W
        canvas, ch = sized(cw)
        bottom = g['top'] + r['seat'] * (g['brow'] - g['top'])
        cx = g['cx'] + r.get('dx', 0) * W
        return [rect(canvas, cx - cw / 2, bottom - ch)]
    if k == 'halo':
        cw = r['w'] * W
        canvas, ch = sized(cw)
        return [rect(canvas, g['cx'] - cw / 2, g['top'] - r['gap'] * W - ch)]
    if k == 'wig':
        cw = r['w'] * jaw
        canvas, ch = sized(cw)
        return [rect(canvas, g['cx'] - cw / 2, g['top'] - r['lift'] * ch, behind=True)]
    if k == 'eyes':
        cw = r['w'] * g['spacing']
        canvas, ch = sized(cw)
        return [rect(canvas, g['ecx'] - cw / 2, g['eye_y'] - r['lensY'] * ch)]
    if k == 'monocle':
        cw = r['w'] * g['spacing']
        canvas, ch = sized(cw)
        ex, ey = g['eyeR']
        return [rect(canvas, ex - cw * 0.45, ey - ch * 0.28)]
    if k == 'mouth':
        cw = r['w'] * g['spacing']
        canvas, ch = sized(cw)
        cy = g['nose'] + r['t'] * (g['mouth'] - g['nose'])
        return [rect(canvas, g['ecx'] - cw / 2, cy - ch / 2)]
    if k == 'beard':
        cw = r['w'] * jaw
        canvas, ch = sized(cw)
        return [rect(canvas, g['ecx'] - cw / 2, g['mouth'] - 0.12 * ch)]
    if k == 'neck':
        cw = r['w'] * jaw
        canvas, ch = sized(cw)
        # In front of the lowest part of the face, never covering the mouth.
        top = max(g['mouth'] + 0.08 + r.get('under', 0), g['chin'] - 0.16)
        left = g['ecx'] - cw / 2
        crop = None
        limit = 1.12  # crop anything more than 12% below the picture
        if top + ch > limit:
            y1 = by0 + (limit - top) / canvas
            crop = [0, round(y1, 4), 0, 1]
        return [rect(canvas, left, top, crop=crop)]
    if k == 'ears':
        out = []
        for side, x in ((-1, g['jl']), (1, g['jr'])):
            hx0, hy0, hx1, hy1 = half_box(acc, side)
            hw = hx1 - hx0
            content_w = r['w'] * W
            canvas = content_w / hw
            # hang from just inside the jaw corner
            cxp = x - side * 0.04
            left = cxp - content_w / 2 - hx0 * canvas
            top = g['jy'] - 0.07 - hy0 * canvas
            crop = [0, 1, 0, 0.5] if side < 0 else [0, 1, 0.5, 1]
            out.append([round(left, 4), round(top, 4), round(canvas, 4), round(canvas, 4), False, crop])
        return out
    if k == 'phones':
        # as wide as the whole face so the cups sit OUTSIDE the cheeks, on the eye line
        cw = r['w'] * jaw
        canvas, ch = sized(cw)
        top = g['top'] - 0.05
        cup_y = g['eye_y'] + 0.06
        # cups' centre is ~78% down the art's content
        want_h = (cup_y - top) / 0.78
        h_canvas = max(0.7 * canvas, min(1.25 * canvas, want_h / chf))
        left = (g['jl'] + g['jr']) / 2 - cw / 2 - bx0 * canvas
        box = [round(left, 4), round(top - by0 * h_canvas, 4), round(canvas, 4), round(h_canvas, 4)]
        cut, lx, rx = 0.56, 0.205, 0.79
        return [box + [True], box + [False, [cut, 1, 0, lx]], box + [False, [cut, 1, rx, 1]]]
    raise ValueError(k)


def render(animal, acc, rects, size=120, mood='neutral'):
    base = Image.open(AV / f'{animal}-{mood}.png').convert('RGBA').resize((size, size))
    pad = size // 4
    canvas = Image.new('RGBA', (size + 2 * pad, size + 2 * pad), (42, 10, 80, 255))
    ImageDraw.Draw(canvas).rectangle([pad, pad, pad + size, pad + size], outline=(255, 255, 255, 40))
    art = Image.open(AC / f'{acc}.png').convert('RGBA')

    def paste(r):
        left, top, w, h = (v * size for v in r[:4])
        w, h = max(1, int(round(w))), max(1, int(round(h)))
        img = art.resize((w, h))
        if len(r) > 5:
            y0, y1, x0, x1 = r[5]
            img = img.crop((int(x0 * w), int(y0 * h), int(x1 * w), int(y1 * h)))
            left += x0 * w
            top += y0 * h
        layer = Image.new('RGBA', canvas.size)
        layer.paste(img, (int(left) + pad, int(top) + pad))
        canvas.alpha_composite(layer)

    for r in rects:
        if r[4]:
            paste(r)
    canvas.alpha_composite(base, (pad, pad))
    for r in rects:
        if not r[4]:
            paste(r)
    return canvas


def main():
    fit = {a: {acc: place(a, acc) for acc in RULES} for a in ANIMALS}
    (APP / 'src' / 'avatar' / 'fit.json').write_text(json.dumps(fit, separators=(',', ':')))
    only = sys.argv[3:]
    if only == ['all']:
        only = list(RULES)
    OUT.mkdir(parents=True, exist_ok=True)
    for acc in only:
        tiles = [render(a, acc, fit[a][acc]) for a in ANIMALS]
        tw, th = tiles[0].size
        cols = 8
        sheet = Image.new('RGBA', (cols * tw, 3 * th + 24), (30, 6, 60, 255))
        for i, t in enumerate(tiles):
            sheet.alpha_composite(t, ((i % cols) * tw, (i // cols) * th + 24))
        ImageDraw.Draw(sheet).text((8, 6), acc, fill=(255, 255, 255, 255))
        sheet.save(OUT / f'{acc}.png')
    print('fitted', len(RULES), 'accessories on', len(ANIMALS), 'animals')


if __name__ == '__main__':
    main()
