import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { TOKEN_PACKS, purchaseTokenPack, showRewardedAd, STORE_IS_PLACEHOLDER } from '@/monetize/store';
import { useProfile } from '@/state/profile';
import { Body, Button, Card, Dim, H1, H2, Row, Screen, theme } from '@/ui/kit';

export default function Shop() {
  const { profile, addTokens } = useProfile();
  return (
    <Screen scroll>
      <Row style={{ justifyContent: 'space-between' }}>
        <H1>Shop</H1>
        <Text style={styles.tokens}>🪙 {profile.tokens}</Text>
      </Row>
      {STORE_IS_PLACEHOLDER && (
        <Card style={{ backgroundColor: '#3A2A10' }}>
          <Dim>
            Test mode: purchases and ads aren't connected yet, so these buttons just add tokens. Real payments arrive once
            RevenueCat and AdMob are set up.
          </Dim>
        </Card>
      )}
      <Card>
        <H2>Free tokens</H2>
        <Body>Watch a short ad for 25 🪙 (up to 5 a day).</Body>
        <Button
          label="Watch ad · +25"
          variant="secondary"
          onPress={async () => {
            if (await showRewardedAd()) addTokens(25);
          }}
        />
      </Card>
      <H2>Token packs</H2>
      {TOKEN_PACKS.map((pack) => (
        <Card key={pack.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.pack}>🪙 {pack.tokens.toLocaleString()}</Text>
          <Button
            small
            label={pack.price}
            onPress={async () => {
              if (await purchaseTokenPack(pack.id)) addTokens(pack.tokens);
            }}
          />
        </Card>
      ))}
      <Button label="Customize your animal" variant="secondary" onPress={() => router.push('/avatar')} />
      <Button label="Back" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  tokens: { color: theme.accent, fontWeight: '900', fontSize: 18 },
  pack: { color: theme.text, fontSize: 20, fontWeight: '900' },
});
