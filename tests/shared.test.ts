import { describe, expect, it } from 'vitest'
import { buildContactSchema, buildWhatsAppUrl, normalizeWhatsAppNumber, renderTemplate, sanitizeHeaderValue } from '../shared/contact'
import { parseSettings, toPublicSettings, DEFAULT_CONTACT_FIELDS } from '../shared/settings'
import { buildPlan } from '../shared/sections'
import { cldUrl } from '../shared/media'
import { contrastRatio, hexToLinearRgb, slugify } from '../shared/utils'
import { themeSchema, themeToCssVars } from '../shared/theme'
import { educationInput, projectInput, skillInput } from '../shared/schemas'

describe('contact', () => {
  it('rend uniquement les variables prédéfinies', () => {
    expect(renderTemplate('Salut {name} {evil} {{message}}', { name: 'A', message: 'B' })).toBe('Salut A {evil} {B}')
  })
  it('neutralise l’injection d’en-têtes', () => {
    expect(sanitizeHeaderValue('Hello\r\nBcc: spam@x.com')).toBe('Hello Bcc: spam@x.com')
  })
  it('normalise les numéros WhatsApp et construit un lien wa.me', () => {
    expect(normalizeWhatsAppNumber('+229 01 23 45 67 89')).toBe('2290123456789')
    expect(normalizeWhatsAppNumber('abc')).toBeNull()
    const url = buildWhatsAppUrl('+33 6 12 34 56 78', 'Bonjour {name}', { name: 'Zoé & co' })!
    expect(url).toBe('https://wa.me/33612345678?text=Bonjour%20Zo%C3%A9%20%26%20co')
  })
  it('valide selon les champs configurés', () => {
    const s = buildContactSchema(DEFAULT_CONTACT_FIELDS)
    expect(s.safeParse({ name: 'A', email: 'a@b.co', message: 'Bonjour !' }).success).toBe(true)
    expect(s.safeParse({ name: 'A', email: 'pas-un-mail', message: 'Bonjour !' }).success).toBe(false)
    expect(s.safeParse({ name: 'A', email: 'a@b.co', message: 'Bonjour !', website: 'bot' }).success).toBe(false)
  })
})

describe('réglages et plan', () => {
  it('applique les valeurs par défaut et complète le menu', () => {
    const s = parseSettings({ navigation: { items: [{ id: 'projects', label: 'Work', visible: true, order: 0 }] } })
    expect(s.navigation.items.map(i => i.id)).toContain('contact')
    expect(s.navigation.items[0]!.label).toBe('Work')
  })
  it('ne publie ni destinataire ni modèle d’e-mail', () => {
    const p = toPublicSettings(parseSettings({ contact: { recipientEmail: 'moi@x.com', emailBodyTemplate: 'secret' } }))
    expect(JSON.stringify(p)).not.toContain('moi@x.com')
    expect(JSON.stringify(p)).not.toContain('secret')
  })
  it('retire les sections masquées ou vides du plan et du menu', () => {
    const settings = toPublicSettings(parseSettings({ sections: { projects: { enabled: false } } }))
    const empty = { skills: [], education: [], experiences: [], certifications: [], achievements: [], projects: [] }
    const plan = buildPlan(settings, empty)
    expect(plan.sections.map(s => s.id)).toEqual(['home', 'portal', 'about', 'contact'])
    expect(plan.nav.map(n => n.id)).toEqual(['home', 'about', 'contact'])
  })
  it('masque la section Compétences si aucune vue n’est activée', () => {
    const settings = toPublicSettings(parseSettings({ skillViews: { enabled: { station: false, hex: false, tree: false } } }))
    const plan = buildPlan(settings, { skills: [{ id: 1 }] as never, education: [], experiences: [], certifications: [], achievements: [], projects: [] }, {})
    expect(plan.sections.find(s => s.id === 'skills')).toBeUndefined()
  })
})

describe('thème, médias, utilitaires', () => {
  it('normalise les couleurs pour les shaders (linéaire)', () => {
    const [r, g, b] = hexToLinearRgb('#ffffff')
    expect([r, g, b]).toEqual([1, 1, 1])
    expect(hexToLinearRgb('#808080')[0]).toBeCloseTo(0.2159, 3)
  })
  it('rejette une couleur invalide et produit des variables CSS', () => {
    expect(themeSchema.safeParse({ accent: 'cyan' }).success).toBe(false)
    expect(themeToCssVars(themeSchema.parse({}))['--pf-accent']).toBe('#22d3ee')
    expect(contrastRatio('#e8f0ff', '#05060f')).toBeGreaterThan(12)
  })
  it('ajoute des transformations Cloudinary uniquement aux URL Cloudinary', () => {
    expect(cldUrl('https://res.cloudinary.com/demo/image/upload/v1/a.jpg', { w: 400 })).toContain('/upload/f_auto,q_auto,w_400,c_limit,dpr_auto/')
    expect(cldUrl('https://example.com/a.jpg', { w: 400 })).toBe('https://example.com/a.jpg')
  })
  it('génère des slugs propres', () => expect(slugify('Été à Cotonou !')).toBe('ete-a-cotonou'))
  it('valide les dates et refuse les URL dangereuses', () => {
    expect(educationInput.safeParse({ title: 'x', startDate: '2022-09-01', endDate: '2021-01-01' }).success).toBe(false)
    expect(educationInput.parse({ title: 'x', startDate: '2022-09-01', endDate: '2023-01-01', isCurrent: true }).endDate).toBeNull()
    expect(projectInput.safeParse({ title: 'p', liveUrl: 'javascript:alert(1)' }).success).toBe(false)
    expect(projectInput.parse({ title: 'Mon Projet' }).slug).toBe('mon-projet')
  })
  it('génère le slug d’une compétence quand le champ facultatif est vide', () => {
    expect(skillInput.parse({ name: 'Vue 3', slug: '' }).slug).toBe('vue-3')
    expect(skillInput.parse({ name: 'Nuxt 4' }).slug).toBe('nuxt-4')
    expect(skillInput.safeParse({ name: 'Vue', slug: 'Vue 3' }).success).toBe(false)
  })
})
