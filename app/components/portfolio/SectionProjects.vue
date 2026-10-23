<script setup lang="ts">
import type { PublicContent } from '#shared/types'
import { cldUrl } from '#shared/media'
const props = defineProps<{ content: PublicContent }>()
const { ui, lite } = useScene()
const open = useOpenItem()
const cfg = computed(() => props.content.settings.sections.projects)
const sort = ref<'priority' | 'date' | 'category'>('priority')
const cats = computed(() => [...new Set(props.content.projects.map(p => p.category).filter(Boolean))])
const list = computed(() => {
  const l = props.content.projects.filter(p => !ui.value.projectCategory || p.category === ui.value.projectCategory)
  if (sort.value === 'date') return [...l].sort((a, b) => (b.projectDate ?? '').localeCompare(a.projectDate ?? ''))
  if (sort.value === 'category') return [...l].sort((a, b) => a.category.localeCompare(b.category))
  return l
})
const local = useChapterLocal('projects')
const active = computed(() => props.content.projects[props.content.projects.length > 1 ? Math.round(local.value * (props.content.projects.length - 1)) : 0] ?? null)
watch(active, a => { ui.value.projectActive = a?.id ?? null })
const vh = computed(() => Math.min(600, 150 + props.content.projects.length * 80))
</script>

<template>
  <SectionFrame id="projects" :vh="vh" :title="cfg.title" :intro="cfg.intro" :empty="content.projects.length ? undefined : cfg.emptyLabel">
    <div v-if="content.projects.length" class="mt-5 flex flex-wrap items-center gap-2">
      <template v-if="cats.length > 1"><button type="button" class="chip" :aria-pressed="!ui.projectCategory" @click="ui.projectCategory = ''">Tous</button>
        <button v-for="c in cats" :key="c" type="button" class="chip" :aria-pressed="ui.projectCategory === c" @click="ui.projectCategory = c">{{ c }}</button></template>
      <label class="ml-auto flex items-center gap-2 text-sm text-muted">Trier
        <select v-model="sort" class="field !min-h-9 !w-auto !py-1"><option value="priority">Par priorité</option><option value="date">Par date</option><option value="category">Par catégorie</option></select></label>
    </div>
    <article v-if="active && !lite" class="mt-5 border-t border-white/10 pt-4" aria-live="polite">
      <h3 class="font-display text-xl font-semibold">{{ active.title }}</h3>
      <p v-if="active.shortDescription" class="prose-pf mt-1 line-clamp-3">{{ active.shortDescription }}</p>
      <button type="button" class="btn btn-primary mt-3 !min-h-10" @click="open(`project:${active.id}`)">{{ content.settings.buttons.discover === '' ? 'Voir' : 'Voir le projet' }}</button>
    </article>
    <template #dock>
      <ItemDock :items="list.map(p => ({ key: `project:${p.id}`, title: p.title, sub: p.category || p.shortDescription, image: p.coverImageUrl ? cldUrl(p.coverImageUrl, { w: 120, h: 120, fit: 'fill' }) : null, color: p.color }))" :active="active ? `project:${active.id}` : null" label="Projets" @open="open" />
    </template>
  </SectionFrame>
</template>
