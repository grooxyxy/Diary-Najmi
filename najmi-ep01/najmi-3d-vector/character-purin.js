// Najmi 3D v9 — gaya "TALL TALE 3D" (style sheet Master, 2026-11-27).
// Resep sheet: KEPALA BULAT PUTIH · BADAN KACANG · LENGAN+KAKI TONGKAT ·
// SATU TOPI + SATU SYAL · garis tinta tebal · wajah yang berakting.
// Najmi = si Hero: baret hijau, badan kacang oranye, syal kuning.
// Lengan + kaki = tongkat warna tinta, dibuat SEDIKIT TEBAL (r ~0,05;
// sheet aslinya ~0,03). Antarmuka SAMA dengan v8: buildNajmi(),
// applyPose(), SENTENCES, countTriangles(). Purin v8 lama: lihat
// character-purin.v8.js kalau mau dikembalikan.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

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
function lanternTex() {
  return tex64(g => {
    g.fillStyle = '#ffb347'; g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#ff8c1a';
    for (let x = 0; x < 64; x += 8) g.fillRect(x, 0, 3, 64);
    g.fillStyle = '#5a3a1a';
    g.fillRect(0, 0, 64, 6); g.fillRect(0, 58, 64, 6);
    g.fillRect(28, 0, 8, 64);
    g.fillStyle = '#ffe9a8'; g.fillRect(24, 22, 16, 20);
  });
}

const INK = 0x1b1d33; // tinta navy sheet: outline + lengan + kaki + wajah
function mat(color) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0 });
}
function outline(mesh, s = 1.06) {
  const o = new THREE.Mesh(mesh.geometry, new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide }));
  o.position.copy(mesh.position);
  o.rotation.copy(mesh.rotation);
  o.scale.copy(mesh.scale).multiplyScalar(s);
  o.userData.isProp = true;
  mesh.parent.add(o);
  return o;
}
function box(w, h, d, m) {
  const x = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  x.castShadow = x.receiveShadow = true; return x;
}
function cyl(rt, rb, h, m, seg = 10) {
  const x = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
  x.castShadow = x.receiveShadow = true; return x;
}
function sph(r, m, w = 16, h = 12) {
  const x = new THREE.Mesh(new THREE.SphereGeometry(r, w, h), m);
  x.castShadow = x.receiveShadow = true; return x;
}
function capsule(r, len, m, cap = 3, rad = 10) {
  const x = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, cap, rad), m);
  x.castShadow = x.receiveShadow = true; return x;
}
function rbox(w, h, d, m, r = 0.06, seg = 1) {
  const x = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, seg, r), m);
  x.castShadow = x.receiveShadow = true; return x;
}
function lathe(points, m, seg = 20) {
  const pts = points.map(p => new THREE.Vector2(p[0], p[1]));
  const x = new THREE.Mesh(new THREE.LatheGeometry(pts, seg), m);
  x.castShadow = x.receiveShadow = true; return x;
}

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

const SKIN = 0xa8744a;   // cokelat muda/sawo matang, disamakan dengan gambar referensi (sudah memperhitungkan grade sakura)
const BERET = 0x3d6b1a, ORANGE = 0xc23a0c, SCARF = 0xd89000; // lebih pekat dari sheet: grade sakura memucatkan warna

// Total tinggi ~1,75 m. hips di y 0,60 (sendi pinggul = dasar badan kacang).
// Kepala r 0,33 · lengan r 0,045 · kaki r 0,05 (sedikit tebal).
// Dua kostum dari gambar referensi Master (28 Nov): 'bintang' = tokoh kiri,
// 'jaket' = tokoh kanan. buildNajmi('jaket') untuk kostum kedua.
const OUTFITS = {
  bintang: { shirt: 0xf0ece4, sleeve: 0x1f7a6a, pants: 0x6b6a52, shoe: 0xd8d0c0 },
  jaket:   { shirt: 0xf0ece4, sleeve: 0xf0ece4, pants: 0x2f5f9a, shoe: 0x5a3a24, band: 0xe8e4dc },
  // desain Aurelia: kaos krem, lengan pendek lebar (oversized lewat lengan; badan tidak diubah)
  rumah:   { shirt: 0xe6d9bd, sleeve: 0xe6d9bd, short: true, pants: 0x3a3c40, shoe: 0x6a6a6e, sandal: true, watch: true, tee: true },
  jelajah: { shirt: 0xe6d9bd, sleeve: 0x5b6130, pants: 0x2d2f2c, shoe: 0x7a4a28, overshirt: 0x5b6130, cargo: true, bag: 0x4a3a2a, sneaker: true, tee: true },
};

export function buildNajmi(outfit = 'rumah') {
  const O = OUTFITS[outfit] || OUTFITS.rumah;
  const skin = mat(SKIN), ink = mat(INK), orange = mat(O.shirt), scarfM = mat(SCARF), beretM = mat(BERET);
  const white = mat(0xffffff), blushM = mat(0xf2a0ae), tongueM = mat(0xe88a96), mouthOpenM = mat(0x7a2a3a);
  const goldM = mat(0xf6c945);
  const eyeM = mat(0x2e1a10), browM = mat(0x050506); // mata cokelat gelap, alis hitam
  const lampM = new THREE.MeshStandardMaterial({ map: lanternTex(), emissive: 0xff9a2a, emissiveIntensity: 1.2, roughness: 0.8 });

  const root = new THREE.Group();
  const hips = new THREE.Group(); hips.position.y = 0.79; root.add(hips);

  // BADAN: kotak tegak berujung membulat, setinggi kepala, bahu persegi (referensi)
  const body = rbox(0.46, 0.64, 0.30, orange, 0.07, 3);
  body.position.y = 0.30; hips.add(body); outline(body, 1.06);

  if (outfit === 'jaket') {
    // jaket putih terbuka: kaos marun di tengah + kerah marun
    const maroon = mat(0x6a1d28);
    const strip = box(0.13, 0.56, 0.02, maroon); strip.position.set(0, 0.33, 0.157); hips.add(strip);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.10, 0.03, 8, 20), maroon);
    collar.position.y = 0.61; collar.rotation.x = Math.PI / 2; hips.add(collar);
  } else if (outfit === 'bintang') {
    // bintang oranye di dada
    const st = new THREE.Shape(); const R = 0.07, r = 0.03;
    for (let i = 0; i < 10; i++) {
      const ang = Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r : R;
      const x = Math.cos(ang) * rad, y = Math.sin(ang) * rad;
      if (i === 0) st.moveTo(x, y); else st.lineTo(x, y);
    }
    const star = new THREE.Mesh(new THREE.ShapeGeometry(st), new THREE.MeshBasicMaterial({ color: 0xe0652a, side: THREE.DoubleSide }));
    star.position.set(0, 0.38, 0.153); star.userData.isProp = true; hips.add(star);
  }

  const dk = (c, k) => mat(new THREE.Color(c).multiplyScalar(k));
  if (O.tee) {
    // kaos: kerah rib + (rumah) hem oversized menjuntai + lipatan kain
    const rib = dk(O.shirt, 0.8);
    const nk = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.028, 8, 24), rib); nk.position.y = 0.625; nk.rotation.x = Math.PI / 2; hips.add(nk);
    if (O.short) {
      const hem = rbox(0.49, 0.13, 0.35, orange, 0.05, 3); hem.position.y = 0.0; hips.add(hem); outline(hem, 1.05);
    }
  }
  if (O.overshirt) {
    // overshirt zaitun TEBAL: panel depan + sisi + punggung, kerah lipat, saku dada berpenutup, kancing
    const ov = mat(O.overshirt), ovd = dk(O.overshirt, 0.72), btn = mat(0x2a2418);
    for (const sd of [-1, 1]) {
      const pn = rbox(0.17, 0.64, 0.07, ov, 0.025, 3); pn.position.set(0.16 * sd, 0.31, 0.155); hips.add(pn); outline(pn, 1.05);
      const sp = rbox(0.05, 0.62, 0.33, ov, 0.02, 2); sp.position.set(0.235 * sd, 0.31, 0); hips.add(sp);
      const pk = rbox(0.085, 0.09, 0.03, ov, 0.01); pk.position.set(0.17 * sd, 0.42, 0.2); hips.add(pk);
      const fl = rbox(0.09, 0.03, 0.035, ovd, 0.01); fl.position.set(0.17 * sd, 0.47, 0.205); hips.add(fl);
      const cl = rbox(0.12, 0.05, 0.07, ov, 0.02); cl.position.set(0.085 * sd, 0.64, 0.12); cl.rotation.z = 0.5 * sd; hips.add(cl); outline(cl, 1.08);
    }
    for (const y of [0.1, 0.25, 0.38]) { const b = cyl(0.014, 0.014, 0.012, btn, 10); b.rotation.x = Math.PI / 2; b.position.set(0.11, y, 0.195); hips.add(b); }
    const back = rbox(0.50, 0.64, 0.07, ov, 0.03, 3); back.position.set(0, 0.31, -0.155); hips.add(back); outline(back, 1.04);
    const bcol = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.03, 8, 20), ov); bcol.position.y = 0.64; bcol.rotation.x = Math.PI / 2; hips.add(bcol);
  }
  if (O.bag) {
    // tas selempang kecil: tali tebal diagonal + gesper emas, kantong berflap + kancing
    const bm = mat(O.bag), bd = dk(O.bag, 0.7), gold = mat(0xb8955a);
    const strap = rbox(0.05, 0.66, 0.03, bm, 0.012); strap.position.set(0.005, 0.315, 0.2); strap.rotation.z = -0.5; hips.add(strap); outline(strap, 1.1);
    const bk = rbox(0.065, 0.04, 0.035, gold, 0.01); bk.position.set(0.091, 0.473, 0.205); bk.rotation.z = -0.5; hips.add(bk);
    const bag = rbox(0.17, 0.14, 0.08, bm, 0.025, 3); bag.position.set(-0.14, 0.03, 0.225); hips.add(bag); outline(bag, 1.08);
    const flap = rbox(0.175, 0.06, 0.09, bd, 0.02); flap.position.set(-0.14, 0.075, 0.23); hips.add(flap); outline(flap, 1.08);
    const clasp = sph(0.014, gold, 8, 6); clasp.position.set(-0.14, 0.045, 0.272); hips.add(clasp);
  }


  // KEPALA BULAT kulit + outline tinta
  const headG = new THREE.Group(); headG.position.y = 0.87; headG.scale.set(1, 0.87, 0.92); hips.add(headG);
  const head = sph(0.33, skin, 32, 24);
  headG.add(head); outline(head, 1.06);

  // RAMBUT hitam model mangkuk: tudung bola, poni lurus di atas alis
  const hairM = mat(0x08070a);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.39, 32, 18, 0, Math.PI * 2, 0, 1.5), hairM);
  hair.position.y = 0.03; hair.scale.set(1.02, 1.12, 1.04); hair.rotation.x = -0.5; hair.castShadow = true; headG.add(hair); outline(hair, 1.05);
  // gelombang + berantakan natural: jumput bola di mahkota, poni, samping (posisi tetap, bukan acak)
  for (const [x, y, z, sx, sy, sz, rz] of [
    [0.00, 0.43, 0.06, 1.3, 1.0, 1.1, 0.2], [-0.16, 0.40, 0.10, 1.2, 1.0, 1.0, -0.6], [0.17, 0.39, 0.12, 1.3, 0.9, 1.0, 0.7],
    [-0.08, 0.37, -0.12, 1.4, 1.0, 1.2, 0.4], [0.12, 0.38, -0.10, 1.2, 1.1, 1.2, -0.4],
    [-0.20, 0.27, 0.22, 1.1, 1.3, 0.9, -0.5], [0.05, 0.30, 0.29, 1.2, 1.1, 0.8, 0.3], [0.22, 0.25, 0.20, 1.0, 1.3, 0.9, 0.5],
    [-0.30, 0.12, 0.00, 0.8, 1.4, 1.1, 0.0], [0.30, 0.12, 0.00, 0.8, 1.4, 1.1, 0.0],
  ]) {
    const t = sph(0.075, hairM, 10, 8); t.position.set(x, y, z); t.scale.set(sx, sy, sz); t.rotation.z = rz;
    headG.add(t); outline(t, 1.08);
  }

  // lampu hangat di depan wajah (supaya wajah terbaca)
  const faceLight = new THREE.PointLight(0xffe6c0, 3.5, 3, 1.5);
  faceLight.position.set(0, 0.05, 1.0); headG.add(faceLight);

  // WAJAH sheet: mata oval tinta kecil + garis kelopak, alis garis tipis,
  // mulut kecil. Grup diputar mengikuti lengkung kepala.
  function eye(side) {
    const g = new THREE.Group(); g.position.set(0.12 * side, 0.0, 0.30); g.rotation.y = side * 0.37; headG.add(g);
    const e = sph(0.036, eyeM, 12, 10); e.scale.set(0.8, 1.1, 0.4); e.position.z = 0.012; g.add(e);
    const h = sph(0.011, white, 8, 6); h.position.set(-0.01, 0.014, 0.026); g.add(h);
    const lid = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.006, 5, 14, 2.0), ink);
    lid.position.set(0, 0.004, 0.014); lid.rotation.z = 0.57; g.add(lid);
    return g;
  }
  const eyeL = eye(-1), eyeR = eye(1);
  function brow(side) {
    const g = new THREE.Group(); g.position.set(0.12 * side, 0.095, 0.295); g.rotation.y = side * 0.33; headG.add(g);
    const b = box(0.105, 0.028, 0.02, browM); g.add(b);
    return g;
  }
  const browL = brow(-1), browR = brow(1);
  function blush(side) {
    const b = sph(0.05, blushM, 10, 8); b.scale.set(1.1, 0.7, 0.3); b.rotation.y = side * 0.6;
    b.position.set(0.2 * side, -0.07, 0.25); b.visible = false; headG.add(b); return b;
  }
  const blushL = blush(-1), blushR = blush(1);
  const nose = sph(0.034, skin, 12, 10); nose.scale.set(1, 0.9, 0.8); nose.position.set(0, -0.055, 0.322); headG.add(nose);
  for (const sd of [-1, 1]) { const ear = sph(0.06, skin, 10, 8); ear.scale.set(0.45, 1, 0.8); ear.position.set(0.335 * sd, -0.04, 0); headG.add(ear); outline(ear, 1.1); }
  const mark = sph(0.02, mat(0x7a3a2a), 8, 6); mark.scale.set(1.5, 0.8, 0.3); mark.rotation.set(0, 0.7, 0.5);
  mark.position.set(0.21, -0.02, 0.24); headG.add(mark);
  const mouth = sph(0.028, ink, 12, 10); mouth.scale.set(1.3, 0.2, 0.4); mouth.position.set(0, -0.12, 0.305); headG.add(mouth);
  const mouthO = sph(0.022, mouthOpenM, 12, 10); mouthO.scale.set(0.9, 1.15, 0.4); mouthO.position.set(0, -0.12, 0.308); mouthO.visible = false; headG.add(mouthO);
  const mouthSmile = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.007, 5, 12, Math.PI), ink);
  mouthSmile.position.set(0, -0.12, 0.308); mouthSmile.rotation.z = Math.PI; mouthSmile.visible = false; headG.add(mouthSmile);
  const tongue = sph(0.024, tongueM, 10, 8); tongue.scale.set(1.2, 0.6, 0.3); tongue.position.set(0, -0.145, 0.298); tongue.visible = false; headG.add(tongue);

  // LENGAN + KAKI: SATU silinder per sisi kiri/kanan (tanpa siku/lutut), warna
  // pakaian seperti referensi (lengan baju oranye, celana biru, tangan kulit).
  // Joint el/kn tetap ada di joints supaya applyPose tidak berubah, tapi
  // tidak terpasang ke scene, jadi putaran siku/lutut tidak berpengaruh.
  const sleeveM = mat(O.sleeve), pantsM = mat(O.pants), shoeM = mat(O.shoe);
  function arm(side) {
    const sh = new THREE.Group(); sh.position.set(0.28 * side, 0.56, 0); hips.add(sh);
    const a = cyl(0.06, 0.06, 0.42, O.short ? skin : sleeveM, 12); a.position.y = -0.21; sh.add(a); outline(a, 1.18);
    if (O.short) {
      const sl = cyl(0.085, 0.09, 0.2, sleeveM, 12); sl.position.y = -0.1; sh.add(sl); outline(sl, 1.08);
      const hb = cyl(0.093, 0.093, 0.025, dk(O.sleeve, 0.82), 12); hb.position.y = -0.195; sh.add(hb);
    } else if (O.overshirt) {
      const bk = cyl(0.077, 0.083, 0.34, sleeveM, 12); bk.position.y = -0.16; sh.add(bk); outline(bk, 1.07);
      const cf = cyl(0.072, 0.072, 0.05, dk(O.sleeve, 0.72), 12); cf.position.y = -0.375; sh.add(cf);
    }
    if (O.watch && side === -1) {
      const wm = mat(0x0d0d0f);
      const w = cyl(0.07, 0.07, 0.04, wm, 12); w.position.y = -0.37; sh.add(w);
      const wh = rbox(0.06, 0.06, 0.03, wm, 0.012); wh.position.set(0, -0.37, 0.07); sh.add(wh);
      const wf = cyl(0.022, 0.022, 0.012, mat(0xcfd2d6), 12); wf.rotation.x = Math.PI / 2; wf.position.set(0, -0.37, 0.088); sh.add(wf);
    }
    if (O.band) { const wb = cyl(0.067, 0.067, 0.05, mat(O.band), 12); wb.position.y = -0.38; sh.add(wb); }
    const hand = sph(0.062, skin, 12, 10); hand.position.y = -0.45; sh.add(hand);
    const finger = box(0.038, 0.14, 0.038, skin); finger.position.y = -0.55; finger.visible = false; sh.add(finger);
    return { sh, el: new THREE.Group(), finger };
  }
  const armL = arm(-1), armR = arm(1);

  function leg(side) {
    const hp = new THREE.Group(); hp.position.set(0.115 * side, 0, 0); hips.add(hp);
    const l = cyl(0.075, 0.075, 0.72, pantsM, 12); l.position.y = -0.36; hp.add(l); outline(l, 1.16);
    if (O.tee) { const cuff = cyl(0.088, 0.088, 0.06, dk(O.pants, 0.8), 12); cuff.position.y = -0.68; hp.add(cuff); outline(cuff, 1.1); }
    if (O.cargo) {
      const pk = rbox(0.05, 0.17, 0.12, pantsM, 0.015, 2); pk.position.set(0.09 * side, -0.3, 0.02); hp.add(pk); outline(pk, 1.12);
      const fl = rbox(0.055, 0.05, 0.125, dk(O.pants, 0.7), 0.012); fl.position.set(0.092 * side, -0.235, 0.02); hp.add(fl);
    }
    if (O.sandal) {
      const ft = sph(0.08, skin, 12, 10); ft.scale.set(1, 0.55, 1.7); ft.position.set(0, -0.735, 0.05); hp.add(ft);
      const so = rbox(0.16, 0.04, 0.29, shoeM, 0.018, 2); so.position.set(0, -0.77, 0.06); hp.add(so); outline(so, 1.08);
      const st = rbox(0.15, 0.03, 0.07, shoeM, 0.012); st.position.set(0, -0.70, 0.09); hp.add(st);
    } else if (O.sneaker) {
      const cream = mat(0xe8e0cc);
      const up = rbox(0.15, 0.10, 0.27, shoeM, 0.045, 3); up.position.set(0, -0.715, 0.06); hp.add(up); outline(up, 1.07);
      const sl = rbox(0.165, 0.035, 0.29, cream, 0.017, 2); sl.position.set(0, -0.77, 0.06); hp.add(sl);
      const tc = sph(0.062, cream, 10, 8); tc.scale.set(1.05, 0.75, 1.0); tc.position.set(0, -0.735, 0.15); hp.add(tc);
    } else {
      const ft = sph(0.08, shoeM, 12, 10); ft.scale.set(1, 0.55, 1.7); ft.position.set(0, -0.745, 0.05); hp.add(ft);
    }
    return { hp, kn: new THREE.Group() };
  }
  const legL = leg(-1), legR = leg(1);

  // lentera di tangan kiri (naskah + pose pakai ini)
  const lantern = new THREE.Group(); lantern.position.set(0, -0.45, 0.06); armL.sh.add(lantern);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.01, 6, 10, Math.PI), ink);
  handle.position.y = 0.01; handle.castShadow = true; lantern.add(handle);
  const lampRoof = new THREE.Mesh(new THREE.ConeGeometry(0.078, 0.05, 4), ink);
  lampRoof.position.y = -0.03; lampRoof.rotation.y = Math.PI / 4; lampRoof.castShadow = true; lantern.add(lampRoof);
  const lampTop = box(0.12, 0.015, 0.12, ink); lampTop.position.y = -0.05; lantern.add(lampTop);
  const lampGlass = box(0.105, 0.12, 0.105, lampM); lampGlass.position.y = -0.10; lantern.add(lampGlass);
  for (const [fx, fz] of [[-0.052, -0.052], [0.052, -0.052], [-0.052, 0.052], [0.052, 0.052]]) {
    const post = box(0.01, 0.13, 0.01, ink); post.position.set(fx, -0.10, fz); lantern.add(post);
  }
  const lampBottom = box(0.12, 0.015, 0.12, ink); lampBottom.position.y = -0.16; lantern.add(lampBottom);
  const lampLight = new THREE.PointLight(0xffa63d, 10, 5, 1.8); lampLight.position.y = -0.10; lantern.add(lampLight);

  // gembok (prop, hanya pose 6)
  const padlock = new THREE.Group();
  padlock.add(box(0.18, 0.16, 0.05, new THREE.MeshStandardMaterial({ color: 0xd4a017, roughness: 0.5, metalness: 0.3 })));
  const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.015, 6, 10, Math.PI), ink);
  shackle.position.y = 0.10; padlock.add(shackle);
  padlock.position.set(0, 1.08, 0.52); padlock.visible = false; root.add(padlock);
  padlock.traverse(o => { o.userData.isProp = true; });

  const joints = { root, hips, head: headG, shL: armL.sh, elL: armL.el, shR: armR.sh, elR: armR.el, hipL: legL.hp, kneeL: legL.kn, hipR: legR.hp, kneeR: legR.kn, eyeL, eyeR, mouth, mouthO, mouthSmile, tongue, browL, browR, blushL, blushR, lantern, lampLight, fingerR: armR.finger, padlock };
  const tris = countTriangles(root);
  return { group: root, joints, tris };
}

// ---------- pose (konvensi sama seperti character.js & blocky:
// ke depan = rotasi x negatif, lutut = x positif) ----------
// rootY disesuaikan untuk purin (hips di 0.46, bukan 0.60):
// - mengantuk (duduk おすわり): rootY -0.18 — alas puding menyentuh tanah,
//   kaki stub terlipat ke depan (bukan -0.58 seperti blocky, itu akan menenggelamkan puding).
// - mengintip (jongkok): rootY -0.12, kaki terlipat sebagian.
// EKSPRESI — REVISI v5: mulut + alis BERVARIASI per pose (bukan satu
// bentuk untuk semua). Mulut punya 3 BENTUK (`mouthType`): 'line' (garis
// kecil tegas/netral), 'o' ("o" kecil terbuka), 'smile' (senyum ⌣ kecil).
// Semua mulut SANGAT KECIL (ala Gambar 2/3 — mulut chart itu kecil banget).
// Konvensi alis (rotasi z): browL negatif / browR positif = ujung dalam
// turun = tegas/konsentrasi; sebaliknya = ujung dalam naik =
// terkejut/khawatir/penasaran. `tongue` = lidah kelihatan (0 = sembunyi)
// saat mulut terbuka lebar.
const P = {
  larangan:     { rootY: 0, hipsX: 0, headX: 0.15, headZ: 0, shL: [-0.25, 0, 0.15], elL: [-1.2, 0, 0], shR: [-2.4, 0, 0.3], elR: [-0.2, 0, 0], hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: 0, kneeR: 0, eyes: 1, mouthType: 'line', mouth: [1.2, 0.25], brows: [-0.35, 0.35], tongue: 0 },
  mendengarkan: { rootY: 0, hipsX: 0.08, headX: 0.1, headZ: 0.28, headY: -0.2, shL: [0.15, 0, 0.1], elL: [-0.3, 0, 0], shR: [-3.0, 0, 0.35], elR: [-1.9, 0, 0], hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: 0.1, kneeR: 0.1, eyes: 1, mouthType: 'line', mouth: [1.0, 0.3], brows: [0.15, -0.05], tongue: 0 },
  mengantuk:    { rootY: -0.67, hipsX: 0.12, headX: 0.45, headZ: 0.12, shL: [0.3, 0, 0.1], elL: [-0.2, 0, 0], shR: [0.25, 0, -0.1], elR: [-0.9, 0, 0], hipL: [-1.4, 0, -0.2], hipR: [-1.4, 0, 0.2], kneeL: 0.2, kneeR: 0.2, eyes: 0.15, mouthType: 'o', mouth: [0.9, 1.15], brows: [0.15, -0.15], tongue: 0.8 },
  terkejut:     { rootY: -0.03, hipsX: -0.12, headX: -0.15, headZ: 0, shL: [-1.9, 0, -0.7], elL: [-0.2, 0, 0], shR: [-1.9, 0, 0.7], elR: [-0.2, 0, 0], hipL: [-0.1, 0, 0], hipR: [-0.1, 0, 0], kneeL: 0.25, kneeR: 0.25, eyes: 1.2, mouthType: 'o', mouth: [0.85, 1.1], brows: [0.35, -0.35], tongue: 1.0 },
  mundur:       { rootY: 0, hipsX: -0.18, headX: -0.1, headZ: 0, headY: 0.35, shL: [-1.7, 0, -0.35], elL: [-1.6, 0, 0], shR: [-1.4, 0, 0.35], elR: [-1.8, 0, 0], hipL: [0.35, 0, 0], hipR: [-0.25, 0, 0], kneeL: 0.3, kneeR: 0.35, eyes: 1.15, mouthType: 'line', mouth: [0.9, 0.35], brows: [0.3, -0.3], tongue: 0.3 },
  gembok:       { rootY: -0.05, hipsX: 0.3, headX: 0.45, headZ: 0, shL: [-1.3, 0, 0.2], elL: [-0.5, 0, 0], shR: [-1.3, 0, -0.2], elR: [-0.5, 0, 0], hipL: [-0.15, 0, 0], hipR: [-0.15, 0, 0], kneeL: 0.3, kneeR: 0.3, eyes: 1, mouthType: 'line', mouth: [1.0, 0.3], brows: [-0.25, 0.25], padlock: true, lamp: 1.5, tongue: 0 },
  mengintip:    { rootY: -0.29, hipsX: 0.15, headX: 0.1, headZ: 0, headY: 0.35, shL: [-2.1, 0, 0.5], elL: [-0.4, 0, 0], shR: [-1.0, 0, 0], elR: [-1.7, 0, 0], hipL: [-0.9, 0, 0], hipR: [-0.9, 0, 0], kneeL: 0.9, kneeR: 0.9, eyes: 1.1, mouthType: 'line', mouth: [1.0, 0.3], brows: [-0.12, 0.12], lamp: 4, tongue: 0 },
  tanya:        { rootY: 0, hipsX: 0, headX: 0, headZ: 0.18, shL: [-0.6, 0, -0.75], elL: [-0.9, 0, 0], shR: [-0.6, 0, 0.75], elR: [-0.9, 0, 0], hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: 0.05, kneeR: 0.05, eyes: 1, mouthType: 'smile', mouth: [1.0, 1.0], brows: [0.35, -0.1], tongue: 0.5, blush: true },
};
// 7 ekspresi model sheet (desain Aurelia). Hanya wajah + sikap badan; tanpa lentera.
const B = { rootY: 0, hipsX: 0, headX: 0, headZ: 0, shL: [0, 0, -0.05], elL: [0, 0, 0], shR: [0, 0, 0.05], elR: [0, 0, 0], hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: 0, kneeR: 0, eyes: 1, mouthType: 'line', mouth: [1, 0.3], brows: [0, 0], tongue: 0, noProp: true };
export const EXPR = ['neutral', 'curious', 'surprised', 'relaxed', 'happy', 'tired', 'focused'];
export const EXPRESSIONS = EXPR; // alias — index.html workspace memakai nama EXPRESSIONS (isi sama, file kit tidak diubah selain baris ini)
Object.assign(P, {
  neutral:   { ...B },
  curious:   { ...B, headZ: 0.2, headY: 0.25, eyes: 1.1, mouthType: 'o', mouth: [0.6, 0.7], brows: [0.35, -0.1], browY: 0.02 },
  surprised: { ...B, hipsX: -0.08, headX: -0.1, shL: [-0.6, 0, -0.5], shR: [-0.6, 0, 0.5], eyes: 1.35, mouthType: 'o', mouth: [0.95, 1.3], brows: [0.35, -0.35], browY: 0.05 },
  relaxed:   { ...B, headX: -0.15, headZ: 0.08, shL: [0, 0, -0.35], shR: [0, 0, 0.35], eyes: 0.3, mouthType: 'smile', mouth: [0.9, 0.8], brows: [0.12, -0.12], blush: true },
  happy:     { ...B, shR: [-1.5, 0, 0.4], eyes: 0.9, mouthType: 'smile', mouth: [1.5, 1.6], brows: [0.1, -0.1], browY: 0.03, blush: true },
  tired:     { ...B, rootY: -0.02, hipsX: 0.1, headX: 0.3, eyes: 0.4, mouthType: 'o', mouth: [0.7, 0.8], brows: [0.3, -0.3], browY: -0.01, shL: [0.1, 0, -0.02], shR: [0.1, 0, 0.02] },
  focused:   { ...B, hipsX: 0.1, headX: 0.35, shL: [-1.0, 0, -0.15], shR: [-1.1, 0, 0.15], eyes: 0.8, brows: [-0.3, 0.3], browY: -0.005, mouth: [0.8, 0.3] },
});
export function applyPose(j, name) {
  const p = P[name] || P.larangan;
  const set = (g, r) => { if (g && r) g.rotation.set(r[0], r[1] || 0, r[2] || 0); };
  j.root.position.y = p.rootY;
  j.hips.rotation.set(p.hipsX, 0, 0);
  j.head.rotation.set(p.headX, p.headY || 0, p.headZ);
  set(j.shL, p.shL); set(j.elL, p.elL); set(j.shR, p.shR); set(j.elR, p.elR);
  set(j.hipL, p.hipL); set(j.hipR, p.hipR);
  j.kneeL.rotation.x = p.kneeL; j.kneeR.rotation.x = p.kneeR;
  j.eyeL.scale.y = p.eyes; j.eyeR.scale.y = p.eyes;
  // mulut v5: 3 bentuk, dipilih per pose — hanya yang aktif yang kelihatan
  const mt = p.mouthType || 'line';
  j.mouth.visible = (mt === 'line');
  j.mouthO.visible = (mt === 'o');
  j.mouthSmile.visible = (mt === 'smile');
  if (mt === 'line') j.mouth.scale.set(p.mouth[0], p.mouth[1], 0.4);
  if (mt === 'o') j.mouthO.scale.set(p.mouth[0], p.mouth[1], 0.4);
  if (mt === 'smile') j.mouthSmile.scale.set(p.mouth[0], p.mouth[1], 1);
  // lidah kelihatan hanya saat mulut terbuka lebar (p.tongue > 0)
  const t = p.tongue || 0;
  j.tongue.visible = t > 0;
  if (t > 0) j.tongue.scale.set(0.9 * t, 0.45 * t, 0.3);
  j.browL.rotation.z = p.brows[0]; j.browR.rotation.z = p.brows[1];
  j.browL.position.y = j.browR.position.y = 0.095 + (p.browY || 0);
  j.lantern.visible = !p.noProp;
  j.blushL.visible = j.blushR.visible = !!p.blush; // pipi merah (sheet: happy/proud)
  j.padlock.visible = !!p.padlock;
  j.fingerR.visible = (name === 'larangan');
  j.lampLight.intensity = p.lamp || 10;
}
