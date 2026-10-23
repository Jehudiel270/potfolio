export default defineApi(async (event) => {
  const wantsPreview = getQuery(event).preview === '1'
  if (wantsPreview) {
    // Aperçu privé : brouillons, éléments masqués et sections désactivées inclus, jamais mis en cache.
    await requireAdmin(event)
    setResponseHeader(event, 'Cache-Control', 'private, no-store')
    return getPublicContent(useDb(), { preview: true })
  }
  setResponseHeader(event, 'Cache-Control', 'public, max-age=0, s-maxage=15, stale-while-revalidate=60')
  return cachedPublicContent()
})
