<script setup lang="ts">
import type { PublicContent } from '#shared/types'
import { buildPlan } from '#shared/sections'

const props = defineProps<{ content: PublicContent }>()
const route = useRoute()
const live = ref<PublicContent>(props.content)
watch(() => props.content, c => { live.value = c })
const plan = computed(() => buildPlan(live.value.settings, live.value, { preview: live.value.preview }))
const theme = useTheme()
const { status, lite, ui } = useScene()
const { content: shared } = usePortfolioLabels()
const s = computed(() => live.value.settings)

// Thème appliqué dès le rendu serveur (variables CSS) puis propagé à la 3D.
theme.value = props.content.settings.theme
shared.value = props.content
useThemeHead()
watch(live, (c) => { shared.value = c; theme.value = c.settings.theme })
ui.value.skillView = plan.value.defaultSkillView ?? 'station'
useSeoMeta({ title: () => s.value.seo.title, description: () => s.value.seo.description, ogTitle: () => s.value.seo.title, ogDescription: () => s.value.seo.description })

const ids = computed(() => plan.value.sections.map(x => x.id))
const active = useActiveSection(ids)
const mounted = ref(false)
const liteMode = computed(() => lite.value || status.value === 'fallback')
const sceneOn = computed(() => mounted.value && !lite.value && status.value !== 'fallback')
const nextAfterHome = computed(() => plan.value.nav.find(n => n.id !== 'home')?.id ?? 'contact')
const aboutNext = computed(() => plan.value.nav.find(n => !['home', 'about'].includes(n.id))?.id ?? 'contact')
const has = (id: string) => ids.value.includes(id as never)
const title = (id: string) => plan.value.sections.find(x => x.id === id)?.title ?? ''

function onMessage(e: MessageEvent) {
  if (e.origin !== location.origin || e.data?.type !== 'pf:theme-draft') return
  const d = e.data as { theme: typeof theme.value, visuals?: PublicContent['settings']['visuals'] }
  theme.value = d.theme
  if (d.visuals) live.value = { ...live.value, settings: { ...live.value.settings, visuals: d.visuals } }
}
onMounted(() => {
  try { lite.value = localStorage.getItem('pf-lite') === '1' } catch { /* stockage indisponible */ }
  if (route.query.themePreview === '1' && window.parent !== window) window.addEventListener('message', onMessage)
  mounted.value = true
})
watch(status, (v) => { if (v === 'fallback') lite.value = true })
onBeforeUnmount(() => window.removeEventListener('message', onMessage))
</script>

<template>
  <div class="relative" :class="{ 'pf-lite': liteMode }">
    <div v-if="liteMode" class="pf-backdrop" aria-hidden="true" />
    <SceneCanvas v-if="sceneOn" :content="live" :plan="plan" />
    <div v-if="sceneOn && status === 'loading'" class="fixed inset-0 z-50 grid place-items-center bg-void" role="status" aria-live="polite"><p class="animate-pulse font-display text-xl text-muted">Initialisation de l’espace…</p></div>
    <div v-if="live.preview" class="fixed bottom-3 left-3 z-50 rounded-lg border border-accent/50 bg-void/90 px-3 py-2 text-sm">Aperçu privé : brouillons et sections masquées inclus. <NuxtLink to="/admin" class="text-accent underline">Retour à l’administration</NuxtLink></div>

    <SiteNav :nav="plan.nav" :active="active" :content="live" />
    <main id="scroll-root" class="relative z-10" :class="{ 'opacity-0': sceneOn && status === 'loading' }">
      <SectionHome :settings="s" :next="nextAfterHome" />
      <SectionPortal />
      <SectionAbout v-if="has('about')" :settings="s" :title="title('about')" :next="aboutNext" />
      <SectionSkills v-if="has('skills')" :content="live" :plan="plan" />
      <SectionEducation v-if="has('education')" :content="live" />
      <SectionExperiences v-if="has('experiences')" :content="live" />
      <SectionCertifications v-if="has('certifications')" :content="live" />
      <SectionAchievements v-if="has('achievements')" :content="live" />
      <SectionProjects v-if="has('projects')" :content="live" />
      <SectionContact :settings="s" />
    </main>
    <SceneLabels v-if="sceneOn" :content="live" />
    <DetailPanel />
    <ContactWidget :settings="s" />
    <noscript><p class="fixed bottom-0 z-50 w-full bg-void p-3 text-center text-sm">Le contenu est lisible sans JavaScript ; l’expérience 3D et le formulaire nécessitent JavaScript.</p></noscript>
  </div>
</template>
