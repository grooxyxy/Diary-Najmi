# Semalam Jadi Penjaga Mal — Part 1 (animasi HD-2D 9:16)

Animasi 2.5D bergaya HD-2D (diorama 3D + sprite piksel) dari naskah, VO, dan transkrip Anda.
Dibuat dengan kit HD-2D yang Anda berikan (three.js + render lewat Chromium tanpa kepala), jadi **bisa dirender penuh di GitHub Actions** tanpa GPU.

> **Di repo Diary-Najmi:** sumber film ini ada di folder `mal-satpam/`, sedangkan workflow-nya ada di root repo: `.github/workflows/render-mal-satpam.yml`. Buka tab **Actions → Render film mal satpam (HD-2D, 9:16) → Run workflow**. Petunjuk "buat repo baru" di bawah hanya berlaku bila folder ini dipakai sebagai repo terpisah.

- Keluaran: `final.mp4` 1080×1920, 30 fps, ±131 dtk (VO 125,6 dtk + kartu "Bersambung ke Part 2"), `captions.srt`, `poster.jpg`
- Suara: **VO.mp3 Anda dipakai apa adanya**; suasana & foley (air mancur, eskalator berhenti, langkah, kotak musik yang tersendat, CCTV, dentum jantung) dibuat prosedural dan disinkronkan ke animasi.
- Caption di layar mengikuti suara (bukan timestamp transkrip yang dibulatkan ke detik: lihat "Sinkronisasi").

## Cara render di GitHub (±5 langkah)
1. Buat repo baru di GitHub, unggah **seluruh isi folder ini** (termasuk `.github/`).
2. Tab **Actions** → pilih workflow **Render film (HD-2D, 9:16)** → **Run workflow**.
   - `preset = draft` (540×960, 15 fps) untuk cek cepat dulu; `final` untuk hasil akhir. Centang `release` bila ingin hasil diunggah ke Releases.
3. Tunggu 4 tahap: `plan → prep → render (matrix, paralel) → assemble`.
4. Unduh artifact **film-final** (`final.mp4`, `captions.srt`, `poster.jpg`) di halaman run.
5. Mengulang dengan perubahan: commit, lalu jalankan workflow lagi.

Perkiraan beban: final = 3.930 frame dibagi 33 potongan × 120 frame; tiap job merender 120 frame dengan WebGL perangkat lunak (SwiftShader). Runner publik gratis menjalankan hingga 20 job bersamaan.
Waktu per frame di runner belum bisa saya ukur dari sini (di sandbox saya 1 CPU: 540×960 ≈ 2,5 dtk/frame, 1080×1920 ≈ 11 dtk/frame; runner 4 vCPU seharusnya lebih cepat). Jika job terlalu lama, kecilkan `PER` di `.github/workflows/render.yml` (langkah *plan*) atau pakai `draft`.

## Isi folder
```
.github/workflows/render.yml   alur render (plan, prep, render matrix, assemble)
film/                          halaman film (three.js): index.html, main.js, mall.js, world.js, cams.js, ui.js, people.js, ...
  world.js                     SUMBER WAKTU: bidikan, jalur penjaga, hitungan 1-7, lampu padam, senter, kotak musik
  cams.js                      kamera tiap bidikan (posisi, titik lihat, fov, fokus)
  data/lines.json              caption yang sudah diselaraskan dengan suara (dibuat tools/prep_vo.py)
  data/events.json             peristiwa untuk audio (dibuat tools/export_events.mjs)
audio/VO.mp3                   suara Anda
input/                         Naskah.txt, VO_Transcribe.txt, captions.txt (teks caption per baris transkrip)
tools/                         prep_vo.py (sinkron), export_events.mjs, mix.py (audio), render_chunk.mjs, plan.mjs, srt.py
kit/                           pustaka HD-2D (render, font, fungsi audio) + package.json
```

## Sinkronisasi
`VO_Transcribe.txt` bertimestamp detik bulat dan meleset sampai ±3 dtk dari suara asli (mis. baris pertama tertulis 0:00, padahal kata pertama baru di 0,09 dtk dan kalimat "lampu toko padam" di 2,9 dtk).
`tools/prep_vo.py` mengukur jeda bicara dari `VO.mp3`, lalu mencocokkan 52 baris transkrip ke kelompok segmen suara (dynamic programming), dan memecahnya jadi 75 potongan caption pendek. Hasilnya `film/data/lines.json`.
Angka yang dihitung "Satu… tujuh" (44,2–48,6 dtk) dan "Satu… enam" (95,1–98,6 dtk) diambil dari segmen suara itu juga (`COUNT1`, `COUNT2` di `world.js`), sehingga angka muncul di atas manekin tepat saat diucapkan.
**Jika Anda mengganti VO**: ganti `audio/VO.mp3` + `input/VO_Transcribe.txt` + `input/captions.txt` (jumlah baris sama), commit; workflow menyelaraskan ulang otomatis. Peristiwa visual di `world.js` (mis. kotak musik, "Lagu itu mulai lagi" 76,1 dtk) perlu disesuaikan manual bila VO berubah.

## Alur cerita → visual
| Waktu | Adegan |
|---|---|
| 0–10 | Diorama mal 5 lantai dari jauh; lampu toko padam satu per satu; tersisa satpam mungil + senter di atrium |
| 10–23 | Patroli lantai 1, periksa pintu rolling; close-up senter (cahaya kecil) |
| 23–35 | Air mancur terlalu keras; eskalator berhenti satu per satu, gema naik sampai lantai atas |
| 35–60 | Naik ke lantai 2; hitung manekin 1–7 (angka muncul di atas kepala); senter meredup; ia pergi lebih cepat, manekin ke-7 menoleh |
| 60–80 | Lantai 3, toko mainan: kotak musik tersendat; ditutup, sunyi total, lima & sepuluh langkah; lagu mulai lagi dari belakang |
| 80–126 | Berlari turun ke pos jaga; layar CCTV: hitung ulang 6; layar pojok memperlihatkan manekin ke-7 di belakangnya, tangan terangkat ke bahu |
| 126–131 | Hitam → "BERSAMBUNG KE PART 2" |

Senter berfungsi sebagai "ukuran ketakutan": terangnya turun setiap kejadian janggal (`torchLevel` di `world.js`) dan mati saat ia duduk di pos.

## Uji di komputer sendiri (opsional)
```
cd kit && npm ci && npx playwright-core install chromium-headless-shell
LEMO_ANGLE=swiftshader node core/render/still.mjs ../film 12 44 120 --size 540x960 --out ../out/stills
python3 tools/prep_vo.py && node tools/export_events.mjs && python3 tools/mix.py && python3 tools/srt.py
LEMO_ANGLE=swiftshader node tools/render_chunk.mjs --a 0 --b 60 --fps 30 --size 540x960 --out out/chunk.mp4
```
Butuh Node ≥ 20, Python 3 (numpy, scipy), ffmpeg (mux akhir memerlukan ffmpeg ≥ 7; di workflow sudah dipasang).

## Yang sudah dan belum saya uji
- Sudah: seluruh bidikan diperiksa lewat still render (540×960 dan 1080×1920), potongan video dirender & digabung dengan ffmpeg, audio dibuat (131,0 dtk, puncak −0,9 dBFS), alur YAML tervalidasi sintaksnya.
- Belum: jalan penuh di runner GitHub (tidak ada akses dari sini), dan mux akhir `mux.sh` (sandbox saya ffmpeg 6.1; script itu menolak <7). Bila langkah *assemble* gagal, kirim lognya.
- Audio belum saya dengar (hanya diukur levelnya); mohon cek keseimbangan VO vs efek.

## Kredit
Kit HD-2D oleh Lemo-Opuscar (lihat `CREDITS-hd2d-kit.md`, `kit/LICENSE`, `kit/LICENSES/`). Font Cinzel, Cormorant Garamond, IM Fell English: SIL OFL. Semua gambar/sprite/suara selain VO dibuat dari kode.
