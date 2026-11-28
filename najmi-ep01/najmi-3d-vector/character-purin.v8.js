// Najmi 3D PURIN — remake mini-chara puding (プリン).
// Dari gambar referensi Jepang "ミニキャラを描くとき" (Master, 2026-11-27):
// kepala BESAR bulat (~47% tinggi total), badan = PUDING trapesium lembut
// melebar ke bawah (satu kesatuan, bukan torso + pinggul terpisah),
// pipi tembem menonjol ("ほっぺをつきだす"), tangan + kaki KECIL menempel
// di badan puding ("プリンに足をべとべとつける"), ada pose duduk おすわり.
// BUKAN stick (character.js) dan BUKAN blocky (character-blocky.js) —
// ini varian ketiga, interface SAMA, bisa ditukar via ?char=purin.
// Proporsi, warna, 8 pose, SENTENCES SAMA. Dibuat dari nol pakai Three.js.
// REVISI v3 (Master 2026-11-27): tangan + kaki GEMBUL (bukan cuma chunky —
// gemuk bulat seperti mochi/sosis kecil, kapsul r ~0.12); EKSPRESI lebih
// hidup (mata BESAR + bulu mata, mulut + alis BERVARIASI per pose, lidah
// untuk mulut terbuka, blush lebih besar); RAMBUT lebih bervolume
// (cap lebih tebal + poni/fringe jelas + jambul lebih menonjol +
// strand samping lebih tebal).
// REVISI v4 (Master 2026-11-27): v3 "ekspresinya jadi aneh" — alis terlalu
// TEBAL + GELAP (seperti ulat hitam), mulut "O" terlalu BESAR + GELAP
// (seperti lubang), semua feature berebut perhatian di wajah kecil.
// Jadi: alis TIPIS + coklat lembut + pendek + lebih tinggi; mata besar tapi
// LEMBUT (pupil lebih kecil, bulu mata DIHAPUS); mulut ~30% lebih kecil +
// warna coklat-merah lembut (bukan hitam); lidah + blush lebih kecil/lembut.
// RAMBUT v3 masih seperti TOPI (cap halus + poni bola tempelan) — diganti
// massa rambut dari CLUMP/STRAND anime tumpang tindih (lathe tetes air,
// ujung runcing): mahkota + poni + samping + belakang + jambul, siluet
// bergerigi. Lengan/kaki GEMBUL v3 TIDAK diubah (Master tidak komplain).
// REVISI v5 (Master 2026-11-27, 3 gambar referensi baru):
// (1) KEPALA seperti Gambar 1 (sheet konstruksi kepala chibi JP): kepala
// bola BESAR, sedikit LEBIH LEBAR dari tinggi, dagu/rahang lebih DATAR,
// titik terlebar di tengah/bawah-tengah, wajah di SETENGAH BAWAH kepala,
// + TELINGA kecil di samping. (2) WAJAH seperti Gambar 2 (chart ekspresi
// Q版) + Gambar 3 (Haneno Hata): MATA BESAR + DETAIL berlapis (sklera,
// iris BIRU + iris dalam muda, pupil, highlight, garis bulu mata atas
// tipis), ALIS TIPIS + MELENGKUNG + TINGGI (busur, bukan kotak), MULUT
// SANGAT KECIL + BERVARIASI (3 bentuk: garis / o kecil / senyum ⌣),
// BLUSH BESAR + LEMBUT + pink. Rambut clump v4 + lengan/kaki GEMBUL v3
// TIDAK diubah (Master tidak komplain) — hanya under-cap rambut mengikuti
// profil kepala baru, dan 1 clump samping digeser ke belakang supaya
// telinga kelihatan.
// REVISI v6 (Master 2026-11-27): "gw mau dia pakai sweater, rambut korean
// hairstyle." (1) OUTFIT: atasan batik diganti SWEATER OVERSIZED KREM
// hangat — tekstur rajutan (knit) dilukis kode, kerah crewneck ribbed,
// hem ribbed agak melebar, manset ribbed di pergelangan (lengan panjang
// menutupi lengan gembul, tangan mitten keluar), saku tempel kecil di
// depan. Kancing emas + saku dada + sabuk batik DIHAPUS. Syal kuning
// TETAP (ciri Najmi). (2) RAMBUT: clump spiky v4 diganti KOREAN HAIRSTYLE
// — puff BULAT lembut (ujung membulat, bukan runcing), fluffy seperti
// awan: mahkota bervolume, poni COMMA/CURTAIN (belah tengah lembut,
// menyapu kiri-kanan), samping membingkai wajah, belakang bervolume,
// + pusaran lembut di atas (bukan jambul runcing). Kepala lebar + wajah
// detail v5, lengan/kaki GEMBUL, tas, lentera, 8 pose TIDAK diubah.
// REVISI v7 (Master 2026-11-27): "pakai jaket biru dan kaos bagian
// dalamnya putih." OUTFIT: sweater krem v6 diganti JAKET BIRU DENIM
// (medium) + KAOS PUTIH di dalam. Jaket TERBUKA di depan — kaos putih
// dibuat sebagai panel lathe di depan badan (phi ±0.42), kelihatan di
// dada + mengintip di bawah hem; strip resleting di tepi panel +
// tarikan resleting; kerah jaket terbuka (segmen silinder, celah depan)
// + lipatan kerah (lapel); saku dada + saku samping; hem ribbed biru;
// lengan jaket biru + manset biru. Syal kuning TETAP. Kepala lebar +
// wajah detail v5, rambut Korea v6, lengan/kaki GEMBUL, tas, lentera,
// 8 pose TIDAK diubah.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// ---------- tekstur 64x64 dilukis kode (sama seperti blocky) ----------
function tex64(draw) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  draw(c.getContext('2d'));
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
// v7: JAKET — tekstur denim biru medium: anyaman horizontal HALUS
// (garis 1px kontras rendah, tanpa titik — titik + garis membuat pola
// kotak-kotak seperti gingham). Dipakai badan puding (= jaket) + lengan
// jaket. Bukan navy gelap, bukan biru terang — biru denim klasik.
function denimTex() {
  return tex64(g => {
    g.fillStyle = '#4378b8'; g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#3d6ca6';
    for (let y = 0; y < 64; y += 8) g.fillRect(0, y, 64, 1);
    g.fillStyle = '#4d84c4';
    for (let y = 4; y < 64; y += 8) g.fillRect(0, y, 64, 1);
  });
}
// v7: ribbing jaket biru — garis vertikal bergantian (hem, manset).
// Di silinder, garis vertikal canvas = rib vertikal mengelilingi.
function denimRibTex() {
  return tex64(g => {
    g.fillStyle = '#3a6aa5'; g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#2f5788';
    for (let x = 0; x < 64; x += 8) g.fillRect(x, 0, 3, 64);
    g.fillStyle = '#5b8cc0';
    for (let x = 4; x < 64; x += 8) g.fillRect(x, 0, 2, 64);
  });
}
function shortsTex() {
  return tex64(g => {
    g.fillStyle = '#6b4a2f'; g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#5d3a24';
    for (let y = 0; y < 64; y += 8) g.fillRect(0, y, 64, 2);
    g.fillStyle = '#f6c945'; g.fillRect(0, 2, 64, 2);
  });
}
function shoeTex() {
  return tex64(g => {
    g.fillStyle = '#cf3a2c'; g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#f4ede0'; g.fillRect(0, 44, 64, 20);
    g.fillStyle = '#8e2318'; g.fillRect(0, 42, 64, 2);
    g.fillStyle = '#f6c945'; g.fillRect(28, 8, 8, 4);
  });
}
function lanternTex() {
  return tex64(g => {
    g.fillStyle = '#ffb347'; g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#ff8c1a';
    for (let x = 0; x < 64; x += 8) g.fillRect(x, 0, 3, 64);
    g.fillStyle = '#5a3a1a';
    g.fillRect(0, 0, 64, 6); g.fillRect(0, 58, 64, 6);
    g.fillRect(28, 0, 8, 64);
    g.fillStyle = '#ffe9a8'; g.fillRect(24, 22, 16, 20);
  });
}
function bagTex() {
  return tex64(g => {
    g.fillStyle = '#7a4a22'; g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#5d3413'; g.fillRect(0, 0, 64, 22);
    g.fillStyle = '#a06a35';
    for (let y = 26; y < 64; y += 8) g.fillRect(0, y, 64, 2);
    g.fillStyle = '#f6c945'; g.beginPath(); g.arc(32, 16, 5, 0, 7); g.fill();
  });
}

// ---------- material halus + outline tinta ----------
function mat(color, map) {
  return new THREE.MeshStandardMaterial({ color, map: map || null, roughness: 0.75, metalness: 0 });
}
function outline(mesh, s = 1.05) {
  const o = new THREE.Mesh(mesh.geometry, new THREE.MeshBasicMaterial({ color: 0x241a12, side: THREE.BackSide }));
  o.position.copy(mesh.position);
  o.rotation.copy(mesh.rotation);
  o.scale.copy(mesh.scale).multiplyScalar(s);
  o.userData.isProp = true;
  mesh.parent.add(o);
  return o;
}
function box(w, h, d, m) {
  const x = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  x.castShadow = true; return x;
}
function cyl(rt, rb, h, m, seg = 10) {
  const x = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
  x.castShadow = true; return x;
}
function sph(r, m, w = 16, h = 12) {
  const x = new THREE.Mesh(new THREE.SphereGeometry(r, w, h), m);
  x.castShadow = true; return x;
}
function capsule(r, len, m, cap = 2, rad = 8) {
  const x = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, cap, rad), m);
  x.castShadow = true; return x;
}
function rbox(w, h, d, m, r = 0.06, seg = 1) {
  const x = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, seg, r), m);
  x.castShadow = true; return x;
}
function lathe(points, m, seg = 20) {
  // badan puding: profil (radius, y) diputar — trapesium lembut melebar ke bawah
  const pts = points.map(p => new THREE.Vector2(p[0], p[1]));
  const x = new THREE.Mesh(new THREE.LatheGeometry(pts, seg), m);
  x.castShadow = true; return x;
}
function latheSeg(points, m, seg, phiStart, phiLength) {
  // segmen lathe — panel melengkung (kaos putih / strip resleting):
  // hanya sebagian putaran (phi 0 = depan +Z, searah LatheGeometry)
  const pts = points.map(p => new THREE.Vector2(p[0], p[1]));
  const x = new THREE.Mesh(new THREE.LatheGeometry(pts, seg, phiStart, phiLength), m);
  x.castShadow = true; return x;
}

export function countTriangles(group) {
  let n = 0;
  group.traverse(o => {
    if (o.isMesh && !o.userData.isProp) {
      const g = o.geometry;
      n += (g.index ? g.index.count : g.attributes.position.count) / 3;
    }
  });
  return n;
}

export const SENTENCES = [
  { id: 'pose1', scene: 'Adegan 1 — Hook', text: 'Di desa ini, ada satu larangan. Kalau pintu lumbung diketuk tiga kali lewat tengah malam... jangan pernah dibuka.', pose: 'larangan' },
  { id: 'pose2', scene: 'Adegan 2 — Asal-usul', text: 'Ingat, Najmi. Dulu ada penjaga yang membuka pintu itu. Besok paginya... separuh beras desa hilang.', pose: 'mendengarkan' },
  { id: 'pose3', scene: 'Adegan 3 — Sepi', text: 'Jam dua belas malam. Hujan baru berhenti. Semua sepi. Aku pikir... malam ini bakal aman-aman saja.', pose: 'mengantuk' },
  { id: 'pose4', scene: 'Adegan 4 — Ketukan 1 & 2', text: 'Tok... Tok... Dua kali. Jantungku berhenti sebentar. Siapa yang mengetuk pintu lumbung... jam segini?', pose: 'terkejut' },
  { id: 'pose5', scene: 'Adegan 5 — Ketukan ke-3', text: 'Tok... Kali ini yang ketiga. Lalu ada suara pelan memanggil namaku.', pose: 'mundur' },
  { id: 'pose6', scene: 'Adegan 6 — Tangan di gembok', text: 'Tanganku sudah di gembok. Tinggal tarik... aku bisa membuka pintu ini. Tapi kata Pak Kepala... jangan pernah dibuka.', pose: 'gembok' },
  { id: 'pose7', scene: 'Adegan 7 — Twist', text: 'Aku tidak membuka pintu. Aku mengintip dari celah papan... dan yang kulihat bukan hantu.', pose: 'mengintip' },
  { id: 'pose8', scene: 'Adegan 8 — Penutup', text: 'Kalau kamu jadi Najmi, pintu lumbungnya kamu buka atau tetap ditutup?', pose: 'tanya' },
];

const SKIN = 0xb57e4e, HAIR = 0x1d140d, DARK = 0x241a12; // v8: kulit SAWO MATANG (coklat hangat medium khas Indonesia; dulu 0xe0a866 peach terang)
const SCARF = 0xf2b234, GOLD = 0xf6c945;
const BROWN = 0x6b4a2f, BROWN_D = 0x5d3a24, CREAM = 0xf4ede0;

// ---------- bangun Najmi PURIN (mini-chara puding) ----------
// Total tinggi ~1.68 m. Kepala r 0.40 (diameter 0.80 = ~47% tinggi total).
// hips di y 0.46; badan puding lokal y -0.22..+0.36 (dunia 0.24..0.82);
// kepala pusat dunia y 1.22; kaki stub menempel di bawah puding.
export function buildNajmi() {
  const skin = mat(SKIN), hairM = mat(HAIR), dark = mat(DARK);
  const denimT = denimTex(); denimT.wrapS = denimT.wrapT = THREE.RepeatWrapping; denimT.repeat.set(3, 2);
  const denim = mat(0xffffff, denimT);
  const denimRibT = denimRibTex(); denimRibT.wrapS = denimRibT.wrapT = THREE.RepeatWrapping; denimRibT.repeat.set(2, 1);
  const denimRib = mat(0xffffff, denimRibT);
  const denimDark = mat(0x2c4f78); // saku + lipatan kerah — biru denim lebih gelap (kontras jelas)
  const teeM = mat(0xf7f7f2); // v7: kaos putih polos di dalam jaket
  const zipM = new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.4, metalness: 0.4 }); // v7: resleting
  const pantsM = mat(0xffffff, shortsTex());
  const shoeM = mat(0xffffff, shoeTex());
  const bagM = mat(0xffffff, bagTex());
  const lampM = new THREE.MeshStandardMaterial({ map: lanternTex(), emissive: 0xff9a2a, emissiveIntensity: 1.2, roughness: 0.8 });
  const white = mat(0xffffff), blushM = mat(0xf2a0ae), scarfM = mat(SCARF);
  const browM = mat(0x6b4a2f), mouthM = mat(0x7a4034); // alis + mulut v4: coklat lembut, BUKAN hitam pekat
  const irisM = mat(0x2f6fd0), irisInM = mat(0x7fb8ff); // v5: iris BIRU + iris dalam biru muda (ala Gambar 2)
  const mouthOpenM = mat(0x6b2a20); // v5: mulut "o" — isi mulut coklat-merah gelap
  const brown = mat(BROWN), brownD = mat(BROWN_D), goldM = mat(GOLD);
  const soleM = mat(0xb98d5e);

  const root = new THREE.Group();
  const hips = new THREE.Group(); hips.position.y = 0.46; root.add(hips);

  // BADAN PUDING: lathe trapesium lembut melebar ke bawah (flan) — satu
  // kesatuan torso + pinggul. Profil (radius, y) dari bawah ke atas.
  // BADAN PUDING = JAKET BIRU v7: lathe yang sama, sekarang bertekstur
  // DENIM biru medium (bukan sweater krem v6). Kaos putih di dalam
  // dibuat sebagai PANEL lathe di depan (jaket TERBUKA).
  const body = lathe([
    [0.00, -0.29], [0.20, -0.29], [0.30, -0.26], [0.335, -0.18],
    [0.34, -0.05], [0.325, 0.10], [0.295, 0.22], [0.26, 0.29], [0.00, 0.29],
  ], denim, 20);
  body.position.y = 0.07; hips.add(body);
  outline(body, 1.045);
  // KAOS PUTIH (dalam): panel lathe di depan, profil = badan +0.012,
  // phi ±0.42 rad (depan tengah) — kelihatan lewat jaket yang terbuka.
  // y -0.28..0.28 (ujung bawah sedikit di bawah hem jaket supaya putih
  // mengintip di bawah jaket).
  const tee = latheSeg([
    [0.245, -0.28], [0.321, -0.24], [0.347, -0.18], [0.352, -0.05],
    [0.337, 0.10], [0.307, 0.22], [0.277, 0.28],
  ], teeM, 10, -0.42, 0.84);
  tee.position.y = 0.07; hips.add(tee);
  // RESLETING: dua strip lathe tipis di tepi panel kaos (phi 0.42..0.52
  // dan -0.52..-0.42), profil = badan +0.018 — garis pembuka jaket.
  const zipProf = [
    [0.251, -0.28], [0.327, -0.24], [0.353, -0.18], [0.358, -0.05],
    [0.343, 0.10], [0.313, 0.22], [0.283, 0.28],
  ];
  const zipR = latheSeg(zipProf, zipM, 4, 0.42, 0.10); zipR.position.y = 0.07; hips.add(zipR);
  const zipL = latheSeg(zipProf, zipM, 4, -0.52, 0.10); zipL.position.y = 0.07; hips.add(zipL);
  // tarikan resleting kecil di atas strip kanan
  const zipPull = box(0.022, 0.04, 0.012, zipM); zipPull.position.set(0.136, 0.32, 0.272); zipPull.rotation.y = 0.47; hips.add(zipPull);
  // JAKET v7: kerah jaket TERBUKA — segmen silinder (celah di depan
  // ±0.55 rad supaya kaos putih kelihatan di leher) + dua lipatan kerah
  // (lapel) di depan. Kerah crewneck v6 DIHAPUS.
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.23, 0.06, 16, 1, true, 0.55, Math.PI * 2 - 1.1), denim);
  collar.position.y = 0.315; collar.castShadow = true; hips.add(collar);
  const lapelL = box(0.10, 0.09, 0.015, denimDark); lapelL.position.set(-0.16, 0.31, 0.24); lapelL.rotation.set(-0.5, 0.6, 0.25); hips.add(lapelL);
  const lapelR = box(0.10, 0.09, 0.015, denimDark); lapelR.position.set(0.16, 0.31, 0.24); lapelR.rotation.set(-0.5, -0.6, -0.25); hips.add(lapelR);
  // hem jaket biru (ribbed) di bawah badan — sama seperti v6 tapi biru
  const hem = new THREE.Mesh(new THREE.CylinderGeometry(0.345, 0.335, 0.05, 16, 1, true), denimRib);
  hem.position.y = -0.19; hem.castShadow = true; hips.add(hem);
  // saku jaket: saku dada (flap, kiri dada) + saku samping (flap, dekat hem).
  // Saku tan sweater v6 DIHAPUS.
  const chestPocket = box(0.10, 0.07, 0.018, denimDark); chestPocket.position.set(-0.17, 0.20, 0.272); chestPocket.rotation.y = -0.55; hips.add(chestPocket);
  const sidePocketL = box(0.09, 0.05, 0.018, denimDark); sidePocketL.position.set(-0.255, 0.01, 0.228); sidePocketL.rotation.y = 0.85; hips.add(sidePocketL);
  const sidePocketR = box(0.09, 0.05, 0.018, denimDark); sidePocketR.position.set(0.255, 0.01, 0.228); sidePocketR.rotation.y = -0.85; hips.add(sidePocketR);

  // tas selempang (lebih kecil, menempel di sisi puding): badan + flap + gesper + saku
  const bagG = new THREE.Group(); bagG.position.set(-0.30, 0.02, 0.10); bagG.rotation.z = -0.08; hips.add(bagG);
  const bagBody = rbox(0.16, 0.14, 0.07, bagM, 0.025, 1); bagG.add(bagBody);
  const bagFlap = box(0.16, 0.06, 0.02, brownD); bagFlap.position.set(0, 0.05, 0.04); bagG.add(bagFlap);
  const buckle = box(0.03, 0.03, 0.02, goldM); buckle.position.set(0, 0.025, 0.05); bagG.add(buckle);
  const bagPocket = box(0.07, 0.05, 0.015, brown); bagPocket.position.set(0, -0.04, 0.04); bagG.add(bagPocket);
  // tali selempang menyilang dada puding
  const strapCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0.20, 0.32, 0.10),
    new THREE.Vector3(0.02, 0.22, 0.30),
    new THREE.Vector3(-0.24, 0.12, 0.12)
  );
  const strap = new THREE.Mesh(new THREE.TubeGeometry(strapCurve, 12, 0.018, 6), brown);
  strap.castShadow = true; hips.add(strap);

  // syal kuning CHUNKY: cincin tebal + lipatan kedua + simpul + satu ekor menjuntai.
  // Kepala purin besar menutupi leher — cincin dibuat lebih besar + ekor lebih
  // panjang dan ke samping supaya syal tetap kelihatan di bawah dagu.
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.07, 8, 18), scarfM);
  scarf.position.y = 0.38; scarf.rotation.x = Math.PI / 2; scarf.castShadow = true; hips.add(scarf);
  const scarfFold = new THREE.Mesh(new THREE.TorusGeometry(0.215, 0.05, 8, 18), scarfM);
  scarfFold.position.y = 0.335; scarfFold.rotation.x = Math.PI / 2; scarfFold.castShadow = true; hips.add(scarfFold);
  const knot = rbox(0.08, 0.06, 0.05, scarfM, 0.02, 1);
  knot.position.set(0.10, 0.34, 0.21); hips.add(knot);
  const tail = rbox(0.10, 0.22, 0.045, scarfM, 0.018, 1);
  tail.position.set(0.14, 0.25, 0.27); tail.rotation.x = 0.08; tail.rotation.z = -0.08; hips.add(tail);

  // KEPALA — REVISI v5 (Master 2026-11-27, Gambar 1 — sheet konstruksi
  // kepala chibi JP): BUKAN bola sempurna dan BUKAN profil v2 yang dagunya
  // meruncing. Sekarang: bola BESAR sedikit LEBIH LEBAR dari tinggi
  // (lebar 0.85 vs tinggi 0.80), dagu/rahang lebih DATAR (radius tetap
  // besar sampai bawah, baru membulat di ujung), titik terlebar di
  // tengah/bawah-tengah (y -0.10, r 0.425). Wajah (mata/mulut/blush)
  // dipindah ke SETENGAH BAWAH kepala.
  const headG = new THREE.Group(); headG.position.y = 0.76; hips.add(headG);
  const head = lathe([
    [0.00, -0.40], [0.10, -0.398], [0.19, -0.385], [0.27, -0.355],
    [0.335, -0.31], [0.385, -0.25], [0.415, -0.18], [0.425, -0.10],
    [0.42, -0.02], [0.405, 0.06], [0.38, 0.14], [0.345, 0.22],
    [0.30, 0.29], [0.24, 0.345], [0.16, 0.385], [0.08, 0.395],
    [0.00, 0.40],
  ], skin, 24);
  headG.add(head);
  outline(head, 1.045);
  // PIPI TEMBEM menonjol ("ほっぺをつきだす") — tonjolan kulit di sisi wajah
  // supaya siluet wajah menggembung di level pipi, bukan oval polos.
  // v5: kepala lebih lebar, jadi pipi digeser ke luar (±0.335) supaya
  // tetap menonjol di sisi wajah.
  const cheekL = sph(0.11, skin, 12, 10); cheekL.scale.set(1, 0.85, 0.7); cheekL.position.set(-0.335, -0.06, 0.15); headG.add(cheekL);
  const cheekR = sph(0.11, skin, 12, 10); cheekR.scale.set(1, 0.85, 0.7); cheekR.position.set(0.335, -0.06, 0.15); headG.add(cheekR);
  // TELINGA kecil di samping kepala (seperti Gambar 1 + 2) — bulat kecil
  // pipih menempel di sisi kepala, di level tengah wajah (antara mata dan
  // mulut). Diposisikan di depan clump samping bawah supaya kelihatan.
  const earL = sph(0.055, skin, 10, 8); earL.scale.set(0.4, 1, 0.8); earL.position.set(-0.44, -0.14, 0.06); headG.add(earL);
  const earR = sph(0.055, skin, 10, 8); earR.scale.set(0.4, 1, 0.8); earR.position.set(0.44, -0.14, 0.06); headG.add(earR);
  // RAMBUT — REVISI v6 (Master 2026-11-27): KOREAN HAIRSTYLE — fluffy +
  // lembut, BUKAN spiky seperti v4. Clump runcing diganti PUFF: lathe
  // gelembung BULAT (pangkal lebar, UJUNG MEMBULAT), disusun fluffy:
  // mahkota bervolume, poni COMMA/CURTAIN (belah tengah lembut, poni
  // menyapu kiri-kanan + 2 comma curl di pelipis), samping lembut
  // membingkai wajah, belakang bervolume, + pusaran lembut di atas
  // (bukan jambul runcing). Siluet jadi BULAT/AWAN, bukan bergerigi.
  // Lapisan dalam (under-cap)
  // hanya volume dalam supaya tidak ada celah kulit antar clump —
  // siluet ditentukan clump, bukan cap. Under-cap = lathe mengikuti
  // PROFIL KEPALA (+0.02), bukan bola: bola r 0.40 ternyata MASUK ke
  // dalam kepala di dahi atas (kepala r 0.27-0.32 di y 0.22-0.30),
  // sehingga kulit kepala tetap kelihatan sebagai "ban kulit" antara
  // mahkota dan poni. Lathe ini berakhir di y 0.20 (di atas alis y 0.165,
  // tersembunyi di balik strand poni).
  // v5: profil mengikuti kepala BARU (+0.02) — kepala melebar di
  // y 0.20-0.40, jadi under-cap ikut melebar supaya tidak ada celah kulit
  // antar clump dan tidak menelan kepala.
  const hairUnder = lathe([
    [0.00, 0.20], [0.375, 0.20], [0.352, 0.24], [0.326, 0.28],
    [0.287, 0.32], [0.23, 0.36], [0.10, 0.395], [0.00, 0.405],
  ], hairM, 20);
  hairUnder.castShadow = true; headG.add(hairUnder);
  const _zAxis = new THREE.Vector3(0, 0, 1);
  function hairPuffGeo(r, len) {
    // gelembung BULAT lembut: lebar di tengah, ujung MEMBULAT (bukan runcing)
    const prof = [
      [0.00, 0.00], [0.70, 0.03], [0.92, 0.15], [1.00, 0.35],
      [0.96, 0.55], [0.80, 0.75], [0.55, 0.88], [0.28, 0.96], [0.00, 1.00],
    ].map(p => new THREE.Vector2(p[0] * r, p[1] * len));
    const g = new THREE.LatheGeometry(prof, 8); // 8 segmen (hemat tris — v5 tinggal 232)
    g.rotateX(Math.PI / 2); // sumbu +Y -> +Z (ujung membulat ke +Z)
    return g;
  }
  function hairPuff(r, len, root, dir) {
    const m = new THREE.Mesh(hairPuffGeo(r, len), hairM);
    m.position.set(root[0], root[1], root[2]);
    const d = new THREE.Vector3(dir[0], dir[1], dir[2]).normalize();
    m.quaternion.setFromUnitVectors(_zAxis, d);
    m.castShadow = true;
    headG.add(m);
    return m;
  }
  // MAHKOTA — puff bulat menyebar ke atas/luar, fluffy bervolume (bukan spiky)
  hairPuff(0.14, 0.24, [0, 0.36, 0.02], [0, 1, 0.1]);
  hairPuff(0.12, 0.23, [0.16, 0.32, 0.10], [0.45, 0.85, 0.3]);
  hairPuff(0.12, 0.23, [-0.16, 0.32, 0.10], [-0.45, 0.85, 0.3]);
  hairPuff(0.115, 0.22, [0.20, 0.28, -0.10], [0.5, 0.8, -0.3]);
  hairPuff(0.115, 0.22, [-0.20, 0.28, -0.10], [-0.5, 0.8, -0.3]);
  hairPuff(0.125, 0.23, [0, 0.34, -0.18], [0, 0.85, -0.5]);
  // penutup celah puncak — puff kecil di tengah atas supaya tidak ada
  // celah langit di antara puff mahkota
  hairPuff(0.09, 0.16, [0, 0.42, 0.05], [0, 1, 0.25]);
  // PONI COMMA/CURTAIN — belah tengah lembut: puff tengah lebih pendek
  // (belahan), puff kiri-kanan menyapu keluar dengan ujung melengkung
  hairPuff(0.10, 0.21, [-0.24, 0.29, 0.26], [-0.30, -0.80, 0.52]);
  hairPuff(0.10, 0.20, [-0.12, 0.31, 0.27], [-0.18, -0.86, 0.48]);
  hairPuff(0.09, 0.15, [0, 0.32, 0.28], [0, -0.88, 0.47]);
  hairPuff(0.10, 0.20, [0.12, 0.31, 0.27], [0.18, -0.86, 0.48]);
  hairPuff(0.10, 0.21, [0.24, 0.29, 0.26], [0.30, -0.80, 0.52]);
  // COMMA CURL — puff kecil di pelipis, menyapu keluar-bawah (koma Korea)
  hairPuff(0.07, 0.16, [-0.27, 0.26, 0.22], [-0.6, -0.6, 0.5]);
  hairPuff(0.07, 0.16, [0.27, 0.26, 0.22], [0.6, -0.6, 0.5]);
  // SAMPING — puff bulat jatuh di samping wajah, membingkai pipi sampai dekat telinga
  hairPuff(0.11, 0.32, [-0.30, 0.20, 0.12], [-0.35, -0.9, 0.25]);
  hairPuff(0.11, 0.32, [0.30, 0.20, 0.12], [0.35, -0.9, 0.25]);
  // v5: puff samping bawah digeser ke BELAKANG (z 0.02 -> -0.03, arah
  // z 0.1 -> 0.0) — supaya TELINGA baru di (±0.44, -0.14, 0.06) tidak
  // tertutup rambut dan kelihatan dari depan.
  hairPuff(0.105, 0.29, [-0.33, 0.10, -0.03], [-0.3, -0.95, 0.0]);
  hairPuff(0.105, 0.29, [0.33, 0.10, -0.03], [0.3, -0.95, 0.0]);
  // BELAKANG — puff bulat menutupi belakang kepala, bervolume lembut
  hairPuff(0.12, 0.34, [0, 0.28, -0.28], [0, -0.85, -0.5]);
  hairPuff(0.11, 0.30, [-0.18, 0.24, -0.26], [-0.3, -0.85, -0.45]);
  hairPuff(0.11, 0.30, [0.18, 0.24, -0.26], [0.3, -0.85, -0.45]);
  // PUSARAN LEMBUT — satu puff rebah di atas kepala, melengkung halus
  // (bukan jambul runcing)
  hairPuff(0.075, 0.19, [0.02, 0.40, 0.0], [0.5, 0.7, 0.35]);
  // lampu hangat di depan wajah
  const faceLight = new THREE.PointLight(0xffe6c0, 3.5, 3, 1.5);
  faceLight.position.set(0, 0.05, 1.0); headG.add(faceLight);

  // wajah — REVISI v5 (Master 2026-11-27, Gambar 2 + 3): wajah seperti
  // chart ekspresi Q版 + Haneno Hata. MATA BESAR + DETAIL berlapis:
  // sklera putih, IRIS BIRU + iris dalam biru muda, pupil, HIGHLIGHT
  // (besar + kecil), dan GARIS BULU MATA ATAS (busur tipis gelap — seperti
  // Gambar 2/3, tapi tipis, bukan berat seperti v3). Grup mata diputar
  // mengikuti lengkung kepala (rotation.y ±0.36) supaya bulu mata + iris
  // menempel di permukaan wajah yang melengkung, bukan mengambang.
  // Wajah di SETENGAH BAWAH kepala (Gambar 1): mata y -0.03, mulut y -0.20.
  function eye(side) {
    const g = new THREE.Group(); g.position.set(0.15 * side, -0.03, 0.375); g.rotation.y = side * 0.36; headG.add(g);
    const w = sph(0.08, white, 14, 12); w.scale.z = 0.5; g.add(w);
    const iris = sph(0.052, irisM, 12, 10); iris.scale.z = 0.35; iris.position.z = 0.028; g.add(iris);
    const irisIn = sph(0.038, irisInM, 10, 8); irisIn.scale.z = 0.35; irisIn.position.z = 0.036; g.add(irisIn);
    const p = sph(0.027, dark, 10, 8); p.scale.z = 0.35; p.position.z = 0.045; g.add(p);
    const h = sph(0.013, white, 8, 6); h.position.set(-0.022, 0.022, 0.050); g.add(h);
    const h2 = sph(0.007, white, 6, 5); h2.position.set(0.020, -0.020, 0.050); g.add(h2);
    // garis bulu mata atas — busur tipis gelap mengikuti tepi atas sklera
    const lash = new THREE.Mesh(new THREE.TorusGeometry(0.078, 0.005, 5, 14, 2.0), dark);
    lash.position.set(0, 0.005, 0.018); lash.rotation.z = 0.57; lash.castShadow = true; g.add(lash);
    return g;
  }
  const eyeL = eye(-1), eyeR = eye(1);
  // BLUSH v5: LEBIH BESAR + LEMBUT + PINK (seperti Gambar 3 — blush besar
  // sangat menonjol), r 0.05 -> 0.07, oval lebar, diputar mengikuti
  // lengkung pipi.
  const chL = sph(0.07, blushM, 12, 10); chL.scale.set(1.15, 0.75, 0.4); chL.rotation.y = -0.5; chL.position.set(-0.27, -0.13, 0.31); headG.add(chL);
  const chR = sph(0.07, blushM, 12, 10); chR.scale.set(1.15, 0.75, 0.4); chR.rotation.y = 0.5; chR.position.set(0.27, -0.13, 0.31); headG.add(chR);
  // hidung kecil — dipindah ke bawah mengikuti wajah (y -0.10) + ke depan
  // mengikuti kepala yang melebar
  const nose = sph(0.022, mat(0xc98a4a), 8, 6); nose.scale.z = 0.5; nose.position.set(0, -0.10, 0.425); headG.add(nose);
  // MULUT v5: SANGAT KECIL + BERVARIASI — 3 bentuk, dipilih per pose
  // (bukan 1 bola untuk semua): garis (larangan/mendengarkan/mundur/
  // gembok/mengintip), "o" kecil (terkejut/mengantuk), senyum ⌣ (tanya).
  // Basis r 0.04 -> 0.03 (lebih kecil dari v4), posisi y -0.20.
  const mouth = sph(0.03, mouthM, 12, 10); mouth.scale.set(1.2, 0.25, 0.4); mouth.position.set(0, -0.20, 0.405); headG.add(mouth);
  const mouthO = sph(0.022, mouthOpenM, 12, 10); mouthO.scale.set(0.9, 1.15, 0.4); mouthO.position.set(0, -0.20, 0.408); mouthO.visible = false; headG.add(mouthO);
  const mouthSmile = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.007, 5, 12, Math.PI), mouthM);
  mouthSmile.position.set(0, -0.20, 0.408); mouthSmile.rotation.z = Math.PI; // busur bawah (⌣) = senyum
  mouthSmile.castShadow = true; mouthSmile.visible = false; headG.add(mouthSmile);
  // lidah — hanya kelihatan saat mulut terbuka (terkejut/mengantuk/tanya),
  // di bawah mulut (y -0.24 mengikuti mulut yang turun)
  const tongue = sph(0.024, mat(0xe88a96), 10, 8);
  tongue.scale.set(1.2, 0.6, 0.3); tongue.position.set(0, -0.24, 0.395); tongue.visible = false; headG.add(tongue);
  // ALIS v5: TIPIS + MELENGKUNG + TINGGI (seperti Gambar 3) — BUKAN kotak
  // v4, tapi BUSUR (torus tipis, ∩) di atas mata dengan jarak yang lebar.
  // Grup alis diputar mengikuti lengkung kepala (rotation.y ±0.28).
  // Bentuk tetap bervariasi per pose lewat rotation.z (ujung dalam turun
  // = tegas; ujung dalam naik = terkejut/penasaran).
  function brow(side) {
    const g = new THREE.Group(); g.position.set(0.15 * side, 0.10, 0.375); g.rotation.y = side * 0.28; headG.add(g);
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.005, 5, 14, 1.7), browM);
    arc.rotation.z = 0.72; // busur atas (∩)
    arc.castShadow = true; g.add(arc);
    return g;
  }
  const browL = brow(-1), browR = brow(1);

  // TANGAN — REVISI v3 (Master 2026-11-27): di referensi tangan itu GEMBUL
  // (seperti mochi/sosis kecil) — v2 masih ramping (r 0.085). Sekarang
  // kapsul DIGEMUKKAN SIGNIFIKAN (r 0.12/0.115) + dipendekkan sedikit
  // supaya makin gembul (gemuk + pendek), tangan mitten lebih besar +
  // lebih bulat. Bahu tetap di luar (±0.34) supaya kelihatan.
  // v7: lengan = LENGAN JAKET biru — kapsul bertekstur denim (bukan
  // rajutan krem), + MANSET biru di pergelangan; tangan mitten kulit
  // keluar dari ujung lengan.
  function arm(side) {
    const sh = new THREE.Group(); sh.position.set(0.34 * side, 0.30, 0.04); hips.add(sh);
    const up = capsule(0.12, 0.05, denim); up.position.y = -0.10; sh.add(up);
    const el = new THREE.Group(); el.position.y = -0.20; sh.add(el);
    const fo = capsule(0.115, 0.05, denim); fo.position.y = -0.10; el.add(fo);
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.13, 0.05, 12, 1, true), denimRib);
    cuff.position.y = -0.185; cuff.castShadow = true; el.add(cuff);
    const hand = rbox(0.18, 0.17, 0.16, skin, 0.05, 1); hand.position.y = -0.22; el.add(hand);
    const thumb = capsule(0.032, 0.04, skin, 2, 6);
    thumb.position.set(-0.075 * side, -0.20, 0.04); thumb.rotation.z = 0.5 * side; thumb.rotation.x = -0.3; el.add(thumb);
    // telunjuk (hanya kelihatan di pose larangan — menunjuk ke atas)
    const finger = box(0.06, 0.16, 0.06, skin); finger.position.y = -0.30; finger.visible = false; el.add(finger);
    return { sh, el, finger };
  }
  const armL = arm(-1), armR = arm(1);

  // KAKI — REVISI v3 (Master 2026-11-27): di referensi kaki itu GEMBUL
  // (paha + betis seperti mochi) — v2 masih ramping (r 0.085/0.08).
  // Sekarang kapsul DIGEMUKKAN SIGNIFIKAN (r 0.12/0.115) + dipendekkan
  // sedikit, sepatu merah lebih besar + lebih bulat (0.21×0.12×0.29).
  // Paha tetap tersembunyi di dalam puding (sesuai referensi — kaki
  // menempel di puding), betis + sepatu gemuk kelihatan jelas di bawah.
  function leg(side) {
    const hp = new THREE.Group(); hp.position.set(0.16 * side, -0.12, 0); hips.add(hp);
    const th = capsule(0.12, 0.04, brown); th.position.y = -0.08; hp.add(th);
    const kn = new THREE.Group(); kn.position.y = -0.16; hp.add(kn);
    const sn = capsule(0.115, 0.02, brown); sn.position.y = -0.07; kn.add(sn);
    // sepatu merah GEMBUL + sol gum — lebih besar supaya kebaca dari depan
    const ft = rbox(0.21, 0.12, 0.29, shoeM, 0.035, 1); ft.position.set(0, -0.12, 0.04); kn.add(ft);
    const sole = box(0.22, 0.035, 0.30, soleM); sole.position.set(0, -0.16, 0.04); kn.add(sole);
    return { hp, kn };
  }
  const legL = leg(-1), legR = leg(1);

  // lentera di tangan kiri (lebih kecil dari blocky) — rangka + kaca + pegangan + cahaya hangat
  // lentera digeser ke depan (z 0.06) + kaca diperbesar supaya tidak tertutup
  // badan puding yang lebar — sebelumnya hampir tidak kelihatan dari depan.
  const lantern = new THREE.Group(); lantern.position.set(0, -0.22, 0.06); armL.el.add(lantern);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.01, 6, 10, Math.PI), dark);
  handle.position.y = 0.01; handle.castShadow = true; lantern.add(handle);
  const lampRoof = new THREE.Mesh(new THREE.ConeGeometry(0.078, 0.05, 4), dark);
  lampRoof.position.y = -0.03; lampRoof.rotation.y = Math.PI / 4; lampRoof.castShadow = true; lantern.add(lampRoof);
  const lampTop = box(0.12, 0.015, 0.12, dark); lampTop.position.y = -0.05; lantern.add(lampTop);
  const lampGlass = box(0.105, 0.12, 0.105, lampM); lampGlass.position.y = -0.10; lantern.add(lampGlass);
  for (const [fx, fz] of [[-0.052, -0.052], [0.052, -0.052], [-0.052, 0.052], [0.052, 0.052]]) {
    const post = box(0.01, 0.13, 0.01, dark); post.position.set(fx, -0.10, fz); lantern.add(post);
  }
  const lampBottom = box(0.12, 0.015, 0.12, dark); lampBottom.position.y = -0.16; lantern.add(lampBottom);
  const lampLight = new THREE.PointLight(0xffa63d, 10, 5, 1.8); lampLight.position.y = -0.10; lantern.add(lampLight);

  // gembok (prop, hanya kelihatan di pose 6) — lebih rendah dari blocky (purin lebih pendek)
  const padlock = new THREE.Group();
  const lockBody = box(0.18, 0.16, 0.05, new THREE.MeshStandardMaterial({ color: 0xd4a017, roughness: 0.5, metalness: 0.3 }));
  padlock.add(lockBody);
  const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.015, 6, 10, Math.PI), dark);
  shackle.position.y = 0.10; padlock.add(shackle);
  padlock.position.set(0, 0.75, 0.38); padlock.visible = false; root.add(padlock);
  padlock.traverse(o => { o.userData.isProp = true; });

  const joints = { root, hips, head: headG, shL: armL.sh, elL: armL.el, shR: armR.sh, elR: armR.el, hipL: legL.hp, kneeL: legL.kn, hipR: legR.hp, kneeR: legR.kn, eyeL, eyeR, mouth, mouthO, mouthSmile, tongue, browL, browR, lantern, lampLight, fingerR: armR.finger, padlock };
  const tris = countTriangles(root);
  return { group: root, joints, tris };
}

// ---------- pose (konvensi sama seperti character.js & blocky:
// ke depan = rotasi x negatif, lutut = x positif) ----------
// rootY disesuaikan untuk purin (hips di 0.46, bukan 0.60):
// - mengantuk (duduk おすわり): rootY -0.18 — alas puding menyentuh tanah,
//   kaki stub terlipat ke depan (bukan -0.58 seperti blocky, itu akan menenggelamkan puding).
// - mengintip (jongkok): rootY -0.12, kaki terlipat sebagian.
// EKSPRESI — REVISI v5: mulut + alis BERVARIASI per pose (bukan satu
// bentuk untuk semua). Mulut punya 3 BENTUK (`mouthType`): 'line' (garis
// kecil tegas/netral), 'o' ("o" kecil terbuka), 'smile' (senyum ⌣ kecil).
// Semua mulut SANGAT KECIL (ala Gambar 2/3 — mulut chart itu kecil banget).
// Konvensi alis (rotasi z): browL negatif / browR positif = ujung dalam
// turun = tegas/konsentrasi; sebaliknya = ujung dalam naik =
// terkejut/khawatir/penasaran. `tongue` = lidah kelihatan (0 = sembunyi)
// saat mulut terbuka lebar.
const P = {
  larangan:     { rootY: 0, hipsX: 0, headX: 0.15, headZ: 0, shL: [-0.5, 0, 0.15], elL: [-1.2, 0, 0], shR: [-2.1, 0, -1.0], elR: [-0.2, 0, 0], hipL: [0, 0, 0.08], hipR: [0, 0, -0.08], kneeL: 0, kneeR: 0, eyes: 1, mouthType: 'line', mouth: [1.2, 0.25], brows: [-0.35, 0.35], tongue: 0 },
  mendengarkan: { rootY: 0, hipsX: 0.08, headX: 0.1, headZ: 0.28, headY: -0.2, shL: [0.15, 0, 0.1], elL: [-0.3, 0, 0], shR: [-0.6, 0, 0], elR: [-1.9, 0, 0], hipL: [0, 0, 0.06], hipR: [0, 0, -0.06], kneeL: 0.1, kneeR: 0.1, eyes: 1, mouthType: 'line', mouth: [1.0, 0.3], brows: [0.15, -0.05], tongue: 0 },
  mengantuk:    { rootY: -0.18, hipsX: 0.12, headX: 0.45, headZ: 0.12, shL: [0.3, 0, 0.1], elL: [-0.2, 0, 0], shR: [0.25, 0, -0.1], elR: [-0.9, 0, 0], hipL: [-1.4, 0, 0.45], hipR: [-1.4, 0, -0.45], kneeL: 0.2, kneeR: 0.2, eyes: 0.15, mouthType: 'o', mouth: [0.9, 1.15], brows: [0.15, -0.15], tongue: 0.8 },
  terkejut:     { rootY: -0.03, hipsX: -0.12, headX: -0.15, headZ: 0, shL: [-1.9, 0, -0.7], elL: [-0.2, 0, 0], shR: [-1.9, 0, 0.7], elR: [-0.2, 0, 0], hipL: [-0.1, 0, 0.1], hipR: [-0.1, 0, -0.1], kneeL: 0.25, kneeR: 0.25, eyes: 1.2, mouthType: 'o', mouth: [0.85, 1.1], brows: [0.35, -0.35], tongue: 1.0 },
  mundur:       { rootY: 0, hipsX: -0.18, headX: -0.1, headZ: 0, headY: 0.35, shL: [-1.1, 0, 0.3], elL: [-1.6, 0, 0], shR: [-0.4, 0, 0], elR: [-1.8, 0, 0], hipL: [0.35, 0, 0.08], hipR: [-0.25, 0, -0.08], kneeL: 0.3, kneeR: 0.35, eyes: 1.15, mouthType: 'line', mouth: [0.9, 0.35], brows: [0.3, -0.3], tongue: 0.3 },
  gembok:       { rootY: -0.05, hipsX: 0.3, headX: 0.45, headZ: 0, shL: [-1.25, 0, 0.25], elL: [-0.5, 0, 0], shR: [-1.25, 0, -0.25], elR: [-0.5, 0, 0], hipL: [-0.15, 0, 0.08], hipR: [-0.15, 0, -0.08], kneeL: 0.3, kneeR: 0.3, eyes: 1, mouthType: 'line', mouth: [1.0, 0.3], brows: [-0.25, 0.25], padlock: true, lamp: 1.5, tongue: 0 },
  mengintip:    { rootY: -0.12, hipsX: 0.15, headX: 0.1, headZ: 0, headY: 0.35, shL: [-2.0, 0, 0.2], elL: [-0.4, 0, 0], shR: [-0.9, 0, 0], elR: [-1.7, 0, 0], hipL: [-0.9, 0, 0.12], hipR: [-0.9, 0, -0.12], kneeL: 0.9, kneeR: 0.9, eyes: 1.1, mouthType: 'line', mouth: [1.0, 0.3], brows: [-0.12, 0.12], lamp: 4, tongue: 0 },
  tanya:        { rootY: 0, hipsX: 0, headX: 0, headZ: 0.18, shL: [-0.9, 0, -0.9], elL: [-0.9, 0, 0], shR: [-0.9, 0, 0.9], elR: [-0.9, 0, 0], hipL: [0, 0, 0.08], hipR: [0, 0, -0.08], kneeL: 0.05, kneeR: 0.05, eyes: 1, mouthType: 'smile', mouth: [1.0, 1.0], brows: [0.35, -0.1], tongue: 0.5 },
};
export function applyPose(j, name) {
  const p = P[name];
  const set = (g, r) => { if (g && r) g.rotation.set(r[0], r[1] || 0, r[2] || 0); };
  j.root.position.y = p.rootY;
  j.hips.rotation.set(p.hipsX, 0, 0);
  j.head.rotation.set(p.headX, p.headY || 0, p.headZ);
  set(j.shL, p.shL); set(j.elL, p.elL); set(j.shR, p.shR); set(j.elR, p.elR);
  set(j.hipL, p.hipL); set(j.hipR, p.hipR);
  j.kneeL.rotation.x = p.kneeL; j.kneeR.rotation.x = p.kneeR;
  j.eyeL.scale.y = p.eyes; j.eyeR.scale.y = p.eyes;
  // mulut v5: 3 bentuk, dipilih per pose — hanya yang aktif yang kelihatan
  const mt = p.mouthType || 'line';
  j.mouth.visible = (mt === 'line');
  j.mouthO.visible = (mt === 'o');
  j.mouthSmile.visible = (mt === 'smile');
  if (mt === 'line') j.mouth.scale.set(p.mouth[0], p.mouth[1], 0.4);
  if (mt === 'o') j.mouthO.scale.set(p.mouth[0], p.mouth[1], 0.4);
  if (mt === 'smile') j.mouthSmile.scale.set(p.mouth[0], p.mouth[1], 1);
  // lidah kelihatan hanya saat mulut terbuka lebar (p.tongue > 0)
  const t = p.tongue || 0;
  j.tongue.visible = t > 0;
  if (t > 0) j.tongue.scale.set(0.9 * t, 0.45 * t, 0.3);
  j.browL.rotation.z = p.brows[0]; j.browR.rotation.z = p.brows[1];
  j.padlock.visible = !!p.padlock;
  j.fingerR.visible = (name === 'larangan');
  j.lampLight.intensity = p.lamp || 10;
}
