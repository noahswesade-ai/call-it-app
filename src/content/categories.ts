import type { Category, Difficulty, Mode } from '@/game/types';

export interface CategoryInfo {
  id: Category;
  label: string;
  emoji: string;
  color: string;
  /** Only on the wheel in Party mode. */
  partyOnly?: boolean;
  /** Only when the Spicy toggle is on. */
  spicyOnly?: boolean;
  /** Not yet playable in this build; hidden from the wheel. */
  comingSoon?: boolean;
}

export const CATEGORIES: CategoryInfo[] = [
  { id: 'geography', label: 'Geography', emoji: '🌍', color: '#3BA7FF' },
  { id: 'history', label: 'History', emoji: '🏛️', color: '#C98B4A' },
  { id: 'basic', label: 'Basic Knowledge', emoji: '🧠', color: '#8B6CFF' },
  { id: 'popculture', label: 'Pop Culture', emoji: '🎬', color: '#FF5FA2' },
  { id: 'sports', label: 'Sports', emoji: '🏀', color: '#FF8A3D' },
  { id: 'physical', label: 'Physical', emoji: '💪', color: '#2ED18B' },
  { id: 'minigame', label: 'Mini-Games', emoji: '🎮', color: '#00C2C7', comingSoon: true },
  { id: 'kyf', label: 'Know Your Friends', emoji: '👯', color: '#FFC83D' },
  { id: 'party', label: 'Party', emoji: '🍻', color: '#FF4D4D', partyOnly: true },
  { id: 'spicy', label: 'Spicy', emoji: '🌶️', color: '#E0245E', partyOnly: true, spicyOnly: true },
];

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<
  Category,
  CategoryInfo
>;

export const DIFFICULTY_LABEL: Record<Difficulty, string> = { E: 'Easy', M: 'Medium', H: 'Hard' };

/** Categories that may appear on the wheel for these settings (before any host toggles). */
export function availableCategories(mode: Mode, spicy: boolean): Category[] {
  return CATEGORIES.filter(
    (c) => !c.comingSoon && (!c.partyOnly || mode === 'party') && (!c.spicyOnly || spicy),
  ).map((c) => c.id);
}
