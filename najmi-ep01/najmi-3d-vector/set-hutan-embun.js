// ============================================================================
// set-hutan-embun.js — HUTAN EMBUN, Lembah Aruna
// (dunia fantasi Aurelia, Denah Dunia Fantasi di gambar denah Master).
//
// Hutan pinus berkabut ±350 m dari Titik Kedatangan — lokasi berikutnya
// setelah Padang Aruna, di ujung Jalur Utama. Najmi berdiri di jalur
// di tepi hutan (0,0,2) menghadap ke dalam hutan (-z = utara, ke
// dalam hutan). Origin (0,0,0) = tepi hutan; +z ke arah kamera/selatan
// (arah padang); -z semakin dalam ke hutan.
//
// TANPA PORTAL / TELEPORTER / GERBANG / LINGKARAN CAHAYA / PILAR
// CAHAYA / PECAHAN MELAYANG — keputusan Master 28 Nov 2026. Tidak ada
// elemen portal sama sekali di set ini. (Cahaya matahari menembus
// tajuk = silinder translusen hangat yang miring + redup, BUKAN pilar
// portal: ada 6, tersebar, warna hangat, opacity ~0,06.)
//
// Peta denah -> staging:
//   Jalur Utama (lanjutan) .... jalan tanah berliku selatan -> utara,
//                               masuk hutan, lewat lapangan kecil
//   Lapangan kecil (clearing) . di (0,-14): batang tumbang + tunggul
//                               + 3 batu penanda — titik fokus komposisi
//   Pinus lebat ............... ~100 pinus, 3 lapis kedalaman (dekat /
//                               tengah / siluet jauh) + 4 pinus raksasa
//   Lantai hutan .............. pakis rimbun, lumut, jamur (beberapa
//                               berpendar lembut), batu berlumut, akar
//                               menonjol, daun gugur
//   Kabut embun ............... fog padat + bidang kabut translusen +
//                               lembar kabut dekat tanah + kunang-kunang
//
// Teknik (skill threejs-aaa-graphics-builder):
//   - Silhouette dulu: deret pinus gelap + kabut adalah bentuk pertama
//     yang terbaca; pakis/jamur/kunang-kunang mengisi sesudahnya.
//   - Authored forms: ConeGeometry (pinus + pakis), CylinderGeometry
//     (batang + tunggul + batang tumbang), SphereGeometry (lumut +
//     batu penanda), PlaneGeometry di-displace (tanah 80×80),
//     ribbon kustom (jalan tanah) dari CatmullRomCurve3.
//   - Material kit bersama (MeshStandardMaterial saja — converter
//     Sakura mengubahnya ke Toon; BUKAN MeshToonMaterial langsung).
//   - Pengulangan di-merge via bake()/trs() (pinus, pakis, rumput,
//     jamur, batu, daun); seed deterministik via rngKit.
//   - Lighting: matahari hangat rendah dari selatan-timur (menembus
//     tajuk) + HemisphereLight sejuk redup; bayangan 2048.
//
// TIDAK mengubah file set lain / karakter / style. Dipakai:
// buildHutanEmbun(scene). Target 60–90k tris (terukur di log
// TRIANGLES hutan-embun).
// ============================================================================
import * as THREE from 'three';
import { rngKit, bake, trs, sstep } from './vendor/sakura/src/core/util.js';
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
function plane(w, h, mat) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.receiveShadow = true; return m;
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
  floor: std({ color: 0x3a6b33, roughness: 1 }),
  moss: std({ color: 0x2a4d26, roughness: 1 }),
  mossLight: std({ color: 0x4a7a3a, roughness: 1 }),
  fern: std({ color: 0x2a5a2a, roughness: 1 }),
  fernLight: std({ color: 0x3a7038, roughness: 1 }),
  dirt: std({ color: 0x8a6a48, roughness: 1 }),
  stone: std({ color: 0x7d7d78, roughness: 0.95 }),
  stoneDark: std({ color: 0x55554f, roughness: 0.95 }),
  stoneOld: std({ color: 0x6a6558, roughness: 1 }),
  wood: std({ color: 0x7a5a38, roughness: 0.9 }),
  woodDark: std({ color: 0x4e3a22, roughness: 0.95 }),
  bark: std({ color: 0x4a3220, roughness: 1 }),
  barkLight: std({ color: 0x5d4028, roughness: 1 }),
  pine: std({ color: 0x1e4a2e, roughness: 1 }),
  pineMid: std({ color: 0x244f33, roughness: 1 }),
  pineFar: std({ color: 0x16381f, roughness: 1 }),
  leaf: std({ color: 0x8a6a3a, roughness: 1 }),
  leafRed: std({ color: 0x9a5a30, roughness: 1 }),
  mushroomStem: std({ color: 0xe8dcc0, roughness: 0.9 }),
  mushroomRed: std({ color: 0xc23a2e, roughness: 0.7 }),
  mushroomGlow: std({ color: 0x4a9a6a, emissive: 0x7fe0a0, emissiveIntensity: 0.9, roughness: 0.6 }),
  firefly: std({ color: 0xd8ff9a, emissive: 0xd8ff9a, emissiveIntensity: 2.2, roughness: 0.4 }),
  logEnd: std({ color: 0xd8b878, roughness: 0.9 }),
  mist: new THREE.MeshStandardMaterial({ color: 0xdfe8dc, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false, roughness: 1 }),
  mistGround: new THREE.MeshStandardMaterial({ color: 0xdfe8dc, transparent: true, opacity: 0.04, side: THREE.DoubleSide, depthWrite: false, roughness: 1 }),
  shaft: new THREE.MeshStandardMaterial({ color: 0xfff2cc, emissive: 0xffe8b0, emissiveIntensity: 0.5, transparent: true, opacity: 0.04, side: THREE.DoubleSide, depthWrite: false, roughness: 1 }),
  cloud: std({ color: 0xffffff, roughness: 1, emissive: 0xffffff, emissiveIntensity: 0.25 }),
  windowWarm: std({ color: 0xffc46b, emissive: 0xffb45e, emissiveIntensity: 1.4, roughness: 0.4 }),
};

// ---------- tekstur kanvas ----------
/** Lantai hutan: lumut gelap + bercak daun gugur cokelat + bintik terang. */
function floorTex() {
  const t = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#3a6b33'; g.fillRect(0, 0, w, h);
    const r = rngKit(61);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = r.pick(['rgba(42,77,38,0.4)', 'rgba(74,122,58,0.35)', 'rgba(30,60,32,0.35)']);
      const d = r.range(4, 24);
      g.beginPath(); g.arc(r.range(0, w), r.range(0, h), d, 0, Math.PI * 2); g.fill();
    }
    for (let i = 0; i < 160; i++) { // bercak daun gugur cokelat
      g.fillStyle = r.pick(['rgba(138,106,58,0.35)', 'rgba(154,90,48,0.3)', 'rgba(120,90,45,0.3)']);
      const d = r.range(6, 22);
      g.beginPath(); g.arc(r.range(0, w), r.range(0, h), d, 0, Math.PI * 2); g.fill();
    }
    for (let i = 0; i < 120; i++) { // helai lumut gelap
      g.strokeStyle = 'rgba(28,56,31,0.5)'; g.lineWidth = 2;
      const x = r.range(0, w), y = r.range(0, h);
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + r.range(-4, 4), y - r.range(4, 10)); g.stroke();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(14, 14);
  return t;
}

/** Tanah jalan: cokelat + kerikil + jejak roda samar (pola padang). */
function dirtTex() {
  const t = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#8a6a48'; g.fillRect(0, 0, w, h);
    const r = rngKit(62);
    for (let i = 0; i < 500; i++) {
      g.fillStyle = r.pick(['rgba(105,80,48,0.4)', 'rgba(160,130,90,0.35)', 'rgba(80,60,38,0.35)']);
      const d = r.range(2, 7);
      g.beginPath(); g.arc(r.range(0, w), r.range(0, h), d, 0, Math.PI * 2); g.fill();
    }
    g.strokeStyle = 'rgba(80,60,38,0.5)'; g.lineWidth = 5; // 2 jejak roda
    for (const x of [70, 186]) {
      g.beginPath(); g.moveTo(x, 0);
      for (let y = 0; y <= h; y += 16) g.lineTo(x + r.range(-4, 4), y);
      g.stroke();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Papan penunjuk kayu: alas kayu + bingkai + teks 2 baris. */
function signTex(line1, line2) {
  return canvasTex(512, 160, (g, w, h) => {
    g.fillStyle = '#7a5a38'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#4e3a22'; g.lineWidth = 10; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = '#fff2d8'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = line2 ? 'bold 46px sans-serif' : 'bold 52px sans-serif';
    g.fillText(line1, w / 2, line2 ? h / 2 - 28 : h / 2);
    if (line2) { g.font = 'bold 36px sans-serif'; g.fillText(line2, w / 2, h / 2 + 34); }
  });
}

// ---------- jalur utama (dipakai groundH + penempatan) ----------
// Dari selatan (arah padang) masuk hutan, lewat lapangan kecil (0,-14),
// lanjut ke dalam hutan sampai (z -26).
const MAIN_PATH = [[0, 16], [0, 8], [-1, 2], [0, -6], [1, -12], [0, -18], [-2, -26]];
function distToPath(x, z, pts) {
  let best = 1e9;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, z1] = pts[i], [x2, z2] = pts[i + 1];
    const dx = x2 - x1, dz = z2 - z1;
    const t = Math.max(0, Math.min(1, ((x - x1) * dx + (z - z1) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - (x1 + dx * t), z - (z1 + dz * t)));
  }
  return best;
}

// ---------- ketinggian tanah ----------
// Naik lembut ke tepi + ke dalam hutan (utara), datar di jalur + lapangan.
function groundH(x, z) {
  let y = 0;
  y += 1.5 * sstep(18, 40, Math.abs(x));       // naik ke tepi kiri/kanan
  y += 2.0 * sstep(14, 40, -z);                // naik ke dalam hutan (utara)
  y += 0.3 * Math.sin(x * 0.4 + 0.5) * Math.sin(z * 0.35 - 1.2); // gelombang lembut
  // datarkan di jalur utama
  const near = 1 - sstep(2, 8, distToPath(x, z, MAIN_PATH));
  y *= 1 - near * 0.8;
  // datarkan lapangan kecil (0,-14)
  const cl = 1 - sstep(4, 8, Math.hypot(x, z + 14));
  y *= 1 - cl * 0.8;
  return y;
}

// ---------- ribbon dari kurva (jalan tanah) ----------
function ribbon(points, width, yOff, mat, uvRepeat = 8) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p[0], 0, p[1])));
  const N = 60;
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const p = curve.getPoint(t);
    const tan = curve.getTangent(t);
    let nx = -tan.z, nz = tan.x;
    const len = Math.hypot(nx, nz) || 1; nx /= len; nz /= len;
    const hw = width / 2;
    for (const s of [-1, 1]) {
      const x = p.x + nx * hw * s, z = p.z + nz * hw * s;
      pos.push(x, groundH(x, z) + yOff, z);
      uv.push(t * uvRepeat, s * 0.5 + 0.5);
    }
  }
  for (let i = 0; i < N; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat);
  m.receiveShadow = true;
  return m;
}

// ---------- tanah hutan 80×80 ----------
function buildGround(scene) {
  const geo = new THREE.PlaneGeometry(80, 80, 90, 90);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    p.setY(i, groundH(p.getX(i), p.getZ(i)));
  }
  geo.computeVertexNormals();
  const mat = std({ map: floorTex(), roughness: 1 });
  const m = new THREE.Mesh(geo, mat);
  m.receiveShadow = true;
  scene.add(m);
}

// ---------- jalur utama + papan penunjuk di tepi hutan ----------
function buildPaths(scene) {
  const dirtMat = std({ map: dirtTex(), roughness: 1 });
  const main = ribbon(MAIN_PATH, 2.0, 0.02, dirtMat, 10);
  scene.add(main);
  // batu tepi jalan (merge) — penanda tepi di sepanjang jalur
  const r = rngKit(65);
  const stones = [];
  for (let i = 0; i < 30; i++) {
    const t = r.range(0.05, 0.95);
    const seg = Math.min(MAIN_PATH.length - 2, Math.floor(t * (MAIN_PATH.length - 1)));
    const f = t * (MAIN_PATH.length - 1) - seg;
    const [x1, z1] = MAIN_PATH[seg], [x2, z2] = MAIN_PATH[seg + 1];
    const cx = x1 + (x2 - x1) * f, cz = z1 + (z2 - z1) * f;
    const side = r.sign();
    const s = r.range(0.12, 0.22);
    stones.push({ geometry: new THREE.DodecahedronGeometry(s, 0), matrix: trs(cx + side * 1.25, groundH(cx, cz) + s * 0.4, cz + r.range(-0.4, 0.4), 0, r.range(0, 6.3), 0, 1, 0.6, 1) });
  }
  mergeParts(stones, M.stone, scene);

  // --- papan penunjuk kayu di tepi hutan (-3, 0, -2), di tepi jalur ---
  // REVISI cek visual pose1: papan di (2.5, 8) hanya 2 m di depan
  // kamera pose — papannya menutupi sepertiga frame. Dipindah ke
  // (-3,-2): di latar belakang kiri Najmi, terbaca di wide + front.
  const g = new THREE.Group();
  const post = cyl(0.09, 0.11, 2.2, 8, M.woodDark);
  put(post, 0, 1.1, 0); g.add(post);
  const cap = sph(0.12, M.woodDark, 8, 6);
  put(cap, 0, 2.25, 0); g.add(cap);
  // papan digeser +0,8 searah papan (cek visual pose1: tiang menutupi
  // tengah teks, lalu +0,45 masih menutupi 1-2 huruf) — tiang kini
  // tepat di ujung kiri papan, teks terbaca penuh.
  const b1 = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.42, 0.06),
    std({ map: signTex('HUTAN EMBUN', ''), roughness: 0.9 }));
  put(b1, 0.75, 1.85, -0.27, 0.35); b1.castShadow = true; g.add(b1);
  const b2 = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.42, 0.06),
    std({ map: signTex('TITIK KEDATANGAN', '350 m'), roughness: 0.9 }));
  put(b2, 0.70, 1.35, 0.38, -0.5); b2.castShadow = true; g.add(b2);
  for (const [y, ry] of [[1.85, 0.35], [1.35, -0.5]]) {
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.3, 4), M.woodDark);
    put(arrow, Math.cos(ry) * 1.75, y, -Math.sin(ry) * 1.75, ry, 0, -Math.PI / 2);
    arrow.castShadow = true; g.add(arrow);
  }
  const gy = groundH(-3, -2);
  put(g, -3, gy, -2);
  scene.add(g);
}

// ---------- pinus 3 lapis kedalaman + 4 pinus raksasa ----------
// Lapis 1 dekat (z -14..10, besar + terang), lapis 2 tengah
// (z -30..-14), lapis 3 siluet jauh (z -38..-31, gelap, berkabut).
// Koridor bebas pohon tinggi: x -5..6, z -4..12 (sumbu pandang kamera
// pose + kamera wide dari selatan) dan lapangan (0,-14) r 6,5.
function buildPines(scene) {
  const r = rngKit(71);
  const trunks = [], conesA = [], conesB = [], conesFar = [];
  let placed = 0, guard = 0;
  // lapis 1 — dekat
  while (placed < 52 && guard++ < 800) {
    const x = r.range(-22, 22), z = r.range(-14, 10);
    if (distToPath(x, z, MAIN_PATH) < 3.2) continue;
    if (Math.hypot(x, z + 14) < 6.5) continue;
    if (x > -5 && x < 6 && z > -4 && z < 12) continue; // koridor kamera
    if (Math.hypot(x + 3, z + 2) < 2.5) continue; // papan penunjuk
    const s = r.range(1.0, 1.5);
    const ry = r.range(0, Math.PI * 2);
    const gy = groundH(x, z);
    trunks.push({ geometry: new THREE.CylinderGeometry(0.14, 0.24, 1.5, 6), matrix: trs(x, gy + 0.75 * s, z, 0, ry, 0, s, s, s) });
    const list = r.chance(0.5) ? conesA : conesB;
    list.push({ geometry: new THREE.ConeGeometry(1.2, 2.0, 8), matrix: trs(x, gy + 2.0 * s, z, 0, ry, 0, s, s, s) });
    list.push({ geometry: new THREE.ConeGeometry(0.92, 1.7, 8), matrix: trs(x, gy + 3.0 * s, z, 0, ry, 0, s, s, s) });
    list.push({ geometry: new THREE.ConeGeometry(0.58, 1.4, 8), matrix: trs(x, gy + 3.9 * s, z, 0, ry, 0, s, s, s) });
    placed++;
  }
  // lapis 2 — tengah
  placed = 0; guard = 0;
  while (placed < 42 && guard++ < 800) {
    const x = r.range(-24, 24), z = r.range(-30, -14);
    if (distToPath(x, z, MAIN_PATH) < 3) continue;
    if (Math.hypot(x, z + 14) < 6.5) continue;
    const s = r.range(0.9, 1.3);
    const ry = r.range(0, Math.PI * 2);
    const gy = groundH(x, z);
    trunks.push({ geometry: new THREE.CylinderGeometry(0.13, 0.22, 1.4, 6), matrix: trs(x, gy + 0.7 * s, z, 0, ry, 0, s, s, s) });
    const list = r.chance(0.5) ? conesA : conesB;
    list.push({ geometry: new THREE.ConeGeometry(1.15, 1.9, 8), matrix: trs(x, gy + 1.9 * s, z, 0, ry, 0, s, s, s) });
    list.push({ geometry: new THREE.ConeGeometry(0.88, 1.6, 8), matrix: trs(x, gy + 2.9 * s, z, 0, ry, 0, s, s, s) });
    list.push({ geometry: new THREE.ConeGeometry(0.55, 1.3, 8), matrix: trs(x, gy + 3.8 * s, z, 0, ry, 0, s, s, s) });
    placed++;
  }
  // lapis 3 — siluet jauh (hanya kerucut besar, gelap, di dalam kabut)
  placed = 0; guard = 0;
  while (placed < 22 && guard++ < 400) {
    const x = r.range(-30, 30), z = r.range(-38, -31);
    const s = r.range(1.2, 1.8);
    const ry = r.range(0, Math.PI * 2);
    const gy = groundH(x, z);
    trunks.push({ geometry: new THREE.CylinderGeometry(0.14, 0.24, 1.5, 6), matrix: trs(x, gy + 0.75 * s, z, 0, ry, 0, s, s, s) });
    conesFar.push({ geometry: new THREE.ConeGeometry(1.3, 2.4, 7), matrix: trs(x, gy + 2.2 * s, z, 0, ry, 0, s, s, s) });
    conesFar.push({ geometry: new THREE.ConeGeometry(0.95, 2.0, 7), matrix: trs(x, gy + 3.4 * s, z, 0, ry, 0, s, s, s) });
    conesFar.push({ geometry: new THREE.ConeGeometry(0.6, 1.6, 7), matrix: trs(x, gy + 4.4 * s, z, 0, ry, 0, s, s, s) });
    placed++;
  }
  // 4 pinus raksasa (siluet penanda, s 1,7-2,0, ~9 m)
  for (const [x, z, s] of [[-14, -8, 1.8], [12, -20, 1.9], [-8, -26, 1.7], [16, 4, 2.0]]) {
    const ry = r.range(0, Math.PI * 2);
    const gy = groundH(x, z);
    trunks.push({ geometry: new THREE.CylinderGeometry(0.18, 0.3, 1.8, 7), matrix: trs(x, gy + 0.9 * s, z, 0, ry, 0, s, s, s) });
    conesA.push({ geometry: new THREE.ConeGeometry(1.4, 2.4, 8), matrix: trs(x, gy + 2.4 * s, z, 0, ry, 0, s, s, s) });
    conesA.push({ geometry: new THREE.ConeGeometry(1.05, 2.0, 8), matrix: trs(x, gy + 3.6 * s, z, 0, ry, 0, s, s, s) });
    conesA.push({ geometry: new THREE.ConeGeometry(0.65, 1.6, 8), matrix: trs(x, gy + 4.6 * s, z, 0, ry, 0, s, s, s) });
  }
  mergeParts(trunks, M.bark, scene);
  mergeParts(conesA, M.pine, scene);
  mergeParts(conesB, M.pineMid, scene);
  mergeParts(conesFar, M.pineFar, scene);

  // akar menonjol: 12 pinus dekat, 5 akar per pohon (kotak pipih
  // meruncing ke luar dari pangkal batang, setengah terbenam)
  const roots = [];
  const rootTrees = [];
  guard = 0;
  while (rootTrees.length < 12 && guard++ < 400) {
    const x = r.range(-18, 18), z = r.range(-12, 8);
    if (distToPath(x, z, MAIN_PATH) < 3.5) continue;
    if (Math.hypot(x, z + 14) < 7) continue;
    if (x > -5 && x < 6 && z > -4 && z < 12) continue;
    rootTrees.push([x, z]);
  }
  for (const [x, z] of rootTrees) {
    const gy = groundH(x, z);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + r.range(-0.3, 0.3);
      const len = r.range(0.6, 1.0);
      roots.push({ geometry: new THREE.BoxGeometry(len, 0.12, 0.18), matrix: trs(x + Math.cos(a) * (0.3 + len / 2), gy + 0.05, z + Math.sin(a) * (0.3 + len / 2), 0.12, -a, 0, 1, 1, 1) });
    }
  }
  mergeParts(roots, M.barkLight, scene);
}

// ---------- lantai hutan: pakis, rumput, lumut, jamur, batu, daun ----------
function buildForestFloor(scene) {
  const r = rngKit(73);
  // pakis rimbun ~180 rumpun: 5 pelepah kerucut ramping per rumpun,
  // miring ke luar (roset) — 2 nuansa hijau, merge.
  const fernA = [], fernB = [];
  let placed = 0, guard = 0;
  while (placed < 260 && guard++ < 1600) {
    const x = r.range(-22, 22), z = r.range(-30, 12);
    if (distToPath(x, z, MAIN_PATH) < 1.8) continue;
    if (Math.hypot(x, z + 14) < 5.5) continue; // lapangan tetap terbuka
    const s = r.range(0.7, 1.4);
    const gy = groundH(x, z);
    const list = r.chance(0.5) ? fernA : fernB;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + r.range(-0.2, 0.2);
      list.push({ geometry: new THREE.ConeGeometry(0.07, 0.8, 4), matrix: trs(x + Math.cos(a) * 0.16 * s, gy + 0.35 * s, z + Math.sin(a) * 0.16 * s, 0.45 * Math.sin(a), 0, -0.45 * Math.cos(a), s, s, s) });
    }
    placed++;
  }
  mergeParts(fernA, M.fern, scene);
  mergeParts(fernB, M.fernLight, scene);
  // rumput ~500 rumpun (kerucut kecil, 2 nuansa, merge)
  const tuftA = [], tuftB = [];
  placed = 0; guard = 0;
  while (placed < 650 && guard++ < 3000) {
    const x = r.range(-24, 24), z = r.range(-32, 14);
    if (distToPath(x, z, MAIN_PATH) < 1.6) continue;
    const s = r.range(0.7, 1.4);
    (r.chance(0.5) ? tuftA : tuftB).push({ geometry: new THREE.ConeGeometry(0.09, 0.38, 5), matrix: trs(x, groundH(x, z) + 0.18 * s, z, r.range(-0.2, 0.2), r.range(0, 6.3), r.range(-0.2, 0.2), s, s, s) });
    placed++;
  }
  mergeParts(tuftA, M.moss, scene);
  mergeParts(tuftB, M.mossLight, scene);
  // gundukan lumut ~25 (bola pipih gelap, merge)
  const mounds = [];
  for (let i = 0; i < 25; i++) {
    const x = r.range(-22, 22), z = r.range(-30, 12);
    if (distToPath(x, z, MAIN_PATH) < 2) continue;
    if (Math.hypot(x, z + 14) < 5.5) continue;
    const s = r.range(0.35, 0.7);
    mounds.push({ geometry: new THREE.SphereGeometry(s, 8, 6), matrix: trs(x, groundH(x, z) + s * 0.25, z, 0, r.range(0, 6.3), 0, 1, 0.45, 1) });
  }
  mergeParts(mounds, M.moss, scene);
  // jamur ~36: batang + tudung merah; 10 di antaranya berpendar
  // lembut hijau (emissive) — 3 gugus di tepi lapangan + tersebar.
  const stems = [], capsRed = [], capsGlow = [];
  placed = 0; guard = 0;
  while (placed < 36 && guard++ < 500) {
    let x, z;
    if (r.chance(0.4)) { // gugus di tepi lapangan
      const a = r.range(0, Math.PI * 2);
      x = Math.cos(a) * r.range(5.5, 7.5); z = -14 + Math.sin(a) * r.range(5.5, 7.5);
    } else {
      x = r.range(-20, 20); z = r.range(-28, 10);
    }
    if (distToPath(x, z, MAIN_PATH) < 1.5) continue;
    const s = r.range(0.6, 1.4);
    const gy = groundH(x, z);
    stems.push({ geometry: new THREE.CylinderGeometry(0.05, 0.08, 0.3, 6), matrix: trs(x, gy + 0.15 * s, z, 0, 0, 0, s, s, s) });
    const cap = { geometry: new THREE.SphereGeometry(0.16, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), matrix: trs(x, gy + 0.3 * s, z, 0, 0, 0, s, s * 0.8, s) };
    if (placed < 10) capsGlow.push(cap); else capsRed.push(cap);
    placed++;
  }
  mergeParts(stems, M.mushroomStem, scene);
  mergeParts(capsRed, M.mushroomRed, scene);
  mergeParts(capsGlow, M.mushroomGlow, scene);
  // batu berlumut ~30 (dodecahedron pipih + topi lumut kecil)
  const rocks = [], rockMoss = [];
  for (let i = 0; i < 30; i++) {
    const x = r.range(-22, 22), z = r.range(-30, 12);
    if (distToPath(x, z, MAIN_PATH) < 1.6) continue;
    if (Math.hypot(x, z + 14) < 5.5) continue;
    const s = r.range(0.25, 0.8);
    const gy = groundH(x, z);
    rocks.push({ geometry: new THREE.DodecahedronGeometry(s, 0), matrix: trs(x, gy + s * 0.3, z, r.range(0, 3), r.range(0, 6.3), 0, 1, 0.55, 1) });
    if (r.chance(0.6)) {
      rockMoss.push({ geometry: new THREE.SphereGeometry(s * 0.7, 8, 6), matrix: trs(x, gy + s * 0.55, z, 0, 0, 0, 1, 0.4, 1) });
    }
  }
  mergeParts(rocks, M.stone, scene);
  mergeParts(rockMoss, M.moss, scene);
  // daun gugur ~300 (bidang kecil cokelat/oranye, merge, tanpa bayangan)
  const leavesA = [], leavesB = [];
  for (let i = 0; i < 450; i++) {
    const x = r.range(-24, 24), z = r.range(-32, 14);
    const s = r.range(0.08, 0.16);
    const list = r.chance(0.5) ? leavesA : leavesB;
    list.push({ geometry: new THREE.PlaneGeometry(s, s * 1.4), matrix: trs(x, groundH(x, z) + 0.03, z, -Math.PI / 2 + r.range(-0.2, 0.2), r.range(0, 6.3), 0) });
  }
  mergeParts(leavesA, M.leaf, scene, true);
  mergeParts(leavesB, M.leafRed, scene, true);
  // semak ~24 rumpun (2-3 bola bertumpuk, 2 nuansa hijau)
  const bushesA = [], bushesB = [];
  placed = 0; guard = 0;
  while (placed < 24 && guard++ < 500) {
    const x = r.range(-20, 20), z = r.range(-28, 10);
    if (distToPath(x, z, MAIN_PATH) < 2) continue;
    if (Math.hypot(x, z + 14) < 5.5) continue;
    const gy = groundH(x, z);
    const n = 2 + Math.floor(r.next() * 2);
    for (let j = 0; j < n; j++) {
      const s = r.range(0.45, 0.9);
      const ox = r.range(-0.5, 0.5), oz = r.range(-0.4, 0.4);
      const list = r.chance(0.5) ? bushesA : bushesB;
      list.push({ geometry: new THREE.SphereGeometry(s, 8, 6), matrix: trs(x + ox, gy + s * 0.55 + j * 0.18, z + oz, 0, 0, 0, 1, 0.75, 1) });
    }
    placed++;
  }
  mergeParts(bushesA, M.moss, scene);
  mergeParts(bushesB, M.fern, scene);
}

// ---------- lapangan kecil (0,-14): batang tumbang + tunggul + batu penanda ----------
// Titik fokus komposisi: jalur membelah lapangan, batang tumbang
// melintang di tepi, 3 batu penanda berdiri, cincin jamur di sekeliling.
function buildClearing(scene) {
  const gy = groundH(0, -14);
  // batang tumbang: silinder rebah (r 0,32, panjang 3,4) di tepi lapangan.
  // Ujung kayu terang via material array silinder [sisi, tutup, tutup]
  // (cincin terpisah sebelumnya meleset posisinya dan melayang).
  const logGeo = new THREE.CylinderGeometry(0.32, 0.36, 3.4, 10);
  const log = new THREE.Mesh(logGeo, [M.barkLight, M.logEnd, M.logEnd]);
  log.castShadow = true; log.receiveShadow = true;
  put(log, 1.6, gy + 0.3, -12.2, 0.4, 0, Math.PI / 2);
  scene.add(log);
  // tunggul: silinder pendek + tutup atas kayu terang (3 material)
  const stumpGeo = new THREE.CylinderGeometry(0.42, 0.48, 0.7, 10);
  const stump = new THREE.Mesh(stumpGeo, [
    M.bark, std({ color: 0xd8b878, roughness: 0.9 }), M.bark,
  ]);
  stump.castShadow = true; stump.receiveShadow = true;
  put(stump, -2.1, gy + 0.35, -12.0, 0.3);
  scene.add(stump);
  // 3 batu penanda berdiri (dodecahedron diskala — kotak sebelumnya
  // terbaca seperti tiang kayu; tinggi beda, miring sedikit, berlumut)
  const spots = [[-2.4, -16.2, 2.0, 0.12], [2.5, -15.6, 1.5, -0.15], [0.4, -17.4, 2.5, 0.05]];
  const markerStones = [];
  for (const [x, z, sy, tilt] of spots) {
    const gy2 = groundH(x, z);
    markerStones.push({ geometry: new THREE.DodecahedronGeometry(0.5, 0), matrix: trs(x, gy2 + sy * 0.28, z, tilt, 0.3, 0, 0.9, sy, 0.7) });
    const mossCap = sph(0.26, M.moss, 8, 6);
    put(mossCap, x, gy2 + sy * 0.52, z);
    mossCap.scale.set(1, 0.4, 0.7);
    mossCap.castShadow = false;
    scene.add(mossCap);
  }
  mergeParts(markerStones, M.stoneOld, scene);
  // cincin jamur kecil di sekeliling lapangan (12 jamur mungil)
  const r = rngKit(79);
  const stems = [], caps = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + r.range(-0.2, 0.2);
    const rad = r.range(4.6, 5.4);
    const x = Math.cos(a) * rad, z = -14 + Math.sin(a) * rad;
    const s = r.range(0.5, 0.8);
    const gy2 = groundH(x, z);
    stems.push({ geometry: new THREE.CylinderGeometry(0.04, 0.06, 0.22, 5), matrix: trs(x, gy2 + 0.11 * s, z, 0, 0, 0, s, s, s) });
    caps.push({ geometry: new THREE.SphereGeometry(0.12, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), matrix: trs(x, gy2 + 0.22 * s, z, 0, 0, 0, s, s * 0.8, s) });
  }
  mergeParts(stems, M.mushroomStem, scene);
  mergeParts(caps, M.mushroomRed, scene);
}

// ---------- kabut embun + cahaya matahari menembus tajuk + kunang-kunang ----------
// Kabut: 10 bidang translusen tegak + 4 lembar kabut dekat tanah.
// Cahaya matahari: 6 silinder translusen HANGAT yang miring + redup
// (opacity ~0,06) — sinar matahari, BUKAN pilar portal (ada 6,
// tersebar di jalur + lapangan, warna hangat, tidak ada alas/cincin).
// Kunang-kunang: 26 titik kecil emissive, sedikit saja.
function buildMist(scene) {
  const r = rngKit(83);
  // Malam: kabut di index.html gelap (0x101a16) — samakan warna bidang
  // kabut + redupkan sinar matahari supaya tidak terbaca sebagai
  // persegi abu-abu / kolom pucat di langit hitam (cek visual malam).
  // Siang: fog terang (0xcfe3d6), tidak ada yang diubah.
  const fogL = scene.fog.color.getHSL({ h: 0, s: 0, l: 0 }).l;
  if (fogL < 0.2) {
    M.mist.color.set(0x101a16);
    M.mistGround.color.set(0x101a16);
    M.shaft.emissiveIntensity = 0.15;
    M.shaft.opacity = 0.03;
  }
  // bidang kabut tegak (menghadap kamera selatan, ry kecil) — REVISI
  // cek visual: bidang 8-14 m terlalu kecil + opacity 0,16, tepinya
  // terbaca sebagai kartu. Kini LEBIH BESAR (12-20 m) + LEBIH REDUP
  // (0,06-0,10) supaya tepinya keluar frame / menyatu kabut.
  for (let i = 0; i < 10; i++) {
    const x = r.range(-18, 18), z = r.range(-26, 6);
    const w = r.range(12, 20), h = r.range(3, 5);
    const mist = plane(w, h, M.mist);
    mist.material = M.mist.clone();
    mist.material.opacity = r.range(0.06, 0.10);
    put(mist, x, groundH(x, z) + r.range(1.2, 2.5), z, r.range(-0.6, 0.6), r.range(-0.06, 0.06));
    mist.castShadow = false; mist.receiveShadow = false;
    scene.add(mist);
  }
  // lembar kabut dekat tanah (datar, lebar, sangat redup)
  for (let i = 0; i < 4; i++) {
    const x = r.range(-14, 14), z = r.range(-24, 4);
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(r.range(10, 14), r.range(6, 9)), M.mistGround);
    put(sheet, x, groundH(x, z) + r.range(0.4, 0.7), z, r.range(0, 6.3), -Math.PI / 2);
    sheet.castShadow = false; sheet.receiveShadow = false;
    scene.add(sheet);
  }
  // sinar matahari menembus tajuk (6 silinder hangat miring) — REVISI
  // cek visual: silinder r 0,7-1,1 di sumbu jalan terbaca seperti
  // kolom/pilar. Kini LEBIH RAMPING (0,3-0,8), LEBIH REDUP (0,04),
  // dan digeser KE SAMPING jalur supaya tidak menutupi sumbu pandang.
  const shafts = [
    [3.5, -13, 0.12, 0.08], [-3.5, -16, -0.1, -0.06], [2.5, -6, 0.14, 0.05],
    [-3, 2, -0.12, 0.1], [-4, -22, 0.1, -0.08], [4.5, -9, -0.14, 0.06],
  ];
  for (const [x, z, rx, rz] of shafts) {
    const rt = r.range(0.3, 0.5), rb = r.range(0.5, 0.8), h = r.range(11, 14);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 12, 1, true), M.shaft);
    put(shaft, x, groundH(x, z) + h / 2 - 0.5, z, 0, rx, rz);
    shaft.castShadow = false; shaft.receiveShadow = false;
    scene.add(shaft);
  }
  // kunang-kunang (26 titik kecil emissive, y 0,5-2,5)
  const flies = [];
  for (let i = 0; i < 26; i++) {
    const x = r.range(-16, 16), z = r.range(-24, 8);
    if (distToPath(x, z, MAIN_PATH) < 1.2) continue;
    const y = groundH(x, z) + r.range(0.5, 2.5);
    const s = r.range(0.03, 0.055);
    flies.push({ geometry: new THREE.SphereGeometry(s, 6, 4), matrix: trs(x, y, z, 0, 0, 0) });
  }
  mergeParts(flies, M.firefly, scene, true);
}

// ---------- lighting ----------
function buildHutanLights(scene) {
  // fill sejuk redup (langit kabut / lantai lumut)
  scene.add(new THREE.HemisphereLight(0xa8c8b8, 0x2e4a2a, 0.75));
  // matahari hangat rendah dari selatan-timur — menembus tajuk
  const sun = new THREE.DirectionalLight(0xffe8c0, 1.9);
  sun.position.set(12, 20, 16);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.normalBias = 0.02;
  sun.shadow.bias = -0.0001;
  sun.shadow.camera.left = -30; sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 30; sun.shadow.camera.bottom = -30;
  sun.shadow.camera.near = 0.5; sun.shadow.camera.far = 80;
  sun.target.position.set(0, 0, -8);
  scene.add(sun); scene.add(sun.target);
  // kolam cahaya hangat di lapangan (matahari menembus celah tajuk)
  const pool = new THREE.PointLight(0xffe0a0, 1.0, 7, 2);
  pool.position.set(0, groundH(0, -14) + 2.5, -14);
  scene.add(pool);
}

// ---------- entry point ----------
export function buildHutanEmbun(scene) {
  buildHutanLights(scene);
  buildGround(scene);
  buildPaths(scene);
  buildPines(scene);
  buildForestFloor(scene);
  buildClearing(scene);
  buildMist(scene);

  console.log('TRIANGLES hutan-embun =', countTriangles(scene));
}
