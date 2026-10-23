<script setup lang="ts">
import type { FieldDef } from '~/utils/admin-resources'

const props = defineProps<{ field: FieldDef, form: Record<string, unknown>, error?: string, skills?: { id: number, name: string }[], categories?: { id: number, name: string }[], selfId?: number | null }>()
const emit = defineEmits<{ set: [key: string, value: unknown] }>()
const id = useId()
const val = computed(() => props.form[props.field.key])
const set = (v: unknown, key = props.field.key) => emit('set', key, v)
const text = computed(() => (val.value ?? '') as string)
const tagDraft = ref('')
const arr = computed(() => (Array.isArray(val.value) ? val.value as string[] : []))
const linesText = computed(() => arr.value.join('\n'))
function addTag() {
  const t = tagDraft.value.trim().replace(/,$/, '')
  if (t && !arr.value.includes(t)) set([...arr.value, t])
  tagDraft.value = ''
}
function onNumber(e: Event) { const v = (e.target as HTMLInputElement).value; set(v === '' ? null : Number(v)) }
function onImage(v: { url: string, publicId: string } | null) {
  const k = props.field.imageKeys!
  set(v?.url ?? null, k.url); set(v?.publicId ?? null, k.id)
}
const gallery = computed(() => (Array.isArray(val.value) ? val.value as { url: string, publicId: string, alt?: string }[] : []))
function addGallery(v: { url: string, publicId: string } | null) { if (v) set([...gallery.value, v]) }
const toggleIn = (list: unknown, v: string) => { const a = Array.isArray(list) ? [...list as string[]] : []; const i = a.indexOf(v); if (i >= 0) a.splice(i, 1); else a.push(v); return a }
const linked = computed(() => (Array.isArray(val.value) ? val.value as number[] : []))
const toggleLink = (sid: number) => set(linked.value.includes(sid) ? linked.value.filter(x => x !== sid) : [...linked.value, sid])
const hexOk = computed(() => /^#[0-9a-f]{6}$/i.test(text.value))
</script>

<template>
  <div>
    <template v-if="field.type === 'boolean'">
      <label class="flex min-h-10 cursor-pointer items-center gap-2 text-sm font-semibold">
        <input type="checkbox" class="h-4 w-4 accent-sky-400" :checked="!!val" @change="set(($event.target as HTMLInputElement).checked)">
        {{ field.label }}
      </label>
    </template>
    <template v-else>
      <label :for="id" class="ad-label">{{ field.label }}<span v-if="field.required" class="text-red-400"> *</span></label>

      <input v-if="field.type === 'text' || field.type === 'url'" :id="id" class="ad-input" :type="field.type === 'url' ? 'url' : 'text'" :value="text" :placeholder="field.placeholder ?? (field.type === 'url' ? 'https://…' : '')" :aria-invalid="!!error" @input="set(($event.target as HTMLInputElement).value)">
      <textarea v-else-if="field.type === 'textarea'" :id="id" class="ad-input" :rows="field.rows ?? 4" :value="text" :aria-invalid="!!error" @input="set(($event.target as HTMLTextAreaElement).value)" />
      <input v-else-if="field.type === 'date'" :id="id" class="ad-input" type="date" :value="text" :aria-invalid="!!error" @input="set(($event.target as HTMLInputElement).value)">
      <input v-else-if="field.type === 'number'" :id="id" class="ad-input" type="number" min="0" max="100" :value="val ?? ''" :aria-invalid="!!error" @input="onNumber">
      <select v-else-if="field.type === 'select'" :id="id" class="ad-input" :value="text" @change="set(($event.target as HTMLSelectElement).value)">
        <option v-for="o in field.options" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
      <select v-else-if="field.type === 'categorySelect'" :id="id" class="ad-input" :value="val ?? ''" @change="set(($event.target as HTMLSelectElement).value === '' ? null : Number(($event.target as HTMLSelectElement).value))">
        <option value="">Sans catégorie</option>
        <option v-for="c in categories ?? []" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>

      <div v-else-if="field.type === 'color'" class="flex items-center gap-2">
        <input type="color" class="h-10 w-12 cursor-pointer rounded border border-[#223049] bg-transparent p-1" :value="hexOk ? text : '#22d3ee'" :aria-label="`Choisir ${field.label}`" @input="set(($event.target as HTMLInputElement).value)">
        <input :id="id" class="ad-input max-w-36 font-mono" :value="text" placeholder="#22d3ee" maxlength="7" :aria-invalid="!!error || (!!text && !hexOk)" @input="set(($event.target as HTMLInputElement).value)">
        <button v-if="text" type="button" class="ad-btn ad-btn-sm" @click="set('')">Effacer</button>
      </div>

      <div v-else-if="field.type === 'tags'" class="rounded-lg border border-[#223049] bg-[#0a0f1a] p-2">
        <div class="flex flex-wrap gap-1.5">
          <span v-for="t in arr" :key="t" class="ad-badge ad-badge-info flex items-center gap-1">{{ t }}
            <button type="button" class="font-bold" :aria-label="`Retirer ${t}`" @click="set(arr.filter(x => x !== t))">×</button></span>
          <input :id="id" v-model="tagDraft" class="min-w-32 flex-1 bg-transparent px-1 text-sm outline-none" placeholder="Ajouter, puis Entrée" @keydown.enter.prevent="addTag" @keydown.,.prevent="addTag" @blur="addTag">
        </div>
      </div>
      <textarea v-else-if="field.type === 'lines'" :id="id" class="ad-input" rows="4" :value="linesText" @input="set(($event.target as HTMLTextAreaElement).value.split('\n').map(s => s.trim()).filter(Boolean))" />

      <AdminImageUpload v-else-if="field.type === 'image'" :url="(form[field.imageKeys!.url] as string | null) ?? null" :scope="field.scope ?? 'general'" @change="onImage" />

      <div v-else-if="field.type === 'gallery'" class="space-y-2">
        <ul v-if="gallery.length" class="flex flex-wrap gap-2">
          <li v-for="(g, i) in gallery" :key="g.publicId" class="relative">
            <img :src="g.url" alt="" class="h-20 w-28 rounded border border-[#223049] object-cover">
            <button type="button" class="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-red-900 text-xs" :aria-label="`Retirer l’image ${i + 1}`" @click="set(gallery.filter((_, j) => j !== i))">×</button>
          </li>
        </ul>
        <AdminImageUpload :key="gallery.length" :url="null" :scope="field.scope ?? 'general'" label="Ajouter" @change="addGallery" />
      </div>

      <div v-else-if="field.type === 'multiselect'" class="flex flex-wrap gap-3">
        <label v-for="o in field.options" :key="o.value" class="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" class="h-4 w-4 accent-sky-400" :checked="arr.includes(o.value)" @change="set(toggleIn(val, o.value))"> {{ o.label }}
        </label>
      </div>

      <div v-else-if="field.type === 'skillLinks'" class="flex max-h-40 flex-wrap gap-2 overflow-auto rounded-lg border border-[#223049] bg-[#0a0f1a] p-2">
        <p v-if="!(skills ?? []).filter(s => s.id !== selfId).length" class="text-sm text-[#8da0bf]">Créez d’autres compétences pour pouvoir les relier.</p>
        <label v-for="s in (skills ?? []).filter(s => s.id !== selfId)" :key="s.id" class="flex cursor-pointer items-center gap-1.5 text-sm">
          <input type="checkbox" class="accent-sky-400" :checked="linked.includes(s.id)" @change="toggleLink(s.id)"> {{ s.name }}
        </label>
      </div>
      <p v-if="field.hint" class="ad-hint">{{ field.hint }}</p>
      <p v-if="error" class="ad-err" role="alert">{{ error }}</p>
    </template>
  </div>
</template>
