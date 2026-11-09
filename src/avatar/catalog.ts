import type { AvatarLoadout } from '@/game/types';

// Avatar catalog (PLAN.md §5). Prices are in tokens. Everything listed here is
// drawable by AnimalAvatar; polished art can replace the drawings later without
// changing ids.

export type Tier = 'free' | 'common' | 'rare' | 'epic' | 'legendary';

export interface AnimalDef {
  id: string;
  name: string;
  tier: Tier;
  price: number;
  /** Suggested starting color. */
  defaultColor: string;
}

export const TIER_PRICE: Record<Tier, number> = { free: 0, common: 400, rare: 1000, epic: 2500, legendary: 6000 };
export const TIER_LABEL: Record<Tier, string> = {
  free: 'Free',
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

const a = (id: string, name: string, tier: Tier, defaultColor: string): AnimalDef => ({
  id,
  name,
  tier,
  price: TIER_PRICE[tier],
  defaultColor,
});

export const ANIMALS: AnimalDef[] = [
  a('cat', 'Cat', 'free', 'orange'),
  a('dog', 'Dog', 'free', 'tan'),
  a('frog', 'Frog', 'free', 'green'),
  a('bear', 'Bear', 'free', 'brown'),
  a('bunny', 'Bunny', 'common', 'cream'),
  a('pig', 'Pig', 'common', 'pink'),
  a('penguin', 'Penguin', 'common', 'navy'),
  a('duck', 'Duck', 'common', 'yellow'),
  a('fox', 'Fox', 'rare', 'orange'),
  a('panda', 'Panda', 'rare', 'white'),
  a('koala', 'Koala', 'rare', 'grey'),
  a('raccoon', 'Raccoon', 'rare', 'grey'),
  a('owl', 'Owl', 'rare', 'brown'),
  a('shark', 'Shark', 'epic', 'sky'),
  a('axolotl', 'Axolotl', 'epic', 'pink'),
  a('redpanda', 'Red Panda', 'epic', 'rust'),
  a('sloth', 'Sloth', 'epic', 'tan'),
  a('octopus', 'Octopus', 'epic', 'purple'),
  a('dragon', 'Dragon', 'legendary', 'green'),
  a('unicorn', 'Unicorn', 'legendary', 'white'),
  a('yeti', 'Yeti', 'legendary', 'white'),
];

export interface ColorDef {
  id: string;
  name: string;
  hex: string;
  price: number;
  /** Special finishes render with a gradient. */
  finish?: [string, string];
}

const c = (id: string, name: string, hex: string, price = 150): ColorDef => ({ id, name, hex, price });

export const COLORS: ColorDef[] = [
  // 6 free base colors
  c('orange', 'Orange', '#FF9F43', 0),
  c('brown', 'Brown', '#A9744F', 0),
  c('green', 'Green', '#4CD07D', 0),
  c('tan', 'Tan', '#E0B784', 0),
  c('grey', 'Grey', '#A4AEBB', 0),
  c('white', 'Snow', '#F4F1EC', 0),
  // 18 unlockable colors
  c('pink', 'Bubblegum', '#FF9EC4'),
  c('cream', 'Cream', '#FFE9C7'),
  c('yellow', 'Sunshine', '#FFD93D'),
  c('navy', 'Navy', '#3A4F7A'),
  c('sky', 'Sky', '#7CC6FE'),
  c('rust', 'Rust', '#D2603A'),
  c('purple', 'Grape', '#9B6DFF'),
  c('mint', 'Mint', '#9DF2C9'),
  c('lilac', 'Lilac', '#CDB4FF'),
  c('peach', 'Peach', '#FFB89A'),
  c('teal', 'Teal', '#1FB5A8'),
  c('red', 'Cherry', '#FF5A5F'),
  c('black', 'Midnight', '#3B3B4F'),
  c('neonGreen', 'Neon Lime', '#B6FF3B'),
  c('neonPink', 'Neon Pink', '#FF3BD4'),
  c('neonBlue', 'Neon Blue', '#3BE2FF'),
  c('olive', 'Olive', '#8E9B4A'),
  c('sand', 'Sand', '#D9C7A2'),
  // Special finishes
  { id: 'gold', name: 'Gold', hex: '#F5C542', price: 1500, finish: ['#FFE68A', '#D69E1E'] },
  { id: 'galaxy', name: 'Galaxy', hex: '#5B3FA8', price: 1500, finish: ['#2B1B5C', '#C04BD9'] },
  { id: 'rainbow', name: 'Rainbow', hex: '#FF6F91', price: 1500, finish: ['#FF6F91', '#4FC3F7'] },
  { id: 'glow', name: 'Glow-in-the-Dark', hex: '#C6FF8A', price: 1500, finish: ['#EFFFD1', '#7CFF4F'] },
];

export type AccessorySlot = 'head' | 'face' | 'outfit' | 'hand';

export interface AccessoryDef {
  id: string;
  name: string;
  slot: AccessorySlot;
  price: number;
}

const x = (id: string, name: string, slot: AccessorySlot, price: number): AccessoryDef => ({ id, name, slot, price });

export const ACCESSORIES: AccessoryDef[] = [
  x('cap', 'Cap', 'head', 100),
  x('beanie', 'Beanie', 'head', 150),
  x('partyHat', 'Party Hat', 'head', 200),
  x('cowboy', 'Cowboy Hat', 'head', 400),
  x('chef', 'Chef Hat', 'head', 400),
  x('viking', 'Viking Helmet', 'head', 700),
  x('halo', 'Halo', 'head', 900),
  x('crown', 'Crown', 'head', 1200),
  x('sunglasses', 'Sunglasses', 'face', 150),
  x('heartGlasses', 'Heart Glasses', 'face', 300),
  x('monocle', 'Monocle', 'face', 400),
  x('mustache', 'Mustache', 'face', 250),
  x('clownNose', 'Clown Nose', 'face', 200),
  x('hoodie', 'Hoodie', 'outfit', 300),
  x('tux', 'Tuxedo', 'outfit', 800),
  x('hawaiian', 'Hawaiian Shirt', 'outfit', 500),
  x('jersey', 'Sports Jersey', 'outfit', 400),
  x('cape', 'Superhero Cape', 'outfit', 1000),
  x('pajamas', 'Pajamas', 'outfit', 350),
  x('leather', 'Leather Jacket', 'outfit', 900),
  x('trophy', 'Trophy', 'hand', 600),
  x('foamFinger', 'Foam Finger', 'hand', 300),
  x('mic', 'Microphone', 'hand', 400),
  x('pizza', 'Pizza Slice', 'hand', 200),
];

export const ANIMAL_BY_ID = Object.fromEntries(ANIMALS.map((x) => [x.id, x]));
export const COLOR_BY_ID = Object.fromEntries(COLORS.map((x) => [x.id, x]));
export const ACCESSORY_BY_ID = Object.fromEntries(ACCESSORIES.map((x) => [x.id, x]));

export const FREE_ITEMS: string[] = [
  ...ANIMALS.filter((x) => x.price === 0).map((x) => `animal:${x.id}`),
  ...COLORS.filter((x) => x.price === 0).map((x) => `color:${x.id}`),
];

export function itemKey(kind: 'animal' | 'color' | 'accessory', id: string): string {
  return `${kind}:${id}`;
}

export function randomStarterAvatar(rng: () => number = Math.random): AvatarLoadout {
  const free = ANIMALS.filter((x) => x.tier === 'free');
  const animal = free[Math.floor(rng() * free.length)];
  return { animal: animal.id, color: animal.defaultColor };
}
