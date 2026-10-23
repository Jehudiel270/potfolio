import { createRow, getDef } from '../../../../services/crud'

export default defineApi(async (event) => {
  await requireAdmin(event)
  const row = await createRow(useDb(), getDef(getRouterParam(event, 'resource') ?? ''), await readJson(event), { isOwnedAsset, deleteAssets })
  invalidatePublicCache()
  setResponseStatus(event, 201)
  return row
})
