// Bangun film/timeline.json dari naskah (script/story.json) + timing VO pengguna (film/timing.json).
// Timing VO adalah hasil transkrip dua rekaman: voiceover/ep01/1.mp3 + 2.mp3.
// Semua baris digeser OFFSET detik supaya kartu judul (0..OFFSET) tidak menutupi narasi.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const story = JSON.parse(fs.readFileSync(path.join(ROOT, 'script/story.json'), 'utf8'));
const timing = JSON.parse(fs.readFileSync(path.join(ROOT, 'film/timing.json'), 'utf8'));
const U = timing.lines;
const OFFSET = 5.0;      // durasi kartu judul
const TAIL = 0.7;        // jeda setelah baris terakhir sebelum kartu penutup
const OUTRO = 8.0;       // durasi kartu penutup

const sceneOf = id => story.lines.find(l => l.id === id)?.scene;
const E = [];
function add(id, u, opts = {}) {
  const scene = opts.scene ?? sceneOf(id);
  if (!scene) throw new Error('id tidak ada di script/story.json: ' + id);
  const us = Array.isArray(u) ? u : [u];
  const a = us[0], b = us[us.length - 1];
  let t0 = U[a].t0, t1 = U[b].t1;
  if (opts.part) { t0 = U[a].t0 + opts.part[0]; t1 = U[a].t0 + opts.part[1]; }
  const text = opts.text ?? us.map(i => U[i].text).join(' ');
  E.push({
    id, scene, text,
    t: +(OFFSET + t0).toFixed(3),
    dur: +(t1 - t0).toFixed(3),
    kind: opts.kind ?? 'narr',
    ...(opts.who ? { who: opts.who } : {}),
  });
}

// ── SUBUH ────────────────────────────────────────────────────────────────
// v001 menggabungkan dua baris naskah; dipotong di jeda koma "gelap."
add('subuh_01', 0, { part: [0, 3.0], text: 'Bayangkan kamu bangun saat langit masih gelap.' });
add('subuh_02', 0, { part: [3.0, 9.98], text: 'Udara laut terasa lembap, suara tali kapal berderit, dan dari kejauhan terdengar orang-orang mulai memanggil satu sama lain.' });
add('subuh_03', 1);
add('subuh_04', 2);
// v004 menggabungkan "Namaku Najmi." + "Aku datang ..."
add('subuh_05', 3, { part: [0, 1.4], text: 'Namaku Najmi.', kind: 'dlg', who: 'Najmi' });
add('subuh_06', 3, { part: [1.4, 5.98], text: 'Aku datang dari pesisir utara Jawa bersama sebuah kapal dagang milik pamanku.' });
add('subuh_07', 4);
add('subuh_08', [5, 6]);           // v006 + v007
add('subuh_09', 7);

// ── PAGI (15 baris) ──────────────────────────────────────────────────────
for (let i = 1; i <= 15; i++) add(`pagi_${String(i).padStart(2, '0')}`, 8 + (i - 1));

// ── MENJELANG SIANG (13 baris) ───────────────────────────────────────────
for (let i = 1; i <= 13; i++) add(`jelangsiang_${String(i).padStart(2, '0')}`, 23 + (i - 1));

// ── SIANG ────────────────────────────────────────────────────────────────
for (let i = 1; i <= 7; i++) add(`siang_${String(i).padStart(2, '0')}`, 36 + (i - 1));
add('siang_08', 43);               // "Tapi, aku teringat pesan pamanku."
add('siang_08b', 44, { scene: 'siang', kind: 'dlg', who: 'Paman' }); // kutipan pesan paman
for (let i = 9; i <= 15; i++) add(`siang_${String(i).padStart(2, '0')}`, 36 + i);

// ── SIANG MENJELANG SORE ─────────────────────────────────────────────────
for (let i = 1; i <= 6; i++) add(`jelangsore_${String(i).padStart(2, '0')}`, 52 + (i - 1));
add('jelangsore_07', [58, 59]);    // v059 + v060

// ── SORE ─────────────────────────────────────────────────────────────────
for (let i = 1; i <= 3; i++) add(`sore_${String(i).padStart(2, '0')}`, 60 + (i - 1));
add('sore_04', [63, 64]);          // v064 + v065
add('sore_05', 65);
add('sore_06', [66, 67]);          // v067 + v068
for (let i = 7; i <= 9; i++) add(`sore_${String(i).padStart(2, '0')}`, 68 + (i - 7));

// ── MALAM ────────────────────────────────────────────────────────────────
for (let i = 1; i <= 12; i++) add(`malam_${String(i).padStart(2, '0')}`, 71 + (i - 1));
add('malam_13', 83);               // v084
add('malam_14', 84);               // v085
add('malam_15', 85);
add('malam_16', 86);
add('malam_17', 87, { scene: 'malam' }); // "Terima kasih."

// ── ADEGAN ───────────────────────────────────────────────────────────────
const scenes = timing.chapters.map((c, i) => {
  const s = story.scenes[i];
  const first = E.find(l => l.scene === s.id);
  if (!s || !first) throw new Error('adegan tidak cocok: ' + c.id);
  return {
    id: s.id, label: s.label, sub: s.sub,
    a: +(OFFSET + c.a).toFixed(3),
    b: +(OFFSET + c.b).toFixed(3),
    vo0: first.t,
  };
});

const outroA = +(OFFSET + timing.chapters[timing.chapters.length - 1].b + TAIL).toFixed(3);
const outro = { a: outroA, b: +(outroA + OUTRO).toFixed(3) };
const tl = {
  meta: story.meta,
  title: { a: 0, b: OFFSET },
  scenes, lines: E, outro,
  dur: outro.b,
  source: 'voiceover/ep01/1.mp3 + voiceover/ep01/2.mp3',
  estimated: false,
};
fs.writeFileSync(path.join(ROOT, 'film/timeline.json'), JSON.stringify(tl, null, 1));
console.log(`timeline: ${E.length} baris, ${scenes.length} adegan, ${tl.dur.toFixed(3)} dtk (${(tl.dur / 60).toFixed(2)} menit)`);
console.log(`narasi: ${tl.lines[0].t.toFixed(1)}..${(tl.lines.at(-1).t + tl.lines.at(-1).dur).toFixed(3)} dtk, penutup ${outro.a}..${outro.b}`);
