# Render

- Di VM/CI set `LEMO_ANGLE=swiftshader` sebelum render. Uji dengan still pertama: `cd $LIB && LEMO_ANGLE=swiftshader node core/render/still.mjs <proyek> 1 --size 1280x720`. Jika still kosong atau muncul "WebGL context lost", backend software belum aktif. (`swiftshader` = CPU, lebih lambat; dipakai bila GPU tidak terdeteksi atau konteks WebGL terputus.)
- Ukur: `time node core/render/still.mjs <proyek> 5 --size 1080x1920 --q 'ss=1'`; perkiraan total = detik/frame x durasi x fps.
- Preset (belum diukur, sesuaikan dengan hasil ukur):

| | ukuran | fps | `--q` | workers |
|---|---|---|---|---|
| Draf | 540x960 | 12 | `ss=1` | 2 |
| Final vertikal | 1080x1920 | 30 | `ss=1` (atau `ss=2` bila ada waktu) | 2-4 sesuai inti CPU |
| Final 16:9 | 1920x1080 | 30-60 | `ss=2` | 2-4 |

- Mesin lemah/CPU saja: ubah `const int N = 96;` menjadi `48` di `post_ts.js` proyek (tap blur kedalaman; biaya per piksel setengahnya).
- Jalankan di background (`nohup ... > render.log 2>&1 &`) dan pantau log. `video.mjs` tidak punya resume: pecah film panjang. Jangan jalankan dua render sekaligus pada CPU kecil.
- Frame kosong / "WebGL context lost": `LEMO_ANGLE=swiftshader`.
