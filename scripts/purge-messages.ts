// Politique de conservation : supprime les messages plus anciens que la durée réglée dans l'administration.
import { loadSettings } from '../server/services/settings'
import { purgeOldMessages } from '../server/services/contact'
import { purgeRateLimits } from '../server/services/ratelimit'
import { purgeExpiredSessions } from '../server/services/sessions'
import { scriptDb } from './_db'

const db = scriptDb()
const { settings } = await loadSettings(db)
const n = await purgeOldMessages(db, settings.contact.retentionDays)
await purgeRateLimits(db)
await purgeExpiredSessions(db)
console.log(`✔ ${n} message(s) supprimé(s) (conservation : ${settings.contact.retentionDays} jours).`)
