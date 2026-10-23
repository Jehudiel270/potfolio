export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith('/admin') || import.meta.server) return
  const { user, checked, fetchMe } = useAdminSession()
  const isLogin = to.path === '/admin/login'
  if (!checked.value) await fetchMe()
  if (!user.value && !isLogin) return navigateTo('/admin/login')
  if (user.value && isLogin) return navigateTo('/admin')
})
