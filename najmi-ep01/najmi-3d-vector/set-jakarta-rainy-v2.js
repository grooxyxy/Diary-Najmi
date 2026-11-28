// Set JAKARTA RAINY v2 — jalanan Jakarta malam hujan, style RAINY, TANPA karakter.
// Dibangun dengan KODE ASLI repo rainy-night-konbini (MIT) yang di-vendor ke
// ./vendor/rainy/ — struktur direktori, nama file, nama fungsi, dan label repo
// dipertahankan. File ini hanya MENGIMPORT dan MEMANGGIL builder repo itu,
// lalu menambahkan properti khas Jakarta dengan helper repo yang sama.
// Dipakai kalau URL punya ?set=jakarta-rainy-v2 (dengan ?style=rainy).
//
// Adaptasi Jakarta (di file vendor, BUKAN di repo asli):
//   vendor/rainy/src/world/layout.js  -> tinggi ground level (top 0, roadY 0,
//                                        walkY 0.13); semua footprint x/z repo
//                                        dipertahankan persis.
//   vendor/rainy/src/core/textures.js -> papan nama: INDOMARET (merah),
//                                        I/N/D/O + 24 JAM, BUKA / 24 JAM,
//                                        SATE / MADURA ASLI, poster Indonesia,
//                                        DINGIN, JL. SUDIRMAN.
//   vendor/rainy/src/world/materials.js -> kGreen = merah Indomaret 0xd42a2a,
//                                          kBlue = biru Indomaret 0x2456a8.
//
// Catatan neon: repo memakai glow() (MeshBasicMaterial, toneMapped false) untuk
// semua papan nama/neon. Converter style-rainy hanya mengubah MeshStandardMaterial
// -> MeshToonMaterial dan TIDAK menyentuh MeshBasicMaterial, jadi neon repo
// (dan neon Jakarta di file ini, yang juga memakai glow()) tetap terang setelah
// konversi. Itulah kenapa file ini memakai glow(), bukan emissiveMap — pola yang
// sama dengan repo aslinya.
import * as THREE from 'three';
import { SITE } from './vendor/rainy/src/world/layout.js';
import { box, boxSpan, ground, plane, cyl, sphere, group } from './vendor/rainy/src/core/utils.js';
import { toon, glow, additive } from './vendor/rainy/src/core/toon.js';
import { makeCanvas, tex } from './vendor/rainy/src/core/textures.js';
import { buildMaterials } from './vendor/rainy/src/world/materials.js';
import { buildStreet, buildPuddles } from './vendor/rainy/src/world/street.js';
import { buildKonbini, buildInteriorLights } from './vendor/rainy/src/world/konbini.js';
import { buildNeighbourhood, buildStreetFurniture, buildPowerLines, buildTrafficSignal } from './vendor/rainy/src/world/neighbourhood.js';
import { buildVendingMachine, buildUmbrellaStand, buildTrashBins } from './vendor/rainy/src/world/props.js';
import { createGlassRain } from './vendor/rainy/src/world/effects.js';

/* ------------------------------------------------------------------ *
 * Stub reflection untuk makeWet.
 * buildMaterials(reflection) meneruskan reflection ke makeWet(), yang
 * membaca reflection.uniforms.tWetReflect / uWetMatrix saat compile
 * (onBeforeCompile). Set ini tidak punya renderer/kamera, jadi tidak bisa
 * membuat PlanarReflection asli repo — sebagai gantinya stub ini memberi
 * tekstur biru-gelap kecil (genangan terbaca gelap, benar untuk malam)
 * dan matriks identitas. TIDAK ada reflection pass yang dijalankan.
 * ------------------------------------------------------------------ */
function makeStubReflection() {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 4;
  const x = c.getContext('2d');
  x.fillStyle = '#0a1226';
  x.fillRect(0, 0, 4, 4);
  return {
    uniforms: {
      tWetReflect: { value: new THREE.CanvasTexture(c) },
      uWetMatrix: { value: new THREE.Matrix4() },
    },
  };
}

/* ------------------------------------------------------------------ *
 * Tekstur kanvas baru untuk papan Jakarta (digambar di file ini,
 * dengan pola yang sama seperti textures.js repo).
 * ------------------------------------------------------------------ */
const FONT_EN = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';

// Papan neon: teks Latin di atas kanvas gelap + bingkai neon. Font mengecil
// otomatis sampai teks muat di dalam bingkai.
function neonTexture(text, sub, color) {
  const { c, ctx } = makeCanvas(512, 192);
  ctx.fillStyle = '#0c0e14';
  ctx.fillRect(0, 0, 512, 192);
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, 492, 172);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let fs = 84;
  ctx.font = `900 ${fs}px ${FONT_EN}`;
  while (ctx.measureText(text).width > 440 && fs > 28) {
    fs -= 4;
    ctx.font = `900 ${fs}px ${FONT_EN}`;
  }
  ctx.fillStyle = color;
  ctx.fillText(text, 256, sub ? 78 : 96);
  if (sub) {
    ctx.font = `700 40px ${FONT_EN}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(sub, 256, 148);
  }
  return tex(c);
}

// Papan neon siap pakai: plane dengan material glow() repo.
function neonSign(w, h, text, sub, color, x, y, z, rotY = 0) {
  const p = plane(w, h, glow(neonTexture(text, sub, color), 1), x, y, z, [0, rotY, 0]);
  p.userData.noOutline = true;
  return p;
}

// Awning merah-putih (garis vertikal) untuk Indomaret.
function awningTexture() {
  const { c, ctx } = makeCanvas(512, 128);
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#d42a2a' : '#f8f6ee';
    ctx.fillRect(i * 64, 0, 64, 128);
  }
  return tex(c);
}

// Billboard "JAKARTA — KOTA KITA": langit malam + siluet gedung + Monas.
function billboardTexture() {
  const { c, ctx } = makeCanvas(1024, 256);
  const bg = ctx.createLinearGradient(0, 0, 0, 256);
  bg.addColorStop(0, '#0d1530');
  bg.addColorStop(1, '#1a2a52');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1024, 256);
  // siluet gedung di dasar
  ctx.fillStyle = '#060a18';
  const blds = [[0, 215, 90, 41], [110, 200, 70, 56], [200, 220, 110, 36], [700, 205, 100, 51], [820, 195, 80, 61], [920, 220, 104, 36]];
  for (const [bx, by, bw, bh] of blds) ctx.fillRect(bx, by, bw, bh);
  // siluet Monas (kiri)
  ctx.fillRect(62, 130, 22, 126);
  ctx.beginPath();
  ctx.moveTo(58, 130);
  ctx.lineTo(73, 108);
  ctx.lineTo(88, 130);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f5b81e';
  ctx.beginPath();
  ctx.moveTo(73, 108);
  ctx.lineTo(79, 92);
  ctx.lineTo(73, 122);
  ctx.lineTo(67, 92);
  ctx.closePath();
  ctx.fill();
  // teks
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 88px ${FONT_EN}`;
  ctx.fillText('JAKARTA', 512, 92);
  ctx.fillStyle = '#f5b81e';
  ctx.font = `700 48px ${FONT_EN}`;
  ctx.fillText('— KOTA KITA —', 512, 178);
  return tex(c);
}

/* ------------------------------------------------------------------ *
 * Properti khas Jakarta — dibangun dengan helper repo yang sama
 * (box/boxSpan/cyl/plane/sphere/toon/glow), bukan helper kotak sederhana
 * dari file set v1. Repo tidak punya builder gerobak/bajaj/motor/halte/
 * masjid/warung, jadi bentuknya dibuat di sini dari sistem konstruksi repo.
 * ------------------------------------------------------------------ */

// Gerobak dorong (sate/bakso): badan kayu + atap + 2 roda + papan neon + bohlam.
function buildGerobak(M, x, z, rotY, signText, signSub, signColor) {
  const g = group('gerobak');
  g.position.set(x, SITE.walkY, z);
  g.rotation.y = rotY;
  const wood = toon({ color: 0x8a5a2a, rimStrength: 0.15 });
  const woodDark = toon({ color: 0x6b4423, rimStrength: 0.15 });
  // badan + meja
  g.add(box(1.6, 0.9, 0.9, wood, 0, 0.75, 0, { rounded: 0.03 }));
  g.add(box(1.7, 0.06, 1.0, woodDark, 0, 1.22, 0));
  // 4 tiang + atap
  for (const [px, pz] of [[-0.75, -0.4], [0.75, -0.4], [-0.75, 0.4], [0.75, 0.4]]) {
    g.add(cyl(0.03, 0.03, 0.9, 6, M.metalDark, px, 1.65, pz, { noOutline: true }));
  }
  g.add(box(1.8, 0.05, 1.1, toon({ color: 0x2a7a4a, rimStrength: 0.2 }), 0, 2.12, 0));
  // 2 roda (sumbu x)
  for (const s of [-1, 1]) {
    g.add(cyl(0.28, 0.28, 0.08, 12, M.metalDark, s * 0.85, 0.28, 0, { rot: [0, 0, Math.PI / 2] }));
  }
  // papan nama di depan
  const sign = plane(1.3, 0.45, glow(neonTexture(signText, signSub, signColor), 1), 0, 0.75, 0.48);
  sign.userData.noOutline = true;
  g.add(sign);
  // bohlam hangat + cahaya
  const bulb = sphere(0.06, glow(0xffc27a, 1.4), 0, 1.95, 0.3);
  bulb.userData.noOutline = true;
  g.add(bulb);
  const l = new THREE.PointLight(0xffa050, 1.2, 4, 1.8);
  l.position.set(0, 1.9, 0.5);
  g.add(l);
  return g;
}

// Bajaj oranye (roda tiga): badan rendah + kabin terbuka (4 tiang + atap
// kanvas) + kaca depan miring + jok + lampu depan.
function buildBajaj(M, x, z, rotY) {
  const g = group('bajaj');
  g.position.set(x, SITE.roadY, z);
  g.rotation.y = rotY;
  const orange = toon({ color: 0xe8642c, rimStrength: 0.2 });
  const dark = toon({ color: 0x1a1d24, rimStrength: 0.2 });
  // badan rendah
  g.add(box(1.3, 0.55, 2.0, orange, 0, 0.55, 0, { rounded: 0.08 }));
  // jok penumpang (terlihat lewat kabin terbuka)
  g.add(box(1.1, 0.12, 0.6, dark, 0, 0.85, -0.45, { rounded: 0.04 }));
  g.add(box(1.1, 0.45, 0.1, dark, 0, 1.05, -0.75, { rounded: 0.04 }));
  // 4 tiang kabin + atap kanvas
  for (const [px, pz] of [[-0.6, 0.55], [0.6, 0.55], [-0.6, -0.85], [0.6, -0.85]]) {
    g.add(cyl(0.03, 0.03, 0.75, 6, M.metalDark, px, 1.2, pz, { noOutline: true }));
  }
  g.add(box(1.35, 0.05, 1.7, dark, 0, 1.6, -0.15, { rounded: 0.02 }));
  // kaca depan miring (panel tipis, bukan kotak)
  const shield = plane(1.15, 0.55, toon({ color: 0x8fb8d8, rimStrength: 0.3 }), 0, 1.2, 0.72, [-0.5, 0, 0]);
  shield.userData.noOutline = true;
  g.add(shield);
  // roda depan (tunggal) + 2 roda belakang, sumbu x
  g.add(cyl(0.28, 0.28, 0.1, 10, dark, 0, 0.28, 1.05, { rot: [0, 0, Math.PI / 2] }));
  for (const s of [-1, 1]) {
    g.add(cyl(0.28, 0.28, 0.1, 10, dark, s * 0.65, 0.28, -0.75, { rot: [0, 0, Math.PI / 2] }));
  }
  const hl = sphere(0.09, glow(0xffe6b0, 1.5), 0, 0.7, 1.02);
  hl.userData.noOutline = true;
  g.add(hl);
  return g;
}

// Motor matic merah: 2 roda + badan + jok + setang + lampu depan.
function buildMotor(M, x, z, rotY) {
  const g = group('motor');
  g.position.set(x, SITE.walkY, z);
  g.rotation.y = rotY;
  const red = toon({ color: 0xc22a2a, rimStrength: 0.2 });
  const dark = toon({ color: 0x1a1d24, rimStrength: 0.2 });
  for (const wz of [-0.55, 0.55]) {
    g.add(cyl(0.26, 0.26, 0.09, 10, dark, 0, 0.26, wz, { rot: [0, 0, Math.PI / 2] }));
  }
  g.add(box(0.42, 0.35, 1.15, red, 0, 0.55, 0, { rounded: 0.08 }));
  g.add(box(0.4, 0.1, 0.55, dark, 0, 0.78, -0.35, { rounded: 0.04 }));
  g.add(box(0.4, 0.5, 0.08, red, 0, 0.85, 0.5, { rounded: 0.04 }));
  g.add(cyl(0.025, 0.025, 0.6, 6, M.metalDark, 0, 1.05, 0.45, { rot: [0, 0, Math.PI / 2], noOutline: true }));
  const hl = sphere(0.07, glow(0xffe6b0, 1.2), 0, 0.75, 0.58);
  hl.userData.noOutline = true;
  g.add(hl);
  return g;
}

// Halte TransJakarta: 2 tiang + atap biru + bangku + papan TRANSJAKARTA.
function buildHalte(M, x, z, rotY) {
  const g = group('halte');
  g.position.set(x, SITE.walkY, z);
  g.rotation.y = rotY;
  const benchWood = toon({ color: 0x8a6a3a, rimStrength: 0.15 });
  for (const s of [-1, 1]) {
    g.add(box(0.12, 2.4, 0.12, M.metalDark, s * 1.1, 1.2, 0));
  }
  g.add(box(2.6, 0.08, 1.2, toon({ color: 0x2456a8, rimStrength: 0.2 }), 0, 2.45, 0));
  g.add(box(2.0, 0.08, 0.45, benchWood, 0, 0.55, -0.25));
  g.add(box(2.0, 0.5, 0.06, benchWood, 0, 0.85, -0.45));
  const sign = plane(1.8, 0.5, glow(neonTexture('TRANSJAKARTA', 'HALTE', '#7ec8ff'), 1), 0, 2.0, 0.62);
  sign.userData.noOutline = true;
  g.add(sign);
  return g;
}

// Warung 24 Jam di mulut gang (x 6.5..9.5, z -1..2, depan menghadap +z):
// dinding bata + atap + terpal biru + etalase hangat + neon pink.
function buildWarung(M) {
  const g = group('warung');
  const x0 = 6.5, x1 = 9.5, z0 = -1, z1 = 2;
  const cx = (x0 + x1) / 2;
  const BY = 0;
  g.add(boxSpan(x0, x1, BY, BY + 2.6, z0, z0 + 0.15, M.brick));
  g.add(boxSpan(x0, x0 + 0.15, BY, BY + 2.6, z0, z1, M.brick));
  g.add(boxSpan(x1 - 0.15, x1, BY, BY + 2.6, z0, z1, M.brick));
  g.add(boxSpan(x0 - 0.2, x1 + 0.2, BY + 2.6, BY + 2.72, z0 - 0.2, z1 + 0.4, M.concreteDark, { rounded: 0.03 }));
  g.add(boxSpan(x0 - 0.2, x1 + 0.2, BY + 2.72, BY + 2.78, z1 + 0.1, z1 + 0.5, toon({ color: 0x2456a8, rimStrength: 0.2 })));
  g.add(boxSpan(x0 + 0.2, x1 - 0.2, BY, BY + 0.95, z1 - 0.5, z1 - 0.1, toon({ color: 0x6b4423, rimStrength: 0.15 })));
  const disp = plane(2.2, 1.0, glow(0xffc27a, 1.1), cx, BY + 1.7, z1 + 0.01);
  disp.userData.noOutline = true;
  g.add(disp);
  const sign = plane(2.4, 0.7, glow(neonTexture('WARUNG', '24 JAM', '#ff5fa2'), 1), cx, BY + 2.35, z1 + 0.06);
  sign.userData.noOutline = true;
  g.add(sign);
  const l = new THREE.PointLight(0xff5fa2, 1.0, 6, 1.8);
  l.position.set(cx, BY + 2.0, z1 + 1.0);
  g.add(l);
  return g;
}

// Masjid di ujung gang (celah antara backBlock dan backBlockE):
// aula + kubah hijau + menara 9 m + jendela menyala (fog:false) + neon MASJID.
function buildMosque(M) {
  const g = group('masjid');
  const bx = 8, bz = -12;
  const BY = 0;
  const cream = toon({ color: 0xe8e0c8, rimStrength: 0.15 });
  const green = toon({ color: 0x2f9e5f, rimStrength: 0.2 });
  // aula
  g.add(boxSpan(bx - 1.8, bx + 1.8, BY, BY + 3.0, bz - 1.7, bz + 1.7, cream));
  // kubah (bola setengah terbenam di atap aula)
  const dome = sphere(1.25, green, bx, BY + 3.0, bz);
  dome.scale.y = 0.75;
  g.add(dome);
  g.add(cyl(0.05, 0.05, 0.7, 6, toon({ color: 0xd4a437, rimStrength: 0.2 }), bx, BY + 4.0, bz, { noOutline: true }));
  // menara 9 m (tiang 0..7.5 + balkon + kerucut 7.5..9.0)
  const mx = 6.4, mz = -11.2;
  g.add(boxSpan(mx - 0.4, mx + 0.4, BY, BY + 7.5, mz - 0.4, mz + 0.4, cream));
  g.add(boxSpan(mx - 0.6, mx + 0.6, BY + 6.2, BY + 6.45, mz - 0.6, mz + 0.6, green));
  g.add(cyl(0.02, 0.42, 1.5, 8, green, mx, BY + 8.25, mz));
  // jendela menyala — Basic + fog:false supaya tetap terbaca lewat kabut
  const winMat = new THREE.MeshBasicMaterial({ color: 0xffe6a0, toneMapped: false, fog: false });
  for (const wx of [bx - 1.0, bx, bx + 1.0]) {
    const w = plane(0.5, 0.9, winMat, wx, BY + 1.6, bz + 1.71);
    w.userData.noOutline = true;
    g.add(w);
  }
  // neon MASJID di depan aula
  const sign = plane(2.2, 0.6, glow(neonTexture('MASJID', '', '#5fe08a'), 1), bx, BY + 2.5, bz + 1.71);
  sign.userData.noOutline = true;
  g.add(sign);
  // cahaya hijau masjid
  const l = new THREE.PointLight(0x2fbf71, 1.5, 10, 1.8);
  l.position.set(bx, BY + 4, bz + 2.5);
  g.add(l);
  return g;
}


export function buildJakartaRainy(scene) {
  scene.fog = new THREE.Fog(0x141a33, 10, 30);
  scene.add(new THREE.HemisphereLight(0x7d94e8, 0x1a1626, 0.55));
  const moon = new THREE.DirectionalLight(0xaebfff, 0.9);
  moon.position.set(-3, 8, 6);
  moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024);
  moon.shadow.camera.left = -12;
  moon.shadow.camera.right = 12;
  moon.shadow.camera.top = 12;
  moon.shadow.camera.bottom = -12;
  moon.shadow.camera.near = 0.5;
  moon.shadow.camera.far = 30;
  scene.add(moon);
  const fill = new THREE.DirectionalLight(0xffe0b3, 0.25);
  fill.position.set(4, 3, 8);
  scene.add(fill);
  const M = buildMaterials(makeStubReflection());
  const asphalt = ground(SITE.half * 2 - 0.08, SITE.half * 2 - 0.08, M.asphalt, 0, SITE.top, 0);
  asphalt.receiveShadow = true;
  scene.add(asphalt);
  scene.add(buildStreet(M));
  scene.add(buildPuddles(M));

  const konbini = buildKonbini(M);
  scene.add(konbini.group);
  for (const l of buildInteriorLights()) scene.add(l);
  scene.add(buildNeighbourhood(M));
  scene.add(buildStreetFurniture(M));
  scene.add(buildPowerLines(M));
  const sig = buildTrafficSignal(M);
  sig.update(15);
  scene.add(sig.group);
  scene.add(buildVendingMachine(M, 5.86, -0.9, Math.PI / 2)); scene.add(buildVendingMachine(M, 5.86, 0.32, Math.PI / 2));
  scene.add(buildUmbrellaStand(M, 2.75, 3.15)); scene.add(buildTrashBins(M, -4.5, 3.0, 0.1));
  const grA = createGlassRain(3.4, 2.4, -2.45, 1.75, 2.045); const grB = createGlassRain(3.4, 2.4, 2.45, 1.75, 2.045);
  grA.mesh.layers.set(0); grB.mesh.layers.set(0); scene.add(grA.mesh, grB.mesh);
  scene.add(buildWarung(M)); scene.add(buildMosque(M));
  scene.add(buildGerobak(M, -2.5, 4.5, 0.15, 'SATE', 'RP 10.000', '#ff5a7a')); scene.add(buildGerobak(M, -3.8, 6.2, -0.2, 'BAKSO', '', '#ff8a3d'));
  scene.add(buildBajaj(M, 2.2, 10.5, -0.5)); scene.add(buildMotor(M, -5.0, 5.0, 0.4)); scene.add(buildHalte(M, 4.8, 6.2, 0));
  scene.add(neonSign(2.2, 0.7, 'BAKSO', '', '#ff8a3d', -3.5, 3.0, -6.14)); scene.add(neonSign(2.2, 0.7, 'SATE', '', '#ff5a7a', 2.5, 3.0, -6.14));
  scene.add(neonSign(2.4, 0.7, 'APOTEK', '', '#5fe08a', 12.65, 3.0, 3.46));
  scene.add(box(4.6, 1.2, 0.08, M.metalDark, -2, 6.0, -6.2, { noOutline: true }));
  for (const px of [-3.8, -0.2]) scene.add(box(0.08, 1.3, 0.08, M.metalDark, px, 4.85, -6.18, { noOutline: true }));
  const bbMat = glow(billboardTexture(), 1); bbMat.fog = false;
  const bb = plane(4.4, 1.1, bbMat, -2, 6.0, -6.14); bb.userData.noOutline = true; scene.add(bb);
  const awn = plane(11.4, 1.3, toon({ map: awningTexture(), rimStrength: 0.1 }), 0, 2.62, 3.8, [-Math.PI / 2 + 0.45, 0, 0]); awn.userData.noOutline = true; scene.add(awn);
  for (const [lx, ly, lz] of [[-9.58, 4.3, 6.75], [3.92, 3.9, 6.75]]) { const pl = new THREE.PointLight(0xffb347, 1.0, 8, 1.8); pl.position.set(lx, ly, lz); scene.add(pl); }
}
