// ============================================================================
// set-rumah-rooms.js — 4 RUANGAN BARU RUMAH NAJMI (Jakarta).
// Pelengkap 3 ruangan interior yang sudah ada (kamar-tidur, dapur, gudang),
// supaya nanti bisa dirakit jadi SATU rumah utuh mengikuti denah
// (Denah Rumah Najmi - Jakarta, ±10 x 8,6 m).
//
// Dibangun dengan skill majidmanzarpour/threejs-game-skills
// (threejs-aaa-graphics-builder), mengikuti persis pola set-kamar-tidur.js:
// helper std/box/cyl/sph/plane/put/mergeParts, material kit bersama
// (MeshStandardMaterial — BUKAN Toon langsung — supaya converter Sakura
// bisa mengubahnya), CanvasTexture untuk lantai/karpet/ubin/lukisan,
// open-front dollhouse (dinding belakang + 2 dinding samping, TANPA
// dinding depan +z dan TANPA plafon penuh — hanya balok + lis plafon).
//
// KONVENSI RAKIT (WAJIB, supaya bisa dirakit jadi satu rumah):
//   - Tiap builder mengembalikan THREE.Group (BUKAN scene).
//   - Origin (0,0,0) = TENGAH lantai ruangan, y=0 di lantai.
//   - Sumbu x = lebar, z = kedalaman, sisi +z TERBUKA.
//   - Tinggi dinding 3,84 m (ukuran FINAL — sama seperti kamar-tidur/
//     dapur/gudang SETELAH diperbesar x1,2; ruangan ini TIDAK diskala lagi).
//   - Ukuran lantai sudah ukuran final (denah x1,2):
//       KMWC 1,68 x 2,88 | Ruang Makan 4,6 x 4,0 |
//       Ruang Tamu 4,6 x 4,6 | Kamar Kerja 4,5 x 4,5.
//   - 1 PointLight praktis per ruangan (lampu), di dalam grup.
//   - Budget: tiap ruangan MAKSIMAL 15.000 tris.
// ============================================================================
import * as THREE from 'three';
import { rngKit, bake, trs } from './vendor/sakura/src/core/util.js';
import { countTriangles } from './vendor/buildings-detailed.js';

const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0, ...o });

// ---------- canvas textures (pola set-kamar-tidur.js) ----------
function canvasTex(w, h, draw, repeat) {
  // Node (verifikasi tanpa browser): tidak ada document — kembalikan
  // tekstur 1x1 putih supaya geometri + tris tetap bisa diukur.
  // Di browser, jalur di bawah yang dipakai (CanvasTexture asli).
  if (typeof document === 'undefined') {
    const t = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    return t;
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

/** Lantai kayu: papan horizontal + serat + nat gelap (pola kamar-tidur). */
function floorTex(seed = 7, repeat = [3, 2.5]) {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#a97e4e'; g.fillRect(0, 0, w, h);
    const r = rngKit(seed);
    const ph = 64;
    for (let y = 0; y < h; y += ph) {
      const v = 150 + ((y / ph) % 3) * 12;
      g.fillStyle = `rgb(${v + 18},${v - 28},${v - 78})`;
      g.fillRect(0, y + 2, w, ph - 4);
      g.strokeStyle = 'rgba(90,55,20,0.28)'; g.lineWidth = 1.5;
      for (let i = 0; i < 7; i++) {
        const yy = y + r.range(6, ph - 6);
        g.beginPath(); g.moveTo(0, yy);
        for (let x = 0; x <= w; x += 64) g.lineTo(x, yy + r.range(-3, 3));
        g.stroke();
      }
      const jx = ((y / ph) % 2 === 0) ? 170 : 340;
      g.fillStyle = 'rgba(60,35,15,0.55)';
      g.fillRect(jx, y + 2, 3, ph - 4);
      g.fillRect(0, y, w, 3);
    }
  }, repeat);
}

/** Ubin: papan catur 4x4 dua warna + nat (untuk KMWC). */
function tileTex(colors, repeat) {
  return canvasTex(256, 256, (g, w, h) => {
    const n = 4, s = w / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      g.fillStyle = colors[(x + y) % colors.length];
      g.fillRect(x * s, y * s, s, s);
      g.fillStyle = 'rgba(255,255,255,0.06)';
      g.fillRect(x * s, y * s, s / 2, s / 2);
      g.fillStyle = 'rgba(90,100,105,0.6)';
      g.fillRect(x * s, y * s, s, 2); g.fillRect(x * s, y * s, 2, s);
    }
  }, repeat);
}

/** Karpet: dasar + border + motif wajik (parameter warna). */
function rugTex(base, border, accent) {
  return canvasTex(512, 384, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    g.fillStyle = border; g.fillRect(0, 0, w, 26); g.fillRect(0, h - 26, w, 26);
    g.fillRect(0, 0, 26, h); g.fillRect(w - 26, 0, 26, h);
    g.strokeStyle = border; g.lineWidth = 4; g.strokeRect(40, 40, w - 80, h - 80);
    g.strokeStyle = accent; g.lineWidth = 3;
    const r = rngKit(11);
    for (let y = 70; y < h - 50; y += 62) {
      for (let x = 70; x < w - 50; x += 62) {
        const s = 20 + r.range(-3, 3);
        g.beginPath();
        g.moveTo(x, y - s); g.lineTo(x + s, y); g.lineTo(x, y + s); g.lineTo(x - s, y);
        g.closePath(); g.stroke();
        g.fillStyle = accent;
        g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2); g.fill();
      }
    }
  });
}

/** Lukisan dinding abstrak: langit + matahari + bukit + rumah. */
function artTex(seed) {
  const skies = [['#ffd98a', '#ffb37a', '#7a9cc6'], ['#cfe3d6', '#9dc6a8', '#5a7a6a'], ['#f6d9e8', '#e8a8c8', '#7a6a9c']];
  const pal = skies[seed % skies.length];
  return canvasTex(256, 320, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, pal[0]); grad.addColorStop(0.55, pal[1]); grad.addColorStop(1, pal[2]);
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff3c4'; g.beginPath(); g.arc(196, 66, 28, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(40,60,40,0.55)';
    g.beginPath(); g.moveTo(0, 250); g.quadraticCurveTo(80, 200, 160, 242);
    g.quadraticCurveTo(210, 268, 256, 238); g.lineTo(256, 320); g.lineTo(0, 320); g.fill();
    g.fillStyle = '#5a3a22';
    g.fillRect(100, 230, 56, 44);
    g.beginPath(); g.moveTo(92, 232); g.lineTo(128, 206); g.lineTo(164, 232); g.closePath(); g.fill();
  });
}

// ---------- material kit bersama ----------
const MAT = {
  wallCream: std({ color: 0xf3e6cf, roughness: 0.95 }),
  wallBlue: std({ color: 0xdcebf2, roughness: 0.95 }),
  wallSage: std({ color: 0xcfe0c8, roughness: 0.95 }),
  wainscot: std({ color: 0xe8dcc3, roughness: 0.85 }),
  trimWhite: std({ color: 0xfbf6ea, roughness: 0.7 }),
  beamWood: std({ color: 0x6b4a2c, roughness: 0.8 }),
  woodDark: std({ color: 0x5d3d22, roughness: 0.8 }),
  woodMid: std({ color: 0x8a6a42, roughness: 0.7 }),
  woodLight: std({ color: 0xa97e4e, roughness: 0.75 }),
  ceramicWhite: std({ color: 0xf7f5f0, roughness: 0.35 }),
  chrome: std({ color: 0xc8ccd2, metalness: 0.85, roughness: 0.25 }),
  mirror: std({ color: 0xdfe9ec, metalness: 0.9, roughness: 0.12 }),
  glass: std({ color: 0xbfe3ea, transparent: true, opacity: 0.35, roughness: 0.1, metalness: 0.1 }),
  brass: std({ color: 0xc9a227, metalness: 0.7, roughness: 0.35 }),
  black: std({ color: 0x232326, roughness: 0.8 }),
  metal: std({ color: 0x9aa0a8, metalness: 0.55, roughness: 0.4 }),
  fabricTeal: std({ color: 0x4a7a7a, roughness: 0.98 }),
  fabricSage: std({ color: 0x9db89a, roughness: 0.98 }),
  fabricCream: std({ color: 0xefe3c8, roughness: 0.98 }),
  fabricTerra: std({ color: 0xc65f3d, roughness: 0.98 }),
  fabricYellow: std({ color: 0xf2c94c, roughness: 0.95 }),
  fabricGrey: std({ color: 0x8a8f96, roughness: 0.98 }),
  sheetWhite: std({ color: 0xf7f2e6, roughness: 0.95 }),
  blanketBlue: std({ color: 0x4a6b8a, roughness: 0.98 }),
  blanketGreen: std({ color: 0x5a7a4a, roughness: 0.98 }),
  leafGreen: std({ color: 0x4d7a3a, roughness: 0.9, side: THREE.DoubleSide }),
  leafLight: std({ color: 0x6da34f, roughness: 0.9, side: THREE.DoubleSide }),
  soilDark: std({ color: 0x3a2a1a, roughness: 1 }),
  potTerra: std({ color: 0xb5653a, roughness: 0.85 }),
  paperWhite: std({ color: 0xfbf8f0, roughness: 0.95 }),
  lampWarm: std({ color: 0xffe9b0, emissive: 0xffc46b, emissiveIntensity: 1.6 }),
  screenGlow: std({ color: 0x9fd8ff, emissive: 0x86c9ff, emissiveIntensity: 0.9, roughness: 0.4 }),
  curtainCream: std({ color: 0xf6ead2, roughness: 0.98, side: THREE.DoubleSide }),
  curtainSage: std({ color: 0xa8c6a0, roughness: 0.98, side: THREE.DoubleSide }),
};

// ---------- mesh helpers (pola set-kamar-tidur.js) ----------
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
function lathe(points, mat, seg = 18) {
  const pts = points.map(([x, y]) => new THREE.Vector2(x, y));
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, seg), mat);
  m.castShadow = true; m.receiveShadow = true; return m;
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

const DOOR_W = 0.9, DOOR_H = 2.1; // bukaan pintu interior (ukuran final)

/** Segmen dinding berlubang: daftar {a,b,w,h} (a = tengah sepanjang
 *  dinding, b = tengah vertikal) yang menutupi bagian SOLID dinding
 *  panjang `len`, tinggi `H`, dikurangi bukaan-bukaan {a0,a1,b0,b1}
 *  (a = sepanjang dinding, b = vertikal, keduanya berpusat 0 / 0..H).
 *  Bukaan tidak boleh tumpang tindih sepanjang a. */
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

/** Pintu interior: kusen + daun HIJAU (0x2e9e6a, pintu hijau klasik rumah
 *  Indonesia — hijau terang supaya dari denah atas pun terbaca melawan
 *  dinding krem + lantai kayu; 0x2f6b5a pertama terlalu gelap, dari
 *  atas daun hanya jadi garis tipis yang nyaris tak terlihat) tebal
 *  0,08 m, terbuka LEBAR 1,0 rad (~57°, bukan 0,5 rad — dari atas daun
 *  menonjol diagonal ke dalam ruangan) + gagang kuningan. Grup di
 *  (x, 0, z) dengan ry — sumbu lokal x = lebar bukaan, +z lokal = arah
 *  daun membuka (ke dalam ruangan). `hinge`: 1 = engsel di jamb kiri
 *  (-x lokal). */
function doorUnit(g, x, z, ry, hinge = 1) {
  const dg = new THREE.Group();
  for (const s of [-1, 1]) {
    const jamb = box(0.08, DOOR_H + 0.04, 0.14, MAT.woodDark);
    put(jamb, s * (DOOR_W / 2), (DOOR_H + 0.04) / 2, 0); dg.add(jamb);
  }
  const head = box(DOOR_W + 0.08, 0.08, 0.14, MAT.woodDark);
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

// ---------- shell bersama: lantai + 3 dinding + lis + balok ----------
const WALL_H = 3.84;
const WALL_T = 0.12;

/** Dinding belakang berlubang jendela (x0..x1, y0..y1) + kusen + kaca + tirai. */
function buildWindowUnit(g, x0, x1, y0, y1, zInner) {
  const w = x1 - x0, h = y1 - y0, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const fr = MAT.trimWhite;
  const top = box(w + 0.1, 0.08, 0.06, fr); put(top, cx, y1 + 0.02, zInner + 0.01); g.add(top);
  const bot = box(w + 0.1, 0.08, 0.06, fr); put(bot, cx, y0 - 0.02, zInner + 0.01); g.add(bot);
  for (const s of [-1, 1]) {
    const side = box(0.08, h + 0.1, 0.06, fr);
    put(side, cx + s * (w / 2 + 0.02), cy, zInner + 0.01); g.add(side);
  }
  const mv = box(0.05, h, 0.04, fr); put(mv, cx, cy, zInner); g.add(mv);
  const mh = box(w, 0.05, 0.04, fr); put(mh, cx, cy, zInner); g.add(mh);
  const glass = plane(w, h, MAT.glass); put(glass, cx, cy, zInner - 0.02); noShadow(glass); g.add(glass);
  const sill = box(w + 0.16, 0.06, 0.16, fr); put(sill, cx, y0 - 0.06, zInner + 0.05); g.add(sill);
  for (const s of [-1, 1]) {
    const cur = plane(0.55, h + 0.5, s < 0 ? MAT.curtainSage : MAT.curtainCream);
    put(cur, cx + s * (w / 2 + 0.3), cy + 0.15, zInner + 0.09); noShadow(cur); g.add(cur);
  }
}

/** Wainscot bawah (panel + rel) di dinding yang ada — merge satu mesh
 *  (pola kamar-tidur). `doorSpans`: { back, front, left, right } — rentang
 *  pintu sepanjang tiap dinding; elemen yang bersinggungan dilewati supaya
 *  tidak menutup lubang pintu. Nilai `null` = dinding itu TIDAK ADA (sisi
 *  terbuka) — wainscot-nya dilewati. `frontInset`: geser wainscot dinding
 *  depan ke dalam (sama seperti dindingnya). */
function buildWainscot(g, W, D, doorSpans = { back: [], left: [], right: [] }, frontInset = 0) {
  const parts = [];
  const railGeo = new THREE.BoxGeometry(1, 0.06, 0.03);
  const stileGeo = new THREE.BoxGeometry(0.06, 0.78, 0.03);
  const panelGeo = new THREE.BoxGeometry(0.62, 0.66, 0.02);
  if (doorSpans.back) {
    for (let x = -W / 2 + 0.4; x <= W / 2 - 0.39; x += 0.8) {
      if (!hitsDoor(x - 0.5, x + 0.5, doorSpans.back)) parts.push({ geometry: railGeo, matrix: trs(x, 0.92, -D / 2 + 0.015) });
      if (!hitsDoor(x - 0.43, x - 0.37, doorSpans.back)) parts.push({ geometry: stileGeo, matrix: trs(x - 0.4, 0.5, -D / 2 + 0.015) });
      if (!hitsDoor(x - 0.31, x + 0.31, doorSpans.back)) parts.push({ geometry: panelGeo, matrix: trs(x, 0.5, -D / 2 + 0.01) });
    }
  }
  // dinding depan / selatan (bila ada — openSide bukan 'south')
  if (doorSpans.front) {
    const zF = D / 2 - frontInset - 0.015;
    for (let x = -W / 2 + 0.4; x <= W / 2 - 0.39; x += 0.8) {
      if (!hitsDoor(x - 0.5, x + 0.5, doorSpans.front)) parts.push({ geometry: railGeo, matrix: trs(x, 0.92, zF) });
      if (!hitsDoor(x - 0.43, x - 0.37, doorSpans.front)) parts.push({ geometry: stileGeo, matrix: trs(x - 0.4, 0.5, zF) });
      if (!hitsDoor(x - 0.31, x + 0.31, doorSpans.front)) parts.push({ geometry: panelGeo, matrix: trs(x, 0.5, zF - 0.005) });
    }
  }
  for (const s of [-1, 1]) {
    const spans = s < 0 ? doorSpans.left : doorSpans.right;
    if (!spans) continue; // dinding samping itu tidak ada (sisi terbuka)
    // pusat rel dibatasi [-D/2+0,5, zHi] supaya rel 1 m tidak menjorok
    // melewati tepi depan lantai (+z terbuka) atau dinding depan baru
    const zHi = doorSpans.front ? D / 2 - frontInset - 0.51 : D / 2 - 0.51;
    for (let z = -D / 2 + 0.5; z <= zHi; z += 0.8) {
      if (!hitsDoor(z - 0.5, z + 0.5, spans)) parts.push({ geometry: railGeo, matrix: trs(s * (W / 2 - 0.015), 0.92, z, 0, Math.PI / 2, 0) });
      if (!hitsDoor(z - 0.43, z - 0.37, spans)) parts.push({ geometry: stileGeo, matrix: trs(s * (W / 2 - 0.015), 0.5, z - 0.4, 0, Math.PI / 2, 0) });
      if (!hitsDoor(z - 0.31, z + 0.31, spans)) parts.push({ geometry: panelGeo, matrix: trs(s * (W / 2 - 0.01), 0.5, z, 0, Math.PI / 2, 0) });
    }
  }
  mergeParts(parts, MAT.wainscot, g);
}

/**
 * Shell ruangan: lantai + dinding belakang (opsional berlubang jendela) +
 * dinding kiri/kanan + skirting + cornice + balok ekspos. TANPA plafon
 * penuh — open-front dollhouse, sisi yang terbuka ditentukan `openSide`.
 * opts: { floorMat, wallMat, win: {x0,x1,y0,y1} | null, wainscot: bool,
 *   doors: { back: [pusat-x...], front: [pusat-x...], left: [pusat-z...],
 *   right: [pusat-z...] },
 *   openSide: 'south' (default — terbuka ke selatan) | 'north' | 'west' |
 *   'east'. Sisi yang terbuka TIDAK punya dinding; sisi SELATAN jadi
 *   dinding baru bila openSide bukan 'south' (kerja/tamu/makan/kamar).
 *   frontInset: geser dinding depan (selatan) ke dalam ruangan (m) —
 *   kerja/tamu pakai 0,26 supaya tidak sebidang dengan fasad z 10,5
 *   (muka fasad 10,44, kaca 10,5, tirai 10,4 — pusat dinding jadi 10,30). }
 * Tiap entri pintu boleh angka (engsel default) atau { c, h } (h = hinge:
 * 1 = jamb kiri/-x lokal, -1 = jamb kanan/+x lokal). Dinding yang
 * berlubang pintu dibangun dari wallSegs; wainscot + skirting dilewati
 * di rentang pintu supaya lubang tidak tertutup.
 */
function buildShell(g, W, D, opts = {}) {
  const { floorMat, wallMat = MAT.wallCream, win = null, wainscot = false, doors = null,
    openSide = 'south', frontInset = 0 } = opts;
  const H = WALL_H, T = WALL_T;
  const floor = plane(W, D, floorMat);
  put(floor, 0, 0, 0, 0, -Math.PI / 2); g.add(floor);
  const hasBack = openSide !== 'north';
  const hasFront = openSide !== 'south';
  const hasLeft = openSide !== 'west';
  const hasRight = openSide !== 'east';
  const zb = -D / 2 - T / 2;
  const zf = D / 2 + T / 2 - frontInset; // pusat dinding depan (selatan)
  const dBack = doors?.back ?? [], dFront = doors?.front ?? [],
    dLeft = doors?.left ?? [], dRight = doors?.right ?? [];
  const dC = (d) => (typeof d === 'number' ? d : d.c);
  const dH = (d, def) => (typeof d === 'number' ? def : (d.h ?? def));
  const dSpan = (d) => [dC(d) - DOOR_W / 2, dC(d) + DOOR_W / 2];
  // --- dinding belakang (berlubang jendela dan/atau pintu) ---
  // Jendela hanya bila dinding belakang ada (openSide 'north' = tanpa
  // dinding belakang, jendela ikut hilang — tidak ada jendela baru).
  if (hasBack) {
    if (win || dBack.length) {
      const openings = [];
      if (win) openings.push({ a0: win.x0, a1: win.x1, b0: win.y0, b1: win.y1 });
      for (const d of dBack) openings.push({ a0: dC(d) - DOOR_W / 2, a1: dC(d) + DOOR_W / 2, b0: 0, b1: DOOR_H });
      for (const s of wallSegs(W, H, openings)) {
        const seg = box(s.w, s.h, T, wallMat); put(seg, s.a, s.b, zb); g.add(seg);
      }
      if (win) buildWindowUnit(g, win.x0, win.x1, win.y0, win.y1, -D / 2);
    } else {
      const back = box(W + T * 2, H, T, wallMat); put(back, 0, H / 2, zb); g.add(back);
    }
  }
  // --- dinding depan (selatan) — hanya bila sisi terbuka BUKAN selatan ---
  if (hasFront) {
    if (dFront.length) {
      const openings = dFront.map((d) => ({ a0: dC(d) - DOOR_W / 2, a1: dC(d) + DOOR_W / 2, b0: 0, b1: DOOR_H }));
      for (const s of wallSegs(W, H, openings)) {
        const seg = box(s.w, s.h, T, wallMat); put(seg, s.a, s.b, zf); g.add(seg);
      }
    } else {
      const front = box(W + T * 2, H, T, wallMat); put(front, 0, H / 2, zf); g.add(front);
    }
  }
  // --- dinding kiri / kanan (berlubang pintu bila ada) ---
  // Bila dinding depan ada, dinding samping memanjang ke selatan sampai
  // menutupi tebal dinding depan (panjang D+2T, tengah 0); bila tidak,
  // seperti semula (panjang D+T, tengah -T/2, menutupi dinding belakang).
  const sideLen = hasFront ? D + T * 2 : D + T;
  const sideZc = hasFront ? 0 : -T / 2;
  for (const s of [-1, 1]) {
    if ((s < 0 && !hasLeft) || (s > 0 && !hasRight)) continue;
    const list = s < 0 ? dLeft : dRight;
    const x = s * (W / 2 + T / 2);
    if (!list.length) {
      const side = box(T, H, sideLen, wallMat); put(side, x, H / 2, sideZc); g.add(side);
    } else {
      const openings = list.map((d) => ({ a0: dC(d) - DOOR_W / 2 - sideZc, a1: dC(d) + DOOR_W / 2 - sideZc, b0: 0, b1: DOOR_H }));
      for (const sg of wallSegs(sideLen, H, openings)) {
        const seg = box(T, sg.h, sg.w, wallMat); put(seg, x, sg.b, sg.a + sideZc); g.add(seg);
      }
    }
  }
  // --- kusen + daun pintu (daun sedikit terbuka, ke dalam ruangan) ---
  // Pintu depan (selatan): ry=PI — daun membuka ke utara (ke dalam
  // ruangan), engsel default di jamb timur.
  for (const d of dBack) doorUnit(g, dC(d), -D / 2, 0, dH(d, 1));
  for (const d of dFront) doorUnit(g, dC(d), zf, Math.PI, dH(d, 1));
  for (const d of dLeft) doorUnit(g, -W / 2, dC(d), Math.PI / 2, dH(d, 1));
  for (const d of dRight) doorUnit(g, W / 2, dC(d), -Math.PI / 2, dH(d, -1));
  // skirting board (lis lantai) — dipecah di bukaan pintu
  const skSpans = (len, spans) => {
    const out = [];
    let cur = -len / 2;
    for (const [a0, a1] of [...spans].sort((p, q) => p[0] - q[0])) {
      if (a0 - cur > 0.12) out.push([cur, a0]);
      cur = Math.max(cur, a1);
    }
    if (len / 2 - cur > 0.12) out.push([cur, len / 2]);
    return out;
  };
  if (hasBack) {
    for (const [a0, a1] of skSpans(W, dBack.map(dSpan))) {
      const skB = box(a1 - a0, 0.12, 0.03, MAT.trimWhite); put(skB, (a0 + a1) / 2, 0.06, -D / 2 + 0.015); g.add(skB);
    }
  }
  if (hasFront) {
    for (const [a0, a1] of skSpans(W, dFront.map(dSpan))) {
      const skF = box(a1 - a0, 0.12, 0.03, MAT.trimWhite);
      put(skF, (a0 + a1) / 2, 0.06, D / 2 - frontInset - 0.015); g.add(skF);
    }
  }
  // Lis samping: ujung selatan dipotong di muka-dalam dinding depan bila
  // dinding depan ada (supaya tidak menembus dinding depan).
  const zEnd = hasFront ? D / 2 - frontInset : D / 2;
  for (const s of [-1, 1]) {
    if ((s < 0 && !hasLeft) || (s > 0 && !hasRight)) continue;
    const list = (s < 0 ? dLeft : dRight).map(dSpan);
    for (const [a0, a1] of skSpans(D, list)) {
      const c0 = Math.max(a0, -D / 2), c1 = Math.min(a1, zEnd);
      if (c1 - c0 < 0.12) continue;
      const sk = box(0.03, 0.12, c1 - c0, MAT.trimWhite);
      put(sk, s * (W / 2 - 0.015), 0.06, (c0 + c1) / 2); g.add(sk);
    }
  }
  // lis plafon (cornice) di puncak dinding yang ada
  if (hasBack) {
    const coB = box(W, 0.1, 0.05, MAT.trimWhite); put(coB, 0, H - 0.05, -D / 2 + 0.025); g.add(coB);
  }
  if (hasFront) {
    const coF = box(W, 0.1, 0.05, MAT.trimWhite); put(coF, 0, H - 0.05, D / 2 - frontInset - 0.025); g.add(coF);
  }
  for (const s of [-1, 1]) {
    if ((s < 0 && !hasLeft) || (s > 0 && !hasRight)) continue;
    const co = box(0.05, 0.1, zEnd + D / 2, MAT.trimWhite);
    put(co, s * (W / 2 - 0.025), H - 0.05, (zEnd - D / 2) / 2); g.add(co);
  }
  // balok kayu ekspos melintang — plafon terbuka
  const nBeam = W < 2 ? 2 : 3;
  for (let i = 0; i < nBeam; i++) {
    const z = -D / 2 + (D * (i + 0.5)) / nBeam;
    const beam = box(W, 0.18, 0.22, MAT.beamWood); put(beam, 0, H - 0.14, z); g.add(beam);
  }
  if (wainscot) buildWainscot(g, W, D, {
    back: hasBack ? dBack.map(dSpan) : null,
    front: hasFront ? dFront.map(dSpan) : null,
    left: hasLeft ? dLeft.map(dSpan) : null,
    right: hasRight ? dRight.map(dSpan) : null,
  }, frontInset);
}

// ---------- perabot bersama ----------
/** Kursi makan: dudukan + sandaran miring + 4 kaki. Menghadap +z lokal. */
function diningChair(g, x, z, ry, seatMat = MAT.woodMid, legMat = MAT.woodDark) {
  const c = new THREE.Group();
  const seat = box(0.42, 0.05, 0.42, seatMat); put(seat, 0, 0.45, 0); c.add(seat);
  const back = box(0.42, 0.5, 0.04, seatMat); put(back, 0, 0.72, -0.19, 0, -0.12); c.add(back);
  for (const [lx, lz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) {
    const leg = box(0.045, 0.45, 0.045, legMat); put(leg, lx, 0.225, lz); c.add(leg);
  }
  put(c, x, 0, z, ry); g.add(c);
}

/** Tanaman pot: pot lathe + tanah + 6 daun (2 warna, merge). */
function pottedPlant(g, x, z, s = 1, seed = 5) {
  const pot = lathe([[0.001, 0], [0.13, 0], [0.15, 0.05], [0.16, 0.22], [0.18, 0.26], [0.17, 0.28]], MAT.potTerra);
  put(pot, x, 0, z); pot.scale.setScalar(s); g.add(pot);
  const soil = cyl(0.14, 0.14, 0.02, 14, MAT.soilDark);
  put(soil, x, 0.27 * s, z); soil.scale.setScalar(s); g.add(soil);
  const r = rngKit(seed);
  const green = [], light = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const geo = new THREE.SphereGeometry(0.09, 8, 6);
    const m = trs(x + Math.cos(a) * 0.08 * s, (0.45 + r.range(-0.05, 0.1)) * s, z + Math.sin(a) * 0.08 * s,
      r.range(-0.3, 0.3), 0, r.range(-0.4, 0.4), s, s * 1.8, s);
    (i % 2 ? light : green).push({ geometry: geo, matrix: m });
  }
  mergeParts(green, MAT.leafGreen, g);
  mergeParts(light, MAT.leafLight, g);
}

/** Lukisan berbingkai di dinding (ry: 0 = dinding belakang, PI/2 = dinding kiri). */
function framedArt(g, x, y, z, ry, w, h, seed) {
  const frame = box(w + 0.08, h + 0.08, 0.03, MAT.woodDark);
  put(frame, x, y, z, ry); g.add(frame);
  const art = plane(w, h, std({ map: artTex(seed), roughness: 0.9 }));
  put(art, x + Math.sin(ry) * 0.02, y, z + Math.cos(ry) * 0.02, ry); g.add(art);
}

/** Deret buku berdiri di rak (sumbu x), warna acak dari palet. */
function booksRow(g, x0, y, z, n, seed) {
  const r = rngKit(seed);
  const palette = [0xc65f3d, 0x4a6b8a, 0x5a7a4a, 0xf2c94c, 0x7a4a6e, 0x4a7a7a];
  let x = x0;
  for (let i = 0; i < n; i++) {
    const w = r.range(0.035, 0.06);
    const h = r.range(0.2, 0.3);
    const col = palette[Math.floor(r.range(0, palette.length))];
    const b = box(w, h, 0.2, std({ color: col, roughness: 0.85 }));
    put(b, x + w / 2, y + h / 2, z, 0, 0, r.range(-0.04, 0.04));
    g.add(b);
    x += w + 0.004;
  }
  return x;
}

/** Deret buku berdiri di rak (sumbu z — rak menempel dinding barat/timur). */
function booksRowZ(g, z0, y, x, n, seed) {
  const r = rngKit(seed);
  const palette = [0xc65f3d, 0x4a6b8a, 0x5a7a4a, 0xf2c94c, 0x7a4a6e, 0x4a7a7a];
  let z = z0;
  for (let i = 0; i < n; i++) {
    const w = r.range(0.035, 0.06);
    const h = r.range(0.2, 0.3);
    const col = palette[Math.floor(r.range(0, palette.length))];
    const b = box(0.2, h, w, std({ color: col, roughness: 0.85 }));
    put(b, x, y + h / 2, z + w / 2, 0, r.range(-0.04, 0.04), 0);
    g.add(b);
    z += w + 0.004;
  }
  return z;
}

// ============================================================================
// 1. KM / WC — 2,27 x 2,88 m (28 Nov 2026: diperlebar dari 1,68 m — ambil
// 0,6 m dari gudang — supaya kloset + wastafel + shower tidak berdesakan;
// tengah ruangan dikosongkan, lantai ubin terlihat).
// Kloset kiri-belakang | wastafel + cermin kanan-belakang | shower sudut
// depan-kanan + kaca pembatas | rak handuk kiri | lampu plafon.
// Lantai + dinding bawah ubin biru-putih; jendela kecil tempel di
// dinding belakang (tanpa lubang — ruangan terlalu sempit untuk kusen).
// ============================================================================
// 28 Nov 2026 (4 arah hadap): pintu barat ke gudang (opts.doors.left,
// z -0,86 — menghadap depan kloset) + sekat shower (dinding z 0,3,
// tinggi 2,2 m, pintu hijau di x 0,3, daun membuka ke utara/zona kering).
export function buildKMWC(opts = {}) {
  const g = new THREE.Group();
  const W = 2.27, D = 2.88;
  const tileFloor = std({ map: tileTex(['#e8f0f2', '#cfe0e8'], [1.5, 2.5]), roughness: 0.4 });
  buildShell(g, W, D, { floorMat: tileFloor, wallMat: MAT.wallBlue, doors: opts.doors || null });
  // pita ubin bawah di 3 dinding (tinggi 1,2 m)
  const bandMat = std({ map: tileTex(['#d8e8ee', '#bcd4de'], [2, 1]), roughness: 0.4 });
  const bandB = box(W, 1.2, 0.02, bandMat); put(bandB, 0, 0.6, -D / 2 + 0.01); g.add(bandB);
  // Pita dinding barat DIBELAH di bukaan pintu (z -1,31..-0,41) supaya
  // tidak menutup lubang pintu ke gudang.
  const dLeft = opts.doors?.left ?? [];
  let westSpans = [[-D / 2, D / 2]];
  for (const d of dLeft) {
    const c = typeof d === 'number' ? d : d.c;
    const z0 = c - DOOR_W / 2, z1 = c + DOOR_W / 2;
    const next = [];
    for (const [a0, a1] of westSpans) {
      if (z1 <= a0 + 0.01 || z0 >= a1 - 0.01) { next.push([a0, a1]); continue; }
      if (z0 - a0 > 0.05) next.push([a0, z0]);
      if (a1 - z1 > 0.05) next.push([z1, a1]);
    }
    westSpans = next;
  }
  for (const [a0, a1] of westSpans) {
    const band = box(0.02, 1.2, a1 - a0, bandMat);
    put(band, -(W / 2 - 0.01), 0.6, (a0 + a1) / 2); g.add(band);
  }
  const bandE = box(0.02, 1.2, D, bandMat); put(bandE, W / 2 - 0.01, 0.6, 0); g.add(bandE);

  // --- SEKAT shower: dinding ubin melintang timur-barat di z 0,3 —
  // memisahkan shower (basah, selatan z 1,0) dari kloset + wastafel
  // (kering, utara). Tinggi 2,2 m (pintu 2,1 m + ambang 0,1 m).
  // Panjang 2,22 m (x -1,11..1,11) — berhenti 0,005 di muka pita ubin
  // supaya tidak sebidang/berpotongan dengan pita. Pintu hijau di x 0,3,
  // daun membuka ke UTARA (zona kering) — membuka ke selatan menabrak
  // nampan shower di (0,65, 1,0). Daun lolos dari kloset (~3 cm).
  const sekatZ = 0.3, sekatH = 2.2;
  for (const s of wallSegs(2.22, sekatH, [{ a0: -0.15, a1: 0.75, b0: 0, b1: DOOR_H }])) {
    const seg = box(s.w, s.h, 0.08, bandMat); put(seg, s.a, s.b, sekatZ); g.add(seg);
  }
  doorUnit(g, 0.3, sekatZ, Math.PI, 1);

  // --- kloset (kiri-belakang) ---
  const tank = box(0.44, 0.5, 0.16, MAT.ceramicWhite); put(tank, -0.7, 0.62, -1.32); g.add(tank);
  const flush = box(0.1, 0.03, 0.06, MAT.chrome); put(flush, -0.7, 0.885, -1.32); g.add(flush);
  const bowlBase = cyl(0.13, 0.16, 0.36, 16, MAT.ceramicWhite); put(bowlBase, -0.7, 0.18, -1.12); g.add(bowlBase);
  const seat = cyl(0.21, 0.21, 0.07, 20, MAT.ceramicWhite);
  put(seat, -0.7, 0.4, -1.1); seat.scale.set(1, 1, 1.3); g.add(seat);

  // --- wastafel + cermin (kanan-belakang) ---
  const ped = cyl(0.09, 0.13, 0.55, 14, MAT.ceramicWhite); put(ped, 0.7, 0.275, -1.25); g.add(ped);
  const basin = cyl(0.27, 0.2, 0.13, 20, MAT.ceramicWhite); put(basin, 0.7, 0.62, -1.22); g.add(basin);
  const basinInner = cyl(0.22, 0.22, 0.02, 20, std({ color: 0xdce8ea, roughness: 0.2 }));
  put(basinInner, 0.7, 0.685, -1.22); g.add(basinInner);
  const faucet = cyl(0.015, 0.015, 0.18, 8, MAT.chrome); put(faucet, 0.7, 0.78, -1.36); g.add(faucet);
  const spout = cyl(0.012, 0.012, 0.16, 8, MAT.chrome);
  put(spout, 0.7, 0.86, -1.29, 0, Math.PI / 2); g.add(spout);
  const soap = cyl(0.03, 0.035, 0.09, 10, std({ color: 0x7a9a8a, roughness: 0.5 }));
  put(soap, 0.47, 0.73, -1.28); g.add(soap);
  const cup = cyl(0.035, 0.03, 0.08, 10, std({ color: 0xf2c94c, roughness: 0.6 }));
  put(cup, 0.93, 0.725, -1.28); g.add(cup);
  // cermin + bingkai kayu
  const mFrame = box(0.61, 0.81, 0.015, MAT.woodDark); put(mFrame, 0.7, 1.55, -1.428); g.add(mFrame);
  const mirror = box(0.55, 0.75, 0.02, MAT.mirror); put(mirror, 0.7, 1.55, -1.415); g.add(mirror);

  // --- shower sudut (depan-kanan) + kaca pembatas ---
  const tray = box(0.85, 0.07, 0.85, MAT.ceramicWhite); put(tray, 0.65, 0.035, 1.0); g.add(tray);
  const part = plane(0.84, 1.9, MAT.glass); put(part, 0.225, 1.0, 1.0, Math.PI / 2); noShadow(part); g.add(part);
  const partTop = box(0.03, 0.03, 0.84, MAT.chrome); put(partTop, 0.225, 1.96, 1.0); g.add(partTop);
  const arm = cyl(0.012, 0.012, 0.3, 8, MAT.chrome); put(arm, 0.91, 2.15, 1.1, 0, 0, Math.PI / 2); g.add(arm);
  const head = cyl(0.02, 0.07, 0.08, 12, MAT.chrome); put(head, 0.75, 2.08, 1.1); g.add(head);
  const mixer = cyl(0.04, 0.04, 0.03, 10, MAT.chrome); put(mixer, 1.05, 1.1, 1.1, 0, 0, Math.PI / 2); g.add(mixer);

  // --- rak handuk 2 susun (dinding KANAN) + handuk lipat + botol ---
  // (28 Nov 2026: pindah dari dinding kiri — dinding kiri kini ada pintu
  // ke gudang di z -0,86; di timur tidak menabrak wastafel/cermin/cincin
  // handuk/mixer shower.)
  for (const y of [1.5, 1.85]) {
    const shelf = box(0.22, 0.03, 0.7, MAT.woodMid); put(shelf, 1.0, y, -0.6); g.add(shelf);
  }
  const towelCols = [0xf2c94c, 0x4a7a7a, 0xc65f3d];
  towelCols.forEach((col, i) => {
    const t = box(0.18, 0.08, 0.26, std({ color: col, roughness: 0.98 }));
    put(t, 1.0, (i < 2 ? 1.555 : 1.905), -0.78 + i * 0.24); g.add(t);
  });
  const bottleCols = [0x4a6b8a, 0x7a4a6e, 0x5a7a4a];
  bottleCols.forEach((col, i) => {
    const b = cyl(0.03, 0.03, 0.13, 10, std({ color: col, roughness: 0.5 }));
    put(b, 1.0, 1.93, -0.35 + i * 0.12); g.add(b);
  });

  // --- gantungan handuk (dinding kanan) + keset ---
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.012, 8, 20), MAT.chrome);
  put(ring, 1.1, 1.25, 0.2, Math.PI / 2); ring.castShadow = true; g.add(ring);
  const towel = plane(0.3, 0.45, std({ color: 0xc65f3d, roughness: 0.98, side: THREE.DoubleSide }));
  put(towel, 1.08, 1.0, 0.2, Math.PI / 2); noShadow(towel); g.add(towel);
  const mat = plane(0.55, 0.8, std({ color: 0x7a9a8a, roughness: 1 }));
  put(mat, 0, 0.012, 0.2, 0, -Math.PI / 2); g.add(mat);

  // --- jendela kecil tempel (dinding belakang, kaca buram menyala) ---
  const wFrame = box(0.56, 0.46, 0.03, MAT.trimWhite); put(wFrame, 0, 2.9, -1.425); g.add(wFrame);
  const wGlass = plane(0.48, 0.38, std({ color: 0xd8ecf2, emissive: 0xbfe3ea, emissiveIntensity: 0.5, roughness: 0.4 }));
  put(wGlass, 0, 2.9, -1.408); g.add(wGlass);

  // --- lampu plafon ---
  const lampShade = cyl(0.15, 0.18, 0.06, 16, MAT.lampWarm); put(lampShade, 0, 3.78, 0); g.add(lampShade);
  const lampLight = new THREE.PointLight(0xfff2d8, 5, 4, 2);
  lampLight.position.set(0, 3.4, 0); g.add(lampLight);

  console.log('TRIANGLES kmwc =', countTriangles(g));
  return g;
}

// ============================================================================
// 2. RUANG MAKAN — 4,6 x 4,0 m, dinding 3,84 m.
// Meja makan kayu + 6 kursi (tengah) | lemari pajang kanan-belakang |
// lampu gantung di atas meja | tanaman sudut | 2 lukisan dinding kiri.
// Jendela besar tengah-belakang (lubang asli + tirai).
// ============================================================================
export function buildRuangMakan(opts = {}) {
  const g = new THREE.Group();
  const W = 4.6, D = 4.0;
  const woodFloor = std({ map: floorTex(21, [2.5, 2]), roughness: 0.75 });
  // Pintu (mode rumah): belakang ke dapur (x -1,8) + DEPAN ke ruang tamu
  // (x 1,8 — pintu 5, kini di dinding selatan yang baru). Sisi barat
  // TERBUKA ke koridor k2 (openSide 'west') — pintu kiri (7) hilang,
  // bukaannya sendiri jadi penghubung ke koridor.
  // (28 Nov 2026, 4 arah hadap: makan menghadap kiri/barat.)
  buildShell(g, W, D, {
    floorMat: woodFloor, wallMat: MAT.wallCream,
    win: { x0: -0.9, x1: 0.9, y0: 0.95, y1: 2.95 }, wainscot: true,
    doors: opts.doors || null, openSide: opts.openSide || 'south',
  });
  // karpet bawah meja
  const rug = plane(3.0, 1.8, std({ map: rugTex('#e9dcc0', '#c65f3d', '#7a8a5a'), roughness: 0.98 }));
  put(rug, 0, 0.012, -0.1, 0, -Math.PI / 2); g.add(rug);

  // --- meja makan + 6 kursi ---
  const top = box(2.0, 0.06, 0.95, MAT.woodMid); put(top, 0, 0.75, -0.1); g.add(top);
  const apron = box(1.8, 0.08, 0.8, MAT.woodDark); put(apron, 0, 0.68, -0.1); g.add(apron);
  for (const [lx, lz] of [[-0.9, -0.38], [0.9, -0.38], [-0.9, 0.38], [0.9, 0.38]]) {
    const leg = box(0.08, 0.72, 0.08, MAT.woodDark); put(leg, lx, 0.36, -0.1 + lz); g.add(leg);
  }
  const runner = box(2.0, 0.012, 0.32, MAT.fabricTerra); put(runner, 0, 0.786, -0.1); g.add(runner);
  diningChair(g, -1.3, -0.1, Math.PI / 2);
  diningChair(g, 1.3, -0.1, -Math.PI / 2);
  diningChair(g, -0.55, -0.85, 0);
  diningChair(g, 0.55, -0.85, 0);
  diningChair(g, -0.55, 0.65, Math.PI);
  diningChair(g, 0.55, 0.65, Math.PI);

  // --- peralatan makan: 6 piring + 6 gelas ---
  const place = [[-0.55, -0.42], [0.55, -0.42], [-0.55, 0.22], [0.55, 0.22], [-0.85, -0.1], [0.85, -0.1]];
  for (const [px, pz] of place) {
    const plate = cyl(0.11, 0.11, 0.015, 18, MAT.ceramicWhite); put(plate, px, 0.79, pz); g.add(plate);
    const glass = cyl(0.035, 0.03, 0.09, 12, MAT.glass);
    put(glass, px + 0.14, 0.835, pz - 0.05); noShadow(glass); g.add(glass);
  }
  // --- vas bunga + mangkuk buah di tengah meja ---
  const vase = lathe([[0.001, 0], [0.05, 0], [0.07, 0.04], [0.06, 0.12], [0.075, 0.16], [0.05, 0.18]], MAT.potTerra);
  put(vase, -0.25, 0.79, -0.1); g.add(vase);
  const flowerCols = [0xf27d9d, 0xf2c94c, 0xe8862a, 0x7a4a6e, 0xc65f3d];
  flowerCols.forEach((col, i) => {
    const a = (i / 5) * Math.PI * 2;
    const stem = cyl(0.006, 0.006, 0.24, 6, MAT.leafGreen);
    put(stem, -0.25 + Math.cos(a) * 0.03, 0.95, -0.1 + Math.sin(a) * 0.03, 0, Math.cos(a) * 0.2, Math.sin(a) * 0.2);
    g.add(stem);
    const bloom = sph(0.035, std({ color: col, roughness: 0.7 }), 10, 8);
    put(bloom, -0.25 + Math.cos(a) * 0.06, 1.08, -0.1 + Math.sin(a) * 0.06); g.add(bloom);
  });
  const bowl = lathe([[0.001, 0], [0.1, 0], [0.14, 0.03], [0.15, 0.07]], MAT.ceramicWhite);
  put(bowl, 0.3, 0.79, -0.1); g.add(bowl);
  const fruitCols = [0xe8862a, 0xd9382a, 0xf2c94c, 0x5a7a4a];
  fruitCols.forEach((col, i) => {
    const a = (i / 4) * Math.PI * 2;
    const f = sph(0.045, std({ color: col, roughness: 0.6 }), 10, 8);
    put(f, 0.3 + Math.cos(a) * 0.05, 0.89, -0.1 + Math.sin(a) * 0.05); g.add(f);
  });

  // --- lemari pajang (kanan-belakang) ---
  const cab = box(1.1, 2.0, 0.4, MAT.woodMid); put(cab, 1.65, 1.0, -1.78); g.add(cab);
  const cabBack = box(1.0, 1.7, 0.02, MAT.woodDark); put(cabBack, 1.65, 1.1, -1.6); g.add(cabBack);
  for (const sy of [0.75, 1.2, 1.65]) {
    const shelf = box(1.0, 0.03, 0.3, MAT.woodDark); put(shelf, 1.65, sy, -1.62); g.add(shelf);
  }
  // piring + cangkir pajang di rak
  for (let i = 0; i < 4; i++) {
    const p = cyl(0.07, 0.07, 0.015, 14, MAT.ceramicWhite);
    put(p, 1.3 + i * 0.24, 0.78, -1.62); g.add(p);
  }
  for (let i = 0; i < 3; i++) {
    const c = cyl(0.04, 0.035, 0.08, 10, std({ color: [0x4a6b8a, 0xc65f3d, 0x5a7a4a][i], roughness: 0.5 }));
    put(c, 1.35 + i * 0.3, 1.27, -1.62); g.add(c);
  }
  for (const s of [-1, 1]) {
    const door = plane(0.48, 1.7, MAT.glass);
    put(door, 1.65 + s * 0.26, 1.1, -1.565); noShadow(door); g.add(door);
  }
  const cabVase = lathe([[0.001, 0], [0.04, 0], [0.055, 0.03], [0.05, 0.1], [0.06, 0.13]], MAT.potTerra);
  put(cabVase, 1.4, 2.0, -1.78); g.add(cabVase);
  const cabBooks = [box(0.2, 0.04, 0.15, std({ color: 0x4a6b8a, roughness: 0.85 })), box(0.18, 0.035, 0.14, std({ color: 0xc65f3d, roughness: 0.85 }))];
  put(cabBooks[0], 1.85, 2.02, -1.78); g.add(cabBooks[0]);
  put(cabBooks[1], 1.85, 2.055, -1.78); g.add(cabBooks[1]);

  // --- lampu gantung di atas meja ---
  const cord = cyl(0.012, 0.012, 0.95, 8, MAT.black); put(cord, 0, 3.36, -0.1); g.add(cord);
  const shade = cyl(0.05, 0.3, 0.22, 20, MAT.fabricTerra); put(shade, 0, 2.85, -0.1); g.add(shade);
  const bulb = sph(0.05, MAT.lampWarm, 10, 8); put(bulb, 0, 2.72, -0.1); g.add(bulb);
  const pendantLight = new THREE.PointLight(0xffc46b, 8, 5, 2);
  pendantLight.position.set(0, 2.6, -0.1); g.add(pendantLight);

  // --- tanaman sudut + lukisan dinding selatan ---
  // (28 Nov 2026: lukisan pindah dari dinding kiri (barat) — sisi itu
  // kini TERBUKA ke koridor — ke dinding selatan yang baru (z 1,98,
  // menghadap utara); tanaman di tepi barat tetap, kecil, tidak menutupi
  // pandangan dari kamera barat yang curam.)
  pottedPlant(g, -2.0, 1.55, 1.2, 6);
  framedArt(g, -1.5, 1.8, 1.98, Math.PI, 0.6, 0.8, 0);
  framedArt(g, 0.5, 1.8, 1.98, Math.PI, 0.6, 0.8, 1);

  console.log('TRIANGLES ruang-makan =', countTriangles(g));
  return g;
}

// ============================================================================
// 3. RUANG TAMU — 4,6 x 4,6 m, dinding 3,84 m.
// Sofa 3 dudukan (dinding kiri) | TV + rak (dinding kanan) | meja kopi
// tengah | 2 kursi sudut depan | karpet besar | lampu sudut + 2 tanaman.
// Jendela besar tengah-belakang (lubang asli + tirai).
// ============================================================================
function armchair(g, x, z, ry, fabric) {
  const c = new THREE.Group();
  const base = box(0.8, 0.3, 0.75, fabric); put(base, 0, 0.28, 0); c.add(base);
  const back = box(0.8, 0.65, 0.18, fabric); put(back, 0, 0.7, -0.3, 0, -0.1); c.add(back);
  for (const s of [-1, 1]) {
    const arm = box(0.16, 0.3, 0.75, fabric); put(arm, s * 0.32, 0.55, 0); c.add(arm);
  }
  const cushion = box(0.6, 0.14, 0.55, MAT.fabricCream); put(cushion, 0, 0.5, 0.02); c.add(cushion);
  for (const [lx, lz] of [[-0.32, -0.3], [0.32, -0.3], [-0.32, 0.3], [0.32, 0.3]]) {
    const leg = cyl(0.025, 0.02, 0.13, 8, MAT.woodDark); put(leg, lx, 0.065, lz); c.add(leg);
  }
  put(c, x, 0, z, ry); g.add(c);
}

export function buildRuangTamu(opts = {}) {
  const g = new THREE.Group();
  const W = 4.6, D = 4.6;
  const woodFloor = std({ map: floorTex(33, [2.5, 2.5]), roughness: 0.75 });
  // Pintu (mode rumah): DEPAN ke teras (x 0 — pintu luar baru, dinding
  // selatan z 10,30 dunia, frontInset 0,26) + kiri ke foyer (z -1,8).
  // Sisi utara TERBUKA ke ruang makan (openSide 'north') — pintu belakang
  // (5) hilang, bukaannya pindah ke dinding selatan ruang makan.
  // Jendela belakang ikut hilang bersama dinding utara (tidak ada jendela
  // baru — ruangan disinari hemisphere + PointLight).
  // (28 Nov 2026, 4 arah hadap: tamu menghadap belakang/utara.)
  buildShell(g, W, D, {
    floorMat: woodFloor, wallMat: MAT.wallSage,
    win: { x0: -1.0, x1: 1.0, y0: 0.9, y1: 3.0 }, wainscot: true,
    doors: opts.doors || null, openSide: opts.openSide || 'south',
    frontInset: opts.frontInset || 0,
  });
  // karpet besar tengah
  const rug = plane(3.2, 2.3, std({ map: rugTex('#e9dcc0', '#4a7a7a', '#c65f3d'), roughness: 0.98 }));
  put(rug, 0, 0.012, -0.2, 0, -Math.PI / 2); g.add(rug);

  // --- sofa 3 dudukan (dinding kiri, menghadap +x) ---
  const sofaX = -1.82, sofaZ = -0.3;
  const sBase = box(0.85, 0.32, 2.1, MAT.fabricTeal); put(sBase, sofaX, 0.28, sofaZ); g.add(sBase);
  const sBack = box(0.22, 0.75, 2.1, MAT.fabricTeal); put(sBack, -2.14, 0.75, sofaZ); g.add(sBack);
  for (const s of [-1, 1]) {
    const arm = box(0.85, 0.28, 0.2, MAT.fabricTeal); put(arm, sofaX, 0.6, sofaZ + s * 0.95); g.add(arm);
  }
  for (let i = 0; i < 3; i++) {
    const z = sofaZ - 0.65 + i * 0.65;
    const seat = box(0.62, 0.16, 0.62, MAT.fabricSage); put(seat, -1.78, 0.52, z); g.add(seat);
    const bcush = box(0.16, 0.5, 0.6, MAT.fabricCream); put(bcush, -2.0, 0.75, z, 0, -0.08); g.add(bcush);
  }
  const pillow1 = box(0.35, 0.35, 0.12, MAT.fabricYellow);
  put(pillow1, -1.95, 0.72, -1.05, 0.4, -0.15, 0.1); g.add(pillow1);
  const pillow2 = box(0.35, 0.35, 0.12, MAT.fabricTerra);
  put(pillow2, -1.95, 0.72, 0.45, -0.35, -0.15, -0.1); g.add(pillow2);
  for (const [lx, lz] of [[-2.15, -1.25], [-1.5, -1.25], [-2.15, 0.65], [-1.5, 0.65]]) {
    const leg = cyl(0.025, 0.02, 0.12, 8, MAT.woodDark); put(leg, lx, 0.06, lz); g.add(leg);
  }

  // --- TV + rak (dinding kanan) ---
  const rack = box(0.42, 0.45, 1.7, MAT.woodDark); put(rack, 1.95, 0.225, -0.3); g.add(rack);
  const tv = box(0.07, 0.8, 1.35, MAT.black); put(tv, 1.95, 1.05, -0.3); g.add(tv);
  const screen = plane(1.25, 0.7, MAT.screenGlow); put(screen, 1.91, 1.05, -0.3, -Math.PI / 2); g.add(screen);
  const tvFeet = box(0.3, 0.04, 0.1, MAT.black); put(tvFeet, 1.95, 0.47, -0.3); g.add(tvFeet);
  booksRow(g, 1.78, 0.45, -0.95, 4, 41);
  pottedPlant(g, 1.9, 0.85, 0.55, 7);

  // --- meja kopi tengah ---
  const ctTop = box(1.15, 0.05, 0.6, MAT.woodMid); put(ctTop, 0, 0.42, -0.3); g.add(ctTop);
  const ctShelf = box(1.0, 0.03, 0.5, MAT.woodDark); put(ctShelf, 0, 0.15, -0.3); g.add(ctShelf);
  for (const [lx, lz] of [[-0.5, -0.24], [0.5, -0.24], [-0.5, 0.24], [0.5, 0.24]]) {
    const leg = box(0.06, 0.4, 0.06, MAT.woodDark); put(leg, lx, 0.2, -0.3 + lz); g.add(leg);
  }
  const ctBook1 = box(0.28, 0.03, 0.2, std({ color: 0x4a6b8a, roughness: 0.85 }));
  put(ctBook1, -0.25, 0.46, -0.3); g.add(ctBook1);
  const ctBook2 = box(0.24, 0.025, 0.18, std({ color: 0xc65f3d, roughness: 0.85 }));
  put(ctBook2, -0.25, 0.487, -0.3, 0.15); g.add(ctBook2);
  const ctVase = lathe([[0.001, 0], [0.04, 0], [0.05, 0.03], [0.045, 0.09], [0.055, 0.11]], MAT.potTerra);
  put(ctVase, 0.3, 0.445, -0.3); g.add(ctVase);

  // --- 2 kursi sudut depan (menghadap ke tengah) ---
  // (28 Nov 2026: digeser dari ±1,5 ke ±1,3 supaya simetris dengan tanaman
  // yang pindah ke sudut depan-kiri.)
  armchair(g, -1.3, 1.6, 0.7, MAT.fabricSage);
  armchair(g, 1.3, 1.6, -0.7, MAT.fabricSage);

  // --- lampu sudut (belakang-kanan) ---
  // lampu lantai sudut — DI SUDUT BARAT-LAUT (-1,85,-1,85), BUKAN timur-
  // laut: daun pintu belakang (hinge -1, bukaan 1,0 rad) menyapu sudut
  // timur-laut sampai x 1,36, jadi lampu di sana akan tertabrak daun.
  const lampBase = cyl(0.14, 0.16, 0.03, 14, MAT.brass); put(lampBase, -1.85, 0.015, -1.85); g.add(lampBase);
  const lampPole = cyl(0.02, 0.02, 1.55, 8, MAT.brass); put(lampPole, -1.85, 0.8, -1.85); g.add(lampPole);
  const lampShade = cyl(0.16, 0.22, 0.28, 16, MAT.fabricCream); put(lampShade, -1.85, 1.7, -1.85); g.add(lampShade);
  const lampBulb = sph(0.05, MAT.lampWarm, 10, 8); put(lampBulb, -1.85, 1.58, -1.85); g.add(lampBulb);
  const floorLight = new THREE.PointLight(0xffc46b, 6, 4.5, 2);
  floorLight.position.set(-1.85, 1.65, -1.85); g.add(floorLight);

  // --- tanaman + dekor dinding ---
  // (28 Nov 2026: tanaman dari (-1,9,-1,9) ke (-1,95,1,95) — posisi lama
  // dalam ayunan daun pintu foyer di dinding kiri; lukisan +1,6 pindah ke
  // dinding kanan (2,28,1,9,-1,5) karena tertutup pintu belakang x 1,3..2,2.
  // 4 arah hadap: lukisan dinding BELAKANG (-1,6,1,9,-2,28) pindah ke
  // dinding SELATAN yang baru (z 2,02, menghadap utara) — dinding utara
  // kini terbuka; jam dinding ikut pindah ke selatan (1,85,2,4,2,02).)
  pottedPlant(g, -1.95, 1.95, 1.1, 8);
  framedArt(g, -1.6, 1.9, 2.02, Math.PI, 0.6, 0.8, 2);
  framedArt(g, 2.28, 1.9, -1.5, -Math.PI / 2, 0.6, 0.8, 0);
  // jam dinding (selatan, kanan pintu luar)
  const clockFace = cyl(0.18, 0.18, 0.03, 20, MAT.ceramicWhite);
  put(clockFace, 1.85, 2.4, 2.02, 0, Math.PI / 2); g.add(clockFace);
  const handH = box(0.02, 0.1, 0.01, MAT.black); put(handH, 1.85, 2.44, 2.0, 0, 0, -0.5); g.add(handH);
  const handM = box(0.015, 0.14, 0.01, MAT.black); put(handM, 1.85, 2.42, 2.0, 0, 0, 0.9); g.add(handM);

  console.log('TRIANGLES ruang-tamu =', countTriangles(g));
  return g;
}

// ============================================================================
// 4. KAMAR KERJA / KAMAR TAMU — 4,5 x 4,5 m, dinding 3,84 m.
// Kasur single (kiri-belakang) | meja kerja + laptop + lampu meja
// (kanan) + kursi | rak buku isi (belakang-kanan) | lemari kecil
// (dinding kiri) | tanaman sudut. Jendela besar tengah-belakang.
// ============================================================================
export function buildKamarKerja(opts = {}) {
  const g = new THREE.Group();
  const W = 4.5, D = 4.5;
  const woodFloor = std({ map: floorTex(55, [2.5, 2.5]), roughness: 0.75 });
  // Pintu (mode rumah): DEPAN ke teras (x 0 — pintu luar baru, dinding
  // selatan z 10,30 dunia, frontInset 0,26) + kanan ke foyer (z 1,5).
  // Sisi utara TERBUKA ke kamar tidur (openSide 'north') — pintu belakang
  // (3) hilang, bukaannya pindah ke dinding selatan kamar tidur.
  // Jendela belakang ikut hilang bersama dinding utara (tidak ada jendela
  // baru — ruangan disinari hemisphere + PointLight).
  // (28 Nov 2026, 4 arah hadap: kerja menghadap belakang/utara.)
  buildShell(g, W, D, {
    floorMat: woodFloor, wallMat: MAT.wallCream,
    win: { x0: -0.8, x1: 0.8, y0: 1.0, y1: 2.9 }, wainscot: true,
    doors: opts.doors || null, openSide: opts.openSide || 'south',
    frontInset: opts.frontInset || 0,
  });
  // karpet kecil dekat kasur (kasur kini di selatan-barat, karpet di
  // utara kasur supaya tetap di samping tempat tidur)
  const rug = plane(1.6, 1.1, std({ map: rugTex('#e9dcc0', '#5a7a4a', '#c65f3d'), roughness: 0.98 }));
  put(rug, -1.2, 0.012, -0.6, 0, -Math.PI / 2); g.add(rug);

  // --- kasur single (SELATAN-barat, sandaran dinding selatan baru) ---
  // Dicerminkan dari utara (z -> -z) lalu digeser -0,26 supaya headboard
  // 0,05 dari muka-dalam dinding selatan (1,99) — sama seperti dulu
  // terhadap dinding utara; rangka ikut menempel (ujungnya masuk dinding
  // 0,125 seperti dulu). Pintu luar (x -0,41..0,41) aman: kasur di barat.
  const bedX = -1.35, bedZ = 1.09;
  const bedFrame = box(1.05, 0.28, 2.05, MAT.woodDark); put(bedFrame, bedX, 0.14, bedZ); g.add(bedFrame);
  const headboard = box(1.05, 0.7, 0.08, MAT.woodDark); put(headboard, bedX, 0.55, 1.94); g.add(headboard);
  const mattress = box(1.0, 0.18, 2.0, MAT.sheetWhite); put(mattress, bedX, 0.37, bedZ); g.add(mattress);
  const pillow = box(0.65, 0.12, 0.4, MAT.paperWhite); put(pillow, bedX, 0.5, 1.74); g.add(pillow);
  const blanket = box(1.02, 0.07, 1.25, MAT.blanketGreen); put(blanket, bedX, 0.47, 0.59); g.add(blanket);
  const throwB = box(1.02, 0.03, 0.3, MAT.fabricYellow); put(throwB, bedX, 0.5, 0.09); g.add(throwB);

  // --- meja kerja (kanan) + laptop + lampu meja ---
  const deskX = 1.75, deskZ = -0.6;
  const deskTop = box(0.75, 0.05, 1.5, MAT.woodMid); put(deskTop, deskX, 0.74, deskZ); g.add(deskTop);
  for (const lz of [-1.28, 0.08]) {
    const leg = box(0.7, 0.72, 0.05, MAT.woodDark); put(leg, deskX, 0.36, lz); g.add(leg);
  }
  // laptop (menghadap -x, ke arah kursi): alas 0,28 (x) x 0,4 (z),
  // layar tipis di tepi jauh, miring ke belakang (rz -0,25)
  const lapBase = box(0.28, 0.02, 0.4, MAT.black); put(lapBase, 1.68, 0.775, -0.9); g.add(lapBase);
  const lapScreen = box(0.015, 0.26, 0.4, MAT.black); put(lapScreen, 1.8, 0.9, -0.9, 0, 0, -0.25); g.add(lapScreen);
  const lapGlow = box(0.006, 0.22, 0.36, MAT.screenGlow); put(lapGlow, 1.788, 0.9, -0.9, 0, 0, -0.25); g.add(lapGlow);
  // tumpuk buku + tempat pena di meja
  const dBook1 = box(0.26, 0.035, 0.19, std({ color: 0x4a6b8a, roughness: 0.85 }));
  put(dBook1, 1.75, 0.785, -0.15); g.add(dBook1);
  const dBook2 = box(0.24, 0.03, 0.17, std({ color: 0xc65f3d, roughness: 0.85 }));
  put(dBook2, 1.75, 0.818, -0.15, 0.2); g.add(dBook2);
  const penCup = cyl(0.04, 0.04, 0.1, 10, std({ color: 0x4a7a7a, roughness: 0.6 }));
  put(penCup, 1.8, 0.815, -0.35); g.add(penCup);
  for (let i = 0; i < 3; i++) {
    const pen = cyl(0.006, 0.006, 0.14, 6, std({ color: [0x232326, 0xd9382a, 0x2e5a8a][i], roughness: 0.6 }));
    put(pen, 1.78 + i * 0.02, 0.9, -0.35, 0, (i - 1) * 0.12, 0); g.add(pen);
  }
  // lampu meja
  const dlBase = cyl(0.07, 0.09, 0.02, 12, MAT.brass); put(dlBase, 1.85, 0.775, -1.25); g.add(dlBase);
  const dlArm = cyl(0.012, 0.012, 0.3, 8, MAT.brass); put(dlArm, 1.82, 0.92, -1.25, 0, 0, 0.5); g.add(dlArm);
  const dlShade = cyl(0.05, 0.09, 0.1, 12, MAT.fabricTerra); put(dlShade, 1.72, 1.06, -1.25); g.add(dlShade);
  const dlBulb = sph(0.03, MAT.lampWarm, 8, 6); put(dlBulb, 1.72, 1.01, -1.25); g.add(dlBulb);
  const deskLight = new THREE.PointLight(0xffc46b, 4, 3, 2);
  deskLight.position.set(1.7, 1.1, -1.0); g.add(deskLight);
  // kursi kerja (menghadap meja, +x)
  diningChair(g, 1.05, -0.6, -Math.PI / 2, MAT.fabricGrey, MAT.metal);

  // --- rak buku isi (dinding BARAT, menghadap timur) ---
  // (28 Nov 2026: dari belakang-kanan ke dinding barat — posisi lama
  // menutupi bukaan pintu belakang x 1,3..2,2. Rak menempel kasur dengan
  // celah 0,055 m di sampingnya; buku kini berdiri sepanjang z.)
  const bsX = -2.09, bsZ = -1.5;
  for (const s of [-1, 1]) {
    const side = box(0.32, 2.0, 0.04, MAT.woodMid); put(side, bsX, 1.0, bsZ + s * 0.6); g.add(side);
  }
  const bsBack = box(0.03, 2.0, 1.24, MAT.woodDark); put(bsBack, -2.24, 1.0, bsZ); g.add(bsBack);
  const bsTop = box(0.32, 0.04, 1.24, MAT.woodMid); put(bsTop, bsX, 2.0, bsZ); g.add(bsTop);
  const bsBot = box(0.32, 0.04, 1.24, MAT.woodMid); put(bsBot, bsX, 0.02, bsZ); g.add(bsBot);
  for (const sy of [0.5, 1.0, 1.5]) {
    const shelf = box(0.28, 0.03, 1.16, MAT.woodMid); put(shelf, bsX, sy, bsZ); g.add(shelf);
  }
  booksRowZ(g, -2.05, 0.53, -2.09, 9, 61);
  booksRowZ(g, -2.05, 1.03, -2.09, 8, 62);
  booksRowZ(g, -2.05, 1.53, -2.09, 7, 63);
  const bsVase = lathe([[0.001, 0], [0.04, 0], [0.05, 0.03], [0.045, 0.09], [0.055, 0.11]], MAT.potTerra);
  put(bsVase, -2.09, 2.02, -1.85); g.add(bsVase);
  const bsBox = box(0.2, 0.14, 0.16, std({ color: 0x7a4a6e, roughness: 0.85 }));
  put(bsBox, -2.09, 2.09, -1.15); g.add(bsBox);

  // --- lemari kecil (SELATAN, diputar 90 derajat, pintu menghadap
  // utara) --- (28 Nov 2026: pindah dari dinding kiri — kasur kini di
  // selatan-barat, lemari lama menutupi ayunan pintu luar; di selatan
  // aman dari pintu luar (x -0,41..0,41) dan dari meja kerja.
  // REVISI cek visual: lemari di x 1,5 menutupi PINTU 9 (foyer-kerja,
  // dinding timur z 1,5) — daunnya berayun ke barat dan hilang di
  // dalam lemari, pintu 9 tidak terbaca di montase. Lemari digeser ke
  // barat (x 0,6, muka timur 1,1) supaya ayunan daun pintu 9 (ujung
  // x 1,59) bebas; muka barat (0,1) tetap di timur daun pintu luar
  // (x -0,45) dan di timur kasur (tepi -0,825).)
  const ward = box(1.0, 1.9, 0.55, MAT.woodMid); put(ward, 0.6, 0.95, 1.69); g.add(ward);
  for (const s of [-1, 1]) {
    const door = box(0.46, 1.8, 0.02, MAT.woodDark);
    put(door, 0.6 + s * 0.24, 0.95, 1.41); g.add(door);
    const handle = sph(0.02, MAT.brass, 8, 6); put(handle, 0.6 + s * 0.05, 0.95, 1.39); g.add(handle);
  }

  // --- dekor: lukisan + tanaman sudut ---
  // (28 Nov 2026: lukisan kanan (1,95,1,8,-2,23) pindah ke dinding kanan
  // (2,23,1,8,-1,9) — posisi lama tertutup pintu belakang x 1,3..2,2;
  // tanaman dari (1,9,1,9) ke (-1,95,1,95) — posisi lama dalam ayunan daun
  // pintu foyer, dan (1,9,-1,9) juga kena ayunan daun pintu belakang.
  // 4 arah hadap: tanaman dari (-1,95,1,95) ke (1,95,-1,95) — sudut
  // selatan-barat kini ditempati kasur; tanaman di timur-laut (sisi
  // terbuka) tidak menutupi bukaan utara dari kamera selatan yang curam.)
  framedArt(g, -2.23, 1.8, 0.0, Math.PI / 2, 0.6, 0.8, 1);
  framedArt(g, 2.23, 1.8, -1.9, -Math.PI / 2, 0.6, 0.8, 2);
  pottedPlant(g, 1.95, -1.95, 1.0, 9);

  console.log('TRIANGLES kamar-kerja =', countTriangles(g));
  return g;
}
