// Presets validés : l'administrateur choisit dans ces listes, jamais de GLSL libre.
export const SKILL_PRESETS = ['orb', 'cube', 'crystal', 'ring', 'hex'] as const
export const BADGE_PRESETS = ['crystal', 'plate', 'prism', 'orb'] as const
export const EDUCATION_PRESETS = ['star', 'nova', 'pulsar'] as const
export const EXPERIENCE_PRESETS = ['hex', 'cylinder', 'capsule'] as const
export const ACHIEVEMENT_PRESETS = ['capsule', 'badge', 'spark'] as const
export const PROJECT_PRESETS = ['crystal', 'cube', 'ico', 'shard'] as const
export const EXPERIENCE_KINDS = ['job', 'internship', 'mission', 'volunteer', 'other'] as const
export const SKILL_VIEWS = ['station', 'hex', 'tree'] as const
export const CHAPTER_IDS = ['home', 'portal', 'about', 'skills', 'education', 'experiences', 'certifications', 'achievements', 'projects', 'contact'] as const
export const NAV_IDS = ['home', 'about', 'skills', 'education', 'experiences', 'certifications', 'achievements', 'projects', 'contact'] as const

export type SkillView = typeof SKILL_VIEWS[number]
export type ChapterId = typeof CHAPTER_IDS[number]
export type NavId = typeof NAV_IDS[number]

export const EXPERIENCE_KIND_LABELS: Record<typeof EXPERIENCE_KINDS[number], string> = {
  job: 'Emploi', internship: 'Stage', mission: 'Mission', volunteer: 'Activité associative', other: 'Autre',
}
export const SKILL_VIEW_LABELS: Record<SkillView, string> = {
  station: 'Station', hex: 'Constellation hexagonale', tree: 'Arbre de compétences',
}
export const NAV_DEFAULT_LABELS: Record<NavId, string> = {
  home: 'Accueil', about: 'À propos', skills: 'Compétences', education: 'Parcours', experiences: 'Expériences',
  certifications: 'Certifications', achievements: 'Réalisations', projects: 'Projets', contact: 'Contact',
}
