<script setup lang="ts">
import { ArrowUp } from 'lucide-vue-next'
import type { PublicSettings } from '#shared/settings'
const props = defineProps<{ settings: PublicSettings }>()
const { lite } = useScene()
const sound = useSound()
const hasForm = computed(() => props.settings.contact.mode !== 'none')
</script>

<template>
  <section id="contact" class="pf-section" :style="{ height: lite ? undefined : '190dvh' }" aria-labelledby="contact-h">
    <div class="pin">
      <div class="pin-main holo holo-lines p-5 sm:p-7">
        <h2 id="contact-h" class="title-lg">{{ settings.finale.title }}</h2>
        <p class="prose-pf mt-3">{{ settings.finale.text }}</p>
        <ContactLinks class="mt-5" :settings="settings" />
        <div v-if="hasForm" class="mt-6"><ContactForm :settings="settings" compact /></div>
        <div class="mt-6 flex flex-wrap gap-3">
          <NuxtLink v-if="settings.contact.pageEnabled" to="/contact" class="btn btn-ghost">{{ settings.contact.title }}</NuxtLink>
          <button type="button" class="btn btn-ghost" @click="sound.play('portal'); scrollToSection('home')"><ArrowUp :size="18" /> {{ settings.buttons.backToStart }}</button>
        </div>
      </div>
      <div />
    </div>
  </section>
</template>
