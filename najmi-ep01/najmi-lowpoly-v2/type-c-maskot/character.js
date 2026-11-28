// Najmi LOW-POLY — Varian C "Maskot Bulat" (v2)
// Badan BULAT seperti maskot: torso sphere low-segmen, kepala menyatu dengan badan,
// tangan & kaki mungil pendek, wajah simpel besar di depan badan bulat.
// Budget: karakter <= 300 segitiga, flat shading, tekstur 64x64 dilukis kode.
// 8 pose, satu pose untuk tiap kalimat naskah "Dilarang Mengetuk Pintu Lumbung 3 Kali".
// Dibuat dari nol pakai Three.js. Bukan image gen, bukan kit toon3D. Karakter orisinal Najmi.
import * as THREE from 'three';

// ---------- tekstur 64x64 dilukis kode ----------
function tex64(draw) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  draw(c.getContext('2d'));
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function batikTex() {
  return tex64(g => {
    g.fillStyle = '#17786b'; g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#0e5a50';
    for (let y = 0; y < 64; y += 16) for (let x = 0; x < 64; x += 16) g.fillRect(x + 8, y + 8, 4, 4);
    // mega mendung: baris busur krem
    g.strokeStyle = '#f2e3c2'; g.lineWidth = 2;
    for (let row = 0; row < 4; row++) {
      const y = 6 + row * 16;
      for (let x = -8; x < 72; x += 16) {
        g.beginPath(); g.arc(x, y, 7, Math.PI, 0); g.stroke();
        g.beginPath(); g.arc(x + 8, y + 6, 4, Math.PI, 0); g.stroke();
      }
    }
    g.fillStyle = '#f6c945';
    for (let y = 4; y < 64; y += 16) for (let x = 4; x < 64; x += 16) g.fillRect(x, y, 2, 2);
  });
}
function shortsTex() {
  return tex64(g => {
    g.fillStyle = '#2b3550'; g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#38446a';
    for (let y = 0; y < 64; y += 8) g.fillRect(0, y, 64, 2);
    g.fillStyle = '#f6c945'; g.fillRect(0, 2, 64, 2);
  });
}
function shoeTex() {
  return tex64(g => {
    g.fillStyle = '#cf3a2c'; g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#f4ede0'; g.fillRect(0, 44, 64, 20); // ujung putih
    g.fillStyle = '#8e2318'; g.fillRect(0, 42, 64, 2);
    g.fillStyle = '#f6c945'; g.fillRect(28, 8, 8, 4);
  });
}
function lanternTex() {
  return tex64(g => {
    g.fillStyle = '#ffb347'; g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#ff8c1a';
    for (let x = 0; x < 64; x += 8) g.fillRect(x, 0, 3, 64);
    g.fillStyle = '#5a3a1a';
    g.fillRect(0, 0, 64, 6); g.fillRect(0, 58, 64, 6);
    g.fillRect(28, 0, 8, 64);
    g.fillStyle = '#ffe9a8'; g.fillRect(24, 22, 16, 20); // api
  });
}
function bagTex() {
  return tex64(g => {
    g.fillStyle = '#7a4a22'; g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#5d3413'; g.fillRect(0, 0, 64, 22); // tutup
    g.fillStyle = '#a06a35';
    for (let y = 26; y < 64; y += 8) g.fillRect(0, y, 64, 2);
    g.fillStyle = '#f6c945'; g.beginPath(); g.arc(32, 16, 5, 0, 7); g.fill();
  });
}
function doorTex() {
  return tex64(g => {
    g.fillStyle = '#6b4423'; g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#54341a';
    for (let x = 0; x < 64; x += 16) g.fillRect(x, 0, 3, 64);
    g.fillStyle = '#3d2712';
    for (let y = 0; y < 64; y += 21) g.fillRect(0, y, 64, 3);
    g.fillStyle = '#8a5a30';
    for (let i = 0; i < 40; i++) g.fillRect((i * 37) % 64, (i * 53) % 64, 2, 2);
  });
}
function groundTex() {
  return tex64(g => {
    g.fillStyle = '#3d5a34'; g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#2f4a2a';
    for (let i = 0; i < 90; i++) g.fillRect((i * 29) % 64, (i * 41) % 64, 3, 2);
    g.fillStyle = '#4a6b3e';
    for (let i = 0; i < 50; i++) g.fillRect((i * 17) % 64, (i * 23) % 64, 2, 3);
    g.fillStyle = '#5d4a2e'; g.fillRect(20, 44, 24, 12); // tanah
  });
}

// ---------- material flat shading ----------
function flatMat(color, map) {
  return new THREE.MeshStandardMaterial({ color, map: map || null, flatShading: true, roughness: 0.9, metalness: 0 });
}
function box(w, h, d, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = true;
  return m;
}
function disc(r, seg, mat) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, seg), mat);
  m.castShadow = true;
  return m;
}

// ---------- hitung segitiga (prop tidak dihitung — hanya karakter) ----------
export function countTriangles(group) {
  let n = 0;
  group.traverse(o => {
    if (o.isMesh && !o.userData.isProp) {
      const g = o.geometry;
      n += (g.index ? g.index.count : g.attributes.position.count) / 3;
    }
  });
  return n;
}

// ---------- kalimat + pose (1 pose per kalimat, naskah Dilarang Mengetuk) ----------
export const SENTENCES = [
  { id: 'pose1', scene: 'Adegan 1 — Hook', text: 'Di desa ini, ada satu larangan. Kalau pintu lumbung diketuk tiga kali lewat tengah malam... jangan pernah dibuka.', pose: 'larangan' },
  { id: 'pose2', scene: 'Adegan 2 — Asal-usul', text: 'Ingat, Najmi. Dulu ada penjaga yang membuka pintu itu. Besok paginya... separuh beras desa hilang.', pose: 'mendengarkan' },
  { id: 'pose3', scene: 'Adegan 3 — Sepi', text: 'Jam dua belas malam. Hujan baru berhenti. Semua sepi. Aku pikir... malam ini bakal aman-aman saja.', pose: 'mengantuk' },
  { id: 'pose4', scene: 'Adegan 4 — Ketukan 1 & 2', text: 'Tok... Tok... Dua kali. Jantungku berhenti sebentar. Siapa yang mengetuk pintu lumbung... jam segini?', pose: 'terkejut' },
  { id: 'pose5', scene: 'Adegan 5 — Ketukan ke-3', text: 'Tok... Kali ini yang ketiga. Lalu ada suara pelan memanggil namaku.', pose: 'mundur' },
  { id: 'pose6', scene: 'Adegan 6 — Tangan di gembok', text: 'Tanganku sudah di gembok. Tinggal tarik... aku bisa membuka pintu ini. Tapi kata Pak Kepala... jangan pernah dibuka.', pose: 'gembok' },
  { id: 'pose7', scene: 'Adegan 7 — Twist', text: 'Aku tidak membuka pintu. Aku mengintip dari celah papan... dan yang kulihat bukan hantu.', pose: 'mengintip' },
  { id: 'pose8', scene: 'Adegan 8 — Penutup', text: 'Kalau kamu jadi Najmi, pintu lumbungnya kamu buka atau tetap ditutup?', pose: 'tanya' },
];

const SKIN = 0xd9a066, HAIR = 0x241a12, DARK = 0x2a2019;
const EYE = 0x201409;

// ---------- bangun Najmi low-poly ----------
export function buildNajmi() {
  const skin = flatMat(SKIN), hairM = flatMat(HAIR), dark = flatMat(DARK);
  const batik = flatMat(0xffffff, batikTex());
  const shorts = flatMat(0xffffff, shortsTex());
  const shoe = flatMat(0xffffff, shoeTex());
  const bagM = flatMat(0xffffff, bagTex());
  const lampM = new THREE.MeshStandardMaterial({ map: lanternTex(), emissive: 0xff9a2a, emissiveIntensity: 0.9, flatShading: true, roughness: 0.8 });

  const root = new THREE.Group();          // di tanah, y=0
  const hips = new THREE.Group(); hips.position.y = 0.58; root.add(hips); // badan bulat duduk rendah, kaki mungil sampai tanah

  // BADAN BULAT maskot: sphere low-segmen bertekstur batik (bukan box)
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 7, 3), batik);
  body.position.y = 0.15; body.castShadow = true; hips.add(body);
  // celana: pita kotak membungkus bawah badan bulat
  const pants = box(0.66, 0.20, 0.60, shorts); pants.position.y = -0.30; hips.add(pants);
  // tas kecil menempel di sisi badan bulat (tanpa tali — tali lurus tidak bisa menempel di sphere)
  const bag = box(0.18, 0.20, 0.08, bagM); bag.position.set(0.52, -0.05, 0.10); bag.rotation.z = -0.1; hips.add(bag);

  // kepala MENYATU dengan badan (hampir tanpa leher): sphere menumpuk di atas badan
  const headG = new THREE.Group(); headG.position.y = 0.66; hips.add(headG);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 7, 4), skin);
  head.scale.set(1, 1.12, 0.95); head.position.y = 0.40; head.castShadow = true; headG.add(head);
  // rambut mangkuk: cap menutup sampai di atas mata + jambul
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.44, 6, 3, 0, Math.PI * 2, 0, 1.35), hairM);
  hair.scale.set(1, 1.05, 0.98); hair.position.set(0, 0.50, -0.03); hair.castShadow = true; headG.add(hair);
  const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.24, 4), hairM);
  tuft.position.set(0.06, 0.98, 0.02); tuft.rotation.z = -0.35; tuft.castShadow = true; headG.add(tuft);
  // lampu isi hangat di depan wajah — kepala bulat low-segmen gampang separuh gelap
  const faceLight = new THREE.PointLight(0xffe6c0, 3.5, 3, 1.5);
  faceLight.position.set(0, 0.45, 1.1); headG.add(faceLight);
  // wajah: mata bundar besar + highlight, pipi pink, mulut lebih lebar
  const white = flatMat(0xffffff), blushM = flatMat(0xe88a96);
  const eyeL = disc(0.075, 8, dark); eyeL.position.set(-0.15, 0.44, 0.365); eyeL.rotation.y = -0.45; headG.add(eyeL);
  const hiL = disc(0.028, 6, white); hiL.position.set(0.02, 0.03, 0.006); eyeL.add(hiL);
  const eyeR = disc(0.075, 8, dark); eyeR.position.set(0.15, 0.44, 0.365); eyeR.rotation.y = 0.45; headG.add(eyeR);
  const hiR = disc(0.028, 6, white); hiR.position.set(0.02, 0.03, 0.006); eyeR.add(hiR);
  const chL = disc(0.05, 4, blushM); chL.position.set(-0.26, 0.34, 0.30); chL.rotation.y = -0.55; headG.add(chL);
  const chR = disc(0.05, 4, blushM); chR.position.set(0.26, 0.34, 0.30); chR.rotation.y = 0.55; headG.add(chR);
  const mouth = box(0.16, 0.035, 0.02, dark); mouth.position.set(0, 0.26, 0.375); headG.add(mouth);

  // lengan MUNGIL: bahu di permukaan depan-sisi badan bulat supaya lentera tidak tenggelam di badan
  function arm(side) { // side -1 kiri, +1 kanan
    const sh = new THREE.Group(); sh.position.set(0.42 * side, 0.45, 0.15); hips.add(sh);
    const up = box(0.13, 0.22, 0.13, batik); up.position.y = -0.11; sh.add(up);
    const el = new THREE.Group(); el.position.y = -0.22; sh.add(el);
    const fo = box(0.12, 0.20, 0.12, skin); fo.position.y = -0.10; el.add(fo);
    return { sh, el };
  }
  const armL = arm(-1), armR = arm(1);

  // kaki MUNGIL pendek: satu segmen (ketutup badan bulat) + sepatu merah
  function leg(side) {
    const hp = new THREE.Group(); hp.position.set(0.14 * side, -0.10, 0); hips.add(hp);
    const th = box(0.14, 0.42, 0.14, skin); th.position.y = -0.21; hp.add(th);
    const kn = new THREE.Group(); kn.position.y = -0.42; hp.add(kn);
    const ft = box(0.14, 0.08, 0.22, shoe); ft.position.set(0, -0.03, 0.04); kn.add(ft);
    return { hp, kn };
  }
  const legL = leg(-1), legR = leg(1);

  // lentera di tangan kiri (menempel di ujung lengan bawah kiri)
  const lantern = new THREE.Group(); lantern.position.set(0, -0.24, 0.02); armL.el.add(lantern);
  const lampBody = box(0.16, 0.22, 0.16, lampM); lantern.add(lampBody);
  const lampRoof = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.09, 4), dark);
  lampRoof.position.y = 0.155; lampRoof.rotation.y = Math.PI / 4; lampRoof.castShadow = true; lantern.add(lampRoof);
  const lampLight = new THREE.PointLight(0xffa63d, 14, 5, 1.8); lampLight.position.y = 0.05; lantern.add(lampLight);

  // gembok (prop, hanya kelihatan di pose 6 — tidak masuk hitungan 300)
  const padlock = new THREE.Group();
  const lockBody = box(0.20, 0.18, 0.06, new THREE.MeshStandardMaterial({ color: 0xf6c945, flatShading: true, roughness: 0.4, metalness: 0.6 }));
  padlock.add(lockBody);
  const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.018, 4, 6, Math.PI), dark);
  shackle.position.y = 0.12; padlock.add(shackle);
  padlock.position.set(0, 0.98, 0.72); padlock.visible = false; root.add(padlock);
  padlock.traverse(o => { o.userData.isProp = true; });

  const joints = { root, hips, head: headG, shL: armL.sh, elL: armL.el, shR: armR.sh, elR: armR.el, hipL: legL.hp, kneeL: legL.kn, hipR: legR.hp, kneeR: legR.kn, eyeL, eyeR, mouth, lantern, padlock };
  const tris = countTriangles(root);
  return { group: root, joints, tris };
}

// ---------- pose ----------
// konvensi: lengan/kaki ke depan = rotasi x negatif; lutut menekuk = x positif; kepala menunduk = x positif.
const P = {
  larangan:     { rootY: 0, hipsX: 0, headX: 0.15, headZ: 0, shL: [-0.5, 0, 0.15], elL: [-1.2, 0, 0], shR: [-2.4, 0, -0.15], elR: [-0.2, 0, 0], hipL: [0, 0, 0.08], hipR: [0, 0, -0.08], kneeL: 0, kneeR: 0, eyes: 1, mouth: [1, 1] },
  mendengarkan: { rootY: 0, hipsX: 0.08, headX: 0.1, headZ: 0.28, headY: -0.2, shL: [0.15, 0, 0.1], elL: [-0.3, 0, 0], shR: [-0.6, 0, 0], elR: [-1.9, 0, 0], hipL: [0, 0, 0.06], hipR: [0, 0, -0.06], kneeL: 0.1, kneeR: 0.1, eyes: 1, mouth: [1, 1] },
  mengantuk:    { rootY: -0.42, hipsX: 0.15, headX: 0.45, headZ: 0.12, shL: [0.3, 0, 0.1], elL: [-0.2, 0, 0], shR: [0.25, 0, -0.1], elR: [-0.9, 0, 0], hipL: [-1.45, 0, 0.05], hipR: [-1.35, 0, -0.05], kneeL: 1.5, kneeR: 1.45, eyes: 0.15, mouth: [0.7, 0.7] },
  terkejut:     { rootY: -0.05, hipsX: -0.12, headX: -0.15, headZ: 0, shL: [-1.9, 0, -0.7], elL: [-0.2, 0, 0], shR: [-1.9, 0, 0.7], elR: [-0.2, 0, 0], hipL: [-0.1, 0, 0.1], hipR: [-0.1, 0, -0.1], kneeL: 0.25, kneeR: 0.25, eyes: 1.25, mouth: [0.7, 2.4] },
  mundur:       { rootY: 0, hipsX: -0.18, headX: -0.1, headZ: 0, headY: 0.35, shL: [-1.1, 0, 0.3], elL: [-1.6, 0, 0], shR: [-0.4, 0, 0], elR: [-1.8, 0, 0], hipL: [0.35, 0, 0.08], hipR: [-0.25, 0, -0.08], kneeL: 0.3, kneeR: 0.35, eyes: 1.15, mouth: [0.8, 0.8] },
  gembok:       { rootY: -0.08, hipsX: 0.3, headX: 0.45, headZ: 0, shL: [-1.25, 0, 0.25], elL: [-0.5, 0, 0], shR: [-1.25, 0, -0.25], elR: [-0.5, 0, 0], hipL: [-0.15, 0, 0.08], hipR: [-0.15, 0, -0.08], kneeL: 0.3, kneeR: 0.3, eyes: 1, mouth: [0.9, 0.9], padlock: true },
  mengintip:    { rootY: -0.12, hipsX: 0.15, headX: 0.1, headZ: 0, headY: 0.35, shL: [-2.0, 0, 0.2], elL: [-0.4, 0, 0], shR: [-0.9, 0, 0], elR: [-1.7, 0, 0], hipL: [-0.2, 0, 0.12], hipR: [-0.2, 0, -0.12], kneeL: 0.55, kneeR: 0.55, eyes: 1.1, mouth: [0.8, 0.8] },
  tanya:        { rootY: 0, hipsX: 0, headX: 0, headZ: 0.18, shL: [-0.9, 0, -0.9], elL: [-0.9, 0, 0], shR: [-0.9, 0, 0.9], elR: [-0.9, 0, 0], hipL: [0, 0, 0.08], hipR: [0, 0, -0.08], kneeL: 0.05, kneeR: 0.05, eyes: 1, mouth: [1.8, 0.7] },
};
export function applyPose(j, name) {
  const p = P[name];
  const set = (g, r) => { if (g && r) g.rotation.set(r[0], r[1] || 0, r[2] || 0); };
  j.root.position.y = p.rootY;
  j.hips.rotation.set(p.hipsX, 0, 0);
  j.head.rotation.set(p.headX, p.headY || 0, p.headZ);
  set(j.shL, p.shL); set(j.elL, p.elL); set(j.shR, p.shR); set(j.elR, p.elR);
  set(j.hipL, p.hipL); set(j.hipR, p.hipR);
  j.kneeL.rotation.x = p.kneeL; j.kneeR.rotation.x = p.kneeR;
  j.eyeL.scale.y = p.eyes; j.eyeR.scale.y = p.eyes;
  j.mouth.scale.set(p.mouth[0], p.mouth[1], 1);
  j.padlock.visible = !!p.padlock;
}

// ---------- set: lumbung malam (properti, tidak masuk hitungan 300) ----------
export function buildSet(scene) {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30),
    new THREE.MeshStandardMaterial({ map: groundTex(), flatShading: true, roughness: 1 }));
  ground.material.map.repeat.set(10, 10);
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  // pintu lumbung di belakang
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.9, 2.6, 0.16),
    new THREE.MeshStandardMaterial({ map: doorTex(), flatShading: true, roughness: 0.95 }));
  door.position.set(0, 1.3, -1.1); door.castShadow = true; door.receiveShadow = true; scene.add(door);
  // karung beras
  const sackM = new THREE.MeshStandardMaterial({ color: 0xcbb27f, flatShading: true, roughness: 1 });
  [[-1.5, 0.28, -0.8, 0.2], [-1.15, 0.28, -0.85, -0.15], [-1.32, 0.82, -0.82, 0.05]].forEach(([x, y, z, r]) => {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.55, 0.5), sackM);
    s.position.set(x, y, z); s.rotation.y = r; s.castShadow = true; scene.add(s);
  });
  const sack2 = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.55, 0.5), sackM);
  sack2.position.set(1.5, 0.28, -0.85); sack2.rotation.y = -0.2; sack2.castShadow = true; scene.add(sack2);
  // lampu bulan + cahaya sekitar + fill hangat dari arah kamera (wajah tetap kebaca)
  scene.add(new THREE.HemisphereLight(0x8fa3ff, 0x2a2416, 0.85));
  const moon = new THREE.DirectionalLight(0xaebfff, 1.1);
  moon.position.set(-3, 6, 3); moon.castShadow = true; scene.add(moon);
  const fill = new THREE.DirectionalLight(0xffe0b3, 0.75);
  fill.position.set(2, 3, 5); scene.add(fill);
}
