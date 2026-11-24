#!/usr/bin/env python3
"""Menyelaraskan NASKAH (teks benar) dengan SRT hasil transkripsi VO (teks ada salah dengar, waktu benar).
Hasil: timing.json (kata per kata, caption, anchor) + out/naskah-vo.srt (SRT bersih, waktu mengikuti audio asli).
Pakai:  python3 tools/align.py [--vo vo/vo.srt --script vo/naskah.txt --out timing.json]
Tanpa dependensi (stdlib saja). Ganti vo.mp3/vo.srt/naskah.txt lalu jalankan ulang: animasi ikut menyesuaikan."""
import re, json, sys, os, subprocess, difflib, argparse
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
ap = argparse.ArgumentParser()
ap.add_argument('--vo', default=os.path.join(ROOT, 'vo/vo.srt')); ap.add_argument('--script', default=os.path.join(ROOT, 'vo/naskah.txt'))
ap.add_argument('--audio', default=os.path.join(ROOT, 'vo/vo.mp3')); ap.add_argument('--out', default=os.path.join(ROOT, 'timing.json'))
ap.add_argument('--srt', default=os.path.join(ROOT, 'out/naskah-vo.srt')); ap.add_argument('--maxc', type=int, default=66); ap.add_argument('--lead', type=float, default=3.0); ap.add_argument('--film-srt', default=os.path.join(ROOT, 'out/film.srt'))
a = ap.parse_args()

norm = lambda s: re.sub(r'[^a-z]', '', s.lower())
NUM = {'12': 'dua belas', '1': 'satu', '2': 'dua', '3': 'tiga'}

# ---- naskah: hanya kalimat narasi (buang [arahan visual], judul, pembatas, nama bagian)
paras, cur = [], []
for raw in open(a.script, encoding='utf-8-sig').read().replace('\r', '').split('\n'):
    s = re.sub(r'\[[^\]]*\]', '', raw).strip()
    if not s or raw.strip().startswith('['):
        if cur: paras.append(' '.join(cur)); cur = []
        continue
    if set(s) <= set('=- ') or re.fullmatch(r'[A-Z ]{3,}', s) or s.startswith(('Naskah narasi', 'Perkiraan durasi', 'Catatan:', 'Semua teks')): 
        if cur: paras.append(' '.join(cur)); cur = []
        continue
    cur.append(s)
if cur: paras.append(' '.join(cur))
narr = [p for p in paras if p]
words = []  # {w: tampilan, k: kunci}
for pi, p in enumerate(narr):
    for tok in p.split():
        if norm(tok): words.append({'w': tok, 'k': norm(tok), 'p': pi})

# ---- SRT -> karakter berwaktu
def tsec(x): h, m, r = x.split(':'); s, ms = r.split(','); return int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000
cues = []
for blk in re.split(r'\n\s*\n', open(a.vo, encoding='utf-8-sig').read().replace('\r', '').strip()):
    L = blk.strip().split('\n')
    if len(L) < 3: continue
    m = re.match(r'(\S+) --> (\S+)', L[1]);
    if not m: continue
    txt = re.sub(r'\[[A-Z_0-9]+\]', '', ' '.join(L[2:]))
    txt = re.sub(r'\d+', lambda d: ' ' + NUM.get(d.group(), d.group()) + ' ', txt)
    cues.append((tsec(m.group(1)), tsec(m.group(2)), norm(txt)))
A, AT = '', []   # string ASR, waktu tiap karakter
for t0, t1, s in cues:
    n = len(s)
    for i, c in enumerate(s): AT.append(t0 + (i + .5) / n * (t1 - t0))
    A += s
S, SW = '', []
for wi, w in enumerate(words):
    S += w['k']; SW += [wi] * len(w['k'])
sm = difflib.SequenceMatcher(None, S, A, autojunk=False)
pos = [None] * len(S)
for i, j, n in sm.get_matching_blocks():
    for k in range(n): pos[i + k] = j + k
# interpolasi posisi untuk karakter yang tak cocok
last = -1
for i in range(len(S)):
    if pos[i] is not None: last = i; continue
    nxt = next((k for k in range(i, len(S)) if pos[k] is not None), None)
    if last < 0 and nxt is None: pos[i] = 0
    elif last < 0: pos[i] = max(0, pos[nxt] - (nxt - i))
    elif nxt is None: pos[i] = min(len(A) - 1, pos[last] + (i - last))
    else: pos[i] = pos[last] + (pos[nxt] - pos[last]) * (i - last) / (nxt - last)
tAt = lambda x: AT[min(len(AT) - 1, max(0, int(round(x))))]
first, lastc = {}, {}
for i, wi in enumerate(SW): first.setdefault(wi, i); lastc[wi] = i
for wi, w in enumerate(words):
    w['t0'] = round(tAt(pos[first[wi]]), 3); w['t1'] = round(tAt(pos[lastc[wi]]) + .06, 3)
for i in range(len(words) - 1):          # urut & tak tumpang tindih
    words[i + 1]['t0'] = max(words[i + 1]['t0'], words[i]['t0'] + .02)
    words[i]['t1'] = min(max(words[i]['t1'], words[i]['t0'] + .05), words[i + 1]['t0'] + .02)
cover = sum(1 for p in pos if p is not None) / max(1, len(pos))

# ---- caption: kalimat -> potongan <= maxc karakter
sents = []
for pi in range(len(narr)):
    cur = []
    for wi, w in enumerate(words):
        if w['p'] != pi: continue
        cur.append(wi)
        if re.search(r'[.!?…]["”)]*$', w['w']): sents.append(cur); cur = []
    if cur: sents.append(cur)
txtlen = lambda ids: len(' '.join(words[i]['w'] for i in ids))
def split_long(ids):
    if txtlen(ids) <= a.maxc: return [ids]
    best, bs = None, 1e9
    for k in range(2, len(ids) - 1):
        L, R = ids[:k], ids[k:]
        if txtlen(L) > a.maxc or txtlen(R) > a.maxc: continue
        pen = abs(txtlen(L) - txtlen(R)) * .3 - (12 if re.search(r'[,;:]$', words[ids[k - 1]]['w']) else 0) - (6 if words[ids[k]]['k'] in ('dan', 'tapi', 'lalu', 'dengan', 'karena', 'sambil', 'yang') else 0)
        if pen < bs: best, bs = k, pen
    if best is None: best = len(ids) // 2
    return split_long(ids[:best]) + split_long(ids[best:])
chunks = []
for s in sents:
    for part in split_long(s):
        if chunks and chunks[-1][-1] is not None and words[chunks[-1][-1]]['p'] == words[part[0]]['p'] and \
           txtlen(chunks[-1] + part) <= a.maxc and (words[part[0]]['t0'] - words[chunks[-1][-1]]['t1']) < .6 and txtlen(chunks[-1]) < 26:
            chunks[-1] = chunks[-1] + part      # gabung kalimat pendek dengan kalimat sesudahnya
        else: chunks.append(part)
caps = []
for i, ids in enumerate(chunks):
    t0 = words[ids[0]]['t0']; t1 = words[ids[-1]]['t1']
    nxt = words[chunks[i + 1][0]]['t0'] if i + 1 < len(chunks) else None
    t1 = (nxt - .04 if nxt is not None and nxt - t1 < .7 else t1 + .55)
    caps.append({'t0': round(t0, 3), 't1': round(max(t1, t0 + 1.0), 3), 'text': ' '.join(words[j]['w'] for j in ids)})

# ---- anchor
defs = json.load(open(os.path.join(ROOT, 'anchors.def.json')))
anc, ptr, miss = {}, 0, []
for d in defs:
    name, phrase = d[0], [norm(x) for x in d[1].split() if norm(x)]
    idx = d[2] if len(d) > 2 and isinstance(d[2], int) else 0; edge = d[3] if len(d) > 3 else 'start'
    found = None
    for i in range(ptr, len(words) - len(phrase) + 1):
        if all(words[i + k]['k'] == phrase[k] for k in range(len(phrase))): found = i; break
    if found is None: miss.append(name); continue
    wi = found + min(idx, len(phrase) - 1); anc[name] = words[wi]['t1' if edge == 'end' else 't0']; ptr = found
anc['end'] = words[-1]['t1']; anc['start'] = words[0]['t0']
g = lambda k: anc[k]
EV = {  # peristiwa bunyi & gerak (waktu audio asli, tanpa offset) — sumber tunggal untuk video (story.js) dan audio (mix.py)
 'bell1': [g('lonceng1') + .3 + i * 1.9 for i in range(3)], 'bell2': [g('lonceng2') - .2 + i * 1.9 for i in range(3)],
 'bell3': [g('lonceng3') + .0 + i * 1.9 for i in range(4)], 'bellsmall': [g('lkecil') + i * 1.15 for i in range(4)],
 'bar_lift': g('dorong') + .4, 'doors_open': g('engsel') - .1, 'doors_close': g('turun') - .5, 'bar_drop': g('turun') + 1.7,
 'wicket1': g('sempit') - 2.2, 'wicket2': g('pintulagi') - .2, 'run': [g('lari'), g('lonceng3')],
 'cart': [g('laras') + 1.0, g('angguk') + 1.0], 'knock': g('ketuk') + 1.4, 'coins': g('dompet') + 1.2, 'win': [g('satu'), g('dua'), g('tiga')],
 'wagon': [g('petani') - 2.0, g('petani') - 2.0 + 46.5 / 2.3], 'rules': [g('aturan1'), g('aturan2'), g('aturan3')]}
try: dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', a.audio]).decode().strip())
except Exception: dur = anc['end'] + .5
json.dump({'dur': dur, 'words': [{'w': w['w'], 't0': w['t0'], 't1': w['t1']} for w in words], 'captions': caps, 'anchors': anc, 'events': EV}, open(a.out, 'w'), ensure_ascii=False, indent=1)
# ---- SRT bersih (waktu audio asli, tanpa offset)
def ts(x): x = max(0, x); return '%02d:%02d:%02d,%03d' % (x // 3600, x % 3600 // 60, x % 60, round((x % 1) * 1000) % 1000)
os.makedirs(os.path.dirname(a.srt), exist_ok=True)
open(a.srt, 'w', encoding='utf-8').write('\n'.join(f"{i + 1}\n{ts(c['t0'])} --> {ts(c['t1'])}\n{c['text']}\n" for i, c in enumerate(caps)))
open(a.film_srt, 'w', encoding='utf-8').write('\n'.join(f"{i + 1}\n{ts(c['t0'] + a.lead)} --> {ts(c['t1'] + a.lead)}\n{c['text']}\n" for i, c in enumerate(caps)))   # SRT untuk video jadi (sudah digeser 'lead')
print(f"kata={len(words)} caption={len(caps)} anchor={len(anc)} cocok={cover:.1%} durasi_vo={dur:.2f}s")
if miss: print('ANCHOR TIDAK DITEMUKAN:', miss); sys.exit(1)
