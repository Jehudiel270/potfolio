import type { ZodTypeAny } from 'zod'
import { ACHIEVEMENT_PRESETS, BADGE_PRESETS, EDUCATION_PRESETS, EXPERIENCE_KINDS, EXPERIENCE_KIND_LABELS, EXPERIENCE_PRESETS, PROJECT_PRESETS, SKILL_PRESETS, SKILL_VIEWS, SKILL_VIEW_LABELS } from '#shared/presets'
import { achievementCategoryInput, achievementInput, certificationInput, educationInput, experienceInput, projectInput, skillInput } from '#shared/schemas'
import type { DetailItem } from '#shared/types'

export type FieldType = 'text' | 'textarea' | 'url' | 'date' | 'number' | 'boolean' | 'select' | 'color' | 'tags' | 'lines' | 'image' | 'gallery' | 'multiselect' | 'skillLinks' | 'categorySelect'
export interface FieldDef {
  key: string, label: string, type: FieldType, hint?: string, placeholder?: string, required?: boolean
  options?: { value: string, label: string }[], imageKeys?: { url: string, id: string }, scope?: string, half?: boolean, rows?: number
  showIf?: (form: Record<string, unknown>) => boolean
}
export interface ColumnDef { label: string, render: (row: Record<string, unknown>) => string }
export interface ResourceUi {
  key: string, singular: string, plural: string, titleKey: string, schema: ZodTypeAny
  subtitle?: (row: Record<string, unknown>) => string
  fields: FieldDef[]
  columns?: ColumnDef[]
  toggles: ('visible' | 'featured' | 'status')[]
  filters?: { key: string, label: string, options: { value: string, label: string }[] }[]
  sortable: boolean, dateSort?: boolean
  preview?: DetailItem['type']
  defaults: () => Record<string, unknown>
  emptyHint: string
}

const opts = (list: readonly string[], labels: Record<string, string> = {}) => list.map(v => ({ value: v, label: labels[v] ?? v }))
export const PRESET_LABELS: Record<string, string> = {
  orb: 'Orbe', cube: 'Cube', crystal: 'Cristal', ring: 'Anneau', hex: 'Hexagone', plate: 'Plaque de verre', prism: 'Prisme', star: 'Étoile', nova: 'Nova', pulsar: 'Pulsar',
  cylinder: 'Cylindre', capsule: 'Capsule', badge: 'Badge', spark: 'Étincelle', ico: 'Icosaèdre', shard: 'Éclat',
}
const presetOpts = (l: readonly string[]) => opts(l, PRESET_LABELS)
const fmt = (s: unknown) => (typeof s === 'string' ? s.slice(0, 7) : '')
const range = (r: Record<string, unknown>) => `${fmt(r.startDate)}${r.isCurrent ? ' → en cours' : r.endDate ? ' → ' + fmt(r.endDate) : ''}`

export const RESOURCE_UI: Record<string, ResourceUi> = {
  projects: {
    key: 'projects', singular: 'projet', plural: 'Projets', titleKey: 'title', schema: projectInput, toggles: ['status', 'featured'], sortable: true, preview: 'project', dateSort: true,
    subtitle: r => String(r.category || r.shortDescription || ''),
    emptyHint: 'Aucun projet. Créez-en un : tant qu’il est en brouillon, il reste invisible du public.',
    filters: [{ key: 'status', label: 'Statut', options: [{ value: 'published', label: 'Publiés' }, { value: 'draft', label: 'Brouillons' }] }],
    defaults: () => ({ title: '', slug: '', shortDescription: '', description: '', problem: '', features: [], category: '', technologies: [], coverImageUrl: null, coverPublicId: null, gallery: [], liveUrl: '', repositoryUrl: '', status: 'draft', featured: false, preset: 'crystal', color: '', projectDate: '' }),
    fields: [
      { key: 'title', label: 'Titre', type: 'text', required: true },
      { key: 'slug', label: 'Identifiant (slug)', type: 'text', half: true, hint: 'Laissé vide, il est généré depuis le titre.' },
      { key: 'category', label: 'Catégorie', type: 'text', half: true },
      { key: 'status', label: 'Statut', type: 'select', half: true, options: [{ value: 'draft', label: 'Brouillon (invisible)' }, { value: 'published', label: 'Publié' }] },
      { key: 'featured', label: 'Mis en avant', type: 'boolean', half: true },
      { key: 'shortDescription', label: 'Description courte', type: 'textarea', rows: 2, hint: '300 caractères maximum.' },
      { key: 'description', label: 'Description détaillée', type: 'textarea', rows: 6 },
      { key: 'problem', label: 'Problématique', type: 'textarea', rows: 3 },
      { key: 'features', label: 'Fonctionnalités principales', type: 'lines', hint: 'Une par ligne.' },
      { key: 'technologies', label: 'Technologies utilisées', type: 'tags' },
      { key: 'coverImageUrl', label: 'Image principale', type: 'image', imageKeys: { url: 'coverImageUrl', id: 'coverPublicId' }, scope: 'projects' },
      { key: 'gallery', label: 'Galerie (facultative)', type: 'gallery', scope: 'projects' },
      { key: 'liveUrl', label: 'URL de la démonstration', type: 'url', half: true },
      { key: 'repositoryUrl', label: 'URL du dépôt source', type: 'url', half: true },
      { key: 'projectDate', label: 'Date du projet', type: 'date', half: true },
      { key: 'preset', label: 'Forme 3D', type: 'select', half: true, options: presetOpts(PROJECT_PRESETS) },
      { key: 'color', label: 'Couleur (facultative)', type: 'color', hint: 'Sinon, la couleur du thème est utilisée.' },
    ],
  },
  skills: {
    key: 'skills', singular: 'compétence', plural: 'Compétences', titleKey: 'name', schema: skillInput, toggles: ['visible', 'featured'], sortable: true, preview: 'skill',
    subtitle: r => String(r.category || ''),
    emptyHint: 'Aucune compétence. Elles alimentent la station, la constellation hexagonale et l’arbre de compétences.',
    filters: [],
    defaults: () => ({ name: '', slug: '', category: '', description: '', icon: '', iconUrl: null, iconPublicId: null, color: '', proficiency: null, visible: true, featured: false, allowedModes: [...SKILL_VIEWS], preset: 'orb', linkedSkillIds: [] }),
    fields: [
      { key: 'name', label: 'Nom', type: 'text', required: true, half: true },
      { key: 'slug', label: 'Identifiant (slug)', type: 'text', half: true, placeholder: 'ex. vue-3', hint: 'Facultatif : sert dans les URL. Laissez vide pour le générer depuis le nom (ex. Vue 3 → vue-3).' },
      { key: 'category', label: 'Catégorie', type: 'text', half: true },
      { key: 'description', label: 'Description', type: 'textarea', rows: 3 },
      { key: 'iconUrl', label: 'Logo / icône (facultatif)', type: 'image', imageKeys: { url: 'iconUrl', id: 'iconPublicId' }, scope: 'skills', hint: 'Sans logo, une pastille avec les initiales est affichée.' },
      { key: 'color', label: 'Couleur', type: 'color', half: true },
      { key: 'proficiency', label: 'Niveau (0–100, facultatif)', type: 'number', half: true, hint: 'Laissez vide pour ne rien afficher.' },
      { key: 'preset', label: 'Forme / effet visuel', type: 'select', half: true, options: presetOpts(SKILL_PRESETS) },
      { key: 'visible', label: 'Visible', type: 'boolean', half: true },
      { key: 'featured', label: 'Mise en avant (module de la station)', type: 'boolean' },
      { key: 'allowedModes', label: 'Modes d’affichage autorisés', type: 'multiselect', options: opts(SKILL_VIEWS, SKILL_VIEW_LABELS) },
      { key: 'linkedSkillIds', label: 'Liens vers d’autres compétences', type: 'skillLinks', hint: 'Utilisés par l’arbre de compétences. Aucun lien n’est inventé s’il n’y en a pas.' },
    ],
  },
  education: {
    key: 'education', singular: 'formation', plural: 'Parcours académique', titleKey: 'title', schema: educationInput, toggles: ['visible', 'featured'], sortable: true, preview: 'education', dateSort: true,
    subtitle: r => `${r.institution ?? ''} · ${range(r)}`,
    emptyHint: 'Aucune formation. Sans entrée, la section est masquée (ou affiche un état neutre selon vos réglages).',
    defaults: () => ({ title: '', institution: '', degree: '', field: '', description: '', startDate: '', endDate: '', isCurrent: false, achievements: [], imageUrl: null, imagePublicId: null, url: '', color: '', preset: 'star', visible: true, featured: false }),
    fields: [
      { key: 'title', label: 'Titre', type: 'text', required: true },
      { key: 'institution', label: 'Établissement', type: 'text', half: true },
      { key: 'degree', label: 'Diplôme / type de formation', type: 'text', half: true },
      { key: 'field', label: 'Domaine', type: 'text' },
      { key: 'startDate', label: 'Début', type: 'date', required: true, half: true },
      { key: 'endDate', label: 'Fin', type: 'date', half: true, showIf: f => !f.isCurrent },
      { key: 'isCurrent', label: 'Formation en cours', type: 'boolean' },
      { key: 'description', label: 'Description', type: 'textarea', rows: 4 },
      { key: 'achievements', label: 'Réalisations associées', type: 'lines', hint: 'Une par ligne.' },
      { key: 'imageUrl', label: 'Logo / image (facultatif)', type: 'image', imageKeys: { url: 'imageUrl', id: 'imagePublicId' }, scope: 'education' },
      { key: 'url', label: 'URL officielle (facultative)', type: 'url' },
      { key: 'color', label: 'Couleur', type: 'color', half: true },
      { key: 'preset', label: 'Style de l’étoile', type: 'select', half: true, options: presetOpts(EDUCATION_PRESETS) },
      { key: 'visible', label: 'Visible', type: 'boolean', half: true },
      { key: 'featured', label: 'Mise en avant', type: 'boolean', half: true },
    ],
  },
  experiences: {
    key: 'experiences', singular: 'expérience', plural: 'Expériences professionnelles', titleKey: 'role', schema: experienceInput, toggles: ['visible', 'featured'], sortable: true, preview: 'experience', dateSort: true,
    subtitle: r => `${r.organization ?? ''} · ${range(r)}`,
    emptyHint: 'Aucune expérience. Emplois, stages, missions et activités associatives sont les bienvenus.',
    filters: [{ key: 'kind', label: 'Type', options: opts(EXPERIENCE_KINDS, EXPERIENCE_KIND_LABELS) }],
    defaults: () => ({ organization: '', role: '', kind: 'job', location: '', startDate: '', endDate: '', isCurrent: false, description: '', missions: [], results: [], technologies: [], imageUrl: null, imagePublicId: null, url: '', color: '', preset: 'hex', visible: true, featured: false }),
    fields: [
      { key: 'role', label: 'Rôle', type: 'text', required: true, half: true },
      { key: 'organization', label: 'Organisation', type: 'text', required: true, half: true },
      { key: 'kind', label: 'Type', type: 'select', half: true, options: opts(EXPERIENCE_KINDS, EXPERIENCE_KIND_LABELS) },
      { key: 'location', label: 'Lieu (facultatif)', type: 'text', half: true },
      { key: 'startDate', label: 'Début', type: 'date', required: true, half: true },
      { key: 'endDate', label: 'Fin', type: 'date', half: true, showIf: f => !f.isCurrent },
      { key: 'isCurrent', label: 'En cours', type: 'boolean' },
      { key: 'description', label: 'Description', type: 'textarea', rows: 4 },
      { key: 'missions', label: 'Missions', type: 'lines', hint: 'Une par ligne.' },
      { key: 'results', label: 'Résultats / points marquants', type: 'lines', hint: 'Un par ligne.' },
      { key: 'technologies', label: 'Technologies et outils', type: 'tags' },
      { key: 'imageUrl', label: 'Logo / image (facultatif)', type: 'image', imageKeys: { url: 'imageUrl', id: 'imagePublicId' }, scope: 'experiences' },
      { key: 'url', label: 'URL (facultative)', type: 'url' },
      { key: 'color', label: 'Couleur', type: 'color', half: true },
      { key: 'preset', label: 'Forme du module', type: 'select', half: true, options: presetOpts(EXPERIENCE_PRESETS) },
      { key: 'visible', label: 'Visible', type: 'boolean', half: true },
      { key: 'featured', label: 'Mise en avant', type: 'boolean', half: true },
    ],
  },
  certifications: {
    key: 'certifications', singular: 'certification', plural: 'Certifications et diplômes', titleKey: 'name', schema: certificationInput, toggles: ['visible', 'featured'], sortable: true, preview: 'certification', dateSort: true,
    subtitle: r => `${r.issuer ?? ''}${r.issuedAt ? ' · ' + fmt(r.issuedAt) : ''}`,
    emptyHint: 'Aucune certification. N’ajoutez un lien de vérification que s’il est officiel.',
    defaults: () => ({ name: '', issuer: '', category: '', issuedAt: '', expiresAt: '', credentialId: '', verificationUrl: '', imageUrl: null, imagePublicId: null, color: '', preset: 'crystal', visible: true, featured: false }),
    fields: [
      { key: 'name', label: 'Nom', type: 'text', required: true },
      { key: 'issuer', label: 'Organisme émetteur', type: 'text', half: true },
      { key: 'category', label: 'Catégorie', type: 'text', half: true },
      { key: 'issuedAt', label: 'Date d’obtention', type: 'date', half: true },
      { key: 'expiresAt', label: 'Expiration (facultative)', type: 'date', half: true },
      { key: 'credentialId', label: 'Identifiant de certification (facultatif)', type: 'text' },
      { key: 'verificationUrl', label: 'URL de vérification officielle (facultative)', type: 'url', hint: 'Ne renseignez que le lien fourni par l’organisme émetteur.' },
      { key: 'imageUrl', label: 'Image du certificat (publique)', type: 'image', imageKeys: { url: 'imageUrl', id: 'imagePublicId' }, scope: 'certifications', hint: 'Elle sera visible par tous les visiteurs : n’envoyez pas de document confidentiel.' },
      { key: 'color', label: 'Couleur', type: 'color', half: true },
      { key: 'preset', label: 'Badge / cristal', type: 'select', half: true, options: presetOpts(BADGE_PRESETS) },
      { key: 'visible', label: 'Visible', type: 'boolean', half: true },
      { key: 'featured', label: 'Mise en avant', type: 'boolean', half: true },
    ],
  },
  achievements: {
    key: 'achievements', singular: 'réalisation', plural: 'Réalisations et jalons', titleKey: 'title', schema: achievementInput, toggles: ['visible'], sortable: true, preview: 'achievement', dateSort: true,
    subtitle: r => fmt(r.date),
    emptyHint: 'Aucune réalisation : distinctions, concours, publications, langues… Elles s’affichent sous forme de jalons.',
    defaults: () => ({ title: '', categoryId: null, description: '', date: '', linkUrl: '', imageUrl: null, imagePublicId: null, preset: 'capsule', color: '', visible: true }),
    fields: [
      { key: 'title', label: 'Titre', type: 'text', required: true },
      { key: 'categoryId', label: 'Catégorie', type: 'categorySelect', half: true },
      { key: 'date', label: 'Date (facultative)', type: 'date', half: true },
      { key: 'description', label: 'Description', type: 'textarea', rows: 4 },
      { key: 'linkUrl', label: 'Lien externe (facultatif)', type: 'url' },
      { key: 'imageUrl', label: 'Image (facultative)', type: 'image', imageKeys: { url: 'imageUrl', id: 'imagePublicId' }, scope: 'achievements' },
      { key: 'color', label: 'Couleur', type: 'color', half: true },
      { key: 'preset', label: 'Style visuel', type: 'select', half: true, options: presetOpts(ACHIEVEMENT_PRESETS) },
      { key: 'visible', label: 'Visible', type: 'boolean' },
    ],
  },
  'achievement-categories': {
    key: 'achievement-categories', singular: 'catégorie', plural: 'Catégories de réalisations', titleKey: 'name', schema: achievementCategoryInput, toggles: ['visible'], sortable: true,
    emptyHint: 'Aucune catégorie. Masquer une catégorie retire ses réalisations du site public.',
    defaults: () => ({ name: '', slug: '', visible: true }),
    fields: [
      { key: 'name', label: 'Nom', type: 'text', required: true },
      { key: 'visible', label: 'Visible', type: 'boolean' },
    ],
  },
}
