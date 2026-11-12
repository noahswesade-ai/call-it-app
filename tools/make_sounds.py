"""Synthesizes the game's sound effects (original, no licensing) into assets/sounds/.
Run with a Python that has numpy:  python tools/make_sounds.py

v2 sound design: quiet, short and soft. Mallet / bell tones (sine plus a fast-fading
overtone), gentle low-pass, no brass, sirens or square waves. Every file peaks well
below full scale, and sound.ts plays them at low volume on top of that.
"""
import wave, numpy as np, os
SR = 22050
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'sounds')
rng = np.random.default_rng(3)

def t_(dur): return np.arange(int(SR * dur)) / SR

def env(n, a=0.004, r=0.2):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / max(r, 1e-4))

def mallet(f, dur=0.6, r=0.18):
    """Soft marimba-ish note: fundamental + a quick 4x overtone 'knock'."""
    t = t_(dur); n = len(t)
    return np.sin(2 * np.pi * f * t) * env(n, 0.003, r) + 0.18 * np.sin(2 * np.pi * f * 3.98 * t) * env(n, 0.001, r * 0.15)

def bell(f, dur=1.0, r=0.45):
    t = t_(dur); n = len(t)
    return (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * f * 2.0 * t) * np.exp(-t / (r * 0.5))) * env(n, 0.004, r)

def glide(f0, f1, dur, a=0.05, r=0.3):
    t = t_(dur); f = f0 + (f1 - f0) * (t / t[-1]) ** 1.5
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), a, r)

def lowpass(x, k=6):
    return np.convolve(x, np.ones(k) / k, 'same')

def place(buf, snd, at):
    i = int(at * SR); end = min(len(buf), i + len(snd)); buf[i:end] += snd[: end - i]

def save(name, x, gain=0.5):
    x = lowpass(x, 3)
    fade = min(len(x), int(SR * 0.02)); x[-fade:] *= np.linspace(1, 0, fade)
    x = x / (np.max(np.abs(x)) + 1e-9) * gain
    with wave.open(os.path.join(OUT, name), 'w') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype(np.int16).tobytes())

def buf(dur): return np.zeros(int(SR * dur))
C5, D5, E5, G5, A5, C6, E6, G6 = 523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1318.5, 1568.0
G4, C4, E4, A4 = 392.0, 261.63, 329.63, 440.0

# tick: a tiny soft wooden click for wheel pegs
n = int(SR * 0.03); tick = np.sin(2 * np.pi * 1800 * t_(0.03)) * env(n, 0.0005, 0.006) + 0.3 * lowpass(rng.uniform(-1, 1, n), 4) * env(n, 0.0005, 0.003)
save('tick.wav', tick, 0.35)

# ding: one soft bell
save('ding.wav', bell(C6, 0.8, 0.3), 0.4)

# whoosh: short airy breath (wheel launch)
n = int(SR * 0.45); x = lowpass(rng.uniform(-1, 1, n), 24); s = np.linspace(0, 1, n)
save('whoosh.wav', x * np.sin(np.pi * s) ** 2, 0.3)

# land: two soft mallet notes (wheel stops)
b = buf(0.7); place(b, mallet(E5, 0.5), 0); place(b, mallet(A5, 0.6), 0.08)
save('land.wav', b, 0.45)

# fanfare (round result): a quick, light rising arpeggio
b = buf(1.0)
for i, f in enumerate([C5, E5, G5]): place(b, mallet(f, 0.5, 0.16), i * 0.075)
place(b, bell(C6, 0.8, 0.35) * 0.8, 0.22)
save('fanfare.wav', b, 0.45)

# underdog: low soft thump, then a bright three-note lift
b = buf(1.1)
place(b, np.sin(2 * np.pi * 70 * t_(0.35)) * env(int(SR * 0.35), 0.002, 0.09), 0)
for i, f in enumerate([G5, C6, E6]): place(b, bell(f, 0.7, 0.25) * 0.7, 0.12 + i * 0.09)
save('underdog.wav', b, 0.45)

# coin: two quick light pings
b = buf(0.35); place(b, mallet(E6, 0.2, 0.05), 0); place(b, mallet(G6, 0.3, 0.08), 0.06)
save('coin.wav', b, 0.3)

# lose: two soft falling notes
b = buf(0.8); place(b, mallet(E4, 0.5, 0.2), 0); place(b, mallet(C4, 0.6, 0.25), 0.16)
save('lose.wav', b, 0.4)

# reveal: soft upward glide with a gentle bell on top
b = buf(0.6); place(b, glide(500, 900, 0.25, 0.03, 0.12) * 0.5, 0); place(b, bell(E6, 0.4, 0.15) * 0.5, 0.2)
save('reveal.wav', b, 0.38)

# podium: warm major chord, rolled
b = buf(1.6)
for i, f in enumerate([C5, E5, G5, C6]): place(b, bell(f, 1.3, 0.55) * 0.6, i * 0.06)
save('podium.wav', b, 0.45)

# pop: tiny blip (someone joins)
save('pop.wav', glide(900, 600, 0.08, 0.002, 0.03), 0.3)

# drumroll: soft, quick taps building gently (before the bets reveal)
b = buf(1.2)
for k in range(18):
    at = k * 0.062; amp = 0.35 + 0.65 * k / 17
    place(b, np.sin(2 * np.pi * 180 * t_(0.05)) * env(int(SR * 0.05), 0.001, 0.012) * amp, at)
save('drumroll.wav', b, 0.35)

# riser: a slow, soft tone lift (Jackpot build-up)
n = int(SR * 1.6); s = np.linspace(0, 1, n)
riser = glide(300, 700, 1.6, 1.2, 9) * (s ** 1.5) + 0.15 * lowpass(rng.uniform(-1, 1, n), 30) * s ** 2
save('riser.wav', riser, 0.35)

# jackpot: bright rolled chord with a soft shimmer
b = buf(1.8)
for i, f in enumerate([C5, E5, G5, C6, E6]): place(b, bell(f, 1.5, 0.6) * 0.55, i * 0.05)
for k in range(5): place(b, bell(G6 * (1 + 0.5 * (k % 2)), 0.3, 0.08) * 0.2, 0.3 + k * 0.08)
save('jackpot.wav', b, 0.5)
print('ok')
