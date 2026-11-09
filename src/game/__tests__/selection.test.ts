import { notEveryoneWillPlay, pairKey, pickChallengers, pickSubject, weightFor } from '../selection';
import { seededRng } from '../rng';

function simulate(players: number, rounds: number, seed: number) {
  const rng = seededRng(seed);
  const pool = Array.from({ length: players }, (_, i) => `p${i}`);
  const timesChosen: Record<string, number> = {};
  const usedPairs = new Set<string>();
  let lastPair: [string, string] | undefined;
  let backToBack = 0;
  for (let r = 0; r < rounds; r++) {
    const pair = pickChallengers({ pool, timesChosen, roundsLeft: rounds - r, lastPair, usedPairs, rng });
    expect(pair[0]).not.toBe(pair[1]);
    if (lastPair && pair.some((id) => lastPair!.includes(id))) backToBack++;
    for (const id of pair) timesChosen[id] = (timesChosen[id] ?? 0) + 1;
    usedPairs.add(pairKey(pair[0], pair[1]));
    lastPair = pair;
  }
  return { pool, timesChosen, backToBack };
}

describe('weights', () => {
  it('decrease each time a player is chosen', () => {
    expect(weightFor(0)).toBe(1);
    expect(weightFor(1)).toBe(0.25);
    expect(weightFor(2)).toBeCloseTo(1 / 9);
  });
});

describe('pickChallengers — 10,000 simulated games', () => {
  it('gives everyone a turn whenever the round count allows it (3–20 players, 10 rounds)', () => {
    let games = 0;
    for (let players = 3; players <= 20; players++) {
      for (let seed = 0; seed < 560; seed++) {
        const { pool, timesChosen } = simulate(players, 10, seed * 7919 + players);
        for (const id of pool) expect(timesChosen[id] ?? 0).toBeGreaterThanOrEqual(1);
        games++;
      }
    }
    expect(games).toBeGreaterThanOrEqual(10_000);
  });

  it('keeps turns even: nobody plays more than 2 more times than anyone else', () => {
    for (let players = 3; players <= 10; players++) {
      for (let seed = 0; seed < 200; seed++) {
        const { pool, timesChosen } = simulate(players, 10, seed);
        const counts = pool.map((id) => timesChosen[id] ?? 0);
        expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(2);
      }
    }
  });

  it('avoids back-to-back turns when there are enough players', () => {
    for (let seed = 0; seed < 200; seed++) {
      expect(simulate(6, 10, seed).backToBack).toBe(0);
    }
  });

  it('works with exactly 2 players', () => {
    const { timesChosen } = simulate(2, 10, 1);
    expect(timesChosen).toEqual({ p0: 10, p1: 10 });
  });

  it('covers up to 30 players when Premium rounds allow it', () => {
    for (let seed = 0; seed < 100; seed++) {
      const { pool, timesChosen } = simulate(30, 15, seed);
      for (const id of pool) expect(timesChosen[id]).toBeGreaterThanOrEqual(1);
    }
  });

  it('with too few rounds (Premium choice), still never repeats a player before everyone has played', () => {
    for (let seed = 0; seed < 100; seed++) {
      const { timesChosen } = simulate(18, 6, seed);
      const counts = Object.values(timesChosen);
      expect(counts.length).toBe(12);
      expect(Math.max(...counts)).toBe(1);
    }
  });
});

describe('notEveryoneWillPlay', () => {
  it('warns only when rounds × 2 < players', () => {
    expect(notEveryoneWillPlay(18, 6)).toBe(true);
    expect(notEveryoneWillPlay(20, 10)).toBe(false);
    expect(notEveryoneWillPlay(10, 10)).toBe(false);
  });
});

describe('pickSubject', () => {
  it('never picks a challenger', () => {
    const rng = seededRng(3);
    for (let i = 0; i < 500; i++) {
      const s = pickSubject(['a', 'b', 'c', 'd'], ['a', 'b'], {}, rng);
      expect(['c', 'd']).toContain(s);
    }
  });
  it('returns undefined when nobody else is in the room', () => {
    expect(pickSubject(['a', 'b'], ['a', 'b'], {}, seededRng(1))).toBeUndefined();
  });
});
