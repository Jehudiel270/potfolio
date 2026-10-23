export default defineApi(async (event) => {
  const admin = await getAdmin(event)
  if (!admin) throw new AppError(401, 'unauthorized', 'Connexion requise.')
  return { user: admin.user, csrfToken: admin.csrfToken }
})
