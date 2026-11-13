import { h, $, logoSVG } from './dom.js';
import { state, onState, CHECKLIST, BAG_ITEMS, resetState } from '../state.js';
import { zones, interactables, spots } from '../core.js';
import { EVENT } from '../config.js';
import { isMuted, setMuted, unlockAudio, beep } from '../audio.js';

let ui;
let player;
let modalEl = null;
let modalOnClose = null;
let started = false;
let dragMode = false;
let tourActive = false;
const cb = {};

export const isModalOpen = () => !!modalEl;
export const isStarted = () => started;
export function setTourActive(v) {
  tourActive = v;
  document.body.classList.toggle('touring', v);
}

// ------------------------------------------------------------------ init
export function initHUD(opts) {
  player = opts.player;
  Object.assign(cb, opts);
  ui = $('#ui');
  const isTouch = matchMedia('(pointer: coarse)').matches;
  document.body.classList.toggle('touch', isTouch);

  ui.append(
    h('div.hud-top-left', {},
      h('div.brand', { html: `${logoSVG('#fff', 22)}<div><b>${EVENT.name} ${EVENT.year}</b><span>Shack15 · Ferry Building, SF</span></div>` }),
      h('div.zone#zone', {}, 'The Lounge'),
    ),
    h('div.hud-top-right', {},
      h('canvas.minimap#minimap', { width: 520, height: 260, title: 'Click to teleport', onclick: () => openTeleport() }),
      h('div.hud-buttons', {},
        h('button.hbtn', { onclick: () => openTeleport(), title: 'Teleport (T)' }, 'Teleport', h('kbd', {}, 'T')),
        h('button.hbtn', { onclick: () => cb.startTour?.(), title: 'Guided tour (G)' }, 'Tour', h('kbd', {}, 'G')),
        h('button.hbtn#mute', { onclick: () => toggleMute(), title: 'Sound (M)' }, isMuted() ? 'Sound off' : 'Sound on'),
        h('button.hbtn', { onclick: () => openHelp(), title: 'Help (H)' }, '?'),
      ),
    ),
    h('div.crosshair#crosshair'),
    h('button.prompt#prompt', { onclick: () => cb.interact?.() }),
    h('div.toasts#toasts'),
    h('div.checklist#checklist'),
    h('div.bag#bag'),
    h('div.tour-caption#tourCaption'),
    h('div.look-hint#lookHint', {}, 'Click to look around · WASD to move'),
  );
  if (isTouch) buildTouch();
  if (matchMedia('(max-width: 820px)').matches) $('#checklist').classList.add('collapsed');
  renderChecklist();
  renderBag();
  onState(() => {
    renderChecklist();
    renderBag();
  });

  addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) return;
    if (e.code === 'Escape' && modalEl) {
      closeModal();
      return;
    }
    if (!started) return;
    if (tourActive) {
      cb.stopTour?.();
      return;
    }
    if (modalEl) return;
    if (e.code === 'KeyE' || e.code === 'Enter') cb.interact?.();
    if (e.code === 'KeyT') openTeleport();
    if (e.code === 'KeyG') cb.startTour?.();
    if (e.code === 'KeyH') openHelp();
    if (e.code === 'KeyM') toggleMute();
  });

  const canvas = $('#scene');
  canvas.addEventListener('click', () => {
    if (!started || modalEl) return;
    if (tourActive) return cb.stopTour?.();
    if (!dragMode && !player.locked) player.lock();
  });
  document.addEventListener('pointerlockerror', () => {
    dragMode = true;
    document.body.classList.add('drag-mode');
  });
  document.addEventListener('pointerlockchange', () => {
    document.body.classList.toggle('locked', player.locked);
    if (!player.locked && started && !modalEl && !dragMode && !tourActive) showPause();
    if (player.locked) hidePause();
  });

  buildStartScreen();
}

function toggleMute() {
  setMuted(!isMuted());
  $('#mute').textContent = isMuted() ? 'Sound off' : 'Sound on';
  if (!isMuted()) beep(880, 0.06);
}

// ------------------------------------------------------------------ start + pause
function buildStartScreen() {
  const el = h('div.start#start', {},
    h('div.start-card', {},
      h('div.start-logo', { html: logoSVG('#fff', 64) }),
      h('div.start-kicker', {}, 'Concept experience · Shack15, Ferry Building · San Francisco'),
      h('h1', {}, `${EVENT.name} ${EVENT.year}`),
      h('p.start-sub', {}, 'Walk through a full Exa conference build-out of Shack15: branded arches, the main stage, the Highlights Café, swag, the "Are you exa-ordinary?" reaction game, the Summit MCP, and an after party on the Bay Terrace with goats.'),
      h('div.start-actions', {},
        h('button.btn.primary#btnTour', { onclick: () => begin(true), disabled: true }, 'Take the guided tour'),
        h('button.btn.ghost#btnFree', { onclick: () => begin(false), disabled: true }, 'Explore on my own'),
      ),
      h('div.start-loading#startLoading', {}, 'Building Shack15…'),
      h('div.controls', { html: document.body.classList.contains('touch')
        ? '<span><kbd>Left thumb</kbd> move</span><span><kbd>Right thumb</kbd> look</span><span><kbd>Tap</kbd> the prompt to interact</span>'
        : '<span><kbd>W A S D</kbd> move</span><span><kbd>Mouse</kbd> look</span><span><kbd>Shift</kbd> run</span><span><kbd>E</kbd> interact</span><span><kbd>T</kbd> teleport</span><span><kbd>G</kbd> tour</span><span><kbd>Esc</kbd> pause</span>' }),
    ),
  );
  ui.append(el);
}

export function worldReady() {
  $('#btnTour').disabled = false;
  $('#btnFree').disabled = false;
  $('#startLoading').textContent = '';
}

function begin(tour) {
  unlockAudio();
  started = true;
  $('#start').classList.add('hide');
  setTimeout(() => $('#start')?.remove(), 600);
  document.body.classList.add('started');
  if (tour) cb.startTour?.();
  else {
    player.enabled = true;
    if (!document.body.classList.contains('touch')) player.lock();
  }
}

let pauseEl = null;
function showPause() {
  if (pauseEl || document.body.classList.contains('touch')) return;
  player.enabled = false;
  pauseEl = h('div.pause', {},
    h('div.pause-card', {},
      h('div.pause-title', {}, 'Paused'),
      h('button.btn.primary', { onclick: () => resume() }, 'Resume'),
      h('button.btn.ghost', { onclick: () => { hidePause(); openTeleport(); } }, 'Teleport to a station'),
      h('button.btn.ghost', { onclick: () => { hidePause(); cb.startTour?.(); } }, 'Guided tour'),
      h('button.btn.ghost', { onclick: () => { hidePause(); openHelp(); } }, 'About this concept'),
    ),
  );
  ui.append(pauseEl);
}
function hidePause() {
  pauseEl?.remove();
  pauseEl = null;
}
export function resume() {
  hidePause();
  player.enabled = true;
  if (!dragMode && !document.body.classList.contains('touch')) player.lock();
}

// ------------------------------------------------------------------ modal
/**
 * openModal({ title, kicker, body: Element, wide, className, onClose })
 */
export function openModal({ title, kicker, body, wide, className = '', onClose }) {
  closeModal(true);
  hidePause();
  player.enabled = false;
  player.unlock();
  modalOnClose = onClose;
  const closeBtn = h('button.modal-close', { onclick: () => closeModal(), 'aria-label': 'Close' }, '×');
  modalEl = h(`div.modal-wrap`, { onmousedown: (e) => e.target === modalEl && closeModal() },
    h(`div.modal${wide ? '.wide' : ''}${className ? '.' + className : ''}`, {},
      h('div.modal-head', {},
        h('div', {}, kicker ? h('div.modal-kicker', {}, kicker) : null, h('h2', {}, title)),
        closeBtn,
      ),
      h('div.modal-body', {}, body),
    ),
  );
  ui.append(modalEl);
  requestAnimationFrame(() => modalEl?.classList.add('show'));
  return modalEl;
}

export function closeModal(silent = false) {
  if (!modalEl) return;
  const el = modalEl;
  modalEl = null;
  el.classList.remove('show');
  setTimeout(() => el.remove(), 180);
  const fn = modalOnClose;
  modalOnClose = null;
  fn?.();
  if (!silent && started && !tourActive) resume();
}

// ------------------------------------------------------------------ toasts
export function toast(msg, kind = '') {
  const t = h(`div.toast${kind ? '.' + kind : ''}`, { html: msg });
  $('#toasts').append(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 300);
  }, 3400);
}

// ------------------------------------------------------------------ prompt
let lastPrompt = '';
export function setPrompt(text) {
  if (text === lastPrompt) return;
  lastPrompt = text;
  const p = $('#prompt');
  if (!text) {
    p.classList.remove('show');
    return;
  }
  p.innerHTML = `<kbd>${document.body.classList.contains('touch') ? 'Tap' : 'E'}</kbd> ${text}`;
  p.classList.add('show');
}

// ------------------------------------------------------------------ checklist + bag
function renderChecklist() {
  const done = CHECKLIST.filter((c) => state.visited[c.id]).length;
  const el = $('#checklist');
  if (!el) return;
  const collapsed = el.classList.contains('collapsed');
  el.innerHTML = '';
  el.append(
    h('button.cl-head', { onclick: () => el.classList.toggle('collapsed') },
      h('span', {}, 'Summit checklist'),
      h('b', {}, `${done}/${CHECKLIST.length}`),
    ),
    h('div.cl-bar', {}, h('i', { style: { width: `${(done / CHECKLIST.length) * 100}%` } })),
    h('ul', {}, CHECKLIST.map((c) => h(`li${state.visited[c.id] ? '.done' : ''}`, {}, h('span.tick'), h('span', {}, c.label), h('em', {}, c.where)))),
  );
  if (collapsed) el.classList.add('collapsed');
}

function renderBag() {
  const el = $('#bag');
  if (!el) return;
  el.innerHTML = '';
  const items = Object.entries(state.bag).filter(([, n]) => n > 0);
  el.append(h('div.bag-title', {}, state.name ? `${state.name}'s bag` : 'Your bag'));
  if (!items.length) el.append(h('div.bag-empty', {}, 'Empty. Go get some swag.'));
  else
    el.append(
      h('div.bag-items', {}, items.map(([id, n]) => h('div.bag-item', { title: BAG_ITEMS[id]?.label || id }, h('span', {}, BAG_ITEMS[id]?.icon || '•'), n > 1 ? h('b', {}, n) : null))),
    );
}

// ------------------------------------------------------------------ zone + minimap
const MAP = { x0: -50, x1: 72, z0: -47, z1: 15 };
let mapCtx = null;
export function updateHUD(pos, yaw) {
  let zone = 'Ferry Building';
  if (pos.z < -12.3) zone = 'Bay Terrace · After party';
  else for (const z of zones) if (pos.x >= z.minX && pos.x <= z.maxX && pos.z >= z.minZ && pos.z <= z.maxZ && !z.name.startsWith('Bay')) zone = z.name;
  const ze = $('#zone');
  if (ze && ze.textContent !== zone) ze.textContent = zone;
  drawMap(pos, yaw);
}

function drawMap(pos, yaw) {
  const c = $('#minimap');
  if (!c) return;
  mapCtx ||= c.getContext('2d');
  const g = mapCtx;
  const W = c.width;
  const H = c.height;
  const X = (x) => ((x - MAP.x0) / (MAP.x1 - MAP.x0)) * W;
  const Z = (z) => ((z - MAP.z0) / (MAP.z1 - MAP.z0)) * H;
  g.clearRect(0, 0, W, H);
  g.fillStyle = '#0c1a4d';
  g.fillRect(0, 0, W, H);
  // deck
  g.fillStyle = '#6b5643';
  g.fillRect(X(-90), Z(-44), X(70) - X(-90), Z(-12.2) - Z(-44));
  // pen
  g.fillStyle = '#c9a85a';
  g.fillRect(X(44), Z(-38), X(60) - X(44), Z(-22) - Z(-38));
  // building
  g.fillStyle = '#f3f3ef';
  g.fillRect(X(-42), Z(-12), X(44) - X(-42), Z(12) - Z(-12));
  g.fillStyle = '#d8c9a8';
  g.fillRect(X(-90), Z(-12), X(-42) - X(-90), Z(12) - Z(-12));
  g.fillRect(X(44), Z(-12), X(70) - X(44), Z(12) - Z(-12));
  g.strokeStyle = '#9aa0b8';
  g.lineWidth = 3;
  for (const px of [-23, -11, 7, 13, 31]) {
    g.beginPath();
    g.moveTo(X(px), Z(-12));
    g.lineTo(X(px), Z(3));
    g.stroke();
  }
  // stations
  for (const it of interactables) {
    if (it.hidden) continue;
    const done = state.visited[it.id];
    g.fillStyle = done ? '#2bd47d' : '#2141EA';
    g.beginPath();
    g.arc(X(it.pos.x), Z(it.pos.z), 7, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#fff';
    g.lineWidth = 2.5;
    g.stroke();
  }
  // player
  const px = X(pos.x);
  const pz = Z(pos.z);
  const fx = -Math.sin(yaw);
  const fz = -Math.cos(yaw);
  g.save();
  g.translate(px, pz);
  g.rotate(Math.atan2(fz, fx) + Math.PI / 2);
  g.fillStyle = '#ff4d6d';
  g.beginPath();
  g.moveTo(0, -14);
  g.lineTo(10, 10);
  g.lineTo(0, 5);
  g.lineTo(-10, 10);
  g.closePath();
  g.fill();
  g.strokeStyle = '#fff';
  g.lineWidth = 2.5;
  g.stroke();
  g.restore();
}

// ------------------------------------------------------------------ teleport + help
export function openTeleport() {
  const groups = {};
  for (const s of spots) (groups[s.group] ||= []).push(s);
  const body = h('div.teleport', {},
    Object.entries(groups).map(([g, list]) =>
      h('div.tp-group', {},
        h('h3', {}, g === 'After party' ? 'Outside · After party on the Bay Terrace' : 'Inside · Shack15'),
        h('div.tp-grid', {}, list.map((s) => h('button.tp', { onclick: () => { cb.teleport?.(s); closeModal(); } }, s.name))),
      ),
    ),
  );
  openModal({ title: 'Teleport', kicker: 'Jump to any station', body });
}

export function openHelp() {
  const body = h('div.help', { html: `
    <p class="lead">A walkable concept for an Exa conference at <b>Shack15</b> on the second floor of the Ferry Building, San Francisco. The floor plan follows Shack15's rooms (Lounge, Library, Kilden, Finstua, Sanctuary, Gallery, Salon), and all <b>13 brandable arches</b> from the venue deck carry Exa blue.</p>
    <div class="help-grid">
      <div><h4>Inside</h4><ul>
        <li><b>Reception</b>: badges, a 6ft floor logo, cube tower</li>
        <li><b>Swag Bar</b>: Exa-logo hourglass, GOAT pen holders, hoodies</li>
        <li><b>The Highlights Café</b>: Exa logo sugar cookies</li>
        <li><b>Are you exa-ordinary?</b>: best of 3 reaction tries vs. Exa's 200ms. Beat it, win a hoodie</li>
        <li><b>Live counter</b>: searches completed and URLs crawled today</li>
        <li><b>Customer wall</b>: quotes from Cognition, OpenRouter, CodeRabbit and more</li>
        <li><b>Summit MCP</b>: your agent searches talks, speakers and rooms the way Exa searches the web</li>
        <li><b>Main stage</b>: Exa-branded podium, backdrop and slides</li>
      </ul></div>
      <div><h4>Outside: after party</h4><ul>
        <li><b>Goat petting zoo</b> with a little blue barn</li>
        <li><b>Goat photo booth</b>: prints come in an Exa-logo photo holder</li>
        <li><b>The Exa-ited! bar</b>: Exa-named cocktails + zero-proof</li>
        <li>DJ, string lights, and the Bay Lights on the Bay Bridge</li>
      </ul></div>
    </div>
    <h4>Controls</h4>
    <p class="controls-line"><kbd>WASD</kbd> move · <kbd>Mouse</kbd> look · <kbd>Shift</kbd> run · <kbd>E</kbd> interact · <kbd>T</kbd> teleport · <kbd>G</kbd> guided tour · <kbd>M</kbd> sound · <kbd>Esc</kbd> pause</p>
  ` });
  body.append(h('button.btn.ghost.small', { onclick: () => { if (confirm('Reset your badge, bag, checklist and scores?')) { resetState(); cb.onReset?.(); toast('Progress reset'); } } }, 'Reset my progress'));
  openModal({ title: 'About this concept', kicker: `${EVENT.name} ${EVENT.year}`, body, wide: true });
}

// ------------------------------------------------------------------ tour caption
export function setTourCaption(title, text, step, total) {
  const el = $('#tourCaption');
  if (!title) {
    el.classList.remove('show');
    return;
  }
  el.innerHTML = `<div class="tc-step">${step} / ${total}</div><h3>${title}</h3><p>${text}</p><div class="tc-hint">Press any key or click to take control</div>`;
  el.classList.add('show');
}

// ------------------------------------------------------------------ touch controls
function buildTouch() {
  const stick = h('div.stick', {}, h('div.knob'));
  ui.append(stick);
  let moveId = null;
  let lookId = null;
  let sx = 0;
  let sy = 0;
  let lx = 0;
  let ly = 0;
  const canvas = $('#scene');
  canvas.addEventListener('touchstart', (e) => {
    for (const t of e.changedTouches) {
      if (t.clientX < innerWidth * 0.45 && moveId === null) {
        moveId = t.identifier;
        sx = t.clientX;
        sy = t.clientY;
        stick.style.left = sx - 60 + 'px';
        stick.style.top = sy - 60 + 'px';
        stick.classList.add('show');
      } else if (lookId === null) {
        lookId = t.identifier;
        lx = t.clientX;
        ly = t.clientY;
      }
    }
    if (tourActive) cb.stopTour?.();
  }, { passive: true });
  canvas.addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === moveId) {
        const dx = Math.max(-50, Math.min(50, t.clientX - sx));
        const dy = Math.max(-50, Math.min(50, t.clientY - sy));
        stick.firstChild.style.transform = `translate(${dx}px, ${dy}px)`;
        player.touchMove.x = dx / 50;
        player.touchMove.y = -dy / 50;
      } else if (t.identifier === lookId) {
        if (player.enabled) player.look(t.clientX - lx, t.clientY - ly, 0.006);
        lx = t.clientX;
        ly = t.clientY;
      }
    }
    e.preventDefault();
  }, { passive: false });
  const end = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === moveId) {
        moveId = null;
        player.touchMove.x = player.touchMove.y = 0;
        stick.classList.remove('show');
        stick.firstChild.style.transform = '';
      }
      if (t.identifier === lookId) lookId = null;
    }
  };
  canvas.addEventListener('touchend', end);
  canvas.addEventListener('touchcancel', end);
}
