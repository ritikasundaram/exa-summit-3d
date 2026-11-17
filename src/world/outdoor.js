import * as THREE from 'three';
import { scene, addCollider, addColliderC, addColliderCircle, addInteractable, addSpot, addZone, onUpdate, v3, duskLight, duskEmissive, duskColor, duskOpacity } from '../core.js';
import { M, box, cyl, blobShadow } from './mat.js';
import { logoMesh } from './logo.js';
import { textPlane, canvasTexture, grassTexture, plankSet, concreteSet, FONT, MONO, drawLogo } from './tex.js';
import { buildSkyDome, SKY_GLSL, NOISE_GLSL, SKY_UNIFORMS } from './sky.js';
import { G } from './graphics.js';
import { B } from './building.js';
import { stool, roundTable, plant, person, cluster, addInstance, photoHolder } from './props.js';
import { makeGoat, spawnHerd, animateGoat } from './goats.js';
import { act } from '../actions.js';
import { DRINKS } from '../data/drinks.js';
import { COLORS } from '../config.js';
import { COCKTAILS, project } from '../data/cocktails.js';

const PI = Math.PI;
export const DECK = { x0: -90, x1: 70, zN: -44, zS: B.zN - 0.2 };
export const PEN = { minX: 44, maxX: 60, minZ: -38, maxZ: -22 };
export const BOOTH = { x: 33, backdropZ: -41.2, camZ: -35.4, standX: 33.6, standZ: -39.4 };
export const outdoorRefs = {};

export function buildOutdoor() {
  buildSky();
  buildWater();
  buildDeck();
  buildBayBridge();
  buildSkyline();
  buildBar();
  buildGoatPen();
  buildPhotoBooth();
  buildPartyDecor();
  addZone('Bay Terrace · After party', DECK.x0, DECK.zN, DECK.x1, DECK.zS, '#1630B8');
}

// ---------------------------------------------------------------- Sky (golden hour)
function buildSky() {
  outdoorRefs.sky = buildSkyDome(scene, onUpdate);
}

// ---------------------------------------------------------------- Water
// Fresnel reflection of the analytic sky over a dark bay, rippled by scrolling noise,
// with sun glitter and aerial perspective toward the horizon.
function buildWater() {
  const mat = new THREE.ShaderMaterial({
    fog: false,
    toneMapped: false,
    uniforms: { time: { value: 0 }, ...SKY_UNIFORMS },
    vertexShader: /* glsl */ `
      varying vec3 vPos;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vPos = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float time;
      varying vec3 vPos;
      ${SKY_GLSL}
      ${NOISE_GLSL}
      float waves(vec2 p) {
        float h = vnoise(p * 0.35 + vec2(time * 0.22, time * 0.13)) * 0.6;
        h += vnoise(p * 0.9 + vec2(-time * 0.31, time * 0.27)) * 0.28;
        h += vnoise(p * 2.3 + vec2(time * 0.5, -time * 0.42)) * 0.12;
        return h;
      }
      void main() {
        vec3 toCam = cameraPosition - vPos;
        float dist = length(toCam);
        vec3 V = toCam / dist;
        float e = 0.18 + dist * 0.004;
        float h0 = waves(vPos.xz);
        float hx = waves(vPos.xz + vec2(e, 0.0));
        float hz = waves(vPos.xz + vec2(0.0, e));
        float steep = 1.5 / (1.0 + dist * 0.012);
        vec3 N = normalize(vec3(-(hx - h0) / e * steep, 1.0, -(hz - h0) / e * steep));
        vec3 R = reflect(-V, N);
        R.y = abs(R.y) + 0.02;
        float F = 0.02 + 0.98 * pow(clamp(1.0 - dot(N, V), 0.0, 1.0), 5.0);
        vec3 deep = vec3(0.010, 0.040, 0.062) * (1.0 - 0.6 * uDusk);
        vec3 col = mix(deep, skyColor(normalize(R)), F);
        vec3 H = normalize(V + uSunDir);
        col += vec3(1.0, 0.66, 0.36) * pow(max(dot(N, H), 0.0), 260.0) * 5.0 * (1.0 - uDusk);
        float haze = smoothstep(150.0, 1500.0, dist);
        col = mix(col, skyColor(normalize(vec3(-V.x, 0.015, -V.z))) * 0.92, haze * 0.9);
        gl_FragColor = vec4(max(col, vec3(0.0)), 1.0);
      }`,
  });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), mat);
  water.rotation.x = -PI / 2;
  water.position.y = -1.4;
  scene.add(water);
  onUpdate((dt, t) => (mat.uniforms.time.value = t));
}

// ---------------------------------------------------------------- Deck, railings, palms
function buildDeck() {
  const { x0, x1, zN, zS } = DECK;
  const W = x1 - x0;
  const D = zS - zN;
  // weathered timber boards (they run toward the water), a little damp from the bay air
  const boards = plankSet({ size: 1024, planks: 16, hue: 28, sat: 20, light: 38, lenMin: 700, lenMax: 1024, rough: [0.62, 0.86], seed: 23, strength: 3, weathered: true });
  for (const t of [boards.map, boards.normalMap, boards.roughnessMap]) t.repeat.set(D / 2.4, W / 2.4);
  // plane built D × W then turned, so the texture's plank direction (U) points at the water
  const deckGeo = new THREE.PlaneGeometry(D, W).rotateZ(PI / 2).rotateX(-PI / 2);
  const deck = new THREE.Mesh(deckGeo, new THREE.MeshStandardMaterial({ map: boards.map, normalMap: boards.normalMap, normalScale: new THREE.Vector2(0.8, 0.8), roughnessMap: boards.roughnessMap, roughness: 1 }));
  deck.position.set((x0 + x1) / 2, 0, (zN + zS) / 2);
  scene.add(deck);
  // concrete apron next to the building
  const conc = concreteSet({});
  for (const t of [conc.map, conc.normalMap]) t.repeat.set(W / 2.4, 1);
  const apron = new THREE.Mesh(new THREE.PlaneGeometry(W, 2.4), new THREE.MeshStandardMaterial({ map: conc.map, normalMap: conc.normalMap, roughness: 0.9 }));
  apron.rotation.x = -PI / 2;
  apron.position.set((x0 + x1) / 2, 0.012, zS - 1.2);
  scene.add(apron);
  // seawall face
  scene.add(box(W, 1.5, 0.6, M.sandstoneDark, (x0 + x1) / 2, -0.75, zN - 0.3));
  scene.add(box(0.6, 1.5, D, M.sandstoneDark, x1 + 0.3, -0.75, (zN + zS) / 2));
  scene.add(box(0.6, 1.5, D, M.sandstoneDark, x0 - 0.3, -0.75, (zN + zS) / 2));
  // railings
  const railTop = new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.4, metalness: 0.7 });
  const postGeo = new THREE.CylinderGeometry(0.035, 0.035, 1.1, 6).translate(0, 0.55, 0);
  const panelGeo = new THREE.BoxGeometry(1.9, 0.9, 0.02).translate(0, 0.5, 0);
  for (let x = x0; x <= x1; x += 2) {
    addInstance('post', postGeo, railTop, new THREE.Vector3(x, 0, zN + 0.15));
    if (x < x1) addInstance('rpanel', panelGeo, M.glass, new THREE.Vector3(x + 1, 0, zN + 0.15));
  }
  for (const xe of [x0, x1]) {
    for (let z = zN; z <= zS - 0.5; z += 2) {
      addInstance('post', postGeo, railTop, new THREE.Vector3(xe, 0, z));
      if (z + 2 < zS) addInstance('rpanel', panelGeo, M.glass, new THREE.Vector3(xe, 0, z + 1), PI / 2);
    }
    const rail = box(0.08, 0.06, D, railTop, xe, 1.1, (zN + zS) / 2);
    scene.add(rail);
  }
  scene.add(box(W, 0.06, 0.08, railTop, (x0 + x1) / 2, 1.1, zN + 0.15));
  addCollider(x0 - 2, zN - 3, x1 + 2, zN + 0.4);
  addCollider(x1 - 0.3, zN, x1 + 3, zS);
  addCollider(x0 - 3, zN, x0 + 0.3, zS);

  // Embarcadero palms
  for (let x = -84; x < 12; x += 11) palm(x, -41.4);
  palm(64, -40.5);
  palm(64, -16);
  palm(-6, -16);
  // benches
  for (let x = -78; x < 0; x += 22) {
    const b = new THREE.Group();
    b.add(box(2.2, 0.08, 0.5, M.wood, 0, 0.45, 0));
    b.add(box(2.2, 0.4, 0.06, M.wood, 0, 0.72, -0.25));
    b.add(box(0.08, 0.45, 0.45, M.darkMetal, -0.9, 0.22, 0), box(0.08, 0.45, 0.45, M.darkMetal, 0.9, 0.22, 0));
    b.position.set(x, 0, -40.6);
    scene.add(b);
    addColliderC(x, -40.6, 2.2, 0.6);
  }
  // A few people strolling the west deck
  cluster(-40, -30, 2, 0.6, { drinks: true });
  cluster(-15, -25, 3, 0.7, { drinks: true });
}

const palmTrunk = new THREE.MeshStandardMaterial({ color: 0x7b6650, roughness: 1 });
const palmFrond = new THREE.MeshStandardMaterial({ color: 0x35663a, roughness: 0.7, side: THREE.DoubleSide });
const palmFrondGeo = (() => {
  // a feather frond: narrow leaflets either side of an arching midrib
  const g = new THREE.PlaneGeometry(0.9, 3.0, 6, 8);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const t = pos.getY(i) / 3.0 + 0.5;
    const x = pos.getX(i) * (0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, t * 0.9 + 0.1)));
    pos.setXYZ(i, x, t * 3.0, 0.2 * t * t * 3.0 - Math.abs(x) * 0.55);
  }
  g.computeVertexNormals();
  return g;
})();
function palm(x, z) {
  const g = new THREE.Group();
  let px = 0;
  let py = 0;
  const lean = (Math.random() - 0.5) * 0.08;
  for (let i = 0; i < 8; i++) {
    const seg = cyl(0.17 - i * 0.008, 0.19 - i * 0.008, 1.1, palmTrunk, 9);
    px += lean;
    seg.position.set(px, py + 0.55, 0);
    seg.rotation.z = -lean;
    g.add(seg);
    py += 1.05;
  }
  for (let i = 0; i < 16; i++) {
    const f = new THREE.Mesh(palmFrondGeo, palmFrond);
    f.position.set(px, py - 0.1, 0);
    f.rotation.set(0.5 + (i % 2) * 0.45 + Math.random() * 0.35, (i / 16) * PI * 2 + Math.random() * 0.2, 0, 'YXZ');
    f.scale.setScalar(0.85 + Math.random() * 0.3);
    g.add(f);
  }
  g.add(blobShadow(1.6));
  g.position.set(x, 0, z);
  scene.add(g);
  addColliderCircle(x, z, 0.3);
}

// ---------------------------------------------------------------- Bay Bridge + hills
function buildBayBridge() {
  const p0 = new THREE.Vector3(420, 0, 80);
  const p1 = new THREE.Vector3(1500, 0, -820);
  const dir = p1.clone().sub(p0);
  const len = dir.length();
  dir.normalize();
  const ang = Math.atan2(dir.x, dir.z);
  const deckY = 58;
  const steel = new THREE.MeshStandardMaterial({ color: 0x8a9199, roughness: 0.7, metalness: 0.2 });
  steel.userData.noCast = true;
  const at = (t, y = 0) => p0.clone().addScaledVector(dir, t * len).setY(y);

  const deckM = box(14, 4, len, steel);
  deckM.position.copy(at(0.5, deckY));
  deckM.rotation.y = ang;
  scene.add(deckM);
  // deck lights (road)
  const roadLight = duskColor(new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.3, 1.3) }), 0.25);
  const lightGeo = new THREE.SphereGeometry(0.9, 6, 4);
  for (let t = 0; t <= 1; t += 0.012) addInstance('roadlight', lightGeo, roadLight, at(t, deckY + 2.5));
  // towers + cables
  const towers = [0.1, 0.3, 0.56, 0.76];
  const towerH = 155;
  for (const t of towers) {
    for (const side of [-6, 6]) {
      const p = at(t, 0);
      const off = new THREE.Vector3(Math.cos(ang), 0, -Math.sin(ang)).multiplyScalar(side);
      const tw = box(4, towerH, 4, steel);
      tw.position.copy(p).add(off).setY(towerH / 2 - 2);
      tw.rotation.y = ang;
      scene.add(tw);
    }
    // tower lights
    addInstance('towerlight', new THREE.SphereGeometry(1.6, 6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.0, 0.5, 0.35) }), at(t, towerH));
  }
  // anchorage in the middle
  const ancMat = new THREE.MeshStandardMaterial({ color: 0x8c8a84, roughness: 1 });
  ancMat.userData.noCast = true;
  const anc = box(30, 70, 40, ancMat);
  anc.position.copy(at(0.43, 33));
  anc.rotation.y = ang;
  scene.add(anc);
  // main cables + "Bay Lights" vertical LEDs
  const cableMat = new THREE.LineBasicMaterial({ color: 0x9fa9bb });
  const ledMat = duskColor(new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.6, 2.8) }), 0.3);
  const ledGeo = new THREE.BoxGeometry(1.8, 1, 1.8);
  const spans = [[0.0, 0.1], [0.1, 0.3], [0.3, 0.43], [0.43, 0.56], [0.56, 0.76], [0.76, 0.86]];
  const ledMeshes = [];
  for (const [a, b] of spans) {
    const pts = [];
    for (let i = 0; i <= 30; i++) {
      const t = a + ((b - a) * i) / 30;
      const k = (i / 30) * 2 - 1;
      const isEnd = a === 0 || b === 0.86;
      const topA = a === 0 || a === 0.43 ? deckY + 8 : towerH;
      const topB = b === 0.86 || b === 0.43 ? deckY + 8 : towerH;
      const lin = topA + (topB - topA) * (i / 30);
      const sag = isEnd ? 0 : (1 - k * k) * (Math.min(topA, topB) - deckY - 8);
      pts.push(at(t, lin - sag));
    }
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    scene.add(new THREE.Line(g, cableMat));
    // vertical LED suspenders
    for (let i = 1; i < 30; i += 1) {
      const p = pts[i];
      const h = p.y - deckY - 2;
      if (h < 2) continue;
      const m = new THREE.Matrix4().compose(new THREE.Vector3(p.x, deckY + 2 + h / 2, p.z), new THREE.Quaternion(), new THREE.Vector3(1, h, 1));
      ledMeshes.push(m);
    }
  }
  const leds = new THREE.InstancedMesh(ledGeo, ledMat, ledMeshes.length);
  ledMeshes.forEach((m, i) => leds.setMatrixAt(i, m));
  leds.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(ledMeshes.length * 3).fill(1), 3);
  scene.add(leds);
  // shimmer the Bay Lights
  const col = new THREE.Color();
  onUpdate((dt, t) => {
    for (let i = 0; i < ledMeshes.length; i++) {
      const v = 0.35 + 0.65 * Math.max(0, Math.sin(i * 0.37 - t * 2.2));
      col.setRGB(v, v, v * 1.05);
      leds.setColorAt(i, col);
    }
    leds.instanceColor.needsUpdate = true;
  });
  // piers
  for (let t = 0.02; t < 1; t += 0.06) {
    const pier = box(8, deckY, 6, steel);
    pier.position.copy(at(t, deckY / 2 - 2));
    pier.rotation.y = ang;
    scene.add(pier);
  }
  // Yerba Buena island + East Bay hills
  const hillMat = new THREE.MeshStandardMaterial({ color: 0x5a5648, roughness: 1 });
  hillMat.userData.noCast = true;
  const yb = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), hillMat);
  yb.scale.set(160, 70, 120);
  yb.position.copy(at(0.95, -10));
  scene.add(yb);
  for (let i = 0; i < 9; i++) {
    const h = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), hillMat);
    h.scale.set(320 + Math.random() * 200, 70 + Math.random() * 60, 120);
    h.position.set(-700 + i * 330, -15, -1500 - Math.random() * 150);
    scene.add(h);
  }
  // distant city lights on the hills
  const cityGeo = new THREE.BufferGeometry();
  const cp = [];
  for (let i = 0; i < 900; i++) cp.push(-800 + Math.random() * 3000, 1 + Math.random() * 18, -1380 - Math.random() * 60);
  cityGeo.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3));
  scene.add(new THREE.Points(cityGeo, duskOpacity(new THREE.PointsMaterial({ color: new THREE.Color(2.2, 1.8, 1.2), size: 2, sizeAttenuation: false }))));
}

// ---------------------------------------------------------------- City skyline (south, behind the Ferry Building)
function buildSkyline() {
  // curtain-wall towers: ribbon glazing between light spandrels, a few lit floors
  const facade = (glass, spandrel) => {
    const lit = Array.from({ length: 7 * 8 }, () => Math.random());
    const draw = (emissive) => (ctx, w, h) => {
      ctx.fillStyle = emissive ? '#000' : spandrel;
      ctx.fillRect(0, 0, w, h);
      for (let row = 0; row < 7; row++) {
        for (let c = 0; c < 8; c++) {
          const v = lit[row * 8 + c];
          if (emissive) ctx.fillStyle = v < 0.2 ? (v < 0.06 ? '#ffe9c4' : '#d99a4e') : '#000';
          else ctx.fillStyle = v < 0.05 ? '#ffe2ae' : v < 0.5 ? glass[0] : glass[1];
          ctx.fillRect(c * 16 + 1, row * 36 + 6, 14, 26);
        }
      }
    };
    const map = canvasTexture(128, 252, draw(false));
    const glow = canvasTexture(128, 252, draw(true));
    map.wrapS = map.wrapT = glow.wrapS = glow.wrapT = THREE.RepeatWrapping;
    return { map, glow };
  };
  const tints = [
    [['#4d6a8c', '#3c5878'], '#c9ccd0'],
    [['#5b6f7d', '#46596a'], '#b7ab98'],
    [['#39495f', '#2c3a4e'], '#8f969e'],
  ].map(([glass, spandrel]) => {
    const t = facade(glass, spandrel);
    // office floors light up as the sky darkens
    const m = duskEmissive(new THREE.MeshStandardMaterial({ map: t.map, emissive: 0xffffff, emissiveMap: t.glow, roughness: 0.22, metalness: 0.55, envMapIntensity: 1.2 }), 0, 0.75);
    m.userData.noCast = true;
    return m;
  });
  for (let i = 0; i < 34; i++) {
    const w = 22 + Math.random() * 26;
    const d = 22 + Math.random() * 26;
    const h = 45 + Math.random() * 130;
    const x = -260 + i * 16 + Math.random() * 10;
    const z = 150 + Math.random() * 200;
    const geo = new THREE.BoxGeometry(w, h, d);
    const uv = geo.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * Math.round(w / 12), uv.getY(k) * Math.round(h / 24.5));
    const m = new THREE.Mesh(geo, tints[i % 3]);
    m.position.set(x, h / 2, z);
    scene.add(m);
  }
}

// ---------------------------------------------------------------- Exa-ited! bar
function buildBar() {
  const bx = 22.5;
  // back bar
  const back = new THREE.Group();
  back.add(box(9.6, 2.1, 0.6, M.wood, 0, 1.05, 0));
  for (let s = 0; s < 3; s++) back.add(box(9.2, 0.04, 0.4, M.white, 0, 0.9 + s * 0.45, -0.25));
  const bottleCols = [0x2141ea, 0x8ea0ff, 0xffc36b, 0xe9e9ff, 0x3ad0a0, 0xff7a5a];
  const bottleMats = bottleCols.map((c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.45, roughness: 0.12, metalness: 0.1 }));
  for (let s = 0; s < 3; s++) for (let i = 0; i < 26; i++) {
    const b = cyl(0.04, 0.045, 0.3, bottleMats[(i + s) % bottleCols.length], 10);
    b.position.set(-4.4 + i * 0.35, 1.07 + s * 0.45, -0.32);
    back.add(b);
  }
  back.position.set(bx, 0, -14.6);
  scene.add(back);
  addColliderC(bx, -14.6, 9.6, 0.7);
  // menu board above the back bar
  const menu = textPlane(4.2, 3.1, G.drinkMenu(DRINKS), { pxPerM: 300, emissive: 0.75 });
  menu.position.set(bx, 3.75, -14.95);
  menu.rotation.y = PI;
  scene.add(menu);
  outdoorRefs.menuBoard = menu;
  // lightbox sign
  const sign = textPlane(4.5, 0.9, G.barSign, { pxPerM: 260, emissive: 0.9 });
  sign.position.set(bx - 3.3, 3.0, -14.95);
  sign.rotation.y = PI;
  sign.scale.setScalar(0.5);
  scene.add(sign);
  const sign2 = sign.clone();
  sign2.position.x = bx + 3.3;
  scene.add(sign2);
  // counter
  const ctr = new THREE.Group();
  ctr.add(box(9, 1.1, 0.8, M.white, 0, 0.55, 0));
  ctr.add(box(9.3, 0.06, 1.0, M.woodDark, 0, 1.13, 0));
  for (const dx of [-3, 0, 3]) {
    const p = textPlane(2.7, 0.9, G.barFront(dx === 0 ? 'word' : 'mark'), { pxPerM: 220, emissive: 0.25 });
    p.position.set(dx, 0.55, -0.41);
    p.rotation.y = PI;
    ctr.add(p);
  }
  // glasses + garnish on top
  for (let i = 0; i < 9; i++) {
    const g = cyl(0.045, 0.03, 0.14, i % 3 === 0 ? M.blueGlow : M.clearGlass, 10);
    g.position.set(-4 + i * 1.0, 1.23, -0.1);
    ctr.add(g);
  }
  ctr.add(blobShadow(10, 1.8));
  ctr.position.set(bx, 0, -17.4);
  scene.add(ctr);
  addColliderC(bx, -17.4, 9.2, 0.9);
  // canopy
  const canopy = box(10.4, 0.12, 4.2, M.white, bx, 3.2 + 2.2, -16);
  scene.add(canopy);
  for (const dx of [-5, 5]) for (const dz of [-14.2, -17.9]) {
    const p = cyl(0.06, 0.06, 5.4, M.darkMetal, 8);
    p.position.set(bx + dx, 2.7, dz);
    scene.add(p);
  }
  const trim = box(10.4, 0.35, 0.05, M.blue, bx, 5.2, -18.1);
  scene.add(trim);
  person(bx - 2.4, -16.1, PI, { shirt: 0x1c1f2a, badge: false, noCollide: true, gesture: true });
  person(bx + 1.8, -16.1, PI, { shirt: COLORS.blue, shirtLogo: true, badge: false, noCollide: true });
  for (let i = 0; i < 5; i++) stool(bx - 3.6 + i * 1.8, -18.4);
  person(bx - 1, -18.9, 0, { holdDrink: 'blue' });
  person(bx + 3.2, -19.1, -0.3, { holdDrink: 'clear', gesture: true });
  addInteractable({ id: 'drinks', pos: v3(bx, 1, -19.2), radius: 3.2, label: 'Order from the Exa-ited! bar', action: act('drinks') });
  addSpot('Exa-ited! bar', bx, -22, PI, 'After party');
  buildMoodKiosk(bx + 6.9, -18.5);
}

// ---------------------------------------------------------------- Nearest-neighbour bar: order by mood
function buildMoodKiosk(kx, kz) {
  const k = new THREE.Group();
  k.add(box(1.2, 0.06, 0.6, M.darkMetal, 0, 0.03, 0));
  k.add(box(0.92, 1.9, 0.2, M.blue, 0, 1.01, 0));
  k.add(box(0.96, 0.05, 0.24, M.white, 0, 1.985, 0));
  // touch screen: the prompt, plus every cocktail as a dot in mood space
  const screen = textPlane(0.76, 1.08, (ctx, w, h) => {
    ctx.fillStyle = '#0b1036';
    ctx.fillRect(0, 0, w, h);
    drawLogo(ctx, w * 0.08, h * 0.05, h * 0.055, '#fff');
    ctx.fillStyle = '#9fb0ff';
    ctx.font = `600 ${h * 0.026}px ${MONO}`;
    ctx.fillText('nearest-neighbour bar', w * 0.2, h * 0.09);
    ctx.fillStyle = '#fff';
    ctx.font = `800 ${h * 0.075}px ${FONT}`;
    ctx.fillText('What’s your', w * 0.08, h * 0.2);
    ctx.fillText('mood?', w * 0.08, h * 0.28);
    ctx.fillStyle = '#fff';
    ctx.fillRect(w * 0.08, h * 0.33, w * 0.84, h * 0.085);
    ctx.fillStyle = '#6b7396';
    ctx.font = `500 ${h * 0.032}px ${FONT}`;
    ctx.fillText('long day, need to unwind…', w * 0.12, h * 0.385);
    // the map
    const mx = w * 0.08;
    const my = h * 0.46;
    const mw = w * 0.84;
    const mh = h * 0.36;
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(mx, my, mw, mh);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(mx + mw / 2, my + 8);
    ctx.lineTo(mx + mw / 2, my + mh - 8);
    ctx.moveTo(mx + 8, my + mh / 2);
    ctx.lineTo(mx + mw - 8, my + mh / 2);
    ctx.stroke();
    for (const c of COCKTAILS) {
      const [px, py] = project(c.e);
      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.arc(mx + mw * (0.5 + px * 0.44), my + mh * (0.5 - py * 0.42), w * 0.016, 0, PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#2b4cff';
    ctx.fillRect(w * 0.08, h * 0.86, w * 0.84, h * 0.085);
    ctx.fillStyle = '#fff';
    ctx.font = `700 ${h * 0.036}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('Match me to a cocktail', w / 2, h * 0.915);
  }, { pxPerM: 700, emissive: 1.0 });
  // bezel sits proud of the body and the screen proud of the bezel: coplanar faces flicker
  screen.position.set(0, 1.3, 0.118);
  k.add(screen, box(0.82, 1.14, 0.02, M.black, 0, 1.3, 0.1));
  const mark = logoMesh(0.3, 0.02, M.white);
  mark.position.set(0, 0.4, 0.105);
  k.add(mark);
  // header sign on a short mast
  const mast = cyl(0.025, 0.025, 0.5, M.darkMetal, 8);
  mast.position.set(0, 2.25, 0);
  const sign = textPlane(1.7, 0.5, (ctx, w, h) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#2141EA';
    ctx.fillRect(0, 0, w, h * 0.09);
    ctx.textAlign = 'center';
    ctx.font = `800 ${h * 0.4}px ${FONT}`;
    ctx.fillText('ORDER BY MOOD', w / 2, h * 0.58);
    ctx.fillStyle = '#0D1330';
    ctx.font = `600 ${h * 0.17}px ${FONT}`;
    ctx.fillText('The nearest-neighbour bar · tap to match', w / 2, h * 0.84);
  }, { pxPerM: 400, emissive: 0.7 });
  sign.position.set(0, 2.72, 0.04);
  const signBack = box(1.74, 0.54, 0.04, M.blue, 0, 2.72, 0);
  k.add(mast, sign, signBack, blobShadow(1.8, 1.2));
  k.position.set(kx, 0, kz);
  k.rotation.y = PI; // faces the party, like the bar front
  scene.add(k);
  addColliderC(kx, kz, 1.2, 0.6);
  person(kx + 1.25, kz - 0.7, 0.6, { holdDrink: 'blue', gesture: true });
  addInteractable({ id: 'moodbar', pos: v3(kx, 1, kz - 0.9), radius: 2.3, label: 'Order by mood at the Nearest-Neighbour Bar', action: act('moodbar') });
  addSpot('Nearest-Neighbour Bar (order by mood)', kx, kz - 2.6, PI, 'After party');
}

// ---------------------------------------------------------------- Goat petting zoo
function buildGoatPen() {
  const { minX, maxX, minZ, maxZ } = PEN;
  // straw ground
  const straw = new THREE.Mesh(new THREE.PlaneGeometry(maxX - minX, maxZ - minZ), new THREE.MeshStandardMaterial({ map: grassTexture([4, 4]), roughness: 1 }));
  straw.rotation.x = -PI / 2;
  straw.position.set((minX + maxX) / 2, 0.02, (minZ + maxZ) / 2);
  scene.add(straw);
  // fence: posts + rails (gate gap on the west side)
  const fenceMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 });
  const postGeo = new THREE.BoxGeometry(0.12, 1.1, 0.12).translate(0, 0.55, 0);
  const gate = { z0: -31.2, z1: -28.8 };
  const runs = [
    [minX, minZ, maxX, minZ],
    [minX, maxZ, maxX, maxZ],
    [maxX, minZ, maxX, maxZ],
    [minX, minZ, minX, gate.z0],
    [minX, gate.z1, minX, maxZ],
  ];
  for (const [ax, az, bx, bz] of runs) {
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.ceil(len / 2);
    for (let i = 0; i <= n; i++) addInstance('fencepost', postGeo, fenceMat, new THREE.Vector3(ax + ((bx - ax) * i) / n, 0, az + ((bz - az) * i) / n));
    for (const y of [0.45, 0.9]) {
      const r = box(ax === bx ? 0.06 : len, 0.1, ax === bx ? len : 0.06, y > 0.5 ? M.blue : fenceMat, (ax + bx) / 2, y, (az + bz) / 2);
      scene.add(r);
    }
    addCollider(ax - 0.12, az - 0.12, bx + 0.12, bz + 0.12);
  }
  // little blue barn
  const barn = new THREE.Group();
  barn.add(box(3.4, 2.2, 2.6, M.blue, 0, 1.1, 0));
  const roofGeo = new THREE.CylinderGeometry(0.01, 2.2, 1.3, 4, 1);
  const roof = new THREE.Mesh(roofGeo, M.white);
  roof.rotation.y = PI / 4;
  roof.scale.set(1.15, 1, 0.9);
  roof.position.y = 2.85;
  barn.add(roof);
  barn.add(box(1.1, 1.6, 0.05, M.white, 0, 0.8, 1.31));
  barn.add(box(1.0, 0.06, 0.06, M.blue, 0, 0.8, 1.35));
  const bl = logoMesh(0.5, 0.04, M.white);
  bl.position.set(0, 1.95, 1.32);
  barn.add(bl, blobShadow(4.4, 3.6));
  barn.position.set(57.4, 0, -35.8);
  scene.add(barn);
  addColliderC(57.4, -35.8, 3.5, 2.7);
  // hay bales + trough
  const hayMat = new THREE.MeshStandardMaterial({ map: grassTexture([1, 1]), color: 0xffffff, roughness: 1 });
  for (const [x, z, r] of [[46, -36.6, 0], [47.3, -36.6, 0], [46.6, -36.6, 0], [58.6, -24, 1.2], [51, -23.2, 0.3]]) {
    const h = box(1.1, 0.5, 0.6, hayMat, x, 0.25, z);
    h.rotation.y = r;
    scene.add(h);
  }
  const hayTop = box(1.1, 0.5, 0.6, hayMat, 46.65, 0.75, -36.6);
  scene.add(hayTop);
  const trough = box(1.8, 0.4, 0.6, M.darkMetal, 52, 0.2, -37.2);
  scene.add(trough);
  // sign at the gate
  const sg = new THREE.Group();
  const board = textPlane(1.8, 1.2, G.goatSign, { pxPerM: 400, emissive: 0.25 });
  board.position.y = 1.6;
  sg.add(board);
  sg.add(box(0.08, 2.2, 0.08, M.wood, -0.8, 1.1, -0.05), box(0.08, 2.2, 0.08, M.wood, 0.8, 1.1, -0.05));
  sg.position.set(42.6, 0, -27);
  sg.rotation.y = -PI / 2 + 0.6;
  scene.add(sg);
  addColliderC(42.6, -27, 0.4, 0.4);
  // pen light, switched on for the after party
  const pl = duskLight(new THREE.PointLight(0xffd0a0, 20, 22, 1.5));
  pl.position.set(52, 5, -30);
  scene.add(pl);
  spawnHerd({ minX, maxX, minZ, maxZ }, 8);
  // handlers + guests leaning on the fence
  person(43.2, -31.8, PI / 2, { shirt: COLORS.blue, shirtLogo: true, badge: false });
  person(48, -21.2, PI, { holdDrink: 'blue' });
  person(50, -21.3, PI + 0.3, { gesture: true });
  person(46.8, -29, PI / 2, { noCollide: true });
  addInteractable({ id: 'goats', pos: v3(52, 1, -30), radius: 9.5, label: 'Pet a goat', action: act('petGoat'), petZone: true });
  addSpot('Goat petting zoo', 41, -29.8, -PI / 2, 'After party');
}

// ---------------------------------------------------------------- Photo booth
function buildPhotoBooth() {
  const { x, backdropZ, camZ } = BOOTH;
  // backdrop frame
  const bd = textPlane(6, 3.2, G.photoBackdrop, { pxPerM: 220, emissive: 0.35 });
  bd.position.set(x, 1.75, backdropZ);
  scene.add(bd);
  scene.add(box(6.3, 0.1, 0.1, M.darkMetal, x, 3.4, backdropZ - 0.05));
  scene.add(box(0.1, 3.4, 0.1, M.darkMetal, x - 3.1, 1.7, backdropZ - 0.05));
  scene.add(box(0.1, 3.4, 0.1, M.darkMetal, x + 3.1, 1.7, backdropZ - 0.05));
  addCollider(x - 3.2, backdropZ - 0.3, x + 3.2, backdropZ + 0.1);
  // floor mark
  const mark = textPlane(1.3, 1.3, (ctx, w, h) => {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = w * 0.04;
    ctx.setLineDash([w * 0.08, w * 0.05]);
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w * 0.42, 0, PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 ${h * 0.12}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('STAND', w / 2, h * 0.47);
    ctx.fillText('HERE', w / 2, h * 0.62);
  }, { pxPerM: 200, transparent: true });
  mark.rotation.x = -PI / 2;
  mark.position.set(BOOTH.standX, 0.03, BOOTH.standZ);
  scene.add(mark);
  // hay props + 2 resident photo goats
  const hayMat = new THREE.MeshStandardMaterial({ map: grassTexture([1, 1]), roughness: 1 });
  scene.add(box(1.2, 0.5, 0.65, hayMat, x - 0.9, 0.25, backdropZ + 0.9));
  scene.add(box(1.2, 0.5, 0.65, hayMat, x + 2.1, 0.25, backdropZ + 0.7));
  const g1 = makeGoat({ coat: { body: 0xf4efe6, head: 0xf4efe6 }, bandana: true, scale: 1.15 });
  g1.position.set(x - 0.9, 0.5, backdropZ + 0.95);
  g1.rotation.y = 0.7;
  const g2 = makeGoat({ coat: { body: 0xf4efe6, head: 0xf4efe6 }, bandana: true, scale: 1.1 });
  g2.position.set(BOOTH.standX + 0.8, 0, BOOTH.standZ + 0.5);
  g2.rotation.y = -0.5;
  scene.add(g1, g2);
  onUpdate((dt, t) => {
    animateGoat(g1, t, dt, false);
    animateGoat(g2, t, dt, false);
  });
  outdoorRefs.photoGoats = [g1, g2];
  // camera on tripod + ring light
  const cam = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const leg = cyl(0.015, 0.015, 1.5, M.darkMetal, 5);
    const a = (i / 3) * PI * 2;
    leg.position.set(Math.cos(a) * 0.22, 0.72, Math.sin(a) * 0.22);
    leg.rotation.set(Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3);
    cam.add(leg);
  }
  cam.add(box(0.32, 0.22, 0.18, M.black, 0, 1.55, 0));
  const lens = cyl(0.07, 0.07, 0.14, M.black, 14);
  lens.rotation.x = PI / 2;
  lens.position.set(0, 1.55, -0.15);
  cam.add(lens);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.03, 8, 30), M.whiteGlow);
  ring.position.set(0, 1.55, -0.05);
  cam.add(ring);
  cam.position.set(x, 0, camZ);
  scene.add(cam);
  addColliderCircle(x, camZ, 0.35);
  // printer + display table with Exa photo holders
  const tbl = new THREE.Group();
  tbl.add(box(2.2, 0.76, 0.8, M.white, 0, 0.38, 0));
  tbl.add(box(0.45, 0.25, 0.4, M.darkMetal, -0.75, 0.88, 0));
  tbl.position.set(x + 4.6, 0, camZ - 1.2);
  tbl.rotation.y = -0.5;
  scene.add(tbl);
  addColliderC(x + 4.6, camZ - 1.2, 2.0, 1.3);
  const sampleTex = canvasTexture(280, 200, G.samplePhoto);
  outdoorRefs.printTex = sampleTex;
  const photoMat = new THREE.MeshStandardMaterial({ map: sampleTex, emissive: 0xffffff, emissiveMap: sampleTex, emissiveIntensity: 0.25 });
  outdoorRefs.photoMat = photoMat;
  for (let i = 0; i < 3; i++) {
    const ph = photoHolder(photoMat, 1.2);
    ph.position.set(-0.2 + i * 0.45, 0.76, 0);
    tbl.add(ph);
  }
  // a bigger hero holder so the shape reads from a distance
  const hero = photoHolder(photoMat, 3.2);
  hero.position.set(x + 4.6, 0.5, camZ + 0.9);
  hero.rotation.y = -0.2;
  scene.add(hero);
  scene.add(box(1.2, 0.5, 0.5, M.white, x + 4.6, 0.25, camZ + 0.9));
  addColliderC(x + 4.6, camZ + 0.9, 1.2, 0.5);
  // photographer
  person(x - 0.9, camZ + 0.6, PI - 0.4, { shirt: COLORS.blue, shirtLogo: true, badge: false });
  const fill = new THREE.PointLight(0xfff2e0, 14, 10, 1.5);
  fill.position.set(x, 2.6, camZ - 1.5);
  scene.add(fill);
  addInteractable({ id: 'photo', pos: v3(x + 0.3, 1, camZ - 1.0), radius: 3.9, label: 'Take a goat photo (prints in an Exa holder)', action: act('photo') });
  addSpot('Goat photo booth', x + 2.2, camZ + 1.9, 0.22, 'After party');
}

// ---------------------------------------------------------------- String lights, tables, DJ, sculpture
function buildPartyDecor() {
  // String light poles
  const poleXs = [8, 20, 32, 44, 56, 66];
  const zA = -19.6;
  const zB = -42.6;
  const poleH = 5.6;
  for (const x of poleXs) for (const z of [zA, zB]) {
    const p = cyl(0.06, 0.08, poleH, M.darkMetal, 8);
    p.position.set(x, poleH / 2, z);
    scene.add(p);
    if (z === zA) addColliderCircle(x, z, 0.15);
  }
  const bulbMat = duskColor(new THREE.MeshBasicMaterial({ color: new THREE.Color(7.0, 4.2, 1.8) }), 0.45);
  const bulbGeo = new THREE.SphereGeometry(0.06, 8, 6);
  const wireMat = new THREE.LineBasicMaterial({ color: 0x222222 });
  const strand = (a, b, sag = 1.2) => {
    const pts = [];
    const n = Math.ceil(a.distanceTo(b) / 0.9);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const p = a.clone().lerp(b, t);
      p.y -= Math.sin(t * PI) * sag;
      pts.push(p);
      if (i > 0 && i < n) addInstance('bulb', bulbGeo, bulbMat, p.clone().setY(p.y - 0.08));
    }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat));
  };
  for (let i = 0; i < poleXs.length; i++) {
    const x = poleXs[i];
    strand(v3(x, poleH, zA), v3(x, poleH, zB), 1.6);
    if (i < poleXs.length - 1) {
      strand(v3(x, poleH, zA), v3(poleXs[i + 1], poleH, zB), 1.8);
      strand(v3(x, poleH, zB), v3(poleXs[i + 1], poleH, zA), 1.8);
      strand(v3(x, poleH, zA), v3(poleXs[i + 1], poleH, zA), 0.6);
    }
  }
  // building-mounted strands into the bar canopy
  for (const x of [10, 36]) strand(v3(x, 6.4, B.zN - 0.4), v3(x, poleH, zA), 0.6);

  // warm pools under the string lights, dusk only
  for (const [x, z] of [[13, -29], [27, -27], [39, -25]]) {
    const l = duskLight(new THREE.PointLight(0xffb878, 46, 24, 1.5));
    l.position.set(x, 4.2, z);
    scene.add(l);
  }

  // Bistro tables with candles + people
  const candleMat = duskEmissive(new THREE.MeshStandardMaterial({ color: 0xffd28a, emissive: 0xffa040 }), 1.2, 5);
  candleMat.userData.noCast = true;
  const tables = [[14, -24], [18.5, -27.5], [27, -24.5], [30.5, -29.5], [38.5, -27], [15, -33.5], [24.5, -32]];
  tables.forEach(([x, z], i) => {
    roundTable(x, z, { r: 0.45, h: 1.05, top: i % 2 ? M.white : M.blue });
    const c = cyl(0.04, 0.04, 0.1, candleMat, 8);
    c.position.set(x, 1.12, z);
    scene.add(c);
    if (i % 2 === 0) cluster(x, z, 3, 0.85, { drinks: true });
    else {
      stool(x + 0.6, z);
      stool(x - 0.6, z);
    }
  });
  cluster(35.5, -20.5, 2, 0.6, { drinks: true });
  cluster(9, -23, 3, 0.8, { drinks: true });

  // DJ booth
  const dj = new THREE.Group();
  dj.add(box(2.4, 1.0, 0.9, M.black, 0, 0.5, 0));
  const front = textPlane(2.4, 0.95, G.djFront, { pxPerM: 300, emissive: 0.6 });
  front.position.set(0, 0.5, 0.46);
  dj.add(front);
  for (const dx of [-0.6, 0.6]) {
    const deckp = cyl(0.2, 0.2, 0.04, M.darkMetal, 20);
    deckp.position.set(dx, 1.03, 0);
    dj.add(deckp);
  }
  for (const dx of [-1.8, 1.8]) {
    const sp = box(0.6, 1.0, 0.5, M.black, dx, 1.5, 0);
    const cone = new THREE.Mesh(new THREE.CircleGeometry(0.2, 18), M.darkMetal);
    cone.position.set(dx, 1.4, 0.26);
    const stand = cyl(0.03, 0.03, 1.0, M.darkMetal, 6);
    stand.position.set(dx, 0.5, 0);
    dj.add(sp, cone, stand);
  }
  dj.position.set(9, 0, -35);
  dj.rotation.y = PI / 3;
  scene.add(dj);
  addColliderC(9, -35, 3, 2);
  const djP = person(8.6, -35.7, PI / 3, { shirt: 0x111111, gesture: true, badge: false, noCollide: true, animate: true });
  onUpdate((dt, t) => (djP.position.y = Math.abs(Math.sin(t * 4.2)) * 0.05));
  // dance floor glow
  const df = new THREE.Mesh(new THREE.CircleGeometry(4, 40), new THREE.MeshStandardMaterial({ color: 0x2141ea, emissive: 0x2141ea, emissiveIntensity: 0.35, transparent: true, opacity: 0.55 }));
  df.rotation.x = -PI / 2;
  df.position.set(13.5, 0.03, -31.5);
  scene.add(df);
  onUpdate((dt, t) => (df.material.emissiveIntensity = 0.25 + 0.2 * Math.abs(Math.sin(t * 2.1))));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * PI * 2;
    const p = person(13.5 + Math.cos(a) * 2.2, -31.5 + Math.sin(a) * 2.2, a + PI, { holdDrink: i % 2 ? 'blue' : null, animate: true });
    const ph = Math.random() * 6;
    onUpdate((dt, t) => (p.position.y = Math.abs(Math.sin(t * 4.2 + ph)) * 0.08));
  }

  // Glowing Exa sculpture by the water
  const plinth = box(2.6, 0.6, 1.2, M.blue, 24, 0.3, -41.6);
  scene.add(plinth);
  const sculpt = logoMesh(3.2, 0.35, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xdfe6ff, emissiveIntensity: 1.6 }));
  sculpt.position.set(24, 0.6 + 1.6, -41.6);
  scene.add(sculpt);
  addColliderC(24, -41.6, 2.6, 1.2);

  // Bean bags lounge
  const bagGeo = new THREE.SphereGeometry(0.5, 16, 10);
  [[2, -22, M.blue], [3.3, -21.4, M.white], [1.2, -23.5, M.white], [3.6, -23.6, M.blue]].forEach(([x, z, m]) => {
    const b = new THREE.Mesh(bagGeo, m);
    b.scale.set(1, 0.6, 1);
    b.position.set(x, 0.28, z);
    scene.add(b, blobShadow(1.2).translateX(x).translateZ(z));
    addColliderCircle(x, z, 0.45);
  });
  plant(16, -14.2, { tall: true });
  plant(29, -14.2, { tall: true });
  plant(62, -14.2, { tall: true });

  addSpot('Bay Terrace (party overview)', 30, -21, -PI * 0.3, 'After party');
}
