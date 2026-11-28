// Set KONBINI (konbini malam hujan) — latar khas style RAINY.
// Dipakai kalau URL punya ?set=konbini (tanpa ?day — ini latar malam).
// Najmi berdiri di depan konbini: kaca besar dengan interior hangat yang
// menyala, papan nama KONBINI 24h, awning, mesin penjual, bangku, rambu
// lalu lintas, lampu jalan, papan neon, jalan basah + genangan. Hujan dan
// tanah basah ditambahkan oleh style rainy sendiri.
// Palet lampu memakai hex yang SAMA dengan set lumbung/gang (key 0xaebfff
// bulan, fill 0xffe0b3) supaya style rainy (varian malam) jalan tanpa
// perubahan; lampu interior konbini memakai hex lain supaya tidak diredupkan
// style. Semua tekstur dilukis kode (canvas), tanpa aset.
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
// interior konbini: rak-rak barang + lampu hangat + kasir
function interiorTex() {
  return canvasTex(512, 256, g => {
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#ffe0ae'); grad.addColorStop(1, '#ffb45e');
    g.fillStyle = grad; g.fillRect(0, 0, 512, 256);
    // rak
    const goods = ['#ff5f5f', '#ffd23f', '#4fc3f7', '#81c784', '#ba68c8', '#ff8a65', '#fff176'];
    for (let shelf = 0; shelf < 3; shelf++) {
      const y = 30 + shelf * 62;
      g.fillStyle = '#7a5a34'; g.fillRect(0, y + 44, 512, 8);
      for (let x = 8; x < 500; x += 34) {
        g.fillStyle = goods[(x / 34 + shelf * 3) % goods.length | 0];
        g.fillRect(x, y + 8, 26, 36);
      }
    }
    // kasir + pintu kaca
    g.fillStyle = '#3a6b35'; g.fillRect(350, 190, 104, 66);
    g.fillStyle = '#f5f0e6'; g.font = 'bold 22px sans-serif'; g.textAlign = 'center';
    g.fillText('KASIR', 402, 226);
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(20, 200, 90, 56);
    g.strokeStyle = '#fff'; g.lineWidth = 3; g.strokeRect(20, 200, 90, 56);
    // gantungan lampu
    g.fillStyle = '#fff8e0';
    for (let x = 60; x < 500; x += 110) { g.beginPath(); g.arc(x, 12, 10, 0, Math.PI * 2); g.fill(); }
  });
}
function konbiniSignTex() {
  return canvasTex(512, 80, g => {
    g.fillStyle = '#2e7d32'; g.fillRect(0, 0, 512, 80);
    g.fillStyle = '#fff'; g.font = 'bold 52px sans-serif'; g.textAlign = 'center';
    g.fillText('KONBINI', 210, 58);
    g.fillStyle = '#ffd23f'; g.font = 'bold 36px sans-serif';
    g.fillText('24h', 412, 56);
  });
}
function neonTex(text, color) {
  return canvasTex(256, 96, g => {
    g.fillStyle = '#0c0a18'; g.fillRect(0, 0, 256, 96);
    g.font = 'bold 44px sans-serif'; g.textAlign = 'center';
    g.shadowColor = color; g.shadowBlur = 18;
    g.fillStyle = color; g.fillText(text, 128, 60);
    g.shadowBlur = 0; g.fillStyle = '#fff';
    g.font = 'bold 44px sans-serif'; g.fillText(text, 128, 60);
  });
}
function vendingTex() {
  return canvasTex(128, 256, g => {
    g.fillStyle = '#c22e2e'; g.fillRect(0, 0, 128, 256);
    g.fillStyle = '#1c1c22'; g.fillRect(10, 14, 108, 130);
    const cols = ['#ff5f5f', '#ffd23f', '#4fc3f7', '#81c784', '#ba68c8', '#ff8a65'];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
      g.fillStyle = cols[(r * 4 + c) % 6];
      g.fillRect(16 + c * 26, 22 + r * 40, 20, 30);
    }
    g.fillStyle = '#f5f0e6'; g.fillRect(10, 156, 108, 10);
    g.fillStyle = '#222'; g.fillRect(14, 176, 44, 60);
    g.fillStyle = '#f5f0e6'; g.font = 'bold 15px sans-serif'; g.fillText('MINUM', 70, 200);
    g.fillStyle = '#ffd23f'; g.fillRect(14, 240, 100, 8);
  });
}
function asphaltTex() {
  return canvasTex(256, 256, g => {
    g.fillStyle = '#2a2d36'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1500; i++) {
      g.fillStyle = `rgba(${44 + Math.random() * 40 | 0},${46 + Math.random() * 40 | 0},${56 + Math.random() * 40 | 0},0.5)`;
      g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
    g.strokeStyle = 'rgba(14,15,20,0.7)'; g.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
      g.beginPath();
      let x = Math.random() * 256, y = Math.random() * 256;
      g.moveTo(x, y);
      for (let s = 0; s < 4; s++) { x += (Math.random() - 0.5) * 50; y += Math.random() * 36; g.lineTo(x, y); }
      g.stroke();
    }
  }, [3, 5]);
}

export function buildKonbini(scene) {
  // jalan basah di depan konbini (x -7..7, z -6..8)
  const road = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), std(asphaltTex(), { roughness: 0.55, metalness: 0.25 }));
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0, 1);
  road.receiveShadow = true; scene.add(road);
  // genangan (elips mengkilap, pantulan langit malam)
  const puddleM = std(null, { color: 0x0d1428, roughness: 0.08, metalness: 0.8, transparent: true, opacity: 0.85 });
  [[-2.2, 2.4, 1.1, 0.6], [2.0, -1.2, 1.4, 0.8], [0.4, 4.2, 0.9, 0.5], [-3.4, -2.6, 1.2, 0.7]].forEach(([x, z, rx, rz]) => {
    const p = new THREE.Mesh(new THREE.CircleGeometry(1, 24), puddleM);
    p.rotation.x = -Math.PI / 2; p.scale.set(rx, rz, 1); p.position.set(x, 0.008, z);
    p.receiveShadow = true; scene.add(p);
  });

  // ---- gedung konbini (z=-5.5, menghadap +z) ----
  const kb = new THREE.Group();
  kb.add(box(9, 3.6, 0.4, std(null, { color: 0x2e5a4a }), 0, 1.8, 0)); // dinding belakang
  kb.add(box(9.4, 0.3, 1.2, std(null, { color: 0x1e3a30 }), 0, 3.7, 0.3)); // atap
  // kaca besar interior (emissive — menyala hangat)
  const intTex = interiorTex();
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 2.3),
    new THREE.MeshStandardMaterial({ map: intTex, emissive: 0xffffff, emissiveMap: intTex, emissiveIntensity: 0.85, roughness: 0.2 }));
  glass.position.set(0, 1.45, 0.22); kb.add(glass);
  // rangka kaca
  kb.add(box(8.4, 0.12, 0.1, std(null, { color: 0x1c1c22 }), 0, 2.62, 0.22));
  kb.add(box(8.4, 0.12, 0.1, std(null, { color: 0x1c1c22 }), 0, 0.32, 0.22));
  [-2.05, 0, 2.05].forEach(x => kb.add(box(0.12, 2.3, 0.1, std(null, { color: 0x1c1c22 }), x, 1.45, 0.22)));
  // papan nama KONBINI 24h (emissive — menyala hijau)
  const signTex = konbiniSignTex();
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 0.9),
    new THREE.MeshStandardMaterial({ map: signTex, emissive: 0xffffff, emissiveMap: signTex, emissiveIntensity: 0.7, roughness: 0.5 }));
  sign.position.set(0, 3.15, 0.22); kb.add(sign);
  // awning hijau-putih
  for (let x = -4.1; x < 4.1; x += 0.6) {
    kb.add(box(0.6, 0.08, 1.0, std(null, { color: (Math.round(x / 0.6) % 2 ? 0xf5f0e6 : 0x2e7d32) }), x + 0.3, 2.75, 0.7));
  }
  kb.position.set(0, 0, -5.5);
  scene.add(kb);
  // lampu interior (hangat, hex beda supaya tidak diredupkan style rainy)
  const innerLight = new THREE.PointLight(0xffc27a, 2.5, 7);
  innerLight.position.set(0, 2.0, -4.2); scene.add(innerLight);
  const signLight = new THREE.PointLight(0xff5fa2, 1.0, 5);
  signLight.position.set(0, 3.2, -4.6); scene.add(signLight);

  // ---- gedung samping dengan papan neon ----
  function sideBuilding(x, neonText, neonColor, neonX) {
    const b = box(3, 4.5, 3, std(null, { color: 0x4a4450 }), x, 2.25, -4);
    scene.add(b);
    const nTex = neonTex(neonText, neonColor);
    const neon = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.82),
      new THREE.MeshStandardMaterial({ map: nTex, emissive: 0xffffff, emissiveMap: nTex, emissiveIntensity: 0.9 }));
    neon.position.set(neonX, 3.0, -2.48); scene.add(neon);
    const nl = new THREE.PointLight(neonColor === '#ff5fa2' ? 0xff5fa2 : 0x33d5ff, 1.2, 4);
    nl.position.set(neonX, 3.0, -2.0); scene.add(nl);
  }
  sideBuilding(-6.8, 'RAMEN', '#ff5fa2', -5.3);
  sideBuilding(6.8, '24h', '#33d5ff', 5.3);

  // ---- mesin penjual (kiri) + bangku (kanan) ----
  const vendTex = vendingTex();
  const vend = box(0.9, 1.9, 0.7, new THREE.MeshStandardMaterial({
    map: vendTex, emissive: 0xffffff, emissiveMap: vendTex, emissiveIntensity: 0.35, roughness: 0.5,
  }), -4.4, 0.95, -3.2);
  scene.add(vend);
  const benchM = std(null, { color: 0x8a6b4a });
  const bench = new THREE.Group();
  bench.add(box(1.8, 0.08, 0.5, benchM, 0, 0.45, 0));
  bench.add(box(1.8, 0.4, 0.06, benchM, 0, 0.75, -0.24));
  bench.add(box(0.08, 0.45, 0.45, benchM, -0.8, 0.22, 0));
  bench.add(box(0.08, 0.45, 0.45, benchM, 0.8, 0.22, 0));
  bench.position.set(4.2, 0, -3.0); bench.rotation.y = -0.15;
  scene.add(bench);

  // ---- rambu lalu lintas (merah) + lampu jalan ----
  const tlPole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 3.2, 8), std(null, { color: 0x2e2e33 }));
  tlPole.position.set(4.6, 1.6, -0.5); tlPole.castShadow = true; scene.add(tlPole);
  scene.add(box(0.35, 0.95, 0.35, std(null, { color: 0x1c1c22 }), 4.6, 2.85, -0.5));
  const tlRed = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xcc2222, emissive: 0xcc2222, emissiveIntensity: 1.2 }));
  tlRed.position.set(4.6, 3.15, -0.31); scene.add(tlRed);
  const tlGreen = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0x1a4426, emissive: 0x1a4426, emissiveIntensity: 0.1 }));
  tlGreen.position.set(4.6, 2.55, -0.31); scene.add(tlGreen);
  const lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.4, 8), std(null, { color: 0x2e2e33 }));
  lampPole.position.set(-4.6, 1.7, -1.0); lampPole.castShadow = true; scene.add(lampPole);
  const lampHead = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xffb347, emissive: 0xffb347, emissiveIntensity: 1.4 }));
  lampHead.position.set(-4.6, 3.45, -1.0); scene.add(lampHead);
  const lampLight = new THREE.PointLight(0xffb347, 1.6, 5);
  lampLight.position.set(-4.6, 3.3, -1.0); scene.add(lampLight);

  // lampu: palet hex SAMA dengan set lumbung/gang (bulan 0xaebfff, fill 0xffe0b3)
  scene.add(new THREE.HemisphereLight(0x7d94e8, 0x1a1626, 0.55));
  const moon = new THREE.DirectionalLight(0xaebfff, 0.9);
  moon.position.set(-3, 6, 3); moon.castShadow = true; scene.add(moon);
  const fill = new THREE.DirectionalLight(0xffe0b3, 0.25);
  fill.position.set(2, 3, 5); scene.add(fill);
}
