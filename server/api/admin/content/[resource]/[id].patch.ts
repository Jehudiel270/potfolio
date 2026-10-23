import { getDef, toggleRow } from '../../../../services/crud'

export default defineApi(async (event) => {
  await requireAdmin(event)
  const row = await toggleRow(useDb(), getDef(getRouterParam(event, 'resource') ?? ''), intParam(event, 'id'), await readJson(event))
  invalidatePublicCache()
  return row
})
