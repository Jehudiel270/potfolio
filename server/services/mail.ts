import nodemailer, { type Transporter } from 'nodemailer'
import { sanitizeHeaderValue } from '../../shared/contact'

export interface MailConfig { host: string, port: number, secure: boolean, user: string, password: string, from: string }
export interface OutgoingMail { to: string, subject: string, text: string, replyTo?: string }
export type MailSender = (mail: OutgoingMail) => Promise<void>

/** Retourne null si la configuration SMTP est incomplète (l'envoi est alors explicitement indisponible). */
export function readMailConfig(env: Record<string, string | undefined>): MailConfig | null {
  const host = env.SMTP_HOST?.trim(), from = env.SMTP_FROM?.trim()
  if (!host || !from) return null
  const port = Number(env.SMTP_PORT || 587)
  return { host, port: Number.isFinite(port) ? port : 587, secure: env.SMTP_SECURE === 'true' || port === 465, user: env.SMTP_USER ?? '', password: env.SMTP_PASSWORD ?? '', from }
}
export const mailStatus = (cfg: MailConfig | null) => ({ configured: !!cfg, host: cfg?.host ?? null, port: cfg?.port ?? null, secure: cfg?.secure ?? null, hasAuth: !!cfg?.user, from: cfg?.from ?? null })

let cached: { key: string, tr: Transporter } | null = null
export function createMailSender(cfg: MailConfig): MailSender {
  const key = JSON.stringify([cfg.host, cfg.port, cfg.secure, cfg.user])
  if (!cached || cached.key !== key) {
    cached = {
      key,
      tr: nodemailer.createTransport({
        host: cfg.host, port: cfg.port, secure: cfg.secure,
        auth: cfg.user ? { user: cfg.user, pass: cfg.password } : undefined,
        connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 15_000,
      }),
    }
  }
  const tr = cached.tr
  return async (m) => {
    await tr.sendMail({
      from: cfg.from,
      to: sanitizeHeaderValue(m.to),
      subject: sanitizeHeaderValue(m.subject, 150),
      text: m.text,
      replyTo: m.replyTo ? sanitizeHeaderValue(m.replyTo) : undefined,
    })
  }
}
