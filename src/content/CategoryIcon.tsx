import { Image, Text } from 'react-native';
import type { Category, WheelSlice } from '@/game/types';
import { CATEGORY_BY_ID } from './categories';

/* eslint-disable @typescript-eslint/no-require-imports */
/** Illustrated category icons (assets/categories, cut by tools/cut_category_icons.py). */
export const CATEGORY_ICONS: Partial<Record<Category | 'random', number>> = {
  geography: require('../../assets/categories/geography.png'),
  history: require('../../assets/categories/history.png'),
  basic: require('../../assets/categories/basic.png'),
  popculture: require('../../assets/categories/popculture.png'),
  sports: require('../../assets/categories/sports.png'),
  physical: require('../../assets/categories/physical.png'),
  minigame: require('../../assets/categories/minigame.png'),
  kyf: require('../../assets/categories/kyf.png'),
  random: require('../../assets/categories/random.png'),
};

/** A category's illustrated icon, or its emoji when there's no artwork (Party, Spicy). */
export function CategoryIcon({ category, size = 28 }: { category: WheelSlice; size?: number }) {
  const icon = CATEGORY_ICONS[category];
  if (icon) return <Image source={icon} style={{ width: size, height: size }} resizeMode="contain" />;
  const emoji = category === 'random' ? '🎲' : CATEGORY_BY_ID[category]?.emoji;
  return <Text style={{ fontSize: size * 0.8, lineHeight: size, width: size, textAlign: 'center' }}>{emoji}</Text>;
}
