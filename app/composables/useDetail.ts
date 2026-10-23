import type { DetailItem } from '#shared/types'

export function useDetail() {
  const item = useState<DetailItem | null>('pf-detail', () => null)
  const opener = useState<string | null>('pf-detail-opener', () => null)
  return {
    item,
    open: (i: DetailItem, openerId?: string) => { item.value = i; opener.value = openerId ?? null },
    close: () => { item.value = null },
    opener,
  }
}
