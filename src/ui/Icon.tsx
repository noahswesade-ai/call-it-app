import React from 'react';
import { Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import {
  Award, Ban, Beer, BookOpen, ChartColumn, Check, CircleCheck, CircleX, Coins, Crown, Dices, Dog, Drum, Ear, Eye, EyeOff,
  FerrisWheel, Flag, FlaskConical, Flame, Gem, Gift, GlassWater, Hand, Handshake, Hash, House, Lightbulb, Lock, LockOpen,
  Medal, Megaphone, Mic, Palette, PartyPopper, Pause, Pencil, PenLine, Pointer, RefreshCw, Repeat, Scale, Settings, Share2,
  Smartphone, Sparkles, Speech, Star, Swords, Sword, Target, Timer, Tornado, Trash2, Trophy, Users, Vibrate, Volume2, Wine,
  X, Zap, ArrowUp, Plus, QrCode, ChevronRight,
} from 'lucide-react-native';
import { colors } from './theme';

/**
 * The app's one icon set: minimal line icons (Lucide, open source) in place of emoji, so
 * every symbol shares the same stroke, weight and colour palette. The only emoji kept are
 * the chili for Spicy mode and the wheel's own category artwork.
 */
const ICONS = {
  home: House, crown: Crown, lock: Lock, unlock: LockOpen, beer: Beer, sips: Beer, write: PenLine, edit: Pencil,
  trophy: Trophy, dog: Dog, flame: Flame, mic: Mic, gem: Gem, settings: Settings, sound: Volume2, vibrate: Vibrate,
  book: BookOpen, trash: Trash2, palette: Palette, timer: Timer, zap: Zap, star: Star, repeat: Repeat, eye: Eye,
  hidden: EyeOff, handshake: Handshake, phone: Smartphone, target: Target, dice: Dices, medal: Medal, chart: ChartColumn,
  ear: Ear, scale: Scale, refresh: RefreshCw, flag: Flag, idea: Lightbulb, megaphone: Megaphone, gift: Gift, pause: Pause,
  users: Users, ban: Ban, coins: Coins, swords: Swords, sword: Sword, tap: Pointer, close: X, check: Check, yes: CircleCheck,
  no: CircleX, shot: GlassWater, wine: Wine, number: Hash, drum: Drum, sparkles: Sparkles, up: ArrowUp, test: FlaskConical,
  award: Award, hand: Hand, party: PartyPopper, share: Share2, speak: Speech, chaos: Tornado, wheel: FerrisWheel, plus: Plus, qr: QrCode, next: ChevronRight,
} as const;

export type IconName = keyof typeof ICONS | 'devil' | 'shush' | 'dot';

export function Icon({
  name,
  size = 18,
  color = colors.white,
  strokeWidth = 2.2,
  fill,
  style,
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  fill?: string;
  style?: StyleProp<ViewStyle>;
}) {
  if (name === 'devil') return <DevilIcon size={size} color={color} />;
  if (name === 'dot') return <View style={[{ width: size * 0.55, height: size * 0.55, borderRadius: size, backgroundColor: color }, style]} />;
  if (name === 'shush') return <Icon name="hand" size={size} color={color} strokeWidth={strokeWidth} style={style} />;
  const C = ICONS[name];
  return (
    <View style={style}>
      <C size={size} color={color} strokeWidth={strokeWidth} fill={fill ?? 'none'} />
    </View>
  );
}

/** A small, friendly line-drawn devil face (Spicy mode background). */
function DevilIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 6 L4 2 L8.5 4.6" />
      <Path d="M19 6 L20 2 L15.5 4.6" />
      <Circle cx={12} cy={13} r={8} />
      <Path d="M8.5 11.5 l2 1" />
      <Path d="M15.5 11.5 l-2 1" />
      <Path d="M8.5 16 q3.5 3 7 0" />
    </Svg>
  );
}

/** An icon followed by text on one line (replaces "🎙️ Host: Sam" style labels). */
export function IconLabel({
  icon,
  children,
  color = colors.white,
  size,
  style,
  textStyle,
  gap = 6,
  numberOfLines,
}: {
  icon: IconName;
  children: React.ReactNode;
  color?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  gap?: number;
  numberOfLines?: number;
}) {
  const fs = (Array.isArray(textStyle) ? Object.assign({}, ...textStyle.flat()) : (textStyle as TextStyle))?.fontSize ?? 15;
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>
      <Icon name={icon} size={size ?? Math.round(fs * 1.05)} color={(Array.isArray(textStyle) ? Object.assign({}, ...textStyle.flat()) : (textStyle as TextStyle))?.color as string ?? color} />
      <Text style={[{ color }, textStyle, { flexShrink: 1 }]} numberOfLines={numberOfLines}>
        {children}
      </Text>
    </View>
  );
}
