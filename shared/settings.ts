import { z } from 'zod'
import { NAV_DEFAULT_LABELS, NAV_IDS, SKILL_VIEWS, SKILL_VIEW_LABELS, type NavId, type SkillView } from './presets'
import { themeSchema } from './theme'
import { normalizeWhatsAppNumber, type ContactFieldConfig } from './contact'
import { httpUrl } from './schemas'

const t = (def: string, max = 300) => z.string().trim().max(max).default(def)
const bool = (def: boolean) => z.boolean().default(def)
const num = (def: number, min: number, max: number) => z.number().min(min).max(max).default(def)

const sectionCfg = (title: string, intro: string) => z.object({
  enabled: bool(true), title: t(title, 80), intro: t(intro, 400), showWhenEmpty: bool(false),
  emptyLabel: t('Cette section sera bientôt enrichie.', 200),
}).default({})

const linkSchema = z.object({
  id: z.string().trim().min(1).max(40), label: z.string().trim().min(1).max(60), url: httpUrl,
  kind: z.enum(['github', 'linkedin', 'x', 'instagram', 'youtube', 'website', 'other']).default('other'), visible: bool(true),
})

const fieldSchema = z.object({
  key: z.enum(['name', 'email', 'subject', 'message']), enabled: z.boolean(), required: z.boolean(),
  label: z.string().trim().min(1).max(60), placeholder: z.string().trim().max(120),
})
export const DEFAULT_CONTACT_FIELDS: ContactFieldConfig[] = [
  { key: 'name', enabled: true, required: true, label: 'Nom', placeholder: 'Votre nom' },
  { key: 'email', enabled: true, required: true, label: 'E-mail', placeholder: 'vous@exemple.com' },
  { key: 'subject', enabled: false, required: false, label: 'Sujet', placeholder: 'De quoi s’agit-il ?' },
  { key: 'message', enabled: true, required: true, label: 'Message', placeholder: 'Parlez-moi de votre projet…' },
]

const navItem = z.object({ id: z.enum(NAV_IDS), label: z.string().trim().min(1).max(40), visible: z.boolean(), order: z.number().int().min(0).max(100) })
export const defaultNav = () => NAV_IDS.map((id, i) => ({ id, label: NAV_DEFAULT_LABELS[id], visible: true, order: i }))
/** Complète les entrées manquantes (nouvelle section ajoutée plus tard) et supprime les doublons. */
export function normalizeNav(items: z.infer<typeof navItem>[]) {
  const seen = new Set<NavId>()
  const out = items.filter(i => (seen.has(i.id) ? false : (seen.add(i.id), true)))
  for (const d of defaultNav()) if (!seen.has(d.id)) out.push({ ...d, order: out.length })
  return out.sort((a, b) => a.order - b.order)
}

export const siteSettingsSchema = z.object({
  identity: z.object({
    displayName: t('Votre Nom (démo)', 80),
    title: t('Développeur créatif (démo)', 120),
    tagline: t('Je construis des expériences web mémorables.', 240),
    intro: t('Embarquez pour un voyage à travers mes compétences, mon parcours et mes projets.', 400),
    about: t('Texte « À propos » à renseigner dans l’administration, onglet Contenu.', 4000),
    email: z.string().trim().max(200).email().or(z.literal('')).default(''),
  }).default({}),
  buttons: z.object({
    discover: t('Découvrir mon univers', 50), contact: t('Me contacter', 50), backToStart: t('Revenir au début du voyage', 60),
    skip: t('Passer au contenu', 50), close: t('Fermer', 30), send: t('Envoyer le message', 50),
    demo: t('Voir la démo', 40), source: t('Code source', 40), verify: t('Vérifier le certificat', 50),
  }).default({}),
  hero: z.object({
    globeMarker: z.object({ lat: num(0, -90, 90), lon: num(0, -180, 180), label: t('', 60) }).nullable().default(null),
  }).default({}),
  links: z.array(linkSchema).max(12).default([]),
  finale: z.object({
    title: t('Et si on construisait quelque chose ensemble ?', 120),
    text: t('Écrivez-moi : je réponds dès que possible.', 400),
  }).default({}),
  theme: themeSchema.default({}),
  visuals: z.object({
    particleDensity: num(1, 0.2, 1.5),
    bloomStrength: num(0.9, 0, 2),
    rotationSpeed: num(1, 0, 2),
    globalLight: num(1, 0.4, 1.8),
    bloom: bool(true), warp: bool(true), dither: bool(false), scanlines: bool(true), sound: bool(true),
    smoothScroll: bool(true),
  }).default({}),
  sections: z.object({
    skills: sectionCfg('Compétences', 'Les technologies que j’utilise au quotidien.'),
    education: sectionCfg('Parcours', 'Les étapes de ma formation.'),
    experiences: sectionCfg('Expériences', 'Mes missions, stages et responsabilités.'),
    certifications: sectionCfg('Certifications', 'Diplômes et certifications obtenus.'),
    achievements: sectionCfg('Réalisations', 'Distinctions, concours et autres jalons.'),
    projects: sectionCfg('Projets', 'Une sélection de réalisations concrètes.'),
  }).default({}),
  skillViews: z.object({
    enabled: z.object({ station: bool(true), hex: bool(true), tree: bool(true) }).default({}),
    defaultView: z.enum(SKILL_VIEWS).default('station'),
    showSwitcher: bool(true),
    switcherLabel: t('Changer de vue', 40),
    order: z.array(z.enum(SKILL_VIEWS)).default([...SKILL_VIEWS]),
    labels: z.object({ station: t(SKILL_VIEW_LABELS.station, 40), hex: t(SKILL_VIEW_LABELS.hex, 40), tree: t(SKILL_VIEW_LABELS.tree, 40) }).default({}),
  }).default({}),
  navigation: z.object({
    items: z.array(navItem).default(defaultNav()),
    showProgress: bool(true), showSkipLink: bool(true),
  }).default({}),
  contact: z.object({
    pageEnabled: bool(true),
    title: t('Parlons de votre projet', 100),
    intro: t('Un message, une idée, une question : choisissez le canal qui vous convient.', 400),
    mode: z.enum(['email', 'whatsapp', 'both', 'none']).default('email'),
    fields: z.array(fieldSchema).default(DEFAULT_CONTACT_FIELDS),
    recipientEmail: z.string().trim().max(200).email().or(z.literal('')).default(''),
    emailSubjectTemplate: t('Nouveau message de {name}', 150),
    emailBodyTemplate: t('De : {name} <{email}>\n\n{message}', 3000),
    whatsappNumber: z.string().trim().max(30).refine(v => v === '' || normalizeWhatsAppNumber(v) !== null, 'Numéro international invalide (ex. +229 01 23 45 67 89)').default(''),
    whatsappText: t('Bonjour, je suis {name}. {message}', 600),
    successMessage: t('Merci ! Votre message a bien été envoyé.', 200),
    errorMessage: t('Le message n’a pas pu être envoyé. Réessayez ou utilisez un autre canal.', 200),
    afterSubmit: z.enum(['message', 'whatsapp_prompt', 'home']).default('message'),
    storeMessages: bool(true),
    retentionDays: z.number().int().min(7).max(1095).default(365),
  }).default({}),
  widget: z.object({
    enabled: bool(true),
    label: t('Contact rapide', 40),
    position: z.enum(['bottom-right', 'bottom-left']).default('bottom-right'),
    welcomeMessage: t('Bonjour ! Laissez-moi un message : je réponds par e-mail, ce n’est pas un chat en temps réel.', 300),
    channels: z.object({ form: bool(true), email: bool(true), whatsapp: bool(true) }).default({}),
  }).default({}),
  seo: z.object({
    title: t('Portfolio spatial', 70),
    description: t('Portfolio immersif en 3D : compétences, parcours, expériences, certifications et projets.', 200),
  }).default({}),
})
export type SiteSettings = z.infer<typeof siteSettingsSchema>

export function parseSettings(raw: unknown): SiteSettings {
  const r = siteSettingsSchema.safeParse(raw ?? {})
  const s = r.success ? r.data : siteSettingsSchema.parse({})
  s.navigation.items = normalizeNav(s.navigation.items)
  const missing = SKILL_VIEWS.filter(v => !s.skillViews.order.includes(v))
  s.skillViews.order = [...new Set([...s.skillViews.order, ...missing])] as SkillView[]
  return s
}

/** Réglages exposés au public : sans destinataire, modèle d'e-mail ni secret. */
export function toPublicSettings(s: SiteSettings) {
  const { recipientEmail: _r, emailBodyTemplate: _b, emailSubjectTemplate: _s, retentionDays: _d, storeMessages: _m, ...contact } = s.contact
  const wa = s.contact.mode === 'whatsapp' || s.contact.mode === 'both' || s.widget.channels.whatsapp
  return { ...s, contact: { ...contact, whatsappNumber: wa ? contact.whatsappNumber : '' } }
}
export type PublicSettings = ReturnType<typeof toPublicSettings>
