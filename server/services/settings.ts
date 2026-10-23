import { eq } from 'drizzle-orm'
import { siteSettings } from '../db/schema'
import { parseSettings, siteSettingsSchema, type SiteSettings } from '../../shared/settings'
import { AppError } from './errors'
import type { Db } from './db-type'

export const SETTINGS_SLICES = ['identity', 'buttons', 'hero', 'links', 'finale', 'theme', 'visuals', 'sections', 'skillViews', 'navigation', 'contact', 'widget', 'seo'] as const
export type SettingsSlice = typeof SETTINGS_SLICES[number]

export async function loadSettings(db: Db): Promise<{ settings: SiteSettings, version: number, updatedAt: string | null }> {
  const [row] = await db.select().from(siteSettings).where(eq(siteSettings.id, 1)).limit(1)
  return { settings: parseSettings(row?.settings), version: row?.version ?? 0, updatedAt: row?.updatedAt?.toISOString() ?? null }
}

/**
 * Remplace une ou plusieurs tranches de réglages (une page d'administration = une tranche) ;
 * `expectedVersion` évite d'écraser une modification faite entre-temps depuis un autre onglet.
 */
export async function saveSettingsSlices(db: Db, patch: Partial<Record<SettingsSlice, unknown>>, expectedVersion?: number) {
  const current = await loadSettings(db)
  if (expectedVersion !== undefined && expectedVersion !== current.version) {
    throw new AppError(409, 'stale_settings', 'Les réglages ont été modifiés ailleurs. Rechargez la page avant d’enregistrer.')
  }
  const merged: Record<string, unknown> = { ...current.settings }
  for (const k of SETTINGS_SLICES) if (k in patch) merged[k] = patch[k]
  const parsed = siteSettingsSchema.safeParse(merged)
  if (!parsed.success) throw new AppError(422, 'validation', 'Réglages invalides', parsed.error.flatten())
  const clean = parseSettings(parsed.data)
  const [row] = await db.insert(siteSettings).values({ id: 1, settings: clean as unknown as Record<string, unknown>, version: 1 })
    .onConflictDoUpdate({ target: siteSettings.id, set: { settings: clean as unknown as Record<string, unknown>, version: current.version + 1, updatedAt: new Date() } }).returning()
  return { settings: clean, version: row!.version }
}
