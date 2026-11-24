// Dunia film: satu diorama kota di balik gerbang. Cahaya (matahari/bulan, kabut, lampu, jendela) dipandu parameter "TOD" per frame.
// Koordinat: gerbang di x=0,z=0; luar kota = +z (utara), kamera biasanya di +z melihat ke -z. Jalan barat sepanjang x (antrean), jalan utara sepanjang +z.
import * as THREE from 'three';
import { PX, PPM, ramp, hex, h2, fbm, texOf, cobbles, rock, woodPlanks, shingles, ground, billboard, glow, blob, mulberry, mixc } from './px.js';
import { mat, mesh, box, mats, house, fire, ridge } from './kit.js';
import { sky, stars, particles, flick, sea } from './fx.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const GATE = { w: 4.4, h: 5.0 };

// ---------- tekstur kecil buatan sendiri ----------
function texBoard(kind) {   // papan aturan / pajak: ikon pixel
  const W = 64, H = 52, P = new PX(W, H), WD = ramp(['#2a1a10', '#4a2e1a', '#6e4826', '#8c6034'], .3);
  P.fill((x, y) => { const e = x < 2 || y < 2 || x > W - 3 || y > H - 3; return WD(e ? .15 : .55 + (h2(x >> 3, y, 3) - .5) * .3 - (y % 13 === 0 ? .2 : 0), x, y); });
  const ink = hex('#1a1016'), cream = hex('#e8dcb8'), gray = hex('#b8b0a0');
  const bars = (x, y, n) => { for (let i = 0; i < n; i++) P.rect(x + i * 6, y, 4, 1, gray); P.rect(x, y + 3, Math.max(4, n * 5), 1, gray); };
  const rom = (x, y, n) => { for (let i = 0; i < n; i++) P.rect(x + i * 3, y, 1, 7, cream); };
  if (kind === 'rules') {
    for (let r = 0; r < 3; r++) { const y = 5 + r * 12; rom(5, y, r + 1); bars(22, y + 1, 5);
      const ix = 52; if (r === 0) { P.rect(ix, y + 2, 3, 5, hex('#ff9a2a')); P.rect(ix + 1, y, 1, 3, hex('#ffd35a')); for (let k = -4; k <= 4; k++) { P.set(ix + 1 + k, y + 3 + k, hex('#d83a2a')); P.set(ix + 1 - k, y + 3 + k, hex('#d83a2a')); } }
      if (r === 1) { P.line(ix - 3, y + 7, ix + 4, y, hex('#c4cad8')); P.rect(ix - 2, y + 4, 8, 1, hex('#7a5a30')); P.rect(ix - 2, y + 2, 8, 1, hex('#7a5a30')); }
      if (r === 2) { P.rect(ix - 2, y + 2, 8, 5, hex('#e6c26a')); P.rect(ix, y, 4, 2, hex('#b88c3e')); P.set(ix + 2, y + 7, hex('#7a5a24')); } }
    for (let x = 5; x < 58; x += 4) P.set(x, 43, hex('#4a2e1a')); P.rect(5, 45, 40, 2, hex('#3a2416')); P.rect(5, 41, 2, 1, hex('#3a2416'));   // baris keempat: kosong
  } else { rom(5, 6, 1); bars(16, 7, 6); for (let i = 0; i < 3; i++) { P.ellipse(12 + i * 14, 28, 5, 5, hex('#d8b04a')); P.ellipse(12 + i * 14, 28, 3, 3, hex('#e6c26a')); P.rect(12 + i * 14 - 1, 26, 2, 4, hex('#a8802a')); } bars(8, 40, 8); }
  return P.done();
}
function texField(seed) {
  const P = new PX(96, 96), R = ramp(['#4a3a1c', '#7a6428', '#b0943c', '#d8bc58', '#ecd890'], .4);
  P.fill((x, y) => { const row = (x % 8) < 2; let v = .55 + (h2(x >> 1, y >> 1, seed) - .5) * .4 - (row ? .22 : 0) + (fbm(x * .08, y * .08, seed) - .5) * .3; return R(v, x, y); }); return P.done();
}
function texCanopy(seed, kind) {
  const W = 72, H = kind === 'pine' ? 96 : 64, P = new PX(W, H), G = ramp(kind === 'pine' ? ['#0e2018', '#173a26', '#256038', '#3a8448', '#62a85a'] : ['#16301a', '#26501f', '#3c7a2c', '#5ea03e', '#8cc45a'], .3);
  if (kind === 'pine') { for (let l = 0; l < 4; l++) { const y0 = 4 + l * 20, hw = 10 + l * 7; for (let y = 0; y < 26; y++) { const w = hw * y / 26; for (let x = Math.round(W / 2 - w); x <= W / 2 + w; x++) P.set(x, y0 + y, G(.35 + (x - W / 2 + w) / (2 * w + 1) * -.4 + .45 - y / 60 + (h2(x, y0 + y, seed) - .5) * .3, x, y0 + y)); } } }
  else { for (let k = 0; k < 7; k++) { const cx = W * (.28 + h2(k, 1, seed) * .44), cy = H * (.3 + h2(k, 2, seed) * .4), r = 12 + h2(k, 3, seed) * 7; P.ellipse(cx, cy, r, r * .85, (x, y, dx, dy) => G(.62 - dy * .35 - dx * .18 + (h2(x, y, seed) - .5) * .35, x, y)); } }
  P.outline(.35, [10, 24, 16]); return P.done();
}
function texSign(w, h, col, seed) { const P = new PX(w, h), R = ramp(col, .3); P.fill((x, y) => R(.5 + (h2(x, y >> 1, seed) - .5) * .5, x, y)); return P.done(); }

export function buildWorld(Q) {
  const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2('#8aa0b8', .01);
  const R = mulberry(77), M = mats();
  const SK = sky(); scene.add(SK.mesh);
  const ST = stars(260, 11); scene.add(ST);

  // ---------- cahaya ----------
  const sun = new THREE.DirectionalLight('#ffffff', 1); sun.castShadow = true; sun.shadow.mapSize.set(+(Q.get('sm') || 2048), +(Q.get('sm') || 2048));
  Object.assign(sun.shadow.camera, { left: -46, right: 46, top: 40, bottom: -40, near: 1, far: 140 }); sun.shadow.bias = -.0006; sun.shadow.normalBias = .03; scene.add(sun, sun.target); sun.target.position.set(0, 0, 6);
  const hemi = new THREE.HemisphereLight('#aabbd8', '#34301c', 1); scene.add(hemi);
  const fill = new THREE.DirectionalLight('#ffffff', .5); scene.add(fill, fill.target);
  const mkPL = (col, shadow, size) => { const l = new THREE.PointLight(col, 0, 14, 2); l.shadow.bias = -.004; l.shadow.camera.near = .08; if (shadow) { l.castShadow = true; l.shadow.mapSize.set(size, size); } scene.add(l); return l; };
  const lHero = mkPL('#ffb050', true, 512), lPost = mkPL('#ffb458', true, 512), lA = mkPL('#ffa848', false), lB = mkPL('#ffa848', false);
  const lFill = new THREE.PointLight('#a8bce8', 0, 9, 2); scene.add(lFill);

  // ---------- tanah, jalan, ladang ----------
  const gnd = mesh(new THREE.BoxGeometry(520, .4, 520).translate(0, -.2, 40), mat(ground(192, 192, { seed: 5, grass: ['#1c3018', '#2c4a22', '#44683a', '#648a4c', '#86a860'], dirt: ['#3a2c1c', '#5a4630', '#7a6444', '#9a8458'], mask: () => .78 })), { cast: false });
  scene.add(gnd);
  const roadM = mat(cobbles(96, 96, { seed: 4, cell: 8, cols: ['#2c2418', '#4a3c28', '#6a5a40', '#8a7858', '#a89572'] })), stoneM = mat(cobbles(96, 96, { seed: 21, cell: 9, cols: ['#2a2c36', '#454858', '#666a78', '#8a8e9a', '#aeb2bc'] }));
  const road = (x0, x1, z0, z1, y = .03) => { const b = box(x1 - x0, y, z1 - z0, roadM, { cast: false }); b.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2); scene.add(b); return b; };
  road(-40, 12, 1.9, 7.3); road(-6.5, 6.5, 1.2, 9.5, .04); road(-2.6, 2.6, 7, 140); road(-2.2, 2.2, -40, 1.2);
  const fieldM = mat(texField(3)); [[7, 40, 14, 70], [-24, -4.5, 12, 56], [6, 30, 74, 110]].forEach(([x0, x1, z0, z1]) => { const f = box(x1 - x0, .05, z1 - z0, fieldM, { cast: false }); f.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2); scene.add(f); });
  // sungai + jembatan
  const wat = sea(520, { ppm: 8, deep: '#16324a', shallow: '#2a5a7a', crest: '#9ac8e0' }); wat.mesh.position.set(0, .01, 0); wat.mesh.scale.set(1, 1, 1);
  const stream = new THREE.Mesh(new THREE.PlaneGeometry(7, 190), wat.mesh.material); stream.rotation.x = -Math.PI / 2; stream.position.set(-30.5, .05, 50); scene.add(stream);
  const bridge = box(8.4, .5, 6.2, stoneM); bridge.position.set(-30.5, .15, 4.6); scene.add(bridge);
  for (const z of [1.7, 7.5]) { const p = box(8.4, .9, .45, stoneM); p.position.set(-30.5, .55, z); scene.add(p); }

  // ---------- tembok, menara, gerbang ----------
  const wallH = 6.4;
  const wall = (x0, x1, z0 = -1.2, z1 = 1.2) => { const b = box(x1 - x0, wallH, z1 - z0, stoneM); b.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2); scene.add(b); for (let x = x0 + .5; x < x1 - .4; x += 1.9) { const m = box(1, 1, z1 - z0 - .3, stoneM); m.position.set(x, wallH, (z0 + z1) / 2); scene.add(m); } };
  wall(-24, -2.2); wall(2.2, 24); wall(-24.2, -22.8, -21, -1.2); wall(22.8, 24.2, -21, -1.2);
  const tower = (x, rf) => { const t = box(3.8, 10.5, 3.8, stoneM); t.position.set(x, 0, .4); scene.add(t); const c = new THREE.ConeGeometry(3.6, 3.8, 4); c.rotateY(Math.PI / 4); c.translate(0, 1.9, 0); const r = mesh(c, M[rf]); r.position.set(x, 10.5, .4); scene.add(r); for (const s of [-1, 1]) { const tt = box(.5, 1, .5, stoneM); tt.position.set(x + s * 1.65, 10.5, 2.15); scene.add(tt); }
    const wq = new THREE.Mesh(new THREE.PlaneGeometry(.7, 1.1), new THREE.MeshStandardMaterial({ color: '#150e08', emissive: '#ffb050', emissiveIntensity: 0, roughness: 1 })); wq.position.set(x, 7.6, 2.33); scene.add(wq); return wq; };
  const towWinL = tower(-3.9, 'roof2'), towWinR = tower(3.9, 'roof');
  const lintel = box(4.6, 1.5, 2.6, stoneM); lintel.position.set(0, 5, 0); scene.add(lintel);
  for (const s of [-1, 1]) { const p = box(.5, 5, 2.4, stoneM); p.position.set(s * 2.45, 0, 0); scene.add(p); const br = box(.34, .3, .34, M.beam); br.position.set(s * 2.25, 2.1, .72); scene.add(br); }
  const doorM = mat(woodPlanks(96, 96, { pw: 8, len: 60, seed: 9, cols: ['#1a100c', '#2e1d14', '#452a1b', '#5c3a24', '#74492b'] }));
  const doors = [-1, 1].map(s => { const g = new THREE.Group(); const d = box(2.12, 4.9, .3, doorM); d.position.set(-s * 1.06, 0, 0); g.add(d); for (const y of [1, 3.6]) { const ib = box(2.12, .22, .34, M.beam); ib.position.set(-s * 1.06, y, 0); g.add(ib); } g.position.set(s * 2.2, 0, .1); scene.add(g); return g; });
  const gateDark = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 4.9), new THREE.MeshBasicMaterial({ color: '#0a0806' })); gateDark.position.set(0, 2.45, -.9); scene.add(gateDark);   // gelap di balik pintu yang terbuka
  const bar = box(5.3, .3, .3, M.beam); bar.position.set(0, 2.3, .78); scene.add(bar);
  // pintu kecil (di dasar menara kiri)
  const wick = new THREE.Group(); const wd = box(1.0, 1.9, .14, M.plankDark); wd.position.set(.5, 0, 0); wick.add(wd); wick.position.set(-4.4, 0, 2.38); scene.add(wick);
  const wickIn = new THREE.Mesh(new THREE.PlaneGeometry(1, 1.9), new THREE.MeshStandardMaterial({ color: '#120a06', emissive: '#ff9a48', emissiveIntensity: 0 })); wickIn.position.set(-3.9, .95, 2.3); scene.add(wickIn);
  // obor di gerbang
  const torches = [-1, 1].map(s => { const g = new THREE.Group(); const br = box(.14, .5, .14, M.beam); br.position.y = -.1; g.add(br); const f = fire(.8, { seed: s * 3 }); f.position.y = .2; g.add(f); const gl = glow('#ffa850', 1.3, 1); gl.position.y = .55; g.add(gl); g.position.set(s * 2.3, 3.3, 1.5); scene.add(g); return { g, f, gl }; });

  // ---------- pos jaga + papan ----------
  const postG = new THREE.Group(); postG.position.set(7.4, 0, 3.6); scene.add(postG);
  const pb = box(3.6, 2.7, 2.6, M.wall3); postG.add(pb); const rf = box(4.4, .2, 3.6, M.roof3); rf.position.set(0, 2.78, .1); rf.rotation.x = .12; postG.add(rf);
  const bench = box(1.8, .5, .5, M.plankDark); bench.position.set(-.4, 0, 1.7); postG.add(bench);
  const bt_ = texOf(texBoard('rules')), boardM = new THREE.MeshStandardMaterial({ map: bt_, emissiveMap: bt_, emissive: '#ffffff', emissiveIntensity: .35, roughness: .9 }), board = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.38), boardM); board.position.set(.2, 1.5, 1.33); board.castShadow = true; postG.add(board);
  const bposts = [-.95, 1.35].map(x => { const p = box(.12, 2.3, .12, M.beam); p.position.set(x, 0, 1.28); postG.add(p); });
  const hangL = new THREE.Group(); hangL.position.set(-1.7, 2.35, 2.2); postG.add(hangL);
  const arm = box(.1, .1, 1.1, M.beam); arm.position.set(0, .3, -.5); hangL.add(arm);
  const lampBox = new THREE.Mesh(new THREE.BoxGeometry(.3, .42, .3), new THREE.MeshStandardMaterial({ color: '#3a2a14', emissive: '#ffb050', emissiveIntensity: 1 })); lampBox.position.y = -.1; hangL.add(lampBox);
  const lampGlow = glow('#ffb050', .55, 1); lampGlow.position.y = -.05; hangL.add(lampGlow);
  const taxBoard = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.2), new THREE.MeshStandardMaterial({ map: texOf(texBoard('tax')), roughness: .9 })); taxBoard.position.set(-3.9, 2.2, 2.33); scene.add(taxBoard);
  const crateG = (x, z, s) => { const c = box(s, s, s, M.plank); c.position.set(x, 0, z); scene.add(c); return c; };
  crateG(10.4, 7.0, .8); crateG(11.2, 7.3, .6); crateG(-6.8, 2.8, .9); const brl = box(.7, .9, .7, M.plankDark); brl.position.set(-7.8, 0, 2.8); scene.add(brl);

  // ---------- kota di balik tembok ----------
  const wins = [], winMat = () => { const m = new THREE.MeshStandardMaterial({ color: '#2a2418', emissive: '#ffb050', emissiveIntensity: 0, roughness: .6 }); return m; };
  const wallKeys = ['wall', 'wall2', 'wall3'], roofKeys = ['roof', 'roof2', 'roof3'];
  function addHouse(o) { const g = house({ chimney: R() > .5, ...o }); g.userData.windows.forEach(q => { q.material = winMat(); q.material.color.set('#3a2e1c'); wins.push({ m: q.material, rank: R() }); }); scene.add(g); return g; }
  let hi = 0;
  for (let row = 0; row < 5; row++) { const z = -7.5 - row * 7.2; for (let x = -21; x < 21; x += 6.2 + R() * 1.6) {
    if (Math.abs(x) < 3.6) continue; if (Math.abs(x - 11) < 4.2 && z < -8 && z > -22) continue;
    const w = 4.6 + R() * 2.4, d = 4 + R() * 1.8, h = 4.2 + R() * 2.6 + (row === 0 ? 1.6 : 0);
    addHouse({ x: x + (R() - .5) * 1.2, z: z + (R() - .5) * 1.2, w, d, h, wall: wallKeys[hi % 3], roof: roofKeys[(hi * 2 + row) % 3], door: R() > .5 ? 1.2 : -1.2, windows: [[-w * .27, h * .5], [w * .27, h * .5]], upper: [[-w * .27, h * .82], [w * .27, h * .82]] }); hi++; } }
  // menara lonceng
  const bt = new THREE.Group(); bt.position.set(11, 0, -14); scene.add(bt);
  const tb = box(3.2, 11, 3.2, stoneM); bt.add(tb);
  for (const [dx, dz] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]]) { const p = box(.4, 4.2, .4, M.beam); p.position.set(dx, 11, dz); bt.add(p); }
  const bc = new THREE.ConeGeometry(2.6, 3.4, 4); bc.rotateY(Math.PI / 4); bc.translate(0, 1.7, 0); const broof = mesh(bc, M.roof2); broof.position.y = 15.2; bt.add(broof);
  const brassM = new THREE.MeshStandardMaterial({ color: '#c89a38', roughness: .5, metalness: .3, emissive: '#6a4a10', emissiveIntensity: .2 });
  const bellPivot = new THREE.Group(); bellPivot.position.set(0, 14.7, 0); bt.add(bellPivot); const bell = new THREE.Mesh(new THREE.CylinderGeometry(.35, .78, 1.1, 10), brassM); bell.position.y = -.65; bell.castShadow = true; bellPivot.add(bell);
  const bellPivot2 = new THREE.Group(); bellPivot2.position.set(.8, 14.7, .6); bt.add(bellPivot2); const bell2 = new THREE.Mesh(new THREE.CylinderGeometry(.16, .34, .5, 8), brassM); bell2.position.y = -.3; bellPivot2.add(bell2);
  const btWin = new THREE.Mesh(new THREE.PlaneGeometry(.8, 1.2), new THREE.MeshStandardMaterial({ color: '#150e08', emissive: '#ffb050', emissiveIntensity: 0 })); btWin.position.set(0, 7, 1.62); bt.add(btWin);
  // bukit jauh
  const hills = [[-200, '#3a4a68', 3], [-150, '#4a5c78', 8], [-110, '#5a6e86', 5]].map(([z, c, s]) => { const r = ridge(420, 46, c, s, { f: .008 }); r.position.set(0, -2, z); scene.add(r); return r; });

  // ---------- pohon & semak (billboard menghadap kamera) ----------
  const treeTex = [0, 1, 2].map(i => texOf(texCanopy(10 + i * 7, 'round'))), pineTex = [texOf(texCanopy(5, 'pine')), texOf(texCanopy(9, 'pine'))], bark = mat(woodPlanks(48, 48, { pw: 48, len: 96, seed: 6, nails: false, cols: ['#1a0f0b', '#2a1a12', '#3e2618', '#533420'] }));
  const bills = [];
  function tree(x, z, s = 1, pine = false) { const g = new THREE.Group(); g.position.set(x, 0, z); const tr = box(.34 * s, 2.6 * s, .34 * s, bark); g.add(tr);
    const t = pine ? pineTex[(R() * 2) | 0] : treeTex[(R() * 3) | 0], w = (pine ? 3.4 : 5) * s, h = (pine ? 4.5 : 3.7) * s, b = billboard(t, w, h, { ay: 0, shadow: true }); b.position.y = pine ? .6 * s : 1.6 * s; g.add(b); bills.push(b); scene.add(g); return g; }
  for (let z = 30; z < 110; z += 6 + R() * 4) { tree(-4.2 - R() * 2, z, .9 + R() * .5, R() > .6); tree(4.4 + R() * 2.5, z + 3, .9 + R() * .5, R() > .6); }
  for (let x = -60; x < 60; x += 8 + R() * 6) if (Math.abs(x) > 14) tree(x, 22 + R() * 25, .9 + R() * .6, R() > .55);
  for (let x = -22; x < 25; x += 5 + R() * 3) tree(x + R() * 2, -42 - R() * 8, 1.4 + R(), R() > .5);
  for (let i = 0; i < 14; i++) tree(-14 - R() * 18, 14 + R() * 40, .8 + R() * .5, R() > .5);
  // ---------- cahaya ambient: debu / kunang ----------
  const dust = particles(90, (i, t, o) => { const a = h2(i, 1, 3), b = h2(i, 2, 3), c = h2(i, 3, 3); o.x = -14 + a * 28 + Math.sin(t * .15 + i) * .8; o.y = .4 + b * 5 + Math.sin(t * .3 + i * 2) * .3; o.z = -2 + c * 22; o.a = .5; o.s = .05; o.r = 1; o.g = .95; o.b = .8; }, { soft: 1 }); scene.add(dust);

  // ---------- lentera di tanah (muncul per waktu) + api unggun ----------
  const lanterns = [];
  function lanternProp() { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(.24, .34, .24), new THREE.MeshStandardMaterial({ color: '#3a2a14', emissive: '#ffb050', emissiveIntensity: 1.4 })); b.position.y = .17; g.add(b); const c = box(.28, .05, .28, M.beam); c.position.y = .36; g.add(c); const gl = glow('#ffb050', 0.95, 1); gl.position.y = .22; g.add(gl); scene.add(g); g.visible = false; return { g, gl, b }; }
  const camp = new THREE.Group(); const cf = fire(1.1, { seed: 5 }); camp.add(cf); const cgl = glow('#ff9a3a', 2.3, 1); cgl.position.y = .5; camp.add(cgl); for (let i = 0; i < 5; i++) { const lg = box(.7, .1, .12, M.beam); lg.position.y = .04; lg.rotation.y = i * 1.2; camp.add(lg); } scene.add(camp); camp.visible = false;

  const api = {
    scene, sun, hemi, fill, SK, ST, lHero, lPost, lA, lB, lFill, doors, bar, wick, wickIn, wins, bells: [bellPivot, bellPivot2], bt, board, taxBoard, torches, lampBox, lampGlow, hangL, postG, bills, tow: [towWinL, towWinR], btWin, dust, wat, stream, hills,
    gateDark, lanterns, makeLantern() { const l = lanternProp(); lanterns.push(l); return l; }, camp, cf, cgl,
    // TOD: P = parameter objek (lihat story.js)
    applyTOD(P, t, cam) {
      sun.color.set(P.sunCol); sun.intensity = P.sunI; sun.position.set(...P.sunPos).add(sun.target.position);
      hemi.color.set(P.hemiSky); hemi.groundColor.set(P.hemiGnd); hemi.intensity = P.hemiI;
      scene.fog.color.set(P.fog); scene.fog.density = P.fogD;
      SK.u.top.value.set(P.skyTop); SK.u.mid.value.set(P.skyMid); SK.u.hor.value.set(P.skyHor); SK.u.k.value = P.skyK;
      SK.u.moonDir.value.set(...P.sunPos).normalize(); SK.u.moonCol.value.set(P.discCol); SK.u.moonI.value = P.discI;
      ST.material.uniforms.k.value = P.starK; ST.material.uniforms.t.value = t;
      wat.u.t.value = t; wat.u.camPos.value.copy(cam.position); wat.u.fogColor.value.copy(scene.fog.color); wat.u.fogDensity.value = scene.fog.density; wat.u.bright.value = P.waterK ?? .6; wat.u.calm.value = .5;
      hills.forEach((h, i) => { h.material.color.set(P.fog).lerp(new THREE.Color('#ffffff'), .0); });
      for (const b of bills) b.rotation.y = Math.atan2(cam.position.x - b.parent.position.x, cam.position.z - b.parent.position.z);
    },
  };
  return api;
}
