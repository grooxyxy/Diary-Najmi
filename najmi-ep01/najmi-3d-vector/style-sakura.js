// Style sakura (kota cel-shaded — varian malam) — preset untuk scene Najmi 3D.
// Dipakai HANYA kalau URL punya ?style=sakura. Scene default tidak berubah.
// Resep (kata-kata sendiri, dari SKILL.md anime3d-styles — tanpa copy kode):
// ramp toon 3 band + bayangan digeser hue ke ungu dingin + dua lampu anime
// (key dingin bulan + fill hangat) + grade split-tone ungu + tanpa bloom.
// Aproksimasi: garis tinta screen-space (second-difference depth) TIDAK
// diimplementasi — garis tinta sudah ada dari inverted hull di kepala &
// badan kacang; hue-shift ungu dibawa oleh grade di bawah.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ---------- ramp toon 3 band (DataTexture, nearest) ----------
function toonRamp() {
  const data = new Uint8Array([90, 175, 255]);
  const t = new THREE.DataTexture(data, 3, 1, THREE.RedFormat);
  t.minFilter = THREE.NearestFilter;
  t.magFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
}

export function applySakuraStyle(scene, renderer, camera, opts = {}) {
  const day = !!opts.day; // varian siang: matahari hangat jadi key, bounce langit kuat
  const ramp = toonRamp();

  // 1) Semua MeshStandardMaterial -> MeshToonMaterial (ramp 3 band).
  //    map, warna, emissive dipertahankan (jendela/lentera/neon tetap hangat).
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
        // threejs-materials: sifat transparansi + sisi harus ikut disalin,
        // kalau tidak kaca etalase (opacity 0.4) + kantong plastik (0.75)
        // jadi kotak opaque, dan awning kehilangan DoubleSide.
        transparent: m.transparent,
        opacity: m.opacity,
        side: m.side,
        depthWrite: m.depthWrite,
        alphaTest: m.alphaTest,
      });
    }
  });

  // 2) Lampu. Malam (varian lumbung/gang): key dingin bulan lebih kuat,
  //    fill hangat diredupkan, hemisphere dengan ground ungu.
  //    Siang: key hangat matahari 0xffe0b3 jadi sumber utama, bounce
  //    dingin langit 0xaebfff kuat dari arah berlawanan — bayangan anime
  //    itu BERWARNA, bukan gelap.
  scene.traverse(o => {
    if (o.isHemisphereLight) {
      // siang: hemisphere lebih terang + ground lebih hangat supaya fasad
      // vertikal tidak jatuh gelap (toon ramp membuat fasad hampir selalu
      // di pita tengah/bawah).
      o.color.set(0x8fa3ff); o.groundColor.set(day ? 0x8a7a6a : 0x3a2a55); o.intensity = day ? 0.85 : 0.9;
    }
    if (o.isDirectionalLight) {
      if (o.color.getHex() === 0xaebfff) o.intensity = day ? 0.9 : 1.3;   // bounce langit (siang) / bulan (malam)
      if (o.color.getHex() === 0xffe0b3) o.intensity = day ? 2.6 : 0.5;   // matahari (siang) / fill hangat (malam)
    }
  });
  if (day) { scene.background.set(0x9fc8e8); if (scene.fog) scene.fog.color.set(0x9fc8e8); }

  // 3) Grade akhir: split-tone — bayangan ungu, highlight putih-kertas hangat,
  //    blacks diangkat. Tanpa bloom, tanpa DOF, tanpa motion blur.
  //    Siang: tint ungu dilembutkan supaya kota tidak terasa senja.
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const grade = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      shadowTint: { value: new THREE.Vector3(...(day ? [0.9, 0.9, 1.02] : [0.72, 0.72, 1.10])) },
      highTint: { value: new THREE.Vector3(...(day ? [1.04, 1.02, 0.95] : [1.03, 1.00, 0.92])) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform vec3 shadowTint; uniform vec3 highTint;
      varying vec2 vUv;
      void main() {
        vec4 c = texture2D(tDiffuse, vUv);
        float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
        c.rgb = mix(c.rgb * shadowTint, c.rgb * highTint, smoothstep(0.15, 0.85, l));
        c.rgb += 0.03;                                // blacks diangkat
        float d = distance(vUv, vec2(0.5));
        c.rgb *= 1.0 - 0.15 * smoothstep(0.4, 0.9, d); // vignette tipis
        gl_FragColor = c;
      }`,
  });
  composer.addPass(grade);
  composer.addPass(new OutputPass());
  return composer;
}
