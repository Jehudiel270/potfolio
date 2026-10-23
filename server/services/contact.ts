import { and, desc, eq, lt } from 'drizzle-orm'
import { contactMessages } from '../db/schema'
import { buildContactSchema, renderTemplate, sanitizeHeaderValue } from '../../shared/contact'
import type { SiteSettings } from '../../shared/settings'
import { AppError } from './errors'
import { hitRateLimit } from './ratelimit'
import type { Db } from './db-type'
import type { MailSender } from './mail'

export interface SubmitDeps { db: Db, settings: SiteSettings, sender: MailSender | null, fallbackTo?: string, ipHash: string | null, channel?: 'form' | 'widget', now?: () => number }
export type SubmitResult = { ok: true, saved: boolean, emailed: boolean, silent?: boolean }

/**
 * Traitement d'une soumission : validation serveur, anti-spam (honeypot, délai minimal, limitation de fréquence),
 * enregistrement, envoi e-mail. N'annonce jamais un succès si l'e-mail n'est pas parti alors que le canal e-mail est actif.
 */
export async function submitContact(deps: SubmitDeps, raw: unknown): Promise<SubmitResult> {
  const { db, settings, sender, ipHash } = deps
  const c = settings.contact
  if (c.mode !== 'email' && c.mode !== 'both') throw new AppError(404, 'form_disabled', 'Le formulaire de contact est désactivé.')
  const parsed = buildContactSchema(c.fields).safeParse(raw)
  if (!parsed.success) throw new AppError(422, 'validation', 'Veuillez corriger les champs signalés.', parsed.error.flatten().fieldErrors)
  const d = parsed.data
  const now = (deps.now ?? Date.now)()
  // Pièges à robots : réponse neutre, rien n'est enregistré ni envoyé.
  if (d.website || (typeof d.startedAt === 'number' && now - d.startedAt < 1500)) return { ok: true, saved: false, emailed: false, silent: true }

  const key = ipHash ?? 'anon'
  const per = await hitRateLimit(db, `contact:${key}`, 5, 600)
  if (!per.allowed) throw new AppError(429, 'rate_limited', `Trop de messages envoyés. Réessayez dans ${Math.ceil(per.retryAfter / 60)} min.`, { retryAfter: per.retryAfter })
  const global = await hitRateLimit(db, 'contact:global', 200, 3600)
  if (!global.allowed) throw new AppError(429, 'rate_limited', 'Le formulaire est temporairement saturé. Réessayez plus tard.', { retryAfter: global.retryAfter })

  const name = sanitizeHeaderValue(d.name, 100), email = sanitizeHeaderValue(d.email, 200), subjectIn = sanitizeHeaderValue(d.subject, 150)
  let id: number | null = null
  if (c.storeMessages) {
    const [row] = await db.insert(contactMessages).values({ name, email, subject: subjectIn || null, message: d.message, channel: deps.channel ?? 'form', ipHash }).returning({ id: contactMessages.id })
    id = row!.id
  }
  const setDelivery = async (v: 'sent' | 'failed') => { if (id) await db.update(contactMessages).set({ emailDelivery: v }).where(eq(contactMessages.id, id)) }

  const to = c.recipientEmail || deps.fallbackTo || ''
  if (!sender || !to) {
    await setDelivery('failed')
    throw new AppError(503, 'mail_not_configured', id
      ? 'L’envoi par e-mail n’est pas configuré. Votre message a été enregistré et sera lu depuis l’administration.'
      : 'L’envoi par e-mail n’est pas configuré sur ce site. Utilisez un autre moyen de contact.', { saved: !!id })
  }
  const vars = { name, email, message: d.message, subject: subjectIn }
  try {
    await sender({ to, subject: renderTemplate(c.emailSubjectTemplate, vars) || `Message de ${name}`, text: renderTemplate(c.emailBodyTemplate, vars), replyTo: email || undefined })
  } catch {
    await setDelivery('failed')
    throw new AppError(502, 'mail_failed', id ? 'L’e-mail n’a pas pu être envoyé, mais votre message a été enregistré.' : c.errorMessage, { saved: !!id })
  }
  await setDelivery('sent')
  return { ok: true, saved: !!id, emailed: true }
}

export async function listMessages(db: Db, status?: string) {
  const where = status && ['new', 'read', 'handled'].includes(status) ? eq(contactMessages.status, status as 'new' | 'read' | 'handled') : undefined
  return db.select().from(contactMessages).where(where).orderBy(desc(contactMessages.createdAt)).limit(500)
}
export async function setMessageStatus(db: Db, id: number, status: 'new' | 'read' | 'handled') {
  const [row] = await db.update(contactMessages).set({ status, handledAt: status === 'handled' ? new Date() : null }).where(eq(contactMessages.id, id)).returning()
  if (!row) throw new AppError(404, 'not_found', 'Message introuvable')
  return row
}
export async function deleteMessage(db: Db, id: number) {
  const r = await db.delete(contactMessages).where(eq(contactMessages.id, id)).returning({ id: contactMessages.id })
  if (!r.length) throw new AppError(404, 'not_found', 'Message introuvable')
}
/** Politique de conservation : suppression des messages plus anciens que `days` jours. */
export async function purgeOldMessages(db: Db, days: number) {
  const r = await db.delete(contactMessages).where(and(lt(contactMessages.createdAt, new Date(Date.now() - days * 86_400_000)))).returning({ id: contactMessages.id })
  return r.length
}
