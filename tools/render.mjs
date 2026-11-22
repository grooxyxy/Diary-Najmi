// Render satu potongan film → mp4 tanpa suara (x264).  node tools/render.mjs --seg 3/20 --fps 24 --w 1920 --h 1080 --ss 1 --out out/seg_03.mp4
// Frame dihitung dari timeline.json (durasi = suara + jeda), dipotong rata ke N segmen; tiap segmen = file mp4 sendiri.
import { serve, openPage } from './lib.mjs'; import { spawn } from 'child_process'; import fs from 'fs'; import path from 'path';
const A = Object.fromEntries(process.argv.slice(2).reduce((r, v, i, a) => (v.startsWith('--') ? r.push([v.slice(2), a[i + 1] && !a[i + 1].startsWith('--') ? a[i + 1] : true]) : 0, r), []));
const fps = +(A.fps ?? 24), w = +(A.w ?? 1920), h = +(A.h ?? 1080), ss = +(A.ss ?? 1), crf = A.crf ?? 16, out = A.out ?? 'out/seg.mp4';
const TL = JSON.parse(fs.readFileSync(new URL('../film/timeline.json', import.meta.url)));
const total = Math.ceil(TL.dur * fps); let [i, n] = (A.seg ?? '0/1').split('/').map(Number); if (n === undefined || isNaN(n)) { i = 0; n = 1; }
const f0 = Math.round(i * total / n), f1 = Math.round((i + 1) * total / n);
if (A.info) { console.log(JSON.stringify({ total, fps, dur: TL.dur })); process.exit(0); }
fs.mkdirSync(path.dirname(out), { recursive: true });
const srv = await serve(); const { browser, page } = await openPage(srv, { page: 'film/index.html', w, h, q: `w=${w}&h=${h}&ss=${ss}&t=${f0 / fps}` });
const ff = spawn(process.env.FFMPEG || 'ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', A.preset ?? 'veryfast', '-crf', String(crf), '-pix_fmt', 'yuv420p', '-g', String(fps * 2), '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
const done = new Promise(r => ff.on('close', r)); const t0 = Date.now();
for (let f = f0; f < f1; f++) {
  await page.evaluate(t => window.render(t), f / fps);
  const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if ((f - f0) % 50 === 0) { const el = (Date.now() - t0) / 1000, k = f - f0 + 1; console.log(`[film] seg ${i}/${n} frame ${k}/${f1 - f0}  ${(el / k).toFixed(2)} s/frame  sisa ≈ ${Math.round(el / k * (f1 - f))} s`); }
}
ff.stdin.end(); const code = await done; await browser.close(); srv.server.close();
console.log(`[film] selesai ${out} (${f1 - f0} frame, ${Math.round((Date.now() - t0) / 1000)} s)`); process.exit(code || 0);
