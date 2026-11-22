#!/usr/bin/env python3
"""timeline.json -> subtitle SRT (satu cue per baris narasi; dialog diberi nama tokoh)."""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); TL = json.load(open(f'{ROOT}/film/timeline.json'))
def ts(x): h, r = divmod(x, 3600); m, s = divmod(r, 60); return ('%02d:%02d:%06.3f' % (h, m, s)).replace('.', ',')
out = []
for i, L in enumerate(TL['lines'], 1):
    text = f"{L['who'].upper()}: {L['text']}" if L.get('kind') == 'dlg' and L.get('who') else L['text']
    out.append(f"{i}\n{ts(L['t'])} --> {ts(L['t'] + L['dur'] + .35)}\n{text}\n")
os.makedirs(f'{ROOT}/out', exist_ok=True)
open(f'{ROOT}/out/subtitles_id.srt', 'w', encoding='utf-8').write('\n'.join(out))
print('srt:', len(out), 'cue ->', 'out/subtitles_id.srt')
