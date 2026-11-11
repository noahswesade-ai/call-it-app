"""Turns a saved Google Docs read_doc JSON of the Underdog doc into content/question-bank.txt.
Usage: python3 tools/doc-to-bank.py <read_doc.json>   then   node tools/build-questions.mjs
Only the "Question Bank" tab is used; headings become "## Category" lines."""
import json, sys, pathlib
d = json.load(open(sys.argv[1]))
c = d.get('content', d)
tabs = c.get('tabs') or [{'tabProperties': {'title': 'Question Bank'}, 'documentTab': {'body': c['body']}}]
tab = next((t for t in tabs if t['tabProperties'].get('title', '').lower() == 'question bank'), tabs[0])
out = ['# UNDERDOG — QUESTION BANK (synced from the Google Doc)', '']
for el in tab['documentTab']['body']['content']:
    p = el.get('paragraph')
    if not p:
        continue
    text = ''.join(r.get('textRun', {}).get('content', '') for r in p['elements']).strip()
    if not text:
        continue
    style = p.get('paragraphStyle', {}).get('namedStyleType', '')
    if style.startswith('HEADING') or style == 'TITLE':
        out += ['', f'## {text}']
    elif text.startswith('['):
        out.append(text)
dest = pathlib.Path(__file__).parent.parent / 'content' / 'question-bank.txt'
dest.write_text('\n'.join(out).strip() + '\n')
print('wrote', dest, sum(1 for l in out if l.startswith('[')), 'questions')
