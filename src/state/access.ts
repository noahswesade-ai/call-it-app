/**
 * TEMPORARY testing switch: in development builds (the preview link, Expo Go) Party
 * mode is unlocked for everyone so it can be play-tested without buying Premium.
 * Release builds always use the real rules (Premium, or one free trial game).
 */
export const DEV_UNLOCK_PARTY = __DEV__;

export function canHostParty(p: { premium: boolean; partyTrialUsed: boolean }): boolean {
  return DEV_UNLOCK_PARTY || p.premium || !p.partyTrialUsed;
}
