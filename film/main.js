import * as THREE from 'three';
import { makePost } from '../vendor/post_ts.js';
import { makeCaptions, captionsReady } from '../vendor/captions.js';
import { buildBanda } from './banda.js';
import { makeDirector } from './direction.js';
import { makeOverlay } from './overlay.js';
import { sample } from './tod.js';

const Q = new URLSearchParams(location.search), W = +(Q.get('w') ?? 1920), H = +(Q.get('h') ?? 1080), SS = +(Q.get('ss') ?? 1);
const TL = await (await fetch('/film/timeline.json?' + Date.now())).json();
await captionsReady(); await Promise.all(['700 40px Cinzel', '500 30px Cinzel', 'italic 500 40px "Cormorant Garamond"', '500 30px "Cormorant Garamond"'].map(f => document.fonts.load(f).catch(() => 0)));
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('stage').appendChild(renderer.domElement);
const camera = new THREE.PerspectiveCamera(32, W / H, .3, 2000);
const world = buildBanda();
const post = makePost(renderer, world.scene, camera, W, H, { ssaa: SS });
const dir = makeDirector(TL, world, camera);
const ovc = document.getElementById('ov'); const draw = makeOverlay(ovc, TL); ovc.style.width = W + 'px'; ovc.style.height = H + 'px';
// Balon dialog (gaya C) ditempel ke puncak kepala pembicara yang sedang tampil.
const headAnchor = (L) => {
  const p = world.cast[(L.who || '').toLowerCase()]?.root;
  if (!p || !p.visible) return { x: .5, y: .42 };
  p.updateMatrixWorld(true);
  const v = new THREE.Vector3(0, 1.68, 0).applyMatrix4(p.matrixWorld).project(camera);
  if (!isFinite(v.x) || !isFinite(v.y) || v.z < -1 || v.z > 1) return { x: .5, y: .42 };
  return { x: v.x * .5 + .5, y: 1 - (v.y * .5 + .5) };
};
const caps = makeCaptions({
  lines: TL.lines.map(l => ({ ...l, kind: l.kind || 'narr', who: l.who })),
  anchor: (L, t) => L.kind === 'dlg' ? headAnchor(L) : null,
  narrBottom: 0,
});
const sceneOf = t => TL.scenes.find(s => t >= s.a && t < s.b) ?? (t < TL.scenes[0].a ? TL.scenes[0] : TL.scenes.at(-1));
window.DUR = TL.dur;
window.render = (t = 0) => {
  const sc = sceneOf(t), u = (t - sc.a) / (sc.b - sc.a);
  const needWorld = t >= TL.title.b - .6 && t < TL.outro.a + 4;
  if (needWorld) {
    const T = sample(sc.id, u);
    const d = dir.apply(t, T);
    world.update(t, { cam: camera, post, renderer, tod: T, focus: d.focus, shadowSpan: d.span });
    const dof = post.dof; const K = H / 1080; dof.aper = 300 * K; dof.maxCoc = 20 * K; dof.tiltAmt = 17 * K; dof.tiltC = d.tilt; dof.tiltW = .075; dof.tiltF = .3;
    post.composer.render();
  } else { renderer.setRenderTarget(null); renderer.setClearColor('#000'); renderer.clear(); }
  draw(t, sc); caps.update(t);
};
window.render(+(Q.get('t') ?? 0)); window.READY = true;
