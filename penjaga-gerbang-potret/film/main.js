// Sehari Jadi Penjaga Gerbang Kota — HD-2D, satu diorama, satu hari (fajar → malam)
import * as THREE from 'three';
import { makePost } from './post_ts.js';
const Q = new URLSearchParams(location.search);
if (Q.has('sheet')) {
  const cv = document.getElementById('ov'); cv.width = innerWidth; cv.height = innerHeight;
  (await import('./sheetdebug.js')).sheet(Q, cv); window.DUR = 1; window.render = () => {}; window.READY = true;
} else {
  const { buildWorld } = await import('./world.js'), { buildStory } = await import('./story.js');
  const T = await (await fetch('timing.json')).json(), LEAD = +(Q.get('lead') ?? 3.0);
  await Promise.all(['italic 40px "IM Fell English"', '40px "Cinzel"', 'italic 40px "Cormorant Garamond"'].map(f => document.fonts.load(f, 'Sehari Jadi Penjaga Gerbang Kota')));
  const W = innerWidth, H = innerHeight, SS = +(Q.get('ss') ?? 1), S = Math.min(W, H) / 1080, PT = H > W;
  const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; document.getElementById('stage').appendChild(renderer.domElement);
  const ov = document.getElementById('ov'); ov.width = W; ov.height = H; const g = ov.getContext('2d');
  const camera = new THREE.PerspectiveCamera(30, W / H, .3, 2000);
  const world = buildWorld(Q), story = buildStory(world, T, LEAD);
  const post = makePost(renderer, world.scene, camera, W, H, { ssaa: SS, ao: true });
  const rim = new THREE.DirectionalLight('#ffd2a0', 0), rimD = new THREE.Vector3(), cW = new THREE.Color('#ffd2a0'), cC = new THREE.Color('#86a2ff'); world.scene.add(rim, rim.target);
  const V = post.vig.uniforms; V.amt.value = .6; V.warm.value = .1;
  const caps = T.captions.map(c => ({ ...c, t0: c.t0 + LEAD, t1: c.t1 + LEAD }));
  window.DUR = story.DUR;
  const alpha = (t, a, b, fi = .2, fo = .2) => Math.max(0, Math.min(1, (t - a) / fi, (b - t) / fo));
  const wrap = (txt, mw) => { const ws = txt.split(' '), L = []; let l = ''; for (const w of ws) { const n = l ? l + ' ' + w : w; if (l && g.measureText(n).width > mw) { L.push(l); l = w; } else l = n; } L.push(l); return L; };
  function overlay(t) {
    g.clearRect(0, 0, W, H); g.textAlign = 'center'; g.textBaseline = 'middle';
    // judul
    const ta = alpha(t, .5, 4.9, 1.1, 1.4);
    if (ta > 0) { g.globalAlpha = ta; g.fillStyle = '#f4e8cc'; g.shadowColor = 'rgba(8,6,16,.85)'; g.shadowBlur = 18 * S; g.font = `${(PT ? 74 : 68) * S}px Cinzel`; const tl = PT ? wrap('SEHARI JADI PENJAGA GERBANG KOTA', W * .86) : ['SEHARI JADI PENJAGA GERBANG KOTA'], ty = H * (PT ? .13 : .17), lh = 84 * S; tl.forEach((x, i) => g.fillText(x, W / 2, ty + i * lh));
      g.font = `italic ${(PT ? 38 : 34) * S}px \"Cormorant Garamond\"`; g.fillStyle = '#e8d4a8'; const sl = PT ? wrap('satu hari, satu gerbang, satu nama yang tak ditulis siapa pun', W * .8) : ['satu hari, satu gerbang, satu nama yang tak ditulis siapa pun']; sl.forEach((x, i) => g.fillText(x, W / 2, ty + tl.length * lh - 14 * S + i * 46 * S)); g.shadowBlur = 0; }
    // bab
    for (const [tc, num, nm] of story.chapters) { const a = alpha(t, tc, tc + 3.6, .7, .9); if (a <= 0) continue; g.globalAlpha = a; g.textAlign = 'left'; g.shadowColor = 'rgba(8,6,16,.85)'; g.shadowBlur = 14 * S; g.fillStyle = '#e6c26a'; g.font = `${30 * S}px Cinzel`; g.fillText(num, 70 * S, 78 * S); g.fillStyle = '#f4e8cc'; g.font = `italic ${52 * S}px "Cormorant Garamond"`; g.fillText(nm, 70 * S, 128 * S); g.fillStyle = '#e6c26a'; g.fillRect(70 * S, 160 * S, 120 * S * Math.min(1, (t - tc) / .9), 2 * S); g.shadowBlur = 0; g.textAlign = 'center'; }
    // caption
    for (const c of caps) { if (t < c.t0 - .2 || t > c.t1 + .2) continue; const a = alpha(t, c.t0 - .12, c.t1, .22, .2); if (a <= 0) continue; g.globalAlpha = a; g.font = `italic ${(PT ? 54 : 50) * S}px \"IM Fell English\"`; g.lineJoin = 'round'; g.lineWidth = 7 * S; g.strokeStyle = 'rgba(10,8,20,.82)'; g.fillStyle = '#f6ecd2';
      const L = PT ? wrap(c.text, W * .88) : [c.text], lh = 64 * S, y0 = PT ? H - 300 * S - (L.length - 1) * lh : H * .9;   // potret: di atas area UI platform
      L.forEach((x, k) => { g.strokeText(x, W / 2, y0 + k * lh); g.fillText(x, W / 2, y0 + k * lh); }); }
    // fade hitam: awal, akhir, titik "dip"
    let f = Math.max(1 - t / 1.1, (t - (story.DUR - 2.2)) / 2.2); for (const d of story.dips) f = Math.max(f, 1 - Math.abs(t - d) / .32);
    if (f > 0) { g.globalAlpha = Math.min(1, f); g.fillStyle = '#000'; g.fillRect(0, 0, W, H); } g.globalAlpha = 1;
  }
  window.render = t => {
    const st = story.update(t, camera, W, H);
    renderer.toneMappingExposure = st.exp; post.bloom.strength = st.bloom; post.bloom.radius = .75; post.bloom.threshold = .92;
    V.contrast.value = .32; V.sat.value = 1.15; V.warm.value = .14; V.amt.value = .66;   // grading sinematik halus
    post.dof.aoAmt = .85; world.fill.intensity *= .75;   // bayangan kontak di sudut/dasar objek
    rimD.copy(st.tgt).sub(camera.position).setY(0).normalize(); rim.position.copy(st.tgt).addScaledVector(rimD, 9).add(new THREE.Vector3(2.5, 6, 0)); rim.target.position.copy(st.tgt); rim.target.updateMatrixWorld();
    rim.color.copy(cW).lerp(cC, Math.min(1, st.dk)); rim.intensity = st.sharp ? .3 : .8 + .3 * st.dk;   // tepi terang tipis dari belakang
    post.dof.scene = world.scene; post.dof.aper = 4 * Math.min(1, W / 1920);   // blur dalam piksel → skala ke lebar frame (potret 1080 px = 56% dari 1920) post.dof.tiltAmt = st.sharp ? 2.5 : (PT ? 4 : 11); post.dof.tiltC = story.tiltC(camera); post.dof.tiltW = PT ? .3 : .15; post.dof.tiltF = PT ? .5 : .3; post.dof.maxCoc = Math.round(24 * S);
    if (!Q.has('dof')) post.dof.maxCoc = 0;   // tanpa blur (DOF + tilt-shift); tambah ?dof=1 di --q untuk menyalakan lagi
    post.composer.render(); overlay(t);
  };
  window.__dbg = t => { story.update(t, camera, W, H); return JSON.stringify({cam: camera.position.toArray().map(v=>+v.toFixed(2)), fov: camera.fov}); };
  window.READY = true;
}
