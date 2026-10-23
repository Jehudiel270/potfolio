import { destroySession } from '../../../services/sessions'

export default defineApi(async (event) => {
  const admin = await requireAdmin(event)
  await destroySession(useDb(), admin.sessionId)
  clearSessionCookie(event)
  return { ok: true }
})
