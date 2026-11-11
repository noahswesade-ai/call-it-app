"""Synthesizes the game's sound effects (original, no licensing) into assets/sounds/.
Run with a Python that has numpy:  python tools/make_sounds.py"""
import wave, numpy as np, os
SR = 22050
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'sounds')

def env(n, a=0.005, r=0.2):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / max(r, 1e-4))
    return e

def tone(f, dur, kind='sine', a=0.005, r=0.25, vib=0):
    n = int(SR * dur); t = np.arange(n) / SR
    ph = 2 * np.pi * f * t + (vib * np.sin(2 * np.pi * 6 * t) if vib else 0)
    if kind == 'square': w = np.sign(np.sin(ph)) * 0.5
    elif kind == 'saw': w = 2 * ((f * t) % 1) - 1
    elif kind == 'tri': w = 2 * np.abs(2 * ((f * t) % 1) - 1) - 1
    else: w = np.sin(ph)
    return w * env(n, a, r)

def brass(f, dur, r=0.4):
    return 0.6 * tone(f, dur, 'saw', 0.02, r) + 0.4 * tone(f * 2, dur, 'sine', 0.02, r * 0.6) + 0.3 * tone(f / 2, dur, 'sine', 0.02, r)

def place(buf, snd, at):
    i = int(at * SR); end = min(len(buf), i + len(snd)); buf[i:end] += snd[: end - i]

def save(name, x, gain=0.85):
    x = x / (np.max(np.abs(x)) + 1e-9) * gain
    data = (x * 32767).astype(np.int16)
    with wave.open(os.path.join(OUT, name), 'w') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(data.tobytes())

rng = np.random.default_rng(3)
def noise(dur): return rng.uniform(-1, 1, int(SR * dur))

# whoosh: filtered noise sweeping up then down (wheel launch)
n = noise(0.7); t = np.linspace(0, 1, len(n))
lp = np.convolve(n, np.ones(12) / 12, 'same')
save('whoosh.wav', lp * np.sin(np.pi * t) ** 2 * (0.6 + 0.4 * np.sin(2 * np.pi * 3 * t)), 0.6)

# land: bright two-note chime
b = np.zeros(int(SR * 0.8)); place(b, tone(880, 0.6, 'tri', r=0.3), 0); place(b, tone(1318.5, 0.7, 'tri', r=0.35), 0.09)
save('land.wav', b, 0.7)

# fanfare (round winner): ta-ta-ta-taaa
b = np.zeros(int(SR * 1.5))
for i, (f, at, d) in enumerate([(523.25, 0, .14), (659.25, .14, .14), (783.99, .28, .14), (1046.5, .44, .9)]):
    place(b, brass(f, d, .25 if d < .5 else .5), at)
place(b, brass(659.25, .9, .5) * .6, .44); place(b, brass(783.99, .9, .5) * .6, .44)
save('fanfare.wav', b)

# underdog stinger: low hit + rising siren + sparkle
b = np.zeros(int(SR * 1.6))
place(b, tone(55, 0.9, 'sine', 0.002, 0.35) * 1.4 + noise(0.9) * env(int(SR * .9), .001, .05) * .6, 0)
tt = np.arange(int(SR * 1.0)) / SR
siren = np.sin(2 * np.pi * np.cumsum(300 + 500 * tt / tt[-1]) / SR) * env(len(tt), .05, .6)
place(b, siren * .5, .15)
for k, f in enumerate([1568, 2093, 2637]): place(b, tone(f, .3, 'sine', r=.15) * .4, .55 + k * .09)
save('underdog.wav', b)

# coin: classic two-step pickup
b = np.zeros(int(SR * .45)); place(b, tone(987.8, .08, 'square', r=.06), 0); place(b, tone(1318.5, .35, 'square', r=.15), .07)
save('coin.wav', b, .5)

# lose: sad descending trombone
b = np.zeros(int(SR * 1.6))
for k, f in enumerate([392, 370, 349.2]): place(b, brass(f, .35, .3), k * .32)
place(b, brass(329.6, .8, .6) * (1 + 0 * np.arange(int(SR * .8))), .96)
save('lose.wav', b, .6)

# reveal: quick sparkly flip
b = np.zeros(int(SR * .5))
for k, f in enumerate([1046.5, 1318.5, 1568, 2093]): place(b, tone(f, .25, 'tri', r=.12) * .6, k * .045)
save('reveal.wav', b, .55)

# podium: longer triumphant fanfare with drum roll
b = np.zeros(int(SR * 3.2))
roll = noise(1.2) * (0.3 + 0.7 * (np.arange(int(SR * 1.2)) % int(SR * .045) < SR * .012)) * np.linspace(.3, 1, int(SR * 1.2))
place(b, np.convolve(roll, np.ones(4) / 4, 'same') * .5, 0)
for f, at, d in [(392, 1.2, .18), (523.25, 1.38, .18), (659.25, 1.56, .18), (783.99, 1.74, 1.3)]:
    place(b, brass(f, d, .25 if d < .5 else .8), at)
for f in (523.25, 659.25, 1046.5): place(b, brass(f, 1.3, .8) * .5, 1.74)
place(b, tone(60, .6, 'sine', .002, .3) * 1.2, 1.74)
save('podium.wav', b)

# pop: player joins / UI pop
b = np.zeros(int(SR * .15)); place(b, tone(600, .12, 'sine', .001, .04), 0); place(b, tone(1200, .1, 'sine', .001, .03) * .5, 0)
save('pop.wav', b, .5)

# drumroll for the bets reveal
d = noise(1.4) * (0.4 + 0.6 * (np.arange(int(SR * 1.4)) % int(SR * .05) < SR * .015)) * np.linspace(.2, 1, int(SR * 1.4))
d = np.convolve(d, np.ones(5) / 5, 'same')
b = np.zeros(int(SR * 1.8)); place(b, d * .7, 0); place(b, tone(70, .5, 'sine', .002, .25) * 1.4 + noise(.5) * env(int(SR * .5), .001, .04) * .5, 1.35)
save('drumroll.wav', b, .7)
print('ok')
