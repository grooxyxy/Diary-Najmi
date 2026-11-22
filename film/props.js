// Properti dunia Banda: atap rumbia, lapak, rumah panggung, perahu layar tanja, tumpukan karung, nampan pala, pohon, gunung api, awan.
import * as THREE from 'three';
import { PX, ramp, hex, h2, fbm, texOf, woodPlanks, billboard, glow, blob, mulberry } from '../vendor/px.js';
import { mat, mesh, box, mats } from '../vendor/kit.js';
import { particles } from '../vendor/fx.js';

// —— tekstur ——
export function thatchTex(seed = 3, cols) {
  const P = new PX(96, 96), R = ramp(cols ?? ['#2a1e10', '#4a3518', '#6e5424', '#92763a', '#b59a58']);
  P.fill((x, y) => {
    const row = Math.floor(y / 4), yy = y % 4, off = h2(row, 0, seed) * 20 | 0;
    let v = .5 + (h2(Math.floor((x + off) / 3), row, seed) - .5) * .4 + (fbm(x * .2, y * .5, seed) - .5) * .35;
    if (yy === 3) v -= .28; if (yy === 0) v += .1;
    if ((x + off) % 9 === 0) v -= .15;
    return R(v, x, y);
  });
  return P.done();
}
export function bambooTex(seed = 2, cols) {
  const P = new PX(96, 96), R = ramp(cols ?? ['#3a3414', '#6a5f22', '#9a8c38', '#c4b560', '#e0d38a']);
  P.fill((x, y) => { const sl = x % 6; let v = .55 + (h2(Math.floor(x / 6), 0, seed) - .5) * .25; if (sl === 0) v = .12; else if (sl === 1) v += .15; else if (sl === 5) v -= .15; if (y % 24 === 0 || y % 24 === 1) v -= .2; return R(v + (fbm(x * .3, y * .1, seed) - .5) * .2, x, y); });
  return P.done();
}
export function burlapTex(seed = 5, cols) {
  const P = new PX(32, 32), R = ramp(cols ?? ['#5a4528', '#86693c', '#b08f58', '#d3b57c']);
  P.fill((x, y) => { let v = .55 + (h2(x >> 1, y >> 1, seed) - .5) * .3 + ((x + y) % 3 === 0 ? .12 : 0) + (fbm(x * .3, y * .3, seed) - .5) * .3; return R(v, x, y); });
  return P.done();
}
export function clothTex(a, b, seed = 4, kind = 'stripe') {
  const P = new PX(32, 32), R = ramp([a, b]);
  P.fill((x, y) => { let v = kind === 'stripe' ? (x % 8 < 4 ? .2 : .85) : kind === 'check' ? ((x >> 2) + (y >> 2)) % 2 ? .25 : .8 : .5 + (fbm(x * .2, y * .2, seed) - .5) * .8; v += (h2(x, y, seed) - .5) * .12; return R(v, x, y); });
  return P.done();
}
// tumpukan biji / jaring fuli / buah
export function pileTex(kind, seed = 1) {
  const P = new PX(48, 48);
  const S = kind === 'pala' ? ramp(['#2a1608', '#4a2a12', '#6e4220', '#946034', '#b88650']) : kind === 'fuli' ? ramp(['#7a1a0c', '#b8341a', '#e0561f', '#ff8a3a', '#ffc06a']) : kind === 'buah' ? ramp(['#6a5a10', '#a08c1c', '#d0b830', '#eadc58']) : kind === 'rice' ? ramp(['#8a7a5c', '#b8a880', '#dcd0ac', '#f4ecd0']) : ramp(['#4a2a1a', '#7a4a2a', '#a8703c', '#d0a068']);
  P.fill((x, y) => {
    let v = .5 + (h2(x >> 1, y >> 1, seed) - .5) * .7 + (fbm(x * .3, y * .3, seed) - .5) * .2;
    if (kind === 'pala' && (x % 4 === 1 && y % 3 === 1)) v += .35;          // pantulan biji
    if (kind === 'fuli' && ((x + y * 2) % 5 === 0)) v += .3;                 // helai
    if (kind === 'rice' && h2(x, y, seed + 9) > .7) v += .3;
    return S(v, x, y);
  });
  return P.done();
}
const _m = {};
export const M = k => _m[k] ??= ({
  thatch: () => mat(thatchTex(3)), thatchGreen: () => mat(thatchTex(8, ['#14261a', '#243f26', '#3a5e32', '#5a8444', '#7ea45a'])), bamboo: () => mat(bambooTex(2)), bambooDark: () => mat(bambooTex(7, ['#241e0a', '#463c14', '#6a5a24', '#907c3a', '#b49c58'])),
  burlap: () => mat(burlapTex(5)), plank: () => mats().plank, plankDark: () => mats().plankDark, beam: () => mats().beam,
  pala: () => mat(pileTex('pala', 3)), fuli: () => mat(pileTex('fuli', 5)), buah: () => mat(pileTex('buah', 7)), rice: () => mat(pileTex('rice', 2)),
  sail: () => mat(clothTex('#a89870', '#d8c898', 3, 'stripe'), {}),
  sand: () => mat(sandTex(), { rough: 1 }), earth: () => mat(earthTex(), { rough: 1 }), cloth1: () => mat(clothTex('#8a2a22', '#d8a040', 1, 'stripe')), cloth2: () => mat(clothTex('#1c3a6a', '#d8d0b0', 2, 'check')), cloth3: () => mat(clothTex('#2a6a4a', '#e0c070', 3, 'stripe')),
  hull: () => mat(woodPlanks(96, 96, { pw: 4, len: 96, seed: 21, cols: ['#1e140e', '#3a2616', '#5c3c22', '#7c5530', '#9a6e3e'] })),
  hullDark: () => mat(woodPlanks(96, 96, { pw: 4, len: 96, seed: 22, cols: ['#150d0a', '#281a10', '#402a18', '#5a3b22', '#74502e'] })),
  deck: () => mat(woodPlanks(96, 96, { pw: 5, len: 96, seed: 8, cols: ['#2a1c10', '#4a3220', '#6e4e30', '#907040', '#b09050'] })),
  rock: () => null,
})[k]();

export function sandTex() {
  const P = new PX(128, 128), S = ramp(['#6a5838', '#8a7650', '#a8925e', '#c4ae7c', '#dac896'], .3);
  P.fill((x, y) => { let v = .55 + (fbm(x * .08, y * .08, 4) - .5) * .6 + (h2(x, y, 3) - .5) * .25; if (h2(x, y, 8) > .985) v -= .35; return S(v, x, y); }); return P.done();
}
export function earthTex() {
  const P = new PX(128, 128), D = ramp(['#2a1e12', '#4a3520', '#6e5230', '#8e6e44', '#a88858']), G = ramp(['#1a2c18', '#2c4a26', '#456e36', '#648e48']);
  P.fill((x, y) => { const n = fbm(x * .05, y * .05, 9), m = n + (fbm(x * .2, y * .2, 3) - .5) * .4; if (m > .72) return G(.3 + fbm(x * .3, y * .3, 2) * .6, x, y); let v = .5 + (fbm(x * .12, y * .12, 5) - .5) * .35 + (h2(x, y, 6) - .5) * .15; if (h2(x, y, 7) > .985) v += .2; return D(v, x, y); }); return P.done();
}

// —— karung ——
export function sackMesh(s = .7, tone = '#ffffff') {
  const g = new THREE.BoxGeometry(s * .72, s, s * .5, 3, 4, 3), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) / s, k = 1 - .18 * Math.pow(Math.abs(y * 2), 3) * (y > 0 ? 1 : .3); p.setX(i, p.getX(i) * (1 + .1 * (1 - Math.abs(y * 2)))); p.setZ(i, p.getZ(i) * (1 + .12 * (1 - Math.abs(y * 2)))); if (y > .35) { p.setX(i, p.getX(i) * .55); p.setZ(i, p.getZ(i) * .55); } }
  g.translate(0, s / 2, 0);
  const m = mesh(g, M('burlap'), {}); if (tone !== '#ffffff') m.material = m.material.clone(), m.material.color.set(tone);
  return m;
}
export function sackStack(rows = [3, 2, 1], s = .7, seed = 1, tone) {
  const g = new THREE.Group(), R = mulberry(seed);
  rows.forEach((n, j) => { for (let i = 0; i < n; i++) { const m = sackMesh(s * (.92 + R() * .16), tone); m.position.set((i - (n - 1) / 2) * s * .78 + (R() - .5) * .05, j * s * .72, (R() - .5) * .12); m.rotation.y = (R() - .5) * .5; g.add(m); } });
  return g;
}
export function clothBolts(n = 4, seed = 2) {   // gulungan kain
  const g = new THREE.Group(), R = mulberry(seed), ms = [M('cloth1'), M('cloth2'), M('cloth3')];
  for (let i = 0; i < n; i++) { const c = mesh(new THREE.CylinderGeometry(.16, .16, .9, 10).rotateZ(Math.PI / 2).translate(0, .16, 0), ms[i % 3]); c.position.set((i % 2) * .05, Math.floor(i / 2) * .3, (i % 2) * .34 - .17 + Math.floor(i / 2) * .02); c.rotation.y = (R() - .5) * .15; g.add(c); }
  return g;
}
export function jars(n = 3, seed = 3) {         // keramik
  const g = new THREE.Group(), R = mulberry(seed), m = mat((() => { const P = new PX(24, 24), C = ramp(['#1a3a44', '#2a6a70', '#4aa09a', '#8ad0c0']); P.fill((x, y) => C(.5 + (h2(x >> 1, y, 4) - .5) * .3 + (y % 8 < 2 ? .3 : 0), x, y)); return P.done(); })());
  for (let i = 0; i < n; i++) { const pts = [[.0, 0], [.2, .02], [.3, .2], [.28, .4], [.18, .52], [.12, .62], [.15, .68]].map(([r, y]) => new THREE.Vector2(r, y)); const j = mesh(new THREE.LatheGeometry(pts, 12), m); j.scale.setScalar(.7 + R() * .4); j.position.set(i * .5 - n * .25, 0, (R() - .5) * .2); g.add(j); }
  return g;
}
// nampan anyaman (nyiru) berisi tumpukan
export function tray(kind = 'pala', r = .5, h = .12) {
  const g = new THREE.Group();
  const wov = mat((() => { const P = new PX(32, 32), C = ramp(['#4a3a18', '#7a6228', '#a8883c', '#d2b45a']); P.fill((x, y) => C(.5 + (((x >> 1) + (y >> 1)) % 2 ? .22 : -.18) + (h2(x, y, 3) - .5) * .12, x, y)); return P.done(); })());
  const rim = mesh(new THREE.CylinderGeometry(r, r * .88, h, 14, 1, true), wov); rim.material.side = THREE.DoubleSide; g.add(rim);
  const base = mesh(new THREE.CylinderGeometry(r * .9, r * .88, .02, 14), wov); base.position.y = .01; g.add(base);
  const pile = mesh(new THREE.SphereGeometry(r * .93, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, .32, 1), M(kind)); pile.position.y = h * .6; g.add(pile);
  return g;
}

// —— lapak pasar ——
export function stall(o = {}) {
  const g = new THREE.Group(), w = o.w ?? 4.2, d = o.d ?? 2.6, hF = o.hF ?? 2.3, hB = o.hB ?? 2.9;
  // tiang bambu
  for (const [x, z, hh] of [[-w / 2, d / 2, hF], [w / 2, d / 2, hF], [-w / 2, -d / 2, hB], [w / 2, -d / 2, hB]]) { const p = mesh(new THREE.CylinderGeometry(.07, .09, hh, 8).translate(x, hh / 2, z), M('bamboo')); g.add(p); }
  // atap miring ke belakang (daun rumbia)
  const sl = Math.hypot(d + .8, hB - hF), roof = mesh(new THREE.BoxGeometry(w + .9, .16, sl), M(o.roofGreen ? 'thatchGreen' : 'thatch')); roof.position.set(0, (hF + hB) / 2 + .08, 0); roof.rotation.x = Math.atan2(hB - hF, d + .8); g.add(roof);
  const fringe = mesh(new THREE.BoxGeometry(w + .9, .3, .12), M('thatch')); fringe.position.set(0, hF - .05, d / 2 + .38); fringe.rotation.x = .1; g.add(fringe);
  // dinding belakang (anyaman bambu)
  const back = mesh(new THREE.BoxGeometry(w, hB - .3, .08).translate(0, (hB - .3) / 2 + .1, -d / 2 + .02), M('bambooDark')); g.add(back);
  // meja depan + rak
  const table = mesh(new THREE.BoxGeometry(w - .4, .1, .9), M('plank')); table.position.set(0, .86, d / 2 - .85); g.add(table);
  const front = mesh(new THREE.BoxGeometry(w - .4, .84, .08), M('plankDark')); front.position.set(0, .42, d / 2 - .4); g.add(front);
  const shelf = mesh(new THREE.BoxGeometry(w - .5, .08, .5), M('plank')); shelf.position.set(0, 1.5, -d / 2 + .4); g.add(shelf);
  // kain penanda warna di tepi atap
  if (o.banner) { const b = new THREE.Mesh(new THREE.PlaneGeometry(1.2, .45), o.banner); b.position.set(0, hF - .5, d / 2 + .34); b.castShadow = true; g.add(b); }
  g.userData = { w, d, hF, hB, tableY: .91, tableZ: d / 2 - .85 };
  return g;
}

// —— rumah panggung ——
export function hut(o = {}) {
  const g = new THREE.Group(), w = o.w ?? 4.4, d = o.d ?? 3.6, h = o.h ?? 2.2, sh = o.stilt ?? .9;
  for (const [x, z] of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2], [0, -d / 2], [0, d / 2]]) g.add(mesh(new THREE.CylinderGeometry(.1, .12, sh + .15, 7).translate(x, (sh - .15) / 2, z), M('beam')));
  const floor = mesh(new THREE.BoxGeometry(w + .5, .14, d + .5), M('plank')); floor.position.y = sh; g.add(floor);
  const walls = mesh(new THREE.BoxGeometry(w, h, d), M(o.wall ?? 'bamboo')); walls.position.y = sh + .07 + h / 2; g.add(walls);
  // atap pelana rumbia
  const rh = o.rh ?? 1.7, sl = Math.hypot(d / 2 + .5, rh), ang = Math.atan2(rh, d / 2 + .5);
  for (const s of [-1, 1]) { const r = mesh(new THREE.BoxGeometry(w + 1.1, .18, sl), M(o.roof ?? 'thatch')); r.rotation.x = s * ang; r.position.set(0, sh + h + rh / 2 + .1, s * (d / 4 + .25)); g.add(r); }
  const tri = new THREE.Shape([new THREE.Vector2(-d / 2, 0), new THREE.Vector2(d / 2, 0), new THREE.Vector2(0, rh)]);
  for (const s of [-1, 1]) { const tg = new THREE.ShapeGeometry(tri); tg.rotateY(Math.PI / 2 * s); tg.translate(s * w / 2, sh + h + .07, 0); g.add(mesh(tg, M('bambooDark'))); }
  // pintu gelap + tangga + jendela menyala
  const door = new THREE.Mesh(new THREE.PlaneGeometry(.9, 1.5), new THREE.MeshStandardMaterial({ color: '#150e08', roughness: 1 })); door.position.set(o.door ?? .8, sh + .07 + .75, d / 2 + .02); g.add(door);
  const win = new THREE.Mesh(new THREE.PlaneGeometry(.8, .6), new THREE.MeshStandardMaterial({ color: '#2a1a0c', emissive: '#ffb050', emissiveIntensity: 0 })); win.position.set(-w * .22, sh + 1.3, d / 2 + .02); g.add(win);
  const steps = mesh(new THREE.BoxGeometry(.9, .1, .9), M('plank')); steps.position.set(o.door ?? .8, sh * .5, d / 2 + .6); g.add(steps);
  g.userData.win = win; return g;
}

// —— perahu layar tanja ——
export function prau(o = {}) {
  const g = new THREE.Group(), L = o.len ?? 12, B = o.beam ?? 3.0, H = o.h ?? 1.2;
  // lambung: bentuk daun dengan haluan & buritan terangkat (dibangun dari penampang yang membesar)
  const N = 14, hull = new THREE.BufferGeometry(), pos = [], idx = [];
  const prof = u => { const w = Math.sin(Math.PI * Math.pow(u, .85)) * .5 + .02 * (1 - u), lift = Math.pow(Math.abs(u * 2 - 1), 3) * .85; return [w * B, lift]; };
  for (let i = 0; i <= N; i++) { const u = i / N, z = (u - .5) * L, [w, lift] = prof(u); [[-w, H + lift], [-w * .78, 0], [0, -.35], [w * .78, 0], [w, H + lift]].forEach(([x, y]) => pos.push(x, y, z)); }
  for (let i = 0; i < N; i++) for (let j = 0; j < 4; j++) { const a = i * 5 + j, b = a + 5; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  hull.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); hull.setIndex(idx);
  const hm = mesh(hull, M('hull')); hm.material.side = THREE.DoubleSide; g.add(hm);
  // geladak
  const deck = mesh(new THREE.BoxGeometry(B * .86, .08, L * .72), M('deck')); deck.position.y = H * .82; g.add(deck);
  // pagar rendah + papan sisi
  for (const s of [-1, 1]) { const r = mesh(new THREE.BoxGeometry(.08, .22, L * .74), M('hullDark')); r.position.set(s * B * .43, H * .9, 0); g.add(r); }
  // tiang + layar tanja (persegi miring)
  const mast = mesh(new THREE.CylinderGeometry(.08, .13, 8.5, 8).translate(0, 4.25, 0), M('beam')); mast.position.set(0, H * .8, L * .08); g.add(mast);
  const yard = mesh(new THREE.CylinderGeometry(.05, .05, 6.2, 6).rotateZ(Math.PI / 2 - .12).translate(0, 0, 0), M('beam')); yard.position.set(0, H * .8 + 7.4, L * .08); g.add(yard);
  const SAIL = new THREE.PlaneGeometry(5.4, 5.6, 10, 8); SAIL.translate(0, -2.9, 0);
  const sail = new THREE.Mesh(SAIL, new THREE.MeshStandardMaterial({ map: M('sail').map, side: THREE.DoubleSide, roughness: 1 })); sail.castShadow = sail.receiveShadow = true; sail.position.set(0, H * .8 + 7.35, L * .08 + .05); sail.rotation.y = o.sailYaw ?? .25; g.add(sail);
  g.userData.sail = sail; g.userData.sailBase = Float32Array.from(SAIL.attributes.position.array);
  // kabin rumbia di buritan
  const cab = mesh(new THREE.BoxGeometry(B * .66, 1.1, 2.6), M('bambooDark')); cab.position.set(0, H * .82 + .6, -L * .3); g.add(cab);
  for (const s of [-1, 1]) { const r = mesh(new THREE.BoxGeometry(B * .78, .14, 2.1), M('thatch')); r.rotation.z = s * .55; r.position.set(s * B * .14, H * .82 + 1.35, -L * .3); g.add(r); }
  // lentera haluan
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(.2, .26, .2), new THREE.MeshStandardMaterial({ color: '#2a2016', emissive: '#ffb45a', emissiveIntensity: 0 })); lamp.position.set(0, H + .75, L * .4); g.add(lamp);
  const lg = glow('#ffb25e', 1.5, 1); lg.position.copy(lamp.position); g.add(lg);
  g.userData.lamp = lamp; g.userData.lampGlow = lg; g.userData.H = H; g.userData.L = L; g.userData.B = B; g.userData.deckY = H * .82 + .04;
  return g;
}
export function animateSail(g, t, wind = 1, ph = 0) {
  const s = g.userData.sail; if (!s) return; const p = s.geometry.attributes.position, b = g.userData.sailBase;
  for (let i = 0; i < p.count; i++) { const x = b[i * 3], y = b[i * 3 + 1]; const k = Math.min(1, -y / 5.6 + .1); p.setZ(i, Math.sin(x * .7 + t * (1.2 + wind) + ph) * .1 * wind * k + Math.sin(-y * .9 - t * 1.3) * .05 * wind + .35 * Math.sin((x / 5.4 + .5) * Math.PI) * (.6 + .4 * Math.min(1, wind)) * k); }
  p.needsUpdate = true; s.geometry.computeVertexNormals();
}
export function sampan(o = {}) {   // perahu kecil
  const g = new THREE.Group(), L = o.len ?? 4.4, B = o.beam ?? 1.1;
  const sh = new THREE.Shape(); sh.moveTo(-L / 2, 0); sh.quadraticCurveTo(0, -B * .9, L / 2, 0); sh.quadraticCurveTo(0, B * .6, -L / 2, 0);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: .45, bevelEnabled: false }); geo.rotateX(Math.PI / 2); geo.translate(0, .3, 0);
  g.add(mesh(geo, M('hull')));
  for (const z of [-B * .28, B * .28]) { const r = mesh(new THREE.BoxGeometry(L * .92, .05, .06), M('hullDark')); r.position.set(0, .31, z); g.add(r); }
  const bar = mesh(new THREE.CylinderGeometry(.04, .04, B * 3.2, 5).rotateX(Math.PI / 2), M('bamboo')); bar.position.set(-L * .18, .45, 0); g.add(bar);
  return g;
}

// —— pohon (billboard piksel) ——
function palmSprite(seed = 1) {
  const R = mulberry(seed), W = 96, H = 128, P = new PX(W, H), cx = 44, topY = 40;
  const trunk = ramp(['#2a1c10', '#4a3420', '#6e5030', '#8e6c42'], .3), leaf = ramp(['#10261a', '#1c4426', '#2e6a34', '#4c9444', '#7ac060'], .3);
  const bend = (R() - .5) * 10;
  for (let y = H - 2; y > topY; y--) { const u = (H - y) / (H - topY), x = cx + bend * u * u, w = 3.2 - u * 1.2; for (let xx = Math.floor(x - w); xx <= x + w; xx++) { const s = (xx - (x - w)) / (2 * w); P.set(xx, y, trunk(.7 - s * .5 + (y % 5 === 0 ? -.2 : 0), xx, y)); } }
  const tx = cx + bend, ty = topY;
  const nF = 9;
  for (let f = 0; f < nF; f++) {
    const a = -Math.PI + (f / (nF - 1)) * Math.PI + (R() - .5) * .25, len = 30 + R() * 12, droop = .55 + R() * .35;
    let px = tx, py = ty;
    for (let s = 0; s < len; s++) {
      const u = s / len, ang = a, nx = Math.cos(ang) * s, ny = Math.sin(ang) * s * .7 + droop * u * u * len * .9 + (a < -2.4 || a > -.7 ? 0 : -3 * Math.sin(u * 3));
      px = tx + nx; py = ty + ny;
      P.set(px, py, leaf(.62 + (R() - .5) * .15 - u * .2, px, py)); P.set(px, py - 1, leaf(.78, px, py));
      if (s % 2 === 0 && u > .12) { const l = (1 - u) * 7 + 2; for (let k = 1; k < l; k++) { P.set(px - Math.sin(ang) * 0 + k * (a < -Math.PI / 2 ? -1 : 1) * .0, py + k, leaf(.4 + (1 - k / l) * .3, px, py + k)); P.set(px, py - k * .6, leaf(.55 + (1 - k / l) * .25, px, py - k)); } }
    }
  }
  for (let i = 0; i < 4; i++) P.ellipse(tx + (R() - .5) * 4 + 2, ty + 2 + R() * 3, 1.8, 1.8, trunk(.4, 0, 0));   // kelapa
  P.outline(.35, [10, 14, 10]); return P.done();
}
function pohonPalaSprite(seed = 1) {
  const R = mulberry(seed), W = 128, H = 128, P = new PX(W, H), leaf = ramp(['#0c1c12', '#16301c', '#244a26', '#376a34', '#548c46'], .3), tr = ramp(['#1e140c', '#3a2818', '#5a3e24'], .3);
  for (let y = 70; y < H - 2; y++) { const w = 3 + (y - 70) * .02; for (let x = 64 - w; x <= 64 + w; x++) P.set(x, y, tr(.7 - (x - 64 + w) / (2 * w) * .5 + (y % 6 === 0 ? -.15 : 0), x, y)); }
  const blobs = [[64, 42, 30, 26], [44, 54, 22, 18], [86, 54, 22, 18], [64, 62, 26, 16], [34, 44, 14, 12], [96, 42, 14, 12], [64, 20, 20, 14]];
  for (const [bx, by, rx, ry] of blobs) P.ellipse(bx, by, rx, ry, (x, y, dx, dy) => { const n = fbm(x * .18, y * .18, seed) - .5; let v = .62 - dy * .35 - dx * .12 + n * .55; if (h2(x, y, 4) > .93) v += .22; return leaf(v, x, y); });
  for (let i = 0; i < 16; i++) { const x = 38 + R() * 54 | 0, y = 36 + R() * 30 | 0; if (P.get(x, y)) { P.set(x, y, hex('#e8c840')); P.set(x + 1, y, hex('#c8a428')); P.set(x, y + 1, hex('#e8c840')); } }
  P.outline(.35, [8, 14, 10]); return P.done();
}
export function treeSprite(kind, seed, hM) {
  const cv = kind === 'palm' ? palmSprite(seed) : pohonPalaSprite(seed), tex = texOf(cv), asp = cv.width / cv.height;
  const b = billboard(tex, hM * asp, hM, { shadow: true, receive: false, color: '#ffffff' }); b.userData.tree = true; return b;
}

// —— gunung api ——
export function volcano(seed = 3) {
  const g = new THREE.Group();
  const P = new PX(128, 128), R = ramp(['#14201a', '#243a2a', '#3a5a3a', '#5a7a48', '#7a8a58', '#6a5a48', '#4a3e38', '#8a7e74', '#a89a8c'], .3);
  P.fill((x, y) => { const u = y / 128 /* 0 = puncak */, n = fbm(x * .07, y * .06, seed, 4); let v = u > .22 ? .18 + (1 - u) * .0 + (u - .22) * .6 + n * .22 : .78 - n * .22 + (u < .06 ? .12 : 0); if (u > .22 && u < .7) v = .3 + n * .45 + (u - .22) * .5; const r = Math.abs(fbm(x * .03, y * .01, seed + 5, 3) - .5); if (r < .02 && u > .1) v -= .2; return R(Math.min(.99, v), x, y); });
  const cone = new THREE.CylinderGeometry(5, 120, 78, 26, 10, true); const pos = cone.attributes.position;
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), k = 1 + (h2(Math.round(x * .1), Math.round(z * .1), seed) - .5) * .12 * (y < 30 ? 1 : .3); pos.setX(i, x * k); pos.setZ(i, z * k); }
  cone.translate(0, 39, 0);
  const m = new THREE.Mesh(cone, new THREE.MeshStandardMaterial({ map: texOf(P.done(), { repeat: [3, 1] }), roughness: 1, side: THREE.DoubleSide })); m.castShadow = false; g.add(m);
  const smoke = particles(46, (i, t, o) => { const ph = ((t * .035 + h2(i, 1)) % 1), up = ph * 60; o.x = Math.sin(ph * 5 + i) * 3 + ph * 22 * (1 + h2(i, 2) * .3); o.y = 78 + up; o.z = (h2(i, 3) - .5) * 6; o.a = Math.sin(ph * Math.PI) * .45; o.s = 8 + ph * 26; o.r = .82; o.g = .8; o.b = .8; }, { soft: 1, blend: THREE.NormalBlending });
  g.add(smoke); g.userData.smoke = smoke;
  return g;
}

// —— awan (billboard piksel) ——
export function cloudSprite(seed) {
  const W = 128, H = 48, P = new PX(W, H), C = ramp(['#8a90a8', '#b8bccd', '#dfe2ec', '#ffffff'], .3);
  P.fill((x, y) => { const dx = (x - W / 2) / (W / 2), dy = (y - H * .55) / (H * .45); const n = fbm(x * .09, y * .12, seed, 4); const d = dx * dx * 1.05 + dy * dy * (dy > 0 ? 3 : 1) - n * .9 + .25; if (d > .55) return null; return C(.82 - dy * .35 + (n - .5) * .5 - Math.max(0, d) * .4, x, y); });
  return P.done();
}
