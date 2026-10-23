<script setup lang="ts">
definePageMeta({ layout: 'admin' })
const ed = useSettingsEditor(['identity', 'buttons', 'hero', 'links', 'finale', 'seo'])
const d = ed.draft
const kinds = ['github', 'linkedin', 'x', 'instagram', 'youtube', 'website', 'other']
const hasMarker = computed({
  get: () => !!d.value.hero?.globeMarker,
  set: (v: boolean) => { d.value.hero.globeMarker = v ? { lat: 0, lon: 0, label: '' } : null },
})
const addLink = () => d.value.links.push({ id: `l${Date.now().toString(36)}`, label: '', url: '', kind: 'website', visible: true })
const buttonLabels: [string, string][] = [['discover', 'Bouton d’accueil'], ['contact', 'Bouton contact'], ['backToStart', 'Retour au début'], ['skip', 'Lien « Passer au contenu »'], ['close', 'Fermer'], ['send', 'Envoyer'], ['demo', 'Démo'], ['source', 'Code source'], ['verify', 'Vérifier le certificat']]
</script>

<template>
  <div v-if="ed.loaded.value" class="max-w-4xl space-y-6">
    <div><h1 class="text-2xl font-semibold">Contenu général</h1><p class="text-sm text-[#8da0bf]">Les valeurs « (démo) » sont des exemples à remplacer : aucune information personnelle n’est inventée.</p></div>

    <section class="ad-card grid gap-4 p-4 sm:grid-cols-2">
      <h2 class="font-semibold sm:col-span-2">Identité et accueil</h2>
      <AdminInput v-model="d.identity.displayName" label="Nom affiché" :maxlength="80" />
      <AdminInput v-model="d.identity.title" label="Titre professionnel" :maxlength="120" />
      <div class="sm:col-span-2"><AdminInput v-model="d.identity.tagline" label="Slogan d’accueil" :maxlength="240" /></div>
      <div class="sm:col-span-2"><AdminInput v-model="d.identity.intro" label="Texte d’introduction" type="textarea" :maxlength="400" /></div>
      <div class="sm:col-span-2"><AdminInput v-model="d.identity.about" label="Texte « À propos »" type="textarea" :rows="8" hint="Séparez les paragraphes par une ligne vide. Vide = section masquée." /></div>
      <AdminInput v-model="d.identity.email" label="Adresse e-mail affichée publiquement" type="email" hint="Facultatif. Distincte du destinataire du formulaire (page Contact)." />
    </section>

    <section class="ad-card space-y-4 p-4">
      <h2 class="font-semibold">Globe d’accueil</h2>
      <AdminSwitch v-model="hasMarker" label="Afficher un repère lumineux sur la Terre" hint="Facultatif : un point et une légende à la position de votre choix." />
      <div v-if="d.hero.globeMarker" class="grid gap-4 sm:grid-cols-3">
        <AdminInput v-model="d.hero.globeMarker.lat" label="Latitude" type="number" :min="-90" :max="90" :step="0.01" />
        <AdminInput v-model="d.hero.globeMarker.lon" label="Longitude" type="number" :min="-180" :max="180" :step="0.01" />
        <AdminInput v-model="d.hero.globeMarker.label" label="Légende" :maxlength="60" />
      </div>
    </section>

    <section class="ad-card space-y-3 p-4">
      <div class="flex items-center justify-between"><h2 class="font-semibold">Réseaux sociaux et profils professionnels</h2><button class="ad-btn ad-btn-sm" type="button" :disabled="d.links.length >= 12" @click="addLink">Ajouter un lien</button></div>
      <p v-if="!d.links.length" class="text-sm text-[#8da0bf]">Aucun lien. Ils apparaîtront dans la scène finale et la page Contact.</p>
      <div v-for="(link, idx) in d.links" :key="link.id" class="grid items-end gap-2 sm:grid-cols-[8rem_1fr_2fr_auto_auto]">
        <div><label class="ad-label">Type</label><select v-model="link.kind" class="ad-input"><option v-for="k in kinds" :key="k" :value="k">{{ k }}</option></select></div>
        <div><AdminInput v-model="link.label" label="Libellé" /></div>
        <div><AdminInput v-model="link.url" label="URL" type="url" /></div>
        <AdminSwitch v-model="link.visible" label="Visible" />
        <button class="ad-btn ad-btn-sm ad-btn-danger" type="button" @click="d.links.splice(idx, 1)">Retirer</button>
      </div>
    </section>

    <section class="ad-card grid gap-4 p-4 sm:grid-cols-2">
      <h2 class="font-semibold sm:col-span-2">Scène finale</h2>
      <AdminInput v-model="d.finale.title" label="Titre d’invitation" :maxlength="120" /><AdminInput v-model="d.finale.text" label="Texte" :maxlength="400" />
    </section>

    <section class="ad-card grid gap-4 p-4 sm:grid-cols-3">
      <h2 class="font-semibold sm:col-span-3">Libellés des boutons</h2>
      <AdminInput v-for="[k, l] in buttonLabels" :key="k" v-model="(d.buttons as Record<string, string>)[k]" :label="l" :maxlength="60" />
    </section>

    <section class="ad-card grid gap-4 p-4 sm:grid-cols-2">
      <h2 class="font-semibold sm:col-span-2">Référencement</h2>
      <AdminInput v-model="d.seo.title" label="Titre de la page" :maxlength="70" /><AdminInput v-model="d.seo.description" label="Description" :maxlength="200" />
    </section>
    <AdminSaveBar :dirty="ed.dirty.value" :saving="ed.saving.value" @save="ed.save" @cancel="ed.cancel" />
  </div>
  <p v-else-if="ed.error.value" class="ad-err" role="alert">{{ ed.error.value }}</p>
  <p v-else class="text-sm text-[#8da0bf]">Chargement…</p>
</template>
