import type { Category, Mode, Question, Rng, WheelSlice } from '@/game/types';

/**
 * Chooses what the wheel lands on and which question is asked.
 * - The wheel has one slice per enabled category plus "Random".
 * - Classic: every category starts equally likely.
 * - Party: the "fun" categories (Party, Spicy, Physical, Know Your Friends) are boosted
 *   so that together they come up about 70% of the time.
 * - Every time the wheel lands on a category, that category's odds drop for the rest
 *   of the game, so the same few don't keep coming back.
 * - Questions seen this session (by anyone in the room) are avoided; repeatable room
 *   games are the exception.
 */

export interface SpinResult {
  slice: WheelSlice;
  category: Category;
  question: Question;
}

export const FUN_CATEGORIES: Category[] = ['party', 'spicy', 'physical', 'kyf'];
/** Share of Party-mode rounds that should land on a fun category. */
export const PARTY_FUN_SHARE = 0.7;
/** Each time a category comes up, its weight is multiplied by this for the rest of the game. */
export const REPEAT_DECAY = 0.55;

export function wheelSlices(categories: Category[]): WheelSlice[] {
  return [...categories, 'random'];
}

/**
 * Once the wheel lands on a category, the lobby's own (unused) questions in it are
 * asked this often, however few there are: personal questions make the night.
 */
export const CUSTOM_SHARE = 0.75;

export function pickQuestion(
  bank: Question[],
  category: Category,
  used: Set<string>,
  rng: Rng,
  filter?: (q: Question) => boolean,
  opts: { onlyCustom?: boolean } = {},
): Question | undefined {
  let inCat = bank.filter((q) => q.category === category);
  if (filter) {
    const f = inCat.filter(filter);
    if (f.length > 0) inCat = f;
  }
  if (inCat.length === 0) return undefined;
  const fresh = inCat.filter((q) => q.repeatable || !used.has(q.id));
  const freshCustom = fresh.filter((q) => q.custom);
  if (freshCustom.length > 0 && (opts.onlyCustom || rng() < CUSTOM_SHARE)) {
    return freshCustom[Math.floor(rng() * freshCustom.length)];
  }
  const freshBuiltIn = fresh.filter((q) => !q.custom);
  // In "only our questions" mode built-in questions are a last resort (a category ran dry).
  const pool = freshBuiltIn.length > 0 ? freshBuiltIn : fresh.length > 0 ? fresh : inCat;
  return pool[Math.floor(rng() * pool.length)];
}

/** Starting weight of each usable category (before the repeat decay). */
export function baseWeights(usable: Category[], mode: Mode): Record<string, number> {
  const w: Record<string, number> = Object.fromEntries(usable.map((c) => [c, 1]));
  if (mode === 'party') {
    const fun = usable.filter((c) => FUN_CATEGORIES.includes(c));
    const trivia = usable.length - fun.length;
    if (fun.length > 0 && trivia > 0) {
      const boost = (PARTY_FUN_SHARE * trivia) / ((1 - PARTY_FUN_SHARE) * fun.length);
      for (const c of fun) w[c] = boost;
    }
  }
  return w;
}

export function spin(
  bank: Question[],
  categories: Category[],
  /** Categories already landed on this game (one entry per round). */
  history: Category[],
  used: Set<string>,
  rng: Rng,
  opts: { canUseKyf: boolean; mode?: Mode; onlyCustom?: boolean },
): SpinResult {
  let usable = categories.filter((c) => bank.some((q) => q.category === c));
  if (!opts.canUseKyf) usable = usable.filter((c) => c !== 'kyf');
  if (usable.length === 0) throw new Error('No playable categories are enabled');

  const weights = baseWeights(usable, opts.mode ?? 'classic');
  for (const c of history) if (c in weights) weights[c] *= REPEAT_DECAY;
  const total = usable.reduce((s, c) => s + weights[c], 0);
  let roll = rng() * total;
  let category = usable[usable.length - 1];
  for (const c of usable) {
    roll -= weights[c];
    if (roll < 0) {
      category = c;
      break;
    }
  }
  // The wheel shows a "Random" slice too; landing there is just a different way of
  // revealing the same pick, so it never changes the odds.
  const slice: WheelSlice = rng() < 1 / (usable.length + 1) ? 'random' : category;
  const question = pickQuestion(bank, category, used, rng, opts.canUseKyf ? undefined : (q) => q.type !== 'SUBJECT_JUDGED', {
    onlyCustom: opts.onlyCustom,
  })!;
  return { slice, category, question };
}
