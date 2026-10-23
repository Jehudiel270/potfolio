<script setup lang="ts">
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-vue-next'
import { SKILL_VIEW_LABELS, type SkillView } from '#shared/presets'
import type { PublicContent, PublicSkill } from '#shared/types'
import type { SectionPlan } from '#shared/sections'

const props = defineProps<{ content: PublicContent, plan: SectionPlan }>()
const { ui, lite } = useScene()
const open = useOpenItem()
const s = computed(() => props.content.settings)
const cfg = computed(() => s.value.sections.skills)
const views = computed(() => props.plan.skillViews)
const labels = computed(() => s.value.skillViews.labels)
const showSwitch = computed(() => s.value.skillViews.showSwitcher && views.value.length > 1)
const forView = (v: SkillView) => props.content.skills.filter(k => k.allowedModes.includes(v))
const categories = computed(() => [...new Set(forView(ui.value.skillView).map(k => k.category).filter(Boolean))])
const stationSkills = computed(() => forView('station').filter(k => !ui.value.skillCategory || k.category === ui.value.skillCategory))
const hexAll = computed(() => forView('hex').filter(k => !ui.value.skillCategory || k.category === ui.value.skillCategory))
const pages = computed(() => Math.max(1, Math.ceil(hexAll.value.length / ui.value.hexPageSize)))
const hexPage = computed(() => [...hexAll.value].sort((a, b) => a.category.localeCompare(b.category) || a.sortOrder - b.sortOrder).slice(ui.value.skillPage * ui.value.hexPageSize, (ui.value.skillPage + 1) * ui.value.hexPageSize))
const featured = computed(() => props.content.skills.find(k => k.id === ui.value.skillFeatured) ?? stationSkills.value[0] ?? null)
const dockItem = (k: PublicSkill) => ({ key: `skill:${k.id}`, title: k.name, sub: k.category, color: k.color })

const openSkill = (k: PublicSkill) => open(`skill:${k.id}`)
function setView(v: SkillView) { ui.value.skillView = v; ui.value.skillPage = 0 }
function step(d: 1 | -1) {
  const l = stationSkills.value; if (!l.length) return
  const i = l.findIndex(k => k.id === featured.value?.id)
  ui.value.skillFeatured = l[(i + d + l.length) % l.length]!.id
}
watch(() => ui.value.skillCategory, () => { ui.value.skillPage = 0; if (stationSkills.value.length && !stationSkills.value.some(k => k.id === ui.value.skillFeatured)) ui.value.skillFeatured = stationSkills.value[0]!.id })
watch(pages, p => { if (ui.value.skillPage >= p) ui.value.skillPage = p - 1 })

// Rotation lente entre les compétences : suspendue si le visiteur interagit, préfère un mouvement réduit.
const auto = ref(true)
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) auto.value = false
  timer = setInterval(() => { if (auto.value && ui.value.skillView === 'station' && !document.hidden && stationSkills.value.length > 1) step(1) }, 6500)
})
onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <SectionFrame id="skills" :vh="240" :title="cfg.title" :intro="cfg.intro" :empty="content.skills.length ? undefined : cfg.emptyLabel">
    <div v-if="showSwitch" class="mt-5" role="group" :aria-label="s.skillViews.switcherLabel">
      <p class="mb-2 text-sm text-muted">{{ s.skillViews.switcherLabel }}</p>
      <div class="flex flex-wrap gap-2"><button v-for="v in views" :key="v" type="button" class="chip" :aria-pressed="ui.skillView === v" @click="setView(v)">{{ labels[v] || SKILL_VIEW_LABELS[v] }}</button></div>
    </div>
    <div v-if="categories.length > 1 && ui.skillView !== 'tree'" class="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filtrer par catégorie">
      <button type="button" class="chip" :aria-pressed="!ui.skillCategory" @click="ui.skillCategory = ''">Toutes</button>
      <button v-for="c in categories" :key="c" type="button" class="chip" :aria-pressed="ui.skillCategory === c" @click="ui.skillCategory = c">{{ c }}</button>
    </div>
    <div v-if="ui.skillView === 'station' && featured" class="mt-5 flex flex-wrap items-center gap-2">
      <button type="button" class="chip !px-3" aria-label="Compétence précédente" @click="auto = false; step(-1)"><ChevronLeft :size="16" /></button>
      <button type="button" class="chip !px-3" aria-label="Compétence suivante" @click="auto = false; step(1)"><ChevronRight :size="16" /></button>
      <button type="button" class="chip !px-3" :aria-pressed="auto" :aria-label="auto ? 'Mettre la rotation en pause' : 'Reprendre la rotation'" @click="auto = !auto"><component :is="auto ? Pause : Play" :size="14" /></button>
      <span class="text-sm text-muted" aria-live="polite">{{ featured.name }}</span>
      <button type="button" class="btn btn-ghost !min-h-9 !px-3 text-sm" @click="open(`skill:${featured.id}`)">Détails</button>
    </div>
    <div v-if="ui.skillView === 'hex' && pages > 1" class="mt-4 flex items-center gap-2 text-sm text-muted">
      <button type="button" class="chip" :disabled="ui.skillPage === 0" @click="ui.skillPage--">Précédent</button>
      <span aria-live="polite">Page {{ ui.skillPage + 1 }} / {{ pages }}</span>
      <button type="button" class="chip" :disabled="ui.skillPage >= pages - 1" @click="ui.skillPage++">Suivant</button>
    </div>
    <details v-if="ui.skillView === 'station' && stationSkills.length > 1" class="mt-5 text-sm">
      <summary class="cursor-pointer text-accent">Toutes les compétences ({{ stationSkills.length }})</summary>
      <ul class="mt-2 flex flex-wrap gap-2"><li v-for="k in stationSkills" :key="k.id"><button type="button" class="chip" :aria-pressed="featured?.id === k.id" @click="auto = false; ui.skillFeatured = k.id">{{ k.name }}</button></li></ul>
    </details>
    <template #dock>
      <ItemDock v-if="ui.skillView === 'hex' && hexPage.length" :items="hexPage.map(dockItem)" label="Compétences de la page" @open="open" />
      <SkillTree v-else-if="ui.skillView === 'tree'" :skills="content.skills" @open="openSkill" />
      <span v-else-if="lite" />
    </template>
  </SectionFrame>
</template>
