import './style.css';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { scene, updaters, interactables } from './core.js';
import { setMaxAnisotropy } from './world/tex.js';
import { buildBuilding, PARTITIONS, DOOR_X } from './world/building.js';
import { buildInterior } from './world/interior.js';
import { buildOutdoor, BOOTH, outdoorRefs } from './world/outdoor.js';
import { flushInstances, updatePeople, person } from './world/props.js';
import { setGoatPlayer, petNearest, nearestGoatDist, herd } from './world/goats.js';
import { staticBatch } from './game/batch.js';
import { Player } from './game/player.js';
import { initHUD, worldReady, setPrompt, updateHUD, toast, isModalOpen, isStarted, setTourActive, setTourCaption, resume } from './ui/hud.js';
import './ui/features.js';
import { actions } from './actions.js';
import { state, save, visit } from './state.js';
import { bleat } from './audio.js';
import { COLORS } from './config.js';

// ------------------------------------------------------------------ renderer
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', logarithmicDepthBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
renderer.outputColorSpace = THREE.SRGBColorSpace;
setMaxAnisotropy(Math.min(8, renderer.capabilities.getMaxAnisotropy()));

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 4000);
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ------------------------------------------------------------------ lighting
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.45;
scene.background = new THREE.Color(0x2846b8);
scene.fog = new THREE.FogExp2(0x6f78b4, 0.0011);
scene.add(new THREE.HemisphereLight(0xe6ecff, 0x7a6450, 1.15));
const sun = new THREE.DirectionalLight(0xffd2b0, 1.1);
sun.position.set(-60, 40, -30);
scene.add(sun);
const fillDir = new THREE.DirectionalLight(0xc8d4ff, 0.45);
fillDir.position.set(40, 30, 60);
scene.add(fillDir);
// soft interior fill along the hall
for (const x of [-32, -17, -2, 18, 37]) {
  const l = new THREE.PointLight(0xffe8c8, 12, 22, 1.2);
  l.position.set(x, 5.4, 0);
  scene.add(l);
}

// ------------------------------------------------------------------ player + UI
const player = new Player(camera, canvas);
player.teleport(-36, 5.5, -Math.PI / 2 - 0.15, 0.02);
setGoatPlayer(player.pos);
window.__exa = { renderer, scene, camera, player };

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
  renderer.compile(scene, camera);
  worldReady();
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
  renderer.render(scene, boothCam);
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
  { x: 22.5, z: -22.4, yaw: Math.PI, pitch: 0.1, title: 'The Exa-ited! bar', text: 'Exa-named cocktails like the Exa-ited!, Exa-ctly Right, Deep Research and the Neural Negroni, plus zero-proof options.' },
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
  const dt = Math.min(clock.getDelta(), 0.05);
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
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

build().then(() => requestAnimationFrame(loop));
