// Karakter pixel-art: dilukis prosedural piksel demi piksel (tampak 3/4 samping, menghadap kanan), satu frame per pose, dipaket jadi atlas.
// Billboard menerima cahaya dan melempar bayangan (px.js). Satu fungsi gambar + palet = banyak orang.
import * as THREE from 'three';
import { PX, ramp, hex, texOf, billboard, blob } from '../vendor/px.js';

export const SPX = 1 / 30;      // piksel karakter → meter
export const FW = 40, FH = 50;  // ukuran frame (piksel)

const R = (cols, k = .22) => ramp(cols, k);
const INK = hex('#1a1016');

// —— palet kulit ——
export const SKIN = {
  tan:   R(['#7a4a34', '#a0674a', '#c28a66', '#dcab86']),
  dark:  R(['#4e2c20', '#74432f', '#98603f', '#b97d57']),
  light: R(['#98604a', '#c28a68', '#e0ac88', '#f2c8a4']),
};
// —— kain / pakaian ——
const fab = (a, b, c, d) => R([a, b, c, d]);
export const CLOTH = {
  cobalt:  fab('#0f2a6e', '#1b46b0', '#2b64e0', '#5a8cf4'),   // kostum pahlawan: biru kobalt jenuh (tak dipakai set mana pun)
  cream:   fab('#6c5a3a', '#a3895a', '#d2b985', '#efdcaa'),
  white:   fab('#7d7f86', '#b4b6bc', '#dcdde0', '#f6f5f0'),
  maroon:  fab('#2e0c14', '#561a24', '#7e2a34', '#a6404a'),
  brown:   fab('#241610', '#3f281b', '#5e3d27', '#7f573a'),
  batik:   fab('#1a1108', '#33230f', '#54391a', '#7a5a2c'),
  green:   fab('#14301e', '#235235', '#39774b', '#5da36a'),
  ochre:   fab('#5a3b0c', '#946016', '#c98d2a', '#efbf55'),
  red:     fab('#4a0f0c', '#80221a', '#b13a28', '#d9603e'),
  indigo:  fab('#0e1226', '#1c2448', '#2e3b6e', '#44558f'),
  teal:    fab('#0c3030', '#175a56', '#28827a', '#4fb0a2'),
  grey:    fab('#2a2a30', '#4a4a52', '#6e6e78', '#95959e'),
  sack:    fab('#5a4528', '#86693c', '#b08f58', '#d3b57c'),
  saffron: fab('#7a4a08', '#c27a12', '#f0a824', '#ffd060'),
  rose:    fab('#5a1a34', '#923258', '#c8567e', '#ee86a6'),
};
const HAIR = { black: R(['#0c0a0c', '#1c161a', '#32282a', '#4a3c3a']), grey: R(['#5a5a62', '#8a8a92', '#b4b4bc', '#dcdce2']), brown: R(['#2a1810', '#47281a', '#6a4028', '#8c5c3a']) };
const BRASS = R(['#3e2a10', '#7a5a24', '#b88c3e', '#e6c26a']);
const GLASS = R(['#ff8a1c', '#ffc14a', '#ffe79a', '#fffbe6']);
const SEED = R(['#2a1608', '#4a2a12', '#6e4220', '#946034']);
const MACE = R(['#7a1a0c', '#b8341a', '#e0561f', '#ff8a3a']);

// —— gaya orang (kunci → rupa) ——
export const LOOKS = {
  najmi:    { skin: 'tan',   shirt: 'cobalt',  sarong: 'batik',  head: 'iket',    cloth: 'saffron', hair: 'black', trim: 'saffron', belt: 'ochre' },
  paman:    { skin: 'tan',   shirt: 'white',   vest: 'maroon', sarong: 'brown',  head: 'blangkon', cloth: 'brown', hair: 'grey', beard: 'grey', belt: 'ochre', stout: 1 },
  seller:   { skin: 'dark',  shirt: 'cream',   sarong: 'red',  head: 'iket', cloth: 'white', hair: 'black', belt: 'brown', stache: 1 },
  seller2:  { skin: 'dark',  shirt: 'ochre',   sarong: 'green', head: 'iket', cloth: 'red', hair: 'black', belt: 'brown' },
  woman1:   { skin: 'dark',  shirt: 'rose',    sarong: 'indigo', head: 'bun', hair: 'black', woman: 1, belt: 'ochre' },
  woman2:   { skin: 'tan',   shirt: 'teal',    sarong: 'batik', head: 'bun', hair: 'black', woman: 1, belt: 'red' },
  crew1:    { skin: 'dark',  shirt: null,      sarong: 'indigo', head: 'iket', cloth: 'red', hair: 'black', belt: 'cream' },
  crew2:    { skin: 'tan',   shirt: null,      sarong: 'brown',  head: 'none', hair: 'black', belt: 'cream' },
  crew3:    { skin: 'light', shirt: 'grey',    sarong: 'cream', head: 'iket', cloth: 'indigo', hair: 'black', belt: 'brown' },
  turban:   { skin: 'light', shirt: 'white',   vest: 'teal', sarong: 'white', head: 'turban', cloth: 'white', hair: 'black', beard: 'black', belt: 'ochre' },
  turban2:  { skin: 'tan',   shirt: 'red',     sarong: 'cream', head: 'turban', cloth: 'ochre', hair: 'black', stache: 1, belt: 'brown' },
  caping:   { skin: 'light', shirt: 'green',   sarong: 'grey', head: 'caping', cloth: 'sack', hair: 'black', belt: 'brown' },
  caping2:  { skin: 'tan',   shirt: 'indigo',  sarong: 'brown', head: 'caping', cloth: 'sack', hair: 'black', belt: 'cream' },
  kid:      { skin: 'dark',  shirt: 'ochre',   sarong: 'brown', head: 'none', hair: 'black', kid: 1, belt: 'brown' },
};

// —— barang yang dipegang ——
function sack(P, x, y, w, h, tone = 1) {
  const S = CLOTH.sack;
  P.poly([[x + 1, y + 2], [x + w - 2, y + 2], [x + w, y + 6], [x + w, y + h - 1], [x + w - 2, y + h], [x + 2, y + h], [x, y + h - 1], [x, y + 6]], (X, Y) => {
    const u = (X - x) / w, v = (Y - y) / h; let c = .55 * tone + (1 - u) * .15 - v * .12 + (((X * 7 + Y * 3) % 5) === 0 ? -.12 : 0); if ((X + Y) % 4 === 0) c += .05; return S(c, X, Y);
  });
  P.rect(x + 2, y, w - 4, 3, S(.3, 0, 0)); P.rect(x + 3, y + 1, w - 6, 1, S(.8, 0, 0)); P.set(x + (w >> 1), y + 3, S(.15, 0, 0));   // leher karung terikat
}
function lantern(P, E, x, y, lit = 1) {
  P.set(x + 2, y - 2, BRASS(.4, 0, 0)); P.set(x + 1, y - 1, BRASS(.6, 0, 0)); P.set(x + 3, y - 1, BRASS(.6, 0, 0)); P.rect(x, y, 5, 1, BRASS(.85, 0, 0));
  for (let j = 1; j <= 5; j++) for (let i = 0; i < 5; i++) {
    if (i === 0 || i === 4) { P.set(x + i, y + j, BRASS(i === 0 ? .7 : .35, i, j)); continue; }
    const cx = i - 2, cy = j - 3.2, r = Math.hypot(cx * 1.1, cy * .8), f = lit * (1.35 - r * .45);
    if (lit > .05 && f > .35) { const c = GLASS(Math.min(.99, f * .75), x + i, y + j); P.set(x + i, y + j, c); E && E.set(x + i, y + j, c); }
    else P.set(x + i, y + j, hex('#3a3440'));
  }
  P.rect(x, y + 6, 5, 1, BRASS(.55, 0, 0));
}
function nutmeg(P, E, x, y, big = false) {   // biji pala kecil di jari
  P.set(x, y, SEED(.75, 0, 0)); P.set(x + 1, y, SEED(.5, 0, 0)); P.set(x, y + 1, SEED(.4, 0, 0)); P.set(x + 1, y + 1, SEED(.3, 0, 0));
  if (big) { P.set(x - 1, y, SEED(.6, 0, 0)); P.set(x + 2, y + 1, SEED(.35, 0, 0)); P.set(x, y - 1, SEED(.9, 0, 0)); }
}
function coin(P, E, x, y) { P.set(x, y, BRASS(.95, 0, 0)); P.set(x + 1, y, BRASS(.7, 0, 0)); P.set(x, y + 1, BRASS(.6, 0, 0)); }

// —— satu orang ——
function drawPerson(P, E, p, L) {
  const SK = SKIN[L.skin], SH = L.shirt ? CLOTH[L.shirt] : null, SA = CLOTH[L.sarong], BE = CLOTH[L.belt || 'brown'], CL = L.cloth ? CLOTH[L.cloth] : CLOTH.cream, HR = HAIR[L.hair || 'black'];
  const lie = !!p.lie, sit = !!p.sit, lean = p.lean || 0;
  let by = (p.bob || 0) + (sit ? 9 : 0) + (L.kid ? 8 : 0);
  if (lie) return drawLying(P, E, p, L);
  const hx = 18 + lean, hy = 12 + by + (lean ? 1 : 0), top = 18 + by, stout = L.stout ? 1 : 0, woman = !!L.woman;
  const bot = sit ? 43 : 43;
  // —— tangan belakang (jauh) ——
  P.rect(10, top + 3, 2, 8, SH ? SH(.3, 0, 0) : SK(.3, 0, 0));
  // —— kaki ——
  if (sit) {
    // duduk: lutut ke depan, betis lurus
    P.rect(13, 44, 16, 3, SK(.45, 0, 0)); P.rect(27, 44, 3, 4, SK(.7, 0, 0)); P.rect(14, 46, 14, 1, SK(.25, 0, 0));
  } else {
    const st = p.step ?? -1;
    const legs = st < 0 ? [[15, 0], [20, 0]] : [[[13, 0], [22, -1]], [[16, -1], [19, 0]], [[22, -1], [13, 0]], [[19, 0], [16, -1]]][st];
    legs.forEach(([lx, ly], i) => { for (let y = 41; y < 48 + ly; y++) for (let x = lx; x < lx + 4; x++) P.set(x, y, SK((i ? .65 : .45) - (x === lx ? .15 : 0) - (y > 46 ? .1 : 0), x, y)); P.rect(lx, 47 + ly, 5, 1, SK(.2, 0, 0)); P.rect(lx + 1, 47 + ly, 5, 1, SK(.35, 0, 0)); });
  }
  // —— sarong (kain) ——
  const sx0 = 11 - stout, sx1 = 26 + stout, sy0 = top + 12, sy1 = sit ? 46 : (woman ? 46 : 43);
  P.poly([[sx0 + 1, sy0], [sx1 - 1, sy0], [sx1 + 1 + (sit ? 3 : 0), sy1], [sx0 - 1, sy1]], (x, y) => {
    const u = (y - sy0) / (sy1 - sy0), l = sx0 - u, r = sx1 + u, s = (x - l) / (r - l);
    let v = .62 - s * .4 + (1 - u) * .1;
    if ((x + (y >> 2)) % 6 === 0 && u > .2) v -= .12;                    // lipatan
    if (L.sarong === 'batik' && ((x + y) % 5 === 0 || (x - y + 40) % 7 === 0)) v += .25;   // pola batik sederhana
    if (L.sarong === 'red' && (x % 4 === 0 || y % 4 === 0)) v += .18;                      // kotak-kotak
    if (L.sarong === 'indigo' && (y % 6 === 2)) v += .15;
    if (u > .9) v -= .12;
    return SA(v, x, y);
  });
  // ikat pinggang
  P.rect(sx0, sy0 - 1, sx1 - sx0 + 1, 2, BE(.62, 0, 0)); P.set(sx1 - 3, sy0 - 1, BRASS(.95, 0, 0));
  // —— badan / baju ——
  const tL = 11 - stout, tR = 25 + stout + (lean > 0 ? 1 : 0);
  P.poly([[tL + 1, top], [tR - 1, top], [tR, sy0], [tL, sy0]], (x, y) => {
    const u = (y - top) / (sy0 - top), s = (x - tL) / (tR - tL);
    if (!SH) { let v = .58 - s * .38 + (y < top + 3 ? .1 : 0); if (y > top + 5 && s > .35 && s < .65) v += .06; return SK(v, x, y); }
    let v = .66 - s * .42 + (1 - u) * .12; if ((x + y) % 7 === 0 && u > .3) v -= .1;
    if (L.vest) { if (s < .18 || s > .82) return CLOTH[L.vest](.5 - s * .15, x, y); }
    return SH(v, x, y);
  });
  if (L.vest) { for (let y = top + 1; y < sy0; y++) { P.set(tL + 3, y, CLOTH[L.vest](.78, 0, 0)); P.set(tR - 3, y, CLOTH[L.vest](.3, 0, 0)); } }
  if (woman) { P.rect(tL + 2, top, tR - tL - 3, 1, SH ? SH(.9, 0, 0) : SK(.8, 0, 0)); }
  // —— leher + kepala ——
  P.rect(hx - 2, hy + 4, 5, 4, SK(.4, 0, 0));
  const fx = hx + 1.6 + (p.look || 0), fy = hy + .8 + (p.nod || 0);
  P.ellipse(hx, hy, 5.6, 6, (x, y, dx, dy) => SK(.62 - dx * .12 - dy * .26 + (dx > .7 ? -.18 : 0), x, y));
  // telinga
  P.set(hx - 3, hy + 1, SK(.4, 0, 0)); P.set(hx - 3, hy + 2, SK(.3, 0, 0));
  // rambut belakang
  if (L.head !== 'turban' && L.head !== 'caping') for (let y = hy - 5; y < hy + 1; y++) for (let x = hx - 6; x <= hx - 3; x++) if (Math.hypot(x - hx + .5, (y - hy) * .95) < 6.4) P.set(x, y, HR(.4 + (y % 2) * .1, x, y));
  // —— penutup kepala ——
  const H = L.head;
  if (H === 'iket') {
    for (let x = hx - 6; x <= hx + 5; x++) for (let y = hy - 6; y <= hy - 3; y++) if (Math.hypot(x - hx + .3, (y - hy + .8) * 1.1) < 6.4) P.set(x, y, CL(.7 - (x - hx) * .02 - (y - hy + 6) * .1 + ((x + y) % 3 === 0 ? .1 : 0), x, y));
    P.rect(hx - 7, hy - 4, 3, 3, CL(.4, 0, 0)); P.set(hx - 8, hy - 3, CL(.3, 0, 0)); P.set(hx - 7, hy - 5, CL(.55, 0, 0));
    for (let x = hx - 3; x <= hx + 5; x++) P.set(x, hy - 3, CL(.28, 0, 0));
  } else if (H === 'blangkon') {
    P.ellipse(hx - .5, hy - 3.2, 6.8, 4.2, (x, y, dx, dy) => CL(.6 - dy * .3 + (((x + y) % 4) === 0 ? .15 : 0), x, y)); P.rect(hx - 8, hy - 3, 3, 3, CL(.35, 0, 0));
    for (let x = hx - 5; x <= hx + 5; x++) P.set(x, hy - 1, CL(.25, 0, 0));
  } else if (H === 'turban') {
    P.ellipse(hx, hy - 3.4, 7.4, 5, (x, y, dx, dy) => CL(.7 - dy * .2 + (Math.abs((x - hx) + (y - hy) * 1.4) % 5 < 1 ? -.28 : 0), x, y)); P.rect(hx - 6, hy - 1, 12, 1, CL(.35, 0, 0)); P.set(hx + 1, hy - 7, BRASS(.9, 0, 0));
  } else if (H === 'caping') {
    P.poly([[hx - 12, hy - 3], [hx + 11, hy - 3], [hx + 1, hy - 11]], (x, y) => CL(.75 - (y - (hy - 11)) * .03 - (x - hx) * .01 + (((x + y) % 4) === 0 ? -.14 : 0), x, y));
    P.rect(hx - 12, hy - 3, 24, 1, CL(.25, 0, 0));
  } else if (H === 'bun') {
    for (let y = hy - 6; y < hy - 1; y++) for (let x = hx - 5; x <= hx + 4; x++) if (Math.hypot(x - hx + .3, (y - hy + .6) * 1.1) < 5.9) P.set(x, y, HR(.5 + (x - hx) * .03, x, y));
    P.ellipse(hx - 6, hy - 1, 3.2, 3.2, (x, y, dx, dy) => HR(.55 - dy * .2, x, y)); P.set(hx - 6, hy - 5, ramp(['#ee86a6', '#ffb0c8'])(.9, 0, 0));
  } else {   // none / rambut pendek
    for (let y = hy - 6; y <= hy - 2; y++) for (let x = hx - 5; x <= hx + 5; x++) if (Math.hypot(x - hx + .3, (y - hy + .6) * 1.05) < 6.2) P.set(x, y, HR(.55 + (x - hx) * .03 - (y - hy + 6) * .02, x, y));
  }
  // —— wajah ——
  const ey = Math.round(fy - .5), blink = p.blink;
  if (blink || p.closed) { P.set(Math.round(fx + 2), ey, SK(.15, 0, 0)); P.set(Math.round(fx - 1), ey, SK(.15, 0, 0)); }
  else { P.set(Math.round(fx + 2), ey, INK); P.set(Math.round(fx + 2), ey - 1, hex('#3a2a40')); P.set(Math.round(fx - 1), ey, INK); P.set(Math.round(fx - 1), ey - 1, hex('#3a2a40')); }
  if (p.brow) { P.set(Math.round(fx + 2), ey - 2, INK); P.set(Math.round(fx + 3), ey - 2 + (p.brow > 1 ? 1 : 0), INK); P.set(Math.round(fx - 1), ey - 2, INK); }
  P.set(Math.round(fx + 4), ey + 1, SK(.82, 0, 0)); P.set(Math.round(fx + 4), ey + 2, SK(.4, 0, 0));    // hidung
  if (p.talk) { P.rect(Math.round(fx + 2), ey + 3, 2, p.talk > 1 ? 2 : 1, hex('#5a1a1a')); } else { P.rect(Math.round(fx + 1), ey + 3, 3, 1, SK(.18, 0, 0)); }
  if (L.stache) { P.rect(Math.round(fx + 1), ey + 2, 4, 1, HR(.25, 0, 0)); }
  if (L.beard) { const B = HAIR[L.beard]; for (let y = ey + 2; y < ey + 8; y++) for (let x = Math.round(fx - 2); x <= fx + 4 - Math.max(0, y - ey - 4); x++) P.set(x, y, B(.7 - (y - ey) * .05 + (((x + y) % 3) === 0 ? -.12 : 0), x, y)); P.rect(Math.round(fx + 1), ey + 3, 4, 1, B(.85, 0, 0)); }
  if (L.kid) { /* anak: kepala sama, badan kecil sudah dari 'by' */ }
  // —— lengan dekat + barang ——
  const sl = (pts, col = SH) => pts.forEach(([x, y]) => { const c = col || SK; P.set(x, y, c(.62, x, y)); P.set(x, y + 1, c(.38, x, y)); P.set(x - 1, y + 1, c(.3, x, y)); });
  const hand = (x, y) => { P.rect(x, y, 3, 3, SK(.62, 0, 0)); P.set(x + 1, y + 2, SK(.35, 0, 0)); };
  const arm = p.arm || 'low', ty = top;
  if (arm === 'low') { sl([[24, ty + 2], [25, ty + 4], [25, ty + 6], [25, ty + 8], [25, ty + 10]]); hand(24, ty + 12); }
  else if (arm === 'swing') { sl([[24, ty + 2], [25, ty + 4], [26, ty + 6], [27, ty + 8]]); hand(27, ty + 10); }
  else if (arm === 'swingB') { sl([[24, ty + 2], [24, ty + 4], [23, ty + 6], [22, ty + 8]]); hand(21, ty + 10); }
  else if (arm === 'hold') {   // memegang biji pala dekat wajah
    sl([[24, ty + 2], [26, ty + 3], [28, ty + 2], [29, ty], [30, ty - 2]]); hand(30, ty - 5); nutmeg(P, E, 33, ty - 6, p.big); P.set(32, ty - 5, SK(.8, 0, 0));
  }
  else if (arm === 'offer') { sl([[24, ty + 2], [26, ty + 4], [28, ty + 5], [30, ty + 6]]); P.rect(31, ty + 6, 3, 2, SK(.7, 0, 0)); if (p.coin !== 0) { coin(P, E, 31, ty + 4); coin(P, E, 33, ty + 5); } }
  else if (arm === 'palm') { sl([[24, ty + 2], [26, ty + 4], [28, ty + 6], [29, ty + 7]]); P.rect(30, ty + 7, 4, 2, SK(.7, 0, 0)); if (p.seed) nutmeg(P, E, 31, ty + 5, true); }
  else if (arm === 'point') { sl([[24, ty + 2], [26, ty + 3], [28, ty + 3], [30, ty + 3], [32, ty + 3]]); P.rect(33, ty + 2, 3, 2, SK(.7, 0, 0)); P.set(36, ty + 2, SK(.55, 0, 0)); }
  else if (arm === 'talk') { const k = p.g || 0; sl([[24, ty + 2], [26, ty + 4 - k], [28, ty + 4 - k], [29, ty + 3 - k]]); hand(29, ty + 1 - k); }
  else if (arm === 'wave') { sl([[24, ty + 1], [25, ty - 1], [26, ty - 3], [27, ty - 5], [27, ty - 7]]); hand(26 + (p.w || 0), ty - 10); }
  else if (arm === 'up') { sl([[24, ty + 1], [25, ty - 2], [26, ty - 5], [27, ty - 8], [27, ty - 10]]); hand(26, ty - 13); }
  else if (arm === 'shoulder') {   // karung di bahu
    sack(P, 5, ty - 8, 16, 18, 1); sl([[24, ty + 1], [23, ty - 1], [22, ty - 3]]); hand(19, ty - 4);
  }
  else if (arm === 'front') {      // dua tangan memeluk karung di dada
    sack(P, 19, ty + 2, 14, 15, 1.05); sl([[24, ty + 3], [25, ty + 6], [25, ty + 9]]); hand(26, ty + 10);
  }
  else if (arm === 'lantern') { sl([[24, ty + 2], [25, ty + 4], [26, ty + 6], [27, ty + 7]]); hand(27, ty + 8); lantern(P, E, 25, ty + 11, p.lit ?? 1); }
  else if (arm === 'lanternHigh') { sl([[24, ty + 2], [26, ty + 3], [28, ty + 3], [29, ty + 3]]); hand(29, ty + 2); lantern(P, E, 28, ty + 5, p.lit ?? 1); }
  else if (arm === 'rope') { sl([[24, ty + 3], [27, ty + 5], [30, ty + 6], [32, ty + 7]]); hand(32, ty + 6); P.line(34, ty + 6, 39, ty + 9, CLOTH.sack(.45, 0, 0)); }
  else if (arm === 'reach') { sl([[24, ty + 4], [26, ty + 8], [28, ty + 12], [30, ty + 16]]); hand(30, ty + 17); }
  else if (arm === 'count') { sl([[24, ty + 2], [26, ty + 5], [27, ty + 7]]); hand(26, ty + 8); P.rect(29, ty + 8, 3, 1, SK(.85, 0, 0)); if (p.g) P.set(30, ty + 7, SK(.9, 0, 0)); }
  else if (arm === 'sniff') { sl([[24, ty + 2], [26, ty + 3], [28, ty + 1], [29, ty - 1]]); hand(29, ty - 3); nutmeg(P, E, 32, ty - 3, p.big); }
  else if (arm === 'knee') { sl([[24, ty + 4], [26, ty + 8], [27, ty + 11]]); hand(27, ty + 12); }
  else if (arm === 'basket') {     // keranjang di kepala (lengan terangkat)
    sl([[24, ty + 1], [25, ty - 2], [25, ty - 5], [24, ty - 8]]); hand(22, ty - 11);
    P.ellipse(hx - .5, hy - 8, 8, 2.4, (x, y, dx, dy) => CLOTH.sack(.55 - dy * .3 + (((x + y) % 3) === 0 ? .1 : 0), x, y)); P.ellipse(hx - .5, hy - 10, 6.5, 2, (x, y, dx, dy) => SEED(.55 + (((x + y) % 2) ? .15 : 0), x, y));
  }
  else if (arm === 'cross') { sl([[24, ty + 3], [24, ty + 6], [22, ty + 8], [20, ty + 8]]); hand(17, ty + 8); }
  if (p.sackBack) sack(P, 4, ty - 2, 14, 16, .95);
}
function drawLying(P, E, p, L) {   // tidur telentang di geladak: kepala kiri, kaki kanan
  const SK = SKIN[L.skin], SH = L.shirt ? CLOTH[L.shirt] : null, SA = CLOTH[L.sarong], CL = L.cloth ? CLOTH[L.cloth] : CLOTH.cream, HR = HAIR[L.hair || 'black'];
  const y0 = 38;
  // selimut kain menutup tubuh
  P.poly([[10, y0 + 2], [34, y0 + 1], [36, y0 + 11], [10, y0 + 11]], (x, y) => { let v = .55 + Math.sin(x * .5) * .1 - (y - y0) * .02 + (p.breath ? .05 : 0); if ((x + y) % 6 === 0) v -= .1; return CLOTH.green(v, x, y); });
  P.rect(35, y0 + 6, 4, 4, SK(.4, 0, 0));
  P.ellipse(8, y0 + 5, 5.6, 5.4, (x, y, dx, dy) => SK(.6 - dy * .2 - dx * .1, x, y));
  for (let y = y0; y < y0 + 4; y++) for (let x = 3; x <= 11; x++) if (Math.hypot(x - 8, (y - y0 - 5) * 1.1) < 6) P.set(x, y, CL(.6, x, y));
  P.set(10, y0 + 5, SK(.15, 0, 0)); P.set(12, y0 + 5, SK(.15, 0, 0)); P.set(12, y0 + 7, SK(.3, 0, 0));
  P.rect(8, y0 + 9, 5, 2, SH ? SH(.5, 0, 0) : SK(.4, 0, 0));
}

// tabel pose: nama → parameter
const T = {};
const add = (n, o) => { T[n] = o; };
add('idle0', { arm: 'low' }); add('idle1', { arm: 'low', bob: 1 }); add('blink', { arm: 'low', blink: 1 });
['w0', 'w1', 'w2', 'w3'].forEach((n, i) => add(n, { step: i, arm: i % 2 ? 'swingB' : 'swing', bob: i % 2 ? -1 : 0 }));
['c0', 'c1', 'c2', 'c3'].forEach((n, i) => add(n, { step: i, arm: 'shoulder', bob: i % 2 ? -1 : 0 }));
add('cIdle0', { arm: 'shoulder' }); add('cIdle1', { arm: 'shoulder', bob: 1 });
['f0', 'f1', 'f2', 'f3'].forEach((n, i) => add(n, { step: i, arm: 'front', bob: i % 2 ? -1 : 0 }));
add('fIdle0', { arm: 'front' }); add('fIdle1', { arm: 'front', bob: 1 });
['l0', 'l1', 'l2', 'l3'].forEach((n, i) => add(n, { step: i, arm: 'lantern', bob: i % 2 ? -1 : 0 }));
add('lIdle0', { arm: 'lantern' }); add('lIdle1', { arm: 'lantern', bob: 1 }); add('lHigh', { arm: 'lanternHigh' }); add('lHigh1', { arm: 'lanternHigh', bob: 1 });
['b0', 'b1', 'b2', 'b3'].forEach((n, i) => add(n, { step: i, arm: 'basket', bob: i % 2 ? -1 : 0 }));
add('bIdle', { arm: 'basket' });
add('hold0', { arm: 'hold' }); add('hold1', { arm: 'hold', bob: 1 }); add('holdBig', { arm: 'hold', big: 1 }); add('sniff0', { arm: 'sniff', look: 1 }); add('sniff1', { arm: 'sniff', look: 1, bob: 1 });
add('palm0', { arm: 'palm', seed: 1 }); add('palm1', { arm: 'palm', seed: 1, bob: 1 }); add('palmEmpty', { arm: 'palm' });
add('point0', { arm: 'point' }); add('point1', { arm: 'point', bob: 1 });
add('talk0', { arm: 'talk', talk: 1, g: 0 }); add('talk1', { arm: 'talk', talk: 2, g: 2 }); add('talk2', { arm: 'talk', talk: 1, g: 1, bob: 1 }); add('talkLow', { arm: 'low', talk: 1 }); add('talkLow2', { arm: 'low', talk: 2 });
add('offer0', { arm: 'offer' }); add('offer1', { arm: 'offer', bob: 1 }); add('offerEmpty', { arm: 'offer', coin: 0 });
add('wave0', { arm: 'wave' }); add('wave1', { arm: 'wave', w: 1 }); add('up', { arm: 'up' });
add('count0', { arm: 'count' }); add('count1', { arm: 'count', g: 1 }); add('countB', { arm: 'count', g: 1, bob: 1, blink: 1 });
add('reach0', { arm: 'reach', lean: 3, bob: 3 }); add('reach1', { arm: 'reach', lean: 3, bob: 3, look: 1 });
add('rope0', { arm: 'rope', lean: -2, step: 0 }); add('rope1', { arm: 'rope', lean: -1, step: 1 });
add('cross0', { arm: 'cross' }); add('cross1', { arm: 'cross', bob: 1 });
add('sit0', { sit: 1, arm: 'knee' }); add('sit1', { sit: 1, arm: 'knee', bob: 1 }); add('sitBlink', { sit: 1, arm: 'knee', blink: 1 }); add('sitLook', { sit: 1, arm: 'knee', look: 1, nod: -1 });
add('sitLamp', { sit: 1, arm: 'lantern' }); add('sitLamp1', { sit: 1, arm: 'lantern', bob: 1 });
add('sleep0', { lie: 1 }); add('sleep1', { lie: 1, breath: 1 });
add('nod', { arm: 'low', nod: 1, bob: 1 }); add('no0', { arm: 'low', look: -1, brow: 1 }); add('no1', { arm: 'low', look: 1, brow: 1 });
add('surprise', { arm: 'up', brow: 2, talk: 2 });
export const POSES = T;

const _cache = {};
function atlasFor(key) {
  if (_cache[key]) return _cache[key];
  const L = LOOKS[key], names = Object.keys(T), n = names.length, P = new PX(FW * n, FH), E = new PX(FW * n, FH);
  names.forEach((k, i) => {
    const p1 = new PX(FW, FH), e1 = new PX(FW, FH); drawPerson(p1, e1, T[k], L); p1.outline(.3);
    for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) { const c = p1.get(x, y); if (c) P.set(i * FW + x, y, c); const e = e1.get(x, y); if (e) E.set(i * FW + x, y, e); }
  });
  const cv = P.done(), ecv = E.done();
  return (_cache[key] = { cv, ecv, names, n });
}
export function atlasCanvas(key) { return atlasFor(key).cv; }   // untuk lembar sprite debug

// Objek karakter: mesh billboard + frame + hadap kamera
export function makePerson(key) {
  const A0 = atlasFor(key), tex = texOf(A0.cv), em = texOf(A0.ecv);
  tex.repeat.set(1 / A0.n, 1); em.repeat.set(1 / A0.n, 1);
  const mesh = billboard(tex, FW * SPX, FH * SPX, { em, emCol: '#ffffff', emI: 2.2 });
  const root = new THREE.Group(); root.add(mesh); root.userData.char = key;
  const sh = blob(.42, .5); sh.position.y = .015; root.add(sh);
  const L = LOOKS[key]; if (L.kid) root.scale.setScalar(.8);
  const idx = Object.fromEntries(A0.names.map((n, i) => [n, i]));
  return {
    key, root, mesh, shadowBlob: sh, names: A0.names,
    frame(name) { const i = idx[name]; if (i === undefined) throw new Error('pose tidak ada: ' + name); tex.offset.x = em.offset.x = i / A0.n; },
    face(cam, flip = false) { root.rotation.y = Math.atan2(cam.position.x - root.position.x, cam.position.z - root.position.z); mesh.scale.x = flip ? -1 : 1; },
    // posisi lentera di dunia (dari koordinat piksel pose)
    handPos(name, flip = false, px = 27, py = 22) { const lx = (px - FW / 2) * SPX * (flip ? -1 : 1), ly = (FH - py) * SPX * (L.kid ? .8 : 1), v = new THREE.Vector3(lx, ly, .08); v.applyAxisAngle(new THREE.Vector3(0, 1, 0), root.rotation.y); return v.add(root.position); },
  };
}
