// Set LAUT (tebing laut siang) — latar khas style LEVIATHAN.
// Dipakai kalau URL punya ?set=laut (biasanya bareng ?day=1).
// Najmi berdiri di atas tebing batu menghadap laut: paus melompat, kapal
// kontainer di cakrawala, dan siluet LEVIATHAN — monster laut raksasa —
// menjulang di kejauhan, mercusuar di kanan, camar di langit. Efek kuas
// Kuwahara leviathan membuat latar ini terasa seperti lukisan.
// Palet lampu memakai hex yang SAMA dengan set lain (key 0xffe0b3, bounce
// 0xaebfff) supaya style leviathan (varian siang) jalan tanpa perubahan.
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
function seaTex() {
  return canvasTex(512, 512, g => {
    const grad = g.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#3a6ea8'); grad.addColorStop(0.6, '#2a5a90'); grad.addColorStop(1, '#1e4a7a');
    g.fillStyle = grad; g.fillRect(0, 0, 512, 512);
    g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 3;
    for (let i = 0; i < 26; i++) {
      const y = Math.random() * 512, x = Math.random() * 512, len = 40 + Math.random() * 90;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + len / 2, y - 8, x + len, y);
      g.stroke();
    }
    g.fillStyle = 'rgba(255,255,255,0.35)';
    for (let i = 0; i < 200; i++) g.fillRect(Math.random() * 512, Math.random() * 512, 3, 2);
  }, [5, 4]);
}
function rockTex() {
  return canvasTex(256, 256, g => {
    g.fillStyle = '#7a7268'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 700; i++) {
      g.fillStyle = `rgba(${90 + Math.random() * 50 | 0},${82 + Math.random() * 46 | 0},${70 + Math.random() * 40 | 0},0.6)`;
      g.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
    }
    g.strokeStyle = 'rgba(50,44,38,0.8)'; g.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      g.beginPath();
      let x = Math.random() * 256, y = Math.random() * 256;
      g.moveTo(x, y);
      for (let s = 0; s < 4; s++) { x += (Math.random() - 0.5) * 60; y += Math.random() * 40; g.lineTo(x, y); }
      g.stroke();
    }
  });
}
function stripeTex() {
  return canvasTex(64, 128, g => {
    for (let y = 0; y < 128; y += 32) {
      g.fillStyle = (y / 32) % 2 ? '#c22e2e' : '#f5f0e6';
      g.fillRect(0, y, 64, 32);
    }
  });
}

export function buildLaut(scene) {
  // tebing batu tempat Najmi berdiri (puncak y=0, membentang z -2..+7)
  const cliff = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 5.5, 1.6, 12),
    new THREE.MeshStandardMaterial({ map: rockTex(), roughness: 1, flatShading: true }));
  cliff.position.set(0, -0.8, 2.5); cliff.receiveShadow = true; cliff.castShadow = true; scene.add(cliff);
  // rumput tipis di atas tebing
  const grass = new THREE.Mesh(new THREE.CircleGeometry(4.3, 12),
    std(null, { color: 0x4a6a3a, roughness: 1 }));
  grass.rotation.x = -Math.PI / 2; grass.position.set(0, 0.01, 2.5); grass.receiveShadow = true; scene.add(grass);
  // batu-batu kecil di tepi tebing
  const rockM = new THREE.MeshStandardMaterial({ color: 0x6a6258, roughness: 1, flatShading: true });
  [[-3.4, -0.5], [3.6, 0.5], [-2.2, -1.4], [2.6, -1.2]].forEach(([x, z], i) => {
    const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35 + (i % 2) * 0.2, 0), rockM);
    r.position.set(x, 0.25, z + 2.5); r.castShadow = true; scene.add(r);
  });

  // laut (y=-0.8, dari tepi tebing sampai cakrawala)
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(60, 30),
    new THREE.MeshStandardMaterial({ map: seaTex(), roughness: 0.35, metalness: 0.25 }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(0, -0.8, -14);
  sea.receiveShadow = true; scene.add(sea);
  // buih ombak di kaki tebing
  const foam = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.2),
    new THREE.MeshStandardMaterial({ color: 0xf5f5f0, roughness: 0.8, transparent: true, opacity: 0.7 }));
  foam.rotation.x = -Math.PI / 2; foam.position.set(0, -0.75, -1.6); scene.add(foam);

  // ---- paus melompat (kiri) ----
  (function whale() {
    const g = new THREE.Group();
    const bodyM = std(null, { color: 0x6a8ab0, roughness: 0.7, flatShading: true });
    const body = new THREE.Mesh(new THREE.SphereGeometry(1.6, 14, 10), bodyM);
    body.scale.set(0.85, 0.85, 1.7); body.castShadow = true; g.add(body);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(1.35, 12, 8),
      std(null, { color: 0xe8e8e0, roughness: 0.8, flatShading: true }));
    belly.scale.set(0.7, 0.6, 1.6); belly.position.set(0, -0.45, 0.1); g.add(belly);
    const flukeM = bodyM;
    [-1, 1].forEach(s => {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.4, 6), flukeM);
      f.scale.set(1, 1, 0.35); f.rotation.z = s * 0.9; f.rotation.x = -0.4;
      f.position.set(s * 0.55, -2.4, -0.3); g.add(f);
    });
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.1, 6), flukeM);
    fin.scale.set(1, 1, 0.3); fin.rotation.z = 1.1; fin.position.set(0.9, -0.3, 0.4); g.add(fin);
    // cipratan air
    const splashM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, transparent: true, opacity: 0.85 });
    const splash = new THREE.Mesh(new THREE.ConeGeometry(1.1, 1.6, 8), splashM);
    splash.position.set(0, -2.9, -0.2); g.add(splash);
    for (let i = 0; i < 6; i++) {
      const drop = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 5), splashM);
      drop.position.set((Math.random() - 0.5) * 2.4, -2.2 + Math.random() * 0.8, (Math.random() - 0.5) * 1.2);
      g.add(drop);
    }
    // paus dipindah ke kanan-tengah (x +2.5) supaya tidak tertutup massa
    // leviathan di kiri; badan diputar menyamping ke arah berlawanan
    // supaya profilnya kebaca dari kamera depan.
    g.position.set(2.5, 1.2, -11);
    g.rotation.set(-0.5, -0.6, 0.2);
    g.scale.setScalar(0.85);
    scene.add(g);
  })();

  // ---- kapal kontainer (kanan, di cakrawala) ----
  (function ship() {
    const g = new THREE.Group();
    g.add(box(6, 0.9, 1.6, std(null, { color: 0x8a2e2e, roughness: 0.6 }), 0, 0.45, 0));
    const contCols = [0x2e6fc2, 0xc22e2e, 0x3a8a3a, 0xd8a022, 0x6a4a9a];
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 4; i++) {
        g.add(box(1.3, 0.7, 1.4, std(null, { color: contCols[(i + row * 2) % 5], roughness: 0.7 }), -2.1 + i * 1.4, 1.25 + row * 0.72, 0));
      }
    }
    g.add(box(1.0, 1.3, 1.2, std(null, { color: 0xf5f0e6, roughness: 0.6 }), 2.6, 1.5, 0));
    g.position.set(5.5, -0.8, -14);
    g.rotation.y = -0.15;
    scene.add(g);
  })();

  // ---- LEVIATHAN — monster laut raksasa di cakrawala ----
  (function leviathan() {
    const g = new THREE.Group();
    const skin = new THREE.MeshStandardMaterial({ color: 0x2e3a52, roughness: 0.9, flatShading: true });
    // 5 punuk yang menjulang dari laut membentuk huruf S
    const humps = [[-4.5, 0.6, 1.6], [-2.2, 1.4, 2.3], [0, 2.0, 2.6], [2.2, 1.5, 2.2], [4.2, 0.8, 1.7]];
    humps.forEach(([hx, hy, hr]) => {
      const h = new THREE.Mesh(new THREE.SphereGeometry(hr, 10, 8), skin);
      h.position.set(hx, hy - 0.8, 0); h.scale.y = 0.9; g.add(h);
    });
    // kepala: moncong panjang + rahang + mata merah menyala
    const head = new THREE.Group();
    const skull = new THREE.Mesh(new THREE.ConeGeometry(1.1, 3.2, 8), skin);
    skull.rotation.z = -1.1; skull.position.set(0.6, 0.8, 0); head.add(skull);
    head.add(box(1.8, 0.5, 0.9, skin, 1.6, 0.1, 0));
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff2222, emissiveIntensity: 1.0 }));
    eye.position.set(0.2, 1.3, 1.0); head.add(eye);
    const eye2 = eye.clone(); eye2.position.z = -1.0; head.add(eye2);
    head.position.set(5.6, 1.2, 0);
    head.rotation.z = 0.35;
    g.add(head);
    // sirip punggung
    for (let i = 0; i < 3; i++) {
      const fin = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.6, 4), skin);
      fin.position.set(-2.2 + i * 2.2, 3.6 - i * 0.2, 0);
      fin.rotation.z = -0.2; g.add(fin);
    }
    g.position.set(-6, -0.4, -13);
    g.rotation.y = 0.2;
    g.scale.setScalar(1.3); // lebih besar + lebih dekat supaya siluetnya kebaca
    scene.add(g);
  })();

  // ---- mercusuar di batu karang (kanan) ----
  (function lighthouse() {
    const g = new THREE.Group();
    const rock = new THREE.Mesh(new THREE.ConeGeometry(1.6, 1.4, 8), rockM);
    rock.position.set(0, 0.2, 0); g.add(rock);
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.55, 3.0, 12),
      new THREE.MeshStandardMaterial({ map: stripeTex(), roughness: 0.7 }));
    tower.position.set(0, 2.2, 0); tower.castShadow = true; g.add(tower);
    const lampRoom = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.6, 10),
      std(null, { color: 0x1c1c22 }));
    lampRoom.position.set(0, 3.9, 0); g.add(lampRoom);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xffe9a8, emissive: 0xffe9a8, emissiveIntensity: 1.6 }));
    lamp.position.set(0, 3.9, 0); g.add(lamp);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.5, 10), std(null, { color: 0x8a2e2e }));
    roof.position.set(0, 4.4, 0); g.add(roof);
    g.position.set(3.4, -0.8, -9);
    scene.add(g);
  })();

  // ---- camar + awan ----
  const gullM = std(null, { color: 0xffffff, roughness: 0.8 });
  [[-3, 5.5, -11], [1, 6, -13], [4, 5, -10], [-6, 6.5, -14], [6, 5.5, -12]].forEach(([x, y, z]) => {
    const gull = new THREE.Group();
    const w1 = box(0.5, 0.04, 0.08, gullM, -0.22, 0, 0); w1.rotation.z = 0.5; w1.castShadow = false; gull.add(w1);
    const w2 = box(0.5, 0.04, 0.08, gullM, 0.22, 0, 0); w2.rotation.z = -0.5; w2.castShadow = false; gull.add(w2);
    gull.position.set(x, y, z);
    scene.add(gull);
  });
  const cloudM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true });
  cloudM.fog = false;
  [[-9, 11, -17, 2.4], [2, 12.5, -19, 3.0], [10, 11, -16, 2.0]].forEach(([x, y, z, r]) => {
    const c = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), cloudM);
    c.scale.y = 0.38; c.position.set(x, y, z); scene.add(c);
  });

  // lampu: palet hex SAMA dengan set lain (key 0xffe0b3 matahari, bounce 0xaebfff)
  scene.add(new THREE.HemisphereLight(0x9fc8ff, 0x8a7a5a, 1.1));
  const sun = new THREE.DirectionalLight(0xffe0b3, 2.0);
  sun.position.set(4, 10, 6); sun.castShadow = true;
  sun.shadow.camera.left = -14; sun.shadow.camera.right = 14;
  sun.shadow.camera.top = 14; sun.shadow.camera.bottom = -14;
  sun.shadow.mapSize.set(2048, 2048);
  scene.add(sun);
  const bounce = new THREE.DirectionalLight(0xaebfff, 0.9);
  bounce.position.set(-4, 5, -3); scene.add(bounce);
}
