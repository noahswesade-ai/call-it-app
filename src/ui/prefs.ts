import * as RealHaptics from 'expo-haptics';

/**
 * This phone's sound / vibration preferences (set on the profile screen). Kept as a
 * plain module so the sound and haptics helpers can check them without React.
 */
export const prefs = { sound: true, haptics: true };

/** expo-haptics, but silent when the player has turned vibration off. */
export const Haptics = {
  ImpactFeedbackStyle: RealHaptics.ImpactFeedbackStyle,
  NotificationFeedbackType: RealHaptics.NotificationFeedbackType,
  impactAsync: (style?: RealHaptics.ImpactFeedbackStyle) =>
    prefs.haptics ? RealHaptics.impactAsync(style) : Promise.resolve(),
  notificationAsync: (type?: RealHaptics.NotificationFeedbackType) =>
    prefs.haptics ? RealHaptics.notificationAsync(type) : Promise.resolve(),
  selectionAsync: () => (prefs.haptics ? RealHaptics.selectionAsync() : Promise.resolve()),
};
