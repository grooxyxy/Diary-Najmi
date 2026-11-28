// Butterflies over a flower meadow, flown entirely in the vertex shader: one instanced draw call, no per-frame CPU work.
// Adapt: `flowerSpots` = [[x, groundY, z], …] collected while scattering flowers; `centre` = where the visitor looks from;
// `uTime` / `uWind` = your shared { value } uniforms; `aoHidden` = the list your AO / depth pre-passes hide (see the skill).
import * as THREE from 'three'

export function buildButterflies({ scene, flowerSpots, centre, uTime, uWind, rng = Math.random, lowTier = false, aoHidden = [] }){
  const near = flowerSpots.filter(([x,, z]) => Math.hypot(x - centre.x, z - centre.z) < 17); if (near.length < 8) return null
  const N = lowTier ? 8 : 18, r = rng, L = .088, W = .085
  const P = [], UV = [], I = []
  for (const side of [1, -1]){ const b = P.length/3   // a wing: root on the body line (x), reaching out along ±z; uv.y runs root → tip
    P.push(-W/2, 0, 0,  W/2, 0, 0,  W/2, 0, side*L,  -W/2, 0, side*L); UV.push(0, 0, 1, 0, 1, 1, 0, 1); I.push(b, b + 1, b + 2, b, b + 2, b + 3) }
  { const b = P.length/3; P.push(-.034, .001, -.0045,  .03, .001, -.0045,  .03, .001, .0045,  -.034, .001, .0045); UV.push(-1, 0, -1, 0, -1, 0, -1, 0); I.push(b, b + 1, b + 2, b, b + 2, b + 3) }   // the body (uv.x < 0 marks it)
  const g = new THREE.InstancedBufferGeometry(); g.instanceCount = N
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setIndex(I)
  const home = new Float32Array(N*4), tint = new Float32Array(N*3), c = new THREE.Color()
  const TINTS = [0xf2922e, 0xfbf5e2, 0xf6dc5a, 0x8fb8f0, 0xf5a8c8, 0xfbf5e2, 0xf2922e]
  for (let i = 0; i < N; i++){ const [x, h, z] = near[(r()*near.length)|0]
    home.set([x, h + .26 + r()*.1, z, r()], i*4); c.set(TINTS[(r()*TINTS.length)|0]); tint.set([c.r, c.g, c.b], i*3) }
  g.setAttribute('aHome', new THREE.InstancedBufferAttribute(home, 4)); g.setAttribute('aTint', new THREE.InstancedBufferAttribute(tint, 3))
  const m = new THREE.ShaderMaterial({ side:THREE.DoubleSide, uniforms:{ uTime, uShow:{ value:1 }, uWind },
    vertexShader:`attribute vec4 aHome; attribute vec3 aTint; uniform float uTime, uShow, uWind; varying vec2 vUv; varying vec3 vTint; varying float vLit;
      float resting(float t, float s){ return smoothstep(.5, .86, sin(t*.13 + s*40.)); }
      vec3 path(float t, float s){ float R = 1.1 + 1.5*fract(s*7.31);
        vec3 o = vec3(sin(t*.23 + s*6.3)*R + sin(t*.71 + s*11.)*R*.32, 0., cos(t*.19 + s*4.1)*R + cos(t*.63 + s*9.)*R*.32);
        o.y = .5 + .32*sin(t*.37 + s*9.) + .05*sin(t*6.3 + s*20.);                    // the bobbing, dipping flight line
        o.xz += uWind*.18*vec2(sin(t*.9 + s*3.), cos(t*.7 + s*5.));                    // a gust carries it a little
        return mix(o, vec3(0.), resting(t, s)); }
      void main(){ vUv = uv; vTint = aTint; float s = aHome.w, t = uTime*(.8 + .4*fract(s*3.7)) + s*50.;
        vec3 c = path(t, s), d = path(t + .12, s) - c; float rest = resting(t, s);
        float yaw = dot(d.xz, d.xz) > 1e-6 ? atan(d.z, d.x) : s*6.283;
        float a = mix(.2 + 1.05*sin(uTime*(11. + 4.*s) + s*30.), .95 + .4*sin(uTime*1.7 + s*30.), rest);   // beating in the air; slowly fanning on the flower
        vec3 p = position*uShow;
        if (uv.x >= 0.) p = vec3(p.x, abs(p.z)*sin(a), p.z*cos(a));                    // both wings lift about the body line
        float cy = cos(yaw), sy = sin(yaw); p.xz = vec2(p.x*cy - p.z*sy, p.x*sy + p.z*cy);
        vLit = .8 + .2*cos(a);
        gl_Position = projectionMatrix*viewMatrix*vec4(aHome.xyz + c + p, 1.); }`,
    fragmentShader:`varying vec2 vUv; varying vec3 vTint; varying float vLit;
      void main(){ if (vUv.x < 0.){ gl_FragColor = vec4(.05, .04, .035, 1.); return; }
        vec2 p = vec2(vUv.x - .5, vUv.y);                                              // root at (0, 0), tip at y = 1; fore wing ahead (+x), hind wing behind
        vec2 q = p - vec2(.1, .5); q = vec2(q.x*.94 - q.y*.34, q.x*.34 + q.y*.94);          // the fore wing leans forward to a rounded point
        float fore = length(q/vec2(.3, .5)) - 1., hind = length((p - vec2(-.19, .33))/vec2(.27, .33)) - 1., d = min(fore, hind);
        if (d > 0.) discard;
        float margin = smoothstep(-.17, -.03, d), vein = .5 + .5*sin(atan(p.x, p.y + .05)*26.);
        vec3 col = vTint*(1. - .1*vein*smoothstep(.15, .8, vUv.y));
        col = mix(col, vTint*.22, margin*.85);                                         // the dark border
        col += .55*smoothstep(.022, .008, length(fract(vec2(atan(p.x, p.y)*3.3, d*9.)) - .5)*.12)*margin;   // pale dots along it
        col += vTint*.2*smoothstep(.5, 0., length(p - vec2(0., .1)));                  // lighter near the body
        gl_FragColor = vec4(col*vLit*1.05, 1.); }` })
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.name = 'butterflies'; scene.add(mesh); aoHidden.push(mesh); return mesh
}
export function stepButterflies(B, { nightK, rain, camera, centre }){   // nightK, rain: 0 … 1
  if (!B) return
  const show = (1 - nightK)*(1 - Math.min(1, rain*3)), u = B.material.uniforms.uShow
  u.value += (show - u.value)*.03                                        // they fold away as the light or the weather goes
  B.visible = u.value > .02 && Math.hypot(camera.position.x - centre.x, camera.position.z - centre.z) < 80
}
