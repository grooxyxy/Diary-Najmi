// ============================================================================
// set-gudang.js — RUANG GUDANG rumah Najmi, Jakarta (staging LEGA).
//
// Denah asli di gambar: gudang hanya 1,8 m x 2,4 m, di sudut kiri atas
// denah rumah, bersebelahan dengan KM/WC. Versi staging ini DIPERBESAR
// menjadi lantai 5,2 m (x -2,6..+2,6) x 4,2 m (z -2,1..+2,1), tinggi
// dinding 3,4 m — supaya karakter Najmi Tall Tale (~1,58 m), 2 rak besi,
// rak kayu beroda, tangga, sepeda, dan Pintu ke Dunia Lain muat LEGA
// tanpa sesak. Ukuran asli 1,8 x 2,4 m tetap dicatat di sini sebagai
// ukuran denah, bukan ukuran staging.
//
// Open-front dollhouse (seperti set gang-detail): HANYA dinding belakang
// (z=-2,1), kiri (x=-2,6), kanan (x=+2,6) + lantai. TANPA dinding depan
// (z=+2,1) dan TANPA plafon penuh — hanya balok kayu gelap + lis di
// y=3,4 — supaya kamera dari +z bisa melihat isi gudang.
// Origin (0,0,0) = tengah lantai.
//
// HERO (sesuai gambar denah):
//   Pintu ke Dunia Lain di tengah dinding belakang, ±0,9 m x 2,1 m,
//   kayu tua dengan ukiran melingkar (cincin TorusGeometry konsentris +
//   lengkung atas ExtrudeGeometry), pegangan kuningan (metalness 0.6).
//   Pintu sedikit terbuka (engsel kanan, celah di kiri) dan tersembunyi
//   DI BALIK rak kayu beroda yang digeser ke kanan + diputar ~66° jadi
//   menghadap samping, jadi pintu + cahaya biru cyan TERBUKA dan terbaca
//   dari kamera — rak hanya menutupi sisi kanan pintu.
//   Di balik celah: bidang emissive cyan + PointLight cyan (0x66ccff),
//   kontras dengan lampu gudang yang hangat redup.
//
// Teknik (skill threejs-aaa-graphics-builder):
//   - Silhouette dulu: pintu portal + rak beroda adalah bentuk pertama
//     yang terbaca; prop kecil mengisi sesudahnya.
//   - Authored forms: LatheGeometry (kaleng cat, toples, ember, kap
//     lampu), TorusGeometry (cincin pintu, roda, ban, gulungan tali),
//     TubeGeometry (kabel, rantai, sarang laba-laba), ExtrudeGeometry
//     (lengkung pintu, gergaji), PlaneGeometry di-displace (terpal,
//     karpet lusuh), mergeGeometries via bake() untuk kardus/kaleng/
//     toples/baut yang berulang.
//   - Material kit bersama (MeshStandardMaterial saja — converter
//     Sakura mengubahnya ke Toon; BUKAN MeshToonMaterial langsung):
//     kayu tua roughness 0.95, besi metalness 0.4, kardus 0.95,
//     kaca transparent opacity 0.35, emissive hanya lampu + portal.
//   - Lighting: key dari jendela (DirectionalLight + shadow 2048),
//     fill HemisphereLight hangat redup, practical lampu gantung hangat,
//     rim/aksen cyan dari portal.
//
// TIDAK mengubah index.html / file lain. Dipakai: buildGudang(scene).
// ============================================================================
import * as THREE from 'three';
import { rngKit, bake, trs } from './vendor/sakura/src/core/util.js';
import { countTriangles } from './vendor/buildings-detailed.js';

const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0, ...o });

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// ---------- tekstur kanvas ----------
/** Lantai beton: abu + noda oli + retak halus + garis nat. */
function floorTex() {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#8d8a82'; g.fillRect(0, 0, w, h);
    const r = rngKit(11);
    for (let i = 0; i < 500; i++) {
      g.fillStyle = `rgba(0,0,0,${r.range(0.02, 0.06).toFixed(3)})`;
      const d = r.range(2, 10);
      g.beginPath(); g.arc(r.range(0, w), r.range(0, h), d, 0, Math.PI * 2); g.fill();
    }
    for (let i = 0; i < 260; i++) {
      g.fillStyle = `rgba(255,255,255,${r.range(0.02, 0.05).toFixed(3)})`;
      const d = r.range(2, 7);
      g.beginPath(); g.arc(r.range(0, w), r.range(0, h), d, 0, Math.PI * 2); g.fill();
    }
    // noda oli gelap (2 besar + 3 kecil)
    for (let i = 0; i < 5; i++) {
      const x = r.range(40, w - 40), y = r.range(40, h - 40), d = r.range(18, 55);
      const grad = g.createRadialGradient(x, y, 2, x, y, d);
      grad.addColorStop(0, 'rgba(40,36,30,0.5)');
      grad.addColorStop(1, 'rgba(40,36,30,0)');
      g.fillStyle = grad; g.beginPath(); g.arc(x, y, d, 0, Math.PI * 2); g.fill();
    }
    // retak halus
    g.strokeStyle = 'rgba(50,46,40,0.55)'; g.lineWidth = 2;
    for (let i = 0; i < 9; i++) {
      g.beginPath();
      let x = r.range(0, w), y = r.range(0, h);
      g.moveTo(x, y);
      for (let j = 0; j < 5; j++) { x += r.range(-46, 46); y += r.range(-46, 46); g.lineTo(x, y); }
      g.stroke();
    }
    // nat lantai (kotak 128)
    g.strokeStyle = 'rgba(60,56,48,0.4)'; g.lineWidth = 3;
    for (let x = 0; x <= w; x += 128) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let y = 0; y <= h; y += 128) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  });
}

/** Plester dinding: mottling halus + noda lembap di bawah + retak rambut. */
function plasterTex() {
  const t = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#c9bda6'; g.fillRect(0, 0, w, h);
    const r = rngKit(23);
    for (let i = 0; i < 260; i++) {
      g.fillStyle = `rgba(0,0,0,${r.range(0.015, 0.04).toFixed(3)})`;
      const d = r.range(2, 6);
      g.beginPath(); g.arc(r.range(0, w), r.range(0, h), d, 0, Math.PI * 2); g.fill();
    }
    for (let i = 0; i < 220; i++) {
      g.fillStyle = `rgba(255,255,255,${r.range(0.02, 0.045).toFixed(3)})`;
      const d = r.range(2, 6);
      g.beginPath(); g.arc(r.range(0, w), r.range(0, h), d, 0, Math.PI * 2); g.fill();
    }
    g.strokeStyle = 'rgba(70,58,40,0.2)'; g.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      g.beginPath();
      let x = r.range(0, w), y = r.range(0, h);
      g.moveTo(x, y);
      for (let j = 0; j < 4; j++) { x += r.range(-26, 26); y += r.range(-26, 26); g.lineTo(x, y); }
      g.stroke();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 2);
  return t;
}

/** Karpet lusuh: anyaman garis + pinggir sobek (motif pudar). */
function rugTex() {
  return canvasTex(256, 320, (g, w, h) => {
    g.fillStyle = '#8a4a3a'; g.fillRect(0, 0, w, h);
    const cols = ['#a85438', '#c08a5a', '#6a3a2a', '#d8c8a8'];
    for (let y = 0; y < h; y += 16) {
      g.fillStyle = cols[(y / 16) % cols.length];
      g.fillRect(0, y, w, 8);
    }
    g.strokeStyle = '#d8c8a8'; g.lineWidth = 5; g.strokeRect(14, 14, w - 28, h - 28);
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2; g.strokeRect(26, 26, w - 52, h - 52);
    const r = rngKit(31);
    for (let i = 0; i < 120; i++) {
      g.fillStyle = `rgba(0,0,0,${r.range(0.03, 0.09).toFixed(3)})`;
      g.fillRect(r.range(0, w), r.range(0, h), r.range(2, 7), r.range(2, 7));
    }
  });
}

/** Label kardus kecil (teks + garis). */
function labelTex(text, bg = '#f5f0e0') {
  return canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#5a4632'; g.lineWidth = 5; g.strokeRect(8, 8, w - 16, h - 16);
    g.fillStyle = '#3a2e22'; g.font = 'bold 40px sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 - 12);
    g.fillRect(48, h - 34, w - 96, 4);
    g.font = '24px sans-serif'; g.fillStyle = '#6a5a44';
    g.fillText('JAKARTA', w / 2, h - 16);
  });
}

/** Serat kayu tua untuk daun pintu (garis vertikal gelap di cokelat tua). */
function oldWoodTex() {
  const t = canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = '#5a3a22'; g.fillRect(0, 0, w, h);
    const r = rngKit(47);
    for (let x = 0; x < w; x += 7) {
      g.strokeStyle = `rgba(30,18,8,${r.range(0.25, 0.55).toFixed(2)})`;
      g.lineWidth = r.range(1, 3);
      g.beginPath(); g.moveTo(x + r.range(-2, 2), 0);
      g.bezierCurveTo(x + r.range(-6, 6), h * 0.33, x + r.range(-6, 6), h * 0.66, x + r.range(-2, 2), h);
      g.stroke();
    }
    for (let i = 0; i < 26; i++) {
      g.strokeStyle = 'rgba(20,12,6,0.5)'; g.lineWidth = 1.5;
      const x = r.range(0, w), y = r.range(0, h);
      g.beginPath(); g.ellipse(x, y, r.range(3, 7), r.range(6, 12), 0, 0, Math.PI * 2); g.stroke();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// ---------- mesh helpers (kembalikan mesh, pemanggil yang memosisikan) ----------
function box(w, h, d, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = true; m.receiveShadow = true; return m;
}
function cyl(rt, rb, h, seg, mat) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.castShadow = true; m.receiveShadow = true; return m;
}
function sph(r, mat, ws = 10, hs = 8) {
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
function lathe(pts, seg, mat) {
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, seg), mat);
  m.castShadow = true; m.receiveShadow = true; return m;
}
/** Gabung daftar {geometry, matrix} jadi SATU mesh (mergeGeometries). */
function mergeParts(list, mat, parent) {
  if (!list.length) return null;
  const m = new THREE.Mesh(bake(list), mat);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m);
  return m;
}

// ---------- material kit bersama ----------
const M = {
  wall: std({ color: 0xffffff, roughness: 0.95, map: plasterTex() }),
  floor: std({ color: 0xffffff, roughness: 0.95, map: floorTex() }),
  woodOld: std({ color: 0x6a4526, roughness: 0.95, map: oldWoodTex() }),
  woodDark: std({ color: 0x4a2e18, roughness: 0.95 }),
  woodMid: std({ color: 0x8a6f4a, roughness: 0.9 }),
  woodPale: std({ color: 0xb59a72, roughness: 0.9 }),
  steel: std({ color: 0x7a7f88, metalness: 0.4, roughness: 0.5 }),
  steelDark: std({ color: 0x3a3f45, metalness: 0.4, roughness: 0.6 }),
  steelBlue: std({ color: 0x4a6a8a, metalness: 0.4, roughness: 0.5 }),
  brass: std({ color: 0xd4af37, metalness: 0.6, roughness: 0.35 }),
  cardboard: std({ color: 0xb98d5a, roughness: 0.95 }),
  tape: std({ color: 0xd8cdb2, roughness: 0.6 }),
  glass: new THREE.MeshStandardMaterial({ color: 0xcfe0e8, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.35 }),
  tarpBlue: std({ color: 0x2a5aa8, roughness: 0.85, side: THREE.DoubleSide }),
  red: std({ color: 0xb3261e, roughness: 0.6 }),
  tyre: std({ color: 0x1a1c1e, roughness: 0.95 }),
  rust: std({ color: 0x7a4a30, roughness: 0.9, metalness: 0.2 }),
  rope: std({ color: 0xc8b088, roughness: 0.95 }),
  dark: std({ color: 0x2a2e33, roughness: 0.9 }),
};

// Ukuran staging (denah asli 1,8 x 2,4 m — lihat header).
// `W` bisa dipersempit oleh buildGudang(scene, width) — mode rumah
// (28 Nov 2026): gudang 5,2 -> 4,71 m supaya KM/WC melebar 0,6 m;
// `SH` = geseran barang sisi timur ke barat supaya tetap menempel
// dinding timur yang baru (SH = (5,2 - W) / 2).
let W = 5.2, SH = 0;
const D = 4.2, H = 3.4; // lantai x, z, tinggi dinding

// ---------- shell: lantai + 3 dinding + balok + lis (open-front) ----------
// `eastDoor` (28 Nov 2026, 4 arah hadap): pusat-z LOKAL bukaan pintu di
// dinding timur (mode rumah: ke KM/WC, z -1,725 -> dunia -4,82, sejajar
// dengan pintu barat KM/WC). Dinding timur dipecah (lintel + segmen
// selatan) + lis bawah dibelah supaya kaki pintu tidak tertutup. Bukaan
// 0,75 x 1,75 m lokal (= 0,9 x 2,1 m final, sama seperti pintu lain).
// Daun pintunya TIDAK dibuat di sini — daun tunggal pintu ini dibuat
// oleh doorUnit KM/WC (buildShell rooms.js, doors.left) di sisi KM/WC;
// gudang hanya membuat BUKAANNYA. Tanpa eastDoor, shell tidak berubah.
function buildShell(scene, eastDoor = null) {
  const floor = plane(W, D, M.floor);
  put(floor, 0, 0, 0, 0, -Math.PI / 2); floor.receiveShadow = true; scene.add(floor);

  // dinding belakang (z=-2,1) + kiri (x=-2,6) + kanan (x=+2,6); tebal 0,15
  const back = box(W + 0.3, H, 0.15, M.wall); put(back, 0, H / 2, -D / 2 - 0.075); scene.add(back);
  const left = box(0.15, H, D, M.wall); put(left, -W / 2 - 0.075, H / 2, 0); scene.add(left);
  if (eastDoor == null) {
    const right = box(0.15, H, D, M.wall); put(right, W / 2 + 0.075, H / 2, 0); scene.add(right);
  } else {
    const DW = 0.75, DH = 1.75;
    const z0 = eastDoor - DW / 2, z1 = eastDoor + DW / 2;
    if (z0 - (-D / 2) > 0.05) {
      const segN = box(0.15, H, z0 + D / 2, M.wall);
      put(segN, W / 2 + 0.075, H / 2, (-D / 2 + z0) / 2); scene.add(segN);
    }
    if (D / 2 - z1 > 0.05) {
      const segS = box(0.15, H, D / 2 - z1, M.wall);
      put(segS, W / 2 + 0.075, H / 2, (z1 + D / 2) / 2); scene.add(segS);
    }
    const lintel = box(0.15, H - DH, z1 - z0, M.wall);
    put(lintel, W / 2 + 0.075, DH + (H - DH) / 2, eastDoor); scene.add(lintel);
  }

  // lis bawah (baseboard) di ketiga dinding, dalam
  const bbBack = box(W, 0.14, 0.03, M.woodDark); put(bbBack, 0, 0.07, -D / 2 + 0.015); scene.add(bbBack);
  const bbL = box(0.03, 0.14, D, M.woodDark); put(bbL, -W / 2 + 0.015, 0.07, 0); scene.add(bbL);
  // Lis dinding timur DIBELAH di bukaan pintu (supaya tidak menutup kaki
  // pintu): hanya segmen selatan bukaan (z -1,35..2,1).
  if (eastDoor == null) {
    const bbR = box(0.03, 0.14, D, M.woodDark); put(bbR, W / 2 - 0.015, 0.07, 0); scene.add(bbR);
  } else {
    const z1 = eastDoor + 0.375;
    const bbR = box(0.03, 0.14, D / 2 - z1, M.woodDark);
    put(bbR, W / 2 - 0.015, 0.07, (z1 + D / 2) / 2); scene.add(bbR);
  }

  // balok kayu gelap melintang (pengganti plafon) + lis atas dinding
  for (const z of [-1.4, 0, 1.4]) {
    const beam = box(W + 0.1, 0.2, 0.24, M.woodDark);
    put(beam, 0, H - 0.08, z); scene.add(beam);
    // braket besi di ujung balok
    for (const s of [-1, 1]) {
      const br = box(0.04, 0.22, 0.26, M.steelDark);
      put(br, s * (W / 2 - 0.02), H - 0.2, z); scene.add(br);
    }
  }
  const trimB = box(W, 0.1, 0.06, M.woodMid); put(trimB, 0, H - 0.05, -D / 2 + 0.03); scene.add(trimB);
  const trimL = box(0.06, 0.1, D, M.woodMid); put(trimL, -W / 2 + 0.03, H - 0.05, 0); scene.add(trimL);
  const trimR = box(0.06, 0.1, D, M.woodMid); put(trimR, W / 2 - 0.03, H - 0.05, 0); scene.add(trimR);

  // karpet lusuh di tengah lantai (depan pintu, tempat Najmi berdiri)
  const rug = plane(1.7, 2.3, new THREE.MeshStandardMaterial({ map: rugTex(), roughness: 0.95 }));
  put(rug, 0.25, 0.012, 0.55, 0.06, -Math.PI / 2); rug.castShadow = false; scene.add(rug);
  // rumbai karpet: deret kotak kecil di 2 ujung
  const fringeList = [];
  for (let i = 0; i < 12; i++) {
    fringeList.push({ geometry: new THREE.BoxGeometry(0.05, 0.008, 0.12), matrix: trs(-0.45 + i * 0.082, 0.012, 0.55 - 1.22, 0, 0.06, 0) });
    fringeList.push({ geometry: new THREE.BoxGeometry(0.05, 0.008, 0.12), matrix: trs(-0.45 + i * 0.082, 0.012, 0.55 + 1.22, 0, 0.06, 0) });
  }
  mergeParts(fringeList, std({ color: 0xd8c8a8, roughness: 0.95 }), scene);
}

// ---------- jendela kecil tinggi di dinding kiri + berkas cahaya ----------
function buildWindow(scene) {
  const g = new THREE.Group();
  // lubang gelap + kaca hangat terang (siang) + kusen + mullion
  const hole = plane(0.74, 0.54, std({ color: 0x2a2e33 }));
  put(hole, -W / 2 + 0.012, 2.55, 0.25, Math.PI / 2); hole.castShadow = false; g.add(hole);
  const glass = plane(0.66, 0.46, new THREE.MeshStandardMaterial({
    color: 0xffe9b8, emissive: 0xffdf9a, emissiveIntensity: 0.9, roughness: 0.2, transparent: true, opacity: 0.92,
  }));
  put(glass, -W / 2 + 0.02, 2.55, 0.25, Math.PI / 2); glass.castShadow = false; g.add(glass);
  for (const [w, h, x, y] of [[0.78, 0.06, 0, 2.86], [0.78, 0.06, 0, 2.24], [0.06, 0.68, -0.08, 2.55], [0.06, 0.68, 0.58, 2.55]]) {
    const f = box(0.04, h, w, M.woodMid);
    put(f, -W / 2 + 0.03, y, x + 0.25); g.add(f);
  }
  // mullion silang di depan kaca
  const mv = box(0.03, 0.46, 0.04, M.woodDark); put(mv, -W / 2 + 0.045, 2.55, 0.25); g.add(mv);
  const mh = box(0.03, 0.04, 0.66, M.woodDark); put(mh, -W / 2 + 0.045, 2.55, 0.25); g.add(mh);
  // ambang menonjol
  const sill = box(0.09, 0.05, 0.86, M.woodMid); put(sill, -W / 2 + 0.045, 2.22, 0.25); g.add(sill);
  scene.add(g);

  // berkas cahaya miring dari jendela ke lantai (bidang transparan hangat)
  const shaft = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.72), new THREE.MeshStandardMaterial({
    color: 0xffe9b8, transparent: true, opacity: 0.09, side: THREE.DoubleSide, depthWrite: false,
  }));
  put(shaft, -1.55, 1.3, 0.4, 0.12, 0, -0.98); shaft.castShadow = false; shaft.receiveShadow = false;
  scene.add(shaft);
  const shaft2 = shaft.clone();
  put(shaft2, -1.55, 1.3, 0.15, 0.12, 0, -0.98); scene.add(shaft2);
  // debu beterbangan di dalam berkas (bola kecil, tanpa bayangan)
  const r = rngKit(77);
  for (let i = 0; i < 16; i++) {
    const mote = sph(0.008, std({ color: 0xfff2c0, emissive: 0xffe9a8, emissiveIntensity: 0.7 }), 6, 5);
    put(mote, -2.3 + r.range(0, 1.9), 0.4 + r.range(0, 2.0), 0.05 + r.range(0, 0.5));
    mote.castShadow = false; scene.add(mote);
  }
}

// ---------- bentuk lengkung atas pintu (arch) ----------
function archShape(w, h) {
  const s = new THREE.Shape();
  const r = w / 2;
  s.moveTo(-r, 0); s.lineTo(-r, h - r);
  s.absarc(0, h - r, r, Math.PI, 0, true);
  s.lineTo(r, 0); s.closePath();
  return s;
}

// ---------- HERO: Pintu ke Dunia Lain (tengah dinding belakang) ----------
// Ukuran ±0,9 m x 2,1 m. Engsel kanan, daun sedikit terbuka (celah kiri).
// Posisi: pusat daun di (0, 0..2,1, z≈-2,0); kusen menonjol dari dinding.
function buildPortal(scene) {
  const g = new THREE.Group();
  scene.add(g);
  // bayangan lubang gelap di belakang pintu (membaca sebagai bukaan)
  const recess = plane(1.02, 2.2, std({ color: 0x141a22, roughness: 1 }));
  put(recess, 0, 1.1, -D / 2 + 0.012); recess.castShadow = false; g.add(recess);
  // bidang cahaya biru cyan di balik celah pintu (emissive, tanpa bayangan)
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0x66ccff, emissive: 0x33aaff, emissiveIntensity: 2.2, roughness: 0.4,
  });
  const glow = plane(0.94, 2.12, glowMat);
  put(glow, 0, 1.06, -D / 2 + 0.03); glow.castShadow = false; g.add(glow);
  // pusaran cahaya: 2 cincin cyan tipis di balik pintu (terlihat lewat celah)
  for (const [rad, op] of [[0.3, 0.9], [0.18, 0.7]]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(rad, 0.015, 6, 24),
      new THREE.MeshStandardMaterial({ color: 0x99ddff, emissive: 0x66ccff, emissiveIntensity: 1.6, transparent: true, opacity: op }));
    put(ring, 0, 1.25, -D / 2 + 0.045); ring.castShadow = false; g.add(ring);
  }

  // kusen: 2 tiang + ambang lengkung (extrude arch, kayu gelap)
  for (const s of [-1, 1]) {
    const jamb = box(0.1, 2.16, 0.12, M.woodDark);
    put(jamb, s * 0.5, 1.08, -D / 2 + 0.06); g.add(jamb);
    // paku kuningan di tiang kusen
    for (let i = 0; i < 3; i++) {
      const nail = sph(0.015, M.brass, 6, 5);
      put(nail, s * 0.5, 0.5 + i * 0.6, -D / 2 + 0.13); nail.castShadow = false; g.add(nail);
    }
  }
  const lintelGeo = new THREE.ExtrudeGeometry(archShape(1.14, 0.24), { depth: 0.1, bevelEnabled: false });
  const lintel = new THREE.Mesh(lintelGeo, M.woodDark);
  put(lintel, 0, 2.1, -D / 2 + 0.02); lintel.castShadow = true; g.add(lintel);
  // ambang bawah (threshold) batu aus
  const sill = box(1.14, 0.07, 0.24, std({ color: 0x7a756a, roughness: 0.95 }));
  put(sill, 0, 0.035, -D / 2 + 0.1); g.add(sill);

  // --- daun pintu: grup pivot di engsel kanan (x=+0,45), terbuka ~10° ---
  const leaf = new THREE.Group();
  leaf.position.set(0.45, 0, -D / 2 + 0.07);
  leaf.name = 'portalLeaf'; // dianimasikan oleh anim.js
  leaf.rotation.y = 0.3; // celah menganga di sisi kiri, cahaya mengintip
  g.add(leaf);
  // daun berlengkung atas (extrude arch, kayu tua berserat)
  const leafGeo = new THREE.ExtrudeGeometry(archShape(0.9, 2.1), { depth: 0.06, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 1, curveSegments: 18 });
  const leafMesh = new THREE.Mesh(leafGeo, M.woodOld);
  put(leafMesh, -0.45, 0, 0); leafMesh.castShadow = true; leafMesh.receiveShadow = true; leaf.add(leafMesh);
  // panel timbul: 2 persegi + rel tengah (di muka daun)
  for (const [py, ph] of [[1.55, 0.62], [0.68, 0.62]]) {
    const panel = box(0.58, ph, 0.025, M.woodOld);
    put(panel, -0.45, py, 0.075); leaf.add(panel);
    const inner = box(0.46, ph - 0.14, 0.012, M.woodDark);
    put(inner, -0.45, py, 0.09); leaf.add(inner);
  }
  const rail = box(0.86, 0.07, 0.02, M.woodDark);
  put(rail, -0.45, 1.12, 0.075); leaf.add(rail);
  // UKIRAN MELINGKAR: 5 cincin torus konsentris di tengah daun + bos kuningan
  const ringCenter = { x: -0.45, y: 1.55 };
  const ringRadii = [0.1, 0.16, 0.22, 0.28, 0.34];
  ringRadii.forEach((rad, i) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(rad, 0.016 - i * 0.001, 8, 48), M.woodDark);
    put(ring, ringCenter.x, ringCenter.y, 0.085); ring.castShadow = true; leaf.add(ring);
  });
  // ukiran radial: 8 jari dari pusat ke cincin luar
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const spoke = box(0.02, 0.24, 0.012, M.woodDark);
    put(spoke, ringCenter.x + Math.cos(a) * 0.22, ringCenter.y + Math.sin(a) * 0.22, 0.085, 0, 0, a + Math.PI / 2);
    leaf.add(spoke);
  }
  const boss = sph(0.055, M.brass, 12, 8);
  put(boss, ringCenter.x, ringCenter.y, 0.09); boss.castShadow = false; leaf.add(boss);
  // ukiran melingkar kecil di panel bawah (3 cincin)
  [0.07, 0.12, 0.17].forEach((rad) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(rad, 0.012, 6, 24), M.woodDark);
    put(ring, -0.45, 0.68, 0.085); ring.castShadow = true; leaf.add(ring);
  });
  // engsel besi (2) di sisi kanan daun + pegangan kuningan
  for (const hy of [0.55, 1.65]) {
    const hinge = box(0.05, 0.16, 0.03, M.steelDark);
    put(hinge, -0.02, hy, 0.07); leaf.add(hinge);
  }
  // pegangan kuningan: plat + cincin tarik (torus) + kenop
  const plate = box(0.07, 0.2, 0.02, M.brass);
  put(plate, -0.82, 1.05, 0.075); leaf.add(plate);
  const pullRing = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 6, 16), M.brass);
  put(pullRing, -0.82, 1.05, 0.11); pullRing.castShadow = true; leaf.add(pullRing);
  const knob = sph(0.03, M.brass, 8, 6);
  put(knob, -0.82, 1.05, 0.1); knob.castShadow = false; leaf.add(knob);
  // kunci kuningan kecil di bawah pegangan
  const keyhole = cyl(0.02, 0.02, 0.02, 8, M.brass);
  put(keyhole, -0.82, 0.82, 0.075, Math.PI / 2); leaf.add(keyhole);

  // celah cahaya: strip cyan terang di kusen kiri (cahaya bocor lewat celah)
  const gapGlow = plane(0.07, 2.0, new THREE.MeshStandardMaterial({
    color: 0x99ddff, emissive: 0x66ccff, emissiveIntensity: 2.6, roughness: 0.4,
  }));
  put(gapGlow, -0.48, 1.05, -D / 2 + 0.05); gapGlow.castShadow = false; g.add(gapGlow);
  // tumpahan cahaya cyan di lantai depan pintu (bidang emissive transparan)
  const spill = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.55), new THREE.MeshStandardMaterial({
    color: 0x66ccff, emissive: 0x33aaff, emissiveIntensity: 1.1, transparent: true, opacity: 0.45, depthWrite: false,
  }));
  put(spill, -0.15, 0.015, -1.72, 0.1, -Math.PI / 2); spill.castShadow = false; spill.receiveShadow = false;
  scene.add(spill);
  // PointLight cyan portal (aksen dingin, kontras lampu hangat)
  const portalLight = new THREE.PointLight(0x66ccff, 3.6, 4.0, 2);
  portalLight.position.set(-0.3, 1.15, -1.45);
  scene.add(portalLight);
}

// ---------- prop kecil berulang ----------
// Kardus: badan + selotip + 2 flap (satu terbuka) + label (opsional).
function cardboard(parent, w, h, d, x, y, z, ry, r, label) {
  const g = new THREE.Group();
  const col = r.pick([0xb98d5a, 0xa87c4e, 0xc49a68, 0x9c7448, 0xbd9264]);
  const body = box(w, h, d, std({ color: col, roughness: 0.95 }));
  put(body, 0, h / 2, 0); g.add(body);
  const tape = box(w * 0.16, 0.006, d * 0.98, M.tape);
  put(tape, 0, h + 0.003, 0); g.add(tape);
  const flap = box(w * 0.46, 0.008, d * 0.9, std({ color: col, roughness: 0.95 }));
  put(flap, -w * 0.24, h + 0.004, 0, 0, 0, 0.06); g.add(flap);
  const flap2 = box(w * 0.46, 0.008, d * 0.9, std({ color: col, roughness: 0.95 }));
  put(flap2, w * 0.24, h + 0.004, 0, 0, 0, -0.06); g.add(flap2);
  if (label) {
    const l = plane(w * 0.55, h * 0.4, new THREE.MeshStandardMaterial({ map: labelTex(label), roughness: 0.9 }));
    put(l, 0, h * 0.55, d / 2 + 0.003); l.castShadow = false; g.add(l);
  }
  put(g, x, y, z, ry);
  parent.add(g);
  return g;
}

// Kaleng cat LATHE (profil berlekuk: badan + bibir + tutup) + gagang kawat.
function paintCan(parent, x, y, z, r) {
  const g = new THREE.Group();
  const col = r.pick([0xb3261e, 0x2e7d5b, 0x1e5aa8, 0xd8d8d8, 0xf5be2a, 0x7d3c98]);
  const pts = [
    new THREE.Vector2(0.0, 0), new THREE.Vector2(0.09, 0), new THREE.Vector2(0.1, 0.01),
    new THREE.Vector2(0.1, 0.15), new THREE.Vector2(0.095, 0.17), new THREE.Vector2(0.085, 0.18),
    new THREE.Vector2(0.0, 0.18),
  ];
  const can = lathe(pts, 24, std({ color: col, metalness: 0.35, roughness: 0.45 }));
  put(can, 0, 0, 0); g.add(can);
  const lid = cyl(0.095, 0.095, 0.015, 20, M.steel);
  put(lid, 0, 0.185, 0); g.add(lid);
  // gagang kawat melengkung (torus setengah)
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.008, 5, 12, Math.PI), M.steelDark);
  put(handle, 0, 0.19, 0, 0, 0, 0); handle.castShadow = true; g.add(handle);
  // cipratan cat kering di bibir (bola kecil pipih)
  if (r.chance(0.6)) {
    const drip = sph(0.02, std({ color: col, roughness: 0.5 }), 6, 5);
    put(drip, 0.07, 0.19, 0.03); drip.scale.y = 0.5; drip.castShadow = false; g.add(drip);
  }
  put(g, x, y, z, r.range(0, Math.PI * 2));
  parent.add(g);
  return g;
}

// Toples kaca LATHE + isi + tutup (kaca: tanpa castShadow).
function glassJar(parent, x, y, z, r) {
  const g = new THREE.Group();
  const pts = [
    new THREE.Vector2(0.0, 0), new THREE.Vector2(0.07, 0), new THREE.Vector2(0.085, 0.02),
    new THREE.Vector2(0.085, 0.14), new THREE.Vector2(0.07, 0.17), new THREE.Vector2(0.065, 0.18),
    new THREE.Vector2(0.0, 0.18),
  ];
  const jar = new THREE.Mesh(new THREE.LatheGeometry(pts, 16), M.glass);
  jar.receiveShadow = true; g.add(jar);
  const fillCol = r.pick([0x8a6f4a, 0x6a7a2a, 0xd8b878, 0x9a8a7a, 0x5a6a8a]);
  const fill = cyl(0.07, 0.07, 0.09, 12, std({ color: fillCol, roughness: 0.95 }));
  put(fill, 0, 0.05, 0); g.add(fill);
  const lid = cyl(0.075, 0.075, 0.025, 12, r.pick([M.red, M.steelBlue, M.woodDark]));
  put(lid, 0, 0.19, 0); g.add(lid);
  put(g, x, y, z, r.range(0, Math.PI * 2));
  parent.add(g);
  return g;
}

// Buku tipis berdiri (deret di rak).
function bookRow(parent, x0, y, z, r, n) {
  const cols = [0xb3261e, 0x2e7d5b, 0x1e5aa8, 0xf5be2a, 0x7d3c98, 0x8a6f4a, 0x3a3f45];
  const list = [];
  let x = x0;
  for (let i = 0; i < n; i++) {
    const w = r.range(0.03, 0.05), h = r.range(0.2, 0.28);
    list.push({ geometry: new THREE.BoxGeometry(w, h, 0.16), matrix: trs(x, y + h / 2, z, 0, 0, r.range(-0.06, 0.06)) });
    x += w + 0.004;
  }
  const mats = cols.map((c) => std({ color: c, roughness: 0.85 }));
  // bake per warna tidak sepadan untuk 7 buku — satu mesh per warna via grup kecil:
  list.forEach((p, i) => {
    const m = new THREE.Mesh(bake([p]), mats[i % mats.length]);
    m.castShadow = true; m.receiveShadow = true; parent.add(m);
  });
}

// ---------- rak besi tinggi (4 papan) ----------
// Lokal: lebar 1,8 (x), dalam 0,5 (z), tinggi 2,2. Menghadap +z lokal.
function buildSteelRack(seed) {
  const g = new THREE.Group();
  const r = rngKit(seed);
  const Wd = 1.8, Dp = 0.5;
  // rangka: 4 tiang sudut + palang samping (merge, 1 mesh)
  const frameList = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    frameList.push({ geometry: new THREE.BoxGeometry(0.05, 2.2, 0.05), matrix: trs(sx * (Wd / 2 - 0.025), 1.1, sz * (Dp / 2 - 0.025)) });
  }
  for (const y of [0.22, 0.78, 1.34, 1.9]) {
    for (const sz of [-1, 1]) {
      frameList.push({ geometry: new THREE.BoxGeometry(Wd, 0.05, 0.05), matrix: trs(0, y, sz * (Dp / 2 - 0.025)) });
    }
  }
  // diagonal silang di sisi (2 batang miring per sisi)
  for (const sx of [-1, 1]) {
    frameList.push({ geometry: new THREE.BoxGeometry(0.04, 1.9, 0.04), matrix: trs(sx * (Wd / 2 - 0.025), 1.1, 0, 0.35, 0, 0) });
    frameList.push({ geometry: new THREE.BoxGeometry(0.04, 1.9, 0.04), matrix: trs(sx * (Wd / 2 - 0.025), 1.1, 0, -0.35, 0, 0) });
  }
  mergeParts(frameList, M.steelBlue, g);
  // 4 papan rak (kayu lapis) + baut di sudut (merge)
  const shelfYs = [0.22, 0.78, 1.34, 1.9];
  const shelfList = [];
  const boltList = [];
  for (const y of shelfYs) {
    shelfList.push({ geometry: new THREE.BoxGeometry(Wd, 0.04, Dp), matrix: trs(0, y, 0) });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      boltList.push({ geometry: new THREE.CylinderGeometry(0.015, 0.015, 0.02, 6), matrix: trs(sx * (Wd / 2 - 0.08), y + 0.03, sz * (Dp / 2 - 0.08)) });
    }
  }
  mergeParts(shelfList, M.woodPale, g);
  mergeParts(boltList, M.steelDark, g);

  // isi rak: tiap papan 3-4 slot (kardus / kaleng / toples / buku / perkakas)
  const labels = ['BUKU', 'MAINAN', 'ALAT', 'FOTO', 'KABEL', 'CAT', 'ARSP', 'PIRING'];
  shelfYs.forEach((y, si) => {
    const slots = [-0.62, -0.2, 0.22, 0.62];
    slots.forEach((sx, i) => {
      const kind = (si * 4 + i + seed) % 5;
      if (kind === 0) {
        cardboard(g, r.range(0.28, 0.4), r.range(0.22, 0.34), r.range(0.26, 0.36), sx, y + 0.02, r.range(-0.06, 0.06), r.range(-0.12, 0.12), r, r.chance(0.7) ? r.pick(labels) : '');
      } else if (kind === 1) {
        paintCan(g, sx, y + 0.02, r.range(-0.08, 0.08), r);
        if (r.chance(0.5)) paintCan(g, sx + 0.14, y + 0.02, r.range(-0.08, 0.08), r);
      } else if (kind === 2) {
        glassJar(g, sx, y + 0.02, r.range(-0.08, 0.08), r);
        glassJar(g, sx + 0.15, y + 0.02, r.range(-0.08, 0.08), r);
      } else if (kind === 3) {
        bookRow(g, sx - 0.12, y + 0.02, 0, r, r.int(4, 6));
      } else {
        // perkakas di papan: palu / kunci inggris / obeng
        const tool = r.pick(['hammer', 'wrench', 'screw']);
        if (tool === 'hammer') {
          const h = cyl(0.018, 0.018, 0.3, 6, M.woodMid);
          put(h, sx, y + 0.04, 0, 0, 0, Math.PI / 2); g.add(h);
          const head = box(0.12, 0.05, 0.05, M.steelDark);
          put(head, sx + 0.14, y + 0.05, 0, 0.3); g.add(head);
        } else if (tool === 'wrench') {
          const handle = box(0.22, 0.03, 0.04, M.steel);
          put(handle, sx, y + 0.035, 0, 0.4); g.add(handle);
          const jaw = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.015, 5, 10, Math.PI * 1.4), M.steel);
          put(jaw, sx + 0.13, y + 0.035, 0, 0, 0, 0.9); jaw.castShadow = true; g.add(jaw);
        } else {
          const h = cyl(0.012, 0.012, 0.16, 6, M.woodMid);
          put(h, sx, y + 0.035, 0, 0, 0, Math.PI / 2); g.add(h);
          const tip = cyl(0.015, 0.015, 0.05, 6, M.steel);
          put(tip, sx + 0.1, y + 0.035, 0, 0, 0, Math.PI / 2); g.add(tip);
        }
      }
    });
  });
  // kardus besar di lantai bawah rak + kaleng menumpuk
  cardboard(g, 0.5, 0.4, 0.42, -0.45, 0, 0, 0.1, r, 'BERAT');
  cardboard(g, 0.42, 0.32, 0.36, 0.45, 0, 0.02, -0.15, r, '');
  // di ATAS rak: tumpukan piring (8, silinder 16 segmen) + helm tua
  for (let i = 0; i < 8; i++) {
    const plate = cyl(0.11, 0.1, 0.015, 16, i % 2 ? std({ color: 0xf5f2e8, roughness: 0.5 }) : std({ color: 0x4a6a8a, roughness: 0.5 }));
    put(plate, 0.55, 2.22 + i * 0.017, 0, r.range(0, 0.2)); g.add(plate);
  }
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), std({ color: 0x2e7d5b, metalness: 0.3, roughness: 0.5 }));
  put(helmet, -0.55, 2.2, 0); helmet.castShadow = true; g.add(helmet);
  const visor = box(0.16, 0.05, 0.02, M.glass);
  put(visor, -0.55, 2.26, 0.12, 0, -0.15); visor.castShadow = false; g.add(visor);
  g.userData.triangles = countTriangles(g);
  return g;
}

// ---------- rak kayu BERODA di depan pintu (bisa digeser) ----------
// Digeser ke kanan + dimiringkan: pintu kiri + celah cyan mengintip.
// Lokal: lebar 1,4 (x), dalam 0,42 (z), tinggi 1,95. Rel geser di lantai.
function buildRollingRack(scene) {
  const g = new THREE.Group();
  const r = rngKit(91);
  const Wd = 1.4, Dp = 0.42;
  // rangka kayu: 4 tiang + 3 papan (bilah, bukan papan penuh — terlihat tembus)
  const frameList = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    frameList.push({ geometry: new THREE.BoxGeometry(0.06, 1.95, 0.06), matrix: trs(sx * (Wd / 2 - 0.03), 1.05, sz * (Dp / 2 - 0.03)) });
  }
  for (const y of [0.32, 0.95, 1.58]) {
    for (let k = 0; k < 4; k++) {
      frameList.push({ geometry: new THREE.BoxGeometry(Wd, 0.05, 0.09), matrix: trs(0, y, -Dp / 2 + 0.05 + k * 0.11) });
    }
  }
  // punggung bilah vertikal (belakang rak, menutupi pintu)
  for (let i = 0; i < 7; i++) {
    frameList.push({ geometry: new THREE.BoxGeometry(0.09, 1.85, 0.03), matrix: trs(-Wd / 2 + 0.12 + i * 0.2, 1.0, -Dp / 2 + 0.015) });
  }
  mergeParts(frameList, M.woodOld, g);
  // roda kecil (torus + as) di 4 sudut bawah + rel geser besi di lantai
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.025, 8, 16), M.tyre);
    put(wheel, sx * (Wd / 2 - 0.08), 0.095, sz * (Dp / 2 - 0.08), Math.PI / 2); wheel.castShadow = true; g.add(wheel);
    const axle = cyl(0.02, 0.02, 0.06, 6, M.steel);
    put(axle, sx * (Wd / 2 - 0.08), 0.095, sz * (Dp / 2 - 0.08), 0, 0, Math.PI / 2); g.add(axle);
    // braket roda
    const br = box(0.04, 0.08, 0.04, M.steelDark);
    put(br, sx * (Wd / 2 - 0.08), 0.16, sz * (Dp / 2 - 0.08)); g.add(br);
  }
  // gagang dorong (tube melengkung) di sisi kanan rak
  const hCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(Wd / 2, 1.1, 0.1), new THREE.Vector3(Wd / 2 + 0.12, 1.15, 0.1),
    new THREE.Vector3(Wd / 2 + 0.16, 1.3, 0.1),
  ]);
  const handle = new THREE.Mesh(new THREE.TubeGeometry(hCurve, 8, 0.02, 6), M.woodDark);
  handle.castShadow = true; g.add(handle);
  // isi rak: kardus + kaleng + gulungan kain di 3 tingkat
  cardboard(g, 0.42, 0.3, 0.32, -0.35, 0.34, 0, 0.08, r, 'LAMA');
  cardboard(g, 0.36, 0.26, 0.3, 0.32, 0.34, 0.02, -0.1, r, '');
  paintCan(g, -0.5, 0.97, 0, r);
  paintCan(g, -0.3, 0.97, 0.05, r);
  glassJar(g, 0.1, 0.97, 0, r);
  glassJar(g, 0.32, 0.97, -0.02, r);
  // gulungan kain/karpet tegak di tingkat atas
  const roll = cyl(0.09, 0.09, 0.5, 12, std({ color: 0x7d3c98, roughness: 0.95 }));
  put(roll, 0.5, 1.6, 0, 0.3); g.add(roll);
  const roll2 = cyl(0.07, 0.07, 0.44, 12, std({ color: 0x2e7d5b, roughness: 0.95 }));
  put(roll2, -0.55, 1.6, 0, -0.2); g.add(roll2);
  bookRow(g, -0.2, 1.6, 0, r, 5);
  // posisi akhir (FIX 28 Nov 2026, verifikasi visual wide): rak digeser
  // ke kanan DAN diputar ~66° (ry 1.15) jadi menghadap samping — profilnya
  // dari kamera jadi tipis, pintu + celah cyan di kiri TIDAK lagi tertutup
  // rak. Sebelumnya ry 0.3 di x 0.62 menutupi hampir seluruh pintu.
  put(g, 0.95, 0, -1.35, 1.15);
  g.name = 'rollingRack'; // digeser oleh anim.js
  scene.add(g);
  // rel geser besi di lantai (2 rel sejajar sumbu x, di jalur geser rak)
  for (const dz of [-0.16, 0.16]) {
    const rail = box(1.9, 0.03, 0.08, M.steelDark);
    put(rail, 0.6, 0.015, -1.35 + dz); scene.add(rail);
  }
  g.userData.triangles = countTriangles(g);
  return g;
}

// ---------- meja kerja (workbench) di sudut kanan-belakang ----------
// Meja + rak dinding di atasnya + ragum + perkakas + tumpukan papan.
function buildWorkbench(scene) {
  const g = new THREE.Group();
  const r = rngKit(55);
  // meja: top tebal + 4 kaki + rak bawah
  const top = box(1.5, 0.07, 0.6, M.woodMid); put(top, 0, 0.88, 0); g.add(top);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = box(0.08, 0.86, 0.08, M.woodDark);
    put(leg, sx * 0.68, 0.43, sz * 0.24); g.add(leg);
  }
  const lowShelf = box(1.4, 0.04, 0.5, M.woodPale); put(lowShelf, 0, 0.25, 0); g.add(lowShelf);
  cardboard(g, 0.4, 0.28, 0.36, -0.35, 0.27, 0, 0.1, r, 'PAKU');
  paintCan(g, 0.3, 0.27, 0, r); paintCan(g, 0.48, 0.27, 0.05, r);
  // ragum besi di ujung kiri meja: badan + rahang + ulir + gagang
  const viseBody = box(0.22, 0.14, 0.16, M.steelDark); put(viseBody, -0.55, 0.99, 0); g.add(viseBody);
  const jaw1 = box(0.04, 0.12, 0.16, M.steel); put(jaw1, -0.66, 1.06, 0); g.add(jaw1);
  const jaw2 = box(0.04, 0.12, 0.16, M.steel); put(jaw2, -0.44, 1.06, 0); g.add(jaw2);
  const screw = cyl(0.02, 0.02, 0.3, 6, M.steel); put(screw, -0.55, 0.99, 0.18, Math.PI / 2); g.add(screw);
  const viseBar = cyl(0.015, 0.015, 0.3, 6, M.steel); put(viseBar, -0.55, 0.99, 0.3, 0, 0, Math.PI / 2); g.add(viseBar);
  // di atas meja: palu, gergaji, obeng, kacamata las, kipas kecil
  const hammer = cyl(0.018, 0.018, 0.3, 6, M.woodMid); put(hammer, 0.1, 0.94, 0.1, 0, 0, Math.PI / 2 - 0.1); g.add(hammer);
  const hammerHead = box(0.12, 0.05, 0.05, M.steelDark); put(hammerHead, 0.25, 0.95, 0.1, 0.2); g.add(hammerHead);
  // gergaji: bilah extrude segitiga + gagang
  const sawShape = new THREE.Shape();
  sawShape.moveTo(0, 0); sawShape.lineTo(0.34, 0); sawShape.lineTo(0.3, 0.09); sawShape.lineTo(0, 0.12); sawShape.closePath();
  const saw = new THREE.Mesh(new THREE.ExtrudeGeometry(sawShape, { depth: 0.01, bevelEnabled: false }), M.steel);
  put(saw, -0.1, 0.93, -0.15, 0.4); saw.castShadow = true; g.add(saw);
  const sawGrip = box(0.1, 0.1, 0.03, M.woodDark); put(sawGrip, -0.13, 0.97, -0.15, 0.4); g.add(sawGrip);
  // kipas meja kecil: kaki + tiang + kepala + 3 bilah + cincin pelindung
  const fanBase = cyl(0.09, 0.11, 0.03, 12, M.steelDark); put(fanBase, 0.55, 0.93, -0.12); g.add(fanBase);
  const fanStem = cyl(0.015, 0.015, 0.18, 6, M.steel); put(fanStem, 0.55, 1.03, -0.12); g.add(fanStem);
  const fanHead = sph(0.09, M.steelBlue, 12, 8); put(fanHead, 0.55, 1.16, -0.12); fanHead.scale.z = 0.55; g.add(fanHead);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const blade = box(0.05, 0.13, 0.01, std({ color: 0xd8d8d8, roughness: 0.5 }));
    put(blade, 0.55 + Math.cos(a) * 0.06, 1.16 + Math.sin(a) * 0.06, -0.06, a); g.add(blade);
  }
  const cage = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.008, 5, 16), M.steel);
  put(cage, 0.55, 1.16, -0.055); cage.castShadow = true; g.add(cage);
  // tumpukan papan kayu di samping meja (di lantai)
  for (let i = 0; i < 5; i++) {
    const plank = box(1.1, 0.04, 0.18, i % 2 ? M.woodMid : M.woodPale);
    put(plank, 0, 0.02 + i * 0.045, 0.55, (i % 2 ? 0.05 : -0.03)); g.add(plank);
  }
  // rak dinding di atas meja: 2 papan + kaleng + toples + radio tua
  for (const y of [1.55, 1.95]) {
    const shelf = box(1.5, 0.04, 0.28, M.woodPale); put(shelf, 0, y, -0.22); g.add(shelf);
  }
  paintCan(g, -0.5, 1.57, -0.22, r); paintCan(g, -0.32, 1.57, -0.22, r);
  glassJar(g, 0.0, 1.57, -0.22, r); glassJar(g, 0.2, 1.57, -0.22, r);
  glassJar(g, 0.45, 1.57, -0.22, r);
  const radio = box(0.34, 0.2, 0.14, std({ color: 0x6a4a2a, roughness: 0.8 }));
  put(radio, -0.45, 2.07, -0.22, 0.1); g.add(radio);
  const dial = cyl(0.04, 0.04, 0.02, 10, std({ color: 0xffe9a8, emissive: 0xffc860, emissiveIntensity: 0.5 }));
  put(dial, -0.52, 2.07, -0.14, Math.PI / 2); g.add(dial);
  const antenna = cyl(0.006, 0.006, 0.4, 4, M.steel);
  put(antenna, -0.28, 2.25, -0.22, 0, 0, 0.5); g.add(antenna);
  bookRow(g, 0.05, 1.97, -0.22, r, 5);
  // rak atas tambahan: 3 kaleng + 1 toples (rak tidak kosong)
  paintCan(g, -0.18, 1.97, -0.22, r);
  paintCan(g, 0.38, 1.97, -0.22, r);
  paintCan(g, 0.55, 1.97, -0.22, r);
  glassJar(g, 0.68, 1.97, -0.22, r);
  // Meja kerja PINDAH ke dinding barat (-1,55, -1,78) — 28 Nov 2026,
  // 4 arah hadap: dinding timur kini ada pintu ke KM/WC (z -1,725);
  // meja lama (1,505, -1,78) menutupi bukaan + ayunan daun pintu.
  // Rak dinding di atas meja ikut (bagian dari grup ini).
  put(g, -1.55, 0, -1.78, 0);
  scene.add(g);
  g.userData.triangles = countTriangles(g);
  return g;
}

// ---------- pegboard perkakas di dinding belakang (di atas meja kerja) ----------
function buildPegboard(scene) {
  const g = new THREE.Group();
  const board = box(1.3, 0.95, 0.03, std({ color: 0x8a6f4a, roughness: 0.95 }));
  put(board, 1.75, 2.45, -D / 2 + 0.03); g.add(board);
  // lubang pegboard: titik-titik gelap (merge, 1 mesh)
  const holeList = [];
  for (let ix = 0; ix < 12; ix++) for (let iy = 0; iy < 8; iy++) {
    holeList.push({ geometry: new THREE.CylinderGeometry(0.008, 0.008, 0.035, 5), matrix: trs(1.75 - 0.55 + ix * 0.1, 2.08 + iy * 0.1, -D / 2 + 0.03, Math.PI / 2, 0, 0) });
  }
  mergeParts(holeList, M.dark, g);
  // palu gantung
  const hh = cyl(0.016, 0.016, 0.28, 6, M.woodMid); put(hh, 1.3, 2.5, -D / 2 + 0.06); g.add(hh);
  const hhead = box(0.11, 0.045, 0.045, M.steelDark); put(hhead, 1.3, 2.65, -D / 2 + 0.06); g.add(hhead);
  // kunci inggris gantung
  const wh = box(0.2, 0.028, 0.035, M.steel); put(wh, 1.55, 2.45, -D / 2 + 0.06, 0.15); g.add(wh);
  const wjaw = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.013, 5, 10, Math.PI * 1.4), M.steel);
  put(wjaw, 1.55, 2.56, -D / 2 + 0.06, 0, 0, 0.9); wjaw.castShadow = true; g.add(wjaw);
  // gergaji gantung (bilah extrude)
  const sawShape = new THREE.Shape();
  sawShape.moveTo(0, 0); sawShape.lineTo(0.3, 0); sawShape.lineTo(0.27, 0.08); sawShape.lineTo(0, 0.11); sawShape.closePath();
  const saw = new THREE.Mesh(new THREE.ExtrudeGeometry(sawShape, { depth: 0.008, bevelEnabled: false }), M.steel);
  put(saw, 1.85, 2.35, -D / 2 + 0.05, 0, 0, -0.15); saw.castShadow = true; g.add(saw);
  // obeng (3, beda warna gagang) + tang
  const gripCols = [0xb3261e, 0x1e5aa8, 0xf5be2a];
  gripCols.forEach((c, i) => {
    const grip = cyl(0.018, 0.022, 0.1, 6, std({ color: c, roughness: 0.6 }));
    put(grip, 2.12 + i * 0.09, 2.42, -D / 2 + 0.06); g.add(grip);
    const shaft = cyl(0.008, 0.008, 0.12, 5, M.steel);
    put(shaft, 2.12 + i * 0.09, 2.53, -D / 2 + 0.06); g.add(shaft);
  });
  const plierA = box(0.03, 0.16, 0.03, M.steelDark); put(plierA, 1.42, 2.2, -D / 2 + 0.06, 0.2); g.add(plierA);
  const plierB = box(0.03, 0.16, 0.03, M.steelDark); put(plierB, 1.42, 2.2, -D / 2 + 0.06, -0.2); g.add(plierB);
  // gulungan kabel menggantung di kait (torus bertumpuk)
  for (let i = 0; i < 3; i++) {
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.11 - i * 0.008, 0.016, 6, 18), std({ color: i % 2 ? 0x2a2e33 : 0xb3261e, roughness: 0.8 }));
    put(coil, 2.28, 2.62 - i * 0.035, -D / 2 + 0.08); coil.castShadow = true; g.add(coil);
  }
  // geser -SH - 3,3: pegboard PINDAH ke dinding barat, di atas meja kerja
  // yang pindah (28 Nov 2026 — dinding timur kini ada pintu ke KM/WC);
  // bagian-bagian (x 1,3..2,28) mendarat di x -2,245..-1,265.
  g.position.x = -SH - 3.3;
  scene.add(g);
  g.userData.triangles = countTriangles(g);
  return g;
}

// ---------- tangga kayu bersandar di dinding kanan ----------
function buildLadder(scene) {
  const g = new THREE.Group();
  const r = rngKit(63);
  const lean = 0.14; // radian: puncak condong ke dinding (+x)
  // rel: kotak miring, puncak di x 2,44 (menyentuh dinding), kaki di 2,06
  for (const dz of [-0.28, 0.28]) {
    const rail = box(0.07, 2.7, 0.05, M.woodMid);
    put(rail, 2.25, 1.33, 0.95 + dz, 0, 0, -lean); g.add(rail);
  }
  // 8 anak tangga (silinder sepanjang z) mengikuti kemiringan rel
  for (let i = 0; i < 8; i++) {
    const y = 0.28 + i * 0.32;
    const x = 2.25 + (y - 1.33) * Math.tan(lean);
    const rung = cyl(0.022, 0.022, 0.52, 6, M.woodPale);
    put(rung, x, y, 0.95, 0, Math.PI / 2, 0); g.add(rung);
  }
  // kait atas (2, menahan rel ke dinding) + paku
  for (const dz of [-0.28, 0.28]) {
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 5, 10, Math.PI), M.steelDark);
    put(hook, 2.44, 2.62, 0.95 + dz, 0, Math.PI / 2, 0); hook.castShadow = true; g.add(hook);
  }
  // geser -SH: tangga tetap bersandar di dinding timur yang baru
  g.position.x = -SH;
  scene.add(g);
  g.userData.triangles = countTriangles(g);
  return g;
}

// ---------- sepeda tua bersandar di dinding kiri (depan) ----------
// Dibangun menghadap +z (seperti buildBicycle di gang), lalu inner grup
// diputar menghadap dinding kiri; outer grup memberi condong ke dinding.
function buildOldBicycle(scene) {
  const outer = new THREE.Group();
  const inner = new THREE.Group();
  outer.add(inner);
  const frame = std({ color: 0x7a4a30, metalness: 0.3, roughness: 0.7 }); // karat
  const dark = M.dark;
  const wheel = (z) => {
    const w = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.028, 8, 20), M.tyre);
    w.position.set(0, 0.32, z); w.castShadow = true; inner.add(w);
    const hub = cyl(0.03, 0.03, 0.06, 6, dark); put(hub, 0, 0.32, z, 0, 0, Math.PI / 2); inner.add(hub);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const sp = cyl(0.007, 0.007, 0.6, 4, dark);
      put(sp, 0, 0.32, z, 0, 0, a); inner.add(sp);
    }
    const fender = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.018, 5, 10, Math.PI * 0.6), frame);
    put(fender, 0, 0.32, z, 0, 0, Math.PI * 0.2); fender.castShadow = true; inner.add(fender);
  };
  wheel(0.5); wheel(-0.5);
  const tube = (x1, y1, z1, x2, y2, z2) => {
    const a = new THREE.Vector3(x1, y1, z1), b = new THREE.Vector3(x2, y2, z2);
    const len = a.distanceTo(b);
    const m = cyl(0.018, 0.018, len, 5, frame);
    m.position.copy(a).lerp(b, 0.5);
    m.lookAt(b); m.rotateX(Math.PI / 2);
    inner.add(m);
  };
  tube(0, 0.32, 0.5, 0, 0.78, 0.05);
  tube(0, 0.78, 0.05, 0, 0.32, -0.5);
  tube(0, 0.78, 0.05, 0, 0.72, -0.5);
  tube(0, 0.32, -0.5, 0, 0.72, -0.5);
  const bar = cyl(0.016, 0.016, 0.5, 5, dark); put(bar, 0, 0.85, 0.52, 0, 0, Math.PI / 2); inner.add(bar);
  const bell = sph(0.032, M.brass, 8, 6); put(bell, 0.15, 0.88, 0.52); inner.add(bell);
  const seat = box(0.1, 0.04, 0.26, std({ color: 0x4a2e1e, roughness: 0.95 })); put(seat, 0, 0.78, -0.52); inner.add(seat);
  const pedal = box(0.3, 0.03, 0.08, dark); put(pedal, 0, 0.3, -0.05); inner.add(pedal);
  // rak belakang + tas kain lusuh di atasnya
  for (let i = 0; i < 3; i++) {
    const rack = box(0.34, 0.02, 0.04, M.steelDark); put(rack, 0, 0.7, -0.55 - i * 0.08); inner.add(rack);
  }
  const bag = sph(0.16, std({ color: 0x6a5a44, roughness: 0.95 }), 8, 6);
  put(bag, 0, 0.8, -0.6); bag.scale.set(1, 0.7, 1.2); inner.add(bag);
  // rantai kendur (tube melengkung) + gir
  const chainCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.05, 0.32, -0.5), new THREE.Vector3(0.05, 0.24, -0.25),
    new THREE.Vector3(0.05, 0.26, 0.0), new THREE.Vector3(0.05, 0.32, -0.05),
  ]);
  const chain = new THREE.Mesh(new THREE.TubeGeometry(chainCurve, 10, 0.012, 5), M.steelDark);
  chain.castShadow = true; inner.add(chain);
  const gear = cyl(0.09, 0.09, 0.02, 12, M.steelDark); put(gear, 0.05, 0.32, -0.05, 0, 0, Math.PI / 2); inner.add(gear);
  inner.rotation.y = Math.PI / 2 - 0.12; // sejajar dinding kiri
  outer.rotation.z = 0.12; // condong ke dinding kiri (-x)
  outer.position.set(-2.32, 0, 1.25);
  scene.add(outer);
  outer.userData.triangles = countTriangles(outer);
  return outer;
}

// ---------- tumpukan kardus di sudut kiri-belakang, ditutup terpal biru ----------
// Terpal = PlaneGeometry di-displace gelombang (dome + lipatan), DoubleSide.
function buildTarpStack(scene) {
  const g = new THREE.Group();
  const r = rngKit(71);
  // tumpukan kardus (3 bawah + 2 atas)
  cardboard(g, 0.5, 0.36, 0.44, -0.28, 0, 0.05, 0.08, r, 'ARSIP');
  cardboard(g, 0.46, 0.34, 0.4, 0.28, 0, -0.05, -0.12, r, '');
  cardboard(g, 0.42, 0.32, 0.38, 0.0, 0.36, 0.0, 0.2, r, 'LAMA');
  cardboard(g, 0.38, 0.28, 0.34, 0.3, 0.36, 0.08, -0.05, r, '');
  // terpal atas: dome + lipatan (displace z)
  const tg = new THREE.PlaneGeometry(1.5, 1.3, 18, 14);
  const pos = tg.attributes.position;
  for (let v = 0; v < pos.count; v++) {
    const px = pos.getX(v), py = pos.getY(v);
    const nx = px / 0.75, ny = py / 0.65;
    const dome = Math.max(0, 1 - (nx * nx + ny * ny) * 0.85) * 0.22;
    const fold = Math.sin(px * 9 + 1.2) * 0.025 * (1 - Math.abs(ny) * 0.4)
      + Math.sin(py * 11) * 0.02;
    pos.setZ(v, dome + fold);
  }
  tg.computeVertexNormals();
  const tarp = new THREE.Mesh(tg, M.tarpBlue);
  put(tarp, 0, 0.72, 0, 0, -Math.PI / 2); tarp.castShadow = true; tarp.receiveShadow = true; g.add(tarp);
  // lipatan depan terpal menjuntai (bidang vertikal berombak)
  const fg = new THREE.PlaneGeometry(1.4, 0.55, 14, 6);
  const fp = fg.attributes.position;
  for (let v = 0; v < fp.count; v++) {
    const px = fp.getX(v), py = fp.getY(v);
    fp.setZ(v, Math.sin(px * 8) * 0.04 * (1 - (py + 0.275) / 0.55));
  }
  fg.computeVertexNormals();
  const flap = new THREE.Mesh(fg, M.tarpBlue);
  put(flap, 0, 0.5, 0.62, 0, -0.12); flap.castShadow = true; g.add(flap);
  // tali pengikat terpal (2 torus pipih melingkari tumpukan)
  for (const y of [0.35, 0.62]) {
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.012, 5, 20), M.rope);
    put(strap, 0, y, 0, 0, -Math.PI / 2); strap.scale.set(1, 1, 0.75); strap.castShadow = true; g.add(strap);
  }
  put(g, -1.2, 0, -0.5, 0.12);
  scene.add(g);
  g.userData.triangles = countTriangles(g);
  return g;
}

// ---------- sudut kanan-depan: ban bekas menumpuk + karung semen + peti ----------
// Ban LATHE? tidak — torus (ban + velg + jari). Karung = sphere gepeng + simpul.
function buildCornerProps(scene) {
  const g = new THREE.Group();
  const r = rngKit(83);
  // 3 ban menumpuk (torus tebal + velg + jari-jari)
  for (let i = 0; i < 3; i++) {
    const tyre = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.11, 12, 36), M.tyre);
    put(tyre, 2.05, 0.12 + i * 0.23, 1.45, 0, -Math.PI / 2); tyre.castShadow = true; g.add(tyre);
    const rim = cyl(0.17, 0.17, 0.05, 14, M.steelDark);
    put(rim, 2.05, 0.12 + i * 0.23, 1.45); g.add(rim);
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      const sp = box(0.03, 0.3, 0.02, M.steel);
      put(sp, 2.05 + Math.cos(a) * 0.08, 0.12 + i * 0.23, 1.45 + Math.sin(a) * 0.08, -a, 0, 0);
      g.add(sp);
    }
  }
  // karung semen (3, bersandar miring)
  const sackCols = [0x9a8a72, 0x8a7a62, 0xa89a80];
  [[1.35, 0, 1.7, 0.25], [1.62, 0, 1.78, -0.2], [1.48, 0.32, 1.72, 0.1]].forEach(([x, y, z, ry], i) => {
    const sack = sph(0.26, std({ color: sackCols[i], roughness: 0.95 }), 12, 10);
    put(sack, x, y + 0.2, z, ry); sack.scale.set(1, 0.72, 0.8); g.add(sack);
    const knot = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.12, 8), std({ color: sackCols[i], roughness: 0.95 }));
    put(knot, x + 0.05, y + 0.38, z, 0, 0, 0.3); knot.castShadow = true; g.add(knot);
  });
  // peti kayu (2, bilah + bingkai) di depan rak kanan
  for (const [x, z, ry] of [[1.55, 0.55, 0.2], [2.05, 0.35, -0.3]]) {
    const crate = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const slat = box(0.5, 0.08, 0.02, M.woodMid);
      put(slat, 0, 0.08 + i * 0.11, 0.21); crate.add(slat);
      const slatB = box(0.5, 0.08, 0.02, M.woodMid);
      put(slatB, 0, 0.08 + i * 0.11, -0.21); crate.add(slatB);
      const slatS = box(0.02, 0.08, 0.4, M.woodMid);
      put(slatS, 0.24, 0.08 + i * 0.11, 0); crate.add(slatS);
      const slatS2 = box(0.02, 0.08, 0.4, M.woodMid);
      put(slatS2, -0.24, 0.08 + i * 0.11, 0); crate.add(slatS2);
    }
    const cBase = box(0.5, 0.04, 0.44, M.woodDark); put(cBase, 0, 0.02, 0); crate.add(cBase);
    const cTop = box(0.52, 0.03, 0.46, M.woodDark); put(cTop, 0, 0.48, 0); crate.add(cTop);
    put(crate, x, 0, z, ry); g.add(crate);
    cardboard(g, 0.3, 0.24, 0.28, x + 0.1, 0.5, z, ry + 0.3, r, '');
  }
  // ban cadangan bersandar di dinding kanan (miring) + gulungan selang (4 torus)
  const spare = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.11, 12, 36), M.tyre);
  put(spare, 2.42, 0.34, -0.35, Math.PI / 2, 0, 0.16); spare.castShadow = true; g.add(spare);
  const spareRim = cyl(0.17, 0.17, 0.05, 14, M.steelDark);
  put(spareRim, 2.42, 0.34, -0.35, 0, 0, Math.PI / 2 + 0.16); g.add(spareRim);
  for (let i = 0; i < 4; i++) {
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.22 - i * 0.008, 0.02, 8, 24), std({ color: i % 2 ? 0x2e7d5b : 0x1e5aa8, roughness: 0.8 }));
    put(coil, 2.5, 2.1 - i * 0.045, -0.6, Math.PI / 2); coil.castShadow = true; g.add(coil);
  }
  const hoseHook = box(0.06, 0.1, 0.06, M.steelDark);
  put(hoseHook, 2.52, 2.38, -0.6); g.add(hoseHook);
  // ember menumpuk (3, lathe) di samping karung
  const bucketPts = [
    new THREE.Vector2(0.0, 0), new THREE.Vector2(0.13, 0), new THREE.Vector2(0.16, 0.03),
    new THREE.Vector2(0.18, 0.24), new THREE.Vector2(0.16, 0.28), new THREE.Vector2(0.0, 0.28),
  ];
  for (let i = 0; i < 3; i++) {
    const b = lathe(bucketPts, 20, std({ color: [0x2a5aa8, 0xb3261e, 0x2e7d5b][i], roughness: 0.7 }));
    put(b, 1.15, i * 0.24, 1.35, i * 0.2); g.add(b);
  }
  // geser -SH: klaster sudut kanan (ban, peti, ban serep, selang) tetap
  // menempel dinding timur yang baru; karung + ember ikut supaya klaster utuh
  g.position.x = -SH;
  scene.add(g);
  g.userData.triangles = countTriangles(g);
  return g;
}
function buildCleaning(scene) {
  const g = new THREE.Group();
  // sapu bersandar: gagang + ikat + ijuk — geser ke z 0,55 (28 Nov 2026:
  // posisi lama z 0,35 bertabrakan dengan rak kanan yang digeser ke -0,4)
  const handle = cyl(0.018, 0.018, 1.35, 6, M.woodPale);
  put(handle, 2.45, 0.7, 0.55, 0, 0, 0.22); g.add(handle);
  const tie = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 5, 10), M.rope);
  put(tie, 2.42, 0.18, 0.55, 0, -Math.PI / 2); tie.castShadow = true; g.add(tie);
  const bristles = box(0.05, 0.22, 0.14, std({ color: 0xd8c86a, roughness: 0.95 }));
  put(bristles, 2.38, 0.11, 0.55, 0, 0, 0.22); g.add(bristles);
  // pel bersandar di sebelahnya
  const mopH = cyl(0.016, 0.016, 1.3, 6, M.woodPale);
  put(mopH, 2.47, 0.68, 0.62, 0, 0, 0.18); g.add(mopH);
  const mopHead = sph(0.09, std({ color: 0xe8e0d0, roughness: 0.95 }), 8, 6);
  put(mopHead, 2.44, 0.08, 0.62); mopHead.scale.y = 0.6; g.add(mopHead);
  // ember LATHE + air + gayung
  const bucketPts = [
    new THREE.Vector2(0.0, 0), new THREE.Vector2(0.13, 0), new THREE.Vector2(0.16, 0.03),
    new THREE.Vector2(0.18, 0.24), new THREE.Vector2(0.16, 0.28), new THREE.Vector2(0.0, 0.28),
  ];
  const bucket = lathe(bucketPts, 16, std({ color: 0x2a5aa8, roughness: 0.7 }));
  put(bucket, 2.2, 0, 0.75); g.add(bucket);
  const water = cyl(0.14, 0.14, 0.02, 14, std({ color: 0x4a6a8a, roughness: 0.15 }));
  put(water, 2.2, 0.25, 0.75); g.add(water);
  const dip = sph(0.06, M.red, 8, 6); put(dip, 2.2, 0.3, 0.75); dip.scale.y = 0.6; g.add(dip);
  const dipH = cyl(0.012, 0.012, 0.22, 4, M.dark); put(dipH, 2.28, 0.38, 0.75, 0, 0, 0.7); g.add(dipH);
  // geser -SH: sapu + pel + ember tetap bersandar di dinding timur yang baru
  g.position.x = -SH;
  scene.add(g);
  g.userData.triangles = countTriangles(g);
  return g;
}

// ---------- toolbox merah di lantai (dekat tangga) ----------
function buildToolbox(scene) {
  const g = new THREE.Group();
  const body = box(0.5, 0.24, 0.24, M.red); put(body, 0, 0.12, 0); g.add(body);
  const lid = box(0.52, 0.06, 0.26, std({ color: 0x8a1a14, roughness: 0.6 }));
  put(lid, 0, 0.27, 0); g.add(lid);
  // gagang lipat (torus setengah) + kunci depan + sudut besi
  const grip = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.015, 6, 12, Math.PI), M.steelDark);
  put(grip, 0, 0.3, 0, 0, 0, 0); grip.castShadow = true; g.add(grip);
  const lock = box(0.06, 0.08, 0.02, M.brass); put(lock, 0, 0.2, 0.13); g.add(lock);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const corner = box(0.03, 0.24, 0.03, M.steelDark);
    put(corner, sx * 0.24, 0.12, sz * 0.11); g.add(corner);
  }
  // obeng + kunci menyembul dari kotak terbuka (tutup sedikit terbuka)
  const lidOpen = lid.clone(); put(lidOpen, 0, 0.32, -0.06, 0, -0.35); g.add(lidOpen);
  const screw = cyl(0.012, 0.012, 0.2, 6, M.steel); put(screw, -0.12, 0.32, 0.05, 0.5, 0, 0.4); g.add(screw);
  put(g, 1.55 - SH, 0, 0.85, -0.5);
  scene.add(g);
  g.userData.triangles = countTriangles(g);
  return g;
}

// ---------- lampu gantung hangat + kabel + rantai + tali menggantung ----------
function buildHanging(scene) {
  const g = new THREE.Group();
  // kabel dari balok tengah ke kap lampu
  const cableCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 3.32, 0.4), new THREE.Vector3(0.02, 3.0, 0.42),
    new THREE.Vector3(0, 2.62, 0.4),
  ]);
  const cable = new THREE.Mesh(new THREE.TubeGeometry(cableCurve, 10, 0.012, 5), M.dark);
  cable.castShadow = false; g.add(cable);
  // kap lampu LATHE (kerucut berlekuk) + bola hangat emissive
  const shadePts = [
    new THREE.Vector2(0.02, 0), new THREE.Vector2(0.06, 0.02), new THREE.Vector2(0.16, 0.1),
    new THREE.Vector2(0.2, 0.16), new THREE.Vector2(0.21, 0.18),
  ];
  const shade = lathe(shadePts, 20, std({ color: 0x2e7d5b, metalness: 0.3, roughness: 0.5 }));
  put(shade, 0, 2.44, 0.4); g.add(shade);
  const bulb = sph(0.055, std({ color: 0xfff2c0, emissive: 0xffb46b, emissiveIntensity: 2.4 }), 12, 10);
  put(bulb, 0, 2.42, 0.4); bulb.castShadow = false; g.add(bulb);
  const lampLight = new THREE.PointLight(0xffb46b, 6, 7, 1.8);
  lampLight.position.set(0, 2.35, 0.4);
  g.add(lampLight);
  // rantai besi dari balok kiri (8 mata torus berselang-seling) + kait
  let cy = 3.3;
  for (let i = 0; i < 8; i++) {
    const link = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.011, 6, 12), M.steelDark);
    put(link, -0.85, cy, 1.3, 0, (i % 2) * Math.PI / 2, 0); link.castShadow = true; g.add(link);
    cy -= 0.075;
  }
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 5, 10, Math.PI * 1.4), M.steelDark);
  put(hook, -0.85, cy + 0.02, 1.3, 0, 0, 0.6); hook.castShadow = true; g.add(hook);
  // tali/kabel menggantung dari balok kanan (2 lengkung TubeGeometry)
  const ropeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(1.5, 3.32, -0.6), new THREE.Vector3(1.55, 2.9, -0.55),
    new THREE.Vector3(1.48, 2.55, -0.6), new THREE.Vector3(1.52, 2.35, -0.58),
  ]);
  const rope = new THREE.Mesh(new THREE.TubeGeometry(ropeCurve, 14, 0.014, 6), M.rope);
  rope.castShadow = true; g.add(rope);
  const ropeCurve2 = new THREE.CatmullRomCurve3([
    new THREE.Vector3(1.62, 3.32, -0.6), new THREE.Vector3(1.66, 3.0, -0.58),
    new THREE.Vector3(1.6, 2.8, -0.62),
  ]);
  const rope2 = new THREE.Mesh(new THREE.TubeGeometry(ropeCurve2, 10, 0.012, 6), M.rope);
  rope2.castShadow = true; g.add(rope2);
  scene.add(g);
  g.userData.triangles = countTriangles(g);
  return g;
}

// ---------- sarang laba-laba di sudut atas kiri-belakang (tipis, opsional) ----------
function buildCobweb(scene) {
  const g = new THREE.Group();
  const cx = -2.55, cy = 3.35, cz = -2.05;
  const webMat = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, transparent: true, opacity: 0.45, roughness: 0.6 });
  // 7 jari radial dari sudut ke dinding/lantai balok
  const ends = [
    [-1.9, 3.35, -2.05], [-2.55, 2.7, -2.05], [-2.55, 3.35, -1.4],
    [-2.0, 2.9, -1.6], [-2.55, 3.0, -1.75], [-1.75, 3.35, -1.75], [-2.2, 3.35, -1.35],
  ];
  for (const [ex, ey, ez] of ends) {
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(cx, cy, cz), new THREE.Vector3(ex, ey, ez)]);
    const thread = new THREE.Mesh(new THREE.TubeGeometry(curve, 4, 0.003, 4), webMat);
    g.add(thread);
  }
  // 3 busur konsentris (jaring melengkung antar jari)
  for (const rr of [0.25, 0.45, 0.65]) {
    const pts = [];
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      pts.push(new THREE.Vector3(cx + rr * 0.9 * t, cy - rr * 0.75 * t * t, cz + rr * 0.9 * (1 - t)));
    }
    const arc = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, 0.0025, 4), webMat);
    g.add(arc);
  }
  // laba-laba kecil (badan + kaki garis)
  const spider = sph(0.015, M.dark, 6, 5);
  put(spider, -2.3, 3.05, -1.85); spider.castShadow = false; g.add(spider);
  scene.add(g);
  g.userData.triangles = countTriangles(g);
  return g;
}

// ---------- debu di lantai (bintik kecil, jangan berlebihan) ----------
function buildDust(scene) {
  const r = rngKit(97);
  const list = [];
  for (let i = 0; i < 26; i++) {
    const s = r.range(0.02, 0.055);
    list.push({ geometry: new THREE.PlaneGeometry(s, s), matrix: trs(r.range(-2.4, 2.4), 0.008, r.range(-1.9, 1.9), -Math.PI / 2, 0, r.range(0, Math.PI)) });
  }
  const m = new THREE.Mesh(bake(list), std({ color: 0x6a6258, roughness: 1 }));
  m.castShadow = false; m.receiveShadow = true;
  scene.add(m);
  // 2 jejak kaki berdebu menuju pintu (pasang elips samar)
  for (let i = 0; i < 5; i++) {
    const step = new THREE.Mesh(new THREE.CircleGeometry(0.09, 10), new THREE.MeshStandardMaterial({ color: 0x7a7268, transparent: true, opacity: 0.35, roughness: 1 }));
    put(step, -0.15 + (i % 2 ? 0.18 : -0.1), 0.009, 0.9 - i * 0.45, (i % 2 ? 0.2 : -0.15), -Math.PI / 2);
    step.scale.x = 0.6; step.castShadow = false; step.receiveShadow = true;
    scene.add(step);
  }
  return m;
}

// ---------- lighting gudang (di dalam fungsi; tanpa background/fog) ----------
function buildGudangLights(scene) {
  // fill redup hangat (gudang gelap, lampu utama dari gantung + jendela)
  scene.add(new THREE.HemisphereLight(0xffe0b3, 0x4a3a28, 0.55));
  // key: cahaya siang dari jendela kiri (castShadow, 2048)
  const sun = new THREE.DirectionalLight(0xffe9b8, 1.3);
  sun.position.set(-5, 3.6, 0.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.normalBias = 0.02;
  sun.shadow.bias = -0.0001;
  sun.shadow.camera.left = -4; sun.shadow.camera.right = 4;
  sun.shadow.camera.top = 4; sun.shadow.camera.bottom = -4;
  sun.shadow.camera.near = 0.5; sun.shadow.camera.far = 14;
  sun.target.position.set(0.6, 0, 0.2);
  scene.add(sun); scene.add(sun.target);
  // fill dingin lembut dari depan (kamera) supaya sisi gelap tidak hitam pekat
  const fill = new THREE.DirectionalLight(0xaebfff, 0.35);
  fill.position.set(1, 3, 6);
  scene.add(fill);
}

// ---------- entry point ----------
// Rak besi kiri/kanan menempel dinding samping; rak kayu beroda di depan
// pintu; meja kerja + pegboard di kanan-belakang; terpal di kiri-belakang;
// sepeda kiri-depan; tangga + toolbox + ban + karung di kanan.
export function buildGudang(scene, width = 5.2, eastDoor = null) {
  // Mode rumah: lebar dipersempit (KM/WC mengambil 0,6 m dari gudang).
  // Semua yang memakai W (lantai, dinding, jendela) ikut otomatis;
  // barang sisi timur digeser -SH lewat posisi grupnya masing-masing.
  // `eastDoor` (28 Nov 2026, 4 arah hadap): pusat-z lokal bukaan pintu
  // di dinding timur (mode rumah: ke KM/WC, z -1,725). Tanpa eastDoor,
  // set mandiri tidak berubah.
  W = width;
  SH = (5.2 - W) / 2;
  buildGudangLights(scene);
  buildShell(scene, eastDoor);
  buildWindow(scene);
  buildPortal(scene);
  buildRollingRack(scene);

  const rackL = buildSteelRack(101);
  put(rackL, -2.28, 0, -0.5, Math.PI / 2); scene.add(rackL);
  const rackR = buildSteelRack(202);
  // Rak kanan geser ke z -0,4 (28 Nov 2026: posisi lama -0,5 menutupi
  // 0,05 ujung selatan bukaan pintu timur z -2,1..-1,35).
  put(rackR, 2.28 - SH, 0, -0.4, -Math.PI / 2); scene.add(rackR);

  buildWorkbench(scene);
  buildPegboard(scene);
  buildLadder(scene);
  buildOldBicycle(scene);
  buildTarpStack(scene);
  buildCornerProps(scene);
  buildCleaning(scene);
  buildToolbox(scene);
  buildHanging(scene);
  buildCobweb(scene);
  buildDust(scene);

  console.log('TRIANGLES gudang =', countTriangles(scene));
}
