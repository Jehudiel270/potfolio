import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { and, eq, lt } from 'drizzle-orm'
import { adminSessions, adminUsers } from '../db/schema'
import type { Db } from './db-type'

export const SESSION_COOKIE = 'pf_admin'
export const SESSION_TTL_HOURS = 12

const sign = (value: string, secret: string) => createHmac('sha256', secret).update(value).digest('base64url')
export const sealSessionId = (id: string, secret: string) => `${id}.${sign(id, secret)}`
export function unsealSessionId(cookie: string | undefined, secret: string): string | null {
  if (!cookie) return null
  const i = cookie.lastIndexOf('.')
  if (i < 1) return null
  const id = cookie.slice(0, i), mac = Buffer.from(cookie.slice(i + 1)), exp = Buffer.from(sign(id, secret))
  return mac.length === exp.length && timingSafeEqual(mac, exp) ? id : null
}

export async function createSession(db: Db, userId: string, meta: { ipHash?: string | null, userAgent?: string | null }) {
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 3600_000)
  const csrfToken = randomBytes(24).toString('base64url')
  const [s] = await db.insert(adminSessions).values({ userId, csrfToken, expiresAt, ipHash: meta.ipHash ?? null, userAgent: meta.userAgent?.slice(0, 200) ?? null }).returning()
  await db.update(adminUsers).set({ lastLoginAt: new Date() }).where(eq(adminUsers.id, userId))
  return s!
}

export interface AdminContext { sessionId: string, csrfToken: string, user: { id: string, email: string, role: 'admin' } }

export async function resolveSession(db: Db, sessionId: string): Promise<AdminContext | null> {
  const [row] = await db.select({ s: adminSessions, u: adminUsers }).from(adminSessions)
    .innerJoin(adminUsers, eq(adminUsers.id, adminSessions.userId)).where(eq(adminSessions.id, sessionId)).limit(1)
  if (!row) return null
  if (row.s.expiresAt.getTime() < Date.now()) { await db.delete(adminSessions).where(eq(adminSessions.id, sessionId)); return null }
  return { sessionId: row.s.id, csrfToken: row.s.csrfToken, user: { id: row.u.id, email: row.u.email, role: row.u.role } }
}
export async function destroySession(db: Db, sessionId: string) {
  await db.delete(adminSessions).where(eq(adminSessions.id, sessionId))
}
export async function destroyUserSessions(db: Db, userId: string) {
  await db.delete(adminSessions).where(eq(adminSessions.userId, userId))
}
export async function purgeExpiredSessions(db: Db) {
  await db.delete(adminSessions).where(and(lt(adminSessions.expiresAt, new Date())))
}
export const csrfMatches = (a: string, b: string | undefined) => {
  if (!b) return false
  const x = Buffer.from(a), y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}
