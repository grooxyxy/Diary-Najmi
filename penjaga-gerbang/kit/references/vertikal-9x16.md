# Versi vertikal 1080x1920

Demo bawaan keras-kode 1920x1080 (16:9). Untuk film baru:
- Di `main.js` proyek ganti `const W = 1920, H = 1080` dengan `const W = +(Q.get('w') ?? 1080), H = +(Q.get('h') ?? 1920)` (Q dideklarasikan di baris yang sama: pindahkan ke atasnya) dan render dengan `--size 1080x1920`. Pastikan `camera.aspect = W / H`, canvas/overlay memakai W dan H.
- Lebar frame sempit: karakter ~1/12-1/8 tinggi frame tetap, tetapi komposisikan secara vertikal (diorama tinggi, kamera lebih tinggi/jauh, fov vertikal 30-40). Lateral tracking membutuhkan jarak lebih jauh.
- Teks suara: `captions.js` otomatis membesar 1.7x di layar potret (balon 30 unit lebar = ±550 px, teks ±31 px; caption narasi ±51 px). Atur `narrBottom: 250` di `makeCaptions` agar caption narasi di atas area UI platform, dan pastikan puncak kepala pembicara (anchor balon) tidak lebih tinggi dari ±150 px dari tepi atas. Chapter card dan judul di `ui.js` diperkecil tracking-nya.
- Tilt-shift: pita fokus tetap mengikuti tinggi proyeksi subjek (clamp .2-.8).
- Cek still tiap shot di 1080x1920 sebelum render penuh.
