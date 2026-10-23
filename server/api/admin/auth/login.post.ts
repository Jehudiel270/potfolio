import { eq } from 'drizzle-orm'
import { adminUsers } from '../../../db/schema'
import { loginInput } from '../../../../shared/schemas'
import { hashPassword, verifyPassword } from '../../../services/password'
import { hitRateLimit, resetRateLimit } from '../../../services/ratelimit'
import { createSession } from '../../../services/sessions'

// Faux hachage pour égaliser le temps de réponse quand l'e-mail n'existe pas (anti-énumération).
const dummy = hashPassword('dummy-password-for-timing')

export default defineApi(async (event) => {
  const parsed = loginInput.safeParse(await readJson(event))
  if (!parsed.success) throw new AppError(400, 'bad_request', 'Identifiants invalides.')
  const db = useDb()
  const ip = ipHashOf(event) ?? 'anon'
  const byIp = await hitRateLimit(db, `login:ip:${ip}`, 20, 900)
  const byEmail = await hitRateLimit(db, `login:email:${parsed.data.email}`, 6, 900)
  if (!byIp.allowed || !byEmail.allowed) {
    throw new AppError(429, 'rate_limited', 'Trop de tentatives. Réessayez dans quelques minutes.', { retryAfter: Math.max(byIp.retryAfter, byEmail.retryAfter) })
  }
  const [user] = await db.select().from(adminUsers).where(eq(adminUsers.email, parsed.data.email)).limit(1)
  const ok = await verifyPassword(parsed.data.password, user?.passwordHash ?? await dummy)
  if (!user || !ok) throw new AppError(401, 'invalid_credentials', 'E-mail ou mot de passe incorrect.')
  await resetRateLimit(db, `login:email:${parsed.data.email}`)
  const session = await createSession(db, user.id, { ipHash: ip, userAgent: getHeader(event, 'user-agent') })
  setSessionCookie(event, session.id)
  return { user: { id: user.id, email: user.email, role: user.role }, csrfToken: session.csrfToken }
})
