import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnimalAvatar } from '@/avatar/AnimalAvatar';
import { ANIMALS } from '@/avatar/catalog';
import { CategoryIcon } from '@/content/CategoryIcon';
import { ALL_QUESTIONS } from '@/content/questions';
import type { Category } from '@/game/types';
import type { PremiumReason } from '@/monetize/openPremium';
import { PREMIUM_PRICE, STORE_IS_PLACEHOLDER, purchasePremium, restorePurchases } from '@/monetize/store';
import { useProfile } from '@/state/profile';
import { Background } from '@/ui/Background';
import { Icon, type IconName } from '@/ui/Icon';
import { AutoFit, Button, tap } from '@/ui/kit';
import { Logo } from '@/ui/Logo';
import { FadeIn } from '@/ui/motion';
import { colors, fonts } from '@/ui/theme';

/**
 * The Premium screen ("Underdog Premium"), built from the paywall research
 * (reports/Party game Premium paywall conversion.md):
 *  - opened from the thing the host just tapped, so the headline and preview match it;
 *  - host-pays framing first: one purchase, the whole room plays Premium;
 *  - room benefits before personal ones;
 *  - the full one-time price is the biggest number, with "one-time · no subscription";
 *  - one primary button; close (X) and "Not now" always visible; Restore in the header;
 *  - no countdowns, crossed-out prices, fake scarcity or guilt-trip decline copy.
 */

const HEADLINES: Record<PremiumReason, { title: string; icon: IconName | 'chili' }> = {
  party: { title: 'Unlock Party Mode for the whole room', icon: 'beer' },
  spicy: { title: 'Unlock Spicy for the whole room', icon: 'chili' },
  players: { title: 'Play with everyone: unlimited players', icon: 'users' },
  custom: { title: 'Write your own questions', icon: 'write' },
  avatar: { title: 'Unlock Premium-only avatar items', icon: 'crown' },
  categories: { title: 'Pick your categories and rounds', icon: 'settings' },
  rounds: { title: 'Play as many rounds as you like', icon: 'settings' },
  general: { title: 'Make every game night bigger', icon: 'party' },
};

// Room benefits first (everyone in the host's room gets them), then personal ones.
const PERKS: [IconName | 'chili', string][] = [
  ['beer', 'Party & Spicy modes for everyone in your room'],
  ['users', 'Unlimited players (free rooms: 10)'],
  ['ban', 'No ads interrupting the game'],
  ['write', 'Write your own questions, pick categories and rounds'],
  ['crown', '2× coins and Premium-only avatar items'],
];

const CUSTOM_EXAMPLES = [
  'Who can do a better impression of our boss?',
  'Name everyone who has ever crashed on our couch.',
  'Who in this room cried hardest at the end of Toy Story 3?',
];

function PerkIcon({ name, color = colors.gold }: { name: IconName | 'chili'; color?: string }) {
  if (name === 'chili') return <Text style={{ fontSize: 20 }}>🌶️</Text>;
  return <Icon name={name} size={20} color={color} />;
}

/** A few real cards from the mode being unlocked, flipping every couple of seconds. */
function Preview({ reason }: { reason: PremiumReason }) {
  const { profile } = useProfile();
  const cards = useMemo(() => {
    if (reason === 'custom') return CUSTOM_EXAMPLES.map((prompt) => ({ prompt, category: 'kyf' as Category, label: 'YOUR CREW’S' }));
    const cat: Category = reason === 'spicy' && profile.ageConfirmed ? 'spicy' : 'party';
    return ALL_QUESTIONS.filter((q) => q.category === cat && q.prompt.length < 90)
      .slice(0, 12)
      .map((q) => ({ prompt: q.prompt, category: cat, label: cat === 'spicy' ? 'SPICY' : 'PARTY' }));
  }, [reason, profile.ageConfirmed]);
  const [i, setI] = useState(0);
  const flip = useSharedValue(1);
  useEffect(() => {
    if (reason === 'players' || reason === 'avatar' || cards.length < 2) return;
    const id = setInterval(() => {
      flip.value = withSequence(withTiming(0, { duration: 220 }), withTiming(1, { duration: 260 }));
      setTimeout(() => setI((n) => (n + 1) % cards.length), 220);
    }, 2600);
    return () => clearInterval(id);
  }, [cards.length, reason, flip]);
  const st = useAnimatedStyle(() => ({ opacity: flip.value, transform: [{ scaleX: 0.85 + 0.15 * flip.value }] }));

  if (reason === 'players') {
    return (
      <View style={styles.crowd}>
        {ANIMALS.slice(0, 14).map((a) => (
          <AnimalAvatar key={a.id} avatar={{ animal: a.id }} size={30} mood="happy" />
        ))}
      </View>
    );
  }
  if (reason === 'avatar') {
    return (
      <View style={{ alignItems: 'center' }}>
        <AnimalAvatar avatar={{ ...profile.avatar, head: 'crown' }} size={88} mood="happy" />
      </View>
    );
  }
  const card = cards[i % Math.max(1, cards.length)];
  if (!card) return null;
  return (
    <Animated.View style={[styles.card, st]}>
      <View style={styles.cardTop}>
        <CategoryIcon category={card.category} size={22} />
        <Text style={styles.cardLabel}>{card.label}</Text>
      </View>
      <Text style={styles.cardPrompt}>{card.prompt}</Text>
    </Animated.View>
  );
}

export default function Paywall() {
  const { profile, update } = useProfile();
  const { reason: raw } = useLocalSearchParams<{ reason?: string }>();
  const reason: PremiumReason = raw && raw in HEADLINES ? (raw as PremiumReason) : 'general';
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string>();
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const restore = async () => {
    tap();
    if (await restorePurchases()) {
      update({ premium: true });
      setNote('Premium restored');
    } else setNote('No previous purchase found on this account');
  };

  if (profile.premium) {
    return (
      <View style={{ flex: 1 }}>
        <Background tint="party" />
        <SafeAreaView style={styles.done}>
          <Logo width={150} />
          <Text style={styles.title}>You're Premium</Text>
          <Text style={styles.sub}>Everything is unlocked. Host a game and your whole room gets Premium.</Text>
          <Button label="Back" onPress={close} style={{ alignSelf: 'stretch' }} />
        </SafeAreaView>
      </View>
    );
  }

  const head = HEADLINES[reason];
  return (
    <View style={{ flex: 1 }}>
      <Background tint="party" />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} style={styles.x}>
            <Icon name="close" size={20} color={colors.white} />
          </Pressable>
          <Pressable onPress={restore} accessibilityRole="button" hitSlop={10}>
            <Text style={styles.restore}>Restore purchases</Text>
          </Pressable>
        </View>
        {/* Everything fits on one screen: on short phones the content scales down a little. */}
        <AutoFit style={styles.body}>
          <Logo width={64} style={{ alignSelf: 'center' }} />
          <FadeIn>
            <Preview reason={reason} />
          </FadeIn>
          <View style={{ gap: 4 }}>
            <Text style={styles.title}>{head.title}</Text>
            <Text style={styles.sub}>You pay once. Everyone in your room plays Premium, free.</Text>
          </View>
          <View style={styles.perks}>
            {PERKS.map(([icon, text], i) => (
              <FadeIn key={text} delay={120 + i * 70}>
                <View style={styles.perk}>
                  <View style={styles.perkIcon}>
                    <PerkIcon name={icon} />
                  </View>
                  <Text style={styles.perkText}>{text}</Text>
                  <Icon name="check" size={18} color={colors.green} strokeWidth={3} />
                </View>
              </FadeIn>
            ))}
          </View>
          <Text style={styles.small}>About the price of one drink: less than $1 per friend at your next game night.</Text>
        </AutoFit>
        <View style={styles.footer}>
          {/* The full price is always on screen, next to the button. */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>{PREMIUM_PRICE}</Text>
            <Text style={styles.deal}>One-time · no subscription{'\n'}yours forever</Text>
          </View>
          <Button
            big
            icon="unlock"
            label="Unlock for everyone"
            loading={busy}
            onPress={async () => {
              setBusy(true);
              const ok = await purchasePremium();
              setBusy(false);
              if (ok) {
                update({ premium: true });
                close();
              }
            }}
          />
          <Pressable onPress={close} accessibilityRole="button" style={{ alignSelf: 'center', padding: 6 }}>
            <Text style={styles.notNow}>Not now</Text>
          </Pressable>
          {note ? <Text style={styles.small}>{note}</Text> : null}
          {STORE_IS_PLACEHOLDER && <Text style={styles.small}>Test mode: no real payment is taken until the store is connected.</Text>}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingTop: 6, maxWidth: 560, width: '100%', alignSelf: 'center' },
  x: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  restore: { color: colors.dim, fontFamily: fonts.bodyBold, fontSize: 13, textDecorationLine: 'underline' },
  body: { padding: 18, paddingTop: 0, gap: 10, justifyContent: 'center' },
  card: { backgroundColor: colors.white, borderRadius: 16, padding: 12, gap: 6, minHeight: 86, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardLabel: { color: colors.neon, fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1 },
  cardPrompt: { color: colors.ink, fontFamily: fonts.display, fontSize: 16, lineHeight: 20 },
  crowd: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 4 },
  title: { color: colors.white, fontFamily: fonts.display, fontSize: 24, lineHeight: 27, textAlign: 'center', letterSpacing: -0.5 },
  sub: { color: '#E8DDF5', fontFamily: fonts.bodySemi, fontSize: 14, textAlign: 'center' },
  perks: { gap: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.cardBorder },
  perk: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  perkIcon: { width: 30, alignItems: 'center' },
  perkText: { flex: 1, color: colors.white, fontFamily: fonts.bodySemi, fontSize: 13.5 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 4 },
  price: { color: colors.gold, fontFamily: fonts.display, fontSize: 36, letterSpacing: -1 },
  deal: { color: colors.white, fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 17 },
  small: { color: colors.dim, fontFamily: fonts.body, fontSize: 12, textAlign: 'center' },
  footer: { paddingHorizontal: 18, paddingBottom: 10, paddingTop: 8, gap: 4, maxWidth: 560, width: '100%', alignSelf: 'center' },
  notNow: { color: colors.dim, fontFamily: fonts.bodyBold, fontSize: 15 },
  done: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
});
