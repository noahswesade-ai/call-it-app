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
import { Bob, PopIn, Pulse, Shake, SlideIn, Sway } from '@/ui/motion';
import { colors, fonts } from '@/ui/theme';
import { EmojiRain, Sunburst } from './fx';

/** A single soft white flash as the screen appears. */
function Flash({ delay = 0 }: { delay?: number }) {
  const o = useSharedValue(0);
  useEffect(() => {
    o.value = withDelay(
      delay,
      // One soft flash (no strobing — rapid flashing is uncomfortable to look at).
      withSequence(withTiming(0.3, { duration: 180 }), withTiming(0, { duration: 500 })),
    );
  }, [delay, o]);
  const st = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF', zIndex: 20 }, st]} />;
}

/** Two rotating light beams (white and gold) sweeping behind everything. */
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
        <Sunburst size={900} color="rgba(255,255,255,0.12)" />
      </Animated.View>
      <Animated.View style={[{ position: 'absolute' }, gold]}>
        <Sunburst size={700} color="rgba(255,231,120,0.16)" />
      </Animated.View>
    </View>
  );
}

/** The giant ×3: slams in, then throbs forever. */
function TimesThree({ delay }: { delay: number }) {
  const s = useSharedValue(4);
  const o = useSharedValue(0);
  const pulse = useSharedValue(1);
  useEffect(() => {
    o.value = withDelay(delay, withTiming(1, { duration: 80 }));
    s.value = withDelay(delay, withTiming(1, { duration: 380, easing: Easing.out(Easing.back(2.5)) }));
    pulse.value = withDelay(delay + 400, withRepeat(withTiming(1.06, { duration: 320, easing: Easing.inOut(Easing.quad) }), -1, true));
    const t = setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }, delay);
    return () => clearTimeout(t);
  }, [delay, s, o, pulse]);
  const st = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ scale: s.value * pulse.value }, { rotate: '-3deg' }] }));
  const halo = useAnimatedStyle(() => ({ opacity: o.value * (0.35 + (pulse.value - 1) * 4), transform: [{ scale: 0.8 + (pulse.value - 1) * 3 }] }));
  return (
    <Animated.View style={st}>
      <View style={styles.x3Wrap}>
        <Animated.View style={[styles.halo, halo]} />
        <Text style={styles.x3Shadow}>{UNDERDOG_MULTIPLIER}× MULTIPLIER</Text>
        <Text style={styles.x3}>{UNDERDOG_MULTIPLIER}× MULTIPLIER</Text>
      </View>
    </Animated.View>
  );
}

/**
 * Full-screen green "UNDERDOG!" takeover. Plays when the bets are revealed and one
 * challenger is backed by less than 33% of the room.
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
        <LinearGradient colors={['#02391F', '#0B8A4F', '#034D2A']} style={StyleSheet.absoluteFill} />
        <SirenBeams />
      </Animated.View>
      <EmojiRain emoji="🐶" count={14} />
      <Confetti count={60} origin="center" />

      <View style={styles.center}>
        {/* 1. The headers: UNDERDOG + 3× MULTIPLIER */}
        <PopIn from={3}>
          <Shake trigger={live} strength={8}>
            <Text style={styles.underdog}>🐶 UNDERDOG</Text>
          </Shake>
        </PopIn>
        <TimesThree delay={350} />
        {/* 2. Small print right under the headers so nobody misses it */}
        <PopIn delay={800} from={0.5}>
          <View style={styles.smallPrint}>
            <Text style={styles.smallPrintText}>{party ? 'All points & sips ×3' : 'All points ×3'}</Text>
          </View>
        </PopIn>

        {/* 3. Who the Underdog is */}
        <SlideIn from="bottom" delay={1300}>
          <View style={styles.dogCard}>
            <Bob amount={6} duration={420}>
              <Sway deg={4}>
                <AnimalAvatar avatar={underdog.avatar} size={96} mood="sad" />
              </Sway>
            </Bob>
            <View style={styles.dogTag}>
              <Text style={styles.dogTagText}>{underdog.name}</Text>
            </View>
            <Text style={styles.onlyPct}>Only {pct}% believe in them</Text>
            <Text style={styles.ifWins}>
              If they win: {party ? 'believers score ×3, doubters drink ×3' : 'believers score ×3'}
            </Text>
          </View>
        </SlideIn>

        {backers.length > 0 && (
          <SlideIn from="bottom" delay={1800}>
            <View style={styles.backers}>
              <Text style={styles.backersLabel}>BRAVE CALLERS</Text>
              <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
                {backers.map((p, i) => (
                  <PopIn key={p.id} delay={1900 + i * 120} from={0}>
                    <View style={{ alignItems: 'center', width: 58 }}>
                      <Sway>
                        <AnimalAvatar avatar={p.avatar} size={36} mood="happy" />
                      </Sway>
                      <Text style={styles.callerName} numberOfLines={1}>
                        {p.name}
                      </Text>
                    </View>
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
        <Text style={styles.tagSub}>{mode === 'party' ? 'points & sips ×3' : 'points ×3'}</Text>
      </View>
    </Pulse>
  );
}

/** Celebration when the Underdog actually wins. */
export function UnderdogVictory({ name, mode }: { name: string; mode: Mode }) {
  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, []);
  // Calm and readable on purpose: no blinking or flashing, just a slow gentle pulse.
  return (
    <PopIn from={0.6}>
      <Pulse scale={1.02} duration={1400}>
        <LinearGradient colors={[colors.gold, '#FFB23C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.victory}>
          <Text style={styles.victoryTop}>🐶 THE UNDERDOG WON!</Text>
          <Text style={styles.victoryName}>{name}</Text>
          <View style={styles.victoryChip}>
            <Text style={styles.victoryX3}>×{UNDERDOG_MULTIPLIER}</Text>
            <Text style={styles.victoryRule}>{mode === 'party' ? 'Points & sips tripled' : 'Points tripled 🎯'}</Text>
          </View>
        </LinearGradient>
      </Pulse>
    </PopIn>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 20, zIndex: 5 },
  alertTop: { fontSize: 34 },
  underdog: {
    color: colors.white,
    fontFamily: fonts.display,
    fontSize: 50,
    letterSpacing: 1,
    textShadowColor: colors.ink,
    textShadowOffset: { width: 0, height: 5 },
    textShadowRadius: 0,
  },
  smallPrint: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 99, paddingHorizontal: 16, paddingVertical: 5 },
  smallPrintText: { color: colors.white, fontFamily: fonts.display, fontSize: 18, letterSpacing: 0.5 },
  ifWins: { color: colors.white, fontFamily: fonts.bodyBold, fontSize: 13, marginTop: 2, textAlign: 'center' },
  subtitle: { color: '#D8FFE9', fontFamily: fonts.bodyBold, fontSize: 16, textAlign: 'center' },
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
  onlyPct: { color: '#D8FFE9', fontFamily: fonts.bodyBold, fontSize: 15, marginTop: 6 },
  x3Wrap: { alignItems: 'center', justifyContent: 'center' },
  x3: {
    color: colors.gold,
    fontFamily: fonts.display,
    fontSize: 46,
    lineHeight: 54,
    textShadowColor: '#FFF3A6',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 26,
  },
  halo: {
    position: 'absolute',
    width: 300,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,214,90,0.55)',
    shadowColor: colors.gold,
    shadowOpacity: 1,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 0 },
  },
  x3Shadow: { position: 'absolute', color: '#7A4A00', fontFamily: fonts.display, fontSize: 46, lineHeight: 54, top: 4 },
  ruleCard: { backgroundColor: colors.white, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 6, borderBottomColor: '#C9B8F0' },
  ruleText: { color: '#6B5A99', fontFamily: fonts.bodyBold, fontSize: 15 },
  ruleBig: { color: colors.ink, fontFamily: fonts.display, fontSize: 26 },
  backers: { alignItems: 'center', gap: 4, marginTop: 4 },
  callerName: { color: colors.white, fontFamily: fonts.bodyBold, fontSize: 11, textAlign: 'center' },
  backersLabel: { color: colors.gold, fontFamily: fonts.display, fontSize: 13, letterSpacing: 2 },
  tag: { backgroundColor: colors.gold, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4, alignItems: 'center', borderWidth: 2.5, borderColor: colors.ink },
  tagText: { color: colors.ink, fontFamily: fonts.display, fontSize: 15 },
  tagSub: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 10 },
  victory: { borderRadius: 24, padding: 16, alignItems: 'center', gap: 6, borderWidth: 4, borderColor: colors.ink },
  victoryChip: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.ink, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6 },
  victoryX3: { color: colors.gold, fontFamily: fonts.display, fontSize: 34 },
  victoryRule: { color: colors.white, fontFamily: fonts.display, fontSize: 18 },
  victoryTop: { color: colors.ink, fontFamily: fonts.display, fontSize: 22 },
  victoryName: { color: colors.white, fontFamily: fonts.display, fontSize: 36, textShadowColor: colors.ink, textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 0 },
});
