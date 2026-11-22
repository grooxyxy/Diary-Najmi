// Beberapa still sekaligus: node tools/still.mjs outdir w h t1 t2 ...  (atau id baris: subuh_02@.5)
import { serve, openPage } from './lib.mjs'; import fs from 'fs';
const [out, w = '1280', h = '720', ...ts] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const TL = JSON.parse(fs.readFileSync(new URL('../film/timeline.json', import.meta.url)));
const srv = await serve(); const { browser, page } = await openPage(srv, { page: 'film/index.html', w: +w, h: +h, q: `w=${w}&h=${h}&ss=1&t=0` });
for (const a of ts) { let t = +a; if (isNaN(t)) { const [id, f = '.5'] = a.split('@'); const l = TL.lines.find(l => l.id === id); t = l.t + l.dur * +f; }
  const t0 = Date.now(); await page.evaluate(t => window.render(t), t); await page.screenshot({ path: `${out}/${a.replace('@', '_')}.png` }); console.log(a, t.toFixed(1), Date.now() - t0, 'ms'); }
await browser.close(); srv.server.close(); process.exit(0);
