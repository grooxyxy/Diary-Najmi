# Sehari Jadi Penjaga Gerbang Kota — film animasi HD-2D

Film ±6 menit (gaya HD-2D: sprite pixel di diorama 3D, tilt-shift, bloom) yang dibuat dari **naskah + VO ElevenLabs + SRT** Anda,
memakai kit HD-2D (`kit/`). Semua waktu animasi **terikat ke kalimat naskah** (bukan ke detik tetap), jadi jika VO diganti, cukup render ulang.

## Cara render di GitHub (disarankan)
1. Buat repo baru di GitHub, unggah seluruh isi folder ini (termasuk `.github/`, `kit/`, `film/`).
2. Tab **Actions → Render film → Run workflow**. Pilih preset:
   | preset | ukuran | fps | perkiraan biaya |
   |---|---|---|---|
   | `draft` | 960×540 | 12 | murah, untuk cek cepat |
   | `standard` | 1280×720 | 24 | ±beberapa jam-CPU, dibagi ke shard |
   | `full` | 1920×1080 | 24 | terberat (±10 detik/frame per CPU di sandbox uji; runner GitHub 4 vCPU lebih cepat) |
3. `shards` = jumlah job paralel (maks. 20 di akun gratis). Opsi `from_s`/`to_s` merender potongan saja (mis. 100–130) untuk mengecek satu adegan.
4. Hasil di **Artifacts**: `film.mp4` (−14 LUFS), `film.srt` (subtitle sudah digeser mengikuti film), `naskah-vo.srt` (subtitle bersih mengikuti audio VO asli).
   Centang `publish_release` agar file jadi GitHub Release (artifact kedaluwarsa).

> Repo privat di akun gratis hanya punya 2000 menit/bulan: pakai `draft`/`standard`, atau repo publik (menit gratis).

> **Format potret 9:16 (default).** Kamera otomatis mundur/melebar di layar tegak agar semua tokoh tetap terlihat; teks judul & caption dibungkus dan dinaikkan dari area UI platform. Untuk lanskap: hapus centang `portrait` di Actions, atau `sh film/build.sh standard 1 landscape`.

## Render lokal
`sh film/build.sh draft|standard|full [jumlah_shard]` (butuh node 20+, ffmpeg 7+, python3 + numpy + scipy, Chromium untuk playwright).

## Struktur
- `film/vo/` — `vo.mp3`, `vo.srt` (transkripsi ASR), `naskah.txt` (teks benar). Ganti file ini untuk VO baru.
- `film/tools/align.py` — menyelaraskan naskah ↔ SRT (koreksi salah-dengar: "bularas"→"Bu Laras", dst.), membuat `timing.json` (kata, caption, 83 anchor, peristiwa bunyi) dan SRT bersih.
- `film/tools/mix.py` — musik orisinal (sintesis), ambience, efek (lonceng, engsel, langkah…) sinkron dengan peristiwa, VO di tengah.
- `film/world.js`, `people.js`, `story.js`, `main.js` — diorama, karakter pixel, koreografi/kamera/cahaya, overlay (judul, bab, caption).
- `film/tools/render_shard.mjs` — render sebagian frame → mp4; `.github/workflows/render.yml` memparalelkannya.
- `film/anchors.def.json` — daftar frasa naskah yang jadi titik sinkron.

Kredit/lisensi kit: lihat `kit/CREDITS.md` dan `kit/LICENSES`.
