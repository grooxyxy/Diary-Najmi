#!/usr/bin/env python3
"""Menyusun audio film: narasi (di waktu timeline) + suasana tiap adegan + musik bergaya slendro/gamelan (disintesis), musik menunduk saat narator bicara.
Keluaran: audio/voice.wav, audio/mix.wav (stereo 44,1 kHz).   python3 tools/audio.py"""
import json, os, wave
import numpy as np
from scipy.signal import butter, sosfilt, resample_poly
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); SR = 44100
TL = json.load(open(f'{ROOT}/film/timeline.json')); N = int(np.ceil(TL['dur'] * SR)) + SR
os.makedirs(f'{ROOT}/audio', exist_ok=True)
rng = np.random.default_rng(7)
def bp(x, lo, hi, o=2):
    return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
t = np.arange(N) / SR
def env_scene(ids, fade=1.8):
    e = np.zeros(N)
    for s in TL['scenes']:
        if s['id'] in ids:
            a, b = s['a'], s['b']; e = np.maximum(e, np.clip((t - a + fade / 2) / fade, 0, 1) * np.clip((b + fade / 2 - t) / fade, 0, 1))
    return e
def read(path):
    with wave.open(path) as f: x = np.frombuffer(f.readframes(f.getnframes()), '<i2').astype(np.float32) / 32768; r = f.getframerate()
    return resample_poly(x, SR // 300, r // 300) if r != SR else x
# —— narasi ——
# Satu rekaman gabungan (voiceover/ep01/1.mp3 + 2.mp3) lebih alami daripada memotong
# per baris: napas dan jeda asli ikut terbawa. Per-line WAV tetap didukung sebagai fallback.
V = np.zeros(N, np.float32)
vo_path = f'{ROOT}/audio/vo.wav'
if os.path.exists(vo_path):
    x = read(vo_path); i = int(TL['lines'][0]['t'] * SR); V[i:i + len(x)] += x[:N - i]
    print('narasi: audio/vo.wav %.2f dtk, mulai %.2f dtk' % (len(x) / SR, i / SR))
else:
    for L in TL['lines']:
        x = read(f"{ROOT}/voices/{L['id']}.wav"); i = int(L['t'] * SR); V[i:i + len(x)] += x[:N - i]
# —— suasana ——
white = lambda: rng.standard_normal(N).astype(np.float32)
sea = lp(white(), 500) * (.6 + .4 * np.sin(2 * np.pi * t / 7.3 + 1) ** 2) * 1.6 + lp(white(), 180) * .8
sea *= .5 + .5 * np.sin(2 * np.pi * t / 11 + .5) ** 2
wind = bp(white(), 200, 900) * (.3 + .7 * (np.sin(2 * np.pi * t / 17) * .5 + .5)) * 1.2
crowd = bp(white(), 280, 1300) * (.5 + .5 * np.abs(np.sin(2 * np.pi * t * 3.3 + np.cumsum(rng.standard_normal(N)) * 2e-3))) * (.5 + .5 * np.sin(2 * np.pi * t / 5.1) ** 2)
rain = hp(white(), 2500) * .35 + bp(white(), 800, 3500) * .12
cricket = np.sin(2 * np.pi * 4300 * t) * (np.sin(2 * np.pi * 7 * t) > .3) * (np.sin(2 * np.pi * .6 * t) > -.2) * .06 + np.sin(2 * np.pi * 5100 * t) * (np.sin(2 * np.pi * 9 * t + 1) > .5) * .04
def gulls():
    g = np.zeros(N, np.float32)
    for c in np.arange(6, TL['dur'] - 4, 9.5) + rng.random(int(TL['dur'] / 9.5) + 1)[:len(np.arange(6, TL['dur'] - 4, 9.5))] * 4:
        d = .55; k = np.arange(int(d * SR)) / SR; f = 1500 + 600 * np.sin(np.pi * k / d) - 300 * k
        s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * k / d) ** 1.5 * .09; i = int(c * SR); g[i:i + len(s)] += s[:N - i]
    return g
def creak():
    g = np.zeros(N, np.float32)
    for c in np.arange(3, TL['dur'], 6.7) + rng.random(len(np.arange(3, TL['dur'], 6.7))) * 3:
        d = .6 + rng.random() * .5; k = np.arange(int(d * SR)) / SR; f = 180 + 70 * np.sin(2 * np.pi * (3 + 2 * rng.random()) * k)
        s = (np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR))) * np.sin(np.pi * k / d) ** 2 * .035; s = bp(s, 150, 900); i = int(c * SR); g[i:i + len(s)] += s[:N - i]
    return g
G = gulls(); CR = creak()
night = env_scene(['subuh', 'malam']); day = env_scene(['pagi', 'jelangsiang', 'siang', 'jelangsore']); dusk = env_scene(['sore'])
rainK = np.clip((t - TL['scenes'][5]['a'] - 20) / 30, 0, 1) * env_scene(['sore'])
amb = sea * (.20 + .08 * dusk) + wind * (.05 + .10 * dusk + .03 * night) + crowd * .20 * np.maximum(env_scene(['pagi', 'siang', 'jelangsiang']), .35 * env_scene(['jelangsore'])) + G * day * .8 + CR * (night + dusk * .6) + cricket * night * .8 + rain * rainK * .35
amb = amb.astype(np.float32)
# —— musik: slendro (5 nada sama-rata dalam satu oktaf), logam bernada ——
def bell(f, d, amp):
    k = np.arange(int(d * SR)) / SR; s = np.zeros(len(k))
    for r, a, dc in [(1, 1, 2.6), (2.76, .5, 3.6), (5.4, .22, 5), (8.93, .1, 7)]: s += a * np.sin(2 * np.pi * f * r * k) * np.exp(-k * dc)
    return (s * np.minimum(1, k * 400) * amp).astype(np.float32)
M = np.zeros(N, np.float32); slen = lambda k: 2 ** (k / 5)
mood = {'subuh': (62, 196.0, .9), 'pagi': (88, 220.0, 1.0), 'jelangsiang': (80, 246.9, 1.0), 'siang': (92, 220.0, 1.1), 'jelangsore': (74, 196.0, 1.0), 'sore': (58, 164.8, .9), 'malam': (54, 196.0, .9)}
def put(x, tt):
    i = int(tt * SR)
    if i < N: M[i:i + len(x)] += x[:N - i]
scenes = TL['scenes'] + [{'id': 'outro', 'a': TL['outro']['a'], 'b': TL['dur']}, {'id': 'title', 'a': 0, 'b': TL['title']['b']}]
for s in scenes:
    bpm, base, lvl = mood.get(s['id'], (54, 196.0, 1.0)); beat = 60 / bpm; k0 = 0; step = 0
    tt = s['a']; deg = 2
    while tt < s['b'] - .2:
        # balungan: langkah acak ±1 di tangga slendro, nada pokok tiap 4 ketukan
        deg = int(np.clip(deg + rng.choice([-2, -1, -1, 0, 1, 1, 2]), -3, 8)); f = base * slen(deg)
        put(bell(f, 3.2, .16 * lvl), tt)
        if step % 4 == 0: put(bell(base / 2 * slen(deg % 5), 5, .20 * lvl), tt)
        if step % 8 == 0: put(bell(base / 4, 7.5, .26 * lvl), tt)
        if step % 2 == 1 and rng.random() < .6: put(bell(f * 2 * slen(rng.choice([0, 2, 3])) / slen(0), 1.6, .07 * lvl), tt + beat / 2)
        tt += beat; step += 1
M = lp(M, 5500)
# pad rendah halus (dengung gong jauh) supaya tidak sepi di sela nada
pad = (np.sin(2 * np.pi * 98 * t) + .6 * np.sin(2 * np.pi * 147.4 * t + 1)) * (.5 + .5 * np.sin(2 * np.pi * t / 13)) * .018
M = (M + pad).astype(np.float32)
# —— ducking: musik & suasana turun saat narator bicara ——
ev = lp(np.abs(V), 6, 1); ev = np.clip(ev / (np.percentile(ev[ev > 1e-4], 90) if (ev > 1e-4).any() else 1), 0, 1)
duck = 1 - .6 * ev; vo_free = 1 - np.clip(ev * 3, 0, 1)
# musik lebih penuh saat judul/penutup (tanpa suara)
titleK = np.clip(np.minimum(t, TL['title']['b'] - t + 1), 0, 1) * (t < TL['title']['b']) + (t > TL['outro']['a'])
M_g = (.75 + .6 * vo_free * (titleK > 0)) * duck
# fade total di awal/akhir
fade = np.clip(t / 1.5, 0, 1) * np.clip((TL['dur'] - t) / 3.2, 0, 1)
vo = V * 1.0
mono_bed = (M * M_g * 1.0 + amb * duck ** .5) * fade
# stereo: musik sedikit melebar, suasana lebar
def widen(x, d):
    sh = int(d * SR); return np.concatenate([np.zeros(sh, np.float32), x[:-sh]])
L = vo + mono_bed * .9 + widen(M * M_g, .011) * .25 * fade; R = vo + mono_bed * .9 + widen(M * M_g, .017) * -.0 + widen(amb * duck ** .5, .013) * .3 * fade
out = np.stack([L, R], 1)[:int(TL['dur'] * SR)]
pk = np.abs(out).max(); out = out / max(1, pk / .95)
def wr(path, x, ch):
    with wave.open(path, 'wb') as f: f.setnchannels(ch); f.setsampwidth(2); f.setframerate(SR); f.writeframes((np.clip(x, -1, 1) * 32767).astype('<i2').tobytes())
wr(f'{ROOT}/audio/mix.wav', out, 2); wr(f'{ROOT}/audio/voice.wav', V[:int(TL['dur'] * SR)], 1)
print('audio/mix.wav  %.1f dtk  puncak %.2f' % (len(out) / SR, pk))
