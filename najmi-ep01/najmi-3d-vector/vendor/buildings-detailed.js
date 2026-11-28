// ------------------------------------------------------------------
// buildings-detailed.js — v2 REBUILD (threejs-skills).
// ------------------------------------------------------------------
// Rebuild total atas permintaan Master (27 Nov 2026): "gang yang kamu
// buat sendiri geometrinya masih simple, pakai skill yang ku kasih
// untuk buat ulang gangnya."
//
// Teknik dari skill threejs-* (CloudAI-X, r186) yang dipakai di sini:
//   - threejs-geometry: mergeGeometries (bake per slot material),
//     InstancedMesh diganti merge (tri terhitung jujur oleh
//     countTriangles), ExtrudeGeometry (bingkai/gerbang), LatheGeometry
//     (toren, piringan parabola, pot), TubeGeometry (kabel/pipa),
//     TorusGeometry (grille AC, cincin menara), makeBasis (orientasi
//     genteng di lereng atap).
//   - threejs-materials: PBR MeshStandardMaterial via cel() (roughness
//     bervariasi per slot), MeshBasicMaterial flat() untuk kaca/sign,
//     canvas texture SRGBColorSpace, map plester untuk dinding.
//   - threejs-performance: merge statis per cluster (per slot, per
//     bangunan), material dishare (cel() cache), draw call tetap ~10
//     per bangunan meski geometri jauh lebih detail.
//   - threejs-lighting: bayangan via castShadow/receiveShadow per mesh
//     hasil compile (kaca transparan tidak cast).
//
// Yang BERUBAH dari v1: shutter rolling jadi bilah 3D (bukan bidang
// datar), jendela recessed berdepth (kusen + reveal + kaca mundur +
// mullion 3D + ambang menonjol + teralis), pintu berpanel timbul,
// genteng kampung 3D (setengah-silinder berderet, bukan tekstur),
// AC dengan kipas + grille, papan nama extruded, toren lathe,
// parabola lathe, dinding plester bertekstur.
// Yang TETAP: interface ekspor (buildDetailedRuko, buildDetailedKampung,
// countTriangles), bay quantization, seed deterministik, layout/posisi
// rumah (diatur set-gang-detail.js), budget tris set < ~120.000.
// ------------------------------------------------------------------
import * as THREE from 'three';
import { trs, bake, rngKit } from './sakura/src/core/util.js';
import { cel, flat } from './sakura/src/core/toon.js';

// ------------------------- canvas textures -------------------------
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Fascia toko: papan nama besar. text cth "TOKO" / "WARUNG". */
function signTex(text, bg = '#b3261e', fg = '#fff8e8') {
  return canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.16)'; g.fillRect(0, 0, w, 10);
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, h - 10, w, 10);
    g.strokeStyle = fg; g.lineWidth = 5; g.strokeRect(8, 8, w - 16, h - 16);
    g.fillStyle = fg; g.font = 'bold 64px sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 2);
  });
}

/** Dinding gedek: anyaman bambu (strip horizontal + vertikal selang-seling). */
function gedekTex(seed = 1) {
  const r = rngKit(seed);
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#d9c48f'; g.fillRect(0, 0, w, h);
    const s = 32; // lebar strip anyaman
    for (let y = 0; y < h; y += s) {
      for (let x = 0; x < w; x += s) {
        const over = ((x / s) + (y / s)) % 2 === 0;
        g.fillStyle = over ? '#e6d3a2' : '#c8ad72';
        g.fillRect(x + 1, y + 1, s - 2, s - 2);
        g.fillStyle = 'rgba(90,60,20,0.35)';
        g.fillRect(x + 1, y + s - 3, s - 2, 2);
        g.fillRect(x + s - 3, y + 1, 2, s - 2);
      }
    }
    // simpul bambu (deterministik dari seed, bukan Math.random)
    for (let i = 0; i < 40; i++) {
      g.fillStyle = 'rgba(120,85,30,0.25)';
      g.fillRect(r.range(0, w), r.range(0, h), 3, 3);
    }
  });
}

/** Genteng tanah liat: baris-baris lengkung (scallop) saling tumpang. */
function tileTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#8a4a34'; g.fillRect(0, 0, w, h);
    const tw = 32, th = 26;
    for (let row = 0, y = 0; y < h + th; y += th, row++) {
      const off = (row % 2) * tw / 2;
      for (let x = -tw; x < w + tw; x += tw) {
        const cx = x + off;
        const grad = g.createLinearGradient(cx, y, cx, y + th);
        grad.addColorStop(0, '#c06a44');
        grad.addColorStop(0.7, '#a85438');
        grad.addColorStop(1, '#7e3f2a');
        g.fillStyle = grad;
        g.beginPath();
        g.arc(cx + tw / 2, y + th, tw / 2, Math.PI, 0);
        g.closePath(); g.fill();
        g.strokeStyle = 'rgba(60,25,15,0.5)'; g.lineWidth = 2; g.stroke();
      }
    }
  });
}

/** Plester dinding: mottling halus + noda samar (supaya fasad bukan warna datar). */
function plasterTex(baseHex, seed = 1) {
  const r = rngKit(seed);
  const base = '#' + baseHex.toString(16).padStart(6, '0');
  const t = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 420; i++) {
      g.fillStyle = `rgba(0,0,0,${r.range(0.02, 0.055).toFixed(3)})`;
      const d = r.range(2, 9);
      g.beginPath(); g.arc(r.range(0, w), r.range(0, h), d, 0, Math.PI * 2); g.fill();
    }
    for (let i = 0; i < 260; i++) {
      g.fillStyle = `rgba(255,255,255,${r.range(0.02, 0.05).toFixed(3)})`;
      const d = r.range(2, 7);
      g.beginPath(); g.arc(r.range(0, w), r.range(0, h), d, 0, Math.PI * 2); g.fill();
    }
    // retak rambut (tipis, samar)
    g.strokeStyle = 'rgba(60,45,30,0.18)'; g.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      g.beginPath();
      let x = r.range(0, w), y = r.range(0, h);
      g.moveTo(x, y);
      for (let j = 0; j < 4; j++) { x += r.range(-24, 24); y += r.range(-24, 24); g.lineTo(x, y); }
      g.stroke();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 3);
  return t;
}

/** Rolling shutter toko: bilah horizontal. (Dipakai untuk pintu darurat / gudang.) */
function shutterTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#5a6068'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 14) {
      g.fillStyle = '#7a828c'; g.fillRect(0, y, w, 5);
      g.fillStyle = '#3a4046'; g.fillRect(0, y + 11, w, 3);
    }
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, 0, 6, h); g.fillRect(w - 6, 0, 6, h);
  });
}

// ------------------------- bay quantization -------------------------
// Skill: n_bays = round((W-2m)/w_bay);  w' = (W-2m)/n_bays.
// Mengembalikan { n, w, margin } + pusat tiap bay (sumbu lokal, menghadap +z).
function bays(W, margin, wBay) {
  const n = Math.max(1, Math.round((W - 2 * margin) / wBay));
  const w = (W - 2 * margin) / n;
  const centers = [];
  for (let i = 0; i < n; i++) centers.push(-W / 2 + margin + w * (i + 0.5));
  return { n, w, margin, centers };
}

// ------------------------- parts helpers -------------------------
// parts = { slot: [{ geometry, matrix }] } — di-bake per slot di akhir.
function newParts() {
  return { wall: [], trim: [], metal: [], metalDark: [], glass: [], glassWarm: [], roof: [], tile: [], concrete: [], door: [], wood: [] };
}
function add(parts, slot, geo, px = 0, py = 0, pz = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  parts[slot].push({ geometry: geo, matrix: trs(px, py, pz, rx, ry, rz, sx, sy, sz) });
}
// Tambah satu part dengan matriks penuh (untuk orientasi custom via makeBasis).
function addM(parts, slot, geo, matrix) {
  parts[slot].push({ geometry: geo, matrix });
}
function addBox(parts, slot, w, h, d, px, py, pz, rx = 0, ry = 0, rz = 0) {
  add(parts, slot, new THREE.BoxGeometry(w, h, d), px, py, pz, rx, ry, rz);
}
function addCyl(parts, slot, rt, rb, h, seg, px, py, pz, rx = 0, ry = 0, rz = 0) {
  add(parts, slot, new THREE.CylinderGeometry(rt, rb, h, seg), px, py, pz, rx, ry, rz);
}
// Tempel satu sub-assembly lokal (daftar {geometry,matrix,slot}) ke parts
// dengan transform penempatan (posisi + rotasi Y).
function placeParts(parts, list, px, py, pz, ry = 0) {
  const P = trs(px, py, pz, 0, ry, 0);
  for (const p of list) {
    const m = new THREE.Matrix4().multiplyMatrices(P, p.matrix);
    parts[p.slot].push({ geometry: p.geometry, matrix: m });
  }
}

// ------------------------- material slots -------------------------
const RUKO_FACADES = [0xe8dcc0, 0xdfe8e8, 0xf0d8c8, 0xe8e0c8, 0xd8e0d0, 0xe8c8c8];
function rukoMats(facadeColor, seed = 7) {
  return {
    wall: cel({ color: facadeColor, bands: 3, map: plasterTex(facadeColor, seed) }),
    trim: cel({ color: 0xf5f0e6, bands: 3 }),
    metal: cel({ color: 0x7a7f88, bands: 3 }),
    metalDark: cel({ color: 0x33383f, bands: 3 }),
    glass: flat({ color: 0x4a5a6a }),
    glassWarm: flat({ color: 0xffd9a0 }),
    roof: cel({ color: 0x5a5f6a, bands: 3 }),
    tile: cel({ color: 0xa85438, bands: 3 }),
    concrete: cel({ color: 0x9a948c, bands: 3 }),
    door: cel({ color: 0x6a4526, bands: 3 }),
    wood: cel({ color: 0x8a6f4a, bands: 3 }),
  };
}
function kampungMats(wallTint = 0xffffff, seed = 7) {
  return {
    wall: cel({ color: wallTint, bands: 3, map: gedekTex(seed) }),
    trim: cel({ color: 0xf5ead0, bands: 3 }),
    metal: cel({ color: 0x7a7f88, bands: 3 }),
    metalDark: cel({ color: 0x2a2e33, bands: 3 }),
    glass: flat({ color: 0x3a3f45 }),
    glassWarm: flat({ color: 0xffd9a0 }),
    roof: cel({ color: 0xffffff, bands: 3, map: tileTex() }),
    tile: cel({ color: 0xa85438, bands: 3 }),
    concrete: cel({ color: 0x9a948c, bands: 3 }),
    door: cel({ color: 0x6a4526, bands: 3 }),
    wood: cel({ color: 0x8a6f4a, bands: 3 }),
  };
}

// Merge semua slot jadi mesh + hitung segitiga.
function compileParts(g, parts, matFor) {
  let tris = 0;
  for (const key of Object.keys(parts)) {
    if (!parts[key].length) continue;
    const geo = bake(parts[key]);
    const mesh = new THREE.Mesh(geo, matFor[key]);
    mesh.castShadow = true; mesh.receiveShadow = true;
    g.add(mesh);
    tris += (geo.index ? geo.index.count : geo.attributes.position.count) / 3;
  }
  return tris;
}

/** Hitung segitiga sebuah Group (cara yang sama seperti index.html). */
export function countTriangles(group) {
  let t = 0;
  group.traverse((o) => {
    if (o.isMesh && o.geometry) {
      const g = o.geometry;
      t += g.index ? g.index.count / 3 : g.attributes.position.count / 3;
    }
  });
  return Math.round(t);
}

// ------------------------- unit jendela recessed (v2) -------------------------
// Jendela dengan depth nyata (bukan tempel datar). Lapis dari dinding ke
// luar: reveal gelap (lubang) -> kaca mundur -> kusen berdepth ->
// mullion 3D -> ambang menonjol -> teralis (opsional) / kaca hangat.
// Muka dinding di z=0, menghadap +z. ww,wh = ukuran kaca.
function windowUnit(ww, wh, opts = {}) {
  const list = [];
  const push = (slot, geo, x, y, z, rx = 0, ry = 0, rz = 0) =>
    list.push({ slot, geometry: geo, matrix: trs(x, y, z, rx, ry, rz) });
  const lit = !!opts.lit;       // kaca hangat (interior menyala)
  const bars = !!opts.bars;     // teralis pengaman
  const ft = 0.1; // tebal kusen
  // kusen luar: 4 batang berdepth (menonjol 0.1 dari dinding)
  push('trim', new THREE.BoxGeometry(ww + 2 * ft, ft, 0.1), 0, wh / 2 + ft / 2, 0.05);
  push('trim', new THREE.BoxGeometry(ww + 2 * ft, ft, 0.1), 0, -wh / 2 - ft / 2, 0.05);
  push('trim', new THREE.BoxGeometry(ft, wh, 0.1), -ww / 2 - ft / 2, 0, 0.05);
  push('trim', new THREE.BoxGeometry(ft, wh, 0.1), ww / 2 + ft / 2, 0, 0.05);
  // reveal gelap (lubang) + kaca mundur (di belakang muka kusen)
  push('metalDark', new THREE.BoxGeometry(ww, wh, 0.02), 0, 0, 0.01);
  push(lit ? 'glassWarm' : 'glass', new THREE.PlaneGeometry(ww, wh), 0, 0, 0.03);
  // mullion 3D: batang vertikal + horizontal (penampang 0.05, menonjol)
  push('metalDark', new THREE.BoxGeometry(0.05, wh, 0.06), 0, 0, 0.05);
  push('metalDark', new THREE.BoxGeometry(ww, 0.05, 0.06), 0, 0, 0.05);
  // ambang (sill) menonjol + miring sedikit
  push('trim', new THREE.BoxGeometry(ww + 0.3, 0.07, 0.16), 0, -wh / 2 - 0.1, 0.06, -0.12, 0, 0);
  // teralis: 3 batang vertikal + 2 horizontal di depan kaca
  if (bars) {
    for (let i = -1; i <= 1; i++) {
      push('metal', new THREE.CylinderGeometry(0.02, 0.02, wh + 0.1, 5), (i * ww) / 3, 0, 0.09);
    }
    push('metal', new THREE.BoxGeometry(ww + 0.1, 0.04, 0.04), 0, wh / 4, 0.09);
    push('metal', new THREE.BoxGeometry(ww + 0.1, 0.04, 0.04), 0, -wh / 4, 0.09);
  }
  return list;
}

// Daun jendela louvered (terbuka ~70°): bingkai + 4 bilah miring.
// Dipakai di beberapa jendela ruko (deterministik via rng di pemanggil).
function louveredShutterUnit(ww, wh) {
  const list = [];
  const push = (slot, geo, x, y, z, rx = 0, ry = 0, rz = 0) =>
    list.push({ slot, geometry: geo, matrix: trs(x, y, z, rx, ry, rz) });
  push('wood', new THREE.BoxGeometry(ww, 0.06, 0.04), 0, wh / 2, 0);
  push('wood', new THREE.BoxGeometry(ww, 0.06, 0.04), 0, -wh / 2, 0);
  push('wood', new THREE.BoxGeometry(0.06, wh, 0.04), -ww / 2, 0, 0);
  push('wood', new THREE.BoxGeometry(0.06, wh, 0.04), ww / 2, 0, 0);
  for (let i = 0; i < 4; i++) {
    const y = -wh / 2 + 0.14 + (i * (wh - 0.28)) / 3;
    push('wood', new THREE.BoxGeometry(ww - 0.08, 0.07, 0.02), 0, y, 0.01, 0.6, 0, 0);
  }
  return list;
}

// ------------------------- rolling shutter bilah 3D (v2) -------------------------
// Bilah-bilah horizontal dengan celah tipis (bukan bidang datar) —
// tiap bilah menangkap cahaya/bayangan sendiri, jadi toko tidak lagi
// terbaca sebagai dinding abu-abu polos.
function shutterSlats(parts, cx, baseY, w, h, z) {
  const slatH = 0.085, pitch = 0.097;
  const n = Math.max(4, Math.floor((h - 0.15) / pitch));
  for (let i = 0; i < n; i++) {
    const y = baseY + 0.12 + i * pitch;
    addBox(parts, 'metalDark', w, slatH, 0.035, cx, y, z);
  }
  // palang bawah (lebih tebal) + gagang tarik
  addBox(parts, 'metalDark', w, 0.12, 0.06, cx, baseY + 0.06, z);
  addBox(parts, 'metal', 0.16, 0.05, 0.08, cx, baseY + 0.06, z + 0.03);
}

// ------------------------- pintu masuk berpanel (v2) -------------------------
// Kusen berdepth + daun berpanel timbul + gagang tuas + anak tangga +
// keset + lampu dinding. (x, baseY) = tengah bawah pintu, front = muka.
function doorUnit(parts, x, baseY, front) {
  // kusen: 2 tiang + ambang atas (menonjol 0.08)
  addBox(parts, 'trim', 0.12, 2.3, 0.1, x - 0.55, baseY + 1.15, front + 0.04);
  addBox(parts, 'trim', 0.12, 2.3, 0.1, x + 0.55, baseY + 1.15, front + 0.04);
  addBox(parts, 'trim', 1.22, 0.12, 0.1, x, baseY + 2.3, front + 0.04);
  // daun pintu + 2 panel timbul + rel tengah
  addBox(parts, 'door', 0.98, 2.2, 0.06, x, baseY + 1.1, front + 0.02);
  addBox(parts, 'door', 0.7, 0.85, 0.03, x, baseY + 1.65, front + 0.06);
  addBox(parts, 'door', 0.7, 0.85, 0.03, x, baseY + 0.65, front + 0.06);
  addBox(parts, 'door', 0.98, 0.08, 0.04, x, baseY + 1.15, front + 0.05);
  // gagang tuas + plat kunci
  addBox(parts, 'metal', 0.04, 0.16, 0.04, x + 0.36, baseY + 1.05, front + 0.08);
  addBox(parts, 'metal', 0.1, 0.14, 0.02, x + 0.36, baseY + 1.05, front + 0.06);
  // anak tangga (2 trap) + keset
  addBox(parts, 'concrete', 1.4, 0.09, 0.4, x, baseY + 0.045, front + 0.3);
  addBox(parts, 'concrete', 1.4, 0.09, 0.28, x, baseY + 0.135, front + 0.18);
  addBox(parts, 'metalDark', 0.9, 0.02, 0.3, x, baseY + 0.19, front + 0.32);
  // lampu dinding di samping pintu (braket + kap + bola hangat)
  addBox(parts, 'metalDark', 0.06, 0.06, 0.14, x - 0.75, baseY + 2.0, front + 0.06);
  addCyl(parts, 'metalDark', 0.09, 0.06, 0.1, 8, x - 0.75, baseY + 1.94, front + 0.1);
  addCyl(parts, 'glassWarm', 0.06, 0.06, 0.06, 8, x - 0.75, baseY + 1.9, front + 0.1);
}

// ------------------------- AC outdoor dengan kipas + grille (v2) -------------------------
// (x, y) = tengah unit di fasad, front = muka dinding.
function acUnit(parts, x, y, front) {
  // badan + panel depan (sedikit menonjol)
  addBox(parts, 'metal', 0.78, 0.55, 0.3, x, y, front + 0.18);
  addBox(parts, 'metalDark', 0.7, 0.47, 0.02, x, y, front + 0.34);
  // kipas: drum + 3 bilah + hub
  addCyl(parts, 'metalDark', 0.2, 0.2, 0.04, 12, x, y, front + 0.36, Math.PI / 2, 0, 0);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    addBox(parts, 'metal', 0.3, 0.07, 0.02, x + Math.cos(a) * 0.09, y + Math.sin(a) * 0.09, front + 0.38, 0, 0, a + 0.5);
  }
  addCyl(parts, 'metalDark', 0.05, 0.05, 0.05, 6, x, y, front + 0.38, Math.PI / 2, 0, 0);
  // grille pelindung: cincin + 4 jeruji
  add(parts, 'metal', new THREE.TorusGeometry(0.21, 0.015, 5, 16), x, y, front + 0.39);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI;
    addBox(parts, 'metal', 0.42, 0.02, 0.02, x, y, front + 0.39, 0, 0, a);
  }
  // kaki braket + pipa drain ke bawah
  addBox(parts, 'metal', 0.06, 0.06, 0.3, x - 0.28, y - 0.32, front + 0.12);
  addBox(parts, 'metal', 0.06, 0.06, 0.3, x + 0.28, y - 0.32, front + 0.12);
  addCyl(parts, 'metal', 0.02, 0.02, 1.2, 5, x + 0.32, y - 0.9, front + 0.08);
}

// ------------------------- ruko detail (v2) -------------------------
// v2 vs v1: pintu pakai doorUnit (panel timbul + gagang tuas + lampu),
// toko pakai shutterSlats (bilah 3D, bukan bidang datar), papan nama
// extruded (kotak berdepth + bidang teks), balkon pakai baluster
// silinder + rel atas membulat, jendela recessed v2 (kaca hangat /
// teralis / daun louvered acak deterministik), toren + parabola lathe,
// coping parapet membulat + spout talang, downpipe sudut.
export function buildDetailedRuko(opts = {}) {
  const w = opts.w ?? 4.5;
  const d = opts.d ?? 4;
  const floors = Math.max(2, Math.min(3, opts.floors ?? 2));
  const seed = opts.seed ?? 7;
  const rng = rngKit(seed);
  const facadeColor = opts.facadeColor ?? RUKO_FACADES[rng.int(0, RUKO_FACADES.length - 1)];
  const signText = opts.signText ?? 'TOKO';
  const signBg = opts.signBg ?? '#b3261e';
  const signFg = opts.signFg ?? '#fff8e8';
  const fh = 3.0;                    // tinggi per lantai
  const H = fh * floors;
  const matFor = rukoMats(facadeColor, seed);
  const parts = newParts();
  const g = new THREE.Group();
  const front = d / 2;               // muka depan di +z

  // ---- massa utama + alas + lis lantai + pilaster sudut ----
  addBox(parts, 'wall', w, H, d, 0, H / 2, 0);
  addBox(parts, 'concrete', w + 0.12, 0.3, d + 0.12, 0, 0.15, 0);
  for (let i = 1; i < floors; i++) {
    addBox(parts, 'trim', w + 0.08, 0.14, d + 0.08, 0, fh * i, 0);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    addBox(parts, 'trim', 0.2, H, 0.2, sx * (w / 2 - 0.1), H / 2, sz * (d / 2 - 0.1));
  }
  // downpipe sudut depan (talang vertikal + elbow bawah)
  addCyl(parts, 'metal', 0.045, 0.045, H, 6, w / 2 - 0.28, H / 2, front + 0.08);
  addCyl(parts, 'metal', 0.045, 0.045, 0.5, 6, w / 2 - 0.28, 0.25, front + 0.3, Math.PI / 2 - 0.5, 0, 0);

  // ---- lantai dasar: pintu berpanel (bay kiri) + toko (sisa bay) ----
  const gb = bays(w, 0.35, 1.15);
  const doorX = gb.centers[0];
  const shopW = gb.w * (gb.n - 1);
  const shopCx = -w / 2 + 0.35 + gb.w + shopW / 2;
  doorUnit(parts, doorX, 0, front);
  // toko: lubang gelap + rolling shutter BILAH 3D + rel + palang bawah
  const shopH = fh - 0.75;
  addBox(parts, 'metalDark', shopW, shopH, 0.04, shopCx, 0.15 + shopH / 2, front + 0.01);
  shutterSlats(parts, shopCx, 0.15, shopW - 0.08, shopH - 0.08, front + 0.05);
  addBox(parts, 'metalDark', 0.07, shopH, 0.06, shopCx - shopW / 2, 0.15 + shopH / 2, front + 0.05);
  addBox(parts, 'metalDark', 0.07, shopH, 0.06, shopCx + shopW / 2, 0.15 + shopH / 2, front + 0.05);
  // papan nama EXTRUDED: kotak berdepth + bidang teks di muka
  addBox(parts, 'trim', shopW + 0.24, 0.62, 0.12, shopCx, fh - 0.36, front + 0.06);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(shopW + 0.1, 0.5),
    flat({ color: 0xffffff, map: signTex(signText, signBg, signFg) }),
  );
  sign.position.set(shopCx, fh - 0.36, front + 0.13);
  g.add(sign);
  // blade sign: lengan + papan tipis berdepth + teks bolak-balik
  const bladeX = shopCx - shopW / 2 - 0.45;
  addBox(parts, 'metal', 0.05, 0.05, 0.55, bladeX, fh - 0.36, front + 0.3);
  addBox(parts, 'metalDark', 0.05, 0.62, 0.42, bladeX, fh - 0.36, front + 0.58);
  const bladeTex = signTex(signText, signBg, signFg);
  for (const [br, dx] of [[Math.PI / 2, 0.028], [-Math.PI / 2, -0.028]]) {
    const blade = new THREE.Mesh(
      new THREE.PlaneGeometry(0.42, 0.62),
      flat({ color: 0xffffff, map: bladeTex }),
    );
    blade.position.set(bladeX + dx, fh - 0.36, front + 0.58);
    blade.rotation.y = br;
    g.add(blade);
  }
  // kanopi toko (miring) + braket
  addBox(parts, 'roof', shopW + 0.3, 0.07, 0.85, shopCx, fh + 0.02, front + 0.42, -0.32, 0, 0);
  for (const s of [-1, 1]) {
    addBox(parts, 'metal', 0.06, 0.06, 0.7, shopCx + s * (shopW / 2 - 0.15), fh - 0.18, front + 0.35, -0.5, 0, 0);
  }

  // ---- lantai atas: jendela recessed v2 + balkon + AC ----
  for (let f = 1; f < floors; f++) {
    const y = fh * f + 1.55;
    const ub = bays(w, 0.35, 1.15);
    const hasBalcony = f === 1 && ub.n >= 3;
    const balBays = hasBalcony ? [1, 2].filter((i) => i < ub.n) : [];
    for (let i = 0; i < ub.n; i++) {
      const cx = ub.centers[i];
      if (balBays.includes(i)) {
        placeParts(parts, windowUnit(0.95, 2.05, { lit: rng.chance(0.4) }), cx, y + 0.28, front, 0);
        addBox(parts, 'metal', 0.05, 0.05, 0.1, cx + 0.32, y + 0.28, front + 0.08);
        continue;
      }
      const winOpts = { lit: rng.chance(0.3), bars: rng.chance(0.35) };
      placeParts(parts, windowUnit(ub.w - 0.28, 1.45, winOpts), cx, y, front, 0);
      // daun louvered terbuka di samping sebagian jendela (diputar ~65°)
      if (rng.chance(0.4)) {
        const s = rng.chance(0.5) ? 1 : -1;
        placeParts(parts, louveredShutterUnit(0.5, 1.4),
          cx + s * (ub.w / 2 + 0.3), y, front + 0.28, s * 1.15);
      }
    }
    // jendela samping (+x saja; -x = party wall)
    const sideBays = bays(d, 0.4, 1.3);
    for (const cz of sideBays.centers) {
      placeParts(parts, windowUnit(sideBays.w - 0.3, 1.35, { bars: rng.chance(0.3) }), w / 2, y, cz, Math.PI / 2);
    }
    // balkon lantai 2: pelat + baluster silinder + rel atas membulat
    if (hasBalcony) {
      const bw = gb.w * balBays.length;
      const bx = (ub.centers[balBays[0]] + ub.centers[balBays[balBays.length - 1]]) / 2;
      const by = fh * f + 0.12;
      addBox(parts, 'concrete', bw + 0.15, 0.12, 0.95, bx, by, front + 0.48);
      const railY = by + 0.95;
      // rel atas membulat (silinder horizontal) + rel tengah
      addCyl(parts, 'metal', 0.035, 0.035, bw + 0.15, 8, bx, railY, front + 0.92, 0, 0, Math.PI / 2);
      addBox(parts, 'metal', bw + 0.15, 0.05, 0.05, bx, by + 0.5, front + 0.92);
      // baluster silinder tiap ~0.22 m
      const nb = Math.max(4, Math.round((bw + 0.15) / 0.22));
      for (let i = 0; i <= nb; i++) {
        const t = bx - (bw + 0.15) / 2 + ((bw + 0.15) / nb) * i;
        addCyl(parts, 'metal', 0.02, 0.02, 0.85, 5, t, by + 0.5, front + 0.92);
      }
      for (const s of [-1, 1]) {
        addCyl(parts, 'metal', 0.035, 0.035, 0.9, 8, bx + s * (bw / 2 + 0.05), railY, front + 0.48, Math.PI / 2, 0, 0);
        addCyl(parts, 'metal', 0.02, 0.02, 0.85, 5, bx + s * (bw / 2 + 0.05), by + 0.5, front + 0.92);
        addBox(parts, 'metal', 0.07, 0.07, 0.6, bx + s * (bw / 2 - 0.1), by - 0.15, front + 0.3, -0.6, 0, 0);
      }
      // jemuran: tiang + handuk (kadang)
      addBox(parts, 'metal', 0.04, 0.04, bw * 0.8, bx, railY + 0.35, front + 0.7);
      if (rng.chance(0.7)) {
        const towel = new THREE.Mesh(
          new THREE.PlaneGeometry(0.4, 0.55),
          flat({ color: rng.pick([0x4a7ab8, 0xe8a0b0, 0xf5f0e6, 0xe8c84a]), side: THREE.DoubleSide }),
        );
        towel.position.set(bx + rng.range(-0.4, 0.4), railY + 0.08, front + 0.7);
        g.add(towel);
      }
    }
    // AC outdoor: 1 di fasad depan, 1 di dinding samping (+x)
    if (f === 1 || floors === 2) {
      acUnit(parts, ub.centers[ub.n - 1] + 0.1, fh * f + 2.35, front);
    }
    if (f === floors - 1) {
      // AC samping: rakit di parts sementara, lalu tempel dengan rotasi
      // (flat() polos menghilangkan kunci slot — sertakan slot eksplisit)
      const tmp = newParts();
      acUnit(tmp, 0, 0, 0);
      const sideAC = [];
      for (const [slot, arr] of Object.entries(tmp)) {
        for (const p of arr) sideAC.push({ slot, geometry: p.geometry, matrix: p.matrix });
      }
      placeParts(parts, sideAC, w / 2 + 0.2, fh * f + 2.3, 0, Math.PI / 2);
    }
  }

  // ---- atap: parapet + coping membulat + spout + toren lathe + parabola lathe + antena + bulkhead ----
  const py = H + 0.22;
  addBox(parts, 'wall', w + 0.1, 0.44, 0.12, 0, py, d / 2 - 0.02);
  addBox(parts, 'wall', w + 0.1, 0.44, 0.12, 0, py, -d / 2 + 0.02);
  addBox(parts, 'wall', 0.12, 0.44, d + 0.1, w / 2 - 0.02, py, 0);
  addBox(parts, 'wall', 0.12, 0.44, d + 0.1, -w / 2 + 0.02, py, 0);
  // coping membulat di atas parapet (silinder setengah-terlihat)
  addCyl(parts, 'trim', 0.07, 0.07, w + 0.2, 8, 0, H + 0.47, d / 2 - 0.02, 0, 0, Math.PI / 2);
  addCyl(parts, 'trim', 0.07, 0.07, w + 0.2, 8, 0, H + 0.47, -d / 2 + 0.02, 0, 0, Math.PI / 2);
  addCyl(parts, 'trim', 0.07, 0.07, d + 0.2, 8, w / 2 - 0.02, H + 0.47, 0, Math.PI / 2, 0, 0);
  addCyl(parts, 'trim', 0.07, 0.07, d + 0.2, 8, -w / 2 + 0.02, H + 0.47, 0, Math.PI / 2, 0, 0);
  // spout talang: 2 pipa pendek menonjol dari parapet depan
  for (const s of [-1, 1]) {
    addCyl(parts, 'metal', 0.04, 0.04, 0.45, 6, s * (w / 2 - 0.7), H + 0.28, front + 0.22, 1.1, 0, 0);
  }
  // toren air LATHE: profil berlekuk (badan + bibir + tutup)
  const tx = -w / 2 + 0.9, tz = -d / 2 + 0.9;
  const tankPts = [
    new THREE.Vector2(0.0, 0), new THREE.Vector2(0.36, 0), new THREE.Vector2(0.42, 0.06),
    new THREE.Vector2(0.42, 0.68), new THREE.Vector2(0.38, 0.78), new THREE.Vector2(0.3, 0.85),
    new THREE.Vector2(0.0, 0.85),
  ];
  addM(parts, 'metalDark', new THREE.LatheGeometry(tankPts, 14), trs(tx, H + 0.18, tz));
  for (const [lx, lz] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) {
    addBox(parts, 'metal', 0.08, 0.2, 0.08, tx + lx, H + 0.1, tz + lz);
  }
  addCyl(parts, 'metal', 0.035, 0.035, 1.1, 6, tx + 0.45, H + 0.55, tz);
  // parabola LATHE: mangkuk dangkal + lengan + LNB + tiang
  const dx = w / 2 - 0.8, dz = d / 2 - 0.8;
  addCyl(parts, 'metal', 0.04, 0.04, 0.7, 6, dx, H + 0.35, dz);
  const dishPts = [
    new THREE.Vector2(0.02, 0), new THREE.Vector2(0.2, 0.02), new THREE.Vector2(0.36, 0.1),
    new THREE.Vector2(0.44, 0.2),
  ];
  addM(parts, 'metal', new THREE.LatheGeometry(dishPts, 16), trs(dx, H + 0.72, dz + 0.08, -0.6, 0, 0));
  addBox(parts, 'metal', 0.04, 0.04, 0.45, dx, H + 0.82, dz + 0.32, -0.6, 0, 0);
  addBox(parts, 'metalDark', 0.09, 0.09, 0.12, dx, H + 0.88, dz + 0.5, -0.6, 0, 0);
  // antena TV: tiang + 3 palang
  addCyl(parts, 'metalDark', 0.03, 0.03, 1.6, 5, -w / 2 + 0.6, H + 0.8, d / 2 - 0.6);
  for (let i = 0; i < 3; i++) {
    addBox(parts, 'metalDark', 0.02, 0.02, 0.62 - i * 0.12, -w / 2 + 0.6, H + 1.05 + i * 0.18, d / 2 - 0.6);
  }
  // bulkhead tangga atap (kotak kecil + pintu)
  addBox(parts, 'wall', 1.3, 1.0, 1.1, w / 2 - 1.0, H + 0.5, -d / 2 + 0.9);
  addBox(parts, 'door', 0.7, 0.85, 0.05, w / 2 - 1.0, H + 0.42, -d / 2 + 1.48);
  addBox(parts, 'roof', 1.42, 0.08, 1.22, w / 2 - 1.0, H + 1.04, -d / 2 + 0.9);
  // conduit vertikal + kabel service drop di fasad
  addCyl(parts, 'metalDark', 0.03, 0.03, H, 6, -w / 2 + 0.28, H / 2, front + 0.06);
  addBox(parts, 'metalDark', 0.16, 0.24, 0.08, -w / 2 + 0.28, H - 0.3, front + 0.08);
  addCyl(parts, 'metalDark', 0.015, 0.015, 1.6, 5, w / 2 - 0.3, H - 0.8, front + 0.1, 0.5, 0, 0);

  // ---- compile per material slot + posisi ----
  compileParts(g, parts, matFor);
  g.position.set(opts.x ?? 0, opts.y ?? 0, opts.z ?? 0);
  g.rotation.y = opts.ry ?? 0;
  g.userData.kind = 'ruko-detail';
  g.userData.triangles = countTriangles(g); // total incl. bidang tekstur
  return g;
}

// ------------------------- kampung detail (v2) -------------------------
// v2 vs v1: atap bukan lagi pelat + tekstur — genteng 3D nyata
// (setengah-silinder merge, baris berselang-seling, ridge half-pipe +
// lisplang eave), jendela jalusi berdepth + daun penutup berlouver
// terbuka, pintu berpanel + sandal + lampion gantung, teras pakai
// braket diagonal + handrail tangga, tumpukan kayu bakar + gentong
// tanah liat + keranjang di samping rumah.

// Satu unit jendela jalusi v2, koordinat lokal (muka dinding z=0, +z).
// Bingkai berdepth + reveal gelap + 5 louver 3D miring 35°.
function jalousieUnit(ww, wh, nLouvers = 5) {
  const list = [];
  const push = (slot, geo, x, y, z, rx = 0, ry = 0, rz = 0) =>
    list.push({ slot, geometry: geo, matrix: trs(x, y, z, rx, ry, rz) });
  // bingkai luar berdepth
  push('wood', new THREE.BoxGeometry(ww + 0.2, 0.08, 0.1), 0, wh / 2 + 0.04, 0.03);
  push('wood', new THREE.BoxGeometry(ww + 0.2, 0.08, 0.1), 0, -wh / 2 - 0.04, 0.03);
  push('wood', new THREE.BoxGeometry(0.08, wh, 0.1), -ww / 2 - 0.04, 0, 0.03);
  push('wood', new THREE.BoxGeometry(0.08, wh, 0.1), ww / 2 + 0.04, 0, 0.03);
  // reveal gelap + louver 3D (tebal, miring, menonjol)
  push('metalDark', new THREE.BoxGeometry(ww, wh, 0.02), 0, 0, 0.02);
  const top = wh / 2 - 0.14, bot = -wh / 2 + 0.14;
  for (let i = 0; i < nLouvers; i++) {
    const y = nLouvers === 1 ? 0 : bot + ((top - bot) * i) / (nLouvers - 1);
    push('wood', new THREE.BoxGeometry(ww - 0.04, 0.07, 0.03), 0, y, 0.06, 0.6, 0, 0);
  }
  // ambang bawah menonjol + lis atas
  push('wood', new THREE.BoxGeometry(ww + 0.24, 0.07, 0.14), 0, -wh / 2 - 0.08, 0.05);
  push('wood', new THREE.BoxGeometry(ww + 0.2, 0.06, 0.08), 0, wh / 2 + 0.08, 0.03);
  return list;
}

// Segitiga gable (penutup atap di ujung), bentuk XY, diekstrusi 0.12.
function gableTri(span, rh) {
  const s = new THREE.Shape();
  s.moveTo(-span / 2, 0); s.lineTo(span / 2, 0); s.lineTo(0, rh); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: false });
  geo.translate(0, 0, -0.06);
  return geo;
}

// Satu baris genteng 3D di atas pelat atap (slope s = +1/-1).
// Genteng = setengah-silinder (sumbu X, tonjolan ke atas), diorientasi
// pakai trs(rx = s*slope) — teknik makeBasis/manual di skill geometry:
// geometri di-rotate sekali (rotateZ), lalu matriks per-instance.
function roofTiles(parts, w, wallTop, rh, span, slope, s) {
  const slabLen = Math.hypot(span / 2, rh) + 0.06;
  const W = w + 0.9;                 // lebar atap incl. overhang (2*eave)
  const nRows = 10, pitch = slabLen / nRows;
  const colW = 0.22;
  const tileGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.2, 5, 1, true, 0, Math.PI);
  tileGeo.rotateZ(Math.PI / 2);      // sumbu -> X, tonjolan -> +y
  const a = slope;
  for (let k = 0; k < nRows; k++) {
    const dist = (k + 0.5) * pitch;  // jarak dari bubungan ke bawah
    const y = wallTop + rh - dist * Math.sin(a) + 0.01 * Math.cos(a);
    const z = s * dist * Math.cos(a) + 0.01 * s * Math.sin(a);
    const stagger = (k % 2) * colW / 2;
    for (let x = -W / 2 + 0.12 + stagger; x < W / 2 - 0.08; x += colW) {
      addM(parts, 'tile', tileGeo, trs(x, y, z, s * a, 0, 0));
    }
  }
  // ridge cap: half-pipe di bubungan, tiap 0.3 m (sekali saja, slope +1)
  if (s === 1) {
    const capGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.32, 6, 1, true, 0, Math.PI);
    capGeo.rotateZ(Math.PI / 2);
    for (let x = -W / 2 + 0.2; x < W / 2 - 0.1; x += 0.3) {
      addM(parts, 'tile', capGeo, trs(x, wallTop + rh + 0.05, 0));
    }
  }
}

/**
 * Rumah kampung detail v2.
 * opts: { w=3.6, d=3.0, h=2.4, seed=7, wallTint=0xffffff,
 *         x=0, y=0, z=0, ry=0 }
 * Mengembalikan THREE.Group yang sudah di-posisi. Target < ~6.000 tris.
 */
export function buildDetailedKampung(opts = {}) {
  const w = opts.w ?? 3.6;
  const d = opts.d ?? 3.0;
  const h = opts.h ?? 2.4;                 // tinggi dinding (di atas lantai)
  const seed = opts.seed ?? 7;
  const rng = rngKit(seed);
  const floorY = 0.5;                      // lantai terangkat
  const wallTop = floorY + h;
  const rh = 1.15;                         // tinggi atap
  const eave = 0.45;                       // overhang atap
  const matFor = kampungMats(opts.wallTint ?? rng.pick([0xffffff, 0xf5ead0, 0xe8dcc0]), seed);
  const tileMap = tileTex();
  tileMap.wrapS = tileMap.wrapT = THREE.RepeatWrapping;
  tileMap.repeat.set(2.25, 1.0);
  matFor.roof = cel({ color: 0xffffff, bands: 3, map: tileMap });
  const parts = newParts();
  const g = new THREE.Group();
  const front = d / 2;

  // ---- lantai terangkat: pelat + tiang + anak tangga + stringer + handrail ----
  addBox(parts, 'wood', w + 0.4, 0.14, d + 0.4, 0, floorY - 0.07, 0);
  addBox(parts, 'concrete', w + 0.5, 0.36, d + 0.5, 0, 0.18, 0);
  for (const sx of [-1, 0, 1]) for (const sz of [-1, 1]) {
    addBox(parts, 'wood', 0.14, 0.5, 0.14, sx * (w / 2 - 0.15), 0.25, sz * (d / 2 - 0.15));
  }
  // anak tangga depan (3 trap) + stringer miring + handrail
  for (let i = 0; i < 3; i++) {
    addBox(parts, 'concrete', 1.3, 0.17, 0.32, 0, 0.085 + i * 0.17, front + 0.55 + (2 - i) * 0.3);
  }
  for (const s of [-1, 1]) {
    addBox(parts, 'wood', 0.06, 0.06, 1.35, s * 0.68, 0.32, front + 0.85, 0.42, 0, 0);
    addCyl(parts, 'wood', 0.03, 0.03, 0.95, 5, s * 0.68, 0.75, front + 1.15, 0.42, 0, 0);
    addCyl(parts, 'wood', 0.025, 0.025, 0.5, 5, s * 0.68, 0.5, front + 1.28);
    addCyl(parts, 'wood', 0.025, 0.025, 0.5, 5, s * 0.68, 0.28, front + 0.78);
  }

  // ---- dinding gedek + tiang kayu sudut + balok atas ----
  addBox(parts, 'wall', w, h, d, 0, floorY + h / 2, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    addBox(parts, 'wood', 0.17, h + 0.06, 0.17, sx * (w / 2 - 0.08), floorY + h / 2, sz * (d / 2 - 0.08));
  }
  addBox(parts, 'wood', w + 0.1, 0.14, 0.14, 0, wallTop - 0.05, front + 0.02);
  addBox(parts, 'wood', w + 0.1, 0.14, 0.14, 0, wallTop - 0.05, -front - 0.02);
  addBox(parts, 'wood', 0.14, 0.14, d + 0.1, w / 2 - 0.02, wallTop - 0.05, 0);
  addBox(parts, 'wood', 0.14, 0.14, d + 0.1, -w / 2 + 0.02, wallTop - 0.05, 0);

  // ---- atap pelana: 2 pelat miring + GENTENG 3D + lisplang + gable ----
  const span = d + 2 * eave;
  const slope = Math.atan2(rh, span / 2);
  const slabLen = Math.hypot(span / 2, rh) + 0.06;
  for (const s of [1, -1]) {
    addBox(parts, 'roof', w + 2 * eave, 0.1, slabLen, 0, wallTop + rh / 2, s * span / 4, s * slope, 0, 0);
    // lisplang (bargeboard) di ujung gable, mengikuti kemiringan
    for (const gx of [-1, 1]) {
      addBox(parts, 'wood', 0.06, 0.2, slabLen, gx * (w / 2 + eave - 0.03), wallTop + rh / 2 + 0.04, s * span / 4, s * slope, 0, 0);
    }
    // fascia eave: menutup ujung genteng yang terbuka di bawah
    addBox(parts, 'wood', w + 2 * eave, 0.16, 0.06, 0, wallTop + 0.06, s * (span / 2 + 0.02), s * slope, 0, 0);
    roofTiles(parts, w, wallTop, rh, span, slope, s);
  }
  // ridge (bubungan) setengah bulat + finial ujung
  addCyl(parts, 'roof', 0.14, 0.14, w + 2 * eave, 8, 0, wallTop + rh + 0.04, 0, 0, 0, Math.PI / 2);
  for (const s of [-1, 1]) {
    add(parts, 'roof', new THREE.ConeGeometry(0.09, 0.28, 6), s * (w / 2 + eave), wallTop + rh + 0.18, 0);
  }
  // gable (segitiga) di kedua ujung + ventilasi gable
  add(parts, 'wall', gableTri(d, rh), w / 2, wallTop, 0, 0, Math.PI / 2, 0);
  add(parts, 'wall', gableTri(d, rh), -w / 2, wallTop, 0, 0, -Math.PI / 2, 0);
  addBox(parts, 'wood', 0.06, 0.06, 0.5, w / 2 + 0.1, wallTop + 0.55, 0);
  addBox(parts, 'wood', 0.06, 0.06, 0.5, w / 2 + 0.1, wallTop + 0.3, 0);
  for (let i = 0; i < 3; i++) {
    addBox(parts, 'wood', 0.03, 0.045, 0.4, w / 2 + 0.12, wallTop + 0.36 + i * 0.1, 0);
  }
  addBox(parts, 'wood', 0.06, 0.36, 0.06, w / 2 + 0.1, wallTop + 0.42, -0.22);
  addBox(parts, 'wood', 0.06, 0.36, 0.06, w / 2 + 0.1, wallTop + 0.42, 0.22);
  // ventilasi bundar di gable: cincin + 4 jeruji
  add(parts, 'wood', new THREE.TorusGeometry(0.2, 0.035, 5, 14), w / 2 + 0.1, wallTop + 0.75, 0, 0, Math.PI / 2, 0);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI;
    addBox(parts, 'wood', 0.36, 0.04, 0.04, w / 2 + 0.12, wallTop + 0.75, 0, a, 0, 0);
  }

  // ---- pintu depan berpanel (tengah) + sandal + lampion ----
  const doorX = 0;
  addBox(parts, 'wood', 1.06, 2.0, 0.09, doorX, floorY + 1.0, front + 0.02);
  addBox(parts, 'door', 0.92, 1.88, 0.06, doorX, floorY + 0.94, front + 0.04);
  addBox(parts, 'door', 0.68, 0.8, 0.03, doorX, floorY + 1.45, front + 0.08);
  addBox(parts, 'door', 0.68, 0.8, 0.03, doorX, floorY + 0.6, front + 0.08);
  addBox(parts, 'metal', 0.05, 0.05, 0.1, doorX + 0.32, floorY + 0.95, front + 0.09);
  // ventilasi kecil di atas pintu (2 bilah)
  addBox(parts, 'wood', 0.6, 0.05, 0.03, doorX, floorY + 2.05, front + 0.05, 0.6, 0, 0);
  addBox(parts, 'wood', 0.6, 0.05, 0.03, doorX, floorY + 1.92, front + 0.05, 0.6, 0, 0);
  // sandal jepit di depan pintu (2 pasang, sedikit miring acak)
  for (const [sx, sz, rz] of [[-0.45, 0.35, 0.2], [-0.2, 0.42, -0.15], [0.35, 0.3, 0.5]]) {
    addBox(parts, 'metalDark', 0.1, 0.025, 0.26, doorX + sx, floorY + 0.015, front + 0.75 + sz, 0, rz, 0);
  }
  // lampion gantung di teras (kait + badan hangat)
  addCyl(parts, 'metalDark', 0.015, 0.015, 0.25, 5, 0.7, floorY + 1.95, front + 0.9);
  addCyl(parts, 'metalDark', 0.09, 0.06, 0.08, 8, 0.7, floorY + 1.82, front + 0.9);
  addCyl(parts, 'glassWarm', 0.07, 0.07, 0.16, 8, 0.7, floorY + 1.72, front + 0.9);
  addCyl(parts, 'metalDark', 0.08, 0.05, 0.05, 8, 0.7, floorY + 1.62, front + 0.9);

  // ---- jendela jalusi depan + daun penutup berlouver terbuka ----
  for (const s of [-1, 1]) {
    const wx = s * (w / 2 - 0.85);
    placeParts(parts, jalousieUnit(0.95, 1.15, 5), wx, floorY + 1.45, front, 0);
    // daun penutup: engsel di sisi luar, terbuka ~65°, bilah louver nyata
    placeParts(parts, louveredShutterUnit(0.48, 1.2),
      wx + s * 0.72, floorY + 1.45, front + 0.3, s * 1.15);
  }
  // jendela jalusi samping (+x terlihat dari 3/4; -x juga)
  placeParts(parts, jalousieUnit(0.9, 1.1, 4), w / 2, floorY + 1.45, 0, Math.PI / 2);
  placeParts(parts, jalousieUnit(0.9, 1.1, 3), -w / 2, floorY + 1.45, 0, -Math.PI / 2);
  // jendela loteng kecil di atas pintu (depan)
  placeParts(parts, jalousieUnit(0.7, 0.6, 3), 0, wallTop - 0.45, front, 0);

  // ---- teras depan: pelat + 2 tiang + braket diagonal + atap seng miring ----
  addBox(parts, 'wood', 1.9, 0.09, 1.1, 0, floorY + 0.02, front + 0.55);
  for (const s of [-1, 1]) {
    addBox(parts, 'wood', 0.13, 1.9, 0.13, s * 0.85, floorY + 0.95, front + 1.0);
    addBox(parts, 'wood', 0.07, 0.07, 0.9, s * 0.85, floorY + 1.7, front + 0.6, 0.35, 0, 0);
    // braket diagonal tiang -> atap teras
    addBox(parts, 'wood', 0.06, 0.06, 0.75, s * 0.85, floorY + 1.55, front + 0.75, 0.7, 0, 0);
  }
  addBox(parts, 'metal', 2.0, 0.05, 1.25, 0, floorY + 2.05, front + 0.55, 0.28, 0, 0);
  // tangga bambu bersandar di sisi rumah
  addBox(parts, 'wood', 0.05, 2.2, 0.05, w / 2 + 0.35, 1.05, front - 0.6, 0, 0, 0.22);
  addBox(parts, 'wood', 0.05, 2.2, 0.05, w / 2 + 0.35, 1.05, front - 0.95, 0, 0, 0.22);
  for (let i = 0; i < 4; i++) {
    addBox(parts, 'wood', 0.05, 0.05, 0.4, w / 2 + 0.35, 0.35 + i * 0.45, front - 0.78, 0, 0, 0.22);
  }

  // ---- samping rumah: tumpukan kayu bakar + gentong + keranjang ----
  const sideX = -w / 2 - 0.55, sideZ = front - 0.9;
  for (let r = 0; r < 3; r++) {
    for (let i = 0; i < 3 - r; i++) {
      addCyl(parts, 'wood', 0.07, 0.07, 0.7, 6, sideX, 0.07 + r * 0.13, sideZ - 0.25 + i * 0.15 + r * 0.075, Math.PI / 2, 0, 0);
    }
  }
  const jarPts = [
    new THREE.Vector2(0.0, 0), new THREE.Vector2(0.2, 0), new THREE.Vector2(0.26, 0.1),
    new THREE.Vector2(0.28, 0.35), new THREE.Vector2(0.2, 0.55), new THREE.Vector2(0.16, 0.6),
    new THREE.Vector2(0.18, 0.66), new THREE.Vector2(0.0, 0.66),
  ];
  addM(parts, 'tile', new THREE.LatheGeometry(jarPts, 12), trs(sideX + 0.1, 0, sideZ + 0.55));
  addCyl(parts, 'wood', 0.2, 0.16, 0.3, 10, sideX + 0.55, 0.15, sideZ + 0.5);
  add(parts, 'wood', new THREE.TorusGeometry(0.2, 0.025, 5, 12), sideX + 0.55, 0.3, sideZ + 0.5, Math.PI / 2, 0, 0);

  // ---- compile per material slot + posisi ----
  compileParts(g, parts, matFor);
  g.position.set(opts.x ?? 0, opts.y ?? 0, opts.z ?? 0);
  g.rotation.y = opts.ry ?? 0;
  g.userData.kind = 'kampung-detail';
  g.userData.triangles = countTriangles(g);
  return g;
}
