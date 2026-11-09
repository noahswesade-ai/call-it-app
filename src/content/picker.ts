import type { Category, Question, Rng, WheelSlice } from '@/game/types';
import { weightedPick } from '@/game/selection';

/**
 * Chooses what the wheel lands on and which question is asked.
 * - The wheel has one slice per enabled category plus "Random".
 * - The same category never comes up three times in a row.
 * - "Random" picks a category weighted toward the ones that have come up least.
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

function allowedCategories(categories: Category[], recent: Category[]): Category[] {
  const [last, prev] = [recent[recent.length - 1], recent[recent.length - 2]];
  if (last && last === prev) {
    const others = categories.filter((c) => c !== last);
    if (others.length > 0) return others;
  }
  return categories;
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
  recent: Category[],
  used: Set<string>,
  rng: Rng,
  opts: { canUseKyf: boolean },
): SpinResult {
  let usable = categories.filter((c) => bank.some((q) => q.category === c));
  if (!opts.canUseKyf) usable = usable.filter((c) => c !== 'kyf');
  if (usable.length === 0) throw new Error('No playable categories are enabled');

  const allowed = allowedCategories(usable, recent);
  const slices: WheelSlice[] = [...allowed, 'random'];
  const slice = slices[Math.floor(rng() * slices.length)];

  let category: Category;
  if (slice === 'random') {
    const counts = Object.fromEntries(usable.map((c) => [c, 0])) as Record<Category, number>;
    for (const c of recent) if (c in counts) counts[c]++;
    category = weightedPick(
      allowed,
      allowed.map((c) => 1 / (1 + counts[c])),
      rng,
    ) as Category;
  } else {
    category = slice;
  }

  const question = pickQuestion(bank, category, used, rng)!;
  return { slice, category, question };
}
