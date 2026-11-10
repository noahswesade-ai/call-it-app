# Art tools (Python 3 + Pillow, NumPy, SciPy)

- `cut_sprites.py jobs.json`: cuts the designer's sprite sheets into the
  transparent PNGs in `assets/avatars` and `assets/accessories`.
- `fit_accessories.py <app dir> <out dir> [accessory ids…]`: measures every
  animal's face (eyes, eye spacing, head top, chin, face edges) and computes where
  each accessory sits on each animal. It writes `fit.json` (copy it to
  `src/avatar/fit.json`) plus one contact sheet per accessory for visual review.
  Tweak the `RULES` table there (width, sink, tuck…) and re-run if an item sits wrong.
