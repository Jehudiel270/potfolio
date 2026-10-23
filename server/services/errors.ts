/** Erreur applicative portable (convertie en réponse HTTP par server/utils/http.ts). */
export class AppError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message)
    this.name = 'AppError'
  }
}
export const notFound = (what = 'Ressource') => new AppError(404, 'not_found', `${what} introuvable`)
export const conflict = (msg: string) => new AppError(409, 'conflict', msg)
export const badRequest = (msg: string, details?: unknown) => new AppError(400, 'bad_request', msg, details)
