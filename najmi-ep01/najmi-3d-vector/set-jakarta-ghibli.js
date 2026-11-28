// Set Jakarta tepi sungai (Ciliwung) — latar kompleks untuk style ghibli.
// Dibangun dari nol (kode sendiri, semangat skill-skill ghibli-threejs —
// tanpa copy kode): sungai berliku + jembatan kayu di origin, kampung +
// masjid di tepi kiri, sawah berundak + padang bunga di tepi kanan,
// pohon puff (pisang, mangga, berbunga) + rumpun bambu, alang-alang/teratai,
// kupu-kupu. TANPA karakter. Origin (0,0,0) = jembatan / tikungan sungai.
// Kontrak lampu hex sama dengan set lain (matahari 0xffe0b3, bounce 0xaebfff,
// hemisphere 0x9fc8ff/0x8a7a5a) supaya converter style jalan.
// Semua tekstur dilukis di canvas via kode (tanpa aset gambar).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// --- helpers (pola set-machi.js / set-laut.js) ---
function canvasTex(w, h, draw, rx = 1, ry = 1) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
// std(map|warna, o): o.flag = 'ghibliFoliage' | 'ghibliBark' | 'ghibliGrass' | 'ghibliNoFleck'
function std(mapOrColor, o = {}) {
  const { flag, ...matOpts } = o;
  const params = { roughness: 0.9, metalness: 0, ...matOpts };
  if (mapOrColor && mapOrColor.isTexture) params.map = mapOrColor;
  else if (mapOrColor !== undefined) params.color = mapOrColor;
  const m = new THREE.MeshStandardMaterial(params);
  if (flag) m.userData[flag] = true;
  return m;
}
function box(w, h, d, m, x, y, z, ry = 0) {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  o.position.set(x, y, z); o.rotation.y = ry;
  o.castShadow = true; o.receiveShadow = true;
  return o;
}
// RNG seed tetap (deterministik — render yang sama diulang hasilnya sama)
let _seed = 20261127;
function srand() { _seed = (_seed * 1664525 + 1013904223) >>> 0; return _seed / 4294967296; }
function srange(a, b) { return a + (b - a) * srand(); }

// pita sungai mengikuti kurva (lebar tetap, y datar, UV sepanjang alur)
function buildRiverRibbon(curve, width, y, segs) {
  const pts = curve.getPoints(segs);
  const pos = [], uv = [], idx = [];
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i <= segs; i++) {
    const p = pts[i];
    const tan = curve.getTangent(i / segs);
    const side = new THREE.Vector3().crossVectors(up, tan).normalize();
    pos.push(p.x - side.x * width / 2, y, p.z - side.z * width / 2);
    pos.push(p.x + side.x * width / 2, y, p.z + side.z * width / 2);
    uv.push(0, (i / segs) * 8, 1, (i / segs) * 8);
    if (i < segs) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function buildJakartaGhibli(scene) {
  _seed = 20261127; // reset RNG — layout + tekstur deterministik di tiap panggilan
  // --- lampu (kontrak hex sama dengan set lain) ---
  const hemi = new THREE.HemisphereLight(0x9fc8ff, 0x8a7a5a, 1.1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe0b3, 2.0);
  sun.position.set(4, 10, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -18; sun.shadow.camera.right = 18;
  sun.shadow.camera.top = 18; sun.shadow.camera.bottom = -18;
  sun.shadow.camera.far = 40;
  scene.add(sun);
  const bounce = new THREE.DirectionalLight(0xaebfff, 0.9);
  bounce.position.set(-4, 5, -3);
  scene.add(bounce);

  // Kabut diperlebar supaya masjid + kampung + bukit di latar tetap
  // terbaca (kabut default siang 12-30 menelan latar sejauh 40).
  if (scene.fog) { scene.fog.near = 14; scene.fog.far = 45; }

  // --- alur sungai (Ciliwung): kurva S dari depan (x+2) ke belakang (x-3) ---
  const riverPts = [
    new THREE.Vector3(2.0, 0, 14), new THREE.Vector3(0.8, 0, 6),
    new THREE.Vector3(0.0, 0, 0), new THREE.Vector3(-1.0, 0, -6),
    new THREE.Vector3(-2.2, 0, -12), new THREE.Vector3(-3.0, 0, -18),
  ];
  const riverCurve = new THREE.CatmullRomCurve3(riverPts);
  const riverSamples = riverCurve.getPoints(48);

  // --- tanah: bidang 40x40 yang diturunkan membentuk lembah sungai ---
  const grassTex = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#6a9a4a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      const r = srand();
      g.fillStyle = r < 0.5 ? 'rgba(84,140,60,0.5)' : 'rgba(140,180,90,0.45)';
      g.beginPath(); g.arc(srand() * w, srand() * h, 4 + srand() * 22, 0, 7); g.fill();
    }
    for (let i = 0; i < 26; i++) { // bercak tanah kering
      g.fillStyle = 'rgba(150,120,70,0.35)';
      g.beginPath(); g.arc(srand() * w, srand() * h, 6 + srand() * 18, 0, 7); g.fill();
    }
  }, 5, 5);
  const groundGeo = new THREE.PlaneGeometry(40, 40, 48, 48);
  groundGeo.rotateX(-Math.PI / 2);
  const gp = groundGeo.attributes.position;
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i), z = gp.getZ(i);
    let dmin = 1e9;
    for (const p of riverSamples) {
      const dx = x - p.x, dz = z - p.z, d = dx * dx + dz * dz;
      if (d < dmin) dmin = d;
    }
    dmin = Math.sqrt(dmin);
    const channel = -0.7 * (1 - THREE.MathUtils.smoothstep(dmin, 0, 2.6));
    const rim = 0.5 * THREE.MathUtils.smoothstep(Math.max(Math.abs(x), Math.abs(z)), 14, 19);
    gp.setY(i, channel + rim);
  }
  groundGeo.computeVertexNormals();
  const ground = new THREE.Mesh(groundGeo, std(grassTex, { roughness: 1 }));
  ground.receiveShadow = true;
  scene.add(ground);

  // --- air sungai: jernih, dasar berpasir terlihat + garis arus putih ---
  const waterTex = canvasTex(256, 512, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, '#5aa8d0'); grad.addColorStop(0.5, '#2a7ab8'); grad.addColorStop(1, '#5aa8d0');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(220,200,150,0.35)'; // dasar berpasir di tengah (air jernih)
    g.fillRect(w * 0.3, 0, w * 0.4, h);
    for (let i = 0; i < 40; i++) { // batu di dasar
      g.fillStyle = 'rgba(120,110,90,0.5)';
      g.beginPath(); g.arc(w * (0.35 + srand() * 0.3), srand() * h, 2 + srand() * 5, 0, 7); g.fill();
    }
    g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 2; // garis arus
    for (let i = 0; i < 14; i++) {
      const x = srand() * w; g.beginPath(); g.moveTo(x, 0);
      g.bezierCurveTo(x + 12, h * 0.3, x - 12, h * 0.6, x + 6, h); g.stroke();
    }
    for (let i = 0; i < 60; i++) { // kilau
      g.fillStyle = 'rgba(255,255,255,0.7)';
      g.fillRect(srand() * w, srand() * h, 2, 2);
    }
  }, 1, 1);
  const water = new THREE.Mesh(
    buildRiverRibbon(riverCurve, 4.4, -0.08, 60),
    std(waterTex, { roughness: 0.25, metalness: 0.05, emissive: 0x2a7ab8, emissiveIntensity: 0.45 }),
  );
  water.receiveShadow = true;
  scene.add(water);

  // --- jembatan kayu melengkung di origin (focal point) ---
  const woodTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#8a5a30'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 30; i++) {
      g.strokeStyle = 'rgba(60,35,15,0.5)'; g.lineWidth = 1 + srand() * 2;
      const y = srand() * h;
      g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + 4, w * 0.7, y - 4, w, y); g.stroke();
    }
    g.strokeStyle = 'rgba(40,25,10,0.6)'; g.lineWidth = 3;
    for (let x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  });
  const woodMat = std(woodTex, { roughness: 0.85 });
  const woodDark = std(0x6a4526, { roughness: 0.9 });
  const bridge = new THREE.Group();
  const span = 3.2, archH = 0.75, deckW = 1.7;
  const archY = (x) => 0.15 + archH * Math.cos((x / span) * Math.PI / 2);
  const archSlope = (x) => -archH * (Math.PI / 2 / span) * Math.sin((x / span) * Math.PI / 2);
  for (let i = 0; i < 14; i++) {
    const x = -span + (i + 0.5) * (2 * span / 14);
    const plank = box(2 * span / 14 + 0.04, 0.09, deckW, woodMat, x, archY(x), 0);
    plank.rotation.z = Math.atan(archSlope(x));
    bridge.add(plank);
  }
  for (const side of [-1, 1]) { // rel melengkung + tiang rel
    const railPts = [];
    for (let i = 0; i <= 8; i++) {
      const x = -span + (i / 8) * 2 * span;
      railPts.push(new THREE.Vector3(x, archY(x) + 0.85, side * (deckW / 2 - 0.05)));
    }
    const rail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(railPts), 16, 0.05, 6), woodDark);
    rail.castShadow = true;
    bridge.add(rail);
    for (let i = 0; i <= 4; i++) {
      const x = -span + (i / 4) * 2 * span;
      bridge.add(box(0.09, 0.85, 0.09, woodDark, x, archY(x) + 0.42, side * (deckW / 2 - 0.05)));
    }
  }
  for (const sx of [-1.2, 1.2]) { // tiang penyangga di air
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 1.5, 8), woodDark);
    post.position.set(sx, -0.05, 0);
    post.castShadow = true;
    bridge.add(post);
  }
  scene.add(bridge);

  // --- kampung (tepi kiri): rumah berdinding plester + atap genteng/limas ---
  function makeHouse(w, d, h, wallCol, roofCol, roofType) {
    const g = new THREE.Group();
    const facadeTex = canvasTex(256, 256, (ctx, cw, ch) => {
      ctx.fillStyle = wallCol; ctx.fillRect(0, 0, cw, ch);
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      for (let i = 0; i < 24; i++) ctx.fillRect(srand() * cw, srand() * ch, 14 + srand() * 30, 4 + srand() * 8);
      ctx.fillStyle = '#6a4a2a'; ctx.fillRect(cw * 0.44, ch * 0.55, cw * 0.12, ch * 0.45); // pintu
      ctx.fillStyle = '#8a6a3a'; ctx.fillRect(cw * 0.44, ch * 0.55, cw * 0.12, ch * 0.06);
      for (const wx of [0.16, 0.72]) { // jendela hangat
        ctx.fillStyle = '#3a2a1a'; ctx.fillRect(cw * wx, ch * 0.3, cw * 0.14, ch * 0.22);
        ctx.fillStyle = '#ffd27a'; ctx.fillRect(cw * wx + 3, ch * 0.3 + 3, cw * 0.14 - 6, ch * 0.22 - 6);
        ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(cw * (wx + 0.07), ch * 0.3); ctx.lineTo(cw * (wx + 0.07), ch * 0.52); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cw * wx, ch * 0.41); ctx.lineTo(cw * (wx + 0.14), ch * 0.41); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(0, 0, cw, ch * 0.08); // lis atas
    });
    const plainMat = std(wallCol, { roughness: 0.95 });
    const facadeMat = std(facadeTex, { roughness: 0.95 });
    const walls = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
      [plainMat, plainMat, plainMat, plainMat, facadeMat, plainMat]);
    walls.position.y = h / 2;
    walls.castShadow = true; walls.receiveShadow = true;
    g.add(walls);
    const roofMat = std(roofCol, { roughness: 0.9 });
    if (roofType === 'gable') {
      const tri = new THREE.Shape();
      tri.moveTo(-w / 2 - 0.3, 0); tri.lineTo(w / 2 + 0.3, 0); tri.lineTo(0, h * 0.55); tri.closePath();
      const rg = new THREE.ExtrudeGeometry(tri, { depth: d + 0.6, bevelEnabled: false });
      rg.translate(0, 0, -(d + 0.6) / 2);
      const roof = new THREE.Mesh(rg, roofMat);
      roof.position.y = h; roof.castShadow = true; roof.receiveShadow = true;
      g.add(roof);
    } else {
      const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.72, h * 0.6, 4), roofMat);
      roof.position.y = h + h * 0.3;
      roof.rotation.y = Math.PI / 4;
      roof.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d));
      roof.castShadow = true; roof.receiveShadow = true;
      g.add(roof);
    }
    return g;
  }
  const houseDefs = [
    // x, z, w, d, h, warna dinding, warna atap, tipe, skala, rotY
    [-5.5, -2, 3.2, 2.8, 2.4, '#f2e2c2', '#b85a3a', 'gable', 1.0, 0.6],
    [-7.5, 2.5, 2.8, 2.6, 2.2, '#c2d8e8', '#7a4a30', 'hip', 0.95, 0.9],
    [-9, -6, 3.6, 3.0, 2.6, '#d8e8c2', '#b85a3a', 'gable', 1.1, 0.5],
    [-6.5, 5.5, 2.6, 2.4, 2.0, '#e8c2a2', '#5a3a2a', 'hip', 0.9, 1.1],
    [-11, 0, 3.0, 2.8, 2.4, '#f2e2c2', '#4a7a4a', 'gable', 1.0, 0.7],
  ];
  for (const [hx, hz, hw, hd, hh, wc, rc, rt, hs, ry] of houseDefs) {
    const house = makeHouse(hw, hd, hh, wc, rc, rt);
    house.position.set(hx, 0, hz);
    house.rotation.y = ry;
    house.scale.setScalar(hs);
    scene.add(house);
  }
  // lentera teras hangat (kantong hangat malam — converter ghibli menambah glow)
  const porchLight = new THREE.PointLight(0xffa63d, 1.5, 6);
  porchLight.position.set(-5.5, 2.2, -0.6);
  scene.add(porchLight);

  // --- masjid (tepi kiri, latar): kubah hijau + menara ---
  function archPath(ctx, x, y, w, h) {
    ctx.beginPath();
    ctx.moveTo(x, y + h); ctx.lineTo(x, y + w / 2);
    ctx.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0);
    ctx.lineTo(x + w, y + h); ctx.closePath();
  }
  const mosqueTex = canvasTex(256, 256, (ctx, cw, ch) => {
    ctx.fillStyle = '#f5efe0'; ctx.fillRect(0, 0, cw, ch);
    ctx.fillStyle = '#2a7a4a'; ctx.fillRect(0, 0, cw, ch * 0.07); // lis hijau
    for (const wx of [0.12, 0.42, 0.72]) { // jendela lengkung
      archPath(ctx, cw * wx, ch * 0.25, cw * 0.16, ch * 0.3);
      ctx.fillStyle = '#2a4a6a'; ctx.fill();
      ctx.fillStyle = '#ffd27a';
      archPath(ctx, cw * wx + 4, ch * 0.25 + 4, cw * 0.16 - 8, ch * 0.3 - 8); ctx.fill();
    }
    archPath(ctx, cw * 0.4, ch * 0.6, cw * 0.2, ch * 0.4); // pintu lengkung
    ctx.fillStyle = '#5a3a1a'; ctx.fill();
  });
  const mosque = new THREE.Group();
  const mosqueWalls = new THREE.Mesh(new THREE.BoxGeometry(4.5, 3, 4),
    [std('#f5efe0'), std('#f5efe0'), std('#f5efe0'), std('#f5efe0'), std(mosqueTex), std('#f5efe0')]);
  mosqueWalls.position.y = 1.5;
  mosqueWalls.castShadow = true; mosqueWalls.receiveShadow = true;
  mosque.add(mosqueWalls);
  const domeMat = std(0x2a7a4a, { roughness: 0.5, metalness: 0.1 });
  const mainDome = new THREE.Mesh(new THREE.SphereGeometry(1.5, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
  mainDome.position.y = 3; mainDome.castShadow = true;
  mosque.add(mainDome);
  const finial = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.7, 8), std(0xd8a83a, { roughness: 0.4, metalness: 0.6 }));
  finial.position.y = 4.8;
  mosque.add(finial);
  for (const sx of [-1.5, 1.5]) {
    const sd = new THREE.Mesh(new THREE.SphereGeometry(0.7, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
    sd.position.set(sx, 3, 1.2); sd.castShadow = true;
    mosque.add(sd);
  }
  const minaret = new THREE.Group(); // menara di sisi kanan masjid
  const minBody = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 6.5, 10), std('#f5efe0', { roughness: 0.9 }));
  minBody.position.y = 3.25; minBody.castShadow = true;
  minaret.add(minBody);
  const balcony = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.22, 10), std(0x2a7a4a, { roughness: 0.6 }));
  balcony.position.y = 4.6;
  minaret.add(balcony);
  const minDome = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
  minDome.position.y = 6.5;
  minaret.add(minDome);
  const minFin = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.5, 8), std(0xd8a83a, { roughness: 0.4, metalness: 0.6 }));
  minFin.position.y = 7.2;
  minaret.add(minFin);
  minaret.position.set(2.8, 0, 0.5);
  mosque.add(minaret);
  mosque.position.set(-8.5, 0, -12);
  mosque.rotation.y = 0.6;
  scene.add(mosque);
  const mosqueLight = new THREE.PointLight(0xffa63d, 1.2, 7);
  mosqueLight.position.set(-8.5, 2.0, -10.5);
  scene.add(mosqueLight);

  // --- pohon berkanopi puff (inti bola + kartu daun, origin lokal = pusat gumpalan
  //     sehingga aCenter default (0,0,0) benar untuk puff normals) ---
  function leafTexture(color, vein) {
    return canvasTex(64, 64, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.fillStyle = color;
      g.beginPath();
      g.moveTo(w / 2, 2);
      g.bezierCurveTo(w * 0.95, h * 0.3, w * 0.9, h * 0.8, w / 2, h - 2);
      g.bezierCurveTo(w * 0.1, h * 0.8, w * 0.05, h * 0.3, w / 2, 2);
      g.fill();
      g.strokeStyle = vein; g.lineWidth = 2;
      g.beginPath(); g.moveTo(w / 2, 4); g.lineTo(w / 2, h - 4); g.stroke();
    });
  }
  function makeBlobTree(cx, cy, cz, r, leafMat, coreMat, nCards) {
    const g = new THREE.Group();
    const coreGeo = new THREE.IcosahedronGeometry(1, 2);
    for (const [ox, oy, oz, cr] of [[0, 0, 0, r], [r * 0.55, r * 0.25, r * 0.2, r * 0.6], [-r * 0.5, r * 0.2, -r * 0.25, r * 0.55]]) {
      const core = new THREE.Mesh(coreGeo, coreMat);
      core.position.set(ox, oy, oz);
      core.scale.setScalar(cr);
      core.castShadow = true; core.receiveShadow = true;
      g.add(core);
    }
    const cardGeos = [];
    for (let i = 0; i < nCards; i++) {
      const card = new THREE.PlaneGeometry(0.35, 0.45);
      const theta = srand() * Math.PI * 2;
      const phi = Math.acos(2 * srand() - 1);
      const rr = r * (0.85 + srand() * 0.25);
      const px = rr * Math.sin(phi) * Math.cos(theta);
      const py = rr * Math.cos(phi) * 0.9 + r * 0.1;
      const pz = rr * Math.sin(phi) * Math.sin(theta);
      card.rotateX(srand() * Math.PI);
      card.rotateY(srand() * Math.PI);
      card.rotateZ(srand() * Math.PI);
      card.translate(px, py, pz);
      cardGeos.push(card);
    }
    const cards = new THREE.Mesh(mergeGeometries(cardGeos), leafMat);
    cards.castShadow = true;
    g.add(cards);
    g.position.set(cx, cy, cz);
    return g;
  }
  function makeTrunk(x, z, h, rTop, rBot) {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(rTop, rBot, h, 8),
      std(0x6a4a2a, { roughness: 0.95, flag: 'ghibliBark' }),
    );
    trunk.position.set(x, h / 2, z);
    trunk.castShadow = true; trunk.receiveShadow = true;
    return trunk;
  }
  const leafMatGreen = std(leafTexture('#3a7a2a', '#7aba4a'), {
    roughness: 0.85, side: THREE.DoubleSide, alphaTest: 0.4, flag: 'ghibliFoliage',
  });
  const coreMatGreen = std(0x2a6a1a, { roughness: 0.9, flag: 'ghibliFoliage' });
  const leafMatPink = std(leafTexture('#f7a8c4', '#ffd7e8'), {
    roughness: 0.85, side: THREE.DoubleSide, alphaTest: 0.4, flag: 'ghibliFoliage',
  });
  leafMatPink.userData.ghibliNoFleck = true; // flecks OFF — pink tidak boleh jadi oranye
  const coreMatPink = std(0xd87a9a, { roughness: 0.9, flag: 'ghibliFoliage' });
  coreMatPink.userData.ghibliNoFleck = true;
  // mangga (2): batang tebal + kanopi hijau besar
  scene.add(makeTrunk(-6.5, -4.5, 2.6, 0.28, 0.42));
  scene.add(makeBlobTree(-6.5, 3.6, -4.5, 2.2, leafMatGreen, coreMatGreen, 56));
  scene.add(makeTrunk(7.5, -7, 2.4, 0.24, 0.38));
  scene.add(makeBlobTree(7.5, 3.4, -7, 1.9, leafMatGreen, coreMatGreen, 48));
  // pohon berbunga (kamboja/flamboyan): kanopi pink + hijau
  scene.add(makeTrunk(-10.5, 3.5, 2.2, 0.22, 0.34));
  scene.add(makeBlobTree(-10.5, 3.2, 3.5, 1.7, leafMatPink, coreMatPink, 44));
  scene.add(makeBlobTree(-10.5, 3.9, 3.5, 1.1, leafMatGreen, coreMatGreen, 24));

  // --- pisang (2): batang + daun besar melengkung ke bawah ---
  function makeBananaLeaf(len, wid) {
    const geo = new THREE.PlaneGeometry(wid, len, 1, 6);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      const t = (y + len / 2) / len; // 0 pangkal, 1 ujung
      p.setZ(i, -Math.pow(t, 2) * len * 0.45); // droop
      p.setX(i, p.getX(i) * (1 - t * 0.35)); // meruncing ke ujung
    }
    geo.computeVertexNormals();
    return geo;
  }
  function makeBananaTree(x, z, s = 1) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.28, 2.2, 8),
      std(0x7a9a4a, { roughness: 0.9, flag: 'ghibliBark' }),
    );
    trunk.position.y = 1.1; trunk.castShadow = true;
    g.add(trunk);
    const leafMat = std(0x4a8a3a, { roughness: 0.85, side: THREE.DoubleSide, flag: 'ghibliFoliage' });
    const leafGeos = [];
    for (let i = 0; i < 7; i++) {
      const leaf = makeBananaLeaf(2.4, 0.7);
      leaf.translate(0, 1.2, 0);
      const ang = (i / 7) * Math.PI * 2 + srand() * 0.4;
      const tilt = 0.5 + srand() * 0.5;
      const combined = new THREE.Matrix4().multiplyMatrices(
        new THREE.Matrix4().makeRotationY(ang),
        new THREE.Matrix4().makeRotationX(-tilt),
      );
      combined.setPosition(0, 2.2, 0);
      leaf.applyMatrix4(combined);
      leafGeos.push(leaf);
    }
    const leaves = new THREE.Mesh(mergeGeometries(leafGeos), leafMat);
    leaves.castShadow = true;
    g.add(leaves);
    g.position.set(x, 0, z);
    g.scale.setScalar(s);
    return g;
  }
  scene.add(makeBananaTree(-4.2, 3.2, 1.0));
  scene.add(makeBananaTree(4.8, -1.5, 0.9));
  scene.add(makeBananaTree(-3.5, -8.5, 1.1));

  // --- rumpun bambu (4 rumpun, tegak, daun kecil di ujung) ---
  function makeBambooClump(x, z, n = 10, h = 5) {
    const g = new THREE.Group();
    const culmGeos = [];
    const leafGeos = [];
    for (let i = 0; i < n; i++) {
      const cx = srange(-0.5, 0.5), cz = srange(-0.5, 0.5);
      const ch = h * srange(0.7, 1.1);
      const culm = new THREE.CylinderGeometry(0.045, 0.06, ch, 6);
      culm.translate(0, ch / 2, 0);
      culm.translate(cx, 0, cz);
      culmGeos.push(culm);
      for (let j = 0; j < 3; j++) {
        const lf = new THREE.PlaneGeometry(0.12, 0.5);
        lf.translate(0, 0.25, 0);
        const la = srand() * Math.PI * 2;
        const comb = new THREE.Matrix4().multiplyMatrices(
          new THREE.Matrix4().makeRotationY(la),
          new THREE.Matrix4().makeRotationX(-(0.6 + srand() * 0.5)),
        );
        comb.setPosition(cx, ch, cz);
        lf.applyMatrix4(comb);
        leafGeos.push(lf);
      }
    }
    const culms = new THREE.Mesh(mergeGeometries(culmGeos),
      std(0x8aaa4a, { roughness: 0.7, flag: 'ghibliBark' }));
    culms.castShadow = true;
    g.add(culms);
    const leaves = new THREE.Mesh(mergeGeometries(leafGeos),
      std(0x5a9a3a, { roughness: 0.85, side: THREE.DoubleSide, flag: 'ghibliFoliage' }));
    leaves.castShadow = true;
    g.add(leaves);
    g.position.set(x, 0, z);
    return g;
  }
  scene.add(makeBambooClump(5.5, -9.5, 12, 5.5));
  scene.add(makeBambooClump(9.5, -3, 10, 5));
  scene.add(makeBambooClump(-4.8, -11, 11, 5.2));
  scene.add(makeBambooClump(7.5, 5.5, 9, 4.5)); // digeser ke kanan — sebelumnya tepat di depan kamera wide

  // tinggi tanah di (x,z) — rumus sama dengan displacement ground (lembah + rim),
  // supaya rumput/bunga/reed tidak melayang atau tenggelam.
  function groundY(x, z) {
    let dmin = 1e9;
    for (const p of riverSamples) {
      const dx = x - p.x, dz = z - p.z, d = dx * dx + dz * dz;
      if (d < dmin) dmin = d;
    }
    dmin = Math.sqrt(dmin);
    return -0.7 * (1 - THREE.MathUtils.smoothstep(dmin, 0, 2.6))
      + 0.5 * THREE.MathUtils.smoothstep(Math.max(Math.abs(x), Math.abs(z)), 14, 19);
  }

  // --- sawah berundak (tepi kanan, naik menjauhi sungai) ---
  const paddyWaterMat = std(0x5a9a8a, { roughness: 0.15, metalness: 0.1 });
  const paddyBundMat = std(0x8a7a4a, { roughness: 1 });
  const riceMat = std(0x4a9a3a, { roughness: 0.9, side: THREE.DoubleSide, flag: 'ghibliGrass' });
  const riceGeos = [];
  for (let t = 0; t < 4; t++) {
    const px = 6.5 + t * 2.0;
    const py = 0.1 + t * 0.25;
    const pz = -4;
    // blok tanah dari permukaan (y=0) sampai level teras — tidak melayang
    scene.add(box(1.9, py + 0.14, 9, paddyBundMat, px, (py + 0.14) / 2, pz));
    const pw = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 8.8), paddyWaterMat);
    pw.rotation.x = -Math.PI / 2;
    pw.position.set(px, py + 0.15, pz);
    pw.receiveShadow = true;
    scene.add(pw);
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 10; j++) {
        const rx = px - 0.7 + (i + 0.5) * 0.3 + srange(-0.05, 0.05);
        const rz = pz - 4 + (j + 0.5) * 0.8 + srange(-0.08, 0.08);
        for (const ry of [0, Math.PI / 2]) {
          const blade = new THREE.PlaneGeometry(0.22, 0.4);
          blade.translate(0, 0.2, 0);
          blade.rotateY(ry + srange(-0.2, 0.2));
          blade.translate(rx, py + 0.15, rz);
          riceGeos.push(blade);
        }
      }
    }
  }
  const rice = new THREE.Mesh(mergeGeometries(riceGeos), riceMat);
  rice.castShadow = true;
  scene.add(rice);

  // --- rumput padang: bilah lancip di-instance (900), di tanah (groundY) ---
  const bladeGeo = new THREE.PlaneGeometry(0.09, 0.5, 1, 1);
  const bp = bladeGeo.attributes.position;
  bp.setX(0, 0); bp.setX(1, 0); // ujung atas meruncing -> segitiga
  bladeGeo.translate(0, 0.25, 0);
  bladeGeo.computeVertexNormals();
  const grassMat = std(0x5a9a3a, { roughness: 0.95, side: THREE.DoubleSide, flag: 'ghibliGrass' });
  const grassCount = 900;
  const grassMesh = new THREE.InstancedMesh(bladeGeo, grassMat, grassCount);
  const dummy = new THREE.Object3D();
  let gi = 0, attempts = 0;
  while (gi < grassCount && attempts < grassCount * 10) {
    attempts++;
    const gx = srange(-14, 14), gz = srange(-14, 12);
    let dmin = 1e9;
    for (const p of riverSamples) {
      const dx = gx - p.x, dz = gz - p.z, d = dx * dx + dz * dz;
      if (d < dmin) dmin = d;
    }
    if (Math.sqrt(dmin) < 2.4) continue; // di dalam air
    if (Math.abs(gx) < 3.6 && Math.abs(gz) < 1.2) continue; // di jembatan
    if (gx > 5.2 && gx < 13.8 && gz > -9 && gz < 1) continue; // di sawah
    if (gx > -12.5 && gx < -4 && gz > -13.5 && gz < 7) continue; // di kampung/masjid
    dummy.position.set(gx, groundY(gx, gz), gz);
    dummy.rotation.set(srange(-0.15, 0.15), srand() * Math.PI, srange(-0.15, 0.15));
    dummy.scale.set(srange(0.7, 1.4), srange(0.7, 1.6), 1);
    dummy.updateMatrix();
    grassMesh.setMatrixAt(gi, dummy.matrix);
    gi++;
  }
  grassMesh.count = gi;
  grassMesh.instanceMatrix.needsUpdate = true;
  grassMesh.castShadow = true;
  grassMesh.receiveShadow = true;
  scene.add(grassMesh);

  // --- bunga liar di padang (batang + kepala warna-warni, 120) ---
  const flowerCount = 120;
  const flowerCols = [0xf7a8c4, 0xffd94a, 0xffffff, 0xb48ad8, 0xff8a5a];
  const stemGeo = new THREE.CylinderGeometry(0.015, 0.02, 0.5, 4);
  stemGeo.translate(0, 0.25, 0);
  const stemMesh = new THREE.InstancedMesh(stemGeo,
    std(0x3a7a2a, { roughness: 0.9, flag: 'ghibliGrass' }), flowerCount);
  const headGeo = new THREE.IcosahedronGeometry(0.09, 0);
  const headMat = std(0xffffff, { roughness: 0.8, flag: 'ghibliFoliage' });
  headMat.userData.ghibliNoFleck = true; // flecks OFF — warna bunga tidak boleh berubah
  const headMesh = new THREE.InstancedMesh(headGeo, headMat, flowerCount);
  const tmpCol = new THREE.Color();
  let fi = 0; attempts = 0;
  while (fi < flowerCount && attempts < flowerCount * 10) {
    attempts++;
    const fx = srand() < 0.7 ? srange(3, 13) : srange(-4.5, -2);
    const fz = srand() < 0.7 ? srange(-2, 8) : srange(4, 7);
    let dmin = 1e9;
    for (const p of riverSamples) {
      const dx = fx - p.x, dz = fz - p.z, d = dx * dx + dz * dz;
      if (d < dmin) dmin = d;
    }
    if (Math.sqrt(dmin) < 2.6) continue;
    if (fx > 5.2 && fx < 13.8 && fz > -9 && fz < 1) continue;
    const fy = groundY(fx, fz);
    dummy.position.set(fx, fy, fz);
    dummy.rotation.set(0, srand() * Math.PI, 0);
    dummy.scale.setScalar(srange(0.8, 1.3));
    dummy.updateMatrix();
    stemMesh.setMatrixAt(fi, dummy.matrix);
    dummy.position.y = fy + 0.5;
    dummy.updateMatrix();
    headMesh.setMatrixAt(fi, dummy.matrix);
    headMesh.setColorAt(fi, tmpCol.setHex(flowerCols[fi % flowerCols.length]));
    fi++;
  }
  stemMesh.count = fi;
  headMesh.count = fi;
  stemMesh.instanceMatrix.needsUpdate = true;
  headMesh.instanceMatrix.needsUpdate = true;
  if (headMesh.instanceColor) headMesh.instanceColor.needsUpdate = true;
  stemMesh.castShadow = true;
  headMesh.castShadow = true;
  scene.add(stemMesh);
  scene.add(headMesh);

  // --- alang-alang di tepi air (3 rumpun, tegak, kepala benih di ujung) ---
  const reedGeos = [];
  const reedMat = std(0x7a9a4a, { roughness: 0.9, side: THREE.DoubleSide, flag: 'ghibliGrass' });
  const reedSpots = [];
  for (const [si, side] of [[8, 1], [20, -1], [32, 1]]) {
    const p = riverSamples[si];
    const tan = riverCurve.getTangent(si / 48);
    const perp = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), tan).normalize();
    reedSpots.push(new THREE.Vector3(p.x + perp.x * side * 2.9, 0, p.z + perp.z * side * 2.9));
  }
  for (const spot of reedSpots) {
    for (let i = 0; i < 10; i++) {
      const rx = spot.x + srange(-0.4, 0.4), rz = spot.z + srange(-0.4, 0.4);
      const gy = groundY(rx, rz);
      const rh = srange(1.0, 1.7);
      const stem = new THREE.CylinderGeometry(0.015, 0.025, rh, 4);
      stem.translate(rx, gy + rh / 2, rz);
      reedGeos.push(stem);
      const head = new THREE.CylinderGeometry(0.035, 0.035, 0.22, 6);
      head.translate(rx, gy + rh + 0.08, rz);
      reedGeos.push(head);
    }
  }
  const reeds = new THREE.Mesh(mergeGeometries(reedGeos), reedMat);
  reeds.castShadow = true;
  scene.add(reeds);

  // --- teratai: daun mengapung + bunga pink (tikungan tenang, z ~ -5) ---
  const lotusMat = std(0x3a7a3a, { roughness: 0.7, side: THREE.DoubleSide, flag: 'ghibliFoliage' });
  const lotusGeos = [];
  const lotusFlowerMat = std(0xf7a8c4, { roughness: 0.8, flag: 'ghibliFoliage' });
  lotusFlowerMat.userData.ghibliNoFleck = true;
  const lotusFlowerGeos = [];
  for (let i = 0; i < 7; i++) {
    const lx = -1.2 + srange(-0.8, 0.8), lz = -5 + srange(-1.2, 1.2);
    const pad = new THREE.CircleGeometry(srange(0.22, 0.38), 10);
    pad.rotateX(-Math.PI / 2);
    pad.translate(lx, -0.15, lz);
    lotusGeos.push(pad);
    if (i % 2 === 0) {
      const fl = new THREE.IcosahedronGeometry(0.12, 0);
      fl.translate(lx, -0.02, lz);
      lotusFlowerGeos.push(fl);
    }
  }
  const lotus = new THREE.Mesh(mergeGeometries(lotusGeos), lotusMat);
  lotus.receiveShadow = true;
  scene.add(lotus);
  if (lotusFlowerGeos.length) {
    const lf = new THREE.Mesh(mergeGeometries(lotusFlowerGeos), lotusFlowerMat);
    lf.castShadow = true;
    scene.add(lf);
  }

  // --- kupu-kupu di atas padang bunga (sayap beku di tengah kepak) ---
  const butterflyCols = [0xff8a3a, 0x5a8ad8, 0xffffff, 0xffd94a, 0xb48ad8, 0xff8a3a];
  for (let i = 0; i < 6; i++) {
    const b = new THREE.Group();
    const wmat = std(butterflyCols[i], { roughness: 0.6, side: THREE.DoubleSide });
    wmat.userData.ghibliNoFleck = true;
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(s * 0.02, 0, 0);
      pivot.rotation.z = s * 0.7; // sayap terangkat
      const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.16), wmat);
      wing.rotation.x = -Math.PI / 2; // sayap horizontal
      wing.position.set(s * 0.12, 0, 0);
      pivot.add(wing);
      b.add(pivot);
    }
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.18, 4), std(0x2a2a2a));
    body.rotation.x = Math.PI / 2;
    b.add(body);
    b.position.set(srange(4, 10), srange(0.8, 1.6), srange(0, 6));
    b.rotation.y = srand() * Math.PI * 2;
    scene.add(b);
  }
}
