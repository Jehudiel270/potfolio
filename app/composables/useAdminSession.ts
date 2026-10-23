import { toApiError } from '~/utils/api'

interface AdminUser { id: string, email: string, role: 'admin' }

export function useAdminSession() {
  const user = useState<AdminUser | null>('admin-user', () => null)
  const csrf = useState<string>('admin-csrf', () => '')
  const checked = useState<boolean>('admin-checked', () => false)

  async function fetchMe(): Promise<boolean> {
    try {
      const r = await $fetch<{ user: AdminUser, csrfToken: string }>('/api/admin/auth/me')
      user.value = r.user; csrf.value = r.csrfToken
    } catch { user.value = null; csrf.value = '' }
    checked.value = true
    return !!user.value
  }
  async function login(email: string, password: string) {
    try {
      const r = await $fetch<{ user: AdminUser, csrfToken: string }>('/api/admin/auth/login', { method: 'POST', body: { email, password } })
      user.value = r.user; csrf.value = r.csrfToken; checked.value = true
    } catch (e) { throw toApiError(e) }
  }
  async function logout() {
    try { await $fetch('/api/admin/auth/logout', { method: 'POST', headers: { 'x-csrf-token': csrf.value } }) } catch { /* session déjà expirée */ }
    user.value = null; csrf.value = ''
    await navigateTo('/admin/login')
  }
  return { user, csrf, checked, fetchMe, login, logout }
}

/** Client HTTP de l'administration : ajoute le jeton CSRF, normalise les erreurs, renvoie vers la connexion si la session expire. */
export function useAdminApi() {
  const { csrf, user } = useAdminSession()
  async function api<T>(url: string, opts: { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', body?: unknown, query?: Record<string, unknown> } = {}): Promise<T> {
    try {
      const f = $fetch as unknown as (u: string, o: Record<string, unknown>) => Promise<unknown>
      return await f(url, { method: opts.method ?? 'GET', body: opts.body as Record<string, unknown> | undefined, query: opts.query, headers: { 'x-csrf-token': csrf.value } }) as T
    } catch (e) {
      const err = toApiError(e)
      if (err.status === 401) { user.value = null; await navigateTo('/admin/login') }
      throw err
    }
  }
  return { api }
}
