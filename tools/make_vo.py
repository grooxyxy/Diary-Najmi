#!/usr/bin/env python3
"""script/story.json -> naskah-voiceover.md / .txt (naskah rekaman bernomor, bisa dipakai merekam suara sendiri)."""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); S = json.load(open(f'{ROOT}/script/story.json', encoding='utf-8')); M = S['meta']
NOTE = {
 'subuh': ('tenang, pelan, setengah berbisik — baru bangun; "Kamu bukan sedang berlibur." ditekan datar lalu jeda', 'langit gelap kebiruan, lentera di geladak, peta pelayaran Jawa→Banda'),
 'pagi': ('hangat, mulai bersemangat; tempo sedang', 'pelabuhan ramai, kartu pala & fuli, enam jenis barang/cerita'),
 'jelangsiang': ('ingin tahu, jelas; beri jeda pendek di tiap penjelasan', 'pasar rempah, buah pala dibelah, perbandingan kering/lembap'),
 'siang': ('serius lalu lega; nada pamannya (kutipan pesan) lebih dalam', 'tawar-menawar, pesan paman, tiga pelajaran: mutu, risiko, kepercayaan'),
 'jelangsore': ('antusias, fokus; sebut "fuli" dengan jelas', 'fuli baru vs kering'),
 'sore': ('mulai cepat dan mendesak, lalu menurun; beri jeda setelah rantai kerja', 'angin berubah, awak bergegas, rantai kerja 6 tahap'),
 'malam': ('merenung, lambat, hangat; kalimat penutup pelan dan penuh', 'peta jaringan Nusantara, lima keahlian pedagang, penutup'),
}
md = [f"# Naskah Voiceover — {M['judul']}\n", f"- **Durasi:** {M['durasi']}  \n- **Narator:** {M['narator']} ({M['format']})  \n- **Jumlah baris:** {len(S['lines'])} (tiap baris = satu file suara; ID dipakai sebagai nama file rekaman)\n",
      "> Merekam sendiri? Simpan tiap baris sebagai `voices/custom/<ID>.wav` (atau mp3/m4a). Baris yang ada rekamannya otomatis dipakai menggantikan suara Edge TTS, dan animasi menyesuaikan durasinya.\n"]
tx = [f"{M['judul']}\nDurasi: {M['durasi']}  |  Narator: {M['narator']}\n"]
for sc in S['scenes']:
    ls = [l for l in S['lines'] if l['scene'] == sc['id']]; n = NOTE.get(sc['id'], ('', ''))
    md.append(f"\n## {sc['header']}\n"); md.append(f"*Gaya baca:* {n[0]}  \n*Visual:* {n[1]}\n"); md.append('| ID | Teks |\n|---|---|')
    tx.append(f"\n[{sc['header']}]\n")
    for l in ls: md.append(f"| `{l['id']}` | {l['text'].replace('|', '/')} |"); tx.append(f"({l['id']}) {l['text']}\n")
words = sum(len(l['text'].split()) for l in S['lines']); md.append(f"\n---\n*{words} kata · ±{words/2.5/60:.1f}–{words/2.2/60:.1f} menit dibaca dengan tempo wajar (jeda antarbaris & adegan ditambahkan animasi).*")
open(f'{ROOT}/naskah-voiceover.md', 'w', encoding='utf-8').write('\n'.join(md) + '\n'); open(f'{ROOT}/naskah-voiceover.txt', 'w', encoding='utf-8').write('\n'.join(tx))
print('ok', words, 'kata')
