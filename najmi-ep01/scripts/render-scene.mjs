// Render satu segmen animasi -> mp4 senyap (frame di-pipe ke ffmpeg).
// Pakai: node scripts/render-scene.mjs <segId> [--fps 12] [--size 720x1280] [--out out/x.mp4]
//        node scripts/render-scene.mjs <segId> --still <detik> --png x.png [--dbg px,py,pz,lx,ly,lz,fov,cx,cz,ry]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { SEGS } from '../najmi-3d-vector/anim.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const id = process.argv[2];
const seg = SEGS[id];
if (!seg) { console.error('segmen tidak dikenal:', id, '— pilih:', Object.keys(SEGS).join(', ')); process.exit(1); }
const fps = +arg('fps', 12);
const [W, H] = arg('size', '720x1280').split('x').map(Number);
const out = arg('out', `out/${id}.mp4`);
const still = arg('still');

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const q = new URLSearchParams({ anim: id, set: arg('set', seg.set), day: '1', outfit: 'rumah', style: 'sakura', ...(seg.char === false ? { char: '0' } : {}), ...(seg.roof === false ? { roof: '0' } : {}) });
if (arg('dbg')) q.set('dbg', arg('dbg'));
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--use-gl=angle', '--disable-gpu-sandbox', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
page.on('console', m => { if (m.type() === 'error' || /TRIANGLES/.test(m.text())) console.log('[page]', m.text().slice(0, 300)); });
page.on('pageerror', e => { console.error('pageerror:', String(e).slice(0, 600)); process.exitCode = 1; });
await page.goto(`http://127.0.0.1:${port}/najmi-3d-vector/index.html?${q}`, { waitUntil: 'load' });
await page.waitForFunction(() => window.READY === true, null, { timeout: 120000 });

if (still !== undefined) {
  await page.evaluate(t => window.ANIM.frame(t), +still);
  await page.screenshot({ path: arg('png', 'still.png') });
} else {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(fps), '-i', '-',
    '-r', '24', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '17', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const ffDone = new Promise(r => ff.on('close', r));
  const n = Math.round((seg.t1 - seg.t0) * fps);
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    await page.evaluate(t => window.ANIM.frame(t), seg.t0 + i / fps);
    const buf = await page.screenshot({ type: 'jpeg', quality: 93 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 24 === 0) console.log(`${id}: frame ${i + 1}/${n} (${((Date.now() - t0) / 1000 / (i + 1)).toFixed(2)} dtk/frame)`);
  }
  ff.stdin.end(); await ffDone;
  console.log('selesai', out);
}
await browser.close(); server.close();
