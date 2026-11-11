import type { AvatarLoadout, Category, GameSettings, Outcome, Pick, Player, Question, Rng, WheelSlice } from './types';
import { pairKey, pickChallengers, pickSubject } from './selection';
import { scoreRound, underdogSide, type RoundScore } from './scoring';
import { pickQuestion, spin } from '@/content/picker';

/**
 * The round state machine (PLAN.md §1). The host's phone owns the GameState and is
 * the only device that runs `reduce`; everyone else sends actions (bets, judging,
 * subject answers) to the host and renders the state the host publishes.
 * The state is plain JSON so it can be stored in the Supabase `rooms` row.
 */

export type Phase =
  | 'lobby'
  | 'matchup'
  | 'spin'
  | 'betting'
  | 'betsReveal'
  | 'challenge'
  | 'result'
  | 'podium';

export const DURATIONS = {
  matchup: 4000,
  /** The last round gets a longer, louder build-up. */
  finalMatchup: 6500,
  /** ~4.8s of spinning that slows to a crawl, then the category box (≈8s total). */
  spin: 8000,
  betting: 30000,
  bettingPressure: 10000, // the final 10s of betting turn red
  betsReveal: 4000,
  /** Extra time on the reveal so the Underdog Alert can play out. */
  underdogReveal: 9500,
  /** Winner, then their supporters, then the +points, then standings. */
  result: 13000,
} as const;

export const FREE_MAX_PLAYERS = 10;
export const FREE_ROUNDS = 10;

export interface RoundState {
  number: number;
  challengers: [string, string];
  bettors: string[];
  slice: WheelSlice;
  category: Category;
  question: Question;
  /** Know Your Friends subject. */
  subjectId?: string;
  /** The subject's secret answer, typed before the challenge is revealed. */
  subjectAnswer?: string;
  /** Who taps the winner. */
  judgeId: string;
  bets: Record<string, Pick>;
  answerShownToAll: boolean;
  outcome?: Outcome;
  score?: RoundScore;
  skipped?: boolean;
}

export interface PlayerTotals {
  points: number;
  sips: number;
  shots: number;
  correctBets: number;
  bonusBets: number; // correct bets with an underdog multiplier
  noVotes: number;
  challengeWins: number;
  giantSlays: number; // challenge wins as the Underdog
  /** Rounds won in a row (face-offs won or right calls). 3+ = on fire. */
  streak: number;
  bestStreak: number;
}

export interface GameState {
  code: string;
  hostId: string;
  settings: GameSettings;
  players: Player[];
  phase: Phase;
  /** Wall-clock ms when the current timed phase ends. */
  phaseEndsAt?: number;
  round?: RoundState;
  history: RoundState[];
  totals: Record<string, PlayerTotals>;
  timesChosen: Record<string, number>;
  timesSubject: Record<string, number>;
  usedPairs: string[];
  usedQuestions: string[];
  recentCategories: Category[];
  bank: Question[];
  /** Set while the host's phone is away; timers are frozen with this much time left. */
  paused?: { remaining?: number };
  /** Players the host removed; their phones can't rejoin this room. */
  kicked?: string[];
  /** Questions written by players in this lobby (Premium "custom questions"). */
  custom?: Question[];
  /** Question swaps used this game (free hosts get one). */
  regens?: number;
  /** Bumped whenever another phone takes over as host; phones ignore older states. */
  epoch?: number;
}

export type Action =
  | { type: 'join'; player: Player }
  | { type: 'leave'; playerId: string }
  | { type: 'setConnected'; playerId: string; connected: boolean }
  | { type: 'updatePlayer'; playerId: string; patch: { name?: string; avatar?: AvatarLoadout; premium?: boolean } }
  | { type: 'updateSettings'; patch: Partial<GameSettings> }
  | { type: 'setHostPlaying'; playing: boolean }
  | { type: 'start'; now: number }
  | { type: 'tick'; now: number }
  | { type: 'next'; now: number }
  | { type: 'bet'; playerId: string; pick: Pick; now: number }
  | { type: 'subjectAnswer'; playerId: string; answer: string }
  | { type: 'showAnswerToAll' }
  | { type: 'judge'; by: string; outcome: Outcome; now: number }
  | { type: 'skipRound'; now: number }
  | { type: 'swapChallenger'; out: string; now: number }
  | { type: 'rematch' }
  | { type: 'pause'; now: number }
  | { type: 'resume'; now: number }
  | { type: 'kick'; playerId: string }
  /** Questions this player has already seen this session (sent when they join). */
  | { type: 'seen'; ids: string[] }
  | { type: 'regenQuestion'; now: number }
  | { type: 'addCustom'; question: Question }
  /** Several questions at once (e.g. "add all" from a player's own question bank). */
  | { type: 'addCustomMany'; questions: Question[] }
  /** The host hands hosting to another player (lobby "More settings"). */
  | { type: 'transferHost'; to: string }
  /** The host ends the game for everyone and takes the whole room back to the lobby. */
  | { type: 'backToLobby' }
  /** Another phone takes over as host because the host's phone is gone. */
  | { type: 'takeOver'; newHostId: string }
  /** "I'm still here" from a guest's phone (handled by the host's connection code). */
  | { type: 'ping' };

export function emptyTotals(): PlayerTotals {
  return {
    points: 0,
    sips: 0,
    shots: 0,
    correctBets: 0,
    bonusBets: 0,
    noVotes: 0,
    challengeWins: 0,
    giantSlays: 0,
    streak: 0,
    bestStreak: 0,
  };
}

export function createGame(opts: {
  code: string;
  host: Player;
  settings: GameSettings;
  bank: Question[];
}): GameState {
  return {
    code: opts.code,
    hostId: opts.host.id,
    settings: opts.settings,
    players: [opts.host],
    phase: 'lobby',
    history: [],
    totals: { [opts.host.id]: emptyTotals() },
    timesChosen: {},
    timesSubject: {},
    usedPairs: [],
    usedQuestions: [],
    recentCategories: [],
    bank: opts.bank,
  };
}

export function host(state: GameState): Player | undefined {
  return state.players.find((p) => p.id === state.hostId);
}

/**
 * Whoever runs the current round: the host, or, while the host is one of the two
 * challengers, the stand-in host chosen for that round.
 */
export function actingHostId(state: GameState): string {
  if (state.round && state.phase !== 'lobby' && state.phase !== 'podium') return state.round.judgeId;
  return state.hostId;
}

export function actingHost(state: GameState): Player | undefined {
  const id = actingHostId(state);
  return state.players.find((p) => p.id === id) ?? host(state);
}

/** Free hosts can swap the question once per game; Premium hosts as often as they like. */
export const FREE_REGENS = 1;
export function canRegen(state: GameState): boolean {
  return !!host(state)?.premium || (state.regens ?? 0) < FREE_REGENS;
}

/** Everything the wheel can pick from: the built-in bank plus the lobby's own questions. */
function fullBank(state: GameState): Question[] {
  return state.custom?.length ? [...state.bank, ...state.custom] : state.bank;
}

/** A lobby's own questions are a Premium feature (the host's Premium unlocks it for the room). */
export function lobbyIsPremium(state: GameState): boolean {
  return !!host(state)?.premium;
}

/** "Only our questions" needs at least this many of the lobby's own questions in every selected category. */
export const CUSTOM_ONLY_MIN = 10;
export const MAX_CUSTOM = 500;

/** How many of the lobby's own questions each selected category has, and whether "only ours" can be on. */
export function customOnlyStatus(state: GameState, categories: Category[] = state.settings.categories) {
  const counts = categories.map((c) => ({ category: c, count: (state.custom ?? []).filter((q) => q.category === c).length }));
  const short = counts.filter((c) => c.count < CUSTOM_ONLY_MIN);
  return { counts, short, ready: categories.length > 0 && short.length === 0 };
}

function normPrompt(p: string): string {
  return p.trim().toLowerCase().replace(/\s+/g, ' ');
}

function addCustomQuestions(state: GameState, qs: Question[]): GameState {
  if (!lobbyIsPremium(state)) return state;
  const custom = [...(state.custom ?? [])];
  const seen = new Set(custom.map((q) => normPrompt(q.prompt)));
  for (const q of qs) {
    if (!q?.prompt?.trim() || custom.length >= MAX_CUSTOM) continue;
    const key = normPrompt(q.prompt);
    if (seen.has(key)) continue; // the same question twice is no fun
    seen.add(key);
    custom.push({ ...q, custom: true, prompt: q.prompt.trim().slice(0, 240) });
  }
  return custom.length === (state.custom?.length ?? 0) ? state : { ...state, custom };
}

export function canJoin(state: GameState): boolean {
  const h = host(state);
  return !!h?.premium || state.players.length < FREE_MAX_PLAYERS;
}

/** Players who can be picked as challengers. */
export function challengerPool(state: GameState): string[] {
  return state.players.filter((p) => p.playing).map((p) => p.id);
}

export function isFinalRound(state: GameState): boolean {
  return !!state.round && state.round.number === state.settings.rounds;
}

/** Bettors who haven't voted yet. */
export function pendingBettors(state: GameState): string[] {
  const r = state.round;
  if (!r) return [];
  return r.bettors.filter((id) => !(id in r.bets));
}

/**
 * Full length of the current timed phase in ms (for the timer bar), or undefined if untimed.
 * Only voting and the between-rounds results run on a timer; every other screen waits
 * for the host to tap "Click to continue".
 */
export function phaseDuration(state: GameState): number | undefined {
  if (state.paused) return undefined;
  switch (state.phase) {
    case 'betting':
      return DURATIONS.betting;
    case 'result':
      return DURATIONS.result;
    default:
      return undefined;
  }
}

/** Which challenger is the Underdog in the current round's bets ('A' | 'B'), if any. */
export function currentUnderdog(state: GameState): 'A' | 'B' | undefined {
  const r = state.round;
  return r ? underdogSide(r.bettors, r.bets) : undefined;
}

export function inPressure(state: GameState, now: number): boolean {
  return (
    state.phase === 'betting' &&
    state.phaseEndsAt !== undefined &&
    state.phaseEndsAt - now <= DURATIONS.bettingPressure
  );
}

function chooseJudge(
  state: GameState,
  challengers: [string, string],
  bettors: string[],
  subjectId: string | undefined,
  rng: Rng,
): string {
  // The host runs the round (and is the only one who sees the answer)… unless the host
  // is one of the challengers: then a stand-in host is picked from the other players.
  if (!challengers.includes(state.hostId)) return state.hostId;
  const live = (ids: string[]) => ids.filter((id) => state.players.find((p) => p.id === id)?.connected !== false);
  const others = state.players.map((p) => p.id).filter((id) => !challengers.includes(id));
  const prefer = live(others.filter((id) => id !== subjectId));
  const pool = prefer.length > 0 ? prefer : live(others).length > 0 ? live(others) : others;
  void bettors;
  if (pool.length === 0) return state.hostId;
  return pool[Math.floor(rng() * pool.length)];
}

function beginRound(state: GameState, number: number, now: number, rng: Rng): GameState {
  const pool = challengerPool(state);
  if (pool.length < 2) return state;
  const roundsLeft = state.settings.rounds - number + 1;
  const prev = state.history[state.history.length - 1];
  const challengers = pickChallengers({
    pool,
    timesChosen: state.timesChosen,
    roundsLeft,
    lastPair: prev?.skipped ? undefined : prev?.challengers,
    usedPairs: new Set(state.usedPairs),
    rng,
  });

  const everyone = state.players.map((p) => p.id);
  const bettors = state.players
    .filter((p) => p.playing && !challengers.includes(p.id))
    .map((p) => p.id);

  const result = spin(
    fullBank(state),
    state.settings.categories,
    state.recentCategories,
    new Set(state.usedQuestions),
    rng,
    {
      canUseKyf: everyone.length >= 3,
      mode: state.settings.mode,
      onlyCustom: !!state.settings.onlyCustom && customOnlyStatus(state).ready,
    },
  );

  const subjectId =
    result.question.type === 'SUBJECT_JUDGED' ? pickSubject(everyone, challengers, state.timesSubject, rng) : undefined;

  const round: RoundState = {
    number,
    challengers,
    bettors,
    slice: result.slice,
    category: result.category,
    question: result.question,
    subjectId,
    judgeId: chooseJudge(state, challengers, bettors, subjectId, rng),
    bets: {},
    answerShownToAll: false,
  };

  return {
    ...state,
    phase: 'matchup',
    phaseEndsAt: undefined, // waits for the host's tap
    round,
    timesChosen: {
      ...state.timesChosen,
      [challengers[0]]: (state.timesChosen[challengers[0]] ?? 0) + 1,
      [challengers[1]]: (state.timesChosen[challengers[1]] ?? 0) + 1,
    },
    timesSubject: subjectId
      ? { ...state.timesSubject, [subjectId]: (state.timesSubject[subjectId] ?? 0) + 1 }
      : state.timesSubject,
    usedPairs: [...state.usedPairs, pairKey(challengers[0], challengers[1])],
    usedQuestions: [...state.usedQuestions, result.question.id],
    recentCategories: [...state.recentCategories, result.category],
  };
}

function finishRound(state: GameState, outcome: Outcome, now: number): GameState {
  const r = state.round!;
  const score = scoreRound({
    mode: state.settings.mode,
    challengers: r.challengers,
    bettors: r.bettors,
    bets: r.bets,
    outcome,
    isFinalRound: isFinalRound(state),
  });

  const totals = { ...state.totals };
  for (const [id, s] of Object.entries(score.perPlayer)) {
    const t = { ...emptyTotals(), ...(totals[id] ?? {}) };
    // Streak: a win (face-off or right call) adds one; any miss resets it; a draw leaves it.
    if (s.result === 'challengerWin' || s.result === 'betWin') {
      t.streak += 1;
      t.bestStreak = Math.max(t.bestStreak, t.streak);
    } else if (s.result !== 'draw') {
      t.streak = 0;
    }
    t.points += s.points;
    t.sips += s.sips;
    if (s.shot) t.shots += 1;
    if (s.result === 'betWin') {
      t.correctBets += 1;
      if (score.multiplier > 1) t.bonusBets += 1;
    }
    if (s.result === 'noVote') t.noVotes += 1;
    if (s.result === 'challengerWin') {
      t.challengeWins += 1;
      if (score.multiplier > 1) t.giantSlays += 1;
    }
    totals[id] = t;
  }

  return {
    ...state,
    phase: 'result',
    phaseEndsAt: now + DURATIONS.result,
    round: { ...r, outcome, score },
    totals,
  };
}

function advanceAfterResult(state: GameState, now: number, rng: Rng): GameState {
  const r = state.round!;
  const history = [...state.history, r];
  const base = { ...state, history };
  if (r.number >= state.settings.rounds) {
    return { ...base, phase: 'podium', phaseEndsAt: undefined };
  }
  return beginRound(base, r.number + 1, now, rng);
}

/** Moves a timed phase forward. Used by both `tick` (deadline passed) and `next` (host skips the wait). */
function advance(state: GameState, now: number, rng: Rng): GameState {
  switch (state.phase) {
    case 'matchup':
      return { ...state, phase: 'spin', phaseEndsAt: undefined };
    case 'spin':
      if (state.round!.bettors.length === 0) {
        // Nobody can bet (e.g. 2 players): go straight to the challenge.
        return { ...state, phase: 'challenge', phaseEndsAt: undefined };
      }
      return { ...state, phase: 'betting', phaseEndsAt: now + DURATIONS.betting };
    case 'betting':
      return { ...state, phase: 'betsReveal', phaseEndsAt: undefined };
    case 'betsReveal':
      return { ...state, phase: 'challenge', phaseEndsAt: undefined };
    case 'result':
      return advanceAfterResult(state, now, rng);
    default:
      return state;
  }
}

export function reduce(state: GameState, action: Action, rng: Rng = Math.random): GameState {
  switch (action.type) {
    case 'join': {
      if (state.kicked?.includes(action.player.id)) return state;
      if (state.players.some((p) => p.id === action.player.id)) {
        return reduce(state, { type: 'setConnected', playerId: action.player.id, connected: true }, rng);
      }
      if (!canJoin(state)) return state;
      const joinOrder = Math.max(0, ...state.players.map((p) => p.joinOrder)) + 1;
      return {
        ...state,
        players: [...state.players, { ...action.player, isHost: false, playing: true, joinOrder }],
        totals: { ...state.totals, [action.player.id]: state.totals[action.player.id] ?? emptyTotals() },
      };
    }

    case 'leave': {
      const players = state.players.filter((p) => p.id !== action.playerId);
      if (players.length === 0) return { ...state, players };
      let hostId = state.hostId;
      let epoch = state.epoch;
      if (action.playerId === state.hostId) {
        // The next player in join order takes over, preferring phones that are still here.
        const line = [...players].sort((a, b) => a.joinOrder - b.joinOrder);
        hostId = (line.find((p) => p.connected !== false && !p.id.startsWith('bot-')) ?? line[0]).id;
        epoch = (state.epoch ?? 0) + 1;
      }
      let next: GameState = {
        ...state,
        hostId,
        epoch,
        players: players.map((p) => ({ ...p, isHost: p.id === hostId, playing: p.id === hostId ? true : p.playing })),
      };
      const r = next.round;
      if (r && next.phase !== 'lobby' && next.phase !== 'podium') {
        const bettors = r.bettors.filter((id) => id !== action.playerId);
        let judgeId = r.judgeId;
        if (judgeId === action.playerId || (judgeId === hostId && r.challengers.includes(hostId))) {
          judgeId = chooseJudge(next, r.challengers, bettors, r.subjectId, Math.random);
        }
        const bets = { ...r.bets };
        delete bets[action.playerId];
        next = { ...next, round: { ...r, bettors, bets, judgeId } };
        // A challenger who left can't play this round: skip it.
        if (r.challengers.includes(action.playerId) && next.phase !== 'result') {
          return reduce(next, { type: 'skipRound', now: Date.now() }, rng);
        }
        if (next.phase === 'betting' && pendingBettors(next).length === 0) {
          return advance(next, Date.now(), rng);
        }
      }
      return next;
    }

    case 'setConnected':
      return {
        ...state,
        players: state.players.map((p) => (p.id === action.playerId ? { ...p, connected: action.connected } : p)),
      };

    case 'updatePlayer':
      return {
        ...state,
        players: state.players.map((p) => (p.id === action.playerId ? { ...p, ...action.patch } : p)),
      };

    case 'updateSettings':
      if (state.phase !== 'lobby') return state;
      return { ...state, settings: { ...state.settings, ...action.patch } };

    case 'setHostPlaying':
      if (state.phase !== 'lobby') return state;
      return {
        ...state,
        players: state.players.map((p) => (p.id === state.hostId ? { ...p, playing: action.playing } : p)),
      };

    case 'start':
      if (state.phase !== 'lobby' || challengerPool(state).length < 2) return state;
      return beginRound(state, 1, action.now, rng);

    case 'pause': {
      if (state.paused) return state;
      const remaining = state.phaseEndsAt !== undefined ? Math.max(0, state.phaseEndsAt - action.now) : undefined;
      return { ...state, paused: { remaining }, phaseEndsAt: undefined };
    }

    case 'resume': {
      if (!state.paused) return state;
      const remaining = state.paused.remaining;
      return { ...state, paused: undefined, phaseEndsAt: remaining !== undefined ? action.now + remaining : undefined };
    }

    case 'kick': {
      if (action.playerId === state.hostId) return state;
      const left = reduce(state, { type: 'leave', playerId: action.playerId }, rng);
      return { ...left, kicked: [...(state.kicked ?? []), action.playerId] };
    }

    case 'tick': {
      if (state.paused) return state;
      if (state.phase === 'betting' && pendingBettors(state).length === 0) {
        return advance(state, action.now, rng);
      }
      if (state.phaseEndsAt !== undefined && action.now >= state.phaseEndsAt) {
        return advance(state, action.now, rng);
      }
      return state;
    }

    case 'next':
      return advance(state, action.now, rng);

    case 'bet': {
      const r = state.round;
      if (state.phase !== 'betting' || !r || !r.bettors.includes(action.playerId)) return state;
      if (action.playerId in r.bets) return state; // bets are final
      const bets = { ...r.bets, [action.playerId]: action.pick };
      const next = { ...state, round: { ...r, bets } };
      return pendingBettors(next).length === 0 ? advance(next, action.now, rng) : next;
    }

    case 'subjectAnswer': {
      const r = state.round;
      if (!r || r.subjectId !== action.playerId) return state;
      return { ...state, round: { ...r, subjectAnswer: action.answer } };
    }

    case 'showAnswerToAll': {
      if (!state.round) return state;
      return { ...state, round: { ...state.round, answerShownToAll: true } };
    }

    case 'judge': {
      const r = state.round;
      if (state.phase !== 'challenge' || !r) return state;
      const hostMayOverride = action.by === state.hostId && !r.challengers.includes(state.hostId);
      if (action.by !== r.judgeId && !hostMayOverride) return state;
      return finishRound(state, action.outcome, action.now);
    }

    case 'skipRound': {
      const r = state.round;
      if (!r || state.phase === 'lobby' || state.phase === 'podium' || state.phase === 'result') return state;
      // A skipped round doesn't count as a turn for its challengers.
      const timesChosen = { ...state.timesChosen };
      for (const id of r.challengers) timesChosen[id] = Math.max(0, (timesChosen[id] ?? 1) - 1);
      return advanceAfterResult({ ...state, timesChosen, round: { ...r, skipped: true } }, action.now, rng);
    }

    case 'swapChallenger': {
      const r = state.round;
      if (!r || !r.challengers.includes(action.out) || state.phase === 'result') return state;
      const candidates = state.players
        .filter((p) => p.playing && p.connected && !r.challengers.includes(p.id))
        .map((p) => p.id);
      if (candidates.length === 0) return state;
      const replacement = candidates[Math.floor(rng() * candidates.length)];
      const challengers = r.challengers.map((id) => (id === action.out ? replacement : id)) as [string, string];
      const bettors = r.bettors.filter((id) => id !== replacement);
      const bets = { ...r.bets };
      delete bets[replacement];
      return {
        ...state,
        round: { ...r, challengers, bettors, bets, judgeId: r.judgeId === replacement ? state.hostId : r.judgeId },
        timesChosen: {
          ...state.timesChosen,
          [action.out]: Math.max(0, (state.timesChosen[action.out] ?? 1) - 1),
          [replacement]: (state.timesChosen[replacement] ?? 0) + 1,
        },
      };
    }

    case 'ping':
      return state;

    case 'seen': {
      const known = new Set(state.usedQuestions);
      const add = action.ids.filter((id) => !known.has(id));
      return add.length ? { ...state, usedQuestions: [...state.usedQuestions, ...add] } : state;
    }

    case 'regenQuestion': {
      const r = state.round;
      if (!r || state.phase === 'lobby' || state.phase === 'podium' || state.phase === 'result') return state;
      if (!canRegen(state)) return state;
      const used = new Set([...state.usedQuestions, r.question.id]);
      const onlyCustom = { onlyCustom: !!state.settings.onlyCustom && customOnlyStatus(state).ready };
      const sameLevel = (q: Question) =>
        q.id !== r.question.id && q.difficulty === r.question.difficulty && (r.subjectId ? true : q.type !== 'SUBJECT_JUDGED');
      const anyOther = (q: Question) => q.id !== r.question.id && (r.subjectId ? true : q.type !== 'SUBJECT_JUDGED');
      const q =
        pickQuestion(fullBank(state).filter(sameLevel), r.category, used, rng, undefined, onlyCustom) ??
        pickQuestion(fullBank(state).filter(anyOther), r.category, used, rng, undefined, onlyCustom);
      if (!q) return state;
      return {
        ...state,
        regens: (state.regens ?? 0) + 1,
        usedQuestions: [...state.usedQuestions, q.id],
        round: { ...r, question: q, subjectAnswer: undefined, answerShownToAll: false },
      };
    }

    case 'addCustom':
      return addCustomQuestions(state, [action.question]);

    case 'addCustomMany':
      return addCustomQuestions(state, action.questions ?? []);

    case 'transferHost': {
      const to = state.players.find((p) => p.id === action.to);
      if (!to || to.id === state.hostId) return state;
      const old = state.hostId;
      return {
        ...state,
        hostId: to.id,
        epoch: (state.epoch ?? 0) + 1,
        players: state.players.map((p) => ({
          ...p,
          isHost: p.id === to.id,
          // The old host goes back to being a normal player.
          playing: p.id === old ? true : p.playing,
        })),
      };
    }

    case 'backToLobby':
      if (state.phase === 'lobby') return state;
      return { ...reduce(state, { type: 'rematch' }, rng), paused: undefined };

    case 'takeOver': {
      const old = state.hostId;
      if (old === action.newHostId) return state;
      const promoted = { ...state, hostId: action.newHostId, epoch: (state.epoch ?? 0) + 1 };
      return reduce(promoted, { type: 'leave', playerId: old }, rng);
    }

    case 'rematch': {
      const totals = Object.fromEntries(state.players.map((p) => [p.id, emptyTotals()]));
      return {
        ...state,
        phase: 'lobby',
        phaseEndsAt: undefined,
        round: undefined,
        history: [],
        totals,
        timesChosen: {},
        timesSubject: {},
        usedPairs: [],
        recentCategories: [],
        regens: 0,
        // usedQuestions is kept so a rematch doesn't repeat questions.
      };
    }
  }
}

/** Players sorted by points (ties: more correct bets, then challenge wins). */
export function rankings(state: GameState): { player: Player; totals: PlayerTotals; rank: number }[] {
  const rows = state.players.map((player) => ({ player, totals: state.totals[player.id] ?? emptyTotals() }));
  rows.sort(
    (a, b) =>
      b.totals.points - a.totals.points ||
      b.totals.correctBets - a.totals.correctBets ||
      b.totals.challengeWins - a.totals.challengeWins,
  );
  let rank = 0;
  let prevPoints = Number.NaN;
  return rows.map((row, i) => {
    if (row.totals.points !== prevPoints) rank = i + 1;
    prevPoints = row.totals.points;
    return { ...row, rank };
  });
}
