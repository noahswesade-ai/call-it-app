import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
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
import * as Haptics from 'expo-haptics';
import { AnimalAvatar } from '@/avatar/AnimalAvatar';
import { UNDERDOG_MULTIPLIER } from '@/game/scoring';
import type { Mode, Player } from '@/game/types';
import { Confetti } from '@/ui/Confetti';
import { Bob, PopIn, Pulse, Shake, SlideIn, Wobble } from '@/ui/motion';
import { colors, fonts } from '@/ui/theme';
import { EmojiRain, Sunburst } from './fx';

/** Strobing white flashes, like a siren hit. */
function Flash({ delay = 0 }: { delay?: number }) {
  const o = useSharedValue(0);
  useEffect(() => {
    o.value = withDelay(
      delay,
      withSequence(
        withTiming(0.85, { duration: 60 }),
        withTiming(0, { duration: 160 }),
        withTiming(0.6, { duration: 60 }),
        withTiming(0, { duration: 220 }),
        withTiming(0.4, { duration: 60 }),
        withTiming(0, { duration: 300 }),
      ),
    );
  }, [delay, o]);
  const st = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF', zIndex: 20 }, st]} />;
}

/** Two rotating siren beams (red and gold) sweeping behind everything. */
function SirenBeams() {
  const r = useSharedValue(0);
  useEffect(() => {
    r.value = withRepeat(withTiming(360, { duration: 1400, easing: Easing.linear }), -1);
  }, [r]);
  const red = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value}deg` }] }));
  const gold = useAnimatedStyle(() => ({ transform: [{ rotate: `${-r.value * 0.8}deg` }] }));
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }]}>
      <Animated.View style={red}>
        <Sunburst size={900} color="rgba(255,60,80,0.22)" />
      </Animated.View>
      <Animated.View style={[{ position: 'absolute' }, gold]}>
        <Sunburst size={700} color="rgba(255,201,60,0.18)" />
      </Animated.View>
    </View>
  );
}

/** Text that alternates between two colors like a flashing sign. */
function Blink({ text, a, b, size, interval = 220 }: { text: string; a: string; b: string; size: number; interval?: number }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setOn((v) => !v), interval);
    return () => clearInterval(t);
  }, [interval]);
  return <Text style={[styles.blink, { fontSize: size, color: on ? a : b }]}>{text}</Text>;
}

/** The giant ×3: slams in, then throbs forever. */
function TimesThree({ delay }: { delay: number }) {
  const s = useSharedValue(4);
  const o = useSharedValue(0);
  const pulse = useSharedValue(1);
  useEffect(() => {
    o.value = withDelay(delay, withTiming(1, { duration: 80 }));
    s.value = withDelay(delay, withTiming(1, { duration: 380, easing: Easing.out(Easing.back(2.5)) }));
    pulse.value = withDelay(delay + 400, withRepeat(withTiming(1.12, { duration: 280, easing: Easing.inOut(Easing.quad) }), -1, true));
    const t = setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }, delay);
    return () => clearTimeout(t);
  }, [delay, s, o, pulse]);
  const st = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ scale: s.value * pulse.value }, { rotate: '-6deg' }] }));
  return (
    <Animated.View style={st}>
      <View style={styles.x3Wrap}>
        <Text style={styles.x3Shadow}>×{UNDERDOG_MULTIPLIER}</Text>
        <Text style={styles.x3}>×{UNDERDOG_MULTIPLIER}</Text>
      </View>
    </Animated.View>
  );
}

/**
 * Full-screen "UNDERDOG ALERT!" takeover. Plays when the bets are revealed and one
 * challenger is backed by 25% or less of the room.
 */
export function UnderdogAlert({
  underdog,
  share,
  backers,
  mode,
  delay = 1300,
}: {
  underdog: Player;
  share: number;
  backers: Player[];
  mode: Mode;
  delay?: number;
}) {
  const [live, setLive] = useState(false);
  const enter = useSharedValue(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setLive(true);
      // A drumroll of heavy taps.
      [0, 120, 240, 420].forEach((ms) =>
        setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), ms),
      );
    }, delay);
    enter.value = withDelay(delay, withTiming(1, { duration: 260 }));
    return () => clearTimeout(t);
  }, [delay, enter]);

  const backdrop = useAnimatedStyle(() => ({ opacity: enter.value }));
  if (!live) return null;

  const pct = Math.round(share * 100);
  const party = mode === 'party';

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 10 }]}>
      <Animated.View style={[StyleSheet.absoluteFill, backdrop]}>
        <LinearGradient colors={['#3D0010', '#7A0A1E', '#2A0040']} style={[StyleSheet.absoluteFill, { borderRadius: 28 }]} />
        <SirenBeams />
      </Animated.View>
      <EmojiRain emoji="🐶" count={14} />
      <Confetti count={60} origin="center" />

      <View style={styles.center}>
        <Shake trigger={live} strength={14}>
          <Text style={styles.alertTop}>🚨 🚨 🚨</Text>
        </Shake>
        <PopIn from={3}>
          <Shake trigger={live} strength={10}>
            <Text style={styles.underdog}>UNDERDOG</Text>
          </Shake>
        </PopIn>
        <PopIn delay={200} from={2}>
          <Blink text="ALERT!" a={colors.gold} b={colors.white} size={44} />
        </PopIn>

        <PopIn delay={450} from={0}>
          <View style={styles.dogCard}>
            <Bob amount={8} duration={260}>
              <AnimalAvatar avatar={underdog.avatar} size={110} mood="nervous" />
            </Bob>
            <View style={styles.dogTag}>
              <Text style={styles.dogTagText}>🐶 {underdog.name}</Text>
            </View>
            <Text style={styles.onlyPct}>Only {pct}% believe!</Text>
          </View>
        </PopIn>

        <TimesThree delay={900} />

        <SlideIn from="bottom" delay={1300}>
          <View style={styles.ruleCard}>
            <Text style={styles.ruleText}>
              If {underdog.name} wins…
            </Text>
            <Text style={styles.ruleBig}>{party ? '🍺 Doubters drink ×3!' : '🎯 Believers score ×3!'}</Text>
          </View>
        </SlideIn>

        {backers.length > 0 && (
          <SlideIn from="bottom" delay={1700}>
            <View style={styles.backers}>
              <Text style={styles.backersLabel}>BRAVE CALLERS</Text>
              <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
                {backers.map((p, i) => (
                  <PopIn key={p.id} delay={1800 + i * 120} from={0}>
                    <AnimalAvatar avatar={p.avatar} size={36} mood="happy" />
                  </PopIn>
                ))}
              </View>
            </View>
          </SlideIn>
        )}
      </View>
      <Flash />
    </View>
  );
}

/** Small pulsing tag shown on the Underdog through the challenge. */
export function UnderdogTag({ mode }: { mode: Mode }) {
  return (
    <Pulse scale={1.1} duration={380}>
      <View style={styles.tag}>
        <Text style={styles.tagText}>🐶 UNDERDOG ×{UNDERDOG_MULTIPLIER}</Text>
        <Text style={styles.tagSub}>{mode === 'party' ? 'doubters drink ×3' : 'believers score ×3'}</Text>
      </View>
    </Pulse>
  );
}

/** Celebration when the Underdog actually wins. */
export function UnderdogVictory({ name, mode }: { name: string; mode: Mode }) {
  useEffect(() => {
    [0, 150, 300].forEach((ms) => setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), ms));
  }, []);
  return (
    <PopIn from={2.5}>
      <Wobble deg={3} duration={300}>
        <LinearGradient colors={[colors.gold, '#FF8A00']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.victory}>
          <Text style={styles.victoryTop}>🐶 THE UNDERDOG WON! 🐶</Text>
          <Text style={styles.victoryName}>{name}</Text>
          <Blink text={mode === 'party' ? 'DOUBTERS DRINK ×3 🍺' : 'BELIEVERS SCORE ×3 🎯'} a={colors.ink} b="#8A0016" size={22} />
        </LinearGradient>
      </Wobble>
    </PopIn>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 20, zIndex: 5 },
  alertTop: { fontSize: 34 },
  underdog: {
    color: colors.white,
    fontFamily: fonts.display,
    fontSize: 62,
    letterSpacing: 1,
    textShadowColor: '#FF1F3D',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  blink: { fontFamily: fonts.display, textShadowColor: colors.ink, textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 0, textAlign: 'center' },
  dogCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderColor: colors.gold,
    borderWidth: 4,
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 10,
    shadowColor: colors.gold,
    shadowOpacity: 0.9,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },
  dogTag: { backgroundColor: colors.gold, borderRadius: 99, paddingHorizontal: 14, paddingVertical: 3, marginTop: 4 },
  dogTagText: { color: colors.ink, fontFamily: fonts.display, fontSize: 22 },
  onlyPct: { color: '#FFD1D8', fontFamily: fonts.bodyBold, fontSize: 15, marginTop: 6 },
  x3Wrap: { alignItems: 'center', justifyContent: 'center' },
  x3: { color: colors.gold, fontFamily: fonts.display, fontSize: 120, lineHeight: 130 },
  x3Shadow: { position: 'absolute', color: '#8A0016', fontFamily: fonts.display, fontSize: 120, lineHeight: 130, top: 8 },
  ruleCard: { backgroundColor: colors.white, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 6, borderBottomColor: '#C9B8F0' },
  ruleText: { color: '#6B5A99', fontFamily: fonts.bodyBold, fontSize: 15 },
  ruleBig: { color: colors.ink, fontFamily: fonts.display, fontSize: 26 },
  backers: { alignItems: 'center', gap: 4, marginTop: 4 },
  backersLabel: { color: colors.gold, fontFamily: fonts.display, fontSize: 13, letterSpacing: 2 },
  tag: { backgroundColor: colors.gold, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4, alignItems: 'center', borderWidth: 2.5, borderColor: colors.ink },
  tagText: { color: colors.ink, fontFamily: fonts.display, fontSize: 15 },
  tagSub: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 10 },
  victory: { borderRadius: 24, padding: 16, alignItems: 'center', gap: 2, borderWidth: 4, borderColor: colors.ink },
  victoryTop: { color: colors.ink, fontFamily: fonts.display, fontSize: 22 },
  victoryName: { color: colors.white, fontFamily: fonts.display, fontSize: 36, textShadowColor: colors.ink, textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 0 },
});
