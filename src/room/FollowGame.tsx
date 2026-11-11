import { router, usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useRoom } from '@/net/RoomProvider';

/**
 * The game has absolute priority: if the host starts the game (or a new round begins)
 * while a player is customizing their avatar or browsing the shop, bring them straight
 * back to the game screen.
 */
const SIDE_SCREENS = ['/avatar', '/shop', '/paywall', '/welcome', '/account'];

export function FollowGame() {
  const { state } = useRoom();
  const pathname = usePathname();
  const phase = state?.phase;
  const roundNo = state?.round?.number;
  const lastKick = useRef('');
  useEffect(() => {
    if (!state || phase === 'lobby' || phase === 'podium') return;
    if (!SIDE_SCREENS.some((p) => pathname.startsWith(p))) return;
    const key = `${phase}-${roundNo}-${pathname}`;
    if (lastKick.current === key) return;
    lastKick.current = key;
    if (router.canGoBack()) router.back();
    else router.replace({ pathname: '/room', params: { code: state.code } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, roundNo, pathname]);
  return null;
}
