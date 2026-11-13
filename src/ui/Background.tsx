import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import { colors } from './theme';
import { useScreenSize } from '@/ui/screenSize';

/** Little emojis floating gently up and down: devils for Spicy, drinks for Party. */
const DEVILS = [
  { x: 0.1, y: 0.18, size: 34, dur: 2600, delay: 0 },
  { x: 0.88, y: 0.14, size: 40, dur: 3100, delay: 400 },
  { x: 0.92, y: 0.5, size: 30, dur: 2800, delay: 900 },
  { x: 0.07, y: 0.62, size: 38, dur: 3300, delay: 200 },
  { x: 0.8, y: 0.86, size: 36, dur: 2900, delay: 700 },
  { x: 0.2, y: 0.92, size: 30, dur: 3500, delay: 1100 },
  { x: 0.5, y: 0.05, size: 28, dur: 3000, delay: 500 },
];

function Floater({ d, w, h, emoji }: { d: (typeof DEVILS)[number]; w: number; h: number; emoji: string }) {
  const t = useSharedValue(0);
  const o = useSharedValue(0);
  useEffect(() => {
    o.value = withDelay(d.delay / 3, withTiming(1, { duration: 600 }));
    t.value = withDelay(d.delay, withRepeat(withTiming(1, { duration: d.dur, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [d.delay, d.dur, t, o]);
  const style = useAnimatedStyle(() => ({
    opacity: o.value * 0.55,
    transform: [{ translateY: -14 * t.value }, { rotate: `${(t.value - 0.5) * 12}deg` }],
  }));
  return (
    <Animated.Text style={[{ position: 'absolute', left: d.x * w - d.size / 2, top: d.y * h, fontSize: d.size }, style]}>{emoji}</Animated.Text>
  );
}

/** Full-screen solid background (plus the floating devils in Spicy mode). */
// Same seven spots either way, so turning Spicy on swaps some drinks for devils instead of
// adding clutter.
const FLOATERS: Partial<Record<Tint, string[]>> = {
  spicy: ['😈'],
  drinks: ['🍺', '🍸'],
  drinksSpicy: ['🍺', '😈', '🍸', '😈', '🍺', '😈', '🍸'],
};

export type Tint = 'red' | 'green' | 'party' | 'spicy' | 'fire' | 'drinks' | 'drinksSpicy';

export function Background({ tint }: { tint?: Tint }) {
  const floaters = tint ? FLOATERS[tint] : undefined;
  const { width, height } = useScreenSize();
  // A single solid colour (no gradients or moving shapes). Tints only swap the colour.
  const bg =
    tint === 'red' ? '#4A0E26' : tint === 'green' ? '#0C3A2C' : tint === 'party' || tint === 'spicy' || tint === 'drinks' || tint === 'drinksSpicy' ? '#3A0B48' : tint === 'fire' ? '#4A1608' : colors.bgBottom;
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: bg }]} pointerEvents="none">
      {floaters && DEVILS.map((d, i) => <Floater key={i} d={d} w={width} h={height} emoji={floaters[i % floaters.length]} />)}
    </View>
  );
}
