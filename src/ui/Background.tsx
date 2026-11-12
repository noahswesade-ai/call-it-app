import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { colors } from './theme';
import { useScreenSize } from '@/ui/screenSize';

/**
 * v2 background: no confetti shapes. Two large, very soft glows drift slowly behind the
 * content, enough movement to feel alive without competing with it.
 */
const GLOWS = [
  { x: 0.15, y: 0.12, r: 260, key: 'a', dur: 14000, delay: 0 },
  { x: 0.9, y: 0.78, r: 300, key: 'b', dur: 17000, delay: 2000 },
] as const;

function Glow({ g, w, h, color }: { g: (typeof GLOWS)[number]; w: number; h: number; color: string }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(g.delay, withRepeat(withTiming(1, { duration: g.dur, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [g.delay, g.dur, t]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -40 * t.value }, { translateX: 30 * t.value }, { scale: 1 + 0.08 * t.value }],
  }));
  const id = `glow-${g.key}`;
  return (
    <Animated.View style={[{ position: 'absolute', left: g.x * w - g.r, top: g.y * h - g.r }, style]}>
      <Svg width={g.r * 2} height={g.r * 2}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={0.32} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={g.r} cy={g.r} r={g.r} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

/** Happy little devils floating gently up and down (Spicy mode on). */
const DEVILS = [
  { x: 0.1, y: 0.18, size: 34, dur: 2600, delay: 0 },
  { x: 0.88, y: 0.14, size: 40, dur: 3100, delay: 400 },
  { x: 0.92, y: 0.5, size: 30, dur: 2800, delay: 900 },
  { x: 0.07, y: 0.62, size: 38, dur: 3300, delay: 200 },
  { x: 0.8, y: 0.86, size: 36, dur: 2900, delay: 700 },
  { x: 0.2, y: 0.92, size: 30, dur: 3500, delay: 1100 },
  { x: 0.5, y: 0.05, size: 28, dur: 3000, delay: 500 },
];

function Devil({ d, w, h }: { d: (typeof DEVILS)[number]; w: number; h: number }) {
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
    <Animated.Text style={[{ position: 'absolute', left: d.x * w - d.size / 2, top: d.y * h, fontSize: d.size }, style]}>😈</Animated.Text>
  );
}

/** Full-screen deep gradient with two slowly drifting soft glows. */
export function Background({ tint }: { tint?: 'red' | 'green' | 'party' | 'spicy' | 'fire' }) {
  const { width, height } = useScreenSize();
  // Same deep base everywhere; the tint only changes the two glows (and darkens a touch).
  const [base, glowA, glowB] = useMemo<[[string, string, string], string, string]>(() => {
    if (tint === 'red') return [['#2A0D1A', '#1C0A16', '#0E060C'], colors.red, '#FF8A5C'];
    if (tint === 'green') return [['#0D2A24', '#0B1F1C', '#06100E'], colors.green, colors.cyan];
    if (tint === 'party' || tint === 'spicy') return [['#2A0F3A', '#1C0B2C', '#0E0618'], colors.neon, colors.violet];
    if (tint === 'fire') return [['#2E1206', '#1E0B05', '#0F0603'], '#FF7A2E', colors.gold];
    return [[colors.bgTop, colors.bgMid, colors.bgBottom], colors.violet, colors.gold];
  }, [tint]);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={base} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFill} />
      <Glow g={GLOWS[0]} w={width} h={height} color={glowA} />
      <Glow g={GLOWS[1]} w={width} h={height} color={glowB} />
      {tint === 'spicy' && DEVILS.map((d, i) => <Devil key={i} d={d} w={width} h={height} />)}
    </View>
  );
}
