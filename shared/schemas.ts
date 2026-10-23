import { z } from 'zod'
import { ACHIEVEMENT_PRESETS, BADGE_PRESETS, EDUCATION_PRESETS, EXPERIENCE_KINDS, EXPERIENCE_PRESETS, PROJECT_PRESETS, SKILL_PRESETS, SKILL_VIEWS } from './presets'
import { hexColor } from './theme'
import { slugify } from './utils'

const emptyToNull = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? null : v)
export const httpUrl = z.string().trim().max(600).url('URL invalide').refine(u => /^https?:\/\//i.test(u), 'Seules les URL http(s) sont autorisées')
export const optUrl = z.preprocess(emptyToNull, httpUrl.nullable().optional().transform(v => v ?? null))
export const optText = (max: number) => z.preprocess(emptyToNull, z.string().trim().max(max).nullable().optional().transform(v => v ?? null))
export const optColor = z.preprocess(emptyToNull, hexColor.nullable().optional().transform(v => v ?? null))
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date attendue au format AAAA-MM-JJ').refine(d => !Number.isNaN(Date.parse(d)), 'Date invalide')
export const optDate = z.preprocess(emptyToNull, isoDate.nullable().optional().transform(v => v ?? null))
export const strList = (maxItems = 40, maxLen = 300) => z.array(z.string().trim().min(1).max(maxLen)).max(maxItems).default([])
const sortOrder = z.number().int().min(0).max(100000).default(0)
const req = (label: string, max: number) => z.string().trim().min(1, `${label} requis`).max(max)
const longText = (max = 8000) => z.string().trim().max(max).default('')
const slugField = z.preprocess(
  v => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.string().trim().max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug : lettres minuscules, chiffres et tirets, sans espace').optional(),
)
const publicId = z.preprocess(emptyToNull, z.string().trim().max(300).nullable().optional().transform(v => v ?? null))

/** Dates : fin ≥ début, et « en cours » supprime la date de fin. */
function dateRules<T extends { startDate: string | null, endDate: string | null, isCurrent: boolean }>(v: T, ctx: z.RefinementCtx) {
  if (v.endDate && v.startDate && v.endDate < v.startDate) ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'La date de fin précède la date de début' })
}
const finishDates = <T extends { endDate: string | null, isCurrent: boolean }>(v: T): T => (v.isCurrent ? { ...v, endDate: null } : v)

export const galleryImage = z.object({ url: httpUrl, publicId: z.string().trim().min(1).max(300), alt: z.string().trim().max(200).optional() })

/* ───────── Projets ───────── */
export const projectInput = z.object({
  title: req('Titre', 140),
  slug: slugField,
  shortDescription: z.string().trim().max(300).default(''),
  description: longText(),
  problem: longText(3000),
  features: strList(20),
  category: z.string().trim().max(60).default(''),
  technologies: strList(30, 40),
  coverImageUrl: optUrl, coverPublicId: publicId,
  gallery: z.array(galleryImage).max(12).default([]),
  liveUrl: optUrl, repositoryUrl: optUrl,
  status: z.enum(['draft', 'published']).default('draft'),
  featured: z.boolean().default(false),
  sortOrder,
  preset: z.enum(PROJECT_PRESETS).default('crystal'),
  color: optColor,
  projectDate: optDate,
}).transform(v => ({ ...v, slug: v.slug ?? (slugify(v.title) || 'projet') }))

/* ───────── Compétences ───────── */
export const skillInput = z.object({
  name: req('Nom', 80),
  slug: slugField,
  category: z.string().trim().max(60).default(''),
  description: z.string().trim().max(1000).default(''),
  icon: optText(40), iconUrl: optUrl, iconPublicId: publicId,
  color: optColor,
  proficiency: z.preprocess(v => (v === '' || v === undefined ? null : v), z.number().int().min(0).max(100).nullable()).default(null),
  visible: z.boolean().default(true),
  featured: z.boolean().default(false),
  sortOrder,
  allowedModes: z.array(z.enum(SKILL_VIEWS)).min(1, 'Au moins un mode').default(['station', 'hex', 'tree']),
  preset: z.enum(SKILL_PRESETS).default('orb'),
  linkedSkillIds: z.array(z.number().int().positive()).max(30).default([]),
}).transform(v => ({ ...v, slug: v.slug ?? (slugify(v.name) || 'competence') }))

/* ───────── Parcours académique ───────── */
export const educationInput = z.object({
  title: req('Titre', 160),
  institution: z.string().trim().max(160).default(''),
  degree: z.string().trim().max(160).default(''),
  field: z.string().trim().max(160).default(''),
  description: longText(4000),
  startDate: isoDate,
  endDate: optDate,
  isCurrent: z.boolean().default(false),
  achievements: strList(20),
  imageUrl: optUrl, imagePublicId: publicId,
  url: optUrl, color: optColor,
  preset: z.enum(EDUCATION_PRESETS).default('star'),
  visible: z.boolean().default(true),
  featured: z.boolean().default(false),
  sortOrder,
}).superRefine(dateRules).transform(finishDates)

/* ───────── Expériences ───────── */
export const experienceInput = z.object({
  organization: req('Organisation', 160),
  role: req('Rôle', 160),
  kind: z.enum(EXPERIENCE_KINDS).default('job'),
  location: optText(120),
  startDate: isoDate,
  endDate: optDate,
  isCurrent: z.boolean().default(false),
  description: longText(4000),
  missions: strList(20, 400),
  results: strList(20, 400),
  technologies: strList(30, 40),
  imageUrl: optUrl, imagePublicId: publicId,
  url: optUrl, color: optColor,
  preset: z.enum(EXPERIENCE_PRESETS).default('hex'),
  visible: z.boolean().default(true),
  featured: z.boolean().default(false),
  sortOrder,
}).superRefine(dateRules).transform(finishDates)

/* ───────── Certifications ───────── */
export const certificationInput = z.object({
  name: req('Nom', 200),
  issuer: z.string().trim().max(160).default(''),
  category: z.string().trim().max(60).default(''),
  issuedAt: optDate, expiresAt: optDate,
  credentialId: optText(120),
  verificationUrl: optUrl,
  imageUrl: optUrl, imagePublicId: publicId,
  color: optColor,
  preset: z.enum(BADGE_PRESETS).default('crystal'),
  visible: z.boolean().default(true),
  featured: z.boolean().default(false),
  sortOrder,
}).superRefine((v, ctx) => {
  if (v.issuedAt && v.expiresAt && v.expiresAt < v.issuedAt) ctx.addIssue({ code: 'custom', path: ['expiresAt'], message: 'L’expiration précède l’obtention' })
})

/* ───────── Réalisations ───────── */
export const achievementInput = z.object({
  title: req('Titre', 200),
  categoryId: z.preprocess(v => (v === '' || v === undefined ? null : v), z.number().int().positive().nullable()).default(null),
  description: longText(3000),
  date: optDate,
  linkUrl: optUrl,
  imageUrl: optUrl, imagePublicId: publicId,
  preset: z.enum(ACHIEVEMENT_PRESETS).default('capsule'),
  color: optColor,
  visible: z.boolean().default(true),
  sortOrder,
})
export const achievementCategoryInput = z.object({
  name: req('Nom', 80),
  slug: slugField,
  visible: z.boolean().default(true),
  sortOrder,
}).transform(v => ({ ...v, slug: v.slug ?? (slugify(v.name) || 'categorie') }))

/** Bascules rapides depuis les listes d'administration. */
export const quickToggleInput = z.object({
  visible: z.boolean().optional(), featured: z.boolean().optional(), status: z.enum(['draft', 'published']).optional(),
}).strict().refine(v => Object.keys(v).length > 0, 'Aucun champ')

export const reorderInput = z.object({ ids: z.array(z.number().int().positive()).min(1).max(500) })

export const messagePatchInput = z.object({ status: z.enum(['new', 'read', 'handled']) })

export const loginInput = z.object({ email: z.string().trim().toLowerCase().email().max(200), password: z.string().min(1).max(200) })
