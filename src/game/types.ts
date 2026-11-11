// Core game types. Everything in src/game is pure TypeScript (no React, no network)
// so it can be unit-tested and run identically on every phone.

export type Rng = () => number; // returns [0, 1), like Math.random

export type Mode = 'classic' | 'party';

export type Category =
  | 'geography'
  | 'history'
  | 'basic'
  | 'popculture'
  | 'sports'
  | 'physical'
  | 'minigame'
  | 'kyf' // Know Your Friends
  | 'party'
  | 'spicy';

export type WheelSlice = Category | 'random';

export type Difficulty = 'E' | 'M' | 'H';

export type QuestionType =
  | 'SPOKEN_EXACT'
  | 'SPOKEN_CLOSEST'
  | 'TURN_BASED'
  | 'HOST_JUDGED'
  | 'SUBJECT_JUDGED'
  | 'MINIGAME';

export interface Question {
  id: string;
  category: Category;
  type: QuestionType;
  difficulty: Difficulty;
  prompt: string; // may contain {S} for the Know Your Friends subject
  answer?: string; // shown behind the host's "Reveal answer" button
  numericAnswer?: number; // for SPOKEN_CLOSEST
  image?: string; // picture-question key, see src/content/pictures
  minigame?: MinigameId;
  closest?: boolean; // KYF questions answered with a number
  /** Room games (Truth or Dare, Hot Seat…): different every time, so they may repeat. */
  repeatable?: boolean;
  /** Written by players in this lobby. */
  custom?: boolean;
}

export type MinigameId =
  | 'reaction'
  | 'tapFrenzy'
  | 'stopClock'
  | 'colorClash'
  | 'quickMath'
  | 'memory';

export interface AvatarLoadout {
  animal: string;
  head?: string;
  eyes?: string;
  /** Mouth & nose items (mustache, beard, nose ring). */
  mouth?: string;
  neck?: string;
  ears?: string;
}

export interface Player {
  id: string;
  name: string;
  avatar: AvatarLoadout;
  isHost: boolean;
  /** false only for a host who chose "I'm just hosting". */
  playing: boolean;
  premium: boolean;
  joinOrder: number;
  connected: boolean;
}

export type Pick = 'A' | 'B' | 'NONE';
export type Outcome = 'A' | 'B' | 'DRAW';

export interface GameSettings {
  mode: Mode;
  spicy: boolean;
  rounds: number;
  /** Sips the losing challenger drinks (Party mode), 1–3. */
  /** Categories that can appear on the wheel. */
  categories: Category[];
  /** Premium: the wheel only uses the lobby's own questions (needs CUSTOM_ONLY_MIN per category). */
  onlyCustom?: boolean;
  /** How long betting stays open, in seconds (host setting; longer helps slower or busier rooms). */
  betSeconds?: number;
}
