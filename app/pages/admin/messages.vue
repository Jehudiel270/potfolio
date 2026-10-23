<script setup lang="ts">
import { toApiError } from '~/utils/api'
definePageMeta({ layout: 'admin' })
interface Msg { id: number, name: string, email: string, subject: string | null, message: string, channel: string, status: 'new' | 'read' | 'handled', emailDelivery: string, createdAt: string }
const { api } = useAdminApi()
const toast = useToast()
const items = ref<Msg[]>([]), status = ref(''), loading = ref(true), openId = ref<number | null>(null), del = ref<Msg | null>(null)
async function load() { loading.value = true; try { items.value = (await api<{ items: Msg[] }>('/api/admin/messages', { query: status.value ? { status: status.value } : {} })).items } catch (e) { toast.error(toApiError(e).message) } finally { loading.value = false } }
onMounted(load); watch(status, load)
async function setStatus(m: Msg, s: Msg['status']) { try { Object.assign(m, await api<Msg>(`/api/admin/messages/${m.id}`, { method: 'PATCH', body: { status: s } })) } catch (e) { toast.error(toApiError(e).message) } }
function toggle(m: Msg) { openId.value = openId.value === m.id ? null : m.id; if (openId.value === m.id && m.status === 'new') void setStatus(m, 'read') }
async function remove() { if (!del.value) return; try { await api(`/api/admin/messages/${del.value.id}`, { method: 'DELETE' }); del.value = null; await load(); toast.ok('Message supprimé.') } catch (e) { toast.error(toApiError(e).message) } }
const fmt = (s: string) => new Date(s).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
const label = { new: 'Nouveau', read: 'Lu', handled: 'Traité' }
</script>

<template>
  <div class="max-w-4xl">
    <h1 class="mb-4 text-2xl font-semibold">Messages reçus</h1>
    <select v-model="status" class="ad-input mb-4 max-w-48" aria-label="Filtrer par statut"><option value="">Tous</option><option value="new">Nouveaux</option><option value="read">Lus</option><option value="handled">Traités</option></select>
    <p v-if="loading" class="text-sm text-[#8da0bf]">Chargement…</p>
    <p v-else-if="!items.length" class="ad-card p-8 text-center text-sm text-[#8da0bf]">Aucun message.</p>
    <ul v-else class="space-y-2">
      <li v-for="m in items" :key="m.id" class="ad-card">
        <button type="button" class="flex w-full items-center justify-between gap-3 p-3 text-left" :aria-expanded="openId === m.id" @click="toggle(m)">
          <span><strong :class="{ 'text-sky-300': m.status === 'new' }">{{ m.name }}</strong> <span class="text-sm text-[#8da0bf]">{{ m.email }}</span><span class="block truncate text-sm text-[#8da0bf]">{{ m.subject || m.message }}</span></span>
          <span class="shrink-0 text-right text-xs text-[#8da0bf]"><span class="ad-badge" :class="m.status === 'new' ? 'ad-badge-info' : m.status === 'handled' ? 'ad-badge-ok' : ''">{{ label[m.status] }}</span><br>{{ fmt(m.createdAt) }}</span>
        </button>
        <div v-if="openId === m.id" class="border-t border-[#223049] p-3">
          <p class="whitespace-pre-wrap text-sm">{{ m.message }}</p>
          <p class="mt-3 text-xs text-[#8da0bf]">Canal : {{ m.channel }} · E-mail : {{ m.emailDelivery === 'sent' ? 'envoyé' : m.emailDelivery === 'failed' ? 'échec d’envoi' : 'non envoyé' }}</p>
          <div class="mt-3 flex flex-wrap gap-2">
            <a class="ad-btn ad-btn-sm" :href="`mailto:${m.email}`">Répondre par e-mail</a>
            <button class="ad-btn ad-btn-sm" type="button" @click="setStatus(m, m.status === 'handled' ? 'read' : 'handled')">{{ m.status === 'handled' ? 'Marquer comme lu' : 'Marquer comme traité' }}</button>
            <button class="ad-btn ad-btn-sm" type="button" @click="setStatus(m, 'new')">Marquer comme non lu</button>
            <button class="ad-btn ad-btn-sm ad-btn-danger" type="button" @click="del = m">Supprimer</button>
          </div>
        </div>
      </li>
    </ul>
    <AdminConfirm :open="!!del" title="Supprimer ce message ?" message="Suppression définitive." confirm-label="Supprimer" danger @confirm="remove" @cancel="del = null" />
  </div>
</template>
