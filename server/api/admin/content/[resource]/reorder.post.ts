import { getDef, reorderRows } from '../../../../services/crud'
import { reorderInput } from '../../../../../shared/schemas'

export default defineApi(async (event) => {
  await requireAdmin(event)
  const parsed = reorderInput.safeParse(await readJson(event))
  if (!parsed.success) throw new AppError(422, 'validation', 'Liste d’identifiants invalide.')
  await reorderRows(useDb(), getDef(getRouterParam(event, 'resource') ?? ''), parsed.data.ids)
  invalidatePublicCache()
  return { ok: true }
})
