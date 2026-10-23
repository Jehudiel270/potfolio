import { getTableColumns, sql } from 'drizzle-orm'
import * as t from '../../db/schema'
import { RESOURCES, countRows } from '../../services/crud'
import { loadSettings } from '../../services/settings'
import { mailStatus } from '../../services/mail'

export default defineApi(async (event) => {
  await requireAdmin(event)
  const db = useDb()
  const R = RESOURCES
  const [published, drafts, skills, education, experiences, certifications, achievements, settings, unread, stamps] = await Promise.all([
    countRows(db, R.projects!, sql`${t.projects.status} = 'published'`),
    countRows(db, R.projects!, sql`${t.projects.status} = 'draft'`),
    countRows(db, R.skills!), countRows(db, R.education!), countRows(db, R.experiences!), countRows(db, R.certifications!), countRows(db, R.achievements!),
    loadSettings(db),
    db.select({ n: sql<number>`count(*)::int` }).from(t.contactMessages).where(sql`${t.contactMessages.status} = 'new'`),
    Promise.all(Object.values(R).map(async (def) => {
      const updatedAt = getTableColumns(def.table).updatedAt
      const [r] = await db.select({ m: sql<string | null>`max(${updatedAt})` }).from(def.table)
      return r?.m ? new Date(r.m).getTime() : 0
    })),
  ])
  const last = Math.max(settings.updatedAt ? new Date(settings.updatedAt).getTime() : 0, ...stamps)
  return {
    counts: { published, drafts, skills, education, experiences, certifications, achievements, unreadMessages: Number(unread[0]?.n ?? 0) },
    lastModified: last > 0 ? new Date(last).toISOString() : null,
    theme: settings.settings.theme,
    mail: mailStatus(env().mail),
    cloudinary: cloudinaryStatus(),
  }
})
