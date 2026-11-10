import { Platform, useWindowDimensions } from 'react-native';

/** Inner size of the phone frame used by the web preview (see app/_layout.tsx). */
export const PHONE_FRAME = { width: 370, height: 824 };

/**
 * Screen size for layout/effects. On the web preview inside the phone frame this is
 * the frame's size, not the desktop window's; on real phones it's the window.
 */
export function useScreenSize(): { width: number; height: number } {
  const d = useWindowDimensions();
  if (Platform.OS === 'web' && d.width > 430) return { width: PHONE_FRAME.width, height: Math.min(PHONE_FRAME.height, d.height - 60) };
  return d;
}
