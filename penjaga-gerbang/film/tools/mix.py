#!/usr/bin/env python3
"""Mixer audio: VO (ElevenLabs) + musik orisinal (sintesis kode) + ambience + efek suara, semua mengikuti timing.json.
Hasil: out/mix.wav (44.1 kHz stereo float). Loudness akhir (-14 LUFS) dikerjakan mux.sh. Dependensi: numpy, scipy, ffmpeg."""
import json, os, subprocess, sys, argparse
import numpy as np
from scipy import signal
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
ap = argparse.ArgumentParser(); ap.add_argument('--lead', type=float, default=3.0); ap.add_argument('--out', default=os.path.join(ROOT, 'out/mix.wav'))
ap.add_argument('--vo', default=os.path.join(ROOT, 'vo/vo.mp3')); ap.add_argument('--timing', default=os.path.join(ROOT, 'timing.json')); ap.add_argument('--no-music', action='store_true')
a = ap.parse_args()
SR = 44100; T = json.load(open(a.timing)); AN = T['anchors']; EV = T['events']; LEAD = a.lead
DUR = LEAD + T['dur'] + 6.2; N = int(DUR * SR)
rng = np.random.default_rng(7)
A = lambda k: LEAD + AN[k]
E = lambda k, i=None: LEAD + (EV[k] if i is None else EV[k][i])
L = np.zeros(N, np.float32); R = np.zeros(N, np.float32)

def put(sig, t, gain=1.0, pan=0.0):
    """tambahkan sinyal mono pada detik t; pan -1..1"""
    i = int(t * SR); 
    if i >= N or i + len(sig) <= 0: return
    s = sig[max(0, -i):]; i = max(0, i); s = s[:N - i]
    gl = gain * np.sqrt((1 - pan) / 2) * 1.414 / 1.414; gr = gain * np.sqrt((1 + pan) / 2)
    L[i:i + len(s)] += s * gl; R[i:i + len(s)] += s * gr
def env(n, a_=.01, d=.3, s=.0, r=.1):
    t = np.arange(n) / SR; e = np.minimum(t / max(a_, 1e-4), 1) * (s + (1 - s) * np.exp(-t / max(d, 1e-3))); rel = max(1, int(r * SR)); e[-rel:] *= np.linspace(1, 0, rel); return e
def lp(x, f, o=2): return signal.sosfilt(signal.butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return signal.sosfilt(signal.butter(o, f, 'high', fs=SR, output='sos'), x)
def bp(x, f0, f1, o=2): return signal.sosfilt(signal.butter(o, [f0, f1], 'band', fs=SR, output='sos'), x)
def noise(n): return rng.standard_normal(n).astype(np.float32)
def sine(f, n, ph=0): return np.sin(2 * np.pi * f * np.arange(n) / SR + ph).astype(np.float32)
def sw(t, a_, b, tt): return a_ + (b - a_) * np.clip(t / tt, 0, 1)

# ---------- VO ----------
raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', a.vo, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-']); vo = np.frombuffer(raw, np.float32)
vo_pad = np.zeros(N, np.float32); vo_pad[int(LEAD * SR):int(LEAD * SR) + len(vo)] = vo[:N - int(LEAD * SR)]
vo_env = lp(np.abs(vo_pad), 6, 1); vo_env = np.clip(vo_env / (np.percentile(vo_env, 95) + 1e-6), 0, 1)   # kira-kira "VO aktif"

# ---------- ambience ----------
def bed(t0, t1, fn, gain):
    n = int((t1 - t0) * SR); x = fn(n); f = min(int(1.5 * SR), n // 2); x[:f] *= np.linspace(0, 1, f); x[-f:] *= np.linspace(1, 0, f); put(x, t0, gain)
def wind(n):
    x = lp(noise(n), 500, 2); lfo = .55 + .45 * np.sin(2 * np.pi * (np.arange(n) / SR) / 9.0 + rng.uniform(0, 6)); return (x * lfo * 3).astype(np.float32)
def murmur(n):
    x = bp(noise(n), 250, 1400); t = np.arange(n) / SR; m = .5 + .5 * np.sin(2 * np.pi * 3.7 * t) * np.sin(2 * np.pi * .31 * t + 1); return (x * m * 2.4).astype(np.float32)
def crickets(n):
    t = np.arange(n) / SR; x = sine(4300, n) * (.5 + .5 * np.sign(np.sin(2 * np.pi * 7.5 * t))) * (.5 + .5 * np.sin(2 * np.pi * .4 * t)); return (hp(x, 3000) * .6).astype(np.float32)
def crackle(n):
    x = np.zeros(n, np.float32); k = int(n / SR * 22)
    for p in rng.integers(0, n - 800, k): x[p:p + 300] += (noise(300) * np.exp(-np.arange(300) / 40) * rng.uniform(.2, 1)).astype(np.float32)
    return hp(x, 900) * .8 + lp(noise(n), 300) * .3
bed(0, A('engsel') + 6, wind, .05); bed(A('engsel') + 3, A('siang') + 4, wind, .02); bed(A('sore') - 3, A('lonceng3') + 3, wind, .035); bed(A('lonceng3') - 1, DUR, wind, .06)
bed(A('siang') - 3, A('sore') + 2, murmur, .03); bed(A('petani') - 2, A('siang'), murmur, .02)
bed(A('jendela') - 4, DUR, crickets, .012); bed(A('lingkaran') - 1, DUR, crackle, .05)
def chirp(f0, f1, d=.12):
    n = int(d * SR); t = np.arange(n) / SR; ph = 2 * np.pi * np.cumsum(sw(t, f0, f1, d)) / SR; return (np.sin(ph) * np.hanning(n)).astype(np.float32)
def birds(t0, t1, rate, g):
    t = t0
    while t < t1:
        t += rng.exponential(1 / rate); f = rng.uniform(2400, 4200); pan = rng.uniform(-.8, .8)
        for k in range(rng.integers(1, 5)): put(chirp(f, f * rng.uniform(.8, 1.3), rng.uniform(.06, .14)), t + k * .13, g * rng.uniform(.5, 1), pan)
birds(A('engsel') - 1, A('sore') - 4, .35, .03); birds(A('engsel') + 6, A('periksa'), .5, .035)

# ---------- efek ----------
def bell(f0, dur, big=True):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n, np.float32)
    for r, a_, d in [(.5, .6, 1.0), (1, 1, 1), (1.2, .5, .7), (1.5, .35, .6), (2.0, .55, .5), (2.5, .25, .35), (3.3, .2, .25), (4.1, .12, .18)]: x += a_ * np.sin(2 * np.pi * f0 * r * t * (1 + .0006 * rng.standard_normal())) * np.exp(-t / (dur * d * .45))
    x *= np.minimum(t / .004, 1); return (x / 2.2).astype(np.float32)
bellB = bell(196, 6.5); bellS = bell(740, 3.0)
for k, g in [('bell1', .5), ('bell2', .5), ('bell3', .55)]:
    for tt in EV[k]: put(bellB, LEAD + tt, g * (.85 + .15 * rng.random()), -.1)
for tt in EV['bellsmall']: put(bellS, LEAD + tt, .26, .2)
def thud(f=55, d=.5, g=1.0):
    n = int(d * SR); t = np.arange(n) / SR; return (sine(sw(t, f * 1.8, f, .12).mean(), n) * 0 + np.sin(2 * np.pi * np.cumsum(sw(t, f * 2, f, .1)) / SR) * np.exp(-t / (d * .3)) * g).astype(np.float32)
def woodclack(d=.12): n = int(d * SR); return (bp(noise(n), 300, 2400) * np.exp(-np.arange(n) / (SR * .02))).astype(np.float32)
def creak(d, f0=95, f1=150):
    n = int(d * SR); t = np.arange(n) / SR; ph = 2 * np.pi * np.cumsum(sw(t, f0, f1, d) * (1 + .08 * np.sin(2 * np.pi * 7 * t))) / SR
    x = signal.sawtooth(ph).astype(np.float32); x = bp(x, 220, 1800) * (.5 + .5 * np.sin(2 * np.pi * 11 * t)) + bp(noise(n), 400, 1500) * .2
    e = np.minimum(t / .3, 1) * np.minimum((d - t) / .5, 1); return (x * e * 1.4).astype(np.float32)
put(creak(4.0), E('doors_open'), .32); put(thud(48, .9, 1), E('doors_open') + 3.9, .5); put(woodclack(), E('doors_open') + 3.95, .3)
put(bp(noise(int(1.6 * SR)), 200, 1800) * np.hanning(int(1.6 * SR)), E('bar_lift'), .22); put(thud(70, .4), E('bar_lift') + 1.9, .35); put(woodclack(.2), E('bar_lift') + 2.0, .3)
put(creak(2.0, 130, 80), E('doors_close'), .3); put(thud(42, 1.2, 1), E('bar_drop'), .75); put(woodclack(.2), E('bar_drop'), .45); put(thud(60, .6), E('doors_close') + 2.0, .4)
put(creak(.9, 180, 130), E('wicket1'), .22); put(creak(.9, 180, 130), E('wicket2'), .22)
for i in range(4): put(thud(150, .12), EV['knock'] + LEAD + i * .22, .35); put(woodclack(.08), EV['knock'] + LEAD + i * .22, .3)
w0, w1 = E('wagon', 0), E('wagon', 1); tt = w0
while tt < w1:   # tapal kuda (pola 4 langkah) + derak roda
    for k in range(2): put(thud(120, .1) * .8, tt + k * .02, .16, .0); put(woodclack(.05), tt + k * .02, .12)
    tt += .37
put(bp(noise(int((w1 - w0) * SR)), 120, 900) * np.hanning(int((w1 - w0) * SR)) * (.5 + .5 * np.sin(2 * np.pi * 9 * np.arange(int((w1 - w0) * SR)) / SR)), w0, .05)
def squeak(d=.22): n = int(d * SR); t = np.arange(n) / SR; return (np.sin(2 * np.pi * np.cumsum(sw(t, 1700, 2300, d)) / SR) * np.hanning(n) * (.6 + .4 * np.sin(2 * np.pi * 40 * t))).astype(np.float32)
t = E('cart', 0)
while t < E('cart', 1) + 6: put(squeak(rng.uniform(.15, .3)), t, .05, .0); t += rng.uniform(.5, .9)
def tick(f): n = int(.5 * SR); t_ = np.arange(n) / SR; return (np.sin(2 * np.pi * f * t_) * np.exp(-t_ / .09) * .6 + np.sin(2 * np.pi * f * 2.76 * t_) * np.exp(-t_ / .05) * .3).astype(np.float32)
for i in range(5): put(tick(rng.uniform(2800, 4200)), EV['coins'] + LEAD + i * .11, .12, rng.uniform(-.3, .3))
for i in range(3): put(tick(rng.uniform(3500, 5200)), A('kunci') + 1.4 + i * .12, .06)
def step(): n = int(.12 * SR); return (lp(noise(n), 700) * np.exp(-np.arange(n) / (SR * .025))).astype(np.float32)
t = E('run', 0) + 1.2
while t < E('run', 1): put(step(), t, .22, rng.uniform(-.2, .2)); t += .17
for tt in (A('lonceng3') + .3,): [put(step(), tt + i * .6, .1) for i in range(3)]
def chime(f, d=2.2): n = int(d * SR); t_ = np.arange(n) / SR; return (sum(a_ * np.sin(2 * np.pi * f * r * t_) * np.exp(-t_ / (d * k)) for r, a_, k in [(1, 1, .3), (2.7, .35, .15), (5.4, .15, .08)]) * np.minimum(t_ / .003, 1)).astype(np.float32)
for tt, f in zip(EV['win'], (587.3, 740, 880)): put(chime(f), LEAD + tt, .2, rng.uniform(-.3, .3))

# ---------- musik: D dorian → D lydian di malam ----------
NOTE = lambda m: 440 * 2 ** ((m - 69) / 12)
def ks(f, d, g=1.0, bright=.5):
    n = int(d * SR); p = int(SR / f); x = np.zeros(n); x[:p] = rng.uniform(-1, 1, p) * np.hanning(p) ** .2
    b = [1.0]; aa = np.zeros(p + 2); aa[0] = 1; aa[p] = -.5 * .9985; aa[p + 1] = -.5 * .9985
    y = signal.lfilter(b, aa, x); y = lp(y, 800 + 6000 * bright, 1); return (y * g * 1.2 * np.minimum(np.arange(n) / 80, 1)).astype(np.float32)
def pad(ms, d, g=1.0, bright=900, sat=True):
    n = int(d * SR); t_ = np.arange(n) / SR; x = np.zeros(n)
    for m in ms:
        f = NOTE(m)
        for dt in (-.004, 0, .004): x += (signal.sawtooth(2 * np.pi * f * (1 + dt) * t_) if sat else np.sin(2 * np.pi * f * (1 + dt) * t_)) * .33
    x = lp(x, bright, 2); e = np.minimum(t_ / 1.8, 1) * np.minimum((d - t_) / 2.2, 1).clip(0); return (x * e * g / len(ms)).astype(np.float32)
def arp(ch, t0, t1, step, g, oct_=0, pat=(0, 1, 2, 1, 3, 2, 1, 2), bright=.5, pan=.0, swell=None):
    t = t0; i = 0
    while t < t1: m = ch[pat[i % len(pat)] % len(ch)] + oct_ * 12; put(ks(NOTE(m), 2.2, 1, bright), t, g * (swell(t) if swell else 1) * (.8 + .2 * rng.random()), pan + rng.uniform(-.15, .15)); t += step; i += 1
if not a.no_music:
    Dm = [50, 57, 62, 65, 69]; Bb = [46, 53, 58, 62, 65]; F = [53, 57, 60, 64, 67]; Gm = [55, 58, 62, 67, 70]; C = [48, 55, 60, 64, 67]; Am = [45, 57, 60, 64, 67]; G = [55, 59, 62, 66, 71]; Dd = [50, 57, 62, 66, 69]; Bm = [47, 54, 59, 62, 66]; Aa = [45, 57, 61, 64, 69]
    def prog(t0, t1, chords, bar, padg=.07, arpg=0.0, step=None, **k):
        t = t0; i = 0
        while t < t1:
            ch = chords[i % len(chords)]; d = min(bar + 2.4, t1 - t + 2.4)
            put(pad(ch[:4], d, padg), t, 1, 0); put(pad([ch[0] - 12], d, padg * .9, 300), t, 1, 0)
            if arpg and step: arp(ch[1:], t, min(t + bar, t1), step, arpg, **k)
            t += bar; i += 1
    tm = {'intro': (0, A('engsel')), 'morn': (A('engsel'), A('siang')), 'noon': (A('siang'), A('sore') + 2), 'aft': (A('sore') + 2, A('bayangan') + 8), 'tense': (A('bayangan') + 8, A('keputusan') - .5),
          'hush': (A('keputusan') - .5, A('keempat') - .5), 'run': (A('keempat') - .5, A('lonceng3') + 3.8), 'after': (A('lonceng3') + 3.8, A('jendela') - 3), 'wake': (A('jendela') - 3, A('malam')), 'night': (A('malam'), A('redup') - .5), 'dim': (A('redup') - .5, A('lenteralain') - .5), 'warm': (A('lenteralain') - .5, A('besok')), 'close': (A('besok'), DUR)}
    swl = lambda a0, a1: (lambda t: np.clip((t - a0) / (a1 - a0), .15, 1))
    prog(*tm['intro'], [Dm, Bb], 9.0, .06, .5, 2.4, oct_=1, swell=swl(0, 14))
    prog(*tm['morn'], [Dm, Bb, F, C], 7.2, .08, .7, 1.8, oct_=0)
    prog(*tm['noon'], [Dm, Gm, Bb, C], 6.4, .08, .8, 0.8, oct_=1, pat=(0, 2, 1, 3, 2, 1, 3, 2))
    prog(*tm['aft'], [F, Am, Bb, C], 8.0, .08, .5, 1.6, oct_=0)
    prog(*tm['tense'], [Dm, [50, 57, 62, 65, 68], Gm, [49, 57, 61, 64, 68]], 5.0, .09, .35, .9, oct_=0, swell=swl(tm['tense'][0], tm['tense'][1]))
    put(pad([38, 45], tm['tense'][1] - tm['tense'][0] + 3, .12, 240), tm['tense'][0], 1)
    put(pad([50, 57], tm['hush'][1] - tm['hush'][0] + 2.5, .035, 400, False), tm['hush'][0], 1)
    arp(Dm[1:], tm['run'][0], tm['run'][1], .18, .1, 1, (0, 1, 2, 3, 2, 1), .7, swell=swl(tm['run'][0], tm['run'][1] - 1)); put(pad([38, 45, 50], tm['run'][1] - tm['run'][0] + 2, .13, 300), tm['run'][0], 1)
    for k in range(int((tm['run'][1] - tm['run'][0]) / .6)): put(thud(65, .35) * .6, tm['run'][0] + k * .6, .12 * min(1, k / 8))
    prog(*tm['after'], [Dm, Bb], 8.0, .05, .3, 2.0, oct_=1)
    prog(*tm['wake'], [Dd, Aa], 4.5, .1, .6, 1.2, oct_=1, bright=.8)
    prog(*tm['night'], [Dd, Aa, Bm, G], 7.5, .11, .7, 1.5, oct_=0, bright=.7)
    prog(*tm['dim'], [Bm, G], 7.0, .06, .5, 2.6, oct_=1)
    prog(*tm['warm'], [Dd, Aa, Bm, G, Dd, Aa, G, Dd], 7.5, .13, .8, 1.4, oct_=0, bright=.8, swell=swl(tm['warm'][0], A('demam')))
    cend = tm['close'][0]; put(pad([50, 57, 62, 66, 69], DUR - cend + 1, .15, 1100), cend, 1); put(pad([38, 45], DUR - cend + 1, .1, 260), cend, 1)
    for k, m in enumerate([74, 78, 81, 86]): put(chime(NOTE(m), 5.0), DUR - 7.5 + k * .9, .1)
    # musik meredup di bawah VO (sidechain kasar)
    duck = 1 - .5 * vo_env; 
    mus_L, mus_R = L.copy(), R.copy(); L[:] = 0; R[:] = 0
    # (musik dipisah: kita hanya menurunkan semua sumber non-VO yang telah ditambahkan sejauh ini sebagian)
    L[:] = mus_L * (.45 + .55 * duck); R[:] = mus_R * (.45 + .55 * duck)
# ---------- gabung ----------
mus_gain = .85
L *= mus_gain; R *= mus_gain
L += vo_pad * 1.0; R += vo_pad * 1.0
fadeout = np.ones(N, np.float32); f = int(2.4 * SR); fadeout[-f:] = np.linspace(1, 0, f); L *= fadeout; R *= fadeout
pk = max(np.abs(L).max(), np.abs(R).max()); print('puncak sebelum normalisasi: %.2f' % pk)
if pk > .98: L /= pk / .98; R /= pk / .98
os.makedirs(os.path.dirname(a.out), exist_ok=True)
import wave
with wave.open(a.out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.stack([L, R], 1) * 32767).astype('<i2').tobytes())
print('tertulis', a.out, '%.1f detik' % DUR)
