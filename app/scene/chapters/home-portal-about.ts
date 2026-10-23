import type gsap from 'gsap'
import * as THREE from 'three'
import type { Chapter, ChapterDeps, FrameCtx, Layout, Pose } from '../core/types'
import { HoloEarth } from '../objects/earth'
import { PortalVFX } from '../objects/portal'
import { makeLandMask } from '../core/noise'
import { Disposer, fitDistance, frame } from './common'

/* ─────────── Chapitre 1 : décollage — Terre holographique ─────────── */
export class HomeChapter implements Chapter {
  readonly id = 'home' as const
  readonly group = new THREE.Group()
  readonly depth = 0
  earth: HoloEarth | null = null
  private d = new Disposer()
  private disposed = false
  constructor(private deps: ChapterDeps, pixel: number) {
    makeLandMask(deps.quality.tier === 'low' ? 1024 : 2048).then((mask) => {
      if (this.disposed) { mask.texture.dispose(); return }
      const pts = deps.quality.tier === 'low' ? 9000 : deps.quality.tier === 'medium' ? 16000 : 26000
      this.earth = new HoloEarth(deps.theme, mask, { points: pts, pixel, scan: deps.quality.scan })
      this.earth.setMarker(deps.content.settings.hero.globeMarker)
      this.group.add(this.earth.group)
      this.d.add({ dispose: () => { mask.texture.dispose(); this.earth?.dispose() } })
    }).catch(() => { /* la scène reste utilisable sans la Terre (le texte et la navigation ne dépendent pas d'elle) */ })
  }
  poses(l: Layout): Pose[] {
    const far = fitDistance(8.5, 8.5, l, 1.0) + 6
    return [frame([0, 0, 0], Math.max(far, 15), l, { dy: 0.5 }), frame([0, 0, 0], Math.max(fitDistance(7.2, 7.2, l), 9.5), l, { dy: 0.3 })]
  }
  setMarker(m: { lat: number, lon: number } | null) { this.earth?.setMarker(m) }
  update(c: FrameCtx) { this.earth?.update(c.dt, c.time, c.motion) }
  pickables() { return [] }
  setQuality(q: ChapterDeps['quality']) { this.earth?.setScan(q.scan); this.earth?.setPixel(q.pixelRatio) }
  dispose() { this.disposed = true; this.d.all() }
}

/* ─────────── Chapitre 2 : traversée — le portail dimensionnel ─────────── */
export const PORTAL_RADIUS = 6
export class PortalChapter implements Chapter {
  readonly id = 'portal' as const
  readonly group = new THREE.Group()
  readonly depth = 0
  readonly portal: PortalVFX
  /** 0 → 1 pendant la traversée (alimente la distorsion, les particules aspirées et l'éclair). */
  state = { open: 0.2, traverse: 0, flash: 0 }
  constructor(deps: ChapterDeps) {
    this.portal = new PortalVFX(deps.theme, { radius: PORTAL_RADIUS, mode: deps.quality.tier === 'low' ? 'opaque' : 'stencil', noise: deps.noise, sparks: deps.quality.tier === 'low' ? 48 : 110, dither: deps.content.settings.visuals.dither })
    this.group.add(this.portal.group)
    this.portal.setOpen(0.2)
  }
  /**
   * Trajet : contournement de la planète → approche → traversée. Les poses sont en coordonnées locales (portail en 0,0,0).
   * Distances : la planète est à 34 unités derrière le portail (origine du monde).
   */
  poses(l: Layout): Pose[] {
    const sh = l.mobile ? 0 : 0
    return [
      { pos: [7.5, 2.4, 30] as [number, number, number], look: [0, 0, 8] as [number, number, number] },
      { pos: [3, 1, 14 + sh], look: [0, 0, 0] as [number, number, number] },
      { pos: [0.1, 0, 8.5], look: [0, 0, 0] as [number, number, number], fov: l.fov },
      { pos: [0, 0, 1.4], look: [0, 0, -12] as [number, number, number], fov: l.fov + 14 },
      { pos: [0, 0, -9], look: [0, 0, -26] as [number, number, number], fov: l.fov },
    ]
  }
  timeline(tl: gsap.core.Timeline, t0: number, t1: number) {
    const span = t1 - t0
    tl.to(this.state, { open: 1, duration: span * 0.38, ease: 'power2.out' }, t0)
    tl.to(this.state, { traverse: 1, duration: span * 0.3, ease: 'power2.in' }, t0 + span * 0.45)
    tl.to(this.state, { flash: 1, duration: span * 0.06, ease: 'power2.in' }, t0 + span * 0.6)
    tl.to(this.state, { flash: 0, duration: span * 0.14, ease: 'power2.out' }, t0 + span * 0.66)
    tl.to(this.state, { traverse: 0, duration: span * 0.12, ease: 'none' }, t0 + span * 0.8)
  }
  update(c: FrameCtx) {
    this.portal.setOpen(this.state.open)
    this.portal.setInflow(this.state.traverse)
    this.portal.setSpeed(1 + this.state.traverse * 3)
    this.portal.update(c.dt, c.motion)
  }
  pickables() { return [] }
  dispose() { this.portal.dispose() }
}

/* ─────────── Chapitre 3 : l'autre dimension — « À propos » ─────────── */
export class AboutChapter implements Chapter {
  readonly id = 'about' as const
  readonly group = new THREE.Group()
  readonly depth = 8
  private d = new Disposer()
  private crystals: THREE.InstancedMesh
  private frameRing: THREE.Mesh
  private dummy = new THREE.Object3D()
  private seeds: { a: number, r: number, y: number, s: number, sp: number }[] = []
  constructor(deps: ChapterDeps) {
    const t = deps.theme.u
    const n = Math.round(46 * deps.quality.particles)
    const geo = this.d.add(new THREE.OctahedronGeometry(0.28, 0)), mat = this.d.add(new THREE.MeshStandardMaterial({ color: 0x1d2640, metalness: 0.7, roughness: 0.25, emissive: 0x000000, flatShading: true }))
    this.crystals = new THREE.InstancedMesh(geo, mat, n); this.crystals.frustumCulled = false
    for (let i = 0; i < n; i++) {
      this.seeds.push({ a: Math.random() * Math.PI * 2, r: 5 + Math.random() * 9, y: (Math.random() - 0.5) * 7, s: 0.5 + Math.random() * 1.6, sp: (0.05 + Math.random() * 0.12) * (Math.random() < 0.5 ? -1 : 1) })
      this.crystals.setColorAt(i, new THREE.Color().lerpColors(t.uPrimary.value, t.uSecondary.value, Math.random()).multiplyScalar(0.7))
    }
    const tintCrystals = () => { for (let i = 0; i < n; i++) this.crystals.setColorAt(i, new THREE.Color().lerpColors(t.uPrimary.value, t.uSecondary.value, (i % 7) / 6).multiplyScalar(0.7)); if (this.crystals.instanceColor) this.crystals.instanceColor.needsUpdate = true }
    deps.theme.onChange(tintCrystals)
    const rg = this.d.add(new THREE.TorusGeometry(6.2, 0.03, 8, 160)), rm = this.d.add(new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: true, opacity: 0.6 }))
    rm.color.copy(t.uGlow.value).multiplyScalar(1.6); deps.theme.onChange(() => rm.color.copy(t.uGlow.value).multiplyScalar(1.6))
    this.frameRing = new THREE.Mesh(rg, rm); this.frameRing.rotation.x = 1.15
    const wg = this.d.add(new THREE.IcosahedronGeometry(2.1, 1)), wm = this.d.add(new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.35, toneMapped: false }))
    wm.color.copy(t.uPrimary.value).multiplyScalar(1.5); deps.theme.onChange(() => wm.color.copy(t.uPrimary.value).multiplyScalar(1.5))
    const wire = new THREE.Mesh(wg, wm); wire.name = 'wire'
    this.group.add(this.crystals, this.frameRing, wire)
    this.group.add(new THREE.PointLight(0xffffff, 18, 40, 2))
    ;(this.group.children[3] as THREE.PointLight).color.copy(t.uPortalA.value)
  }
  poses(l: Layout): Pose[] {
    return [frame([0, 0, 0], Math.max(fitDistance(12, 8, l), 15), l, { dy: 0.4 }), frame([0, 0, -2], Math.max(fitDistance(12, 8, l), 14) - 3, l, { dy: 0.2 })]
  }
  update(c: FrameCtx) {
    const t = c.time * c.motion
    this.seeds.forEach((s, i) => {
      const a = s.a + t * s.sp
      this.dummy.position.set(Math.cos(a) * s.r, s.y + Math.sin(t * 0.4 + i) * 0.3, Math.sin(a) * s.r * 0.6 - 2)
      this.dummy.rotation.set(t * 0.2 + i, t * 0.15, 0); this.dummy.scale.setScalar(s.s); this.dummy.updateMatrix(); this.crystals.setMatrixAt(i, this.dummy.matrix)
    })
    this.crystals.instanceMatrix.needsUpdate = true
    this.frameRing.rotation.z += c.dt * 0.1 * c.motion
    const w = this.group.getObjectByName('wire'); if (w) { w.rotation.y += c.dt * 0.12 * c.motion; w.rotation.x += c.dt * 0.05 * c.motion }
  }
  pickables() { return [] }
  dispose() { this.crystals.dispose(); this.d.all() }
}
