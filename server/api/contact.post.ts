import { loadSettings } from '../services/settings'
import { createMailSender } from '../services/mail'
import { submitContact } from '../services/contact'

export default defineApi(async (event) => {
  const raw = await readJson(event)
  if (getHeader(event, 'content-type')?.includes('application/json') !== true) throw new AppError(415, 'bad_content_type', 'Type de contenu non supporté.')
  const e = env()
  const db = useDb()
  const { settings } = await loadSettings(db)
  const channel = (raw as { channel?: string } | null)?.channel === 'widget' ? 'widget' : 'form'
  const result = await submitContact({
    db, settings, ipHash: ipHashOf(event), channel,
    sender: e.mail ? createMailSender(e.mail) : null, fallbackTo: e.contactFallbackTo,
  }, raw)
  return { ok: true, saved: result.saved, emailed: result.emailed }
})
