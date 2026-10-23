import type { H3Event } from 'h3'
import { AppError } from '../services/errors'
import { SESSION_COOKIE, csrfMatches, resolveSession, sealSessionId, unsealSessionId, SESSION_TTL_HOURS, type AdminContext } from '../services/sessions'

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export function sessionSecret(): string {
  const s = env().sessionPassword
  if (s.length < 32) throw new AppError(503, 'session_not_configured', 'NUXT_SESSION_PASSWORD doit contenir au moins 32 caractères.')
  return s
}

export async function getAdmin(event: H3Event): Promise<AdminContext | null> {
  const id = unsealSessionId(getCookie(event, SESSION_COOKIE), sessionSecret())
  return id ? resolveSession(useDb(), id) : null
}

/** Garde d'accès : vérifie la session côté serveur et, pour toute écriture, le jeton CSRF (en-tête x-csrf-token). */
export async function requireAdmin(event: H3Event): Promise<AdminContext> {
  const ctx = await getAdmin(event)
  if (!ctx) throw new AppError(401, 'unauthorized', 'Connexion requise.')
  if (MUTATING.has(event.method) && !csrfMatches(ctx.csrfToken, getHeader(event, 'x-csrf-token'))) {
    throw new AppError(403, 'csrf', 'Jeton de sécurité invalide. Rechargez la page.')
  }
  event.context.admin = ctx
  return ctx
}

export function setSessionCookie(event: H3Event, sessionId: string) {
  setCookie(event, SESSION_COOKIE, sealSessionId(sessionId, sessionSecret()), {
    httpOnly: true, secure: env().isProd, sameSite: 'strict', path: '/', maxAge: SESSION_TTL_HOURS * 3600,
  })
}
export const clearSessionCookie = (event: H3Event) => deleteCookie(event, SESSION_COOKIE, { path: '/' })
