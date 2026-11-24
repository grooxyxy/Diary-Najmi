// Karakter pixel parametrik (tampak 3/4 menghadap kanan). Satu fungsi gambar + tabel "look" per tokoh + tabel pose.
// Pose = objek parameter (data); frame baru = entri baru. Sprite melangkah (stepped), kamera/cahaya meluncur.
import * as THREE from 'three';
import { PX, ramp, hex, texOf, billboard, blob, mixc } from './px.js';

export const SPX = 1 / 30, FW = 40, FH = 50, CX = 20;
const INK = hex('#1a1016');
const R = (cols, dz = .22) => ramp(cols, dz);
export const shade = (h) => { const b = hex(h); return R([mixc(b, [10, 8, 16], .72), mixc(b, [10, 8, 16], .45), b, mixc(b, [255, 245, 230], .22), mixc(b, [255, 245, 230], .42)]); };
export const SKIN = {
  a: R(['#8a5238', '#b97a58', '#d9a07a', '#f0c29c']), b: R(['#6b3e2a', '#946048', '#b88060', '#d6a07c']),
  c: R(['#a86a4c', '#d29470', '#ecb792', '#ffd9ba']), d: R(['#46281c', '#6d4330', '#8e5f46', '#ad7d62']),
};
export const HAIR = {
  black: R(['#0e0a0c', '#1c1417', '#2e2024', '#46343a']), brown: R(['#2e1712', '#4f2a1c', '#74412a', '#95603c']),
  grey: R(['#5c5a60', '#8a8890', '#b4b2ba', '#dcdae2']), red: R(['#4a1a10', '#7a2c18', '#a6431f', '#c96a30']), blond: R(['#6a4a1a', '#a07a30', '#cfa650', '#e8cf80']),
};
const STEEL = R(['#22252e', '#444a58', '#6c7488', '#98a0b4', '#c4cad8']), BRASS = R(['#3e2a10', '#7a5a24', '#b88c3e', '#e6c26a']);
const GLASS = R(['#ff8a1c', '#ffc14a', '#ffe79a', '#fffbe6']), BOOT = R(['#1a100c', '#2e1d15', '#4a3022']), WICK = R(['#6a5a2a', '#a8924a', '#d8c070', '#f0e0a0']);
const STRAW = R(['#6a5420', '#a08838', '#d0b458', '#ecd890']), EGG = R(['#a89880', '#d8c8ae', '#f2e6d0', '#fffaf0']);

// lentera tangan: lit 0..1 = besar nyala (E = lapisan emisif)
function lantern(P, E, x, y, lit = 1) {
  P.set(x + 2, y - 2, BRASS(.5, 0, 0)); P.set(x + 1, y - 1, BRASS(.6, 0, 0)); P.set(x + 3, y - 1, BRASS(.6, 0, 0));
  P.rect(x, y, 5, 1, BRASS(.85, 0, 0));
  for (let j = 1; j <= 5; j++) for (let i = 0; i < 5; i++) {
    if (i === 0 || i === 4) { P.set(x + i, y + j, BRASS(i === 0 ? .7 : .35, i, j)); continue; }
    const r = Math.hypot((i - 2) * 1.1, (j - 3.2) * .8), f = lit * (1.35 - r * .45);
    if (lit > .05 && f > .35) { const c = GLASS(Math.min(.99, f * .75), x + i, y + j); P.set(x + i, y + j, c); E && E.set(x + i, y + j, c); }
    else P.set(x + i, y + j, lit > .05 ? GLASS(.05, 0, 0) : hex('#3a3440'));
  }
  P.rect(x, y + 6, 5, 1, BRASS(.55, 0, 0));
}
// anggota badan: garis tebal 2 px dari (ax,ay) ke (bx,by); ujung = tangan
function limb(P, ax, ay, bx, by, sleeve, skin, hand = true, shade_ = .5) {
  const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay)) || 1;
  for (let i = 0; i <= n; i++) {
    const x = Math.round(ax + (bx - ax) * i / n), y = Math.round(ay + (by - ay) * i / n);
    const col = (hand && i > n - 2) ? skin(.55, x, y) : sleeve(shade_ + (i % 2) * .08, x, y);
    P.set(x, y, col); P.set(x + 1, y, (hand && i > n - 2) ? skin(.4, x, y) : sleeve(shade_ - .18, x, y));
  }
}

export function drawPerson(P, E, p, L) {
  const kid = !!L.kid, by = p.bob || 0, st = p.step ?? -1;
  const legH = kid ? 5 : 12, hip = 48 - legH, torso = kid ? 10 : 16, sh = hip - torso + by - (p.sit ? -8 : 0) + (p.kneel ? 8 : 0);
  const hy = sh - (kid ? 6 : 8) + (p.head === 'down' ? 1 : 0), top = L.top || shade('#8a6a40'), bot = L.bot || shade('#4a3a2a'), skin = SKIN[L.skin || 'a'];
  const lean = p.run ? 3 : 0, cx = CX + (p.lean || 0);
  // ---- kaki
  if (p.sit) {
    for (let x = CX - 6; x < CX + 12; x++) for (let y = 43; y < 47; y++) P.set(x, y, bot(y === 43 ? .8 : .5 - (x > CX + 8 ? .1 : 0), x, y));
    P.rect(CX + 12, 43, 3, 4, BOOT(.5, 0, 0)); P.rect(CX + 12, 43, 3, 1, BOOT(.9, 0, 0));
  } else if (p.kneel) {
    for (let x = CX - 8; x < CX + 4; x++) for (let y = 44; y < 48; y++) P.set(x, y, bot(y === 44 ? .8 : .45, x, y)); P.rect(CX + 3, 41, 4, 7, bot(.55, 0, 0)); P.rect(CX + 3, 46, 5, 2, BOOT(.5, 0, 0));
  } else {
    const run = p.run, legs = st < 0 ? [[CX - 6, 0], [CX - 1, 0]] : (run ? [[[CX - 9, 0], [CX + 3, -2]], [[CX - 5, -2], [CX, -1]], [[CX + 3, -2], [CX - 9, 0]], [[CX, -1], [CX - 5, -2]]] : [[[CX - 8, 0], [CX + 2, -1]], [[CX - 5, -1], [CX - 2, 0]], [[CX + 2, -1], [CX - 8, 0]], [[CX - 2, 0], [CX - 5, -1]]])[st];
    legs.forEach(([lx, ly], i) => {
      const lw = kid ? 3 : 4;
      for (let y = hip; y < 48 + ly; y++) for (let x = lx; x < lx + lw; x++) P.set(x, y, (y > 44 + ly + (kid ? -2 : 0) ? BOOT : bot)(y > 44 + ly ? .35 : (i ? .55 : .85) - (x === lx ? .25 : 0), x, y));
      P.rect(lx, 47 + ly, lw + 1, 1, BOOT(.1, 0, 0));
    });
  }
  // ---- badan (tunik / gaun)
  const dress = !!L.dress, bot2 = p.sit ? hip + 4 : (dress ? 45 : hip + 3), l0 = CX - 5, r0 = CX + 6, fl = dress ? 3 : 0;
  const bw = L.round ? 2 : 0;
  P.poly([[l0 - bw + lean * .4, sh], [r0 + bw + lean, sh], [r0 + 1 + bw + fl + lean * .3, bot2], [l0 - 1 - bw - fl, bot2]], (x, y) => {
    const u = (y - sh) / (bot2 - sh || 1), l = (l0 - bw) * (1 - u) + (l0 - 1 - bw - fl) * u, r = (r0 + bw) * (1 - u) + (r0 + 1 + bw + fl) * u, s = (x - l) / (r - l || 1);
    let v = .7 - s * .45 + (1 - u) * .1; if (L.stripe && ((y >> 2) & 1)) v -= .12; if (dress && (x + (y >> 2)) % 5 === 0 && u > .35) v -= .15;
    return top(v, x, y);
  });
  if (L.apron) for (let y = sh + 7; y < bot2; y++) for (let x = CX + 1; x < CX + 8; x++) P.set(x, y, L.apron(.75 - (x - CX) * .04, x, y));
  if (L.tabard) { for (let y = sh; y < hip + 5; y++) for (let x = CX - 2; x < CX + 4; x++) P.set(x, y, L.tabard(.8 - (x - CX) * .06 + (y > hip ? -.1 : 0), x, y)); P.rect(CX - 1, sh + 3, 3, 2, L.tabard(.95, 0, 0)); }
  // sabuk (+ kunci besi)
  if (!dress || L.belt) { P.rect(l0 - 1, hip - 1, r0 - l0 + 4, 2, BOOT(.45, 0, 0)); P.set(CX + 1, hip - 1, BRASS(.95, 0, 0)); P.set(CX + 2, hip - 1, BRASS(.7, 0, 0)); }
  if (L.key && !p.kneel) { const kx = CX - 3, ky = hip + 1; P.set(kx, ky, BRASS(.9, 0, 0)); P.set(kx + 1, ky, BRASS(.9, 0, 0)); P.rect(kx, ky + 1, 1, 6, BRASS(.75, 0, 0)); P.rect(kx + 1, ky + 5, 2, 1, BRASS(.9, 0, 0)); P.rect(kx + 1, ky + 7, 2, 1, BRASS(.9, 0, 0)); P.set(kx - 1, ky, BRASS(.5, 0, 0)); }
  if (L.pack) { P.ellipse(CX - 8, sh + 4, 5, 6, (x, y, dx, dy) => L.pack(.6 - dx * .3 - dy * .25, x, y)); P.rect(CX - 9, sh + 1, 2, 2, STRAW(.5, 0, 0)); }
  if (L.satchel) { P.rect(CX + 2, hip - 2, 6, 6, L.satchel(.55, 0, 0)); P.rect(CX + 2, hip - 2, 6, 1, L.satchel(.9, 0, 0)); P.set(CX + 5, hip, BRASS(.95, 0, 0)); }
  // ---- kepala
  const hx = cx + (p.look || 0) + lean, fy = hy + 1;
  const hr = kid ? 5.6 : 5;
  if (L.hair !== 'none') { P.ellipse(hx - 1.5, hy - .5, hr + .8, hr + .6, (x, y, dx, dy) => (L.hairC || HAIR.brown)(.55 - dy * .3 - dx * .12, x, y)); if (L.hair === 'long') for (let y = hy; y < hy + 11; y++) for (let x = hx - 7; x < hx - 2; x++) P.set(x, y, (L.hairC || HAIR.brown)(.4 + ((x + y) % 3 ? .1 : 0), x, y)); if (L.hair === 'bun') P.ellipse(hx - 6, hy - 5, 2.3, 2.3, (x, y) => (L.hairC || HAIR.brown)(.7, x, y)); }
  P.ellipse(hx + 1.6, fy, hr - .4, hr - .2, (x, y, dx, dy) => skin(.62 - dx * .1 - dy * .3 + (dx > .55 ? -.2 : 0), x, y));
  if (L.hair !== 'none' && L.hair !== 'bald') for (let x = Math.floor(hx - 3); x <= hx + 5; x++) { const d = 1 + ((x * 7) % 3 === 0 ? 1 : 0); for (let y = Math.floor(fy - hr + .5); y < fy - hr + .5 + d + 1; y++) P.set(x, y, (L.hairC || HAIR.brown)(.55 + (x - hx) * .04, x, y)); }
  if (L.beard) P.poly([[hx - 1, fy + 1], [hx + 6, fy + 1], [hx + 5, fy + 5], [hx + 2, fy + 8], [hx - 1, fy + 6]], (x, y) => (L.beardC || HAIR.grey)(.7 - (y - fy) * .05 + ((x + y) % 4 === 0 ? -.15 : 0), x, y));
  // wajah: alis, mata, mulut
  const ex = Math.round(hx + 3.2), ey = Math.round(fy), eyeC = INK;
  const lk = p.head === 'up' ? -1 : 0, ey2 = ey + lk;
  if (p.blink || p.closed) { P.set(ex, ey2, skin(.2, 0, 0)); P.set(ex - 3, ey2, skin(.2, 0, 0)); if (p.closed) { P.set(ex, ey2, INK); P.set(ex - 3, ey2, INK); } }
  else { P.set(ex, ey2, eyeC); P.set(ex, ey2 - 1, eyeC); P.set(ex - 3, ey2, eyeC); P.set(ex - 3, ey2 - 1, eyeC); }
  if (L.brow !== false) { P.set(ex, ey2 - 2 + (p.brow || 0), HAIR.black(.4, 0, 0)); P.set(ex + 1, ey2 - 2 + (p.brow || 0), HAIR.black(.4, 0, 0)); P.set(ex - 3, ey2 - 2 + (p.brow || 0), HAIR.black(.4, 0, 0)); P.set(ex - 4, ey2 - 2 + (p.brow || 0), HAIR.black(.4, 0, 0)); }
  const my = ey2 + 3, mo = p.mouth || 'n';
  if (mo === 'grin') { P.rect(ex - 2, my, 5, 1, hex('#fff4e8')); P.set(ex - 3, my - 1, INK); P.set(ex + 3, my - 1, INK); P.rect(ex - 2, my + 1, 5, 1, INK); P.rect(ex - 2, my - 1, 5, 1, INK); }
  else if (mo === 'smile') { P.set(ex - 2, my, INK); P.set(ex - 1, my + 1, INK); P.set(ex, my + 1, INK); P.set(ex + 1, my, INK); }
  else if (mo === 'open') { P.rect(ex - 1, my, 3, 2, INK); }
  else if (mo === 'sigh') { P.rect(ex - 1, my, 3, 1, INK); P.set(ex + 3, my - 1, skin(.3, 0, 0)); }
  else if (mo === 'frown') { P.set(ex - 1, my, INK); P.set(ex, my - 1, INK); P.set(ex + 1, my, INK); }
  else { P.rect(ex - 1, my, 3, 1, skin(.25, 0, 0)); }
  if (L.cheek || p.flush) { const c = p.flush ? hex('#e8452a') : hex('#e8907a'); P.rect(ex - 3, my - 1, 2, 2, c); P.rect(ex + 1, my - 1, 2, 2, c); if (p.flush) { P.rect(ex - 4, my, 1, 1, c); P.rect(ex + 3, my, 1, 1, c); } }
  P.set(Math.round(hx + 6.4), Math.round(fy + 1), skin(.4, 0, 0));
  // penutup kepala
  const hw = L.headwear;
  if (hw === 'helm') { P.ellipse(hx + .2, hy - 3.6, hr + 1.2, 3.4, (x, y, dx, dy) => STEEL(.72 - dy * .3 - dx * .25, x, y)); P.rect(hx - 6, hy - 1, 14, 1, STEEL(.3, 0, 0)); P.rect(hx - 6, hy - 2, 14, 1, STEEL(.85, 0, 0)); P.rect(hx - 6, hy - 1, 3, 6, STEEL(.4, 0, 0)); P.set(hx + 1, hy - 7, STEEL(.95, 0, 0)); }
  if (hw === 'cap') { P.ellipse(hx + .5, hy - 3.5, hr + 1.4, 3.2, (x, y, dx, dy) => (L.hat || shade('#4a4a60'))(.62 - dy * .3, x, y)); P.rect(hx + 3, hy - 2, 6, 1, (L.hat || shade('#4a4a60'))(.25, 0, 0)); }
  if (hw === 'hat') { P.ellipse(hx + .5, hy - 4, 10, 2, (x, y, dx) => STRAW(.75 - Math.abs(dx) * .2, x, y)); P.ellipse(hx + .5, hy - 6, 5, 3.4, (x, y, dx, dy) => STRAW(.6 - dy * .2, x, y)); P.rect(hx - 4, hy - 5, 9, 1, (L.hat || shade('#8a3a2a'))(.7, 0, 0)); }
  if (hw === 'kerchief') { const KC = L.hat || shade('#a8402a'); P.ellipse(hx - 1.2, hy - 2.8, hr + .6, 3.4, (x, y, dx, dy) => KC(.7 - dy * .3 - dx * .15, x, y)); P.rect(hx - 7, hy - 2, 4, 7, KC(.55, 0, 0)); P.poly([[hx - 7, hy + 4], [hx - 11, hy + 7], [hx - 6, hy + 8]], KC(.4, 0, 0)); P.rect(hx - 4, hy - 5, 9, 1, KC(.95, 0, 0)); }
  if (hw === 'hood') { P.ellipse(hx - .5, hy - .5, hr + 2, hr + 1.6, (x, y, dx, dy) => top(.62 - dx * .3 - dy * .25, x, y)); P.ellipse(hx + 2, fy, hr - .6, hr - .4, (x, y, dx, dy) => skin(.62 - dy * .3, x, y)); P.set(ex, ey2, INK); P.set(ex, ey2 - 1, INK); P.set(ex - 3, ey2, INK); P.set(ex - 3, ey2 - 1, INK); }
  // ---- lengan
  const sx = CX + 4 + lean, sy = sh + 2, sl = L.sleeve || top, arm = p.arm || 'low', sw = st < 0 ? 0 : [2, 0, -2, 0][st] * (p.run ? 2 : 1);
  const far = (x, y) => limb(P, CX - 4 + lean * .5, sy, x, y, sl, skin, true, .3);
  const nearL = (x, y) => limb(P, sx, sy, x, y, sl, skin, true, .62);
  const A = {
    low: () => { far(CX - 4 - sw, sy + 11); nearL(sx + sw, sy + 11); },
    swing: () => { far(CX - 2 + sw, sy + 10); nearL(sx - sw, sy + 10); },
    carry: () => { far(sx + 7, sy + 7); nearL(sx + 9, sy + 8); },
    up: () => { far(CX - 4, sy + 11); nearL(sx + 6, sy - 9); },
    point: () => { far(CX - 4, sy + 11); nearL(sx + 12, sy + 1); },
    knock: () => { far(CX - 4, sy + 11); nearL(sx + 10 + (p.k || 0), sy + 7 + (p.k ? -1 : 0)); },
    push: () => { far(sx + 8, sy + 7); nearL(sx + 10, sy + 6); },
    pushUp: () => { far(sx + 5, sy - 6); nearL(sx + 8, sy - 8); },
    lamp: () => { far(CX - 4 - sw, sy + 11); nearL(sx + 1, sy + 10); lantern(P, E, sx - 1, sy + 10, p.lit ?? 1); },
    lampUp: () => { far(CX - 4, sy + 11); nearL(sx + 6, sy - 8); lantern(P, E, sx + 4, sy - 14, p.lit ?? 1); },
    lampFwd: () => { far(CX - 4, sy + 11); nearL(sx + 9, sy + 4); lantern(P, E, sx + 8, sy + 4, p.lit ?? 1); },
    hold: () => { far(sx + 5, sy + 8); nearL(sx + 6, sy + 9); },
    purse: () => { far(CX - 4, sy + 11); nearL(sx + 8, sy + 9); P.rect(sx + 8, sy + 10, 4, 4, BOOT(.55, 0, 0)); P.set(sx + 9, sy + 10, BRASS(.9, 0, 0)); },
    hips: () => { far(CX - 6, sy + 7); nearL(sx + 3, sy + 8); },
    rest: () => { far(CX - 3, sy + 10); nearL(sx + 3, sy + 12); },
  };
  (A[arm] || A.low)();
  // ---- barang bawaan
  const it = p.item || L.item;
  if (it === 'basket') { const bx = sx + 3, byy = sy + 6; P.ellipse(bx + 6, byy + 5, 8, 5.5, (x, y, dx, dy) => STRAW(.5 - dy * .25 + ((x + y) % 3 ? 0 : .1), x, y)); P.rect(bx - 2, byy + 2, 16, 1, STRAW(.2, 0, 0)); if (p.straw !== 0) { for (let i = 0; i < 12; i++) P.set(bx - 1 + i, byy + 1 + (i % 3 === 0 ? -1 : 0), STRAW(.9, 0, 0)); for (let i = 0; i < 4; i++) P.ellipse(bx + 2 + i * 3, byy - 1, 1.4, 1.2, EGG(.7, 0, 0)); } nearL(sx + 8, sy + 7); }
  if (it === 'sack') P.ellipse(sx + 7, sy + 5, 5, 6, (x, y, dx, dy) => (L.sack || STRAW)(.55 - dx * .2 - dy * .25, x, y));
  if (it === 'bundle') { P.ellipse(sx + 6, sy + 4, 6, 4.5, (x, y, dx, dy) => (L.bundle || shade('#c9b89a'))(.62 - dy * .3 - dx * .15, x, y)); P.rect(sx + 1, sy + 4, 11, 1, (L.bundle || shade('#c9b89a'))(.25, 0, 0)); }
  if (it === 'bag') { P.rect(sx + 3, sy + 9, 8, 7, shade('#6a3c20')(.6, 0, 0)); P.rect(sx + 3, sy + 9, 8, 1, shade('#6a3c20')(.9, 0, 0)); P.rect(sx + 6, sy + 11, 2, 3, hex('#e8e0d0')); P.rect(sx + 5, sy + 12, 4, 1, hex('#e8e0d0')); }
  if (it === 'bowl') { P.ellipse(sx + 8, sy + 8, 4, 2.2, (x, y, dx, dy) => STRAW(.55 - dy * .3, x, y)); P.rect(sx + 5, sy + 8, 7, 1, hex('#d98a3a')); P.set(sx + 7, sy + 5, hex('#cfc8c0')); P.set(sx + 9, sy + 3, hex('#aaa4a0')); P.set(sx + 8, sy + 1, hex('#8a8688')); }
  if (it === 'blanket') { P.ellipse(sx + 6, sy + 6, 7, 5, (x, y, dx, dy) => shade('#c0453a')(.62 - dy * .3 - dx * .1, x, y)); P.rect(sx - 1, sy + 3, 14, 1, shade('#e8d8a8')(.8, 0, 0)); }
  if (it === 'cloth') { P.rect(sx + 2, sy + 6, 12, 5, shade('#d8d2c0')(.7, 0, 0)); P.rect(sx + 2, sy + 6, 12, 1, shade('#d8d2c0')(.95, 0, 0)); }
  // anak di bahu / di pelukan
  if (p.child === 'shoulder') {
    P.ellipse(CX - 5, sh + 8, 5, 8, (x, y, dx, dy) => shade('#86a2cc')(.6 - dx * .3 - dy * .2, x, y));
    P.ellipse(CX - 9, sh + 13, 4.4, 4.4, (x, y, dx, dy) => SKIN.c(.6 - dy * .3, x, y)); P.ellipse(CX - 10, sh + 10.4, 4.7, 2, (x, y) => HAIR.black(.5, x, y));
    P.rect(CX - 11, sh + 14, 2, 2, hex('#e8452a')); P.rect(CX - 8, sh + 14, 2, 2, hex('#e8452a')); P.rect(CX - 11, sh + 16, 3, 1, INK);
    limb(P, CX - 4, sh + 13, CX - 2, sh + 25, shade('#86a2cc'), SKIN.c, true, .45); P.rect(CX - 6, sh + 14, 2, 8, shade('#86a2cc')(.4, 0, 0)); P.rect(CX - 6, sh + 22, 3, 3, BOOT(.5, 0, 0));
  }
  if (p.child === 'arms') {   // berlutut/berdiri: anak di pelukan
    P.ellipse(CX + 9, sh + 8, 7, 4.2, (x, y, dx, dy) => shade('#86a2cc')(.62 - dy * .3 - dx * .1, x, y));
    P.ellipse(CX + 15, sh + 6, 4.4, 4.4, (x, y, dx, dy) => SKIN.c(.62 - dy * .3, x, y)); P.ellipse(CX + 14, sh + 3.4, 4.6, 2, (x, y) => HAIR.black(.5, x, y));
    P.rect(CX + 14, sh + 7, 2, 2, hex('#e8452a')); P.rect(CX + 17, sh + 7, 2, 2, hex('#e8452a'));
    P.rect(CX + 3, sh + 9, 5, 2, shade('#86a2cc')(.4, 0, 0)); P.rect(CX + 2, sh + 12, 3, 3, SKIN.a(.55, 0, 0));
    limb(P, sx, sy, sx + 6, sy + 8, sl, skin, true, .6);
  }
  if (p.glow) { /* titik emisif kecil untuk tanda kunci dll. */ }
}

// ---- Daftar tokoh ----
const TEAL = shade('#17b3a0');
export const LOOKS = {
  najmi: { skin: 'b', hair: 'short', hairC: HAIR.black, top: shade('#7a6a50'), sleeve: shade('#8a7a5e'), tabard: TEAL, bot: shade('#3e3426'), headwear: 'helm', key: true, brow: true },
  laras: { skin: 'a', hair: 'none', headwear: 'kerchief', hat: shade('#b8502a'), top: shade('#5a7a42'), dress: true, apron: shade('#e8dcc0'), belt: true, round: true, brow: true },
  pedagang: { skin: 'c', hair: 'short', hairC: HAIR.brown, headwear: 'hat', hat: shade('#8a3a2a'), top: shade('#b06a30'), bot: shade('#4a3a2a'), item: 'basket', round: true },
  perempuan: { skin: 'a', hair: 'none', headwear: 'kerchief', hat: shade('#7a5a8a'), top: shade('#8a4a38'), dress: true, brow: true },
  tabib: { skin: 'c', hair: 'none', beard: true, beardC: HAIR.grey, headwear: 'cap', hat: shade('#3a3a52'), top: shade('#5a4a78'), dress: true, belt: true, item: 'bag', brow: true },
  anak: { skin: 'c', hair: 'short', hairC: HAIR.black, top: shade('#86a2cc'), bot: shade('#5a4a38'), kid: true, cheek: true },
};
// variasi warga: palet pakaian (hindari turkuaz = milik Najmi)
const CLOTHES = ['#8a5a3a', '#6a7a3a', '#a8803a', '#7a4a52', '#5a6a8a', '#9a6a4a', '#6a5a3a', '#b0803a', '#8a8a6a', '#7a5a7a'];
const SKINS = ['a', 'b', 'c', 'd'], HAIRS = ['black', 'brown', 'grey', 'red', 'blond'];
export function villager(seed, o = {}) {
  const h = (k) => { let x = Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
  const pick = (a, k) => a[Math.floor(h(k) * a.length)];
  const fem = o.fem ?? h(1) > .5;
  const L = { skin: pick(SKINS, 2), hair: fem ? pick(['long', 'bun', 'short'], 3) : pick(['short', 'short', 'bald'], 3), hairC: HAIR[pick(HAIRS, 4)], top: shade(pick(CLOTHES, 5)), bot: shade(pick(CLOTHES, 6)), dress: fem && h(7) > .35, round: h(8) > .7, brow: true,
    headwear: pick(['none', 'cap', 'hat', 'kerchief', 'none'], 9), hat: shade(pick(CLOTHES, 10)), beard: !fem && h(11) > .75, beardC: HAIR.brown, key: false };
  if (!fem && L.hair === 'bald') L.hair = 'short';
  if (o.item) L.item = o.item; if (o.pack) L.pack = shade('#a08838'); if (o.sack) L.sack = shade(pick(['#c8b890', '#b8a070', '#a89870'], 12));
  return { ...L, ...(o.over || {}) };
}

export const POSES = {
  idle0: { arm: 'low' }, idle1: { arm: 'low', bob: 1 }, blink: { arm: 'low', blink: 1 }, rest: { arm: 'rest' }, hips: { arm: 'hips' },
  w0: { step: 0, arm: 'swing', bob: 0 }, w1: { step: 1, arm: 'swing', bob: -1 }, w2: { step: 2, arm: 'swing', bob: 0 }, w3: { step: 3, arm: 'swing', bob: -1 },
  c0: { step: 0, arm: 'carry' }, c1: { step: 1, arm: 'carry', bob: -1 }, c2: { step: 2, arm: 'carry' }, c3: { step: 3, arm: 'carry', bob: -1 },
  l0: { step: 0, arm: 'lamp', bob: 0 }, l1: { step: 1, arm: 'lamp', bob: -1 }, l2: { step: 2, arm: 'lamp' }, l3: { step: 3, arm: 'lamp', bob: -1 },
  r0: { step: 0, arm: 'lampFwd', run: 1, lean: 1 }, r1: { step: 1, arm: 'lampFwd', run: 1, bob: -1, lean: 1 }, r2: { step: 2, arm: 'lampFwd', run: 1, lean: 1 }, r3: { step: 3, arm: 'lampFwd', run: 1, bob: -1, lean: 1 },
  s0: { step: 0, arm: 'swing', run: 1, lean: 1 }, s1: { step: 1, arm: 'swing', run: 1, bob: -1, lean: 1 }, s2: { step: 2, arm: 'swing', run: 1, lean: 1 }, s3: { step: 3, arm: 'swing', run: 1, bob: -1, lean: 1 },
  up: { arm: 'up' }, point: { arm: 'point' }, knock0: { arm: 'knock', k: 0 }, knock1: { arm: 'knock', k: 2 }, push: { arm: 'push' }, pushUp: { arm: 'pushUp', bob: 1 },
  lamp: { arm: 'lamp' }, lampUp: { arm: 'lampUp' }, lampDim: { arm: 'lamp', lit: .35 }, lampOut: { arm: 'lamp', lit: .08 }, lampLow: { arm: 'lamp', lit: .6 },
  hold: { arm: 'hold' }, purse: { arm: 'purse' }, look: { arm: 'low', head: 'up' }, down: { arm: 'low', head: 'down' }, nod: { arm: 'low', head: 'down', bob: 1 },
  grin: { arm: 'low', mouth: 'grin' }, grin1: { arm: 'low', mouth: 'grin', bob: 1 }, sigh: { arm: 'purse', mouth: 'sigh', head: 'down' }, smile: { arm: 'low', mouth: 'smile' },
  surprise: { arm: 'low', mouth: 'open', brow: -1 }, sit: { sit: 1, arm: 'rest', head: 'down' }, sit1: { sit: 1, arm: 'rest', head: 'down', bob: 1 }, sitLamp: { sit: 1, arm: 'lamp', head: 'down', lit: .5 },
  kneel: { kneel: 1, arm: 'low' }, kneelUp: { kneel: 1, arm: 'lampUp' }, kneelUp1: { kneel: 1, arm: 'lampUp', bob: 1 }, kneelChild: { kneel: 1, arm: 'low', child: 'arms', head: 'down' },
  carryChild: { arm: 'low', child: 'arms', head: 'down' }, carryChildW: { arm: 'low', child: 'arms', head: 'down', step: 1, bob: -1 },
  st0: { step: 0, arm: 'low', child: 'shoulder', lean: 2, head: 'down', mouth: 'open' }, st1: { step: 1, arm: 'low', child: 'shoulder', lean: 2, bob: -1, head: 'down', mouth: 'open' },
  st2: { step: 2, arm: 'low', child: 'shoulder', lean: 2, head: 'down', mouth: 'open' }, st3: { step: 3, arm: 'low', child: 'shoulder', lean: 2, bob: -1, head: 'down', mouth: 'open' },
  fast0: { step: 0, arm: 'low', child: 'shoulder', lean: 3, run: 1, head: 'down' }, fast1: { step: 1, arm: 'low', child: 'shoulder', lean: 3, run: 1, bob: -1, head: 'down' }, fast2: { step: 2, arm: 'low', child: 'shoulder', lean: 3, run: 1, head: 'down' }, fast3: { step: 3, arm: 'low', child: 'shoulder', lean: 3, run: 1, bob: -1, head: 'down' },
  stumble: { kneel: 1, arm: 'low', child: 'shoulder', head: 'down' }, hugKid: { arm: 'low', child: 'shoulder', head: 'up' },
  sag: { arm: 'low', head: 'down', bob: 1, mouth: 'sigh' }, kneelSag: { kneel: 1, arm: 'rest', head: 'down' },
  sick: { arm: 'low', head: 'down', flush: 1, mouth: 'open' }, sick1: { arm: 'low', head: 'down', flush: 1, mouth: 'open', bob: 1 },
  bowl: { arm: 'hold', item: 'bowl' }, bowl1: { step: 1, arm: 'hold', item: 'bowl', bob: -1 }, bowl0: { step: 0, arm: 'hold', item: 'bowl' }, bowl2: { step: 2, arm: 'hold', item: 'bowl' }, bowl3: { step: 3, arm: 'hold', item: 'bowl', bob: -1 },
  blk0: { step: 0, arm: 'hold', item: 'blanket' }, blk1: { step: 1, arm: 'hold', item: 'blanket', bob: -1 }, blk2: { step: 2, arm: 'hold', item: 'blanket' }, blk3: { step: 3, arm: 'hold', item: 'blanket', bob: -1 },
  cloth: { arm: 'hold', item: 'cloth' }, bundle: { arm: 'hold', item: 'bundle' },
  bk0: { step: 0, arm: 'carry', item: 'basket' }, bk1: { step: 1, arm: 'carry', item: 'basket', bob: -1 }, bk2: { step: 2, arm: 'carry', item: 'basket' }, bk3: { step: 3, arm: 'carry', item: 'basket', bob: -1 },
  bkStand: { arm: 'carry', item: 'basket', mouth: 'grin' }, bkStand1: { arm: 'carry', item: 'basket', mouth: 'grin', bob: 1 }, bkEmpty: { arm: 'carry', item: 'basket', straw: 0, mouth: 'sigh' }, bkSigh: { arm: 'purse', mouth: 'sigh', head: 'down' },
  sk0: { step: 0, arm: 'swing', item: 'sack' }, sk1: { step: 1, arm: 'swing', item: 'sack', bob: -1 }, sk2: { step: 2, arm: 'swing', item: 'sack' }, sk3: { step: 3, arm: 'swing', item: 'sack', bob: -1 },
};

// Atlas + objek karakter (frame dipilih per frame render)
export function makePerson(look, poseNames) {
  const L = look, names = [...new Set(poseNames)], n = names.length;
  const P = new PX(FW * n, FH), E = new PX(FW * n, FH);
  names.forEach((k, i) => {
    const p1 = new PX(FW, FH), e1 = new PX(FW, FH); const pose = POSES[k]; if (!pose) throw new Error('pose ' + k);
    drawPerson(p1, e1, pose, { ...L, item: pose.item ?? L.item }); p1.outline(.3);
    for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) { const c = p1.get(x, y); if (c) P.set(i * FW + x, y, c); const e = e1.get(x, y); if (e) E.set(i * FW + x, y, e); }
  });
  const tex = texOf(P.done()), em = texOf(E.done()); for (const t of [tex, em]) t.repeat.set(1 / n, 1);
  const scale = L.kid ? 1 : 1;
  const mesh = billboard(tex, FW * SPX * scale, FH * SPX * scale, { em, emCol: '#ffffff', emI: 2.2 });
  const root = new THREE.Group(); root.add(mesh); root.userData.char = L === LOOKS.najmi ? 'najmi' : 'npc';
  const sh = blob(.4, .5); sh.position.y = .015; root.add(sh);
  const api = {
    root, mesh, names, shadow: sh, flip: false, canvas: P.c,
    frame(name) { let i = names.indexOf(name); if (i < 0) i = 0; tex.offset.x = em.offset.x = i / n; },
    face(cam, flip) { root.rotation.y = Math.atan2(cam.position.x - root.position.x, cam.position.z - root.position.z); mesh.scale.x = flip ? -1 : 1; api.flip = !!flip; },
    // posisi lentera di dunia (perkiraan dari piksel pose lampUp/lamp/lampFwd)
    lanternPos(arm = 'lamp') {
      const hip = 36, sh0 = hip - 16, sx = CX + 4, sy = sh0 + 2, M = { lamp: [sx + 1.5, sy + 13], lampUp: [sx + 6.5, sy - 11], lampFwd: [sx + 10.5, sy + 7] }[arm] || [sx + 1.5, sy + 13];
      const f = api.flip ? -1 : 1, v = new THREE.Vector3((M[0] - FW / 2) * SPX * f, (FH - M[1]) * SPX, .08); v.applyAxisAngle(new THREE.Vector3(0, 1, 0), root.rotation.y); return v.add(root.position);
    },
  };
  return api;
}
