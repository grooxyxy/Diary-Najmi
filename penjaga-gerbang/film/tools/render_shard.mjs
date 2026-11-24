// Render sebagian frame film → satu file mp4 (shard). Dipakai GitHub Actions (matriks) dan build.sh lokal.
// node film/tools/render_shard.mjs film --fps 24 --size 1920x1080 --q 'taps=40' --shard 0/8 --workers 2 --out out/shard_00.mp4 [--from 100 --to 130]
import fs from 'fs'; import path from 'path'; import { spawn, execFileSync } from 'child_process'; import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const { openDemo, closeServer, takeSize, glLost, GL_LOST_HELP } = await import(path.resolve(HERE, '../../kit/core/render/page.mjs'));
const args = process.argv.slice(2), { w: W, h: H } = takeSize(args), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const dir = path.resolve(args[0]), FPS = +opt('--fps', 24), WK = +opt('--workers', 2), Q = opt('--q', ''), [si, sn] = opt('--shard', '0/1').split('/').map(Number);
const out = path.resolve(opt('--out', 'out/shard.mp4')); fs.mkdirSync(path.dirname(out), { recursive: true });
const probe = await openDemo(dir, { w: W, h: H, q: Q }); const DUR = await probe.page.evaluate(() => window.DUR); await probe.browser.close();
const f0 = Math.round(+opt('--from', 0) * FPS), f1 = Math.min(Math.round(DUR * FPS), Math.round(+opt('--to', DUR) * FPS)), N = f1 - f0;
const sh = Math.ceil(N / sn), a0 = f0 + si * sh, b0 = Math.min(f1, a0 + sh);
if (a0 >= b0) { console.log('shard kosong'); closeServer(); process.exit(0); }
const seg = fs.mkdtempSync(path.join(path.dirname(out), '.seg-')), per = Math.ceil((b0 - a0) / WK), t0 = Date.now(); let fail = null;
console.log(`shard ${si}/${sn}: frame ${a0}–${b0} dari ${f1} (${FPS} fps, ${W}x${H}, durasi ${DUR.toFixed(1)}s)`);
await Promise.all([...Array(WK)].map(async (_, w) => {
  const a = a0 + w * per, b = Math.min(b0, a + per); if (a >= b) return;
  const { browser, page } = await openDemo(dir, { w: W, h: H, q: Q });
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '14', '-g', String(FPS * 2), '-pix_fmt', 'yuv420p', `seg_${w}.mp4`], { cwd: seg, stdio: ['pipe', 'inherit', 'inherit'] });
  let done; const closed = new Promise(r => { done = r; }); ff.on('close', c => done(c)); ff.stdin.on('error', () => { fail ??= 'ffmpeg menutup input lebih awal'; });
  for (let f = a; f < b && !fail; f++) {
    await page.evaluate(t => window.render(t), f / FPS); const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await Promise.race([new Promise(r => ff.stdin.once('drain', r)), closed]);
    if ((f - a) % 25 === 0) console.log(`w${w} ${f - a}/${b - a}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    if ((f - a) % 50 === 49) { const lost = await glLost(page); if (lost) { fail = `konteks WebGL hilang (${lost}): ${GL_LOST_HELP}`; break; } }
  }
  ff.stdin.end(); const code = await closed; await browser.close(); if (code !== 0) fail ??= `ffmpeg gagal (kode ${code})`;
}));
if (fail) { console.error(fail); process.exit(1); }
const list = [...Array(WK)].map((_, w) => w * per < b0 - a0 ? `file 'seg_${w}.mp4'` : '').filter(Boolean).join('\n'); fs.writeFileSync(path.join(seg, 'l.txt'), list);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', 'l.txt', '-c', 'copy', 'm.mp4'], { cwd: seg });
fs.renameSync(path.join(seg, 'm.mp4'), out); fs.rmSync(seg, { recursive: true, force: true });
console.log('selesai', out, b0 - a0, 'frame', ((Date.now() - t0) / 1000).toFixed(0) + 's'); closeServer();
