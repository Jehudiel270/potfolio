<script setup lang="ts">
import type { PublicContent, DetailItem } from '#shared/types'
import type { SectionPlan } from '#shared/sections'
import type { SpaceEngine } from '~/scene/core/engine'
import { lenisInstance } from '~/composables/useSectionNav'

const props = defineProps<{ content: PublicContent, plan: SectionPlan }>()
const emit = defineEmits<{ ready: [], fallback: [reason: string] }>()
const { engine, ui, status, crossed, hover } = useScene()
const theme = useTheme()
const detail = useDetail()
const sound = useSound()
const canvas = ref<HTMLCanvasElement | null>(null)
const reduced = ref(false)

let gsapRef: typeof import('gsap').gsap | null = null
let ST: typeof import('gsap/ScrollTrigger').ScrollTrigger | null = null
let trigger: { kill: () => void } | null = null
let lenis: import('lenis').default | null = null
let tickLenis: ((t: number) => void) | null = null
let ro: ResizeObserver | null = null
let debounce: ReturnType<typeof setTimeout> | undefined
let lastHoverSound = 0

const rootEl = () => document.getElementById('scroll-root')

function measure() {
  const root = rootEl(); if (!root) return null
  const rootTop = root.getBoundingClientRect().top + window.scrollY
  const sections = props.plan.sections.map((s) => {
    const el = document.getElementById(s.id)
    return el ? { id: s.id, top: el.getBoundingClientRect().top + window.scrollY - rootTop, height: el.offsetHeight } : null
  }).filter((s): s is NonNullable<typeof s> => !!s)
  return { sections, total: Math.max(1, root.offsetHeight - window.innerHeight) }
}

async function rebuildTimeline() {
  const eng = engine.value; if (!eng || !gsapRef || !ST) return
  const m = measure(); if (!m) return
  const { buildMasterTimeline } = await import('~/scene/core/timeline')
  trigger?.kill()
  const tl = buildMasterTimeline(gsapRef, eng, m.sections, m.total)
  eng.timeline = tl
  trigger = ST.create({
    trigger: rootEl()!, start: 'top top', end: 'bottom bottom', animation: tl, invalidateOnRefresh: true,
    scrub: reduced.value ? true : 0.7,
    onUpdate: self => { useScene().progress.value = self.progress },
  })
  ST.refresh()
}
function scheduleRebuild() { clearTimeout(debounce); debounce = setTimeout(rebuildTimeline, 160) }

function toDetail(p: { kind: DetailItem['type'], id: number }): DetailItem | null {
  const c = props.content
  const find = <T extends { id: number }>(l: T[]) => l.find(x => x.id === p.id)
  switch (p.kind) {
    case 'project': { const d = find(c.projects); return d ? { type: 'project', data: d } : null }
    case 'skill': { const d = find(c.skills); return d ? { type: 'skill', data: d } : null }
    case 'education': { const d = find(c.education); return d ? { type: 'education', data: d } : null }
    case 'experience': { const d = find(c.experiences); return d ? { type: 'experience', data: d } : null }
    case 'certification': { const d = find(c.certifications); return d ? { type: 'certification', data: d } : null }
    case 'achievement': { const d = find(c.achievements); return d ? { type: 'achievement', data: d } : null }
  }
}

onMounted(async () => {
  const cv = canvas.value; if (!cv) return
  reduced.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  status.value = 'loading'
  try {
    const probe = document.createElement('canvas')
    if (!probe.getContext('webgl2')) throw new Error('WebGL2 indisponible')
    const [{ SpaceEngine }, gsapMod, stMod] = await Promise.all([import('~/scene/core/engine'), import('gsap'), import('gsap/ScrollTrigger')])
    gsapRef = gsapMod.gsap; ST = stMod.ScrollTrigger; gsapRef.registerPlugin(ST)
    const eng: SpaceEngine = new SpaceEngine({
      canvas: cv, content: props.content, plan: props.plan, theme: theme.value, ui: ui.value, reducedMotion: reduced.value,
      onPick: (p) => { const d = toDetail(p); if (d) { sound.play('open'); detail.open(d, p.key) } },
      onHover: (p) => { hover.value = p ? { key: p.key, label: p.label, sub: p.sub } : null; const n = performance.now(); if (p && n - lastHoverSound > 140) { lastHoverSound = n; sound.play('hover', 0.15) } },
      onCrossed: (c) => { if (c !== crossed.value) { crossed.value = c; if (c) sound.play('portal') } },
      onQuality: (_q, step) => { if (step === -1) scheduleRebuild() },
      onLost: () => { status.value = 'fallback'; emit('fallback', 'Contexte WebGL perdu') },
    })
    engine.value = eng

    // Défilement : natif par défaut ; Lenis seulement si activé dans l'administration et si le visiteur ne demande pas de mouvement réduit.
    gsapRef.ticker.lagSmoothing(0)
    if (props.content.settings.visuals.smoothScroll && !reduced.value && matchMedia('(pointer: fine)').matches) {
      const Lenis = (await import('lenis')).default
      lenis = new Lenis({ lerp: 0.09, smoothWheel: true })
      lenis.on('scroll', ST.update)
      tickLenis = (t: number) => lenis?.raf(t * 1000)
      gsapRef.ticker.add(tickLenis)
      lenisInstance.value = lenis
    }
    gsapRef.ticker.add(eng.step)
    eng.start()

    await nextTick()
    await rebuildTimeline()
    ro = new ResizeObserver(scheduleRebuild)
    const root = rootEl(); if (root) ro.observe(root)
    window.addEventListener('resize', scheduleRebuild)
    void document.fonts?.ready.then(scheduleRebuild)
    // Hash d'ancre à l'ouverture (/#projects) : la timeline étant prête, on y va.
    if (location.hash) setTimeout(() => scrollToSection(location.hash.slice(1), { focus: false }), 350)
    status.value = 'ready'; emit('ready')
  } catch (e) {
    status.value = 'fallback'; emit('fallback', e instanceof Error ? e.message : 'Erreur 3D')
  }
})

watch(theme, t => engine.value?.setTheme(t), { deep: true })
watch(() => props.content.settings.visuals, v => engine.value?.setVisuals(v), { deep: true })
watch(() => [props.plan.sections.map(s => s.id).join(), props.content.generatedAt].join('|'), async () => {
  if (!engine.value) return
  engine.value.rebuild(props.content, props.plan)
  await nextTick(); await rebuildTimeline()
})

onBeforeUnmount(() => {
  clearTimeout(debounce); ro?.disconnect(); window.removeEventListener('resize', scheduleRebuild)
  trigger?.kill()
  if (gsapRef && engine.value) gsapRef.ticker.remove(engine.value.step)
  if (gsapRef && tickLenis) gsapRef.ticker.remove(tickLenis)
  lenis?.destroy(); lenisInstance.value = null
  ST?.getAll().forEach(t => t.kill())
  engine.value?.dispose(); engine.value = null
  status.value = 'idle'
})
</script>

<template>
  <div class="fixed inset-0 z-0" aria-hidden="true">
    <canvas ref="canvas" class="block h-full w-full" style="touch-action: pan-y" />
  </div>
</template>
