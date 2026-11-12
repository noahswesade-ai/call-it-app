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
import { DEV_UNLOCK_PARTY } from '@/state/access';
import { shouldShowIntro } from '@/state/intro';
import { PLAYTEST, useProfile } from '@/state/profile';
import { CoinCounter } from '@/ui/Coin';
import { Button, Dim, Screen, tap, Toggle } from '@/ui/kit';
import { Bob, PopIn, SlideIn } from '@/ui/motion';
import { colors, fonts } from '@/ui/theme';
import { bounce } from '@/ui/motion';

/** Clean wordmark: one weight, one colour, the accent kept for "dog". Fades in once. */
function Logo() {
  return (
    <PopIn>
      <Text style={styles.logo} accessibilityRole="header">
        Under<Text style={{ color: colors.gold }}>dog</Text>
      </Text>
    </PopIn>
  );
}

/** A row of free animals peeking up and bouncing, purely for charm. */
function AnimalParade() {
  const parade = ANIMALS.filter((a) => ['dog', 'cat', 'frog', 'bear', 'fox', 'axolotl', 'dragon'].includes(a.id));
  return (
    <View style={styles.parade}>
      {parade.map((a, i) => (
        <PopIn key={a.id} delay={500 + i * 90}>
          <Bob amount={4} duration={1600 + (i % 3) * 300} delay={i * 200}>
            <AnimalAvatar avatar={{ animal: a.id }} size={42} mood={i % 3 === 0 ? 'happy' : 'neutral'} />
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
    opacity: 0.12 + idle.value * 0.1 + glow.value * 0.3,
    transform: [{ scale: 1 + glow.value * 0.02 }],
  }));
  const boxStyle = useAnimatedStyle(() => ({
    borderColor: glow.value > 0.5 ? colors.neon : 'rgba(224,79,176,0.55)',
    transform: [{ scale: 1 - press.value * 0.03 }, { translateY: press.value * 3 }],
  }));
  const lockStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${(idle.value - 0.5) * 6}deg` }] }));

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
          <Text style={styles.partySub}>Sips, drinking challenges, spicy questions & more</Text>
          <View style={styles.partyBadgeRow}>
            {!locked ? (
              <Text style={[styles.badge, { backgroundColor: colors.green, color: colors.ink }]}>{DEV_UNLOCK_PARTY ? 'UNLOCKED (TEST BUILD)' : 'UNLOCKED'}</Text>
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

  const locked = !profile.premium && !DEV_UNLOCK_PARTY;
  const trialAvailable = locked && !profile.partyTrialUsed;

  const hostParty = () => {
    const code = hostRoom({ mode: 'party' });
    router.push({ pathname: '/room', params: { code } });
  };

  const onParty = () => {
    if (locked && !trialAvailable) return router.push('/paywall');
    if (!profile.ageConfirmed) return setAgeGate(true);
    hostParty();
  };

  return (
    <Screen scroll style={{ flexGrow: 1, justifyContent: 'space-between' }}>
      <View style={styles.topBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable onPress={() => router.push('/account')} style={styles.me} accessibilityRole="button" accessibilityLabel="Your profile and My questions">
            <AnimalAvatar avatar={profile.avatar} size={34} mood="happy" />
            <Text style={styles.meName} numberOfLines={1}>
              {profile.premium ? '👑 ' : ''}
              {profile.name}
            </Text>
          </Pressable>
          <Pressable onPress={() => router.push('/welcome')} style={styles.help} accessibilityRole="button" accessibilityLabel="How to play">
            <Text style={styles.helpText}>?</Text>
          </Pressable>
        </View>
        <CoinCounter coins={profile.tokens} onPress={() => router.push('/shop')} />
      </View>

      <View style={{ alignItems: 'center', gap: 6 }}>
        <Logo />
        <SlideIn from="bottom" delay={400}>
          <Text style={styles.tagline}>Call the long shot. Win big.</Text>
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
              const code = hostRoom({ mode: 'classic' });
              router.push({ pathname: '/room', params: { code } });
            }}
          />
        </SlideIn>
        <SlideIn from="right" delay={380}>
          <PartyBox locked={locked} trialAvailable={trialAvailable} onPress={onParty} />
        </SlideIn>
        <SlideIn from="left" delay={510}>
          <Button big variant="secondary" label="📲 Join a Game" subtitle="Got a code? Jump in" disabled={!onlineAvailable} onPress={() => router.push('/join')} />
        </SlideIn>
      </View>

      <Pressable
        onPress={() => {
          hostRoom({ practiceBots: 6 });
          router.push('/room');
        }}
        style={{ alignSelf: 'center', padding: 8 }}
        accessibilityRole="button"
      >
        <Dim style={{ textDecorationLine: 'underline' }}>No friends nearby? Practice with bots</Dim>
      </Pressable>

      {PLAYTEST && (
        // TEST LINK ONLY: compare the free and Premium versions. Remove before release.
        <View style={styles.testBox}>
          <Toggle
            label="🧪 TEST: Premium account"
            hint="Only on the play-test link. Switch off to see the free version."
            value={profile.premium}
            onChange={(v) => update({ premium: v })}
          />
        </View>
      )}

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
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  me: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 99,
    paddingLeft: 3,
    paddingRight: 12,
    paddingVertical: 2,
    maxWidth: 170,
  },
  meName: { color: colors.white, fontFamily: fonts.bodyBold, fontSize: 14, flexShrink: 1 },
  testBox: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.cyan, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 4 },
  helpText: { color: colors.white, fontFamily: fonts.display, fontSize: 18 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logo: { color: colors.white, fontFamily: fonts.display, fontSize: 56, letterSpacing: -2, marginTop: 8 },
  tagline: { color: colors.dim, fontFamily: fonts.bodySemi, fontSize: 15, textAlign: 'center' },
  parade: { flexDirection: 'row', gap: 2, marginTop: 6, flexWrap: 'wrap', justifyContent: 'center' },
  partyGlow: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 24,
    backgroundColor: colors.neon,
    shadowColor: colors.neon,
    shadowOpacity: 1,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
  },
  partyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#24113D',
    borderWidth: 1.5,
    borderRadius: 18,
    padding: 16,
    gap: 12,
    minHeight: 110,
  },
  partyTitle: { color: colors.white, fontFamily: fonts.display, fontSize: 24, letterSpacing: -0.3 },
  partySub: { color: '#D9C4EA', fontFamily: fonts.bodySemi, fontSize: 14, lineHeight: 19 },
  partyBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  badge: { fontFamily: fonts.bodyBold, fontSize: 12, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99, overflow: 'hidden' },
  adult: { color: '#D9C4EA', fontFamily: fonts.bodyBold, fontSize: 12, borderWidth: 1, borderColor: '#E9C9F5', borderRadius: 6, paddingHorizontal: 5 },
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
