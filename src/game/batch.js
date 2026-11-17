import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const isDynamic = (obj) => {
  for (let p = obj; p; p = p.parent) if (p.userData?.dynamic) return true;
  return false;
};
const flagged = (obj, key) => {
  for (let p = obj; p; p = p.parent) if (p.userData?.[key]) return true;
  return false;
};

/**
 * Merge every static mesh that shares a material into one draw call.
 * Anything under an Object3D with userData.dynamic is left alone. Transparent
 * materials are only merged when they opt in with material.userData.batch
 * (contact-shadow blobs: coplanar, so draw order between them does not matter).
 */
export function staticBatch(root) {
  root.updateMatrixWorld(true);
  const buckets = new Map();
  const remove = [];
  root.traverse((obj) => {
    if (!obj.isMesh || obj.isInstancedMesh) return;
    if (isDynamic(obj)) return;
    const m = obj.material;
    if (Array.isArray(m)) return;
    const optIn = m.userData?.batch === true;
    if (!optIn && (m.transparent || obj.renderOrder !== 0)) return;
    if (!(m.isMeshStandardMaterial || m.isMeshBasicMaterial)) return;
    const g = obj.geometry;
    if (!g.attributes.position || !g.attributes.normal || !g.attributes.uv) return;
    if (obj.matrixWorld.determinant() < 0) return;
    let ng = g.index ? g.toNonIndexed() : g.clone();
    for (const k of Object.keys(ng.attributes)) if (!['position', 'normal', 'uv'].includes(k)) ng.deleteAttribute(k);
    ng.morphAttributes = {};
    ng.clearGroups();
    ng.applyMatrix4(obj.matrixWorld);
    const key = obj.renderOrder + ':' + m.uuid;
    if (!buckets.has(key)) buckets.set(key, { mat: m, order: obj.renderOrder, geos: [] });
    buckets.get(key).geos.push(ng);
    remove.push(obj);
  });
  for (const o of remove) o.parent?.remove(o);
  let calls = 0;
  for (const { mat, order, geos } of buckets.values()) {
    // chunk to keep individual buffers reasonable
    for (let i = 0; i < geos.length; i += 400) {
      const merged = mergeGeometries(geos.slice(i, i + 400), false);
      if (!merged) continue;
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, mat);
      mesh.matrixAutoUpdate = false;
      mesh.renderOrder = order;
      root.add(mesh);
      calls++;
    }
    for (const g of geos) g.dispose();
  }
  return { merged: remove.length, calls };
}

/**
 * Decide who casts and receives sun shadows. The shadow map is rendered once
 * (everything that casts is static), so it costs nothing per frame.
 * Opt out with material.userData.noCast or object.userData.noCast.
 */
export function assignShadows(root, region) {
  const c = new THREE.Vector3();
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    const lit = mats.some((m) => m.isMeshStandardMaterial || m.isMeshPhysicalMaterial);
    obj.receiveShadow = lit;
    let cast = lit && !mats.some((m) => m.transparent || m.userData?.noCast) && !flagged(obj, 'noCast');
    if (cast) {
      if (!obj.geometry.boundingSphere) obj.geometry.computeBoundingSphere();
      c.copy(obj.geometry.boundingSphere.center).applyMatrix4(obj.matrixWorld);
      const r = obj.geometry.boundingSphere.radius;
      // far scenery (bridge, hills, skyline) never shadows the venue
      if (c.x + r < region.minX || c.x - r > region.maxX || c.z + r < region.minZ || c.z - r > region.maxZ) cast = false;
    }
    obj.castShadow = cast;
  });
}
