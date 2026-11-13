"""'Worn' versions of ring-shaped neck pieces: the back of the ring and the hollow middle
are removed, leaving only the front band, as if a neck were inside it. Shop thumbnails
keep the full artwork; avatars use these.
Each entry: the inner opening as an ellipse (centre x, centre y, radius x, radius y, as
fractions of the art). Everything above the lower edge of that ellipse is removed."""
import sys
from pathlib import Path
import numpy as np
from PIL import Image

APP = Path(sys.argv[1])
AC = APP / 'assets' / 'accessories'
OPENINGS = {
    'gemcollar': (0.5, 0.155, 0.41, 0.085),
    'spikedcollar': (0.5, 0.19, 0.40, 0.105),
    'scarf': (0.5, 0.08, 0.44, 0.075),
}
for name, (cx, cy, rx, ry) in OPENINGS.items():
    im = np.asarray(Image.open(AC / f'{name}.png').convert('RGBA')).copy()
    S = im.shape[0]
    xs = (np.arange(S) + 0.5) / S
    for i, x in enumerate(xs):
        d = (x - cx) / rx
        cut = cy + ry * np.sqrt(1 - d * d) if abs(d) < 1 else cy
        im[: int(round(cut * S)), i] = 0
    Image.fromarray(im).save(AC / 'worn' / f'{name}.png')
    print('worn', name)

# Headphones: the two outer cups only (yellow shell + cushion and their outline), so the
# cups can be drawn in front of the head while the band stays behind it.
from scipy import ndimage  # noqa: E402

im = np.asarray(Image.open(AC / 'headphones.png').convert('RGBA')).astype(int)
S = im.shape[0]
r, g, b, a = im[..., 0], im[..., 1], im[..., 2], im[..., 3]
warm = (a > 40) & (r > 190) & (g > 120) & (b < 110)  # the yellow shell only
yy, xx = np.mgrid[0:S, 0:S] / S
region = (yy > 0.42) & ((xx < 0.3) | (xx > 0.7))
keep = warm & region
keep = ndimage.binary_fill_holes(keep)
outline = ndimage.binary_dilation(keep, iterations=3) & (a > 40) & (r < 90) & (g < 90) & (b < 110)
mask = ndimage.binary_opening(keep | outline, iterations=1)
mask = ndimage.binary_fill_holes(ndimage.binary_closing(mask, iterations=2))
out = im.copy()
out[~mask] = 0
# A clean dark outline all the way round (where the purple parts were cut away).
ring = ndimage.binary_dilation(mask, iterations=2) & ~mask
out[ring] = (40, 18, 48, 255)
Image.fromarray(out.astype(np.uint8)).save(AC / 'worn' / 'headphones-cups.png')
print('worn headphones-cups')
