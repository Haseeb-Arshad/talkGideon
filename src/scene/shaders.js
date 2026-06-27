// Holographic point material.
//
// The face is a cloud of glowing points. We draw it twice with this material:
//   - a big, soft, dim "halo" layer  → diffuse bloom-like glow (no post-fx needed)
//   - a small, crisp, bright "core" layer → the nodes themselves
//
// Round, soft points are computed in the fragment shader from gl_PointCoord, so
// there's no texture to load and it runs on plain WebGL (incl. older mobile).
//
// What sells the hologram, all in-shader (no post-processing):
//   - uReveal   : on wake she "materialises" — points fly in from scattered
//                 light and resolve into the face.
//   - scan sweep: a bright band travels up the face, like a projector refresh.
//   - flicker   : subtle global instability + rare per-point dropouts.
//   - uTalk     : the lower face / jaw drops and the mouth glows as she speaks.

import { ShaderMaterial, AdditiveBlending, Color } from 'three'

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uTalk;
  uniform float uMouthY;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uReveal;     // 0 = scattered light, 1 = fully formed
  uniform float uScanY;      // current height of the scan sweep (object space)
  varying float vBand;
  varying float vSeed;
  varying float vScan;
  varying float vTwinkle;

  // cheap hash → per-point stable randomness
  float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

  void main() {
    vec3 p = position;
    float seed = hash(position.xy + position.zz);
    vSeed = seed;

    // --- Talking: lower-face points drop as the "jaw" opens, and the mouth
    // region glows. The drop eases in over a soft band below the mouth line.
    float below = smoothstep(0.30, 0.0, uMouthY - p.y) * step(p.y, uMouthY + 0.02);
    p.y -= uTalk * 0.16 * below;

    // --- Materialise: while uReveal < 1, scatter each point outward along a
    // per-point random direction so she assembles out of drifting light.
    float r = 1.0 - uReveal;
    if (r > 0.0001) {
      vec3 dir = normalize(vec3(seed - 0.5, hash(position.zx) - 0.5, hash(position.yx) - 0.5) + 0.0001);
      float scatter = r * r * (1.2 + seed * 1.8);
      p += dir * scatter;
    }

    // --- Holographic interference bands climbing the face.
    vBand = 0.5 + 0.5 * sin(p.y * 6.0 - uTime * 1.4);

    // --- Scan sweep: a soft band of light passing vertically.
    vScan = exp(-pow((position.y - uScanY) * 4.5, 2.0));

    // --- Rare per-point twinkle/dropout (hologram instability).
    vTwinkle = 0.85 + 0.15 * sin(uTime * 7.0 + seed * 60.0);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float grow = 1.0 + vScan * 0.6 + uTalk * 0.25 * below;
    gl_PointSize = uSize * uPixelRatio * grow * (1.0 / -mv.z) * (0.4 + 0.6 * uReveal);
    gl_Position = projectionMatrix * mv;
  }
`

const fragmentShader = /* glsl */ `
  precision mediump float;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uTime;
  uniform float uTalk;
  uniform float uAlpha;
  uniform float uCore;
  uniform float uReveal;
  uniform float uFlicker;    // global brightness flicker, ~0.9..1.0
  varying float vBand;
  varying float vSeed;
  varying float vScan;
  varying float vTwinkle;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float soft = smoothstep(0.5, 0.0, d);
    soft = pow(soft, uCore);

    float tw = 0.65 + 0.35 * sin(uTime * 3.0 + vSeed * 40.0);
    vec3 col = mix(uColorA, uColorB, vBand);
    col += uColorB * uTalk * 0.5;          // mouth/voice warmth
    col += uColorB * vScan * 0.9;          // scan-line brightening
    col = mix(col, vec3(1.0), vScan * 0.25);

    float a = soft * (0.55 + 0.45 * tw) * uAlpha;
    a *= uFlicker * vTwinkle;              // hologram instability
    a *= 0.25 + 0.75 * uReveal;           // fade in while materialising
    a += soft * vScan * 0.35 * uAlpha;    // extra punch on the sweep
    gl_FragColor = vec4(col, a);
  }
`

function uniforms(extra) {
  return {
    uTime: { value: 0 },
    uTalk: { value: 0 },
    uMouthY: { value: -0.18 },
    uSize: { value: 6 },
    uPixelRatio: { value: 1 },
    uReveal: { value: 0 },
    uScanY: { value: -2 },
    uFlicker: { value: 1 },
    uColorA: { value: new Color('#7a7a7a') },
    uColorB: { value: new Color('#ffffff') },
    uAlpha: { value: 1 },
    uCore: { value: 2 },
    ...extra,
  }
}

function make(extra) {
  return new ShaderMaterial({
    uniforms: uniforms(extra),
    vertexShader,
    fragmentShader,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: AdditiveBlending,
  })
}

export function createFaceMaterials(mouthY = -0.18, pixelRatio = 1) {
  // Halo: large soft glow. Core: crisp bright nodes.
  const halo = make({ uSize: { value: 26 }, uAlpha: { value: 0.18 }, uCore: { value: 1.0 } })
  const core = make({ uSize: { value: 7 }, uAlpha: { value: 0.95 }, uCore: { value: 2.6 } })
  for (const m of [halo, core]) {
    m.uniforms.uMouthY.value = mouthY
    m.uniforms.uPixelRatio.value = pixelRatio
  }
  return { halo, core }
}
