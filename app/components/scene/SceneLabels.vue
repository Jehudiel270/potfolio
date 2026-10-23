<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import type { PublicContent } from '#shared/types'
import type { SkillsChapter } from '~/scene/chapters/skills'
import type { HomeChapter } from '~/scene/chapters/home-portal-about'
import { yearOf } from '#shared/utils'

const props = defineProps<{ content: PublicContent }>()
const { engine, ui, hover, status } = useScene()
const open = useOpenItem()
const tip = ref<HTMLElement | null>(null), panel = ref<HTMLElement | null>(null), marker = ref<HTMLElement | null>(null)
useSceneAnchor(tip, () => engine.value?.hover?.world ?? null, null, { dy: -22 })
useSceneAnchor(panel, () => { const ch = engine.value?.byId.get('skills') as SkillsChapter | undefined; return ch && ui.value.skillView === 'station' ? ch.moduleWorld : null }, 'skills', { dx: 56, dy: -70 })
useSceneAnchor(marker, () => { const ch = engine.value?.byId.get('home') as HomeChapter | undefined; return ch?.earth?.hasMarker ? ch.earth.markerWorld : null }, 'home', { dy: -14 })

const stationSkills = computed(() => props.content.skills.filter(s => s.allowedModes.includes('station') && (!ui.value.skillCategory || s.category === ui.value.skillCategory)))
const featured = computed(() => props.content.skills.find(s => s.id === ui.value.skillFeatured) ?? stationSkills.value.find(s => s.featured) ?? stationSkills.value[0] ?? null)
function step(d: 1 | -1) { const l = stationSkills.value; if (!l.length) return; const i = l.findIndex(s => s.id === featured.value?.id); ui.value.skillFeatured = l[(i + d + l.length) % l.length]!.id }
const marker3d = computed(() => props.content.settings.hero.globeMarker)
</script>

<template>
  <div v-if="status === 'ready'" class="pointer-events-none fixed inset-0 z-20 overflow-hidden">
    <div ref="tip" class="invisible absolute left-0 top-0"><div v-if="hover" class="holo -translate-x-1/2 -translate-y-full whitespace-nowrap px-3 py-1.5 text-sm" role="tooltip"><strong>{{ hover.label }}</strong><span v-if="hover.sub" class="ml-2 text-muted">{{ hover.sub }}</span></div></div>
    <div v-if="marker3d?.label" ref="marker" class="invisible absolute left-0 top-0"><div class="-translate-x-1/2 -translate-y-full text-sm text-glow">{{ marker3d.label }}</div></div>

    <!-- Interface holographique de la station : vrai HTML/CSS ancré sur l'unique module 3D -->
    <div ref="panel" class="invisible absolute left-0 top-0">
      <div v-if="featured" class="holo holo-lines pointer-events-auto w-64 -translate-y-1/2 p-4" role="group" aria-label="Compétence mise en avant">
        <div class="flex items-center gap-3">
          <img v-if="featured.iconUrl" :src="featured.iconUrl" :alt="`Logo ${featured.name}`" class="h-10 w-10 rounded object-contain">
          <span v-else class="grid h-10 w-10 place-items-center rounded font-display font-bold text-void" :style="{ background: featured.color || 'var(--pf-station-accent)' }" aria-hidden="true">{{ featured.name.slice(0, 2).toUpperCase() }}</span>
          <div class="min-w-0"><p class="truncate font-display text-lg font-semibold">{{ featured.name }}</p><p v-if="featured.category" class="truncate text-sm text-muted">{{ featured.category }}</p></div>
        </div>
        <div v-if="featured.proficiency != null" class="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10" role="meter" :aria-valuenow="featured.proficiency" aria-valuemin="0" aria-valuemax="100" aria-label="Niveau"><div class="h-full" :style="{ width: featured.proficiency + '%', background: 'var(--pf-gradient)' }" /></div>
        <p v-if="featured.description" class="mt-3 line-clamp-3 text-sm text-muted">{{ featured.description }}</p>
        <div class="mt-3 flex items-center justify-between gap-2">
          <span class="flex gap-1"><button type="button" class="chip !min-h-9 !px-2" aria-label="Précédente" @click="step(-1)"><ChevronLeft :size="16" /></button><button type="button" class="chip !min-h-9 !px-2" aria-label="Suivante" @click="step(1)"><ChevronRight :size="16" /></button></span>
          <button type="button" class="chip !min-h-9" @click="open(`skill:${featured.id}`)">Détails</button>
        </div>
      </div>
    </div>
    <EduLabel v-for="(e, i) in content.education" :key="e.id" :index="i" :year="yearOf(e.startDate)" :title="e.title" />
  </div>
</template>
