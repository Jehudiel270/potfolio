import * as THREE from 'three'
import type { PublicAchievement, PublicCertification, PublicEducation, PublicExperience } from '#shared/types'
import type { Chapter, ChapterDeps, FrameCtx, Layout, Pose, Pickable } from '../core/types'
import { PATH_LINE, STAR_NODES } from '../core/shaders'
import { Disposer, PresetInstances, damp, fitDistance, frame } from './common'

const lerpColor = (a: THREE.Color, b: THREE.Color, t: number) => new THREE.Color().lerpColors(a, b, t)

/* ─────────── Parcours académique : constellation reliée par une trajectoire lumineuse ─────────── */
export class EducationChapter implements Chapter {
  readonly id = 'education' as const
  readonly group = new THREE.Group()
  readonly depth: number
  private d = new Disposer()
  readonly nodes: THREE.Vector3[]
  private points: THREE.Points
  private sizes: Float32Array; private glows: Float32Array; private colors: Float32Array
  private geo: THREE.BufferGeometry
  private hl: Float32Array
  activeIndex = 0
  constructor(private deps: ChapterDeps, private items: PublicEducation[]) {
    const n = items.length, spacing = 5.2
    this.nodes = items.map((_, i) => new THREE.Vector3((i - (n - 1) / 2) * spacing, Math.sin(i * 1.15) * 1.9, Math.cos(i * 0.8) * 2.2))
    this.depth = 8
    const t = deps.theme.u
    this.sizes = new Float32Array(n); this.glows = new Float32Array(n); this.colors = new Float32Array(n * 3); this.hl = new Float32Array(n)
    this.geo = this.d.add(new THREE.BufferGeometry())
    this.geo.setAttribute('position', new THREE.Float32BufferAttribute(this.nodes.flatMap(v => [v.x, v.y, v.z]), 3))
    const sa = new THREE.BufferAttribute(this.sizes, 1), ga = new THREE.BufferAttribute(this.glows, 1), ca = new THREE.BufferAttribute(this.colors, 3)
    sa.setUsage(THREE.DynamicDrawUsage); ga.setUsage(THREE.DynamicDrawUsage)
    this.geo.setAttribute('aSize', sa); this.geo.setAttribute('aGlow', ga); this.geo.setAttribute('aColor', ca)
    const mat = this.d.add(new THREE.ShaderMaterial({ vertexShader: STAR_NODES.vert, fragmentShader: STAR_NODES.frag, uniforms: { uPixel: { value: deps.quality.pixelRatio }, uTime: t.uTime }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }))
    this.points = new THREE.Points(this.geo, mat); this.points.frustumCulled = false
    this.group.add(this.points)
    this.paint()
    deps.theme.onChange(() => this.paint())

    // Trajectoire reliant les étapes (courbe de Catmull-Rom) + axe temporel et repères.
    if (n > 1) {
      const curve = new THREE.CatmullRomCurve3(this.nodes, false, 'catmullrom', 0.4), pts = curve.getPoints(n * 40)
      const g = this.d.add(new THREE.BufferGeometry().setFromPoints(pts)); g.setAttribute('aT', new THREE.Float32BufferAttribute(pts.map((_, i) => i / (pts.length - 1)), 1))
      const m = this.d.add(new THREE.ShaderMaterial({ vertexShader: PATH_LINE.vert, fragmentShader: PATH_LINE.frag, uniforms: { uColor: t.uPrimary, uGlow: t.uGlow, uTime: t.uTime, uPhase: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }))
      const line = new THREE.Line(g, m); line.frustumCulled = false; this.group.add(line)
      const axis = [this.nodes[0]!.x - 3, -3.6, 0, this.nodes[n - 1]!.x + 3, -3.6, 0]
      for (const v of this.nodes) axis.push(v.x, -3.6, 0, v.x, -3.25, 0)
      const ag = this.d.add(new THREE.BufferGeometry()); ag.setAttribute('position', new THREE.Float32BufferAttribute(axis, 3))
      const am = this.d.add(new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, toneMapped: false }))
      const pa = () => am.color.copy(t.uSecondary.value).multiplyScalar(1.8); pa(); deps.theme.onChange(pa)
      this.group.add(new THREE.LineSegments(ag, am))
    }
  }
  private paint() {
    this.items.forEach((e, i) => { const c = this.deps.theme.colorOf(e.color, lerpColor(this.deps.theme.u.uPrimary.value, this.deps.theme.u.uSecondary.value, this.items.length > 1 ? i / (this.items.length - 1) : 0)); this.colors.set([c.r, c.g, c.b], i * 3) })
    ;(this.geo.getAttribute('aColor') as THREE.BufferAttribute).needsUpdate = true
  }
  poses(l: Layout): Pose[] {
    const d = Math.max(fitDistance(9, 6, l), 9)
    if (this.nodes.length === 0) return [frame([0, 0, 0], d, l)]
    return this.nodes.map(n => frame([n.x, n.y, n.z], d, l, { dy: 0.5 }))
  }
  update(c: FrameCtx) {
    const n = this.items.length
    this.activeIndex = n > 1 ? Math.round(c.local * (n - 1)) : 0
    this.items.forEach((e, i) => {
      const target = Math.max(c.hovered(`education:${e.id}`) ? 1 : 0, i === this.activeIndex ? 0.8 : 0, e.featured ? 0.25 : 0)
      this.hl[i] = damp(this.hl[i]!, target, 8, c.dt)
      const sz = e.preset === 'nova' ? 1.35 : e.preset === 'pulsar' ? 1.15 : 1
      this.sizes[i] = (26 + this.hl[i]! * 22) * sz; this.glows[i] = this.hl[i]!
    })
    ;(this.geo.getAttribute('aSize') as THREE.BufferAttribute).needsUpdate = true; (this.geo.getAttribute('aGlow') as THREE.BufferAttribute).needsUpdate = true
  }
  pickables(): Pickable[] { return this.items.map((e, i) => ({ key: `education:${e.id}`, kind: 'education', id: e.id, world: this.group.localToWorld(this.nodes[i]!.clone()), radiusPx: 34, label: e.title, sub: e.institution })) }
  setQuality(q: ChapterDeps['quality']) { (this.points.material as THREE.ShaderMaterial).uniforms.uPixel!.value = q.pixelRatio }
  dispose() { this.d.all() }
}

/* ─────────── Expériences : modules orbitaux autour d'un axe central ─────────── */
export class ExperiencesChapter implements Chapter {
  readonly id = 'experiences' as const
  readonly group = new THREE.Group()
  readonly depth = 8
  private d = new Disposer()
  private inst: PresetInstances
  private orbit = new THREE.Group()
  private ringMeshes: THREE.Mesh[] = []
  private pos: THREE.Vector3[] = []
  private hl: Float32Array
  private ang: Float32Array
  private tmp = new THREE.Vector3()
  activeIndex = 0
  constructor(private deps: ChapterDeps, private items: PublicExperience[]) {
    const t = deps.theme.u, n = items.length
    const geoms = {
      hex: this.d.add(new THREE.CylinderGeometry(0.62, 0.62, 0.42, 6)), cylinder: this.d.add(new THREE.CylinderGeometry(0.5, 0.5, 0.6, 24)),
      capsule: this.d.add(new THREE.CapsuleGeometry(0.34, 0.5, 6, 16)),
    }
    const mat = this.d.add(new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.75, roughness: 0.26, emissive: 0x000000 }))
    this.inst = new PresetInstances(geoms, mat, items.map(i => i.preset), 'hex')
    this.hl = new Float32Array(n); this.ang = new Float32Array(n)
    items.forEach((_, i) => { this.ang[i] = i * 2.1 })
    // Axe central et noyau lumineux.
    const axisH = Math.max(4, n * 1.25 + 2)
    const ag = this.d.add(new THREE.CylinderGeometry(0.05, 0.05, axisH, 10)), am = this.d.add(new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }))
    const tint = () => am.color.copy(t.uGlow.value).multiplyScalar(2.2); tint(); deps.theme.onChange(tint)
    const axis = new THREE.Mesh(ag, am); this.orbit.add(axis, this.inst.group)
    // Anneaux d'orbite (un par module) : fins, la période de chaque expérience est lisible.
    const rm = this.d.add(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.28, toneMapped: false }))
    const tr = () => rm.color.copy(t.uSecondary.value).multiplyScalar(2); tr(); deps.theme.onChange(tr)
    items.forEach((_, i) => {
      const r = 3.1 + (i % 3) * 0.55, y = (i - (n - 1) / 2) * 1.2
      this.pos.push(new THREE.Vector3(r, y, 0))
      const g = this.d.add(new THREE.TorusGeometry(r, 0.012, 6, 120)), ring = new THREE.Mesh(g, rm); ring.rotation.x = Math.PI / 2; ring.position.y = y
      this.orbit.add(ring); this.ringMeshes.push(ring)
    })
    this.group.add(this.orbit)
    const light = new THREE.PointLight(0xffffff, 26, 30, 2); light.position.set(0, 0, 6); light.color.copy(t.uPrimary.value); this.group.add(light)
    deps.theme.onChange(() => light.color.copy(t.uPrimary.value))
  }
  poses(l: Layout): Pose[] {
    const n = this.items.length, d = Math.max(fitDistance(9, Math.max(6, n * 1.25 + 2), l), 11)
    if (n < 2) return [frame([0, 0, 0], d, l)]
    // Spirale ascendante autour de l'axe : la caméra suit les modules dans l'ordre.
    return this.items.map((_, i) => {
      const y = this.pos[i]!.y, a = i * 0.55
      const f = frame([0, y, 0], d, l, { dy: 0.4 })
      return { pos: [f.pos[0] + Math.sin(a) * 1.2, f.pos[1], f.pos[2]], look: f.look }
    })
  }
  update(c: FrameCtx) {
    const n = this.items.length
    this.activeIndex = n > 1 ? Math.round(c.local * (n - 1)) : 0
    this.orbit.rotation.y += c.dt * 0.08 * c.motion
    const col = new THREE.Color()
    this.items.forEach((e, i) => {
      this.ang[i] = this.ang[i]! + c.dt * (0.22 + (i % 3) * 0.07) * c.motion
      const p = this.pos[i]!, r = p.x
      this.hl[i] = damp(this.hl[i]!, Math.max(c.hovered(`experience:${e.id}`) ? 1 : 0, i === this.activeIndex ? 0.7 : 0), 8, c.dt)
      const L = this.hl[i]!
      this.tmp.set(Math.cos(this.ang[i]!) * r, p.y, Math.sin(this.ang[i]!) * r)
      const c0 = this.deps.theme.colorOf(e.color, this.deps.theme.u.uPrimary.value)
      col.copy(c0).multiplyScalar(0.55 + L * 1.6)
      this.inst.set(i, this.tmp, (e.featured ? 1.2 : 1) * (1 + L * 0.25), new THREE.Euler(0, -this.ang[i]!, Math.PI / 2 * (e.preset === 'hex' ? 0 : 0.0)), col)
      ;(this.ringMeshes[i]!.material as THREE.MeshBasicMaterial).opacity = 0.28
    })
    this.inst.commit()
  }
  pickables(): Pickable[] {
    this.orbit.updateMatrixWorld()
    return this.items.map((e, i) => {
      const a = this.ang[i]!, p = this.pos[i]!
      return { key: `experience:${e.id}`, kind: 'experience', id: e.id, world: this.orbit.localToWorld(new THREE.Vector3(Math.cos(a) * p.x, p.y, Math.sin(a) * p.x)), radiusPx: 40, label: e.role, sub: e.organization }
    })
  }
  dispose() { this.inst.dispose(); this.d.all() }
}

/* ─────────── Certifications et diplômes : mur de holo-badges / cristaux flottants ─────────── */
export class CertificationsChapter implements Chapter {
  readonly id = 'certifications' as const
  readonly group = new THREE.Group()
  readonly depth = 8
  private d = new Disposer()
  private inst: PresetInstances
  private base: THREE.Vector3[] = []
  private rotY: number[] = []
  private hl: Float32Array
  private scl: Float32Array
  private cols = 1
  private rows = 1
  private on: boolean[] = []
  constructor(private deps: ChapterDeps, private items: PublicCertification[]) {
    const n = items.length
    const geoms = {
      crystal: this.d.add(new THREE.OctahedronGeometry(0.85, 0)), plate: this.d.add(new THREE.BoxGeometry(1.5, 1.95, 0.08)),
      prism: this.d.add(new THREE.CylinderGeometry(0.95, 0.95, 0.22, 3)), orb: this.d.add(new THREE.IcosahedronGeometry(0.8, 1)),
    }
    geoms.crystal.scale(0.8, 1.35, 0.8); geoms.prism.rotateX(Math.PI / 2)
    const mat = this.d.add(new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0.15, roughness: 0.12, transparent: true, opacity: 0.82, iridescence: 1, iridescenceIOR: 1.4, clearcoat: 1, emissive: 0x000000, flatShading: true, side: THREE.DoubleSide }))
    this.inst = new PresetInstances(geoms, mat, items.map(i => i.preset), 'crystal')
    this.group.add(this.inst.group)
    this.cols = Math.max(1, Math.min(6, Math.ceil(Math.sqrt(n * 1.7)))); this.rows = Math.max(1, Math.ceil(n / this.cols))
    const R = 11
    items.forEach((_, i) => {
      const col = i % this.cols, row = Math.floor(i / this.cols), a = (col - (this.cols - 1) / 2) * 0.27
      this.base.push(new THREE.Vector3(Math.sin(a) * R, -(row - (this.rows - 1) / 2) * 2.5, R - Math.cos(a) * R)); this.rotY.push(-a)
    })
    this.hl = new Float32Array(n); this.scl = new Float32Array(n).fill(1)
    const light = new THREE.PointLight(0xffffff, 34, 40, 2); light.position.set(0, 2, 8); light.color.copy(deps.theme.u.uGlow.value); this.group.add(light)
    deps.theme.onChange(() => light.color.copy(deps.theme.u.uGlow.value))
  }
  poses(l: Layout): Pose[] {
    const w = this.cols * 2.7 + 1, h = this.rows * 2.5 + 1, d = Math.max(fitDistance(Math.min(w, 13), h, l), 11) + 4
    const x0 = -w / 2 + 3, x1 = w / 2 - 3
    return w > 12 ? [frame([x0, 0, 0], d, l), frame([x1, 0, 0], d, l)] : [frame([0, 0, 0], d, l)]
  }
  private visible(e: PublicCertification, ui: FrameCtx['ui']) { return !ui.certCategory || e.category === ui.certCategory }
  update(c: FrameCtx) {
    const t = c.time * c.motion, col = new THREE.Color(), pos = new THREE.Vector3()
    this.items.forEach((e, i) => {
      const on = this.visible(e, c.ui); this.on[i] = on
      this.scl[i] = damp(this.scl[i]!, on ? 1 : 0.35, 7, c.dt)
      this.hl[i] = damp(this.hl[i]!, c.hovered(`certification:${e.id}`) ? 1 : 0, 9, c.dt)
      const L = this.hl[i]!, b = this.base[i]!
      pos.set(b.x, b.y + Math.sin(t * 0.8 + i * 1.3) * 0.18, b.z + L * 0.8)
      const base = this.deps.theme.colorOf(e.color, lerpColor(this.deps.theme.u.uPrimary.value, this.deps.theme.u.uSecondary.value, (i % 5) / 4))
      col.copy(base).multiplyScalar((on ? 0.9 : 0.25) + L * 1.4)
      this.inst.set(i, pos, this.scl[i]! * (e.featured ? 1.15 : 1) * (1 + L * 0.12), new THREE.Euler(Math.sin(t * 0.5 + i) * 0.08, this.rotY[i]! + t * 0.25 * (e.preset === 'plate' ? 0.15 : 1) + L * 0.5, 0), col)
    })
    this.inst.commit()
  }
  pickables(): Pickable[] { return this.items.flatMap((e, i) => (this.on[i] === false ? [] : [{ key: `certification:${e.id}`, kind: 'certification' as const, id: e.id, world: this.group.localToWorld(this.base[i]!.clone()), radiusPx: 44, label: e.name, sub: e.issuer }])) }
  dispose() { this.inst.dispose(); this.d.all() }
}

/* ─────────── Réalisations et autres jalons : capsules le long d'une trajectoire ─────────── */
export class AchievementsChapter implements Chapter {
  readonly id = 'achievements' as const
  readonly group = new THREE.Group()
  readonly depth = 8
  private d = new Disposer()
  private inst: PresetInstances
  private base: THREE.Vector3[] = []
  private hl: Float32Array
  private scl: Float32Array
  private on: boolean[] = []
  constructor(private deps: ChapterDeps, private items: PublicAchievement[]) {
    const n = items.length, t = deps.theme.u
    const geoms = {
      capsule: this.d.add(new THREE.CapsuleGeometry(0.28, 0.55, 6, 14)), badge: this.d.add(new THREE.CylinderGeometry(0.55, 0.55, 0.12, 6)), spark: this.d.add(new THREE.OctahedronGeometry(0.5, 0)),
    }
    geoms.capsule.rotateZ(Math.PI / 2)
    const mat = this.d.add(new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.6, roughness: 0.22, emissive: 0x000000 }))
    this.inst = new PresetInstances(geoms, mat, items.map(i => i.preset), 'capsule'); this.group.add(this.inst.group)
    const cats = [...new Set(items.map(i => i.category))]
    items.forEach((_, i) => { const row = cats.indexOf(items[i]!.category); this.base.push(new THREE.Vector3((i - (n - 1) / 2) * 2.1, (row - (cats.length - 1) / 2) * -1.7 + Math.sin(i * 1.3) * 0.5, Math.cos(i * 0.9) * 1.1)) })
    this.hl = new Float32Array(n); this.scl = new Float32Array(n).fill(1)
    if (n > 1) {
      const pts = this.base.map(v => v.clone()), g = this.d.add(new THREE.BufferGeometry().setFromPoints(new THREE.CatmullRomCurve3(pts).getPoints(n * 24)))
      const m = this.d.add(new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, toneMapped: false }))
      const tint = () => m.color.copy(t.uSecondary.value).multiplyScalar(2); tint(); deps.theme.onChange(tint)
      this.group.add(new THREE.Line(g, m))
    }
    const light = new THREE.PointLight(0xffffff, 22, 30, 2); light.position.set(0, 2, 6); light.color.copy(t.uPrimary.value); this.group.add(light)
    deps.theme.onChange(() => light.color.copy(t.uPrimary.value))
  }
  poses(l: Layout): Pose[] {
    const n = this.items.length, w = Math.max(6, n * 2.1), d = Math.max(fitDistance(Math.min(w, 12), 5, l), 10)
    return n > 5 ? [frame([-w / 2 + 4, 0, 0], d, l), frame([w / 2 - 4, 0, 0], d, l)] : [frame([0, 0, 0], d, l)]
  }
  update(c: FrameCtx) {
    const t = c.time * c.motion, col = new THREE.Color(), pos = new THREE.Vector3()
    this.items.forEach((e, i) => {
      const on = !c.ui.achCategory || e.category === c.ui.achCategory; this.on[i] = on
      this.scl[i] = damp(this.scl[i]!, on ? 1 : 0.35, 7, c.dt); this.hl[i] = damp(this.hl[i]!, c.hovered(`achievement:${e.id}`) ? 1 : 0, 9, c.dt)
      const L = this.hl[i]!, b = this.base[i]!
      pos.set(b.x, b.y + Math.sin(t * 0.9 + i) * 0.15, b.z)
      col.copy(this.deps.theme.colorOf(e.color, this.deps.theme.u.uPrimary.value)).multiplyScalar((on ? 0.9 : 0.25) + L * 1.5)
      this.inst.set(i, pos, this.scl[i]! * (1 + L * 0.2), new THREE.Euler(t * 0.3 + i, t * 0.4, 0), col)
    })
    this.inst.commit()
  }
  pickables(): Pickable[] { return this.items.flatMap((e, i) => (this.on[i] === false ? [] : [{ key: `achievement:${e.id}`, kind: 'achievement' as const, id: e.id, world: this.group.localToWorld(this.base[i]!.clone()), radiusPx: 38, label: e.title, sub: e.category }])) }
  dispose() { this.inst.dispose(); this.d.all() }
}
