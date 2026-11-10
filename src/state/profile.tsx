import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ANIMAL_BY_ID, FREE_ITEMS, randomStarterAvatar, sanitizeLoadout } from '@/avatar/catalog';
import { randomId } from '@/game/rng';
import type { AvatarLoadout } from '@/game/types';

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
}

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

function newProfile(): Profile {
  const avatar = randomStarterAvatar();
  const animal = ANIMAL_BY_ID[avatar.animal]?.name ?? 'Player';
  return {
    id: randomId(),
    // A fun starter name; players rename themselves in the lobby.
    name: `${animal} ${10 + Math.floor(Math.random() * 90)}`,
    namedByUser: false,
    avatar,
    tokens: 50, // a small welcome gift — coins should feel rare
    owned: [...FREE_ITEMS],
    premium: false,
    partyTrialUsed: false,
    ageConfirmed: false,
    seenIntro: false,
    starterPackBought: false,
    adDay: '',
    adCount: 0,
    gamesPlayed: 0,
    gamesWon: 0,
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

  const update = useCallback((patch: Partial<Profile>) => setProfile((p) => ({ ...p, ...patch })), []);
  const owns = useCallback((key: string) => profile.owned.includes(key), [profile.owned]);

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

  const api = useMemo(
    () => ({ profile, loaded, update, owns, buy, addTokens, recordGame }),
    [profile, loaded, update, owns, buy, addTokens, recordGame],
  );
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useProfile(): ProfileApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useProfile must be used inside ProfileProvider');
  return ctx;
}
