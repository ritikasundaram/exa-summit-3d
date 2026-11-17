import * as THREE from 'three';
import { scene, addCollider, addZone, duskEmissive } from '../core.js';
import { M, box, tbox, cyl } from './mat.js';
import { logoMesh } from './logo.js';
import { plankSet, brickSet, boardSet, weaveSet, canvasTexture, textPlane, FONT } from './tex.js';
import { pendantLight } from './props.js';

// Building footprint (meters). North (−z) faces the bay, south (+z) the Embarcadero.
export const B = { x0: -42, x1: 44, zN: -12, zS: 12, h: 7, t: 0.4 };
// Shack15 sits under the Ferry Building's arched steel-and-glass roof: a shallow
// barrel vault springing from the wall tops (y = 7) to an 11 m crown.
export const VAULT = { R: 20, cy: -9, sky: 6.5 };
export const ceilY = (z) => VAULT.cy + Math.sqrt(VAULT.R * VAULT.R - z * z);
export const RIB_X = Array.from({ length: 15 }, (_, i) => -41 + i * 6);
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
  // pale Scandinavian oak, planks running the length of the hall
  const oak = plankSet({ hue: 34, sat: 30, light: 63, rough: [0.34, 0.58], seed: 7 });
  for (const t of [oak.map, oak.normalMap, oak.roughnessMap]) t.repeat.set(W / 3, D / 3);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(W, D),
    new THREE.MeshStandardMaterial({ map: oak.map, normalMap: oak.normalMap, normalScale: new THREE.Vector2(0.45, 0.45), roughnessMap: oak.roughnessMap, roughness: 1, envMapIntensity: 1.15 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set((x0 + x1) / 2, 0, (zN + zS) / 2);
  scene.add(floor);
  // wool carpet in the Salon & Library like the deck photos
  const wool = weaveSet({ seed: 31, strength: 2.6 });
  for (const [a, b] of [[-23, -11], [31, 44]]) {
    const cd = 3 - zN; // carpet only inside the room, not the corridor
    const map = wool.map.clone();
    const nrm = wool.normalMap.clone();
    for (const t of [map, nrm]) t.repeat.set((b - a) * 2.5, cd * 2.5);
    const c = new THREE.Mesh(new THREE.PlaneGeometry(b - a, cd), new THREE.MeshStandardMaterial({ color: 0xb7b0a4, map, normalMap: nrm, normalScale: new THREE.Vector2(0.8, 0.8), roughness: 1 }));
    c.rotation.x = -Math.PI / 2;
    c.position.set((a + b) / 2, 0.012, zN + cd / 2);
    scene.add(c);
  }

  buildRoof();

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

  // ---------- South wall: painted brick with a row of lunette windows ----------
  const brick = brickSet({});
  for (const t of [brick.map, brick.normalMap]) t.repeat.set(1 / 1.1, 1 / 1.05);
  const brickMat = new THREE.MeshStandardMaterial({ color: 0xf1ede4, map: brick.map, normalMap: brick.normalMap, normalScale: new THREE.Vector2(0.7, 0.7), roughness: 0.9 });
  const LUN = { r: 1.75, y: 4.15 };
  const lunette = (path, cx) => {
    path.moveTo(cx - LUN.r, LUN.y);
    path.lineTo(cx + LUN.r, LUN.y);
    path.absarc(cx, LUN.y, LUN.r, 0, Math.PI, false);
  };
  const sShape = new THREE.Shape();
  sShape.moveTo(x0, 0);
  sShape.lineTo(x1, 0);
  sShape.lineTo(x1, h);
  sShape.lineTo(x0, h);
  sShape.lineTo(x0, 0);
  for (let x = x0 + 5; x < x1 - 3; x += 6) {
    const hole = new THREE.Path();
    lunette(hole, x);
    sShape.holes.push(hole);
    const gs = new THREE.Shape();
    lunette(gs, x);
    const gl = new THREE.Mesh(new THREE.ShapeGeometry(gs, 20), M.glass);
    gl.position.z = zS;
    scene.add(gl);
    // steel frame: sill, arc and three radial bars
    scene.add(box(LUN.r * 2, 0.07, 0.1, M.black, x, LUN.y, zS));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(LUN.r - 0.03, 0.04, 6, 32, Math.PI), M.black);
    ring.position.set(x, LUN.y, zS);
    scene.add(ring);
    for (const a of [Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4]) {
      const bar = box(LUN.r, 0.05, 0.07, M.black, x + (Math.cos(a) * LUN.r) / 2, LUN.y + (Math.sin(a) * LUN.r) / 2, zS);
      bar.rotation.z = a;
      scene.add(bar);
    }
  }
  const sWall = new THREE.Mesh(new THREE.ExtrudeGeometry(sShape, { depth: t, bevelEnabled: false, curveSegments: 20 }), brickMat);
  sWall.position.z = zS - t / 2;
  scene.add(sWall);
  addCollider(x0, zS - 0.15, x1, zS + t);
  // timber skirting along both long walls
  scene.add(box(W, 0.14, 0.03, M.woodDark, (x0 + x1) / 2, 0.07, zS - t / 2 - 0.015));
  // Main entrance doors (closed, decorative)
  const ent = new THREE.Group();
  ent.add(box(3.4, 3.2, 0.1, M.black, 0, 1.6, 0));
  ent.add(box(1.5, 2.9, 0.12, M.glass, -0.8, 1.5, 0));
  ent.add(box(1.5, 2.9, 0.12, M.glass, 0.8, 1.5, 0));
  ent.position.set(-34, 0, zS - 0.25);
  scene.add(ent);

  // ---------- End walls: gables that follow the vault, each with a big fan window ----------
  const FAN = { r: 3.1, y: 7.3 };
  for (const x of [x0, x1]) {
    const gs = new THREE.Shape();
    gs.moveTo(zN - t / 2, 0);
    gs.lineTo(zS + t / 2, 0);
    gs.lineTo(zS + t / 2, h);
    const Rg = VAULT.R + 0.3;
    const aG = Math.asin((zS + t / 2) / Rg);
    for (let i = 0; i <= 40; i++) {
      const a = aG - (2 * aG * i) / 40;
      gs.lineTo(Rg * Math.sin(a), VAULT.cy + Rg * Math.cos(a));
    }
    gs.lineTo(zN - t / 2, 0);
    const fan = new THREE.Path();
    fan.moveTo(-FAN.r, FAN.y);
    fan.lineTo(FAN.r, FAN.y);
    fan.absarc(0, FAN.y, FAN.r, 0, Math.PI, false);
    gs.holes.push(fan);
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.ExtrudeGeometry(gs, { depth: t, bevelEnabled: false, curveSegments: 28 }), brickMat));
    const fs = new THREE.Shape();
    fs.moveTo(-FAN.r, FAN.y);
    fs.lineTo(FAN.r, FAN.y);
    fs.absarc(0, FAN.y, FAN.r, 0, Math.PI, false);
    const glass = new THREE.Mesh(new THREE.ShapeGeometry(fs, 28), M.glass);
    glass.position.z = t / 2;
    g.add(glass);
    g.add(box(FAN.r * 2, 0.09, 0.12, M.black, 0, FAN.y, t / 2));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(FAN.r - 0.04, 0.05, 6, 40, Math.PI), M.black);
    ring.position.set(0, FAN.y, t / 2);
    g.add(ring);
    const inner = new THREE.Mesh(new THREE.TorusGeometry(FAN.r * 0.42, 0.035, 6, 28, Math.PI), M.black);
    inner.position.set(0, FAN.y, t / 2);
    g.add(inner);
    for (let k = 1; k < 6; k++) {
      const a = (k * Math.PI) / 6;
      const bar = box(FAN.r * 0.58, 0.05, 0.08, M.black, Math.cos(a) * FAN.r * 0.71, FAN.y + Math.sin(a) * FAN.r * 0.71, t / 2);
      bar.rotation.z = a;
      g.add(bar);
    }
    // local X → world z, local Z → world −x
    g.rotation.y = -Math.PI / 2;
    g.position.x = x === x0 ? x0 : x1 + t;
    scene.add(g);
  }
  addCollider(x0 - t, zN, x0 + 0.15, zS);
  addCollider(x1 - 0.15, zN, x1 + t, zS);

  // ---------- Interior partitions (rooms per the Shack15 floor map) ----------
  const ph = 4.4;
  for (const px of PARTITIONS) {
    const zEnd = 3;
    const len = zEnd - zN;
    scene.add(tbox(0.25, ph, len, M.partition, px, ph / 2, zN + len / 2));
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

  // ---------- Pendant globes hung from the truss tie rods ----------
  for (const x of RIB_X) {
    if (x > x0 + 2 && x < x1 - 2) pendantLight(x, TIE_Y, 5.5, 2.3);
    if (!PARTITIONS.includes(x) && x > x0 + 2 && x < x1 - 2 && !(x > 14 && x < 30)) pendantLight(x, TIE_Y, -5, 2.0);
  }

  // ---------- Exterior: parapets, cornice, facade trim ----------
  for (const z of [zN - 0.25, zS + 0.25]) scene.add(tbox(W + 1.2, 1.0, 0.5, M.sandstoneDark, (x0 + x1) / 2, h + 0.5, z));
  const cornice = tbox(W + 1.6, 0.35, 0.5, M.sandstone, (x0 + x1) / 2, h + 0.1, zN - 0.6);
  scene.add(cornice);
  // pilasters between arches on the outside
  for (let i = 0; i < ARCH_X.length; i++) {
    const px = ARCH_X[i] + 3;
    if (Math.abs(px - DOOR_X) < 2.2) continue;
    scene.add(tbox(0.6, h, 0.25, M.sandstoneDark, px, h / 2, zN - t / 2 - 0.13));
  }
  // continuous facade to the east/west beyond Shack15 (the rest of the Ferry Building)
  const litWindow = duskEmissive(new THREE.MeshStandardMaterial({ color: 0x1a222e, emissive: 0xffc98a, roughness: 0.12, metalness: 0.7 }), 0.12, 1.3);
  for (const [a, b] of [[-90, x0 - t - 0.02], [x1 + t + 0.02, 70]]) {
    const ext = tbox(b - a, h + 0.64, D, M.sandstone, (a + b) / 2, (h + 0.64) / 2, 0);
    scene.add(ext);
    addCollider(a, zN, b, zS);
    // arched window rhythm
    for (let x = a + 3; x < b - 2; x += 6) {
      const win = new THREE.Mesh(new THREE.ShapeGeometry(archShape(0, { w: 3, sill: 0.8, spring: 3.4 }), 16), litWindow);
      win.position.set(x, 0, zN - 0.05);
      win.rotation.y = Math.PI;
      scene.add(win);
    }
  }

  buildClockTower();
}

// ---------- Arched steel-and-glass roof ----------
const TIE_Y = 7.3;

/** Curved strip of the vault between two arc angles (0 = crown). Faces inward. */
function vaultStrip(a0, a1, segs, xa, xb, r = VAULT.R, tile = 1.2) {
  const pos = [];
  const nor = [];
  const uv = [];
  const idx = [];
  for (let i = 0; i <= segs; i++) {
    const a = a0 + ((a1 - a0) * i) / segs;
    const z = r * Math.sin(a);
    const y = VAULT.cy + r * Math.cos(a);
    for (const x of [xa, xb]) {
      pos.push(x, y, z);
      nor.push(0, -Math.cos(a), -Math.sin(a));
      uv.push((x - xa) / tile, (r * a) / tile);
    }
  }
  for (let i = 0; i < segs; i++) {
    const k = i * 2;
    idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/** One arched lattice rib, cut like a plate truss: two chords, posts and alternating diagonals. */
function ribGeometry() {
  const Ro = VAULT.R - 0.03;
  const Ri = Ro - 0.82;
  const aM = Math.asin((B.zS - 0.12) / Ro);
  const P = (r, a) => new THREE.Vector2(r * Math.sin(a), VAULT.cy + r * Math.cos(a));
  const shape = new THREE.Shape();
  const N = 60;
  for (let i = 0; i <= N; i++) {
    const p = P(Ri, -aM + (2 * aM * i) / N);
    i ? shape.lineTo(p.x, p.y) : shape.moveTo(p.x, p.y);
  }
  for (let i = N; i >= 0; i--) {
    const p = P(Ro, -aM + (2 * aM * i) / N);
    shape.lineTo(p.x, p.y);
  }
  shape.closePath();
  const panels = 34;
  const chord = 0.1;
  const ri = Ri + chord;
  const ro = Ro - chord;
  for (let k = 0; k < panels; k++) {
    const a0 = -aM + (2 * aM * k) / panels;
    const a1 = -aM + (2 * aM * (k + 1)) / panels;
    const rising = k < panels / 2; // diagonals lean toward the crown on both halves
    const tris = rising
      ? [[P(ri, a0), P(ri, a1), P(ro, a1)], [P(ri, a0), P(ro, a1), P(ro, a0)]]
      : [[P(ri, a0), P(ri, a1), P(ro, a0)], [P(ri, a1), P(ro, a1), P(ro, a0)]];
    for (const t of tris) {
      const c = new THREE.Vector2().add(t[0]).add(t[1]).add(t[2]).multiplyScalar(1 / 3);
      const hole = new THREE.Path();
      t.forEach((v, i) => {
        const q = v.clone().sub(c).multiplyScalar(0.74).add(c);
        i ? hole.lineTo(q.x, q.y) : hole.moveTo(q.x, q.y);
      });
      hole.closePath();
      shape.holes.push(hole);
    }
  }
  const g = new THREE.ExtrudeGeometry(shape, { depth: 0.13, bevelEnabled: false, curveSegments: 4 });
  g.translate(0, 0, -0.065);
  return g;
}

function buildRoof() {
  const { x0, x1, zS } = B;
  const W = x1 - x0;
  const cx = (x0 + x1) / 2;
  const R = VAULT.R;
  const aS = Math.asin(VAULT.sky / R); // edge of the glazing
  const aM = Math.asin(zS / R); // springing line on the walls

  // solid haunches: white-painted boards
  const boards = boardSet({});
  for (const t of [boards.map, boards.normalMap]) t.repeat.set(1, 1);
  const vaultMat = new THREE.MeshStandardMaterial({ color: 0xf2efe8, map: boards.map, normalMap: boards.normalMap, normalScale: new THREE.Vector2(0.5, 0.5), roughness: 0.85, side: THREE.DoubleSide });
  scene.add(new THREE.Mesh(vaultStrip(aS, aM, 10, x0, x1), vaultMat));
  scene.add(new THREE.Mesh(vaultStrip(-aM, -aS, 10, x0, x1), vaultMat));

  // central skylight
  const skyGlass = new THREE.MeshPhysicalMaterial({ color: 0xe4eeff, roughness: 0.1, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.6 });
  skyGlass.userData.noCast = true;
  const glazing = new THREE.Mesh(vaultStrip(-aS, aS, 16, x0, x1, R + 0.02), skyGlass);
  glazing.renderOrder = 2;
  scene.add(glazing);
  // glazing bars across the skylight
  const segs = 6;
  for (let x = x0 + 1; x < x1; x += 2) {
    if (RIB_X.some((r) => Math.abs(r - x) < 0.3)) continue;
    for (let i = 0; i < segs; i++) {
      const am = -aS + ((i + 0.5) * 2 * aS) / segs;
      const len = (2 * aS * R) / segs + 0.04;
      const bar = box(0.07, 0.09, len, M.steel, x, VAULT.cy + (R - 0.04) * Math.cos(am), (R - 0.04) * Math.sin(am));
      bar.rotation.x = am;
      scene.add(bar);
    }
  }
  // purlins running the length of the hall
  for (const [a, w, hh] of [[0, 0.12, 0.16], [aS, 0.16, 0.24], [-aS, 0.16, 0.24], [0.44, 0.1, 0.16], [-0.44, 0.1, 0.16], [0.55, 0.1, 0.16], [-0.55, 0.1, 0.16]]) {
    const p = box(W, hh, w, M.steel, cx, VAULT.cy + (R - hh / 2 - 0.02) * Math.cos(a), (R - hh / 2 - 0.02) * Math.sin(a));
    p.rotation.x = a;
    scene.add(p);
  }

  // arched lattice ribs with tie rods
  const rib = ribGeometry();
  for (const x of RIB_X) {
    const m = new THREE.Mesh(rib, M.steel);
    m.rotation.y = -Math.PI / 2;
    m.position.x = x;
    scene.add(m);
    const tie = cyl(0.028, 0.028, 2 * zS - 0.5, M.steel, 8);
    tie.rotation.x = Math.PI / 2;
    tie.position.set(x, TIE_Y, 0);
    scene.add(tie);
    for (const z of [-6, 0, 6]) {
      const top = VAULT.cy + Math.sqrt((R - 0.85) * (R - 0.85) - z * z);
      const hanger = cyl(0.014, 0.014, top - TIE_Y, M.steel, 6);
      hanger.position.set(x, (top + TIE_Y) / 2, z);
      scene.add(hanger);
    }
    for (const s of [-1, 1]) scene.add(box(0.3, 0.7, 0.3, M.steel, x, 6.9, s * (zS - 0.3)));
  }
}

// ---------- Ferry Building clock tower (live clock faces) ----------
function buildClockTower() {
  const g = new THREE.Group();
  const s = M.sandstone;
  const sd = M.sandstoneDark;
  g.add(tbox(13, 9, 13, s, 0, -2.5, 0)); // base, from the ground
  g.add(tbox(11, 8, 11, s, 0, 4, 0));
  g.add(tbox(9, 14, 9, s, 0, 15, 0));
  g.add(tbox(9.8, 0.6, 9.8, sd, 0, 8.2, 0));
  g.add(tbox(9.6, 0.5, 9.6, sd, 0, 22.2, 0));
  g.add(tbox(8, 6, 8, s, 0, 25.4, 0));
  g.add(tbox(8.6, 0.5, 8.6, sd, 0, 28.6, 0));
  g.add(tbox(6, 4, 6, s, 0, 31, 0));
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
  const recess = duskEmissive(new THREE.MeshStandardMaterial({ color: 0x1f2433, emissive: 0xffb870 }), 0.3, 1.2);
  for (let side = 0; side < 4; side++) {
    const holder = new THREE.Group();
    for (const dx of [-2.6, 0, 2.6]) {
      const win = new THREE.Mesh(new THREE.ShapeGeometry(archShape(dx, { w: 1.6, sill: 10, spring: 13.5 }), 12), recess);
      win.position.z = 4.56;
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
  const faceMat = duskEmissive(new THREE.MeshStandardMaterial({ map: tex, emissive: 0xfff3d0, emissiveMap: tex, transparent: true }), 0.5, 1.6);
  for (let side = 0; side < 4; side++) {
    const f = new THREE.Mesh(new THREE.CircleGeometry(2.6, 40), faceMat);
    const a = (side * Math.PI) / 2;
    f.position.set(Math.sin(a) * 4.08, 25.4, Math.cos(a) * 4.08);
    f.rotation.y = a;
    g.add(f);
    faces.push(f);
  }
  // the tower stands on the city side of the building, behind the hall
  g.position.set(4, B.h, 30);
  scene.add(g);
}
