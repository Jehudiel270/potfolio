// En-têtes de sécurité + contrôle d'origine des écritures (défense en profondeur avec le jeton CSRF).
export default defineEventHandler((event) => {
  const prod = process.env.NODE_ENV === 'production'
  const h = (k: string, v: string) => setResponseHeader(event, k, v)
  h('X-Content-Type-Options', 'nosniff')
  h('Referrer-Policy', 'strict-origin-when-cross-origin')
  h('X-Frame-Options', 'SAMEORIGIN')
  h('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')
  h('Cross-Origin-Opener-Policy', 'same-origin')
  if (prod) h('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  h('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'" + (prod ? '' : " 'unsafe-eval'"),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://res.cloudinary.com",
    "media-src 'self' blob: data:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.cloudinary.com" + (prod ? '' : ' ws: wss:'),
    "worker-src 'self' blob:",
    "frame-ancestors 'self'", "base-uri 'self'", "form-action 'self'", "object-src 'none'",
  ].join('; '))

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(event.method) && event.path.startsWith('/api/')) {
    const origin = getHeader(event, 'origin')
    if (origin) {
      const host = getRequestHost(event, { xForwardedHost: true })
      let ok: boolean
      try { ok = new URL(origin).host === host } catch { ok = false }
      if (!ok) throw createError({ statusCode: 403, statusMessage: 'bad_origin', message: 'Origine de la requête refusée.' })
    }
  }
})
