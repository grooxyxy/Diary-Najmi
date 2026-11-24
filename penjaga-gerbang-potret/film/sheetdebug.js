// Halaman debug: sprite sheet semua tokoh (buka lewat ?sheet=1&who=najmi,laras&poses=idle0,w0 ...)
import { PX } from './px.js';
import { drawPerson, LOOKS, POSES, villager, FW, FH } from './people.js';
export function sheet(Q, cv) {
  const who = (Q.get('who') || 'najmi,laras,pedagang,perempuan,tabib,anak').split(','), poses = (Q.get('poses') || 'idle0,w0,w1,l0,r0,up,point,knock1,push,sit,kneelUp,kneelChild,carryChild,grin,sigh,lampUp').split(',');
  const g = cv.getContext('2d'); g.imageSmoothingEnabled = false; const S = +(Q.get('s') || 3);
  g.fillStyle = '#4a5a78'; g.fillRect(0, 0, cv.width, cv.height);
  who.forEach((w, r) => { const L = LOOKS[w] || villager(+w.replace(/\D/g, '') || 1); poses.forEach((k, i) => {
    const p = new PX(FW, FH), e = new PX(FW, FH); const pose = POSES[k]; drawPerson(p, e, pose, { ...L, item: pose.item ?? L.item }); p.outline(.3);
    g.drawImage(p.done(), i * FW * S, r * FH * S, FW * S, FH * S); }); });
}
