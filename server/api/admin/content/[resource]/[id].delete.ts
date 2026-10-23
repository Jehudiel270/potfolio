import { deleteRow, getDef } from '../../../../services/crud'

export default defineApi(async (event) => {
  await requireAdmin(event)
  await deleteRow(useDb(), getDef(getRouterParam(event, 'resource') ?? ''), intParam(event, 'id'), { deleteAssets })
  invalidatePublicCache()
  return { ok: true }
})
