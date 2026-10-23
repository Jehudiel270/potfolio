export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) { super(message); this.name = 'ApiError' }
  /** Erreurs par champ renvoyées par la validation serveur (zod flatten). */
  get fieldErrors(): Record<string, string> {
    const d = this.details as { fieldErrors?: Record<string, string[]> } | Record<string, string[]> | undefined
    const fe = (d && 'fieldErrors' in d ? d.fieldErrors : d) as Record<string, string[] | undefined> | undefined
    const out: Record<string, string> = {}
    if (fe && typeof fe === 'object') for (const [k, v] of Object.entries(fe)) if (Array.isArray(v) && v[0]) out[k] = v[0]
    return out
  }
}
export function toApiError(e: unknown): ApiError {
  const err = e as { statusCode?: number, status?: number, data?: { data?: { code?: string, message?: string, details?: unknown }, message?: string, statusMessage?: string }, message?: string }
  const status = err.statusCode ?? err.status ?? 0
  const d = err.data?.data
  if (!status) return new ApiError(0, 'network', 'Connexion impossible. Vérifiez votre réseau.')
  return new ApiError(status, d?.code ?? err.data?.statusMessage ?? 'error', d?.message ?? err.data?.message ?? err.message ?? 'Erreur', d?.details)
}
