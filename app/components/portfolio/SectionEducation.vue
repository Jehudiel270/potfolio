<script setup lang="ts">
import type { PublicContent, PublicEducation } from '#shared/types'
import { formatDateRange } from '#shared/utils'
const props = defineProps<{ content: PublicContent }>()
const { lite } = useScene()
const open = useOpenItem()
const cfg = computed(() => props.content.settings.sections.education)
const items = computed(() => props.content.education)
const local = useChapterLocal('education')
const idx = computed(() => (items.value.length > 1 ? Math.round(local.value * (items.value.length - 1)) : 0))
const active = computed<PublicEducation | null>(() => items.value[idx.value] ?? null)
const vh = computed(() => Math.min(520, 150 + items.value.length * 75))
</script>

<template>
  <SectionFrame id="education" :vh="vh" :title="cfg.title" :intro="cfg.intro" :empty="items.length ? undefined : cfg.emptyLabel">
    <article v-if="active && !lite" class="mt-5 border-t border-white/10 pt-4" aria-live="polite">
      <p class="text-sm text-accent">{{ formatDateRange(active.startDate, active.endDate, active.isCurrent) }}</p>
      <h3 class="font-display text-xl font-semibold">{{ active.title }}</h3>
      <p class="text-muted">{{ [active.institution, active.degree].filter(Boolean).join(' · ') }}</p>
      <p v-if="active.description" class="prose-pf mt-2 line-clamp-3">{{ active.description }}</p>
      <button type="button" class="btn btn-ghost mt-3 !min-h-10" @click="open(`education:${active.id}`)">Voir la fiche</button>
    </article>
    <template #dock>
      <ItemDock :items="items.map(e => ({ key: `education:${e.id}`, title: e.title, sub: e.institution, meta: formatDateRange(e.startDate, e.endDate, e.isCurrent), color: e.color }))" :active="active ? `education:${active.id}` : null" label="Étapes du parcours" @open="open" />
    </template>
  </SectionFrame>
</template>
