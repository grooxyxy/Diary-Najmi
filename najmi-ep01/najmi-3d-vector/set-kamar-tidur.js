// ============================================================================
// set-kamar-tidur.js — KAMAR TIDUR UTAMA NAJMI (Jakarta).
// Dibangun dengan skill majidmanzarpour/threejs-game-skills
// (threejs-aaa-graphics-builder): silhouette dulu, authored forms
// (Lathe/Tube/Extrude + custom displaced BufferGeometry), mergeGeometries
// via bake() untuk pengulangan (buku, daun, papan lantai), material kit
// bersama (MeshStandardMaterial — BUKAN Toon langsung — supaya converter
// Sakura bisa mengubahnya), lighting key + fill + rim + practical.
//
// SKALA & STAGING — LEGA, BUKAN SEMPIT:
//   Lantai 6,0 m (x -3..+3) x 5,0 m (z -2,5..+2,5), dinding 3,2 m.
//   Ini staging DIPERBESAR dari denah asli rumah Najmi (gambar denah:
//   kamar tidur utama di kiri-belakang, gudang di pojok) supaya karakter
//   Najmi Tall Tale (~1,58 m) punya ruang gerak yang lega — kasur 1,5 m,
//   lemari, meja belajar, dan area lantai kosong di tengah untuk berdiri.
//   Open-front dollhouse: HANYA dinding belakang (z=-2,5), kiri (x=-3),
//   kanan (x=+3) + lantai; TANPA dinding depan (z=+2,5) dan TANPA plafon
//   penuh (hanya balok kayu + lis plafon), supaya kamera dari +z bisa
//   melihat isi kamar. Origin (0,0,0) = tengah lantai, tempat Najmi berdiri.
//
//   Zona: kasur HERO kiri-belakang | nakas kiri + kanan kasur |
//   jendela besar tengah-belakang (sinar pagi) + bangku jendela |
//   lemari 2 pintu kanan-belakang | meja belajar + kursi kanan |
//   rak dinding kiri | karpet + pouf tengah | gitar, ransel, sepatu,
//   sandal, keranjang cucian sebagai props lantai.
//   Semua prop MeshStandardMaterial; kaca transparent opacity 0.35;
//   emissive hanya lampu / layar laptop / bohlam string light.
//   TANPA karakter. Jangan set scene.background — index.html sudah set.
// ============================================================================
import * as THREE from 'three';
import { rngKit, sagCurve, bake, trs } from './vendor/sakura/src/core/util.js';
import { countTriangles } from './vendor/buildings-detailed.js';

const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0, ...o });

// ---------- material kit bersama (technical-art: shared roles) ----------
const MAT = {
  floorWood: null, // diisi canvasTex di bawah
  wallCream: std({ color: 0xf3e6cf, roughness: 0.95 }),
  wallSage: std({ color: 0xcfe0c8, roughness: 0.95 }),
  wainscot: std({ color: 0xe8dcc3, roughness: 0.85 }),
  trimWhite: std({ color: 0xfbf6ea, roughness: 0.7 }),
  beamWood: std({ color: 0x6b4a2c, roughness: 0.8 }),
  bedWood: std({ color: 0x7a5230, roughness: 0.75 }),
  bedWoodDark: std({ color: 0x5d3d22, roughness: 0.8 }),
  sheetWhite: std({ color: 0xf7f2e6, roughness: 0.95 }),
  blanketBlue: std({ color: 0x4a6b8a, roughness: 0.98 }),
  blanketCream: std({ color: 0xe8d9b8, roughness: 0.98 }),
  pillowWhite: std({ color: 0xfdfaf2, roughness: 0.95 }),
  pillowYellow: std({ color: 0xf2c94c, roughness: 0.95 }),
  wardrobeWood: std({ color: 0x8a6a42, roughness: 0.7 }),
  wardrobeDark: std({ color: 0x6e5232, roughness: 0.75 }),
  brass: std({ color: 0xc9a227, metalness: 0.7, roughness: 0.35 }),
  mirror: std({ color: 0xdfe9ec, metalness: 0.9, roughness: 0.12 }),
  glass: std({ color: 0xbfe3ea, transparent: true, opacity: 0.35, roughness: 0.1, metalness: 0.1 }),
  deskWood: std({ color: 0x9a7448, roughness: 0.7 }),
  chairWood: std({ color: 0x6b4a2c, roughness: 0.8 }),
  fabricGrey: std({ color: 0x8a8f96, roughness: 0.98 }),
  leatherBrown: std({ color: 0x7a4a2e, roughness: 0.85 }),
  curtainCream: std({ color: 0xf6ead2, roughness: 0.98, side: THREE.DoubleSide }),
  curtainSage: std({ color: 0xa8c6a0, roughness: 0.98, side: THREE.DoubleSide }),
  leafGreen: std({ color: 0x4d7a3a, roughness: 0.9, side: THREE.DoubleSide }),
  leafLight: std({ color: 0x6da34f, roughness: 0.9, side: THREE.DoubleSide }),
  soilDark: std({ color: 0x3a2a1a, roughness: 1 }),
  potTerra: std({ color: 0xb5653a, roughness: 0.85 }),
  paperWhite: std({ color: 0xfbf8f0, roughness: 0.95 }),
  black: std({ color: 0x232326, roughness: 0.8 }),
  metal: std({ color: 0x9aa0a8, metalness: 0.55, roughness: 0.4 }),
  lampWarm: std({ color: 0xffe9b0, emissive: 0xffc46b, emissiveIntensity: 1.6 }),
  screenGlow: std({ color: 0x9fd8ff, emissive: 0x86c9ff, emissiveIntensity: 0.9, roughness: 0.4 }),
};

// ---------- canvas textures ----------
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

/** Lantai kayu: papan horizontal + serat + nat gelap. */
function floorTex() {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#a97e4e'; g.fillRect(0, 0, w, h);
    const r = rngKit(7);
    const ph = 64; // tinggi satu papan
    for (let y = 0; y < h; y += ph) {
      const v = 150 + ((y / ph) % 3) * 12;
      g.fillStyle = `rgb(${v + 18},${v - 28},${v - 78})`;
      g.fillRect(0, y + 2, w, ph - 4);
      // serat kayu
      g.strokeStyle = 'rgba(90,55,20,0.28)'; g.lineWidth = 1.5;
      for (let i = 0; i < 7; i++) {
        const yy = y + r.range(6, ph - 6);
        g.beginPath(); g.moveTo(0, yy);
        for (let x = 0; x <= w; x += 64) g.lineTo(x, yy + r.range(-3, 3));
        g.stroke();
      }
      // sambungan papan (staggered)
      const jx = ((y / ph) % 2 === 0) ? 170 : 340;
      g.fillStyle = 'rgba(60,35,15,0.55)';
      g.fillRect(jx, y + 2, 3, ph - 4);
      g.fillRect(0, y, w, 3);
    }
  }, [3, 2.5]);
}

/** Karpet tengah: krem + border terakota + motif wajik. */
function rugTex() {
  return canvasTex(512, 384, (g, w, h) => {
    g.fillStyle = '#e9dcc0'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#c65f3d'; g.fillRect(0, 0, w, 26); g.fillRect(0, h - 26, w, 26);
    g.fillRect(0, 0, 26, h); g.fillRect(w - 26, 0, 26, h);
    g.strokeStyle = '#c65f3d'; g.lineWidth = 4; g.strokeRect(40, 40, w - 80, h - 80);
    g.strokeStyle = '#7a8a5a'; g.lineWidth = 3;
    const r = rngKit(11);
    for (let y = 70; y < h - 50; y += 62) {
      for (let x = 70; x < w - 50; x += 62) {
        const s = 20 + r.range(-3, 3);
        g.beginPath();
        g.moveTo(x, y - s); g.lineTo(x + s, y); g.lineTo(x, y + s); g.lineTo(x - s, y);
        g.closePath(); g.stroke();
        g.fillStyle = '#7a8a5a';
        g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2); g.fill();
      }
    }
  });
}

/** Poster webtoon "DIARY NAJMI" di dinding kanan. */
function posterTex() {
  return canvasTex(256, 384, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#ffd98a'); grad.addColorStop(0.55, '#ffb37a'); grad.addColorStop(1, '#7a9cc6');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff3c4'; g.beginPath(); g.arc(196, 66, 30, 0, Math.PI * 2); g.fill();
    // siluet lumbung + bukit (garis sederhana)
    g.fillStyle = '#5a7a4a';
    g.beginPath(); g.moveTo(0, 300); g.quadraticCurveTo(80, 240, 160, 292);
    g.quadraticCurveTo(210, 318, 256, 288); g.lineTo(256, 384); g.lineTo(0, 384); g.fill();
    g.fillStyle = '#6b4a2c';
    g.fillRect(96, 250, 64, 52); // lumbung
    g.beginPath(); g.moveTo(88, 252); g.lineTo(128, 222); g.lineTo(168, 252); g.closePath(); g.fill();
    g.fillStyle = '#fff8e8'; g.textAlign = 'center';
    g.font = 'bold 40px sans-serif'; g.fillText('DIARY', w / 2, 52);
    g.fillText('NAJMI', w / 2, 96);
    g.font = 'bold 20px sans-serif'; g.fillText('EP.01 — RISET WEBTOON', w / 2, 340);
    g.strokeStyle = '#fff8e8'; g.lineWidth = 5; g.strokeRect(8, 8, w - 16, h - 16);
  });
}

/** Kertas sketsa webtoon Najmi: panel komik + figur stick + balon kata. */
function sketchTex() {
  return canvasTex(256, 320, (g, w, h) => {
    g.fillStyle = '#fbf8f0'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#3a3a3a'; g.lineWidth = 3;
    g.strokeRect(14, 14, w - 28, 120); // panel 1
    g.strokeRect(14, 146, 110, 110);   // panel 2
    g.strokeRect(136, 146, 106, 110);  // panel 3
    // figur stick Najmi + syal kuning di panel 1
    g.lineWidth = 2.5;
    g.beginPath(); g.arc(70, 60, 16, 0, Math.PI * 2); g.stroke(); // kepala
    g.beginPath(); g.moveTo(70, 76); g.lineTo(70, 108); g.stroke();
    g.beginPath(); g.moveTo(70, 88); g.lineTo(48, 100); g.moveTo(70, 88); g.lineTo(92, 100); g.stroke();
    g.beginPath(); g.moveTo(70, 108); g.lineTo(56, 128); g.moveTo(70, 108); g.lineTo(86, 128); g.stroke();
    g.strokeStyle = '#e8b400'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(56, 80); g.lineTo(88, 80); g.stroke();
    // balon kata
    g.strokeStyle = '#3a3a3a'; g.lineWidth = 2;
    g.beginPath(); g.ellipse(180, 52, 44, 24, 0, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(150, 68); g.lineTo(128, 84); g.lineTo(162, 72); g.stroke();
    g.fillStyle = '#3a3a3a'; g.font = 'bold 15px sans-serif'; g.textAlign = 'center';
    g.fillText('Hah?!', 180, 57);
    g.fillText('Lumbung', 190, 300);
    g.font = '13px sans-serif'; g.fillText('sketsa — Najmi', 70, 300);
  });
}

/** Layar laptop: editor webtoon (panel + timeline). */
function laptopScreenTex() {
  return canvasTex(256, 160, (g, w, h) => {
    g.fillStyle = '#1e2433'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffd98a'; g.fillRect(12, 12, 110, 66);
    g.fillStyle = '#6b4a2c'; g.fillRect(30, 52, 40, 26);
    g.beginPath(); g.moveTo(24, 54); g.lineTo(50, 36); g.lineTo(76, 54); g.closePath(); g.fill();
    g.fillStyle = '#2c3550'; g.fillRect(132, 12, 112, 66);
    g.fillStyle = '#7ad0ff'; g.font = 'bold 13px monospace'; g.textAlign = 'left';
    g.fillText('panel_01', 138, 30); g.fillText('panel_02', 138, 50); g.fillText('panel_03', 138, 68);
    g.fillStyle = '#3a435e'; g.fillRect(12, 90, 232, 26);
    g.fillStyle = '#e8b400'; g.fillRect(12, 90, 150, 26);
    g.fillStyle = '#e8e8e8'; g.font = 'bold 12px monospace';
    g.fillText('▶  webtoon — diary-najmi.ep01', 12, 138);
  });
}

/** Pemandangan pagi di balik jendela: langit + atap kampung + pohon. */
function windowViewTex() {
  return canvasTex(512, 384, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#a8d4f0'); grad.addColorStop(0.6, '#ffe3a3'); grad.addColorStop(1, '#f7c98a');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff6d8'; g.beginPath(); g.arc(400, 70, 34, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath(); g.ellipse(120, 70, 60, 18, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(300, 110, 70, 20, 0, 0, Math.PI * 2); g.fill();
    // atap-atap kampung
    g.fillStyle = '#8a5a3a';
    for (const [x, y, s] of [[40, 260, 90], [170, 280, 110], [320, 255, 100], [430, 285, 80]]) {
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + s / 2, y - 46); g.lineTo(x + s, y); g.closePath(); g.fill();
      g.fillRect(x + 6, y, s - 12, 124 - (y - 260));
    }
    g.fillStyle = '#5a7a4a';
    for (const [x, y, r] of [[30, 330, 42], [150, 350, 50], [280, 335, 44], [470, 345, 46]]) {
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = '#7a9c5a'; g.fillRect(0, 340, w, 44);
  });
}

// ---------- mesh helpers (pola set-gang-detail.js) ----------
function box(w, h, d, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = true; m.receiveShadow = true; return m;
}
function cyl(rt, rb, h, seg, mat) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.castShadow = true; m.receiveShadow = true; return m;
}
function sph(r, mat, ws = 12, hs = 10) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, ws, hs), mat);
  m.castShadow = true; m.receiveShadow = true; return m;
}
function plane(w, h, mat) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.receiveShadow = true; return m;
}
function put(m, x, y, z, ry = 0, rx = 0, rz = 0) {
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz); return m;
}
function noShadow(m) { m.castShadow = false; m.receiveShadow = false; return m; }

/** Gabung daftar {geometry, matrix} jadi SATU mesh (mergeGeometries). */
function mergeParts(list, mat, parent) {
  if (!list.length) return null;
  const m = new THREE.Mesh(bake(list), mat);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m);
  return m;
}

// ---------- pintu interior (mode rumah, 28 Nov 2026) ----------
// Bukaan 0,75 x 1,75 m LOKAL (x1,2 di set-rumah.js = 0,9 x 2,1 m final).
// Dipakai hanya bila buildKamarTidur dipanggil dengan opts.doors —
// set mandiri ?set=kamar-tidur TANPA doors sama sekali tidak berubah.
const DOOR_W = 0.75, DOOR_H = 1.75;

/** Segmen dinding berlubang (lihat set-rumah-rooms.js): daftar {a,b,w,h}. */
function wallSegs(len, H, openings) {
  const edges = new Set([-len / 2, len / 2]);
  for (const o of openings) { edges.add(o.a0); edges.add(o.a1); }
  const xs = [...edges].sort((p, q) => p - q);
  const segs = [];
  for (let i = 0; i < xs.length - 1; i++) {
    const a0 = xs[i], a1 = xs[i + 1];
    if (a1 - a0 < 0.01) continue;
    const am = (a0 + a1) / 2;
    const cov = openings.filter(o => am > o.a0 && am < o.a1);
    if (!cov.length) { segs.push({ a: am, b: H / 2, w: a1 - a0, h: H }); continue; }
    const lo = Math.min(...cov.map(o => o.b0));
    const hi = Math.max(...cov.map(o => o.b1));
    if (lo > 0.01) segs.push({ a: am, b: lo / 2, w: a1 - a0, h: lo });
    if (hi < H - 0.01) segs.push({ a: am, b: (hi + H) / 2, w: a1 - a0, h: H - hi });
  }
  return segs;
}

/** Apakah rentang [a0,a1] bersinggungan dengan salah satu rentang pintu. */
function hitsDoor(a0, a1, spans) {
  return spans.some(([s0, s1]) => a0 < s1 - 0.01 && a1 > s0 + 0.01);
}

/** Pintu interior: kusen + daun HIJAU (0x2e9e6a — sama dengan doorUnit
 *  rooms.js, pintu hijau klasik rumah Indonesia; hijau terang supaya
 *  dari denah atas pun terbaca) tebal 0,08 m, terbuka LEBAR 1,0 rad
 *  (~57°) + gagang kuningan. Grup di (x, 0, z) dengan ry — sumbu lokal
 *  x = lebar bukaan, +z lokal = arah daun membuka (ke dalam ruangan).
 *  `hinge`: 1 = engsel di jamb kiri (-x lokal). */
function doorUnit(g, x, z, ry, hinge = 1) {
  const dg = new THREE.Group();
  for (const s of [-1, 1]) {
    const jamb = box(0.08, DOOR_H + 0.04, 0.14, MAT.bedWoodDark);
    put(jamb, s * (DOOR_W / 2), (DOOR_H + 0.04) / 2, 0); dg.add(jamb);
  }
  const head = box(DOOR_W + 0.08, 0.08, 0.14, MAT.bedWoodDark);
  put(head, 0, DOOR_H + 0.04, 0); dg.add(head);
  const leafG = new THREE.Group();
  leafG.position.set(-hinge * (DOOR_W / 2 - 0.04), 0, 0);
  const leaf = box(DOOR_W - 0.1, DOOR_H - 0.06, 0.08, std({ color: 0x2e9e6a, roughness: 0.7 }));
  put(leaf, hinge * (DOOR_W - 0.1) / 2, (DOOR_H - 0.06) / 2, 0); leafG.add(leaf);
  const panel = box(DOOR_W - 0.3, DOOR_H - 0.5, 0.02, std({ color: 0x4cbf8a, roughness: 0.7 }));
  put(panel, hinge * (DOOR_W - 0.1) / 2, (DOOR_H - 0.06) / 2, 0.05); leafG.add(panel);
  const knob = sph(0.035, MAT.brass, 10, 8);
  put(knob, hinge * (DOOR_W - 0.18), 1.02, 0.075); leafG.add(knob);
  leafG.rotation.y = -hinge * 1.0;
  dg.add(leafG);
  put(dg, x, 0, z, ry); g.add(dg);
}

/** Displace vertex plane sepanjang sumbu z lokal: fn(x, y) -> dz. */
function displaceZ(geo, fn) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    p.setZ(i, p.getZ(i) + fn(p.getX(i), p.getY(i)));
  }
  geo.computeVertexNormals();
  return geo;
}

// ---------- lantai + dinding + plafon terbuka ----------
// `doors` (mode rumah saja, 28 Nov 2026): { back: [pusat-x...], right: [pusat-z...],
// front: [pusat-x...] } — dinding utara + timur (+ selatan bila openSide
// 'east') dibangun bersegmen di sekitar bukaan pintu (0,75 x 1,75 m
// lokal) + daun pintu; wainscot + skirting dilewati di rentang pintu.
// Tanpa doors, shell SAMA PERSIS seperti sebelumnya.
// `openSide` (28 Nov 2026, 4 arah hadap): 'south' (default — terbuka ke
// selatan, seperti set mandiri) | 'east' (mode rumah: terbuka ke TIMUR /
// koridor, selatan jadi dinding baru + pintu 3 di x 1,458). Dinding
// selatan baru berpusat di lokal z 2,40 (dunia 5,88) — mukanya (5,82 /
// 5,94) tidak sebidang dengan dinding utara kamar kerja (5,88 / 6,00).
function buildShell(scene, doors = null, openSide = 'south') {
  const g = new THREE.Group();
  MAT.floorWood = std({ map: floorTex(), roughness: 0.75 });
  const floor = plane(6, 5, MAT.floorWood);
  put(floor, 0, 0, 0, 0, -Math.PI / 2); g.add(floor);

  const hasFront = openSide !== 'south'; // dinding selatan baru (openSide 'east')
  const dBack = doors?.back ?? [], dRight = doors?.right ?? [], dFront = doors?.front ?? [];
  const dSpan = (c) => [c - DOOR_W / 2, c + DOOR_W / 2];
  const backSpans = dBack.map(dSpan), rightSpans = dRight.map(dSpan),
    frontSpans = dFront.map(dSpan);

  // dinding belakang (z=-2,5) — 4 segmen dengan LUBANG jendela asli
  // (x -0,2..1,6, y 0,95..2,45) supaya pemandangan pagi terlihat lewat kaca
  if (!dBack.length) {
    const backL = box(2.86, 3.2, 0.12, MAT.wallCream); put(backL, -1.63, 1.6, -2.56); g.add(backL);
    const backR = box(1.46, 3.2, 0.12, MAT.wallCream); put(backR, 2.33, 1.6, -2.56); g.add(backR);
    const backB = box(1.8, 0.95, 0.12, MAT.wallCream); put(backB, 0.7, 0.475, -2.56); g.add(backB);
    const backT = box(1.8, 0.75, 0.12, MAT.wallCream); put(backT, 0.7, 2.825, -2.56); g.add(backT);
  } else {
    // dinding 6,12 lebar (menutup sudut seperti versi asli) — jendela +
    // 2 pintu dipotong dari segmen via wallSegs
    const openings = [{ a0: -0.2, a1: 1.6, b0: 0.95, b1: 2.45 }];
    for (const c of dBack) openings.push({ a0: c - DOOR_W / 2, a1: c + DOOR_W / 2, b0: 0, b1: DOOR_H });
    for (const s of wallSegs(6.12, 3.2, openings)) {
      const seg = box(s.w, s.h, 0.12, MAT.wallCream); put(seg, s.a, s.b, -2.56); g.add(seg);
    }
  }
  // dinding kiri (x=-3) dan kanan (x=+3) — kanan HILANG bila openSide 'east'
  const left = box(0.12, 3.2, 5.12, MAT.wallCream); put(left, -3.06, 1.6, 0); g.add(left);
  if (openSide !== 'east') {
    if (!dRight.length) {
      const right = box(0.12, 3.2, 5.12, MAT.wallCream); put(right, 3.06, 1.6, 0); g.add(right);
    } else {
      const openings = dRight.map((c) => ({ a0: c - DOOR_W / 2, a1: c + DOOR_W / 2, b0: 0, b1: DOOR_H }));
      for (const s of wallSegs(5.12, 3.2, openings)) {
        const seg = box(0.12, s.h, s.w, MAT.wallCream); put(seg, 3.06, s.b, s.a); g.add(seg);
      }
    }
  }
  // dinding depan / selatan BARU (z=+2,4) — hanya bila openSide 'east'
  // (mode rumah: kamar menghadap timur). Bukaan pintu 3 di x 1,458.
  if (hasFront) {
    if (!dFront.length) {
      const front = box(6.12, 3.2, 0.12, MAT.wallCream); put(front, 0, 1.6, 2.4); g.add(front);
    } else {
      const openings = dFront.map((c) => ({ a0: c - DOOR_W / 2, a1: c + DOOR_W / 2, b0: 0, b1: DOOR_H }));
      for (const s of wallSegs(6.12, 3.2, openings)) {
        const seg = box(s.w, s.h, 0.12, MAT.wallCream); put(seg, s.a, s.b, 2.4); g.add(seg);
      }
    }
  }
  // kusen + daun pintu (daun sedikit terbuka, ke dalam kamar)
  for (const c of dBack) doorUnit(g, c, -2.5, 0, 1);
  for (const c of dRight) doorUnit(g, 3.0, c, -Math.PI / 2, -1);
  // Pintu depan (selatan): ry=PI — daun membuka ke utara (ke dalam kamar),
  // engsel di jamb timur (hinge 1 = jamb -x lokal -> +x dunia).
  for (const c of dFront) doorUnit(g, c, 2.4, Math.PI, 1);

  // wainscot bawah (panel + rel) — merge per dinding
  const wains = [];
  const railGeo = new THREE.BoxGeometry(1, 0.06, 0.03);
  const stileGeo = new THREE.BoxGeometry(0.06, 0.78, 0.03);
  const panelGeo = new THREE.BoxGeometry(0.62, 0.66, 0.02);
  for (let x = -2.6; x <= 2.61; x += 0.8) {
    if (!hitsDoor(x - 0.5, x + 0.5, backSpans)) wains.push({ geometry: railGeo, matrix: trs(x, 0.92, -2.49) });
    if (!hitsDoor(x - 0.43, x - 0.37, backSpans)) wains.push({ geometry: stileGeo, matrix: trs(x - 0.4, 0.5, -2.49) });
    if (!hitsDoor(x - 0.31, x + 0.31, backSpans)) wains.push({ geometry: panelGeo, matrix: trs(x, 0.5, -2.495) });
  }
  wains.push({ geometry: stileGeo, matrix: trs(2.98, 0.5, -2.49) });
  // wainscot dinding depan (selatan) — cermin dinding belakang
  if (hasFront) {
    for (let x = -2.6; x <= 2.61; x += 0.8) {
      if (!hitsDoor(x - 0.5, x + 0.5, frontSpans)) wains.push({ geometry: railGeo, matrix: trs(x, 0.92, 2.325) });
      if (!hitsDoor(x - 0.43, x - 0.37, frontSpans)) wains.push({ geometry: stileGeo, matrix: trs(x - 0.4, 0.5, 2.325) });
      if (!hitsDoor(x - 0.31, x + 0.31, frontSpans)) wains.push({ geometry: panelGeo, matrix: trs(x, 0.5, 2.33) });
    }
    wains.push({ geometry: stileGeo, matrix: trs(2.98, 0.5, 2.325) });
  }
  for (const s of [-1, 1]) {
    if (s > 0 && openSide === 'east') continue; // dinding kanan tidak ada
    const spans = s > 0 ? rightSpans : [];
    for (let z = -2.1; z <= 2.11; z += 0.8) {
      if (!hitsDoor(z - 0.5, z + 0.5, spans)) wains.push({ geometry: railGeo, matrix: trs(s * 2.99, 0.92, z, 0, Math.PI / 2, 0) });
      if (!hitsDoor(z - 0.43, z - 0.37, spans)) wains.push({ geometry: stileGeo, matrix: trs(s * 2.99, 0.5, z - 0.4, 0, Math.PI / 2, 0) });
      if (!hitsDoor(z - 0.31, z + 0.31, spans)) wains.push({ geometry: panelGeo, matrix: trs(s * 2.995, 0.5, z, 0, Math.PI / 2, 0) });
    }
  }
  mergeParts(wains, MAT.wainscot, g);

  // skirting board (lis lantai) 3 dinding — dipecah di bukaan pintu
  if (!dBack.length) {
    const skirtB = box(6.0, 0.12, 0.03, MAT.trimWhite); put(skirtB, 0, 0.06, -2.485); g.add(skirtB);
  } else {
    // di bawah jendela dinding tetap padat — lis nyambung [-0,2, 2,025]
    for (const [a0, a1] of [[-3.0, -0.95], [-0.2, 2.025], [2.775, 3.0]]) {
      const sk = box(a1 - a0, 0.12, 0.03, MAT.trimWhite); put(sk, (a0 + a1) / 2, 0.06, -2.485); g.add(sk);
    }
  }
  const skL = box(0.03, 0.12, 5.0, MAT.trimWhite); put(skL, -2.985, 0.06, 0); g.add(skL);
  if (openSide !== 'east') {
    if (!dRight.length) {
      const skR = box(0.03, 0.12, 5.0, MAT.trimWhite); put(skR, 2.985, 0.06, 0); g.add(skR);
    } else {
      for (const [a0, a1] of [[-2.5, -0.375], [0.375, 2.5]]) {
        const sk = box(0.03, 0.12, a1 - a0, MAT.trimWhite); put(sk, 2.985, 0.06, (a0 + a1) / 2); g.add(sk);
      }
    }
  }
  // skirting dinding depan (selatan) — celah dihitung dari pintu depan
  if (dFront.length) {
    const gaps = [];
    let cur = -3.0;
    for (const c of [...dFront].sort((a, b) => a - b)) {
      const a0 = c - DOOR_W / 2, a1 = c + DOOR_W / 2;
      if (a0 - cur > 0.12) gaps.push([cur, a0]);
      cur = Math.max(cur, a1);
    }
    if (3.0 - cur > 0.12) gaps.push([cur, 3.0]);
    for (const [a0, a1] of gaps) {
      const sk = box(a1 - a0, 0.12, 0.03, MAT.trimWhite); put(sk, (a0 + a1) / 2, 0.06, 2.325); g.add(sk);
    }
  }
  // lis plafon (cornice) di puncak dinding yang ada — tanpa plafon penuh
  const corB = box(6.0, 0.1, 0.05, MAT.trimWhite); put(corB, 0, 3.14, -2.48); g.add(corB);
  for (const s of [-1, 1]) {
    if (s > 0 && openSide === 'east') continue; // dinding kanan tidak ada
    const co = box(0.05, 0.1, 5.0, MAT.trimWhite); put(co, s * 2.98, 3.14, 0); g.add(co);
  }
  if (hasFront) {
    const corF = box(6.0, 0.1, 0.05, MAT.trimWhite); put(corF, 0, 3.14, 2.325); g.add(corF);
  }
  // balok kayu ekspos melintang (4 buah) — plafon terbuka
  for (const z of [-2.0, -0.7, 0.6, 1.9]) {
    const beam = box(6.0, 0.18, 0.22, MAT.beamWood); put(beam, 0, 3.1, z); g.add(beam);
  }
  // karpet tengah + rumbai (merge)
  const rug = plane(2.4, 1.7, std({ map: rugTex(), roughness: 0.98 }));
  put(rug, 0.4, 0.012, 0.55, 0, -Math.PI / 2); g.add(rug);
  const fringe = [];
  const frGeo = new THREE.BoxGeometry(0.02, 0.008, 0.09);
  for (let i = 0; i < 18; i++) {
    const x = -0.7 + i * 0.13;
    fringe.push({ geometry: frGeo, matrix: trs(x, 0.012, -0.34) });
    fringe.push({ geometry: frGeo, matrix: trs(x, 0.012, 1.44) });
  }
  mergeParts(fringe, MAT.blanketCream, g);

  scene.add(g);
  return g;
}

// ---------- jendela besar + tirai + bangku jendela ----------
function buildWindow(scene) {
  const g = new THREE.Group();
  const cx = 0.7, w = 1.8, sillY = 0.95, topY = 2.45, wz = -2.5;

  // pemandangan pagi di balik kaca (bidang di luar dinding, emissive agar
  // tetap terang meski matahari datang dari arah belakangnya)
  const viewTex = windowViewTex();
  const view = plane(w + 0.1, topY - sillY + 0.1, std({
    map: viewTex, emissive: 0xffffff, emissiveMap: viewTex, emissiveIntensity: 0.55, roughness: 0.9,
  }));
  put(view, cx, (sillY + topY) / 2, -2.68); noShadow(view); g.add(view);
  // kedalaman luar: atap kampung + pohon 3D di balik jendela (terlihat lewat kaca)
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-0.5, 0); roofShape.lineTo(0, 0.42); roofShape.lineTo(0.5, 0); roofShape.closePath();
  for (let i = 0; i < 4; i++) {
    const hx = -0.6 + i * 0.85, hz = -3.4 - (i % 2) * 0.8, hs = 0.8 + (i % 3) * 0.25;
    const house = new THREE.Group();
    const hBody = box(0.9, 0.55, 0.7, std({ color: [0xe8dcc3, 0xd8c8a8, 0xc8b898, 0xe0d0b8][i], roughness: 0.95 }));
    put(hBody, 0, 0.275, 0); house.add(hBody);
    const hRoof = new THREE.Mesh(
      new THREE.ExtrudeGeometry(roofShape, { depth: 0.75, bevelEnabled: false, curveSegments: 4 }),
      std({ color: [0x8a5a3a, 0x7a4a2e, 0x9a6a42, 0x6b4a2c][i], roughness: 0.9 }));
    hRoof.castShadow = true; put(hRoof, 0, 0.55, -0.375); house.add(hRoof);
    const win = box(0.16, 0.2, 0.02, std({ color: 0xffe9b0, emissive: 0xffd98a, emissiveIntensity: 0.5 }));
    put(win, -0.2, 0.32, 0.36); house.add(win);
    put(house, hx, -0.6, hz, (i % 2 ? 0.15 : -0.1)); house.scale.setScalar(hs); g.add(house);
  }
  for (let i = 0; i < 4; i++) {
    const tx = -1.4 + i * 0.95, tz = -3.2 - (i % 2) * 0.9;
    const trunk = cyl(0.05, 0.07, 0.5, 6, MAT.beamWood); put(trunk, tx, -0.35, tz); g.add(trunk);
    const crown = sph(0.42, MAT.leafGreen, 12, 10); put(crown, tx, 0.05, tz); crown.scale.set(1, 1.15, 1); g.add(crown);
    const crown2 = sph(0.28, MAT.leafLight, 10, 8); put(crown2, tx + 0.2, 0.3, tz); g.add(crown2);
  }

  // kusen: jamb (sisi dalam lubang) + bingkai + mullion + ambang
  const jambM = std({ color: 0x8a7a62, roughness: 0.9 });
  const jTop = box(w + 0.16, 0.08, 0.12, jambM); put(jTop, cx, topY + 0.02, -2.56); g.add(jTop);
  const jBot = box(w + 0.16, 0.08, 0.12, jambM); put(jBot, cx, sillY - 0.02, -2.56); g.add(jBot);
  const jL = box(0.08, topY - sillY, 0.12, jambM); put(jL, cx - w / 2 - 0.02, (sillY + topY) / 2, -2.56); g.add(jL);
  const jR = box(0.08, topY - sillY, 0.12, jambM); put(jR, cx + w / 2 + 0.02, (sillY + topY) / 2, -2.56); g.add(jR);
  const frameM = MAT.trimWhite;
  const ft = 0.09; // tebal kusen
  const fTop = box(w + 0.16, ft, 0.1, frameM); put(fTop, cx, topY + 0.02, wz); g.add(fTop);
  const fBot = box(w + 0.16, ft, 0.1, frameM); put(fBot, cx, sillY - 0.02, wz); g.add(fBot);
  const fL = box(ft, topY - sillY, 0.1, frameM); put(fL, cx - w / 2 - 0.02, (sillY + topY) / 2, wz); g.add(fL);
  const fR = box(ft, topY - sillY, 0.1, frameM); put(fR, cx + w / 2 + 0.02, (sillY + topY) / 2, wz); g.add(fR);
  const mullV = box(0.05, topY - sillY, 0.07, frameM); put(mullV, cx, (sillY + topY) / 2, wz); g.add(mullV);
  const mullH = box(w, 0.05, 0.07, frameM); put(mullH, cx, (sillY + topY) / 2, wz); g.add(mullH);
  // kaca 4 panel (transparan, tanpa bayangan) + ambang menonjol
  for (const sx of [-0.45, 0.45]) {
    for (const sy of [-0.375, 0.375]) {
      const gl = plane(0.82, 0.67, MAT.glass);
      put(gl, cx + sx, (sillY + topY) / 2 + sy, -2.47); noShadow(gl); g.add(gl);
    }
  }
  const sill = box(w + 0.3, 0.06, 0.18, MAT.trimWhite); put(sill, cx, sillY - 0.08, -2.42); g.add(sill);
  // rel + ring gorden
  const rod = cyl(0.02, 0.02, w + 0.7, 8, MAT.brass);
  put(rod, cx, 2.62, -2.4, 0, 0, Math.PI / 2); g.add(rod);
  const rings = [];
  const ringGeo = new THREE.TorusGeometry(0.035, 0.008, 6, 12);
  for (let i = 0; i < 9; i++) {
    rings.push({ geometry: ringGeo, matrix: trs(cx - w / 2 - 0.25 + i * 0.29, 2.62, -2.4) });
  }
  mergeParts(rings, MAT.brass, g);

  // tirai berlipat: PlaneGeometry di-displace gelombang (lipatan + flare bawah)
  const curtain = (x, mat) => {
    const geo = new THREE.PlaneGeometry(0.62, 1.85, 40, 48);
    displaceZ(geo, (px, py) => {
      const t = (0.925 - py) / 1.85; // 0 atas -> 1 bawah
      return Math.sin(px * 26) * (0.035 + 0.05 * t) + Math.sin(px * 11 + 1.3) * 0.02;
    });
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true; m.receiveShadow = true;
    put(m, x, 1.72, -2.38); g.add(m);
  };
  curtain(cx - w / 2 - 0.28, MAT.curtainCream);
  curtain(cx + w / 2 + 0.28, MAT.curtainSage);
  // tali pengikat tirai (simpul di tengah panel)
  for (const s of [-1, 1]) {
    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.012, 6, 14), MAT.brass);
    put(tie, cx + s * (w / 2 + 0.28), 1.35, -2.3, 0, 0, Math.PI / 2);
    tie.castShadow = true; g.add(tie);
  }
  // sinar pagi: bidang cahaya hangat miring dari jendela ke lantai
  const shaft = plane(1.7, 2.6, std({
    color: 0xffe9b0, transparent: true, opacity: 0.07,
    emissive: 0xffd98a, emissiveIntensity: 0.5, side: THREE.DoubleSide, depthWrite: false,
  }));
  put(shaft, 0.7, 1.15, -1.35, 0, -0.5, 0.35); noShadow(shaft); g.add(shaft);

  // bangku jendela (window seat) + bantal kecil + buku
  const bench = box(1.9, 0.42, 0.5, MAT.bedWood); put(bench, cx, 0.21, -2.22); g.add(bench);
  const benchTop = box(1.94, 0.06, 0.54, MAT.blanketCream); put(benchTop, cx, 0.45, -2.22); g.add(benchTop);
  for (const s of [-1, 1]) {
    const pil = sph(0.16, s < 0 ? MAT.pillowYellow : MAT.pillowWhite, 16, 12);
    put(pil, cx + s * 0.68, 0.56, -2.24, s * 0.3, 0, s * 0.15);
    pil.scale.set(1, 0.75, 0.6); g.add(pil);
  }
  const bBook = box(0.24, 0.05, 0.17, std({ color: 0x7a4a6a, roughness: 0.85 }));
  put(bBook, cx + 0.1, 0.51, -2.2, 0.4); g.add(bBook);

  scene.add(g);
  return g;
}

// ---------- kasur HERO + 2 nakas ----------
// `doors` (mode rumah): nakas A pindah dari (-0,82,-2,18) — menutupi
// bukaan pintu gudang — ke dinding kanan-depan (2,74, 2,0), menghadap barat.
// `openSide='east'` (28 Nov 2026, 4 arah hadap): nakas A geser ke utara
// (2,74, 1,9) — posisi lama (z 2,225) menabrak dinding selatan baru
// (z 2,34..2,46); lampu meja ikut (lihat buildLights).
function buildBed(scene, doors = null, openSide = 'south') {
  const g = new THREE.Group();
  const bx = -1.95, bz = -1.35; // tengah kasur

  // rangka kayu + kaki + bilah dipan (merge)
  const frame = box(1.5, 0.28, 2.1, MAT.bedWood); put(frame, bx, 0.32, bz); g.add(frame);
  const foot = box(1.5, 0.34, 0.08, MAT.bedWoodDark); put(foot, bx, 0.3, bz + 1.05); g.add(foot);
  const slats = [];
  const slatGeo = new THREE.BoxGeometry(1.34, 0.03, 0.12);
  for (let i = 0; i < 9; i++) {
    slats.push({ geometry: slatGeo, matrix: trs(bx, 0.47, bz - 0.9 + i * 0.22) });
  }
  mergeParts(slats, MAT.bedWoodDark, g);
  for (const [sx, sz] of [[-0.68, -0.98], [0.68, -0.98], [-0.68, 0.98], [0.68, 0.98]]) {
    const leg = cyl(0.045, 0.035, 0.2, 8, MAT.bedWoodDark);
    put(leg, bx + sx, 0.1, bz + sz); g.add(leg);
  }
  // headboard Extrude lengkung (arch) + bevel
  const hs = new THREE.Shape();
  hs.moveTo(-0.75, 0); hs.lineTo(-0.75, 0.72);
  hs.quadraticCurveTo(0, 1.18, 0.75, 0.72);
  hs.lineTo(0.75, 0); hs.closePath();
  const hbGeo = new THREE.ExtrudeGeometry(hs, {
    depth: 0.06, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2, curveSegments: 18,
  });
  const hb = new THREE.Mesh(hbGeo, MAT.bedWood);
  hb.castShadow = true; hb.receiveShadow = true;
  put(hb, bx, 0.46, -2.44); g.add(hb);
  // list ukir tipis di headboard (2 bilah horizontal)
  for (const y of [0.72, 0.92]) {
    const trim = box(1.34, 0.04, 0.03, MAT.bedWoodDark);
    put(trim, bx, y, -2.36); g.add(trim);
  }

  // kasur + seprai + kancing tufting (merge bola kecil)
  const mattress = box(1.44, 0.22, 2.04, MAT.sheetWhite); put(mattress, bx, 0.57, bz); g.add(mattress);
  const sheet = box(1.46, 0.03, 2.06, std({ color: 0xeef3f6, roughness: 0.95 }));
  put(sheet, bx, 0.69, bz); g.add(sheet);
  const buttons = [];
  const btnGeo = new THREE.SphereGeometry(0.015, 8, 6);
  for (let ix = -1; ix <= 1; ix++) {
    for (let iz = -2; iz <= 2; iz++) {
      buttons.push({ geometry: btnGeo, matrix: trs(bx + ix * 0.4, 0.705, bz + iz * 0.32) });
    }
  }
  mergeParts(buttons, std({ color: 0xd8d2c2, roughness: 0.9 }), g);

  // 2 bantal (sphere pipih) + 2 bantal lempar kecil
  const pillow = (x, z, mat, ry) => {
    const p = sph(0.32, mat, 36, 26);
    put(p, x, 0.78, z, ry, 0, 0.06); p.scale.set(1.05, 0.42, 0.72); g.add(p);
  };
  pillow(bx - 0.36, bz - 0.78, MAT.pillowWhite, 0.08);
  pillow(bx + 0.36, bz - 0.78, MAT.pillowWhite, -0.08);
  const throwP = (x, z, mat, ry) => {
    const p = sph(0.2, mat, 28, 20);
    put(p, x, 0.8, z, ry, 0, 0.1); p.scale.set(1, 0.55, 0.7); g.add(p);
  };
  throwP(bx - 0.3, bz - 0.42, MAT.pillowYellow, 0.3);
  throwP(bx + 0.32, bz - 0.42, MAT.blanketBlue, -0.25);

  // selimut berombak menutupi 2/3 bawah kasur (displaced plane 48x32)
  const blGeo = new THREE.PlaneGeometry(1.5, 1.35, 64, 44);
  displaceZ(blGeo, (px, py) => (
    Math.sin(px * 9) * 0.03 + Math.sin(py * 7 + 1.2) * 0.035
    + Math.max(0, Math.sin((py + 0.675) * 9)) * 0.02
  ));
  const blanket = new THREE.Mesh(blGeo, MAT.blanketBlue);
  blanket.castShadow = true; blanket.receiveShadow = true;
  put(blanket, bx, 0.72, bz + 0.32, 0, -Math.PI / 2); g.add(blanket);
  // lipatan selimut di ujung kaki (gulungan + bidang lipat)
  const fold = cyl(0.07, 0.07, 1.44, 12, MAT.blanketCream);
  put(fold, bx, 0.76, bz + 0.98, 0, 0, Math.PI / 2); g.add(fold);
  // rok kasur (bed skirt) — bidang bergelombang di sisi depan
  const skirtGeo = new THREE.PlaneGeometry(1.5, 0.26, 48, 10);
  displaceZ(skirtGeo, (px) => Math.sin(px * 14) * 0.02);
  const skirt = new THREE.Mesh(skirtGeo, MAT.blanketCream);
  skirt.castShadow = true; skirt.receiveShadow = true;
  put(skirt, bx, 0.16, bz + 1.06); g.add(skirt);

  // ---- nakas A (kanan kasur, di bawah jam dinding) + lampu Lathe menyala
  const nkA = new THREE.Group();
  const nBody = box(0.55, 0.5, 0.45, MAT.bedWood); put(nBody, 0, 0.25, 0); nkA.add(nBody);
  const nTop = box(0.59, 0.04, 0.49, MAT.bedWoodDark); put(nTop, 0, 0.52, 0); nkA.add(nTop);
  const drawer = box(0.45, 0.14, 0.02, MAT.bedWoodDark); put(drawer, 0, 0.36, 0.23); nkA.add(drawer);
  const knob = sph(0.02, MAT.brass, 8, 6); put(knob, 0, 0.36, 0.25); nkA.add(knob);
  // lampu meja: base + batang + kap Lathe + bohlam emissive
  const lampBase = new THREE.Mesh(
    new THREE.LatheGeometry([[0, 0], [0.09, 0], [0.09, 0.02], [0.04, 0.04], [0.03, 0.05]].map((p) => new THREE.Vector2(p[0], p[1])), 24),
    MAT.brass);
  lampBase.castShadow = true; put(lampBase, -0.14, 0.54, 0); nkA.add(lampBase);
  const stem = cyl(0.012, 0.012, 0.3, 6, MAT.brass); put(stem, -0.14, 0.7, 0); nkA.add(stem);
  const shadePts = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    shadePts.push(new THREE.Vector2(0.07 + t * 0.09, 0.02 + t * 0.16));
  }
  const shade = new THREE.Mesh(new THREE.LatheGeometry(shadePts, 24),
    std({ color: 0xf2d8a0, roughness: 0.9, side: THREE.DoubleSide, emissive: 0xffc46b, emissiveIntensity: 0.25 }));
  shade.castShadow = true; put(shade, -0.14, 0.84, 0); nkA.add(shade);
  const bulb = sph(0.035, MAT.lampWarm, 12, 8); put(bulb, -0.14, 0.9, 0); nkA.add(bulb);
  // buku + jam weker + gelas di nakas A
  const bk1 = box(0.2, 0.035, 0.15, std({ color: 0x7a4a6a, roughness: 0.85 })); put(bk1, 0.12, 0.56, -0.08, 0.2); nkA.add(bk1);
  const bk2 = box(0.18, 0.03, 0.14, std({ color: 0x4a6b8a, roughness: 0.85 })); put(bk2, 0.12, 0.59, -0.08, -0.1); nkA.add(bk2);
  const clockBody = box(0.14, 0.12, 0.05, MAT.black); put(clockBody, 0.14, 0.6, 0.12, -0.3); nkA.add(clockBody);
  const clockFace = cyl(0.05, 0.05, 0.012, 16, MAT.paperWhite);
  put(clockFace, 0.14, 0.6, 0.155, 0, Math.PI / 2 - 0.3, 0); nkA.add(clockFace);
  for (const s of [-1, 1]) {
    const bell = sph(0.028, MAT.metal, 10, 6);
    put(bell, 0.14 + s * 0.055, 0.68, 0.12); bell.scale.set(1, 0.7, 1); nkA.add(bell);
  }
  const glassCup = new THREE.Mesh(
    new THREE.LatheGeometry([[0, 0], [0.035, 0], [0.04, 0.01], [0.042, 0.09], [0.04, 0.1]].map((p) => new THREE.Vector2(p[0], p[1])), 16),
    MAT.glass);
  put(glassCup, -0.02, 0.54, 0.14); nkA.add(glassCup);
  // nakas A (2,74, 2,225): digeser ke selatan 0,225 karena meja belajar
  // (dz 1,15) kini menabrak posisi lamanya (2,74, 2,0); ujung selatan
  // nakas kini rata dengan tepi lantai (z 2,5), masih di dalam ruangan.
  // (28 Nov 2026, openSide 'east': nakas A geser ke utara (z 1,9) —
  // posisi lama menabrak dinding selatan baru (z 2,34..2,46); ujung
  // selatan nakas (z 2,125) kini 0,215 dari muka dinding baru.)
  const nkAZ = openSide === 'east' ? 1.9 : (doors ? 2.225 : -2.18);
  put(nkA, doors ? 2.74 : -0.82, 0, nkAZ, doors ? -Math.PI / 2 : 0); g.add(nkA);

  // ---- nakas B (dinding kiri, dekat kaki kasur): buku + tanaman kecil
  const nkB = new THREE.Group();
  const nbBody = box(0.45, 0.48, 0.6, MAT.bedWood); put(nbBody, 0, 0.24, 0); nkB.add(nbBody);
  const nbTop = box(0.49, 0.04, 0.64, MAT.bedWoodDark); put(nbTop, 0, 0.5, 0); nkB.add(nbTop);
  const nbDrawer = box(0.02, 0.13, 0.5, MAT.bedWoodDark); put(nbDrawer, 0.23, 0.35, 0); nkB.add(nbDrawer);
  const nbKnob = sph(0.02, MAT.brass, 8, 6); put(nbKnob, 0.25, 0.35, 0); nkB.add(nbKnob);
  const nbk1 = box(0.16, 0.04, 0.22, std({ color: 0x4a7a5a, roughness: 0.85 })); put(nbk1, 0, 0.54, -0.12, 0.15); nkB.add(nbk1);
  const nbk2 = box(0.15, 0.035, 0.2, std({ color: 0xc65f3d, roughness: 0.85 })); put(nbk2, 0, 0.575, -0.12, -0.2); nkB.add(nbk2);
  const pot = new THREE.Mesh(
    new THREE.LatheGeometry([[0, 0], [0.06, 0], [0.075, 0.02], [0.07, 0.1], [0.08, 0.11]].map((p) => new THREE.Vector2(p[0], p[1])), 18),
    MAT.potTerra);
  pot.castShadow = true; put(pot, 0, 0.52, 0.16); nkB.add(pot);
  const soil = cyl(0.06, 0.06, 0.02, 12, MAT.soilDark); put(soil, 0, 0.62, 0.16); nkB.add(soil);
  for (let i = 0; i < 5; i++) {
    const leaf = sph(0.035, MAT.leafLight, 8, 6);
    const a = (i / 5) * Math.PI * 2;
    put(leaf, Math.cos(a) * 0.03, 0.68, 0.16 + Math.sin(a) * 0.03, 0, 0, 0);
    leaf.scale.set(0.6, 1.6, 0.6); nkB.add(leaf);
  }
  put(nkB, -2.74, 0, 0.35); g.add(nkB);

  scene.add(g);
  return g;
}

// ---------- lemari 2 pintu kanan-belakang ----------
// `doors` (mode rumah): lemari pindah dari (2,38,-2,14) — menutupi bukaan
// pintu KM/WC — ke dinding kiri-depan (-2,7, 1,75), menghadap timur.
// Dibangun dalam koordinat lokal (tengah lemari = origin), grup dipindah
// di akhir supaya posisi + rotasi cukup satu `put`.
function buildWardrobe(scene, doors = null) {
  const g = new THREE.Group();
  const wx = 0, wz = 0; // tengah lemari (lokal)
  // badan lemari
  const body = box(1.2, 2.4, 0.6, MAT.wardrobeWood); put(body, wx, 1.2, wz); g.add(body);
  const top = box(1.28, 0.06, 0.66, MAT.wardrobeDark); put(top, wx, 2.43, wz); g.add(top);
  const plinth = box(1.24, 0.1, 0.62, MAT.wardrobeDark); put(plinth, wx, 0.05, wz); g.add(plinth);
  // list panel timbul di sisi kiri-kanan badan
  for (const s of [-1, 1]) {
    const panel = box(0.04, 2.1, 0.44, MAT.wardrobeDark);
    put(panel, wx + s * 0.61, 1.2, wz); g.add(panel);
  }
  // rel gantung + baju di dalam (terlihat lewat pintu kanan yang terbuka)
  const rail = cyl(0.015, 0.015, 1.1, 8, MAT.metal);
  put(rail, wx, 2.05, wz + 0.05, 0, 0, Math.PI / 2); g.add(rail);
  const shirtCols = [0xe8e0d0, 0x7a8a9a, 0xc65f3d, 0x4a7a5a, 0xf2c94c, 0x8a6a9a, 0x3a5a76];
  const shirtShape = new THREE.Shape();
  shirtShape.moveTo(-0.16, 0.3); shirtShape.lineTo(-0.24, 0.22); shirtShape.lineTo(-0.16, 0.14);
  shirtShape.lineTo(-0.14, -0.28); shirtShape.lineTo(0.14, -0.28); shirtShape.lineTo(0.16, 0.14);
  shirtShape.lineTo(0.24, 0.22); shirtShape.lineTo(0.16, 0.3);
  shirtShape.quadraticCurveTo(0, 0.22, -0.16, 0.3);
  for (let i = 0; i < 7; i++) {
    const shGeo = new THREE.ExtrudeGeometry(shirtShape, { depth: 0.02, bevelEnabled: false, curveSegments: 8 });
    const sh = new THREE.Mesh(shGeo, std({ color: shirtCols[i], roughness: 0.95, side: THREE.DoubleSide }));
    sh.castShadow = true;
    put(sh, wx - 0.5 + i * 0.17, 1.72, wz + 0.02, (i % 2 ? 0.06 : -0.06));
    g.add(sh);
    // gantungan: kait torus + segitiga batang
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 5, 10, Math.PI), MAT.metal);
    put(hook, wx - 0.5 + i * 0.17, 2.06, wz + 0.03, 0, 0, 0); g.add(hook);
  }
  // pintu kiri (tertutup, bercermin) — panel + cermin + gagang kuningan
  const doorL = new THREE.Group();
  const dPanel = box(0.56, 2.24, 0.04, MAT.wardrobeWood); put(dPanel, 0, 0, 0); doorL.add(dPanel);
  const dMould = box(0.44, 1.9, 0.02, MAT.wardrobeDark); put(dMould, 0, 0.05, 0.025); doorL.add(dMould);
  const mirror = plane(0.36, 1.7, MAT.mirror);
  put(mirror, 0, 0.05, 0.04); doorL.add(mirror);
  const handle = cyl(0.012, 0.012, 0.16, 6, MAT.brass);
  put(handle, 0.22, 0, 0.05); doorL.add(handle);
  put(doorL, wx - 0.3, 1.22, wz + 0.32); g.add(doorL);
  // pintu kanan TERBUKA ~25° (engsel di x kanan: origin grup = engsel,
  // panel digeser -0,28 agar berputar pada engsel, bukan pada tengah pintu)
  const doorR = new THREE.Group();
  const dPanelR = box(0.56, 2.24, 0.04, MAT.wardrobeWood); put(dPanelR, -0.28, 0, 0); doorR.add(dPanelR);
  const dMouldR = box(0.44, 1.9, 0.02, MAT.wardrobeDark); put(dMouldR, -0.28, 0.05, 0.025); doorR.add(dMouldR);
  const handleR = cyl(0.012, 0.012, 0.16, 6, MAT.brass);
  put(handleR, -0.5, 0, 0.05); doorR.add(handleR);
  put(doorR, wx + 0.58, 1.22, wz + 0.32);
  doorR.rotation.y = -0.45; // terbuka ke arah kamar
  g.add(doorR);
  // tumpukan baju lipat di rak bawah lemari (terlihat dari celah pintu)
  const folds = [];
  const foldGeo = new THREE.BoxGeometry(0.4, 0.09, 0.3);
  const foldCols = [0xe8e0d0, 0x4a6b8a, 0xf2c94c];
  for (let i = 0; i < 3; i++) {
    folds.push({ geometry: foldGeo, matrix: trs(wx + 0.3, 0.32 + i * 0.1, wz + 0.1, 0, (i - 1) * 0.08, 0) });
  }
  mergeParts(folds, std({ color: 0xffffff, roughness: 0.98 }), g); // warna per-item di-merge satu slot
  // (catatan: lipatan memakai satu material putih-krem agar draw call tetap 1)
  // posisi akhir: mandiri = kanan-belakang; mode rumah = dinding kiri-depan
  put(g, doors ? -2.7 : 2.38, 0, doors ? 1.75 : -2.14, doors ? Math.PI / 2 : 0);
  scene.add(g);
  return g;
}

// ---------- meja belajar + kursi (kanan) ----------
function buildDesk(scene) {
  const g = new THREE.Group();
  const dx = 2.62, dz = 1.15; // tengah meja, menempel dinding kanan — dz 1,15 (bukan 0,85): daun pintu timur (bukaan 1,0 rad) menyapu sampai z 0,335 lokal, meja digeser ke selatan supaya tidak tertabrak daun
  // meja: top + 2 kaki panel + laci + gagang
  const top = box(0.62, 0.05, 1.5, MAT.deskWood); put(top, dx, 0.74, dz); g.add(top);
  for (const s of [-1, 1]) {
    const leg = box(0.56, 0.72, 0.05, MAT.deskWood);
    put(leg, dx, 0.36, dz + s * 0.7); g.add(leg);
  }
  const drawerUnit = box(0.5, 0.5, 0.45, MAT.deskWood); put(drawerUnit, dx, 0.48, dz - 0.48); g.add(drawerUnit);
  for (let i = 0; i < 2; i++) {
    const dr = box(0.02, 0.18, 0.38, MAT.wardrobeDark);
    put(dr, dx - 0.26, 0.38 + i * 0.24, dz - 0.48); g.add(dr);
    const k = sph(0.018, MAT.brass, 8, 6); put(k, dx - 0.28, 0.38 + i * 0.24, dz - 0.48); g.add(k);
  }
  // laptop terbuka: base + keyboard (merge) + layar emissive
  const lapBase = box(0.36, 0.02, 0.26, std({ color: 0x2e3238, roughness: 0.5, metalness: 0.3 }));
  put(lapBase, dx - 0.08, 0.775, dz + 0.15, 0.35); g.add(lapBase);
  const keys = [];
  const keyGeo = new THREE.BoxGeometry(0.028, 0.006, 0.028);
  // tuts di-merge dalam ruang scene: putar offset lokal sebesar ry laptop (0,35)
  const kcx = dx - 0.08, kcz = dz + 0.15, ka = 0.35;
  const kc = Math.cos(ka), ks = Math.sin(ka);
  for (let rI = 0; rI < 4; rI++) {
    for (let cI = 0; cI < 8; cI++) {
      const lx = (cI - 3.5) * 0.036, lz = (rI - 1.5) * 0.036;
      keys.push({
        geometry: keyGeo,
        matrix: trs(kcx + lx * kc + lz * ks, 0.788, kcz - lx * ks + lz * kc, 0, ka, 0),
      });
    }
  }
  mergeParts(keys, std({ color: 0x14161a, roughness: 0.6 }), g);
  const lapScreen = new THREE.Group();
  const scr = box(0.36, 0.24, 0.015, std({ color: 0x2e3238, roughness: 0.5, metalness: 0.3 }));
  put(scr, 0, 0.12, 0); lapScreen.add(scr);
  const scrFace = plane(0.33, 0.21, std({ map: laptopScreenTex(), emissive: 0xffffff, emissiveMap: laptopScreenTex(), emissiveIntensity: 0.55, roughness: 0.4 }));
  put(scrFace, 0, 0.12, 0.009); lapScreen.add(scrFace);
  put(lapScreen, dx - 0.08, 0.785, dz + 0.03, 0.35);
  lapScreen.rotation.x = -0.32; // layar terbuka miring ke belakang
  g.add(lapScreen);
  // tumpukan buku di meja (merge via bake) + 1 buku terbuka
  const books = [];
  const bkGeo = new THREE.BoxGeometry(0.26, 0.04, 0.19);
  const bkCols = [0x7a4a6a, 0x4a6b8a, 0x4a7a5a, 0xc65f3d];
  const bkMats = bkCols.map((c) => std({ color: c, roughness: 0.85 }));
  for (let i = 0; i < 4; i++) {
    books.push({ geometry: bkGeo, matrix: trs(dx - 0.05, 0.79 + i * 0.042, dz - 0.45, (i % 2 ? 0.12 : -0.08), 0, 0) });
  }
  // satu slot material per warna tidak bisa di-merge bersama — pakai slot biru untuk tumpukan
  mergeParts(books, bkMats[1], g);
  const openL = box(0.14, 0.012, 0.2, MAT.paperWhite); put(openL, dx - 0.02, 0.775, dz + 0.55, 0.5, 0, 0.08); g.add(openL);
  const openR = box(0.14, 0.012, 0.2, MAT.paperWhite); put(openR, dx - 0.02, 0.775, dz + 0.55, 0.5, 0, -0.08); g.add(openR);
  // tempat pensil Lathe + 7 pensil warna-warni
  const cup = new THREE.Mesh(
    new THREE.LatheGeometry([[0, 0], [0.045, 0], [0.05, 0.01], [0.048, 0.1], [0.05, 0.11]].map((p) => new THREE.Vector2(p[0], p[1])), 16),
    std({ color: 0x4a6b8a, roughness: 0.7 }));
  cup.castShadow = true; put(cup, dx + 0.12, 0.765, dz + 0.55); g.add(cup);
  const penCols = [0xd42a2a, 0x2a7ad4, 0x2ad45a, 0xe8b400, 0x7a4ad4, 0xd47a2a, 0x232326];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const pen = cyl(0.006, 0.006, 0.16, 6, std({ color: penCols[i], roughness: 0.6 }));
    put(pen, dx + 0.12 + Math.cos(a) * 0.02, 0.84, dz + 0.55 + Math.sin(a) * 0.02, 0, 0.12, Math.cos(a) * 0.12);
    g.add(pen);
  }
  // kertas sketsa webtoon + botol minum di meja
  const sketch = plane(0.24, 0.3, std({ map: sketchTex(), roughness: 0.95 }));
  put(sketch, dx - 0.12, 0.768, dz + 0.32, -0.5, -Math.PI / 2); g.add(sketch);
  const sketch2 = plane(0.24, 0.3, MAT.paperWhite);
  put(sketch2, dx - 0.1, 0.767, dz + 0.28, -0.2, -Math.PI / 2); g.add(sketch2);
  const bottle = new THREE.Mesh(
    new THREE.LatheGeometry([[0, 0], [0.035, 0], [0.04, 0.01], [0.042, 0.12], [0.02, 0.16], [0.016, 0.17], [0.016, 0.2]].map((p) => new THREE.Vector2(p[0], p[1])), 18),
    std({ color: 0x7ec8e8, transparent: true, opacity: 0.6, roughness: 0.15 }));
  bottle.castShadow = false; put(bottle, dx + 0.15, 0.765, dz - 0.15); g.add(bottle);
  const cap = cyl(0.018, 0.018, 0.02, 8, std({ color: 0x2a7ad4, roughness: 0.5 }));
  put(cap, dx + 0.15, 0.975, dz - 0.15); g.add(cap);
  // lampu meja: base + lengan + kap kerucut + bohlam
  const dlBase = cyl(0.07, 0.08, 0.03, 14, MAT.black); put(dlBase, dx + 0.1, 0.78, dz - 0.62); g.add(dlBase);
  const arm1 = cyl(0.01, 0.01, 0.3, 6, MAT.metal);
  put(arm1, dx + 0.1, 0.92, dz - 0.62, 0, 0, 0.5); g.add(arm1);
  const arm2 = cyl(0.01, 0.01, 0.26, 6, MAT.metal);
  put(arm2, dx - 0.02, 1.02, dz - 0.62, 0, 0, -0.7); g.add(arm2);
  const dlShade = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.12, 16, 1, true),
    std({ color: 0x2a7a5a, roughness: 0.6, side: THREE.DoubleSide, emissive: 0x1a5a3a, emissiveIntensity: 0.2 }));
  dlShade.castShadow = true; put(dlShade, dx - 0.08, 1.12, dz - 0.62, 0, 0, 0.5); g.add(dlShade);
  const dlBulb = sph(0.025, MAT.lampWarm, 10, 8); put(dlBulb, dx - 0.1, 1.08, dz - 0.62); g.add(dlBulb);

  // kursi: dudukan + sandaran + bantalan + 4 kaki
  const chair = new THREE.Group();
  const seat = box(0.42, 0.05, 0.42, MAT.chairWood); put(seat, 0, 0.45, 0); chair.add(seat);
  const cushion = box(0.4, 0.04, 0.4, std({ color: 0x4a6b8a, roughness: 0.98 })); put(cushion, 0, 0.49, 0); chair.add(cushion);
  const backrest = box(0.42, 0.5, 0.04, MAT.chairWood); put(backrest, 0.19, 0.75, 0, 0, 0, -0.12); chair.add(backrest);
  for (const [sx, sz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) {
    const leg = cyl(0.02, 0.016, 0.45, 6, MAT.chairWood);
    put(leg, sx, 0.225, sz); chair.add(leg);
  }
  const rung = cyl(0.012, 0.012, 0.36, 6, MAT.chairWood);
  put(rung, 0, 0.18, -0.18, 0, 0, Math.PI / 2); chair.add(rung);
  put(chair, 2.02, 0, dz, Math.PI); // sandaran di -x: duduk menghadap meja (+x); ikut dz supaya tetap di depan meja
  g.add(chair);
  // selimut lipat di atas dudukan kursi (kotak + bidang atas berombak)
  const chThrow = box(0.38, 0.06, 0.38, MAT.blanketBlue); put(chThrow, 2.02, 0.54, 0.85, 0.2); g.add(chThrow);
  const chThrowTopGeo = new THREE.PlaneGeometry(0.38, 0.38, 20, 14);
  displaceZ(chThrowTopGeo, (px, py) => Math.sin(px * 18) * 0.012 + Math.sin(py * 14 + 1) * 0.012);
  const chThrowTop = new THREE.Mesh(chThrowTopGeo, MAT.blanketCream);
  chThrowTop.castShadow = true; chThrowTop.receiveShadow = true;
  put(chThrowTop, 2.02, 0.575, 0.85, 0.2, -Math.PI / 2); g.add(chThrowTop);

  scene.add(g);
  return g;
}

// ---------- rak dinding + jam + poster + string light ----------
// `doors` (mode rumah): foto pindah dari dinding belakang (-0,55,1,9) —
// tepat di bukaan pintu gudang — ke dinding kiri (-2,97,1,9,1,0);
// poster dari z -0,35 ke 1,0 (ayunan pintu timur); gantungan jaket dari
// dinding kiri ke dinding kanan (lemari pindah ke dinding kiri-depan).
// `openSide='east'` (28 Nov 2026, 4 arah hadap): poster pindah ke dinding
// selatan BARU (x -2,0, z 2,32); gantungan jaket kembali ke dinding KIRI
// (z 0,3); lintasan 2 string light pindah ke dinding selatan (z 2,3).
function buildWallDecor(scene, doors = null, openSide = 'south') {
  const g = new THREE.Group();
  // rak dinding kiri (x=-2,93) — papan + braket + buku merge + tanaman
  const shelf = box(0.28, 0.04, 1.3, MAT.deskWood); put(shelf, -2.9, 1.72, -1.1); g.add(shelf);
  for (const z of [-1.65, -0.55]) {
    const brk = box(0.22, 0.03, 0.04, MAT.metal);
    put(brk, -2.9, 1.62, z, 0, 0, 0.5); g.add(brk);
  }
  // buku warna-warni di rak (merge, posisi berdiri sepanjang z)
  const shelfBooks = [];
  const bkGeo = new THREE.BoxGeometry(0.16, 0.24, 0.035);
  const bookCols = [0xd42a2a, 0x2a7ad4, 0x2ad45a, 0xe8b400, 0x7a4ad4, 0xd47a2a, 0x4a6b8a, 0x7a4a6a];
  const r = rngKit(21);
  for (let i = 0; i < 16; i++) {
    const lean = i === 15 ? 0.25 : r.range(-0.03, 0.03); // buku terakhir miring
    shelfBooks.push({
      geometry: bkGeo,
      matrix: trs(-2.9, 1.86, -1.62 + i * 0.055, lean, 0, 0),
    });
  }
  // merge per warna akan boros draw call — satu slot krem untuk punggung buku
  // + 4 buku hero berwarna sebagai mesh sendiri di depan rak
  mergeParts(shelfBooks, std({ color: 0xe8ddc2, roughness: 0.9 }), g);
  for (let i = 0; i < 4; i++) {
    const hb = box(0.17, 0.25, 0.04, std({ color: bookCols[i * 2], roughness: 0.85 }));
    put(hb, -2.9, 1.865, -1.58 + i * 0.16, 0.02); g.add(hb);
  }
  // tanaman pot di ujung rak (Lathe + daun merge)
  const pot = new THREE.Mesh(
    new THREE.LatheGeometry([[0, 0], [0.07, 0], [0.085, 0.02], [0.08, 0.11], [0.09, 0.12]].map((p) => new THREE.Vector2(p[0], p[1])), 18),
    MAT.potTerra);
  pot.castShadow = true; put(pot, -2.9, 1.74, -0.42); g.add(pot);
  const leaves = [];
  const leafGeo = new THREE.SphereGeometry(0.07, 14, 10);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const tilt = 0.5 + (i % 3) * 0.25;
    leaves.push({
      geometry: leafGeo,
      matrix: trs(-2.9 + Math.cos(a) * 0.05, 1.98 + (i % 3) * 0.05, -0.42 + Math.sin(a) * 0.05,
        Math.sin(a) * tilt, 0, Math.cos(a) * tilt, 0.55, 1.7, 0.55),
    });
  }
  mergeParts(leaves, MAT.leafGreen, g);
  const leaves2 = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.3;
    leaves2.push({
      geometry: leafGeo,
      matrix: trs(-2.9 + Math.cos(a) * 0.04, 2.08 + (i % 2) * 0.05, -0.42 + Math.sin(a) * 0.04,
        Math.sin(a) * 0.7, 0, Math.cos(a) * 0.7, 0.5, 1.5, 0.5),
    });
  }
  mergeParts(leaves2, MAT.leafLight, g);

  // tanaman gantung di balok (pot + 3 tali + sulur Tube + daun)
  const hang = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const cord = cyl(0.004, 0.004, 0.4, 4, std({ color: 0xd8c8a8, roughness: 1 }));
    put(cord, Math.cos(a) * 0.07, 2.95, Math.sin(a) * 0.07, 0, 0, Math.cos(a) * 0.18);
    hang.add(cord);
  }
  const hpot = new THREE.Mesh(
    new THREE.LatheGeometry([[0, 0], [0.09, 0], [0.11, 0.02], [0.1, 0.14], [0.12, 0.15]].map((p) => new THREE.Vector2(p[0], p[1])), 18),
    MAT.potTerra);
  hpot.castShadow = true; put(hpot, 0, 2.72, 0); hang.add(hpot);
  const vines = [];
  const vineLeaf = new THREE.SphereGeometry(0.035, 12, 8);
  for (let v = 0; v < 4; v++) {
    const a = (v / 4) * Math.PI * 2 + 0.4;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(Math.cos(a) * 0.05, 2.74, Math.sin(a) * 0.05),
      new THREE.Vector3(Math.cos(a) * 0.12, 2.55, Math.sin(a) * 0.12),
      new THREE.Vector3(Math.cos(a) * 0.08, 2.35, Math.sin(a) * 0.08),
    ]);
    vines.push({ geometry: new THREE.TubeGeometry(curve, 8, 0.006, 5), matrix: trs(0, 0, 0) });
    for (let l = 0; l < 4; l++) {
      vines.push({
        geometry: vineLeaf,
        matrix: trs(Math.cos(a) * (0.08 + (l % 2) * 0.04), 2.62 - l * 0.09, Math.sin(a) * (0.08 + (l % 2) * 0.04),
          0, a, 0.6, 1, 1.6, 0.5),
      });
    }
  }
  mergeParts(vines, MAT.leafGreen, hang);
  put(hang, 0.9, 0, 1.9); g.add(hang);

  // jam dinding di dinding belakang (di atas nakas A)
  const clock = new THREE.Group();
  const face = cyl(0.19, 0.19, 0.04, 28, MAT.paperWhite);
  put(face, 0, 0, 0, 0, Math.PI / 2, 0); clock.add(face);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.02, 8, 28), MAT.beamWood);
  put(rim, 0, 0, 0.02); clock.add(rim);
  const handH = box(0.02, 0.1, 0.01, MAT.black); put(handH, 0.03, 0.03, 0.025, 0, 0, -0.9); clock.add(handH);
  const handM = box(0.015, 0.15, 0.01, MAT.black); put(handM, -0.02, 0.05, 0.025, 0, 0, 0.5); clock.add(handM);
  const dot = sph(0.015, MAT.brass, 8, 6); put(dot, 0, 0, 0.03); clock.add(dot);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const tick = box(0.012, 0.03, 0.008, MAT.black);
    put(tick, Math.sin(a) * 0.15, Math.cos(a) * 0.15, 0.025, 0, 0, -a); clock.add(tick);
  }
  put(clock, -0.82, 2.55, -2.47); g.add(clock);

  // poster webtoon — mode rumah di dinding kanan (di atas meja belajar);
  // openSide 'east': pindah ke dinding selatan BARU (x -2,0) — dinding
  // timur kini terbuka, meja belajar pindah ke selatan (poster di x -2,0
  // tidak tertutup meja/kursi yang di x -1,0).
  const poster = plane(0.62, 0.93, std({ map: posterTex(), roughness: 0.9 }));
  const posterZ = openSide === 'east' ? 2.32 : (doors ? 1.0 : -0.35);
  const posterX = openSide === 'east' ? -2.0 : 2.97;
  put(poster, posterX, 1.95, posterZ, openSide === 'east' ? Math.PI : -Math.PI / 2); g.add(poster);
  const pFrame = openSide === 'east'
    ? box(0.69, 1.0, 0.03, MAT.beamWood)
    : box(0.03, 1.0, 0.69, MAT.beamWood);
  put(pFrame, openSide === 'east' ? -2.0 : 2.99, 1.95, openSide === 'east' ? 2.34 : posterZ); g.add(pFrame);
  // bingkai foto kecil di dinding belakang (kiri jendela)
  const photo = plane(0.4, 0.3, std({ map: windowViewTex(), roughness: 0.9 }));
  put(photo, doors ? -2.97 : -0.55, 1.9, doors ? 1.0 : -2.49, doors ? Math.PI / 2 : 0); g.add(photo);
  const phFrame = doors
    ? box(0.03, 0.36, 0.46, MAT.beamWood)
    : box(0.46, 0.36, 0.03, MAT.beamWood);
  put(phFrame, doors ? -2.99 : -0.55, 1.9, doors ? 1.0 : -2.505); g.add(phFrame);

  // string light: 2 lintasan TubeGeometry sag (sagCurve) + bohlam emissive merge
  const bulbGeo = new THREE.SphereGeometry(0.03, 14, 10);
  const bulbs = [];
  const run = (a, b, sag, n) => {
    const curve = sagCurve(a, b, sag, 20);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.006, 5), MAT.black);
    tube.castShadow = false; g.add(tube);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const p = curve.getPoint(t);
      bulbs.push({ geometry: bulbGeo, matrix: trs(p.x, p.y - 0.045, p.z) });
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.045, 4), MAT.black);
      put(cord, p.x, p.y - 0.02, p.z); g.add(cord);
    }
  };
  run(new THREE.Vector3(-2.9, 3.0, -2.4), new THREE.Vector3(2.9, 3.0, -2.4), 0.35, 9);
  // Lintasan 2: dinding timur (mode lama) — openSide 'east': sepanjang
  // dinding selatan BARU (z 2,3), 7 bohlam seperti sebelumnya.
  if (openSide === 'east') {
    run(new THREE.Vector3(-2.9, 3.0, 2.3), new THREE.Vector3(2.9, 3.0, 2.3), 0.3, 7);
  } else {
    run(new THREE.Vector3(2.9, 3.0, -2.4), new THREE.Vector3(2.9, 3.0, 1.6), 0.3, 7);
  }
  mergeParts(bulbs, MAT.lampWarm, g);

  // gantungan jaket di dinding kiri depan: rel + 3 kait + jaket + topi
  // (mode rumah: pindah ke dinding kanan — lemari menempati dinding kiri.
  // openSide 'east': kembali ke dinding KIRI, digeser ke z 0,3 — posisi
  // lama (z 1,9) di timur menutupi dinding selatan baru / pintu 3.)
  const hookEast = doors && openSide !== 'east';
  const hookZ = openSide === 'east' ? 0.3 : 1.9;
  const hookRail = box(0.04, 0.06, 0.7, MAT.beamWood); put(hookRail, hookEast ? 2.96 : -2.96, 1.72, hookZ); g.add(hookRail);
  for (let i = 0; i < 3; i++) {
    const hk = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.009, 6, 12, Math.PI * 1.2), MAT.brass);
    put(hk, hookEast ? 2.93 : -2.93, 1.68, hookZ - 0.22 + i * 0.22, 0, Math.PI / 2, hookEast ? -0.4 : 0.4); g.add(hk);
  }
  const jacketShape = new THREE.Shape();
  jacketShape.moveTo(-0.22, 0.42); jacketShape.lineTo(-0.3, 0.3); jacketShape.lineTo(-0.2, 0.2);
  jacketShape.lineTo(-0.18, -0.4); jacketShape.lineTo(0.18, -0.4); jacketShape.lineTo(0.2, 0.2);
  jacketShape.lineTo(0.3, 0.3); jacketShape.lineTo(0.22, 0.42);
  jacketShape.quadraticCurveTo(0, 0.32, -0.22, 0.42);
  const jacket = new THREE.Mesh(
    new THREE.ExtrudeGeometry(jacketShape, { depth: 0.05, bevelEnabled: false, curveSegments: 8 }),
    std({ color: 0x4a5a3a, roughness: 0.95, side: THREE.DoubleSide }));
  jacket.castShadow = true; put(jacket, hookEast ? 2.9 : -2.9, 1.25, hookZ, hookEast ? Math.PI / 2 : -Math.PI / 2); g.add(jacket);
  const capTop = sph(0.09, std({ color: 0xf2c94c, roughness: 0.9 }), 16, 10);
  put(capTop, hookEast ? 2.9 : -2.9, 1.62, hookZ + 0.22); capTop.scale.set(1, 0.6, 1); g.add(capTop);
  const capBrim = box(0.14, 0.015, 0.08, std({ color: 0xf2c94c, roughness: 0.9 }));
  put(capBrim, hookEast ? 2.84 : -2.84, 1.6, hookZ + 0.22, hookEast ? -0.3 : 0.3); g.add(capBrim);

  // lis bingkai dinding di atas headboard (belakang kasur)
  for (const [fx, fy, fw, fh] of [[-1.95, 2.35, 1.3, 0.7]]) {
    const ft = 0.035;
    const fT = box(fw, ft, 0.02, MAT.trimWhite); put(fT, fx, fy + fh / 2, -2.49); g.add(fT);
    const fB = box(fw, ft, 0.02, MAT.trimWhite); put(fB, fx, fy - fh / 2, -2.49); g.add(fB);
    const fL2 = box(ft, fh, 0.02, MAT.trimWhite); put(fL2, fx - fw / 2, fy, -2.49); g.add(fL2);
    const fR2 = box(ft, fh, 0.02, MAT.trimWhite); put(fR2, fx + fw / 2, fy, -2.49); g.add(fR2);
  }

  scene.add(g);
  return g;
}

// ---------- props lantai ----------
// `doors` (mode rumah): lampu lantai dari (2,72,-0,35) — dalam ayunan daun
// pintu timur — ke (2,72,-1,75) (aman dari gitar di z -1,15); ransel
// geser ke (2,2, 2,05) (nakas A pindah ke sudut itu); keranjang dari
// (-2,55,1,55) — tertutup lemari yang pindah — ke (1,5, 2,15); runner
// dari depan lemari lama ke depan lemari baru (-1,95, 1,7).
// `openSide='east'` (28 Nov 2026, 4 arah hadap): pouf geser ke (0,3, 1,2)
// (di luar ayunan pintu 3); gitar pindah ke dinding BARAT (-2,82, 0,2);
// keranjang pindah ke sudut timur-laut (1,8, -1,9); lampu lantai ke sudut
// timur-laut (2,72, -2,0). Dinding timur kini terbuka — semua yang di
// sana menutupi pandangan dari koridor.
function buildFloorProps(scene, doors = null, openSide = 'south') {
  const g = new THREE.Group();
  // pouf bundar di tengah karpet
  const pouf = sph(0.32, std({ color: 0xc65f3d, roughness: 0.98 }), 32, 24);
  const poufX = openSide === 'east' ? 0.3 : 1.25, poufZ = openSide === 'east' ? 1.2 : 1.55;
  put(pouf, poufX, 0.16, poufZ); pouf.scale.set(1, 0.55, 1); g.add(pouf);
  const poufSeam = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.012, 6, 24), MAT.blanketCream);
  put(poufSeam, poufX, 0.22, poufZ, 0, Math.PI / 2); poufSeam.castShadow = true; g.add(poufSeam);

  // ransel di lantai dekat meja
  const pack = new THREE.Group();
  const pBody = box(0.34, 0.44, 0.18, std({ color: 0x4a6b8a, roughness: 0.95 }));
  put(pBody, 0, 0.24, 0); pack.add(pBody);
  const pPocket = box(0.26, 0.18, 0.06, std({ color: 0x3a5a76, roughness: 0.95 }));
  put(pPocket, 0, 0.16, 0.11); pack.add(pPocket);
  const pFlap = box(0.34, 0.12, 0.19, std({ color: 0xf2c94c, roughness: 0.95 }));
  put(pFlap, 0, 0.42, 0); pack.add(pFlap);
  for (const s of [-1, 1]) {
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.02, 6, 12, Math.PI), MAT.black);
    put(strap, s * 0.1, 0.3, -0.1, 0, 0, 0); pack.add(strap);
  }
  const pHandle = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 10, Math.PI), MAT.black);
  put(pHandle, 0, 0.48, 0); pack.add(pHandle);
  put(pack, doors ? 2.2 : 2.35, 0, 2.05, -0.5); g.add(pack);

  // sepatu sepasang di kaki kasur
  const shoe = (x, z, ry, col) => {
    const s = new THREE.Group();
    const sole = box(0.11, 0.03, 0.3, std({ color: 0xf7f2e6, roughness: 0.7 }));
    put(sole, 0, 0.015, 0); s.add(sole);
    const upper = box(0.1, 0.07, 0.24, std({ color: col, roughness: 0.8 }));
    put(upper, 0, 0.065, -0.02); s.add(upper);
    const toe = sph(0.05, std({ color: col, roughness: 0.8 }), 10, 8);
    put(toe, 0, 0.05, 0.13); toe.scale.set(1, 0.7, 1); s.add(toe);
    const lace = box(0.08, 0.012, 0.12, MAT.paperWhite);
    put(lace, 0, 0.105, 0.02); s.add(lace);
    put(s, x, 0, z, ry); g.add(s);
  };
  shoe(-1.15, 0.05, 0.3, 0x2a4a6b);
  shoe(-0.98, 0.18, 0.15, 0x2a4a6b);

  // gitar bersandar di dinding kanan (body Extrude + leher + senar)
  const guitar = new THREE.Group();
  const gShape = new THREE.Shape();
  gShape.moveTo(0, -0.32);
  gShape.bezierCurveTo(0.22, -0.32, 0.26, -0.12, 0.16, -0.02);
  gShape.bezierCurveTo(0.24, 0.1, 0.2, 0.3, 0, 0.32);
  gShape.bezierCurveTo(-0.2, 0.3, -0.24, 0.1, -0.16, -0.02);
  gShape.bezierCurveTo(-0.26, -0.12, -0.22, -0.32, 0, -0.32);
  const gGeo = new THREE.ExtrudeGeometry(gShape, {
    depth: 0.09, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 3, curveSegments: 32,
  });
  const gBody = new THREE.Mesh(gGeo, std({ color: 0xb5651d, roughness: 0.45 }));
  gBody.castShadow = true; gBody.receiveShadow = true; guitar.add(gBody);
  const hole = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 6, 18), MAT.black);
  put(hole, 0, 0.05, 0.1); guitar.add(hole);
  const holeIn = cyl(0.07, 0.07, 0.01, 18, MAT.black);
  put(holeIn, 0, 0.05, 0.095, 0, Math.PI / 2, 0); guitar.add(holeIn);
  const neck = box(0.05, 0.5, 0.03, MAT.beamWood); put(neck, 0, 0.55, 0.03); guitar.add(neck);
  const head = box(0.07, 0.14, 0.03, MAT.beamWood); put(head, 0, 0.86, 0.03); guitar.add(head);
  for (let i = 0; i < 6; i++) {
    const str = cyl(0.0018, 0.0018, 0.85, 4, std({ color: 0xe8e8e8, metalness: 0.8, roughness: 0.3 }));
    put(str, -0.02 + i * 0.008, 0.42, 0.1); str.castShadow = false; guitar.add(str);
  }
  if (openSide === 'east') {
    // Gitar pindah ke dinding BARAT (ry=PI, miring rz +0,22 = cermin) —
    // dinding timur kini terbuka, gitar di sana menutupi pandangan.
    put(guitar, -2.82, 0.33, 0.2, Math.PI, 0, 0.22);
  } else {
    put(guitar, 2.82, 0.33, -1.15, 0, 0, -0.22); // bersandar miring ke dinding kanan
  }
  guitar.rotation.x = -0.12;
  g.add(guitar);

  // sandal rumah di tepi karpet
  const sandal = (x, z, ry) => {
    const s = new THREE.Group();
    const soleShape = new THREE.Shape();
    soleShape.moveTo(-0.05, -0.13); soleShape.lineTo(0.05, -0.13);
    soleShape.quadraticCurveTo(0.06, 0.1, 0.04, 0.14);
    soleShape.quadraticCurveTo(0, 0.17, -0.04, 0.14);
    soleShape.quadraticCurveTo(-0.06, 0.1, -0.05, -0.13);
    const soleGeo = new THREE.ExtrudeGeometry(soleShape, { depth: 0.02, bevelEnabled: false, curveSegments: 8 });
    const sole = new THREE.Mesh(soleGeo, std({ color: 0x8a6a42, roughness: 0.9 }));
    sole.castShadow = true; put(sole, 0, 0, 0, 0, -Math.PI / 2); s.add(sole);
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.01, 6, 12, Math.PI), MAT.leatherBrown);
    put(strap, 0, 0.025, 0.05, 0, 0, 0); s.add(strap);
    put(s, x, 0, z, ry); g.add(s);
  };
  sandal(-0.35, 1.35, 0.2);
  sandal(-0.18, 1.42, -0.15);

  // keranjang cucian di sudut kiri-depan + baju menumpuk
  const basket = new THREE.Group();
  const bBody = new THREE.Mesh(
    new THREE.LatheGeometry([[0, 0], [0.26, 0], [0.3, 0.02], [0.28, 0.34], [0.3, 0.36]].map((p) => new THREE.Vector2(p[0], p[1])), 20),
    std({ color: 0xc8a86a, roughness: 0.95 }));
  bBody.castShadow = true; bBody.receiveShadow = true; basket.add(bBody);
  const rimB = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.015, 6, 20), MAT.beamWood);
  put(rimB, 0, 0.36, 0, 0, Math.PI / 2); basket.add(rimB);
  for (let i = 0; i < 4; i++) {
    const cloth = sph(0.11, [MAT.sheetWhite, MAT.blanketBlue, MAT.pillowYellow, std({ color: 0x7a4a6a, roughness: 0.95 })][i], 16, 12);
    const a = (i / 4) * Math.PI * 2;
    put(cloth, Math.cos(a) * 0.1, 0.38, Math.sin(a) * 0.1); cloth.scale.set(1, 0.6, 1); basket.add(cloth);
  }
  // keranjang cucian — openSide 'east': sudut timur-laut (1,8, -1,9)
  // (posisi lama (1,5, 2,15) menabrak dinding selatan baru / pintu 3).
  const basketPos = openSide === 'east' ? [1.8, -1.9]
    : [doors ? 1.5 : -2.55, doors ? 2.15 : 1.55];
  put(basket, basketPos[0], 0, basketPos[1]); g.add(basket);

  // lampu gantung (pendant) dari balok tengah — kap Lathe + bohlam (tanpa PointLight tambahan)
  const pendant = new THREE.Group();
  const cord = cyl(0.006, 0.006, 0.9, 6, MAT.black);
  put(cord, 0, 2.65, 0); cord.castShadow = false; pendant.add(cord);
  const pShade = new THREE.Mesh(
    new THREE.LatheGeometry([[0.02, 0], [0.05, 0.02], [0.16, 0.14], [0.19, 0.16]].map((p) => new THREE.Vector2(p[0], p[1])), 24),
    std({ color: 0x2a7a5a, roughness: 0.6, side: THREE.DoubleSide }));
  pShade.castShadow = true; put(pShade, 0, 2.04, 0); pendant.add(pShade);
  const pBulb = sph(0.04, MAT.lampWarm, 12, 8); put(pBulb, 0, 2.02, 0); pendant.add(pBulb);
  put(pendant, 0.4, 0, 0.55); g.add(pendant);

  // lampu lantai sudut kanan (antara gitar dan meja): base + tiang + kap Lathe
  const floorLamp = new THREE.Group();
  const flBase = cyl(0.14, 0.16, 0.04, 18, MAT.black); put(flBase, 0, 0.02, 0); floorLamp.add(flBase);
  const flPole = cyl(0.015, 0.015, 1.5, 8, MAT.brass); put(flPole, 0, 0.79, 0); floorLamp.add(flPole);
  const flShadePts = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    flShadePts.push(new THREE.Vector2(0.1 + t * 0.13, 0.02 + t * 0.22));
  }
  const flShade = new THREE.Mesh(new THREE.LatheGeometry(flShadePts, 28),
    std({ color: 0xf2d8a0, roughness: 0.9, side: THREE.DoubleSide, emissive: 0xffc46b, emissiveIntensity: 0.2 }));
  flShade.castShadow = true; put(flShade, 0, 1.56, 0); floorLamp.add(flShade);
  const flBulb = sph(0.045, MAT.lampWarm, 12, 8); put(flBulb, 0, 1.66, 0); floorLamp.add(flBulb);
  // lampu lantai — openSide 'east': sudut timur-laut (2,72, -1,2)
  // (REVISI cek visual: posisi lama (2,72, -2,0) menutupi pintu 2
  // (KM/WC-kamar) dari kamera timur; digeser 0,8 m ke selatan, tetap
  // di sudut timur-laut, bersih dari gitar (barat) dan nakas A.)
  const flZ = openSide === 'east' ? -1.2 : (doors ? -1.75 : -0.35);
  put(floorLamp, 2.72, 0, flZ); g.add(floorLamp);

  // tumpukan majalah di lantai dekat pouf
  const magCols = [0xd42a2a, 0x2a7ad4, 0xe8b400, 0x4a7a5a];
  for (let i = 0; i < 4; i++) {
    const mag = box(0.28, 0.015, 0.2, std({ color: magCols[i], roughness: 0.85 }));
    put(mag, 0.55, 0.01 + i * 0.016, 1.95, (i - 1.5) * 0.25); g.add(mag);
  }
  // runner kecil di depan lemari
  const runner = plane(0.8, 1.6, std({ color: 0xb85c38, roughness: 0.98 }));
  put(runner, doors ? -1.95 : 2.3, 0.012, doors ? 1.7 : -0.95, 0, -Math.PI / 2); g.add(runner);
  const runnerBorder = box(0.84, 0.008, 1.64, std({ color: 0xe8d9b8, roughness: 0.98 }));
  put(runnerBorder, doors ? -1.95 : 2.3, 0.006, doors ? 1.7 : -0.95); g.add(runnerBorder);

  scene.add(g);
  return g;
}

// ---------- lighting (key + fill + rim + practical) ----------
function buildLights(scene, doors = null, openSide = 'south') {
  // TIDAK set scene.background / fog — index.html sudah mengaturnya.
  scene.add(new THREE.HemisphereLight(0xfff2d8, 0x8a7a5a, 0.9)); // fill hangat
  const sun = new THREE.DirectionalLight(0xffe0b3, 2.2); // key: matahari pagi dari jendela
  sun.position.set(0.7, 3.4, -7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.normalBias = 0.02;
  sun.shadow.bias = -0.0001;
  sun.shadow.camera.left = -7; sun.shadow.camera.right = 7;
  sun.shadow.camera.top = 7; sun.shadow.camera.bottom = -7;
  sun.shadow.camera.near = 0.5; sun.shadow.camera.far = 20;
  sun.target.position.set(0.2, 0.4, 1.2);
  scene.add(sun); scene.add(sun.target);
  const rim = new THREE.DirectionalLight(0xbfd8ff, 0.5); // rim dingin dari arah depan
  rim.position.set(-2, 3, 6);
  scene.add(rim);
  // practical: lampu nakas A (ikut pindah bila nakas A pindah)
  // (openSide 'east': nakas A di (2,74, 1,9) — lampu di (2,74, 1,5),
  // 0,36 ke utara dari meja lampu seperti sebelumnya.)
  const lampLight = new THREE.PointLight(0xffc46b, 6, 4.5, 2);
  const lampZ = openSide === 'east' ? 1.5 : (doors ? 1.86 : -2.18);
  lampLight.position.set(doors ? 2.74 : -0.96, 1.15, lampZ);
  scene.add(lampLight);
}

// ---------- set ----------
// `opts.doors` (dipakai set-rumah.js saja): { back: [pusat-x lokal...],
// right: [pusat-z lokal...], front: [pusat-x lokal...] } — pintu antar
// ruangan di dinding utara + timur (+ selatan bila openSide 'east').
// `opts.openSide` (28 Nov 2026, 4 arah hadap): 'south' (default — set
// mandiri, menghadap selatan) | 'east' (mode rumah: menghadap timur /
// koridor; meja belajar diputar -90 derajat ke dinding selatan lewat
// grup pembungkus — buildDesk sendiri TIDAK diubah, grupnya dibungkus
// wrapper ry -PI/2 + geser (0,15, -0,62) supaya meja mendarat di
// (-1,0, 2,0) menghadap utara, kursi di (-1,0, 1,4)).
export function buildKamarTidur(scene, opts = {}) {
  const doors = opts.doors || null;
  const openSide = opts.openSide || 'south';
  buildShell(scene, doors, openSide);
  buildWindow(scene);
  buildBed(scene, doors, openSide);
  buildWardrobe(scene, doors);
  const deskG = buildDesk(scene);
  if (openSide === 'east') {
    scene.remove(deskG);
    const wrap = new THREE.Group();
    wrap.add(deskG);
    wrap.rotation.y = -Math.PI / 2;
    wrap.position.set(0.15, 0, -0.62);
    scene.add(wrap);
  }
  buildWallDecor(scene, doors, openSide);
  buildFloorProps(scene, doors, openSide);
  buildLights(scene, doors, openSide);
  console.log('TRIANGLES kamar-tidur =', countTriangles(scene));
}
