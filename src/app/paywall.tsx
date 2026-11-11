import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PREMIUM_PRICE, STORE_IS_PLACEHOLDER, purchasePremium, restorePurchases } from '@/monetize/store';
import { useProfile } from '@/state/profile';
import { Body, Button, Card, Dim, H1, Screen, theme } from '@/ui/kit';
import { Bob, PopIn, SlideIn, Wobble } from '@/ui/motion';
import { fonts } from '@/ui/theme';

const PERKS: [string, string][] = [
  ['🍻', 'Party mode — sips & shots, drinking challenges'],
  ['🌶️', 'Spicy questions (opt-in)'],
  ['👥', 'Unlimited players (free: 10)'],
  ['🔁', 'Choose how many rounds'],
  ['🎛️', 'Turn categories on and off'],
  ['✍️', 'Your own questions in every lobby, and "only our questions" games'],
  ['🚫', 'No ads, ever'],
  ['💰', '2× gold coins every game'],
  ['👑', 'The Royal Crown: Premium-only avatar item'],
];

export default function Paywall() {
  const { profile, update } = useProfile();
  const [busy, setBusy] = useState(false);

  if (profile.premium) {
    return (
      <Screen style={{ justifyContent: 'center' }}>
        <H1 style={{ textAlign: 'center' }}>👑 You're Premium</H1>
        <Body style={{ textAlign: 'center' }}>Everything is unlocked. Host a game and your whole room gets Party mode.</Body>
        <Button label="Back" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen scroll tint="party">
      <View style={{ alignItems: 'center' }}>
        <Wobble deg={6} duration={700}>
          <Text style={{ fontSize: 72 }}>👑</Text>
        </Wobble>
      </View>
      <H1 style={{ textAlign: 'center' }}>Unlock Premium</H1>
      <Body>One payment. Yours forever. When you host, your whole room gets the Premium game.</Body>
      <Card>
        {PERKS.map(([icon, text], i) => (
          <SlideIn key={text} from="left" delay={i * 70} distance={40}>
            <View style={styles.perk}>
              <Bob amount={2} duration={700} delay={i * 80}>
                <Text style={styles.icon}>{icon}</Text>
              </Bob>
              <Text style={styles.perkText}>{text}</Text>
            </View>
          </SlideIn>
        ))}
      </Card>
      <PopIn delay={600}>
      <Button
        big
        label={`🔓 Unlock forever · ${PREMIUM_PRICE}`}
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
  perkText: { color: theme.text, fontSize: 17, fontFamily: fonts.bodySemi, flex: 1 },
});
