import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PREMIUM_PRICE, STORE_IS_PLACEHOLDER, purchasePremium, restorePurchases } from '@/monetize/store';
import { useProfile } from '@/state/profile';
import { Body, Button, Card, Dim, H1, Screen, theme } from '@/ui/kit';
import { Bob, PopIn, SlideIn, Wobble } from '@/ui/motion';
import { colors, fonts } from '@/ui/theme';
import { Icon, IconLabel, type IconName } from '@/ui/Icon';
import { Logo } from '@/ui/Logo';

// Room-level benefits first: when you host, the whole room gets them (Goals doc: host pays).
const PERKS: [string, string][] = [
  ['beer', 'Party mode for your whole room: sips & drinking challenges'],
  ['chili', 'Spicy questions (18+, opt-in)'],
  ['write', 'Your own questions in every lobby, and "only our questions" games'],
  ['users', 'Unlimited players (free: 10)'],
  ['ban', 'No ads, ever (no ad interrupting the party)'],
  ['repeat', 'Choose rounds and categories, unlimited question swaps'],
  ['coins', '2× gold coins every game'],
  ['crown', 'The Royal Crown: Premium-only avatar item'],
];

export default function Paywall() {
  const { profile, update } = useProfile();
  const [busy, setBusy] = useState(false);

  if (profile.premium) {
    return (
      <Screen style={{ justifyContent: 'center' }}>
        <Logo width={150} style={{ alignSelf: 'center' }} />
        <IconLabel icon="crown" size={28} gap={8} style={{ justifyContent: 'center' }} textStyle={{ color: colors.white, fontSize: 32, fontFamily: fonts.display }}>
          You're Premium
        </IconLabel>
        <Body style={{ textAlign: 'center' }}>Everything is unlocked. Host a game and your whole room gets Party mode.</Body>
        <Button label="Back" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen scroll tint="party">
      <View style={{ alignItems: 'center' }}>
        <Logo width={170} />
        <View style={styles.crownBadge}>
          <Icon name="crown" size={18} color={colors.ink} strokeWidth={2.4} />
          <Text style={styles.crownBadgeText}>PREMIUM</Text>
        </View>
      </View>
      <H1 style={{ textAlign: 'center' }}>Unlock Premium</H1>
      <Body>One payment, yours forever. When you host, everyone in your room gets the Premium game; friends always join free.</Body>
      <Dim style={{ textAlign: 'center' }}>About the price of one drink, less than $1 per friend at your next game night.</Dim>
      <Card>
        {PERKS.map(([icon, text], i) => (
          <SlideIn key={text} from="left" delay={i * 70} distance={40}>
            <View style={styles.perk}>
              <Bob amount={2} duration={700} delay={i * 80}>
                {icon === 'chili' ? <Text style={styles.icon}>🌶️</Text> : <Icon name={icon as IconName} size={22} color={colors.gold} style={{ width: 30, alignItems: 'center' }} />}
              </Bob>
              <Text style={styles.perkText}>{text}</Text>
            </View>
          </SlideIn>
        ))}
      </Card>
      <PopIn delay={600}>
      <Button
        big
        icon="unlock"
        label={`Unlock forever · ${PREMIUM_PRICE}`}
        loading={busy}
        onPress={async () => {
          setBusy(true);
          const ok = await purchasePremium();
          setBusy(false);
          if (ok) {
            update({ premium: true });
            router.back();
          }
        }}
      />
      </PopIn>
      <Button
        label="Restore purchases"
        variant="ghost"
        onPress={async () => {
          if (await restorePurchases()) update({ premium: true });
        }}
      />
      {STORE_IS_PLACEHOLDER && (
        <Dim style={{ textAlign: 'center' }}>Test mode: no real payment is taken until RevenueCat is connected.</Dim>
      )}
      <Button label="Not now" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  perk: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { fontSize: 22, width: 30 },
  crownBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.gold, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 4, marginTop: 4 },
  crownBadgeText: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 13, letterSpacing: 1.5 },
  perkText: { color: theme.text, fontSize: 17, fontFamily: fonts.bodySemi, flex: 1 },
});
