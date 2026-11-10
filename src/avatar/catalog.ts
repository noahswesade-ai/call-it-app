import type { AvatarLoadout } from '@/game/types';

/**
 * Avatar catalog: every animal and accessory, its rarity tier and its price in
 * gold coins. The reasoning behind tiers and prices is in PRICING.md.
 *
 * Price ladder (≈ real-money value at the base pack rate of 500 coins = $0.99):
 *   Animals      Common 500 (~$1) · Rare 1,500 (~$3) · Epic 2,500 (~$5) · Legendary 5,000 (~$10)
 *   Accessories  Common 150 · Rare 400 · Epic 900 · Legendary 2,000
 */

export type Tier = 'free' | 'common' | 'rare' | 'epic' | 'legendary';

export const TIER_LABEL: Record<Tier, string> = {
  free: 'Free',
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

export const TIER_COLOR: Record<Tier, string> = {
  free: '#B9AEDB',
  common: '#2EE07F',
  rare: '#22C7F0',
  epic: '#B57BFF',
  legendary: '#FFC93C',
};

export const ANIMAL_PRICE: Record<Tier, number> = { free: 0, common: 500, rare: 1500, epic: 2500, legendary: 5000 };
export const ACCESSORY_PRICE: Record<Tier, number> = { free: 0, common: 150, rare: 400, epic: 900, legendary: 2000 };

export interface AnimalDef {
  id: string;
  name: string;
  tier: Tier;
  price: number;
}

const animal = (id: string, name: string, tier: Tier): AnimalDef => ({ id, name, tier, price: ANIMAL_PRICE[tier] });

export const ANIMALS: AnimalDef[] = [
  // Free starters (the four you chose)
  animal('dog', 'Dog', 'free'),
  animal('cat', 'Cat', 'free'),
  animal('frog', 'Frog', 'free'),
  animal('bear', 'Bear', 'free'),
  // Common: familiar farm & backyard animals — first unlock within a few days of play
  animal('bunny', 'Bunny', 'common'),
  animal('pig', 'Pig', 'common'),
  animal('lamb', 'Lamb', 'common'),
  animal('beaver', 'Beaver', 'common'),
  animal('seal', 'Seal', 'common'),
  animal('squirrel', 'Squirrel', 'common'),
  // Rare: cute & distinctive
  animal('owl', 'Owl', 'rare'),
  animal('koala', 'Koala', 'rare'),
  animal('fawn', 'Fawn', 'rare'),
  animal('flamingo', 'Flamingo', 'rare'),
  animal('chameleon', 'Chameleon', 'rare'),
  // Epic: the internet's favourite animals
  animal('panda', 'Panda', 'epic'),
  animal('fox', 'Fox', 'epic'),
  animal('redpanda', 'Red Panda', 'epic'),
  animal('pangolin', 'Pangolin', 'epic'),
  // Legendary: fantastical / cult favourites, the long-term goal
  animal('axolotl', 'Axolotl', 'legendary'),
  animal('narwhal', 'Narwhal', 'legendary'),
  animal('dragon', 'Dragon', 'legendary'),
];

/** Where an accessory sits on the face. */
export type AccessorySlot = 'head' | 'eyes' | 'mouth' | 'neck' | 'ears';

export const SLOT_LABEL: Record<AccessorySlot, string> = {
  head: 'Head',
  eyes: 'Eyes',
  mouth: 'Face',
  neck: 'Neck',
  ears: 'Ears',
};

export interface AccessoryDef {
  id: string;
  name: string;
  slot: AccessorySlot;
  tier: Tier;
  price: number;
  /** Party-themed (drinking/adult) — only shown after the 18+ age check. */
  adult?: boolean;
  /** Can't be bought with coins: unlocked automatically by buying Premium. */
  premiumOnly?: boolean;
  /** Legacy placement hints — placement now comes from src/avatar/fit.json. */
  scale?: number;
  dy?: number;
}

const acc = (
  id: string,
  name: string,
  slot: AccessorySlot,
  tier: Tier,
  extra: Partial<Pick<AccessoryDef, 'adult' | 'premiumOnly' | 'scale' | 'dy'>> = {},
): AccessoryDef => ({ id, name, slot, tier, price: ACCESSORY_PRICE[tier], ...extra });

export const ACCESSORIES: AccessoryDef[] = [
  // ── Head ──
  acc('beanie', 'Beanie', 'head', 'common'),
  acc('partyhat', 'Party Hat', 'head', 'common', { scale: 0.85, dy: -0.04 }),
  acc('redbow', 'Red Bow', 'head', 'common', { scale: 0.6, dy: 0.04 }),
  acc('bunnyears', 'Bunny Ears', 'head', 'common', { scale: 1.05, dy: -0.06 }),
  acc('butterflyclip', 'Butterfly Clip', 'head', 'common', { scale: 0.5, dy: 0.06 }),
  acc('tophat', 'Top Hat', 'head', 'rare'),
  acc('piratehat', 'Pirate Hat', 'head', 'rare', { scale: 1.05 }),
  acc('flowercrown', 'Flower Crown', 'head', 'rare', { scale: 1.0, dy: 0.06 }),
  acc('headphones', 'Headphones', 'head', 'rare', { scale: 1.05, dy: 0.12 }),
  acc('chefhat', 'Chef Hat', 'head', 'rare'),
  acc('wizardhat', 'Wizard Hat', 'head', 'epic', { scale: 1.05, dy: -0.06 }),
  acc('devilhorns', 'Devil Horns', 'head', 'epic', { scale: 1.0, dy: 0.02 }),
  acc('halo', 'Halo', 'head', 'epic', { scale: 0.9, dy: -0.12 }),
  acc('laurel', 'Laurel Wreath', 'head', 'epic', { scale: 1.0, dy: 0.06 }),
  acc('mohawk', 'Mohawk', 'head', 'epic', { scale: 0.95, dy: -0.04 }),
  acc('rainbowwig', 'Rainbow Wig', 'head', 'epic', { scale: 1.15, dy: 0.04 }),
  acc('crown', 'Royal Crown', 'head', 'legendary', { premiumOnly: true }),
  acc('tiara', 'Tiara', 'head', 'legendary', { scale: 0.8, dy: 0.04 }),
  // ── Eyes ──
  acc('roundglasses', 'Round Glasses', 'eyes', 'common'),
  acc('starglasses', 'Star Glasses', 'eyes', 'rare'),
  acc('heartglasses', 'Heart Glasses', 'eyes', 'rare'),
  acc('heromask', 'Hero Mask', 'eyes', 'rare'),
  acc('monocle', 'Monocle', 'eyes', 'rare', { scale: 0.55, dy: 0.08 }),
  acc('cybervisor', 'Cyber Visor', 'eyes', 'epic', { scale: 1.1 }),
  acc('masquerade', 'Masquerade Mask', 'eyes', 'epic', { scale: 1.05, dy: -0.04 }),
  // ── Face (mouth & nose) ──
  acc('mustache', 'Mustache', 'mouth', 'common'),
  acc('beard', 'Santa Beard', 'mouth', 'rare', { scale: 1.3, dy: 0.12 }),
  acc('nosering', 'Nose Ring', 'mouth', 'epic', { scale: 0.45, dy: -0.06 }),
  // ── Neck ──
  acc('bowtie', 'Polka Bow Tie', 'neck', 'common'),
  acc('tie', 'Striped Tie', 'neck', 'common', { scale: 0.8, dy: 0.04 }),
  acc('scarf', 'Cozy Scarf', 'neck', 'common', { scale: 1.1, dy: 0.06 }),
  acc('pearls', 'Pearl Necklace', 'neck', 'rare'),
  acc('shellnecklace', 'Shell Necklace', 'neck', 'epic'),
  acc('gemcollar', 'Gem Collar', 'neck', 'epic'),
  acc('goldchain', 'Gold Chain', 'neck', 'legendary', { scale: 1.1, dy: 0.04 }),
  // ── Ears ──
  acc('hoops', 'Gold Hoops', 'ears', 'rare'),
  acc('moonearrings', 'Moon & Star Earrings', 'ears', 'rare'),
  acc('diamondstuds', 'Diamond Studs', 'ears', 'legendary'),
  // ── Party collection (18+) ──
  acc('pokervisor', 'Poker Visor', 'head', 'rare', { adult: true, scale: 1.0, dy: 0.04 }),
  acc('martiniband', 'Martini Headband', 'head', 'epic', { adult: true, scale: 0.95 }),
  acc('rosetophat', 'Rose Top Hat', 'head', 'epic', { adult: true, scale: 0.95 }),
  acc('beerhelmet', 'Beer Helmet', 'head', 'legendary', { adult: true, scale: 1.25, dy: 0.02 }),
  acc('cateyeglasses', 'Cat-Eye Shades', 'eyes', 'rare', { adult: true }),
  acc('lacemask', 'Lace Mask', 'eyes', 'epic', { adult: true, scale: 1.05 }),
  acc('boa', 'Feather Boa', 'neck', 'rare', { adult: true, scale: 1.3, dy: 0.08 }),
  acc('spikedcollar', 'Spiked Heart Collar', 'neck', 'epic', { adult: true }),
  acc('diceearrings', 'Lucky Dice Earrings', 'ears', 'rare', { adult: true }),
];

export const ANIMAL_BY_ID: Record<string, AnimalDef> = Object.fromEntries(ANIMALS.map((x) => [x.id, x]));
export const ACCESSORY_BY_ID: Record<string, AccessoryDef> = Object.fromEntries(ACCESSORIES.map((x) => [x.id, x]));

export const SLOTS: AccessorySlot[] = ['head', 'eyes', 'mouth', 'neck', 'ears'];

export const FREE_ITEMS: string[] = ANIMALS.filter((x) => x.price === 0).map((x) => `animal:${x.id}`);

export function itemKey(kind: 'animal' | 'accessory', id: string): string {
  return `${kind}:${id}`;
}

export function randomStarterAvatar(rng: () => number = Math.random): AvatarLoadout {
  const free = ANIMALS.filter((x) => x.tier === 'free');
  return { animal: free[Math.floor(rng() * free.length)].id };
}

/** Repairs a saved loadout from an older version of the app (old animals, colors, slots). */
export function sanitizeLoadout(l: Partial<AvatarLoadout> & Record<string, unknown>): AvatarLoadout {
  const out: AvatarLoadout = { animal: ANIMAL_BY_ID[l.animal as string] ? (l.animal as string) : 'dog' };
  for (const slot of SLOTS) {
    const id = l[slot] as string | undefined;
    if (id && ACCESSORY_BY_ID[id]?.slot === slot) out[slot] = id;
  }
  return out;
}
