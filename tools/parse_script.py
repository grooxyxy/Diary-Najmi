#!/usr/bin/env python3
"""Parse naskah .txt -> script/story.json (baris VO per kalimat + scene). Jalankan ulang kalau naskah berubah:
   python3 tools/parse_script.py naskah.txt"""
import re, json, sys
src = open(sys.argv[1] if len(sys.argv) > 1 else 'script/naskah.txt', encoding='utf8').read().splitlines()
SCENES = [  # kunci header -> (id, label kartu, subjudul)
  ('PEMBUKAAN',        'subuh',        'SUBUH',               'Kepulauan Banda'),
  ('PAGI',             'pagi',         'PAGI',                'Pelabuhan mulai ramai'),
  ('MENJELANG SIANG',  'jelangsiang',  'MENJELANG SIANG',     'Mengenal rempah'),
  ('SIANG — KES',      'siang',        'SIANG',               'Kesempatan yang hampir merugikan'),
  ('SIANG MENJELANG',  'jelangsore',   'SIANG MENJELANG SORE','Berburu fuli'),
  ('SORE',             'sore',         'SORE',                'Langit mulai berubah'),
  ('MALAM',            'malam',        'MALAM',               'Memahami Jalur Rempah'),
]
meta = {}; scenes = []; lines = []; cur = None; cnt = {}
for raw in src:
    s = raw.strip()
    if not s: continue
    m = re.match(r'^(JUDUL|DURASI|NARATOR|FORMAT):\s*(.*)$', s)
    if m: meta[m.group(1).lower()] = m.group(2); continue
    m = re.match(r'^\[(.+)\]$', s)
    if m:
        h = m.group(1)
        hit = None
        for key, sid, lab, sub in SCENES:
            if h.startswith(key) and (key != 'SIANG' or 'KES' in h) and (key != 'SIANG MENJELANG' or 'SIANG MENJELANG' in h):
                hit = (sid, lab, sub)
        # urutan cek: header spesifik menang
        for key, sid, lab, sub in SCENES:
            if h.upper().startswith(key) and len(key) > 6: hit = (sid, lab, sub) if (hit is None or True) else hit
        cur = hit; scenes.append({'id': cur[0], 'label': cur[1], 'sub': cur[2], 'header': h}); cnt[cur[0]] = 0
        continue
    # kalimat
    for sent in re.split(r'(?<=[.!?])\s+(?=[A-Z“"])', s):
        sent = sent.strip()
        if not sent: continue
        cnt[cur[0]] += 1
        lines.append({'id': f'{cur[0]}_{cnt[cur[0]]:02d}', 'scene': cur[0], 'text': sent})
json.dump({'meta': meta, 'scenes': scenes, 'lines': lines}, open('script/story.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print(meta)
for sc in scenes: print(sc['id'], sc['header'])
for l in lines: print(l['id'], '|', l['text'])
print(len(lines), 'baris', sum(len(l['text'].split()) for l in lines), 'kata')
