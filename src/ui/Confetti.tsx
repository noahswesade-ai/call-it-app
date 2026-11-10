import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { colors } from './theme';
import { useScreenSize } from '@/ui/screenSize';

const PALETTE = [colors.gold, colors.pink, colors.cyan, colors.green, colors.violet, '#FFFFFF'];

function Piece({ i, w, h, origin }: { i: number; w: number; h: number; origin: 'top' | 'center' }) {
  const seed = useMemo(
    () => ({
      x: Math.random(),
      drift: (Math.random() - 0.5) * 220,
      spin: (Math.random() - 0.5) * 1080,
      delay: Math.random() * 350,
      dur: 1600 + Math.random() * 1400,
      size: 7 + Math.random() * 8,
      color: PALETTE[i % PALETTE.length],
      round: Math.random() < 0.3,
      burst: (Math.random() - 0.5) * 2,
    }),
    [i],
  );
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(seed.delay, withTiming(1, { duration: seed.dur, easing: Easing.out(Easing.quad) }));
  }, [seed, t]);
  const style = useAnimatedStyle(() => {
    const startX = origin === 'center' ? w / 2 : seed.x * w;
    const startY = origin === 'center' ? h * 0.35 : -20;
    // Center bursts fly outward then fall; top confetti just falls.
    const x = startX + (origin === 'center' ? seed.burst * 180 * Math.min(1, t.value * 3) : 0) + seed.drift * t.value;
    const y =
      origin === 'center' ? startY - 160 * Math.sin(Math.min(1, t.value * 2.2) * Math.PI * 0.5) + h * 0.9 * t.value * t.value : startY + (h + 40) * t.value;
    return {
      opacity: t.value < 0.85 ? 1 : (1 - t.value) / 0.15,
      transform: [{ translateX: x }, { translateY: y }, { rotate: `${seed.spin * t.value}deg` }],
    };
  });
  return (
    <Animated.View
      style={[
        { position: 'absolute', left: 0, top: 0, width: seed.size, height: seed.round ? seed.size : seed.size * 0.5, backgroundColor: seed.color, borderRadius: seed.round ? seed.size : 2 },
        style,
      ]}
    />
  );
}

/** One-shot confetti. Change `burstKey` to fire again. */
export function Confetti({ count = 60, origin = 'top', burstKey = 0 }: { count?: number; origin?: 'top' | 'center'; burstKey?: number | string }) {
  const { width, height } = useScreenSize();
  return (
    <View key={burstKey} style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: count }, (_, i) => (
        <Piece key={i} i={i} w={width} h={height} origin={origin} />
      ))}
    </View>
  );
}
