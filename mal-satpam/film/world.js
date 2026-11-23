// world.js: satu sumber untuk ukuran dunia, jalur penjaga, dan peristiwa bertanda waktu. MURNI DATA (tanpa DOM / three),
// supaya bisa dibaca halaman (main.js) dan juga Node (tools/export_events.mjs -> audio).
export const FH = 5.0;            // tinggi antar-lantai (m)
export const SB = 1.2;            // mundur tiap lantai ke atas (m)
export const ZB = -9;             // dinding belakang
export const ZWIN = -6.2;         // bidang etalase toko
export const XW = 16;             // setengah lebar bangunan
export const SLOT = 4.5;          // setengah lebar void atrium
export const ZESC = -7.6;         // jalur eskalator (dekat dinding belakang)
export const floorY = k => k * FH;
export const frontZ = k => -SB * k;
export const zWalk = k => frontZ(k) - 2.0;

export const DUR = 131.0;
export const END_AT = 126.7;      // kartu "Bersambung ke Part 2"

// eskalator e: lantai e -> e+1. genap: kiri-bawah ke kanan-atas; ganjil: kanan-bawah ke kiri-atas
export const escDir = e => (e % 2 === 0 ? 1 : -1);
export const escFoot = e => ({ x: -SLOT * escDir(e), y: floorY(e), z: ZESC });
export const escTop = e => ({ x: SLOT * escDir(e), y: floorY(e + 1), z: ZESC });
export const ESC_STOP = [29.45, 30.35, 31.25, 32.15];   // detik berhenti (naik satu per satu)
export const ESC_LEN = Math.hypot(2 * SLOT, FH);

// —— adegan / bidikan ——
export const SHOTS = [
  { id: 'wide',    a: 0.0,   b: 10.5 },
  { id: 'patrol',  a: 10.5,  b: 18.0 },
  { id: 'torch',   a: 18.0,  b: 22.9 },
  { id: 'fountain',a: 22.9,  b: 29.6 },
  { id: 'escstop', a: 29.6,  b: 35.1 },
  { id: 'climb',   a: 35.1,  b: 43.4 },
  { id: 'count',   a: 43.4,  b: 52.0 },
  { id: 'leave',   a: 52.0,  b: 59.9 },
  { id: 'toy',     a: 59.9,  b: 71.9 },
  { id: 'walk3',   a: 71.9,  b: 80.5 },
  { id: 'descent', a: 80.5,  b: 86.6 },
  { id: 'post',    a: 86.6,  b: 103.9 },
  { id: 'eye',     a: 103.9, b: 116.9 },
  { id: 'behind',  a: 116.9, b: END_AT },
  { id: 'end',     a: END_AT, b: DUR },
];
export const shotAt = t => SHOTS.find(s => t >= s.a && t < s.b) || SHOTS[SHOTS.length - 1];
// lantai tempat adegan terjadi (HUD)
export const FLOOR_AT = t => (t < 35.4 ? 1 : t < 59.9 ? 2 : t < 80.5 ? 3 : 1);

// hitungan dalam suara (dari analisis VO)
export const COUNT1 = [44.24, 44.77, 45.57, 46.35, 47.05, 47.85, 48.60];
export const COUNT2 = [95.08, 95.82, 96.54, 97.21, 97.84, 98.57];

// lampu toko padam satu per satu (hook): [mulai, durasi]
export const LIGHTS_OUT = { t0: 0.35, t1: 4.1 };
export const TIMES = {
  ghostSeen: 48.6,      // "tujuh"
  boxOpen: 62.3, boxClose: 70.75, boxAgain: 76.12,
  postSit: 86.2, appear: 117.0, armUp0: 121.9, armUp1: 125.0, blackout: 125.9,
};

// —— jalur penjaga: kunci [t, x, y, z, mode, flip?] ——
// mode: idle | walk | run | aim (senter ke depan, diam) | check (menggoyang pintu) | sit | freeze
// flip: true = menghadap kiri (-x)
const K = (t, x, y, z, mode, flip = false) => ({ t, x, y, z, mode, flip });
const e0f = escFoot(0), e0t = escTop(0), e1f = escFoot(1), e1t = escTop(1);
const ZR = ZESC + 0.85;   // penjaga berjalan di sisi depan eskalator (tidak tertutup pagar kaca dan rangka)
export const HERO_KEYS = [
  K(0,     -3.6, 0, -1.0, 'idle'),
  K(10.9,  -3.6, 0, -1.0, 'walk'),
  K(15.0,   4.2, 0, -1.0, 'walk'),
  K(17.4,   6.4, 0, -5.4, 'check'),            // memeriksa pintu rolling toko kanan
  K(19.0,   6.4, 0, -5.4, 'aim'),
  K(22.4,   6.4, 0, -5.4, 'walk', true),
  K(24.6,   4.2, 0, -1.0, 'walk', true),
  K(28.6,  -3.9, 0, -1.2, 'aim'),              // di tepi air mancur
  K(29.4,  -3.9, 0, -1.2, 'walk', true),
  K(32.4,  -3.9, 0, -5.4, 'aim'),              // menuju panel eskalator
  K(34.9,  -3.9, 0, -5.4, 'walk', false),
  K(35.5,  e0f.x, e0f.y, ZR, 'walk', false),
  K(39.7,  e0t.x, e0t.y, ZR, 'walk', false), // naik eskalator yang sudah mati
  K(40.4,  4.9, floorY(1), -5.4, 'walk', false),
  K(43.4,  9.3, floorY(1), -5.0, 'aim'),       // di depan etalase paling ujung
  K(51.8,  9.3, floorY(1), -5.0, 'aim'),
  K(52.0,  9.3, floorY(1), -5.0, 'idle'),
  K(55.6,  9.3, floorY(1), -5.0, 'idle'),
  K(56.9,  9.3, floorY(1), -5.0, 'walk', true),
  K(59.0,  e1f.x, e1f.y, -5.6, 'walk', true),
  // lantai tiga (setelah fade): turun dari eskalator, ke rak mainan
  K(59.9,  e1t.x, e1t.y, ZR, 'walk', true),
  K(60.5, -4.8, floorY(2), -5.4, 'walk', true),
  K(63.9, -11.9, floorY(2), -5.2, 'walk', true),
  K(64.2, -11.9, floorY(2), -5.2, 'aim', true),
  K(70.4, -11.9, floorY(2), -5.2, 'aim', true),
  K(72.7, -11.9, floorY(2), -5.2, 'idle', true),
  K(72.8, -11.9, floorY(2), -5.2, 'walk', false),
  K(74.2,  -9.1, floorY(2), -5.2, 'walk', false),   // lima langkah
  K(75.2,  -6.3, floorY(2), -5.2, 'freeze', false), // sepuluh langkah, lalu membeku
  K(80.5,  -6.3, floorY(2), -5.2, 'run', false),    // lari ke eskalator
  K(81.3,  e1t.x, e1t.y, ZR, 'run', false),
  K(83.2,  e1f.x, e1f.y, ZR, 'run', false),       // turun E1
  K(83.3,  e0t.x, e0t.y, ZR, 'run', false),
  K(85.2,  e0f.x, e0f.y, ZR, 'run', false),       // turun E0
  K(86.5, -11.3, 0.15, -4.4, 'run', true),
  K(86.8, -11.3, 0.15, -4.4, 'sit', false),
  K(131,  -11.3, 0.15, -4.4, 'sit', false),
];
// posisi penjaga pada waktu t: {x,y,z,mode,flip,dist}
// dist = jarak tempuh kumulatif (m), dipakai untuk menyinkronkan langkah dengan kaki (tanpa meluncur)
const SEGLEN = HERO_KEYS.map((k, i) => (i ? Math.hypot(k.x - HERO_KEYS[i - 1].x, k.y - HERO_KEYS[i - 1].y, k.z - HERO_KEYS[i - 1].z) : 0));
const CUM = []; SEGLEN.reduce((s, l, i) => (CUM[i] = s + l), 0);
export function heroAt(t) {
  let i = 1; while (i < HERO_KEYS.length - 1 && t > HERO_KEYS[i].t) i++;
  const a = HERO_KEYS[i - 1], b = HERO_KEYS[i], u = Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t || 1)));
  const moving = a.mode === 'walk' || a.mode === 'run';
  const f = moving ? u : (a.x === b.x && a.y === b.y && a.z === b.z ? 0 : 0);   // hanya bergerak bila mode jalan/lari
  const x = a.x + (b.x - a.x) * f, y = a.y + (b.y - a.y) * f, z = a.z + (b.z - a.z) * f;
  const dist = CUM[i - 1] + SEGLEN[i] * f;
  // di segmen non-jalan, posisi = kunci a, kecuali kunci b adalah awal gerak (diam sampai kunci berikut)
  const flip = a.mode === 'walk' || a.mode === 'run' ? (b.x - a.x < -0.01 ? true : (b.x - a.x > 0.01 ? false : a.flip)) : a.flip;
  return { x: moving ? x : a.x, y: moving ? y : a.y, z: moving ? z : a.z, mode: a.mode, flip, dist, seg: i - 1, u };
}
// langkah kaki (dtk) untuk foley: dari simulasi jalur, tiap 0,56 m di mode jalan/lari (bukan di eskalator)
export function stepTimes() {
  const out = [], dt = 1 / 60; let last = 0, acc = 0;
  for (let t = 0; t < DUR; t += dt) {
    const h = heroAt(t), h2 = heroAt(t + dt);
    if (h.mode !== 'walk' && h.mode !== 'run') { continue; }
    const d = h2.dist - h.dist; acc += d;
    const stride = h.mode === 'run' ? 0.85 : 0.56;
    if (acc >= stride) { acc -= stride; out.push({ t: +t.toFixed(3), onEsc: Math.abs(h.z - ZR) < 0.02 && Math.abs(h.x) <= SLOT + 0.01, run: h.mode === 'run' }); }
  }
  return out;
}

// —— lonceng kotak musik: nada acak-deterministik, tersendat-sendat ——
function mb(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// melodi pendek 12 nada (D minor, midi), berulang, dengan jeda yang tidak rata dan nada yang meleset sedikit
const TUNE = [62, 65, 69, 74, 72, 69, 65, 69, 67, 64, 60, 64];
export function boxNotes() {
  const out = [], R = mb(7);
  const play = (t0, t1, hesitant) => {
    let t = t0, i = 0;
    while (t < t1) {
      const stall = R() < (hesitant ? .22 : .1);
      if (stall) t += .45 + R() * .5;                       // tersendat: berhenti sejenak
      const n = TUNE[i % TUNE.length] + (R() < .08 ? (R() < .5 ? -1 : 1) : 0);   // sesekali nada meleset setengah nada
      out.push({ t: +t.toFixed(3), n, v: .55 + R() * .4 });
      t += .34 + R() * .22 + (i % 4 === 3 ? .18 : 0); i++;
    }
  };
  play(TIMES.boxOpen, TIMES.boxClose - .05, true);
  play(TIMES.boxAgain, 83.0, true);
  return out;
}
export const boxPlaying = t => (t >= TIMES.boxOpen && t < TIMES.boxClose) || (t >= TIMES.boxAgain && t < 84.5);

// —— senter sebagai ukuran: 0..1 (kecerahan) ——
export function torchLevel(t) {
  const k = [[0, 1], [6, 1], [10, .9], [18, .62], [30, .62], [43, .7], [48.4, .7], [49.0, .3], [49.5, .62], [50.1, .22], [51.2, .5], [52.0, .38], [56, .55], [60, .6], [62, .6],
    [62.3, .4], [63, .6], [66.5, .35], [67.8, .6], [70.7, .55], [71.3, .45], [76.0, .5], [76.2, .15], [76.6, .5], [77.2, .12], [78, .4], [79.2, .1], [80.2, .32], [86.0, .3], [86.8, 0], [131, 0]];
  let i = 1; while (i < k.length - 1 && t > k[i][0]) i++;
  const a = k[i - 1], b = k[i], u = Math.min(1, Math.max(0, (t - a[0]) / (b[0] - a[0] || 1)));
  return a[1] + (b[1] - a[1]) * u;
}

// jam dinding (HUD dan layar CCTV): mulai 23.40
export const clock = t => { const m = 40 + Math.floor(t / 8); return '23.' + String(m).padStart(2, '0'); };
