import { readMailConfig } from '../services/mail'

/** Lecture centralisée de la configuration : variables NUXT_* (runtimeConfig) ou variables standard (DATABASE_URL, SMTP_*, CLOUDINARY_*). */
export function env() {
  const c = useRuntimeConfig()
  const p = process.env
  return {
    databaseUrl: c.databaseUrl || p.DATABASE_URL || '',
    sessionPassword: c.sessionPassword || p.NUXT_SESSION_PASSWORD || '',
    cloudinary: {
      cloudName: c.cloudinaryCloudName || p.CLOUDINARY_CLOUD_NAME || '',
      apiKey: c.cloudinaryApiKey || p.CLOUDINARY_API_KEY || '',
      apiSecret: c.cloudinaryApiSecret || p.CLOUDINARY_API_SECRET || '',
    },
    mail: readMailConfig({
      SMTP_HOST: c.smtpHost || p.SMTP_HOST, SMTP_PORT: c.smtpPort || p.SMTP_PORT, SMTP_SECURE: c.smtpSecure || p.SMTP_SECURE,
      SMTP_USER: c.smtpUser || p.SMTP_USER, SMTP_PASSWORD: c.smtpPassword || p.SMTP_PASSWORD, SMTP_FROM: c.smtpFrom || p.SMTP_FROM,
    }),
    contactFallbackTo: c.contactFallbackTo || p.CONTACT_FALLBACK_TO || '',
    siteUrl: c.public.siteUrl || p.NUXT_PUBLIC_SITE_URL || '',
    isProd: process.env.NODE_ENV === 'production',
  }
}
