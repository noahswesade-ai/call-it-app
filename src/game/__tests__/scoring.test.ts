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
    loserSips: 2,
    finalShotRule: false,
    ...overrides,
  });
}

describe('underdogSide', () => {
  it('is the side with 25% or less of the side-picking bettors', () => {
    const s = bets('ABBB');
    expect(underdogSide(s.bettors, s.bets)).toBe('A');
    const t = bets('AAAAB');
    expect(underdogSide(t.bettors, t.bets)).toBe('B');
  });
  it('does not exist on a close split', () => {
    const s = bets('AABB');
    expect(underdogSide(s.bettors, s.bets)).toBeUndefined();
    const t = bets('ABBBB'.slice(0, 4) + 'A'); // 2 of 5 = 40%
    expect(underdogSide(t.bettors, t.bets)).toBeUndefined();
  });
  it('needs at least 4 bettors picking a side; No Votes do not count', () => {
    const s = bets('ABB');
    expect(underdogSide(s.bettors, s.bets)).toBeUndefined();
    const t = bets('ABB--');
    expect(underdogSide(t.bettors, t.bets)).toBeUndefined();
    const u = bets('ABBB--');
    expect(underdogSide(u.bettors, u.bets)).toBe('A');
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
  it('wrong bet = 1 sip, No Vote = 1 sip, loser = host setting', () => {
    const s = run('AAB-');
    expect(s.perPlayer.b2.sips).toBe(1);
    expect(s.perPlayer.b3).toMatchObject({ result: 'noVote', sips: 1, points: 0 });
    expect(s.perPlayer.cb.sips).toBe(2);
    expect(s.perPlayer.ca.sips).toBe(0);
  });

  it('Underdog wins: everyone who bet against them drinks 3, backers still get 1 point', () => {
    const s = run('ABBB');
    expect(s.multiplier).toBe(3);
    expect(s.perPlayer.b1.sips).toBe(3);
    expect(s.perPlayer.b3.sips).toBe(3);
    expect(s.perPlayer.b0).toMatchObject({ points: 1, sips: 0 });
  });

  it('No Vote is not multiplied', () => {
    const s = run('ABBB-');
    expect(s.perPlayer.b4.sips).toBe(1);
  });

  it('final round doubles sips (Underdog: 6)', () => {
    const s = run('ABBB-', { isFinalRound: true });
    expect(s.perPlayer.b1.sips).toBe(6);
    expect(s.perPlayer.b4.sips).toBe(2);
    expect(s.perPlayer.cb.sips).toBe(4);
  });

  it('final-round shot house rule replaces the loser’s sips with a shot', () => {
    const s = run('AABB', { isFinalRound: true, finalShotRule: true });
    expect(s.perPlayer.cb).toMatchObject({ sips: 0, shot: true });
    expect(s.perPlayer.b2.sips).toBe(2);
  });

  it('draw: nobody scores, both challengers drink the loser amount', () => {
    const s = run('AB-', { outcome: 'DRAW' });
    expect(s.perPlayer.ca).toMatchObject({ result: 'draw', points: 0, sips: 2 });
    expect(s.perPlayer.cb).toMatchObject({ result: 'draw', points: 0, sips: 2 });
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
      loserSips: 1,
      finalShotRule: false,
    });
    expect(s.perPlayer.x).toMatchObject({ result: 'noVote', sips: 1 });
  });
});
