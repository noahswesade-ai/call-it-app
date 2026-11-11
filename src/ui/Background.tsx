import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Polygon, Rect } from 'react-native-svg';
import { colors } from './theme';
import { useScreenSize } from '@/ui/screenSize';

type Shape = 'circle' | 'triangle' | 'square' | 'star';

const SHAPES: { shape: Shape; x: number; y: number; size: number; color: string; dur: number; delay: number }[] = [
  { shape: 'circle', x: 0.08, y: 0.12, size: 46, color: colors.gold, dur: 7000, delay: 0 },
  { shape: 'triangle', x: 0.82, y: 0.08, size: 52, color: colors.pink, dur: 8000, delay: 600 },
  { shape: 'square', x: 0.9, y: 0.45, size: 38, color: colors.cyan, dur: 6500, delay: 300 },
  { shape: 'star', x: 0.06, y: 0.55, size: 44, color: colors.green, dur: 9000, delay: 900 },
  { shape: 'circle', x: 0.75, y: 0.82, size: 60, color: colors.violet, dur: 7500, delay: 200 },
  { shape: 'triangle', x: 0.15, y: 0.88, size: 40, color: colors.gold, dur: 8500, delay: 1200 },
  { shape: 'square', x: 0.45, y: 0.04, size: 26, color: colors.green, dur: 6000, delay: 400 },
];

function ShapeSvg({ shape, size, color }: { shape: Shape; size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {shape === 'circle' && <Circle cx={50} cy={50} r={42} fill="none" stroke={color} strokeWidth={14} />}
      {shape === 'triangle' && <Polygon points="50,8 94,88 6,88" fill="none" stroke={color} strokeWidth={13} strokeLinejoin="round" />}
      {shape === 'square' && <Rect x={10} y={10} width={80} height={80} rx={14} fill="none" stroke={color} strokeWidth={13} />}
      {shape === 'star' && (
        <Polygon
          points="50,6 61,38 95,38 67,58 78,92 50,71 22,92 33,58 5,38 39,38"
          fill={color}
        />
      )}
    </Svg>
  );
}

function Floater({ s, w, h }: { s: (typeof SHAPES)[number]; w: number; h: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(s.delay, withRepeat(withTiming(1, { duration: s.dur, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [s.delay, s.dur, t]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -18 * t.value }, { translateX: 10 * t.value }, { rotate: `${t.value * 40 - 20}deg` }],
  }));
  return (
    <Animated.View style={[{ position: 'absolute', left: s.x * w - s.size / 2, top: s.y * h, opacity: 0.22 }, style]}>
      <ShapeSvg shape={s.shape} size={s.size} color={s.color} />
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

/** Full-screen party gradient with slowly drifting shapes. */
export function Background({ tint }: { tint?: 'red' | 'green' | 'party' | 'spicy' | 'fire' }) {
  const { width, height } = useScreenSize();
  const gradient = useMemo<[string, string, string]>(() => {
    if (tint === 'red') return ['#7A0A1E', '#B3122E', '#3D0010'];
    if (tint === 'green') return ['#05603A', '#0E9F5D', '#023821'];
    if (tint === 'party' || tint === 'spicy') return ['#2A0040', '#5C0A6B', '#14001F'];
    if (tint === 'fire') return ['#4A0A00', '#B8360A', '#2A0300'];
    return [colors.bgTop, colors.bgMid, colors.bgBottom];
  }, [tint]);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={gradient} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
      {SHAPES.map((s, i) => (
        <Floater key={i} s={s} w={width} h={height} />
      ))}
      {tint === 'spicy' && DEVILS.map((d, i) => <Devil key={i} d={d} w={width} h={height} />)}
    </View>
  );
}
