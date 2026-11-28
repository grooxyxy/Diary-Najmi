// ============================================================================
// set-dapur.js — DAPUR rumah Najmi (Jakarta), staging LEGA untuk Three.js r187.
// Dipakai lewat `?set=dapur` (index.html memanggil buildDapur(scene)).
// Semua prop pakai MeshStandardMaterial supaya style converter Sakura bisa
// mengonversinya ke Toon (bukan MeshToonMaterial langsung).
//
// CATATAN DENAH — denah asli di gambar referensi: dapur 5,8 m x 2,4 m itu
// lorong sempit. Versi staging ini SENGAJA DILEBARKAN jadi 7,0 m (x -3,5..+3,5)
// x 4,6 m (z -2,3..+2,3), tinggi dinding 3,2 m, supaya karakter Najmi
// Tall Tale (~1,58 m) + island + meja makan 4 kursi muat LEGA, bukan
// sempit. Ukuran asli tetap dicatat di sini; staging bukan denah 1:1.
// Origin (0,0,0) = tengah lantai.
//
// OPEN-FRONT DOLLHOUSE: hanya dinding belakang (z=-2,3, lengkap dengan
// jendela di atas sink), dinding kiri (x=-3,5), dinding kanan (x=+3,5),
// dan lantai. TANPA dinding depan (z=+2,3) dan TANPA plafon penuh —
// hanya 3 balok kayu + lis + cooker hood menggantung — supaya kamera
// dari +z bisa melihat seluruh isi dapur.
//
// Teknik dari skill threejs-aaa-graphics-builder (majidmanzarpour):
//   - authoring-recipes: silhouette dulu (kompor + hood + kulkas + island
//     sebagai hero berlapis), authored forms (Lathe panci/ketel/rice cooker/
//     mangkok/vas, Tube keran + rel gantung, Extrude hood + pisau),
//     functional parts (gagang, engsel, tombol, rak, gantungan), material
//     kit bersama, lighting key+fill+rim+practical.
//   - technical-art: material dishare per peran (kayu/steel/keramik/kaca),
//     elemen berulang di-merge via bake() (toples bumbu, kaleng, ubin
//     backsplash, piring), kaca transparan tidak castShadow, budget
//     ~45-65k tris untuk satu set interior.
// ============================================================================
import * as THREE from 'three';
import { countTriangles } from './vendor/buildings-detailed.js';
import { rngKit, bake, trs } from './vendor/sakura/src/core/util.js';

const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0, ...o });

function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
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
function sph(r, mat, ws = 16, hs = 12) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, ws, hs), mat);
  m.castShadow = true; m.receiveShadow = true; return m;
}
function plane(w, h, mat) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.receiveShadow = true; return m;
}
function glass(w, h, mat) { // bidang kaca: terlihat, tidak melempar bayangan
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.castShadow = false; m.receiveShadow = false; return m;
}
function put(m, x, y, z, ry = 0, rx = 0, rz = 0) {
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz); return m;
}
/** Lathe dari profil [[r,y], ...]. */
function lathe(pts, seg, mat) {
  const v = pts.map(([r, y]) => new THREE.Vector2(r, y));
  const m = new THREE.Mesh(new THREE.LatheGeometry(v, seg), mat);
  m.castShadow = true; m.receiveShadow = true; return m;
}
function torus(r, tube, mat, arc = Math.PI * 2, rs = 8, ts = 16) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, rs, ts, arc), mat);
  m.castShadow = true; m.receiveShadow = true; return m;
}
/** Gabung daftar {geometry, matrix} jadi SATU mesh (mergeGeometries). */
function mergeParts(list, mat, parent) {
  if (!list.length) return null;
  const m = new THREE.Mesh(bake(list), mat);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m);
  return m;
}
/** Kain berlipat: bidang ber-segmen, z = gelombang sinus (gorden/handuk). */
function clothPanel(w, h, mat, amp = 0.03, folds = 3) {
  const geo = new THREE.PlaneGeometry(w, h, 10, 8);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i), py = pos.getY(i);
    const hang = 1 - (py + h / 2) / h * 0.35; // lipatan mengecil ke bawah
    pos.setZ(i, Math.sin((px / w) * Math.PI * folds) * amp * hang);
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true; m.receiveShadow = true; return m;
}

// ---------- tekstur canvas ----------
function floorTex() { // keramik checker krem / hijau sage + nat + noda
  return canvasTex(512, 512, (g, w, h) => {
    const r = rngKit(7);
    const s = 128;
    for (let y = 0; y < h; y += s) {
      for (let x = 0; x < w; x += s) {
        const sage = ((x / s) + (y / s)) % 2 === 0;
        g.fillStyle = sage ? '#9db08a' : '#efe6d0';
        g.fillRect(x, y, s, s);
        g.fillStyle = 'rgba(255,255,255,0.10)';
        g.fillRect(x + 6, y + 6, s - 12, 4);
        g.fillStyle = 'rgba(0,0,0,0.06)';
        g.fillRect(x + 6, y + s - 10, s - 12, 4);
      }
    }
    g.strokeStyle = '#d8cfb8'; g.lineWidth = 4;
    for (let i = 0; i <= 4; i++) {
      g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, h); g.stroke();
      g.beginPath(); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke();
    }
    for (let i = 0; i < 46; i++) {
      g.fillStyle = r.chance(0.5) ? 'rgba(60,55,45,0.10)' : 'rgba(90,110,70,0.09)';
      const d = r.range(5, 22);
      g.beginPath(); g.arc(r.range(0, w), r.range(0, h), d, 0, Math.PI * 2); g.fill();
    }
  }, [3.5, 2.3]); // 4 kotak per repeat -> ubin 0,5 m
}
function subwayTex() { // backsplash subway tile putih, baris berselang
  return canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#c9c2b2'; g.fillRect(0, 0, w, h);
    const tw = 64, th = 64;
    for (let row = 0, y = 0; y < h; y += th, row++) {
      const off = (row % 2) * tw / 2;
      for (let x = -tw; x < w + tw; x += tw) {
        const v = 228 + ((x * 3 + y * 7) % 14);
        g.fillStyle = `rgb(${v},${v},${v - 6})`;
        g.fillRect(x + off + 2, y + 2, tw - 4, th - 4);
        g.fillStyle = 'rgba(255,255,255,0.35)';
        g.fillRect(x + off + 2, y + 2, tw - 4, 5);
      }
    }
  }, [4, 1]);
}
function skyTex() { // pemandangan di balik jendela: langit + matahari + bukit
  return canvasTex(256, 256, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#8ec8ee'); grad.addColorStop(0.55, '#cfe8f5'); grad.addColorStop(1, '#f5e8c8');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff3c0'; g.beginPath(); g.arc(196, 52, 22, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.85)';
    for (const [x, y, s] of [[60, 60, 26], [90, 52, 20], [150, 90, 18]]) {
      g.beginPath(); g.arc(x, y, s, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = '#7aa85a';
    g.beginPath(); g.moveTo(0, 190); g.quadraticCurveTo(80, 140, 170, 185);
    g.quadraticCurveTo(220, 205, 256, 180); g.lineTo(256, 256); g.lineTo(0, 256); g.fill();
    g.fillStyle = '#5a8a42';
    g.beginPath(); g.moveTo(0, 220); g.quadraticCurveTo(120, 180, 256, 225);
    g.lineTo(256, 256); g.lineTo(0, 256); g.fill();
    g.fillStyle = '#4a7a3a';
    for (const [x, y] of [[40, 200], [90, 210], [150, 195], [210, 208]]) {
      g.beginPath(); g.arc(x, y, 12, 0, Math.PI * 2); g.fill();
      g.fillRect(x - 2, y, 4, 16);
    }
  });
}
function clockTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#fdfaf0'; g.beginPath(); g.arc(128, 128, 122, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#3a3f45'; g.lineWidth = 6;
    g.beginPath(); g.arc(128, 128, 122, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#2a2e33'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = 'bold 34px sans-serif';
    g.fillText('12', 128, 34); g.fillText('3', 222, 128);
    g.fillText('6', 128, 222); g.fillText('9', 34, 128);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.fillRect(128 + Math.sin(a) * 104 - 2, 128 - Math.cos(a) * 104 - 2, 4, 4);
    }
    g.fillStyle = '#b3261e'; g.beginPath(); g.arc(128, 128, 7, 0, Math.PI * 2); g.fill();
  });
}
function calendarTex() {
  return canvasTex(256, 320, (g, w, h) => {
    g.fillStyle = '#b3261e'; g.fillRect(0, 0, w, 62);
    g.fillStyle = '#fff8e8'; g.font = 'bold 30px sans-serif'; g.textAlign = 'center';
    g.fillText('NOVEMBER 2026', w / 2, 40);
    g.fillStyle = '#fdfaf0'; g.fillRect(0, 62, w, h - 62);
    g.strokeStyle = '#c9c2b2'; g.lineWidth = 2;
    for (let i = 0; i <= 7; i++) { g.beginPath(); g.moveTo(i * w / 7, 62); g.lineTo(i * w / 7, h); g.stroke(); }
    for (let j = 0; j <= 5; j++) { g.beginPath(); g.moveTo(0, 62 + j * (h - 62) / 5); g.lineTo(w, 62 + j * (h - 62) / 5); g.stroke(); }
    g.fillStyle = '#3a3f45'; g.font = 'bold 22px sans-serif';
    let d = 1;
    for (let row = 0; row < 5 && d <= 30; row++) {
      for (let col = 0; col < 7 && d <= 30; col++) {
        g.fillText(String(d), col * w / 7 + w / 14, 62 + row * (h - 62) / 5 + (h - 62) / 10 + 6);
        d++;
      }
    }
    g.strokeStyle = '#b3261e'; g.lineWidth = 4;
    g.beginPath(); g.arc(6 * w / 7 + w / 14, 62 + 3 * (h - 62) / 5 + (h - 62) / 10 + 4, 15, 0, Math.PI * 2); g.stroke();
  });
}
function noteTex() { // catatan belanja di pintu kulkas
  return canvasTex(128, 160, (g, w, h) => {
    g.fillStyle = '#fffbe0'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#b3261e'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, 24); g.lineTo(w, 24); g.stroke();
    g.strokeStyle = '#9ab8d8'; g.lineWidth = 1;
    for (let y = 44; y < h; y += 18) { g.beginPath(); g.moveTo(6, y); g.lineTo(w - 6, y); g.stroke(); }
    g.fillStyle = '#2a4a8a'; g.font = 'bold 15px sans-serif'; g.textAlign = 'left';
    g.fillText('BELANJA:', 10, 42);
    g.font = '15px sans-serif';
    g.fillText('- telur', 10, 60); g.fillText('- santan', 10, 78);
    g.fillText('- cabai', 10, 96); g.fillText('- gula aren', 10, 114);
  });
}
function posterTex() { // poster resep berbingkai di dinding belakang
  return canvasTex(256, 320, (g, w, h) => {
    g.fillStyle = '#f5ead0'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#b3261e'; g.lineWidth = 6; g.strokeRect(10, 10, w - 20, h - 20);
    g.fillStyle = '#b3261e'; g.textAlign = 'center';
    g.font = 'bold 30px sans-serif';
    g.fillText('RESEP NENEK', w / 2, 52);
    g.font = 'bold 40px sans-serif'; g.fillStyle = '#2e7d5b';
    g.fillText('SOTO AYAM', w / 2, 100);
    g.fillStyle = '#3a3f45'; g.font = '20px sans-serif';
    g.fillText('ayam kampung •', w / 2, 140);
    g.fillText('kunyit • serai •', w / 2, 168);
    g.fillText('daun jeruk • santan', w / 2, 196);
    g.fillStyle = '#d88a3a';
    g.beginPath(); g.arc(w / 2, 252, 34, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#f5ead0';
    g.beginPath(); g.arc(w / 2, 252, 24, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#d88a3a';
    g.beginPath(); g.arc(w / 2, 252, 12, 0, Math.PI * 2); g.fill();
  });
}
function rugTex() {
  return canvasTex(256, 128, (g, w, h) => {
    const cols = ['#b3563a', '#e8dcc0', '#7a8a5a', '#e8dcc0', '#b3563a', '#d8a03a'];
    cols.forEach((c, i) => { g.fillStyle = c; g.fillRect(0, (i * h) / cols.length, w, h / cols.length + 1); });
    g.fillStyle = 'rgba(0,0,0,0.08)';
    for (let x = 0; x < w; x += 16) g.fillRect(x, 0, 4, h);
  });
}
function ginghamTex() { // taplak meja kotak-kotak sage
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#f5f2e8'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(125,160,110,0.45)';
    for (let i = 0; i < w; i += 64) { g.fillRect(i, 0, 32, h); g.fillRect(0, i, w, 32); }
    g.fillStyle = 'rgba(125,160,110,0.25)';
    for (let i = 0; i < w; i += 64) { g.fillRect(i + 32, 0, 32, h); g.fillRect(0, i + 32, w, 32); }
  }, [2, 1.4]);
}
function labelTex(text) { // label kecil toples (GULA / KOPI / TEH)
  return canvasTex(128, 64, (g, w, h) => {
    g.fillStyle = '#fdfaf0'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#5a4632'; g.lineWidth = 3; g.strokeRect(4, 4, w - 8, h - 8);
    g.fillStyle = '#3a3f45'; g.font = 'bold 26px sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 1);
  });
}

// ---------- material kit bersama ----------
const M = {
  wall: std({ color: 0xf2e8d5, roughness: 0.95 }),
  wallTrim: std({ color: 0xffffff, roughness: 0.85 }),
  floor: std({ map: floorTex(), roughness: 0.35 }),
  beam: std({ color: 0x6a4a2a, roughness: 0.9 }),
  woodLight: std({ color: 0xc8a06a, roughness: 0.85 }),
  woodMid: std({ color: 0x8a6a42, roughness: 0.9 }),
  woodDark: std({ color: 0x5a3a22, roughness: 0.9 }),
  cabSage: std({ color: 0x7d9a72, roughness: 0.8 }),
  cabCream: std({ color: 0xf0ead8, roughness: 0.8 }),
  counter: std({ color: 0xd8d2c4, roughness: 0.35 }),
  backsplash: std({ map: subwayTex(), roughness: 0.3 }),
  steel: std({ color: 0xb8bec6, metalness: 0.55, roughness: 0.35 }),
  steelDark: std({ color: 0x4a4f55, metalness: 0.4, roughness: 0.5 }),
  blackGlass: std({ color: 0x1e2226, roughness: 0.15, metalness: 0.2 }),
  glass: new THREE.MeshStandardMaterial({ color: 0xcfe4ea, roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.35 }),
  glassWarm: new THREE.MeshStandardMaterial({ color: 0xffe9b8, roughness: 0.2, transparent: true, opacity: 0.5, emissive: 0xffd98a, emissiveIntensity: 0.25 }),
  ceramic: std({ color: 0xf5f2e8, roughness: 0.3 }),
  ceramicBlue: std({ color: 0x3a6a9a, roughness: 0.3 }),
  ceramicRed: std({ color: 0xb3261e, roughness: 0.3 }),
  terracotta: std({ color: 0xa85438, roughness: 0.9 }),
  plasticRed: std({ color: 0xd42a2a, roughness: 0.5 }),
  plasticGreen: std({ color: 0x2e7d5b, roughness: 0.5 }),
  plasticYellow: std({ color: 0xf5be2a, roughness: 0.5 }),
  fridge: std({ color: 0xdfe8e8, metalness: 0.25, roughness: 0.35 }),
  fridgeDoor: std({ color: 0xe8f0f0, metalness: 0.25, roughness: 0.3 }),
  leaf: std({ color: 0x4a7a2a, roughness: 0.95 }),
  leafLight: std({ color: 0x6a9a3a, roughness: 0.95 }),
  fabricSage: std({ color: 0x8aa078, roughness: 0.95, side: THREE.DoubleSide }),
  fabricCream: std({ color: 0xf5ead0, roughness: 0.95, side: THREE.DoubleSide }),
  fabricTerra: std({ color: 0xc06a44, roughness: 0.95, side: THREE.DoubleSide }),
  rug: std({ map: rugTex(), roughness: 0.95 }),
  cloth: std({ map: ginghamTex(), roughness: 0.95 }),
  lampWarm: std({ color: 0xfff2c0, emissive: 0xffc978, emissiveIntensity: 1.4 }),
  ledStrip: std({ color: 0xfff6d8, emissive: 0xffe9a8, emissiveIntensity: 1.8 }),
  sky: std({ map: skyTex(), emissive: 0xffffff, emissiveMap: skyTex(), emissiveIntensity: 0.4, roughness: 0.9 }),
  dark: std({ color: 0x2a2e33, roughness: 0.9 }),
  soup: std({ color: 0xd8a85a, roughness: 0.4 }),
  water: std({ color: 0x4a6a8a, roughness: 0.15, metalness: 0.2 }),
};

// ============================================================================
// SHELL — lantai, 3 dinding (belakang berlubang jendela), lis, balok
// ============================================================================
function buildShell(g) {
  // lantai keramik checker
  const floor = plane(7.0, 4.6, M.floor);
  put(floor, 0, 0.001, 0, 0, -Math.PI / 2); g.add(floor);
  // dinding belakang (z=-2,3, tebal 0,15) — 4 segmen di sekeliling jendela
  // jendela: x -1,95..-0,45 (lebar 1,5), y 1,05..2,15
  const wallSegs = [
    [1.55, 3.2, -2.725, 1.6],   // kiri jendela
    [3.95, 3.2, 1.525, 1.6],    // kanan jendela
    [1.5, 1.05, -1.2, 0.525],   // bawah jendela
    [1.5, 1.05, -1.2, 2.675],   // atas jendela
  ];
  for (const [w, h, x, y] of wallSegs) {
    const m = box(w, h, 0.15, M.wall); put(m, x, y, -2.375); g.add(m);
  }
  // dinding kiri + kanan (penuh)
  for (const s of [-1, 1]) {
    const m = box(0.15, 3.2, 4.6, M.wall); put(m, s * 3.575, 1.6, 0); g.add(m);
  }
  // skirting di ketiga dinding (menonjol 0,02)
  const skB = box(7.0, 0.09, 0.03, M.wallTrim); put(skB, 0, 0.045, -2.285); g.add(skB);
  for (const s of [-1, 1]) {
    const sk = box(0.03, 0.09, 4.6, M.wallTrim); put(sk, s * 3.485, 0.045, 0); g.add(sk);
  }
  // crown molding di puncak dinding
  const crB = box(7.0, 0.09, 0.05, M.wallTrim); put(crB, 0, 3.15, -2.28); g.add(crB);
  for (const s of [-1, 1]) {
    const cr = box(0.05, 0.09, 4.6, M.wallTrim); put(cr, s * 3.48, 3.15, 0); g.add(cr);
  }
  // balok kayu plafon (3, melintang x) + 1 balok memanjang di tengah
  for (const z of [-1.4, 0, 1.4]) {
    const b = box(7.0, 0.18, 0.22, M.beam); put(b, 0, 3.11, z); g.add(b);
  }
  const spine = box(0.22, 0.18, 4.6, M.beam); put(spine, 0, 3.11, 0); g.add(spine);
  // ---- jendela di atas sink: kusen + kaca + mullion + ambang + tirai ----
  const frameM = M.cabCream;
  const winFrame = (w, h, d, x, y, z) => { const m = box(w, h, d, frameM); put(m, x, y, z); g.add(m); };
  winFrame(1.62, 0.08, 0.1, -1.2, 2.19, -2.3);   // atas
  winFrame(1.62, 0.08, 0.1, -1.2, 1.01, -2.3);   // bawah
  winFrame(0.08, 1.18, 0.1, -1.99, 1.6, -2.3);   // kiri
  winFrame(0.08, 1.18, 0.1, -0.41, 1.6, -2.3);   // kanan
  winFrame(0.06, 1.1, 0.06, -1.2, 1.6, -2.3);    // mullion vertikal
  winFrame(1.5, 0.06, 0.06, -1.2, 1.6, -2.3);    // mullion horizontal
  const sill = box(1.7, 0.05, 0.18, M.woodLight); put(sill, -1.2, 0.99, -2.26); g.add(sill);
  const sky = glass(1.5, 1.1, M.sky); put(sky, -1.2, 1.6, -2.5); g.add(sky);
  const winGlass = glass(1.5, 1.1, M.glass); put(winGlass, -1.2, 1.6, -2.32); g.add(winGlass);
  // batang tirai + 2 gorden berlipat
  const rod = cyl(0.018, 0.018, 2.0, 8, M.steelDark); put(rod, -1.2, 2.32, -2.2, 0, 0, Math.PI / 2); g.add(rod);
  for (const s of [-1, 1]) {
    const fin = sph(0.035, M.woodDark, 8, 6); put(fin, -1.2 + s * 1.0, 2.32, -2.2); g.add(fin);
    const cur = clothPanel(0.5, 1.35, s < 0 ? M.fabricSage : M.fabricCream, 0.045, 4);
    put(cur, -1.2 + s * 0.78, 1.62, -2.18); g.add(cur);
  }
  // pot herba di ambang jendela (3 pot lathe + rumpun daun)
  for (let i = 0; i < 3; i++) {
    const x = -1.65 + i * 0.45;
    const pot = lathe([[0, 0], [0.055, 0], [0.07, 0.02], [0.075, 0.1], [0.06, 0.12], [0, 0.12]], 12, M.terracotta);
    put(pot, x, 1.015, -2.26); g.add(pot);
    for (let j = 0; j < 3; j++) {
      const leaf = sph(0.05, j % 2 ? M.leafLight : M.leaf, 8, 6);
      put(leaf, x + (j - 1) * 0.04, 1.16 + (j % 2) * 0.03, -2.26 + (j - 1) * 0.02);
      leaf.scale.y = 1.4; g.add(leaf);
    }
  }
}

// ============================================================================
// COUNTER L — kabinet bawah/atas, backsplash, sink, kompor, hood, kulkas
// ============================================================================
function cabinetDoor(g, x, y, z, w, h, ry, mat) {
  const d = box(w, h, 0.04, mat); put(d, x, y, z, ry); g.add(d);
  const panel = box(w - 0.14, h - 0.14, 0.02, mat); put(panel, x, y, z, ry); g.add(panel);
  // panel timbul: geser sedikit ke arah muka pintu
  const off = ry === 0 ? 0.03 : 0;
  panel.position.z += off;
  const knob = sph(0.028, M.steelDark, 8, 6);
  const kx = ry === 0 ? x + w / 2 - 0.1 : x;
  const kz = ry === 0 ? z + 0.04 : z + (ry > 0 ? 0.04 : -0.04);
  put(knob, kx, y, kz); g.add(knob);
  return d;
}

function buildBackCounter(g) {
  // carcass + toe kick + countertop batu
  const carc = box(5.8, 0.86, 0.58, M.cabSage); put(carc, -0.5, 0.44, -1.98); g.add(carc);
  const kick = box(5.7, 0.1, 0.5, M.dark); put(kick, -0.5, 0.05, -1.96); g.add(kick);
  const top = box(5.9, 0.05, 0.65, M.counter); put(top, -0.5, 0.905, -1.975); g.add(top);
  // 6 pintu kabinet bawah (muka z=-1,68) + panel + kenop
  for (let i = 0; i < 6; i++) {
    const x = -2.95 + i * 0.96;
    cabinetDoor(g, x, 0.48, -1.685, 0.88, 0.7, 0, M.cabSage);
  }
  // backsplash subway tile di atas counter
  const bs = plane(5.8, 0.62, M.backsplash); put(bs, -0.5, 1.24, -2.29); g.add(bs);
  // kabinet atas: kiri jendela (1,3 m) + kanan jendela (2,2 m)
  for (const [cx, w] of [[-2.75, 1.3], [1.3, 2.2]]) {
    const up = box(w, 0.8, 0.35, M.cabCream); put(up, cx, 1.95, -2.1); g.add(up);
    const n = Math.round(w / 0.7);
    for (let i = 0; i < n; i++) {
      const dx = cx - w / 2 + (w / n) * (i + 0.5);
      cabinetDoor(g, dx, 1.95, -1.915, w / n - 0.08, 0.68, 0, M.cabCream);
    }
    // lis bawah kabinet + strip LED hangat di bawahnya
    const trim = box(w, 0.04, 0.37, M.woodDark); put(trim, cx, 1.53, -2.1); g.add(trim);
  }
  const led = box(2.2, 0.015, 0.04, M.ledStrip); put(led, 1.3, 1.52, -1.95); g.add(led);
  const led2 = box(1.3, 0.015, 0.04, M.ledStrip); put(led2, -2.75, 1.52, -1.95); g.add(led2);
}

function buildLeftCounter(g) {
  // counter kiri sepanjang dinding kiri (z -2,28..0,8), pintu menghadap +x
  const carc = box(0.58, 0.86, 3.08, M.cabSage); put(carc, -3.18, 0.44, -0.74); g.add(carc);
  const kick = box(0.5, 0.1, 2.98, M.dark); put(kick, -3.16, 0.05, -0.74); g.add(kick);
  const top = box(0.65, 0.05, 3.18, M.counter); put(top, -3.175, 0.905, -0.74); g.add(top);
  for (let i = 0; i < 3; i++) {
    const z = -1.7 + i * 0.96;
    const d = box(0.04, 0.7, 0.88, M.cabSage); put(d, -2.885, 0.48, z); g.add(d);
    const panel = box(0.02, 0.56, 0.74, M.cabSage); put(panel, -2.86, 0.48, z); g.add(panel);
    const knob = sph(0.028, M.steelDark, 8, 6); put(knob, -2.84, 0.48, z + 0.34); g.add(knob);
  }
  const bs = plane(3.08, 0.62, M.backsplash); put(bs, -3.49, 1.24, -0.74, Math.PI / 2); g.add(bs);
  // kabinet atas kiri
  const up = box(0.35, 0.8, 1.8, M.cabCream); put(up, -3.3, 1.95, -1.1); g.add(up);
  for (let i = 0; i < 2; i++) {
    const z = -1.55 + i * 0.9;
    const d = box(0.04, 0.68, 0.82, M.cabCream); put(d, -3.115, 1.95, z); g.add(d);
    const knob = sph(0.028, M.steelDark, 8, 6); put(knob, -3.09, 1.95, z + 0.3); g.add(knob);
  }
  const trim = box(0.37, 0.04, 1.8, M.woodDark); put(trim, -3.3, 1.53, -1.1); g.add(trim);
  // rak terbuka di atas counter kiri (2 papan + piring tegak + mangkok)
  for (let i = 0; i < 2; i++) {
    const sh = box(0.3, 0.04, 1.4, M.woodLight); put(sh, -3.32, 1.62 + i * 0.45, 0.1); g.add(sh);
    for (let j = 0; j < 4; j++) {
      const plate = lathe([[0, 0], [0.09, 0], [0.11, 0.015], [0.12, 0.03], [0, 0.03]], 14, j % 2 ? M.ceramicBlue : M.ceramic);
      put(plate, -3.32, 1.64 + i * 0.45, -0.4 + j * 0.32, 0, -Math.PI / 2 + 0.12); g.add(plate);
    }
  }
}

function buildSink(g) {
  // bak sink stainless + air + keran TubeGeometry melengkung
  const rim = box(0.72, 0.04, 0.52, M.steel); put(rim, -1.2, 0.93, -1.98); g.add(rim);
  const basin = box(0.6, 0.16, 0.4, M.steelDark); put(basin, -1.2, 0.85, -1.98); g.add(basin);
  const water = plane(0.56, 0.36, M.water); put(water, -1.2, 0.9, -1.98, 0, -Math.PI / 2); g.add(water);
  const drain = cyl(0.05, 0.05, 0.01, 12, M.steel); put(drain, -1.2, 0.78, -1.98); g.add(drain);
  const base = cyl(0.05, 0.06, 0.1, 10, M.steel); put(base, -1.2, 0.98, -2.2); g.add(base);
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.2, 1.03, -2.2), new THREE.Vector3(-1.2, 1.32, -2.2),
    new THREE.Vector3(-1.2, 1.38, -2.05), new THREE.Vector3(-1.2, 1.28, -1.95),
  ]);
  const faucet = new THREE.Mesh(new THREE.TubeGeometry(curve, 14, 0.025, 8), M.steel);
  faucet.castShadow = true; g.add(faucet);
  const tip = cyl(0.03, 0.03, 0.06, 8, M.steelDark); put(tip, -1.2, 1.25, -1.95); g.add(tip);
  for (const s of [-1, 1]) { // kenop panas/dingin
    const knob = cyl(0.035, 0.04, 0.04, 10, s < 0 ? M.ceramicRed : M.ceramicBlue);
    put(knob, -1.2 + s * 0.22, 0.95, -2.2); g.add(knob);
  }
  // rak piring di samping sink: rangka kawat + 6 piring tegak
  const rackBase = box(0.4, 0.03, 0.34, M.steelDark); put(rackBase, -1.95, 0.945, -1.98); g.add(rackBase);
  for (let i = 0; i < 6; i++) {
    const plate = lathe([[0, 0], [0.08, 0], [0.1, 0.015], [0.11, 0.03], [0, 0.03]], 14, i % 2 ? M.ceramic : M.ceramicBlue);
    put(plate, -2.1 + i * 0.06, 0.96, -1.98, 0, -Math.PI / 2 + 0.1); g.add(plate);
    const wire = cyl(0.008, 0.008, 0.2, 5, M.steel); put(wire, -2.1 + i * 0.06, 1.05, -1.83, 0, 0, 0); g.add(wire);
  }
  // spons + botol sabun + sikat
  const sponge = box(0.12, 0.04, 0.07, M.plasticYellow); put(sponge, -0.82, 0.95, -2.18, 0.3); g.add(sponge);
  const soap = cyl(0.04, 0.045, 0.14, 10, M.plasticGreen); put(soap, -0.72, 1.0, -2.18); g.add(soap);
  const pump = cyl(0.012, 0.012, 0.07, 6, M.steelDark); put(pump, -0.72, 1.1, -2.18); g.add(pump);
  const pumpHead = box(0.06, 0.02, 0.02, M.steelDark); put(pumpHead, -0.7, 1.13, -2.18); g.add(pumpHead);
  const brush = box(0.05, 0.02, 0.16, M.woodLight); put(brush, -0.85, 0.94, -1.8, -0.4); g.add(brush);
  // keset di depan sink + rumbai
  const rug = plane(1.4, 0.7, M.rug); put(rug, -1.2, 0.005, -1.1, 0, -Math.PI / 2); g.add(rug);
  const fringeList = [];
  for (let i = 0; i < 10; i++) {
    fringeList.push({ geometry: new THREE.BoxGeometry(0.04, 0.008, 0.1), matrix: trs(-1.85 + i * 0.145, 0.006, -0.72, 0, 0, 0) });
    fringeList.push({ geometry: new THREE.BoxGeometry(0.04, 0.008, 0.1), matrix: trs(-1.85 + i * 0.145, 0.006, -1.48, 0, 0, 0) });
  }
  mergeParts(fringeList, M.fabricCream, g);
}

function buildStove(g) {
  // HERO kompor: kaca hitam + 4 tungku + jeruji + panel knop + oven
  const cooktop = box(1.2, 0.03, 0.55, M.blackGlass); put(cooktop, 0.9, 0.945, -1.98); g.add(cooktop);
  const burnerPos = [[0.6, -2.12], [1.2, -2.12], [0.6, -1.84], [1.2, -1.84]];
  for (let i = 0; i < 4; i++) {
    const [bx, bz] = burnerPos[i];
    const big = i < 2;
    const burner = cyl(big ? 0.11 : 0.09, big ? 0.11 : 0.09, 0.025, 16, M.steelDark);
    put(burner, bx, 0.97, bz); g.add(burner);
    const ring = torus(big ? 0.13 : 0.11, 0.012, M.steel, Math.PI * 2, 6, 16);
    put(ring, bx, 0.985, bz, 0, -Math.PI / 2); g.add(ring);
    for (let k = 0; k < 4; k++) { // jeruji tungku
      const bar = box(0.02, 0.015, big ? 0.3 : 0.25, M.steelDark);
      put(bar, bx, 0.99, bz, (k / 4) * Math.PI); g.add(bar);
    }
    const cap = cyl(0.04, 0.04, 0.015, 10, M.dark); put(cap, bx, 0.985, bz); g.add(cap);
  }
  // panel kontrol + 4 knop di muka kabinet kompor
  const panelStrip = box(1.2, 0.12, 0.03, M.steelDark); put(panelStrip, 0.9, 0.78, -1.67); g.add(panelStrip);
  for (let i = 0; i < 4; i++) {
    const knob = cyl(0.032, 0.032, 0.03, 10, M.steel);
    put(knob, 0.45 + i * 0.3, 0.78, -1.65, Math.PI / 2); g.add(knob);
    const mark = box(0.008, 0.03, 0.01, M.plasticRed); put(mark, 0.45 + i * 0.3, 0.8, -1.63); g.add(mark);
  }
  // oven di bawah kompor: pintu + kaca + gagang + rak dalam
  const ovenFrame = box(1.1, 0.58, 0.04, M.steelDark); put(ovenFrame, 0.9, 0.32, -1.68); g.add(ovenFrame);
  const ovenGlass = glass(0.9, 0.4, M.glass); put(ovenGlass, 0.9, 0.3, -1.655); g.add(ovenGlass);
  const ovenInner = box(0.9, 0.4, 0.02, M.dark); put(ovenInner, 0.9, 0.3, -1.68); g.add(ovenInner);
  for (let i = 0; i < 2; i++) {
    const rack = box(0.85, 0.015, 0.02, M.steel); put(rack, 0.9, 0.2 + i * 0.18, -1.67); g.add(rack);
  }
  const handle = cyl(0.02, 0.02, 1.0, 8, M.steel); put(handle, 0.9, 0.64, -1.62, 0, 0, Math.PI / 2); g.add(handle);
  for (const s of [-1, 1]) {
    const mount = box(0.04, 0.06, 0.06, M.steelDark); put(mount, 0.9 + s * 0.48, 0.64, -1.65); g.add(mount);
  }
  // handuk oven menggantung di gagang
  const towel = clothPanel(0.28, 0.34, M.fabricTerra, 0.02, 3);
  put(towel, 0.62, 0.45, -1.6, 0, 0, 0.06); g.add(towel);
  // --- panci di tungku belakang-kiri (Lathe + tutup + kuah + uap) ---
  const pot = lathe([[0, 0], [0.14, 0], [0.16, 0.03], [0.17, 0.18], [0.16, 0.22], [0, 0.22]], 18, M.steel);
  put(pot, 0.6, 0.99, -2.12); g.add(pot);
  const soupS = cyl(0.14, 0.14, 0.015, 14, M.soup); put(soupS, 0.6, 1.19, -2.12); g.add(soupS);
  for (const s of [-1, 1]) {
    const h = torus(0.045, 0.012, M.steelDark, Math.PI, 6, 10);
    put(h, 0.6 + s * 0.17, 1.12, -2.12, 0, 0, s > 0 ? 0 : Math.PI); g.add(h);
  }
  for (let i = 0; i < 3; i++) { // uap tipis (transparan, tanpa bayangan)
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.045 - i * 0.008, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.22 - i * 0.05, roughness: 1 }));
    put(puff, 0.6 + (i - 1) * 0.03, 1.32 + i * 0.09, -2.12); g.add(puff);
  }
  // --- wajan di tungku belakang-kanan (Lathe dangkal + 2 gagang) ---
  const wok = lathe([[0, 0], [0.1, 0], [0.2, 0.06], [0.23, 0.14], [0.22, 0.16], [0, 0.16]], 18, M.steelDark);
  put(wok, 1.2, 0.99, -2.12); g.add(wok);
  for (const s of [-1, 1]) {
    const hg = cyl(0.015, 0.015, 0.12, 6, M.woodDark); put(hg, 1.2 + s * 0.26, 1.1, -2.12, 0, 0, Math.PI / 2); g.add(hg);
  }
  // --- ketel di tungku depan-kiri (Lathe + cerat Tube + gagang torus) ---
  const kettle = lathe([[0, 0], [0.09, 0], [0.12, 0.03], [0.13, 0.16], [0.09, 0.22], [0.05, 0.24], [0, 0.24]], 18, M.steel);
  put(kettle, 0.6, 0.99, -1.84); g.add(kettle);
  const spCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.7, 1.05, -1.84), new THREE.Vector3(0.78, 1.12, -1.84),
    new THREE.Vector3(0.82, 1.2, -1.84),
  ]);
  const spout = new THREE.Mesh(new THREE.TubeGeometry(spCurve, 8, 0.018, 6), M.steel);
  spout.castShadow = true; g.add(spout);
  const kHandle = torus(0.07, 0.012, M.steelDark, Math.PI, 6, 12);
  put(kHandle, 0.51, 1.14, -1.84, 0, 0, Math.PI / 2); g.add(kHandle);
  const kLid = cyl(0.05, 0.05, 0.02, 10, M.steelDark); put(kLid, 0.6, 1.24, -1.84); g.add(kLid);
  // --- panci kecil + tutup di tungku depan-kanan ---
  const pan = lathe([[0, 0], [0.1, 0], [0.115, 0.02], [0.12, 0.12], [0.11, 0.14], [0, 0.14]], 16, M.ceramicBlue);
  put(pan, 1.2, 0.99, -1.84); g.add(pan);
  const panLid = lathe([[0, 0], [0.11, 0], [0.115, 0.02], [0.06, 0.05], [0, 0.05]], 16, M.steel);
  put(panLid, 1.2, 1.13, -1.84); g.add(panLid);
  const panKnob = sph(0.025, M.woodDark, 8, 6); put(panKnob, 1.2, 1.19, -1.84); g.add(panKnob);
  const panHandle = cyl(0.015, 0.015, 0.2, 6, M.woodDark); put(panHandle, 1.38, 1.06, -1.84, 0, 0, Math.PI / 2); g.add(panHandle);
  // rice cooker di counter kanan kompor
  const rc = lathe([[0, 0], [0.12, 0], [0.14, 0.03], [0.145, 0.16], [0.12, 0.2], [0, 0.2]], 18, M.ceramic);
  put(rc, 2.0, 0.93, -2.0); g.add(rc);
  const rcLid = lathe([[0, 0], [0.13, 0], [0.1, 0.04], [0.03, 0.06], [0, 0.06]], 16, M.plasticRed);
  put(rcLid, 2.0, 1.13, -2.0); g.add(rcLid);
  const rcBtn = box(0.05, 0.03, 0.02, M.plasticRed); put(rcBtn, 2.0, 1.02, -1.85); g.add(rcBtn);
  const rcVent = cyl(0.02, 0.02, 0.03, 8, M.steelDark); put(rcVent, 2.0, 1.2, -2.0); g.add(rcVent);
  // talenan + pisau + bawang di counter kanan
  const board = box(0.34, 0.025, 0.24, M.woodLight); put(board, 1.95, 0.945, -1.8, 0.2); g.add(board);
  const boardHole = torus(0.02, 0.008, M.woodDark, Math.PI * 2, 5, 10);
  put(boardHole, 2.08, 0.96, -1.72, 0, -Math.PI / 2); g.add(boardHole);
  const onion = sph(0.045, std({ color: 0xd8a0c8, roughness: 0.6 }), 10, 8);
  put(onion, 1.9, 0.98, -1.78); onion.scale.y = 0.75; g.add(onion);
  const tomato = sph(0.04, std({ color: 0xd42a2a, roughness: 0.4 }), 10, 8);
  put(tomato, 2.02, 0.975, -1.86); g.add(tomato);
  const tomato2 = sph(0.038, std({ color: 0xe86a2a, roughness: 0.4 }), 10, 8);
  put(tomato2, 1.84, 0.972, -1.88); g.add(tomato2);
}

function buildHood(g) {
  // cooker hood Extrude (trapesium) + cerobong + filter + lampu bawah
  const s = new THREE.Shape();
  s.moveTo(-0.65, 0); s.lineTo(0.65, 0); s.lineTo(0.45, 0.35); s.lineTo(-0.45, 0.35); s.closePath();
  const hoodGeo = new THREE.ExtrudeGeometry(s, { depth: 0.55, bevelEnabled: false });
  const hood = new THREE.Mesh(hoodGeo, M.steel);
  put(hood, 0.9, 1.82, -2.28); hood.castShadow = true; hood.receiveShadow = true; g.add(hood);
  const hoodBase = box(1.3, 0.03, 0.55, M.steelDark); put(hoodBase, 0.9, 1.81, -2.0); g.add(hoodBase);
  const chimney = box(0.5, 0.9, 0.4, M.steel); put(chimney, 0.9, 2.62, -2.08); g.add(chimney);
  const chimCap = box(0.56, 0.04, 0.46, M.steelDark); put(chimCap, 0.9, 3.08, -2.08); g.add(chimCap);
  for (let i = 0; i < 2; i++) { // filter berlubang: 5 bilah per panel
    for (let j = 0; j < 5; j++) {
      const slat = box(0.5, 0.015, 0.06, M.steelDark);
      put(slat, 0.9 + (i - 0.5) * 0.55, 1.795, -2.18 + j * 0.09); g.add(slat);
    }
  }
  const hoodLamp = box(0.5, 0.015, 0.06, M.ledStrip); put(hoodLamp, 0.9, 1.795, -1.78); g.add(hoodLamp);
  for (const s of [-1, 1]) {
    const btn = cyl(0.015, 0.015, 0.02, 8, M.steelDark); put(btn, 0.9 + s * 0.5, 1.79, -1.76); g.add(btn);
  }
}

function buildFridge(g) {
  // kulkas tinggi di sudut kanan-belakang, 2 pintu + magnet + dispenser
  const body = box(0.95, 1.95, 0.75, M.fridge); put(body, 2.85, 0.975, -1.9); g.add(body);
  const topDoor = box(0.9, 0.62, 0.04, M.fridgeDoor); put(topDoor, 2.85, 1.6, -1.51); g.add(topDoor);
  const botDoor = box(0.9, 1.22, 0.04, M.fridgeDoor); put(botDoor, 2.85, 0.65, -1.51); g.add(botDoor);
  const seam = box(0.9, 0.02, 0.045, M.steelDark); put(seam, 2.85, 1.28, -1.51); g.add(seam);
  for (const y of [1.6, 0.85]) { // gagang vertikal
    const h = cyl(0.018, 0.018, 0.42, 8, M.steelDark); put(h, 2.48, y, -1.48); g.add(h);
    for (const s of [-1, 1]) {
      const mount = box(0.03, 0.04, 0.04, M.steelDark); put(mount, 2.48, y + s * 0.18, -1.49); g.add(mount);
    }
  }
  // dispenser air di pintu freezer
  const disp = box(0.22, 0.3, 0.03, M.steelDark); put(disp, 3.05, 1.62, -1.5); g.add(disp);
  const lever = box(0.05, 0.12, 0.03, M.steel); put(lever, 3.05, 1.56, -1.48); g.add(lever);
  for (const [dy, col] of [[0.08, 0x2e7d5b], [0.02, 0x1e5aa8]]) {
    const b = box(0.06, 0.04, 0.015, std({ color: col, emissive: col, emissiveIntensity: 0.5 }));
    put(b, 3.05, 1.62 + dy, -1.48); g.add(b);
  }
  // magnet warna + catatan kertas + foto kecil di pintu
  const magCols = [0xd42a2a, 0x2e7d5b, 0xf5be2a, 0x1e5aa8, 0xe8a0b0, 0x7d3c98, 0xd88a3a, 0x2a2e33];
  const r = rngKit(11);
  for (let i = 0; i < 12; i++) {
    const mx = 2.55 + (i % 4) * 0.2, my = 0.35 + Math.floor(i / 4) * 0.22 + r.range(-0.03, 0.03);
    if (i % 3 === 0) {
      const mg = sph(0.025, std({ color: magCols[i % magCols.length], roughness: 0.4 }), 8, 6);
      put(mg, mx, my, -1.48); g.add(mg);
    } else {
      const mg = box(0.05, 0.05, 0.015, std({ color: magCols[i % magCols.length], roughness: 0.4 }));
      put(mg, mx, my, -1.48, r.range(-0.4, 0.4)); g.add(mg);
    }
  }
  const note = plane(0.24, 0.3, std({ map: noteTex(), roughness: 0.9 }));
  put(note, 2.75, 1.05, -1.485); note.castShadow = false; g.add(note);
  const photo = plane(0.18, 0.14, std({ map: skyTex(), roughness: 0.9 }));
  put(photo, 3.15, 0.95, -1.485, 0.1); photo.castShadow = false; g.add(photo);
  // atas kulkas: keranjang + kotak sereal + tanaman kecil
  const basket = box(0.4, 0.16, 0.3, M.woodMid); put(basket, 2.6, 2.03, -1.9); g.add(basket);
  for (const [x, col] of [[2.95, 0xd42a2a], [3.1, 0x2e7d5b]]) {
    const cereal = box(0.12, 0.3, 0.2, std({ color: col, roughness: 0.7 }));
    put(cereal, x, 2.1, -1.9, 0.1); g.add(cereal);
  }
  const miniPot = lathe([[0, 0], [0.05, 0], [0.06, 0.02], [0.065, 0.08], [0.05, 0.1], [0, 0.1]], 10, M.terracotta);
  put(miniPot, 3.2, 1.95, -2.05); g.add(miniPot);
  const miniLeaf = sph(0.06, M.leaf, 8, 6); put(miniLeaf, 3.2, 2.08, -2.05); miniLeaf.scale.y = 1.3; g.add(miniLeaf);
}

// ============================================================================
// ISLAND + STOOL + MEJA MAKAN + RAK GANTUNG + RAK BUMBU + PERALATAN
// ============================================================================
function buildIsland(g) {
  // island tengah (1,8 x 0,9) — countertop kayu, 2 pintu di muka +z
  const base = box(1.8, 0.86, 0.9, M.woodDark); put(base, 0.6, 0.44, 0.15); g.add(base);
  const kick = box(1.7, 0.1, 0.8, M.dark); put(kick, 0.6, 0.05, 0.15); g.add(kick);
  const top = box(1.95, 0.05, 1.05, M.woodLight); put(top, 0.6, 0.905, 0.15); g.add(top);
  for (const s of [-1, 1]) {
    cabinetDoor(g, 0.6 + s * 0.45, 0.48, 0.615, 0.82, 0.68, 0, M.woodMid);
  }
  // rel kaki kuningan di sisi stool
  const rail = cyl(0.015, 0.015, 1.7, 8, std({ color: 0xd4af37, metalness: 0.5, roughness: 0.4 }));
  put(rail, 0.6, 0.22, 0.62, 0, 0, Math.PI / 2); g.add(rail);
  // mangkok buah Lathe + 8 buah + daun
  const bowl = lathe([[0, 0], [0.1, 0], [0.16, 0.03], [0.19, 0.09], [0.18, 0.11], [0, 0.11]], 18, M.ceramicBlue);
  put(bowl, 0.15, 0.93, 0.1); g.add(bowl);
  const fruits = [
    [0xd88a2a, 0.05], [0xd42a2a, 0.048], [0x7a9a2a, 0.045], [0xe8a03a, 0.05],
    [0xd42a2a, 0.046], [0x8a5a2a, 0.042], [0xe8c84a, 0.048], [0x7a9a2a, 0.044],
  ];
  const r = rngKit(21);
  fruits.forEach(([col, rad], i) => {
    const a = (i / fruits.length) * Math.PI * 2;
    const f = sph(rad, std({ color: col, roughness: 0.35 }), 12, 10);
    put(f, 0.15 + Math.cos(a) * 0.07, 1.03 + (i % 3) * 0.02, 0.1 + Math.sin(a) * 0.07);
    g.add(f);
    if (i % 2 === 0) {
      const leaf = sph(0.025, M.leaf, 6, 5);
      put(leaf, 0.15 + Math.cos(a) * 0.07, 1.08, 0.1 + Math.sin(a) * 0.07, 0.4);
      leaf.scale.set(1.4, 0.5, 0.8); g.add(leaf);
    }
  });
  // talenan + pisau chef + tomat di atas island
  const board = box(0.4, 0.025, 0.28, M.woodLight); put(board, 1.0, 0.945, 0.32, -0.15); g.add(board);
  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(0, 0); bladeShape.lineTo(0.17, 0); bladeShape.lineTo(0.2, 0.018);
  bladeShape.lineTo(0.05, 0.035); bladeShape.lineTo(0, 0.03); bladeShape.closePath();
  const blade = new THREE.Mesh(new THREE.ExtrudeGeometry(bladeShape, { depth: 0.008, bevelEnabled: false }), M.steel);
  put(blade, 0.92, 0.96, 0.3, -0.15, 0, 0); blade.castShadow = true; g.add(blade);
  const knifeHandle = box(0.09, 0.02, 0.03, M.woodDark); put(knifeHandle, 0.88, 0.965, 0.36, -0.15); g.add(knifeHandle);
  const tom = sph(0.042, std({ color: 0xd42a2a, roughness: 0.4 }), 10, 8);
  put(tom, 1.12, 0.975, 0.28); g.add(tom);
  // tumpukan buku resep + buku terbuka di stand
  const bookCols = [0xb3261e, 0x2e7d5b];
  bookCols.forEach((col, i) => {
    const b = box(0.3, 0.05, 0.22, std({ color: col, roughness: 0.7 }));
    put(b, 1.35, 0.955 + i * 0.055, -0.12, (i % 2 ? 0.12 : -0.08)); g.add(b);
    const pages = box(0.28, 0.04, 0.2, std({ color: 0xf5f2e8, roughness: 0.9 }));
    put(pages, 1.35, 0.955 + i * 0.055, -0.12, (i % 2 ? 0.12 : -0.08)); g.add(pages);
  });
  const stand = box(0.34, 0.02, 0.26, M.woodDark); put(stand, 0.6, 0.97, -0.22, 0, -0.35); g.add(stand);
  for (const s of [-1, 1]) {
    const page = plane(0.15, 0.22, std({ color: 0xfdfaf0, roughness: 0.9, side: THREE.DoubleSide }));
    put(page, 0.6 + s * 0.08, 1.0, -0.22, s * 0.12, -0.35 + s * 0.12);
    page.castShadow = true; g.add(page);
  }
  // 4 toples kecil di tepi belakang island (tutup kayu)
  for (let i = 0; i < 4; i++) {
    const jar = lathe([[0, 0], [0.045, 0], [0.055, 0.02], [0.055, 0.11], [0.045, 0.13], [0, 0.13]], 12,
      new THREE.MeshStandardMaterial({ color: 0xd8e8f0, roughness: 0.2, transparent: true, opacity: 0.55 }));
    put(jar, -0.05 + i * 0.16, 0.93, -0.28); jar.castShadow = false; g.add(jar);
    const lid = cyl(0.05, 0.05, 0.025, 10, M.woodMid); put(lid, -0.05 + i * 0.16, 1.07, -0.28); g.add(lid);
  }
}

function buildStool(x, z, g) {
  const st = new THREE.Group();
  const seat = lathe([[0, 0], [0.16, 0], [0.19, 0.02], [0.19, 0.05], [0.1, 0.06], [0, 0.06]], 18, M.woodLight);
  put(seat, 0, 0.58, 0); st.add(seat);
  const cushion = cyl(0.17, 0.17, 0.03, 16, M.fabricTerra); put(cushion, 0, 0.63, 0); st.add(cushion);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const leg = cyl(0.02, 0.025, 0.6, 8, M.woodDark);
    put(leg, Math.cos(a) * 0.13, 0.3, Math.sin(a) * 0.13, 0, 0, Math.cos(a) * 0.12);
    leg.rotation.x = -Math.sin(a) * 0.12; st.add(leg);
  }
  const ring = torus(0.15, 0.012, M.steelDark, Math.PI * 2, 6, 16);
  put(ring, 0, 0.22, 0, 0, -Math.PI / 2); st.add(ring);
  st.position.set(x, 0, z);
  g.add(st);
  return st;
}

function buildChair(g, x, z, ry, cushionMat) {
  const c = new THREE.Group();
  const seat = box(0.42, 0.05, 0.42, M.woodMid); put(seat, 0, 0.45, 0); c.add(seat);
  const cushion = box(0.38, 0.04, 0.38, cushionMat); put(cushion, 0, 0.49, 0); c.add(cushion);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const leg = cyl(0.025, 0.03, 0.45, 8, M.woodDark); put(leg, sx * 0.17, 0.225, sz * 0.17); c.add(leg);
  }
  for (const s of [-1, 1]) { // tiang sandar
    const post = cyl(0.022, 0.022, 0.5, 8, M.woodDark); put(post, s * 0.17, 0.72, -0.19); c.add(post);
  }
  for (let i = 0; i < 3; i++) { // 3 bilah sandar
    const slat = box(0.36, 0.07, 0.025, M.woodMid);
    put(slat, 0, 0.62 + i * 0.14, -0.19, 0, -0.08); c.add(slat);
  }
  const topRail = box(0.4, 0.05, 0.03, M.woodDark); put(topRail, 0, 0.98, -0.2, 0, -0.08); c.add(topRail);
  c.position.set(x, 0, z); c.rotation.y = ry;
  g.add(c);
  return c;
}

function buildDining(g) {
  // meja kayu 1,5 x 0,9 + taplak gingham + 4 set makan + vas bunga
  for (let i = 0; i < 5; i++) { // papan meja bernuansa beda
    const plank = box(1.5, 0.03, 0.18, i % 2 ? M.woodLight : M.woodMid);
    put(plank, -2.0, 0.74, 0.94 + i * 0.18); g.add(plank);
  }
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const apron = box(1.3, 0.08, 0.04, M.woodDark); put(apron, -2.0, 0.68, 1.3 + sz * 0.42); g.add(apron);
    const leg = cyl(0.05, 0.06, 0.74, 10, M.woodDark); put(leg, -2.0 + sx * 0.62, 0.37, 1.3 + sz * 0.34); g.add(leg);
  }
  const apronSide = box(0.04, 0.08, 0.8, M.woodDark); put(apronSide, -2.68, 0.68, 1.3); g.add(apronSide);
  const apronSide2 = box(0.04, 0.08, 0.8, M.woodDark); put(apronSide2, -1.32, 0.68, 1.3); g.add(apronSide2);
  // taplak gingham menutupi tengah meja + menjuntai di sisi
  const clothTop = box(1.62, 0.015, 1.02, M.cloth); put(clothTop, -2.0, 0.762, 1.3); g.add(clothTop);
  for (const s of [-1, 1]) {
    const drape = plane(1.62, 0.16, M.cloth);
    put(drape, -2.0, 0.68, 1.3 + s * 0.51, 0, s * 0.1); drape.castShadow = true; g.add(drape);
  }
  // 4 kursi di sekeliling meja (menghadap meja)
  buildChair(g, -2.0, 1.98, Math.PI, M.fabricTerra);      // selatan
  buildChair(g, -2.0, 0.62, 0, M.fabricSage);             // utara
  buildChair(g, -2.88, 1.3, Math.PI / 2, M.fabricCream);  // barat
  buildChair(g, -1.12, 1.3, -Math.PI / 2, M.fabricTerra);  // timur
  // 4 set makan: piring Lathe + gelas + garpu + sendok + serbet
  const settings = [
    [-2.3, 1.62, 0], [-1.7, 1.62, 0], [-2.3, 0.98, Math.PI], [-1.7, 0.98, Math.PI],
  ];
  for (const [px, pz, pry] of settings) {
    const plate = lathe([[0, 0], [0.09, 0], [0.115, 0.015], [0.125, 0.03], [0, 0.03]], 16, M.ceramic);
    put(plate, px, 0.77, pz); g.add(plate);
    const glassCup = cyl(0.035, 0.03, 0.09, 12, M.glass);
    put(glassCup, px + 0.17, 0.815, pz - 0.12); glassCup.castShadow = false; g.add(glassCup);
    const fork = box(0.015, 0.008, 0.16, M.steel); put(fork, px - 0.17, 0.775, pz, pry); g.add(fork);
    const spoon = cyl(0.008, 0.008, 0.12, 6, M.steel); put(spoon, px + 0.17, 0.775, pz + 0.1, pry, Math.PI / 2); g.add(spoon);
    const spoonBowl = sph(0.02, M.steel, 8, 6); put(spoonBowl, px + 0.17, 0.775, pz + 0.17); spoonBowl.scale.set(1, 0.4, 1.3); g.add(spoonBowl);
    const napkin = box(0.12, 0.015, 0.12, M.fabricTerra); put(napkin, px, 0.775, pz + 0.18, 0.4); g.add(napkin);
  }
  // runner tengah + vas bunga Lathe + 5 bunga
  const runner = plane(1.5, 0.4, M.fabricTerra); put(runner, -2.0, 0.772, 1.3, 0, -Math.PI / 2); g.add(runner);
  const vase = lathe([[0, 0], [0.05, 0], [0.07, 0.02], [0.075, 0.14], [0.05, 0.2], [0.055, 0.22], [0, 0.22]], 16, M.ceramicBlue);
  put(vase, -2.0, 0.77, 1.3); g.add(vase);
  const petalCols = [0xe8a0b0, 0xf5be2a, 0xd42a2a, 0xe8a0b0, 0xf5f2e8];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const stem = cyl(0.008, 0.008, 0.22, 5, M.leaf);
    put(stem, -2.0 + Math.cos(a) * 0.03, 1.08, 1.3 + Math.sin(a) * 0.03, 0, 0, Math.cos(a) * 0.25);
    stem.rotation.x = -Math.sin(a) * 0.25; g.add(stem);
    const head = sph(0.035, std({ color: petalCols[i], roughness: 0.7 }), 8, 6);
    put(head, -2.0 + Math.cos(a) * 0.07, 1.2, 1.3 + Math.sin(a) * 0.07); g.add(head);
    for (let p = 0; p < 5; p++) {
      const pa = (p / 5) * Math.PI * 2;
      const petal = sph(0.018, std({ color: petalCols[i], roughness: 0.7 }), 6, 5);
      put(petal, -2.0 + Math.cos(a) * 0.07 + Math.cos(pa) * 0.035, 1.2, 1.3 + Math.sin(a) * 0.07 + Math.sin(pa) * 0.035);
      petal.scale.y = 0.6; g.add(petal);
    }
  }
}

function buildHangingRack(g) {
  // rak gantung di atas island: rangka Tube + rantai + panci/wajan gantung
  const railY = 2.05;
  for (const z of [-0.2, 0.5]) {
    const rail = cyl(0.02, 0.02, 1.3, 8, M.steelDark);
    put(rail, 0.6, railY, z, 0, 0, Math.PI / 2); g.add(rail);
  }
  for (const x of [0.0, 1.2]) {
    const bar = cyl(0.02, 0.02, 0.7, 8, M.steelDark);
    put(bar, x, railY, 0.15, Math.PI / 2); g.add(bar);
  }
  for (const [x, z] of [[0.0, -0.2], [1.2, -0.2], [0.0, 0.5], [1.2, 0.5]]) {
    const chain = cyl(0.012, 0.012, 1.0, 6, M.steelDark); put(chain, x, 2.55, z); g.add(chain);
    const link = torus(0.03, 0.008, M.steelDark, Math.PI * 2, 5, 8);
    put(link, x, railY, z); g.add(link);
  }
  // 3 panci gantung (Lathe) + 1 wajan + sendok sayur + spatula
  const hangPots = [
    [0.15, -0.2, 0.13, M.steel], [0.6, -0.2, 0.11, M.steelDark], [1.05, -0.2, 0.14, M.ceramicBlue],
  ];
  for (const [hx, hz, hr, hm] of hangPots) {
    const hook = cyl(0.01, 0.01, 0.12, 5, M.steelDark); put(hook, hx, 1.98, hz); g.add(hook);
    const p = lathe([[0, 0], [hr * 0.8, 0], [hr, 0.03], [hr * 1.02, 0.12], [hr * 0.95, 0.14], [0, 0.14]], 16, hm);
    put(p, hx, 1.82, hz); g.add(p);
  }
  const wokH = lathe([[0, 0], [0.09, 0], [0.17, 0.05], [0.19, 0.1], [0, 0.1]], 16, M.steelDark);
  put(wokH, 0.35, 1.86, 0.5); g.add(wokH);
  const hookW = cyl(0.01, 0.01, 0.1, 5, M.steelDark); put(hookW, 0.35, 1.99, 0.5); g.add(hookW);
  const ladleH = cyl(0.012, 0.012, 0.3, 6, M.woodMid); put(ladleH, 0.85, 1.85, 0.5, 0.15); g.add(ladleH);
  const ladle = sph(0.05, M.steel, 10, 8); put(ladle, 0.88, 1.68, 0.5); ladle.scale.y = 0.6; g.add(ladle);
  const spatH = cyl(0.015, 0.015, 0.28, 6, M.woodMid); put(spatH, 1.05, 1.86, 0.5, -0.12); g.add(spatH);
  const spat = box(0.07, 0.12, 0.015, M.steel); put(spat, 1.07, 1.66, 0.5, -0.12); g.add(spat);
  // celemek gantung di ujung rak
  const apron = clothPanel(0.34, 0.55, M.fabricSage, 0.025, 3);
  put(apron, 1.2, 1.72, 0.42, 0.5); g.add(apron);
  const apronStrap = box(0.34, 0.02, 0.02, M.fabricSage); put(apronStrap, 1.2, 2.0, 0.42, 0.5); g.add(apronStrap);
}

function buildSpiceShelves(g) {
  // rak bumbu di dinding belakang kanan: 2 papan + toples/kaleng di-merge
  for (let i = 0; i < 2; i++) {
    const sh = box(1.6, 0.04, 0.28, M.woodLight); put(sh, 1.6, 1.62 + i * 0.45, -2.14); g.add(sh);
    for (const s of [-1, 1]) {
      const bracket = box(0.03, 0.12, 0.2, M.steelDark); put(bracket, 1.6 + s * 0.7, 1.55 + i * 0.45, -2.2); g.add(bracket);
    }
  }
  // toples kaca (Lathe) + tutup kayu — di-merge per material via bake()
  const jarGeo = new THREE.LatheGeometry(
    [[0, 0], [0.05, 0], [0.06, 0.02], [0.06, 0.13], [0.05, 0.15], [0, 0.15]]
      .map(([r, y]) => new THREE.Vector2(r, y)), 12);
  const lidGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.025, 10);
  const jarList = [], lidList = [];
  const jarCols = [0xd8a03a, 0x8a4a2a, 0x2e7d5b, 0xd42a2a, 0xe8d8b8, 0x7a5a3a, 0xc06a44, 0x9a8a5a];
  for (let shelf = 0; shelf < 2; shelf++) {
    for (let i = 0; i < 8; i++) {
      const x = 0.95 + i * 0.185, y = 1.64 + shelf * 0.45;
      jarList.push({ geometry: jarGeo, matrix: trs(x, y, -2.14, 0, 0, 0) });
      lidList.push({ geometry: lidGeo, matrix: trs(x, y + 0.16, -2.14, 0, 0, 0) });
      const fill = cyl(0.045, 0.045, 0.07, 8, std({ color: jarCols[(i + shelf * 3) % jarCols.length], roughness: 0.8 }));
      put(fill, x, y + 0.06, -2.14); g.add(fill);
    }
  }
  mergeParts(jarList, new THREE.MeshStandardMaterial({ color: 0xd8e8f0, roughness: 0.2, transparent: true, opacity: 0.55 }), g)
    .castShadow = false;
  mergeParts(lidList, M.woodMid, g);
  // kaleng bumbu di rak bawah (silinder + label warna)
  for (let i = 0; i < 5; i++) {
    const can = cyl(0.05, 0.05, 0.12, 12, std({ color: jarCols[(i + 2) % jarCols.length], metalness: 0.3, roughness: 0.4 }));
    put(can, 1.0 + i * 0.3, 2.13, -2.14); g.add(can);
    const canLid = cyl(0.052, 0.052, 0.015, 12, M.steel); put(canLid, 1.0 + i * 0.3, 2.2, -2.14); g.add(canLid);
  }
  // label nama di 3 toples depan (GULA / KOPI / TEH)
  ['GULA', 'KOPI', 'TEH'].forEach((txt, i) => {
    const lb = plane(0.09, 0.045, std({ map: labelTex(txt), roughness: 0.9 }));
    put(lb, 0.95 + i * 0.185, 1.71, -2.075); lb.castShadow = false; g.add(lb);
  });
}

function buildLeftAppliances(g) {
  // microwave + toaster + blender + ketel listrik + kotak roti di counter kiri
  const mw = box(0.55, 0.32, 0.38, M.steel); put(mw, -3.18, 1.09, -1.7); g.add(mw);
  const mwDoor = glass(0.34, 0.24, M.blackGlass); put(mwDoor, -2.98, 1.09, -1.7, Math.PI / 2); g.add(mwDoor);
  const mwHandle = cyl(0.015, 0.015, 0.24, 6, M.steelDark); put(mwHandle, -2.97, 1.09, -1.52); g.add(mwHandle);
  for (let i = 0; i < 3; i++) {
    const btn = box(0.015, 0.03, 0.05, i === 0 ? M.plasticRed : M.ceramic);
    put(btn, -2.97, 1.2 - i * 0.06, -1.86); g.add(btn);
  }
  const mwScreen = box(0.015, 0.05, 0.12, std({ color: 0x2a4a3a, emissive: 0x66ff99, emissiveIntensity: 0.7 }));
  put(mwScreen, -2.97, 1.18, -1.7); g.add(mwScreen);
  // toaster + 2 roti muncul
  const toaster = box(0.28, 0.18, 0.16, M.steel); put(toaster, -3.18, 1.02, -0.9); g.add(toaster);
  for (const s of [-1, 1]) {
    const slot = box(0.2, 0.015, 0.03, M.dark); put(slot, -3.18, 1.11, -0.9 + s * 0.04); g.add(slot);
    const bread = box(0.18, 0.1, 0.02, std({ color: 0xe8c890, roughness: 0.9 }));
    put(bread, -3.18, 1.15, -0.9 + s * 0.04); g.add(bread);
  }
  const lever = box(0.03, 0.02, 0.06, M.steelDark); put(lever, -3.03, 1.0, -0.9); g.add(lever);
  // blender: alas + jar kaca Lathe + tutup
  const blBase = cyl(0.07, 0.09, 0.16, 12, M.steelDark); put(blBase, -3.18, 1.01, -0.35); g.add(blBase);
  const blJar = lathe([[0, 0], [0.06, 0], [0.075, 0.02], [0.08, 0.22], [0.07, 0.24], [0, 0.24]], 14,
    new THREE.MeshStandardMaterial({ color: 0xd8e8f0, roughness: 0.2, transparent: true, opacity: 0.5 }));
  put(blJar, -3.18, 1.09, -0.35); blJar.castShadow = false; g.add(blJar);
  const blJuice = cyl(0.06, 0.065, 0.12, 12, std({ color: 0xe8a03a, roughness: 0.4 }));
  put(blJuice, -3.18, 1.14, -0.35); g.add(blJuice);
  const blLid = cyl(0.075, 0.075, 0.025, 12, M.steelDark); put(blLid, -3.18, 1.34, -0.35); g.add(blLid);
  // ketel listrik
  const ek = lathe([[0, 0], [0.08, 0], [0.1, 0.03], [0.11, 0.15], [0.08, 0.2], [0.04, 0.22], [0, 0.22]], 16, M.plasticRed);
  put(ek, -3.18, 0.93, 0.15); g.add(ek);
  const ekHandle = torus(0.06, 0.012, M.steelDark, Math.PI, 6, 12);
  put(ekHandle, -3.08, 1.05, 0.15, 0, 0, Math.PI / 2); g.add(ekHandle);
  // kotak roti kayu + keranjang buah di counter kiri
  const breadBox = box(0.4, 0.2, 0.26, M.woodLight); put(breadBox, -3.18, 1.03, 0.55); g.add(breadBox);
  const breadTop = cyl(0.13, 0.13, 0.4, 12, M.woodMid); put(breadTop, -3.18, 1.13, 0.55, 0, 0, Math.PI / 2); breadTop.scale.set(1, 1, 0.62); g.add(breadTop);
  const basket = lathe([[0, 0], [0.1, 0], [0.14, 0.03], [0.16, 0.1], [0.15, 0.12], [0, 0.12]], 14, M.woodMid);
  put(basket, -3.18, 0.93, -1.15); g.add(basket);
  for (let i = 0; i < 4; i++) {
    const f = sph(0.04, std({ color: [0xd42a2a, 0xe8a03a, 0x7a9a2a, 0xd88a2a][i], roughness: 0.4 }), 10, 8);
    put(f, -3.18 + (i % 2 ? 0.05 : -0.05), 1.04 + Math.floor(i / 2) * 0.03, -1.15 + (i % 2 ? 0.03 : -0.03)); g.add(f);
  }
}

// ============================================================================
// DEKOR DINDING + PANTRY + SUDUT + LAMPU + buildDapur()
// ============================================================================
function buildWallDecor(g) {
  // jam dinding di dinding kiri (muka +x)
  const clockBody = cyl(0.19, 0.19, 0.04, 20, M.woodDark);
  put(clockBody, -3.47, 2.1, -0.6, 0, 0, Math.PI / 2); g.add(clockBody);
  const clockFace = plane(0.36, 0.36, std({ map: clockTex(), roughness: 0.6 }));
  put(clockFace, -3.445, 2.1, -0.6, Math.PI / 2); clockFace.castShadow = false; g.add(clockFace);
  const hourHand = box(0.015, 0.09, 0.01, M.dark); put(hourHand, -3.44, 2.13, -0.6, Math.PI / 2, 0, 0.6); g.add(hourHand);
  const minHand = box(0.012, 0.13, 0.01, M.dark); put(minHand, -3.44, 2.1, -0.55, Math.PI / 2, 0, -0.9); g.add(minHand);
  // kalender di dinding kiri
  const calFrame = box(0.03, 0.62, 0.5, M.woodDark); put(calFrame, -3.48, 1.7, 0.6); g.add(calFrame);
  const cal = plane(0.44, 0.56, std({ map: calendarTex(), roughness: 0.9 }));
  put(cal, -3.46, 1.7, 0.6, Math.PI / 2); cal.castShadow = false; g.add(cal);
  // poster resep berbingkai di dinding belakang kanan
  const pFrame = box(0.5, 0.62, 0.03, M.woodDark); put(pFrame, 2.35, 2.1, -2.28); g.add(pFrame);
  const poster = plane(0.44, 0.56, std({ map: posterTex(), roughness: 0.9 }));
  put(poster, 2.35, 2.1, -2.26); poster.castShadow = false; g.add(poster);
  // rel pisau magnetik + 3 pisau di dinding belakang
  const strip = box(0.7, 0.08, 0.02, M.steelDark); put(strip, 1.9, 1.55, -2.27); g.add(strip);
  for (let i = 0; i < 3; i++) {
    const bs = new THREE.Shape();
    bs.moveTo(0, 0); bs.lineTo(0.13, 0); bs.lineTo(0.16, 0.02);
    bs.lineTo(0.04, 0.035); bs.lineTo(0, 0.03); bs.closePath();
    const blade = new THREE.Mesh(new THREE.ExtrudeGeometry(bs, { depth: 0.006, bevelEnabled: false }), M.steel);
    put(blade, 1.62 + i * 0.22, 1.42, -2.26, 0, 0, -0.15); blade.castShadow = true; g.add(blade);
    const h = box(0.07, 0.025, 0.02, M.woodDark); put(h, 1.62 + i * 0.22, 1.38, -2.26, 0, 0, -0.15); g.add(h);
  }
  // tempat tisu dapur di bawah kabinet atas kanan + gulungan
  const towelRod = cyl(0.012, 0.012, 0.3, 6, M.steelDark); put(towelRod, 2.2, 1.46, -1.98, 0, 0, Math.PI / 2); g.add(towelRod);
  const roll = cyl(0.055, 0.055, 0.26, 14, std({ color: 0xf5f2e8, roughness: 0.95 }));
  put(roll, 2.2, 1.46, -1.98, 0, 0, Math.PI / 2); g.add(roll);
  const sheet = plane(0.24, 0.18, std({ color: 0xf5f2e8, roughness: 0.95, side: THREE.DoubleSide }));
  put(sheet, 2.2, 1.34, -1.95, 0, 0.12); sheet.castShadow = false; g.add(sheet);
  // rel handuk + 2 handuk berlipat di dinding belakang kiri
  const rail = cyl(0.015, 0.015, 0.7, 8, M.steelDark); put(rail, -2.75, 1.35, -2.24, 0, 0, Math.PI / 2); g.add(rail);
  for (let i = 0; i < 2; i++) {
    const towel = clothPanel(0.24, 0.4, i ? M.fabricCream : M.fabricSage, 0.02, 3);
    put(towel, -2.95 + i * 0.4, 1.14, -2.22); g.add(towel);
  }
  // celemek + sarung tangan oven di kait dinding kanan
  const hook = torus(0.03, 0.008, M.steelDark, Math.PI * 2, 5, 10);
  put(hook, 3.47, 2.0, 0.2, 0, Math.PI / 2); g.add(hook);
  const apron = clothPanel(0.36, 0.6, M.fabricTerra, 0.03, 3);
  put(apron, 3.46, 1.66, 0.2, -Math.PI / 2); g.add(apron);
  const mitt = box(0.16, 0.24, 0.05, M.fabricTerra); put(mitt, 3.45, 1.35, 0.55, 0, 0, 0.15); g.add(mitt);
  const mittThumb = box(0.06, 0.1, 0.05, M.fabricTerra); put(mittThumb, 3.44, 1.32, 0.62, 0, 0, 0.4); g.add(mittThumb);
}

function buildPantry(g) {
  // lemari pantry tinggi di dinding kanan + rak terbuka berisi kaleng
  const cab = box(0.55, 2.2, 1.1, M.cabCream); put(cab, 3.22, 1.1, -0.7); g.add(cab);
  for (let i = 0; i < 2; i++) {
    const d = box(0.04, 1.0, 0.48, M.cabCream); put(d, 2.935, 0.55 + i * 1.05, -0.7); g.add(d);
    const panel = box(0.02, 0.86, 0.36, M.cabCream); put(panel, 2.91, 0.55 + i * 1.05, -0.7); g.add(panel);
    const knob = sph(0.028, M.steelDark, 8, 6); put(knob, 2.9, 0.55 + i * 1.05, -0.48); g.add(knob);
  }
  // rak terbuka di dinding kanan depan pantry
  for (let i = 0; i < 3; i++) {
    const sh = box(0.3, 0.04, 1.1, M.woodLight); put(sh, 3.32, 0.7 + i * 0.55, 0.6); g.add(sh);
  }
  const canCols = [0xd42a2a, 0x2e7d5b, 0xf5be2a, 0x1e5aa8, 0xe8a0b0];
  for (let shelf = 0; shelf < 3; shelf++) {
    for (let i = 0; i < 4; i++) {
      const x = 3.32, z = 0.25 + i * 0.24, y = 0.72 + shelf * 0.55;
      if ((i + shelf) % 3 === 0) {
        const jar = lathe([[0, 0], [0.05, 0], [0.06, 0.02], [0.06, 0.13], [0.05, 0.15], [0, 0.15]], 12,
          new THREE.MeshStandardMaterial({ color: 0xd8e8f0, roughness: 0.2, transparent: true, opacity: 0.55 }));
        put(jar, x, y, z); jar.castShadow = false; g.add(jar);
        const lid = cyl(0.055, 0.055, 0.025, 10, M.woodMid); put(lid, x, y + 0.16, z); g.add(lid);
      } else if ((i + shelf) % 3 === 1) {
        const can = cyl(0.05, 0.05, 0.13, 12, std({ color: canCols[(i + shelf) % canCols.length], metalness: 0.3, roughness: 0.4 }));
        put(can, x, y + 0.065, z); g.add(can);
      } else {
        const pack = box(0.16, 0.22, 0.1, std({ color: canCols[(i + shelf * 2) % canCols.length], roughness: 0.7 }));
        put(pack, x, y + 0.11, z, 0.08); g.add(pack);
      }
    }
  }
}

function buildCorners(g) {
  // tempat sampah pedal di sudut kanan-depan
  const bin = cyl(0.22, 0.19, 0.55, 16, M.steelDark); put(bin, 3.1, 0.275, 1.9); g.add(bin);
  const binLid = cyl(0.22, 0.22, 0.04, 16, M.steel); put(binLid, 3.1, 0.57, 1.9); g.add(binLid);
  const binPedal = box(0.12, 0.03, 0.08, M.steelDark); put(binPedal, 3.1, 0.03, 2.12); g.add(binPedal);
  const binRim = torus(0.22, 0.015, M.steel, Math.PI * 2, 6, 16);
  put(binRim, 3.1, 0.55, 1.9, 0, -Math.PI / 2); g.add(binRim);
  // sapu + pengki bersandar di sudut kiri-depan
  const broomH = cyl(0.018, 0.018, 1.3, 6, M.woodLight); put(broomH, -3.32, 0.65, 2.0, 0, 0, 0.22); g.add(broomH);
  const broomHead = box(0.06, 0.22, 0.14, std({ color: 0xd8c86a, roughness: 0.95 }));
  put(broomHead, -3.36, 0.11, 2.02, 0, 0, 0.22); g.add(broomHead);
  const dustpan = box(0.2, 0.03, 0.24, M.plasticRed); put(dustpan, -3.2, 0.02, 2.15, -0.3); g.add(dustpan);
  const dustHandle = cyl(0.012, 0.012, 0.3, 5, M.plasticRed); put(dustHandle, -3.2, 0.06, 2.28, 0.5, 0, 0); g.add(dustHandle);
  // tanaman besar di sudut kanan-depan (pot Lathe + batang + rumpun daun)
  const pot = lathe([[0, 0], [0.2, 0], [0.25, 0.04], [0.27, 0.3], [0.23, 0.36], [0, 0.36]], 16, M.terracotta);
  put(pot, 3.0, 0, 1.55); g.add(pot);
  const soil = cyl(0.21, 0.21, 0.02, 14, M.dark); put(soil, 3.0, 0.35, 1.55); g.add(soil);
  const trunk = cyl(0.03, 0.05, 0.7, 8, M.woodDark); put(trunk, 3.0, 0.7, 1.55); g.add(trunk);
  const leafSpots = [[0, 1.25, 0, 0.42], [0.3, 1.05, 0.15, 0.3], [-0.28, 1.1, -0.1, 0.32], [0.1, 1.45, -0.2, 0.28], [-0.15, 1.35, 0.25, 0.26], [0.25, 1.3, -0.25, 0.24]];
  leafSpots.forEach(([dx, dy, dz, r], i) => {
    const leaf = sph(r, i % 2 ? M.leafLight : M.leaf, 12, 10);
    put(leaf, 3.0 + dx, dy, 1.55 + dz); leaf.scale.y = 0.85; g.add(leaf);
  });
  // tanaman gantung dekat jendela (pot + tali ke balok)
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const cord = cyl(0.008, 0.008, 0.7, 5, std({ color: 0xd8c8a8, roughness: 0.9 }));
    put(cord, -2.9 + Math.cos(a) * 0.08, 2.75, -1.6 + Math.sin(a) * 0.08, 0, 0, Math.cos(a) * 0.12);
    cord.rotation.x = -Math.sin(a) * 0.12; g.add(cord);
  }
  const hangPot = lathe([[0, 0], [0.09, 0], [0.11, 0.03], [0.12, 0.12], [0.1, 0.14], [0, 0.14]], 12, M.terracotta);
  put(hangPot, -2.9, 2.36, -1.6); g.add(hangPot);
  for (let i = 0; i < 4; i++) {
    const leaf = sph(0.09, i % 2 ? M.leafLight : M.leaf, 8, 6);
    put(leaf, -2.9 + (i % 2 ? 0.07 : -0.07), 2.52 + (i % 2) * 0.05, -1.6 + (i < 2 ? 0.05 : -0.05));
    leaf.scale.y = 1.3; g.add(leaf);
  }
  // lampu gantung di atas island (2 kap Lathe + bohlam emissive)
  for (const x of [0.15, 1.05]) {
    const cord = cyl(0.012, 0.012, 0.6, 6, M.dark); put(cord, x, 2.75, 0.15); g.add(cord);
    const shade = lathe([[0, 0], [0.05, 0], [0.06, 0.05], [0.14, 0.16], [0.17, 0.2], [0.16, 0.22], [0, 0.22]], 18, M.steelDark);
    put(shade, x, 2.24, 0.15); g.add(shade);
    const bulb = sph(0.05, M.lampWarm, 10, 8); put(bulb, x, 2.22, 0.15); bulb.castShadow = false; g.add(bulb);
  }
}

// ============================================================================
// DETAIL PASS — menaikkan kerapatan ke target 45-65k tris: ubin backsplash 3D,
// gelas gantung, teko, mixer, galon, peti sayur, dsb. (semua authored, bukan
// padding — tiap prop punya fungsi/ruang di dapur).
// ============================================================================
function buildDetailPass(g) {
  // ---- ubin subway 3D di backsplash (di-merge via bake, 2 mesh) ----
  // dinding belakang: 38 kolom x 8 baris, lewati bukaan jendela (y > 1,0)
  const tileGeo = new THREE.BoxGeometry(0.15, 0.075, 0.012);
  const backTiles = [];
  for (let row = 0; row < 8; row++) {
    const y = 0.99 + row * 0.0775;
    const off = (row % 2) * 0.076;
    for (let col = 0; col < 38; col++) {
      const x = -3.32 + col * 0.152 + off;
      if (x > 2.32) continue;
      if (x > -1.98 && x < -0.42 && y > 1.0) continue; // bukaan jendela
      backTiles.push({ geometry: tileGeo, matrix: trs(x, y, -2.283, 0, 0, 0) });
    }
  }
  mergeParts(backTiles, M.ceramic, g);
  // dinding kiri: 20 kolom x 8 baris, menghadap +x
  const leftTiles = [];
  for (let row = 0; row < 8; row++) {
    const y = 0.99 + row * 0.0775;
    const off = (row % 2) * 0.076;
    for (let col = 0; col < 20; col++) {
      const z = -2.2 + col * 0.152 + off;
      if (z > 0.72) continue;
      leftTiles.push({ geometry: tileGeo, matrix: trs(-3.483, y, z, 0, Math.PI / 2, 0) });
    }
  }
  mergeParts(leftTiles, M.ceramic, g);
  // ---- 6 mug gantung di bawah kabinet atas kanan ----
  const mugRail = cyl(0.012, 0.012, 1.7, 8, M.steelDark);
  put(mugRail, 1.3, 1.5, -1.95, 0, 0, Math.PI / 2); g.add(mugRail);
  for (let i = 0; i < 6; i++) {
    const x = 0.55 + i * 0.3;
    const hook = torus(0.02, 0.006, M.steelDark, Math.PI * 2, 5, 8);
    put(hook, x, 1.49, -1.95); g.add(hook);
    const mug = cyl(0.045, 0.04, 0.09, 14, [M.ceramic, M.ceramicBlue, M.ceramicRed, M.plasticGreen, M.ceramic, M.ceramicBlue][i]);
    put(mug, x, 1.43, -1.95); g.add(mug);
    const mHandle = torus(0.028, 0.008, M.steelDark, Math.PI, 6, 10);
    put(mHandle, x + 0.05, 1.43, -1.95, 0, 0, Math.PI / 2); g.add(mHandle);
  }
  // ---- mangkok susun di rak kiri atas + toples besar di atas kabinet ----
  for (let i = 0; i < 4; i++) {
    const bowl = lathe([[0, 0], [0.07, 0], [0.1, 0.03], [0.11, 0.07], [0.1, 0.09], [0, 0.09]], 14, i % 2 ? M.ceramicBlue : M.ceramic);
    put(bowl, -3.32, 2.09, -0.3 + i * 0.28); g.add(bowl);
  }
  for (let i = 0; i < 5; i++) {
    const x = i < 2 ? -3.0 + i * 0.5 : 0.6 + (i - 2) * 0.7;
    const jar = lathe([[0, 0], [0.08, 0], [0.1, 0.03], [0.11, 0.16], [0.09, 0.2], [0, 0.2]], 16,
      new THREE.MeshStandardMaterial({ color: 0xd8e8f0, roughness: 0.2, transparent: true, opacity: 0.5 }));
    put(jar, x, 2.35, -2.1); jar.castShadow = false; g.add(jar);
    const lid = cyl(0.095, 0.095, 0.03, 12, M.woodMid); put(lid, x, 2.56, -2.1); g.add(lid);
    const fill = cyl(0.08, 0.08, 0.1, 12, std({ color: [0xd8a03a, 0x8a4a2a, 0x2e7d5b, 0xd42a2a, 0xe8d8b8][i], roughness: 0.8 }));
    put(fill, x, 2.42, -2.1); g.add(fill);
  }
  // ---- set teko + 4 cangkir di meja makan ----
  const teapot = lathe([[0, 0], [0.08, 0], [0.11, 0.03], [0.12, 0.12], [0.09, 0.18], [0.05, 0.2], [0, 0.2]], 16, M.ceramicBlue);
  put(teapot, -2.45, 0.77, 1.3); g.add(teapot);
  const tpSpout = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.36, 0.84, 1.3), new THREE.Vector3(-2.3, 0.9, 1.3),
    new THREE.Vector3(-2.28, 0.96, 1.3),
  ]), 8, 0.015, 6), M.ceramicBlue);
  tpSpout.castShadow = true; g.add(tpSpout);
  const tpHandle = torus(0.05, 0.01, M.ceramicBlue, Math.PI, 6, 10);
  put(tpHandle, -2.55, 0.86, 1.3, 0, 0, Math.PI / 2); g.add(tpHandle);
  const tpLid = cyl(0.05, 0.05, 0.02, 10, M.ceramicBlue); put(tpLid, -2.45, 0.97, 1.3); g.add(tpLid);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    const cx = -2.45 + Math.cos(a) * 0.22, cz = 1.3 + Math.sin(a) * 0.22;
    const cup = lathe([[0, 0], [0.035, 0], [0.042, 0.01], [0.045, 0.06], [0.04, 0.07], [0, 0.07]], 14, M.ceramic);
    put(cup, cx, 0.77, cz); g.add(cup);
    const cHandle = torus(0.02, 0.006, M.ceramic, Math.PI, 5, 8);
    put(cHandle, cx + 0.045, 0.8, cz, 0, 0, Math.PI / 2); g.add(cHandle);
    const tea = cyl(0.035, 0.035, 0.01, 10, std({ color: 0x8a5a2a, roughness: 0.3 }));
    put(tea, cx, 0.825, cz); g.add(tea);
  }
  // ---- stand mixer + herb garden di counter belakang kiri ----
  const mxBase = box(0.26, 0.1, 0.16, M.ceramicRed); put(mxBase, -2.5, 0.98, -2.0); g.add(mxBase);
  const mxCol = box(0.08, 0.3, 0.12, M.ceramicRed); put(mxCol, -2.58, 1.15, -2.0); g.add(mxCol);
  const mxHead = box(0.3, 0.12, 0.14, M.ceramicRed); put(mxHead, -2.46, 1.32, -2.0); g.add(mxHead);
  const mxBowl = lathe([[0, 0], [0.07, 0], [0.1, 0.03], [0.11, 0.12], [0.1, 0.14], [0, 0.14]], 16, M.steel);
  put(mxBowl, -2.42, 1.03, -2.0); g.add(mxBowl);
  const mxLever = box(0.02, 0.08, 0.02, M.steelDark); put(mxLever, -2.58, 1.28, -1.92, 0.3); g.add(mxLever);
  const planter = box(0.5, 0.14, 0.2, M.woodMid); put(planter, -3.12, 1.0, -2.0); g.add(planter);
  for (let i = 0; i < 5; i++) {
    const x = -3.3 + i * 0.09;
    for (let j = 0; j < 3; j++) {
      const leaf = sph(0.035, j % 2 ? M.leafLight : M.leaf, 8, 6);
      put(leaf, x + (j - 1) * 0.025, 1.12 + (j % 2) * 0.03, -2.0 + (j - 1) * 0.02);
      leaf.scale.y = 1.5; g.add(leaf);
    }
  }
  // ---- karton telur di counter (6 telur) ----
  const carton = box(0.3, 0.06, 0.2, std({ color: 0xd8cfb8, roughness: 0.9 }));
  put(carton, -0.15, 0.96, -1.85, 0.15); g.add(carton);
  for (let i = 0; i < 6; i++) {
    const egg = sph(0.028, std({ color: 0xf5ead0, roughness: 0.5 }), 10, 8);
    put(egg, -0.25 + (i % 3) * 0.09, 1.0, -1.9 + Math.floor(i / 3) * 0.09, 0.15);
    egg.scale.y = 1.25; g.add(egg);
  }
  // ---- cake stand + kue di island + rolling pin + mortar ----
  const stand = lathe([[0, 0], [0.09, 0], [0.1, 0.02], [0.03, 0.04], [0.03, 0.1], [0.11, 0.11], [0.12, 0.13], [0, 0.13]], 16, M.ceramic);
  put(stand, 0.55, 0.93, 0.42); g.add(stand);
  const cake = cyl(0.09, 0.09, 0.06, 16, std({ color: 0x8a5a3a, roughness: 0.7 }));
  put(cake, 0.55, 1.09, 0.42); g.add(cake);
  const frosting = cyl(0.092, 0.092, 0.015, 16, std({ color: 0xf5ead0, roughness: 0.6 }));
  put(frosting, 0.55, 1.12, 0.42); g.add(frosting);
  const cherry = sph(0.02, std({ color: 0xd42a2a, roughness: 0.3 }), 8, 6);
  put(cherry, 0.55, 1.14, 0.42); g.add(cherry);
  const pin = cyl(0.025, 0.025, 0.3, 10, M.woodLight); put(pin, 1.35, 0.955, 0.35, 0, 0, Math.PI / 2); g.add(pin);
  for (const s of [-1, 1]) {
    const ph = cyl(0.015, 0.015, 0.07, 6, M.woodDark); put(ph, 1.35 + s * 0.18, 0.955, 0.35, 0, 0, Math.PI / 2); g.add(ph);
  }
  const mortar = lathe([[0, 0], [0.06, 0], [0.08, 0.02], [0.085, 0.08], [0.07, 0.1], [0, 0.1]], 14, M.terracotta);
  put(mortar, 0.9, 0.93, -0.25); g.add(mortar);
  const pestle = cyl(0.018, 0.025, 0.14, 8, M.woodDark); put(pestle, 0.9, 1.02, -0.25, 0, 0, 0.5); g.add(pestle);
  // ---- galon air + tabung LPG + selang ke kompor ----
  const galon = lathe([[0, 0], [0.13, 0], [0.15, 0.03], [0.16, 0.3], [0.14, 0.42], [0.06, 0.46], [0.055, 0.5], [0, 0.5]], 18,
    new THREE.MeshStandardMaterial({ color: 0x6ab8e8, roughness: 0.2, transparent: true, opacity: 0.6 }));
  put(galon, 2.75, 0, 2.05); galon.castShadow = false; g.add(galon);
  const galonCap = cyl(0.06, 0.06, 0.03, 10, M.plasticRed); put(galonCap, 2.75, 0.51, 2.05); g.add(galonCap);
  const galonRing = torus(0.14, 0.012, M.plasticRed, Math.PI * 2, 6, 14);
  put(galonRing, 2.75, 0.1, 2.05, 0, -Math.PI / 2); g.add(galonRing);
  const lpg = cyl(0.14, 0.14, 0.45, 16, std({ color: 0x2e7d5b, metalness: 0.3, roughness: 0.5 }));
  put(lpg, 2.45, 0.225, -1.55); g.add(lpg);
  const lpgTop = cyl(0.08, 0.12, 0.08, 12, std({ color: 0x2e7d5b, metalness: 0.3, roughness: 0.5 }));
  put(lpgTop, 2.45, 0.49, -1.55); g.add(lpgTop);
  const lpgValve = cyl(0.02, 0.02, 0.07, 6, M.steelDark); put(lpgValve, 2.45, 0.56, -1.55); g.add(lpgValve);
  const hoseCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(2.45, 0.55, -1.55), new THREE.Vector3(2.2, 0.3, -1.7),
    new THREE.Vector3(1.8, 0.2, -1.75), new THREE.Vector3(1.5, 0.5, -1.7),
  ]);
  const hose = new THREE.Mesh(new THREE.TubeGeometry(hoseCurve, 10, 0.015, 6), M.dark);
  hose.castShadow = true; g.add(hose);
  // ---- peti sayur di lantai + bangku pijakan + tempat sampah daur ulang ----
  const crate = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const slat = box(0.5, 0.07, 0.03, M.woodLight); put(slat, 0, 0.06 + i * 0.08, 0.16); crate.add(slat);
    const slatB = box(0.5, 0.07, 0.03, M.woodLight); put(slatB, 0, 0.06 + i * 0.08, -0.16); crate.add(slatB);
  }
  for (const s of [-1, 1]) {
    const side = box(0.03, 0.3, 0.32, M.woodLight); put(side, s * 0.24, 0.15, 0); crate.add(side);
  }
  const crateBase = box(0.5, 0.03, 0.35, M.woodMid); put(crateBase, 0, 0.02, 0); crate.add(crateBase);
  const vegs = [[0xd88a2a, 0.05, 0], [0x8a5a3a, 0.045, 1], [0x7a9a2a, 0.055, 0], [0xd42a2a, 0.045, 1], [0xe8c84a, 0.05, 0], [0x5a7a3a, 0.05, 1]];
  vegs.forEach(([col, rad, kind], i) => {
    const v = kind === 0 ? sph(rad, std({ color: col, roughness: 0.7 }), 10, 8)
      : new THREE.Mesh(new THREE.ConeGeometry(rad, 0.12, 8), std({ color: col, roughness: 0.7 }));
    put(v, -0.15 + (i % 3) * 0.15, 0.36, -0.07 + Math.floor(i / 3) * 0.14, 0, 0, kind ? Math.PI / 2 : 0);
    v.castShadow = true; crate.add(v);
  });
  crate.position.set(-1.0, 0, 0.6); g.add(crate);
  const step1 = box(0.4, 0.18, 0.3, M.woodLight); put(step1, 2.6, 0.09, -0.2); g.add(step1);
  const step2 = box(0.4, 0.18, 0.18, M.woodMid); put(step2, 2.6, 0.27, -0.26); g.add(step2);
  const bin2 = cyl(0.2, 0.17, 0.5, 16, M.plasticGreen); put(bin2, 3.05, 0.25, 1.3); g.add(bin2);
  const bin2Lid = cyl(0.2, 0.2, 0.04, 16, std({ color: 0x1e5a3a, roughness: 0.8 }));
  put(bin2Lid, 3.05, 0.52, 1.3); g.add(bin2Lid);
  // ---- soffit di atas kabinet belakang + 3 downlight + valance + keset depan ----
  const soffit = box(5.8, 0.28, 0.42, M.wall); put(soffit, -0.5, 2.49, -2.07); g.add(soffit);
  const soffitTrim = box(5.8, 0.04, 0.44, M.wallTrim); put(soffitTrim, -0.5, 2.35, -2.07); g.add(soffitTrim);
  for (let i = 0; i < 3; i++) {
    const dl = cyl(0.06, 0.06, 0.02, 14, M.ledStrip); put(dl, -2.2 + i * 1.7, 2.34, -2.07); dl.castShadow = false; g.add(dl);
    const dlRim = torus(0.06, 0.01, M.steelDark, Math.PI * 2, 6, 14);
    put(dlRim, -2.2 + i * 1.7, 2.33, -2.07, 0, -Math.PI / 2); g.add(dlRim);
  }
  const valance = clothPanel(1.7, 0.32, M.fabricSage, 0.04, 5);
  put(valance, -1.2, 2.42, -2.16); g.add(valance);
  const mat = plane(1.2, 0.6, std({ color: 0xb3563a, roughness: 0.95 }));
  put(mat, 0.6, 0.004, 2.0, 0, -Math.PI / 2); g.add(mat);
  const matFringe = [];
  for (let i = 0; i < 8; i++) {
    matFringe.push({ geometry: new THREE.BoxGeometry(0.04, 0.008, 0.08), matrix: trs(0.05 + i * 0.15, 0.005, 1.68, 0, 0, 0) });
    matFringe.push({ geometry: new THREE.BoxGeometry(0.04, 0.008, 0.08), matrix: trs(0.05 + i * 0.15, 0.005, 2.32, 0, 0, 0) });
  }
  mergeParts(matFringe, M.fabricCream, g);
  // ---- lampu gantung di atas meja makan (tanpa PointLight tambahan) ----
  const dcord = cyl(0.012, 0.012, 0.65, 6, M.dark); put(dcord, -2.0, 2.78, 1.3); g.add(dcord);
  const dshade = lathe([[0, 0], [0.05, 0], [0.06, 0.05], [0.15, 0.16], [0.18, 0.2], [0.17, 0.22], [0, 0.22]], 18, M.terracotta);
  put(dshade, -2.0, 2.24, 1.3); g.add(dshade);
  const dbulb = sph(0.05, M.lampWarm, 10, 8); put(dbulb, -2.0, 2.22, 1.3); dbulb.castShadow = false; g.add(dbulb);
  // ---- 3 talenan gantung di dinding kiri atas meja + 6 buku di rak pantry ----
  for (let i = 0; i < 3; i++) {
    const bd = box(0.02, 0.34 - i * 0.04, 0.22, [M.woodLight, M.woodMid, M.woodDark][i]);
    put(bd, -3.47, 1.75, 1.5 + i * 0.3); g.add(bd);
    const hole = torus(0.018, 0.007, M.woodDark, Math.PI * 2, 5, 8);
    put(hole, -3.46, 1.9 - i * 0.02, 1.5 + i * 0.3, 0, Math.PI / 2); g.add(hole);
  }
  const bookCols = [0xb3261e, 0x2e7d5b, 0x1e5aa8, 0xf5be2a, 0x7d3c98, 0xd88a3a];
  bookCols.forEach((col, i) => {
    const b = box(0.2, 0.28, 0.04, std({ color: col, roughness: 0.7 }));
    put(b, 3.32, 1.94, 0.3 + i * 0.14, 0, 0, i === 5 ? -0.25 : 0); g.add(b);
  });
}

// ---------- lighting (key + fill + practical; tanpa background/fog) ----------
function buildDapurLights(g) {
  g.add(new THREE.HemisphereLight(0xcfe8ff, 0x8a7a5a, 1.15));
  // matahari siang dari balik jendela (z negatif) — masuk lewat bukaan jendela
  const sun = new THREE.DirectionalLight(0xfff2d0, 2.2);
  sun.position.set(-1.2, 5, -6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.normalBias = 0.02;
  sun.shadow.bias = -0.0001;
  sun.shadow.camera.left = -6; sun.shadow.camera.right = 6;
  sun.shadow.camera.top = 6; sun.shadow.camera.bottom = -6;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 20;
  sun.target.position.set(-0.5, 0, 0.5);
  g.add(sun); g.add(sun.target);
  // fill dingin dari arah kamera (depan) supaya muka prop terbaca
  const fill = new THREE.DirectionalLight(0xbcd8ff, 0.7);
  fill.position.set(3, 4, 6);
  g.add(fill);
  // practical hangat: di atas island + di bawah kabinet atas belakang
  const islandLight = new THREE.PointLight(0xffb36b, 1.6, 5, 1.8);
  islandLight.position.set(0.6, 2.15, 0.15);
  g.add(islandLight);
  const underCab = new THREE.PointLight(0xffc98a, 1.2, 3.5, 1.8);
  underCab.position.set(1.3, 1.45, -1.8);
  g.add(underCab);
}

// ============================================================================
// EXPORT
// ============================================================================
export function buildDapur(scene) {
  const g = new THREE.Group();
  g.userData.kind = 'dapur';
  buildShell(g);
  buildBackCounter(g);
  buildLeftCounter(g);
  buildSink(g);
  buildStove(g);
  buildHood(g);
  buildFridge(g);
  buildIsland(g);
  buildStool(0.15, 0.95, g);
  buildStool(1.05, 0.95, g);
  buildDining(g);
  buildHangingRack(g);
  buildSpiceShelves(g);
  buildLeftAppliances(g);
  buildWallDecor(g);
  buildPantry(g);
  buildCorners(g);
  buildDetailPass(g);
  buildDapurLights(g);
  scene.add(g);
  g.userData.triangles = countTriangles(g);
  console.log('TRIANGLES dapur =', g.userData.triangles);
  return g;
}
