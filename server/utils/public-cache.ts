import { getPublicContent } from '../services/content'
import type { PublicContent } from '../../shared/types'

const TTL_MS = 15_000
let entry: { at: number, data: Promise<PublicContent> } | null = null

/** Cache mémoire très court (15 s) : évite de relire Neon à chaque visite ; vidé à chaque sauvegarde du back-office. */
export function cachedPublicContent(): Promise<PublicContent> {
  if (!entry || Date.now() - entry.at > TTL_MS) {
    const data = getPublicContent(useDb())
    entry = { at: Date.now(), data }
    data.catch(() => { entry = null })
  }
  return entry.data
}
export const invalidatePublicCache = () => { entry = null }
