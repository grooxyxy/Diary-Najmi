// captions.js: teks suara di layar sebagai overlay HTML (screenshot still/video ikut memuat DOM).
//   kind 'narr' = caption narator  : serif miring di tengah-bawah, pita gelap tipis, nama kecil di atasnya (gaya B)
//   kind 'dlg'  = dialog tokoh     : balon ucapan kertas pixel, menempel di atas kepala pembicara (gaya C)
// Kotak dialog RPG berbingkai emas (gaya A) TIDAK dipakai lagi.
//
//   import { makeCaptions, captionsReady, srtCues } from './captions.js';
//   await captionsReady();
//   const CAPS = makeCaptions({ lines, durs, anchor });          // lines: [{id, kind, t, who?, text}]
//   // tiap frame: CAPS.update(t);   untuk readcheck: window.TEXTS = t => CAPS.texts(t);
//   // anchor(line, t) -> {x, y} (0..1 dari lebar/tinggi layar; y = puncak kepala pembicara) atau null (balon disembunyikan)
//   //   cara cepat: world -> layar: v.setFromMatrixPosition(headObj.matrixWorld).project(camera); {x: v.x*.5+.5, y: 1-(v.y*.5+.5)}
// durs = {id: detik} dari voices/dur.json (default 3 dtk). Halaman HTML wajib memuat <link rel="stylesheet" href="/core/fonts/fonts.css">
// (IM Fell English, OFL). Cormorant/Cinzel tidak dibundel di kit ini.
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const ss = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

const CSS = `
.hd2dcap{position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;overflow:hidden;font-family:'IM Fell English','Cormorant Garamond',Georgia,serif;color:#f6eedb;font-size:var(--u,19px)}
.hd2dcap .narr{position:absolute;left:0;right:0;bottom:var(--nb,0);padding:5em 10em 3.2em;text-align:center;background:linear-gradient(to top,rgba(0,0,0,.72),rgba(0,0,0,0))}
.hd2dcap .narr .tx{display:block;font-size:2.8em;line-height:1.25;font-style:italic;text-shadow:0 .04em .18em #000}
.hd2dcap .narr .who{display:block;font-size:1.35em;letter-spacing:.3em;color:#e8c97a;margin-bottom:.5em}
.hd2dcap .bub{position:absolute;transform:translate(-50%,-100%);width:var(--bw,21em);box-sizing:border-box;padding:1em 1.5em;background:#f6ecd2;color:#2a1c14;text-align:left;
 box-shadow:.3em 0 0 #2a1c14,-.3em 0 0 #2a1c14,0 .3em 0 #2a1c14,0 -.3em 0 #2a1c14,.5em .6em 0 rgba(0,0,0,.35)}
.hd2dcap .bub .tx{display:block;font-size:1.7em;line-height:1.25}
.hd2dcap .bub .who{display:block;font-size:1.05em;letter-spacing:.2em;color:#a0501c;margin-bottom:.3em}
.hd2dcap .bub .rest{visibility:hidden}
.hd2dcap .bub:after{content:'';position:absolute;left:var(--tx,50%);bottom:-1.5em;margin-left:-.7em;border:.7em solid transparent;border-top:.9em solid #2a1c14;border-bottom:0}
.hd2dcap .bub:before{content:'';position:absolute;left:var(--tx,50%);bottom:-1em;margin-left:-.45em;border:.45em solid transparent;border-top:.6em solid #f6ecd2;border-bottom:0;z-index:2}
`;

export async function captionsReady() {
  await Promise.all(['italic 40px "IM Fell English"', '40px "IM Fell English"'].map(f => document.fonts.load(f).catch(() => 0)));
}

export function makeCaptions({ lines, durs = {}, anchor = null, bubbleW = null, narrBottom = 0 }) {
  if (!document.getElementById('hd2dcap-css')) { const s = document.createElement('style'); s.id = 'hd2dcap-css'; s.textContent = CSS; document.head.appendChild(s); }
  const root = document.createElement('div'); root.className = 'hd2dcap'; document.body.appendChild(root);
  const els = new Map(), dur = L => durs[L.id] ?? L.dur ?? 3;
  // ukuran dasar: 1 satuan = 1% lebar layar (lanskap); potret dibesarkan 1.7x supaya terbaca di 9:16
  const unit = () => { const W = innerWidth, H = innerHeight; return { u: W >= H ? W / 100 : W / 100 * 1.7, portrait: W < H }; };

  function state(L, t) {
    const d = dur(L);
    if (L.kind === 'dlg') { const t0 = L.t - .15, t1 = L.t + d + .6; return { a: ss(seg(t, t0, t0 + .2)) * (1 - ss(seg(t, t1 - .3, t1))), d }; }
    const t0 = L.t - .35, t1 = L.t + d + .6; return { a: ss(seg(t, t0, t0 + .3)) * (1 - ss(seg(t, t1 - .35, t1))), d };
  }
  function update(t) {
    const { u, portrait } = unit(); root.style.setProperty('--u', u + 'px'); root.style.setProperty('--nb', narrBottom + 'px');
    root.style.setProperty('--bw', (bubbleW ?? (portrait ? 30 : 21)) + 'em');
    // Hanya caption narasi terbaru yang tampil; tanpa ini dua baris bisa bertumpuk
    // saat fade-out baris lama masih berjalan ketika baris baru mulai.
    let newestNarr = null;
    for (const L of lines) {
      if (L.kind === 'dlg') continue;
      const s = state(L, t);
      if (s.a > 0 && (!newestNarr || L.t > newestNarr.t)) newestNarr = L;
    }
    for (const L of lines) {
      const { a, d } = state(L, t); let e = els.get(L.id);
      if (L.kind !== 'dlg' && L !== newestNarr) { if (e) e.style.display = 'none'; continue; }
      if (a <= 0) { if (e) e.style.display = 'none'; continue; }
      if (!e) { e = document.createElement('div'); e.className = L.kind === 'dlg' ? 'bub' : 'narr'; els.set(L.id, e); root.appendChild(e); }
      e.style.display = ''; e.style.opacity = a;
      const who = L.who ? `<span class="who">${esc(L.who.toUpperCase())}</span>` : '';
      if (L.kind === 'dlg') {
        const A = anchor && anchor(L, t); if (!A) { e.style.display = 'none'; continue; }
        const n = L.text.length, k = Math.floor(n * clamp((t - L.t + .05) / (d * .92)));   // diketik selama 92% suara
        if (e.dataset.k !== String(k)) { e.dataset.k = k; e.innerHTML = `${who}<span class="tx">${esc(L.text.slice(0, k))}<span class="rest">${esc(L.text.slice(k))}</span></span>`; }
        const bw = e.offsetWidth || 1, cx = A.x * innerWidth, half = bw / 2 + u * 1.2, c = clamp(cx, half, innerWidth - half);
        e.style.left = c + 'px'; e.style.top = `calc(${A.y * 100}% - 1.9em + ${(1 - a) * .8}em)`;
        e.style.setProperty('--tx', clamp(50 + (cx - c) / bw * 100, 12, 88) + '%');
      } else if (!e.innerHTML) e.innerHTML = `${who}<span class="tx">${esc(L.text)}</span>`;
    }
  }
  // untuk window.TEXTS (readcheck): teks penuh sejak frame pertama muncul + kotaknya
  function texts(t) {
    const out = [];
    for (const L of lines) { const e = els.get(L.id); if (!e || e.style.display === 'none' || state(L, t).a <= 0) continue; const r = e.getBoundingClientRect(); out.push({ id: L.id, text: L.text, x0: r.left, y0: r.top, x1: r.right, y1: r.bottom }); }
    return out;
  }
  return { update, texts, root };
}

// Cue untuk core/render/srt.py: [{t0, t1, text}] (+0.5 dtk tahan; dialog diawali "NAMA: ")
export function srtCues(lines, durs = {}) {
  return lines.map(L => ({ t0: L.t, t1: L.t + (durs[L.id] ?? L.dur ?? 3) + .5, text: L.kind === 'dlg' && L.who ? `${L.who.toUpperCase()}: ${L.text}` : L.text }));
}
