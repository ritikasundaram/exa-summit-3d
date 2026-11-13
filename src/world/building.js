import * as THREE from 'three';
import { scene, addCollider, addZone } from '../core.js';
import { M, box, cyl } from './mat.js';
import { logoMesh } from './logo.js';
import { woodFloorTexture, carpetTexture, canvasTexture, textPlane, FONT } from './tex.js';
import { pendantLight } from './props.js';

// Building footprint (meters). North (−z) faces the bay, south (+z) the Embarcadero.
export const B = { x0: -42, x1: 44, zN: -12, zS: 12, h: 7, t: 0.4 };
// 13 brandable arches (per the Vivas/Shack15 deck), plus the terrace door.
export const ARCH_X = [-38, -32, -26, -20, -14, -8, -2, 4, 10, 16, 22, 28, 34];
export const DOOR_X = 40;
const ARCH = { w: 4, sill: 0.5, spring: 3.4 }; // rect to 3.4m then semicircle r=2 → top 5.4m
export const PARTITIONS = [-23, -11, 7, 13, 31];

function archPath(path, cx, { w, sill, spring }, reverse = false) {
  const r = w / 2;
  if (!reverse) {
    path.moveTo(cx - r, sill);
    path.lineTo(cx + r, sill);
    path.lineTo(cx + r, spring);
    path.absarc(cx, spring, r, 0, Math.PI, false);
    path.lineTo(cx - r, sill);
  } else {
    path.moveTo(cx - r, sill);
    path.lineTo(cx - r, spring);
    path.absarc(cx, spring, r, Math.PI, 0, true);
    path.lineTo(cx + r, sill);
    path.lineTo(cx - r, sill);
  }
}

function archShape(cx, a = ARCH) {
  const s = new THREE.Shape();
  archPath(s, cx, a);
  return s;
}

export function buildBuilding() {
  const { x0, x1, zN, zS, h, t } = B;
  const W = x1 - x0;
  const D = zS - zN;

  // ---------- Floors ----------
  const wood = woodFloorTexture([W / 6, D / 6]);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: wood, roughness: 0.45 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set((x0 + x1) / 2, 0, (zN + zS) / 2);
  scene.add(floor);
  // carpet in the Salon & Library like the deck photos
  for (const [a, b] of [[-23, -11], [31, 44]]) {
    const cd = 3 - zN; // carpet only inside the room, not the corridor
    const c = new THREE.Mesh(new THREE.PlaneGeometry(b - a, cd), new THREE.MeshStandardMaterial({ map: carpetTexture([(b - a) / 3, cd / 3]), roughness: 1 }));
    c.rotation.x = -Math.PI / 2;
    c.position.set((a + b) / 2, 0.01, zN + cd / 2);
    scene.add(c);
  }

  // ---------- Ceiling + trusses ----------
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), M.ceiling);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set((x0 + x1) / 2, h, 0);
  scene.add(ceil);
  const trussMat = new THREE.MeshStandardMaterial({ color: 0x2b2f38, roughness: 0.55, metalness: 0.3 });
  for (let x = x0 + 3; x < x1; x += 6) {
    const g = new THREE.Group();
    g.add(box(0.18, 0.18, D, trussMat, 0, h - 1.2, 0)); // bottom chord
    for (let z = zN; z < zS; z += 2) {
      const d = box(0.07, 1.4, 0.07, trussMat, 0, h - 0.6, z + 1);
      d.rotation.x = ((z / 2) % 2 ? 1 : -1) * 0.95;
      g.add(d);
    }
    g.position.x = x;
    scene.add(g);
  }
  // Lengthwise ducts
  for (const z of [-6, 6]) {
    const duct = cyl(0.28, 0.28, W, new THREE.MeshStandardMaterial({ color: 0x8b919c, roughness: 0.4, metalness: 0.5 }), 14);
    duct.rotation.z = Math.PI / 2;
    duct.position.set((x0 + x1) / 2, h - 0.5, z);
    scene.add(duct);
  }

  // ---------- North wall (bay side) with 13 arched windows + terrace door ----------
  const nShape = new THREE.Shape();
  nShape.moveTo(x0, 0);
  nShape.lineTo(x1, 0);
  nShape.lineTo(x1, h);
  nShape.lineTo(x0, h);
  nShape.lineTo(x0, 0);
  for (const ax of ARCH_X) {
    const hole = new THREE.Path();
    archPath(hole, ax, ARCH, true);
    nShape.holes.push(hole);
  }
  // door: arched opening down to floor
  const doorA = { w: 3.2, sill: 0, spring: 3.4 };
  const dh = new THREE.Path();
  archPath(dh, DOOR_X, doorA, true);
  nShape.holes.push(dh);

  const nGeo = new THREE.ExtrudeGeometry(nShape, { depth: t, bevelEnabled: false, curveSegments: 24 });
  const nWall = new THREE.Mesh(nGeo, [M.wall, M.wall]);
  nWall.position.z = zN - t / 2;
  scene.add(nWall);
  const outer = new THREE.Mesh(new THREE.ShapeGeometry(nShape, 24), M.sandstone);
  outer.position.z = zN - t / 2 - 0.01;
  outer.material = M.sandstone.clone();
  outer.material.side = THREE.BackSide;
  scene.add(outer);

  // window glass + black mullions
  const mull = M.black;
  for (const ax of ARCH_X) {
    const glass = new THREE.Mesh(new THREE.ShapeGeometry(archShape(ax), 24), M.glass);
    glass.position.z = zN;
    scene.add(glass);
    const g = new THREE.Group();
    const r = ARCH.w / 2;
    for (const dx of [-r + 0.04, -r / 3, r / 3, r - 0.04]) g.add(box(0.07, ARCH.spring - ARCH.sill + (Math.abs(dx) < 1 ? Math.sqrt(r * r - dx * dx) : 0), 0.08, mull, ax + dx, (ARCH.sill + ARCH.spring + (Math.abs(dx) < 1 ? Math.sqrt(r * r - dx * dx) : 0)) / 2, zN));
    g.add(box(ARCH.w, 0.07, 0.08, mull, ax, ARCH.spring, zN));
    g.add(box(ARCH.w, 0.07, 0.08, mull, ax, 1.6, zN));
    g.add(box(ARCH.w, 0.08, 0.12, mull, ax, ARCH.sill, zN));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r - 0.03, 0.045, 6, 40, Math.PI), mull);
    ring.position.set(ax, ARCH.spring, zN);
    g.add(ring);
    scene.add(g);
  }
  // door frame + open glass doors
  const df = new THREE.Group();
  const dr = doorA.w / 2;
  df.add(box(0.1, doorA.spring, 0.12, mull, DOOR_X - dr, doorA.spring / 2, zN));
  df.add(box(0.1, doorA.spring, 0.12, mull, DOOR_X + dr, doorA.spring / 2, zN));
  const dring = new THREE.Mesh(new THREE.TorusGeometry(dr - 0.03, 0.05, 6, 40, Math.PI), mull);
  dring.position.set(DOOR_X, doorA.spring, zN);
  df.add(dring);
  for (const s of [-1, 1]) {
    const leaf = new THREE.Group();
    const pane = box(dr - 0.05, doorA.spring - 0.1, 0.03, M.glass, (s * (dr - 0.05)) / 2, doorA.spring / 2, 0);
    const fr = box(0.06, doorA.spring - 0.1, 0.05, mull, s * (dr - 0.08), doorA.spring / 2, 0);
    leaf.add(pane, fr);
    leaf.position.set(DOOR_X - s * dr, 0, zN);
    leaf.rotation.y = s * 1.3;
    df.add(leaf);
  }
  scene.add(df);

  // north wall colliders (leave door gap)
  addCollider(x0, zN - t, DOOR_X - doorA.w / 2 + 0.1, zN + 0.15);
  addCollider(DOOR_X + doorA.w / 2 - 0.1, zN - t, x1, zN + 0.15);

  // ---------- Brand arches (blue panel with arched cut-out on the inside face) ----------
  ARCH_X.forEach((ax, i) => {
    const pw = ARCH.w + 1.3;
    const ph = ARCH.spring + ARCH.w / 2 + 0.5;
    const s = new THREE.Shape();
    s.moveTo(ax - pw / 2, ARCH.sill - 0.1);
    s.lineTo(ax + pw / 2, ARCH.sill - 0.1);
    s.lineTo(ax + pw / 2, ph);
    s.lineTo(ax - pw / 2, ph);
    s.lineTo(ax - pw / 2, ARCH.sill - 0.1);
    const hole = new THREE.Path();
    archPath(hole, ax, { w: ARCH.w + 0.15, sill: ARCH.sill - 0.1, spring: ARCH.spring }, true);
    s.holes.push(hole);
    const panel = new THREE.Mesh(new THREE.ShapeGeometry(s, 24), M.blue);
    panel.position.z = zN + t / 2 + 0.02;
    scene.add(panel);
    // small white mark in the spandrel
    const lg = logoMesh(0.42, 0.03, M.white);
    lg.position.set(ax + (i % 2 ? 1 : -1) * (pw / 2 - 0.45), ph - 0.42, zN + t / 2 + 0.05);
    scene.add(lg);
  });

  // ---------- South wall: clerestory windows + entrance ----------
  const sShape = new THREE.Shape();
  sShape.moveTo(x0, 0);
  sShape.lineTo(x1, 0);
  sShape.lineTo(x1, h);
  sShape.lineTo(x0, h);
  sShape.lineTo(x0, 0);
  for (let x = x0 + 5; x < x1 - 3; x += 6) {
    const hole = new THREE.Path();
    hole.moveTo(x - 1.2, 4.2);
    hole.lineTo(x - 1.2, 6.2);
    hole.lineTo(x + 1.2, 6.2);
    hole.lineTo(x + 1.2, 4.2);
    hole.lineTo(x - 1.2, 4.2);
    sShape.holes.push(hole);
    const gl = box(2.4, 2, 0.02, M.glass, x, 5.2, zS);
    scene.add(gl);
  }
  const sWall = new THREE.Mesh(new THREE.ExtrudeGeometry(sShape, { depth: t, bevelEnabled: false }), M.wall);
  sWall.position.z = zS - t / 2;
  scene.add(sWall);
  addCollider(x0, zS - 0.15, x1, zS + t);
  // Main entrance doors (closed, decorative)
  const ent = new THREE.Group();
  ent.add(box(3.4, 3.2, 0.1, M.black, 0, 1.6, 0));
  ent.add(box(1.5, 2.9, 0.12, M.glass, -0.8, 1.5, 0));
  ent.add(box(1.5, 2.9, 0.12, M.glass, 0.8, 1.5, 0));
  ent.position.set(-34, 0, zS - 0.25);
  scene.add(ent);

  // ---------- End walls ----------
  for (const x of [x0, x1]) {
    const w = box(t, h, D, M.wall, x + (x === x0 ? -t / 2 : t / 2), h / 2, 0);
    scene.add(w);
  }
  addCollider(x0 - t, zN, x0 + 0.15, zS);
  addCollider(x1 - 0.15, zN, x1 + t, zS);

  // ---------- Interior partitions (rooms per the Shack15 floor map) ----------
  const ph = 4.4;
  for (const px of PARTITIONS) {
    const zEnd = 3;
    const len = zEnd - zN;
    scene.add(box(0.25, ph, len, M.partition, px, ph / 2, zN + len / 2));
    scene.add(box(0.3, 0.06, len, M.wood, px, ph, zN + len / 2));
    addCollider(px - 0.18, zN, px + 0.18, zEnd);
  }

  // Room signage on partitions (corridor end), Shack15 room names
  const rooms = [
    ['The Lounge', -32.5, -42, -23],
    ['The Library', -17, -23, -11],
    ['Kilden · Finstua', -2, -11, 7],
    ['The Sanctuary', 10, 7, 13],
    ['The Gallery', 22, 13, 31],
    ['The Salon', 37.5, 31, 44],
  ];
  for (const [name, cx, a, b] of rooms) addZone(name, a, zN, b, zS);
  for (const px of PARTITIONS) {
    const left = rooms.find((r) => r[3] === px);
    const right = rooms.find((r) => r[2] === px);
    for (const [r, s] of [[left, -1], [right, 1]]) {
      const sign = textPlane(1.3, 0.3, (ctx, w, hh) => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, hh);
        ctx.fillStyle = '#2141EA';
        ctx.fillRect(0, 0, 10, hh);
        ctx.fillStyle = '#0D1330';
        ctx.font = `600 ${hh * 0.42}px ${FONT}`;
        ctx.textBaseline = 'middle';
        ctx.fillText(r[0], 28, hh / 2);
      });
      sign.position.set(px + s * 0.14, 2.3, 2.3);
      if (r[0] === 'The Gallery') sign.position.z = 2.45;
      sign.rotation.y = (s * Math.PI) / 2;
      scene.add(sign);
    }
  }

  // ---------- Pendant lights ----------
  const glow = new THREE.MeshStandardMaterial({ color: 0xfff1d6, emissive: 0xffe2b0, emissiveIntensity: 2 });
  for (let x = x0 + 4; x < x1; x += 7) pendantLight(x, 4.6, 7.5, glow);

  // ---------- Exterior: roof, cornice, facade trim ----------
  const roof = box(W + 1.2, 0.55, D + 1.2, M.sandstoneDark, (x0 + x1) / 2, h + 0.35, 0); // starts 5cm above the ceiling plane
  scene.add(roof);
  const cornice = box(W + 1.6, 0.35, 0.5, M.sandstone, (x0 + x1) / 2, h + 0.1, zN - 0.6);
  scene.add(cornice);
  // pilasters between arches on the outside
  for (let i = 0; i < ARCH_X.length; i++) {
    const px = ARCH_X[i] + 3;
    if (Math.abs(px - DOOR_X) < 2.2) continue;
    scene.add(box(0.6, h, 0.25, M.sandstoneDark, px, h / 2, zN - t / 2 - 0.13));
  }
  // continuous facade to the east/west beyond Shack15 (the rest of the Ferry Building)
  for (const [a, b] of [[-90, x0 - t - 0.02], [x1 + t + 0.02, 70]]) {
    const ext = box(b - a, h + 0.64, D, M.sandstone, (a + b) / 2, (h + 0.64) / 2, 0);
    scene.add(ext);
    addCollider(a, zN, b, zS);
    // arched window rhythm painted on
    for (let x = a + 3; x < b - 2; x += 6) {
      const win = new THREE.Mesh(new THREE.ShapeGeometry(archShape(0, { w: 3, sill: 0.8, spring: 3.4 }), 16), new THREE.MeshStandardMaterial({ color: 0x2c3448, emissive: 0xffc98a, emissiveIntensity: 0.35, roughness: 0.3 }));
      win.position.set(x, 0, zN - 0.01);
      win.rotation.y = Math.PI;
      scene.add(win);
    }
  }

  buildClockTower();
}

// ---------- Ferry Building clock tower (live clock faces) ----------
function buildClockTower() {
  const g = new THREE.Group();
  const s = M.sandstone;
  const sd = M.sandstoneDark;
  g.add(box(11, 8, 11, s, 0, 4, 0));
  g.add(box(9, 14, 9, s, 0, 15, 0));
  g.add(box(9.8, 0.6, 9.8, sd, 0, 8.2, 0));
  g.add(box(9.6, 0.5, 9.6, sd, 0, 22.2, 0));
  g.add(box(8, 6, 8, s, 0, 25.4, 0));
  g.add(box(8.6, 0.5, 8.6, sd, 0, 28.6, 0));
  g.add(box(6, 4, 6, s, 0, 31, 0));
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 3.8, 6, 4), sd);
  cap.rotation.y = Math.PI / 4;
  cap.position.y = 36;
  g.add(cap);
  const pole = cyl(0.08, 0.08, 4, M.darkMetal, 6);
  pole.position.y = 40.5;
  g.add(pole);
  const flag = box(1.6, 0.9, 0.02, M.blue, 0.8, 41.8, 0);
  g.add(flag);
  // arched openings on the tower (dark recesses)
  for (let side = 0; side < 4; side++) {
    const holder = new THREE.Group();
    for (const dx of [-2.6, 0, 2.6]) {
      const win = new THREE.Mesh(new THREE.ShapeGeometry(archShape(dx, { w: 1.6, sill: 10, spring: 13.5 }), 12), new THREE.MeshStandardMaterial({ color: 0x1f2433, emissive: 0xffb870, emissiveIntensity: 0.25 }));
      win.position.z = 4.51;
      holder.add(win);
    }
    holder.rotation.y = (side * Math.PI) / 2;
    g.add(holder);
  }
  // clock faces with live time
  const faces = [];
  const tex = canvasTexture(256, 256, () => {});
  const drawClock = () => {
    const c = tex.userData.canvas.getContext('2d');
    const n = new Date();
    c.clearRect(0, 0, 256, 256);
    c.fillStyle = '#fbf6e8';
    c.beginPath();
    c.arc(128, 128, 124, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#1d1d1d';
    c.lineWidth = 8;
    c.stroke();
    c.fillStyle = '#1d1d1d';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      c.fillRect(128 + Math.sin(a) * 100 - 4, 128 - Math.cos(a) * 100 - 4, 8, 8);
    }
    const hand = (a, len, w) => {
      c.lineWidth = w;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(128, 128);
      c.lineTo(128 + Math.sin(a) * len, 128 - Math.cos(a) * len);
      c.stroke();
    };
    const hr = (n.getHours() % 12) + n.getMinutes() / 60;
    hand((hr / 12) * Math.PI * 2, 60, 10);
    hand((n.getMinutes() / 60) * Math.PI * 2, 92, 6);
    tex.needsUpdate = true;
  };
  drawClock();
  setInterval(drawClock, 20000);
  const faceMat = new THREE.MeshStandardMaterial({ map: tex, emissive: 0xfff3d0, emissiveMap: tex, emissiveIntensity: 0.6, transparent: true });
  for (let side = 0; side < 4; side++) {
    const f = new THREE.Mesh(new THREE.CircleGeometry(2.6, 40), faceMat);
    const a = (side * Math.PI) / 2;
    f.position.set(Math.sin(a) * 4.02, 25.4, Math.cos(a) * 4.02);
    f.rotation.y = a;
    g.add(f);
    faces.push(f);
  }
  g.position.set(-2, B.h, 8);
  scene.add(g);
}
