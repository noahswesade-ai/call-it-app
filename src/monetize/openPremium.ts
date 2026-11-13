import { router } from 'expo-router';

/** Why the Premium screen was opened: it leads with the matching benefit. */
export type PremiumReason = 'party' | 'spicy' | 'players' | 'custom' | 'avatar' | 'categories' | 'rounds' | 'general';

export function openPremium(reason: PremiumReason = 'general') {
  router.push({ pathname: '/paywall', params: { reason } });
}
