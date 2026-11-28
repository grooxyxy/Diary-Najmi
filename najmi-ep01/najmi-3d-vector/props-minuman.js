// ============================================================================
// props-minuman.js — PROP MINUMAN 3D Najmi (kaleng cola + botol air mineral)
// Skala meter dunia nyata; origin di tengah alas item (y=0 di dasar),
// menghadap +z. Dipakai: buildCola(), buildAirMineral() — masing-masing
// mengembalikan THREE.Group.
//
// Teknik (skill vasilias / threejs-aaa-graphics-builder):
//   - MeshStandardMaterial saja (converter Sakura mengubah ke Toon).
//   - TIDAK ada CanvasTexture — label/detail hanya lewat geometri.
//   - Part statis se-material digabung via mergeParts()/bake().
//   - Budget tiap item: MAKSIMAL 6.000 tris.
//   - TIDAK mengubah index.html / file lain. File ini standalone.
// ============================================================================
import * as THREE from 'three';
import { bake, trs } from './vendor/sakura/src/core/util.js';

const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0, ...o });

/** Gabung daftar {geometry, matrix} jadi SATU mesh (mergeGeometries). */
function mergeParts(list, mat, parent, noShadow = false) {
  if (!list.length) return null;
  const m = new THREE.Mesh(bake(list), mat);
  m.castShadow = !noShadow; m.receiveShadow = true;
  parent.add(m);
  return m;
}

// ---------- material kit (minuman) ----------
const M = {
  colaRed: std({ color: 0xc8102e, roughness: 0.35, metalness: 0.6 }),
  silver: std({ color: 0xd8dce0, roughness: 0.25, metalness: 0.9 }),
  labelWhite: std({ color: 0xf5f2ea, roughness: 0.6 }),
  bottleGlass: new THREE.MeshStandardMaterial({
    color: 0xbfd9ee, roughness: 0.15, metalness: 0,
    transparent: true, opacity: 0.5, depthWrite: false,
  }),
  water: new THREE.MeshStandardMaterial({
    color: 0x7cc4e8, roughness: 0.2, metalness: 0,
    transparent: true, opacity: 0.85,
  }),
  capBlue: std({ color: 0x1f66c8, roughness: 0.5 }),
  stripeBlue: std({ color: 0x7cc4e8, roughness: 0.5 }),
};

// ============================================================================
// buildCola() — kaleng cola merah (tinggi total ~0,122 m)
//   badan merah + tutup perak + tab pembuka + pita label putih +
//   logo lingkaran putih (inti merah) di depan.
// ============================================================================
export function buildCola() {
  const g = new THREE.Group();

  // badan kaleng merah (silinder r 0,033, tinggi 0,115)
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.115, 24), M.colaRed);
  body.position.y = 0.0575;
  body.castShadow = true; body.receiveShadow = true;
  g.add(body);

  // part perak (digabung): ring bawah + ring leher atas + tutup + tab + paku tab
  const silverParts = [
    { geometry: new THREE.CylinderGeometry(0.0295, 0.0295, 0.005, 24), matrix: trs(0, 0.0025, 0) },
    { geometry: new THREE.CylinderGeometry(0.031, 0.031, 0.004, 24), matrix: trs(0, 0.1135, 0) },
    { geometry: new THREE.CylinderGeometry(0.029, 0.029, 0.005, 24), matrix: trs(0, 0.117, 0) },
    { geometry: new THREE.BoxGeometry(0.014, 0.002, 0.007), matrix: trs(0, 0.1205, 0.004, 0, 0.3, 0) },
    { geometry: new THREE.CylinderGeometry(0.0032, 0.0032, 0.003, 12), matrix: trs(0, 0.120, -0.004) },
  ];
  mergeParts(silverParts, M.silver, g);

  // pita label putih (r sedikit lebih besar dari badan, tinggi 0,03)
  const labelParts = [
    { geometry: new THREE.CylinderGeometry(0.0336, 0.0336, 0.03, 24), matrix: trs(0, 0.06, 0) },
    // logo lingkaran putih di depan (cakram pipih, sumbu +z)
    { geometry: new THREE.CylinderGeometry(0.012, 0.012, 0.002, 20), matrix: trs(0, 0.06, 0.0346, Math.PI / 2, 0, 0) },
  ];
  mergeParts(labelParts, M.labelWhite, g);

  // inti merah di tengah logo putih (ciri cola)
  const logoCore = new THREE.Mesh(new THREE.CylinderGeometry(0.0065, 0.0065, 0.0015, 16), M.colaRed);
  logoCore.rotation.x = Math.PI / 2;
  logoCore.position.set(0, 0.06, 0.0363);
  logoCore.castShadow = false;
  g.add(logoCore);

  return g;
}

// ---------- profil lathe botol air mineral ----------
// Dasar r 0,035 -> badan -> bahu -> leher r 0,013, tinggi badan 0,196;
// tutup biru di atasnya sampai total ~0,21 m.
const BOTTLE_PROFILE = [
  [0.000, 0.000], [0.026, 0.000], [0.032, 0.003], [0.035, 0.010],
  [0.035, 0.098], [0.034, 0.122], [0.030, 0.143], [0.023, 0.160],
  [0.016, 0.173], [0.013, 0.182], [0.013, 0.190], [0.0145, 0.190],
  [0.0145, 0.196], [0.000, 0.196],
].map((p) => new THREE.Vector2(p[0], p[1]));

// Air di dalam: profil sama tapi sedikit lebih kecil, sampai bahu.
const WATER_PROFILE = [
  [0.000, 0.002], [0.024, 0.002], [0.029, 0.005], [0.032, 0.012],
  [0.032, 0.098], [0.031, 0.120], [0.027, 0.140], [0.020, 0.155],
  [0.000, 0.160],
].map((p) => new THREE.Vector2(p[0], p[1]));

// ============================================================================
// buildAirMineral() — botol air mineral (tinggi total ~0,21 m)
//   badan lathe transparan biru muda + air di dalam + tutup biru +
//   label putih + 2 garis biru muda.
// ============================================================================
export function buildAirMineral() {
  const g = new THREE.Group();

  // badan botol (lathe, biru muda transparan) — tanpa bayangan
  // (transparan + depthWrite false supaya air di dalam terbaca).
  const body = new THREE.Mesh(new THREE.LatheGeometry(BOTTLE_PROFILE, 24), M.bottleGlass);
  body.castShadow = false; body.receiveShadow = true;
  g.add(body);

  // air di dalam (lathe sedikit lebih kecil, biru, opacity 0,85)
  const water = new THREE.Mesh(new THREE.LatheGeometry(WATER_PROFILE, 24), M.water);
  water.castShadow = false; water.receiveShadow = false;
  g.add(water);

  // tutup biru (digabung): tutup + ring bawah tutup
  const capParts = [
    { geometry: new THREE.CylinderGeometry(0.015, 0.015, 0.02, 20), matrix: trs(0, 0.20, 0) },
    { geometry: new THREE.CylinderGeometry(0.0155, 0.0155, 0.005, 20), matrix: trs(0, 0.1925, 0) },
  ];
  mergeParts(capParts, M.capBlue, g);

  // label putih (r 0,036, tinggi 0,06, di tengah badan)
  const label = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.06, 24), M.labelWhite);
  label.position.y = 0.07;
  label.castShadow = true; label.receiveShadow = true;
  g.add(label);

  // 2 garis biru muda di tepi atas + bawah label (digabung)
  const stripeParts = [
    { geometry: new THREE.CylinderGeometry(0.0365, 0.0365, 0.008, 24), matrix: trs(0, 0.045, 0) },
    { geometry: new THREE.CylinderGeometry(0.0365, 0.0365, 0.008, 24), matrix: trs(0, 0.095, 0) },
  ];
  mergeParts(stripeParts, M.stripeBlue, g);

  return g;
}
