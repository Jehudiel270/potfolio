import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '../server/db/schema'
import type { Db } from '../server/services/db-type'

export function scriptDb(): Db {
  const url = process.env.DATABASE_URL
  if (!url) { console.error('✖ DATABASE_URL manquante (voir .env.example).'); process.exit(1) }
  return drizzle(neon(url), { schema }) as unknown as Db
}
