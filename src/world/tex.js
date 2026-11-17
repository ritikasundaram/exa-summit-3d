import * as THREE from 'three';
import { drawLogo, drawWordmark, LOGO_ASPECT } from './logo.js';
import { CSS, EVENT } from '../config.js';

export const FONT = 'Inter, Helvetica, Arial, sans-serif';
export const MONO = '"JetBrains Mono", Menlo, monospace';

let maxAniso = 4;
const registry = new Set();
export function setMaxAnisotropy(n) {
  maxAniso = n;
  for (const t of registry) {
    t.anisotropy = n;
    t.needsUpdate = true;
  }
}

export function canvasTexture(w, h, draw, { repeat, srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  registry.add(t);
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  t.userData.canvas = c;
  return t;
}

/** Plane with a canvas texture; width in meters, pixel density px/m. */
export function textPlane(wM, hM, draw, { pxPerM = 200, emissive = 0, transparent = false, doubleSide = false, max = 2048 } = {}) {
  let pw = Math.round(wM * pxPerM);
  let ph = Math.round(hM * pxPerM);
  const k = Math.min(1, max / Math.max(pw, ph));
  pw = Math.round(pw * k);
  ph = Math.round(ph * k);
  const tex = canvasTexture(pw, ph, draw);
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.85,
    transparent,
    side: doubleSide ? THREE.DoubleSide : THREE.FrontSide,
  });
  if (emissive) {
    mat.emissive = new THREE.Color(0xffffff);
    mat.emissiveMap = tex;
    mat.emissiveIntensity = emissive;
  }
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(wM, hM), mat);
  mesh.userData.texture = tex;
  return mesh;
}

export function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y);
      line = w;
      y += lineH;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, y);
  return y + lineH;
}

// ---------- Procedural surface textures ----------

function noise(ctx, w, h, alpha, n = 6000) {
  for (let i = 0; i < n; i++) {
    const v = Math.random() > 0.5 ? 255 : 0;
    ctx.fillStyle = `rgba(${v},${v},${v},${Math.random() * alpha})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1);
  }
}

export function woodFloorTexture(repeat) {
  return canvasTexture(
    1024,
    1024,
    (ctx, w, h) => {
      const plankH = 64;
      for (let y = 0; y < h; y += plankH) {
        let x = -Math.random() * 300;
        while (x < w) {
          const len = 280 + Math.random() * 320;
          const l = 27 + Math.random() * 9;
          ctx.fillStyle = `hsl(${24 + Math.random() * 6}, ${38 + Math.random() * 10}%, ${l}%)`;
          ctx.fillRect(x, y, len, plankH);
          // grain
          for (let g = 0; g < 10; g++) {
            ctx.strokeStyle = `rgba(40,22,10,${0.08 + Math.random() * 0.1})`;
            ctx.lineWidth = 1 + Math.random() * 2;
            ctx.beginPath();
            const gy = y + Math.random() * plankH;
            ctx.moveTo(x, gy);
            ctx.bezierCurveTo(x + len * 0.3, gy + (Math.random() - 0.5) * 8, x + len * 0.6, gy + (Math.random() - 0.5) * 8, x + len, gy);
            ctx.stroke();
          }
          ctx.fillStyle = 'rgba(20,10,4,0.5)';
          ctx.fillRect(x, y, 2, plankH);
          x += len;
        }
        ctx.fillStyle = 'rgba(20,10,4,0.45)';
        ctx.fillRect(0, y, w, 2);
      }
      noise(ctx, w, h, 0.05);
    },
    { repeat },
  );
}

export function deckTexture(repeat) {
  return canvasTexture(
    512,
    512,
    (ctx, w, h) => {
      const bw = 42;
      for (let x = 0; x < w; x += bw) {
        ctx.fillStyle = `hsl(${26 + Math.random() * 6}, 28%, ${30 + Math.random() * 7}%)`;
        ctx.fillRect(x, 0, bw, h);
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(x, 0, 3, h);
      }
      noise(ctx, w, h, 0.08);
    },
    { repeat },
  );
}

export function carpetTexture(repeat, hue = 220) {
  return canvasTexture(
    256,
    256,
    (ctx, w, h) => {
      ctx.fillStyle = `hsl(${hue}, 6%, 72%)`;
      ctx.fillRect(0, 0, w, h);
      noise(ctx, w, h, 0.15, 9000);
    },
    { repeat },
  );
}

export function concreteTexture(repeat) {
  return canvasTexture(
    256,
    256,
    (ctx, w, h) => {
      ctx.fillStyle = '#9a9a96';
      ctx.fillRect(0, 0, w, h);
      noise(ctx, w, h, 0.2, 12000);
    },
    { repeat },
  );
}

export function grassTexture(repeat) {
  return canvasTexture(
    256,
    256,
    (ctx, w, h) => {
      ctx.fillStyle = '#c9a85a';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 1600; i++) {
        ctx.strokeStyle = `hsl(${40 + Math.random() * 14}, 55%, ${45 + Math.random() * 25}%)`;
        ctx.beginPath();
        const x = Math.random() * w,
          y = Math.random() * h;
        ctx.moveTo(x, y);
        ctx.lineTo(x + (Math.random() - 0.5) * 14, y + (Math.random() - 0.5) * 6);
        ctx.stroke();
      }
    },
    { repeat },
  );
}

// ---------- PBR surface sets (albedo + normal + roughness, all procedural) ----------

// Deterministic RNG so surfaces look the same on every load.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d', { willReadFrequently: true })];
}

function dataTexture(canvas, { srgb = false, repeat } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = maxAniso;
  registry.add(t);
  if (repeat) t.repeat.set(repeat[0], repeat[1]);
  return t;
}

/** Tangent-space normal map from a greyscale height canvas (tiling Sobel). */
function normalFromHeight(heightCanvas, strength = 2) {
  const w = heightCanvas.width;
  const h = heightCanvas.height;
  const src = heightCanvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
  const [out, octx] = makeCanvas(w, h);
  const img = octx.createImageData(w, h);
  const d = img.data;
  const H = (x, y) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (H(x + 1, y) - H(x - 1, y)) * strength;
      const dy = (H(x, y + 1) - H(x, y - 1)) * strength;
      const il = 1 / Math.hypot(dx, dy, 1);
      const i = (y * w + x) * 4;
      d[i] = (-dx * il * 0.5 + 0.5) * 255;
      d[i + 1] = (dy * il * 0.5 + 0.5) * 255;
      d[i + 2] = (il * 0.5 + 0.5) * 255;
      d[i + 3] = 255;
    }
  }
  octx.putImageData(img, 0, 0);
  return out;
}

function speckle(ctx, w, h, r, n, alpha, light = 255, dark = 0, size = 2) {
  for (let i = 0; i < n; i++) {
    const v = r() > 0.5 ? light : dark;
    ctx.fillStyle = `rgba(${v},${v},${v},${r() * alpha})`;
    ctx.fillRect(r() * w, r() * h, 1 + r() * size, 1 + r() * size);
  }
}

/** Soft low-frequency blotches (tiling) for plaster, stone and stains. */
function blotches(ctx, w, h, r, n, radius, alpha, light = true) {
  for (let i = 0; i < n; i++) {
    const x = r() * w;
    const y = r() * h;
    const rad = radius * (0.5 + r());
    for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) {
      if (x + ox < -rad || x + ox > w + rad || y + oy < -rad || y + oy > h + rad) continue;
      const g = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad);
      const v = light ? 255 : 0;
      g.addColorStop(0, `rgba(${v},${v},${v},${alpha * r()})`);
      g.addColorStop(1, `rgba(${v},${v},${v},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2);
    }
  }
}

/**
 * Planked timber: pale Scandinavian oak for the hall, weathered boards for the terrace.
 * Returns { map, normalMap, roughnessMap } tiling every `tileM` metres.
 */
export function plankSet({ size = 1024, planks = 16, hue = 33, sat = 34, light = 60, gap = 2, lenMin = 380, lenMax = 760, rough = [0.38, 0.6], seed = 7, strength = 2.2, weathered = false } = {}) {
  const r = rng(seed);
  const [alb, a] = makeCanvas(size, size);
  const [hgt, hc] = makeCanvas(size, size);
  const [rgh, rc] = makeCanvas(size, size);
  const ph = size / planks;
  hc.fillStyle = '#808080';
  hc.fillRect(0, 0, size, size);
  for (let row = 0; row < planks; row++) {
    const y = row * ph;
    let x = -r() * lenMax;
    while (x < size) {
      const len = lenMin + r() * (lenMax - lenMin);
      const l = light + (r() - 0.5) * 6;
      const hh = hue + (r() - 0.5) * 4;
      const ss = sat + (r() - 0.5) * 10;
      for (const ox of [0, size]) {
        a.fillStyle = `hsl(${hh}, ${ss}%, ${l}%)`;
        a.fillRect(x + ox, y, len, ph);
        // long grain streaks
        const streaks = weathered ? 26 : 16;
        for (let g = 0; g < streaks; g++) {
          const gy = y + r() * ph;
          const dark = r() < 0.7;
          a.strokeStyle = dark ? `rgba(70,42,18,${0.04 + r() * 0.1})` : `rgba(255,240,215,${0.04 + r() * 0.08})`;
          a.lineWidth = 0.6 + r() * 1.8;
          a.beginPath();
          a.moveTo(x + ox, gy);
          a.bezierCurveTo(x + ox + len * 0.3, gy + (r() - 0.5) * 7, x + ox + len * 0.65, gy + (r() - 0.5) * 7, x + ox + len, gy + (r() - 0.5) * 3);
          a.stroke();
          if (g < 5) {
            hc.strokeStyle = `rgba(0,0,0,${0.05 + r() * 0.08})`;
            hc.lineWidth = 1;
            hc.stroke(new Path2D(`M${x + ox} ${gy} L${x + ox + len} ${gy + (r() - 0.5) * 3}`));
          }
        }
        // the odd knot
        if (r() < 0.22) {
          const kx = x + ox + r() * len;
          const ky = y + ph * (0.3 + r() * 0.4);
          const kg = a.createRadialGradient(kx, ky, 0, kx, ky, ph * 0.22);
          kg.addColorStop(0, 'rgba(60,34,14,0.55)');
          kg.addColorStop(1, 'rgba(60,34,14,0)');
          a.fillStyle = kg;
          a.fillRect(kx - ph, ky - ph, ph * 2, ph * 2);
        }
        // per-plank height and gloss variation
        const pv = Math.round(128 + (r() - 0.5) * 26);
        hc.fillStyle = `rgba(${pv},${pv},${pv},0.55)`;
        hc.fillRect(x + ox, y, len, ph);
        const rv = Math.round((rough[0] + r() * (rough[1] - rough[0])) * 255);
        rc.fillStyle = `rgb(${rv},${rv},${rv})`;
        rc.fillRect(x + ox, y, len, ph);
        // butt joint
        a.fillStyle = 'rgba(30,18,8,0.3)';
        a.fillRect(x + ox, y, gap, ph);
        hc.fillStyle = '#000';
        hc.fillRect(x + ox, y, gap + 1, ph);
        rc.fillStyle = '#e6e6e6';
        rc.fillRect(x + ox, y, gap + 1, ph);
      }
      x += len;
    }
    a.fillStyle = 'rgba(30,18,8,0.28)';
    a.fillRect(0, y, size, gap);
    hc.fillStyle = '#000';
    hc.fillRect(0, y, size, gap + 1);
    rc.fillStyle = '#e6e6e6';
    rc.fillRect(0, y, size, gap + 1);
  }
  speckle(a, size, size, r, weathered ? 9000 : 5000, 0.045);
  speckle(rc, size, size, r, 7000, 0.12, 255, 0, 3);
  if (weathered) {
    blotches(a, size, size, r, 40, size * 0.12, 0.16, false);
  }
  return {
    map: dataTexture(alb, { srgb: true }),
    normalMap: dataTexture(normalFromHeight(hgt, strength)),
    roughnessMap: dataTexture(rgh),
  };
}

/** Painted or exposed brick in running bond. */
export function brickSet({ size = 512, rows = 14, cols = 5, base = [238, 234, 226], vary = 5, mortar = [214, 209, 199], seed = 3, strength = 3 } = {}) {
  const r = rng(seed);
  const [alb, a] = makeCanvas(size, size);
  const [hgt, hc] = makeCanvas(size, size);
  const bh = size / rows;
  const bw = size / cols;
  const m = Math.max(2, size / 170);
  a.fillStyle = `rgb(${mortar})`;
  a.fillRect(0, 0, size, size);
  hc.fillStyle = '#2a2a2a';
  hc.fillRect(0, 0, size, size);
  for (let row = 0; row < rows; row++) {
    const off = (row % 2) * bw * 0.5;
    for (let c = -1; c <= cols; c++) {
      const x = c * bw + off;
      const y = row * bh;
      const v = (r() - 0.5) * 2 * vary;
      a.fillStyle = `rgb(${base.map((ch) => Math.round(Math.max(0, Math.min(255, ch + v)))).join(',')})`;
      a.fillRect(x + m / 2, y + m / 2, bw - m, bh - m);
      const hv = Math.round(175 + r() * 60);
      hc.fillStyle = `rgb(${hv},${hv},${hv})`;
      hc.fillRect(x + m / 2, y + m / 2, bw - m, bh - m);
    }
  }
  speckle(a, size, size, r, 2500, 0.025);
  speckle(hc, size, size, r, 4000, 0.12, 255, 0, 3);
  return { map: dataTexture(alb, { srgb: true }), normalMap: dataTexture(normalFromHeight(hgt, strength)) };
}

/** Trowelled plaster: nearly flat colour with a soft, uneven surface. */
export function plasterSet({ size = 256, seed = 11, strength = 1.2 } = {}) {
  const r = rng(seed);
  const [hgt, hc] = makeCanvas(size, size);
  hc.fillStyle = '#808080';
  hc.fillRect(0, 0, size, size);
  blotches(hc, size, size, r, 60, size * 0.16, 0.35, true);
  blotches(hc, size, size, r, 60, size * 0.16, 0.35, false);
  speckle(hc, size, size, r, 5000, 0.18, 255, 0, 2);
  return { normalMap: dataTexture(normalFromHeight(hgt, strength)) };
}

/** Ashlar stone blocks for the Ferry Building facade. */
export function stoneSet({ size = 512, rows = 4, cols = 3, seed = 21 } = {}) {
  const r = rng(seed);
  const [alb, a] = makeCanvas(size, size);
  const [hgt, hc] = makeCanvas(size, size);
  a.fillStyle = '#ffffff';
  a.fillRect(0, 0, size, size);
  hc.fillStyle = '#9a9a9a';
  hc.fillRect(0, 0, size, size);
  const bh = size / rows;
  const bw = size / cols;
  for (let row = 0; row < rows; row++) {
    for (let c = -1; c <= cols; c++) {
      const x = c * bw + (row % 2) * bw * 0.5;
      const v = Math.round(232 + r() * 23);
      a.fillStyle = `rgb(${v},${v - 2},${v - 6})`;
      a.fillRect(x + 1, row * bh + 1, bw - 2, bh - 2);
      const hv = Math.round(150 + r() * 30);
      hc.fillStyle = `rgb(${hv},${hv},${hv})`;
      hc.fillRect(x + 2, row * bh + 2, bw - 4, bh - 4);
    }
    a.fillStyle = 'rgba(90,80,65,0.35)';
    a.fillRect(0, row * bh, size, 2);
    hc.fillStyle = '#303030';
    hc.fillRect(0, row * bh, size, 3);
  }
  blotches(a, size, size, r, 30, size * 0.18, 0.12, false);
  speckle(a, size, size, r, 12000, 0.07);
  speckle(hc, size, size, r, 16000, 0.3, 255, 0, 3);
  return { map: dataTexture(alb, { srgb: true }), normalMap: dataTexture(normalFromHeight(hgt, 2.4)) };
}

/** Vertical timber slats with shadow gaps (Scandinavian slat wall). U runs across the slats. */
export function slatSet({ size = 512, slats = 10, seed = 5 } = {}) {
  const r = rng(seed);
  const [alb, a] = makeCanvas(size, size);
  const [hgt, hc] = makeCanvas(size, size);
  const sw = size / slats;
  const gap = sw * 0.3;
  a.fillStyle = '#17120d';
  a.fillRect(0, 0, size, size);
  hc.fillStyle = '#000';
  hc.fillRect(0, 0, size, size);
  for (let i = 0; i < slats; i++) {
    const x = i * sw + gap / 2;
    a.fillStyle = `hsl(${31 + r() * 5}, ${36 + r() * 8}%, ${58 + r() * 9}%)`;
    a.fillRect(x, 0, sw - gap, size);
    for (let g = 0; g < 9; g++) {
      a.strokeStyle = `rgba(80,48,20,${0.05 + r() * 0.1})`;
      a.lineWidth = 0.6 + r() * 1.4;
      const gx = x + r() * (sw - gap);
      a.beginPath();
      a.moveTo(gx, 0);
      a.bezierCurveTo(gx + (r() - 0.5) * 6, size * 0.3, gx + (r() - 0.5) * 6, size * 0.7, gx, size);
      a.stroke();
    }
    const grad = hc.createLinearGradient(x, 0, x + sw - gap, 0);
    grad.addColorStop(0, '#555');
    grad.addColorStop(0.18, '#fff');
    grad.addColorStop(0.82, '#fff');
    grad.addColorStop(1, '#555');
    hc.fillStyle = grad;
    hc.fillRect(x, 0, sw - gap, size);
  }
  return { map: dataTexture(alb, { srgb: true }), normalMap: dataTexture(normalFromHeight(hgt, 3.5)) };
}

/** White-painted tongue-and-groove boards for the roof vault. V runs across the boards. */
export function boardSet({ size = 256, boards = 8, seed = 9 } = {}) {
  const r = rng(seed);
  const [alb, a] = makeCanvas(size, size);
  const [hgt, hc] = makeCanvas(size, size);
  const bh = size / boards;
  for (let i = 0; i < boards; i++) {
    const v = Math.round(238 + r() * 14);
    a.fillStyle = `rgb(${v},${v - 1},${v - 4})`;
    a.fillRect(0, i * bh, size, bh);
    hc.fillStyle = '#c0c0c0';
    hc.fillRect(0, i * bh, size, bh);
    a.fillStyle = 'rgba(60,55,48,0.5)';
    a.fillRect(0, i * bh, size, 1.5);
    hc.fillStyle = '#000';
    hc.fillRect(0, i * bh, size, 2.5);
  }
  speckle(a, size, size, r, 2500, 0.04);
  return { map: dataTexture(alb, { srgb: true }), normalMap: dataTexture(normalFromHeight(hgt, 2.5)) };
}

/** Woven cloth / carpet micro-relief (tinted by the material colour). */
export function weaveSet({ size = 128, seed = 13, strength = 2 } = {}) {
  const r = rng(seed);
  const [alb, a] = makeCanvas(size, size);
  const [hgt, hc] = makeCanvas(size, size);
  a.fillStyle = '#fff';
  a.fillRect(0, 0, size, size);
  hc.fillStyle = '#707070';
  hc.fillRect(0, 0, size, size);
  const n = size / 4;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const over = (x + y) % 2 === 0;
    const v = Math.round(over ? 190 + r() * 60 : 60 + r() * 50);
    hc.fillStyle = `rgb(${v},${v},${v})`;
    hc.fillRect(x * 4, y * 4, over ? 4 : 3, over ? 3 : 4);
    a.fillStyle = `rgba(0,0,0,${0.02 + r() * 0.05})`;
    a.fillRect(x * 4, y * 4, 4, 4);
  }
  return { map: dataTexture(alb, { srgb: true }), normalMap: dataTexture(normalFromHeight(hgt, strength)) };
}

/** Poured concrete / paving. */
export function concreteSet({ size = 512, seed = 17 } = {}) {
  const r = rng(seed);
  const [alb, a] = makeCanvas(size, size);
  const [hgt, hc] = makeCanvas(size, size);
  a.fillStyle = '#a3a19b';
  a.fillRect(0, 0, size, size);
  hc.fillStyle = '#808080';
  hc.fillRect(0, 0, size, size);
  blotches(a, size, size, r, 40, size * 0.2, 0.12, false);
  blotches(a, size, size, r, 30, size * 0.2, 0.1, true);
  speckle(a, size, size, r, 14000, 0.1);
  speckle(hc, size, size, r, 16000, 0.25, 255, 0, 3);
  // saw-cut joints
  a.fillStyle = 'rgba(40,40,40,0.5)';
  a.fillRect(0, 0, size, 2);
  a.fillRect(0, 0, 2, size);
  hc.fillStyle = '#000';
  hc.fillRect(0, 0, size, 3);
  hc.fillRect(0, 0, 3, size);
  return { map: dataTexture(alb, { srgb: true }), normalMap: dataTexture(normalFromHeight(hgt, 1.6)) };
}

/** Rewrite a BoxGeometry's UVs so textures tile in metres (tile = metres per repeat). */
export function uvMeters(geo, w, h, d, tile = 1) {
  const uv = geo.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) {
    const k = f * 4 + i;
    uv.setXY(k, (uv.getX(k) * dims[f][0]) / tile, (uv.getY(k) * dims[f][1]) / tile);
  }
  uv.needsUpdate = true;
  return geo;
}

// ---------- Branded graphics ----------

export function blueGradient(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#2b4cff');
  g.addColorStop(1, '#1630b8');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** Subtle "search graph" pattern for backdrops. */
export function networkPattern(ctx, w, h, color = 'rgba(255,255,255,0.12)', count = 70) {
  const pts = [];
  for (let i = 0; i < count; i++) pts.push([Math.random() * w, Math.random() * h]);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, w / 1400);
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const dx = pts[i][0] - pts[j][0],
        dy = pts[i][1] - pts[j][1];
      if (dx * dx + dy * dy < (w * 0.12) ** 2) {
        ctx.beginPath();
        ctx.moveTo(pts[i][0], pts[i][1]);
        ctx.lineTo(pts[j][0], pts[j][1]);
        ctx.stroke();
      }
    }
  }
  ctx.fillStyle = color.replace(/[\d.]+\)$/, '0.35)');
  for (const p of pts) {
    ctx.beginPath();
    ctx.arc(p[0], p[1], Math.max(2, w / 500), 0, Math.PI * 2);
    ctx.fill();
  }
}

export function eventLockup(ctx, cx, cy, h, color = '#fff', sub = true) {
  // centered wordmark + event name
  ctx.save();
  ctx.font = `600 ${h * 1.02}px ${FONT}`;
  const tw = ctx.measureText('exa').width;
  const total = h * LOGO_ASPECT + h * 0.28 + tw;
  drawWordmark(ctx, cx - total / 2, cy - h / 2, h, color);
  if (sub) {
    ctx.font = `500 ${h * 0.32}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.85;
    ctx.fillText(`${EVENT.name.toUpperCase()} ${EVENT.year}`, cx, cy + h * 0.95);
  }
  ctx.restore();
}

export { drawLogo, drawWordmark, CSS };
