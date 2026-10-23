<script setup lang="ts">
import { SKILL_VIEWS, SKILL_VIEW_LABELS, type SkillView } from '#shared/presets'
definePageMeta({ layout: 'admin' })
const ed = useSettingsEditor(['skillViews', 'sections', 'navigation'])
const d = ed.draft
const sectionKeys = [['skills', 'Compétences'], ['education', 'Parcours'], ['experiences', 'Expériences'], ['certifications', 'Certifications'], ['achievements', 'Autres réalisations'], ['projects', 'Projets']] as const
const enabledViews = computed(() => SKILL_VIEWS.filter(v => d.value.skillViews.enabled[v]))
function moveView(v: SkillView, dir: -1 | 1) { const o = [...d.value.skillViews.order], i = o.indexOf(v), j = i + dir; if (j >= 0 && j < o.length) { [o[i], o[j]] = [o[j]!, o[i]!]; d.value.skillViews.order = o } }
function moveNav(i: number, dir: -1 | 1) {
  const items = d.value.navigation.items, j = i + dir
  if (j < 0 || j >= items.length) return
  ;[items[i], items[j]] = [items[j]!, items[i]!]; items.forEach((it, n) => { it.order = n })
}
watch(enabledViews, (v) => { if (v.length && !v.includes(d.value.skillViews.defaultView)) d.value.skillViews.defaultView = v[0]! })
</script>

<template>
  <div v-if="ed.loaded.value" class="max-w-4xl space-y-6">
    <div><h1 class="text-2xl font-semibold">Vues, sections et menu</h1><p class="text-sm text-[#8da0bf]">Une section désactivée disparaît du menu, du parcours en 3D et de la timeline de défilement.</p></div>

    <section class="ad-card space-y-4 p-4">
      <h2 class="font-semibold">Visualisation des compétences</h2>
      <div class="grid gap-3 sm:grid-cols-3"><AdminSwitch v-for="v in SKILL_VIEWS" :key="v" v-model="d.skillViews.enabled[v]" :label="SKILL_VIEW_LABELS[v]" /></div>
      <p v-if="!enabledViews.length" class="ad-err" role="alert">Aucune vue active : la section Compétences sera masquée.</p>
      <div class="grid gap-4 sm:grid-cols-2">
        <div><label for="dv" class="ad-label">Vue affichée par défaut</label><select id="dv" v-model="d.skillViews.defaultView" class="ad-input"><option v-for="v in enabledViews" :key="v" :value="v">{{ SKILL_VIEW_LABELS[v] }}</option></select></div>
        <AdminInput v-model="d.skillViews.switcherLabel" label="Texte du bouton de changement de vue" :maxlength="40" />
      </div>
      <AdminSwitch v-model="d.skillViews.showSwitcher" label="Afficher le sélecteur de vue" hint="Masqué automatiquement s’il ne reste qu’une seule vue active." />
      <div><p class="ad-label">Ordre et libellés des vues</p>
        <div v-for="v in d.skillViews.order" :key="v" class="mb-2 flex items-center gap-2">
          <button class="ad-btn ad-btn-sm" type="button" :aria-label="`Monter ${SKILL_VIEW_LABELS[v]}`" @click="moveView(v, -1)">↑</button>
          <button class="ad-btn ad-btn-sm" type="button" :aria-label="`Descendre ${SKILL_VIEW_LABELS[v]}`" @click="moveView(v, 1)">↓</button>
          <input v-model="d.skillViews.labels[v]" class="ad-input max-w-xs" :aria-label="`Libellé ${SKILL_VIEW_LABELS[v]}`">
          <span v-if="!d.skillViews.enabled[v]" class="ad-badge">désactivée</span>
        </div>
      </div>
    </section>

    <section class="ad-card space-y-4 p-4">
      <h2 class="font-semibold">Sections</h2>
      <div v-for="[k, l] in sectionKeys" :key="k" class="grid items-end gap-3 border-b border-[#172236] pb-4 last:border-0 sm:grid-cols-2">
        <AdminSwitch v-model="d.sections[k].enabled" :label="l" /><AdminSwitch v-model="d.sections[k].showWhenEmpty" label="Afficher un état neutre si vide" />
        <AdminInput v-model="d.sections[k].title" label="Titre" :maxlength="80" /><AdminInput v-model="d.sections[k].emptyLabel" label="Message si vide" :maxlength="200" />
        <div class="sm:col-span-2"><AdminInput v-model="d.sections[k].intro" label="Introduction" :maxlength="400" /></div>
      </div>
    </section>

    <section class="ad-card space-y-3 p-4">
      <h2 class="font-semibold">Menu principal</h2>
      <div class="grid gap-3 sm:grid-cols-2"><AdminSwitch v-model="d.navigation.showProgress" label="Barre de progression du voyage" /><AdminSwitch v-model="d.navigation.showSkipLink" label="Lien « Passer au contenu »" /></div>
      <div v-for="(it, i) in d.navigation.items" :key="it.id" class="flex flex-wrap items-center gap-2">
        <button class="ad-btn ad-btn-sm" type="button" :aria-label="`Monter ${it.label}`" @click="moveNav(i, -1)">↑</button>
        <button class="ad-btn ad-btn-sm" type="button" :aria-label="`Descendre ${it.label}`" @click="moveNav(i, 1)">↓</button>
        <input v-model="it.label" class="ad-input max-w-56" :aria-label="`Libellé du lien ${it.id}`" maxlength="40">
        <AdminSwitch v-model="it.visible" label="Visible" />
        <span class="text-xs text-[#8da0bf]">({{ it.id }})</span>
      </div>
      <p class="ad-hint">Une entrée dont la section est masquée ou vide n’apparaît jamais dans le menu public.</p>
    </section>
    <p class="text-sm text-[#8da0bf]">La page Contact, les canaux et le widget flottant se règlent dans <NuxtLink to="/admin/contact" class="text-sky-300 underline">Contact et e-mail</NuxtLink>.</p>
    <AdminSaveBar :dirty="ed.dirty.value" :saving="ed.saving.value" @save="ed.save" @cancel="ed.cancel" />
  </div>
  <p v-else-if="ed.error.value" class="ad-err" role="alert">{{ ed.error.value }}</p>
  <p v-else class="text-sm text-[#8da0bf]">Chargement…</p>
</template>
