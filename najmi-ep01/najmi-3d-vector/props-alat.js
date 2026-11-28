// ============================================================================
// props-alat.js — PROPS ALAT PANCING + IKAN + PERALATAN MEMASAK, proyek Najmi
// (three.js 0.187.0, style Sakura toon).
//
// Tiga builder, masing-masing mengembalikan THREE.Group, origin di tengah
// alas item (y=0 di dasar), menghadap +z, skala meter dunia nyata:
//   buildPancingan()        — joran pancing BERDIRI vertikal (+y, ~2,1 m)
//   buildIkan()             — ikan utuh berbaring sepanjang sumbu x (~0,35 m)
//   buildPeralatanMemasak() — klaster peralatan masak sebaris sumbu x (~0,9 m)
//
// Teknik (skill threejs-aaa-graphics-builder + "Teknik Three.js" di
// SKILL.md Vasilias, pola set-padang-aruna.js):
//   - HANYA MeshStandardMaterial (converter Sakura mengubah ke Toon).
//     TANPA CanvasTexture — detail hanya lewat geometri.
//   - Part statis se-material digabung via mergeParts (bake/trs).
//   - Budget tiap item: MAKSIMAL 6.000 tris (terukur countTriangles).
// Standalone: TIDAK dipakai index.html (parent yang menaruhnya di scene).
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

// ---------- material kit (semua MeshStandardMaterial) ----------
const M = {
  rodGreen: std({ color: 0x2e5d33, roughness: 0.7 }),
  jointDark: std({ color: 0x2a2a2e, roughness: 0.6, metalness: 0.3 }),
  cork: std({ color: 0xc8a06a, roughness: 1 }),
  silver: std({ color: 0xc8ccd2, roughness: 0.3, metalness: 0.75 }),
  silverDark: std({ color: 0x8a8f96, roughness: 0.4, metalness: 0.6 }),
  line: std({ color: 0xd8d8d8, roughness: 0.5 }),
  floatRed: std({ color: 0xd93a2a, roughness: 0.5 }),
  floatWhite: std({ color: 0xf4f4f0, roughness: 0.5 }),
  fish: std({ color: 0x9fb8c8, roughness: 0.45, metalness: 0.35 }),
  fishDark: std({ color: 0x5a7285, roughness: 0.5, metalness: 0.3 }),
  fishBlack: std({ color: 0x141414, roughness: 0.4 }),
  steel: std({ color: 0xb8bcc0, roughness: 0.35, metalness: 0.65 }),
  steelDark: std({ color: 0x8a8f96, roughness: 0.4, metalness: 0.6 }),
  blade: std({ color: 0xd0d4d8, roughness: 0.25, metalness: 0.8 }),
  panBlack: std({ color: 0x232323, roughness: 0.55, metalness: 0.2 }),
  wood: std({ color: 0x8a6a42, roughness: 0.9 }),
  woodDark: std({ color: 0x5e4526, roughness: 0.95 }),
  handleDark: std({ color: 0x3a3a3a, roughness: 0.7 }),
};

// ============================================================================
// 1. JORAN PANCING — berdiri vertikal sepanjang +y, total ~2,1 m.
//    Origin di dasar joran (tutup ujung bawah gagang). Parent memiringkan.
// ============================================================================
export function buildPancingan() {
  const g = new THREE.Group();

  // --- gagang + reel seat (bawah, y 0–0,38) ---
  const grip = [];
  grip.push({ geometry: new THREE.CylinderGeometry(0.02, 0.02, 0.025, 12), matrix: trs(0, 0.0125, 0) }); // tutup ujung
  grip.push({ geometry: new THREE.CylinderGeometry(0.018, 0.018, 0.28, 12), matrix: trs(0, 0.16, 0) }); // gagang gabus
  mergeParts(grip, M.cork, g);
  const seat = cyl(0.014, 0.014, 0.08, 12, M.jointDark);
  put(seat, 0, 0.34, 0); g.add(seat);

  // --- reel (di bawah joran, y ~0,34; poros sepanjang z) ---
  const reel = [];
  reel.push({ geometry: new THREE.BoxGeometry(0.012, 0.05, 0.012), matrix: trs(0, 0.375, -0.012) }); // kaki reel
  reel.push({ geometry: new THREE.CylinderGeometry(0.024, 0.024, 0.05, 14), matrix: trs(0, 0.34, -0.038, Math.PI / 2, 0, 0) }); // badan reel
  reel.push({ geometry: new THREE.CylinderGeometry(0.017, 0.017, 0.056, 14), matrix: trs(0, 0.34, -0.038, Math.PI / 2, 0, 0) }); // spool
  reel.push({ geometry: new THREE.BoxGeometry(0.05, 0.008, 0.008), matrix: trs(0.045, 0.34, -0.066) }); // lengan putar
  mergeParts(reel, M.silver, g);
  const knob = cyl(0.008, 0.008, 0.022, 10, M.jointDark);
  put(knob, 0.074, 0.34, -0.066, 0, 0, Math.PI / 2); g.add(knob);

  // --- 3 segmen telescoping (hijau tua), sambungan cincin gelap ---
  const rod = [];
  rod.push({ geometry: new THREE.CylinderGeometry(0.0065, 0.008, 0.70, 12), matrix: trs(0, 0.73, 0) }); // segmen 1
  rod.push({ geometry: new THREE.CylinderGeometry(0.005, 0.0065, 0.55, 12), matrix: trs(0, 1.355, 0) }); // segmen 2
  rod.push({ geometry: new THREE.CylinderGeometry(0.004, 0.005, 0.47, 12), matrix: trs(0, 1.865, 0) }); // segmen 3
  mergeParts(rod, M.rodGreen, g);
  const joints = [];
  joints.push({ geometry: new THREE.CylinderGeometry(0.0075, 0.0075, 0.02, 12), matrix: trs(0, 1.08, 0) });
  joints.push({ geometry: new THREE.CylinderGeometry(0.006, 0.006, 0.02, 12), matrix: trs(0, 1.63, 0) });
  mergeParts(joints, M.jointDark, g);
  // ring pemandu ujung (torus kecil di puncak)
  const guide = new THREE.Mesh(new THREE.TorusGeometry(0.006, 0.0015, 6, 10), M.silverDark);
  put(guide, 0, 2.10, 0); guide.castShadow = true; g.add(guide);

  // --- senar: TubeGeometry dari ujung joran melengkung turun ~0,5 m ---
  const lineCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 2.10, 0),
    new THREE.Vector3(0.06, 1.95, 0.02),
    new THREE.Vector3(0.12, 1.75, 0.05),
    new THREE.Vector3(0.10, 1.60, 0.08),
  ]);
  const line = new THREE.Mesh(new THREE.TubeGeometry(lineCurve, 20, 0.0015, 5, false), M.line);
  line.castShadow = false; g.add(line);

  // --- pelampung merah-putih di senar (dua setengah bola, r 0,02) ---
  const floatTop = new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), M.floatRed);
  put(floatTop, 0.12, 1.76, 0.05); floatTop.castShadow = true; g.add(floatTop);
  const floatBot = new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.floatWhite);
  put(floatBot, 0.12, 1.76, 0.05); floatBot.castShadow = true; g.add(floatBot);

  // --- kail: busur torus kecil perak di ujung senar ---
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.0018, 6, 12, Math.PI * 1.35), M.silver);
  put(hook, 0.10, 1.585, 0.08, 0.3, -0.5, 0); hook.castShadow = true; g.add(hook);

  return g;
}

// ============================================================================
// 2. IKAN — seekor ikan utuh berbaring sepanjang sumbu x, panjang ~0,35 m.
//    Kepala di +x, ekor di -x, perut di y=0.
// ============================================================================
export function buildIkan() {
  const g = new THREE.Group();

  // --- badan: bola satuan diskala (0,18 / 0,06 / 0,09), perak-biru ---
  const body = [];
  body.push({ geometry: new THREE.SphereGeometry(1, 18, 12), matrix: trs(0, 0.06, 0, 0, 0, 0, 0.18, 0.06, 0.09) });
  mergeParts(body, M.fish, g);
  // --- punggung lebih gelap: elipsoid pipih menempel di atas badan ---
  const back = [];
  back.push({ geometry: new THREE.SphereGeometry(1, 14, 10), matrix: trs(-0.01, 0.082, 0, 0, 0, 0, 0.16, 0.045, 0.075) });
  mergeParts(back, M.fishDark, g);

  // --- ekor: dua kerucut pipih mengipas ke -x (ujung ke kiri-atas /
  // kiri-bawah; rz dihitung dari arah ujung kerucut +y) ---
  const tail = [];
  tail.push({ geometry: new THREE.ConeGeometry(0.05, 0.09, 4), matrix: trs(-0.215, 0.075, 0, 0, 0, 1.15, 1, 1, 0.18) });
  tail.push({ geometry: new THREE.ConeGeometry(0.05, 0.09, 4), matrix: trs(-0.215, 0.045, 0, 0, 0, Math.PI - 1.15, 1, 1, 0.18) });
  // --- sirip punggung: kerucut pipih tegak di atas, miring ke belakang ---
  tail.push({ geometry: new THREE.ConeGeometry(0.035, 0.07, 4), matrix: trs(0.01, 0.115, 0, 0, 0, 0.3, 1, 1, 0.18) });
  // --- sirip dada: dua kerucut pipih di sisi, miring ke bawah-belakang ---
  tail.push({ geometry: new THREE.ConeGeometry(0.025, 0.05, 4), matrix: trs(0.05, 0.035, 0.055, -0.9, 0, 2.6, 1, 1, 0.25) });
  tail.push({ geometry: new THREE.ConeGeometry(0.025, 0.05, 4), matrix: trs(0.05, 0.035, -0.055, 0.9, 0, 2.6, 1, 1, 0.25) });
  mergeParts(tail, M.fishDark, g);

  // --- mata: bola kecil hitam di tiap sisi kepala ---
  const eyes = [];
  eyes.push({ geometry: new THREE.SphereGeometry(0.008, 8, 6), matrix: trs(0.13, 0.075, 0.056) });
  eyes.push({ geometry: new THREE.SphereGeometry(0.008, 8, 6), matrix: trs(0.13, 0.075, -0.056) });
  // --- mulut: kotak kecil gelap di ujung kepala (disempitkan supaya
  // tidak menonjol keluar dari badan yang meruncing) ---
  eyes.push({ geometry: new THREE.BoxGeometry(0.012, 0.012, 0.024), matrix: trs(0.168, 0.048, 0) });
  mergeParts(eyes, M.fishBlack, g);

  // Badan 0,36 m + ekor = 0,436 m; diskala 0,8 supaya panjang total
  // ~0,35 m sesuai spesifikasi (skala terhadap origin, alas tetap y=0).
  g.scale.setScalar(0.8);
  return g;
}

// ============================================================================
// 3. PERALATAN MEMASAK — klaster sebaris sepanjang sumbu x, total ~0,9 m.
//    Origin di tengah klaster, semua alas di y=0. Urutan (kiri ke kanan):
//    panci | wajan (gagang ke +z) | spatula | sendok sayur | talenan+pisau.
// ============================================================================
export function buildPeralatanMemasak() {
  const g = new THREE.Group();

  // --- PANCI (x -0,33): badan baja + tutup + kenop + 2 gagang ---
  const pot = [];
  pot.push({ geometry: new THREE.CylinderGeometry(0.11, 0.11, 0.12, 20), matrix: trs(-0.33, 0.06, 0) }); // badan
  pot.push({ geometry: new THREE.SphereGeometry(0.105, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), matrix: trs(-0.33, 0.12, 0, 0, 0, 0, 1, 0.45, 1) }); // tutup pipih
  pot.push({ geometry: new THREE.BoxGeometry(0.03, 0.015, 0.03), matrix: trs(-0.44, 0.075, 0) }); // gagang kiri
  pot.push({ geometry: new THREE.BoxGeometry(0.03, 0.015, 0.03), matrix: trs(-0.22, 0.075, 0) }); // gagang kanan
  mergeParts(pot, M.steel, g);
  const potKnob = sph(0.014, M.steelDark, 8, 6);
  put(potKnob, -0.33, 0.172, 0); g.add(potKnob);

  // --- WAJAN (x -0,09): mangkuk pipih hitam + gagang panjang ke +z ---
  const pan = [];
  pan.push({ geometry: new THREE.CylinderGeometry(0.12, 0.10, 0.04, 20), matrix: trs(-0.09, 0.02, 0) }); // mangkuk
  pan.push({ geometry: new THREE.BoxGeometry(0.03, 0.015, 0.22), matrix: trs(-0.09, 0.025, 0.22) }); // gagang
  mergeParts(pan, M.panBlack, g);

  // --- SPATULA (x 0,05): bilah pipih + gagang kayu, terbaring sepanjang z ---
  const spatula = [];
  spatula.push({ geometry: new THREE.BoxGeometry(0.06, 0.005, 0.09), matrix: trs(0.05, 0.008, 0.055) }); // bilah baja
  mergeParts(spatula, M.steelDark, g);
  const spatHandle = box(0.02, 0.012, 0.13, M.wood);
  put(spatHandle, 0.05, 0.008, -0.055); g.add(spatHandle);

  // --- SENDOK SAYUR (x 0,13): kepala sendok pipih + gagang ke -z ---
  // (bola pipih penuh, bukan setengah bola — tidak ada masalah sisi
  // permukaan yang ter-cull dari atas)
  const ladle = [];
  ladle.push({ geometry: new THREE.SphereGeometry(0.035, 12, 8), matrix: trs(0.13, 0.02, 0.05, 0, 0, 0, 1, 0.5, 1) }); // kepala sendok
  mergeParts(ladle, M.steel, g);
  const ladleHandle = box(0.016, 0.01, 0.16, M.wood);
  put(ladleHandle, 0.13, 0.012, -0.06); g.add(ladleHandle);

  // --- TALENAN (x 0,30): papan kayu pipih 0,3 × 0,02 × 0,2 ---
  const board = box(0.30, 0.02, 0.20, M.wood);
  put(board, 0.30, 0.01, 0); g.add(board);
  // --- PISAU di atas talenan: bilah pipih miring + gagang gelap ---
  const knifeBlade = box(0.16, 0.004, 0.035, M.blade);
  put(knifeBlade, 0.32, 0.025, 0.02, -0.4); g.add(knifeBlade);
  const knifeHandle = box(0.09, 0.012, 0.025, M.handleDark);
  put(knifeHandle, 0.215, 0.026, -0.045, -0.4); g.add(knifeHandle);

  return g;
}
