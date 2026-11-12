import { router } from 'expo-router';
import { useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { ACCESSORY_BY_ID, itemKey } from '@/avatar/catalog';
import { ACCESSORY_IMAGES } from '@/avatar/images';
import {
  AD_DAILY_CAP,
  AD_REWARD,
  STARTER_PACK,
  STORE_IS_PLACEHOLDER,
  TOKEN_PACKS,
  purchaseTokenPack,
  showRewardedAd,
} from '@/monetize/store';
import { useProfile } from '@/state/profile';
import { CoinCounter, SpinningCoin } from '@/ui/Coin';
import { Body, Button, Card, Dim, H1, H2, Row, Screen } from '@/ui/kit';
import { Pulse, PopIn } from '@/ui/motion';
import { colors, fonts } from '@/ui/theme';
import { Icon, IconLabel } from '@/ui/Icon';

const today = () => new Date().toISOString().slice(0, 10);

export default function Shop() {
  const { profile, addTokens, update } = useProfile();
  const adsToday = profile.adDay === today() ? profile.adCount : 0;
  const adsLeft = Math.max(0, AD_DAILY_CAP - adsToday);

  // Starter pack: offered once a player has played a few games, until bought. No countdown
  // timer: time-pressure offers earn a PEGI risk label and feel pushy (Goals doc).
  const eligible = !profile.starterPackBought && profile.gamesPlayed >= STARTER_PACK.offerAfterGames;
  useEffect(() => {
    if (eligible && !profile.starterOfferAt) update({ starterOfferAt: Date.now() });
  }, [eligible, profile.starterOfferAt, update]);
  const showStarter = eligible;
  const starterItem = ACCESSORY_BY_ID[STARTER_PACK.accessory];

  return (
    <Screen scroll>
      <Row style={{ justifyContent: 'space-between' }}>
        <H1>Shop</H1>
        <CoinCounter coins={profile.tokens} size="lg" />
      </Row>
      {STORE_IS_PLACEHOLDER && (
        <Card style={{ backgroundColor: 'rgba(80,50,10,0.6)' }}>
          <Dim>Test mode: purchases and ads aren't connected yet, so these buttons just add coins.</Dim>
        </Card>
      )}

      {showStarter && (
        <PopIn>
          <Pulse scale={1.02} duration={900}>
            <View style={styles.starter}>
              <IconLabel icon="gift" textStyle={styles.starterTag}>STARTER PACK · BEST VALUE FOR NEW PLAYERS</IconLabel>
              <Row style={{ gap: 12 }}>
                <SpinningCoin size={54} every={1500} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.starterBig}>{STARTER_PACK.tokens.toLocaleString()} coins</Text>
                  <Text style={styles.starterSub}>+ {starterItem?.name} (Rare)</Text>
                </View>
                <Image source={ACCESSORY_IMAGES[STARTER_PACK.accessory]} style={{ width: 56, height: 56 }} resizeMode="contain" />
              </Row>
              <Text style={styles.starterValue}>4× the coins of a normal $0.99 pack</Text>
              <Button
                label={`Get it · ${STARTER_PACK.price}`}
                onPress={async () => {
                  if (await purchaseTokenPack(STARTER_PACK.id)) {
                    addTokens(STARTER_PACK.tokens);
                    update({
                      starterPackBought: true,
                      owned: Array.from(new Set([...profile.owned, itemKey('accessory', STARTER_PACK.accessory)])),
                    });
                  }
                }}
              />
            </View>
          </Pulse>
        </PopIn>
      )}

      <Card>
        <H2>Free coins</H2>
        <Body>
          Watch a short video for {AD_REWARD} gold coins. {adsLeft} of {AD_DAILY_CAP} left today.
        </Body>
        <Button
          label={adsLeft > 0 ? `▶ Watch video · +${AD_REWARD}` : 'Come back tomorrow'}
          variant="secondary"
          disabled={adsLeft === 0}
          onPress={async () => {
            if (await showRewardedAd()) {
              addTokens(AD_REWARD);
              update({ adDay: today(), adCount: adsToday + 1 });
            }
          }}
        />
      </Card>

      <H2>Coin packs</H2>
      {TOKEN_PACKS.map((pack, i) => (
        <PopIn key={pack.id} delay={i * 80}>
          <View style={[styles.pack, pack.tag === 'MOST POPULAR' && styles.popular, pack.tag === 'BEST VALUE' && styles.best]}>
            {pack.tag && <Text style={[styles.tag, pack.tag === 'BEST VALUE' && { backgroundColor: colors.green }]}>{pack.tag}</Text>}
            <Row style={{ flex: 1 }}>
              <SpinningCoin size={32 + i * 5} every={2400 + i * 400} />
              <View>
                <Text style={styles.packAmount}>{pack.tokens.toLocaleString()}</Text>
                {pack.bonus > 0 && <Text style={styles.bonus}>+{pack.bonus}% bonus</Text>}
              </View>
            </Row>
            <Button
              small
              label={pack.price}
              onPress={async () => {
                if (await purchaseTokenPack(pack.id)) addTokens(pack.tokens);
              }}
            />
          </View>
        </PopIn>
      ))}
      <Button icon="palette" label="Customize your avatar" variant="secondary" onPress={() => router.push('/avatar')} />
      <Button label="Back" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  starter: {
    backgroundColor: colors.party,
    borderColor: colors.gold,
    borderWidth: 3,
    borderRadius: 24,
    padding: 16,
    gap: 10,
    shadowColor: colors.gold,
    shadowOpacity: 0.6,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  starterTag: { color: colors.gold, fontFamily: fonts.display, fontSize: 13, letterSpacing: 1 },
  starterBig: { color: colors.white, fontFamily: fonts.display, fontSize: 28 },
  starterSub: { color: colors.dim, fontFamily: fonts.bodyBold, fontSize: 15 },
  starterValue: { color: colors.green, fontFamily: fonts.bodyBold, fontSize: 14 },
  pack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    padding: 14,
    paddingTop: 18,
  },
  popular: { borderColor: colors.gold, backgroundColor: 'rgba(255,201,60,0.12)' },
  best: { borderColor: colors.green, backgroundColor: 'rgba(46,224,127,0.1)' },
  tag: {
    position: 'absolute',
    top: -10,
    left: 14,
    backgroundColor: colors.gold,
    color: colors.ink,
    fontFamily: fonts.display,
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 99,
    overflow: 'hidden',
  },
  packAmount: { color: colors.gold, fontSize: 26, fontFamily: fonts.display },
  bonus: { color: colors.green, fontFamily: fonts.bodyBold, fontSize: 13 },
});
