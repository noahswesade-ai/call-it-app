"""Builds Google Docs batchUpdate requests that rewrite the "Question Bank" tab's
question list from content/question-bank.txt (sorted by category, then difficulty).
Keeps the tab's intro (everything before the first category heading) and replaces the
rest. Usage: python3 tools/bank_to_doc.py <tabId> <firstHeadingIndex> <endIndex> > req.json
Category headings become HEADING_2, difficulty sub-headings HEADING_3."""
import json, pathlib, sys

TAB, START, END = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
P = pathlib.Path(__file__).parent.parent / 'content' / 'question-bank.txt'
u16 = lambda s: len(s.encode('utf-16-le')) // 2

paras = []  # (text, style)
for l in P.read_text().splitlines():
    if l.startswith('### '):
        paras.append((l[4:].strip(), 'HEADING_3'))
    elif l.startswith('## '):
        paras.append((l[3:].strip(), 'HEADING_2'))
    elif l.strip().startswith('['):
        paras.append((l.strip(), 'NORMAL_TEXT'))

text = ''.join(t + '\n' for t, _ in paras)
reqs = [
    # Remove the old list (keep the final paragraph mark of the tab).
    {'deleteContentRange': {'range': {'startIndex': START, 'endIndex': END - 1, 'tabId': TAB}}},
    {'insertText': {'location': {'index': START, 'tabId': TAB}, 'text': text}},
]
end = START + u16(text)
# Everything as normal text first (inserted text would inherit the heading style it lands
# next to), then the category and difficulty headings.
reqs.append({'updateParagraphStyle': {'range': {'startIndex': START, 'endIndex': end, 'tabId': TAB},
                                      'paragraphStyle': {'namedStyleType': 'NORMAL_TEXT'}, 'fields': 'namedStyleType'}})
pos = START
for t, style in paras:
    n = u16(t) + 1
    if style != 'NORMAL_TEXT':
        reqs.append({'updateParagraphStyle': {'range': {'startIndex': pos, 'endIndex': pos + n, 'tabId': TAB},
                                              'paragraphStyle': {'namedStyleType': style}, 'fields': 'namedStyleType'}})
    pos += n
# Plain text (no leftover bold/links) for the whole new block.
reqs.append({'updateTextStyle': {'range': {'startIndex': START, 'endIndex': pos, 'tabId': TAB},
                                 'textStyle': {}, 'fields': 'bold,italic,link'}})
json.dump(reqs, sys.stdout)
print(f'{len(paras)} paragraphs, {u16(text)} chars', file=sys.stderr)
