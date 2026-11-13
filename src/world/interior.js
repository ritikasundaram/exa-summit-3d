import * as THREE from 'three';
import { scene, addCollider, addColliderC, addColliderCircle, addInteractable, addSpot, onUpdate, v3 } from '../core.js';
import { M, box, cyl, blobShadow } from './mat.js';
import { logoMesh } from './logo.js';
import { textPlane, canvasTexture } from './tex.js';
import { G } from './graphics.js';
import { B } from './building.js';
import { chair, stool, roundTable, longTable, plant, couch, coffeeTable, podium, person, cluster, hourglass, goatPenHolder, hoodie, cookie, stanchion } from './props.js';
import { act, actions } from '../actions.js';
import { leaderboard } from '../state.js';
import { QUOTES } from '../data/agenda.js';
import { COLORS } from '../config.js';

const PI = Math.PI;
const spin = [];

/** Place a canvas-textured panel against a wall. facing: '+x','-x','+z','-z' */
function wallGraphic(w, h, draw, x, y, z, facing, o = {}) {
  const m = textPlane(w, h, draw, { pxPerM: o.px ?? 180, emissive: o.emissive ?? 0.12, max: o.max ?? 2048 });
  m.position.set(x, y, z);
  m.rotation.y = { '+z': 0, '-z': PI, '+x': PI / 2, '-x': -PI / 2 }[facing];
  scene.add(m);
  return m;
}

export function buildInterior() {
  buildLounge();
  buildCafe();
  buildGameZone();
  buildSanctuary();
  buildGallery();
  buildSalon();
  buildCorridor();
  buildLiveWall();
  onUpdate((dt, t) => {
    for (const s of spin) s.rotation.y += dt * 0.5;
  });
}

// ---------------------------------------------------------------- Lounge + Reception
function buildLounge() {
  // Reception desk
  const desk = new THREE.Group();
  desk.add(box(4.2, 1.05, 0.8, M.blue, 0, 0.525, 0));
  desk.add(box(4.4, 0.05, 1.0, M.white, 0, 1.075, 0.05));
  const dl = logoMesh(0.6, 0.04, M.white);
  dl.position.set(0, 0.55, -0.42);
  dl.rotation.y = PI;
  desk.add(dl);
  // badge printer + tablets
  desk.add(box(0.4, 0.25, 0.35, M.white, -1.2, 1.22, 0.1));
  desk.add(box(0.3, 0.02, 0.22, M.screen, 0.9, 1.12, -0.1));
  desk.add(box(0.3, 0.02, 0.22, M.screen, -0.3, 1.12, -0.1));
  desk.add(blobShadow(5, 1.6));
  desk.position.set(-34, 0, 9.4);
  scene.add(desk);
  addColliderC(-34, 9.4, 4.4, 1);
  person(-35, 10.5, PI, { shirt: COLORS.blue, shirtLogo: true, noCollide: true });
  person(-33, 10.5, PI, { shirt: 0xffffff, shirtLogo: true, noCollide: true, gesture: true });
  addInteractable({ id: 'badge', pos: v3(-34, 1, 8.2), radius: 2.6, label: 'Pick up your badge', action: act('badge') });

  // Welcome banner hanging over reception (double-sided)
  const banner = wallGraphic(6, 1.2, G.welcomeBanner, -34, 4.6, 8.2, '-z', { emissive: 0.2 });
  const banner2 = banner.clone();
  banner2.rotation.y = 0;
  banner2.position.z = 8.21;
  scene.add(banner2);
  for (const dx of [-2.8, 2.8]) {
    const wire = cyl(0.005, 0.005, 1.8, M.darkMetal, 4);
    wire.position.set(-34 + dx, 6.1, 8.2);
    scene.add(wire);
  }

  // 6ft floor graphic
  const fl = textPlane(2.6, 2.6, G.floorLogo, { pxPerM: 300, transparent: true });
  fl.rotation.x = -PI / 2;
  fl.position.set(-34, 0.025, 4.6);
  scene.add(fl);

  // Cube tower (from the deck's "cube tower" activation)
  const ct = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const mats = [0, 1, 2, 3, 4, 5].map((f) => {
      const t = canvasTexture(256, 256, G.cubeFace(i + f));
      return new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 });
    });
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), mats);
    c.position.y = 0.35 + i * 0.7;
    c.rotation.y = i * 0.35;
    ct.add(c);
  }
  ct.add(blobShadow(1.4));
  ct.position.set(-28.6, 0, 9.6);
  scene.add(ct);
  addColliderC(-28.6, 9.6, 0.9, 0.9);

  // Retractable banners
  [-38.3, -29.8].forEach((x, i) => {
    const g = new THREE.Group();
    const front = textPlane(0.85, 2.1, G.rollup(i), { pxPerM: 300 });
    front.position.set(0, 1.15, 0.012);
    const back = textPlane(0.85, 2.1, G.rollup(1 - i), { pxPerM: 300 });
    back.position.set(0, 1.15, -0.012);
    back.rotation.y = PI;
    const pole = box(0.02, 2.1, 0.02, M.metal, 0, 1.15, 0);
    g.add(front, back, pole, box(0.95, 0.1, 0.25, M.metal, 0, 0.05, 0));
    g.position.set(x, 0, 6.6);
    scene.add(g);
  });

  // ---- Swag bar on the west wall ----
  wallGraphic(9, 3.6, G.swagWall, B.x0 + 0.03, 2.6, -4, '+x', { emissive: 0.18 });
  longTable(-40.3, -4, 1.0, 6.4, { cloth: M.white });
  // table runner
  const runner = box(0.5, 0.005, 6.4, M.blue, -40.3, 0.762, -4);
  scene.add(runner);
  // hourglasses
  for (const [z, s] of [[-6.6, 0.32], [-6.0, 0.26], [-5.4, 0.32]]) {
    const hg = hourglass(s);
    hg.position.set(-40.3, 0.762, z);
    hg.rotation.y = PI / 2;
    scene.add(hg);
  }
  // goat pen holders
  for (const [z, c] of [[-4.4, COLORS.blue], [-3.8, 0xffffff], [-3.2, COLORS.blue]]) {
    const gp = goatPenHolder(0.55, new THREE.MeshStandardMaterial({ color: c, roughness: 0.4 }));
    gp.position.set(-40.3, 0.762, z);
    gp.rotation.y = PI / 2 + 0.4;
    scene.add(gp);
  }
  // folded hoodies + one on a form
  for (const z of [-2.6, -2.05]) {
    scene.add(box(0.42, 0.09, 0.4, M.blue, -40.3, 0.81, z));
    const l = logoMesh(0.12, 0.01, M.white);
    l.rotation.x = -PI / 2;
    l.position.set(-40.3, 0.857, z);
    scene.add(l);
  }
  const hf = hoodie(1, COLORS.blue, { stand: 0.3 });
  hf.position.set(-40.3, 0.765 + 0.3, -1.3);
  hf.rotation.y = PI / 2;
  scene.add(hf);
  person(-41.3, -5, PI / 2, { shirt: COLORS.blue, shirtLogo: true, noCollide: true });
  addInteractable({ id: 'swag', pos: v3(-39.4, 1, -4), radius: 3, label: 'Browse the Swag Bar', action: act('swag') });

  // Hero installation: giant Exa hourglass on a plinth by the window
  const plinth = box(1.6, 0.5, 1.2, M.white, -36.2, 0.25, -8.6);
  scene.add(plinth, blobShadow(2.4, 2).translateX(-36.2).translateZ(-8.6));
  const big = hourglass(1.6);
  big.position.set(-36.2, 0.5, -8.6);
  scene.add(big);
  big.userData.dynamic = true;
  spin.push(big);
  addColliderC(-36.2, -8.6, 1.6, 1.2);
  const cap = wallGraphic(1.2, 0.35, G.tentCard('Hourglass', 'Every grain of sand is one search'), -36.2, 0.25, -7.99, '+z', { px: 400 });
  cap.scale.setScalar(0.9);

  // Lounge seating
  couch(-30.5, -9.4, 0);
  couch(-30.5, -5.6, PI);
  coffeeTable(-30.5, -7.5);
  couch(-25.6, -3.2, -PI / 2, { w: 2, mat: M.fabricTan });
  plant(-41, -10.8, { tall: true, size: 1.1 });
  plant(-24, -10.8, { tall: true });
  plant(-41, 2.5);
  plant(-19.4, 11);

  cluster(-31, 2, 3, 0.75);
  cluster(-26, 5.8, 2, 0.6);
  cluster(-37.3, 1.2, 2, 0.6);

  addSpot('Reception', -34, 5.2, PI, 'Conference');
  addSpot('Swag Bar', -37.2, -4, PI / 2, 'Conference');
  addSpot('Live counter + customer wall', -23.5, 6.5, PI, 'Conference');
}

// ---------------------------------------------------------------- Library: Highlights Café
function buildCafe() {
  const px = -23 + 0.14;
  wallGraphic(10, 4.2, G.cafeWall, px, 2.15, -6, '+x', { emissive: 0.15 });
  // Three counters in the Shack15 bar-cover style: one coffee & water desk,
  // two desks where the Exa team runs live product demos.
  const desks = [
    { z: -9.2, kind: 'coffee', front: G.deskFront('Coffee & water', 'Espresso · drip · still & sparkling', 'coffee') },
    { z: -6.1, kind: 'search', front: G.deskFront('Live demo', 'Exa Search API', 'search') },
    { z: -3.0, kind: 'websets', front: G.deskFront('Live demo', 'Websets', 'websets') },
  ];
  for (const d of desks) {
    const g = new THREE.Group();
    g.add(box(0.8, 1.05, 2.7, M.wood, 0, 0.525, 0));
    g.add(box(0.9, 0.06, 2.8, M.woodDark, 0, 1.08, 0));
    const panel = textPlane(2.4, 0.85, d.front, { pxPerM: 260, emissive: 0.2 });
    panel.rotation.y = PI / 2;
    panel.position.set(0.41, 0.53, 0);
    g.add(panel);
    g.position.set(-20.6, 0, d.z);
    scene.add(g);
  }
  addCollider(-21.05, -10.6, -20.15, -1.6);

  // --- Coffee & water desk
  const em = new THREE.Group();
  em.add(box(0.7, 0.5, 0.45, M.metal, 0, 0.25, 0));
  em.add(box(0.72, 0.06, 0.47, M.blue, 0, 0.53, 0));
  for (const dx of [-0.15, 0.15]) {
    const spout = cyl(0.02, 0.02, 0.08, M.darkMetal, 8);
    spout.position.set(dx, 0.14, 0.2);
    em.add(spout);
  }
  em.position.set(-20.75, 1.11, -10.05);
  em.rotation.y = PI / 2;
  scene.add(em);
  const grinder = cyl(0.08, 0.1, 0.38, M.black, 14);
  grinder.position.set(-20.85, 1.3, -9.55);
  scene.add(grinder);
  for (let i = 0; i < 10; i++) {
    const c = cyl(0.04, 0.035, 0.1, i % 2 ? M.white : M.blue, 10);
    c.position.set(-20.45 + (i % 2) * 0.1, 1.16 + Math.floor(i / 4) * 0.0, -9.35 + Math.floor(i / 2) * 0.09);
    scene.add(c);
  }
  const waterMat = new THREE.MeshPhysicalMaterial({ color: 0x9fc4ff, transparent: true, opacity: 0.55, roughness: 0.05 });
  for (const [z, label] of [[-8.8, 0], [-8.35, 1]]) {
    const jug = cyl(0.12, 0.12, 0.42, M.clearGlass, 22);
    jug.position.set(-20.7, 1.32, z);
    const water = cyl(0.11, 0.11, label ? 0.26 : 0.32, waterMat, 22);
    water.position.set(-20.7, 1.13 + (label ? 0.13 : 0.16), z);
    const lid = cyl(0.125, 0.125, 0.02, M.darkMetal, 22);
    lid.position.set(-20.7, 1.54, z);
    const tap = box(0.06, 0.03, 0.03, M.metal, -20.56, 1.16, z);
    const base = cyl(0.14, 0.14, 0.04, M.darkMetal, 22);
    base.position.set(-20.7, 1.13, z);
    scene.add(jug, water, lid, tap, base);
    // floating citrus slices in the sparkling one
    if (label) for (let k = 0; k < 3; k++) {
      const slice = cyl(0.035, 0.035, 0.008, new THREE.MeshStandardMaterial({ color: 0xffd34d }), 12);
      slice.position.set(-20.7 + (k - 1) * 0.04, 1.3 + k * 0.03, z + (k - 1) * 0.03);
      slice.rotation.x = 0.6 * k;
      scene.add(slice);
    }
  }
  const jar = cyl(0.13, 0.13, 0.3, M.clearGlass, 20);
  jar.position.set(-20.7, 1.26, -7.95);
  scene.add(jar);
  for (let k = 0; k < 5; k++) cookie(-20.7 + (Math.random() - 0.5) * 0.1, 1.13 + k * 0.035, -7.95 + (Math.random() - 0.5) * 0.1, Math.random() * 6, 0.1, k % 2 === 0);
  person(-21.9, -9.4, PI / 2, { shirt: 0x1c1f2a, noCollide: true, badge: false });
  addInteractable({ id: 'coffee', pos: v3(-19.3, 1, -9.2), radius: 2.2, label: 'Get coffee or water', action: act('cafe') });

  // --- Demo desks: monitor facing visitors, presenter laptop, Exa staff + visitors
  const demoScreens = [];
  for (const d of desks.filter((x) => x.kind !== 'coffee')) {
    const mon = new THREE.Group();
    mon.add(box(0.05, 0.64, 1.06, M.black, 0, 0.0, 0));
    const scr = textPlane(1.0, 0.58, G.demoScreen(d.kind, 99), { pxPerM: 700, emissive: 0.95 });
    scr.rotation.y = PI / 2;
    scr.position.x = 0.03;
    mon.add(scr);
    const neck = box(0.04, 0.3, 0.06, M.darkMetal, -0.04, -0.42, 0);
    const foot = box(0.22, 0.02, 0.3, M.darkMetal, -0.04, -0.57, 0);
    mon.add(neck, foot);
    mon.position.set(-20.55, 1.68, d.z + 0.35);
    scene.add(mon);
    demoScreens.push({ kind: d.kind, tex: scr.userData.texture });
    // presenter laptop (screen faces the presenter, -x)
    const lap = new THREE.Group();
    lap.add(box(0.3, 0.015, 0.38, M.metal, 0, 0, 0));
    const lid = box(0.015, 0.25, 0.38, M.metal, -0.15, 0.12, 0);
    lid.rotation.z = -0.25;
    lap.add(lid);
    lap.position.set(-20.75, 1.12, d.z - 0.65);
    scene.add(lap);
    // Exa presenter + two visitors
    person(-21.9, d.z - 0.2, PI / 2, { shirt: COLORS.blue, shirtLogo: true, noCollide: true, badge: false, gesture: true });
    person(-19.3, d.z + 0.75, -PI / 2 - 0.25, { holdDrink: 'clear' });
    person(-19.25, d.z - 0.85, -PI / 2 + 0.3, {});
    addInteractable({ id: 'demo-' + d.kind, pos: v3(-19.4, 1, d.z), radius: 2.3, label: d.kind === 'search' ? 'Watch a live demo: Exa Search API' : 'Watch a live demo: Websets', action: act('demo', d.kind) });
  }
  // animate the demo monitors (typing query, results arriving, rows enriching)
  let demoStep = 0;
  let demoAcc = 0;
  onUpdate((dt) => {
    demoAcc += dt;
    if (demoAcc < 0.6) return;
    demoAcc = 0;
    demoStep = (demoStep + 1) % 16;
    for (const ds of demoScreens) {
      const c = ds.tex.userData.canvas;
      const st = ds.kind === 'search' ? demoStep : Math.max(0, demoStep - 3);
      G.demoScreen(ds.kind, st)(c.getContext('2d'), c.width, c.height);
      ds.tex.needsUpdate = true;
    }
  });

  // Cookie island: tiered stands of Exa logo cookies
  longTable(-16.2, -5.6, 3.4, 1.3, { cloth: M.white });
  scene.add(box(3.4, 0.006, 0.4, M.blue, -16.2, 0.765, -5.6));
  const stands = [[-17.4, 0.0], [-16.2, 0.15], [-15.0, 0.0]];
  for (const [x, extra] of stands) {
    const tiers = [[0.42, 0.79], [0.3, 1.05 + extra]];
    const pole = cyl(0.015, 0.015, 0.35 + extra, M.gold, 6);
    pole.position.set(x, 0.95 + extra / 2, -5.6);
    scene.add(pole);
    for (const [r, y] of tiers) {
      const plate = cyl(r, r * 0.95, 0.02, M.white, 28);
      plate.position.set(x, y, -5.6);
      scene.add(plate);
      const n = Math.round(r * 30);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * PI * 2;
        const rr = r * (i % 2 ? 0.45 : 0.75);
        cookie(x + Math.cos(a) * rr, y + 0.012, -5.6 + Math.sin(a) * rr, a + PI / 2, 0.11, i % 3 === 0);
      }
    }
  }
  // trays
  for (const x of [-17.9, -14.5]) {
    const tray = box(0.5, 0.02, 0.35, M.blue, x, 0.77, -5.1);
    scene.add(tray);
    for (let i = 0; i < 6; i++) cookie(x - 0.16 + (i % 3) * 0.16, 0.785, -5.18 + Math.floor(i / 3) * 0.16, 0.2 * i, 0.12, i % 2 === 1);
  }
  const tent = textPlane(0.5, 0.22, G.tentCard('Exa cookies', 'Logo sugar cookies. Take one (or three).'), { pxPerM: 900 });
  tent.position.set(-16.2, 0.9, -4.93);
  tent.rotation.x = -0.25;
  scene.add(tent);
  addInteractable({ id: 'cookies', pos: v3(-16.2, 1, -4.4), radius: 2.6, label: 'Grab an Exa cookie & see the café menu', action: act('cafe') });

  // Drinks fridge
  const fridge = new THREE.Group();
  fridge.add(box(1.3, 2.1, 0.7, M.white, 0, 1.05, 0));
  const glassFront = box(1.15, 1.8, 0.02, new THREE.MeshStandardMaterial({ color: 0xbfd0ff, emissive: 0x7f9bff, emissiveIntensity: 0.6, roughness: 0.2 }), 0, 1.15, -0.36);
  fridge.add(glassFront);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) {
    const can = cyl(0.04, 0.04, 0.13, c % 2 ? M.blue : M.white, 8);
    can.position.set(-0.45 + c * 0.18, 0.5 + r * 0.42, -0.25);
    fridge.add(can);
  }
  fridge.position.set(-11.6, 0, -9.8);
  fridge.rotation.y = PI / 2;
  scene.add(fridge);
  addColliderC(-11.6, -9.8, 0.8, 1.4);

  // café tables
  for (const [x, z] of [[-19.8, -10.3], [-14.2, -10.3], [-18.5, 0.5], [-14, 0.8]]) {
    roundTable(x, z, { r: 0.4, h: 1.05, top: M.wood });
    stool(x + 0.55, z);
    stool(x - 0.55, z);
  }
  cluster(-18.4, -1.6, 3, 0.7, { drinks: true });
  cluster(-13.4, -2.5, 2, 0.6, { drinks: true });
  plant(-12, 2.4);
  addSpot('The Highlights Café', -16.2, -1.4, 0, 'Conference');
}

// ---------------------------------------------------------------- Kilden · Finstua: game + MCP
function buildGameZone() {
  // Arcade kiosk
  const k = new THREE.Group();
  k.add(box(3.2, 2.9, 0.8, M.blue, 0, 1.45, 0));
  k.add(box(3.3, 0.08, 0.9, M.white, 0, 2.94, 0));
  const board = leaderboard();
  const screen = textPlane(2.6, 1.46, G.kioskScreen(board), { pxPerM: 400, emissive: 0.9 });
  screen.position.set(0, 1.95, 0.41);
  k.add(screen);
  const marquee = textPlane(3.2, 0.5, G.marquee, { pxPerM: 400, emissive: 0.8 });
  marquee.position.set(0, 3.3, 0.1);
  k.add(marquee);
  k.add(box(3.2, 0.06, 0.06, M.whiteGlow, 0, 3.02, 0.42));
  // console with big button
  k.add(box(1.6, 0.95, 0.6, M.white, 0, 0.475, 0.75));
  const btnBase = cyl(0.22, 0.24, 0.06, M.darkMetal, 28);
  btnBase.position.set(0, 0.98, 0.75);
  const btn = cyl(0.17, 0.17, 0.08, M.blueGlow.clone(), 28);
  btn.position.set(0, 1.03, 0.75);
  k.add(btnBase, btn);
  const lg = logoMesh(0.5, 0.03, M.blue);
  lg.position.set(0, 0.48, 1.06);
  k.add(lg, blobShadow(4, 2.4));
  k.position.set(-5.5, 0, -9.6);
  scene.add(k);
  addColliderC(-5.5, -9.4, 3.3, 1.8);
  actions.refreshKiosk = () => {
    const t = screen.userData.texture;
    const c = t.userData.canvas;
    G.kioskScreen(leaderboard())(c.getContext('2d'), c.width, c.height);
    t.needsUpdate = true;
  };
  onUpdate((dt, t) => {
    btn.material.emissiveIntensity = 0.5 + Math.sin(t * 4) * 0.4;
  });
  addInteractable({ id: 'reaction', pos: v3(-5.5, 1, -7.6), radius: 2.8, label: 'Play "Are you exa-ordinary?"', action: act('reaction') });

  // Prize case with hoodie
  const pc = new THREE.Group();
  pc.add(box(0.9, 1.0, 0.9, M.white, 0, 0.5, 0));
  const glass = box(0.86, 1.2, 0.86, M.clearGlass, 0, 1.6, 0);
  pc.add(glass);
  const h = hoodie(0.85, COLORS.blue, { stand: 0.12 });
  h.position.y = 1.0 + 0.12 * 0.85;
  pc.add(h);
  h.userData.dynamic = true;
  spin.push(h);
  const ps = textPlane(0.86, 0.5, G.prizeSign, { pxPerM: 400, emissive: 0.2 });
  ps.position.set(0, 0.6, 0.451);
  pc.add(ps, blobShadow(1.4));
  pc.position.set(-1.6, 0, -9.4);
  scene.add(pc);
  addColliderC(-1.6, -9.4, 0.95, 0.95);

  // queue line
  for (let i = 0; i < 4; i++) stanchion(-7.2, -6.6 + i * 1.3);
  person(-6.2, -5.4, PI, { gesture: true });
  person(-6.3, -4.4, PI, {});
  person(-6.1, -3.5, PI + 0.4, { holdDrink: 'clear' });
  // floor start line
  const line = box(2.4, 0.01, 0.12, M.white, -5.5, 0.01, -7.1);
  scene.add(line);

  // Agenda wall on the west partition (faces +x)
  wallGraphic(6, 3.2, G.agendaBoard, -11 + 0.14, 2.2, -6, '+x', { emissive: 0.18, px: 320, max: 2048 });
  addInteractable({ id: 'agenda', pos: v3(-9.6, 1, -6), radius: 2.6, label: 'Read the agenda', action: act('agenda') });

  // MCP poster on the east partition (faces −x) + kiosk
  wallGraphic(5.4, 3.6, G.mcpPoster, 7 - 0.14, 2.3, -6.8, '-x', { emissive: 0.2, px: 360, max: 2048 });
  const mk = new THREE.Group();
  const stand = cyl(0.05, 0.05, 1.05, M.darkMetal, 8);
  stand.position.y = 0.52;
  const top = box(0.7, 0.04, 0.5, M.white, 0, 1.06, 0);
  const lid = box(0.5, 0.33, 0.02, M.screen, 0, 1.24, -0.18);
  lid.rotation.x = -0.25;
  const lidScreen = textPlane(0.46, 0.29, (ctx, w, hh) => {
    ctx.fillStyle = '#0b1036';
    ctx.fillRect(0, 0, w, hh);
    ctx.fillStyle = '#7CFFB2';
    ctx.font = `600 ${hh * 0.09}px "JetBrains Mono", monospace`;
    ctx.fillText('> ask exa-summit', w * 0.06, hh * 0.25);
    ctx.fillStyle = '#fff';
    ctx.fillText('  "talks about evals?"', w * 0.06, hh * 0.42);
    ctx.fillStyle = '#9fb0ff';
    ctx.fillText('  3 results · 187ms', w * 0.06, hh * 0.6);
  }, { pxPerM: 1200, emissive: 0.9 });
  lidScreen.position.set(0, 1.245, -0.168);
  lidScreen.rotation.x = -0.25;
  const base = cyl(0.25, 0.25, 0.03, M.darkMetal, 18);
  mk.add(stand, top, lid, lidScreen, base, blobShadow(0.8));
  mk.position.set(5.1, 0, -6.8);
  mk.rotation.y = -PI / 2;
  scene.add(mk);
  addColliderCircle(5.1, -6.8, 0.4);
  addInteractable({ id: 'mcp', pos: v3(4.4, 1, -6.8), radius: 2.6, label: 'Try the Summit MCP', action: act('mcp') });
  person(4.6, -8.3, -PI / 2 - 0.5, { gesture: true });

  cluster(-1, -3, 3, 0.8, { drinks: true });
  cluster(3, 0.5, 2, 0.6);
  plant(-10.4, -11);
  plant(6.4, -11, { tall: true });
  addSpot('Are you exa-ordinary?', -5.5, -4.8, 0, 'Conference');
  addSpot('Summit MCP + agenda', 1.2, -6.8, -PI / 2, 'Conference');
}

// ---------------------------------------------------------------- Sanctuary: workshop
function buildSanctuary() {
  wallGraphic(5.2, 2.6, G.workshopBackdrop, 10, 1.6, B.zN + 0.35, '+z', { emissive: 0.15 });
  scene.add(box(5.6, 0.25, 2.4, M.black, 10, 0.125, -10.4));
  addCollider(7.2, -11.8, 12.8, -9.2);
  podium(11.4, -9.9, 0, 0.25);
  person(11.4, -10.6, 0, { y: 0.25, gesture: true, shirt: COLORS.blue, shirtLogo: true, noCollide: true });
  const scr = textPlane(1.6, 0.9, G.slide(3), { pxPerM: 500, emissive: 0.8 });
  scr.position.set(8.6, 1.7, -10.6);
  scene.add(scr);
  const st = cyl(0.03, 0.03, 1.25, M.darkMetal, 6);
  st.position.set(8.6, 0.85, -10.62);
  scene.add(st);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 6; c++) {
      const x = 7.9 + c * 0.75;
      const z = -7.8 + r * 0.95;
      chair(x, z, PI);
      if ((r * 6 + c) % 3 !== 1) person(x, z + 0.12, PI, { seated: true, noCollide: true, animate: false });
    }
  }
  addCollider(7.5, -8.2, 12.4, -4.6);
  addSpot('Workshop: The Sanctuary', 10, -3, PI, 'Conference');
}

// ---------------------------------------------------------------- Gallery: main stage
function buildGallery() {
  const sx0 = 26.2;
  const stageH = 0.6;
  // stage deck
  scene.add(box(30.85 - sx0, stageH, 13, M.black, (sx0 + 30.85) / 2, stageH / 2, -4.5));
  scene.add(box(0.04, 0.06, 13, M.blueGlow, sx0 - 0.02, stageH - 0.05, -4.5));
  addCollider(sx0, -11.5, 30.9, 2);
  // steps with branded risers
  for (let i = 0; i < 2; i++) {
    const st = box(0.35, 0.3 * (i + 1), 1.2, M.black, sx0 - 0.35 * (2 - i) + 0.175, 0.15 * (i + 1), 1.3);
    scene.add(st);
  }
  // backdrop on the partition (faces −x)
  wallGraphic(12.6, 4.2, G.stageBackdrop, 31 - 0.14, 2.6, -4.7, '-x', { emissive: 0.25, px: 160, max: 2048 });
  // LED screen with rotating slides
  const slides = [0, 1, 2, 3].map((i) => canvasTexture(1280, 720, G.slide(i)));
  const scrMat = new THREE.MeshStandardMaterial({ map: slides[0], emissive: 0xffffff, emissiveMap: slides[0], emissiveIntensity: 0.85 });
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.6), scrMat);
  scr.position.set(30.6, 2.5, -4.5);
  scr.rotation.y = -PI / 2;
  scene.add(scr);
  scene.add(box(0.08, 2.76, 4.76, M.black, 30.66, 2.5, -4.5));
  let si = 0;
  setInterval(() => {
    si = (si + 1) % slides.length;
    scrMat.map = slides[si];
    scrMat.emissiveMap = slides[si];
  }, 6000);

  // Podium with the Exa mark (faces the audience, −x)
  podium(27.4, -8.6, -PI / 2, stageH);
  person(28.05, -8.6, -PI / 2, { y: stageH, gesture: true, shirt: 0x0d1330, noCollide: true });
  // fireside chairs
  for (const z of [0, -1.4]) {
    const a = couch(28.4, z, -PI / 2, { w: 0.95, mat: M.fabricCream });
    a.position.y = stageH;
  }
  const ct = coffeeTable(28.6, -0.7, 0.3);
  ct.position.y = stageH;
  plant(30.2, 1.4, { collide: false });
  plant(30.2, -10.4, { collide: false });

  // Lighting truss + spots
  const truss = box(0.25, 0.25, 13, M.darkMetal, 24.8, 5.6, -4.5);
  scene.add(truss);
  for (let z = -10; z <= 1; z += 1.6) {
    const can = cyl(0.1, 0.13, 0.3, M.black, 10);
    can.position.set(24.8, 5.35, z);
    can.rotation.z = -0.8;
    scene.add(can);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.09, 12), new THREE.MeshBasicMaterial({ color: z % 3 ? 0xffffff : 0x8ea0ff }));
    lens.position.set(24.92, 5.24, z);
    lens.rotation.set(0, PI / 2, 0.8);
    scene.add(lens);
  }
  for (const z of [-8, -1.5]) {
    const sl = new THREE.SpotLight(0xffffff, 60, 14, 0.55, 0.6, 1.5);
    sl.position.set(24.8, 5.3, z);
    sl.target.position.set(28.5, 1.2, z - 0.8);
    scene.add(sl, sl.target);
  }

  // Audience: rows facing the stage (+x)
  for (let r = 0; r < 9; r++) {
    const x = 15 + r * 1.05;
    for (let zi = 0; zi < 20; zi++) {
      const z = -10.6 + zi * 0.6;
      if (z > -5.05 && z < -3.85) continue; // center aisle
      chair(x, z, PI / 2);
      const seed = (r * 31 + zi * 17) % 10;
      if (seed < 4 && r < 7) person(x - 0.12, z, PI / 2, { seated: true, noCollide: true, shirtLogo: seed === 0, animate: false });
    }
  }
  addCollider(14.6, -10.95, 23.8, -5.1);
  addCollider(14.6, -3.8, 23.8, 1.3);
  // camera riser
  const cam = new THREE.Group();
  cam.add(box(1.2, 0.4, 1.4, M.black, 0, 0.2, 0));
  const tri = cyl(0.02, 0.02, 1.2, M.darkMetal, 6);
  tri.position.y = 1;
  cam.add(tri, box(0.4, 0.25, 0.25, M.black, 0.05, 1.7, 0));
  cam.position.set(14.0, 0, -10.9);
  scene.add(cam);
  addColliderC(14.0, -10.9, 1.2, 1.4);
  person(14.0, -9.9, PI / 2, { noCollide: true });

  addInteractable({ id: 'stage', pos: v3(24.5, 1, -4.4), radius: 3.2, label: 'Watch the keynote · see what’s on stage', action: act('stage') });
  addSpot('Main stage: The Gallery', 21, -4.4, -PI / 2, 'Conference');
}

// ---------------------------------------------------------------- Salon
function buildSalon() {
  wallGraphic(10, 3.4, G.salonBackdrop, B.x1 - 0.03, 2.3, -3.5, '-x', { emissive: 0.15 });
  couch(36.5, -1.5, PI / 2);
  couch(39.8, -1.5, -PI / 2);
  coffeeTable(38.15, -1.5);
  couch(38, 6.2, PI, { mat: M.fabricTan });
  coffeeTable(38, 4.6, 0.35);
  plant(43, -10.8, { tall: true, size: 1.1 });
  plant(32, -10.8, { tall: true });
  plant(43, 10.8);
  // rug
  const rug = new THREE.Mesh(new THREE.CircleGeometry(2.6, 40), new THREE.MeshStandardMaterial({ color: 0xe8e4da, roughness: 1 }));
  rug.rotation.x = -PI / 2;
  rug.position.set(38.15, 0.025, -1.5);
  scene.add(rug);
  // door sign + floor arrows
  wallGraphic(3.6, 0.7, G.doorSign, 40, 5.8, B.zN + 0.24, '+z', { emissive: 0.5, px: 300 });
  for (let i = 0; i < 4; i++) {
    const a = textPlane(0.6, 0.6, (ctx, w, h) => {
      ctx.fillStyle = '#2141EA';
      ctx.beginPath();
      ctx.moveTo(w * 0.5, h * 0.1);
      ctx.lineTo(w * 0.9, h * 0.55);
      ctx.lineTo(w * 0.65, h * 0.55);
      ctx.lineTo(w * 0.65, h * 0.9);
      ctx.lineTo(w * 0.35, h * 0.9);
      ctx.lineTo(w * 0.35, h * 0.55);
      ctx.lineTo(w * 0.1, h * 0.55);
      ctx.fill();
    }, { pxPerM: 200, transparent: true });
    a.rotation.x = -PI / 2;
    a.position.set(40, 0.03, 5 - i * 2.6);
    scene.add(a);
  }
  cluster(34.5, 3, 3, 0.7, { drinks: true });
  addSpot('The Salon', 37.5, 8, PI, 'Conference');
}

// ---------------------------------------------------------------- Corridor banners
function buildCorridor() {
  [-29, -17, -4, 10, 22, 36].forEach((x, i) => {
    for (const side of [1, -1]) {
      const b = textPlane(1.2, 3, G.corridorBanner(i + (side < 0 ? 1 : 0)), { pxPerM: 220, emissive: 0.2 });
      b.position.set(x + side * 0.01, 4.6, 7.6);
      b.rotation.y = (side * PI) / 2;
      scene.add(b);
    }
    const rod = cyl(0.02, 0.02, 1.3, M.darkMetal, 6);
    rod.rotation.x = PI / 2;
    rod.position.set(x, 6.12, 7.6);
    rod.rotation.set(PI / 2, 0, 0);
    rod.rotation.y = 0;
    scene.add(rod);
  });
  // a few people walking the hallway
  cluster(-8, 7.5, 3, 0.8, { drinks: true });
  cluster(17, 8, 2, 0.6);
  cluster(28, 6.5, 3, 0.7);
  person(-20, 9.5, 0.4, {});
  person(2, 9.8, -0.8, { shirt: COLORS.blue, shirtLogo: true });
}

// ---------------------------------------------------------------- Live counter + customer quotes (south wall)
// Rates are modeled on the live counter on exa.ai (~51.5M searches and ~2.58B URLs
// crawled by mid-afternoon Pacific), extrapolated from midnight Pacific time.
const SEARCHES_PER_SEC = 961;
const URLS_PER_SEC = 48050;
function secondsSinceMidnightPT() {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hourCycle: 'h23', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(new Date());
    const get = (t) => +parts.find((p) => p.type === t).value;
    return get('hour') * 3600 + get('minute') * 60 + get('second') + (Date.now() % 1000) / 1000;
  } catch {
    const d = new Date();
    return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
  }
}
export function liveCounts() {
  const s = secondsSinceMidnightPT();
  return { searches: Math.floor(s * SEARCHES_PER_SEC), urls: Math.floor(s * URLS_PER_SEC) };
}

function buildLiveWall() {
  const zWall = B.zS - B.t / 2;
  // counter board, visible from reception looking down the hall
  const frame = box(6.7, 2.15, 0.06, M.darkMetal, -23.5, 2.5, zWall - 0.03);
  scene.add(frame);
  const c0 = liveCounts();
  const board = wallGraphic(6.4, 1.9, G.liveCounter(c0.searches, c0.urls, 0), -23.5, 2.5, zWall - 0.07, '-z', { emissive: 0.9, px: 320, max: 2048 });
  const tex = board.userData.texture;
  const cv = tex.userData.canvas;
  const ctx = cv.getContext('2d');
  let acc = 0;
  onUpdate((dt, t) => {
    acc += dt;
    if (acc < 0.2) return;
    acc = 0;
    const c = liveCounts();
    G.liveCounter(c.searches, c.urls, t)(ctx, cv.width, cv.height);
    tex.needsUpdate = true;
  });
  // customer quote wall
  const xs = [-14.5, -5.5, 3, 16, 25.5, 37.5];
  QUOTES.forEach((qt, i) => {
    const x = xs[i];
    scene.add(box(2.95, 1.9, 0.05, M.darkMetal, x, 2.3, zWall - 0.025));
    wallGraphic(2.8, 1.75, G.quoteCard(qt), x, 2.3, zWall - 0.06, '-z', { emissive: 0.35, px: 320 });
  });
}
