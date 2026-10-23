// Supprime toutes les données de démonstration (lignes marquées is_demo = true). Le contenu réel n'est pas touché.
import { eq, getTableColumns } from 'drizzle-orm'
import { RESOURCES } from '../server/services/crud'
import { scriptDb } from './_db'

const db = scriptDb()
for (const def of Object.values(RESOURCES)) {
  const c = getTableColumns(def.table).isDemo
  if (!c) continue
  const r = await db.delete(def.table).where(eq(c, true)).returning()
  console.log(`✔ ${def.key} : ${r.length} élément(s) de démonstration supprimé(s)`)
}
