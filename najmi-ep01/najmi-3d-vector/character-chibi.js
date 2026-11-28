// Najmi CHIBI detail — varian baru, BUKAN pengganti v9.
// File ini tidak mengubah character-purin.js. Dipakai lewat ?char=chibi.
// Proporsi chibi: kepala ~52% tinggi total, total ~1,36 m.
// - Kepala r 0,38 (v9: 0,33), badan pendek membulat, lengan/kaki stubby.
// - Detail baru vs v9: mata berlapis (sklera + iris + pupil + 2 highlight
//   + bulu mata), poni 5 helai + ahoge + jambul samping, telinga dalam,
//   bintik pipi, syal berlipat + rumbai, jari tangan (3 ruas + jempol),
//   sneakers bertali + sol berlapis, saku cargo berkancing, kerah + kancing.
// - Interface SAMA seperti v9: buildChibi(outfit), applyChibiPose(joints,
//   name), countTriangles(). Pose 8 + 7 ekspresi sama, rootY diskala 0,55
//   karena pinggul chibi lebih rendah (y 0,38, bukan 0,79).
// - Budget: target < 16.000 tris seperti v9.
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

const INK = 0x1b1d33;
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
function cyl(rt, rb, h, m, seg = 12) {
  const x = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
  x.castShadow = x.receiveShadow = true; return x;
}
function sph(r, m, w = 16, h = 12) {
  // Detail kecil (jambul, jari, mata) tidak butuh segmen tinggi — hemat tris.
  if (r <= 0.09) { w = Math.min(w, 8); h = Math.min(h, 6); }
  else if (r <= 0.2) { w = Math.min(w, 12); h = Math.min(h, 9); }
  const x = new THREE.Mesh(new THREE.SphereGeometry(r, w, h), m);
  x.castShadow = x.receiveShadow = true; return x;
}
function rbox(w, h, d, m, r = 0.06, seg = 2) {
  // RoundedBox seg 3 mahal — batasi ke 2, sudut tetap membulat di gaya toon.
  const x = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, Math.min(seg, 2), r), m);
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

const SKIN = 0xa8744a; // sawo matang, sama seperti v9
const SCARF = 0xd89000; // syal kuning — ciri Najmi, tidak berubah
const OUTFITS = {
  bintang: { shirt: 0xf0ece4, sleeve: 0x1f7a6a, pants: 0x6b6a52, shoe: 0xd8d0c0 },
  jaket:   { shirt: 0xf0ece4, sleeve: 0xf0ece4, pants: 0x2f5f9a, shoe: 0x5a3a24, band: 0xe8e4dc },
  rumah:   { shirt: 0xe6d9bd, sleeve: 0xe6d9bd, pants: 0x3a3c40, shoe: 0x6a6a6e, short: true, sandal: false, watch: true, tee: true },
  jelajah: { shirt: 0xe6d9bd, sleeve: 0x5b6130, pants: 0x2d2f2c, shoe: 0x7a4a28, overshirt: 0x5b6130, cargo: true, bag: 0x4a3a2a, sneaker: true, tee: true },
};

export function buildChibi(outfit = 'jelajah') {
  const O = OUTFITS[outfit] || OUTFITS.jelajah;
  const skin = mat(SKIN), ink = mat(INK), scarfM = mat(SCARF);
  const white = mat(0xffffff), blushM = mat(0xf2a0ae), tongueM = mat(0xe88a96), mouthOpenM = mat(0x7a2a3a);
  const eyeM = mat(0x2e1a10), browM = mat(0x050506);
  const irisM = mat(0x6b3a1a), pupilM = mat(0x120a06);
  const lampM = new THREE.MeshStandardMaterial({ map: lanternTex(), emissive: 0xff9a2a, emissiveIntensity: 1.2, roughness: 0.8 });

  const root = new THREE.Group();
  // Pinggul chibi di y 0,38 (v9: 0,79) — kaki + badan jauh lebih pendek.
  const hips = new THREE.Group(); hips.position.y = 0.38; root.add(hips);

  // ---- BADAN: kotak membulat pendek, bahu lebar (chibi gemuk) ----
  const bodyM = mat(O.shirt);
  const body = rbox(0.52, 0.40, 0.34, bodyM, 0.09, 3);
  body.position.y = 0.20; hips.add(body); outline(body, 1.05);
  // kerah rib + hem bawah
  const dk = (c, k) => mat(new THREE.Color(c).multiplyScalar(k));
  const rib = dk(O.shirt, 0.8);
  const nk = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 8, 16), rib);
  nk.position.y = 0.40; nk.rotation.x = Math.PI / 2; hips.add(nk);
  const hem = rbox(0.54, 0.08, 0.36, dk(O.shirt, 0.92), 0.04, 2);
  hem.position.y = 0.02; hips.add(hem); outline(hem, 1.04);

  if (outfit === 'bintang') {
    const st = new THREE.Shape(); const R = 0.08, r = 0.035;
    for (let i = 0; i < 10; i++) {
      const ang = Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r : R;
      const x = Math.cos(ang) * rad, y = Math.sin(ang) * rad;
      if (i === 0) st.moveTo(x, y); else st.lineTo(x, y);
    }
    const star = new THREE.Mesh(new THREE.ShapeGeometry(st), new THREE.MeshBasicMaterial({ color: 0xe0652a, side: THREE.DoubleSide }));
    star.position.set(0, 0.24, 0.173); star.userData.isProp = true; hips.add(star);
  }
  if (outfit === 'jaket') {
    const maroon = mat(0x6a1d28);
    const strip = box(0.14, 0.34, 0.02, maroon); strip.position.set(0, 0.22, 0.177); hips.add(strip);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.032, 8, 16), maroon);
    collar.position.y = 0.41; collar.rotation.x = Math.PI / 2; hips.add(collar);
  }
  if (O.overshirt) {
    // overshirt zaitun: 2 panel depan + saku dada berpenutup + 3 kancing + kerah
    const ov = mat(O.overshirt), ovd = dk(O.overshirt, 0.72), btn = mat(0x2a2418);
    for (const sd of [-1, 1]) {
      const pn = rbox(0.19, 0.40, 0.06, ov, 0.025, 3); pn.position.set(0.17 * sd, 0.20, 0.175); hips.add(pn); outline(pn, 1.05);
      const pk = rbox(0.09, 0.08, 0.03, ov, 0.01); pk.position.set(0.18 * sd, 0.28, 0.21); hips.add(pk);
      const fl = rbox(0.095, 0.03, 0.035, ovd, 0.01); fl.position.set(0.18 * sd, 0.325, 0.215); hips.add(fl);
      const cl = rbox(0.12, 0.05, 0.06, ov, 0.02); cl.position.set(0.09 * sd, 0.42, 0.13); cl.rotation.z = 0.5 * sd; hips.add(cl); outline(cl, 1.08);
    }
    for (const y of [0.08, 0.19, 0.30]) { const b = cyl(0.015, 0.015, 0.012, btn, 10); b.rotation.x = Math.PI / 2; b.position.set(0.11, y, 0.21); hips.add(b); }
    const back = rbox(0.54, 0.40, 0.06, ov, 0.03, 3); back.position.set(0, 0.20, -0.175); hips.add(back); outline(back, 1.04);
    const bcol = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.032, 8, 16), ov); bcol.position.y = 0.42; bcol.rotation.x = Math.PI / 2; hips.add(bcol);
    // sabuk: gesper emas di depan
    const belt = cyl(0.27, 0.27, 0.05, mat(0x3a2c1a), 12); belt.position.y = 0.03; belt.scale.set(1, 1, 0.65); hips.add(belt);
    const buckle = rbox(0.07, 0.04, 0.02, mat(0xd4a017), 0.008); buckle.position.set(0, 0.03, 0.185); hips.add(buckle);
  }
  if (O.bag) {
    const bm = mat(O.bag), bd = dk(O.bag, 0.7), gold = mat(0xb8955a);
    const strap = rbox(0.05, 0.44, 0.03, bm, 0.012); strap.position.set(0.005, 0.20, 0.21); strap.rotation.z = -0.5; hips.add(strap); outline(strap, 1.1);
    const bag = rbox(0.18, 0.15, 0.08, bm, 0.025, 3); bag.position.set(-0.15, 0.02, 0.235); hips.add(bag); outline(bag, 1.08);
    const flap = rbox(0.185, 0.06, 0.09, bd, 0.02); flap.position.set(-0.15, 0.065, 0.24); hips.add(flap); outline(flap, 1.08);
    const clasp = sph(0.015, gold, 8, 6); clasp.position.set(-0.15, 0.035, 0.282); hips.add(clasp);
  }
  // ---- SYAL kuning berlipat + ekor + rumbai ----
  const scarfRing = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.05, 8, 16), scarfM);
  scarfRing.position.y = 0.43; scarfRing.rotation.x = Math.PI / 2; hips.add(scarfRing); outline(scarfRing, 1.06);
  const scarfFold = new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.035, 8, 16), dk(SCARF, 0.85));
  scarfFold.position.y = 0.38; scarfFold.rotation.x = Math.PI / 2; hips.add(scarfFold);
  const tail = rbox(0.13, 0.26, 0.045, scarfM, 0.02, 2); tail.position.set(0.14, 0.28, 0.20); tail.rotation.z = 0.12; hips.add(tail); outline(tail, 1.06);
  for (let i = 0; i < 3; i++) {
    const fr = box(0.03, 0.05, 0.02, dk(SCARF, 0.85)); fr.position.set(0.09 + i * 0.05, 0.13, 0.21); hips.add(fr);
  }

  // ---- KEPALA: bola besar r 0,38, pusat y 0,50 relatif pinggul ----
  const headG = new THREE.Group(); headG.position.y = 0.50; headG.scale.set(1, 0.95, 0.95); hips.add(headG);
  const head = sph(0.38, skin, 24, 18);
  headG.add(head); outline(head, 1.05);

  // ---- RAMBUT: mangkuk + 12 jambul + poni 5 helai + ahoge ----
  const hairM = mat(0x08070a);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.44, 24, 14, 0, Math.PI * 2, 0, 1.45), hairM);
  hair.position.y = 0.04; hair.scale.set(1.02, 1.08, 1.03); hair.rotation.x = -0.45; hair.castShadow = true; headG.add(hair); outline(hair, 1.04);
  for (const [x, y, z, sx, sy, sz, rz] of [
    [0.00, 0.48, 0.06, 1.3, 1.0, 1.1, 0.2], [-0.18, 0.45, 0.10, 1.2, 1.0, 1.0, -0.6], [0.19, 0.44, 0.12, 1.3, 0.9, 1.0, 0.7],
    [-0.09, 0.42, -0.13, 1.4, 1.0, 1.2, 0.4], [0.13, 0.43, -0.11, 1.2, 1.1, 1.2, -0.4],
    [-0.22, 0.30, 0.24, 1.1, 1.3, 0.9, -0.5], [0.05, 0.33, 0.32, 1.2, 1.1, 0.8, 0.3], [0.24, 0.28, 0.22, 1.0, 1.3, 0.9, 0.5],
    [-0.33, 0.14, 0.00, 0.8, 1.4, 1.1, 0.0], [0.33, 0.14, 0.00, 0.8, 1.4, 1.1, 0.0],
    [-0.28, -0.05, -0.18, 0.9, 1.3, 1.0, -0.3], [0.28, -0.05, -0.18, 0.9, 1.3, 1.0, 0.3],
  ]) {
    const t = sph(0.085, hairM, 10, 8); t.position.set(x, y, z); t.scale.set(sx, sy, sz); t.rotation.z = rz;
    headG.add(t); outline(t, 1.07);
  }
  // poni: 5 helai pipih di dahi
  for (const [x, ry] of [[-0.24, 0.5], [-0.12, 0.25], [0.0, 0.0], [0.12, -0.25], [0.24, -0.5]]) {
    const f = sph(0.09, hairM, 10, 8); f.scale.set(0.9, 1.5, 0.45); f.position.set(x, 0.30, 0.30); f.rotation.z = ry; headG.add(f); outline(f, 1.06);
  }
  // ahoge: sehelai rambut melengkung di puncak
  const ahogeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.46, 0.02), new THREE.Vector3(0.04, 0.56, 0.03),
    new THREE.Vector3(0.10, 0.60, 0.02), new THREE.Vector3(0.14, 0.58, 0.05),
  ]);
  const ahoge = new THREE.Mesh(new THREE.TubeGeometry(ahogeCurve, 12, 0.013, 6), hairM);
  ahoge.castShadow = true; headG.add(ahoge);

  const faceLight = new THREE.PointLight(0xffe6c0, 3.5, 3, 1.5);
  faceLight.position.set(0, 0.05, 1.1); headG.add(faceLight);

  // ---- WAJAH detail: mata berlapis + bulu mata + alis tebal ----
  function eye(side) {
    const g = new THREE.Group(); g.position.set(0.145 * side, 0.02, 0.345); g.rotation.y = side * 0.35; headG.add(g);
    const sclera = sph(0.058, white, 14, 12); sclera.scale.set(0.9, 1.2, 0.4); g.add(sclera);
    const iris = sph(0.038, irisM, 12, 10); iris.scale.set(1, 1.15, 0.35); iris.position.z = 0.018; g.add(iris);
    const pupil = sph(0.02, pupilM, 10, 8); pupil.scale.set(1, 1.2, 0.3); pupil.position.z = 0.032; g.add(pupil);
    const h1 = sph(0.013, white, 8, 6); h1.position.set(-0.013, 0.02, 0.042); g.add(h1);
    const h2 = sph(0.007, white, 6, 5); h2.position.set(0.012, -0.018, 0.042); g.add(h2);
    // bulu mata atas: busur tebal + 3 helai kecil
    const lash = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.009, 6, 16, 2.1), ink);
    lash.position.set(0, 0.006, 0.016); lash.rotation.z = 0.55; g.add(lash);
    for (const [lx, lz, lr] of [[-0.055, 0.02, 0.9], [0, 0.028, 0.5], [0.055, 0.02, 0.1]]) {
      const l = box(0.008, 0.03, 0.008, ink); l.position.set(lx, 0.055, lz); l.rotation.z = lr; g.add(l);
    }
    return g;
  }
  const eyeL = eye(-1), eyeR = eye(1);
  function brow(side) {
    const g = new THREE.Group(); g.position.set(0.145 * side, 0.115, 0.34); g.rotation.y = side * 0.32; headG.add(g);
    const b = box(0.12, 0.032, 0.022, browM); b.rotation.z = side * -0.08; g.add(b);
    return g;
  }
  const browL = brow(-1), browR = brow(1);
  function blush(side) {
    const b = sph(0.058, blushM, 10, 8); b.scale.set(1.1, 0.7, 0.3); b.rotation.y = side * 0.6;
    b.position.set(0.23 * side, -0.08, 0.29); b.visible = false; headG.add(b); return b;
  }
  const blushL = blush(-1), blushR = blush(1);
  // bintik pipi: 3 titik kecil per pipi, selalu terlihat (ciri chibi)
  for (const sd of [-1, 1]) {
    for (const [dx, dy] of [[-0.02, 0.015], [0.015, 0.0], [0.0, -0.02]]) {
      const f = sph(0.008, mat(0x8a5a3a), 6, 5); f.position.set(0.24 * sd + dx, -0.06 + dy, 0.30); headG.add(f);
    }
  }
  const nose = sph(0.032, skin, 12, 10); nose.scale.set(1, 0.9, 0.8); nose.position.set(0, -0.06, 0.365); headG.add(nose);
  for (const sd of [-1, 1]) {
    const ear = sph(0.068, skin, 10, 8); ear.scale.set(0.45, 1, 0.8); ear.position.set(0.375 * sd, -0.04, 0); headG.add(ear); outline(ear, 1.1);
    const inner = sph(0.035, mat(0xc98a6a), 8, 6); inner.scale.set(0.3, 0.8, 0.5); inner.position.set(0.39 * sd, -0.04, 0.02); headG.add(inner);
  }
  const mark = sph(0.022, mat(0x7a3a2a), 8, 6); mark.scale.set(1.5, 0.8, 0.3); mark.rotation.set(0, 0.7, 0.5);
  mark.position.set(0.24, -0.02, 0.27); headG.add(mark);
  const mouth = sph(0.03, ink, 12, 10); mouth.scale.set(1.3, 0.2, 0.4); mouth.position.set(0, -0.135, 0.35); headG.add(mouth);
  const mouthO = sph(0.024, mouthOpenM, 12, 10); mouthO.scale.set(0.9, 1.15, 0.4); mouthO.position.set(0, -0.135, 0.353); mouthO.visible = false; headG.add(mouthO);
  const mouthSmile = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.008, 5, 12, Math.PI), ink);
  mouthSmile.position.set(0, -0.135, 0.353); mouthSmile.rotation.z = Math.PI; mouthSmile.visible = false; headG.add(mouthSmile);
  const tongue = sph(0.026, tongueM, 10, 8); tongue.scale.set(1.2, 0.6, 0.3); tongue.position.set(0, -0.16, 0.34); tongue.visible = false; headG.add(tongue);

  // ---- LENGAN stubby + tangan berjari ----
  const sleeveM = mat(O.sleeve), pantsM = mat(O.pants), shoeM = mat(O.shoe);
  function arm(side) {
    const sh = new THREE.Group(); sh.position.set(0.31 * side, 0.32, 0); hips.add(sh);
    const a = cyl(0.068, 0.068, 0.30, O.short ? skin : sleeveM, 12); a.position.y = -0.15; sh.add(a); outline(a, 1.15);
    if (O.short) {
      const sl = cyl(0.09, 0.095, 0.14, sleeveM, 12); sl.position.y = -0.07; sh.add(sl); outline(sl, 1.07);
    } else if (O.overshirt) {
      const bk = cyl(0.082, 0.088, 0.24, sleeveM, 12); bk.position.y = -0.11; sh.add(bk); outline(bk, 1.07);
      const cf = cyl(0.076, 0.076, 0.05, dk(O.sleeve, 0.72), 12); cf.position.y = -0.26; sh.add(cf);
    }
    if (O.watch && side === -1) {
      const wm = mat(0x0d0d0f);
      const w = cyl(0.075, 0.075, 0.04, wm, 12); w.position.y = -0.27; sh.add(w);
      const wf = cyl(0.024, 0.024, 0.012, mat(0xcfd2d6), 12); wf.rotation.x = Math.PI / 2; wf.position.set(0, -0.27, 0.078); sh.add(wf);
    }
    if (O.band) { const wb = cyl(0.072, 0.072, 0.05, mat(O.band), 12); wb.position.y = -0.27; sh.add(wb); }
    // tangan: telapak bulat + 3 jari + jempol
    const hand = sph(0.07, skin, 12, 10); hand.position.y = -0.33; sh.add(hand);
    for (let i = -1; i <= 1; i++) {
      const fg = sph(0.021, skin, 8, 6); fg.scale.set(1, 1.4, 1); fg.position.set(i * 0.038, -0.395, 0.01); sh.add(fg);
    }
    const thumb = sph(0.02, skin, 8, 6); thumb.scale.set(1, 1.3, 1); thumb.position.set(0.06 * side, -0.36, 0.04); sh.add(thumb);
    const finger = box(0.04, 0.15, 0.04, skin); finger.position.y = -0.42; finger.visible = false; sh.add(finger);
    return { sh, el: new THREE.Group(), finger };
  }
  const armL = arm(-1), armR = arm(1);

  // ---- KAKI pendek + sneakers bertali ----
  function leg(side) {
    const hp = new THREE.Group(); hp.position.set(0.13 * side, 0, 0); hips.add(hp);
    const l = cyl(0.08, 0.08, 0.34, pantsM, 12); l.position.y = -0.17; hp.add(l); outline(l, 1.14);
    const cuff = cyl(0.092, 0.092, 0.05, dk(O.pants, 0.8), 12); cuff.position.y = -0.31; hp.add(cuff); outline(cuff, 1.08);
    if (O.cargo) {
      const pk = rbox(0.055, 0.14, 0.12, pantsM, 0.015, 2); pk.position.set(0.095 * side, -0.14, 0.02); hp.add(pk); outline(pk, 1.1);
      const fl = rbox(0.06, 0.04, 0.125, dk(O.pants, 0.7), 0.012); fl.position.set(0.097 * side, -0.085, 0.02); hp.add(fl);
      const bt = sph(0.011, mat(0x2a2418), 8, 6); bt.position.set(0.097 * side, -0.11, 0.085); hp.add(bt);
    }
    // kaos kaki putih di atas sepatu
    const sock = cyl(0.082, 0.085, 0.06, white, 12); sock.position.y = -0.35; hp.add(sock);
    if (O.sneaker) {
      const cream = mat(0xe8e0cc);
      const up = rbox(0.16, 0.11, 0.28, shoeM, 0.045, 3); up.position.set(0, -0.40, 0.05); hp.add(up); outline(up, 1.06);
      const sl = rbox(0.175, 0.04, 0.30, cream, 0.017, 2); sl.position.set(0, -0.46, 0.05); hp.add(sl);
      const tc = sph(0.065, cream, 10, 8); tc.scale.set(1.05, 0.75, 1.0); tc.position.set(0, -0.42, 0.16); hp.add(tc);
      for (let i = 0; i < 3; i++) {
        const lace = box(0.09, 0.012, 0.02, cream); lace.position.set(0, -0.345 + i * 0.005, 0.08 + i * 0.035); lace.rotation.x = -0.3; hp.add(lace);
      }
    } else {
      const ft = sph(0.085, shoeM, 12, 10); ft.scale.set(1, 0.55, 1.7); ft.position.set(0, -0.42, 0.05); hp.add(ft);
    }
    return { hp, kn: new THREE.Group() };
  }
  const legL = leg(-1), legR = leg(1);

  // lentera di tangan kiri (skala chibi 0,9)
  const lantern = new THREE.Group(); lantern.position.set(0, -0.33, 0.06); lantern.scale.setScalar(0.9); armL.sh.add(lantern);
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
  const lampLight = new THREE.PointLight(0xffa63d, 6, 5, 1.8); // chibi: 6, bukan 10 seperti v9 — lengan pendek, lentera lebih dekat ke badan lampLight.position.y = -0.10; lantern.add(lampLight);

  const padlock = new THREE.Group();
  padlock.add(box(0.18, 0.16, 0.05, new THREE.MeshStandardMaterial({ color: 0xd4a017, roughness: 0.5, metalness: 0.3 })));
  const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.015, 6, 10, Math.PI), ink);
  shackle.position.y = 0.10; padlock.add(shackle);
  padlock.position.set(0, 0.70, 0.55); // chibi: lebih rendah + ke depan dari v9 (0,85/0,45) — kalau tidak, gembok ketutup dagu saat kepala menunduk di pose6 padlock.scale.setScalar(0.9); padlock.visible = false; root.add(padlock);
  padlock.traverse(o => { o.userData.isProp = true; });

  const joints = { root, hips, head: headG, shL: armL.sh, elL: armL.el, shR: armR.sh, elR: armR.el, hipL: legL.hp, kneeL: legL.kn, hipR: legR.hp, kneeR: legR.kn, eyeL, eyeR, mouth, mouthO, mouthSmile, tongue, browL, browR, blushL, blushR, lantern, lampLight, fingerR: armR.finger, padlock };
  const tris = countTriangles(root);
  return { group: root, joints, tris };
}

// Pose chibi — nilai sama seperti v9, rootY diskala 0,55 (pinggul 0,38).
const P = {
  larangan:     { rootY: 0, hipsX: 0, headX: 0.15, headZ: 0, shL: [-0.25, 0, 0.15], elL: [-1.2, 0, 0], shR: [-2.4, 0, 0.3], elR: [-0.2, 0, 0], hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: 0, kneeR: 0, eyes: 1, mouthType: 'line', mouth: [1.2, 0.25], brows: [-0.35, 0.35], tongue: 0 },
  mendengarkan: { rootY: 0, hipsX: 0.08, headX: 0.1, headZ: 0.28, headY: -0.2, shL: [0.15, 0, 0.1], elL: [-0.3, 0, 0], shR: [-3.0, 0, 0.35], elR: [-1.9, 0, 0], hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: 0.1, kneeR: 0.1, eyes: 1, mouthType: 'line', mouth: [1.0, 0.3], brows: [0.15, -0.05], tongue: 0 },
  mengantuk:    { rootY: -0.37, hipsX: 0.12, headX: 0.45, headZ: 0.12, shL: [0.3, 0, 0.1], elL: [-0.2, 0, 0], shR: [0.25, 0, -0.1], elR: [-0.9, 0, 0], hipL: [-1.4, 0, -0.2], hipR: [-1.4, 0, 0.2], kneeL: 0.2, kneeR: 0.2, eyes: 0.15, mouthType: 'o', mouth: [0.9, 1.15], brows: [0.15, -0.15], tongue: 0.8 },
  terkejut:     { rootY: -0.02, hipsX: -0.12, headX: -0.15, headZ: 0, shL: [-1.9, 0, -0.7], elL: [-0.2, 0, 0], shR: [-1.9, 0, 0.7], elR: [-0.2, 0, 0], hipL: [-0.1, 0, 0], hipR: [-0.1, 0, 0], kneeL: 0.25, kneeR: 0.25, eyes: 1.2, mouthType: 'o', mouth: [0.85, 1.1], brows: [0.35, -0.35], tongue: 1.0 },
  mundur:       { rootY: 0, hipsX: -0.18, headX: -0.1, headZ: 0, headY: 0.35, shL: [-1.7, 0, -0.35], elL: [-1.6, 0, 0], shR: [-1.4, 0, 0.35], elR: [-1.8, 0, 0], hipL: [0.35, 0, 0], hipR: [-0.25, 0, 0], kneeL: 0.3, kneeR: 0.35, eyes: 1.15, mouthType: 'line', mouth: [0.9, 0.35], brows: [0.3, -0.3], tongue: 0.3 },
  gembok:       { rootY: -0.03, hipsX: 0.3, headX: 0.45, headZ: 0, shL: [-1.3, 0, 0.2], elL: [-0.5, 0, 0], shR: [-1.3, 0, -0.2], elR: [-0.5, 0, 0], hipL: [-0.15, 0, 0], hipR: [-0.15, 0, 0], kneeL: 0.3, kneeR: 0.3, eyes: 1, mouthType: 'line', mouth: [1.0, 0.3], brows: [-0.25, 0.25], padlock: true, lamp: 1.5, tongue: 0 },
  mengintip:    { rootY: -0.16, hipsX: 0.15, headX: 0.1, headZ: 0, headY: 0.35, shL: [-2.1, 0, 0.5], elL: [-0.4, 0, 0], shR: [-1.0, 0, 0], elR: [-1.7, 0, 0], hipL: [-0.9, 0, 0], hipR: [-0.9, 0, 0], kneeL: 0.9, kneeR: 0.9, eyes: 1.1, mouthType: 'line', mouth: [1.0, 0.3], brows: [-0.12, 0.12], lamp: 4, tongue: 0 },
  tanya:        { rootY: 0, hipsX: 0, headX: 0, headZ: 0.18, shL: [-0.6, 0, -0.75], elL: [-0.9, 0, 0], shR: [-0.6, 0, 0.75], elR: [-0.9, 0, 0], hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: 0.05, kneeR: 0.05, eyes: 1, mouthType: 'smile', mouth: [1.0, 1.0], brows: [0.35, -0.1], tongue: 0.5, blush: true },
};
const B = { rootY: 0, hipsX: 0, headX: 0, headZ: 0, shL: [0, 0, -0.05], elL: [0, 0, 0], shR: [0, 0, 0.05], elR: [0, 0, 0], hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: 0, kneeR: 0, eyes: 1, mouthType: 'line', mouth: [1, 0.3], brows: [0, 0], tongue: 0, noProp: true };
Object.assign(P, {
  neutral:   { ...B },
  curious:   { ...B, headZ: 0.2, headY: 0.25, eyes: 1.1, mouthType: 'o', mouth: [0.6, 0.7], brows: [0.35, -0.1], browY: 0.02 },
  surprised: { ...B, hipsX: -0.08, headX: -0.1, shL: [-0.6, 0, -0.5], shR: [-0.6, 0, 0.5], eyes: 1.35, mouthType: 'o', mouth: [0.95, 1.3], brows: [0.35, -0.35], browY: 0.05 },
  relaxed:   { ...B, headX: -0.15, headZ: 0.08, shL: [0, 0, -0.35], shR: [0, 0, 0.35], eyes: 0.3, mouthType: 'smile', mouth: [0.9, 0.8], brows: [0.12, -0.12], blush: true },
  happy:     { ...B, shR: [-1.5, 0, 0.4], eyes: 0.9, mouthType: 'smile', mouth: [1.5, 1.6], brows: [0.1, -0.1], browY: 0.03, blush: true },
  tired:     { ...B, rootY: -0.01, hipsX: 0.1, headX: 0.3, eyes: 0.4, mouthType: 'o', mouth: [0.7, 0.8], brows: [0.3, -0.3], browY: -0.01, shL: [0.1, 0, -0.02], shR: [0.1, 0, 0.02] },
  focused:   { ...B, hipsX: 0.1, headX: 0.35, shL: [-1.0, 0, -0.15], shR: [-1.1, 0, 0.15], eyes: 0.8, brows: [-0.3, 0.3], browY: -0.005, mouth: [0.8, 0.3] },
});
export function applyChibiPose(j, name) {
  const p = P[name] || P.larangan;
  const set = (g, r) => { if (g && r) g.rotation.set(r[0], r[1] || 0, r[2] || 0); };
  j.root.position.y = p.rootY;
  j.hips.rotation.set(p.hipsX, 0, 0);
  j.head.rotation.set(p.headX, p.headY || 0, p.headZ);
  set(j.shL, p.shL); set(j.elL, p.elL); set(j.shR, p.shR); set(j.elR, p.elR);
  set(j.hipL, p.hipL); set(j.hipR, p.hipR);
  j.kneeL.rotation.x = p.kneeL; j.kneeR.rotation.x = p.kneeR;
  j.eyeL.scale.y = p.eyes; j.eyeR.scale.y = p.eyes;
  const mt = p.mouthType || 'line';
  j.mouth.visible = (mt === 'line');
  j.mouthO.visible = (mt === 'o');
  j.mouthSmile.visible = (mt === 'smile');
  if (mt === 'line') j.mouth.scale.set(p.mouth[0], p.mouth[1], 0.4);
  if (mt === 'o') j.mouthO.scale.set(p.mouth[0], p.mouth[1], 0.4);
  if (mt === 'smile') j.mouthSmile.scale.set(p.mouth[0], p.mouth[1], 1);
  const t = p.tongue || 0;
  j.tongue.visible = t > 0;
  if (t > 0) j.tongue.scale.set(0.9 * t, 0.45 * t, 0.3);
  j.browL.rotation.z = p.brows[0]; j.browR.rotation.z = p.brows[1];
  j.browL.position.y = j.browR.position.y = 0.115 + (p.browY || 0);
  j.lantern.visible = !p.noProp;
  j.blushL.visible = j.blushR.visible = !!p.blush;
  j.padlock.visible = !!p.padlock;
  j.fingerR.visible = (name === 'larangan');
  j.lampLight.intensity = p.lamp || 6;
}
