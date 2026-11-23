// Render satu potongan frame [a,b) ke MP4 (x264 crf 14, JPEG q95 -> ffmpeg). Dipakai tiap job matrix di GitHub Actions.
// node tools/render_chunk.mjs --a 0 --b 150 --fps 30 --size 1080x1920 --out out/chunk_000.mp4 [--workers 2] [--q 'ss=1&taps=64']
import fs from 'fs'; import path from 'path'; import { spawn, execFileSync } from 'child_process'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.join(here, '..');
const { openDemo, closeServer, takeSize, glLost } = await import(path.join(ROOT, 'kit/core/render/page.mjs'));
const args = process.argv.slice(2), { w: VW, h: VH } = takeSize(args), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const A = +opt('--a', 0), B = +opt('--b', 0), FPS = +opt('--fps', 30), WK = +opt('--workers', 2), Q = opt('--q', ''), out = path.resolve(opt('--out', 'out/chunk.mp4'));
if (!(B > A)) { console.error('pakai --a <frame awal> --b <frame akhir (eksklusif)>'); process.exit(2); }
fs.mkdirSync(path.dirname(out), { recursive: true }); const tmp = fs.mkdtempSync(path.join(path.dirname(out), '.seg-'));
const TOTAL = B - A, per = Math.ceil(TOTAL / WK), t0 = Date.now();
await Promise.all([...Array(WK)].map(async (_, w) => {
  const a = A + w * per, b = Math.min(B, a + per); if (a >= b) return;
  const { browser, page } = await openDemo(path.join(ROOT, 'film'), { w: VW, h: VH, q: Q });
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '14', '-g', String(FPS * 2), '-pix_fmt', 'yuv420p', `seg_${w}.mp4`], { cwd: tmp });
  let done; const closed = new Promise(r => { done = r; }); ff.on('close', c => done(c));
  for (let f = a; f < b; f++) {
    await page.evaluate(t => window.render(t), f / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - a) % 20 === 0) console.log(`w${w} ${f - a}/${b - a} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    if ((f - a) % 30 === 29) { const lost = await glLost(page); if (lost) { console.error('WebGL context hilang: ' + lost); process.exit(1); } }
  }
  ff.stdin.end(); const code = await closed; await browser.close(); if (code !== 0) { console.error('ffmpeg gagal'); process.exit(1); }
}));
fs.writeFileSync(path.join(tmp, 'segs.txt'), [...Array(WK)].map((_, w) => w * per < TOTAL ? `file 'seg_${w}.mp4'` : '').filter(Boolean).join('\n'));
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', 'segs.txt', '-c', 'copy', out], { cwd: tmp });
fs.rmSync(tmp, { recursive: true, force: true });
console.log('selesai', out, TOTAL, 'frame', ((Date.now() - t0) / 1000).toFixed(0) + 's'); closeServer(); process.exit(0);
