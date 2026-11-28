// ============================================================================
// set-padang-aruna.js — TITIK KEDATANGAN / AREA PADANG, Lembah Aruna
// (dunia fantasi Aurelia, Denah Dunia Fantasi di gambar denah Master).
//
// Najmi (karakter v9 kit, ~1,75 m) baru tiba di tengah padang rumput.
// Origin (0,0,0) = tengah padang; +z ke arah kamera/selatan;
// ujung jalan di (0,0,-14). Utara = -z (Pegunungan Utara jauh).
//
// Peta denah -> staging:
//   Titik Kedatangan (Area Padang) .. ujung jalan tanah di (0,0,-14) —
//                                    TANPA portal/teleporter (Master,
//                                    28 Nov 2026: portal dihapus)
//   Jalur Utama ................... jalan tanah titik -> selatan,
//                                    cabang ke Desa Aruna (belakang-kanan)
//   Hutan Embun (±350 m) .......... pinus kiri + belakang-kiri (60 pohon)
//   Bukit Hijau ................... 4 bukit besar di belakang (kanan
//                                    dirampingkan = celah ke desa)
//   Pegunungan Utara (±3 km) ...... 5 puncak bersalju jauh di -z
//   Sungai Aela (±60 m) ........... sungai berliku di kanan (+x)
//   Danau Cermin (±2,5 km) ........ danau di (28,0,8), pelebaran sungai
//   Pondok Ambang (±180 m) ........ pondok kecil di (13,0,-2)
//   Desa Aruna (±1,2 km) .......... 6 rumah JAUH (x 17..26, z -38..-44),
//                                    ±25-30 m dari titik, di balik celah bukit
//
// Teknik (skill threejs-aaa-graphics-builder):
//   - Silhouette dulu: bukit + pegunungan + jalan tanah adalah bentuk
//     pertama yang terbaca; bunga/rumput/kupu-kupu mengisi sesudahnya.
//   - Authored forms: ExtrudeGeometry (atap prisma pondok/rumah desa),
//     TubeGeometry (asap? tidak — asap pakai sphere translusen),
//     PlaneGeometry di-displace (tanah dalam 90×90 + cincin luar
//     240×240, kabut hutan), ribbon kustom (jalan tanah, sungai)
//     dari CatmullRomCurve3.
//   - Material kit bersama (MeshStandardMaterial saja — converter
//     Sakura mengubahnya ke Toon; BUKAN MeshToonMaterial langsung):
//     rumput hijau bervariasi, tanah jalan, batu abu-abu, kayu,
//     air biru muda (roughness rendah), emissive hanya jendela hangat +
//     kunang-kunang cahaya.
//   - Pengulangan di-merge via bake()/trs() (pinus, bunga, rumput,
//     batu, gelagah, awan); seed deterministik via rngKit.
//   - Lighting: key matahari hangat (DirectionalLight + shadow 2048),
//     fill HemisphereLight langit/tanah, practical hangat di pondok.
//
// TIDAK mengubah index.html / file lain. Dipakai: buildPadangAruna(scene).
// Target ≤120k tris (terukur di log TRIANGLES padang-aruna).
// REVISI 28 Nov 2026 (Master: bukit/gunung terlalu flat + batas void):
// bukit + gunung berelief (noise + flatShading + 2 lapis puncak +
// salju bertingkat + tebing + pohon lereng); tanah 240×240 dengan
// cincin luar meninggi ke horizon supaya tidak ada batas void.
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

// ---------- mesh helpers (pola set-gang-detail.js) ----------
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
  grass: std({ color: 0x6fae4e, roughness: 1 }),
  grassDark: std({ color: 0x4e8a38, roughness: 1 }),
  grassLight: std({ color: 0x8cc464, roughness: 1 }),
  dirt: std({ color: 0x9a7a52, roughness: 1 }),
  sand: std({ color: 0xdcc69a, roughness: 1 }),
  stone: std({ color: 0x8d8d88, roughness: 0.95 }),
  stoneDark: std({ color: 0x5f5f5c, roughness: 0.95 }),
  stoneOld: std({ color: 0x7a7568, roughness: 1 }),
  wood: std({ color: 0x8a6a42, roughness: 0.9 }),
  woodDark: std({ color: 0x5e4526, roughness: 0.95 }),
  plaster: std({ color: 0xf2e8d5, roughness: 0.95 }),
  thatch: std({ color: 0xd9b95c, roughness: 1 }),
  pine: std({ color: 0x2e5d33, roughness: 1 }),
  pineDark: std({ color: 0x244a2a, roughness: 1 }),
  trunk: std({ color: 0x6b4a2e, roughness: 1 }),
  // REVISI 28 Nov 2026 (Master: bukit/gunung terlalu flat) — bukit +
  // gunung pakai flatShading (converter Sakura menyalin flatShading,
  // lihat style-sakura.js) supaya faset relief terbaca, bukan
  // permukaan halus; gunung dibuat lebih gelap supaya tidak luntur
  // di kabut (fog far 120).
  hill: std({ color: 0x5da244, roughness: 1, flatShading: true }),
  hillDark: std({ color: 0x4c8a38, roughness: 1, flatShading: true }),
  mountain: std({ color: 0x5a636e, roughness: 0.95, flatShading: true }),
  mountainFar: std({ color: 0x6b7686, roughness: 0.95, flatShading: true }),
  snow: std({ color: 0xf4f8ff, roughness: 0.6 }),
  water: std({ color: 0x7cc4e8, roughness: 0.25, metalness: 0.1 }),
  lake: std({ color: 0x9fd8f0, roughness: 0.15, metalness: 0.15 }),
  reed: std({ color: 0x4e8a4a, roughness: 1 }),
  cloud: std({ color: 0xffffff, roughness: 1, emissive: 0xffffff, emissiveIntensity: 0.25 }),
  mist: new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.09, side: THREE.DoubleSide, depthWrite: false, roughness: 1 }),
  smoke: new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, roughness: 1, depthWrite: false }),
  // (material portal portalGlow/rune/shard dihapus 28 Nov 2026 —
  // portal dihapus seluruhnya atas perintah Master.)
  windowWarm: std({ color: 0xffc46b, emissive: 0xffb45e, emissiveIntensity: 1.4, roughness: 0.4 }),
};

// ---------- tekstur kanvas ----------
/** Rumput padang: hijau bervariasi + bercak tanah + bintik bunga kecil. */
function grassTex() {
  const t = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#6fae4e'; g.fillRect(0, 0, w, h);
    const r = rngKit(41);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = r.pick(['rgba(78,138,56,0.35)', 'rgba(140,196,100,0.3)', 'rgba(90,160,70,0.3)']);
      const d = r.range(4, 22);
      g.beginPath(); g.arc(r.range(0, w), r.range(0, h), d, 0, Math.PI * 2); g.fill();
    }
    for (let i = 0; i < 40; i++) { // bercak tanah kering
      g.fillStyle = 'rgba(154,122,82,0.28)';
      const d = r.range(10, 30);
      g.beginPath(); g.arc(r.range(0, w), r.range(0, h), d, 0, Math.PI * 2); g.fill();
    }
    for (let i = 0; i < 120; i++) { // helai rumput gelap
      g.strokeStyle = 'rgba(46,93,51,0.5)'; g.lineWidth = 2;
      const x = r.range(0, w), y = r.range(0, h);
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + r.range(-4, 4), y - r.range(4, 10)); g.stroke();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(18, 18);
  return t;
}

/** Tanah jalan: cokelat + kerikil + jejak roda samar. */
function dirtTex() {
  const t = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#9a7a52'; g.fillRect(0, 0, w, h);
    const r = rngKit(42);
    for (let i = 0; i < 500; i++) {
      g.fillStyle = r.pick(['rgba(120,90,55,0.4)', 'rgba(180,150,105,0.35)', 'rgba(90,70,45,0.35)']);
      const d = r.range(2, 7);
      g.beginPath(); g.arc(r.range(0, w), r.range(0, h), d, 0, Math.PI * 2); g.fill();
    }
    g.strokeStyle = 'rgba(90,70,45,0.5)'; g.lineWidth = 5; // 2 jejak roda
    for (const x of [70, 186]) {
      g.beginPath(); g.moveTo(x, 0);
      for (let y = 0; y <= h; y += 16) g.lineTo(x + r.range(-4, 4), y);
      g.stroke();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Air sungai: biru muda + garis arus putih. */
/** Air sungai/danau — REVISI 28 Nov 2026 (Master: "texture airnya
 *  terlalu flat"): gradasi biru dalam→muda + bercak kedalaman gelap +
 *  riak berombak lebih banyak — bukan lagi satu warna datar. */
function waterTex() {
  const t = canvasTex(256, 256, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#2f7fc9');
    grad.addColorStop(0.5, '#4aa8de');
    grad.addColorStop(1, '#7cc4e8');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    const r = rngKit(43);
    for (let i = 0; i < 14; i++) { // bercak kedalaman (biru gelap, lembut)
      g.fillStyle = `rgba(16,58,110,${r.range(0.12, 0.28).toFixed(2)})`;
      g.beginPath();
      g.ellipse(r.range(0, w), r.range(0, h), r.range(18, 48), r.range(8, 20), r.range(0, 3), 0, Math.PI * 2);
      g.fill();
    }
    for (let i = 0; i < 90; i++) { // riak putih berombak (aliran)
      g.strokeStyle = `rgba(255,255,255,${r.range(0.2, 0.55).toFixed(2)})`;
      g.lineWidth = r.range(1, 3);
      const y = r.range(0, h), x = r.range(0, w), len = r.range(25, 80);
      g.beginPath(); g.moveTo(x, y);
      g.quadraticCurveTo(x + len / 2, y + r.range(-8, 8), x + len, y + r.range(-5, 5));
      g.stroke();
    }
    for (let i = 0; i < 260; i++) { // percik buih kecil
      g.fillStyle = 'rgba(255,255,255,0.16)';
      const d = r.range(1, 3.5);
      g.beginPath(); g.arc(r.range(0, w), r.range(0, h), d, 0, Math.PI * 2); g.fill();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Papan penunjuk kayu: alas kayu + bingkai + teks 2 baris. */
function signTex(line1, line2) {
  return canvasTex(512, 160, (g, w, h) => {
    g.fillStyle = '#8a6a42'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#5e4526'; g.lineWidth = 10; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = '#fff2d8'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = 'bold 52px sans-serif';
    g.fillText(line1, w / 2, line2 ? h / 2 - 28 : h / 2);
    if (line2) { g.font = 'bold 40px sans-serif'; g.fillText(line2, w / 2, h / 2 + 34); }
  });
}

// ---------- ketinggian tanah ----------
// Naik lembut ke tepi/belakang (bukit + pegunungan), cekung dangkal di
// sungai/danau, datar di sekitar ujung jalan & jalur utama.
function groundH(x, z) {
  let y = 0;
  y += 1.8 * sstep(20, 45, Math.abs(x));       // naik ke tepi kiri/kanan
  y += 2.4 * sstep(18, 45, -z);                // naik ke belakang (utara)
  y += 0.35 * Math.sin(x * 0.32 + 1.7) * Math.sin(z * 0.27 - 0.6); // gelombang lembut
  // datarkan dekat pusat padang (ujung jalan + percabangan jalan)
  const near = 1 - sstep(6, 18, Math.hypot(x, z + 6));
  y *= 1 - near * 0.75;
  // REVISI 28 Nov 2026 (Master: batas void terlihat) — tanah diperbesar
  // ke 240×240; di luar area main (±45 m) terrain naik pelan ke arah
  // horizon + bergelombang, supaya tepi tanah berada di luar jangkauan
  // fog (far 120) dan tertelan kabut sepenuhnya. Nol di area main
  // (desa di z -38..-44, pohon jauh di z -38..-44 tidak ikut terangkat).
  const outer = Math.max(Math.abs(x), -z);
  y += 7 * sstep(48, 115, outer);                   // naik pelan ke horizon
  y += 3 * sstep(48, 100, -z);                      // utara lebih tinggi (alas pegunungan jauh)
  y += 1.6 * Math.sin(x * 0.06 + 2.1) * Math.sin(z * 0.05 - 0.4) * sstep(45, 90, outer); // gelombang horizon
  // cekung sungai (garis x ~26 + sinus) & danau (28, 8)
  const riverD = Math.abs(x - (26 + 2 * Math.sin(z * 0.15)));
  const inRiverZ = sstep(-22, -16, z) * (1 - sstep(18, 24, z));
  y -= 0.6 * (1 - sstep(2.5, 6, riverD)) * inRiverZ;
  const lakeD = Math.hypot((x - 28) / 1.4, z - 8);
  y -= 0.7 * (1 - sstep(4, 9, lakeD));
  return y;
}

// ---------- ribbon dari kurva (jalan tanah / sungai / tepi pasir) ----------
// points: [[x,z],...] — ribbon mengikuti groundH + yOff.
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

// ---------- tanah padang: dalam 90×90 + cincin luar 240×240 ----------
function buildGround(scene) {
  const geo = new THREE.PlaneGeometry(90, 90, 100, 100);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    p.setY(i, groundH(p.getX(i), p.getZ(i)));
  }
  geo.computeVertexNormals();
  const mat = std({ map: grassTex(), roughness: 1 });
  const m = new THREE.Mesh(geo, mat);
  m.receiveShadow = true;
  scene.add(m);
  // REVISI 28 Nov 2026 (batas void): cincin luar 240×240, segmen kasar
  // 48×48 (4.608 tris), warna rumput DATAR — jauh + berkabut, tekstur
  // tidak terbaca; 0,06 m DI BAWAH tanah dalam supaya tidak z-fighting;
  // groundH yang sama menjaga kontinuitas di sambungan ±45 m. Tepi
  // (120 m dari origin) berada di luar fog far 120, jadi tertelan
  // kabut sepenuhnya (warna kabut = warna langit).
  const outerGeo = new THREE.PlaneGeometry(240, 240, 48, 48);
  outerGeo.rotateX(-Math.PI / 2);
  const op = outerGeo.attributes.position;
  for (let i = 0; i < op.count; i++) {
    op.setY(i, groundH(op.getX(i), op.getZ(i)) - 0.06);
  }
  outerGeo.computeVertexNormals();
  const outer = new THREE.Mesh(outerGeo, std({ color: 0x6fae4e, roughness: 1 }));
  outer.receiveShadow = true;
  scene.add(outer);
}

// Jalur Utama + cabang ke Desa Aruna + papan penunjuk.
const MAIN_PATH = [[0, -14], [1, -9], [2, -4], [4, 0], [6, 4], [9, 8], [12, 12]];
// REVISI 28 Nov 2026 (Master: desa harus jauh dari titik) — cabang
// diperpanjang lewat celah bukit sampai Desa Aruna yang jauh (20,-38).
const BRANCH_PATH = [[4, 0], [8, -6], [12, -12], [16, -22], [18, -30], [20, -38]];
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

function buildPaths(scene) {
  const dirtMat = std({ map: dirtTex(), roughness: 1 });
  const main = ribbon(MAIN_PATH, 2.2, 0.02, dirtMat, 10);
  scene.add(main);
  const branch = ribbon(BRANCH_PATH, 1.8, 0.02, dirtMat, 8);
  scene.add(branch);
  // jalur kecil pondok: dari jalan utama ke pintu Pondok Ambang
  const pondokPath = ribbon([[9, 2], [10.5, 0], [12, -1.2]], 1.2, 0.02, dirtMat, 3);
  scene.add(pondokPath);
  // batu tepi jalan (merge) — penanda tepi di sepanjang jalur utama
  const r = rngKit(55);
  const stones = [];
  for (let i = 0; i < 40; i++) {
    const t = r.range(0.05, 0.95);
    const seg = Math.min(MAIN_PATH.length - 2, Math.floor(t * (MAIN_PATH.length - 1)));
    const f = t * (MAIN_PATH.length - 1) - seg;
    const [x1, z1] = MAIN_PATH[seg], [x2, z2] = MAIN_PATH[seg + 1];
    const cx = x1 + (x2 - x1) * f, cz = z1 + (z2 - z1) * f;
    const side = r.sign();
    const s = r.range(0.12, 0.22);
    stones.push({ geometry: new THREE.DodecahedronGeometry(s, 0), matrix: trs(cx + side * 1.35, groundH(cx, cz) + s * 0.4, cz + r.range(-0.4, 0.4), 0, r.range(0, 6.3), 0, 1, 0.6, 1) });
  }
  mergeParts(stones, M.stone, scene);

  // --- papan penunjuk kayu di percabangan (4,0,0) ---
  const g = new THREE.Group();
  const post = cyl(0.09, 0.11, 2.2, 8, M.woodDark);
  put(post, 0, 1.1, 0); g.add(post);
  const cap = sph(0.12, M.woodDark, 8, 6);
  put(cap, 0, 2.25, 0); g.add(cap);
  const b1 = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.42, 0.06),
    std({ map: signTex('DESA ARUNA', '1,2 km'), roughness: 0.9 }));
  put(b1, 0, 1.85, 0, 0.35); b1.castShadow = true; g.add(b1);
  const b2 = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.42, 0.06),
    std({ map: signTex('PONDOK AMBANG', '180 m'), roughness: 0.9 }));
  put(b2, 0, 1.35, 0, -0.5); b2.castShadow = true; g.add(b2);
  // panah kecil di ujung papan
  for (const [y, ry] of [[1.85, 0.35], [1.35, -0.5]]) {
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.3, 4), M.woodDark);
    put(arrow, Math.cos(ry) * 0.95, y, -Math.sin(ry) * 0.95, ry, 0, -Math.PI / 2);
    arrow.castShadow = true; g.add(arrow);
  }
  const gy = groundH(4, 0);
  put(g, 4, gy, 0);
  scene.add(g);
}

// ---------- TITIK KEDATANGAN (0,0,-14): TANPA PORTAL ----------
// REVISI 28 Nov 2026 (Master: "kayak gini, tapi tanpa portal dan
// tanpa teleporter atau sebagainya"): seluruh portal DIHAPUS —
// gerbang batu, elips tegak, lingkaran tanah, cincin, pilar cahaya,
// pecahan melayang, alas batu, lampu cyan. Titik kedatangan kini
// hanya ujung jalan tanah di padang terbuka (Najmi berdiri di
// [0,0,-10.5] di atas jalan). buildPortal + swirlTex + material
// portal (portalGlow/rune/shard) dihapus sekalian.

// ---------- Hutan Embun (kiri + belakang-kiri) + kabut + jamur + pakis ----------
function buildForest(scene) {
  const r = rngKit(31);
  const trunks = [], conesA = [], conesB = [];
  let placed = 0, guard = 0;
  while (placed < 60 && guard++ < 500) {
    const x = r.range(-34, -16), z = r.range(-24, 10);
    const s = r.range(0.8, 1.45);
    const ry = r.range(0, Math.PI * 2);
    const gy = groundH(x, z);
    trunks.push({ geometry: new THREE.CylinderGeometry(0.14, 0.22, 1.4, 6), matrix: trs(x, gy + 0.7 * s, z, 0, ry, 0, s, s, s) });
    const list = r.chance(0.5) ? conesA : conesB;
    list.push({ geometry: new THREE.ConeGeometry(1.15, 1.9, 8), matrix: trs(x, gy + 1.9 * s, z, 0, ry, 0, s, s, s) });
    list.push({ geometry: new THREE.ConeGeometry(0.88, 1.6, 8), matrix: trs(x, gy + 2.9 * s, z, 0, ry, 0, s, s, s) });
    list.push({ geometry: new THREE.ConeGeometry(0.55, 1.3, 8), matrix: trs(x, gy + 3.8 * s, z, 0, ry, 0, s, s, s) });
    placed++;
  }
  mergeParts(trunks, M.trunk, scene);
  mergeParts(conesA, M.pine, scene);
  mergeParts(conesB, M.pineDark, scene);
  // kabut: 5 bidang putih translusen di tepi hutan (lebar + opacity
  // rendah supaya tepinya tidak terbaca sebagai kartu)
  for (let i = 0; i < 5; i++) {
    const x = -15 - i * 0.8, z = -18 + i * 5.5;
    const mist = plane(10, 3.0, M.mist);
    put(mist, x, groundH(x, z) + 1.5, z, r.range(-0.4, 0.4), r.range(-0.08, 0.08));
    mist.castShadow = false; mist.receiveShadow = false;
    scene.add(mist);
  }
  // jamur di tepi hutan (batang + tudung merah, merge)
  const stems = [], caps = [];
  for (let i = 0; i < 24; i++) {
    const x = r.range(-18, -13), z = r.range(-20, 8);
    const s = r.range(0.6, 1.3);
    const gy = groundH(x, z);
    stems.push({ geometry: new THREE.CylinderGeometry(0.05, 0.08, 0.3, 6), matrix: trs(x, gy + 0.15 * s, z, 0, 0, 0, s, s, s) });
    caps.push({ geometry: new THREE.SphereGeometry(0.16, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), matrix: trs(x, gy + 0.3 * s, z, 0, 0, 0, s, s * 0.8, s) });
  }
  mergeParts(stems, std({ color: 0xf2e8d5, roughness: 0.9 }), scene);
  mergeParts(caps, std({ color: 0xc23a2e, roughness: 0.7 }), scene);
  // pakis: kerucut pipih hijau gelap di tepi hutan (merge)
  const ferns = [];
  for (let i = 0; i < 40; i++) {
    const x = r.range(-18, -13), z = r.range(-20, 8);
    const s = r.range(0.5, 1.0);
    ferns.push({ geometry: new THREE.ConeGeometry(0.28, 0.55, 5), matrix: trs(x, groundH(x, z) + 0.25 * s, z, r.range(-0.3, 0.3), r.range(0, 6.3), r.range(-0.3, 0.3), s, s, s) });
  }
  mergeParts(ferns, M.pineDark, scene);
}

// ---------- Bukit Hijau + Pegunungan Utara ----------
// REVISI 28 Nov 2026 (Master: bukit/gunung terlalu flat + batas void):
// - Bukit: sphere 64×32 di-displace noise 3 oktaf (punggung, lembah,
//   tonjolan) + flatShading; tepi bawah tidak di-displace supaya
//   tetap menempel tanah. Bukit kanan tetap ramping (celah ke desa).
// - Pegunungan: DUA lapis — baris dekat (5 puncak, kerucut 16×4
//   di-displace jadi punggung/jurang) + baris jauh (4 puncak lebih
//   tinggi di z -70..-78, memudar di kabut, puncak masih dalam frame
//   wide); salju BERTINGKAT: tudung menempel kerucut + tepi menetes
//   (drip) + pita salju + bercak salju di lereng.
// - Tebing/batu besar di kaki gunung + pohon pinus kecil di lereng
//   bukit (bukit kanan hanya sisi timur — celah ke desa tetap terbuka).
// Noise deterministik (trig, 3 oktaf) untuk relief.
function reliefN(x, z) {
  // oktaf ke-4 (frekuensi rendah, panjang gelombang ~60 m) = lobus
  // besar yang mengubah SILUET bukit, bukan cuma tekstur permukaan.
  return Math.sin(x * 0.32 + 1.3) * Math.sin(z * 0.27 - 0.8)
    + 0.55 * Math.sin(x * 0.71 - 0.5) * Math.sin(z * 0.63 + 1.9)
    + 0.28 * Math.sin(x * 1.45 + 0.2) * Math.sin(z * 1.2 + 2.4)
    + 0.5 * Math.sin(x * 0.11 + 0.7) * Math.sin(z * 0.09 - 1.2);
}

/** Sphere bukit di-displace radial (noise), fade di bawah garis tanah. */
function displacedHill(rad, seed) {
  const geo = new THREE.SphereGeometry(rad, 64, 32);
  const p = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const fade = sstep(0.15 * rad, 0.6 * rad, v.y); // bawah (di tanah) tetap halus
    const n = reliefN(v.x + seed, v.z + seed * 1.7);
    // amplitudo 0,14 → 0,22 (cek visual: 0,14 masih terbaca halus
    // dari kamera wide/front — tonjolan harus 2-3 m di bukit 24 m)
    const d = v.clone().normalize().multiplyScalar(rad * 0.22 * n * fade);
    p.setXYZ(i, v.x + d.x, v.y + d.y, v.z + d.z);
  }
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

/** Satu puncak: kerucut di-displace (punggung/jurang) + salju bertingkat.
 *  Mengembalikan { rock: [...], snow: [...] } untuk di-merge per material.
 *  patches=false untuk baris jauh: badan gunung jauh hampir tertelan
 *  kabut (93%) sementara bercak putihnya tetap terbaca — bercak jadi
 *  terlihat seperti elips putih melayang di atas punggung baris dekat. */
function buildPeak(x, z, rad, h, seed, r, patches = true) {
  const gy = groundH(x, z);
  // kerucut utama: 16 segmen radial × 4 tinggi, displace radial
  // (punggung/jurang searah lereng); fade di puncak supaya apex utuh,
  // alas 1 m di bawah tanah jadi kaki tidak mengambang.
  const cone = new THREE.ConeGeometry(rad, h, 16, 4);
  const p = cone.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const px = p.getX(i), py = p.getY(i), pz = p.getZ(i);
    const t = (py + h / 2) / h; // 0 alas, 1 puncak
    const a = Math.atan2(pz, px);
    const ridge = Math.sin(a * 3 + seed) * 0.6
      + Math.sin(a * 5 + seed * 3.1) * 0.3
      + Math.sin(a * 7 + seed * 2.3) * 0.35
      + Math.sin(a * 13 + seed * 1.1) * 0.2;
    const f = 1 - sstep(0.85, 1, t); // fade di puncak
    const nr = 1 + 0.34 * ridge * f;
    p.setX(i, px * nr);
    p.setZ(i, pz * nr);
    p.setY(i, py + h * 0.05 * Math.sin(a * 5 + seed) * f);
  }
  cone.computeVertexNormals();
  cone.computeBoundingSphere();
  const out = { rock: [], snow: [] };
  out.rock.push({ geometry: cone, matrix: trs(x, gy + h / 2 - 1, z, 0, 0, 0) });
  // --- salju bertingkat ---
  // (a) tudung menempel kerucut: alas di t=0,70 (radius kerucut 0,30r),
  //     puncak tepat di puncak utama (t=1,00)
  const capH = h * 0.30;
  const cap = new THREE.ConeGeometry(rad * 0.30 * 1.03, capH, 16, 2);
  const cp = cap.attributes.position;
  for (let i = 0; i < cp.count; i++) {
    const py = cp.getY(i);
    const t = (py + capH / 2) / capH; // 0 alas, 1 puncak
    if (t < 0.35) { // tepi salju menetes ke bawah (jagged snowline)
      const a = Math.atan2(cp.getZ(i), cp.getX(i));
      cp.setY(i, py - capH * 0.16 * (0.5 + 0.5 * Math.sin(a * 6 + seed)));
    }
  }
  cap.computeVertexNormals();
  cap.computeBoundingSphere();
  out.snow.push({ geometry: cap, matrix: trs(x, gy - 1 + 0.85 * h, z, 0, 0, 0) });
  // (b) pita salju di t 0,55..0,65 (silinder terbuka, 1,04× radius kerucut)
  const skirt = new THREE.CylinderGeometry(rad * 0.35 * 1.04, rad * 0.45 * 1.04, h * 0.10, 16, 1, true);
  skirt.computeBoundingSphere();
  out.snow.push({ geometry: skirt, matrix: trs(x, gy - 1 + 0.60 * h, z, 0, 0, 0) });
  // (c) bercak salju di lereng (bola pipih menempel kerucut) —
  // hanya baris dekat (lihat catatan di atas soal baris jauh)
  for (let j = 0; patches && j < 3; j++) {
    const a = r.range(0, Math.PI * 2);
    const t = r.range(0.35, 0.55);
    const rr = rad * (1 - t) * 0.97;
    const s = rad * r.range(0.06, 0.10);
    const patch = new THREE.SphereGeometry(s, 8, 6);
    patch.computeBoundingSphere();
    out.snow.push({
      geometry: patch,
      matrix: trs(x + Math.cos(a) * rr, gy - 1 + t * h, z + Math.sin(a) * rr, 0, 0, 0, 1, 0.45, 1),
    });
  }
  return out;
}

function buildHillsMountains(scene) {
  // 4 bukit besar (sphere 64×32 di-displace) di belakang — bukit kanan
  // tetap dirampingkan (r 7) supaya ada celah ke Desa Aruna yang jauh.
  const hills = [
    [-22, -32, 12, 0.55, M.hill], [-8, -36, 13, 0.5, M.hillDark],
    [6, -35, 11, 0.55, M.hill], [24, -33, 7, 0.45, M.hill],
  ];
  const r = rngKit(88);
  const hillList = [], hillList2 = [];
  const farTrees = [], hillTrunks = [];
  const hillGeos = []; // geometri bukit per indeks (untuk sampel vertex lereng)
  hills.forEach(([x, z, rad, sy, mat], i) => {
    const list = mat === M.hill ? hillList : hillList2;
    const geo = displacedHill(rad, i * 13.7);
    hillGeos.push(geo);
    list.push({ geometry: geo, matrix: trs(x, groundH(x, z) - rad * sy * 0.25, z, 0, 0, 0, 1, sy, 1) });
    // pohon pinus kecil di lereng bukit — posisi diambil dari VERTEX
    // permukaan sphere yang sudah di-displace (jadi pasti menempel,
    // tidak mengambang); lereng tengah (bukan puncak/bawah).
    // Bukit kanan (i=3): hanya sisi timur (vx > 0,5) — celah ke desa
    // di sisi baratnya harus tetap terbuka.
    const pos = geo.attributes.position;
    const want = i === 3 ? 5 : 11;
    let added = 0, tries = 0;
    while (added < want && tries++ < 300) {
      const vi = Math.floor(r.next() * pos.count);
      const vx = pos.getX(vi), vy = pos.getY(vi), vz = pos.getZ(vi);
      if (vy < 0.2 * rad || vy > 0.75 * rad) continue;
      if (i === 3 && vx < 0.5) continue;
      const wx = x + vx, wz = z + vz;
      const wy = groundH(x, z) - rad * sy * 0.25 + vy * sy;
      const s = r.range(0.7, 1.2);
      hillTrunks.push({ geometry: new THREE.CylinderGeometry(0.07, 0.11, 1.0, 5), matrix: trs(wx, wy + 0.3 * s, wz, 0, 0, 0, s, s, s) });
      farTrees.push({ geometry: new THREE.ConeGeometry(0.55, 1.7, 6), matrix: trs(wx, wy + 1.15 * s, wz, 0, r.range(0, 6.3), 0, s, s, s) });
      added++;
    }
  });
  mergeParts(hillList, M.hill, scene);
  mergeParts(hillList2, M.hillDark, scene);
  mergeParts(hillTrunks, M.trunk, scene);
  // batu + semak DI LERENG bukit (sampel vertex permukaan yang sama —
  // pasti menempel) — memecah permukaan bukit yang masih mulus dari
  // kamera front, termasuk garis sambung antar bukit.
  const hillRocks = [], hillBushA = [], hillBushB = [];
  hills.forEach(([x, z, rad, sy], i) => {
    const pos = hillGeos[i].attributes.position;
    let addedR = 0, addedB = 0, tries = 0;
    while ((addedR < 6 || addedB < 8) && tries++ < 400) {
      const vi = Math.floor(r.next() * pos.count);
      const vx = pos.getX(vi), vy = pos.getY(vi), vz = pos.getZ(vi);
      if (vy < 0.25 * rad || vy > 0.8 * rad) continue;
      const wx = x + vx, wz = z + vz;
      const wy = groundH(x, z) - rad * sy * 0.25 + vy * sy;
      const s = r.range(0.7, 1.3);
      if (addedR < 6 && r.chance(0.45)) {
        hillRocks.push({ geometry: new THREE.DodecahedronGeometry(r.range(0.4, 0.9), 0), matrix: trs(wx, wy + 0.1, wz, r.range(0, 3), r.range(0, 6.3), 0, 1, 0.6, 1) });
        addedR++;
      } else if (addedB < 8) {
        const list = r.chance(0.5) ? hillBushA : hillBushB;
        list.push({ geometry: new THREE.SphereGeometry(r.range(0.5, 0.9), 8, 6), matrix: trs(wx, wy + 0.25 * s, wz, 0, 0, 0, s, s * 0.7, s) });
        addedB++;
      }
    }
  });
  mergeParts(hillRocks, M.stone, scene);
  mergeParts(hillBushA, M.grassDark, scene);
  mergeParts(hillBushB, M.grass, scene);
  // garis pohon jauh di kaki bukit (siluet gelap, merge)
  for (let i = 0; i < 26; i++) {
    const x = r.range(-34, 34), z = r.range(-44, -38);
    const s = r.range(0.9, 1.6);
    farTrees.push({ geometry: new THREE.ConeGeometry(1.0, 2.6, 6), matrix: trs(x, groundH(x, z) + 1.2 * s, z, 0, r.range(0, 6.3), 0, s, s, s) });
  }
  mergeParts(farTrees, M.pineDark, scene);
  // Pegunungan Utara — DUA lapis:
  // baris dekat (5 puncak, sedikit dibesarkan dari sebelumnya) +
  // baris jauh (4 puncak lebih tinggi, z -70..-78 — puncak masih
  // dalam frame wide, memudar di kabut sebagai lapis kedua).
  const nearPeaks = [
    [-28, -52, 12, 22], [-14, -56, 14, 24], [0, -50, 11, 20], [15, -55, 13, 23], [29, -51, 10, 19],
  ];
  const farPeaks = [
    // tinggi dikurangi 3 m (cek visual: puncak baris jauh terpotong
    // tepi atas frame wide — puncak harus masuk frame sepenuhnya)
    [-45, -72, 16, 25], [-15, -76, 18, 27], [15, -71, 15, 24], [45, -75, 17, 26],
  ];
  const rockNear = [], snowNear = [], rockFar = [], snowFar = [];
  nearPeaks.forEach(([x, z, rad, h], i) => {
    const pk = buildPeak(x, z, rad, h, i * 2.9 + 1, r);
    rockNear.push(...pk.rock); snowNear.push(...pk.snow);
  });
  farPeaks.forEach(([x, z, rad, h], i) => {
    const pk = buildPeak(x, z, rad, h, i * 3.7 + 5, r, false);
    rockFar.push(...pk.rock); snowFar.push(...pk.snow);
  });
  mergeParts(rockNear, M.mountain, scene);
  mergeParts(snowNear, M.snow, scene);
  mergeParts(rockFar, M.mountainFar, scene);
  mergeParts(snowFar, M.snow, scene);
  // tebing/batu besar di kaki gunung (merge, 2 nuansa abu-abu) —
  // bukan di koridor desa (x 15..28, z -45..-37) & bukan di cabang jalan.
  const bouldersA = [], bouldersB = [];
  for (let i = 0; i < 30; i++) {
    const x = r.range(-36, 36), z = r.range(-50, -43);
    if (x > 15 && x < 28 && z > -45 && z < -37) continue;
    if (distToPath(x, z, BRANCH_PATH) < 2) continue;
    const s = r.range(0.5, 1.8);
    const list = r.chance(0.5) ? bouldersA : bouldersB;
    list.push({ geometry: new THREE.DodecahedronGeometry(s, 0), matrix: trs(x, groundH(x, z) + s * 0.25, z, r.range(0, 3), r.range(0, 6.3), 0, 1, 0.6, 1) });
  }
  mergeParts(bouldersA, M.stone, scene);
  mergeParts(bouldersB, M.stoneDark, scene);
}

// ---------- Sungai Aela + Danau Cermin + gelagah ----------
function buildRiverLake(scene) {
  const riverPts = [[26, -18], [24, -8], [27, 0], [25, 8], [28, 14], [26, 20]];
  const waterMat = std({ map: waterTex(), roughness: 0.25, metalness: 0.1 });
  const river = ribbon(riverPts, 3.6, 0.06, waterMat, 12);
  river.castShadow = false;
  scene.add(river);
  // tepi pasir di kedua sisi sungai
  const sandL = ribbon(riverPts.map(([x, z]) => [x - 2.4, z]), 1.3, 0.04, M.sand, 12);
  const sandR = ribbon(riverPts.map(([x, z]) => [x + 2.4, z]), 1.3, 0.04, M.sand, 12);
  sandL.castShadow = false; sandR.castShadow = false;
  scene.add(sandL); scene.add(sandR);
  // batu di tepi sungai (merge)
  const r = rngKit(99);
  const rocks = [];
  for (let i = 0; i < 22; i++) {
    const z = r.range(-18, 20);
    const x = 26 + 2 * Math.sin(z * 0.15) + r.sign() * r.range(2.6, 3.4);
    const s = r.range(0.2, 0.5);
    rocks.push({ geometry: new THREE.DodecahedronGeometry(s, 0), matrix: trs(x, groundH(x, z) + s * 0.35, z, r.range(0, 3), r.range(0, 6.3), 0, 1, 0.6, 1) });
  }
  mergeParts(rocks, M.stone, scene);
  // Danau Cermin: elips air mengkilap di (28,0,8), mengikuti tanah cekung
  const lakeGeo = new THREE.CircleGeometry(1, 48);
  lakeGeo.rotateX(-Math.PI / 2);
  lakeGeo.scale(7, 1, 5);
  const lp = lakeGeo.attributes.position;
  for (let i = 0; i < lp.count; i++) {
    lp.setY(i, groundH(28 + lp.getX(i), 8 + lp.getZ(i)) + 0.05);
  }
  // FIX: geometri harus digeser ke (28,0,8) — sebelumnya elips danau
  // tertinggal di origin (0,0) dan menutupi jalan utama di percabangan.
  lakeGeo.translate(28, 0, 8);
  lakeGeo.computeVertexNormals();
  // Danau pakai tekstur air yang sama (bukan warna datar M.lake)
  const lakeMat = std({ map: waterTex(), roughness: 0.15, metalness: 0.2 });
  const lake = new THREE.Mesh(lakeGeo, lakeMat);
  lake.receiveShadow = true;
  scene.add(lake);
  // buih putih di tepi sungai (merge) — air terasa bergerak
  const foam = [];
  for (let i = 0; i < 24; i++) {
    const z = r.range(-18, 20);
    const x = 26 + 2 * Math.sin(z * 0.15) + r.sign() * r.range(1.9, 2.3);
    const s = r.range(0.08, 0.16);
    foam.push({ geometry: new THREE.SphereGeometry(s, 8, 6), matrix: trs(x, groundH(x, z) + 0.1, z, 0, 0, 0, 1, 0.4, 1) });
  }
  mergeParts(foam, std({ color: 0xffffff, roughness: 0.6 }), scene, true);
  // gelagah (reed) di sekeliling danau: batang hijau + ujung cattail
  // cokelat (2 warna = 2 mesh merge terpisah)
  const reedTips = [];
  const reedStems = [];
  for (let i = 0; i < 44; i++) {
    const a = r.range(0, Math.PI * 2);
    const rad = r.range(6.2, 7.6);
    const x = 28 + Math.cos(a) * rad * 1.15, z = 8 + Math.sin(a) * rad * 0.8;
    const h = r.range(0.9, 1.6);
    reedStems.push({ geometry: new THREE.CylinderGeometry(0.02, 0.035, h, 5), matrix: trs(x, groundH(x, z) + h / 2, z, r.range(-0.12, 0.12), 0, r.range(-0.12, 0.12), 1, 1, 1) });
    if (r.chance(0.4)) {
      reedTips.push({ geometry: new THREE.CylinderGeometry(0.05, 0.05, 0.22, 5), matrix: trs(x, groundH(x, z) + h + 0.08, z, 0, 0, 0, 1, 1, 1) });
    }
  }
  mergeParts(reedStems, M.reed, scene);
  mergeParts(reedTips, std({ color: 0x7a5230, roughness: 0.95 }), scene);
}

// ---------- atap prisma segitiga (Extrude) ----------
function prismRoof(w, h, d, mat) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
  geo.translate(0, 0, -d / 2);
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

/** Rumah mungil (dipakai Desa Aruna, skala ~0,7 pondok). */
function miniHouse(x, z, roofColor, ry, s) {
  const g = new THREE.Group();
  const walls = box(2.2 * s, 1.6 * s, 1.8 * s, M.plaster);
  put(walls, 0, 0.8 * s, 0); g.add(walls);
  const roof = prismRoof(2.7 * s, 1.1 * s, 2.3 * s, std({ color: roofColor, roughness: 1 }));
  put(roof, 0, 1.6 * s, 0); g.add(roof);
  const door = box(0.6 * s, 1.1 * s, 0.08, M.woodDark);
  put(door, 0, 0.55 * s, 0.92 * s); g.add(door);
  const win = plane(0.5 * s, 0.5 * s, M.windowWarm);
  put(win, -0.65 * s, 1.0 * s, 0.92 * s); win.castShadow = false; g.add(win);
  const win2 = plane(0.5 * s, 0.5 * s, M.windowWarm);
  put(win2, 0.65 * s, 1.0 * s, 0.92 * s); win2.castShadow = false; g.add(win2);
  const chim = box(0.3 * s, 0.8 * s, 0.3 * s, M.stoneDark);
  put(chim, 0.6 * s, 2.4 * s, 0); g.add(chim);
  put(g, x, groundH(x, z), z, ry);
  return g;
}

/** Asap tipis: 3 sphere translusen di atas cerobong. */
function smokeWisp(parent, x, y, z) {
  for (let i = 0; i < 3; i++) {
    const s = sph(0.22 + i * 0.1, M.smoke, 10, 8);
    put(s, x + i * 0.18, y + i * 0.4, z + i * 0.08);
    s.castShadow = false; s.receiveShadow = false;
    parent.add(s);
  }
}

// ---------- Pondok Ambang (13,0,-2) ----------
function buildPondok(scene) {
  const g = new THREE.Group();
  put(g, 13, groundH(13, -2), -2, -0.4);
  scene.add(g);
  // fondasi batu
  const found = box(3.4, 0.5, 2.8, M.stoneOld);
  put(found, 0, 0.25, 0); g.add(found);
  // dinding plester + rangka kayu (tiang sudut + rel atas/bawah)
  const walls = box(3.0, 2.2, 2.4, M.plaster);
  put(walls, 0, 1.6, 0); g.add(walls);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const post = box(0.14, 2.2, 0.14, M.woodDark);
    put(post, sx * 1.5, 1.6, sz * 1.2); g.add(post);
  }
  for (const y of [0.55, 2.65]) {
    const railF = box(3.1, 0.12, 0.08, M.woodDark);
    put(railF, 0, y, 1.22); g.add(railF);
    const railB = box(3.1, 0.12, 0.08, M.woodDark);
    put(railB, 0, y, -1.22); g.add(railB);
  }
  // atap jerami (prisma) + bubungan
  const roof = prismRoof(3.7, 1.5, 3.1, M.thatch);
  put(roof, 0, 2.7, 0); g.add(roof);
  const ridge = cyl(0.09, 0.09, 3.2, 6, std({ color: 0xb89a4a, roughness: 1 }));
  put(ridge, 0, 4.22, 0, 0, Math.PI / 2, 0); g.add(ridge); // silinder direbahkan sepanjang bubungan (sumbu z)
  // cerobong + asap
  const chim = box(0.42, 1.3, 0.42, M.stoneDark);
  put(chim, 0.9, 3.6, -0.5); g.add(chim);
  smokeWisp(g, 0.9, 4.35, -0.5);
  // pintu + jendela emissive hangat
  const door = box(0.72, 1.45, 0.08, M.woodDark);
  put(door, -0.6, 1.22, 1.22); g.add(door);
  const knob = sph(0.04, std({ color: 0xd4a017, metalness: 0.5, roughness: 0.4 }), 8, 6);
  put(knob, -0.35, 1.2, 1.28); knob.castShadow = false; g.add(knob);
  for (const wx of [0.7]) {
    // bingkai dulu, kaca hangat DI DEPAN muka bingkai (z 1,245 > 1,22)
    // supaya tidak z-fighting / tertutup bingkai
    const frame = box(0.65, 0.65, 0.04, M.woodDark);
    put(frame, wx, 1.7, 1.2); g.add(frame);
    const win = plane(0.55, 0.55, M.windowWarm);
    put(win, wx, 1.7, 1.245); win.castShadow = false; g.add(win);
  }
  // pagar kayu di depan + peti + jerami
  const r = rngKit(111);
  const fence = [];
  for (let i = 0; i < 6; i++) {
    fence.push({ geometry: new THREE.BoxGeometry(0.09, 0.8, 0.09), matrix: trs(-2.2 + i * 0.55, 0.4, 2.6, 0, 0, 0) });
  }
  for (const y of [0.35, 0.65]) {
    fence.push({ geometry: new THREE.BoxGeometry(2.9, 0.07, 0.05), matrix: trs(-0.85, y, 2.6, 0, 0, 0) });
  }
  mergeParts(fence, M.wood, g);
  const crate = box(0.6, 0.6, 0.6, M.wood);
  put(crate, -1.6, 0.8, 1.6, 0.4); g.add(crate);
  // PointLight hangat kecil di pondok (practical)
  const warm = new THREE.PointLight(0xffb45e, 2.5, 6, 2);
  warm.position.set(12, groundH(12, -2) + 2, -1);
  scene.add(warm);
}

// ---------- Desa Aruna (jauh, belakang-kanan) ----------
function buildDesa(scene) {
  // REVISI 28 Nov 2026 (Master: pedesaan harus jauh dari titik) —
  // posisi 12:49 (z -19..-23) terlalu dekat dengan titik kedatangan
  // (cuma ~6-9 m). Desa dipindah JAUH: (x 17..26, z -38..-44), ±25-30 m
  // dari titik, di balik celah bukit kanan yang dirampingkan, di
  // ujung cabang jalan yang diperpanjang. Skala 1,0 supaya tetap
  // terbaca dari kamera wide meski jauh + berkabut.
  const spots = [
    [17, -39, 0xc25a3a, 0.4], [20, -42, 0x3a6ac2, -0.3], [23, -38, 0x4a8f5a, 0.9],
    [25, -43, 0xd8a03a, 0.2], [19, -44, 0x8a5ac2, -0.7], [26, -40, 0xc25a3a, 1.2],
  ];
  spots.forEach(([x, z, roof, ry], i) => {
    const h = miniHouse(x, z, roof, ry, 1.0);
    scene.add(h);
    if (i % 3 === 0) smokeWisp(scene, x + 0.4, groundH(x, z) + 2.4, z);
  });
}

// ---------- Padang: bunga, rumput, batu, semak, kupu-kupu, awan ----------
function buildMeadow(scene) {
  const r = rngKit(77);
  // bunga ~200 rumpun (batang merge + kepala per warna merge)
  const stems = [];
  const heads = { white: [], yellow: [], pink: [], purple: [] };
  const headCols = { white: 0xffffff, yellow: 0xffd94a, pink: 0xff9ec7, purple: 0xb48ae0 };
  let placed = 0, guard = 0;
  while (placed < 200 && guard++ < 1500) {
    const x = r.range(-14, 22), z = r.range(-12, 16);
    if (distToPath(x, z, MAIN_PATH) < 1.8 || distToPath(x, z, BRANCH_PATH) < 1.5) continue;
    if (Math.hypot(x - 13, z + 2) < 3) continue; // halaman pondok
    const s = r.range(0.8, 1.3);
    const gy = groundH(x, z);
    stems.push({ geometry: new THREE.CylinderGeometry(0.02, 0.03, 0.38, 5), matrix: trs(x, gy + 0.19 * s, z, 0, 0, 0, s, s, s) });
    const col = r.pick(Object.keys(heads));
    heads[col].push({ geometry: new THREE.SphereGeometry(0.09, 6, 4), matrix: trs(x, gy + 0.42 * s, z, 0, 0, 0, s, s, s) });
    placed++;
  }
  mergeParts(stems, M.grassDark, scene);
  for (const [name, list] of Object.entries(heads)) {
    mergeParts(list, std({ color: headCols[name], roughness: 0.8 }), scene);
  }
  // rumput ~500 rumpun (kerucut kecil, 2 nuansa hijau, merge)
  const tuftA = [], tuftB = [];
  placed = 0; guard = 0;
  while (placed < 500 && guard++ < 2500) {
    const x = r.range(-16, 26), z = r.range(-20, 18);
    if (distToPath(x, z, MAIN_PATH) < 1.6 || distToPath(x, z, BRANCH_PATH) < 1.3) continue;
    const s = r.range(0.7, 1.4);
    (r.chance(0.5) ? tuftA : tuftB).push({ geometry: new THREE.ConeGeometry(0.09, 0.38, 5), matrix: trs(x, groundH(x, z) + 0.18 * s, z, r.range(-0.2, 0.2), r.range(0, 6.3), r.range(-0.2, 0.2), s, s, s) });
    placed++;
  }
  mergeParts(tuftA, M.grass, scene);
  mergeParts(tuftB, M.grassLight, scene);
  // batu ~25 (dodecahedron pipih, merge)
  const rocks = [];
  for (let i = 0; i < 25; i++) {
    const x = r.range(-15, 23), z = r.range(-13, 17);
    if (distToPath(x, z, MAIN_PATH) < 1.6) continue;
    const s = r.range(0.25, 0.8);
    rocks.push({ geometry: new THREE.DodecahedronGeometry(s, 0), matrix: trs(x, groundH(x, z) + s * 0.3, z, r.range(0, 3), r.range(0, 6.3), 0, 1, 0.55, 1) });
  }
  mergeParts(rocks, M.stone, scene);
  // semak RIMBUN — REVISI 28 Nov 2026 (Master: semak gak rimbun):
  // 12 sphere tunggal -> 30 rumpun, tiap rumpun 2-3 bola bertumpuk
  // (2 nuansa hijau), plus rumpun di tepi hutan + tepi sungai.
  const bushesA = [], bushesB = [];
  placed = 0; guard = 0;
  while (placed < 30 && guard++ < 600) {
    let x, z;
    if (r.chance(0.35)) { x = r.range(-18, -12); z = r.range(-20, 8); } // tepi hutan
    else if (r.chance(0.25)) { x = r.range(19, 24); z = r.range(-10, 16); } // tepi sungai
    else { x = r.range(-15, 22); z = r.range(-13, 16); }
    if (distToPath(x, z, MAIN_PATH) < 2 || distToPath(x, z, BRANCH_PATH) < 1.6) continue;
    if (Math.hypot(x - 13, z + 2) < 3) continue; // halaman pondok
    if (Math.hypot(x, z + 14) < 3.5) continue; // ujung jalan (bekas portal)
    const gy = groundH(x, z);
    const n = 2 + Math.floor(r.next() * 2);
    for (let j = 0; j < n; j++) {
      const s = r.range(0.45, 0.95);
      const ox = r.range(-0.5, 0.5), oz = r.range(-0.4, 0.4);
      const list = r.chance(0.5) ? bushesA : bushesB;
      list.push({ geometry: new THREE.SphereGeometry(s, 8, 6), matrix: trs(x + ox, gy + s * 0.55 + j * 0.18, z + oz, 0, 0, 0, 1, 0.75, 1) });
    }
    placed++;
  }
  mergeParts(bushesA, M.grassDark, scene);
  mergeParts(bushesB, M.grass, scene);
  // pohon peneduh tersebar di padang (berdaun lebar, bukan pinus) —
  // REVISI 28 Nov 2026 (Master: terlalu flat, tambah pohon): 14 pohon,
  // batang + 3 bola tajuk, di-merge; jauh dari jalan/pondok.
  const shadeTrunks = [], shadeLeafA = [], shadeLeafB = [];
  placed = 0; guard = 0;
  while (placed < 14 && guard++ < 500) {
    const x = r.range(-14, 22), z = r.range(-14, 16);
    if (distToPath(x, z, MAIN_PATH) < 5 || distToPath(x, z, BRANCH_PATH) < 2) continue;
    if (Math.hypot(x - 13, z + 2) < 4) continue;
    if (Math.hypot(x, z + 14) < 4.5) continue;
    // REVISI 28 Nov 2026 (cek visual front/pose1): pohon peneduh
    // menutupi sumbu pandang ke ujung jalan — koridor x -5..6, z -14..4
    // (jalur + kamera pose + kamera front) harus bebas pohon tinggi.
    if (x > -5 && x < 6 && z > -14 && z < 4) continue;
    if (Math.hypot(x - 28, z - 8) < 9) continue; // jangan di danau
    const s = r.range(0.9, 1.5);
    const gy = groundH(x, z);
    const ry = r.range(0, Math.PI * 2);
    shadeTrunks.push({ geometry: new THREE.CylinderGeometry(0.13, 0.2, 1.6, 6), matrix: trs(x, gy + 0.8 * s, z, 0, ry, 0, s, s, s) });
    const leafList = r.chance(0.5) ? shadeLeafA : shadeLeafB;
    leafList.push({ geometry: new THREE.SphereGeometry(1.15, 8, 6), matrix: trs(x, gy + 2.1 * s, z, 0, 0, 0, s, s * 0.8, s) });
    leafList.push({ geometry: new THREE.SphereGeometry(0.85, 8, 6), matrix: trs(x + 0.7 * s, gy + 1.7 * s, z + 0.3 * s, 0, 0, 0, s, s * 0.8, s) });
    leafList.push({ geometry: new THREE.SphereGeometry(0.8, 8, 6), matrix: trs(x - 0.65 * s, gy + 1.8 * s, z - 0.3 * s, 0, 0, 0, s, s * 0.8, s) });
    placed++;
  }
  mergeParts(shadeTrunks, M.trunk, scene);
  mergeParts(shadeLeafA, M.grassDark, scene);
  mergeParts(shadeLeafB, M.grass, scene);
  // kupu-kupu kecil (2 sayap segitiga, oranye/biru, statis, merge)
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0); wingShape.lineTo(0.2, 0.08); wingShape.lineTo(0.16, -0.1); wingShape.closePath();
  const wingGeo = new THREE.ShapeGeometry(wingShape);
  const wingsO = [], wingsB = [];
  for (let i = 0; i < 6; i++) {
    let x = r.range(-10, 18), z = r.range(-10, 14);
    // jangan di depan wajah Najmi (cek visual pose1: kupu-kupu biru
    // jatuh tepat di telinga Najmi) — geser ke samping.
    if (x > -3 && x < 3 && z > -13 && z < -8) x += 6;
    const y = groundH(x, z) + r.range(1.2, 2.0);
    const ry = r.range(0, Math.PI * 2);
    const list = i % 2 ? wingsB : wingsO;
    list.push({ geometry: wingGeo, matrix: trs(x, y, z, 0, ry, 0.5) });
    list.push({ geometry: wingGeo, matrix: trs(x, y, z, 0, ry + Math.PI, -0.5) });
  }
  const matO = std({ color: 0xff8c2a, roughness: 0.7, side: THREE.DoubleSide });
  const matB = std({ color: 0x4a90e2, roughness: 0.7, side: THREE.DoubleSide });
  mergeParts(wingsO, matO, scene, true);
  mergeParts(wingsB, matB, scene, true);
  // awan: 5 gugus (3-4 sphere putih pipih tiap gugus) di y 16-24
  const clouds = [];
  for (let i = 0; i < 5; i++) {
    const cx = r.range(-22, 26), cy = r.range(16, 24), cz = r.range(-30, 10);
    const n = 3 + Math.floor(r.next() * 2);
    for (let j = 0; j < n; j++) {
      const s = r.range(1.6, 3.2);
      clouds.push({ geometry: new THREE.SphereGeometry(s, 12, 8), matrix: trs(cx + j * 2.2 - n, cy + r.range(-0.5, 0.5), cz + r.range(-1, 1), 0, 0, 0, 1, 0.45, 1) });
    }
  }
  mergeParts(clouds, M.cloud, scene, true);
}

// ---------- lighting ----------
function buildPadangLights(scene) {
  scene.add(new THREE.HemisphereLight(0xbfd9ff, 0x6a8f4f, 0.9));
  const sun = new THREE.DirectionalLight(0xffe0b3, 2.4);
  sun.position.set(14, 24, 18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.normalBias = 0.02;
  sun.shadow.bias = -0.0001;
  sun.shadow.camera.left = -35; sun.shadow.camera.right = 35;
  sun.shadow.camera.top = 35; sun.shadow.camera.bottom = -35;
  sun.shadow.camera.near = 0.5; sun.shadow.camera.far = 90;
  sun.target.position.set(0, 0, -6);
  scene.add(sun); scene.add(sun.target);
}

// ---------- entry point ----------
export function buildPadangAruna(scene) {
  buildPadangLights(scene);
  buildGround(scene);
  buildPaths(scene);
  // (buildPortal dihapus 28 Nov 2026 — tanpa portal/teleporter.)
  buildForest(scene);
  buildHillsMountains(scene);
  buildRiverLake(scene);
  buildPondok(scene);
  buildDesa(scene);
  buildMeadow(scene);

  console.log('TRIANGLES padang-aruna =', countTriangles(scene));
}
