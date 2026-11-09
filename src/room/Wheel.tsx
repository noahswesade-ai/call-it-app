import { useEffect, useRef, useState } from 'react';
import { Animated as RNAnimated, Easing as RNEasing, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, G, Path, Polygon, Text as SvgText } from 'react-native-svg';
import { CATEGORY_BY_ID, DIFFICULTY_LABEL } from '@/content/categories';
import type { Category, Difficulty, WheelSlice } from '@/game/types';
import { Confetti } from '@/ui/Confetti';
import { Pill, tap } from '@/ui/kit';
import { Bob, PopIn } from '@/ui/motion';
import { colors, fonts } from '@/ui/theme';
import { Slam } from './fx';

interface Props {
  slices: WheelSlice[];
  landOn: WheelSlice;
  /** Shown after landing on "Random". */
  randomResult: Category;
  difficulty: Difficulty;
  /** Greyed-out locked slice shown to free hosts as a gentle upsell. */
  lockedSlice?: boolean;
  durationMs: number;
}

const SIZE = 310;
const R = SIZE / 2;
const BULBS = 20;

function sliceInfo(s: WheelSlice | 'locked') {
  if (s === 'random') return { label: 'Random', emoji: '🎲', color: '#FFFFFF' };
  if (s === 'locked') return { label: 'Party', emoji: '🔒', color: '#3A1F5C' };
  const c = CATEGORY_BY_ID[s];
  return { label: c.label, emoji: c.emoji, color: c.color };
}

function arc(i: number, n: number, r: number): string {
  const a0 = (i / n) * 2 * Math.PI - Math.PI / 2;
  const a1 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${R} ${R} L${R + r * Math.cos(a0)} ${R + r * Math.sin(a0)} A${r} ${r} 0 ${large} 1 ${R + r * Math.cos(a1)} ${R + r * Math.sin(a1)} Z`;
}

/** Marquee bulbs around the rim; alternate sets blink like a game-show wheel. */
function Bulbs({ fast }: { fast: boolean }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setOn((v) => !v), fast ? 120 : 450);
    return () => clearInterval(t);
  }, [fast]);
  return (
    <Svg width={SIZE + 24} height={SIZE + 24} style={{ position: 'absolute', left: -12, top: -12 }}>
      <Circle cx={R + 12} cy={R + 12} r={R + 6} fill="none" stroke={colors.goldLip} strokeWidth={16} />
      <Circle cx={R + 12} cy={R + 12} r={R + 6} fill="none" stroke={colors.gold} strokeWidth={10} />
      {Array.from({ length: BULBS }, (_, i) => {
        const a = (i / BULBS) * Math.PI * 2;
        const lit = (i % 2 === 0) === on;
        return (
          <Circle
            key={i}
            cx={R + 12 + (R + 6) * Math.cos(a)}
            cy={R + 12 + (R + 6) * Math.sin(a)}
            r={lit ? 5.5 : 4}
            fill={lit ? '#FFFFFF' : '#B86E00'}
          />
        );
      })}
    </Svg>
  );
}

export function Wheel({ slices, landOn, randomResult, difficulty, lockedSlice, durationMs }: Props) {
  const all: (WheelSlice | 'locked')[] = lockedSlice ? [...slices, 'locked'] : slices;
  const n = all.length;
  const index = Math.max(0, all.indexOf(landOn));
  const rotation = useRef(new RNAnimated.Value(0)).current;
  const [landed, setLanded] = useState(false);
  const lastSlice = useRef(0);
  const flick = useSharedValue(0);
  const grow = useSharedValue(0.6);

  useEffect(() => {
    grow.value = withTiming(1, { duration: 350 });
    // Rotate so the chosen slice's centre ends under the pointer at the top.
    const sliceCentre = ((index + 0.5) / n) * 360;
    const jitter = (Math.random() - 0.5) * (300 / n) * 0.6;
    const target = 360 * 6 + (360 - sliceCentre) + jitter;
    rotation.setValue(0);
    // Pointer clicks and phone ticks every time a slice boundary passes it.
    const id = rotation.addListener(({ value }) => {
      const s = Math.floor(value / (360 / n));
      if (s !== lastSlice.current) {
        lastSlice.current = s;
        flick.value = withSequence(withTiming(-18, { duration: 40 }), withTiming(0, { duration: 120 }));
        tap('light');
      }
    });
    RNAnimated.timing(rotation, {
      toValue: target,
      duration: Math.max(1800, durationMs - 1300),
      easing: RNEasing.bezier(0.15, 0.85, 0.25, 1.02),
      useNativeDriver: false,
    }).start(() => {
      tap('heavy');
      setLanded(true);
    });
    return () => rotation.removeListener(id);
  }, [landOn, index, n, durationMs, rotation, flick, grow]);

  const spin = rotation.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] });
  const result = sliceInfo(landOn === 'random' ? randomResult : landOn);
  const pointerStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${flick.value}deg` }] }));
  const wheelIn = useAnimatedStyle(() => ({ transform: [{ scale: grow.value }] }));

  return (
    <View style={{ alignItems: 'center', gap: 18 }}>
      <Animated.View style={[{ width: SIZE, height: SIZE + 20, marginTop: 10 }, wheelIn]}>
        <View style={{ marginTop: 20 }}>
          <Bulbs fast={!landed} />
          <RNAnimated.View style={{ transform: [{ rotate: spin }] }}>
            <Svg width={SIZE} height={SIZE}>
              {all.map((s, i) => {
                const info = sliceInfo(s);
                const mid = ((i + 0.5) / n) * 2 * Math.PI - Math.PI / 2;
                const tx = R + R * 0.68 * Math.cos(mid);
                const ty = R + R * 0.68 * Math.sin(mid);
                const isWinner = landed && s === landOn;
                return (
                  <G key={`${s}-${i}`}>
                    <Path d={arc(i, n, R)} fill={info.color} stroke={colors.ink} strokeWidth={3} opacity={landed && !isWinner ? 0.55 : 1} />
                    <SvgText x={tx} y={ty + 10} fontSize={28} textAnchor="middle">
                      {info.emoji}
                    </SvgText>
                  </G>
                );
              })}
              <Circle cx={R} cy={R} r={30} fill={colors.ink} stroke={colors.gold} strokeWidth={5} />
              <Circle cx={R} cy={R} r={12} fill={colors.gold} />
            </Svg>
          </RNAnimated.View>
        </View>
        <Animated.View style={[styles.pointer, pointerStyle]}>
          <Svg width={44} height={46}>
            <Polygon points="4,4 40,4 22,42" fill={colors.white} stroke={colors.ink} strokeWidth={4} strokeLinejoin="round" />
            <Circle cx={22} cy={14} r={5} fill={colors.pink} />
          </Svg>
        </Animated.View>
      </Animated.View>

      <View style={{ alignItems: 'center', gap: 8, minHeight: 110 }}>
        {landed && (
          <>
            {landOn === 'random' && <Text style={styles.sub}>🎲 Random picked…</Text>}
            <Slam text={`${result.emoji} ${result.label}`} size={40} color={colors.white} />
            <PopIn delay={250}>
              <Bob amount={3} duration={600}>
                <Pill
                  label={`${difficulty === 'H' ? '🔥🔥🔥' : difficulty === 'M' ? '🔥🔥' : '🔥'} ${DIFFICULTY_LABEL[difficulty].toUpperCase()}`}
                  color={difficulty === 'H' ? colors.red : difficulty === 'M' ? colors.gold : colors.green}
                  textColor={difficulty === 'H' ? colors.white : colors.ink}
                />
              </Bob>
            </PopIn>
          </>
        )}
      </View>
      {landed && <Confetti count={40} origin="center" />}
    </View>
  );
}

const styles = StyleSheet.create({
  pointer: { position: 'absolute', top: 0, left: SIZE / 2 - 22, zIndex: 2, transformOrigin: 'top' },
  sub: { color: colors.dim, fontSize: 16, fontFamily: fonts.display },
});
