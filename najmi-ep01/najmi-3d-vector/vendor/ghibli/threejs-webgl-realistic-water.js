// threejs-webgl-realistic-water — modul vendor dari repo ghibli-threejs (MIT).
// Sumber:
//   - makeWaterSlopeMap: VERBATIM dari references/water-passes.js
//     (mesin ripple: slope map 512^2 tileable + mipmaps — inti tampilan air repo).
//   - RIVERBED_COLOR / RIVERBED_NORMAL: VERBATIM dari references/riverbed-pebbles.glsl
//     (dasar sungai kerikil Voronoi + tepi lumpur + padang rumput; diinjeksikan
//     ke MeshStandardMaterial lewat patch() dari threejs-ghibli-toon-shading —
//     patch menyediakan vWPos + noise h21/vn/fbm2 yang dibutuhkan chunk ini).
//   - makeWaterMaterial: DIADAPTASI dari references/water-material.glsl.js.
//     Mesin ripple (waterNormal: 4 oktaf slope map + ripple rings + distance fade),
//     Fresnel Schlick, scatter turquoise, dan GGX glints dipertahankan verbatim.
//     Yang DIHILANGKAN: live refraction/reflection pre-passes (tRefract/tReflect
//     butuh renderWater() di animation loop — pipeline still ini merender 3 frame
//     tetap lewat composer bersama dan tidak punya hook pre-pass per frame).
//     Sebagai gantinya air dibuat transparan (alpha uOpacity) sehingga dasar
//     kerikil asli (terrain + RIVERBED) terlihat menembus air, dan pantulan
//     langit diwakili uniform uSkyColor (bukan target cermin hidup). Tampilan
//     air — riak, kilau matahari, pantulan langit di sudut grazing — tetap
//     berasal dari kode repo.
import * as THREE from 'three'

// ── A tileable ripple slope map (mipmapped, so distant water calms instead of aliasing into noise) ──
export function makeWaterSlopeMap(renderer, hash2) {
  const N = 512, H = new Float32Array(N * N)
  const oct = [[4, 1], [8, .55], [16, .32], [32, .17], [64, .09]]
  const pn = (x, y, P) => {                                    // periodic value noise (period P cells)
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy)
    const h = (a, b) => hash2(((a % P) + P) % P + P * 31, ((b % P) + P) % P - P * 17)
    const a0 = h(ix, iy), b0 = h(ix + 1, iy), c0 = h(ix, iy + 1), d0 = h(ix + 1, iy + 1)
    return a0 + (b0 - a0) * ux + (c0 - a0) * uy + (a0 - b0 - c0 + d0) * ux * uy
  }
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    let v = 0
    for (const [P, A] of oct) { const n = pn(i / N * P, j / N * P, P); v += A * (P <= 8 ? n : 1 - Math.abs(2 * n - 1)) }  // soft swells + ridged crests
    H[j * N + i] = v
  }
  const data = new Uint8Array(N * N * 4), k = 18
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const dx = H[j * N + (i + 1) % N] - H[j * N + (i - 1 + N) % N], dz = H[((j + 1) % N) * N + i] - H[((j - 1 + N) % N) * N + i]
    const o = (j * N + i) * 4
    data[o] = THREE.MathUtils.clamp(128 + dx * k * 127, 0, 255); data[o + 1] = THREE.MathUtils.clamp(128 + dz * k * 127, 0, 255); data[o + 2] = 255; data[o + 3] = 255
  }
  const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat)
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.generateMipmaps = true
  t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter
  // renderer opsional: set builder (scene saja) tidak punya renderer — pakai 8.
  t.anisotropy = renderer?.capabilities?.getMaxAnisotropy?.() ?? 8; t.needsUpdate = true
  return t
}

// ── Pebble riverbed + meadow bank (riverbed-pebbles.glsl, verbatim) ──
// Colour: inject after '#include <color_fragment>' (patch(mat, { color: RIVERBED_COLOR, ... })).
// Normal: inject after '#include <normal_fragment_maps>' (patch(mat, { normal: RIVERBED_NORMAL, ... })).
// JANGAN bungkus blok colour dalam kurung kurawal — `mr` dan `pebMask` harus
// tetap dalam scope saat blok normal dijalankan (keduanya mendarat di main()).
export const RIVERBED_COLOR = /* glsl */`
  float hgt = vWPos.y;
  vec2 wp = vWPos.xz;
  float n1 = fbm2(wp*.18), n2 = fbm2(wp*.9+7.), n3 = fbm2(wp*3.1);
  vec3 gA = vec3(.12,.30,.05), gB = vec3(.38,.58,.10), gC = vec3(.55,.55,.16);
  vec3 grass = mix(gA, gB, smoothstep(.3,.75,n1));
  grass = mix(grass, gC, smoothstep(.62,.9,n2)*.45);
  grass *= .85 + .3*n3;
  float big = step(.58, fbm2(wp*.35+9.));
  vec2 warp = (vec2(fbm2(wp*1.7), fbm2(wp*1.7+5.3)) - .5) * .9;
  vec2 g = wp*mix(8.5, 3.6, big) + warp; vec2 gi = floor(g), gf = fract(g);
  float md = 8., md2 = 8.; vec2 id = vec2(0); vec2 mr = vec2(0);
  for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){
    vec2 o=vec2(x,y); vec2 r = o + vec2(h21(gi+o), h21(gi+o+19.7))*.85 - gf; float d = dot(r,r);
    if(d<md){ md2=md; md=d; id=gi+o; mr=r; } else if(d<md2) md2=d; }
  float dc = sqrt(md), gap = sqrt(md2) - dc;
  float rad = .30 + .16*h21(id+7.7);
  float stoneM = smoothstep(rad+.05, rad-.03, dc) * smoothstep(.0, .06, gap);
  float dome = sqrt(max(0., 1. - pow(dc/(rad+.05), 2.)));
  float pick = h21(id*1.31);
  vec3 stone = pick<.28 ? vec3(.50,.48,.44) : pick<.5 ? vec3(.42,.36,.28) : pick<.68 ? vec3(.58,.50,.38)
             : pick<.82 ? vec3(.34,.34,.30) : pick<.93 ? vec3(.62,.44,.30) : vec3(.74,.72,.66);
  stone *= (.8 + .35*h21(id+3.3)) * (.62 + .38*dome) * (.9 + .2*vn(wp*60.));
  vec3 sand = vec3(.52,.47,.36) * (.8+.35*n2) * (.85 + .3*vn(wp*45.));
  sand *= mix(.72, 1., smoothstep(.0, .12, dc - rad));
  float stones = smoothstep(.12,.42, fbm2(wp*.5+2.));
  vec3 bed = mix(sand, stone, stoneM * stones);
  bed = mix(bed, bed*vec3(.62,.82,.55), smoothstep(.55,.8,n1)*.45 * (1. - dome*.5));
  float pebMask = stoneM * stones * smoothstep(.02,-.1,hgt);
  vec3 mud = vec3(.30,.25,.16) * (.8+.4*n3);
  vec3 col = bed;
  col = mix(col, mud, smoothstep(-.14,.02,hgt));
  col = mix(col, grass, smoothstep(.04,.2,hgt));
  diffuseColor.rgb = col;`
export const RIVERBED_NORMAL = /* glsl */`
  normal = normalize(normal + (viewMatrix*vec4(-mr.x, 0., -mr.y, 0.)).xyz * pebMask * 2.2);`

// ── Water material (diadaptasi dari water-material.glsl.js) ──
// Mesin ripple (waterNormal) + komposisi Fresnel/scatter/glints dipertahankan;
// target refraction/reflection hidup diganti transparansi + warna langit (lihat header).
const RIPPLES = 8
export function makeWaterMaterial({ slopeMap, sunDir, sunColor, sunLum = 3, time, skyColor = 0x9fc8e8, scatterColor = 0x2f9c8e, deepColor = 0x1a5a7a, opacity = 0.72 }) {
  const waterU = {
    uTime: time,                                   // shared { value: seconds }
    tNormal: { value: slopeMap },
    uAbsorb: { value: new THREE.Vector3(.95, .24, .20) },
    uScatter: { value: new THREE.Color(scatterColor) },
    uDeep: { value: new THREE.Color(deepColor) },
    uSkyColor: { value: new THREE.Color(skyColor) },
    uOpacity: { value: opacity },
    uNStr: { value: 1 }, uSpec: { value: .28 }, uSunLum: { value: sunLum },
    uSunDir: { value: sunDir }, uSunColor: { value: sunColor },
    uRipples: { value: Array.from({ length: RIPPLES }, () => new THREE.Vector4()) },   // x, z, strength (0 = off), w (<0 steady, else start time)
  }
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .11, metalness: 0, side: THREE.DoubleSide, transparent: true })
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, waterU)
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWPos = (modelMatrix*vec4(transformed,1.)).xyz;')
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', /* glsl */`#include <common>
        uniform float uTime, uNStr, uSpec, uSunLum, uOpacity; uniform vec3 uSunDir, uSunColor, uAbsorb, uScatter, uDeep, uSkyColor;
        uniform sampler2D tNormal; uniform vec4 uRipples[${RIPPLES}];
        varying vec3 vWPos;
        vec2 slopeAt(vec2 uv){ return texture2D(tNormal, uv).rg*2.-1.; }
        vec3 waterNormal(){
          vec2 p = vWPos.xz; float t = uTime;
          // four octaves drifting downstream (+Z) at different speeds and angles
          vec2 sl = slopeAt(p*.075 + vec2(.00, -t*.022))*.55
                  + slopeAt(mat2(.8,-.6,.6,.8)*p*.19 + vec2(t*.010, -t*.045))*.38
                  + slopeAt(mat2(.6,.8,-.8,.6)*p*.52 + vec2(-t*.02, -t*.10))*.22
                  + slopeAt(p*1.45 + vec2(t*.03, -t*.19))*.10;
          for (int i=0;i<${RIPPLES};i++){
            vec4 r = uRipples[i]; if (r.z <= 0.) continue;
            vec2 d = p - r.xy; float L = length(d) + 1e-4; float w;
            if (r.w < 0.) w = sin(L*36. - t*5.2) * exp(-L*4.5);                          // steady rings (feet, posts)
            else { float age = t - r.w; float R = age*.32;                                 // an expanding ring (fish kiss, stone)
                   w = exp(-pow((L-R)*16., 2.)) * exp(-age*.9) * sin((L-R)*60.); }
            sl += d/L * w * r.z * .9;
          }
          float dist = length(cameraPosition - vWPos);
          sl *= uNStr / (1. + dist*.035);                                                  // distance fade: no milky aliasing far away
          return normalize(vec3(-sl.x, 1., -sl.y));
        }`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        vec3 Nw = waterNormal();
        normal = normalize((viewMatrix*vec4(gl_FrontFacing ? Nw : -Nw, 0.)).xyz);`)
      .replace('#include <opaque_fragment>', /* glsl */`
        // Komposisi still-safe (adaptasi — lihat header): tanpa target refraction/
        // reflection hidup, dasar kerikil terlihat lewat transparansi (alpha),
        // pantulan langit via Fresnel ke uSkyColor, scatter + glints ala repo.
        vec3 V = normalize(cameraPosition - vWPos);
        float NL = max(dot(Nw, uSunDir), .05);
        float sunLit = clamp(dot(reflectedLight.directDiffuse, vec3(.2126,.7152,.0722)) * 3.14159 / (uSunLum * NL), 0., 1.);
        vec3 under = uDeep * (.55 + .45*sunLit) + uScatter * .30;
        float F = .02 + .98*pow(1. - max(dot(Nw, V), 0.), 5.);                              // Schlick, F0 = .02
        vec3 col = mix(under, uSkyColor, F);
        col += reflectedLight.directSpecular * uSpec;                                      // GGX glints, already shadowed
        gl_FragColor = vec4(col, uOpacity);`)
  }
  return { mat, waterU }
}

// Spawn an expanding ring (e.g. a fish kissing the surface): reuse the oldest slot.
let _next = 0
export function spawnRipple(waterU, x, z, strength = 1) {
  waterU.uRipples.value[_next].set(x, z, strength, waterU.uTime.value); _next = (_next + 1) % waterU.uRipples.value.length
}
