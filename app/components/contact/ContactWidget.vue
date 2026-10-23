<script setup lang="ts">
import { Mail, MessageCircle, MessageSquare, X } from 'lucide-vue-next'
import { buildWhatsAppUrl } from '#shared/contact'
import type { PublicSettings } from '#shared/settings'

const props = defineProps<{ settings: PublicSettings }>()
const w = computed(() => props.settings.widget)
const open = ref(false), mode = ref<'menu' | 'form'>('menu')
const sound = useSound()
const wa = computed(() => (w.value.channels.whatsapp ? buildWhatsAppUrl(props.settings.contact.whatsappNumber, props.settings.contact.whatsappText.replace(/\{[a-z]+\}/g, '').trim() || 'Bonjour', {}) : null))
const email = computed(() => (w.value.channels.email && props.settings.identity.email ? `mailto:${props.settings.identity.email}` : null))
const formOk = computed(() => w.value.channels.form && (props.settings.contact.mode === 'email' || props.settings.contact.mode === 'both'))
const hasAny = computed(() => formOk.value || !!wa.value || !!email.value)
function toggle() { open.value = !open.value; mode.value = 'menu'; sound.play(open.value ? 'open' : 'close', 0.25) }
onMounted(() => window.addEventListener('keydown', esc)); onBeforeUnmount(() => window.removeEventListener('keydown', esc))
function esc(e: KeyboardEvent) { if (e.key === 'Escape') open.value = false }
</script>

<template>
  <div v-if="w.enabled && hasAny" class="fixed bottom-4 z-30" :class="w.position === 'bottom-left' ? 'left-4' : 'right-4'">
    <section v-if="open" class="holo mb-3 w-[min(92vw,22rem)] p-4" aria-label="Contact rapide">
      <div class="mb-2 flex items-start justify-between gap-2"><h2 class="font-display text-lg font-semibold">{{ w.label }}</h2><button type="button" class="grid h-8 w-8 place-items-center rounded-md hover:text-accent" aria-label="Fermer" @click="toggle"><X :size="18" /></button></div>
      <template v-if="mode === 'menu'">
        <p class="text-sm text-muted">{{ w.welcomeMessage }}</p>
        <div class="mt-3 flex flex-col gap-2">
          <button v-if="formOk" type="button" class="btn btn-primary w-full" @click="mode = 'form'"><MessageSquare :size="18" /> Écrire un message</button>
          <a v-if="email" :href="email" class="btn btn-ghost w-full"><Mail :size="18" /> Par e-mail</a>
          <a v-if="wa" :href="wa" target="_blank" rel="noopener noreferrer" class="btn btn-ghost w-full"><MessageCircle :size="18" /> Sur WhatsApp</a>
        </div>
        <p class="mt-3 text-xs text-muted">Message asynchrone : ce n’est pas un chat en temps réel.</p>
      </template>
      <template v-else>
        <button type="button" class="mb-3 text-sm text-accent underline" @click="mode = 'menu'">← Retour</button>
        <ContactForm :settings="settings" channel="widget" compact />
      </template>
    </section>
    <button type="button" class="btn btn-primary ml-auto flex !rounded-full shadow-lg" :aria-expanded="open" @click="toggle"><MessageSquare :size="20" /> {{ w.label }}</button>
  </div>
</template>
