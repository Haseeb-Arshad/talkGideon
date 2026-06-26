// One-time, offline: extract a compact point cloud from facecap.glb so the app
// ships a tiny ~30KB face instead of a 332KB compressed model + a WASM
// transcoder + a runtime GLTF/KTX2/meshopt pipeline.
//
// Output: public/face.json  { count, quant, scale, mouthY, data(base64 Int16) }
//
// Run with: node scripts/build-face.js
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Minimal DOM shims so three's loaders run headless in Node.
globalThis.self = globalThis

const { Vector3, Box3 } = await import('three')
const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
const { MeshoptDecoder } = await import('three/examples/jsm/libs/meshopt_decoder.module.js')

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const glbPath = resolve(root, 'assets/facecap.glb')

// --- Strip textures/materials from the GLB so it parses without KTX2 ---------
function stripGLB(buf) {
  const jsonLen = buf.readUInt32LE(12)
  const json = JSON.parse(buf.toString('utf8', 20, 20 + jsonLen))
  const binStart = 20 + jsonLen
  const binChunkLen = buf.readUInt32LE(binStart)
  const binType = buf.readUInt32LE(binStart + 4)
  const binData = buf.subarray(binStart + 8, binStart + 8 + binChunkLen)

  delete json.images
  delete json.textures
  delete json.samplers
  delete json.materials
  const dropExt = new Set(['KHR_texture_basisu', 'KHR_texture_transform'])
  for (const k of ['extensionsUsed', 'extensionsRequired']) {
    if (json[k]) json[k] = json[k].filter((e) => !dropExt.has(e))
  }
  for (const m of json.meshes || []) {
    for (const p of m.primitives || []) delete p.material
  }

  let jsonStr = JSON.stringify(json)
  while (jsonStr.length % 4 !== 0) jsonStr += ' '
  const jsonBuf = Buffer.from(jsonStr, 'utf8')

  const total = 12 + 8 + jsonBuf.length + 8 + binData.length
  const out = Buffer.alloc(total)
  out.writeUInt32LE(0x46546c67, 0) // 'glTF'
  out.writeUInt32LE(2, 4)
  out.writeUInt32LE(total, 8)
  out.writeUInt32LE(jsonBuf.length, 12)
  out.writeUInt32LE(0x4e4f534a, 16) // 'JSON'
  jsonBuf.copy(out, 20)
  let o = 20 + jsonBuf.length
  out.writeUInt32LE(binData.length, o)
  out.writeUInt32LE(binType, o + 4)
  binData.copy(out, o + 8)
  return out
}

const stripped = stripGLB(readFileSync(glbPath))

await MeshoptDecoder.ready
const loader = new GLTFLoader()
loader.setMeshoptDecoder(MeshoptDecoder)

const gltf = await loader.parseAsync(stripped.buffer.slice(stripped.byteOffset, stripped.byteOffset + stripped.byteLength), '')

// Largest mesh = the head.
let head = null
gltf.scene.updateMatrixWorld(true)
gltf.scene.traverse((o) => {
  if (o.isMesh && o.geometry?.attributes?.position) {
    if (!head || o.geometry.attributes.position.count > head.geometry.attributes.position.count) head = o
  }
})
if (!head) throw new Error('no mesh found')

const pos = head.geometry.attributes.position
const index = head.geometry.index
const mat = head.matrixWorld

// Pre-transform all vertices to world space.
const verts = []
{
  const v = new Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(mat)
    verts.push(v.x, v.y, v.z)
  }
}

const pts = []
// Keep every original vertex...
for (let i = 0; i < verts.length; i++) pts.push(verts[i])

// ...then densify by sampling extra points across triangle surfaces,
// weighted by area, so the face reads as a smooth cloud of light.
if (index) {
  const tris = index.count / 3
  const areas = new Float32Array(tris)
  const a = new Vector3(), b = new Vector3(), c = new Vector3(), ab = new Vector3(), ac = new Vector3()
  let totalArea = 0
  const vof = (i) => ([verts[i * 3], verts[i * 3 + 1], verts[i * 3 + 2]])
  for (let t = 0; t < tris; t++) {
    const i0 = index.getX(t * 3), i1 = index.getX(t * 3 + 1), i2 = index.getX(t * 3 + 2)
    a.set(...vof(i0)); b.set(...vof(i1)); c.set(...vof(i2))
    ab.subVectors(b, a); ac.subVectors(c, a)
    const ar = ab.cross(ac).length() * 0.5
    areas[t] = ar; totalArea += ar
  }
  // cumulative
  const cum = new Float32Array(tris)
  let acc = 0
  for (let t = 0; t < tris; t++) { acc += areas[t]; cum[t] = acc }

  const EXTRA = 12000
  const p = new Vector3()
  for (let s = 0; s < EXTRA; s++) {
    const r = Math.random() * totalArea
    // binary search
    let lo = 0, hi = tris - 1
    while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < r) lo = m + 1; else hi = m }
    const i0 = index.getX(lo * 3), i1 = index.getX(lo * 3 + 1), i2 = index.getX(lo * 3 + 2)
    a.set(...vof(i0)); b.set(...vof(i1)); c.set(...vof(i2))
    let u = Math.random(), w = Math.random()
    if (u + w > 1) { u = 1 - u; w = 1 - w }
    p.set(
      a.x + (b.x - a.x) * u + (c.x - a.x) * w,
      a.y + (b.y - a.y) * u + (c.y - a.y) * w,
      a.z + (b.z - a.z) * u + (c.z - a.z) * w,
    )
    pts.push(p.x, p.y, p.z)
  }
}

// Normalize: center, scale to height ~2.0.
const box = new Box3()
const tmp = new Vector3()
for (let i = 0; i < pts.length; i += 3) box.expandByPoint(tmp.set(pts[i], pts[i + 1], pts[i + 2]))
const size = box.getSize(new Vector3())
const center = box.getCenter(new Vector3())
const scale = 2.0 / (size.y || 1)
let maxAbs = 0
for (let i = 0; i < pts.length; i += 3) {
  pts[i] = (pts[i] - center.x) * scale
  pts[i + 1] = (pts[i + 1] - center.y) * scale
  pts[i + 2] = (pts[i + 2] - center.z) * scale
  maxAbs = Math.max(maxAbs, Math.abs(pts[i]), Math.abs(pts[i + 1]), Math.abs(pts[i + 2]))
}

// Quantize to int16.
const quant = maxAbs / 32000
const i16 = new Int16Array(pts.length)
for (let i = 0; i < pts.length; i++) i16[i] = Math.round(pts[i] / quant)

const out = {
  count: pts.length / 3,
  quant,
  mouthY: -0.18, // approx mouth band centre (normalized space) for talk animation
  data: Buffer.from(i16.buffer).toString('base64'),
}
const outPath = resolve(root, 'public/face.json')
writeFileSync(outPath, JSON.stringify(out))
console.log(`[build-face] ${out.count} points → public/face.json (${(JSON.stringify(out).length / 1024).toFixed(1)} KB)`)
