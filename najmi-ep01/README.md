# Najmi — Episode 01: Pintu di Belakang Rumah

Animasi 3D-vector 9:16 (kit vasilias17) yang dikunci ke `audio/vo.wav` + `audio/vo.srt` (198,6 dtk).

> **Di repo Diary-Najmi:** sumber film ini ada di folder `najmi-ep01/`, sedangkan workflow-nya ada di root repo: `.github/workflows/render-najmi-ep01.yml`. Buka tab **Actions → Render Najmi Ep01 (3D vector 9:16) → Run workflow**. Petunjuk "push repo ini" di bawah hanya berlaku bila folder ini dipakai sebagai repo terpisah.

## Render di GitHub
1. Push repo ini ke GitHub.
2. **Actions → Render Najmi Ep01 → Run workflow** (default 1080x1920, 24 fps).
3. Ambil hasil di artifact `najmi-ep01`: `najmi-ep01.mp4` (teks) dan `najmi-ep01-notext.mp4`.

8 segmen dirender paralel (satu job per segmen) lalu digabung `scripts/assemble.sh`.

## Render lokal
```bash
npm install && npx playwright install chromium   # perlu ffmpeg di PATH
node scripts/render-scene.mjs s02 --fps 12 --size 540x960   # satu segmen -> out/s02.mp4
node scripts/render-scene.mjs s02 --still 30 --png x.png    # satu frame (cek framing)
for id in s01a s01b s02 s03 s04 s05 s06 s07; do node scripts/render-scene.mjs $id; done
scripts/assemble.sh
```

## Mengubah animasi
Semua kamera + gerak Najmi ada di `najmi-3d-vector/anim.js` (`SEGS`), waktu = detik di VO.
Segmen: s01a rumah luar (0–6) · s01b kamar (6–16,1) · s02 dapur (16,1–51,2) · s03 gudang/rak/ukiran (51,2–83,6)
· s04 pintu terbuka (83,6–115,2) · s05 padang (115,2–150,7) · s06 sungai (150,7–188,6) · s07 tutup pintu (188,6–198,6).

## Catatan
- `audio/vo.id.srt` = SRT hasil transkrip yang typo-nya dibetulkan (mengutuskan→memutuskan, "akhirnya"→"airnya", "dakal"→"akan"). Cue 15 "Curiously." sengaja dibiarkan — cek dengan audio.
- Musik & SFX dari naskah belum dibuat (tidak ada filenya); video memakai VO saja.
- Motor lewat, uap, dan latar dunia di balik pintu dibuat prosedural di `anim.js`.
