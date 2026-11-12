import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { colors, fonts } from '@/ui/theme';

/** Wins in a row needed to be "on fire". */
export const STREAK_MIN = 3;

/**
 * A glowing, flickering flame with the streak count, shown next to a player's name
 * once they've won 3+ rounds in a row (face-offs or right calls). Purely decorative.
 */
export function StreakFlame({ n, size = 15 }: { n: number; size?: number }) {
  const glow = useSharedValue(0.4);
  const flicker = useSharedValue(1);
  useEffect(() => {
    glow.value = withRepeat(withTiming(1, { duration: 650, easing: Easing.inOut(Easing.sin) }), -1, true);
    flicker.value = withRepeat(
      withSequence(withTiming(1.12, { duration: 180 }), withTiming(0.96, { duration: 220 }), withTiming(1.05, { duration: 160 })),
      -1,
      true,
    );
  }, [glow, flicker]);
  const halo = useAnimatedStyle(() => ({ opacity: glow.value, transform: [{ scale: 0.9 + glow.value * 0.35 }] }));
  const flame = useAnimatedStyle(() => ({ transform: [{ scale: flicker.value }] }));
  if (n < STREAK_MIN) return null;
  const hot = n >= 5;
  return (
    <View style={styles.wrap} accessibilityLabel={`${n} wins in a row`}>
      <Animated.View style={[styles.halo, { backgroundColor: hot ? 'rgba(255,80,40,0.55)' : 'rgba(255,170,40,0.5)' }, halo]} />
      <Animated.Text style={[{ fontSize: size + 3 }, flame]}>🔥</Animated.Text>
      <Text style={[styles.count, { fontSize: size, color: hot ? '#FFB199' : colors.gold }]}>{n}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
  halo: { position: 'absolute', left: -2, right: -2, top: -1, bottom: -1, borderRadius: 99 },
  count: {
    fontFamily: fonts.display,
    marginLeft: 1,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
});
