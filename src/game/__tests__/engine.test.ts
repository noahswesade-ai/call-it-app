import { ALL_QUESTIONS } from '@/content/questions';
import { availableCategories } from '@/content/categories';
import { createGame, currentUnderdog, DURATIONS, FREE_MAX_PLAYERS, inPressure, rankings, reduce, type GameState } from '../engine';
import { seededRng } from '../rng';
import type { GameSettings, Player } from '../types';

const avatar = { animal: 'cat', color: 'orange' };

function player(id: string, extra: Partial<Player> = {}): Player {
  return { id, name: id, avatar, isHost: false, playing: true, premium: false, joinOrder: 0, connected: true, ...extra };
}

function settings(extra: Partial<GameSettings> = {}): GameSettings {
  return {
    mode: 'party',
    spicy: false,
    rounds: 10,
    categories: availableCategories('party', false),
    ...extra,
  };
}

function newGame(n: number, s: Partial<GameSettings> = {}, hostExtra: Partial<Player> = {}): GameState {
  let g = createGame({ code: 'ABCD', host: player('h', { isHost: true, ...hostExtra }), settings: settings(s), bank: ALL_QUESTIONS });
  for (let i = 1; i < n; i++) g = reduce(g, { type: 'join', player: player(`p${i}`) });
  return g;
}

/** Drives timers and bets until the phase changes to `challenge` (or podium). */
function toChallenge(g: GameState, now: number, rng = seededRng(1)): [GameState, number] {
  let t = now;
  let guard = 0;
  while (g.phase !== 'challenge' && g.phase !== 'podium' && guard++ < 100) {
    if (g.phase === 'betting') {
      for (const id of g.round!.bettors) {
        if (!(id in g.round!.bets) && g.phase === 'betting') {
          g = reduce(g, { type: 'bet', playerId: id, pick: rng() < 0.5 ? 'A' : 'B', now: t }, rng);
        }
      }
    } else {
      t = (g.phaseEndsAt ?? t) + 1;
      g = reduce(g, { type: 'tick', now: t }, rng);
    }
  }
  return [g, t];
}

describe('engine', () => {
  it('plays a full 10-round game to the podium, with everyone getting a turn', () => {
    const rng = seededRng(42);
    let g = newGame(6);
    let now = 1000;
    g = reduce(g, { type: 'start', now }, rng);
    expect(g.phase).toBe('matchup');
    for (let r = 1; r <= 10; r++) {
      [g, now] = toChallenge(g, now, rng);
      expect(g.phase).toBe('challenge');
      expect(g.round!.number).toBe(r);
      g = reduce(g, { type: 'judge', by: g.round!.judgeId, outcome: 'A', now }, rng);
      expect(g.phase).toBe('result');
      now += DURATIONS.result + 1;
      g = reduce(g, { type: 'tick', now }, rng);
    }
    expect(g.phase).toBe('podium');
    expect(g.history).toHaveLength(10);
    for (const p of g.players) expect(g.timesChosen[p.id]).toBeGreaterThanOrEqual(1);
    const ranks = rankings(g);
    expect(ranks[0].rank).toBe(1);
    expect(ranks[0].totals.points).toBeGreaterThanOrEqual(ranks[ranks.length - 1].totals.points);
  });

  it('betting ends early once everyone has voted, otherwise after 30s', () => {
    const rng = seededRng(7);
    let g = reduce(newGame(5), { type: 'start', now: 0 }, rng);
    g = reduce(g, { type: 'tick', now: DURATIONS.matchup + 1 }, rng);
    const tSpinEnd = g.phaseEndsAt! + 1;
    g = reduce(g, { type: 'tick', now: tSpinEnd }, rng);
    expect(g.phase).toBe('betting');
    expect(g.phaseEndsAt).toBe(tSpinEnd + DURATIONS.betting);
    expect(inPressure(g, tSpinEnd + 19_000)).toBe(false);
    expect(inPressure(g, tSpinEnd + 21_000)).toBe(true);

    const [first, ...rest] = g.round!.bettors;
    g = reduce(g, { type: 'bet', playerId: first, pick: 'A', now: tSpinEnd + 100 }, rng);
    expect(g.phase).toBe('betting');
    // Changing a bet is not allowed.
    g = reduce(g, { type: 'bet', playerId: first, pick: 'B', now: tSpinEnd + 200 }, rng);
    expect(g.round!.bets[first]).toBe('A');
    for (const id of rest) g = reduce(g, { type: 'bet', playerId: id, pick: 'NONE', now: tSpinEnd + 300 }, rng);
    expect(g.phase).toBe('betsReveal');
  });

  it('challengers cannot bet', () => {
    const rng = seededRng(9);
    let g = reduce(newGame(4), { type: 'start', now: 0 }, rng);
    [g] = [reduce(reduce(g, { type: 'next', now: 1 }, rng), { type: 'next', now: 2 }, rng)];
    expect(g.phase).toBe('betting');
    const c = g.round!.challengers[0];
    const after = reduce(g, { type: 'bet', playerId: c, pick: 'A', now: 3 }, rng);
    expect(after.round!.bets[c]).toBeUndefined();
  });

  it('when the host is a challenger, a bettor judges', () => {
    for (let seed = 0; seed < 50; seed++) {
      const rng = seededRng(seed);
      const g = reduce(newGame(5, { categories: ['geography'] }), { type: 'start', now: 0 }, rng);
      const r = g.round!;
      if (r.challengers.includes('h')) {
        expect(r.bettors).toContain(r.judgeId);
      } else {
        expect(r.judgeId).toBe('h');
      }
    }
  });

  it('Know Your Friends: the subject is not a challenger and judges the round', () => {
    const rng = seededRng(5);
    const g = reduce(newGame(4, { categories: ['kyf'] }), { type: 'start', now: 0 }, rng);
    const r = g.round!;
    expect(r.category).toBe('kyf');
    expect(r.subjectId).toBeDefined();
    expect(r.challengers).not.toContain(r.subjectId);
    expect(r.judgeId).toBe(r.subjectId);
  });

  it('a spectating host is never a challenger and never bets', () => {
    for (let seed = 0; seed < 30; seed++) {
      const rng = seededRng(seed);
      let g = newGame(4);
      g = reduce(g, { type: 'setHostPlaying', playing: false });
      g = reduce(g, { type: 'start', now: 0 }, rng);
      expect(g.round!.challengers).not.toContain('h');
      expect(g.round!.bettors).not.toContain('h');
    }
  });

  it('free hosts are capped at 10 players; Premium hosts are not', () => {
    const free = newGame(12);
    expect(free.players).toHaveLength(FREE_MAX_PLAYERS);
    const premium = newGame(12, {}, { premium: true });
    expect(premium.players).toHaveLength(12);
  });

  it('host leaving passes host to the next player who joined', () => {
    let g = newGame(3);
    g = reduce(g, { type: 'leave', playerId: 'h' });
    expect(g.hostId).toBe('p1');
    expect(g.players.find((p) => p.id === 'p1')!.isHost).toBe(true);
  });

  it('skipping a round does not count as a turn', () => {
    const rng = seededRng(11);
    let g = reduce(newGame(4), { type: 'start', now: 0 }, rng);
    const [a, b] = g.round!.challengers;
    g = reduce(g, { type: 'skipRound', now: 10 }, rng);
    expect(g.history[0].skipped).toBe(true);
    expect(g.round!.number).toBe(2);
    // a and b only count if picked again for round 2
    const again = g.round!.challengers;
    expect(g.timesChosen[a]).toBe(again.includes(a) ? 1 : 0);
    expect(g.timesChosen[b]).toBe(again.includes(b) ? 1 : 0);
  });

  it('rematch resets scores but keeps players and avoids repeated questions', () => {
    const rng = seededRng(2);
    let g = reduce(newGame(3), { type: 'start', now: 0 }, rng);
    const usedBefore = g.usedQuestions.length;
    g = reduce(g, { type: 'rematch' });
    expect(g.phase).toBe('lobby');
    expect(g.players).toHaveLength(3);
    expect(g.usedQuestions.length).toBe(usedBefore);
    expect(Object.values(g.totals).every((t) => t.points === 0)).toBe(true);
  });

  it('the same category never appears three times in a row', () => {
    const rng = seededRng(99);
    let g = reduce(newGame(6, { rounds: 40 }, { premium: true }), { type: 'start', now: 0 }, rng);
    let now = 0;
    for (let i = 0; i < 39; i++) {
      [g, now] = toChallenge(g, now, rng);
      g = reduce(g, { type: 'judge', by: g.hostId, outcome: 'B', now }, rng);
      now += DURATIONS.result + 1;
      g = reduce(g, { type: 'tick', now }, rng);
    }
    const cats = g.recentCategories;
    for (let i = 2; i < cats.length; i++) {
      expect(cats[i] === cats[i - 1] && cats[i] === cats[i - 2]).toBe(false);
    }
  });
});

describe('Underdog reveal', () => {
  it('gives the reveal extra time when an Underdog appears', () => {
    const rng = seededRng(4);
    let g = reduce(newGame(6, { mode: 'classic' }), { type: 'start', now: 0 }, rng);
    g = reduce(g, { type: 'next', now: 1 }, rng);
    g = reduce(g, { type: 'next', now: 2 }, rng);
    expect(g.phase).toBe('betting');
    const [first, ...rest] = g.round!.bettors;
    g = reduce(g, { type: 'bet', playerId: first, pick: 'A', now: 3 }, rng);
    for (const id of rest) g = reduce(g, { type: 'bet', playerId: id, pick: 'B', now: 3 }, rng);
    expect(g.phase).toBe('betsReveal');
    expect(currentUnderdog(g)).toBe('A');
    expect(g.phaseEndsAt).toBe(3 + DURATIONS.underdogReveal);
  });
});
