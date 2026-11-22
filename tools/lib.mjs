// Peladen halaman: server statis (akar = folder proyek) + Chromium headless (software GL bila tak ada GPU).
import http from 'http'; import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
import { chromium } from 'playwright-core';
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.jpg': 'image/jpeg', '.wav': 'audio/wav', '.txt': 'text/plain; charset=utf-8' };
export function serve() {
  return new Promise(res => {
    const s = http.createServer((q, r) => {
      try {
        if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(q.headers.host || '')) { r.writeHead(403); return r.end(); }
        const u = decodeURIComponent(q.url.split('?')[0]); const p = path.resolve(ROOT, '.' + path.sep + u.replace(/^\/+/, ''));
        if (!p.startsWith(ROOT + path.sep)) { r.writeHead(403); return r.end(); }
        fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); return r.end('404'); } r.writeHead(200, { 'Content-Type': MIME[path.extname(p).toLowerCase()] || 'application/octet-stream' }); r.end(d); });
      } catch { r.writeHead(400); r.end(); }
    });
    s.listen(0, '127.0.0.1', () => res({ server: s, port: s.address().port }));
  });
}
// GL: di mesin tanpa GPU (runner GitHub) pakai SwiftShader. LEMO_ANGLE=default → tanpa paksaan (mesin ber-GPU).
const angle = process.env.LEMO_ANGLE || 'swiftshader';
export const ARGS = [...(angle === 'default' ? [] : [`--use-angle=${angle}`, '--use-gl=angle', '--enable-unsafe-swiftshader']), '--enable-gpu', '--ignore-gpu-blocklist', '--font-render-hinting=none', '--force-color-profile=srgb', '--disable-dev-shm-usage'];
export async function openPage(srv, { page: pg = 'film/index.html', w = 1920, h = 1080, q = '' } = {}) {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROME || undefined, args: ARGS });
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  page.on('console', m => { const t = m.text(); if (m.type() === 'error' && !/Failed to load resource/.test(t)) console.error('[page]', t.slice(0, 300)); else if (/^\[film\]/.test(t)) console.log(t); });
  let dead = null; const deadP = new Promise((_, rej) => { dead = rej; });
  page.on('pageerror', e => { console.error('[pageerror]', e.message, (e.stack || '').split('\n').slice(0, 3).join(' | ')); process.exitCode = 1; dead(new Error('erro di halaman: ' + e.message)); });
  page.on('response', r => { if (r.status() >= 400 && !/favicon/.test(r.url())) console.error('[http ' + r.status() + ']', r.url()); });
  await page.goto(`http://127.0.0.1:${srv.port}/${pg}${q ? '?' + q : ''}`);
  deadP.catch(() => {});
  await Promise.race([page.waitForFunction(() => window.READY === true || window.FAILED, null, { timeout: 240000 }), deadP]).catch(async e => { console.error(e.message); await browser.close(); process.exit(1); });
  if (await page.evaluate(() => window.FAILED)) { console.error('halaman gagal:', await page.evaluate(() => window.FAILED)); await browser.close(); process.exit(1); }
  return { browser, page };
}
