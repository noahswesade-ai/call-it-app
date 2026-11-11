import { ALL_QUESTIONS } from '@/content/questions';
import { availableCategories } from '@/content/categories';
import { createGame, currentUnderdog, customOnlyStatus, DURATIONS, FREE_MAX_PLAYERS, inPressure, rankings, reduce, type GameState } from '../engine';
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
    } else if (g.phaseEndsAt === undefined) {
      // Untimed screens wait for the host's tap.
      t += 1;
      g = reduce(g, { type: 'next', now: t }, rng);
    } else {
      t = g.phaseEndsAt + 1;
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
    expect(g.phaseEndsAt).toBeUndefined(); // the VS screen waits for a tap
    g = reduce(g, { type: 'tick', now: 999_999 }, rng);
    expect(g.phase).toBe('matchup');
    g = reduce(g, { type: 'next', now: 1 }, rng);
    expect(g.phase).toBe('spin');
    const tSpinEnd = 2;
    g = reduce(g, { type: 'next', now: tSpinEnd }, rng);
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

  it('the host runs every round they are not playing in; otherwise a stand-in host does', () => {
    let standIns = 0;
    for (let seed = 0; seed < 60; seed++) {
      const rng = seededRng(seed);
      const g = reduce(newGame(5, { categories: ['geography'] }), { type: 'start', now: 0 }, rng);
      const r = g.round!;
      if (r.challengers.includes('h')) {
        standIns++;
        expect(r.judgeId).not.toBe('h');
        expect(r.challengers).not.toContain(r.judgeId);
      } else {
        expect(r.judgeId).toBe('h');
      }
    }
    expect(standIns).toBeGreaterThan(0);
  });

  it('a challenging host cannot judge their own face-off', () => {
    for (let seed = 0; seed < 60; seed++) {
      const rng = seededRng(seed);
      let g = reduce(newGame(4, { categories: ['geography'] }), { type: 'start', now: 0 }, rng);
      if (!g.round!.challengers.includes('h')) continue;
      [g] = toChallenge(g, 0, rng);
      const before = g;
      g = reduce(g, { type: 'judge', by: 'h', outcome: 'A', now: 1 }, rng);
      expect(g).toBe(before);
      g = reduce(g, { type: 'judge', by: g.round!.judgeId, outcome: 'A', now: 1 }, rng);
      expect(g.phase).toBe('result');
      return;
    }
    throw new Error('no seed put the host in a face-off');
  });

  it('Know Your Friends: the subject is not a challenger and judges the round', () => {
    const rng = seededRng(5);
    const g = reduce(newGame(4, { categories: ['kyf'] }), { type: 'start', now: 0 }, rng);
    const r = g.round!;
    expect(r.category).toBe('kyf');
    expect(r.subjectId).toBeDefined();
    expect(r.challengers).not.toContain(r.subjectId);
    expect(r.challengers.includes('h') ? r.judgeId !== 'h' : r.judgeId === 'h').toBe(true);
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

});

describe('Underdog reveal', () => {
  it('detects the Underdog when bets are revealed', () => {
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
    expect(g.phaseEndsAt).toBeUndefined(); // the reveal waits for the host's tap
  });
});

describe('pause, kick and category odds', () => {
  it('pausing freezes the timer and resuming restores the time left', () => {
    const rng = seededRng(1);
    let g = reduce(newGame(4), { type: 'start', now: 0 }, rng);
    g = reduce(g, { type: 'next', now: 1 }, rng);
    g = reduce(g, { type: 'next', now: 2 }, rng); // betting, ends at 2 + 30s
    expect(g.phase).toBe('betting');
    g = reduce(g, { type: 'pause', now: 10_002 }, rng); // 20s left
    g = reduce(g, { type: 'tick', now: 999_999 }, rng);
    expect(g.phase).toBe('betting');
    g = reduce(g, { type: 'resume', now: 500_000 }, rng);
    expect(g.phaseEndsAt).toBe(520_000);
  });

  it('a kicked player is removed and cannot rejoin', () => {
    let g = newGame(4);
    g = reduce(g, { type: 'kick', playerId: 'p2' });
    expect(g.players.map((p) => p.id)).not.toContain('p2');
    g = reduce(g, { type: 'join', player: player('p2') });
    expect(g.players.map((p) => p.id)).not.toContain('p2');
  });

  it('the host cannot be kicked', () => {
    const g = reduce(newGame(3), { type: 'kick', playerId: 'h' });
    expect(g.players.map((p) => p.id)).toContain('h');
  });

  it('classic: every category is equally likely on the first spin', () => {
    const { spin } = jest.requireActual('@/content/picker');
    const cats = availableCategories('classic', false);
    const counts: Record<string, number> = {};
    const rng = seededRng(7);
    const N = 14000;
    for (let i = 0; i < N; i++) {
      const r = spin(ALL_QUESTIONS, cats, [], new Set(), rng, { canUseKyf: true, mode: 'classic' });
      counts[r.category] = (counts[r.category] ?? 0) + 1;
    }
    for (const c of cats) expect(counts[c] / N).toBeCloseTo(1 / cats.length, 1);
  });

  it('party: Party/Spicy/Physical/Know Your Friends come up about 70% of the time', () => {
    const { spin, FUN_CATEGORIES } = jest.requireActual('@/content/picker');
    const rng = seededRng(8);
    for (const spicy of [true, false]) {
      const cats = availableCategories('party', spicy);
      let fun = 0;
      const N = 10000;
      for (let i = 0; i < N; i++) {
        const r = spin(ALL_QUESTIONS, cats, [], new Set(), rng, { canUseKyf: true, mode: 'party' });
        if (FUN_CATEGORIES.includes(r.category)) fun++;
      }
      expect(fun / N).toBeGreaterThan(0.66);
      expect(fun / N).toBeLessThan(0.74);
    }
  });

  it('a category that already came up this game becomes less likely', () => {
    const { spin } = jest.requireActual('@/content/picker');
    const cats = availableCategories('classic', false);
    const rng = seededRng(11);
    let geo = 0;
    const N = 14000;
    for (let i = 0; i < N; i++) {
      if (spin(ALL_QUESTIONS, cats, ['geography', 'geography'], new Set(), rng, { canUseKyf: true }).category === 'geography') geo++;
    }
    expect(geo / N).toBeLessThan(0.6 / cats.length);
  });

  it('over a full game every category gets a turn (including Know Your Friends)', () => {
    const rng = seededRng(12);
    const counts: Record<string, number> = {};
    for (let game = 0; game < 50; game++) {
      let g = reduce(newGame(6, { rounds: 10, categories: availableCategories('classic', false) }), { type: 'start', now: 0 }, rng);
      for (let i = 0; i < 10 && g.round; i++) {
        counts[g.round.category] = (counts[g.round.category] ?? 0) + 1;
        g = reduce(g, { type: 'skipRound', now: i }, rng);
      }
    }
    expect(counts.kyf).toBeGreaterThan(40);
  });

  it('streaks count consecutive wins and reset on a miss', () => {
    const rng = seededRng(3);
    const X = 'p1';
    let g = reduce(newGame(5, { categories: ['geography'], rounds: 10 }), { type: 'start', now: 0 }, rng);
    const playRound = (xWins: boolean) => {
      let t = 0;
      while (g.phase !== 'challenge') {
        if (g.phase === 'betting') {
          for (const id of g.round!.bettors) if (g.phase === 'betting') g = reduce(g, { type: 'bet', playerId: id, pick: 'A', now: t }, rng);
        } else g = reduce(g, { type: 'next', now: ++t }, rng);
      }
      const r = g.round!;
      const xSide = r.challengers[0] === X ? 'A' : r.challengers[1] === X ? 'B' : 'A';
      const outcome = xWins ? xSide : xSide === 'A' ? 'B' : 'A';
      g = reduce(g, { type: 'judge', by: r.judgeId, outcome, now: ++t }, rng);
      const involved = r.challengers.includes(X) || r.bettors.includes(X);
      g = reduce(g, { type: 'next', now: ++t }, rng);
      return involved;
    };
    let n = 0;
    while (n < 3) if (playRound(true)) n++;
    expect(g.totals[X].streak).toBe(3);
    while (!playRound(false));
    expect(g.totals[X].streak).toBe(0);
    expect(g.totals[X].bestStreak).toBe(3);
  });

  it('free hosts can swap the question once per game, Premium hosts any number of times', () => {
    const rng = seededRng(4);
    let g = reduce(newGame(4, { categories: ['history'] }), { type: 'start', now: 0 }, rng);
    const first = g.round!.question;
    g = reduce(g, { type: 'regenQuestion', now: 1 }, rng);
    expect(g.round!.question.id).not.toBe(first.id);
    expect(g.round!.question.category).toBe('history');
    expect(g.round!.question.difficulty).toBe(first.difficulty);
    const second = g.round!.question.id;
    g = reduce(g, { type: 'regenQuestion', now: 2 }, rng);
    expect(g.round!.question.id).toBe(second);

    let p = reduce(newGame(4, { categories: ['history'] }, { premium: true }), { type: 'start', now: 0 }, rng);
    const seen = new Set([p.round!.question.id]);
    for (let i = 0; i < 4; i++) {
      p = reduce(p, { type: 'regenQuestion', now: i }, rng);
      seen.add(p.round!.question.id);
    }
    expect(seen.size).toBe(5);
  });

  it('questions seen earlier in the session are not asked again', () => {
    const rng = seededRng(9);
    const geo = ALL_QUESTIONS.filter((q) => q.category === 'geography');
    const keep = geo[geo.length - 1].id;
    let g = newGame(4, { categories: ['geography'] });
    g = reduce(g, { type: 'seen', ids: geo.filter((q) => q.id !== keep).map((q) => q.id) });
    g = reduce(g, { type: 'start', now: 0 }, rng);
    expect(g.round!.question.id).toBe(keep);
  });

  it('a player who disconnects is removed and no longer blocks the vote', () => {
    const rng = seededRng(2);
    let g = reduce(newGame(5, { categories: ['geography'] }), { type: 'start', now: 0 }, rng);
    g = reduce(g, { type: 'next', now: 1 }, rng);
    g = reduce(g, { type: 'next', now: 2 }, rng);
    expect(g.phase).toBe('betting');
    const [last, ...rest] = [...g.round!.bettors].reverse();
    for (const id of rest) g = reduce(g, { type: 'bet', playerId: id, pick: 'A', now: 3 }, rng);
    expect(g.phase).toBe('betting');
    g = reduce(g, { type: 'leave', playerId: last }, rng);
    expect(g.phase).toBe('betsReveal');
    expect(g.players.map((p) => p.id)).not.toContain(last);
  });

  it('another phone can take over as host; the old host is removed', () => {
    let g = newGame(4);
    g = reduce(g, { type: 'takeOver', newHostId: 'p1' });
    expect(g.hostId).toBe('p1');
    expect(g.players.find((p) => p.id === 'p1')!.isHost).toBe(true);
    expect(g.players.map((p) => p.id)).not.toContain('h');
    expect(g.epoch).toBe(1);
  });

  it('a lobby can add its own questions only when the host has Premium, without duplicates', () => {
    const q = { id: 'custom-1', category: 'geography' as const, type: 'SPOKEN_EXACT' as const, difficulty: 'M' as const, prompt: 'Our town?', answer: 'Here' };
    let g = reduce(newGame(3), { type: 'addCustom', question: q });
    expect(g.custom ?? []).toHaveLength(0);
    g = reduce(newGame(3, {}, { premium: true }), { type: 'addCustom', question: q });
    g = reduce(g, { type: 'addCustomMany', questions: [q, { ...q, id: 'c2', prompt: '  our   TOWN? ' }, { ...q, id: 'c3', prompt: 'Our street?' }] });
    expect(g.custom!.map((x) => x.prompt)).toEqual(['Our town?', 'Our street?']);
  });

  it("the lobby's questions survive into the next game", () => {
    const q = { id: 'custom-1', category: 'geography' as const, type: 'SPOKEN_EXACT' as const, difficulty: 'M' as const, prompt: 'Our town?', answer: 'Here' };
    let g = reduce(newGame(4, {}, { premium: true }), { type: 'addCustom', question: q });
    g = reduce(g, { type: 'start', now: 1 }, seededRng(3));
    g = reduce(g, { type: 'backToLobby' });
    expect(g.phase).toBe('lobby');
    expect(g.custom).toHaveLength(1);
    g = reduce(g, { type: 'rematch' });
    expect(g.custom).toHaveLength(1);
  });

  it('the wheel strongly prefers the lobby\'s own questions in the category it lands on', () => {
    const cats = ['geography' as const];
    let g = newGame(4, { categories: cats }, { premium: true });
    const qs = Array.from({ length: 3 }, (_, i) => ({ id: `c${i}`, category: 'geography' as const, type: 'SPOKEN_EXACT' as const, difficulty: 'M' as const, prompt: `Ours ${i}?`, answer: 'x' }));
    g = reduce(g, { type: 'addCustomMany', questions: qs });
    let custom = 0;
    for (let i = 0; i < 400; i++) {
      const s = reduce({ ...g, usedQuestions: [] }, { type: 'start', now: 1 }, seededRng(i + 1));
      if (s.round!.question.custom) custom++;
    }
    expect(custom / 400).toBeGreaterThan(0.68);
  });

  it('"only our questions" needs 10 per selected category, then uses only those', () => {
    const cats = ['geography' as const, 'history' as const];
    let g = newGame(4, { categories: cats, onlyCustom: true }, { premium: true });
    const make = (c: 'geography' | 'history', n: number) =>
      Array.from({ length: n }, (_, i) => ({ id: `${c}${i}`, category: c, type: 'SPOKEN_EXACT' as const, difficulty: 'M' as const, prompt: `${c} ${i}?`, answer: 'x' }));
    g = reduce(g, { type: 'addCustomMany', questions: [...make('geography', 10), ...make('history', 4)] });
    expect(customOnlyStatus(g).ready).toBe(false);
    expect(customOnlyStatus(g).short.map((x) => x.category)).toEqual(['history']);
    g = reduce(g, { type: 'addCustomMany', questions: make('history', 10) });
    expect(customOnlyStatus(g).ready).toBe(true);
    const rng = seededRng(5);
    let now = 1;
    g = reduce(g, { type: 'start', now }, rng);
    for (let r = 1; r <= 10; r++) {
      expect(g.round!.question.custom).toBe(true);
      [g, now] = toChallenge(g, now, rng);
      g = reduce(g, { type: 'judge', by: g.round!.judgeId, outcome: 'A', now }, rng);
      g = reduce(g, { type: 'next', now }, rng);
    }
  });

  it('the host can hand hosting to another player', () => {
    let g = newGame(3, {}, { playing: false });
    g = reduce(g, { type: 'transferHost', to: 'p2' });
    expect(g.hostId).toBe('p2');
    expect(g.players.find((p) => p.id === 'p2')!.isHost).toBe(true);
    expect(g.players.find((p) => p.id === 'h')).toMatchObject({ isHost: false, playing: true });
    expect(g.epoch).toBe(1);
  });

  it('when the host leaves (lobby or mid-game) the next connected player becomes host', () => {
    let g = newGame(4);
    g = reduce(g, { type: 'setConnected', playerId: 'p1', connected: false });
    g = reduce(g, { type: 'leave', playerId: 'h' });
    expect(g.hostId).toBe('p2');
    expect(g.epoch).toBe(1);
    let m = reduce(newGame(5), { type: 'start', now: 1 }, seededRng(2));
    m = reduce(m, { type: 'leave', playerId: 'h' });
    expect(m.hostId).toBe('p1');
    expect(m.phase).not.toBe('lobby');
  });

  it('"back to lobby" ends the game for everyone', () => {
    let g = reduce(newGame(4), { type: 'start', now: 1 }, seededRng(2));
    g = reduce(g, { type: 'pause', now: 2 });
    g = reduce(g, { type: 'backToLobby' });
    expect(g.phase).toBe('lobby');
    expect(g.round).toBeUndefined();
    expect(g.paused).toBeUndefined();
    expect(g.players).toHaveLength(4);
  });
});
