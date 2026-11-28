// Set KOTA (perkotaan siang hari) — jalan kota dengan Najmi di zebra cross.
// Dipakai kalau URL punya ?set=kota (biasanya bareng ?day=1).
// Jalan berjalan sepanjang sumbu z: kamera (front: [0.6, 1.65, 4.8]) melihat
// ke arah -z, Najmi di titik 0 di atas zebra cross, gedung menutup ujung jalan.
// Palet lampu memakai hex yang SAMA dengan set lumbung/gang supaya ketiga
// style jalan tanpa perubahan logika: key 0xffe0b3 (matahari), bounce
// 0xaebfff (langit), hemisphere 0x9fc8ff/0x8a7a5a — bedanya hanya intensitas
// & posisi (siang), dan tiap style punya cabang `day` untuk menyesuaikan.
// Semua tekstur dilukis kode (canvas), tanpa aset.
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
// fasad gedung: jendela grid + toko di lantai dasar (papan nama + awning + etalase)
function facadeTex(base, signText, signBg, signFg, floors = 4, cols = 4) {
  return canvasTex(256, 512, g => {
    g.fillStyle = base; g.fillRect(0, 0, 256, 512);
    // jendela lantai atas
    const ww = 256 / cols, wh = (512 - 130) / floors;
    for (let r = 0; r < floors; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * ww + 10, y = 14 + r * wh + 10, w = ww - 20, h = wh - 22;
        const lit = Math.random() < 0.18;
        g.fillStyle = lit ? '#ffca6a' : '#2a3a55';
        g.fillRect(x, y, w, h);
        g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x, y, w, 4);
        g.strokeStyle = '#f5f0e6'; g.lineWidth = 3; g.strokeRect(x, y, w, h);
        g.beginPath(); g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y + h); g.stroke();
      }
    }
    // toko lantai dasar: papan nama
    const sy = 512 - 130;
    g.fillStyle = signBg; g.fillRect(0, sy, 256, 46);
    g.font = 'bold 30px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = signFg; g.fillText(signText, 128, sy + 24);
    // awning garis-garis
    for (let x = 0; x < 256; x += 32) {
      g.fillStyle = (x / 32) % 2 ? '#f5f0e6' : signBg;
      g.fillRect(x, sy + 46, 32, 22);
    }
    // etalase kaca + pintu
    g.fillStyle = '#3a4a63'; g.fillRect(12, sy + 74, 150, 52);
    g.fillStyle = 'rgba(255,210,120,0.85)'; g.fillRect(20, sy + 80, 134, 40);
    g.fillStyle = '#5a4632'; g.fillRect(176, sy + 74, 66, 52);
    g.fillStyle = '#c9a227'; g.beginPath(); g.arc(196, sy + 100, 4, 0, Math.PI * 2); g.fill();
  });
}
function vendingTex() {
  return canvasTex(128, 256, g => {
    g.fillStyle = '#2e6fc2'; g.fillRect(0, 0, 128, 256);
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

// ---------- bangun kota ----------
export function buildKota(scene) {
  // jalan aspal (x -3.5..3.5, z -12..10) + trotoar (x ±3.5..6)
  const road = new THREE.Mesh(new THREE.PlaneGeometry(7, 22), std(asphaltTex(), { roughness: 0.9 }));
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0, -1);
  road.receiveShadow = true; scene.add(road);
  const walkTex = sidewalkTex();
  [-1, 1].forEach(s => {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 22), std(walkTex, { roughness: 0.95 }));
    w.rotation.x = -Math.PI / 2; w.position.set(s * 4.75, 0.02, -1);
    w.receiveShadow = true; scene.add(w);
    // trotoar pinggir (curb)
    scene.add(box(0.18, 0.14, 22, std(null, { color: 0x8a867e }), s * 3.55, 0.07, -1));
  });

  // zebra cross di z=0 (Najmi berdiri di garis tengah)
  const zebraM = std(null, { color: 0xf2efe6, roughness: 0.85 });
  [-2.4, -1.2, 0, 1.2, 2.4].forEach(x => {
    const bar = box(0.7, 0.02, 3.0, zebraM, x, 0.015, 0);
    bar.castShadow = false; scene.add(bar);
  });
  // garis tengah kuning (putus-putus, di luar zebra)
  const dashM = std(null, { color: 0xffd23f, roughness: 0.85 });
  [-9.5, -7, -4.5, 4.5, 7, 9.5].forEach(z => {
    const d = box(0.15, 0.02, 1.2, dashM, 0, 0.015, z);
    d.castShadow = false; scene.add(d);
  });

  // gedung: helper — fasad hanya di sisi menghadap jalan
  function building(w, h, d, tex, baseColor, faceIdx, x, z) {
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
  const fRamen = facadeTex('#b8a88e', 'RAMEN', '#c22e2e', '#ffe9a8', 4, 4);
  const fBuku = facadeTex('#8fa3b8', 'TOKO BUKU', '#2e5a8a', '#e8f2ff', 5, 4);
  const fWarung = facadeTex('#a8b08a', 'WARUNG', '#3a6b35', '#ffe9a8', 3, 4);
  const fKafe = facadeTex('#c2a184', 'KAFE', '#6b4a2f', '#ffe9a8', 4, 3);
  const fTinggi = facadeTex('#9a8fa8', 'HOTEL', '#4a3a6b', '#e8dcff', 6, 5);
  // kiri (menghadap +x -> face idx 0)
  building(4.5, 5.5, 4, fRamen, 0xb8a88e, 0, -6.2, -6.5);
  building(4.5, 7, 4, fBuku, 0x8fa3b8, 0, -6.2, -1.5);
  building(4.5, 4.5, 4, fWarung, 0xa8b08a, 0, -6.2, 3.5);
  // kanan (menghadap -x -> face idx 1)
  building(4.5, 6, 4, fKafe, 0xc2a184, 1, 6.2, -5.5);
  building(4.5, 5, 4, fRamen, 0xb8a88e, 1, 6.2, -0.5);
  building(4.5, 8, 4, fBuku, 0x8fa3b8, 1, 6.2, 4.5);
  // belakang, menutup ujung jalan (menghadap +z -> face idx 4) — lebih
  // rendah & lebih jauh supaya langit + awan kelihatan di atasnya
  building(16, 6, 4, fTinggi, 0x9a8fa8, 4, 0, -17);

  // pohon sakura di trotoar
  function sakuraTree(x, z, s = 1) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.11 * s, 0.15 * s, 1.7 * s, 8),
      std(null, { color: 0x5a3a28, roughness: 1 }));
    trunk.position.set(x, 0.85 * s, z); trunk.castShadow = true; scene.add(trunk);
    const canopyM = new THREE.MeshStandardMaterial({ color: 0xf2a0c0, roughness: 0.9, flatShading: true });
    [[0, 2.3, 0, 0.95], [0.55, 2.0, 0.2, 0.7], [-0.5, 2.05, -0.15, 0.65]].forEach(([dx, dy, dz, r]) => {
      const c = new THREE.Mesh(new THREE.SphereGeometry(r * s, 10, 8), canopyM);
      c.position.set(x + dx * s, dy * s, z + dz * s); c.castShadow = true; scene.add(c);
    });
  }
  sakuraTree(-4.4, -1.5, 1.1);
  sakuraTree(4.4, -4.5, 1);
  sakuraTree(-4.4, -8.5, 0.9);
  // kelopak sakura melayang (points statis)
  const N = 80, pp = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pp[i * 3] = (Math.random() - 0.5) * 12;
    pp[i * 3 + 1] = 0.5 + Math.random() * 3.5;
    pp[i * 3 + 2] = -8 + Math.random() * 12;
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  const petalTex = canvasTex(32, 32, ctx => {
    const g = ctx.createRadialGradient(16, 16, 1, 16, 16, 15);
    g.addColorStop(0, 'rgba(255,190,215,1)');
    g.addColorStop(1, 'rgba(255,190,215,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 32, 32);
  });
  const petals = new THREE.Points(pg, new THREE.PointsMaterial({
    size: 0.14, map: petalTex, transparent: true, opacity: 0.85,
    color: 0xffb6d5, depthWrite: false, sizeAttenuation: true,
  }));
  scene.add(petals);

  // mobil parkir (kiri merah, kanan biru muda)
  function car(color, x, z, ry) {
    const g = new THREE.Group();
    const bodyM = std(null, { color, roughness: 0.4, metalness: 0.3 });
    const body = box(1.7, 0.55, 3.2, bodyM, 0, 0.45, 0); g.add(body);
    const cabin = box(1.5, 0.5, 1.6, std(null, { color: 0x2a3a55, roughness: 0.2, metalness: 0.5 }), 0, 0.95, -0.2); g.add(cabin);
    const wheelM = std(null, { color: 0x1a1a1a, roughness: 0.9 });
    [[-0.8, 1.05], [0.8, 1.05], [-0.8, -1.05], [0.8, -1.05]].forEach(([wx, wz]) => {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 12), wheelM);
      w.rotation.z = Math.PI / 2; w.position.set(wx, 0.32, wz); w.castShadow = true; g.add(w);
    });
    const lampM = new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffe9a8, emissiveIntensity: 0.4 });
    [-0.55, 0.55].forEach(hx => {
      const hl = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), lampM);
      hl.position.set(hx, 0.5, 1.62); g.add(hl);
    });
    g.position.set(x, 0, z); g.rotation.y = ry;
    scene.add(g);
    return g;
  }
  car(0xc22e2e, -2.2, -4.5, 0);
  car(0x6fb3d8, 2.2, 3.5, Math.PI);

  // lampu lalu lintas di sudut zebra (hijau menyala)
  const tlPole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 3.2, 8), std(null, { color: 0x2e2e33 }));
  tlPole.position.set(3.7, 1.6, 1.6); tlPole.castShadow = true; scene.add(tlPole);
  scene.add(box(1.0, 0.08, 0.08, std(null, { color: 0x2e2e33 }), 3.25, 3.1, 1.6));
  const tlBox = box(0.35, 0.95, 0.35, std(null, { color: 0x1c1c22 }), 2.8, 2.85, 1.6);
  scene.add(tlBox);
  const tlColors = [0x882222, 0x886622, 0x22cc66];
  const tlEmis = [0, 0, 0.9];
  tlColors.forEach((c, i) => {
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8),
      new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: tlEmis[i] }));
    lamp.position.set(2.8, 3.15 - i * 0.3, 1.79); scene.add(lamp);
  });

  // halte bus (kiri) + mesin penjual (kanan, di depan gedung)
  const busPole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 8), std(null, { color: 0x2e5a8a }));
  busPole.position.set(-3.9, 1.2, 2.8); busPole.castShadow = true; scene.add(busPole);
  const busSign = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6),
    new THREE.MeshStandardMaterial({ map: canvasTex(128, 128, g => {
      g.fillStyle = '#2e5a8a'; g.fillRect(0, 0, 128, 128);
      g.fillStyle = '#fff'; g.font = 'bold 44px sans-serif'; g.textAlign = 'center';
      g.fillText('BUS', 64, 78);
    }), roughness: 0.6 }));
  busSign.position.set(-3.9, 2.5, 2.8); scene.add(busSign);
  const vend = box(0.9, 1.9, 0.7, new THREE.MeshStandardMaterial({
    map: vendingTex(), emissive: 0xffffff, emissiveMap: vendingTex(), emissiveIntensity: 0.25, roughness: 0.5,
  }), 5.9, 0.95, 0.8);
  scene.add(vend);

  // tiang listrik + kabel melengkung di atas jalan
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 5.5, 8), std(null, { color: 0x3a2e24 }));
  pole.position.set(4.6, 2.75, -3); pole.castShadow = true; scene.add(pole);
  function wire(z, y) {
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-5.5, y + 0.3, z),
      new THREE.Vector3(0, y - 0.6, z),
      new THREE.Vector3(5.5, y + 0.3, z));
    const w = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.02, 6), std(null, { color: 0x14100c }));
    w.castShadow = true; scene.add(w);
  }
  wire(-3, 5.2); wire(-6.5, 5.4);

  // awan (putih, tanpa fog supaya tetap terang)
  const cloudM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true });
  cloudM.fog = false;
  [[-8, 10.5, -15, 2.2], [2, 11.5, -16, 2.8], [9, 10, -14, 1.8], [-2, 11, -17, 2.4]].forEach(([x, y, z, r]) => {
    const c = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), cloudM);
    c.scale.y = 0.38; c.position.set(x, y, z); scene.add(c);
  });

  // lampu: palet hex SAMA dengan set lumbung/gang (key 0xffe0b3, bounce 0xaebfff)
  scene.add(new THREE.HemisphereLight(0x9fc8ff, 0x8a7a5a, 1.1));
  const sun = new THREE.DirectionalLight(0xffe0b3, 2.0);
  sun.position.set(4, 10, 6); sun.castShadow = true; // lebih frontal + tinggi: fasad menghadap kamera ikut terang
  sun.shadow.camera.left = -12; sun.shadow.camera.right = 12;
  sun.shadow.camera.top = 12; sun.shadow.camera.bottom = -12;
  sun.shadow.mapSize.set(2048, 2048);
  scene.add(sun);
  const bounce = new THREE.DirectionalLight(0xaebfff, 0.9);
  bounce.position.set(-4, 5, -3); scene.add(bounce);
}
