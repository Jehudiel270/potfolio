# Décisions techniques

Versions vérifiées à la date de réalisation (octobre 2026) : Nuxt 4.6, Vue 3.5, Three.js r186, GSAP 3.15, Lenis 1.3, Drizzle ORM 0.45,
Tailwind CSS 4.3, Zod 3.25, TypeScript 5.9 (strict), Vitest 5. Les versions exactes sont figées dans `pnpm-lock.yaml`.

## Bibliothèques retenues

| Besoin | Choix | Pourquoi | Documentation |
|---|---|---|---|
| Framework | **Nuxt 4** + Vue 3, TypeScript strict | Imposé ; SSR pour le contenu et le SEO, API serveur dans le même projet | https://nuxt.com/docs |
| 3D | **Three.js** natif | Contrôle total de la caméra, du stencil, des shaders et du post-traitement | https://threejs.org/docs/ |
| Animation au scroll | **GSAP + ScrollTrigger** | Timeline principale avec un label par section réellement publiée | https://gsap.com/docs/v3/Plugins/ScrollTrigger/ |
| Défilement fluide | **Lenis**, conditionnel | Synchronisé via `lenis.on('scroll', ScrollTrigger.update)` + `gsap.ticker` ; désactivé si mouvement réduit, écran tactile ou réglage admin ; sinon défilement natif | https://github.com/darkroomengineering/lenis |
| Base de données | **Neon** + **Drizzle ORM** (`neon-http`) | Connexion HTTP sans état, adaptée au serverless ; migrations SQL versionnées | https://orm.drizzle.team/docs/connect-neon |
| Images | **Cloudinary** (SDK Node) | Upload direct signé côté serveur ; le secret reste serveur | https://cloudinary.com/documentation/node_integration |
| E-mail | **Nodemailer** (SMTP) | Aucun fournisseur imposé ; secrets en variables d'environnement | https://nodemailer.com/ |
| Validation | **Zod** (schémas partagés client/serveur) | Une seule définition des règles, jamais de confiance dans le navigateur | https://zod.dev |
| Styles | **Tailwind CSS 4** + variables CSS du thème | Les couleurs ne sont définies qu'à un endroit (réglages Neon → variables CSS → uniforms 3D) | https://tailwindcss.com |
| Icônes | **lucide-vue-next** | Une seule bibliothèque légère, importée à la carte | https://lucide.dev |
| Polices | **Bricolage Grotesque** (titres), **Instrument Sans** (texte), via `@fontsource-variable` | Auto-hébergées (aucun appel à un CDN), licence OFL | https://fontsource.org |
| Continents de la Terre | **world-atlas** (Natural Earth 110m, domaine public) + **topojson-client** | Contours réels sans texture externe ni problème de licence ; masque dessiné au chargement | https://github.com/topojson/world-atlas |
| Tests | **Vitest** + **PGlite** (PostgreSQL réel en WASM) | Les vraies migrations SQL sont rejouées dans les tests, sans compte Neon | https://vitest.dev |

## Évalué et non retenu (décision explicite par besoin)

- **TresJS / nuxt-three** : couche déclarative utile pour des scènes simples ; ici la caméra, le stencil, le post-traitement et la timeline exigent un contrôle impératif. Three.js natif est plus direct.
- **COBE** : très léger, mais son rendu (un globe à points autonome) ne permet pas d'intégrer le shader holographique, le stencil, les arcs ni de piloter la caméra. Le globe est donc un shader Three.js maîtrisé.
- **three-globe** : même raison, et dépendance supplémentaire pour un résultat reproductible avec ~150 lignes de GLSL.
- **three-nebula** (particules) : les étincelles du portail sont calculées dans le vertex shader (comme le GPUParticles3D d'origine) ; aucune simulation CPU n'est nécessaire.
- **three-trackball-controls** : non ajouté. L'interaction principale est guidée par GSAP/ScrollTrigger ; aucune exploration manuelle libre n'est requise.
- **glTF-Pipeline / Draco** : aucun modèle GLB n'est chargé (station, cristaux, badges sont procéduraux). Rien à compresser ; la section « Performance » du README explique comment en ajouter.
- **CSS3DRenderer** : remplacé par des **panneaux HTML projetés** (`useSceneAnchor`). Ils évitent la désynchronisation avec le zoom du navigateur et restent accessibles (focus, lecteur d'écran, mobile).
- **shadcn-vue** : son registre (`ui.shadcn.com`) n'est pas joignable depuis l'environnement de réalisation ; l'administration utilise des composants maison fondés sur Tailwind (formulaires, tiroir, confirmation, toasts), sans dépendance supplémentaire.
- **nuxt-auth-utils / Lucia** : sessions maison (voir ci-dessous) pour obtenir une invalidation réelle côté serveur sans dépendance.

## Choix d'architecture notables

- **Une station = 1 noyau + 1 bras + 1 module** (règle v2). Le nombre de compétences n'engendre aucune géométrie ; les autres compétences sont dans les vues Constellation hexagonale (instances) et Arbre (SVG).
- **Un seul pipeline de contenu** : `/api/public/content` renvoie tout le contenu publié en un appel (cache mémoire 15 s, vidé à chaque sauvegarde du back-office). Aucun appel répété.
- **Plan de sections unique** (`shared/sections.ts`) : menu, sections HTML, chapitres 3D et repères GSAP en dérivent ; une section masquée disparaît de partout.
- **Dimensions par stencil** : voir `docs/PORTAIL.md`.
- **Sélection 3D en distance écran** (et non par raycasting) : fiable pour points, instances et maillages, et chaque objet a un équivalent HTML (liste) accessible au clavier et au toucher.
- **Qualité adaptative** : détection initiale (cœurs, mémoire, GPU logiciel, écran tactile, mouvement réduit) puis dégradation progressive si les images chutent sous ~35 fps (pixel ratio → bloom → particules).
- **Pas de GLSL fourni par l'administrateur** : seuls des presets validés et des réglages bornés côté serveur.
- **Sessions** : identifiant aléatoire signé (HMAC) en cookie `HttpOnly` + `SameSite=Strict` ; la session vit en base (révocable, expiration 12 h) ; jeton CSRF par session exigé sur toute écriture + contrôle d'origine ; mots de passe hachés avec scrypt.
- **Mode PGlite** (`PF_DEV_DB=pglite`) : option de développement hors-ligne uniquement ; la production utilise Neon.

## Assets externes et licences

| Asset | Source | Licence | Où |
|---|---|---|---|
| Contours des continents | Natural Earth via `world-atlas` | Domaine public | dépendance npm, dessinés à l'exécution |
| Sons d'interface (6 fichiers) | Kenney « RPG Audio » (fourni par vous) | CC0 | `public/assets/audio/` (+ `LICENSE-Kenney-RPG-Audio.txt`) |
| Polices | Bricolage Grotesque, Instrument Sans | SIL OFL 1.1 | paquets `@fontsource-variable/*` |
| Portail | Votre projet Godot « PortalVFX » (BinbunVFX) | **à confirmer par vous** (aucune licence dans l'archive) | `docs/portal-source-godot/`, porté dans `app/scene` |

Aucun modèle 3D, aucune texture externe ni URL tierce fragile n'est requis pour démarrer.
