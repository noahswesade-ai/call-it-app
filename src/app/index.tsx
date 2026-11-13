import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AnimalAvatar } from '@/avatar/AnimalAvatar';
import { useRoom } from '@/net/RoomProvider';
import { AgeGate } from '@/room/Lobby';
import { DEV_UNLOCK_PARTY } from '@/state/access';
import { shouldShowIntro } from '@/state/intro';
import { PLAYTEST, useProfile } from '@/state/profile';
import { CoinCounter } from '@/ui/Coin';
import { Button, Dim, Screen, Toggle } from '@/ui/kit';
import { PopIn, SlideIn } from '@/ui/motion';
import { colors, fonts } from '@/ui/theme';
import { Icon } from '@/ui/Icon';
import { Logo } from '@/ui/Logo';
import { openPremium } from '@/monetize/openPremium';

/** Clean wordmark: one weight, one colour, the accent kept for "dog". Fades in once. */
/** The brand logo, large, as the hero of the home screen. */
function HomeLogo() {
  return (
    <PopIn>
      <Logo width={210} />
    </PopIn>
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
    if (locked && !trialAvailable) return openPremium('party');
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
        <HomeLogo />
        <SlideIn from="bottom" delay={400}>
          <Text style={styles.tagline}>
            Back your friends. Talk your trash.{'\n'}
            <Text style={{ color: colors.gold }}>Live for the upset.</Text>
          </Text>
        </SlideIn>
      </View>

      <View style={{ gap: 16 }}>
        <SlideIn from="left" delay={250}>
          <Button
            big
            icon="party"
            label="Host a Game"
            subtitle="Trivia, challenges & bragging rights"
            disabled={!onlineAvailable}
            onPress={() => {
              const code = hostRoom({ mode: 'classic' });
              router.push({ pathname: '/room', params: { code } });
            }}
          />
        </SlideIn>
        <SlideIn from="right" delay={380}>
          <Button big variant="secondary" icon="phone" label="Join a Game" subtitle="Got a code? Jump in" disabled={!onlineAvailable} onPress={() => router.push('/join')} />
        </SlideIn>
        <SlideIn from="left" delay={510}>
          <Button
            big
            variant="party"
            icon={locked && !trialAvailable ? 'lock' : 'beer'}
            label="Party Mode"
            subtitle="Sips, drinking & spicy challenges · 18+"
            sticker={trialAvailable ? '1 FREE GAME!' : undefined}
            disabled={!onlineAvailable}
            onPress={onParty}
          />
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
            icon="test"
            label="TEST: Premium account"
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
  tagline: { color: colors.white, fontFamily: fonts.displaySemi, fontSize: 19, lineHeight: 25, textAlign: 'center', letterSpacing: -0.2, marginTop: 4 },
});
