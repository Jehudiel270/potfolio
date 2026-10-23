import { RESOURCES, getDef, listRows } from '../../../../services/crud'

export default defineApi(async (event) => {
  await requireAdmin(event)
  const def = getDef(getRouterParam(event, 'resource') ?? '')
  const q = getQuery(event)
  const filters = Object.fromEntries(def.filters.map(f => [f, typeof q[f] === 'string' ? (q[f] as string) : undefined]))
  return { items: await listRows(useDb(), def, { q: typeof q.q === 'string' ? q.q : undefined, filters }), resources: Object.keys(RESOURCES).length }
})
