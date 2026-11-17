import * as THREE from 'three';

// Late-afternoon sun, as Shack15 gets it around 6pm in summer. The model's −z is the
// bay (real north-east) and +x is toward the Bay Bridge (real south-east), so the
// western sun sits in the −x/+z quadrant, about 28° up: it rakes across the terrace
// from over the Ferry Building and drops through the skylight and the lunettes.
export const SUN_DIR = new THREE.Vector3(-0.63, 0.47, 0.62).normalize();
export const SUN_COLOR = new THREE.Color(1.0, 0.8, 0.58);
// After-party dusk: the sun has just slipped under the western horizon (same bearing).
export const DUSK_SUN_DIR = new THREE.Vector3(-0.71, -0.03, 0.7).normalize();
export const DUSK_SUN_COLOR = new THREE.Color(1.0, 0.5, 0.3);

/** Live sky state shared by the dome and the water. uDusk: 0 = afternoon, 1 = dusk. */
export const SKY_UNIFORMS = {
  uSunDir: { value: SUN_DIR },
  uDuskSunDir: { value: DUSK_SUN_DIR },
  uDusk: { value: 0 },
};

/** Analytic sky radiance shared by the dome and the water reflection. */
export const SKY_GLSL = /* glsl */ `
uniform vec3 uSunDir;
uniform vec3 uDuskSunDir;
uniform float uDusk;
float skyToward(vec3 d, vec3 sun) {
  vec2 dh = normalize(d.xz + vec2(1e-5));
  vec2 sh = normalize(sun.xz);
  return clamp(dot(dh, sh) * 0.5 + 0.5, 0.0, 1.0);
}
vec3 skyDay(vec3 d) {
  float h = max(d.y, 0.0);
  float sunAmt = clamp(dot(d, uSunDir), 0.0, 1.0);
  float toward = skyToward(d, uSunDir);
  vec3 zenith = vec3(0.13, 0.30, 0.74);
  vec3 mid = vec3(0.36, 0.58, 0.98);
  vec3 horizonCool = vec3(0.80, 0.84, 0.95);
  vec3 horizonWarm = vec3(1.35, 1.05, 0.78);
  vec3 horizon = mix(horizonCool, horizonWarm, pow(toward, 1.8));
  vec3 col = mix(horizon, mid, pow(smoothstep(0.0, 0.42, h), 0.7));
  col = mix(col, zenith, smoothstep(0.25, 1.0, h));
  // warm haze low on the far horizon, opposite the sun
  col += vec3(0.10, 0.04, 0.02) * (1.0 - toward) * (1.0 - smoothstep(0.0, 0.16, h));
  // Mie scattering around the sun
  col += vec3(1.0, 0.72, 0.42) * pow(sunAmt, 5.0) * 0.45;
  col += vec3(1.0, 0.85, 0.62) * pow(sunAmt, 40.0) * 1.3;
  return col;
}
vec3 skyDusk(vec3 d) {
  float h = max(d.y, 0.0);
  float sunAmt = clamp(dot(d, uDuskSunDir), 0.0, 1.0);
  float toward = skyToward(d, uDuskSunDir);
  vec3 zenith = vec3(0.022, 0.050, 0.170);
  vec3 mid = vec3(0.075, 0.140, 0.380);
  vec3 horizonCool = vec3(0.30, 0.25, 0.42);
  vec3 horizonWarm = vec3(1.30, 0.52, 0.22);
  vec3 horizon = mix(horizonCool, horizonWarm, pow(toward, 2.2));
  vec3 col = mix(horizon, mid, pow(smoothstep(0.0, 0.32, h), 0.8));
  col = mix(col, zenith, smoothstep(0.2, 0.95, h));
  // Belt of Venus: a pink band over the bay, opposite the sunset
  col += vec3(0.30, 0.10, 0.15) * (1.0 - toward) * smoothstep(0.015, 0.09, h) * (1.0 - smoothstep(0.09, 0.3, h));
  // afterglow where the sun went down
  col += vec3(1.0, 0.45, 0.18) * pow(sunAmt, 6.0) * 0.5;
  return col;
}
vec3 skyColor(vec3 d) {
  return mix(skyDay(d), skyDusk(d), uDusk);
}
`;

export const NOISE_GLSL = /* glsl */ `
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), f.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float a = 0.5;
  float s = 0.0;
  for (int i = 0; i < 4; i++) {
    s += a * vnoise(p);
    p = p * 2.03 + vec2(17.1, 9.2);
    a *= 0.5;
  }
  return s;
}
`;

/** Sky dome material. Pass `uniforms` to bake a fixed time of day (used for the light probes). */
export function makeSkyMaterial(uniforms = SKY_UNIFORMS) {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: true,
    fog: false,
    toneMapped: false,
    uniforms: { ...uniforms, uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position.z = gl_Position.w; // always at the far plane
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vDir;
      uniform float uTime;
      ${SKY_GLSL}
      ${NOISE_GLSL}
      void main() {
        vec3 d = normalize(vDir);
        vec3 col = skyColor(d);
        float sunDay = clamp(dot(d, uSunDir), 0.0, 1.0);
        float sunDusk = clamp(dot(d, uDuskSunDir), 0.0, 1.0);
        if (d.y > 0.0) {
          // high, thin cloud bands
          vec2 p = d.xz / (d.y + 0.12);
          float n = fbm(p * vec2(0.55, 1.5) + vec2(uTime * 0.004, 0.0));
          float n2 = fbm(p * 3.1 + 7.0);
          float dens = smoothstep(0.50, 0.84, n + n2 * 0.22) * smoothstep(0.015, 0.16, d.y) * 0.85;
          vec3 litDay = mix(vec3(1.25, 1.2, 1.18), vec3(1.9, 1.5, 1.1), pow(sunDay, 2.0));
          vec3 shadeDay = mix(vec3(0.62, 0.68, 0.82), vec3(0.95, 0.82, 0.74), pow(sunDay, 3.0));
          // at dusk the cloud undersides still catch pink and orange light
          vec3 litDusk = mix(vec3(0.52, 0.30, 0.40), vec3(1.5, 0.60, 0.30), pow(sunDusk, 1.5));
          vec3 shadeDusk = mix(vec3(0.10, 0.11, 0.22), vec3(0.42, 0.22, 0.26), pow(sunDusk, 2.0));
          float k = smoothstep(0.35, 0.95, n2 + n * 0.4);
          vec3 cloud = mix(mix(shadeDay, litDay, k), mix(shadeDusk, litDusk, k), uDusk);
          col = mix(col, cloud, dens);
          // sun disc (blooms in post), gone once it has set
          col += vec3(1.0, 0.9, 0.72) * smoothstep(0.99955, 0.99985, sunDay) * 30.0 * (1.0 - dens) * (1.0 - uDusk);
          // first stars
          vec2 sp = d.xz / (d.y + 0.25) * 70.0;
          float r = hash12(floor(sp));
          float star = step(0.986, r) * smoothstep(0.16, 0.0, length(fract(sp) - 0.5)) * (r - 0.986) * 70.0;
          col += vec3(0.85, 0.9, 1.0) * star * uDusk * smoothstep(0.3, 0.75, d.y) * (1.0 - dens);
        } else {
          vec3 low = skyColor(normalize(vec3(d.x, 0.0, d.z) + vec3(1e-4, 0.0, 0.0)));
          col = mix(low * 0.55, vec3(0.035, 0.05, 0.08) * (1.0 - 0.6 * uDusk), smoothstep(0.0, -0.25, d.y));
        }
        gl_FragColor = vec4(max(col, vec3(0.0)), 1.0);
      }`,
  });
}

/** Sky dome that follows the camera. */
export function buildSkyDome(scene, onUpdate) {
  const mat = makeSkyMaterial();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1000, 48, 24), mat);
  sky.renderOrder = 1000; // drawn after the other opaque geometry, so hidden sky pixels are never shaded
  sky.frustumCulled = false;
  sky.onBeforeRender = (r, s, cam) => {
    sky.position.setFromMatrixPosition(cam.matrixWorld);
    sky.updateMatrixWorld();
  };
  scene.add(sky);
  onUpdate((dt, t) => (mat.uniforms.uTime.value = t));
  return sky;
}

/** Prefiltered image-based lighting from the sky alone (used outdoors). dusk: 0 = afternoon, 1 = dusk. */
export function makeSkyEnvironment(renderer, dusk = 0) {
  const s = new THREE.Scene();
  const uniforms = { uSunDir: { value: SUN_DIR }, uDuskSunDir: { value: DUSK_SUN_DIR }, uDusk: { value: dusk } };
  s.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), makeSkyMaterial(uniforms)));
  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(s, 0, 0.1, 100);
  pmrem.dispose();
  return rt.texture;
}

/** Capture the lit scene from a point and prefilter it (used indoors, gives warm bounce + window reflections). */
export function captureEnvironment(renderer, scene, position) {
  const cubeRT = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
  const cam = new THREE.CubeCamera(0.1, 2500, cubeRT);
  cam.position.copy(position);
  const hidden = [];
  scene.traverse((o) => {
    if (o.isMesh && o.visible && !Array.isArray(o.material) && o.material.transparent && !o.material.isShaderMaterial) {
      o.visible = false;
      hidden.push(o);
    }
  });
  cam.update(renderer, scene);
  for (const o of hidden) o.visible = true;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromCubemap(cubeRT.texture).texture;
  pmrem.dispose();
  cubeRT.dispose();
  return tex;
}
