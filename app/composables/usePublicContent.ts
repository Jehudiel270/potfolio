import type { PublicContent } from '#shared/types'

export function usePublicContent() {
  const route = useRoute()
  const preview = computed(() => route.query.preview === '1')
  return useFetch<PublicContent>('/api/public/content', {
    key: 'public-content', query: computed(() => (preview.value ? { preview: '1' } : {})), dedupe: 'defer',
  })
}
