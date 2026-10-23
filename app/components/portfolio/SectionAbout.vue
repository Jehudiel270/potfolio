<script setup lang="ts">
import type { PublicSettings } from '#shared/settings'
const props = defineProps<{ settings: PublicSettings, title: string, next: string }>()
const paragraphs = computed(() => props.settings.identity.about.split(/\n{2,}/).map(p => p.trim()).filter(Boolean))
</script>

<template>
  <SectionFrame id="about" :vh="150" :title="title">
    <div class="prose-pf mt-4"><p v-for="(p, i) in paragraphs" :key="i">{{ p }}</p></div>
    <div class="mt-6 flex flex-wrap gap-3">
      <a :href="`#${next}`" class="btn btn-primary" @click.prevent="scrollToSection(next)">{{ settings.buttons.discover }}</a>
      <a href="#contact" class="btn btn-ghost" @click.prevent="scrollToSection('contact')">{{ settings.buttons.contact }}</a>
    </div>
  </SectionFrame>
</template>
