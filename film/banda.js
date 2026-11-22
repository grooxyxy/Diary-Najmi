// Dunia Banda: satu diorama utuh (dermaga + perahu layar, pasar rempah, rumah panggung, jemuran, kebun pala, gunung api).
// Dari subuh sampai malam, yang berubah hanya cahaya (tod.js): set tidak pernah bergerak, hanya kamera dan penghuninya.
import * as THREE from 'three';
import { PX, ramp, hex, h2, fbm, texOf, billboard, glow, blob, mulberry } from '../vendor/px.js';
import { mat, mesh, box, mats, fire, ridge, crate, barrel } from '../vendor/kit.js';
import { sky, stars, sea, particles, rain, flick } from '../vendor/fx.js';
import { clamp, seg, ss, lerp } from '../vendor/lib.js';
import { M, stall, hut, prau, animateSail, sampan, treeSprite, volcano, cloudSprite, sackStack, sackMesh, clothBolts, jars, tray } from './props.js';
import { makePerson, SPX } from './people.js';
import { sample } from './tod.js';

export const SEA_Y = -0.9;
export const LAYOUT = {
  pierX: 0, pierZ0: -6, pierZ1: -28,
  prauA: { x: -3.9, z: -16, rot: Math.PI },
  prauB: { x: 4.9, z: -21.5, rot: 0.0 },
  stallZ: 2.4,
  stalls: [
    { id: 'L0', x: -23, banner: 'cloth3', kind: ['pala', 'rice'] },
    { id: 'L1', x: -17.5, banner: 'cloth1', kind: ['fuli', 'fuli', 'pala'], fuli: 1 },
    { id: 'L2', x: -12, banner: 'cloth2', kind: ['buah', 'buah', 'pala'], fruit: 1 },
    { id: 'L3', x: -7, banner: 'cloth3', kind: ['rice'], cloth: 1 },
    { id: 'R1', x: 6.8, banner: 'cloth1', kind: ['pala', 'pala', 'fuli'], pala: 1 },
    { id: 'R2', x: 12.2, banner: 'cloth2', kind: ['pala', 'rice', 'pala'] },
    { id: 'R3', x: 17.8, banner: 'cloth3', kind: ['fuli', 'fuli', 'fuli'], fuli: 1 },
    { id: 'R4', x: 23.4, banner: 'cloth1', kind: ['rice', 'pala'], cloth: 1 },
  ],
};

export function buildBanda() {
  const scene = new THREE.Scene(), MM = mats();
  scene.fog = new THREE.FogExp2('#c0d0d8', .005);
  const SK = sky({ moonDir: new THREE.Vector3(.5, .3, -1), top: '#2468d0', mid: '#6cacea', hor: '#c8e6f0' }); scene.add(SK.mesh);
  const ST = stars(800, 5); scene.add(ST);

  // —— cahaya ——
  const sun = new THREE.DirectionalLight('#ffffff', 3); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -34, right: 34, top: 34, bottom: -34, near: 1, far: 220 }); sun.shadow.bias = -.0006; sun.shadow.normalBias = .03;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight('#aabbee', '#443322', 2); scene.add(hemi);
  const PL = [...Array(5)].map(() => { const L = new THREE.PointLight('#ffae55', 0, 12, 2); scene.add(L); return L; });
  const fill = new THREE.PointLight('#ffe6c8', 0, 9, 2); scene.add(fill);   // pengisi depan pahlawan

  // —— awan ——
  const clouds = [];
  { const R = mulberry(31); for (let i = 0; i < 18; i++) { const cv = cloudSprite(i * 3 + 1), w = 110 + R() * 150, m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 48 / 128), new THREE.MeshBasicMaterial({ map: texOf(cv), transparent: true, depthWrite: false, fog: false, opacity: 1 }));
    m.position.set((R() - .5) * 700, 55 + R() * 70, -380 - R() * 120); m.renderOrder = -5; scene.add(m); clouds.push({ m, th: i / 18, x0: m.position.x, sp: 1 + R() * 2 }); } }

  // —— gunung api + punggung pulau ——
  const VOL = volcano(4); VOL.position.set(120, SEA_Y - 2, -330); VOL.scale.setScalar(1.0); scene.add(VOL);
  [[-300, -330, 520, 56, '#2e4a58', 3], [250, -300, 420, 40, '#2a4252', 7], [-90, -390, 760, 70, '#34505e', 11]].forEach(([x, z, w, h, c, s]) => { const r = ridge(w, h, c, s, { ppm: 1.4 }); r.position.set(x, SEA_Y - 2, z); scene.add(r); });

  // —— laut + buih ——
  const SEA = sea(1500, { ppm: 9 }); SEA.mesh.position.y = SEA_Y; scene.add(SEA.mesh);
  const foamC = new PX(64, 8); foamC.fill((x, y) => { const v = fbm(x * .2, y * .6, 31) - y * .06; return v > .5 ? (v > .6 ? [225, 236, 240] : [150, 180, 196]) : null; });
  const foamT = texOf(foamC.done(), { repeat: [1, 1] }); foamT.wrapS = foamT.wrapT = THREE.RepeatWrapping;
  const foams = [], foamMats = [];
  const foamStrip = (x0, z0, x1, z1, w = .9) => { const L = Math.hypot(x1 - x0, z1 - z0), t2 = foamT.clone(); t2.needsUpdate = true; t2.repeat.set(L / 2.6, 1); const m = new THREE.Mesh(new THREE.PlaneGeometry(L, w), new THREE.MeshBasicMaterial({ map: t2, transparent: true, alphaTest: .5, color: '#a8c4d0' })); m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, SEA_Y + .03, (z0 + z1) / 2); scene.add(m); foams.push(t2); foamMats.push(m.material); };
  foamStrip(-120, -5.4, -2.2, -5.4, 1.4); foamStrip(2.2, -5.4, 120, -5.4, 1.4);

  // —— tanah / pantai (penampang diekstrusi sepanjang x) ——
  {
    const prof = new THREE.Shape(); const pts = [[14, -3], [8, -1.2], [5.2, -.5], [2.4, -.08], [0, 0], [-70, 0], [-70, -3]];   // x lokal = -z dunia
    prof.moveTo(...pts[0]); pts.slice(1).forEach(p => prof.lineTo(...p));
    const g = new THREE.ExtrudeGeometry(prof, { depth: 240, bevelEnabled: false }); g.rotateY(Math.PI / 2); g.translate(-120, 0, 0);   // ekstrusi → sumbu x
    const land = mesh(g, M('earth')); land.receiveShadow = true; land.castShadow = false; scene.add(land);
    const beach = mesh(new THREE.BoxGeometry(240, .04, 11).translate(0, .02, 2.4), M('sand'), {}); beach.castShadow = false; scene.add(beach);
  }

  // —— dermaga ——
  const pier = new THREE.Group();
  { const L = LAYOUT.pierZ0 - LAYOUT.pierZ1, cz = (LAYOUT.pierZ0 + LAYOUT.pierZ1) / 2;
    pier.add(mesh(new THREE.BoxGeometry(3.4, .22, L).translate(0, -.11, cz), M('deck'), { swap: true }));
    for (let z = LAYOUT.pierZ0 - 1; z >= LAYOUT.pierZ1; z -= 2.4) for (const x of [-1.5, 1.5]) pier.add(mesh(new THREE.CylinderGeometry(.14, .17, 3.6, 8).translate(x, -1.5, z), M('beam')));
    for (let z = LAYOUT.pierZ0 - 3; z >= LAYOUT.pierZ1 + 1; z -= 4.8) for (const x of [-1.55, 1.55]) pier.add(mesh(new THREE.CylinderGeometry(.11, .13, .75, 8).translate(x, .38, z), M('beam')));
    for (const x of [-1.62, 1.62]) pier.add(mesh(new THREE.BoxGeometry(.08, .08, L).translate(x, .62, cz), M('beam'), { cast: false }));
  }
  scene.add(pier);

  // —— perahu ——
  const praus = [];
  const mk = (cfg, x, z, rot, y = SEA_Y + .15) => { const p = prau(cfg); p.position.set(x, y, z); p.rotation.y = rot; p.userData.base = [x, y, z, rot]; scene.add(p); praus.push(p); return p; };
  const PA = mk({ len: 11, beam: 3.0, sailYaw: .22 }, LAYOUT.prauA.x, LAYOUT.prauA.z, LAYOUT.prauA.rot);
  const PB = mk({ len: 13, beam: 3.4, h: 1.3, sailYaw: -.2 }, LAYOUT.prauB.x, LAYOUT.prauB.z, LAYOUT.prauB.rot);
  mk({ len: 12, beam: 3.2 }, -24, -50, .5); mk({ len: 14, beam: 3.6, h: 1.4 }, 30, -66, -.3); mk({ len: 11, beam: 3 }, -52, -90, .2); mk({ len: 13, beam: 3.4 }, 62, -96, .7); mk({ len: 10, beam: 2.8 }, 8, -118, .1);
  // muatan di geladak perahu A (karung beras, gulungan kain) + atap di B
  const deckA = PA.userData.deckY;
  { const s1 = sackStack([3, 2], .62, 4); s1.position.set(-.6, deckA, 1.6); PA.add(s1); const s2 = sackStack([2, 2, 1], .62, 9); s2.position.set(.7, deckA, 2.7); PA.add(s2); const cb = clothBolts(6, 3); cb.position.set(1.5, deckA, -2.6); PA.add(cb); }
  { const s1 = sackStack([4, 3, 2], .66, 12); s1.position.set(0, PB.userData.deckY, 1.4); PB.add(s1); const s2 = sackStack([3, 2], .66, 3); s2.position.set(.3, PB.userData.deckY, -2.4); PB.add(s2); }
  // perahu kecil yang lalu-lalang
  const smalls = [];
  { const defs = [[-18, -32, 1, 3.2, 2.4, 0], [14, -38, -1, 2.6, 4.2, 1.4], [30, -24, 1, 2.2, 3.6, 2.2], [-34, -26, -1, 2.0, 3.0, 3.1], [-8, -44, 1, 2.8, 5, .6]];
    defs.forEach(([x, z, dir, spd, amp, ph], i) => { const s = sampan({ len: 4.2 + (i % 2) }); s.position.set(x, SEA_Y + .12, z); s.rotation.y = dir > 0 ? 0 : Math.PI; scene.add(s); smalls.push({ s, x, z, dir, spd, amp, ph }); }); }

  // —— lapak ——
  const stallG = {}, lanterns = [];
  const banners = { cloth1: new THREE.MeshStandardMaterial({ map: M('cloth1').map, side: THREE.DoubleSide, roughness: 1 }), cloth2: new THREE.MeshStandardMaterial({ map: M('cloth2').map, side: THREE.DoubleSide, roughness: 1 }), cloth3: new THREE.MeshStandardMaterial({ map: M('cloth3').map, side: THREE.DoubleSide, roughness: 1 }) };
  LAYOUT.stalls.forEach((S, si) => {
    const st = stall({ banner: banners[S.banner], roofGreen: si % 3 === 1 }); st.position.set(S.x, 0, LAYOUT.stallZ); scene.add(st); stallG[S.id] = st;
    const U = st.userData;
    S.kind.forEach((k, i) => { const tr = tray(k, .48, .12); tr.position.set(-U.w / 2 + .85 + i * 1.12, U.tableY, U.tableZ + (i % 2 ? .12 : -.06)); st.add(tr); });
    if (S.fuli) for (let i = 0; i < 5; i++) { const b = mesh(new THREE.BoxGeometry(.22, .5, .2), M('fuli')); b.position.set(-U.w / 2 + .6 + i * .75, U.hF - .45, U.d / 2 - .1); st.add(b); }
    if (S.cloth) { const c = clothBolts(5, si + 1); c.position.set(-1, U.tableY, U.tableZ - .05); st.add(c); const j = jars(3, si); j.position.set(1.1, U.tableY, U.tableZ); st.add(j); }
    // sampel karung dan peti di depan
    const ss1 = sackStack(S.pala ? [2, 1] : [2], .58, si + 4, S.pala ? '#ffffff' : '#e8e0d0'); ss1.position.set(U.w / 2 - .4, 0, U.d / 2 + .1); st.add(ss1);
    if (si % 2) { const c = crate(.7); c.position.set(-U.w / 2 + .1, 0, U.d / 2 + .25); c.rotation.y = .3; st.add(c); }
    // lentera lapak
    for (const sx of [-1, 1]) { const lamp = new THREE.Mesh(new THREE.BoxGeometry(.18, .24, .18), new THREE.MeshStandardMaterial({ color: '#2a2016', emissive: '#ffb45a', emissiveIntensity: 0 })); lamp.position.set(sx * (U.w / 2 - .25), U.hF - .38, U.d / 2 + .15); st.add(lamp);
      const gl = glow('#ffb25e', 1.3, 1); gl.position.copy(lamp.position); st.add(gl); lanterns.push({ lamp, gl, ph: si * 1.7 + sx }); }
  });

  // —— jemuran (para-para): panggung rendah + nampan pala (coklat) dan fuli (merah) ——
  const racks = [];
  function rack(x, z, w = 8.5, d = 3, seed = 1) {
    const g = new THREE.Group(), R = mulberry(seed);
    for (const [px, pz] of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2], [0, -d / 2], [0, d / 2]]) g.add(mesh(new THREE.CylinderGeometry(.07, .09, .62, 7).translate(px, .31, pz), M('beam')));
    g.add(mesh(new THREE.BoxGeometry(w + .3, .08, d + .3).translate(0, .62, 0), M('bamboo')));
    const n = Math.floor(w / 1.15);
    for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) { const k = R() > .62 ? 'fuli' : 'pala'; const t = tray(k, .5, .1); t.position.set(-w / 2 + .7 + i * (w - 1.2) / (n - 1), .66, (j - .5) * 1.3); g.add(t); }
    g.position.set(x, 0, z); scene.add(g); racks.push(g); return g;
  }
  rack(-15, 11.5, 8.5, 3, 3); rack(13, 11.5, 8.5, 3, 5); rack(-26, 12, 6, 2.8, 8);

  // —— rumah panggung + kebun ——
  const huts = [];
  [[-30, 20, .05], [-19, 24, -.08], [19, 24, .1], [30, 19, -.05], [-36, 6, .2], [37, 5, -.2], [-9, 30, 0], [8, 31, .05]].forEach(([x, z, r], i) => { const h = hut({ w: 4.2 + (i % 3) * .4, d: 3.4, door: i % 2 ? -.9 : .9, wall: i % 2 ? 'bamboo' : 'bambooDark', roof: i % 3 === 1 ? 'thatchGreen' : 'thatch' }); h.position.set(x, 0, z); h.rotation.y = r; scene.add(h); huts.push(h); });
  const trees = [];
  { const R = mulberry(57);
    const put = (kind, x, z, h, seed) => { const t = treeSprite(kind, seed, h); t.position.set(x, 0, z); scene.add(t); trees.push(t); return t; };
    for (let i = 0; i < 13; i++) { const x = -62 + i * 9.6 + R() * 3, z = -3.2 + R() * 2.5, h = 9 + R() * 4; if (Math.abs(x) < 7) continue; put('palm', x, z, h, i % 5 + 1); }                      // kelapa di pantai
    for (let i = 0; i < 38; i++) { const x = -70 + R() * 140, z = 22 + R() * 42; if (Math.abs(x) < 6 && z < 34) continue; put('pala', x, z, 6.5 + R() * 3.5, i % 4 + 1); }
    for (let i = 0; i < 12; i++) put('palm', -60 + R() * 120, 16 + R() * 30, 8 + R() * 4, i % 5 + 1);
    [-40, 42].forEach((x, i) => put('pala', x, 12 + i * 3, 8, 2));
  }

  // —— barang di dermaga & pangkal pantai ——
  { const g = sackStack([3, 2, 1], .66, 21); g.position.set(2.4, 0, -4.2); scene.add(g); const g2 = sackStack([2, 2], .66, 22); g2.position.set(-3.1, 0, -3.6); scene.add(g2);
    const p1 = sackStack([3, 2], .66, 23); p1.position.set(.6, 0, -10.6); scene.add(p1); const p2 = sackStack([2, 1], .66, 24); p2.position.set(-.7, 0, -12.1); scene.add(p2);
    const b1 = barrel(); b1.position.set(1.1, 0, -8); scene.add(b1); const b2 = barrel(.3, .8); b2.position.set(-1.1, 0, -7.2); scene.add(b2);
    const c = clothBolts(4, 7); c.position.set(-6.5, 0, 6.2); scene.add(c); const c2 = crate(.8); c2.position.set(8.3, 0, 7.1); c2.rotation.y = .4; scene.add(c2); }
  // papan titian dari dermaga ke perahu A
  { const plank = mesh(new THREE.BoxGeometry(2.2, .08, .7), M('plank')); plank.position.set(-1.9, .14, -14.4); plank.rotation.z = .12; scene.add(plank); }
  // lentera dermaga + tiang (menyala saat gelap)
  const posts = [];
  for (const [x, z] of [[-1.62, -8], [1.62, -8], [-1.62, -16], [1.62, -16], [-1.62, -24], [1.62, -24]]) { const p = mesh(new THREE.CylinderGeometry(.06, .08, 1.6, 6).translate(x, .8, z), M('beam')); scene.add(p);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(.2, .26, .2), new THREE.MeshStandardMaterial({ color: '#2a2016', emissive: '#ffb45a', emissiveIntensity: 0 })); lamp.position.set(x, 1.7, z); scene.add(lamp);
    const gl = glow('#ffb25e', 1.6, 1); gl.position.copy(lamp.position); scene.add(gl); lanterns.push({ lamp, gl, ph: x + z }); }
  // obor besar di pangkal dermaga (api piksel)
  const torches = [[-3.4, -2.2], [3.4, -2.2]].map(([x, z], i) => { const g = new THREE.Group(); g.add(mesh(new THREE.CylinderGeometry(.05, .07, 1.7, 6).translate(0, .85, 0), M('beam'))); const f = fire(.7, { seed: i }); f.position.y = 1.7; g.add(f); const gl = glow('#ff9a4a', 2.2, 1.1); gl.position.y = 2.0; g.add(gl); g.position.set(x, 0, z); scene.add(g); return { g, f, gl }; });

  // —— debu laut / percikan hujan ——
  const R2 = mulberry(77), dust = [...Array(140)].map(() => [R2() * 60 - 30, R2() * 7, R2() * 40 - 8, R2() * 10]);
  const DUST = particles(dust.length, (i, t, o) => { const d = dust[i]; o.x = d[0] + Math.sin(t * .2 + d[3]) * .8 + t * .15; o.y = d[1] + Math.sin(t * .3 + d[3] * 2) * .3; o.z = d[2]; o.a = .22 + .2 * Math.sin(t * 1.3 + d[3]); o.s = .05; o.r = 1; o.g = .92; o.b = .8; }, { soft: 1 });
  scene.add(DUST);
  const RAIN = rain(520, [-26, 0, -30, 26, 14, 24], { opacity: 0, speed: 16, len: .8, color: '#b8c8e0' }); scene.add(RAIN);

  // —— penghuni ——
  const cast = {};
  for (const k of ['najmi', 'paman', 'seller', 'seller2', 'woman1', 'woman2', 'crew1', 'crew2', 'crew3', 'turban', 'turban2', 'caping', 'caping2', 'kid']) { cast[k] = makePerson(k); scene.add(cast[k].root); cast[k].root.visible = false; }
  const handLamp = (() => { const L = new THREE.PointLight('#ffb050', 0, 10, 2); scene.add(L); const G = glow('#ffc070', 1.1, 1.2); scene.add(G); return { L, G }; })();
  const handLamp2 = (() => { const L = new THREE.PointLight('#ffb050', 0, 10, 2); scene.add(L); const G = glow('#ffc070', 1.1, 1.2); scene.add(G); return { L, G }; })();

  const W = { scene, SEA_Y, cast, PL, fill, handLamp, handLamp2, praus, PA, PB, stallG, racks, huts, trees, sun, hemi, DUST, RAIN, torches };

  // —— update: dipanggil tiap frame setelah blocking aktor ——
  const tmpV = new THREE.Vector3(), sunDir = new THREE.Vector3();
  W.update = function (t, ctx) {
    const { cam, post, renderer, tod: T, focus, shadowSpan = 34 } = ctx;
    // langit + matahari/bulan
    SK.u.top.value.copy(T.top); SK.u.mid.value.copy(T.mid); SK.u.hor.value.copy(T.hor); SK.u.moonCol.value.copy(T.disc); SK.u.moonI.value = T.discI;
    sunDir.set(...T.sun).normalize(); SK.u.moonDir.value.copy(sunDir);
    ST.material.uniforms.t.value = t; ST.material.uniforms.k.value = T.stars;
    scene.fog.color.copy(T.fog); scene.fog.density = T.fogD * .5; renderer.toneMappingExposure = T.exp;
    sun.color.copy(T.sunC); sun.intensity = T.sunI * (1 - .45 * clamp((T.sunI - 2.5) / 2, 0, 1)); sun.target.position.copy(focus); sun.position.copy(focus).addScaledVector(sunDir, 80);
    sun.shadow.camera.left = -shadowSpan; sun.shadow.camera.right = shadowSpan; sun.shadow.camera.top = shadowSpan; sun.shadow.camera.bottom = -shadowSpan; sun.shadow.camera.updateProjectionMatrix();
    hemi.color.copy(T.hemiS); hemi.groundColor.copy(T.hemiG); hemi.intensity = T.hemiI * (1 - .25 * clamp((T.hemiI - 2.2) / 1, 0, 1));
    // grading
    const V = post.vig.uniforms; V.warm.value = T.warm; V.sat.value = T.sat; V.amt.value = T.amt; V.contrast.value = .22; post.bloom.strength = T.bloom; post.bloom.radius = .75; post.bloom.threshold = .85;
    // laut
    SEA.u.t.value = t; SEA.u.camPos.value.copy(cam.position); SEA.u.fogColor.value.copy(scene.fog.color); SEA.u.fogDensity.value = scene.fog.density;
    SEA.u.deep.value.copy(T.deep); SEA.u.shallow.value.copy(T.shal); SEA.u.crest.value.copy(T.crest); SEA.u.calm.value = clamp(1.2 - T.wind * .9, 0, .8); SEA.u.bright.value = .7;
    const sl = [];
    const refl = Math.max(0, 1 - Math.max(0, sunDir.z + .1) * 3) * clamp(T.sunI / 3, 0, 1) * clamp(sunDir.y * .5 + .5, 0, 1);
    if (T.discI > 0.05 && sunDir.y > -.05) sl.push({ p: new THREE.Vector3(sunDir.x * 420, 90, sunDir.z * 420 - 40), c: T.disc, i: (sunDir.y < .35 ? 1.4 : .8) * clamp(refl + .15, 0, 1.2) });
    // lentera & lampu → pantulan di laut
    const lampK = T.lamp;
    // awan
    clouds.forEach((c, i) => { const vis = clamp((T.cover - c.th) * 6 + .0, 0, 1); c.m.visible = vis > .02; c.m.material.opacity = vis * (T.cover > .8 ? 1 : .9); c.m.material.color.copy(T.cloud).multiplyScalar(T.cloudK * 1.0 + .35); c.m.position.x = c.x0 + t * c.sp * (1 + T.wind); c.m.position.y += 0; });
    // hujan
    RAIN.visible = T.rain > .02; RAIN.material.opacity = T.rain * .5; if (RAIN.visible) { RAIN.position.set(focus.x, 0, focus.z); RAIN.userData.update(t, [-7 - T.wind * 3, 0]); }
    // gunung api
    VOL.userData.smoke.userData.update(t);
    // perahu: ayun + layar
    praus.forEach((p, i) => { const b = p.userData.base; p.position.y = b[1] + Math.sin(t * .8 + i * 1.3) * .06 * (1 + T.wind * .5); p.rotation.z = Math.sin(t * .7 + i) * .012 * (1 + T.wind); p.rotation.x = Math.sin(t * .6 + i * 2) * .01 * (1 + T.wind); animateSail(p, t, .3 + T.wind * .8, i); });
    // lampu perahu
    praus.forEach((p, i) => { const k = i < 2 ? lampK * (.9 + .1 * Math.sin(t * 3 + i)) : lampK * .7; p.userData.lamp.material.emissiveIntensity = k * 5; p.userData.lampGlow.material.opacity = k * .9; });
    // sampan lalu-lalang
    smalls.forEach(S => { const u = t * .02 * S.spd * S.dir + S.ph * 3; S.s.position.x = S.x + Math.sin(u) * S.amp * 8 + t * .0; S.s.position.z = S.z + Math.cos(u * .7) * 2; S.s.position.y = SEA_Y + .1 + Math.sin(t * 1.1 + S.ph) * .05; S.s.rotation.y = Math.cos(u) * S.dir > 0 ? 0 : Math.PI; S.s.rotation.z = Math.sin(t * .9 + S.ph) * .03; });
    // lentera & obor
    const fk = flick(t, 1);
    lanterns.forEach(L => { const k = lampK * (.92 + .08 * Math.sin(t * 5 + L.ph * 3)); L.lamp.material.emissiveIntensity = k * 5; L.gl.material.opacity = k * .85; L.gl.visible = k > .02; });
    torches.forEach((tc, i) => { const k = Math.max(0, lampK) * flick(t, 2 + i * 3); tc.f.visible = lampK > .05; tc.gl.material.opacity = k * .9; tc.f.userData.update(t, cam, lampK > .05 ? 1 : .001); });
    huts.forEach((h, i) => { h.userData.win.material.emissiveIntensity = lampK * (i % 3 === 2 ? 0 : 3.5); });
    if (lampK > .05) { torches.forEach((tc, i) => sl.push({ p: new THREE.Vector3(tc.g.position.x, 2, tc.g.position.z), c: new THREE.Color('#ff9a4a'), i: .5 * lampK })); sl.push({ p: new THREE.Vector3(0, 1.8, -16), c: new THREE.Color('#ffae55'), i: .8 * lampK }); praus.slice(0, 2).forEach(p => sl.push({ p: p.position.clone().setY(2), c: new THREE.Color('#ffae55'), i: .45 * lampK })); }
    SEA.setLights(sl);
    // pohon: menghadap kamera pada sumbu y (hanya bila kamera menyimpang jauh)
    DUST.userData.update(t);
    // fokus DOF
    post.dof.focus = Math.max(1, cam.position.distanceTo(focus));
    // buih
    foams.forEach((f, i) => f.offset.set(Math.sin(t * .6 + i) * .08, Math.floor(t * 4) % 2 * .12));
    return { lampK, sunDir };
  };
  return W;
}
