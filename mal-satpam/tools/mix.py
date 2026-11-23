#!/usr/bin/env python3
"""Mixer audio: VO.mp3 (suara Anda, tidak diubah) + suasana & foley prosedural yang disinkronkan ke peristiwa di film/world.js.
Pakai: python3 tools/mix.py [--vo audio/VO.mp3] [--events film/data/events.json] [--out out/mix.wav]
Semua bunyi dibuat dari nol (numpy/scipy), tanpa sampel berlisensi. Pemuat loudness akhir dikerjakan mux.sh (-14 LUFS)."""
import argparse, json, os, subprocess, sys
import numpy as np
from scipy.io import wavfile
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, os.path.join(ROOT, 'kit/core/audio'))
import sfx as S
from sfx import SR, add, t_, noise, lp, hp, bp, norm, brown, env_exp, step, thump, clack, click, creak, limit
ap = argparse.ArgumentParser()
ap.add_argument('--vo', default=os.path.join(ROOT, 'audio/VO.mp3'))
ap.add_argument('--events', default=os.path.join(ROOT, 'film/data/events.json'))
ap.add_argument('--out', default=os.path.join(ROOT, 'out/mix.wav'))
a = ap.parse_args()
EV = json.load(open(a.events)); DUR = EV['dur']; N = int(DUR * SR)
rng = np.random.default_rng(11)
buf = np.zeros((N, 2), np.float32); TT = np.arange(N) / SR
env = lambda pts: np.interp(TT, [p[0] for p in pts], [p[1] for p in pts]).astype(np.float32)   # amplop piecewise-linear per sampel
def lay(x, g=1.0, pan=0.0):   # tambahkan larik mono sepanjang film
    l, r = np.cos((pan + 1) * np.pi / 4) * 1.414, np.sin((pan + 1) * np.pi / 4) * 1.414
    buf[:, 0] += x[:N] * g * l; buf[:, 1] += x[:N] * g * r
def echo(x, taps):  # taps: [(delay, gain)]
    out = np.zeros(len(x) + int(max(d for d, _ in taps) * SR) + 1, np.float32); out[:len(x)] += x
    for d, g in taps: s = int(d * SR); out[s:s + len(x)] += lp(x, 4500) * g
    return out
def stereo_echo(x, at, g, pan, taps): add(buf, echo(x, taps), at, g, pan)

# ── 1. suara ──
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', a.vo, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
vo = np.frombuffer(raw, np.float32).copy(); vo *= 0.9 / max(1e-6, np.abs(vo).max())
add(buf, vo, 0.0, 1.0, 0.0)
VOICE_END = len(vo) / SR

# ── 2. alas ruangan: dengung AC, nada rendah, ketegangan yang naik pelan ──
duck = env([[0, 1], [70.85, 1], [71.05, .0], [72.7, .0], [73.4, .6], [75.6, 1], [116.95, 1], [117.0, .05], [118.2, .7], [119, 1], [125.8, 1], [126.0, 0], [DUR, 0]])
rt = lp(brown(DUR), 260) * 0.02 + bp(noise(DUR), 90, 130) * 0.004
lay(rt * duck, 1.0)
tone = (np.sin(2 * np.pi * 55 * TT) + .8 * np.sin(2 * np.pi * 58.3 * TT) + .5 * np.sin(2 * np.pi * 82.4 * TT)) * (.6 + .4 * np.sin(2 * np.pi * .07 * TT))
lay(tone.astype(np.float32) * env([[0, .006], [60, .012], [100, .02], [116, .035], [125.8, .09], [126, .0], [DUR, .0]]) * duck, 1.0)

# ── 3. air mancur ──
fw = bp(noise(DUR), 450, 6500) * (.55 + .45 * lp(noise(DUR), 4) * 4)
fw = fw.astype(np.float32)
lay(fw * env([[0, .006], [10, .015], [22, .03], [24.5, .07], [29.8, .065], [33, .02], [40, .004], [60, .0], [84, .0], [86.5, .012], [126, .008], [DUR, 0]]), 1.0, -.05)

# ── 4. eskalator: dengung berhenti satu per satu + gema ──
for i, st in enumerate(EV['escStop']):
    hum = (bp(noise(DUR), 70 + i * 9, 240 + i * 25) * .5 + np.sin(2 * np.pi * (96 + i * 7) * TT) * .15).astype(np.float32)
    lay(hum * env([[0, .018], [st - .02, .018], [st + .25, 0], [DUR, 0]]), 1.0, -.25 + i * .17)
    th = thump(.8, 48 + i * 6); cl = clack(.6 + i * .04, .7)
    add(buf, th, st, .35, 0); add(buf, cl, st + .02, .22, -.2 + i * .15)
    for k in range(1, 5):       # gema merambat naik ke lantai atas
        m = np.zeros(max(len(th), len(cl)), np.float32); m[:len(th)] += th * .6; m[:len(cl)] += cl * .4
        add(buf, lp(m, 2600 / k), st + .38 * k, .22 / k, (-1) ** k * .35)

# ── 5. lampu toko padam (hook): klik relai + dengung neon ──
L0, L1 = EV['lightsOut']['t0'], EV['lightsOut']['t1']
for k, tt in enumerate(np.linspace(L0, L1, 20)):
    add(buf, click(1.1 + .5 * rng.random(), .8), tt + rng.random() * .07, .22, rng.uniform(-.8, .8))
add(buf, thump(1, 40), L1 + .05, .45, 0)
neon = (np.sin(2 * np.pi * 120 * TT) * .5 + bp(noise(DUR), 2500, 4500) * .12).astype(np.float32); lay(neon * env([[0, .006], [3.7, .006], [4.0, .0], [DUR, 0]]), 1.0, .1)

# ── 6. langkah (dari jalur penjaga), rattle pintu rolling ──
for s in EV['steps']:
    t = s['t']; v = (1.5 if s['run'] else 1.0)
    if s['onEsc']: x = clack(.7 + .1 * rng.random(), .9); add(buf, x, t, .16 * v, 0)
    else:
        x = step(.9 + .2 * rng.random()); stereo_echo(x, t, .2 * v, rng.uniform(-.1, .1), [(.17, .28), (.36, .12)])
for tt in np.arange(17.45, 18.95, .21):
    d = .14; x = (bp(noise(d), 900, 5200) * env_exp(d, .03) + np.sin(2 * np.pi * (1300 + 200 * rng.random()) * t_(d)) * env_exp(d, .05) * .3); add(buf, norm(x), tt, .22, .25)
for tt in (22.3,): add(buf, creak(.6), tt, .08, .1)

# ── 7. "tujuh": lampu etalase berkedip, dentuman jantung, dengung bawah ──
lay((np.sin(2 * np.pi * 43 * TT) + .6 * np.sin(2 * np.pi * 46 * TT)).astype(np.float32) * env([[48.3, 0], [49.2, .07], [52.5, .05], [57, 0], [DUR, 0]]), 1.0)
for tt in np.arange(48.4, 50.8, 1 / 18):
    if rng.random() > .45: add(buf, hp(noise(.03), 1500) * .5 + lp(noise(.03), 400) * .5, tt, .12, .4)
def beats(t0, t1, b0, b1, g0, g1):
    t = t0
    while t < t1:
        u = (t - t0) / (t1 - t0); g = g0 + (g1 - g0) * u
        hb = S.heartbeat(1); add(buf, hb, t, g, 0); t += 60 / (b0 + (b1 - b0) * u)
beats(49.0, 56.5, 62, 70, .35, .18)

# ── 8. kotak musik ──
def bell(n, v, wob=0.0):
    f = 440 * 2 ** ((n - 69) / 12) * (1 + wob); d = 1.5; tt = t_(d)
    x = sum(a_ * np.sin(2 * np.pi * f * r_ * tt) * env_exp(d, tau) for r_, a_, tau in [(1, 1, .55), (2.756, .35, .22), (5.404, .15, .1), (8.93, .06, .05)])
    tick = hp(noise(.01), 3000) * env_exp(.01, .002); x[:len(tick)] += tick * .6
    return norm(x) * v
for nt in EV['notes']:
    first = nt['t'] < 72; x = bell(nt['n'], nt['v'], rng.uniform(-.006, .006))
    if first: add(buf, x, nt['t'], .17, -.4)
    else: stereo_echo(x, nt['t'], .21, .35, [(.09, .35), (.21, .2), (.4, .1)])    # "dari belakangmu": gema pendek, geser kanan
add(buf, creak(.8), 62.0, .1, -.4); add(buf, creak(1.0), 76.0, .16, -.4); add(buf, click(.8, 1), 62.3, .12, -.4)
add(buf, thump(.7, 150), 70.78, .18, -.4); add(buf, click(.7, 1), 70.8, .15, -.4)

# ── 9. layar CCTV menyala, lalu keheningan yang tegang ──
add(buf, click(.7, 1), 85.0, .3, .2); add(buf, thump(.6, 70), 85.05, .25, .2)
for tt in np.arange(85.0, 85.9, 1 / 22):
    if rng.random() > .4: add(buf, hp(noise(.025), 2000), tt, .1, .3)
crt = (np.sin(2 * np.pi * 120 * TT) * .4 + np.sin(2 * np.pi * 7800 * TT) * .05).astype(np.float32)
lay(crt * env([[85.0, 0], [85.9, .014], [116.9, .014], [125.8, .02], [126, 0], [DUR, 0]]), 1.0, .3)

# ── 10. penampakan: sengatan, jantung makin cepat, lengan terangkat ──
sh = np.repeat(rng.standard_normal(int(.28 * SR) // 6 + 1), 6)[:int(.28 * SR)] * env_exp(.28, .09)
add(buf, norm(sh) * 1, 117.0, .45, 0); add(buf, thump(1.0, 38), 117.0, .6, 0); add(buf, thump(.8, 31), 117.12, .4, 0)
beats(117.5, 125.8, 72, 118, .3, .6)
lay((np.sin(2 * np.pi * 41 * TT) + np.sin(2 * np.pi * 43.7 * TT)).astype(np.float32) * env([[118, 0], [125.8, .1], [126, 0], [DUR, 0]]), 1.0)
for k, tt in enumerate(np.arange(121.9, 125.0, .55)): add(buf, creak(1), tt, .06 + .028 * k, -.55)
add(buf, thump(1, 46), EV["endAt"] + .15, .5, 0)
# potong bersih di 125.9 lalu ekor rendah di kartu akhir
cut = env([[0, 1], [125.9, 1], [126.15, .0], [126.7, .0], [DUR, 0]]); tail = (np.sin(2 * np.pi * 52 * TT) * env([[126.6, 0], [127.2, .06], [DUR - .3, .02], [DUR, 0]])).astype(np.float32)
# fade keluar halus pada bagian suara+foley sebelum kartu
fade = env([[0, 1], [125.75, 1], [126.15, 0], [DUR, 0]]); buf[:, 0] *= np.where(TT < 126.2, fade, 1); buf[:, 1] *= np.where(TT < 126.2, fade, 1)
buf[:, 0] += tail; buf[:, 1] += tail
# kartu akhir: dentum rendah masuk lagi (di atas) sudah ditambahkan; master
for c in (0, 1): buf[:, c] = limit(buf[:, c], .92)
buf *= env([[0, 0], [.15, 1], [DUR - 1.2, 1], [DUR, 0]])[:, None]
os.makedirs(os.path.dirname(a.out), exist_ok=True)
wavfile.write(a.out, SR, (np.clip(buf, -1, 1) * 32767).astype(np.int16))
pk = np.abs(buf).max(); rms = np.sqrt((buf ** 2).mean())
print(f'mix ok: {DUR:.1f}s  peak {20*np.log10(pk):.1f} dBFS  rms {20*np.log10(rms):.1f} dBFS -> {a.out}  (VO {VOICE_END:.1f}s)')
