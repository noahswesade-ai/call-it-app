import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ACCESSORY_BY_ID, ANIMAL_BY_ID, FREE_ITEMS, randomStarterAvatar, sanitizeLoadout } from '@/avatar/catalog';
import { randomId } from '@/game/rng';
import { prefs } from '@/ui/prefs';
import type { AvatarLoadout, Question } from '@/game/types';

/**
 * The player's own profile, saved on the device (PLAN.md: "play instantly").
 * Tokens and purchases live here until Supabase accounts are connected; then the
 * server `token_ledger` becomes the source of truth so tokens can't be faked.
 */

export interface Profile {
  id: string;
  name: string;
  /** False until the player picks their own name (the lobby nudges them). */
  namedByUser: boolean;
  avatar: AvatarLoadout;
  tokens: number;
  owned: string[];
  premium: boolean;
  partyTrialUsed: boolean;
  ageConfirmed: boolean;
  /** True once the first-launch "how to play" screen has been closed. */
  seenIntro: boolean;
  starterPackBought: boolean;
  /** When the starter-pack offer first appeared (ms), for its 72-hour window. */
  starterOfferAt?: number;
  /** Rewarded videos watched today (resets daily). */
  adDay: string;
  adCount: number;
  gamesPlayed: number;
  gamesWon: number;
  /**
   * "My questions": every question this player has added to any lobby, so they can
   * reuse them in new lobbies. Saved on the phone for now; moves to the player's
   * account once sign-in (Supabase) is connected.
   */
  myQuestions: Question[];
  /** Sound effects and vibration on this phone. */
  soundOn: boolean;
  hapticsOn: boolean;
  /** When this phone last asked for an App Store / Play rating (ms). */
  reviewAskedAt?: number;
  /** Birth year from the neutral age check (Party / Spicy). */
  birthYear?: number;
}

/** The most questions kept in "My questions". */
export const MY_QUESTIONS_MAX = 1000;

const samePrompt = (a: string, b: string) => a.trim().toLowerCase().replace(/\s+/g, ' ') === b.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * On the web, `?as=<name>` gives a browser tab its own profile so several tabs can
 * play together on one computer while testing. Phones are unaffected.
 */
function storageKey(): string {
  const search = (globalThis as { location?: { search?: string } }).location?.search ?? '';
  const as = new URLSearchParams(search).get('as');
  return as ? `callit.profile.v1:${as}` : 'callit.profile.v1';
}

const KEY = storageKey();

/**
 * Play-test builds (EXPO_PUBLIC_PLAYTEST=1): everyone starts with Premium and a stack
 * of coins, and the home screen has a "TEST: Premium" switch to compare the free and
 * Premium versions. Never set this for a store release (remove the switch too).
 */
export const PLAYTEST = process.env.EXPO_PUBLIC_PLAYTEST === '1';
const PLAYTEST_COINS = 5000;

function newProfile(): Profile {
  const avatar = randomStarterAvatar();
  const animal = ANIMAL_BY_ID[avatar.animal]?.name ?? 'Player';
  return {
    id: randomId(),
    // A fun starter name; players rename themselves in the lobby.
    name: `${animal} ${10 + Math.floor(Math.random() * 90)}`,
    namedByUser: false,
    avatar,
    tokens: PLAYTEST ? PLAYTEST_COINS : 50, // a small welcome gift — coins should feel rare
    owned: [...FREE_ITEMS],
    premium: PLAYTEST,
    partyTrialUsed: false,
    ageConfirmed: false,
    seenIntro: false,
    starterPackBought: false,
    adDay: '',
    adCount: 0,
    gamesPlayed: 0,
    gamesWon: 0,
    myQuestions: [],
    soundOn: true,
    hapticsOn: true,
  };
}

/**
 * Coins for one finished game. Kept deliberately scarce so unlocks feel earned:
 * a Common animal (400) takes roughly 15–25 games for a free player.
 * Premium earns double.
 */
export function tokensForGame(rank: number, correctBets: number, premium: boolean): number {
  const place = rank === 1 ? 25 : rank === 2 ? 15 : rank === 3 ? 10 : 5;
  return (place + correctBets) * (premium ? 2 : 1);
}

interface ProfileApi {
  profile: Profile;
  loaded: boolean;
  update: (patch: Partial<Profile>) => void;
  owns: (key: string) => boolean;
  /** Spends tokens on an item. Returns false if the player can't afford it. */
  buy: (key: string, price: number) => boolean;
  addTokens: (n: number) => void;
  recordGame: (won: boolean, tokens: number) => void;
  /** Saves questions to "My questions" (skips ones already there). */
  saveQuestions: (qs: Question[]) => void;
  removeQuestion: (id: string) => void;
}

const Ctx = createContext<ProfileApi | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile>(newProfile);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw) as Partial<Profile>;
        // Profiles from before starter names: a saved name was chosen by the player.
        const merged = { ...newProfile(), namedByUser: !!saved.name, ...saved };
        // Older versions had different animals, colors and accessory slots.
        merged.avatar = sanitizeLoadout(merged.avatar as never);
        merged.owned = Array.from(new Set([...FREE_ITEMS, ...(merged.owned ?? []).filter((k) => !k.startsWith('color:'))]));
        setProfile(merged);
      })
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (loaded) void AsyncStorage.setItem(KEY, JSON.stringify(profile));
  }, [profile, loaded]);

  useEffect(() => {
    prefs.sound = profile.soundOn !== false;
    prefs.haptics = profile.hapticsOn !== false;
  }, [profile.soundOn, profile.hapticsOn]);

  const update = useCallback((patch: Partial<Profile>) => setProfile((p) => ({ ...p, ...patch })), []);
  const owns = useCallback(
    (key: string) => {
      // Premium-only items (the Royal Crown) come with Premium and can't be bought.
      if (key.startsWith('accessory:') && ACCESSORY_BY_ID[key.slice(10)]?.premiumOnly) return profile.premium;
      return profile.owned.includes(key);
    },
    [profile.owned, profile.premium],
  );

  const buy = useCallback(
    (key: string, price: number) => {
      if (profile.owned.includes(key) || profile.tokens < price) return false;
      setProfile((p) => {
        const owned = [...p.owned, key];
        return { ...p, tokens: p.tokens - price, owned };
      });
      return true;
    },
    [profile.owned, profile.tokens],
  );

  const addTokens = useCallback((n: number) => setProfile((p) => ({ ...p, tokens: p.tokens + n })), []);

  const recordGame = useCallback(
    (won: boolean, tokens: number) =>
      setProfile((p) => ({
        ...p,
        tokens: p.tokens + tokens,
        gamesPlayed: p.gamesPlayed + 1,
        gamesWon: p.gamesWon + (won ? 1 : 0),
      })),
    [],
  );

  const saveQuestions = useCallback(
    (qs: Question[]) =>
      setProfile((p) => {
        const mine = [...(p.myQuestions ?? [])];
        for (const q of qs) {
          if (!q.prompt?.trim() || mine.some((m) => samePrompt(m.prompt, q.prompt))) continue;
          mine.unshift({ ...q, custom: true });
        }
        return mine.length === (p.myQuestions ?? []).length ? p : { ...p, myQuestions: mine.slice(0, MY_QUESTIONS_MAX) };
      }),
    [],
  );
  const removeQuestion = useCallback(
    (id: string) => setProfile((p) => ({ ...p, myQuestions: (p.myQuestions ?? []).filter((q) => q.id !== id) })),
    [],
  );

  const api = useMemo(
    () => ({ profile, loaded, update, owns, buy, addTokens, recordGame, saveQuestions, removeQuestion }),
    [profile, loaded, update, owns, buy, addTokens, recordGame, saveQuestions, removeQuestion],
  );
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useProfile(): ProfileApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useProfile must be used inside ProfileProvider');
  return ctx;
}
