import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(DIR, '..');
const OUT = path.resolve(DIR, 'stills');
fs.mkdirSync(OUT, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = path.join(ROOT, p === '/' ? 'index.html' : p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
console.log('server on', port);

const shots = process.argv[2] ? process.argv[2].split(',') : ['pose1', 'pose2', 'pose3', 'pose4', 'pose5', 'pose6', 'pose7', 'pose8', 'front'];
const style = process.argv[3] || ''; // opsional: 'rainy'|'sakura'|'leviathan' -> ?style=<nama>
const set = process.argv[4] || 'lumbung'; // opsional: 'gang'|'kota' -> ?set=<nama>
const day = process.argv[5] === 'day'; // opsional: 'day' -> ?day=1
const arg6 = process.argv[6] || '';
const noChar = arg6 === 'nochar'; // opsional: 'nochar' -> ?char=0 (tanpa karakter)
const isChibi = arg6 === 'chibi' || process.argv.slice(6).includes('chibi'); // 'chibi' -> ?char=chibi (varian chibi detail)
// Purin v8 satu-satunya karakter (Master, 2026-11-27): stick dan blocky
// sudah dibuang. Argumen karakter lama ('stick'/'blocky'/'purin'/'purin3'/
// 'purin4'/'purin5') diabaikan — render selalu karakter baru. Direktori
// output tidak lagi memakai suffix karakter.
// Karakter v9 kit (28 Nov 2026): argumen ke-7 = outfit — 'rumah' /
// 'bintang' (kaos putih bintang oranye) / 'jaket' (jaket putih + kaos
// marun); default 'jelajah'. Output masuk folder dengan suffix outfit.
const _o7 = process.argv[7] || '';
const outfit = (_o7 === 'rumah' || _o7 === 'bintang' || _o7 === 'jaket') ? _o7 : 'jelajah';
// Argumen 'roof0' (28 Nov 2026): -> ?roof=0 — sembunyikan cangkang
// eksterior rumah (atap + fasad + atap teras/carport) untuk shot
// ruangan (mode interior/dollhouse). Shot eksterior (wide, front,
// teras, pose1-8) render TANPA argumen ini (atap tampil).
// Dicek di SEMUA argumen dari posisi ke-7 (argv[7..]) karena
// pemakaian umum `... day nochar roof0` menaruhnya di argv[7]
// (slot outfit, yang memang default ke 'jelajah'), sementara
// pemakaian lengkap `... day nochar <outfit> roof0` di argv[8].
const roof0 = process.argv.slice(7).includes('roof0');
const outName = [set !== 'lumbung' ? set : null, style || null, day ? 'day' : null, outfit !== 'jelajah' ? outfit : null, isChibi ? 'chibi' : null].filter(Boolean).join('-');
const outDir = outName ? path.join(OUT, outName) : OUT;
fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--use-gl=angle', '--disable-gpu-sandbox', '--no-sandbox']
});
for (const shot of shots) {
  const page = await browser.newPage({ viewport: { width: 960, height: 960 } });
  page.on('console', m => { if (m.type() === 'log' || m.type() === 'error') console.log(`[${shot}]`, m.text()); });
  page.on('pageerror', e => console.log(`[${shot}] pageerror:`, String(e).slice(0, 500)));
  await page.goto(`http://127.0.0.1:${port}/najmi-3d-vector/index.html?shot=${shot}${style ? `&style=${style}` : ''}${set !== 'lumbung' ? `&set=${set}` : ''}${day ? '&day=1' : ''}${noChar ? '&char=0' : ''}${isChibi ? '&char=chibi' : ''}${outfit !== 'jelajah' ? `&outfit=${outfit}` : ''}${roof0 ? '&roof=0' : ''}`, { waitUntil: 'load' });
  try {
    await page.waitForFunction(() => window.READY === true, null, { timeout: 15000 });
  } catch { console.log(`[${shot}] READY timeout — tetap screenshot`); }
  await page.waitForTimeout(400);
  const out = path.join(outDir, `najmi3d-${shot}.png`);
  await page.screenshot({ path: out });
  console.log('saved', out, fs.statSync(out).size, 'bytes');
  await page.close();
}
await browser.close();
server.close();
console.log('done');
