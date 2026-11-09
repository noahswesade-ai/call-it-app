import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { G, Path, Polygon, Text as SvgText, Circle } from 'react-native-svg';
import { CATEGORY_BY_ID, DIFFICULTY_LABEL } from '@/content/categories';
import type { Category, Difficulty, WheelSlice } from '@/game/types';
import { Pill, tap, theme } from '@/ui/kit';

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

const SIZE = 300;
const R = SIZE / 2;

function sliceInfo(s: WheelSlice | 'locked') {
  if (s === 'random') return { label: 'Random', emoji: '🎲', color: '#FFFFFF' };
  if (s === 'locked') return { label: 'Party', emoji: '🔒', color: '#4A4060' };
  const c = CATEGORY_BY_ID[s];
  return { label: c.label, emoji: c.emoji, color: c.color };
}

function arc(i: number, n: number): string {
  const a0 = (i / n) * 2 * Math.PI - Math.PI / 2;
  const a1 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${R} ${R} L${R + R * Math.cos(a0)} ${R + R * Math.sin(a0)} A${R} ${R} 0 ${large} 1 ${R + R * Math.cos(a1)} ${R + R * Math.sin(a1)} Z`;
}

export function Wheel({ slices, landOn, randomResult, difficulty, lockedSlice, durationMs }: Props) {
  const all: (WheelSlice | 'locked')[] = lockedSlice ? [...slices, 'locked'] : slices;
  const n = all.length;
  const index = Math.max(0, all.indexOf(landOn));
  const rotation = useRef(new Animated.Value(0)).current;
  const [landed, setLanded] = useState(false);

  useEffect(() => {
    // Rotate so the chosen slice's centre ends under the pointer at the top.
    const sliceCentre = ((index + 0.5) / n) * 360;
    const jitter = (Math.random() - 0.5) * (300 / n) * 0.6;
    const target = 360 * 5 + (360 - sliceCentre) + jitter;
    rotation.setValue(0);
    Animated.timing(rotation, {
      toValue: target,
      duration: Math.max(1500, durationMs - 1400),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      tap('heavy');
      setLanded(true);
    });
  }, [landOn, index, n, durationMs, rotation]);

  const spin = rotation.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] });
  const result = sliceInfo(landOn === 'random' ? randomResult : landOn);

  return (
    <View style={{ alignItems: 'center', gap: 16 }}>
      <View style={{ width: SIZE, height: SIZE + 16 }}>
        <View style={styles.pointer}>
          <Svg width={34} height={30}>
            <Polygon points="2,2 32,2 17,28" fill={theme.accent} stroke={theme.ink} strokeWidth={3} />
          </Svg>
        </View>
        <Animated.View style={{ marginTop: 16, transform: [{ rotate: spin }] }}>
          <Svg width={SIZE} height={SIZE}>
            {all.map((s, i) => {
              const info = sliceInfo(s);
              const mid = ((i + 0.5) / n) * 2 * Math.PI - Math.PI / 2;
              const tx = R + R * 0.66 * Math.cos(mid);
              const ty = R + R * 0.66 * Math.sin(mid);
              return (
                <G key={`${s}-${i}`}>
                  <Path d={arc(i, n)} fill={info.color} stroke={theme.ink} strokeWidth={3} opacity={s === 'locked' ? 0.6 : 1} />
                  <SvgText x={tx} y={ty + 9} fontSize={26} textAnchor="middle">
                    {info.emoji}
                  </SvgText>
                </G>
              );
            })}
            <Circle cx={R} cy={R} r={22} fill={theme.ink} stroke="#fff" strokeWidth={3} />
          </Svg>
        </Animated.View>
      </View>
      <View style={{ alignItems: 'center', gap: 8, opacity: landed ? 1 : 0 }}>
        {landOn === 'random' && <Text style={styles.sub}>🎲 Random →</Text>}
        <Text style={styles.result}>
          {result.emoji} {result.label}
        </Text>
        <Pill
          label={DIFFICULTY_LABEL[difficulty]}
          color={difficulty === 'H' ? theme.red : difficulty === 'M' ? theme.accent : theme.green}
          textColor={theme.ink}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pointer: { position: 'absolute', top: 0, left: SIZE / 2 - 17, zIndex: 2 },
  result: { color: theme.text, fontSize: 30, fontWeight: '900' },
  sub: { color: theme.dim, fontSize: 16, fontWeight: '800' },
});
