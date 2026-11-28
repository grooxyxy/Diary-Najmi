// Set JAKARTA RAINY — jalanan Jakarta malam hujan, style RAINY, TANPA karakter.
// Dipakai kalau URL punya ?set=jakarta-rainy (dengan ?style=rainy).
// Origin (0,0,0) = titik fokus alami: jalan di depan pintu Indomaret,
// di tikungan antara Indomaret (kiri-tengah) dan warung (kanan).
// Kamera front [0.6, 1.65, 4.8] / pose4 [1.0, 1.85, 4.6] melihat ke -z,
// jadi komposisi disusun berlapis: foreground (jalan + zebra + gerobak +
// bajaj), midground (Indomaret + warung + halte + lampu jalan), background
// (ruko + neon + billboard + siluet masjid + menara menyala).
// Palet lampu memakai hex yang SAMA dengan set lumbung/gang/konbini
// (hemisphere 0x7d94e8/0x1a1626, bulan 0xaebfff, fill 0xffe0b3) supaya
// converter style rainy jalan tanpa perubahan; lampu khas set (neon,
// interior, lampu jalan) memakai hex lain supaya tidak ikut direduksi.
// Kabut diperlebar jadi (10, 30) — seperti set machi — supaya ruko dan
// masjid di latar belakang tetap terbaca di malam hujan, bukan hilang
// di kabut default (8, 16). Semua tekstur dilukis kode (canvas), tanpa aset.
// Hujan + riak ikut dibangun di set ini supaya set lengkap berdiri sendiri
// (style rainy menambahkan hujannya sendiri lagi di atasnya).
import * as THREE from 'three';

// ---------- layout: satu sumber ukuran (semangat layout.js rujukan) ----------
// +z ke arah kamera, -z menjauh. Jalan sepanjang z, toko di kedua sisi.
const L = {
  road: { x0: -7, x1: 7, z0: -16, z1: 9 },          // aspal
  walkL: { x0: -9.5, x1: -7, z0: -16, z1: 9 },      // trotoar kiri
  walkR: { x0: 7, x1: 9.5, z0: -16, z1: 9 },        // trotoar kanan
  indomaret: { x0: -3.5, x1: 2.5, z0: -7.5, z1: -4.5, h: 3.8 }, // toko hero
  warung: { x0: 2.5, x1: 6, z0: -6, z1: -3.5, h: 3.2 },         // warung kanan
  ruko: { z0: -11.5, z1: -9.5 },                    // baris ruko belakang
  mosque: { x: 6.0, z: -14, minaretX: 4.6 },        // masjid di balik ruko
  billboard: { x: -2.0, z: -9.0, y: 5.0 },          // papan iklan di atas toko
};

// ---------- helper (pola yang sama dengan set konbini/gang) ----------
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
function std(map, o = {}) {
  return new THREE.MeshStandardMaterial({ map: map || null, roughness: 0.95, metalness: 0, ...o });
}
function box(w, h, d, m, x = 0, y = 0, z = 0) {
  const msh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  msh.position.set(x, y, z);
  msh.castShadow = true; msh.receiveShadow = true;
  return msh;
}
// bidang datar (kaca, papan, rambu) — tidak melempar bayangan
function plane(w, h, m, x = 0, y = 0, z = 0, ry = 0) {
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  p.position.set(x, y, z); p.rotation.y = ry;
  p.receiveShadow = true;
  return p;
}
// material emissive dari satu tekstur (map + emissiveMap sama, seperti konbini)
function glowMat(tex, intensity) {
  return new THREE.MeshStandardMaterial({
    map: tex, emissive: 0xffffff, emissiveMap: tex,
    emissiveIntensity: intensity, roughness: 0.4,
  });
}

// ---------- tekstur dilukis kode ----------
function asphaltTex() {
  return canvasTex(256, 256, g => {
    g.fillStyle = '#23262e'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2200; i++) {
      g.fillStyle = `rgba(${36 + Math.random() * 42 | 0},${38 + Math.random() * 42 | 0},${48 + Math.random() * 46 | 0},0.5)`;
      g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
    g.strokeStyle = 'rgba(10,11,16,0.8)'; g.lineWidth = 1.5;
    for (let i = 0; i < 7; i++) {
      g.beginPath();
      let x = Math.random() * 256, y = Math.random() * 256;
      g.moveTo(x, y);
      for (let s = 0; s < 5; s++) { x += (Math.random() - 0.5) * 60; y += Math.random() * 40; g.lineTo(x, y); }
      g.stroke();
    }
    g.fillStyle = 'rgba(64,68,82,0.35)';
    for (let i = 0; i < 5; i++) g.fillRect(Math.random() * 200, Math.random() * 200, 40 + Math.random() * 40, 26 + Math.random() * 26);
  }, [2, 4]);
}
function sidewalkTex() {
  return canvasTex(256, 256, g => {
    g.fillStyle = '#5d5d66'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(${70 + Math.random() * 40 | 0},${70 + Math.random() * 40 | 0},${76 + Math.random() * 40 | 0},0.5)`;
      g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
    g.strokeStyle = 'rgba(20,20,26,0.7)'; g.lineWidth = 2;
    for (let y = 0; y <= 256; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
    for (let x = 0; x <= 256; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); }
    g.fillStyle = 'rgba(30,30,36,0.25)';
    for (let i = 0; i < 8; i++) g.fillRect(Math.random() * 256, 0, 18 + Math.random() * 26, 50 + Math.random() * 90);
  }, [1, 6]);
}
function zebraTex() {
  return canvasTex(512, 96, g => {
    g.fillStyle = '#23262e'; g.fillRect(0, 0, 512, 96);
    for (let i = 0; i < 5; i++) {
      g.fillStyle = `rgba(235,235,228,${0.82 + Math.random() * 0.15})`;
      g.fillRect(12 + i * 100, 10, 78, 76);
    }
    for (let i = 0; i < 60; i++) {
      g.fillStyle = 'rgba(35,38,46,0.35)';
      g.fillRect(Math.random() * 512, Math.random() * 96, 4, 3);
    }
  });
}
function indomaretSignTex() {
  return canvasTex(512, 128, g => {
    g.fillStyle = '#f5f2ea'; g.fillRect(0, 0, 512, 128);
    g.fillStyle = '#d42a2a'; g.fillRect(0, 0, 512, 10);
    g.fillStyle = '#d42a2a'; g.font = 'bold 62px sans-serif'; g.textAlign = 'center';
    g.fillText('INDOMARET', 256, 72);
    g.fillStyle = '#2456a8'; g.fillRect(60, 88, 392, 6);
    g.fillStyle = '#2456a8'; g.font = 'bold 34px sans-serif'; g.textAlign = 'right';
    g.fillText('24 JAM', 452, 122);
    g.fillStyle = '#f5b81e';
    g.beginPath(); g.moveTo(36, 100); g.lineTo(52, 108); g.lineTo(40, 122); g.lineTo(58, 122); g.lineTo(44, 104); g.closePath(); g.fill();
  });
}
function indomaretInteriorTex() {
  return canvasTex(512, 256, g => {
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#ffe0ae'); grad.addColorStop(1, '#ffb45e');
    g.fillStyle = grad; g.fillRect(0, 0, 512, 256);
    // strip merah khas di atas
    g.fillStyle = '#d42a2a'; g.fillRect(0, 0, 512, 26);
    g.fillStyle = '#fff'; g.font = 'bold 20px sans-serif'; g.textAlign = 'center';
    g.fillText('INDOMARET', 256, 20);
    // rak barang
    const goods = ['#ff5f5f', '#ffd23f', '#4fc3f7', '#81c784', '#ba68c8', '#ff8a65', '#fff176'];
    for (let shelf = 0; shelf < 3; shelf++) {
      const y = 44 + shelf * 58;
      g.fillStyle = '#7a5a34'; g.fillRect(0, y + 42, 340, 8);
      for (let x = 8; x < 330; x += 32) {
        g.fillStyle = goods[(x / 32 + shelf * 3) % goods.length | 0];
        g.fillRect(x, y + 8, 24, 34);
      }
    }
    // kulkas minuman (kanan)
    g.fillStyle = '#2e5a7a'; g.fillRect(352, 40, 148, 170);
    g.fillStyle = '#bfe3f5'; g.fillRect(360, 48, 132, 154);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) {
      g.fillStyle = goods[(r * 5 + c) % goods.length];
      g.fillRect(366 + c * 25, 56 + r * 38, 18, 28);
    }
    g.strokeStyle = '#fff'; g.lineWidth = 3; g.strokeRect(360, 48, 132, 154);
    // kasir
    g.fillStyle = '#3a6b35'; g.fillRect(20, 206, 150, 50);
    g.fillStyle = '#f5f0e6'; g.font = 'bold 22px sans-serif';
    g.fillText('KASIR', 95, 238);
    // lampu gantung hangat
    g.fillStyle = '#fff8e0';
    for (let x = 60; x < 500; x += 110) { g.beginPath(); g.arc(x, 34, 9, 0, Math.PI * 2); g.fill(); }
  });
}
function warungInteriorTex() {
  return canvasTex(256, 192, g => {
    const grad = g.createLinearGradient(0, 0, 0, 192);
    grad.addColorStop(0, '#4a2c14'); grad.addColorStop(1, '#7a4a22');
    g.fillStyle = grad; g.fillRect(0, 0, 256, 192);
    // lampu gantung hangat
    for (let x = 40; x < 256; x += 80) {
      g.fillStyle = 'rgba(255,200,110,0.9)';
      g.beginPath(); g.arc(x, 22, 12, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,180,80,0.25)';
      g.beginPath(); g.arc(x, 22, 26, 0, Math.PI * 2); g.fill();
    }
    // etalase makanan: nampan + lauk
    const foods = ['#ff8a3d', '#ffd23f', '#81c784', '#ff5f5f', '#f5e6c8'];
    for (let i = 0; i < 4; i++) {
      g.fillStyle = '#2e2012'; g.fillRect(14 + i * 60, 96, 52, 44);
      g.fillStyle = foods[i % foods.length];
      g.beginPath(); g.ellipse(40 + i * 60, 112, 20, 10, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#f5e6c8'; g.fillRect(22 + i * 60, 126, 36, 6);
    }
    // meja kasir
    g.fillStyle = '#5d4126'; g.fillRect(0, 150, 256, 42);
    g.fillStyle = '#f5f0e6'; g.font = 'bold 20px sans-serif'; g.textAlign = 'center';
    g.fillText('WARUNG', 128, 178);
  });
}
function neonTex(text, color, sub) {
  return canvasTex(512, 160, g => {
    g.fillStyle = '#0c0a18'; g.fillRect(0, 0, 512, 160);
    g.font = 'bold 62px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = color; g.shadowBlur = 26;
    g.fillStyle = color; g.fillText(text, 256, sub ? 62 : 82);
    g.shadowBlur = 8; g.fillStyle = '#ffffff'; g.fillText(text, 256, sub ? 62 : 82);
    if (sub) {
      g.font = '28px sans-serif'; g.shadowColor = '#37e0ff'; g.shadowBlur = 12;
      g.fillStyle = '#d8f6ff'; g.fillText(sub, 256, 128);
    }
  });
}
function rukoFacadeTex(base, lit) {
  return canvasTex(256, 256, g => {
    g.fillStyle = base; g.fillRect(0, 0, 256, 256);
    // noda lembap + bercak
    for (let i = 0; i < 10; i++) {
      const x = Math.random() * 256, w = 16 + Math.random() * 30, h = 40 + Math.random() * 90;
      const gr = g.createLinearGradient(x, 0, x, h);
      gr.addColorStop(0, 'rgba(20,16,10,0.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x - w / 2, 0, w, h);
    }
    for (let i = 0; i < 250; i++) {
      g.fillStyle = `rgba(0,0,0,${0.04 + Math.random() * 0.08})`;
      g.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
    }
    // toko lantai dasar: rolling door setengah buka
    g.fillStyle = '#241a12'; g.fillRect(20, 170, 216, 86);
    g.strokeStyle = 'rgba(200,200,200,0.35)'; g.lineWidth = 2;
    for (let y = 176; y < 256; y += 10) { g.beginPath(); g.moveTo(20, y); g.lineTo(236, y); g.stroke(); }
    // jendela lantai atas: 2x2, ada yang menyala
    for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) {
      const x = 30 + c * 110, y = 24 + r * 62, on = lit[r * 2 + c];
      g.fillStyle = on ? '#ffca6a' : '#141a2e'; g.fillRect(x, y, 66, 48);
      if (on) {
        g.fillStyle = 'rgba(120,70,20,0.5)';
        for (let vx = x + 8; vx < x + 66; vx += 16) g.fillRect(vx, y, 4, 48);
      }
      g.strokeStyle = '#241a12'; g.lineWidth = 5; g.strokeRect(x, y, 66, 48);
      g.beginPath(); g.moveTo(x + 33, y); g.lineTo(x + 33, y + 48); g.stroke();
    }
    // kotak AC
    g.fillStyle = '#8a8f9c'; g.fillRect(196, 96, 44, 30);
    g.strokeStyle = '#555'; g.lineWidth = 2; g.strokeRect(196, 96, 44, 30);
  });
}
function billboardTex() {
  return canvasTex(512, 256, g => {
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#0e1a3a'); grad.addColorStop(1, '#2a4a7a');
    g.fillStyle = grad; g.fillRect(0, 0, 512, 256);
    // bintang
    g.fillStyle = '#fff';
    for (let i = 0; i < 40; i++) g.fillRect(Math.random() * 512, Math.random() * 90, 2, 2);
    // bulan
    g.fillStyle = '#ffe9b0'; g.beginPath(); g.arc(448, 46, 24, 0, Math.PI * 2); g.fill();
    // siluet skyline + monas
    g.fillStyle = '#0a1226';
    let x = 0;
    while (x < 512) {
      const w = 34 + Math.random() * 44, h = 50 + Math.random() * 70;
      g.fillRect(x, 256 - h - 40, w, h + 40);
      x += w + 6;
    }
    g.fillRect(238, 96, 10, 120); // monas
    g.beginPath(); g.moveTo(228, 96); g.lineTo(253, 96); g.lineTo(243, 70); g.closePath(); g.fill();
    g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(243, 66, 8, 0, Math.PI * 2); g.fill();
    // teks
    g.fillStyle = '#fff'; g.font = 'bold 64px sans-serif'; g.textAlign = 'center';
    g.fillText('JAKARTA', 256, 150);
    g.fillStyle = '#ffd23f'; g.font = 'bold 32px sans-serif';
    g.fillText('K O T A   K I T A', 256, 196);
  });
}
function halteSignTex() {
  return canvasTex(512, 96, g => {
    g.fillStyle = '#2456a8'; g.fillRect(0, 0, 512, 96);
    g.fillStyle = '#ffd23f'; g.fillRect(0, 0, 512, 8);
    g.fillStyle = '#fff'; g.font = 'bold 44px sans-serif'; g.textAlign = 'center';
    g.fillText('TRANSJAKARTA', 256, 58);
    g.fillStyle = '#ffd23f'; g.font = 'bold 26px sans-serif';
    g.fillText('H A L T E', 256, 88);
  });
}
function atmTex() {
  return canvasTex(128, 256, g => {
    g.fillStyle = '#1e3a5f'; g.fillRect(0, 0, 128, 256);
    g.fillStyle = '#f5f0e6'; g.font = 'bold 40px sans-serif'; g.textAlign = 'center';
    g.fillText('ATM', 64, 52);
    g.fillStyle = '#ffd23f'; g.font = 'bold 20px sans-serif';
    g.fillText('24 JAM', 64, 84);
    g.fillStyle = '#0a1a2e'; g.fillRect(14, 104, 100, 60);
    g.fillStyle = '#7ec8f5'; g.fillRect(20, 110, 88, 48);
    g.fillStyle = '#0a1a2e'; g.fillRect(34, 184, 60, 10);
    g.fillStyle = '#f5f0e6'; g.font = 'bold 16px sans-serif';
    g.fillText('TARIK TUNAI', 64, 214);
  });
}
function cartTex(kind) {
  return canvasTex(256, 128, g => {
    g.fillStyle = kind === 'sate' ? '#b3312a' : '#d86a1e'; g.fillRect(0, 0, 256, 128);
    g.fillStyle = '#fff'; g.font = 'bold 56px sans-serif'; g.textAlign = 'center';
    g.fillText(kind === 'sate' ? 'SATE' : 'BAKSO', 128, 66);
    if (kind === 'sate') {
      g.strokeStyle = '#5d2a10'; g.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        g.beginPath(); g.moveTo(30 + i * 90, 96); g.lineTo(80 + i * 90, 96); g.stroke();
        g.fillStyle = '#ff8a3d';
        for (let s = 0; s < 4; s++) { g.beginPath(); g.arc(38 + i * 90 + s * 12, 96, 5, 0, Math.PI * 2); g.fill(); }
      }
    } else {
      g.fillStyle = '#f5f0e6'; g.beginPath(); g.ellipse(128, 104, 52, 14, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#5d2a10'; g.lineWidth = 4;
      g.beginPath(); g.moveTo(96, 92); g.lineTo(160, 92); g.stroke();
    }
    g.fillStyle = '#ffd23f'; g.font = 'bold 22px sans-serif';
    g.fillText('RP 10.000', 128, 118);
  });
}
function awningTex() {
  return canvasTex(256, 64, g => {
    for (let i = 0; i < 8; i++) {
      g.fillStyle = i % 2 ? '#f5f0e6' : '#d42a2a';
      g.fillRect(i * 32, 0, 32, 64);
    }
  });
}
function streakTex() {
  return canvasTex(128, 256, g => {
    const gr = g.createRadialGradient(64, 128, 4, 64, 128, 120);
    gr.addColorStop(0, 'rgba(255,255,255,0.85)');
    gr.addColorStop(0.6, 'rgba(255,255,255,0.25)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 256);
  });
}

// ---------- builder kecil ----------
function neonSign(scene, text, color, sub, w, h, x, y, z, intensity, light) {
  const tex = neonTex(text, color, sub);
  const s = plane(w, h, glowMat(tex, intensity), x, y, z);
  scene.add(s);
  if (light) {
    const pl = new THREE.PointLight(light.hex, light.i, light.d, 1.8);
    pl.position.set(x, y, z + 0.7); scene.add(pl);
  }
  return s;
}
function streetLamp(scene, x, z, armDir) {
  const poleM = std(null, { color: 0x2e2e33 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 3.6, 8), poleM);
  pole.position.set(x, 1.8, z); pole.castShadow = true; scene.add(pole);
  const arm = box(0.9, 0.07, 0.07, poleM, x + armDir * 0.42, 3.55, z);
  scene.add(arm);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xffb347, emissive: 0xffb347, emissiveIntensity: 1.4 }));
  head.position.set(x + armDir * 0.85, 3.5, z); scene.add(head);
  const pl = new THREE.PointLight(0xffb347, 1.6, 5, 1.8);
  pl.position.set(x + armDir * 0.85, 3.35, z); scene.add(pl);
}
function catenaryWire(scene, ax, az, bx, bz, y, sag) {
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(ax, y, az),
    new THREE.Vector3((ax + bx) / 2, y - sag, (az + bz) / 2),
    new THREE.Vector3(bx, y, bz));
  const w = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 0.018, 5), std(null, { color: 0x14100c }));
  w.castShadow = true; scene.add(w);
}
function puddle(scene, mat, x, z, rx, rz) {
  const p = new THREE.Mesh(new THREE.CircleGeometry(1, 20), mat);
  p.scale.set(rx, rz, 1); p.rotation.x = -Math.PI / 2; p.position.set(x, 0.008, z);
  p.receiveShadow = true; scene.add(p);
}

// ---------- bangun set ----------
export function buildJakartaRainy(scene) {
  // kabut diperlebar supaya latar belakang (ruko, masjid) tetap terbaca
  // (warna kabut dipertahankan dari index.html — siang/malam tetap jalan)
  const fogColor = scene.fog ? scene.fog.color.getHex() : 0x141a33;
  scene.fog = new THREE.Fog(fogColor, 10, 30);

  // ---- tanah: aspal + trotoar + zebra + marka ----
  const road = new THREE.Mesh(new THREE.PlaneGeometry(14, 25), std(asphaltTex(), { roughness: 0.55, metalness: 0.25 }));
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0, -3.5);
  road.receiveShadow = true; scene.add(road);
  const walkM = std(sidewalkTex(), { roughness: 0.85 });
  const walkL = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 25), walkM);
  walkL.rotation.x = -Math.PI / 2; walkL.position.set(-8.25, 0.06, -3.5);
  walkL.receiveShadow = true; scene.add(walkL);
  const walkR = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 25), walkM);
  walkR.rotation.x = -Math.PI / 2; walkR.position.set(8.25, 0.06, -3.5);
  walkR.receiveShadow = true; scene.add(walkR);
  // trotoar depan toko (depan Indomaret + warung)
  const walkF = new THREE.Mesh(new THREE.PlaneGeometry(12, 1.6), walkM);
  walkF.rotation.x = -Math.PI / 2; walkF.position.set(0, 0.06, -3.7);
  walkF.receiveShadow = true; scene.add(walkF);
  // pembatas trotoar (curb)
  scene.add(box(0.18, 0.14, 25, std(null, { color: 0x8a8a94 }), -7, 0.07, -3.5));
  scene.add(box(0.18, 0.14, 25, std(null, { color: 0x8a8a94 }), 7, 0.07, -3.5));
  // zebra di depan origin
  const zebra = plane(10, 1.6, std(zebraTex(), { roughness: 0.7 }), 0, 0.012, 1.2);
  zebra.rotation.x = -Math.PI / 2; scene.add(zebra);
  // garis tengah kuning putus-putus
  const dashM = std(null, { color: 0xd8b93a, roughness: 0.7 });
  [-12, -9, -6, -3, 3, 6].forEach(z => {
    const d = plane(0.25, 1.2, dashM, 0, 0.012, z);
    d.rotation.x = -Math.PI / 2; scene.add(d);
  });

  // ---- genangan: elips gelap mengkilap ----
  const puddleM = std(null, { color: 0x0d1428, roughness: 0.08, metalness: 0.8, transparent: true, opacity: 0.85 });
  puddle(scene, puddleM, -3.5, 3.5, 1.3, 0.8);
  puddle(scene, puddleM, 2.5, 0.5, 1.5, 0.9);
  puddle(scene, puddleM, -1, -2, 1.1, 0.7);
  puddle(scene, puddleM, 4, -4.5, 1.4, 0.8);
  puddle(scene, puddleM, 0.5, 5.5, 1.0, 0.6);
  puddle(scene, puddleM, -5.5, -1, 1.2, 0.7);

  // ---- pantulan lampu di aspal basah (streak aditif) ----
  const streak = streakTex();
  function lightStreak(x, z, w, l, color, opacity) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(w, l),
      new THREE.MeshBasicMaterial({ map: streak, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.rotation.x = -Math.PI / 2; s.position.set(x, 0.012, z); scene.add(s);
  }
  lightStreak(-0.5, -2.2, 1.6, 3.4, 0xffb45e, 0.28); // pantulan Indomaret
  lightStreak(3.4, -1.6, 1.2, 2.6, 0xff5fa2, 0.22);  // pantulan neon warung
  lightStreak(2.2, -2.6, 0.9, 2.2, 0xffb347, 0.2);   // pantulan lampu jalan
  lightStreak(5, -8.2, 1.0, 2.4, 0x39d98a, 0.16);    // pantulan neon apotek

  // ---- hujan set (900 titik) + riak di genangan ----
  const N = 900;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 16;
    pos[i * 3 + 1] = Math.random() * 6;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 18 - 3;
  }
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const rainTex = canvasTex(16, 64, ctx => {
    const gr = ctx.createLinearGradient(0, 0, 0, 64);
    gr.addColorStop(0, 'rgba(255,255,255,0)');
    gr.addColorStop(0.5, 'rgba(255,255,255,0.9)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gr; ctx.fillRect(6, 0, 4, 64);
  });
  const rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({
    size: 0.22, map: rainTex, transparent: true, opacity: 0.3,
    color: 0xcfe0ff, depthWrite: false, sizeAttenuation: true,
  }));
  rain.rotation.z = 0.12;
  scene.add(rain);
  for (let i = 0; i < 14; i++) {
    const r = new THREE.Mesh(
      new THREE.RingGeometry(0.7, 1, 12),
      new THREE.MeshBasicMaterial({
        color: 0x9db8ff, transparent: true,
        opacity: 0.05 + Math.random() * 0.12,
        side: THREE.DoubleSide, depthWrite: false,
      }));
    r.scale.setScalar(0.03 + Math.random() * 0.09);
    r.rotation.x = -Math.PI / 2;
    r.position.set((Math.random() - 0.5) * 12, 0.009, (Math.random() - 0.5) * 14 - 2);
    scene.add(r);
  }

  // ---- INDOMARET (toko hero, tengah-kiri, pintu menghadap origin) ----
  const im = new THREE.Group();
  const imW = L.indomaret.x1 - L.indomaret.x0, imH = L.indomaret.h, imD = L.indomaret.z1 - L.indomaret.z0;
  im.add(box(imW, imH, imD, std(null, { color: 0x2e5a4a }), 0, imH / 2, 0)); // badan toko
  im.add(box(imW + 0.4, 0.3, imD + 0.6, std(null, { color: 0x1e3a30 }), 0, imH + 0.15, 0)); // atap
  // kaca besar interior (emissive — menyala hangat)
  const intTex = indomaretInteriorTex();
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 2.3), glowMat(intTex, 0.85));
  glass.position.set(0, 1.45, imD / 2 + 0.02); im.add(glass);
  // rangka kaca
  im.add(box(5.0, 0.12, 0.1, std(null, { color: 0x1c1c22 }), 0, 2.62, imD / 2 + 0.02));
  im.add(box(5.0, 0.12, 0.1, std(null, { color: 0x1c1c22 }), 0, 0.32, imD / 2 + 0.02));
  [-1.2, 0, 1.2].forEach(x => im.add(box(0.12, 2.3, 0.1, std(null, { color: 0x1c1c22 }), x, 1.45, imD / 2 + 0.02)));
  // papan nama INDOMARET 24 JAM (emissive — menyala)
  const signTex = indomaretSignTex();
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.05), glowMat(signTex, 0.8));
  sign.position.set(0, 3.25, imD / 2 + 0.02); im.add(sign);
  // awning garis merah-putih (miring ke depan)
  const awn = plane(5.4, 1.1, std(awningTex(), { roughness: 0.8 }), 0, 2.85, imD / 2 + 0.55);
  awn.rotation.x = -0.5; im.add(awn);
  // pintu kaca di sisi kanan kaca (sedikit di depan kaca supaya tidak z-fight)
  const door = plane(0.9, 2.3, std(null, { color: 0x2e5a7a, roughness: 0.2, metalness: 0.4 }), 2.4, 1.45, imD / 2 + 0.04);
  im.add(door);
  im.position.set((L.indomaret.x0 + L.indomaret.x1) / 2, 0, (L.indomaret.z0 + L.indomaret.z1) / 2);
  scene.add(im);
  // lampu interior (hangat, hex beda supaya tidak diredupkan style rainy)
  const innerLight = new THREE.PointLight(0xffc27a, 2.2, 6, 1.8);
  innerLight.position.set(-0.5, 2.0, -3.6); scene.add(innerLight);
  // ATM di samping pintu Indomaret
  const atmTexT = atmTex();
  scene.add(box(0.7, 1.7, 0.6, std(null, { color: 0x1e3a5f }), 2.9, 0.85, -4.2));
  scene.add(plane(0.6, 1.5, glowMat(atmTexT, 0.5), 2.9, 0.9, -3.89));
  // peti kayu di samping toko
  const woodM = std(null, { color: 0x8a6a42 });
  scene.add(box(0.55, 0.55, 0.55, woodM, -3.9, 0.28, -4.2));
  scene.add(box(0.45, 0.45, 0.45, woodM, -3.85, 0.78, -4.2));

  // ---- WARUNG 24 JAM (kanan, depan agak maju dari Indomaret) ----
  const wr = new THREE.Group();
  const wrW = L.warung.x1 - L.warung.x0, wrH = L.warung.h, wrD = L.warung.z1 - L.warung.z0;
  wr.add(box(wrW, wrH, wrD, std(null, { color: 0x5a4632 }), 0, wrH / 2, 0));
  wr.add(box(wrW + 0.3, 0.25, wrD + 0.5, std(null, { color: 0x2e2620 }), 0, wrH + 0.12, 0));
  // etalase terbuka (interior hangat)
  const wrTex = warungInteriorTex();
  const wrGlass = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 2.0), glowMat(wrTex, 0.8));
  wrGlass.position.set(-0.2, 1.3, wrD / 2 + 0.02); wr.add(wrGlass);
  // meja kasir di depan etalase
  wr.add(box(2.6, 0.9, 0.5, std(null, { color: 0x5d4126 }), -0.2, 0.45, wrD / 2 + 0.3));
  // atap terpal biru miring
  const tarp = box(wrW, 0.08, 1.4, std(null, { color: 0x2456a8 }), 0, 3.0, wrD / 2 + 0.6);
  tarp.rotation.x = -0.35; wr.add(tarp);
  wr.position.set((L.warung.x0 + L.warung.x1) / 2, 0.06, (L.warung.z0 + L.warung.z1) / 2);
  scene.add(wr);
  // neon WARUNG 24 JAM (teks rata kiri supaya "WARUNG" terbaca di tepi frame)
  const wrNeonTex = canvasTex(512, 160, g => {
    g.fillStyle = '#0c0a18'; g.fillRect(0, 0, 512, 160);
    g.font = 'bold 60px sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.shadowColor = '#ff5fa2'; g.shadowBlur = 26;
    g.fillStyle = '#ff5fa2'; g.fillText('WARUNG', 20, 58);
    g.shadowBlur = 8; g.fillStyle = '#fff'; g.fillText('WARUNG', 20, 58);
    g.font = '30px sans-serif'; g.shadowColor = '#37e0ff'; g.shadowBlur = 12;
    g.fillStyle = '#d8f6ff'; g.fillText('· 24 JAM ·', 22, 126);
  });
  const wrNeon = plane(2.4, 0.75, glowMat(wrNeonTex, 0.9), 3.4, 2.7, -3.48);
  scene.add(wrNeon);
  const wrLight = new THREE.PointLight(0xff5fa2, 1.2, 4, 1.8);
  wrLight.position.set(3.4, 2.6, -2.9); scene.add(wrLight);

  // ---- GEROBAK SATE (foreground kiri, menghadap kamera) ----
  function gerobak(kind, x, z, ry) {
    const g = new THREE.Group();
    const bodyM = std(null, { color: kind === 'sate' ? 0x8a3a28 : 0x7a4a1e });
    g.add(box(1.3, 0.7, 0.8, bodyM, 0, 0.75, 0));
    // etalase kaca depan
    const caseTex = cartTex(kind);
    g.add(plane(1.2, 0.5, glowMat(caseTex, 0.55), 0, 1.0, 0.42));
    // atap miring + tiang
    const roof = box(1.5, 0.06, 1.0, std(null, { color: kind === 'sate' ? 0xb3312a : 0xd86a1e }), 0, 1.85, 0);
    roof.rotation.x = 0.12; g.add(roof);
    [-0.6, 0.6].forEach(px => [-0.35, 0.35].forEach(pz => g.add(box(0.05, 0.85, 0.05, std(null, { color: 0x2e2620 }), px, 1.45, pz))));
    // roda
    const wheelM = std(null, { color: 0x1c1c22 });
    [-0.55, 0.55].forEach(px => {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.08, 10), wheelM);
      w.rotation.z = Math.PI / 2; w.position.set(px, 0.26, 0); w.castShadow = true; g.add(w);
    });
    // kaki belakang
    g.add(box(0.06, 0.5, 0.06, std(null, { color: 0x2e2620 }), -0.55, 0.25, -0.35));
    g.add(box(0.06, 0.5, 0.06, std(null, { color: 0x2e2620 }), 0.55, 0.25, -0.35));
    // lampu gantung hangat di dalam gerobak
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0xffd9a0, emissive: 0xffa050, emissiveIntensity: 1.4 }));
    bulb.position.set(0, 1.55, 0.1); g.add(bulb);
    g.position.set(x, 0, z); g.rotation.y = ry;
    scene.add(g);
    const pl = new THREE.PointLight(0xffa050, 1.2, 3, 1.8);
    pl.position.set(x, 1.5, z + 0.4); scene.add(pl);
    return g;
  }
  gerobak('sate', -1.4, 1.4, 0.5);
  gerobak('bakso', 2.2, -1.0, -0.4);

  // ---- BAJAJ (foreground kanan, parkir di tepi jalan) ----
  const bj = new THREE.Group();
  const bjOrange = std(null, { color: 0xe86a1e, roughness: 0.6 });
  const bjBlack = std(null, { color: 0x1c1c22, roughness: 0.7 });
  bj.add(box(1.3, 0.65, 1.9, bjOrange, 0, 0.55, 0)); // badan bawah
  bj.add(box(1.25, 0.7, 1.15, bjOrange, 0, 1.2, -0.3)); // kabin
  bj.add(box(1.3, 0.08, 1.3, bjBlack, 0, 1.6, -0.3)); // atap
  const shield = plane(1.1, 0.55, std(null, { color: 0x9fc8e8, roughness: 0.15, metalness: 0.5 }), 0, 1.2, 0.32);
  shield.rotation.x = -0.3; bj.add(shield);
  bj.add(box(1.3, 0.1, 0.15, bjBlack, 0, 0.95, 0.9)); // bemper depan
  const bjHead = plane(0.28, 0.16, new THREE.MeshStandardMaterial({ color: 0xffe9b0, emissive: 0xffd76a, emissiveIntensity: 1.2 }), 0, 0.75, 0.99);
  bj.add(bjHead);
  const bjWheelM = std(null, { color: 0x1c1c22 });
  const bjWheelF = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.1, 10), bjWheelM);
  bjWheelF.rotation.z = Math.PI / 2; bjWheelF.position.set(0, 0.28, 0.85); bjWheelF.castShadow = true; bj.add(bjWheelF);
  [-0.58, 0.58].forEach(px => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.1, 10), bjWheelM);
    w.rotation.z = Math.PI / 2; w.position.set(px, 0.28, -0.6); w.castShadow = true; bj.add(w);
  });
  bj.position.set(1.6, 0, 0.8); bj.rotation.y = -0.4;
  scene.add(bj);

  // ---- MOTOR MATIC (trotoar kiri, parkir) ----
  const mb = new THREE.Group();
  const mbRed = std(null, { color: 0xc22e2e, roughness: 0.6 });
  mb.add(box(0.45, 0.4, 1.5, mbRed, 0, 0.5, 0));
  mb.add(box(0.4, 0.12, 0.7, std(null, { color: 0x1c1c22 }), 0, 0.72, -0.35));
  const mbBar = box(0.6, 0.05, 0.05, std(null, { color: 0x2e2e33 }), 0, 0.95, 0.65);
  mb.add(mbBar);
  const mbWheelM = std(null, { color: 0x1c1c22 });
  [-0.55, 0.55].forEach(pz => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.09, 10), mbWheelM);
    w.rotation.z = Math.PI / 2; w.position.set(0, 0.28, pz); w.castShadow = true; mb.add(w);
  });
  mb.add(plane(0.2, 0.12, new THREE.MeshStandardMaterial({ color: 0xffe9b0, emissive: 0xffd76a, emissiveIntensity: 1.0 }), 0, 0.6, 0.78));
  mb.position.set(-8.1, 0.06, 2.5); mb.rotation.y = 1.2;
  scene.add(mb);

  // ---- HALTE TRANSJAKARTA (trotoar kanan) ----
  const hl = new THREE.Group();
  const hlBlue = std(null, { color: 0x1e3a5f });
  hl.add(box(0.12, 2.6, 0.12, hlBlue, 0, 1.3, -1));
  hl.add(box(0.12, 2.6, 0.12, hlBlue, 0, 1.3, 1));
  hl.add(box(1.0, 0.12, 2.4, std(null, { color: 0x2456a8 }), 0.35, 2.65, 0)); // atap
  const hlSignTex = halteSignTex();
  hl.add(plane(2.0, 0.38, glowMat(hlSignTex, 0.7), -0.16, 2.45, 0, -Math.PI / 2)); // papan nama di tepi atap, menghadap jalan
  const hlGlass = plane(2.0, 1.9, std(null, { color: 0x9fc8e8, roughness: 0.15, metalness: 0.4, transparent: true, opacity: 0.5 }), 0.72, 1.35, 0, -Math.PI / 2);
  hl.add(hlGlass);
  hl.add(box(0.45, 0.07, 1.8, std(null, { color: 0x8a6b4a }), 0.45, 0.5, 0)); // bangku
  hl.add(box(0.07, 0.5, 0.07, std(null, { color: 0x2e2e33 }), 0.45, 0.25, -0.8));
  hl.add(box(0.07, 0.5, 0.07, std(null, { color: 0x2e2e33 }), 0.45, 0.25, 0.8));
  hl.position.set(8.2, 0.06, 0.8);
  scene.add(hl);

  // ---- BILLBOARD "JAKARTA" (di atas/behind Indomaret) ----
  const bbPole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 4.0, 8), std(null, { color: 0x2e2e33 }));
  bbPole.position.set(L.billboard.x, 2.0, L.billboard.z); bbPole.castShadow = true; scene.add(bbPole);
  const bbTex = billboardTex();
  const bb = plane(4.5, 2.2, glowMat(bbTex, 0.5), L.billboard.x, L.billboard.y, L.billboard.z);
  scene.add(bb);
  scene.add(box(4.6, 2.3, 0.12, std(null, { color: 0x1c1c22 }), L.billboard.x, L.billboard.y, L.billboard.z - 0.08));

  // ---- RUKO belakang (3 unit) + neon + jendela menyala ----
  const rukoDefs = [
    { cx: -3.5, w: 4.5, h: 5.0, base: '#6b5a48', lit: [true, false, true, false], neon: ['BAKSO', '#ff8a3d', null] },
    { cx: 0.75, w: 4.0, h: 4.5, base: '#4a5a6b', lit: [true, true, false, true], neon: ['SATE', '#ff4d6d', null] },
    { cx: 5.0, w: 4.5, h: 5.5, base: '#5a4a5a', lit: [false, true, true, false], neon: ['APOTEK', '#39d98a', 'MASJID'] },
  ];
  rukoDefs.forEach(d => {
    scene.add(box(d.w, d.h, 2, std(rukoFacadeTex(d.base, d.lit)), d.cx, d.h / 2, -10.5));
    scene.add(box(d.w + 0.2, 0.25, 2.2, std(null, { color: 0x2e2620 }), d.cx, d.h + 0.12, -10.5));
    // AC di fasad
    scene.add(box(0.5, 0.35, 0.25, std(null, { color: 0x8a8f9c }), d.cx + d.w / 2 - 0.6, 2.6, -9.45));
    // neon utama
    const y = d.h - 1.4;
    neonSign(scene, d.neon[0], d.neon[1], null, 2.2, 0.7, d.cx, y, -9.46, 0.9,
      d.neon[0] === 'BAKSO' ? { hex: 0xff8a3d, i: 1.0, d: 4 } : null);
    // MASJID menumpuk di atas APOTEK (ruko kanan)
    if (d.neon[2]) {
      neonSign(scene, d.neon[2], '#2fbf71', null, 1.6, 0.5, d.cx, y + 1.1, -9.46, 0.9, null);
    }
  });

  // ---- MASJID (siluet di balik ruko kanan, menara menyala) ----
  const mqM = std(null, { color: 0x232a3d, roughness: 1 });
  const mqDomeM = std(null, { color: 0x2e3a55, roughness: 1 });
  scene.add(box(4, 4, 3, mqM, L.mosque.x, 2, L.mosque.z)); // aula
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.6, 12, 8), mqDomeM);
  dome.scale.y = 0.8; dome.position.set(L.mosque.x, 4.0, L.mosque.z);
  dome.castShadow = true; scene.add(dome);
  const finial = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.7, 8), std(null, { color: 0x2fbf71, emissive: 0x2fbf71, emissiveIntensity: 0.6 }));
  finial.position.set(L.mosque.x, 5.5, L.mosque.z); scene.add(finial);
  const finialGlow = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0x39d98a, fog: false }));
  finialGlow.position.set(L.mosque.x, 5.9, L.mosque.z); scene.add(finialGlow);
  // menara (minaret) — lebih tinggi dari ruko supaya siluetnya kebaca
  const minaret = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 9, 8), mqM);
  minaret.position.set(L.mosque.minaretX, 4.5, L.mosque.z); minaret.castShadow = true; scene.add(minaret);
  scene.add(box(1.1, 0.25, 1.1, mqM, L.mosque.minaretX, 6.6, L.mosque.z)); // balkon menara
  const spire = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.4, 8), mqDomeM);
  spire.position.set(L.mosque.minaretX, 9.7, L.mosque.z); scene.add(spire);
  const spireGlow = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0x39d98a, fog: false }));
  spireGlow.position.set(L.mosque.minaretX, 10.4, L.mosque.z); scene.add(spireGlow);
  // jendela menara + aula yang menyala (MeshBasicMaterial, fog:false — tembus kabut)
  // offset z 0.44 supaya di luar permukaan menara (radius maks 0.42)
  const mqWinM = new THREE.MeshBasicMaterial({ color: 0xffe9b0, fog: false });
  [3, 5, 7].forEach(y => scene.add(plane(0.22, 0.5, mqWinM, L.mosque.minaretX, y, L.mosque.z + 0.44)));
  scene.add(plane(0.5, 0.9, mqWinM, L.mosque.x - 1.1, 2.2, L.mosque.z + 1.52));
  scene.add(plane(0.5, 0.9, mqWinM, L.mosque.x + 1.1, 2.2, L.mosque.z + 1.52));
  // (pagar halaman masjid dihapus — posisinya di balik ruko, tidak terlihat)
  // cahaya hijau masjid (hex beda, tidak diredupkan style rainy)
  const mqLight = new THREE.PointLight(0x2fbf71, 1.4, 6, 1.8);
  mqLight.position.set(L.mosque.x, 3.0, -13.0); scene.add(mqLight);

  // ---- tiang listrik + kabel melengkung ----
  function powerPole(x, z) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 5.2, 8), std(null, { color: 0x2e2620 }));
    pole.position.set(x, 2.6, z); pole.castShadow = true; scene.add(pole);
    scene.add(box(1.4, 0.09, 0.09, std(null, { color: 0x2e2620 }), x, 4.9, z));
    scene.add(box(1.0, 0.09, 0.09, std(null, { color: 0x2e2620 }), x, 4.4, z));
    [-0.6, 0.6].forEach(dx => scene.add(box(0.08, 0.14, 0.08, std(null, { color: 0x8a8f9c }), x + dx, 4.95, z)));
  }
  powerPole(-7.4, -1.5);
  powerPole(7.4, -6.5);
  powerPole(-7.4, -8.5);
  catenaryWire(scene, -7.4, -1.5, 7.4, -6.5, 4.9, 0.9);
  catenaryWire(scene, -7.4, -1.5, -7.4, -8.5, 4.9, 0.5);
  catenaryWire(scene, 7.4, -6.5, -2.0, -9.0, 4.9, 0.7);

  // ---- lampu jalan ----
  streetLamp(scene, 2.2, -3.8, -1); // di sudut Indomaret, lengan ke jalan
  streetLamp(scene, -6.5, -6.5, 1); // trotoar kiri belakang

  // ---- lampu lalu lintas (merah menyala, di sudut warung) ----
  const tlPole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 3.2, 8), std(null, { color: 0x2e2e33 }));
  tlPole.position.set(2.9, 1.6, -2.0); tlPole.castShadow = true; scene.add(tlPole);
  scene.add(box(0.35, 0.95, 0.35, std(null, { color: 0x1c1c22 }), 2.9, 2.85, -2.0));
  const tlRed = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0xcc2222, emissive: 0xcc2222, emissiveIntensity: 1.2 }));
  tlRed.position.set(2.9, 3.15, -1.81); scene.add(tlRed);
  const tlGreen = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0x1a4426, emissive: 0x1a4426, emissiveIntensity: 0.1 }));
  tlGreen.position.set(2.9, 2.55, -1.81); scene.add(tlGreen);

  // ---- properti kecil: tong sampah + kerucut lalu lintas ----
  const binM = std(null, { color: 0x2e4a3a, roughness: 0.8 });
  const bin1 = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.72, 10), binM);
  bin1.position.set(-6.9, 0.36, 0.5); bin1.castShadow = true; scene.add(bin1);
  const bin2 = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.72, 10), std(null, { color: 0x3a3a44, roughness: 0.8 }));
  bin2.position.set(6.9, 0.36, -4.6); bin2.castShadow = true; scene.add(bin2);
  const coneM = std(null, { color: 0xe86a1e });
  [[5.2, 1.8], [5.6, 2.6]].forEach(([x, z]) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.5, 8), coneM);
    cone.position.set(x, 0.25, z); cone.castShadow = true; scene.add(cone);
  });

  // lampu: palet hex SAMA dengan set lumbung/gang/konbini (bulan 0xaebfff, fill 0xffe0b3)
  scene.add(new THREE.HemisphereLight(0x7d94e8, 0x1a1626, 0.55));
  const moon = new THREE.DirectionalLight(0xaebfff, 0.9);
  moon.position.set(-3, 6, 3); moon.castShadow = true;
  moon.shadow.camera.left = -12; moon.shadow.camera.right = 12;
  moon.shadow.camera.top = 12; moon.shadow.camera.bottom = -12;
  moon.shadow.mapSize.set(1024, 1024);
  scene.add(moon);
  const fill = new THREE.DirectionalLight(0xffe0b3, 0.25);
  fill.position.set(2, 3, 5); scene.add(fill);
}

// Perkiraan segitiga (dihitung analitis dari geometri — Box 12, Plane 2,
// Circle(20 seg) 20, Ring(12 seg) 24, Cylinder(10 seg) 40 / (8 seg) 32,
// Sphere(10,8) ~160 / (8,6) ~96 / (12,8) ~170, Cone(8 seg) 16,
// Tube(10 seg x 5 radial) 100; dihitung ulang dari kode final):
// tanah+marka 46, genangan 120, riak 336, streak 8,
// Indomaret 130, warung 52, gerobak x2 548, bajaj 172, motor 118,
// halte 76, billboard 46, ruko 116, masjid 460, tiang+kabel 540,
// lampu jalan 408, lampu lalu lintas 236, properti 112.
// Total ≈ 3.500 segitiga (tanpa karakter; hujan = Points, 0 segitiga).
