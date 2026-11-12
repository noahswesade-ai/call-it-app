import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { colors, fonts } from './theme';
import { bounce } from '@/ui/motion';

/** A shiny embossed gold coin. */
export function Coin({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="coinFace" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFF3A6" />
          <Stop offset="0.45" stopColor="#FFC93C" />
          <Stop offset="1" stopColor="#E08A00" />
        </LinearGradient>
        <LinearGradient id="coinRim" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFD86B" />
          <Stop offset="1" stopColor="#A85F00" />
        </LinearGradient>
      </Defs>
      <Circle cx={50} cy={54} r={44} fill="#8A4B00" />
      <Circle cx={50} cy={50} r={44} fill="url(#coinRim)" />
      <Circle cx={50} cy={50} r={35} fill="url(#coinFace)" stroke="#C77700" strokeWidth={3} />
      <Path
        d="M50 25 L57 42 L75 43 L61 54 L66 72 L50 62 L34 72 L39 54 L25 43 L43 42 Z"
        fill="#FFE27A"
        stroke="#C77700"
        strokeWidth={3}
        strokeLinejoin="round"
      />
      <Path d="M28 34 Q36 22 50 20" stroke="#FFFFFF" strokeWidth={5} strokeLinecap="round" fill="none" opacity={0.7} />
    </Svg>
  );
}

/** A coin that spins in place (Y-axis flip) every few seconds. */
export function SpinningCoin({ size = 24, every = 3200 }: { size?: number; every?: number }) {
  const r = useSharedValue(0);
  useEffect(() => {
    r.value = withRepeat(
      withSequence(withDelay(every, withTiming(360, { duration: 700, easing: Easing.inOut(Easing.quad) })), withTiming(0, { duration: 0 })),
      -1,
    );
  }, [every, r]);
  const s = useAnimatedStyle(() => ({ transform: [{ perspective: 300 }, { rotateY: `${r.value}deg` }] }));
  return (
    <Animated.View style={s}>
      <Coin size={size} />
    </Animated.View>
  );
}

/** Animated number that rolls toward its target. */
export function useCountUp(target: number, duration = 900): number {
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = Date.now();
    const a = from.current;
    if (a === target) return;
    let raf: ReturnType<typeof requestAnimationFrame>;
    const step = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setShown(Math.round(a + (target - a) * eased));
      if (t < 1) raf = requestAnimationFrame(step);
      else from.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return shown;
}

/** Coin balance pill. Bounces and shows "+N" whenever the balance goes up. */
export function CoinCounter({ coins, onPress, size = 'md' }: { coins: number; onPress?: () => void; size?: 'md' | 'lg' }) {
  const shown = useCountUp(coins);
  const prev = useRef(coins);
  const [gain, setGain] = useState(0);
  const bump = useSharedValue(1);
  const gainY = useSharedValue(0);
  const gainO = useSharedValue(0);

  useEffect(() => {
    if (coins > prev.current) {
      setGain(coins - prev.current);
      bump.value = withSequence(bounce(1.25), bounce(1));
      gainY.value = 0;
      gainO.value = 1;
      gainY.value = withTiming(-34, { duration: 1100 });
      gainO.value = withDelay(700, withTiming(0, { duration: 400 }));
    }
    prev.current = coins;
  }, [coins, bump, gainY, gainO]);

  const pill = useAnimatedStyle(() => ({ transform: [{ scale: bump.value }] }));
  const gainStyle = useAnimatedStyle(() => ({ opacity: gainO.value, transform: [{ translateY: gainY.value }] }));
  const big = size === 'lg';

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${coins} coins`}>
      <Animated.View style={[styles.pill, big && styles.pillLg, pill]}>
        <SpinningCoin size={big ? 34 : 26} />
        <Text style={[styles.count, big && { fontSize: 26 }]}>{shown.toLocaleString()}</Text>
      </Animated.View>
      <Animated.Text style={[styles.gain, gainStyle]}>+{gain}</Animated.Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(20,4,40,0.55)',
    borderWidth: 2,
    borderColor: colors.gold,
    paddingLeft: 5,
    paddingRight: 14,
    paddingVertical: 4,
    borderRadius: 99,
  },
  pillLg: { paddingVertical: 6, paddingRight: 18 },
  count: { color: colors.gold, fontFamily: fonts.display, fontSize: 20, textShadowColor: '#7A3E00', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
  gain: { position: 'absolute', right: 6, top: 0, color: colors.gold, fontFamily: fonts.display, fontSize: 20 },
});

/** Shows "+N coins" with coins raining in; used on the podium. */
export function CoinReward({ amount }: { amount: number }) {
  const shown = useCountUp(amount, 1600);
  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <SpinningCoin size={44} every={900} />
        <Text style={[styles.count, { fontSize: 40 }]}>+{shown}</Text>
      </View>
    </View>
  );
}
