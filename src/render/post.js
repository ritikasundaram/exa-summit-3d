import * as THREE from 'three';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';

/**
 * Compact HDR pipeline:
 *   scene → half-float MSAA target (+ depth)
 *   depth → half-res ambient occlusion → depth-aware blur
 *   scene → bloom mip chain (downsample / tent upsample)
 *   composite: AO, bloom, vignette, AgX tone map, grade, grain → canvas
 * Internal resolution is scaled independently of the canvas so the frame-rate
 * governor can trade pixels for speed without touching layout.
 */

export const QUALITY = {
  high: { samples: 4, ao: 12, bloomLevels: 5, maxDpr: 1.5, shadow: [4096, 2048] },
  medium: { samples: 2, ao: 8, bloomLevels: 5, maxDpr: 1.5, shadow: [4096, 2048] },
  low: { samples: 2, ao: 0, bloomLevels: 4, maxDpr: 1.5, shadow: [2048, 1024] },
};

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const AO_FRAG = /* glsl */ `
  varying vec2 vUv;
  uniform sampler2D tDepth;
  uniform vec2 uTexel;     // 1 / AO target size
  uniform vec2 uInvProj;   // 1 / P[0][0], 1 / P[1][1]
  uniform vec2 uProj;      // P[0][0], P[1][1]
  uniform float uNear, uFar, uRadius, uIntensity;
  float viewZ(vec2 uv) {
    float d = texture2D(tDepth, uv).x;
    return (uNear * uFar) / ((uFar - uNear) * d - uFar);
  }
  vec3 viewPos(vec2 uv) {
    float z = viewZ(uv);
    vec2 ndc = uv * 2.0 - 1.0;
    return vec3(ndc * uInvProj * -z, z);
  }
  float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
  void main() {
    float d0 = texture2D(tDepth, vUv).x;
    if (d0 >= 0.99999) { gl_FragColor = vec4(1.0); return; }
    vec3 P = viewPos(vUv);
    if (P.z < -70.0) { gl_FragColor = vec4(1.0); return; }
    vec3 Pr = viewPos(vUv + vec2(uTexel.x, 0.0));
    vec3 Pl = viewPos(vUv - vec2(uTexel.x, 0.0));
    vec3 Pu = viewPos(vUv + vec2(0.0, uTexel.y));
    vec3 Pd = viewPos(vUv - vec2(0.0, uTexel.y));
    vec3 dx = abs(Pr.z - P.z) < abs(P.z - Pl.z) ? Pr - P : P - Pl;
    vec3 dy = abs(Pu.z - P.z) < abs(P.z - Pd.z) ? Pu - P : P - Pd;
    vec3 N = normalize(cross(dx, dy));
    float rot = ign(gl_FragCoord.xy) * 6.2831853;
    vec2 rUv = uRadius * uProj * 0.5 / -P.z;
    rUv = min(rUv, vec2(0.12));
    float r2 = uRadius * uRadius;
    float bias = 0.012 + 0.0025 * -P.z;
    float sum = 0.0;
    for (int i = 0; i < AO_SAMPLES; i++) {
      float a = (float(i) + 0.5) / float(AO_SAMPLES);
      float ang = a * 6.2831853 * 2.61 + rot;
      vec2 suv = vUv + vec2(cos(ang), sin(ang)) * rUv * sqrt(a);
      vec3 v = viewPos(suv) - P;
      float vv = dot(v, v);
      float vn = dot(v, N);
      float f = max(r2 - vv, 0.0);
      sum += f * f * f * max((vn - bias) / (vv + 0.001), 0.0);
    }
    float ao = max(0.0, 1.0 - sum * uIntensity * 5.0 / (r2 * r2 * r2 * float(AO_SAMPLES)));
    ao = mix(ao, 1.0, smoothstep(45.0, 70.0, -P.z));
    gl_FragColor = vec4(ao, ao, ao, 1.0);
  }
`;

const AO_BLUR_FRAG = /* glsl */ `
  varying vec2 vUv;
  uniform sampler2D tAO, tDepth;
  uniform vec2 uDir;
  uniform float uNear, uFar;
  float viewZ(vec2 uv) {
    float d = texture2D(tDepth, uv).x;
    return (uNear * uFar) / ((uFar - uNear) * d - uFar);
  }
  void main() {
    float z0 = viewZ(vUv);
    float sum = 0.0;
    float wsum = 0.0;
    for (int i = -3; i <= 3; i++) {
      vec2 uv = vUv + uDir * float(i);
      float w = exp(-float(i * i) / 8.0) * max(0.0, 1.0 - abs(viewZ(uv) - z0) / (0.06 * -z0 + 0.02));
      sum += texture2D(tAO, uv).r * w;
      wsum += w;
    }
    gl_FragColor = vec4(vec3(wsum > 0.0 ? sum / wsum : 1.0), 1.0);
  }
`;

const DOWN_FRAG = /* glsl */ `
  varying vec2 vUv;
  uniform sampler2D tMap;
  uniform vec2 uTexel;
  uniform float uThreshold;
  vec3 pre(vec3 c) {
    #ifdef PREFILTER
      if (any(isnan(c)) || any(isinf(c))) c = vec3(0.0);
      c = min(c, vec3(60.0));
      float br = max(c.r, max(c.g, c.b));
      float knee = uThreshold * 0.5;
      float soft = clamp(br - uThreshold + knee, 0.0, 2.0 * knee);
      soft = soft * soft / (4.0 * knee + 1e-4);
      c *= max(soft, br - uThreshold) / max(br, 1e-4);
    #endif
    return c;
  }
  void main() {
    vec2 t = uTexel;
    vec3 a = pre(texture2D(tMap, vUv + t * vec2(-2.0, 2.0)).rgb);
    vec3 b = pre(texture2D(tMap, vUv + t * vec2(0.0, 2.0)).rgb);
    vec3 c = pre(texture2D(tMap, vUv + t * vec2(2.0, 2.0)).rgb);
    vec3 d = pre(texture2D(tMap, vUv + t * vec2(-2.0, 0.0)).rgb);
    vec3 e = pre(texture2D(tMap, vUv).rgb);
    vec3 f = pre(texture2D(tMap, vUv + t * vec2(2.0, 0.0)).rgb);
    vec3 g = pre(texture2D(tMap, vUv + t * vec2(-2.0, -2.0)).rgb);
    vec3 h = pre(texture2D(tMap, vUv + t * vec2(0.0, -2.0)).rgb);
    vec3 i = pre(texture2D(tMap, vUv + t * vec2(2.0, -2.0)).rgb);
    vec3 j = pre(texture2D(tMap, vUv + t * vec2(-1.0, 1.0)).rgb);
    vec3 k = pre(texture2D(tMap, vUv + t * vec2(1.0, 1.0)).rgb);
    vec3 l = pre(texture2D(tMap, vUv + t * vec2(-1.0, -1.0)).rgb);
    vec3 m = pre(texture2D(tMap, vUv + t * vec2(1.0, -1.0)).rgb);
    vec3 col = e * 0.125 + (a + c + g + i) * 0.03125 + (b + d + f + h) * 0.0625 + (j + k + l + m) * 0.125;
    gl_FragColor = vec4(col, 1.0);
  }
`;

const UP_FRAG = /* glsl */ `
  varying vec2 vUv;
  uniform sampler2D tMap;
  uniform vec2 uTexel;
  void main() {
    vec2 t = uTexel;
    vec3 c = texture2D(tMap, vUv).rgb * 4.0;
    c += (texture2D(tMap, vUv + vec2(t.x, 0.0)).rgb + texture2D(tMap, vUv - vec2(t.x, 0.0)).rgb + texture2D(tMap, vUv + vec2(0.0, t.y)).rgb + texture2D(tMap, vUv - vec2(0.0, t.y)).rgb) * 2.0;
    c += texture2D(tMap, vUv + t).rgb + texture2D(tMap, vUv - t).rgb + texture2D(tMap, vUv + vec2(t.x, -t.y)).rgb + texture2D(tMap, vUv + vec2(-t.x, t.y)).rgb;
    gl_FragColor = vec4(c / 16.0, 1.0);
  }
`;

const FINAL_FRAG = /* glsl */ `
  varying vec2 vUv;
  uniform sampler2D tScene, tAO, tBloom;
  uniform float uAO, uBloom, uVignette, uGrain, uTime, uSaturation, uContrast;
  #include <tonemapping_pars_fragment>
  float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  void main() {
    vec3 col = texture2D(tScene, vUv).rgb;
    if (any(isnan(col))) col = vec3(0.0);
    col = min(col, vec3(4000.0));
    #ifdef USE_AO
      float ao = texture2D(tAO, vUv).r;
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      ao = mix(ao, 1.0, smoothstep(0.7, 2.6, l)); // lit screens and lamps are not occluded
      col *= mix(1.0, ao, uAO);
    #endif
    col += texture2D(tBloom, vUv).rgb * uBloom;
    vec2 q = (vUv - 0.5) * vec2(1.0, 0.82);
    col *= 1.0 - uVignette * smoothstep(0.32, 0.92, length(q) * 1.45);
    col = AgXToneMapping(col);
    float g = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col = mix(vec3(g), col, uSaturation);
    col = clamp(col, 0.0, 1.0);
    // gentle S-curve in display space
    vec3 s = pow(col, vec3(1.0 / 2.2));
    s = mix(s, s * s * (3.0 - 2.0 * s), uContrast);
    s += (hash(gl_FragCoord.xy + fract(uTime) * 91.7) - 0.5) * uGrain;
    gl_FragColor = vec4(s, 1.0);
  }
`;

const pass = (frag, uniforms, defines = {}) =>
  new FullScreenQuad(new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms, defines, depthTest: false, depthWrite: false, toneMapped: false }));

export function createPost(renderer, qualityName = 'high') {
  let q = QUALITY[qualityName];
  let name = qualityName;
  let scale = 1;
  let W = 2;
  let H = 2;
  let sceneRT = null;
  let aoA = null;
  let aoB = null;
  let mips = [];

  const U = {
    exposure: 1.0,
    bloom: 0.5,
    threshold: 1.0,
    ao: 0.85,
    aoRadius: 0.7,
    vignette: 0.22,
    grain: 0.022,
    saturation: 1.14,
    contrast: 0.32,
  };

  let aoPass = null;
  const blurPass = pass(AO_BLUR_FRAG, { tAO: { value: null }, tDepth: { value: null }, uDir: { value: new THREE.Vector2() }, uNear: { value: 0.1 }, uFar: { value: 1000 } });
  const prePass = pass(DOWN_FRAG, { tMap: { value: null }, uTexel: { value: new THREE.Vector2() }, uThreshold: { value: 1 } }, { PREFILTER: 1 });
  const downPass = pass(DOWN_FRAG, { tMap: { value: null }, uTexel: { value: new THREE.Vector2() }, uThreshold: { value: 1 } });
  const upPass = pass(UP_FRAG, { tMap: { value: null }, uTexel: { value: new THREE.Vector2() } });
  upPass.material.blending = THREE.AdditiveBlending;
  upPass.material.transparent = true;
  let finalPass = null;

  function buildPasses() {
    aoPass?.dispose();
    finalPass?.dispose();
    aoPass = q.ao
      ? pass(
          AO_FRAG,
          {
            tDepth: { value: null },
            uTexel: { value: new THREE.Vector2() },
            uInvProj: { value: new THREE.Vector2() },
            uProj: { value: new THREE.Vector2() },
            uNear: { value: 0.1 },
            uFar: { value: 1000 },
            uRadius: { value: 0.7 },
            uIntensity: { value: 1 },
          },
          { AO_SAMPLES: q.ao },
        )
      : null;
    finalPass = pass(
      FINAL_FRAG,
      {
        tScene: { value: null },
        tAO: { value: null },
        tBloom: { value: null },
        toneMappingExposure: { value: 1 },
        uAO: { value: 1 },
        uBloom: { value: 0 },
        uVignette: { value: 0 },
        uGrain: { value: 0 },
        uTime: { value: 0 },
        uSaturation: { value: 1 },
        uContrast: { value: 0 },
      },
      q.ao ? { USE_AO: 1 } : {},
    );
  }

  function allocate() {
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    W = Math.max(2, Math.round(size.x * scale));
    H = Math.max(2, Math.round(size.y * scale));
    sceneRT?.depthTexture?.dispose();
    sceneRT?.dispose();
    aoA?.dispose();
    aoB?.dispose();
    mips.forEach((m) => m.dispose());
    const depthTexture = new THREE.DepthTexture(W, H);
    depthTexture.type = THREE.UnsignedIntType;
    depthTexture.minFilter = depthTexture.magFilter = THREE.NearestFilter;
    sceneRT = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: q.samples, depthTexture, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
    const aw = Math.max(1, W >> 1);
    const ah = Math.max(1, H >> 1);
    const aoOpts = { type: THREE.UnsignedByteType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
    aoA = q.ao ? new THREE.WebGLRenderTarget(aw, ah, aoOpts) : null;
    aoB = q.ao ? new THREE.WebGLRenderTarget(aw, ah, aoOpts) : null;
    mips = [];
    let mw = W;
    let mh = H;
    for (let i = 0; i < q.bloomLevels; i++) {
      mw = Math.max(1, mw >> 1);
      mh = Math.max(1, mh >> 1);
      mips.push(new THREE.WebGLRenderTarget(mw, mh, { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter }));
    }
  }

  buildPasses();
  allocate();

  const api = {
    U,
    get quality() {
      return name;
    },
    get scale() {
      return scale;
    },
    get size() {
      return [W, H];
    },
    setSize() {
      allocate();
    },
    setScale(s) {
      s = Math.min(1, Math.max(0.5, s));
      if (Math.abs(s - scale) < 0.01) return;
      scale = s;
      allocate();
    },
    setQuality(n) {
      if (!QUALITY[n] || n === name) return;
      name = n;
      q = QUALITY[n];
      buildPasses();
      allocate();
    },
    /** Render the frame. target = null draws to the canvas. */
    render(scene, camera, time = 0) {
      const prevTarget = renderer.getRenderTarget();
      renderer.setRenderTarget(sceneRT);
      renderer.render(scene, camera);

      const near = camera.near;
      const far = camera.far;
      const pe = camera.projectionMatrix.elements;
      if (aoPass) {
        const u = aoPass.material.uniforms;
        u.tDepth.value = sceneRT.depthTexture;
        u.uTexel.value.set(1 / aoA.width, 1 / aoA.height);
        u.uProj.value.set(pe[0], pe[5]);
        u.uInvProj.value.set(1 / pe[0], 1 / pe[5]);
        u.uNear.value = near;
        u.uFar.value = far;
        u.uRadius.value = U.aoRadius;
        renderer.setRenderTarget(aoA);
        aoPass.render(renderer);
        const b = blurPass.material.uniforms;
        b.tDepth.value = sceneRT.depthTexture;
        b.uNear.value = near;
        b.uFar.value = far;
        b.tAO.value = aoA.texture;
        b.uDir.value.set(1 / aoA.width, 0);
        renderer.setRenderTarget(aoB);
        blurPass.render(renderer);
        b.tAO.value = aoB.texture;
        b.uDir.value.set(0, 1 / aoA.height);
        renderer.setRenderTarget(aoA);
        blurPass.render(renderer);
      }

      // bloom: prefilter + downsample chain, then tent upsample back up
      let src = sceneRT;
      for (let i = 0; i < mips.length; i++) {
        const p = i === 0 ? prePass : downPass;
        const u = p.material.uniforms;
        u.tMap.value = src.texture;
        u.uTexel.value.set(1 / src.width, 1 / src.height);
        u.uThreshold.value = U.threshold;
        renderer.setRenderTarget(mips[i]);
        p.render(renderer);
        src = mips[i];
      }
      const autoClear = renderer.autoClear;
      renderer.autoClear = false;
      for (let i = mips.length - 1; i > 0; i--) {
        const u = upPass.material.uniforms;
        u.tMap.value = mips[i].texture;
        u.uTexel.value.set(1 / mips[i].width, 1 / mips[i].height);
        renderer.setRenderTarget(mips[i - 1]);
        upPass.render(renderer);
      }
      renderer.autoClear = autoClear;

      const f = finalPass.material.uniforms;
      f.tScene.value = sceneRT.texture;
      f.tAO.value = aoA ? aoA.texture : null;
      f.tBloom.value = mips[0].texture;
      f.toneMappingExposure.value = U.exposure;
      f.uAO.value = U.ao;
      f.uBloom.value = U.bloom / mips.length;
      f.uVignette.value = U.vignette;
      f.uGrain.value = U.grain;
      f.uTime.value = time;
      f.uSaturation.value = U.saturation;
      f.uContrast.value = U.contrast;
      renderer.setRenderTarget(null);
      finalPass.render(renderer);
      renderer.setRenderTarget(prevTarget);
    },
  };
  return api;
}

/**
 * Frame-rate governor: lowers the internal resolution (then the quality tier) when
 * frames run long, and cautiously raises it again when there is headroom.
 */
export function createGovernor(post, { target = 1000 / 55, onTier, lockTier = false } = {}) {
  const order = ['high', 'medium', 'low'];
  let acc = 0;
  let n = 0;
  let cooldown = 5; // let shader compiles and texture uploads settle first
  let slow = 0;
  let raiseWait = 8;
  let sinceRaise = 0;
  return (dt) => {
    // a hidden or throttled tab reports huge frame gaps: that is not a slow GPU
    if (document.hidden || dt > 0.2) {
      acc = 0;
      n = 0;
      return;
    }
    cooldown -= dt;
    if (cooldown > 0) return;
    acc += dt;
    n++;
    if (acc < 1.5 || n < 12) return;
    const ms = (acc / n) * 1000;
    acc = 0;
    n = 0;
    sinceRaise += 1.5;
    if (ms > target * 1.18) {
      if (++slow < 2) return; // one bad window can be a hiccup
      slow = 0;
      if (post.scale > 0.72) post.setScale(post.scale * 0.88);
      else {
        const i = order.indexOf(post.quality);
        if (!lockTier && i < order.length - 1) {
          post.setQuality(order[i + 1]);
          onTier?.(order[i + 1]);
          post.setScale(0.85);
        } else post.setScale(post.scale * 0.9);
      }
      cooldown = 1;
      raiseWait = Math.min(60, raiseWait * 1.6); // a failed raise makes the next one rarer
      sinceRaise = 0;
    } else {
      slow = 0;
      if (ms < target * 0.98 && post.scale < 1 && sinceRaise > raiseWait) {
        post.setScale(post.scale * 1.1);
        cooldown = 1;
        sinceRaise = 0;
      }
    }
  };
}
