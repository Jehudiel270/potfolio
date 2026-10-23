<script setup lang="ts">
import { DEFAULT_THEME, THEME_FIELDS, hexColor, themeToCssVars, type Theme } from '#shared/theme'
import { contrastRatio } from '#shared/utils'
definePageMeta({ layout: 'admin' })
const ed = useSettingsEditor(['theme', 'visuals'])
const theme = computed(() => ed.draft.value.theme)
const previewOpen = ref(false), frame = ref<HTMLIFrameElement | null>(null)
const bad = (k: keyof Theme) => typeof theme.value?.[k] === 'string' && !hexColor.safeParse(theme.value[k]).success
const validTheme = computed<Theme>(() => {
  const t = { ...DEFAULT_THEME, ...(theme.value ?? {}) } as Record<string, unknown>
  for (const f of THEME_FIELDS) if (!hexColor.safeParse(t[f.key]).success) t[f.key] = DEFAULT_THEME[f.key]
  return t as unknown as Theme
})
const cssVars = computed(() => themeToCssVars(validTheme.value))
const contrast = computed(() => contrastRatio(validTheme.value.text, validTheme.value.background))
const anyBad = computed(() => THEME_FIELDS.some(f => bad(f.key)))
function send() { frame.value?.contentWindow?.postMessage({ type: 'pf:theme-draft', theme: validTheme.value, visuals: ed.draft.value.visuals }, location.origin) }
watch([validTheme, () => ed.draft.value.visuals], () => { if (previewOpen.value) send() }, { deep: true })
function togglePreview() { previewOpen.value = !previewOpen.value; if (previewOpen.value) setTimeout(send, 1500) }
function restore() { ed.draft.value.theme = { ...DEFAULT_THEME } }
async function save() { if (anyBad.value) return; await ed.save() }
const sliders = [
  { k: 'particleDensity', label: 'Densité des particules', min: 0.2, max: 1.5, step: 0.05 }, { k: 'bloomStrength', label: 'Intensité du bloom', min: 0, max: 2, step: 0.05 },
  { k: 'rotationSpeed', label: 'Vitesse de rotation des objets', min: 0, max: 2, step: 0.05 }, { k: 'globalLight', label: 'Intensité lumineuse globale', min: 0.4, max: 1.8, step: 0.05 },
] as const
const switches = [
  { k: 'bloom', label: 'Bloom (halo lumineux)' }, { k: 'warp', label: 'Distorsion de l’espace près du portail' }, { k: 'dither', label: 'Tramage (dithering) du portail' },
  { k: 'scanlines', label: 'Lignes de balayage holographique' }, { k: 'sound', label: 'Proposer les sons d’interface (désactivés par défaut chez le visiteur)' }, { k: 'smoothScroll', label: 'Défilement fluide (Lenis)' },
] as const
</script>

<template>
  <div v-if="ed.loaded.value" class="max-w-5xl">
    <h1 class="mb-1 text-2xl font-semibold">Apparence</h1>
    <p class="mb-5 text-sm text-[#8da0bf]">Les couleurs sont appliquées au HTML et à la scène 3D. Rien n’est publié tant que vous n’enregistrez pas.</p>

    <div class="ad-card sticky top-0 z-10 mb-6 flex flex-wrap items-center gap-2 p-3" aria-label="Palette actuelle">
      <span v-for="f in THEME_FIELDS" :key="f.key" class="flex items-center gap-1.5 text-xs text-[#8da0bf]"><span class="h-6 w-6 rounded-full border border-white/20" :style="{ background: validTheme[f.key] }" />{{ f.label }}</span>
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <section class="ad-card space-y-4 p-4">
        <h2 class="font-semibold">Couleurs</h2>
        <div v-for="f in THEME_FIELDS" :key="f.key">
          <label :for="`c-${f.key}`" class="ad-label">{{ f.label }}</label>
          <div class="flex items-center gap-2">
            <input type="color" class="h-10 w-12 cursor-pointer rounded border border-[#223049] bg-transparent p-1" :value="validTheme[f.key]" :aria-label="`Sélecteur ${f.label}`" @input="ed.draft.value.theme[f.key] = ($event.target as HTMLInputElement).value">
            <input :id="`c-${f.key}`" v-model="ed.draft.value.theme[f.key]" class="ad-input max-w-36 font-mono" maxlength="7" :aria-invalid="bad(f.key)">
            <span class="ad-hint !mt-0">{{ f.hint }}</span>
          </div>
          <p v-if="bad(f.key)" class="ad-err">Code hexadécimal attendu (ex. #22d3ee).</p>
        </div>
        <AdminInput v-model="ed.draft.value.theme.intensity" label="Intensité visuelle des effets" type="number" :min="0.3" :max="2" :step="0.1" hint="Entre 0,3 et 2." />
        <p v-if="contrast < 4.5" class="ad-err" role="alert">Attention : contraste texte/fond de {{ contrast.toFixed(1) }}:1 — la lisibilité sera insuffisante (minimum conseillé 4,5:1).</p>
        <button class="ad-btn" type="button" @click="restore">Restaurer la palette par défaut</button>
      </section>

      <section class="space-y-4">
        <div class="overflow-hidden rounded-xl border border-[#223049]" :style="cssVars">
          <div class="p-5" :style="{ background: `radial-gradient(ellipse at 20% 0%, rgb(var(--pf-secondary-rgb) / .35), transparent 60%), var(--pf-bg)`, color: 'var(--pf-text)' }">
            <p class="font-display text-3xl font-bold" :style="{ letterSpacing: '-.03em' }">Votre Nom</p>
            <p :style="{ color: 'var(--pf-text-muted)' }">Titre professionnel · aperçu en direct</p>
            <div class="mt-4 flex flex-wrap items-center gap-2">
              <span class="btn btn-primary">Découvrir</span><span class="btn btn-ghost">Contact</span><span class="chip" aria-pressed="true">Filtre</span><span class="chip">Filtre</span>
            </div>
            <div class="holo mt-4 p-4"><p class="font-semibold" :style="{ color: 'var(--pf-glow)' }">Panneau holographique</p><p class="text-sm" :style="{ color: 'var(--pf-text-muted)' }">Texte secondaire sur fond translucide.</p></div>
            <div class="mt-4 h-10 rounded-lg" :style="{ background: `linear-gradient(90deg, ${validTheme.portalB}, ${validTheme.portalA})` }" title="Dégradé du portail" />
          </div>
        </div>
        <button class="ad-btn" type="button" @click="togglePreview">{{ previewOpen ? 'Fermer' : 'Ouvrir' }} l’aperçu 3D du site</button>
        <iframe v-if="previewOpen" ref="frame" title="Aperçu 3D du site" src="/?themePreview=1" class="h-[28rem] w-full rounded-xl border border-[#223049]" @load="send" />
      </section>
    </div>

    <section class="ad-card mt-6 space-y-4 p-4">
      <h2 class="font-semibold">Réglages visuels avancés</h2>
      <div class="grid gap-4 sm:grid-cols-2">
        <div v-for="s in sliders" :key="s.k">
          <label :for="`s-${s.k}`" class="ad-label">{{ s.label }} : {{ ed.draft.value.visuals[s.k] }}</label>
          <input :id="`s-${s.k}`" v-model.number="ed.draft.value.visuals[s.k]" type="range" class="w-full accent-sky-400" :min="s.min" :max="s.max" :step="s.step">
        </div>
      </div>
      <div class="grid gap-3 sm:grid-cols-2"><AdminSwitch v-for="s in switches" :key="s.k" v-model="ed.draft.value.visuals[s.k]" :label="s.label" /></div>
      <p class="ad-hint">Valeurs bornées côté serveur. Aucun code ni shader personnalisé n’est accepté : seuls ces paramètres sont modifiables.</p>
    </section>
    <AdminSaveBar :dirty="ed.dirty.value" :saving="ed.saving.value" @save="save" @cancel="ed.cancel" />
  </div>
  <p v-else-if="ed.error.value" class="ad-err" role="alert">{{ ed.error.value }}</p>
  <p v-else class="text-sm text-[#8da0bf]">Chargement…</p>
</template>
