import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

/**
 * Tiny sound-effects helper. The wheel's tick fires many times a second while
 * spinning fast, so a small pool of players is rotated to let clicks overlap.
 */

const TICK = require('../../assets/sounds/tick.wav');
const DING = require('../../assets/sounds/ding.wav');

let ready = false;
let tickPool: AudioPlayer[] = [];
let tickIndex = 0;
let ding: AudioPlayer | undefined;
let lastTick = 0;

function init() {
  if (ready) return;
  ready = true;
  // Play sound effects even when the phone's silent switch is on (party game!).
  setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  try {
    tickPool = Array.from({ length: 4 }, () => createAudioPlayer(TICK));
    ding = createAudioPlayer(DING);
  } catch {
    tickPool = [];
  }
}

function replay(p: AudioPlayer | undefined, volume = 1) {
  if (!p) return;
  try {
    p.volume = volume;
    void p.seekTo(0).then(() => p.play()).catch(() => p.play());
  } catch {
    // Sound is a nice-to-have; never let it break the game.
  }
}

/** One wheel-peg click. Rate-limited so a very fast spin doesn't turn into noise. */
export function playTick(volume = 0.7) {
  init();
  const now = Date.now();
  if (now - lastTick < 30) return;
  lastTick = now;
  replay(tickPool[tickIndex++ % Math.max(1, tickPool.length)], volume);
}

export function playDing() {
  init();
  replay(ding, 0.8);
}

/** Call early (e.g. on game start) so the first tick isn't delayed by loading. */
export function preloadSounds() {
  init();
}
