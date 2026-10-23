<script setup lang="ts">
import type { PublicContent } from '#shared/types'
import { EXPERIENCE_KIND_LABELS } from '#shared/presets'
import { formatDateRange } from '#shared/utils'
const props = defineProps<{ content: PublicContent }>()
const { lite } = useScene()
const open = useOpenItem()
const cfg = computed(() => props.content.settings.sections.experiences)
const items = computed(() => props.content.experiences)
const local = useChapterLocal('experiences')
const active = computed(() => items.value[items.value.length > 1 ? Math.round(local.value * (items.value.length - 1)) : 0] ?? null)
const vh = computed(() => Math.min(520, 150 + items.value.length * 75))
</script>

<template>
  <SectionFrame id="experiences" :vh="vh" :title="cfg.title" :intro="cfg.intro" :empty="items.length ? undefined : cfg.emptyLabel">
    <article v-if="active && !lite" class="mt-5 border-t border-white/10 pt-4" aria-live="polite">
      <p class="text-sm text-accent">{{ formatDateRange(active.startDate, active.endDate, active.isCurrent, 'en cours') }} · {{ EXPERIENCE_KIND_LABELS[active.kind as keyof typeof EXPERIENCE_KIND_LABELS] }}</p>
      <h3 class="font-display text-xl font-semibold">{{ active.role }}</h3>
      <p class="text-muted">{{ active.organization }}</p>
      <p v-if="active.description" class="prose-pf mt-2 line-clamp-3">{{ active.description }}</p>
      <button type="button" class="btn btn-ghost mt-3 !min-h-10" @click="open(`experience:${active.id}`)">Voir la fiche</button>
    </article>
    <template #dock>
      <ItemDock :items="items.map(e => ({ key: `experience:${e.id}`, title: e.role, sub: e.organization, meta: formatDateRange(e.startDate, e.endDate, e.isCurrent, 'en cours'), color: e.color }))" :active="active ? `experience:${active.id}` : null" label="Expériences" @open="open" />
    </template>
  </SectionFrame>
</template>
