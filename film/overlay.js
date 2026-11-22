// Lapisan 2D di atas dunia 3D: kartu judul, spanduk waktu, ikon/inventori (kartu barang), anatomi pala & fuli, peta Jalur Rempah, penutup.
import { clamp, seg, ss, lerp, eo, back } from '../vendor/lib.js';

const W = 1920, H = 1080;
const PAL = { k: '#2a1c14', w: '#f6ecd2', y: '#f0c840', o: '#e8802a', r: '#c43c28', R: '#7a1a10', b: '#7a4a24', B: '#3e2412', g: '#58a448', G: '#2c6a34', c: '#50b4c4', C: '#1c6a7c', u: '#3a6ae0', U: '#1c2e78', e: '#d8bc84', E: '#946a3c', s: '#b4b4c0', S: '#6a6a78', p: '#e88aa8', d: '#4a3a5a' };
// ikon 12×12 (karakter → palet)
const ICON = {
  beras: ['....kkkk....', '...keeeek...', '....kEEk....', '...keeeek...', '..keeeeeek..', '.keeewweeek.', '.keeewweeek.', '.keeeeeeeek.', '.keEeeeeEek.', '.keeeeeeeek.', '..kkkkkkkk..', '............'],
  kain: ['............', '..kkkkkkkk..', '.kUuuuwuuUk.', '.kuuwuuuwuk.', '.kUuuuwuuUk.', '.kuwuuuuwuk.', '.kUuuwuuuUk.', '..kkkkkkkk..', '.kwwk..kwwk.', '.kwwk..kwwk.', '..kk....kk..', '............'],
  keramik: ['....kkkk....', '...kCccCk...', '....kccK....'.replace('K', 'k'), '...kccccck..', '..kcccwcccck', '..kccwccccCk', '..kcccccccCk', '..kcccccccCk', '...kccccCCk.', '....kCCCCk..', '.....kkkk...', '............'],
  logam: ['............', '............', '....kkkkkk..', '...kssswssk.', '..kssssssSSk', '.kkkkkkkkkkk', '.ksssswsssSk', '.kssssssSSSk', '.kkkkkkkkkkk', '............', '............', '............'],
  kabar: ['............', '.kkkkkkkkkk.', '.kwwwwwwwwk.', '.kwkkkkkkwk.', '.kwwwwwwwwk.', '.kwkkkkkwwk.', '.kwwwwwwwwk.', '.kwkkkkwwwk.', '.kwwwwwwwwk.', '.kkkkkkkkkk.', '............', '............'],
  cerita: ['..kkkkkkkk..', '.kwwwwwwwwk.', '.kwkkkkkkwk.', '.kwwwwwwwwk.', '.kwkkkkkwwk.', '.kwwwwwwwwk.', '..kkkkkkwk..', '.....kwk....', '......k.....', '............', '............', '............'],
  pala: ['............', '....kkkk....', '...kbbbbk...', '..kbEbbbbk..', '.kbEbbbbbbk.', '.kbbbbbBBbk.', '.kbbbbbbBbk.', '.kbbbBbbbbk.', '..kbbbbbbk..', '...kkbbkk...', '.....kk.....', '............'],
  fuli: ['............', '..k..kk..k..', '.krkrrrkrrk.', '.kroroorork.', '.kroRRRRork.', '.krRoooRork.', '.kroRRRRork.', '.kroroorork.', '.krkrrrkrrk.', '..k..kk..k..', '............', '............'],
  cuaca: ['............', '....kkkk....', '..kkwwwwkk..', '.kwwwwwwwwk.', '.kwwwwwwwwwk', 'kwwwwwwwwwwk', 'kssssssssssk', '.kkkkkkkkkk.', '..u..u..u...', '.u..u..u..u.', '............', '............'],
  mutu: ['....kkkk....', '...kccccck..', '..kcwwcccck.', '..kcwcccccck'.slice(0, 12), '..kccccccck.', '...kcccccck.', '....kkkkkk..', '.........kk.', '..........kk', '...........b', '............', '............'],
  risiko: ['............', '............', '..kk....kk..', '.kccK..kccK.'.replace(/K/g, 'k'), 'kcwwck.kcwwck'.slice(0, 12), 'cuuucuccuucu', 'uuuuuuuuuuuu', 'UUUUUUUUUUUU', 'uuuuuuuuuuuu', 'UUUUUUUUUUUU', '............', '............'],
  orang: ['....kkkk....', '...kbbbbk...', '...kEeeEk...', '...kEeeEk...', '....kEEk....', '..kkuuuukk..', '.kuuuuuuuuk.', '.kuuuuuuuuk.', '..kuuuuuuk..', '..kbbkkbbk..', '..kbbk.kbbk.'.slice(0, 12), '............'],
  percaya: ['............', '..kk....kk..', '.krrkkkkrrk.', 'krrrrrrrrrrk', 'krrwrrrrrrrk', 'krrrrrrrrrrk', '.krrrrrrrrk.', '..krrrrrrk..', '...krrrrk...', '....krrk....', '.....kk.....', '............'],
  koin: ['............', '....kkkk....', '..kkyyyykk..', '.kyyoyyyyyk.', '.kyoyyyyyyk.', '.kyyyyyyyyk.', '.kyyyyyyoyk.', '.kyyyyyyyyk.', '..kkyyyykk..', '....kkkk....', '............', '............'],
  daun: ['............', '.........kk.', '.......kkgGk', '.....kkgggGk', '...kkgggggGk', '..kgggggGGk.', '..kggggGGk..', '.kgGGGGGk...', '.kGGkkkk....', 'kkk.........', '............', '............'],
  air: ['............', '.....kk.....', '....kccK....'.replace('K', 'k'), '...kcwccck..', '...kcccccck.'.slice(0, 12), '..kcwcccccck'.slice(0, 12), '..kccccccCk.', '..kcccccCCk.', '...kCCCCCk..', '....kkkk....', '............', '............'],
  panen: ['............', '..k......k..', '..k......k..', '..kkkkkkkk..', '.kEeEeEeEek.', '.keEeEeEeEk.', '.kEeEeEeEek.', '.keEeEeEeEk.', '..kEeEeEek..', '...kkkkkk...', '............', '............'],
  matahari: ['.....kk.....', '..k..yy..k..', '...kyyyyk...', '..kyyyyyyk..', 'kkyyyoyyyykk', 'kkyyyyyyyykk', '..kyyyyyyk..', '...kyyyyk...', '..k..yy..k..', '.....kk.....', '............', '............'],
  perahu: ['............', '.....kk.....', '....kwwk....', '...kwwwwk...', '..kwwwwwwk..', '.....kk.....', 'kkkkkkkkkkkk', '.kbbbbbbbbk.', '..kbbbbbbk..', '...kkkkkk...', 'cc..cc..cc..', '............'],
};
const _ic = {};
function icon(name, s = 6) {
  const key = name + s; if (_ic[key]) return _ic[key];
  const rows = ICON[name], c = document.createElement('canvas'); c.width = 12 * s; c.height = 12 * s; const g = c.getContext('2d');
  rows.forEach((r, y) => [...r.padEnd(12, '.')].forEach((ch, x) => { if (ch === '.' || !PAL[ch]) return; g.fillStyle = PAL[ch]; g.fillRect(x * s, y * s, s, s); }));
  return (_ic[key] = c);
}

// —— peta (garis pantai kasar; lon/lat → layar) ——
const LAND = {
  sumatra: [[95.3, 5.6], [97.5, 5.2], [100, 2.5], [103.5, .5], [104.5, -1.5], [106, -3.2], [105.9, -5.8], [104.6, -5.9], [102, -4], [99, -1.5], [96, 2.5]],
  jawa: [[105.2, -6.8], [106.6, -6], [108.6, -6.8], [111, -6.4], [112.7, -6.9], [114.4, -7.8], [114.4, -8.7], [111, -8.3], [108, -7.8], [106, -7.4]],
  kalimantan: [[109, 1.5], [111, 1.9], [114, 4.5], [117, 7], [119, 5], [117.8, 1], [116.5, -1.5], [116, -3.8], [114.5, -4], [111, -3], [110, -1.5], [109, -1]],
  sulawesi: [[119.5, -5.5], [120.4, -5.6], [120.5, -2.8], [121.5, -3], [123, -4], [122.5, -5.2], [121.6, -4.3], [121.2, -2.6], [122.5, -1], [123.3, .8], [125, 1.6], [120, .9], [119.9, -.5], [119.5, -3]],
  papua: [[131, -.8], [134, -.8], [138, -1.8], [141, -2.6], [141, -9], [138, -8.4], [135, -4.5], [132, -4], [131, -2]],
  seram: [[128, -3], [130.8, -2.9], [130.6, -3.6], [128.2, -3.8]], halmahera: [[127.5, 1.4], [128.6, 1.2], [128.5, -.6], [127.8, -.8]],
  nusa: [[115, -8.5], [119, -8.4], [123, -8.4], [125, -8.4], [124.5, -9.6], [120, -9], [116, -9]],
  timor: [[123.5, -9.6], [127, -8.4], [127, -9.2], [124, -10.4]],
};
const PORTS = { Aceh: [95.3, 5.5], Malaka: [102.2, 2.2], 'Sunda Kelapa': [106.8, -6.1], Gresik: [112.6, -7.2], Makassar: [119.4, -5.1], Ternate: [127.4, .8], Banda: [129.9, -4.5] };
const MAP = { x: 200, y: 150, w: 1520, h: 640, lon0: 93, lon1: 143, lat0: 9, lat1: -11.5 };
const mx = lon => MAP.x + (lon - MAP.lon0) / (MAP.lon1 - MAP.lon0) * MAP.w, my = lat => MAP.y + (MAP.lat0 - lat) / (MAP.lat0 - MAP.lat1) * MAP.h;
let _mapBase = null;
function mapBase() {
  if (_mapBase) return _mapBase;
  const s = 5, c = document.createElement('canvas'); c.width = MAP.w / s | 0; c.height = MAP.h / s | 0; const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  const L = (lon, lat) => [(lon - MAP.lon0) / (MAP.lon1 - MAP.lon0) * c.width, (MAP.lat0 - lat) / (MAP.lat0 - MAP.lat1) * c.height];
  g.fillStyle = '#9ab8b8'; g.fillRect(0, 0, c.width, c.height);
  for (let y = 0; y < c.height; y += 4) for (let x = (y / 4 % 2) * 3; x < c.width; x += 7) { g.fillStyle = '#a9c4c0'; g.fillRect(x, y, 3, 1); }
  for (const k in LAND) { g.beginPath(); LAND[k].forEach(([lo, la], i) => { const [x, y] = L(lo, la); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.fillStyle = '#7a9a5a'; g.fill(); g.lineWidth = 1.6; g.strokeStyle = '#2a3a22'; g.stroke(); g.fillStyle = '#9ab870'; g.globalAlpha = .5; g.fill(); g.globalAlpha = 1; }
  // dither halus pada daratan
  const d = g.getImageData(0, 0, c.width, c.height), D = d.data; for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) { const i = (y * c.width + x) * 4; if (D[i] === 122 && ((x + y) & 1) && D[i + 1] > 140) { D[i] -= 14; D[i + 1] -= 14; D[i + 2] -= 8; } } g.putImageData(d, 0, 0);
  return (_mapBase = c);
}
const catmull = (P, t) => { const n = P.length - 1, x = clamp(t) * n, i = Math.min(n - 1, Math.floor(x)), f = x - i, p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(n, i + 2)]; const c = k => .5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * f + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * f * f + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * f * f * f); return [c(0), c(1)]; };

export function makeOverlay(canvas, TL) {
  canvas.width = W; canvas.height = H; const g = canvas.getContext('2d');
  const ln = Object.fromEntries(TL.lines.map(l => [l.id, l])), A = (id, f = 0) => ln[id].t + ln[id].dur * f;
  const spaced = (text, x, y, sp) => { const ws = [...text].map(c => g.measureText(c).width), tot = ws.reduce((a, b) => a + b, 0) + sp * (ws.length - 1); let cx = x - tot / 2; [...text].forEach((c, i) => { g.fillText(c, cx + ws[i] / 2, y); cx += ws[i] + sp; }); };
  const glowText = (fn, col, blur) => { g.save(); g.shadowColor = col; g.shadowBlur = blur; fn(); g.restore(); fn(); };
  function ornament(cx, y, w, a) {
    g.save(); g.globalAlpha = a; g.lineWidth = 1.5;
    for (const s of [-1, 1]) { const gr = g.createLinearGradient(cx, 0, cx + s * w, 0); gr.addColorStop(0, 'rgba(226,201,137,1)'); gr.addColorStop(1, 'rgba(226,201,137,0)'); g.strokeStyle = gr; g.beginPath(); g.moveTo(cx + s * 16, y); g.lineTo(cx + s * w, y); g.stroke(); g.fillStyle = '#e2c989'; g.beginPath(); g.arc(cx + s * 26, y, 2.5, 0, 7); g.fill(); }
    g.strokeStyle = '#c9a863'; g.fillStyle = '#e2c989'; g.beginPath(); g.moveTo(cx, y - 8); g.lineTo(cx + 8, y); g.lineTo(cx, y + 8); g.lineTo(cx - 8, y); g.closePath(); g.stroke();
    g.beginPath(); g.moveTo(cx, y - 3.5); g.lineTo(cx + 3.5, y); g.lineTo(cx, y + 3.5); g.lineTo(cx - 3.5, y); g.closePath(); g.fill(); g.restore();
  }
  const plate = (x, y, w, h, a = 1) => { g.save(); g.globalAlpha = a; g.fillStyle = 'rgba(14,10,22,.78)'; g.fillRect(x, y, w, h); g.strokeStyle = '#c9a863'; g.lineWidth = 3; g.strokeRect(x + 2, y + 2, w - 4, h - 4); g.strokeStyle = 'rgba(226,201,137,.35)'; g.lineWidth = 1; g.strokeRect(x + 9, y + 9, w - 18, h - 18); g.restore(); };

  // —— kartu judul ——
  function titleCard(t) {
    const a0 = ss(seg(t, .4, 1.5)), a1 = ss(seg(t, 1.2, 2.4)), a2 = ss(seg(t, 2.3, 3.2)), out = 1 - ss(seg(t, 4.3, 5));
    const bg = g.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, 1100); bg.addColorStop(0, '#16203a'); bg.addColorStop(1, '#03040a'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.globalAlpha = a0 * out; g.fillStyle = '#d8c28e'; g.font = '500 34px Cinzel'; spaced('SEBUAH PERJALANAN SATU HARI', W / 2, 400, 10);
    ornament(W / 2, 448, 260 * (.4 + .6 * a0), a0 * out);
    g.globalAlpha = a1 * out; g.font = '700 92px Cinzel'; const gr = g.createLinearGradient(0, 480, 0, 600); gr.addColorStop(0, '#fff3cf'); gr.addColorStop(.55, '#e2c27c'); gr.addColorStop(1, '#a8803e'); g.fillStyle = gr;
    glowText(() => spaced('SEHARI JADI PEDAGANG', W / 2, 520, 12), 'rgba(255,200,120,.5)', 36); glowText(() => spaced('DI JALUR REMPAH', W / 2, 628, 12), 'rgba(255,200,120,.5)', 36);
    g.globalAlpha = a2 * out; g.fillStyle = '#f3ead6'; g.font = 'italic 500 46px "Cormorant Garamond"'; g.fillText('Kepulauan Banda, di antara pala dan fuli', W / 2, 740);
    const u = seg(t, .8, 4.8), ex = 560 + u * 800, ey = 860 - u * 120 + Math.sin(u * 9) * 14, ea = Math.sin(u * Math.PI) * out;
    g.globalAlpha = 1; const eg = g.createRadialGradient(ex, ey, 0, ex, ey, 26); eg.addColorStop(0, `rgba(255,220,150,${.9 * ea})`); eg.addColorStop(.25, `rgba(255,150,60,${.35 * ea})`); eg.addColorStop(1, 'rgba(255,120,40,0)'); g.fillStyle = eg; g.fillRect(ex - 30, ey - 30, 60, 60); g.fillStyle = `rgba(255,240,200,${ea})`; g.fillRect(Math.round(ex) - 2, Math.round(ey) - 2, 4, 4);
    g.globalAlpha = 1;
  }
  // —— spanduk waktu (di awal tiap adegan) ——
  function banner(sc, t) {
    // Timeline pengguna tidak punya jeda panjang di awal adegan, jadi spanduk
    // waktu tampil sebagai overlay selama ±2,5 dtk pertama, bukan menunggu vo0.
    const a = ss(seg(t, sc.a + .35, sc.a + .95)) * (1 - ss(seg(t, sc.a + 2.4, sc.a + 3.0))); if (a <= 0) return;
    g.save(); g.globalAlpha = a; g.textAlign = 'center'; g.textBaseline = 'middle';
    const gl = g.createLinearGradient(0, 0, 0, 400); gl.addColorStop(0, 'rgba(0,0,0,.55)'); gl.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gl; g.fillRect(0, 0, W, 400);
    g.fillStyle = '#e8d6a0'; g.font = '700 64px Cinzel'; glowText(() => spaced(sc.label, W / 2, 150 - (1 - a) * 10, 14), 'rgba(255,190,110,.5)', 22);
    ornament(W / 2, 208, 260, a); g.fillStyle = '#f6eedb'; g.font = 'italic 500 44px "Cormorant Garamond"'; g.fillText(sc.sub, W / 2, 258);
    g.restore();
  }
  // —— kartu kecil ikon + label ——
  function chip(ic, label, x, y, a, sc = 1, num) {
    const w = 190 * sc, h = 190 * sc; g.save(); g.globalAlpha = a; g.translate(x, y); g.scale(sc, sc);
    plate(-95, -95, 190, 190); g.imageSmoothingEnabled = false; g.drawImage(icon(ic, 8), -48, -78); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#f3ead6'; g.font = `500 ${label.length > 9 ? 17 : 25}px Cinzel`; g.fillText(label, 0, 54);
    if (num) { g.fillStyle = '#c9a863'; g.font = '700 22px Cinzel'; g.fillText(num, -72, -72); } g.restore();
  }
  const arrow = (x, y, a, s = 1) => { g.save(); g.globalAlpha = a; g.fillStyle = '#e2c989'; g.translate(x, y); g.scale(s, s); g.fillRect(-34, -6, 50, 12); g.beginPath(); g.moveTo(14, -24); g.lineTo(46, 0); g.lineTo(14, 24); g.closePath(); g.fill(); g.restore(); };
  // —— ilustrasi piksel kecil lewat kanvas kecil ——
  function mini(w, h, scale, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; const d = x.createImageData(w, h); const set = (X, Y, col) => { X |= 0; Y |= 0; if (X < 0 || Y < 0 || X >= w || Y >= h) return; const i = (Y * w + X) * 4, n = parseInt(col.slice(1), 16); d.data[i] = n >> 16 & 255; d.data[i + 1] = n >> 8 & 255; d.data[i + 2] = n & 255; d.data[i + 3] = 255; }; draw(set, w, h); x.putImageData(d, 0, 0); return c; }
  const hash = (x, y, s = 0) => { let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const pick = (cols, v, x, y) => { v = clamp(v, 0, .999) * (cols.length - 1); const i = Math.floor(v), f = v - i, B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5][(y & 3) * 4 + (x & 3)] / 16 + .03; return cols[Math.min(cols.length - 1, i + (B < f ? 1 : 0))]; };
  const YEL = ['#7a6a14', '#b4a020', '#e0c838', '#f4e46a'], BRN = ['#2a1608', '#4a2a12', '#6e4220', '#946034', '#b88650'], RED = ['#7a1a0c', '#b8341a', '#e0561f', '#ff8a3a', '#ffc06a'], CRM = ['#c8b480', '#e4d4a0', '#f6ecc8'];
  let _anat = null;
  const anatomy = () => _anat ??= mini(64, 56, 1, (set, w, h) => {
    const cx = 32, cy = 30;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = (x - cx) / 28, dy = (y - cy) / 23, r = Math.hypot(dx, dy);
      if (r < 1) { set(x, y, pick(YEL, .75 - dx * .25 - dy * .3 + (hash(x, y) - .5) * .15, x, y)); if (r > .92) set(x, y, '#5a4a0c'); }
      const ix = (x - cx) / 20, iy = (y - cy) / 17, ir = Math.hypot(ix, iy); if (ir < 1) set(x, y, pick(CRM, .45 + iy * .2, x, y)); if (ir > .94 && ir < 1) set(x, y, '#8a7a40');
      const sx = (x - cx) / 10.5, sy = (y - cy) / 13, sr = Math.hypot(sx, sy);
      const fl = Math.hypot((x - cx) / 14.5, (y - cy) / 16.5);   // fuli: jaring merah di sekeliling biji
      if (fl < 1 && sr >= 1) { const lat = ((x + y) % 4 === 0 || (x - y + 64) % 4 === 0); set(x, y, lat ? pick(RED, .5 + (hash(x, y) - .5) * .4, x, y) : '#d4481c'); if (fl > .9) set(x, y, '#8a2010'); }
      if (sr < 1) { set(x, y, pick(BRN, .6 - sx * .35 - sy * .25 + (hash(x, y, 2) - .5) * .12, x, y)); if (sr > .9) set(x, y, '#1a0e04'); if (Math.abs(sx + .1 * sy) < .06 && sy > -.9 && sy < .9) set(x, y, '#3a2010'); }
    }
  });
  const lattice = (dry) => mini(44, 36, 1, (set, w, h) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const dx = (x - 22) / 20, dy = (y - 18) / 15, r = Math.hypot(dx, dy * (1 + Math.sin(x * .5) * .1)); if (r > 1) continue; const lat = ((x + y) % 5 < 2 || (x - y + 44) % 5 < 2), hole = ((x + y) % 5 === 3) && !dry; if (lat) set(x, y, pick(dry ? ['#7a3a10', '#a85a1c', '#c8782c', '#e49a48'] : RED, .55 + (hash(x, y) - .5) * .5, x, y)); else if (!hole) set(x, y, dry ? '#8a4a18' : '#c4401c'); if (r > .92 && lat) set(x, y, dry ? '#5a2a0c' : '#7a1a0c'); } });
  const seedMini = kind => mini(26, 26, 1, (set, w, h) => {
    const cx = 13, cy = 13, sc = kind === 'besar' ? 1.12 : 1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = (x - cx) / (9 * sc), dy = (y - cy) / (11.5 * sc), r = Math.hypot(dx, dy); if (r > 1) continue;
      let col = pick(BRN, .62 - dx * .3 - dy * .25 + (hash(x, y) - .5) * .15, x, y); if (r > .9) col = '#1a0e04';
      if (kind === 'kering' && dx < -.2 && dy < -.2 && r < .7 && hash(x, y, 3) > .5) col = '#d8b080';
      if (kind === 'lembap') { col = pick(['#1c1408', '#2e2410', '#3e3418', '#4e4a22'], .4 + (hash(x, y) - .5) * .5, x, y); if (hash(x, y, 5) > .84) col = '#7aa060'; if (hash(x, y, 6) > .93) col = '#a8d0e8'; }
      if (kind === 'rusak') { col = pick(['#241a10', '#3a2a18', '#5a4228'], .5 + (hash(x, y) - .5) * .5, x, y); if (Math.abs(dx - dy * .4 + .1) < .1 && r < .95) col = '#0a0604'; if (Math.hypot(x - 15, y - 9) < 2.6) col = '#0a0604'; }
      set(x, y, col);
    }
  });
  const drawMini = (c, x, y, s, a = 1) => { g.save(); g.globalAlpha = a; g.imageSmoothingEnabled = false; g.drawImage(c, x - c.width * s / 2, y - c.height * s / 2, c.width * s, c.height * s); g.restore(); };
  const label = (txt, x, y, a, size = 30, col = '#f3ead6', font = 'Cinzel', weight = 500) => { g.save(); g.globalAlpha = a; g.fillStyle = col; g.font = `${weight} ${size}px "${font}"`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, x, y); g.restore(); };

  // —— peta ——
  function mapCard(t, o) {
    const a = o.a;
    g.save(); g.globalAlpha = a * .62; g.fillStyle = '#05060e'; g.fillRect(0, 0, W, H); g.globalAlpha = a;
    // perkamen
    const pad = 36, X = MAP.x - pad, Y = MAP.y - pad - 40, Wp = MAP.w + pad * 2, Hp = MAP.h + pad * 2 + 70;
    g.fillStyle = '#d8c08c'; g.fillRect(X, Y, Wp, Hp); g.strokeStyle = '#5a3c1c'; g.lineWidth = 6; g.strokeRect(X + 3, Y + 3, Wp - 6, Hp - 6); g.strokeStyle = '#8a6a3c'; g.lineWidth = 2; g.strokeRect(X + 16, Y + 16, Wp - 32, Hp - 32);
    g.imageSmoothingEnabled = false; g.drawImage(mapBase(), MAP.x, MAP.y, MAP.w, MAP.h); g.strokeStyle = '#5a3c1c'; g.lineWidth = 3; g.strokeRect(MAP.x, MAP.y, MAP.w, MAP.h);
    label(o.title, W / 2, Y + 50, a, 36, '#3e2412', 'Cinzel', 700);
    const pt = ([lo, la]) => [mx(lo), my(la)];
    const names = { Banda: 1, Gresik: 1 }; const labelPort = (n, off = [0, -26]) => { const [x, y] = pt(PORTS[n]); g.fillStyle = n === 'Banda' ? '#c43c28' : '#2a1c14'; g.fillRect(x - 6, y - 6, 12, 12); g.fillStyle = '#f6ecd2'; g.fillRect(x - 3, y - 3, 6, 6); label(n === 'Gresik' ? 'Pesisir utara Jawa' : n, x + off[0], y + off[1], a, n === 'Banda' ? 32 : 24, '#2a1c14', 'Cormorant Garamond', 500); };
    if (o.mode === 'route') {
      const R = [[112.4, -6.9], [115.5, -7.0], [118.6, -6.7], [121.8, -6.5], [125, -5.6], [127.8, -4.8], [129.9, -4.5]].map(pt);
      const p = o.p; const N = 160; for (let i = 0; i <= N * p; i++) { if (i % 3) continue; const [x, y] = catmull(R, i / N); g.fillStyle = '#c43c28'; g.fillRect(x - 4, y - 4, 8, 8); }
      const [bx, by] = catmull(R, clamp(p)); drawIconAt('perahu', bx, by - 22, 4, a);
      labelPort('Gresik', [-8, -34]); labelPort('Banda', [0, 38]);
    } else {
      // jaringan: Banda ↔ pelabuhan
      const B = pt(PORTS.Banda); const order = ['Ternate', 'Makassar', 'Gresik', 'Sunda Kelapa', 'Malaka', 'Aceh'];
      order.forEach((n, i) => { const k = ease(seg(o.p, i * .09, i * .09 + .35)); if (k <= 0) return; const P = pt(PORTS[n]), mid = [(B[0] + P[0]) / 2, (B[1] + P[1]) / 2 - 70 - (i % 2) * 30]; const pts = [B, mid, P]; for (let j = 0; j <= 60 * k; j++) { if (j % 3) continue; const u = j / 60, q = [(1 - u) * (1 - u) * B[0] + 2 * (1 - u) * u * mid[0] + u * u * P[0], (1 - u) * (1 - u) * B[1] + 2 * (1 - u) * u * mid[1] + u * u * P[1]]; g.fillStyle = o.rev ? '#1c6a7c' : '#c43c28'; g.fillRect(q[0] - 3, q[1] - 3, 6, 6); }
        if (k >= 1) { g.fillStyle = '#2a1c14'; g.fillRect(P[0] - 6, P[1] - 6, 12, 12); g.fillStyle = '#f6ecd2'; g.fillRect(P[0] - 3, P[1] - 3, 6, 6); label(n, P[0], P[1] - 24, a, 22, '#2a1c14', 'Cormorant Garamond', 500); }
        // barang yang bergerak: pala/fuli keluar dari Banda; (rev) barang & kabar masuk
        if (k >= 1) for (let m = 0; m < 3; m++) { const u = ((t * .22 + m / 3 + i * .13) % 1), uu = o.rev ? 1 - u : u, q = [(1 - uu) * (1 - uu) * B[0] + 2 * (1 - uu) * uu * mid[0] + uu * uu * P[0], (1 - uu) * (1 - uu) * B[1] + 2 * (1 - uu) * uu * mid[1] + uu * uu * P[1]]; drawIconAt(o.rev ? (m % 2 ? 'kabar' : 'kain') : (m % 2 ? 'fuli' : 'pala'), q[0], q[1], 2, a); }
      });
      const faraway = ease(seg(o.p, .62, 1)); if (faraway > 0 && !o.rev) { g.save(); g.globalAlpha = a * faraway; g.fillStyle = '#c43c28'; const [ax, ay] = pt(PORTS.Aceh); for (let j = 0; j < 6; j++) g.fillRect(ax - 40 - j * 26, ay - 10 - j * 6, 12, 12); label('pasar-pasar yang jauh →', ax + 100, ay - 90, a * faraway, 26, '#3e2412', 'Cormorant Garamond', 500); g.restore(); }
      labelPort('Banda', [0, 38]);
    }
    g.restore();
  }
  const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
  function drawIconAt(n, x, y, s, a) { g.save(); g.globalAlpha = a; g.imageSmoothingEnabled = false; g.drawImage(icon(n, s), x - 6 * s, y - 6 * s); g.restore(); }

  // —— jadwal kartu (ditambatkan ke baris naskah) ——
  const CH = (id, ic, lab, f0, endId, endF, slot, n, total, num) => ({ type: 'chip', ic, lab, t0: A(id, f0), t1: A(endId, endF), slot, total, num });
  const CUES = [];
  // subuh
  CUES.push({ type: 'map', mode: 'route', t0: A('subuh_04', .12), t1: A('subuh_04', 1) + .5, title: 'JALUR PELAYARAN: PESISIR UTARA JAWA → BANDA', p0: A('subuh_04', .2), p1: A('subuh_04', .95) });
  CUES.push({ type: 'flow', t0: A('subuh_07', .15), t1: A('subuh_08', .98), left: [['beras', 'BERAS'], ['kain', 'KAIN']], right: [['pala', 'PALA'], ['fuli', 'FULI']], rightAt: A('subuh_08', .35) });
  // pagi
  CUES.push({ type: 'anatomy', t0: A('pagi_06', .5), t1: A('pagi_08', .1), tPala: A('pagi_07', .08), tFuli: A('pagi_07', .55) });
  ['beras', 'kain', 'keramik', 'logam', 'kabar', 'cerita'].forEach((n, i) => CUES.push({ type: 'chip', ic: n, lab: n.toUpperCase(), t0: A('pagi_15', .22 + i * .1), t1: E_(ln, 'pagi_15') + .6, slot: i, total: 6 }));
  // menjelang siang
  CUES.push({ type: 'compare', t0: A('jelangsiang_09', .02), t1: E_(ln, 'jelangsiang_09') + .2, items: [['kering', 'KERING'], ['lembap', 'LEMBAP'], ['besar', 'BESAR'], ['rusak', 'RUSAK']], at: [.06, .3, .53, .76] });
  CUES.push({ type: 'chip', ic: 'cuaca', lab: 'KERING?', t0: A('jelangsiang_12', .35), t1: E_(ln, 'jelangsiang_13') + .2, slot: 0, total: 1, big: 1 });
  // siang
  CUES.push({ type: 'chip', ic: 'koin', lab: 'MURAH?', t0: A('siang_02', .55), t1: A('siang_03', .85), slot: 0, total: 1 });
  CUES.push({ type: 'chip', ic: 'mutu', lab: 'MUTU', t0: A('siang_15', .08), t1: E_(ln, 'siang_15') + .5, slot: 0, total: 3 }, { type: 'chip', ic: 'risiko', lab: 'RISIKO', t0: A('siang_15', .38), t1: E_(ln, 'siang_15') + .5, slot: 1, total: 3 }, { type: 'chip', ic: 'percaya', lab: 'KEPERCAYAAN', t0: A('siang_15', .62), t1: E_(ln, 'siang_15') + .5, slot: 2, total: 3 });
  // fuli
  CUES.push({ type: 'fuli', t0: A('jelangsore_02', .2), t1: E_(ln, 'jelangsore_03') + .3, tDry: A('jelangsore_03', .2) });
  // sore
  [['daun', 'MENANAM'], ['air', 'MERAWAT'], ['panen', 'MEMANEN'], ['matahari', 'MENGERINGKAN'], ['perahu', 'MENGANGKUT'], ['koin', 'MENJUAL']].forEach(([ic, lab], i) => CUES.push({ type: 'chip', ic, lab, t0: A('sore_06', .3 + i * .105), t1: E_(ln, 'sore_06') + .5, slot: i, total: 6, num: i + 1 }));
  // malam
  CUES.push({ type: 'map', mode: 'network', t0: A('malam_05', .05), t1: A('malam_08', 1) + .3, title: 'JALUR REMPAH: JARINGAN PULAU, PELABUHAN, DAN MASYARAKAT', p0: A('malam_06', .1), p1: A('malam_07', .9), revAt: A('malam_08', .0) });
  [['cuaca', 'CUACA'], ['mutu', 'MUTU'], ['risiko', 'RISIKO'], ['orang', 'ORANG'], ['percaya', 'KEPERCAYAAN']].forEach(([ic, lab], i) => CUES.push({ type: 'chip', ic, lab, t0: A('malam_10', .3 + i * .125), t1: E_(ln, 'malam_10') + .5, slot: i, total: 5 }));

  function drawCues(t) {
    for (const c of CUES) {
      if (t < c.t0 - .1 || t > c.t1 + .8) continue;
      const fi = ss(seg(t, c.t0, c.t0 + .45)), fo = 1 - ss(seg(t, c.t1, c.t1 + .6)), a = fi * fo; if (a <= 0) continue;
      if (c.type === 'chip') {
        const gap = 214, x = W / 2 + (c.slot - (c.total - 1) / 2) * gap, y = c.big ? 330 : 190 + 14, pop = back(seg(t, c.t0, c.t0 + .4), 1.6);
        chip(c.ic, c.lab, x, y + (1 - fi) * -20, a, .8 + .2 * pop + (c.big ? .2 : 0), c.num);
      } else if (c.type === 'flow') {
        const y = 300; const L = c.left, R = c.right; const kR = ss(seg(t, c.rightAt, c.rightAt + .5));
        L.forEach(([ic, lb], i) => chip(ic, lb, W / 2 - 360 + i * 210, y, a, .82)); arrow(W / 2, y, a * (.4 + .6 * kR), 1); R.forEach(([ic, lb], i) => chip(ic, lb, W / 2 + 150 + i * 210, y, a * kR, .82));
        label('menukar barang, lalu pulang membawa untung', W / 2, y + 140, a * kR, 34, '#f3ead6', 'Cormorant Garamond', 500);
      } else if (c.type === 'anatomy') {
        const cx = 1310, cy = 430, k = a; plate(cx - 330, cy - 290, 660, 580, k * .95);
        drawMini(anatomy(), cx, cy - 20, 8, k);
        const kp = ss(seg(t, c.tPala, c.tPala + .5)), kf = ss(seg(t, c.tFuli, c.tFuli + .5));
        g.save(); g.globalAlpha = k * kp; g.strokeStyle = '#f0c840'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx + 10, cy - 20); g.lineTo(cx + 250, cy + 150); g.stroke(); g.restore(); label('PALA (biji)', cx + 230, cy + 180, k * kp, 34, '#f4d890', 'Cinzel', 700);
        g.save(); g.globalAlpha = k * kf; g.strokeStyle = '#ff8a3a'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx - 100, cy - 60); g.lineTo(cx - 240, cy - 160); g.stroke(); g.restore(); label('FULI (selaput merah)', cx - 120, cy - 200, k * kf, 32, '#ffb070', 'Cinzel', 700);
        label('BUAH PALA', cx, cy + 250, k, 28, '#d8c28e', 'Cinzel', 500);
      } else if (c.type === 'fuli') {
        const cx = 1310, cy = 440, k = a; plate(cx - 360, cy - 250, 720, 520, k * .95);
        drawMini(lattice(false), cx - 170, cy - 30, 7, k); label('BARU', cx - 170, cy + 150, k, 32, '#ffb070', 'Cinzel', 700); label('merah jingga, seperti jaring tipis', cx - 170, cy + 192, k, 26, '#f3ead6', 'Cormorant Garamond', 500);
        const kd = ss(seg(t, c.tDry, c.tDry + .5)); drawMini(lattice(true), cx + 180, cy - 30, 7, k * kd); label('KERING', cx + 180, cy + 150, k * kd, 32, '#e8a860', 'Cinzel', 700); label('kaku dan ringan', cx + 180, cy + 192, k * kd, 26, '#f3ead6', 'Cormorant Garamond', 500);
      } else if (c.type === 'compare') {
        const y = 330; c.items.forEach(([kind, lab], i) => { const ka = ss(seg(t, c.t0 + (c.t1 - c.t0) * c.at[i], c.t0 + (c.t1 - c.t0) * c.at[i] + .4)) * fo; if (ka <= 0) return; const x = W / 2 + (i - 1.5) * 250; plate(x - 105, y - 120, 210, 250, ka * .95); drawMini(seedMini(kind), x, y - 20, 6, ka); label(lab, x, y + 90, ka, 28, kind === 'kering' ? '#9ae09a' : '#ffb070', 'Cinzel', 700); label(kind === 'kering' ? '✓' : '✗', x + 70, y - 90, ka, 36, kind === 'kering' ? '#7adc7a' : '#ff7a6a', 'Cinzel', 700); });
      } else if (c.type === 'map') {
        const rev = c.revAt && t > c.revAt; mapCard(t, { a, title: c.title, mode: c.mode, p: c.mode === 'route' ? clamp((t - c.p0) / (c.p1 - c.p0)) : (rev ? clamp((t - c.revAt) / 3) : clamp((t - c.p0) / (c.p1 - c.p0))), rev });
      }
    }
  }
  // —— penutup ——
  function outro(t) {
    const o = TL.outro, u = t - o.a, a0 = ss(seg(u, .8, 2)), a1 = ss(seg(u, 2.2, 3.4)), a2 = ss(seg(u, 4, 5.2)), out = 1;
    g.fillStyle = `rgba(2,3,10,${ss(seg(u, 0, 1.2)) * .92})`; g.fillRect(0, 0, W, H); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.globalAlpha = a0; g.font = '700 84px Cinzel'; const gr = g.createLinearGradient(0, 330, 0, 450); gr.addColorStop(0, '#fff3cf'); gr.addColorStop(.55, '#e2c27c'); gr.addColorStop(1, '#a8803e'); g.fillStyle = gr;
    glowText(() => spaced('SEHARI JADI PEDAGANG', W / 2, 380, 10), 'rgba(255,200,120,.5)', 34); glowText(() => spaced('DI JALUR REMPAH', W / 2, 480, 10), 'rgba(255,200,120,.5)', 34);
    ornament(W / 2, 552, 340 * (.3 + .7 * a0), a0);
    g.globalAlpha = a1; g.fillStyle = '#f3ead6'; g.font = 'italic 500 44px "Cormorant Garamond"'; g.fillText('Rempah sekecil biji pala bisa menghubungkan dunia yang begitu luas.', W / 2, 620);
    g.globalAlpha = a2 * .85; g.fillStyle = '#d8c28e'; g.font = '500 28px Cinzel'; spaced('NARATOR: NAJMI', W / 2, 720, 6);
    // Tanpa kredit/watermark di layar. Kredit teknis ada di NOTICE/CREDITS repo.
    const end = ss(seg(u, (o.b - o.a) - .8, (o.b - o.a) - .2));
    if (end > 0) { g.globalAlpha = 1; g.fillStyle = `rgba(0,0,0,${end})`; g.fillRect(0, 0, W, H); }
    g.globalAlpha = 1;
  }
  // —— penghitam antaradegan ——
  function blackout(t) {
    // Jangan meredupkan tiap batas bab: narasi pengguna berjalan tanpa jeda.
    // Hanya adegan terakhir yang memudar ke hitam sebelum kartu penutup.
    let a = 0; const sc = TL.scenes, k = sc.findIndex(s => t >= s.a && t < s.b);
    if (k === sc.length - 1) { const s = sc[k]; a = ss(seg(t, s.b - .5, s.b)); }
    if (a > 0) { g.fillStyle = `rgba(0,0,0,${a})`; g.fillRect(0, 0, W, H); }
  }
  return function draw(t, scene) {
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); g.globalAlpha = 1;
    if (t < TL.title.b) { titleCard(t); const a = ss(seg(t, TL.title.b - .5, TL.title.b)); if (a > 0) { g.fillStyle = `rgba(0,0,0,${a})`; g.fillRect(0, 0, W, H); } return; }
    if (t >= TL.outro.a) { if (t < TL.outro.a + 1.2) blackoutPrev(t); outro(t); return; }
    drawCues(t); banner(scene, t); blackout(t);
  };
  function blackoutPrev() { }
}
function E_(ln, id) { return ln[id].t + ln[id].dur; }
