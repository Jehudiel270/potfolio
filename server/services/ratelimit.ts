import { lt, sql } from 'drizzle-orm'
import { rateLimits } from '../db/schema'
import type { Db } from './db-type'

export interface RateResult { allowed: boolean, count: number, retryAfter: number }

/** Fenêtre fixe, atomique (un seul INSERT … ON CONFLICT), partagée entre toutes les instances. */
export async function hitRateLimit(db: Db, key: string, limit: number, windowSec: number): Promise<RateResult> {
  const expired = sql`${rateLimits.windowStart} < now() - (${windowSec} * interval '1 second')`
  const [row] = await db.insert(rateLimits).values({ key, count: 1 }).onConflictDoUpdate({
    target: rateLimits.key,
    set: {
      count: sql`case when ${expired} then 1 else ${rateLimits.count} + 1 end`,
      windowStart: sql`case when ${expired} then now() else ${rateLimits.windowStart} end`,
    },
  }).returning()
  const count = row?.count ?? 1
  const started = row ? new Date(row.windowStart).getTime() : Date.now()
  const retryAfter = Math.max(1, Math.ceil((started + windowSec * 1000 - Date.now()) / 1000))
  return { allowed: count <= limit, count, retryAfter }
}
export async function resetRateLimit(db: Db, key: string) {
  await db.delete(rateLimits).where(sql`${rateLimits.key} = ${key}`)
}
export async function purgeRateLimits(db: Db, olderThanHours = 24) {
  await db.delete(rateLimits).where(lt(rateLimits.windowStart, new Date(Date.now() - olderThanHours * 3600_000)))
}
