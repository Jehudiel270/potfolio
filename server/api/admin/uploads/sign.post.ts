export default defineApi(async (event) => {
  await requireAdmin(event)
  const body = (await readJson(event)) as { scope?: string } | null
  return signUpload(typeof body?.scope === 'string' ? body.scope : 'general')
})
