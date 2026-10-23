import { parseSettings, type SiteSettings } from '#shared/settings'
import { toApiError } from '~/utils/api'

/** Édition d'une ou plusieurs tranches de réglages : brouillon local, détection des changements, enregistrement versionné, annulation. */
export function useSettingsEditor<K extends keyof SiteSettings>(slices: K[]) {
  const pick = (s: SiteSettings) => Object.fromEntries(slices.map(k => [k, structuredClone(toRaw(s[k]))])) as Pick<SiteSettings, K>
  const { api } = useAdminApi()
  const toast = useToast()
  const loaded = ref(false), saving = ref(false), error = ref('')
  const version = ref(0)
  const draft = ref(pick(parseSettings({})))
  const saved = ref<SiteSettings | null>(null)
  let snapshot = ''

  async function load() {
    try {
      const r = await api<{ settings: SiteSettings, version: number }>('/api/admin/settings')
      version.value = r.version; saved.value = r.settings; draft.value = pick(r.settings); snapshot = JSON.stringify(draft.value); loaded.value = true
    } catch (e) { error.value = toApiError(e).message }
  }
  const dirty = computed(() => loaded.value && JSON.stringify(draft.value) !== snapshot)
  async function save(): Promise<boolean> {
    saving.value = true
    try {
      const r = await api<{ settings: SiteSettings, version: number }>('/api/admin/settings', { method: 'PATCH', body: { patch: draft.value, version: version.value } })
      version.value = r.version; saved.value = r.settings; draft.value = pick(r.settings); snapshot = JSON.stringify(draft.value)
      toast.ok('Réglages enregistrés. Le site public est à jour.')
      return true
    } catch (e) {
      const err = toApiError(e)
      toast.error(err.status === 422 ? 'Certaines valeurs sont invalides : vérifiez les champs (couleurs, URL, numéro…).' : err.message)
      return false
    } finally { saving.value = false }
  }
  function cancel() { draft.value = JSON.parse(snapshot) as Pick<SiteSettings, K> }
  function replace(v: Pick<SiteSettings, K>) { draft.value = v }
  onMounted(load)
  if (import.meta.client) {
    onBeforeRouteLeave(() => !dirty.value || window.confirm('Des modifications ne sont pas enregistrées. Quitter quand même ?'))
    const warn = (e: BeforeUnloadEvent) => { if (dirty.value) e.preventDefault() }
    onMounted(() => window.addEventListener('beforeunload', warn)); onBeforeUnmount(() => window.removeEventListener('beforeunload', warn))
  }
  return { draft, saved, loaded, saving, dirty, error, version, load, save, cancel, replace }
}
