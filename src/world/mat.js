import * as THREE from 'three';
import { COLORS } from '../config.js';

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0, ...o });

export const M = {
  blue: std(COLORS.blue, { roughness: 0.55 }),
  blueGloss: std(COLORS.blue, { roughness: 0.25 }),
  blueGlow: std(COLORS.blue, { emissive: COLORS.blue, emissiveIntensity: 0.6, roughness: 0.4 }),
  white: std(0xffffff, { roughness: 0.5 }),
  whiteGlow: std(0xffffff, { emissive: 0xffffff, emissiveIntensity: 1.2 }),
  wall: std(0xe2ddd3, { roughness: 0.95 }),
  partition: std(0xc9d0e3, { roughness: 0.9 }),
  ceiling: std(0xd6d3cc, { roughness: 1 }),
  sandstone: std(COLORS.sandstone, { roughness: 0.95 }),
  sandstoneDark: std(0xb9a67f, { roughness: 0.95 }),
  black: std(COLORS.black, { roughness: 0.6 }),
  metal: std(0x9aa0a8, { roughness: 0.35, metalness: 0.8 }),
  darkMetal: std(0x2a2d33, { roughness: 0.4, metalness: 0.7 }),
  gold: std(0xc9a24a, { roughness: 0.3, metalness: 0.9 }),
  wood: std(COLORS.wood, { roughness: 0.7 }),
  woodDark: std(COLORS.woodDark, { roughness: 0.75 }),
  fabricCream: std(0xe9e1d3, { roughness: 1 }),
  fabricTan: std(0xc49a6c, { roughness: 0.9 }),
  fabricGrey: std(0x6d6f75, { roughness: 1 }),
  leaf: std(0x3f7a3a, { roughness: 0.9 }),
  leafDark: std(0x2d5a2b, { roughness: 0.9 }),
  pot: std(0x3a3b3f, { roughness: 0.8 }),
  glass: new THREE.MeshPhysicalMaterial({
    color: 0xdfe9ff,
    roughness: 0.05,
    metalness: 0,
    transmission: 0,
    transparent: true,
    opacity: 0.18,
    side: THREE.DoubleSide,
    depthWrite: false,
  }),
  clearGlass: new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.02,
    transparent: true,
    opacity: 0.28,
    side: THREE.DoubleSide,
    depthWrite: false,
    envMapIntensity: 2,
  }),
  screen: std(0x0b0f22, { roughness: 0.2, metalness: 0.2 }),
  hay: std(0xd8b65a, { roughness: 1 }),
  shadow: new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }),
  cookie: std(0xdcae6c, { roughness: 0.95 }),
  icing: std(0x2141ea, { roughness: 0.6 }),
  icingWhite: std(0xfdfdfd, { roughness: 0.6 }),
};

// Blob shadow texture (radial)
const c = document.createElement('canvas');
c.width = c.height = 64;
const g = c.getContext('2d');
const grd = g.createRadialGradient(32, 32, 2, 32, 32, 32);
grd.addColorStop(0, 'rgba(0,0,0,0.55)');
grd.addColorStop(1, 'rgba(0,0,0,0)');
g.fillStyle = grd;
g.fillRect(0, 0, 64, 64);
M.blob = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false });

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

export function cyl(rt, rb, h, mat, seg = 16) {
  return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
}
