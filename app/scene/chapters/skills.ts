import * as THREE from 'three'
import type { PublicSkill } from '#shared/types'
import type { Chapter, ChapterDeps, FrameCtx, Layout, Pose, Pickable } from '../core/types'
import { HEX_ATLAS } from '../core/shaders'
import { buildStation, STATION, type StationParts } from '../objects/station'
import { Disposer, damp, fitDistance, frame, initialsOf, makeIconTexture, spiralHex } from './common'

const HEX_R = 0.5, HEX_STEP = 0.56
const ATLAS_COLS = 6, CELL = 128

/** Compétences : station signature (1 noyau, 1 bras, 1 module) et constellation hexagonale ; l'arbre RPG est un composant HTML/SVG. */
export class SkillsChapter implements Chapter {
  readonly id = 'skills' as const
  readonly group = new THREE.Group()
  readonly depth = 10
  private d = new Disposer()
  private station: StationParts
  private stationPivot = new THREE.Group()
  private hexGroup = new THREE.Group()
  private skills: PublicSkill[]
  private view: 'station' | 'hex' | 'tree' = 'station'
  private vStation = 1
  private vHex = 0
  private featuredId: number | null = null
  private icons = new Map<number, THREE.CanvasTexture>()
  private hex: { mesh: THREE.InstancedMesh, atlas: THREE.InstancedMesh, edges: THREE.LineSegments, items: PublicSkill[], pos: THREE.Vector3[], lift: Float32Array, appear: Float32Array, lifts: THREE.InstancedBufferAttribute, tints: THREE.InstancedBufferAttribute, alphas: THREE.InstancedBufferAttribute } | null = null
  private hexKey = ''
  private hexBodyMat: THREE.MeshStandardMaterial
  private hexEdgeMat: THREE.LineBasicMaterial
  private atlasTex: THREE.CanvasTexture | null = null
  private dummy = new THREE.Object3D()
  moduleWorld = new THREE.Vector3()
  private tmp = new THREE.Vector3()

  constructor(private deps: ChapterDeps) {
    this.skills = deps.content.skills
    this.station = buildStation(deps.theme)
    this.station.group.position.x = -2.3 // centre visuel de la station (de l’anneau gauche au module)
    this.stationPivot.add(this.station.group)
    this.group.add(this.stationPivot, this.hexGroup)
    const l = new THREE.PointLight(0xffffff, 30, 30, 2); l.position.set(0, 4, 6); l.color.copy(deps.theme.u.uStationA.value); this.group.add(l)
    const l2 = new THREE.PointLight(0xffffff, 18, 30, 2); l2.position.set(-5, -3, 5); l2.color.copy(deps.theme.u.uStationB.value); this.group.add(l2)
    deps.theme.onChange(() => { l.color.copy(deps.theme.u.uStationA.value); l2.color.copy(deps.theme.u.uStationB.value) })
    this.hexBodyMat = this.d.add(new THREE.MeshStandardMaterial({ color: 0x141a2c, metalness: 0.85, roughness: 0.32 }))
    this.hexEdgeMat = this.d.add(new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, toneMapped: false }))
    const paint = () => this.hexEdgeMat.color.copy(deps.theme.u.uGlow.value).multiplyScalar(1.6)
    paint(); deps.theme.onChange(paint)
    this.setFeatured(null)
  }

  private skillColor(s: PublicSkill) { return this.deps.theme.colorOf(s.color, this.deps.theme.u.uStationA.value) }
  private icon(s: PublicSkill) {
    let t = this.icons.get(s.id)
    if (!t) { t = makeIconTexture(s.name, this.skillColor(s)); this.icons.set(s.id, t); this.d.add(t) }
    return t
  }
  setFeatured(id: number | null) {
    const list = this.skills.filter(s => s.allowedModes.includes('station'))
    const pick = list.find(s => s.id === id) ?? list.find(s => s.featured) ?? list[0] ?? null
    if (pick?.id === this.featuredId) return
    this.featuredId = pick?.id ?? null
    if (!pick) { this.station.setSkill(this.deps.theme.u.uStationA.value, null); return }
    this.station.setSkill(this.skillColor(pick), this.icon(pick)); this.station.flash()
  }
  get featured() { return this.skills.find(s => s.id === this.featuredId) ?? null }

  poses(l: Layout): Pose[] {
    const w = STATION.moduleCenter.x + STATION.coreRadius + 1.4
    const dist = Math.max(fitDistance(w * 1.15, 5.2, l), 11)
    return [frame([0, 0, 0], dist + 2, l, { dy: 1.1 }), frame([0, 0, 0], dist - 0.4, l, { dy: 0.7 })]
  }

  private filtered(ui: FrameCtx['ui']) {
    return this.skills.filter(s => s.allowedModes.includes('hex') && (!ui.skillCategory || s.category === ui.skillCategory))
  }

  private buildHex(ui: FrameCtx['ui']) {
    const all = this.filtered(ui), size = ui.hexPageSize
    const pages = Math.max(1, Math.ceil(all.length / size)), page = Math.min(ui.skillPage, pages - 1)
    const items = [...all].sort((a, b) => a.category.localeCompare(b.category) || a.sortOrder - b.sortOrder).slice(page * size, page * size + size)
    const key = items.map(i => i.id).join(',') + '|' + this.skills.length
    if (key === this.hexKey) return
    this.hexKey = key
    if (this.hex) { this.hexGroup.remove(this.hex.mesh, this.hex.atlas, this.hex.edges); this.hex.mesh.dispose(); this.hex.atlas.geometry.dispose(); this.hex.edges.geometry.dispose() }
    const n = items.length
    if (!n) { this.hex = null; return }
    // Atlas d'initiales (une texture pour toutes les alvéoles de la page).
    this.atlasTex?.dispose()
    const rows = Math.ceil(n / ATLAS_COLS), cv = document.createElement('canvas'); cv.width = ATLAS_COLS * CELL; cv.height = rows * CELL
    const g = cv.getContext('2d')!
    items.forEach((s, i) => {
      const x = (i % ATLAS_COLS) * CELL, y = Math.floor(i / ATLAS_COLS) * CELL, hex = '#' + this.skillColor(s).clone().convertLinearToSRGB().getHexString()
      g.fillStyle = 'rgba(0,0,0,0)'; g.clearRect(x, y, CELL, CELL)
      g.fillStyle = hex; g.globalAlpha = 0.22; g.fillRect(x, y, CELL, CELL); g.globalAlpha = 1
      g.fillStyle = '#ffffff'; g.font = `700 ${CELL * 0.4}px "Bricolage Grotesque Variable", system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'
      g.fillText(initialsOf(s.name), x + CELL / 2, y + CELL / 2)
    })
    this.atlasTex = new THREE.CanvasTexture(cv); this.atlasTex.colorSpace = THREE.SRGBColorSpace

    const body = new THREE.CylinderGeometry(HEX_R, HEX_R, 0.26, 6, 1); body.rotateX(Math.PI / 2)
    const mesh = new THREE.InstancedMesh(body, this.hexBodyMat, n); mesh.frustumCulled = false; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3)
    const plane = new THREE.PlaneGeometry(0.78, 0.78)
    const rect = new Float32Array(n * 4), lifts = new Float32Array(n), tints = new Float32Array(n * 3), alphas = new Float32Array(n).fill(1)
    items.forEach((s, i) => {
      rect.set([(i % ATLAS_COLS) / ATLAS_COLS, 1 - (Math.floor(i / ATLAS_COLS) + 1) / rows, 1 / ATLAS_COLS, 1 / rows], i * 4)
      const c = this.skillColor(s); tints.set([c.r, c.g, c.b], i * 3)
    })
    plane.setAttribute('aUvRect', new THREE.InstancedBufferAttribute(rect, 4)); const liftA = new THREE.InstancedBufferAttribute(lifts, 1); liftA.setUsage(THREE.DynamicDrawUsage)
    const tintA = new THREE.InstancedBufferAttribute(tints, 3), alphaA = new THREE.InstancedBufferAttribute(alphas, 1); alphaA.setUsage(THREE.DynamicDrawUsage)
    plane.setAttribute('aLift', liftA); plane.setAttribute('aTint', tintA); plane.setAttribute('aAlpha', alphaA)
    const am = new THREE.ShaderMaterial({ vertexShader: HEX_ATLAS.vert, fragmentShader: HEX_ATLAS.frag, uniforms: { uAtlas: { value: this.atlasTex } }, transparent: true, depthWrite: false })
    const atlas = new THREE.InstancedMesh(plane, am, n); atlas.frustumCulled = false; atlas.instanceMatrix.setUsage(THREE.DynamicDrawUsage)

    // Placement en spirale hexagonale : les catégories (triées) occupent des secteurs voisins ; relief doux par bruit.
    const pos = spiralHex(n).map(([q, r], i) => new THREE.Vector3(HEX_STEP * Math.sqrt(3) * (q + r / 2), -HEX_STEP * 1.5 * r, Math.sin(i * 1.7) * 0.18))
    const e: number[] = []
    for (let i = 0; i < n; i++) for (let k = 0; k < 6; k++) {
      const a0 = (Math.PI / 3) * k + Math.PI / 2, a1 = a0 + Math.PI / 3, R = HEX_R * 1.0
      e.push(pos[i]!.x + Math.cos(a0) * R, pos[i]!.y + Math.sin(a0) * R, pos[i]!.z + 0.14, pos[i]!.x + Math.cos(a1) * R, pos[i]!.y + Math.sin(a1) * R, pos[i]!.z + 0.14)
    }
    const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.Float32BufferAttribute(e, 3))
    const edges = new THREE.LineSegments(eg, this.hexEdgeMat); edges.frustumCulled = false
    this.hexGroup.add(mesh, atlas, edges)
    this.hex = { mesh, atlas, edges, items, pos, lift: new Float32Array(n), appear: new Float32Array(n), lifts: liftA, tints: tintA, alphas: alphaA }
  }

  update(c: FrameCtx) {
    const ui = c.ui
    if (ui.skillView !== this.view) this.view = ui.skillView
    this.setFeatured(ui.skillFeatured)
    this.vStation = damp(this.vStation, this.view === 'station' ? 1 : 0, 6, c.dt); this.vHex = damp(this.vHex, this.view === 'hex' ? 1 : 0, 6, c.dt)
    const t = c.time * c.motion
    this.stationPivot.visible = this.vStation > 0.01
    this.stationPivot.scale.setScalar(Math.max(0.001, this.vStation)); this.stationPivot.rotation.y = Math.sin(t * 0.22) * 0.32 - 0.12
    this.station.update(c.dt, c.time, c.motion)
    this.station.module.getWorldPosition(this.moduleWorld)

    this.hexGroup.visible = this.vHex > 0.01
    if (this.view === 'hex' || this.vHex > 0.01) {
      this.buildHex(ui)
      const h = this.hex
      if (h) {
        this.hexGroup.scale.setScalar(Math.max(0.001, this.vHex))
        this.hexGroup.rotation.set(-0.32 + Math.sin(t * 0.3) * 0.04, 0.24 + Math.sin(t * 0.2) * 0.08, 0)
        const base = new THREE.Color()
        h.items.forEach((s, i) => {
          const hov = c.hovered(`skill:${s.id}`)
          h.appear[i] = Math.min(1, h.appear[i]! + c.dt * (1.6 + (i % 5) * 0.12))
          const ease = 1 - Math.pow(1 - h.appear[i]!, 3)
          h.lift[i] = damp(h.lift[i]!, hov ? 1 : 0, 10, c.dt)
          const L = h.lift[i]!, sc = ease * (1 + L * 0.14)
          this.dummy.position.copy(h.pos[i]!); this.dummy.position.z += L * 0.3 + (1 - ease) * -1.2
          this.dummy.rotation.set(0, 0, 0); this.dummy.scale.setScalar(sc); this.dummy.updateMatrix(); h.mesh.setMatrixAt(i, this.dummy.matrix)
          this.dummy.position.z += 0.145; this.dummy.updateMatrix(); h.atlas.setMatrixAt(i, this.dummy.matrix)
          base.copy(this.skillColor(s)).multiplyScalar(0.18 + L * 0.9); h.mesh.setColorAt(i, base)
          h.lifts.setX(i, L)
        })
        h.mesh.instanceMatrix.needsUpdate = true; h.atlas.instanceMatrix.needsUpdate = true; if (h.mesh.instanceColor) h.mesh.instanceColor.needsUpdate = true; h.lifts.needsUpdate = true
      }
    }
  }

  pickables(): Pickable[] {
    const out: Pickable[] = []
    if (this.view === 'station' && this.vStation > 0.5) {
      const f = this.featured
      if (f) out.push({ key: `skill:${f.id}`, kind: 'skill', id: f.id, world: this.moduleWorld.clone(), radiusPx: 70, label: f.name, sub: f.category })
    }
    if (this.view === 'hex' && this.vHex > 0.5 && this.hex) {
      this.hexGroup.updateMatrixWorld()
      this.hex.items.forEach((s, i) => out.push({ key: `skill:${s.id}`, kind: 'skill', id: s.id, world: this.tmp.copy(this.hex!.pos[i]!).applyMatrix4(this.hexGroup.matrixWorld).clone(), radiusPx: 36, label: s.name, sub: s.category }))
    }
    return out
  }
  hexWorldOf(id: number) { const i = this.hex?.items.findIndex(s => s.id === id) ?? -1; return i >= 0 ? this.hexGroup.localToWorld(this.hex!.pos[i]!.clone()) : null }
  setQuality() { /* géométrie légère : rien à adapter */ }
  dispose() { this.station.dispose(); this.hex?.mesh.dispose(); this.hex?.atlas.dispose(); this.atlasTex?.dispose(); this.d.all() }
}
