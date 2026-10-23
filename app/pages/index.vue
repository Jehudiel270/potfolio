<script setup lang="ts">
const { data, error, refresh } = await usePublicContent()
const unconfigured = computed(() => (error.value?.data as { data?: { code?: string } } | undefined)?.data?.code === 'db_not_configured')
useHead({ title: 'Portfolio' })
</script>

<template>
  <PortfolioExperience v-if="data" :content="data" />
  <main v-else class="grid min-h-dvh place-items-center bg-[#05060f] px-6 text-center text-[#e8f0ff]">
    <div class="max-w-md">
      <h1 class="font-display text-3xl font-bold">Contenu indisponible</h1>
      <p class="mt-3 text-[#93a4c8]">{{ unconfigured ? 'La base de données n’est pas encore configurée : renseignez DATABASE_URL puis lancez les migrations (voir le README).' : 'Le contenu n’a pas pu être chargé. Réessayez dans un instant.' }}</p>
      <button class="mt-6 rounded-lg bg-[#22d3ee] px-5 py-3 font-semibold text-[#05060f]" @click="refresh()">Réessayer</button>
    </div>
  </main>
</template>
