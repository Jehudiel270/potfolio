import { loadSettings } from '../../../services/settings'
import { createMailSender } from '../../../services/mail'

export default defineApi(async (event) => {
  const admin = await requireAdmin(event)
  const cfg = env().mail
  if (!cfg) throw new AppError(503, 'mail_not_configured', 'SMTP non configuré : renseignez SMTP_HOST et SMTP_FROM dans les variables d’environnement.')
  const { settings } = await loadSettings(useDb())
  const to = settings.contact.recipientEmail || env().contactFallbackTo || admin.user.email
  try {
    await createMailSender(cfg)({ to, subject: 'Test d’envoi — portfolio', text: 'Ce message confirme que la configuration SMTP du portfolio fonctionne.' })
  } catch (e) {
    console.error('[mail:test]', e)
    throw new AppError(502, 'mail_failed', 'L’envoi de test a échoué. Vérifiez l’hôte, le port, le chiffrement et les identifiants SMTP.')
  }
  return { ok: true, to }
})
