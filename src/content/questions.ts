import type { Difficulty, MinigameId, Question } from '@/game/types';
import { BANK } from './bank.generated';

// The question bank lives in content/question-bank.txt (mirrored in the "Question Bank"
// tab of the Underdog Google Doc). Run `node tools/build-questions.mjs` after editing it
// to regenerate src/content/bank.generated.ts. Later the bank can move to Supabase so
// new content ships without an app update.

const MINIGAME_NAMES: [MinigameId, string, Difficulty][] = [
  ['reaction', 'Reaction Tap — tap the instant the screen turns green. Too early and you lose!', 'E'],
  ['tapFrenzy', 'Tap Frenzy — most taps in 10 seconds wins.', 'E'],
  ['stopClock', 'Stop the Clock — stop the hidden timer as close to 5.00 seconds as you can.', 'M'],
  ['colorClash', 'Color Clash — tap the INK color, not the word. Most correct in 20 seconds.', 'M'],
  ['quickMath', 'Quick Math — most sums solved in 20 seconds.', 'M'],
  ['memory', 'Memory Sequence — repeat the growing color pattern. Longest wins.', 'H'],
];

export const MINIGAMES: Question[] = MINIGAME_NAMES.map(([id, prompt, difficulty]) => ({
  id: `minigame-${id}`,
  category: 'minigame',
  type: 'MINIGAME',
  difficulty,
  prompt,
  minigame: id,
}));

export const ALL_QUESTIONS: Question[] = [...BANK, ...MINIGAMES];
