// ============================================================================
// set-buildings-detailed.js — PROTOTIPE jalan dengan bangunan detail.
// Satu jalan (sumbu z): 3 ruko detail di sisi kiri (menghadap +x),
// 3 rumah kampung detail di sisi kanan (menghadap -x), plus pohon +
// lampu jalan. TANPA karakter. Hanya untuk perbandingan sebelum/sesudah —
// BELUM diintegrasikan ke set-jakarta-*-v2.js (menunggu pilihan moon).
// ============================================================================
import * as THREE from 'three';
import { buildDetailedRuko, buildDetailedKampung, countTriangles } from './vendor/buildings-detailed.js';

export function buildBuildingsDetailed(scene) {
  // ---------- lampu (kontrak hex sama dengan set lain, siang) ----------
  scene.background = new THREE.Color(0x9fc8e8);
  scene.fog = new THREE.Fog(0x9fc8e8, 18, 48);
  scene.add(new THREE.HemisphereLight(0x9fc8ff, 0x8a7a5a, 1.1));
  const sun = new THREE.DirectionalLight(0xffe0b3, 2.0);
  sun.position.set(4, 10, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -16; sun.shadow.camera.right = 16;
  sun.shadow.camera.top = 16; sun.shadow.camera.bottom = -16;
  sun.shadow.camera.far = 40;
  scene.add(sun);
  const bounce = new THREE.DirectionalLight(0xaebfff, 0.9);
  bounce.position.set(-4, 5, -3);
  scene.add(bounce);

  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0, ...o });
  const grassMat = std({ color: 0x6a9a4a });
  const asphaltMat = std({ color: 0x3a3a40 });
  const sidewalkMat = std({ color: 0x9a948c });
  const lineMat = std({ color: 0xf5f2e8 });
  const yellowMat = std({ color: 0xf5be2a });

  function box(w, h, d, mat, x, y, z, ry = 0) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    m.receiveShadow = true; m.castShadow = true;
    scene.add(m);
    return m;
  }

  // ---------- tanah + jalan (sumbu z) + trotoar + zebra ----------
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(36, 30), grassMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.02, 0);
  ground.receiveShadow = true;
  scene.add(ground);
  box(6, 0.04, 26, asphaltMat, 0, 0.0, 0); // jalan
  for (const s of [-1, 1]) box(1.6, 0.14, 26, sidewalkMat, s * 3.8, 0.07, 0); // trotoar
  for (let z = -11; z <= 11; z += 2.4) box(0.18, 0.02, 1.2, yellowMat, 0, 0.03, z); // garis tengah
  for (const zc of [-3.2, 3.2]) { // zebra
    for (let i = -2; i <= 2; i++) box(4.8, 0.02, 0.7, lineMat, 0, 0.03, zc + i * 0.9);
  }

  // ---------- 3 ruko detail (kiri, menghadap +x ke jalan) ----------
  const rukoDefs = [
    { z: -6, label: 'WARUNG', sub: '', signBg: '#2e7d5b', seed: 7, floors: 3 },
    { z: 0, label: 'TOKO', sub: '', signBg: '#1e5aa8', seed: 8, floors: 3 },
    { z: 6, label: 'APOTEK', sub: '', signBg: '#1e7d32', seed: 9, floors: 2 },
  ];
  for (const r of rukoDefs) {
    const g = buildDetailedRuko({
      signText: r.label, signBg: r.signBg, seed: r.seed, floors: r.floors,
      x: -6.8, z: r.z, ry: Math.PI / 2, // muka depan (+z lokal) -> +x (ke jalan)
    });
    scene.add(g);
    console.log('TRIANGLES ruko detail', r.label, '=', g.userData.triangles);
  }

  // ---------- 3 kampung detail (kanan, menghadap -x ke jalan) ----------
  const kampungDefs = [
    { z: -6, wallTint: 0xffffff, seed: 11 },
    { z: 0, wallTint: 0xffe8c8, seed: 12 },
    { z: 6, wallTint: 0xd8e8d0, seed: 13 },
  ];
  for (const k of kampungDefs) {
    const g = buildDetailedKampung({
      wallTint: k.wallTint, seed: k.seed,
      x: 6.8, z: k.z, ry: -Math.PI / 2, // muka depan (+z lokal) -> -x (ke jalan)
    });
    scene.add(g);
    console.log('TRIANGLES kampung detail =', g.userData.triangles);
  }

  // ---------- pohon + lampu jalan sederhana ----------
  function tree(x, z, s) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.8, 8), std({ color: 0x5a3a22 }));
    trunk.position.set(x, 0.9 * s, z);
    trunk.castShadow = true;
    scene.add(trunk);
    for (const [dx, dy, dz, r] of [[0, 2.3, 0, 1.1], [0.6, 1.9, 0.3, 0.7], [-0.5, 2.0, -0.3, 0.75]]) {
      const c = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), std({ color: 0x4a7a2a }));
      c.position.set(x + dx * s, dy * s, z + dz * s);
      c.castShadow = true;
      scene.add(c);
    }
  }
  tree(-5.2, -10, 1.0);
  tree(5.2, 10, 1.1);
  tree(-5.2, 10, 0.9);

  function lamp(x, z) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.4, 8), std({ color: 0x33383f }));
    pole.position.set(x, 1.7, z);
    pole.castShadow = true;
    scene.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.9), std({ color: 0x33383f }));
    arm.position.set(x, 3.35, z + (x < 0 ? 0.4 : -0.4));
    scene.add(arm);
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffe9a8, emissiveIntensity: 0.9 }),
    );
    bulb.position.set(x, 3.28, z + (x < 0 ? 0.8 : -0.8));
    scene.add(bulb);
  }
  // Lampu di ujung jalan (bukan di tengah) supaya tiangnya tidak
  // memotong garis pandang close-up ruko/kampung.
  lamp(-3.4, -9);
  lamp(3.4, 9);

  console.log('TRIANGLES set buildings-detailed (tanpa karakter) =', countTriangles(scene));
}
