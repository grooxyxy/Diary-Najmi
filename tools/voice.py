#!/usr/bin/env python3
"""Membuat suara narasi per baris: script/story.json -> voices/<id>.wav (24 kHz mono) + voices/dur.json.
Urutan sumber: rekaman sendiri (voices/custom/<id>.wav|mp3|m4a|ogg|flac)  >  Edge TTS (id-ID)  >  suara sintetis (hanya untuk uji).
  python3 tools/voice.py [--voice id-ID-ArdiNeural] [--rate +0%] [--pitch +0Hz] [--engine auto|edge|synth] [--force]"""
import argparse, asyncio, json, os, subprocess, sys, glob, wave
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ap = argparse.ArgumentParser()
ap.add_argument('--voice', default='id-ID-ArdiNeural'); ap.add_argument('--rate', default='+0%'); ap.add_argument('--pitch', default='+0Hz')
ap.add_argument('--engine', default='auto', choices=['auto', 'edge', 'synth']); ap.add_argument('--force', action='store_true')
a = ap.parse_args()
story = json.load(open(f'{ROOT}/script/story.json', encoding='utf-8'))
VD = f'{ROOT}/voices'; os.makedirs(f'{VD}/custom', exist_ok=True); os.makedirs(f'{VD}/raw', exist_ok=True)
SR = 24000

def to_wav(src, dst):
    # ubah ke 24 kHz mono, buang hening di awal/akhir (sisakan sedikit napas)
    af = 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,loudnorm=I=-18:TP=-2:LRA=9'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src, '-af', af, '-ar', str(SR), '-ac', '1', '-c:a', 'pcm_s16le', dst], check=True)

def synth(text, dst):
    # suara pengganti: dengung bersuku kata (hanya supaya timeline & audio bisa diuji tanpa internet)
    rng = np.random.default_rng(abs(hash(text)) % 2**32); words = text.split(); out = []
    for w in words:
        n = max(1, round(len(w) / 3)); 
        for _ in range(n):
            d = .16 + .04 * rng.random(); t = np.arange(int(d * SR)) / SR; f = 110 + 25 * rng.random()
            s = sum(np.sin(2 * np.pi * f * k * t) / k for k in range(1, 8)) * np.hanning(len(t)); out.append(s * .25)
        out.append(np.zeros(int(.06 * SR)))
        if w[-1] in ',.': out.append(np.zeros(int(.25 * SR)))
    x = np.concatenate(out); x = (x / (abs(x).max() + 1e-9) * .5 * 32767).astype('<i2')
    with wave.open(dst, 'wb') as f: f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes(x.tobytes())

async def edge_all(todo):
    import edge_tts
    sem = asyncio.Semaphore(4)
    async def one(L):
        raw = f"{VD}/raw/{L['id']}.mp3"
        async with sem:
            for k in range(4):
                try:
                    await edge_tts.Communicate(L['text'], a.voice, rate=a.rate, pitch=a.pitch).save(raw); return L, raw
                except Exception as e:
                    err = e; await asyncio.sleep(1.5 * (k + 1))
            raise RuntimeError(f"Edge TTS gagal untuk {L['id']}: {err}")
    return await asyncio.gather(*[one(L) for L in todo])

lines = story['lines']; durs = {}; need = []; src = {}
for L in lines:
    dst = f"{VD}/{L['id']}.wav"; cu = glob.glob(f"{VD}/custom/{L['id']}.*")
    if cu: to_wav(cu[0], dst); src[L['id']] = 'custom'
    elif os.path.exists(dst) and not a.force: src[L['id']] = 'cache'
    else: need.append(L)
if need:
    done = False
    if a.engine in ('auto', 'edge'):
        try:
            for L, raw in asyncio.run(edge_all(need)): to_wav(raw, f"{VD}/{L['id']}.wav"); src[L['id']] = 'edge'
            done = True
        except Exception as e:
            print('!!', e, file=sys.stderr)
            if a.engine == 'edge': sys.exit(1)
    if not done:
        print('!! memakai suara SINTETIS (hanya uji). Jalankan lagi dengan internet untuk Edge TTS.', file=sys.stderr)
        for L in need: synth(L['text'], f"{VD}/{L['id']}.wav"); src[L['id']] = 'synth'
for L in lines:
    with wave.open(f"{VD}/{L['id']}.wav") as f: durs[L['id']] = round(f.getnframes() / f.getframerate(), 3)
json.dump(durs, open(f'{VD}/dur.json', 'w'), indent=1)
from collections import Counter
print('sumber suara:', dict(Counter(src.values())), '| total narasi: %.1f dtk' % sum(durs.values()))
