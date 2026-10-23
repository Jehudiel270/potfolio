import { z } from 'zod'

export const TEMPLATE_VARS = ['name', 'email', 'message', 'subject'] as const
export type TemplateVars = Partial<Record<typeof TEMPLATE_VARS[number], string>>

/** Remplace uniquement les variables prédéfinies. Aucun code n'est évalué ; le reste du texte est conservé tel quel. */
export function renderTemplate(template: string, vars: TemplateVars): string {
  return template.replace(/\{(name|email|message|subject)\}/g, (_, k: keyof TemplateVars) => vars[k] ?? '')
}
/** Protection contre l'injection d'en-têtes : supprime tout saut de ligne et caractères de contrôle. */
export function sanitizeHeaderValue(v: string, max = 200): string {
  // eslint-disable-next-line no-control-regex
  return v.replace(/[\r\n\u0000-\u001f\u007f\u2028\u2029]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)
}
/** Numéro international → chiffres seuls (format wa.me), ou null s'il est invalide. */
export function normalizeWhatsAppNumber(input: string): string | null {
  const digits = input.replace(/[\s().-]/g, '').replace(/^\+/, '').replace(/^00/, '')
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : null
}
export function buildWhatsAppUrl(number: string, textTemplate: string, vars: TemplateVars): string | null {
  const n = normalizeWhatsAppNumber(number)
  if (!n) return null
  const text = renderTemplate(textTemplate, vars).slice(0, 1200)
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

export interface ContactFieldConfig { key: 'name' | 'email' | 'subject' | 'message', enabled: boolean, required: boolean, label: string, placeholder: string }

/** Schéma de soumission construit à partir des champs configurés dans l'administration. */
export function buildContactSchema(fields: ContactFieldConfig[]) {
  const cfg = (k: ContactFieldConfig['key']) => fields.find(f => f.key === k)
  const text = (k: ContactFieldConfig['key'], min: number, max: number) => {
    const f = cfg(k)
    if (!f || !f.enabled) return z.string().max(0).optional().default('').transform(() => '')
    const base = z.string().trim().max(max, `${f.label} : ${max} caractères maximum`)
    return f.required ? base.min(min, `${f.label} requis`) : base.optional().default('')
  }
  const emailField = cfg('email')
  const email = emailField && emailField.enabled
    ? (emailField.required ? z.string().trim().toLowerCase().email('Adresse e-mail invalide').max(200) : z.union([z.literal(''), z.string().trim().toLowerCase().email('Adresse e-mail invalide').max(200)]).default(''))
    : z.string().max(0).optional().default('')
  return z.object({
    name: text('name', 1, 100), email, subject: text('subject', 1, 150), message: text('message', 5, 4000),
    website: z.string().max(0).optional().default(''), // honeypot : doit rester vide
    startedAt: z.number().optional(),
  })
}
export type ContactSubmission = z.infer<ReturnType<typeof buildContactSchema>>
