// ============================================================================
// set-jakarta-sakura-v2.js — Bundaran HI, Jakarta siang, style SAKURA (v2)
//
// DIBANGUN DENGAN KODE ASLI repo sakura-crossing (MIT) — BUKAN dari nol.
// Modul repo di-vendor verbatim (nama file + fungsi + label ASLI) ke:
//   vendor/sakura/src/core/    (palette, toon, util, outline, textures)
//   vendor/sakura/src/world/   (street, ground, buildings, trees, props,
//                               vehicles, train, railway, planet, hills,
//                               landform, lakeform)
// File ini HANYA memanggil builder repo itu dan mengadaptasi parameternya
// ke Jakarta (warna, papan nama, ukuran). TIDAK ada proyeksi planet
// (planet.js tidak pernah dipanggil — scene kita tanah datar).
// Label repo ASLI dipertahankan di mana pun (mis. destination board kereta,
// plat halte bus). Teks Jakarta hanya untuk papan nama besar yang harus
// terbaca sebagai Jakarta (stasiun, billboard, fascia ruko, masjid) —
// itu adaptasi "papan nama" yang diminta, ditulis oleh painter kecil
// jakartaSignTex di bawah (bukan builder geometri).
//
// Kontrak lampu (agar converter style sakura bekerja):
//   hemisphere 0x8fa3ff/0x2a2416, matahari 0xffe0b3 (2.0),
//   bounce 0xaebfff (0.9), background + fog 0x9fc8e8 (25, 80) — kabut diperlebar
//   karena kamera v2 ditarik mundur (Monas di ~38 m harus tetap terbaca).
// TANPA karakter/Najmi — latar saja.
// ============================================================================
import * as THREE from 'three';

import { PAL } from './vendor/sakura/src/core/palette.js';
import { cel, flat } from './vendor/sakura/src/core/toon.js';
import { box, cyl, rngKit } from './vendor/sakura/src/core/util.js';
import { setOutlineResolution } from './vendor/sakura/src/core/outline.js';
import { tactileTex, petalTex } from './vendor/sakura/src/core/textures.js';
import { makeStrip } from './vendor/sakura/src/world/street.js';
import { groundMats, pad, laneLine } from './vendor/sakura/src/world/ground.js';
import { makeHouse } from './vendor/sakura/src/world/buildings.js';
import { buildSakura, buildGrove, buildBamboo, buildShrubs } from './vendor/sakura/src/world/trees.js';
import { makePole, makeWires, makePlanter, makeCone, makeGuardrail, makeBins, makeBench, makeMirror, makeBicycle, makeCrates } from './vendor/sakura/src/world/props.js';
import { makeVehicle, makeBusStop } from './vendor/sakura/src/world/vehicles.js';
import { buildTrain } from './vendor/sakura/src/world/train.js';
import { RAIL_TOP } from './vendor/sakura/src/world/railway.js';

// ---------- papan nama Jakarta (painter label — bukan builder geometri) ----
// Repo sendiri melukis semua papan namanya dengan canvas (textures.js);
// painter ini hanya mengganti TEKS-nya menjadi Jakarta.
function jakartaSignTex(text, sub, bg, fg, w = 512, h = 160) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = 'bold 64px Arial, sans-serif';
  g.fillText(text, w / 2, sub ? h * 0.36 : h / 2);
  if (sub) { g.font = 'bold 34px Arial, sans-serif'; g.fillText(sub, w / 2, h * 0.74); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
// Panel papan nama (material flat repo, seperti papan nama repo sendiri).
function signPlane(scene, text, sub, bg, fg, w, h, x, y, z, ry) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
    flat({ color: 0xffffff, map: jakartaSignTex(text, sub, bg, fg), cache: false }));
  m.position.set(x, y, z);
  m.rotation.y = ry;
  scene.add(m);
  return m;
}

// ---------- lampu (kontrak converter sakura) -------------------------------
function addLights(scene) {
  scene.background = new THREE.Color(0x9fc8e8);
  scene.fog = new THREE.Fog(0x9fc8e8, 25, 80);
  scene.add(new THREE.HemisphereLight(0x8fa3ff, 0x2a2416, 1.1));
  const sun = new THREE.DirectionalLight(0xffe0b3, 2.0);
  sun.position.set(4, 10, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -16; sun.shadow.camera.right = 16;
  sun.shadow.camera.top = 16; sun.shadow.camera.bottom = -16;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 40;
  scene.add(sun);
  const bounce = new THREE.DirectionalLight(0xaebfff, 0.9);
  bounce.position.set(-4, 5, -3);
  scene.add(bounce);
}

// ---------- ctx stub (kontrak builder repo) --------------------------------
// Builder repo mengharapkan ctx { scene, root, add, collide, platform,
// cut, groundAt, interact, update }. Di scene kita tanahnya datar
// (groundAt = 0) dan tidak ada pemain (collide/platform/cut = no-op).
function makeCtx(scene, root) {
  return {
    scene, root,
    add: (o) => { root.add(o); return o; },
    collide: () => {}, platform: () => {}, cut: () => {},
    groundAt: (x, z) => 0,
    interact: () => {}, update: () => {},
  };
}

// ---------- tanah, jalan, trotoar, zebra (repo: makeStrip + groundMats) ----
function buildGround(ctx) {
  const m = groundMats();
  const Z0 = -24, Z1 = 14; // bentang jalan (z)
  // alas rumput 60x44, pusat z=-5
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(60, 44), m.grass);
  grass.rotation.x = -Math.PI / 2;
  grass.position.set(0, -0.02, -5);
  grass.receiveShadow = true;
  ctx.add(grass);

  // jalan aspal: setengah lebar 4.0 (2 lajur Jakarta; repo ROAD_HALF = 3.15)
  ctx.add(new THREE.Mesh(
    makeStrip({ z0: Z0, z1: Z1, a: (z) => ({ x: -4.0, y: 0.012 }), b: (z) => ({ x: 4.0, y: 0.012 }) }),
    m.asphalt));
  // garis tepi putih
  for (const s of [-1, 1]) {
    ctx.add(new THREE.Mesh(
      makeStrip({ z0: Z0, z1: Z1, a: (z) => ({ x: s * 2.72, y: 0.024 }), b: (z) => ({ x: s * 2.86, y: 0.024 }) }),
      m.white));
  }
  // trotoar + tepi luar + muka kerb + paving taktil (cara repo buildStreet)
  const matTactile = cel({ color: 0xffffff, bands: 2, map: tactileTex(), tint: 0x9a7f4a });
  for (const s of [-1, 1]) {
    ctx.add(new THREE.Mesh(
      makeStrip({ z0: Z0, z1: Z1, a: (z) => ({ x: s * 4.0, y: 0.135 }), b: (z) => ({ x: s * 5.6, y: 0.135 }) }),
      m.sidewalk));
    ctx.add(new THREE.Mesh(
      makeStrip({ z0: Z0, z1: Z1, a: (z) => ({ x: s * 5.6, y: 0.135 }), b: (z) => ({ x: s * 5.82, y: 0.135 }) }),
      m.sidewalkAlt));
    // muka kerb vertikal di x = ±4.0
    ctx.add(new THREE.Mesh(
      makeStrip({ z0: Z0, z1: Z1, a: (z) => ({ x: s * 4.0, y: 0.0 }), b: (z) => ({ x: s * 4.0, y: 0.135 }), flip: s < 0 }),
      m.curb));
    // paving taktil kuning (repo: uv [1, panjang/0.34])
    ctx.add(new THREE.Mesh(
      makeStrip({ z0: Z0, z1: Z1, a: (z) => ({ x: s * 4.44, y: 0.15 }), b: (z) => ({ x: s * 4.78, y: 0.15 }), uv: [1, 112] }),
      matTactile));
  }
  // zebra di z = ±3.2: 5 palang putih per penyeberangan
  for (const zc of [-3.2, 3.2]) {
    for (let i = -2; i <= 2; i++) {
      ctx.add(box(4.8, 0.02, 0.7, m.white, 0, 0.022, zc + i * 0.9));
    }
  }
  // garis tengah kuning putus-putus (repo laneLine, dash 1.2)
  const matYellow = cel({ color: 0xf5be2a, bands: 2, tint: 0x7d74a0 });
  laneLine(ctx, { axis: 'z', from: -12, to: -4, at: 0, y: 0.02, dash: 1.2, mat: matYellow });
  laneLine(ctx, { axis: 'z', from: 4, to: 7, at: 0, y: 0.02, dash: 1.2, mat: matYellow });
  // petak rumput di trotoar (tempat pohon)
  for (const [gx, gz] of [[-5.2, 1.6], [5.2, 1.6], [-5.2, -4.6], [5.2, -4.6]]) {
    ctx.add(box(2.4, 0.06, 2.4, m.grass, gx, 0.165, gz));
  }
}

// ---------- bundaran (pulau bundar di titik origin) -------------------------
function buildRoundabout(ctx) {
  const m = groundMats();
  // pulau: silinder batu + tutup rumput (repo box/cyl + groundMats)
  ctx.add(cyl(1.5, 1.6, 0.18, 24, m.stone, 0, 0.09, 0));
  const top = new THREE.Mesh(new THREE.CircleGeometry(1.5, 24), m.grass);
  top.rotation.x = -Math.PI / 2;
  top.position.set(0, 0.185, 0);
  ctx.add(top);
}

// ---------- Monas (komposisi repo box/cyl + cel; dimensi = v1 terverifikasi) -
// Posisi (0, 0, -20), sumbu x=0 dibiarkan lowong agar Monas jadi fokus.
function buildMonas(ctx) {
  const m = groundMats();
  const g = new THREE.Group();
  g.position.set(0, 0, -20);
  const matStone = m.stoneWarm;
  const matShaft = cel({ color: 0xe8e2d4, bands: 3, tint: 0x6f6790 });
  const matGold = cel({ color: 0xd4af37, bands: 2, tint: 0x6f6790, emissive: 0xd4af37, emissiveIntensity: 0.55 });
  g.add(box(4.5, 0.3, 4.5, matStone, 0, 0.15, 0));        // plaza bawah
  g.add(box(3.2, 0.5, 3.2, matStone, 0, 0.55, 0));        // plaza atas
  g.add(cyl(0.85, 1.05, 0.9, 8, matStone, 0, 1.25, 0));   // cawan
  const shaft = cyl(0.22, 0.55, 8.8, 4, matShaft, 0, 6.1, 0); // tiang 4-sisi 8.8 m
  shaft.rotation.y = Math.PI / 4;
  g.add(shaft);
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 8), matGold);
  flame.position.set(0, 10.9, 0);
  g.add(flame);
  const tongue = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.7, 8), matGold);
  tongue.position.set(0, 11.4, 0);
  g.add(tongue);
  ctx.add(g);
}

// ---------- masjid (komposisi repo; tidak ada builder masjid di repo) -------
// Posisi (-8.6, 0, -6.5), menghadap +x (ke jalan). Kubah hijau + 2 menara.
function buildMosque(ctx) {
  const g = new THREE.Group();
  g.position.set(-8.6, 0, -6.5);
  const matCream = cel({ color: PAL.wallCream, bands: 3, tint: 0x6f6790 });
  const matGreen = cel({ color: 0x2e7d5b, bands: 3, tint: 0x5b6f8c });
  const matGold = cel({ color: 0xd4af37, bands: 2, tint: 0x6f6790, emissive: 0xd4af37, emissiveIntensity: 0.4 });
  const matDoor = cel({ color: 0x1e4a3a, bands: 3, tint: 0x5b6f8c });
  g.add(box(4.2, 3.2, 4.5, matCream, 0, 1.6, 0));          // aula
  g.add(box(4.6, 0.25, 4.9, matGreen, 0, 3.3, 0));         // atap
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), matGreen);
  dome.position.set(0, 3.4, 0);
  g.add(dome);
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), matGold);
  finial.position.set(0, 5.0, 0);
  g.add(finial);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.35, 8), matGold);
  tip.position.set(0, 5.2, 0);
  g.add(tip);
  // 2 menara di sisi depan (menghadap jalan)
  for (const mz of [-2.0, 2.0]) {
    g.add(cyl(0.22, 0.3, 6.5, 8, matCream, 2.4, 3.25, mz));
    g.add(box(0.7, 0.12, 0.7, matGreen, 2.4, 4.2, mz));
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.7, 8), matGreen);
    cap.position.set(2.4, 6.85, mz);
    g.add(cap);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), matGold);
    ball.position.set(2.4, 7.25, mz);
    g.add(ball);
  }
  // pintu + papan nama di muka depan (+x)
  g.add(box(1.0, 1.8, 0.1, matDoor, 2.12, 0.9, 0));
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), matGold);
  knob.position.set(2.2, 0.9, 0.35);
  g.add(knob);
  // gerbang: 2 tiang + bola emas
  for (const gz of [-2.3, 2.3]) {
    g.add(box(0.25, 1.2, 0.25, matCream, 2.4, 0.6, gz));
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), matGold);
    ball.position.set(2.4, 1.3, gz);
    g.add(ball);
  }
  ctx.add(g);
  // papan nama masjid (painter Jakarta), menghadap +x ke jalan
  signPlane(ctx.scene, 'MASJID AL-IKHLAS', '', '#2e7d5b', '#ffffff', 2.2, 0.5, -6.44, 2.6, -6.5, Math.PI / 2);
}

// ---------- ruko (repo makeHouse — 2 lantai, atap flat/gable, jendela, AC) -
// Posisi & label dari v1; dinding/atap dipilih dari indeks WALLS/ROOFS repo.
// Fascia papan nama Jakarta ditempel di muka depan (y=2.9, di antara lantai).
function buildRuko(ctx) {
  const rukos = [
    // kiri, menghadap +x (ke jalan)
    { x: -6.2, z: -1.0, face: 'x+', wall: 1, roof: 0, roofKind: 'flat', seed: 101, label: 'WARUNG', sub: '', bg: '#2e7d5b', fg: '#ffffff' },
    { x: -6.2, z: -11, face: 'x+', wall: 2, roof: 1, roofKind: 'gable', seed: 102, label: 'TOKO', sub: '', bg: '#1e5aa8', fg: '#ffffff' },
    // kanan, menghadap -x (ke jalan)
    { x: 6.2, z: 2.5, face: 'x-', wall: 6, roof: 3, roofKind: 'flat', seed: 103, label: 'APOTEK', sub: '', bg: '#1e7d32', fg: '#ffffff' },
    { x: 6.2, z: -2, face: 'x-', wall: 0, roof: 0, roofKind: 'flat', seed: 104, label: 'INDOMARET', sub: '24 JAM', bg: '#d42a2a', fg: '#ffffff' },
    { x: 6.2, z: -6.5, face: 'x-', wall: 3, roof: 2, roofKind: 'gable', seed: 105, label: 'BAKSO', sub: '', bg: '#c22e2e', fg: '#ffe9a8' },
    { x: 6.2, z: -11, face: 'x-', wall: 7, roof: 1, roofKind: 'flat', seed: 106, label: 'SATE', sub: '', bg: '#8a5a2a', fg: '#ffffff' },
  ];
  for (const r of rukos) {
    ctx.add(makeHouse({
      x: r.x, z: r.z, w: 4.5, d: 4, floors: 2, face: r.face,
      seed: r.seed, wall: r.wall, roof: r.roof, roofKind: r.roofKind,
      porch: false, shutters: true,
    }));
    // fascia di muka depan (x = ±3.95), menghadap jalan
    const fx = r.x + (r.face === 'x+' ? 2.28 : -2.28);
    const ry = r.face === 'x+' ? Math.PI / 2 : -Math.PI / 2;
    signPlane(ctx.scene, r.label, r.sub, r.bg, r.fg, 3.2, 0.55, fx, 2.9, r.z, ry);
  }
  // awning merah-putih Indomaret (stripes repo box + cel, menjorok ke jalan)
  const matRed = cel({ color: 0xd42a2a, bands: 3, tint: 0x6f6790 });
  const matWhite = cel({ color: 0xf5f2e8, bands: 3, tint: 0x6f6790 });
  for (let i = 0; i < 6; i++) {
    ctx.add(box(0.9, 0.08, 0.75, i % 2 ? matWhite : matRed, 3.5, 2.6, -2 + (i - 2.5) * 0.77));
  }
  ctx.add(box(0.06, 0.06, 4.6, cel({ color: PAL.metalDark, bands: 3, tint: 0x5c5680 }), 3.05, 2.56, -2));
}

// ---------- menara + siluet jauh (repo box/cyl + cel, kabut yang memudarkan)
function buildTowers(ctx) {
  const towers = [
    { x: -12, z: -18, w: 6, h: 13, d: 6, wall: PAL.wallGray },
    { x: -5, z: -21, w: 5, h: 15, d: 5, wall: PAL.wallBlue },
    { x: 6, z: -19, w: 6, h: 11, d: 6, wall: PAL.wallBeige },
    { x: 13, z: -17, w: 5, h: 14, d: 5, wall: PAL.wallTea },
    { x: -6, z: -24, w: 8, h: 17, d: 6, wall: PAL.wallSage },
    { x: 8, z: -23, w: 7, h: 16, d: 6, wall: PAL.wallWhite },
  ];
  const matRoof = cel({ color: PAL.roofSlate, bands: 3, tint: 0x514b70 });
  const matMetal = cel({ color: PAL.metalDark, bands: 3, tint: 0x5c5680 });
  for (const t of towers) {
    const mat = cel({ color: t.wall, bands: 3, tint: 0x6f6790 });
    ctx.add(box(t.w, t.h, t.d, mat, t.x, t.h / 2, t.z));
    ctx.add(box(t.w + 0.2, 0.3, t.d + 0.2, matRoof, t.x, t.h + 0.15, t.z));
    ctx.add(cyl(0.03, 0.05, 1.5, 6, matMetal, t.x, t.h + 1.0, t.z));
  }
  // siluet gedung jauh (polos, kabut yang memudarkan)
  const silM = cel({ color: 0x7a8aa8, bands: 2, tint: 0x6f6790 });
  for (const [x, z, w, h, d] of [[-17, -26, 7, 12, 5], [17, -26, 6, 10, 5]]) {
    ctx.add(box(w, h, d, silM, x, h / 2, z));
  }
}

// ---------- MRT layang + kereta 3 gerbong (repo buildTrain) ------------------
// Viaduk di z=-12 (tiang + balok + rel, dimensi v1). Kereta repo adalah
// EMU 3 gerbong (pitch 20.1 m, lebar 2.86 m) — JAUH lebih detail dari
// kereta kotak v1: interior, pintu, bogie, pantograf, papan tujuan.
// PENTING: buildTrain repo mengira kereta berjalan di ekuator planet
// (group.visible=false sampai planetize()). Kita TIDAK memanggil
// planetize()/update() — cukup visible=true + posisi di atas rel:
//   rel atas y=5.39, roda bawah = group.y + RAIL_TOP (0.30) → group.y=5.09.
function buildMRT(ctx) {
  const m = groundMats();
  const matConcrete = m.concreteMid;
  const matMetal = cel({ color: PAL.metal, bands: 3, tint: 0x666090 });
  const matRail = cel({ color: 0x4a4a52, bands: 3, tint: 0x5c5680 });
  // tiang viaduk (repo cyl)
  for (let x = -9; x <= 9; x += 3) {
    ctx.add(cyl(0.35, 0.45, 4.6, 10, matConcrete, x, 2.3, -12));
  }
  // balok + rel
  ctx.add(box(20, 0.7, 1.1, matConcrete, 0, 4.95, -12));
  ctx.add(box(20, 0.08, 0.12, matRail, 0, 5.35, -12.35));
  ctx.add(box(20, 0.08, 0.12, matRail, 0, 5.35, -11.65));
  // kawat kontak di atas pantograf (repo CONTACT_WIRE_Y = 4.88 di atas rel)
  ctx.add(box(40, 0.04, 0.04, matMetal, 0, 5.09 + 4.88, -12));
  // kereta repo (3 gerbong), diletakkan di rel — tanpa proyeksi planet
  const train = buildTrain(ctx);
  train.group.visible = true;
  train.group.position.set(0, 5.39 - RAIL_TOP, -12);
  // peron stasiun di depan rel (repo pad: top = y + h = 0.3)
  pad(ctx, { x: 0, z: -10.5, w: 13, d: 1.6, h: 0.3, y: 0, mat: m.concreteMid });
  // pagar pengaman di tepi depan peron (repo makeGuardrail)
  ctx.add(makeGuardrail({ x: 0, z: -9.65, y: 0.3, ry: 0, len: 12 }));
  // tiang + papan nama stasiun MRT
  ctx.add(cyl(0.05, 0.07, 1.6, 8, matMetal, -4.5, 0.8, -10.4));
  signPlane(ctx.scene, 'MRT JAKARTA', 'STASIUN BUNDARAN', '#1e5aa8', '#ffffff', 2.4, 0.75, -4.5, 1.6, -10.4, 0);
}

// ---------- billboard (papan nama Jakarta, posisi v1) ------------------------
function buildBillboards(ctx) {
  const matBack = cel({ color: 0x2e2e33, bands: 3, tint: 0x5c5680 });
  // "JAKARTA — KOTA KITA" di atap ruko SATE
  ctx.add(box(0.12, 1.7, 3.4, matBack, 6.2, 6.4, -11));
  signPlane(ctx.scene, 'JAKARTA', 'KOTA KITA', '#1e5aa8', '#ffffff', 3.2, 1.6, 6.12, 6.4, -11, -Math.PI / 2);
  ctx.add(box(0.1, 0.5, 0.1, matBack, 6.2, 5.4, -12.2));
  ctx.add(box(0.1, 0.5, 0.1, matBack, 6.2, 5.4, -9.8));
  // "SATE AYAM — MADURA ASLI" di peron MRT
  ctx.add(box(2.0, 1.0, 0.1, matBack, 3.0, 2.2, -10.5));
  signPlane(ctx.scene, 'SATE AYAM', 'MADURA ASLI', '#c22e2e', '#ffe9a8', 1.9, 0.9, 3.0, 2.2, -10.44, 0);
  ctx.add(box(0.08, 1.8, 0.08, matBack, 2.2, 0.9, -10.5));
  ctx.add(box(0.08, 1.8, 0.08, matBack, 3.8, 0.9, -10.5));
}

// ---------- kehidupan jalan: angkot, bajaj, gerobak, tiang, halte, properti -
// Angkot = repo makeVehicle kind 'minibus' (bus kota 6.3 m, pintu + skirt bus).
// Bajaj & gerobak tidak ada builder-nya di repo → dikomposisi dari helper
// repo (box/cyl + cel/flat), sama seperti repo menyusun kendaraannya sendiri.
function buildStreetLife(ctx) {
  // --- angkot (minibus biru repo) + papan rute kuning di atap ---
  const angkot = new THREE.Group();
  angkot.add(makeVehicle({ kind: 'minibus', color: 0x2f7fd0, x: 0, z: 0, y: 0, ry: 0 }));
  const matYellow = cel({ color: 0xffd23f, bands: 3, tint: 0x6f6790 });
  const boardTex = jakartaSignTex('ANGKOT', '', '#2e6fc2', '#ffffff', 256, 96);
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.9), [
    matYellow, matYellow, matYellow, matYellow,
    flat({ color: 0xffffff, map: boardTex, cache: false }),
    flat({ color: 0xffffff, map: boardTex, cache: false }),
  ]);
  board.position.set(2.2, 2.78, 0); // lokal +x = hidung
  angkot.add(board);
  angkot.position.set(-2.7, 0, -1.5);
  angkot.rotation.y = -Math.PI / 2 + 0.15; // hidung ke +z (ke arah kamera)
  ctx.add(angkot);

  // --- bajaj (komposisi repo) ---
  const bajajJakarta = (x, z, ry, color) => {
    const g = new THREE.Group();
    const matBody = cel({ color, bands: 3, tint: 0x6f6790 });
    const matDark = cel({ color: 0x2a3a55, bands: 3, tint: 0x4a4a92 });
    const matBlack = cel({ color: 0x1a1a1a, bands: 2, tint: 0x5c5680 });
    const matLamp = cel({ color: 0xfff2c0, bands: 2, tint: 0x6f6790, emissive: 0xffe9a8, emissiveIntensity: 0.5 });
    g.add(box(1.1, 0.7, 1.9, matBody, 0, 0.55, 0));
    g.add(box(1.0, 0.55, 1.1, matDark, 0, 1.15, -0.2));
    const canopy = box(1.05, 0.06, 1.0, matBlack, 0, 1.5, 0.35);
    canopy.rotation.x = 0.25;
    g.add(canopy);
    const bar = cyl(0.03, 0.03, 0.7, 6, matBlack, 0, 1.05, 0.85);
    bar.rotation.z = Math.PI / 2;
    g.add(bar);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), matLamp);
    lamp.position.set(0, 0.6, 0.98);
    g.add(lamp);
    for (const [wx, wz] of [[0, 0.95], [-0.5, -0.7], [0.5, -0.7]]) {
      const w = cyl(0.28, 0.28, 0.18, 10, matBlack, wx, 0.28, wz);
      w.rotation.z = Math.PI / 2;
      g.add(w);
    }
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    ctx.add(g);
  };
  bajajJakarta(-2.6, 3.6, 0.5, 0xe87a2a);  // oranye
  bajajJakarta(2.6, 3.2, -0.5, 0x2e6fc2); // biru

  // --- gerobak (komposisi repo) + label Jakarta ---
  const gerobakJakarta = (x, z, ry, color, label) => {
    const g = new THREE.Group();
    const matBody = cel({ color, bands: 3, tint: 0x6f6790 });
    const matWood = cel({ color: 0x8a6b4a, bands: 3, tint: 0x6f6790 });
    const matGlass = flat({ color: 0xbfd9e8 });
    const matBlack = cel({ color: 0x1a1a1a, bands: 2, tint: 0x5c5680 });
    const matUmb = cel({ color: 0xc22e2e, bands: 3, tint: 0x6f6790 });
    g.add(box(1.1, 0.55, 0.7, matBody, 0, 0.75, 0));
    g.add(box(1.15, 0.08, 0.75, matWood, 0, 1.06, 0));
    g.add(box(1.0, 0.35, 0.6, matGlass, 0, 1.28, 0));
    g.add(cyl(0.03, 0.03, 1.6, 6, matWood, 0, 1.9, 0));
    const umb = new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.45, 10), matUmb);
    umb.position.set(0, 2.75, 0);
    g.add(umb);
    for (const wx of [-0.55, 0.55]) {
      const w = cyl(0.26, 0.26, 0.12, 10, matBlack, wx, 0.26, 0);
      w.rotation.z = Math.PI / 2;
      g.add(w);
    }
    g.add(box(0.08, 0.5, 0.08, matWood, -0.4, 0.25, 0.32));
    g.add(box(0.08, 0.5, 0.08, matWood, 0.4, 0.25, 0.32));
    const lp = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.3),
      flat({ color: 0xffffff, map: jakartaSignTex(label, '', '#f5efe2', '#c22e2e', 256, 96), cache: false }));
    lp.position.set(0, 0.78, 0.38);
    g.add(lp);
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    ctx.add(g);
  };
  gerobakJakarta(-4.0, 1.4, Math.PI / 2, 0xc22e2e, 'BAKSO');
  gerobakJakarta(3.7, 0.6, -Math.PI / 2, 0x2e7d5b, 'SATE');

  // --- tiang listrik PLN (repo makePole) + kabel menjuntai (repo makeWires) -
  const poleDefs = [
    { x: -4.8, z: -7, lamp: false, transformer: true, armDir: 1, seed: 201 },
    { x: 4.8, z: -7, lamp: false, transformer: false, armDir: -1, seed: 202 },
    { x: -4.8, z: -1, lamp: true, transformer: false, armDir: 1, seed: 203 },
    { x: 4.8, z: -1, lamp: true, transformer: false, armDir: -1, seed: 204 },
    { x: -4.8, z: 4, lamp: false, transformer: false, armDir: 1, seed: 205 },
    { x: 4.8, z: 4, lamp: false, transformer: false, armDir: -1, seed: 206 },
  ];
  for (const p of poleDefs) {
    ctx.add(makePole({ x: p.x, z: p.z, h: 7.5, seed: p.seed, lamp: p.lamp, transformer: p.transformer, armDir: p.armDir }));
  }
  const wireTop = 6.9; // puncak tiang 7.5 dikurangi 0.6 (jangkar kabel repo)
  makeWires(ctx, [
    { points: [new THREE.Vector3(-4.8, wireTop, -7), new THREE.Vector3(4.8, wireTop, -7)], sag: 0.55 },
    { points: [new THREE.Vector3(-4.8, wireTop, -1), new THREE.Vector3(4.8, wireTop, -1)], sag: 0.55 },
    { points: [new THREE.Vector3(-4.8, wireTop, 4), new THREE.Vector3(4.8, wireTop, 4)], sag: 0.55 },
    { points: [new THREE.Vector3(-4.8, wireTop, -7), new THREE.Vector3(-4.8, wireTop, -1), new THREE.Vector3(-4.8, wireTop, 4)], sag: 0.5 },
    { points: [new THREE.Vector3(4.8, wireTop, -7), new THREE.Vector3(4.8, wireTop, -1), new THREE.Vector3(4.8, wireTop, 4)], sag: 0.5 },
  ]);

  // --- halte TransJakarta (repo makeBusStop + shelter komposisi repo) -------
  // Posisi (-5.2, -15) di trotoar kiri, di antara MRT dan Monas.
  const hx = -5.2, hz = -15;
  ctx.add(makeBusStop({ x: hx, z: hz, y: 0.135, ry: Math.PI / 2 }));
  pad(ctx, { x: hx, z: hz, w: 1.6, d: 3.0, h: 0.1, y: 0.135, mat: groundMats().concreteMid });
  const matPost = cel({ color: PAL.metalDark, bands: 3, tint: 0x5c5680 });
  for (const [px, pz] of [[-0.7, -1.4], [0.7, -1.4], [-0.7, 1.4], [0.7, 1.4]]) {
    ctx.add(cyl(0.05, 0.05, 2.4, 6, matPost, hx + px, 0.235 + 1.2, hz + pz));
  }
  ctx.add(box(1.8, 0.08, 3.2, cel({ color: PAL.roofTeal, bands: 3, tint: 0x514b70 }), hx, 2.68, hz));
  ctx.add(box(0.05, 1.8, 3.0, flat({ color: 0x9fc8e8 }), hx - 0.78, 1.35, hz)); // kaca belakang
  ctx.add(makeBench({ x: hx, z: hz, y: 0.235, ry: Math.PI / 2 }));
  signPlane(ctx.scene, 'TRANSJAKARTA', 'HALTE', '#1e5aa8', '#ffffff', 2.4, 0.5, hx + 0.95, 2.5, hz, Math.PI / 2);

  // --- properti jalan repo ---
  ctx.add(makePlanter({ x: -5.0, z: 6.5, y: 0.135, r: 0.3, flower: true, seed: 301, n: 5 }));
  ctx.add(makePlanter({ x: 5.0, z: 6.5, y: 0.135, r: 0.3, flower: true, seed: 302, n: 5 }));
  ctx.add(makePlanter({ x: -5.0, z: -9.5, y: 0.135, r: 0.3, flower: true, seed: 303, n: 5 }));
  ctx.add(makePlanter({ x: 5.0, z: -9.5, y: 0.135, r: 0.3, flower: true, seed: 304, n: 5 }));
  ctx.add(makeCone({ x: 3.2, z: 4.5, y: 0, ry: 0.3 }));
  ctx.add(makeCone({ x: -3.2, z: -4.5, y: 0, ry: -0.4 }));
  ctx.add(makeBins({ x: 5.0, z: -3.2, y: 0.135, ry: Math.PI }));
  ctx.add(makeCrates({ x: -5.0, z: 0.5, y: 0.135, n: 3, seed: 305, ry: 0.2 }));
  ctx.add(makeBicycle({ x: -5.0, z: -14.0, y: 0.235, ry: Math.PI / 2, lean: 0.12, color: 0x3f6f9c }));
  ctx.add(makeBicycle({ x: -5.0, z: -16.0, y: 0.235, ry: Math.PI / 2, lean: -0.1, color: 0x8a4a3a }));
  ctx.add(makeMirror({ x: -3.7, z: 3.8, y: 0, ry: Math.PI / 4 }));
}

// ---------- pohon, semak, kelopak, awan (builder repo) -----------------------
// Kamboja = buildSakura dengan tone 0 (0xfff0f4, putih pucat) — repo tidak
// punya kamboja, tapi tone kanopinya yang paling dekat; tabebuya = tone
// default repo (pink). Mangga = buildGrove (kanopi hijau lebar).
function buildTrees(ctx) {
  // 2 kamboja (tone 0) + 2 tabebuya pink (tone default)
  buildSakura(ctx, [
    { x: 2.3, z: 0, y: 0.18, scale: 0.9, tone: 0, seed: 501 },   // kamboja di tepi bundaran
    { x: -5.2, z: -4.6, y: 0.135, scale: 0.95, tone: 0, seed: 502 }, // kamboja
    { x: 5.2, z: -4.6, y: 0.135, scale: 1.0, seed: 503 },        // tabebuya
    { x: -5.2, z: 4.5, y: 0.135, scale: 1.05, seed: 504 },       // tabebuya
  ]);
  // 2 pohon mangga rindang (repo buildGrove)
  buildGrove(ctx, [
    { x: 5.2, z: 1.6, y: 0.135, scale: 0.9, tone: 0, seed: 601 },
    { x: -5.2, z: 1.6, y: 0.135, scale: 0.9, tone: 0, seed: 602 },
  ]);
  // 1 rumpun bambu tropis (repo buildBamboo)
  buildBamboo(ctx, [
    { x: 5.2, z: 4.5, y: 0.135, seed: 701, n: 7, scale: 0.8, spread: 0.8 },
  ]);
  // semak di petak rumput (repo buildShrubs)
  buildShrubs(ctx, [
    { x: -5.2, z: 1.6, y: 0.19, seed: 801, count: 3, r: 0.4, spread: 1.2 },
    { x: 5.2, z: -4.6, y: 0.19, seed: 802, count: 3, r: 0.4, spread: 1.2 },
    { x: -5.2, z: -4.6, y: 0.19, seed: 803, count: 2, r: 0.35, spread: 1.0 },
  ]);
  // kelopak kamboja melayang di sekitar bundaran (tekstur repo petalTex)
  const rng = rngKit(1234);
  const N = 90, pp = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pp[i * 3] = 2.3 + rng.range(-1, 1) * 2.5;
    pp[i * 3 + 1] = 0.4 + rng.range(0, 1) * 3.2;
    pp[i * 3 + 2] = rng.range(-1, 1) * 2.5;
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  ctx.add(new THREE.Points(pg, new THREE.PointsMaterial({
    size: 0.13, map: petalTex(), transparent: true, opacity: 0.85,
    color: 0xffe9f2, depthWrite: false, sizeAttenuation: true,
  })));
  // awan siang (repo flat, tanpa fog supaya tetap terang)
  const cloudM = flat({ color: 0xffffff, cache: false });
  cloudM.fog = false;
  for (const [x, y, z, r] of [[-8, 11, -16, 2.2], [3, 12, -18, 2.8], [9, 10.5, -15, 1.8], [-2, 11.5, -20, 2.4]]) {
    const c = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), cloudM);
    c.scale.y = 0.38;
    c.position.set(x, y, z);
    ctx.add(c);
  }
}

// ---------- export ----------------------------------------------------------
// setOutlineResolution(960, 960) WAJIB sebelum builder repo memakai
// hullOutline (makeHouse) — resolusi default repo 1920x1080 akan membuat
// garis tinta salah aspek di still 960x960.
export function buildJakartaSakura(scene) {
  setOutlineResolution(960, 960);
  addLights(scene);
  const root = new THREE.Group();
  scene.add(root);
  const ctx = makeCtx(scene, root);
  buildGround(ctx);
  buildRoundabout(ctx);
  buildMonas(ctx);
  buildMosque(ctx);
  buildRuko(ctx);
  buildTowers(ctx);
  buildMRT(ctx);
  buildBillboards(ctx);
  buildStreetLife(ctx);
  buildTrees(ctx);
}
