import * as THREE from 'three';
import { scene, onUpdate } from '../core.js';
import { M, blobShadow } from './mat.js';
import { logoMesh } from './logo.js';
import { COLORS } from '../config.js';

const COATS = [
  { body: 0xf4efe6, head: 0xf4efe6 },
  { body: 0x8a5a3a, head: 0xf4efe6 },
  { body: 0x2a2624, head: 0x2a2624 },
  { body: 0xd9b48a, head: 0xd9b48a },
  { body: 0xf4efe6, head: 0x6b4630 },
  { body: 0x5a4a40, head: 0xf4efe6 },
];
const mats = new Map();
const mat = (c) => {
  if (!mats.has(c)) mats.set(c, new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 }));
  return mats.get(c);
};

const geo = {
  body: new THREE.CapsuleGeometry(0.19, 0.42, 4, 12).rotateX(Math.PI / 2),
  leg: new THREE.CylinderGeometry(0.035, 0.03, 0.42, 6).translate(0, -0.21, 0),
  hoof: new THREE.CylinderGeometry(0.035, 0.04, 0.05, 6),
  neck: new THREE.CylinderGeometry(0.075, 0.1, 0.22, 8),
  head: new THREE.CapsuleGeometry(0.075, 0.16, 3, 10).rotateX(Math.PI / 2 - 0.5),
  ear: new THREE.BoxGeometry(0.14, 0.025, 0.06),
  horn: new THREE.ConeGeometry(0.022, 0.15, 6),
  beard: new THREE.ConeGeometry(0.025, 0.09, 6),
  tail: new THREE.ConeGeometry(0.03, 0.12, 6),
  eye: new THREE.SphereGeometry(0.014, 6, 6),
  bandana: new THREE.TorusGeometry(0.085, 0.025, 6, 14),
};

export function makeGoat({ coat = COATS[0], bandana = false, scale = 1 } = {}) {
  const g = new THREE.Group();
  const bm = mat(coat.body);
  const hm = mat(coat.head);
  const body = new THREE.Mesh(geo.body, bm);
  body.position.y = 0.56;
  g.add(body);
  const legs = [];
  for (const [x, z] of [[-0.11, 0.2], [0.11, 0.2], [-0.11, -0.2], [0.11, -0.2]]) {
    const l = new THREE.Mesh(geo.leg, bm);
    l.position.set(x, 0.47, z);
    const hoof = new THREE.Mesh(geo.hoof, M.black);
    hoof.position.y = -0.42;
    l.add(hoof);
    g.add(l);
    legs.push(l);
  }
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.66, 0.28);
  g.add(headPivot);
  const neck = new THREE.Mesh(geo.neck, bm);
  neck.position.set(0, 0.06, 0.06);
  neck.rotation.x = 0.8;
  headPivot.add(neck);
  const head = new THREE.Group();
  head.position.set(0, 0.17, 0.17);
  headPivot.add(head);
  const skull = new THREE.Mesh(geo.head, hm);
  skull.position.set(0, -0.02, 0.06);
  head.add(skull);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(geo.ear, hm);
    ear.position.set(s * 0.1, 0.02, -0.02);
    ear.rotation.z = s * -0.4;
    head.add(ear);
    const horn = new THREE.Mesh(geo.horn, mat(0xcfc3a8));
    horn.position.set(s * 0.04, 0.1, -0.04);
    horn.rotation.x = -1.05;
    head.add(horn);
    const eye = new THREE.Mesh(geo.eye, M.black);
    eye.position.set(s * 0.06, 0.03, 0.06);
    head.add(eye);
  }
  const beard = new THREE.Mesh(geo.beard, hm);
  beard.position.set(0, -0.12, 0.12);
  beard.rotation.x = Math.PI;
  head.add(beard);
  const tail = new THREE.Mesh(geo.tail, bm);
  tail.position.set(0, 0.7, -0.38);
  tail.rotation.x = -0.6;
  g.add(tail);
  if (bandana) {
    const b = new THREE.Mesh(geo.bandana, M.blue);
    b.position.set(0, 0.05, 0.05);
    b.rotation.x = Math.PI / 2 + 0.8;
    headPivot.add(b);
    const lg = logoMesh(0.06, 0.01, M.white);
    lg.position.set(0, 0.0, 0.13);
    lg.rotation.x = 0.8;
    headPivot.add(lg);
  }
  g.add(blobShadow(0.8, 1.1));
  g.scale.setScalar(scale);
  g.userData = { legs, headPivot, tail, phase: Math.random() * 10, dynamic: true };
  return g;
}

// ---------- Hearts (petting FX) ----------
const heartTex = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  x.fillStyle = '#2141EA';
  x.beginPath();
  x.moveTo(32, 56);
  x.bezierCurveTo(4, 36, 4, 10, 20, 10);
  x.bezierCurveTo(28, 10, 32, 18, 32, 20);
  x.bezierCurveTo(32, 18, 36, 10, 44, 10);
  x.bezierCurveTo(60, 10, 60, 36, 32, 56);
  x.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();
const hearts = [];
export function burstHearts(pos, n = 6) {
  for (let i = 0; i < n; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: heartTex, transparent: true, depthWrite: false }));
    s.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.5, Math.random() * 0.3, (Math.random() - 0.5) * 0.5));
    s.scale.setScalar(0.18 + Math.random() * 0.1);
    s.userData = { life: 0, vy: 0.6 + Math.random() * 0.5, vx: (Math.random() - 0.5) * 0.3 };
    scene.add(s);
    hearts.push(s);
  }
}

// ---------- Pen herd ----------
export const herd = [];
let player = null;
export function setGoatPlayer(p) {
  player = p;
}

export function spawnHerd(bounds, n = 7) {
  for (let i = 0; i < n; i++) {
    const g = makeGoat({ coat: COATS[0], bandana: true, scale: 0.85 + Math.random() * 0.3 });
    g.position.set(
      bounds.minX + 1 + Math.random() * (bounds.maxX - bounds.minX - 2),
      0,
      bounds.minZ + 1 + Math.random() * (bounds.maxZ - bounds.minZ - 2),
    );
    g.rotation.y = Math.random() * Math.PI * 2;
    Object.assign(g.userData, {
      bounds,
      target: null,
      wait: Math.random() * 3,
      hop: 0,
      graze: 0,
      speed: 0.5 + Math.random() * 0.3,
    });
    scene.add(g);
    herd.push(g);
  }
}

function pickTarget(g) {
  const b = g.userData.bounds;
  g.userData.target = new THREE.Vector3(b.minX + 0.8 + Math.random() * (b.maxX - b.minX - 1.6), 0, b.minZ + 0.8 + Math.random() * (b.maxZ - b.minZ - 1.6));
}

/** Pet the nearest goat to `pos`; returns the goat or null. */
export function petNearest(pos, maxD = 2.6) {
  let best = null;
  let bd = maxD;
  for (const g of herd) {
    const d = Math.hypot(g.position.x - pos.x, g.position.z - pos.z);
    if (d < bd) {
      bd = d;
      best = g;
    }
  }
  if (best) {
    best.userData.hop = 1;
    best.userData.target = null;
    best.userData.wait = 2.5;
    best.rotation.y = Math.atan2(pos.x - best.position.x, pos.z - best.position.z);
    burstHearts(best.position.clone().add(new THREE.Vector3(0, 1.1, 0)));
  }
  return best;
}

export function nearestGoatDist(pos) {
  let bd = Infinity;
  for (const g of herd) bd = Math.min(bd, Math.hypot(g.position.x - pos.x, g.position.z - pos.z));
  return bd;
}

const tmp = new THREE.Vector3();
onUpdate((dt, t) => {
  for (const g of herd) {
    const u = g.userData;
    let moving = false;
    const pd = player ? Math.hypot(player.x - g.position.x, player.z - g.position.z) : 99;
    // curious: look at / drift toward a nearby player
    if (player && pd < 3.2 && pd > 1.3 && u.hop <= 0 && Math.random() < 0.004) {
      u.target = new THREE.Vector3(player.x, 0, player.z).lerp(g.position, 0.5);
    }
    if (u.wait > 0) {
      u.wait -= dt;
      u.graze = Math.min(1, u.graze + dt * 1.5);
      if (player && pd < 2.5) {
        const want = Math.atan2(player.x - g.position.x, player.z - g.position.z);
        g.rotation.y += angleDiff(want, g.rotation.y) * Math.min(1, dt * 3);
        u.graze = Math.max(0, u.graze - dt * 4);
      }
    } else {
      if (!u.target) pickTarget(g);
      tmp.copy(u.target).sub(g.position);
      tmp.y = 0;
      const d = tmp.length();
      if (d < 0.3) {
        u.target = null;
        u.wait = 1.5 + Math.random() * 5;
      } else {
        const want = Math.atan2(tmp.x, tmp.z);
        g.rotation.y += angleDiff(want, g.rotation.y) * Math.min(1, dt * 4);
        const step = Math.min(d, u.speed * dt);
        g.position.x += Math.sin(g.rotation.y) * step;
        g.position.z += Math.cos(g.rotation.y) * step;
        moving = true;
        u.graze = Math.max(0, u.graze - dt * 3);
      }
    }
    // keep away from player and inside pen
    if (player && pd < 0.8) {
      const k = (0.8 - pd) / Math.max(pd, 0.01);
      g.position.x -= (player.x - g.position.x) * k * 0.5;
      g.position.z -= (player.z - g.position.z) * k * 0.5;
    }
    const b = u.bounds;
    g.position.x = THREE.MathUtils.clamp(g.position.x, b.minX + 0.5, b.maxX - 0.5);
    g.position.z = THREE.MathUtils.clamp(g.position.z, b.minZ + 0.5, b.maxZ - 0.5);
    // separation
    for (const o of herd) {
      if (o === g) continue;
      const dx = g.position.x - o.position.x;
      const dz = g.position.z - o.position.z;
      const dd = Math.hypot(dx, dz);
      if (dd < 0.7 && dd > 0.001) {
        g.position.x += (dx / dd) * (0.7 - dd) * 0.5;
        g.position.z += (dz / dd) * (0.7 - dd) * 0.5;
      }
    }
    animateGoat(g, t, dt, moving);
  }
  for (let i = hearts.length - 1; i >= 0; i--) {
    const s = hearts[i];
    s.userData.life += dt;
    s.position.y += s.userData.vy * dt;
    s.position.x += s.userData.vx * dt;
    s.material.opacity = 1 - s.userData.life / 1.6;
    if (s.userData.life > 1.6) {
      scene.remove(s);
      s.material.dispose();
      hearts.splice(i, 1);
    }
  }
});

export function animateGoat(g, t, dt, moving) {
  const u = g.userData;
  const ph = t * 9 + u.phase;
  u.legs.forEach((l, i) => {
    l.rotation.x = moving ? Math.sin(ph + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.45 : l.rotation.x * 0.85;
  });
  u.tail.rotation.z = Math.sin(t * 12 + u.phase) * 0.4;
  const grazeTilt = (u.graze || 0) * 1.0;
  u.headPivot.rotation.x = grazeTilt + Math.sin(t * 1.3 + u.phase) * 0.05;
  if (u.hop > 0) {
    u.hop -= dt * 1.6;
    g.position.y = Math.max(0, Math.sin((1 - u.hop) * Math.PI * 2) * 0.25);
  } else g.position.y = 0;
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export { COATS };
