#!/usr/bin/env python3
"""film/data/lines.json -> out/captions.srt  (potongan caption yang sama dengan di layar)"""
import json, os, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
d = json.load(open(os.path.join(ROOT, 'film/data/lines.json'))); out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'out/captions.srt')
ch = [c for l in d['lines'] for c in l['chunks']]
def ts(x): h, r = divmod(x, 3600); m, s = divmod(r, 60); return f'{int(h):02}:{int(m):02}:{int(s):02},{int(round((s - int(s)) * 1000)):03}'
os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, 'w', encoding='utf-8') as f:
    for i, c in enumerate(ch):
        nx = ch[i + 1]['t0'] if i + 1 < len(ch) else c['t1'] + .6
        f.write(f"{i + 1}\n{ts(c['t0'])} --> {ts(min(nx, c['t1'] + 1.2) - .02)}\n{c['text']}\n\n")
print('srt:', len(ch), 'cue ->', out)
