// people.js: sprite piksel 3/4 samping (menghadap kanan): satpam, manekin, mainan. Satu frame = 34x50 px, 1 px = 1/30 m.
import * as THREE from 'three';
import { PX, ramp, hex, texOf, billboard, blob } from './px.js';
export const SPX = 1 / 30, FW = 34, FH = 50;
const INK = hex('#150f18');
const C = {
  navy: ramp(['#080c18', '#111a30', '#1d2a4c', '#2c3d6a'], .22),
  shirt: ramp(['#2f3e58', '#4b5f7f', '#7389aa', '#9cb0cc'], .22),
  vest: ramp(['#3d5a0c', '#76a31a', '#b4e03a', '#e4ff80'], .22),
  skin: ramp(['#7c4c38', '#a56c4e', '#c98c68', '#e8ae88'], .22),
  boot: ramp(['#0c0a0c', '#1c181c', '#322c32'], .22),
  steel: ramp(['#14141a', '#2c2c36', '#4a4a58', '#70707e'], .22),
  lens: ramp(['#ffd890', '#ffeab8', '#fff6dc', '#ffffff'], .22),
  pale: ramp(['#8e8478', '#b4a999', '#d6cbb8', '#efe6d4'], .22),
  grey7: ramp(['#4c5058', '#6e747e', '#98a0aa', '#c0c8d0'], .22),
};
function torch(P, E, x, y, dx, dy, lit) {   // senter: badan 5px menuju (dx,dy), lensa di ujung
  for (let i = 0; i < 5; i++) P.set(Math.round(x + dx * i), Math.round(y + dy * i), C.steel(.7 - i * .06, i, 0));
  const lx = Math.round(x + dx * 5), ly = Math.round(y + dy * 5);
  if (lit > .05) { P.set(lx, ly, C.lens(.99, 0, 0)); E.set(lx, ly, C.lens(.99, 0, 0)); P.set(lx, ly + 1, C.lens(.9, 0, 0)); E.set(lx, ly + 1, C.lens(.9, 0, 0)); }
  else P.set(lx, ly, C.steel(.4, 0, 0));
}
// p: {step 0..3|undefined, bob, arm:'low'|'fwd'|'up'|'check'|'sit'|'run', run, blink, lit, lean, hem}
function drawGuard(P, E, p) {
  const by = (p.bob || 0) + (p.sit ? 9 : 0), top = 18 + by, hx = 16, hy = 11 + by + (p.lean || 0);
  const lx = p.lean ? 1 : 0;
  if (!p.sit) {   // kaki (celana + sepatu)
    const st = p.step ?? -1;
    const wide = p.run ? 3 : 0;
    const legs = st < 0 ? [[13, 0], [18, 0]] : [[[11 - wide, 0], [20 + wide, -1]], [[14, -1], [17, 0]], [[20 + wide, -1], [11 - wide, 0]], [[17, 0], [14, -1]]][st];
    legs.forEach(([x0, ly], i) => {
      for (let y = 37; y < 47 + ly; y++) for (let x = x0; x < x0 + 4; x++) P.set(x, y, C.navy(.75 - (x === x0 ? .3 : 0) - (i ? 0 : .15), x, y));
      P.rect(x0, 46 + ly, 5, 3, C.boot(.55, 0, 0)); P.rect(x0, 48 + ly, 5, 1, C.boot(.1, 0, 0));
    });
  } else {   // duduk: paha ke depan, betis ke bawah
    for (let x = 12; x < 25; x++) for (let y = 38 + by - 9 + 9; y < 42 + by - 9 + 9 - 0; y++) P.set(x, y - 0, C.navy(.62 - (x - 12) * .01, x, y));
    for (let y = 41 + by - 9 + 9; y < 48; y++) for (let x = 22; x < 26; x++) P.set(x, y, C.navy(.55, x, y));
    P.rect(22, 47, 6, 3, C.boot(.5, 0, 0));
  }
  // badan: kemeja + rompi
  const bot = p.sit ? 38 + by - 9 + 9 : 38;
  P.poly([[10, top], [23, top], [24, bot], [9, bot]], (x, y) => { const u = (y - top) / (bot - top), s = (x - 10) / 14; return C.shirt(.62 - s * .35 + (1 - u) * .1, x, y); });
  P.poly([[11, top + 1], [22, top + 1], [23, bot - 1], [10, bot - 1]], (x, y) => { const u = (y - top) / (bot - top), s = (x - 10) / 13; if (x >= 15 && x <= 17 && u > .1) return C.shirt(.3, x, y); return C.vest(.7 - s * .45 + (1 - u) * .15, x, y); });
  for (const r of [.38, .68]) { const yy = Math.round(top + (bot - top) * r); P.rect(10, yy, 13, 1, hex('#dfe6ee')); }   // pita reflektif
  P.rect(9, bot - 3, 15, 2, C.navy(.35, 0, 0)); P.set(18, bot - 3, hex('#c0a040')); // ikat pinggang + gesper
  P.rect(11, bot - 5, 3, 4, C.steel(.5, 0, 0)); P.set(12, bot - 5, hex('#40e060'));  // handy talky
  // kepala + topi
  P.ellipse(hx + 1 + lx, hy, 5.2, 5.6, (x, y, dx, dy) => C.skin(.62 - dx * .12 - dy * .25, x, y));
  P.rect(hx - 2, hy + 3, 4, 3, C.skin(.4, 0, 0));                          // leher
  P.ellipse(hx + .5 + lx, hy - 3, 6.4, 3.4, (x, y, dx, dy) => C.navy(.62 - dy * .3 + dx * .05, x, y));   // topi
  P.rect(hx + 3 + lx, hy - 2, 7, 2, C.navy(.25, 0, 0)); P.set(hx + 1 + lx, hy - 4, hex('#d8c040'));       // lidah topi + lencana
  const ey = hy + (p.sit ? 0 : 0);
  if (p.blink) P.set(hx + 4 + lx, ey, C.skin(.2, 0, 0)); else { P.set(hx + 4 + lx, ey, INK); P.set(hx + 1 + lx, ey, INK); }
  P.set(hx + 6 + lx, ey + 1, C.skin(.9, 0, 0)); P.rect(hx + 3 + lx, ey + 3, 3, 1, C.skin(.25, 0, 0));
  // lengan + senter
  const sl = pts => pts.forEach(([x, y]) => { P.set(x, y, C.shirt(.7, x, y)); P.set(x, y + 1, C.shirt(.45, x, y)); P.set(x - 1, y + 1, C.shirt(.3, x, y)); });
  const arm = p.arm || 'low', lit = p.lit ?? 1;
  if (arm === 'low') { sl([[22, top + 2], [23, top + 4], [23, top + 6], [24, top + 8], [24, top + 10]]); P.rect(24, top + 11, 2, 2, C.skin(.6, 0, 0)); torch(P, E, 25, top + 12, .8, .6, lit); }
  if (arm === 'fwd') { sl([[22, top + 2], [24, top + 3], [25, top + 4], [26, top + 5]]); P.rect(27, top + 5, 2, 2, C.skin(.6, 0, 0)); torch(P, E, 28, top + 6, 1, .15, lit); }
  if (arm === 'check') { sl([[22, top + 2], [24, top + 3], [25, top + 4], [26, top + 5]]); P.rect(27, top + 5, 2, 2, C.skin(.6, 0, 0)); torch(P, E, 28, top + 6, .9, .35, lit); P.rect(29, top + 2, 1, 3, C.steel(.6, 0, 0)); }
  if (arm === 'up') { sl([[22, top + 1], [23, top - 1], [24, top - 3], [25, top - 5]]); P.rect(25, top - 7, 2, 2, C.skin(.6, 0, 0)); torch(P, E, 26, top - 6, .5, -.8, lit); }
  if (arm === 'sit') { sl([[22, top + 2], [24, top + 4], [26, top + 6], [27, top + 7]]); P.rect(28, top + 7, 2, 2, C.skin(.6, 0, 0)); }
  if (arm === 'run') { sl([[22, top + 2], [24, top + 3], [26, top + 3]]); P.rect(27, top + 3, 2, 2, C.skin(.6, 0, 0)); torch(P, E, 28, top + 4, .9, .5, lit); }
  P.set(9, top + 8, C.skin(.3, 0, 0));
}
const GUARD = {
  idle0: { arm: 'low' }, idle1: { arm: 'low', bob: 1 }, blink: { arm: 'low', blink: 1 },
  aim0: { arm: 'fwd' }, aim1: { arm: 'fwd', bob: 1 }, aimUp: { arm: 'up' }, aimOff: { arm: 'fwd', lit: 0 },
  chk0: { arm: 'check' }, chk1: { arm: 'check', bob: 1 },
  w0: { step: 0, arm: 'low' }, w1: { step: 1, arm: 'low', bob: -1 }, w2: { step: 2, arm: 'low' }, w3: { step: 3, arm: 'low', bob: -1 },
  r0: { step: 0, arm: 'run', run: 1, lean: 1 }, r1: { step: 1, arm: 'run', run: 1, lean: 1, bob: -2 }, r2: { step: 2, arm: 'run', run: 1, lean: 1 }, r3: { step: 3, arm: 'run', run: 1, lean: 1, bob: -2 },
  sit0: { sit: 1, arm: 'sit' }, sit1: { sit: 1, arm: 'sit', bob: 1 }, sitFrozen: { sit: 1, arm: 'sit', lean: 0 },
  frz: { arm: 'low', lit: .4 },
};
// —— manekin ——
const OUT = [
  { top: ['#0e3a40', '#1c6870', '#2f9aa0', '#5cc4c0'], bot: ['#10141c', '#1c2430', '#2c3848'], hair: 'bob', pose: 'stand' },
  { top: ['#4a0c14', '#861424', '#c42a3a', '#ee5a60'], bot: null, hair: 'long', pose: 'hip' },
  { top: ['#6a4a08', '#a67c14', '#dcae2a', '#f8d860'], bot: ['#1c2c48', '#2c4468', '#46648c'], hair: 'none', pose: 'stand' },
  { top: ['#4a3c6c', '#7a68a8', '#a898d0', '#cfc4ec'], bot: ['#8a8a94', '#b4b4be', '#dadae2'], hair: 'bob', pose: 'out' },
  { top: ['#aaa8a0', '#cdcbc3', '#e8e6de', '#fffdf4'], bot: ['#10182c', '#1c2c4c', '#2c4470'], hair: 'long', pose: 'hip' },
  { top: ['#3c0c1c', '#6a1c32', '#982c48', '#bc4a66'], bot: ['#3a3a40', '#5a5a62', '#7c7c86'], hair: 'none', pose: 'stand' },
  { top: ['#4c5058', '#6e747e', '#98a0aa', '#c0c8d0'], bot: ['#3a3e46', '#585e68', '#7a828c'], hair: 'none', pose: 'stand', seventh: 1 },
];
function drawMannequin(P, E, p) {
  const o = OUT[p.outfit], T = ramp(o.top, .22), B = o.bot ? ramp(o.bot, .22) : T, by = 0, top = 18;
  const arms = p.arms || o.pose, head = p.head || 0;
  P.ellipse(16.5, 48.2, 7.5, 1.8, (x, y) => C.steel(.35 + ((x + y) % 2) * .05, x, y));              // alas
  P.rect(16, 36, 2, 12, C.pale(.35, 0, 0));                                                          // tiang kaki
  // kaki / rok
  if (!o.bot) { P.poly([[10, 33], [24, 33], [26, 44], [8, 44]], (x, y) => T(.7 - (x - 8) * .02 - (y - 33) * .01 + (x % 4 === 0 ? -.12 : 0), x, y)); }
  else for (const x0 of [12, 18]) for (let y = 34; y < 47; y++) for (let x = x0; x < x0 + 4; x++) P.set(x, y, B(.7 - (x === x0 ? .25 : 0) - (x0 === 12 ? .1 : 0), x, y));
  // badan
  P.poly([[10, top], [23, top], [24, 36], [9, 36]], (x, y) => { const s = (x - 10) / 14, u = (y - top) / 18; return T(.7 - s * .4 + (1 - u) * .08, x, y); });
  P.rect(14, top - 2, 4, 2, C.pale(.5, 0, 0));                                                       // leher
  // rambut (di belakang kepala), lalu kepala tanpa wajah
  if (o.hair === 'bob') P.ellipse(15 + head, 11, 5.8, 6.2, (x, y) => C.steel(.32 + (y > 12 ? .08 : 0), x, y));
  if (o.hair === 'long') { P.rect(10 + head, 8, 4, 15, C.steel(.3, 0, 0)); P.ellipse(15 + head, 9, 5.4, 5, (x, y) => C.steel(.4, x, y)); }
  P.ellipse(16.6 + head, 11.4 + (head ? 1 : 0), 4.4, 5.4, (x, y, dx, dy) => (o.seventh ? C.grey7 : C.pale)(.7 - dx * .18 - dy * .3, x, y));
  // lengan
  const al = (pts, col) => { for (let i = 0; i < pts.length; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[Math.min(i + 1, pts.length - 1)], n = Math.max(1, Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))); for (let k = 0; k < n; k++) { const x = Math.round(x0 + (x1 - x0) * k / n), y = Math.round(y0 + (y1 - y0) * k / n); P.set(x, y, col(.65, x, y)); P.set(x - 1, y, col(.4, x, y)); } } };
  const skin = o.seventh ? C.grey7 : C.pale;
  if (arms === 'stand') { al([[8, 20], [8, 24], [8, 28], [8, 32], [8, 36]], skin); al([[25, 20], [25, 24], [25, 28], [25, 32], [25, 36]], skin); }
  if (arms === 'hip') { al([[8, 20], [7, 24], [7, 28], [9, 31]], skin); al([[25, 20], [26, 24], [26, 28], [24, 31]], skin); }
  if (arms === 'out') { al([[8, 20], [8, 24], [8, 28], [8, 32]], skin); al([[25, 20], [27, 22], [29, 24], [31, 26], [32, 27]], skin); }
  if (arms === 'r0') { al([[8, 20], [8, 24], [8, 28], [8, 32], [8, 36]], skin); al([[25, 20], [26, 24], [27, 27], [28, 30], [28, 33]], skin); }
  if (arms === 'r1') { al([[8, 20], [8, 24], [8, 28], [8, 32], [8, 36]], skin); al([[25, 20], [27, 22], [29, 24], [30, 26], [30, 29]], skin); }
  if (arms === 'r2') { al([[8, 20], [8, 24], [8, 28], [8, 32], [8, 36]], skin); al([[25, 20], [27, 20], [29, 19], [31, 18], [32, 18]], skin); }
  if (arms === 'r3') { al([[8, 20], [8, 24], [8, 28], [8, 32], [8, 36]], skin); al([[25, 20], [28, 19], [30, 18], [32, 17], [33, 17]], skin); }
}
const MAN = {};
OUT.forEach((o, i) => { MAN[`m${i}`] = { outfit: i }; });
MAN.m6t = { outfit: 6, head: 1 }; MAN.m6r0 = { outfit: 6, head: 1, arms: 'r0' }; MAN.m6r1 = { outfit: 6, head: 1, arms: 'r1' }; MAN.m6r2 = { outfit: 6, head: 1, arms: 'r2' }; MAN.m6r3 = { outfit: 6, head: 1, arms: 'r3' };

function atlas(table, draw) {
  const names = Object.keys(table), n = names.length, P = new PX(FW * n, FH), E = new PX(FW * n, FH);
  names.forEach((k, i) => {
    const p1 = new PX(FW, FH), e1 = new PX(FW, FH); draw(p1, e1, table[k]); p1.outline(.3);
    for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) { const c = p1.get(x, y); if (c) P.set(i * FW + x, y, c); const e = e1.get(x, y); if (e) E.set(i * FW + x, y, e); }
  });
  const tex = texOf(P.done()), em = texOf(E.done()); for (const t of [tex, em]) t.repeat.set(1 / n, 1);
  return { tex, em, names, n };
}
export function spawn(A, shadowR = .42) {   // satu instance: tekstur diklon supaya tiap sprite punya frame sendiri
  const tex = A.tex.clone(), em = A.em.clone(); tex.needsUpdate = em.needsUpdate = true; tex.repeat.set(1 / A.n, 1); em.repeat.set(1 / A.n, 1);
  const mesh = billboard(tex, FW * SPX, FH * SPX, { em, emCol: '#ffffff', emI: 2.2 });
  const root = new THREE.Group(); root.add(mesh);
  const sh = blob(shadowR, .55); sh.position.y = .015; root.add(sh);
  return {
    root, mesh, shadowBlob: sh,
    frame(name) { const i = A.names.indexOf(name); if (i < 0) throw new Error('frame ' + name); tex.offset.x = em.offset.x = i / A.n; },
    face(cam, flip = false) { root.rotation.y = Math.atan2(cam.position.x - root.position.x, cam.position.z - root.position.z); mesh.scale.x = flip ? -1 : 1; },
  };
}
export function makeGuard() {
  const g = spawn(atlas(GUARD, drawGuard));
  // posisi ujung senter (dunia) dari tabel pose; flip = menghadap kiri
  const TIP = { low: [30, 43], fwd: [33.5, 24.5], check: [32.5, 25.5], up: [28.5, 13], run: [33, 24], sit: [30, 33] };
  g.tipPos = (name, flip, bob = 0) => {
    const p = GUARD[name] || {}, k = TIP[p.arm || 'low'], by = (p.bob || 0) + (p.sit ? 9 : 0);
    const v = new THREE.Vector3((k[0] - FW / 2) * SPX * (flip ? -1 : 1), (FH - k[1] - by) * SPX, .08);
    v.applyAxisAngle(new THREE.Vector3(0, 1, 0), g.root.rotation.y); return v.add(g.root.position);
  };
  return g;
}
export const mannequinAtlas = () => atlas(MAN, drawMannequin);
export const MAN_FRAMES = Object.keys(MAN);

// —— mainan kecil (boneka) 16x16 ——
export function toyAtlas() {
  const N = 5, P = new PX(16 * N, 16);
  const col = ['#c0603a', '#6a8ac8', '#c8b040', '#b05a9a', '#5aa070'];
  for (let k = 0; k < N; k++) {
    const R = ramp(['#1a1018', col[k], '#ffffff'], .3), x0 = k * 16;
    if (k === 0 || k === 3) { P.ellipse(x0 + 8, 10, 4.5, 4.5, (x, y, dx, dy) => R(.5 - dy * .15 - dx * .1, x, y)); P.ellipse(x0 + 8, 5, 3.4, 3.2, (x, y, dx, dy) => R(.55 - dy * .1, x, y)); P.rect(x0 + 4, 1, 2, 2, R(.5, 0, 0)); P.rect(x0 + 10, 1, 2, 2, R(.5, 0, 0)); }
    if (k === 1) { P.rect(x0 + 4, 5, 8, 7, R(.55, 0, 0)); P.rect(x0 + 5, 1, 6, 4, R(.6, 0, 0)); P.rect(x0 + 5, 12, 2, 3, R(.3, 0, 0)); P.rect(x0 + 9, 12, 2, 3, R(.3, 0, 0)); P.set(x0 + 6, 3, hex('#ffe060')); P.set(x0 + 9, 3, hex('#ffe060')); }
    if (k === 2) { P.rect(x0 + 2, 8, 12, 4, R(.55, 0, 0)); P.rect(x0 + 4, 5, 7, 3, R(.7, 0, 0)); P.ellipse(x0 + 5, 13, 2, 2, hex('#222')); P.ellipse(x0 + 11, 13, 2, 2, hex('#222')); }
    if (k === 4) { P.ellipse(x0 + 8, 9, 3.4, 5, (x, y, dx, dy) => R(.55 - dx * .1, x, y)); P.ellipse(x0 + 8, 3.5, 2.8, 2.8, (x, y) => R(.7, x, y)); P.rect(x0 + 3, 6, 2, 5, R(.4, 0, 0)); P.rect(x0 + 11, 6, 2, 5, R(.4, 0, 0)); }
  }
  P.outline(.3); const tex = texOf(P.done()); tex.repeat.set(1 / N, 1); return { tex, N };
}
