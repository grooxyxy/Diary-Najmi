// Hand-painted cumulus: one InstancedBufferGeometry of icosphere puffs, three-tone shading, torn limbs,
// core occlusion, powder and Henyey–Greenstein silver linings. Adapt: counts, radii, colours, `rand` (any
// seeded RNG), GLSL_NOISE (must provide vn3/fbm3 — see threejs-ghibli-toon-shading/references/ghibli-patch.js),
// and the shared uniforms (uTime, uSunDir, uSunColor, uMist = the sky's fog-coloured haze, uSkyTop).
import * as THREE from 'three'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'

export function buildClouds(scene, U, rand, GLSL_NOISE, { count = 9, size = [30, 84], worldScale = 1, detail = 3 } = {}) {
  const P = []   // per puff: [x,y,z, radius, cx,cy,cz, speed, seed]
  const cloud = (ang, R, cy, w, speed = .6 + rand()*.9) => {
    const cx = Math.sin(ang)*R, cz = -Math.cos(ang)*R, seed = rand()*100
    const n = 5 + (rand()*5|0), yaw = rand()*Math.PI, ca = Math.cos(yaw), sa = Math.sin(yaw)
    const put = (px, py, pz, rad) => P.push([cx + px*ca - pz*sa, cy + py, cz + px*sa + pz*ca, rad, cx, cy + w*.12, cz, speed, seed])
    // flat belly row, then a lumpy cauliflower crown peaking off-centre
    for (let k=0;k<n;k++){ const u=(k+.5)/n-.5, rad=w*(.15+.08*rand())*Math.sqrt(1-Math.abs(u)*1.4); put(u*w*.9, rad*.5+(rand()-.5)*w*.04, (rand()-.5)*w*.14, rad) }
    const m = 4 + (rand()*4|0), peak = (rand()-.5)*.4
    for (let k=0;k<m;k++){ const u=peak+(rand()-.5)*.6, rad=w*(.09+.11*rand())*(1-Math.abs(u-peak)*.7); put(u*w*.8, rad*.5+w*(.09+.14*rand()), (rand()-.5)*w*.16, rad) }
  }
  for (let i=0;i<count;i++){                       // near layer 170–250 m, far layer 380–540 m (bigger, higher, hazier)
    const far = i >= Math.ceil(count*.55), R = (far ? 380 + rand()*160 : 170 + rand()*80)*worldScale
    cloud(-Math.PI*.9 + rand()*Math.PI*1.3, R, (far ? 110 + rand()*90 : 55 + rand()*55)*worldScale, (size[0] + rand()*(size[1]-size[0]))*(far ? 1.8 : 1)*worldScale)
  }
  // A bank that must stay on the sun/moon path: pass speed ≈ .03, e.g. cloud(azimuth, 260, 45, 70, .03)

  const geo = new THREE.InstancedBufferGeometry().copy(mergeVertices(new THREE.IcosahedronGeometry(1, detail)))  // mergeVertices or it renders faceted
  geo.instanceCount = P.length
  const f = k => new THREE.InstancedBufferAttribute(new Float32Array(P.flatMap(k)), k(P[0]).length)
  geo.setAttribute('aPos', f(p => [p[0],p[1],p[2],p[3]]))
  geo.setAttribute('aCenter', f(p => [p[4],p[5],p[6]]))
  geo.setAttribute('aDrift', f(p => [p[7],p[8]]))

  const uniforms = { ...U,
    uLit:{ value:new THREE.Color(0xfff8e8) }, uMidC:{ value:new THREE.Color(0xb4dcef) }, uShade:{ value:new THREE.Color(0x9a8fc6) },
    uEdgeLo:{ value:-.42 }, uEdgeHi:{ value:-.06 }, uEdgeSoft:{ value:.10 }, uLump:{ value:.38 }, uCPuff:{ value:.42 }, uDrift:{ value:1.3 }, uCMist:{ value:.35 } }

  const mat = new THREE.ShaderMaterial({ fog:false, transparent:true, depthWrite:true, uniforms,
    vertexShader: /* glsl */`
      attribute vec4 aPos; attribute vec3 aCenter; attribute vec2 aDrift;
      uniform float uTime, uDrift, uLump; varying vec3 vN, vCN, vWP;
      ${GLSL_NOISE}
      void main(){
        vec3 n = normalize(position);
        float lump = fbm3(n*2.6 + aDrift.y) - .5;
        vec3 p = aPos.xyz + n*aPos.w*(1. + lump*uLump*2.)*vec3(1., .68, 1.);          // flat fair-weather puffs
        vec3 c = aCenter;
        float shift = mod(c.x + uTime*uDrift*aDrift.x + 420., 840.) - 420. - c.x;      // whole cloud drifts and wraps together
        p.x += shift; c.x += shift;
        vN = n; vCN = normalize((p - c)*vec3(1., 1.7, 1.)); vWP = p;
        gl_Position = projectionMatrix*viewMatrix*vec4(p, 1.); }`,
    fragmentShader: /* glsl */`
      uniform vec3 uSunDir, uSunColor, uMist, uLit, uMidC, uShade, uSkyTop;
      uniform float uEdgeLo, uEdgeHi, uEdgeSoft, uCPuff, uCMist, uTime;
      varying vec3 vN, vCN, vWP;
      ${GLSL_NOISE}
      float hg(float c, float g){ float g2=g*g; return (1.-g2)/pow(1.+g2-2.*g*c, 1.5)*(1.-g)*(1.-g)/(1.+g); }  // forward = 1
      void main(){
        vec3 V = normalize(cameraPosition - vWP), L = uSunDir;
        vec3 N = normalize(mix(vN, vCN, uCPuff));
        float t = uTime*.012;
        float rim = dot(vN, V);                                                          // 1) torn, wispy limb
        float wisp = fbm3(vWP*.045 + vec3(t, 0., -t*.6));
        float far = smoothstep(300., 560., length(vWP.xz));
        float alpha = smoothstep(.02, .5, rim + (wisp - .5)*.6) * .8 * (1. - .25*far);
        if (alpha < .02) discard;
        float l = dot(N, L) + (fbm3(vWP*.035) - .5)*.35;                                 // 2) three tones, continuous
        float k1 = smoothstep(uEdgeLo - uEdgeSoft*2., uEdgeLo + uEdgeSoft*2., l);
        float k2 = smoothstep(uEdgeHi - uEdgeSoft*2., uEdgeHi + uEdgeSoft*2., l);
        vec3 sunTint = mix(vec3(1.), uSunColor/max(max(uSunColor.r, uSunColor.g), max(uSunColor.b, 1e-3)), .45); // half to white
        vec3 lit = uLit*sunTint;
        vec3 c = mix(uShade, uMidC, k1); c = mix(c, lit, k2);
        c = mix(c, mix(uMist, uSkyTop, .5 + .5*N.y)*.9, .18);                           // 3) ambient
        c = mix(c, uShade, smoothstep(-.15, -.6, vCN.y)*.45);                            //    shaded bellies
        c *= mix(.6, 1., smoothstep(-.35, .75, dot(vN, vCN)));                           // 4) core occlusion
        float det = fbm3(vWP*.11 + vec3(0., 0., t*.5)), powder = 1. - exp(-2.2*(1. - rim));
        c *= .84 + .3*det; c = mix(c, lit, .18*powder*k2);                               // 5) detail + powder
        float fwd = hg(dot(-V, L), .62), thin = 1. - smoothstep(0., .45, rim);
        c += lit*fwd*thin*(.35 + .9*(1. - smoothstep(.1, .5, L.y)));                     // 6) silver lining, fiery at dusk
        float low = 1. - smoothstep(30., 150., vWP.y - length(vWP.xz)*.06);              // 7) haze
        c = mix(c, uMist, uCMist*low); c = mix(c, uMist, .4*far);
        c *= mix(.6, 1., smoothstep(-.05, .3, L.y));
        gl_FragColor = vec4(c, alpha); }` })

  const mesh = new THREE.Mesh(geo, mat)
  mesh.frustumCulled = false; mesh.layers.set(1); mesh.renderOrder = -5   // layer 1: skipped by depth/refraction pre-passes
  scene.add(mesh)
  return mesh   // also push it to your AO-hidden list
}

// ---- sky-dome.glsl (threejs-ghibli-sky-clouds/references/sky-dome.glsl) ----
// Painterly Ghibli sky dome — day branch only. GLSL verbatim dari file asli,
// dibungkus jadi builder JS buildSkyDome(). Dipakai pada SphereGeometry(500,48,24),
// side BackSide, depthWrite false, fog false, renderOrder -10. `low` = warna kabut
// (disalin dari scene.fog.color). Nilai awal dari komentar file asli:
// top 0x3684d8, mid 0x8ccbee, horizon 0xf7e6c6, uHazeH .14, uHazePow 2.2,
// uHaloSize 1, uHaloStr .9. Vertex shader mematok dome ke far plane
// (gl_Position.z = gl_Position.w) sehingga radius 500 tetap terlihat walau
// kamera far plane-nya 50.
export function buildSkyDome(scene, { sunDir, sunColor, fogColor, top = 0x3684d8, mid = 0x8ccbee, horizon = 0xf7e6c6 } = {}) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      top: { value: new THREE.Color(top) },
      mid: { value: new THREE.Color(mid) },
      horizon: { value: new THREE.Color(horizon) },
      low: { value: new THREE.Color(fogColor) },
      uSunDir: { value: sunDir.clone().normalize() },
      uSunColor: { value: new THREE.Color(sunColor) },
      uHazeH: { value: 0.14 },
      uHazePow: { value: 2.2 },
      uHaloSize: { value: 1 },
      uHaloStr: { value: 0.9 },
    },
    vertexShader: /* glsl */`
      varying vec3 vP;
      void main(){
        vP = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
        gl_Position.z = gl_Position.w;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 top, mid, horizon, low, uSunDir, uSunColor;
      uniform float uHazeH, uHazePow, uHaloSize, uHaloStr;
      varying vec3 vP;
      float h21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
      void main(){
        vec3 d = normalize(vP); float y = d.y;
        float sunUp = smoothstep(-.05, .35, uSunDir.y);
        float t = clamp(y, 0., 1.);
        vec3 c = mix(horizon, mid, smoothstep(0., uHazeH*1.6, t));
        c = mix(c, top, smoothstep(uHazeH, .85, pow(t, .8)));
        float haze = pow(1. - smoothstep(-.04, uHazeH*.55, y), uHazePow);
        c = mix(c, low, haze);
        vec2 sxz = normalize(uSunDir.xz + 1e-4), dxz = normalize(d.xz + 1e-4);
        float toward = pow(max(dot(sxz, dxz), 0.), 3.) * (1. - smoothstep(0., .35, y));
        c = mix(c, horizon*vec3(1.05,.95,.85), toward*.45);
        float cosA = dot(d, uSunDir);
        float halo = exp(-(1. - cosA)*90./uHaloSize)*.75
                   + exp(-(1. - cosA)*11./uHaloSize)*.28
                   + exp(-(1. - cosA)*2.2/uHaloSize)*.08;
        vec3 sunTint = uSunColor / max(max(uSunColor.r, uSunColor.g), max(uSunColor.b, 1e-3));
        c += sunTint * halo * uHaloStr * (.5 + .5*sunUp) * smoothstep(-.08, .02, y + .06);
        c *= mix(.55, 1., sunUp);
        c += (h21(gl_FragCoord.xy) - .5) / 255.;
        gl_FragColor = vec4(c, 1.);
      }`,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(500, 48, 24), mat);
  dome.renderOrder = -10;
  dome.frustumCulled = false;
  scene.add(dome);
  return dome;
}
