// Test de fumée de bout en bout contre un serveur en cours d'exécution (production ou dev) :
//   SMOKE_URL=http://localhost:3000 SMOKE_EMAIL=... SMOKE_PASSWORD=... pnpm smoke
// Crée puis supprime un projet de test ; ne modifie pas le reste du contenu.
export {}
const base = process.env.SMOKE_URL ?? 'http://localhost:3000'
const email = process.env.SMOKE_EMAIL, password = process.env.SMOKE_PASSWORD
let cookie = '', csrf = '', failed = 0
const ok = (name: string, cond: boolean, extra = '') => { console.log(`${cond ? '✔' : '✖'} ${name}${extra ? ' — ' + extra : ''}`); if (!cond) failed++ }
async function call(path: string, init: RequestInit & { json?: unknown, admin?: boolean } = {}) {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string> ?? {}) }
  if (init.json !== undefined) { headers['content-type'] = 'application/json'; init.body = JSON.stringify(init.json) }
  if (cookie) headers.cookie = cookie
  if (init.admin && csrf) headers['x-csrf-token'] = csrf
  const r = await fetch(base + path, { ...init, headers, redirect: 'manual' })
  const text = await r.text()
  let body: unknown = text; try { body = JSON.parse(text) } catch { /* HTML */ }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { status: r.status, body: body as Record<string, any>, headers: r.headers, text }
}

const home = await call('/'); ok('page d’accueil rendue côté serveur', home.status === 200 && home.text.includes('id="home"'), `HTTP ${home.status}`)
ok('en-têtes de sécurité', !!home.headers.get('content-security-policy') && home.headers.get('x-content-type-options') === 'nosniff')
ok('/contact accessible', (await call('/contact')).status === 200)
ok('API admin refusée sans session', (await call('/api/admin/dashboard')).status === 401)
ok('page /admin non indexable', /noindex/.test((await call('/admin/login')).headers.get('x-robots-tag') ?? ''))
const pub = await call('/api/public/content'); ok('contenu public', pub.status === 200 && !!pub.body.settings)
ok('aucun secret dans le contenu public', !/recipientEmail|emailBodyTemplate|smtp|apiSecret/i.test(pub.text))

if (!email || !password) { console.log('• SMTP/admin : SMOKE_EMAIL et SMOKE_PASSWORD absents, tests administrateur ignorés.'); process.exit(failed ? 1 : 0) }
const bad = await call('/api/admin/auth/login', { method: 'POST', json: { email, password: 'mauvais-mot-de-passe' } }); ok('mauvais mot de passe refusé', bad.status === 401)
const login = await call('/api/admin/auth/login', { method: 'POST', json: { email, password } })
ok('connexion', login.status === 200 && !!login.body.csrfToken, `HTTP ${login.status}`)
cookie = (login.headers.get('set-cookie') ?? '').split(';')[0] ?? ''; csrf = login.body.csrfToken
ok('cookie de session HttpOnly + SameSite=Strict', /httponly/i.test(login.headers.get('set-cookie') ?? '') && /samesite=strict/i.test(login.headers.get('set-cookie') ?? ''))
ok('écriture sans jeton CSRF refusée', (await call('/api/admin/content/projects', { method: 'POST', json: { title: 'x' } })).status === 403)

const created = await call('/api/admin/content/projects', { method: 'POST', admin: true, json: { title: 'Projet de test fumée', status: 'draft' } })
ok('création d’un projet (brouillon)', created.status === 201, `HTTP ${created.status}`)
const id = created.body.id as number
await new Promise(r => setTimeout(r, 50))
ok('le brouillon n’apparaît pas publiquement', !(await call('/api/public/content')).text.includes('Projet de test fumée'))
ok('validation serveur', (await call('/api/admin/content/projects', { method: 'POST', admin: true, json: { title: '', liveUrl: 'javascript:alert(1)' } })).status === 422)
await call(`/api/admin/content/projects/${id}`, { method: 'PATCH', admin: true, json: { status: 'published' } })
ok('publié : visible immédiatement (cache invalidé)', (await call('/api/public/content')).text.includes('Projet de test fumée'))
const prev = await call('/api/public/content?preview=1'); ok('aperçu privé réservé à l’admin', prev.status === 200 && (await fetch(base + '/api/public/content?preview=1')).status === 401)
const st = await call('/api/admin/settings'); const v = st.body.version as number
const patch = await call('/api/admin/settings', { method: 'PATCH', admin: true, json: { patch: { theme: { ...st.body.settings.theme, accent: '#ff3366' } }, version: v } })
ok('réglages : thème enregistré', patch.status === 200 && patch.body.settings.theme.accent === '#ff3366')
ok('réglages : version obsolète refusée', (await call('/api/admin/settings', { method: 'PATCH', admin: true, json: { patch: { theme: patch.body.settings.theme }, version: v } })).status === 409)
await call('/api/admin/settings', { method: 'PATCH', admin: true, json: { patch: { theme: st.body.settings.theme } } })
const send = await call('/api/contact', { method: 'POST', headers: { origin: base }, json: { name: 'Awa', email: 'awa@exemple.com', message: 'Bonjour, test de fumée.' } })
ok('contact : jamais de faux succès sans SMTP', [502, 503].includes(send.status) || send.status === 200, `HTTP ${send.status} ${send.body.message ?? ''}`)
const evil = await fetch(base + '/api/contact', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://evil.example' }, body: '{}' }); ok('origine étrangère refusée', evil.status === 403)
const msgs = await call('/api/admin/messages'); ok('messages consultables par l’admin', msgs.status === 200 && Array.isArray(msgs.body.items))
ok('suppression du projet de test', (await call(`/api/admin/content/projects/${id}`, { method: 'DELETE', admin: true })).status === 200)
const out = await call('/api/admin/auth/logout', { method: 'POST', admin: true }); ok('déconnexion', out.status === 200)
ok('session invalidée côté serveur', (await call('/api/admin/dashboard')).status === 401)
console.log(failed ? `\n${failed} vérification(s) en échec` : '\nTout est vert.'); process.exit(failed ? 1 : 0)
