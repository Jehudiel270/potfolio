import { listMessages } from '../../../services/contact'

export default defineApi(async (event) => {
  await requireAdmin(event)
  const status = getQuery(event).status
  return { items: await listMessages(useDb(), typeof status === 'string' ? status : undefined) }
})
