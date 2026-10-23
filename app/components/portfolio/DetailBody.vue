<script setup lang="ts">
import { Calendar, ExternalLink, Github, MapPin, ShieldCheck } from 'lucide-vue-next'
import type { DetailItem } from '#shared/types'
import { cldSrcset, cldUrl } from '#shared/media'
import { EXPERIENCE_KIND_LABELS } from '#shared/presets'
import { formatDateRange, formatMonth } from '#shared/utils'

defineProps<{ item: DetailItem, preview?: boolean }>()
const { content } = usePortfolioLabels()
const arr = <T,>(v: T[] | undefined | null) => (Array.isArray(v) ? v : [])
</script>

<template>
  <article class="holo holo-lines max-h-[85dvh] overflow-y-auto p-6 text-ink sm:p-8" :aria-label="'Détail'">
    <!-- Projet -->
    <template v-if="item.type === 'project'">
      <img v-if="item.data.coverImageUrl" :src="cldUrl(item.data.coverImageUrl, { w: 960, h: 540, fit: 'fill' })" :srcset="cldSrcset(item.data.coverImageUrl, [480, 800, 1200])" sizes="(min-width: 768px) 720px, 100vw" :alt="`Image du projet ${item.data.title}`" class="mb-5 aspect-video w-full rounded-lg object-cover" loading="lazy">
      <p v-if="item.data.category" class="mb-1 text-sm text-accent">{{ item.data.category }}</p>
      <h2 class="title-lg !text-3xl">{{ item.data.title || 'Sans titre' }}</h2>
      <p v-if="item.data.shortDescription" class="mt-2 text-lg text-muted">{{ item.data.shortDescription }}</p>
      <div v-if="item.data.description" class="prose-pf mt-5"><p v-for="(p, i) in item.data.description.split(/\n{2,}/)" :key="i">{{ p }}</p></div>
      <section v-if="item.data.problem" class="mt-6"><h3 class="font-display text-lg font-semibold">Problématique</h3><p class="prose-pf mt-1">{{ item.data.problem }}</p></section>
      <section v-if="arr(item.data.features).length" class="mt-6"><h3 class="font-display text-lg font-semibold">Fonctionnalités principales</h3>
        <ul class="mt-2 list-disc space-y-1 pl-5 text-muted"><li v-for="f in item.data.features" :key="f">{{ f }}</li></ul></section>
      <ul v-if="arr(item.data.technologies).length" class="mt-6 flex flex-wrap gap-2" aria-label="Technologies"><li v-for="t in item.data.technologies" :key="t" class="chip !cursor-default">{{ t }}</li></ul>
      <div v-if="arr(item.data.gallery).length" class="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3"><img v-for="g in item.data.gallery" :key="g.publicId" :src="cldUrl(g.url, { w: 480, h: 320, fit: 'fill' })" :alt="g.alt || ''" class="aspect-[3/2] rounded object-cover" loading="lazy"></div>
      <div class="mt-7 flex flex-wrap gap-3">
        <a v-if="item.data.liveUrl" :href="item.data.liveUrl" target="_blank" rel="noopener noreferrer" class="btn btn-primary"><ExternalLink :size="18" /> {{ content?.settings.buttons.demo }}</a>
        <a v-if="item.data.repositoryUrl" :href="item.data.repositoryUrl" target="_blank" rel="noopener noreferrer" class="btn btn-ghost"><Github :size="18" /> {{ content?.settings.buttons.source }}</a>
      </div>
    </template>

    <!-- Compétence -->
    <template v-else-if="item.type === 'skill'">
      <div class="flex items-center gap-4">
        <img v-if="item.data.iconUrl" :src="cldUrl(item.data.iconUrl, { w: 120, h: 120, fit: 'pad' })" :alt="`Logo ${item.data.name}`" class="h-14 w-14 rounded-lg object-contain">
        <span v-else class="grid h-14 w-14 place-items-center rounded-lg font-display text-xl font-bold text-void" :style="{ background: item.data.color || 'var(--pf-accent)' }" aria-hidden="true">{{ (item.data.name || '?').slice(0, 2).toUpperCase() }}</span>
        <div><h2 class="title-lg !text-3xl">{{ item.data.name || 'Sans nom' }}</h2><p v-if="item.data.category" class="text-accent">{{ item.data.category }}</p></div>
      </div>
      <p v-if="item.data.description" class="prose-pf mt-5">{{ item.data.description }}</p>
      <div v-if="item.data.proficiency != null" class="mt-5"><div class="mb-1 flex justify-between text-sm text-muted"><span>Niveau</span><span>{{ item.data.proficiency }} %</span></div>
        <div class="h-2 overflow-hidden rounded-full bg-white/10" role="meter" :aria-valuenow="item.data.proficiency" aria-valuemin="0" aria-valuemax="100" aria-label="Niveau de maîtrise"><div class="h-full rounded-full" :style="{ width: item.data.proficiency + '%', background: 'var(--pf-gradient)' }" /></div></div>
    </template>

    <!-- Formation -->
    <template v-else-if="item.type === 'education'">
      <img v-if="item.data.imageUrl" :src="cldUrl(item.data.imageUrl, { w: 160, h: 160, fit: 'pad' })" :alt="`Logo ${item.data.institution}`" class="mb-4 h-16 w-16 rounded object-contain">
      <p class="flex items-center gap-2 text-sm text-accent"><Calendar :size="16" /> {{ formatDateRange(item.data.startDate, item.data.endDate, item.data.isCurrent) }}</p>
      <h2 class="title-lg mt-1 !text-3xl">{{ item.data.title || 'Sans titre' }}</h2>
      <p class="mt-1 text-lg text-muted">{{ [item.data.institution, item.data.degree].filter(Boolean).join(' · ') }}</p>
      <p v-if="item.data.field" class="mt-1 text-muted">Domaine : {{ item.data.field }}</p>
      <p v-if="item.data.description" class="prose-pf mt-5">{{ item.data.description }}</p>
      <section v-if="arr(item.data.achievements).length" class="mt-5"><h3 class="font-display text-lg font-semibold">Réalisations associées</h3><ul class="mt-2 list-disc space-y-1 pl-5 text-muted"><li v-for="a in item.data.achievements" :key="a">{{ a }}</li></ul></section>
      <a v-if="item.data.url" :href="item.data.url" target="_blank" rel="noopener noreferrer" class="btn btn-ghost mt-6"><ExternalLink :size="18" /> Site officiel</a>
    </template>

    <!-- Expérience -->
    <template v-else-if="item.type === 'experience'">
      <img v-if="item.data.imageUrl" :src="cldUrl(item.data.imageUrl, { w: 160, h: 160, fit: 'pad' })" :alt="`Logo ${item.data.organization}`" class="mb-4 h-16 w-16 rounded object-contain">
      <p class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-accent"><span class="flex items-center gap-1.5"><Calendar :size="16" /> {{ formatDateRange(item.data.startDate, item.data.endDate, item.data.isCurrent, 'en cours') }}</span><span>{{ EXPERIENCE_KIND_LABELS[item.data.kind as keyof typeof EXPERIENCE_KIND_LABELS] ?? '' }}</span><span v-if="item.data.location" class="flex items-center gap-1.5"><MapPin :size="16" /> {{ item.data.location }}</span></p>
      <h2 class="title-lg mt-1 !text-3xl">{{ item.data.role || 'Sans titre' }}</h2>
      <p class="mt-1 text-lg text-muted">{{ item.data.organization }}</p>
      <p v-if="item.data.description" class="prose-pf mt-5">{{ item.data.description }}</p>
      <section v-if="arr(item.data.missions).length" class="mt-5"><h3 class="font-display text-lg font-semibold">Missions</h3><ul class="mt-2 list-disc space-y-1 pl-5 text-muted"><li v-for="m in item.data.missions" :key="m">{{ m }}</li></ul></section>
      <section v-if="arr(item.data.results).length" class="mt-5"><h3 class="font-display text-lg font-semibold">Résultats</h3><ul class="mt-2 list-disc space-y-1 pl-5 text-muted"><li v-for="m in item.data.results" :key="m">{{ m }}</li></ul></section>
      <ul v-if="arr(item.data.technologies).length" class="mt-5 flex flex-wrap gap-2" aria-label="Technologies et outils"><li v-for="t in item.data.technologies" :key="t" class="chip !cursor-default">{{ t }}</li></ul>
      <a v-if="item.data.url" :href="item.data.url" target="_blank" rel="noopener noreferrer" class="btn btn-ghost mt-6"><ExternalLink :size="18" /> En savoir plus</a>
    </template>

    <!-- Certification -->
    <template v-else-if="item.type === 'certification'">
      <img v-if="item.data.imageUrl" :src="cldUrl(item.data.imageUrl, { w: 900, h: 640, fit: 'limit' })" :alt="`Certificat ${item.data.name}`" class="mb-5 max-h-72 w-full rounded-lg object-contain" loading="lazy">
      <p v-if="item.data.category" class="text-sm text-accent">{{ item.data.category }}</p>
      <h2 class="title-lg !text-3xl">{{ item.data.name || 'Sans nom' }}</h2>
      <p v-if="item.data.issuer" class="mt-1 text-lg text-muted">{{ item.data.issuer }}</p>
      <dl class="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div v-if="item.data.issuedAt"><dt class="text-muted">Obtenu</dt><dd>{{ formatMonth(item.data.issuedAt) }}</dd></div>
        <div v-if="item.data.expiresAt"><dt class="text-muted">Expire</dt><dd>{{ formatMonth(item.data.expiresAt) }}</dd></div>
        <div v-if="item.data.credentialId" class="col-span-2"><dt class="text-muted">Identifiant</dt><dd class="break-all">{{ item.data.credentialId }}</dd></div>
      </dl>
      <a v-if="item.data.verificationUrl" :href="item.data.verificationUrl" target="_blank" rel="noopener noreferrer" class="btn btn-primary mt-6"><ShieldCheck :size="18" /> {{ content?.settings.buttons.verify ?? 'Vérifier le certificat' }}</a>
    </template>

    <!-- Réalisation -->
    <template v-else>
      <img v-if="item.data.imageUrl" :src="cldUrl(item.data.imageUrl, { w: 900, h: 520, fit: 'limit' })" :alt="`Illustration ${item.data.title}`" class="mb-5 max-h-64 w-full rounded-lg object-cover" loading="lazy">
      <p class="text-sm text-accent">{{ [item.data.category, formatMonth(item.data.date)].filter(Boolean).join(' · ') }}</p>
      <h2 class="title-lg !text-3xl">{{ item.data.title || 'Sans titre' }}</h2>
      <p v-if="item.data.description" class="prose-pf mt-4">{{ item.data.description }}</p>
      <a v-if="item.data.linkUrl" :href="item.data.linkUrl" target="_blank" rel="noopener noreferrer" class="btn btn-ghost mt-6"><ExternalLink :size="18" /> Voir le lien</a>
    </template>
    <p v-if="preview" class="mt-6 text-xs text-muted">Aperçu : tel que le verront les visiteurs une fois publié.</p>
  </article>
</template>
