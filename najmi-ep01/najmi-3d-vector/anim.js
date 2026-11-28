// Timeline animasi Episode 01 — "Pintu di Belakang Rumah".
// Waktu (detik) dikunci ke audio/vo.srt (VO 198,6 dtk). Satu segmen = satu
// pasang (set, rentang waktu) yang dirender sebagai satu job terpisah.
// Dipakai dua tempat: render-scene.mjs (hanya SEGS) dan index.html (setup).

// ---- data -----------------------------------------------------------
// cam key: { t, p:[x,y,z], l:[x,y,z], fov, cut } — cut:true = potong keras dari key sebelumnya.
// who key: { t, x, z, ry, face, hide, over:{...sendi}, walk, e:'l' } — pos/pose Najmi.
//   face = ekspresi dasar (neutral|curious|surprised|relaxed|happy|tired|focused).
//   over = timpa sendi (rootY, hipsX, headX/Y/Z, shL, shR, hipL, hipR, kneeL, kneeR).
export const SEGS = {};

// ---- util -----------------------------------------------------------
const sm = u => u * u * (3 - 2 * u);
const lerp = (a, b, u) => a + (b - a) * u;
const lerpV = (a, b, u) => a.map((v, i) => lerp(v, b[i], u));
const lerpAng = (a, b, u) => { let d = ((b - a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; return a + d * u; };
// cari pasangan key yang mengapit t + fraksi (u) berikut easing
function span(keys, t) {
  if (t <= keys[0].t) return [keys[0], keys[0], 0];
  for (let i = 1; i < keys.length; i++) {
    const b = keys[i];
    if (t <= b.t) {
      const a = keys[i - 1];
      if (b.cut) return [b, b, 0];
      const u = (t - a.t) / Math.max(1e-6, b.t - a.t);
      return [a, b, b.e === 'l' ? u : sm(u)];
    }
  }
  const l = keys[keys.length - 1]; return [l, l, 0];
}

const JOINTS_V = ['shL', 'shR', 'hipL', 'hipR'];
function snap(j, applyPose, face, over = {}) {
  applyPose(j, face);
  const r = o => [o.rotation.x, o.rotation.y, o.rotation.z];
  const s = {
    rootY: j.root.position.y, hipsX: j.hips.rotation.x, head: r(j.head),
    shL: r(j.shL), shR: r(j.shR), hipL: r(j.hipL), hipR: r(j.hipR),
    kneeL: j.kneeL.rotation.x, kneeR: j.kneeR.rotation.x, eyes: j.eyeL.scale.y,
  };
  if (over.rootY !== undefined) s.rootY = over.rootY;
  if (over.hipsX !== undefined) s.hipsX = over.hipsX;
  if (over.headX !== undefined) s.head[0] = over.headX;
  if (over.headY !== undefined) s.head[1] = over.headY;
  if (over.headZ !== undefined) s.head[2] = over.headZ;
  for (const k of JOINTS_V) if (over[k]) s[k] = over[k];
  if (over.kneeL !== undefined) s.kneeL = over.kneeL;
  if (over.kneeR !== undefined) s.kneeR = over.kneeR;
  if (over.eyes !== undefined) s.eyes = over.eyes;
  return s;
}
function mix(a, b, u) {
  const o = { rootY: lerp(a.rootY, b.rootY, u), hipsX: lerp(a.hipsX, b.hipsX, u), head: lerpV(a.head, b.head, u), kneeL: lerp(a.kneeL, b.kneeL, u), kneeR: lerp(a.kneeR, b.kneeR, u), eyes: lerp(a.eyes, b.eyes, u) };
  for (const k of JOINTS_V) o[k] = lerpV(a[k], b[k], u);
  return o;
}

// ---- setup ----------------------------------------------------------
export function setup(ctx) {
  const { THREE, scene, camera, renderer, composer, params, applyPose, char } = ctx;
  const seg = SEGS[params.get('anim')];
  const dbg = params.get('dbg') ? params.get('dbg').split(',').map(v => (isNaN(+v) ? v : +v)) : null;
  const find = n => { let f = null; scene.traverse(o => { if (o.name === n) f = o; }); return f; };
  const J = char && char.joints, G = char && char.group;
  scene.updateMatrixWorld(true);
  const hooks = seg.build ? seg.build({ THREE, scene, find, J, G }) : {};
  const cache = new Map();
  const snapOf = k => { const key = k.face + JSON.stringify(k.over || {}); if (!cache.has(key)) cache.set(key, snap(J, applyPose, k.face || 'neutral', k.over)); return cache.get(key); };
  const pts = hooks.pts || {};
  const res = v => typeof v === 'string' ? pts[v]() : (typeof v[0] === 'string' ? pts[v[0]]().map((c, i) => c + (v[i + 1] || 0)) : v);

  function frame(t) {
    // animasi benda dulu (pintu, rak, uap) supaya titik bernama untuk kamera tidak telat satu frame
    if (hooks.frame) hooks.frame(t, { camera });
    scene.updateMatrixWorld(true);
    // kamera
    if (dbg) { camera.position.set(dbg[0], dbg[1], dbg[2]); camera.lookAt(dbg[3], dbg[4], dbg[5]); camera.fov = dbg[6] || 38; }
    else {
      const [a, b, u] = span(seg.cam, t);
      const p = lerpV(res(a.p), res(b.p), u), l = lerpV(res(a.l), res(b.l), u);
      camera.position.set(...p); camera.lookAt(...l);
      camera.fov = lerp(a.fov || 38, b.fov || 38, u);
    }
    camera.updateProjectionMatrix();
    // Najmi
    if (J) {
      let ka, kb, u;
      if (dbg) { ka = kb = { t, x: dbg[7] || 0, z: dbg[8] || 0, ry: dbg[9] || 0, face: dbg[10] || 'neutral' }; u = 0; }
      else [ka, kb, u] = span(seg.who, t);
      G.visible = !(u < 0.5 ? ka.hide : kb.hide);
      const x = lerp(ka.x, kb.x, u), z = lerp(ka.z, kb.z, u);
      G.position.set(x, 0, z);
      G.rotation.y = lerpAng(ka.ry || 0, kb.ry || 0, u);
      const s = mix(snapOf(ka), snapOf(kb), u);
      applyPose(J, (u < 0.5 ? ka : kb).face || 'neutral'); // bagian diskret (mulut, alis, blush)
      J.root.position.y = s.rootY; J.hips.rotation.x = s.hipsX; J.head.rotation.set(...s.head);
      for (const k of JOINTS_V) J[k].rotation.set(...s[k]);
      J.kneeL.rotation.x = s.kneeL; J.kneeR.rotation.x = s.kneeR; J.eyeL.scale.y = J.eyeR.scale.y = s.eyes;
      // jalan: ayun kaki + lengan sesuai jarak tempuh (bukan waktu), supaya tidak meluncur
      if (!dbg && (u < 0.5 ? ka.walk : kb.walk)) {
        const sw = Math.sin(walkPhase(seg, t)) * 0.55;
        J.hipL.rotation.x = sw; J.hipR.rotation.x = -sw;
        if (!kb.still) { J.shL.rotation.x += -sw * 0.6; J.shR.rotation.x += sw * 0.6; }
        J.root.position.y += Math.abs(Math.cos(walkPhase(seg, t))) * 0.03;
      }
      if (hooks.who) hooks.who(t, { J, G });
    }
    if (composer) composer.render(); else renderer.render(scene, camera);
  }
  return { t0: seg.t0, t1: seg.t1, frame };
}

// fase langkah = integral kecepatan (jarak) / panjang langkah; dihitung numerik dan di-cache per segmen
const STRIDE = 0.8;
function walkPhase(seg, t) {
  if (!seg._ph) {
    seg._ph = []; let d = 0; const dt = 1 / 48; let px = null, pz = null;
    for (let tt = seg.t0; tt <= seg.t1 + 1e-6; tt += dt) {
      const [a, b, u] = span(seg.who, tt);
      const x = lerp(a.x, b.x, u), z = lerp(a.z, b.z, u);
      if (px !== null && (u < 0.5 ? a.walk : b.walk)) d += Math.hypot(x - px, z - pz);
      px = x; pz = z; seg._ph.push(d);
    }
  }
  const i = Math.max(0, Math.min(seg._ph.length - 1, Math.round((t - seg.t0) * 48)));
  return (seg._ph[i] / STRIDE) * Math.PI * 2;
}

// ---- segmen -----------------------------------------------------------
const C = (t, p, l, fov = 38, o = {}) => ({ t, p, l, fov, ...o });
const Wk = (t, x, z, ry = 0, face = 'neutral', over, o = {}) => ({ t, x, z, ry, face, over, ...o });
const PI = Math.PI;
const ARMS_UP = { shL: [-2.5, 0, -0.35], shR: [-2.5, 0, 0.35] };
const ARMS_FWD = { shL: [-1.2, 0, -0.12], shR: [-1.2, 0, 0.12] };
const SIT = { rootY: -0.32, hipL: [-1.55, 0, 0], hipR: [-1.55, 0, 0] };
const CROUCH = { rootY: -0.8, hipsX: 0.2, hipL: [-1.6, 0, -0.1], hipR: [-1.6, 0, 0.1], kneeL: 1.2, kneeR: 1.2 };

const mat = (THREE, c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o });
const box = (THREE, w, h, d, m) => { const x = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); x.castShadow = true; return x; };

// ---- 01a: rumah dari luar, motor lewat ----
SEGS.s01a = {
  set: 'rumah', char: false, t0: 0, t1: 6.0,
  cam: [C(0, [3, 3.4, 46], [0.5, 3.4, 10], 50), C(6, [1.0, 2.4, 30], [0.5, 2.6, 10], 46)],
  who: [],
  build({ THREE, scene }) {
    // motor sederhana + pengendara (jalan di z ~ 21)
    const m = new THREE.Group(), dark = mat(THREE, 0x2a2d35), red = mat(THREE, 0xb03a2e), skin = mat(THREE, 0xa8744a);
    const wheels = [-0.55, 0.55].map(x => { const w = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.07, 8, 20), dark); w.position.set(x, 0.38, 0); m.add(w); return w; });
    const body = box(THREE, 1.1, 0.25, 0.28, red); body.position.set(0, 0.6, 0); m.add(body);
    const seat = box(THREE, 0.5, 0.1, 0.3, dark); seat.position.set(-0.1, 0.78, 0); m.add(seat);
    const rider = box(THREE, 0.3, 0.55, 0.3, mat(THREE, 0x3a6ea5)); rider.position.set(-0.1, 1.15, 0); m.add(rider);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), skin); head.position.set(-0.05, 1.6, 0); m.add(head);
    const helm = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10, 0, PI * 2, 0, PI / 1.8), mat(THREE, 0xe8c020)); helm.position.set(-0.05, 1.62, 0); m.add(helm);
    m.position.set(10, 0.02, 21.2); m.rotation.y = PI; // menghadap -x
    scene.add(m);
    return { frame(t) { const u = Math.min(1, Math.max(0, (t - 0.8) / 3.8)); m.position.x = 10 - 20 * u; m.visible = u > 0 && u < 1; wheels.forEach(w => { w.rotation.z = t * 14; }); } };
  },
};

// ---- 01b: kamar tidur ----
SEGS.s01b = {
  set: 'kamar-tidur', t0: 6.0, t1: 16.13,
  cam: [C(6, [1.5, 1.9, 6.2], [0.4, 1.5, -2.4], 46), C(10, [0.9, 1.7, 4.0], [0.3, 1.45, -2.2], 42),
    C(10, [2.4, 1.8, 3.4], [-1.6, 1.1, -0.3], 46), C(13, [1.8, 1.7, 3.0], [-1.3, 1.0, -0.3], 42),
    C(13, [1.0, 1.8, 6.4], [0.6, 1.2, 0.4], 46), C(16.13, [1.0, 1.7, 5.6], [0.8, 1.2, 1.0], 44)],
  who: [
    Wk(6, 0.4, -2.2, PI, 'tired'), Wk(6.8, 0.4, -2.2, PI, 'tired', ARMS_UP), Wk(8.0, 0.4, -2.2, PI, 'relaxed', ARMS_UP),
    Wk(8.5, 0.4, -2.2, 0.35, 'tired', { shR: [-2.6, 0, 0.5], headX: -0.2 }), Wk(9.6, 0.4, -2.0, 0.35, 'tired', { shR: [-2.6, 0, 0.5], headX: -0.2 }),
    Wk(10.0, -0.9, -0.3, -PI / 2, 'focused', { ...ARMS_FWD, hipsX: 0.55 }), Wk(13.0, -0.9, -0.3, -PI / 2, 'focused', { ...ARMS_FWD, hipsX: 0.55 }),
    Wk(13.0, -0.9, -0.3, -PI / 2, 'relaxed', { hipsX: 0 }, { cut: true }),
    Wk(13.5, -0.9, -0.3, 0.3, 'relaxed', {}, { walk: true }), Wk(16.13, 1.6, 2.8, 0.4, 'relaxed', {}, { walk: true, e: 'l' }),
  ],
  build() {
    return { who(t, { J }) {
      if (t > 10 && t < 13) { J.shR.rotation.x = -1.3 + Math.sin((t - 10) * 5) * 0.3; J.shL.rotation.x = -1.3 + Math.sin((t - 10) * 5 + 2) * 0.25; }
    } };
  },
};

// ---- 02: dapur — masak nasi goreng, sarapan sendirian ----
SEGS.s02 = {
  set: 'dapur', t0: 16.13, t1: 51.17,
  cam: [
    C(16.13, [0.8, 1.9, 5.8], [0.2, 1.2, -0.8], 46), C(22, [0.8, 1.9, 4.6], [0.2, 1.2, -0.8], 44),
    C(22, [2.6, 1.7, 1.9], [0.2, 1.1, -0.3], 38), C(27, [2.2, 1.65, 1.5], [0.2, 1.1, -0.3], 34),
    C(27, [3.8, 1.8, 0.9], [0.9, 1.2, -2.3], 42), C(30.5, [3.6, 1.8, 1.0], [0.9, 1.2, -2.3], 40),
    C(30.5, [3.8, 1.7, 0.8], [1.1, 1.4, -2.4], 40), C(34.4, [3.4, 1.65, 0.4], [1.1, 1.45, -2.5], 36),
    C(34.4, [0.4, 1.7, 5.5], [-1.0, 1.0, 1.0], 44), C(38, [0.4, 1.7, 5.2], [-1.4, 1.0, 1.5], 42),
    C(38, [1.0, 1.6, 6.4], [-1.6, 1.0, 2.0], 38), C(51.17, [0.3, 1.5, 5.6], [-1.6, 1.0, 2.0], 34),
  ],
  who: [
    Wk(16.13, -3.2, 1.2, 1.4, 'relaxed', {}, { walk: true }), Wk(18.5, 0.0, 0.9, 0.2, 'curious', {}, { walk: true }),
    Wk(18.8, 0.0, 0.9, 0.2, 'curious', { shR: [-2.4, 0, 0.3], headZ: 0.25 }), Wk(20.2, 0.0, 0.9, 0.2, 'curious', { shR: [-2.4, 0, 0.3], headZ: 0.25 }),
    Wk(20.6, 0.0, 0.9, 0.2, 'happy', {}), Wk(21.8, 0.0, 0.9, 0.2, 'happy', {}),
    Wk(22.0, 0.3, 0.3, PI, 'focused', ARMS_FWD), Wk(27.0, 0.3, 0.3, PI, 'focused', ARMS_FWD),
    Wk(27.0, 0.9, -1.85, PI, 'focused', { ...ARMS_FWD, shR: [-1.3, 0, 0.2] }), Wk(30.5, 0.9, -1.85, PI, 'focused', { ...ARMS_FWD, shR: [-1.3, 0, 0.2] }),
    Wk(34.0, 0.9, -1.85, PI, 'happy', { ...ARMS_FWD }), Wk(34.7, 0.9, -1.85, 0.4, 'happy', ARMS_FWD),
    Wk(36.0, -0.6, 0.6, -1.2, 'relaxed', {}, { walk: true }), Wk(38.0, -1.1, 1.95, -PI / 2, 'relaxed', {}, { walk: true }),
    Wk(39.0, -1.1, 1.95, -PI / 2, 'relaxed', SIT), Wk(44.0, -1.1, 1.95, -PI / 2, 'relaxed', { ...SIT, headX: 0.15 }),
    Wk(48.0, -1.1, 1.95, -PI / 2, 'tired', { ...SIT, headX: 0.3, shR: [0.1, 0, 0.05] }), Wk(51.17, -1.1, 1.95, -PI / 2, 'tired', { ...SIT, headX: 0.3, headY: 0.5 }),
  ],
  build({ THREE, scene }) {
    // talenan + bawang di island
    const board = box(THREE, 0.5, 0.03, 0.3, mat(THREE, 0xc89a5a)); board.position.set(0.3, 1.1, -0.35); scene.add(board);
    [[0.15, 0xb83a52], [0.3, 0xf0e4d0], [0.43, 0xb83a52]].forEach(([x, c], i) => { const o = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), mat(THREE, c)); o.position.set(x, 1.17, -0.38 + (i % 2) * 0.06); scene.add(o); });
    // uap: 8 bola putih transparan naik dari wajan
    const puffs = Array.from({ length: 8 }, (_, i) => { const p = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, depthWrite: false })); p.userData.i = i; scene.add(p); return p; });
    return {
      frame(t) {
        const on = t > 28.5 && t < 36;
        puffs.forEach(p => { const k = ((t * 0.5 + p.userData.i / 8) % 1); p.visible = on; p.position.set(1.2 + Math.sin(k * 9 + p.userData.i) * 0.08, 1.3 + k * 0.9, -2.7); p.scale.setScalar(0.6 + k * 1.2); p.material.opacity = 0.6 * (1 - k); });
      },
      who(t, { J }) {
        if (t >= 22 && t < 27) { J.shR.rotation.x = -1.0 + Math.sin(t * 16) * 0.22; }
        if (t >= 30.5 && t < 34.4) { J.shR.rotation.x = -1.2 + Math.cos(t * 6) * 0.15; J.shR.rotation.z = 0.15 + Math.sin(t * 6) * 0.25; }
        if (t >= 40 && t < 46) { J.shR.rotation.x = -1.5 + Math.sin(t * 5) * 0.35; }
      },
    };
  },
};

// ---- gudang: pintu + rak + latar dunia di balik pintu ----
function gudangRig({ THREE, scene, find, J, G }) {
  const leaf = find('portalLeaf'), rack = find('rollingRack');
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 256;
  const c = cv.getContext('2d'), g = c.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#5fb0ee'); g.addColorStop(0.45, '#a8dcf5'); g.addColorStop(0.5, '#7fc46a'); g.addColorStop(1, '#2f8f4a');
  c.fillStyle = g; c.fillRect(0, 0, 128, 256);
  c.fillStyle = '#6a8fb0'; c.beginPath(); c.moveTo(0, 118); c.lineTo(40, 70); c.lineTo(80, 112); c.lineTo(128, 80); c.lineTo(128, 128); c.lineTo(0, 128); c.fill();
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const back = new THREE.Mesh(new THREE.PlaneGeometry(0.98, 2.1), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, toneMapped: false, color: 0xcccccc }));
  // sembunyikan bidang cahaya/pusaran bawaan set (menutupi latar buatan kita jadi putih silau)
  leaf.parent.children.forEach(o => { if (o.isMesh && o.material && o.material.emissive && o.material.emissiveIntensity > 0.3) o.visible = false; });
  back.position.set(0, 1.05, -2.075); leaf.parent.add(back);
  const glow = new THREE.PointLight(0x9affc8, 0, 6, 2); glow.position.set(0, 1.5, -2.2); scene.add(glow);
  const V = THREE.Vector3, pt = (x, y, z) => () => { const v = leaf.localToWorld(new V(x, y, z)); return [v.x, v.y, v.z]; };
  return {
    leaf, rack, back, glow,
    pts: { knob: pt(-0.82, 1.05, 0.1), ring: pt(-0.45, 1.55, 0.085) },
    reveal(o) { back.material.opacity = o; glow.intensity = o * 5; },
  };
}
const ramp = (t, a, b, v0, v1) => lerp(v0, v1, sm(Math.min(1, Math.max(0, (t - a) / (b - a)))));

// ---- 03: gudang — rak digeser, pintu terlihat ----
SEGS.s03 = {
  set: 'gudang', t0: 51.17, t1: 83.58,
  cam: [
    C(51.17, [0.6, 1.8, 6.0], [-0.5, 1.3, -1.0], 46), C(57, [0.2, 1.8, 5.2], [-0.5, 1.2, -0.6], 44),
    C(57, [0.5, 1.6, 4.0], [-0.1, 1.3, -1.1], 44), C(63, [0.7, 1.6, 3.8], [0.2, 1.3, -1.2], 44),
    C(63, [0.9, 1.7, 3.2], [0.0, 1.5, -2.4], 40), C(66, [0.7, 1.7, 3.0], [0.0, 1.5, -2.4], 38),
    C(66, [-1.6, 1.7, 1.2], [0, 1.5, -2.4], 36), C(71, [-0.2, 1.85, 0.7], 'ring', 34),
    C(76, [-0.1, 1.85, -0.1], 'ring', 26), C(83.58, [0.0, 1.9, -0.7], 'ring', 20),
  ],
  who: [
    Wk(51.17, -4.2, 1.0, 1.35, 'relaxed', ARMS_FWD, { walk: true, still: true }), Wk(54.2, -1.6, 0.5, 1.2, 'relaxed', ARMS_FWD, { walk: true, still: true }),
    Wk(55.0, -1.6, 0.5, 1.2, 'relaxed', { hipsX: 0.4, shL: [-1.4, 0, 0], shR: [-1.4, 0, 0] }), Wk(55.8, -1.6, 0.5, 1.2, 'relaxed', {}),
    Wk(57.0, -1.0, -0.9, PI / 2, 'focused', { ...ARMS_FWD, hipsX: 0.2 }, { walk: true, still: true }),
    Wk(57.6, -0.9, -1.0, PI / 2, 'focused', { ...ARMS_FWD, hipsX: 0.25 }), Wk(63.0, -0.05, -1.0, PI / 2, 'focused', { ...ARMS_FWD, hipsX: 0.25 }, { e: 'l' }),
    Wk(64.0, -0.3, -0.9, PI * 0.8, 'surprised', {}), Wk(65.8, -0.3, -0.9, PI, 'curious', {}),
    Wk(66.0, -0.25, -0.9, PI, 'curious', {}), Wk(69.0, -0.55, -1.8, PI - 0.1, 'curious', { headZ: 0.2 }, { walk: true }),
    Wk(70.5, -0.55, -1.8, PI - 0.1, 'curious', { shR: [-2.3, 0, 0.1] }), Wk(75.5, -0.55, -1.8, PI - 0.1, 'curious', { shR: [-2.3, 0, 0.1] }),
    Wk(77.0, -0.55, -1.8, PI - 0.1, 'curious', { shR: [-2.5, 0, -0.05], headX: 0.1 }), Wk(83.58, -0.55, -1.8, PI - 0.1, 'curious', { shR: [-2.5, 0, -0.05], headX: 0.1 }),
  ],
  build(ctx) {
    const { THREE, scene } = ctx, r = gudangRig(ctx);
    const carton = box(THREE, 0.5, 0.4, 0.4, mat(THREE, 0xb98d5a)); scene.add(carton);
    r.leaf.rotation.y = 0.3;
    return {
      pts: r.pts,
      frame(t) {
        const u = sm(Math.min(1, Math.max(0, (t - 57.6) / 5.4)));
        r.rack.position.x = lerp(0.1, 0.95, u); r.rack.rotation.y = lerp(0.3, 1.15, u);
        r.reveal(0);
      },
      who(t, { G }) {
        if (t < 54.8) { G.add(carton); carton.position.set(0, 0.95, 0.45); carton.rotation.set(0, 0, 0); }
        else { scene.add(carton); carton.position.set(-2.1, 0.2, 0.9); carton.rotation.y = 0.3; }
        if (t >= 71 && t < 76) ctx.J.shR.rotation.z = 0.1 + Math.sin(t * 9) * 0.3, ctx.J.shR.rotation.x = -2.3 + Math.sin(t * 7) * 0.12;
      },
    };
  },
};

// ---- 04: gudang — gagang, klik, pintu terbuka ----
SEGS.s04 = {
  set: 'gudang', t0: 83.58, t1: 115.23,
  cam: [
    C(83.58, ['knob', 0.8, 0.15, 0.7], 'knob', 24), C(88.4, ['knob', 0.7, 0.15, 0.6], 'knob', 20),
    C(88.4, [-1.5, 1.55, -2.1], [-0.45, 1.5, -1.45], 26), C(92.5, [-1.4, 1.55, -2.1], [-0.45, 1.5, -1.45], 24),
    C(92.5, [-2.4, 1.6, 1.6], [-0.1, 1.3, -2.1], 48), C(98.5, [-2.2, 1.6, 1.2], [-0.1, 1.3, -2.1], 46),
    C(98.5, [-2.6, 1.7, 0.8], [0.0, 1.3, -2.6], 42), C(106.0, [-2.4, 1.7, 0.2], [0.0, 1.3, -2.6], 40),
    C(106.0, [-1.5, 1.55, -2.1], [-0.5, 1.55, -1.7], 26), C(109.6, [-1.5, 1.55, -2.1], [-0.5, 1.55, -1.7], 24),
    C(109.6, [-2.6, 1.7, 0.6], [0.0, 1.3, -2.6], 42), C(115.23, [-2.2, 1.65, -0.2], [0.0, 1.3, -2.7], 38),
  ],
  who: [
    Wk(83.58, -0.45, -1.4, PI, 'curious', { shR: [-1.5, 0, 0.0], headX: 0.1 }), Wk(88.4, -0.45, -1.4, PI, 'curious', { shR: [-1.5, 0, 0.0], headX: 0.1 }),
    Wk(92.5, -0.45, -1.4, PI, 'surprised', { shR: [-1.5, 0, 0.0], headX: -0.05 }), Wk(95.5, -0.45, -1.4, PI, 'surprised', { shR: [-1.5, 0, 0.0] }),
    Wk(98.5, -0.5, -1.6, PI, 'surprised', { shR: [-0.6, 0, 0.2], hipsX: 0.25, headX: 0.15 }), Wk(110, -0.5, -1.6, PI, 'surprised', { shR: [-0.6, 0, 0.2], hipsX: 0.25, headX: 0.15 }),
    Wk(113.5, -0.35, -1.9, PI, 'surprised', { shR: [-1.5, 0, 0.2], hipsX: 0.3 }), Wk(115.23, -0.2, -2.1, PI, 'surprised', { shR: [-1.5, 0, 0.2], hipsX: 0.3 }),
  ],
  build(ctx) {
    const r = gudangRig(ctx);
    r.rack.position.set(0.95, 0, -1.35); r.rack.rotation.y = 1.15;
    return {
      pts: r.pts,
      frame(t) {
        r.leaf.rotation.y = t < 94 ? 0.3 : t < 98.5 ? ramp(t, 94, 98.5, 0.3, 0.75) : ramp(t, 108, 113, 0.75, 1.35);
        r.reveal(ramp(t, 94, 99, 0, 1));
      },
      who(t, { J }) { if (t < 92) J.shR.rotation.z = Math.sin(t * 3.2) * 0.25; },
    };
  },
};

// ---- padang: pintu berdiri di rumput (dari sisi dunia) ----
function padangDoor({ THREE, scene }) {
  const wood = mat(THREE, 0x5a3a22), g = new THREE.Group();
  [-0.56, 0.56].forEach(x => { const p = box(THREE, 0.12, 2.3, 0.14, wood); p.position.set(x, 1.15, 0); g.add(p); });
  const l = box(THREE, 1.24, 0.12, 0.14, wood); l.position.set(0, 2.3, 0); g.add(l);
  const leaf = new THREE.Group(); leaf.position.set(-0.5, 0, 0.0); g.add(leaf);
  const lm = box(THREE, 1.0, 2.2, 0.06, mat(THREE, 0x6a4528)); lm.position.set(0.5, 1.1, 0); leaf.add(lm);
  const kn = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), mat(THREE, 0xd4a017, { metalness: 0.4 })); kn.position.set(0.9, 1.05, 0.05); leaf.add(kn);
  leaf.rotation.y = 1.45;
  const sill = box(THREE, 1.3, 0.05, 0.4, mat(THREE, 0x7a756a)); sill.position.y = 0.025; g.add(sill);
  g.position.set(0, 0, -9.2); scene.add(g);
  return g;
}

// ---- 05: padang — melewati ambang, pemandangan ----
SEGS.s05 = {
  set: 'padang-aruna', t0: 115.23, t1: 150.65,
  cam: [
    C(115.23, [0, 1.6, -5.6], [0, 1.5, -12], 46), C(122, [0, 2.4, -5.8], [0, 1.3, -12], 52), C(129.4, [0, 3.4, -6.0], [0, 1.0, -14], 58),
    C(129.4, [0, 1.8, -6.4], [0, 1.4, -12], 46), C(135.6, [0, 1.8, -8.0], [0, 1.4, -13], 46),
    C(135.6, [0.2, 2.6, -6.6], [0.1, 1.3, -16], 54), C(143, [0.3, 3.6, -6.0], [0.1, 1.4, -18], 58), C(150.65, [0.4, 4.8, -5.4], [0.1, 1.5, -20], 60),
  ],
  who: [
    Wk(115.23, 0, -9.2, PI, 'surprised', { shL: [-0.5, 0, -0.3], shR: [-0.5, 0, 0.3] }), Wk(129.0, 0, -9.2, PI, 'surprised', { shL: [-0.5, 0, -0.3], shR: [-0.5, 0, 0.3] }),
    Wk(129.4, 0, -9.2, PI, 'curious', {}, { walk: true }), Wk(133, 0, -10.6, PI, 'surprised', {}, { walk: true }),
    Wk(135.6, 0, -11.0, PI, 'surprised', { headX: -0.1 }), Wk(138.8, 0, -11.0, PI, 'surprised', { headX: -0.1 }),
    Wk(141.0, 0, -11.0, PI - 0.7, 'relaxed', { shL: [0, 0, -0.35], shR: [0, 0, 0.35] }), Wk(144.9, 0, -11.0, PI - 0.7, 'relaxed', { shL: [0, 0, -0.35], shR: [0, 0, 0.35] }),
    Wk(147, 0, -11.0, PI + 0.5, 'relaxed', { shL: [0, 0, -0.35], shR: [0, 0, 0.35] }), Wk(150.65, 0, -11.0, PI, 'relaxed', { shL: [0, 0, -0.35], shR: [0, 0, 0.35] }),
  ],
  build(ctx) { padangDoor(ctx); return {}; },
};

// ---- 06: padang — jalan ke sungai, menyentuh air ----
const BANK = [22.2, -3.0];
SEGS.s06 = {
  set: 'padang-aruna', t0: 150.65, t1: 188.62,
  cam: [
    C(150.65, [3.4, 1.5, -5.0], [4.0, 1.2, -10.8], 42), C(158.5, [10.4, 1.5, -2.0], [10.8, 1.2, -7.0], 42),
    C(158.5, [17.0, 1.6, 2.5], [21.0, 1.0, -3.0], 44), C(162.3, [18.5, 1.6, 2.0], [22.0, 1.0, -3.0], 42),
    C(162.3, [19.2, 1.4, 0.6], [22.2, 0.9, -3.0], 36), C(167.8, [19.6, 1.2, 0.2], [22.2, 0.7, -3.0], 34),
    C(167.8, [22.0, 0.9, 0.4], [22.4, 0.5, -3.0], 32), C(177.0, [21.4, 0.9, -0.3], [22.4, 0.5, -3.0], 30),
    C(177.0, [24.4, 1.5, -5.4], [22.2, 1.6, -3.0], 30), C(188.62, [23.6, 1.55, -4.8], [22.2, 1.62, -3.0], 24),
  ],
  who: [
    Wk(150.65, 3.0, -11.0, PI / 2, 'neutral', {}, { walk: true, e: 'l' }), Wk(158.5, 12.0, -7.0, PI / 2, 'relaxed', {}, { walk: true, e: 'l' }),
    Wk(158.6, 18.5, -4.2, PI / 2, 'curious', {}, { cut: true, walk: true }), Wk(162.3, 22.2, -3.0, PI / 2, 'happy', {}, { walk: true, e: 'l' }),
    Wk(164.0, 22.2, -3.0, PI / 2, 'happy', CROUCH), Wk(167.8, 22.2, -3.0, PI / 2, 'curious', { ...CROUCH, shR: [-1.0, 0, 0.1] }),
    Wk(171, 22.2, -3.0, PI / 2, 'surprised', { ...CROUCH, shR: [-1.1, 0, 0.1] }), Wk(176.5, 22.2, -3.0, PI / 2, 'happy', { ...CROUCH, shR: [-1.0, 0, 0.1] }),
    Wk(179.0, 22.2, -3.0, PI / 2 + 0.5, 'relaxed', { shL: [0, 0, -0.9], shR: [0, 0, 0.9], headX: -0.3 }), Wk(183, 22.2, -3.0, PI / 2 + 0.5, 'relaxed', { shL: [0, 0, -0.9], shR: [0, 0, 0.9], headX: -0.35, hipsX: -0.1 }),
    Wk(188.62, 22.2, -3.0, PI / 2 + 0.5, 'happy', { shL: [0, 0, -0.35], shR: [0, 0, 0.35], headX: -0.15 }),
  ],
  build() { return { who(t, { J }) { if (t > 168 && t < 177) J.shR.rotation.x += Math.sin(t * 3) * 0.08; } }; },
};

// ---- 07: gudang — kembali, tutup pintu, cut to black ----
SEGS.s07 = {
  set: 'gudang', t0: 188.62, t1: 198.6,
  cam: [
    C(188.62, [0.9, 1.7, 3.6], [0, 1.3, -2.0], 44), C(192.5, [0.8, 1.7, 3.3], [-0.1, 1.3, -2.0], 42),
    C(192.5, [0.6, 1.6, 2.6], [-0.4, 1.35, -2.0], 36), C(195.0, [0.4, 1.6, 2.2], [-0.4, 1.4, -2.0], 34),
    C(195.0, ['knob', 0.9, 0.15, 0.8], 'knob', 26), C(198.6, ['knob', 0.8, 0.12, 0.6], 'knob', 18),
  ],
  who: [
    Wk(188.62, -0.2, -2.9, PI, 'relaxed', {}, { hide: true }), Wk(189.2, -0.2, -2.9, PI, 'relaxed', {}, { hide: false }),
    Wk(189.3, -0.3, -2.9, 0, 'relaxed', {}, { hide: false }), Wk(190.6, -0.55, -1.7, 0.2, 'relaxed', {}, { walk: true }),
    Wk(191.4, -0.5, -1.7, PI, 'neutral', { shR: [-1.5, 0, 0.1] }), Wk(193.0, -0.5, -1.7, PI, 'neutral', { shR: [-1.5, 0, 0.1] }),
    Wk(193.8, -0.5, -1.7, PI * 0.8, 'happy', {}), Wk(195.0, -0.5, -1.7, PI * 0.8, 'happy', { headZ: 0.12 }),
    Wk(195.2, -0.5, -1.65, PI, 'happy', { shR: [-1.5, 0, 0.0] }), Wk(198.6, -0.5, -1.65, PI, 'happy', { shR: [-1.5, 0, 0.0] }),
  ],
  build(ctx) {
    const r = gudangRig(ctx);
    r.rack.position.set(0.95, 0, -1.35); r.rack.rotation.y = 1.15;
    return {
      pts: r.pts,
      frame(t) { r.leaf.rotation.y = ramp(t, 191.4, 193.0, 1.35, 0.0); r.reveal(1 - ramp(t, 192.2, 193.0, 0, 1)); },
    };
  },
};

// urutan render = urutan tayang (dipakai assemble)
export const ORDER = ['s01a', 's01b', 's02', 's03', 's04', 's05', 's06', 's07'];
