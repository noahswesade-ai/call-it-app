import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { prefs } from './prefs';

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
  if (!p || !prefs.sound) return;
  try {
    p.volume = volume;
    void p.seekTo(0).then(() => p.play()).catch(() => p.play());
  } catch {
    // Sound is a nice-to-have; never let it break the game.
  }
}

/** One wheel-peg click. Rate-limited so a very fast spin doesn't turn into noise. */
export function playTick(volume = 0.35) {
  init();
  const now = Date.now();
  if (now - lastTick < 30) return;
  lastTick = now;
  replay(tickPool[tickIndex++ % Math.max(1, tickPool.length)], volume);
}

export function playDing() {
  init();
  replay(ding, 0.45);
}

const SFX = {
  whoosh: require('../../assets/sounds/whoosh.wav'),
  land: require('../../assets/sounds/land.wav'),
  fanfare: require('../../assets/sounds/fanfare.wav'),
  underdog: require('../../assets/sounds/underdog.wav'),
  coin: require('../../assets/sounds/coin.wav'),
  lose: require('../../assets/sounds/lose.wav'),
  reveal: require('../../assets/sounds/reveal.wav'),
  podium: require('../../assets/sounds/podium.wav'),
  pop: require('../../assets/sounds/pop.wav'),
  drumroll: require('../../assets/sounds/drumroll.wav'),
  riser: require('../../assets/sounds/riser.wav'),
  jackpot: require('../../assets/sounds/jackpot.wav'),
} as const;
export type Sfx = keyof typeof SFX;
const sfxPlayers: Partial<Record<Sfx, AudioPlayer>> = {};
// Quiet by design: background accents for a loud room, never the main event.
const sfxVolume: Record<Sfx, number> = {
  whoosh: 0.35,
  land: 0.45,
  fanfare: 0.45,
  underdog: 0.5,
  coin: 0.35,
  lose: 0.4,
  reveal: 0.4,
  podium: 0.5,
  pop: 0.35,
  drumroll: 0.35,
  riser: 0.4,
  jackpot: 0.5,
};

/** One-shot game sound (winner fanfare, Underdog stinger, podium…). */
export function playSfx(name: Sfx) {
  init();
  try {
    if (!sfxPlayers[name]) sfxPlayers[name] = createAudioPlayer(SFX[name]);
    replay(sfxPlayers[name], sfxVolume[name]);
  } catch {
    // ignore
  }
}

/** Call early (e.g. on game start) so the first tick isn't delayed by loading. */
export function preloadSounds() {
  init();
  for (const k of Object.keys(SFX) as Sfx[]) {
    try {
      if (!sfxPlayers[k]) sfxPlayers[k] = createAudioPlayer(SFX[k]);
    } catch {
      // ignore
    }
  }
}
