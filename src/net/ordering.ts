import type { GameState } from '@/game/engine';

/**
 * Which of two game states is newer? Phones receive states over several relay servers,
 * so updates can arrive late, twice, out of order, or as an old "retained" copy after a
 * reconnect. Every state carries (epoch, rev):
 *  - epoch goes up whenever hosting moves to another phone,
 *  - rev goes up on every change the host makes.
 * If two phones ever claim hosting in the same epoch (two takeovers at once), the
 * claim of the player who joined earlier wins, so every phone settles on the same host.
 *
 * Returns > 0 if `a` should replace `b`, 0 if they're the same version, < 0 if `a` is older.
 */
export function compareStates(a: GameState, b: GameState): number {
  const ea = a.epoch ?? 0;
  const eb = b.epoch ?? 0;
  if (ea !== eb) return ea - eb;
  if (a.hostId !== b.hostId) return hostClaimBeats(a, b) ? 1 : -1;
  return (a.rev ?? 0) - (b.rev ?? 0);
}

/** Same epoch, different hosts: the host who joined earlier (then the smaller id) wins. */
function hostClaimBeats(a: GameState, b: GameState): boolean {
  const order = (s: GameState, id: string) => s.players.find((p) => p.id === id)?.joinOrder ?? Number.MAX_SAFE_INTEGER;
  const oa = Math.min(order(a, a.hostId), order(b, a.hostId));
  const ob = Math.min(order(a, b.hostId), order(b, b.hostId));
  if (oa !== ob) return oa < ob;
  return a.hostId < b.hostId;
}
