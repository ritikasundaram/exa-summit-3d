import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Exa mark traced from the brand file: a frame with the right side open,
// crossed by two diagonals that form an hourglass, plus a short middle bar.
// Units: 608 x 768, origin top-left, y down.
export const LOGO_W = 608;
export const LOGO_H = 768;
export const LOGO_ASPECT = LOGO_W / LOGO_H;

export const LOGO_POLYS = [
  [[0, 0], [608, 0], [608, 57], [0, 57]], // top bar
  [[0, 711], [608, 711], [608, 768], [0, 768]], // bottom bar
  [[0, 0], [68, 0], [68, 768], [0, 768]], // left bar
  [[68, 354], [245, 354], [245, 412], [68, 412]], // middle bar
  [[68, 57], [97, 57], [608, 711], [518, 711], [68, 126]], // diagonal TL -> BR
  [[68, 711], [97, 711], [608, 57], [518, 57], [68, 642]], // diagonal BL -> TR
];

/** Draw the mark on a 2D canvas. (x, y) top-left, height h. rotate in radians around center. */
export function drawLogo(ctx, x, y, h, color = '#fff', rotate = 0) {
  const s = h / LOGO_H;
  const w = LOGO_W * s;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(rotate);
  ctx.translate(-w / 2, -h / 2);
  ctx.scale(s, s);
  ctx.fillStyle = color;
  for (const poly of LOGO_POLYS) {
    ctx.beginPath();
    poly.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  return w;
}

/** Wordmark: logo + "exa" text */
export function drawWordmark(ctx, x, y, h, color = '#fff') {
  const w = drawLogo(ctx, x, y, h, color);
  ctx.fillStyle = color;
  ctx.font = `600 ${h * 1.02}px Inter, Helvetica, Arial, sans-serif`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('exa', x + w + h * 0.28, y + h * 0.9);
  return w + h * 0.28 + ctx.measureText('exa').width;
}

const geoCache = new Map();

/** Extruded 3D mark, centered, height 1, facing +z. */
export function logoGeometry(depth = 0.1, bevel = false) {
  const key = depth + ':' + bevel;
  if (geoCache.has(key)) return geoCache.get(key);
  const geos = LOGO_POLYS.map((poly) => {
    const shape = new THREE.Shape();
    poly.forEach(([px, py], i) => {
      const X = (px - LOGO_W / 2) / LOGO_H;
      const Y = -(py - LOGO_H / 2) / LOGO_H;
      i ? shape.lineTo(X, Y) : shape.moveTo(X, Y);
    });
    const g = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: bevel,
      bevelThickness: depth * 0.25,
      bevelSize: 0.006,
      bevelSegments: 2,
    });
    g.translate(0, 0, -depth / 2);
    return g;
  });
  const merged = mergeGeometries(geos.map((g) => (g.index ? g.toNonIndexed() : g)));
  merged.computeVertexNormals();
  geoCache.set(key, merged);
  return merged;
}

/** Convenience: a logo mesh of given height. */
export function logoMesh(height, depth, material) {
  const m = new THREE.Mesh(logoGeometry(depth / height), material);
  m.scale.setScalar(height);
  return m;
}

// Hoodie illustration paths (400x420 artboard), shared by SVG + canvas art.
export const HOODIE_PATHS = {
  hood: 'M138 74 Q200 4 262 74 Q252 116 200 118 Q148 116 138 74Z',
  sleeveL: 'M122 90 Q82 106 68 196 L54 330 Q70 344 96 338 L110 214 Q116 160 132 140Z',
  sleeveR: 'M278 90 Q318 106 332 196 L346 330 Q330 344 304 338 L290 214 Q284 160 268 140Z',
  cuffL: 'M54 328 L96 336 L93 364 L51 356Z',
  cuffR: 'M346 328 L304 336 L307 364 L349 356Z',
  body: 'M126 84 Q156 72 170 70 Q200 98 230 70 Q244 72 274 84 Q294 96 296 132 L298 346 Q200 358 102 346 L104 132 Q106 96 126 84Z',
  band: 'M102 340 Q200 352 298 340 L298 376 Q200 388 102 376Z',
  neck: 'M168 74 Q200 106 232 74 Q200 90 168 74Z',
  rim: 'M158 72 Q200 124 242 72',
  pocket: 'M140 262 L260 262 Q270 300 280 338 L120 338 Q130 300 140 262Z',
  pocketL: 'M140 262 Q130 300 120 338',
  pocketR: 'M260 262 Q270 300 280 338',
  stringL: 'M186 98 Q182 140 180 192',
  stringR: 'M214 98 Q218 140 221 196',
  foldL: 'M120 180 Q140 220 128 300',
  foldR: 'M282 170 Q262 230 274 300',
};
