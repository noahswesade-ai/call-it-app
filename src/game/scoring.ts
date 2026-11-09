import type { Mode, Outcome, Pick } from './types';

/**
 * Points and drinks for one round (PLAN.md §2).
 *
 * "Underdog %" = share of bettors who backed the winner, counting only bettors
 * who picked a side (No Votes excluded). Multipliers apply only when at least
 * MIN_BETTORS_FOR_MULTIPLIER bettors picked a side.
 */

export const MIN_BETTORS_FOR_MULTIPLIER = 4;
export const UNDERDOG_THRESHOLD = 0.25; // ≤25% → ×2
export const SEVERE_UNDERDOG_THRESHOLD = 0.1; // ≤10% → ×3

export type PlayerRoundResult =
  | 'challengerWin'
  | 'challengerLoss'
  | 'betWin'
  | 'betLoss'
  | 'noVote'
  | 'draw'
  | 'spectator';

export interface PlayerRoundScore {
  result: PlayerRoundResult;
  points: number;
  sips: number;
  shot: boolean;
}

export interface RoundScoreInput {
  mode: Mode;
  challengers: [string, string];
  /** Everyone else who could bet. A missing entry counts as No Vote. */
  bettors: string[];
  bets: Record<string, Pick | undefined>;
  outcome: Outcome;
  isFinalRound: boolean;
  loserSips: number;
  finalShotRule: boolean;
}

export interface RoundScore {
  perPlayer: Record<string, PlayerRoundScore>;
  /** Share (0–1) of side-picking bettors who backed the winner; undefined on a draw or with no bets. */
  winnerShare?: number;
  /** 1, 2 or 3. */
  multiplier: number;
  votesA: number;
  votesB: number;
  noVotes: number;
}

export function voteTally(bettors: string[], bets: Record<string, Pick | undefined>) {
  let votesA = 0;
  let votesB = 0;
  let noVotes = 0;
  for (const id of bettors) {
    const p = bets[id];
    if (p === 'A') votesA++;
    else if (p === 'B') votesB++;
    else noVotes++;
  }
  return { votesA, votesB, noVotes };
}

export function multiplierFor(winnerShare: number | undefined, sidePickers: number): number {
  if (winnerShare === undefined || sidePickers < MIN_BETTORS_FOR_MULTIPLIER) return 1;
  if (winnerShare <= SEVERE_UNDERDOG_THRESHOLD) return 3;
  if (winnerShare <= UNDERDOG_THRESHOLD) return 2;
  return 1;
}

export function scoreRound(input: RoundScoreInput): RoundScore {
  const { mode, challengers, bettors, bets, outcome, isFinalRound, loserSips, finalShotRule } = input;
  const party = mode === 'party';
  const final = isFinalRound ? 2 : 1;
  const { votesA, votesB, noVotes } = voteTally(bettors, bets);
  const sidePickers = votesA + votesB;

  let winnerShare: number | undefined;
  if (outcome !== 'DRAW' && sidePickers > 0) {
    winnerShare = (outcome === 'A' ? votesA : votesB) / sidePickers;
  }
  const multiplier = multiplierFor(winnerShare, sidePickers);

  const perPlayer: Record<string, PlayerRoundScore> = {};
  const [a, b] = challengers;

  if (outcome === 'DRAW') {
    for (const id of challengers) {
      perPlayer[id] = { result: 'draw', points: 0, sips: party ? loserSips * final : 0, shot: false };
    }
  } else {
    const winner = outcome === 'A' ? a : b;
    const loser = outcome === 'A' ? b : a;
    perPlayer[winner] = { result: 'challengerWin', points: 1 * final, sips: 0, shot: false };
    const loserShot = party && isFinalRound && finalShotRule;
    perPlayer[loser] = {
      result: 'challengerLoss',
      points: 0,
      sips: party && !loserShot ? loserSips * final : 0,
      shot: loserShot,
    };
  }

  for (const id of bettors) {
    const pick = bets[id];
    if (pick !== 'A' && pick !== 'B') {
      perPlayer[id] = { result: 'noVote', points: 0, sips: party ? 1 * final : 0, shot: false };
    } else if (outcome === 'DRAW') {
      perPlayer[id] = { result: 'draw', points: 0, sips: 0, shot: false };
    } else if (pick === outcome) {
      perPlayer[id] = { result: 'betWin', points: multiplier * final, sips: 0, shot: false };
    } else {
      perPlayer[id] = { result: 'betLoss', points: 0, sips: party ? multiplier * final : 0, shot: false };
    }
  }

  return { perPlayer, winnerShare, multiplier, votesA, votesB, noVotes };
}
