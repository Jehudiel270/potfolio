<script setup lang="ts">
import { X } from 'lucide-vue-next'
const { item, close, opener } = useDetail()
const { content } = usePortfolioLabels()
const sound = useSound()
const dlg = ref<HTMLDialogElement | null>(null)
let returnFocus: HTMLElement | null = null

watch(item, (v) => {
  const d = dlg.value; if (!d) return
  if (v) { returnFocus = document.activeElement as HTMLElement | null; if (!d.open) d.showModal(); document.documentElement.style.overflow = 'hidden' }
  else { if (d.open) d.close(); document.documentElement.style.overflow = ''; returnFocus?.focus?.(); returnFocus = null }
})
function onClose() { if (item.value) { sound.play('close'); close() } }
function onBackdrop(e: MouseEvent) { if (e.target === dlg.value) close() }
onBeforeUnmount(() => { document.documentElement.style.overflow = '' })
void opener
</script>

<template>
  <dialog ref="dlg" class="m-auto w-[min(94vw,46rem)] max-w-none overflow-visible border-0 bg-transparent p-0 backdrop:bg-black/70 backdrop:backdrop-blur-sm" aria-label="Fiche détaillée" @close="onClose" @click="onBackdrop">
    <div v-if="item" class="relative">
      <DetailBody :item="item" />
      <button type="button" class="btn btn-ghost absolute right-3 top-3 !min-h-10 !px-3" @click="close"><X :size="18" /><span class="sr-only sm:not-sr-only">{{ content?.settings.buttons.close ?? 'Fermer' }}</span></button>
    </div>
  </dialog>
</template>
