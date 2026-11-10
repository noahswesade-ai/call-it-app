import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { AnimalAvatar } from '@/avatar/AnimalAvatar';
import { ANIMALS } from '@/avatar/catalog';
import { useRoom } from '@/net/RoomProvider';
import { AgeGate } from '@/room/Lobby';
import { shouldShowIntro } from '@/state/intro';
import { useProfile } from '@/state/profile';
import { CoinCounter } from '@/ui/Coin';
import { Button, Dim, Screen, tap } from '@/ui/kit';
import { Bob, PopIn, SlideIn } from '@/ui/motion';
import { colors, fonts } from '@/ui/theme';
import { bounce } from '@/ui/motion';

const LOGO = ['U', 'n', 'd', 'e', 'r', 'd', 'o', 'g'];
const LOGO_COLORS = [colors.gold, colors.pink, colors.cyan, colors.green, colors.gold, colors.pink, colors.cyan, colors.green];

function Logo() {
  return (
    <View style={styles.logoRow}>
      {LOGO.map((ch, i) =>
        ch === ' ' ? (
          <View key={i} style={{ width: 14 }} />
        ) : (
          <PopIn key={i} delay={i * 70}>
            <Bob amount={6} duration={900 + i * 60} delay={i * 90}>
              <Text style={[styles.logoLetter, { color: LOGO_COLORS[i], transform: [{ rotate: `${i % 2 ? 6 : -6}deg` }] }]}>{ch}</Text>
            </Bob>
          </PopIn>
        ),
      )}
    </View>
  );
}

/** A row of free animals peeking up and bouncing, purely for charm. */
function AnimalParade() {
  const parade = ANIMALS.filter((a) => a.tier === 'free' || a.id === 'fox' || a.id === 'axolotl' || a.id === 'dragon');
  return (
    <View style={styles.parade}>
      {parade.map((a, i) => (
        <PopIn key={a.id} delay={500 + i * 90}>
          <Bob amount={8} duration={700 + (i % 3) * 150} delay={i * 120}>
            <AnimalAvatar avatar={{ animal: a.id, color: a.defaultColor }} size={46} mood={i % 3 === 0 ? 'happy' : 'neutral'} />
          </Bob>
        </PopIn>
      ))}
    </View>
  );
}

/** The darker, glowing, locked Party Mode box. Glows brighter on hover / press. */
function PartyBox({ locked, trialAvailable, onPress }: { locked: boolean; trialAvailable: boolean; onPress: () => void }) {
  const glow = useSharedValue(0);
  const idle = useSharedValue(0);
  const press = useSharedValue(0);
  useEffect(() => {
    idle.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [idle]);
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + idle.value * 0.2 + glow.value * 0.45,
    transform: [{ scale: 1 + glow.value * 0.03 + idle.value * 0.01 }],
  }));
  const boxStyle = useAnimatedStyle(() => ({
    borderColor: glow.value > 0.5 ? colors.neon : 'rgba(255,79,216,0.65)',
    transform: [{ scale: 1 - press.value * 0.03 }, { translateY: press.value * 3 }],
  }));
  const lockStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${(idle.value - 0.5) * 16}deg` }] }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Host a Party mode game"
      onHoverIn={() => (glow.value = withTiming(1, { duration: 180 }))}
      onHoverOut={() => (glow.value = withTiming(0, { duration: 260 }))}
      onPressIn={() => {
        glow.value = withTiming(1, { duration: 120 });
        press.value = withTiming(1, { duration: 80 });
      }}
      onPressOut={() => {
        glow.value = withTiming(0, { duration: 400 });
        press.value = bounce(0);
      }}
      onPress={() => {
        tap('heavy');
        onPress();
      }}
    >
      <Animated.View style={[styles.partyGlow, glowStyle]} pointerEvents="none" />
      <Animated.View style={[styles.partyBox, boxStyle]}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.partyTitle}>🍻 Party Mode</Text>
          <Text style={styles.partySub}>Sips & shots, drinking challenges, spicy questions & more</Text>
          <View style={styles.partyBadgeRow}>
            {!locked ? (
              <Text style={[styles.badge, { backgroundColor: colors.green, color: colors.ink }]}>UNLOCKED</Text>
            ) : trialAvailable ? (
              <Text style={[styles.badge, { backgroundColor: colors.gold, color: colors.ink }]}>1 FREE GAME</Text>
            ) : (
              <Text style={[styles.badge, { backgroundColor: colors.neon, color: colors.white }]}>UNLOCK · $4.99</Text>
            )}
            <Text style={styles.adult}>18+</Text>
          </View>
        </View>
        {locked && (
          <Animated.View style={[styles.lockBubble, lockStyle]}>
            <Text style={{ fontSize: 22 }}>🔒</Text>
          </Animated.View>
        )}
      </Animated.View>
    </Pressable>
  );
}

export default function Home() {
  const { profile, loaded, update } = useProfile();
  const { hostRoom, onlineAvailable } = useRoom();
  const [ageGate, setAgeGate] = useState(false);

  if (!loaded) return <Screen>{null}</Screen>;
  if (shouldShowIntro(profile.seenIntro)) return <Redirect href="/welcome" />;

  const locked = !profile.premium;
  const trialAvailable = !profile.premium && !profile.partyTrialUsed;

  const hostParty = () => {
    hostRoom({ mode: 'party' });
    router.push('/room');
  };

  const onParty = () => {
    if (locked && !trialAvailable) return router.push('/paywall');
    if (!profile.ageConfirmed) return setAgeGate(true);
    hostParty();
  };

  return (
    <Screen scroll style={{ flexGrow: 1, justifyContent: 'space-between' }}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.push('/welcome')} style={styles.help} accessibilityRole="button" accessibilityLabel="How to play">
          <Text style={styles.helpText}>?</Text>
        </Pressable>
        <CoinCounter coins={profile.tokens} onPress={() => router.push('/shop')} />
      </View>

      <View style={{ alignItems: 'center', gap: 6 }}>
        <Logo />
        <SlideIn from="bottom" delay={400}>
          <Text style={styles.tagline}>Call the long shot. Win big. 🐶 ×3</Text>
        </SlideIn>
        <AnimalParade />
      </View>

      <View style={{ gap: 16 }}>
        <SlideIn from="left" delay={250}>
          <Button
            big
            label="🎉 Host a Game"
            subtitle="Trivia, challenges & bragging rights"
            disabled={!onlineAvailable}
            onPress={() => {
              hostRoom({ mode: 'classic' });
              router.push('/room');
            }}
          />
        </SlideIn>
        <SlideIn from="right" delay={380}>
          <PartyBox locked={locked} trialAvailable={trialAvailable} onPress={onParty} />
        </SlideIn>
        <SlideIn from="left" delay={510}>
          <Button big variant="cyan" label="📲 Join a Game" subtitle="Got a code? Jump in" disabled={!onlineAvailable} onPress={() => router.push('/join')} />
        </SlideIn>
      </View>

      <Pressable
        onPress={() => {
          hostRoom({ practiceBots: 6 });
          router.push('/room');
        }}
        style={{ alignSelf: 'center', padding: 8 }}
      >
        <Dim style={{ textDecorationLine: 'underline' }}>No friends nearby? Practice with bots</Dim>
      </Pressable>

      <AgeGate
        visible={ageGate}
        onConfirm={() => {
          update({ ageConfirmed: true });
          setAgeGate(false);
          hostParty();
        }}
        onCancel={() => setAgeGate(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  help: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(20,4,40,0.55)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpText: { color: colors.white, fontFamily: fonts.display, fontSize: 22 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logoRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 8 },
  logoLetter: {
    fontFamily: fonts.display,
    fontSize: 60,
    textShadowColor: colors.ink,
    textShadowOffset: { width: 0, height: 5 },
    textShadowRadius: 0,
  },
  tagline: { color: colors.dim, fontFamily: fonts.bodySemi, fontSize: 15, textAlign: 'center' },
  parade: { flexDirection: 'row', gap: 2, marginTop: 6, flexWrap: 'wrap', justifyContent: 'center' },
  partyGlow: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 30,
    backgroundColor: colors.neon,
    shadowColor: colors.neon,
    shadowOpacity: 1,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
  },
  partyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.party,
    borderWidth: 3,
    borderRadius: 24,
    padding: 18,
    gap: 12,
    minHeight: 110,
  },
  partyTitle: { color: colors.white, fontFamily: fonts.display, fontSize: 28 },
  partySub: { color: '#E9C9F5', fontFamily: fonts.bodySemi, fontSize: 14, lineHeight: 19 },
  partyBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  badge: { fontFamily: fonts.display, fontSize: 13, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99, overflow: 'hidden' },
  adult: { color: '#E9C9F5', fontFamily: fonts.display, fontSize: 13, borderWidth: 1.5, borderColor: '#E9C9F5', borderRadius: 6, paddingHorizontal: 5 },
  lockBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,79,216,0.18)',
    borderWidth: 2,
    borderColor: 'rgba(255,79,216,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
