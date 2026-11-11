import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G, Image as SvgImage, Path, Polygon, Text as SvgText } from 'react-native-svg';
import { CATEGORY_ICONS, CategoryIcon } from '@/content/CategoryIcon';
import { CATEGORY_BY_ID, DIFFICULTY_LABEL, RANDOM_DESCRIPTION } from '@/content/categories';
import type { Category, Difficulty, WheelSlice } from '@/game/types';
import { Confetti } from '@/ui/Confetti';
import { Pill, tap } from '@/ui/kit';
import { Bob, PopIn } from '@/ui/motion';
import { playSfx, playTick } from '@/ui/sound';
import { colors, fonts } from '@/ui/theme';

interface Props {
  slices: WheelSlice[];
  landOn: WheelSlice;
  /** Shown after landing on "Random". */
  randomResult: Category;
  difficulty: Difficulty;
  /** Greyed-out locked slice shown to free hosts as a gentle upsell. */
  lockedSlice?: boolean;
  /** Total time of the spin phase; the spin itself takes most of it, the category box the rest. */
  durationMs: number;
}

const SIZE = 300;
const R = SIZE / 2;
const BULBS = 20;
/** Time after landing that is reserved for the glow + category box. */
const AFTER_LANDING_MS = 3000;

function sliceInfo(s: WheelSlice | 'locked') {
  if (s === 'random') return { label: 'Random', emoji: '🎲', color: '#FFFFFF', description: RANDOM_DESCRIPTION };
  if (s === 'locked') return { label: 'Party', emoji: '🔒', color: '#3A1F5C', description: '' };
  const c = CATEGORY_BY_ID[s];
  return { label: c.label, emoji: c.emoji, color: c.color, description: c.description };
}

/** A slice's illustrated icon on a soft white disc (emoji for Party/Spicy/locked). */
function SliceGlyph({ slice, x, y, size }: { slice: WheelSlice | 'locked'; x: number; y: number; size: number }) {
  const icon = slice === 'locked' ? undefined : CATEGORY_ICONS[slice];
  return (
    <G>
      <Circle cx={x} cy={y} r={size * 0.6} fill="#FFFFFF" opacity={0.9} />
      {icon ? (
        <SvgImage href={icon} x={x - size / 2} y={y - size / 2} width={size} height={size} preserveAspectRatio="xMidYMid meet" />
      ) : (
        <SvgText x={x} y={y + size * 0.33} fontSize={size * 0.8} textAnchor="middle">
          {sliceInfo(slice).emoji}
        </SvgText>
      )}
    </G>
  );
}

function arc(i: number, n: number, r: number): string {
  const a0 = (i / n) * 2 * Math.PI - Math.PI / 2;
  const a1 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${R} ${R} L${R + r * Math.cos(a0)} ${R + r * Math.sin(a0)} A${r} ${r} 0 ${large} 1 ${R + r * Math.cos(a1)} ${R + r * Math.sin(a1)} Z`;
}

/** Web: keep the spinning layers on the GPU so the wheel doesn't stutter. */
const GPU = Platform.OS === 'web' ? ({ willChange: 'transform' } as object) : {};

function BulbRing({ lit }: { lit: (i: number) => boolean }) {
  return (
    <Svg width={SIZE + 24} height={SIZE + 24}>
      {Array.from({ length: BULBS }, (_, i) => {
        const a = (i / BULBS) * Math.PI * 2;
        const on = lit(i);
        return (
          <Circle key={i} cx={R + 12 + (R + 6) * Math.cos(a)} cy={R + 12 + (R + 6) * Math.sin(a)} r={on ? 5.5 : 4} fill={on ? '#FFFFFF' : '#B86E00'} />
        );
      })}
    </Svg>
  );
}

/**
 * Marquee bulbs around the rim: two pre-drawn rings cross-fade (alternating bulbs while
 * spinning, all of them flashing on landing). No React re-renders while animating.
 */
const Bulbs = memo(function Bulbs({ landed }: { landed: boolean }) {
  const blink = useSharedValue(0);
  useEffect(() => {
    blink.value = 0;
    blink.value = withRepeat(withTiming(1, { duration: landed ? 220 : 110, easing: Easing.linear }), -1, true);
  }, [landed, blink]);
  const a = useAnimatedStyle(() => ({ opacity: blink.value > 0.5 ? 1 : 0 }));
  const b = useAnimatedStyle(() => ({ opacity: blink.value > 0.5 ? 0 : 1 }));
  return (
    <View style={{ position: 'absolute', left: -12, top: -12, width: SIZE + 24, height: SIZE + 24 }} pointerEvents="none">
      <Svg width={SIZE + 24} height={SIZE + 24} style={StyleSheet.absoluteFill}>
        <Circle cx={R + 12} cy={R + 12} r={R + 6} fill="none" stroke={colors.goldLip} strokeWidth={16} />
        <Circle cx={R + 12} cy={R + 12} r={R + 6} fill="none" stroke={colors.gold} strokeWidth={10} />
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, a]}>
        <BulbRing lit={(i) => (landed ? true : i % 2 === 0)} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, b]}>
        <BulbRing lit={(i) => (landed ? false : i % 2 === 1)} />
      </Animated.View>
    </View>
  );
});

/** The wheel face itself. Memoized: it never re-renders while spinning. */
const WheelFace = memo(function WheelFace({ all, landed, index }: { all: (WheelSlice | 'locked')[]; landed: boolean; index: number }) {
  const n = all.length;
  return (
    <Svg width={SIZE} height={SIZE}>
      <Circle cx={R} cy={R} r={R} fill={colors.ink} />
      {all.map((s, i) => {
        const info = sliceInfo(s);
        const m = ((i + 0.5) / n) * 2 * Math.PI - Math.PI / 2;
        const dim = landed && i !== index;
        return (
          <G key={`${s}-${i}`} opacity={dim ? 0.3 : 1}>
            <Path d={arc(i, n, R)} fill={info.color} stroke={colors.ink} strokeWidth={3} />
            <SliceGlyph slice={s} x={R + R * 0.68 * Math.cos(m)} y={R + R * 0.68 * Math.sin(m)} size={34} />
          </G>
        );
      })}
    </Svg>
  );
});

/** The winning slice, redrawn on top: it grows out of the wheel and glows. */
function WinningSlice({ index, n, color }: { index: number; n: number; color: string }) {
  const grow = useSharedValue(1);
  const glow = useSharedValue(0);
  useEffect(() => {
    grow.value = withTiming(1.13, { duration: 520, easing: Easing.out(Easing.back(2.4)) });
    glow.value = withSequence(
      withTiming(1, { duration: 200 }),
      withRepeat(withTiming(0.45, { duration: 500, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
  }, [grow, glow]);
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: grow.value }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, scaleStyle]} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, glowStyle]}>
        <Svg width={SIZE} height={SIZE}>
          <Path d={arc(index, n, R)} fill="none" stroke={colors.gold} strokeWidth={18} strokeLinejoin="round" opacity={0.55} />
          <Path d={arc(index, n, R)} fill="none" stroke="#FFF6C8" strokeWidth={8} strokeLinejoin="round" />
        </Svg>
      </Animated.View>
      <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
        <Path d={arc(index, n, R)} fill={color} stroke={colors.ink} strokeWidth={3} />
      </Svg>
    </Animated.View>
  );
}

export function Wheel({ slices, landOn, randomResult, difficulty, lockedSlice, durationMs }: Props) {
  const sliceKey = slices.join(',') + (lockedSlice ? ',locked' : '');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const all: (WheelSlice | 'locked')[] = useMemo(() => (lockedSlice ? [...slices, 'locked'] : slices), [sliceKey]);
  const n = all.length;
  const index = Math.max(0, all.indexOf(landOn));
  const rotation = useSharedValue(0);
  const [landed, setLanded] = useState(false);
  const [showBox, setShowBox] = useState(false);
  const flick = useSharedValue(0);
  const enter = useSharedValue(0.6);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const onTick = () => {
    playTick();
    tap('light');
  };
  const onLanded = () => {
    playSfx('land');
    tap('heavy');
    setLanded(true);
    timers.current.push(setTimeout(() => setShowBox(true), 450));
  };

  // Every slice boundary passing the pointer = a click and a pointer flick. Runs on the
  // animation thread and only calls back into JS when a boundary is actually crossed.
  useAnimatedReaction(
    () => Math.floor(rotation.value / (360 / n)),
    (cur, prev) => {
      if (prev !== null && cur !== prev) {
        flick.value = withSequence(withTiming(-22, { duration: 35 }), withTiming(0, { duration: 140, easing: Easing.out(Easing.quad) }));
        runOnJS(onTick)();
      }
    },
    [n],
  );

  useEffect(() => {
    enter.value = withTiming(1, { duration: 380, easing: Easing.out(Easing.back(1.8)) });
    // Rotate so the chosen slice's centre ends under the pointer at the top.
    const sliceCentre = ((index + 0.5) / n) * 360;
    const jitter = (Math.random() - 0.5) * (300 / n) * 0.55;
    const target = 360 * 7 + (360 - sliceCentre) + jitter;
    const spinMs = Math.max(2500, Math.min(4800, durationMs - AFTER_LANDING_MS));
    rotation.value = 0;
    playSfx('whoosh');
    rotation.value = withTiming(
      target,
      // Fast start, very long slow-down for maximum suspense.
      { duration: spinMs, easing: Easing.bezier(0.1, 0.75, 0.08, 1) },
      (finished) => {
        if (finished) runOnJS(onLanded)();
      },
    );
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landOn, index, n, durationMs]);

  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));
  const result = sliceInfo(landOn === 'random' ? randomResult : landOn);
  const landedInfo = sliceInfo(landOn);
  const pointerStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${flick.value}deg` }] }));
  const wheelIn = useAnimatedStyle(() => ({ transform: [{ scale: enter.value }] }));
  const mid = ((index + 0.5) / n) * 2 * Math.PI - Math.PI / 2;

  return (
    <View style={{ alignItems: 'center', gap: 14 }}>
      <Animated.View style={[{ width: SIZE, height: SIZE + 20, marginTop: 6 }, wheelIn]}>
        <View style={{ marginTop: 20 }}>
          <Bulbs landed={landed} />
          <Animated.View style={[GPU, spinStyle]}>
            <WheelFace all={all} landed={landed} index={index} />
            {landed && (
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <WinningSlice index={index} n={n} color={landedInfo.color} />
                <PopIn from={0.5} style={StyleSheet.absoluteFill}>
                  <Svg width={SIZE} height={SIZE}>
                    <SliceGlyph slice={landOn} x={R + R * 0.74 * Math.cos(mid)} y={R + R * 0.74 * Math.sin(mid)} size={46} />
                  </Svg>
                </PopIn>
              </View>
            )}
            <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill} pointerEvents="none">
              <Circle cx={R} cy={R} r={30} fill={colors.ink} stroke={colors.gold} strokeWidth={5} />
              <Circle cx={R} cy={R} r={12} fill={colors.gold} />
            </Svg>
          </Animated.View>
        </View>
        <Animated.View style={[styles.pointer, pointerStyle]}>
          <Svg width={44} height={46}>
            <Polygon points="4,4 40,4 22,42" fill={colors.white} stroke={colors.ink} strokeWidth={4} strokeLinejoin="round" />
            <Circle cx={22} cy={14} r={5} fill={colors.pink} />
          </Svg>
        </Animated.View>
      </Animated.View>

      <View style={{ minHeight: 150, alignSelf: 'stretch', justifyContent: 'center' }}>
        {showBox && (
          <PopIn from={0.4}>
            <View style={[styles.box, { borderColor: result.color }]}>
              {landOn === 'random' && <Text style={styles.randomNote}>Random picked…</Text>}
              <Bob amount={4} duration={700}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <CategoryIcon category={landOn === 'random' ? randomResult : landOn} size={52} />
                  <Text style={styles.boxTitle}>{result.label}</Text>
                </View>
              </Bob>
              <Text style={styles.boxDesc}>{result.description}</Text>
              <PopIn delay={250}>
                <Pill
                  label={`${difficulty === 'H' ? '🔥🔥🔥' : difficulty === 'M' ? '🔥🔥' : '🔥'} ${DIFFICULTY_LABEL[difficulty].toUpperCase()}`}
                  color={difficulty === 'H' ? colors.red : difficulty === 'M' ? colors.gold : colors.green}
                  textColor={difficulty === 'H' ? colors.white : colors.ink}
                />
              </PopIn>
            </View>
          </PopIn>
        )}
      </View>
      {landed && <Confetti count={40} origin="center" />}
    </View>
  );
}

const styles = StyleSheet.create({
  pointer: { position: 'absolute', top: 0, left: SIZE / 2 - 22, zIndex: 2, transformOrigin: 'top' },
  box: {
    backgroundColor: colors.white,
    borderRadius: 24,
    borderWidth: 5,
    borderBottomWidth: 9,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    gap: 6,
  },
  randomNote: { color: '#6B5A99', fontFamily: fonts.display, fontSize: 15 },
  boxTitle: { color: colors.ink, fontFamily: fonts.display, fontSize: 34, textAlign: 'center' },
  boxDesc: { color: '#4B3D73', fontFamily: fonts.bodySemi, fontSize: 17, textAlign: 'center' },
});
