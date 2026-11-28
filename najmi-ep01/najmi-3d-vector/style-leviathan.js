// Style leviathan (film anime, latar lukis) — preset untuk scene Najmi 3D.
// Dipakai HANYA kalau URL punya ?style=leviathan. Scene default tidak berubah.
// Resep (kata-kata sendiri, dari SKILL.md anime3d-styles — tanpa copy kode):
// ramp toon 2 band keras + filter kuas Kuwahara di latar (efek gouache)
// + bloom tipis di emissive + grade anime high-key + film grain.
// Aproksimasi yang disengaja (render still, bukan pipeline MRT penuh):
// - Paint Kuwahara jalan full-frame radius 2. Aman untuk karakter: filter
//   Kuwahara memilih sektor dengan variansi terendah, jadi area datar
//   (warna toon karakter) dikembalikan apa adanya — hanya area bertekstur
//   (dinding, tanah, langit) yang jadi "lukisan".
// - Ink hanya di karakter sudah dipenuhi inverted hull di kepala & badan.
// - Shadow map khusus karakter didekati dengan setup shadow yang sudah ada.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ---------- ramp toon 2 band keras ----------
function toonRamp() {
  const data = new Uint8Array([90, 255]);
  const t = new THREE.DataTexture(data, 2, 1, THREE.RedFormat);
  t.minFilter = THREE.NearestFilter;
  t.magFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
}

// ---------- filter kuas Kuwahara, 4 sektor, radius 2 ----------
const paintShader = {
  uniforms: { tDiffuse: { value: null }, resolution: { value: new THREE.Vector2(960, 960) } },
  vertexShader: `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    varying vec2 vUv;
    void main() {
      vec2 px = 1.0 / resolution;
      vec3 m[4]; float s[4];
      // sektor 0: kiri-atas
      vec3 c0 = vec3(0.0); float v0 = 0.0;
      for (int x = -2; x <= 0; x++) for (int y = -2; y <= 0; y++) {
        vec3 c = texture2D(tDiffuse, vUv + vec2(float(x), float(y)) * px).rgb;
        c0 += c; v0 += dot(c, c);
      }
      // sektor 1: kanan-atas
      vec3 c1 = vec3(0.0); float v1 = 0.0;
      for (int x = 0; x <= 2; x++) for (int y = -2; y <= 0; y++) {
        vec3 c = texture2D(tDiffuse, vUv + vec2(float(x), float(y)) * px).rgb;
        c1 += c; v1 += dot(c, c);
      }
      // sektor 2: kiri-bawah
      vec3 c2 = vec3(0.0); float v2 = 0.0;
      for (int x = -2; x <= 0; x++) for (int y = 0; y <= 2; y++) {
        vec3 c = texture2D(tDiffuse, vUv + vec2(float(x), float(y)) * px).rgb;
        c2 += c; v2 += dot(c, c);
      }
      // sektor 3: kanan-bawah
      vec3 c3 = vec3(0.0); float v3 = 0.0;
      for (int x = 0; x <= 2; x++) for (int y = 0; y <= 2; y++) {
        vec3 c = texture2D(tDiffuse, vUv + vec2(float(x), float(y)) * px).rgb;
        c3 += c; v3 += dot(c, c);
      }
      m[0] = c0 / 9.0; m[1] = c1 / 9.0; m[2] = c2 / 9.0; m[3] = c3 / 9.0;
      s[0] = v0 / 9.0 - dot(m[0], m[0]);
      s[1] = v1 / 9.0 - dot(m[1], m[1]);
      s[2] = v2 / 9.0 - dot(m[2], m[2]);
      s[3] = v3 / 9.0 - dot(m[3], m[3]);
      vec3 col = m[0]; float best = s[0];
      if (s[1] < best) { best = s[1]; col = m[1]; }
      if (s[2] < best) { best = s[2]; col = m[2]; }
      if (s[3] < best) { best = s[3]; col = m[3]; }
      gl_FragColor = vec4(col, 1.0);
    }`,
};

export function applyLeviathanStyle(scene, renderer, camera, opts = {}) {
  const day = !!opts.day; // varian siang: matahari cerah high-key, latar lukis
  // paling cocok di siang hari.
  const ramp = toonRamp();

  // 1) Semua MeshStandardMaterial -> MeshToonMaterial (ramp 2 band keras).
  scene.traverse(o => {
    if (o.isMesh && o.material && o.material.isMeshStandardMaterial) {
      const m = o.material;
      o.material = new THREE.MeshToonMaterial({
        color: m.color,
        map: m.map || null,
        emissive: m.emissive,
        emissiveMap: m.emissiveMap || null,
        emissiveIntensity: m.emissiveIntensity,
        gradientMap: ramp,
        flatShading: !!m.flatShading,
      });
    }
  });

  // 2) Lampu: malam lebih tenang — bulan & fill diredupkan, hemisphere lavender.
  //    Lampu wajah & lentera juga diredupkan: ramp 2 band keras membuat wajah
  //    cepat jatuh ke pita terang penuh, jadi sumber dekat harus dilembutkan.
  //    Siang: matahari 0xffe0b3 jadi key cerah, bounce langit tetap.
  scene.traverse(o => {
    if (o.isHemisphereLight) {
      o.color.set(0x9db4ff); o.groundColor.set(day ? 0x6a6258 : 0x2a2438); o.intensity = day ? 1.0 : 0.7;
    }
    if (o.isDirectionalLight) {
      if (o.color.getHex() === 0xaebfff) o.intensity = 1.0;
      if (o.color.getHex() === 0xffe0b3) o.intensity = day ? 1.8 : 0.4;
    }
    if (o.isPointLight) {
      if (o.color.getHex() === 0xffe6c0) o.intensity *= (day ? 0.5 : 0.4);  // lampu wajah
      if (o.color.getHex() === 0xffa63d) o.intensity *= (day ? 0.3 : 0.35);  // lentera
    }
  });
  if (day) { scene.background.set(0xa8c8e8); if (scene.fog) scene.fog.color.set(0xa8c8e8); }

  // 3) Pipeline: render -> paint (Kuwahara) -> bloom (emissive saja)
  //    -> grade high-key + grain -> output.
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new ShaderPass(paintShader));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(960, 960), 0.05, 0.5, 1.0));
  const grade = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      grain: { value: 0.06 },
      shadowTint: { value: new THREE.Vector3(...(day ? [0.9, 0.9, 1.03] : [0.85, 0.88, 1.08])) },
      highTint: { value: new THREE.Vector3(...(day ? [1.03, 1.01, 0.96] : [1.02, 1.00, 0.96])) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform float grain;
      uniform vec3 shadowTint; uniform vec3 highTint;
      varying vec2 vUv;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        vec4 c = texture2D(tDiffuse, vUv);
        float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
        c.rgb = mix(c.rgb * shadowTint, c.rgb * highTint, smoothstep(0.15, 0.85, l));
        c.rgb += 0.02;                                // high-key: blacks diangkat sedikit
        float d = distance(vUv, vec2(0.5));
        c.rgb *= 1.0 - 0.2 * smoothstep(0.4, 0.9, d);
        c.rgb += (hash(vUv * 913.0) - 0.5) * grain;   // film grain
        gl_FragColor = c;
      }`,
  });
  composer.addPass(grade);
  composer.addPass(new OutputPass());
  return composer;
}
