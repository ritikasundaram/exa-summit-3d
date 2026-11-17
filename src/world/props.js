import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { M, box, rbox, cyl, blobShadow } from './mat.js';
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
// Real leaf blades instead of blobs: each plant is one merged geometry of curved,
// pointed leaves, so a whole plant batches into the shared leaf materials.
function leafBlade(len, wid, droop) {
  const g = new THREE.PlaneGeometry(wid, len, 2, 4);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = p.getY(i) / len + 0.5; // 0 at the stem, 1 at the tip
    const taper = Math.sin(Math.PI * Math.min(1, t * 0.92 + 0.08)) ** 0.7;
    const x = p.getX(i) * taper;
    p.setXYZ(i, x, t * len, droop * t * t * len - Math.abs(x) * 0.35);
  }
  g.computeVertexNormals();
  return g;
}
function foliage(count, { len = 0.34, wid = 0.16, spread = 0.3, y0 = 0.5, y1 = 1.0, droop = 0.45, up = 0.9 }) {
  const parts = [];
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const m = new THREE.Matrix4();
  for (let i = 0; i < count; i++) {
    const s = 0.7 + Math.random() * 0.6;
    const g = leafBlade(len * s, wid * s, droop * (0.6 + Math.random() * 0.8));
    const a = Math.random() * Math.PI * 2;
    const tilt = up * (0.25 + Math.random() * 0.75);
    e.set(tilt, a, 0, 'YXZ');
    q.setFromEuler(e);
    const rr = spread * Math.sqrt(Math.random()) * 0.6;
    m.compose(new THREE.Vector3(Math.sin(a) * rr, y0 + Math.random() * (y1 - y0), Math.cos(a) * rr), q, new THREE.Vector3(1, 1, 1));
    g.applyMatrix4(m);
    parts.push(g.toNonIndexed());
  }
  return mergeGeometries(parts);
}
export function plant(x, z, { size = 1, collide = true, tall = false } = {}) {
  const g = new THREE.Group();
  const potMat = Math.random() < 0.45 ? M.terracotta : M.pot;
  const pot = cyl(0.27 * size, 0.2 * size, 0.5 * size, potMat, 20);
  pot.position.y = 0.25 * size;
  const soil = cyl(0.25 * size, 0.25 * size, 0.02, M.woodDark, 20);
  soil.position.y = 0.49 * size;
  g.add(pot, soil, blobShadow(1.1 * size));
  if (tall) {
    // fiddle-leaf style indoor tree: slim trunk, two leafy crowns
    const trunk = cyl(0.022 * size, 0.034 * size, 1.5 * size, M.woodDark, 6);
    trunk.position.y = 1.2 * size;
    trunk.rotation.z = 0.04;
    g.add(trunk);
    const a = new THREE.Mesh(foliage(34, { len: 0.42 * size, wid: 0.24 * size, spread: 0.55 * size, y0: 1.35 * size, y1: 2.25 * size, droop: 0.5, up: 1.25 }), M.leaf);
    const b = new THREE.Mesh(foliage(22, { len: 0.38 * size, wid: 0.22 * size, spread: 0.45 * size, y0: 1.2 * size, y1: 2.1 * size, droop: 0.6, up: 1.35 }), M.leafDark);
    g.add(a, b);
  } else {
    const a = new THREE.Mesh(foliage(26, { len: 0.52 * size, wid: 0.15 * size, spread: 0.22 * size, y0: 0.48 * size, y1: 0.62 * size, droop: 0.75, up: 0.95 }), M.leaf);
    const b = new THREE.Mesh(foliage(16, { len: 0.44 * size, wid: 0.13 * size, spread: 0.2 * size, y0: 0.48 * size, y1: 0.6 * size, droop: 0.9, up: 1.2 }), M.leafDark);
    g.add(a, b);
  }
  g.position.set(x, 0, z);
  g.rotation.y = Math.random() * Math.PI * 2;
  scene.add(g);
  if (collide) addColliderCircle(x, z, 0.3 * size);
  return g;
}

// ---------------- Couch ----------------
// Scandinavian sofa: soft-edged cushions on a slim oak frame with tapered legs.
export function couch(x, z, rotY = 0, { w = 2.2, mat = M.fabricCream } = {}) {
  const g = new THREE.Group();
  g.add(box(w - 0.04, 0.05, 0.84, M.wood, 0, 0.2, 0));
  const seats = w > 1.4 ? 2 : 1;
  const sw = (w - 0.36) / seats;
  for (let i = 0; i < seats; i++) {
    const cx = -((seats - 1) * sw) / 2 + i * sw;
    g.add(rbox(sw - 0.02, 0.22, 0.7, mat, cx, 0.34, 0.05, 0.07));
    const back = rbox(sw - 0.02, 0.46, 0.2, mat, cx, 0.66, -0.3, 0.08);
    back.rotation.x = -0.12;
    g.add(back);
  }
  for (const sx of [-1, 1]) g.add(rbox(0.18, 0.4, 0.86, mat, sx * (w / 2 - 0.09), 0.44, 0, 0.07));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = cyl(0.022, 0.014, 0.2, M.woodDark, 8);
    leg.position.set(sx * (w / 2 - 0.12), 0.1, sz * 0.34);
    g.add(leg);
  }
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
  const t = cyl(r, r, 0.035, M.wood, 32);
  t.position.y = 0.4;
  g.add(t);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = cyl(0.016, 0.012, 0.4, M.black, 8);
    leg.position.set(Math.cos(a) * r * 0.62, 0.2, Math.sin(a) * r * 0.62);
    leg.rotation.set(Math.sin(a) * 0.14, 0, -Math.cos(a) * 0.14);
    g.add(leg);
  }
  // a couple of books and a ceramic cup so the table reads as lived-in
  g.add(box(0.2, 0.025, 0.27, M.blue, -r * 0.25, 0.43, r * 0.1));
  g.add(box(0.18, 0.02, 0.25, M.white, -r * 0.24, 0.452, r * 0.11));
  const cup = cyl(0.04, 0.032, 0.07, M.white, 12);
  cup.position.set(r * 0.3, 0.452, -r * 0.2);
  g.add(cup, blobShadow(r * 2.4));
  g.position.set(x, 0, z);
  scene.add(g);
  addColliderCircle(x, z, r);
  return g;
}

/** Flat woven rug with a darker border. */
export function rug(x, z, w, d, color = 0xd9d2c4, border = 0x8f8676) {
  const g = new THREE.Group();
  const outer = new THREE.Mesh(new THREE.PlaneGeometry(w, d), cmCloth(border));
  outer.rotation.x = -Math.PI / 2;
  outer.position.y = 0.018;
  const inner = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.3, d - 0.3), cmCloth(color));
  inner.rotation.x = -Math.PI / 2;
  inner.position.y = 0.022;
  g.add(outer, inner);
  g.position.set(x, 0, z);
  scene.add(g);
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
  neck: new THREE.CylinderGeometry(0.048, 0.055, 0.1, 10),
  hand: new THREE.SphereGeometry(0.048, 10, 8).scale(0.85, 1.15, 0.6).translate(0, -0.58, 0),
  shoe: new THREE.BoxGeometry(0.1, 0.07, 0.25).translate(0, -0.83, 0.05),
  shoeSeated: new THREE.BoxGeometry(0.1, 0.07, 0.25).translate(0, -0.5, 0.05),
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
const clothCache = new Map();
function cmCloth(hex) {
  if (!clothCache.has(hex)) {
    const m = M.fabricCream.clone();
    m.color.set(hex);
    clothCache.set(hex, m);
  }
  return clothCache.get(hex);
}

export const people = [];
export function person(x, z, rotY = 0, o = {}) {
  const skin = cm(o.skin ?? pick(skinTones), 0.6);
  const shirt = cmCloth(o.shirt ?? pick(shirtColors));
  const pants = cmCloth(o.pants ?? pick(pantColors));
  const shoeMat = cm(pick([0x1b1b1d, 0xf2f0ea, 0x3a2a20]), 0.55);
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
      const shoe = new THREE.Mesh(P.shoeSeated, shoeMat);
      shoe.position.set(sx, 0.5, 0.42);
      legs.push(th, sh, shoe);
    }
  } else {
    for (const sx of [-0.1, 0.1]) {
      const l = new THREE.Mesh(P.leg, pants);
      l.position.set(sx, 0.86, 0);
      const shoe = new THREE.Mesh(P.shoe, shoeMat);
      shoe.position.set(sx, 0.86, 0);
      legs.push(l, shoe);
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
  armL.add(new THREE.Mesh(P.hand, skin));
  armR.add(new THREE.Mesh(P.hand, skin));
  const neck = new THREE.Mesh(P.neck, skin);
  neck.position.y = 1.53;
  upper.add(neck);
  const head = new THREE.Mesh(P.head, skin);
  head.scale.set(0.94, 1.08, 1);
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
    const lg = logoMesh(0.13, 0.01, shirt === cmCloth(0xffffff) ? M.blue : M.white);
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
    bakePerson(g, body, armR, !!o.gesture);
  }
  if (!o.noCollide) addColliderCircle(x, z, 0.3);
  return g;
}

// Animated people cannot join the static batch, so collapse each one into a single
// vertex-coloured mesh (plus the gesturing arm): ~17 draw calls become 2.
const personMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82 });
function bakeMeshes(root, meshes) {
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const m4 = new THREE.Matrix4();
  const geos = [];
  for (const m of meshes) {
    const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    g.applyMatrix4(m4.multiplyMatrices(inv, m.matrixWorld));
    const c = m.material.color;
    const col = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < col.length; i += 3) {
      col[i] = c.r;
      col[i + 1] = c.g;
      col[i + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geos.push(g);
  }
  return mergeGeometries(geos, false);
}
function bakePerson(g, body, armR, gesture) {
  g.updateMatrixWorld(true);
  const plain = (m) => m.isMesh && !Array.isArray(m.material) && !m.material.transparent && !(m.material.emissiveIntensity > 0 && m.material.emissive?.getHex() > 0) && m.material !== M.blob;
  const under = (m, root) => {
    for (let p = m; p; p = p.parent) if (p === root) return true;
    return false;
  };
  const armParts = [];
  const bodyParts = [];
  body.traverse((m) => {
    if (!plain(m)) return;
    if (gesture && under(m, armR)) armParts.push(m);
    else bodyParts.push(m);
  });
  const bodyGeo = bakeMeshes(body, bodyParts);
  const armGeo = gesture ? bakeMeshes(armR, armParts) : null;
  for (const m of [...bodyParts, ...armParts]) if (!(gesture && m === armR)) m.parent.remove(m);
  body.add(new THREE.Mesh(bodyGeo, personMat));
  if (gesture) {
    armR.geometry = armGeo;
    armR.material = personMat;
  }
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

/** Opal-glass globe pendant on a cord, hung from yTop and dropping `drop` metres. */
const globeGeo = new THREE.SphereGeometry(0.2, 24, 16);
export function pendantLight(x, yTop, z, drop = 2.2) {
  const g = new THREE.Group();
  const cord = cyl(0.006, 0.006, drop, M.black, 5);
  cord.position.y = -drop / 2;
  const cap = cyl(0.035, 0.06, 0.09, M.gold, 14);
  cap.position.y = -drop + 0.03;
  const globe = new THREE.Mesh(globeGeo, M.globe);
  globe.position.y = -drop - 0.17;
  g.add(cord, cap, globe);
  g.position.set(x, yTop, z);
  scene.add(g);
  return g;
}
