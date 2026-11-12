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
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
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
  const r = useSharedValue(0);
  useEffect(() => {
    // v2: a firm scale-in, no cartoon tilt.
    s.value = 1.6;
    o.value = withDelay(delay, withTiming(1, { duration: 120 }));
    s.value = withDelay(delay, withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) }));
  }, [delay, s, o, r]);
  const st = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ scale: s.value }, { rotate: `${r.value}deg` }] }));
  return (
    <Animated.Text
      style={[
        {
          color,
          fontFamily: fonts.display,
          // The v2 display face runs wider than the old one: scale headline sizes to fit.
          fontSize: Math.round(size * 0.82),
          letterSpacing: -0.5,
          textAlign: 'center',
          textShadowColor: 'rgba(0,0,0,0.35)',
          textShadowOffset: { width: 0, height: 3 },
          textShadowRadius: 8,
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

/**
 * Soft spotlight glow behind a hero element (v2: replaces the cartoon sunburst rays).
 * Breathes very slowly. `color` is an rgba string; its alpha sets the strength.
 */
export function Sunburst({ size = 320, color = 'rgba(255,255,255,0.08)' }: { size?: number; color?: string }) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [v]);
  const st = useAnimatedStyle(() => ({ opacity: 0.8 + 0.2 * v.value, transform: [{ scale: 0.96 + 0.06 * v.value }] }));
  const m = color.match(/rgba?\(([^)]+)\)/);
  const parts = m ? m[1].split(',').map((x) => x.trim()) : ['255', '255', '255', '0.1'];
  const rgb = `rgb(${parts[0]},${parts[1]},${parts[2]})`;
  const alpha = Math.min(0.5, Number(parts[3] ?? 0.1) * 2.2);
  const id = useMemo(() => `spot-${Math.random().toString(36).slice(2, 8)}`, []);
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size }, st]}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={rgb} stopOpacity={alpha} />
            <Stop offset="0.55" stopColor={rgb} stopOpacity={alpha * 0.35} />
            <Stop offset="1" stopColor={rgb} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  vignette: { borderWidth: 14, borderColor: 'rgba(255,40,60,0.75)', borderRadius: 4 },
});

export { Text };
