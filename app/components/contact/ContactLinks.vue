<script setup lang="ts">
import { Github, Globe, Instagram, Link as LinkIcon, Linkedin, Mail, Twitter, Youtube } from 'lucide-vue-next'
import type { PublicSettings } from '#shared/settings'

const props = defineProps<{ settings: PublicSettings }>()
const icons = { github: Github, linkedin: Linkedin, x: Twitter, instagram: Instagram, youtube: Youtube, website: Globe, other: LinkIcon } as const
const links = computed(() => props.settings.links.filter(l => l.visible))
</script>

<template>
  <ul v-if="settings.identity.email || links.length" class="flex flex-wrap gap-3">
    <li v-if="settings.identity.email"><a :href="`mailto:${settings.identity.email}`" class="btn btn-ghost"><Mail :size="18" /> {{ settings.identity.email }}</a></li>
    <li v-for="l in links" :key="l.id"><a :href="l.url" target="_blank" rel="noopener noreferrer me" class="btn btn-ghost"><component :is="icons[l.kind]" :size="18" /> {{ l.label }}</a></li>
  </ul>
</template>
