<script setup lang="ts">
defineProps<{ dirty: boolean, saving: boolean }>()
defineEmits<{ save: [], cancel: [] }>()
</script>

<template>
  <div class="sticky bottom-0 z-20 -mx-4 mt-8 flex items-center justify-between gap-3 border-t border-[#223049] bg-[#0b0f17]/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8">
    <p class="text-sm" :class="dirty ? 'text-amber-300' : 'text-[#8da0bf]'" role="status">{{ dirty ? 'Modifications non enregistrées' : 'Tout est enregistré' }}</p>
    <div class="flex gap-2">
      <button class="ad-btn" type="button" :disabled="!dirty || saving" @click="$emit('cancel')">Annuler les modifications</button>
      <button class="ad-btn ad-btn-primary" type="button" :disabled="!dirty || saving" @click="$emit('save')">{{ saving ? 'Enregistrement…' : 'Enregistrer' }}</button>
    </div>
  </div>
</template>
