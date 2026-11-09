import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AnimalAvatar } from '@/avatar/AnimalAvatar';
import {
  ACCESSORIES,
  ANIMALS,
  COLORS,
  TIER_LABEL,
  itemKey,
  type AccessorySlot,
} from '@/avatar/catalog';
import type { AvatarLoadout } from '@/game/types';
import { useProfile } from '@/state/profile';
import { Button, Dim, H1, Row, Screen, Segmented, tap, theme } from '@/ui/kit';

type Tab = 'animal' | 'color' | AccessorySlot;

const TABS: { value: Tab; label: string }[] = [
  { value: 'animal', label: 'Animal' },
  { value: 'color', label: 'Color' },
  { value: 'head', label: 'Hat' },
  { value: 'face', label: 'Face' },
  { value: 'outfit', label: 'Outfit' },
  { value: 'hand', label: 'Hand' },
];

function notify(title: string, msg: string) {
  if (Platform.OS === 'web') globalThis.alert?.(`${title}\n\n${msg}`);
  else Alert.alert(title, msg);
}

export default function AvatarEditor() {
  const { profile, update, owns, buy } = useProfile();
  const [tab, setTab] = useState<Tab>('animal');
  const [name, setName] = useState(profile.name);

  const items: { key: string; id: string; label: string; price: number; preview: AvatarLoadout; sub?: string }[] =
    tab === 'animal'
      ? ANIMALS.map((a) => ({
          key: itemKey('animal', a.id),
          id: a.id,
          label: a.name,
          price: a.price,
          sub: TIER_LABEL[a.tier],
          preview: { animal: a.id, color: owns(itemKey('color', profile.avatar.color)) && a.price === 0 ? profile.avatar.color : a.defaultColor },
        }))
      : tab === 'color'
        ? COLORS.map((c) => ({
            key: itemKey('color', c.id),
            id: c.id,
            label: c.name,
            price: c.price,
            preview: { ...profile.avatar, color: c.id },
          }))
        : [
            { key: '', id: '', label: 'None', price: 0, preview: { ...profile.avatar, [tab]: undefined } },
            ...ACCESSORIES.filter((x) => x.slot === tab).map((x) => ({
              key: itemKey('accessory', x.id),
              id: x.id,
              label: x.name,
              price: x.price,
              preview: { ...profile.avatar, [tab]: x.id },
            })),
          ];

  const isEquipped = (id: string) =>
    tab === 'animal' ? profile.avatar.animal === id : tab === 'color' ? profile.avatar.color === id : (profile.avatar[tab] ?? '') === id;

  const equip = (id: string) => {
    if (tab === 'animal') {
      const a = ANIMALS.find((x) => x.id === id)!;
      // Keep the current color if owned, otherwise use the animal's signature color.
      const color = owns(itemKey('color', profile.avatar.color)) ? profile.avatar.color : a.defaultColor;
      update({ avatar: { ...profile.avatar, animal: id, color } });
    } else if (tab === 'color') update({ avatar: { ...profile.avatar, color: id } });
    else update({ avatar: { ...profile.avatar, [tab]: id || undefined } });
  };

  const onItem = (item: (typeof items)[number]) => {
    tap();
    if (!item.key || item.price === 0 || owns(item.key)) return equip(item.id);
    if (profile.tokens < item.price) {
      notify('Not enough tokens', `${item.label} costs ${item.price} 🪙. You have ${profile.tokens}. Win games or visit the shop to earn more.`);
      return;
    }
    if (buy(item.key, item.price)) equip(item.id);
  };

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <H1>Your animal</H1>
        <Text style={styles.tokens}>🪙 {profile.tokens}</Text>
      </Row>
      <View style={{ alignItems: 'center' }}>
        <AnimalAvatar avatar={profile.avatar} size={150} mood="happy" />
        <TextInput
          value={name}
          onChangeText={setName}
          onBlur={() => name.trim() && update({ name: name.trim() })}
          maxLength={16}
          style={styles.name}
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
        <Segmented options={TABS} value={tab} onChange={setTab} />
      </ScrollView>
      <ScrollView contentContainerStyle={styles.grid}>
        {items.map((item) => {
          const owned = !item.key || item.price === 0 || owns(item.key);
          const equipped = isEquipped(item.id);
          return (
            <Pressable
              key={item.label}
              onPress={() => onItem(item)}
              style={[styles.cell, equipped && { borderColor: theme.accent }]}
              accessibilityRole="button"
              accessibilityLabel={`${item.label}${owned ? '' : `, ${item.price} tokens`}`}
            >
              <View style={{ opacity: owned ? 1 : 0.55 }}>
                <AnimalAvatar avatar={item.preview} size={64} />
              </View>
              <Text style={styles.cellLabel} numberOfLines={1}>
                {item.label}
              </Text>
              <Text style={[styles.cellSub, !owned && { color: theme.accent }]}>
                {equipped ? 'Equipped' : owned ? item.sub ?? 'Owned' : `🔒 ${item.price}`}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Dim style={{ textAlign: 'center' }}>Locked items cost tokens. Tap one to unlock it.</Dim>
      <Button
        label="Done"
        onPress={() => {
          if (name.trim()) update({ name: name.trim() });
          router.back();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  tokens: { color: theme.accent, fontWeight: '900', fontSize: 18 },
  name: { color: theme.text, fontSize: 24, fontWeight: '900', textAlign: 'center', minWidth: 200, padding: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', paddingBottom: 12 },
  cell: {
    width: 98,
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: 16,
    paddingVertical: 8,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  cellLabel: { color: theme.text, fontWeight: '800', fontSize: 13 },
  cellSub: { color: theme.dim, fontSize: 12, fontWeight: '700' },
});
