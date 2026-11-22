// Arahan: kamera per-shot + blocking aktor, semuanya ditambatkan ke ID baris naskah (jadi ikut menyesuaikan durasi suara apa pun).
// A(id, f) = waktu pada fraksi f di dalam baris id; Z(id) = awal baris.
import * as THREE from 'three';
import { clamp, ss, lerp, seg } from '../vendor/lib.js';
import { makePerson } from './people.js';

const V = (x, y, z) => [x, y, z];
// —— keluarga pose ——
const IDLE = { idle: ['idle0', 'idle1'], talk: ['talk0', 'talk1', 'talk2', 'talk1'], talkLow: ['talkLow', 'talkLow2'], hold: ['hold0', 'hold1'], holdBig: ['holdBig'], sniff: ['sniff0', 'sniff1'], palm: ['palm0', 'palm1'], palmEmpty: ['palmEmpty'],
  point: ['point0', 'point1'], offer: ['offer0', 'offer1'], offerEmpty: ['offerEmpty'], wave: ['wave0', 'wave1'], count: ['count0', 'count1', 'countB', 'count1'], reach: ['reach0', 'reach1'], rope: ['rope0', 'rope1'], cross: ['cross0', 'cross1'],
  sit: ['sit0', 'sit1', 'sit0', 'sitBlink'], sitLook: ['sitLook'], sitLamp: ['sitLamp', 'sitLamp1'], sleep: ['sleep0', 'sleep1'], carry: ['cIdle0', 'cIdle1'], front: ['fIdle0', 'fIdle1'], lamp: ['lIdle0', 'lIdle1'], lHigh: ['lHigh', 'lHigh1'], basket: ['bIdle'],
  surprise: ['surprise'], nod: ['nod', 'idle0'], no: ['no0', 'no1'], up: ['up'] };
const RATE = { sleep: .35, talk: 4, talkLow: 3, count: 3, wave: 3.5, rope: 3, sit: 1.2, idle: 1.6 };
const LAMPPX = { lamp: [30, 26], lHigh: [31, 22], sitLamp: [30, 33], l: [30, 26] };

function frameOf(act, t, ph = 0) {
  const w = /^[wcflb]$/.test(act); if (w) return act + (Math.floor((t + ph) * 9) % 4);
  const arr = IDLE[act] ?? IDLE.idle, r = RATE[act] ?? 2;
  if (act === 'idle' && (Math.floor((t + ph) * 8) % 29 === 3)) return 'blink';
  return arr[Math.floor((t + ph) * r) % arr.length];
}

export function makeDirector(TL, W, camera) {
  const ln = Object.fromEntries(TL.lines.map(l => [l.id, l])), scn = Object.fromEntries(TL.scenes.map(s => [s.id, s]));
  const A = (id, f = 0) => ln[id].t + ln[id].dur * f, Z = id => ln[id].t, E = id => ln[id].t + ln[id].dur;
  const sceneAt = t => TL.scenes.find(s => t >= s.a && t < s.b) || (t < TL.scenes[0].a ? TL.scenes[0] : TL.scenes[TL.scenes.length - 1]);

  // ═══════ KAMERA ═══════
  // shot: { at, p0, l0, f0, p1?, l1?, f1?, focus?: 'najmi'|[x,y,z], tilt?: 0..1 (tetap), span?: lebar bayangan, ease? }
  const SH = { subuh: [], pagi: [], jelangsiang: [], siang: [], jelangsore: [], sore: [], malam: [] };
  const D = {
    // ——— SUBUH ———
    subuh: [
      { at: scn.subuh.a, p0: V(-12, 10.5, -4), l0: V(-3.8, .4, -14.8), f0: 30, p1: V(-9.4, 7, -7.4), l1: V(-3.7, .6, -14.8), f1: 25, focus: 'najmi', span: 14 },
      { at: A('subuh_02', -.02), p0: V(-9, 8, -5), l0: V(-3.6, 1, -14), f0: 30, p1: V(-20, 22, 26), l1: V(0, 2, -12), f1: 38, focus: V(-3.6, 1, -14), tilt: .4, span: 40 },
      { at: A('subuh_03', -.04), p0: V(-9.2, 4.4, -8.6), l0: V(-3.6, 1.3, -14.8), f0: 24, p1: V(-8.4, 4.2, -9.2), l1: V(-3.6, 1.3, -14.8), f1: 23, focus: 'najmi', span: 14 },
      { at: A('subuh_04', -.04), p0: V(-22, 30, 36), l0: V(6, 5, -70), f0: 40, p1: V(-10, 42, 30), l1: V(26, 12, -90), f1: 46, focus: V(40, 10, -80), tilt: .42, span: 60 },
      { at: A('subuh_05', -.05), p0: V(3.2, 4.8, -8.6), l0: V(-3.9, 1.1, -15.2), f0: 26, p1: V(2.4, 4.6, -9.6), l1: V(-3.9, 1.2, -15), f1: 26, focus: V(-3.9, 1.2, -14.8), span: 14 },
      { at: A('subuh_08', -.05), p0: V(8, 6, -2), l0: V(0, 1.2, -16), f0: 30, p1: V(4, 10, 6), l1: V(0, 1.2, -22), f1: 34, focus: V(0, 1.2, -14), tilt: .4, span: 24 },
    ],
    // ——— PAGI ———
    pagi: [
      { at: scn.pagi.a, p0: V(-16, 18, 18), l0: V(0, 1, -14), f0: 36, p1: V(-10, 14, 12), l1: V(0, 1, -14), f1: 36, focus: V(0, 1, -14), tilt: .4, span: 36 },
      { at: A('pagi_03', -.05), p0: V(5.5, 5.4, -2.5), l0: V(-.4, .9, -10), f0: 27, p1: V(4.5, 5, -4.5), l1: V(-.4, .9, -12), f1: 27, focus: V(-.2, 1, -9), span: 22 },
      { at: A('pagi_04', -.05), p0: V(-22, 6.4, 17), l0: V(-19, 1.3, 4), f0: 32, p1: V(6, 6.4, 17), l1: V(9, 1.3, 4), f1: 32, focus: V(0, 1.2, 4), tilt: .5, span: 36 },
      { at: A('pagi_05', -.05), p0: V(10.5, 4.4, 10.2), l0: V(6.8, 1, 2.6), f0: 25, p1: V(9, 4.2, 9), l1: V(6.8, 1, 2.6), f1: 24, focus: V(6.8, 1, 2.8), span: 22 },
      { at: A('pagi_10', -.05), p0: V(-6.5, 5.2, -3.5), l0: V(-.6, 1, -10.5), f0: 28, p1: V(-5.5, 5, -2.8), l1: V(-.3, 1, -8.5), f1: 28, focus: 'najmi', span: 22 },
      { at: A('pagi_13', -.05), p0: V(14, 14, 16), l0: V(0, 2, -18), f0: 40, p1: V(6, 24, 26), l1: V(0, 2, -30), f1: 44, focus: V(0, 1, -22), tilt: .42, span: 50 },
    ],
    // ——— MENJELANG SIANG ———
    jelangsiang: [
      { at: scn.jelangsiang.a, p0: V(5.5, 4.8, 2.5), l0: V(-.2, 1.2, -3.3), f0: 26, p1: V(4.6, 4.6, 2), l1: V(-.3, 1.2, -3.4), f1: 26, focus: V(-.2, 1.2, -3.3), span: 18 },
      { at: A('jelangsiang_02', -.05), p0: V(-1, 5.4, 14), l0: V(-3, 1.3, 4), f0: 30, p1: V(-11, 5.4, 14), l1: V(-13, 1.3, 4), f1: 30, focus: 'najmi', span: 28 },
      { at: A('jelangsiang_03', -.05), p0: V(-8.8, 3.6, 9.4), l0: V(-12, 1, 2.8), f0: 24, p1: V(-10, 3.4, 8.4), l1: V(-12, 1, 2.6), f1: 23, focus: V(-12, 1, 2.6), span: 18 },
      { at: A('jelangsiang_05', -.05), p0: V(-19.5, 5, 19), l0: V(-15, .7, 11.5), f0: 26, p1: V(-17.5, 4.4, 17), l1: V(-15, .7, 11.5), f1: 25, focus: V(-15, .8, 11.5), span: 20 },
      { at: A('jelangsiang_06', -.05), p0: V(-17, 3.2, 12), l0: V(-8, 3.5, -12), f0: 32, p1: V(-17, 3.6, 12), l1: V(-3, 5, -14), f1: 32, focus: V(-8, 1, -4), tilt: .38, span: 40 },
      { at: A('jelangsiang_07', -.05), p0: V(-3.4, 3.6, 10.6), l0: V(-6.6, 1.2, 5.3), f0: 24, p1: V(-4.2, 3.2, 9.6), l1: V(-6.6, 1.2, 5.3), f1: 23, focus: 'najmi', span: 16 },
      { at: A('jelangsiang_10', -.05), p0: V(-2, 4.6, 11), l0: V(-6.4, 1.4, 5.4), f0: 26, p1: V(-3, 4.4, 10.2), l1: V(-6.4, 1.4, 5.4), f1: 26, focus: V(-6.4, 1.4, 5.4), span: 18 },
      { at: A('jelangsiang_11', -.1), p0: V(-9, 6, 4), l0: V(-3, 1.6, -18), f0: 32, p1: V(-6, 8, 4), l1: V(-2, 1.6, -20), f1: 34, focus: V(-3, 1, -17), tilt: .4, span: 34 },
    ],
    // ——— SIANG ———
    siang: [
      { at: scn.siang.a, p0: V(-2, 6, 15), l0: V(2.4, 1.2, 4.6), f0: 28, p1: V(2.4, 6, 14), l1: V(5, 1.2, 4), f1: 27, focus: 'najmi', span: 26 },
      { at: A('siang_02', -.05), p0: V(1.2, 4, 11.2), l0: V(5.6, 1.2, 3.6), f0: 24, p1: V(2.4, 3.8, 10.6), l1: V(5.8, 1.2, 3.4), f1: 24, focus: V(5.8, 1.1, 3.5), span: 18 },
      { at: A('siang_03', -.05), p0: V(13, 7, 14), l0: V(6.8, 1, 3), f0: 30, p1: V(11, 6.4, 12), l1: V(6.8, 1, 3), f1: 28, focus: V(6.8, 1, 3), span: 20 },
      { at: A('siang_04', -.05), p0: V(2.8, 2.6, 8.4), l0: V(5.4, .9, 4.6), f0: 22, p1: V(3.4, 2.2, 8), l1: V(5.5, .8, 4.6), f1: 20, focus: V(5.5, .8, 4.6), span: 14 },
      { at: A('siang_06', -.05), p0: V(1.2, 4.2, 10.6), l0: V(4.8, 1.3, 4.8), f0: 24, p1: V(2, 4, 10), l1: V(4.8, 1.3, 4.8), f1: 24, focus: 'najmi', span: 16 },
      { at: A('siang_08', -.05), p0: V(1, 4.4, 9.4), l0: V(3.4, 1.4, 5.2), f0: 25, p1: V(1.6, 4.2, 9), l1: V(3.6, 1.4, 5.2), f1: 25, focus: V(3.5, 1.4, 5.2), span: 16 },
      { at: A('siang_09', -.05), p0: V(9, 5.2, 12), l0: V(5.2, 1.1, 4.4), f0: 27, p1: V(8.2, 4.4, 10), l1: V(5.2, 1.1, 4.4), f1: 24, focus: V(5.2, 1, 4.4), span: 18 },
      { at: A('siang_11', -.05), p0: V(9.4, 4.6, 10), l0: V(6.4, 1.4, 3), f0: 24, p1: V(8.8, 4.4, 9.4), l1: V(6.4, 1.4, 3), f1: 24, focus: V(6.4, 1.4, 3), span: 16 },
      { at: A('siang_13', -.05), p0: V(11, 5, 12), l0: V(5.3, 1.4, 4.2), f0: 26, p1: V(10, 4.8, 11), l1: V(5.3, 1.4, 4.2), f1: 25, focus: V(5.3, 1.4, 4.2), span: 18 },
      { at: A('siang_14', -.05), p0: V(14, 12, 24), l0: V(5, 1.5, 0), f0: 36, p1: V(18, 22, 34), l1: V(3, 2, -8), f1: 40, focus: V(5, 1, 3), tilt: .45, span: 44 },
    ],
    // ——— SIANG MENJELANG SORE ———
    jelangsore: [
      { at: scn.jelangsore.a, p0: V(5, 5.4, 15), l0: V(9, 1.3, 4.6), f0: 30, p1: V(17, 5.4, 15), l1: V(20, 1.3, 4.6), f1: 30, focus: 'najmi', span: 30 },
      { at: A('jelangsore_02', -.05), p0: V(21.8, 3.6, 10.4), l0: V(17.8, 1.1, 2.6), f0: 24, p1: V(20.4, 3.4, 9.4), l1: V(17.8, 1.1, 2.6), f1: 23, focus: V(17.8, 1.1, 2.8), span: 18 },
      { at: A('jelangsore_04', -.05), p0: V(19.6, 4.8, 11.2), l0: V(17.4, 1.2, 4.6), f0: 26, p1: V(18.6, 4.6, 10.4), l1: V(17.4, 1.2, 4.6), f1: 25, focus: 'najmi', span: 18 },
      { at: A('jelangsore_05', -.05), p0: V(-4, 7.4, 17), l0: V(4, 1.4, 5), f0: 32, p1: V(14, 8.4, 18), l1: V(10, 1.4, 5), f1: 32, focus: V(5, 1.2, 5.6), tilt: .5, span: 34 },
      { at: A('jelangsore_07', -.05), p0: V(14, 10, 20), l0: V(4, 1.5, 3), f0: 36, p1: V(8, 16, 26), l1: V(2, 1.5, -2), f1: 40, focus: V(3, 1.2, 5), tilt: .45, span: 40 },
    ],
    // ——— SORE ———
    sore: [
      { at: scn.sore.a, p0: V(-12, 16, 22), l0: V(-3, 8, -40), f0: 38, p1: V(-8, 12, 14), l1: V(-2, 6, -50), f1: 40, focus: V(-3, 3, -30), tilt: .42, span: 40 },
      { at: A('sore_03', -.05), p0: V(7, 5.6, 1), l0: V(.2, 1, -8), f0: 28, p1: V(6, 5.2, -1.4), l1: V(.2, 1, -10), f1: 28, focus: V(0, 1, -7), span: 22 },
      { at: A('sore_04', -.05), p0: V(-6.4, 5.4, -4), l0: V(-.4, 1.1, -12), f0: 28, p1: V(-5.8, 5.2, -6), l1: V(-.6, 1.1, -14), f1: 28, focus: V(-.6, 1, -12), span: 22 },
      { at: A('sore_06', -.05), p0: V(4, 6.4, -1), l0: V(0, 1, -12), f0: 32, p1: V(8, 12, 4), l1: V(0, 1, -16), f1: 36, focus: V(0, 1, -12), tilt: .42, span: 34 },
      { at: A('sore_07', -.05), p0: V(3.4, 3.2, 6.4), l0: V(.8, 1.1, -.6), f0: 24, p1: V(3, 3, 5.8), l1: V(.8, 1.1, -.6), f1: 23, focus: 'najmi', span: 14 },
    ],
    // ——— MALAM ———
    malam: [
      { at: scn.malam.a, p0: V(-9, 14, 22), l0: V(0, 1, -16), f0: 36, p1: V(-6, 10, 12), l1: V(0, 1.4, -18), f1: 36, focus: V(0, 1, -14), tilt: .42, span: 40 },
      { at: A('malam_03', -.1), p0: V(2.6, 3.6, -3.6), l0: V(.9, .9, -10.2), f0: 22, p1: V(2.2, 3.4, -4.4), l1: V(.9, .9, -10.2), f1: 21, focus: 'najmi', span: 14 },
      { at: A('malam_05', -.1), p0: V(6, 11, 8), l0: V(.9, 1, -11), f0: 32, p1: V(8, 15, 14), l1: V(.9, 1, -14), f1: 34, focus: V(.9, 1, -10.6), tilt: .42, span: 30 },
      { at: A('malam_09', -.05), p0: V(2.6, 3.4, -3.8), l0: V(.9, .9, -10.2), f0: 22, p1: V(2.2, 3.2, -4.6), l1: V(.9, .9, -10.2), f1: 21, focus: 'najmi', span: 14 },
      { at: A('malam_11', -.05), p0: V(2.8, 3.6, -5.6), l0: V(.9, .5, -10.6), f0: 22, p1: V(2, 5, -2.5), l1: V(.9, .5, -10.8), f1: 24, focus: 'najmi', span: 14 },
      { at: A('malam_13', -.05), p0: V(4, 8, 2), l0: V(0, 1, -16), f0: 30, p1: V(-6, 24, 30), l1: V(10, 6, -60), f1: 44, focus: V(0, 1, -16), tilt: .4, span: 50 },
    ],
  };

  // ═══════ AKTOR ═══════
  // kunci: [waktu, x, y, z, aksi, {walk, spd, flip}] — di waktu kunci aktor berjalan dari posisi sebelumnya ke sini, lalu melakukan 'aksi'. aksi 'hide' = menghilang.
  const DK = -3.4, DZ = -15.0, DY = .234;            // posisi geladak perahu A
  const lane = 5.6;
  const ACT = {
    najmi: [
      [scn.subuh.a, DK, DY, DZ + .2, 'sleep', { flip: 1 }],
      [A('subuh_01', .62), DK, DY, DZ, 'sit', { flip: 1 }],
      [A('subuh_02', .5), DK, DY, DZ, 'sitLook', { flip: 1 }],
      [A('subuh_03', .0), DK, DY, DZ, 'idle', { flip: 1 }],
      [A('subuh_04', .0), DK, DY, DZ, 'lamp', { flip: 1 }],
      [A('subuh_05', .1), DK, DY, DZ, 'wave', { flip: 1 }],
      [A('subuh_06', .0), DK, DY, DZ, 'talk', { flip: 1 }],
      [A('subuh_07', .0), DK, DY, DZ, 'point', { flip: 1 }],
      [A('subuh_08', .0), DK, DY, DZ, 'talkLow', { flip: 1 }],
      [A('subuh_09', .0), DK, DY, DZ, 'no', { flip: 1 }],
      // pagi: turun menolong membongkar muatan
      [A('pagi_08', .0), DK, DY, DZ, 'idle', { flip: 1 }],
      [A('pagi_10', .0), DK + .5, DY, DZ - 2.1, 'front', { walk: 'f', spd: 1.4 }],
      [A('pagi_10', .55), -1.9, .14, -14.4, 'front', { walk: 'f', spd: 1.5 }],
      [A('pagi_10', .85), .2, 0, -11.6, 'front', { walk: 'f', spd: 1.5 }],
      [A('pagi_11', .4), .35, 0, -8.8, 'front', { walk: 'f', spd: 1.5 }],
      [A('pagi_12', .2), .6, 0, -5.2, 'idle', { walk: 'f', spd: 1.5 }],
      [A('pagi_13', .0), .6, 0, -5.2, 'talk'],
      [A('pagi_15', .0), .6, 0, -5.2, 'up'],
      // menjelang siang: dapat tugas dari paman
      [scn.jelangsiang.a, -.4, 0, -3.5, 'nod', { flip: 0 }],
      [A('jelangsiang_01', .55), -.4, 0, -3.5, 'idle', { flip: 0 }],
      [A('jelangsiang_02', .0), -11.5, 0, lane, 'idle', { walk: 'w', spd: 1.7, flip: 0 }],
      [A('jelangsiang_03', .0), -11.5, 0, lane, 'idle'],
      [A('jelangsiang_04', .5), -11.5, 0, lane, 'point', { flip: 1 }],
      [A('jelangsiang_05', .0), -12.6, 0, lane + 1.2, 'idle', { walk: 'w', spd: 1.2, flip: 1 }],
      [A('jelangsiang_06', .0), -12.6, 0, lane + 1.2, 'up', { flip: 1 }],
      [A('jelangsiang_07', .0), -6.6, 0, 5.4, 'hold', { walk: 'w', spd: 1.9, flip: 0 }],
      [A('jelangsiang_08', .0), -6.6, 0, 5.4, 'sniff'],
      [A('jelangsiang_09', .0), -6.6, 0, 5.4, 'holdBig'],
      [A('jelangsiang_09', .45), -6.6, 0, 5.4, 'palm'],
      [A('jelangsiang_10', .0), -6.6, 0, 5.4, 'nod'],
      [A('jelangsiang_11', .0), -6.6, 0, 5.4, 'idle'],
      [A('jelangsiang_13', .0), -6.6, 0, 5.4, 'hold'],
      // siang: menawar
      [scn.siang.a, 2.4, 0, lane, 'idle', { flip: 0 }],
      [A('siang_01', .0), 5.2, 0, 4.7, 'talk', { walk: 'w', spd: 1.5, flip: 0 }],
      [A('siang_02', .0), 5.2, 0, 4.7, 'idle'],
      [A('siang_03', .0), 5.2, 0, 4.7, 'point'],
      [A('siang_04', .0), 5.5, 0, 4.7, 'reach'],
      [A('siang_05', .0), 5.5, 0, 4.7, 'sniff'],
      [A('siang_06', .0), 5.2, 0, 4.7, 'count'],
      [A('siang_07', .0), 5.2, 0, 4.7, 'count'],
      [A('siang_08', .0), 5.2, 0, 4.7, 'idle'],
      [A('siang_09', .0), 5.2, 0, 4.7, 'point'],
      [A('siang_10', .0), 5.2, 0, 4.7, 'palm'],
      [A('siang_11', .0), 5.2, 0, 4.7, 'surprise'],
      [A('siang_12', .0), 5.2, 0, 4.7, 'nod'],
      [A('siang_13', .0), 5.4, 0, 4.4, 'offer'],
      [A('siang_14', .0), 5.2, 0, 4.7, 'talk'],
      [A('siang_15', .0), 5.2, 0, 4.7, 'idle'],
      // fuli
      [scn.jelangsore.a, 9.4, 0, lane, 'idle', { flip: 0 }],
      [A('jelangsore_01', .0), 17.4, 0, 4.7, 'idle', { walk: 'w', spd: 1.9, flip: 0 }],
      [A('jelangsore_02', .0), 17.4, 0, 4.7, 'palm'],
      [A('jelangsore_03', .0), 17.4, 0, 4.7, 'hold'],
      [A('jelangsore_04', .0), 17.4, 0, 4.7, 'surprise'],
      [A('jelangsore_05', .0), 15.2, 0, lane + .6, 'idle', { walk: 'w', spd: 1.2, flip: 1 }],
      [A('jelangsore_06', .0), 9.6, 0, lane + .8, 'idle', { walk: 'w', spd: 1.2, flip: 1 }],
      [A('jelangsore_07', .0), 9.6, 0, lane + .8, 'up', { flip: 1 }],
      // sore: menghitung barang di dekat dermaga
      [scn.sore.a, 4.2, 0, 4.2, 'idle', { flip: 1 }],
      [A('sore_03', .0), .6, 0, -1.2, 'idle', { walk: 'w', spd: 2.2, flip: 1 }],
      [A('sore_04', .0), .6, 0, -1.2, 'carry'],
      [A('sore_07', .0), .8, 0, 0, 'count', { flip: 0 }],
      [A('sore_09', .0), .8, 0, 0, 'idle'],
      // malam: duduk di tumpukan karung dengan lentera
      [scn.malam.a, 4.4, 0, -2.4, 'idle', { flip: 1 }],
      [A('malam_02', .0), .9, 0.0, -10.2, 'lamp', { walk: 'l', spd: 1.3, flip: 1 }],
      [A('malam_03', .0), .9, 0, -10.2, 'sitLamp', { flip: 0 }],
      [A('malam_09', .0), .9, 0, -10.2, 'sitLamp', { flip: 0 }],
      [A('malam_11', .0), .9, 0, -10.2, 'sit', { flip: 0 }],
      [A('malam_11', .6), .9, 0, -10.2, 'sleep', { flip: 0 }],
    ],
    paman: [
      [A('subuh_06', -.1), -4.5, DY, -13.0, 'idle', { flip: 0 }],
      [A('subuh_07', .0), -4.3, DY, -13.2, 'point', { flip: 0 }],
      [A('subuh_09', .0), -4.3, DY, -13.2, 'cross', { flip: 0 }],
      [A('pagi_01', .0), -4.3, DY, -13.2, 'hide'],
      [A('pagi_11', .2), -1.0, 0, -4.4, 'cross', { flip: 0 }],
      [A('pagi_13', .0), -1.0, 0, -4.4, 'talk'],
      [scn.jelangsiang.a, -1.5, 0, -3.5, 'talk', { flip: 0 }],
      [A('jelangsiang_01', .0), -1.5, 0, -3.5, 'point'],
      [A('jelangsiang_02', .5), -1.5, 0, -3.5, 'cross'],
      [A('jelangsiang_07', .0), -7.8, 0, 5.8, 'idle', { walk: 'w', spd: 1.5, flip: 0 }],
      [A('jelangsiang_09', .0), -7.8, 0, 5.8, 'cross'],
      [A('jelangsiang_10', .0), -7.8, 0, 5.8, 'talk'],
      [A('jelangsiang_11', .0), -7.8, 0, 5.8, 'point', { flip: 0 }],
      [A('jelangsiang_12', .0), -7.8, 0, 5.8, 'talk'],
      [A('jelangsiang_13', .0), -7.8, 0, 5.8, 'point'],
      [scn.siang.a, 0.2, 0, lane + 1.6, 'cross', { flip: 0 }],
      [A('siang_01', .0), 3.4, 0, 5.4, 'cross', { walk: 'w', spd: 1.6, flip: 0 }],
      [A('siang_08', .0), 3.4, 0, 5.4, 'talk'],
      [A('siang_09', .0), 3.4, 0, 5.4, 'cross'],
      [A('siang_14', .0), 3.4, 0, 5.4, 'nod'],
      [scn.jelangsore.a, 7.8, 0, lane + 1, 'cross', { flip: 0 }],
      [A('jelangsore_01', .0), 15.9, 0, 5.4, 'cross', { walk: 'w', spd: 1.8, flip: 0 }],
      [A('jelangsore_03', .0), 15.9, 0, 5.4, 'talk'],
      [A('jelangsore_05', .0), 14.5, 0, 6.2, 'cross', { walk: 'w', spd: 1.2, flip: 1 }],
      [A('jelangsore_07', .0), 10.8, 0, 6.2, 'cross', { walk: 'w', spd: 1.2, flip: 1 }],
      [scn.sore.a, 5.4, 0, 5.4, 'cross', { flip: 1 }],
      [A('sore_03', .0), 1.8, 0, -.4, 'point', { walk: 'w', spd: 2, flip: 1 }],
      [A('sore_05', .0), 1.8, 0, -.4, 'cross'],
      [A('sore_09', .0), 1.8, 0, -.4, 'talk'],
      [A('sore_09', .98), 1.8, 0, -.4, 'hide'],
    ],
    seller: [
      [scn.pagi.a, 6.8, 0, 1.9, 'idle', { flip: 0 }],
      [A('pagi_05', .0), 6.8, 0, 1.9, 'palm'],
      [A('pagi_07', .0), 6.8, 0, 1.9, 'idle'],
      [A('siang_02', .0), 6.8, 0, 2.0, 'offer', { flip: 1 }],
      [A('siang_03', .0), 6.8, 0, 2.0, 'talk'],
      [A('siang_04', .0), 6.8, 0, 2.0, 'idle'],
      [A('siang_09', .0), 6.8, 0, 2.0, 'surprise'],
      [A('siang_10', .0), 6.8, 0, 2.0, 'nod'],
      [A('siang_11', .0), 6.8, 0, 2.0, 'talk'],
      [A('siang_12', .0), 6.8, 0, 2.0, 'point'],
      [A('siang_13', .0), 6.8, 0, 2.0, 'offer'],
      [A('siang_15', .0), 6.8, 0, 2.0, 'idle'],
      [A('sore_01', .0), 6.8, 0, 2.0, 'hide'],
    ],
  };
  // —— figuran: vendor tetap + pejalan (lintasan bolak-balik) ——
  // path: [[x,y,z],…], spd (m/s), walk ('w','c','f','b','l'), sc: adegan tempat ia terlihat, jeda di ujung (detik)
  const ALL = ['pagi', 'jelangsiang', 'siang', 'jelangsore'];
  const CROWD = [
    // subuh: pembawa lentera di pantai + awak di geladak
    { k: 'crew1', walk: 'l', sc: ['subuh'], path: [[-22, 0, 5.2], [-6, 0, 5.8]], spd: 1.0 }, { k: 'crew2', walk: 'l', sc: ['subuh'], path: [[20, 0, 5.4], [6, 0, 6.2]], spd: 1.1, ph: 3 },
    { k: 'woman1', walk: 'l', sc: ['subuh'], path: [[-14, 0, 6.8], [-2, 0, 6.6]], spd: .9, ph: 7 }, { k: 'seller2', walk: 'l', sc: ['subuh'], path: [[12, 0, 7.2], [26, 0, 6.6]], spd: .9, ph: 5 },
    { k: 'crew3', act: 'lamp', sc: ['subuh'], at: [-5.5, .234, -18.4], flip: 0 }, { k: 'crew2', act: 'rope', sc: ['subuh'], at: [-4.6, .234, -19.4], flip: 0 },
    { k: 'crew1', act: 'lamp', sc: ['subuh'], at: [5.3, .3, -19.4], flip: 1 },
    // pagi: awak mengangkat karung perahu A → dermaga → pantai
    { k: 'crew1', walk: 'c', sc: ['pagi'], path: [[-3.6, .234, -17.4], [-1.9, .14, -14.4], [0, 0, -11.6], [0, 0, -5.4], [3.8, 0, -3.8], [3.8, 0, -3.8]], spd: 1.7, ph: 0, pause: .6 },
    { k: 'crew2', walk: 'c', sc: ['pagi', 'jelangsiang'], path: [[-3.8, .234, -18.6], [-1.9, .14, -14.4], [-.6, 0, -11.6], [-.6, 0, -5.2], [-3.4, 0, -3.6]], spd: 1.7, ph: 5, pause: .6 },
    { k: 'crew3', walk: 'f', sc: ['pagi', 'jelangsiang'], path: [[.6, 0, -5.2], [5, 0, 5.2], [12.2, 0, 5.6]], spd: 1.5, ph: 2, pause: 1.2 },
    { k: 'turban', act: 'talk', sc: ALL, at: [-1.8, 0, 6.4], flip: 0 }, { k: 'turban2', act: 'talk', sc: ALL, at: [-.4, 0, 6.2], flip: 1 },
    { k: 'woman1', walk: 'b', sc: ALL, path: [[-24, 0, 7.6], [24, 0, 8.2]], spd: 1.1, ph: 6, pause: 3 },
    { k: 'woman2', walk: 'b', sc: ALL, path: [[22, 0, 7], [-22, 0, 7.4]], spd: 1.0, ph: 2, pause: 3 },
    { k: 'caping', walk: 'w', sc: ALL, path: [[-20, 0, 6.4], [20, 0, 6.8]], spd: 1.2, ph: 11, pause: 2 },
    { k: 'caping2', act: 'talk', sc: ['jelangsore', 'siang', 'jelangsiang'], at: [19.4, 0, 5.6], flip: 1 },
    { k: 'kid', walk: 'w', sc: ALL, path: [[-8, 0, 8.4], [8, 0, 9]], spd: 2.4, ph: 4, pause: .8 },
    { k: 'crew1', act: 'rope', sc: ['pagi', 'jelangsiang', 'siang'], at: [5.3, .3, -19.4], flip: 1 },
    { k: 'crew2', act: 'sit', sc: ['pagi', 'jelangsiang', 'siang', 'jelangsore'], at: [-3.5, 0, 4.9], flip: 0 },
    // vendor tetap
    { k: 'woman2', act: 'talk', sc: ALL, at: [-23, 0, 1.9], flip: 0 }, { k: 'seller2', act: 'offer', sc: ALL, at: [-17.5, 0, 1.9], flip: 0 },
    { k: 'woman1', act: 'sit', sc: ALL, at: [-12.8, 0, 2.3], flip: 0 }, { k: 'crew3', act: 'sit', sc: ALL, at: [-11.2, 0, 2.5], flip: 1 },
    { k: 'turban2', act: 'idle', sc: ALL, at: [-7, 0, 1.9], flip: 0 }, { k: 'crew1', act: 'idle', sc: ALL, at: [12.2, 0, 1.9], flip: 0 },
    { k: 'seller', act: 'offer', sc: ['jelangsiang', 'jelangsore', 'pagi'], at: [23.4, 0, 1.9], flip: 1 }, { k: 'seller2', act: 'offer', sc: ALL, at: [17.8, 0, 1.9], flip: 1 },
    { k: 'woman2', walk: 'w', sc: ['jelangsiang'], path: [[-15.4, 0, 12.8], [-13.8, 0, 12.8]], spd: .5, pause: 2 },
    { k: 'crew2', act: 'reach', sc: ['jelangsiang'], at: [-16.6, 0, 13.3], flip: 0 }, { k: 'woman2', act: 'reach', sc: ['jelangsiang', 'pagi'], at: [-13.4, 0, 13.3], flip: 1 },
    // siang: pembantu pedagang membuka karung
    { k: 'crew3', act: 'reach', sc: ['siang'], at: [8.4, 0, 4.6], flip: 1 }, { k: 'crew2', act: 'talk', sc: ['siang'], at: [10.4, 0, 5.8], flip: 1 },
    // sore: awak bergegas membawa karung ke perahu
    { k: 'crew1', walk: 'c', sc: ['sore'], path: [[3.4, 0, 5], [.4, 0, -3], [0, 0, -12], [-2, .14, -14.4], [-3.6, .234, -17.6]], spd: 2.6, ph: 1, pause: .4 },
    { k: 'crew2', walk: 'f', sc: ['sore'], path: [[-5, 0, 5.2], [-.6, 0, -3], [-.4, 0, -11], [-2, .14, -14.4], [-3.8, .234, -18.4]], spd: 2.5, ph: 4, pause: .4 },
    { k: 'crew3', walk: 'c', sc: ['sore'], path: [[7, 0, 5.6], [1.2, 0, -3], [.4, 0, -12], [1.6, 0, -20], [4.6, .3, -21.4]], spd: 2.6, ph: 8, pause: .4 },
    { k: 'turban', walk: 'f', sc: ['sore'], path: [[10, 0, 5.4], [1.4, 0, -3], [.4, 0, -12], [1.8, 0, -20], [4.8, .3, -22.2]], spd: 2.4, ph: 2, pause: .5 },
    { k: 'caping', walk: 'c', sc: ['sore'], path: [[14, 0, 6], [2, 0, -3], [.2, 0, -10], [-2, .14, -14.4], [-3.6, .234, -19]], spd: 2.4, ph: 6, pause: .5 },
    { k: 'woman1', walk: 'b', sc: ['sore'], path: [[-20, 0, 7.6], [-6, 0, 7.4]], spd: 2, ph: 3, pause: 1 },
    // malam: beberapa orang berlentera
    { k: 'crew2', act: 'lamp', sc: ['malam'], at: [1.4, 0, -4.4], flip: 1 }, { k: 'crew3', act: 'talk', sc: ['malam'], at: [-1.2, 0, -5.0], flip: 0 },
    { k: 'crew1', act: 'sit', sc: ['malam'], at: [-5.5, 0, 4.4], flip: 0 }, { k: 'turban', act: 'sitLamp', sc: ['malam'], at: [-4.0, 0, 4.6], flip: 1 },
    { k: 'crew3', walk: 'l', sc: ['malam'], path: [[8, 0, 6.2], [-8, 0, 6.6]], spd: .8, ph: 3, pause: 2 },
    { k: 'seller2', act: 'rope', sc: ['malam'], at: [4.9, .3, -19.8], flip: 1 },
  ];
  CROWD.forEach((c, i) => { c.len = 0; if (c.path) { const P = c.path; c.seg = []; for (let j = 1; j < P.length; j++) { const d = Math.hypot(P[j][0] - P[j - 1][0], P[j][2] - P[j - 1][2]) || .01; c.seg.push(d); c.len += d; } } });
  const crowd = CROWD.map((c, i) => { const p = makePerson(c.k); W.scene.add(p.root); p.root.visible = false; return { ...c, p, i }; });

  // ═══════ pemakaian ═══════
  const shotsFlat = []; for (const sid in D) D[sid].forEach((s, i, a) => shotsFlat.push({ ...s, sid, b: a[i + 1] ? a[i + 1].at : scn[sid].b }));
  shotsFlat.sort((x, y) => x.at - y.at);
  const tmpV = new THREE.Vector3();
  function cameraAt(t) {
    let s = shotsFlat.find(s => t >= s.at && t < s.b) || shotsFlat[t < shotsFlat[0].at ? 0 : shotsFlat.length - 1];
    const u = clamp((t - s.at) / Math.max(.01, s.b - s.at)), e = u * u * (3 - 2 * u) * .5 + u * .5;
    const L3 = (a, b) => a.map((v, i) => lerp(v, b[i], e));
    const p = L3(s.p0, s.p1 ?? s.p0), l = L3(s.l0, s.l1 ?? s.l0), fov = lerp(s.f0, s.f1 ?? s.f0, e);
    return { p, l, fov, focus: s.focus, tilt: s.tilt, span: s.span ?? 34, sid: s.sid };
  }
  function actorState(keys, t, key) {
    let i = -1; for (let j = 0; j < keys.length; j++) if (keys[j][0] <= t) i = j; else break;
    if (i < 0) return null; const k = keys[i], o = k[5] || {}; if (k[4] === 'hide') return null;
    const prev = keys[i - 1] && keys[i - 1][4] !== 'hide' ? keys[i - 1] : null;
    let x = k[1], y = k[2], z = k[3], act = k[4], flip = !!o.flip, walking = false;
    if (prev) { const dx = k[1] - prev[1], dz = k[3] - prev[3], d = Math.hypot(dx, dz), dur = d / (o.spd ?? 1.5), u = dur > .01 ? (t - k[0]) / dur : 1; if (d > .05 && u < 1) { walking = true; x = lerp(prev[1], k[1], u); z = lerp(prev[3], k[3], u); y = lerp(prev[2], k[2], u); act = o.walk ?? 'w'; flip = dx < 0; } }
    return { x, y, z, act, flip, walking };
  }
  function crowdState(c, t) {
    if (!c.sc.includes(sceneAt(t).id)) return null;
    if (!c.path) return { x: c.at[0], y: c.at[1], z: c.at[2], act: c.act, flip: !!c.flip };
    const pause = c.pause ?? 1.5, T = c.len / c.spd, cyc = 2 * (T + pause), s = (((t * 1 + (c.ph ?? 0) * 3.1) % cyc) + cyc) % cyc;
    let f, dir; if (s < T) { f = s / T; dir = 1; } else if (s < T + pause) { f = 1; dir = 0; } else if (s < 2 * T + pause) { f = 1 - (s - T - pause) / T; dir = -1; } else { f = 0; dir = 0; }
    let d = f * c.len, j = 0; while (j < c.seg.length - 1 && d > c.seg[j]) { d -= c.seg[j]; j++; } const a = c.path[j], b = c.path[j + 1], u = clamp(d / c.seg[j]);
    const x = lerp(a[0], b[0], u), y = lerp(a[1], b[1], u), z = lerp(a[2], b[2], u);
    if (dir === 0) return { x, y, z, act: 'talk', flip: f > .5 ? (c.path[c.path.length - 1][0] > c.path[0][0] ? false : true) : (c.path[0][0] > c.path[1][0]) };
    const mx = (b[0] - a[0]) * dir; return { x, y, z, act: c.walk, flip: mx < 0 };
  }
  function place(p, st, t, ph, idx) {
    if (!st) { p.root.visible = false; return; }
    p.root.visible = true; p.root.position.set(st.x, st.y, st.z);
    const f = frameOf(st.act, t, ph); p.frame(f); p.face(camera, st.flip); return f;
  }
  const lampOf = (p, f, st, L, T, t) => { const wlamp = st && (/^l\d$/.test(f) || /^(lIdle|lHigh|sitLamp)/.test(f)); if (!wlamp) { L.L.intensity = 0; L.G.material.opacity = 0; return; } const px = /^lHigh/.test(f) ? 31 : /^sitLamp/.test(f) ? 30 : 30, py = /^lHigh/.test(f) ? 22 : /^sitLamp/.test(f) ? 31 : 26; const hp = p.handPos(f, st.flip, px, py), toCam = tmpV.copy(camera.position).sub(hp).setY(0).normalize().multiplyScalar(.45); L.L.position.copy(hp).add(toCam); const k = Math.max(.15, T.lamp) * (1 + .07 * Math.sin(t * 13) + .05 * Math.sin(t * 23)); L.L.intensity = 2.8 * k; L.G.position.copy(hp); L.G.material.opacity = .85 * k; };
  function apply(t, T) {
    const cam = cameraAt(t);
    camera.position.set(...cam.p); camera.fov = cam.fov; camera.updateProjectionMatrix(); camera.lookAt(...cam.l);
    camera.updateMatrixWorld();
    for (const k of ['najmi', 'paman', 'seller']) { const p = W.cast[k], st = actorState(ACT[k], t); const f = place(p, st, t, k.length); if (k === 'najmi') lampOf(p, f, st, W.handLamp, T, t); if (k === 'paman') lampOf(p, f, st, W.handLamp2, T, t); }
    crowd.forEach(c => { const st = crowdState(c, t); const f = place(c.p, st, t, c.i * .37 + (c.ph ?? 0)); });
    // pengisi cahaya depan pahlawan: aktif di adegan siang agar sprite tidak gelap saat membelakangi cahaya
    const najmi = W.cast.najmi; W.fill.intensity = najmi.root.visible ? (T.lamp > .3 ? 1.6 : .9) : 0; W.fill.position.set(najmi.root.position.x + .3, najmi.root.position.y + 1.6, najmi.root.position.z + 2.4);
    // fokus
    const fo = cam.focus; let fp;
    if (fo === 'najmi') fp = najmi.root.position.clone().add(new THREE.Vector3(0, .8, 0)); else if (Array.isArray(fo)) fp = new THREE.Vector3(...fo); else fp = new THREE.Vector3(...cam.l);
    let tilt = cam.tilt; if (tilt == null) { tmpV.copy(fp).project(camera); tilt = clamp(tmpV.y * .5 + .5, .2, .8); }
    return { focus: fp, tilt, span: cam.span, sid: cam.sid };
  }
  return { apply, cameraAt, sceneAt, A, Z, E, ln, scn };
}
