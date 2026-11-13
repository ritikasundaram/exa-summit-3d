import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Merge every static, opaque mesh that shares a material into one draw call.
 * Anything under an Object3D with userData.dynamic is left alone.
 */
export function staticBatch(root) {
  root.updateMatrixWorld(true);
  const buckets = new Map();
  const remove = [];
  root.traverse((obj) => {
    if (!obj.isMesh || obj.isInstancedMesh) return;
    for (let p = obj; p; p = p.parent) if (p.userData?.dynamic) return;
    const m = obj.material;
    if (Array.isArray(m) || m.transparent || obj.renderOrder !== 0) return;
    if (!(m.isMeshStandardMaterial || m.isMeshBasicMaterial)) return;
    const g = obj.geometry;
    if (!g.attributes.position || !g.attributes.normal || !g.attributes.uv) return;
    if (obj.matrixWorld.determinant() < 0) return;
    let ng = g.index ? g.toNonIndexed() : g.clone();
    for (const k of Object.keys(ng.attributes)) if (!['position', 'normal', 'uv'].includes(k)) ng.deleteAttribute(k);
    ng.morphAttributes = {};
    ng.clearGroups();
    ng.applyMatrix4(obj.matrixWorld);
    if (!buckets.has(m)) buckets.set(m, []);
    buckets.get(m).push(ng);
    remove.push(obj);
  });
  for (const o of remove) o.parent?.remove(o);
  let calls = 0;
  for (const [mat, geos] of buckets) {
    // chunk to keep individual buffers reasonable
    for (let i = 0; i < geos.length; i += 400) {
      const merged = mergeGeometries(geos.slice(i, i + 400), false);
      if (!merged) continue;
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, mat);
      mesh.matrixAutoUpdate = false;
      root.add(mesh);
      calls++;
    }
  }
  return { merged: remove.length, calls };
}
