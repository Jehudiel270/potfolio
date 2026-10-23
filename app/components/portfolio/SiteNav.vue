<script setup lang="ts">
import { Menu, Volume2, VolumeX, X } from 'lucide-vue-next'
import type { NavEntry } from '#shared/sections'
import type { PublicContent } from '#shared/types'

const props = defineProps<{ nav: NavEntry[], active: string, content: PublicContent }>()
const open = ref(false)
const sound = useSound()
const { progress, lite } = useScene()
const s = computed(() => props.content.settings)
function go(id: string) { open.value = false; sound.play('click', 0.25); scrollToSection(id) }
function onKey(e: KeyboardEvent) { if (e.key === 'Escape') open.value = false }
onMounted(() => window.addEventListener('keydown', onKey)); onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
function toggleLite() { lite.value = !lite.value; try { localStorage.setItem('pf-lite', lite.value ? '1' : '0') } catch { /* stockage indisponible */ } location.reload() }
</script>

<template>
  <header class="fixed inset-x-0 top-0 z-40 flex justify-center px-3 pt-3">
    <a v-if="s.navigation.showSkipLink" href="#main" class="sr-only-focusable btn btn-primary absolute left-3 top-3" @click.prevent="go(nav.find(n => n.id !== 'home')?.id ?? 'home')">{{ s.buttons.skip }}</a>
    <nav class="holo flex w-full max-w-5xl items-center justify-between gap-2 px-3 py-2 sm:px-5" aria-label="Navigation principale">
      <button type="button" class="font-display text-lg font-semibold tracking-tight" @click="go('home')">{{ s.identity.displayName }}</button>
      <ul class="hidden items-center gap-1 md:flex">
        <li v-for="n in nav" :key="n.id">
          <a :href="n.id === 'home' ? '/' : `#${n.id}`" class="rounded-md px-3 py-2 text-sm transition-colors hover:text-accent" :class="active === n.id ? 'text-accent' : 'text-muted'" :aria-current="active === n.id ? 'true' : undefined" @click.prevent="go(n.id)">{{ n.label }}</a>
        </li>
      </ul>
      <div class="flex items-center gap-1">
        <button v-if="s.visuals.sound" type="button" class="grid h-10 w-10 place-items-center rounded-md text-muted hover:text-accent" :aria-pressed="sound.enabled.value" :aria-label="sound.enabled.value ? 'Couper les sons d’interface' : 'Activer les sons d’interface'" @click="sound.toggle"><component :is="sound.enabled.value ? Volume2 : VolumeX" :size="20" /></button>
        <button type="button" class="hidden rounded-md px-2 py-2 text-xs text-muted hover:text-accent lg:block" :aria-pressed="lite" title="Désactive la 3D : version simple et légère" @click="toggleLite">{{ lite ? 'Réactiver la 3D' : 'Version légère' }}</button>
        <button type="button" class="grid h-10 w-10 place-items-center rounded-md md:hidden" :aria-expanded="open" aria-controls="mobile-menu" :aria-label="open ? 'Fermer le menu' : 'Ouvrir le menu'" @click="open = !open"><component :is="open ? X : Menu" :size="22" /></button>
      </div>
    </nav>
    <div v-if="s.navigation.showProgress" class="pointer-events-none absolute inset-x-6 top-[3.9rem] mx-auto h-px max-w-5xl overflow-hidden rounded bg-white/5" aria-hidden="true"><div class="h-full origin-left" :style="{ transform: `scaleX(${progress})`, background: 'var(--pf-gradient)' }" /></div>
    <div v-if="open" id="mobile-menu" class="holo absolute inset-x-3 top-[4.2rem] p-3 md:hidden">
      <ul class="space-y-1"><li v-for="n in nav" :key="n.id"><a :href="n.id === 'home' ? '/' : `#${n.id}`" class="block rounded-md px-3 py-3 text-base" :class="active === n.id ? 'bg-white/5 text-accent' : 'text-ink'" @click.prevent="go(n.id)">{{ n.label }}</a></li></ul>
      <button type="button" class="mt-2 w-full rounded-md px-3 py-3 text-left text-sm text-muted" @click="toggleLite">{{ lite ? 'Réactiver la 3D' : 'Version légère (sans 3D)' }}</button>
    </div>
  </header>
</template>
