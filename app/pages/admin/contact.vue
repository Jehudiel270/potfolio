<script setup lang="ts">
import { normalizeWhatsAppNumber } from '#shared/contact'
import { toApiError } from '~/utils/api'
definePageMeta({ layout: 'admin' })
const ed = useSettingsEditor(['contact', 'widget'])
const { api } = useAdminApi()
const toast = useToast()
const d = ed.draft
const mail = ref<{ configured: boolean, host: string | null, port: number | null, secure: boolean | null, from: string | null, hasAuth: boolean } | null>(null)
const testing = ref(false)
onMounted(async () => { try { mail.value = await api('/api/admin/mail/status') } catch { /* affiché plus bas */ } })
async function test() {
  testing.value = true
  try { const r = await api<{ to: string }>('/api/admin/mail/test', { method: 'POST' }); toast.ok(`E-mail de test envoyé à ${r.to}.`) } catch (e) { toast.error(toApiError(e).message) } finally { testing.value = false }
}
const waOk = computed(() => !d.value.contact.whatsappNumber || normalizeWhatsAppNumber(d.value.contact.whatsappNumber) !== null)
const modes = [['email', 'E-mail (envoi côté serveur)'], ['whatsapp', 'WhatsApp (le visiteur confirme l’envoi dans WhatsApp)'], ['both', 'Les deux (e-mail, puis bouton WhatsApp explicite)'], ['none', 'Aucun formulaire (liens de contact uniquement)']]
async function purge() { try { const r = await api<{ deleted: number }>('/api/admin/messages/purge', { method: 'POST' }); toast.ok(`${r.deleted} message(s) supprimé(s).`) } catch (e) { toast.error(toApiError(e).message) } }
async function save() { if (!waOk.value) return toast.error('Numéro WhatsApp invalide.'); await ed.save() }
</script>

<template>
  <div v-if="ed.loaded.value" class="max-w-4xl space-y-6">
    <div><h1 class="text-2xl font-semibold">Contact et e-mail</h1><p class="text-sm text-[#8da0bf]">La page /contact et la scène finale partagent ces réglages.</p></div>

    <section class="ad-card space-y-4 p-4">
      <h2 class="font-semibold">Page et formulaire</h2>
      <AdminSwitch v-model="d.contact.pageEnabled" label="Activer la page dédiée /contact" />
      <div class="grid gap-4 sm:grid-cols-2"><AdminInput v-model="d.contact.title" label="Titre" :maxlength="100" /><AdminInput v-model="d.contact.intro" label="Texte d’introduction" :maxlength="400" /></div>
      <div><label for="mode" class="ad-label">Canal du formulaire</label>
        <select id="mode" v-model="d.contact.mode" class="ad-input"><option v-for="[v, l] in modes" :key="v" :value="v">{{ l }}</option></select></div>
      <div v-if="d.contact.mode !== 'none'" class="overflow-x-auto"><table>
        <thead><tr><th>Champ</th><th>Actif</th><th>Obligatoire</th><th>Libellé</th><th>Texte d’aide</th></tr></thead>
        <tbody><tr v-for="f in d.contact.fields" :key="f.key">
          <td class="font-semibold">{{ f.key }}</td>
          <td><input v-model="f.enabled" type="checkbox" class="accent-sky-400" :disabled="f.key !== 'subject'" :aria-label="`Activer ${f.key}`"></td>
          <td><input v-model="f.required" type="checkbox" class="accent-sky-400" :disabled="!f.enabled || f.key === 'message'" :aria-label="`${f.key} obligatoire`"></td>
          <td><input v-model="f.label" class="ad-input" :aria-label="`Libellé ${f.key}`" maxlength="60"></td>
          <td><input v-model="f.placeholder" class="ad-input" :aria-label="`Placeholder ${f.key}`" maxlength="120"></td>
        </tr></tbody></table></div>
      <div class="grid gap-4 sm:grid-cols-2"><AdminInput v-model="d.contact.successMessage" label="Message de confirmation" :maxlength="200" /><AdminInput v-model="d.contact.errorMessage" label="Message d’erreur" :maxlength="200" /></div>
      <div><label for="after" class="ad-label">Comportement après envoi</label>
        <select id="after" v-model="d.contact.afterSubmit" class="ad-input"><option value="message">Afficher le message de confirmation</option><option value="whatsapp_prompt">Proposer « Envoyer aussi sur WhatsApp »</option><option value="home">Revenir à l’accueil</option></select></div>
    </section>

    <section class="ad-card space-y-4 p-4">
      <h2 class="font-semibold">E-mail</h2>
      <div class="grid gap-4 sm:grid-cols-2">
        <AdminInput v-model="d.contact.recipientEmail" label="Adresse destinataire" type="email" hint="Où arrivent les messages du formulaire." />
        <AdminInput v-model="d.contact.emailSubjectTemplate" label="Sujet de l’e-mail" :maxlength="150" hint="Variables : {name} {email} {message} {subject}" />
        <div class="sm:col-span-2"><AdminInput v-model="d.contact.emailBodyTemplate" label="Modèle du corps" type="textarea" :rows="5" hint="Texte brut. Seules les variables {name} {email} {message} {subject} sont remplacées ; rien n’est exécuté." /></div>
      </div>
      <div class="rounded-lg border border-[#223049] p-3 text-sm">
        <p v-if="!mail" class="text-[#8da0bf]">Vérification de la configuration…</p>
        <template v-else-if="mail.configured">
          <p><span class="ad-badge ad-badge-ok">SMTP configuré</span> {{ mail.host }}:{{ mail.port }} · {{ mail.secure ? 'TLS implicite' : 'STARTTLS' }} · expéditeur {{ mail.from }}</p>
          <button class="ad-btn mt-3" type="button" :disabled="testing" @click="test">{{ testing ? 'Envoi…' : 'Envoyer un e-mail de test' }}</button>
        </template>
        <p v-else><span class="ad-badge ad-badge-warn">SMTP non configuré</span> Renseignez SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD et SMTP_FROM dans l’environnement du serveur (jamais ici). Tant que ce n’est pas fait, le formulaire répond par une erreur claire.</p>
      </div>
    </section>

    <section class="ad-card space-y-4 p-4">
      <h2 class="font-semibold">WhatsApp</h2>
      <div class="grid gap-4 sm:grid-cols-2">
        <AdminInput v-model="d.contact.whatsappNumber" label="Numéro au format international" type="tel" placeholder="+229 01 23 45 67 89" :hint="waOk ? 'Utilisé pour construire un lien wa.me.' : ''" />
        <AdminInput v-model="d.contact.whatsappText" label="Texte prérempli" :maxlength="600" hint="Variables : {name} {email} {message}" />
      </div>
      <p v-if="!waOk" class="ad-err" role="alert">Numéro invalide : 8 à 15 chiffres, indicatif pays inclus.</p>
      <p class="ad-hint">WhatsApp s’ouvre avec le texte prérempli ; le visiteur doit lui-même confirmer l’envoi. Le site ne prétend jamais qu’un message est parti automatiquement.</p>
    </section>

    <section class="ad-card space-y-4 p-4">
      <h2 class="font-semibold">Messages reçus</h2>
      <AdminSwitch v-model="d.contact.storeMessages" label="Enregistrer les messages dans l’administration" hint="Données conservées : nom, e-mail, sujet, message, empreinte anonymisée de l’IP, date." />
      <div class="flex flex-wrap items-end gap-3"><div class="w-48"><AdminInput v-model="d.contact.retentionDays" label="Conservation (jours)" type="number" :min="7" :max="1095" /></div>
        <button class="ad-btn" type="button" @click="purge">Purger les messages plus anciens</button></div>
    </section>

    <section class="ad-card space-y-4 p-4">
      <h2 class="font-semibold">Widget flottant « Contact rapide »</h2>
      <AdminSwitch v-model="d.widget.enabled" label="Afficher le widget" hint="Mini-panneau d’accueil : ce n’est pas un chat en temps réel et aucune IA ne répond." />
      <div class="grid gap-4 sm:grid-cols-2">
        <AdminInput v-model="d.widget.label" label="Libellé" :maxlength="40" />
        <div><label for="pos" class="ad-label">Position</label><select id="pos" v-model="d.widget.position" class="ad-input"><option value="bottom-right">En bas à droite</option><option value="bottom-left">En bas à gauche</option></select></div>
        <div class="sm:col-span-2"><AdminInput v-model="d.widget.welcomeMessage" label="Message d’accueil" type="textarea" :maxlength="300" /></div>
      </div>
      <div class="grid gap-3 sm:grid-cols-3"><AdminSwitch v-model="d.widget.channels.form" label="Proposer le formulaire" /><AdminSwitch v-model="d.widget.channels.email" label="Proposer l’e-mail" /><AdminSwitch v-model="d.widget.channels.whatsapp" label="Proposer WhatsApp" /></div>
    </section>
    <AdminSaveBar :dirty="ed.dirty.value" :saving="ed.saving.value" @save="save" @cancel="ed.cancel" />
  </div>
  <p v-else-if="ed.error.value" class="ad-err" role="alert">{{ ed.error.value }}</p>
  <p v-else class="text-sm text-[#8da0bf]">Chargement…</p>
</template>
