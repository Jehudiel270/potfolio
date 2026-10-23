import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import * as schema from '../../server/db/schema'
import type { Db } from '../../server/services/db-type'

/** Base PostgreSQL réelle (WASM) en mémoire : applique les vraies migrations SQL du dossier drizzle/. */
export async function makeDb(): Promise<Db> {
  const client = new PGlite()
  const db = drizzle(client, { schema })
  await migrate(db, { migrationsFolder: './drizzle' })
  return db as unknown as Db
}
