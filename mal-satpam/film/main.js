import * as THREE from 'three';
import { makePost } from './post_ts.js';
import { buildMall } from './mall.js';
import { makeCaptions, captionsReady } from './captions.js';
import { drawOverlay, overlayReady } from './ui.js';
import { W, H, PORTRAIT, SAFE, PX as PXS, fitFov } from './frame.js';
import * as WD from './world.js';
import { CAMS, focusPoint } from './cams.js';
const Q = new URLSearchParams(location.search);
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = +(Q.get('exp') ?? 1.4);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('stage').appendChild(renderer.domElement);
const camera = new THREE.PerspectiveCamera(32, W / H, .3, 600);
const mall = buildMall();
const post = makePost(renderer, mall.scene, camera, W, H, { ssaa: +(Q.get('ss') ?? 1) });
post.dof.px = PXS; post.bloom.strength = .6; post.bloom.radius = .7; post.bloom.threshold = .8;
const V = post.vig.uniforms; V.vx.value = PORTRAIT ? 1.0 : 1.25; V.amt.value = .6; V.warm.value = 0; V.contrast.value = .24; V.sat.value = 1.12;

// —— caption: potongan dari lines.json, tampil tanpa tumpang-tindih ——
const data = await (await fetch('data/lines.json')).json();
const chunks = []; data.lines.forEach((L, li) => L.chunks.forEach((c, ci) => chunks.push({ ...c, li, ci, lb: L.b })));
const lines = [], durs = {};
chunks.forEach((c, i) => {   // jendela tampil: [t0-.08, awal potongan berikut+.02]; tanpa tumpang-tindih yang berarti
  const nx = chunks[i + 1], end = nx ? Math.min(nx.t0 + .02, c.t1 + 1.3) : c.t1 + .6, id = 'c' + i;
  lines.push({ id, kind: 'narr', t: c.t0 + .27, text: c.text }); durs[id] = Math.max(.01, end - .6 - (c.t0 + .27));
});
await captionsReady(); await overlayReady();
const CAPS = makeCaptions({ lines, durs, safe: PORTRAIT ? SAFE : null });
window.TEXTS = t => CAPS.texts(t);
window.DUR = WD.DUR;

const hold = new THREE.Vector3(), prj = new THREE.Vector3();
let lastT = -1;
window.render = t => {
  const shot = WD.shotAt(t), C = CAMS[shot.id], q = (k, d) => (Q.has(k) ? +Q.get(k) : d);
  const p = C.p(t), l = C.l(t);
  camera.position.set(...p); camera.lookAt(...l); camera.fov = fitFov(C.fov); camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
  const hero = mall.update(t, camera);
  const fp = focusPoint(shot, t, hero, camera); hold.set(...fp);
  post.dof.focus = camera.position.distanceTo(hold); post.dof.aper = C.aper * q('aper', 1); post.dof.maxCoc = q('coc', 18);
  prj.copy(hold).project(camera); post.dof.tiltAmt = q('tilt', C.tilt ?? 10); post.dof.tiltC = Math.min(.8, Math.max(.2, prj.y * .5 + .5)); post.dof.tiltW = .08; post.dof.tiltF = .32;
  mall.SK.mesh.position.copy(camera.position);
  mall.scene.fog.density = shot.id === 'wide' ? .0062 : .0085;
  post.composer.render();
  CAPS.update(t); CAPS.root.style.setProperty('--nf', '2.3em');
  drawOverlay(t);
};
window.READY = true;
