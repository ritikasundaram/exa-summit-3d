import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { COLORS } from '../config.js';
import { uvMeters } from './tex.js';

import { plasterSet, stoneSet, slatSet, weaveSet } from './tex.js';

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0, ...o });

const plaster = plasterSet();
plaster.normalMap.repeat.set(0.4, 0.4);
const stone = stoneSet();
stone.map.repeat.set(0.4, 0.4);
stone.normalMap.repeat.set(0.4, 0.4);
const slat = slatSet();
slat.map.repeat.set(1 / 0.6, 1 / 0.6);
slat.normalMap.repeat.set(1 / 0.6, 1 / 0.6);
const weave = weaveSet();
weave.map.repeat.set(12, 12);
weave.normalMap.repeat.set(12, 12);
const cloth = (color, o = {}) => std(color, { roughness: 0.96, map: weave.map, normalMap: weave.normalMap, normalScale: new THREE.Vector2(0.55, 0.55), ...o });
const noCast = (m) => {
  m.userData.noCast = true;
  return m;
};

export const M = {
  blue: std(COLORS.blue, { roughness: 0.5 }),
  blueGloss: std(COLORS.blue, { roughness: 0.18 }),
  blueGlow: std(COLORS.blue, { emissive: COLORS.blue, emissiveIntensity: 1.1, roughness: 0.4 }),
  white: std(0xf4f3ef, { roughness: 0.45 }),
  whiteGlow: noCast(std(0xffffff, { emissive: 0xffffff, emissiveIntensity: 2.4 })),
  wall: std(0xebe6dc, { roughness: 0.92, normalMap: plaster.normalMap, normalScale: new THREE.Vector2(0.35, 0.35) }),
  partition: std(0xffffff, { roughness: 0.62, map: slat.map, normalMap: slat.normalMap, normalScale: new THREE.Vector2(0.9, 0.9) }),
  ceiling: std(0xe9e6df, { roughness: 1 }),
  sandstone: std(COLORS.sandstone, { roughness: 0.92, map: stone.map, normalMap: stone.normalMap, normalScale: new THREE.Vector2(0.6, 0.6) }),
  sandstoneDark: std(0xb5a685, { roughness: 0.92, map: stone.map, normalMap: stone.normalMap, normalScale: new THREE.Vector2(0.6, 0.6) }),
  black: std(COLORS.black, { roughness: 0.5 }),
  metal: std(0xa7adb5, { roughness: 0.28, metalness: 0.92 }),
  darkMetal: std(0x2b2e34, { roughness: 0.36, metalness: 0.85 }),
  steel: std(0x343a3d, { roughness: 0.52, metalness: 0.55 }),
  gold: std(0xc09a52, { roughness: 0.26, metalness: 1 }),
  wood: std(COLORS.wood, { roughness: 0.58 }),
  woodDark: std(COLORS.woodDark, { roughness: 0.62 }),
  fabricCream: cloth(0xe6dfd0),
  fabricTan: cloth(0xb8845a),
  fabricGrey: cloth(0x6d6f75),
  fabricSage: cloth(0x7d8f78),
  fabricRust: cloth(0xa9573a),
  fabricNavy: cloth(0x27355e),
  leaf: std(0x3c7a3c, { roughness: 0.5, side: THREE.DoubleSide }),
  leafDark: std(0x245028, { roughness: 0.5, side: THREE.DoubleSide }),
  pot: std(0x3a3b3f, { roughness: 0.7 }),
  terracotta: std(0xb5694a, { roughness: 0.85 }),
  glass: noCast(
    new THREE.MeshPhysicalMaterial({
      color: 0xdbe7ff,
      roughness: 0.1,
      metalness: 0,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      depthWrite: false,
      envMapIntensity: 2.2,
    }),
  ),
  clearGlass: noCast(
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.1,
      transparent: true,
      opacity: 0.26,
      side: THREE.DoubleSide,
      depthWrite: false,
      envMapIntensity: 2.5,
    }),
  ),
  screen: std(0x0b0f22, { roughness: 0.15, metalness: 0.3 }),
  hay: std(0xd8b65a, { roughness: 1 }),
  shadow: noCast(new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false })),
  cookie: std(0xdcae6c, { roughness: 0.95 }),
  icing: std(0x2141ea, { roughness: 0.45 }),
  icingWhite: std(0xfdfdfd, { roughness: 0.45 }),
  // warm opal-glass pendant globe: bright enough to bloom
  globe: noCast(std(0xfff0d8, { emissive: 0xffc98a, emissiveIntensity: 3.2, roughness: 0.4 })),
};

// Blob shadow texture (radial)
const c = document.createElement('canvas');
c.width = c.height = 64;
const g = c.getContext('2d');
const grd = g.createRadialGradient(32, 32, 2, 32, 32, 32);
grd.addColorStop(0, 'rgba(0,0,0,0.42)');
grd.addColorStop(0.55, 'rgba(0,0,0,0.16)');
grd.addColorStop(1, 'rgba(0,0,0,0)');
g.fillStyle = grd;
g.fillRect(0, 0, 64, 64);
M.blob = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
M.blob.userData.noCast = true;
M.blob.userData.batch = true; // all contact shadows merge into one draw call

const blobGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
export function blobShadow(w, d = w) {
  const m = new THREE.Mesh(blobGeo, M.blob);
  m.scale.set(w, 1, d);
  m.position.y = 0.016;
  m.renderOrder = 1;
  return m;
}

export function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

/** Box whose UVs are in metres, for tiling surface textures (walls, stone, slats). */
export function tbox(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(uvMeters(new THREE.BoxGeometry(w, h, d), w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

/** Soft-edged box: bevels catch highlights the way real furniture does. */
export function rbox(w, h, d, mat, x = 0, y = 0, z = 0, r = 0.06) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001)), mat);
  m.position.set(x, y, z);
  return m;
}

export function cyl(rt, rb, h, mat, seg = 16) {
  return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
}
