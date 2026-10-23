// Applique les migrations SQL du dossier drizzle/ sur la base Neon : `pnpm db:migrate`
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { migrate } from 'drizzle-orm/neon-http/migrator'

const url = process.env.DATABASE_URL
if (!url) { console.error('✖ DATABASE_URL manquante (voir .env.example).'); process.exit(1) }
const db = drizzle(neon(url))
console.log('→ Application des migrations…')
await migrate(db, { migrationsFolder: './drizzle' })
console.log('✔ Base à jour.')
