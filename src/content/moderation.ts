/**
 * Minimal filter for player-written questions (Apple 1.2 / Google UGC: "a method for
 * filtering objectionable material"). Blocks hate slurs and threats; ordinary swearing
 * is fine in an adult party game. Questions only ever reach the people in the same room,
 * and the host can remove any question. Extend this list before release.
 */
const BLOCKED: RegExp[] = [
  /\bn[i1!]gg(?:er|a|ah|az)\b/i,
  /\bf[a@]gg?(?:ot|ots|y)?\b/i,
  /\bk[i1]ke\b/i,
  /\bsp[i1]c\b/i,
  /\bch[i1]nk\b/i,
  /\bwetback\b/i,
  /\btr[a@]nn(?:y|ie)\b/i,
  /\bretard(?:ed|s)?\b/i,
  /\bkill (?:yourself|urself)\b/i,
  /\bkys\b/i,
];

export function isAllowedQuestion(text: string): boolean {
  const t = text.normalize('NFKC');
  return !BLOCKED.some((re) => re.test(t));
}
