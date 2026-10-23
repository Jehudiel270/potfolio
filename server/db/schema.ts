// Schéma Drizzle (PostgreSQL / Neon). Fichier pur : aucune auto-importation Nuxt, utilisable par les scripts et les tests.
import { sql } from 'drizzle-orm'
import {
  boolean, check, date, index, integer, jsonb, pgEnum, pgTable, smallint, text, timestamp, uniqueIndex, uuid,
} from 'drizzle-orm/pg-core'

const tz = (name: string) => timestamp(name, { withTimezone: true })
const stamps = {
  createdAt: tz('created_at').notNull().defaultNow(),
  updatedAt: tz('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
}

export const adminRole = pgEnum('admin_role', ['admin'])
export const publishStatus = pgEnum('publish_status', ['draft', 'published'])
export const messageStatus = pgEnum('message_status', ['new', 'read', 'handled'])
export const messageChannel = pgEnum('message_channel', ['form', 'widget'])
export const emailDelivery = pgEnum('email_delivery', ['sent', 'failed', 'skipped'])

export interface GalleryImage { url: string, publicId: string, alt?: string }

/* ───────── Administration ───────── */
export const adminUsers = pgTable('admin_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: adminRole('role').notNull().default('admin'),
  ...stamps,
  lastLoginAt: tz('last_login_at'),
})

export const adminSessions = pgTable('admin_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => adminUsers.id, { onDelete: 'cascade' }),
  csrfToken: text('csrf_token').notNull(),
  ipHash: text('ip_hash'),
  userAgent: text('user_agent'),
  createdAt: tz('created_at').notNull().defaultNow(),
  expiresAt: tz('expires_at').notNull(),
}, t => [index('admin_sessions_user_idx').on(t.userId), index('admin_sessions_exp_idx').on(t.expiresAt)])

/* ───────── Réglages globaux : une seule ligne (id = 1) ───────── */
export const siteSettings = pgTable('site_settings', {
  id: integer('id').primaryKey().default(1),
  settings: jsonb('settings').$type<Record<string, unknown>>().notNull().default({}),
  version: integer('version').notNull().default(1),
  updatedAt: tz('updated_at').notNull().defaultNow(),
}, t => [check('site_settings_singleton', sql`${t.id} = 1`)])

/* ───────── Projets ───────── */
export const projects = pgTable('projects', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  shortDescription: text('short_description').notNull().default(''),
  description: text('description').notNull().default(''),
  problem: text('problem').notNull().default(''),
  features: jsonb('features').$type<string[]>().notNull().default([]),
  category: text('category').notNull().default(''),
  technologies: jsonb('technologies').$type<string[]>().notNull().default([]),
  coverImageUrl: text('cover_image_url'),
  coverPublicId: text('cover_public_id'),
  gallery: jsonb('gallery').$type<GalleryImage[]>().notNull().default([]),
  liveUrl: text('live_url'),
  repositoryUrl: text('repository_url'),
  status: publishStatus('status').notNull().default('draft'),
  featured: boolean('featured').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  preset: text('preset').notNull().default('crystal'),
  color: text('color'),
  projectDate: date('project_date', { mode: 'string' }),
  isDemo: boolean('is_demo').notNull().default(false),
  ...stamps,
}, t => [index('projects_status_idx').on(t.status, t.sortOrder)])

/* ───────── Compétences ───────── */
export const skills = pgTable('skills', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  category: text('category').notNull().default(''),
  description: text('description').notNull().default(''),
  icon: text('icon'),
  iconUrl: text('icon_url'),
  iconPublicId: text('icon_public_id'),
  color: text('color'),
  proficiency: smallint('proficiency'),
  visible: boolean('visible').notNull().default(true),
  featured: boolean('featured').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  allowedModes: jsonb('allowed_modes').$type<string[]>().notNull().default(['station', 'hex', 'tree']),
  preset: text('preset').notNull().default('orb'),
  isDemo: boolean('is_demo').notNull().default(false),
  ...stamps,
}, t => [
  index('skills_visible_idx').on(t.visible, t.sortOrder),
  check('skills_proficiency_range', sql`${t.proficiency} is null or (${t.proficiency} between 0 and 100)`),
])

export const skillLinks = pgTable('skill_links', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  fromSkillId: integer('from_skill_id').notNull().references(() => skills.id, { onDelete: 'cascade' }),
  toSkillId: integer('to_skill_id').notNull().references(() => skills.id, { onDelete: 'cascade' }),
  label: text('label'),
}, t => [
  uniqueIndex('skill_links_pair_idx').on(t.fromSkillId, t.toSkillId),
  check('skill_links_no_self', sql`${t.fromSkillId} <> ${t.toSkillId}`),
])

/* ───────── Parcours académique ───────── */
export const educationEntries = pgTable('education_entries', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  title: text('title').notNull(),
  institution: text('institution').notNull().default(''),
  degree: text('degree').notNull().default(''),
  field: text('field').notNull().default(''),
  description: text('description').notNull().default(''),
  startDate: date('start_date', { mode: 'string' }).notNull(),
  endDate: date('end_date', { mode: 'string' }),
  isCurrent: boolean('is_current').notNull().default(false),
  achievements: jsonb('achievements').$type<string[]>().notNull().default([]),
  imageUrl: text('image_url'),
  imagePublicId: text('image_public_id'),
  url: text('url'),
  color: text('color'),
  preset: text('preset').notNull().default('star'),
  visible: boolean('visible').notNull().default(true),
  featured: boolean('featured').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  isDemo: boolean('is_demo').notNull().default(false),
  ...stamps,
}, t => [index('education_visible_idx').on(t.visible, t.startDate)])

/* ───────── Expériences professionnelles ───────── */
export const professionalExperiences = pgTable('professional_experiences', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  organization: text('organization').notNull(),
  role: text('role').notNull(),
  kind: text('kind').notNull().default('job'),
  location: text('location'),
  startDate: date('start_date', { mode: 'string' }).notNull(),
  endDate: date('end_date', { mode: 'string' }),
  isCurrent: boolean('is_current').notNull().default(false),
  description: text('description').notNull().default(''),
  missions: jsonb('missions').$type<string[]>().notNull().default([]),
  results: jsonb('results').$type<string[]>().notNull().default([]),
  technologies: jsonb('technologies').$type<string[]>().notNull().default([]),
  imageUrl: text('image_url'),
  imagePublicId: text('image_public_id'),
  url: text('url'),
  color: text('color'),
  preset: text('preset').notNull().default('hex'),
  visible: boolean('visible').notNull().default(true),
  featured: boolean('featured').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  isDemo: boolean('is_demo').notNull().default(false),
  ...stamps,
}, t => [index('experiences_visible_idx').on(t.visible, t.startDate)])

/* ───────── Certifications et diplômes ───────── */
export const certifications = pgTable('certifications', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: text('name').notNull(),
  issuer: text('issuer').notNull().default(''),
  category: text('category').notNull().default(''),
  issuedAt: date('issued_at', { mode: 'string' }),
  expiresAt: date('expires_at', { mode: 'string' }),
  credentialId: text('credential_id'),
  verificationUrl: text('verification_url'),
  imageUrl: text('image_url'),
  imagePublicId: text('image_public_id'),
  color: text('color'),
  preset: text('preset').notNull().default('crystal'),
  visible: boolean('visible').notNull().default(true),
  featured: boolean('featured').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  isDemo: boolean('is_demo').notNull().default(false),
  ...stamps,
}, t => [index('certifications_visible_idx').on(t.visible, t.sortOrder)])

/* ───────── Réalisations et autres jalons ───────── */
export const achievementCategories = pgTable('achievement_categories', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  visible: boolean('visible').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  ...stamps,
})

export const achievements = pgTable('achievements', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  title: text('title').notNull(),
  categoryId: integer('category_id').references(() => achievementCategories.id, { onDelete: 'set null' }),
  description: text('description').notNull().default(''),
  date: date('date', { mode: 'string' }),
  linkUrl: text('link_url'),
  imageUrl: text('image_url'),
  imagePublicId: text('image_public_id'),
  preset: text('preset').notNull().default('capsule'),
  color: text('color'),
  visible: boolean('visible').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  isDemo: boolean('is_demo').notNull().default(false),
  ...stamps,
}, t => [index('achievements_visible_idx').on(t.visible, t.sortOrder)])

/* ───────── Contact (privé, jamais exposé par l'API publique) ───────── */
export const contactMessages = pgTable('contact_messages', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  subject: text('subject'),
  message: text('message').notNull(),
  channel: messageChannel('channel').notNull().default('form'),
  status: messageStatus('status').notNull().default('new'),
  emailDelivery: emailDelivery('email_delivery').notNull().default('skipped'),
  ipHash: text('ip_hash'),
  createdAt: tz('created_at').notNull().defaultNow(),
  handledAt: tz('handled_at'),
}, t => [index('contact_messages_status_idx').on(t.status, t.createdAt)])

/* ───────── Limitation de fréquence (fenêtre fixe, partagée entre instances) ───────── */
export const rateLimits = pgTable('rate_limits', {
  key: text('key').primaryKey(),
  count: integer('count').notNull().default(0),
  windowStart: tz('window_start').notNull().defaultNow(),
})
