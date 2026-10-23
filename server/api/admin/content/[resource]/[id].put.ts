import { getDef, updateRow } from '../../../../services/crud'

export default defineApi(async (event) => {
  await requireAdmin(event)
  const row = await updateRow(useDb(), getDef(getRouterParam(event, 'resource') ?? ''), intParam(event, 'id'), await readJson(event), { isOwnedAsset, deleteAssets })
  invalidatePublicCache()
  return row
})
