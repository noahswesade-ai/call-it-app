import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Polygon, Rect, Stop } from 'react-native-svg';
import type { AvatarLoadout } from '@/game/types';
import { COLOR_BY_ID } from './catalog';
import { shade } from './color';

/**
 * Chunky round "blob" animals drawn in SVG. Every animal shares one rig — a round
 * body centred at (60, 70) in a 120×120 box — so any color recolors any animal and
 * any accessory fits every animal.
 */

export type Mood = 'neutral' | 'happy' | 'drink' | 'nervous';

interface Props {
  avatar: AvatarLoadout;
  size?: number;
  mood?: Mood;
}

const INK = '#2B2340';
const CX = 60;
const CY = 70;
const RX = 40;
const RY = 36;

export function AnimalAvatar({ avatar, size = 64, mood = 'neutral' }: Props) {
  const color = COLOR_BY_ID[avatar.color] ?? COLOR_BY_ID.orange;
  const base = color.hex;
  const dark = shade(base, -0.28);
  const light = shade(base, 0.35);
  const fill = color.finish ? 'url(#finish)' : base;
  const p: Parts = { base, dark, light, fill, animal: avatar.animal };

  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      {color.finish && (
        <Defs>
          <LinearGradient id="finish" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={color.finish[0]} />
            <Stop offset="1" stopColor={color.finish[1]} />
          </LinearGradient>
        </Defs>
      )}
      {avatar.outfit === 'cape' && <Path d="M28 70 Q60 40 92 70 L102 116 L18 116 Z" fill="#E53950" stroke={INK} strokeWidth={3} />}
      <Behind {...p} />
      <Ellipse cx={CX} cy={CY} rx={RX} ry={RY} fill={fill} stroke={INK} strokeWidth={3.5} />
      <Markings {...p} />
      {avatar.outfit && <Outfit id={avatar.outfit} />}
      <Face {...p} mood={mood} />
      {avatar.face && <FaceItem id={avatar.face} />}
      {avatar.head && <HeadItem id={avatar.head} />}
      {avatar.hand && <HandItem id={avatar.hand} />}
      {mood === 'nervous' && <Path d="M95 52 q5 8 0 12 q-5 -4 0 -12z" fill="#7CC6FE" stroke={INK} strokeWidth={1.5} />}
    </Svg>
  );
}

interface Parts {
  base: string;
  dark: string;
  light: string;
  fill: string;
  animal: string;
}

const tri = (pts: string, fill: string) => <Polygon points={pts} fill={fill} stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />;

/** Ears, horns, fins: drawn before the body so the body overlaps their base. */
function Behind({ animal, fill, dark, light }: Parts) {
  switch (animal) {
    case 'cat':
      return <G>{tri('28,52 32,20 52,38', fill)}{tri('92,52 88,20 68,38', fill)}{tri('34,44 35,29 45,38', '#FFB3C1')}{tri('86,44 85,29 75,38', '#FFB3C1')}</G>;
    case 'fox':
    case 'redpanda':
      return <G>{tri('26,54 30,14 54,38', fill)}{tri('94,54 90,14 66,38', fill)}{tri('33,44 33,26 46,37', INK)}{tri('87,44 87,26 74,37', INK)}</G>;
    case 'raccoon':
      return <G>{tri('30,50 34,22 52,38', fill)}{tri('90,50 86,22 68,38', fill)}</G>;
    case 'dog':
      return <G><Ellipse cx={24} cy={62} rx={11} ry={20} fill={dark} stroke={INK} strokeWidth={3.5} /><Ellipse cx={96} cy={62} rx={11} ry={20} fill={dark} stroke={INK} strokeWidth={3.5} /></G>;
    case 'bear':
    case 'yeti':
      return <G><Circle cx={32} cy={40} r={12} fill={fill} stroke={INK} strokeWidth={3.5} /><Circle cx={88} cy={40} r={12} fill={fill} stroke={INK} strokeWidth={3.5} /><Circle cx={32} cy={40} r={5} fill={light} /><Circle cx={88} cy={40} r={5} fill={light} /></G>;
    case 'panda':
      return <G><Circle cx={32} cy={40} r={12} fill={INK} /><Circle cx={88} cy={40} r={12} fill={INK} /></G>;
    case 'koala':
      return <G><Circle cx={24} cy={46} r={17} fill={fill} stroke={INK} strokeWidth={3.5} /><Circle cx={96} cy={46} r={17} fill={fill} stroke={INK} strokeWidth={3.5} /><Circle cx={24} cy={46} r={9} fill="#F6D9E1" /><Circle cx={96} cy={46} r={9} fill="#F6D9E1" /></G>;
    case 'bunny':
      return <G><Ellipse cx={44} cy={24} rx={9} ry={24} fill={fill} stroke={INK} strokeWidth={3.5} /><Ellipse cx={76} cy={24} rx={9} ry={24} fill={fill} stroke={INK} strokeWidth={3.5} /><Ellipse cx={44} cy={26} rx={4} ry={15} fill="#FFB3C1" /><Ellipse cx={76} cy={26} rx={4} ry={15} fill="#FFB3C1" /></G>;
    case 'pig':
      return <G>{tri('32,46 34,30 48,38', fill)}{tri('88,46 86,30 72,38', fill)}</G>;
    case 'frog':
      return <G><Circle cx={42} cy={40} r={14} fill={fill} stroke={INK} strokeWidth={3.5} /><Circle cx={78} cy={40} r={14} fill={fill} stroke={INK} strokeWidth={3.5} /></G>;
    case 'owl':
      return <G>{tri('30,46 28,22 46,36', fill)}{tri('90,46 92,22 74,36', fill)}</G>;
    case 'shark':
      return <G>{tri('52,38 66,6 74,38', fill)}</G>;
    case 'axolotl':
      return (
        <G>
          {[-14, 0, 14].map((dy) => (
            <G key={dy}>
              <Ellipse cx={18} cy={60 + dy} rx={11} ry={4} fill="#FF6FA5" stroke={INK} strokeWidth={2.5} transform={`rotate(${dy} 18 ${60 + dy})`} />
              <Ellipse cx={102} cy={60 + dy} rx={11} ry={4} fill="#FF6FA5" stroke={INK} strokeWidth={2.5} transform={`rotate(${-dy} 102 ${60 + dy})`} />
            </G>
          ))}
        </G>
      );
    case 'dragon':
      return <G>{tri('36,42 30,12 50,36', '#FFD93D')}{tri('84,42 90,12 70,36', '#FFD93D')}{tri('8,70 22,52 26,80', dark)}{tri('112,70 98,52 94,80', dark)}</G>;
    case 'unicorn':
      return <G>{tri('52,38 60,2 68,38', '#FFD93D')}<Path d="M30 44 Q20 30 34 26 Q40 34 44 38" fill="#CDB4FF" stroke={INK} strokeWidth={3} /><Path d="M90 44 Q100 30 86 26 Q80 34 76 38" fill="#9DF2C9" stroke={INK} strokeWidth={3} /></G>;
    case 'octopus':
      return (
        <G>
          {[22, 38, 54, 70, 86, 100].map((x, i) => (
            <Ellipse key={x} cx={x} cy={100} rx={8} ry={12} fill={fill} stroke={INK} strokeWidth={3} transform={`rotate(${(i - 2.5) * 12} ${x} 100)`} />
          ))}
        </G>
      );
    default:
      return null;
  }
}

/** Belly patches and face markings drawn on the body. */
function Markings({ animal, light, dark }: Parts) {
  switch (animal) {
    case 'penguin':
      return <Ellipse cx={CX} cy={78} rx={26} ry={26} fill="#FFFFFF" />;
    case 'fox':
      return <Path d="M30 78 Q44 66 60 84 Q76 66 90 78 Q78 100 60 104 Q42 100 30 78Z" fill="#FFFFFF" />;
    case 'redpanda':
      return <G><Ellipse cx={42} cy={78} rx={10} ry={8} fill="#FFFFFF" /><Ellipse cx={78} cy={78} rx={10} ry={8} fill="#FFFFFF" /><Ellipse cx={46} cy={50} rx={6} ry={4} fill="#FFFFFF" /><Ellipse cx={74} cy={50} rx={6} ry={4} fill="#FFFFFF" /></G>;
    case 'raccoon':
      return <Path d="M26 62 Q60 50 94 62 Q92 76 76 74 Q60 66 44 74 Q28 76 26 62Z" fill={INK} />;
    case 'panda':
      return <G><Ellipse cx={46} cy={64} rx={10} ry={12} fill={INK} transform="rotate(20 46 64)" /><Ellipse cx={74} cy={64} rx={10} ry={12} fill={INK} transform="rotate(-20 74 64)" /></G>;
    case 'sloth':
      return <G><Ellipse cx={CX} cy={70} rx={30} ry={24} fill={light} /><Ellipse cx={46} cy={66} rx={10} ry={6} fill={dark} transform="rotate(25 46 66)" /><Ellipse cx={74} cy={66} rx={10} ry={6} fill={dark} transform="rotate(-25 74 66)" /></G>;
    case 'owl':
      return <G><Circle cx={46} cy={64} r={13} fill={light} /><Circle cx={74} cy={64} r={13} fill={light} /><Ellipse cx={CX} cy={92} rx={18} ry={12} fill={light} /></G>;
    case 'shark':
      return <Path d="M28 80 Q60 110 92 80 Q60 96 28 80Z" fill="#FFFFFF" />;
    case 'yeti':
      return <Ellipse cx={CX} cy={72} rx={26} ry={22} fill="#B9D7F0" />;
    default:
      return null;
  }
}

function Face({ animal, mood, dark }: Parts & { mood: Mood }) {
  const eyeY = animal === 'frog' ? 40 : 64;
  const eyeX = animal === 'frog' ? 18 : 14;
  const eyeWhite = animal === 'panda' || animal === 'raccoon' || animal === 'owl';
  const eyes =
    mood === 'happy' ? (
      <G>
        <Path d={`M${CX - eyeX - 6} ${eyeY + 2} Q${CX - eyeX} ${eyeY - 6} ${CX - eyeX + 6} ${eyeY + 2}`} stroke={eyeWhite ? '#FFF' : INK} strokeWidth={3.5} fill="none" strokeLinecap="round" />
        <Path d={`M${CX + eyeX - 6} ${eyeY + 2} Q${CX + eyeX} ${eyeY - 6} ${CX + eyeX + 6} ${eyeY + 2}`} stroke={eyeWhite ? '#FFF' : INK} strokeWidth={3.5} fill="none" strokeLinecap="round" />
      </G>
    ) : mood === 'drink' ? (
      <G>
        {[-1, 1].map((s) => (
          <G key={s}>
            <Path d={`M${CX + s * eyeX - 5} ${eyeY - 5} L${CX + s * eyeX + 5} ${eyeY + 5} M${CX + s * eyeX + 5} ${eyeY - 5} L${CX + s * eyeX - 5} ${eyeY + 5}`} stroke={eyeWhite ? '#FFF' : INK} strokeWidth={3.5} strokeLinecap="round" />
          </G>
        ))}
      </G>
    ) : (
      <G>
        {[-1, 1].map((s) => (
          <G key={s}>
            <Circle cx={CX + s * eyeX} cy={eyeY} r={eyeWhite ? 7 : 6.5} fill={eyeWhite ? '#FFFFFF' : INK} />
            <Circle cx={CX + s * eyeX} cy={eyeY} r={eyeWhite ? 4 : 0} fill={INK} />
            <Circle cx={CX + s * eyeX + 2} cy={eyeY - 2.5} r={2} fill="#FFFFFF" />
          </G>
        ))}
      </G>
    );

  const mouthY = 84;
  const mouth =
    mood === 'happy' ? (
      <Path d={`M${CX - 10} ${mouthY - 2} Q${CX} ${mouthY + 12} ${CX + 10} ${mouthY - 2} Z`} fill="#E5476A" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
    ) : mood === 'drink' ? (
      <Path d={`M${CX - 9} ${mouthY + 2} q4.5 -6 9 0 q4.5 6 9 0`} stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" />
    ) : mood === 'nervous' ? (
      <Path d={`M${CX - 8} ${mouthY + 2} L${CX + 8} ${mouthY + 2}`} stroke={INK} strokeWidth={3} strokeLinecap="round" />
    ) : (
      <Path d={`M${CX - 7} ${mouthY} Q${CX - 3.5} ${mouthY + 5} ${CX} ${mouthY} Q${CX + 3.5} ${mouthY + 5} ${CX + 7} ${mouthY}`} stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" />
    );

  return (
    <G>
      {eyes}
      {mood === 'drink' && <Ellipse cx={CX} cy={74} rx={30} ry={10} fill="#7BD389" opacity={0.45} />}
      <Snout animal={animal} dark={dark} />
      {animal !== 'duck' && animal !== 'owl' && animal !== 'penguin' && animal !== 'pig' && mouth}
      <Circle cx={CX - 26} cy={78} r={5} fill="#FF8FA3" opacity={0.6} />
      <Circle cx={CX + 26} cy={78} r={5} fill="#FF8FA3" opacity={0.6} />
    </G>
  );
}

function Snout({ animal, dark }: { animal: string; dark: string }) {
  switch (animal) {
    case 'pig':
      return <G><Ellipse cx={CX} cy={80} rx={12} ry={9} fill="#FF8FB1" stroke={INK} strokeWidth={3} /><Circle cx={CX - 4} cy={80} r={2.2} fill={INK} /><Circle cx={CX + 4} cy={80} r={2.2} fill={INK} /></G>;
    case 'duck':
    case 'penguin':
      return <Ellipse cx={CX} cy={80} rx={11} ry={6} fill="#FFA62B" stroke={INK} strokeWidth={3} />;
    case 'owl':
      return tri(`${CX - 6},74 ${CX + 6},74 ${CX},86`, '#FFA62B');
    case 'koala':
      return <Ellipse cx={CX} cy={74} rx={8} ry={10} fill={INK} />;
    case 'dog':
    case 'bear':
      return <G><Ellipse cx={CX} cy={78} rx={13} ry={9} fill={dark} opacity={0.35} /><Ellipse cx={CX} cy={74} rx={5} ry={3.5} fill={INK} /></G>;
    case 'frog':
    case 'axolotl':
    case 'shark':
    case 'octopus':
      return null;
    default:
      return <Path d={`M${CX - 4} 74 L${CX + 4} 74 L${CX} 78 Z`} fill={INK} stroke={INK} strokeWidth={2} strokeLinejoin="round" />;
  }
}

function HeadItem({ id }: { id: string }) {
  switch (id) {
    case 'cap':
      return <G><Path d="M30 44 Q60 14 90 44 Z" fill="#3B82F6" stroke={INK} strokeWidth={3} /><Rect x={76} y={40} width={26} height={7} rx={3.5} fill="#2563EB" stroke={INK} strokeWidth={3} /></G>;
    case 'beanie':
      return <G><Path d="M28 46 Q60 4 92 46 Z" fill="#EF4444" stroke={INK} strokeWidth={3} /><Rect x={26} y={40} width={68} height={10} rx={5} fill="#F87171" stroke={INK} strokeWidth={3} /><Circle cx={60} cy={14} r={7} fill="#FFFFFF" stroke={INK} strokeWidth={3} /></G>;
    case 'partyHat':
      return <G>{tri('46,40 60,2 74,40', '#A855F7')}<Circle cx={60} cy={4} r={5} fill="#FFD93D" stroke={INK} strokeWidth={2.5} /><Path d="M51 28 L69 28 M48 36 L72 36" stroke="#FFD93D" strokeWidth={3} /></G>;
    case 'cowboy':
      return <G><Ellipse cx={60} cy={40} rx={46} ry={8} fill="#A0522D" stroke={INK} strokeWidth={3} /><Path d="M38 40 Q36 14 60 16 Q84 14 82 40 Z" fill="#B8693A" stroke={INK} strokeWidth={3} /></G>;
    case 'chef':
      return <G><Rect x={40} y={26} width={40} height={16} fill="#FFFFFF" stroke={INK} strokeWidth={3} /><Circle cx={46} cy={20} r={10} fill="#FFFFFF" stroke={INK} strokeWidth={3} /><Circle cx={60} cy={14} r={11} fill="#FFFFFF" stroke={INK} strokeWidth={3} /><Circle cx={74} cy={20} r={10} fill="#FFFFFF" stroke={INK} strokeWidth={3} /></G>;
    case 'viking':
      return <G><Path d="M28 46 Q60 10 92 46 Z" fill="#9CA3AF" stroke={INK} strokeWidth={3} /><Path d="M30 40 Q14 30 18 12 Q26 28 38 32" fill="#FFF7E0" stroke={INK} strokeWidth={3} /><Path d="M90 40 Q106 30 102 12 Q94 28 82 32" fill="#FFF7E0" stroke={INK} strokeWidth={3} /></G>;
    case 'halo':
      return <Ellipse cx={60} cy={20} rx={22} ry={6} fill="none" stroke="#FFD93D" strokeWidth={5} />;
    case 'crown':
      return <G><Polygon points="38,42 38,18 50,30 60,12 70,30 82,18 82,42" fill="#FFD93D" stroke={INK} strokeWidth={3} strokeLinejoin="round" /><Circle cx={60} cy={34} r={3.5} fill="#EF4444" /></G>;
    default:
      return null;
  }
}

function FaceItem({ id }: { id: string }) {
  switch (id) {
    case 'sunglasses':
      return <G><Rect x={34} y={57} width={22} height={13} rx={5} fill={INK} /><Rect x={64} y={57} width={22} height={13} rx={5} fill={INK} /><Path d="M56 62 L64 62" stroke={INK} strokeWidth={3} /></G>;
    case 'heartGlasses':
      return (
        <G>
          {[46, 74].map((x) => (
            <Path key={x} d={`M${x} 72 L${x - 11} 61 Q${x - 11} 53 ${x - 5} 54 Q${x} 55 ${x} 60 Q${x} 55 ${x + 5} 54 Q${x + 11} 53 ${x + 11} 61 Z`} fill="#FF4D8D" stroke={INK} strokeWidth={2.5} />
          ))}
          <Path d="M57 62 L63 62" stroke={INK} strokeWidth={3} />
        </G>
      );
    case 'monocle':
      return <G><Circle cx={74} cy={64} r={10} fill="none" stroke="#D4A017" strokeWidth={3} /><Path d="M84 66 Q90 80 86 92" stroke="#D4A017" strokeWidth={2} fill="none" /></G>;
    case 'mustache':
      return <Path d="M60 78 Q52 72 42 78 Q48 84 60 80 Q72 84 78 78 Q68 72 60 78Z" fill="#4A3426" stroke={INK} strokeWidth={2} />;
    case 'clownNose':
      return <Circle cx={60} cy={75} r={7} fill="#FF3B3B" stroke={INK} strokeWidth={2.5} />;
    default:
      return null;
  }
}

function Outfit({ id }: { id: string }) {
  // Outfits sit on the lower part of the body.
  const bottom = 'M24 88 Q60 112 96 88 Q92 104 60 106 Q28 104 24 88Z';
  switch (id) {
    case 'hoodie':
      return <G><Path d={bottom} fill="#6B7280" stroke={INK} strokeWidth={3} /><Path d="M54 92 L54 102 M66 92 L66 102" stroke="#FFFFFF" strokeWidth={2.5} /></G>;
    case 'tux':
      return <G><Path d={bottom} fill="#1F2937" stroke={INK} strokeWidth={3} /><Polygon points="52,90 60,95 52,100" fill="#EF4444" stroke={INK} strokeWidth={2} /><Polygon points="68,90 60,95 68,100" fill="#EF4444" stroke={INK} strokeWidth={2} /></G>;
    case 'hawaiian':
      return <G><Path d={bottom} fill="#FF7A59" stroke={INK} strokeWidth={3} /><Circle cx={42} cy={98} r={3.5} fill="#FFD93D" /><Circle cx={60} cy={102} r={3.5} fill="#FFFFFF" /><Circle cx={78} cy={98} r={3.5} fill="#FFD93D" /></G>;
    case 'jersey':
      return <G><Path d={bottom} fill="#2563EB" stroke={INK} strokeWidth={3} /><Rect x={55} y={92} width={10} height={10} fill="#FFFFFF" rx={2} /></G>;
    case 'pajamas':
      return <G><Path d={bottom} fill="#93C5FD" stroke={INK} strokeWidth={3} /><Path d="M36 96 L84 96" stroke="#FFFFFF" strokeWidth={2.5} strokeDasharray="4 4" /></G>;
    case 'leather':
      return <G><Path d={bottom} fill="#3B2F2F" stroke={INK} strokeWidth={3} /><Path d="M60 92 L60 106" stroke="#C0C0C0" strokeWidth={2} /></G>;
    case 'cape':
      return <Path d="M36 84 Q60 94 84 84" stroke="#E53950" strokeWidth={5} fill="none" />;
    default:
      return null;
  }
}

function HandItem({ id }: { id: string }) {
  switch (id) {
    case 'trophy':
      return <G><Path d="M94 74 L112 74 L110 88 Q103 94 96 88 Z" fill="#FFD93D" stroke={INK} strokeWidth={2.5} /><Rect x={99} y={92} width={8} height={8} fill="#FFD93D" stroke={INK} strokeWidth={2.5} /></G>;
    case 'foamFinger':
      return <G><Rect x={96} y={70} width={14} height={24} rx={5} fill="#3B82F6" stroke={INK} strokeWidth={2.5} /><Rect x={100} y={52} width={6} height={20} rx={3} fill="#3B82F6" stroke={INK} strokeWidth={2.5} /></G>;
    case 'mic':
      return <G><Rect x={100} y={80} width={6} height={20} rx={2} fill="#374151" stroke={INK} strokeWidth={2} /><Circle cx={103} cy={76} r={7} fill="#9CA3AF" stroke={INK} strokeWidth={2.5} /></G>;
    case 'pizza':
      return <G>{tri('92,74 114,70 104,98', '#FFC857')}<Circle cx={102} cy={78} r={2.5} fill="#E53950" /><Circle cx={106} cy={86} r={2.5} fill="#E53950" /></G>;
    default:
      return null;
  }
}
