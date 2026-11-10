import React from 'react';
import { Image, View } from 'react-native';
import type { AvatarLoadout } from '@/game/types';
import { ACCESSORY_BY_ID, type AccessorySlot } from './catalog';
import { ACCESSORY_IMAGES, AVATAR_IMAGES } from './images';

/**
 * Draws a player's animal with the right expression plus any accessories.
 *
 * Moods (each animal has three hand-drawn faces):
 *   neutral – lobby, choosing screens, waiting
 *   happy   – winning, correct calls, podium
 *   sad     – losing, drinking, being the Underdog
 * "drink" and "nervous" are kept as aliases of sad so older call sites still work.
 */
export type Mood = 'neutral' | 'happy' | 'sad' | 'drink' | 'nervous';

interface Props {
  avatar: AvatarLoadout;
  size?: number;
  mood?: Mood;
  /** Hide accessories (e.g. tiny previews in lists). */
  bare?: boolean;
}

/**
 * Where each animal's features are, as fractions of the (square) image:
 * top = top of the head (between the ears), eye = eye line, cx = face centre.
 * Used to seat accessories. Tweak here if something sits slightly off.
 */
const FACE: Record<string, { top: number; eye: number; cx?: number }> = {
  axolotl: { top: 0.22, eye: 0.56 },
  bear: { top: 0.1, eye: 0.52 },
  beaver: { top: 0.1, eye: 0.42 },
  bunny: { top: 0.32, eye: 0.66 },
  cat: { top: 0.14, eye: 0.56 },
  chameleon: { top: 0.12, eye: 0.55 },
  dog: { top: 0.1, eye: 0.53 },
  dragon: { top: 0.26, eye: 0.6 },
  fawn: { top: 0.28, eye: 0.6 },
  flamingo: { top: 0.12, eye: 0.5 },
  fox: { top: 0.16, eye: 0.6 },
  frog: { top: 0.06, eye: 0.36 },
  koala: { top: 0.16, eye: 0.58 },
  lamb: { top: 0.12, eye: 0.6 },
  narwhal: { top: 0.28, eye: 0.6 },
  owl: { top: 0.12, eye: 0.5 },
  panda: { top: 0.12, eye: 0.55 },
  pangolin: { top: 0.08, eye: 0.6 },
  pig: { top: 0.12, eye: 0.5 },
  redpanda: { top: 0.14, eye: 0.6 },
  seal: { top: 0.16, eye: 0.6 },
  squirrel: { top: 0.22, eye: 0.62, cx: 0.44 },
};

const BASE: Record<AccessorySlot, { w: number; y: (f: { top: number; eye: number }) => number }> = {
  head: { w: 0.62, y: (f) => f.top + 0.04 },
  eyes: { w: 0.56, y: (f) => f.eye },
  mouth: { w: 0.36, y: (f) => f.eye + 0.21 },
  neck: { w: 0.58, y: () => 0.98 },
  ears: { w: 0.26, y: (f) => f.eye + 0.2 },
};

// Back to front.
const ORDER: AccessorySlot[] = ['neck', 'mouth', 'eyes', 'ears', 'head'];

function moodKey(mood: Mood): 'neutral' | 'happy' | 'sad' {
  if (mood === 'happy') return 'happy';
  if (mood === 'sad' || mood === 'drink' || mood === 'nervous') return 'sad';
  return 'neutral';
}

export function AnimalAvatar({ avatar, size = 64, mood = 'neutral', bare }: Props) {
  const m = moodKey(mood);
  const src = AVATAR_IMAGES[`${avatar.animal}-${m}`] ?? AVATAR_IMAGES[`dog-${m}`];
  const face = FACE[avatar.animal] ?? { top: 0.12, eye: 0.55 };
  const cx = face.cx ?? 0.5;

  return (
    <View style={{ width: size, height: size }}>
      {!bare &&
        ORDER.filter((s) => s === 'neck').map((slot) => <Item key={slot} slot={slot} avatar={avatar} size={size} face={face} cx={cx} />)}
      <Image source={src} style={{ width: size, height: size }} resizeMode="contain" />
      {!bare &&
        ORDER.filter((s) => s !== 'neck').map((slot) => <Item key={slot} slot={slot} avatar={avatar} size={size} face={face} cx={cx} />)}
    </View>
  );
}

function Item({
  slot,
  avatar,
  size,
  face,
  cx,
}: {
  slot: AccessorySlot;
  avatar: AvatarLoadout;
  size: number;
  face: { top: number; eye: number };
  cx: number;
}) {
  const id = avatar[slot];
  if (!id) return null;
  const def = ACCESSORY_BY_ID[id];
  const img = ACCESSORY_IMAGES[id];
  if (!def || !img) return null;
  const base = BASE[slot];
  const w = size * base.w * (def.scale ?? 1);
  const centerY = size * (base.y(face) + (def.dy ?? 0));
  if (slot === 'ears') {
    // Earring art shows a pair side by side: split it and hang one on each side of the face.
    const half = w;
    const spread = size * 0.4;
    return (
      <>
        {[-1, 1].map((side) => (
          <View
            key={side}
            style={{
              position: 'absolute',
              width: half,
              height: half * 2,
              overflow: 'hidden',
              left: size * cx + side * spread - half / 2,
              top: centerY - half,
            }}
          >
            <Image source={img} resizeMode="contain" style={{ width: half * 2, height: half * 2, marginLeft: side < 0 ? 0 : -half }} />
          </View>
        ))}
      </>
    );
  }
  return (
    <Image
      source={img}
      resizeMode="contain"
      style={{ position: 'absolute', width: w, height: w, left: size * cx - w / 2, top: centerY - w / 2 }}
    />
  );
}
