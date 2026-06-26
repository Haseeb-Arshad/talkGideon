// Lightweight holographic point material.
//
// The face is a cloud of glowing points. We draw it twice with this material:
//   - a big, soft, dim "halo" layer  → diffuse bloom-like glow (no post-fx needed)
//   - a small, crisp, bright "core" layer → the nodes themselves
//
// Round, soft points are computed in the fragment shader from gl_PointCoord, so
// there's no texture to load and it runs on plain WebGL (incl. older mobile).
// The mouth opens by pushing the lower-face points down with uTalk — cheap, and
// reads clearly as speaking without any morph-target / WebGL2 machinery.

import { ShaderMaterial, AdditiveBlending, Color } from 'three'

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uTalk;
  uniform float uMouthY;
  uniform float uSize;
  uniform float uPixelRatio;
  varying float vBand;
  varying float vSeed;

  void main() {
    vec3 p = position;

    // Talking: lower-face points drop as the "jaw" opens.
    float below = smoothstep(0.30, 0.0, uMouthY - p.y) * step(p.y, uMouthY + 0.02);
    p.y -= uTalk * 0.14 * below;

    vSeed = fract(sin(dot(position.xy, vec2(12.9898, 78.233))) * 43758.5453);
    vBand = 0.5 + 0.5 * sin(p.y * 6.0 - uTime * 1.4);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * uPixelRatio * (1.0 / -mv.z);
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
  varying float vBand;
  varying float vSeed;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float soft = smoothstep(0.5, 0.0, d);
    soft = pow(soft, uCore);

    float tw = 0.65 + 0.35 * sin(uTime * 3.0 + vSeed * 40.0);
    vec3 col = mix(uColorA, uColorB, vBand);
    col += uColorB * uTalk * 0.5;

    float a = soft * (0.55 + 0.45 * tw) * uAlpha;
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
    uColorA: { value: new Color('#1f7fb0') },
    uColorB: { value: new Color('#bfeeff') },
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
