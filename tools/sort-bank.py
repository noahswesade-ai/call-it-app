"""Sorts content/question-bank.txt: categories stay in order; inside each category the
questions are grouped Easy → Medium → Hard (Know Your Friends: Friend → Friend number →
Room game) under '### ' sub-headings. Order inside a group is kept.
Usage: python3 tools/sort-bank.py"""
import pathlib, re

P = pathlib.Path(__file__).parent.parent / 'content' / 'question-bank.txt'
lines = P.read_text().splitlines()
head, cats, cur = [], [], None
for l in lines:
    if l.startswith('## '):
        cur = (l[3:].strip(), [])
        cats.append(cur)
    elif cur is None:
        head.append(l)
    elif l.strip().startswith('['):
        cur[1].append(l.strip())
ORDER = [('Easy', r'·\s*Easy\]'), ('Medium', r'·\s*Medium\]'), ('Hard', r'·\s*Hard\]'),
         ('Friend questions', r'^\[Friend\]'), ('Friend number questions', r'^\[Friend number\]'), ('Room games', r'^\[Room game\]')]
out = [l for l in head if l.strip() or out_ok] if False else list(head)
while out and not out[-1].strip():
    out.pop()
for name, qs in cats:
    out += ['', f'## {name}']
    left = list(qs)
    for label, pat in ORDER:
        group = [q for q in left if re.search(pat, q)]
        if not group:
            continue
        left = [q for q in left if q not in group]
        out += ['', f'### {label}'] + group
    if left:
        out += ['', '### Other'] + left
P.write_text('\n'.join(out) + '\n')
print('sorted', sum(len(q) for _, q in cats), 'questions in', len(cats), 'categories')
