import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Polygon, Rect } from 'react-native-svg';
import { colors } from './theme';

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

/** Full-screen party gradient with slowly drifting shapes. */
export function Background({ tint }: { tint?: 'red' | 'green' | 'party' }) {
  const { width, height } = useWindowDimensions();
  const gradient = useMemo<[string, string, string]>(() => {
    if (tint === 'red') return ['#7A0A1E', '#B3122E', '#3D0010'];
    if (tint === 'green') return ['#05603A', '#0E9F5D', '#023821'];
    if (tint === 'party') return ['#2A0040', '#5C0A6B', '#14001F'];
    return [colors.bgTop, colors.bgMid, colors.bgBottom];
  }, [tint]);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={gradient} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
      {SHAPES.map((s, i) => (
        <Floater key={i} s={s} w={width} h={height} />
      ))}
    </View>
  );
}
