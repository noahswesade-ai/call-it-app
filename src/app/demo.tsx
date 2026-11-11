import { Redirect, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ALL_QUESTIONS } from '@/content/questions';
import { availableCategories } from '@/content/categories';
import { createGame, emptyTotals, reduce, type GameState } from '@/game/engine';
import { seededRng } from '@/game/rng';
import type { AvatarLoadout, Player } from '@/game/types';
import { useRoom } from '@/net/RoomProvider';
import { BetsReveal, Matchup, UnderdogOverlay } from '@/room/Phases';
import { PLAYTEST } from '@/state/profile';
import { Screen } from '@/ui/kit';

/**
 * TEMPORARY (play-test only): plays one of the big takeover screens on a made-up game so
 * they can be recorded. /demo?fx=final | underdog | jackpot. Remove before release.
 */
const CAST: [string, AvatarLoadout][] = [
  ['Maya', { animal: 'fox', head: 'crown' }],
  ['Jonas', { animal: 'bear' }],
  ['Lena', { animal: 'cat', eyes: 'heartglasses' }],
  ['Tom', { animal: 'frog' }],
  ['Sofia', { animal: 'panda' }],
  ['Ben', { animal: 'dog' }],
];

function makeState(fx: string, myId: string): GameState {
  const p = (id: string, name: string, avatar: AvatarLoadout, extra: Partial<Player> = {}): Player => ({
    id, name, avatar, isHost: false, playing: true, premium: false, joinOrder: 0, connected: true, ...extra,
  });
  const final = fx !== 'underdog';
  let g = createGame({
    code: 'DEMO',
    host: p(myId, 'You', { animal: 'koala' }, { isHost: true, playing: false }),
    settings: { mode: 'party', spicy: false, rounds: 10, categories: availableCategories('party', false) },
    bank: ALL_QUESTIONS,
  });
  CAST.forEach(([name, av], i) => (g = reduce(g, { type: 'join', player: p(`d${i}`, name, av) })));
  g = reduce(g, { type: 'start', now: 1 }, seededRng(7));
  const r = g.round!;
  const round = { ...r, number: final ? 10 : 5, challengers: ['d0', 'd1'] as [string, string], bettors: ['d2', 'd3', 'd4', 'd5'], judgeId: myId };
  const totals = { ...g.totals };
  [9, 7, 6, 4, 3, 2].forEach((pts, i) => (totals[`d${i}`] = { ...emptyTotals(), points: pts }));
  if (fx === 'final') return { ...g, totals, round: { ...round, bets: {} }, phase: 'matchup' };
  // One brave caller backs Maya (25%): Maya is the Underdog.
  return { ...g, totals, round: { ...round, bets: { d2: 'A', d3: 'B', d4: 'B', d5: 'B' } }, phase: 'betsReveal' };
}

export default function Demo() {
  const { fx = 'jackpot' } = useLocalSearchParams<{ fx?: string }>();
  const { myId } = useRoom();
  const state = useMemo(() => makeState(fx, myId), [fx, myId]);
  if (!PLAYTEST && !__DEV__) return <Redirect href="/" />;
  return (
    <Screen
      scroll
      style={{ flexGrow: 1 }}
      tint={fx === 'final' ? 'fire' : undefined}
      overlay={state.phase === 'betsReveal' ? <UnderdogOverlay state={state} /> : undefined}
    >
      {state.phase === 'matchup' ? <Matchup state={state} /> : <BetsReveal state={state} />}
    </Screen>
  );
}
