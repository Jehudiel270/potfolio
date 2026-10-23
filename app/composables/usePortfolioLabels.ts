import type { PublicContent } from '#shared/types'

/** Accès léger au contenu public déjà chargé (sans nouvel appel réseau). */
export function usePortfolioLabels() {
  const content = useState<PublicContent | null>('pf-content-ref', () => null)
  return { content }
}
