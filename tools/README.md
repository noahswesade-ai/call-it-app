# Art tools (Python 3 + Pillow, NumPy, SciPy)

- `cut_sprites.py jobs.json`: cuts the designer's sprite sheets into the
  transparent PNGs in `assets/avatars` and `assets/accessories`.
- `fit_accessories.py <app dir> <out dir> [accessory ids…]`: measures every
  animal's face (eyes, eye spacing, head top, chin, face edges) and computes where
  each accessory sits on each animal. It writes `fit.json` (copy it to
  `src/avatar/fit.json`) plus one contact sheet per accessory for visual review.
  Tweak the `RULES` table there (width, sink, tuck…) and re-run if an item sits wrong.

## Question bank ↔ Google Doc

- The bank lives in `content/question-bank.txt` and is mirrored in the **Question Bank** tab of the
  "Underdog" Google Doc (https://docs.google.com/document/d/1Jp7BAglrJHX1XS7xHtp6_roxnE7AO0Ayq_CuN1O4qN8/edit).
- After editing the doc, ask Claude to "sync the question bank". Claude reads the doc (read_doc),
  saves the JSON, runs `python3 tools/doc-to-bank.py <saved.json>` and `node tools/build-questions.mjs`,
  runs the tests and redeploys.
- After editing the text file instead: `node tools/build-questions.mjs`, then
  `node tools/export-question-doc.mjs` to rebuild the doc layout.

## Accessory fitting

`tools/fit_accessories2.py` places every accessory on every animal from hand-measured head
landmarks (table `L`) and per-accessory rules (`RULES`, plus per-animal `TWEAK`s), writes
`src/avatar/fit.json`, and renders review sheets:
`python tools/fit_accessories2.py . /tmp/sheets all`
