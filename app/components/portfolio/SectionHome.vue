<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next'
import type { PublicSettings } from '#shared/settings'
const props = defineProps<{ settings: PublicSettings, next: string }>()
const { lite } = useScene()
const words = computed(() => props.settings.identity.displayName.split(/\s+/))
</script>

<template>
  <section id="home" class="pf-section" :style="{ height: lite ? undefined : '230dvh' }" aria-labelledby="home-h">
    <div class="pin">
      <div class="pin-main !max-w-3xl">
        <h1 id="home-h" class="title-xl" :aria-label="settings.identity.displayName"><span v-for="(w, i) in words" :key="i" class="reveal-word mr-[.25em]" :style="{ '--i': i }" aria-hidden="true">{{ w }}</span></h1>
        <p class="reveal-word mt-5 font-display text-2xl text-accent sm:text-3xl" :style="{ '--i': words.length + 1 }">{{ settings.identity.title }}</p>
        <p class="reveal-word prose-pf mt-4 text-lg" :style="{ '--i': words.length + 3 }">{{ settings.identity.tagline }} {{ settings.identity.intro }}</p>
        <div class="reveal-word mt-8 flex flex-wrap gap-3" :style="{ '--i': words.length + 5 }">
          <a :href="`#${next}`" class="btn btn-primary" @click.prevent="scrollToSection(next)">{{ settings.buttons.discover }}</a>
          <a href="#contact" class="btn btn-ghost" @click.prevent="scrollToSection('contact')">{{ settings.buttons.contact }}</a>
        </div>
      </div>
      <div class="scroll-hint flex justify-center text-muted" aria-hidden="true"><span class="flex flex-col items-center text-sm"><ChevronDown :size="22" /></span></div>
    </div>
  </section>
</template>
