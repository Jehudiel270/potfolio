import * as THREE from 'three'
import { PORTAL, PORTAL_GLOW, PORTAL_SPARKS, PORTAL_STENCIL } from '../core/shaders'
import type { ThemeBridge } from '../core/theme-bridge'

export interface PortalOptions {
  /** Rayon du portail dans la scène (le quad d'origine mesure 2 × 2, soit un rayon de 1). */
  radius: number
  /** « stencil » : l'intérieur révèle une autre dimension (défaut du projet Godot) ; « opaque » : disque plein. */
  mode: 'stencil' | 'opaque'
  noise: THREE.Texture
  sparks?: number
  dither?: boolean
}

/**
 * Portail dimensionnel : port GLSL fidèle du « PortalVFX » fourni (StencilMesh + PortalMesh + GlowMesh + étincelles + lumière).
 * Valeurs d'origine conservées : 8 couches, depth 0,5, density 0,4, shrink 0,5, shape_warp 0,1, motion spin 0,1 / inward 0,2 / base 0,2.
 */
export class PortalVFX {
  readonly group = new THREE.Group()
  readonly stencilRef = 1
  private readonly uniforms: Record<string, THREE.IUniform>
  private readonly glowUniforms: Record<string, THREE.IUniform>
  private readonly sparkUniforms: Record<string, THREE.IUniform>
  private readonly stencilUniforms: Record<string, THREE.IUniform>
  readonly light: THREE.PointLight
  private readonly rings: THREE.Mesh[] = []
  private disposables: { dispose(): void }[] = []
  open = 1
  private _inflow = 0

  constructor(private readonly theme: ThemeBridge, readonly opts: PortalOptions) {
    const t = theme.u
    this.uniforms = {
      uTime: t.uTime, uSize: { value: new THREE.Vector2(2, 2) }, uNoise: { value: opts.noise },
      uPrimary: t.uPortalA, uSecondary: t.uPortalB, uEmission: { value: 1.1 },
      uShapeWarp: { value: 0.1 }, uOpen: { value: 1 }, uDensity: { value: 0.4 }, uEdgeSoft: { value: 0.5 }, uShrink: { value: 0.5 },
      uLayers: { value: 8 }, uDepthAmount: { value: 0.5 }, uDepthMult: { value: 1 }, uFadeAmount: { value: 1 }, uFadeMult: { value: 1 },
      uSpeed: { value: 1 }, uSpin: { value: 0.1 }, uInward: { value: 0.2 }, uBase: { value: 0.2 },
      uMode: { value: opts.mode === 'stencil' ? 2 : 0 }, uDither: { value: !!opts.dither }, uAlpha: { value: 1 },
    }
    this.glowUniforms = {
      uTime: t.uTime, uSize: { value: new THREE.Vector2(2, 2) }, uNoise: { value: opts.noise }, uPrimary: t.uPortalA, uSecondary: t.uPortalB,
      uEmission: { value: 1.4 }, uShapeWarp: this.uniforms.uShapeWarp!, uOpen: this.uniforms.uOpen!, uEdgeSoft: { value: 0.5 }, uSpeed: this.uniforms.uSpeed!,
      uDither: this.uniforms.uDither!, uAlpha: { value: 1 },
    }
    this.sparkUniforms = { uTime: t.uTime, uInflow: { value: 0 }, uOpen: this.uniforms.uOpen!, uColor: t.uPortalA }
    this.stencilUniforms = { uOpen: this.uniforms.uOpen! }

    const portalMat = new THREE.ShaderMaterial({ vertexShader: PORTAL.vert, fragmentShader: PORTAL.frag, uniforms: this.uniforms, transparent: true, depthWrite: false, side: THREE.DoubleSide })
    const glowMat = new THREE.ShaderMaterial({ vertexShader: PORTAL_GLOW.vert, fragmentShader: PORTAL_GLOW.frag, uniforms: this.glowUniforms, transparent: true, depthWrite: false, side: THREE.DoubleSide })
    const portalGeo = new THREE.PlaneGeometry(2, 2, 32, 32), glowGeo = new THREE.PlaneGeometry(3, 3, 16, 16)
    const portal = new THREE.Mesh(portalGeo, portalMat); portal.renderOrder = 2
    const glow = new THREE.Mesh(glowGeo, glowMat); glow.renderOrder = 3; glow.position.z = 0.01
    this.group.add(portal, glow)
    this.disposables.push(portalMat, glowMat, portalGeo, glowGeo)

    if (opts.mode === 'stencil') {
      const stMat = new THREE.ShaderMaterial({
        vertexShader: PORTAL_STENCIL.vert, fragmentShader: PORTAL_STENCIL.frag, uniforms: this.stencilUniforms, colorWrite: false, depthWrite: false, side: THREE.DoubleSide,
        stencilWrite: true, stencilRef: this.stencilRef, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp, stencilFail: THREE.KeepStencilOp, stencilZFail: THREE.KeepStencilOp,
      })
      const st = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), stMat); st.renderOrder = -200; st.position.z = -0.005
      this.group.add(st); this.disposables.push(stMat, st.geometry)
    }

    // Étincelles : segments émis sur l'anneau (rayon 1,6), vers l'extérieur puis attirés vers l'arrière (gravité −z).
    const n = opts.sparks ?? 96
    const data = new Float32Array(n * 2 * 4), pos = new Float32Array(n * 2 * 3)
    for (let i = 0; i < n; i++) {
      const seed = Math.random(), ang = Math.random() * Math.PI * 2, jit = Math.random()
      for (let e = 0; e < 2; e++) data.set([seed, ang, jit, e], (i * 2 + e) * 4)
    }
    const sg = new THREE.BufferGeometry()
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); sg.setAttribute('aData', new THREE.BufferAttribute(data, 4))
    const sm = new THREE.ShaderMaterial({ vertexShader: PORTAL_SPARKS.vert, fragmentShader: PORTAL_SPARKS.frag, uniforms: this.sparkUniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
    const sparks = new THREE.LineSegments(sg, sm); sparks.frustumCulled = false; sparks.renderOrder = 4
    this.group.add(sparks); this.disposables.push(sg, sm)

    // Anneaux énergétiques fins (en plus du modèle d'origine) pour renforcer la lecture à distance.
    for (const [r, tube, speed] of [[1.28, 0.012, 0.35], [1.5, 0.008, -0.22]] as const) {
      const g = new THREE.TorusGeometry(r, tube, 8, 96)
      const m = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, toneMapped: false })
      m.color.copy(t.uPortalA.value).multiplyScalar(2.2)
      const ring = new THREE.Mesh(g, m); ring.userData.speed = speed; ring.renderOrder = 3
      this.group.add(ring); this.rings.push(ring); this.disposables.push(g, m)
    }
    this.light = new THREE.PointLight(0xffffff, 28, 40, 2); this.light.position.z = 1.2
    this.group.add(this.light)
    this.group.scale.setScalar(opts.radius)
    const unsub = theme.onChange(() => this.tint()); this.disposables.push({ dispose: unsub })
    this.tint()
  }

  private tint() {
    this.light.color.copy(this.theme.u.uPortalA.value)
    for (const r of this.rings) (r.material as THREE.MeshBasicMaterial).color.copy(this.theme.u.uPortalA.value).multiplyScalar(2.2)
  }
  /** 0 = refermé, 1 = grand ouvert (animation « open » d'origine). */
  setOpen(v: number) { this.open = v; this.uniforms.uOpen!.value = Math.max(0.02, v); this.group.visible = v > 0.015 }
  /** Particules aspirées vers le centre pendant la traversée. */
  setInflow(v: number) { this._inflow = v; this.sparkUniforms.uInflow!.value = v }
  setDither(on: boolean) { this.uniforms.uDither!.value = on }
  setAlpha(v: number) { this.uniforms.uAlpha!.value = v; this.glowUniforms.uAlpha!.value = v }
  setSpeed(v: number) { this.uniforms.uSpeed!.value = v }
  setNoise(tex: THREE.Texture) { this.uniforms.uNoise!.value = tex; this.glowUniforms.uNoise!.value = tex }
  update(dt: number, motion = 1) {
    for (const r of this.rings) r.rotation.z += dt * (r.userData.speed as number) * motion
    this.light.intensity = (22 + 12 * this._inflow) * this.open
  }
  dispose() { this.disposables.forEach(d => d.dispose()) }
}
