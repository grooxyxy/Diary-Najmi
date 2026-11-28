// ============================================================================
// props-makanan.js — Prop makanan 3D untuk proyek Najmi (Diary Najmi)
// (28 Nov 2026, atas permintaan Master: ramen, beef, burger — plus
//  pelengkapnya; dipakai sebagai prop di set / meja makan / adegan jajan)
//
// Tiga builder, masing-masing mengembalikan THREE.Group:
//   buildRamen()  — semangkuk mie ramen (mangkuk d 0,24 m)
//   buildBeef()   — steak panggang di talenan kayu bundar
//   buildBurger() — burger di piring putih kecil (tinggi ~0,13 m)
//
// Konvensi (sama seperti set-*.js): origin di tengah alas item
// (y = 0 di dasar), menghadap +z, skala meter dunia nyata.
// HANYA MeshStandardMaterial (converter Sakura mengubah ke Toon).
// TANPA CanvasTexture — detail hanya lewat geometri.
// Part statis se-material digabung via mergeParts (bake/trs).
// Budget: tiap item MAKSIMAL 6.000 tris (terukur via countTriangles).
// ============================================================================
import * as THREE from 'three';
import { bake, trs } from './vendor/sakura/src/core/util.js';

const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0, ...o });

// ---------- mesh helpers (pola set-padang-aruna.js) ----------
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
function put(m, x, y, z, ry = 0, rx = 0, rz = 0) {
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz); return m;
}
/** Gabung daftar {geometry, matrix} jadi SATU mesh (mergeGeometries). */
function mergeParts(list, mat, parent, noShadow = false) {
  if (!list.length) return null;
  const m = new THREE.Mesh(bake(list), mat);
  m.castShadow = !noShadow; m.receiveShadow = true;
  parent.add(m);
  return m;
}

// ---------- material kit ----------
const M = {
  // ramen
  bowlBlue: std({ color: 0x1e3a6e, roughness: 0.35 }),
  broth: std({ color: 0xc96a1e, roughness: 0.15 }),
  noodle: std({ color: 0xf2d38a, roughness: 0.7 }),
  eggWhite: std({ color: 0xf7f3e8, roughness: 0.5 }),
  yolk: std({ color: 0xe8862a, roughness: 0.4 }),
  narutoWhite: std({ color: 0xffffff, roughness: 0.4 }),
  narutoPink: std({ color: 0xf27d9d, roughness: 0.5 }),
  onion: std({ color: 0x4e9a3d, roughness: 0.8 }),
  chopstick: std({ color: 0x6b4a2e, roughness: 0.7 }),
  spoonWhite: std({ color: 0xf5f2ea, roughness: 0.3 }),
  // beef (revisi 28 Nov 2026 — cek visual: talenan terlalu terang,
  // steak terlalu tipis sehingga terbaca piringan datar)
  boardWood: std({ color: 0x8a5f38, roughness: 0.85 }),
  steak: std({ color: 0x7a4522, roughness: 0.75 }),
  grillDark: std({ color: 0x2e1a10, roughness: 0.9 }),
  fat: std({ color: 0xe8d9b0, roughness: 0.6 }),
  // burger
  plateWhite: std({ color: 0xfafafa, roughness: 0.3 }),
  bun: std({ color: 0xd9a441, roughness: 0.7 }),
  patty: std({ color: 0x5a2e18, roughness: 0.85 }),
  cheese: std({ color: 0xffc93c, roughness: 0.5 }),
  tomato: std({ color: 0xd9382a, roughness: 0.35 }),
  lettuce: std({ color: 0x58a83c, roughness: 0.8 }),
  sesame: std({ color: 0xfff6d8, roughness: 0.6 }),
};

/** Kurva spiral datar (pusaran mie): radius mengecil ke tengah. */
function spiralCurve(cx, cz, y, turns = 2) {
  const pts = [];
  const N = 36;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const a = t * turns * Math.PI * 2;
    const r = 0.055 * (1 - t * 0.55);
    pts.push(new THREE.Vector3(cx + Math.cos(a) * r, y + 0.003 * Math.sin(a * 3), cz + Math.sin(a) * r));
  }
  return new THREE.CatmullRomCurve3(pts);
}

// ============================================================================
// 1. RAMEN — mangkuk biru tua d 0,24 m, kuah, 3 pusaran mie, 2 telur,
//    narutomaki, daun bawang, sumpit, sendok.
// ============================================================================
export function buildRamen() {
  const g = new THREE.Group();

  // mangkuk: profil Lathe naik-dinding-luar -> bibir -> turun-dinding-dalam
  const profile = [
    [0.001, 0], [0.07, 0], [0.098, 0.006], [0.116, 0.028], [0.12, 0.055],
    [0.12, 0.072], [0.116, 0.076], [0.11, 0.07], [0.106, 0.04],
    [0.098, 0.02], [0.001, 0.016],
  ].map((p) => new THREE.Vector2(p[0], p[1]));
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(profile, 24), M.bowlBlue);
  bowl.castShadow = true; bowl.receiveShadow = true; g.add(bowl);

  // kuah: cakram mengkilap di dalam mangkuk
  const broth = new THREE.Mesh(new THREE.CircleGeometry(0.105, 24), M.broth);
  put(broth, 0, 0.058, 0, 0, -Math.PI / 2);
  broth.castShadow = false; broth.receiveShadow = true; g.add(broth);

  // 3 pusaran mie (TubeGeometry sepanjang spiral datar)
  const noodleGeo = (cx, cz, y) => new THREE.TubeGeometry(spiralCurve(cx, cz, y), 48, 0.0055, 5, false);
  const noodles = [
    { geometry: noodleGeo(-0.035, 0.015, 0.06), matrix: trs(0, 0, 0) },
    { geometry: noodleGeo(0.032, -0.025, 0.06), matrix: trs(0, 0, 0) },
    { geometry: noodleGeo(0.005, 0.048, 0.062), matrix: trs(0, 0, 0) },
  ];
  mergeParts(noodles, M.noodle, g);

  // 2 belah telur: belahan menghadap atas (dome ke bawah, isi kuning di atas)
  const eggGeo = new THREE.SphereGeometry(0.02, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  eggGeo.rotateX(Math.PI); // balik: sisi datar menghadap atas
  const yolkGeo = new THREE.SphereGeometry(0.0085, 10, 6);
  yolkGeo.scale(1, 0.55, 1);
  for (const [ex, ez] of [[-0.058, -0.042], [0.06, 0.028]]) {
    const white = new THREE.Mesh(eggGeo, M.eggWhite);
    put(white, ex, 0.06, ez);
    white.castShadow = true; white.receiveShadow = true; g.add(white);
    const yolk = new THREE.Mesh(yolkGeo, M.yolk);
    put(yolk, ex, 0.0615, ez);
    yolk.castShadow = false; yolk.receiveShadow = true; g.add(yolk);
  }

  // narutomaki: silinder putih berbaring + cakram pink di atasnya
  const naruto = cyl(0.018, 0.018, 0.01, 16, M.narutoWhite);
  put(naruto, 0.002, 0.063, -0.058);
  g.add(naruto);
  const narutoPink = new THREE.Mesh(new THREE.CircleGeometry(0.009, 12), M.narutoPink);
  put(narutoPink, 0.002, 0.0682, -0.058, 0, -Math.PI / 2);
  narutoPink.castShadow = false; g.add(narutoPink);
  const narutoDot = cyl(0.003, 0.003, 0.002, 8, M.narutoPink);
  put(narutoDot, 0.002, 0.0685, -0.058);
  g.add(narutoDot);

  // daun bawang: 5 potong kecil hijau di atas kuah
  const onionGeo = new THREE.CylinderGeometry(0.0045, 0.0045, 0.004, 8);
  const onions = [
    [-0.02, -0.055], [0.045, 0.05], [-0.07, 0.02], [0.075, -0.01], [0.015, -0.005],
  ].map(([ox, oz]) => ({ geometry: onionGeo, matrix: trs(ox, 0.06, oz) }));
  mergeParts(onions, M.onion, g);

  // sumpit: 2 batang tipis cokelat, bersandar miring di bibir mangkuk
  const chopGeo = new THREE.CylinderGeometry(0.0032, 0.0022, 0.27, 6);
  mergeParts([
    { geometry: chopGeo, matrix: trs(0, 0.082, 0.008, 0, 0.28, Math.PI / 2) },
    { geometry: chopGeo, matrix: trs(0.004, 0.0855, 0.02, 0, 0.22, Math.PI / 2) },
  ], M.chopstick, g);

  // sendok kecil: mangkuk sendok pipih + gagang, bersandar di bibir mangkuk
  const spoonBowlGeo = new THREE.SphereGeometry(0.018, 10, 6);
  spoonBowlGeo.scale(1, 0.45, 1.35);
  const spoonHandleGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.1, 6);
  mergeParts([
    { geometry: spoonBowlGeo, matrix: trs(0.085, 0.072, -0.045, -0.35, 0.5, 0) },
    { geometry: spoonHandleGeo, matrix: trs(0.135, 0.088, -0.055, 0, 0.5, Math.PI / 2 - 0.3) },
  ], M.spoonWhite, g);

  return g;
}

// ============================================================================
// 2. BEEF — steak panggang di atas talenan kayu bundar (r 0,16 m).
// ============================================================================
export function buildBeef() {
  const g = new THREE.Group();

  // talenan kayu bundar
  const board = cyl(0.16, 0.16, 0.015, 28, M.boardWood);
  put(board, 0, 0.0075, 0);
  g.add(board);

  // steak: silinder dipipihkan, lonjong (skala x 1,25 / z 0,85) —
  // revisi: tebal 0,025 → 0,04 supaya terbaca daging, bukan piringan
  const steak = cyl(0.09, 0.095, 0.04, 24, M.steak);
  put(steak, 0, 0.035, 0);
  steak.scale.set(1.25, 1, 0.85);
  g.add(steak);

  // tepi lemak krem: torus di sekeliling steak, mengikuti lonjongnya
  const fat = new THREE.Mesh(new THREE.TorusGeometry(0.092, 0.008, 6, 28), M.fat);
  put(fat, 0, 0.035, 0, 0, Math.PI / 2);
  fat.scale.set(1.25, 0.85, 1);
  fat.castShadow = true; fat.receiveShadow = true; g.add(fat);

  // 3 garis grill gelap di atas steak — revisi 2: garis pertama
  // (diagonal ry 0,5 + offset sejajar arah garis) menumpuk jadi SATU
  // bar tebal (cek visual top-down). Sekarang garis memanjang sumbu z,
  // berjarak 0,05 sepanjang x — jelas 3 garis sejajar.
  const grillGeo = new THREE.BoxGeometry(0.014, 0.002, 0.13);
  mergeParts([
    { geometry: grillGeo, matrix: trs(-0.05, 0.056, 0, 0, 0, 0) },
    { geometry: grillGeo, matrix: trs(0, 0.056, 0, 0, 0, 0) },
    { geometry: grillGeo, matrix: trs(0.05, 0.056, 0, 0, 0, 0) },
  ], M.grillDark, g, true);

  return g;
}

// ============================================================================
// 3. BURGER — burger di piring putih kecil, tinggi total ~0,13 m.
// ============================================================================
export function buildBurger() {
  const g = new THREE.Group();

  // piring putih kecil
  const plate = cyl(0.11, 0.095, 0.012, 24, M.plateWhite);
  put(plate, 0, 0.006, 0);
  g.add(plate);

  // roti bawah (keemasan)
  const bunBottom = cyl(0.055, 0.055, 0.022, 20, M.bun);
  put(bunBottom, 0, 0.023, 0);
  g.add(bunBottom);

  // patty (cokelat gelap, sedikit lebih lebar dari roti)
  const patty = cyl(0.058, 0.058, 0.02, 20, M.patty);
  put(patty, 0, 0.044, 0);
  g.add(patty);

  // keju: kotak tipis kuning, diputar 45° supaya sudutnya menjulur keluar
  const cheese = box(0.105, 0.004, 0.105, M.cheese);
  put(cheese, 0, 0.056, 0, Math.PI / 4);
  g.add(cheese);

  // tomat (merah, mengkilap)
  const tomato = cyl(0.05, 0.05, 0.014, 20, M.tomato);
  put(tomato, 0, 0.065, 0);
  g.add(tomato);

  // selada: cakram tipis + 5 bola kecil di tepi (efek berombak)
  const lettuceDisc = cyl(0.06, 0.06, 0.004, 20, M.lettuce);
  put(lettuceDisc, 0, 0.074, 0);
  g.add(lettuceDisc);
  const ruffleGeo = new THREE.SphereGeometry(0.013, 8, 6);
  const ruffles = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    ruffles.push({ geometry: ruffleGeo, matrix: trs(Math.cos(a) * 0.055, 0.072, Math.sin(a) * 0.055) });
  }
  mergeParts(ruffles, M.lettuce, g);

  // roti atas: setengah bola diskala (dome keemasan)
  const bunTopGeo = new THREE.SphereGeometry(0.058, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  bunTopGeo.scale(1, 0.85, 1);
  const bunTop = new THREE.Mesh(bunTopGeo, M.bun);
  put(bunTop, 0, 0.076, 0);
  bunTop.castShadow = true; bunTop.receiveShadow = true; g.add(bunTop);

  // 8 biji wijen putih di atas dome (2 cincin sudut berbeda)
  const sesameGeo = new THREE.SphereGeometry(0.0045, 6, 4);
  const seeds = [];
  for (let i = 0; i < 8; i++) {
    const th = (i / 8) * Math.PI * 2;
    const ph = i % 2 ? 0.7 : 0.45; // sudut dari sumbu atas dome
    const x = 0.058 * Math.sin(ph) * Math.cos(th);
    const y = 0.076 + 0.0493 * Math.cos(ph);
    const z = 0.058 * Math.sin(ph) * Math.sin(th);
    seeds.push({ geometry: sesameGeo, matrix: trs(x, y, z) });
  }
  mergeParts(seeds, M.sesame, g, true);

  return g;
}
