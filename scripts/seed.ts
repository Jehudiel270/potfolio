// Initialisation : `pnpm db:seed` crée la ligne de réglages par défaut.
// `pnpm db:seed:demo` ajoute en plus du contenu d'EXEMPLE, marqué « (démo) » et supprimable via `pnpm db:purge-demo`.
import { eq, getTableColumns } from 'drizzle-orm'
import { RESOURCES, createRow } from '../server/services/crud'
import { loadSettings, saveSettingsSlices } from '../server/services/settings'
import { siteSettings } from '../server/db/schema'
import { scriptDb } from './_db'

const db = scriptDb()
const existing = await db.select().from(siteSettings).where(eq(siteSettings.id, 1))
if (!existing.length) { await saveSettingsSlices(db, {}); console.log('✔ Réglages par défaut créés.') } else console.log('• Réglages déjà présents.')

if (process.argv.includes('--demo')) {
  const mark = async (key: string, items: Record<string, unknown>[]) => {
    const def = RESOURCES[key]!
    const idCol = getTableColumns(def.table).id!
    const isDemo = getTableColumns(def.table).isDemo
    for (const it of items) {
      const row = await createRow(db, def, it)
      if (isDemo) await db.update(def.table).set({ isDemo: true } as never).where(eq(idCol, row.id as number))
    }
    console.log(`✔ ${items.length} ${def.label.toLowerCase()}(s) de démonstration`)
  }
  const D = '(démo)'
  await mark('skills', [
    { name: 'TypeScript', category: 'Langages', color: '#3b82f6', description: `Typage statique pour des bases de code fiables. ${D}`, featured: true, proficiency: 85 },
    { name: 'Vue 3', category: 'Frontend', color: '#34d399', description: `Interfaces réactives. ${D}`, featured: true },
    { name: 'Nuxt', category: 'Frontend', color: '#22d3ee', description: `SSR et API serveur. ${D}`, linkedSkillIds: [] },
    { name: 'Three.js', category: '3D', color: '#a78bfa', description: `WebGL, shaders et scènes immersives. ${D}`, featured: true },
    { name: 'GSAP', category: '3D', color: '#84cc16', description: `Animations pilotées par le scroll. ${D}` },
    { name: 'PostgreSQL', category: 'Backend', color: '#60a5fa', description: `Base relationnelle. ${D}` },
    { name: 'Node.js', category: 'Backend', color: '#4ade80', description: `API et scripts. ${D}` },
    { name: 'Figma', category: 'Design', color: '#f472b6', description: `Maquettes et prototypes. ${D}` },
  ])
  await mark('education', [
    { title: `Formation exemple — niveau 1 ${D}`, institution: 'Établissement d’exemple', degree: 'Diplôme d’exemple', field: 'Informatique', startDate: '2016-09-01', endDate: '2019-06-30', description: 'Entrée fictive à remplacer.', achievements: ['Mention fictive'] },
    { title: `Formation exemple — niveau 2 ${D}`, institution: 'École d’exemple', degree: 'Master d’exemple', field: 'Ingénierie logicielle', startDate: '2019-09-01', endDate: '2021-06-30', description: 'Entrée fictive à remplacer.' },
    { title: `Formation en cours ${D}`, institution: 'Organisme d’exemple', degree: 'Formation continue', field: 'Graphisme 3D', startDate: '2023-01-01', isCurrent: true, description: 'Entrée fictive à remplacer.' },
  ])
  await mark('experiences', [
    { organization: `Organisation exemple A ${D}`, role: 'Développeur Front-end', kind: 'job', startDate: '2021-07-01', endDate: '2023-03-31', description: 'Expérience fictive.', missions: ['Mission fictive 1', 'Mission fictive 2'], technologies: ['Vue 3', 'TypeScript'] },
    { organization: `Association exemple ${D}`, role: 'Bénévole', kind: 'volunteer', startDate: '2020-01-01', endDate: '2021-01-01', description: 'Activité fictive.' },
    { organization: `Organisation exemple B ${D}`, role: 'Développeur Full-Stack', kind: 'job', startDate: '2023-04-01', isCurrent: true, description: 'Expérience fictive en cours.', technologies: ['Nuxt', 'PostgreSQL'] },
  ])
  await mark('certifications', [
    { name: `Certification exemple A ${D}`, issuer: 'Organisme d’exemple', category: 'Cloud', issuedAt: '2022-05-10', preset: 'crystal' },
    { name: `Certification exemple B ${D}`, issuer: 'Organisme d’exemple', category: 'Web', issuedAt: '2023-02-01', expiresAt: '2026-02-01', preset: 'plate' },
    { name: `Diplôme exemple ${D}`, issuer: 'École d’exemple', category: 'Diplômes', issuedAt: '2021-06-30', preset: 'prism' },
  ])
  const cat = await createRow(db, RESOURCES['achievement-categories']!, { name: 'Distinctions (démo)' })
  await mark('achievements', [
    { title: `Prix fictif ${D}`, categoryId: cat.id, description: 'Distinction d’exemple.', date: '2022-11-01', preset: 'badge' },
    { title: `Hackathon fictif ${D}`, categoryId: cat.id, description: 'Concours d’exemple.', date: '2023-05-20', preset: 'spark' },
  ])
  await mark('projects', [
    { title: `Projet exemple A ${D}`, shortDescription: 'Un projet fictif pour visualiser la mise en page.', description: 'Description détaillée fictive.', problem: 'Problématique fictive.', features: ['Fonctionnalité 1', 'Fonctionnalité 2'], category: 'Web', technologies: ['Nuxt', 'Three.js'], status: 'published', featured: true, preset: 'crystal' },
    { title: `Projet exemple B ${D}`, shortDescription: 'Un second projet fictif.', description: 'Description détaillée fictive.', category: 'Mobile', technologies: ['TypeScript'], status: 'published', preset: 'cube' },
    { title: `Projet exemple C ${D}`, shortDescription: 'Un brouillon fictif (invisible publiquement).', category: 'Web', status: 'draft', preset: 'ico' },
  ])
  const { settings } = await loadSettings(db)
  console.log(`✔ Démo prête. Nom affiché actuel : « ${settings.identity.displayName} » — modifiez-le dans /admin/content.`)
}
console.log('Terminé.')
