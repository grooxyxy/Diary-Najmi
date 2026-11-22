// Tangkap halaman apa saja ke PNG: node tools/shot.mjs <page> <out.png> [w h] [q]
import { serve, openPage } from './lib.mjs';
const [pg, out, w = '1920', h = '1080', q = ''] = process.argv.slice(2);
const srv = await serve(); const { browser, page } = await openPage(srv, { page: pg, w: +w, h: +h, q });
await page.screenshot({ path: out }); await browser.close(); srv.server.close(); process.exit(process.exitCode || 0);
