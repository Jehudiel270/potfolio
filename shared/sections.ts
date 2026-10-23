import type { ChapterId, NavId, SkillView } from './presets'
import type { PublicSettings } from './settings'
import type { PublicContent } from './types'

export interface PlannedSection { id: ChapterId, title: string }
export interface NavEntry { id: NavId, label: string }
export interface SectionPlan { sections: PlannedSection[], nav: NavEntry[], skillViews: SkillView[], defaultSkillView: SkillView | null }

type Counts = Pick<PublicContent, 'skills' | 'education' | 'experiences' | 'certifications' | 'achievements' | 'projects'>

/** Seule source de vérité pour : menu, sections HTML, chapitres 3D et repères de la timeline GSAP. */
export function buildPlan(settings: PublicSettings, c: Counts, opts: { preview?: boolean } = {}): SectionPlan {
  const present = (enabled: boolean, count: number, showEmpty: boolean) => enabled && (count > 0 || showEmpty || !!opts.preview)
  const sc = settings.sections
  const views = settings.skillViews.order.filter(v => settings.skillViews.enabled[v])
  const sections: PlannedSection[] = [
    { id: 'home', title: settings.navigation.items.find(i => i.id === 'home')?.label ?? 'Accueil' },
    { id: 'portal', title: 'Traversée' },
  ]
  const push = (id: ChapterId, title: string) => sections.push({ id, title })
  if (settings.identity.about.trim()) push('about', settings.navigation.items.find(i => i.id === 'about')?.label ?? 'À propos')
  if (present(sc.skills.enabled && views.length > 0, c.skills.length, sc.skills.showWhenEmpty)) push('skills', sc.skills.title)
  if (present(sc.education.enabled, c.education.length, sc.education.showWhenEmpty)) push('education', sc.education.title)
  if (present(sc.experiences.enabled, c.experiences.length, sc.experiences.showWhenEmpty)) push('experiences', sc.experiences.title)
  if (present(sc.certifications.enabled, c.certifications.length, sc.certifications.showWhenEmpty)) push('certifications', sc.certifications.title)
  if (present(sc.achievements.enabled, c.achievements.length, sc.achievements.showWhenEmpty)) push('achievements', sc.achievements.title)
  if (present(sc.projects.enabled, c.projects.length, sc.projects.showWhenEmpty)) push('projects', sc.projects.title)
  push('contact', 'Contact')
  const ids = new Set(sections.map(s => s.id))
  const nav = settings.navigation.items
    .filter(i => i.visible && ids.has(i.id))
    .sort((a, b) => a.order - b.order)
    .map(i => ({ id: i.id, label: i.label }))
  const dv = views.includes(settings.skillViews.defaultView) ? settings.skillViews.defaultView : (views[0] ?? null)
  return { sections, nav, skillViews: views, defaultSkillView: dv }
}
