<script setup lang="ts">
import type { PublicContent } from '#shared/types'
import { formatMonth } from '#shared/utils'
const props = defineProps<{ content: PublicContent }>()
const { ui } = useScene()
const open = useOpenItem()
const cfg = computed(() => props.content.settings.sections.achievements)
const cats = computed(() => [...new Set(props.content.achievements.map(c => c.category).filter(Boolean))])
const shown = computed(() => props.content.achievements.filter(c => !ui.value.achCategory || c.category === ui.value.achCategory))
</script>

<template>
  <SectionFrame id="achievements" :vh="170" :title="cfg.title" :intro="cfg.intro" :empty="content.achievements.length ? undefined : cfg.emptyLabel">
    <div v-if="cats.length > 1" class="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filtrer par catégorie">
      <button type="button" class="chip" :aria-pressed="!ui.achCategory" @click="ui.achCategory = ''">Toutes</button>
      <button v-for="c in cats" :key="c" type="button" class="chip" :aria-pressed="ui.achCategory === c" @click="ui.achCategory = c">{{ c }}</button>
    </div>
    <template #dock>
      <ItemDock :items="shown.map(a => ({ key: `achievement:${a.id}`, title: a.title, sub: a.category, meta: formatMonth(a.date), color: a.color }))" label="Réalisations" @open="open" />
    </template>
  </SectionFrame>
</template>
