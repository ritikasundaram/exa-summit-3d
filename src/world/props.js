import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { M, box, cyl, blobShadow } from './mat.js';
import { logoGeometry, logoMesh } from './logo.js';
import { scene, addColliderC, addColliderCircle } from '../core.js';
import { COLORS } from '../config.js';

// ---------------- Instancing ----------------
const batches = new Map();
export function addInstance(key, geo, mat, position, rotY = 0, scale = 1) {
  if (!batches.has(key)) batches.set(key, { geo, mat, mats: [] });
  const m = new THREE.Matrix4().compose(
    position.clone(),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotY, 0)),
    new THREE.Vector3(scale, scale, scale),
  );
  batches.get(key).mats.push(m);
}
export function flushInstances() {
  for (const { geo, mat, mats } of batches.values()) {
    const im = new THREE.InstancedMesh(geo, mat, mats.length);
    mats.forEach((m, i) => im.setMatrixAt(i, m));
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
    scene.add(im);
  }
  batches.clear();
}

const xf = (g, x, y, z, rx = 0, ry = 0, rz = 0) => {
  g.rotateX(rx).rotateY(ry).rotateZ(rz);
  g.translate(x, y, z);
  return g;
};

// ---------------- Chairs ----------------
const chairGeo = (() => {
  const parts = [
    xf(new THREE.BoxGeometry(0.46, 0.04, 0.44), 0, 0.46, 0),
    xf(new THREE.BoxGeometry(0.46, 0.32, 0.03), 0, 0.72, -0.22, -0.12),
  ];
  for (const [x, z] of [[-0.2, -0.19], [0.2, -0.19], [-0.2, 0.19], [0.2, 0.19]]) {
    parts.push(xf(new THREE.CylinderGeometry(0.014, 0.014, 0.46, 6), x, 0.23, z));
  }
  parts.push(xf(new THREE.CylinderGeometry(0.014, 0.014, 0.45, 6), -0.2, 0.68, -0.21, -0.12));
  parts.push(xf(new THREE.CylinderGeometry(0.014, 0.014, 0.45, 6), 0.2, 0.68, -0.21, -0.12));
  return mergeGeometries(parts.map((p) => p.toNonIndexed()));
})();

/** Black stacking chair facing +z by default (rotY rotates). */
export function chair(x, z, rotY = 0) {
  addInstance('chair', chairGeo, M.black, new THREE.Vector3(x, 0, z), rotY);
}

const stoolGeo = (() => {
  const parts = [xf(new THREE.CylinderGeometry(0.18, 0.18, 0.05, 16), 0, 0.75, 0)];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    parts.push(xf(new THREE.CylinderGeometry(0.012, 0.012, 0.78, 6), Math.cos(a) * 0.14, 0.38, Math.sin(a) * 0.14, Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12));
  }
  return mergeGeometries(parts.map((p) => p.toNonIndexed()));
})();
export function stool(x, z) {
  addInstance('stool', stoolGeo, M.darkMetal, new THREE.Vector3(x, 0, z));
}

// ---------------- Tables ----------------
export function roundTable(x, z, { r = 0.45, h = 0.74, top = M.white, collide = true } = {}) {
  const g = new THREE.Group();
  const t = cyl(r, r, 0.03, top, 28);
  t.position.y = h;
  const s = cyl(0.03, 0.03, h, M.darkMetal, 8);
  s.position.y = h / 2;
  const b = cyl(0.24, 0.26, 0.03, M.darkMetal, 20);
  b.position.y = 0.02;
  g.add(t, s, b, blobShadow(r * 2.4));
  g.position.set(x, 0, z);
  scene.add(g);
  if (collide) addColliderCircle(x, z, r * 0.8);
  return g;
}

export function longTable(x, z, w, d, { h = 0.76, top = M.white, cloth = null, rotY = 0 } = {}) {
  const g = new THREE.Group();
  if (cloth) {
    g.add(box(w, h, d, cloth, 0, h / 2, 0));
  } else {
    g.add(box(w, 0.04, d, top, 0, h, 0));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(0.04, h, 0.04, M.darkMetal, sx * (w / 2 - 0.06), h / 2, sz * (d / 2 - 0.06)));
  }
  g.add(blobShadow(w * 1.15, d * 1.6));
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  scene.add(g);
  const rw = Math.abs(Math.cos(rotY)) > 0.5 ? w : d;
  const rd = Math.abs(Math.cos(rotY)) > 0.5 ? d : w;
  addColliderC(x, z, rw, rd);
  return g;
}

// ---------------- Plants ----------------
const leafGeo = new THREE.IcosahedronGeometry(1, 1);
export function plant(x, z, { size = 1, collide = true, tall = false } = {}) {
  const g = new THREE.Group();
  const pot = cyl(0.26 * size, 0.2 * size, 0.5 * size, M.pot, 16);
  pot.position.y = 0.25 * size;
  g.add(pot, blobShadow(0.9 * size));
  if (tall) {
    const trunk = cyl(0.025 * size, 0.035 * size, 1.4 * size, M.woodDark, 6);
    trunk.position.y = 1.1 * size;
    g.add(trunk);
  }
  const n = tall ? 7 : 5;
  for (let i = 0; i < n; i++) {
    const l = new THREE.Mesh(leafGeo, i % 2 ? M.leaf : M.leafDark);
    const a = Math.random() * Math.PI * 2;
    const rr = (tall ? 0.35 : 0.22) * size * Math.random();
    const y = tall ? (1.3 + Math.random() * 0.9) * size : (0.65 + Math.random() * 0.45) * size;
    l.position.set(Math.cos(a) * rr, y, Math.sin(a) * rr);
    l.scale.setScalar((tall ? 0.32 : 0.24) * size * (0.7 + Math.random() * 0.5));
    l.rotation.set(Math.random(), Math.random(), Math.random());
    g.add(l);
  }
  g.position.set(x, 0, z);
  scene.add(g);
  if (collide) addColliderCircle(x, z, 0.3 * size);
  return g;
}

// ---------------- Couch ----------------
export function couch(x, z, rotY = 0, { w = 2.2, mat = M.fabricCream } = {}) {
  const g = new THREE.Group();
  g.add(box(w, 0.4, 0.9, mat, 0, 0.22, 0));
  g.add(box(w, 0.5, 0.22, mat, 0, 0.62, -0.36));
  g.add(box(0.2, 0.32, 0.9, mat, -w / 2 + 0.1, 0.55, 0));
  g.add(box(0.2, 0.32, 0.9, mat, w / 2 - 0.1, 0.55, 0));
  g.add(blobShadow(w * 1.2, 1.4));
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  scene.add(g);
  const horiz = Math.abs(Math.cos(rotY)) > 0.5;
  addColliderC(x, z, horiz ? w : 0.9, horiz ? 0.9 : w);
  return g;
}

export function coffeeTable(x, z, r = 0.45) {
  const g = new THREE.Group();
  const t = cyl(r, r, 0.06, M.wood, 24);
  t.position.y = 0.38;
  const s = cyl(r * 0.6, r * 0.6, 0.35, M.wood, 20);
  s.position.y = 0.18;
  g.add(t, s, blobShadow(r * 2.4));
  g.position.set(x, 0, z);
  scene.add(g);
  addColliderCircle(x, z, r);
  return g;
}

// ---------------- Podium with Exa mark ----------------
export function podium(x, z, rotY = 0, y0 = 0) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 1.1, 4, 1), M.blue);
  body.rotation.y = Math.PI / 4;
  body.scale.set(1.15, 1, 0.75);
  body.position.y = 0.55;
  const top = box(0.82, 0.05, 0.62, M.white, 0, 1.13, -0.02);
  top.rotation.x = -0.18;
  const logo = logoMesh(0.48, 0.03, M.white);
  logo.position.set(0, 0.6, 0.29);
  logo.rotation.x = -0.035;
  const mic = cyl(0.006, 0.006, 0.35, M.darkMetal, 6);
  mic.position.set(0.12, 1.3, 0.05);
  mic.rotation.x = 0.5;
  const micHead = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), M.darkMetal);
  micHead.position.set(0.12, 1.45, 0.14);
  g.add(body, top, logo, mic, micHead, blobShadow(1.1, 0.9));
  g.position.set(x, y0, z);
  g.rotation.y = rotY;
  scene.add(g);
  addColliderC(x, z, 0.9, 0.9);
  return g;
}

// ---------------- People ----------------
const P = {
  leg: new THREE.CylinderGeometry(0.07, 0.06, 0.86, 8).translate(0, -0.43, 0),
  torso: new THREE.CapsuleGeometry(0.19, 0.42, 4, 12),
  arm: new THREE.CapsuleGeometry(0.055, 0.5, 3, 8).translate(0, -0.28, 0),
  head: new THREE.SphereGeometry(0.115, 16, 12),
  hair: new THREE.SphereGeometry(0.122, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
  bun: new THREE.SphereGeometry(0.07, 10, 8),
  badge: new THREE.PlaneGeometry(0.08, 0.11),
  thigh: new THREE.CylinderGeometry(0.075, 0.07, 0.46, 8).rotateX(Math.PI / 2).translate(0, 0, 0.21),
  shin: new THREE.CylinderGeometry(0.065, 0.055, 0.5, 8).translate(0, -0.25, 0),
};
const skinTones = [0xf1c9a5, 0xe0ac83, 0xc68d62, 0x8d5a3b, 0x5e3a24, 0xf6d7bf];
const hairColors = [0x1c1410, 0x3b2a1e, 0x6b4a2e, 0xa77b48, 0x2a2a2a, 0xd8c08a];
const shirtColors = [COLORS.blue, 0xffffff, 0x1c1f2a, 0x8ea0ff, 0xdedede, 0x2a3f8f, 0x4a4f5c, 0xffffff, COLORS.blue];
const pantColors = [0x1f2433, 0x2b2b2b, 0x3d4a66, 0x6b6156, 0x111111];
const matCache = new Map();
const cm = (hex, r = 0.8) => {
  const k = hex + ':' + r;
  if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial({ color: hex, roughness: r }));
  return matCache.get(k);
};
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export const people = [];
export function person(x, z, rotY = 0, o = {}) {
  const skin = cm(o.skin ?? pick(skinTones));
  const shirt = cm(o.shirt ?? pick(shirtColors));
  const pants = cm(o.pants ?? pick(pantColors));
  const hair = cm(o.hair ?? pick(hairColors), 0.9);
  const s = o.scale ?? 0.92 + Math.random() * 0.14;
  const g = new THREE.Group();
  const body = new THREE.Group();
  const upper = new THREE.Group();
  const legs = [];
  if (o.seated) {
    upper.position.y = -0.36;
    for (const sx of [-0.1, 0.1]) {
      const th = new THREE.Mesh(P.thigh, pants);
      th.position.set(sx, 0.5, 0);
      const sh = new THREE.Mesh(P.shin, pants);
      sh.position.set(sx, 0.5, 0.42);
      legs.push(th, sh);
    }
  } else {
    for (const sx of [-0.1, 0.1]) {
      const l = new THREE.Mesh(P.leg, pants);
      l.position.set(sx, 0.86, 0);
      legs.push(l);
    }
  }
  const torso = new THREE.Mesh(P.torso, shirt);
  torso.position.y = 1.18;
  torso.scale.z = 0.72;
  const armL = new THREE.Mesh(P.arm, shirt);
  armL.position.set(-0.25, 1.43, 0);
  armL.rotation.z = 0.12;
  const armR = new THREE.Mesh(P.arm, shirt);
  armR.position.set(0.25, 1.43, 0);
  armR.rotation.z = -0.12;
  if (o.gesture) {
    armR.rotation.x = -1.1;
  }
  if (o.holdDrink) {
    armL.rotation.x = -1.2;
    const cup = cyl(0.035, 0.03, 0.12, o.holdDrink === 'blue' ? M.blueGlow : M.clearGlass, 10);
    cup.position.set(0, -0.55, 0.02);
    armL.add(cup);
  }
  const head = new THREE.Mesh(P.head, skin);
  head.position.y = 1.66;
  const hairM = new THREE.Mesh(P.hair, hair);
  hairM.position.y = 1.675;
  hairM.rotation.x = -0.25;
  upper.add(torso, armL, armR, head, hairM);
  body.add(...legs, upper);
  if (o.bun ?? Math.random() < 0.3) {
    const b = new THREE.Mesh(P.bun, hair);
    b.position.set(0, 1.74, -0.1);
    upper.add(b);
  }
  if (o.badge !== false) {
    const badge = new THREE.Mesh(P.badge, M.white);
    badge.position.set(0, 1.18, 0.15);
    upper.add(badge);
  }
  if (o.shirtLogo) {
    const lg = logoMesh(0.13, 0.01, shirt === cm(0xffffff) ? M.blue : M.white);
    lg.position.set(0.07, 1.3, 0.145);
    upper.add(lg);
  }
  g.add(body);
  if (!o.seated) g.add(blobShadow(0.7));
  g.scale.setScalar(s);
  g.position.set(x, o.y ?? 0, z);
  g.rotation.y = rotY;
  g.userData = { body, phase: Math.random() * 10, armR, gesture: !!o.gesture };
  scene.add(g);
  if (o.animate ?? !!o.gesture) {
    people.push(g);
    g.userData.dynamic = true;
  }
  if (!o.noCollide) addColliderCircle(x, z, 0.3);
  return g;
}

export function updatePeople(t) {
  for (const p of people) {
    const u = p.userData;
    u.body.rotation.z = Math.sin(t * 0.8 + u.phase) * 0.02;
    u.body.position.y = Math.sin(t * 1.6 + u.phase) * 0.006;
    if (u.gesture) u.armR.rotation.x = -1.1 + Math.sin(t * 2 + u.phase) * 0.25;
  }
}

/** A loose conversation cluster facing its center. */
export function cluster(cx, cz, n = 3, r = 0.8, o = {}) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
    const x = cx + Math.cos(a) * r;
    const z = cz + Math.sin(a) * r;
    const rot = Math.atan2(cx - x, cz - z);
    person(x, z, rot, { gesture: i === 0 && Math.random() < 0.7, holdDrink: o.drinks ? (Math.random() < 0.5 ? 'blue' : 'clear') : null, shirtLogo: Math.random() < 0.3, ...o });
  }
}

// ---------------- Swag objects ----------------

/** The Exa hourglass: logo-shaped white frame holding a glass timer with blue sand. */
export function hourglass(scale = 1) {
  const g = new THREE.Group();
  const frame = logoMesh(1, 0.22, M.white);
  frame.material = new THREE.MeshStandardMaterial({ color: 0xf5f5f2, roughness: 0.45 });
  frame.position.y = 0.5;
  g.add(frame);
  // glass bulb (lathe)
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const y = 0.07 + t * 0.86;
    const k = Math.abs(t - 0.5) * 2; // 0 at neck
    const r = 0.012 + 0.16 * Math.pow(k, 1.6);
    pts.push(new THREE.Vector2(r, y));
  }
  const bulb = new THREE.Mesh(new THREE.LatheGeometry(pts, 28), M.clearGlass);
  bulb.position.x = 0.06;
  g.add(bulb);
  const sandMat = new THREE.MeshStandardMaterial({ color: COLORS.blue, roughness: 0.9 });
  const top = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.2, 24), sandMat);
  top.rotation.x = Math.PI;
  top.position.set(0.06, 0.62, 0);
  const bot = new THREE.Mesh(new THREE.ConeGeometry(0.135, 0.12, 24), sandMat);
  bot.position.set(0.06, 0.16, 0);
  const stream = cyl(0.003, 0.003, 0.36, sandMat, 4);
  stream.position.set(0.06, 0.34, 0);
  g.add(top, bot, stream);
  g.scale.setScalar(scale);
  return g;
}

/** Goat-shaped pen holder: a seated low-poly goat with a pen cup in its back. */
export function goatPenHolder(scale = 1, mat = null) {
  const m = mat || new THREE.MeshStandardMaterial({ color: COLORS.blue, roughness: 0.4 });
  const g = new THREE.Group();
  const body = box(0.5, 0.26, 0.24, m, 0, 0.2, 0);
  const cup = cyl(0.09, 0.09, 0.22, m, 18);
  cup.position.set(-0.05, 0.4, 0);
  const cupHole = cyl(0.075, 0.075, 0.01, M.black, 18);
  cupHole.position.set(-0.05, 0.512, 0);
  const neck = box(0.1, 0.2, 0.14, m, 0.22, 0.4, 0);
  neck.rotation.z = -0.4;
  const head = box(0.2, 0.12, 0.12, m, 0.31, 0.52, 0);
  head.rotation.z = -0.25;
  const hornGeo = new THREE.ConeGeometry(0.02, 0.14, 8);
  const h1 = new THREE.Mesh(hornGeo, M.white);
  h1.position.set(0.27, 0.63, 0.04);
  h1.rotation.z = 0.7;
  const h2 = h1.clone();
  h2.position.z = -0.04;
  const ear = box(0.08, 0.02, 0.05, m, 0.28, 0.56, 0.09);
  ear.rotation.x = 0.6;
  const ear2 = ear.clone();
  ear2.position.z = -0.09;
  ear2.rotation.x = -0.6;
  const beard = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.08, 6), M.white);
  beard.position.set(0.39, 0.43, 0);
  beard.rotation.z = Math.PI;
  const legs = [];
  for (const [lx, lz] of [[-0.18, 0.08], [-0.18, -0.08], [0.18, 0.08], [0.18, -0.08]]) {
    const l = box(0.05, 0.1, 0.05, m, lx, 0.05, lz);
    legs.push(l);
  }
  // pens
  const penCols = [0xffffff, 0x0d1330, COLORS.blue];
  for (let i = 0; i < 3; i++) {
    const pen = cyl(0.01, 0.01, 0.3, new THREE.MeshStandardMaterial({ color: penCols[i], roughness: 0.4 }), 6);
    pen.position.set(-0.05 + (i - 1) * 0.03, 0.55, (i - 1) * 0.025);
    pen.rotation.z = (i - 1) * 0.15;
    g.add(pen);
  }
  g.add(body, cup, cupHole, neck, head, h1, h2, ear, ear2, beard, ...legs);
  g.scale.setScalar(scale);
  return g;
}

// Knit + rib textures for the hoodie (tinted by material color)
function fabricTex(rib) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#fff';
  x.fillRect(0, 0, 128, 128);
  if (rib) {
    for (let i = 0; i < 128; i += 8) {
      x.fillStyle = 'rgba(0,0,0,0.22)';
      x.fillRect(i, 0, 3, 128);
    }
  } else {
    for (let y = 0; y < 128; y += 4) for (let i = 0; i < 128; i += 4) {
      x.fillStyle = `rgba(0,0,0,${0.04 + Math.random() * 0.06})`;
      x.fillRect(i + ((y / 4) % 2) * 2, y, 2, 3);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
const KNIT = fabricTex(false);
KNIT.repeat.set(16, 16);
const RIB = fabricTex(true);
RIB.repeat.set(36, 1);

/**
 * Exa hoodie on a dress-form stand. Origin is the hem; `stand` is the pole length below it.
 * Front silhouette with a soft bevel, raglan sleeves with bunching and ribbed cuffs,
 * a hood draped behind the neck, drawstrings with aglets, kangaroo pocket and chest mark.
 */
export function hoodie(scale = 1, color = COLORS.blue, { stand = 0.3 } = {}) {
  const g = new THREE.Group();
  const base = new THREE.Color(color);
  const fabric = new THREE.MeshStandardMaterial({ color: base, roughness: 0.97, map: KNIT });
  const rib = new THREE.MeshStandardMaterial({ color: base.clone().multiplyScalar(0.85), roughness: 1, map: RIB });
  const inner = new THREE.MeshStandardMaterial({ color: base.clone().multiplyScalar(0.45), roughness: 1, side: THREE.BackSide });
  const cord = new THREE.MeshStandardMaterial({ color: 0xf4f4f4, roughness: 0.8 });

  // body
  const s = new THREE.Shape();
  s.moveTo(-0.205, 0.05);
  s.lineTo(0.205, 0.05);
  s.quadraticCurveTo(0.228, 0.3, 0.216, 0.5);
  s.quadraticCurveTo(0.214, 0.56, 0.198, 0.59);
  s.quadraticCurveTo(0.14, 0.636, 0.075, 0.65);
  s.quadraticCurveTo(0, 0.622, -0.075, 0.65);
  s.quadraticCurveTo(-0.14, 0.636, -0.198, 0.59);
  s.quadraticCurveTo(-0.214, 0.56, -0.216, 0.5);
  s.quadraticCurveTo(-0.228, 0.3, -0.205, 0.05);
  const bodyGeo = new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.045, bevelSegments: 6, curveSegments: 18 });
  bodyGeo.translate(0, 0, -0.05);
  bodyGeo.computeVertexNormals();
  g.add(new THREE.Mesh(bodyGeo, fabric));

  // ribbed waistband
  const wb = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.075, 40), rib);
  wb.scale.set(0.252, 1, 0.112);
  wb.position.y = 0.036;
  g.add(wb);

  // sleeves
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.2, 0.585, 0);
    arm.rotation.z = side * 0.17;
    arm.rotation.x = 0.06;
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.075, 18, 12), fabric);
    cap.scale.set(1, 0.9, 1.05);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.057, 0.5, 20).translate(0, -0.25, 0), fabric);
    arm.add(cap, sleeve);
    for (const [y, r] of [[-0.31, 0.062], [-0.39, 0.06], [-0.45, 0.058]]) {
      const fold = new THREE.Mesh(new THREE.TorusGeometry(r, 0.0045, 6, 24), fabric);
      fold.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.25;
      fold.position.y = y;
      arm.add(fold);
    }
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.053, 0.051, 0.075, 20), rib);
    cuff.position.y = -0.535;
    arm.add(cuff);
    g.add(arm);
  }

  // hood draped behind the neck, with darker lining and a ribbed opening
  const hood = new THREE.Group();
  hood.position.set(0, 0.665, -0.07);
  hood.scale.set(1.05, 1, 0.85);
  const hoodGeo = new THREE.SphereGeometry(0.15, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.55);
  const hoodOut = new THREE.Mesh(hoodGeo, fabric.clone());
  hoodOut.material.side = THREE.FrontSide;
  const hoodIn = new THREE.Mesh(hoodGeo, inner);
  for (const m of [hoodOut, hoodIn]) m.rotation.x = -2.0;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.147, 0.02, 10, 40), rib);
  rim.rotation.x = -0.43;
  rim.position.set(0, -0.005, 0.02);
  hood.add(hoodOut, hoodIn, rim);
  g.add(hood);
  const neckHole = new THREE.Mesh(new THREE.CircleGeometry(0.07, 24), new THREE.MeshStandardMaterial({ color: base.clone().multiplyScalar(0.3), roughness: 1 }));
  neckHole.rotation.x = -Math.PI / 2;
  neckHole.scale.set(1.15, 0.8, 1);
  neckHole.position.set(0, 0.672, 0.0);
  g.add(neckHole);

  // drawstrings
  for (const side of [-1, 1]) {
    const grommet = new THREE.Mesh(new THREE.TorusGeometry(0.009, 0.003, 6, 14), M.metal);
    grommet.position.set(side * 0.045, 0.628, 0.112);
    const str = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.2, 6).translate(0, -0.1, 0), cord);
    str.position.set(side * 0.045, 0.628, 0.115);
    str.rotation.set(-0.08, 0, side * 0.07);
    const aglet = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.026, 8), M.metal);
    aglet.position.y = -0.21;
    str.add(aglet);
    g.add(grommet, str);
  }

  // kangaroo pocket
  const ps = new THREE.Shape();
  ps.moveTo(-0.17, 0.1);
  ps.lineTo(0.17, 0.1);
  ps.quadraticCurveTo(0.15, 0.2, 0.12, 0.27);
  ps.lineTo(-0.12, 0.27);
  ps.quadraticCurveTo(-0.15, 0.2, -0.17, 0.1);
  const pocket = new THREE.Mesh(new THREE.ExtrudeGeometry(ps, { depth: 0.004, bevelEnabled: true, bevelThickness: 0.005, bevelSize: 0.006, bevelSegments: 2 }), fabric);
  pocket.position.z = 0.108;
  g.add(pocket);
  // pocket seam shadows
  for (const side of [-1, 1]) {
    const seam = box(0.006, 0.18, 0.004, inner.clone(), side * 0.148, 0.185, 0.121);
    seam.material.side = THREE.FrontSide;
    seam.rotation.z = side * -0.32;
    g.add(seam);
  }

  // chest mark
  const lg = logoMesh(0.09, 0.004, M.white);
  lg.position.set(0, 0.47, 0.112);
  g.add(lg);

  // dress-form neck + stand
  const form = new THREE.MeshStandardMaterial({ color: 0x3a3d44, roughness: 0.6 });
  const neck = cyl(0.05, 0.058, 0.13, form, 18);
  neck.position.y = 0.72;
  const neckCap = cyl(0.03, 0.05, 0.03, form, 18);
  neckCap.position.y = 0.8;
  g.add(neck, neckCap);
  if (stand > 0) {
    const pole = cyl(0.012, 0.012, stand, M.darkMetal, 8);
    pole.position.y = -stand / 2;
    const foot = cyl(0.13, 0.15, 0.025, M.darkMetal, 24);
    foot.position.y = -stand + 0.012;
    g.add(pole, foot);
  }
  g.scale.setScalar(scale);
  return g;
}

/** Exa logo sugar cookie: extruded mark with blue icing on top. Returns geometry pair for instancing. */
export const cookieGeos = (() => {
  const base = logoGeometry(0.2).clone();
  const icing = logoGeometry(0.05).clone();
  icing.translate(0, 0, 0.115);
  // shrink icing slightly toward center
  icing.scale(0.93, 0.93, 1);
  // lay flat: rotate so face points up
  base.rotateX(-Math.PI / 2);
  icing.rotateX(-Math.PI / 2);
  return { base, icing };
})();

export function cookie(x, y, z, rotY, size = 0.09, white = false) {
  size *= 1.2;
  const p = new THREE.Vector3(x, y, z);
  addInstance('cookie', cookieGeos.base, M.cookie, p, rotY, size);
  addInstance(white ? 'icingW' : 'icing', cookieGeos.icing, white ? M.icingWhite : M.icing, p, rotY, size);
}

/** Photo holder shaped like the Exa mark (rotated so the open side faces up), holding a print. */
export function photoHolder(photoMat, scale = 1) {
  const g = new THREE.Group();
  const holder = logoMesh(0.3, 0.06, M.blueGloss);
  holder.rotation.z = Math.PI / 2; // open side up
  holder.position.y = 0.12;
  g.add(holder);
  const photo = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.2), photoMat);
  photo.position.set(0, 0.25, 0);
  photo.rotation.x = -0.12;
  g.add(photo);
  g.scale.setScalar(scale);
  return g;
}

// ---------------- Misc ----------------
export function stanchion(x, z) {
  const g = new THREE.Group();
  const p = cyl(0.03, 0.03, 0.95, M.gold, 8);
  p.position.y = 0.48;
  const b = cyl(0.15, 0.15, 0.03, M.gold, 16);
  g.add(p, b);
  g.position.set(x, 0, z);
  scene.add(g);
}

export function pendantLight(x, y, z, glowMat) {
  const g = new THREE.Group();
  const cord = cyl(0.006, 0.006, 1.2, M.black, 4);
  cord.position.y = 0.6;
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.25, 20, 1, true), M.black);
  shade.material.side = THREE.DoubleSide;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), glowMat);
  bulb.position.y = -0.1;
  g.add(cord, shade, bulb);
  g.position.set(x, y, z);
  scene.add(g);
}
