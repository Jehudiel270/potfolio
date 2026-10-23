<script setup lang="ts">
definePageMeta({ layout: false })
useHead({ title: 'Connexion — administration', meta: [{ name: 'robots', content: 'noindex,nofollow' }] })
const { login } = useAdminSession()
const email = ref(''), password = ref(''), busy = ref(false), error = ref('')
async function submit() {
  error.value = ''; busy.value = true
  try { await login(email.value, password.value); await navigateTo('/admin') } catch (e) { error.value = (e as Error).message } finally { busy.value = false }
}
</script>

<template>
  <main class="ad grid min-h-dvh place-items-center px-4">
    <form class="ad-card w-full max-w-sm space-y-4 p-6" novalidate @submit.prevent="submit">
      <h1 class="text-2xl font-semibold">Connexion</h1>
      <p class="text-sm text-[#8da0bf]">Espace réservé à l’administrateur du portfolio.</p>
      <div><label for="em" class="ad-label">E-mail</label><input id="em" v-model="email" class="ad-input" type="email" autocomplete="username" required></div>
      <div><label for="pw" class="ad-label">Mot de passe</label><input id="pw" v-model="password" class="ad-input" type="password" autocomplete="current-password" required></div>
      <p v-if="error" class="ad-err" role="alert">{{ error }}</p>
      <button class="ad-btn ad-btn-primary w-full justify-center" type="submit" :disabled="busy || !email || !password">{{ busy ? 'Connexion…' : 'Se connecter' }}</button>
    </form>
  </main>
</template>
