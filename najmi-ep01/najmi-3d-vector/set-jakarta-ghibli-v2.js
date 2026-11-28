// Set Jakarta tepi sungai (Ciliwung) v2 — latar kompleks untuk style ghibli,
// DIBANGUN DARI KODE ASLI repo ghibli-threejs (MIT), bukan dari nol.
//   vendor/ghibli/threejs-ghibli-toon-shading.js   (patch, U, GLSL_NOISE)
//   vendor/ghibli/threejs-procedural-vegetation.js (buildGrass, shrubGeometry,
//       buildPetals, bladeGeometry, CANOPY_RIM)
//   vendor/ghibli/threejs-ghibli-sky-clouds.js     (buildSkyDome, buildClouds)
//   vendor/ghibli/threejs-webgl-realistic-water.js (makeWaterSlopeMap,
//       makeWaterMaterial, RIVERBED_COLOR/NORMAL)
//   vendor/ghibli/threejs-gpu-butterflies.js       (buildButterflies)
//   vendor/ghibli/threejs-night-lights-lanterns.js (lanternLight, lampLight)
// Layout/isi mengikuti set-jakarta-ghibli.js v1 (referensi ISI saja —
// helper kotak/silinder sederhananya TIDAK disalin): sungai berliku +
// jembatan kayu di origin, kampung 5 rumah + masjid + menara di tepi kiri,
// sawah terasering + padang bunga di tepi kanan, mangga/berbunga/pisang/
// bambu, alang-alang, teratai, kupu-kupu. Tanpa karakter.
// Kontrak lampu: hemi 0x9fc8ff/0x8a7a5a 1.1, matahari 0xffe0b3 2.0,
// bounce 0xaebfff 0.9; kabut (14, 45). Set ini khusus SIANG (langit repo
// hanya cabang siang; malam tetap memakai set v1).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { U, GLSL_NOISE, patch } from './vendor/ghibli/threejs-ghibli-toon-shading.js';
import { bladeGeometry, GRASS_SHADER, buildGrass, shrubGeometry, buildPetals, CANOPY_RIM, random as shrubRandom } from './vendor/ghibli/threejs-procedural-vegetation.js';
import { buildClouds, buildSkyDome } from './vendor/ghibli/threejs-ghibli-sky-clouds.js';
import { makeWaterSlopeMap, makeWaterMaterial, RIVERBED_COLOR, RIVERBED_NORMAL } from './vendor/ghibli/threejs-webgl-realistic-water.js';
import { buildButterflies } from './vendor/ghibli/threejs-gpu-butterflies.js';
import { lanternLight, lampLight } from './vendor/ghibli/threejs-night-lights-lanterns.js';

// ---------- util: RNG + noise (deterministik, seed tetap) ----------
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash2i(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >> 13)) | 0; h = Math.imul(h, 1274126177);
  return (((h ^ (h >> 16)) >>> 0) % 10000) / 10000;
}
function vnoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash2i(ix, iy), b = hash2i(ix + 1, iy), c = hash2i(ix, iy + 1), d = hash2i(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
function fbm2js(x, y) {
  let s = 0, amp = 0.5, f = 1;
  for (let i = 0; i < 4; i++) { s += amp * vnoise(x * f, y * f); f *= 2.03; amp *= 0.5; }
  return s / 0.9375;
}

// Pita sungai mengikuti kurva (adaptor geometri — bentuk pita datar mengikuti
// alur Ciliwung; TAMPILAN airnya dari makeWaterMaterial repo, bukan dari sini).
// Urutan segitiga dibalik supaya normal menghadap ATAS (perbaikan v1: pita
// sempat menghadap bawah dan tidak tampil).
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
  const rand = mulberry32(20261127);
  const srange = (a, b) => a + rand() * (b - a);

  // ---------- lampu (kontrak hex sama dengan set lain) ----------
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
  if (scene.fog) { scene.fog.near = 14; scene.fog.far = 45; }

  // Arah + luminansi matahari untuk shader-shader repo.
  const sunDir = new THREE.Vector3(4, 10, 6).normalize();
  const sunColor = new THREE.Color(0xffe0b3);
  U.uSunLum.value = 1.79; // luminansi 0xffe0b3 (~0.895) x intensitas 2.0
  const fogColor = new THREE.Color(0x9fc8e8);

  // Helper: material repo-patch + tandai supaya converter style-ghibli.js
  // tidak menimpa onBeforeCompile-nya.
  function repoMat(mat, opts) {
    const m = patch(mat, opts);
    m.userData.ghibliRepoPatched = true;
    return m;
  }

  // ---------- sungai (alur Ciliwung, referensi layout v1) ----------
  const riverPts = [
    new THREE.Vector3(2.0, 0, 14), new THREE.Vector3(0.8, 0, 6),
    new THREE.Vector3(0.0, 0, 0), new THREE.Vector3(-1.0, 0, -6),
    new THREE.Vector3(-2.2, 0, -12), new THREE.Vector3(-3.0, 0, -18),
  ];
  const riverCurve = new THREE.CatmullRomCurve3(riverPts);
  const riverSamples = riverCurve.getPoints(48);

  // Tinggi tanah di (x,z) — lembah sungai + rim + teras sawah (skill:
  // "terraces in terrainHeight"). Dipakai ground, rumput, bunga, reed.
  function groundY(x, z) {
    // teras sawah (tepi kanan): 4 tingkat naik menjauhi sungai
    if (x >= 6.5 && x < 14.5 && z >= -8.5 && z <= 0.5) {
      const t = Math.min(3, Math.max(0, Math.floor((x - 6.5) / 2)));
      return 0.1 + t * 0.25;
    }
    let dmin = 1e9;
    for (const p of riverSamples) {
      const dx = x - p.x, dz = z - p.z, d = dx * dx + dz * dz;
      if (d < dmin) dmin = d;
    }
    dmin = Math.sqrt(dmin);
    // alas padang dinaikkan ke +0.15 supaya buildGrass (repo) menanam rumput:
    // ia melewati titik dengan terrainHeight < 0.1.
    return 0.15 - 0.7 * (1 - THREE.MathUtils.smoothstep(dmin, 0, 2.6))
      + 0.5 * THREE.MathUtils.smoothstep(Math.max(Math.abs(x), Math.abs(z)), 14, 19);
  }

  // ---------- tanah: lembah + dasar kerikil + padang (RIVERBED repo) ----------
  const groundGeo = new THREE.PlaneGeometry(40, 40, 48, 48);
  groundGeo.rotateX(-Math.PI / 2);
  const gp = groundGeo.attributes.position;
  for (let i = 0; i < gp.count; i++) {
    gp.setY(i, groundY(gp.getX(i), gp.getZ(i)));
  }
  groundGeo.computeVertexNormals();
  const groundMat = repoMat(
    new THREE.MeshStandardMaterial({ roughness: 0.95 }),
    { toon: true, color: RIVERBED_COLOR, normal: RIVERBED_NORMAL },
  );
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.receiveShadow = true;
  scene.add(ground);

  // ---------- air sungai (repo: slope map + water material) ----------
  const slopeMap = makeWaterSlopeMap(null, (x, y) => hash2i(x, y));
  const { mat: waterMat } = makeWaterMaterial({
    slopeMap,
    sunDir, sunColor, sunLum: 1.79, time: U.uTime,
    skyColor: 0x9fc8e8, scatterColor: 0x2f9c8e, deepColor: 0x1a5a7a, opacity: 0.72,
  });
  waterMat.userData.ghibliRepoPatched = true;
  const water = new THREE.Mesh(buildRiverRibbon(riverCurve, 4.4, -0.08, 60), waterMat);
  water.receiveShadow = true;
  scene.add(water);
  // cincin riak diam di kaki tiang jembatan (repo: uRipples w<0 = steady rings)
  // — diisi setelah jembatan dibuat (lihat bawah, spawnRipple tidak dipakai di still)

  // ---------- langit + awan (repo: sky-dome.glsl + cloud-puffs.js) ----------
  // buildClouds butuh U bersama (uTime, uSunDir, uSunColor, uMist, uSkyTop).
  const cloudU = {
    ...U,
    uSunDir: { value: sunDir },
    uSunColor: { value: sunColor },
    uMist: { value: fogColor },
    uSkyTop: { value: new THREE.Color(0x3684d8) },
  };
  const skyDome = buildSkyDome(scene, { sunDir, sunColor: 0xffe0b3, fogColor: 0x9fc8e8 });
  const cloudMesh = buildClouds(scene, cloudU, rand, GLSL_NOISE, { count: 9, size: [30, 84], worldScale: 0.06, detail: 1 });
  scene.userData.ghibliRepoSky = true;
  scene.userData.ghibliRepoSkyMeshes = [skyDome, cloudMesh];

  // ---------- util tekstur kanvas (untuk kayu + fasad) ----------
  function canvasTex(w, h, draw, rx = 1, ry = 1) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    return t;
  }

  // ---------- jembatan kayu melengkung di origin ----------
  // Papan (plank) memang kotak — bentuk alaminya; lengkung + rel tabung +
  // tiang yang membuat jembatan ini struktur, bukan tumpukan kotak.
  const woodTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#8a5a30'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 30; i++) {
      g.strokeStyle = 'rgba(60,35,15,0.5)'; g.lineWidth = 1 + rand() * 2;
      const y = rand() * h;
      g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + 4, w * 0.7, y - 4, w, y); g.stroke();
    }
    g.strokeStyle = 'rgba(40,25,10,0.6)'; g.lineWidth = 3;
    for (let x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  });
  const woodMat = repoMat(new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.85 }), { toon: true });
  const woodDark = repoMat(new THREE.MeshStandardMaterial({ color: 0x6a4526, roughness: 0.9 }), { toon: true });
  const bridge = new THREE.Group();
  const span = 3.2, archH = 0.75, deckW = 1.7;
  const archY = (x) => 0.15 + archH * Math.cos((x / span) * Math.PI / 2);
  const archSlope = (x) => -archH * (Math.PI / 2 / span) * Math.sin((x / span) * Math.PI / 2);
  for (let i = 0; i < 14; i++) {
    const x = -span + (i + 0.5) * (2 * span / 14);
    const plank = new THREE.Mesh(new THREE.BoxGeometry(2 * span / 14 + 0.04, 0.09, deckW), woodMat);
    plank.position.set(x, archY(x), 0);
    plank.rotation.z = Math.atan(archSlope(x));
    plank.castShadow = true; plank.receiveShadow = true;
    bridge.add(plank);
  }
  for (const side of [-1, 1]) { // rel melengkung (TubeGeometry) + tiang rel
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
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.85, 0.09), woodDark);
      post.position.set(x, archY(x) + 0.42, side * (deckW / 2 - 0.05));
      post.castShadow = true;
      bridge.add(post);
    }
  }
  for (const sx of [-1.2, 1.2]) { // tiang penyangga di air
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 1.5, 8), woodDark);
    post.position.set(sx, -0.05, 0);
    post.castShadow = true;
    bridge.add(post);
  }
  scene.add(bridge);

  // ---------- kampung: 5 rumah (profil ExtrudeGeometry, BUKAN kotak) ----------
  // Dinding = pentagon (kotak + segitiga atap) diekstrusi; atap = prisma
  // segitiga (gable) atau piramida (hip). Fasad = bidang kanvas (pintu +
  // jendela lengkung). Repo ghibli TIDAK punya builder rumah — ini geometri
  // terbaik yang tersedia (primitif profil, bukan kotak polos).
  function houseFacadeTex(wall) {
    return canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = wall; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 250; i++) { g.fillStyle = 'rgba(0,0,0,0.05)'; g.fillRect(rand() * w, rand() * h, 2, 2); }
      g.fillStyle = '#6a4526'; g.fillRect(w * 0.42, h * 0.55, w * 0.16, h * 0.45);
      g.beginPath(); g.arc(w * 0.5, h * 0.55, w * 0.08, Math.PI, 0); g.fill();
      for (const wx of [0.16, 0.72]) {
        g.fillStyle = '#2a4a6a'; g.fillRect(w * wx, h * 0.35, w * 0.12, h * 0.25);
        g.beginPath(); g.arc(w * (wx + 0.06), h * 0.35, w * 0.06, Math.PI, 0); g.fill();
        g.fillStyle = '#c9e0f0';
        g.fillRect(w * (wx + 0.055), h * 0.35, w * 0.01, h * 0.25);
        g.fillRect(w * wx, h * 0.46, w * 0.12, h * 0.01);
      }
    });
  }
  function makeHouse(w, d, h, wall, roof, type) {
    const g = new THREE.Group();
    const gh = 0.75; // tinggi segitiga atap
    const wallMat = repoMat(new THREE.MeshStandardMaterial({ color: wall, roughness: 0.9 }), { toon: true });
    const roofMat = repoMat(new THREE.MeshStandardMaterial({ color: roof, roughness: 0.85 }), { toon: true });
    // dinding: pentagon diekstrusi (bukan kotak)
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2, 0); shape.lineTo(w / 2, 0); shape.lineTo(w / 2, h);
    shape.lineTo(0, h + gh); shape.lineTo(-w / 2, h); shape.closePath();
    const wallGeo = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false });
    wallGeo.translate(0, 0, -d / 2);
    const walls = new THREE.Mesh(wallGeo, wallMat);
    walls.castShadow = true; walls.receiveShadow = true;
    g.add(walls);
    // atap: prisma segitiga (gable) / piramida (hip)
    if (type === 'hip') {
      const hip = new THREE.Mesh(new THREE.ConeGeometry(1, gh + 0.35, 4), roofMat);
      hip.rotation.y = Math.PI / 4;
      hip.scale.set((w + 0.5) / Math.SQRT2, 1, (d + 0.5) / Math.SQRT2);
      hip.position.y = h + (gh + 0.35) / 2;
      hip.castShadow = true;
      g.add(hip);
    } else {
      const rshape = new THREE.Shape();
      rshape.moveTo(-(w + 0.5) / 2, 0); rshape.lineTo((w + 0.5) / 2, 0);
      rshape.lineTo(0, gh + 0.3); rshape.closePath();
      const roofGeo = new THREE.ExtrudeGeometry(rshape, { depth: d + 0.5, bevelEnabled: false });
      roofGeo.translate(0, h - 0.05, -(d + 0.5) / 2);
      const roofMesh = new THREE.Mesh(roofGeo, roofMat);
      roofMesh.castShadow = true;
      g.add(roofMesh);
    }
    // fasad kanvas (pintu + jendela) di muka depan
    const facade = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      repoMat(new THREE.MeshStandardMaterial({ map: houseFacadeTex(wall), roughness: 0.9 }), { toon: true }),
    );
    facade.position.set(0, h / 2, d / 2 + 0.02);
    g.add(facade);
    return g;
  }
  const houses = [
    [-5.5, -2, 3.2, 2.8, 2.4, '#f2e2c2', '#b85a3a', 'gable', 1.0, 0.6],
    [-7.5, 2.5, 2.8, 2.6, 2.2, '#c2d8e8', '#7a4a30', 'hip', 0.95, 0.9],
    [-9, -6, 3.6, 3.0, 2.6, '#d8e8c2', '#b85a3a', 'gable', 1.1, 0.5],
    [-6.5, 5.5, 2.6, 2.4, 2.0, '#e8c2a2', '#5a3a2a', 'hip', 0.9, 1.1],
    [-11, 0, 3.0, 2.8, 2.4, '#f2e2c2', '#4a7a4a', 'gable', 1.0, 0.7],
  ];
  for (const [x, z, w, d, h, wall, roof, type, s, ry] of houses) {
    const house = makeHouse(w, d, h, wall, roof, type);
    house.scale.setScalar(s);
    house.position.set(x, groundY(x, z), z);
    house.rotation.y = ry;
    scene.add(house);
  }

  // ---------- masjid + menara (lathe: kubah bawang + menara) ----------
  const mosque = new THREE.Group();
  const creamMat = repoMat(new THREE.MeshStandardMaterial({ color: 0xf2e8d5, roughness: 0.85 }), { toon: true });
  const greenMat = repoMat(new THREE.MeshStandardMaterial({ color: 0x2a7a4a, roughness: 0.8 }), { toon: true });
  const goldMat = repoMat(new THREE.MeshStandardMaterial({ color: 0xd8a83a, roughness: 0.35, metalness: 0.6 }), { toon: true });
  // aula: kotak diekstrusi (profil persegi) + fasad lengkung
  const hallGeo = new THREE.ExtrudeGeometry(new THREE.Shape([
    new THREE.Vector2(-2.25, 0), new THREE.Vector2(2.25, 0),
    new THREE.Vector2(2.25, 3), new THREE.Vector2(-2.25, 3),
  ]), { depth: 4, bevelEnabled: false });
  hallGeo.translate(0, 0, -2);
  const hall = new THREE.Mesh(hallGeo, creamMat);
  hall.castShadow = true; hall.receiveShadow = true;
  mosque.add(hall);
  const mosqueFacade = new THREE.Mesh(
    new THREE.PlaneGeometry(4.5, 3),
    repoMat(new THREE.MeshStandardMaterial({
      map: canvasTex(256, 256, (g, w, h) => {
        g.fillStyle = '#f2e8d5'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#2a7a4a'; g.fillRect(0, h * 0.92, w, h * 0.08);
        for (const wx of [0.12, 0.4, 0.68]) {
          g.fillStyle = '#2a4a6a'; g.fillRect(w * wx, h * 0.3, w * 0.14, h * 0.4);
          g.beginPath(); g.arc(w * (wx + 0.07), h * 0.3, w * 0.07, Math.PI, 0); g.fill();
        }
        g.fillStyle = '#6a4526'; g.fillRect(w * 0.44, h * 0.5, w * 0.12, h * 0.5);
        g.beginPath(); g.arc(w * 0.5, h * 0.5, w * 0.06, Math.PI, 0); g.fill();
      }), roughness: 0.85,
    }), { toon: true }),
  );
  mosqueFacade.position.set(0, 1.5, 2.02);
  mosque.add(mosqueFacade);
  // kubah bawang (lathe) — profil membulat lalu meruncing
  const onionPts = [
    [0, 0], [1.30, 0.08], [1.5, 0.5], [1.35, 1.1], [0.9, 1.6], [0.35, 1.9], [0.05, 2.0], [0, 2.05],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const dome = new THREE.Mesh(new THREE.LatheGeometry(onionPts, 24), greenMat);
  dome.position.set(0, 3, 0);
  dome.castShadow = true;
  mosque.add(dome);
  const finial = new THREE.Mesh(new THREE.LatheGeometry([
    new THREE.Vector2(0, 0), new THREE.Vector2(0.07, 0), new THREE.Vector2(0.07, 0.3),
    new THREE.Vector2(0.02, 0.4), new THREE.Vector2(0.13, 0.5), new THREE.Vector2(0, 0.62),
  ], 12), goldMat);
  finial.position.set(0, 5.05, 0);
  mosque.add(finial);
  for (const sx of [-1.5, 1.5]) { // kubah samping
    const sd = new THREE.Mesh(new THREE.LatheGeometry(onionPts, 20), greenMat);
    sd.scale.setScalar(0.45);
    sd.position.set(sx, 3, 1.2);
    sd.castShadow = true;
    mosque.add(sd);
  }
  // menara: lathe (alas melebar + batang + balkon + kubah kecil)
  const minaret = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.LatheGeometry([
    new THREE.Vector2(0, 0), new THREE.Vector2(0.5, 0), new THREE.Vector2(0.42, 0.4),
    new THREE.Vector2(0.32, 1.5), new THREE.Vector2(0.30, 4.2), new THREE.Vector2(0.34, 4.3),
    new THREE.Vector2(0.34, 4.6), new THREE.Vector2(0.28, 4.7), new THREE.Vector2(0.24, 5.4),
    new THREE.Vector2(0, 5.5),
  ], 16), creamMat);
  shaft.castShadow = true;
  minaret.add(shaft);
  const balcony = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.5, 0.18, 16), greenMat);
  balcony.position.y = 4.45;
  minaret.add(balcony);
  const mDome = new THREE.Mesh(new THREE.LatheGeometry(onionPts, 20), greenMat);
  mDome.scale.setScalar(0.22);
  mDome.position.y = 5.5;
  minaret.add(mDome);
  const mFin = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.5, 8), goldMat);
  mFin.position.y = 6.2;
  minaret.add(mFin);
  minaret.position.set(2.8, 0, 0.5);
  mosque.add(minaret);
  mosque.position.set(-8.5, groundY(-8.5, -12), -12);
  mosque.rotation.y = 0.6;
  scene.add(mosque);

  // ---------- lampu malam repo (intensitas 0 di siang — pola skill) ----------
  // lampLight = lampu teras kampung, lanternLight = lampu masjid.
  lampLight.position.set(-5.5, 2.2, -0.6);
  lanternLight.position.set(-8.5, 2.0, -10.5);
  scene.add(lampLight, lanternLight);

  // ---------- pohon: batang lathe + kanopi repo (shrubGeometry) + inti ----------
  // Repo ghibli TIDAK punya builder batang pohon — batang = lathe (alas
  // melebar + meruncing) + cabang TubeGeometry; KANOPI + semak = kode repo
  // (shrubGeometry: kartu daun + clusterCenter untuk puff normals).
  function makeTrunk(h, r) {
    const pts = [
      [0, 0], [r, 0], [r * 0.8, 0.12], [r * 0.6, 0.4], [r * 0.48, 0.7],
      [r * 0.36, 0.92], [0, 1],
    ].map(([x, y]) => new THREE.Vector2(x, y * h));
    const trunk = new THREE.Mesh(
      new THREE.LatheGeometry(pts, 10),
      repoMat(new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.95 }), { toon: true, bark: 'vLocal.y' }),
    );
    trunk.castShadow = true; trunk.receiveShadow = true;
    return trunk;
  }
  function addForks(group, h, r, mat) {
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + rand() * 0.8;
      const pts = [
        new THREE.Vector3(0, h * 0.85, 0),
        new THREE.Vector3(Math.cos(a) * r * 2.2, h * 0.95, Math.sin(a) * r * 2.2),
        new THREE.Vector3(Math.cos(a) * r * 4.2, h * 1.08, Math.sin(a) * r * 4.2),
      ];
      const fork = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 6, r * 0.28, 5), mat);
      fork.castShadow = true;
      group.add(fork);
    }
  }
  // inti kanopi: icosphere dijitter (hash dari posisi => permukaan tetap rapat)
  function coreGeometry(radius) {
    const g = new THREE.IcosahedronGeometry(radius, 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const j = (hash2i(Math.round(p.getX(i) * 100), Math.round(p.getY(i) * 100)) - 0.5) * 0.22;
      const v = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i));
      v.multiplyScalar(1 + j);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return g;
  }
  const coreMat = repoMat(
    new THREE.MeshStandardMaterial({ color: 0x2a4a1a, roughness: 0.95 }),
    { toon: true, normal: CANOPY_RIM },
  );
  // kanopi: satu geometri shrub (leaves + stems), di-instance per pohon.
  function canopyMeshes(seed, opts, flecks) {
    const { leaves, stems } = shrubGeometry(seed, opts);
    const leafMat = repoMat(
      new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.85 }),
      { toon: true, puff: true, sss: true, rim: true, flecks },
    );
    const stemMat = repoMat(
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }),
      { toon: true },
    );
    return { leaves, stems, leafMat, stemMat };
  }
  function placeCanopy(can, mats, x, baseY, z, s, ry) {
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(x, baseY, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)),
      new THREE.Vector3(s, s, s),
    );
    const li = new THREE.InstancedMesh(can.leaves, mats.leafMat, 1);
    li.setMatrixAt(0, m);
    const si = new THREE.InstancedMesh(can.stems, mats.stemMat, 1);
    si.setMatrixAt(0, m);
    li.castShadow = true; si.castShadow = true;
    scene.add(li, si);
  }
  // mangga (2): batang + kanopi hijau repo + inti
  const mangoCan = canopyMeshes(5, { leaves: 1100, hue: 0.26, habit: 'mound', leafL: 1 }, 0.55);
  const mangoTrees = [[-6.5, -4.5, 2.6, 0.30, 2.2, 0.4], [7.5, -7, 2.4, 0.26, 1.9, 2.1]];
  for (const [x, z, h, r, s, ry] of mangoTrees) {
    const g = new THREE.Group();
    g.add(makeTrunk(h, r));
    addForks(g, h, r, repoMat(new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.95 }), { toon: true, bark: 'vLocal.y' }));
    g.position.set(x, groundY(x, z), z);
    scene.add(g);
    placeCanopy(mangoCan, mangoCan, x, groundY(x, z) + h * 0.92, z, s, ry);
    const core = new THREE.Mesh(coreGeometry(s * 0.42), coreMat);
    core.position.set(x, groundY(x, z) + h * 0.92 + s * 0.5, z);
    core.castShadow = true;
    scene.add(core);
  }
  // kamboja berbunga (1): kanopi pink repo (flecks OFF — aturan sakura) +
  // kanopi hijau kecil di atasnya + inti
  const flowerCan = canopyMeshes(7, { leaves: 900, hue: 0.92, bloom: 0.55, bloomColor: new THREE.Color(0.94, 0.64, 0.74), bloomColor2: new THREE.Color(1, 0.9, 0.93), habit: 'mound', leafL: 1 }, 0);
  const greenTopCan = canopyMeshes(9, { leaves: 500, hue: 0.26, habit: 'mound', leafL: 1 }, 0.55);
  {
    const g = new THREE.Group();
    g.add(makeTrunk(2.2, 0.24));
    g.position.set(-10.5, groundY(-10.5, 3.5), 3.5);
    scene.add(g);
    placeCanopy(flowerCan, flowerCan, -10.5, groundY(-10.5, 3.5) + 2.0, 3.5, 1.7, 0.8);
    placeCanopy(greenTopCan, greenTopCan, -10.5, groundY(-10.5, 3.5) + 3.2, 3.5, 1.1, 1.9);
    const core = new THREE.Mesh(coreGeometry(0.72), coreMat);
    core.position.set(-10.5, groundY(-10.5, 3.5) + 2.0 + 0.85, 3.5);
    core.castShadow = true;
    scene.add(core);
  }

  // ---------- pisang (3): batang lathe + daun melengkung ----------
  // Daun = bidang melengkung (droop + meruncing ke ujung) — teknik kartu
  // daun yang sama dengan repo (kartu 4-vertex), diperbesar untuk pisang.
  function bananaLeafGeometry(len, wid) {
    const g = new THREE.PlaneGeometry(wid, len, 1, 6);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i); // -len/2 .. len/2 (pangkal di -len/2)
      const t = (y + len / 2) / len; // 0 pangkal -> 1 ujung
      const taper = Math.max(0, Math.sin(Math.PI * Math.min(1, t * 1.15))) ** 0.6;
      p.setX(i, p.getX(i) * taper);
      p.setZ(i, -Math.pow(t, 2) * len * 0.55 - Math.abs(p.getX(i)) * 0.25); // droop + lipatan tengah
    }
    g.computeVertexNormals();
    return g;
  }
  const bananaLeafMat = repoMat(
    new THREE.MeshStandardMaterial({ color: 0x3a7a2a, side: THREE.DoubleSide, roughness: 0.8 }),
    { toon: true, sss: true, flecks: 0.4 },
  );
  for (const [x, z, s] of [[-4.2, 3.2, 1.0], [4.8, -1.5, 0.9], [-3.5, -8.5, 1.1]]) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.LatheGeometry([[0, 0], [0.13, 0], [0.09, 0.6], [0.06, 1.1], [0, 1.2]].map(([a, b]) => new THREE.Vector2(a, b)), 8),
      repoMat(new THREE.MeshStandardMaterial({ color: 0x6a7a3a, roughness: 0.9 }), { toon: true }),
    );
    trunk.castShadow = true;
    g.add(trunk);
    const leaves = [];
    for (let i = 0; i < 7; i++) {
      const lg = bananaLeafGeometry(1.6 + rand() * 0.4, 0.5 + rand() * 0.15);
      const m = new THREE.Matrix4().compose(
        new THREE.Vector3(0, 1.15, 0),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.9 - rand() * 0.5, (i / 7) * Math.PI * 2 + rand() * 0.4, 0)),
        new THREE.Vector3(1, 1, 1),
      );
      lg.applyMatrix4(m);
      leaves.push(lg);
    }
    const leafMesh = new THREE.Mesh(mergeGeometries(leaves), bananaLeafMat);
    leafMesh.castShadow = true;
    g.add(leafMesh);
    g.scale.setScalar(s);
    g.position.set(x, groundY(x, z), z);
    scene.add(g);
  }

  // ---------- bambu (4 rumpun): culm tabung meruncing + kartu daun ----------
  // Mengikuti deskripsi SKILL.md repo (tidak ada .js bambu di repo): 5 varian
  // culm, cincin node dengan pita pucat di bawah node, lengkung ringan,
  // semprotan daun = kartu lanceolate 4-vertex yang terkulai dari node atas,
  // clusterCenter = pusat semprotan, tint per-instance via setColorAt.
  function bambooCulmGeometry(height, radius, nodes, arc) {
    const radial = 6, rings = 10;
    const pos = [], col = [], idx = [];
    const green = new THREE.Color(0x4a8a3a), pale = new THREE.Color(0xd8e8b0);
    for (let j = 0; j <= rings; j++) {
      const t = j / rings;
      const y = t * height;
      const xoff = arc * t * t;
      const r = radius * (1 - 0.35 * t);
      let c = green.clone();
      for (let k = 1; k <= nodes; k++) {
        const nt = k / (nodes + 1);
        if (t < nt && t > nt - 0.045) { c = pale.clone(); break; }
      }
      c.multiplyScalar(0.9 + 0.2 * hash2i(j, 3));
      for (let k = 0; k <= radial; k++) {
        const a = (k / radial) * Math.PI * 2;
        pos.push(xoff + Math.cos(a) * r, y, Math.sin(a) * r);
        col.push(c.r, c.g, c.b);
      }
    }
    for (let j = 0; j < rings; j++) for (let k = 0; k < radial; k++) {
      const a = j * (radial + 1) + k, b = a + 1, c2 = a + radial + 1, d = c2 + 1;
      idx.push(a, c2, b, b, c2, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }
  function bambooSprayGeometry() {
    const L = 0.5, W = 0.13;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([
      0, 0, 0, W / 2, L * 0.4, -0.05, 0, L, -0.18, -W / 2, L * 0.4, -0.05,
    ], 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
    g.setAttribute('clusterCenter', new THREE.Float32BufferAttribute([0, L * 0.5, 0, 0, L * 0.5, 0, 0, L * 0.5, 0, 0, L * 0.5, 0], 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    g.computeBoundingSphere();
    return g;
  }
  {
    const culmGeo = bambooCulmGeometry(1, 1, 6, 0.3); // unit: diskala per instance
    const culmMat = repoMat(
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }),
      { toon: true },
    );
    const sprayGeo = bambooSprayGeometry();
    const sprayMat = repoMat(
      new THREE.MeshStandardMaterial({ color: 0x4a8a3a, side: THREE.DoubleSide, roughness: 0.85 }),
      { toon: true, puff: true, sss: true },
    );
    const clumps = [[5.5, -9.5], [9.5, -3], [-4.8, -11], [7.5, 5.5]];
    const culmMats = [], sprayMats = [];
    const tint = new THREE.Color();
    for (const [cx, cz] of clumps) {
      const n = 9 + Math.floor(rand() * 3);
      for (let i = 0; i < n; i++) {
        const a = rand() * Math.PI * 2, rr = rand() * 0.7;
        const x = cx + Math.cos(a) * rr, z = cz + Math.sin(a) * rr;
        const h = 2.6 + rand() * 1.4, r = 0.05 + rand() * 0.03;
        const m = new THREE.Matrix4().compose(
          new THREE.Vector3(x, groundY(x, z), z),
          new THREE.Quaternion().setFromEuler(new THREE.Euler((rand() - 0.5) * 0.12, rand() * Math.PI * 2, (rand() - 0.5) * 0.12)),
          new THREE.Vector3(r, h, r),
        );
        culmMats.push(m);
        // 3 semprotan daun dari node atas culm
        for (let k = 0; k < 3; k++) {
          const ty = groundY(x, z) + h * (0.62 + k * 0.13);
          const sa = rand() * Math.PI * 2;
          const sm = new THREE.Matrix4().compose(
            new THREE.Vector3(x + Math.cos(sa) * 0.12, ty, z + Math.sin(sa) * 0.12),
            new THREE.Quaternion().setFromEuler(new THREE.Euler(0.5 + rand() * 0.5, sa, 0)),
            new THREE.Vector3(0.9 + rand() * 0.5, 0.9 + rand() * 0.5, 1),
          );
          sprayMats.push(sm);
        }
      }
    }
    const culms = new THREE.InstancedMesh(culmGeo, culmMat, culmMats.length);
    culmMats.forEach((m, i) => {
      culms.setMatrixAt(i, m);
      tint.setHSL(0.29 + (rand() - 0.5) * 0.04, 0.45, 0.5 + (rand() - 0.5) * 0.15);
      culms.setColorAt(i, tint);
    });
    culms.castShadow = true;
    scene.add(culms);
    const sprays = new THREE.InstancedMesh(sprayGeo, sprayMat, sprayMats.length);
    sprayMats.forEach((m, i) => sprays.setMatrixAt(i, m));
    sprays.castShadow = true;
    scene.add(sprays);
  }

  // ---------- sawah terasering: teras di terrainHeight + air repo + padi ----------
  // Teras sudah diukir di groundY (skill: "terraces in terrainHeight").
  // Air sawah memakai material air repo yang sama; padi = bladeGeometry repo.
  for (let t = 0; t < 4; t++) {
    const px = 7.5 + t * 2.0, py = 0.1 + t * 0.25;
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 8.8), waterMat);
    sheet.rotation.x = -Math.PI / 2;
    sheet.position.set(px, py + 0.15, -4);
    sheet.receiveShadow = true;
    scene.add(sheet);
  }
  {
    const riceMat = repoMat(
      new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.72 }),
      GRASS_SHADER,
    );
    const riceGeo = bladeGeometry();
    const rice = new THREE.InstancedMesh(riceGeo, riceMat, 400);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    let ri = 0;
    for (let t = 0; t < 4; t++) {
      const px = 7.5 + t * 2.0, py = 0.1 + t * 0.25;
      for (let gx = 0; gx < 5; gx++) for (let gz = 0; gz < 10; gz++) {
        for (let k = 0; k < 2; k++) {
          const rx = px - 0.7 + gx * 0.35 + (rand() - 0.5) * 0.1;
          const rz = -8 + gz * 0.9 + (rand() - 0.5) * 0.15;
          q.setFromEuler(new THREE.Euler((rand() - 0.5) * 0.3, rand() * Math.PI * 2, (rand() - 0.5) * 0.3));
          const sc = 0.35 + rand() * 0.15;
          s.set(sc, sc, sc);
          p.set(rx, py, rz);
          m4.compose(p, q, s);
          rice.setMatrixAt(ri++, m4);
        }
      }
    }
    rice.receiveShadow = true;
    scene.add(rice);
  }

  // ---------- padang rumput (repo: buildGrass) ----------
  // buildGrass menaruh rumput di layer 2 (MEADOW_LAYER) dan materialnya
  // tidak ditandai ghibliRepoPatched — ditandai di traverse akhir.
  buildGrass(scene, {
    count: 1200, rand, terrainHeight: groundY, fbm: fbm2js, patch,
    center: [0, 0], area: [-14, 14, -14, 12],
    excluded: (x, z) => {
      let dmin = 1e9;
      for (const p of riverSamples) { const d = (x - p.x) ** 2 + (z - p.z) ** 2; if (d < dmin) dmin = d; }
      if (Math.sqrt(dmin) < 2.4) return true;
      if (Math.abs(x) < 3.6 && Math.abs(z) < 1.2) return true; // jembatan
      if (x >= 6.5 && x < 14.5 && z >= -8.5 && z <= 0.5) return true; // sawah
      if (x >= -12.5 && x <= -4 && z >= -13.5 && z <= 7) return true; // kampung/masjid
      return false;
    },
  });

  // ---------- bunga liar (120): batang + kepala kanvas, tint per instance ----------
  const flowerSpots = [];
  {
    const flowerTex = canvasTex(64, 64, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.fillStyle = '#ffffff';
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        g.beginPath();
        g.ellipse(32 + Math.cos(a) * 13, 32 + Math.sin(a) * 13, 11, 7, a, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = '#ffd94a';
      g.beginPath(); g.arc(32, 32, 7, 0, Math.PI * 2); g.fill();
    });
    const stemGeo = new THREE.CylinderGeometry(0.012, 0.02, 0.35, 5);
    stemGeo.translate(0, 0.175, 0);
    const stemMat = repoMat(new THREE.MeshStandardMaterial({ color: 0x3a6a1a, roughness: 0.9 }), { toon: true });
    const headGeo = new THREE.CircleGeometry(0.09, 8);
    headGeo.rotateX(-Math.PI / 2);
    const headMat = repoMat(
      new THREE.MeshStandardMaterial({ map: flowerTex, transparent: true, side: THREE.DoubleSide, roughness: 0.8 }),
      { toon: true },
    );
    const cols = [0xf7a8c4, 0xffd94a, 0xffffff, 0xb48ad8, 0xff8a5a].map((c) => new THREE.Color(c));
    const stems = new THREE.InstancedMesh(stemGeo, stemMat, 120);
    const heads = new THREE.InstancedMesh(headGeo, headMat, 120);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
    let fi = 0, tries = 0;
    while (fi < 120 && tries++ < 3000) {
      let x, z;
      if (rand() < 0.7) { x = 3 + rand() * 10; z = -2 + rand() * 10; }
      else { x = -4.5 + rand() * 2.5; z = 4 + rand() * 3; }
      let dmin = 1e9;
      for (const rp of riverSamples) { const d = (x - rp.x) ** 2 + (z - rp.z) ** 2; if (d < dmin) dmin = d; }
      if (Math.sqrt(dmin) < 2.6) continue;
      if (x >= 6.5 && x < 14.5 && z >= -8.5 && z <= 0.5) continue;
      const gy = groundY(x, z);
      q.setFromEuler(new THREE.Euler((rand() - 0.5) * 0.2, rand() * Math.PI * 2, (rand() - 0.5) * 0.2));
      p.set(x, gy, z);
      m4.compose(p, q, s);
      stems.setMatrixAt(fi, m4);
      heads.setMatrixAt(fi, m4);
      heads.setColorAt(fi, cols[Math.floor(rand() * cols.length)]);
      flowerSpots.push([x, gy, z]);
      fi++;
    }
    stems.count = fi; heads.count = fi;
    stems.castShadow = true; heads.castShadow = true;
    scene.add(stems, heads);
  }

  // ---------- alang-alang di tepi sungai (3 rumpun) ----------
  {
    const stemGeos = [], headGeos = [];
    for (const si of [8, 20, 32]) {
      const sp = riverSamples[si];
      const tan = riverCurve.getTangent(si / 48);
      const side = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), tan).normalize();
      for (const dir of [-1, 1]) {
        const bx = sp.x + side.x * 2.9 * dir, bz = sp.z + side.z * 2.9 * dir;
        const by = groundY(bx, bz);
        for (let k = 0; k < 8; k++) {
          const h = 0.8 + rand() * 0.4;
          const sg = new THREE.CylinderGeometry(0.012, 0.022, h, 5);
          sg.translate(0, h / 2, 0);
          sg.rotateZ((rand() - 0.5) * 0.25);
          sg.translate(bx + (rand() - 0.5) * 0.5, by, bz + (rand() - 0.5) * 0.5);
          stemGeos.push(sg);
          if (rand() < 0.6) {
            const hg = new THREE.CylinderGeometry(0.035, 0.04, 0.16, 6);
            hg.translate(0, h + 0.06, 0);
            hg.rotateZ((rand() - 0.5) * 0.25);
            hg.translate(bx + (rand() - 0.5) * 0.5, by, bz + (rand() - 0.5) * 0.5);
            headGeos.push(hg);
          }
        }
      }
    }
    const reedMat = repoMat(new THREE.MeshStandardMaterial({ color: 0x5a8a2a, roughness: 0.9 }), { toon: true });
    const reeds = new THREE.Mesh(mergeGeometries(stemGeos), reedMat);
    reeds.castShadow = true;
    scene.add(reeds);
    const headMat = repoMat(new THREE.MeshStandardMaterial({ color: 0x6a4a22, roughness: 0.95 }), { toon: true });
    const heads = new THREE.Mesh(mergeGeometries(headGeos), headMat);
    heads.castShadow = true;
    scene.add(heads);
  }

  // ---------- teratai: 7 daun mengambang + 4 bunga lathe ----------
  {
    const padGeos = [];
    for (let i = 0; i < 7; i++) {
      const pg = new THREE.CircleGeometry(0.32 + rand() * 0.1, 10);
      pg.rotateX(-Math.PI / 2);
      const pp = pg.attributes.position;
      for (let v = 0; v < pp.count; v++) {
        const r = Math.hypot(pp.getX(v), pp.getZ(v));
        if (r > 0.22) pp.setY(v, (r - 0.22) * 0.35); // pinggir terangkat
      }
      pg.computeVertexNormals();
      pg.translate(-1.2 + (rand() - 0.5) * 1.6, -0.15, -5 + (rand() - 0.5) * 2.4);
      padGeos.push(pg);
    }
    const padMat = repoMat(new THREE.MeshStandardMaterial({ color: 0x2a6a1a, side: THREE.DoubleSide, roughness: 0.85 }), { toon: true, sss: true });
    const pads = new THREE.Mesh(mergeGeometries(padGeos), padMat);
    pads.receiveShadow = true;
    scene.add(pads);
    const cupGeos = [], podGeos = [];
    for (let i = 0; i < 4; i++) {
      const cup = new THREE.LatheGeometry([
        new THREE.Vector2(0, 0), new THREE.Vector2(0.11, 0.01), new THREE.Vector2(0.14, 0.07),
        new THREE.Vector2(0.09, 0.14), new THREE.Vector2(0.02, 0.17), new THREE.Vector2(0, 0.18),
      ], 10);
      cup.translate(-1.2 + (rand() - 0.5) * 1.4, -0.1, -5 + (rand() - 0.5) * 2.0);
      cupGeos.push(cup);
      const pod = new THREE.ConeGeometry(0.05, 0.08, 8);
      pod.translate(-1.2 + (rand() - 0.5) * 1.4, 0.02, -5 + (rand() - 0.5) * 2.0);
      podGeos.push(pod);
    }
    const cupMat = repoMat(new THREE.MeshStandardMaterial({ color: 0xf7a8c4, roughness: 0.8 }), { toon: true });
    const cups = new THREE.Mesh(mergeGeometries(cupGeos), cupMat);
    cups.castShadow = true;
    scene.add(cups);
    const podMat = repoMat(new THREE.MeshStandardMaterial({ color: 0xffd94a, roughness: 0.8 }), { toon: true });
    scene.add(new THREE.Mesh(mergeGeometries(podGeos), podMat));
  }

  // ---------- kelopak kamboja (repo: buildPetals) + karpet statis ----------
  const crowns = [[-10.5, groundY(-10.5, 3.5) + 3.1, 3.5, 1.7, groundY(-10.5, 3.5)]];
  const stepPetals = buildPetals(scene, cloudU, crowns, rand, { n: 1440, crowns: 8, reach: 60 });
  // still: isi uCrown sekali dengan kamera wide (0, 4, 11) supaya kelopak ada.
  stepPetals(0, { position: new THREE.Vector3(0, 4, 11) });
  {
    const carpet = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(0.034, 0.042).rotateX(-Math.PI / 2),
      repoMat(new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.9 }), { toon: true }),
      55,
    );
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
    const tint = new THREE.Color();
    for (let i = 0; i < 55; i++) {
      const a = rand() * Math.PI * 2, rr = Math.sqrt(rand()) * 1.6;
      const x = -10.5 + Math.cos(a) * rr, z = 3.5 + Math.sin(a) * rr;
      q.setFromEuler(new THREE.Euler(0, rand() * Math.PI * 2, 0));
      p.set(x, groundY(x, z) + 0.02, z);
      m4.compose(p, q, s);
      carpet.setMatrixAt(i, m4);
      tint.setHSL(0.95 + rand() * 0.03, 0.7, 0.85 + rand() * 0.1);
      carpet.setColorAt(i, tint);
    }
    scene.add(carpet);
  }

  // ---------- kupu-kupu (repo: buildButterflies, GPU) ----------
  buildButterflies({ scene, flowerSpots, centre: { x: 0, z: 0 }, uTime: U.uTime, uWind: U.uWind, rng: rand });

  // ---------- penutup: reset layer repo + tandai material rumput ----------
  // Kode repo menaruh rumput di layer 2 dan kelopak/awan di layer 1 — kamera
  // pipeline ini hanya memakai layer 0, jadi semuanya direset ke 0.
  // Material rumput (MeshStandardMaterial hasil patch repo) ditandai supaya
  // converter style-ghibli.js tidak menimpa onBeforeCompile-nya.
  scene.traverse((o) => {
    if (o.isMesh || o.isPoints) {
      if (o.material && o.material.isMeshStandardMaterial && o.layers.mask !== 1) {
        o.material.userData.ghibliRepoPatched = true;
      }
      o.layers.set(0);
    }
  });
}
