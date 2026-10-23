import { z } from 'zod'
import { hexToRgb01 } from './utils'

export const hexColor = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, 'Couleur hexadécimale attendue (ex. #22d3ee)').transform(v => v.toLowerCase())

export const themeSchema = z.object({
  accent: hexColor.default('#22d3ee'),
  secondary: hexColor.default('#8b5cf6'),
  background: hexColor.default('#05060f'),
  text: hexColor.default('#e8f0ff'),
  textMuted: hexColor.default('#93a4c8'),
  glow: hexColor.default('#67e8f9'),
  portalA: hexColor.default('#22d3ee'),
  portalB: hexColor.default('#7c3aed'),
  stationAccent: hexColor.default('#a78bfa'),
  stationSecondary: hexColor.default('#38bdf8'),
  intensity: z.number().min(0.3).max(2).default(1),
})
export type Theme = z.infer<typeof themeSchema>
export const DEFAULT_THEME: Theme = themeSchema.parse({})

export const THEME_FIELDS: { key: Exclude<keyof Theme, 'intensity'>, label: string, hint: string }[] = [
  { key: 'accent', label: 'Couleur principale', hint: 'Boutons, liens, éclat principal' },
  { key: 'secondary', label: 'Couleur secondaire', hint: 'Dégradés, accents froids' },
  { key: 'background', label: 'Fond', hint: 'Fond de page et de l’espace' },
  { key: 'text', label: 'Texte', hint: 'Titres et paragraphes' },
  { key: 'textMuted', label: 'Texte secondaire', hint: 'Légendes, sous-titres' },
  { key: 'glow', label: 'Éléments lumineux', hint: 'Halos, bloom, contours' },
  { key: 'portalA', label: 'Portail · cœur', hint: 'Couleur lumineuse du portail' },
  { key: 'portalB', label: 'Portail · fond', hint: 'Couleur sombre du dégradé du portail' },
  { key: 'stationAccent', label: 'Station · accent', hint: 'Noyau et module' },
  { key: 'stationSecondary', label: 'Station · secondaire', hint: 'Lignes lumineuses de la station' },
]

export const rgbTriplet = (hex: string) => hexToRgb01(hex).map(c => Math.round(c * 255)).join(' ')

/** Variables CSS appliquées sur :root (une seule source de vérité pour le HTML et Tailwind). */
export function themeToCssVars(t: Theme): Record<string, string> {
  return {
    '--pf-accent': t.accent, '--pf-secondary': t.secondary, '--pf-bg': t.background, '--pf-text': t.text,
    '--pf-text-muted': t.textMuted, '--pf-glow': t.glow, '--pf-portal-a': t.portalA, '--pf-portal-b': t.portalB,
    '--pf-station-accent': t.stationAccent, '--pf-station-secondary': t.stationSecondary,
    '--pf-accent-rgb': rgbTriplet(t.accent), '--pf-secondary-rgb': rgbTriplet(t.secondary), '--pf-bg-rgb': rgbTriplet(t.background),
    '--pf-glow-rgb': rgbTriplet(t.glow), '--pf-text-rgb': rgbTriplet(t.text),
    '--pf-gradient': `linear-gradient(135deg, ${t.accent}, ${t.secondary})`,
    '--pf-intensity': String(t.intensity),
  }
}
export const cssVarsToString = (vars: Record<string, string>) => `:root{${Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(';')}}`
