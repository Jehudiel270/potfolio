<script setup lang="ts">
import { cldUrl } from '#shared/media'
import { toApiError } from '~/utils/api'

const props = defineProps<{ url: string | null, scope: string, label?: string }>()
const emit = defineEmits<{ change: [value: { url: string, publicId: string } | null] }>()
const { api } = useAdminApi()
const toast = useToast()
const busy = ref(false), progress = ref(0), local = ref<string | null>(null)
const fresh = new Set<string>() // images téléversées pendant cette session d'édition et pas encore enregistrées
const MAX = 8 * 1024 * 1024
const shown = computed(() => local.value ?? cldUrl(props.url, { w: 480 }))

async function discard(publicId: string) { try { await api('/api/admin/uploads/discard', { method: 'POST', body: { publicId } }) } catch { /* nettoyage best effort */ } }

async function onFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  ;(e.target as HTMLInputElement).value = ''
  if (!file) return
  if (!/^image\/(jpeg|png|webp|avif|gif|svg\+xml)$/.test(file.type)) return toast.error('Format non supporté (JPG, PNG, WebP, AVIF, GIF ou SVG).')
  if (file.size > MAX) return toast.error('Image trop lourde (8 Mo maximum).')
  busy.value = true; progress.value = 0
  local.value = URL.createObjectURL(file)
  try {
    const sig = await api<{ cloudName: string, apiKey: string, timestamp: number, folder: string, allowedFormats: string, signature: string }>('/api/admin/uploads/sign', { method: 'POST', body: { scope: props.scope } })
    const fd = new FormData()
    fd.append('file', file); fd.append('api_key', sig.apiKey); fd.append('timestamp', String(sig.timestamp))
    fd.append('signature', sig.signature); fd.append('folder', sig.folder); fd.append('allowed_formats', sig.allowedFormats)
    const res = await new Promise<{ secure_url: string, public_id: string }>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`)
      xhr.upload.onprogress = ev => { if (ev.lengthComputable) progress.value = Math.round((ev.loaded / ev.total) * 100) }
      xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve(JSON.parse(xhr.responseText)) : reject(new Error(JSON.parse(xhr.responseText || '{}')?.error?.message ?? 'Échec du téléversement')))
      xhr.onerror = () => reject(new Error('Connexion à Cloudinary impossible'))
      xhr.send(fd)
    })
    if (props.url) { /* l'ancienne image enregistrée sera libérée par le serveur à la sauvegarde */ }
    fresh.add(res.public_id)
    emit('change', { url: res.secure_url, publicId: res.public_id })
    local.value = null
    toast.ok('Image téléversée. Enregistrez pour la publier.')
  } catch (err) {
    local.value = null
    toast.error(err instanceof Error && !(err as { status?: number }).status ? err.message : toApiError(err).message)
  } finally { busy.value = false }
}
function remove() { emit('change', null) }
onBeforeUnmount(() => { /* les téléversements non enregistrés sont nettoyés via « discard » par la page parente si besoin */ })
defineExpose({ fresh, discard })
</script>

<template>
  <div class="flex items-start gap-3">
    <div class="grid h-24 w-36 shrink-0 place-items-center overflow-hidden rounded-lg border border-[#223049] bg-[#0a0f1a]">
      <img v-if="shown" :src="shown" alt="Aperçu de l’image" class="h-full w-full object-cover">
      <span v-else class="px-2 text-center text-xs text-[#8da0bf]">Aucune image</span>
    </div>
    <div class="space-y-2">
      <label class="ad-btn ad-btn-sm cursor-pointer" :class="{ 'opacity-60': busy }">
        {{ url ? 'Remplacer' : 'Choisir une image' }}
        <input type="file" class="sr-only" accept="image/jpeg,image/png,image/webp,image/avif,image/gif,image/svg+xml" :disabled="busy" @change="onFile">
      </label>
      <button v-if="url" type="button" class="ad-btn ad-btn-sm ad-btn-danger" :disabled="busy" @click="remove">Retirer</button>
      <p v-if="busy" class="text-xs text-[#8da0bf]">Envoi… {{ progress }} %</p>
      <p class="ad-hint">JPG, PNG, WebP, AVIF, GIF ou SVG · 8 Mo max.</p>
    </div>
  </div>
</template>
