export type Tier = 'low' | 'medium' | 'high'
export interface Quality {
  tier: Tier
  pixelRatio: number
  particles: number // multiplicateur de densité
  bloom: boolean
  warp: boolean
  scan: boolean
  stars: number
  skyDetail: boolean
}

/** Estimation initiale (matériel, écran, préférences) ; ensuite corrigée en continu par AdaptiveQuality. */
export function detectTier(opts: { reducedMotion: boolean, gl?: WebGL2RenderingContext | null }): Tier {
  const nav = navigator as Navigator & { deviceMemory?: number }
  const coarse = matchMedia('(pointer: coarse)').matches
  const cores = nav.hardwareConcurrency ?? 4, mem = nav.deviceMemory ?? 4
  let weak = false
  try {
    const dbg = opts.gl?.getExtension('WEBGL_debug_renderer_info')
    const r = dbg ? String(opts.gl!.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : ''
    weak = /swiftshader|llvmpipe|software|mali-4|adreno \(tm\) [2-4]\d\d|powervr/i.test(r)
  } catch { /* extension indisponible */ }
  if (weak || opts.reducedMotion || cores <= 2 || mem <= 2) return 'low'
  if (coarse || cores <= 4 || mem <= 4) return 'medium'
  return 'high'
}

export function profileFor(tier: Tier, dpr: number): Quality {
  switch (tier) {
    case 'low': return { tier, pixelRatio: Math.min(dpr, 1), particles: 0.35, bloom: false, warp: false, scan: false, stars: 0.4, skyDetail: false }
    case 'medium': return { tier, pixelRatio: Math.min(dpr, 1.5), particles: 0.65, bloom: true, warp: true, scan: true, stars: 0.7, skyDetail: false }
    default: return { tier, pixelRatio: Math.min(dpr, 2), particles: 1, bloom: true, warp: true, scan: true, stars: 1, skyDetail: true }
  }
}

/** Dégrade progressivement la qualité si la fréquence d'images reste basse (moyenne glissante sur ~2 s). */
export class AdaptiveQuality {
  private ema = 16.7
  private slowFor = 0
  private step = 0
  constructor(private q: Quality, private apply: (q: Quality, step: number) => void) {}
  sample(dtMs: number) {
    if (dtMs > 250) return // onglet remis au premier plan : mesure ignorée
    this.ema += (dtMs - this.ema) * 0.08
    this.slowFor = this.ema > 28 ? this.slowFor + dtMs : Math.max(0, this.slowFor - dtMs * 2)
    if (this.slowFor > 2000 && this.step < 4) {
      this.step++; this.slowFor = 0
      if (this.step === 1) this.q.pixelRatio = Math.min(this.q.pixelRatio, 1.25)
      if (this.step === 2) this.q.bloom = false
      if (this.step === 3) { this.q.particles *= 0.5; this.q.stars *= 0.6; this.q.scan = false }
      if (this.step === 4) { this.q.pixelRatio = 1; this.q.warp = false }
      this.apply(this.q, this.step)
    }
  }
}
