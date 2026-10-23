import { loadSettings } from '../../services/settings'

export default defineApi(async (event) => {
  await requireAdmin(event)
  return loadSettings(useDb())
})
