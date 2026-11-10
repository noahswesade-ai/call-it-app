import type { Category, Difficulty, Mode } from '@/game/types';

export interface CategoryInfo {
  id: Category;
  label: string;
  emoji: string;
  color: string;
  /** One short line shown in the box after the wheel lands. */
  description: string;
  /** Only on the wheel in Party mode. */
  partyOnly?: boolean;
  /** Only when the Spicy toggle is on. */
  spicyOnly?: boolean;
  /** Not yet playable in this build; hidden from the wheel. */
  comingSoon?: boolean;
}

export const CATEGORIES: CategoryInfo[] = [
  { id: 'geography', label: 'Geography', emoji: '🌍', color: '#3BA7FF', description: 'Maps, capitals & far-off places' },
  { id: 'history', label: 'History', emoji: '🏛️', color: '#C98B4A', description: 'Dates, legends & big moments' },
  { id: 'basic', label: 'Basic Knowledge', emoji: '🧠', color: '#8B6CFF', description: 'Everyday facts & quick brain teasers' },
  { id: 'popculture', label: 'Pop Culture', emoji: '🎬', color: '#FF5FA2', description: 'Movies, music, TV & celebs' },
  { id: 'sports', label: 'Sports', emoji: '🏀', color: '#FF8A3D', description: 'Teams, legends & record-breakers' },
  { id: 'physical', label: 'Physical', emoji: '💪', color: '#2ED18B', description: 'Get up! A test of body & nerve' },
  { id: 'minigame', label: 'Mini-Games', emoji: '🎮', color: '#00C2C7', description: 'A phone battle: fastest thumbs win', comingSoon: true },
  { id: 'kyf', label: 'Know Your Friends', emoji: '👯', color: '#FFC83D', description: 'How well do they know a friend?' },
  { id: 'party', label: 'Party', emoji: '🍻', color: '#FF4D4D', description: 'A drinking challenge 🍻', partyOnly: true },
  { id: 'spicy', label: 'Spicy', emoji: '🌶️', color: '#E0245E', description: 'Cheeky, flirty & a little risky 🌶️', partyOnly: true, spicyOnly: true },
];

export const RANDOM_DESCRIPTION = 'Anything goes. Could be anything!';

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
