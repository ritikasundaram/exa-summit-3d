import * as THREE from 'three';

// Shared singletons for the world modules.
export const scene = new THREE.Scene();

/** Per-frame callbacks: fn(dt, t) */
export const updaters = [];
export const onUpdate = (fn) => updaters.push(fn);

/** Axis-aligned collision boxes in XZ. */
export const colliders = [];
export function addCollider(minX, minZ, maxX, maxZ) {
  colliders.push({ minX: Math.min(minX, maxX), minZ: Math.min(minZ, maxZ), maxX: Math.max(minX, maxX), maxZ: Math.max(minZ, maxZ) });
}
/** Collider centered at (x,z) with size (w,d) */
export function addColliderC(x, z, w, d) {
  addCollider(x - w / 2, z - d / 2, x + w / 2, z + d / 2);
}
export function addColliderCircle(x, z, r) {
  colliders.push({ circle: true, x, z, r });
}

/** Interactable stations. */
export const interactables = [];
/**
 * @param {object} o { id, pos: Vector3, radius, label, action(), visit?: string }
 */
export function addInteractable(o) {
  interactables.push({ radius: 3, ...o });
}

/** Named zones for minimap + HUD. */
export const zones = [];
export function addZone(name, minX, minZ, maxX, maxZ, color = '#2141EA') {
  zones.push({ name, minX, minZ, maxX, maxZ, color });
}

/** Teleport destinations */
export const spots = [];
export function addSpot(name, x, z, yaw, group = 'Conference') {
  spots.push({ name, x, z, yaw, group });
}

export const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

/**
 * Things that differ between the afternoon and the after-party dusk. main.js blends
 * them with one 0..1 factor as the player steps out onto the terrace.
 */
export const duskFx = { lights: [], emissive: [], colors: [], opacity: [] };
/** A light that only exists at dusk (hidden by day so it costs nothing per pixel). */
export function duskLight(light) {
  duskFx.lights.push({ light, base: light.intensity });
  light.visible = false;
  return light;
}
/** Emissive material whose glow goes from `day` to `dusk` intensity. */
export function duskEmissive(material, day, dusk) {
  duskFx.emissive.push({ material, day, dusk });
  material.emissiveIntensity = day;
  return material;
}
/** Unlit (basic) material whose colour is scaled from `day` to 1 at dusk: lamps switching on. */
export function duskColor(material, day) {
  duskFx.colors.push({ material, base: material.color.clone(), day });
  material.color.multiplyScalar(day);
  return material;
}
/** Material that fades in at dusk. */
export function duskOpacity(material) {
  duskFx.opacity.push(material);
  material.transparent = true;
  material.opacity = 0;
  return material;
}
