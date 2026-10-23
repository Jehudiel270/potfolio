# Portfolio spatial 3D — Nuxt · Neon · Cloudinary

Portfolio immersif : un voyage en 3D (Terre holographique → portail dimensionnel → station → constellations → projets → contact)
et un **back-office sécurisé** pour tout administrer sans toucher au code. Contenu, couleurs, vues, menu et canaux de contact vivent dans Neon.

**Stack** : Nuxt 4 · Vue 3 · TypeScript strict · Tailwind CSS 4 · Three.js · GSAP/ScrollTrigger · Lenis (conditionnel) · Neon + Drizzle ORM · Cloudinary · Nodemailer · Zod · Vitest.

## Sommaire
1. [Prérequis](#1-prérequis) · 2. [Installation](#2-installation) · 3. [Neon](#3-configurer-neon) · 4. [Administrateur](#4-créer-ladministrateur) · 5. [Cloudinary](#5-configurer-cloudinary) · 6. [E-mail](#6-e-mail-smtp)
7. [Portail et sons](#7-portail-existant-et-sons) · 8. [Développement](#8-lancer-en-développement) · 9. [Vérification](#9-vérification-avant-mise-en-production) · 10. [Build et déploiement](#10-build-et-déploiement) · 11. [Utilisation](#11-utiliser-le-back-office) · 12. [Architecture](#12-architecture) · 13. [Sécurité](#13-sécurité) · 14. [Performance et accessibilité](#14-performance-et-accessibilité) · 15. [Limites](#15-limites-et-opérations-manuelles)

## 1. Prérequis
- **Node.js ≥ 20.19** (testé avec Node 22) et **pnpm ≥ 10** (`npm i -g pnpm`).
- Un compte **Neon** (gratuit) et un compte **Cloudinary** (gratuit). Un serveur **SMTP** pour recevoir les messages par e-mail (facultatif au démarrage).
- Navigateur avec **WebGL 2**. Sans WebGL, une version simple (même contenu, mêmes liens) s'affiche automatiquement.

## 2. Installation
```bash
pnpm install
cp .env.example .env      # puis renseignez les valeurs (sections 3 à 6)
```
Dépendances principales : voir `package.json` (rôle et justification de chacune dans `docs/DECISIONS-TECHNIQUES.md`).

### Variables d'environnement (`.env.example`)
| Variable | Obligatoire | Rôle |
|---|---|---|
| `DATABASE_URL` | oui | Chaîne de connexion Neon (pooled, `sslmode=require`) |
| `NUXT_SESSION_PASSWORD` | oui | ≥ 32 caractères aléatoires : `openssl rand -base64 48` |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | pour les images | Le secret n'est jamais envoyé au navigateur |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | pour l'e-mail | `SMTP_SECURE=true` uniquement pour le port 465 |
| `CONTACT_FALLBACK_TO` | non | Destinataire de secours si aucun n'est réglé dans l'administration |
| `NUXT_PUBLIC_SITE_URL` | non | URL publique du site |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | script seulement | Lus uniquement par `pnpm admin:create` (à retirer ensuite) |

Les variables `NUXT_DATABASE_URL`, `NUXT_CLOUDINARY_*`, `NUXT_SMTP_*` (préfixe `NUXT_`) sont aussi acceptées. Seul `siteUrl` est public ; **aucun secret n'est exposé au navigateur ni stocké dans Neon**.

## 3. Configurer Neon
1. Sur https://console.neon.tech : créez un projet.
2. Bouton **Connect** → copiez la chaîne de connexion **pooled** → `DATABASE_URL` dans `.env`.
3. Créez les tables (aucune action manuelle dans l'interface Neon) :
```bash
pnpm db:migrate        # applique drizzle/0000_init.sql
pnpm db:seed           # crée la ligne de réglages par défaut
pnpm db:seed:demo      # OPTIONNEL : contenu d'exemple, marqué « (démo) »
pnpm db:purge-demo     # supprime d'un coup tout le contenu de démonstration
```
Les données de démonstration sont identifiables (`(démo)`, badge « démo » dans l'administration) ; rien n'est présenté comme une information personnelle réelle.
Après un changement du schéma (`server/db/schema.ts`) : `pnpm db:generate` puis `pnpm db:migrate`.

## 4. Créer l'administrateur
Aucun mot de passe par défaut et aucune route publique d'inscription n'existent. Le premier compte se crée en ligne de commande :
```bash
ADMIN_EMAIL=vous@exemple.com ADMIN_PASSWORD='Un-mot-de-passe-solide-2026' pnpm admin:create
```
(≥ 11 caractères, minuscules + majuscules + chiffres). Relancer la commande avec le même e-mail change le mot de passe et révoque les sessions. Connexion : `/admin/login`.

## 5. Configurer Cloudinary
Tableau de bord → **Settings → API Keys** : relevez *Cloud name*, *API Key*, *API Secret* → `.env`.
Les images sont envoyées **directement du navigateur vers Cloudinary** avec une signature générée par le serveur (formats et dossier `portfolio/…` imposés). L'identifiant public est enregistré en base ; une image remplacée ou supprimée est effacée de Cloudinary **seulement si aucune autre ligne ne l'utilise**. Les images de certificats sont publiques : n'envoyez pas de document confidentiel.

## 6. E-mail (SMTP)
Renseignez les variables `SMTP_*`. Dans `/admin/contact`, un statut indique si SMTP est configuré (sans jamais afficher de secret) et un bouton envoie un e-mail de test.
**Sans SMTP, le formulaire ne ment jamais** : il répond par une erreur claire (le message est tout de même enregistré dans `/admin/messages` si l'enregistrement est activé).

## 7. Portail existant et sons
- **Portail** : votre archive était un projet Godot. Il a été **porté en GLSL** (3 couches, étincelles, lumière, mode stencil). Détails, correspondances et différences : `docs/PORTAIL.md`. Texture de bruit remplaçable : `public/assets/portal/noise.png`.
- **Sons** : 6 sons CC0 de Kenney (`public/assets/audio/`), **désactivés par défaut**, activables par le visiteur (icône haut-parleur) et coupables dans `/admin/appearance`.

## 8. Lancer en développement
```bash
pnpm dev                 # http://localhost:3000
```
Essai **sans compte Neon** (facultatif, développement uniquement) : une vraie base PostgreSQL embarquée (PGlite)
```bash
PF_DEV_DB=pglite PF_DEV_DB_DIR=.data/pglite PF_DEV_ADMIN_EMAIL=moi@test.dev PF_DEV_ADMIN_PASSWORD='<mot-de-passe-de-test>' NUXT_SESSION_PASSWORD=<32+ caractères> pnpm dev
```

## 9. Vérification avant mise en production
```bash
pnpm verify              # typecheck + lint + tests + build
pnpm check:shaders       # validation GLSL hors navigateur (nécessite glslangValidator ; sinon ignoré)
pnpm smoke               # test de bout en bout contre un serveur lancé : SMOKE_URL, SMOKE_EMAIL, SMOKE_PASSWORD
```
Les tests rejouent les **vraies migrations SQL** sur PostgreSQL (PGlite) : CRUD générique, brouillons jamais publics, versionnage des réglages, sessions, limitation de fréquence, formulaire (pas de faux succès, anti-spam, injection d'en-têtes), chapitres 3D sans WebGL, timeline GSAP.

## 10. Build et déploiement
```bash
pnpm build               # sortie dans .output/
node .output/server/index.mjs
```
- **Vercel / Netlify / Cloudflare** : importez le dépôt, définissez les variables d'environnement, commande de build `pnpm build` (preset Nitro détecté automatiquement). La connexion Neon en HTTP convient au serverless.
- **Serveur Node / Docker** : exécutez `.output/server/index.mjs` avec les variables d'environnement.
- Le site public lit Neon : **toute modification du back-office est visible en moins de 15 s, sans reconstruire** (cache vidé à chaque sauvegarde).
- Conservation des messages : réglable (7 à 1095 jours) ; `pnpm db:purge-messages` (ou le bouton de `/admin/contact`) supprime les plus anciens. Planifiez-le (cron) si besoin.
- Pour déplacer l'administration vers un sous-domaine : `app/pages/admin/`, `app/components/admin/`, `server/api/admin/` et `server/utils/admin.ts` sont isolés ; aucun code public n'en dépend.

## 11. Utiliser le back-office
| Page | Rôle |
|---|---|
| `/admin` | Tableau de bord (données réelles Neon) |
| `/admin/projects`, `skills`, `education`, `experiences`, `certifications`, `achievements` | CRUD complet : validation, recherche, filtres, brouillon/publié, mise en avant, **réordonnancement (↑↓ ou glisser-déposer)**, tri chronologique, images, **prévisualisation**, confirmation de suppression |
| `/admin/appearance` | Palette (sélecteur + hexadécimal), aperçu en direct, **aperçu 3D dans un cadre**, enregistrer / annuler / restaurer, réglages visuels bornés |
| `/admin/content` | Nom, titre, slogan, À propos, e-mail affiché, réseaux, libellés des boutons, scène finale, SEO, repère sur la Terre |
| `/admin/views` | Vues de compétences (station / hexagones / arbre : activation, défaut, bouton masquable, ordre), sections, menu |
| `/admin/contact` | Page /contact, formulaire, canaux e-mail / WhatsApp / les deux / aucun, modèles, widget flottant, test SMTP |
| `/admin/messages` | Boîte de réception (lu / traité / supprimer) |

Rien n'est publié tant que vous n'enregistrez pas. « **Aperçu privé** » (`/?preview=1`, réservé à l'administrateur) montre brouillons, éléments masqués et sections désactivées.
Contact : WhatsApp utilise un lien `wa.me` ; **le visiteur confirme l'envoi dans WhatsApp** (le site ne prétend jamais qu'il est parti). Le widget « Contact rapide » n'est **pas un chat temps réel** et le dit.

## 12. Architecture
```
app/            pages/ (public + admin) · components/{portfolio,admin,scene,skills,timeline→chapitres,contact} · composables/ · utils/
app/scene/      core/ (moteur, timeline, shaders GLSL, thème, qualité) · objects/ (portail, Terre, station, ciel) · chapters/
server/         api/{public,admin} · services/ (logique pure, testée) · utils/ (Nitro) · db/schema.ts · middleware/ (sécurité)
shared/         schémas Zod, réglages, thème, plan de sections, contact (utilisés par le client ET le serveur)
drizzle/        migrations SQL générées · scripts/ (migrate, seed, create-admin, purge, smoke, check-shaders) · tests/ · docs/
```
Principe : les services (`server/services/*`) sont indépendants de Nitro ; les routes API ne font que les brancher.

## 13. Sécurité
Sessions en base révocables (12 h) · cookie `HttpOnly` `SameSite=Strict` `Secure` · jeton CSRF par session + contrôle `Origin` · mots de passe scrypt · limitation de tentatives de connexion (IP et e-mail) et d'envois de formulaire (partagée entre instances) · validation Zod côté serveur sur toutes les entrées · URL `http(s)` uniquement · images acceptées seulement depuis votre dossier Cloudinary · en-têtes CSP, `X-Frame-Options`, HSTS · IP jamais stockée (empreinte salée) · réponses d'erreur sans trace interne · aucun GLSL ni code saisi dans l'administration · modèles d'e-mail à variables prédéfinies uniquement · protection contre l'injection d'en-têtes.

## 14. Performance et accessibilité
Tiers de qualité (low / medium / high) + dégradation adaptative · particules et étoiles à nombre borné · `InstancedMesh` pour les alvéoles, modules et badges · une seule boucle d'images (GSAP ticker) · nettoyage complet au démontage (renderer, géométries, ScrollTriggers, Lenis, écouteurs) · `prefers-reduced-motion` respecté (mouvement très réduit, pas de Lenis, distorsion atténuée) · défilement natif par défaut sur tactile · bouton « Version légère » (sans 3D) · lien « Passer au contenu » · navigation clavier complète, focus visibles, fiches en `<dialog>` · chaque objet 3D a un équivalent HTML (liste, dock) · arbre de compétences navigable aux flèches avec affichage liste alternatif.
Pour ajouter un vrai modèle GLB un jour : compressez-le (`gltf-pipeline -d`) et chargez-le avec `GLTFLoader` + `DRACOLoader` dans le chapitre voulu.

## 15. Limites et opérations manuelles
- **Rendu WebGL non vérifié visuellement** : l'environnement de réalisation n'a ni GPU ni navigateur. Ont été vérifiés : 34 shaders GLSL validés par `glslangValidator`, construction et animation de tous les chapitres 3D sans erreur, timeline GSAP, build de production, rendu serveur de toutes les sections, API de bout en bout. **À faire par vous** : ouvrir le site sur un vrai navigateur et ajuster au goût (taille du portail, vitesses, intensité du bloom depuis `/admin/appearance`).
- Neon, Cloudinary et SMTP **réels** n'ont pas pu être testés (pas d'identifiants) : base testée sur PostgreSQL réel (PGlite), logique d'upload/e-mail testée par simulation. Testez : une image, un e-mail de test, un envoi du formulaire.
- Vérifiez la **licence de votre portail Godot** avant de publier le code (voir `docs/PORTAIL.md`).
- Les liens de réseaux, textes et coordonnées sont à renseigner dans `/admin/content` ; rien de personnel n'est inventé.
