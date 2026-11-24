// Koreografi: semua waktu diambil dari anchor naskah (timing.json) → ganti VO, jalankan align.py, animasi ikut bergeser.
import * as THREE from 'three';
import { makePerson, LOOKS, villager, POSES, shade } from './people.js';
import { PX, ramp, hex, texOf, billboard, h2 } from './px.js';

const sm = u => { u = Math.min(1, Math.max(0, u)); return u * u * (3 - 2 * u); };
const lerp = (a, b, u) => a + (b - a) * u;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const C = h => new THREE.Color(h);

export function buildStory(world, T, LEAD) {
  const A = n => { if (!(n in T.anchors)) throw new Error('anchor ' + n); return LEAD + T.anchors[n]; };
  const E = (n, i) => LEAD + (i == null ? T.events[n] : T.events[n][i]);
  const DUR = LEAD + T.dur + 6.2;
  const end = LEAD + T.dur;

  // ---------------- AKTOR ----------------
  const actors = [], cam0 = new THREE.PerspectiveCamera();
  function actor(look, kf, o = {}) {
    const names = ['idle0', 'idle1', 'blink'];
    for (const k of kf) { const ps = Array.isArray(k[3]) ? k[3] : [k[3]]; for (const p of ps) { if (!p) continue; if (p[0] === '>') for (let i = 0; i < 4; i++) names.push(p.slice(1) + i); else names.push(p); } }
    const bad = names.filter(n => !POSES[n]); if (bad.length) throw new Error('pose? ' + [...new Set(bad)]);
    const pr = makePerson(look, names); world.scene.add(pr.root); pr.root.visible = false;
    const a = { pr, kf, o, x: 0, z: 0, flip: !!o.flip, vis: false, pose: 'idle0', ph: o.ph ?? Math.random() * 3 };
    actors.push(a); return a;
  }
  function evalActor(a, t, cam) {
    const kf = a.kf, last = kf[kf.length - 1];
    if (t < kf[0][0] || (t > last[0] && !a.o.stay) || (a.o.vis && (t < a.o.vis[0] || t > a.o.vis[1]))) { a.pr.root.visible = false; a.vis = false; return; }
    let i = 0; while (i < kf.length - 1 && kf[i + 1][0] <= t) i++;
    const k0 = kf[i], k1 = kf[i + 1] || k0, moving = k1 !== k0 && (k1[1] !== k0[1] || k1[2] !== k0[2]);
    let x = k0[1], z = k0[2], pose, fl = k0[4] ?? a.flip;
    if (moving) { const u = (t - k0[0]) / Math.max(1e-3, k1[0] - k0[0]), len = Math.hypot(k1[1] - k0[1], k1[2] - k0[2]); x = lerp(k0[1], k1[1], u); z = lerp(k0[2], k1[2], u);
      const pre = (typeof k0[3] === 'string' && k0[3][0] === '>') ? k0[3].slice(1) : 'w', st = Math.floor(u * len / (a.o.stride || .5) + a.ph) & 3; pose = pre + st; const dx = k1[1] - k0[1]; if (Math.abs(dx) > .15 * Math.abs(k1[2] - k0[2]) && Math.abs(dx) > .05) fl = dx < 0; else fl = a.flip; }
    else { let p = k0[3]; if (Array.isArray(p)) p = p[Math.floor((t + a.ph) / (k0[5] || 1.1)) % p.length]; pose = (p && p[0] !== '>') ? p : 'idle0'; if (pose === 'idle0' && !k0[3] && Math.floor((t + a.ph) / 1.7) % 2) pose = 'idle1'; }
    a.flip = fl; a.x = x; a.z = z; a.pose = pose; a.vis = true;
    const r = a.pr.root; r.visible = true; r.position.set(x, 0, z); a.pr.frame(pose); a.pr.face(cam, fl);
  }
  const stay = (k, t, p, f) => { const l = k[k.length - 1]; k.push([t, l[1], l[2], p, f]); };

  // ---------------- NAJMI ----------------
  const lampPoses = new Set(['lamp', 'lampUp', 'lampDim', 'lampOut', 'lampLow', 'l0', 'l1', 'l2', 'l3', 'r0', 'r1', 'r2', 'r3', 'sitLamp', 'sitLamp2', 'sitLamp3', 'kneelUp', 'kneelUp1']);
  POSES.sitLamp2 = { sit: 1, arm: 'lamp', head: 'down', lit: .22 }; POSES.sitLamp3 = { sit: 1, arm: 'lamp', head: 'down', lit: .06 };
  POSES.kidSick = { sit: 1, arm: 'rest', head: 'down', flush: 1 }; POSES.kidSick1 = { sit: 1, arm: 'rest', head: 'down', flush: 1, bob: 1 }; POSES.kidOk = { sit: 1, arm: 'rest', head: 'down', closed: 1 };
  const SPOT = [.4, 4.4], MSPOT = [-1.3, 4.4], BOARD = [6.0, 5.5], POSTL = [5.0, 5.6], WICK = [-3.9, 3.3];
  const nk = [[0, .6, 5.0, 'lamp', true]];
  const go = (k, t0, x, z, pre, t1) => { const l = k[k.length - 1]; k.push([t0, l[1], l[2], pre, l[4]]); k.push([t1, x, z, 'idle0', l[4]]); };   // berdiri sampai t0, lalu jalan tiba di t1
  go(nk, A('pagi') - .5, 4.6, 5.6, '>l', A('lentera') + .2); stay(nk, A('lentera') + .5, 'lamp', false); nk.push([A('kunci') - .2, 4.6, 5.6, 'hips', false]);
  go(nk, A('palang') - .3, -1.4, 1.95, '>w', A('dorong') - .6); stay(nk, A('dorong') - .5, 'pushUp', false); stay(nk, E('bar_lift') + 2.6, 'idle0', false);
  go(nk, E('doors_open') + .6, .6, 5.0, '>w', E('doors_open') + 4.4); stay(nk, E('doors_open') + 4.5, 'look', false);
  go(nk, A('lonceng1') + 5.5, BOARD[0], BOARD[1], '>w', A('papan') + .8); stay(nk, A('papan') + 1, 'look', false);
  go(nk, A('laras') - 3.5, SPOT[0], SPOT[1], '>w', A('laras') + 1.2); stay(nk, A('laras') + 1.4, 'idle0', true); stay(nk, A('angguk') + .3, 'nod', true); stay(nk, A('angguk') + 1.4, 'idle0', true);
  stay(nk, A('periksa') + .4, 'down', true); stay(nk, A('periksa') + 2.6, ['knock0', 'knock1'], true); nk[nk.length - 1][5] = .22; stay(nk, A('periksa') + 4.6, 'up', true); stay(nk, A('biasa') - .5, 'idle0', true);
  stay(nk, A('ketuk') - .4, ['knock0', 'knock1'], true); nk[nk.length - 1][5] = .22; stay(nk, A('ketuk') + 1.6, 'surprise', true); stay(nk, A('garam') + 1.2, 'hips', true); stay(nk, A('tunjuk') - .1, 'point', true); stay(nk, A('dompet') + 1.5, 'idle0', true);
  stay(nk, A('sore') - 1, 'idle0', true); stay(nk, A('perempuan') - .3, 'look', false);
  go(nk, A('menatap') - 2.6, BOARD[0], BOARD[1], '>w', A('menatap') + .6); stay(nk, A('menatap') + .8, 'look', false); stay(nk, A('keputusan') - .1, 'down', false); stay(nk, A('keempat') - .2, 'look', false);
  go(nk, A('raih') - .6, POSTL[0], POSTL[1], '>w', A('raih') + .3); stay(nk, A('raih') + 1.2, 'lamp', true);
  go(nk, A('raih') + 2.0, WICK[0], WICK[1], '>l', E('wicket1') + .1); stay(nk, E('wicket1') + .3, 'lamp', true);
  nk.push([E('wicket1') + 1.6, WICK[0], WICK[1], '>r'], [A('lari') + 1.2, -2.0, 9.0, '>r'], [A('lonceng3') - .4, 1.0, 21.0, 'lamp', false]);
  stay(nk, A('lonceng3') + .2, 'lamp', false); stay(nk, A('ambil') + .3, 'carryChild', false); stay(nk, A('lutut') - .2, 'kneelChild', false); stay(nk, A('lutut') + .8, 'kneelUp', false); stay(nk, A('kotabangun') + 3, ['kneelUp', 'kneelUp1'], false); stay(nk, A('malam') + .29, 'kneelUp', false);
  const CIRC = [1.6, 2.1];
  nk.push([A('malam') + .3, CIRC[0], CIRC[1], 'sitLamp', true]); stay(nk, A('redup') + .3, 'sitLamp2', true); stay(nk, A('redup') + 2.6, 'sitLamp3', true); stay(nk, A('lenteralain') + 1.0, 'sit', true); stay(nk, A('duduk') + 1, ['sit', 'sit1'], true); nk[nk.length - 1][5] = 2.2;
  const najmi = actor(LOOKS.najmi, nk, { stay: true, flip: true, stride: .5 });
  const najmiLamp = () => { const P = POSES[najmi.pose]; return P && ['lamp', 'lampUp', 'lampFwd'].includes(P.arm) ? (P.lit ?? 1) : 0; };

  // ---------------- BU LARAS + GEROBAK ----------------
  const lk = [[A('laras') - 8.5, -38, 4.9, '>w']]; lk.push([A('laras') + 1.2, MSPOT[0] - .2, MSPOT[1], 'idle0', false]);
  go(lk, A('angguk') + 3.5, 0, 4.2, '>w', A('angguk') + 6); go(lk, A('angguk') + 6.1, 0, -8, '>w', A('angguk') + 9);
  const laras = actor(LOOKS.laras, lk, {});
  // gerobak (billboard 4 frame roda)
  function cartTex() { const P = new PX(60 * 4, 36), W = ramp(['#2a1a10', '#4a2e1a', '#6e4826', '#94643a']), G = ramp(['#1a3a14', '#2c5a20', '#4a8a30', '#7ab84a']), O = ramp(['#8a2a10', '#c4501c', '#e8801c', '#ffb04a']);
    for (let f = 0; f < 4; f++) { const ox = f * 60; P.rect(ox + 6, 14, 44, 10, W(.55, 0, 0)); P.rect(ox + 6, 14, 44, 2, W(.9, 0, 0)); P.rect(ox + 6, 22, 44, 2, W(.25, 0, 0));
      for (let i = 0; i < 40; i += 1) { const x = ox + 8 + (i * 7) % 40, y = 9 + ((i * 5) % 7); P.ellipse(x, y + 2, 3.6, 3, (xx, yy, dx, dy) => (i % 4 === 0 ? O : G)(.6 - dy * .3 + h2(i, 1, 2) * .2, xx, yy)); }
      P.rect(ox + 2, 17, 5, 2, W(.7, 0, 0)); P.line(ox + 0, 26, ox + 6, 17, W(.5, 0, 0));
      P.ellipse(ox + 28, 28, 7, 7, (x, y, dx, dy) => W(.5, x, y)); P.ellipse(ox + 28, 28, 5, 5, (x, y) => hex('#1a1016')); for (let s = 0; s < 3; s++) { const a = f * Math.PI / 6 + s * Math.PI / 3; P.line(ox + 28 - Math.cos(a) * 5, 28 - Math.sin(a) * 5, ox + 28 + Math.cos(a) * 5, 28 + Math.sin(a) * 5, W(.8, 0, 0)); } P.set(ox + 28, 28, W(.9, 0, 0)); }
    P.outline(.3); return P.done(); }
  const ct = texOf(cartTex()); ct.repeat.set(.25, 1); const cart = billboard(ct, 60 / 30 * 1, 36 / 30, { shadow: true }); const cartG = new THREE.Group(); cartG.add(cart); world.scene.add(cartG); cartG.visible = false;

  // ---------------- PEDAGANG (keranjang telur) ----------------
  const pk = [[A('pedagang') - 6, -9, 4.5, '>bk'], [A('pedagang') + 1.8, MSPOT[0], MSPOT[1], ['bkStand', 'bkStand1'], false]];
  stay(pk, A('garam') - 0.2, ['bkStand', 'bkStand1'], false); stay(pk, A('garam') + .4, 'bkEmpty', false); stay(pk, A('tunjuk') + 1.2, 'bkSigh', false); stay(pk, A('dompet') + 2.8, 'bkSigh', false);
  go(pk, A('dompet') + 3.5, 0, 4.2, '>bk', A('dompet') + 5.5); go(pk, A('dompet') + 5.6, 0, -8, '>bk', A('dompet') + 8.5);
  const pedagang = actor(LOOKS.pedagang, pk, {});
  const sacks = [0, 1, 2].map(i => { const b = billboard(texOf((() => { const P = new PX(24, 24), S = ramp(['#4a3a20', '#8a7440', '#c0a860', '#e8d890']); P.ellipse(12, 14, 9, 9, (x, y, dx, dy) => S(.6 - dy * .3 - dx * .15 + h2(x, y, 9) * .1, x, y)); P.rect(8, 4, 8, 3, S(.4, 0, 0)); P.outline(.3); return P.done(); })()), .8, .8, { shadow: true }); b.position.set(-2.3 - i * .5, 0, 5.0 + (i % 2) * .15); b.visible = false; world.scene.add(b); return b; });

  // ---------------- ANTREAN ----------------
  function queue(n, tStart, dt, skip, vis, seed0, sp = 1.1) {
    const Ts = []; let t = tStart; for (let j = 0; j < n; j++) { if (skip && t > skip[0] && t < skip[1]) t = skip[1]; Ts.push(t); t += dt; }
    const items = [];
    for (let j = 0; j < n; j++) {
      const L = villager(seed0 + j, { item: j % 5 === 1 ? 'basket' : undefined, pack: j % 4 === 2 });
      const kf = [[vis[0], 0, 0, '>w']]; const o = { vis, stay: true, ph: j * .37 }; const ac = actor(L, kf, o); ac.q = { j, Ts, sp, z: SPOT[1] + (j % 2 ? .35 : -.15) };
      items.push(ac);
    }
    return { items, Ts, n, sp };
  }
  const slots = (Q, t, j) => { let k = 0; for (let i = 0; i < Q.n; i++) k += sm((t - (Q.Ts[i] - 1.3)) / 1.3); return Math.max(0, j - k); };
  function evalQueue(Q, t, cam) {
    for (const a of Q.items) { const j = a.q.j, T0 = Q.Ts[j]; a.pr.root.visible = false; a.vis = false; if (t < a.o.vis[0] || t > a.o.vis[1]) continue;
      let x, z, pose, fl = false;
      if (t < T0 + 3.0) { const s = slots(Q, t, j), s2 = slots(Q, t + .25, j); x = MSPOT[0] - Q.sp * s; z = a.q.z; const mv = Math.abs(s2 - s) > .004; pose = mv ? 'w' + (Math.floor(t * 2.4 + a.ph) & 3) : (Math.floor((t + a.ph) / 1.6) % 5 === 0 ? 'blink' : (Math.floor((t + a.ph) / 1.3) % 2 ? 'idle1' : 'idle0')); fl = false; }
      else { const u = Math.min(1, (t - T0 - 3.0) / 4.0), len = 9; if (u >= 1 && t > T0 + 7.5) continue; const p = [[MSPOT[0], SPOT[1]], [0, 4.0], [0, -8]], seg = u < .35 ? [p[0], p[1], u / .35] : [p[1], p[2], (u - .35) / .65]; x = lerp(seg[0][0], seg[1][0], seg[2]); z = lerp(seg[0][1], seg[1][1], seg[2]); pose = 'w' + (Math.floor(t * 2.4 + a.ph) & 3); fl = false; }
      if (!a.names) a.names = 1; a.x = x; a.z = z; a.pose = pose; a.vis = true; const r = a.pr.root; r.visible = true; r.position.set(x, 0, z); a.pr.frame(pose); a.pr.face(cam, fl);
    }
  }
  const Q1 = queue(17, A('siang') + 2.5, 3.6, [A('pedagang') - 4, A('dompet') + 6], [A('siang') - .5, A('sore') - .4], 100);
  const Q2 = queue(3, A('sore') + 3, 4.8, null, [A('sore') - .4, A('perempuan') + 6], 300, 1.1);

  // ---------------- LALU-LALANG PAGI ----------------
  const walkers = []; const W_ = (L, t0, pts, spd, pre) => { const kf = []; let t = t0; pts.forEach((p, i) => { if (i) t += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) / spd; kf.push([t, p[0], p[1], '>' + pre]); }); kf[0][0] = t0; return actor(L, kf, {}); };
  const p0 = A('petani');
  W_(villager(11, { item: 'sack', sack: 1 }), p0 - 1, [[-26, 5.2], [-1, 4.5], [0, 4.0], [0, -8]], 1.4, 'sk');
  W_(villager(12, { fem: true, item: 'basket' }), p0 + 1.5, [[24, 6.5], [4, 5.2], [0, 4.0], [0, -8]], 1.5, 'bk');
  W_(villager(13), p0 + 4, [[-26, 5.4], [-1.5, 4.8], [0, 4], [0, -8]], 1.6, 'w');
  for (let i = 0; i < 3; i++) W_(villager(20 + i, { over: { kid: true, dress: false, hair: 'short' } }), p0 + 3.5 + i * .55, [[10, 7.2 + i * .4], [-4, 6.4 + i * .3], [-8.5, 5.6]], 3.4, 's');
  W_(villager(14, { over: { headwear: 'cap', hat: LOOKS.najmi.top } }), p0 + 7, [[-26, 5.0], [-1, 4.6], [0, 4.0], [0, -8]], 1.3, 'c');
  W_(villager(15), p0 + 9, [[22, 6], [3, 5.2], [0, 4], [0, -8]], 1.5, 'w');


  // ---------------- KUDA + KERETA + KUSIR ----------------
  function horseTex() { const P = new PX(72 * 4, 50), B = ramp(['#2a160c', '#4e2a16', '#7a4524', '#a8683a', '#c88a52']), D = ramp(['#0e0806', '#1c120c', '#2c1c12']);
    for (let f = 0; f < 4; f++) { const ox = f * 72, legs = [[22, 0], [28, 2], [42, 2], [48, 0]];
      legs.forEach(([lx, ph], i) => { const k = (f + ph) & 3, off = [-3, 0, 3, 0][k], lift = k === 1 ? 3 : 0; const far = i % 2 === 0;
        for (let y = 32; y < 47 - lift; y++) { const x = Math.round(ox + lx + off * (y - 32) / 15); P.rect(x, y, 3, 1, B(far ? .3 : .55, x, y)); } P.rect(ox + lx + off, 46 - lift, 4, 2, D(.5, 0, 0)); });
      P.poly([[ox + 14, 20], [ox + 10, 24], [ox + 8, 40], [ox + 13, 38], [ox + 16, 26]], (x, y) => D(.7, x, y));
      P.ellipse(ox + 33, 25, 18, 9.5, (x, y, dx, dy) => B(.62 - dy * .32 - dx * .12 + (((x + y) % 7) === 0 ? .05 : 0), x, y));
      P.poly([[ox + 46, 22], [ox + 53, 8], [ox + 60, 11], [ox + 55, 27]], (x, y) => B(.6 - (y - 8) * .01, x, y));
      P.poly([[ox + 54, 8], [ox + 66, 12], [ox + 69, 20], [ox + 63, 22], [ox + 57, 17]], (x, y) => B(.7 - (y - 8) * .02, x, y)); P.rect(ox + 66, 18, 3, 3, D(.6, 0, 0));
      P.set(ox + 61, 13, hex('#1a1016')); P.rect(ox + 54, 5, 2, 4, B(.35, 0, 0)); for (let i = 0; i < 7; i++) P.rect(ox + 49 + (i * 1.2 | 0), 10 + i * 2, 3, 3, D(.7, 0, 0));
      P.rect(ox + 49, 17, 8, 2, hex('#7a5a30')); P.rect(ox + 36, 16, 3, 12, hex('#5a3a20')); }
    P.outline(.3); return P.done(); }
  function wagonTex() { const P = new PX(96 * 4, 56), W = ramp(['#24160c', '#46281a', '#6e4826', '#94643a']), CV = ramp(['#6a5e46', '#a09474', '#d0c4a0', '#ece0bc']);
    for (let f = 0; f < 4; f++) { const ox = f * 96;
      P.ellipse(ox + 40, 20, 33, 16, (x, y, dx, dy) => CV(.62 - dy * .35 - dx * .15 + (Math.abs(x - ox - 40) % 12 < 1 ? -.12 : 0), x, y));
      P.rect(ox + 6, 30, 76, 9, W(.55, 0, 0)); P.rect(ox + 6, 30, 76, 2, W(.9, 0, 0)); P.rect(ox + 6, 37, 76, 2, W(.25, 0, 0));
      P.rect(ox + 78, 28, 12, 2, W(.8, 0, 0)); P.rect(ox + 78, 29, 3, 9, W(.4, 0, 0)); P.rect(ox + 80, 18, 2, 10, W(.5, 0, 0)); P.line(ox + 84, 36, ox + 95, 33, W(.5, 0, 0));
      for (const cx of [22, 66]) { P.ellipse(ox + cx, 45, 9, 9, (x, y, dx, dy) => W(.45, x, y)); P.ellipse(ox + cx, 45, 6.6, 6.6, () => hex('#1a1016')); for (let s = 0; s < 4; s++) { const a = f * Math.PI / 8 + s * Math.PI / 4; P.line(ox + cx - Math.cos(a) * 6, 45 - Math.sin(a) * 6, ox + cx + Math.cos(a) * 6, 45 + Math.sin(a) * 6, W(.8, 0, 0)); } P.rect(ox + cx - 1, 44, 3, 3, W(.95, 0, 0)); } }
    P.outline(.3); return P.done(); }
  const hTex = texOf(horseTex()), wTex = texOf(wagonTex()); hTex.repeat.set(.25, 1); wTex.repeat.set(.25, 1);
  const horse = billboard(hTex, 72 / 30, 50 / 30, { shadow: true }), wagon = billboard(wTex, 96 / 30, 56 / 30, { shadow: true }), wGroup = new THREE.Group(); wGroup.add(horse, wagon); world.scene.add(wGroup); wGroup.visible = false;
  const kusir = makePerson(villager(77, { over: { headwear: 'hat', hat: shade('#6a4a2a'), beard: true, hair: 'short', top: shade('#7a5a3a'), dress: false } }), ['sit', 'hold']); world.scene.add(kusir.root); kusir.root.visible = false;
  const WP = [[-38, 5.3], [-1.6, 4.8], [0, 4.1], [0, -10]], WSEG = []; let WL = 0; for (let i = 1; i < WP.length; i++) { const d = Math.hypot(WP[i][0] - WP[i - 1][0], WP[i][1] - WP[i - 1][1]); WSEG.push([WL, d]); WL += d; }
  const wT0 = A('petani') - 2.0, wSP = 2.3, wT1 = wT0 + WL / wSP;
  function evalWagon(t, cam) {
    const on = t >= wT0 && t <= wT1; wGroup.visible = on; kusir.root.visible = on; if (!on) return;
    const d = (t - wT0) * wSP; let i = 0; while (i < WSEG.length - 1 && d > WSEG[i][0] + WSEG[i][1]) i++; const u = Math.min(1, (d - WSEG[i][0]) / WSEG[i][1]), x = lerp(WP[i][0], WP[i + 1][0], u), z = lerp(WP[i][1], WP[i + 1][1], u);
    wGroup.position.set(x, 0, z); const face = Math.atan2(cam.position.x - x, cam.position.z - z); horse.rotation.y = wagon.rotation.y = face;
    const c = Math.cos(face), s = Math.sin(face); horse.position.set(.62 * c, 0, -.62 * s); wagon.position.set(-1.54 * c, 0, 1.54 * s);
    hTex.offset.x = (Math.floor(d / .42) & 3) / 4; wTex.offset.x = (Math.floor(d * 2.4) & 3) / 4 + 0;
    kusir.frame('sit'); kusir.face(cam, false); kusir.root.position.set(x - 1.6 * c + 1.05 * c, .92 + Math.sin(d * 7) * .01, z + (-1.6 * -s) + 1.05 * -s * -1 * 0);
    kusir.root.position.set(x + (-1.54 + 1.05) * c, .92 + Math.sin(d * 7) * .012, z + (1.54 - 1.05) * s);
  }

  // ---------------- PEREMPUAN & ANAK ----------------
  const tArr = A('lonceng3') - .3, t0w = A('perempuan') - .5, tS = A('cepat') + 2.0, tS2 = tS + 1.5;
  const woman = actor(LOOKS.perempuan, [[t0w, .4, 100, '>st'], [tS, .6, 55, 'stumble'], [tS2, .6, 55, '>fast'], [tArr, -.2, 23.2, 'hugKid', false]], { vis: [0, A('malam')] });
  woman.kf.push([A('ambil') + .3, -.2, 23.2, 'sag', false], [A('lutut') + .2, -.2, 23.2, 'kneelSag', false]);
  woman.kf.push([A('malam') + .3 - .01, -.2, 23.2, 'kneelSag', false], [A('malam') + .3, .35, 2.4, 'kneelSag', false]); woman.o.stay = true; woman.o.vis = null;
  const kid = actor(LOOKS.anak, [[A('lutut') + .9, -.9, 23.3, 'kidSick', false], [A('malam') + .29, -.9, 23.3, 'kidSick', false], [A('malam') + .3, -.5, 2.65, ['kidSick', 'kidSick1'], false, 1.3], [A('demam') + .2, -.5, 2.65, ['kidSick', 'kidSick1'], false, 1.3], [A('demam') + .5, -.5, 2.65, 'kidOk', false]], { stay: true });
  kid.pr.root.scale.setScalar(1.4);

  // ---------------- KOTA KELUAR (malam) ----------------
  const townK = (L, i, to, circ, pre, pose, flipC) => { const t0 = A('tabib') + i * 1.5, kf = [[t0, WICK[0], 1.7, '>' + pre], [t0 + 1.2, WICK[0], 3.4, '>' + pre]]; const dist = Math.hypot(to[0] - WICK[0], to[1] - 3.4); kf.push([t0 + 1.2 + dist / 1.9, to[0], to[1], pose, true]);
    stay(kf, A('malam') + .29, pose, true); kf.push([A('malam') + .3, circ[0], circ[1], pose, flipC]); return actor(L, kf, { stay: true, ph: i }); };
  townK(LOOKS.tabib, 0, [-1.4, 22.9], [-1.65, 2.45], 'l', 'kneel', false);
  townK({ ...LOOKS.laras }, 1, [1.8, 22.6], [-2.7, 3.3], 'blk', 'cloth', false);
  townK(villager(40, { item: 'bowl' }), 2, [-2.8, 21.4], [2.7, 3.4], 'bowl', 'bowl', true);
  [[3, [3.2, 21.8], [3.7, 2.9], false], [4, [-3.6, 22.8], [-3.6, 3.9], false], [5, [2.9, 24.0], [3.5, 2.4], true], [6, [-4.4, 21.2], [-3.7, 2.2], false], [7, [4.4, 22.6], [3.3, 4.9], true], [8, [-2.2, 25.0], [-2.7, 5.0], true]].forEach(([i, to, c, f]) => townK(villager(50 + i, {}), i, to, c, 'l', 'lamp', f));

  // ---------------- LENTERA TANAH + API UNGGUN ----------------
  const LANT = [[[-1.3, 3.15], 'lingkaran', 0], [[.9, 4.7], 'lingkaran', .4], [[-1.7, 2.3], 'lingkaran', .8], [[1.0, 2.2], 'lenteralain', 0], [[2.3, 2.7], 'satulagi', .3], [[-2.5, 3.9], 'tabib2', 0], [[2.9, 4.0], 'tabib2', .7]].map(([p, an, d]) => { const l = world.makeLantern(); l.g.position.set(p[0], 0, p[1]); l.t0 = A(an) + d; return l; });
  world.camp.position.set(.3, 0, 4.2); const campOn = A('lingkaran') - .4;

  // ---------------- LANGIT, CAHAYA (TOD) ----------------
  const K = (t, o) => ({ t, ...o });
  const keys = [
    K(0, { sunCol: '#7f96d8', sunI: .55, sunPos: [-18, 26, -26], hemiSky: '#5a68a8', hemiGnd: '#2a2434', hemiI: .95, fog: '#6a7898', fogD: 0.00625, skyTop: '#161e44', skyMid: '#34406e', skyHor: '#8a80a8', skyK: 1, starK: .7, discCol: '#c8d4ff', discI: .0, exp: 1.2 }),
    K(E('doors_open') + 1, { sunCol: '#ffb88a', sunI: 1.5, sunPos: [32, 9, -10], hemiSky: '#a8a8d0', hemiGnd: '#443628', hemiI: 1.0, fog: '#d8b8a8', fogD: 0.0045, skyTop: '#5878b8', skyMid: '#e8a890', skyHor: '#ffd0a0', skyK: 1, starK: .1, discCol: '#fff0c0', discI: 1.3, exp: 1.2 }),
    K(A('lonceng1') + 6, { sunCol: '#ffe2b0', sunI: 2.6, sunPos: [28, 22, -8], hemiSky: '#b8c8e8', hemiGnd: '#4a4228', hemiI: 1.2, fog: '#dcdccc', fogD: 0.0026, skyTop: '#4a8ad0', skyMid: '#8ab8e8', skyHor: '#d8e6f0', skyK: 1, starK: 0, discCol: '#fff6d8', discI: .8, exp: 1.15 }),
    K(A('siang'), { sunCol: '#fff6e0', sunI: 3.1, sunPos: [8, 44, 8], hemiSky: '#c4d6f0', hemiGnd: '#544c2c', hemiI: 1.3, fog: '#dce6ee', fogD: 0.0018, skyTop: '#3c78cc', skyMid: '#78aae4', skyHor: '#c4dcf0', skyK: 1, starK: 0, discCol: '#fffbe8', discI: .5, exp: 1.1 }),
    K(A('sore') + 2, { sunCol: '#ffc888', sunI: 2.6, sunPos: [10, 18, -30], hemiSky: '#c8c8e0', hemiGnd: '#503c24', hemiI: 1.1, fog: '#ecc8a0', fogD: 0.0029, skyTop: '#5a7ab8', skyMid: '#eab080', skyHor: '#ffd0a0', skyK: 1, starK: 0, discCol: '#ffe0a0', discI: .9, exp: 1.15 }),
    K(A('bayangan'), { sunCol: '#ff9a52', sunI: 2.5, sunPos: [6, 8, -34], hemiSky: '#c8a8b8', hemiGnd: '#4a3020', hemiI: 1.0, fog: '#e8a878', fogD: 0.0034, skyTop: '#4a58a0', skyMid: '#e08a70', skyHor: '#ffb878', skyK: 1, starK: 0, discCol: '#ffc080', discI: 1.1, exp: 1.15 }),
    K(A('lonceng3') + 2, { sunCol: '#d07a8a', sunI: 1.2, sunPos: [-8, 5, -32], hemiSky: '#8a78b0', hemiGnd: '#302830', hemiI: .95, fog: '#8a6a98', fogD: 0.00475, skyTop: '#2a3074', skyMid: '#8a5a92', skyHor: '#e08a78', skyK: 1, starK: .2, discCol: '#ffb090', discI: .6, exp: 1.2 }),
    K(A('jendela') + 1, { sunCol: '#8aa2e4', sunI: .95, sunPos: [-14, 28, -22], hemiSky: '#5a68a8', hemiGnd: '#242030', hemiI: .95, fog: '#4a5a88', fogD: 0.0056, skyTop: '#101a44', skyMid: '#26356a', skyHor: '#5a5a92', skyK: 1, starK: .9, discCol: '#c8d4ff', discI: .5, exp: 1.25 }),
  ];
  const tmp = { a: C('#000'), b: C('#000') }, colKeys = ['sunCol', 'hemiSky', 'hemiGnd', 'fog', 'skyTop', 'skyMid', 'skyHor', 'discCol'], numKeys = ['sunI', 'hemiI', 'fogD', 'skyK', 'starK', 'discI', 'exp'];
  function tod(t) {
    let i = 0; while (i < keys.length - 1 && keys[i + 1].t <= t) i++; const k0 = keys[i], k1 = keys[Math.min(i + 1, keys.length - 1)], u = k1 === k0 ? 0 : sm((t - k0.t) / (k1.t - k0.t)), P = {};
    for (const c of colKeys) P[c] = C(k0[c]).lerp(C(k1[c]), u); for (const n of numKeys) P[n] = lerp(k0[n], k1[n], u); P.sunPos = [0, 1, 2].map(q => lerp(k0.sunPos[q], k1.sunPos[q], u)); return P;
  }
  const dayK = t => 1 - Math.max(sm((t - E('doors_open')) / 8) - sm((t - A('lonceng3')) / 5), 0);   // 1 = gelap (lampu menyala), 0 = siang
  const winLevel = (rank, t) => { const dawn = rank < .16 ? 1 - sm((t - A('lonceng1') - 8) / 6) : 0; const n = [A('satu'), A('dua'), A('tiga')]; let nl = 0;
    if (rank < .012) nl = sm((t - n[0]) / .35); else if (rank < .024) nl = sm((t - n[1]) / .35); else if (rank < .036) nl = sm((t - n[2]) / .35); else { const s = A('kotabangun') + rank * 9; nl = sm((t - s) / 1.4); } return Math.max(dawn * (t < A('lonceng1') + 14 ? 1 : 0), nl) * (.75 + .5 * ((rank * 17) % 1)); };

  // ---------------- KAMERA ----------------
  const shots = [];
  const sh = (t0, t1, p0, l0, p1, l1, f0, f1 = f0, o = {}) => shots.push({ t0, t1, p0, l0, p1, l1, f0, f1, ...o });
  const lead = LEAD, najP = () => V3(najmi.x, 1.2, najmi.z);
  // pembuka: sangat tinggi & jauh → mendekat
  sh(0, A('pagi') - .35, V3(14, 44, 74), V3(0, 2, 2), V3(7, 24, 42), V3(.6, 1.5, 4.6), 25, 24);
  sh(A('pagi') - .35, A('lentera') + .5, V3(2.6, 2.4, 12.5), V3(3.2, 1.5, 5.2), V3(4.0, 2.2, 11), V3(4.4, 1.5, 5.4), 30, 28);
  sh(A('lentera') + .5, A('kunci') + .2, V3(1.6, 2.8, 12.6), V3(5.3, 1.9, 5.8), V3(2.6, 2.5, 11.4), V3(5.3, 1.9, 5.8), 26, 24);
  sh(A('kunci') + .2, A('gerbangtua') + 1.5, V3(4.9, .6, 7.0), V3(4.5, .34, 5.6), V3(4.7, .5, 6.3), V3(4.5, .34, 5.6), 18, 16);
  sh(A('gerbangtua') + 1.5, A('palang') + .6, V3(-2, 3.4, 15), V3(0, 3, 1), V3(-1, 3.2, 13), V3(0, 2.8, 1), 30, 30);
  sh(A('palang') + .6, E('doors_open') - .1, V3(-6.2, 1.5, 7.4), V3(-.9, 1.9, 2), V3(-5.2, 1.7, 6.8), V3(-.6, 2.2, 1.4), 26, 24);
  sh(E('doors_open') - .1, A('lonceng1') - .2, V3(.8, 4.6, 17), V3(0, 2.6, 0), V3(-1.2, 3.6, 12), V3(0, 3.0, -1.6), 32, 30);
  sh(A('lonceng1') - .2, A('lonceng1') + 4.4, V3(8, 7, 6), V3(11, 13, -14), V3(9, 8, 6), V3(11, 14.4, -14), 36, 34);
  sh(A('lonceng1') + 4.4, A('aturan1') - .2, V3(10.2, 2.4, 13.6), V3(6.9, 1.5, 4.9), V3(8.6, 2.0, 12.0), V3(7.0, 1.5, 4.9), 26, 22);
  sh(A('aturan1') - .2, A('laras') - 1, V3(7.6, 1.8, 10.6), V3(7.6, 1.6, 4.9), V3(7.6, 1.7, 9.4), V3(7.6, 1.6, 4.9), 24, 19);
  sh(A('laras') - 1, A('angguk') - .4, () => V3(laras.x - 1.4, 1.9, 11.5), () => V3(laras.x + 1.6, 1.2, 4.6), () => V3(laras.x - 1.4, 1.9, 11), () => V3(laras.x + 1.6, 1.2, 4.6), 30, 28);
  sh(A('angguk') - .4, A('petani') - .3, V3(-3.6, 1.5, 8.2), V3(-.5, 1.2, 4.4), V3(-3.0, 1.5, 7.6), V3(-.5, 1.2, 4.4), 24, 22);
  sh(A('petani') - .3, A('petani') + 1.8, V3(11, 4.6, 17), V3(-2, 1.5, 4.6), V3(9, 4.4, 16), V3(-2.5, 1.5, 4.7), 33, 32);
  const wx = t => -38 + 2.3 * (t - wT0) * 0.9985;   // kereta sejajar sumbu x sebelum belokan gerbang
  const wxN = () => Math.max(-34, Math.min(-4, -38 + 2.3 * (t_now - wT0)));
  const wp = () => V3(wxN() - 1.0, 3.1, 17.5), wl = () => V3(wxN() + .1, 1.0, 5.2);
  sh(A('petani') + 1.8, A('petani') + 9.5, wp, wl, wp, wl, 38, 38, { nopb: true });
  sh(A('petani') + 9.5, A('siang') - .2, V3(9, 4.4, 16), V3(-3, 1.5, 4.8), V3(7, 4.2, 15), V3(-3.5, 1.5, 4.8), 32, 31);
  sh(A('siang') - .2, A('periksa') - .2, V3(-3, 15, 21), V3(-11, .5, 4.5), V3(-8, 12, 19), V3(-13, .5, 4.5), 34, 32);
  sh(A('periksa') - .2, A('pedagang') - .3, V3(-1.5, 1.8, 8.6), V3(-.4, 1.1, 4.4), V3(-.9, 1.6, 7.4), V3(-.5, 1.1, 4.4), 24, 20);
  sh(A('pedagang') - .3, A('ketuk') - .8, V3(-3.2, 1.7, 8.4), V3(-1.3, 1.2, 4.4), V3(-2.4, 1.5, 7.2), V3(-1.1, 1.2, 4.4), 23, 19);
  sh(A('ketuk') - .8, A('garam') - .2, V3(-.8, 1.1, 6.6), V3(-.6, .9, 4.4), V3(-.9, 1.0, 6.2), V3(-.7, .8, 4.4), 19, 17);
  sh(A('garam') - .2, A('tunjuk') - .3, V3(-3.4, 1.4, 7.8), V3(-1.8, .7, 4.8), V3(-2.8, 1.3, 7), V3(-1.6, .8, 4.6), 22, 20);
  sh(A('tunjuk') - .3, A('ratusan') - .2, V3(-3.0, 2.2, 9.4), V3(-1.4, 1.5, 4.4), V3(-2.4, 2.0, 8.6), V3(-1.3, 1.4, 4.4), 26, 24);
  sh(A('ratusan') - .2, A('sore') - .5, V3(5, 13, 25), V3(-9, .8, 5), V3(-3, 9, 21), V3(-14, .8, 5), 34, 32);
  sh(A('sore') - .5, A('hitung') + 2, V3(3.4, 1.5, 9.6), V3(.3, 1.3, 4.4), V3(2.8, 1.6, 9), V3(.3, 1.3, 4.4), 25, 22);
  sh(A('hitung') + 2, A('bayangan') + 4.8, V3(-9, 2.6, 19), V3(0, .2, 6), V3(-5, 2.2, 15), V3(0, .2, 7), 30, 28);
  sh(A('bayangan') + 4.8, A('utara') - .2, V3(1.8, 2.0, 6.4), V3(.4, 2.2, 70), V3(1.6, 2.0, 6.0), V3(.4, 2.2, 66), 14, 12);
  sh(A('utara') - .2, A('wajahanak') - .3, V3(-8, 8, 36), () => V3(woman.x, 1.4, woman.z), V3(-6, 6, 38), () => V3(woman.x, 1.3, woman.z), 26, 20);
  sh(A('wajahanak') - .3, A('cepat') - .2, () => V3(woman.x + 1.3, 1.3, woman.z - 6.5), () => V3(woman.x, 1.2, woman.z), () => V3(woman.x + 1.2, 1.3, woman.z - 5.6), () => V3(woman.x, 1.2, woman.z), 18, 16);
  sh(A('cepat') - .2, A('jarak') - .2, V3(-5, 2.6, 26), () => V3(woman.x, 1.2, woman.z), V3(-3, 2.2, 22), () => V3(woman.x, 1.2, woman.z), 26, 24);
  sh(A('jarak') - .2, A('kejam') - .5, V3(9.0, 1.9, 12.4), V3(6.6, 1.5, 5.2), V3(8.4, 1.8, 11.0), V3(6.8, 1.5, 5.0), 24, 20);
  sh(A('kejam') - .5, A('keputusan') - .3, V3(7.6, 1.7, 10.4), V3(7.6, 1.6, 4.9), V3(7.6, 1.65, 8.6), V3(7.6, 1.6, 4.9), 22, 17);
  sh(A('keputusan') - .3, A('keempat') - .2, V3(8.4, 1.9, 9.6), V3(6.4, 1.2, 5.4), V3(7.8, 1.8, 8.8), V3(6.4, 1.2, 5.4), 26, 22);
  sh(A('keempat') - .2, A('raih') - .5, V3(7.6, 1.7, 10), V3(7.6, 1.6, 4.9), V3(7.6, 1.65, 8.0), V3(7.6, 1.6, 4.9), 20, 15);
  sh(A('raih') - .5, A('sempit') + .2, V3(7.2, 1.9, 9.4), V3(5.2, 1.2, 5.7), V3(5.0, 1.8, 9.2), V3(3.0, 1.2, 4.8), 26, 28);
  sh(A('sempit') + .2, A('lari') + .6, V3(-.8, 1.9, 9.4), V3(-3.9, 1.2, 3), V3(-1.6, 1.9, 9.8), V3(-3.9, 1.2, 3.4), 28, 26);
  sh(A('lari') + .6, A('lonceng3') - .4, () => V3(najmi.x - 8.5, 1.9, najmi.z - 1.2), () => V3(najmi.x + .8, 1.1, najmi.z + 1.2), () => V3(najmi.x - 8.5, 1.9, najmi.z - 1.2), () => V3(najmi.x + .8, 1.1, najmi.z + 1.2), 26, 24);
  sh(A('lonceng3') - .4, A('turun') - .1, V3(-5, 1.6, 17.2), V3(.4, 1.3, 22), V3(-3.8, 1.5, 17.6), V3(.4, 1.3, 22.2), 22, 20);
  sh(A('turun') - .1, A('ambil') - .1, V3(-2, 5, 28), V3(0, 2.5, 0), V3(-1.5, 4.5, 26), V3(0, 2.5, 0), 20, 19);
  sh(A('ambil') - .1, A('lutut') - .1, V3(-1.4, 1.1, 18.6), V3(.3, 1.0, 22.5), V3(-.9, 1.0, 19), V3(.3, 1.0, 22.6), 20, 18);
  sh(A('lutut') - .1, A('lkecil') - .2, V3(2.6, .55, 19.2), V3(1.0, 1.5, 22.4), V3(2.4, .5, 19.6), V3(1.0, 3.2, 22.2), 28, 34);
  sh(A('lkecil') - .2, A('jendela') + .4, V3(3, 1.0, 19), V3(11, 14, -14), V3(3, 2.4, 19.4), V3(11, 12.4, -14), 44, 40);
  sh(A('jendela') + .4, A('pintulagi') - .4, V3(5, 11, 34), V3(-1, 6.5, -12), V3(3, 9.5, 31), V3(0, 6.2, -12), 34, 32);
  sh(A('pintulagi') - .4, A('laras2') - .3, V3(-1.2, 1.6, 9.2), V3(-3.9, 1.2, 3.2), V3(-1.6, 1.6, 9.8), V3(-3.9, 1.2, 3.8), 26, 26);
  sh(A('laras2') - .3, A('pilih') - .2, V3(-9, 1.8, 14), V3(-2, 1.0, 10), V3(-8, 1.9, 17), V3(-1, 1.0, 14), 28, 27);
  sh(A('pilih') - .2, A('malam') - .35, V3(2.2, 1.5, 15.6), V3(.4, 1.3, 22.4), V3(11, 24, 50), V3(0, 1.5, 11), 26, 28, { ease: 'out' });
  sh(A('malam') - .35, A('lingkaran') + 1.6, V3(5, 1.7, 8.6), V3(.8, .9, 2.6), V3(3.6, 1.5, 7.6), V3(.6, .9, 2.8), 26, 22);
  sh(A('lingkaran') + 1.6, A('redup') - .3, V3(-3.8, 1.2, 8.0), V3(-.2, .8, 2.9), V3(-2.8, 1.2, 6.8), V3(.0, .8, 2.8), 24, 20);
  sh(A('redup') - .3, A('lenteralain') - .3, V3(3.2, 1.0, 5.4), V3(1.6, .8, 2.1), V3(2.7, .9, 4.4), V3(1.6, .7, 2.1), 20, 15);
  sh(A('lenteralain') - .3, A('demam') - 3.6, V3(3.8, 1.1, 6.0), V3(1.4, .7, 2.3), V3(3.0, 1.0, 5.2), V3(.6, .7, 2.5), 22, 22);
  sh(A('demam') - 3.6, A('demam') + .2, V3(-2.3, 1.0, 8.6), V3(-.5, .62, 2.65), V3(-1.7, .85, 7.6), V3(-.5, .62, 2.65), 25, 20, { nopb: true, sharp: 1 });
  sh(A('demam') + .2, A('duduk') - .3, V3(-1.7, .85, 7.6), V3(-.5, .62, 2.65), V3(-1.2, .85, 8.2), V3(-.5, .62, 2.65), 20, 23, { nopb: true, sharp: 1 });
  sh(A('duduk') - .3, A('berat') + .2, V3(3.4, 1.0, 5.6), V3(1.5, .6, 2.1), V3(2.9, .9, 4.8), V3(1.5, .55, 2.1), 22, 16);
  sh(A('berat') + .2, A('besok') + .3, V3(2.6, .6, 4.3), V3(1.6, .35, 2.1), V3(2.5, .5, 3.9), V3(1.65, .4, 2.1), 17, 13);
  sh(A('besok') + .3, DUR, V3(4, 3, 9), V3(.8, 1.0, 2.4), V3(14, 44, 74), V3(0, 2, 2), 28, 25, { ease: 'io', end: end + 6 });
  const dips = [A('pagi') - .35, A('lonceng1') + 4.4, A('siang') - .2, A('sore') - .5, A('keputusan') - .3, A('malam') - .35, A('besok') + .3];  // titik potong yang di-"dip" ke hitam
  // anchor penanda bab (judul kecil kiri-atas)
  const chapters = [[A('pagi') - .1, 'I', 'Pagi'], [A('siang') + .0, 'II', 'Siang'], [A('sore') - .2, 'III', 'Sore'], [A('keputusan') - .1, 'IV', 'Keputusan'], [A('malam') - .1, 'V', 'Malam'], [A('besok') + .1, 'VI', 'Penutup']];

  // ---------------- UPDATE per frame ----------------
  const ring = (times, t) => { let a = 0; for (const r of times) { const d = t - r; if (d > 0 && d < 7) a += Math.exp(-d / 1.6) * Math.sin(d * 13.5); } return a; };
  let t_now = 0; const PB = 1.6, up = V3(0, 1, 0), tgt = V3(), tmpV = V3();
  function update(t, camera, W, H) {
    // kamera
    t_now = t; let s = shots[0]; for (const q of shots) if (t >= q.t0) s = q;
    let u = (t - s.t0) / Math.max(1e-3, (s.end || s.t1) - s.t0); u = Math.min(1, Math.max(0, u)); const e = s.ease === 'out' ? 1 - (1 - u) * (1 - u) : (s.ease === 'io' ? sm(u) : u * .6 + sm(u) * .4);
    const g = v => typeof v === 'function' ? v(t) : v;
    camera.position.copy(g(s.p0)).lerp(g(s.p1), e); tgt.copy(g(s.l0)).lerp(g(s.l1), e);
    if (s.f0 < 34 && !s.nopb && camera.position.distanceTo(tgt) < 25) { tmpV.copy(camera.position).sub(tgt); camera.position.copy(tgt).addScaledVector(tmpV, PB); }
    camera.position.y += Math.sin(t * .31) * .02 * (s.f0 < 22 ? 1 : 0); camera.fov = lerp(s.f0, s.f1, e); camera.updateProjectionMatrix(); camera.lookAt(tgt);
    // cahaya langit
    const P = tod(t); P.waterK = .5 + (1 - dayK(t)) * .4; world.applyTOD({ ...P, sunCol: '#' + P.sunCol.getHexString(), hemiSky: '#' + P.hemiSky.getHexString(), hemiGnd: '#' + P.hemiGnd.getHexString(), fog: '#' + P.fog.getHexString(), skyTop: '#' + P.skyTop.getHexString(), skyMid: '#' + P.skyMid.getHexString(), skyHor: '#' + P.skyHor.getHexString(), discCol: '#' + P.discCol.getHexString() }, t, camera);
    // pintu, palang, pintu kecil
    const dOpen = sm((t - E('doors_open')) / 4.2) * 1.5 * (1 - sm((t - E('doors_close')) / 1.6)) ;
    world.doors[0].rotation.y = dOpen; world.doors[1].rotation.y = -dOpen; world.gateDark.visible = dOpen > .02;
    const bl = sm((t - E('bar_lift')) / 1.2), bs = sm((t - E('bar_lift') - 1.6) / 1.0), bd = t > E('bar_drop') - .5 ? sm((t - E('bar_drop') + .5) / .5) : 0;
    const bx = bs * -4.6 * (1 - bd), by = 2.3 + .45 * bl * (1 - bs) - (2.15 * bs) * (1 - bd) + (bd ? 0 : 0), bz = .78 + bs * .35 * (1 - bd);
    world.bar.position.set(bx, by + (t > E('bar_drop') - .5 && t < E('bar_drop') ? .8 * (1 - (t - E('bar_drop') + .5) / .5) : 0), bz); world.bar.rotation.z = bs * .05 * (1 - bd);
    const wo = Math.max(sm((t - E('wicket1')) / .9) * (1 - sm((t - E('wicket1') - 4.2) / .8)), sm((t - E('wicket2')) / .9)) * (t < A('malam') ? 1 : 0);
    world.wick.rotation.y = -wo * 1.7; world.wickIn.material.emissiveIntensity = wo * (1 - dayK(t)) * 2.4 * 0 + wo * (t > A('lonceng3') ? 2.2 : .3);
    // lonceng
    world.bells[0].rotation.z = .55 * ring([...T.events.bell1, ...T.events.bell2, ...T.events.bell3].map(x => x + LEAD), t); world.bells[1].rotation.z = .8 * ring(T.events.bellsmall.map(x => x + LEAD), t);
    // lampu praktis
    const dk = dayK(t), nightOn = t > A('lonceng3') - 2;
    const taken = t > A('raih') + 1.2, flick = .85 + .15 * Math.sin(t * 19) * Math.sin(t * 7.3) + (t < A('kunci') ? -.2 + .12 * Math.sin(t * 3) : 0);
    const post = (taken ? 0 : Math.max(dk, 0)) * (t > A('sore') + 2 && t < A('bayangan') ? 1 : 1) * flick; const dim = (t < A('kunci') + 2 ? .5 : 1);
    world.lampBox.visible = !taken; world.lampGlow.visible = !taken; world.lampGlow.material.opacity = Math.min(.28, .08 + post * .18 * dim); world.lampBox.material.emissiveIntensity = (.2 + post * .45) * dim;
    world.hangL.getWorldPosition(tmpV); world.lPost.position.copy(tmpV); world.lPost.intensity = post * 3.2 * dim * (t < A('sore') ? 1 : (t > A('lonceng3') - 3 ? 1 : .35));
    for (const tc of world.torches) { const on = Math.min(1, dk * 1.2); tc.g.visible = on > .02; tc.gl.material.opacity = on * flick; }
    world.tow[0].material.emissiveIntensity = world.tow[1].material.emissiveIntensity = (dk > .5 ? 1.6 : 0); world.btWin.material.emissiveIntensity = (t > A('jendela') || t < A('lonceng1') + 10) ? 1.8 : 0;
    // jendela
    for (const w of world.wins) w.m.emissiveIntensity = 1.7 * winLevel(w.rank, t);
    // lentera tanah + api
    let lc = 0, lcx = 0, lcz = 0;
    for (const l of LANT) { const on = t > l.t0; l.g.visible = on; if (on) { const a = Math.min(1, (t - l.t0) / .8); l.gl.material.opacity = a * (.85 + .15 * Math.sin(t * 11 + l.g.position.x * 5)); lc++; lcx += l.g.position.x; lcz += l.g.position.z; } }
    const campV = t > campOn && t < end + 20; world.camp.visible = campV; world.cf.visible = campV;
    // aktor
    evalActor(najmi, t, camera); evalActor(laras, t, camera);
    for (const a of actors) if (a !== najmi && a !== laras && !a.q) evalActor(a, t, camera);
    evalWagon(t, camera); evalQueue(Q1, t, camera); evalQueue(Q2, t, camera);
    // gerobak mengikuti Bu Laras
    if (laras.vis && !laras.q && t < A('petani') + 6) { cartG.visible = true; const dir = 1; cartG.position.set(laras.x + 1.65, 0, laras.z + .1); const fr = Math.floor((laras.x * 1.7) % 4 + 4) & 3; ct.offset.x = fr / 4; cartG.rotation.y = Math.atan2(camera.position.x - cartG.position.x, camera.position.z - cartG.position.z); } else cartG.visible = false;
    sacks.forEach((b, i) => { b.visible = t > A('garam') + .5 + i * .45 && t < A('ratusan') + 1; });
    // lentera Najmi (cahaya)
    const nl = najmiLamp(); const armName = POSES[najmi.pose]?.arm;
    const lampArm = armName === 'lampUp' ? 'lampUp' : armName === 'lampFwd' ? 'lampFwd' : 'lamp';
    if (najmi.vis && nl > 0) { const lp = najmi.pr.lanternPos(lampArm); world.lHero.position.copy(lp); world.lHero.position.y += .05; world.lHero.intensity = nl * (3.0 + 4.5 * dk) * (.94 + .06 * Math.sin(t * 17)); } else world.lHero.intensity = 0;
    // pool: api unggun & lentera tanah
    if (campV) { world.lA.position.set(.3, .9, 4.2); world.lA.intensity = 4.2 * (.9 + .1 * Math.sin(t * 23) * Math.sin(t * 5)) * Math.min(1, (t - campOn) / 2); } else world.lA.intensity = 0;
    if (lc) { world.lB.position.set(lcx / lc, .6, lcz / lc); world.lB.intensity = Math.min(5, lc * 1.1); } else world.lB.intensity = 0;
    if (s.sharp) { world.lA.intensity *= .45; world.lB.intensity *= .5; world.lHero.intensity *= .5; }
    world.lFill.intensity = dk * .6; world.lFill.position.set(najmi.x - 1.5, 2.2, najmi.z + 2.4);
    world.fill.position.copy(camera.position).add(V3(3, 4, 0)); world.fill.target.position.copy(tgt); world.fill.target.updateMatrixWorld(); world.fill.color.copy(P.hemiSky); world.fill.intensity = (.85 + .6 * (1 - dk)) * (t > A('lonceng3') ? .9 : 1);
    world.sun.target.position.set(najmi.x * .3, 0, Math.min(najmi.z, 12));
    // matikan lentera kota di mana-mana saat siang (emisif sprite tetap kecil; tak masalah)
    return { dk, tgt, exp: P.exp, shot: s, bloom: (.42 + dk * .1) * (s.sharp ? .2 : 1), sharp: !!s.sharp };
  }
  // fokus miring (tilt-shift): hitung dari target di layar
  function tiltC(camera) { tmpV.copy(tgt).project(camera); return Math.min(.9, Math.max(.1, (tmpV.y + 1) / 2)); }
  return { DUR, update, tiltC, dips, chapters, end, A, E, tgt };
}
