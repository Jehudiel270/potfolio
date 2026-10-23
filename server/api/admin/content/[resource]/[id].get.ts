import { getDef, getRow } from '../../../../services/crud'

export default defineApi(async (event) => {
  await requireAdmin(event)
  return getRow(useDb(), getDef(getRouterParam(event, 'resource') ?? ''), intParam(event, 'id'))
})
