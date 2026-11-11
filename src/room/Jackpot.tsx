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
  type SharedValue,
} from 'react-native-reanimated';
import { Haptics } from '@/ui/prefs';
import { AnimalAvatar } from '@/avatar/AnimalAvatar';
import type { Mode, Player } from '@/game/types';
import { Confetti } from '@/ui/Confetti';
import { colors, fonts } from '@/ui/theme';
import { playSfx } from '@/ui/sound';
import { useScreenSize } from '@/ui/screenSize';
import { EmojiRain, Sunburst } from './fx';

/**
 * FINAL ROUND × UNDERDOG = ×6, the rarest moment in the game. Told as a story, with no
 * explaining text, just the two multipliers:
 *   1. the Final Round 2× (fire look) fills the screen…
 *   2. …steps aside to the left as the Underdog 3× (green look) bursts in on the right,
 *      then both settle side by side, perfectly mirrored: both apply;
 *   3. their labels fade, they shake, shoot into the middle and fuse into one huge,
 *      glowing, pulsing 6× on a bright new "jackpot" screen.
 */

/** Timeline (ms from the moment the takeover appears). */
const T = {
  twoIn: 150,
  twoAside: 1900,
  greenIn: 2050,
  threeIn: 2500,
  threeSettle: 3600,
  labelsOut: 4700,
  shake: 4800,
  shoot: 5750,
  merge: 6050,
  end: 10200,
};
export const JACKPOT_SHOW_MS = T.end;
export const JACKPOT_MULTIPLIER = 6;

type Step = [at: number, to: number, duration: number, easing?: (t: number) => number];

/** Runs keyframes on one shared value: each step starts at its absolute time `at` (ms). */
function keyframes(steps: Step[]) {
  let t = 0;
  const parts = steps.map(([start, to, duration, easing]) => {
    const wait = Math.max(0, start - t);
    t = Math.max(start, t) + duration;
    return withDelay(wait, withTiming(to, easing ? { duration, easing } : { duration }));
  });
  return parts.length === 1 ? parts[0] : withSequence(...parts);
}

function at(ms: number, fn: () => void, timers: ReturnType<typeof setTimeout>[]) {
  timers.push(setTimeout(fn, ms));
}

function Layer({ v, children }: { v: SharedValue<number>; children: React.ReactNode }) {
  const st = useAnimatedStyle(() => ({ opacity: v.value }));
  return <Animated.View style={[StyleSheet.absoluteFill, st]}>{children}</Animated.View>;
}

/** Light beams sweeping behind the Underdog look (same as the normal Underdog screen). */
function Beams() {
  const r = useSharedValue(0);
  useEffect(() => {
    r.value = withRepeat(withTiming(360, { duration: 1400, easing: Easing.linear }), -1);
  }, [r]);
  const a = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value}deg` }] }));
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.centerAll, { overflow: 'hidden' }]}>
      <Animated.View style={a}>
        <Sunburst size={900} color="rgba(255,255,255,0.12)" />
      </Animated.View>
    </View>
  );
}

/** Fast rainbow-gold rays for the jackpot screen. */
function JackpotRays() {
  const r = useSharedValue(0);
  useEffect(() => {
    r.value = withRepeat(withTiming(360, { duration: 2600, easing: Easing.linear }), -1);
  }, [r]);
  const a = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value}deg` }] }));
  const b = useAnimatedStyle(() => ({ transform: [{ rotate: `${-r.value * 1.4}deg` }] }));
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.centerAll, { overflow: 'hidden' }]}>
      <Animated.View style={a}>
        <Sunburst size={1000} color="rgba(255,255,255,0.22)" />
      </Animated.View>
      <Animated.View style={[{ position: 'absolute' }, b]}>
        <Sunburst size={760} color="rgba(255,240,120,0.25)" />
      </Animated.View>
    </View>
  );
}

function Multi({
  x,
  scale,
  opacity,
  shake,
  label,
  labelOpacity,
  value,
  look,
  sub,
}: {
  x: SharedValue<number>;
  scale: SharedValue<number>;
  opacity: SharedValue<number>;
  shake: SharedValue<number>;
  label: string;
  labelOpacity: SharedValue<number>;
  value: string;
  look: 'fire' | 'dog';
  sub: string;
}) {
  const st = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: x.value + Math.sin(shake.value * 50) * 7 * Math.min(1, shake.value * 1.4) },
      { translateY: Math.cos(shake.value * 43) * 5 * Math.min(1, shake.value * 1.4) },
      { scale: scale.value },
      { rotate: `${look === 'fire' ? -4 : 4}deg` },
    ],
  }));
  const lab = useAnimatedStyle(() => ({ opacity: labelOpacity.value }));
  const fire = look === 'fire';
  return (
    <Animated.View style={[styles.multiSlot, st]}>
      <Animated.View style={lab}>
        <Text style={[styles.multiLabel, { color: fire ? '#FFD27A' : '#D8FFE9' }]}>{label}</Text>
      </Animated.View>
      <View style={[styles.multiBox, fire ? styles.fireBox : styles.dogBox]}>
        <Text style={[styles.multiValue, { color: fire ? colors.ink : colors.gold }]}>{value}</Text>
        <Animated.View style={lab}>
          <Text style={[styles.multiSub, { color: fire ? colors.ink : colors.white }]}>{sub}</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

export function FinalUnderdogAlert({
  underdog,
  mode,
  delay = 1300,
}: {
  underdog: Player;
  mode: Mode;
  delay?: number;
}) {
  const { width } = useScreenSize();
  const side = width * 0.25; // the two halves' centres
  const [live, setLive] = useState(false);
  const [merged, setMerged] = useState(false);
  const party = mode === 'party';

  const whole = useSharedValue(0);
  const fireBg = useSharedValue(0);
  const dogBg = useSharedValue(0);
  const jackBg = useSharedValue(0);
  const flash = useSharedValue(0);

  const twoX = useSharedValue(0);
  const twoS = useSharedValue(3.2);
  const twoO = useSharedValue(0);
  const threeX = useSharedValue(width * 0.19);
  const threeS = useSharedValue(3.2);
  const threeO = useSharedValue(0);
  const labels = useSharedValue(1);
  const shake = useSharedValue(0);
  const sixS = useSharedValue(0);
  const sixO = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const heavy = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    at(delay, () => {
      setLive(true);
      playSfx('fanfare');
      [0, 150, 300].forEach((ms) => setTimeout(heavy, ms));
    }, timers);
    const D = (ms: number) => delay + ms;
    const io = Easing.inOut(Easing.cubic);
    const pop = Easing.out(Easing.back(2.2));
    const hit = T.merge - T.shoot;
    whole.value = keyframes([[D(0), 1, 200], [D(T.end - 400), 0, 400]]);
    fireBg.value = keyframes([[D(0), 1, 250]]);
    dogBg.value = keyframes([[D(T.greenIn), 1, 500]]);
    jackBg.value = keyframes([[D(T.merge), 1, 120]]);

    // 1. Final round 2× slams in, centre stage, then steps aside to the left…
    twoO.value = keyframes([[D(T.twoIn), 1, 90], [D(T.merge), 0, 60]]);
    twoS.value = keyframes([
      [D(T.twoIn), 1, 420, pop],
      [D(T.twoAside), 0.62, 600, io],
      [D(T.shoot), 0.9, hit],
    ]);
    twoX.value = keyframes([[D(T.twoAside), -side, 600, io], [D(T.shoot), 0, hit, Easing.in(Easing.cubic)]]);

    // 2. …as the Underdog 3× bursts in a little bigger on the right, then shrinks to
    //    match and slides fully right: a perfect mirror image (both apply).
    threeO.value = keyframes([[D(T.threeIn), 1, 90], [D(T.merge), 0, 60]]);
    threeS.value = keyframes([
      [D(T.threeIn), 0.78, 420, pop],
      [D(T.threeSettle), 0.62, 600, io],
      [D(T.shoot), 0.9, hit],
    ]);
    threeX.value = keyframes([[D(0), width * 0.19, 1], [D(T.threeSettle), side, 600, io], [D(T.shoot), 0, hit, Easing.in(Easing.cubic)]]);
    at(D(T.threeIn), () => {
      playSfx('underdog');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }, timers);

    // 3. Labels fade, both shake harder and harder, shoot into the middle and fuse.
    labels.value = keyframes([[D(T.labelsOut), 0, 300]]);
    at(D(T.shake), () => playSfx('riser'), timers);
    shake.value = keyframes([[D(T.shake), 1, T.shoot - T.shake, Easing.in(Easing.quad)], [D(T.merge), 0, 1]]);
    [0, 250, 500, 700, 850].forEach((ms) => at(D(T.shake + ms), heavy, timers));
    flash.value = keyframes([[D(T.merge), 0.85, 90], [D(T.merge + 90), 0, 650]]);
    sixO.value = keyframes([[D(T.merge), 1, 60]]);
    sixS.value = keyframes([
      [D(T.merge), 1.35, 180, Easing.out(Easing.quad)],
      [D(T.merge + 180), 1, 420, Easing.out(Easing.back(2))],
    ]);
    pulse.value = withDelay(D(T.merge + 700), withRepeat(withTiming(1.08, { duration: 360, easing: Easing.inOut(Easing.quad) }), -1, true));
    at(D(T.merge), () => {
      setMerged(true);
      playSfx('jackpot');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      [80, 200, 360, 560].forEach((ms) => setTimeout(heavy, ms));
    }, timers);

    // Out of the way so the round can go on.
    at(D(T.end), () => setLive(false), timers);
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delay]);

  const wholeSt = useAnimatedStyle(() => ({ opacity: whole.value }));
  const flashSt = useAnimatedStyle(() => ({ opacity: flash.value }));
  const sixSt = useAnimatedStyle(() => ({ opacity: sixO.value, transform: [{ scale: sixS.value * pulse.value }, { rotate: '-3deg' }] }));
  const haloSt = useAnimatedStyle(() => ({
    opacity: sixO.value * (0.45 + (pulse.value - 1) * 5),
    transform: [{ scale: 0.85 + (pulse.value - 1) * 4 }],
  }));

  if (!live) return null;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { zIndex: 12 }, wholeSt]} pointerEvents="none">
      {/* Backgrounds: Final Round fire → Underdog green → bright jackpot */}
      <Layer v={fireBg}>
        <LinearGradient colors={['#4A0A00', '#B8360A', '#2A0300']} style={StyleSheet.absoluteFill} />
        <EmojiRain emoji="🔥" count={14} />
      </Layer>
      <Layer v={dogBg}>
        <LinearGradient colors={['#02391F', '#0B8A4F', '#034D2A']} style={StyleSheet.absoluteFill} />
        <Beams />
        <EmojiRain emoji="🐶" count={12} />
      </Layer>
      <Layer v={jackBg}>
        <LinearGradient colors={['#FF2D95', '#FFB000', '#00D9FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <JackpotRays />
        {merged && <EmojiRain emoji="💎" count={16} />}
      </Layer>
      {merged && <Confetti count={90} origin="center" />}

      <View style={[StyleSheet.absoluteFill, styles.centerAll]}>
        <Multi x={twoX} scale={twoS} opacity={twoO} shake={shake} labelOpacity={labels} label="🔥 FINAL ROUND" value="2×" sub={party ? 'POINTS & SIPS' : 'POINTS'} look="fire" />
        <Multi x={threeX} scale={threeS} opacity={threeO} shake={shake} labelOpacity={labels} label="🐶 UNDERDOG" value="3×" sub={party ? 'POINTS & SIPS' : 'POINTS'} look="dog" />

        <Animated.View style={[styles.multiSlot, sixSt]}>
          <Animated.View style={[styles.sixHalo, haloSt]} />
          {merged && (
            <Text style={styles.jackpotLabel}>💎 JACKPOT ROUND 💎</Text>
          )}
          <View style={styles.sixBox}>
            <Text style={styles.sixShadow}>6×</Text>
            <Text style={styles.six}>6×</Text>
          </View>
        </Animated.View>
      </View>

      {merged && (
        <View style={styles.bottom}>
          <View style={styles.smallPrint}>
            <Text style={styles.smallPrintText}>{party ? 'All points & sips ×6' : 'All points ×6'}</Text>
          </View>
          <View style={styles.dogRow}>
            <AnimalAvatar avatar={underdog.avatar} size={54} mood="sad" />
            <Text style={styles.dogText}>
              If <Text style={{ color: colors.ink }}>{underdog.name}</Text> wins,{'\n'}
              {party ? 'believers score ×6, doubters drink ×6' : 'believers score ×6'}
            </Text>
          </View>
        </View>
      )}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF' }, flashSt]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  centerAll: { alignItems: 'center', justifyContent: 'center' },
  multiSlot: { position: 'absolute', alignItems: 'center' },
  multiLabel: {
    fontFamily: fonts.display,
    fontSize: 34,
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: colors.ink,
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 0,
  },
  multiBox: {
    alignItems: 'center',
    borderRadius: 30,
    borderWidth: 5,
    borderBottomWidth: 11,
    paddingHorizontal: 30,
    paddingVertical: 6,
    shadowOpacity: 0.95,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 0 },
  },
  fireBox: { backgroundColor: colors.gold, borderColor: colors.ink, shadowColor: '#FFB23C' },
  dogBox: { backgroundColor: '#064D2C', borderColor: colors.gold, shadowColor: colors.gold },
  multiValue: { fontFamily: fonts.display, fontSize: 120, lineHeight: 128 },
  multiSub: { fontFamily: fonts.display, fontSize: 22, marginTop: -8, letterSpacing: 1 },
  jackpotLabel: {
    color: colors.white,
    fontFamily: fonts.display,
    fontSize: 36,
    marginBottom: 10,
    textAlign: 'center',
    textShadowColor: '#7A0050',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 0,
  },
  sixBox: { alignItems: 'center', justifyContent: 'center' },
  six: {
    color: colors.white,
    fontFamily: fonts.display,
    fontSize: 190,
    lineHeight: 200,
    textShadowColor: '#FFF6B0',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 34,
  },
  sixShadow: { position: 'absolute', top: 8, color: '#8A0060', fontFamily: fonts.display, fontSize: 190, lineHeight: 200 },
  sixHalo: {
    position: 'absolute',
    top: 40,
    width: 280,
    height: 220,
    borderRadius: 140,
    backgroundColor: 'rgba(255,250,200,0.75)',
    shadowColor: '#FFF',
    shadowOpacity: 1,
    shadowRadius: 50,
    shadowOffset: { width: 0, height: 0 },
  },
  bottom: { position: 'absolute', left: 16, right: 16, bottom: 70, alignItems: 'center', gap: 10 },
  smallPrint: { backgroundColor: 'rgba(40,0,40,0.55)', borderRadius: 99, paddingHorizontal: 18, paddingVertical: 6 },
  smallPrintText: { color: colors.white, fontFamily: fonts.display, fontSize: 20, letterSpacing: 0.5 },
  dogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 3,
    borderColor: colors.white,
  },
  dogText: { color: '#3A0030', fontFamily: fonts.bodyBold, fontSize: 15 },
});
