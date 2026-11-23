// mall.js: diorama mal lima lantai (potongan seperti rumah boneka, tiap lantai mundur 1,2 m), 2.5D pixel.
import * as THREE from 'three';
import { PX, ramp, hex, h2, fbm, texOf, cobbles, plaster, woodPlanks, billboard, glow, blob, radialTex, mulberry } from './px.js';
import { mat, mesh, mats } from './kit.js';
import { sky, stars, particles, flick } from './fx.js';
import { drawText, textW } from './font3.js';
import { spawn, makeGuard, mannequinAtlas, toyAtlas, SPX, FW, FH as SPH } from './people.js';
import { clamp, seg, ss, lerp } from '/core/lib.js';
import * as W from './world.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const hashT = (a, b = 0) => h2(a | 0, b | 0, 3);
// kotak dari ekstrem (min/max) -> mesh dengan UV dunia
function B(x0, x1, y0, y1, z0, z1, m, o) { const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); return mesh(g, m, o); }
const basic = (color, o = {}) => new THREE.MeshBasicMaterial({ color, fog: o.fog ?? true, transparent: !!o.tr, opacity: o.op ?? 1, depthWrite: o.dw ?? !o.tr, blending: o.add ? THREE.AdditiveBlending : THREE.NormalBlending, map: o.map || null, side: o.side || THREE.FrontSide });
function canvasTex(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; fn(g, w, h); return texOf(c); }

// —— tekstur ——
const tex = {};
function textures() {
  if (tex.ok) return tex;
  tex.tile = mat((() => { const P = new PX(96, 96), R = ramp(['#0a1216', '#12222a', '#1b3139', '#294650', '#3a5f6a'], .3); P.fill((x, y) => { const gx = x % 24, gy = y % 24, id = h2((x / 24) | 0, (y / 24) | 0, 5); let v = .42 + id * .22 + (fbm(x * .2, y * .2, 3) - .5) * .18; if (gx === 0 || gy === 0) v = .06; else if (gx === 1 || gy === 1) v += .16; return R(v, x, y); }); return P.done(); })());
  tex.wall = mat(plaster(96, 96, { seed: 21, wall: ['#101c24', '#18303a', '#244450', '#335a68'], beams: [{ t: 'v', x: 0 }, { t: 'v', x: 48 }] }));
  tex.concrete = mat(plaster(96, 96, { seed: 4, wall: ['#14181c', '#232a30', '#363f46', '#4a565e'], beams: [] }));
  tex.dark = mat(plaster(96, 96, { seed: 9, wall: ['#06090c', '#0d1318', '#151e25', '#1f2c35'], beams: [] }));
  tex.metal = mat((() => { const P = new PX(48, 48), R = ramp(['#14181c', '#2a323a', '#46525c', '#6a7884'], .3); P.fill((x, y) => { let v = .5 + (h2(x >> 1, y, 2) - .5) * .12; if (y % 3 === 0) v = .15; else if (y % 3 === 1) v += .2; return R(v, x, y); }); return P.done(); })());
  tex.plaza = mat(cobbles(96, 96, { seed: 8, cell: 8, cols: ['#0a0e12', '#141a20', '#1e262e', '#2a343c', '#38444e'] }));
  tex.wood = mat(woodPlanks(96, 96, { pw: 6, len: 48, seed: 5, cols: ['#1a1210', '#2e201a', '#4a3226', '#684a38', '#84604a'] }));
  tex.basin = mat(plaster(96, 96, { seed: 31, wall: ['#202c34', '#34444e', '#506470', '#748a96'], beams: [{ t: 'h', y: 0 }] }));
  tex.ok = true; return tex;
}
// papan toko: canvas kecil, 24 px/m
function signTex(text, bg, fg, sc = 2) { const w = Math.ceil(textW(text, sc) + 6 * sc), h = 5 * sc + 6 * sc; return { w, h, t: canvasTex(w, h, (g) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, 0, w, sc); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, h - sc, w, sc); drawText(g, text, 3 * sc, 3 * sc, fg, sc); }) }; }

export function buildMall() {
  const T = textures(), scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2('#0a1a22', .0085);
  const SK = sky({ top: '#03060e', mid: '#091a26', hor: '#12303c', moonDir: V3(.45, .38, -1), moonCol: '#cfe0ff', moonI: .9 }); scene.add(SK.mesh);
  const ST = stars(700, 11); scene.add(ST);

  // —— cahaya: kunci dingin redup + fill hemisfer; sisanya praktikal ——
  const key = new THREE.DirectionalLight('#86b4cc', 1.0); key.position.set(-26, 46, 60); key.target.position.set(0, 8, -4);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -34, right: 34, top: 34, bottom: -34, near: 1, far: 160 }); key.shadow.bias = -.0006; key.shadow.normalBias = .03;
  scene.add(key, key.target);
  const hemi = new THREE.HemisphereLight('#3f7388', '#0c141a', 1.5); scene.add(hemi);

  // —— tanah / plaza ——
  scene.add(B(-90, 90, -.8, 0, -40, 70, T.plaza, { cast: false }));
  const NF = 5, levels = [];
  // —— rangka bangunan ——
  scene.add(B(-XW() - .6, XW() + .6, 0, W.FH * NF + 1.2, W.ZB - .6, W.ZB, T.wall));                 // dinding belakang
  for (let k = 0; k < NF; k++) {
    const y = W.floorY(k), zf = W.frontZ(k);
    // lantai: kiri & kanan void atrium (lantai dasar: satu pelat ubin)
    const floorTop = (x0, x1) => B(x0, x1, y - (k ? .45 : .05), y + (k ? 0 : .02), W.ZB, zf, T.tile);
    if (k === 0) scene.add(floorTop(-XW(), XW())); else { scene.add(floorTop(-XW(), -W.SLOT)); scene.add(floorTop(W.SLOT, XW())); }
    // dinding samping
    scene.add(B(-XW() - .5, -XW(), y, y + W.FH, W.ZB, zf, T.concrete)); scene.add(B(XW(), XW() + .5, y, y + W.FH, W.ZB, zf, T.concrete));
    // pita LED di tepi depan lantai (praktikal dingin)
    for (const [x0, x1] of k ? [[-XW(), -W.SLOT], [W.SLOT, XW()]] : [[-XW(), XW()]]) { const m = basic(new THREE.Color('#5fe0d0').multiplyScalar(.55)); const s = B(x0, x1, y - .1, y - .03, zf + .01, zf + .05, m, { cast: false }); scene.add(s); levels.push({ m, c: new THREE.Color('#5fe0d0'), base: .55, k: 'led' }); }
    // pagar kaca di tepi void (kiri-kanan) untuk lantai atas
    if (k) for (const sx of [-1, 1]) {
      const gx = sx * W.SLOT;
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(zf - W.ZB, 1.0), basic('#6fd6d0', { tr: 1, op: .16, side: THREE.DoubleSide, fog: true })); gl.rotation.y = Math.PI / 2; gl.position.set(gx, y + .5, (zf + W.ZB) / 2); scene.add(gl);
      const rail = B(gx - .05, gx + .05, y + .98, y + 1.06, W.ZB, zf, basic(new THREE.Color('#80fff0').multiplyScalar(.9)), { cast: false }); scene.add(rail);
    }
  }
  // atap lantai teratas: parapet tipis di belakang
  scene.add(B(-XW() - .6, XW() + .6, W.FH * NF + 1.2, W.FH * NF + 1.6, W.ZB - .6, W.ZB + .2, T.concrete));

  // —— toko: 4 per lantai (dua kiri, dua kanan) ——
  const BAYS = [[-16, -10.25], [-10.25, -4.5], [4.5, 10.25], [10.25, 16]];
  const NAMES = [['KAFE', 'BUKU', 'SEPATU', 'OPTIK'], ['SPORT', 'ELEKTRO', 'TAS', 'MODE'], ['MAINAN', 'KIDS', 'GAME', 'JAM'], ['FOOD', 'SALON', 'APOTEK', 'HOBI'], ['KOPI', 'ROTI', 'BUNGA', 'FOTO']];
  const INTER = ['#ffd9a0', '#bfe8ff', '#ffb0d8', '#d8ffc0'], SIGN = [['#7a1a2e', '#ffe0e0'], ['#0e3a5c', '#d8f4ff'], ['#4c2a6e', '#f4e0ff'], ['#6a4a08', '#fff4c8']];
  const stores = []; const outOrder = []; for (let i = 0; i < NF * 4; i++) outOrder.push(i);
  outOrder.sort((a, b) => hashT(a, 1) - hashT(b, 1));
  for (let k = 0; k < NF; k++) BAYS.forEach(([x0, x1], j) => {
    const y = W.floorY(k), idx = k * 4 + j, w = x1 - x0, cx = (x0 + x1) / 2;
    const open = (k === 1 && j === 3) || (k === 2 && j === 0);                        // etalase manekin & toko mainan terbuka
    const st = { k, j, x0, x1, level: 1, parts: [] };
    const it = INTER[(k + j) % 4], sg = SIGN[(k * 3 + j) % 4];
    // pilar + ambang atas + ambang bawah
    scene.add(B(x0, x0 + .45, y, y + W.FH - .45, W.ZWIN - .3, W.ZWIN + .1, T.concrete)); scene.add(B(x1 - .45, x1, y, y + W.FH - .45, W.ZWIN - .3, W.ZWIN + .1, T.concrete));
    scene.add(B(x0, x1, y + 3.55, y + W.FH - .45, W.ZWIN - .3, W.ZWIN + .1, T.concrete)); scene.add(B(x0, x1, y, y + .55, W.ZWIN - .3, W.ZWIN + .1, T.concrete));
    // sekat samping & belakang toko
    scene.add(B(x0, x0 + .2, y, y + W.FH - .45, W.ZB, W.ZWIN - .3, T.dark)); scene.add(B(x1 - .2, x1, y, y + W.FH - .45, W.ZB, W.ZWIN - .3, T.dark));
    // panel dalam (cahaya toko)
    const im = basic(new THREE.Color(it)); const panel = new THREE.Mesh(new THREE.PlaneGeometry(w - .9, 3.0), im); panel.position.set(cx, y + 2.05, W.ZB + .12); scene.add(panel);
    st.parts.push({ m: im, c: new THREE.Color(it), gain: 1.1, floor: .03 });
    // langit-langit toko (garis lampu)
    const cm = basic(new THREE.Color('#fff4e0')); const cl = new THREE.Mesh(new THREE.PlaneGeometry(w - 1.2, .3), cm); cl.position.set(cx, y + 3.3, W.ZWIN - .35); scene.add(cl); st.parts.push({ m: cm, c: new THREE.Color('#fff4e0'), gain: 1.4, floor: .02 });
    // papan
    const S = signTex(NAMES[k][j], sg[0], sg[1], 2), sm = basic(new THREE.Color('#ffffff'), { map: S.t }); const sp = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(w - 1, S.w / 24), S.h / 24), sm); sp.position.set(cx, y + 4.0, W.ZWIN + .12); scene.add(sp); st.parts.push({ m: sm, c: new THREE.Color('#ffffff'), gain: 1.15, floor: .07 });
    // pintu rolling (tertutup) atau etalase terbuka
    if (!open) { const sm0 = T.metal.clone(); sm0.emissive = new THREE.Color(0); const sh = B(x0 + .45, x1 - .45, y + .55, y + 3.55, W.ZWIN - .05, W.ZWIN + .02, sm0); scene.add(sh); st.parts.push({ m: sm0, c: new THREE.Color(it), gain: .5, floor: 0, std: 1 }); }
    else { const bars = new THREE.Group(); for (let b = 0; b < Math.floor(w - .9); b++) bars.add(B(x0 + .7 + b, x0 + .75 + b, y + .55, y + 3.55, W.ZWIN + .02, W.ZWIN + .05, T.dark, { cast: false })); scene.add(bars); }
    // tumpahan cahaya di lantai (aditif)
    const sm2 = basic(new THREE.Color(it), { tr: 1, add: 1, map: radialTex('spill', [[0, 'rgba(255,255,255,.9)'], [.6, 'rgba(255,255,255,.25)'], [1, 'rgba(255,255,255,0)']]), fog: true });
    const spill = new THREE.Mesh(new THREE.PlaneGeometry(w + 1, 4.2), sm2); spill.rotation.x = -Math.PI / 2; spill.position.set(cx, y + .05, W.ZWIN + 1.8); spill.renderOrder = 2; scene.add(spill); st.parts.push({ m: sm2, c: new THREE.Color(it), gain: .65, floor: 0 });
    st.out = W.LIGHTS_OUT.t0 + (outOrder.indexOf(idx) / (NF * 4 - 1)) * (W.LIGHTS_OUT.t1 - W.LIGHTS_OUT.t0);
    st.base = (k === 1 && j === 3) ? .22 : 0;   // etalase manekin tetap remang
    stores.push(st);
  });

  // —— papan neon "MALL" di bagian atas ——
  const neonTex = canvasTex(60, 16, (g) => { g.fillStyle = '#000'; g.fillRect(0, 0, 60, 16); drawText(g, 'MALL', 6, 2, '#ff7ad8', 3, 2); });
  const neonM = basic(new THREE.Color('#ffffff'), { map: neonTex, tr: 1, add: 1 }); const neon = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.4), neonM); neon.position.set(0, W.FH * NF + .1, W.ZB + .2); scene.add(neon);

  // —— tanda EXIT ——
  const exitM = basic(new THREE.Color('#40ff90').multiplyScalar(1.4)); const exits = [];
  for (let k = 0; k < NF; k++) for (const sx of [-1, 1]) { const e = B(sx * 5.4 - .45, sx * 5.4 + .45, W.floorY(k) + 3.7, W.floorY(k) + 4.0, W.ZB + .02, W.ZB + .1, exitM, { cast: false }); scene.add(e); const gl = glow('#40ff90', 1.1, .8); gl.position.set(sx * 5.4, W.floorY(k) + 3.85, W.ZB + .5); scene.add(gl); exits.push(gl); }

  // ═══════════ ESKALATOR ═══════════
  const escs = [];
  const stepCv = canvasTex(16, 8, (g) => { g.fillStyle = '#1c242a'; g.fillRect(0, 0, 16, 8); g.fillStyle = '#4c5a64'; g.fillRect(0, 0, 14, 6); g.fillStyle = '#8a98a2'; g.fillRect(0, 0, 14, 1); g.fillStyle = '#e8c030'; g.fillRect(14, 0, 2, 8); g.fillStyle = '#10161a'; for (let i = 2; i < 14; i += 3) g.fillRect(i, 1, 1, 5); });
  for (let e = 0; e < 4; e++) {
    const f = W.escFoot(e), tp = W.escTop(e), dx = tp.x - f.x, dy = tp.y - f.y, L = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
    const g = new THREE.Group(); g.position.set((f.x + tp.x) / 2, (f.y + tp.y) / 2, W.ZESC); g.rotation.z = ang;
    const st = stepCv.clone(); st.needsUpdate = true; st.wrapS = st.wrapT = THREE.RepeatWrapping; st.repeat.set(L / .5, 1);
    const ramp0 = new THREE.Mesh(new THREE.BoxGeometry(L, .4, 1.5), new THREE.MeshStandardMaterial({ map: st, roughness: .8 })); ramp0.position.y = -.2; ramp0.castShadow = ramp0.receiveShadow = true; g.add(ramp0);
    const truss = new THREE.Mesh(new THREE.BoxGeometry(L, .7, 1.4), new THREE.MeshStandardMaterial({ color: '#10181e', roughness: .9 })); truss.position.y = -.75; truss.castShadow = true; g.add(truss);
    const railM = basic(new THREE.Color('#7fffee'));
    for (const sz of [-1, 1]) {
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(L, .85), basic('#7fe0d8', { tr: 1, op: .07, side: THREE.DoubleSide })); gl.position.set(0, .45, sz * .76); g.add(gl);
      const hr = new THREE.Mesh(new THREE.BoxGeometry(L, .08, .12), railM); hr.position.set(0, .92, sz * .76); g.add(hr);
    }
    const ledM = basic('#40ff70'); const led = new THREE.Mesh(new THREE.BoxGeometry(.3, .3, .1), ledM); led.position.set(-L / 2 + .4, .6, .86); g.add(led);
    scene.add(g); escs.push({ g, st, railM, ledM, stop: W.ESC_STOP[e], dir: W.escDir(e), e });
  }
  // ═══════════ AIR MANCUR ═══════════
  const FZ = -4.4;
  scene.add(mesh(new THREE.CylinderGeometry(2.9, 3.0, .55, 28).translate(0, .275, FZ), T.basin));
  const waterC = canvasTex(32, 32, (g) => { const im = g.createImageData(32, 32); for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const n = fbm(x * .22, y * .22, 4), i = (y * 32 + x) * 4, v = n > .62 ? 1 : n > .5 ? .55 : .25; im.data[i] = 30 * v + 20; im.data[i + 1] = 150 * v + 40; im.data[i + 2] = 190 * v + 50; im.data[i + 3] = 255; } g.putImageData(im, 0, 0); });
  waterC.wrapS = waterC.wrapT = THREE.RepeatWrapping; waterC.repeat.set(3, 3);
  const water = new THREE.Mesh(new THREE.CircleGeometry(2.55, 28), basic(new THREE.Color('#ffffff').multiplyScalar(2.2), { map: waterC })); water.rotation.x = -Math.PI / 2; water.position.set(0, .5, FZ); scene.add(water);
  let fountPower = 1;
  const drops = particles(110, (i, t, o) => {
    const j = i % 8, ring = j > 0, ph = ((t * (ring ? .8 : .95) + (i * .137)) % 1), H = (ring ? 1.7 : 3.1) * fountPower, a = j * .785 + 0.3;
    const r = ring ? (1.25 + ph * .55) * (ph * 1.3 + .3) : .05 + Math.sin(i) * .06;
    o.x = Math.cos(a) * r; o.z = FZ + Math.sin(a) * r; o.y = .55 + H * 4 * ph * (1 - ph);
    o.a = 1.2 * (.4 + .6 * Math.sin(ph * 3.14)); o.s = .15; o.r = .55; o.g = .95; o.b = 1.1;
  }, { soft: 1 }); scene.add(drops);
  const fLight = new THREE.PointLight('#50e8ff', 7, 13, 2); fLight.position.set(0, 1.5, FZ); scene.add(fLight);
  const fGlow = glow('#50e8ff', 3.2, .8); fGlow.position.set(0, 1.4, FZ); scene.add(fGlow);

  // ═══════════ PLAZA ═══════════
  [[-24, 7], [-9, 8], [9, 8], [24, 7], [-32, -12], [32, -12]].forEach(([x, z]) => {
    scene.add(B(x - .1, x + .1, 0, 4.2, z - .1, z + .1, T.dark)); scene.add(B(x - .1, x + .7, 4.1, 4.3, z - .1, z + .1, T.dark));
    const hd = new THREE.Mesh(new THREE.BoxGeometry(.5, .2, .35), basic(new THREE.Color('#ffb060').multiplyScalar(2))); hd.position.set(x + .5, 4.0, z); scene.add(hd);
    const gl = glow('#ffb060', 3.2, 1.0); gl.position.set(x + .5, 3.9, z); scene.add(gl);
    const sp = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), basic(new THREE.Color('#ffa050'), { tr: 1, add: 1, map: radialTex('spill2', [[0, 'rgba(255,255,255,.55)'], [1, 'rgba(255,255,255,0)']]) })); sp.rotation.x = -Math.PI / 2; sp.position.set(x + .4, .03, z); sp.renderOrder = 2; scene.add(sp);
  });
  const rr = mulberry(5);
  for (let i = 0; i < 7; i++) { const x = -26 + i * 8.5, z = 3 + rr() * 3; scene.add(B(x - .5, x + .5, 0, .6, z - .5, z + .5, T.basin)); const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(.7, 0), new THREE.MeshStandardMaterial({ color: '#17402c', flatShading: true })); bush.position.set(x, 1.0, z); bush.castShadow = true; scene.add(bush); }

  // ═══════════ POS JAGA + CCTV ═══════════
  const BX0 = -14.6, BX1 = -8.4, BZ0 = -7.0, BZ1 = -2.4;
  scene.add(B(BX0, BX1, 0, .18, BZ0, BZ1, T.wood));
  scene.add(B(BX0, BX1, .18, 2.9, BZ0 - .2, BZ0, T.concrete)); scene.add(B(BX0 - .2, BX0, .18, 2.9, BZ0 - .2, BZ1, T.concrete)); scene.add(B(BX1, BX1 + .2, .18, 1.2, BZ0 - .2, BZ1, T.concrete));
  const posSign = signTex('POS JAGA', '#0e2a40', '#bfe8ff', 1); { const pm = basic('#ffffff', { map: posSign.t }); const ps = new THREE.Mesh(new THREE.PlaneGeometry(posSign.w / 24 * 1.6, posSign.h / 24 * 1.6), pm); ps.position.set(-11.5, 2.5, BZ0 + .05); scene.add(ps); }
  const cons = new THREE.Group(); cons.position.set(-9.7, 0, -4.9); cons.rotation.y = .42; scene.add(cons);
  cons.add(B(-1.2, 1.2, .18, 1.0, -.45, .45, T.dark)); cons.add(B(-1.25, 1.25, 1.0, 1.08, -.5, .5, T.wood)); cons.add(B(-.9, .9, 1.08, 1.3, -.05, .05, T.dark, { cast: false }));
  const SCR = [], SW = 96, SH = 64;
  const scrPos = [[-.62, 2.0], [0, 2.0], [.62, 2.0], [-.62, 1.5], [0, 1.5], [.5, 1.43]];
  for (let i = 0; i < 6; i++) {
    const cv = document.createElement('canvas'); cv.width = SW; cv.height = SH; const cx2 = cv.getContext('2d'); const tx = texOf(cv);
    const small = i === 5, sc = small ? .62 : 1, w = .56 * sc, h = .4 * sc;
    const grp = new THREE.Group(); grp.position.set(scrPos[i][0], scrPos[i][1] - .05, .1); cons.add(grp);
    grp.add(B(-w / 2 - .03, w / 2 + .03, -h / 2 - .03, h / 2 + .03, -.04, 0, T.dark));
    const sm3 = basic(new THREE.Color('#ffffff').multiplyScalar(1.5), { map: tx, fog: false }); const pl = new THREE.Mesh(new THREE.PlaneGeometry(w, h), sm3); pl.position.z = .005; grp.add(pl);
    const hl = new THREE.Mesh(new THREE.PlaneGeometry(w + .08, h + .08), basic(new THREE.Color('#ffe080').multiplyScalar(2), { tr: 1, op: 0, fog: false })); hl.position.z = -.01; grp.add(hl);
    SCR.push({ cv, cx: cx2, tx, m: sm3, hl });
  }
  const cctvL = new THREE.PointLight('#58b8ff', 0, 8, 2); cctvL.position.set(-10.2, 1.8, -3.5); scene.add(cctvL);
  const cctvG = glow('#58b8ff', 2.4, 0); cctvG.position.set(-9.3, 1.8, -4.2); scene.add(cctvG);
  scene.add(B(-11.9, -11.1, .18, .55, -4.95, -4.2, T.dark)); scene.add(B(-12.0, -11.88, .55, 1.3, -4.95, -4.2, T.dark));

  // ═══════════ TOKO MAINAN: rak + kotak musik ═══════════
  const RX = -13.8, RY = W.floorY(2), RZ = -5.4;
  scene.add(B(RX - 1.4, RX + 1.4, RY, RY + 1.6, RZ - .3, RZ - .22, T.wood));
  for (const yy of [.05, .55, 1.05, 1.55]) scene.add(B(RX - 1.4, RX + 1.4, RY + yy, RY + yy + .07, RZ - .3, RZ + .25, T.wood));
  for (const sx of [-1.4, 1.4]) scene.add(B(RX + sx - .05, RX + sx + .05, RY, RY + 1.62, RZ - .3, RZ + .25, T.wood));
  const TA = toyAtlas(), rt = mulberry(19);
  for (const [yy, n] of [[.12, 7], [.62, 7], [1.12, 6]]) for (let i = 0; i < n; i++) {
    const tx = TA.tex.clone(); tx.needsUpdate = true; tx.repeat.set(1 / TA.N, 1); tx.offset.x = Math.floor(rt() * TA.N) / TA.N;
    const b = billboard(tx, .5, .5, {}); b.position.set(RX - 1.2 + i * (2.4 / (n - 1)) + (rt() - .5) * .1, RY + yy + .07, RZ + .05); scene.add(b);
  }
  const MBX = RX + .35, MBY = RY + .62 + .07, MBZ = RZ + .02;
  const mbG = new THREE.Group(); mbG.position.set(MBX, MBY, MBZ); scene.add(mbG);
  const mbMat = mat((() => { const P = new PX(24, 12), R = ramp(['#3a1626', '#7a2c4a', '#b8486e', '#e07898'], .3); P.fill((x, y) => R(.55 + (h2(x, y, 7) - .5) * .3 + (y < 2 ? .25 : 0), x, y)); return P.done(); })());
  mbG.add(B(-.2, .2, 0, .17, -.14, .14, mbMat));
  const lidPivot = new THREE.Group(); lidPivot.position.set(0, .17, -.14); mbG.add(lidPivot); lidPivot.add(B(-.21, .21, 0, .035, 0, .29, T.wood));
  const ballerina = billboard((() => { const P = new PX(8, 12); P.rect(3, 0, 2, 2, hex('#f4d8c0')); P.rect(3, 2, 2, 4, hex('#ff9ac8')); P.poly([[0, 7], [8, 7], [6, 6], [2, 6]], hex('#ffc0e0')); P.rect(3, 7, 2, 4, hex('#f4d8c0')); P.outline(.3); return texOf(P.done()); })(), .16, .24, {});
  ballerina.position.set(0, .17, 0); mbG.add(ballerina);
  const mbLight = new THREE.PointLight('#ff9ad0', 0, 5, 2); mbLight.position.set(MBX, MBY + .6, MBZ + .5); scene.add(mbLight);
  const mbGlow = glow('#ff9ad0', 2.6, 0); mbGlow.position.set(MBX, MBY + .3, MBZ + .2); scene.add(mbGlow);
  const NOTES = W.boxNotes();
  const noteP = particles(NOTES.length, (i, t, o) => {
    const age = t - NOTES[i].t; if (age < 0 || age > 2.4) { o.a = 0; o.x = MBX; o.y = MBY; o.z = MBZ; return; }
    o.x = MBX + Math.sin(age * 2.6 + i) * .25 + age * .08; o.y = MBY + .3 + age * .55; o.z = MBZ + .25; o.a = Math.min(1, age * 6) * (1 - age / 2.4) * 1.3; o.s = .17; o.r = 1.5; o.g = .75; o.b = 1.2;
  }, { soft: 1 }); scene.add(noteP);

  // ═══════════ ETALASE MODE: manekin ═══════════
  const MA = mannequinAtlas(), MY = W.floorY(1), mans = [];
  for (let i = 0; i < 7; i++) { const a = spawn(MA, .3); a.root.position.set(11.0 + i * .72, MY, -6.5 + (i % 2 ? .14 : 0) + i * .004); a.frame('m' + i); scene.add(a.root); mans.push(a); }
  const numSp = [];
  for (let i = 0; i < 7; i++) {
    const tx = canvasTex(8, 8, (g) => { drawText(g, String(i + 1), 2, 1, i === 6 ? '#ff5a48' : '#ffe27a', 1); }); const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthTest: false, fog: false })); sp.scale.set(.5, .5, 1); sp.renderOrder = 8; sp.visible = false; scene.add(sp); numSp.push(sp);
  }
  const ghost = spawn(MA, .3); ghost.root.position.set(-13.2, .18, -4.5); ghost.frame('m6t'); ghost.root.visible = false; scene.add(ghost.root);

  // ═══════════ PENJAGA + SENTER ═══════════
  const guard = makeGuard(); scene.add(guard.root);
  const spot = new THREE.SpotLight('#ffe6b0', 60, 11, .42, .65, 1.5); spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -.002; spot.shadow.camera.near = .2; scene.add(spot, spot.target);
  const lant = new THREE.PointLight('#ffd890', 2.5, 7, 2); scene.add(lant);
  const tipGlow = glow('#ffe6b0', .9, 1.2); scene.add(tipGlow);
  const fill = new THREE.PointLight('#9fc8e8', 1.4, 10, 2); scene.add(fill);
  const hero = { pos: new THREE.Vector3(), mode: 'idle' };
  const A = { guard, spot, lant, tipGlow, fill, hero, escs, SCR, scene, stores, T, key, hemi, SK };
  // ═══════════ LAYAR CCTV ═══════════
  const hlSched = [[86.8, 88.2, 0], [88.4, 89.8, 2], [89.9, 91.6, 2], [91.8, 93.7, 1], [93.9, 99.9, 1], [106.9, 131, 5]];
  const sil = (g, x, y, col) => { g.fillStyle = col; g.fillRect(x - 1, y, 3, 3); g.fillRect(x - 2, y + 3, 5, 9); g.fillRect(x - 2, y + 12, 2, 5); g.fillRect(x + 1, y + 12, 2, 5); };
  function drawScr(i, t) {
    const S = SCR[i], g = S.cx, on = t >= 85.0, fl = on && t < 85.9 ? (h2(Math.floor(t * 20), i, 4) > .35 ? 1 : 0) : 1;
    g.fillStyle = '#02080c'; g.fillRect(0, 0, SW, SH);
    if (!on || !fl) { S.tx.needsUpdate = true; return; }
    g.fillStyle = '#052435'; g.fillRect(0, 0, SW, SH);
    const L = '#6fd8ff', D = '#2c7898', Hh = '#e8fbff';
    if (i === 0) {
      g.fillStyle = D; for (let x = 0; x < 96; x += 2) g.fillRect(x, 50, 1, 1);
      g.strokeStyle = L; g.lineWidth = 1; g.beginPath(); g.ellipse(48, 44, 17, 6, 0, 0, 7); g.stroke();
      for (let k = 0; k < 6; k++) { const ph = (t * .9 + k * .17) % 1; g.fillStyle = Hh; g.fillRect(48 + Math.sin(k * 2) * 5 * ph, 44 - 22 * 4 * ph * (1 - ph) * .5, 1, 1); }
      g.fillStyle = D; g.fillRect(10, 20, 22, 1); g.fillRect(64, 28, 22, 1); g.fillRect(10, 20, 1, 8);
    } else if (i === 1) {
      g.fillStyle = D; g.fillRect(6, 52, 84, 1);
      for (let k = 0; k < 6; k++) { sil(g, 14 + k * 14, 30, L); const c = W.COUNT2[k]; if (t >= c && t < 99.9) { const a = t - c; drawText(g, String(k + 1), 12 + k * 14, 21 - Math.min(3, a * 12), a < .5 ? Hh : L, 1); } }
      if (t >= 99.1 && t < 100.6) { g.strokeStyle = Hh; g.strokeRect(5.5, 24.5, 85, 28); }
    } else if (i === 2) {
      g.fillStyle = D; for (let y = 22; y < 56; y += 11) g.fillRect(10, y, 76, 1);
      g.fillStyle = L; g.fillRect(58, 40, 7, 5); g.fillStyle = D; g.fillRect(58, 40, 7, 1);
      for (let k = 0; k < 9; k++) { g.fillStyle = D; g.fillRect(14 + k * 7, 15 + ((k * 5) % 3), 3, 4); }
    } else if (i === 3 || i === 4) {
      g.strokeStyle = D; g.beginPath(); g.moveTo(8, 56); g.lineTo(40, 30); g.moveTo(88, 56); g.lineTo(56, 30); g.moveTo(40, 30); g.lineTo(56, 30); g.stroke();
    } else {
      g.fillStyle = D; g.fillRect(8, 44, 80, 1); g.fillRect(58, 34, 26, 10); g.fillStyle = '#0c4058'; g.fillRect(60, 36, 22, 3);
      g.fillStyle = L; g.fillRect(25, 34, 12, 12); g.fillStyle = '#c0e830'; g.fillRect(26, 31, 10, 10); g.fillStyle = '#d19a78'; g.fillRect(28, 25, 6, 6); g.fillStyle = '#1d2a4c'; g.fillRect(27, 23, 8, 3);
      if (t >= W.TIMES.appear) {
        const u = ss(seg(t, W.TIMES.armUp0, W.TIMES.armUp1)); g.fillStyle = Hh; g.fillRect(8, 22, 8, 8); g.fillRect(6, 30, 12, 20); g.fillRect(4, 30, 2, 14);
        g.fillRect(16, 33 - u * 8, 8 + u * 2, 2); g.fillRect(22 + u * 3, 30 - u * 9, 3, 3 + u * 6);
      }
    }
    drawText(g, 'CAM 0' + (i + 1), 3, 3, Hh, 1); if (i < 5) drawText(g, ['LT 1', 'LT 2', 'LT 3', 'LT 4', 'LT 5'][i], 3, 57, L, 1);
    drawText(g, W.clock(t).replace('.', ':'), 62, 3, L, 1);
    g.fillStyle = 'rgba(0,0,0,.28)'; for (let y = 0; y < SH; y += 2) g.fillRect(0, y, SW, 1);
    for (let k = 0; k < 24; k++) { g.fillStyle = 'rgba(200,240,255,.35)'; g.fillRect((h2(k, Math.floor(t * 15), 2) * SW) | 0, (h2(k, Math.floor(t * 15), 3) * SH) | 0, 1, 1); }
    if (t > W.TIMES.appear - .05 && t < W.TIMES.appear + .35) { for (let k = 0; k < 6; k++) { g.fillStyle = 'rgba(220,250,255,.6)'; g.fillRect(0, (h2(k, Math.floor(t * 30), 8) * SH) | 0, SW, 1 + (k & 1)); } }
    S.tx.needsUpdate = true;
  }

  // ═══════════ UPDATE ═══════════
  const bump = (t, c, w) => Math.exp(-(((t - c) / w) ** 2));
  const lidAmt = t => Math.max(ss(seg(t, 62.0, 62.4)) * (1 - ss(seg(t, 70.55, 70.95))), ss(seg(t, 76.0, 76.3)) * (1 - ss(seg(t, 84.3, 84.7))));
  function update(t, cam) {
    for (const st of stores) {
      let lvl = t < st.out ? 1 : lerp(1, st.base, ss(seg(t, st.out, st.out + .3)));
      if (t > st.out - .55 && t < st.out) lvl *= .5 + .5 * (h2(Math.floor(t * 22), st.k * 4 + st.j, 1) > .4 ? 1 : 0);
      if (st.k === 1 && st.j === 3 && t > 48.4 && t < 50.8) lvl = h2(Math.floor(t * 18), 9, 2) > .45 ? .55 : .04;
      for (const p of st.parts) { if (p.std) p.m.emissive.copy(p.c).multiplyScalar(lvl * p.gain * .45); else p.m.color.copy(p.c).multiplyScalar(p.floor + lvl * p.gain); }
    }
    { const nl = t < 3.7 ? 1 : (t < 4.1 ? (h2(Math.floor(t * 25), 3, 3) > .4 ? 1 : .1) : .05); neonM.color.setScalar(nl); }
    ST.material.uniforms.t.value = t;
    for (const e of escs) {
      const tt = Math.min(t, e.stop); e.st.offset.x = -(tt * .55 / .5);
      const run = t < e.stop, since = t - e.stop;
      e.ledM.color.set(run ? '#40ff70' : (since < .9 ? (Math.floor(since * 8) % 2 ? '#ff3020' : '#501008') : '#8a1c10')).multiplyScalar(run ? 1.1 : 1.5);
      e.railM.color.set('#7fffee').multiplyScalar((run ? .55 : .3) * (1 + 3.2 * bump(t, 32.4 + e.e * .55, .28)));
    }
    const loud = t > 24.5 && t < 29.8; A.setFount(loud ? 1.3 : 1); drops.userData.update(t);
    fLight.intensity = 6.5 * (1 + .1 * Math.sin(t * 6)) * (loud ? 1.25 : 1); fGlow.material.opacity = .4;
    water.material.map.offset.set((Math.floor(t * 6) % 8) / 16, (Math.floor(t * 4) % 8) / 8);
    const la = lidAmt(t), playing = W.boxPlaying(t);
    lidPivot.rotation.x = -la * 1.85; ballerina.visible = la > .05; ballerina.scale.x = Math.cos(t * 3.2) * la || .01;
    mbLight.intensity = playing ? 2.8 * (.75 + .25 * Math.sin(t * 9)) : 0; mbGlow.material.opacity = playing ? .8 : 0; noteP.userData.update(t);
    mans[6].frame(t >= 57.6 ? 'm6t' : 'm6'); mans.forEach(m => m.face(cam));
    numSp.forEach((sp, i) => {
      const age = t - W.COUNT1[i], vis = age >= 0 && t < 52.7; sp.visible = vis;
      if (vis) { const pop = .5 * (1 + .5 * Math.max(0, 1 - age * 5)); sp.scale.set(pop, pop, 1); sp.position.set(11.0 + i * .72, W.floorY(1) + 2.3 + Math.min(.15, age * .5), -6.4); sp.material.opacity = 1 - ss(seg(t, 52.0, 52.7)); }
    });
    ghost.root.visible = t >= W.TIMES.appear; ghost.face(cam);
    { const u = seg(t, W.TIMES.armUp0, W.TIMES.armUp1); ghost.frame(t < W.TIMES.armUp0 ? 'm6t' : u < .28 ? 'm6r0' : u < .55 ? 'm6r1' : u < .8 ? 'm6r2' : 'm6r3'); }
    if (t >= 84.5) { SCR.forEach((_, i) => drawScr(i, t)); let hi = -1; for (const [a, b, ix] of hlSched) if (t >= a && t < b) hi = ix; SCR.forEach((S, i) => { S.hl.material.opacity = i === hi ? .75 : 0; }); }
    const cctvOn = t >= 85.4 ? (t < 85.9 ? .5 : 1) : 0; cctvL.intensity = 11 * cctvOn * (.92 + .08 * Math.sin(t * 17)); cctvG.material.opacity = .7 * cctvOn;
    const h = W.heroAt(t), mode = h.mode; let f;
    const alt = Math.floor(t * 1.4) % 2, blink = Math.floor(t * 9) % 31 === 3;
    if (mode === 'walk') f = ['w0', 'w1', 'w2', 'w3'][Math.floor(h.dist / .28) % 4];
    else if (mode === 'run') f = ['r0', 'r1', 'r2', 'r3'][Math.floor(h.dist / .42) % 4];
    else if (mode === 'aim') f = alt ? 'aim1' : 'aim0';
    else if (mode === 'check') f = Math.floor(t * 7) % 2 ? 'chk1' : 'chk0';
    else if (mode === 'sit') f = (t >= 117 ? 'sit0' : (alt ? 'sit1' : 'sit0'));
    else if (mode === 'freeze') f = 'frz';
    else f = blink ? 'blink' : (alt ? 'idle1' : 'idle0');
    guard.root.position.set(h.x, h.y, h.z); guard.frame(f); guard.face(cam, h.flip);
    const lvl0 = W.torchLevel(t) * (mode === 'sit' ? 0 : 1), fl = 1 + ((t > 62 && t < 70.7) || (t > 76 && t < 82) ? .12 * Math.sin(t * 31) : 0) * (lvl0 > 0 ? 1 : 0);
    const lvl = lvl0 * fl, tip = guard.tipPos(f, h.flip), dx = h.flip ? -1 : 1;
    const tgt = new THREE.Vector3(tip.x + dx * 3.2, tip.y - 1.15, tip.z + .2);
    if (t > 43.9 && t < 52 && mode === 'aim') { const ci = Math.max(0, W.COUNT1.filter(c => t >= c).length - 1); tgt.set(11.0 + ci * .72, W.floorY(1) + 1.0, -6.4); }
    if (mode === 'check') tgt.set(tip.x + dx * 2.2, tip.y - .6, tip.z - 1.6);
    spot.position.copy(tip); spot.target.position.copy(tgt); spot.intensity = 64 * lvl;
    const toCam = cam.position.clone().sub(tip).setY(0).normalize().multiplyScalar(.45);
    lant.position.copy(tip).add(toCam); lant.intensity = 2.6 * lvl * flick(t, 9); tipGlow.position.copy(tip); tipGlow.material.opacity = .85 * lvl;
    fill.position.set(h.x + .5, h.y + 1.7, h.z + 2.4); fill.intensity = mode === 'sit' ? 0 : 3.2;
    hero.pos.set(h.x, h.y + .85, h.z); hero.mode = mode;
    return hero;
  }
  A.update = update; A.setFount = v => { fountPower = v; };
  return A;
}
const XW = () => W.XW;
