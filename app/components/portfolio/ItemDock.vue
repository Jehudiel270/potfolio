<script setup lang="ts">
export interface DockItem { key: string, title: string, sub?: string, meta?: string, image?: string | null, color?: string | null }
defineProps<{ items: DockItem[], active?: string | null, label: string, grid?: boolean }>()
const emit = defineEmits<{ open: [key: string] }>()
const { ui, lite } = useScene()
const set = (k: string | null) => { ui.value.focusKey = k }
</script>

<template>
  <ul class="gap-2" :class="grid || lite ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'flex snap-x overflow-x-auto pb-1'" :aria-label="label" style="scrollbar-width: thin">
    <li v-for="it in items" :key="it.key" class="min-w-[13rem] snap-start" :class="grid || lite ? '' : 'shrink-0'">
      <button type="button" class="holo flex h-full w-full items-center gap-3 p-3 text-left transition-transform hover:-translate-y-0.5" :class="active === it.key ? 'ring-1 ring-accent' : ''" :aria-current="active === it.key ? 'true' : undefined"
        @click="emit('open', it.key)" @mouseenter="set(it.key)" @mouseleave="set(null)" @focus="set(it.key)" @blur="set(null)">
        <img v-if="it.image" :src="it.image" alt="" class="h-12 w-12 shrink-0 rounded object-cover" loading="lazy">
        <span v-else class="h-3 w-3 shrink-0 rounded-full" :style="{ background: it.color || 'var(--pf-accent)', boxShadow: `0 0 12px ${it.color || 'var(--pf-accent)'}` }" aria-hidden="true" />
        <span class="min-w-0"><span class="block truncate font-semibold">{{ it.title }}</span><span v-if="it.sub" class="block truncate text-sm text-muted">{{ it.sub }}</span><span v-if="it.meta" class="block truncate text-xs text-muted">{{ it.meta }}</span></span>
      </button>
    </li>
  </ul>
</template>
