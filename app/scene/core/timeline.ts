import type gsap from 'gsap'
import type { SpaceEngine, SectionMetric } from './engine'
import type { Pose } from './types'

/** Part de chaque section consacrée au séjour (la fin sert au voyage vers le chapitre suivant). */
export const DWELL = 0.72

/**
 * Timeline principale GSAP : un label par section réellement publiée, la caméra suit des poses clés par chapitre,
 * puis voyage vers le chapitre suivant. Les durées sont exprimées en pixels de défilement : temps = position de scroll.
 * Appelée à chaque changement de sections, de mise en page ou de hauteur du document.
 */
export function buildMasterTimeline(g: typeof gsap, engine: SpaceEngine, sections: SectionMetric[], totalScroll: number): gsap.core.Timeline {
  engine.timeline?.kill()
  engine.metrics.clear()
  const tl = g.timeline({ paused: true, defaults: { ease: 'none' } })
  const cam = engine.cam
  const world = sections.map((s) => {
    const ch = engine.byId.get(s.id)
    return ch ? { s, ch, poses: ch.poses(engine.layout).map(p => engine.poseWorld(ch, p as Pose)) } : null
  }).filter((x): x is NonNullable<typeof x> => !!x)
  if (!world.length) { tl.to({}, { duration: Math.max(1, totalScroll) }); return tl }

  const first = world[0]!.poses[0]!
  tl.set(cam, { ...first }, 0)
  world.forEach(({ s, ch, poses }, i) => {
    const end = i < world.length - 1 ? world[i + 1]!.s.top : Math.max(totalScroll, s.top + 1)
    const t0 = s.top, t1 = t0 + (end - t0) * (i < world.length - 1 ? DWELL : 1)
    tl.addLabel(s.id, t0)
    engine.metrics.set(s.id, { t0, t1 })
    // Séjour : interpolation entre les poses clés du chapitre.
    if (poses.length > 1) {
      const seg = (t1 - t0) / (poses.length - 1)
      for (let k = 1; k < poses.length; k++) tl.to(cam, { ...poses[k]!, duration: seg, ease: ch.id === 'portal' ? 'power1.inOut' : 'sine.inOut' }, t0 + seg * (k - 1))
    }
    ch.timeline?.(tl, t0, t1)
    // Voyage vers le chapitre suivant.
    const next = world[i + 1]
    if (next) tl.to(cam, { ...next.poses[0]!, duration: end - t1, ease: 'power2.inOut' }, t1)
  })
  tl.to({}, { duration: 0 }, Math.max(totalScroll, 1))
  return tl
}
