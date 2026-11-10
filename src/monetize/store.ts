/**
 * Purchases and ads (PLAN.md §6–7).
 *
 * PLACEHOLDER: RevenueCat and AdMob need native modules (a development build,
 * not Expo Go) and real account keys. Until those exist, every function here
 * simulates success so the whole app can be played and tested. When the owner
 * has created the accounts, replace the bodies below with the real SDK calls;
 * the rest of the app only talks to this file.
 */

export const STORE_IS_PLACEHOLDER = true;

export const PREMIUM_PRICE = '$4.99';

/**
 * Coin packs (see PRICING.md). Base rate $0.99 = 500 coins; bigger packs add a
 * growing bonus so the $9.99 "Most popular" and $49.99 "Best value" anchors pull
 * buyers up the ladder.
 */
export const TOKEN_PACKS = [
  { id: 'coins_500', tokens: 500, price: '$0.99', bonus: 0, tag: undefined },
  { id: 'coins_2750', tokens: 2750, price: '$4.99', bonus: 10, tag: undefined },
  { id: 'coins_6000', tokens: 6000, price: '$9.99', bonus: 20, tag: 'MOST POPULAR' },
  { id: 'coins_13000', tokens: 13000, price: '$19.99', bonus: 30, tag: undefined },
  { id: 'coins_35000', tokens: 35000, price: '$49.99', bonus: 40, tag: 'BEST VALUE' },
] as const;

/** One-time starter pack: ~4× the value of the base pack. Offered after a player's 3rd game, for 72 hours. */
export const STARTER_PACK = {
  id: 'starter_pack',
  price: '$1.99',
  tokens: 2000,
  accessory: 'starglasses',
  offerAfterGames: 3,
  offerHours: 72,
} as const;

/** Coins per rewarded video, and the daily cap (so ads don't replace buying). */
export const AD_REWARD = 25;
export const AD_DAILY_CAP = 6;

export async function purchasePremium(): Promise<boolean> {
  // TODO(RevenueCat): Purchases.purchasePackage(offerings.current.lifetime)
  return true;
}

export async function restorePurchases(): Promise<boolean> {
  // TODO(RevenueCat): Purchases.restorePurchases() → check the "premium" entitlement
  return false;
}

export async function purchaseTokenPack(_id: string): Promise<boolean> {
  // TODO(RevenueCat): consumable product purchase, then credit tokens server-side
  return true;
}

export async function showRewardedAd(): Promise<boolean> {
  // TODO(AdMob): RewardedAd.load() / show(); resolve true on EARNED_REWARD
  return true;
}

/**
 * End-of-game interstitial (skippable after 5s). Ads are per person: they are
 * shown to every non-Premium player, even in a Premium host's room.
 */
export async function showEndOfGameAd(isPremium: boolean): Promise<void> {
  if (isPremium) return;
  // TODO(AdMob): InterstitialAd.load() / show()
}
