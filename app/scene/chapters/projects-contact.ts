import * as THREE from 'three'
import type gsap from 'gsap'
import type { PublicProject } from '#shared/types'
import type { Chapter, ChapterDeps, FrameCtx, Layout, Pose, Pickable } from '../core/types'
import { PortalVFX } from '../objects/portal'
import { Disposer, damp, fitDistance, frame } from './common'

const STEP = 5.6

/* ─────────── Projets : cristaux, cubes et polyèdres holographiques le long d'une galerie en profondeur ─────────── */
export class ProjectsChapter implements Chapter {
  readonly id = 'projects' as const
  readonly group = new THREE.Group()
  readonly depth: number
  private d = new Disposer()
  private meshes: { mesh: THREE.Mesh, edges: THREE.LineSegments, inner: THREE.Mesh, mat: THREE.MeshPhysicalMaterial, edgeMat: THREE.LineBasicMaterial, base: THREE.Vector3 }[] = []
  private hl: Float32Array
  private scl: Float32Array
  private on: boolean[] = []
  activeIndex = 0
  constructor(private deps: ChapterDeps, private items: PublicProject[]) {
    const n = items.length, t = deps.theme.u
    this.depth = Math.max(10, n * STEP + 6)
    this.hl = new Float32Array(n); this.scl = new Float32Array(n).fill(1)
    const geoms: Record<string, THREE.BufferGeometry> = {
      crystal: this.d.add(new THREE.OctahedronGeometry(1.25, 0)), cube: this.d.add(new THREE.BoxGeometry(1.7, 1.7, 1.7)),
      ico: this.d.add(new THREE.IcosahedronGeometry(1.35, 0)), shard: this.d.add(new THREE.ConeGeometry(1.0, 2.6, 5)),
    }
    geoms.crystal!.scale(0.85, 1.35, 0.85)
    const wire = this.d.add(new THREE.IcosahedronGeometry(0.6, 1))
    const wireMat = this.d.add(new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.5, toneMapped: false }))
    const wireTint = () => wireMat.color.copy(t.uGlow.value).multiplyScalar(1.6); wireTint(); deps.theme.onChange(wireTint)
    items.forEach((p, i) => {
      const geo = geoms[p.preset] ?? geoms.crystal!
      const mat = this.d.add(new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0.1, roughness: 0.08, transparent: true, opacity: 0.55, clearcoat: 1, flatShading: true, emissive: 0x000000, iridescence: 0.8 }))
      const edgeMat = this.d.add(new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, toneMapped: false }))
      const mesh = new THREE.Mesh(geo, mat), edges = new THREE.LineSegments(this.d.add(new THREE.EdgesGeometry(geo)), edgeMat), inner = new THREE.Mesh(wire, wireMat)
      mesh.add(edges, inner)
      const base = new THREE.Vector3(Math.sin(i * 1.15) * 4.6, Math.cos(i * 0.85) * 1.5, -i * STEP)
      mesh.position.copy(base); this.group.add(mesh)
      this.meshes.push({ mesh, edges, inner, mat, edgeMat, base })
    })
    this.paint(); deps.theme.onChange(() => this.paint())
    const light = new THREE.PointLight(0xffffff, 40, 36, 2); light.position.set(0, 1, 6); light.color.copy(t.uGlow.value); this.group.add(light)
    deps.theme.onChange(() => light.color.copy(t.uGlow.value))
  }
  private paint() {
    this.items.forEach((p, i) => {
      const c = this.deps.theme.colorOf(p.color, new THREE.Color().lerpColors(this.deps.theme.u.uPrimary.value, this.deps.theme.u.uSecondary.value, (i % 4) / 3))
      const m = this.meshes[i]!; m.mat.color.copy(c).multiplyScalar(0.55); m.mat.emissive.copy(c).multiplyScalar(0.22); m.edgeMat.color.copy(c).multiplyScalar(2.2)
    })
  }
  poses(l: Layout): Pose[] {
    const d = Math.max(fitDistance(6.5, 5, l), 9.5)
    if (!this.items.length) return [frame([0, 0, 0], d, l)]
    // La caméra traverse la galerie : une pose devant chaque projet.
    return this.meshes.map(m => frame([m.base.x, m.base.y, m.base.z], d, l, { dy: 0.5 }))
  }
  update(c: FrameCtx) {
    const t = c.time * c.motion
    const n = this.items.length
    this.activeIndex = n > 1 ? Math.round(c.local * (n - 1)) : 0
    this.items.forEach((p, i) => {
      const m = this.meshes[i]!, on = !c.ui.projectCategory || p.category === c.ui.projectCategory; this.on[i] = on
      const active = c.ui.projectActive === p.id || i === this.activeIndex
      this.scl[i] = damp(this.scl[i]!, on ? 1 : 0.4, 7, c.dt); this.hl[i] = damp(this.hl[i]!, c.hovered(`project:${p.id}`) ? 1 : active ? 0.55 : 0, 9, c.dt)
      const L = this.hl[i]!
      m.mesh.scale.setScalar(this.scl[i]! * (p.featured ? 1.22 : 1) * (1 + L * 0.18))
      m.mesh.rotation.y += c.dt * (0.35 + L * 1.1) * c.motion; m.mesh.rotation.x = Math.sin(t * 0.4 + i) * 0.25
      m.mesh.position.y = m.base.y + Math.sin(t * 0.7 + i * 1.7) * 0.2
      m.inner.rotation.y -= c.dt * 0.9 * c.motion
      m.mat.opacity = (on ? 0.5 : 0.18) + L * 0.3; m.edgeMat.opacity = on ? 0.9 : 0.25
      m.mat.emissiveIntensity = 1 + L * 3
    })
  }
  pickables(): Pickable[] { return this.items.flatMap((p, i) => (this.on[i] === false ? [] : [{ key: `project:${p.id}`, kind: 'project' as const, id: p.id, world: this.group.localToWorld(this.meshes[i]!.mesh.position.clone()), radiusPx: 52, label: p.title, sub: p.category }])) }
  worldOf(id: number) { const i = this.items.findIndex(p => p.id === id); return i >= 0 ? this.group.localToWorld(this.meshes[i]!.mesh.position.clone()) : null }
  dispose() { this.d.all() }
}

/* ─────────── Destination : le dernier portail et la scène de contact ─────────── */
export class ContactChapter implements Chapter {
  readonly id = 'contact' as const
  readonly group = new THREE.Group()
  readonly depth = 10
  readonly portal: PortalVFX
  private state = { calm: 0 }
  constructor(deps: ChapterDeps) {
    this.portal = new PortalVFX(deps.theme, { radius: 4.6, mode: 'opaque', noise: deps.noise, sparks: deps.quality.tier === 'low' ? 36 : 80, dither: deps.content.settings.visuals.dither })
    this.portal.group.position.set(0, 0, -4); this.portal.setOpen(1); this.portal.setInflow(0.35); this.portal.setSpeed(0.7)
    this.group.add(this.portal.group)
  }
  poses(l: Layout): Pose[] {
    const d = Math.max(fitDistance(11, 11, l), 15)
    return [frame([0, 0, -4], d + 4, l, { dy: 0.4 }), frame([0, 0, -4], d - 1.5, l, { dy: 0.1 })]
  }
  timeline(tl: gsap.core.Timeline, t0: number, t1: number) { tl.to(this.state, { calm: 1, duration: t1 - t0, ease: 'power1.out' }, t0) }
  update(c: FrameCtx) { this.portal.setSpeed(0.9 - this.state.calm * 0.5); this.portal.update(c.dt, c.motion) }
  pickables() { return [] }
  dispose() { this.portal.dispose() }
}
