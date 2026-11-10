import { ALL_QUESTIONS } from '../questions';

test('every category has at least 31 questions and unique ids', () => {
  const counts: Record<string, number> = {};
  for (const q of ALL_QUESTIONS) counts[q.category] = (counts[q.category] ?? 0) + 1;
  for (const [c, n] of Object.entries(counts)) if (c !== 'minigame') expect([c, n >= 31]).toEqual([c, true]);
  expect(new Set(ALL_QUESTIONS.map((q) => q.id)).size).toBe(ALL_QUESTIONS.length);
});
