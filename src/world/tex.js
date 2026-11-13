import * as THREE from 'three';
import { drawLogo, drawWordmark, LOGO_ASPECT } from './logo.js';
import { CSS, EVENT } from '../config.js';

export const FONT = 'Inter, Helvetica, Arial, sans-serif';
export const MONO = '"JetBrains Mono", Menlo, monospace';

let maxAniso = 4;
export function setMaxAnisotropy(n) {
  maxAniso = n;
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
