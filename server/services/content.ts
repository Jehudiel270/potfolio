import { asc, eq } from 'drizzle-orm'
import * as t from '../db/schema'
import { toPublicSettings } from '../../shared/settings'
import type { PublicContent } from '../../shared/types'
import { loadSettings } from './settings'
import type { Db } from './db-type'

/**
 * Contenu public. Hors aperçu : seuls les projets publiés et les éléments visibles sont renvoyés, et
 * les sections désactivées ne sont pas chargées. En aperçu (administrateur authentifié), tout est inclus.
 */
export async function getPublicContent(db: Db, opts: { preview?: boolean } = {}): Promise<PublicContent> {
  const { settings } = await loadSettings(db)
  const pv = !!opts.preview
  const on = (enabled: boolean) => pv || enabled
  const order = <T extends { sortOrder: unknown, id: unknown }>(tb: T) => [asc(tb.sortOrder as never), asc(tb.id as never)]
  const none = Promise.resolve([] as never[])
  const [projects, skills, links, education, experiences, certifications, achievements, cats] = await Promise.all([
    on(settings.sections.projects.enabled) ? db.select().from(t.projects).where(pv ? undefined : eq(t.projects.status, 'published')).orderBy(...order(t.projects)) : none,
    on(settings.sections.skills.enabled) ? db.select().from(t.skills).where(pv ? undefined : eq(t.skills.visible, true)).orderBy(...order(t.skills)) : none,
    db.select().from(t.skillLinks),
    on(settings.sections.education.enabled) ? db.select().from(t.educationEntries).where(pv ? undefined : eq(t.educationEntries.visible, true)).orderBy(...order(t.educationEntries)) : none,
    on(settings.sections.experiences.enabled) ? db.select().from(t.professionalExperiences).where(pv ? undefined : eq(t.professionalExperiences.visible, true)).orderBy(...order(t.professionalExperiences)) : none,
    on(settings.sections.certifications.enabled) ? db.select().from(t.certifications).where(pv ? undefined : eq(t.certifications.visible, true)).orderBy(...order(t.certifications)) : none,
    on(settings.sections.achievements.enabled) ? db.select().from(t.achievements).where(pv ? undefined : eq(t.achievements.visible, true)).orderBy(...order(t.achievements)) : none,
    db.select().from(t.achievementCategories).orderBy(...order(t.achievementCategories)),
  ])
  const skillIds = new Set(skills.map(s => s.id))
  const catById = new Map(cats.map(c => [c.id, c]))
  return {
    settings: toPublicSettings(settings),
    projects: projects.map(({ createdAt: _c, updatedAt: _u, coverPublicId: _p, ...p }) => p),
    skills: skills.map(({ createdAt: _c, updatedAt: _u, iconPublicId: _i, ...s }) => ({
      ...s, linkedSkillIds: links.filter(l => l.fromSkillId === s.id && skillIds.has(l.toSkillId)).map(l => l.toSkillId),
    })),
    education: education.map(({ createdAt: _c, updatedAt: _u, imagePublicId: _i, ...e }) => e),
    experiences: experiences.map(({ createdAt: _c, updatedAt: _u, imagePublicId: _i, ...e }) => e),
    certifications: certifications.map(({ createdAt: _c, updatedAt: _u, imagePublicId: _i, ...c }) => c),
    achievements: achievements
      .filter(a => pv || !a.categoryId || catById.get(a.categoryId)?.visible !== false)
      .map(({ createdAt: _c, updatedAt: _u, imagePublicId: _i, ...a }) => ({ ...a, category: a.categoryId ? (catById.get(a.categoryId)?.name ?? '') : '' })),
    preview: pv,
    generatedAt: new Date().toISOString(),
  }
}
