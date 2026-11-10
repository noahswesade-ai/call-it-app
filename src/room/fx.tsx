import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Polygon } from 'react-native-svg';
import { colors, fonts } from '@/ui/theme';
import { bounce } from '@/ui/motion';
import { useScreenSize } from '@/ui/screenSize';

/** Circular countdown ring with the seconds in the middle. */
export function CountdownRing({ msLeft, total, size = 120, danger }: { msLeft: number; total: number; size?: number; danger?: boolean }) {
  const r = size / 2 - 9;
  const c = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, msLeft / total));
  const secs = Math.ceil(msLeft / 1000);
  const color = danger ? colors.red : frac > 0.5 ? colors.green : colors.gold;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.15)" strokeWidth={12} fill="rgba(20,4,40,0.5)" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={12}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - frac)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <SecondTick key={secs} value={secs} danger={danger} size={size} />
    </View>
  );
}

function SecondTick({ value, danger, size }: { value: number; danger?: boolean; size: number }) {
  const s = useSharedValue(danger ? 1.6 : 1.25);
  useEffect(() => {
    s.value = bounce(1);
  }, [s]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Animated.Text style={[{ color: danger ? colors.red : colors.white, fontFamily: fonts.display, fontSize: size * 0.42 }, st]}>
      {value}
    </Animated.Text>
  );
}

/** Big word that slams onto the screen (scales down from huge, then wobbles). */
export function Slam({ text, color = colors.white, size = 56, delay = 0 }: { text: string; color?: string; size?: number; delay?: number }) {
  const s = useSharedValue(3);
  const o = useSharedValue(0);
  const r = useSharedValue(-12);
  useEffect(() => {
    o.value = withDelay(delay, withTiming(1, { duration: 120 }));
    s.value = withDelay(delay, bounce(1));
    r.value = withDelay(delay, withSequence(bounce(4), bounce(-2)));
  }, [delay, s, o, r]);
  const st = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ scale: s.value }, { rotate: `${r.value}deg` }] }));
  return (
    <Animated.Text
      style={[
        {
          color,
          fontFamily: fonts.display,
          fontSize: size,
          textAlign: 'center',
          textShadowColor: colors.ink,
          textShadowOffset: { width: 0, height: 5 },
          textShadowRadius: 0,
        },
        st,
      ]}
    >
      {text}
    </Animated.Text>
  );
}

/** Emoji rain (🍺 for drinks, ⭐ for wins…). */
export function EmojiRain({ emoji, count = 18 }: { emoji: string; count?: number }) {
  const { width, height } = useScreenSize();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: count }, (_, i) => (
        <Drop key={i} i={i} emoji={emoji} w={width} h={height} />
      ))}
    </View>
  );
}

function Drop({ i, emoji, w, h }: { i: number; emoji: string; w: number; h: number }) {
  const seed = useMemo(() => ({ x: Math.random() * w, delay: Math.random() * 1400, dur: 1800 + Math.random() * 1200, size: 22 + Math.random() * 18, spin: (Math.random() - 0.5) * 120 }), [w]);
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(seed.delay, withRepeat(withTiming(1, { duration: seed.dur, easing: Easing.in(Easing.quad) }), 2, false));
  }, [seed, t]);
  const st = useAnimatedStyle(() => ({
    opacity: t.value > 0.02 && t.value < 0.95 ? 0.9 : 0,
    transform: [{ translateX: seed.x }, { translateY: -40 + (h + 80) * t.value }, { rotate: `${seed.spin * t.value}deg` }],
  }));
  return <Animated.Text style={[{ position: 'absolute', fontSize: seed.size }, st]}>{emoji}</Animated.Text>;
}

/** Pulsing red vignette for the betting crunch. */
export function DangerVignette({ active }: { active: boolean }) {
  const o = useSharedValue(0);
  useEffect(() => {
    o.value = active ? withRepeat(withTiming(1, { duration: 500 }), -1, true) : withTiming(0);
  }, [active, o]);
  const st = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.vignette, st]} />;
}

/** A bar that grows to `pct` (0–100). */
export function GrowBar({ pct, color, delay = 0, height = 18 }: { pct: number; color: string; delay?: number; height?: number }) {
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = withDelay(delay, withTiming(pct, { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, [pct, delay, w]);
  const st = useAnimatedStyle(() => ({ width: `${w.value}%` }));
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden', width: '100%' }}>
      <Animated.View style={[{ height, borderRadius: height / 2, backgroundColor: color }, st]} />
    </View>
  );
}

/** Rotating sunburst rays behind a hero element. */
export function Sunburst({ size = 320, color = 'rgba(255,255,255,0.08)' }: { size?: number; color?: string }) {
  const r = useSharedValue(0);
  useEffect(() => {
    r.value = withRepeat(withTiming(360, { duration: 18000, easing: Easing.linear }), -1);
  }, [r]);
  const st = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value}deg` }] }));
  const rays = 14;
  const c = size / 2;
  const polys = Array.from({ length: rays }, (_, i) => {
    const a0 = ((i - 0.25) / rays) * Math.PI * 2;
    const a1 = ((i + 0.25) / rays) * Math.PI * 2;
    return `${c},${c} ${c + c * Math.cos(a0)},${c + c * Math.sin(a0)} ${c + c * Math.cos(a1)},${c + c * Math.sin(a1)}`;
  });
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size }, st]}>
      <Svg width={size} height={size}>
        {polys.map((pts, i) => (
          <Polygon key={i} points={pts} fill={color} />
        ))}
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  vignette: { borderWidth: 14, borderColor: 'rgba(255,40,60,0.75)', borderRadius: 4 },
});

export { Text };
