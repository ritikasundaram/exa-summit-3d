import './style.css';
import * as THREE from 'three';
import { scene, updaters, interactables, duskFx } from './core.js';
import { setMaxAnisotropy } from './world/tex.js';
import { buildBuilding, PARTITIONS, DOOR_X, B } from './world/building.js';
import { buildInterior } from './world/interior.js';
import { buildOutdoor, BOOTH, outdoorRefs } from './world/outdoor.js';
import { flushInstances, updatePeople, person } from './world/props.js';
import { setGoatPlayer, petNearest, nearestGoatDist, herd } from './world/goats.js';
import { SUN_DIR, SUN_COLOR, DUSK_SUN_COLOR, SKY_UNIFORMS, makeSkyEnvironment, captureEnvironment } from './world/sky.js';
import { staticBatch, assignShadows } from './game/batch.js';
import { createPost, createGovernor, QUALITY } from './render/post.js';
import { Player } from './game/player.js';
import { initHUD, worldReady, setPrompt, updateHUD, toast, isModalOpen, isStarted, setTourActive, setTourCaption, resume } from './ui/hud.js';
import './ui/features.js';
import { actions } from './actions.js';
import { state, save, visit } from './state.js';
import { bleat } from './audio.js';
import { COLORS } from './config.js';

// ------------------------------------------------------------------ renderer
// Quality tier: ?q=low|medium|high pins a tier; otherwise touch devices start on "low"
// and everything else on "high". The frame-rate governor then scales the internal
// resolution (and, unless pinned, the tier) to hold ~55 fps. ?gov=0 turns it off.
const params = new URLSearchParams(location.search);
const coarse = matchMedia('(pointer: coarse)').matches;
let tier = QUALITY[params.get('q')] ? params.get('q') : coarse ? 'low' : 'high';
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, QUALITY[tier].maxDpr));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.NoToneMapping; // tone mapping happens in the post pipeline
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap; // 17 taps; PCFSoft costs 36 per pixel
renderer.shadowMap.autoUpdate = false; // every shadow caster is static: bake once
renderer.info.autoReset = false;
setMaxAnisotropy(Math.min(8, renderer.capabilities.getMaxAnisotropy()));

const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.15, 3500);
const post = createPost(renderer, tier);
post.U.exposure = 1.0;
const govern = createGovernor(post, {
  lockTier: !!QUALITY[params.get('q')],
  onTier: (t) => {
    tier = t;
    renderer.setPixelRatio(Math.min(devicePixelRatio, QUALITY[t].maxDpr));
    renderer.setSize(innerWidth, innerHeight);
    post.setSize();
    console.info(`[exa-summit] quality → ${t}`);
  },
});
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  post.setSize();
});

// ------------------------------------------------------------------ lighting
// Late afternoon: a warm western sun (shadows baked once), image-based light from the sky
// outdoors and from a captured probe indoors, plus a couple of warm practical lights.
const envOutdoor = makeSkyEnvironment(renderer, 0);
const envDusk = makeSkyEnvironment(renderer, 1);
let envIndoor = null;
scene.environment = envOutdoor;
scene.environmentIntensity = 1.0;
const FOG_DAY = new THREE.Color(0.62, 0.7, 0.86);
const FOG_DUSK = new THREE.Color(0.2, 0.19, 0.34);
scene.fog = new THREE.FogExp2(FOG_DAY.clone(), 0.00042);

const SHADOW_REGION = { minX: -47, maxX: 73, minZ: -46, maxZ: 38 };
const SUN_INTENSITY = 6.5;
const sun = new THREE.DirectionalLight(SUN_COLOR.clone(), SUN_INTENSITY);
sun.castShadow = true;
sun.shadow.mapSize.set(...QUALITY[tier].shadow);
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.045;
sun.shadow.radius = 1.6;
{
  // fit the orthographic shadow frustum around the venue as seen from the sun
  const center = new THREE.Vector3(13, 4, -8);
  sun.position.copy(center).addScaledVector(SUN_DIR, 160);
  sun.target.position.copy(center);
  sun.target.updateMatrixWorld();
  sun.updateMatrixWorld();
  const view = new THREE.Matrix4().lookAt(sun.position, center, new THREE.Vector3(0, 1, 0)).invert();
  view.multiply(new THREE.Matrix4().makeTranslation(-sun.position.x, -sun.position.y, -sun.position.z));
  const box = new THREE.Box3();
  const v = new THREE.Vector3();
  const corners = [];
  for (const x of [SHADOW_REGION.minX, SHADOW_REGION.maxX]) for (const z of [SHADOW_REGION.minZ, 13]) for (const y of [0, 12.5]) corners.push([x, y, z]);
  for (const x of [-4, 12]) for (const z of [22, 38]) for (const y of [0, 46]) corners.push([x, y, z]); // clock tower
  for (const c of corners) box.expandByPoint(v.set(...c).applyMatrix4(view));
  const cam = sun.shadow.camera;
  cam.left = box.min.x - 1;
  cam.right = box.max.x + 1;
  cam.bottom = box.min.y - 1;
  cam.top = box.max.y + 1;
  cam.near = Math.max(1, -box.max.z - 2);
  cam.far = -box.min.z + 2;
  cam.updateProjectionMatrix();
}
scene.add(sun, sun.target);
// Every extra light is paid for on every pixel, so in daylight the sun and the two
// light probes do the work; only two warm practicals remain (the pendant globes are
// the visible source, bloom sells the rest).
for (const [x, z] of [[-28, 3], [6, 3]]) {
  const l = new THREE.PointLight(0xffc890, 70, 34, 1.6);
  l.position.set(x, 4.7, z);
  scene.add(l);
}

// ------------------------------------------------------------------ player + UI
const player = new Player(camera, canvas);
player.teleport(-36, 5.5, -Math.PI / 2 - 0.15, 0.02);
setGoatPlayer(player.pos);
window.__exa = { renderer, scene, camera, player, post, sun, state, atmosphere: (p, dt) => updateAtmosphere(p, dt) };

initHUD({
  player,
  interact: () => doInteract(),
  teleport: (s) => {
    stopTour(false);
    player.teleport(s.x, s.z, s.yaw);
  },
  startTour: () => startTour(),
  stopTour: () => stopTour(true),
  onReset: () => actions.refreshKiosk?.(),
});

// ------------------------------------------------------------------ build the world (after fonts so canvas text renders correctly)
async function build() {
  try {
    await Promise.race([
      Promise.all(['400 20px Inter', '600 20px Inter', '700 20px Inter', '800 20px Inter', '600 20px "JetBrains Mono"'].map((f) => document.fonts.load(f))),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch {}
  buildBuilding();
  buildInterior();
  buildOutdoor();
  flushInstances();
  buildAvatars();
  const stats = staticBatch(scene);
  console.info(`[exa-summit] batched ${stats.merged} meshes into ${stats.calls} draw calls`);
  scene.updateMatrixWorld(true);
  assignShadows(scene, SHADOW_REGION);
  renderer.shadowMap.needsUpdate = true;
  // Indoor light probe: capture the sunlit hall once, so interior materials pick up
  // warm bounce light and reflect the windows and skylight.
  envIndoor = captureEnvironment(renderer, scene, new THREE.Vector3(-8, 3.0, 4));
  renderer.shadowMap.needsUpdate = true;
  // Compile shaders for both light sets (afternoon, and dusk with the terrace lights on)
  // now, so stepping outside never stalls on a recompile.
  for (const on of [true, false]) {
    for (const d of duskFx.lights) d.light.visible = on;
    renderer.compile(scene, camera);
  }
  worldReady();
}

const isIndoors = (p) => p.z > B.zN - 0.2 && p.z < B.zS && p.x > B.x0 && p.x < B.x1;

// ------------------------------------------------------------------ time of day
// The conference runs in afternoon light; the after party on the terrace is at dusk.
// One factor (0 = afternoon, 1 = dusk) follows the player through the terrace door and
// drives the sky, sun, fog, exposure, bloom, light probes and everything that glows.
// state.duskParty (pause menu) turns the effect off.
let duskT = 0;
const lerp = THREE.MathUtils.lerp;
function applyDusk(k, inside) {
  SKY_UNIFORMS.uDusk.value = k;
  sun.intensity = lerp(SUN_INTENSITY, 0.5, k);
  sun.color.copy(SUN_COLOR).lerp(DUSK_SUN_COLOR, k);
  scene.fog.color.copy(FOG_DAY).lerp(FOG_DUSK, k);
  scene.fog.density = lerp(0.00042, 0.0007, k);
  post.U.exposure = lerp(1.0, 1.28, k);
  post.U.bloom = lerp(0.5, 1.0, k);
  post.U.threshold = lerp(1.0, 0.75, k);
  post.U.vignette = lerp(0.22, 0.34, k);
  if (inside && envIndoor) {
    scene.environment = envIndoor;
    scene.environmentIntensity = lerp(1.3, 0.5, k);
  } else if (k < 0.5) {
    // two probes cannot be cross-faded, so dim the afternoon one to the brightness
    // of the dusk one, swap, and carry on
    scene.environment = envOutdoor;
    scene.environmentIntensity = lerp(1.0, 0.3, k * 2);
  } else {
    scene.environment = envDusk;
    scene.environmentIntensity = lerp(1.25, 1.0, k * 2 - 1);
  }
  const on = k > 0.002;
  for (const d of duskFx.lights) {
    d.light.visible = on;
    d.light.intensity = d.base * k;
  }
  for (const e of duskFx.emissive) e.material.emissiveIntensity = lerp(e.day, e.dusk, k);
  for (const c of duskFx.colors) c.material.color.copy(c.base).multiplyScalar(lerp(c.day, 1, k));
  for (const m of duskFx.opacity) m.opacity = k;
}
function updateAtmosphere(p, dt) {
  const inside = isIndoors(p);
  const want = !inside && state.duskParty !== false ? 1 : 0;
  // about three seconds door-to-dusk, eased
  duskT = want > duskT ? Math.min(want, duskT + dt / 3.2) : Math.max(want, duskT - dt / 2.2);
  applyDusk(duskT * duskT * (3 - 2 * duskT), inside);
}

// ------------------------------------------------------------------ interaction
let current = null;
const fwd = new THREE.Vector3();
function pickInteractable() {
  player.forward(fwd);
  let best = null;
  let bestScore = Infinity;
  for (const it of interactables) {
    const dx = it.pos.x - player.pos.x;
    const dz = it.pos.z - player.pos.z;
    const d = Math.hypot(dx, dz);
    if (d > it.radius) continue;
    if (it.id === 'goats' && nearestGoatDist(player.pos) > 2.8) continue;
    const facing = d < 0.01 ? 1 : (dx * fwd.x + dz * fwd.z) / d;
    if (facing < 0.25 && d > 1.6 && it.id !== 'goats') continue;
    const score = d - facing * 1.5;
    if (score < bestScore) {
      bestScore = score;
      best = it;
    }
  }
  return best;
}

function doInteract() {
  if (!isStarted() || isModalOpen()) return;
  current = pickInteractable(); // re-check now, in case we moved since the last frame
  current?.action();
}

const GOAT_NAMES = ['Pixel', 'Embedding', 'Crawler', 'Latency', 'Vector', 'Index', 'Token', 'Ranky'];
actions.petGoat = () => {
  const g = petNearest(player.pos);
  if (!g) return;
  bleat(0.9 + Math.random() * 0.3);
  state.goatsPetted++;
  save();
  if (visit('goats')) toast('✓ Checklist: <b>Pet a goat</b>', 'good');
  const name = GOAT_NAMES[herd.indexOf(g) % GOAT_NAMES.length];
  const lines = ['approves', 'leans in for more', 'is now your best friend', 'bleats in Exa blue', 'tries to eat your badge'];
  toast(`🐐 <b>${name}</b> ${lines[Math.floor(Math.random() * lines.length)]} · goats petted: ${state.goatsPetted}`);
};

// ------------------------------------------------------------------ photo booth capture
const boothCam = new THREE.PerspectiveCamera(50, 4 / 3, 0.1, 400);
let avatars = [];
function buildAvatars() {
  const plain = person(BOOTH.standX, BOOTH.standZ, 0, { shirt: 0xffffff, noCollide: true, animate: true, gesture: true });
  const hood = person(BOOTH.standX, BOOTH.standZ, 0, { shirt: COLORS.blue, shirtLogo: true, noCollide: true, animate: true, gesture: true });
  avatars = [plain, hood];
  avatars.forEach((a) => (a.visible = false));
}
actions.capturePhoto = () => {
  const av = state.wonHoodie || state.bag.hoodie ? avatars[1] : avatars[0];
  av.visible = true;
  boothCam.aspect = innerWidth / innerHeight;
  boothCam.updateProjectionMatrix();
  boothCam.position.set(BOOTH.standX - 0.2, 1.45, BOOTH.standZ + 2.7);
  boothCam.lookAt(BOOTH.standX - 0.2, 1.0, BOOTH.backdropZ);
  updateAtmosphere(boothCam.position, 0);
  post.render(scene, boothCam, 0);
  const src = renderer.domElement;
  const out = document.createElement('canvas');
  const ar = 4 / 3;
  let sw = src.width;
  let sh = src.width / ar;
  if (sh > src.height) {
    sh = src.height;
    sw = sh * ar;
  }
  out.width = 1200;
  out.height = 900;
  out.getContext('2d').drawImage(src, (src.width - sw) / 2, (src.height - sh) / 2, sw, sh, 0, 0, 1200, 900);
  av.visible = false;
  // put the new print into the 3D photo holders on the table
  const tex = outdoorRefs.printTex;
  if (tex) {
    const c = tex.userData.canvas;
    c.getContext('2d').drawImage(out, 0, 0, c.width, c.height);
    tex.needsUpdate = true;
  }
  return out;
};

// ------------------------------------------------------------------ guided tour
const TOUR = [
  { x: -31, z: 4.2, yaw: Math.PI * 0.82, pitch: 0.05, title: 'Welcome to Shack15', text: 'Exa Summit takes over Shack15 on the second floor of the Ferry Building. Reception has a blue badge desk, a 6ft floor logo, a cube tower, and a live board counting today\u2019s Exa searches and URLs crawled.' },
  { x: -31, z: 3, yaw: 0.35, pitch: 0.18, title: '13 branded arches', text: 'Shack15 allows branding on 13 window arches. Each one gets an Exa-blue arch panel. A giant Exa hourglass sits by the window as the hero piece.' },
  { x: -37.3, z: -4, yaw: Math.PI / 2, pitch: -0.22, title: 'The Swag Bar', text: 'An hourglass framed by the Exa mark, a goat-shaped pen holder (the GOAT pen holder), and Exa hoodies, which you can only win at the reaction game.' },
  { x: -16.2, z: -3.1, yaw: 0, pitch: -0.42, title: 'The Highlights Café', text: 'The food and drinks area in The Library. Tiered stands of Exa logo sugar cookies with blue icing, and a bar styled like Shack15’s bar covers.' },
  { x: -5.5, z: -5.0, yaw: 0, pitch: 0.06, title: 'Are you exa-ordinary?', text: 'A reaction test: three tries, and your best one races Exa’s 200ms search latency. Beat it and you win the hoodie in the case.' },
  { x: 2.6, z: -6.8, yaw: -Math.PI / 2, pitch: 0.06, title: 'The Summit MCP', text: 'A poster and kiosk for a conference MCP server. Your agent can search talks, speakers, rooms and the agenda the way Exa searches the web.' },
  { x: 19.5, z: -4.4, via: [[14.1, -4.4]], yaw: -Math.PI / 2, pitch: 0.05, title: 'Main stage: The Gallery', text: 'A podium with the Exa mark, a 13m backdrop, an LED wall cycling keynote slides, and a smaller workshop podium in The Sanctuary next door.' },
  { x: 40, z: 2.5, yaw: 0, pitch: 0.1, title: 'Out to the Bay Terrace', text: 'The Salon opens onto the terrace through the arched doors. The after party starts at 6pm.' },
  { x: 29, z: -19.5, yaw: -Math.PI / 4, pitch: 0.02, title: 'After party by the bay', text: 'String lights, a DJ, bistro tables, and the Bay Lights shimmering on the Bay Bridge.' },
  { x: 42.4, z: -29.8, yaw: -Math.PI / 2, pitch: -0.12, title: 'Goat petting zoo', text: 'A fenced pen with a little blue barn and very friendly goats. Some of them are wearing Exa bandanas.' },
  { x: 35.2, z: -33.5, yaw: 0.22, pitch: -0.04, title: 'Goat photo booth', text: 'Get a printed photo with the goats. Each print comes in a blue holder shaped like the Exa mark turned on its side.' },
  { x: 22.5, z: -22.4, yaw: Math.PI, pitch: 0.1, title: 'The Exa-ited! bar', text: 'Exa-named cocktails like the Exa-ited!, Exa-ctly Right, Deep Research and the Neural Negroni, plus zero-proof options. Not sure what to order? The kiosk beside it matches a cocktail to your mood.' },
  { x: 24, z: -35.5, yaw: 0, pitch: 0.12, title: 'Thanks for visiting', text: 'Take over and explore: press E at any station to try it. T teleports, G replays this tour.' },
];

let tour = null;
function routeTo(a, b) {
  const pts = [a.clone()];
  const inside = (p) => p.z > -12.2;
  const crossesPartition = (x0, x1) => PARTITIONS.some((px) => (px - x0) * (px - x1) < 0);
  const hall = 6.5;
  if (inside(a) && inside(b)) {
    if (crossesPartition(a.x, b.x) && (a.z < 3.2 || b.z < 3.2)) pts.push(new THREE.Vector3(a.x, 0, hall), new THREE.Vector3(b.x, 0, hall));
  } else if (inside(a) && !inside(b)) {
    if (crossesPartition(a.x, DOOR_X)) pts.push(new THREE.Vector3(a.x, 0, hall), new THREE.Vector3(DOOR_X, 0, hall));
    pts.push(new THREE.Vector3(DOOR_X, 0, -10), new THREE.Vector3(DOOR_X, 0, -14.5));
  } else if (!inside(a) && inside(b)) {
    pts.push(new THREE.Vector3(DOOR_X, 0, -14.5), new THREE.Vector3(DOOR_X, 0, -10));
    if (crossesPartition(DOOR_X, b.x)) pts.push(new THREE.Vector3(DOOR_X, 0, hall), new THREE.Vector3(b.x, 0, hall));
  }
  pts.push(b.clone());
  return pts;
}

function startTour() {
  if (!isStarted()) return;
  stopTour(false);
  setTourActive(true);
  player.enabled = false;
  player.unlock();
  let i = 0;
  let path = null;
  let segLen = [];
  let total = 0;
  let s = 0;
  let hold = 0;
  let startYaw = 0;
  let startPitch = 0;
  const go = (idx) => {
    i = idx;
    const st = TOUR[i];
    const stops = [...(st.via || []).map(([vx, vz]) => new THREE.Vector3(vx, 0, vz)), new THREE.Vector3(st.x, 0, st.z)];
    path = [];
    let from = player.pos.clone();
    for (const stop of stops) {
      const leg = routeTo(from, stop);
      path.push(...(path.length ? leg.slice(1) : leg));
      from = stop;
    }
    segLen = path.slice(1).map((p, k) => p.distanceTo(path[k]));
    total = segLen.reduce((a, b) => a + b, 0);
    s = 0;
    hold = 0;
    startYaw = player.yaw;
    startPitch = player.pitch;
    setTourCaption(st.title, st.text, i + 1, TOUR.length);
  };
  const posAt = (d) => {
    for (let k = 0; k < segLen.length; k++) {
      if (d <= segLen[k] || k === segLen.length - 1) return path[k].clone().lerp(path[k + 1], segLen[k] ? Math.min(1, d / segLen[k]) : 1);
      d -= segLen[k];
    }
    return path[path.length - 1].clone();
  };
  go(0);
  tour = { stop: () => {} };
  player.autopilot = (dt) => {
    const st = TOUR[i];
    if (s < total) {
      const speed = Math.min(9, 2 + total * 0.35);
      s = Math.min(total, s + speed * dt);
      const p = posAt(s);
      const ahead = posAt(Math.min(total, s + 2.5));
      player.pos.copy(p);
      const k = s / total;
      const travelYaw = ahead.distanceTo(p) > 0.05 ? Math.atan2(-(ahead.x - p.x), -(ahead.z - p.z)) : st.yaw;
      const blend = THREE.MathUtils.smoothstep(k, 0.55, 1);
      const yTravel = lerpAngle(startYaw, travelYaw, Math.min(1, k * 4));
      player.yaw = lerpAngle(yTravel, st.yaw, blend);
      player.pitch = THREE.MathUtils.lerp(startPitch, st.pitch, blend);
    } else {
      hold += dt;
      player.yaw = lerpAngle(player.yaw, st.yaw, Math.min(1, dt * 4));
      player.pitch = THREE.MathUtils.lerp(player.pitch, st.pitch, Math.min(1, dt * 4));
      if (hold > 6.5) {
        if (i < TOUR.length - 1) go(i + 1);
        else stopTour(true);
      }
    }
  };
}

function stopTour(resumeControl) {
  if (!player.autopilot) return;
  player.autopilot = null;
  tour = null;
  setTourActive(false);
  setTourCaption(null);
  if (resumeControl) {
    resume();
    toast('You have control. WASD to move, E to interact.');
  }
}

function lerpAngle(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

// ------------------------------------------------------------------ loop
const clock = new THREE.Clock();
let frame = 0;
function loop() {
  const rawDt = clock.getDelta();
  const dt = Math.min(rawDt, 0.05);
  const t = clock.elapsedTime;
  for (const fn of updaters) fn(dt, t);
  updatePeople(t);
  if (!isStarted() && !player.autopilot) {
    player.yaw = -Math.PI / 2 - 0.15 + Math.sin(t * 0.15) * 0.25;
  }
  player.update(dt);
  if (isStarted() && !isModalOpen() && !player.autopilot) {
    current = pickInteractable();
    setPrompt(current ? current.label : '');
  } else setPrompt('');
  if (frame++ % 2 === 0) updateHUD(player.pos, player.yaw);
  updateAtmosphere(player.pos, dt);
  renderer.info.reset();
  post.render(scene, camera, t);
  if (params.get('gov') !== '0') govern(rawDt);
  requestAnimationFrame(loop);
}

build().then(() => requestAnimationFrame(loop));
