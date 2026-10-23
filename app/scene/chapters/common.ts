import * as THREE from 'three'
import type { Layout, Pose, V3 } from '../core/types'

export class Disposer {
  private list: { dispose(): void }[] = []
  add<T extends { dispose(): void }>(o: T): T { this.list.push(o); return o }
  all() { this.list.forEach(d => d.dispose()); this.list = [] }
}

export const damp = (cur: number, target: number, rate: number, dt: number) => cur + (target - cur) * (1 - Math.exp(-rate * dt))

/** Distance de caméra pour qu'un contenu de largeur × hauteur tienne dans le champ de vision. */
export function fitDistance(width: number, height: number, l: Layout, margin = 1.12) {
  const t = Math.tan(THREE.MathUtils.degToRad(l.fov) / 2)
  return Math.max(width / (2 * t * l.aspect), height / (2 * t)) * margin
}
/**
 * Pose face au sujet. Sur grand écran le texte occupe la gauche : le sujet est décalé vers la droite ; sur mobile il est remonté
 * pour laisser le bas à la fiche.
 */
export function frame(subject: V3, dist: number, l: Layout, o: { dy?: number, shiftX?: number, shiftY?: number, tilt?: number } = {}): Pose {
  const t = Math.tan(THREE.MathUtils.degToRad(l.fov) / 2)
  const halfW = dist * t * l.aspect, halfH = dist * t
  const sx = o.shiftX ?? (l.mobile ? 0 : 0.2), sy = o.shiftY ?? (l.mobile ? 0.16 : 0)
  const lx = subject[0] - sx * 2 * halfW, ly = subject[1] - sy * 2 * halfH
  return { pos: [lx + (o.tilt ?? 0), ly + (o.dy ?? 0.6), subject[2] + dist], look: [lx, ly, subject[2]] }
}

export function initialsOf(name: string) {
  const w = name.replace(/[^\p{L}\p{N} +#.]/gu, '').trim().split(/\s+/)
  return ((w[0]?.[0] ?? '?') + (w[1]?.[0] ?? w[0]?.[1] ?? '')).toUpperCase().slice(0, 2)
}

/** Icône de compétence : pastille colorée + initiales (aucun nom gravé dans la géométrie, la texture est remplaçable). */
export function makeIconTexture(name: string, color: THREE.Color, size = 128): THREE.CanvasTexture {
  const cv = document.createElement('canvas'); cv.width = cv.height = size
  const g = cv.getContext('2d')!, hex = '#' + color.clone().convertLinearToSRGB().getHexString()
  const grad = g.createRadialGradient(size / 2, size / 2, size * 0.05, size / 2, size / 2, size * 0.5)
  grad.addColorStop(0, 'rgba(255,255,255,.95)'); grad.addColorStop(0.55, hex); grad.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = grad; g.beginPath(); g.arc(size / 2, size / 2, size * 0.48, 0, Math.PI * 2); g.fill()
  g.fillStyle = '#05060f'; g.font = `700 ${size * 0.36}px "Bricolage Grotesque Variable", system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'
  g.fillText(initialsOf(name), size / 2, size / 2 + size * 0.02)
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t
}

/** Plusieurs InstancedMesh (un par preset de forme) pilotés comme une seule liste d'éléments. */
export class PresetInstances {
  readonly group = new THREE.Group()
  private meshes = new Map<string, { mesh: THREE.InstancedMesh, indices: number[] }>()
  private slot: { preset: string, k: number }[] = []
  private dummy = new THREE.Object3D()
  constructor(geoms: Record<string, THREE.BufferGeometry>, material: THREE.Material, presets: string[], fallback: string) {
    presets.forEach((p, i) => {
      const key = geoms[p] ? p : fallback
      let e = this.meshes.get(key)
      if (!e) { e = { mesh: null as unknown as THREE.InstancedMesh, indices: [] }; this.meshes.set(key, e) }
      this.slot[i] = { preset: key, k: e.indices.length }; e.indices.push(i)
    })
    for (const [key, e] of this.meshes) {
      e.mesh = new THREE.InstancedMesh(geoms[key]!, material, e.indices.length)
      e.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); e.mesh.frustumCulled = false
      e.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(e.indices.length * 3).fill(1), 3)
      this.group.add(e.mesh)
    }
  }
  set(i: number, pos: THREE.Vector3, scale: number | THREE.Vector3, rot: THREE.Euler | null, color: THREE.Color) {
    const s = this.slot[i]; if (!s) return
    const e = this.meshes.get(s.preset)!
    this.dummy.position.copy(pos); if (typeof scale === 'number') this.dummy.scale.setScalar(scale)
    else this.dummy.scale.copy(scale)
    if (rot) this.dummy.rotation.copy(rot); else this.dummy.rotation.set(0, 0, 0)
    this.dummy.updateMatrix(); e.mesh.setMatrixAt(s.k, this.dummy.matrix); e.mesh.setColorAt(s.k, color)
  }
  commit() { for (const e of this.meshes.values()) { e.mesh.instanceMatrix.needsUpdate = true; if (e.mesh.instanceColor) e.mesh.instanceColor.needsUpdate = true } }
  dispose() { for (const e of this.meshes.values()) e.mesh.dispose() }
}

export const spiralHex = (n: number): [number, number][] => {
  const out: [number, number][] = [[0, 0]]
  const dirs: [number, number][] = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]]
  for (let ring = 1; out.length < n; ring++) {
    let q = -ring, r = ring
    // départ de l'anneau : coin (−ring, ring) puis déplacement le long des six côtés
    for (const d of dirs) for (let s = 0; s < ring && out.length < n; s++) { out.push([q, r]); q += d[0]; r += d[1] }
  }
  return out.slice(0, n)
}

export function disposeObject(o: THREE.Object3D) {
  o.traverse((c) => {
    const m = c as THREE.Mesh
    if ((m as unknown as { geometry?: THREE.BufferGeometry }).geometry) m.geometry.dispose()
  })
}
