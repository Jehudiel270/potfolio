import type { PgDatabase } from 'drizzle-orm/pg-core'
import type * as schema from '../db/schema'

// Type commun à neon-http (production) et pglite (tests) : seul le type de résultat du pilote diffère.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Db = PgDatabase<any, typeof schema>
