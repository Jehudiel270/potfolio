# Intégration du portail existant

## Ce que contenait votre archive

`PortalVFX_1.zip` est un **projet Godot 4** (BinbunVFX) : shaders `.gdshader`, un contrôleur GDScript et une scène `.tscn`.
Ce n'est ni un GLB/GLTF, ni une vidéo : le format ne peut pas être chargé tel quel dans Three.js. Il a donc été **porté en GLSL**
en conservant la logique, les paramètres par défaut et les trois couches de l'original. Les sources d'origine sont conservées
dans `docs/portal-source-godot/` pour référence.

| Élément Godot | Équivalent Three.js | Fichier |
|---|---|---|
| `portal.gdshader` (parallaxe polaire multicouche, bruit, overlay, dithering Bayer 4×4) | `PORTAL` (GLSL) | `app/scene/core/shaders.ts` |
| `portal_glow.gdshader` (halo bruité autour du disque) | `PORTAL_GLOW` | idem |
| `portal_stencil.gdshader` (disque écrit dans le stencil) | `PORTAL_STENCIL` + test de stencil sur les objets de l'autre dimension | idem + `objects/sky.ts` |
| `GPUParticles3D` (étincelles émises sur l'anneau, gravité −z) | `PORTAL_SPARKS` (segments animés 100 % GPU) | idem |
| `OmniLight3D` | `THREE.PointLight` teinté par le thème | `objects/portal.ts` |
| Animation `open_amount` | `PortalChapter.timeline()` (piloté par le scroll) | `chapters/home-portal-about.ts` |
| Mode `portal_mode = 2` (Stencil) | mode par défaut : l'autre dimension n'est visible qu'à travers le disque | `core/engine.ts` (`updateDimension`) |
| Mode `portal_mode = 0` (Opaque) | utilisé pour le portail final et sur appareils modestes | `objects/portal.ts` |

Paramètres d'origine conservés : 8 couches, `depth_amount` 0,5, `density` 0,4, `shrink_amount` 0,5, `shape_warp` 0,1,
mouvement spin 0,1 / inward 0,2 / base 0,2, étincelles de durée de vie 1,5 s émises à rayon 1,6.
Les couleurs `primary` / `secondary` viennent du thème (« Portail · cœur » et « Portail · fond » dans l'administration).

## Différences assumées (à connaître)

- **Mode Warp** (déformation de l'écran réel) : non porté tel quel, car il exige l'image de l'écran. À la place, une passe de post-traitement
  plein écran (`WARP`) pince, tord et décale chromatiquement l'espace autour du portail pendant l'approche et la traversée.
- **Texture de bruit** : dans votre scène, `noise_texture` est un dégradé gris uniforme (un emplacement à remplir). Un bruit fractal tuilable
  est généré en code. Pour utiliser votre propre texture : `public/assets/portal/noise.png` (voir le README de ce dossier).
- **Particules aspirées** : en plus de l'émission d'origine, elles sont attirées vers le centre pendant la traversée (paramètre `inflow`).
- **Anneaux fins** ajoutés autour du portail pour la lisibilité à distance.
- **Licence** : l'archive ne contenait aucun fichier de licence. Vous indiquez posséder ce portail ; vérifiez que sa licence autorise sa
  réutilisation et sa redistribution dans ce dépôt avant de publier le code source.

## Comment la traversée fonctionne

1. Avant la traversée, la planète (dimension A) est visible normalement ; l'autre dimension (ciel violet, cristaux) n'est dessinée que dans le
   disque du portail grâce au **stencil** (le disque écrit 1, les objets de l'autre dimension testent `== 1`).
2. En approchant, la timeline GSAP ouvre le portail, accélère la caméra, aspire les particules et déclenche la distorsion plein écran.
3. Quand la caméra franchit le plan du portail, le moteur bascule : la dimension A est masquée, le test de stencil est retiré, l'autre dimension
   occupe tout l'écran (la section « À propos » apparaît). Le retour en arrière inverse la bascule.
4. Le dernier portail (section Contact) réutilise la même classe en mode opaque.

Pour ajuster : `PortalVFX` (`app/scene/objects/portal.ts`) expose ses paramètres en uniforms ; `PORTAL_RADIUS` règle la taille.
