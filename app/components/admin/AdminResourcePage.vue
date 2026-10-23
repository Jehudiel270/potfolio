<script setup lang="ts">
import { RESOURCE_UI } from '~/utils/admin-resources'
import type { DetailItem } from '#shared/types'
import { toApiError } from '~/utils/api'

const props = defineProps<{ resource: string }>()
const ui = computed(() => RESOURCE_UI[props.resource]!)
const { api } = useAdminApi()
const toast = useToast()

type Row = Record<string, unknown> & { id: number }
const rows = ref<Row[]>([]), loading = ref(true), loadError = ref('')
const q = ref(''), filters = reactive<Record<string, string>>({})
const editing = ref<Row | null>(null), form = ref<Record<string, unknown>>({}), initial = ref(''), errors = ref<Record<string, string>>({})
const open = ref(false), saving = ref(false), previewOpen = ref(false)
const confirmDelete = ref<Row | null>(null), deleting = ref(false), confirmClose = ref(false)
const skillsOpts = ref<{ id: number, name: string }[]>([]), catOpts = ref<{ id: number, name: string }[]>([])
const dragId = ref<number | null>(null), overId = ref<number | null>(null)

const filtering = computed(() => !!q.value.trim() || Object.values(filters).some(Boolean))
const dirty = computed(() => open.value && JSON.stringify(form.value) !== initial.value)

async function load() {
  loading.value = true; loadError.value = ''
  try {
    const query: Record<string, string> = {}
    if (q.value.trim()) query.q = q.value.trim()
    for (const [k, v] of Object.entries(filters)) if (v) query[k] = v
    rows.value = (await api<{ items: Row[] }>(`/api/admin/content/${props.resource}`, { query })).items
  } catch (e) { loadError.value = toApiError(e).message } finally { loading.value = false }
}
async function loadOptions() {
  if (props.resource === 'skills') skillsOpts.value = (await api<{ items: Row[] }>('/api/admin/content/skills')).items.map(r => ({ id: r.id, name: String(r.name) }))
  if (props.resource === 'achievements') catOpts.value = (await api<{ items: Row[] }>('/api/admin/content/achievement-categories')).items.map(r => ({ id: r.id, name: String(r.name) }))
}
let timer: ReturnType<typeof setTimeout>
watch([q, filters], () => { clearTimeout(timer); timer = setTimeout(load, 250) }, { deep: true })
onMounted(() => { void load(); void loadOptions() })

function openForm(row?: Row) {
  editing.value = row ?? null
  form.value = row ? structuredClone(toRaw(row)) as Record<string, unknown> : ui.value.defaults()
  for (const k of ['startDate', 'endDate', 'issuedAt', 'expiresAt', 'date', 'projectDate']) if (form.value[k] == null && k in form.value) form.value[k] = ''
  initial.value = JSON.stringify(form.value); errors.value = {}; open.value = true
}
function tryClose() { if (dirty.value) confirmClose.value = true; else open.value = false }
function setField(k: string, v: unknown) { form.value = { ...form.value, [k]: v }; if (errors.value[k]) errors.value = Object.fromEntries(Object.entries(errors.value).filter(([key]) => key !== k)) }

function validate(): Record<string, unknown> | null {
  const r = ui.value.schema.safeParse(form.value)
  if (r.success) return r.data as Record<string, unknown>
  const fe = r.error.flatten().fieldErrors as Record<string, string[] | undefined>
  errors.value = Object.fromEntries(Object.entries(fe).filter(([, v]) => v?.[0]).map(([k, v]) => [k, v![0]!]))
  const issues = r.error.issues[0]
  toast.error(`Formulaire incomplet : ${issues?.message ?? 'vérifiez les champs'}`)
  return null
}
async function save() {
  if (!validate()) return
  saving.value = true
  try {
    const body = form.value
    if (editing.value) await api(`/api/admin/content/${props.resource}/${editing.value.id}`, { method: 'PUT', body })
    else await api(`/api/admin/content/${props.resource}`, { method: 'POST', body })
    toast.ok(`${ui.value.singular[0]!.toUpperCase()}${ui.value.singular.slice(1)} enregistré(e).`)
    open.value = false; await load(); await loadOptions()
  } catch (e) {
    const err = toApiError(e)
    errors.value = err.fieldErrors; toast.error(err.message)
  } finally { saving.value = false }
}
async function toggle(row: Row, key: 'visible' | 'featured' | 'status') {
  const value = key === 'status' ? (row.status === 'published' ? 'draft' : 'published') : !row[key]
  try { Object.assign(row, await api<Row>(`/api/admin/content/${props.resource}/${row.id}`, { method: 'PATCH', body: { [key]: value } })) } catch (e) { toast.error(toApiError(e).message) }
}
async function doDelete() {
  if (!confirmDelete.value) return
  deleting.value = true
  try { await api(`/api/admin/content/${props.resource}/${confirmDelete.value.id}`, { method: 'DELETE' }); toast.ok('Supprimé.'); confirmDelete.value = null; await load(); await loadOptions() } catch (e) { toast.error(toApiError(e).message) } finally { deleting.value = false }
}
async function persistOrder(list: Row[]) {
  const before = rows.value; rows.value = list
  try { await api(`/api/admin/content/${props.resource}/reorder`, { method: 'POST', body: { ids: list.map(r => r.id) } }) } catch (e) { rows.value = before; toast.error(toApiError(e).message) }
}
function move(i: number, d: -1 | 1) {
  const j = i + d; if (j < 0 || j >= rows.value.length || filtering.value) return
  const l = [...rows.value]; [l[i], l[j]] = [l[j]!, l[i]!]; void persistOrder(l)
}
function onDrop(target: Row) {
  const from = rows.value.findIndex(r => r.id === dragId.value), to = rows.value.findIndex(r => r.id === target.id)
  dragId.value = overId.value = null
  if (from < 0 || to < 0 || from === to || filtering.value) return
  const l = [...rows.value]; l.splice(to, 0, l.splice(from, 1)[0]!); void persistOrder(l)
}
async function sortDate(direction: 'asc' | 'desc') {
  try { await api(`/api/admin/content/${props.resource}/sort-by-date`, { method: 'POST', body: { direction } }); toast.ok('Ordre chronologique appliqué.'); await load() } catch (e) { toast.error(toApiError(e).message) }
}
const previewItem = computed<DetailItem | null>(() => (ui.value.preview ? ({ type: ui.value.preview, data: { id: 0, isDemo: false, ...form.value } } as unknown as DetailItem) : null))
const visibleFields = computed(() => ui.value.fields.filter(f => !f.showIf || f.showIf(form.value)))
const label = (k: string) => ({ visible: 'Visible', featured: 'Mis en avant', status: 'Publié' } as Record<string, string>)[k]
const isOn = (row: Row, k: string) => (k === 'status' ? row.status === 'published' : !!row[k])
</script>

<template>
  <div>
    <header class="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold">{{ ui.plural }}</h1>
        <p class="text-sm text-[#8da0bf]">{{ rows.length }} élément{{ rows.length > 1 ? 's' : '' }}</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <template v-if="ui.dateSort">
          <button class="ad-btn" type="button" @click="sortDate('desc')">Trier : récent d’abord</button>
          <button class="ad-btn" type="button" @click="sortDate('asc')">Trier : ancien d’abord</button>
        </template>
        <button class="ad-btn ad-btn-primary" type="button" @click="openForm()">Ajouter</button>
      </div>
    </header>

    <div class="mb-4 flex flex-wrap gap-2">
      <input v-model="q" class="ad-input max-w-xs" type="search" placeholder="Rechercher…" aria-label="Rechercher">
      <select v-for="f in ui.filters ?? []" :key="f.key" v-model="filters[f.key]" class="ad-input max-w-44" :aria-label="f.label">
        <option value="">{{ f.label }} : tous</option>
        <option v-for="o in f.options" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
    </div>
    <p v-if="filtering && ui.sortable" class="mb-3 text-xs text-[#8da0bf]">Le réordonnancement est désactivé pendant une recherche ou un filtre.</p>

    <div class="ad-card overflow-x-auto">
      <p v-if="loading" class="p-6 text-sm text-[#8da0bf]">Chargement…</p>
      <p v-else-if="loadError" class="p-6 text-sm text-red-300" role="alert">{{ loadError }} <button class="ad-btn ad-btn-sm ml-2" @click="load">Réessayer</button></p>
      <p v-else-if="!rows.length" class="p-8 text-center text-sm text-[#8da0bf]">{{ filtering ? 'Aucun résultat.' : ui.emptyHint }}</p>
      <table v-else>
        <thead><tr><th class="w-20">Ordre</th><th>Élément</th><th v-for="t in ui.toggles" :key="t" class="w-28">{{ label(t) }}</th><th class="w-40 text-right">Actions</th></tr></thead>
        <tbody>
          <tr v-for="(r, i) in rows" :key="r.id" :draggable="ui.sortable && !filtering" :class="{ 'drop-target': overId === r.id && dragId !== r.id }"
            @dragstart="dragId = r.id" @dragover.prevent="overId = r.id" @drop.prevent="onDrop(r)" @dragend="dragId = overId = null">
            <td>
              <div class="flex gap-1">
                <button class="ad-btn ad-btn-sm" type="button" :disabled="filtering || i === 0" :aria-label="`Monter ${r[ui.titleKey]}`" @click="move(i, -1)">↑</button>
                <button class="ad-btn ad-btn-sm" type="button" :disabled="filtering || i === rows.length - 1" :aria-label="`Descendre ${r[ui.titleKey]}`" @click="move(i, 1)">↓</button>
              </div>
            </td>
            <td>
              <button type="button" class="text-left font-semibold hover:underline" @click="openForm(r)">{{ r[ui.titleKey] }}</button>
              <span v-if="r.isDemo" class="ad-badge ad-badge-warn ml-2">démo</span>
              <p v-if="ui.subtitle" class="text-xs text-[#8da0bf]">{{ ui.subtitle(r) }}</p>
            </td>
            <td v-for="t in ui.toggles" :key="t">
              <button type="button" class="ad-badge" :class="isOn(r, t) ? 'ad-badge-ok' : ''" :aria-pressed="isOn(r, t)" @click="toggle(r, t)">{{ t === 'status' ? (isOn(r, t) ? 'Publié' : 'Brouillon') : isOn(r, t) ? 'Oui' : 'Non' }}</button>
            </td>
            <td class="text-right">
              <button class="ad-btn ad-btn-sm" type="button" @click="openForm(r)">Modifier</button>
              <button class="ad-btn ad-btn-sm ad-btn-danger ml-1" type="button" @click="confirmDelete = r">Supprimer</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Tiroir d'édition -->
    <div v-if="open" class="fixed inset-0 z-50 flex justify-end bg-black/60" @mousedown.self="tryClose" @keydown.esc="tryClose">
      <aside class="flex h-full w-full max-w-2xl flex-col border-l border-[#223049] bg-[#0d1421]" role="dialog" aria-modal="true" :aria-label="editing ? 'Modifier' : 'Ajouter'">
        <div class="flex items-center justify-between border-b border-[#223049] px-5 py-3">
          <h2 class="text-lg font-semibold">{{ editing ? 'Modifier' : 'Ajouter' }} — {{ ui.singular }}</h2>
          <button class="ad-btn ad-btn-sm" type="button" @click="tryClose">Fermer</button>
        </div>
        <form class="grid flex-1 grid-cols-2 content-start gap-x-4 gap-y-4 overflow-y-auto p-5" novalidate @submit.prevent="save">
          <AdminField v-for="f in visibleFields" :key="f.key" :class="f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2'" :field="f" :form="form" :error="errors[f.key]" :skills="skillsOpts" :categories="catOpts" :self-id="editing?.id ?? null" @set="setField" />
        </form>
        <div class="flex items-center justify-between gap-2 border-t border-[#223049] px-5 py-3">
          <button v-if="previewItem" class="ad-btn" type="button" @click="previewOpen = true">Prévisualiser</button><span v-else />
          <div class="flex gap-2">
            <button class="ad-btn" type="button" @click="tryClose">Annuler</button>
            <button class="ad-btn ad-btn-primary" type="button" :disabled="saving || !dirty && !!editing" @click="save">{{ saving ? 'Enregistrement…' : 'Enregistrer' }}</button>
          </div>
        </div>
      </aside>
    </div>

    <div v-if="previewOpen && previewItem" class="fixed inset-0 z-[60] grid place-items-center overflow-auto bg-black/80 p-4" @mousedown.self="previewOpen = false">
      <div class="relative w-full max-w-3xl">
        <button class="ad-btn ad-btn-sm absolute right-2 top-2 z-10" type="button" @click="previewOpen = false">Fermer l’aperçu</button>
        <div class="pf-preview-theme"><DetailBody :item="previewItem" preview /></div>
      </div>
    </div>

    <AdminConfirm :open="!!confirmDelete" title="Supprimer définitivement ?" :message="`« ${confirmDelete?.[ui.titleKey] ?? ''} » sera supprimé(e), ainsi que ses images Cloudinary si elles ne sont pas utilisées ailleurs. Cette action est irréversible.`" confirm-label="Supprimer" danger :busy="deleting" @confirm="doDelete" @cancel="confirmDelete = null" />
    <AdminConfirm :open="confirmClose" title="Abandonner les modifications ?" message="Des modifications n’ont pas été enregistrées." confirm-label="Abandonner" danger @confirm="confirmClose = false; open = false" @cancel="confirmClose = false" />
  </div>
</template>
