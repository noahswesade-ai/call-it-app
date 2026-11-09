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

export const TOKEN_PACKS = [
  { id: 'tokens_500', tokens: 500, price: '$0.99' },
  { id: 'tokens_1500', tokens: 1500, price: '$2.99' },
  { id: 'tokens_4000', tokens: 4000, price: '$6.99' },
  { id: 'tokens_10000', tokens: 10000, price: '$14.99' },
] as const;

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
