"""Face edges at eye level for each animal (fraction of the avatar image), used to make
eyewear span the face. From each pupil we walk outward: past the dark pupil, across the
face colour, and stop at the first dark outline or transparent pixel."""
import numpy as np
from PIL import Image


def face_edges(av_dir, animal, eye_l, eye_r, eye_y):
    a = np.asarray(Image.open(av_dir / f'{animal}-neutral.png').convert('RGBA')).astype(int)
    S = a.shape[0]
    y = int(eye_y * S)
    rows = a[max(0, y - 2): y + 3]  # a 5-pixel band, to step over thin highlights

    def edge(x0, step):
        x = int(x0 * S)
        seen_face = False
        while 0 < x < S - 1:
            px = rows[:, x]
            alpha = px[:, 3].max()
            lum = px[:, :3].mean(-1).min()
            if alpha < 100:
                return x / S
            if lum > 110:
                seen_face = True
            elif seen_face and lum < 70:
                return x / S
            x += step
        return x / S

    return edge(eye_l, -1), edge(eye_r, +1)
