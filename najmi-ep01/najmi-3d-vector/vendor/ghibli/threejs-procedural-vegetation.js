// threejs-procedural-vegetation — modul vendor dari repo ghibli-threejs (MIT).
// Sumber (verbatim, digabung dari references/ skill yang sama):
//   - meadow-grass.js   (bladeGeometry, GRASS_SHADER, MEADOW_LAYER, buildGrass)
//   - shrub-geometry.js (random, shrubGeometry)
//   - sakura-petals.js  (buildPetals)
//   - canopy-rim.glsl   (CANOPY_RIM — lihat catatan di bawah)
// Satu-satunya perubahan: buildGrass diberi parameter `area` (default = area asli
// repo) supaya sebaran rumput bisa dibatasi ke ukuran set Jakarta; selebihnya
// kode asli tidak diubah. Import THREE disatukan di atas (tiga file asli
// masing-masing mengimpor 'three').
import * as THREE from 'three';

// Meadow grass: V-folded blades with real normals, planted as tussocks, instanced per 16 m cell.
// Adapt: GRASS_COUNT, the scatter area, terrainHeight(x,z), excluded(x,z), fbm(x,z) (any 2D noise 0..1),
// rand (seeded RNG), and `patch` from threejs-ghibli-toon-shading/references/ghibli-patch.js.

export function bladeGeometry(){
  const rows = [0, .3, .58, .82], pos = [], col = [], idx = []
  const base = new THREE.Color(0x1f3f0d), mid = new THREE.Color(0x528c22), tip = new THREE.Color(0x8fc44c), c = new THREE.Color()
  for (const t of rows){
    const w = .043*(1 - t*.74)*(t < .12 ? .8 + t*1.6 : 1), bend = t*t*.26, fold = w*.45   // ~8.6 cm wide at the base (storybook)
    pos.push(-w, t, bend,  0, t, bend + fold,  w, t, bend)                                  // midrib raised → a shallow V
    c.copy(base).lerp(mid, Math.min(1, t/.55)); if (t > .55) c.copy(mid).lerp(tip, (t - .55)/.45)
    for (let k=0;k<3;k++) col.push(c.r, c.g, c.b)
  }
  pos.push(0, 1, .26 + .012); col.push(tip.r, tip.g, tip.b)                              // pointed tip
  for (let i=0;i<rows.length-1;i++){ const a = i*3, b = a+3; idx.push(a,a+1,b+1, a,b+1,b,  a+1,a+2,b+2, a+1,b+2,b+1) }
  const T = rows.length*3, L = (rows.length-1)*3; idx.push(L,L+1,T, L+1,L+2,T)
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  g.setIndex(idx); g.computeVertexNormals()                                               // real normals: no flat two-tone slabs
  return g
}

const GRASS = { droop:.2, skyNormal:.18, sss:.3, sssColor:0xd9f07c, dryTips:.22, veins:.12 }
export const GRASS_SHADER = {
  wind:'position.y*position.y*.16', sss:true, fill:true,                                   // no `toon`: blades band into one flat tone
  uniforms:{ uSss:{ value:GRASS.sss }, uSssColor:{ value:new THREE.Color(GRASS.sssColor) } },
  // per-blade seed from the instance position (no extra attribute) → droop and dry-tip selection.
  vertexPars:'varying float vBladeSeed;', fragmentPars:'varying float vBladeSeed;',
  vertexBegin:`#ifdef USE_INSTANCING
      vBladeSeed = fract(sin(dot(instanceMatrix[3].xz, vec2(12.9898, 78.233)))*43758.5453);
    #else
      vBladeSeed = .5;
    #endif
    transformed.z += position.y*position.y*vBladeSeed*${GRASS.droop.toFixed(2)};
    transformed.y -= position.y*position.y*vBladeSeed*${(GRASS.droop*.3).toFixed(3)};`,
  color:`{ float gt = clamp(vLocal.y, 0., 1.);
    diffuseColor.rgb *= 1. - ${GRASS.veins.toFixed(2)}*smoothstep(.25, .75, vn(vec2(vLocal.x*260., gt*6. + vBladeSeed*40.)));
    float dry = smoothstep(.72, 1., gt)*step(1. - ${GRASS.dryTips.toFixed(2)}, vBladeSeed);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.62, .55, .26)*dot(diffuseColor.rgb, vec3(.9)), dry*.7);
    diffuseColor.rgb *= mix(.38, 1., smoothstep(0., .4, gt)); }`,                           // darker foot
  // small blend toward the sky: >.5 makes the meadow flat pale lime from above
  normal:`normal = normalize(mix(normal, normalize((viewMatrix*vec4(0., 1., 0., 0.)).xyz), ${GRASS.skyNormal.toFixed(2)}));`,
}

// MEADOW_LAYER: grass (and foreground flowers) on their own layer. Enable it on the main camera and the sun's shadow
// camera; on weaker tiers disable it on the water's mirror camera so the reflection doesn't draw the meadow again.
export const MEADOW_LAYER = 2
export function buildGrass(scene, { count, rand, terrainHeight, excluded, fbm, patch, center = [1, -1], area = [-32, 34, -42, 18] }){
  const mat = patch(new THREE.MeshStandardMaterial({ vertexColors:true, side:THREE.DoubleSide, roughness:.72 }), GRASS_SHADER)
  const geo = bladeGeometry(), items = []
  const q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color()
  let tries = 0
  while (items.length < count && tries++ < count*40){
    const x = area[0] + rand()*(area[1]-area[0]), z = area[2] + rand()*(area[3]-area[2])
    const dd = Math.hypot(x - center[0], (z - center[1])*.9)
    if (rand() > .22 + .78*Math.exp(-((dd/11)**2))) continue           // radial falloff: no box boundary
    const h = terrainHeight(x, z); if (h < .1 || excluded(x, z)) continue
    if (fbm(x*.4, z*.4) < .32 && rand() < .6) continue                  // patchy, painterly meadow
    const tall = .22 + rand()*.38*(.6 + fbm(x*.3 + 5, z*.3)), hue = .22 + rand()*.08, sat = .55 + rand()*.25, lit = .38 + rand()*.22
    for (let k = 0, nk = 2 + (rand()*4|0); k < nk && items.length < count; k++){   // a tussock of 2–5 blades
      const a = rand()*Math.PI*2, rr = rand()*.09, hgt = tall*(.7 + rand()*.45)
      q.setFromEuler(new THREE.Euler(.05 + rand()*.28, a, (rand() - .5)*.15, 'YXZ'))   // yaw outward, then lean (≤ .33 rad)
      s.set(.8 + rand()*.6, hgt, 1); p.set(x + Math.sin(a)*rr, h - .02, z + Math.cos(a)*rr)
      c.setHSL(hue + (rand() - .5)*.02, sat, lit*(.9 + rand()*.2))
      items.push([new THREE.Matrix4().compose(p, q, s), c.clone()])
    }
  }
  const cells = new Map()                                              // spatial batches → frustum culling
  for (const it of items){ const e = it[0].elements, k = `${Math.floor(e[12]/16)},${Math.floor(e[14]/16)}`; (cells.get(k) || cells.set(k, []).get(k)).push(it) }
  for (const list of cells.values()){
    const im = new THREE.InstancedMesh(geo, mat, list.length)
    list.forEach(([m, col], i) => { im.setMatrixAt(i, m); im.setColorAt(i, col) })
    im.receiveShadow = true; im.layers.set(MEADOW_LAYER); im.computeBoundingSphere(); im.boundingSphere.radius += .4
    scene.add(im)
  }
}

// Crafted leafy shrub generator (unit space: base at origin, ~2 wide, ~1.3 tall) + a woody-shoot tube helper.
// Leaf cards in 11–16 overlapping clumps; every vertex carries its clump centre (`clusterCenter`) so the puff
// normal in threejs-ghibli-toon-shading shades each clump as one soft volume. Habits: 'mound' (boxwood),
// 'upright' (hydrangea vase), 'arching' (yamabuki canes). Blooms: 'dots' | 'balls' (mopheads). `tip`: new-growth tint.
// Adapt: map the cards' UVs onto your leaf atlas (flowers use its pale centre stripe u = .45–.55 so the green
// gradient doesn't muddy their colour); instance per 16 m cell; SHRUB_SCALE ≈ 1.45 so they rise out of the grass.
//   const { leaves, stems } = shrubGeometry(9, { hue:.235, leaves:820, bloom:.9, bloomColor:new THREE.Color(0xee92b4) })

export const random = seed => () => { let t = seed += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296 }
const V = (x=0,y=0,z=0) => new THREE.Vector3(x,y,z)

function buffer(){ return { p:[], n:[], c:[], i:[] } }
function vertex(b,p,n,c){ b.p.push(...p); b.n.push(...n); b.c.push(c.r,c.g,c.b); return b.p.length/3-1 }
function geometry(b){ const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(b.p,3)); g.setAttribute('normal',new THREE.Float32BufferAttribute(b.n,3)); g.setAttribute('color',new THREE.Float32BufferAttribute(b.c,3)); g.setIndex(b.i); g.computeBoundingSphere(); return g }
function tube(b,points,radius,color,sides=7){
  const start=b.p.length/3
  points.forEach((p,j)=>{ const dir=points[Math.min(j+1,points.length-1)].clone().sub(points[Math.max(0,j-1)]).normalize(); const side=V().crossVectors(dir,V(.12,1,.08)).normalize(), other=V().crossVectors(dir,side).normalize()
    for(let k=0;k<sides;k++){ const a=k/sides*Math.PI*2, normal=side.clone().multiplyScalar(Math.cos(a)).addScaledVector(other,Math.sin(a)); vertex(b,p.clone().addScaledVector(normal,radius[j]),normal,color) }
    if(j) for(let k=0;k<sides;k++){ const a=start+(j-1)*sides+k, d=start+(j-1)*sides+(k+1)%sides; b.i.push(a,d,a+sides,d,d+sides,a+sides) }
  })
}

export function shrubGeometry(seed, { leaves=1100, bloom=0, bloomColor=new THREE.Color(1,.93,.96), bloomColor2=null, bloomKind='dots', hue=.26, habit='mound', leafL=1, tip=null } = {}){
  const r=random(seed), E=habit==='upright' ? V(.74,1.25,.74) : V(1,.8,1), EC=habit==='upright' ? V(0,.8,0) : V(0,.52,0)
  const P=[], N=[], C=[], UV=[], CC=[], I=[]
  const nClump=11+(r()*6|0), clumps=[], canes=[]
  if(habit==='arching') for(let k=0,nc=6+(r()*3|0);k<nc;k++){                       // canes: up steeply, then bowing out and over
    const a=k/nc*Math.PI*2+r()*.5, R=.7+r()*.4, H=.95+r()*.35, d=V(Math.cos(a),0,Math.sin(a)), s0=V((r()-.5)*.1,0,(r()-.5)*.1)
    const at=t=>s0.clone().addScaledVector(d,R*t*(.25+.95*t)).add(V(0,H*(2.1*t-1.35*t*t),0))
    canes.push(at); for(const t of [.42,.62,.8,.96]) clumps.push({ c:at(t), cr:.16+.07*r(), out:at(t).sub(EC).setY(Math.max(.1,at(t).y-.3)).normalize(), tint:(r()-.5) }) }
  else for(let i=0;i<nClump;i++){
    const a=r()*Math.PI*2, el=i===0 ? 1.45 : -.25+r()*1.45
    const dir=V(Math.cos(a)*Math.cos(el),Math.sin(el),Math.sin(a)*Math.cos(el))
    const c=EC.clone().add(dir.clone().multiply(E).multiplyScalar(.5+.22*r())); c.y=Math.max(c.y,.24)
    clumps.push({ c, cr:.34+.14*r(), out:c.clone().sub(EC).divide(E).normalize(), tint:(r()-.5) })
  }
  const col=new THREE.Color(), tmp=V()
  const card=(p,n,t,L,W,color,center,u0=0,u1=1)=>{
    const bt=V().crossVectors(n,t).normalize(), base=p.clone().addScaledVector(t,-L/2), tip=p.clone().addScaledVector(t,L/2).addScaledVector(n,-.18*L)   // the tip droops a little
    const k=P.length/3
    ;[[base,-1,0],[base,1,0],[tip,1,1],[tip,-1,1]].forEach(([q,sx,v])=>{ const w=q.clone().addScaledVector(bt,sx*W/2); P.push(w.x,w.y,w.z); N.push(n.x,n.y,n.z); C.push(color.r,color.g,color.b); UV.push(sx<0?u0:u1,v); CC.push(center.x,center.y,center.z) })
    I.push(k,k+1,k+2,k,k+2,k+3)
  }
  const rv=()=>V(r()*2-1,r()*2-1,r()*2-1)
  for(const cl of clumps){
    const n=Math.round(leaves/clumps.length*(.8+.4*r()))
    for(let j=0;j<n;j++){
      const u=rv().normalize().addScaledVector(cl.out,1.1).normalize()
      const p=cl.c.clone().addScaledVector(u,cl.cr*(.45+.55*Math.sqrt(r())))
      if(p.y<.04) continue
      const nn=u.clone().multiplyScalar(.75).add(V(0,.45,0)).add(rv().multiplyScalar(.35)).normalize()
      const t=V().crossVectors(nn,rv()).normalize(), L=(.17+.09*r())*leafL
      // colour: deeper and cooler inside and underneath, fresh yellow-green on the sunny outer tips (or red new growth)
      const depth=Math.min(1,p.clone().sub(EC).divide(E).length()), sun=Math.max(0,u.y)*depth
      col.setHSL(hue+cl.tint*.035+.02*sun,.5+.12*sun,.16+.1*depth+.1*sun+.03*(r()-.5))
      col.multiplyScalar(.55+.45*Math.min(1,p.y/.5))
      if(tip && sun>.35) col.lerp(tip,Math.min(1,(sun-.35)*1.6)*(.6+.4*r()))
      card(p,nn,t,L,L*.52,col,cl.c)
    }
    // hydrangea: one mophead per outer clump, a ball of floret cards (pale stripe of the atlas), two colours drifting across the shrub
    if(bloomKind==='balls' && bloom>0 && cl.out.y>-.15 && r()<bloom){
      const br=.14+.06*r(), bc=cl.c.clone().addScaledVector(cl.out,cl.cr*.92).add(V(0,.04,0)), mix=r(), up=cl.out.clone().add(V(0,.8,0)).normalize()
      for(let j=0;j<44;j++){ const y=1-2*(j+.5)/44, rr=Math.sqrt(1-y*y), ph=j*2.39996, dir=V(Math.cos(ph)*rr,y,Math.sin(ph)*rr)
        if(dir.dot(up)<-.35) continue
        const p=bc.clone().addScaledVector(dir,br*(.92+.12*r()))
        col.copy(bloomColor); if(bloomColor2) col.lerp(bloomColor2,Math.min(1,Math.max(0,mix+(r()-.5)*.5))); col.multiplyScalar(.85+.3*r()+.12*Math.max(0,dir.y))
        card(p,dir,V().crossVectors(dir,rv()).normalize(),.06+.02*r(),.055,col,bc,.45,.55) } }
    // flowers sample only the pale centre stripe of the leaf atlas, so the green gradient doesn't muddy their colour
    if(bloomKind==='dots' && bloom>0 && cl.out.y>.15) for(let j=0,m=Math.round(bloom*110*cl.out.y);j<m;j++){
      const u=rv().normalize().addScaledVector(cl.out,1.6).normalize()
      const p=cl.c.clone().addScaledVector(u,cl.cr*1.02), nn=u.clone().add(V(0,.6,0)).normalize()
      col.copy(bloomColor).multiplyScalar(.95+.25*r()); card(p,nn,V().crossVectors(nn,rv()).normalize(),.06+.025*r(),.05,col,cl.c,.45,.55)
    }
  }
  const g=new THREE.BufferGeometry()
  g.setAttribute('position',new THREE.Float32BufferAttribute(P,3)); g.setAttribute('normal',new THREE.Float32BufferAttribute(N,3))
  g.setAttribute('color',new THREE.Float32BufferAttribute(C,3)); g.setAttribute('uv',new THREE.Float32BufferAttribute(UV,2))
  g.setAttribute('clusterCenter',new THREE.Float32BufferAttribute(CC,3)); g.setIndex(I); g.computeBoundingSphere()
  // woody shoots from the root crown out toward the lower clumps
  const b=buffer(), bark=new THREE.Color(.12,.085,.055)
  if(canes.length) canes.forEach(at=>tube(b,[0,.2,.4,.6,.8,.97].map(at),[.018,.015,.012,.009,.007,.005],new THREE.Color(.2,.21,.09),5))   // green-brown canes carry the arching habit
  else clumps.filter(cl=>cl.c.y<.75).slice(0,7).forEach(cl=>{
    const s0=V((r()-.5)*.12,0,(r()-.5)*.12), end=cl.c.clone().multiplyScalar(.85), mid=s0.clone().lerp(end,.5).add(V(0,.06,0))
    tube(b,[s0,mid,end],[.032,.022,.012],bark,5)
  })
  return { leaves:g, stems:geometry(b) }
}

// Falling sakura petals: one instanced quad (1440 instances) animated fully on the GPU. Twice a second the CPU
// hands the 8 crowns nearest the camera to the shader; each petal spawns inside a crown, falls, drifts downwind,
// flutters, tumbles, and lies flat once it lands. Size for the scene: 3.5–4.5 cm (a real 1.5 cm petal is 3 px at 5 m).
// Adapt: CROWNS = [[x, crownCentreY, z, crownRadius, groundY], …] gathered wherever sakura are placed (crafted,
// far and blob trees alike); U.uTime/uWind/uSunDir shared uniforms; hide the mesh from the AO pass.

export function buildPetals(scene, U, CROWNS, rand, { n = 1440, crowns = 8, reach = 60 } = {}){
  const c = document.createElement('canvas'); c.width = c.height = 64; const g2 = c.getContext('2d')   // notched oval, pink flush at the base
  const grad = g2.createLinearGradient(0, 60, 0, 4); grad.addColorStop(0, '#f2b9ca'); grad.addColorStop(.45, '#fff2f5'); grad.addColorStop(1, '#ffffff')
  g2.fillStyle = grad; g2.beginPath(); g2.moveTo(32, 62); g2.bezierCurveTo(6, 44, 8, 10, 24, 5); g2.quadraticCurveTo(32, 12, 40, 5); g2.bezierCurveTo(56, 10, 58, 44, 32, 62); g2.fill()
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace

  const geo = new THREE.InstancedBufferGeometry(); geo.copy(new THREE.PlaneGeometry(1, 1))
  const sd = []; for (let i = 0; i < n; i++) sd.push(rand(), rand(), rand(), rand())
  geo.setAttribute('seed', new THREE.InstancedBufferAttribute(new Float32Array(sd), 4)); geo.instanceCount = n
  const mat = new THREE.ShaderMaterial({ alphaTest:.5, side:THREE.DoubleSide, fog:true,
    uniforms:{ ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), uTime:U.uTime, uWind:U.uWind, uSunDir:U.uSunDir, tPetal:{ value:tex },
      uCrown:{ value:Array.from({ length:crowns }, () => new THREE.Vector4()) }, uGround:{ value:new Array(crowns).fill(0) } },
    vertexShader:/* glsl */`attribute vec4 seed; uniform float uTime, uWind; uniform vec4 uCrown[${crowns}]; uniform float uGround[${crowns}];
      varying vec2 vUv; varying vec3 vN; varying float vTint;
      #include <fog_pars_vertex>
      void main(){ vUv = uv; vTint = seed.y;
        int ci = int(seed.x*${crowns}.); vec4 C = uCrown[ci]; float gy = uGround[ci];
        if (C.w <= 0.){ gl_Position = vec4(2., 2., 2., 1.); return; }                       // empty slot: off-screen
        float sp = .42 + .32*seed.y, life = (C.y + C.w - gy)/sp + 3., ph = fract(uTime/life + seed.z), tt = ph*life;
        vec3 p = C.xyz + (vec3(fract(seed.w*13.1), fract(seed.w*7.7), fract(seed.w*3.3)) - .5)*2.*C.w*vec3(1., .55, 1.);
        p.y -= sp*tt; p.xz += vec2(.55, .35)*uWind*tt*.5 + vec2(sin(tt*2.1 + seed.w*9.), cos(tt*1.7 + seed.z*7.))*.3;
        float landed = step(p.y, gy + .012); p.y = max(p.y, gy + .012);
        float a = tt*(2.2 + 3.*seed.y) + seed.w*6.3, b = tt*(1.4 + 2.*seed.z) + seed.x*4.;
        mat3 Ry = mat3(cos(a), 0., -sin(a), 0., 1., 0., sin(a), 0., cos(a)), Rx = mat3(1., 0., 0., 0., cos(b), sin(b), 0., -sin(b), cos(b));
        mat3 R = landed > .5 ? Ry : Ry*Rx;                                                   // tumbling in the air, flat once down
        vec3 corner = R*vec3(position.x*.042, 0., position.y*.052);
        vN = R*vec3(0., 1., 0.);
        float vis = smoothstep(0., .03, ph)*(1. - smoothstep(.94, 1., ph));
        vec4 mvPosition = viewMatrix*vec4(p + corner*vis, 1.); gl_Position = projectionMatrix*mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader:/* glsl */`uniform sampler2D tPetal; uniform vec3 uSunDir; varying vec2 vUv; varying vec3 vN; varying float vTint;
      #include <fog_pars_fragment>
      void main(){ vec4 t = texture2D(tPetal, vUv); if (t.a < .5) discard;
        vec3 base = t.rgb*mix(vec3(1., .84, .9), vec3(.97, .72, .82), vTint);
        float l = .55 + .35*abs(dot(normalize(vN), uSunDir)) + .15*max(uSunDir.y, 0.);        // thin petal: lit from either side
        gl_FragColor = vec4(base*l, 1.);
        #include <fog_fragment>
      }` })
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.layers.set(1); scene.add(mesh)

  let last = -1
  return function stepPetals(t, camera){                                                   // call every frame; updates at 2 Hz
    if (t - last < .5) return; last = t
    const near = CROWNS.map(c => [c, Math.hypot(c[0] - camera.position.x, c[2] - camera.position.z)])
      .filter(a => a[1] < reach).sort((a, b) => a[1] - b[1]).slice(0, crowns)
    const u = mat.uniforms
    for (let i = 0; i < crowns; i++){ const c = near[i]?.[0]
      if (c){ u.uCrown.value[i].set(c[0], c[1], c[2], c[3]); u.uGround.value[i] = c[4] } else u.uCrown.value[i].w = 0 }
  }
}
// Add a static carpet under each crown too: ~55 small PlaneGeometry(.034,.042) instances per crown, tinted per
// instance, culled per 32 m cell.

// ---- canopy-rim.glsl (threejs-procedural-vegetation/references/canopy-rim.glsl) ----
// Potong outline bergerigi ke kanopi blob di fragment shader. Diinjeksikan lewat
// patch(mat, { normal: CANOPY_RIM, ... }) — hook `normal` (setelah normal_fragment_maps),
// karena di titik itu `normal`, `vLocal`, `vViewPosition`, `vn3`/`fbm3` sudah tersedia.
// (Komentar asli skill menyebut hook `color`, tapi `normal` belum terdefinisi di sana.)
export const CANOPY_RIM = `{
  vec3 Vv = normalize(vViewPosition);
  float rim = 1. - abs(dot(normalize(normal), Vv));
  float lobes = fbm3(vLocal*2.6 + 1.7), ln = lobes*.7 + vn3(vLocal*9.)*.3;
  if (rim > .24 + .62*ln) discard;
  diffuseColor.rgb *= .72 + .42*smoothstep(.32, .68, lobes);
}`;
