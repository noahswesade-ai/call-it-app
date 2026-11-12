import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AnimalAvatar } from '@/avatar/AnimalAvatar';
import {
  ACCESSORIES,
  ACCESSORY_BY_ID,
  ANIMALS,
  SLOT_LABEL,
  TIER_COLOR,
  TIER_LABEL,
  itemKey,
  type AccessorySlot,
  type Tier,
} from '@/avatar/catalog';
import { ACCESSORY_IMAGES } from '@/avatar/images';
import { useProfile } from '@/state/profile';
import { Coin, CoinCounter } from '@/ui/Coin';
import { Button, Dim, Row, Screen, tap } from '@/ui/kit';
import { Bob, PopIn } from '@/ui/motion';
import { colors, fonts } from '@/ui/theme';
import { Icon, IconLabel } from '@/ui/Icon';

type Tab = 'animal' | AccessorySlot;

const TABS: { value: Tab; label: string }[] = [
  { value: 'animal', label: 'Avatars' },
  { value: 'head', label: SLOT_LABEL.head },
  { value: 'eyes', label: SLOT_LABEL.eyes },
  { value: 'mouth', label: SLOT_LABEL.mouth },
  { value: 'neck', label: SLOT_LABEL.neck },
  { value: 'ears', label: SLOT_LABEL.ears },
];

interface Cell {
  key: string;
  id: string;
  name: string;
  tier: Tier;
  price: number;
  adult?: boolean;
  premiumOnly?: boolean;
}

function confirmBuy(name: string, price: number): Promise<boolean> {
  const msg = `Unlock ${name} for ${price.toLocaleString()} gold coins?`;
  if (Platform.OS === 'web') return Promise.resolve(globalThis.confirm?.(msg) ?? true);
  return new Promise((resolve) =>
    Alert.alert('Unlock?', msg, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Unlock', onPress: () => resolve(true) },
    ]),
  );
}

function notify(title: string, msg: string) {
  if (Platform.OS === 'web') globalThis.alert?.(`${title}\n\n${msg}`);
  else Alert.alert(title, msg);
}

export default function AvatarEditor() {
  const { profile, update, owns, buy } = useProfile();
  const [tab, setTab] = useState<Tab>('animal');
  const [name, setName] = useState(profile.name);
  // The preview is always neutral, except a ~1.5s happy flash whenever something is put on.
  const [mood, setMood] = useState<'neutral' | 'happy'>('neutral');
  const moodTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const flashHappy = () => {
    setMood('happy');
    clearTimeout(moodTimer.current);
    moodTimer.current = setTimeout(() => setMood('neutral'), 1500);
  };
  useEffect(() => () => clearTimeout(moodTimer.current), []);
  // A locked item being tried on (not owned yet): shown on the preview with a buy bar.
  const [tryOn, setTryOn] = useState<Cell | undefined>();

  const cells: Cell[] = useMemo(() => {
    const list: Cell[] =
      tab === 'animal'
        ? ANIMALS.map((a) => ({ key: itemKey('animal', a.id), id: a.id, name: a.name, tier: a.tier, price: a.price }))
        : ACCESSORIES.filter((x) => x.slot === tab && (!x.adult || profile.ageConfirmed)).map((x) => ({
            key: itemKey('accessory', x.id),
            id: x.id,
            name: x.name,
            tier: x.tier,
            price: x.price,
            adult: x.adult,
            premiumOnly: x.premiumOnly,
          }));
    return list.sort((a, b) => a.price - b.price);
  }, [tab, profile.ageConfirmed]);

  const slotOf = (c: Cell): Tab => (c.key.startsWith('animal:') ? 'animal' : (ACCESSORY_BY_ID[c.id]?.slot as Tab));

  const previewAvatar = tryOn ? { ...profile.avatar, [slotOf(tryOn)]: tryOn.id } : profile.avatar;
  const isOwned = (c: Cell) => c.price === 0 || owns(c.key);
  const isEquipped = (c: Cell) => (tab === 'animal' ? profile.avatar.animal === c.id : profile.avatar[tab] === c.id);

  const equip = (c: Cell) => {
    const slot = slotOf(c);
    setTryOn(undefined);
    if (slot === 'animal') {
      update({ avatar: { ...profile.avatar, animal: c.id } });
      flashHappy();
      return;
    }
    // Tapping an equipped accessory takes it off.
    const removing = profile.avatar[slot] === c.id;
    update({ avatar: { ...profile.avatar, [slot]: removing ? undefined : c.id } });
    if (!removing) flashHappy();
  };

  const onCell = (c: Cell) => {
    tap();
    if (isOwned(c)) return equip(c);
    // Try it on first: show it on the avatar with a happy face, then offer to unlock it.
    setTryOn(c);
    flashHappy();
  };

  const unlock = async (c: Cell) => {
    if (c.premiumOnly) return router.push('/paywall');
    if (profile.tokens < c.price) {
      notify('Not enough coins', `${c.name} costs ${c.price.toLocaleString()} coins. You have ${profile.tokens.toLocaleString()}. Win games, earn awards, or watch a video in the Shop.`);
      return;
    }
    if (await confirmBuy(c.name, c.price)) {
      if (buy(c.key, c.price)) {
        tap('heavy');
        equip(c);
      }
    }
  };

  const save = () => {
    if (name.trim()) update({ name: name.trim(), namedByUser: true });
  };

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={styles.title}>Your avatar</Text>
        <CoinCounter coins={profile.tokens} onPress={() => router.push('/shop')} />
      </Row>

      <View style={{ alignItems: 'center', gap: 4 }}>
        <PopIn key={JSON.stringify(previewAvatar)} from={0.7} style={{ marginTop: 26 }}>
          <Bob amount={6} duration={900}>
            <AnimalAvatar avatar={previewAvatar} size={140} mood={mood} />
          </Bob>
        </PopIn>
        {tryOn ? (
          <PopIn from={0.6}>
            <View style={styles.buyBar}>
              <View style={{ flex: 1 }}>
                <Text style={styles.buyName} numberOfLines={1}>
                  {tryOn.name}
                </Text>
                <Text style={[styles.tier, { color: TIER_COLOR[tryOn.tier] }]}>{TIER_LABEL[tryOn.tier].toUpperCase()}</Text>
              </View>
              <Button
                small
                icon={tryOn.premiumOnly ? 'crown' : undefined}
                label={tryOn.premiumOnly ? 'Get Premium' : `Unlock · ${tryOn.price.toLocaleString()}`}
                onPress={() => unlock(tryOn)}
              />
              <Pressable onPress={() => setTryOn(undefined)} style={styles.buyClose} accessibilityLabel="Stop trying on">
                <Icon name="close" size={16} color={colors.white} />
              </Pressable>
            </View>
          </PopIn>
        ) : (
          <TextInput value={name} onChangeText={setName} onBlur={save} onSubmitEditing={save} maxLength={16} style={styles.name} />
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabs}>
        {TABS.map((t) => (
          <Pressable
            key={t.value}
            onPress={() => {
              tap();
              setTab(t.value);
            }}
            style={[styles.tab, tab === t.value && styles.tabOn]}
          >
            <Text style={[styles.tabText, tab === t.value && { color: colors.ink }]}>{t.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.grid}>
        {cells.map((c, i) => {
          const owned = isOwned(c);
          const equipped = isEquipped(c);
          return (
            <PopIn key={c.key} delay={Math.min(i, 12) * 30} from={0.6}>
              <Pressable
                onPress={() => onCell(c)}
                style={[styles.cell, { borderColor: equipped ? colors.white : TIER_COLOR[c.tier] }, equipped && styles.cellOn]}
                accessibilityRole="button"
                accessibilityLabel={`${c.name}, ${TIER_LABEL[c.tier]}${owned ? '' : `, ${c.price} coins`}`}
              >
                <View style={{ opacity: owned ? 1 : 0.6 }}>
                  {tab === 'animal' ? (
                    <AnimalAvatar avatar={{ animal: c.id }} size={62} bare />
                  ) : (
                    <Image source={ACCESSORY_IMAGES[c.id]} style={{ width: 58, height: 58 }} resizeMode="contain" />
                  )}
                </View>
                <Text style={styles.cellName} numberOfLines={1}>
                  {c.adult ? '🍻 ' : ''}
                  {c.name}
                </Text>
                <Text style={[styles.tier, { color: TIER_COLOR[c.tier] }]}>{TIER_LABEL[c.tier].toUpperCase()}</Text>
                {equipped ? (
                  <IconLabel icon="check" gap={3} textStyle={styles.status}>ON</IconLabel>
                ) : owned ? (
                  <Text style={styles.statusDim}>{tab === 'animal' ? 'Owned' : 'Tap to wear'}</Text>
                ) : c.premiumOnly ? (
                  <IconLabel icon="crown" gap={3} textStyle={styles.premiumOnly}>PREMIUM</IconLabel>
                ) : (
                  <Row style={{ gap: 3 }}>
                    <Coin size={15} />
                    <Text style={styles.price}>{c.price.toLocaleString()}</Text>
                  </Row>
                )}
              </Pressable>
            </PopIn>
          );
        })}
      </ScrollView>
      <Dim style={{ textAlign: 'center', fontSize: 13 }}>Win games, earn awards and watch videos for gold coins.</Dim>
      <Button
        label="Done"
        onPress={() => {
          save();
          router.back();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.white, fontFamily: fonts.display, fontSize: 30 },
  name: { color: colors.white, fontSize: 24, fontFamily: fonts.display, textAlign: 'center', minWidth: 200, padding: 2 },
  tabsScroll: { flexGrow: 0, flexShrink: 0 },
  tabs: { gap: 6, paddingVertical: 2 },
  tab: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, backgroundColor: 'rgba(20,4,40,0.45)' },
  tabOn: { backgroundColor: colors.gold },
  tabText: { color: colors.white, fontFamily: fonts.display, fontSize: 15 },
  buyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(20,4,40,0.7)',
    borderColor: colors.gold,
    borderWidth: 2,
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 12,
    width: 330,
  },
  buyName: { color: colors.white, fontFamily: fonts.display, fontSize: 17 },
  buyClose: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.15)' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', paddingBottom: 12 },
  cell: {
    width: 100,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18,
    paddingVertical: 8,
    borderWidth: 3,
    gap: 1,
  },
  cellOn: { backgroundColor: 'rgba(255,255,255,0.22)' },
  cellName: { color: colors.white, fontFamily: fonts.display, fontSize: 13, maxWidth: 92 },
  tier: { fontFamily: fonts.display, fontSize: 10, letterSpacing: 1 },
  status: { color: colors.green, fontFamily: fonts.display, fontSize: 13 },
  statusDim: { color: colors.dim, fontFamily: fonts.bodySemi, fontSize: 11 },
  price: { color: colors.gold, fontFamily: fonts.display, fontSize: 14 },
  premiumOnly: { color: colors.gold, fontFamily: fonts.display, fontSize: 12 },
});
