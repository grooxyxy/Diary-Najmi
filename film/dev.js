// halaman uji dunia: kamera bebas lewat query: ?cam=x,y,z&look=x,y,z&fov=32&scene=pagi&u=.5&ss=1
import * as THREE from 'three';
import { makePost } from '../vendor/post_ts.js';
import { buildBanda } from './banda.js';
import { sample } from './tod.js';
const Q = new URLSearchParams(location.search), W = +(Q.get('w') ?? 1920), H = +(Q.get('h') ?? 1080);
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('stage').appendChild(renderer.domElement);
const camera = new THREE.PerspectiveCamera(+(Q.get('fov') ?? 32), W / H, .3, 2000);
const world = buildBanda();
const post = makePost(renderer, world.scene, camera, W, H, { ssaa: +(Q.get('ss') ?? 1) });
const v = k => Q.get(k).split(',').map(Number);
camera.position.set(...v('cam')); camera.lookAt(...v('look'));
const focus = new THREE.Vector3(...v('look'));
const T = sample(Q.get('scene') ?? 'pagi', +(Q.get('u') ?? .5));
for (const k of ['najmi','paman','seller']) world.cast[k].root.visible = false;
const act = Q.get('act'); if (act) for (const a of act.split(';')) { const [k, x, y, z, pose, flip] = a.split(','); const c = world.cast[k]; c.root.visible = true; c.root.position.set(+x, +y, +z); c.frame(pose); c.face(camera, flip === '1'); }
window.render = (t = 5) => { world.update(t, { cam: camera, post, renderer, tod: T, focus, shadowSpan: +(Q.get('span') ?? 34) }); post.dof.aper = +(Q.get('aper') ?? 300); post.dof.maxCoc = 20; post.composer.render(); };
window.render(+(Q.get('t') ?? 5)); window.READY = true;
