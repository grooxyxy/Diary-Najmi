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
  const W = innerWidth, H = innerHeight, SS = +(Q.get('ss') ?? 1), S = W / 1920;
  const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; document.getElementById('stage').appendChild(renderer.domElement);
  const ov = document.getElementById('ov'); ov.width = W; ov.height = H; const g = ov.getContext('2d');
  const camera = new THREE.PerspectiveCamera(30, W / H, .3, 2000);
  const world = buildWorld(Q), story = buildStory(world, T, LEAD);
  const post = makePost(renderer, world.scene, camera, W, H, { ssaa: SS });
  const V = post.vig.uniforms; V.amt.value = .6; V.warm.value = .1;
  const caps = T.captions.map(c => ({ ...c, t0: c.t0 + LEAD, t1: c.t1 + LEAD }));
  window.DUR = story.DUR;
  const alpha = (t, a, b, fi = .2, fo = .2) => Math.max(0, Math.min(1, (t - a) / fi, (b - t) / fo));
  function overlay(t) {
    g.clearRect(0, 0, W, H); g.textAlign = 'center'; g.textBaseline = 'middle';
    // judul
    const ta = alpha(t, .5, 4.9, 1.1, 1.4);
    if (ta > 0) { g.globalAlpha = ta; g.fillStyle = '#f4e8cc'; g.shadowColor = 'rgba(8,6,16,.85)'; g.shadowBlur = 18 * S; g.font = `${68 * S}px Cinzel`; g.fillText('SEHARI JADI PENJAGA GERBANG KOTA', W / 2, H * .17); g.font = `italic ${34 * S}px "Cormorant Garamond"`; g.fillStyle = '#e8d4a8'; g.fillText('satu hari, satu gerbang, satu nama yang tak ditulis siapa pun', W / 2, H * .17 + 62 * S); g.shadowBlur = 0; }
    // bab
    for (const [tc, num, nm] of story.chapters) { const a = alpha(t, tc, tc + 3.6, .7, .9); if (a <= 0) continue; g.globalAlpha = a; g.textAlign = 'left'; g.shadowColor = 'rgba(8,6,16,.85)'; g.shadowBlur = 14 * S; g.fillStyle = '#e6c26a'; g.font = `${30 * S}px Cinzel`; g.fillText(num, 70 * S, 78 * S); g.fillStyle = '#f4e8cc'; g.font = `italic ${52 * S}px "Cormorant Garamond"`; g.fillText(nm, 70 * S, 128 * S); g.fillStyle = '#e6c26a'; g.fillRect(70 * S, 160 * S, 120 * S * Math.min(1, (t - tc) / .9), 2 * S); g.shadowBlur = 0; g.textAlign = 'center'; }
    // caption
    for (const c of caps) { if (t < c.t0 - .2 || t > c.t1 + .2) continue; const a = alpha(t, c.t0 - .12, c.t1, .22, .2); if (a <= 0) continue; g.globalAlpha = a; g.font = `italic ${50 * S}px "IM Fell English"`; g.lineJoin = 'round'; g.lineWidth = 7 * S; g.strokeStyle = 'rgba(10,8,20,.82)'; g.strokeText(c.text, W / 2, H * .9); g.fillStyle = '#f6ecd2'; g.fillText(c.text, W / 2, H * .9); }
    // fade hitam: awal, akhir, titik "dip"
    let f = Math.max(1 - t / 1.1, (t - (story.DUR - 2.2)) / 2.2); for (const d of story.dips) f = Math.max(f, 1 - Math.abs(t - d) / .32);
    if (f > 0) { g.globalAlpha = Math.min(1, f); g.fillStyle = '#000'; g.fillRect(0, 0, W, H); } g.globalAlpha = 1;
  }
  window.render = t => {
    const st = story.update(t, camera, W, H);
    renderer.toneMappingExposure = st.exp; post.bloom.strength = st.bloom; post.bloom.radius = .75; post.bloom.threshold = .92;
    V.contrast.value = .28; V.sat.value = 1.2;
    post.dof.scene = world.scene; post.dof.tiltAmt = st.sharp ? 2.5 : 11; post.dof.tiltC = story.tiltC(camera); post.dof.tiltW = .15; post.dof.tiltF = .3; post.dof.maxCoc = Math.round(24 * H / 1080);
    if (Q.has('nodof')) post.dof.maxCoc = 0;
    post.composer.render(); overlay(t);
  };
  window.__dbg = t => { story.update(t, camera, W, H); return JSON.stringify({cam: camera.position.toArray().map(v=>+v.toFixed(2)), fov: camera.fov}); };
  window.READY = true;
}
