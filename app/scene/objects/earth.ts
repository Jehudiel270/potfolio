import * as THREE from 'three'
import { ARC, ATMOSPHERE, EARTH, EARTH_POINTS } from '../core/shaders'
import type { ThemeBridge } from '../core/theme-bridge'
import { latLonToVec3, type LandMask } from '../core/noise'

const HUBS: [number, number][] = [[48.86, 2.35], [40.71, -74.0], [35.68, 139.69], [-23.55, -46.63], [-26.2, 28.04], [-33.87, 151.21], [25.2, 55.27], [51.5, -0.12], [1.35, 103.82], [6.5, 3.4]]
const ARCS: [number, number][] = [[0, 1], [1, 3], [0, 4], [2, 5], [6, 2], [7, 1], [9, 0], [8, 5], [3, 9]]

/** Terre holographique : sphère GLSL (continents réels, contours, graticule, balayage), points sur les terres, atmosphère Fresnel, arcs, anneaux. */
export class HoloEarth {
  readonly group = new THREE.Group()
  readonly radius = 3
  private readonly globe = new THREE.Group()
  private readonly rings: THREE.Mesh[] = []
  private readonly marker = new THREE.Group()
  private disposables: { dispose(): void }[] = []
  private pointsU: Record<string, THREE.IUniform>
  private earthU: Record<string, THREE.IUniform>
  private arcU: Record<string, THREE.IUniform>[] = []
  markerWorld = new THREE.Vector3()
  hasMarker = false

  constructor(theme: ThemeBridge, mask: LandMask, opts: { points: number, pixel: number, scan: boolean }) {
    const t = theme.u, R = this.radius
    this.earthU = { uMask: { value: mask.texture }, uTexel: { value: new THREE.Vector2(1 / mask.width, 1 / mask.height) }, uBg: t.uBg, uPrimary: t.uPrimary, uSecondary: t.uSecondary, uGlow: t.uGlow, uTime: t.uTime, uIntensity: t.uIntensity, uScan: { value: opts.scan ? 0.35 : 0 } }
    const gg = new THREE.SphereGeometry(R, 96, 64)
    const gm = new THREE.ShaderMaterial({ vertexShader: EARTH.vert, fragmentShader: EARTH.frag, uniforms: this.earthU })
    this.globe.add(new THREE.Mesh(gg, gm)); this.disposables.push(gg, gm)

    // Points lumineux répartis sur les continents (sphère de Fibonacci filtrée par le masque).
    const pts: number[] = [], rnd: number[] = []
    const N = opts.points, golden = Math.PI * (3 - Math.sqrt(5))
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2, rr = Math.sqrt(1 - y * y), th = golden * i
      const lat = THREE.MathUtils.radToDeg(Math.asin(y))
      let lon = THREE.MathUtils.radToDeg(Math.atan2(rr * Math.sin(th), -rr * Math.cos(th))) - 180
      if (lon < -180) lon += 360
      if (!mask.isLand(lat, lon)) continue
      const v = latLonToVec3(lat, lon, R * 1.012)
      pts.push(v.x, v.y, v.z); rnd.push(Math.random())
    }
    const pg = new THREE.BufferGeometry()
    pg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); pg.setAttribute('aRnd', new THREE.Float32BufferAttribute(rnd, 1))
    this.pointsU = { uTime: t.uTime, uPixel: { value: opts.pixel }, uSize: { value: 3.2 }, uColor: t.uPrimary, uGlow: t.uGlow }
    const pm = new THREE.ShaderMaterial({ vertexShader: EARTH_POINTS.vert, fragmentShader: EARTH_POINTS.frag, uniforms: this.pointsU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
    this.globe.add(new THREE.Points(pg, pm)); this.disposables.push(pg, pm)

    // Arcs de connexion entre quelques grandes villes (décor générique).
    const hubV = HUBS.map(([la, lo]) => latLonToVec3(la, lo, R * 1.012))
    ARCS.forEach(([a, b], i) => {
      const va = hubV[a]!, vb = hubV[b]!, mid = va.clone().add(vb).multiplyScalar(0.5)
      mid.setLength(R * (1.18 + va.distanceTo(vb) * 0.05))
      const curve = new THREE.QuadraticBezierCurve3(va, mid, vb), n = 56, p = curve.getPoints(n)
      const g = new THREE.BufferGeometry().setFromPoints(p)
      g.setAttribute('aT', new THREE.Float32BufferAttribute(p.map((_, k) => k / n), 1))
      const u = { uColor: t.uPrimary, uGlow: t.uGlow, uTime: t.uTime, uPhase: { value: i * 0.17 } }
      const m = new THREE.ShaderMaterial({ vertexShader: ARC.vert, fragmentShader: ARC.frag, uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
      this.globe.add(new THREE.Line(g, m)); this.arcU.push(u); this.disposables.push(g, m)
    })

    // Repère facultatif (position choisie dans l'administration).
    const mg = new THREE.SphereGeometry(0.045, 12, 12), mm = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })
    mm.color.copy(t.uGlow.value).multiplyScalar(3)
    const ringG = new THREE.RingGeometry(0.09, 0.105, 40), ringM = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, side: THREE.DoubleSide, toneMapped: false })
    ringM.color.copy(t.uGlow.value).multiplyScalar(2.5)
    const dot = new THREE.Mesh(mg, mm), halo = new THREE.Mesh(ringG, ringM); halo.name = 'halo'
    this.marker.add(dot, halo); this.marker.visible = false; this.globe.add(this.marker); this.disposables.push(mg, mm, ringG, ringM)
    theme.onChange(() => { mm.color.copy(t.uGlow.value).multiplyScalar(3); ringM.color.copy(t.uGlow.value).multiplyScalar(2.5) })

    // Atmosphère (Fresnel) et anneaux orbitaux fins.
    const ag = new THREE.SphereGeometry(R * 1.09, 64, 48)
    const am = new THREE.ShaderMaterial({ vertexShader: ATMOSPHERE.vert, fragmentShader: ATMOSPHERE.frag, uniforms: { uColor: t.uPrimary, uColor2: t.uSecondary, uIntensity: t.uIntensity }, side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
    this.group.add(new THREE.Mesh(ag, am)); this.disposables.push(ag, am)
    const ringDefs: [number, number, number, number, number, 'p' | 's'][] = [[4.1, 0.012, 1.25, 0.2, 0.18, 'p'], [4.7, 0.009, 0.55, -0.55, -0.12, 's'], [5.4, 0.007, 1.0, 0.9, 0.08, 'p']]
    for (const [r, tube, rx, rz, sp, c] of ringDefs) {
      const g = new THREE.TorusGeometry(r, tube, 8, 160), m = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75, toneMapped: false })
      const paint = () => m.color.copy(c === 'p' ? t.uGlow.value : t.uSecondary.value).multiplyScalar(c === 'p' ? 1.8 : 3)
      paint(); theme.onChange(paint)
      const ring = new THREE.Mesh(g, m); ring.rotation.set(rx, 0, rz); ring.userData.speed = sp
      this.group.add(ring); this.rings.push(ring); this.disposables.push(g, m)
    }
    this.group.add(this.globe)
    this.globe.rotation.z = THREE.MathUtils.degToRad(-12)
  }

  setMarker(m: { lat: number, lon: number } | null) {
    this.hasMarker = !!m
    this.marker.visible = !!m
    if (!m) return
    const p = latLonToVec3(m.lat, m.lon, this.radius * 1.015)
    this.marker.position.copy(p)
    this.marker.lookAt(p.clone().multiplyScalar(2))
  }
  setScan(on: boolean) { this.earthU.uScan!.value = on ? 0.35 : 0 }
  setPixel(px: number) { this.pointsU.uPixel!.value = px }
  update(dt: number, time: number, speed: number) {
    this.globe.rotation.y += dt * 0.07 * speed
    for (const r of this.rings) r.rotation.z += dt * (r.userData.speed as number) * speed
    if (this.hasMarker) {
      const h = this.marker.getObjectByName('halo') as THREE.Mesh
      const s = 1 + ((time * 0.8) % 1) * 1.6; h.scale.setScalar(s); (h.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - ((time * 0.8) % 1))
      this.marker.getWorldPosition(this.markerWorld)
    }
  }
  dispose() { this.disposables.forEach(d => d.dispose()) }
}
