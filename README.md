# Sehari Jadi Pedagang di Jalur Rempah

Animasi piksel 2.5D (HD-2D) ±6 menit 42 detik: Najmi, pedagang dari pesisir utara Jawa, menjalani sehari di Kepulauan Banda — dari subuh di kapal, pasar rempah, tawar-menawar, hingga malam di tepi laut.

Seluruh gambar, musik, dan efek suara dibuat **dengan kode** (three.js + kanvas 2D). Narasi memakai **dua rekaman pengguna**:

- `voiceover/ep01/1.mp3`
- `voiceover/ep01/2.mp3`

Keduanya digabung menjadi satu WAV saat render, lalu diletakkan setelah kartu judul 5 detik. Tidak ada TTS, tidak ada aset eksternal, dan tidak ada kredit/watermark di layar.

## Render di GitHub Actions

1. Buka tab **Actions → Render film (HD-2D) → Run workflow**.
2. Untuk render final: biarkan `preview` tidak dicentang, pilih `1280x720`, `30` fps, `8` job, `ss=1`.
3. Untuk uji cepat: centang `preview` (480p, 12 fps, 4 job, selesai lebih cepat).
4. Hasil ada di **Artifacts → `film-jadi`**:
   - `sehari-jadi-pedagang.mp4` (H.264 + AAC, 1280×720, 30 fps)
   - `subtitles_id.srt` (subtitle Indonesia terpisah)
   - `poster.jpg` (frame 12 detik)
   - `voice.wav` (narasi saja)

Alur workflow:

- **prep** — gabung dua MP3 → `audio/vo.wav`; bangun `film/timeline.json` dari `film/timing.json` + `script/story.json`; sintesis musik/ambience; tulis SRT.
- **render** — matriks job, tiap job merender satu rentang frame dengan Playwright + Chromium (SwiftShader di runner).
- **final** — gabung potongan, loudnorm −14 LUFS, buat poster, unggah artifact.

## Film lain: Semalam Jadi Penjaga Mal — Part 1

Sumber film horor 9:16 ini ada di folder `mal-satpam/` (VO, naskah, transkrip, dan pipeline HD-2D sendiri). Workflow-nya ada di `.github/workflows/render-mal-satpam.yml` dan dijalankan lewat **Actions → Render film mal satpam (HD-2D, 9:16) → Run workflow**. Hasil akhirnya di artifact **`mal-satpam-final`**: `final.mp4` 1080×1920 30 fps, `captions.srt`, dan `poster.jpg`.

## Kredit & lisensi

- Mesin gaya HD-2D di `vendor/` dan sebagian `tools/`: Lemo-Opuscar (MIT). Kredit teknis lengkap ada di `NOTICE`; **tidak ditampilkan di layar**.
- three.js (MIT), Playwright (Apache-2.0).
- Font: Cinzel, Cormorant Garamond, IM Fell English (SIL OFL 1.1, via `@fontsource`).
- Naskah dan suara: milik pembuat film.
- Karakter, dunia, sprite, musik, dan ambience dibuat prosedural oleh kode di repo ini.

## Struktur

- `script/` — naskah dan `story.json` (84 baris sumber; timeline final 86 cue termasuk dua baris dialog).
- `film/` — dunia 3D (`banda.js`, `props.js`, `people.js`, `tod.js`), arahan kamera/aktor (`direction.js`), overlay 2D (`overlay.js`), halaman utama (`index.html`, `main.js`), timing VO (`timing.json`).
- `tools/` — `build_timeline.mjs`, `audio.py`, `srt.py`, `render.mjs`, `mux.sh`, `still.mjs`.
- `vendor/` — mesin gaya HD-2D (post-processing, sprite, caption).
- `voiceover/ep01/` — dua rekaman narasi pengguna.

## Uji lokal (opsional)

```bash
npm ci
npx playwright-core install chromium
node tools/build_timeline.mjs
# butuh ffmpeg + numpy/scipy:
python3 tools/audio.py
python3 tools/srt.py
node tools/still.mjs out/stills 1280 720 subuh_05@.5 siang_08b@.4
```

Di mesin tanpa GPU, WebGL bisa gagal; render final dijalankan di runner GitHub dengan SwiftShader.
