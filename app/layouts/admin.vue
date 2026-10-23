<script setup lang="ts">
const { user, logout } = useAdminSession()
const route = useRoute()
const menu = ref(false)
watch(() => route.path, () => { menu.value = false })
useHead({ title: 'Administration', meta: [{ name: 'robots', content: 'noindex,nofollow' }] })
const groups = [
  { title: 'Aperçu', items: [{ to: '/admin', label: 'Tableau de bord' }] },
  { title: 'Contenu', items: [
    { to: '/admin/projects', label: 'Projets' }, { to: '/admin/skills', label: 'Compétences' }, { to: '/admin/education', label: 'Parcours académique' },
    { to: '/admin/experiences', label: 'Expériences' }, { to: '/admin/certifications', label: 'Certifications' }, { to: '/admin/achievements', label: 'Réalisations' },
  ] },
  { title: 'Site', items: [
    { to: '/admin/appearance', label: 'Apparence' }, { to: '/admin/content', label: 'Contenu général' }, { to: '/admin/views', label: 'Vues, sections, menu' },
    { to: '/admin/contact', label: 'Contact et e-mail' }, { to: '/admin/messages', label: 'Messages reçus' },
  ] },
]
</script>

<template>
  <div class="ad min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
    <header class="flex items-center justify-between border-b border-[#223049] px-4 py-3 lg:hidden">
      <strong class="font-display">Administration</strong>
      <button class="ad-btn ad-btn-sm" type="button" :aria-expanded="menu" aria-controls="ad-nav" @click="menu = !menu">Menu</button>
    </header>
    <nav id="ad-nav" class="border-r border-[#223049] bg-[#0d1421] p-4 lg:sticky lg:top-0 lg:block lg:h-dvh lg:overflow-y-auto" :class="menu ? 'block' : 'hidden'" aria-label="Administration">
      <p class="mb-6 hidden font-display text-lg font-semibold lg:block">Administration</p>
      <div v-for="g in groups" :key="g.title" class="mb-5">
        <p class="mb-1 px-2 text-xs font-semibold text-[#8da0bf]">{{ g.title }}</p>
        <NuxtLink v-for="i in g.items" :key="i.to" :to="i.to" class="block rounded-md px-2 py-2 text-sm hover:bg-[#162033]" active-class="!bg-[#162033] font-semibold text-sky-300" exact-active-class="!bg-[#162033] font-semibold text-sky-300">{{ i.label }}</NuxtLink>
      </div>
      <div class="mt-6 space-y-2 border-t border-[#223049] pt-4 text-sm">
        <a href="/" target="_blank" rel="noopener" class="block rounded-md px-2 py-2 hover:bg-[#162033]">Voir le site ↗</a>
        <a href="/?preview=1" target="_blank" rel="noopener" class="block rounded-md px-2 py-2 hover:bg-[#162033]">Aperçu privé (brouillons) ↗</a>
        <p class="truncate px-2 text-xs text-[#8da0bf]">{{ user?.email }}</p>
        <button class="ad-btn w-full justify-center" type="button" @click="logout">Se déconnecter</button>
      </div>
    </nav>
    <main class="min-w-0 px-4 py-6 sm:px-8"><slot /></main>
    <AdminToasts />
  </div>
</template>
