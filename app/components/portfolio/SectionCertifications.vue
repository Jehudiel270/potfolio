<script setup lang="ts">
import type { PublicContent } from '#shared/types'
import { formatMonth } from '#shared/utils'
const props = defineProps<{ content: PublicContent }>()
const { ui } = useScene()
const open = useOpenItem()
const cfg = computed(() => props.content.settings.sections.certifications)
const cats = computed(() => [...new Set(props.content.certifications.map(c => c.category).filter(Boolean))])
const shown = computed(() => props.content.certifications.filter(c => !ui.value.certCategory || c.category === ui.value.certCategory))
</script>

<template>
  <SectionFrame id="certifications" :vh="190" :title="cfg.title" :intro="cfg.intro" :empty="content.certifications.length ? undefined : cfg.emptyLabel">
    <div v-if="cats.length > 1" class="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filtrer par catégorie">
      <button type="button" class="chip" :aria-pressed="!ui.certCategory" @click="ui.certCategory = ''">Toutes</button>
      <button v-for="c in cats" :key="c" type="button" class="chip" :aria-pressed="ui.certCategory === c" @click="ui.certCategory = c">{{ c }}</button>
    </div>
    <template #dock>
      <ItemDock :items="shown.map(c => ({ key: `certification:${c.id}`, title: c.name, sub: c.issuer, meta: formatMonth(c.issuedAt), color: c.color }))" label="Certifications" @open="open" />
    </template>
  </SectionFrame>
</template>
