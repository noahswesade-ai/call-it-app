"""Builds Google Docs batchUpdate requests for the "Goals" tab from tools/goals_content.py.
Usage: python3 tools/goals_to_doc.py <tabId> > requests.json   (tab must be empty)"""
import json, sys
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from goals_content import GOALS, S

TAB = sys.argv[1]
u16 = lambda s: len(s.encode('utf-16-le')) // 2

raw, clean = [], []        # paragraphs with / without leading tabs
heads = []                 # (clean_start, clean_end, style)
bolds, links = [], []      # clean ranges
pos_raw = pos_clean = 1    # body starts at index 1
list_start_raw = list_end_raw = None

def para(text, level=None, style=None, bold_all=False, link=None):
    global pos_raw, pos_clean, list_start_raw, list_end_raw
    tabs = '\t' * level if level is not None else ''
    line = tabs + text + '\n'
    if level is not None:
        if list_start_raw is None: list_start_raw = pos_raw
        list_end_raw = pos_raw + u16(line)
    cs = pos_clean
    if style: heads.append((cs, cs + u16(text) + 1, style))
    if bold_all: bolds.append((cs, cs + u16(text)))
    if link:
        anchor, url = link
        i = text.rindex(anchor)
        links.append((cs + u16(text[:i]), cs + u16(text[:i]) + u16(anchor), url))
    raw.append(line); clean.append(text + '\n')
    pos_raw += u16(line); pos_clean += u16(text + '\n')

para('Goals', style='HEADING_1')
para('Every Underdog feature is designed and checked against these ten goals. Each goal lists its Implications (rules for making decisions) and its Execution (how the app already works toward the goal). Under each item, every indented line gives one reason and the single source it comes from. Figures marked "vendor data" come from companies that sell tools to app makers, so treat them as directional. Last updated 11 November 2026.')
for n, (title, imps, exes) in enumerate(GOALS, 1):
    para(f'Goal {n}: {title}', level=0, bold_all=True)
    for label, items in (('Implications:', imps), ('Execution:', exes)):
        para(label, level=1, bold_all=True)
        for text, whys in items:
            para(text, level=2)
            for _, why, src in whys:
                name, url = S[src]
                para(f'Why: {why} Source: {name}', level=3, link=(name, url))

reqs = [{'insertText': {'location': {'index': 1, 'tabId': TAB}, 'text': ''.join(raw).rstrip('\n')}}]
reqs.append({'createParagraphBullets': {'range': {'startIndex': list_start_raw, 'endIndex': list_end_raw - 1, 'tabId': TAB}, 'bulletPreset': 'BULLET_DISC_CIRCLE_SQUARE'}})
for a, b, st in heads:
    reqs.append({'updateParagraphStyle': {'range': {'startIndex': a, 'endIndex': b, 'tabId': TAB}, 'paragraphStyle': {'namedStyleType': st}, 'fields': 'namedStyleType'}})
for a, b in bolds:
    reqs.append({'updateTextStyle': {'range': {'startIndex': a, 'endIndex': b, 'tabId': TAB}, 'textStyle': {'bold': True}, 'fields': 'bold'}})
for a, b, url in links:
    reqs.append({'updateTextStyle': {'range': {'startIndex': a, 'endIndex': b, 'tabId': TAB}, 'textStyle': {'link': {'url': url}}, 'fields': 'link'}})
json.dump(reqs, sys.stdout)
print(f'paragraphs={len(raw)} links={len(links)} chars={pos_clean}', file=sys.stderr)
