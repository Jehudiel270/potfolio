import * as THREE from 'three'
import { hexToLinearRgb } from '#shared/utils'
import { DEFAULT_THEME, type Theme } from '#shared/theme'

type U<T> = { value: T }
/**
 * Pont thème → 3D. Les uniforms sont des objets PARTAGÉS par tous les matériaux : changer le thème met à jour
 * instantanément shaders et matériaux standard. Les couleurs sont normalisées en espace linéaire (comme Three.js).
 */
export class ThemeBridge {
  readonly u = {
    uBg: { value: new THREE.Color() } as U<THREE.Color>,
    uPrimary: { value: new THREE.Color() } as U<THREE.Color>,
    uSecondary: { value: new THREE.Color() } as U<THREE.Color>,
    uGlow: { value: new THREE.Color() } as U<THREE.Color>,
    uPortalA: { value: new THREE.Color() } as U<THREE.Color>,
    uPortalB: { value: new THREE.Color() } as U<THREE.Color>,
    uStationA: { value: new THREE.Color() } as U<THREE.Color>,
    uStationB: { value: new THREE.Color() } as U<THREE.Color>,
    uIntensity: { value: 1 } as U<number>,
    uTime: { value: 0 } as U<number>,
  }
  theme: Theme = DEFAULT_THEME
  private listeners = new Set<(t: Theme) => void>()
  constructor(theme: Theme = DEFAULT_THEME) { this.set(theme) }

  private paint(c: THREE.Color, hex: string) { const [r, g, b] = hexToLinearRgb(hex); c.setRGB(r, g, b, THREE.LinearSRGBColorSpace) }
  set(theme: Theme) {
    this.theme = theme
    this.paint(this.u.uBg.value, theme.background); this.paint(this.u.uPrimary.value, theme.accent); this.paint(this.u.uSecondary.value, theme.secondary)
    this.paint(this.u.uGlow.value, theme.glow); this.paint(this.u.uPortalA.value, theme.portalA); this.paint(this.u.uPortalB.value, theme.portalB)
    this.paint(this.u.uStationA.value, theme.stationAccent); this.paint(this.u.uStationB.value, theme.stationSecondary)
    this.u.uIntensity.value = theme.intensity
    this.listeners.forEach(fn => fn(theme))
  }
  onChange(fn: (t: Theme) => void) { this.listeners.add(fn); return () => this.listeners.delete(fn) }
  /** Couleur d'un élément : sa couleur propre (hex) ou, à défaut, la couleur de repli donnée. */
  colorOf(hex: string | null | undefined, fallback: THREE.Color): THREE.Color {
    const c = new THREE.Color()
    if (hex && /^#[0-9a-f]{6}$/i.test(hex)) { const [r, g, b] = hexToLinearRgb(hex); return c.setRGB(r, g, b, THREE.LinearSRGBColorSpace) }
    return c.copy(fallback)
  }
}
