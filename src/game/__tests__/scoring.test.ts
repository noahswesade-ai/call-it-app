import { scoreRound, underdogSide, type RoundScoreInput } from '../scoring';
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
    ...overrides,
  });
}

describe('underdogSide', () => {
  it('is the side with less than 33% of the side-picking bettors', () => {
    const s = bets('ABBB'); // 25%
    expect(underdogSide(s.bettors, s.bets)).toBe('A');
    const t = bets('AAAAB'); // 20%
    expect(underdogSide(t.bettors, t.bets)).toBe('B');
    const v = bets('ABBBBBA'.slice(0, 7)); // 2 of 7 ≈ 28.6%
    expect(underdogSide(v.bettors, v.bets)).toBe('A');
  });
  it('exactly one third (33.3%) is NOT an Underdog', () => {
    const s = bets('ABBABB'); // 2 of 6
    expect(underdogSide(s.bettors, s.bets)).toBeUndefined();
  });
  it('does not exist on a close split', () => {
    const s = bets('AABB');
    expect(underdogSide(s.bettors, s.bets)).toBeUndefined();
    const t = bets('ABBBA'); // 2 of 5 = 40%
    expect(underdogSide(t.bettors, t.bets)).toBeUndefined();
  });
  it('a challenger with zero votes is always the Underdog, even in small rooms', () => {
    const s = bets('BB');
    expect(underdogSide(s.bettors, s.bets)).toBe('A');
    const t = bets('B');
    expect(underdogSide(t.bettors, t.bets)).toBe('A');
    const u = bets('AAA-');
    expect(underdogSide(u.bettors, u.bets)).toBe('B');
  });
  it('No Votes do not count toward the share', () => {
    const s = bets('ABB--'); // 1 of 3 = 33.3% → not under 33%
    expect(underdogSide(s.bettors, s.bets)).toBeUndefined();
    const u = bets('ABBB--'); // 25%
    expect(underdogSide(u.bettors, u.bets)).toBe('A');
  });
  it('nobody picked a side → no Underdog', () => {
    const s = bets('--');
    expect(underdogSide(s.bettors, s.bets)).toBeUndefined();
  });
  it('a challenger nobody backed is the Underdog', () => {
    const s = bets('BBBB');
    expect(underdogSide(s.bettors, s.bets)).toBe('A');
  });
});

describe('Classic mode — Underdog ×3 on points', () => {
  it('normal round: winner +1, correct bettors +1', () => {
    const s = run('AABB', { mode: 'classic' });
    expect(s.multiplier).toBe(1);
    expect(s.perPlayer.ca).toMatchObject({ result: 'challengerWin', points: 1 });
    expect(s.perPlayer.cb).toMatchObject({ result: 'challengerLoss', points: 0 });
    expect(s.perPlayer.b0.points).toBe(1);
    expect(s.perPlayer.b2.points).toBe(0);
  });

  it('Underdog wins: everyone who backed them gets 3', () => {
    const s = run('ABBB', { mode: 'classic' });
    expect(s.underdog).toBe('A');
    expect(s.multiplier).toBe(3);
    expect(s.perPlayer.b0.points).toBe(3);
    expect(s.perPlayer.b1.points).toBe(0);
  });

  it('Underdog loses: no multiplier', () => {
    const s = run('ABBB', { mode: 'classic', outcome: 'B' });
    expect(s.underdog).toBe('A');
    expect(s.multiplier).toBe(1);
    expect(s.perPlayer.b1.points).toBe(1);
  });

  it('Classic mode never has sips', () => {
    const s = run('ABBB-', { mode: 'classic' });
    for (const p of Object.values(s.perPlayer)) expect(p.sips).toBe(0);
  });

  it('final round doubles everything, including the Underdog bonus', () => {
    const s = run('ABBB', { mode: 'classic', isFinalRound: true });
    expect(s.perPlayer.ca.points).toBe(2);
    expect(s.perPlayer.b0.points).toBe(6);
  });
});

describe('Party mode — Underdog ×3 on sips', () => {
  it('every drink is 1 sip: wrong bet, No Vote and the losing challenger', () => {
    const s = run('AAB-');
    expect(s.perPlayer.b2.sips).toBe(1);
    expect(s.perPlayer.b3).toMatchObject({ result: 'noVote', sips: 1, points: 0 });
    expect(s.perPlayer.cb.sips).toBe(1);
    expect(s.perPlayer.ca.sips).toBe(0);
  });

  it('when the Underdog wins, the beaten favourite drinks 3 too', () => {
    expect(run('ABBB').perPlayer.cb.sips).toBe(3);
  });

  it('Underdog wins: backers score 3 points, everyone against them drinks 3', () => {
    const s = run('ABBB');
    expect(s.multiplier).toBe(3);
    expect(s.perPlayer.b1.sips).toBe(3);
    expect(s.perPlayer.b3.sips).toBe(3);
    expect(s.perPlayer.b0).toMatchObject({ points: 3, sips: 0 });
  });

  it('Party keeps the same points as Classic; sips mirror the points', () => {
    const party = run('AAB');
    const classic = run('AAB', { mode: 'classic' });
    expect(party.perPlayer.b0.points).toBe(classic.perPlayer.b0.points);
    expect(party.perPlayer.b2.sips).toBe(party.perPlayer.b0.points);
  });

  it('No Vote is not multiplied', () => {
    const s = run('ABBB-');
    expect(s.perPlayer.b4.sips).toBe(1);
  });

  it('final round doubles sips (Underdog: 6)', () => {
    const s = run('ABBB-', { isFinalRound: true });
    expect(s.perPlayer.b1.sips).toBe(6);
    expect(s.perPlayer.b4.sips).toBe(2);
    expect(s.perPlayer.cb.sips).toBe(6);
  });

  it('draw: nobody scores, both challengers drink 1', () => {
    const s = run('AB-', { outcome: 'DRAW' });
    expect(s.perPlayer.ca).toMatchObject({ result: 'draw', points: 0, sips: 1 });
    expect(s.perPlayer.cb).toMatchObject({ result: 'draw', points: 0, sips: 1 });
    expect(s.perPlayer.b0).toMatchObject({ points: 0, sips: 0 });
    expect(s.perPlayer.b2.sips).toBe(1);
  });

  it('a missing bet (timer ran out) counts as No Vote', () => {
    const s = scoreRound({
      mode: 'party',
      challengers: ['ca', 'cb'],
      bettors: ['x'],
      bets: {},
      outcome: 'B',
      isFinalRound: false,
    });
    expect(s.perPlayer.x).toMatchObject({ result: 'noVote', sips: 1 });
  });
});
