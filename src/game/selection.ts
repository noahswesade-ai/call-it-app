import type { Rng } from './types';

/**
 * Fair challenger selection (PLAN.md §3).
 *
 * - Each player's weight is 1 / (1 + timesChosen)², so every turn makes a
 *   player less likely to be picked again and everyone else relatively more likely.
 * - Guarantee: when the remaining challenger slots are no more than the players
 *   who haven't played yet, only those players can be picked, so everyone
 *   plays whenever the round count allows it.
 * - Soft rules: avoid repeating the previous round's players and the exact same
 *   pairing, when there is another option.
 */

export interface SelectionInput {
  /** Ids of everyone who can be a challenger (spectating hosts excluded). */
  pool: string[];
  /** How many times each player has been a challenger so far this game. */
  timesChosen: Record<string, number>;
  /** Rounds left including the one being picked now. */
  roundsLeft: number;
  /** The previous round's challengers. */
  lastPair?: [string, string];
  /** Every pairing used so far, as sorted "a|b" keys. */
  usedPairs?: Set<string>;
  rng: Rng;
}

export function weightFor(times: number): number {
  return 1 / (1 + times) ** 2;
}

export function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function weightedPick(ids: string[], weights: number[], rng: Rng): string {
  const total = weights.reduce((s, w) => s + w, 0);
  let r = rng() * total;
  for (let i = 0; i < ids.length; i++) {
    r -= weights[i];
    if (r < 0) return ids[i];
  }
  return ids[ids.length - 1];
}

function pickOne(candidates: string[], timesChosen: Record<string, number>, rng: Rng): string {
  return weightedPick(
    candidates,
    candidates.map((id) => weightFor(timesChosen[id] ?? 0)),
    rng,
  );
}

/** Keeps only candidates at most one turn ahead of the least-picked player in `base`. */
function balanced(candidates: string[], base: string[], timesChosen: Record<string, number>): string[] {
  const min = Math.min(...base.map((id) => timesChosen[id] ?? 0));
  const ok = candidates.filter((id) => (timesChosen[id] ?? 0) <= min + 1);
  return ok.length > 0 ? ok : candidates;
}

/** Applies a soft preference: keeps the preferred subset unless it would be empty. */
function prefer(candidates: string[], keep: (id: string) => boolean): string[] {
  const ok = candidates.filter(keep);
  return ok.length > 0 ? ok : candidates;
}

export function pickChallengers(input: SelectionInput): [string, string] {
  const { pool, timesChosen, roundsLeft, lastPair, usedPairs, rng } = input;
  if (pool.length < 2) throw new Error('Need at least 2 players to pick challengers');

  const unplayed = pool.filter((id) => (timesChosen[id] ?? 0) === 0);
  const slotsLeft = 2 * roundsLeft;
  const lastSet = new Set(lastPair ?? []);

  // Player A
  let candidatesA = pool;
  // Hard guarantee: if every remaining slot is needed for unplayed players, use only them.
  if (unplayed.length > 0 && slotsLeft <= unplayed.length) candidatesA = unplayed;
  candidatesA = balanced(candidatesA, pool, timesChosen);
  // Soft: skip last round's challengers, but only if B can also be someone fresh.
  if (pool.filter((id) => !lastSet.has(id)).length >= 2) {
    candidatesA = prefer(candidatesA, (id) => !lastSet.has(id));
  }
  const a = pickOne(candidatesA, timesChosen, rng);

  // Player B
  const rest = pool.filter((id) => id !== a);
  let candidatesB = rest;
  const unplayedB = unplayed.filter((id) => id !== a);
  if (unplayedB.length > 0 && slotsLeft - 1 <= unplayedB.length) candidatesB = unplayedB;
  candidatesB = balanced(candidatesB, rest, timesChosen);
  candidatesB = prefer(candidatesB, (id) => !lastSet.has(id));
  if (usedPairs && usedPairs.size > 0) {
    candidatesB = prefer(candidatesB, (id) => !usedPairs.has(pairKey(a, id)));
  }
  const b = pickOne(candidatesB, timesChosen, rng);
  return [a, b];
}

/** Picks the Know Your Friends subject: anyone in the room except the two challengers. */
export function pickSubject(
  everyone: string[],
  challengers: [string, string],
  timesSubject: Record<string, number>,
  rng: Rng,
): string | undefined {
  const candidates = everyone.filter((id) => !challengers.includes(id));
  if (candidates.length === 0) return undefined;
  return pickOne(candidates, timesSubject, rng);
}

/** True if this many rounds can't give every player at least one turn. */
export function notEveryoneWillPlay(players: number, rounds: number): boolean {
  return rounds * 2 < players;
}
