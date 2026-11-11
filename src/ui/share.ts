import * as Clipboard from 'expo-clipboard';
import { Platform, Share } from 'react-native';

/**
 * Opens the phone's share sheet (Messages, WhatsApp…); where there is none (desktop
 * browsers), copies to the clipboard instead. Returns what happened so the button can
 * say so ("Copied!").
 */
export async function shareOrCopy(message: string, url?: string): Promise<'shared' | 'copied' | 'cancelled'> {
  const full = url ? `${message} ${url}` : message;
  try {
    if (Platform.OS === 'web') {
      const nav = (globalThis as { navigator?: { share?: (d: object) => Promise<void> } }).navigator;
      if (nav?.share) {
        await nav.share(url ? { text: message, url } : { text: message });
        return 'shared';
      }
    } else {
      const r = await Share.share(Platform.OS === 'ios' && url ? { message, url } : { message: full });
      return r.action === Share.dismissedAction ? 'cancelled' : 'shared';
    }
  } catch {
    // Share sheet closed or unavailable: fall back to copying.
  }
  await Clipboard.setStringAsync(full);
  return 'copied';
}
