// ============================================================================
// set-props.js — MEJA DEMO PROPS: makanan + minuman + alat pancing/masak
// (28 Nov 2026, atas permintaan Master: mie ramen, beef, burger, cola,
//  air mineral, pancingan, ikan, peralatan memasak — semua sebagai builder
//  terpisah di props-makanan.js / props-minuman.js / props-alat.js,
//  disusun di satu meja kayu supaya bisa dicek sekaligus.)
//
// Meja 6,4 × 1,4 m (permukaan y 0,82), 7 item di atas meja + pancingan
// bersandar di ujung kanan meja. Shot per item via SET_CAMS di index.html
// (ramen/beef/burger/cola/air/ikan/masak/pancingan) + wide.
// Target: total set < 40.000 tris (8 item ~9.968 + meja/tanah).
// ============================================================================
import * as THREE from 'three';
import { countTriangles } from './vendor/buildings-detailed.js';
import { buildRamen, buildBeef, buildBurger } from './props-makanan.js';
import { buildCola, buildAirMineral } from './props-minuman.js';
import { buildPancingan, buildIkan, buildPeralatanMemasak } from './props-alat.js';

const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0, ...o });
function box(w, h, d, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = true; m.receiveShadow = true; return m;
}
function put(m, x, y, z, rx = 0, ry = 0, rz = 0) {
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz); return m;
}

// Permukaan meja
const TABLE_Y = 0.82;

export function buildProps(scene) {
  // --- cahaya (pola padang-aruna: hemisphere + matahari hangat) ---
  scene.add(new THREE.HemisphereLight(0xcfe5ff, 0x8a7a5a, 0.85));
  const sun = new THREE.DirectionalLight(0xfff2d8, 2.6);
  sun.position.set(6, 10, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -6; sun.shadow.camera.right = 6;
  sun.shadow.camera.top = 6; sun.shadow.camera.bottom = -6;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 30;
  sun.shadow.bias = -0.0001; sun.shadow.normalBias = 0.02;
  scene.add(sun);

  // --- tanah rumput ---
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(15, 48),
    std({ color: 0x6fae4e, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // --- meja kayu 6,4 × 1,4 m ---
  const wood = std({ color: 0x8a6a42, roughness: 0.85 });
  const woodDark = std({ color: 0x6e5233, roughness: 0.9 });
  const top = box(6.4, 0.08, 1.4, wood);
  put(top, 0, TABLE_Y - 0.04, 0); scene.add(top);
  for (const [x, z] of [[-3.0, -0.55], [3.0, -0.55], [-3.0, 0.55], [3.0, 0.55]]) {
    const leg = box(0.12, TABLE_Y - 0.08, 0.12, woodDark);
    put(leg, x, (TABLE_Y - 0.08) / 2, z); scene.add(leg);
  }

  // --- 7 item di atas meja (x, builder) ---
  const onTable = [
    [-2.7, buildRamen()],
    [-1.9, buildBeef()],
    [-1.1, buildBurger()],
    [-0.3, buildCola()],
    [0.5, buildAirMineral()],
    [2.4, buildPeralatanMemasak()],
  ];
  for (const [x, g] of onTable) {
    put(g, x, TABLE_Y, 0); scene.add(g);
  }
  // ikan di atas piring putih (piring ditambah di sini, bukan di builder)
  const plate = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.2, 0.02, 32),
    std({ color: 0xf5f2ea, roughness: 0.4 }));
  plate.castShadow = true; plate.receiveShadow = true;
  put(plate, 1.3, TABLE_Y + 0.01, 0); scene.add(plate);
  const fish = buildIkan();
  put(fish, 1.3, TABLE_Y + 0.02, 0, 0, 0.4); scene.add(fish);

  // --- pancingan bersandar di ujung kanan meja ---
  // Dasar di (3,85, 0, 0,45), batang melewati tepi meja (3,2, 0,82).
  const rod = buildPancingan();
  put(rod, 3.85, 0, 0.45, 0, 0, 0.671); scene.add(rod);

  console.log('TRIANGLES props =', countTriangles(scene));
}
