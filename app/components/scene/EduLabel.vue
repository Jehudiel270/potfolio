<script setup lang="ts">
import type { EducationChapter } from '~/scene/chapters/timeline-chapters'
const props = defineProps<{ index: number, year: number | null, title: string }>()
const { engine } = useScene()
const el = ref<HTMLElement | null>(null)
useSceneAnchor(el, () => { const ch = engine.value?.byId.get('education') as EducationChapter | undefined; const n = ch?.nodes[props.index]; return ch && n ? ch.group.localToWorld(n.clone().add({ x: 0, y: -0.9, z: 0 } as never)) : null }, 'education')
</script>

<template>
  <div ref="el" class="absolute left-0 top-0 invisible will-change-transform"><div class="-translate-x-1/2 text-center text-xs leading-tight text-muted"><span class="block font-display text-sm text-ink">{{ year ?? '' }}</span><span class="block max-w-[9rem] truncate">{{ title }}</span></div></div>
</template>
