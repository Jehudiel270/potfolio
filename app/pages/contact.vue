<script setup lang="ts">
const { data, error } = await usePublicContent()
if (error.value && !data.value) throw createError({ statusCode: 503, statusMessage: 'Contenu indisponible' })
if (data.value && !data.value.settings.contact.pageEnabled) throw createError({ statusCode: 404, statusMessage: 'Page introuvable' })
const theme = useTheme()
if (data.value) theme.value = data.value.settings.theme
useThemeHead()
const s = computed(() => data.value!.settings)
useSeoMeta({ title: () => `${s.value.contact.title} — ${s.value.identity.displayName}`, description: () => s.value.contact.intro })
const waOnly = computed(() => s.value.contact.mode === 'none')
</script>

<template>
  <div v-if="data" class="relative min-h-dvh">
    <div class="pf-backdrop" aria-hidden="true" />
    <header class="mx-auto flex max-w-3xl items-center justify-between px-4 pt-6"><NuxtLink to="/" class="font-display text-lg font-semibold">← {{ s.identity.displayName }}</NuxtLink></header>
    <main class="mx-auto max-w-3xl px-4 py-12">
      <div class="holo holo-lines p-6 sm:p-9">
        <h1 class="title-lg">{{ s.contact.title }}</h1>
        <p class="prose-pf mt-3">{{ s.contact.intro }}</p>
        <ContactLinks class="mt-6" :settings="s" />
        <div v-if="!waOnly" class="mt-8"><ContactForm :settings="s" /></div>
        <p v-else-if="!s.identity.email && !s.links.length" class="mt-6 text-muted">Aucun moyen de contact n’est renseigné pour le moment.</p>
      </div>
    </main>
    <ContactWidget :settings="{ ...s, widget: { ...s.widget, enabled: false } }" />
  </div>
</template>
