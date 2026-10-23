<script setup lang="ts">
const props = defineProps<{ error: { statusCode: number, message?: string } }>()
const is404 = computed(() => props.error.statusCode === 404)
</script>

<template>
  <main class="grid min-h-dvh place-items-center bg-[#05060f] px-6 text-center text-[#e8f0ff]">
    <div class="max-w-md">
      <p class="font-display text-7xl font-bold">{{ error.statusCode }}</p>
      <h1 class="mt-4 font-display text-2xl">{{ is404 ? 'Cette région de l’espace est inconnue' : 'Une erreur est survenue' }}</h1>
      <p class="mt-3 text-[#93a4c8]">{{ is404 ? 'La page demandée n’existe pas ou a été déplacée.' : 'Réessayez dans un instant.' }}</p>
      <button class="mt-8 rounded-lg bg-[#22d3ee] px-5 py-3 font-semibold text-[#05060f]" @click="clearError({ redirect: '/' })">Retour à l’accueil</button>
    </div>
  </main>
</template>
