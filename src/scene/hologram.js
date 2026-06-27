// The hologram — lightweight edition.
//
// Loads a tiny baked point cloud (public/face.json, ~115KB) and renders it as
// living light: a soft glow layer + crisp nodes, plus floating dust and a
// projection ring. No GLTF/KTX2/meshopt loaders, no post-processing passes —
// it loads instantly and runs on plain WebGL (desktop, mobile, older GPUs).
//
// Public API the app drives:
//   load()              -> Promise, resolves when ready
//   start()             -> begin the render loop
//   setSpeaking(bool)   -> mouth + glow react
//   setTalkTarget(v)    -> drive mouth openness 0..1 (per spoken word)
//   pulse()             -> a beat of emphasis (per spoken word)
//   setPointer(x,y)     -> she turns slightly toward you
//   nudgeRotation(x,y)  -> drag to spin her (inertial, self-righting)
//   setMood(name)       -> 'idle' | 'listen' | 'think' | 'speak'

import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Group,
  Points,
  BufferGeometry,
  BufferAttribute,
  Color,
  Clock,
  Vector2,
  AdditiveBlending,
  ShaderMaterial,
  MathUtils,
} from 'three'
import { createFaceMaterials } from './shaders.js'

const FACE_URL = '/face.json'

// Pure monochrome. Mood reads through brightness/contrast, never hue:
//   idle = calm mid-grey, listen = alert brighter, think = dim+low-contrast,
//   speak = brightest white.
const MOODS = {
  idle: { a: '#6e6e6e', b: '#f2f2f2' },
  listen: { a: '#8c8c8c', b: '#ffffff' },
  think: { a: '#4a4a4a', b: '#cccccc' },
  speak: { a: '#9a9a9a', b: '#ffffff' },
}

const REDUCED = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

export class Hologram {
  constructor(canvas) {
    this.canvas = canvas
    this.clock = new Clock()
    this.pointer = new Vector2(0, 0)
    this.pointerTarget = new Vector2(0, 0)
    this.speaking = false
    this.talk = 0          // smoothed mouth openness actually rendered
    this.talkTarget = 0    // where the mouth wants to be (driven by speech)
    this.mood = MOODS.idle
    this.moodA = new Color(MOODS.idle.a)
    this.moodB = new Color(MOODS.idle.b)
    this.materials = []
    this.faceMaterials = []

    // Materialise + scan + flicker state
    this.reveal = 0
    this.revealTarget = 0
    this.scanY = -2
    this.flicker = 1

    // Drag-to-rotate (inertial, returns to face-you)
    this.dragY = 0
    this.dragX = 0
    this.dragVelY = 0
    this.dragVelX = 0

    // Adaptive performance
    this.maxDpr = Math.min(window.devicePixelRatio || 1, REDUCED ? 1.25 : 2)
    this.dpr = this.maxDpr
    this._fpsAvg = 60
    this._perfCooldown = 0

    this._initRenderer()
    this._initScene()
    this._initDust()
    this._initRing()
    window.addEventListener('resize', () => this._resize())
    document.addEventListener('visibilitychange', () => this._onVisibility())
  }

  _initRenderer() {
    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      antialias: !REDUCED,
      alpha: true,
      powerPreference: 'high-performance',
    })
    this.renderer.setPixelRatio(this.dpr)
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setClearColor(0x000000, 0)
  }

  _initScene() {
    this.scene = new Scene()
    this.camera = new PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.1, 100)
    this.camera.position.set(0, 0.05, 3.0)
    this.camera.lookAt(0, 0, 0)
    this.root = new Group()
    this.face = new Group()
    this.root.add(this.face)
    this.scene.add(this.root)
  }

  load() {
    if (!this._loadPromise) this._loadPromise = this._doLoad()
    return this._loadPromise
  }

  async _doLoad() {
    let positions, mouthY
    try {
      const data = await (await fetch(FACE_URL)).json()
      positions = decode(data)
      mouthY = data.mouthY ?? -0.18
    } catch (err) {
      // Fallback so something always shows even if the asset is missing.
      positions = sphereCloud(8000)
      mouthY = -0.2
      console.warn('[hologram] face asset missing, using fallback cloud', err)
    }

    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(positions, 3))
    geo.computeBoundingSphere()

    const { halo, core } = createFaceMaterials(mouthY, this.dpr)
    this.faceMaterials = [halo, core]
    this.materials.push(halo, core, this.dust.material, this.ring.material)

    this.face.add(new Points(geo, halo))
    this.face.add(new Points(geo, core))

    this.ready = true
    return this
  }

  _initDust() {
    const N = REDUCED ? 220 : 600
    const pos = new Float32Array(N * 3)
    const seed = new Float32Array(N)
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 8
      pos[i * 3 + 1] = (Math.random() - 0.5) * 6
      pos[i * 3 + 2] = (Math.random() - 0.5) * 5 - 1.5
      seed[i] = Math.random()
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(pos, 3))
    g.setAttribute('aSeed', new BufferAttribute(seed, 1))
    const m = new ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uColor: { value: new Color('#cbcbcb') }, uPR: { value: this.dpr } },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: AdditiveBlending,
      vertexShader: /* glsl */ `
        attribute float aSeed; uniform float uTime; uniform float uPR; varying float vS;
        void main(){
          vS = aSeed; vec3 p = position;
          p.y += sin(uTime*0.3 + aSeed*30.0)*0.25;
          p.x += cos(uTime*0.2 + aSeed*20.0)*0.2;
          vec4 mv = modelViewMatrix * vec4(p,1.0);
          gl_PointSize = (1.0 + 2.0*aSeed) * uPR * (60.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        precision mediump float; uniform float uTime; uniform vec3 uColor; varying float vS;
        void main(){
          vec2 c = gl_PointCoord - 0.5; if(length(c)>0.5) discard;
          float tw = 0.4 + 0.6*sin(uTime*2.0 + vS*40.0);
          float a = (0.15 + 0.2*vS) * tw * smoothstep(0.5,0.0,length(c));
          gl_FragColor = vec4(uColor, a);
        }`,
    })
    this.dust = new Points(g, m)
    this.scene.add(this.dust)
  }

  // A glowing ring of points beneath her: implies a light projector.
  _initRing() {
    const N = 240
    const pos = new Float32Array(N * 3)
    const seed = new Float32Array(N)
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2
      const r = 1.25 + (Math.random() - 0.5) * 0.06
      pos[i * 3] = Math.cos(a) * r
      pos[i * 3 + 1] = -1.35
      pos[i * 3 + 2] = Math.sin(a) * r * 0.5
      seed[i] = Math.random()
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(pos, 3))
    g.setAttribute('aSeed', new BufferAttribute(seed, 1))
    const m = new ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uColor: { value: new Color('#ededed') }, uPR: { value: this.dpr } },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: AdditiveBlending,
      vertexShader: /* glsl */ `
        attribute float aSeed; uniform float uTime; uniform float uPR; varying float vS;
        void main(){
          vS = aSeed;
          vec4 mv = modelViewMatrix * vec4(position,1.0);
          gl_PointSize = (2.0 + 2.0*aSeed) * uPR * (70.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        precision mediump float; uniform float uTime; uniform vec3 uColor; varying float vS;
        void main(){
          vec2 c = gl_PointCoord - 0.5; if(length(c)>0.5) discard;
          float tw = 0.5 + 0.5*sin(uTime*3.0 + vS*50.0);
          gl_FragColor = vec4(uColor, 0.5*tw*smoothstep(0.5,0.0,length(c)));
        }`,
    })
    this.ring = new Points(g, m)
    this.scene.add(this.ring)
  }

  setSpeaking(on) {
    this.speaking = on
    if (on) this.setMood('speak')
    else this.talkTarget = 0
  }
  // Drive the mouth from real speech: 0 (closed) .. 1 (wide). Decays on its own.
  setTalkTarget(v) { this.talkTarget = MathUtils.clamp(v, 0, 1) }
  pulse() { this.talkTarget = Math.max(this.talkTarget, 0.6) }
  setPointer(x, y) { this.pointerTarget.set(x, y) }
  nudgeRotation(dx, dy) {
    this.dragVelY += dx * 2.2
    this.dragVelX += dy * 1.4
  }
  setMood(name) { this.mood = MOODS[name] || MOODS.idle }

  start() {
    if (this._raf) return
    this.revealTarget = 1 // begin materialising
    this.clock.getDelta()
    const tick = () => { this._frame(); this._raf = requestAnimationFrame(tick) }
    this._raf = requestAnimationFrame(tick)
  }

  _onVisibility() {
    if (document.hidden) {
      cancelAnimationFrame(this._raf)
      this._raf = 0
    } else if (this.ready && !this._raf) {
      this.clock.getDelta() // swallow the gap so nothing jumps
      const tick = () => { this._frame(); this._raf = requestAnimationFrame(tick) }
      this._raf = requestAnimationFrame(tick)
    }
  }

  _frame() {
    const t = this.clock.elapsedTime
    const dt = Math.min(this.clock.getDelta(), 0.05)
    this._govern(dt)

    // --- Materialise toward target (eases in over ~1.5s).
    this.reveal += (this.revealTarget - this.reveal) * Math.min(1, dt * 2.2)

    // --- Mouth envelope: snap open toward the target, fall back closed. While
    // speaking we add a fine flutter so it never looks frozen between words.
    if (this.speaking) {
      const flutter = 0.12 * (0.5 + 0.5 * Math.sin(t * 22))
      this.talkTarget = Math.max(this.talkTarget * 0.9, 0.18 + flutter)
    }
    const toward = this.talkTarget > this.talk ? 0.5 : 0.18 // fast attack, soft release
    this.talk += (this.talkTarget - this.talk) * toward
    this.talkTarget *= 0.9

    // --- Scan sweep climbs the face and wraps; flicker = projector instability.
    this.scanY = ((t * 0.55) % 2.6) - 1.3
    const inst = 0.97 + 0.03 * Math.sin(t * 30.0)
    const blinkDip = Math.pow(0.5 + 0.5 * Math.sin(t * 0.9), 60.0) // rare brief dip
    this.flicker = inst * (1.0 - 0.25 * blinkDip)

    if (this.ready) {
      // Drag-to-rotate: inertia + gentle self-righting back to facing you.
      this.dragVelY *= 0.9; this.dragVelX *= 0.9
      this.dragY += this.dragVelY * dt; this.dragX += this.dragVelX * dt
      this.dragY *= 0.94; this.dragX *= 0.94
      this.dragX = MathUtils.clamp(this.dragX, -0.5, 0.5)

      this.pointer.lerp(this.pointerTarget, 0.06)
      const idleY = Math.sin(t * 0.5) * 0.05
      const idleX = Math.sin(t * 0.37) * 0.03
      const targetY = this.pointer.x * 0.4 + idleY + this.dragY
      const targetX = -this.pointer.y * 0.22 + idleX + this.dragX
      this.face.rotation.y += (targetY - this.face.rotation.y) * 0.08
      this.face.rotation.x += (targetX - this.face.rotation.x) * 0.08
      const breathe = 1 + Math.sin(t * 1.4) * 0.01 + this.talk * 0.015
      this.face.scale.setScalar(breathe)
      this.face.position.y = Math.sin(t * 1.4) * 0.01
    }

    this.moodA.lerp(new Color(this.mood.a), 0.04)
    this.moodB.lerp(new Color(this.mood.b), 0.04)

    for (const m of this.materials) {
      const u = m.uniforms
      if (u.uTime) u.uTime.value = t
      if (u.uTalk) u.uTalk.value = this.talk
      if (u.uReveal) u.uReveal.value = this.reveal
      if (u.uScanY) u.uScanY.value = this.scanY
      if (u.uFlicker) u.uFlicker.value = this.flicker
      if (u.uColorA) u.uColorA.value.copy(this.moodA)
      if (u.uColorB) u.uColorB.value.copy(this.moodB)
    }
    this.ring.rotation.y = t * 0.25

    this.renderer.render(this.scene, this.camera)
  }

  // Keep it fast everywhere: if frames get heavy, quietly drop pixel ratio.
  _govern(dt) {
    if (dt <= 0) return
    const fps = 1 / dt
    this._fpsAvg += (fps - this._fpsAvg) * 0.1
    if (this._perfCooldown > 0) { this._perfCooldown -= dt; return }
    if (this._fpsAvg < 45 && this.dpr > 0.85) {
      this.dpr = Math.max(0.75, this.dpr - 0.25)
      this._applyDpr()
      this._perfCooldown = 1.5
    } else if (this._fpsAvg > 58 && this.dpr < this.maxDpr) {
      this.dpr = Math.min(this.maxDpr, this.dpr + 0.25)
      this._applyDpr()
      this._perfCooldown = 2.5
    }
  }

  _applyDpr() {
    this.renderer.setPixelRatio(this.dpr)
    for (const m of this.materials) if (m.uniforms.uPixelRatio) m.uniforms.uPixelRatio.value = this.dpr
    if (this.dust?.material.uniforms.uPR) this.dust.material.uniforms.uPR.value = this.dpr
    if (this.ring?.material.uniforms.uPR) this.ring.material.uniforms.uPR.value = this.dpr
  }

  _resize() {
    const w = window.innerWidth, h = window.innerHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
  }
}

function decode(data) {
  const bin = atob(data.data)
  const u8 = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i)
  const i16 = new Int16Array(u8.buffer)
  const out = new Float32Array(i16.length)
  for (let i = 0; i < i16.length; i++) out[i] = i16[i] * data.quant
  return out
}

function sphereCloud(n) {
  const out = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const u = Math.random(), v = Math.random()
    const th = 2 * Math.PI * u, ph = Math.acos(2 * v - 1)
    const r = 1
    out[i * 3] = r * Math.sin(ph) * Math.cos(th)
    out[i * 3 + 1] = r * Math.cos(ph)
    out[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th) * 0.6
  }
  return out
}
