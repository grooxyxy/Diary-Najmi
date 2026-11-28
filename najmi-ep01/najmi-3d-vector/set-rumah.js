// ============================================================================
// set-rumah.js — RUMAH NAJMI UTUH (Jakarta, denah Master ±10 x 8,6 m)
// (28 Nov 2026, atas permintaan Master: kamar-tidur + dapur + gudang yang
//  sudah jadi digabung jadi SATU rumah mengikuti denah, ditambah ruangan
//  sisanya — KM/WC, ruang makan, ruang tamu, kamar kerja/tamu, koridor,
//  teras + carport — dengan skala & tinggi yang sama seperti 3 ruangan lama.)
//
// Susunan (x = timur, z = selatan, depan/+z TERBUKA — open-front dollhouse):
//   Baris utara : Gudang | KM/WC | Dapur
//   Baris tengah: Kamar Tidur | Koridor | Ruang Makan
//   Baris selatan: Kamar Kerja | Foyer + Pintu Utama | Ruang Tamu
//   Depan       : Teras + Carport (mobil) + jalan komplek
//
// Skala: 3 ruangan lama dibangun di skala 1,0 lalu diskala x1,2 di sini
// (sama seperti buildScaledSet di index.html — perabot ikut membesar,
//  itulah skala yang Master setujui "pas"); 4 ruangan baru di
//  set-rumah-rooms.js sudah dibangun langsung di ukuran final.
// Tinggi dinding semua ruangan 3,84 m (gudang 4,08 — ikut file aslinya).
//
// Cahaya: 3 ruangan lama masing-masing membawa HemisphereLight +
// DirectionalLight sendiri — kalau dibiarkan menumpuk, rumah jadi
// over-bright dan pita toon terkompresi. Di sini hemi + directional
// tiap ruangan lama DILEPAS (traverse), diganti SATU hemi + SATU
// matahari untuk seluruh rumah; PointLight praktis (lampu gantung,
// lampu meja, glow pintu gudang) dipertahankan.
//
// CANGKANG EKSTERIOR (28 Nov 2026, revisi "bukan susunan ruangan"):
// atap pelana genteng + fasad depan berjendela + atap teras/carport
// masuk SATU grup `shell` yang disembunyikan kalau ?roof=0 —
// supaya rumah terbaca SEBUAH RUMAH dari luar, tapi ruangan tetap
// bisa difoto dari atas (dollhouse) saat atap disembunyikan. Pagar,
// plinth, lantai, dan ruangan BUKAN cangkang — selalu terlihat.
// ============================================================================
import * as THREE from 'three';
import { countTriangles } from './vendor/buildings-detailed.js';
import { buildKamarTidur } from './set-kamar-tidur.js';
import { buildDapur } from './set-dapur.js';
import { buildGudang } from './set-gudang.js';
import { buildKMWC, buildRuangMakan, buildRuangTamu, buildKamarKerja } from './set-rumah-rooms.js';

const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0, ...o });
function box(w, h, d, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = true; m.receiveShadow = true; return m;
}
function cyl(rt, rb, h, seg, mat) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.castShadow = true; m.receiveShadow = true; return m;
}
function put(m, x, y, z, rx = 0, ry = 0, rz = 0) {
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz); return m;
}

// ---------- canvas textures (pola set-kamar-tidur.js) ----------
// Guard Node seperti set-rumah-rooms.js: kalau `document` tidak ada,
// kembalikan DataTexture 1x1 putih supaya builder tetap bisa diukur.
function canvasTex(w, h, draw, repeat) {
  if (typeof document === 'undefined') {
    const t = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    t.needsUpdate = true; return t;
  }
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

// Genteng terakota: baris-baris genteng melengkung (scallop) warna
// selang-seling + nat gelap antar baris.
function tileTex(repeat) {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#a34a24'; g.fillRect(0, 0, w, h);
    const rowH = 64, tileW = 64;
    for (let y = 0, row = 0; y < h; y += rowH, row++) {
      for (let x = -tileW; x < w + tileW; x += tileW) {
        const off = (row % 2) ? tileW / 2 : 0;
        g.fillStyle = (((x / tileW) | 0) + row) % 2 === 0 ? '#c05e30' : '#b05228';
        g.beginPath();
        g.arc(x + off + tileW / 2, y, tileW / 2 - 2, 0, Math.PI);
        g.fill();
        g.strokeStyle = 'rgba(90,30,10,0.5)'; g.lineWidth = 3;
        g.stroke();
      }
      g.fillStyle = 'rgba(70,20,8,0.55)';
      g.fillRect(0, y + rowH - 4, w, 4);
    }
  }, repeat);
}

// Segitiga gable (prisma segitiga): alas y 3,84 (atas dinding),
// bubungan y 7,5 di z 2,5. Shape digambar di (z, y), lalu diputar
// ry -90 derajat supaya sumbu shape-x jadi sumbu z dunia; ekstrusi
// 0,12 mengarah ke -x dunia. Material DoubleSide supaya kedua
// gable (barat + timur) terbaca dari luar.
function gableTriangle(mat) {
  const shape = new THREE.Shape();
  shape.moveTo(-5.52, 3.84);
  shape.lineTo(10.5, 3.84);
  shape.lineTo(2.5, 7.5);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: false });
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true; m.receiveShadow = true;
  m.rotation.y = -Math.PI / 2;
  return m;
}

// Ventilasi bundar di gable: piringan krem + lubang gelap.
// `x` = posisi gable (-8,40 barat / 8,22 timur); backing menempel
// dinding, lubang menonjol sedikit ke luar.
function gableVent(x) {
  const g = new THREE.Group();
  const s = x < 0 ? 1 : -1; // arah ke luar (barat -, timur +)
  const back = cyl(0.33, 0.33, 0.02, 16, std({ color: 0xe8dcc8, roughness: 0.9 }));
  put(back, -s * 0.02, 0, 0, 0, 0, Math.PI / 2); g.add(back);
  const hole = cyl(0.25, 0.25, 0.06, 16, std({ color: 0x3a3a3a, roughness: 0.9 }));
  put(hole, s * 0.01, 0, 0, 0, 0, Math.PI / 2); g.add(hole);
  g.position.set(x, 5.5, 2.5);
  return g;
}

// Satu jendela fasad: lubang asli di dinding + kusen + kaca +
// mullion + 2 tirai di dalam. Bukaan 1,1 x 1,4 m (y 0,9..2,3).
function facadeWindow(shell, cx, z = 10.5) {
  const frameMat = std({ color: 0x4a3220, roughness: 0.8 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xbfe3ea, transparent: true, opacity: 0.35, roughness: 0.1, metalness: 0.1 });
  const curtainMat = std({ color: 0xf6ead2, roughness: 0.98, side: THREE.DoubleSide });
  const fT = box(1.22, 0.08, 0.16, frameMat); put(fT, cx, 2.3, z); shell.add(fT);
  const fB = box(1.22, 0.08, 0.16, frameMat); put(fB, cx, 0.9, z); shell.add(fB);
  const fL = box(0.08, 1.4, 0.16, frameMat); put(fL, cx - 0.55, 1.6, z); shell.add(fL);
  const fR = box(0.08, 1.4, 0.16, frameMat); put(fR, cx + 0.55, 1.6, z); shell.add(fR);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.02, 1.32), glassMat);
  glass.position.set(cx, 1.6, z); shell.add(glass);
  const mV = box(0.05, 1.32, 0.04, frameMat); put(mV, cx, 1.6, z + 0.02); shell.add(mV);
  const mH = box(1.02, 0.05, 0.04, frameMat); put(mH, cx, 1.6, z + 0.02); shell.add(mH);
  for (const s of [-1, 1]) {
    const cur = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 1.35), curtainMat);
    cur.position.set(cx + s * 0.3, 1.6, z - 0.1); shell.add(cur);
  }
}

// Lepas HemisphereLight + DirectionalLight dari grup ruangan lama
// (diganti satu set cahaya rumah) — PointLight praktis dipertahankan.
function stripBigLights(group) {
  const drop = [];
  group.traverse((o) => {
    if (o.isHemisphereLight || o.isDirectionalLight) drop.push(o);
  });
  for (const l of drop) l.parent.remove(l);
}
// Ruangan lama: builder dipanggil dengan Group, diskala x1,2, dipindah.
// `args` diteruskan ke builder — dipakai gudang (lebar) + kamar (pintu).
function roomOld(builder, x, z, args = []) {
  const g = new THREE.Group();
  builder(g, ...args);
  stripBigLights(g);
  g.scale.setScalar(1.2);
  g.position.set(x, 0, z);
  return g;
}
// Ruangan baru: sudah ukuran final, tinggal dipindah.
// `opts` diteruskan ke builder — dipakai ruang makan/tamu/kerja (pintu).
function roomNew(builder, x, z, opts) {
  const g = builder(opts);
  g.position.set(x, 0, z);
  return g;
}

// --- mobil sederhana (sedan biru tua, seperti di denah) ---
function buildCar() {
  const g = new THREE.Group();
  const body = std({ color: 0x1e3a5f, roughness: 0.35, metalness: 0.4 });
  const glass = std({ color: 0x1a2a3a, roughness: 0.15, metalness: 0.6 });
  const tyre = std({ color: 0x1a1a1a, roughness: 0.95 });
  const hub = std({ color: 0xc0c0c0, roughness: 0.3, metalness: 0.8 });
  const b = box(1.8, 0.55, 4.2, body); put(b, 0, 0.55, 0); g.add(b);
  // kabin lebih ramping + kaca hanya di sisi (bukan satu kotak gelap
  // penuh — revisi cek visual: mobil sempat terbaca seperti van kotak)
  const cab = box(1.5, 0.42, 2.0, body); put(cab, 0, 1.0, -0.2); g.add(cab);
  for (const s of [-1, 1]) {
    const win = box(0.04, 0.32, 1.8, glass);
    put(win, s * 0.76, 1.0, -0.2); g.add(win);
  }
  const shield = box(1.4, 0.32, 0.04, glass);
  put(shield, 0, 1.0, 0.82); g.add(shield);
  for (const [x, z] of [[-0.75, 1.35], [0.75, 1.35], [-0.75, -1.35], [0.75, -1.35]]) {
    const w = cyl(0.33, 0.33, 0.22, 20, tyre);
    put(w, x, 0.33, z, 0, 0, Math.PI / 2); g.add(w);
    const h = cyl(0.18, 0.18, 0.24, 12, hub);
    put(h, x, 0.33, z, 0, 0, Math.PI / 2); g.add(h);
  }
  const hl = box(0.3, 0.12, 0.06, std({ color: 0xfff6d8, roughness: 0.3, emissive: 0x555544 }));
  put(hl, -0.6, 0.6, 2.11); g.add(hl);
  const hr = hl.clone(); put(hr, 0.6, 0.6, 2.11); g.add(hr);
  return g;
}

// --- pohon kecil (batang + 2 bola tajuk) ---
function buildTree(s = 1) {
  const g = new THREE.Group();
  const trunk = cyl(0.09 * s, 0.12 * s, 1.1 * s, 8, std({ color: 0x6b4a2e, roughness: 0.95 }));
  put(trunk, 0, 0.55 * s, 0); g.add(trunk);
  const leaf = std({ color: 0x4e8a3d, roughness: 0.9 });
  const c1 = new THREE.Mesh(new THREE.SphereGeometry(0.85 * s, 10, 8), leaf);
  put(c1, 0, 1.5 * s, 0); c1.castShadow = true; g.add(c1);
  const c2 = new THREE.Mesh(new THREE.SphereGeometry(0.6 * s, 10, 8), leaf);
  put(c2, 0.35 * s, 1.1 * s, 0.2 * s); c2.castShadow = true; g.add(c2);
  return g;
}

export function buildRumah(scene, showRoof = true) {
  // Cangkang eksterior (atap + fasad + atap teras/carport + tiang):
  // satu grup, disembunyikan kalau ?roof=0 (mode interior).
  const shell = new THREE.Group();
  scene.add(shell);

  // --- cahaya rumah (satu set untuk semua ruangan) ---
  // Hemisphere langit HANGAT (0xffe8c8, bukan biru 0xcfe5ff): atap
  // teras/carport menaungi seluruh fasad dari matahari (siang), jadi
  // fasad hanya disinari hemisphere — langit biru membuatnya terbaca
  // sebagai dinding biru-abu, bukan krem dalam bayangan. Revisi
  // cek visual 28 Nov 2026: langit hangat + intensitas 1,0 supaya
  // fasad tetap krem hangat walau dalam bayangan atap.
  scene.add(new THREE.HemisphereLight(0xffe8c8, 0x8a7a5a, 1.0));
  const sun = new THREE.DirectionalLight(0xfff2d8, 2.6);
  sun.position.set(10, 16, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -14; sun.shadow.camera.right = 14;
  sun.shadow.camera.top = 14; sun.shadow.camera.bottom = -14;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 60;
  sun.shadow.bias = -0.0001; sun.shadow.normalBias = 0.02;
  scene.add(sun);
  // Fill hangat dari depan (selatan), TANPA bayangan: atap teras/
  // carport menaungi seluruh fasad dari matahari, jadi fasad hanya
  // disinari hemisphere dan terbaca sebagai dinding biru-abu datar
  // (toon + ACES). Fill ini mengangkat fasad kembali ke krem hangat
  // tanpa menghilangkan bayangan matahari di tempat lain.
  const fill = new THREE.DirectionalLight(0xffe8c8, 1.4);
  fill.position.set(2, 5, 24);
  fill.target.position.set(0, 1, 5);
  scene.add(fill);
  scene.add(fill.target);

  // --- tanah + jalan komplek ---
  // Tanah di y=-0,02 (28 Nov 2026, perbaikan lantai hijau): lantai
  // ruangan baru adalah plane di y=0, SEBIDANG dengan tanah rumput di y=0
  // -> z-fighting, rumput menang di kamera landai (kamar kerja seluruhnya
  // hijau, KM/WC separuh hijau). Jarak 0,02 m cukup untuk depth buffer;
  // lantai TIDAK dinaikkan supaya karpet ruangan (y 0,012) tidak tenggelam.
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(40, 48),
    std({ color: 0x6fae4e, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  ground.receiveShadow = true;
  scene.add(ground);
  const road = box(26, 0.04, 3, std({ color: 0x555a60, roughness: 0.95 }));
  put(road, 0, 0, 20.5); scene.add(road);
  const path = box(2, 0.04, 5.5, std({ color: 0xb8a888, roughness: 0.9 }));
  put(path, 0.5, 0, 16.25); scene.add(path);

  // --- 3 ruangan lama (x1,2) ---
  // Gudang dipersempit 5,2 -> 4,71 m lokal (5,65 m final) supaya KM/WC
  // melebar; pusat gudang -5,13 -> -5,425 (tepi barat rumah tidak berubah).
  // Kamar tidur (28 Nov 2026, 4 arah hadap — menghadap TIMUR / koridor):
  // 3 pintu (lokal): utara ke gudang (-0,575) + ke KM/WC lewat koridor
  // (2,4), SELATAN ke kamar kerja (1,458 — pintu 3, kini di dinding
  // selatan yang baru); pintu timur ke koridor (6) HILANG, sisi timur
  // kini terbuka. Gudang: pintu timur ke KM/WC (lokal z -1,725).
  scene.add(roomOld(buildGudang, -5.425, -2.75, [4.71, -1.725])); // 5,65 x 5,04
  scene.add(roomOld(buildDapur, 3.87, -2.76));     // 8,4 x 5,52
  scene.add(roomOld(buildKamarTidur, -4.65, 3.0, [{ doors: { back: [-0.575, 2.4], front: [1.458] }, openSide: 'east' }])); // 7,2 x 6,0

  // --- 4 ruangan baru (ukuran final) ---
  // KM/WC diperlebar 1,68 -> 2,27 m (pusat -1,17 -> -1,465).
  // (28 Nov 2026, 4 arah hadap) KM/WC: pintu barat ke gudang (-0,86)
  // + sekat shower di dalam. Makan menghadap BARAT / koridor: pintu
  // belakang ke dapur (-1,8) + DEPAN ke ruang tamu (1,8 — pintu 5, kini
  // di dinding selatan yang baru); pintu kiri ke koridor (7) HILANG.
  // Tamu + kerja menghadap UTARA: pintu DEPAN ke teras (0, pintu luar
  // baru, frontInset 0,26) + kiri/kanan ke foyer; pintu belakang hilang
  // (sisi utara kini terbuka).
  scene.add(roomNew(buildKMWC, -1.465, -3.96, { doors: { left: [-0.86] } }));       // 2,27 x 2,88
  scene.add(roomNew(buildRuangMakan, 5.7, 2.12, { doors: { back: [-1.8], front: [1.8] }, openSide: 'west' }));    // 4,6 x 4,0
  scene.add(roomNew(buildRuangTamu, 5.7, 8.2, { doors: { front: [0], left: [-1.8] }, openSide: 'north', frontInset: 0.26 }));      // 4,6 x 4,6
  scene.add(roomNew(buildKamarKerja, -4.65, 8.25, { doors: { front: [0], right: [1.5] }, openSide: 'north', frontInset: 0.26 }));  // 4,5 x 4,5

  // --- koridor: lantai + karpet + bangku ---
  const korFloor = std({ color: 0x9a7a52, roughness: 0.8 });
  // k1 ikut melebar bersama KM/WC: 1,68 -> 2,27 m (pusat -1,465).
  const k1 = box(2.27, 0.04, 2.52, korFloor); put(k1, -1.465, 0, -1.26); scene.add(k1);
  const k2 = box(4.45, 0.04, 6.0, korFloor); put(k2, 1.175, 0, 3.0); scene.add(k2);
  // Lantai penghubung makan<->tamu (28 Nov 2026): ada strip tanpa lantai
  // z 4,12..5,78 di kolom timur (lantai makan berakhir 4,12, dinding utara
  // tamu di 5,78) + dinding luar timur terputus di rentang yang sama.
  // (4 arah hadap: strip diperpanjang sampai z 5,9 — dinding utara tamu
  // kini TERBUKA, tapaknya harus tertutup lantai supaya plan tidak
  // menampilkan rumput.)
  const stripFloor = box(4.6, 0.04, 1.78, korFloor); put(stripFloor, 5.7, 0, 5.01); scene.add(stripFloor);
  const stripWall = box(0.12, 3.84, 1.78, std({ color: 0xe8dcc8, roughness: 0.9 }));
  put(stripWall, 8.06, 1.92, 5.01); scene.add(stripWall);
  // Ambang pintu gudang<->kamar (28 Nov 2026): lantai gudang berakhir
  // z -0,23, dinding utara kamar di z -0,07 — strip tanah 0,23 m di antaranya.
  const thr = box(1.0, 0.04, 0.3, korFloor); put(thr, -5.34, 0, -0.1); scene.add(thr);
  // Strip lantai gudang<->kamar (28 Nov 2026): celah tanah z -0,23..-0,07
  // di SEPANJANG dinding utara kamar, bukan cuma di bawah pintu — dari
  // atas (shot plan) terbaca sebagai garis rumput yang membelah rumah.
  // Dua segmen mengapit ambang (thr) supaya tidak tumpang tindih dan
  // z-fighting dengan ambang: barat x -8,25..-5,84, timur x -4,84..-2,6.
  const gapW = box(2.41, 0.04, 0.16, korFloor); put(gapW, -7.045, 0, -0.15); scene.add(gapW);
  const gapE = box(2.24, 0.04, 0.16, korFloor); put(gapE, -3.72, 0, -0.15); scene.add(gapE);
  const rug = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 4.0),
    std({ color: 0xa03a30, roughness: 0.95 }));
  // JANGAN pakai put() di sini — put() me-reset rotation ke (0,0,0)
  // sehingga karpet berdiri tegak seperti dinding (bug cek visual:
  // karpet merah sempat jadi "dinding merah" di tengah rumah).
  rug.rotation.x = -Math.PI / 2; rug.receiveShadow = true;
  rug.position.set(1.175, 0.025, 3.0); scene.add(rug);
  const bench = box(1.4, 0.08, 0.4, std({ color: 0x6b4a2e, roughness: 0.8 }));
  put(bench, 2.9, 0.45, 1.0); scene.add(bench);
  for (const dx of [-0.6, 0.6]) {
    const leg = box(0.08, 0.45, 0.35, std({ color: 0x4a3220, roughness: 0.9 }));
    put(leg, 2.9 + dx, 0.225, 1.0); scene.add(leg);
  }

  // --- foyer + Pintu Utama (tengah-selatan, menghadap teras) ---
  const foyFloor = box(5.8, 0.04, 4.5, std({ color: 0x8a6a42, roughness: 0.8 }));
  put(foyFloor, 0.5, 0, 8.25); scene.add(foyFloor);
  const foyRug = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 3.0),
    std({ color: 0x2a4a6e, roughness: 0.95 }));
  // Sama seperti karpet koridor: position langsung, bukan put()
  // (put() me-reset rotation — karpet biru sempat berdiri tegak
  // di balik pintu utama).
  foyRug.rotation.x = -Math.PI / 2; foyRug.receiveShadow = true;
  foyRug.position.set(0.5, 0.025, 8.25); scene.add(foyRug);
  // dinding depan foyer (dua segmen) + kusen + pintu sedikit terbuka —
  // bagian dari FASAD (cangkang), jadi ikut tersembunyi saat ?roof=0.
  const wallMat = std({ color: 0xe8dcc8, roughness: 0.9 });
  const wL = box(2.3, 3.84, 0.12, wallMat); put(wL, -1.25, 1.92, 10.5); shell.add(wL);
  const wR = box(2.3, 3.84, 0.12, wallMat); put(wR, 2.25, 1.92, 10.5); shell.add(wR);
  const frameMat = std({ color: 0x4a3220, roughness: 0.8 });
  const fL = box(0.1, 2.2, 0.16, frameMat); put(fL, -0.06, 1.1, 10.5); shell.add(fL);
  const fR = box(0.1, 2.2, 0.16, frameMat); put(fR, 1.06, 1.1, 10.5); shell.add(fR);
  const fT = box(1.22, 0.1, 0.16, frameMat); put(fT, 0.5, 2.25, 10.5); shell.add(fT);
  const door = box(0.98, 2.1, 0.06, std({ color: 0x6b4423, roughness: 0.7 }));
  put(door, 0.62, 1.05, 10.62, 0, 0.5, 0); shell.add(door);
  // rak sepatu kecil di foyer
  const rack = box(0.9, 0.08, 0.3, std({ color: 0x6b4a2e, roughness: 0.8 }));
  put(rack, -1.9, 0.35, 7.0); scene.add(rack);
  const rack2 = rack.clone(); put(rack2, -1.9, 0.7, 7.0); scene.add(rack2);

  // --- teras (depan rumah) + carport (tiang + mobil + ATAP) ---
  const teras = box(16.32, 0.04, 3.0, std({ color: 0xc8b89a, roughness: 0.85 }));
  put(teras, -0.09, 0, 12.0); scene.add(teras);
  const carpad = box(5.85, 0.04, 2.0, std({ color: 0x9a9a9a, roughness: 0.9 }));
  put(carpad, -5.33, 0, 14.5); scene.add(carpad);
  // Tiang + atap teras/carport = cangkang (ikut tersembunyi ?roof=0).
  // Atap miring (lean-to) genteng: tepi atas menempel fasad di
  // (z 10,5, y 3,6), menurun ke depan. Tinggi atap teras di atas
  // Najmi (1,75 m, berdiri di [1.8,0,11.5]) = ~3,4 m — lega.
  const tilePorch = new THREE.MeshStandardMaterial({ map: tileTex([4, 2]), roughness: 0.85 });
  // Atap teras: x -2,1..8,37 (timur carport), z 10,5..13,8, y 3,6->2,95.
  const roofTeras = box(10.47, 0.1, 3.37, tilePorch);
  put(roofTeras, 3.135, 3.275, 12.15, 0.1945, 0, 0); shell.add(roofTeras);
  const fasTeras = box(10.47, 0.24, 0.06, std({ color: 0x4a3220, roughness: 0.8 }));
  put(fasTeras, 3.135, 2.88, 13.82); shell.add(fasTeras);
  // Atap carport: x -8,55..-2,1, z 10,5..15,8, y 3,6->2,6 (lebih dalam).
  const roofCar = box(6.45, 0.1, 5.4, tilePorch);
  put(roofCar, -5.325, 3.1, 13.15, 0.1865, 0, 0); shell.add(roofCar);
  const fasCar = box(6.45, 0.24, 0.06, std({ color: 0x4a3220, roughness: 0.8 }));
  put(fasCar, -5.325, 2.53, 15.82); shell.add(fasCar);
  // Tiang: 4 carport (belakang 3,5 m mencapai atap di z 10,8; depan
  // 2,7 m di z 15,2) + 2 tambahan di tepi depan teras (3,05 m).
  const postMat = std({ color: 0x4a4a4a, roughness: 0.6, metalness: 0.4 });
  for (const [x, z, h] of [
    [-8.0, 10.8, 3.5], [-2.65, 10.8, 3.5],
    [-8.0, 15.2, 2.7], [-2.65, 15.2, 2.7],
    [7.9, 13.2, 3.05], [-7.9, 13.2, 3.05],
  ]) {
    const p = cyl(0.07, 0.07, h, 10, postMat);
    put(p, x, h / 2, z); shell.add(p);
  }
  const car = buildCar();
  put(car, -5.3, 0.06, 13.0); scene.add(car);
  // tanaman di sudut teras
  for (const [x, z] of [[7.6, 12.8], [-7.9, 12.8]]) {
    const pot = cyl(0.22, 0.18, 0.4, 12, std({ color: 0xa05a2a, roughness: 0.8 }));
    put(pot, x, 0.2, z); scene.add(pot);
    const bush = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), std({ color: 0x4e8a3d, roughness: 0.9 }));
    put(bush, x, 0.7, z); bush.castShadow = true; scene.add(bush);
  }

  // --- pohon di sekeliling rumah (tidak menutupi tampak depan) ---
  for (const [x, z, s] of [[-11, -4, 1.2], [11, -3, 1.0], [-11, 6, 0.9], [11, 8, 1.1], [-10, -8, 1.3], [10, -8, 1.2]]) {
    const t = buildTree(s);
    put(t, x, 0, z); scene.add(t);
  }

  // ============ CANGKANG EKSTERIOR (shell) ============
  const tileMain = new THREE.MeshStandardMaterial({ map: tileTex([6, 4]), roughness: 0.85 });
  const ROOF_A = 0.386; // sudut kemiringan atap: atan(3,5 / 8,62) ~ 22 derajat
  // --- atap pelana: bubungan sejajar sumbu x di z 2,5, y 7,5;
  // lisplang bawah (eaves) y 4,0; menjorok 0,6 m melewati dinding.
  const slopeN = box(17.52, 0.12, 9.31, tileMain);
  put(slopeN, -0.09, 5.75, -1.81, -ROOF_A, 0, 0); shell.add(slopeN);
  const slopeS = box(17.52, 0.12, 9.29, tileMain);
  put(slopeS, -0.09, 5.75, 6.8, ROOF_A, 0, 0); shell.add(slopeS);
  // Lisplang: tepi bawah utara/selatan + bargeboard di kedua ujung
  // timur-barat (mengikuti kemiringan, puncak rata dengan genteng).
  const fasciaMat = std({ color: 0x4a3220, roughness: 0.8 });
  const fN = box(17.52, 0.28, 0.06, fasciaMat); put(fN, -0.09, 3.92, -6.14); shell.add(fN);
  const fS = box(17.52, 0.28, 0.06, fasciaMat); put(fS, -0.09, 3.92, 11.12); shell.add(fS);
  for (const sx of [-8.85, 8.67]) {
    const bN = box(0.06, 0.24, 9.31, fasciaMat); put(bN, sx, 5.69, -1.81, -ROOF_A, 0, 0); shell.add(bN);
    const bS = box(0.06, 0.24, 9.29, fasciaMat); put(bS, sx, 5.69, 6.8, ROOF_A, 0, 0); shell.add(bS);
  }
  // Balok bubungan di bawah atap.
  const ridge = box(16.5, 0.18, 0.22, fasciaMat); put(ridge, -0.09, 7.32, 2.5); shell.add(ridge);
  // Segitiga gable di kedua ujung timur-barat + ventilasi bundar.
  const gableMat = std({ color: 0xe8dcc8, roughness: 0.9, side: THREE.DoubleSide });
  const gW = gableTriangle(gableMat); gW.position.x = -8.25; shell.add(gW);
  const gE = gableTriangle(gableMat); gE.position.x = 8.19; shell.add(gE);
  shell.add(gableVent(-8.4));
  shell.add(gableVent(8.22));

  // --- fasad depan (z 10,5): dinding krem + 4 jendela asli ---
  // Kamar kerja (x -6,9..-2,4): 2 jendela di x -6,0 dan -3,3.
  const fSillK = box(4.5, 0.9, 0.12, wallMat); put(fSillK, -4.65, 0.45, 10.5); shell.add(fSillK);
  const fLinK = box(4.5, 1.54, 0.12, wallMat); put(fLinK, -4.65, 3.07, 10.5); shell.add(fLinK);
  const fP1 = box(0.35, 1.4, 0.12, wallMat); put(fP1, -6.725, 1.6, 10.5); shell.add(fP1);
  const fP2 = box(1.6, 1.4, 0.12, wallMat); put(fP2, -4.65, 1.6, 10.5); shell.add(fP2);
  const fP3 = box(0.35, 1.4, 0.12, wallMat); put(fP3, -2.575, 1.6, 10.5); shell.add(fP3);
  facadeWindow(shell, -6.0);
  facadeWindow(shell, -3.3);
  // Ruang tamu (x 3,4..8,0): 2 jendela di x 4,5 dan 6,9.
  const fSillT = box(4.6, 0.9, 0.12, wallMat); put(fSillT, 5.7, 0.45, 10.5); shell.add(fSillT);
  const fLinT = box(4.6, 1.54, 0.12, wallMat); put(fLinT, 5.7, 3.07, 10.5); shell.add(fLinT);
  const fQ1 = box(0.55, 1.4, 0.12, wallMat); put(fQ1, 3.675, 1.6, 10.5); shell.add(fQ1);
  const fQ2 = box(1.3, 1.4, 0.12, wallMat); put(fQ2, 5.7, 1.6, 10.5); shell.add(fQ2);
  const fQ3 = box(0.55, 1.4, 0.12, wallMat); put(fQ3, 7.725, 1.6, 10.5); shell.add(fQ3);
  facadeWindow(shell, 4.5);
  facadeWindow(shell, 6.9);

  // ============ BUKAN cangkang (selalu terlihat) ============
  // --- plinth: alas beton di sekeliling footprint (rata lantai) ---
  const plinthMat = std({ color: 0xa8a29a, roughness: 0.95 });
  const pN = box(16.92, 0.14, 0.3, plinthMat); put(pN, -0.09, -0.05, -5.67); scene.add(pN);
  const pW = box(0.3, 0.14, 16.32, plinthMat); put(pW, -8.4, -0.05, 2.49); scene.add(pW);
  const pE = box(0.3, 0.14, 16.32, plinthMat); put(pE, 8.22, -0.05, 2.49); scene.add(pE);
  // (Sisi selatan tidak perlu: teras sudah jadi alas depan.)

  // --- pagar depan + gerbang (z 17, rendah 0,9 m) ---
  const ironMat = std({ color: 0x3a3a3a, roughness: 0.6, metalness: 0.4 });
  for (const [x0, x1] of [[-8.25, -0.5], [1.5, 8.07]]) {
    const len = x1 - x0, cx = (x0 + x1) / 2;
    const base = box(len, 0.45, 0.12, plinthMat); put(base, cx, 0.225, 17); scene.add(base);
    const rail = box(len, 0.06, 0.06, ironMat); put(rail, cx, 0.9, 17); scene.add(rail);
    for (let x = x0 + 0.25; x < x1 - 0.1; x += 0.5) {
      const bar = box(0.04, 0.45, 0.04, ironMat); put(bar, x, 0.675, 17); scene.add(bar);
    }
    for (const px of [x0, (x0 + x1) / 2, x1]) {
      const pil = box(0.18, 0.95, 0.18, wallMat); put(pil, px, 0.475, 17); scene.add(pil);
      const cap = box(0.26, 0.06, 0.26, ironMat); put(cap, px, 0.98, 17); scene.add(cap);
    }
  }
  // Gerbang di jalur jalan (x -0,5..1,5): pintu jeruji sedikit
  // terbuka ke arah jalan, engsel di tiang barat.
  const gate = new THREE.Group();
  gate.position.set(-0.5, 0, 17);
  gate.rotation.y = -0.5;
  const gTop = box(1.9, 0.06, 0.05, ironMat); put(gTop, 0.95, 0.87, 0); gate.add(gTop);
  const gBot = box(1.9, 0.06, 0.05, ironMat); put(gBot, 0.95, 0.15, 0); gate.add(gBot);
  for (let x = 0.15; x <= 1.8; x += 0.33) {
    const bar = box(0.04, 0.78, 0.04, ironMat); put(bar, x, 0.51, 0); gate.add(bar);
  }
  scene.add(gate);

  shell.visible = showRoof;
  console.log('TRIANGLES rumah =', countTriangles(scene));
  console.log('TRIANGLES shell (atap+fasad+atap teras/carport) =', countTriangles(shell));
}
