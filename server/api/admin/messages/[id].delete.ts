import { deleteMessage } from '../../../services/contact'

export default defineApi(async (event) => {
  await requireAdmin(event)
  await deleteMessage(useDb(), intParam(event, 'id'))
  return { ok: true }
})
