/**
 * Whether to show the "how to play" intro.
 *
 * Real players see it only the very first time they open the app. While
 * developing (the preview link, Expo Go dev builds), it shows once every time
 * the app is loaded so the screen can be tweaked; release builds never do this.
 */
let shownThisLoad = false;

export function shouldShowIntro(seenIntro: boolean): boolean {
  if (!seenIntro) return true;
  return __DEV__ && !shownThisLoad;
}

export function markIntroShown() {
  shownThisLoad = true;
}
