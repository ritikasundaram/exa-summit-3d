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
