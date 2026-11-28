// ============================================================================
// set-gang-detail.js — GANG v2, dibuat ulang dari skill threejs-skills.
// Gang lebar (6 m) membujur sepanjang sumbu z. Kiri: deret ruko detail
// (buildDetailedRuko, 2-3 lantai, papan nama beda-beda). Kanan: deret
// rumah kampung detail (buildDetailedKampung) + 2 ruko. Ujung gang: masjid
// (menara + kubah hijau) samar lewat kabut + langit sore. TANPA karakter.
// Semua rumah pakai modul kita sendiri (vendor/buildings-detailed.js) —
// sepenuhnya bisa dikustomisasi. Semua prop baru pakai MeshStandardMaterial
// supaya style converter bisa mengonversinya (bukan MeshToonMaterial langsung).
//
// v2 vs v1 (teknik skill yang dipakai):
//   - threejs-geometry: mergeGeometries via bake() untuk paving (704 blok
//     jadi 3 mesh), curb (64 segmen jadi 1 mesh), genteng/komponen berulang;
//     TubeGeometry untuk knalpot motor, cerat pompa, gagang gerobak;
//     LatheGeometry untuk toren/gentong/ember/pot/isolator/finial masjid;
//     TorusGeometry untuk ban, velg, fender, rusuk kubah, pegangan.
//   - threejs-materials: roughness/metalness bervariasi per material
//     (ban kasar 0.95, kaca transparan, emas metalness 0.5, plastik 0.75).
//   - threejs-lighting: shadow bias/normalBias dipertahankan; lampu gerobak
//     + warung tetap PointLight hangat.
//   - threejs-performance: elemen berulang di-merge (paving/curb/slab),
//     bukan mesh per blok; draw call dijaga tetap rendah.
// ============================================================================
import * as THREE from 'three';
import { buildDetailedRuko, buildDetailedKampung, countTriangles } from './vendor/buildings-detailed.js';
import { rngKit, sagCurve, bake, trs } from './vendor/sakura/src/core/util.js';

const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0, ...o });

// Tinggi dasar prop di atas jalan paving (blok paving top ~0.04).
const PY = 0.04;

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Poster kecil di dinding (PULSA / ES TEH / MI AYAM / KOST / ...). */
function posterTex(text, bg, fg = '#fff8e8', sub = '') {
  return canvasTex(256, 384, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.14)'; g.fillRect(0, 0, w, 14);
    g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(10, 10, w - 20, h - 20);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = 'bold 44px sans-serif';
    const words = text.split(' ');
    if (words.length > 1 && text.length > 7) {
      g.fillText(words.slice(0, -1).join(' '), w / 2, h / 2 - 26);
      g.fillText(words[words.length - 1], w / 2, h / 2 + 26);
    } else {
      g.fillText(text, w / 2, h / 2);
    }
    if (sub) { g.font = 'bold 26px sans-serif'; g.fillText(sub, w / 2, h - 48); }
  });
}

/** Papan nama kecil gerobak / warung (teks horizontal). */
function signTexSmall(text, bg, fg = '#fff8e8') {
  return canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = fg; g.lineWidth = 5; g.strokeRect(8, 8, w - 16, h - 16);
    g.fillStyle = fg; g.font = 'bold 58px sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 2);
  });
}

/** Lantai gang: paving beton (kotak-kotak + noda + retak halus). */
function pavingTex() {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#8f887a'; g.fillRect(0, 0, w, h);
    const s = 64;
    for (let y = 0; y < h; y += s) {
      for (let x = 0; x < w; x += s) {
        const v = 118 + ((x * 7 + y * 13) % 26);
        g.fillStyle = `rgb(${v},${v - 4},${v - 14})`;
        g.fillRect(x + 2, y + 2, s - 4, s - 4);
      }
    }
    // noda + lumut di sela
    const r = rngKit(5);
    for (let i = 0; i < 90; i++) {
      g.fillStyle = r.chance(0.5) ? 'rgba(60,55,45,0.20)' : 'rgba(70,90,50,0.16)';
      const d = r.range(8, 30);
      g.beginPath(); g.arc(r.range(0, w), r.range(0, h), d, 0, Math.PI * 2); g.fill();
    }
    g.strokeStyle = 'rgba(50,45,38,0.5)'; g.lineWidth = 3;
    for (let i = 0; i < 8; i++) {
      g.beginPath();
      let x = r.range(0, w), y = r.range(0, h);
      g.moveTo(x, y);
      for (let j = 0; j < 4; j++) { x += r.range(-40, 40); y += r.range(-40, 40); g.lineTo(x, y); }
      g.stroke();
    }
  });
}

// ---------- mesh helpers (kembalikan mesh, pemanggil yang memosisikan) ----------
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
function mergeParts(list, mat, parent) {
  if (!list.length) return null;
  const m = new THREE.Mesh(bake(list), mat);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m);
  return m;
}

// ---------- motor matic v2 (menghadap +z) ----------
// v2: ban torus + jari-jari + cakram rem, fender segmen torus, knalpot
// TubeGeometry, garpu depan, lampu housing + lensa, lampu belakang,
// rak belakang, helm di jok (motor merah).
function buildMotorbike(colorHex, withHelmet = false) {
  const g = new THREE.Group();
  const body = std({ color: colorHex, roughness: 0.5 });
  const dark = std({ color: 0x2a2e33, roughness: 0.8 });
  const tyre = std({ color: 0x1a1c1e, roughness: 0.95 });
  const metal = std({ color: 0x9aa0a8, metalness: 0.5, roughness: 0.4 });
  const seatM = std({ color: 0x3a2e26, roughness: 0.95 });

  // roda: ban torus + velg + 5 jari-jari + cakram rem (depan)
  const wheel = (z, frontWheel) => {
    const w = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.065, 8, 18), tyre);
    put(w, 0, 0.28, z); w.castShadow = true; g.add(w);
    const hub = cyl(0.09, 0.09, 0.1, 10, metal); put(hub, 0, 0.28, z, 0, 0, Math.PI / 2); g.add(hub);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const sp = box(0.03, 0.22, 0.02, metal);
      put(sp, Math.cos(a) * 0.13, 0.28 + Math.sin(a) * 0.13, z, 0, 0, -a + Math.PI / 2);
      g.add(sp);
    }
    if (frontWheel) {
      const disc = cyl(0.14, 0.14, 0.02, 14, metal); put(disc, 0.06, 0.28, z, 0, 0, Math.PI / 2); g.add(disc);
    }
  };
  wheel(0.62, true); wheel(-0.58, false);
  // fender segmen torus di atas roda
  for (const z of [0.62, -0.58]) {
    const f = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.035, 6, 12, Math.PI * 0.7), body);
    put(f, 0, 0.28, z, 0, 0, Math.PI * 0.15); f.castShadow = true; g.add(f);
  }
  const b = box(0.5, 0.3, 1.35, body); put(b, 0, 0.48, 0); g.add(b);           // bodi
  const cowl = box(0.42, 0.42, 0.4, body); put(cowl, 0, 0.62, 0.55, 0, -0.25); g.add(cowl); // tameng depan
  const floor = box(0.34, 0.06, 0.5, dark); put(floor, 0, 0.32, 0.05); g.add(floor); // dek kaki
  const seat = box(0.42, 0.12, 0.62, seatM); put(seat, 0, 0.72, -0.28); g.add(seat);
  const rear = box(0.46, 0.22, 0.3, body); put(rear, 0, 0.58, -0.62); g.add(rear); // buntut
  // garpu depan (2 batang miring ke as roda depan)
  for (const s of [-1, 1]) {
    const fork = cyl(0.02, 0.02, 0.62, 5, metal);
    put(fork, s * 0.12, 0.62, 0.6, 0, 0, 0); fork.rotation.x = 0.35; g.add(fork);
  }
  const bar = cyl(0.025, 0.025, 0.56, 6, metal); put(bar, 0, 0.95, 0.5, 0, 0, Math.PI / 2); g.add(bar);
  for (const s of [-1, 1]) {
    const grip = cyl(0.035, 0.035, 0.12, 6, dark); put(grip, s * 0.26, 0.95, 0.5, 0, 0, Math.PI / 2); g.add(grip);
    const stalk = cyl(0.015, 0.015, 0.22, 5, metal); put(stalk, s * 0.2, 1.08, 0.52, 0.3, 0, s * -0.2); g.add(stalk);
    const mir = box(0.09, 0.06, 0.02, dark); put(mir, s * 0.24, 1.2, 0.55, s * 0.3); g.add(mir);
  }
  // lampu depan: housing + lensa menyala; lampu belakang merah
  const housing = cyl(0.09, 0.1, 0.06, 10, dark); put(housing, 0, 0.68, 0.76, Math.PI / 2 - 0.25, 0, 0); g.add(housing);
  const lampM = std({ color: 0xfff2c0, emissive: 0xffe9a8, emissiveIntensity: 0.4 });
  const head = sph(0.07, lampM, 10, 8); put(head, 0, 0.68, 0.78, 0, -0.25); head.scale.set(1, 1, 0.5); g.add(head);
  const tail = box(0.14, 0.06, 0.03, std({ color: 0xd42a2a, emissive: 0x881111, emissiveIntensity: 0.5 }));
  put(tail, 0, 0.62, -0.79); g.add(tail);
  // knalpot: TubeGeometry melengkung + muffler
  const exCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.12, 0.32, 0.15), new THREE.Vector3(0.16, 0.3, -0.2),
    new THREE.Vector3(0.17, 0.35, -0.5), new THREE.Vector3(0.17, 0.42, -0.72),
  ]);
  const exhaust = new THREE.Mesh(new THREE.TubeGeometry(exCurve, 10, 0.04, 6), metal);
  exhaust.castShadow = true; g.add(exhaust);
  const muff = cyl(0.06, 0.05, 0.22, 8, metal); put(muff, 0.17, 0.42, -0.78, Math.PI / 2 - 0.3, 0, 0); g.add(muff);
  // rak belakang (3 jeruji) + plat nomor
  for (let i = 0; i < 3; i++) {
    const rack = box(0.4, 0.02, 0.04, metal); put(rack, 0, 0.72, -0.55 - i * 0.09); g.add(rack);
  }
  const plate = box(0.2, 0.14, 0.02, std({ color: 0xf5f2e8 })); put(plate, 0, 0.55, -0.79); g.add(plate);
  const stand = cyl(0.02, 0.02, 0.4, 5, metal); put(stand, -0.2, 0.2, -0.1, 0, 0, 0.5); g.add(stand);
  // helm di jok (motor merah)
  if (withHelmet) {
    const helm = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), body);
    put(helm, 0, 0.78, -0.28); helm.castShadow = true; g.add(helm);
    const visor = box(0.2, 0.07, 0.02, new THREE.MeshStandardMaterial({ color: 0x2a3a4a, roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.7 }));
    put(visor, 0, 0.82, -0.15, 0, -0.2); g.add(visor);
  }
  g.userData.triangles = countTriangles(g);
  return g;
}

// ---------- gerobak sate / bakso v2 (menghadap +z) ----------
// v2: badan bilah kayu (bukan kotak polos), etalase berbingkai kaca,
// sate: tusuk + kubus daging; bakso: panci lathe + mangkok + sendok sayur,
// atap berusuk, roda torus + jari-jari, tabung gas, botol saus.
function buildGerobak(kind) {
  const g = new THREE.Group();
  const wood = std({ color: 0x7a5230, roughness: 0.9 });
  const woodDark = std({ color: 0x5a3a22, roughness: 0.9 });
  const metal = std({ color: 0x8a9098, metalness: 0.4, roughness: 0.5 });
  const tyre = std({ color: 0x1a1c1e, roughness: 0.95 });
  const glassM = new THREE.MeshStandardMaterial({ color: 0xbfe0ea, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.4 });

  // rangka bawah + badan bilah kayu (depan + samping, ada celah)
  for (const s of [-1, 1]) {
    const beam = box(0.06, 0.08, 0.62, woodDark); put(beam, s * 0.55, 0.32, 0); g.add(beam);
  }
  const beamF = box(1.15, 0.08, 0.06, woodDark); put(beamF, 0, 0.32, 0.3); g.add(beamF);
  const beamB = box(1.15, 0.08, 0.06, woodDark); put(beamB, 0, 0.32, -0.3); g.add(beamB);
  for (let i = 0; i < 5; i++) {
    const y = 0.4 + i * 0.11;
    const slatF = box(1.15, 0.09, 0.03, wood); put(slatF, 0, y, 0.31); g.add(slatF);
    const slatB = box(1.15, 0.09, 0.03, wood); put(slatB, 0, y, -0.31); g.add(slatB);
    for (const s of [-1, 1]) {
      const slatS = box(0.03, 0.09, 0.56, wood); put(slatS, s * 0.57, y, 0); g.add(slatS);
    }
  }
  const top = box(1.2, 0.06, 0.67, woodDark); put(top, 0, 0.95, 0); g.add(top);
  // etalase berbingkai: 4 bingkai kayu + kaca transparan
  const disp = box(1.0, 0.42, 0.5, glassM); put(disp, 0, 1.18, 0); disp.castShadow = false; g.add(disp);
  for (const [w, h, x, y] of [[1.06, 0.05, 0, 1.42], [1.06, 0.05, 0, 0.94], [0.05, 0.5, -0.51, 1.18], [0.05, 0.5, 0.51, 1.18]]) {
    const fr = box(w, h, 0.04, woodDark); put(fr, x, y, 0.27); g.add(fr);
  }
  if (kind === 'sate') {
    const grill = box(0.7, 0.08, 0.35, std({ color: 0x2a2e33 })); put(grill, -0.1, 1.42, 0); g.add(grill);
    for (let i = 0; i < 5; i++) {
      const sk = cyl(0.012, 0.012, 0.5, 4, std({ color: 0xd8c8a8 })); put(sk, -0.35 + i * 0.14, 1.47, 0, 0, 0, Math.PI / 2); g.add(sk);
      for (let j = 0; j < 3; j++) {
        const meat = box(0.045, 0.045, 0.045, std({ color: 0x8a4a2a, roughness: 0.85 }));
        put(meat, -0.32 + i * 0.14, 1.47, -0.12 + j * 0.1); g.add(meat);
      }
    }
    // arang di bawah panggangan (butir hitam)
    for (let i = 0; i < 6; i++) {
      const coal = sph(0.035, std({ color: 0x1a1a1a }), 6, 5);
      put(coal, -0.35 + i * 0.14, 1.38, 0.05); g.add(coal);
    }
  } else {
    // panci bakso LATHE (profil berlekuk) + kuah + mangkok + sendok sayur
    const potPts = [
      new THREE.Vector2(0.0, 0), new THREE.Vector2(0.16, 0), new THREE.Vector2(0.2, 0.04),
      new THREE.Vector2(0.22, 0.2), new THREE.Vector2(0.2, 0.28), new THREE.Vector2(0.0, 0.28),
    ];
    const pot = new THREE.Mesh(new THREE.LatheGeometry(potPts, 14), metal);
    put(pot, -0.2, 1.42, 0); pot.castShadow = true; g.add(pot);
    const soup = cyl(0.17, 0.17, 0.02, 12, std({ color: 0xd8b878, roughness: 0.4 }));
    put(soup, -0.2, 1.68, 0); g.add(soup);
    for (let i = 0; i < 3; i++) {
      const bowl = cyl(0.09, 0.06, 0.07, 10, std({ color: 0xf5f2e8 })); put(bowl, 0.25 + (i % 2) * 0.18, 1.45 + Math.floor(i / 2) * 0.08, 0.1); g.add(bowl);
      const ball = sph(0.025, std({ color: 0xe8d8b8 }), 6, 5); put(ball, 0.25 + (i % 2) * 0.18, 1.5 + Math.floor(i / 2) * 0.08, 0.1); g.add(ball);
    }
    const ladleH = cyl(0.012, 0.012, 0.25, 4, metal); put(ladleH, 0.05, 1.6, 0, 0.4, 0, 0); g.add(ladleH);
    const ladle = sph(0.045, metal, 8, 6); put(ladle, 0.1, 1.5, 0, 0, 0); ladle.scale.y = 0.6; g.add(ladle);
  }
  // atap seng miring di 4 tiang + 5 rusuk + lampu hangat di bawahnya
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const p = cyl(0.025, 0.025, 0.55, 5, woodDark); put(p, sx * 0.52, 1.2, sz * 0.26); g.add(p);
  }
  const roof = box(1.3, 0.05, 0.8, std({ color: kind === 'sate' ? 0x2e7d5b : 0xb3261e })); put(roof, 0, 1.52, 0, 0, 0, 0.08); g.add(roof);
  for (let i = 0; i < 5; i++) {
    const rib = box(0.04, 0.03, 0.82, woodDark); put(rib, -0.52 + i * 0.26, 1.55, 0, 0, 0, 0.08); g.add(rib);
  }
  const bulb = sph(0.06, std({ color: 0xfff2c0, emissive: 0xffa050, emissiveIntensity: 1.6 })); put(bulb, 0, 1.42, 0.1); bulb.castShadow = false; g.add(bulb);
  const lamp = new THREE.PointLight(0xffa050, 1.4, 4.5, 1.6); lamp.position.set(0, 1.35, 0.3); g.add(lamp);
  // roda torus + jari-jari + gagang dorong (TubeGeometry) + tabung gas + botol saus
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.05, 8, 16), tyre);
    put(w, s * 0.6, 0.26, 0); w.castShadow = true; g.add(w);
    const hub = cyl(0.09, 0.09, 0.08, 8, metal); put(hub, s * 0.6, 0.26, 0, 0, 0, Math.PI / 2); g.add(hub);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const sp = box(0.025, 0.2, 0.02, metal);
      put(sp, s * 0.6, 0.26 + Math.sin(a) * 0.12, Math.cos(a) * 0.12, -a, 0, 0);
      g.add(sp);
    }
    const hCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(s * 0.35, 0.5, -0.3), new THREE.Vector3(s * 0.42, 0.55, -0.55),
      new THREE.Vector3(s * 0.45, 0.62, -0.8),
    ]);
    const h = new THREE.Mesh(new THREE.TubeGeometry(hCurve, 6, 0.022, 5), woodDark);
    h.castShadow = true; g.add(h);
  }
  const gas = cyl(0.09, 0.09, 0.3, 10, std({ color: 0x2e7d5b, metalness: 0.3, roughness: 0.5 }));
  put(gas, 0.35, 0.17, -0.15); g.add(gas);
  const valve = cyl(0.02, 0.02, 0.08, 5, metal); put(valve, 0.35, 0.36, -0.15); g.add(valve);
  const sauce = cyl(0.035, 0.04, 0.18, 8, std({ color: 0xd42a2a, roughness: 0.4 }));
  put(sauce, 0.45, 1.07, 0.2); g.add(sauce);
  const capS = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.06, 8), std({ color: 0xf5f2e8 }));
  put(capS, 0.45, 1.19, 0.2); g.add(capS);
  const sign = plane(0.85, 0.22, new THREE.MeshStandardMaterial({ map: signTexSmall(kind === 'sate' ? 'SATE' : 'BAKSO', kind === 'sate' ? '#b3261e' : '#1e5aa8'), roughness: 0.85 }));
  put(sign, 0, 0.62, 0.33); sign.castShadow = false; g.add(sign);
  g.userData.triangles = countTriangles(g);
  return g;
}

// ---------- warung kecil / etalase terbuka v2 (menghadap +z) ----------
// v2: dagangan nyata (botol + leher + tutup, kaleng, bungkus, toples lathe),
// awning 5 segmen terlipat + valance, timbangan gantung, cooler, termos,
// kantong plastik terikat.
function buildWarung() {
  const g = new THREE.Group();
  const wood = std({ color: 0x7a5230, roughness: 0.9 });
  const woodDark = std({ color: 0x5a3a22, roughness: 0.9 });
  const counter = box(1.7, 0.85, 0.6, wood); put(counter, 0, 0.43, 0); g.add(counter);
  const top = box(1.8, 0.06, 0.7, woodDark); put(top, 0, 0.88, 0); g.add(top);
  // rak belakang + dagangan: botol (badan+leher+tutup), kaleng, bungkus, toples
  const bottleCols = [0xd42a2a, 0x2e7d5b, 0xf5be2a, 0x1e5aa8, 0xe8a0b0, 0x7d3c98, 0xd88a3a];
  for (let s = 0; s < 2; s++) {
    const shelf = box(1.6, 0.05, 0.3, woodDark); put(shelf, 0, 1.25 + s * 0.45, -0.35); g.add(shelf);
    for (let i = 0; i < 7; i++) {
      const x = -0.6 + i * 0.2, y = 1.28 + s * 0.45;
      const kind = (i + s * 3) % 3;
      if (kind === 0) { // botol
        const b = cyl(0.05, 0.055, 0.22, 8, std({ color: bottleCols[(i + s) % bottleCols.length], roughness: 0.35 }));
        put(b, x, y + 0.11, -0.35); g.add(b);
        const neck = cyl(0.018, 0.03, 0.08, 6, std({ color: bottleCols[(i + s) % bottleCols.length], roughness: 0.35 }));
        put(neck, x, y + 0.26, -0.35); g.add(neck);
        const cap = cyl(0.02, 0.02, 0.03, 6, std({ color: 0xf5f2e8 })); put(cap, x, y + 0.31, -0.35); g.add(cap);
      } else if (kind === 1) { // kaleng
        const can = cyl(0.045, 0.045, 0.13, 10, std({ color: bottleCols[(i + s) % bottleCols.length], metalness: 0.5, roughness: 0.35 }));
        put(can, x, y + 0.065, -0.35); g.add(can);
      } else { // bungkus snack
        const pack = box(0.14, 0.2, 0.06, std({ color: bottleCols[(i + s) % bottleCols.length], roughness: 0.7 }));
        put(pack, x, y + 0.1, -0.35, 0.1); g.add(pack);
      }
    }
  }
  // toples kaca di atas meja kasir (lathe + tutup)
  const jarPts = [
    new THREE.Vector2(0.0, 0), new THREE.Vector2(0.09, 0), new THREE.Vector2(0.11, 0.03),
    new THREE.Vector2(0.11, 0.18), new THREE.Vector2(0.09, 0.22), new THREE.Vector2(0.0, 0.22),
  ];
  const jar = new THREE.Mesh(new THREE.LatheGeometry(jarPts, 10),
    new THREE.MeshStandardMaterial({ color: 0xd8e8f0, roughness: 0.2, transparent: true, opacity: 0.55 }));
  put(jar, -0.65, 0.91, 0.15); g.add(jar);
  const jarLid = cyl(0.1, 0.1, 0.03, 10, std({ color: 0xd42a2a })); put(jarLid, -0.65, 1.14, 0.15); g.add(jarLid);
  // tiang + awning 5 segmen terlipat (merah/putih bergantian, sudut beda) + valance
  for (const sx of [-1, 1]) {
    const p = cyl(0.03, 0.03, 1.9, 5, woodDark); put(p, sx * 0.8, 0.95, 0.25); g.add(p);
  }
  for (let i = 0; i < 5; i++) {
    const seg = plane(0.38, 0.95, new THREE.MeshStandardMaterial({
      color: i % 2 ? 0xf5f2e8 : 0xb3261e, side: THREE.DoubleSide, roughness: 0.85,
    }));
    put(seg, -0.76 + i * 0.38, 2.02, 0.35, 0, -0.5 + (i % 2 ? 0.12 : -0.12));
    seg.castShadow = true; g.add(seg);
  }
  const valance = plane(1.9, 0.16, new THREE.MeshStandardMaterial({ color: 0xb3261e, side: THREE.DoubleSide, roughness: 0.85 }));
  put(valance, 0, 1.62, 0.78, 0, -0.15); g.add(valance);
  const bulb = sph(0.055, std({ color: 0xfff2c0, emissive: 0xffa050, emissiveIntensity: 1.6 })); put(bulb, 0.3, 1.62, 0.2); bulb.castShadow = false; g.add(bulb);
  const lamp = new THREE.PointLight(0xffa050, 1.2, 4, 1.6); lamp.position.set(0.3, 1.55, 0.3); g.add(lamp);
  // timbangan gantung: cakram + kait + piringan
  const scaleDisc = cyl(0.09, 0.09, 0.03, 12, std({ color: 0xf5f2e8 })); put(scaleDisc, -0.5, 1.7, 0.35); g.add(scaleDisc);
  const scaleHook = cyl(0.012, 0.012, 0.15, 4, std({ color: 0x8a9098, metalness: 0.5 })); put(scaleHook, -0.5, 1.6, 0.35); g.add(scaleHook);
  const scalePan = cyl(0.11, 0.07, 0.04, 10, std({ color: 0x8a9098, metalness: 0.4 })); put(scalePan, -0.5, 1.52, 0.35); g.add(scalePan);
  // cooler box + termos di meja
  const cooler = box(0.5, 0.4, 0.35, std({ color: 0x2e7d5b, roughness: 0.7 })); put(cooler, 0.55, 1.11, -0.1); g.add(cooler);
  const coolerLid = box(0.52, 0.06, 0.37, std({ color: 0xf5f2e8 })); put(coolerLid, 0.55, 1.34, -0.1); g.add(coolerLid);
  const thermos = cyl(0.06, 0.06, 0.25, 10, std({ color: 0x1e5aa8, metalness: 0.4, roughness: 0.4 })); put(thermos, 0.15, 1.03, 0.2); g.add(thermos);
  const thermosCap = cyl(0.05, 0.05, 0.05, 8, std({ color: 0xd42a2a })); put(thermosCap, 0.15, 1.18, 0.2); g.add(thermosCap);
  // kantong plastik terikat (terjepit di bawah atap): badan lonjong + simpul
  for (const sx of [-0.6, 0.1, 0.6]) {
    const bag = sph(0.09, new THREE.MeshStandardMaterial({ color: 0xf5f2e8, transparent: true, opacity: 0.75, roughness: 0.6 }), 8, 6);
    put(bag, sx, 1.55, 0.55, 0, 0, 0.15); bag.scale.set(1, 1.3, 0.4); g.add(bag);
    const knot = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.07, 6), std({ color: 0xf5f2e8 }));
    put(knot, sx, 1.68, 0.55); g.add(knot);
  }
  const sign = plane(1.0, 0.26, new THREE.MeshStandardMaterial({ map: signTexSmall('WARUNG', '#2e7d5b'), roughness: 0.85 }));
  put(sign, 0, 1.05, 0.32); sign.castShadow = false; g.add(sign);
  g.userData.triangles = countTriangles(g);
  return g;
}

// ---------- sepeda v2 (menghadap +z) ----------
// v2: jari-jari 6 per roda, fender segmen torus, keranjang bilah,
// bel kuningan di stang.
function buildBicycle() {
  const g = new THREE.Group();
  const frame = std({ color: 0x2e7d5b, metalness: 0.4, roughness: 0.4 });
  const tyre = std({ color: 0x1a1c1e, roughness: 0.95 });
  const dark = std({ color: 0x2a2e33, roughness: 0.8 });
  const wheel = (z) => {
    const w = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.025, 6, 14), tyre);
    w.position.set(0, 0.32, z); w.castShadow = true; g.add(w);
    const hub = cyl(0.03, 0.03, 0.06, 6, dark); put(hub, 0, 0.32, z, 0, 0, Math.PI / 2); g.add(hub);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const sp = cyl(0.008, 0.008, 0.6, 4, dark);
      put(sp, 0, 0.32, z, 0, 0, a);
      g.add(sp);
    }
    const fender = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.02, 5, 10, Math.PI * 0.6), frame);
    put(fender, 0, 0.32, z, 0, 0, Math.PI * 0.2); fender.castShadow = true; g.add(fender);
  };
  wheel(0.5); wheel(-0.5);
  const tube = (x1, y1, z1, x2, y2, z2) => {
    const a = new THREE.Vector3(x1, y1, z1), b = new THREE.Vector3(x2, y2, z2);
    const len = a.distanceTo(b);
    const m = cyl(0.02, 0.02, len, 5, frame);
    m.position.copy(a).lerp(b, 0.5);
    m.lookAt(b); m.rotateX(Math.PI / 2);
    g.add(m);
  };
  tube(0, 0.32, 0.5, 0, 0.78, 0.05);      // down tube
  tube(0, 0.78, 0.05, 0, 0.32, -0.5);     // seat stays (ke roda belakang)
  tube(0, 0.78, 0.05, 0, 0.72, -0.5);     // top tube
  tube(0, 0.32, -0.5, 0, 0.72, -0.5);     // seat tube
  const bar = cyl(0.018, 0.018, 0.5, 5, dark); put(bar, 0, 0.85, 0.52, 0, 0, Math.PI / 2); g.add(bar);
  const bell = sph(0.035, std({ color: 0xd4af37, metalness: 0.6, roughness: 0.3 }), 8, 6);
  put(bell, 0.15, 0.88, 0.52); g.add(bell);
  const seat = box(0.1, 0.04, 0.26, dark); put(seat, 0, 0.78, -0.52); g.add(seat);
  const pedal = box(0.3, 0.03, 0.08, dark); put(pedal, 0, 0.3, -0.05); g.add(pedal);
  // keranjang depan bilah kayu (5 bilah mendatar + 2 tegak + bingkai)
  const basket = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const slat = box(0.34, 0.05, 0.02, std({ color: 0x9a8a5a, roughness: 0.9 }));
    put(slat, 0, 0.62 + i * 0.06, 0.68); basket.add(slat);
  }
  for (const s of [-1, 1]) {
    const up = box(0.03, 0.32, 0.02, std({ color: 0x7a6a42 })); put(up, s * 0.16, 0.76, 0.68); basket.add(up);
    const side = box(0.02, 0.3, 0.22, std({ color: 0x9a8a5a })); put(side, s * 0.17, 0.76, 0.56); basket.add(side);
  }
  const bBase = box(0.34, 0.03, 0.24, std({ color: 0x7a6a42 })); put(bBase, 0, 0.6, 0.56); basket.add(bBase);
  g.add(basket);
  g.userData.triangles = countTriangles(g);
  return g;
}

// ---------- pompa air tangan v2 + ember lathe + gayung ----------
function buildPump() {
  const g = new THREE.Group();
  const metal = std({ color: 0x2e7d5b, metalness: 0.4, roughness: 0.5 });
  const dark = std({ color: 0x2a2e33, roughness: 0.8 });
  const base = box(0.6, 0.14, 0.6, std({ color: 0x9a948c })); put(base, 0, 0.07, 0); g.add(base);
  const body = cyl(0.11, 0.13, 0.85, 10, metal); put(body, 0, 0.55, 0); g.add(body);
  // cerat melengkung (TubeGeometry) + ujung
  const spCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.92, 0), new THREE.Vector3(0.22, 0.95, 0),
    new THREE.Vector3(0.38, 0.9, 0), new THREE.Vector3(0.44, 0.78, 0),
  ]);
  const spout = new THREE.Mesh(new THREE.TubeGeometry(spCurve, 8, 0.035, 6), metal);
  spout.castShadow = true; g.add(spout);
  const spTip = cyl(0.045, 0.045, 0.08, 6, dark); put(spTip, 0.44, 0.74, 0); g.add(spTip);
  const handle = cyl(0.025, 0.025, 0.7, 5, dark); put(handle, -0.15, 0.95, 0, 0, 0, 0.9); g.add(handle);
  const grip = cyl(0.03, 0.03, 0.14, 5, dark); put(grip, -0.45, 1.18, 0, 0, 0, 0.9); g.add(grip);
  // ember LATHE (profil berlekuk) + gayung
  const bucketPts = [
    new THREE.Vector2(0.0, 0), new THREE.Vector2(0.12, 0), new THREE.Vector2(0.15, 0.03),
    new THREE.Vector2(0.17, 0.22), new THREE.Vector2(0.15, 0.26), new THREE.Vector2(0.0, 0.26),
  ];
  const bucket = new THREE.Mesh(new THREE.LatheGeometry(bucketPts, 12), std({ color: 0x1e5aa8, roughness: 0.7 }));
  put(bucket, 0.45, 0, 0.3); bucket.castShadow = true; g.add(bucket);
  const waterS = cyl(0.13, 0.13, 0.02, 10, std({ color: 0x4a6a8a, roughness: 0.2 })); put(waterS, 0.45, 0.24, 0.3); g.add(waterS);
  const dip = sph(0.07, std({ color: 0xd42a2a }), 8, 6); put(dip, 0.45, 0.32, 0.3); dip.scale.y = 0.6; g.add(dip);
  const dipH = cyl(0.015, 0.015, 0.25, 4, dark); put(dipH, 0.52, 0.4, 0.3, 0, 0, 0.7); g.add(dipH);
  g.userData.triangles = countTriangles(g);
  return g;
}

// ---------- kucing duduk (sederhana) ----------
function buildCat() {
  const g = new THREE.Group();
  const fur = std({ color: 0xd88a3a, roughness: 0.95 });
  const dark = std({ color: 0x2a2e33, roughness: 0.9 });
  const body = sph(0.15, fur, 10, 8); put(body, 0, 0.17, 0); body.scale.set(1, 1.25, 1); g.add(body);
  const chest = sph(0.11, std({ color: 0xf5ead0, roughness: 0.95 }), 8, 6); put(chest, 0, 0.16, 0.1); g.add(chest);
  const head = sph(0.105, fur, 10, 8); put(head, 0, 0.4, 0.02); g.add(head);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.09, 4), fur);
    put(ear, s * 0.06, 0.5, 0.02, 0, 0, s * -0.2); ear.castShadow = true; g.add(ear);
    const eye = sph(0.018, dark, 6, 5); put(eye, s * 0.04, 0.42, 0.11); eye.castShadow = false; g.add(eye);
  }
  const nose = sph(0.015, std({ color: 0xd47a8a }), 6, 5); put(nose, 0, 0.39, 0.125); nose.castShadow = false; g.add(nose);
  // ekor melingkar di samping badan
  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.14, 0.03, 0.05), new THREE.Vector3(0.22, 0.04, 0.14),
    new THREE.Vector3(0.16, 0.05, 0.22), new THREE.Vector3(0.05, 0.06, 0.2),
  ]);
  const tail = new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 8, 0.025, 5), fur);
  tail.castShadow = true; g.add(tail);
  g.userData.triangles = countTriangles(g);
  return g;
}

// ---------- jemuran bambu melintang gang + pakaian berlipat v2 ----------
// v2: kain = PlaneGeometry berlipat (vertex di-displace gelombang) +
// jepitan 2 per kain, bukan kotak datar.
function buildLaundryLine(y, z, seed) {
  const g = new THREE.Group();
  const r = rngKit(seed);
  const bamboo = std({ color: 0x9a8a5a, roughness: 0.9 });
  const pole = cyl(0.028, 0.028, 6.0, 6, bamboo);
  put(pole, 0, y, z, 0, 0, Math.PI / 2); g.add(pole);
  for (const nx of [-2.0, 0, 2.0]) { // ruas bambu
    const ring = cyl(0.034, 0.034, 0.05, 6, std({ color: 0x7a6a42 }));
    put(ring, nx, y, z, 0, 0, Math.PI / 2); g.add(ring);
  }
  const cols = [0xd42a2a, 0x2e7d5b, 0x1e5aa8, 0xf5be2a, 0xe8a0b0, 0xf5f2e8, 0x7d3c98];
  const n = 5;
  for (let i = 0; i < n; i++) {
    const x = -2.2 + i * 1.1 + r.range(-0.08, 0.08);
    const wdt = r.range(0.32, 0.45), hgt = r.pick([0.5, 0.62, 0.75]);
    // kain berlipat: bidang 6x8 segmen, z = gelombang sinus + lipatan tengah
    const cg = new THREE.PlaneGeometry(wdt, hgt, 6, 8);
    const pos = cg.attributes.position;
    const ph = r.range(0, Math.PI * 2);
    for (let v = 0; v < pos.count; v++) {
      const px = pos.getX(v), py = pos.getY(v);
      const fold = Math.sin((px / wdt) * Math.PI * 3 + ph) * 0.03 * (1 - (py + hgt / 2) / hgt * 0.3);
      const sway = Math.sin((py / hgt) * Math.PI) * 0.02;
      pos.setZ(v, fold + sway);
    }
    cg.computeVertexNormals();
    const cloth = new THREE.Mesh(cg, new THREE.MeshStandardMaterial({
      color: cols[(seed + i) % cols.length], roughness: 0.95, side: THREE.DoubleSide,
    }));
    cloth.castShadow = true;
    put(cloth, x, y - hgt / 2 + 0.02, z, r.range(-0.15, 0.15), 0, r.range(-0.08, 0.08));
    g.add(cloth);
    // 2 jepitan kayu di ujung atas kain
    for (const s of [-1, 1]) {
      const pin = box(0.04, 0.05, 0.05, std({ color: 0x8a6f4a }));
      put(pin, x + s * (wdt / 2 - 0.05), y + 0.01, z + 0.02); g.add(pin);
    }
  }
  g.userData.triangles = countTriangles(g);
  return g;
}

// ---------- burung kecil di kabel ----------
function buildBird() {
  const g = new THREE.Group();
  const dark = std({ color: 0x2a2e33, roughness: 0.9 });
  const body = sph(0.05, dark, 8, 6); put(body, 0, 0, 0); body.scale.set(1, 0.85, 1.4); g.add(body);
  const head = sph(0.032, dark, 8, 6); put(head, 0, 0.045, 0.06); g.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.04, 5), std({ color: 0xe8a03a }));
  put(beak, 0, 0.04, 0.1, Math.PI / 2); beak.castShadow = false; g.add(beak);
  const tail = box(0.03, 0.012, 0.09, dark); put(tail, 0, 0.02, -0.09, 0, -0.3); g.add(tail);
  g.userData.triangles = countTriangles(g);
  return g;
}

// ---------- lampu sore hangat (kontrak hex) ----------
function buildGangLights(scene) {
  scene.background = new THREE.Color(0xf7e6c6);
  scene.fog = new THREE.Fog(0xf7e6c6, 18, 60); // diperlebar: masjid di ~37 m harus tetap terbaca
  scene.add(new THREE.HemisphereLight(0x9fc8ff, 0x8a7a5a, 1.1));
  const sun = new THREE.DirectionalLight(0xffe0b3, 2.0);
  sun.position.set(8, 12, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  // threejs-lighting: normalBias + bias kecil melawan shadow acne.
  sun.shadow.normalBias = 0.02;
  sun.shadow.bias = -0.0001;
  sun.shadow.camera.left = -18; sun.shadow.camera.right = 18;
  sun.shadow.camera.top = 18; sun.shadow.camera.bottom = -18;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 50;
  sun.target.position.set(0, 0, -4);
  scene.add(sun); scene.add(sun.target);
  const bounce = new THREE.DirectionalLight(0xaebfff, 0.9);
  bounce.position.set(-4, 5, -3);
  scene.add(bounce);
}

// ---------- tanah + jalan paving 3D + selokan U-channel + daun + genangan ----------
// v2: jalan bukan lagi bidang tekstur — 704 blok paving 3D di-merge jadi
// 3 mesh (3 nuansa, jitter tinggi/rotasi), curb 64 segmen jadi 1 mesh,
// selokan U-channel nyata (dinding + dasar + air + tutup slab beralur +
// jeruji), 2 lubang got (manhole) berbingkai.
function buildGangStreet(scene) {
  const r = rngKit(99);
  // tanah dasar (debu/beton di luar gang)
  const ground = plane(36, 40, std({ color: 0x8a8578 }));
  put(ground, 0, -0.03, -2, 0, -Math.PI / 2); ground.receiveShadow = true; scene.add(ground);
  // paving 3D merge: 11 kolom x 64 baris (kolom 0 = jalur selokan)
  const blockGeo = new THREE.BoxGeometry(0.47, 0.08, 0.47);
  const shades = [std({ color: 0x8f887a }), std({ color: 0x9a938a }), std({ color: 0x847d72 })];
  const lists = [[], [], []];
  const pr = rngKit(99);
  for (let col = 1; col < 12; col++) {
    const x = -3 + 0.25 + col * 0.5;
    for (let row = 0; row < 64; row++) {
      const z = 13.75 - row * 0.5;
      const sh = (col * 7 + row * 13) % 3;
      lists[sh].push({
        geometry: blockGeo,
        matrix: trs(x + pr.range(-0.012, 0.012), pr.range(-0.008, 0.008), z + pr.range(-0.012, 0.012),
          0, pr.range(-0.02, 0.02), 0),
      });
    }
  }
  lists.forEach((list, i) => mergeParts(list, shades[i], scene));
  // curb: 64 segmen beton di tepi jalan, merge jadi 1 mesh
  const curbGeo = new THREE.BoxGeometry(0.22, 0.09, 0.98);
  const curbList = [];
  for (const s of [-1, 1]) {
    for (let i = 0; i < 32; i++) {
      curbList.push({
        geometry: curbGeo,
        matrix: trs(s * 3.1, 0.015 + pr.range(-0.005, 0.005), 13.5 - i, 0, 0, 0),
      });
    }
  }
  mergeParts(curbList, std({ color: 0x9a948c }), scene);
  // selokan U-channel di sisi kiri (x -2,8): 2 dinding + dasar + air
  const chanM = std({ color: 0x3a3630 });
  const wallL = box(0.05, 0.16, 28, chanM); put(wallL, -3.0, 0.0, -2); scene.add(wallL);
  const wallR = box(0.05, 0.16, 28, chanM); put(wallR, -2.6, 0.0, -2); scene.add(wallR);
  const chanBot = box(0.45, 0.04, 28, chanM); put(chanBot, -2.8, -0.06, -2); scene.add(chanBot);
  const water = plane(0.34, 26, new THREE.MeshStandardMaterial({ color: 0x2a3a4a, roughness: 0.2, metalness: 0.3 }));
  put(water, -2.8, 0.02, -2, 0, -Math.PI / 2); scene.add(water);
  // tutup slab beton berselang (4) — tiap slab 3 alur gelap
  for (const z of [10, 2, -6, -14]) {
    const slab = box(0.5, 0.05, 1.4, std({ color: 0x8a8578 }));
    put(slab, -2.8, 0.055, z); scene.add(slab);
    for (let k = -1; k <= 1; k++) {
      const groove = box(0.5, 0.012, 0.04, chanM);
      put(groove, -2.8, 0.082, z + k * 0.4); scene.add(groove);
    }
  }
  // jeruji got (z -10): bingkai + 5 batang besi
  const grateM = std({ color: 0x2a2e33, metalness: 0.4, roughness: 0.6 });
  for (const s of [-1, 1]) {
    const fb = box(0.04, 0.04, 1.4, grateM); put(fb, -2.8 + s * 0.19, 0.07, -10); scene.add(fb);
  }
  for (const s of [-1, 1]) {
    const fb = box(0.42, 0.04, 0.05, grateM); put(fb, -2.8, 0.07, -10 + s * 0.68); scene.add(fb);
  }
  for (let i = 0; i < 5; i++) {
    const bar = box(0.04, 0.03, 1.3, grateM); put(bar, -2.95 + i * 0.075, 0.07, -10); scene.add(bar);
  }
  // 2 lubang got (manhole): tutup besi + bingkai torus + 2 palang
  for (const [x, z] of [[1.2, 8], [-1.0, -11]]) {
    const mh = cyl(0.35, 0.35, 0.03, 16, std({ color: 0x4a4a50, metalness: 0.4, roughness: 0.6 }));
    put(mh, x, 0.045, z); scene.add(mh);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.02, 6, 18), std({ color: 0x3a3a40, metalness: 0.4 }));
    put(rim, x, 0.055, z, 0, -Math.PI / 2); rim.castShadow = true; scene.add(rim);
    for (const s of [-1, 1]) {
      const bar = box(0.5, 0.012, 0.05, std({ color: 0x3a3a40 })); put(bar, x, 0.062, z + s * 0.12); scene.add(bar);
    }
  }
  // tambalan aspal (3, sedikit miring) — di atas paving (PY 0.04)
  for (const [x, z, w, d, ry] of [[-1.8, 6, 1.4, 2.2, 0.06], [1.5, -1, 1.1, 1.8, -0.1], [-0.8, -8, 1.6, 2.4, 0.03]]) {
    const p = box(w, 0.02, d, std({ color: 0x3a3a40 }));
    put(p, x, 0.045, z, ry); scene.add(p);
  }
  // genangan kecil (pantulan langit sore)
  const pud = new THREE.Mesh(new THREE.CircleGeometry(0.55, 14), new THREE.MeshStandardMaterial({ color: 0x4a5a6a, roughness: 0.12, metalness: 0.5 }));
  put(pud, 0.6, 0.05, -3, 0, -Math.PI / 2); pud.scale.x = 1.4; pud.receiveShadow = true; scene.add(pud);
  // daun berserakan (statis, ~25 helai) — di atas paving
  const leafCols = [0x6a7a2a, 0x8a7a2a, 0x9a6a2a, 0x5a6a2a];
  for (let i = 0; i < 25; i++) {
    const leaf = plane(0.14, 0.09, new THREE.MeshStandardMaterial({ color: leafCols[i % 4], roughness: 0.95, side: THREE.DoubleSide }));
    put(leaf, r.range(-2.8, 2.8), 0.05, r.range(12, -16), r.range(0, Math.PI), -Math.PI / 2 + r.range(-0.2, 0.2));
    leaf.castShadow = false; scene.add(leaf);
  }
}

// ---------- deret rumah (kiri ruko, kanan kampung + ruko) ----------
// Gang membujur sumbu z. Kiri: ruko di x -5,0 (ry +90°, muka -> +x ke jalan).
// Kanan: kampung di x +4,5 / ruko di x +5,0 (ry -90°, muka -> -x ke jalan).
// Muka rumah tepat di tepi jalan (x ±3,0) — gang lebar 6 m, lega buat Najmi.
function buildGangHouses(scene) {
  const leftRuko = [
    { z: 11.5, label: 'WARUNG', signBg: '#2e7d5b', seed: 31, floors: 2, facade: 0xe8dcc0 },
    { z: 6.9, label: 'TOKO', signBg: '#1e5aa8', seed: 32, floors: 3, facade: 0xdfe8e8 },
    { z: 2.3, label: 'APOTEK', signBg: '#1e7d32', seed: 33, floors: 2, facade: 0xf0d8c8 },
    { z: -2.3, label: 'LAUNDRY', signBg: '#7d3c98', seed: 34, floors: 3, facade: 0xd8e0d0 },
    { z: -6.9, label: 'KOST', signBg: '#b3261e', seed: 35, floors: 2, facade: 0xe8e0c8 },
    { z: -11.5, label: 'WARUNG', signBg: '#2e7d5b', seed: 36, floors: 3, facade: 0xe8c8c8 },
  ];
  for (const r of leftRuko) {
    const g = buildDetailedRuko({
      signText: r.label, signBg: r.signBg, seed: r.seed, floors: r.floors,
      facadeColor: r.facade, x: -5.0, z: r.z, ry: Math.PI / 2,
    });
    scene.add(g);
    console.log('TRIANGLES ruko kiri', r.label, r.z, '=', g.userData.triangles);
  }

  const rightRow = [
    { kind: 'kampung', z: 10.8, seed: 41, tint: 0xffffff },
    { kind: 'kampung', z: 7.1, seed: 42, tint: 0xffe8c8 },
    { kind: 'kampung', z: 3.4, seed: 43, tint: 0xd8e8d0 },
    { kind: 'ruko', z: -0.95, label: 'TOKO', signBg: '#1e5aa8', seed: 44, floors: 2, facade: 0xf0d8c8 },
    { kind: 'kampung', z: -5.0, seed: 45, tint: 0xe8dcc0 },
    { kind: 'kampung', z: -8.7, seed: 46, tint: 0xf5ead0 },
    { kind: 'ruko', z: -12.75, label: 'WARUNG', signBg: '#2e7d5b', seed: 47, floors: 2, facade: 0xe8dcc0 },
  ];
  for (const r of rightRow) {
    let g;
    if (r.kind === 'kampung') {
      g = buildDetailedKampung({ wallTint: r.tint, seed: r.seed, x: 4.5, z: r.z, ry: -Math.PI / 2 });
      console.log('TRIANGLES kampung kanan', r.z, '=', g.userData.triangles);
    } else {
      g = buildDetailedRuko({
        signText: r.label, signBg: r.signBg, seed: r.seed, floors: r.floors,
        facadeColor: r.facade, x: 5.0, z: r.z, ry: -Math.PI / 2,
      });
      console.log('TRIANGLES ruko kanan', r.label, r.z, '=', g.userData.triangles);
    }
    scene.add(g);
  }
}

// ---------- atas gang: tiang listrik + kabel melintang + jemuran + burung ----------
// v2: isolator LATHE (piringan bertumpuk, bukan silinder polos), baut +
// strap crossarm, junction box + kabel melingkar, kabel tetap sagCurve.
function buildGangOverhead(scene) {
  const wireM = std({ color: 0x1e2226, roughness: 0.9 });
  const poleM = std({ color: 0x5a4632, roughness: 0.95 });
  const addWire = (a, b, sag) => {
    const curve = sagCurve(new THREE.Vector3(...a), new THREE.Vector3(...b), sag, 14);
    const w = new THREE.Mesh(new THREE.TubeGeometry(curve, 14, 0.022, 5), wireM);
    w.castShadow = false; w.receiveShadow = false; scene.add(w);
    return curve;
  };
  // tiang listrik kayu di mulut gang (kiri) + palang + isolator lathe
  const pole = cyl(0.09, 0.12, 7, 8, poleM); put(pole, -2.3, 3.5, 13); scene.add(pole);
  const cross = box(1.7, 0.1, 0.1, poleM); put(cross, -2.3, 6.2, 13); scene.add(cross);
  // isolator keramik LATHE: 3 piringan bertumpuk
  const insPts = [
    new THREE.Vector2(0.0, 0), new THREE.Vector2(0.045, 0), new THREE.Vector2(0.05, 0.015),
    new THREE.Vector2(0.02, 0.03), new THREE.Vector2(0.055, 0.045), new THREE.Vector2(0.055, 0.06),
    new THREE.Vector2(0.02, 0.075), new THREE.Vector2(0.05, 0.09), new THREE.Vector2(0.05, 0.105),
    new THREE.Vector2(0.02, 0.115), new THREE.Vector2(0.0, 0.12),
  ];
  const insGeo = new THREE.LatheGeometry(insPts, 8);
  const insM = std({ color: 0xf5f2e8, roughness: 0.5 });
  for (const dx of [-0.7, 0, 0.7]) {
    const ins = new THREE.Mesh(insGeo, insM);
    put(ins, -2.3 + dx, 6.26, 13); ins.castShadow = true; scene.add(ins);
    // baut menembus crossarm + mur di bawah
    const bolt = cyl(0.018, 0.018, 0.16, 5, std({ color: 0x8a9098, metalness: 0.5 }));
    put(bolt, -2.3 + dx, 6.2, 13); scene.add(bolt);
  }
  // strap besi melingkari tiang di crossarm + junction box + kabel melingkar
  const strap = box(0.26, 0.06, 0.02, std({ color: 0x3a3f45, metalness: 0.4 }));
  put(strap, -2.3, 6.05, 13.1); scene.add(strap);
  const jbox = box(0.28, 0.36, 0.14, std({ color: 0x8a9098, metalness: 0.3, roughness: 0.5 }));
  put(jbox, -2.3, 5.0, 13.08); scene.add(jbox);
  for (let i = 0; i < 3; i++) {
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.015, 5, 14), wireM);
    put(coil, -2.3, 4.55 + i * 0.045, 13.1); scene.add(coil);
  }
  // kabel melintang antar rumah (beberapa lapis, tinggi beda-beda)
  addWire([-5.0, 5.8, 8], [5.0, 5.2, 8], 0.5);
  addWire([-5.0, 6.5, 2], [5.0, 6.0, 2], 0.6);
  addWire([-5.0, 5.5, -4], [5.0, 6.2, -4], 0.5);
  addWire([-5.0, 6.8, -9], [5.0, 5.8, -9], 0.6);
  addWire([-5.0, 7.2, -12], [5.0, 6.6, -11.2], 0.55); // diagonal
  addWire([-5.0, 4.8, 5], [5.0, 5.4, 5.8], 0.45);      // diagonal rendah
  // kabel memanjang gang (dari tiang ke ujung)
  addWire([-2.3, 6.3, 13], [-2.0, 6.6, -14], 0.9);
  addWire([-2.3, 6.3, 13], [2.0, 6.4, -14], 0.9);
  // jemuran bambu melintang (pakaian berlipat menggantung)
  for (const [y, z, seed] of [[3.4, 5.5, 61], [3.2, -1.5, 62], [3.6, -7, 63]]) {
    const line = buildLaundryLine(y, z, seed);
    scene.add(line);
  }
  // burung di kabel (3 di kabel z=+2, 2 di kabel z=-4)
  const birdSpots = [[-1.2, 5.95, 2, 0.4], [0.2, 5.9, 2, -0.3], [1.4, 5.95, 2, 0.2], [-0.9, 5.75, -4, 0.1], [1.0, 5.85, -4, -0.5]];
  for (const [x, y, z, ry] of birdSpots) {
    const b = buildBird();
    put(b, x, y, z, ry); scene.add(b);
  }
}

// ---------- prop jalan v2: motor, gerobak, warung, bangku bilah, sepeda, pompa, pot lathe, kucing, poster berbingkai, pipa ----------
// Semua prop duduk di PY (0.04, top paving).
function buildGangProps(scene) {
  // motor matic parkir (3, beda warna + arah) — merah bawa helm di jok
  const bikes = [
    { color: 0xd42a2a, x: -2.35, z: 8.5, ry: Math.PI * 0.92, helmet: true },
    { color: 0x1e5aa8, x: 2.35, z: 3.0, ry: 0.12, helmet: false },
    { color: 0x2a2e33, x: -2.35, z: -6.5, ry: -0.18, helmet: false },
  ];
  for (const b of bikes) {
    const m = buildMotorbike(b.color, b.helmet);
    put(m, b.x, PY, b.z, b.ry); scene.add(m);
  }
  // gerobak sate (kiri, menghadap jalan) + gerobak bakso (kanan)
  const gs = buildGerobak('sate'); put(gs, -2.2, PY, 4.5, Math.PI / 2); scene.add(gs);
  const gb = buildGerobak('bakso'); put(gb, 2.2, PY, -2.5, -Math.PI / 2); scene.add(gb);
  // warung kecil (kiri, agak menjorok ke jalan)
  const w = buildWarung(); put(w, -2.3, PY, 0.5, Math.PI / 2); scene.add(w);
  // bangku kayu bilah (kanan, menghadap jalan): 4 bilah duduk + 3 bilah sandar + sandaran tangan
  const bench = new THREE.Group();
  const benchWood = std({ color: 0x8a6f4a, roughness: 0.9 });
  for (let i = 0; i < 4; i++) {
    const slat = box(1.4, 0.08, 0.09, benchWood); put(slat, 0, 0.45, -0.15 + i * 0.11); bench.add(slat);
  }
  for (let i = 0; i < 3; i++) {
    const slat = box(1.4, 0.09, 0.03, benchWood); put(slat, 0, 0.62 + i * 0.12, -0.26, 0, -0.25); bench.add(slat);
  }
  for (const sx of [-0.6, 0.6]) for (const sz of [-0.16, 0.16]) {
    const leg = box(0.07, 0.45, 0.07, benchWood); put(leg, sx, 0.22, sz); bench.add(leg);
  }
  for (const s of [-1, 1]) {
    const arm = box(0.06, 0.05, 0.5, benchWood); put(arm, s * 0.68, 0.68, 0); bench.add(arm);
    const armPost = box(0.06, 0.25, 0.06, benchWood); put(armPost, s * 0.68, 0.55, 0.2); bench.add(armPost);
  }
  bench.userData.triangles = countTriangles(bench);
  put(bench, 2.5, PY, 6.5, -Math.PI / 2); scene.add(bench);
  // tong sampah (2): bibir torus + tutup kubah + pegangan
  for (const [x, z] of [[-2.6, -4.5], [2.6, 9.5]]) {
    const bin = cyl(0.26, 0.22, 0.68, 12, std({ color: 0x2e7d5b, roughness: 0.8 }));
    put(bin, x, PY + 0.34, z); scene.add(bin);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.02, 6, 14), std({ color: 0x1e5a3a }));
    put(rim, x, PY + 0.68, z, 0, -Math.PI / 2); rim.castShadow = true; scene.add(rim);
    const lid = sph(0.26, std({ color: 0x1e5a3a }), 12, 6); put(lid, x, PY + 0.68, z); lid.scale.y = 0.45; scene.add(lid);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.015, 5, 10, Math.PI), std({ color: 0x1e5a3a }));
    put(handle, x, PY + 0.82, z, 0, 0, 0); scene.add(handle);
  }
  // sepeda bersandar di dinding kanan
  const bike = buildBicycle(); put(bike, 2.6, PY, -9.5, 0.35, 0, 0.14); scene.add(bike);
  // pompa air tangan + ember (kiri, dekat rumah)
  const pump = buildPump(); put(pump, -2.6, PY, -10.5, Math.PI / 2); scene.add(pump);
  // pot tanaman LATHE di tepi jalan (6)
  const potPts = [
    new THREE.Vector2(0.0, 0), new THREE.Vector2(0.15, 0), new THREE.Vector2(0.19, 0.04),
    new THREE.Vector2(0.2, 0.24), new THREE.Vector2(0.17, 0.3), new THREE.Vector2(0.0, 0.3),
  ];
  const potGeo = new THREE.LatheGeometry(potPts, 10);
  const potM = std({ color: 0xa85438, roughness: 0.9 });
  const potSpots = [[-2.55, 7], [2.55, 1.5], [-2.55, -3.5], [2.55, -6], [-2.55, -12], [2.55, 10.5]];
  for (let i = 0; i < potSpots.length; i++) {
    const [x, z] = potSpots[i];
    const pot = new THREE.Mesh(potGeo, potM);
    put(pot, x, PY, z); pot.castShadow = true; scene.add(pot);
    const bush = sph(0.3, std({ color: i % 2 ? 0x4a7a2a : 0x5a8a2a }), 8, 6);
    put(bush, x, PY + 0.5, z); bush.scale.y = 0.8; scene.add(bush);
    const bush2 = sph(0.18, std({ color: 0x6a9a3a }), 8, 6);
    put(bush2, x + 0.15, PY + 0.62, z + 0.1); scene.add(bush2);
  }
  // kucing duduk di anak tangga ruko kiri
  const cat = buildCat(); put(cat, -2.5, 0.02, 2.0, 0.6); scene.add(cat);
  // poster di fasad BERBINGKAI kayu (menempel di muka rumah, menghadap jalan)
  const posters = [
    { text: 'PULSA', bg: '#1e5aa8', x: -2.98, y: 1.9, z: 8.2, ry: Math.PI / 2 },
    { text: 'ES TEH', bg: '#b3261e', x: 2.98, y: 1.8, z: 5.0, ry: -Math.PI / 2 },
    { text: 'MI AYAM', bg: '#2e7d5b', x: -2.98, y: 2.0, z: -1.0, ry: Math.PI / 2 },
    { text: 'KOST', bg: '#7d3c98', x: 2.98, y: 1.9, z: -5.5, ry: -Math.PI / 2 },
    { text: 'LAUNDRY', bg: '#1e7d32', x: -2.98, y: 1.8, z: -9.0, ry: Math.PI / 2 },
    { text: 'POTONG RAMBUT', bg: '#d42a2a', x: 2.98, y: 2.0, z: -11.0, ry: -Math.PI / 2 },
  ];
  for (const p of posters) {
    const fr = box(0.53, 0.73, 0.02, std({ color: 0x5a3a22, roughness: 0.9 }));
    put(fr, p.x, p.y, p.z, p.ry); scene.add(fr);
    const off = p.ry > 0 ? 0.015 : -0.015;
    const m = plane(0.45, 0.65, new THREE.MeshStandardMaterial({ map: posterTex(p.text, p.bg), roughness: 0.85 }));
    put(m, p.x + off, p.y, p.z, p.ry); m.castShadow = false; scene.add(m);
  }
  // pipa air vertikal di 2 fasad: siku torus + keran di bawah
  const pipeM = std({ color: 0x5a6068, metalness: 0.3, roughness: 0.6 });
  for (const [x, z, h] of [[-2.95, 6.0, 6.0], [2.95, -5.5, 4.5]]) {
    const pipe = cyl(0.035, 0.035, h, 6, pipeM);
    put(pipe, x, h / 2, z); scene.add(pipe);
    const elbow = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.035, 6, 8, Math.PI / 2), pipeM);
    put(elbow, x + (x < 0 ? 0.12 : -0.12), h - 0.12, z, 0, 0, x < 0 ? 0 : Math.PI); elbow.castShadow = true; scene.add(elbow);
    const tap = cyl(0.025, 0.025, 0.3, 6, pipeM);
    put(tap, x + (x < 0 ? 0.24 : -0.24), h - 0.25, z); scene.add(tap);
    const tapH = box(0.16, 0.03, 0.03, std({ color: 0xd42a2a })); put(tapH, x + (x < 0 ? 0.24 : -0.24), h - 0.08, z); scene.add(tapH);
  }
  const meter = box(0.22, 0.3, 0.1, std({ color: 0x8a9098, metalness: 0.3, roughness: 0.5 }));
  put(meter, -2.96, 1.6, 4.2); scene.add(meter);
  // tanaman gantung di 2 balkon (pot lathe kecil + rumpun hijau)
  for (const [x, y, z] of [[-3.2, 3.6, -2.3], [-3.2, 3.6, 6.9], [3.2, 3.6, -0.95]]) {
    const pot = new THREE.Mesh(potGeo, potM);
    put(pot, x, y, z); pot.scale.setScalar(0.55); scene.add(pot);
    const leaf = sph(0.16, std({ color: 0x4a7a2a }), 8, 6);
    put(leaf, x, y + 0.16, z); leaf.scale.y = 0.7; scene.add(leaf);
  }
  // sapu bersandar di dinding kiri
  const broomH = cyl(0.02, 0.02, 1.3, 5, std({ color: 0x8a6f4a }));
  put(broomH, -2.93, 0.65, 3.8, 0, 0, 0.25); scene.add(broomH);
  const broomB = box(0.06, 0.25, 0.12, std({ color: 0xd8c86a }));
  put(broomB, -2.97, 0.12, 3.85, 0, 0, 0.25); scene.add(broomB);
}

// ---------- ujung gang: masjid v2 (menara + kubah hijau, siluet kabut) + plaza kecil ----------
// v2: kubah 8 rusuk torus, finial lathe + bulan sabit emas, jendela lengkung
// extrude (frame krem + kaca gelap recessed), menara 2 balkon cincin +
// pintu lengkung + jendela celah, pagar keliling + gerbang di z -17.5.
function archShape(w, h) {
  const s = new THREE.Shape();
  const r = w / 2;
  s.moveTo(-r, 0); s.lineTo(-r, h - r);
  s.absarc(0, h - r, r, Math.PI, 0, true);
  s.lineTo(r, 0); s.closePath();
  return s;
}

function buildGangMosque(scene) {
  const cream = std({ color: 0xf5ead0, roughness: 0.9 });
  const green = std({ color: 0x2e7d5b, roughness: 0.8 });
  const gold = std({ color: 0xd4af37, metalness: 0.5, roughness: 0.4 });
  const dark = std({ color: 0x3a3f45, roughness: 0.9 });
  // aula masjid (tengah sumbu gang, z -20) + kubah utama + 2 kubah kecil
  const hall = box(5, 3, 4, cream); put(hall, 0, 1.5, -20); scene.add(hall);
  const dome = sph(1.6, green, 14, 10); put(dome, 0, 3.0, -20); dome.scale.y = 0.85; scene.add(dome);
  // 8 rusuk kubah: segmen torus vertikal, diputar mengelilingi sumbu Y
  for (let i = 0; i < 8; i++) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.045, 6, 16, Math.PI), green);
    put(rib, 0, 3.0, -20, (i / 8) * Math.PI, 0, 0);
    rib.scale.y = 0.85; rib.castShadow = true; scene.add(rib);
  }
  // finial LATHE (profil bertingkat) + bulan sabit emas
  const finPts = [
    new THREE.Vector2(0.0, 0), new THREE.Vector2(0.09, 0), new THREE.Vector2(0.09, 0.08),
    new THREE.Vector2(0.05, 0.14), new THREE.Vector2(0.13, 0.24), new THREE.Vector2(0.05, 0.34),
    new THREE.Vector2(0.04, 0.5), new THREE.Vector2(0.0, 0.55),
  ];
  const fin = new THREE.Mesh(new THREE.LatheGeometry(finPts, 10), gold);
  put(fin, 0, 4.35, -20); fin.castShadow = true; scene.add(fin);
  const crescent = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.028, 6, 14, Math.PI * 1.4), gold);
  put(crescent, 0, 5.15, -20, 0, 0, Math.PI * 0.75); crescent.castShadow = true; scene.add(crescent);
  for (const s of [-1, 1]) {
    const sd = sph(0.8, green, 10, 8); put(sd, s * 1.7, 3.0, -20); sd.scale.y = 0.8; scene.add(sd);
    const sdFin = cyl(0.03, 0.03, 0.3, 6, gold); put(sdFin, s * 1.7, 3.85, -20); scene.add(sdFin);
  }
  // jendela lengkung di muka aula (menghadap gang, +z): frame krem + kaca recessed
  const frameGeo = new THREE.ExtrudeGeometry(archShape(0.64, 1.34), { depth: 0.1, bevelEnabled: false });
  const winGeo = new THREE.ExtrudeGeometry(archShape(0.5, 1.2), { depth: 0.05, bevelEnabled: false });
  for (const x of [-1.4, 0, 1.4]) {
    const fr = new THREE.Mesh(frameGeo, cream); put(fr, x, 1.0, -18.0); fr.castShadow = true; scene.add(fr);
    const win = new THREE.Mesh(winGeo, dark); put(win, x, 1.07, -17.98); scene.add(win);
  }
  // menara (kanan, tetap di sumbu pandang gang) — ~13 m, 2 balkon cincin
  const tower = cyl(0.4, 0.48, 10, 10, cream); put(tower, 2.8, 5.0, -19.5); scene.add(tower);
  for (const by of [7.5, 9.3]) {
    const ring = cyl(0.62, 0.62, 0.15, 10, cream); put(ring, 2.8, by, -19.5); scene.add(ring);
    const rail = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.02, 5, 14), cream);
    put(rail, 2.8, by + 0.55, -19.5, 0, -Math.PI / 2); scene.add(rail);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const bal = box(0.03, 0.5, 0.03, cream);
      put(bal, 2.8 + Math.cos(a) * 0.6, by + 0.3, -19.5 + Math.sin(a) * 0.6); scene.add(bal);
    }
  }
  const top = cyl(0.28, 0.34, 1.6, 8, cream); put(top, 2.8, 10.8, -19.5); scene.add(top);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.9, 8), green);
  put(cap, 2.8, 12.1, -19.5); cap.castShadow = true; scene.add(cap);
  const capFin = sph(0.09, gold, 8, 6); put(capFin, 2.8, 12.6, -19.5); scene.add(capFin);
  // pintu lengkung menara + jendela celah
  const doorGeo = new THREE.ExtrudeGeometry(archShape(0.6, 1.6), { depth: 0.05, bevelEnabled: false });
  const mDoor = new THREE.Mesh(doorGeo, dark); put(mDoor, 2.8, 0, -19.0); scene.add(mDoor);
  for (const wy of [4.2, 6.2, 8.6]) {
    const slit = box(0.09, 0.5, 0.04, dark); put(slit, 2.8, wy, -19.0); scene.add(slit);
  }
  // pagar keliling rendah + gerbang di z -17.5
  const wallM = std({ color: 0xf5ead0, roughness: 0.9 });
  for (const s of [-1, 1]) {
    const wl = box(2.2, 1.1, 0.18, wallM); put(wl, s * 1.9, 0.55, -17.5); scene.add(wl);
    const post = box(0.28, 1.5, 0.28, wallM); put(post, s * 0.8, 0.75, -17.5); scene.add(post);
    const postCap = sph(0.16, green, 8, 6); put(postCap, s * 0.8, 1.55, -17.5); scene.add(postCap);
  }
  const gateM = std({ color: 0x2a2e33, metalness: 0.4, roughness: 0.6 });
  for (let i = 0; i < 5; i++) {
    const bar = box(0.04, 1.1, 0.04, gateM); put(bar, -0.6 + i * 0.3, 0.55, -17.5); scene.add(bar);
  }
  for (const gy of [0.3, 1.0]) {
    const bar = box(1.6, 0.05, 0.04, gateM); put(bar, 0, gy, -17.5); scene.add(bar);
  }
  // plaza kecil di ujung gang: pohon + bangku bilah
  const trunk = cyl(0.14, 0.2, 2.4, 8, std({ color: 0x5a3a22 })); put(trunk, -2.6, 1.2, -16.5); scene.add(trunk);
  for (const [dx, dy, dz, r] of [[0, 3.0, 0, 1.3], [0.8, 2.5, 0.3, 0.85], [-0.7, 2.6, -0.3, 0.9]]) {
    const c = sph(r, std({ color: 0x4a7a2a }), 10, 8);
    put(c, -2.6 + dx, dy, -16.5 + dz); scene.add(c);
  }
  const bSeat = box(1.4, 0.07, 0.45, std({ color: 0x8a6f4a })); put(bSeat, 1.6, 0.45, -16.2, -Math.PI / 2); scene.add(bSeat);
  for (const s of [-0.6, 0.6]) {
    const leg = box(0.07, 0.45, 0.07, std({ color: 0x8a6f4a })); put(leg, 1.6, 0.22, -16.2 + s, -Math.PI / 2); scene.add(leg);
  }
}

// ---------- set ----------
export function buildGangDetail(scene) {
  buildGangLights(scene);
  buildGangStreet(scene);
  buildGangHouses(scene);
  buildGangOverhead(scene);
  buildGangProps(scene);
  buildGangMosque(scene);
  console.log('TRIANGLES gang-detail (tanpa karakter) =', countTriangles(scene));
}
