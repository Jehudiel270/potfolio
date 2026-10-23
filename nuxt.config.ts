import tailwindcss from '@tailwindcss/vite'

// Les secrets ne sont JAMAIS donnés en valeur par défaut ici : ils sont lus à l'exécution
// (variables NUXT_* ou variables standard DATABASE_URL, CLOUDINARY_*, SMTP_* via server/utils/env.ts).
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  modules: ['@nuxt/eslint'],
  css: ['~/assets/css/main.css'],
  // Les sous-dossiers organisent le code (portfolio/, admin/, scene/…) sans préfixer les noms de composants.
  components: [{ path: '~/components', pathPrefix: false }],
  typescript: { strict: true, typeCheck: false },
  vite: {
    plugins: [tailwindcss()],
    build: { chunkSizeWarningLimit: 900 },
  },
  runtimeConfig: {
    sessionPassword: '',
    databaseUrl: '',
    cloudinaryCloudName: '',
    cloudinaryApiKey: '',
    cloudinaryApiSecret: '',
    smtpHost: '',
    smtpPort: '',
    smtpSecure: '',
    smtpUser: '',
    smtpPassword: '',
    smtpFrom: '',
    contactFallbackTo: '',
    public: {
      siteUrl: '',
    },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'fr' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'color-scheme', content: 'dark' },
        { name: 'theme-color', content: '#05060f' },
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },
  routeRules: {
    '/admin/**': { ssr: false, headers: { 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' } },
    '/api/admin/**': { headers: { 'cache-control': 'no-store' } },
  },
  nitro: {
    compressPublicAssets: true,
    externals: { inline: ['nodemailer'] },
  },
})
