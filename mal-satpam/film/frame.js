// frame.js: satu sumber untuk ukuran frame, orientasi, zona aman platform dan penyesuaian fov.
// Ukuran = viewport yang diberikan alat render (--size WxH). Jangan mengetik 1920/1080 di tempat lain.
//   lanskap : node core/render/video.mjs <demo> --size 1920x1080
//   potret  : node core/render/video.mjs <demo> --size 1080x1920   (TikTok / Reels / Shorts)
// Query (--q) untuk penyetelan: fitm=0..1 (seberapa banyak lebar pandang lanskap dipertahankan di potret, default .4),
//                                px=<angka> (skala blur DOF; default dihitung otomatis).
const Q = new URLSearchParams(location.search);

export const W = innerWidth, H = innerHeight;
export const PORTRAIT = H > W;
// skala tata letak terhadap kanvas acuan: 1920 lebar (lanskap) atau 1080 lebar (potret)
export const K = PORTRAIT ? W / 1080 : W / 1920;

// Zona aman potret (px). Antarmuka TikTok/Reels/Shorts menutup: bar status + tab di atas, tombol suka/komentar di kanan,
// akun + deskripsi + musik di bawah. Angka ini sengaja konservatif (±10 % tinggi atas, 22 % bawah, 14 % kanan) dan
// berlaku untuk semua platform; platform bisa mengubah tata letaknya, jadi cek ulang dengan template resminya.
// Lanskap: tanpa batas.
export const SAFE = PORTRAIT
  ? { top: Math.round(H * .105), bottom: Math.round(H * .22), left: Math.round(W * .055), right: Math.round(W * .14) }
  : { top: 0, bottom: 0, left: 0, right: 0 };

// Penyesuaian fov. Kamera tiap adegan ditulis untuk 16:9 dengan fov vertikal 30-40. Dengan fov vertikal yang sama di 9:16,
// lebar pandang tinggal sepertiganya dan sisi diorama terpotong. Kita naikkan fov vertikal sebagian saja:
//   tan(v'/2) = tan(v/2) * R,  R = ((16/9) / aspek) ^ fitm
// fitm = 0 : fov vertikal tetap (tokoh besar, pandang sempit) · fitm = 1 : lebar pandang sama dengan lanskap (tokoh kecil).
export const FITM = +(Q.get('fitm') ?? .4);
export const R = PORTRAIT ? Math.pow((16 / 9) / (W / H), FITM) : 1;
const RAD = Math.PI / 180;
export const fitFov = v => PORTRAIT ? 2 * Math.atan(Math.tan(v * RAD / 2) * R) / RAD : v;

// Skala blur DOF (piksel). CoC dalam piksel mengikuti panjang fokus dalam piksel = (H/2)/tan(fov/2):
// 1080 tinggi lanskap sebagai acuan, jadi px = (H / 1080) / R.
export const PX = +(Q.get('px') ?? (H / 1080) / R);
