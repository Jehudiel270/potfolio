import { getDef, sortByDate } from '../../../../services/crud'

const DATE_FIELD: Record<string, string> = { education: 'startDate', experiences: 'startDate', certifications: 'issuedAt', achievements: 'date', projects: 'projectDate' }

export default defineApi(async (event) => {
  await requireAdmin(event)
  const key = getRouterParam(event, 'resource') ?? ''
  const field = DATE_FIELD[key]
  if (!field) throw new AppError(400, 'bad_request', 'Ce contenu n’a pas de date de tri.')
  const body = (await readJson(event)) as { direction?: string } | null
  await sortByDate(useDb(), getDef(key), field, body?.direction === 'desc' ? 'desc' : 'asc')
  invalidatePublicCache()
  return { ok: true }
})
