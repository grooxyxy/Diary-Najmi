// Set GANG (alley) — latar gang sempit malam hari untuk preview style.
// Dipakai kalau URL punya ?set=gang. Set lumbung (buildSet) tidak berubah.
// Gang berjalan sepanjang sumbu z: kamera (front: [0.6, 1.65, 4.8])
// berdiri di mulut gang, Najmi di titik 0, dinding belakang di z=-6.5.
// Palet lampu SAMA dengan buildSet (bulan 0xaebfff, fill 0xffe0b3,
// hemisphere 0x8fa3ff) supaya ketiga style (sakura/leviathan/rainy)
// jalan tanpa perubahan. Semua tekstur dilukis kode (canvas), tanpa aset.
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

// ---------- tekstur dilukis kode ----------
function asphaltTex() {
  return canvasTex(256, 256, g => {
    g.fillStyle = '#2a2d36'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2200; i++) {
      g.fillStyle = `rgba(${40 + Math.random() * 40 | 0},${42 + Math.random() * 40 | 0},${50 + Math.random() * 45 | 0},0.5)`;
      g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
    // retakan
    g.strokeStyle = 'rgba(12,13,18,0.8)'; g.lineWidth = 1.5;
    for (let i = 0; i < 7; i++) {
      g.beginPath();
      let x = Math.random() * 256, y = Math.random() * 256;
      g.moveTo(x, y);
      for (let s = 0; s < 5; s++) { x += (Math.random() - 0.5) * 60; y += Math.random() * 40; g.lineTo(x, y); }
      g.stroke();
    }
    // tambalan aspal lebih terang
    g.fillStyle = 'rgba(70,74,88,0.35)';
    for (let i = 0; i < 5; i++) g.fillRect(Math.random() * 200, Math.random() * 200, 40 + Math.random() * 40, 26 + Math.random() * 26);
  }, [2, 5]);
}
function plasterTex(base, stain) {
  return canvasTex(256, 256, g => {
    g.fillStyle = base; g.fillRect(0, 0, 256, 256);
    // garis plester horizontal samar
    g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 1;
    for (let y = 32; y < 256; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
    // noda lembap dari atas
    for (let i = 0; i < 12; i++) {
      const x = Math.random() * 256, w = 14 + Math.random() * 30, h = 40 + Math.random() * 90;
      const gr = g.createLinearGradient(x, 0, x, h);
      gr.addColorStop(0, stain); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x - w / 2, 0, w, h);
    }
    // bercak
    for (let i = 0; i < 300; i++) {
      g.fillStyle = `rgba(0,0,0,${0.04 + Math.random() * 0.08})`;
      g.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
    }
  }, [3, 1]);
}
function brickTex() {
  return canvasTex(256, 256, g => {
    g.fillStyle = '#6e3b2e'; g.fillRect(0, 0, 256, 256);
    const bh = 16, bw = 42;
    for (let row = 0; row < 256 / bh; row++) {
      const off = (row % 2) * bw / 2;
      for (let col = -1; col < 256 / bw + 1; col++) {
        const shade = 100 + Math.random() * 45;
        g.fillStyle = `rgb(${shade + 20 | 0},${shade * 0.55 | 0},${shade * 0.42 | 0})`;
        g.fillRect(col * bw + off + 2, row * bh + 2, bw - 4, bh - 4);
      }
    }
    g.fillStyle = 'rgba(20,14,10,0.25)';
    for (let i = 0; i < 10; i++) g.fillRect(Math.random() * 256, 0, 20 + Math.random() * 30, 60 + Math.random() * 120);
  }, [3, 1]);
}
function windowTex(lit) {
  return canvasTex(128, 160, g => {
    g.fillStyle = lit ? '#ffca6a' : '#141a2e'; g.fillRect(0, 0, 128, 160);
    if (lit) {
      // tirai: garis vertikal + siluet tanaman
      g.fillStyle = 'rgba(120,70,20,0.55)';
      for (let x = 8; x < 128; x += 18) g.fillRect(x, 0, 5, 160);
      g.fillStyle = 'rgba(60,40,10,0.7)';
      g.beginPath(); g.ellipse(96, 140, 22, 14, 0, 0, Math.PI * 2); g.fill();
      g.fillRect(92, 130, 4, 26); g.fillRect(100, 128, 4, 28);
      g.fillStyle = 'rgba(255,240,200,0.85)'; g.fillRect(0, 0, 128, 6);
    } else {
      g.fillStyle = 'rgba(120,150,220,0.12)';
      g.beginPath(); g.moveTo(0, 60); g.lineTo(128, 30); g.lineTo(128, 70); g.lineTo(0, 100); g.fill();
    }
    // bingkai
    g.strokeStyle = '#241a12'; g.lineWidth = 8; g.strokeRect(0, 0, 128, 160);
    g.beginPath(); g.moveTo(64, 0); g.lineTo(64, 160); g.moveTo(0, 80); g.lineTo(128, 80); g.stroke();
  });
}
function doorTex() {
  return canvasTex(128, 256, g => {
    g.fillStyle = '#5d4126'; g.fillRect(0, 0, 128, 256);
    for (let x = 0; x < 128; x += 26) {
      g.fillStyle = '#4a331d'; g.fillRect(x, 0, 3, 256);
      g.fillStyle = 'rgba(255,220,160,0.12)'; g.fillRect(x + 4, 0, 8, 256);
    }
    g.fillStyle = '#2e2012'; g.fillRect(0, 0, 128, 10); g.fillRect(0, 246, 128, 10);
    // gagang
    g.fillStyle = '#c9a227'; g.beginPath(); g.arc(102, 130, 7, 0, Math.PI * 2); g.fill();
  });
}
function neonSignTex() {
  return canvasTex(512, 128, g => {
    g.fillStyle = '#0c0a18'; g.fillRect(0, 0, 512, 128);
    g.font = 'bold 64px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = '#ff5fa2'; g.shadowBlur = 26;
    g.fillStyle = '#ffd7ea'; g.fillText('GANG LUMBUNG', 256, 52);
    g.shadowBlur = 10; g.fillStyle = '#ff5fa2'; g.fillText('GANG LUMBUNG', 256, 52);
    g.font = '28px sans-serif'; g.shadowColor = '#37e0ff'; g.shadowBlur = 14;
    g.fillStyle = '#d8f6ff'; g.fillText('· warung · lumbung · desa ·', 256, 104);
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
    g.fillStyle = '#f5f0e6'; g.font = 'bold 16px sans-serif'; g.fillText('MINUM', 70, 200);
    g.fillStyle = '#ffd23f'; g.fillRect(14, 240, 100, 8);
  });
}
function woodTex() {
  return canvasTex(128, 128, g => {
    g.fillStyle = '#8a6a42'; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = 'rgba(60,40,18,0.6)'; g.lineWidth = 2;
    for (let y = 0; y < 128; y += 18) { g.beginPath(); g.moveTo(0, y); g.lineTo(128, y); g.stroke(); }
    for (let i = 0; i < 40; i++) {
      g.strokeStyle = `rgba(60,40,18,${0.15 + Math.random() * 0.2})`;
      g.beginPath(); g.moveTo(Math.random() * 128, 0); g.lineTo(Math.random() * 128, 128); g.stroke();
    }
  });
}

// ---------- bangun gang ----------
export function buildGang(scene) {
  // tanah aspal gang (x -3..3, z -9..7)
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(6, 16), std(asphaltTex(), { roughness: 0.9 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, -1);
  ground.receiveShadow = true; scene.add(ground);

  // genangan: elips gelap mengkilap
  const puddleM = new THREE.MeshStandardMaterial({ color: 0x0d1428, roughness: 0.08, metalness: 0.8, transparent: true, opacity: 0.85 });
  [[-1.3, -2.2, 0.9, 0.55], [1.1, 0.6, 0.7, 0.45], [-0.4, -4.6, 1.1, 0.6], [1.5, -3.4, 0.55, 0.35]].forEach(([x, z, rx, rz]) => {
    const p = new THREE.Mesh(new THREE.CircleGeometry(1, 24), puddleM);
    p.scale.set(rx, rz, 1); p.rotation.x = -Math.PI / 2; p.position.set(x, 0.008, z);
    p.receiveShadow = true; scene.add(p);
  });

  // dinding kiri (plester) & kanan (bata) — tinggi 4.2, sepanjang z
  const wallL = box(0.3, 4.2, 16, std(plasterTex('#7a6f5e', 'rgba(30,25,18,0.5)')), -2.75, 2.1, -1);
  const wallR = box(0.3, 4.2, 16, std(brickTex()), 2.75, 2.1, -1);
  scene.add(wallL, wallR);
  // atap pinggir (lis di atas dinding, supaya siluet atas kebaca)
  scene.add(box(0.5, 0.18, 16, std(null, { color: 0x2b2620 }), -2.75, 4.28, -1));
  scene.add(box(0.5, 0.18, 16, std(null, { color: 0x2b2620 }), 2.75, 4.28, -1));

  // jendela: kiri 3 (2 nyala, 1 gelap), kanan 2 (1 nyala, 1 gelap)
  const winLit = windowTex(true), winDark = windowTex(false);
  function window(x, y, z, lit, ry) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.9),
      new THREE.MeshStandardMaterial({
        map: lit ? winLit : winDark,
        emissive: 0xffffff, emissiveMap: lit ? winLit : null, emissiveIntensity: lit ? 0.65 : 0,
        roughness: 0.6,
      }));
    w.position.set(x, y, z); w.rotation.y = ry; scene.add(w);
  }
  window(-2.58, 2.4, -3.5, true, Math.PI / 2);
  window(-2.58, 2.4, -0.5, false, Math.PI / 2);
  window(-2.58, 2.4, 2.2, true, Math.PI / 2);
  window(2.58, 2.5, -4.2, true, -Math.PI / 2);
  window(2.58, 2.5, 0.8, false, -Math.PI / 2);

  // dinding belakang (z=-6.5) + pintu kayu + papan neon
  const back = box(5.8, 4.2, 0.3, std(plasterTex('#6b5a48', 'rgba(20,16,10,0.5)')), 0, 2.1, -6.65);
  scene.add(back);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.2), std(doorTex()));
  door.position.set(-0.9, 1.1, -6.48); door.receiveShadow = true; scene.add(door);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.65),
    new THREE.MeshStandardMaterial({
      map: neonSignTex(), emissive: 0xffffff, emissiveMap: neonSignTex(), emissiveIntensity: 0.7, roughness: 0.4,
    }));
  sign.position.set(0.3, 3.0, -6.48); scene.add(sign);
  // lampu gantung di depan pintu
  const lampH = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xffc27a, emissive: 0xff9a2a, emissiveIntensity: 1.0 }));
  lampH.position.set(-0.9, 2.6, -6.2); scene.add(lampH);
  const lampLight = new THREE.PointLight(0xffb347, 2.2, 4.5, 1.8);
  lampLight.position.set(-0.9, 2.55, -6.0); scene.add(lampLight);
  // neon pink dari papan: cahaya spill ke dinding belakang
  const neonLight = new THREE.PointLight(0xff5fa2, 1.6, 4, 1.8);
  neonLight.position.set(0.3, 3.0, -6.0); scene.add(neonLight);

  // mesin penjual di dinding kanan (dekat mulut gang)
  const vend = box(0.9, 1.9, 0.7, new THREE.MeshStandardMaterial({
    map: vendingTex(), emissive: 0xffffff, emissiveMap: vendingTex(), emissiveIntensity: 0.35, roughness: 0.5,
  }), 2.35, 0.95, 1.8);
  scene.add(vend);

  // peti kayu (kiri, dekat belakang) + tong sampah (kiri, dekat depan)
  const wood = std(woodTex());
  scene.add(box(0.55, 0.55, 0.55, wood, -2.2, 0.28, -2.6));
  scene.add(box(0.45, 0.45, 0.45, wood, -2.25, 0.78, -2.6));
  scene.add(box(0.5, 0.5, 0.5, wood, -1.65, 0.25, -2.75));
  const binM = std(null, { color: 0x2e4a3a, roughness: 0.8 });
  const bin1 = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.72, 12), binM);
  bin1.position.set(-2.3, 0.36, 2.6); bin1.castShadow = true; scene.add(bin1);
  const bin2 = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.72, 12), std(null, { color: 0x3a3a44, roughness: 0.8 }));
  bin2.position.set(-2.3, 0.36, 3.3); bin2.castShadow = true; scene.add(bin2);

  // kabel melengkung di atas gang + lampu gantung di tengah
  function wire(z, y) {
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-2.6, y + 0.25, z),
      new THREE.Vector3(0, y - 0.45, z),
      new THREE.Vector3(2.6, y + 0.25, z));
    const w = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.018, 6), std(null, { color: 0x14100c }));
    w.castShadow = true; scene.add(w);
  }
  wire(-1.2, 3.9); wire(-3.6, 4.0);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xffd9a0, emissive: 0xffb347, emissiveIntensity: 1.2 }));
  bulb.position.set(0, 3.15, -1.2); scene.add(bulb);
  const bulbLight = new THREE.PointLight(0xffc27a, 1.4, 4, 1.8);
  bulbLight.position.set(0, 3.1, -1.2); scene.add(bulbLight);
  // tiang + kabel ke arah kamera (ujung gang)
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 3.6, 8), std(null, { color: 0x2e2620 }));
  pole.position.set(2.45, 1.8, 4.6); pole.castShadow = true; scene.add(pole);

  // lampu: palet SAMA dengan buildSet lumbung
  scene.add(new THREE.HemisphereLight(0x8fa3ff, 0x2a2416, 0.85));
  const moon = new THREE.DirectionalLight(0xaebfff, 1.1);
  moon.position.set(-3, 6, 3); moon.castShadow = true; scene.add(moon);
  const fill = new THREE.DirectionalLight(0xffe0b3, 0.75);
  fill.position.set(2, 3, 5); scene.add(fill);
}
