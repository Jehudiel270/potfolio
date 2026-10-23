import { z } from 'zod'
import { SETTINGS_SLICES, saveSettingsSlices, type SettingsSlice } from '../../services/settings'

const body = z.object({ patch: z.record(z.string(), z.unknown()), version: z.number().int().min(0).optional() })

export default defineApi(async (event) => {
  await requireAdmin(event)
  const parsed = body.safeParse(await readJson(event))
  if (!parsed.success) throw new AppError(400, 'bad_request', 'Requête invalide.')
  const unknown = Object.keys(parsed.data.patch).filter(k => !SETTINGS_SLICES.includes(k as SettingsSlice))
  if (unknown.length) throw new AppError(400, 'bad_request', `Section de réglages inconnue : ${unknown.join(', ')}`)
  const saved = await saveSettingsSlices(useDb(), parsed.data.patch as Partial<Record<SettingsSlice, unknown>>, parsed.data.version)
  invalidatePublicCache()
  return saved
})
