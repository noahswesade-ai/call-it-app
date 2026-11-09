import { scoreRound, type RoundScoreInput } from '../scoring';
import type { Pick } from '../types';

function bets(spec: string): { bettors: string[]; bets: Record<string, Pick> } {
  // spec like "AAAB-" → bettors b0..b4; '-' = No Vote
  const bettors = spec.split('').map((_, i) => `b${i}`);
  const map: Record<string, Pick> = {};
  spec.split('').forEach((c, i) => {
    map[`b${i}`] = c === '-' ? 'NONE' : (c as Pick);
  });
  return { bettors, bets: map };
}

function run(spec: string, overrides: Partial<RoundScoreInput> = {}) {
  return scoreRound({
    mode: 'party',
    challengers: ['ca', 'cb'],
    ...bets(spec),
    outcome: 'A',
    isFinalRound: false,
    loserSips: 2,
    finalShotRule: false,
    ...overrides,
  });
}

describe('scoreRound — points', () => {
  it('gives the winning challenger +1 and correct bettors +1 on a normal split', () => {
    const s = run('AABB');
    expect(s.multiplier).toBe(1);
    expect(s.perPlayer.ca).toMatchObject({ result: 'challengerWin', points: 1 });
    expect(s.perPlayer.cb).toMatchObject({ result: 'challengerLoss', points: 0 });
    expect(s.perPlayer.b0.points).toBe(1);
    expect(s.perPlayer.b2.points).toBe(0);
  });

  it('underdog bonus: ≤25% backing → +2 for correct bettors', () => {
    const s = run('ABBB'); // 1/4 = 25%
    expect(s.winnerShare).toBe(0.25);
    expect(s.multiplier).toBe(2);
    expect(s.perPlayer.b0.points).toBe(2);
  });

  it('severe underdog: ≤10% backing → +3', () => {
    const s = run('ABBBBBBBBBB'); // 1/11 ≈ 9%
    expect(s.multiplier).toBe(3);
    expect(s.perPlayer.b0.points).toBe(3);
  });

  it('nobody backed the winner → ×3 drinks for everyone who picked the loser', () => {
    const s = run('BBBB');
    expect(s.winnerShare).toBe(0);
    expect(s.multiplier).toBe(3);
    expect(s.perPlayer.b0.sips).toBe(3);
  });

  it('no multiplier with fewer than 4 side-picking bettors', () => {
    expect(run('ABB').multiplier).toBe(1);
    expect(run('ABBB-').multiplier).toBe(2); // No Votes don't count toward the 4
    expect(run('ABB--').multiplier).toBe(1);
  });

  it('No Votes are excluded from the underdog %', () => {
    const s = run('ABBB---');
    expect(s.winnerShare).toBe(0.25);
  });
});

describe('scoreRound — Party drinks', () => {
  it('wrong bet = 1 sip, No Vote = 1 sip, loser = host setting', () => {
    const s = run('AAB-');
    expect(s.perPlayer.b2.sips).toBe(1);
    expect(s.perPlayer.b3).toMatchObject({ result: 'noVote', sips: 1, points: 0 });
    expect(s.perPlayer.cb.sips).toBe(2);
    expect(s.perPlayer.ca.sips).toBe(0);
  });

  it('wrong bettors drink 2 when the winner had ≤25%', () => {
    expect(run('ABBB').perPlayer.b1.sips).toBe(2);
  });

  it('Classic mode never has sips', () => {
    const s = run('ABBB-', { mode: 'classic' });
    for (const p of Object.values(s.perPlayer)) expect(p.sips).toBe(0);
  });

  it('final round doubles points and sips', () => {
    const s = run('ABBB-', { isFinalRound: true });
    expect(s.perPlayer.ca.points).toBe(2);
    expect(s.perPlayer.b0.points).toBe(4);
    expect(s.perPlayer.b1.sips).toBe(4);
    expect(s.perPlayer.b4.sips).toBe(2);
    expect(s.perPlayer.cb.sips).toBe(4);
  });

  it('final-round shot house rule replaces the loser’s sips with a shot', () => {
    const s = run('AABB', { isFinalRound: true, finalShotRule: true });
    expect(s.perPlayer.cb).toMatchObject({ sips: 0, shot: true });
    expect(s.perPlayer.b2.sips).toBe(2); // bettors still doubled
  });

  it('draw: nobody scores, both challengers drink the loser amount', () => {
    const s = run('AB-', { outcome: 'DRAW' });
    expect(s.perPlayer.ca).toMatchObject({ result: 'draw', points: 0, sips: 2 });
    expect(s.perPlayer.cb).toMatchObject({ result: 'draw', points: 0, sips: 2 });
    expect(s.perPlayer.b0).toMatchObject({ points: 0, sips: 0 });
    expect(s.perPlayer.b2.sips).toBe(1); // No Vote still drinks
  });

  it('a missing bet (timer ran out) counts as No Vote', () => {
    const s = scoreRound({
      mode: 'party',
      challengers: ['ca', 'cb'],
      bettors: ['x'],
      bets: {},
      outcome: 'B',
      isFinalRound: false,
      loserSips: 1,
      finalShotRule: false,
    });
    expect(s.perPlayer.x).toMatchObject({ result: 'noVote', sips: 1 });
  });
});
