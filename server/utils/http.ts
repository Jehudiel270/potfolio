import type { H3Event } from 'h3'
import { createHash } from 'node:crypto'
import { AppError } from '../services/errors'

/** Convertit une AppError en réponse HTTP structurée ; toute autre erreur devient un 500 générique (jamais de trace interne). */
export function toHttpError(err: unknown) {
  if (err && typeof err === 'object' && 'statusCode' in err && 'statusMessage' in err && !(err instanceof AppError)) return err
  if (err instanceof AppError) {
    return createError({ statusCode: err.status, statusMessage: err.code, message: err.message, data: { code: err.code, message: err.message, details: err.details } })
  }
  console.error('[api] erreur inattendue', err)
  return createError({ statusCode: 500, statusMessage: 'internal_error', message: 'Une erreur interne est survenue.', data: { code: 'internal_error', message: 'Une erreur interne est survenue.' } })
}

export function defineApi<T>(fn: (event: H3Event) => Promise<T> | T) {
  return defineEventHandler(async (event) => {
    try { return await fn(event) } catch (e) { throw toHttpError(e) }
  })
}

export async function readJson(event: H3Event): Promise<unknown> {
  try { return await readBody(event) } catch { throw new AppError(400, 'bad_json', 'Corps de requête JSON invalide.') }
}
export function intParam(event: H3Event, name: string): number {
  const v = Number(getRouterParam(event, name))
  if (!Number.isInteger(v) || v <= 0) throw new AppError(400, 'bad_request', `Paramètre « ${name} » invalide.`)
  return v
}
/** Empreinte de l'IP (jamais l'adresse brute en base). */
export function ipHashOf(event: H3Event): string | null {
  const ip = getRequestIP(event, { xForwardedFor: true })
  if (!ip) return null
  return createHash('sha256').update(ip + '|' + env().sessionPassword).digest('hex').slice(0, 32)
}
