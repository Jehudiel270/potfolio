import { createRequire } from 'node:module'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '../db/schema'
import { AppError } from '../services/errors'
import { hashPassword } from '../services/password'
import type { Db } from '../services/db-type'

/**
 * Mode de développement hors-ligne FACULTATIF (`PF_DEV_DB=pglite`) : une vraie base PostgreSQL embarquée (PGlite) évite d'avoir
 * un compte Neon pour essayer le projet en local. Ne jamais l'activer en production. PGlite n'est qu'une dépendance de développement.
 */
async function makeDevDb(): Promise<Db> {
  // Résolution depuis la racine du projet (mode développement uniquement) : ces paquets ne sont jamais empaquetés dans le build.
  const req = createRequire(join(process.cwd(), 'package.json'))
  const load = (name: string) => import(/* @vite-ignore */ pathToFileURL(req.resolve(name)).href)
  const [{ PGlite }, { drizzle: dz }, { migrate }] = await Promise.all([load('@electric-sql/pglite'), load('drizzle-orm/pglite'), load('drizzle-orm/pglite/migrator')])
  const dir = process.env.PF_DEV_DB_DIR || '.data/pglite'
  const db = dz(new PGlite(dir === 'memory' ? undefined : dir), { schema }) as unknown as Db
  await migrate(db as never, { migrationsFolder: './drizzle' })
  const email = process.env.PF_DEV_ADMIN_EMAIL, password = process.env.PF_DEV_ADMIN_PASSWORD
  if (email && password) {
    const existing = await db.select().from(schema.adminUsers)
    if (!existing.length) await db.insert(schema.adminUsers).values({ email: email.toLowerCase(), passwordHash: await hashPassword(password) })
  }
  console.warn('[db] Mode développement PGlite actif (PF_DEV_DB) : ne pas utiliser en production.')
  return db
}
let devDb: Db | null = null
let devDbPromise: Promise<Db> | null = null
/** Initialise (une seule fois) la base de développement ; appelée par server/middleware/00.dev-db.ts avant tout traitement de requête. */
export async function ensureDevDb(): Promise<void> {
  if (process.env.PF_DEV_DB !== 'pglite' || devDb) return
  devDbPromise ??= makeDevDb()
  devDb = await devDbPromise
}

let cached: { url: string, db: Db } | null = null

/** Connexion Neon (HTTP, sans état : adaptée au serverless). Jamais ouverte depuis le navigateur. */
export function useDb(): Db {
  if (devDb) return devDb
  const url = env().databaseUrl
  if (!url) throw new AppError(503, 'db_not_configured', 'Base de données non configurée (variable DATABASE_URL manquante).')
  if (!cached || cached.url !== url) cached = { url, db: drizzle(neon(url), { schema }) as unknown as Db }
  return cached.db
}
