import * as THREE from 'three'
import { CORE_GLOW } from '../core/shaders'
import type { ThemeBridge } from '../core/theme-bridge'

/**
 * Station signature : UN noyau, UN bras, UN module (règle du cahier des charges v2). Aucune duplication selon le nombre de compétences.
 * Construite entièrement en géométries primitives Three.js. Chaque pièce est une fonction réutilisable aux points de raccordement définis.
 */
export const STATION = {
  coreRadius: 1.1,
  /** Points de raccordement (repère local de la station). */
  coreConnector: new THREE.Vector3(1.28, 0, 0),
  armLength: 4,
  armStart: new THREE.Vector3(1.3, 0, 0),
  armEnd: new THREE.Vector3(5.3, 0, 0),
  moduleCenter: new THREE.Vector3(6.05, 0, 0),
}

export interface StationParts { group: THREE.Group, core: THREE.Group, arm: THREE.Group, module: THREE.Group, facade: THREE.Mesh, rings: THREE.Mesh[], update: (dt: number, time: number, speed: number) => void, setSkill: (c: THREE.Color, icon: THREE.Texture | null) => void, flash: () => void, dispose: () => void }

export function createCore(theme: ThemeBridge, disposables: { dispose(): void }[]) {
  const t = theme.u, g = new THREE.Group()
  const metal = new THREE.MeshStandardMaterial({ color: 0x1a2030, metalness: 0.92, roughness: 0.34 })
  const body = new THREE.Mesh(new THREE.SphereGeometry(STATION.coreRadius, 64, 48), metal)
  const inner = new THREE.Mesh(new THREE.SphereGeometry(0.62, 40, 32), new THREE.ShaderMaterial({ vertexShader: CORE_GLOW.vert, fragmentShader: CORE_GLOW.frag, uniforms: { uA: t.uStationA, uB: t.uStationB, uTime: t.uTime, uBoost: { value: 1 } } }))
  g.add(body, inner)
  // Détails de surface : alvéoles circulaires (ports) autour de l'équateur.
  const portGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.06, 20), portMat = new THREE.MeshStandardMaterial({ color: 0x2a3550, metalness: 0.9, roughness: 0.25, emissive: 0x000000 })
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2
    if (Math.abs(Math.cos(a)) > 0.92) continue // laisse libre le raccord du bras
    const p = new THREE.Mesh(portGeo, portMat)
    p.position.set(Math.cos(a) * 1.08, (i % 2 ? 0.28 : -0.28), Math.sin(a) * 1.08); p.lookAt(p.position.clone().multiplyScalar(2)); p.rotateX(Math.PI / 2)
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.06, 12), lightMat); dot.position.y = 0.04; dot.rotation.x = -Math.PI / 2
    p.add(dot); g.add(p)
  }
  // Collier de raccordement du bras.
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.34, 24), new THREE.MeshStandardMaterial({ color: 0x232c42, metalness: 0.95, roughness: 0.3 }))
  collar.rotation.z = Math.PI / 2; collar.position.copy(STATION.coreConnector).setX(1.18)
  g.add(collar)
  const rings: THREE.Mesh[] = []
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x2a3550, metalness: 1, roughness: 0.28 })
  for (const [r, tube, rx, rz] of [[1.62, 0.055, Math.PI / 2, 0], [1.95, 0.035, 1.1, 0.5], [1.38, 0.025, 0.3, -0.9]] as const) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 16, 120), ringMat); ring.rotation.set(rx, 0, rz); g.add(ring); rings.push(ring)
    const glow = new THREE.Mesh(new THREE.TorusGeometry(r, tube * 0.42, 8, 120), lightMat); glow.position.z = 0; ring.add(glow)
  }
  disposables.push(body.geometry, metal, portGeo, portMat, lightMat, ringMat, collar.geometry, inner.geometry, inner.material as THREE.Material)
  return { group: g, rings, lightMat, inner }
}

export function createArm(disposables: { dispose(): void }[]) {
  const g = new THREE.Group()
  const metal = new THREE.MeshStandardMaterial({ color: 0x1e263a, metalness: 0.9, roughness: 0.38 })
  const glow = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })
  const len = STATION.armLength
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, len, 16), metal)
  shaft.rotation.z = Math.PI / 2; shaft.position.x = STATION.armStart.x + len / 2
  g.add(shaft)
  const line = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, len * 0.96, 6), glow)
  line.rotation.z = Math.PI / 2; line.position.set(shaft.position.x, 0.115, 0); g.add(line)
  const jointGeo = new THREE.SphereGeometry(0.19, 20, 16), segGeo = new THREE.TorusGeometry(0.15, 0.03, 10, 28)
  for (const f of [0.3, 0.62]) {
    const j = new THREE.Mesh(jointGeo, metal); j.position.x = STATION.armStart.x + len * f; g.add(j)
    const s = new THREE.Mesh(segGeo, glow); s.rotation.y = Math.PI / 2; s.position.x = STATION.armStart.x + len * f + 0.26; g.add(s)
  }
  for (const x of [STATION.armStart.x, STATION.armEnd.x]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.22, 20), metal); c.rotation.z = Math.PI / 2; c.position.x = x; g.add(c)
    disposables.push(c.geometry)
  }
  disposables.push(shaft.geometry, line.geometry, jointGeo, segGeo, metal, glow)
  return { group: g, glow }
}

export function createModule(disposables: { dispose(): void }[]) {
  const g = new THREE.Group()
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.15, 1.15), new THREE.MeshPhysicalMaterial({ color: 0x1b2438, metalness: 0.9, roughness: 0.25, transparent: true, opacity: 0.55, clearcoat: 1 }))
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(frame.geometry), new THREE.LineBasicMaterial({ color: 0xffffff, toneMapped: false }))
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.62, 0), new THREE.MeshPhysicalMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.9, metalness: 0.2, roughness: 0.1, transparent: true, opacity: 0.85, flatShading: true }))
  // Façade : emplacement d'icône (texture dynamique, jamais gravée dans la géométrie).
  const facade = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false, depthWrite: false }))
  facade.position.z = 0.6; facade.name = 'facade'
  g.add(frame, edges, crystal, facade)
  disposables.push(frame.geometry, frame.material as THREE.Material, edges.geometry, edges.material as THREE.Material, crystal.geometry, crystal.material as THREE.Material, facade.geometry, facade.material as THREE.Material)
  return { group: g, frame, edges, crystal, facade }
}

export function buildStation(theme: ThemeBridge): StationParts {
  const disposables: { dispose(): void }[] = []
  const root = new THREE.Group()
  const core = createCore(theme, disposables), arm = createArm(disposables), mod = createModule(disposables)
  mod.group.position.copy(STATION.moduleCenter)
  root.add(core.group, arm.group, mod.group)
  const tint = () => {
    const c = theme.u.uStationB.value, a = theme.u.uStationA.value
    core.lightMat.color.copy(c).multiplyScalar(2.4); arm.glow.color.copy(a).multiplyScalar(2.2)
    ;(mod.edges.material as THREE.LineBasicMaterial).color.copy(a).multiplyScalar(2)
  }
  tint(); const un = theme.onChange(tint); disposables.push({ dispose: un })
  const skillColor = new THREE.Color().copy(theme.u.uStationA.value)
  const mat = mod.crystal.material as THREE.MeshPhysicalMaterial
  mat.color.copy(skillColor); mat.emissive.copy(skillColor)
  let flash = 0
  return {
    group: root, core: core.group, arm: arm.group, module: mod.group, facade: mod.facade, rings: core.rings,
    setSkill(c, icon) {
      skillColor.copy(c); mat.color.copy(c); mat.emissive.copy(c)
      const fm = mod.facade.material as THREE.MeshBasicMaterial
      fm.map = icon; fm.needsUpdate = true; mod.facade.visible = !!icon
    },
    flash() { flash = 1 },
    update(dt, time, speed) {
      core.rings.forEach((r, i) => { r.rotation.z += dt * (0.25 + i * 0.18) * (i % 2 ? -1 : 1) * speed; r.rotation.x += dt * 0.05 * i * speed })
      core.inner.rotation.y += dt * 0.3 * speed
      mod.crystal.rotation.y += dt * 0.45 * speed; mod.crystal.rotation.x = Math.sin(time * 0.5) * 0.25
      mod.group.position.y = Math.sin(time * 0.9) * 0.06 * Math.min(1, speed)
      flash = Math.max(0, flash - dt * 2.2)
      mat.emissiveIntensity = 0.9 + flash * 3.5
      mod.group.scale.setScalar(1 + flash * 0.22)
    },
    dispose() { disposables.forEach(d => d.dispose()) },
  }
}
