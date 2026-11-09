import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { TOKEN_PACKS, purchaseTokenPack, showRewardedAd, STORE_IS_PLACEHOLDER } from '@/monetize/store';
import { useProfile } from '@/state/profile';
import { Body, Button, Card, Dim, H1, H2, Row, Screen, theme } from '@/ui/kit';
import { CoinCounter, SpinningCoin } from '@/ui/Coin';
import { PopIn } from '@/ui/motion';
import { fonts } from '@/ui/theme';

export default function Shop() {
  const { profile, addTokens } = useProfile();
  return (
    <Screen scroll>
      <Row style={{ justifyContent: 'space-between' }}>
        <H1>Shop</H1>
        <CoinCounter coins={profile.tokens} size="lg" />
      </Row>
      {STORE_IS_PLACEHOLDER && (
        <Card style={{ backgroundColor: '#3A2A10' }}>
          <Dim>
            Test mode: purchases and ads aren't connected yet, so these buttons just add coins. Real payments arrive once
            RevenueCat and AdMob are set up.
          </Dim>
        </Card>
      )}
      <Card>
        <H2>Free coins</H2>
        <Body>Watch a short ad for 15 gold coins (up to 5 a day).</Body>
        <Button
          label="▶ Watch ad · +15"
          variant="secondary"
          onPress={async () => {
            if (await showRewardedAd()) addTokens(15);
          }}
        />
      </Card>
      <H2>Coin chests</H2>
      {TOKEN_PACKS.map((pack, i) => (
        <PopIn key={pack.id} delay={i * 90}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Row>
            <SpinningCoin size={34 + i * 6} every={2400 + i * 500} />
            <Text style={styles.pack}>{pack.tokens.toLocaleString()}</Text>
          </Row>
          <Button
            small
            label={pack.price}
            onPress={async () => {
              if (await purchaseTokenPack(pack.id)) addTokens(pack.tokens);
            }}
          />
        </Card>
        </PopIn>
      ))}
      <Button label="Customize your animal" variant="secondary" onPress={() => router.push('/avatar')} />
      <Button label="Back" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  tokens: { color: theme.accent, fontWeight: '900', fontSize: 18 },
  pack: { color: theme.accent, fontSize: 26, fontFamily: fonts.display },
});
