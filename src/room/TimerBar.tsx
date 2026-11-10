import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '@/ui/theme';
import { useTimeLeft } from './shared';

/**
 * Yellow loading bar shown on every timed screen. It fills up as the phase's
 * time runs out, so players always know when the game will move on.
 */
export function TimerBar({ endsAt, total }: { endsAt: number; total: number }) {
  const left = useTimeLeft(endsAt);
  const frac = Math.max(0, Math.min(1, 1 - left / total));
  const secs = Math.ceil(left / 1000);
  return (
    <View style={styles.wrap} pointerEvents="none">
      <Text style={styles.icon}>⏱️</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${frac * 100}%` }]}>
          <View style={styles.shine} />
        </View>
      </View>
      <Text style={styles.secs}>{secs}s</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(20,4,40,0.75)',
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255,201,60,0.4)',
  },
  icon: { fontSize: 16 },
  track: { flex: 1, height: 16, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' },
  fill: { height: 16, borderRadius: 8, backgroundColor: colors.gold, overflow: 'hidden' },
  shine: { position: 'absolute', top: 2, left: 6, right: 6, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.5)' },
  secs: { color: colors.gold, fontFamily: fonts.display, fontSize: 16, minWidth: 30, textAlign: 'right' },
});
