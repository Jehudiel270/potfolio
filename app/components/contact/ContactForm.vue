<script setup lang="ts">
import { MessageCircle, Send } from 'lucide-vue-next'
import { buildContactSchema, buildWhatsAppUrl } from '#shared/contact'
import type { PublicSettings } from '#shared/settings'
import { toApiError } from '~/utils/api'

const props = defineProps<{ settings: PublicSettings, channel?: 'form' | 'widget', compact?: boolean }>()
const c = computed(() => props.settings.contact)
const fields = computed(() => c.value.fields.filter(f => f.enabled))
const values = reactive<Record<string, string>>({ name: '', email: '', subject: '', message: '', website: '' })
const errors = ref<Record<string, string>>({})
const state = ref<'idle' | 'sending' | 'sent' | 'error'>('idle')
const feedback = ref('')
const startedAt = ref(0)
const showWa = computed(() => (c.value.mode === 'both' || c.value.mode === 'whatsapp') && !!buildWhatsAppUrl(c.value.whatsappNumber, c.value.whatsappText, {}))
const id = useId()
onMounted(() => { startedAt.value = Date.now() })

const waUrl = computed(() => buildWhatsAppUrl(c.value.whatsappNumber, c.value.whatsappText, { name: values.name, email: values.email, message: values.message, subject: values.subject }))
const schema = computed(() => buildContactSchema(c.value.fields))

function validate(): boolean {
  const r = schema.value.safeParse({ ...values, startedAt: undefined })
  if (r.success) { errors.value = {}; return true }
  const fe = r.error.flatten().fieldErrors as Record<string, string[] | undefined>
  errors.value = Object.fromEntries(Object.entries(fe).filter(([, v]) => v?.[0]).map(([k, v]) => [k, v![0]!]))
  return false
}
async function submit() {
  feedback.value = ''
  if (!validate()) return
  if (c.value.mode === 'whatsapp') return openWhatsApp()
  state.value = 'sending'
  try {
    await $fetch('/api/contact', { method: 'POST', body: { ...values, channel: props.channel ?? 'form', startedAt: startedAt.value } })
    state.value = 'sent'; feedback.value = c.value.successMessage
    if (c.value.afterSubmit === 'home') setTimeout(() => navigateTo('/'), 1800)
  } catch (e) {
    const err = toApiError(e)
    state.value = 'error'
    errors.value = err.fieldErrors
    feedback.value = err.status === 422 ? 'Veuillez corriger les champs signalés.' : err.message || c.value.errorMessage
  }
}
/** WhatsApp s'ouvre avec le texte prérempli ; c'est le visiteur qui confirme l'envoi dans l'application. */
function openWhatsApp() {
  if (!validate() || !waUrl.value) return
  window.open(waUrl.value, '_blank', 'noopener,noreferrer')
  if (c.value.mode === 'whatsapp') { state.value = 'sent'; feedback.value = 'WhatsApp s’est ouvert : appuyez sur « Envoyer » dans l’application pour transmettre votre message.' }
}
function reset() { Object.assign(values, { name: '', email: '', subject: '', message: '', website: '' }); state.value = 'idle'; feedback.value = ''; startedAt.value = Date.now() }
</script>

<template>
  <div v-if="c.mode !== 'none'">
    <div v-if="state === 'sent'" class="rounded-lg border border-accent/40 bg-accent/10 p-5" role="status">
      <p class="font-semibold">{{ feedback }}</p>
      <div class="mt-4 flex flex-wrap gap-3">
        <button v-if="c.mode === 'both' && showWa" type="button" class="btn btn-primary" @click="openWhatsApp"><MessageCircle :size="18" /> Envoyer aussi sur WhatsApp</button>
        <button type="button" class="btn btn-ghost" @click="reset">Nouveau message</button>
      </div>
      <p v-if="c.mode === 'both' && showWa" class="mt-3 text-sm text-muted">WhatsApp s’ouvrira avec votre message prérempli ; vous devrez confirmer l’envoi vous-même.</p>
    </div>
    <form v-else class="space-y-4" novalidate @submit.prevent="submit">
      <div v-for="f in fields" :key="f.key">
        <label :for="`${id}-${f.key}`" class="mb-1 block text-sm font-semibold">{{ f.label }}<span v-if="f.required" aria-hidden="true"> *</span></label>
        <textarea v-if="f.key === 'message'" :id="`${id}-${f.key}`" v-model="values.message" class="field" :rows="compact ? 4 : 6" maxlength="4000" :placeholder="f.placeholder" :required="f.required" :aria-invalid="!!errors[f.key]" :aria-describedby="errors[f.key] ? `${id}-${f.key}-e` : undefined" />
        <input v-else :id="`${id}-${f.key}`" v-model="values[f.key]" class="field" :type="f.key === 'email' ? 'email' : 'text'" :autocomplete="f.key === 'email' ? 'email' : f.key === 'name' ? 'name' : 'off'" :maxlength="f.key === 'subject' ? 150 : 200" :placeholder="f.placeholder" :required="f.required" :aria-invalid="!!errors[f.key]" :aria-describedby="errors[f.key] ? `${id}-${f.key}-e` : undefined">
        <p v-if="errors[f.key]" :id="`${id}-${f.key}-e`" class="mt-1 text-sm text-[#ff8a8a]" role="alert">{{ errors[f.key] }}</p>
      </div>
      <!-- Piège à robots : invisible pour les humains, doit rester vide. -->
      <div class="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true"><label>Ne pas remplir<input v-model="values.website" type="text" tabindex="-1" autocomplete="off"></label></div>
      <p v-if="state === 'error'" class="rounded-lg border border-[#ff8a8a]/50 bg-[#ff8a8a]/10 p-3 text-sm" role="alert">{{ feedback }}</p>
      <div class="flex flex-wrap items-center gap-3">
        <button type="submit" class="btn btn-primary" :disabled="state === 'sending'">
          <component :is="c.mode === 'whatsapp' ? MessageCircle : Send" :size="18" /> {{ state === 'sending' ? 'Envoi…' : c.mode === 'whatsapp' ? 'Ouvrir WhatsApp' : settings.buttons.send }}
        </button>
        <p v-if="c.mode === 'whatsapp'" class="text-sm text-muted">Vous confirmerez l’envoi dans WhatsApp.</p>
      </div>
    </form>
  </div>
</template>
