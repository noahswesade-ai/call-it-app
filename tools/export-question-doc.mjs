// Writes content/question-bank.html: the question bank laid out for the "Question Bank"
// tab of the Underdog Google Doc. Usage: node tools/export-question-doc.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const text = fs.readFileSync(path.join(root, 'content', 'question-bank.txt'), 'utf8');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const parts = [];
parts.push('<h1>Underdog — Question Bank</h1>');
parts.push('<p>Every question in the game, by category. Edit freely: add, delete or change lines, then tell Claude "sync the question bank" and the game is updated.</p>');
parts.push('<p><b>One question per line:</b> [Type · Difficulty] Question =&gt; Answer = number</p>');
parts.push('<ul>');
parts.push('<li><b>Answer</b>: one right answer (Easy/Medium: first to shout it; Hard: 3-2-1 countdown, both answer at once).</li>');
parts.push('<li><b>Number</b>: closest number wins. Put the real number at the end after " = ", e.g. "=&gt; 8,849 m = 8849".</li>');
parts.push('<li><b>Turns</b>: take turns naming things. No answer needed.</li>');
parts.push('<li><b>Challenge</b>: a task or dare; the host picks the winner. No answer needed.</li>');
parts.push('<li><b>Friend</b> / <b>Friend number</b>: about {friend}, who secretly types the real answer. No difficulty.</li>');
parts.push('<li><b>Room game</b>: Know Your Friends games run by the room (Truth or Dare, Hot Seat…). These may repeat.</li>');
parts.push('</ul>');
parts.push('<p>Difficulty is Easy, Medium or Hard. Keep the category headings as they are.</p>');
for (const block of text.split(/\n(?=## )/)) {
  const lines = block.split('\n').filter((l) => l.trim() && !l.startsWith('# '));
  const head = lines.find((l) => l.startsWith('## '));
  if (!head) continue;
  const qs = lines.filter((l) => l.trim().startsWith('['));
  parts.push(`<h2>${esc(head.slice(3).trim())}</h2>`);
  for (const q of qs) parts.push(`<p>${esc(q.trim())}</p>`);
}
const html = `<html><body>${parts.join('\n')}</body></html>`;
fs.writeFileSync(path.join(root, 'content', 'question-bank.html'), html);
console.log('wrote content/question-bank.html', html.length, 'chars');
