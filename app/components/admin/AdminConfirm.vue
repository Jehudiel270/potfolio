<script setup lang="ts">
const props = defineProps<{ open: boolean, title: string, message: string, confirmLabel?: string, danger?: boolean, busy?: boolean }>()
const emit = defineEmits<{ confirm: [], cancel: [] }>()
const dlg = ref<HTMLDialogElement | null>(null)
watch(() => props.open, (v) => { if (v) dlg.value?.showModal(); else dlg.value?.close() })
</script>

<template>
  <dialog ref="dlg" class="m-auto w-[min(92vw,26rem)] rounded-xl border border-[#223049] bg-[#111826] p-0 text-[#e6edf8] backdrop:bg-black/70" @cancel.prevent="emit('cancel')">
    <div class="p-5">
      <h2 class="text-lg font-semibold">{{ title }}</h2>
      <p class="mt-2 text-sm text-[#8da0bf]">{{ message }}</p>
      <div class="mt-5 flex justify-end gap-2">
        <button class="ad-btn" type="button" @click="emit('cancel')">Annuler</button>
        <button class="ad-btn" :class="danger ? 'ad-btn-danger' : 'ad-btn-primary'" type="button" :disabled="busy" @click="emit('confirm')">{{ busy ? 'Patientez…' : (confirmLabel ?? 'Confirmer') }}</button>
      </div>
    </div>
  </dialog>
</template>
