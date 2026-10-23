// CRUD générique piloté par un registre : une seule implémentation pour les 7 ressources administrables.
import { and, asc, eq, ilike, inArray, or, sql, getTableColumns, type SQL } from 'drizzle-orm'
import type { AnyPgColumn, AnyPgTable } from 'drizzle-orm/pg-core'
import type { ZodTypeAny } from 'zod'
import * as t from '../db/schema'
import { achievementCategoryInput, achievementInput, certificationInput, educationInput, experienceInput, projectInput, quickToggleInput, skillInput } from '../../shared/schemas'
import { slugify } from '../../shared/utils'
import { AppError, badRequest, notFound } from './errors'
import type { Db } from './db-type'

export type Row = Record<string, unknown>
export interface AssetField { url: string, id: string }
export interface ResourceDef {
  key: string
  label: string
  table: AnyPgTable
  schema: ZodTypeAny
  assets: AssetField[]
  gallery?: string
  search: string[]
  filters: string[]
  slug?: { field: string, from: string }
}

export const RESOURCES: Record<string, ResourceDef> = {
  projects: { key: 'projects', label: 'Projet', table: t.projects, schema: projectInput, assets: [{ url: 'coverImageUrl', id: 'coverPublicId' }], gallery: 'gallery', search: ['title', 'shortDescription', 'category'], filters: ['status', 'category'], slug: { field: 'slug', from: 'title' } },
  skills: { key: 'skills', label: 'Compétence', table: t.skills, schema: skillInput, assets: [{ url: 'iconUrl', id: 'iconPublicId' }], search: ['name', 'category'], filters: ['category', 'visible'], slug: { field: 'slug', from: 'name' } },
  education: { key: 'education', label: 'Formation', table: t.educationEntries, schema: educationInput, assets: [{ url: 'imageUrl', id: 'imagePublicId' }], search: ['title', 'institution', 'field'], filters: ['visible'] },
  experiences: { key: 'experiences', label: 'Expérience', table: t.professionalExperiences, schema: experienceInput, assets: [{ url: 'imageUrl', id: 'imagePublicId' }], search: ['organization', 'role'], filters: ['kind', 'visible'] },
  certifications: { key: 'certifications', label: 'Certification', table: t.certifications, schema: certificationInput, assets: [{ url: 'imageUrl', id: 'imagePublicId' }], search: ['name', 'issuer', 'category'], filters: ['category', 'visible'] },
  achievements: { key: 'achievements', label: 'Réalisation', table: t.achievements, schema: achievementInput, assets: [{ url: 'imageUrl', id: 'imagePublicId' }], search: ['title', 'description'], filters: ['categoryId', 'visible'] },
  'achievement-categories': { key: 'achievement-categories', label: 'Catégorie', table: t.achievementCategories, schema: achievementCategoryInput, assets: [], search: ['name'], filters: ['visible'], slug: { field: 'slug', from: 'name' } },
}

const cols = (def: ResourceDef) => getTableColumns(def.table) as Record<string, AnyPgColumn>
const col = (def: ResourceDef, name: string): AnyPgColumn => {
  const c = cols(def)[name]
  if (!c) throw badRequest(`Champ inconnu : ${name}`)
  return c
}
const idCol = (def: ResourceDef) => col(def, 'id')

export function getDef(key: string): ResourceDef {
  const d = RESOURCES[key]
  if (!d) throw notFound('Ressource')
  return d
}

/** Collecte les publicId Cloudinary d'une ligne (champs d'image + galerie). */
export function assetIdsOf(def: ResourceDef, row: Row | null | undefined): string[] {
  if (!row) return []
  const ids = def.assets.map(a => row[a.id]).filter((v): v is string => typeof v === 'string' && v.length > 0)
  if (def.gallery && Array.isArray(row[def.gallery])) for (const g of row[def.gallery] as { publicId?: string }[]) if (g.publicId) ids.push(g.publicId)
  return ids
}

export type AssetPolicy = (publicId: string, url: string | null) => boolean

/** Toute URL d'image doit être accompagnée d'un publicId appartenant à notre dossier Cloudinary. */
export function checkAssets(def: ResourceDef, data: Row, isOwned: AssetPolicy | undefined) {
  for (const a of def.assets) {
    const url = data[a.url] as string | null | undefined, id = data[a.id] as string | null | undefined
    if (url && !id) throw new AppError(422, 'validation', 'Image non reconnue : utilisez le téléversement de l’administration.', { field: a.url })
    if (!url && id) data[a.id] = null
    if (url && id && isOwned && !isOwned(id, url)) throw new AppError(422, 'validation', 'Image non reconnue : utilisez le téléversement de l’administration.', { field: a.url })
  }
  if (def.gallery && Array.isArray(data[def.gallery]) && isOwned) {
    for (const g of data[def.gallery] as { url: string, publicId: string }[]) if (!isOwned(g.publicId, g.url)) throw new AppError(422, 'validation', 'Image de galerie non reconnue.')
  }
}

export function isUniqueViolation(e: unknown): boolean {
  const err = e as { code?: string, cause?: { code?: string }, message?: string }
  return err?.code === '23505' || err?.cause?.code === '23505' || /duplicate key|unique constraint/i.test(err?.message ?? '')
}

async function uniqueSlug(db: Db, def: ResourceDef, base: string, excludeId?: number): Promise<string> {
  const s = def.slug!, c = col(def, s.field)
  const root = slugify(base) || 'element'
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`
    const where = excludeId ? and(eq(c, candidate), sql`${idCol(def)} <> ${excludeId}`) : eq(c, candidate)
    const found = await db.select({ id: idCol(def) }).from(def.table).where(where).limit(1)
    if (!found.length) return candidate
  }
  return `${root}-${Date.now()}`
}

export interface ListQuery { q?: string, filters?: Record<string, string | undefined> }

export async function listRows(db: Db, def: ResourceDef, query: ListQuery = {}): Promise<Row[]> {
  const where: SQL[] = []
  if (query.q?.trim()) {
    const like = `%${query.q.trim().replace(/[%_\\]/g, m => '\\' + m)}%`
    where.push(or(...def.search.map(f => ilike(col(def, f), like)))!)
  }
  for (const [k, v] of Object.entries(query.filters ?? {})) {
    if (v === undefined || v === '' || !def.filters.includes(k)) continue
    const c = col(def, k)
    where.push(v === 'true' || v === 'false' ? eq(c, v === 'true') : eq(c, /^\d+$/.test(v) && k.endsWith('Id') ? Number(v) : v))
  }
  const rows = (await db.select().from(def.table).where(where.length ? and(...where) : undefined)
    .orderBy(asc(col(def, 'sortOrder')), asc(idCol(def)))) as Row[]
  if (def.key === 'skills') return attachLinks(db, rows)
  return rows
}

async function attachLinks(db: Db, rows: Row[]): Promise<Row[]> {
  if (!rows.length) return rows
  const links = await db.select().from(t.skillLinks)
  return rows.map(r => ({ ...r, linkedSkillIds: links.filter(l => l.fromSkillId === r.id).map(l => l.toSkillId) }))
}

export async function getRow(db: Db, def: ResourceDef, id: number): Promise<Row> {
  const [row] = (await db.select().from(def.table).where(eq(idCol(def), id)).limit(1)) as Row[]
  if (!row) throw notFound(def.label)
  return def.key === 'skills' ? (await attachLinks(db, [row]))[0]! : row
}

async function setSkillLinks(db: Db, skillId: number, ids: number[]) {
  const wanted = [...new Set(ids)].filter(i => i !== skillId)
  if (wanted.length) {
    const existing = await db.select({ id: t.skills.id }).from(t.skills).where(inArray(t.skills.id, wanted))
    if (existing.length !== wanted.length) throw badRequest('Compétence liée introuvable')
  }
  await db.delete(t.skillLinks).where(eq(t.skillLinks.fromSkillId, skillId))
  if (wanted.length) await db.insert(t.skillLinks).values(wanted.map(to => ({ fromSkillId: skillId, toSkillId: to })))
}

export interface CrudHooks { isOwnedAsset?: AssetPolicy, deleteAssets?: (publicIds: string[]) => Promise<void> }

/** Supprime de Cloudinary les images qui ne sont plus référencées par aucune ligne. */
export async function releaseAssets(db: Db, candidates: string[], hooks: CrudHooks): Promise<string[]> {
  const unique = [...new Set(candidates)]
  if (!unique.length || !hooks.deleteAssets) return []
  const stillUsed = new Set<string>()
  for (const def of Object.values(RESOURCES)) {
    for (const a of def.assets) {
      const rows = await db.select({ v: col(def, a.id) }).from(def.table).where(inArray(col(def, a.id), unique))
      for (const r of rows) stillUsed.add(r.v as string)
    }
    if (def.gallery) {
      for (const id of unique) {
        if (stillUsed.has(id)) continue
        const hit = await db.select({ id: idCol(def) }).from(def.table).where(sql`${col(def, def.gallery)} @> ${JSON.stringify([{ publicId: id }])}::jsonb`).limit(1)
        if (hit.length) stillUsed.add(id)
      }
    }
  }
  const orphans = unique.filter(i => !stillUsed.has(i))
  if (orphans.length) await hooks.deleteAssets(orphans)
  return orphans
}

export async function createRow(db: Db, def: ResourceDef, input: unknown, hooks: CrudHooks = {}): Promise<Row> {
  const parsed = def.schema.safeParse(input)
  if (!parsed.success) throw new AppError(422, 'validation', 'Données invalides', parsed.error.flatten())
  const { linkedSkillIds, ...data } = parsed.data as Row & { linkedSkillIds?: number[] }
  checkAssets(def, data, hooks.isOwnedAsset)
  if (def.slug) data[def.slug.field] = await uniqueSlug(db, def, String(data[def.slug.field] ?? data[def.slug.from]))
  if (!data.sortOrder) {
    const [m] = await db.select({ m: sql<number>`coalesce(max(${col(def, 'sortOrder')}), 0)` }).from(def.table)
    data.sortOrder = Number(m?.m ?? 0) + 1
  }
  try {
    const [row] = (await db.insert(def.table).values(data as never).returning()) as Row[]
    if (def.key === 'skills') await setSkillLinks(db, row!.id as number, linkedSkillIds ?? [])
    return getRow(db, def, row!.id as number)
  } catch (e) {
    if (isUniqueViolation(e)) throw new AppError(409, 'conflict', 'Cet identifiant (slug) existe déjà')
    throw e
  }
}

export async function updateRow(db: Db, def: ResourceDef, id: number, input: unknown, hooks: CrudHooks = {}): Promise<Row> {
  const old = await getRow(db, def, id)
  const parsed = def.schema.safeParse(input)
  if (!parsed.success) throw new AppError(422, 'validation', 'Données invalides', parsed.error.flatten())
  const { linkedSkillIds, ...data } = parsed.data as Row & { linkedSkillIds?: number[] }
  checkAssets(def, data, hooks.isOwnedAsset)
  if (def.slug) data[def.slug.field] = await uniqueSlug(db, def, String(data[def.slug.field] ?? data[def.slug.from]), id)
  try {
    await db.update(def.table).set(data as never).where(eq(idCol(def), id))
    if (def.key === 'skills') await setSkillLinks(db, id, linkedSkillIds ?? [])
  } catch (e) {
    if (isUniqueViolation(e)) throw new AppError(409, 'conflict', 'Cet identifiant (slug) existe déjà')
    throw e
  }
  const fresh = await getRow(db, def, id)
  const kept = new Set(assetIdsOf(def, fresh))
  await releaseAssets(db, assetIdsOf(def, old).filter(a => !kept.has(a)), hooks).catch(() => undefined)
  return fresh
}

export async function toggleRow(db: Db, def: ResourceDef, id: number, patch: unknown): Promise<Row> {
  const parsed = quickToggleInput.safeParse(patch)
  if (!parsed.success) throw new AppError(422, 'validation', 'Bascule invalide', parsed.error.flatten())
  const set: Row = {}
  for (const [k, v] of Object.entries(parsed.data)) {
    if (cols(def)[k]) set[k] = v
    else throw badRequest(`« ${k} » n’existe pas pour ce type de contenu`)
  }
  await getRow(db, def, id)
  await db.update(def.table).set(set as never).where(eq(idCol(def), id))
  return getRow(db, def, id)
}

export async function deleteRow(db: Db, def: ResourceDef, id: number, hooks: CrudHooks = {}): Promise<void> {
  const old = await getRow(db, def, id)
  await db.delete(def.table).where(eq(idCol(def), id))
  await releaseAssets(db, assetIdsOf(def, old), hooks).catch(() => undefined)
}

/** Réordonne en une seule requête SQL (atomique, indépendante du pilote). */
export async function reorderRows(db: Db, def: ResourceDef, ids: number[]): Promise<void> {
  const unique = [...new Set(ids)]
  const found = await db.select({ id: idCol(def) }).from(def.table).where(inArray(idCol(def), unique))
  if (found.length !== unique.length) throw badRequest('Identifiant inconnu dans la liste à réordonner')
  const values = sql.join(unique.map((id, i) => sql`(${id}::int, ${i + 1}::int)`), sql`, `)
  await db.execute(sql`update ${def.table} as x set sort_order = v.ord from (values ${values}) as v(id, ord) where x.id = v.id`)
}

/** Réécrit sort_order dans l'ordre chronologique (début décroissant ou croissant). */
export async function sortByDate(db: Db, def: ResourceDef, field: string, direction: 'asc' | 'desc' = 'asc'): Promise<void> {
  const rows = (await db.select({ id: idCol(def), d: col(def, field) }).from(def.table)) as { id: number, d: string | null }[]
  const sorted = rows.sort((a, b) => (a.d ?? '9999').localeCompare(b.d ?? '9999') * (direction === 'asc' ? 1 : -1)).map(r => r.id)
  if (sorted.length) await reorderRows(db, def, sorted)
}

export async function countRows(db: Db, def: ResourceDef, where?: SQL): Promise<number> {
  const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(def.table).where(where)
  return Number(r?.n ?? 0)
}
