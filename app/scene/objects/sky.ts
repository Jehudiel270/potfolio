import * as THREE from 'three'
import { DUST, SKY, STARS } from '../core/shaders'
import type { ThemeBridge } from '../core/theme-bridge'

const mulberry = (a: number) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }

export type StencilMode = 'none' | 'inside' | 'outside'
/** Applique un test de stencil au matériau : « inside » = visible seulement dans le disque du portail, « outside » = partout sauf dedans. */
export function applyStencil(m: THREE.Material, mode: StencilMode) {
  if (mode === 'none') { m.stencilWrite = false; return }
  m.stencilWrite = true; m.stencilRef = 1
  m.stencilFunc = mode === 'inside' ? THREE.EqualStencilFunc : THREE.NotEqualStencilFunc
  m.stencilFail = m.stencilZFail = m.stencilZPass = THREE.KeepStencilOp
}

/** Ciel nébuleux d'une dimension (0 = notre dimension, 1 = l'autre) ; suit la caméra. */
export class Sky {
  readonly mesh: THREE.Mesh
  private mat: THREE.ShaderMaterial
  constructor(theme: ThemeBridge, readonly dimension: 0 | 1) {
    const t = theme.u
    this.mat = new THREE.ShaderMaterial({
      vertexShader: SKY.vert, fragmentShader: SKY.frag, side: THREE.BackSide, depthWrite: false, depthTest: false,
      uniforms: { uBg: t.uBg, uA: t.uPortalA, uB: t.uPortalB, uGlow: t.uGlow, uTime: t.uTime, uIntensity: t.uIntensity, uDim: { value: dimension } },
    })
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 20), this.mat)
    this.mesh.renderOrder = dimension === 0 ? -100 : -90; this.mesh.frustumCulled = false
  }
  setStencil(mode: StencilMode) { applyStencil(this.mat, mode) }
  setBrightness(v: number) { this.mat.uniforms.uIntensity!.value = v }
  dispose() { this.mesh.geometry.dispose(); this.mat.dispose() }
}

/** Champ d'étoiles réparti sur plusieurs couches de profondeur (parallaxe selon le déplacement de la caméra). */
export class StarField {
  readonly group = new THREE.Group()
  private layers: { points: THREE.Points, factor: number, count: number }[] = []
  private mats: THREE.ShaderMaterial[] = []
  constructor(theme: ThemeBridge, seed: number, base: number, pixel: number) {
    const rnd = mulberry(seed), t = theme.u
    for (const [factor, count, size, radius] of [[1, 1600, 2.2, 700], [0.93, 900, 3.0, 450], [0.78, 360, 4.2, 280]] as const) {
      const n = Math.round(count * base), pos = new Float32Array(n * 3), r = new Float32Array(n * 3)
      for (let i = 0; i < n; i++) {
        const u = rnd() * 2 - 1, a = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u), rr = radius * (0.8 + rnd() * 0.4)
        pos.set([rr * s * Math.cos(a), rr * u, rr * s * Math.sin(a)], i * 3); r.set([rnd(), rnd(), rnd()], i * 3)
      }
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aRnd', new THREE.BufferAttribute(r, 3))
      const m = new THREE.ShaderMaterial({ vertexShader: STARS.vert, fragmentShader: STARS.frag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uTime: t.uTime, uPixel: { value: pixel }, uSize: { value: size }, uGlow: t.uGlow, uB: t.uSecondary } })
      const p = new THREE.Points(g, m); p.frustumCulled = false; p.renderOrder = -80
      this.group.add(p); this.layers.push({ points: p, factor, count: n }); this.mats.push(m)
    }
  }
  setStencil(mode: StencilMode) { this.mats.forEach(m => applyStencil(m, mode)) }
  setPixel(px: number) { this.mats.forEach(m => { m.uniforms.uPixel!.value = px }) }
  setDensity(f: number) { this.layers.forEach(l => l.points.geometry.setDrawRange(0, Math.floor(l.count * Math.min(1, f)))) }
  follow(cam: THREE.Vector3) { this.layers.forEach(l => l.points.position.copy(cam).multiplyScalar(l.factor)) }
  dispose() { this.layers.forEach(l => l.points.geometry.dispose()); this.mats.forEach(m => m.dispose()) }
}

/** Poussière spatiale : une boîte de particules qui enveloppe la caméra (sensation de vitesse et de profondeur). */
export class SpaceDust {
  readonly points: THREE.Points
  private mat: THREE.ShaderMaterial
  private count: number
  constructor(theme: ThemeBridge, count: number, pixel: number) {
    const rnd = mulberry(42), t = theme.u, box = new THREE.Vector3(70, 40, 70)
    const pos = new Float32Array(count * 3), r = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) { pos.set([(rnd() - 0.5) * box.x, (rnd() - 0.5) * box.y, (rnd() - 0.5) * box.z], i * 3); r.set([rnd(), rnd(), rnd()], i * 3) }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aRnd', new THREE.BufferAttribute(r, 3))
    this.count = count
    this.mat = new THREE.ShaderMaterial({ vertexShader: DUST.vert, fragmentShader: DUST.frag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uCam: { value: new THREE.Vector3() }, uBox: { value: box }, uTime: t.uTime, uPixel: { value: pixel }, uSize: { value: 1.3 }, uColor: t.uGlow } })
    this.points = new THREE.Points(g, this.mat); this.points.frustumCulled = false; this.points.renderOrder = -50
  }
  setPixel(px: number) { this.mat.uniforms.uPixel!.value = px }
  setDensity(f: number) { this.points.geometry.setDrawRange(0, Math.floor(this.count * Math.min(1, f))) }
  follow(cam: THREE.Vector3) { (this.mat.uniforms.uCam!.value as THREE.Vector3).copy(cam) }
  dispose() { this.points.geometry.dispose(); this.mat.dispose() }
}
