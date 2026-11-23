// Rencana render: hitung jumlah frame & potongan (matrix GitHub Actions). node tools/plan.mjs --fps 30 --per 150  -> JSON satu baris
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url)), args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const { DUR } = await import(path.join(here, '../film/world.js'));
const fps = +opt('--fps', 30), per = +opt('--per', 150), total = Math.round(DUR * fps), n = Math.ceil(total / per);
const chunks = [...Array(n)].map((_, i) => ({ i, a: i * per, b: Math.min(total, (i + 1) * per) }));
console.log(JSON.stringify({ fps, total, per, chunks }));
