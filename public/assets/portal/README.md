# Portail dimensionnel

Le portail du site est le **port GLSL** de votre projet Godot « PortalVFX » (voir `docs/PORTAIL.md`).
Il fonctionne sans aucun fichier ici : un bruit procédural tuilable est généré au chargement.

## Remplacer le bruit (facultatif)

Déposez une image **tuilable** (se raccorde sans couture sur ses bords), en niveaux de gris, de préférence 256×256 ou 512×512 :

```
public/assets/portal/noise.png
```

Elle remplace automatiquement le bruit procédural (équivalent du `noise_texture` du shader Godot). Aucune modification de code.
Un bruit « Perlin/Simplex » fractal tuilable donne le rendu le plus proche de l'original de Godot.
