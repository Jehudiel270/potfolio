<script setup lang="ts">
const { lite, crossed } = useScene()
</script>

<template>
  <section v-if="!lite" id="portal" class="pf-section" style="height: 320dvh" aria-label="Traversée du portail dimensionnel">
    <div class="pin"><div /><div class="pb-10 text-center text-muted transition-opacity duration-700" :class="crossed ? 'opacity-0' : 'opacity-80'" aria-hidden="true"><p class="text-sm">Continuez à défiler pour traverser le portail</p></div></div>
  </section>
</template>
