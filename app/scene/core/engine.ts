import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import type gsap from 'gsap'
import type { ChapterId } from '#shared/presets'
import type { Theme } from '#shared/theme'
import type { PublicContent } from '#shared/types'
import type { SectionPlan } from '#shared/sections'
import { AdaptiveQuality, detectTier, profileFor, type Quality } from './quality'
import { ThemeBridge } from './theme-bridge'
import { makeTileableNoise } from './noise'
import { WARP } from './shaders'
import type { Chapter, ChapterDeps, Layout, Pickable, Pose, SceneUi } from './types'
import { Sky, SpaceDust, StarField, applyStencil } from '../objects/sky'
import { AboutChapter, HomeChapter, PortalChapter } from '../chapters/home-portal-about'
import { SkillsChapter } from '../chapters/skills'
import { AchievementsChapter, CertificationsChapter, EducationChapter, ExperiencesChapter } from '../chapters/timeline-chapters'
import { ContactChapter, ProjectsChapter } from '../chapters/projects-contact'

export interface EngineOptions {
  canvas: HTMLCanvasElement
  content: PublicContent
  plan: SectionPlan
  theme: Theme
  ui: SceneUi
  reducedMotion: boolean
  onPick: (p: Pickable) => void
  onHover: (p: Pickable | null) => void
  onCrossed: (crossed: boolean) => void
  onQuality: (q: Quality, step: number) => void
  onLost: () => void
}
export interface Anchor { el: HTMLElement, world: () => THREE.Vector3 | null, chapter: ChapterId | null, dx?: number, dy?: number }
export interface SectionMetric { id: ChapterId, top: number, height: number }
export interface CamState { px: number, py: number, pz: number, lx: number, ly: number, lz: number, fov: number }

const CHAPTER_GAP = 26

export class SpaceEngine {
  readonly renderer: THREE.WebGLRenderer
  readonly scene = new THREE.Scene()
  readonly camera = new THREE.PerspectiveCamera(50, 1, 0.1, 2400)
  readonly bridge: ThemeBridge
  readonly quality: Quality
  readonly cam: CamState = { px: 0, py: 0.5, pz: 16, lx: 0, ly: 0, lz: 0, fov: 50 }
  chapters: Chapter[] = []
  readonly byId = new Map<ChapterId, Chapter>()
  timeline: gsap.core.Timeline | null = null
  metrics = new Map<ChapterId, { t0: number, t1: number }>()
  crossed = false
  hover: Pickable | null = null
  private composer: EffectComposer | null = null
  private warp: ShaderPass | null = null
  private bloom: UnrealBloomPass | null = null
  private skyA: Sky; private skyB: Sky
  private starsA: StarField; private starsB: StarField
  private dust: SpaceDust
  private noise: THREE.Texture
  private adaptive: AdaptiveQuality
  private anchors = new Set<Anchor>()
  private time = 0
  private last = 0
  private pointer = new THREE.Vector2(0, 0)
  private pointerSmooth = new THREE.Vector2(0, 0)
  private pointerPx: { x: number, y: number } | null = null
  private pickCounter = 0
  private disposed = false
  private ro: ResizeObserver
  private tapStart: { x: number, y: number } | null = null
  private motion: number
  private baseExposure = 1
  private opts: EngineOptions
  private v = new THREE.Vector3()
  layout: Layout

  constructor(opts: EngineOptions) {
    this.opts = opts
    const { canvas } = opts
    const gl2 = canvas.getContext('webgl2', { stencil: true, antialias: false, powerPreference: 'high-performance' }) as WebGL2RenderingContext | null
    if (!gl2) throw new Error('WebGL2 indisponible')
    const tier = detectTier({ reducedMotion: opts.reducedMotion, gl: gl2 })
    this.quality = profileFor(tier, window.devicePixelRatio || 1)
    this.renderer = new THREE.WebGLRenderer({ canvas, context: gl2, antialias: false, stencil: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(this.quality.pixelRatio)
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.motion = opts.reducedMotion ? 0.12 : 1
    this.bridge = new ThemeBridge(opts.theme)
    this.noise = makeTileableNoise(256, 4)
    this.scene.background = null
    this.scene.fog = new THREE.FogExp2(0x05060f, 0.0035)

    const px = this.quality.pixelRatio * 1
    this.skyA = new Sky(this.bridge, 0); this.skyB = new Sky(this.bridge, 1)
    this.starsA = new StarField(this.bridge, 11, this.quality.stars, px); this.starsB = new StarField(this.bridge, 23, this.quality.stars, px)
    this.dust = new SpaceDust(this.bridge, Math.round(1400 * this.quality.particles * opts.content.settings.visuals.particleDensity), px)
    this.scene.add(this.skyA.mesh, this.skyB.mesh, this.starsA.group, this.starsB.group, this.dust.points)
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.35), new THREE.HemisphereLight(0x8899ff, 0x080818, 0.5))

    this.layout = this.measureLayout()
    this.buildChapters(opts.content, opts.plan)
    this.setupComposer()
    this.applyVisuals(opts.content.settings.visuals)
    this.adaptive = new AdaptiveQuality(this.quality, (q, step) => { this.applyQuality(); opts.onQuality(q, step) })
    this.bridge.onChange((t) => { (this.scene.fog as THREE.FogExp2).color.setStyle(t.background) })
    ;(this.scene.fog as THREE.FogExp2).color.setStyle(opts.theme.background)

    canvas.addEventListener('pointermove', this.onMove, { passive: true })
    canvas.addEventListener('pointerleave', this.onLeave, { passive: true })
    canvas.addEventListener('pointerdown', this.onDown, { passive: true })
    canvas.addEventListener('pointerup', this.onUp, { passive: true })
    canvas.addEventListener('webglcontextlost', this.onLost as EventListener)
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(canvas.parentElement ?? canvas)
    this.resize()
    void this.loadNoiseOverride()
  }

  /**
   * Remplacement facultatif du bruit du portail : déposez une image tuilable dans public/assets/portal/noise.png
   * (équivalent de la texture de bruit du projet Godot). Sans fichier, un bruit procédural tuilable est utilisé.
   */
  private async loadNoiseOverride() {
    try {
      const head = await fetch('/assets/portal/noise.png', { method: 'HEAD' })
      if (!head.ok || !(head.headers.get('content-type') ?? '').startsWith('image/')) return
      const tex = await new THREE.TextureLoader().loadAsync('/assets/portal/noise.png')
      if (this.disposed) { tex.dispose(); return }
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.colorSpace = THREE.NoColorSpace
      this.noise.dispose(); this.noise = tex
      for (const c of this.chapters) if (c instanceof PortalChapter || c instanceof ContactChapter) c.portal.setNoise(tex)
    } catch { /* aucun fichier de remplacement : le bruit procédural reste en place */ }
  }

  /* ───────── Monde : chapitres placés le long de −z selon le plan réellement publié ───────── */
  private buildChapters(content: PublicContent, plan: SectionPlan) {
    const deps: ChapterDeps = { theme: this.bridge, quality: this.quality, content, noise: this.noise }
    const px = this.quality.pixelRatio
    for (const s of plan.sections) {
      let c: Chapter | null = null
      switch (s.id) {
        case 'home': c = new HomeChapter(deps, px); break
        case 'portal': c = new PortalChapter(deps); break
        case 'about': c = new AboutChapter(deps); break
        case 'skills': c = new SkillsChapter(deps); break
        case 'education': c = new EducationChapter(deps, content.education); break
        case 'experiences': c = new ExperiencesChapter(deps, content.experiences); break
        case 'certifications': c = new CertificationsChapter(deps, content.certifications); break
        case 'achievements': c = new AchievementsChapter(deps, content.achievements); break
        case 'projects': c = new ProjectsChapter(deps, content.projects); break
        case 'contact': c = new ContactChapter(deps); break
      }
      if (c) { this.chapters.push(c); this.byId.set(c.id, c); this.scene.add(c.group) }
    }
    let z = 0
    this.chapters.forEach((c, i) => {
      if (c.id === 'home') z = 0
      else if (c.id === 'portal') z = -34
      else { const prev = this.chapters[i - 1]!; z = prev.group.position.z - (prev.id === 'portal' ? 28 : prev.depth + CHAPTER_GAP) }
      c.group.position.set(0, 0, z)
    })
    this.updateDimension(true)
  }

  /** Reconstruit le monde (nouveau contenu ou nouveau plan de sections, p. ex. après un aperçu). */
  rebuild(content: PublicContent, plan: SectionPlan) {
    for (const c of this.chapters) { this.scene.remove(c.group); c.dispose() }
    this.chapters = []; this.byId.clear(); this.opts.content = content; this.opts.plan = plan
    this.buildChapters(content, plan)
    this.dust.setDensity(content.settings.visuals.particleDensity * this.quality.particles)
  }

  /* ───────── Rendu ───────── */
  private setupComposer() {
    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2())
    if (!this.quality.bloom && !this.quality.warp) { this.composer = null; return }
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, stencilBuffer: true, depthBuffer: true, samples: this.quality.tier === 'high' ? 4 : 0 })
    this.composer = new EffectComposer(this.renderer, rt)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    this.warp = new ShaderPass({ uniforms: { tDiffuse: { value: null }, uCenter: { value: new THREE.Vector2(0.5, 0.5) }, uStrength: { value: 0 }, uAspect: { value: 1 }, uTime: this.bridge.u.uTime }, vertexShader: WARP.vert, fragmentShader: WARP.frag })
    this.warp.enabled = false
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.9, 0.55, 0.12)
    this.composer.addPass(this.warp); this.composer.addPass(this.bloom); this.composer.addPass(new OutputPass())
    this.composer.setPixelRatio(this.quality.pixelRatio)
  }
  private applyQuality() {
    this.renderer.setPixelRatio(this.quality.pixelRatio); this.composer?.setPixelRatio(this.quality.pixelRatio)
    this.starsA.setPixel(this.quality.pixelRatio); this.starsB.setPixel(this.quality.pixelRatio); this.dust.setPixel(this.quality.pixelRatio)
    this.starsA.setDensity(this.quality.stars); this.starsB.setDensity(this.quality.stars)
    this.dust.setDensity(this.opts.content.settings.visuals.particleDensity * this.quality.particles)
    this.chapters.forEach(c => c.setQuality?.(this.quality))
    this.resize()
  }
  applyVisuals(v: PublicContent['settings']['visuals']) {
    this.baseExposure = v.globalLight
    this.dust.setDensity(v.particleDensity * this.quality.particles)
    for (const c of this.chapters) if (c instanceof PortalChapter || c instanceof ContactChapter) c.portal.setDither(v.dither)
  }
  setTheme(t: Theme) { this.bridge.set(t) }
  setVisuals(v: PublicContent['settings']['visuals']) { this.opts.content.settings.visuals = v; this.applyVisuals(v) }

  measureLayout(): Layout {
    const w = this.opts.canvas.clientWidth || window.innerWidth, h = this.opts.canvas.clientHeight || window.innerHeight
    return { aspect: w / Math.max(h, 1), mobile: w < 768 || w / h < 0.85, fov: w / h < 0.85 ? 62 : 50 }
  }
  resize() {
    const w = Math.max(1, this.opts.canvas.clientWidth), h = Math.max(1, this.opts.canvas.clientHeight)
    this.renderer.setSize(w, h, false); this.composer?.setSize(w, h)
    const prev = this.layout
    this.layout = this.measureLayout()
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix()
    if (this.warp) this.warp.uniforms.uAspect!.value = w / h
    if (prev && (prev.mobile !== this.layout.mobile)) this.opts.onQuality(this.quality, -1) // signale un changement de mise en page → timeline reconstruite
  }

  /* ───────── Timeline ───────── */
  poseWorld(c: Chapter, p: Pose): CamState {
    const o = c.group.position
    return { px: p.pos[0] + o.x, py: p.pos[1] + o.y, pz: p.pos[2] + o.z, lx: p.look[0] + o.x, ly: p.look[1] + o.y, lz: p.look[2] + o.z, fov: p.fov ?? this.layout.fov }
  }

  /* ───────── Ancres HTML projetées ───────── */
  addAnchor(a: Anchor) { this.anchors.add(a); return () => { this.anchors.delete(a) } }
  private updateAnchors() {
    const w = this.opts.canvas.clientWidth, h = this.opts.canvas.clientHeight
    for (const a of this.anchors) {
      const chapterOk = !a.chapter || this.byId.get(a.chapter)?.group.visible
      const p = chapterOk ? a.world() : null
      if (!p) { a.el.style.visibility = 'hidden'; continue }
      this.v.copy(p).project(this.camera)
      if (this.v.z > 1 || Math.abs(this.v.x) > 1.15 || Math.abs(this.v.y) > 1.15) { a.el.style.visibility = 'hidden'; continue }
      a.el.style.visibility = 'visible'
      a.el.style.transform = `translate3d(${((this.v.x * 0.5 + 0.5) * w + (a.dx ?? 0)).toFixed(1)}px, ${((-this.v.y * 0.5 + 0.5) * h + (a.dy ?? 0)).toFixed(1)}px, 0)`
    }
  }

  /* ───────── Sélection 3D (distance écran : fiable pour points, instances et maillages) ───────── */
  private nearestPickable(): Pickable | null {
    if (!this.pointerPx) return null
    const w = this.opts.canvas.clientWidth, h = this.opts.canvas.clientHeight
    let best: Pickable | null = null, bestD = Infinity
    for (const c of this.chapters) {
      if (!c.group.visible) continue
      for (const p of c.pickables()) {
        this.v.copy(p.world).project(this.camera)
        if (this.v.z > 1 || this.v.z < -1) continue
        const dx = (this.v.x * 0.5 + 0.5) * w - this.pointerPx.x, dy = (-this.v.y * 0.5 + 0.5) * h - this.pointerPx.y, d = Math.hypot(dx, dy)
        if (d < p.radiusPx && d < bestD) { best = p; bestD = d }
      }
    }
    return best
  }
  private setHover(p: Pickable | null) {
    if ((p?.key ?? null) === (this.hover?.key ?? null)) return
    this.hover = p; this.opts.ui.pointerKey = p?.key ?? null; this.opts.canvas.style.cursor = p ? 'pointer' : ''
    this.opts.onHover(p)
  }
  private local(e: PointerEvent) { const r = this.opts.canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top } }
  private onMove = (e: PointerEvent) => {
    const p = this.local(e); this.pointerPx = p
    this.pointer.set((p.x / this.opts.canvas.clientWidth) * 2 - 1, -((p.y / this.opts.canvas.clientHeight) * 2 - 1))
    if (e.pointerType === 'mouse') this.setHover(this.nearestPickable())
  }
  private onLeave = () => { this.pointerPx = null; this.setHover(null) }
  private onDown = (e: PointerEvent) => { this.tapStart = this.local(e) }
  private onUp = (e: PointerEvent) => {
    const s = this.tapStart, p = this.local(e); this.tapStart = null
    if (!s || Math.hypot(p.x - s.x, p.y - s.y) > 10) return // défilement tactile : pas un tap
    this.pointerPx = p
    const hit = this.nearestPickable()
    if (hit) { this.opts.onPick(hit); if (e.pointerType !== 'mouse') this.setHover(null) }
  }
  private onLost = (e: Event) => { e.preventDefault(); this.opts.onLost() }

  /* ───────── Dimensions : avant la traversée on ne voit l'autre dimension qu'à travers le disque du portail ───────── */
  private updateDimension(force = false) {
    const portal = this.byId.get('portal')
    const crossed = portal ? this.camera.position.z < portal.group.position.z - 0.5 : true
    if (crossed === this.crossed && !force) return
    this.crossed = crossed
    const hasPortal = !!portal
    this.skyA.mesh.visible = !(crossed && hasPortal); this.starsA.group.visible = !(crossed && hasPortal)
    this.skyB.setStencil(crossed || !hasPortal ? 'none' : 'inside'); this.starsB.setStencil(crossed || !hasPortal ? 'none' : 'inside'); this.starsA.setStencil(hasPortal ? 'outside' : 'none')
    this.skyB.mesh.visible = hasPortal; this.starsB.group.visible = hasPortal
    for (const c of this.chapters) {
      if (c.id === 'home' || c.id === 'portal') continue
      this.stencilDeep(c.group, crossed || !hasPortal ? 'none' : 'inside')
    }
    this.opts.onCrossed(crossed)
  }
  private stencilDeep(g: THREE.Object3D, mode: 'none' | 'inside') {
    g.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined
      if (!m) return
      for (const mat of Array.isArray(m) ? m : [m]) {
        // les portails (matériaux ShaderMaterial des chapitres finaux) ne sont pas concernés : ils sont dans la dimension d'arrivée
        applyStencil(mat, mode)
      }
    })
  }

  /* ───────── Boucle ───────── */
  /**
   * Une seule boucle d'images : SceneCanvas appelle `step` depuis gsap.ticker (après Lenis et ScrollTrigger),
   * ce qui garantit que caméra, timeline et rendu lisent la même position de défilement.
   */
  step = () => {
    if (this.disposed) return
    const now = performance.now(), dtMs = this.last ? now - this.last : 16.7
    this.last = now
    this.frame(Math.min(0.1, dtMs / 1000), dtMs)
  }
  start() { this.last = 0 }
  private frame(dt: number, dtMs: number) {
    this.adaptive.sample(dtMs)
    this.time += dt; this.bridge.u.uTime.value = this.time
    const c = this.cam
    this.pointerSmooth.lerp(this.pointer, 1 - Math.exp(-3 * dt))
    const par = this.layout.mobile ? 0 : this.motion
    this.camera.position.set(c.px + this.pointerSmooth.x * 0.45 * par, c.py + this.pointerSmooth.y * 0.25 * par, c.pz)
    this.camera.lookAt(c.lx, c.ly, c.lz)
    if (Math.abs(this.camera.fov - c.fov) > 0.01) { this.camera.fov = c.fov; this.camera.updateProjectionMatrix() }
    this.camera.updateMatrixWorld()
    this.updateDimension()

    this.skyA.mesh.position.copy(this.camera.position); this.skyB.mesh.position.copy(this.camera.position)
    this.starsA.follow(this.camera.position); this.starsB.follow(this.camera.position); this.dust.follow(this.camera.position)

    const tl = this.timeline, tm = tl ? tl.time() : 0
    const ui = this.opts.ui, cam = this.camera
    const hovered = (k: string) => k === ui.focusKey || k === ui.pointerKey
    for (const ch of this.chapters) {
      const z = ch.group.position.z, d = Math.abs(cam.position.z - z)
      const near = d < ch.depth + 70
      const portalBefore = !this.crossed && ch.id !== 'home' && ch.id !== 'portal'
      const isAbout = ch.id === 'about'
      const inDimension = ch.id === 'home' || ch.id === 'portal' ? !this.crossed : (this.crossed || (isAbout && d < 110))
      ch.group.visible = near && inDimension && !(portalBefore && !isAbout)
      if (!ch.group.visible) continue
      const m = this.metrics.get(ch.id)
      const local = m && m.t1 > m.t0 ? Math.min(1, Math.max(0, (tm - m.t0) / (m.t1 - m.t0))) : 0
      ch.update({ time: this.time, dt, local, near, camera: cam, ui, motion: this.motion, hovered })
    }
    if (++this.pickCounter % 6 === 0 && this.pointerPx && !this.tapStart) this.setHover(this.nearestPickable())

    this.updateEffects()
    this.updateAnchors()
    if (this.composer) this.composer.render(dt); else this.renderer.render(this.scene, this.camera)
  }

  private updateEffects() {
    const v = this.opts.content.settings.visuals, portal = this.byId.get('portal') as PortalChapter | undefined
    let flash = 0
    if (portal) {
      const s = portal.state, dz = this.camera.position.z - portal.group.position.z
      flash = s.flash
      const near = Math.max(0, 1 - Math.abs(dz) / 40)
      const warpStrength = (near * 0.25 + s.traverse * 1.0 + s.flash * 0.6) * (this.motion < 0.5 ? 0.25 : 1)
      if (this.warp) {
        this.v.copy(portal.group.position).project(this.camera)
        ;(this.warp.uniforms.uCenter!.value as THREE.Vector2).set(this.v.x * 0.5 + 0.5, this.v.y * 0.5 + 0.5)
        this.warp.uniforms.uStrength!.value = warpStrength
        this.warp.enabled = v.warp && this.quality.warp && warpStrength > 0.01 && this.v.z < 1
      }
    }
    if (this.bloom) { this.bloom.enabled = v.bloom && this.quality.bloom; this.bloom.strength = v.bloomStrength * (0.9 + flash * 1.6) * this.bridge.u.uIntensity.value }
    this.renderer.toneMappingExposure = this.baseExposure * (1 + flash * 0.6)
    this.skyA.setBrightness(this.bridge.u.uIntensity.value * (this.quality.skyDetail ? 1 : 0.85)); this.skyB.setBrightness(this.bridge.u.uIntensity.value)
  }

  dispose() {
    this.disposed = true; this.ro.disconnect()
    const cv = this.opts.canvas
    cv.removeEventListener('pointermove', this.onMove); cv.removeEventListener('pointerleave', this.onLeave); cv.removeEventListener('pointerdown', this.onDown); cv.removeEventListener('pointerup', this.onUp); cv.removeEventListener('webglcontextlost', this.onLost as EventListener)
    this.timeline?.kill(); this.chapters.forEach(c => c.dispose()); this.chapters = []
    this.skyA.dispose(); this.skyB.dispose(); this.starsA.dispose(); this.starsB.dispose(); this.dust.dispose(); this.noise.dispose()
    this.composer?.dispose(); this.renderer.dispose(); this.anchors.clear()
  }
}
