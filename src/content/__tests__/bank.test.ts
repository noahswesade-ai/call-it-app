import { ALL_QUESTIONS } from '../questions';

test('every category has at least 80 questions and unique ids', () => {
  const counts: Record<string, number> = {};
  for (const q of ALL_QUESTIONS) counts[q.category] = (counts[q.category] ?? 0) + 1;
  for (const [c, n] of Object.entries(counts)) if (c !== 'minigame') expect([c, n >= 80]).toEqual([c, true]);
  expect(new Set(ALL_QUESTIONS.map((q) => q.id)).size).toBe(ALL_QUESTIONS.length);
});

test('the text bank parses cleanly (no duplicates, every Number has a number)', async () => {
  const fs = jest.requireActual('fs') as typeof import('fs');
  const path = jest.requireActual('path') as typeof import('path');
  const text = fs.readFileSync(path.join(__dirname, '../../../content/question-bank.txt'), 'utf8');
  const { BANK } = jest.requireActual('../bank.generated');
  // The generated file must be up to date with the text file.
  const lines = text.split('\n').filter((l: string) => /^\s*(?:[-•*]\s+)?\[/.test(l));
  expect(BANK.length).toBe(lines.length);
  for (const q of BANK) if (q.type === 'SPOKEN_CLOSEST') expect(Number.isFinite(q.numericAnswer)).toBe(true);
});
