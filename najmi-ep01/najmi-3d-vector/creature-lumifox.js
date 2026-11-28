// Lumifox v2 (kawaii): rubah-kelinci chibi duduk. Kepala besar lebar + pipi berbulu, mata besar berkilau rendah di wajah,
// blush, telinga tinggi berujung daun, ruff dada lumut, kedua paw depan dipegang di dada, kaki belakang dengan bantalan oranye,
// ekor besar berbulu melengkung ke samping, ujung mint bercahaya + permata mint di dahi + 3 titik cahaya samar di punggung.
// Antarmuka SAMA dengan v1: buildLumifox() -> { group, joints }, applyLumi(joints, 'neutral'|'curious'|'mischievous').
import * as THREE from 'three';

const INK = 0x1b1d33, CREAM = 0xfaf0d8, BELLY = 0xfffaf0, MOSS = 0x8fb06a, MINT = 0x7ff0d0, EYE = 0x35b79a, PAD = 0xf29a6e, BLUSH = 0xf4a29a;
const mat = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0 });
const glow = (c, k) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: k, roughness: 0.5 });
const halo = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false });
const EAR_TILT = 0.3;
function sph(r, m, sx = 1, sy = 1, sz = 1, w = 20, h = 14) {
  const x = new THREE.Mesh(new THREE.SphereGeometry(r, w, h), m); x.scale.set(sx, sy, sz); x.castShadow = x.receiveShadow = true; return x;
}
function outline(mesh, s = 1.06) {
  const o = new THREE.Mesh(mesh.geometry, new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide }));
  o.position.copy(mesh.position); o.rotation.copy(mesh.rotation); o.scale.copy(mesh.scale).multiplyScalar(s);
  mesh.parent.add(o); return o;
}
function leaf(len, wid, depth, m) {
  const sh = new THREE.Shape();
  sh.moveTo(0, 0); sh.bezierCurveTo(wid * 1.3, len * 0.12, wid * 1.0, len * 0.65, 0, len);
  sh.bezierCurveTo(-wid * 1.0, len * 0.65, -wid * 1.3, len * 0.12, 0, 0);
  const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2, curveSegments: 12 });
  g.translate(0, 0, -depth / 2);
  const x = new THREE.Mesh(g, m); x.castShadow = x.receiveShadow = true; return x;
}
// tuft bulu runcing (pipi, ruff): kerucut kecil menunjuk ke arah (rx, rz)
function tuft(m, r, h, x, y, z, rx, rz) {
  const t = new THREE.Mesh(new THREE.ConeGeometry(r, h, 8), m); t.position.set(x, y, z); t.rotation.set(rx, 0, rz); t.castShadow = true; return t;
}

export function buildLumifox() {
  const cream = mat(CREAM), belly = mat(BELLY), moss = mat(MOSS), ink = mat(INK), white = mat(0xffffff), pad = mat(PAD);
  const root = new THREE.Group();

  // BADAN kecil gempal (pir) + perut terang + ruff dada lumut + pelana lumut & 3 titik cahaya samar di punggung
  const body = new THREE.Group(); body.position.y = 0.13; root.add(body);
  const b = sph(0.13, cream, 1, 1.0, 0.95, 28, 20); body.add(b); outline(b);
  const bel = sph(0.095, belly, 0.85, 0.95, 0.5); bel.position.set(0, -0.01, 0.09); body.add(bel);
  const sad = sph(0.1, moss, 0.9, 1.0, 0.35); sad.position.set(0, 0.03, -0.1); body.add(sad);
  for (const [y, r] of [[0.08, 0.016], [0.03, 0.02], [-0.02, 0.014]]) {
    const d = sph(r, glow(MINT, 0.9), 1, 1, 0.5, 12, 8); d.position.set(0, y, -0.14); body.add(d);
    const h = sph(r * 2.2, halo(MINT, 0.1), 1, 1, 0.5, 12, 8); h.position.copy(d.position); body.add(h);
  }
  const ruff = new THREE.Group(); ruff.position.set(0, 0.075, 0.095); body.add(ruff);
  const rb = sph(0.075, moss, 1.5, 0.8, 0.8); ruff.add(rb);
  for (const [x, y] of [[-0.075, -0.01], [-0.04, -0.035], [0, -0.045], [0.04, -0.035], [0.075, -0.01]]) { const t = sph(0.032, moss, 1, 1.2, 0.9, 12, 8); t.position.set(x, y, 0.025); ruff.add(t); }

  // KEPALA besar lebar (chibi) + pipi berbulu + hidung titik + blush besar + permata mint di dahi
  const head = new THREE.Group(); head.position.set(0, 0.355, 0.02); root.add(head);
  const hd = sph(0.17, cream, 1.3, 1.05, 1.1, 32, 22); head.add(hd); outline(hd);
  const nose = sph(0.011, mat(0x3a2a22), 1.2, 0.8, 0.8, 10, 8); nose.position.set(0, -0.052, 0.18); head.add(nose);
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.022), glow(MINT, 1.1)); gem.scale.set(0.8, 1.3, 0.4); gem.position.set(0, 0.095, 0.17); gem.rotation.x = -0.35; head.add(gem);
  for (const sd of [-1, 1]) {
    const bl = sph(0.036, mat(BLUSH), 1.5, 0.75, 0.3, 14, 8); bl.position.set(0.15 * sd, -0.07, 0.115); bl.rotation.y = sd * 0.95; head.add(bl);
    for (const [y, z, rz] of [[-0.03, 0.05, 1.3], [-0.095, 0.035, 1.9]]) head.add(tuft(cream, 0.034, 0.06, 0.215 * sd, y, z, 0, -sd * rz));
  }

  // MATA besar berkilau (iris berlapis + 3 highlight), rendah di wajah + kelopak (untuk ekspresi nakal)
  function eye(sd) {
    const g = new THREE.Group(); g.position.set(0.092 * sd, -0.025, 0.155); g.rotation.y = sd * 0.5; head.add(g);
    const ring = sph(0.078, ink, 0.9, 1.1, 0.3, 16, 12); ring.position.z = -0.004; g.add(ring);
    const ir = sph(0.072, mat(EYE), 0.9, 1.1, 0.3, 16, 12); g.add(ir);
    const ir2 = sph(0.056, mat(0x9ff0d0), 0.9, 1.0, 0.3, 14, 10); ir2.position.set(0, -0.014, 0.006); g.add(ir2);
    const pu = sph(0.03, ink, 0.9, 1.1, 0.3, 12, 10); pu.position.z = 0.022; g.add(pu);
    const h1 = sph(0.024, white, 1, 1, 0.4, 10, 8); h1.position.set(-0.02, 0.03, 0.03); g.add(h1);
    const h2 = sph(0.012, white, 1, 1, 0.4, 8, 6); h2.position.set(0.02, -0.022, 0.03); g.add(h2);
    const lid = sph(0.088, cream, 0.95, 0.7, 0.4, 16, 10); lid.position.set(0, 0.155, 0.02); lid.visible = false; g.add(lid);
    return { g, lid };
  }
  const eL = eye(-1), eR = eye(1);

  // MULUT mungil "w" (senyum), "o", seringai
  const smile = new THREE.Group(); smile.position.set(0, -0.082, 0.172); head.add(smile);
  for (const x of [-0.012, 0.012]) { const a = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.0035, 6, 10, Math.PI), ink); a.position.x = x; a.rotation.z = Math.PI; smile.add(a); }
  const mo = sph(0.011, mat(0x7a2a3a), 1, 1.2, 0.5, 8, 6); mo.position.set(0, -0.085, 0.172); mo.visible = false; head.add(mo);
  const smirk = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.004, 6, 12, Math.PI * 0.8), ink);
  smirk.position.set(0.01, -0.078, 0.171); smirk.rotation.z = Math.PI + 0.3; smirk.visible = false; head.add(smirk);

  // TELINGA tinggi berujung daun (luar krem, dalam lumut)
  function ear(sd) {
    const g = new THREE.Group(); g.position.set(0.1 * sd, 0.12, -0.01); g.rotation.set(-0.1, 0, -sd * EAR_TILT); head.add(g);
    const o = leaf(0.3, 0.1, 0.035, cream); g.add(o); outline(o, 1.07);
    const i = leaf(0.23, 0.065, 0.02, moss); i.position.set(0, 0.02, 0.018); g.add(i);
    return g;
  }
  const earL = ear(-1), earR = ear(1);

  // LENGAN (paw dipegang di dada) + KAKI belakang besar dengan bantalan oranye menghadap depan
  function arm(sd) {
    const g = new THREE.Group(); g.position.set(0.1 * sd, 0.2, 0.06); root.add(g);
    const a = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.05, 4, 10), cream); a.position.y = -0.04; a.castShadow = true; g.add(a); outline(a, 1.12);
    const p = sph(0.038, cream); p.position.y = -0.095; g.add(p); outline(p, 1.1);
    return g;
  }
  const armL = arm(-1), armR = arm(1);
  for (const sd of [-1, 1]) {
    const lg = new THREE.Group(); lg.position.set(0.1 * sd, 0.055, 0.1); lg.rotation.y = sd * 0.25; root.add(lg);
    const f = sph(0.06, cream, 1, 1.1, 0.85, 20, 14); lg.add(f); outline(f, 1.07);
    const sole = sph(0.03, pad, 1.15, 1, 0.3, 12, 8); sole.position.set(0, -0.012, 0.045); lg.add(sole);
    for (const x of [-0.026, 0, 0.026]) { const t = sph(0.012, pad, 1, 1.1, 0.4, 8, 6); t.position.set(x, 0.027 - 0.006 * Math.abs(x) / 0.026, 0.047); lg.add(t); }
  }

  // EKOR besar berbulu tebal: melengkung ke samping lalu naik, pangkal krem -> lumut -> ujung mint bercahaya
  const tail = new THREE.Group(); tail.position.set(0.04, 0.06, -0.09); root.add(tail);
  const path = new THREE.CatmullRomCurve3([[0.04, 0.02, -0.04], [0.14, 0.02, -0.04], [0.24, 0.08, -0.03], [0.29, 0.2, -0.03], [0.25, 0.33, -0.03], [0.17, 0.4, -0.03]].map(p => new THREE.Vector3(...p)));
  const ctl = [0.05, 0.085, 0.105, 0.105, 0.09, 0.06], N = 16;
  const cMoss = new THREE.Color(MOSS), cCream = new THREE.Color(CREAM), cMint = new THREE.Color(MINT);
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1), f = t * (ctl.length - 1), k = Math.min(Math.floor(f), ctl.length - 2), r = ctl[k] + (ctl[k + 1] - ctl[k]) * (f - k);
    const col = cCream.clone().lerp(cMoss, Math.max(0, 1 - Math.abs(t - 0.5) * 2.6) * 1.0).lerp(cMint, Math.max(0, t - 0.75) * 1.6);
    const sp = sph(r, mat(col.getHex()), 1.15, 1.1, 1.1, 16, 12); sp.position.copy(path.getPoint(t)); tail.add(sp);
    outline(sp, 1.045);
  }
  const tp = path.getPoint(1);
  const tip = sph(0.05, glow(MINT, 1.3), 1, 1.15, 1, 16, 12); tip.position.set(tp.x - 0.03, tp.y + 0.03, tp.z); tail.add(tip);
  const th = sph(0.085, halo(MINT, 0.1), 1, 1.15, 1, 16, 12); th.position.copy(tip.position); tail.add(th);
  const tl = new THREE.PointLight(MINT, 1.2, 1.2, 1.5); tl.position.copy(tip.position); tail.add(tl);

  const joints = { root, body, head, earL, earR, armL, armR, tail, eyeL: eL, eyeR: eR, smile, mo, smirk };
  return { group: root, joints };
}

// pose: head [x,y,z], eyes (skala tinggi), lid 0..1 (kelopak turun), mouth, ear [zL,zR] tambahan, arm [x,z] tiap sisi (x<0 = maju/naik, z: L + / R - = ke dalam), tail [x,z]
const P = {
  neutral:     { head: [0, 0, 0], eyes: 1, lid: 0, mouth: 'smile', ear: [0, 0], armL: [-1.15, 0.4], armR: [-1.15, -0.4], tail: [0, 0], lean: 0 },
  curious:     { head: [-0.05, 0.25, 0.3], eyes: 1.12, lid: 0, mouth: 'o', ear: [0.1, 0.35], armL: [-1.15, 0.4], armR: [-2.4, -0.5], tail: [0.15, 0.2], lean: -0.05 },
  mischievous: { head: [0.12, -0.15, -0.12], eyes: 0.95, lid: 0.9, mouth: 'smirk', ear: [-0.25, -0.2], armL: [-1.5, 0.25], armR: [0.2, 0.4], tail: [-0.35, -0.3], lean: 0.18 },
};
export const LUMI_POSES = Object.keys(P);
export function applyLumi(j, name) {
  const p = P[name] || P.neutral;
  j.head.rotation.set(p.head[0], p.head[1], p.head[2]);
  j.body.rotation.x = p.lean;
  for (const e of [j.eyeL, j.eyeR]) { e.g.scale.y = p.eyes; e.lid.position.y = 0.155 - 0.1 * p.lid; e.lid.visible = p.lid > 0; }
  j.smile.visible = p.mouth === 'smile'; j.mo.visible = p.mouth === 'o'; j.smirk.visible = p.mouth === 'smirk';
  j.earL.rotation.z = EAR_TILT + p.ear[0]; j.earR.rotation.z = -EAR_TILT - p.ear[1];
  j.armL.rotation.set(p.armL[0], 0, p.armL[1]); j.armR.rotation.set(p.armR[0], 0, p.armR[1]);
  j.tail.rotation.set(p.tail[0], 0, p.tail[1]);
}
