import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { currentUnderdog, isFinalRound, type GameState } from '@/game/engine';
import { UNDERDOG_SHOW_MS } from './Underdog';
import { JACKPOT_SHOW_MS } from './Jackpot';
import { tap } from '@/ui/kit';
import { Pulse } from '@/ui/motion';
import { colors, fonts } from '@/ui/theme';
import { revealTimeline } from './Phases';

/** Screens that wait for the host instead of running on a timer. */
export function waitsForHost(state: GameState): boolean {
  return state.phase === 'matchup' || state.phase === 'spin' || state.phase === 'betsReveal';
}

/** How long each screen's animation needs before the host can move on (ms). */
function readyAfter(state: GameState): number {
  switch (state.phase) {
    case 'matchup':
      return isFinalRound(state) ? 3600 : 1300;
    case 'spin':
      return 5400; // the wheel spins ~4.8s, then the category box pops in
    case 'betsReveal': {
      const t = revealTimeline(state);
      if (!currentUnderdog(state)) return t.PCT_AT + 1400;
      return t.ALERT_AT + (isFinalRound(state) ? JACKPOT_SHOW_MS : UNDERDOG_SHOW_MS) + 300;
    }
    default:
      return 0;
  }
}

function useReady(state: GameState): boolean {
  const key = `${state.phase}-${state.round?.number ?? 0}`;
  const [readyKey, setReadyKey] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setReadyKey(key), readyAfter(state));
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return readyKey === key;
}

/** Pulsing "Click to continue..." line (host) or "Waiting for the host..." (everyone else). */
export function ContinuePrompt({ state, isHost, hostName }: { state: GameState; isHost: boolean; hostName: string }) {
  const ready = useReady(state);
  if (!ready) return null;
  return (
    <View style={styles.wrap} pointerEvents="none">
      <Pulse scale={1.18} duration={650}>
        <Text style={[styles.text, !isHost && styles.waiting]}>
          {isHost ? 'Click to continue...' : `Waiting for ${hostName} to continue...`}
        </Text>
      </Pulse>
    </View>
  );
}

/** Invisible full-screen tap target for the host once the screen's animation is done. */
export function ContinueTapArea({ state, onContinue }: { state: GameState; onContinue: () => void }) {
  const ready = useReady(state);
  if (!ready) return null;
  return (
    <Pressable
      style={StyleSheet.absoluteFill}
      accessibilityRole="button"
      accessibilityLabel="Click to continue"
      onPress={() => {
        tap('medium');
        onContinue();
      }}
    />
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 10 },
  text: {
    color: colors.gold,
    fontFamily: fonts.display,
    fontSize: 22,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  waiting: { color: colors.dim, fontSize: 17 },
});
