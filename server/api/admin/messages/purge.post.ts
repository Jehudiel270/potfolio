import { loadSettings } from '../../../services/settings'
import { purgeOldMessages } from '../../../services/contact'

export default defineApi(async (event) => {
  await requireAdmin(event)
  const db = useDb()
  const { settings } = await loadSettings(db)
  return { deleted: await purgeOldMessages(db, settings.contact.retentionDays), retentionDays: settings.contact.retentionDays }
})
