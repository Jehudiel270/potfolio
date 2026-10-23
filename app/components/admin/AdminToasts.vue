<script setup lang="ts">
const { toasts } = useToast()
</script>

<template>
  <div class="fixed bottom-4 right-4 z-[100] flex w-[min(92vw,22rem)] flex-col gap-2" role="status" aria-live="polite">
    <div v-for="t in toasts" :key="t.id" class="rounded-lg border px-4 py-3 text-sm shadow-xl"
      :class="t.kind === 'ok' ? 'border-emerald-700 bg-emerald-950 text-emerald-100' : t.kind === 'error' ? 'border-red-700 bg-red-950 text-red-100' : 'border-sky-700 bg-sky-950 text-sky-100'">
      {{ t.text }}
    </div>
  </div>
</template>
