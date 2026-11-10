import type { Mode, Outcome, Pick } from './types';

/**
 * Points and drinks for one round — built around the game's signature rule:
 *
 *   THE UNDERDOG ×3
 *   When bets are revealed, if one challenger is backed by LESS THAN
 *   UNDERDOG_THRESHOLD (33%) of the bettors who picked a side, that challenger
 *   is the Underdog. If the Underdog then wins, the round is worth ×3. There is
 *   no other multiplier for any other split:
 *     - everyone who backed the Underdog scores 3 points instead of 1, and
 *     - in Party mode everyone who bet against them drinks 3 sips instead of 1.
 *
 * Party mode keeps the same points and leaderboard as Classic. Drinks are fixed:
 * every wrong call (and the losing challenger) drinks 1 sip, or 3 when the
 * Underdog won; No Votes and draws drink 1. The final round doubles everything.
 *
 * Share is counted only among bettors who picked a side (No Votes excluded). A
 * challenger with zero votes is always the Underdog (0% < 33%).
 */

export const MIN_BETTORS_FOR_UNDERDOG = 1;
export const UNDERDOG_THRESHOLD = 0.33;
export const UNDERDOG_MULTIPLIER = 3;

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
}

export interface RoundScore {
  perPlayer: Record<string, PlayerRoundScore>;
  /** Share (0–1) of side-picking bettors who backed the winner; undefined on a draw or with no bets. */
  winnerShare?: number;
  /** Which challenger was the Underdog when bets were revealed, if any. */
  underdog?: 'A' | 'B';
  /** 3 when the Underdog won, otherwise 1. */
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

/** The Underdog side for these bets, or undefined if there isn't one. */
export function underdogSide(bettors: string[], bets: Record<string, Pick | undefined>): 'A' | 'B' | undefined {
  const { votesA, votesB } = voteTally(bettors, bets);
  const total = votesA + votesB;
  if (total < MIN_BETTORS_FOR_UNDERDOG) return undefined;
  if (votesA / total < UNDERDOG_THRESHOLD) return 'A';
  if (votesB / total < UNDERDOG_THRESHOLD) return 'B';
  return undefined;
}

export function scoreRound(input: RoundScoreInput): RoundScore {
  const { mode, challengers, bettors, bets, outcome, isFinalRound } = input;
  const party = mode === 'party';
  const final = isFinalRound ? 2 : 1;
  const { votesA, votesB, noVotes } = voteTally(bettors, bets);
  const sidePickers = votesA + votesB;
  const underdog = underdogSide(bettors, bets);

  let winnerShare: number | undefined;
  if (outcome !== 'DRAW' && sidePickers > 0) {
    winnerShare = (outcome === 'A' ? votesA : votesB) / sidePickers;
  }
  const multiplier = underdog && outcome === underdog ? UNDERDOG_MULTIPLIER : 1;
  // Right calls score `multiplier` points; in Party, wrong calls drink the same number of sips.
  const pointMult = multiplier;
  const sipMult = multiplier;

  const perPlayer: Record<string, PlayerRoundScore> = {};
  const [a, b] = challengers;

  if (outcome === 'DRAW') {
    for (const id of challengers) {
      perPlayer[id] = { result: 'draw', points: 0, sips: party ? 1 * final : 0, shot: false };
    }
  } else {
    const winner = outcome === 'A' ? a : b;
    const loser = outcome === 'A' ? b : a;
    perPlayer[winner] = { result: 'challengerWin', points: 1 * final, sips: 0, shot: false };
    perPlayer[loser] = { result: 'challengerLoss', points: 0, sips: party ? sipMult * final : 0, shot: false };
  }

  for (const id of bettors) {
    const pick = bets[id];
    if (pick !== 'A' && pick !== 'B') {
      perPlayer[id] = { result: 'noVote', points: 0, sips: party ? 1 * final : 0, shot: false };
    } else if (outcome === 'DRAW') {
      perPlayer[id] = { result: 'draw', points: 0, sips: 0, shot: false };
    } else if (pick === outcome) {
      perPlayer[id] = { result: 'betWin', points: pointMult * final, sips: 0, shot: false };
    } else {
      perPlayer[id] = { result: 'betLoss', points: 0, sips: party ? sipMult * final : 0, shot: false };
    }
  }

  return { perPlayer, winnerShare, underdog, multiplier, votesA, votesB, noVotes };
}
