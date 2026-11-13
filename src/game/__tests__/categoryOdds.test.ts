import { ALL_QUESTIONS } from '@/content/questions';
import { createGame, reduce, type GameState } from '@/game/engine';
import { seededRng } from '@/game/rng';
import type { Category, GameSettings, Player } from '@/game/types';
const player = (id: string, x: Partial<Player> = {}): Player => ({ id, name: id, avatar: { animal: 'dog' } as any, isHost: false, playing: true, premium: false, joinOrder: 0, connected: true, ...x });
function play(cats: Category[], mode: 'classic' | 'party', n: number, seed: number) {
  const settings: GameSettings = { mode, spicy: cats.includes('spicy'), rounds: 10, categories: cats };
  let g: GameState = createGame({ code: 'ABCD', host: player('h', { isHost: true }), settings, bank: ALL_QUESTIONS });
  for (let i = 1; i < n; i++) g = reduce(g, { type: 'join', player: player(`p${i}`) });
  const rng = seededRng(seed);
  g = reduce(g, { type: 'start', now: 1 }, rng);
  const got: string[] = [];
  let t = 1, last = 0, guard = 0;
  while (g.phase !== 'podium' && guard++ < 5000) {
    if (g.round && g.round.number !== last) { last = g.round.number; got.push(g.round.question.category); }
    t += 1000;
    if (g.phase === 'challenge') g = reduce(g, { type: 'judge', by: g.round!.judgeId, outcome: 'A', now: t }, rng);
    else if (g.phase === 'betting') for (const id of g.round!.bettors) g = reduce(g, { type: 'bet', playerId: id, pick: 'A', now: t }, rng);
    else if (g.round?.question.type === 'SUBJECT_JUDGED' && !g.round.subjectAnswer && g.round.subjectId) g = reduce(g, { type: 'subjectAnswer', playerId: g.round.subjectId, answer: 'x' }, rng);
    g = reduce(g, { type: 'next', now: t }, rng);
    g = reduce(g, { type: 'tick', now: t + 60000 }, rng);
  }
  return got;
}
const FUN = ['kyf', 'physical', 'party', 'spicy'];
describe('category odds over 300 simulated games', () => {
  const run = (cats: Category[], mode: 'classic' | 'party', n: number) => {
    const c: Record<string, number> = {}; let tot = 0; let maxTrivia = 0;
    for (let s = 1; s <= 300; s++) {
      let streak = 0;
      for (const x of play(cats, mode, n, s)) {
        c[x] = (c[x] ?? 0) + 1; tot++;
        streak = FUN.includes(x) ? 0 : streak + 1; maxTrivia = Math.max(maxTrivia, streak);
      }
    }
    const share = (k: string) => (c[k] ?? 0) / tot;
    return { share, fun: FUN.reduce((a, k) => a + share(k), 0), maxTrivia };
  };
  it('Know Your Friends comes up about half the time with only 3 categories', () => {
    expect(run(['geography', 'kyf', 'history'], 'classic', 5).share('kyf')).toBeGreaterThan(0.45);
  });
  it('Classic, all categories: fun ones ~60% of rounds, KYF > 25%, never 3 trivia rounds in a row', () => {
    const r = run(['geography', 'history', 'basic', 'popculture', 'sports', 'physical', 'kyf'], 'classic', 6);
    expect(r.fun).toBeGreaterThan(0.57);
    expect(r.share('kyf')).toBeGreaterThan(0.25);
    expect(r.maxTrivia).toBeLessThanOrEqual(2);
  });
  it('Party, all categories incl. Spicy: fun ones ~75% of rounds', () => {
    const r = run(['geography', 'history', 'basic', 'popculture', 'sports', 'physical', 'kyf', 'party', 'spicy'], 'party', 6);
    expect(r.fun).toBeGreaterThan(0.7);
    for (const k of FUN) expect(r.share(k)).toBeGreaterThan(0.12);
    expect(r.maxTrivia).toBeLessThanOrEqual(2);
  });
});
