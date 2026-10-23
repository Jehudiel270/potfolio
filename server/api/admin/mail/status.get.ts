import { mailStatus } from '../../../services/mail'

export default defineApi(async (event) => {
  await requireAdmin(event)
  return mailStatus(env().mail)
})
