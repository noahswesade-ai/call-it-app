import React, { useEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

/**
 * Springy "boing" toward a value. Implemented as a timed overshoot curve rather
 * than withSpring, which stalls on the web build.
 */
export function bounce(toValue: number, duration = 380, overshoot = 1.8) {
  'worklet';
  // v2 style: a hint of overshoot, not a cartoon boing.
  return withTiming(toValue, { duration, easing: Easing.out(Easing.back(Math.min(overshoot, 1.1))) });
}

/** Gentle idle float. v2 style: half the travel, a little slower (calm, not bouncy). */
export function Bob({
  children,
  amount = 4,
  duration = 1400,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  amount?: number;
  duration?: number;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withDelay(
      delay,
      withRepeat(withTiming(-amount * 0.5, { duration: duration * 1.4, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
  }, [amount, duration, delay, y]);
  const s = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return <Animated.View style={[style, s]}>{children}</Animated.View>;
}

/** Repeating "breathing" scale. v2 style: a third of the old size change, slower. */
export function Pulse({
  children,
  scale = 1.06,
  duration = 600,
  active = true,
  style,
}: {
  children: React.ReactNode;
  scale?: number;
  duration?: number;
  active?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const v = useSharedValue(1);
  useEffect(() => {
    v.value = active
      ? withRepeat(withTiming(1 + (scale - 1) * 0.35, { duration: duration * 1.6, easing: Easing.inOut(Easing.sin) }), -1, true)
      : withTiming(1);
  }, [active, scale, duration, v]);
  const s = useAnimatedStyle(() => ({ transform: [{ scale: v.value }] }));
  return <Animated.View style={[style, s]}>{children}</Animated.View>;
}

/** Slight continuous wobble (rotation). */
export function Wobble({ children, deg = 3, duration = 900, style }: { children: React.ReactNode; deg?: number; duration?: number; style?: StyleProp<ViewStyle> }) {
  const r = useSharedValue(-deg * 0.4);
  useEffect(() => {
    r.value = withRepeat(withTiming(deg * 0.4, { duration, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [deg, duration, r]);
  const s = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value}deg` }] }));
  return <Animated.View style={[style, s]}>{children}</Animated.View>;
}

/** Shakes whenever `trigger` changes. */
export function Shake({ children, trigger, strength = 8, style }: { children: React.ReactNode; trigger: unknown; strength?: number; style?: StyleProp<ViewStyle> }) {
  const x = useSharedValue(0);
  useEffect(() => {
    x.value = withSequence(
      withTiming(strength, { duration: 50 }),
      withTiming(-strength, { duration: 50 }),
      withTiming(strength * 0.6, { duration: 50 }),
      withTiming(-strength * 0.6, { duration: 50 }),
      withTiming(0, { duration: 50 }),
    );
  }, [trigger, strength, x]);
  const s = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return <Animated.View style={[style, s]}>{children}</Animated.View>;
}

/** Springs from 0 to full size on mount, after an optional delay. */
export function PopIn({ children, delay = 0, from = 0.85, style }: { children: React.ReactNode; delay?: number; from?: number; style?: StyleProp<ViewStyle> }) {
  const v = useSharedValue(from);
  const o = useSharedValue(0);
  useEffect(() => {
    o.value = withDelay(delay, withTiming(1, { duration: 160 }));
    v.value = withDelay(delay, withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) }));
  }, [delay, v, o]);
  const s = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ scale: v.value }] }));
  return <Animated.View style={[style, s]}>{children}</Animated.View>;
}

/** Slides in from a side with a springy overshoot. */
export function SlideIn({
  children,
  from = 'bottom',
  distance = 24,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  from?: 'left' | 'right' | 'bottom' | 'top';
  distance?: number;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const d = from === 'left' || from === 'top' ? -distance : distance;
  const v = useSharedValue(d);
  const o = useSharedValue(0);
  useEffect(() => {
    o.value = withDelay(delay, withTiming(1, { duration: 200 }));
    // Timed with an overshoot curve: bouncy, but always lands exactly in place.
    v.value = withDelay(delay, withTiming(0, { duration: 380, easing: Easing.out(Easing.cubic) }));
  }, [delay, v, o]);
  const horizontal = from === 'left' || from === 'right';
  const s = useAnimatedStyle(() => ({
    opacity: o.value,
    transform: horizontal ? [{ translateX: v.value }] : [{ translateY: v.value }],
  }));
  return <Animated.View style={[style, s]}>{children}</Animated.View>;
}

/**
 * Gentle side-to-side sway for avatars so screens never feel static. Each instance
 * starts at a random point with a slightly different speed, so a row of avatars
 * moves organically rather than in lockstep.
 */
export function Sway({ children, deg = 2, style }: { children: React.ReactNode; deg?: number; style?: StyleProp<ViewStyle> }) {
  const seed = React.useMemo(() => ({ delay: Math.random() * 900, duration: 900 + Math.random() * 500 }), []);
  const r = useSharedValue(0);
  useEffect(() => {
    r.value = withDelay(
      seed.delay,
      withRepeat(
        withSequence(
          withTiming(deg, { duration: seed.duration / 2, easing: Easing.inOut(Easing.sin) }),
          withTiming(-deg, { duration: seed.duration, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: seed.duration / 2, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
      ),
    );
  }, [deg, seed, r]);
  const s = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value}deg` }] }));
  return <Animated.View style={[style, s]}>{children}</Animated.View>;
}

/** Plain fade-in after an optional delay (no movement). */
export function FadeIn({ children, delay = 0, duration = 380, style }: { children: React.ReactNode; delay?: number; duration?: number; style?: StyleProp<ViewStyle> }) {
  const o = useSharedValue(0);
  useEffect(() => {
    o.value = withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.quad) }));
  }, [delay, duration, o]);
  const s = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[style, s]}>{children}</Animated.View>;
}
