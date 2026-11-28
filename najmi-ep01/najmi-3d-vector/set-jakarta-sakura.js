// Set JAKARTA-SAKURA — jalanan Jakarta siang hari, tampilan cel sakura.
// Dipakai kalau URL punya ?set=jakarta-sakura (bareng ?day=1).
// TANPA karakter: titik origin (0,0,0) adalah bundaran mini (plaza) dengan
// pohon kamboja berbunga — focal point alami di tengah jalan, bukan tempat
// kosong untuk karakter. Jalan membentang sepanjang sumbu z; kamera
// (front: [0.6, 1.65, 4.8]) melihat ke arah -z, ke arah obelisk ala Monas
// (z=-20) yang dibingkai jalan + rel MRT layang (z=-12).
// Pola builder mengikuti semangat sakura-crossing: builder generik
// (ruko, menara, pohon, kendaraan) + satu fungsi per elemen, ukuran
// terpusat di konstanta. Semua tekstur dilukis kode (canvas), tanpa aset.
// Palet lampu memakai hex yang SAMA dengan set lain (hemisphere 0x8fa3ff/
// 0x2a2416, kunci 0xaebfff, fill 0xffe0b3) supaya converter style sakura
// jalan tanpa perubahan.
import * as THREE from 'three';

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
// kabel menjuntai antara dua titik (a,b Vector3), sag = turun di tengah
function sagWire(a, b, sag, mat) {
  const mid = a.clone().lerp(b, 0.5); mid.y -= sag;
  const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
  const w = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.02, 4), mat);
  w.castShadow = true;
  return w;
}

// ---------- tekstur dilukis kode ----------
function asphaltTex() {
  return canvasTex(256, 256, g => {
    g.fillStyle = '#3a3d44'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1600; i++) {
      g.fillStyle = `rgba(${50 + Math.random() * 45 | 0},${52 + Math.random() * 45 | 0},${58 + Math.random() * 45 | 0},0.5)`;
      g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
    g.strokeStyle = 'rgba(18,19,24,0.7)'; g.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
      g.beginPath();
      let x = Math.random() * 256, y = Math.random() * 256;
      g.moveTo(x, y);
      for (let s = 0; s < 4; s++) { x += (Math.random() - 0.5) * 50; y += Math.random() * 36; g.lineTo(x, y); }
      g.stroke();
    }
  }, [2, 6]);
}
function sidewalkTex() {
  return canvasTex(256, 256, g => {
    g.fillStyle = '#9a968c'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(${120 + Math.random() * 40 | 0},${116 + Math.random() * 40 | 0},${104 + Math.random() * 36 | 0},0.45)`;
      g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
    g.strokeStyle = 'rgba(70,66,58,0.8)'; g.lineWidth = 2;
    for (let x = 0; x <= 256; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); }
    for (let y = 0; y <= 256; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
  }, [1, 6]);
}
function grassTex() {
  return canvasTex(128, 128, g => {
    g.fillStyle = '#5a8a3c'; g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 500; i++) {
      g.fillStyle = `rgba(${70 + Math.random() * 60 | 0},${130 + Math.random() * 60 | 0},${50 + Math.random() * 40 | 0},0.6)`;
      g.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
    }
  }, [4, 4]);
}
// fasad ruko: jendela grid lantai atas + toko lantai dasar (papan nama,
// awning garis, etalase + pintu) — satu tekstur per ruko
function rukoFacadeTex(base, signText, signBg, signFg, floors = 3, cols = 4) {
  return canvasTex(256, 512, g => {
    g.fillStyle = base; g.fillRect(0, 0, 256, 512);
    const ww = 256 / cols, wh = (512 - 130) / floors;
    for (let r = 0; r < floors; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * ww + 10, y = 14 + r * wh + 10, w = ww - 20, h = wh - 22;
        const lit = Math.random() < 0.15;
        g.fillStyle = lit ? '#ffca6a' : '#2a3a55';
        g.fillRect(x, y, w, h);
        g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x, y, w, 4);
        g.strokeStyle = '#f5f0e6'; g.lineWidth = 3; g.strokeRect(x, y, w, h);
        g.beginPath(); g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y + h); g.stroke();
      }
    }
    const sy = 512 - 130;
    g.fillStyle = signBg; g.fillRect(0, sy, 256, 46);
    g.font = 'bold 26px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = signFg; g.fillText(signText, 128, sy + 24);
    for (let x = 0; x < 256; x += 32) {
      g.fillStyle = (x / 32) % 2 ? '#f5f0e6' : signBg;
      g.fillRect(x, sy + 46, 32, 22);
    }
    g.fillStyle = '#3a4a63'; g.fillRect(12, sy + 74, 150, 52);
    g.fillStyle = 'rgba(255,210,120,0.85)'; g.fillRect(20, sy + 80, 134, 40);
    g.fillStyle = '#5a4632'; g.fillRect(176, sy + 74, 66, 52);
    g.fillStyle = '#c9a227'; g.beginPath(); g.arc(196, sy + 100, 4, 0, Math.PI * 2); g.fill();
  });
}
// grid jendela gedung pencakar langit (sebagian menyala hangat)
function towerTex(tint) {
  return canvasTex(128, 512, g => {
    g.fillStyle = tint; g.fillRect(0, 0, 128, 512);
    for (let r = 0; r < 24; r++) {
      for (let c = 0; c < 5; c++) {
        const lit = Math.random() < 0.12;
        g.fillStyle = lit ? '#ffca6a' : '#1e2c44';
        g.fillRect(8 + c * 24, 10 + r * 21, 16, 12);
      }
    }
    g.fillStyle = 'rgba(255,255,255,0.18)';
    g.fillRect(0, 0, 14, 512);
  });
}
// papan nama generik (billboard, MRT, MASJID, angkot): teks + sub-teks
function signBoardTex(text, bg, fg, sub = '') {
  return canvasTex(512, 160, g => {
    g.fillStyle = bg; g.fillRect(0, 0, 512, 160);
    g.fillStyle = fg; g.font = 'bold 56px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, 256, sub ? 62 : 80);
    if (sub) {
      g.font = '28px sans-serif'; g.fillStyle = fg;
      g.globalAlpha = 0.85; g.fillText(sub, 256, 122); g.globalAlpha = 1;
    }
  });
}

// ---------- lampu: palet hex SAMA dengan set lain (kontrak style) ----------
function addLights(scene) {
  scene.background = new THREE.Color(0x9fc8e8);
  // kabut jauh supaya obelisk (z=-20) + pencakar langit tidak hilang
  scene.fog = new THREE.Fog(0x9fc8e8, 14, 48);
  scene.add(new THREE.HemisphereLight(0x8fa3ff, 0x2a2416, 1.1));
  const sun = new THREE.DirectionalLight(0xffe0b3, 2.0);
  sun.position.set(4, 10, 6); sun.castShadow = true;
  sun.shadow.camera.left = -16; sun.shadow.camera.right = 16;
  sun.shadow.camera.top = 16; sun.shadow.camera.bottom = -16;
  sun.shadow.mapSize.set(2048, 2048);
  scene.add(sun);
  const bounce = new THREE.DirectionalLight(0xaebfff, 0.9);
  bounce.position.set(-4, 5, -3); scene.add(bounce);
}

// ---------- tanah & jalan: jalan utama + trotoar + bundaran di origin ----------
function buildGround(scene) {
  const road = new THREE.Mesh(new THREE.PlaneGeometry(8, 22), std(asphaltTex(), { roughness: 0.9 }));
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0, -3);
  road.receiveShadow = true; scene.add(road);
  const walkTex = sidewalkTex();
  [-1, 1].forEach(s => {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 22), std(walkTex, { roughness: 0.95 }));
    w.rotation.x = -Math.PI / 2; w.position.set(s * 5.25, 0.02, -3);
    w.receiveShadow = true; scene.add(w);
    scene.add(box(0.18, 0.14, 22, std(null, { color: 0x8a867e }), s * 4.05, 0.07, -3));
  });
  // bundaran mini di origin: pulau bundar + rumput + bibir batu
  const island = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.6, 0.18, 24),
    std(null, { color: 0x9a968c, roughness: 0.95 }));
  island.position.set(0, 0.09, 0); island.castShadow = true; island.receiveShadow = true; scene.add(island);
  const islandTop = new THREE.Mesh(new THREE.CircleGeometry(1.42, 24), std(grassTex(), { roughness: 1 }));
  islandTop.rotation.x = -Math.PI / 2; islandTop.position.set(0, 0.185, 0);
  islandTop.receiveShadow = true; scene.add(islandTop);
  // zebra cross di dua sisi bundaran (z=+3.2 & z=-3.2)
  const zebraM = std(null, { color: 0xf2efe6, roughness: 0.85 });
  [3.2, -3.2].forEach(z => {
    [-2.4, -1.2, 0, 1.2, 2.4].forEach(x => {
      const bar = box(0.7, 0.02, 2.4, zebraM, x, 0.015, z);
      bar.castShadow = false; scene.add(bar);
    });
  });
  // garis tengah kuning putus-putus (di luar zebra & bundaran)
  const dashM = std(null, { color: 0xffd23f, roughness: 0.85 });
  [-12, -10, -8, -6, 5.5, 7].forEach(z => {
    const d = box(0.15, 0.02, 1.2, dashM, 0, 0.015, z);
    d.castShadow = false; scene.add(d);
  });
  // petak rumput di sudut trotoar dekat origin
  const g = std(grassTex(), { roughness: 1 });
  [[-5.2, 1.6], [5.2, 1.6], [-5.2, -4.6], [5.2, -4.6]].forEach(([x, z]) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), g);
    p.rotation.x = -Math.PI / 2; p.position.set(x, 0.03, z);
    p.receiveShadow = true; scene.add(p);
  });
}

// ---------- bangunan: masjid, ruko, pencakar langit, obelisk Monas ----------
// gedung: fasad hanya di sisi menghadap jalan (material array, seperti kota)
function building(scene, w, h, d, tex, baseColor, faceIdx, x, z) {
  const plain = std(null, { color: baseColor });
  const face = std(tex);
  const mats = [plain, plain, plain, plain, plain, plain];
  mats[faceIdx] = face;
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
  b.position.set(x, h / 2, z);
  b.castShadow = true; b.receiveShadow = true;
  scene.add(b);
  return b;
}
// masjid: aula + kubah hijau + 2 menara + pintu lengkung + papan MASJID
function buildMosque(scene) {
  const g = new THREE.Group();
  const cream = std(null, { color: 0xf5efe2, roughness: 0.9 });
  const green = std(null, { color: 0x2e7d5b, roughness: 0.8 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xc9a227, emissive: 0xc9a227, emissiveIntensity: 0.25, roughness: 0.4, metalness: 0.5 });
  g.add(box(4.2, 3.2, 4.5, cream, 0, 1.6, 0));
  g.add(box(4.5, 0.25, 4.8, green, 0, 3.3, 0));
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    std(null, { color: 0x2e7d5b, roughness: 0.6, flatShading: true }));
  dome.position.set(0, 3.4, 0); dome.castShadow = true; g.add(dome);
  const fin = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), gold);
  fin.position.set(0, 5.0, 0); g.add(fin);
  const spike = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.5, 6), gold);
  spike.position.set(0, 5.25, 0); g.add(spike);
  function minaret(mx, mz, h) {
    const m = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, h, 10),
      std(null, { color: 0xf5efe2, roughness: 0.9 }));
    shaft.position.set(0, h / 2, 0); shaft.castShadow = true; m.add(shaft);
    m.add(box(0.9, 0.18, 0.9, green, 0, h * 0.72, 0));
    m.add(box(0.7, 0.15, 0.7, cream, 0, h * 0.92, 0));
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), green);
    cap.position.set(0, h + 0.07, 0); cap.castShadow = true; m.add(cap);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.4, 6), gold);
    tip.position.set(0, h + 0.55, 0); m.add(tip);
    m.position.set(mx, 0, mz);
    g.add(m);
  }
  minaret(2.4, 2.0, 6.5);
  minaret(2.4, -2.0, 5.5);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.0),
    std(canvasTex(128, 256, c => {
      c.fillStyle = '#2e7d5b'; c.fillRect(0, 0, 128, 256);
      c.fillStyle = '#1d5a40'; c.beginPath();
      c.moveTo(14, 256); c.lineTo(14, 90); c.arc(64, 90, 50, Math.PI, 0); c.lineTo(114, 256); c.closePath(); c.fill();
      c.strokeStyle = '#c9a227'; c.lineWidth = 5; c.stroke();
      c.fillStyle = '#c9a227'; c.beginPath(); c.arc(64, 210, 8, 0, Math.PI * 2); c.fill();
    })));
  door.position.set(2.12, 1.0, 0); door.rotation.y = Math.PI / 2; g.add(door);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.6),
    new THREE.MeshStandardMaterial({ map: signBoardTex('MASJID', '#2e7d5b', '#ffe9a8', 'AL-IKHLAS'), roughness: 0.6 }));
  sign.position.set(2.12, 2.9, 0); sign.rotation.y = Math.PI / 2; g.add(sign);
  // tiang gerbang di tepi trotoar
  [[2.3, 1.3], [2.3, -1.3]].forEach(([px, pz]) => {
    g.add(box(0.25, 1.4, 0.25, green, px, 0.7, pz));
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), gold);
    ball.position.set(px, 1.5, pz); g.add(ball);
  });
  g.position.set(-8.6, 0, -6.5);
  scene.add(g);
}
// builder generik ruko: kotak + fasad papan nama + atap + AC outdoor
function ruko(scene, x, z, faceIdx, w, h, d, base, signText, signBg, signFg, floors) {
  const tex = rukoFacadeTex(base, signText, signBg, signFg, floors, 4);
  building(scene, w, h, d, tex, base, faceIdx, x, z);
  scene.add(box(w + 0.3, 0.18, d + 0.3, std(null, { color: 0x3a3a44 }), x, h + 0.09, z));
  const acX = x + (faceIdx === 0 ? w / 2 + 0.06 : -w / 2 - 0.06);
  scene.add(box(0.14, 0.3, 0.4, std(null, { color: 0xd8d8d8, roughness: 0.6 }), acX, h * 0.55, z + d / 4));
}
// gedung pencakar langit: kotak + grid jendela + atap + antena
function tower(scene, x, z, w, h, d, tint) {
  const t = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), std(towerTex(tint), { roughness: 0.85 }));
  t.position.set(x, h / 2, z);
  t.castShadow = true; t.receiveShadow = true;
  scene.add(t);
  scene.add(box(w * 0.5, 0.4, d * 0.5, std(null, { color: 0x3a3a44 }), x, h + 0.2, z));
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 1.6, 6), std(null, { color: 0x2e2e33 }));
  ant.position.set(x, h + 1.0, z); scene.add(ant);
  return t;
}
// obelisk ala Monas: pelataran + cawan + tiang meruncing + api emas
function buildMonas(scene) {
  const g = new THREE.Group();
  const stone = std(null, { color: 0xd8d2c2, roughness: 0.9 });
  const stoneDark = std(null, { color: 0xb8b2a2, roughness: 0.9 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd4af37, emissive: 0xd4af37, emissiveIntensity: 0.5, roughness: 0.35, metalness: 0.6 });
  g.add(box(4.5, 0.3, 4.5, stoneDark, 0, 0.15, 0));
  g.add(box(3.2, 0.5, 3.2, stone, 0, 0.55, 0));
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.05, 0.9, 8), stone);
  cup.position.set(0, 1.25, 0); cup.castShadow = true; g.add(cup);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.55, 8.8, 4),
    std(null, { color: 0xe8e2d2, roughness: 0.85, flatShading: true }));
  shaft.position.set(0, 6.1, 0); shaft.rotation.y = Math.PI / 4; shaft.castShadow = true; g.add(shaft);
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), gold);
  flame.position.set(0, 10.9, 0); g.add(flame);
  const tongue = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.7, 8), gold);
  tongue.position.set(0, 11.4, 0); g.add(tongue);
  g.position.set(0, 0, -20);
  scene.add(g);
}

function buildBuildings(scene) {
  buildMosque(scene);
  // kiri (menghadap +x -> face 0)
  ruko(scene, -6.2, -1.0, 0, 4.5, 4.5, 4, '#a8b08a', 'WARUNG', '#3a6b35', '#ffe9a8', 3);
  ruko(scene, -6.2, -11, 0, 4.5, 5.5, 4, '#8fa3b8', 'TOKO', '#2e5a8a', '#e8f2ff', 4);
  // kanan (menghadap -x -> face 1)
  ruko(scene, 6.2, 2.5, 1, 4.5, 6, 4, '#9ab8a8', 'APOTEK', '#2e7d6b', '#ffffff', 4);
  ruko(scene, 6.2, -2, 1, 4.5, 5, 4, '#c2c2c2', 'INDOMARET', '#1e5aa8', '#ffe93f', 3);
  ruko(scene, 6.2, -6.5, 1, 4.5, 4.5, 4, '#b8a88e', 'BAKSO', '#c22e2e', '#ffe9a8', 3);
  ruko(scene, 6.2, -11, 1, 4.5, 5, 4, '#c2a184', 'SATE', '#6b4a2f', '#ffe9a8', 3);
  // pencakar langit latar belakang (z -17..-24), sumbu x=0 dibiarkan
  // lowong supaya obelisk Monas tetap jadi fokus tengah
  tower(scene, -12, -18, 6, 13, 6, '#5a6a8a');
  tower(scene, -5, -21, 5, 15, 5, '#6a5a7a');
  tower(scene, 6, -19, 6, 11, 6, '#4a6a7a');
  tower(scene, 13, -17, 5, 14, 5, '#7a6a5a');
  tower(scene, -6, -24, 8, 17, 6, '#555a66');
  tower(scene, 8, -23, 7, 16, 6, '#6a6a5a');
  // siluet gedung jauh (polos, kabut yang memudarkan)
  const silM = std(null, { color: 0x7a8aa8, roughness: 1 });
  [[-17, -26, 7, 12, 5], [17, -26, 6, 10, 5]].forEach(([x, z, w, h, d]) => {
    const s = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), silM);
    s.position.set(x, h / 2, z); scene.add(s);
  });
  buildMonas(scene);
}

// ---------- rel MRT layang + kereta, kendaraan, kaki lima, tiang, pohon ----------
// rel MRT layang melintang (z=-12): tiang + balok + rel + kereta 3 gerbong
function buildMRT(scene) {
  const pillarM = std(null, { color: 0x8a867e, roughness: 0.9 });
  [-9, -6, -3, 0, 3, 6, 9].forEach(x => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 4.6, 10), pillarM);
    p.position.set(x, 2.3, -12); p.castShadow = true; scene.add(p);
  });
  scene.add(box(20, 0.7, 1.1, std(null, { color: 0x7a766e }), 0, 4.95, -12));
  const railM = std(null, { color: 0x4a4a52, roughness: 0.4, metalness: 0.7 });
  scene.add(box(20, 0.08, 0.12, railM, 0, 5.35, -12.35));
  scene.add(box(20, 0.08, 0.12, railM, 0, 5.35, -11.65));
  // peron stasiun di depan rel + papan nama MRT
  scene.add(box(13, 0.3, 1.6, std(null, { color: 0x9a968c }), 0, 0.15, -10.5));
  const signPole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.6, 8), std(null, { color: 0x2e2e33 }));
  signPole.position.set(-4.5, 0.8, -10.4); signPole.castShadow = true; scene.add(signPole);
  const mrtSign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.75),
    new THREE.MeshStandardMaterial({ map: signBoardTex('MRT JAKARTA', '#1e5aa8', '#ffffff', 'STASIUN BUNDARAN'), roughness: 0.6 }));
  mrtSign.position.set(-4.5, 1.6, -10.4); scene.add(mrtSign);
  function trainCar(cx) {
    const g = new THREE.Group();
    g.add(box(3.0, 1.8, 1.7, std(null, { color: 0xe8e8ec, roughness: 0.4, metalness: 0.3 }), 0, 6.35, 0));
    g.add(box(3.04, 0.35, 1.74, std(null, { color: 0x1e5aa8, roughness: 0.4 }), 0, 5.85, 0));
    g.add(box(3.04, 0.15, 1.74, std(null, { color: 0x3a3a44, roughness: 0.6 }), 0, 7.3, 0));
    const winM = std(null, { color: 0x1e2c44, roughness: 0.2, metalness: 0.5 });
    [-1.0, 0, 1.0].forEach(wx => g.add(box(0.8, 0.7, 0.06, winM, wx, 6.6, 0.88)));
    g.add(box(0.55, 1.3, 0.06, std(null, { color: 0x8a7a6a }), 1.35, 6.1, 0.88));
    g.position.set(cx, 0, -12);
    scene.add(g);
    return g;
  }
  trainCar(-3.2); trainCar(0); trainCar(3.2);
}
// bajaj: badan + kanopi miring + stang + lampu + 3 roda
function bajaj(scene, x, z, ry, color) {
  const g = new THREE.Group();
  g.add(box(1.1, 0.7, 1.9, std(null, { color, roughness: 0.5, metalness: 0.2 }), 0, 0.55, 0));
  g.add(box(1.0, 0.55, 1.1, std(null, { color: 0x2a3a55, roughness: 0.25, metalness: 0.4 }), 0, 1.15, -0.2));
  const canopy = box(1.05, 0.06, 1.0, std(null, { color: 0x222222, roughness: 0.7 }), 0, 1.5, 0.35);
  canopy.rotation.x = 0.25; g.add(canopy);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 6), std(null, { color: 0x1a1a1a }));
  bar.rotation.z = Math.PI / 2; bar.position.set(0, 1.05, 0.85); g.add(bar);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffe9a8, emissiveIntensity: 0.5 }));
  lamp.position.set(0, 0.6, 0.98); g.add(lamp);
  const wheelM = std(null, { color: 0x1a1a1a, roughness: 0.9 });
  [[0, 0.95], [-0.5, -0.7], [0.5, -0.7]].forEach(([wx, wz]) => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.18, 10), wheelM);
    w.rotation.z = Math.PI / 2; w.position.set(wx, 0.28, wz); w.castShadow = true; g.add(w);
  });
  g.position.set(x, 0, z); g.rotation.y = ry;
  scene.add(g);
  return g;
}
// angkot: minibus biru + garis kuning + papan rute di atap + 4 roda
function angkot(scene, x, z, ry) {
  const g = new THREE.Group();
  g.add(box(1.8, 0.9, 3.4, std(null, { color: 0x2e6fc2, roughness: 0.45, metalness: 0.25 }), 0, 0.75, 0));
  g.add(box(1.7, 0.7, 2.2, std(null, { color: 0x2a3a55, roughness: 0.25, metalness: 0.4 }), 0, 1.5, -0.3));
  g.add(box(1.84, 0.18, 3.44, std(null, { color: 0xffd23f, roughness: 0.6 }), 0, 0.95, 0));
  g.add(box(0.9, 0.28, 0.06, new THREE.MeshStandardMaterial({ map: signBoardTex('ANGKOT', '#2e6fc2', '#ffffff'), roughness: 0.6 }), 0, 1.98, 0.6));
  const wheelM = std(null, { color: 0x1a1a1a, roughness: 0.9 });
  [[-0.85, 1.1], [0.85, 1.1], [-0.85, -1.1], [0.85, -1.1]].forEach(([wx, wz]) => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 10), wheelM);
    w.rotation.z = Math.PI / 2; w.position.set(wx, 0.32, wz); w.castShadow = true; g.add(w);
  });
  const lampM = new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffe9a8, emissiveIntensity: 0.4 });
  [-0.6, 0.6].forEach(hx => {
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), lampM);
    hl.position.set(hx, 0.7, 1.72); g.add(hl);
  });
  g.position.set(x, 0, z); g.rotation.y = ry;
  scene.add(g);
  return g;
}
// gerobak pedagang: bak + etalase kaca + payung + roda + label
function gerobak(scene, x, z, ry, color, label) {
  const g = new THREE.Group();
  g.add(box(1.1, 0.55, 0.7, std(null, { color, roughness: 0.7 }), 0, 0.75, 0));
  g.add(box(1.15, 0.08, 0.75, std(null, { color: 0x8a6b4a, roughness: 0.8 }), 0, 1.06, 0));
  g.add(box(1.0, 0.35, 0.6, std(null, { color: 0xbfd9e8, roughness: 0.2, metalness: 0.3 }), 0, 1.28, 0));
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 6), std(null, { color: 0x6b5a48 }));
  pole.position.set(0, 1.9, 0); g.add(pole);
  const umb = new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.45, 10), std(null, { color: 0xc22e2e, roughness: 0.8, flatShading: true }));
  umb.position.set(0, 2.75, 0); umb.castShadow = true; g.add(umb);
  const wheelM = std(null, { color: 0x1a1a1a, roughness: 0.9 });
  [-0.55, 0.55].forEach(wx => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.12, 10), wheelM);
    w.rotation.z = Math.PI / 2; w.position.set(wx, 0.26, 0); w.castShadow = true; g.add(w);
  });
  g.add(box(0.08, 0.5, 0.08, std(null, { color: 0x5a4632 }), -0.4, 0.25, 0.32));
  g.add(box(0.08, 0.5, 0.08, std(null, { color: 0x5a4632 }), 0.4, 0.25, 0.32));
  const labelPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.3),
    new THREE.MeshStandardMaterial({ map: signBoardTex(label, '#f5efe2', '#c22e2e'), roughness: 0.6 }));
  labelPlane.position.set(0, 0.78, 0.38); g.add(labelPlane);
  g.position.set(x, 0, z); g.rotation.y = ry;
  scene.add(g);
  return g;
}
// tiang listrik + kabel menjuntai (melintang & sepanjang jalan)
function buildPoles(scene) {
  const poleM = std(null, { color: 0x3a2e24, roughness: 0.9 });
  const wireM = std(null, { color: 0x14100c, roughness: 0.9 });
  [[-4.8, -7], [4.8, -7], [-4.8, -1], [4.8, -1], [-4.8, 4], [4.8, 4]].forEach(([x, z]) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 5.2, 8), poleM);
    p.position.set(x, 2.6, z); p.castShadow = true; scene.add(p);
    scene.add(box(1.0, 0.08, 0.08, poleM, x, 4.9, z));
  });
  // trafo di satu tiang
  scene.add(box(0.5, 0.7, 0.35, std(null, { color: 0x5a5a62, roughness: 0.7, metalness: 0.3 }), -4.8, 3.9, -7));
  [-7, -1, 4].forEach(z => {
    scene.add(sagWire(new THREE.Vector3(-4.8, 4.85, z), new THREE.Vector3(4.8, 4.85, z), 0.7, wireM));
  });
  scene.add(sagWire(new THREE.Vector3(-4.8, 4.85, -7), new THREE.Vector3(-4.8, 4.85, -1), 0.5, wireM));
  scene.add(sagWire(new THREE.Vector3(-4.8, 4.85, -1), new THREE.Vector3(-4.8, 4.85, 4), 0.5, wireM));
}
// billboard: JAKARTA di atap ruko SATE + SATE AYAM di peron MRT
function buildBillboards(scene) {
  const back = std(null, { color: 0x2e2e33, roughness: 0.7 });
  scene.add(box(0.12, 1.7, 3.4, back, 6.2, 6.4, -11));
  const ad1 = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.6),
    new THREE.MeshStandardMaterial({ map: signBoardTex('JAKARTA', '#1e5aa8', '#ffffff', 'KOTA KITA'), roughness: 0.5 }));
  ad1.position.set(6.12, 6.4, -11); ad1.rotation.y = -Math.PI / 2; scene.add(ad1);
  scene.add(box(0.1, 0.5, 0.1, back, 6.2, 5.4, -12.2));
  scene.add(box(0.1, 0.5, 0.1, back, 6.2, 5.4, -9.8));
  scene.add(box(2.0, 1.0, 0.1, back, 3.0, 2.2, -10.5));
  const ad2 = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.9),
    new THREE.MeshStandardMaterial({ map: signBoardTex('SATE AYAM', '#c22e2e', '#ffe9a8', 'MADURA ASLI'), roughness: 0.5 }));
  ad2.position.set(3.0, 2.2, -10.44); scene.add(ad2);
  scene.add(box(0.08, 1.8, 0.08, back, 2.2, 0.9, -10.5));
  scene.add(box(0.08, 1.8, 0.08, back, 3.8, 0.9, -10.5));
}
// pohon berbunga generik (kamboja putih / tabebuya pink): batang + 3 gumpal
function flowerTree(scene, x, z, s, bloom, y0 = 0) {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * s, 0.15 * s, 1.8 * s, 7),
    std(null, { color: 0x5a3a28, roughness: 1 }));
  trunk.position.set(x, y0 + 0.9 * s, z); trunk.castShadow = true; scene.add(trunk);
  const canopyM = new THREE.MeshStandardMaterial({ color: bloom, roughness: 0.9, flatShading: true });
  [[0, 2.4, 0, 0.95], [0.55, 2.1, 0.2, 0.7], [-0.5, 2.15, -0.15, 0.65]].forEach(([dx, dy, dz, r]) => {
    const c = new THREE.Mesh(new THREE.SphereGeometry(r * s, 8, 6), canopyM);
    c.position.set(x + dx * s, y0 + dy * s, z + dz * s); c.castShadow = true; scene.add(c);
  });
}
// pisang: batang + 6 daun besar menunduk
function banana(scene, x, z, s = 1) {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09 * s, 0.13 * s, 1.6 * s, 7),
    std(null, { color: 0x8a9a5a, roughness: 1 }));
  trunk.position.set(x, 0.8 * s, z); trunk.castShadow = true; scene.add(trunk);
  const leafM = std(null, { color: 0x4a8a3c, roughness: 0.9, flatShading: true });
  for (let i = 0; i < 6; i++) {
    const lg = new THREE.Group();
    const leaf = box(0.55 * s, 0.04, 1.6 * s, leafM, 0, 0, 0.8 * s);
    leaf.rotation.x = 0.45;
    lg.add(leaf);
    lg.position.set(x, 1.7 * s, z);
    lg.rotation.y = (i / 6) * Math.PI * 2;
    scene.add(lg);
  }
}
// palem: batang tinggi + 7 pelepah + kelapa
function palm(scene, x, z, s = 1) {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * s, 0.12 * s, 3.2 * s, 7),
    std(null, { color: 0x8a7a5a, roughness: 1 }));
  trunk.position.set(x, 1.6 * s, z); trunk.castShadow = true; scene.add(trunk);
  const frondM = std(null, { color: 0x3a7a34, roughness: 0.9, flatShading: true });
  for (let i = 0; i < 7; i++) {
    const fg = new THREE.Group();
    const f = box(0.28 * s, 0.03, 1.7 * s, frondM, 0, 0, 0.85 * s);
    f.rotation.x = 0.55;
    fg.add(f);
    fg.position.set(x, 3.2 * s, z);
    fg.rotation.y = (i / 7) * Math.PI * 2;
    scene.add(fg);
  }
  const nutM = std(null, { color: 0x6b4a2f, roughness: 0.9 });
  [[0.15, 0], [-0.15, 0.1], [0, -0.15]].forEach(([dx, dz]) => {
    const n = new THREE.Mesh(new THREE.SphereGeometry(0.11 * s, 8, 6), nutM);
    n.position.set(x + dx * s, 3.05 * s, z + dz * s); scene.add(n);
  });
}

function buildStreetLife(scene) {
  bajaj(scene, -2.6, 3.6, 0.5, 0xe87a2a);
  bajaj(scene, 2.6, 3.2, -0.5, 0x2e6fc2);
  angkot(scene, -2.7, 0.5, 0.15);
  gerobak(scene, -4.0, 1.4, Math.PI / 2, 0xc22e2e, 'BAKSO');
  gerobak(scene, 3.7, 0.6, -Math.PI / 2, 0x2e7d5b, 'SATE');
  buildPoles(scene);
  buildBillboards(scene);
}

function buildTrees(scene) {
  flowerTree(scene, 2.3, 0, 0.9, 0xffe9f2, 0.18); // kamboja di tepi kanan bundaran — sumbu tengah dibiarkan lowong untuk Monas + MRT
  flowerTree(scene, -5.2, -4.6, 0.95, 0xffe9f2);
  flowerTree(scene, 5.2, -4.6, 1.0, 0xf2a0c0); // tabebuya pink
  banana(scene, -5.2, 1.6, 1.0);
  palm(scene, 5.2, 1.6, 1.0);
  palm(scene, -5.2, 4.5, 1.05);
  banana(scene, -5.2, 3.0, 0.9);
  // kelopak kamboja melayang di sekitar bundaran
  const N = 90, pp = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pp[i * 3] = 2.3 + (Math.random() - 0.5) * 5;
    pp[i * 3 + 1] = 0.4 + Math.random() * 3.2;
    pp[i * 3 + 2] = (Math.random() - 0.5) * 5;
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  const petalTex = canvasTex(32, 32, ctx => {
    const g = ctx.createRadialGradient(16, 16, 1, 16, 16, 15);
    g.addColorStop(0, 'rgba(255,240,245,1)');
    g.addColorStop(1, 'rgba(255,240,245,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 32, 32);
  });
  scene.add(new THREE.Points(pg, new THREE.PointsMaterial({
    size: 0.13, map: petalTex, transparent: true, opacity: 0.85,
    color: 0xffe9f2, depthWrite: false, sizeAttenuation: true,
  })));
  // awan siang (putih, tanpa fog supaya tetap terang)
  const cloudM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true });
  cloudM.fog = false;
  [[-8, 11, -16, 2.2], [3, 12, -18, 2.8], [9, 10.5, -15, 1.8], [-2, 11.5, -20, 2.4]].forEach(([x, y, z, r]) => {
    const c = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), cloudM);
    c.scale.y = 0.38; c.position.set(x, y, z); scene.add(c);
  });
}

export function buildJakartaSakura(scene) {
  addLights(scene);
  buildGround(scene);
  buildBuildings(scene);
  buildMRT(scene);
  buildStreetLife(scene);
  buildTrees(scene);
}
