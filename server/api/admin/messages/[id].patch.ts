import { messagePatchInput } from '../../../../shared/schemas'
import { setMessageStatus } from '../../../services/contact'

export default defineApi(async (event) => {
  await requireAdmin(event)
  const parsed = messagePatchInput.safeParse(await readJson(event))
  if (!parsed.success) throw new AppError(422, 'validation', 'Statut invalide.')
  return setMessageStatus(useDb(), intParam(event, 'id'), parsed.data.status)
})
