<script setup lang="ts">
import { List, Maximize2, ZoomIn, ZoomOut } from 'lucide-vue-next'
import type { PublicSkill } from '#shared/types'
import { layoutTree, neighbour, type TreeNode } from '~/utils/skill-tree'
import { initialsOf } from '~/scene/chapters/common'

const props = defineProps<{ skills: PublicSkill[] }>()
const emit = defineEmits<{ open: [skill: PublicSkill] }>()
const layout = computed(() => layoutTree(props.skills))
const zoom = ref(1), pan = reactive({ x: 0, y: 0 }), showList = ref(false)
const svg = ref<SVGSVGElement | null>(null)
let drag: { x: number, y: number, px: number, py: number } | null = null
const hub = (k: string) => layout.value.hubs.find(h => h.key === k)
const nodeOf = (k: string) => layout.value.nodes.find(n => n.key === k)
const pos = (k: string) => hub(k) ?? nodeOf(k)
const color = (s: PublicSkill) => s.color || 'var(--pf-accent)'
const byCategory = computed(() => { const m = new Map<string, PublicSkill[]>(); for (const s of props.skills.filter(s => s.allowedModes.includes('tree'))) { const k = s.category || 'Autres'; m.set(k, [...(m.get(k) ?? []), s]) } return [...m.entries()] })
const { ui } = useScene()

function edgePath(f: string, t: string, kind: string) {
  const a = pos(f), b = pos(t); if (!a || !b) return ''
  if (kind === 'category') return `M${a.x},${a.y} L${b.x},${b.y}`
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 - 40
  return `M${a.x},${a.y} Q${mx},${my} ${b.x},${b.y}`
}
const arc = (n: TreeNode) => { const p = n.skill.proficiency; if (p == null) return null; const r = 27, c = 2 * Math.PI * r; return { c, off: c * (1 - p / 100) } }
function setZoom(z: number) { zoom.value = Math.min(2.4, Math.max(0.6, z)) }
function reset() { zoom.value = 1; pan.x = 0; pan.y = 0 }
function down(e: PointerEvent) { if ((e.target as Element).closest('[data-node]')) return; drag = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }; (e.currentTarget as Element).setPointerCapture(e.pointerId) }
function move(e: PointerEvent) { if (!drag) return; pan.x = drag.px + (e.clientX - drag.x); pan.y = drag.py + (e.clientY - drag.y) }
function up() { drag = null }
function wheel(e: WheelEvent) { if (e.ctrlKey || e.metaKey) { e.preventDefault(); setZoom(zoom.value * (e.deltaY < 0 ? 1.1 : 0.9)) } }
function key(e: KeyboardEvent, n: TreeNode) {
  const dirs: Record<string, 'left' | 'right' | 'up' | 'down'> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); emit('open', n.skill) }
  else if (dirs[e.key]) { e.preventDefault(); const t = neighbour(layout.value.nodes, n, dirs[e.key]!); if (t) svg.value?.querySelector<SVGElement>(`[data-key="${t.key}"]`)?.focus() }
}
</script>

<template>
  <div class="holo relative h-[min(62dvh,34rem)] w-full overflow-hidden" data-hit>
    <div class="absolute right-3 top-3 z-10 flex gap-1">
      <button type="button" class="chip !min-h-9 !px-2" aria-label="Zoom avant" @click="setZoom(zoom * 1.2)"><ZoomIn :size="16" /></button>
      <button type="button" class="chip !min-h-9 !px-2" aria-label="Zoom arrière" @click="setZoom(zoom / 1.2)"><ZoomOut :size="16" /></button>
      <button type="button" class="chip !min-h-9 !px-2" aria-label="Recentrer" @click="reset"><Maximize2 :size="16" /></button>
      <button type="button" class="chip !min-h-9" :aria-pressed="showList" @click="showList = !showList"><List :size="16" /> Liste</button>
    </div>
    <div v-if="showList" class="h-full overflow-y-auto p-5 pt-14">
      <div v-for="[cat, items] in byCategory" :key="cat" class="mb-4"><h3 class="font-display text-lg font-semibold">{{ cat }}</h3>
        <ul class="mt-2 flex flex-wrap gap-2"><li v-for="s in items" :key="s.id"><button type="button" class="chip" @click="emit('open', s)">{{ s.name }}<span v-if="s.proficiency != null" class="opacity-70"> · {{ s.proficiency }} %</span></button></li></ul></div>
    </div>
    <svg v-else ref="svg" class="h-full w-full cursor-grab touch-none select-none active:cursor-grabbing" :viewBox="`0 0 ${layout.width} ${layout.height}`" role="group" aria-label="Arbre de compétences : utilisez les flèches pour passer d’un nœud à l’autre, Entrée pour ouvrir" @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="up" @wheel="wheel">
      <defs><filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
      <g :transform="`translate(${layout.width / 2 + pan.x} ${layout.height / 2 + pan.y}) scale(${zoom}) translate(${-layout.width / 2} ${-layout.height / 2})`">
        <path v-for="(e, i) in layout.edges" :key="i" :d="edgePath(e.from, e.to, e.kind)" fill="none" :stroke="e.kind === 'link' ? 'var(--pf-secondary)' : 'var(--pf-accent)'" :stroke-width="e.kind === 'link' ? 2 : 1.4" :stroke-opacity="e.kind === 'link' ? 0.85 : 0.4" :stroke-dasharray="e.kind === 'link' ? '6 5' : undefined" filter="url(#glow)" />
        <g v-for="h in layout.hubs" :key="h.key" :transform="`translate(${h.x} ${h.y})`" aria-hidden="true">
          <polygon points="0,-30 26,-15 26,15 0,30 -26,15 -26,-15" fill="rgb(var(--pf-bg-rgb))" stroke="var(--pf-glow)" stroke-width="2" filter="url(#glow)" />
          <text y="50" text-anchor="middle" fill="var(--pf-text)" font-size="14" font-weight="600" style="font-family: var(--font-display)">{{ h.name }}</text>
        </g>
        <g v-for="n in layout.nodes" :key="n.key" :data-key="n.key" data-node class="cursor-pointer outline-none" :transform="`translate(${n.x} ${n.y})`" role="button" tabindex="0" :aria-label="`${n.skill.name}${n.skill.category ? ', ' + n.skill.category : ''}${n.skill.proficiency != null ? ', niveau ' + n.skill.proficiency + ' %' : ''}`"
          @click="emit('open', n.skill)" @keydown="key($event, n)" @focus="ui.focusKey = n.key" @blur="ui.focusKey = null" @mouseenter="ui.focusKey = n.key" @mouseleave="ui.focusKey = null">
          <circle r="31" fill="transparent" />
          <circle r="22" :fill="`color-mix(in srgb, ${color(n.skill)} 22%, rgb(var(--pf-bg-rgb)))`" :stroke="color(n.skill)" stroke-width="2.2" filter="url(#glow)" class="node-ring" />
          <circle v-if="arc(n)" r="27" fill="none" :stroke="color(n.skill)" stroke-width="3" stroke-linecap="round" :stroke-dasharray="arc(n)!.c" :stroke-dashoffset="arc(n)!.off" transform="rotate(-90)" />
          <image v-if="n.skill.iconUrl" :href="n.skill.iconUrl" x="-12" y="-12" width="24" height="24" />
          <text v-else text-anchor="middle" y="5" fill="var(--pf-text)" font-size="13" font-weight="700" style="font-family: var(--font-display)">{{ initialsOf(n.skill.name) }}</text>
          <text y="44" text-anchor="middle" fill="var(--pf-text-muted)" font-size="12">{{ n.skill.name }}</text>
        </g>
      </g>
    </svg>
  </div>
</template>

<style scoped>
[data-node]:focus-visible .node-ring, [data-node]:hover .node-ring { stroke-width: 4; }
[data-node]:focus-visible { outline: none; }
</style>
