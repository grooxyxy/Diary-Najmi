// Ekspor peristiwa bertanda waktu (langkah, nada kotak musik, eskalator, hitungan...) untuk mixer audio: node tools/export_events.mjs <keluaran.json>
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const W = await import(path.join(here, '../film/world.js'));
const out = {
  dur: W.DUR, endAt: W.END_AT, steps: W.stepTimes(), notes: W.boxNotes(), escStop: W.ESC_STOP, count1: W.COUNT1, count2: W.COUNT2,
  lightsOut: W.LIGHTS_OUT, times: W.TIMES, shots: W.SHOTS,
};
fs.writeFileSync(process.argv[2] || path.join(here, '../film/data/events.json'), JSON.stringify(out));
console.log('events:', out.steps.length, 'steps,', out.notes.length, 'notes');
