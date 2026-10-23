import { beforeAll, describe, expect, it, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import { makeDb } from './helpers/db'
import type { Db } from '../server/services/db-type'
import * as t from '../server/db/schema'
import { RESOURCES, createRow, deleteRow, getRow, listRows, reorderRows, toggleRow, updateRow } from '../server/services/crud'
import { loadSettings, saveSettingsSlices } from '../server/services/settings'
import { getPublicContent } from '../server/services/content'
import { hitRateLimit } from '../server/services/ratelimit'
import { createSession, resolveSession, destroySession, sealSessionId, unsealSessionId } from '../server/services/sessions'
import { hashPassword, verifyPassword, passwordProblem } from '../server/services/password'
import { submitContact } from '../server/services/contact'
import { parseSettings } from '../shared/settings'
import { AppError } from '../server/services/errors'

let db: Db
beforeAll(async () => { db = await makeDb() })

describe('CRUD générique', () => {
  const P = RESOURCES.projects!
  it('crée avec slug unique, ordre automatique et refuse une image non reconnue', async () => {
    const a = await createRow(db, P, { title: 'Alpha' })
    const b = await createRow(db, P, { title: 'Alpha' })
    expect(a.slug).toBe('alpha'); expect(b.slug).toBe('alpha-2')
    expect(Number(b.sortOrder)).toBeGreaterThan(Number(a.sortOrder))
    await expect(createRow(db, P, { title: 'X', coverImageUrl: 'https://evil.example/a.png' })).rejects.toMatchObject({ status: 422 })
  })
  it('met à jour, bascule le statut, recherche et filtre', async () => {
    const r = await createRow(db, P, { title: 'Gamma', category: 'web' })
    const u = await updateRow(db, P, r.id as number, { title: 'Gamma 2', category: 'web', status: 'published' })
    expect(u.title).toBe('Gamma 2'); expect(u.status).toBe('published')
    const t2 = await toggleRow(db, P, r.id as number, { featured: true })
    expect(t2.featured).toBe(true)
    expect((await listRows(db, P, { q: 'gamma' })).length).toBe(1)
    expect((await listRows(db, P, { filters: { status: 'published' } })).every(x => x.status === 'published')).toBe(true)
    await expect(toggleRow(db, P, r.id as number, { visible: true })).rejects.toBeInstanceOf(AppError)
  })
  it('réordonne en une requête et supprime', async () => {
    const rows = await listRows(db, P)
    const ids = rows.map(r => r.id as number).reverse()
    await reorderRows(db, P, ids)
    expect((await listRows(db, P)).map(r => r.id)).toEqual(ids)
    await deleteRow(db, P, ids[0]!)
    await expect(getRow(db, P, ids[0]!)).rejects.toMatchObject({ status: 404 })
  })
  it('gère les liens entre compétences sans auto-référence', async () => {
    const S = RESOURCES.skills!
    const a = await createRow(db, S, { name: 'Vue' })
    const b = await createRow(db, S, { name: 'Nuxt', linkedSkillIds: [a.id] })
    expect((await getRow(db, S, b.id as number)).linkedSkillIds).toEqual([a.id])
    const c = await updateRow(db, S, b.id as number, { name: 'Nuxt', linkedSkillIds: [b.id, a.id] })
    expect(c.linkedSkillIds).toEqual([a.id])
  })
  it('libère les images Cloudinary orphelines mais pas celles encore utilisées', async () => {
    const del = vi.fn(async () => undefined)
    const hooks = { isOwnedAsset: () => true, deleteAssets: del }
    const E = RESOURCES.education!
    const img = { imageUrl: 'https://res.cloudinary.com/x/image/upload/v1/pf/a.png', imagePublicId: 'pf/a' }
    const e1 = await createRow(db, E, { title: 'A', startDate: '2020-01-01', ...img }, hooks)
    const e2 = await createRow(db, E, { title: 'B', startDate: '2021-01-01', ...img }, hooks)
    await deleteRow(db, E, e1.id as number, hooks)
    expect(del).not.toHaveBeenCalled()
    await deleteRow(db, E, e2.id as number, hooks)
    expect(del).toHaveBeenCalledWith(['pf/a'])
  })
})

describe('réglages et contenu public', () => {
  it('versionne et refuse l’écrasement concurrent', async () => {
    const s0 = await loadSettings(db)
    const saved = await saveSettingsSlices(db, { theme: { accent: '#ff00aa' } }, s0.version)
    expect(saved.version).toBe(s0.version + 1)
    expect(saved.settings.theme.accent).toBe('#ff00aa')
    await expect(saveSettingsSlices(db, { theme: { accent: '#00ff00' } }, s0.version)).rejects.toMatchObject({ status: 409 })
    await expect(saveSettingsSlices(db, { theme: { accent: 'rouge' } })).rejects.toMatchObject({ status: 422 })
    expect((await db.select().from(t.siteSettings)).length).toBe(1)
  })
  it('n’expose jamais les brouillons ni les éléments masqués hors aperçu', async () => {
    const P = RESOURCES.projects!
    await createRow(db, P, { title: 'Secret brouillon', status: 'draft' })
    await createRow(db, P, { title: 'Public', status: 'published' })
    const pub = await getPublicContent(db)
    expect(pub.projects.map(p => p.title)).toContain('Public')
    expect(pub.projects.map(p => p.title)).not.toContain('Secret brouillon')
    const prev = await getPublicContent(db, { preview: true })
    expect(prev.projects.map(p => p.title)).toContain('Secret brouillon')
  })
  it('ne charge pas une section désactivée', async () => {
    await createRow(db, RESOURCES.certifications!, { name: 'Cert' })
    await saveSettingsSlices(db, { sections: { certifications: { enabled: false } } })
    expect((await getPublicContent(db)).certifications).toHaveLength(0)
  })
})

describe('sécurité', () => {
  it('hache et vérifie les mots de passe', async () => {
    const h = await hashPassword('Correct-Horse-9')
    expect(await verifyPassword('Correct-Horse-9', h)).toBe(true)
    expect(await verifyPassword('autre', h)).toBe(false)
    expect(passwordProblem('court')).not.toBeNull()
    expect(passwordProblem('Abcdef1234')).not.toBeNull()
    expect(passwordProblem('Abcdefg1234')).toBeNull()
    expect(passwordProblem('Assez-Long-1234')).toBeNull()
  })
  it('crée, résout et invalide une session ; le cookie signé est infalsifiable', async () => {
    const [u] = await db.insert(t.adminUsers).values({ email: 'a@b.co', passwordHash: 'x' }).returning()
    const s = await createSession(db, u!.id, {})
    expect((await resolveSession(db, s.id))?.user.email).toBe('a@b.co')
    const sealed = sealSessionId(s.id, 'secret-secret-secret-secret-secret!')
    expect(unsealSessionId(sealed, 'secret-secret-secret-secret-secret!')).toBe(s.id)
    expect(unsealSessionId(sealed + 'x', 'secret-secret-secret-secret-secret!')).toBeNull()
    expect(unsealSessionId(sealed, 'autre-secret-autre-secret-autre-sec')).toBeNull()
    await destroySession(db, s.id)
    expect(await resolveSession(db, s.id)).toBeNull()
    const exp = await db.insert(t.adminSessions).values({ userId: u!.id, csrfToken: 'c', expiresAt: new Date(Date.now() - 1000) }).returning()
    expect(await resolveSession(db, exp[0]!.id)).toBeNull()
  })
  it('limite la fréquence par fenêtre', async () => {
    const r = [] as boolean[]
    for (let i = 0; i < 4; i++) r.push((await hitRateLimit(db, 'k1', 3, 60)).allowed)
    expect(r).toEqual([true, true, true, false])
    expect((await hitRateLimit(db, 'k2', 3, 60)).allowed).toBe(true)
  })
})

describe('formulaire de contact', () => {
  const base = parseSettings({ contact: { mode: 'email', recipientEmail: 'moi@exemple.com' } })
  const body = { name: 'Awa', email: 'awa@exemple.com', message: 'Bonjour, un projet ?' }
  it('envoie, enregistre et marque la livraison', async () => {
    const send = vi.fn(async () => undefined)
    const r = await submitContact({ db, settings: base, sender: send, ipHash: 'ip1' }, body)
    expect(r).toMatchObject({ ok: true, saved: true, emailed: true })
    expect(send).toHaveBeenCalledOnce()
    const [m] = await db.select().from(t.contactMessages).where(eq(t.contactMessages.email, 'awa@exemple.com'))
    expect(m!.emailDelivery).toBe('sent')
  })
  it('ne renvoie jamais un faux succès quand l’e-mail n’est pas configuré ou échoue', async () => {
    await expect(submitContact({ db, settings: base, sender: null, ipHash: 'ip2' }, body)).rejects.toMatchObject({ status: 503, details: { saved: true } })
    const fail = vi.fn(async () => { throw new Error('SMTP down') })
    await expect(submitContact({ db, settings: base, sender: fail, ipHash: 'ip3' }, body)).rejects.toMatchObject({ status: 502 })
  })
  it('ignore silencieusement les robots (honeypot, envoi trop rapide)', async () => {
    const send = vi.fn(async () => undefined)
    const r1 = await submitContact({ db, settings: base, sender: send, ipHash: 'ip4' }, { ...body, website: 'http://spam' }).catch(e => e)
    expect(r1).toBeInstanceOf(AppError) // le honeypot est rejeté par la validation (champ doit rester vide)
    const r2 = await submitContact({ db, settings: base, sender: send, ipHash: 'ip5' }, { ...body, startedAt: Date.now() })
    expect(r2).toMatchObject({ silent: true })
    expect(send).not.toHaveBeenCalled()
  })
  it('applique la limitation de fréquence et respecte le mode du formulaire', async () => {
    const send = vi.fn(async () => undefined)
    let last: unknown
    for (let i = 0; i < 6; i++) last = await submitContact({ db, settings: base, sender: send, ipHash: 'flood' }, body).catch(e => e)
    expect(last).toMatchObject({ status: 429 })
    const wa = parseSettings({ contact: { mode: 'whatsapp' } })
    await expect(submitContact({ db, settings: wa, sender: send, ipHash: 'ip6' }, body)).rejects.toMatchObject({ status: 404 })
  })
  it('refuse l’injection d’en-têtes dans les valeurs envoyées', async () => {
    const send = vi.fn(async () => undefined)
    await submitContact({ db, settings: base, sender: send, ipHash: 'ip7' }, { ...body, name: 'Awa\r\nBcc: x@y.z' })
    const call = (send.mock.calls[0] as unknown as [{ subject: string }])[0]
    expect(call.subject).not.toMatch(/[\r\n]/)
  })
})
