import { LOGO_POLYS, LOGO_W, LOGO_H } from '../world/logo.js';

export const $ = (sel, root = document) => root.querySelector(sel);

/** Tiny element helper: h('div.cls#id', {attrs}, ...children) */
export function h(tag, attrs = {}, ...children) {
  const [, name = 'div', rest = ''] = tag.match(/^([a-z0-9-]+)?(.*)$/i);
  const el = document.createElement(name || 'div');
  rest.replace(/([.#])([\w-]+)/g, (_, t, v) => (t === '.' ? el.classList.add(v) : (el.id = v)));
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') for (const [sk, sv] of Object.entries(v)) sk.startsWith('--') ? el.style.setProperty(sk, sv) : (el.style[sk] = sv);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
  return el;
}

/** Inline SVG of the Exa mark. rotate in degrees around center. */
export function logoSVG(color = 'currentColor', size = 24, rotate = 0) {
  const polys = LOGO_POLYS.map((p) => `<polygon points="${p.map((q) => q.join(',')).join(' ')}"/>`).join('');
  const vb = rotate % 180 ? `${(LOGO_W - LOGO_H) / 2} ${(LOGO_H - LOGO_W) / 2} ${LOGO_H} ${LOGO_W}` : `0 0 ${LOGO_W} ${LOGO_H}`;
  const w = rotate % 180 ? (size * LOGO_H) / LOGO_W : (size * LOGO_W) / LOGO_H;
  return `<svg class="exa-mark" viewBox="${vb}" width="${w}" height="${size}" fill="${color}" aria-hidden="true"><g transform="rotate(${rotate} ${LOGO_W / 2} ${LOGO_H / 2})">${polys}</g></svg>`;
}

export function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
