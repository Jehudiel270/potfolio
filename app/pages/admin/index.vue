<script setup lang="ts">
import { toApiError } from '~/utils/api'
import type { Theme } from '#shared/theme'
definePageMeta({ layout: 'admin' })
const { api } = useAdminApi()
interface Dash { counts: Record<string, number>, lastModified: string | null, theme: Theme, mail: { configured: boolean }, cloudinary: { configured: boolean } }
const data = ref<Dash | null>(null), error = ref('')
onMounted(async () => { try { data.value = await api<Dash>('/api/admin/dashboard') } catch (e) { error.value = toApiError(e).message } })
const cards = computed(() => !data.value ? [] : [
  { label: 'Projets publiés', v: data.value.counts.published, to: '/admin/projects' }, { label: 'Projets en brouillon', v: data.value.counts.drafts, to: '/admin/projects' },
  { label: 'Compétences', v: data.value.counts.skills, to: '/admin/skills' }, { label: 'Formations', v: data.value.counts.education, to: '/admin/education' },
  { label: 'Expériences', v: data.value.counts.experiences, to: '/admin/experiences' }, { label: 'Certifications', v: data.value.counts.certifications, to: '/admin/certifications' },
  { label: 'Réalisations', v: data.value.counts.achievements, to: '/admin/achievements' }, { label: 'Messages non lus', v: data.value.counts.unreadMessages, to: '/admin/messages' },
])
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' }) : 'Aucune modification')
const swatches = computed(() => (data.value ? (['accent', 'secondary', 'background', 'text', 'glow'] as const).map(k => ({ k, c: data.value!.theme[k] })) : []))
</script>

<template>
  <div>
    <h1 class="mb-1 text-2xl font-semibold">Tableau de bord</h1>
    <p class="mb-6 text-sm text-[#8da0bf]">Données lues en direct dans Neon.</p>
    <p v-if="error" class="ad-err" role="alert">{{ error }}</p>
    <div v-if="data" class="space-y-6">
      <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
        <NuxtLink v-for="c in cards" :key="c.label" :to="c.to" class="ad-card block p-4 hover:border-sky-700">
          <p class="font-display text-3xl font-bold">{{ c.v }}</p><p class="text-sm text-[#8da0bf]">{{ c.label }}</p>
        </NuxtLink>
      </div>
      <div class="grid gap-3 md:grid-cols-3">
        <div class="ad-card p-4"><h2 class="text-sm font-semibold">Dernière modification</h2><p class="mt-1 text-sm text-[#8da0bf]">{{ when(data.lastModified) }}</p></div>
        <div class="ad-card p-4">
          <h2 class="text-sm font-semibold">Palette actuelle</h2>
          <div class="mt-2 flex gap-2"><span v-for="s in swatches" :key="s.k" class="h-8 w-8 rounded-full border border-white/20" :style="{ background: s.c }" :title="`${s.k} ${s.c}`" /></div>
          <NuxtLink to="/admin/appearance" class="mt-2 inline-block text-sm text-sky-300 underline">Modifier l’apparence</NuxtLink>
        </div>
        <div class="ad-card p-4 text-sm">
          <h2 class="font-semibold">Services</h2>
          <p class="mt-1"><span class="ad-badge" :class="data.cloudinary.configured ? 'ad-badge-ok' : 'ad-badge-warn'">Cloudinary {{ data.cloudinary.configured ? 'configuré' : 'non configuré' }}</span></p>
          <p class="mt-1"><span class="ad-badge" :class="data.mail.configured ? 'ad-badge-ok' : 'ad-badge-warn'">E-mail SMTP {{ data.mail.configured ? 'configuré' : 'non configuré' }}</span></p>
        </div>
      </div>
      <div class="flex flex-wrap gap-2">
        <NuxtLink to="/admin/projects" class="ad-btn ad-btn-primary">Gérer les projets</NuxtLink>
        <NuxtLink to="/admin/content" class="ad-btn">Réglages du site</NuxtLink>
        <a href="/?preview=1" target="_blank" rel="noopener" class="ad-btn">Aperçu privé ↗</a>
      </div>
    </div>
  </div>
</template>
