import * as THREE from 'three';
import { colliders } from '../core.js';

const EYE = 1.65;
const RADIUS = 0.32;

export class Player {
  constructor(camera, dom) {
    this.camera = camera;
    this.dom = dom;
    this.pos = new THREE.Vector3(-36, 0, 6);
    this.yaw = -Math.PI / 2;
    this.pitch = -0.05;
    this.vel = new THREE.Vector3();
    this.keys = new Set();
    this.enabled = false; // false while a modal / menu is open
    this.locked = false;
    this.dragging = false;
    this.bob = 0;
    this.touchMove = { x: 0, y: 0 };
    this.autopilot = null;
    this._bind();
  }

  _bind() {
    const isTyping = (e) => ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName);
    addEventListener('keydown', (e) => {
      if (isTyping(e)) return;
      this.keys.add(e.code);
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.dom;
    });
    addEventListener('mousemove', (e) => {
      if (!this.enabled) return;
      if (this.locked) this.look(e.movementX, e.movementY, 0.0022);
      else if (this.dragging) this.look(e.movementX, e.movementY, 0.004);
    });
    this.dom.addEventListener('mousedown', (e) => {
      if (e.button === 0 && !this.locked) this.dragging = true;
    });
    addEventListener('mouseup', () => (this.dragging = false));
  }

  look(dx, dy, s) {
    this.yaw -= dx * s;
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * s, -1.35, 1.35);
  }

  lock() {
    try {
      const p = this.dom.requestPointerLock?.();
      if (p && p.catch) p.catch(() => {});
    } catch {}
  }
  unlock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  forward(out = new THREE.Vector3()) {
    return out.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  teleport(x, z, yaw, pitch = -0.05) {
    this.pos.set(x, 0, z);
    if (yaw !== undefined) this.yaw = yaw;
    this.pitch = pitch;
    this.vel.set(0, 0, 0);
  }

  update(dt) {
    if (this.autopilot) {
      this.autopilot(dt);
      this._apply();
      return;
    }
    const k = this.keys;
    let fx = 0;
    let fz = 0;
    if (this.enabled) {
      if (k.has('KeyW') || k.has('ArrowUp')) fz += 1;
      if (k.has('KeyS') || k.has('ArrowDown')) fz -= 1;
      if (k.has('KeyA')) fx -= 1;
      if (k.has('KeyD')) fx += 1;
      if (k.has('ArrowLeft')) this.yaw += dt * 2.2;
      if (k.has('ArrowRight')) this.yaw -= dt * 2.2;
      fx += this.touchMove.x;
      fz += this.touchMove.y;
    }
    const len = Math.hypot(fx, fz);
    if (len > 1) {
      fx /= len;
      fz /= len;
    }
    const speed = k.has('ShiftLeft') || k.has('ShiftRight') ? 8.5 : 4.6;
    const f = this.forward();
    const r = new THREE.Vector3(-f.z, 0, f.x);
    const want = f.multiplyScalar(fz * speed).add(r.multiplyScalar(fx * speed));
    this.vel.lerp(want, 1 - Math.exp(-dt * 10));
    this.pos.addScaledVector(this.vel, dt);
    this.collide();
    const sp = Math.hypot(this.vel.x, this.vel.z);
    this.bob += sp * dt * 1.9;
    this._apply(sp);
  }

  _apply(sp = 0) {
    const bobY = Math.sin(this.bob * 2) * 0.035 * Math.min(1, sp / 4);
    this.camera.position.set(this.pos.x, EYE + bobY, this.pos.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }

  collide() {
    const p = this.pos;
    for (let iter = 0; iter < 2; iter++) {
      for (const c of colliders) {
        if (c.circle) {
          const dx = p.x - c.x;
          const dz = p.z - c.z;
          const d = Math.hypot(dx, dz);
          const min = c.r + RADIUS;
          if (d < min && d > 1e-5) {
            p.x = c.x + (dx / d) * min;
            p.z = c.z + (dz / d) * min;
          }
          continue;
        }
        if (p.x < c.minX - RADIUS || p.x > c.maxX + RADIUS || p.z < c.minZ - RADIUS || p.z > c.maxZ + RADIUS) continue;
        const cx = Math.max(c.minX, Math.min(p.x, c.maxX));
        const cz = Math.max(c.minZ, Math.min(p.z, c.maxZ));
        const dx = p.x - cx;
        const dz = p.z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2);
          if (d < RADIUS) {
            p.x = cx + (dx / d) * RADIUS;
            p.z = cz + (dz / d) * RADIUS;
          }
        } else {
          // center inside box: push out along smallest axis
          const pen = [
            [p.x - c.minX + RADIUS, -1, 0],
            [c.maxX - p.x + RADIUS, 1, 0],
            [p.z - c.minZ + RADIUS, 0, -1],
            [c.maxZ - p.z + RADIUS, 0, 1],
          ].sort((a, b) => a[0] - b[0])[0];
          p.x += pen[1] * pen[0];
          p.z += pen[2] * pen[0];
        }
      }
    }
  }
}
