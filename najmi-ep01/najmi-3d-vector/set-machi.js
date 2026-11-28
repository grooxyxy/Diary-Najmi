// Set MACHI (kota Jepang sore hari) — latar khas style SAKURA.
// Dipakai kalau URL punya ?set=machi (biasanya bareng ?day=1).
// Jalan desa Jepang sepanjang sumbu z, di ujungnya ada PERLINTASAN KERETA:
// kereta 3 gerbong melintas horizontal di belakang Najmi, stasiun kayu
// "さくら駅" di kiri, rumah machiya, pohon sakura, pegunungan di kejauhan.
// Palet lampu memakai hex yang SAMA dengan set lain (key 0xffe0b3, bounce
// 0xaebfff) supaya style sakura (varian siang) jalan tanpa perubahan.
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
function asphaltTex() {
  return canvasTex(256, 256, g => {
    g.fillStyle = '#43464e'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1400; i++) {
      g.fillStyle = `rgba(${56 + Math.random() * 42 | 0},${58 + Math.random() * 42 | 0},${64 + Math.random() * 42 | 0},0.5)`;
      g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
  }, [2, 6]);
}
function woodTex() {
  return canvasTex(256, 256, g => {
    g.fillStyle = '#8a6b4a'; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = 'rgba(60,40,22,0.6)'; g.lineWidth = 2;
    for (let x = 0; x <= 256; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); }
    for (let i = 0; i < 300; i++) {
      g.fillStyle = `rgba(90,60,35,${0.2 + Math.random() * 0.3})`;
      g.fillRect(Math.random() * 256, Math.random() * 256, 3, 1);
    }
  });
}
function stationSignTex() {
  return canvasTex(512, 96, g => {
    g.fillStyle = '#1e3a5f'; g.fillRect(0, 0, 512, 96);
    g.fillStyle = '#fff'; g.font = 'bold 52px sans-serif'; g.textAlign = 'center';
    g.fillText('さくら駅', 190, 64);
    g.font = 'bold 34px sans-serif'; g.fillStyle = '#ffd23f';
    g.fillText('SAKURA', 420, 62);
  });
}

export function buildMachi(scene) {
  // kabut lebih jauh dari default siang (12,30) supaya pegunungan di
  // z=-19..-21 tetap kelihatan, tidak hilang tertelan kabut.
  scene.fog = new THREE.Fog(0x9fc8e8, 14, 45);
  // jalan (x -2.5..2.5, z -7..10) + trotoar + tanah stasiun di seberang rel
  const road = new THREE.Mesh(new THREE.PlaneGeometry(5, 17), std(asphaltTex(), { roughness: 0.9 }));
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0, 1.5);
  road.receiveShadow = true; scene.add(road);
  [-1, 1].forEach(s => {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(2, 17), std(null, { color: 0x9a968c, roughness: 0.95 }));
    w.rotation.x = -Math.PI / 2; w.position.set(s * 3.5, 0.02, 1.5);
    w.receiveShadow = true; scene.add(w);
  });
  const stationGround = new THREE.Mesh(new THREE.PlaneGeometry(20, 8), std(null, { color: 0x8f8b80, roughness: 0.95 }));
  stationGround.rotation.x = -Math.PI / 2; stationGround.position.set(0, 0.01, -11);
  stationGround.receiveShadow = true; scene.add(stationGround);

  // ---- rel + kereta melintas (sepanjang x, di z=-11) ----
  const railM = std(null, { color: 0x4a4a52, roughness: 0.4, metalness: 0.7 });
  [-11.7, -10.3].forEach(z => scene.add(box(20, 0.06, 0.12, railM, 0, 0.05, z)));
  const sleeperM = std(null, { color: 0x3a2a1a, roughness: 1 });
  for (let x = -9.5; x <= 9.5; x += 0.7) scene.add(box(0.28, 0.05, 2.0, sleeperM, x, 0.03, -11));
  // kereta 2 gerbong (krem + garis merah), jendela menghadap kamera (+z)
  // — 2 gerbong saja supaya stasiun & gunung di belakangnya tetap kelihatan
  function trainCar(cx) {
    const g = new THREE.Group();
    const body = box(3.2, 2.1, 1.8, std(null, { color: 0xf5efe2, roughness: 0.5 }), 0, 1.35, 0); g.add(body);
    g.add(box(3.24, 0.3, 1.84, std(null, { color: 0xc22e2e, roughness: 0.5 }), 0, 0.95, 0));
    g.add(box(3.24, 0.18, 1.84, std(null, { color: 0x5a5a62, roughness: 0.6 }), 0, 2.45, 0));
    const winM = std(null, { color: 0x2a3a55, roughness: 0.2, metalness: 0.4 });
    [-1.1, 0, 1.1].forEach(wx => g.add(box(0.85, 0.75, 0.06, winM, wx, 1.7, 0.92)));
    g.add(box(0.6, 1.5, 0.06, std(null, { color: 0x8a7a6a }), 1.45, 1.15, 0.92));
    g.position.set(cx, 0, -11);
    scene.add(g);
    return g;
  }
  trainCar(-1.7); trainCar(1.7);
  // rambu perlintasan: tiang + lampu merah + tanda silang (crossbuck)
  [-1, 1].forEach(s => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.6, 8), std(null, { color: 0x2e2e33 }));
    pole.position.set(s * 2.9, 1.3, -6.6); pole.castShadow = true; scene.add(pole);
    const lampM = new THREE.MeshStandardMaterial({ color: 0xcc2222, emissive: 0xcc2222, emissiveIntensity: 1.2 });
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), lampM);
    lamp.position.set(s * 2.9, 2.5, -6.6); scene.add(lamp);
    const crossM = std(null, { color: 0xf5f0e6 });
    const c1 = box(0.7, 0.12, 0.05, crossM, s * 2.9, 2.15, -6.6); c1.rotation.z = 0.7; scene.add(c1);
    const c2 = box(0.7, 0.12, 0.05, crossM, s * 2.9, 2.15, -6.6); c2.rotation.z = -0.7; scene.add(c2);
  });

  // ---- stasiun kayu "さくら駅" (kiri, di seberang rel) ----
  const st = new THREE.Group();
  st.add(box(4.2, 2.8, 3, std(woodTex()), 0, 1.4, 0));
  const roofL = box(4.6, 0.14, 2.0, std(null, { color: 0x3a4a5a }), -1.0, 3.2, 0); roofL.rotation.z = 0.5; st.add(roofL);
  const roofR = box(4.6, 0.14, 2.0, std(null, { color: 0x3a4a5a }), 1.0, 3.2, 0); roofR.rotation.z = -0.5; st.add(roofR);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.64),
    new THREE.MeshStandardMaterial({ map: stationSignTex(), roughness: 0.6 }));
  sign.position.set(0, 2.3, 1.52); st.add(sign);
  const clock = new THREE.Mesh(new THREE.CircleGeometry(0.32, 24),
    new THREE.MeshStandardMaterial({ color: 0xf5f0e6, roughness: 0.5 }));
  clock.position.set(0, 3.0, 1.52); st.add(clock);
  const handM = std(null, { color: 0x222222 });
  const h1 = box(0.04, 0.22, 0.02, handM, 0, 3.08, 1.53); h1.rotation.z = -0.6; st.add(h1);
  const h2 = box(0.04, 0.16, 0.02, handM, 0.05, 3.0, 1.53); h2.rotation.z = 1.2; st.add(h2);
  st.position.set(-6.5, 0, -11);
  scene.add(st);
  // papan nama stasiun di tepi peron (menghadap kamera) — gedung stasiun
  // sebagian tertutup kereta, jadi namanya dipajang sendiri di sini
  const signPost = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 2.2, 8), std(null, { color: 0x2e2e33 }));
  signPost.position.set(-3.6, 1.1, -9.5); signPost.castShadow = true; scene.add(signPost);
  const signBoard = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.34),
    new THREE.MeshStandardMaterial({ map: stationSignTex(), roughness: 0.6 }));
  signBoard.position.set(-3.6, 2.2, -9.5); scene.add(signBoard);
  // peron di samping rel
  scene.add(box(9, 0.3, 1.6, std(null, { color: 0x9a968c }), 0, 0.15, -9.5));

  // ---- rumah machiya (kiri & kanan) ----
  function machiya(x, z, base) {
    const g = new THREE.Group();
    g.add(box(3.2, 2.6, 3, std(woodTex(), { color: base }), 0, 1.3, 0));
    const rL = box(3.6, 0.14, 2.1, std(null, { color: 0x2e3a4a }), -0.85, 2.95, 0); rL.rotation.z = 0.45; g.add(rL);
    const rR = box(3.6, 0.14, 2.1, std(null, { color: 0x2e3a4a }), 0.85, 2.95, 0); rR.rotation.z = -0.45; g.add(rR);
    const winM = std(null, { color: 0x3a4a63, roughness: 0.3 });
    g.add(box(0.9, 0.9, 0.06, winM, -0.7, 1.7, 1.52));
    g.add(box(0.9, 0.9, 0.06, winM, 0.7, 1.7, 1.52));
    g.add(box(0.8, 1.6, 0.06, std(null, { color: 0x5a4632 }), 0, 0.8, 1.52));
    g.position.set(x, 0, z);
    scene.add(g);
    return g;
  }
  machiya(-4.2, -2, 0xffffff);
  machiya(4.2, -3, 0xf5e6d0);

  // ---- pohon sakura + kelopak ----
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
  sakuraTree(-4.2, -6.5, 1.0);
  sakuraTree(4.2, -6.5, 0.95);
  const N = 90, pp = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pp[i * 3] = (Math.random() - 0.5) * 12;
    pp[i * 3 + 1] = 0.5 + Math.random() * 3.5;
    pp[i * 3 + 2] = -9 + Math.random() * 13;
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  const petalTex = canvasTex(32, 32, ctx => {
    const g = ctx.createRadialGradient(16, 16, 1, 16, 16, 15);
    g.addColorStop(0, 'rgba(255,190,215,1)');
    g.addColorStop(1, 'rgba(255,190,215,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 32, 32);
  });
  scene.add(new THREE.Points(pg, new THREE.PointsMaterial({
    size: 0.14, map: petalTex, transparent: true, opacity: 0.85,
    color: 0xffb6d5, depthWrite: false, sizeAttenuation: true,
  })));

  // ---- sepeda listrik terparkir di dekat stasiun ----
  (function eBike() {
    const g = new THREE.Group();
    const frameM = std(null, { color: 0x2e7d6b, roughness: 0.4, metalness: 0.4 });
    const wheelM = std(null, { color: 0x1a1a1a, roughness: 0.9 });
    [-0.55, 0.55].forEach(wz => {
      const w = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.035, 8, 20), wheelM);
      w.position.set(0, 0.32, wz); g.add(w);
    });
    function tube(x1, y1, z1, x2, y2, z2, r = 0.03) {
      const a = new THREE.Vector3(x1, y1, z1), b = new THREE.Vector3(x2, y2, z2);
      const len = a.distanceTo(b);
      const t = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 6), frameM);
      t.position.copy(a).lerp(b, 0.5);
      t.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      t.castShadow = true; g.add(t);
    }
    tube(0, 0.32, -0.55, 0, 0.75, -0.15); // garpu depan miring
    tube(0, 0.75, -0.15, 0, 0.78, 0.35); // top tube
    tube(0, 0.78, 0.35, 0, 0.32, 0.55);  // seat stay
    tube(0, 0.75, -0.15, 0, 0.32, 0.1);  // down tube
    tube(0, 0.9, -0.2, 0, 0.75, -0.15);  // stang
    g.add(box(0.3, 0.04, 0.22, std(null, { color: 0x3a2a1a }), 0, 0.86, 0.42)); // sadel
    g.add(box(0.05, 0.3, 0.4, std(null, { color: 0x8a6b4a }), 0, 0.6, -0.62)); // keranjang depan
    g.position.set(-3.1, 0, -0.5); g.rotation.y = 0.4;
    scene.add(g);
  })();

  // ---- kucing oren berbaring di tembok batu ----
  scene.add(box(1.8, 0.5, 0.45, std(null, { color: 0x8f8b80 }), 3.3, 0.25, -2));
  (function cat() {
    const g = new THREE.Group();
    const fur = std(null, { color: 0xe8963c, roughness: 0.9 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), fur);
    body.scale.set(1.5, 0.65, 0.7); body.position.set(0, 0.62, 0); body.castShadow = true; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), fur);
    head.position.set(0.42, 0.72, 0); head.castShadow = true; g.add(head);
    [-0.08, 0.08].forEach(dx => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.12, 4), fur);
      ear.position.set(0.42 + dx, 0.88, 0); g.add(ear);
    });
    const tail = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.045, 6, 12, Math.PI * 1.2), fur);
    tail.position.set(-0.42, 0.62, 0); tail.rotation.z = 0.6; g.add(tail);
    g.position.set(3.3, 0.5, -2);
    scene.add(g);
  })();

  // ---- tiang listrik + kabel ----
  [-1, 1].forEach(s => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 4.5, 8), std(null, { color: 0x3a2e24 }));
    pole.position.set(s * 4.6, 2.25, -5); pole.castShadow = true; scene.add(pole);
  });
  const wireCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-4.6, 4.2, -5), new THREE.Vector3(0, 3.4, -5), new THREE.Vector3(4.6, 4.2, -5));
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(wireCurve, 20, 0.02, 6), std(null, { color: 0x14100c })));

  // ---- pegunungan di kejauhan (fog membuatnya pudar) ----
  function mountain(x, z, r, h, snow) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 8),
      new THREE.MeshStandardMaterial({ color: 0x7a8aa8, roughness: 1, flatShading: true }));
    m.position.set(x, h / 2 - 0.5, z); scene.add(m);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(r * snow, h * snow, 8),
      new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 1, flatShading: true }));
    cap.position.set(x, h - (h * snow) / 2 - 0.5, z); scene.add(cap);
  }
  mountain(-11, -19, 8, 12, 0.35);
  mountain(0, -21, 10, 15, 0.3);
  mountain(11, -19, 7, 10, 0.4);

  // ---- awan ----
  const cloudM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true });
  cloudM.fog = false;
  [[-8, 11, -16, 2.2], [3, 12, -18, 2.8], [9, 10.5, -15, 1.8]].forEach(([x, y, z, r]) => {
    const c = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), cloudM);
    c.scale.y = 0.38; c.position.set(x, y, z); scene.add(c);
  });

  // lampu: palet hex SAMA dengan set lain (key 0xffe0b3 matahari sore)
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
