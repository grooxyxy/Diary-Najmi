#!/usr/bin/env python3
"""Selaraskan teks caption dengan suara VO.mp3 -> film/data/lines.json

Mengapa perlu: timestamp di VO_Transcribe.txt dibulatkan ke detik dan bisa meleset 0,5-3 dtk dari suara asli.
Cara kerja : (1) ukur segmen bicara dari amplop audio (jeda antar kata), (2) cocokkan tiap baris transkrip dengan
             sekelompok segmen berurutan lewat dynamic programming (panjang suku kata ~ durasi suara),
             (3) pecah baris panjang jadi potongan caption pendek (<= 2 baris di layar vertikal).
Masukan    : audio/VO.mp3, input/VO_Transcribe.txt, input/captions.txt (satu caption per baris transkrip)
Keluaran   : film/data/lines.json  (dan film/data/voice_segments.json untuk pemeriksaan)
Pakai      : python3 tools/prep_vo.py [--audio audio/VO.mp3] [--max-chars 40]
Butuh      : ffmpeg, numpy, scipy
"""
import argparse, json, os, re, subprocess, sys, tempfile
import numpy as np
from scipy.io import wavfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
ap = argparse.ArgumentParser()
ap.add_argument('--audio', default=os.path.join(ROOT, 'audio/VO.mp3'))
ap.add_argument('--transcript', default=os.path.join(ROOT, 'input/VO_Transcribe.txt'))
ap.add_argument('--captions', default=os.path.join(ROOT, 'input/captions.txt'))
ap.add_argument('--out', default=os.path.join(ROOT, 'film/data/lines.json'))
ap.add_argument('--max-chars', type=int, default=42)
ap.add_argument('--thr-db', type=float, default=-40.0)
a = ap.parse_args()

# 1) audio -> 16 kHz mono -> amplop 10 ms
tmp = tempfile.mkdtemp()
wav = os.path.join(tmp, 'vo16.wav')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', a.audio, '-ac', '1', '-ar', '16000', wav], check=True)
sr, y = wavfile.read(wav); y = y.astype(np.float64) / 32768
dur_total = len(y) / sr
hop = sr // 100; n = len(y) // hop
env = np.sqrt(np.mean(y[:n * hop].reshape(n, hop) ** 2, axis=1))
db = 20 * np.log10(env + 1e-9)
speech = db > a.thr_db
segs = []; i = 0
while i < n:
    if speech[i]:
        j = i
        while j < n and speech[j]: j += 1
        segs.append([i, j]); i = j
    else: i += 1
merged = [segs[0]]
for s, e in segs[1:]:
    if s - merged[-1][1] < 9: merged[-1][1] = e      # tutup celah < 90 ms
    else: merged.append([s, e])
S = []
for s, e in merged:
    if e - s < 8: continue
    pk = 20 * np.log10(np.abs(y[int(s / 100 * sr):int(e / 100 * sr)]).max() + 1e-9)
    if pk > -30: S.append((s / 100, e / 100))       # buang desis/napas halus
json.dump(S, open(os.path.join(os.path.dirname(a.out), 'voice_segments.json'), 'w'))

# 2) baris transkrip + caption
T = []
for ln in open(a.transcript, encoding='utf-8'):
    m = re.match(r'\[(\d+):(\d+):(\d+)\]\s*(.*)', ln.strip())
    if m: T.append((int(m[1]) * 3600 + int(m[2]) * 60 + int(m[3]), m[4]))
C = [l.strip() for l in open(a.captions, encoding='utf-8') if l.strip()]
if len(C) != len(T): sys.exit(f'captions.txt punya {len(C)} baris, transkrip {len(T)} baris: harus sama')

def syl(t):
    t = t.replace('23.40', 'dua puluh tiga empat puluh').replace('CCTV', 'se se te te ve')
    t = re.sub(r'[^a-zA-Z ]', ' ', t.lower())
    return sum(max(1, len(re.findall(r'[aeiou]+', w))) for w in t.split())

sy = [syl(t) for _, t in T]
rate = sum(b - a_ for a_, b in S) / sum(sy)
m, nL = len(S), len(T); INF = 1e18
dp = np.full((nL + 1, m + 1), INF); bk = np.zeros((nL + 1, m + 1), int); dp[0][0] = 0
for i in range(1, nL + 1):
    exp = rate * sy[i - 1]
    for j in range(i, m + 1):
        for k in range(max(i - 1, j - 8), j):
            if dp[i - 1][k] >= INF: continue
            sp = sum(b - a_ for a_, b in S[k:j])
            c = ((sp - exp) ** 2) / (exp + .25) + 0.15 * max(0, abs(S[k][0] - T[i - 1][0] - 0.8) - 2.0) ** 2
            v = dp[i - 1][k] + c
            if v < dp[i][j]: dp[i][j] = v; bk[i][j] = k
j = m; spans = []
for i in range(nL, 0, -1):
    k = bk[i][j]; spans.append((S[k][0], S[j - 1][1])); j = k
spans = spans[::-1]

# 3) pecah jadi potongan caption
def chunks(text, mx):
    """Pecah di tanda baca, gabungkan sampai <= mx huruf, lalu bagi rata di batas kata bila masih terlalu panjang."""
    parts = [p.strip() for p in re.findall(r'[^,:;]+[,:;]?', text) if p.strip()]
    out = []
    for p in parts:
        if out and len(out[-1]) + 1 + len(p) <= mx: out[-1] += ' ' + p
        else: out.append(p)
    res = []
    for p in out:
        if len(p) <= mx: res.append(p); continue
        k = -(-len(p) // mx); words = p.split(); target = len(p) / k; cur = ''
        for w in words:
            if cur and len(cur) + 1 + len(w) > target * 1.12 and len(res) < 99: res.append(cur); cur = w
            else: cur = (cur + ' ' + w).strip()
        if cur: res.append(cur)
    # sisakan tidak ada potongan yatim (< 9 huruf) bila bisa digabung dengan tetangganya
    i = 0
    while i < len(res):
        if len(res[i]) < 9 and len(res) > 1:
            j = i - 1 if i > 0 else i + 1
            if len(res[j]) + 1 + len(res[i]) <= mx + 10:
                if j < i: res[j] += ' ' + res[i]
                else: res[j] = res[i] + ' ' + res[j]
                res.pop(i); i = max(0, i - 1); continue
        i += 1
    return res

lines = []
for i, ((tt, _), (s, e)) in enumerate(zip(T, spans)):
    ch = chunks(C[i], a.max_chars); w = np.array([max(1, syl(c)) for c in ch], float); w /= w.sum()
    t = s; out = []
    for c, ww in zip(ch, w):
        out.append({'t0': round(t, 3), 't1': round(t + ww * (e - s), 3), 'text': c}); t += ww * (e - s)
    lines.append({'id': f'v{i:02d}', 'T': tt, 'a': round(s, 3), 'b': round(e, 3), 'text': C[i], 'chunks': out})
json.dump({'dur': round(dur_total, 3), 'lines': lines}, open(a.out, 'w'), ensure_ascii=False, indent=1)
print(f'ok: {len(lines)} baris, {sum(len(l["chunks"]) for l in lines)} potongan caption, VO {dur_total:.2f} dtk -> {a.out}')
