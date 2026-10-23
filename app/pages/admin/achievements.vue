<script setup lang="ts">
definePageMeta({ layout: 'admin' })
</script>

<template>
  <div>
    <p class="mb-3 text-sm text-[#8da0bf]">Catégories : <NuxtLink to="/admin/achievement-categories" class="text-sky-300 underline">gérer les catégories</NuxtLink></p>
    <AdminResourcePage resource="achievements" />
  </div>
</template>
