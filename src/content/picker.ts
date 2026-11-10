import type { Category, Question, Rng, WheelSlice } from '@/game/types';

/**
 * Chooses what the wheel lands on and which question is asked.
 * - The wheel has one slice per enabled category plus "Random".
 * - Every enabled category has exactly the same chance on every spin.
 * - Questions already used this game (or seen before, if a history is passed) are avoided.
 */

export interface SpinResult {
  slice: WheelSlice;
  category: Category;
  question: Question;
}

export function wheelSlices(categories: Category[]): WheelSlice[] {
  return [...categories, 'random'];
}

export function pickQuestion(
  bank: Question[],
  category: Category,
  used: Set<string>,
  rng: Rng,
): Question | undefined {
  const inCat = bank.filter((q) => q.category === category);
  if (inCat.length === 0) return undefined;
  const fresh = inCat.filter((q) => !used.has(q.id));
  const pool = fresh.length > 0 ? fresh : inCat;
  return pool[Math.floor(rng() * pool.length)];
}

export function spin(
  bank: Question[],
  categories: Category[],
  _recent: Category[],
  used: Set<string>,
  rng: Rng,
  opts: { canUseKyf: boolean },
): SpinResult {
  let usable = categories.filter((c) => bank.some((q) => q.category === c));
  if (!opts.canUseKyf) usable = usable.filter((c) => c !== 'kyf');
  if (usable.length === 0) throw new Error('No playable categories are enabled');

  // Every enabled category is exactly equally likely on every spin (1 / n).
  const category = usable[Math.floor(rng() * usable.length)];
  // The wheel shows a "Random" slice too; landing there sometimes keeps it fun without
  // changing the odds (whatever Random picks is still the uniformly chosen category).
  const slice: WheelSlice = rng() < 1 / (usable.length + 1) ? 'random' : category;
  const question = pickQuestion(bank, category, used, rng)!;
  return { slice, category, question };
}
