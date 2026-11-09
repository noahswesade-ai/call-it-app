import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PREMIUM_PRICE, STORE_IS_PLACEHOLDER, purchasePremium, restorePurchases } from '@/monetize/store';
import { useProfile } from '@/state/profile';
import { Body, Button, Card, Dim, H1, Screen, theme } from '@/ui/kit';

const PERKS: [string, string][] = [
  ['🍻', 'Party mode — bet in sips, drinking challenges'],
  ['🌶️', 'Spicy questions (opt-in)'],
  ['👥', 'Unlimited players (free: 10)'],
  ['🔁', 'Choose how many rounds'],
  ['🎛️', 'Turn categories on and off'],
  ['✍️', 'Make your own questions'],
  ['🚫', 'No ads, ever'],
  ['🪙', '2× tokens every game'],
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
    <Screen scroll>
      <H1>Unlock Premium</H1>
      <Body>One payment. Yours forever. When you host, your whole room gets the Premium game.</Body>
      <Card>
        {PERKS.map(([icon, text]) => (
          <View key={text} style={styles.perk}>
            <Text style={styles.icon}>{icon}</Text>
            <Text style={styles.perkText}>{text}</Text>
          </View>
        ))}
      </Card>
      <Button
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
  perkText: { color: theme.text, fontSize: 16, fontWeight: '700', flex: 1 },
});
