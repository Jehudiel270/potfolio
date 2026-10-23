// Crée (ou met à jour le mot de passe de) l'administrateur. Identifiants lus dans l'environnement uniquement :
//   ADMIN_EMAIL=moi@exemple.com ADMIN_PASSWORD='…' pnpm admin:create
import { eq } from 'drizzle-orm'
import { adminUsers } from '../server/db/schema'
import { hashPassword, passwordProblem } from '../server/services/password'
import { destroyUserSessions } from '../server/services/sessions'
import { scriptDb } from './_db'

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
const password = process.env.ADMIN_PASSWORD
if (!email || !password) { console.error('✖ ADMIN_EMAIL et ADMIN_PASSWORD sont requis.'); process.exit(1) }
const problem = passwordProblem(password)
if (problem) { console.error('✖ ' + problem); process.exit(1) }

const db = scriptDb()
const passwordHash = await hashPassword(password)
const [existing] = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1)
if (existing) {
  await db.update(adminUsers).set({ passwordHash }).where(eq(adminUsers.id, existing.id))
  await destroyUserSessions(db, existing.id)
  console.log(`✔ Mot de passe mis à jour pour ${email} (sessions précédentes révoquées).`)
} else {
  await db.insert(adminUsers).values({ email, passwordHash })
  console.log(`✔ Administrateur créé : ${email}`)
}
console.log('  Pensez à retirer ADMIN_PASSWORD de votre environnement.')
