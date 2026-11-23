// ui.js: overlay 2D: HUD jam + lantai, kartu "Bersambung", hitam di antara adegan. Teks suara ada di captions.js.
import * as W from './world.js';
import { W as VW, H as VH, PORTRAIT, K, SAFE } from './frame.js';
const cv = document.getElementById('ov'), g = cv.getContext('2d'); cv.width = VW; cv.height = VH;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), seg = (t, a, b) => clamp((t - a) / (b - a)), ss = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const CX = VW / 2, CY = PORTRAIT ? (SAFE.top + VH - SAFE.bottom) / 2 : VH / 2;
export async function overlayReady() { await Promise.all(['500 40px Cinzel', '700 40px Cinzel', 'italic 500 40px "Cormorant Garamond"'].map(f => document.fonts.load(f).catch(() => 0))); }
function spaced(text, x, y, sp, align = 'center') { const ws = [...text].map(c => g.measureText(c).width), tot = ws.reduce((a, b) => a + b, 0) + sp * (ws.length - 1); let cx = align === 'left' ? x : x - tot / 2; [...text].forEach((c, i) => { g.textAlign = 'left'; g.fillText(c, cx, y); cx += ws[i] + sp; }); }
function ornament(cx, y, w, a) {
  g.save(); g.globalAlpha = a; g.fillStyle = '#e2c989';
  for (const s of [-1, 1]) { const gr = g.createLinearGradient(cx, 0, cx + s * w, 0); gr.addColorStop(0, 'rgba(226,201,137,1)'); gr.addColorStop(1, 'rgba(226,201,137,0)'); g.strokeStyle = gr; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx + s * 16, y); g.lineTo(cx + s * w, y); g.stroke(); }
  g.beginPath(); g.moveTo(cx, y - 7); g.lineTo(cx + 7, y); g.lineTo(cx, y + 7); g.lineTo(cx - 7, y); g.closePath(); g.fill(); g.restore();
}
// hitam di antara adegan: [pusat, durasi-keluar, durasi-masuk]
const FADES = [[59.5, .45, .4], [W.END_AT - .9, .9, 0]];
function blackout(t) {
  let a = 0;
  if (t < .7) a = 1 - ss(t / .7);
  for (const [c, o, i] of FADES) { if (t < c && t > c - o) a = Math.max(a, ss((t - (c - o)) / o)); if (t >= c && t < c + i) a = Math.max(a, 1 - ss((t - c) / i)); if (i === 0 && t >= c) a = 1; }
  if (a > 0) { g.fillStyle = `rgba(0,0,0,${a})`; g.fillRect(0, 0, VW, VH); }
}
function hud(t) {
  if (t > W.END_AT - 1.2) return;
  const a = ss(seg(t, .8, 1.6)) * (1 - ss(seg(t, W.END_AT - 2.2, W.END_AT - 1.2))), u = (PORTRAIT ? 1 : .9) * K;
  g.save(); g.globalAlpha = a; g.textBaseline = 'alphabetic'; g.fillStyle = '#e8d49a'; g.shadowColor = 'rgba(0,0,0,.8)'; g.shadowBlur = 8 * u;
  g.font = `500 ${46 * u}px Cinzel`; spaced(W.clock(t), SAFE.left + 18 * u, SAFE.top + 52 * u, 6 * u, 'left');
  const fl = W.FLOOR_AT(t); g.font = `500 ${24 * u}px Cinzel`; g.fillStyle = '#9fe8e0';
  spaced('LANTAI ' + fl, SAFE.left + 18 * u, SAFE.top + 92 * u, 5 * u, 'left'); g.restore();
}
function endCard(t) {
  const a = ss(seg(t, W.END_AT + .5, W.END_AT + 1.6)), u = K * (PORTRAIT ? 1 : .9); if (a <= 0) return;
  g.save(); g.fillStyle = '#000'; g.globalAlpha = 1; g.fillRect(0, 0, VW, VH); g.globalAlpha = a; g.textBaseline = 'middle'; g.fillStyle = '#f3ead6';
  g.font = `500 ${30 * u}px Cinzel`; g.fillStyle = '#9fe8e0'; spaced('SEMALAM JADI PENJAGA MAL', CX, CY - 150 * u, 5 * u);
  ornament(CX, CY - 100 * u, 300 * u * (.4 + .6 * a), a);
  g.font = `700 ${84 * u}px Cinzel`; const gr = g.createLinearGradient(0, CY - 60 * u, 0, CY + 120 * u); gr.addColorStop(0, '#fff3cf'); gr.addColorStop(.55, '#e2c27c'); gr.addColorStop(1, '#a8803e'); g.fillStyle = gr;
  g.shadowColor = 'rgba(255,200,120,.5)'; g.shadowBlur = 30 * u; spaced('BERSAMBUNG', CX, CY - 20 * u, 8 * u); spaced('KE PART 2', CX, CY + 80 * u, 8 * u); g.restore();
}
export function drawOverlay(t) { g.clearRect(0, 0, VW, VH); hud(t); blackout(t); endCard(t); }
